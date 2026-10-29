// v523 : Le Pacte contre d'autres joueurs (« Contre un joueur » dans l'accueil du Pacte).
// Le serveur tient la partie (pacte_apply dans supabase/09-multijoueur.sql, même moteur que js/core/pacte.js) : il mélange
// le paquet, tire les cartes et compte les points ; le paquet n'est jamais envoyé dans l'ordre (on peut compter ce qui
// reste, pas savoir ce qui vient). Premier à 60 points, tours égaux. Chaque action (tirer, s'arrêter) a son délai :
// 30 s en partie rapide, 12 h en partie lente ; passé ce délai, la partie est perdue.
import * as PA from '../core/pacte.js';
import * as cloud from '../cloud/cloud.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { t } from '../i18n.js';
import { createMpLobby } from './mp-lobby.js';
import { SP, howHTML, sayText, boardOf, sealsHTML, fitInfo } from './pacte.js';

const RAR_OF = (v) => (v <= 2 ? 'C' : v === 3 ? 'PC' : v === 4 ? 'R' : v === 5 ? 'HR' : v === 6 ? 'M' : 'S');
const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const SND = { bust: 'pa-bust', saved: 'pa-seal', forced: 'pa-guard', seven: 'pa-seven', stop: 'pa-bank' };

export function createPacteMp(app, root, { modeBar }) {
  const g = app.game, cat = app.catalog;
  let anim = false, banner = null, timer = 0;
  /* v527 : partie rapide : animations accélérées (presque sautées sous 15 s) pour ne pas manger ton temps ; réveil quand on quitte l'écran */
  let cur = null, wake = null;
  const STOP = { stop: true }; /* l'écran est quitté : l'animation en cours s'arrête là */
  const spd = () => { const v = cur?.v; if (v?.pace !== 'fast') return 1; return cur.ctx.myTurn(v) && cur.ctx.msLeft(v) < 15000 ? 0.15 : 0.5; };
  const wait = (ms) => (cur && !cur.ctx.alive ? Promise.reject(STOP) : new Promise((r, j) => { wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 150) : ms) * spd()); }));
  const fname = (f) => cat.faction[f]?.name || f;
  const myPic = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  // illustration d'une carte : une créature de sa faction, à la rareté de sa valeur (la même pour toute la partie)
  const artOf = (v, c) => {
    const pool = cat.byFaction?.[c.f] || [], fit = pool.filter((x) => x.rarity === RAR_OF(c.v)), list = fit.length ? fit : pool;
    return list.length ? list[hash(`${v.id}:${c.f}:${c.v}`) % list.length] : null;
  };
  const cardHTML = (v, c, cls = '') => {
    if (c.sp) return `<span class="pa-card sp sp-${c.sp} ${cls}"><img alt="" src="${SP[c.sp].img}"><span class="pa-cn">${SP[c.sp].name}</span></span>`;
    const card = artOf(v, c);
    return `<span class="pa-card f-${c.f} ${c.x2 ? 'x2' : ''} ${cls}" style="--fc:${cat.faction[c.f]?.colors.secondary || '#888'}"><img alt="" src="${card ? artUrl(card, { lite: true }) : 'assets/sceaux/dos.webp'}">
      <b class="pa-v">${c.v}${c.x2 ? '<small>×2</small>' : ''}</b><span class="pa-cf">${sigil(c.f)}</span></span>`;
  };
  const foeOf = (v) => (v.me === 'a' ? 'b' : 'a');
  // l'état du serveur dans le format du moteur du jeu (pour la valeur du tour et le risque)
  const eng = (s) => ({ row: s.row || [], deck: s.deck || [], discard: s.discard || [], offer: !!s.offer, sceaux: s.sceaux || 0 });

  function seat(v, s, x, ctx) {
    const sc = s.scores?.[x] || 0, mine = x === v.me, tg = s.target || PA.TARGET;
    return `<div class="pa-seat s-${mine ? 'p' : 'a'} ${s.turn === x && v.status === 'playing' ? 'on' : ''}">
      <span class="sc-med ${mine ? 'mq-me' : ''}">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span>
      <span class="pa-sc"><b>${ctx.plate(v, mine, mine ? 'Toi' : esc(ctx.foeName(v)))}</b><span class="pa-bar"><i style="width:${Math.min(100, (sc / tg) * 100)}%"></i></span></span>
      <span class="pa-pts"><b>${sc}</b><small>/ ${tg}</small></span></div>`;
  }
  function center(v, s, ctx) {
    const e = eng(s), val = PA.rowValue(e), risk = Math.round(PA.bustChance(e) * 100), fs = PA.rowFactions(e), nf = fs.size, mine = s.turn === v.me;
    const pb = boardOf(ctx.board(v, 'pb')) /* v904 : celui de l'adversaire pendant son tour */, seals = sealsHTML(pb, fs, cat, sigil);
    const ban = banner ? `<div class="pa-ban">${banner.bust ? '<img class="pa-burn" alt="" src="assets/jeux/pa-brisure.webp">' : ''}<div class="mq-banner ${banner.cls}">${banner.html}</div></div>` : '';
    return `<div class="pa-parch pp ${pb}">
      <div class="pa-row" style="--n:${Math.max(1, e.row.length)}">${e.row.length ? e.row.map((c) => cardHTML(v, c)).join('') : `<span class="pa-empty">${mine && v.status === 'playing' ? 'Tire ta première carte.' : '…'}</span>`}</div>
      ${seals}
      <div class="pa-info"><span>Ce tour : <b>${val}</b> point${val > 1 ? 's' : ''}</span><span class="pa-fac">${nf} / 7 sceaux</span>
        ${e.sceaux ? `<span class="pa-tag ok" data-n="×${e.sceaux}">${icon('shield')}<span class="pa-tl">Protégé ×${e.sceaux}</span></span>` : ''}${e.offer ? '<span class="pa-tag gold" data-n="×2" title="Offrande : la suivante ×2"><img alt="" src="assets/jeux/pa-offrande.webp"><span class="pa-tl">Offrande ×2</span></span>' : ''}
        <span class="pa-risk ${risk >= 40 ? 'hi' : risk >= 20 ? 'mid' : ''}">Risque : <b>${risk} %</b></span></div>${ban}</div>`;
  }
  function drawGame(v, ctx, _last, shown = null) {
    if (!ctx.alive) return;
    cur = { v, ctx };
    const s = shown || v.state, me = v.me, foe = foeOf(v);
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene mq-scene'; sc.style.backgroundImage = 'url(assets/sceaux/salle-pacte.webp)';
    const over = v.status === 'done', mt = ctx.myTurn(v) && !ctx.busy && !anim && !shown;
    const val = PA.rowValue(eng(s)), canStop = (s.row || []).some((c) => c.f);
    const msg = over || mt ? '' : shown ? '' : ctx.waitMsg(v);
    const fin = v.state.final;
    root.innerHTML = `<div class="mq-game pa-game mp-pa ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-mp="rules" aria-label="Règles">${icon('p:help')}</button><b>Le Pacte · contre un joueur</b><button class="btn small ghost" data-mp="back" aria-label="Revenir à la liste">${icon('close')}</button></div>
      ${seat(v, s, foe, ctx)}
      <div class="pa-deck"><span class="pa-pile"><img alt="" src="assets/sceaux/dos.webp"><b>${(s.deck || []).length}</b></span><span class="small muted">${over ? t('Tour {n}', { n: s.round || 1 }) : s.turn === me ? t('Tour {n} · à toi', { n: s.round || 1 }) : t('Tour {n} · à {name}', { n: s.round || 1, name: esc(ctx.foeName(v)) })}</span></div>
      <div class="mq-table pa-table">${center(v, s, ctx)}</div>
      ${seat(v, s, me, ctx)}
      ${over ? ctx.endHTML(v, fin ? t('Score final : toi {a}, {name} {b}.', { a: fin[me], b: fin[foe], name: esc(ctx.foeName(v)) }) : '')
        : `${ctx.clockHTML(v)}${msg ? `<p class="sc-msg">${msg}</p>` : ''}
        ${mt ? `<div class="mq-ctl pa-ctl"><button class="btn primary dc-plq dc-plq-red" data-mp="draw">${icon('cards')}Tirer une carte</button>
          <button class="btn dc-plq dc-plq-dark" data-mp="stop" ${canStop ? '' : 'disabled'}>${canStop ? `S’arrêter (+${val})` : 'S’arrêter'}</button></div>` : ''}
        <button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}Abandonner</button>`}
    </div>`;
    fitInfo(root);
  }

  // Annonce d'un événement (brisure, protection, arrêt…), comme contre l'Abysse
  async function say(v, ev, shown, ctx, ms = 1500) {
    const mine = ev.who === v.me, nm = mine ? 'Tu' : esc(ctx.foeName(v));
    const fn = ev.card?.f ? fname(ev.card.f) : '';
    const H = sayText(ev, { mine, nm, fn, seven: v.state.seven || PA.SEVEN_BONUS });
    if (!H) return;
    app.sfx[SND[ev.result]]?.();
    banner = { cls: H[0], bust: ev.result === 'bust' && !app.reduced(), html: `${ev.card ? cardHTML(v, ev.card, 'big') : `<span class="sc-med">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span>`}<span class="mq-vd"><b>${H[1]}</b><span>${H[2]}</span></span>` };
    drawGame(v, ctx, null, shown); await wait(ms); banner = null;
  }
  // Rejoue une suite d'événements carte par carte, à partir de l'état d'avant (row, sceaux, offer, scores)
  async function replay(v, evs, from, ctx) {
    const shown = { ...v.state, row: (from.row || []).slice(), sceaux: from.sceaux || 0, offer: !!from.offer, scores: { ...from.scores }, deck: from.deck || v.state.deck, round: from.round, turn: evs[0]?.who || from.turn };
    for (const ev of evs) {
      if (!root.isConnected) return;
      shown.turn = ev.who;
      if (ev.card) app.sfx[ev.card.sp === 'offrande' ? 'pa-offer' : 'pa-draw']?.();
      if (ev.card && shown.deck.length) shown.deck = shown.deck.slice(1);
      if (ev.result === 'ok') {
        if (ev.card.sp === 'sceau') shown.sceaux++;
        if (ev.card.sp === 'offrande') shown.offer = true;
        if (ev.card.f) { shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card); shown.offer = false; } else shown.row.push(ev.card);
        drawGame(v, ctx, null, shown); await wait(650); continue;
      }
      if (ev.result === 'saved') {
        const i = shown.row.findIndex((c) => c.sp === 'sceau'); if (i >= 0) shown.row.splice(i, 1);
        shown.sceaux = Math.max(0, shown.sceaux - 1); shown.offer = false;
        await say(v, ev, shown, ctx, 1300); drawGame(v, ctx, null, shown); await wait(350); continue;
      }
      if (ev.card) { shown.row.push(ev.x2 ? { ...ev.card, x2: true } : ev.card); drawGame(v, ctx, null, shown); await wait(450); }
      if (ev.gain) shown.scores[ev.who] = (shown.scores[ev.who] || 0) + ev.gain;
      await say(v, ev, shown, ctx, 1500);
      shown.row = []; shown.sceaux = 0; shown.offer = false;
    }
  }
  async function act(ctx, action) {
    if (anim || ctx.busy) return;
    const prev = ctx.view;
    const v = await ctx.act(() => cloud.pacteMpAct(ctx.ui.open, action));
    if (!v) return;
    const ev = v.state?.last;
    anim = true;
    try {
      if (ev?.result === 'ok') { app.sfx[ev.card?.sp === 'offrande' ? 'pa-offer' : 'pa-draw']?.(); }
      else if (ev) await replay(v, [ev], prev.state, ctx);
    } catch (e) { if (e !== STOP) throw e; } finally { anim = false; }
    ctx.draw();
    ctx.watch();
  }

  return createMpLobby(app, root, {
    onStop: () => { clearTimeout(timer); const w = wake; wake = null; w?.(STOP); },
    game: 'pacte', modeBar,
    note: `Choisis ta vitesse. Premier à ${PA.TARGET} points. Chaque fois que c’est à toi (tirer ou t’arrêter), tu as un temps limité : passé ce délai, <b>la partie est perdue</b>.`,
    create: (pace, to) => cloud.pacteMpNew(to, pace),
    join: (id) => cloud.pacteMpJoin(id),
    sub: (v) => (v.state?.scores ? `${v.state.scores[v.me]} – ${v.state.scores[foeOf(v)]} points` : ''),
    score: (v) => (v.state?.final ? `${v.state.final[v.me]} – ${v.state.final[foeOf(v)]}` : ''),
    moveKey: (v) => `${v.status}:${v.state?.n || 0}`,
    drawGame: (v, ctx, last) => drawGame(v, ctx, last),
    // l'adversaire a joué : ses cartes sont rejouées une à une
    updated: async (prev, v, ctx) => {
      const seen = prev.state?.n || 0;
      const evs = (v.state?.log || []).filter((e) => e.n > seen && e.who !== v.me);
      if (!evs.length || evs[0].n !== seen + 1) return;
      anim = true;
      try { await replay(v, evs, prev.state, ctx); } catch (e) { if (e !== STOP) throw e; } finally { anim = false; }
    },
    click: (k, b, ctx) => {
      if (k === 'rules') return openSheet(`<div class="sc-rules"><h2>Le Pacte</h2>${howHTML()}</div>`, { label: 'Règles du Pacte' });
      const v = ctx.view;
      if (!v || !ctx.myTurn(v) || ctx.busy || anim) return;
      if (k === 'draw' || k === 'stop') return act(ctx, k);
    },
  });
}
