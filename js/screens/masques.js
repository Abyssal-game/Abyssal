// v425 : La Cour des Masques — accueil (tables, défi du jour), partie à trois et fin de partie.
import * as MQ from '../core/masques.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { CHESTS } from '../core/descent.js';

const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const pic = (key) => `<img alt="" src="assets/sceaux/rival-${key}.webp">`;
const HOW = [['cards', '#7FA8D8', 'La donne', '42 cartes, 6 par faction. Chacun reçoit 14 cartes. Seule la faction compte.'],
  ['eye', '#E8C35A', 'Donner', 'À ton tour, donne une carte face cachée à un courtisan en annonçant sa faction. Tu peux dire vrai… ou mentir.'],
  ['rule', '#B48CFF', 'Vrai ou Mensonge', 'Celui qui reçoit la carte répond. S’il a raison, celui qui l’a donnée la garde devant lui. S’il se trompe, il la garde lui-même.'],
  ['danger', '#FF5468', 'Perdre', 'Le premier qui a 4 cartes d’une même faction devant lui perd la partie. Celui qui doit jouer sans carte en main aussi. Si c’est un courtisan, tu gagnes.'],
  ['next', '#7FE0A0', 'Regarder et passer', 'Au lieu de répondre, tu peux regarder la carte et la passer à celui qui ne l’a pas encore vue, avec ta propre annonce. Le dernier doit répondre.'],
  ['crown', '#F2C14E', 'Qui joue ensuite', 'Celui qui garde la carte devant lui donne la suivante.'],
  ['seal', '#9FE0FF', 'Sceau de vérité', 'Une fois par partie, quand tu reçois une carte, tu peux la regarder avant de répondre.'],
  ['hourglass', '#C9A45A', 'Lire les masques', 'Chaque courtisan a ses habitudes : certains mentent peu, d’autres presque toujours, et certains ont un petit tic quand ils mentent. Les compteurs « mensonges » se remplissent à chaque carte retournée.']];
const howLi = ([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic === 'eye' ? 'ui-eye' : ic === 'next' ? 'ui-next' : ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`;
const howHTML = () => `<ol class="how-steps">${HOW.slice(0, 4).map(howLi).join('')}</ol><details class="how-more"><summary>Pour aller plus loin (${HOW.length - 4})</summary><ol class="how-steps" start="5">${HOW.slice(4).map((x, i) => howLi(x, i + 4)).join('')}</ol></details>`;
const SAY = ['« Un {f}. »', '« C’est un {f}, je te le jure. »', '« {f}. Tu me crois ? »', '« Tiens : un {f}. »', '« Un {f}… évidemment. »'];

export default function masquesScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.masques ||= { f: null, to: null, claim: null, pclaim: null });
  let busy = false, timer = 0, gone = false, banner = null;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 120) : ms); });
  const fname = (f) => cat.faction[f]?.name || f;
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const who = (st, x) => (x === 'p' ? { name: 'Toi', key: null } : { ...MQ.COURTIERS[st.seats[x]], key: st.seats[x] });
  // ton portrait : la carte choisie comme avatar, sinon l'emblème du jeu
  const me = () => { const c = g.s.avatar && cat.get(g.s.avatar); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  const reset = () => Object.assign(ui, { f: null, to: null, claim: null, pclaim: null });

  // ——— Accueil ———
  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.masquesOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-masques mq-hero"><h1>La Cour des Masques</h1><p class="muted">Un jeu de bluff à trois.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellée</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Cour des Masques.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const mq = g.s.masques, dailyDone = mq.dailyDone === todayKey(), d = g.masquesDaily(), DT = MQ.TABLE[d.table];
    const tables = MQ.TABLES.map((t, i) => {
      const open = MQ.tableUnlocked(g.s, i), won = mq.beaten[t.key], [A, B] = t.seats.map((k) => MQ.COURTIERS[k]);
      return [open, `<button class="sc-rival mq-tbl ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-mq="play" data-t="${t.key}" ${open ? '' : 'disabled'} style="background-image:linear-gradient(90deg, rgba(12, 13, 20, .97) 42%, rgba(12, 13, 20, .45) 76%, rgba(12, 13, 20, .15)), url(assets/sceaux/${t.room}.webp)">
        <span class="mq-pors"><span class="sc-por">${pic(t.seats[0])}</span><span class="sc-por">${pic(t.seats[1])}</span></span>
        <span class="sc-ri"><b>${esc(t.name)}</b><span class="small">${esc(A.name)} et ${esc(B.name)} · ${stars(t.stars)}</span>
        <span class="small muted">${open ? `+${t.reward} éclats${won ? '' : ` · 1re victoire : +${MQ.MASQUES_REWARD.firstWin} et ${esc(CHEST_NAME[t.chest].toLowerCase())}`}` : `Gagne à ${esc(MQ.TABLES[i - 1].name)} pour t’y asseoir`}</span></span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`];
    });
    const o = tables.filter((x) => x[0]).map((x) => x[1]).join(''), l = tables.filter((x) => !x[0]);
    root.innerHTML = `<header class="screen-head ui-hero bn-masques mq-hero"><h1>La Cour des Masques</h1><p class="muted">Donne, annonce, bluffe. Celui qui garde 4 cartes d’une même faction perd.</p>
        <span class="sc-rec">${mq.wins} victoire${mq.wins > 1 ? 's' : ''} · ${mq.losses} défaite${mq.losses > 1 ? 's' : ''}</span></header>
      ${g.masquesDailyOpen() ? `<button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-mq="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(DT.name)} · la même donne pour tous</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `Victoire : +${MQ.MASQUES_REWARD.daily} éclats et un coffre de bois`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>` : ''}
      <h2 class="section-title">Les tables</h2>
      <div class="sc-rivals">${o}</div>
      ${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Tables à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}
      <details class="panel dc-fold mq-court"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/avatar.webp"><span class="dc-sum-t">Les courtisans</span></summary>
        <ul class="mq-clist">${MQ.TABLES.filter((_, i) => MQ.tableUnlocked(g.s, i)).flatMap((t) => t.seats).map((k) => { const C = MQ.COURTIERS[k]; return `<li><span class="sc-por">${pic(k)}</span><span><b>${esc(C.name)}</b><span class="small muted">${esc(C.hint)}</span></span></li>`; }).join('')}</ul></details>
      <p class="small muted center">Récompenses : ${MQ.MASQUES_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, MQ.MASQUES_REWARD.dailyPaid - (mq.day === todayKey() ? mq.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>${howHTML()}</details>`;
    tuto(app, 'masques');
  }

  // ——— Partie ———
  function scene(t) {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene mq-scene';
    el.style.backgroundImage = 'url(assets/sceaux/salle-masques.webp)'; /* v426 : salle de la Cour (Gemini) */
  }
  // Cartes posées devant un joueur : une pastille par faction (rouge à 3, il n'en faut plus qu'une)
  const frontHTML = (st, x) => {
    const c = MQ.frontCounts(st, x), fs = MQ.FACTIONS.filter((f) => c[f]);
    return fs.length ? fs.map((f) => `<span class="mq-fc n${c[f]}" title="${esc(fname(f))} : ${c[f]}">${sigil(f)}<b>${c[f]}</b></span>`).join('') : '<span class="mq-none">aucune carte</span>';
  };
  const seat = (st, x) => {
    const W = who(st, x), cl = st.claims[x], act = (st.pending ? st.pending.to === x : st.turn === x) && !st.over;
    return `<div class="mq-seat s-${x} ${act ? 'on' : ''} ${MQ.danger(st, x) >= MQ.LOSE_AT - 1 ? 'hot' : ''}" data-seat="${x}">
      <span class="mq-top">${x === 'p' ? `<span class="sc-med mq-me">${me()}</span>` : `<span class="sc-med">${pic(W.key)}</span>`}<span class="mq-nm"><b>${esc(W.name)}</b><small>${icon('p:cards')}${st.hands[x].length} en main${cl.n ? ` · ${cl.lies}/${cl.n} mensonge${cl.lies > 1 ? 's' : ''}` : ''}</small></span></span>
      <span class="mq-front">${frontHTML(st, x)}</span></div>`;
  };
  function card(st) {
    const p = st.pending; if (!p) return '';
    const F = who(st, p.from), T = who(st, p.to), C = p.from === 'p' ? null : MQ.COURTIERS[st.seats[p.from]];
    const line = SAY[(st.rounds + p.chain.length) % SAY.length].replace('{f}', esc(fname(p.claim)));
    const seen = p.peeked || p.looked === 'p' || p.seen.includes('p') ? st.deck[p.card] : null;
    return `<div class="mq-pend"><span class="mq-cd ${seen ? 'seen' : ''}">${seen ? `<img alt="" src="${artUrl(cat.get(seen.id), { lite: true })}"><span class="mq-cf">${sigil(seen.f)}${esc(fname(seen.f))}</span>` : '<img alt="" src="assets/sceaux/dos.webp">'}</span>
      <span class="mq-say"><small>${esc(F.name)} → ${esc(p.to === 'p' ? 'toi' : T.name)}${p.chain.length > 1 ? ' (carte passée)' : ''}</small><b>${p.from === 'p' ? `« Un ${esc(fname(p.claim))}. »` : line}</b>${sigil(p.claim)}
      ${p.tell && C ? `<i class="mq-tell">${esc(C.name)} ${esc(C.tell.text)}…</i>` : ''}</span></div>`;
  }
  function controls(st) {
    if (st.over) return '';
    const p = st.pending;
    if (!busy && p && p.to === 'p') {
      const targets = MQ.passTargets(st), seen = p.peeked || p.seen.includes('p');
      if (p.looked === 'p') {
        const to = targets[0], f = st.deck[p.card].f;
        return `<div class="mq-ctl"><p class="mq-q">Tu as regardé : <b>${esc(fname(f))}</b>. Que dis-tu à ${esc(who(st, to).name)} ?</p>
          <div class="mq-claims">${MQ.FACTIONS.map((x) => `<button class="mq-cl ${ui.pclaim === x ? 'sel' : ''}" data-mq="pclaim" data-f="${x}">${sigil(x)}<span>${esc(fname(x))}</span>${x === f ? '<em>vrai</em>' : ''}</button>`).join('')}</div>
          <button class="btn primary block dc-plq dc-plq-red" data-mq="dopass" ${ui.pclaim ? '' : 'disabled'}>Passer à ${esc(who(st, to).name)}</button></div>`;
      }
      return `<div class="mq-ctl"><p class="mq-q">${seen ? `Tu sais que c’est un <b>${esc(fname(st.deck[p.card].f))}</b>. ` : ''}Annonce : <b>${esc(fname(p.claim))}</b>. Tu le crois ?</p>
        <div class="mq-ans"><button class="btn primary dc-plq dc-plq-red" data-mq="true">${icon('check')}Vrai</button><button class="btn dc-plq dc-plq-dark" data-mq="lie">${icon('close')}Mensonge</button></div>
        <div class="mq-alt">${targets.length && !seen ? `<button class="btn small" data-mq="pass">${icon('next')}Regarder et passer à ${esc(who(st, targets[0]).name)}</button>` : ''}
        ${!seen && st.seals.p > 0 ? `<button class="btn small mq-seal" data-mq="peek">${icon('p:seal')}Sceau de vérité (1)</button>` : ''}</div></div>`;
    }
    if (!busy && !p && st.turn === 'p') {
      const hc = MQ.handCounts(st, 'p');
      return `<div class="mq-ctl"><p class="mq-q">À toi de donner une carte.</p>
        <span class="mq-lb">1. Ta carte</span><div class="mq-hand">${MQ.FACTIONS.map((f) => `<button class="mq-hf ${ui.f === f ? 'sel' : ''}" data-mq="f" data-f="${f}" ${hc[f] ? '' : 'disabled'}>${sigil(f)}<b>${hc[f]}</b></button>`).join('')}</div>
        <span class="mq-lb">2. À qui</span><div class="mq-to">${['a', 'b'].map((x) => `<button class="mq-tob ${ui.to === x ? 'sel' : ''}" data-mq="to" data-x="${x}"><span class="sc-med">${pic(st.seats[x])}</span>${esc(who(st, x).name)}</button>`).join('')}</div>
        <span class="mq-lb">3. Ton annonce</span><div class="mq-claims">${MQ.FACTIONS.map((x) => `<button class="mq-cl ${ui.claim === x ? 'sel' : ''}" data-mq="claim" data-f="${x}">${sigil(x)}<span>${esc(fname(x))}</span>${x === ui.f ? '<em>vrai</em>' : ''}</button>`).join('')}</div>
        <button class="btn primary block dc-plq dc-plq-red" data-mq="give" ${ui.f && ui.to && ui.claim ? '' : 'disabled'}>${ui.f && ui.claim ? (ui.f === ui.claim ? 'Donner (vrai)' : 'Donner (mensonge)') : 'Donner'}</button></div>`;
    }
    const actor = p ? p.to : st.turn;
    if (actor === 'p') return '';
    return `<p class="mq-wait">${esc(who(st, actor).name)} réfléchit…</p>`;
  }
  function view() {
    const st = g.s.masques.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene(st.table);
    const T = MQ.TABLE[st.table];
    root.innerHTML = `<div class="mq-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-mq="rules" aria-label="Règles">${icon('p:help')}</button><b>${esc(T.name)}</b><button class="btn small ghost" data-mq="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      <div class="mq-seats">${seat(st, 'a')}${seat(st, 'b')}</div>
      ${banner || st.pending ? `<div class="mq-table">${banner ? `<div class="mq-banner ${banner.cls}">${banner.html}</div>` : card(st)}</div>` : ''}
      ${seat(st, 'p')}
      ${controls(st)}</div>`;
  }
  // Carte retournée : verdict, puis qui la garde
  async function reveal(st, ev) {
    const c = st.deck[ev.card], by = who(st, ev.to), tk = who(st, ev.taker);
    banner = { cls: ev.correct ? 'ok' : 'ko', html: `<span class="mq-cd flip"><img alt="" src="${artUrl(cat.get(c.id), { lite: true })}"><span class="mq-cf">${sigil(c.f)}${esc(fname(c.f))}</span></span>
      <span class="mq-vd"><small>${esc(by.name)} : « ${ev.sayTrue ? 'Vrai' : 'Mensonge'} ! »</small><b>${ev.truth ? 'C’était vrai' : 'C’était un mensonge'}</b><span>${ev.correct ? 'Bien vu' : 'Raté'} : ${ev.taker === 'p' ? 'tu la gardes' : `${esc(tk.name)} la garde`}.</span></span>` };
    view();
    (ev.taker === 'p' ? app.sfx.hit : app.sfx.capture)?.();
    await wait(1700);
    banner = null;
    if (gone) return;
    view();
    const el = root.querySelector(`.mq-seat[data-seat="${ev.taker}"]`);
    el?.classList.add('took'); setTimeout(() => el?.classList.remove('took'), 700);
  }
  // Les courtisans jouent jusqu'à ce que ce soit au joueur
  async function aiLoop() {
    if (busy) return;
    busy = true; view();
    for (;;) {
      const st = g.s.masques.cur;
      if (!st || gone || st.over) break;
      if (st.pending ? st.pending.to === 'p' : st.turn === 'p') break;
      await wait(st.pending ? 1100 : 800);
      if (gone) return;
      const r = g.masquesAi();
      if (!r) break;
      if (r.kind === 'answer') await reveal(st, r.ev);
      else { app.sfx.tap?.(); view(); await wait(r.to === 'p' ? 300 : 900); }
    }
    busy = false;
    if (gone) return;
    view();
    if (g.s.masques.cur?.over) { await wait(400); end(); }
  }
  function end() {
    const st = g.s.masques.cur;
    if (!st?.over) return;
    const out = g.masquesFinish();
    app.chrome?.();
    const won = st.over === 'won', L = who(st, st.loser), f = st.log.at(-1)?.f;
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    if (!won) document.body.classList.add('sc-lost');
    const why = st.why === 'empty' ? `${won ? `${esc(L.name)} n’a plus de carte` : 'Tu n’as plus de carte'} quand vient son tour.` : `${won ? esc(L.name) : 'Tu'} ${won ? 'garde' : 'gardes'} 4 cartes de la faction ${esc(fname(f))} devant ${won ? 'lui' : 'toi'}.`;
    const sayer = won ? L : who(st, st.log.at(-1)?.from === 'p' ? 'a' : st.log.at(-1)?.from || 'a');
    const el = document.createElement('div');
    el.className = `sc-end ${won ? 'won' : 'lost'}`;
    el.innerHTML = `${won && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${crestHTML(won, won ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-caps">${why}</p>
      ${sayer.key ? `<p class="sc-say">${pic(sayer.key)}<span>« ${esc(won ? sayer.beaten : sayer.gloat)} »</span></p>` : ''}
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.chests?.length ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} <b>${out.chests.map((c) => esc(CHEST_NAME[c])).join(' et ')}</b> gagné${out.chests.length > 1 ? 's' : ''} !</a>` : ''}
      ${out.xp && !out.capped ? `<p class="small muted center">+${out.xp} XP de profil</p>` : ''}
      ${out.capped ? `<p class="small muted">Tes ${MQ.MASQUES_REWARD.dailyPaid} victoires bien payées du jour sont faites : celle-ci rapporte ${MQ.MASQUES_REWARD.afterCap} éclats et ${MQ.MASQUES_REWARD.xp} XP.</p>` : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Rejouer</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove(); document.body.classList.remove('sc-lost');
      const table = st.table; g.masquesQuit();
      if (b.dataset.x === 'again') start({ table }); else lobby();
    });
  }
  function start(opts) {
    try { g.masquesStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    reset(); banner = null;
    const st = g.s.masques.cur, A = who(st, 'a');
    app.sfx.enter?.();
    banner = { cls: 'intro', html: `<span class="sc-med">${pic(A.key)}</span><span class="mq-vd"><small>${esc(A.name)}</small><b>« ${esc(A.hello)} »</b><span>${st.turn === 'p' ? 'Tu commences.' : `${esc(who(st, st.turn).name)} commence.`}</span></span>` };
    view();
    tuto(app, 'masques-play').then(() => wait(1200)).then(() => { banner = null; if (!gone) { view(); aiLoop(); } });
  }
  function rules() {
    openSheet(`<div class="sc-rules"><h2>La Cour des Masques</h2>${howHTML()}</div>`, { label: 'Règles de la Cour des Masques' });
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mq]');
    if (!b || b.disabled) return;
    const k = b.dataset.mq;
    if (k === 'play') return start({ table: b.dataset.t });
    if (k === 'daily') return start({ daily: true });
    if (k === 'rules') return rules();
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { const st = g.s.masques.cur; if (st && !st.over) { st.over = 'lost'; st.loser = 'p'; st.why = 'quit'; g.masquesFinish(); } g.masquesQuit(); lobby(); };
      if (!g.s.masques.cur?.over) { confirmBox('Quitter la partie ? Elle sera comptée comme une défaite.', { ok: 'Quitter', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.masques.cur;
    if (!st || st.over || busy) return;
    app.sfx.tap?.();
    if (k === 'f') { ui.f = b.dataset.f; if (!ui.claim) ui.claim = ui.f; return view(); }
    if (k === 'to') { ui.to = b.dataset.x; return view(); }
    if (k === 'claim') { ui.claim = b.dataset.f; return view(); }
    if (k === 'pclaim') { ui.pclaim = b.dataset.f; return view(); }
    try {
      if (k === 'give') {
        const c = st.hands.p.find((x) => st.deck[x].f === ui.f);
        g.masquesGive(c, ui.to, ui.claim); reset(); return aiLoop();
      }
      if (k === 'peek') { g.masquesPeek(); app.sfx.reveal?.('R'); return view(); }
      if (k === 'pass') { g.masquesLook(); ui.pclaim = null; app.sfx.flip?.(); return view(); }
      if (k === 'dopass') { g.masquesPass(MQ.passTargets(st)[0], ui.pclaim); reset(); return aiLoop(); }
      if (k === 'true' || k === 'lie') {
        const ev = g.masquesAnswer(k === 'true'); reset();
        busy = true; reveal(st, ev).then(() => { busy = false; if (gone) return; if (g.s.masques.cur?.over) end(); else aiLoop(); });
      }
    } catch (err) { toast(esc(err.message), { kind: 'error' }); }
  });

  const cur = g.s.masques.cur;
  if (cur && !cur.rewarded) { view(); if (cur.over) end(); else aiLoop(); }
  else { if (cur) g.masquesQuit(); lobby(); }
  return () => { gone = true; clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
