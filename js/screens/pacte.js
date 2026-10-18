// v449 : Le Pacte — accueil (pactes, défi du jour), partie à deux et fin de partie.
import * as PA from '../core/pacte.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival-${key}.webp">`;
const SP = { sceau: { name: 'Sceau', img: 'assets/icons/seal.webp', desc: 'Il te protège : la prochaine faction en double est jetée au lieu de briser le pacte.' },
  gardien: { name: 'Gardien', img: 'assets/icons/crest-boss.webp', desc: 'Arrêt forcé : tu encaisses tout de suite ce que tu as devant toi.' },
  offrande: { name: 'Offrande', img: 'assets/icons/ritual.webp', desc: 'La prochaine carte de faction compte double.' } };
const HOW = [['cards', '#7FA8D8', 'Ton tour', 'Tire des cartes une à une et pose-les devant toi. Chaque carte de faction vaut de 1 à 7 points.'],
  ['crystal', '#E8C35A', 'T’arrêter', 'Quand tu veux, arrête-toi : tu gagnes la somme des cartes posées ce tour-ci.'],
  ['danger', '#E0485E', 'Le pacte se brise', 'Si tu tires une faction que tu as déjà posée ce tour-ci, le pacte se brise : tu perds tout ce que tu avais gagné ce tour-ci.'],
  ['crown', '#F2C14E', 'La victoire', `Le premier à ${PA.TARGET} points gagne. Ton adversaire joue toujours autant de tours que toi.`],
  ['seal', '#9FE0FF', 'Les cartes spéciales', 'Sceau : il protège d’une brisure. Gardien : arrêt forcé, tu encaisses tout de suite. Offrande : la prochaine carte compte double.'],
  ['book', '#7FE0A0', 'Les sept factions', `Pose les 7 factions dans le même tour : +${PA.SEVEN_BONUS} points, et ton tour s’arrête.`],
  ['eye', '#C9A45A', 'Le risque', 'Le jeu t’affiche la chance que la prochaine carte brise ton pacte : elle compte les cartes déjà sorties.']];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'crystal' ? 'cur-shard' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
const howHTML = () => `<ol class="how-steps">${HOW.slice(0, 4).map(howLi).join('')}</ol><details class="how-more"><summary>Pour aller plus loin (${HOW.length - 4})</summary><ol class="how-steps" start="5">${HOW.slice(4).map((x, i) => howLi(x, i + 4)).join('')}</ol></details>`;

export default function pacteScreen(app, root) {
  const g = app.game, cat = app.catalog;
  let busy = false, timer = 0, gone = false, banner = null;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 150) : ms); });
  const fname = (f) => cat.faction[f]?.name || f;
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const me = () => { const c = g.s.avatar && cat.get(g.s.avatar); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };

  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-pacte"><h1>Le Pacte</h1><p class="muted">Tente ta chance… sans briser le pacte.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellé</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const pa = g.s.pacte, dailyDone = pa.dailyDone === todayKey(), d = g.pacteDaily(), DT = PA.TABLE[d.table];
    const tables = PA.TABLES.map((t, i) => {
      const open = PA.tableUnlocked(g.s, i), won = pa.beaten[t.key], R = PA.RIVALS[t.rival];
      return [open, `<button class="sc-rival ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-pa="play" data-t="${t.key}" ${open ? '' : 'disabled'}>
        <span class="sc-por">${pic(t.rival)}</span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">contre ${esc(R.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${PA.PACTE_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne ${esc(PA.TABLES[i - 1].name)} pour y entrer`}</span></span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `<header class="screen-head ui-hero bn-pacte"><h1>Le Pacte</h1><p class="muted">Tire, encore une… et ne brise pas le pacte.</p>
        <span class="sc-rec">${pa.wins} victoire${pa.wins > 1 ? 's' : ''} · ${pa.losses} défaite${pa.losses > 1 ? 's' : ''}</span></header>
      ${g.pacteDailyOpen() ? `<button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-pa="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · le même paquet pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `Victoire : +${PA.PACTE_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>` : ''}
      <h2 class="section-title">Les pactes</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Pactes à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/avatar.webp"><span class="dc-sum-t">Les adversaires</span></summary>
        <ul class="mq-clist">${PA.TABLES.filter((_, i) => PA.tableUnlocked(g.s, i)).map((t) => { const R = PA.RIVALS[t.rival]; return `<li><span class="sc-por">${pic(t.rival)}</span><span><b>${esc(R.name)}</b><span class="small muted">${esc(R.hint)}</span></span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${PA.PACTE_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, PA.PACTE_REWARD.dailyPaid - (pa.day === todayKey() ? pa.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    tuto(app, 'pacte');
  }

  // ——— Partie ———
  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = 'url(assets/sceaux/salle-necrotique.webp)';
  }
  const cardHTML = (c, cls = '') => {
    if (c.sp) return `<span class="pa-card sp sp-${c.sp} ${cls}"><img alt="" src="${SP[c.sp].img}"><span class="pa-cn">${SP[c.sp].name}</span></span>`;
    const card = c.id && cat.get(c.id);
    return `<span class="pa-card f-${c.f} ${c.x2 ? 'x2' : ''} ${cls}" style="--fc:${cat.faction[c.f]?.colors.secondary || '#888'}"><img alt="" src="${card ? artUrl(card, { lite: true }) : 'assets/sceaux/dos.webp'}">
      <b class="pa-v">${c.v}${c.x2 ? '<small>×2</small>' : ''}</b><span class="pa-cf">${sigil(c.f)}</span></span>`;
  };
  const seat = (st, x) => {
    const sc = st.scores[x], R = PA.RIVALS[st.rival];
    return `<div class="pa-seat s-${x} ${st.turn === x && !st.over ? 'on' : ''}">
      <span class="sc-med ${x === 'p' ? 'mq-me' : ''}">${x === 'p' ? me() : pic(st.rival)}</span>
      <span class="pa-sc"><b>${x === 'p' ? 'Toi' : esc(R.name)}</b><span class="pa-bar"><i style="width:${Math.min(100, (sc / PA.TARGET) * 100)}%"></i></span></span>
      <span class="pa-pts"><b>${sc}</b><small>/ ${PA.TARGET}</small></span></div>`;
  };
  function center(st) {
    if (banner) return `<div class="mq-banner ${banner.cls}">${banner.html}</div>`;
    const v = PA.rowValue(st), risk = Math.round(PA.bustChance(st) * 100), nf = PA.rowFactions(st).size;
    return `<div class="pa-row">${st.row.length ? st.row.map((c) => cardHTML(c)).join('') : `<span class="pa-empty">${st.turn === 'p' ? 'Tire ta première carte.' : '…'}</span>`}</div>
      <div class="pa-info"><span>Ce tour : <b>${v}</b> point${v > 1 ? 's' : ''}</span><span class="pa-fac">${nf} / 7 factions</span>
        ${st.sceaux ? `<span class="pa-tag ok">${icon('shield')}Protégé ×${st.sceaux}</span>` : ''}${st.offer ? '<span class="pa-tag gold">Offrande : la suivante ×2</span>' : ''}
        <span class="pa-risk ${risk >= 40 ? 'hi' : risk >= 20 ? 'mid' : ''}">Risque de briser : <b>${risk} %</b></span></div>`;
  }
  function controls(st) {
    if (st.over || busy || st.turn !== 'p') return `<div class="mq-ctl"><p class="mq-q">${st.over ? '' : `Tour de ${esc(PA.RIVALS[st.rival].name)}…`}</p></div>`;
    const v = PA.rowValue(st), canStop = st.row.some((c) => c.f);
    return `<div class="mq-ctl pa-ctl"><button class="btn primary dc-plq dc-plq-red" data-pa="draw">${icon('cards')}Tirer une carte</button>
      <button class="btn dc-plq dc-plq-dark" data-pa="stop" ${canStop ? '' : 'disabled'}>${canStop ? `S’arrêter (+${v})` : 'S’arrêter'}</button></div>`;
  }
  function view() {
    const st = g.s.pacte.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const T = PA.TABLE[st.table];
    root.innerHTML = `<div class="mq-game pa-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-pa="rules" aria-label="Règles">${icon('p:help')}</button><b>${esc(T.name)}</b><button class="btn small ghost" data-pa="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      ${seat(st, 'a')}
      <div class="pa-deck"><span class="pa-pile"><img alt="" src="assets/sceaux/dos.webp"><b>${st.deck.length}</b></span><span class="small muted">Tour ${st.round}${st.turn === 'p' ? ' · à toi' : ` · à ${esc(PA.RIVALS[st.rival].name)}`}</span></div>
      <div class="mq-table pa-table">${center(st)}</div>
      ${seat(st, 'p')}
      ${controls(st)}</div>`;
  }
  // Annonce d'un événement (brisure, protection, arrêt…)
  async function say(st, ev, ms = 1500) {
    const R = PA.RIVALS[st.rival], mine = ev.who === 'p', nm = mine ? 'Tu' : esc(R.name);
    const fn = ev.card?.f ? fname(ev.card.f) : '';
    const H = ev.result === 'bust' ? [mine ? 'ko' : 'ok', 'Le pacte se brise !', `${fn} en double : ${mine ? 'tu perds' : `${nm} perd`} ${ev.lost} point${ev.lost > 1 ? 's' : ''}.`]
      : ev.result === 'saved' ? ['', 'Le Sceau protège !', `${fn} en double, jeté sans briser le pacte.`]
      : ev.result === 'forced' ? ['', 'Le Gardien arrête le tour', `${mine ? 'Tu encaisses' : `${nm} encaisse`} +${ev.gain}.`]
      : ev.result === 'seven' ? [mine ? 'ok' : 'ko', 'Les sept factions !', `+${PA.SEVEN_BONUS} de bonus : ${mine ? 'tu encaisses' : `${nm} encaisse`} +${ev.gain}.`]
      : ev.result === 'stop' ? ['', mine ? 'Tu t’arrêtes' : `${nm} s’arrête`, `+${ev.gain} point${ev.gain > 1 ? 's' : ''}.`] : null;
    if (!H) return;
    ({ bust: () => app.sfx.shatter?.(), saved: () => app.sfx.shield?.(), forced: () => app.sfx.block?.(), seven: () => app.sfx.fury?.(), stop: () => app.sfx.coin?.() })[ev.result]?.();
    banner = { cls: H[0], html: `${ev.card ? cardHTML(ev.card, 'big') : `<span class="sc-med">${mine ? me() : pic(st.rival)}</span>`}<span class="mq-vd"><b>${H[1]}</b><span>${H[2]}</span></span>` };
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
    for (const ev of evs) {
      if (gone) return;
      if (ev.card) {
        if (ev.result === 'ok') {
          if (ev.card.sp === 'sceau') shown.sceaux++;
          if (ev.card.sp === 'offrande') shown.offer = true;
          if (ev.card.f) { shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card); shown.offer = false; } else shown.row.push(ev.card);
        }
        app.sfx.flip?.();
      }
      if (ev.result === 'ok') { renderShown(shown); await wait(650); continue; }
      if (ev.result === 'saved') {
        const i = shown.row.findIndex((c) => c.sp === 'sceau'); if (i >= 0) shown.row.splice(i, 1);
        shown.sceaux = Math.max(0, shown.sceaux - 1); shown.offer = false;
        await say(g.s.pacte.cur, ev, 1300); renderShown(shown); await wait(400); continue;
      }
      if (ev.card) shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card);
      renderShown(shown); await wait(450);
      shown.row = []; shown.sceaux = 0; shown.offer = false;
      await say(g.s.pacte.cur, ev, 1500);
    }
    busy = false;
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
      <p class="sc-caps">Toi : <b>${st.final.scores.p}</b> · ${esc(R.name)} : <b>${st.final.scores.a}</b></p>
      <p class="sc-say">${pic(st.rival)}<span>« ${esc(won ? R.beaten : R.gloat)} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} <b>${out.chests.map((c) => esc(CHEST_NAME[c])).join(' et ')}</b> gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${PA.PACTE_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${PA.PACTE_REWARD.afterCap} éclats et ${PA.PACTE_REWARD.xp} XP.</p>` : ''}
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
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(st.rival)}</span><span class="mq-vd"><small>${esc(R.name)}</small><b>« ${esc(R.hello)} »</b><span>Le premier à ${PA.TARGET} points gagne.${st.scores.a ? ` ${esc(R.name)} commence avec ${st.scores.a} points.` : ''}</span></span>` };
    busy = true; view();
    tuto(app, 'pacte-play').then(() => wait(1400)).then(() => { banner = null; busy = false; if (!gone) view(); });
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
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { const st = g.s.pacte.cur; if (st && !st.over) { st.over = 'lost'; st.final = { scores: { ...st.scores } }; g.pacteFinish(); } g.pacteQuit(); lobby(); };
      if (!g.s.pacte.cur?.over) { confirmBox('Quitter la partie ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.pacte.cur;
    if (!st || st.over || busy || st.turn !== 'p') return;
    const before = { row: st.row.slice(), sceaux: st.sceaux, offer: st.offer };
    let ev;
    try { ev = k === 'draw' ? g.pacteDraw() : k === 'stop' ? g.pacteStop() : null; } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    if (!ev) return;
    busy = true;
    if (ev.card) app.sfx.flip?.();
    if (ev.result === 'ok') { busy = false; view(); return; }
    if (ev.card && ev.result !== 'saved') {
      // la carte qui brise (ou arrête, ou complète les sept) se voit un instant dans la rangée avant l'annonce
      renderShown({ ...before, row: [...before.row, ev.x2 ? { ...ev.card, x2: true } : ev.card] }, 'p'); await wait(450);
    }
    await say(st, ev);
    busy = false;
    if (gone) return;
    view();
    if (st.over) { await wait(300); end(); return; }
    aiTurn();
  });

  const cur = g.s.pacte.cur;
  if (cur && !cur.rewarded) { view(); if (cur.over) end(); else if (cur.turn === 'a') aiTurn(); }
  else { if (cur) g.pacteQuit(); lobby(); }
  return () => { gone = true; clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
