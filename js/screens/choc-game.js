// v811 : une partie du nouveau Choc des Boosters (règles dans js/core/choc.js, partie tenue par le serveur : choc_apply dans
// supabase/09-multijoueur.sql). Les deux joueurs ouvrent leurs 2 boosters en même temps (les sachets s'entrechoquent puis se
// déchirent), jouent 3 manches en posant chacun une carte en secret, un 3e booster arrive après la 2e manche (le Renfort), puis
// chacun choisit ce qu'il garde. Le même écran sert à l'entraînement contre l'Abysse (rien n'est gagné ni perdu).
import { CHOC, CYCLE, VERB, RAR_FORCE, preyOf, baseForce, wonIdx } from '../core/choc.js';
import { RARITY, RARITY_ORDER } from '../config.js';
import { LEAGUES, streakMult } from '../core/versus.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, fmt, openSheet, toast } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { haptic } from '../ui/sound.js';
import { packHTML } from './shop.js';
import { leagueBadge, flameHTML } from '../ui/choc.js';
import { t, tw } from '../i18n.js';

const RES = { win: 'Victoire', lose: 'Défaite', draw: 'Égalité' };
const EMB = { win: 'vd-win', lose: 'vd-lose', draw: 'vd-tie' };
/* images Gemini attendues (prompts donnés le 26 octobre 2026) ; en attendant, le médaillon du sceau */
const ARDEUR = '<img alt="" src="assets/jeux/kc-ardeur.webp" onerror="this.onerror=null;this.src=\'assets/icons/seal.webp\'">';
const RLET = { C: 'C', PC: 'PC', R: 'R', HR: 'HR', M: 'M', S: 'S' };
const seenKey = (id) => `abyssal.chocSeen.${id}`;
const seen = (id, k) => { try { return (localStorage.getItem(seenKey(id)) || '').split(',').includes(k); } catch (e) { return true; } };
const markSeen = (id, k) => { try { const v = (localStorage.getItem(seenKey(id)) || '').split(',').filter(Boolean); if (!v.includes(k)) v.push(k); localStorage.setItem(seenKey(id), v.join(',')); } catch (e) { /* stockage indisponible */ } };

export function createChocGame(app, root) {
  const g = app.game, cat = app.catalog;
  let sel = null, seal = false, anim = false, banner = null, keep = null, take = null, done = {}, timer = 0, wake = null, alive = true;
  const STOP = { stop: true };
  const fname = (f) => tw(cat.faction[f]?.name || f);
  const fcol = (f) => cat.faction[f]?.colors?.secondary || '#888';
  const rcol = (r) => RARITY[r]?.color || '#999';
  const foeOf = (v) => (v.me === 'a' ? 'b' : 'a');
  const wait = (ms, v) => (!alive ? Promise.reject(STOP) : new Promise((r, j) => { wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 120) : ms) * (v?.pace === 'fast' ? 0.6 : 1)); }));
  const myPic = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };

  // une carte de ta main (ou une carte révélée) : illustration, faction, rareté, force de base
  function cardHTML(c, { i = null, on = false, used = false, small = false, extra = '', act = 'pick', force = null } = {}) {
    if (!c) return '<span class="kc-c empty"></span>';
    if (c.hid) return `<span class="kc-c hid r-${c.rarity} ${small ? 'sm' : ''} ${extra}" style="--fc:${fcol(c.faction)};--rc:${rcol(c.rarity)}"><span class="kc-hsig">${sigil(c.faction)}</span><b class="kc-gem">${RLET[c.rarity] || '?'}</b></span>`;
    const k = cat.get(c.id), f = force ?? baseForce(c);
    const tag = i != null && !used ? `data-mp="${act}" data-i="${i}" role="button" tabindex="0"` : '';
    return `<span class="kc-c r-${c.rarity} v-${c.variant || 'normal'} ${on ? 'on' : ''} ${used ? 'used' : ''} ${small ? 'sm' : ''} ${extra}" ${tag} style="--fc:${fcol(c.faction)};--rc:${rcol(c.rarity)}">
      ${k ? `<img alt="" src="${artUrl(k, { lite: true })}" loading="lazy">` : ''}<span class="kc-sig">${sigil(c.faction)}</span>
      ${c.variant && c.variant !== 'normal' ? '<i class="kc-fin">✦</i>' : ''}<b class="kc-f">${f}</b><small class="kc-r">${RLET[c.rarity]}</small></span>`;
  }
  const pips = (s, x) => s.rounds.map((r) => `<i class="${r.win === x ? 'w' : r.win ? 'l' : 'n'}"></i>`).join('') + Array.from({ length: CHOC.rounds - s.rounds.length }, () => '<i></i>').join('');
  const sealHTML = (used) => `<span class="kc-seal ${used ? 'used' : ''}" title="${t('Sceau d’Ardeur')}">${ARDEUR}</span>`;
  function who(v, ctx, x) {
    const s = v.state, mine = x === v.me;
    return `<div class="kc-who ${mine ? 'me' : 'foe'}"><span class="sc-med">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span>
      <b>${ctx.plate(v, mine, mine ? t('Toi') : `<span translate="no">${esc(ctx.foeName(v))}</span>`)}</b>
      <span class="kc-pips">${pips(s, x)}</span>${sealHTML(s.seal?.[x])}</div>`;
  }
  // l'arène : la manche en cours (cartes posées, face cachée) ou la dernière révélée
  function arena(v) {
    const s = v.state, me = v.me, foe = foeOf(v);
    if (banner) return `<div class="kc-arena rv ${banner.cls}">${banner.html}</div>`;
    const myPick = s.pick?.[me], foeIn = !!s.pick?.[foe];
    return `<div class="kc-arena"><div class="kc-slot foe">${foeIn ? '<span class="kc-c back"></span>' : `<span class="kc-c empty"><small>${t('Réfléchit…')}</small></span>`}</div>
      <div class="kc-mid"><img alt="" src="assets/versus/vd-vs.webp"><small>${t('Manche {n} / {m}', { n: Math.min(s.r, CHOC.rounds), m: CHOC.rounds })}</small>
        <button class="btn small ghost kc-wheel" data-mp="wheel">${icon('p:help')}${t('Cercle des Royaumes')}</button></div>
      <div class="kc-slot me">${myPick ? `${cardHTML(s.hand[me][myPick.i], { extra: 'placed' })}${myPick.seal ? '<span class="kc-sealon">+3</span>' : ''}` : '<span class="kc-c empty"></span>'}</div></div>`;
  }
  function selInfo(v) {
    const s = v.state, c = sel != null ? s.hand[v.me][sel] : null;
    if (!c) return `<p class="kc-hint">${t('Choisis une carte, puis pose-la. Ton adversaire fait pareil, en secret.')}</p>`;
    const prey = preyOf(c.faction), hunter = CYCLE.find((f) => preyOf(f) === c.faction);
    return `<p class="kc-hint"><b>${t('Force {n}', { n: baseForce(c) + (seal ? CHOC.seal : 0) })}</b> · ${t('+2 contre {f}', { f: fname(prey) })} · <span class="kc-warn">${t('{f} prend +2 contre elle', { f: fname(hunter) })}</span></p>`;
  }
  function drawGame(v, ctx) {
    if (!ctx.alive) return;
    const s = v.state, me = v.me, foe = foeOf(v);
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene mq-scene'; sc.style.backgroundImage = 'url(assets/ui/vs-bg.webp)';
    if (v.status !== 'playing' && v.status !== 'done') { root.innerHTML = `<div class="mq-game kc-game"><p class="sc-msg">${t('La partie commence dès que ton adversaire arrive.')}</p><button class="btn block" data-mp="${ctx.train ? 'tback' : 'back'}">${t('Revenir')}</button></div>`; return; }
    if (v.status === 'done' && !banner) return endScreen(v, ctx);
    const my = s.hand[me] || [], used = s.used?.[me] || [];
    if (sel != null && (used.includes(sel) || !my[sel])) sel = null;
    if (seal && s.seal?.[me]) seal = false;
    const can = !s.pick?.[me] && ctx.myTurn(v) && !ctx.busy && !anim && !banner;
    const msg = banner ? '' : s.pick?.[me] ? t('Ta carte est posée. En attente de <b>{name}</b>…', { name: esc(ctx.foeName(v)) }) : s.pick?.[foe] ? t('<b>{name}</b> a posé sa carte : à toi !', { name: esc(ctx.foeName(v)) }) : '';
    const rf = s.r === CHOC.hand && s.extraN ? `<p class="kc-rf">${icon('booster')}${t('Après cette manche, le Renfort : un 3e booster pour chacun.')}</p>` : '';
    root.innerHTML = `<div class="mq-game kc-game ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-mp="rules" aria-label="${t('Règles')}">${icon('p:help')}</button><b>${t(ctx.train ? 'Entraînement' : 'Le Choc des Boosters')}</b><button class="btn small ghost" data-mp="${ctx.train ? 'tback' : 'back'}" aria-label="${t('Revenir')}">${icon('close')}</button></div>
      ${who(v, ctx, foe)}
      <div class="kc-hand foe">${(s.hand[foe] || []).map((c, i) => cardHTML(c, { small: true, used: s.used?.[foe]?.includes(i), extra: s.used?.[foe]?.includes(i) ? 'used' : '' })).join('')}</div>
      ${arena(v)}
      <div class="kc-hand me">${my.map((c, i) => cardHTML(c, { i: can ? i : null, on: sel === i, used: used.includes(i) })).join('')}</div>
      ${who(v, ctx, me)}
      ${v.status === 'playing' ? `${ctx.clockHTML(v)}${msg ? `<p class="sc-msg">${msg}</p>` : ''}${rf}
      ${can ? `${selInfo(v)}<div class="kc-ctl">
        <button class="kc-sealbtn ${seal ? 'on' : ''}" data-mp="seal" ${s.seal?.[me] ? 'disabled' : ''}>${ARDEUR}<span><b>${t('Sceau d’Ardeur')}</b><small>${s.seal?.[me] ? t('déjà utilisé') : seal ? t('+3 sur cette carte') : t('+3, une fois par partie')}</small></span></button>
        <button class="btn primary block dc-plq dc-plq-red" data-mp="play" ${sel != null ? '' : 'disabled'}>${sel != null ? t('Poser cette carte') : t('Choisis une carte')}</button></div>` : ''}
      ${ctx.train ? `<button class="btn small ghost mp-resign" data-mp="tback">${icon('close')}${t('Quitter l’entraînement')}</button>` : `<button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}${t('Abandonner')}</button>`}` : ''}
    </div>`;
  }

  // ——— Révélation d'une manche : les deux cartes se retournent, les forces se comptent ———
  async function reveal(v, ev, ctx) {
    const me = v.me, foe = foeOf(v), A = ev[me], B = ev[foe];
    const part = (x, o) => {
      const bits = [`${RLET[x.card.rarity]} ${RAR_FORCE[x.card.rarity]}`];
      if (x.card.variant && x.card.variant !== 'normal') bits.push(`✦ +${CHOC.finish}`);
      if (x.beat) bits.push(`${sigil(x.card.faction)} +${CHOC.beat}`);
      if (x.seal) bits.push(`${t('Sceau')} +${CHOC.seal}`);
      return `<span class="kc-rvc ${ev.win === o ? 'win' : ev.win ? 'lose' : ''}">${cardHTML(x.card, { force: x.force })}<span class="kc-bits">${bits.map((b) => `<i>${b}</i>`).join('')}</span></span>`;
    };
    const res = ev.win === me ? 'win' : ev.win === foe ? 'lose' : 'nul';
    const beatTxt = A.beat ? t('{a} {verb} {b} : +2', { a: fname(A.card.faction), verb: t(VERB[A.card.faction]), b: fname(B.card.faction) }) : B.beat ? t('{a} {verb} {b} : +2', { a: fname(B.card.faction), verb: t(VERB[B.card.faction]), b: fname(A.card.faction) }) : '';
    banner = { cls: 'flip', html: `${part(B, foe)}<span class="kc-vs"><img alt="" src="assets/versus/vd-vs.webp"></span>${part(A, me)}` };
    drawGame(v, ctx);
    app.sfx['vd-flip']?.(); haptic('medium');
    await wait(700, v);
    banner = { cls: `shown ${res}`, html: `${part(B, foe)}<span class="kc-vs"><b>${A.force} – ${B.force}</b>${beatTxt ? `<small>${beatTxt}</small>` : ''}</span>${part(A, me)}
      <div class="kc-verdict ${res}"><b>${res === 'win' ? t('Manche gagnée !') : res === 'lose' ? t('Manche perdue') : t('Manche nulle')}</b><small>${res === 'nul' ? t('Même force : personne ne la gagne.') : res === 'win' ? t('Ta carte est gardée à la fin.') : t('Sa carte sera gardée à la fin.')}</small></div>` };
    drawGame(v, ctx);
    if (res === 'win') { app.sfx['vd-rare']?.(); haptic('success'); } else if (res === 'lose') { app.sfx.parry?.(); haptic('heavy'); } else app.sfx.tap?.();
    await wait(2300, v);
    banner = null;
    if (ev.renfort) await openPacks(v, ctx, 'renfort');
  }

  // ——— Ouverture des boosters : les deux sachets s'entrechoquent, se déchirent, les cartes rejoignent les mains ———
  async function openPacks(v, ctx, k) {
    if (!alive) return;
    const n = k === 'start' ? CHOC.hand : CHOC.renfort, me = v.me, foe = foeOf(v);
    const from = k === 'start' ? 0 : CHOC.hand * CHOC.packCards;
    anim = true;
    try {
      drawGame(v, ctx);
      const hide = () => root.querySelectorAll('.kc-hand .kc-c').forEach((c, j, all) => { const side = c.closest('.foe') ? 'foe' : 'me', idx = [...c.parentNode.children].indexOf(c); if (idx >= from) c.classList.add('pre'); });
      hide();
      const ov = document.createElement('div'); ov.className = 'kc-open';
      ov.innerHTML = `<p class="kc-ot">${k === 'start' ? t('Vos boosters s’ouvrent') : t('Le Renfort !')}</p><div class="vd-pack foe"></div><span class="kc-ovs"></span><div class="vd-pack me"></div><button class="btn small ghost kc-oskip" data-mp="oskip">${t('Passer')}</button>`;
      root.querySelector('.kc-game')?.appendChild(ov);
      let skip = false; ov.querySelector('.kc-oskip').onclick = (e) => { e.stopPropagation(); skip = true; };
      for (let p = 0; p < n && !skip && alive; p++) {
        const fp = ov.querySelector('.vd-pack.foe'), mp = ov.querySelector('.vd-pack.me');
        fp.innerHTML = packHTML('standard', cat, { skin: null }); mp.innerHTML = packHTML('standard', cat);
        [fp, mp].forEach((x) => { x.className = `vd-pack ${x === fp ? 'foe' : 'me'} in`; });
        ov.querySelector('.kc-ot').textContent = n > 1 ? `${k === 'start' ? t('Vos boosters s’ouvrent') : t('Le Renfort !')} · ${p + 1} / ${n}` : (k === 'start' ? t('Vos boosters s’ouvrent') : t('Le Renfort !'));
        await wait(600, v);
        if (!app.reduced()) { [fp, mp].forEach((x) => x.classList.add('clash')); app.sfx.suspense?.(); await wait(430, v); ov.classList.add('flash'); app.sfx.parry?.(); haptic('heavy'); await wait(300, v); ov.classList.remove('flash'); [fp, mp].forEach((x) => x.classList.remove('clash')); }
        [fp, mp].forEach((x) => x.classList.add('shake'));
        await wait(650, v);
        [fp, mp].forEach((x) => { x.classList.remove('shake'); x.classList.add('torn'); });
        app.sfx['vd-tear']?.();
        await wait(380, v);
        // les cartes de ce booster apparaissent dans les deux mains
        const a = from + p * CHOC.packCards;
        for (const side of ['foe', 'me']) root.querySelectorAll(`.kc-hand.${side} .kc-c`).forEach((c, idx) => { if (idx >= a && idx < a + CHOC.packCards) { c.classList.remove('pre'); c.classList.add('drop'); } });
        app.sfx['vd-flip']?.();
        await wait(700, v);
      }
      ov.remove();
      root.querySelectorAll('.kc-c.pre').forEach((c) => { c.classList.remove('pre'); c.classList.add('drop'); });
    } catch (e) { if (e !== STOP) throw e; } finally { anim = false; }
    if (v.id) markSeen(v.id, k);
  }

  // ——— Fin de partie : manches, cartes gardées (les gagnantes + une au choix), carte prise à l'adversaire ———
  function endScreen(v, ctx) {
    const s = v.state, me = v.me, foe = foeOf(v);
    const r = s.winner === 'draw' ? 'draw' : s.winner === me ? 'win' : 'lose';
    const won = wonIdx(s, me), out = done[v.id];
    const hand = s.hand[me] || [], fh = s.hand[foe] || [];
    const recap = s.rounds.map((x, j) => `<div class="kc-rec ${x.win === me ? 'w' : x.win ? 'l' : 'n'}"><small>${t('Manche {n}', { n: j + 1 })}</small>${cardHTML(x[me].card, { small: true, force: x[me].force })}<b>${x[me].force} – ${x[foe].force}</b>${cardHTML(x[foe].card, { small: true, force: x[foe].force })}</div>`).join('');
    let body = '';
    if (ctx.train) body = `<p class="small">${t('Entraînement : rien n’est gagné ni perdu.')}</p><button class="btn primary block dc-plq dc-plq-red" data-mp="train">${icon('refresh')}${t('Rejouer')}</button>`;
    else if (out) body = summary(v, out);
    else if (!v.claimed) {
      const pickable = hand.map((c, i) => i).filter((i) => !won.includes(i));
      if (keep == null || won.includes(keep) || !hand[keep]) keep = pickable.length === 1 ? pickable[0] : null;
      body = `<h3 class="kc-h">${t('Tes cartes')}</h3><p class="small">${won.length ? t('Celles qui ont gagné leur manche sont à toi. Choisis-en <b>une de plus</b> à garder :') : t('Choisis <b>une carte</b> à garder :')}</p>
        <div class="kc-keep">${hand.map((c, i) => cardHTML(c, { i: won.includes(i) ? null : i, act: 'keep', on: keep === i, extra: won.includes(i) ? 'kept' : keep === i ? 'kept' : 'gone' })).join('')}</div>
        ${r === 'win' && fh.length ? `<h3 class="kc-h">${t('Ton butin')}</h3><p class="small">${t('Prends la copie d’une carte de {name} :', { name: `<span translate="no">${esc(ctx.foeName(v))}</span>` })}</p>
        <div class="kc-keep">${fh.map((c, i) => cardHTML(c, { i, act: 'take', on: take === i, extra: take === i ? 'kept' : '' })).join('')}</div>` : ''}
        <p class="small muted">${t('Les autres retournent à l’Abysse.')}</p>
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-mp="claim" ${keep != null && (r !== 'win' || !fh.length || take != null) ? '' : 'disabled'}>${t('Garder mes cartes')}</button>`;
    } else body = `<p class="small muted">${t('Tes cartes de cette partie sont déjà dans ta collection.')}</p>`;
    root.innerHTML = `<div class="mq-game kc-game kc-end ${r}">
      <div class="mq-bar"><span></span><b>${t(ctx.train ? 'Entraînement' : 'Le Choc des Boosters')}</b><button class="btn small ghost" data-mp="${ctx.train ? 'tback' : 'back'}" aria-label="${t('Revenir')}">${icon('close')}</button></div>
      <div class="panel kc-endbox"><img class="vd-emb ${r}" alt="" src="assets/versus/${EMB[r]}.webp"><h2 class="vs-title ${r}">${t(RES[r])}</h2>
        <p class="kc-tally">${t('Manches')} <b>${s.wins[me]} – ${s.wins[foe]}</b>${s.wins[me] === s.wins[foe] ? ` · ${t('forces {a} – {b}', { a: s.total[me], b: s.total[foe] })}` : ''}</p>
        ${v.reason === 'timeout' ? `<p class="small">${r === 'win' ? t('Ton adversaire n’a pas joué à temps.') : t('Tu n’as pas joué à temps.')}</p>` : v.reason === 'resign' ? `<p class="small">${r === 'win' ? t('Ton adversaire a abandonné.') : t('Tu as abandonné.')}</p>` : ''}
        <div class="kc-recs">${recap}</div>${body}
        ${!ctx.train && (out || v.claimed) && v.foe ? `<button class="btn block dc-plq" data-mp="rematch">${icon('swords')}${t('Revanche')}</button>` : ''}
        ${ctx.train ? '' : `<button class="btn block" data-mp="back">${t('Revenir aux parties')}</button>`}</div></div>`;
  }
  function summary(v, out) {
    const kept = (out.cards || []).map((x) => { const k = cat.get(x.id); return k ? `<span class="vd-loot"><img alt="" src="${artUrl(k, { lite: true })}"><span>${esc(tw(k.name))}${x.isNewCard ? ` <em>${t('Nouvelle !')}</em>` : ''}</span></span>` : ''; }).join('');
    const tk = out.take && cat.get(out.take.id);
    const st = out.streak, lg = out.league;
    return `<h3 class="kc-h">${t('Gardées dans ta collection')}</h3><div class="vd-loots">${kept}${tk ? `<span class="vd-loot"><img alt="" src="${artUrl(tk, { lite: true })}"><span>${t('Copie de <b>{card}</b>', { card: esc(tw(tk.name)) })}</span></span>` : ''}
      ${out.shards ? `<span class="vd-loot"><img alt="" src="assets/icons/cur-shard.webp"><span>+${fmt(out.shards)} ${t('éclats')}${out.mult > 1 ? ` <em>×${String(out.mult).replace('.', ',')}</em>` : ''}</span></span>` : ''}
      ${out.streakChest ? `<span class="vd-loot"><img alt="" src="assets/chests/${out.streakChest}.webp"><span>${t('Coffre de série')}</span></span>` : ''}</div>
      ${st ? (out.result === 'win' ? `<div class="vd-streak on">${flameHTML(st.after, 'big')}<span>${st.after >= 2 ? t('Série ardente : <b>{n} victoires</b> d’affilée.', { n: st.after }) : t('La Série ardente s’allume.')}<small>${t('Prochaine victoire : butin ×{m}', { m: String(streakMult(st.after + 1)).replace('.', ',') })}</small></span></div>` : st.broken ? `<div class="vd-streak out">${flameHTML(st.before, 'big dead')}<span>${t('Ta série de <b>{n} victoires</b> s’éteint.', { n: st.before })}</span></div>` : '') : ''}
      ${lg ? `<div class="vd-league ${lg.after > lg.before ? 'up' : lg.after < lg.before ? 'down' : ''}">${leagueBadge(lg.after, 'big')}<span><b>${lg.after > lg.before ? t('Tu montes en ligue {l} !', { l: t(LEAGUES[lg.after].name) }) : lg.after < lg.before ? t('Tu redescends en ligue {l}…', { l: t(LEAGUES[lg.after].name) }) : t('Ligue {l}', { l: t(LEAGUES[lg.after].name) })}</b><small>${fmt(lg.pts)} ${t('points')} <em class="${lg.delta >= 0 ? 'pos' : 'neg'}">${lg.delta >= 0 ? '+' : '−'}${Math.abs(lg.delta)}</em></small></span></div>` : ''}`;
  }

  function wheelSheet() {
    const R = 38, pts = CYCLE.map((f, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / CYCLE.length; return { f, x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) }; });
    openSheet(`<h2>${t('Le Cercle des Royaumes')}</h2><p class="small">${t('Chaque royaume domine le suivant : sa carte prend <b>+2</b> contre lui.')}</p>
      <div class="kc-ring">${pts.map((p) => `<span class="kc-rs" style="left:${p.x}%;top:${p.y}%;--fc:${fcol(p.f)}">${sigil(p.f)}</span>`).join('')}<span class="kc-rarrow"></span></div>
      <ul class="kc-rlist">${CYCLE.map((f) => `<li>${sigil(f)}<b>${fname(f)}</b> ${t(VERB[f])} ${sigil(preyOf(f))}<b>${fname(preyOf(f))}</b></li>`).join('')}</ul>`, { label: t('Le Cercle des Royaumes'), cls: 'sheet-small' });
  }

  return {
    drawGame, reveal, openPacks, wheelSheet, seen,
    get anim() { return anim; },
    reset() { sel = null; seal = false; banner = null; keep = null; take = null; },
    stop() { alive = false; clearTimeout(timer); const w = wake; wake = null; w?.(STOP); },
    start() { alive = true; },
    STOP,
    // clics de l'écran de partie ; renvoie vrai si le clic est traité
    async click(k, b, v, ctx, play) {
      if (k === 'wheel') { wheelSheet(); return true; }
      if (!v) return false;
      if (k === 'pick') { sel = +b.dataset.i; app.sfx.tap?.(); haptic('select'); drawGame(v, ctx); return true; }
      if (k === 'seal') { seal = !seal; app.sfx.tap?.(); drawGame(v, ctx); return true; }
      if (k === 'keep') { keep = +b.dataset.i; app.sfx.tap?.(); endScreen(v, ctx); return true; }
      if (k === 'take') { take = +b.dataset.i; app.sfx.tap?.(); endScreen(v, ctx); return true; }
      if (k === 'play' && sel != null && !anim) { const i = sel, s2 = seal; sel = null; seal = false; app.sfx['en-coin']?.(); await play(i, s2); return true; }
      return false;
    },
    claimArgs: () => ({ keep, take }),
    setDone(id, out) { done[id] = out; },
  };
}
