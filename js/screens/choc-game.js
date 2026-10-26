// v811 : une partie du nouveau Choc des Boosters (règles dans js/core/choc.js, partie tenue par le serveur : choc_apply dans
// supabase/09-multijoueur.sql). Les deux joueurs ouvrent leurs 2 boosters en même temps (les sachets s'entrechoquent puis se
// déchirent), jouent 3 manches en posant chacun une carte en secret, un 3e booster arrive après la 2e manche (le Renfort), puis
// chacun choisit ce qu'il garde. Le même écran sert à l'entraînement contre l'Abysse (rien n'est gagné ni perdu).
// v816 : les Flammes (0 à 4 sur la carte posée, 8 pour la partie) remplacent le Cercle des Royaumes et le Sceau d'Ardeur ;
// écran refait pour que tout se lise sans plisser les yeux : grandes cartes, force en gros chiffre, rareté écrite en entier.
import { CHOC, RAR_FORCE, baseForce, wonIdx, flamesLeft, flameCap } from '../core/choc.js';
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, fmt, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { haptic } from '../ui/sound.js';
import { packHTML } from './shop.js';
import { leagueBadge, flameHTML } from '../ui/choc.js';
import { t, tw } from '../i18n.js';

const RES = { win: 'Victoire', lose: 'Défaite', draw: 'Égalité' };
const EMB = { win: 'vd-win', lose: 'vd-lose', draw: 'vd-tie' };
/* Flamme d'Ardeur : image Gemini attendue (assets/jeux/kc-flamme.webp) ; en attendant, la flamme de la Série ardente */
const FLAME = '<img class="kc-fl-i" alt="" src="assets/jeux/kc-flamme.webp" onerror="this.onerror=null;this.src=\'assets/versus/flamme.webp\'">';
const RLET = { C: 'C', PC: 'PC', R: 'R', HR: 'HR', M: 'M', S: 'S' };
const seenKey = (id) => `abyssal.chocSeen.${id}`;
const seen = (id, k) => { try { return (localStorage.getItem(seenKey(id)) || '').split(',').includes(k); } catch (e) { return true; } };
const markSeen = (id, k) => { try { const v = (localStorage.getItem(seenKey(id)) || '').split(',').filter(Boolean); if (!v.includes(k)) v.push(k); localStorage.setItem(seenKey(id), v.join(',')); } catch (e) { /* stockage indisponible */ } };

export function createChocGame(app, root) {
  const g = app.game, cat = app.catalog;
  let sel = null, fl = 0, anim = false, banner = null, keep = null, take = null, done = {}, timer = 0, wake = null, alive = true;
  const STOP = { stop: true };
  const fcol = (f) => cat.faction[f]?.colors?.secondary || '#888';
  const rcol = (r) => RARITY[r]?.color || '#999';
  const rname = (r) => t(RARITY[r]?.name || r);
  const foeOf = (v) => (v.me === 'a' ? 'b' : 'a');
  const wait = (ms, v) => (!alive ? Promise.reject(STOP) : new Promise((r, j) => { wake = j; timer = setTimeout(r, (app.reduced() ? Math.min(ms, 120) : ms) * (v?.pace === 'fast' ? 0.6 : 1)); }));
  const myPic = () => { const c = cat.get(g.shownAvatar()); return `<img alt="" src="${c ? artUrl(c, { lite: true }) : 'assets/brand/emblem.webp'}">`; };
  const hasFin = (c) => c?.variant && c.variant !== 'normal';

  // une carte : illustration, grosse force en haut à gauche, rareté écrite en bas, ✦ si finition
  function cardHTML(c, { i = null, on = false, used = false, small = false, extra = '', act = 'pick', force = null } = {}) {
    if (!c) return '<span class="kc-c empty"></span>';
    if (c.hid) return `<span class="kc-c hid r-${c.rarity} ${small ? 'sm' : ''} ${extra}" style="--fc:${fcol(c.faction)};--rc:${rcol(c.rarity)}"><b class="kc-f">${RAR_FORCE[c.rarity] || '?'}</b><small class="kc-rn">${small ? RLET[c.rarity] : rname(c.rarity)}</small></span>`;
    const k = cat.get(c.id), f = force ?? baseForce(c);
    const tag = i != null && !used ? `data-mp="${act}" data-i="${i}" role="button" tabindex="0" aria-label="${esc(k ? tw(k.name) : '')} · ${rname(c.rarity)} · ${t('Force {n}', { n: f })}"` : '';
    return `<span class="kc-c kc3c r-${c.rarity} v-${c.variant || 'normal'} ${on ? 'on' : ''} ${used ? 'used' : ''} ${small ? 'sm' : ''} ${extra}" ${tag} style="--fc:${fcol(c.faction)};--rc:${rcol(c.rarity)}">
      ${k ? `<img alt="" src="${artUrl(k, { lite: true })}" loading="lazy">` : ''}<span class="kc-sig">${sigil(c.faction)}</span>
      ${hasFin(c) ? '<i class="kc-fin" title="+1">✦</i>' : ''}<b class="kc-f">${f}</b><small class="kc-rn">${small ? RLET[c.rarity] : rname(c.rarity)}</small></span>`;
  }
  // détail de la force : « Rare 3 · ✦ +1 · 🔥 +2 »
  const parts = (c, f) => [`<i class="rr" style="--rc:${rcol(c.rarity)}">${rname(c.rarity)} ${RAR_FORCE[c.rarity]}</i>`,
    hasFin(c) ? `<i class="fi">✦ +${CHOC.finish}</i>` : '', f ? `<i class="fl">${FLAME}+${f}</i>` : ''].filter(Boolean).join('');
  const pips = (s, x) => s.rounds.map((r) => `<i class="${r.win === x ? 'w' : r.win ? 'l' : 'n'}"></i>`).join('') + Array.from({ length: CHOC.rounds - s.rounds.length }, () => '<i></i>').join('');
  const flameCount = (n) => `<span class="kc-flc" title="${t('Flammes')}">${FLAME}<b>${n}</b></span>`;
  function tag(v, ctx, x) {
    const s = v.state, mine = x === v.me;
    return `<div class="kc-tag ${mine ? 'me' : 'foe'}"><span class="sc-med">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span>
      <span class="kc-tg"><b>${ctx.plate(v, mine, mine ? t('Toi') : `<span translate="no">${esc(ctx.foeName(v))}</span>`)}</b>${mine ? '' : foeChips(s, x)}</span>${flameCount(flamesLeft(s, x))}</div>`;
  }
  // les cartes de l'adversaire : seulement leur rareté (et donc leur force de base), en grosses pastilles
  function foeChips(s, foe) {
    return `<div class="kc-fchips">${(s.hand[foe] || []).map((c, i) => s.used?.[foe]?.includes(i) ? '' : `<span class="kc-fc" style="--rc:${rcol(c.rarity)}"><b>${RAR_FORCE[c.rarity] || '?'}</b><small>${RLET[c.rarity] || ''}</small></span>`).join('')}</div>`;
  }
  // la table : la carte de l'adversaire (cachée) face à la tienne (choisie, avec sa force totale)
  function arena(v, ctx, can) {
    const s = v.state, me = v.me, foe = foeOf(v);
    const score = `<div class="kc-score"><span class="kc-pips">${pips(s, foe)}</span><small>${t('Manches gagnées')}</small><span class="kc-pips">${pips(s, me)}</span></div>`;
    if (banner) return `<div class="kc-table kc3t">${score}<div class="kc-arena rv ${banner.cls}">${banner.html}</div></div>`;
    const myPick = s.pick?.[me], foeIn = !!s.pick?.[foe];
    const c = myPick ? s.hand[me][myPick.i] : can && sel != null ? s.hand[me][sel] : null;
    const f = myPick ? (myPick.f || 0) : fl, tot = c ? baseForce(c) + f : 0;
    const mine = c ? cardHTML(c, { extra: myPick ? 'placed' : 'ghost', force: tot }) : `<span class="kc-c empty"><i>?</i></span>`;
    return `<div class="kc-table kc3t">${score}
      <div class="kc-duel"><div class="kc-spot foe">${foeIn ? '<span class="kc-c back placed"></span>' : '<span class="kc-c empty"><i>?</i></span>'}<em>${foeIn ? t('Carte posée') : t('Réfléchit…')}</em></div>
        <img class="kc-vs2" alt="" src="assets/versus/vd-vs.webp">
        <div class="kc-spot me">${mine}${c ? `<span class="kc-parts">${parts(c, f)}</span>` : `<em>${t('Ta carte')}</em>`}</div></div>${step(v, ctx, can)}</div>`;
  }
  function step(v, ctx, can) {
    const s = v.state, me = v.me, foe = foeOf(v);
    if (banner || v.status !== 'playing') return '';
    const rf = s.r === CHOC.hand && s.extraN ? `<small class="kc-rf">${icon('booster')}${t('Après cette manche, le Renfort : un 3e booster pour chacun.')}</small>` : '';
    if (s.pick?.[me]) return `<div class="kc-step wait"><span class="n">…</span><span>${t('Ta carte est posée. En attente de <b>{name}</b>…', { name: esc(ctx.foeName(v)) })}${rf}</span></div>`;
    if (!can) return rf ? `<div class="kc-step">${rf}</div>` : '';
    const foeIn = s.pick?.[foe] ? ` <em>${t('<b>{name}</b> a posé sa carte : à toi !', { name: esc(ctx.foeName(v)) })}</em>` : '';
    return sel == null ? `<div class="kc-step"><span class="n">1</span><span>${t('Choisis une carte dans ta main.')} <small>${t('Si elle gagne la manche, elle est à toi.')}</small>${foeIn}${rf}</span></div>`
      : `<div class="kc-step go"><span class="n">2</span><span>${t('Ajoute des Flammes (+1 chacune), puis pose ta carte.')}${foeIn}${rf}</span></div>`;
  }
  // le choix des Flammes : 0 à 4, jamais plus que ta réserve
  function flamePicker(s, me, can) {
    const left = flamesLeft(s, me), cap = can ? flameCap(s, me) : -1;
    if (fl > Math.max(0, cap)) fl = 0;
    return `<div class="kc-flames ${can ? '' : 'off'}"><div class="kc-fl-h">${FLAME}<b>${left}</b><small>${t('Flammes')}</small></div>
      ${Array.from({ length: CHOC.flameMax + 1 }, (_, n) => `<button class="kc-fl ${n === fl && can ? 'on' : ''}" data-mp="fl" data-n="${n}" ${can && n <= cap ? '' : 'disabled'} aria-pressed="${n === fl}" aria-label="${t('{n} Flammes', { n })}"><b>${n ? `+${n}` : '0'}</b>${n ? `<span class="kc-fl-st">${Array.from({ length: n }, () => FLAME).join('')}</span>` : ''}</button>`).join('')}</div>`;
  }
  function drawGame(v, ctx) {
    if (!ctx.alive) return;
    const s = v.state, me = v.me, foe = foeOf(v);
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene mq-scene kc-scene'; sc.style.backgroundImage = 'url(assets/ui/vs-bg.webp)';
    if (v.status !== 'playing' && v.status !== 'done') { root.innerHTML = `<div class="mq-game kc-game"><p class="sc-msg">${t('La partie commence dès que ton adversaire arrive.')}</p><button class="btn block" data-mp="${ctx.train ? 'tback' : 'back'}">${t('Revenir')}</button></div>`; return; }
    if (v.status === 'done' && !banner) return endScreen(v, ctx);
    const my = s.hand[me] || [], used = s.used?.[me] || [];
    if (sel != null && (used.includes(sel) || !my[sel])) sel = null;
    const can = !s.pick?.[me] && ctx.myTurn(v) && !ctx.busy && !anim && !banner;
    const left = my.map((c, i) => i).filter((i) => !used.includes(i));
    const tot = sel != null && my[sel] ? baseForce(my[sel]) + fl : 0;
    root.innerHTML = `<div class="mq-game kc-game kc3 ${app.reduced() ? 'rm' : ''}">
      <div class="mq-bar"><button class="btn small ghost" data-mp="rules" aria-label="${t('Règles')}">${icon('p:help')}</button><b>${v.status === 'playing' || banner ? t('Manche {n} / {m}', { n: Math.min(banner?.r || s.r, CHOC.rounds), m: CHOC.rounds }) : t(ctx.train ? 'Entraînement' : 'Le Choc des Boosters')}</b><button class="btn small ghost" data-mp="${ctx.train ? 'tback' : 'back'}" aria-label="${t('Revenir')}">${icon('close')}</button></div>
      <div class="kc-side foe">${tag(v, ctx, foe)}</div>
      ${arena(v, ctx, can)}
      ${v.status === 'playing' ? ctx.clockHTML(v) : ''}
      <div class="kc-side me">
        <div class="kc-hand me ${can ? 'can' : ''}" style="--cols:${left.length > 6 ? 4 : 3}">${left.map((i) => cardHTML(my[i], { i: can ? i : null, on: sel === i })).join('')}</div></div>
      ${v.status === 'playing' ? `${flamePicker(s, me, can && sel != null)}
        <button class="btn primary block dc-plq dc-plq-red kc-play" data-mp="play" ${can && sel != null ? '' : 'disabled'}>${s.pick?.[me] ? t('Carte posée') : sel != null && can ? t('Poser · force {n}', { n: tot }) : t('Choisis une carte')}</button>
      ${ctx.train ? '' : `<button class="kc-quit" data-mp="resign">${t('Abandonner')}</button>`}` : ''}
    </div>`;
  }

  // ——— Révélation d'une manche : les deux cartes se retournent, les forces se comptent ———
  async function reveal(v, ev, ctx) {
    const me = v.me, foe = foeOf(v), A = ev[me], B = ev[foe];
    const part = (x, o, who) => `<span class="kc-rvc ${ev.win === o ? 'win' : ev.win ? 'lose' : ''}"><small class="kc-who2">${who}</small>${cardHTML(x.card, { force: x.force })}<span class="kc-parts">${parts(x.card, x.f || 0)}</span></span>`;
    const res = ev.win === me ? 'win' : ev.win === foe ? 'lose' : 'nul';
    const fn = `<span translate="no">${esc(ctx.foeName(v))}</span>`;
    banner = { r: ev.r, cls: 'flip', html: `${part(B, foe, fn)}<span class="kc-vs"><img alt="" src="assets/versus/vd-vs.webp"></span>${part(A, me, t('Toi'))}` };
    drawGame(v, ctx);
    app.sfx['vd-flip']?.(); haptic('medium');
    await wait(700, v);
    banner = { r: ev.r, cls: `shown ${res}`, html: `${part(B, foe, fn)}<span class="kc-vs"><b>${B.force}<em>–</em>${A.force}</b></span>${part(A, me, t('Toi'))}
      <div class="kc-verdict ${res}"><b>${res === 'win' ? t('Manche gagnée !') : res === 'lose' ? t('Manche perdue') : t('Manche nulle')}</b><small>${res === 'nul' ? t('Même force : personne ne la gagne.') : res === 'win' ? t('Ta carte est à toi à la fin de la partie.') : t('Sa carte lui reviendra à la fin de la partie.')}</small></div>` };
    drawGame(v, ctx);
    if (res === 'win') { app.sfx['vd-rare']?.(); haptic('success'); } else if (res === 'lose') { app.sfx.parry?.(); haptic('heavy'); } else app.sfx.tap?.();
    await wait(2300, v);
    banner = null;
    if (ev.renfort) await openPacks(v, ctx, 'renfort');
  }

  // ——— Ouverture des boosters : les deux sachets s'entrechoquent, se déchirent, les cartes rejoignent les mains ———
  /* v814 (le propriétaire : « c'est quoi cet affichage moche ? refais ça ») : mise en scène plein écran : l'adversaire en haut,
     toi en bas, chacun son sachet ; les sachets se jettent l'un sur l'autre au centre, éclair, ils tremblent, se déchirent, et
     les 3 cartes de chacun volent face cachée jusqu'à sa main où elles se retournent. */
  async function openPacks(v, ctx, k) {
    if (!alive) return;
    const n = k === 'start' ? CHOC.hand : CHOC.renfort;
    const from = k === 'start' ? 0 : CHOC.hand * CHOC.packCards;
    const title = k === 'start' ? t('Vos boosters s’ouvrent') : t('Le Renfort !');
    let ov = null, skip = false;
    anim = true;
    try {
      drawGame(v, ctx);
      const cnt0 = n * CHOC.packCards;
      root.querySelectorAll('.kc-hand.me, .kc-fchips').forEach((row) => [...row.children].slice(-cnt0).forEach((c) => c.classList.add('pre')));
      const side = (mine) => `<div class="kc-oside ${mine ? 'me' : 'foe'}"><span class="sc-med">${mine ? myPic() : ctx.avatar(v.foe?.avatar)}</span><b>${mine ? t('Toi') : `<span translate="no">${esc(ctx.foeName(v))}</span>`}</b></div>`;
      ov = document.createElement('div'); ov.className = `kc-open ${k}`;
      const st = v.state, foeK = foeOf(v), cnt = n * CHOC.packCards;
      const orow = (sd) => `<div class="kc-orow ${sd === v.me ? 'me' : 'foe'}" style="--n:${cnt}">${(st.hand[sd] || []).slice(from, from + cnt).map((c) => cardHTML(c, { small: true, extra: 'pre' })).join('')}</div>`;
      ov.innerHTML = `<span class="vd-embers"></span><p class="kc-ot"><b>${title}</b><small></small></p>
        ${side(false)}${orow(foeK)}<div class="vd-pack foe"></div><span class="kc-ovs"></span><div class="vd-pack me"></div>${orow(v.me)}${side(true)}
        <button class="btn small ghost kc-oskip" data-mp="oskip">${t('Passer')}</button>`;
      root.querySelector('.kc-game')?.appendChild(ov);
      requestAnimationFrame(() => ov?.classList.add('on'));
      ov.querySelector('.kc-oskip').onclick = (e) => { e.stopPropagation(); skip = true; };
      for (let p = 0; p < n && !skip && alive; p++) {
        const fp = ov.querySelector('.vd-pack.foe'), mp = ov.querySelector('.vd-pack.me');
        fp.innerHTML = packHTML('standard', cat, { skin: null }); mp.innerHTML = packHTML('standard', cat);
        [fp, mp].forEach((x) => { x.className = `vd-pack ${x === fp ? 'foe' : 'me'} in`; });
        ov.querySelector('.kc-ot small').textContent = n > 1 ? `${p + 1} / ${n}` : '';
        await wait(650, v);
        if (skip) break;
        if (!app.reduced()) {
          [fp, mp].forEach((x) => x.classList.add('clash')); app.sfx.suspense?.();
          await wait(420, v);
          ov.classList.add('flash'); app.sfx.parry?.(); haptic('heavy');
          await wait(320, v);
          ov.classList.remove('flash'); [fp, mp].forEach((x) => x.classList.remove('clash'));
        }
        [fp, mp].forEach((x) => x.classList.add('shake'));
        await wait(600, v);
        [fp, mp].forEach((x) => { x.classList.remove('shake'); x.classList.add('torn'); });
        app.sfx['vd-tear']?.();
        await wait(260, v);
        // les cartes de ce booster volent jusqu'aux deux mains
        const a = p * CHOC.packCards;
        await Promise.all([['foe', fp], ['me', mp]].map(([sd, pk]) => fly(ov, sd, pk, a)));
        app.sfx['vd-flip']?.();
        await wait(450, v);
      }
      if (!skip) await wait(700, v);
    } catch (e) { if (e !== STOP) throw e; } finally {
      anim = false;
      if (ov) { ov.classList.remove('on'); const o = ov; setTimeout(() => o.remove(), 300); }
      root.querySelectorAll('.kc-c.pre, .kc-fc.pre').forEach((c) => { c.classList.remove('pre'); c.classList.add('flipin'); });
    }
    if (v.id) markSeen(v.id, k);
  }
  // 3 cartes face cachée sortent du sachet et filent vers leur place dans la main, puis se retournent
  function fly(ov, sd, pk, a) {
    const targets = [...ov.querySelectorAll(`.kc-orow.${sd} .kc-c`)].slice(a, a + CHOC.packCards);
    const src = pk.getBoundingClientRect(), cx = src.left + src.width / 2, cy = src.top + src.height / 2;
    return Promise.all(targets.map((tg, i) => new Promise((ok) => {
      const r = tg.getBoundingClientRect();
      const reveal = () => { tg.classList.remove('pre'); tg.classList.add('flipin'); ok(); };
      if (app.reduced() || !r.width) return reveal();
      const f = document.createElement('span'); f.className = 'kc-fly';
      f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      document.body.appendChild(f);
      const an = f.animate([
        { transform: `translate(${cx - r.left - r.width / 2}px, ${cy - r.top - r.height / 2}px) scale(.5) rotate(${(i - 1) * 22}deg)`, opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: 'none', opacity: 1 }], { duration: 560, delay: i * 110, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      an.onfinish = () => { f.remove(); reveal(); };
      an.oncancel = () => { f.remove(); reveal(); };
    })));
  }

  // ——— Fin de partie : manches, cartes gardées (les gagnantes + une au choix), carte prise à l'adversaire ———
  /* v813 : écran de fin compact : tout tient sur l'écran, sans défiler (demande du propriétaire) */
  function endScreen(v, ctx) {
    const s = v.state, me = v.me, foe = foeOf(v);
    /* v819 : partie finie par abandon ou temps dépassé : le gagnant n'est écrit que dans la partie du serveur (v.winner) */
    const W = s.winner ?? v.winner;
    const r = W === 'draw' ? 'draw' : W === me ? 'win' : 'lose';
    const won = wonIdx(s, me), out = done[v.id];
    const hand = s.hand[me] || [], fh = s.hand[foe] || [];
    const mini = (c, f) => cardHTML(c, { small: true, force: f });
    const recap = `<div class="kc-recs3">${s.rounds.map((x, j) => `<div class="kc-r3 ${x.win === me ? 'w' : x.win ? 'l' : 'n'}"><small>${t('Manche {n}', { n: j + 1 })}</small><span class="kc-r3c">${mini(x[me].card, x[me].force)}${mini(x[foe].card, x[foe].force)}</span><b>${x[me].force} – ${x[foe].force}</b></div>`).join('')}</div>`;
    const reason = v.reason === 'timeout' ? (r === 'win' ? t('Ton adversaire n’a pas joué à temps.') : t('Tu n’as pas joué à temps.')) : v.reason === 'resign' ? (r === 'win' ? t('Ton adversaire a abandonné.') : t('Tu as abandonné.')) : '';
    const head = `<div class="kc-ehead"><img class="vd-emb ${r}" alt="" src="assets/versus/${EMB[r]}.webp"><div><h2 class="vs-title ${r}">${t(RES[r])}</h2>
      <p class="kc-tally">${t('Manches')} <b>${s.wins[me]} – ${s.wins[foe]}</b>${s.wins[me] === s.wins[foe] ? ` · ${t('forces {a} – {b}', { a: s.total[me], b: s.total[foe] })}` : ''}</p>${reason ? `<p class="small">${reason}</p>` : ''}</div></div>`;
    const rematch = !ctx.train && v.foe ? `<button class="btn dc-plq" data-mp="rematch">${icon('swords')}${t('Revanche')}</button>` : '';
    let body = '';
    if (ctx.train) body = `<p class="small center">${t('Entraînement : rien n’est gagné ni perdu.')}</p><div class="kc-acts"><button class="btn primary dc-plq dc-plq-red" data-mp="train">${icon('refresh')}${t('Rejouer')}</button><button class="btn" data-mp="tback">${t('Revenir')}</button></div>`;
    else if (out) body = `${summary(v, out)}<div class="kc-acts">${rematch}<button class="btn" data-mp="back">${t('Revenir')}</button></div>`;
    else if (!v.claimed) {
      const pickable = hand.map((c, i) => i).filter((i) => !won.includes(i));
      if (keep == null || won.includes(keep) || !hand[keep]) keep = pickable.length === 1 ? pickable[0] : null;
      body = `<p class="kc-h">${won.length ? t('Celles qui ont gagné leur manche sont à toi. Choisis-en <b>une de plus</b> à garder :') : t('Choisis <b>une carte</b> à garder :')}</p>
        <div class="kc-keep9">${hand.map((c, i) => cardHTML(c, { small: true, i: won.includes(i) ? null : i, act: 'keep', on: keep === i, extra: won.includes(i) ? 'kept won' : keep === i ? 'kept' : 'gone' })).join('')}</div>
        ${r === 'win' && fh.length ? `<p class="kc-h">${t('Prends la copie d’une carte de {name} :', { name: `<span translate="no">${esc(ctx.foeName(v))}</span>` })}</p>
        <div class="kc-keep9">${fh.map((c, i) => cardHTML(c, { small: true, i, act: 'take', on: take === i, extra: take === i ? 'kept' : 'gone' })).join('')}</div>` : ''}
        <p class="small muted center kc-gone">${t('Les autres retournent à l’Abysse.')}</p>
        <button class="btn primary block dc-plq dc-plq-red" data-mp="claim" ${keep != null && (r !== 'win' || !fh.length || take != null) ? '' : 'disabled'}>${t('Garder mes cartes')}</button>`;
    } else body = `<p class="small muted center">${t('Tes cartes de cette partie sont déjà dans ta collection.')}</p><div class="kc-acts">${rematch}<button class="btn" data-mp="back">${t('Revenir')}</button></div>`;
    root.innerHTML = `<div class="mq-game kc-game kc-end ${r}">
      <div class="mq-bar"><span></span><b>${t(ctx.train ? 'Entraînement' : 'Le Choc des Boosters')}</b><button class="btn small ghost" data-mp="${ctx.train ? 'tback' : 'back'}" aria-label="${t('Revenir')}">${icon('close')}</button></div>
      <div class="panel kc-endbox">${head}${recap}${body}</div></div>`;
  }
  function summary(v, out) {
    const cards = [...(out.cards || []), ...(out.take ? [{ ...out.take, copy: true }] : [])];
    const row = cards.map((x) => { const k = cat.get(x.id); return k ? `<span class="kc-kept">${cardHTML({ ...x, faction: k.faction, rarity: k.rarity }, { small: true })}${x.isNewCard ? `<em>${t('Nouvelle')}</em>` : x.copy ? `<em class="cp">${t('Copie')}</em>` : ''}</span>` : ''; }).join('');
    const st = out.streak, lg = out.league;
    const chips = [out.shards ? `<span class="kc-chip"><img alt="" src="assets/icons/cur-shard.webp">+${fmt(out.shards)}${out.mult > 1 ? ` <em>×${String(out.mult).replace('.', ',')}</em>` : ''}</span>` : '',
      out.streakChest ? `<span class="kc-chip"><img alt="" src="assets/chests/${out.streakChest}.webp">${t('Coffre de série')}</span>` : ''].filter(Boolean).join('');
    const stHTML = !st ? '' : out.result === 'win' ? `<span class="kc-mini on">${flameHTML(st.after)}<small>${t('Série : {n}', { n: st.after })}</small></span>` : st.broken ? `<span class="kc-mini out">${flameHTML(st.before, 'dead')}<small>${t('Série éteinte')}</small></span>` : '';
    const lgHTML = !lg ? '' : `<span class="kc-mini ${lg.after > lg.before ? 'up' : lg.after < lg.before ? 'down' : ''}">${leagueBadge(lg.after)}<small>${fmt(lg.pts)} ${t('points')} <em class="${lg.delta >= 0 ? 'pos' : 'neg'}">${lg.delta >= 0 ? '+' : '−'}${Math.abs(lg.delta)}</em></small></span>`;
    return `<p class="kc-h">${t('Gardées dans ta collection')}</p><div class="kc-keep9 kc-keptrow">${row}</div>
      ${chips ? `<div class="kc-chips">${chips}</div>` : ''}${stHTML || lgHTML ? `<div class="kc-minis">${stHTML}${lgHTML}</div>` : ''}`;
  }

  return {
    drawGame, reveal, openPacks, seen,
    get anim() { return anim; },
    reset() { sel = null; fl = 0; banner = null; keep = null; take = null; },
    stop() { alive = false; clearTimeout(timer); const w = wake; wake = null; w?.(STOP); },
    start() { alive = true; },
    STOP,
    // clics de l'écran de partie ; renvoie vrai si le clic est traité
    async click(k, b, v, ctx, play) {
      if (!v) return false;
      if (k === 'pick') { const i = +b.dataset.i; if (sel !== i) fl = 0; sel = i; app.sfx.tap?.(); haptic('select'); drawGame(v, ctx); return true; }
      if (k === 'fl') { fl = +b.dataset.n; app.sfx.tap?.(); haptic('select'); drawGame(v, ctx); return true; }
      if (k === 'keep') { keep = +b.dataset.i; app.sfx.tap?.(); endScreen(v, ctx); return true; }
      if (k === 'take') { take = +b.dataset.i; app.sfx.tap?.(); endScreen(v, ctx); return true; }
      if (k === 'play' && sel != null && !anim) { const i = sel, f = fl; sel = null; fl = 0; app.sfx['en-coin']?.(); await play(i, f); return true; }
      return false;
    },
    claimArgs: () => ({ keep, take }),
    setDone(id, out) { done[id] = out; },
  };
}
