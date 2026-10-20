// v512 : Versus Booster (Salle des jeux). Un joueur lance un défi (type de booster, 1 à 3 boosters), ouvert à tous
// ou envoyé à un ami ; celui qui le relève paie la même mise en éclats. Le serveur ouvre les boosters des deux
// joueurs (supabase/08-versus.sql) : le meilleur total de points remporte toutes les cartes ; égalité, chacun
// garde les siennes. Le face-à-face révèle les cartes une à une, chez les deux joueurs.
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { BOOSTERS, LUCK_POINTS, RARITY, FACTION_ORDER, VARIANTS } from '../config.js';
import { VERSUS_TYPES, VERSUS_MAX, VERSUS_HOURS, stakeOf, scoreOf } from '../core/versus.js';
import { isBlocked } from '../core/moderation.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions } from '../ui/dom.js';
import { packHTML } from './shop.js';
import { t, tx } from '../i18n.js';

const OFF = 'Le Versus Booster n’est pas encore ouvert sur le serveur.';
const RES = { win: 'Victoire', tie: 'Égalité', lose: 'Défaite' };

export default function versusScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.versus ||= { type: 'standard', packs: 1, faction: null, to: null });
  let data = null, friends = [], err = null, busy = false, alive = true;
  const ev = () => g.event();
  const name = (r) => (isBlocked(r.a) ? 'Joueur masqué' : r.pseudo || 'Joueur');
  const pic = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const facName = (f) => cat.faction[f]?.name || f;
  const packLabel = (r) => {
    const n = r.packs, base = BOOSTERS[r.type]?.name || 'Booster';
    const extra = r.type === 'faction' && r.faction ? ` · ${facName(r.faction)}` : r.type === 'event' && r.factions ? ` · ${r.factions.map(facName).join(' et ')}` : '';
    return `${n} × ${base}${extra}`;
  };
  const ago = (t) => { const h = Math.floor((Date.now() - new Date(t)) / 3600000); return h < 1 ? 'à l’instant' : h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`; };
  const left = (t) => Math.max(0, VERSUS_HOURS - Math.floor((Date.now() - new Date(t)) / 3600000));

  function head() {
    return `<header class="screen-head ui-hero bn-versus"><h1>Versus Booster</h1><p class="muted">Ouvrez vos boosters face à face : le meilleur total remporte <b>toutes</b> les cartes.</p></header>`;
  }

  function draw() {
    if (!alive) return;
    if (!cloud.isLoggedIn()) {
      root.innerHTML = `${head()}${rulesHTML()}<section class="panel stack center"><p>Le Versus se joue contre d’autres joueurs : crée ton compte en un instant, ta partie est gardée.</p><a class="btn primary block" href="#/compte">${icon('user')}Créer un compte ou se connecter</a></section>`;
      return;
    }
    if (!sync.profile?.pseudo) {
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
      ${toSee.length ? `<section class="panel vs-sec vs-hot"><h2 class="section-title">Duels à voir <span class="pill-n">${toSee.length}</span></h2>
        ${toSee.map((r) => row(r, `<button class="btn small primary" data-act="see" data-id="${esc(r.id)}">Voir le duel</button>`, `${esc(packLabel(r))} · ton défi a été relevé`)).join('')}</section>` : ''}
      ${incoming.length ? `<section class="panel vs-sec"><h2 class="section-title">Défis reçus</h2>
        ${incoming.map((r) => row(r, `<span class="vs-acts"><button class="btn small primary" data-act="accept" data-id="${esc(r.id)}">Relever · ${fmt(r.stake)} ${icon('crystal')}</button><button class="btn small ghost" data-act="decline" data-id="${esc(r.id)}">Refuser</button></span>`, esc(packLabel(r)))).join('')}</section>` : ''}
      ${createHTML()}
      <section class="panel vs-sec"><h2 class="section-title">Défis ouverts</h2>
        ${data ? (open.length ? open.map((r) => row(r, `<button class="btn small primary" data-act="accept" data-id="${esc(r.id)}" ${g.s.shards >= r.stake ? '' : 'disabled'}>Relever · ${fmt(r.stake)} ${icon('crystal')}</button>`, `${esc(packLabel(r))} · ${ago(r.created_at)}`)).join('') : '<p class="small muted center">Aucun défi ouvert pour l’instant. Lance le tien : un joueur pourra le relever.</p>') : '<p class="small muted center">Chargement…</p>'}
      </section>
      ${waiting.length ? `<section class="panel vs-sec"><h2 class="section-title">Tes défis en attente</h2>
        ${waiting.map((r) => row(r, `<button class="btn small ghost" data-act="cancel" data-id="${esc(r.id)}">Annuler</button>`, `${esc(packLabel(r))} · ${r.public ? 'ouvert à tous' : 'pour ton ami'} · encore ${left(r.created_at)} h`, true)).join('')}
        <p class="small muted">Ta mise est rendue si personne ne relève ton défi en ${VERSUS_HOURS} h, ou si tu l’annules.</p></section>` : ''}
      ${past.length ? `<details class="panel dc-fold vs-sec"><summary><span class="dc-sum-t">Derniers duels</span></summary>
        ${past.map((r) => { const res = r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose'; return row(r, `<button class="btn small ghost" data-act="replay" data-id="${esc(r.id)}"><b class="vs-res ${res}">${RES[res]}</b> ${fmt(r.my_score)} – ${fmt(r.their_score)}</button>`, esc(packLabel(r))); }).join('')}</details>` : ''}
      ${rulesHTML()}
      ${statsHTML()}`;
  }

  function row(r, acts, sub, self = false) {
    const who = self ? (r.public ? 'Ouvert à tous' : name({ a: r.b, pseudo: r.pseudo })) : name(r);
    const av = self && r.public ? EMBLEM : pic(isBlocked(r.a) ? null : r.avatar);
    return `<div class="vs-row"><span class="fr-av">${av}</span><span class="fr-t"><b>${esc(who)}</b>${!self && r.badge ? ` ${cloud.badgeHTML(r.badge)}` : ''}<small>${sub}</small></span>${acts}</div>`;
  }

  function createHTML() {
    const t = ui.type, stake = stakeOf(t, ui.packs), e = ev();
    const okFac = t !== 'faction' || ui.faction;
    const okFriend = ui.to !== 'friend' || ui.friend;
    const can = okFac && okFriend && g.s.shards >= stake && !busy;
    const ok = friends.filter((f) => f.status === 'accepted');
    return `<section class="panel vs-sec vs-new"><h2 class="section-title">Lancer un défi</h2>
      <div class="vs-types">${VERSUS_TYPES.map((k) => `<button class="vs-type ${t === k ? 'on' : ''}" data-act="type" data-v="${k}" aria-pressed="${t === k}">
        <span class="vs-pk">${packHTML(k, cat, { faction: k === 'faction' ? (ui.faction || 'infernal') : null, event: e })}</span>
        <b>${esc(BOOSTERS[k].name.replace('Booster ', ''))}</b><small>${fmt(BOOSTERS[k].price)} ${icon('crystal')}</small></button>`).join('')}</div>
      ${t === 'faction' ? `<div class="chips fac-grid vs-fac" role="radiogroup" aria-label="Faction du booster">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${ui.faction === f}" aria-checked="${ui.faction === f}">${sigil(f)}<span class="fg-n">${esc(facName(f))}</span></button>`).join('')}</div>` : ''}
      ${t === 'event' ? `<p class="small muted">Alliées cette semaine : <b>${e.factions.map(facName).join(' et ')}</b>.</p>` : ''}
      <div class="vs-line"><span class="small">Boosters chacun</span><div class="seg vs-n" role="group" aria-label="Boosters chacun">${[1, 2, 3].slice(0, VERSUS_MAX).map((n) => `<button data-act="packs" data-v="${n}" aria-pressed="${ui.packs === n}" class="seg-b">${n}</button>`).join('')}</div></div>
      <div class="vs-line"><span class="small">Adversaire</span><div class="seg vs-to" role="group" aria-label="Adversaire"><button class="seg-b" data-act="to" data-v="all" aria-pressed="${ui.to !== 'friend'}">Ouvert à tous</button><button class="seg-b" data-act="to" data-v="friend" aria-pressed="${ui.to === 'friend'}">Un ami</button></div></div>
      ${ui.to === 'friend' ? (ok.length ? `<div class="vs-friends">${ok.map((f) => `<button class="vs-fr ${ui.friend === f.id ? 'on' : ''}" data-act="friend" data-v="${esc(f.id)}" aria-pressed="${ui.friend === f.id}"><span class="fr-av">${pic(f.avatar)}</span><b>${esc(f.pseudo)}</b></button>`).join('')}</div>` : `<p class="small muted">Pas encore d’ami. <a href="#/amis">Ajouter un ami</a></p>`) : ''}
      <p class="vs-stake">Mise : <b>${fmt(stake)}</b> ${icon('crystal')} <span class="small muted">chacun · tu as ${fmt(g.s.shards)} éclats</span></p>
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="create" ${can ? '' : 'disabled'}>${icon('p:shadow')}${!okFac ? 'Choisis une faction' : !okFriend ? 'Choisis un ami' : g.s.shards < stake ? `Il te manque ${fmt(stake - g.s.shards)} éclats` : `Lancer le défi · ${fmt(stake)} éclats`}</button>
    </section>`;
  }

  function rulesHTML() {
    return `<details class="panel dc-fold vs-rules"><summary><span class="dc-sum-t">Comment ça marche</span></summary>
      <ol class="small vs-steps">
        <li>Choisis le booster et combien en ouvrir (1 à 3). Chaque joueur paie la même mise en éclats.</li>
        <li>Ton défi est ouvert à tous, ou envoyé à un ami. Il reste ${VERSUS_HOURS} h ; sinon ta mise t’est rendue.</li>
        <li>Quand un joueur le relève, les boosters des deux joueurs s’ouvrent. Points par carte : Commune ${LUCK_POINTS.C}, Peu commune ${LUCK_POINTS.PC}, Rare ${LUCK_POINTS.R}, Hyper rare ${LUCK_POINTS.HR}, Mythique ${LUCK_POINTS.M}, Secrète ${LUCK_POINTS.S}, +${LUCK_POINTS.variant} par finition.</li>
        <li>Le meilleur total remporte <b>toutes les cartes</b> : les siennes et celles de l’adversaire. Le perdant ne garde rien.</li>
        <li>Égalité : chacun repart avec les cartes de ses boosters.</li>
      </ol>
      <p class="small muted">Les boosters sont ouverts par le serveur : personne ne peut tricher sur les tirages.</p></details>`;
  }

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
    draw();
  }

  // mises rendues : défis annulés, refusés ou expirés (encaissés sans rien montrer d'autre qu'une annonce)
  async function refunds() {
    for (const r of (data?.mine || []).filter((x) => x.mine && !x.claimed && ['cancelled', 'declined', 'expired'].includes(x.status))) {
      try {
        const res = await cloud.versusClaim(r.id);
        const out = g.versusApply(r.id, res);
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
      const res = await cloud.versusClaim(id);
      const out = g.versusApply(id, res) || { result: res.result, cards: [] };
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
    const ok = await confirmBox(t('Relever le défi de <b>{name}</b> : {pack}.<br>Mise : <b>{stake} éclats</b>. Le meilleur total remporte toutes les cartes ; le perdant ne garde rien.', { name: esc(name(r)), pack: esc(tx(packLabel(r))), stake: fmt(r.stake) }), { ok: 'Relever le défi' });
    if (!ok) return;
    busy = true;
    try { g.versusPay(r.stake); }
    catch (e) { busy = false; app.sfx.error(); toast(esc(e.message), { kind: 'error', icon: 'crystal' }); return; }
    try { await cloud.versusAccept(id); }
    catch (e) { g.versusRefund(r.stake); busy = false; app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); app.chrome?.(); return load(); }
    app.chrome?.();
    try { data = await cloud.versusList(); } catch (e) { /* on retentera */ }
    busy = false;
    await see(id);
  }

  async function create() {
    if (busy) return;
    const ty = ui.type, stake = stakeOf(ty, ui.packs), e = ev();
    const to = ui.to === 'friend' ? ui.friend : null;
    const fr = to && friends.find((f) => f.id === to);
    const pk = esc(tx(packLabel({ type: ty, packs: ui.packs, faction: ui.faction, factions: e.factions })));
    const ok = await confirmBox(to ? t('Défier <b>{name}</b> : {pack}.<br>Mise : <b>{stake} éclats</b>, rendue s’il refuse ou ne relève pas le défi en {h} h.', { name: esc(fr?.pseudo || ''), pack: pk, stake: fmt(stake), h: VERSUS_HOURS })
      : t('Lancer un défi ouvert à tous : {pack}.<br>Mise : <b>{stake} éclats</b>, rendue si personne ne le relève en {h} h.', { pack: pk, stake: fmt(stake), h: VERSUS_HOURS }), { ok: 'Lancer le défi' });
    if (!ok) return;
    busy = true;
    try { g.versusPay(stake); }
    catch (er) { busy = false; app.sfx.error(); toast(esc(er.message), { kind: 'error', icon: 'crystal' }); return; }
    try {
      await cloud.versusCreate(ty, ty === 'faction' ? ui.faction : null, ty === 'event' ? e.factions : null, ui.packs, to);
      app.sfx.achievement?.();
      toast(to ? 'Défi envoyé ! Il apparaîtra chez ton ami.' : 'Défi lancé ! Reviens voir quand un joueur l’aura relevé.', { kind: 'success', icon: 'crystal' });
    } catch (er) { g.versusRefund(stake); app.sfx.error(); toast(esc(er.status === 404 ? OFF : er.message), { kind: 'error', icon: 'info', ms: 6000 }); }
    busy = false;
    app.chrome?.();
    load();
  }

  async function cancel(id, decline = false) {
    if (busy) return;
    const ok = await confirmBox(decline ? 'Refuser ce défi ? Ton ami récupère sa mise.' : 'Annuler ce défi ? Ta mise t’est rendue.', { ok: decline ? 'Refuser' : 'Annuler le défi', cancel: 'Retour' });
    if (!ok) return;
    busy = true;
    try {
      await cloud.versusCancel(id);
      if (!decline) { const res = await cloud.versusClaim(id); const out = g.versusApply(id, res); if (out?.shards) toast(`<b>${fmt(out.shards)} éclats</b> rendus.`, { icon: 'crystal' }); }
    } catch (e) { app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); }
    busy = false;
    app.chrome?.();
    load();
  }

  // ——— Le face-à-face ———
  function duel(r, out) {
    const mine = r.my_cards || [], theirs = r.their_cards || [];
    const res = out?.result && RES[out.result] ? out.result : r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose';
    const foe = name({ a: r.mine ? r.b : r.a, pseudo: r.pseudo });
    const cell = (c, i, side) => { const k = cat.get(c.id); return `<span class="vs-c v-${c.variant}" data-side="${side}" data-i="${i}" style="--rc:${RARITY[c.rarity]?.color || '#888'}"><span class="vs-back"></span>${k ? `<img alt="" src="${artUrl(k, { lite: true })}">` : ''}<small>+${c.pts}</small></span>`; };
    const progress = () => { if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); out.progress = null; } };
    const s = openSheet(`<div class="vs-duel">
      <div class="vs-side foe"><div class="vs-who"><span class="fr-av">${pic(r.avatar)}</span><b>${esc(foe)}</b><span class="vs-sc" data-sc="foe">0</span></div><div class="vs-grid n${theirs.length}">${theirs.map((c, i) => cell(c, i, 'foe')).join('')}</div></div>
      <div class="vs-mid"><span>VS</span></div>
      <div class="vs-side me"><div class="vs-grid n${mine.length}">${mine.map((c, i) => cell(c, i, 'me')).join('')}</div><div class="vs-who"><span class="fr-av">${pic(g.s.avatar || sync.profile?.avatar)}</span><b>Toi</b><span class="vs-sc" data-sc="me">0</span></div></div>
      <div class="vs-end" hidden></div>
      <p class="small muted center vs-skip">Touche pour tout révéler</p>
    </div>`, { full: true, cls: 'vs-sheet', label: 'Versus Booster', onClose: () => { clearTimeout(timer); progress(); } });
    const box = s.body.querySelector('.vs-duel');
    const order = [];
    for (let i = 0; i < Math.max(mine.length, theirs.length); i++) { if (i < theirs.length) order.push(['foe', i]); if (i < mine.length) order.push(['me', i]); }
    const sc = { me: 0, foe: 0 };
    let k = 0, timer = null, done = false;
    const fast = app.reduced() || g.s.settings.fastOpen;
    const flip = ([side, i]) => {
      const c = (side === 'me' ? mine : theirs)[i];
      const el = box.querySelector(`.vs-c[data-side="${side}"][data-i="${i}"]`);
      el?.classList.add('on', `r-${c.rarity}`);
      sc[side] += c.pts;
      box.querySelector(`[data-sc="${side}"]`).textContent = fmt(sc[side]);
      return c;
    };
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(timer);
      while (k < order.length) flip(order[k++]);
      box.querySelector('[data-sc="me"]').textContent = fmt(scoreOf(mine));
      box.querySelector('[data-sc="foe"]').textContent = fmt(scoreOf(theirs));
      box.querySelector('.vs-skip')?.remove();
      box.classList.add('end', res);
      const n = out?.cards?.length || (res === 'win' ? mine.length + theirs.length : res === 'tie' ? mine.length : 0);
      const fresh = (out?.cards || []).filter((c) => c.isNewCard).length;
      const end = box.querySelector('.vs-end');
      end.hidden = false;
      end.innerHTML = `<h2 class="vs-title ${res}">${RES[res]}</h2>
        <p>${res === 'win' ? `Tu remportes <b>les ${n} cartes</b> du duel${fresh ? `, dont <b>${fresh} nouvelle${fresh > 1 ? 's' : ''}</b>` : ''} !` : res === 'tie' ? `Même total : tu gardes <b>les ${n} cartes</b> de tes boosters.` : t('{name} remporte toutes les cartes.', { name: esc(foe) })}</p>
        <button class="btn primary block" data-x="close">Fermer</button>`;
      if (res === 'win') app.sfx.victory?.(); else if (res === 'lose') app.sfx.defeat?.(); else app.sfx.reveal?.();
    };
    const step = () => {
      if (done) return;
      if (k >= order.length) return finish();
      const c = flip(order[k++]);
      const big = ['HR', 'M', 'S'].includes(c.rarity) || c.variant !== 'normal';
      (big ? app.sfx.reveal : app.sfx.flip)?.call(app.sfx);
      timer = setTimeout(step, fast ? 140 : big ? 900 : 480);
    };
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-x="close"]')) { s.close(); return; }
      if (!done) finish();
    });
    app.sfx.suspense?.();
    timer = setTimeout(step, fast ? 200 : 700);
  }

  bindActions(root, {
    type(el) { ui.type = el.dataset.v; app.sfx.tap(); draw(); },
    fac(el) { ui.faction = el.dataset.v; app.sfx.tap(); draw(); },
    packs(el) { ui.packs = +el.dataset.v; app.sfx.tap(); draw(); },
    to(el) { ui.to = el.dataset.v; app.sfx.tap(); draw(); },
    friend(el) { ui.friend = el.dataset.v; app.sfx.tap(); draw(); },
    create() { create(); },
    accept(el) { accept(el.dataset.id); },
    decline(el) { cancel(el.dataset.id, true); },
    cancel(el) { cancel(el.dataset.id); },
    see(el) { see(el.dataset.id); },
    replay(el) { const r = data?.mine?.find((x) => x.id === el.dataset.id); if (r) duel(r, null); },
  });
  draw();
  load();
  return () => { alive = false; };
}
