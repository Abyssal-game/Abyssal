// v525 : Les Enchères de Mammon contre un autre joueur (« Contre un joueur » dans l'accueil des Enchères).
// Le serveur tient la vente (encheres_apply dans supabase/09-multijoueur.sql, mêmes règles que js/core/encheres.js, à deux) :
// il tire les 15 lots dans un ordre caché, garde secrète l'offrande de chacun jusqu'à ce que les deux aient misé, puis
// révèle : deux offrandes égales s'annulent (le lot reste sur la table), sinon la plus haute prend une créature et la plus
// basse une malédiction. Les deux misent en même temps ; chacun a son délai (30 s en rapide, 12 h en lente).
import * as EN from '../core/encheres.js';
import * as cloud from '../cloud/cloud.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { t, tw } from '../i18n.js';
import { createMpLobby } from './mp-lobby.js';
import { howHTML } from './encheres.js';

const RAR_OF = (v) => (v <= 2 ? 'C' : v <= 4 ? 'PC' : v <= 6 ? 'R' : v <= 8 ? 'HR' : v === 9 ? 'M' : 'S');
const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };

export function createEncheresMp(app, root, { modeBar }) {
  const g = app.game, cat = app.catalog;
  let sel = null, banner = null, anim = false, timer = 0, shownLot = null;
  /* v527 : partie rapide : animations accélérées (presque sautées sous 15 s) pour ne pas manger ton temps ; réveil quand on quitte l'écran */
  let cur = null, wake = null;
  const STOP = { stop: true }; /* l'écran est quitté : l'animation en cours s'arrête là */
  const spd = () => { const v = cur?.v; if (v?.pace !== 'fast') return 1; return cur.ctx.myTurn(v) && cur.ctx.msLeft(v) < 15000 ? 0.15 : 0.5; };
  const wait = (ms) => (cur && !cur.ctx.alive ? Promise.reject(STOP) : new Promise((r, j) => { wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 150) : ms) * spd()); }));
  const fname = (f) => tw(cat.faction[f]?.name || f); /* nom de faction traduit (les blocs contiennent un pseudo ou un nombre) */
  const foeOf = (v) => (v.me === 'a' ? 'b' : 'a');
  const myPic = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  // illustration d'un lot : une créature de sa faction, à la rareté de sa valeur (la même pour toute la vente)
  const artOf = (v, l) => {
    const pool = cat.byFaction?.[l.f] || [], fit = pool.filter((x) => x.rarity === RAR_OF(l.v)), list = fit.length ? fit : pool;
    return list.length ? list[hash(`${v.id}:${l.f}:${l.v}`) % list.length] : null;
  };
  const lotCard = (v, l, cls = '') => (l.v > 0
    ? `<span class="en-lot ${cls}"><img alt="" src="${artOf(v, l) ? artUrl(artOf(v, l), { lite: true }) : 'assets/sceaux/dos.webp'}"><b class="en-v">+${l.v}</b><span class="mq-cf">${sigil(l.f)}${esc(fname(l.f))}</span></span>`
    : `<span class="en-lot curse ${cls}"><img alt="" src="assets/jeux/en-malediction.webp"><b class="en-v">${l.v}</b><span class="mq-cf">Malédiction</span></span>`);
  const scoreOf = (s, x) => EN.scoreOf({ won: s.won, setBonus: s.setBonus || EN.SET_BONUS }, x);
  const wonHTML = (s, x) => {
    const n = {}; let curse = 0;
    (s.won?.[x] || []).forEach((l) => { if (l.f) n[l.f] = (n[l.f] || 0) + 1; else curse += l.v; });
    const chips = Object.entries(n).map(([f, k]) => `<span class="mq-fc en-fc ${k >= 3 ? 'set' : k === 2 ? 'n2' : ''}">${sigil(f)}<b>${k}</b></span>`).join('');
    return chips + (curse ? `<span class="mq-fc en-curse"><img alt="" src="assets/icons/danger.webp"><b>${curse}</b></span>` : '') || '<span class="mq-none">aucun lot</span>';
  };
  const offersHTML = (s, x) => `<span class="en-offs">${Array.from({ length: EN.OFFERS }, (_, k) => `<i class="${(s.offers?.[x] || []).includes(k + 1) ? '' : 'used'}">${k + 1}</i>`).join('')}</span>`;
  // les deux fauteuils de la salle peinte : l'adversaire à gauche, toi à droite
  const chair = (v, s, x, ctx) => {
    const mine = x === v.me, sc = scoreOf(s, x), bid = s.bids?.[x];
    const tag = v.status !== 'playing' || banner ? '' : mine ? (bid ? `<span class="pa-tag gold">${t('Offrande : {n}', { n: bid })}</span>` : '') : bid ? '<span class="pa-tag ok">A misé</span>' : '<span class="pa-tag">Réfléchit…</span>';
    return `<div class="en-chair c-${mine ? 'b' : 'a'}" data-seat="${x}"><span class="sc-med ${mine ? 'mq-me' : ''}">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span><b>${ctx.plate(v, mine, mine ? 'Toi' : esc(ctx.foeName(v)))}</b>
      <small>${sc.total} pt${Math.abs(sc.total) > 1 ? 's' : ''}${sc.sets ? ` · ${sc.sets} fam.` : ''}</small>${tag}<span class="mq-front">${wonHTML(s, x)}</span>${offersHTML(s, x)}</div>`;
  };
  function stage(v, ctx) {
    const s = v.state, lot = banner?.lot || s.lot, foe = foeOf(v);
    const pv = [...(s.pot || []), lot].filter(Boolean).reduce((a, l) => a + l.v, 0);
    const key = banner ? `b${s.i - 1}` : `l${s.i}`, fresh = shownLot !== key; shownLot = key;
    const ban = banner ? `<div class="en-ban">${banner.gavel ? '<img class="en-gavel" alt="" src="assets/jeux/en-marteau.webp">' : ''}<div class="mq-banner ${banner.cls}">${banner.html}</div></div>` : '';
    return `<div class="en-stage">${chair(v, s, foe, ctx)}${chair(v, s, v.me, ctx)}
      ${lot ? `<div class="en-onlot ${fresh ? 'fresh' : ''}">${lotCard(v, lot)}</div>
      ${banner ? '' : `<div class="en-plaque"><small>Lot ${s.i + 1} / ${s.total || 15}</small><b>${lot.v > 0 ? `${esc(fname(lot.f))} · ${lot.v} pt${lot.v > 1 ? 's' : ''}` : `Malédiction · ${lot.v}`}</b>
        ${s.pot?.length ? `<span class="en-pot">+ ${s.pot.length} lot${s.pot.length > 1 ? 's' : ''} resté${s.pot.length > 1 ? 's' : ''} : en jeu ${pv > 0 ? '+' : ''}${pv}</span>` : ''}
        <span>${pv > 0 ? 'La <b>plus haute</b> offrande seule l’emporte' : 'La <b>plus basse</b> offrande seule l’hérite !'}</span></div>`}` : ''}${ban}</div>`;
  }
  function drawGame(v, ctx) {
    if (!ctx.alive) return;
    cur = { v, ctx };
    const s = v.state, me = v.me, foe = foeOf(v);
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene mq-scene'; sc.style.backgroundImage = 'url(assets/sceaux/salle-encheres.webp)';
    const over = v.status === 'done', mine = s.bids?.[me];
    const can = !over && !mine && ctx.myTurn(v) && !ctx.busy && !anim && !banner;
    if (sel && !(s.offers?.[me] || []).includes(sel)) sel = null;
    const fin = s.final;
    const msg = over || banner ? '' : mine ? t('Ton offrande ({n}) est posée. En attente de <b>{name}</b>…', { n: mine, name: esc(ctx.foeName(v)) }) : s.bids?.[foe] ? t('<b>{name}</b> a déjà misé : à toi !', { name: esc(ctx.foeName(v)) }) : 'Choisis ton offrande, en secret.';
    root.innerHTML = `<div class="mq-game en-game mp-en ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-mp="rules" aria-label="Règles">${icon('p:help')}</button><b>Les Enchères · en ligne</b><button class="btn small ghost" data-mp="back" aria-label="Revenir à la liste">${icon('close')}</button></div>
      ${stage(v, ctx)}
      ${over ? ctx.endHTML(v, fin ? t('Score final : toi {a}, {name} {b}.', { a: fin[me], b: fin[foe], name: esc(ctx.foeName(v)) }) : '')
        : `${ctx.clockHTML(v)}${msg ? `<p class="sc-msg">${msg}</p>` : ''}
        ${can ? `<div class="mq-ctl en-ctl">
          <div class="en-grid">${Array.from({ length: EN.OFFERS }, (_, k) => k + 1).map((n) => `<button class="en-ob ${sel === n ? 'sel' : ''}" data-mp="o" data-n="${n}" ${(s.offers?.[me] || []).includes(n) ? '' : 'disabled'} aria-label="Offrande ${n}">${n}</button>`).join('')}</div>
          <button class="btn primary block dc-plq dc-plq-red" data-mp="bid" ${sel ? '' : 'disabled'}>${sel ? `Offrir ${sel}` : 'Choisis une offrande'}</button></div>` : ''}
        <button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}Abandonner</button>`}
    </div>`;
  }
  // Révélation d'une manche : les deux offrandes, annulées ou non, puis le lot adjugé (ou resté sur la table)
  async function reveal(v, ev, ctx) {
    const me = v.me, foe = foeOf(v), tk = ev.taker;
    const offer = (x) => `<span class="en-rv ${ev.cancelled ? 'off' : ''} ${tk === x ? 'win' : ''}"><span class="sc-med">${x === me ? myPic() : ctx.avatar(v.foe?.avatar)}</span><b>${ev.bids[x]}</b><small>${x === me ? 'Toi' : esc(ctx.foeName(v))}</small></span>`;
    const n = ev.pile.length;
    banner = { cls: tk === me ? (ev.value > 0 ? 'ok' : 'ko') : tk ? (ev.value > 0 ? 'ko' : 'ok') : '', gavel: !!tk && !app.reduced(), lot: ev.lot, html: `<span class="en-rvrow">${[foe, me].map(offer).join('')}</span>
      <span class="mq-vd">${ev.cancelled ? '<small>Les deux offrandes s’annulent</small>' : ''}
      <b>${tk ? (tk === me ? (n > 1 ? t('Tu remportes {n} lots', { n }) : ev.value > 0 ? 'Tu remportes le lot' : 'Tu hérites de la malédiction') : (n > 1 ? t('{name} remporte {n} lots', { name: esc(ctx.foeName(v)), n }) : ev.value > 0 ? t('{name} remporte le lot', { name: esc(ctx.foeName(v)) }) : t('{name} hérite de la malédiction', { name: esc(ctx.foeName(v)) }))) : 'Le lot reste sur la table'}</b>
      <span>${tk ? `${ev.value > 0 ? '+' : ''}${ev.value} point${Math.abs(ev.value) > 1 ? 's' : ''}` : 'Il s’ajoute au lot suivant.'}</span></span>` };
    drawGame(v, ctx);
    if (ev.cancelled) setTimeout(() => app.sfx.cancel?.(), 350);
    if (tk) setTimeout(() => app.sfx.gavel?.(), ev.cancelled ? 800 : 350);
    await wait(2200);
    banner = null;
  }
  async function bid(ctx) {
    if (!sel || anim || ctx.busy) return;
    const prev = ctx.view, n = sel;
    app.sfx['en-coin']?.();
    const v = await ctx.act(() => cloud.mpAct(ctx.ui.open, { offer: n }));
    if (!v) return;
    sel = null;
    const ev = v.state?.last;
    if (ev && ev.n > (prev.state?.n || 0)) { anim = true; try { await reveal(v, ev, ctx); } catch (e) { if (e !== STOP) throw e; } finally { anim = false; } }
    ctx.draw(); ctx.watch();
  }

  return createMpLobby(app, root, {
    onStop: () => { clearTimeout(timer); const w = wake; wake = null; w?.(STOP); },
    game: 'encheres', modeBar,
    note: 'Choisis ta vitesse. À chaque lot, vous misez en même temps et en secret ; si tu ne poses pas ton offrande à temps, <b>la vente est perdue</b>.',
    create: (pace, to) => cloud.mpNew('encheres', to, pace),
    join: (id) => cloud.mpJoin(id),
    sub: (v) => (v.state?.won ? `${scoreOf(v.state, v.me).total} – ${scoreOf(v.state, foeOf(v)).total} points` : ''),
    score: (v) => (v.state?.final ? `${v.state.final[v.me]} – ${v.state.final[foeOf(v)]}` : ''),
    moveKey: (v) => `${v.status}:${v.state?.n || 0}:${v.turn}`,
    drawGame: (v, ctx) => drawGame(v, ctx),
    // l'adversaire a misé (ou la manche est révélée) : on montre la révélation
    updated: async (prev, v, ctx) => {
      const ev = v.state?.last;
      if (!ev || ev.n <= (prev.state?.n || 0)) return;
      anim = true;
      try { await reveal(v, ev, ctx); } catch (e) { if (e !== STOP) throw e; } finally { anim = false; }
    },
    click: (k, b, ctx) => {
      if (k === 'rules') return openSheet(`<div class="sc-rules"><h2>Les Enchères de Mammon</h2>${howHTML()}</div>`, { label: 'Règles des Enchères' });
      const v = ctx.view;
      if (!v || !ctx.myTurn(v) || ctx.busy || anim) return;
      if (k === 'o') { sel = Number(b.dataset.n); app.sfx.tap?.(); return ctx.draw(); }
      if (k === 'bid') return bid(ctx);
    },
  });
}
