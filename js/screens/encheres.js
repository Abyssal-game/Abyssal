// v427 : Les Enchères de Mammon — accueil (tables, défi du jour), vente à trois et fin de vente.
import { t, tw } from '../i18n.js';
import * as EN from '../core/encheres.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';
import { MP_HOURS, MP_FAST_SECS, MP_REWARD } from '../core/mp.js';
import { createEncheresMp } from './encheres-mp.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival-${key}.webp">`;
const HOW = [['cards', '#7FA8D8', 'La vente', 'Mammon met en vente 15 lots, un par manche : en général 10 créatures (de 1 à 10 points) et 5 malédictions (de −1 à −5). Certaines salles changent les lots.'],
  ['crystal', '#E8C35A', 'Tes offrandes', 'Tu as 15 offrandes, numérotées de 1 à 15. À chaque manche, chacun en pose une en secret. Une offrande jouée est perdue.'],
  ['rule', '#B48CFF', 'Qui remporte le lot', 'On révèle les offrandes. Celles qui sont jouées par deux joueurs ou plus s’annulent. Parmi les autres, la plus haute prend une créature… et la plus basse prend une malédiction.'],
  ['crown', '#F2C14E', 'La victoire', 'Après le 15e lot, on compte les points. Celui qui a le plus de points gagne.'],
  ['hourglass', '#9FE0FF', 'Tout s’annule ?', 'Si toutes les offrandes s’annulent, le lot reste sur la table et s’ajoute au suivant : on se dispute les deux à la fois.'],
  ['book', '#7FE0A0', 'Les familles', 'Trois créatures d’une même faction rapportent +5 points (+10 à la Vente des lignées).'],
  ['eye', '#C9A45A', 'Lire les enchérisseurs', 'Les offrandes qui restent à chacun sont visibles. Chaque enchérisseur a son style : certains se lisent facilement, d’autres misent n’importe quoi.'],
  ['amis', '#9FE0FF', 'Contre un joueur', `En haut, « Contre un joueur » : une vente à deux contre un autre joueur (au hasard ou un ami), les mêmes lots pour les deux. Vous misez en même temps, en secret. Partie rapide : ${MP_FAST_SECS} s par mise ; partie lente : ${MP_HOURS} h. Mise pas posée à temps : vente perdue. Victoire : +${MP_REWARD.win} éclats et le classement du mois.`]];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'crystal' ? 'cur-shard' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
export const howHTML = () => `<ol class="how-steps">${HOW.map(howLi).join('')}</ol>`; /* v491 : tutoriel entier, sans « Pour aller plus loin » */

export default function encheresScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.encheres ||= { sel: null });
  let busy = false, timer = 0, gone = false, banner = null;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 150) : ms); });
  const fname = (f) => cat.faction[f]?.name || f;
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const who = (st, x) => (x === 'p' ? { name: 'Toi', key: null } : { ...EN.BIDDERS[st.seats[x]], key: st.seats[x] });
  const me = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  // v525 : « Contre l'Abysse » (arbitres) ou « Contre un joueur » (parties en ligne)
  const mui = (app.state.encheresMode ||= { mode: 'solo' });
  const modeBar = (rec = '') => `<header class="screen-head ui-hero ${mui.mode === 'mp' ? 'bn-enligne' : 'bn-encheres'}"><h1>Les Enchères de Mammon</h1><p class="muted">${mui.mode === 'mp' ? 'Affronte d’autres joueurs : une vente à deux, en même temps.' : 'Offre plus que les autres… sans jamais offrir pareil.'}</p>${rec}</header>
    <div class="seg wide gm-mode" role="tablist"><button class="seg-b" role="tab" data-en="mode" data-v="solo" aria-selected="${mui.mode !== 'mp'}" aria-pressed="${mui.mode !== 'mp'}">Contre l’Abysse</button><button class="seg-b" role="tab" data-en="mode" data-v="mp" aria-selected="${mui.mode === 'mp'}" aria-pressed="${mui.mode === 'mp'}">Contre un joueur</button></div>`;
  const mp = createEncheresMp(app, root, { modeBar: () => modeBar() });

  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-encheres"><h1>Les Enchères de Mammon</h1><p class="muted">Des enchères à l’aveugle, à trois.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellées</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la salle des ventes.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    if (mui.mode === 'mp') return mp.show();
    mp.stop();
    const en = g.s.encheres, dailyDone = en.dailyDone === todayKey(), dailyTried = !dailyDone && en.dailyTried === todayKey(), d = g.encheresDaily(), DT = EN.TABLE[d.table];
    const tables = EN.TABLES.map((t, i) => {
      const open = EN.tableUnlocked(g.s, i), won = en.beaten[t.key], [A, B] = t.seats.map((k) => EN.BIDDERS[k]);
      return [open, `<button class="sc-rival mq-tbl ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-en="play" data-t="${t.key}" ${open ? '' : 'disabled'} style="background-image:linear-gradient(90deg, rgba(12, 13, 20, .97) 42%, rgba(12, 13, 20, .45) 76%, rgba(12, 13, 20, .15)), url(${EN.tableBg(t.key)})">
        <span class="mq-pors"><span class="sc-por">${pic(t.seats[0])}</span><span class="sc-por">${pic(t.seats[1])}</span></span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">${esc(A.name)} et ${esc(B.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${EN.ENCHERES_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne à ${esc(EN.TABLES[i - 1].name)} pour y entrer`}</span>${t.rule ? `<span class="small gm-rule">${icon('p:rule')}${esc(t.rule)}</span>` : ''}${open && EN.FEATS[t.key] ? `<span class="small gm-feat ${en.feats?.[t.key] ? 'done' : ''}">${en.feats?.[t.key] ? icon('check') : '<img class="gm-hf" alt="" src="assets/icons/haut-fait.webp">'} Haut fait : ${esc(EN.FEATS[t.key].text)}${en.feats?.[t.key] ? '' : ` (+${EN.FEAT_SHARDS})`}</span>` : ''}</span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `${modeBar(`<span class="sc-rec">${en.wins} victoire${en.wins > 1 ? 's' : ''} · ${en.losses} défaite${en.losses > 1 ? 's' : ''}</span>`)}
      ${g.encheresDailyOpen() ? `<button class="panel sc-daily ${dailyDone || dailyTried ? 'done' : ''}" data-en="daily" ${dailyDone || dailyTried ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · la même vente pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : dailyTried ? 'Tenté aujourd’hui. Nouveau défi demain.' : `Un seul essai · victoire : +${EN.ENCHERES_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : dailyTried ? icon('p:hourglass') : icon('next')}</button>` : ''}
      <h2 class="section-title">Les salles de vente</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Ventes à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/avatar.webp"><span class="dc-sum-t">Les enchérisseurs</span></summary>
        <ul class="mq-clist">${EN.TABLES.filter((_, i) => EN.tableUnlocked(g.s, i)).flatMap((t) => t.seats).map((k) => { const C = EN.BIDDERS[k]; return `<li><span class="sc-por">${pic(k)}</span><span><b>${esc(C.name)}</b><span class="small muted">${esc(C.hint)}</span></span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${EN.ENCHERES_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, EN.ENCHERES_REWARD.dailyPaid - (en.day === todayKey() ? en.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    /* v699 : la bulle des règles attend la première partie (elle couvrait la liste des salles) */
  }

  // ——— Vente ———
  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = `url(${EN.tableBg(g.s.encheres.cur?.table)})`;
  }
  // Lots gagnés : une pastille par faction (doré à 3 : famille complète), et le total des malédictions
  const wonHTML = (st, x) => {
    const n = {}; let curse = 0;
    st.won[x].forEach((l) => { if (l.f) n[l.f] = (n[l.f] || 0) + 1; else curse += l.v; });
    const chips = Object.entries(n).map(([f, k]) => `<span class="mq-fc en-fc ${k >= 3 ? 'set' : k === 2 ? 'n2' : ''}">${sigil(f)}<b>${k}</b></span>`).join('');
    return chips + (curse ? `<span class="mq-fc en-curse"><img alt="" src="assets/icons/danger.webp"><b>${curse}</b></span>` : '') || '<span class="mq-none">aucun lot</span>';
  };
  const offersHTML = (st, x) => `<span class="en-offs">${Array.from({ length: EN.OFFERS }, (_, k) => `<i class="${st.offers[x].includes(k + 1) ? '' : 'used'}">${k + 1}</i>`).join('')}</span>`;
  const seat = (st, x) => {
    const W = who(st, x), sc = EN.scoreOf(st, x);
    return `<div class="mq-seat en-seat s-${x}" data-seat="${x}">
      <span class="mq-top">${x === 'p' ? `<span class="sc-med mq-me">${me()}</span>` : `<span class="sc-med">${pic(W.key)}</span>`}<span class="mq-nm"><b>${esc(W.name)}</b><small>${sc.total} point${Math.abs(sc.total) > 1 ? 's' : ''}${sc.sets ? ` · ${sc.sets} famille${sc.sets > 1 ? 's' : ''}` : ''}</small></span></span>
      <span class="mq-front">${wonHTML(st, x)}</span>${x === 'p' ? '' : offersHTML(st, x)}</div>`;
  };
  const lotCard = (l, cls = '') => (l.v > 0
    ? `<span class="en-lot ${cls}"><img alt="" src="${l.id ? artUrl(cat.get(l.id), { lite: true }) : 'assets/sceaux/dos.webp'}"><b class="en-v">+${l.v}</b><span class="mq-cf">${sigil(l.f)}${esc(fname(l.f))}</span></span>`
    : `<span class="en-lot curse ${cls}"><img alt="" src="assets/jeux/en-malediction.webp"><b class="en-v">${l.v}</b><span class="mq-cf">Malédiction</span></span>`);
  /* v464 : la salle des ventes peinte : le lot sur le coussin du pupitre, la règle sur sa façade, les deux enchérisseurs
     dans les fauteuils, l'annonce de la manche et le marteau par-dessus */
  const chair = (st, x) => {
    const W = who(st, x), sc = EN.scoreOf(st, x);
    return `<div class="en-chair c-${x}" data-seat="${x}"><span class="sc-med">${pic(W.key)}</span><b>${esc(W.name)}</b>
      <small>${sc.total} pt${Math.abs(sc.total) > 1 ? 's' : ''}${sc.sets ? ` · ${sc.sets} fam.` : ''}</small><span class="mq-front">${wonHTML(st, x)}</span>${offersHTML(st, x)}</div>`;
  };
  function stage(st) {
    const lot = banner?.lot || st.lots[st.i], v = EN.potValue(st); /* pendant l'annonce : le lot qui vient d'être vendu */
    const k = banner ? st.i - 1 : st.i, fresh = ui.shown !== k; ui.shown = k; /* le lot n'arrive en glissant qu'une fois */
    const ban = banner ? `<div class="en-ban">${banner.gavel ? '<img class="en-gavel" alt="" src="assets/jeux/en-marteau.webp">' : ''}<div class="mq-banner ${banner.cls}">${banner.html}</div></div>` : '';
    return `<div class="en-stage">${chair(st, 'a')}${chair(st, 'b')}
      ${lot ? `<div class="en-onlot ${fresh ? 'fresh' : ''}">${lotCard(lot)}</div>
      ${banner ? '' : `<div class="en-plaque"><small>Lot ${st.i + 1} / ${st.lots.length}</small><b>${lot.v > 0 ? `${esc(fname(lot.f))} · ${lot.v} pt${lot.v > 1 ? 's' : ''}` : `Malédiction · ${lot.v}`}</b>
        ${st.pot.length ? `<span class="en-pot">+ ${st.pot.length} lot${st.pot.length > 1 ? 's' : ''} resté${st.pot.length > 1 ? 's' : ''} : en jeu ${v > 0 ? '+' : ''}${v}</span>` : ''}
        <span>${v > 0 ? 'La <b>plus haute</b> offrande seule l’emporte' : 'La <b>plus basse</b> offrande seule en hérite !'}</span></div>`}` : ''}${ban}</div>`;
  }
  function controls(st) {
    if (st.over || busy) return '';
    return `<div class="mq-ctl en-ctl">
      <div class="en-grid">${Array.from({ length: EN.OFFERS }, (_, k) => k + 1).map((n) => `<button class="en-ob ${ui.sel === n ? 'sel' : ''}" data-en="o" data-n="${n}" ${st.offers.p.includes(n) ? '' : 'disabled'} aria-label="Offrande ${n}">${n}</button>`).join('')}</div>
      <button class="btn primary block dc-plq dc-plq-red" data-en="bid" ${ui.sel ? '' : 'disabled'}>${ui.sel ? `Offrir ${ui.sel}` : 'Choisis une offrande'}</button></div>`;
  }
  function view() {
    const st = g.s.encheres.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const T = EN.TABLE[st.table];
    if (ui.sel && !st.offers.p.includes(ui.sel)) ui.sel = null;
    root.innerHTML = `<div class="mq-game en-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-en="rules" aria-label="Règles">${icon('p:help')}</button><b>${esc(T.name)}</b><button class="btn small ghost" data-en="quit" aria-label="Quitter la vente">${icon('close')}</button></div>
      ${stage(st)}
      ${seat(st, 'p')}
      ${controls(st)}</div>`;
  }
  // Révélation des trois offrandes : celles qui s'annulent sont barrées, puis le lot part (ou reste sur la table)
  async function reveal(st, ev) {
    const tk = ev.taker ? who(st, ev.taker) : null;
    const offer = (x) => `<span class="en-rv ${ev.cancelled.includes(x) ? 'off' : ''} ${ev.taker === x ? 'win' : ''}"><span class="sc-med">${x === 'p' ? me() : pic(st.seats[x])}</span><b>${ev.bids[x]}</b><small>${esc(who(st, x).name)}</small></span>`;
    banner = { cls: ev.taker === 'p' ? (ev.value > 0 ? 'ok' : 'ko') : ev.taker ? (ev.value > 0 ? 'ko' : 'ok') : '', gavel: !!ev.taker && !app.reduced(), lot: ev.lot, html: `<span class="en-rvrow">${['p', 'a', 'b'].map(offer).join('')}</span>
      <span class="mq-vd">${ev.cancelled.length ? `<small>${ev.cancelled.length === 3 ? 'Les trois offrandes s’annulent' : `${ev.cancelled.map((x) => esc(who(st, x).name)).join(' et ')} : offrandes annulées`}</small>` : ''}
      <b>${tk ? `${ev.taker === 'p' ? 'Tu remportes' : `${esc(tk.name)} remporte`} ${ev.pile.length > 1 ? `${ev.pile.length} lots` : ev.value > 0 ? 'le lot' : 'la malédiction'}` : 'Le lot reste sur la table'}</b>
      <span>${tk ? `${ev.value > 0 ? '+' : ''}${ev.value} point${Math.abs(ev.value) > 1 ? 's' : ''}` : 'Il s’ajoute au lot suivant.'}</span></span>` };
    view();
    /* v439 : offrandes annulées, puis coup de marteau du lot adjugé */
    if (ev.cancelled.length) setTimeout(() => app.sfx.cancel?.(), 350);
    if (ev.taker) setTimeout(() => app.sfx.gavel?.(), ev.cancelled.length ? 800 : 350);
    await wait(2000);
    banner = null;
  }
  function end() {
    const st = g.s.encheres.cur;
    if (!st?.over) return;
    const out = g.encheresFinish();
    app.chrome?.();
    const won = st.over === 'won', sc = st.final.scores, top = st.final.order[0];
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    if (!won) document.body.classList.add('sc-lost');
    const sayer = won ? who(st, st.final.order[1]) : who(st, top);
    const el = document.createElement('div');
    el.className = `sc-end ${won ? 'won' : 'lost'}`;
    el.innerHTML = `${won && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${crestHTML(won, won ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-caps">${st.final.order.map((x) => `${esc(who(st, x).name)} : <b>${sc[x]}</b>`).join(' · ')}</p>
      ${sayer.key ? `<p class="sc-say">${pic(sayer.key)}<span>« ${esc(won ? sayer.beaten : sayer.gloat)} »</span></p>` : ''}
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} ${out.chests.map((c) => `<b translate="no">${esc(t(CHEST_NAME[c]))}</b>`).join(' et ')} gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${EN.ENCHERES_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${EN.ENCHERES_REWARD.afterCap} éclats et ${EN.ENCHERES_REWARD.xp} XP.</p>` : ''}
      ${out.feat ? `<p class="sc-gain gm-featwin"><img class="gm-hf big" alt="" src="assets/icons/haut-fait.webp"> Haut fait réussi : <b>${esc(out.feat)}</b></p>` : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Rejouer</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove(); document.body.classList.remove('sc-lost');
      const tbl = st.table; g.encheresQuit();
      if (b.dataset.x === 'again') start({ table: tbl }); else lobby();
    });
  }
  function start(opts) {
    try { g.encheresStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    ui.sel = null;
    const st = g.s.encheres.cur, M = EN.BIDDERS.banquier, A = who(st, 'a');
    app.sfx.enter?.();
    const H = st.table === 'grande' ? { ...M, key: 'banquier' } : A; /* v492 : la réplique sous le bon portrait */
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(H.key)}</span><span class="mq-vd"><small>${esc(H.name)}${H.key === 'banquier' ? ', maître des ventes' : ''}</small><b>« ${esc(H.hello)} »</b><span>15 lots, 15 offrandes. Que la vente commence.${EN.TABLE[st.table].rule ? `<em class="gm-ruleline">${esc(EN.TABLE[st.table].rule)}</em>` : ''}</span></span>` };
    busy = true; view();
    tuto(app, 'encheres').then(() => tuto(app, 'encheres-play')).then(() => wait(1400)).then(() => { banner = null; busy = false; if (!gone) view(); });
  }
  function rules() { openSheet(`<div class="sc-rules"><h2>Les Enchères de Mammon</h2>${howHTML()}</div>`, { label: 'Règles des Enchères' }); }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-en]');
    if (!b || b.disabled) return;
    const k = b.dataset.en;
    if (k === 'mode') { mui.mode = b.dataset.v; app.sfx.tap(); return lobby(); }
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { g.gameForfeit('encheres'); g.encheresQuit(); lobby(); }; /* v540 : l'abandon passe par le jeu (rejoué par le serveur de partie) */
      if (!g.s.encheres.cur?.over) { confirmBox('Quitter la vente ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la vente', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.encheres.cur;
    if (!st || st.over || busy) return;
    if (k === 'o') { ui.sel = Number(b.dataset.n); app.sfx.tap?.(); return view(); }
    if (k === 'bid' && ui.sel) {
      let ev;
      try { ev = g.encheresBid(ui.sel); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
      ui.sel = null; busy = true; app.sfx['en-coin']?.(); /* v465 : la pièce posée */
      reveal(st, ev).then(async () => { busy = false; if (gone) return; view(); if (g.s.encheres.cur?.over) { await wait(300); end(); } });
    }
  });

  const cur = g.s.encheres.cur;
  if (cur && !cur.rewarded) { view(); if (cur.over) end(); }
  else { if (cur) g.encheresQuit(); lobby(); }
  return () => { gone = true; mp.stop(); clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
