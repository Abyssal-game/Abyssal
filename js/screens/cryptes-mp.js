// v525 : Les Cryptes entre amis (« Contre un ami » dans l'accueil des Cryptes). Décision du propriétaire du 20 octobre 2026 :
// seulement entre amis (une capture d'écran suffirait à tricher contre un inconnu), sans récompense, avec un bilan de
// victoires et de défaites contre chaque ami. Le serveur tient la partie (cryptes_apply dans supabase/09-multijoueur.sql,
// même moteur que js/core/cryptes.js, sans règle de salle) et ne montre à chacun que les cartes retournées, prises ou
// révélées ; la carte regardée par le Regard infernal n'est montrée qu'à celui qui l'a regardée.
import * as CR from '../core/cryptes.js';
import { FACTION_ORDER } from '../config.js';
import * as cloud from '../cloud/cloud.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { t, tw } from '../i18n.js';
import { createMpLobby } from './mp-lobby.js';
import { howHTML, PW_LABEL, PW_MINE, PW_FOE, pwMed } from './cryptes.js';

const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };

export function createCryptesMp(app, root, { modeBar }) {
  const g = app.game, cat = app.catalog;
  let anim = false, timer = 0, banner = null, pop = null, popDone = null, last = null; /* v557 : dernier pouvoir en bandeau (plus de fenêtre qui coupe le rythme) */
  // affichage temporaire : cartes montrées (indice → carte), en lumière, échangées, choisies pour un pouvoir
  const ui = { face: new Map(), glow: new Set(), swap: new Set(), picks: [] };
  /* v527 : partie rapide : animations accélérées (presque sautées sous 15 s) pour ne pas manger ton temps ; réveil quand on quitte l'écran */
  let cur = null, wake = null;
  const STOP = { stop: true }; /* l'écran est quitté : l'animation en cours s'arrête là */
  const spd = () => { const v = cur?.v; if (v?.pace !== 'fast') return 1; return cur.ctx.myTurn(v) && cur.ctx.msLeft(v) < 15000 ? 0.15 : 0.5; };
  const wait = (ms) => (cur && !cur.ctx.alive ? Promise.reject(STOP) : new Promise((r, j) => { wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 200) : ms) * spd()); }));
  const popWait = (ms) => (cur && !cur.ctx.alive ? Promise.reject(STOP) : new Promise((r, j) => { popDone = r; wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 1600) : ms) * spd()); }));
  const fname = (f) => cat.faction[f]?.name || f;
  const foeOf = (v) => (v.me === 'a' ? 'b' : 'a');
  const myPic = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  // illustration d'une paire : une créature de sa faction (la même pour toute la partie)
  const artOf = (v, c) => {
    const pool = (cat.byFaction?.[c.f] || []).filter((x) => x.rarity !== 'S');
    return pool.length ? pool[hash(`${v.id}:${c.k}`) % pool.length] : null;
  };
  const face = (v, c) => { const card = artOf(v, c), fc = cat.faction[c.f]?.colors.secondary || '#C9A45A'; return `<img alt="" src="${card ? artUrl(card, { lite: true }) : 'assets/sceaux/dos.webp'}"><span class="cr-f" style="--fc:${fc}">${sigil(c.f)}</span>`; };
  const score = (s, x) => (s.pairs?.[x]?.length || 0) + (s.bonus?.[x] || 0);
  const fOfK = (s, k) => (s.cards || []).find((c) => c.k === k && c.f)?.f || (s.log || []).find((e) => e.k === k)?.f;

  function seat(v, s, x, ctx) {
    const mine = x === v.me, n = score(s, x);
    const tags = [s.grace?.[x] ? `<span class="pa-tag ok">${icon('shield')}Grâce : ${s.grace[x] > 1 ? `${s.grace[x]} erreurs pardonnées` : 'prochaine erreur pardonnée'}</span>` : '', s.block?.[x] ? '<span class="pa-tag bad">Prochain pouvoir bloqué</span>' : '', s.bonus?.[x] ? `<span class="pa-tag gold">+${s.bonus[x]} bonus</span>` : ''].join('');
    return `<div class="pa-seat cr-seat s-${mine ? 'p' : 'a'} ${s.turn === x && v.status === 'playing' ? 'on' : ''}">
      <span class="sc-med ${mine ? 'mq-me' : ''}">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span>
      <span class="pa-sc"><b>${mine ? 'Toi' : esc(ctx.foeName(v))}</b><span class="cr-won">${(s.pairs?.[x] || []).map((k) => { const f = fOfK(s, k); return f ? `<i style="--fc:${cat.faction[f].colors.secondary}">${sigil(f)}</i>` : ''; }).join('') || '<small class="muted">aucune paire</small>'}${tags}</span></span>
      <span class="pa-pts"><b>${n}</b><small>point${n > 1 ? 's' : ''}</small></span></div>`;
  }
  function grid(v, s, ctx) {
    const pick = s.pending && ctx.myTurn(v) && !anim;
    return `<div class="cr-grid ${pick ? 'picking' : ''}">${(s.cards || []).map((c, i) => {
      const shown = ui.face.get(i);
      if (c.gone && !shown) return `<span class="cr-c gone g-${c.gone === v.me ? 'p' : 'a'}"></span>`;
      const fc = shown || (c.k != null ? c : null);
      const cls = [fc ? 'up' : '', ui.glow.has(i) ? 'glow' : '', ui.picks.includes(i) ? 'pick' : '', ui.swap.has(i) ? 'swap' : ''].join(' ');
      return `<button class="cr-c ${cls}" data-mp="c" data-i="${i}" aria-label="${fc ? esc(fname(fc.f)) : `Carte ${i + 1}, face cachée`}">${fc ? face(v, fc) : '<img alt="" src="assets/jeux/cr-dos.webp">'}</button>`;
    }).join('')}</div>`;
  }
  function info(v, s, ctx) {
    if (banner) return `<div class="cr-msg ${banner.cls || ''}">${banner.html}</div>`;
    const left = (s.cards || []).filter((c) => !c.gone).length / 2;
    if (v.status !== 'playing') return '';
    if (last && !(s.pending && ctx.myTurn(v))) return `<div class="cr-msg cr-last ${last.cls}" style="--fc:${cat.faction[last.f]?.colors.secondary || '#C9A45A'}">${pwMed(last.f)}<span><b>${last.title}</b><span class="small">${last.text}</span></span></div>`;
    if (s.pending && ctx.myTurn(v)) { const P = CR.POWERS[s.pending.power]; return `<div class="cr-msg gold">${sigil(s.pending.power)}<span><b>${esc(P.name)}</b> · ${s.pending.power === 'abyssal' ? `touche deux cartes face cachée à échanger${ui.picks.length ? ' (encore une)' : ''}` : s.pending.power === 'infernal' ? 'touche une carte face cachée pour la regarder en secret' : 'touche une carte face cachée : elle sera montrée à tous'}.</span></div>`; }
    return `<div class="cr-msg">${ctx.myTurn(v) ? `<span>${(s.open || []).length ? 'Retourne une deuxième carte.' : 'À toi : retourne deux cartes.'}</span>` : `<span><span>${ctx.waitMsg(v)}</span></span>`}<span class="muted">${t(left > 1 ? '{n} paires à trouver' : '{n} paire à trouver', { n: left })}</span></div>`;
  }
  function popHTML(v, o) {
    const fc = cat.faction[o.f]?.colors.secondary || '#C9A45A';
    return `<div class="cr-pop ${o.cls || ''}" style="--fc:${fc}" role="dialog" aria-live="polite"><div class="cr-pop-in">
      ${o.cards ? `<span class="cr-pop-pair">${o.cards.map((c) => `<span class="cr-pop-c">${face(v, c)}</span>`).join('')}</span>` : ''}
      <span class="cr-pop-k">${o.kicker}</span><span class="cr-pop-h">${pwMed(o.f)}<b>${esc(o.title)}</b></span>
      <p class="cr-pop-t">${o.text}</p>${o.chips ? `<span class="cr-pop-chips">${o.chips.map((c) => `<span>${c}</span>`).join('')}</span>` : ''}
      <small class="cr-pop-tap">Touche pour continuer</small></div></div>`;
  }
  function drawGame(v, ctx) {
    if (!ctx.alive) return;
    cur = { v, ctx };
    if (!v.state?.pending) ui.picks = [];
    const s = v.state, foe = foeOf(v), over = v.status === 'done';
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene mq-scene'; sc.style.backgroundImage = 'url(assets/sceaux/salle-cryptes.webp)';
    const fin = s.final;
    root.innerHTML = `<div class="mq-game cr-game mp-cr ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><span class="cr-btns"><button class="btn small ghost" data-mp="rules" aria-label="Règles">${icon('p:help')}</button><button class="btn small ghost" data-mp="powers" aria-label="Pouvoirs des factions">${icon('p:power')}</button></span><b>Les Cryptes</b><button class="btn small ghost" data-mp="back" aria-label="Revenir à la liste">${icon('close')}</button></div>
      ${seat(v, s, foe, ctx)}
      ${info(v, s, ctx)}
      ${grid(v, s, ctx)}
      ${seat(v, s, v.me, ctx)}
      ${over ? ctx.endHTML(v, fin ? `${t('Score final : toi {a}, {name} {b}.', { a: fin[v.me], b: fin[foe], name: esc(ctx.foeName(v)) })}${fin.a === fin.b ? ` ${t('Égalité de points : la dernière paire décide.')}` : ''}` : '')
        : `${ctx.clockHTML(v)}<button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}Abandonner</button>`}
      ${pop ? popHTML(v, pop) : ''}</div>`;
  }
  // Annonce d'un pouvoir après une paire (pour toi comme pour ton ami)
  async function powerSay(v, ev, ctx) {
    const P = CR.POWERS[ev.power], mine = ev.who === v.me, nm = esc(ctx.foeName(v));
    const what = ev.blocked ? (mine ? 'Ton ami avait trouvé une paire <b>Artificielle</b> : son <b>Verrou</b> bloque ce pouvoir-ci.' : 'Ta paire <b>Artificielle</b> l’avait verrouillé : son pouvoir ne marche pas.')
      : ev.power === 'necrotique' ? (ev.stolen != null ? (mine ? t('Tu voles la dernière paire de {name} : elle passe de ton côté.', { name: nm }) : t('{name} te vole ta dernière paire.', { name: nm })) : 'Aucune paire à voler pour l’instant.')
      : ev.empty ? 'Plus assez de cartes cachées : rien ne se passe.'
      : (mine ? PW_MINE[ev.power] : t(PW_FOE[ev.power].replace(/\{nm\}/g, '{name}'), { name: nm }));
    last = { f: ev.power, cls: ev.blocked ? 'blocked' : mine ? 'mine' : 'foe', title: `${mine ? t('Toi') : nm} · ${esc(ev.blocked ? t('{p} bloqué', { p: tw(P.name) }) : tw(P.name))} <em>${t('+1 point')}</em>`, text: what };
    app.sfx[ev.blocked ? 'block' : 'cr-power']?.();
    drawGame(v, ctx); await wait(mine ? 500 : 1200);
  }
  // Rejoue un geste : carte retournée, paire, erreur, pouvoir
  async function show(v, ev, ctx) {
    const mine = ev.who === v.me, nm = esc(ctx.foeName(v));
    if (ev.kind === 'first') { last = null; ui.face.set(ev.i, ev.card); app.sfx['cr-flip']?.(); drawGame(v, ctx); await wait(mine ? 250 : 700); return; }
    if (ev.kind === 'match' || ev.kind === 'miss') {
      app.sfx['cr-flip']?.();
      ev.i.forEach((i, k) => ui.face.set(i, ev.kind === 'match' ? ev.card : ev.cards[k]));
      if (ev.kind === 'match') { ev.i.forEach((i) => ui.glow.add(i)); drawGame(v, ctx); app.sfx['cr-pair']?.(); await wait(800); ui.face.clear(); ui.glow.clear(); await powerSay(v, ev, ctx); return; }
      drawGame(v, ctx); await wait(1200); ui.face.clear(); app.sfx['cr-miss']?.();
      if (ev.graced) {
        last = { f: 'celeste', cls: mine ? 'mine' : 'foe', title: `${mine ? t('Toi') : nm} · ${tw('Grâce céleste')}`,
          text: mine ? 'Ta paire <b>Céleste</b> te protégeait : cette erreur est pardonnée, <b>tu gardes la main</b>.' : t('Sa paire <b>Céleste</b> le protégeait : {name} <b>garde la main</b>.', { name: nm }) };
        app.sfx.shield?.(); drawGame(v, ctx); await wait(mine ? 500 : 1000);
      }
      return;
    }
    if (ev.kind === 'power') {
      if (ev.power === 'abyssal') { ev.i.forEach((i) => ui.swap.add(i)); banner = { cls: '', html: `${sigil('abyssal')}<span><b>Remous abyssal</b><span class="small">${mine ? 'Les deux cartes ont échangé leur place.' : t('{name} a échangé ces deux cartes de place.', { name: nm })}</span></span>` }; app.sfx.swipe?.(); }
      else if (ev.card) { ui.face.set(ev.i[0], ev.card); ui.glow.add(ev.i[0]); banner = { cls: 'gold', html: `${sigil(ev.power)}<span><b>${esc(CR.POWERS[ev.power].name)}</b><span class="small">${ev.power === 'infernal' ? 'Toi seul vois cette carte : retiens-la !' : mine ? 'Tout le monde voit cette carte.' : t('{name} montre cette carte à tout le monde.', { name: nm })}</span></span>` }; app.sfx['cr-flip']?.(); }
      else { ui.glow.add(ev.i[0]); banner = { cls: '', html: `${sigil('infernal')}<span><b>Regard infernal</b><span class="small">${t('{name} regarde cette carte en secret.', { name: nm })}</span></span>` }; }
      drawGame(v, ctx); await wait(ev.card && ev.power === 'infernal' ? 2000 : 1500);
      ui.face.clear(); ui.glow.clear(); ui.swap.clear(); banner = null;
    }
  }
  async function act(ctx, move) {
    if (anim || ctx.busy) return;
    const prev = ctx.view;
    const v = await ctx.act(() => cloud.mpAct(ctx.ui.open, move));
    ui.picks = []; /* v527 : vidé aussi après un échec (sinon un 3e choix était refusé sans fin) */
    if (!v) return ctx.draw();
    const evs = (v.state?.log || []).filter((e) => e.n > (prev.state?.n || 0));
    anim = true;
    try { for (const ev of evs) await show(v, ev, ctx); } catch (e) { if (e !== STOP) throw e; } finally { anim = false; ui.face.clear(); }
    ctx.draw(); ctx.watch();
  }
  const powersHTML = () => `<ul class="cr-plist">${FACTION_ORDER.map((f) => `<li style="--fc:${cat.faction[f].colors.secondary}">${sigil(f)}<span><b>${esc(fname(f))} · ${esc(CR.POWERS[f].name)}</b><span class="small muted">${esc(CR.POWERS[f].short)}</span></span></li>`).join('')}</ul>`;

  root.addEventListener('click', (e) => { if (pop && popDone) { const r = popDone; popDone = null; clearTimeout(timer); r(); e.stopPropagation(); } }, true); /* un toucher ferme la fenêtre du pouvoir */

  return createMpLobby(app, root, {
    onStop: () => { clearTimeout(timer); const w = wake; wake = null; w?.(STOP); },
    game: 'cryptes', modeBar, friendsOnly: true,
    note: 'Défie un ami. Chaque fois que c’est à toi, tu as un temps limité pour retourner tes cartes : passé ce délai, <b>la partie est perdue</b>.',
    create: (pace, to) => cloud.mpNew('cryptes', to, pace),
    join: (id) => cloud.mpJoin(id),
    sub: (v) => (v.state?.pairs ? `${score(v.state, v.me)} – ${score(v.state, foeOf(v))} points` : ''),
    score: (v) => (v.state?.final ? `${v.state.final[v.me]} – ${v.state.final[foeOf(v)]}` : ''),
    moveKey: (v) => `${v.status}:${v.state?.n || 0}`,
    drawGame: (v, ctx) => drawGame(v, ctx),
    // ton ami a joué : ses gestes sont rejoués un à un
    updated: async (prev, v, ctx) => {
      const evs = (v.state?.log || []).filter((e) => e.n > (prev.state?.n || 0) && e.who !== v.me);
      if (!evs.length) return;
      anim = true;
      try { for (const ev of evs) await show(v, ev, ctx); } catch (e) { if (e !== STOP) throw e; } finally { anim = false; ui.face.clear(); }
    },
    click: (k, b, ctx) => {
      if (k === 'rules') return openSheet(`<div class="sc-rules"><h2>Les Cryptes</h2>${howHTML()}</div>`, { label: 'Règles des Cryptes' });
      if (k === 'powers') return openSheet(`<div class="sc-rules"><h2>Pouvoirs des factions</h2><p class="small muted">Chaque paire déclenche le pouvoir de sa faction.</p>${powersHTML()}</div>`, { label: 'Pouvoirs des factions' });
      const v = ctx.view;
      if (k !== 'c' || !v || !ctx.myTurn(v) || ctx.busy || anim) return;
      const i = Number(b.dataset.i), c = v.state.cards[i];
      if (!c || c.gone || c.k != null) return;
      if (v.state.pending) {
        if (ui.picks.includes(i)) return;
        ui.picks.push(i); app.sfx.tap?.();
        if (ui.picks.length < v.state.pending.pick) return ctx.draw();
        return act(ctx, { picks: ui.picks.slice() });
      }
      return act(ctx, { flip: i });
    },
  });
}
