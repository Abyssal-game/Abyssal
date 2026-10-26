// v512 : Versus Booster (Salle des jeux). Un joueur lance un défi (1 à 3 boosters, de types au choix depuis v516), ouvert à tous
// ou envoyé à un ami ; celui qui le relève paie la même mise en éclats. Le serveur ouvre les boosters des deux
// joueurs (supabase/08-versus.sql) : le meilleur total de points remporte toutes les cartes ; égalité, chacun
// garde les siennes. Le face-à-face révèle les cartes une à une, chez les deux joueurs.
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { BOOSTERS, LUCK_POINTS, RARITY, FACTION_ORDER, VARIANTS } from '../config.js';
import { VERSUS_TYPES, VERSUS_MAX, VERSUS_HOURS, VERSUS_PRIZE, scoreOf, lineupStake, lineupOf, lineupOk, LEAGUES, LEAGUE_PTS, LEAGUE_REWARD, STREAK_CHESTS, STREAK_MULT, streakMult, leagueIdx } from '../core/versus.js';
import { today } from '../core/save.js';
import { isBlocked } from '../core/moderation.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM, picon } from '../ui/icons.js';
import { profileAttrs } from '../ui/report.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions, pending, withPending } from '../ui/dom.js';
import { packHTML } from './shop.js';
import { playDuel, pickGridHTML, leagueBadge, flameHTML } from './versus-duel.js';
import { checkTurns } from '../cloud/mpwatch.js';
import { t, tx } from '../i18n.js';

const OFF = 'Le Choc des Boosters n’est pas encore ouvert sur le serveur.';
const RES = { win: 'Victoire', tie: 'Égalité', lose: 'Défaite' };
// v516 : « Comment ça marche » dans le style des autres jeux (étapes illustrées)
const HOW = [['booster', '#E8C35A', 'Compose ton défi', `Choisis jusqu’à ${VERSUS_MAX} boosters, de types différents si tu veux (par exemple un standard et un de faction Céleste). Les deux joueurs ouvrent les mêmes.`],
  ['cur-shard', '#7FA8D8', 'Tes boosters', 'Chaque joueur paie ses boosters en éclats, au prix de la boutique, et garde toujours toutes les cartes qu’il ouvre.'],
  ['amis', '#9FE0FF', 'Ton adversaire', `Ton défi est ouvert à tous, ou envoyé à un ami. S’il n’est pas relevé en ${VERSUS_HOURS} h, tes éclats te sont rendus.`],
  ['cards', '#C9A45A', 'Les points', `Quand un joueur relève le défi, les boosters des deux joueurs s’ouvrent. Commune ${LUCK_POINTS.C}, Peu commune ${LUCK_POINTS.PC}, Rare ${LUCK_POINTS.R}, Hyper rare ${LUCK_POINTS.HR}, Mythique ${LUCK_POINTS.M}, Secrète ${LUCK_POINTS.S}, +${LUCK_POINTS.variant} par finition.`],
  ['crown', '#F2C14E', 'La victoire', `Le meilleur total gagne un butin offert par l’Abysse : la copie d’une carte de son choix parmi celles de l’adversaire (une Mythique ou une Secrète donne un coffre abyssal) et ${Math.round(VERSUS_PRIZE.win * 100)} % du prix de ses boosters en éclats. L’adversaire ne perd rien.`],
  ['seal', '#7FE0A0', 'Égalité', `Chacun reçoit ${Math.round(VERSUS_PRIZE.tie * 100)} % du prix de ses boosters en éclats.`],
  ['streak', '#FF8A3D', 'La Série ardente', `Chaque victoire d’affilée multiplie ton butin en éclats (jusqu’à ×${STREAK_MULT.at(-1)}) ; à ${Object.keys(STREAK_CHESTS).join(', ')} victoires d’affilée, un coffre en plus. Une défaite éteint la série, une égalité la garde.`],
  ['crown', '#9C7BFF', 'Les Ligues du mois', `Chaque duel rapporte ou coûte des points : victoire +${LEAGUE_PTS.win} (plus un bonus de série), défaite ${LEAGUE_PTS.lose}. Ligues ${LEAGUES.map((l) => l.name).join(', ')} : on peut monter et redescendre. Le mois fini, ta ligue te donne sa récompense, puis tout repart de zéro.`],
  ['hourglass', '#C9A45A', 'Chaque jour', `Le butin compte pour ${VERSUS_PRIZE.packsPerDay} boosters par jour. Au-delà, on joue pour la gloire : chacun garde toujours ses cartes.`],
  ['ui-eye', '#E0485E', 'Aucune triche', 'Les boosters sont ouverts par le serveur : personne ne peut truquer les tirages.']];
const TYPE_NAME = { standard: 'Standard', faction: 'Faction', event: 'Alliances', premium: 'Premium' };
const howLi = ([ic, c, ti, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${ti}</b><span class="small">${d}</span></span></li>`;

export default function versusScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.versus ||= { to: null });
  if (!Array.isArray(ui.lineup) || !ui.lineup.length) ui.lineup = [{ type: 'standard' }];
  ui.sel = Math.min(ui.sel || 0, ui.lineup.length - 1);
  let data = null, friends = [], err = null, busy = false, alive = true;
  const ev = () => g.event();
  const name = (r) => (isBlocked(r.a) ? 'Joueur masqué' : r.pseudo || 'Joueur');
  const pic = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const facName = (f) => cat.faction[f]?.name || f;
  // v516 : nom court d'un booster de la composition, déjà traduit (affiché dans un bloc translate="no")
  const itemName = (it) => it.type === 'faction' ? t('Faction {f}', { f: tx(facName(it.faction || '')) })
    : it.type === 'event' ? (it.factions?.length === 2 ? t('Alliances {a} et {b}', { a: tx(facName(it.factions[0])), b: tx(facName(it.factions[1])) }) : t('Alliances'))
    : t(it.type === 'premium' ? 'Premium' : 'Standard');
  const packLabel = (r) => {
    const groups = [];
    for (const it of lineupOf(r)) { const n = itemName(it), last = groups[groups.length - 1]; if (last && last.n === n) last.k++; else groups.push({ n, k: 1 }); }
    return groups.map((x) => (x.k > 1 ? `${x.k} × ${x.n}` : x.n)).join(' + ');
  };
  const lbl = (r) => `<span translate="no">${esc(packLabel(r))}</span>`;
  const ago = (t) => { const h = Math.floor((Date.now() - new Date(t)) / 3600000); return h < 1 ? 'à l’instant' : h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`; };
  const left = (t) => Math.max(0, VERSUS_HOURS - Math.floor((Date.now() - new Date(t)) / 3600000));

  function head() {
    return `<header class="screen-head ui-hero bn-versus"><h1>Le Choc des Boosters</h1><p class="muted">Vos boosters s’ouvrent face à face. Chacun garde ses cartes, le meilleur total gagne un butin.</p></header>`;
  }

  /* v807 : ta Ligue du mois et ta Série ardente, en tête du Choc */
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const monthName = (m) => `${t(MONTHS[+m.slice(5, 7) - 1] || '')} ${m.slice(0, 4)}`;
  function leagueHTML() {
    const lg = g.chocLeague(), v = g.s.versus, i = leagueIdx(lg.pts), L = LEAGUES[i], N = LEAGUES[i + 1];
    const d = new Date(g.clock()), left = new Date(d.getFullYear(), d.getMonth() + 1, 1) - d, days = Math.max(1, Math.ceil(left / 86400000));
    const pct = N ? Math.round(((lg.pts - L.min) / (N.min - L.min)) * 100) : 100;
    const rw = LEAGUE_REWARD[L.k], rwTxt = rw ? Object.entries(rw.chests || {}).map(([k]) => t(`coffre ${k === 'fer' ? 'de fer' : k === 'or' ? 'd’or' : 'abyssal'}`)).concat(rw.tickets?.premium ? [t('{n} tickets premium', { n: rw.tickets.premium })] : []).join(' + ') : t('aucune récompense');
    const s = v.streak || 0;
    return `<section class="panel vs-league" style="--lgc:${L.color}">
      <div class="vs-lg-top">${leagueBadge(i, 'big')}<div class="vs-lg-t"><b>${t('Ligue {l}', { l: t(L.name) })}</b><small>${fmt(lg.pts)} ${t('points')} · ${t('fin dans {n} j', { n: days })}</small></div>${s >= 1 ? flameHTML(s, 'big') : ''}</div>
      <div class="vs-lg-bar"><i style="width:${pct}%"></i></div>
      <p class="small muted">${N ? t('Ligue {l} à {n} points.', { l: t(N.name), n: N.min }) : t('Tu es tout en haut : tiens bon jusqu’à la fin du mois.')} ${t('Si le mois finissait maintenant : {r}.', { r: rwTxt })}</p>
      <p class="small">${s >= 1 ? t('Série ardente : <b>{n}</b> · prochaine victoire, butin ×{m}', { n: s, m: String(streakMult(s + 1)).replace('.', ',') }) : t('Gagne un duel pour allumer ta Série ardente.')}</p>
    </section>`;
  }
  // résultat du mois passé, montré une fois
  function lastMonth() {
    const x = g.s.versus.lgLast; let seen = null;
    try { seen = localStorage.getItem('abyssal.chocSeen'); } catch (e) { /* stockage indisponible */ }
    if (!x || !x.played || seen === x.m) return;
    try { localStorage.setItem('abyssal.chocSeen', x.m); } catch (e) { /* idem */ }
    const L = LEAGUES[x.tier], rw = LEAGUE_REWARD[L.k];
    openSheet(`<div class="center stack">${leagueBadge(x.tier, 'huge')}<h2>${t('Fin de la Ligue · {m}', { m: monthName(x.m) })}</h2>
      <p>${t('Tu termines en ligue <b>{l}</b> avec {n} points.', { l: t(L.name), n: fmt(x.pts) })}</p>
      <p class="small muted">${rw ? t('Ta récompense est dans tes coffres.') : t('Atteins la ligue Argent pour gagner une récompense.')}</p>
      <p class="small muted">${t('Une nouvelle ligue commence : tout le monde repart de zéro.')}</p></div>`, { label: t('Ligue du mois') });
  }

  function draw() {
    if (!alive) return;
    /* v528 : le compte est obligatoire (porte du compte au lancement) : seul le pseudo peut manquer */
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) {
      root.innerHTML = `${head()}${rulesHTML()}<section class="panel stack center"><p>Choisis d’abord ton pseudo : c’est lui que verront tes adversaires.</p><a class="btn primary block" href="#/compte">Choisir mon pseudo</a></section>`;
      return;
    }
    const me = cloud.currentUser()?.id;
    const mine = data?.mine || [];
    const toSee = mine.filter((r) => r.status === 'done' && !r.claimed);
    const incoming = mine.filter((r) => r.status === 'open' && !r.mine);
    const waiting = mine.filter((r) => r.status === 'open' && r.mine);
    const past = mine.filter((r) => r.status === 'done' && r.claimed).slice(0, 10);
    const open = (data?.open || []).filter((r) => !isBlocked(r.a) && r.a !== me);
    root.innerHTML = `${head()}
      ${err ? `<p class="panel small center">${icon('info')} ${esc(err)}</p>` : ''}
      ${leagueHTML()}
      ${toSee.length ? `<section class="panel vs-sec vs-hot"><h2 class="section-title">Duels à voir <span class="pill-n">${toSee.length}</span></h2>
        ${toSee.map((r) => row(r, `<button class="btn small primary" data-act="see" data-id="${esc(r.id)}">Voir le duel</button>`, `${lbl(r)} · ton défi a été relevé`)).join('')}</section>` : ''}
      ${mine.filter((r) => g.s.versus.pick?.[r.id]).length ? `<section class="panel vs-sec vs-hot"><h2 class="section-title">Butin à choisir</h2>
        ${mine.filter((r) => g.s.versus.pick?.[r.id]).map((r) => row(r, `<button class="btn small primary" data-act="pickloot" data-id="${esc(r.id)}">${icon('crown')} Choisir</button>`, `${lbl(r)} · ${t('tu as gagné ce duel')}`)).join('')}</section>` : ''}
      ${incoming.length ? `<section class="panel vs-sec"><h2 class="section-title">Défis reçus</h2>
        ${incoming.map((r) => row(r, `<span class="vs-acts"><button class="btn small primary" data-act="accept" data-id="${esc(r.id)}">Relever · ${fmt(r.stake)} ${icon('crystal')}</button><button class="btn small ghost" data-act="decline" data-id="${esc(r.id)}">Refuser</button></span>`, lbl(r))).join('')}</section>` : ''}
      ${createHTML()}
      <section class="panel vs-sec"><h2 class="section-title">Défis ouverts</h2>
        ${data ? (open.length ? open.map((r) => row(r, `<button class="btn small primary" data-act="accept" data-id="${esc(r.id)}" ${g.s.shards >= r.stake ? '' : 'disabled'}>Relever · ${fmt(r.stake)} ${icon('crystal')}</button>`, `${lbl(r)} · ${ago(r.created_at)}`)).join('') : '<p class="small muted center">Aucun défi ouvert pour l’instant. Lance le tien : un joueur pourra le relever.</p>') : '<p class="small muted center">Chargement…</p>'}
      </section>
      ${waiting.length ? `<section class="panel vs-sec"><h2 class="section-title">Tes défis en attente</h2>
        ${waiting.map((r) => row(r, `<button class="btn small ghost" data-act="cancel" data-id="${esc(r.id)}">Annuler</button>`, `${lbl(r)} · ${r.public ? 'ouvert à tous' : 'pour ton ami'} · encore ${left(r.created_at)} h`, true)).join('')}
        <p class="small muted">Tes éclats te sont rendus si personne ne relève ton défi en ${VERSUS_HOURS} h, ou si tu l’annules.</p></section>` : ''}
      ${past.length ? `<details class="panel dc-fold vs-sec"><summary><span class="dc-sum-t">${t('Revoir mes derniers duels')}</span></summary>
        ${past.map((r) => { const res = r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose'; return row(r, g.s.versus.pick?.[r.id] ? `<button class="btn small primary" data-act="pickloot" data-id="${esc(r.id)}">${icon('crown')} Choisir mon butin</button>` : `<button class="btn small ghost vs-replay" data-act="replay" data-id="${esc(r.id)}">${icon('refresh')}<b class="vs-res ${res}">${t(RES[res])}</b> ${fmt(r.my_score)} – ${fmt(r.their_score)}</button>`, lbl(r)); }).join('')}</details>` : ''}
      ${rulesHTML()}
      ${statsHTML()}`;
  }

  function row(r, acts, sub, self = false) {
    const who = self ? (r.public ? 'Ouvert à tous' : name({ a: r.b, pseudo: r.pseudo })) : name(r);
    const av = self && r.public ? EMBLEM : pic(isBlocked(r.a) ? null : r.avatar);
    const foe = self ? (r.public ? null : r.b) : (r.mine ? r.b : r.a);
    return `<div class="vs-row"><span class="fr-av"${profileAttrs(foe)}>${av}</span><span class="fr-t"><b>${esc(who)}</b>${!self && r.badge ? ` ${cloud.badgeHTML(r.badge)}` : ''}<small>${sub}</small></span>${acts}</div>`;
  }

  function createHTML() {
    const L = ui.lineup, sel = ui.sel, cur = L[sel], stake = lineupStake(L), e = ev();
    const okFac = L.every((it) => it.type !== 'faction' || it.faction);
    const okFriend = ui.to !== 'friend' || ui.friend;
    const can = okFac && okFriend && g.s.shards >= stake && !busy;
    const ok = friends.filter((f) => f.status === 'accepted');
    const pk = (it) => `<span class="vs-pk">${packHTML(it.type, cat, { faction: it.type === 'faction' ? (it.faction || 'infernal') : null, event: e })}</span>`;
    return `<section class="panel vs-sec vs-new"><h2 class="section-title">Lancer un défi</h2>
      <p class="small muted">Compose les boosters du duel, jusqu’à ${VERSUS_MAX} : les deux joueurs ouvrent les mêmes.</p>
      <div class="vs-slots">${L.map((it, i) => `<div class="vs-slot ${i === sel ? 'on' : ''}" role="button" tabindex="0" data-act="sel" data-i="${i}" aria-pressed="${i === sel}">
          ${pk(it)}<b translate="no">${esc(itemName(it))}</b><small>${fmt(BOOSTERS[it.type].price)} ${icon('crystal')}</small>
          ${L.length > 1 ? `<button class="vs-x" data-act="rm" data-i="${i}" aria-label="Retirer ce booster">${icon('close')}</button>` : ''}</div>`).join('')}
        ${L.length < VERSUS_MAX ? `<button class="vs-slot vs-add" data-act="add"><span class="vs-plus">+</span><b>Ajouter un booster</b></button>` : ''}</div>
      <p class="small vs-edit">${L.length > 1 ? `Booster ${sel + 1} : choisis son type` : 'Choisis le type de booster'}</p>
      <div class="vs-types">${VERSUS_TYPES.map((k) => `<button class="vs-type ${cur.type === k ? 'on' : ''}" data-act="type" data-v="${k}" aria-pressed="${cur.type === k}">
        ${pk({ type: k, faction: cur.faction })}<b>${TYPE_NAME[k]}</b><small>${fmt(BOOSTERS[k].price)} ${icon('crystal')}</small></button>`).join('')}</div>
      ${cur.type === 'faction' ? `<div class="chips fac-grid vs-fac" role="radiogroup" aria-label="Faction du booster">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${cur.faction === f}" aria-checked="${cur.faction === f}">${sigil(f)}<span class="fg-n">${esc(facName(f))}</span></button>`).join('')}</div>` : ''}
      ${cur.type === 'event' ? `<p class="small muted">Alliées cette semaine : <b>${e.factions.map(facName).join(' et ')}</b>.</p>` : ''}
      <div class="vs-line"><span class="small">Adversaire</span><div class="seg vs-to" role="group" aria-label="Adversaire"><button class="seg-b" data-act="to" data-v="all" aria-pressed="${ui.to !== 'friend'}">Ouvert à tous</button><button class="seg-b" data-act="to" data-v="friend" aria-pressed="${ui.to === 'friend'}">Un ami</button></div></div>
      ${ui.to === 'friend' ? (ok.length ? `<div class="vs-friends">${ok.map((f) => `<button class="vs-fr ${ui.friend === f.id ? 'on' : ''}" data-act="friend" data-v="${esc(f.id)}" aria-pressed="${ui.friend === f.id}"><span class="fr-av">${pic(f.avatar)}</span><b>${esc(f.pseudo)}</b></button>`).join('')}</div>` : `<p class="small muted">Pas encore d’ami. <a href="#/amis">Ajouter un ami</a></p>`) : ''}
      <p class="small muted center vs-prize">${prizeLeft() ? `Butin du jour : encore <b>${prizeLeft()}</b> booster${prizeLeft() > 1 ? 's' : ''}` : 'Butin du jour déjà gagné : on joue pour la gloire'}</p>
      <p class="vs-stake">Prix : <b>${fmt(stake)}</b> ${icon('crystal')} <span class="small muted">chacun · tu as ${fmt(g.s.shards)} éclats</span></p>
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="create" ${can ? '' : 'disabled'}>${icon('p:shadow')}${!okFac ? 'Choisis une faction' : !okFriend ? 'Choisis un ami' : g.s.shards < stake ? `Il te manque ${fmt(stake - g.s.shards)} éclats` : `Lancer le défi · ${fmt(stake)} éclats`}</button>
    </section>`;
  }

  function rulesHTML() {
    return `<details class="panel dc-fold dc-how vs-rules"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary><ol class="how-steps">${HOW.map(howLi).join('')}</ol></details>`;
  }

  const prizeLeft = () => { const v = g.s.versus; return v.prizeDay === today(g.clock()) ? Math.max(0, VERSUS_PRIZE.packsPerDay - (v.prizePacks || 0)) : VERSUS_PRIZE.packsPerDay; };
  function statsHTML() {
    const v = g.s.versus;
    if (!v.played) return '';
    return `<p class="small muted center vs-stats">${v.played} duel${v.played > 1 ? 's' : ''} · ${v.wins} victoire${v.wins > 1 ? 's' : ''} · ${v.ties} égalité${v.ties > 1 ? 's' : ''} · ${v.losses} défaite${v.losses > 1 ? 's' : ''} · ${fmt(v.won)} cartes gagnées</p>`;
  }

  async function load() {
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) return draw();
    try {
      [data, friends] = await Promise.all([cloud.versusList(), cloud.friendList().catch(() => [])]);
      err = null;
    } catch (e) { err = e.status === 404 ? OFF : e.message; data = data || { open: [], mine: [] }; }
    if (!alive) return;
    await refunds();
    checkTurns(app, { force: true }); /* v521 : pastilles et « Aujourd'hui » à jour */
    draw();
  }

  // mises rendues : défis annulés, refusés ou expirés (encaissés sans rien montrer d'autre qu'une annonce)
  async function refunds() {
    for (const r of (data?.mine || []).filter((x) => x.mine && !x.claimed && ['cancelled', 'declined', 'expired'].includes(x.status))) {
      try {
        const { out } = await app.partie.first('versusClaim', r.id); /* v539 : encaissé par le serveur de partie */
        r.claimed = true;
        if (out?.shards) toast(`${r.status === 'declined' ? 'Défi refusé' : r.status === 'expired' ? 'Défi expiré' : 'Défi annulé'} : <b>${fmt(out.shards)} éclats</b> rendus.`, { icon: 'crystal' });
      } catch (e) { /* on réessaiera à la prochaine visite */ }
    }
    app.chrome?.();
  }

  async function see(id) {
    if (busy) return;
    busy = true;
    try {
      if (!data?.mine?.some((r) => r.id === id)) data = await cloud.versusList();
      const r = data.mine.find((x) => x.id === id);
      if (!r || r.status !== 'done') throw new Error('Ce duel n’est pas encore joué.');
      const { res, out: o } = await app.partie.first('versusClaim', id);
      const out = o || { result: res.result, cards: [] };
      r.claimed = true;
      app.chrome?.();
      duel(r, out);
    } catch (e) { app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); }
    busy = false;
    draw();
  }

  async function accept(id) {
    const r = [...(data?.open || []), ...(data?.mine || [])].find((x) => x.id === id);
    if (!r || busy) return;
    if (g.s.shards < r.stake) { app.sfx.error(); toast(`Il te manque ${fmt(r.stake - g.s.shards)} éclats.`, { kind: 'error', icon: 'crystal' }); return; }
    const ok = await confirmBox(t('Relever le défi de <b>{name}</b> : {pack}.<br>Prix : <b>{stake} éclats</b>. Chacun garde ses cartes ; le meilleur total gagne le butin.', { name: esc(name(r)), pack: lbl(r), stake: fmt(r.stake) }), { ok: 'Relever le défi' });
    if (!ok) return;
    busy = true;
    /* v539 : la mise est prise par le serveur de partie, au moment où le duel a lieu (rendue s'il échoue) */
    const done = pending(t('Ouverture des boosters…'));
    try { await app.partie.first('versusAccept', id, r.stake); }
    catch (e) { done(); busy = false; app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); app.chrome?.(); return load(); }
    app.chrome?.();
    try { data = await cloud.versusList(); } catch (e) { /* on retentera */ }
    done(); busy = false;
    await see(id);
  }

  async function create() {
    if (busy) return;
    const e = ev();
    const lineup = ui.lineup.map((it) => (it.type === 'faction' ? { type: 'faction', faction: it.faction } : it.type === 'event' ? { type: 'event', factions: e.factions } : { type: it.type }));
    if (!lineupOk(lineup)) return;
    const stake = lineupStake(lineup);
    const to = ui.to === 'friend' ? ui.friend : null;
    const fr = to && friends.find((f) => f.id === to);
    const pk = lbl({ lineup });
    const ok = await confirmBox(to ? t('Défier <b>{name}</b> : {pack}.<br>Prix : <b>{stake} éclats</b>, rendus s’il refuse ou ne relève pas le défi en {h} h.', { name: esc(fr?.pseudo || ''), pack: pk, stake: fmt(stake), h: VERSUS_HOURS })
      : t('Lancer un défi ouvert à tous : {pack}.<br>Prix : <b>{stake} éclats</b>, rendus si personne ne le relève en {h} h.', { pack: pk, stake: fmt(stake), h: VERSUS_HOURS }), { ok: 'Lancer le défi' });
    if (!ok) return;
    busy = true;
    /* v539 : la mise est prise par le serveur de partie quand le défi est créé */
    try {
      await withPending(app.partie.first('versusCreate', lineup, to, stake));
      app.sfx.achievement?.();
      toast(to ? 'Défi envoyé ! Il apparaîtra chez ton ami.' : 'Défi lancé ! Reviens voir quand un joueur l’aura relevé.', { kind: 'success', icon: 'crystal' });
    } catch (er) { app.sfx.error(); toast(esc(er.status === 404 ? OFF : er.message), { kind: 'error', icon: 'info', ms: 6000 }); }
    busy = false;
    app.chrome?.();
    load();
  }

  async function cancel(id, decline = false) {
    if (busy) return;
    const ok = await confirmBox(decline ? 'Refuser ce défi ? Ton ami récupère ses éclats.' : 'Annuler ce défi ? Tes éclats te sont rendus.', { ok: decline ? 'Refuser' : 'Annuler le défi', cancel: 'Retour' });
    if (!ok) return;
    busy = true;
    try {
      await cloud.versusCancel(id);
      if (!decline) { const { out } = await app.partie.first('versusClaim', id); if (out?.shards) toast(`<b>${fmt(out.shards)} éclats</b> rendus.`, { icon: 'crystal' }); }
    } catch (e) { app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); }
    busy = false;
    app.chrome?.();
    load();
  }

  // ——— Le face-à-face (v521 : plein écran, js/screens/versus-duel.js) ———
  /* v736 : le gagnant choisit sa carte parmi celles de l'adversaire */
  async function pickLoot(id, i) {
    try { const { out } = await withPending(app.partie.first('versusPick', id, i)); app.chrome?.(); if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); } return out; }
    catch (e) { app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); throw e; }
  }
  function pickSheet(r) {
    const sh = openSheet(`<h2 class="center">${t('Ton butin')}</h2><p class="small center">${t('Choisis ta carte parmi celles de {name} :', { name: esc(name({ a: r.mine ? r.b : r.a, pseudo: r.pseudo })) })}</p>${pickGridHTML(app, r.their_cards)}`, { label: t('Ton butin') });
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-v="pick"]'); if (!b || sh.busy) return;
      sh.busy = true;
      try { const o = await pickLoot(r.id, +b.dataset.i); const tc = o?.trophy && cat.get(o.trophy.id); sh.close(); toast(tc ? t('Copie de <b>{card}</b>', { card: esc(tc.name) }) : t('Coffre abyssal'), { kind: 'success', icon: 'crown' }); draw(); }
      catch (er) { sh.busy = false; }
    });
  }
  /* v807 : revanche : même composition, défi envoyé à ce joueur (accepté par le serveur 3 jours après un duel, même sans être amis) */
  async function rematch(r) {
    const foe = r.mine ? r.b : r.a;
    if (!foe || isBlocked(foe) || busy) return;
    const lineup = lineupOf(r).map((it) => (it.type === 'faction' ? { type: 'faction', faction: it.faction } : it.type === 'event' ? { type: 'event', factions: it.factions?.length === 2 ? it.factions : ev().factions } : { type: it.type }));
    if (!lineupOk(lineup)) return;
    const stake = lineupStake(lineup);
    if (g.s.shards < stake) { app.sfx.error(); toast(t('Il te manque {n} éclats pour la revanche.', { n: fmt(stake - g.s.shards) }), { kind: 'error', icon: 'crystal' }); return; }
    const ok = await confirmBox(t('Revanche contre <b>{name}</b> : {pack}.<br>Prix : <b>{stake} éclats</b>, rendus s’il ne relève pas le défi en {h} h.', { name: esc(name({ a: foe, pseudo: r.pseudo })), pack: lbl({ lineup }), stake: fmt(stake), h: VERSUS_HOURS }), { ok: t('Lancer la revanche') });
    if (!ok) return;
    busy = true;
    try { await withPending(app.partie.first('versusCreate', lineup, foe, stake)); app.sfx.achievement?.(); toast(t('Revanche envoyée !'), { kind: 'success', icon: 'swords' }); }
    catch (er) { app.sfx.error(); toast(esc(er.status === 404 ? OFF : er.message), { kind: 'error', icon: 'info', ms: 6000 }); }
    busy = false; app.chrome?.(); load();
  }
  async function react(r, k) {
    try { await cloud.versusReact(r.id, k); r.my_react = k; }
    catch (e) { app.sfx.error(); toast(esc(e.status === 404 ? t('Les réactions du Choc ne sont pas encore ouvertes sur le serveur.') : e.message), { kind: 'error', icon: 'info' }); throw e; }
  }
  function duel(r, out) {
    const foe = r.mine ? r.b : r.a;
    playDuel(app, r, out, { foeName: name({ a: foe, pseudo: r.pseudo }), myAvatar: g.shownAvatar() || sync.profile?.avatar, onPick: (i) => pickLoot(r.id, i),
      onRematch: foe && !isBlocked(foe) ? () => rematch(r) : null, onReact: foe && !isBlocked(foe) ? (k) => react(r, k) : null,
      onClose: () => { if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); out.progress = null; } draw(); } });
  }

  bindActions(root, {
    type(el) { const it = ui.lineup[ui.sel]; it.type = el.dataset.v; if (it.type !== 'faction') delete it.faction; app.sfx.tap(); draw(); },
    fac(el) { ui.lineup[ui.sel].faction = el.dataset.v; app.sfx.tap(); draw(); },
    sel(el) { ui.sel = +el.dataset.i; app.sfx.tap(); draw(); },
    add() { if (ui.lineup.length < VERSUS_MAX) { ui.lineup.push({ ...ui.lineup[ui.lineup.length - 1] }); ui.sel = ui.lineup.length - 1; app.sfx.tap(); draw(); } },
    rm(el) { if (ui.lineup.length > 1) { ui.lineup.splice(+el.dataset.i, 1); ui.sel = Math.min(ui.sel, ui.lineup.length - 1); app.sfx.tap(); draw(); } },
    to(el) { ui.to = el.dataset.v; app.sfx.tap(); draw(); },
    friend(el) { ui.friend = el.dataset.v; app.sfx.tap(); draw(); },
    create() { create(); },
    accept(el) { accept(el.dataset.id); },
    decline(el) { cancel(el.dataset.id, true); },
    cancel(el) { cancel(el.dataset.id); },
    see(el) { see(el.dataset.id); },
    pickloot(el) { const r = data?.mine?.find((x) => x.id === el.dataset.id); if (r) pickSheet(r); },
    replay(el) { const r = data?.mine?.find((x) => x.id === el.dataset.id); if (r) duel(r, null); },
  });
  draw();
  load();
  lastMonth();
  return () => { alive = false; };
}
