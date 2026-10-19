// v450 : Les Cryptes — accueil (cryptes, défi du jour), partie de mémoire à deux et fin de partie.
import * as CR from '../core/cryptes.js';
import { FACTION_ORDER } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival-${key}.webp">`;
const HOW = [['cards', '#7FA8D8', 'Les cryptes', '20 cartes face cachée, en 10 paires. À ton tour, retourne deux cartes.'],
  ['crystal', '#E8C35A', 'Une paire', 'Deux fois la même créature : tu la gardes, son pouvoir se déclenche, et tu rejoues.'],
  ['danger', '#E0485E', 'Pas de paire', 'Les deux cartes se referment et la main passe. Retiens bien où elles sont !'],
  ['crown', '#F2C14E', 'La victoire', 'Quand tout est pris, le plus de points gagne : 1 point par paire, plus les bonus. À égalité, celui qui a pris la dernière paire gagne.'],
  ['book', '#B48CFF', 'Les pouvoirs', 'Chaque faction a son pouvoir : regarder une carte, échanger deux cartes, voler une paire… Touche « Pouvoirs » en partie pour les revoir.'],
  ['eye', '#C9A45A', 'Tes adversaires', 'Ils ont plus ou moins de mémoire. Les plus forts se servent de leurs pouvoirs pour brouiller ce que tu as vu.']];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'crystal' ? 'cur-shard' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
const howHTML = () => `<ol class="how-steps">${HOW.map(howLi).join('')}</ol>`; /* v491 : tutoriel entier, sans « Pour aller plus loin » */

export default function cryptesScreen(app, root) {
  const g = app.game, cat = app.catalog;
  let busy = false, timer = 0, gone = false, banner = null;
  // affichage temporaire : cartes montrées face visible (en plus de st.open), cartes en lumière, cartes choisies pour un pouvoir
  const ui = { up: new Set(), glow: new Set(), picks: [], swap: new Set() };
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 200) : ms); });
  const fname = (f) => cat.faction[f]?.name || f;
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const me = () => { const c = g.s.avatar && cat.get(g.s.avatar); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  const powersHTML = () => `<ul class="cr-plist">${FACTION_ORDER.map((f) => `<li style="--fc:${cat.faction[f].colors.secondary}">${sigil(f)}<span><b>${esc(fname(f))} · ${esc(CR.POWERS[f].name)}</b><span class="small muted">${esc(CR.POWERS[f].short)}</span></span></li>`).join('')}</ul>`;

  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-cryptes"><h1>Les Cryptes</h1><p class="muted">Un jeu de mémoire, avec les pouvoirs des factions.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellées</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const cr = g.s.cryptes, dailyDone = cr.dailyDone === todayKey(), d = g.cryptesDaily(), DT = CR.TABLE[d.table];
    const tables = CR.TABLES.map((t, i) => {
      const open = CR.tableUnlocked(g.s, i), won = cr.beaten[t.key], R = CR.RIVALS[t.rival];
      return [open, `<button class="sc-rival gm-tbl ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-cr="play" data-t="${t.key}" ${open ? '' : 'disabled'} style="background-image:linear-gradient(90deg, rgba(12, 13, 20, .97) 42%, rgba(12, 13, 20, .5) 78%, rgba(12, 13, 20, .2)), url(${CR.tableBg(t.key)})">
        <span class="sc-por">${pic(t.rival)}</span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">contre ${esc(R.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${CR.CRYPTES_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne dans ${esc(CR.TABLES[i - 1].name)} pour y entrer`}</span>${t.rule ? `<span class="small gm-rule">${icon('p:rule')}${esc(t.rule)}</span>` : ''}${open && CR.FEATS[t.key] ? `<span class="small gm-feat ${cr.feats?.[t.key] ? 'done' : ''}">${cr.feats?.[t.key] ? icon('check') : '<img class="gm-hf" alt="" src="assets/icons/haut-fait.webp">'} Haut fait : ${esc(CR.FEATS[t.key].text)}${cr.feats?.[t.key] ? '' : ` (+${CR.FEAT_SHARDS})`}</span>` : ''}</span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `<header class="screen-head ui-hero bn-cryptes"><h1>Les Cryptes</h1><p class="muted">Retrouve les paires… et réveille leurs pouvoirs.</p>
        <span class="sc-rec">${cr.wins} victoire${cr.wins > 1 ? 's' : ''} · ${cr.losses} défaite${cr.losses > 1 ? 's' : ''}</span></header>
      <div class="gm-show cr-show" aria-hidden="true"><img alt="" src="assets/jeux/cr-dos.webp"><span class="cr-show-pair"><img alt="" src="assets/jeux/cr-dos.webp"></span><img alt="" src="assets/jeux/cr-dos.webp"></div>
      ${g.cryptesDailyOpen() ? `<button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-cr="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · les mêmes cartes pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `Victoire : +${CR.CRYPTES_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>` : ''}
      <h2 class="section-title">Les cryptes</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Cryptes à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/power.webp"><span class="dc-sum-t">Les pouvoirs des factions</span></summary>${powersHTML()}</details>
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/avatar.webp"><span class="dc-sum-t">Les adversaires</span></summary>
        <ul class="mq-clist">${CR.TABLES.filter((_, i) => CR.tableUnlocked(g.s, i)).map((t) => { const R = CR.RIVALS[t.rival]; return `<li><span class="sc-por">${pic(t.rival)}</span><span><b>${esc(R.name)}</b><span class="small muted">${esc(R.hint)}</span></span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${CR.CRYPTES_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, CR.CRYPTES_REWARD.dailyPaid - (cr.day === todayKey() ? cr.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    tuto(app, 'cryptes');
  }

  // ——— Partie ———
  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = `url(${CR.tableBg(g.s.cryptes.cur?.table)})`;
  }
  const seat = (st, x) => {
    const R = CR.RIVALS[st.rival], n = CR.scoreOf(st, x);
    const tags = [st.grace[x] ? `<span class="pa-tag ok">${icon('shield')}Grâce ×${st.grace[x]}</span>` : '', st.block[x] ? '<span class="pa-tag bad">Pouvoir bloqué</span>' : '', st.bonus[x] ? `<span class="pa-tag gold">+${st.bonus[x]} bonus</span>` : ''].join('');
    return `<div class="pa-seat cr-seat s-${x} ${st.turn === x && !st.over ? 'on' : ''}">
      <span class="sc-med ${x === 'p' ? 'mq-me' : ''}">${x === 'p' ? me() : pic(st.rival)}</span>
      <span class="pa-sc"><b>${x === 'p' ? 'Toi' : esc(R.name)}</b><span class="cr-won">${st.pairs[x].map((k) => { const c = st.cards.find((y) => y.k === k); return `<i style="--fc:${cat.faction[c.f].colors.secondary}">${sigil(c.f)}</i>`; }).join('') || '<small class="muted">aucune paire</small>'}${tags}</span></span>
      <span class="pa-pts"><b>${n}</b><small>point${n > 1 ? 's' : ''}</small></span></div>`;
  };
  const face = (c) => { const card = c.id && cat.get(c.id), cursed = (g.s.cryptes.cur?.curse || []).includes(c.k); return `<img alt="" src="${card ? artUrl(card, { lite: true }) : 'assets/sceaux/dos.webp'}"><span class="cr-f" style="--fc:${cat.faction[c.f].colors.secondary}">${sigil(c.f)}</span>${cursed ? '<span class="cr-curse" title="Paire maudite"><img alt="" src="assets/icons/maudite.webp"></span>' : ''}`; }; /* v492 : marque des paires maudites */
  function grid(st) {
    const pick = st.pending && st.turn === 'p';
    return `<div class="cr-grid ${pick ? 'picking' : ''}">${st.cards.map((c, i) => {
      if (c.gone && !ui.up.has(i)) return `<span class="cr-c gone g-${c.gone}"></span>`;
      const up = st.open.includes(i) || ui.up.has(i);
      const cls = [up ? 'up' : '', ui.glow.has(i) ? 'glow' : '', ui.picks.includes(i) ? 'pick' : '', ui.swap.has(i) ? 'swap' : ''].join(' ');
      return `<button class="cr-c ${cls}" data-cr="c" data-i="${i}" aria-label="${up ? esc(fname(c.f)) : `Carte ${i + 1}, face cachée`}">${up ? face(c) : '<img alt="" src="assets/jeux/cr-dos.webp">'}</button>`;
    }).join('')}</div>`;
  }
  function info(st) {
    if (banner) return `<div class="cr-msg ${banner.cls || ''}">${banner.html}</div>`;
    if (st.pending && st.turn === 'p') { const P = CR.POWERS[st.pending.power]; return `<div class="cr-msg gold">${sigil(st.pending.power)}<span><b>${esc(P.name)}</b> · ${st.pending.power === 'abyssal' ? `touche deux cartes face cachée à échanger${ui.picks.length ? ' (encore une)' : ''}` : st.pending.power === 'infernal' ? 'touche une carte face cachée pour la regarder en secret' : 'touche une carte face cachée : elle sera montrée à tous'}.</span></div>`; }
    return `<div class="cr-msg">${st.turn === 'p' ? `<span>${st.open.length ? 'Retourne une deuxième carte.' : 'À toi : retourne deux cartes.'}</span>` : `<span>${esc(CR.RIVALS[st.rival].name)} réfléchit…</span>`}<span class="muted">${CR.left(st)} paire${CR.left(st) > 1 ? 's' : ''} à trouver</span></div>`;
  }
  function view() {
    const st = g.s.cryptes.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const T = CR.TABLE[st.table];
    root.innerHTML = `<div class="mq-game cr-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><span class="cr-btns"><button class="btn small ghost" data-cr="rules" aria-label="Règles">${icon('p:help')}</button><button class="btn small ghost" data-cr="powers" aria-label="Pouvoirs des factions">${icon('p:power')}</button></span><b>${esc(T.name)}</b><button class="btn small ghost" data-cr="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      ${seat(st, 'a')}
      ${info(st)}
      ${grid(st)}
      ${seat(st, 'p')}</div>`; /* v466 : le bouton des pouvoirs passe dans la barre du haut (il sortait de l'écran sur iPhone SE) */
  }
  // Après une paire : annonce du pouvoir (et ses effets visibles)
  async function powerSay(st, ev) {
    const P = CR.POWERS[ev.power], mine = ev.who === 'p', nm = mine ? 'Tu' : esc(CR.RIVALS[st.rival].name);
    let txt = esc(P.short);
    if (ev.cursed || ev.silent) { /* v492 : paire maudite, crypte silencieuse */
      banner = { cls: ev.cursed ? (mine ? 'ko' : 'ok') : '', html: ev.cursed ? `<img class="cr-curse-big" alt="" src="assets/icons/maudite.webp"><span><b>Paire maudite !</b><span class="small">${mine ? 'Tu perds' : `${nm} perd`} 1 point, et aucun pouvoir ne se déclenche.</span></span>` : `${sigil(ev.f)}<span><b>Paire ${esc(fname(ev.f))}</b><span class="small">Silence : aucun pouvoir ici.</span></span>` };
      app.sfx[ev.cursed ? 'cr-miss' : 'cr-power']?.(); view(); await wait(1300); banner = null; return;
    }
    if (ev.blocked) txt = 'Bloqué par le Verrou artificiel : rien ne se passe.';
    else if (ev.power === 'necrotique') txt = ev.stolen != null ? `${mine ? 'Tu voles' : `${nm} te vole`} une paire !` : 'Aucune paire à voler.';
    else if (ev.empty) txt = 'Plus assez de cartes : rien ne se passe.';
    else if (!mine && ev.power === 'infernal') txt = `${nm} regarde une carte en secret.`;
    else if (!mine && ev.power === 'abyssal') txt = `${nm} échange deux cartes de place.`;
    else if (!mine && ev.power === 'sauvage') txt = `${nm} retourne une carte à la vue de tous.`;
    else if (mine && P.pick) txt = `${esc(P.short)}`;
    banner = { cls: ev.blocked ? '' : mine ? 'ok' : 'ko', html: `${sigil(ev.power)}<span><b>Paire ${esc(fname(ev.f))} · ${esc(P.name)}</b><span class="small">${txt}</span></span>` };
    if (!ev.blocked && !mine && ev.i2) {
      if (ev.power === 'sauvage') ev.i2.forEach((i) => ui.up.add(i));
      ev.i2.forEach((i) => (ev.power === 'abyssal' ? ui.swap : ui.glow).add(i));
    }
    app.sfx[ev.blocked ? 'block' : 'cr-power']?.(); /* v457 */
    view(); await wait(ev.power === 'sauvage' && !mine ? 1900 : 1500);
    ui.up.clear(); ui.glow.clear(); ui.swap.clear(); banner = null;
  }
  // Montre un geste (carte retournée, paire, erreur), pour toi comme pour l'adversaire
  async function show(st, ev) {
    app.sfx['cr-flip']?.();
    if (ev.kind === 'first') { view(); await wait(st.turn === 'a' ? 650 : 0); return; }
    ev.i.forEach((i) => ui.up.add(i));
    if (ev.kind === 'match') {
      ev.i.forEach((i) => ui.glow.add(i)); view(); app.sfx['cr-pair']?.();
      await wait(800); ui.up.clear(); ui.glow.clear();
      await powerSay(st, ev);
      return;
    }
    view(); await wait(1100);
    ui.up.clear(); app.sfx['cr-miss']?.();
    if (ev.graced) { banner = { cls: ev.who === 'p' ? 'ok' : 'ko', html: `${sigil('celeste')}<span><b>Grâce céleste</b><span class="small">${ev.who === 'p' ? 'Tu gardes la main.' : `${esc(CR.RIVALS[st.rival].name)} garde la main.`}</span></span>` }; app.sfx.shield?.(); view(); await wait(1100); banner = null; }
    /* v492 : crypte mouvante : deux cartes échangent leur place, sous les yeux du joueur */
    if (ev.drift) { ev.drift.forEach((i) => ui.swap.add(i)); banner = { cls: '', html: `<img class="cr-curse-big" alt="" src="assets/icons/hourglass.webp"><span><b>La crypte bouge</b><span class="small">Les deux cartes en lumière ont échangé leur place.</span></span>` }; app.sfx.swipe?.(); view(); await wait(1300); ui.swap.clear(); banner = null; }
    view();
  }
  async function aiTurn() {
    let st = g.s.cryptes.cur;
    if (!st || st.over || st.turn !== 'a') return;
    busy = true; view(); await wait(600);
    let guard = 0;
    while (!gone && (st = g.s.cryptes.cur) && !st.over && st.turn === 'a' && guard++ < 60) {
      const ev = g.cryptesAi(); if (!ev) break;
      await show(st, ev);
      if (ev.kind === 'first') await wait(200);
    }
    busy = false;
    if (gone) return;
    view();
    if (g.s.cryptes.cur?.over) { await wait(300); end(); }
  }
  function end() {
    const st = g.s.cryptes.cur;
    if (!st?.over) return;
    const out = g.cryptesFinish();
    app.chrome?.();
    const won = st.over === 'won', R = CR.RIVALS[st.rival];
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    if (!won) document.body.classList.add('sc-lost');
    const el = document.createElement('div');
    el.className = `sc-end ${won ? 'won' : 'lost'}`;
    el.innerHTML = `${won && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${crestHTML(won, won ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-caps">Toi : <b>${st.final.scores.p}</b> · ${esc(R.name)} : <b>${st.final.scores.a}</b>${st.final.scores.p === st.final.scores.a ? ' (dernière paire décisive)' : ''}</p>
      <p class="sc-say">${pic(st.rival)}<span>« ${esc(won ? R.beaten : R.gloat)} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} <b>${out.chests.map((c) => esc(CHEST_NAME[c])).join(' et ')}</b> gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${CR.CRYPTES_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${CR.CRYPTES_REWARD.afterCap} éclats et ${CR.CRYPTES_REWARD.xp} XP.</p>` : ''}
      ${out.feat ? `<p class="sc-gain gm-featwin"><img class="gm-hf big" alt="" src="assets/icons/haut-fait.webp"> Haut fait réussi : <b>${esc(out.feat)}</b></p>` : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Rejouer</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove(); document.body.classList.remove('sc-lost');
      const tbl = st.table; g.cryptesQuit();
      if (b.dataset.x === 'again') start({ table: tbl }); else lobby();
    });
  }
  function start(opts) {
    try { g.cryptesStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    const st = g.s.cryptes.cur, R = CR.RIVALS[st.rival];
    ui.up.clear(); ui.glow.clear(); ui.picks = []; ui.swap.clear();
    app.sfx.enter?.();
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(st.rival)}</span><span><b>« ${esc(R.hello)} »</b><span class="small">10 paires à trouver. Tu commences.${CR.TABLE[st.table].rule ? `<em class="gm-ruleline">${esc(CR.TABLE[st.table].rule)}</em>` : ''}</span></span>` };
    busy = true; view();
    tuto(app, 'cryptes-play').then(() => wait(1400)).then(() => { banner = null; busy = false; if (!gone) view(); });
  }
  function rules() { openSheet(`<div class="sc-rules"><h2>Les Cryptes</h2>${howHTML()}</div>`, { label: 'Règles des Cryptes' }); }
  function powers() { openSheet(`<div class="sc-rules"><h2>Pouvoirs des factions</h2><p class="small muted">Chaque paire déclenche le pouvoir de sa faction.</p>${powersHTML()}</div>`, { label: 'Pouvoirs des factions' }); }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cr]');
    if (!b || b.disabled) return;
    const k = b.dataset.cr;
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'powers') return powers();
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { const st = g.s.cryptes.cur; if (st && !st.over) { st.over = 'lost'; st.final = { scores: { p: CR.scoreOf(st, 'p'), a: CR.scoreOf(st, 'a') } }; g.cryptesFinish(); } g.cryptesQuit(); lobby(); };
      if (!g.s.cryptes.cur?.over) { confirmBox('Quitter la partie ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.cryptes.cur;
    if (k !== 'c' || !st || st.over || busy || st.turn !== 'p') return;
    const i = Number(b.dataset.i);
    // pouvoir en attente : on choisit sa (ses) carte(s)
    if (st.pending) {
      if (!CR.hidden(st).includes(i)) return;
      if (ui.picks.includes(i)) { ui.picks = ui.picks.filter((x) => x !== i); return view(); }
      ui.picks.push(i); app.sfx.tap?.();
      if (ui.picks.length < st.pending.pick) return view();
      let ev;
      try { ev = g.cryptesPower(ui.picks); } catch (err) { ui.picks = []; toast(esc(err.message), { kind: 'error' }); return view(); }
      ui.picks = []; busy = true;
      if (ev.power === 'infernal' || ev.power === 'sauvage') {
        ui.up.add(ev.i[0]); ui.glow.add(ev.i[0]); app.sfx['cr-flip']?.();
        banner = { cls: 'ok', html: `${sigil(ev.card.f)}<span><b>${esc(CR.POWERS[ev.power].name)} : ${esc(fname(ev.card.f))}</b><span class="small">${ev.power === 'infernal' ? 'Toi seul l’as vue. Retiens bien sa place !' : 'Tout le monde l’a vue, l’adversaire aussi.'}</span></span>` };
        view(); await wait(1700);
      } else { ev.i.forEach((x) => ui.swap.add(x)); app.sfx.swipe?.(); banner = { cls: 'ok', html: `${sigil('abyssal')}<span><b>Cartes échangées</b><span class="small">Ce que l’adversaire avait retenu ne vaut plus rien.</span></span>` }; view(); await wait(1100); }
      ui.up.clear(); ui.glow.clear(); ui.swap.clear(); banner = null; busy = false;
      if (!gone) view();
      return;
    }
    if (!CR.hidden(st).includes(i)) return;
    let ev;
    try { ev = g.cryptesFlip(i); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    busy = true;
    await show(st, ev);
    busy = false;
    if (gone) return;
    view();
    if (st.over) { await wait(300); end(); return; }
    if (st.turn === 'a') aiTurn();
  });

  const cur = g.s.cryptes.cur;
  if (cur && !cur.rewarded) { cur.open = []; view(); if (cur.over) end(); else if (cur.turn === 'a') aiTurn(); }
  else { if (cur) g.cryptesQuit(); lobby(); }
  return () => { gone = true; clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
