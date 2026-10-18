// v451 : Les Trois Autels — accueil (autels, grimoire, défi du jour), duel en 6 tours et fin de partie.
import * as AU from '../core/autels.js';
import { ROLES } from '../core/army.js';
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival-${key}.webp">`;
const ROLE_IC = { protecteur: 'garde', degats: 'assaut', soin: 'soin', poison: 'venin', controle: 'gel', soutien: 'cri', zone: 'deferlante' };
const roleImg = (r) => `<img class="au-ri" alt="" src="assets/icons/role-${ROLE_IC[r] || 'assaut'}.webp">`;
const HOW = [['cards', '#7FA8D8', 'Les autels', 'Trois autels, six tours. Pour gagner, domine deux autels sur trois : la plus grande force totale sur un autel le domine.'],
  ['crystal', '#E8C35A', 'La Ferveur', 'À chaque tour, tu as autant de Ferveur que le numéro du tour (1 au 1er, 6 au 6e). Elle ne se garde pas. Une carte coûte selon sa rareté : de 1 (Commune) à 6 (Secrète).'],
  ['rule', '#B48CFF', 'Poser', 'Touche une carte de ta main, puis un autel. Quand tu as fini, touche « Fin du tour ». L’adversaire pose en même temps, sans voir tes cartes : on révèle les tiennes, puis les siennes.'],
  ['crown', '#F2C14E', 'Les rôles', 'Chaque créature agit à la pose selon son rôle : le Protecteur renforce ses voisins, l’Empoisonneur affaiblit l’adversaire, l’Entraveur gêne sa prochaine carte… Touche une carte pour lire son effet.'],
  ['book', '#7FE0A0', 'Les effets des autels', 'Chaque autel a son effet (une faction favorisée, le givre, l’aube…). Touche le nom d’un autel pour le lire.'],
  ['hourglass', '#9FE0FF', 'Égalité', 'À égalité sur un autel, la force totale sur les trois autels départage.'],
  ['eye', '#C9A45A', 'Ton grimoire', 'Tu joues avec 12 cartes de ta collection : 3 Communes, 3 Peu communes, 3 Rares, une Hyper rare, une Mythique et une Secrète (ou moins rares si tu ne les as pas).']];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'crystal' ? 'cur-shard' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
const howHTML = () => `<ol class="how-steps">${HOW.slice(0, 4).map(howLi).join('')}</ol><details class="how-more"><summary>Pour aller plus loin (${HOW.length - 4})</summary><ol class="how-steps" start="5">${HOW.slice(4).map((x, i) => howLi(x, i + 4)).join('')}</ol></details>`;

export default function autelsScreen(app, root) {
  const g = app.game, cat = app.catalog;
  let busy = false, timer = 0, gone = false, banner = null;
  const ui = { sel: null, plays: [], hl: new Set() };
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 200) : ms); });
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const me = () => { const c = g.s.avatar && cat.get(g.s.avatar); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  const art = (id) => { const c = cat.get(id); return c ? artUrl(c, { lite: true }) : 'assets/sceaux/dos.webp'; };

  // Petite carte (grimoire, main)
  const handCard = (st, id, cls = '') => {
    const I = st ? st.info[id] : AU.cardInfo(cat, id);
    return `<span class="au-h ${cls}" style="--rc:${RARITY[I.r].color};--fc:${cat.faction[I.f].colors.secondary}"><img alt="" src="${art(id)}"><b class="au-cost">${I.cost}</b><b class="au-pw">${I.base}</b>${roleImg(I.role)}</span>`;
  };
  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-autels"><h1>Les Trois Autels</h1><p class="muted">Un duel tactique en six tours.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellés</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const au = g.s.autels, deck = g.autelsDeck(), dailyDone = au.dailyDone === todayKey(), d = g.autelsDaily(), DT = AU.TABLE[d.table];
    const tables = AU.TABLES.map((t, i) => {
      const open = AU.tableUnlocked(g.s, i), won = au.beaten[t.key], R = AU.RIVALS[t.rival];
      return [open, `<button class="sc-rival ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-au="play" data-t="${t.key}" ${open ? '' : 'disabled'}>
        <span class="sc-por">${pic(t.rival)}</span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">contre ${esc(R.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${AU.AUTELS_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne ${esc(AU.TABLES[i - 1].name)} pour y entrer`}</span></span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `<header class="screen-head ui-hero bn-autels"><h1>Les Trois Autels</h1><p class="muted">Domine deux autels sur trois, en six tours.</p>
        <span class="sc-rec">${au.wins} victoire${au.wins > 1 ? 's' : ''} · ${au.losses} défaite${au.losses > 1 ? 's' : ''}</span></header>
      ${g.autelsDailyOpen() ? `<button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-au="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · les mêmes autels pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `Victoire : +${AU.AUTELS_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>` : ''}
      <section class="panel au-deck"><div class="au-deck-h"><b>Ton grimoire</b><button class="btn small ghost" data-au="reroll">${icon('p:luck')}Changer</button></div>
        <div class="au-deck-l">${deck.map((id) => `<button class="au-dk" data-au="card" data-id="${id}">${handCard(null, id)}</button>`).join('')}</div>
        <p class="small muted">12 cartes de ta collection. En haut à gauche : le coût ; en bas : la force. Touche une carte pour son rôle.${(au.lent || []).length ? ` ${(au.lent || []).length} carte${au.lent.length > 1 ? 's' : ''} prêtée${au.lent.length > 1 ? 's' : ''} : ta collection est encore petite.` : ''}</p></section>
      <h2 class="section-title">Les autels</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Autels à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/avatar.webp"><span class="dc-sum-t">Les adversaires</span></summary>
        <ul class="mq-clist">${AU.TABLES.filter((_, i) => AU.tableUnlocked(g.s, i)).map((t) => { const R = AU.RIVALS[t.rival]; return `<li><span class="sc-por">${pic(t.rival)}</span><span><b>${esc(R.name)}</b><span class="small muted">${esc(R.hint)}</span></span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${AU.AUTELS_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, AU.AUTELS_REWARD.dailyPaid - (au.day === todayKey() ? au.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    tuto(app, 'autels');
  }

  // ——— Partie ———
  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = 'url(assets/sceaux/salle-autels.webp)';
  }
  const boardCard = (c, x, a, k) => `<span class="au-b ${ui.hl.has(`${x}${a}${k}`) ? 'hl' : ''} ${c.mod > 0 ? 'up' : c.mod < 0 ? 'down' : ''}" style="--fc:${cat.faction[c.f].colors.secondary}"><img alt="" src="${art(c.id)}"><b>${AU.powerOf(c)}</b></span>`;
  const ghost = (id, st) => `<span class="au-b ghost" data-au="unplay" data-id="${id}"><img alt="" src="${art(id)}"><b>${st.info[id].base}</b></span>`;
  /* emplacements libres (4 par camp, 2 sur l'autel étroit) : les colonnes gardent la même hauteur */
  const pad = (st, a, n) => Array.from({ length: AU.SLOTS - n }, (_, k) => `<span class="au-b ${n + k < AU.cap(st, a) ? 'slot' : 'void'}"></span>`).join('');
  function altar(st, a) {
    const A = AU.ALTARS[st.altars[a]], sp = AU.altarSum(st, 'p', a), sa = AU.altarSum(st, 'a', a);
    const mine = ui.plays.filter((p) => p.a === a);
    const full = st.board.p[a].length + mine.length >= AU.cap(st, a);
    const can = ui.sel && !full && !st.over && !busy;
    const lead = sp > sa ? 'p' : sa > sp ? 'a' : '';
    const win = st.over ? st.final.winners[a] : null;
    return `<div class="au-alt ${can ? 'can' : ''} ${lead ? `lead-${lead}` : ''} ${win ? `win-${win}` : ''}" data-au="alt" data-a="${a}">
      <div class="au-side a">${pad(st, a, st.board.a[a].length)}${st.board.a[a].map((c, k) => boardCard(c, 'a', a, k)).join('')}</div>
      <b class="au-sum sa" aria-label="Force de l’adversaire">${sa}</b>
      <button class="au-name" data-au="ainfo" data-a="${a}">${win ? `<i class="au-w">${win === 'p' ? '★' : '✕'}</i>` : A.fac ? sigil(A.fac) : ''}<span>${esc(A.name.replace(/^Autel /, ''))}</span></button>
      <b class="au-sum sp" aria-label="Ta force">${sp}</b>
      <div class="au-side p">${st.board.p[a].map((c, k) => boardCard(c, 'p', a, k)).join('')}${mine.map((p) => ghost(p.id, st)).join('')}${pad(st, a, st.board.p[a].length + mine.length)}</div></div>`;
  }
  function hand(st) {
    const spent = ui.plays.reduce((n, p) => n + st.info[p.id].cost, 0), left = st.energy.p - spent;
    const ids = st.hands.p.filter((id) => !ui.plays.some((p) => p.id === id));
    const I = ui.sel && st.info[ui.sel];
    return `<div class="au-hand">${ids.map((id) => `<button class="au-hb ${ui.sel === id ? 'sel' : ''} ${st.info[id].cost > left ? 'dear' : ''}" data-au="pick" data-id="${id}">${handCard(st, id)}</button>`).join('') || '<span class="small muted">Main vide.</span>'}</div>
      <p class="au-tip small">${I ? `<b>${esc(cat.get(ui.sel).name)}</b> · ${esc(ROLES[I.role].name)} : ${esc(AU.ROLE_FX[I.role])} ${I.cost > left ? '<span class="dc-bad">Pas assez de Ferveur.</span>' : 'Touche un autel.'}` : 'Touche une carte, puis un autel. Touche une carte posée (transparente) pour la reprendre.'}</p>`;
  }
  function view() {
    const st = g.s.autels.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const T = AU.TABLE[st.table], R = AU.RIVALS[st.rival];
    const spent = ui.plays.reduce((n, p) => n + st.info[p.id].cost, 0), left = st.energy.p - spent;
    root.innerHTML = `<div class="mq-game au-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-au="rules" aria-label="Règles">${icon('p:help')}</button><b>${esc(T.name)}</b><button class="btn small ghost" data-au="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      <div class="au-top"><span class="sc-med">${pic(st.rival)}</span><span class="au-tn"><b>${esc(R.name)}</b><small>${st.hands.a.length} carte${st.hands.a.length > 1 ? 's' : ''} en main</small></span><span class="au-turn">Tour <b>${Math.min(st.turn, AU.TURNS)}</b> / ${AU.TURNS}</span></div>
      ${banner ? `<div class="cr-msg ${banner.cls || ''}">${banner.html}</div>` : ''}
      <div class="au-alts">${[0, 1, 2].map((a) => altar(st, a)).join('')}</div>
      ${st.over ? '' : `${hand(st)}<div class="au-foot"><span class="au-fv">${Array.from({ length: st.energy.p }, (_, k) => `<i class="${k < left ? 'on' : ''}"></i>`).join('')}<b>${left}</b><small>Ferveur</small></span>
        <button class="btn primary dc-plq dc-plq-red" data-au="end" ${busy ? 'disabled' : ''}>${st.turn >= AU.TURNS ? 'Dernière révélation' : 'Fin du tour'}</button></div>`}</div>`;
  }
  // Révélation : tes cartes, puis celles de l'adversaire, une par une
  async function reveal(st, ev) {
    for (const e of ev) {
      if (gone) return;
      const k = st.board[e.x][e.a].findIndex((c) => c.id === e.id);
      ui.hl = new Set([`${e.x}${e.a}${k}`]);
      const nm = cat.get(e.id)?.name || '';
      const fx = e.silenced ? 'Silence : son rôle n’agit pas.' : e.role ? AU.ROLE_FX[e.role] : '';
      banner = { cls: e.x === 'p' ? 'ok' : 'ko', html: `<span class="sc-med">${e.x === 'p' ? me() : pic(st.rival)}</span><span><b>${esc(nm)}</b><span class="small">${esc(AU.ALTARS[st.altars[e.a]].name)}${e.notes.length ? ` (${esc(e.notes.join(', '))})` : ''}${fx ? ` · ${esc(ROLES[e.role]?.name || '')} : ${esc(fx)}` : ''}</span></span>` };
      app.sfx[e.x === 'p' ? 'au-place' : 'au-reveal']?.(); /* v457 */
      view(); await wait(1000);
    }
    ui.hl.clear(); banner = null;
  }
  function end() {
    const st = g.s.autels.cur;
    if (!st?.over) return;
    const out = g.autelsFinish();
    app.chrome?.();
    const won = st.over === 'won', R = AU.RIVALS[st.rival], w = st.final.winners;
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    if (!won) document.body.classList.add('sc-lost');
    const el = document.createElement('div');
    el.className = `sc-end ${won ? 'won' : 'lost'}`;
    el.innerHTML = `${won && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${crestHTML(won, won ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-caps">Autels dominés : toi <b>${w.filter((x) => x === 'p').length}</b> · ${esc(R.name)} <b>${w.filter((x) => x === 'a').length}</b></p>
      <p class="small muted center">${st.final.altars.map((s, a) => `${esc(AU.ALTARS[st.altars[a]].name.replace(/^Autel /, ''))} : ${s.p} contre ${s.a}`).join(' · ')}</p>
      <p class="sc-say">${pic(st.rival)}<span>« ${esc(won ? R.beaten : R.gloat)} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} <b>${out.chests.map((c) => esc(CHEST_NAME[c])).join(' et ')}</b> gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${AU.AUTELS_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${AU.AUTELS_REWARD.afterCap} éclats et ${AU.AUTELS_REWARD.xp} XP.</p>` : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Rejouer</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove(); document.body.classList.remove('sc-lost');
      const tbl = st.table; g.autelsQuit();
      if (b.dataset.x === 'again') start({ table: tbl }); else lobby();
    });
  }
  function start(opts) {
    try { g.autelsStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    const st = g.s.autels.cur, R = AU.RIVALS[st.rival];
    ui.sel = null; ui.plays = []; ui.hl.clear();
    app.sfx.enter?.();
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(st.rival)}</span><span><b>« ${esc(R.hello)} »</b><span class="small">Six tours. Domine deux autels sur trois.</span></span>` };
    busy = true; view();
    tuto(app, 'autels-play').then(() => wait(1400)).then(() => { banner = null; busy = false; if (!gone) view(); });
  }
  function rules() { openSheet(`<div class="sc-rules"><h2>Les Trois Autels</h2>${howHTML()}</div>`, { label: 'Règles des Trois Autels' }); }
  function cardSheet(id) {
    const c = cat.get(id), I = AU.cardInfo(cat, id);
    openSheet(`<div class="sc-rules"><h2>${esc(c.name)}</h2><div class="au-cs">${handCard(null, id, 'big')}<p><b>${esc(RARITY[I.r].name)}</b> · coût ${I.cost}, force ${I.base}<br><b>${esc(ROLES[I.role].name)}</b> : ${esc(AU.ROLE_FX[I.role])}<br><span class="small muted">${esc(cat.faction[I.f].name)}</span></p></div></div>`, { label: c.name, cls: 'sheet-small' });
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-au]');
    if (!b || b.disabled) return;
    const k = b.dataset.au;
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'card') return cardSheet(b.dataset.id);
    if (k === 'reroll') { g.autelsDeck(true); app.sfx.tap?.(); return lobby(); }
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { const st = g.s.autels.cur; if (st && !st.over) { st.over = 'lost'; st.final = { winners: ['a', 'a', 'a'], altars: [0, 1, 2].map((a) => ({ p: AU.altarSum(st, 'p', a), a: AU.altarSum(st, 'a', a) })), total: { p: AU.totalSum(st, 'p'), a: AU.totalSum(st, 'a') } }; g.autelsFinish(); } g.autelsQuit(); lobby(); };
      if (!g.s.autels.cur?.over) { confirmBox('Quitter la partie ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.autels.cur;
    if (!st || st.over) return;
    if (k === 'ainfo') { e.stopPropagation(); const A = AU.ALTARS[st.altars[+b.dataset.a]]; return openSheet(`<div class="sc-rules"><h2>${esc(A.name)}</h2><p>${esc(A.desc)}</p></div>`, { label: A.name, cls: 'sheet-small' }); }
    if (busy) return;
    if (k === 'pick') { ui.sel = ui.sel === b.dataset.id ? null : b.dataset.id; app.sfx.tap?.(); return view(); }
    if (k === 'unplay') { ui.plays = ui.plays.filter((p) => p.id !== b.dataset.id); app.sfx.tap?.(); return view(); }
    if (k === 'alt' && ui.sel) {
      const a = +b.dataset.a, plays = [...ui.plays, { id: ui.sel, a }];
      const err = AU.checkPlays(st, 'p', plays);
      if (err) { app.sfx.error?.(); toast(esc(err), { kind: 'error' }); return; }
      ui.plays = plays; ui.sel = null; app.sfx['au-place']?.(); return view();
    }
    if (k === 'end') {
      let ev;
      try { ev = g.autelsPlay(ui.plays); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
      ui.plays = []; ui.sel = null; busy = true;
      await reveal(st, ev);
      busy = false;
      if (gone) return;
      view();
      if (st.over) { const mine = st.final.winners.includes('p'); if (mine) app.sfx['au-win']?.(); /* v457 : tes autels s'embrasent */ await wait(mine ? 1400 : 500); end(); }
    }
  });

  const cur = g.s.autels.cur;
  if (cur && !cur.rewarded) { view(); if (cur.over) end(); }
  else { if (cur) g.autelsQuit(); lobby(); }
  return () => { gone = true; clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
