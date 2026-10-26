// v449 : Le Pacte — accueil (pactes, défi du jour), partie à deux et fin de partie.
import { vsay } from '../ui/voice.js';
import * as PA from '../core/pacte.js';
import { FACTION_ORDER } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';
import { MP_HOURS, MP_FAST_SECS, MP_REWARD } from '../core/mp.js';
import { t, tw } from '../i18n.js';
import { createPacteMp } from './pacte-mp.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival2-${key}.webp">`;
export const SP = { sceau: { name: 'Sceau', img: 'assets/jeux/pa-sceau.webp', desc: 'Il te protège : la prochaine faction en double est jetée au lieu de briser le pacte.' },
  gardien: { name: 'Gardien', img: 'assets/jeux/pa-gardien.webp', desc: 'Arrêt forcé : tu encaisses tout de suite ce que tu as devant toi.' },
  offrande: { name: 'Offrande', img: 'assets/jeux/pa-offrande.webp', desc: 'La prochaine carte de faction compte double.' },
  oracle: { name: 'Présage', img: 'assets/jeux/pa-presage.webp', desc: 'Tu vois la carte suivante avant de choisir : tirer ou t’arrêter.' }, /* v557 */
  curse: { name: 'Malédiction', img: 'assets/jeux/pa-malediction.webp', /* v628 : image Gemini */ desc: 'Ton adversaire devra tirer une carte de plus à son prochain tour avant de pouvoir s’arrêter.' } }; /* v561 */
// v464 : les sept sceaux de cire du parchemin (assets/jeux/pa-table2.webp, 450 × 330), position en % et faction de chacun
export const SEALS = [['infernal', 47, 170], ['artificiel', 100, 207], ['celeste', 160, 233], ['necrotique', 225, 245], ['sauvage', 292, 235], ['abyssal', 353, 207], ['primordial', 405, 170]];
const HOW = [['cards', '#7FA8D8', 'Ton tour', 'Tire des cartes une à une et pose-les devant toi. Chaque carte de faction vaut de 1 à 7 points.'],
  ['crystal', '#E8C35A', 'T’arrêter', 'Quand tu veux, arrête-toi : tu gagnes la somme des cartes posées ce tour-ci.'],
  ['danger', '#E0485E', 'Le pacte se brise', 'Si tu tires une faction que tu as déjà posée ce tour-ci, le pacte se brise : tu perds tout ce que tu avais gagné ce tour-ci.'],
  ['crown', '#F2C14E', 'La victoire', `Le premier à ${PA.TARGET} points gagne (certaines salles changent ce but). Ton adversaire joue toujours autant de tours que toi.`],
  ['seal', '#9FE0FF', 'Les cartes spéciales', 'Sceau : il protège d’une brisure. Gardien : arrêt forcé, tu encaisses tout de suite. Offrande : la prochaine carte compte double. Présage (contre l’Abysse) : tu vois la carte suivante avant de choisir. Malédiction (contre l’Abysse) : ton adversaire devra tirer une carte de plus à son prochain tour.'],
  ['crystal', '#E0485E', 'Défier le pacte', 'Une fois par partie (contre l’Abysse), au lieu de t’arrêter : tu tires une dernière carte. Si le pacte tient, tout le tour compte double. S’il se brise, tu perds tout.'],
  ['cards', '#C9A0FF', 'La pioche', 'En haut de la table, la pioche montre combien il reste de cartes de chaque faction et de chaque carte spéciale. Une faction déjà posée ce tour-ci est entourée de rouge : la tirer briserait le pacte.'],
  ['book', '#7FE0A0', 'Les sept factions', `Pose les 7 factions dans le même tour : +${PA.SEVEN_BONUS} points, et ton tour s’arrête.`],
  ['eye', '#C9A45A', 'Le risque', 'Le jeu t’affiche la chance que la prochaine carte brise ton pacte : elle compte les cartes déjà sorties.'],
  ['amis', '#9FE0FF', 'Contre un joueur', `En haut, « Contre un joueur » : affronte d’autres joueurs (au hasard ou un ami), premier à ${PA.TARGET} points. Partie rapide : ${MP_FAST_SECS} s par action, les deux joueurs connectés. Partie lente : ${MP_HOURS} h par action, chacun à son rythme. Action pas jouée à temps : partie perdue. Victoire : +${MP_REWARD.win} éclats et le classement du mois.`]];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'crystal' ? 'cur-shard' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
// v523 : textes des annonces (brisure, Sceau, Gardien, sept factions, arrêt), traduisibles ; commun au jeu en ligne
export function sayText(ev, { mine, nm, fn, seven }) {
  const f = tw(fn), n = ev.result === 'bust' ? ev.lost : ev.gain;
  return ev.result === 'bust' ? [mine ? 'ko' : 'ok', t('Le pacte se brise !'), (mine ? t(n > 1 ? '{f} en double : tu perds {n} points.' : '{f} en double : tu perds {n} point.', { f, n }) : t('{f} en double : {name} perd {n} points.', { f, name: nm, n })) + (ev.debt ? ` ${t('La dette de Mammon : −{d} points.', { d: ev.debt })}` : '')]
    : ev.result === 'saved' ? ['', t('Le Sceau protège !'), t('{f} en double, jeté sans briser le pacte.', { f })]
    : ev.result === 'forced' ? ['', t('Le Gardien arrête le tour'), mine ? t('Tu encaisses +{n}.', { n }) : t('{name} encaisse +{n}.', { name: nm, n })]
    : ev.result === 'seven' ? [mine ? 'ok' : 'ko', t('Les sept factions !'), mine ? t('+{b} de bonus : tu encaisses +{n}.', { b: seven, n }) : t('+{b} de bonus : {name} encaisse +{n}.', { b: seven, name: nm, n })]
    : ev.result === 'stop' ? ['', mine ? t('Tu t’arrêtes') : t('{name} s’arrête', { name: nm }), t(n > 1 ? '+{n} points.' : '+{n} point.', { n })] : null;
}
export const howHTML = () => `<ol class="how-steps">${HOW.map(howLi).join('')}</ol>`; /* v491 : tutoriel entier, sans « Pour aller plus loin » */

export default function pacteScreen(app, root) {
  const g = app.game, cat = app.catalog;
  let busy = false, timer = 0, gone = false, banner = null, defy = null;
  /* v745 : effets du Pacte (carte qui vole de la pioche, sceau qui s'embrase) : ce que l'écran montrait au dessin précédent */
  let prevSig = [], prevLit = new Set();
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 150) : ms); });
  const fname = (f) => cat.faction[f]?.name || f;
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const me = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  // v523 : « Contre l'Abysse » (arbitres) ou « Contre un joueur » (parties en ligne, pacte-mp.js)
  const ui = (app.state.pacte ||= { mode: 'solo' });
  const modeBar = (rec = '') => `<header class="screen-head ui-hero ${ui.mode === 'mp' ? 'bn-enligne' : 'bn-pacte'}"><h1>Le Pacte</h1><p class="muted">${ui.mode === 'mp' ? 'Affronte d’autres joueurs : premier à 60 points.' : 'Tire, encore une… et ne brise pas le pacte.'}</p>${rec}</header>
    <div class="seg wide gm-mode" role="tablist"><button class="seg-b" role="tab" data-pa="mode" data-v="solo" aria-selected="${ui.mode !== 'mp'}" aria-pressed="${ui.mode !== 'mp'}">Contre l’Abysse</button><button class="seg-b" role="tab" data-pa="mode" data-v="mp" aria-selected="${ui.mode === 'mp'}" aria-pressed="${ui.mode === 'mp'}">Contre un joueur</button></div>`;
  const mp = createPacteMp(app, root, { modeBar: () => modeBar() });

  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-pacte"><h1>Le Pacte</h1><p class="muted">Encore une carte… sans briser le pacte.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellé</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir le Cercle de l’Abysse.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    if (ui.mode === 'mp') return mp.show();
    mp.stop();
    const pa = g.s.pacte, dailyDone = pa.dailyDone === todayKey(), dailyTried = !dailyDone && pa.dailyTried === todayKey(), d = g.pacteDaily(), DT = PA.TABLE[d.table];
    const tables = PA.TABLES.map((t, i) => {
      const open = PA.tableUnlocked(g.s, i), won = pa.beaten[t.key], R = PA.RIVALS[t.rival];
      return [open, `<button class="sc-rival gm-tbl ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-pa="play" data-t="${t.key}" ${open ? '' : 'disabled'} style="background-image:linear-gradient(90deg, rgba(12, 13, 20, .97) 42%, rgba(12, 13, 20, .5) 78%, rgba(12, 13, 20, .2)), url(${PA.tableBg(t.key)})">
        <span class="sc-por">${pic(t.rival)}</span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">contre ${esc(R.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${PA.PACTE_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne ${esc(PA.TABLES[i - 1].name)} pour y entrer`}</span>${t.rule ? `<span class="small gm-rule">${icon('p:rule')}${esc(t.rule)}</span>` : ''}${R.power ? `<span class="small gm-rule pa-powl">${icon('p:danger')}<b>${esc(R.power.name)}</b> : ${esc(R.power.text)}</span>` : ''}${open && PA.FEATS[t.key] ? `<span class="small gm-feat ${pa.feats?.[t.key] ? 'done' : ''}">${pa.feats?.[t.key] ? icon('check') : '<img class="gm-hf" alt="" src="assets/icons/haut-fait.webp">'} Haut fait : ${esc(PA.FEATS[t.key].text)}${pa.feats?.[t.key] ? '' : ` (+${PA.FEAT_SHARDS})`}</span>` : ''}</span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `${modeBar(`<span class="sc-rec">${pa.wins} victoire${pa.wins > 1 ? 's' : ''} · ${pa.losses} défaite${pa.losses > 1 ? 's' : ''}</span>`)}
      ${g.pacteDailyOpen() ? `<button class="panel sc-daily ${dailyDone || dailyTried ? 'done' : ''}" data-pa="daily" ${dailyDone || dailyTried ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · le même paquet pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : dailyTried ? 'Tenté aujourd’hui. Nouveau défi demain.' : `Un seul essai · victoire : +${PA.PACTE_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : dailyTried ? icon('p:hourglass') : icon('next')}</button>` : ''}
      <h2 class="section-title">Les pactes</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Pactes à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/inconnu.webp"><span class="dc-sum-t">Les adversaires</span></summary>
        <ul class="mq-clist">${PA.TABLES.filter((_, i) => PA.tableUnlocked(g.s, i)).map((t) => { const R = PA.RIVALS[t.rival]; return `<li><span class="sc-por">${pic(t.rival)}</span><span><b>${esc(R.name)}</b><span class="small muted">${esc(R.hint)}</span>${R.power ? `<span class="small pa-powl"><b>${esc(R.power.name)}</b> : ${esc(R.power.text)}</span>` : ''}</span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${PA.PACTE_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, PA.PACTE_REWARD.dailyPaid - (pa.day === todayKey() ? pa.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    /* v699 : la bulle des règles attend la première partie (elle couvrait la liste des salles) */
  }

  // ——— Partie ———
  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = `url(${PA.tableBg(g.s.pacte.cur?.table)})`;
  }
  const cardHTML = (c, cls = '') => {
    if (c.sp) return `<span class="pa-card sp sp-${c.sp} ${cls}">${c.sp === 'oracle' ? `<i class="pa-sp-ic">${icon('eye')}</i>` : c.sp === 'curse' ? `<i class="pa-sp-ic">${icon('p:danger')}</i>` : ''}${SP[c.sp].img ? `<img alt="" src="${SP[c.sp].img}" onerror="this.remove()">` : ''}<span class="pa-cn">${SP[c.sp].name}</span></span>`;
    const card = c.id && cat.get(c.id);
    return `<span class="pa-card f-${c.f} ${c.x2 ? 'x2' : ''} ${cls}" style="--fc:${cat.faction[c.f]?.colors.secondary || '#888'}"><img alt="" src="${card ? artUrl(card, { lite: true }) : 'assets/sceaux/dos.webp'}">
      <b class="pa-v">${c.v}${c.x2 ? '<small>×2</small>' : ''}</b><span class="pa-cf">${sigil(c.f)}</span></span>`;
  };
  function center(st) {
    /* v464 : la table est un parchemin : la rangée dans le cadre rouge, un sceau de cire s'allume pour chaque faction posée */
    const v = PA.rowValue(st), risk = Math.round(PA.bustChance(st) * 100), fs = PA.rowFactions(st), nf = fs.size;
    /* v511 : la gravure d'origine des sceaux (dont des étoiles à six branches) est effacée dans pa-table2.webp : chaque sceau porte l'emblème de sa faction */
    const seals = SEALS.map(([f, x, y]) => `<i class="pa-seal ${fs.has(f) ? 'on' : ''}" data-f="${f}" style="left:${(x / 4.5).toFixed(1)}%;top:${(y / 3.3).toFixed(1)}%;--fc:${cat.faction[f]?.colors.secondary || '#C9A45A'}">${sigil(f)}</i>`).join('');
    const ban = banner ? `<div class="pa-ban">${banner.bust ? '<img class="pa-burn" alt="" src="assets/jeux/pa-brisure.webp">' : ''}<div class="mq-banner ${banner.cls}">${banner.html}</div></div>` : '';
    return `<div class="pa-parch ${defy ? 'defy' : ''}">${defy && !banner ? `<img class="pa-defy-tag" alt="×2" src="assets/jeux/pa-defi.webp">` : ''}
      <div class="pa-row" style="--n:${Math.max(1, st.row.length)}">${st.row.length ? st.row.map((c) => cardHTML(c)).join('') : `<span class="pa-empty">${st.turn === 'p' ? 'Tire ta première carte.' : '…'}</span>`}</div>
      ${seals}
      <div class="pa-info"><span>Ce tour : <b>${v}</b> point${v > 1 ? 's' : ''}</span><span class="pa-fac">${nf} / 7 sceaux</span>
        ${st.sceaux ? `<span class="pa-tag ok">${icon('shield')}Protégé ×${st.sceaux}</span>` : ''}${st.offer ? '<span class="pa-tag gold">Offrande : la suivante ×2</span>' : ''}${st.must > 0 ? `<span class="pa-tag bad">Malédiction : encore ${st.must} carte${st.must > 1 ? 's' : ''}</span>` : ''}${st.curse?.[st.turn === 'p' ? 'a' : 'p'] ? `<span class="pa-tag bad">${st.turn === 'p' ? esc(PA.RIVALS[st.rival].name) : 'Toi'} : maudit au prochain tour</span>` : ''}
        <span class="pa-risk ${risk >= 40 ? 'hi' : risk >= 20 ? 'mid' : ''}">Risque : <b>${risk} %</b></span></div>${ban}</div>`;
  }
  /* v557 (demande du propriétaire : jouer moins à l'aveugle) : la pioche montre ce qu'il reste, faction par faction */
  function pioche(st) {
    const src = ui.deckView || (st.deck.length ? st.deck : st.discard), fs = PA.rowFactions(st);
    const n = (pred) => src.filter(pred).length;
    const facs = FACTION_ORDER.map((f) => { const k = n((c) => c.f === f); return `<span class="pa-pf ${fs.has(f) ? 'danger' : ''} ${k ? '' : 'none'}" style="--fc:${cat.faction[f]?.colors.secondary || '#888'}" title="${esc(fname(f))}">${sigil(f)}<b>${k}</b></span>`; }).join('');
    const sps = Object.keys(SP).map((k) => { const m = n((c) => c.sp === k); return m ? `<span class="pa-ps sp-${k}" title="${esc(SP[k].name)}">${esc(SP[k].name)} <b>${m}</b></span>` : ''; }).join('');
    return `<div class="pa-pioche"><div class="pa-ph"><span class="pa-pile"><img alt="" src="assets/jeux/pa-pioche.webp"><b>${src.length}</b></span><span><b>Pioche</b><span class="small muted">Tour ${st.round}${st.turn === 'p' ? ' · à toi' : ` · à ${esc(PA.RIVALS[st.rival].name)}`}</span></span></div>
      <div class="pa-pfs">${facs}</div>${sps ? `<div class="pa-pss">${sps}</div>` : ''}</div>`;
  }
  function controls(st) {
    if (st.over || busy || st.turn !== 'p') return `<div class="mq-ctl"><p class="mq-q">${st.over || st.turn === 'p' ? '' : `Tour de ${esc(PA.RIVALS[st.rival].name)}…`}</p></div>`;
    const v = PA.rowValue(st), must = st.must > 0, canStop = st.row.some((c) => c.f) && !must;
    /* v561 : Malédiction (tirer encore) et Défier le pacte (une fois par partie) */
    return `<div class="mq-ctl pa-ctl"><button class="btn primary dc-plq dc-plq-red" data-pa="draw">${icon('cards')}Tirer</button>
      <button class="btn dc-plq dc-plq-dark" data-pa="stop" ${canStop ? '' : 'disabled'}>${must && st.row.some((c) => c.f) ? 'Tire encore' : canStop ? `S’arrêter (+${v})` : 'S’arrêter'}</button>
      ${st.dbl ? dblSeal(st) : ''}</div>`;
  }
  /* v743 (le propriétaire : « le pouvoir ×2 prend toute la place, on doit faire défiler ») : Défier le pacte devient un petit sceau de cire
     à côté des deux boutons ; un toucher explique et demande confirmation */
  const dblSeal = (st) => {
    const on = PA.canDouble(st), used = !st.dbl.p;
    return `<button class="pa-dbl2 ${on ? 'on' : ''} ${used ? 'used' : ''}" data-pa="double" aria-label="${esc(t('Défier le pacte'))}"><img alt="" src="assets/jeux/pa-defi.webp"><small>${used ? 'Défié' : 'Défier'}</small></button>`;
  };
  async function askDouble(st) {
    if (!st.dbl.p) return void toast(t('Tu as déjà défié le pacte dans cette partie.'));
    if (!PA.canDouble(st)) return void toast(t('Défier le pacte : pose d’abord une carte de faction (pas pendant un Présage).'));
    return confirmBox(t('Défier le pacte : tu tires une dernière carte. Si le pacte tient, tout le tour compte double, cette carte comprise (pour l’instant {n} points ×2). S’il se brise, tu perds tout. Une seule fois par partie.', { n: PA.rowValue(st) }), { ok: t('Défier le pacte'), cancel: t('Annuler') });
  }
  function view() {
    const st = g.s.pacte.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const T = PA.TABLE[st.table];
    root.innerHTML = `<div class="mq-game pa-game ${app.reduced() ? 'rm' : ''} ${defy ? 'defy' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-pa="rules" aria-label="Règles">${icon('p:help')}</button><b>${esc(T.name)}</b><button class="btn small ghost" data-pa="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      ${duo(st)}
      ${pioche(st)}
      <div class="mq-table pa-table">${center(st)}</div>
      ${st.peek && st.turn === 'p' && st.deck.length && !busy ? `<div class="pa-peek">${cardHTML(st.deck[st.deck.length - 1])}<span><b>Présage</b> <span class="small">La prochaine carte sera celle-ci. Tire-la ou arrête-toi.</span></span></div>` : ''}
      ${controls(st)}</div>`;
    fx(st);
  }
  /* v745 : un seul tableau des scores en tête (adversaire à gauche, toi à droite) au lieu de deux grands cadres */
  function duo(st) {
    const R = PA.RIVALS[st.rival], T = PA.tgt(st), side = (x) => {
      const sc = st.scores[x], on = st.turn === x && !st.over;
      return `<span class="pa-side s-${x} ${on ? 'on' : ''}" ${x === 'a' && R.power ? 'data-pa="power" role="button"' : ''}><span class="sc-med ${x === 'p' ? 'mq-me' : ''}">${x === 'p' ? me() : pic(st.rival)}${x === 'a' && R.power ? `<small class="pa-pown" aria-label="${esc(R.power.name)}">${icon('p:danger')}</small>` : ''}</span>
        <span class="pa-sn"><b>${x === 'p' ? 'Toi' : esc(R.name)}</b><span class="pa-bar"><i style="width:${Math.min(100, (sc / T) * 100)}%"></i></span></span>
        <span class="pa-sp"><b>${sc}</b></span></span>`;
    };
    return `<div class="pa-duo">${side('a')}<span class="pa-vs"><b>${T}</b><small>pour gagner</small></span>${side('p')}</div>`;
  }
  const sigOf = (c) => c.sp ? `s:${c.sp}` : `${c.f}:${c.v}:${c.id || ''}`;
  /* v745 : la carte qui vient d'être tirée part de la pioche, vole jusqu'au parchemin et se retourne ; le sceau de sa faction s'embrase */
  function fx(st) {
    const sig = st.row.map(sigOf), fs = PA.rowFactions(st);
    const grew = sig.length === prevSig.length + 1 && prevSig.every((x, i) => x === sig[i]);
    const lit = grew ? [...fs].filter((f) => !prevLit.has(f)) : [];
    prevSig = sig; prevLit = new Set(fs);
    if (!grew || app.reduced()) return;
    const card = root.querySelector('.pa-parch .pa-row .pa-card:last-child'), pile = root.querySelector('.pa-pioche .pa-pile');
    if (card && pile && card.animate) {
      const a = card.getBoundingClientRect(), b = pile.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), k = Math.min(1, b.width / Math.max(1, a.width));
      const back = document.createElement('i'); back.className = 'pa-cback'; card.appendChild(back);
      card.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${k})`, offset: 0 },
        { transform: 'translate(0, -10px) scale(1.08)', offset: 0.55 },
        { transform: 'translate(0, -6px) scale(0.02, 1.1)', offset: 0.75 },
        { transform: 'translate(0, -4px) scale(1.06)', offset: 0.9 },
        { transform: 'none', offset: 1 }], { duration: 560, easing: 'cubic-bezier(.3, .7, .3, 1)' });
      back.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.74 }, { opacity: 0, offset: 0.76 }, { opacity: 0, offset: 1 }], { duration: 560, fill: 'forwards' }).onfinish = () => back.remove();
    }
    for (const f of lit) {
      const el = root.querySelector(`.pa-seal[data-f="${f}"]`);
      if (!el) continue;
      setTimeout(() => { if (!el.isConnected) return; el.classList.add('pa-ignite'); sparks(el, 8); }, 420);
    }
  }
  function sparks(el, n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'), a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      s.className = 'pa-spark'; s.style.setProperty('--sx', `${Math.cos(a) * (22 + Math.random() * 16)}px`); s.style.setProperty('--sy', `${Math.sin(a) * (22 + Math.random() * 16) - 10}px`);
      el.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  }
  /* v745 : brisure : le parchemin se fend, les cartes du tour brûlent et partent en cendres */
  async function burnRow() {
    const parch = root.querySelector('.pa-parch');
    if (!parch || app.reduced()) return;
    parch.classList.add('pa-cracking');
    parch.insertAdjacentHTML('beforeend', `<svg class="pa-crack" viewBox="0 0 450 330" preserveAspectRatio="none" aria-hidden="true"><path d="M225 8 L212 52 L236 88 L205 130 L232 170 L214 214 L240 262 L220 322"/><path d="M212 52 L170 70 L140 64"/><path d="M236 88 L286 104 L318 96"/><path d="M205 130 L160 150"/><path d="M232 170 L280 190 L300 214"/><path d="M214 214 L176 236"/></svg>`);
    parch.querySelectorAll('.pa-row .pa-card').forEach((c, i) => { c.style.setProperty('--bd', `${i * 70}ms`); c.classList.add('pa-burning'); });
    const row = parch.querySelector('.pa-row');
    if (row) for (let i = 0; i < 14; i++) {
      const e = document.createElement('i'); e.className = 'pa-ember';
      e.style.left = `${8 + Math.random() * 84}%`; e.style.setProperty('--ed', `${Math.random() * 400}ms`); e.style.setProperty('--ex', `${(Math.random() - 0.5) * 40}px`);
      row.appendChild(e);
    }
    await wait(1000);
  }
  /* v745 : Défier le pacte : le parchemin rougit, le bord de l'écran bat comme un cœur jusqu'à la carte décisive */
  async function defyMoment(who, paint) {
    defy = who; paint();
    app.sfx.suspensebig?.();
    await wait(1500);
  }
  // Annonce d'un événement (brisure, protection, arrêt…)
  async function say(st, ev, ms = 1500) {
    const R = PA.RIVALS[st.rival], mine = ev.who === 'p', nm = mine ? 'Tu' : esc(tw(R.name));
    const fn = ev.card?.f ? fname(ev.card.f) : '';
    let H = sayText(ev, { mine, nm, fn, seven: PA.sevenOf(st) });
    /* v751 : les pouvoirs des adversaires sont annoncés quand ils jouent */
    const PW = PA.powerOf(st);
    if (H && ev.prayer) H = ['ko', t('Prière !'), t('{name} est pardonnée : sa brisure ne compte pas.', { name: nm })];
    if (H && ev.house) H = [H[0], H[1], `${H[2]} ${t('La part de la maison : Mammon en prend {n}.', { n: ev.house })}`];
    if (H && ev.kept) H = [H[0], H[1], `${H[2]} ${t('Archives : il garde quand même {n} points.', { n: ev.kept })}`];
    if (H && ev.voidCost) H = [H[0], H[1], `${H[2]} ${t('Le Néant : tu perds aussi {n} points déjà gagnés.', { n: ev.voidCost })}`];
    if (!H && ev.echo && PW) H = ['ko', t('Résonance !'), t('Sa première carte de faction compte double.')];
    if (ev.curse && ev.result === 'ok') H = [mine ? 'ok' : 'ko', t('Malédiction !'), mine ? t('{name} devra tirer une carte de plus à son prochain tour.', { name: esc(tw(R.name)) }) : t('Tu devras tirer une carte de plus à ton prochain tour.')];
    if (H && ev.dbl) H = ev.result === 'bust' ? [H[0], t('Défi perdu… le pacte se brise !'), H[2]] : [mine ? 'ok' : 'ko', t('Pacte défié avec succès !'), mine ? t('Le tour compte double : +{n}.', { n: ev.gain }) : t('{name} double son tour : +{n}.', { name: nm, n: ev.gain })];
    if (!H) return;
    /* v457 : sons propres au Pacte (ElevenLabs) */
    app.sfx[{ bust: 'pa-bust', saved: 'pa-seal', forced: 'pa-guard', seven: 'pa-seven', stop: 'pa-bank' }[ev.result]]?.();
    banner = { cls: H[0], bust: ev.result === 'bust' && !app.reduced(), html: `${ev.card ? cardHTML(ev.card, 'big') : `<span class="sc-med">${mine ? me() : pic(st.rival)}</span>`}<span class="mq-vd"><b>${H[1]}</b><span>${H[2]}</span></span>` };
    view(); await wait(ms); banner = null;
  }
  async function aiTurn() {
    const st = g.s.pacte.cur;
    if (!st || st.over || st.turn !== 'a') return;
    busy = true; view();
    await wait(700);
    // l'adversaire joue tout son tour d'un coup dans le moteur ; l'écran le rejoue carte par carte
    const snap = JSON.parse(JSON.stringify(st));
    const evs = g.pacteAi();
    const shown = { ...snap, row: [], sceaux: 0, offer: false };
    let drawn = 0;
    for (const ev of evs) {
      if (gone) return;
      if (ev.dbl) { await defyMoment('a', () => renderShown(shown)); if (gone) return; }
      if (ev.card) { drawn++; ui.deckView = snap.deck.length >= drawn ? snap.deck.slice(0, snap.deck.length - drawn) : null; }
      if (ev.card) {
        if (ev.result === 'ok') {
          if (ev.card.sp === 'sceau') shown.sceaux++;
          if (ev.card.sp === 'offrande') shown.offer = true;
          if (ev.card.f) { shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card); shown.offer = false; } else shown.row.push(ev.card);
        }
        app.sfx[ev.card.sp === 'offrande' ? 'pa-offer' : 'pa-draw']?.();
      }
      if (ev.result === 'ok') { renderShown(shown); await wait(650); if (ev.curse || ev.echo) await say(g.s.pacte.cur, ev, ev.curse ? 1500 : 1100); continue; }
      if (ev.result === 'saved') {
        const i = shown.row.findIndex((c) => c.sp === 'sceau'); if (i >= 0) shown.row.splice(i, 1);
        shown.sceaux = Math.max(0, shown.sceaux - 1); shown.offer = false;
        await say(g.s.pacte.cur, ev, 1300); renderShown(shown); await wait(400); continue;
      }
      if (ev.card) shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card);
      renderShown(shown); await wait(ev.card ? 650 : 450);
      if (ev.result === 'bust') await burnRow();
      shown.row = []; shown.sceaux = 0; shown.offer = false;
      await say(g.s.pacte.cur, ev, 1500); defy = null;
    }
    busy = false; ui.deckView = null;
    if (gone) return;
    view();
    if (g.s.pacte.cur?.over) { await wait(300); end(); }
  }
  // Affiche le tour de l'adversaire en cours de relecture (état intermédiaire, sans toucher à la sauvegarde)
  function renderShown(shown, turn = 'a') {
    const st = g.s.pacte.cur, keep = { row: st.row, sceaux: st.sceaux, offer: st.offer, turn: st.turn };
    Object.assign(st, { row: shown.row, sceaux: shown.sceaux, offer: shown.offer, turn });
    view();
    Object.assign(st, keep);
  }
  function end() {
    const st = g.s.pacte.cur;
    if (!st?.over) return;
    const out = g.pacteFinish();
    app.chrome?.();
    const won = st.over === 'won', R = PA.RIVALS[st.rival];
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    if (!won) document.body.classList.add('sc-lost');
    const el = document.createElement('div');
    el.className = `sc-end ${won ? 'won' : 'lost'}`;
    el.innerHTML = `${won && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${crestHTML(won, won ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-caps">Toi : <b>${st.final.scores.p}</b> · <span translate="no">${esc(tw(R.name))}</span> : <b>${st.final.scores.a}</b></p>
      <p class="sc-say">${pic(st.rival)}<span>« ${esc(vsay(st, 'end', `arb-${st.rival}`, won ? R.beaten : R.gloat))} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} ${out.chests.map((c) => `<b translate="no">${esc(t(CHEST_NAME[c]))}</b>`).join(' et ')} gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${PA.PACTE_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${PA.PACTE_REWARD.afterCap} éclats et ${PA.PACTE_REWARD.xp} XP.</p>` : ''}
      ${out.feat ? `<p class="sc-gain gm-featwin"><img class="gm-hf big" alt="" src="assets/icons/haut-fait.webp"> Haut fait réussi : <b>${esc(out.feat)}</b></p>` : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Rejouer</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove(); document.body.classList.remove('sc-lost');
      const tbl = st.table; g.pacteQuit();
      if (b.dataset.x === 'again') start({ table: tbl }); else lobby();
    });
  }
  function start(opts) {
    try { g.pacteStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    const st = g.s.pacte.cur, R = PA.RIVALS[st.rival];
    app.sfx.enter?.();
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(st.rival)}</span><span class="mq-vd"><small>${esc(R.name)}</small><b>« ${esc(vsay(st, 'hello', `arb-${st.rival}`, R.hello))} »</b><span>Le premier à ${PA.tgt(st)} points gagne.${st.scores.a ? ` ${esc(R.name)} commence avec ${st.scores.a} points.` : ''}${PA.TABLE[st.table].rule ? `<em class="gm-ruleline">${esc(PA.TABLE[st.table].rule)}</em>` : ''}${R.power ? `<em class="gm-ruleline pa-powl"><b>${esc(R.power.name)}</b> : ${esc(R.power.text)}</em>` : ''}</span></span>` };
    busy = true; prevSig = []; prevLit = new Set(); view();
    tuto(app, 'pacte').then(() => tuto(app, 'pacte-play')).then(() => wait(R.power ? 3200 : 1400)).then(() => { banner = null; busy = false; if (!gone) view(); });
  }
  function rules() { openSheet(`<div class="sc-rules"><h2>Le Pacte</h2>${howHTML()}</div>`, { label: 'Règles du Pacte' }); }
  function cardInfo(i) {
    const st = g.s.pacte.cur, c = st?.row[i]; if (!c) return;
    if (c.sp) return openSheet(`<div class="sc-rules"><h2>${SP[c.sp].name}</h2><p>${SP[c.sp].desc}</p></div>`, { label: SP[c.sp].name, cls: 'sheet-small' });
    const card = c.id && cat.get(c.id);
    openSheet(`<div class="sc-rules"><h2>${esc(card?.name || fname(c.f))}</h2><p>${esc(fname(c.f))} · ${c.v} point${c.v > 1 ? 's' : ''}${c.x2 ? ' (doublé par l’Offrande)' : ''}</p></div>`, { label: 'Carte', cls: 'sheet-small' });
  }

  root.addEventListener('click', async (e) => {
    const pc = e.target.closest('.pa-row .pa-card');
    if (pc && !busy) return cardInfo([...pc.parentNode.children].indexOf(pc));
    const b = e.target.closest('[data-pa]');
    if (!b || b.disabled) return;
    const k = b.dataset.pa;
    if (k === 'mode') { ui.mode = b.dataset.v; app.sfx.tap(); return lobby(); }
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'power') { const st0 = g.s.pacte.cur, P = st0 && PA.powerOf(st0); if (P) openSheet(`<div class="sc-rules"><h2>${esc(P.name)}</h2><p class="muted"><span translate="no">${esc(tw(PA.RIVALS[st0.rival].name))}</span></p><p>${esc(P.text)}</p></div>`, { label: P.name, cls: 'sheet-small' }); return; }
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { g.gameForfeit('pacte'); g.pacteQuit(); lobby(); }; /* v540 : l'abandon passe par le jeu (rejoué par le serveur de partie) */
      if (!g.s.pacte.cur?.over) { confirmBox('Quitter la partie ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.pacte.cur;
    if (!st || st.over || busy || st.turn !== 'p') return;
    if (k === 'double' && !(await askDouble(st))) return;
    if (!g.s.pacte.cur || st.over || busy || st.turn !== 'p') return;
    const before = { row: st.row.slice(), sceaux: st.sceaux, offer: st.offer };
    let ev;
    try { ev = k === 'draw' ? g.pacteDraw() : k === 'stop' ? g.pacteStop() : k === 'double' ? g.pacteDouble() : null; } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    if (!ev) return;
    busy = true;
    if (ev.dbl) await defyMoment('p', () => renderShown(before, 'p'));
    if (ev.card && ev.result === 'ok') app.sfx[ev.card.sp === 'offrande' ? 'pa-offer' : 'pa-draw']?.();
    if (ev.result === 'ok' && ev.curse) { await say(st, ev, 1500); busy = false; if (!gone) view(); return; }
    if (ev.result === 'ok') { busy = false; view(); return; }
    if (ev.card && ev.result !== 'saved') {
      // la carte qui brise (ou arrête, ou complète les sept) se voit un instant dans la rangée avant l'annonce
      if (ev.dbl || ev.result === 'bust') app.sfx['pa-draw']?.();
      renderShown({ ...before, row: [...before.row, ev.x2 ? { ...ev.card, x2: true } : ev.card] }, 'p'); await wait(650);
      if (ev.result === 'bust') await burnRow();
    }
    await say(st, ev);
    defy = null;
    busy = false;
    if (gone) return;
    view();
    if (st.over) { await wait(300); end(); return; }
    aiTurn();
  });

  const cur = g.s.pacte.cur;
  if (cur && !cur.rewarded) { view(); if (cur.over) end(); else if (cur.turn === 'a') aiTurn(); }
  else { if (cur) g.pacteQuit(); lobby(); }
  return () => { gone = true; mp.stop(); clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
