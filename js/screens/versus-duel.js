// v521 : le face-à-face du Choc des Boosters, en plein écran (demande du propriétaire : « que ça prenne l'écran entier,
// un beau décor, les boosters déchirés en même temps, les 3 cartes qui sortent, puis on enchaîne… et du suspense »).
// Pour chaque booster de la composition : les deux sachets apparaissent face à face, tremblent, se déchirent ensemble,
// les cartes jaillissent face cachée vers leur place, puis se retournent une à une, en alternance, avec leurs points.
// Un toucher accélère (×4) ; « Tout révéler » termine d'un coup.
import { BOOSTERS, RARITY, RARITY_ORDER, VARIANTS } from '../config.js';
import { lineupOf, scoreOf, LEAGUES, streakMult } from '../core/versus.js';
import { today } from '../core/save.js';
import { emoteHTML, showEmote } from '../ui/vitrine.js';
import { EMOTES } from '../core/codex.js';
const EMOTES_TXT = (k) => EMOTES[k]?.text || '';
const BUBBLE = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
import { haptic } from '../ui/sound.js';
import { leagueBadge, flameHTML } from '../ui/choc.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, fmt } from '../ui/dom.js';
import { packHTML } from './shop.js';
import { t, tw } from '../i18n.js';
import { musicCue, musicSeek, musicRelease } from '../ui/music.js';
import { skinOk } from '../ui/vitrine.js';
import { stillOf, backUrl } from '../ui/still.js';

const RES = { win: 'Victoire', tie: 'Égalité', lose: 'Défaite' };
const EMB = { win: 'vd-win', lose: 'vd-lose', tie: 'vd-tie' }; /* v524 : emblèmes Gemini de fin (v526 : égalité) */
const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);
const isBig = (c) => RI(c.rarity) >= RI('HR') || c.variant !== 'normal';
/* v563 : la musique du Pari (assets/music/pari.mp3 : 150 battements par minute, phrases de 6,4 s, temps forts à 0,05 + 6,4 × k,
   silence de 42 à 44,5 s puis l'explosion à 44,85 s) mène le duel, qu'il y ait 1, 2 ou 3 boosters : chaque déchirure tombe sur
   un temps fort, le rythme des cartes s'étire ou se resserre pour remplir sa phrase, et le résultat tombe sur l'explosion. */
const PH = 6.4, BEAT0 = 0.05, DROP = BEAT0 + 7 * PH;
const APPEAR = 1.55, AFTER = 1.08, NEXT = 0.3, LAST = 0.6; // sachets visibles avant la déchirure ; déchirure → 1re carte ; marges
const revDur = (c) => (isBig(c) ? 1.8 : 0.56);
function musicPlan(packs) {
  const N = packs.length, R = packs.map((cs) => cs.reduce((n, c) => n + revDur(c), 0));
  const fixed = (p) => AFTER + (p < N - 1 ? NEXT + APPEAR : LAST);
  const slots = R.map((r, p) => Math.max(1, Math.ceil((fixed(p) + 0.75 * r) / PH))); // une phrase peut aller jusqu'à 25 % plus vite
  while (slots.reduce((a, b) => a + b, 0) > 6) { const i = slots.indexOf(Math.max(...slots)); if (slots[i] <= 1) break; slots[i]--; }
  const tears = []; let x = DROP;
  for (let p = N - 1; p >= 0; p--) { x -= PH * slots[p]; tears[p] = x; }
  const scale = R.map((r, p) => (r ? Math.min(1.5, Math.max(0.6, (PH * slots[p] - fixed(p)) / r)) : 1));
  return { tears, scale, start: Math.max(0, tears[0] - APPEAR - 0.5) };
}

export { leagueBadge, flameHTML } from '../ui/choc.js';

/* v736 : le gagnant choisit une carte parmi celles de l'adversaire (une Mythique ou une Secrète devient un coffre abyssal) */
export function pickGridHTML(app, cards) {
  const cat = app.catalog, g = app.game;
  /* v805 : les plus rares d'abord (index d'origine gardé pour le serveur) ; cartes déjà dans ta collection bien marquées */
  const rk = (x) => RARITY_ORDER.indexOf(x.rarity);
  const list = (cards || []).map((x, i) => ({ x, i })).sort((a, b) => rk(b.x) - rk(a.x) || (b.x.pts || 0) - (a.x.pts || 0) || a.i - b.i);
  return `<div class="vd-pick-grid">${list.map(({ x, i }) => { const c = cat.get(x.id); if (!c) return '';
    const big = x.rarity === 'M' || x.rarity === 'S', n = g.entry(c.id)?.n || 0, own = !big && n > 0;
    const tag = big ? t('Coffre abyssal à la place') : own ? `${t('Déjà à toi')}${n > 1 ? ` ×${n}` : ''}` : t('Nouvelle !');
    return `<button class="vd-pick-c ${big ? 'big' : ''} ${own ? 'owned' : big ? '' : 'fresh'}" data-v="pick" data-i="${i}" style="--rc:${RARITY[c.rarity]?.color || '#999'}"><span class="vd-pick-im"><img alt="" src="${artUrl(c, { lite: true })}">${own ? `<span class="vd-pick-own"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>` : ''}</span><b>${esc(c.name)}</b><small>${tag}</small></button>`; }).join('')}</div>`;
}
/* v805 : le pseudo entier tient dans sa plaque (la police rapetisse) */
function fitNames(el) {
  el.querySelectorAll('.vd-pname').forEach((n) => {
    n.style.fontSize = '';
    let f = parseFloat(getComputedStyle(n).fontSize), k = 0;
    while (n.scrollWidth > n.clientWidth + 1 && f > 7 && k++ < 40) { f *= 0.94; n.style.fontSize = `${f}px`; }
  });
}
export function playDuel(app, r, out, { foeName, myName, myAvatar, onClose, onPick, onRematch, onReact, table = false, train = false, replay = false } = {}) {
  const g = app.game, cat = app.catalog;
  const mine = r.my_cards || [], theirs = r.their_cards || [];
  const res = out?.result && RES[out.result] ? out.result : r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose';
  const lineup = lineupOf(r);
  // découpe des cartes par booster (3 par booster, ou le nombre d'emplacements du type)
  const sizes = lineup.map((it) => BOOSTERS[it.type]?.slots.length || 3);
  const chunk = (arr) => { const o = []; let k = 0; for (const n of sizes) { o.push(arr.slice(k, k + n)); k += n; } return o; };
  const myPacks = chunk(mine), foePacks = chunk(theirs);
  const ev = g.event();
  const pic = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const cardEl = (c, side, p, i) => { const k = cat.get(c.id); return `<span class="vd-c v-${c.variant} r-${c.rarity}" data-side="${side}" data-p="${p}" data-i="${i}" style="--rc:${RARITY[c.rarity]?.color || '#888'}">
      <span class="vd-in"><span class="vd-back"></span><span class="vd-face">${k ? `<img alt="" src="${artUrl(k, { lite: true })}">` : ''}<small>+${c.pts}</small></span></span></span>`; };
  // v524 : chaque booster est posé dans un plateau de la table (assets/versus/vd-table.webp) ; le premier booster de
  // chaque joueur dans le plateau le plus proche du centre, les suivants vers l'extérieur
  const rows = (packs, side) => packs.map((cs, p) => `<div class="vd-row t${side === 'foe' ? 2 - p : 3 + p}" data-side="${side}" data-p="${p}">${cs.map((c, i) => cardEl(c, side, p, i)).join('')}</div>`).join('');
  /* v807 : série et ligue de chacun, avant le duel (la tienne d'après le résultat encaissé, celle de l'adversaire d'après son profil) */
  const month = today(g.clock()).slice(0, 7);
  const tags = { me: out?.streak ? { s: out.streak.before, l: out.league?.before } : null,
    foe: r.choc && typeof r.choc === 'object' ? { s: +r.choc.s || 0, l: r.choc.m === month ? +r.choc.l || 0 : null } : null };
  const tagHTML = (x) => (x ? `<span class="vd-tags">${x.l != null ? leagueBadge(x.l) : ''}${x.s >= 2 ? flameHTML(x.s) : ''}</span>` : '');
  const plate = (side, name, av) => `<div class="vd-plate ${side}"><span class="vd-pav">${pic(av)}</span><b class="vd-pname">${name}</b><span class="vd-sc" data-sc="${side}">0</span>${tagHTML(tags[side])}</div>`;
  const el = document.createElement('div');
  el.className = `vd ${app.reduced() ? 'rm' : ''} n${lineup.length}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('Le Choc des Boosters'));
  el.innerHTML = `<div class="vd-board"><span class="vd-embers"></span>
      ${plate('foe', esc(foeName), r.avatar)}
      ${rows(foePacks, 'foe')}
      <div class="vd-center"><span class="vd-step"></span><img class="vd-medal" alt="" src="assets/versus/vd-vs.webp"><button class="vd-skip" data-v="all">${icon('skip')}Tout révéler</button></div>
      ${rows(myPacks, 'me')}
      ${plate('me', myName ? esc(myName) : t('Toi'), myAvatar)}
    </div>
    <div class="vd-mid"><div class="vd-pack foe"></div><span class="vd-vs"></span><div class="vd-pack me"></div></div>
    <div class="vd-ban" aria-live="polite"></div>
    <div class="vd-end" hidden></div>`;
  document.body.appendChild(el);
  /* v609 : dos de carte fixe pendant le face-à-face (jusqu'à 18 dos animés à la fois sinon) */
  stillOf(backUrl()).then((u) => { if (u) el.style.setProperty('--card-back', `url("${u}")`); });
  document.body.classList.add('has-sheet', 'lock-scroll');
  requestAnimationFrame(() => { el.classList.add('on'); fitNames(el); });
  document.fonts?.ready?.then(() => fitNames(el));
  const onRs = () => fitNames(el); addEventListener('resize', onRs);

  let speed = app.reduced() || g.s.settings.fastOpen ? 4 : 1, done = false, closed = false;
  const sc = { me: 0, foe: 0 };
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms / speed));
  /* v563 : horloge de la musique (voir musicPlan) ; un toucher (×4) ou « Tout révéler » quitte le calage */
  const plan = musicPlan(lineup.map((_, p) => [...myPacks[p], ...foePacks[p]]));
  let sync = speed === 1 && !table; /* v847 : au Choc (table), les gros plans prennent leur temps : la musique boucle sur ses phrases */
  const t0 = performance.now(), pos = () => plan.start + (performance.now() - t0) / 1000;
  const until = (x, ms) => (!sync ? wait(ms) : new Promise((ok) => {
    const f = () => { if (!sync || done) return ok(); const d = (x - pos()) * 1000; if (d <= 8) return ok(); setTimeout(f, Math.min(d, 250)); };
    f();
  }));
  const pace = (p) => (sync ? plan.scale[p] : 1);
  musicCue('pari', table ? BEAT0 : plan.start);
  let mOff = BEAT0, mAt = performance.now();
  const loopT = table ? setInterval(() => { /* v847 : avant le silence de 42 s, on revient 5 phrases plus tôt (même temps fort) */
    if (done || closed) return clearInterval(loopT);
    const x = mOff + (performance.now() - mAt) / 1000;
    if (x > BEAT0 + 6 * PH - 0.05) { mOff = x - 5 * PH; mAt = performance.now(); musicSeek(mOff); }
  }, 150) : 0;
  const q = (s) => el.querySelector(s);
  const setScore = (side) => { const n = q(`[data-sc="${side}"]`); n.textContent = fmt(sc[side]); n.dataset.len = String(n.textContent.length); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); };
  const lead = () => { q('.vd-plate.me').classList.toggle('lead', sc.me > sc.foe); q('.vd-plate.foe').classList.toggle('lead', sc.foe > sc.me); };
  // v524 : éclat peint (assets/fx/vd-reveal.webp) quand une carte se retourne, plus grand pour une grosse carte
  const burst = (n, k) => {
    if (app.reduced()) return;
    const b = el.getBoundingClientRect(), c = n.getBoundingClientRect(), w = c.width * k;
    const f = document.createElement('span'); f.className = 'kx-sprite vd-fxb';
    f.style.cssText = `left:${c.left - b.left + c.width / 2}px;top:${c.top - b.top + c.height / 2}px;width:${w}px;height:${w}px;--d:${Math.round((k > 2 ? 900 : 650) / speed)}ms;background-image:url(assets/fx/vd-reveal.webp)`;
    el.appendChild(f); setTimeout(() => f.remove(), 1000);
  };

  /* v807 : grand bandeau au milieu de la table (enjeu, renversement, moment décisif) */
  let banT = 0;
  const banner = (html, cls = '', ms = 1800) => {
    const b = q('.vd-ban'); if (!b) return;
    b.className = `vd-ban on ${cls}`; b.innerHTML = html; clearTimeout(banT);
    banT = setTimeout(() => { b.className = 'vd-ban'; }, ms / Math.min(speed, 2));
  };
  /* v807 : avant les boosters, ce qui est en jeu : ta Série ardente, celle de l'adversaire */
  async function stakes() {
    if (speed > 1 || done) return;
    /* v833 : le butin de la table : tout ce qui va sortir est en jeu */
    if (table) {
      const n = mine.length + theirs.length, me = tags.me?.s || 0;
      banner(`${train ? '' : flameHTML(Math.max(1, me), 'big')}<span>${t('<b>{n} cartes</b> vont tomber sur la table.', { n })}<br>${t('Le meilleur total rafle tout.')}${me >= 1 ? `<br>${t('Ta Série ardente : <b>{n}</b>. Une victoire de plus : butin ×{m}.', { n: me, m: String(streakMult(me + 1)).replace('.', ',') })}` : ''}</span>`, 'stake', 2800);
      app.sfx.suspense?.();
      await wait(2400);
      return;
    }
    const me = tags.me?.s || 0, foe = tags.foe?.s || 0, lines = [];
    if (me >= 1) lines.push(t('Ta Série ardente : <b>{n}</b>. Une victoire de plus : butin ×{m}.', { n: me, m: String(streakMult(me + 1)).replace('.', ',') }));
    if (foe >= 2) lines.push(t('{name} est sur une série de <b>{n}</b> : brise-la !', { name: esc(foeName), n: foe }));
    if (!lines.length) return;
    banner(`${flameHTML(Math.max(me, foe), 'big')}<span>${lines.join('<br>')}</span>`, 'stake', 2600);
    app.sfx.suspense?.();
    await wait(2200);
  }
  // un booster de chaque côté : apparition, tremblement, déchirure simultanée, cartes qui jaillissent
  async function tear(p) {
    if (done) return; /* v574 : « Tout révéler » touché pendant l'attente : plus de sachets par-dessus la fin */
    const it = lineup[p];
    const pk = packHTML(it.type, cat, { faction: it.faction, event: it.factions ? { factions: it.factions } : ev });
    const fp = q('.vd-pack.foe'), mp = q('.vd-pack.me');
    fp.innerHTML = packHTML(it.type, cat, { faction: it.faction, event: it.factions ? { factions: it.factions } : ev, skin: it.type === 'standard' ? skinOk(r.sachet) : null }); mp.innerHTML = pk; /* v565 : chacun son sachet */
    q('.vd-step').textContent = lineup.length > 1 ? `${t('Booster')} ${p + 1} / ${lineup.length}` : '';
    [fp, mp].forEach((x) => { x.className = `vd-pack ${x === fp ? 'foe' : 'me'} in`; });
    q('.vd-mid').classList.add('show');
    await until(plan.tears[p] - 1, 550);
    if (done) return;
    /* v807 : les deux sachets s'entrechoquent au milieu de la table avant de se déchirer */
    if (!app.reduced() && speed === 1) {
      [fp, mp].forEach((x) => x.classList.add('clash'));
      app.sfx.suspense?.();
      setTimeout(() => {
        if (done) return;
        const b = el.getBoundingClientRect(), m = q('.vd-vs').getBoundingClientRect(), w = Math.min(b.width * 0.7, 300);
        const f = document.createElement('span'); f.className = 'kx-sprite vd-fxb vd-clashfx';
        f.style.cssText = `left:${m.left - b.left + m.width / 2}px;top:${m.top - b.top + m.height / 2}px;width:${w}px;height:${w}px;--d:600ms;background-image:url(assets/fx/def-clash.webp)`;
        el.appendChild(f); setTimeout(() => f.remove(), 900);
        q('.vd-mid').classList.add('flash'); setTimeout(() => q('.vd-mid')?.classList.remove('flash'), 260);
        app.sfx.parry?.(); haptic('heavy');
      }, 430);
      await wait(700);
      [fp, mp].forEach((x) => x.classList.remove('clash'));
    }
    [fp, mp].forEach((x) => x.classList.add('shake'));
    if (app.reduced() || speed > 1) app.sfx.suspense?.();
    await until(plan.tears[p], 1000);
    if (done) return;
    [fp, mp].forEach((x) => { x.classList.remove('shake'); x.classList.add('torn'); });
    app.sfx['vd-tear']?.();
    await wait(320);
    // les cartes sortent face cachée du sachet et filent vers leur place
    for (const side of ['foe', 'me']) {
      const from = q(`.vd-pack.${side}`).getBoundingClientRect();
      q(`.vd-row[data-side="${side}"][data-p="${p}"]`).querySelectorAll('.vd-c').forEach((c, i) => {
        c.classList.add('out');
        if (app.reduced() || speed > 1) return;
        const to = c.getBoundingClientRect();
        c.animate([{ transform: `translate(${from.left + from.width / 2 - to.left - to.width / 2}px, ${from.top + from.height / 2 - to.top - to.height / 2}px) scale(.3) rotate(${(i - 1) * 25}deg)`, opacity: 0 },
          { opacity: 1, offset: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: i * 90, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      });
    }
    app.sfx.flip?.();
    await wait(760);
    q('.vd-mid').classList.remove('show');
  }
  // une carte se retourne : couleur de rareté, points qui montent au score
  async function reveal(side, p, i) {
    const c = (side === 'me' ? myPacks : foePacks)[p][i];
    const n = q(`.vd-c[data-side="${side}"][data-p="${p}"][data-i="${i}"]`);
    const big = isBig(c);
    if (big && speed === 1) { n.classList.add('tease'); app.sfx.suspensebig?.(); await wait(900 * pace(p)); n.classList.remove('tease'); }
    if (done) return; /* v527 : « Tout révéler » a déjà posé les totaux */
    n.classList.add('on');
    if (big) { n.classList.add('big'); app.sfx['vd-rare']?.(); } else app.sfx['vd-flip']?.();
    burst(n, big ? 3.2 : 1.7);
    const was = sc.me > sc.foe ? 'me' : sc.foe > sc.me ? 'foe' : null;
    sc[side] += c.pts;
    setScore(side); lead();
    /* v807 : dans le dernier booster, celui qui était mené passe devant : renversement */
    const now = sc.me > sc.foe ? 'me' : sc.foe > sc.me ? 'foe' : null;
    if (!done && p === lineup.length - 1 && was && now && was !== now) {
      banner(`<b>${t('Renversement !')}</b>`, `turn ${now}`, 1500);
      app.sfx['vd-rare']?.(); haptic('crit');
      el.classList.remove('jolt'); void el.offsetWidth; el.classList.add('jolt');
    }
    await wait((big ? 900 : 560) * pace(p));
  }
  /* v807 : moment décisif : avant la dernière carte, si elle peut tout changer (ou si l'écart est minime), tout s'arrête */
  async function decisive(side, c) {
    if (done || speed > 1) return;
    const before = Math.sign(sc.me - sc.foe), after = Math.sign((sc.me + (side === 'me' ? c.pts : 0)) - (sc.foe + (side === 'foe' ? c.pts : 0)));
    if (before === after && Math.abs(sc.me - sc.foe) > 10) return;
    const n = q(`.vd-c[data-side="${side}"][data-p="${lineup.length - 1}"][data-i="${(side === 'me' ? myPacks : foePacks).at(-1).length - 1}"]`);
    el.classList.add('decisive'); n?.classList.add('last');
    banner(`<b>${t('Tout se joue sur cette carte')}</b>`, 'decide', 2200);
    app.sfx.suspensebig?.(); haptic('heartbeat');
    await wait(2000);
    el.classList.remove('decisive'); n?.classList.remove('last');
  }
  /* v847 : Choc : la carte de chaque joueur en gros plan face à face (illustration, nom, points), puis elles filent sur la table */
  async function duo(p, i, last) {
    const cs = { foe: foePacks[p][i], me: myPacks[p][i] };
    const sides = ['foe', 'me'].filter((k) => cs[k]);
    if (last && !done && speed === 1) { /* moment décisif : les dernières cartes peuvent tout changer */
      const d0 = sc.me - sc.foe, d1 = d0 + (cs.me?.pts || 0) - (cs.foe?.pts || 0);
      if (Math.sign(d0) !== Math.sign(d1) || Math.abs(d0) <= 10) {
        el.classList.add('decisive'); banner(`<b>${t('Tout se joue sur ces cartes')}</b>`, 'decide', 2200);
        app.sfx.suspensebig?.(); haptic('heartbeat'); await wait(2000); el.classList.remove('decisive');
      }
    }
    if (done) return;
    const face = (k) => { const c = cs[k], kc = c && cat.get(c.id); if (!kc) return '';
      return `<div class="vd-dc ${k} r-${c.rarity} ${c.variant !== 'normal' ? 'fin' : ''}" style="--rc:${RARITY[c.rarity]?.color || '#888'}"><small class="vd-dc-who">${k === 'me' ? (myName ? esc(myName) : t('Toi')) : esc(foeName)}</small>
        <div class="vd-dc-card"><div class="vd-dc-in"><span class="vd-dc-back"></span><span class="vd-dc-face"><img alt="" src="${artUrl(kc)}"></span></div></div>
        <b class="vd-dc-nm">${esc(tw(kc.name))}</b><em class="vd-dc-pts">+${fmt(c.pts)}</em></div>`; };
    const ov = document.createElement('div'); ov.className = 'vd-duo';
    ov.innerHTML = `${face('foe')}<span class="vd-dc-vs"><img alt="" src="assets/versus/vd-vs.webp"></span>${face('me')}`;
    ov.style.setProperty('--sp', String(speed));
    el.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('on'));
    await wait(500);
    for (const k of sides) {
      if (done) break;
      const d = ov.querySelector(`.vd-dc.${k}`), big = isBig(cs[k]);
      if (big && speed === 1) { d.classList.add('tease'); app.sfx.suspensebig?.(); haptic('heartbeat'); await wait(1100); d.classList.remove('tease'); }
      d.classList.add('flip');
      if (big) { d.classList.add('big'); app.sfx['vd-rare']?.(); haptic('crit'); } else app.sfx['vd-flip']?.();
      burst(d.querySelector('.vd-dc-card'), big ? 2.6 : 1.5);
      await wait(big ? 900 : 650);
    }
    if (!done) await wait(1500);
    if (done) { ov.remove(); return; }
    /* elles filent vers leur place sur la table */
    const was = sc.me > sc.foe ? 'me' : sc.foe > sc.me ? 'foe' : null;
    ov.classList.add('go');
    const fly = sides.map((k) => {
      const d = ov.querySelector(`.vd-dc.${k} .vd-dc-card`), n = q(`.vd-c[data-side="${k}"][data-p="${p}"][data-i="${i}"]`);
      if (!d || !n || app.reduced()) return null;
      const a = d.getBoundingClientRect(), b = n.getBoundingClientRect();
      return d.animate([{ transform: 'none' }, { transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(${b.width / a.width})`, opacity: 0.6 }],
        { duration: 520 / speed, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' }).finished.catch(() => {});
    });
    await Promise.all(fly.filter(Boolean));
    ov.remove();
    for (const k of sides) {
      const n = q(`.vd-c[data-side="${k}"][data-p="${p}"][data-i="${i}"]`); if (!n) continue;
      n.classList.add('on'); if (isBig(cs[k])) n.classList.add('big');
      burst(n, 1.2);
      sc[k] += cs[k].pts; setScore(k);
    }
    lead(); app.sfx.flip?.();
    const now = sc.me > sc.foe ? 'me' : sc.foe > sc.me ? 'foe' : null;
    if (p === lineup.length - 1 && was && now && was !== now) {
      banner(`<b>${t('Renversement !')}</b>`, `turn ${now}`, 1500);
      app.sfx['vd-rare']?.(); haptic('crit');
      el.classList.remove('jolt'); void el.offsetWidth; el.classList.add('jolt');
    }
    await wait(450);
  }
  async function run() {
    await stakes();
    const lastP = lineup.length - 1, nLast = Math.max(myPacks[lastP].length, foePacks[lastP].length);
    // la toute dernière carte retournée : la tienne si tu en as autant que l'adversaire
    const final = myPacks[lastP].length >= foePacks[lastP].length ? ['me', myPacks[lastP].length - 1] : ['foe', foePacks[lastP].length - 1];
    const step = async (side, p, i) => { if (p === lastP && side === final[0] && i === final[1]) await decisive(side, (side === 'me' ? myPacks : foePacks)[p][i]); if (!done) await reveal(side, p, i); };
    for (let p = 0; p < lineup.length && !done; p++) {
      await until(plan.tears[p] - APPEAR, p ? 0 : 500);
      if (done) break;
      await tear(p);
      const n = p === lastP ? nLast : Math.max(myPacks[p].length, foePacks[p].length);
      if (table) { for (let i = 0; i < n && !done; i++) await duo(p, i, p === lastP && i === n - 1); }
      else for (let i = 0; i < n && !done; i++) {
        if (i < foePacks[p].length) await step('foe', p, i);
        if (done) break;
        if (i < myPacks[p].length) await step('me', p, i);
      }
      if (!done && p < lineup.length - 1 && !sync) await wait(700);
    }
    if (!done && !table) await until(DROP, 0); /* le silence de la musique, puis le résultat sur l'explosion */
    finish();
  }
  function finish() {
    if (done) return;
    if (!sync || Math.abs(pos() - DROP) > 0.35) musicSeek(DROP - 0.05);
    done = true; sync = false; clearInterval(loopT);
    el.querySelectorAll('.vd-duo').forEach((x) => x.remove());
    el.querySelectorAll('.vd-c').forEach((c) => c.classList.add('out', 'on'));
    sc.me = scoreOf(mine); sc.foe = scoreOf(theirs);
    setScore('me'); setScore('foe'); lead();
    q('.vd-mid').classList.remove('show');
    q('.vd-skip').hidden = true; q('.vd-step').textContent = '';
    /* v735 : chacun garde ses cartes ; le gagnant reçoit le butin du jeu (copie, coffre abyssal, éclats) */
    const nWon = out?.cards?.length || (table && res === 'win' ? mine.length + theirs.length : mine.length); /* v833 : le gagnant rafle toute la table */
    const fresh = (out?.cards || []).filter((c) => c.isNewCard).length;
    const tc = out?.trophy && app.catalog.get(out.trophy.id);
    const loot = [tc ? `<span class="vd-loot"><img alt="" src="${artUrl(tc, { lite: true })}"><span>${t('Copie de <b>{card}</b>', { card: esc(tc.name) })}${out.trophy.isNewCard ? ` <em>${t('Nouvelle !')}</em>` : ''}</span></span>` : '',
      out?.chest ? `<span class="vd-loot"><img alt="" src="assets/icons/chest.webp"><span>${t('Coffre abyssal')}</span></span>` : '',
      out?.shards ? `<span class="vd-loot"><img alt="" src="assets/icons/cur-shard.webp"><span>+${fmt(out.shards)} ${t('éclats')}${out.mult > 1 ? ` <em>×${String(out.mult).replace('.', ',')}</em>` : ''}</span></span>` : '',
      out?.streakChest ? `<span class="vd-loot"><img alt="" src="assets/chests/${out.streakChest}.webp"><span>${t('Coffre de série')}</span></span>` : ''].filter(Boolean).join('');
    /* v807 : Série ardente et Ligue du mois */
    const st = out?.streak, lg = out?.league;
    const streakHTML = !st ? '' : res === 'win' ? `<div class="vd-streak on">${flameHTML(st.after, 'big')}<span>${st.after >= 2 ? t('Série ardente : <b>{n} victoires</b> d’affilée.', { n: st.after }) : t('La Série ardente s’allume.')}${streakMult(st.after + 1) > out.mult ? `<small>${t('Prochaine victoire : butin ×{m}', { m: String(streakMult(st.after + 1)).replace('.', ',') })}</small>` : ''}</span></div>`
      : st.broken ? `<div class="vd-streak out">${flameHTML(st.before, 'big dead')}<span>${t('Ta série de <b>{n} victoires</b> s’éteint.', { n: st.before })}</span></div>`
      : res === 'tie' && st.after >= 2 ? `<div class="vd-streak on">${flameHTML(st.after, 'big')}<span>${t('Égalité : ta série tient toujours.')}</span></div>` : '';
    const leagueHTML = !lg ? '' : `<div class="vd-league ${lg.after > lg.before ? 'up' : lg.after < lg.before ? 'down' : ''}">${leagueBadge(lg.after, 'big')}<span>${lg.after > lg.before ? `<b>${t('Tu montes en ligue {l} !', { l: t(LEAGUES[lg.after].name) })}</b>` : lg.after < lg.before ? `<b>${t('Tu redescends en ligue {l}…', { l: t(LEAGUES[lg.after].name) })}</b>` : `<b>${t('Ligue {l}', { l: t(LEAGUES[lg.after].name) })}</b>`}
      <small>${fmt(lg.pts)} ${t('points')} <em class="${lg.delta >= 0 ? 'pos' : 'neg'}">${lg.delta >= 0 ? '+' : '−'}${Math.abs(lg.delta)}</em>${LEAGUES[lg.after + 1] ? ` · ${t('ligue {l} à {n}', { l: t(LEAGUES[lg.after + 1].name), n: LEAGUES[lg.after + 1].min })}` : ''}</small></span></div>`;
    const canReact = onReact && !r.my_react;
    const noPrize = out && out.counted === 0 && res !== 'lose';
    el.classList.add('end', res);
    const end = q('.vd-end');
    end.hidden = false;
    end.innerHTML = `<div class="vd-burst"></div><img class="vd-emb ${res}" alt="" src="assets/versus/${EMB[res]}.webp"><h2 class="vd-title ${res}">${t(RES[res])}</h2>
      <p class="vd-tally"><b>${fmt(sc.me)}</b> <span>${t('contre')}</span> <b>${fmt(sc.foe)}</b></p>
      ${table ? `<p class="vd-tablemsg ${res}">${replay ? (res === 'tie' ? t('Même total : chacun garde ses cartes.') : `${esc(res === 'win' ? myName : foeName)} rafle la table (partie simulée).`) : train ? t('Entraînement : rien n’est gagné ni perdu.')
        : res === 'win' ? t(fresh ? 'Tu rafles la table : <b>{n} cartes</b> sont à toi, dont <b>{f} nouvelles</b>.' : 'Tu rafles la table : <b>{n} cartes</b> sont à toi.', { n: nWon, f: fresh })
        : res === 'tie' ? t('Même total : chacun garde ses cartes.')
        : t('{name} rafle la table. Tu repars les mains vides.', { name: esc(foeName) })}</p>${res === 'win' && !train && out?.cards?.length ? tableWon(out.cards) : ''}`
      : `<p>${t(fresh ? 'Tu gardes <b>tes {n} cartes</b>, dont <b>{f} nouvelles</b>.' : 'Tu gardes <b>tes {n} cartes</b>.', { n: nWon, f: fresh })}
        ${res === 'win' ? t('Et l’Abysse t’offre le butin :') : res === 'tie' ? t('Même total : chacun reçoit une part du butin.') : t('{name} gagne le butin. Tu ne perds rien.', { name: esc(foeName) })}</p>`}
      ${out?.pick ? `<div class="vd-pick"><p class="small">${t('Choisis ta carte parmi celles de {name} :', { name: esc(foeName) })}</p>${pickGridHTML(app, theirs)}</div>` : ''}
      ${loot ? `<div class="vd-loots">${loot}</div>` : ''}
      ${noPrize ? `<p class="small">${t('Butin du jour déjà gagné : ce duel était pour la gloire.')}</p>` : ''}
      ${streakHTML}${leagueHTML}
      ${canReact ? `<div class="vd-react"><button class="btn small ghost" data-v="react">${BUBBLE}${t('Laisser une réaction')}</button><div class="re-grid vd-regrid" hidden></div></div>` : r.my_react ? `<p class="small muted">${t('Ta réaction')} : ${esc(t(EMOTES_TXT(r.my_react)))}</p>` : ''}
      <div class="vd-endbtns">${table ? `<button class="btn block dc-plq vd-recapbtn" data-v="recap">${icon('cards')}${t('Voir les {n} cartes de la table', { n: mine.length + theirs.length })}</button>` : ''}${onRematch ? `<button class="btn block dc-plq" data-v="rematch">${icon('swords')}${t('Revanche')}</button>` : ''}
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-v="close">${t('Fermer')}</button></div>`;
    if (res === 'win') app.sfx['vd-win']?.(); else if (res === 'lose') app.sfx['vd-lose']?.(); else app.sfx['vd-flip']?.();
    if (st?.broken) setTimeout(() => { if (!closed) haptic('defeat'); }, 600);
    if (lg && lg.after !== lg.before) setTimeout(() => { if (!closed) (lg.after > lg.before ? app.sfx.levelup : app.sfx.error)?.(); }, 900);
    /* v807 : la réaction que l'adversaire t'a laissée sur ce duel */
    if (r.their_react) setTimeout(() => { if (!closed) showEmote(r.their_react, 'foe', foeName); }, 1100);
  }
  /* v844 : récapitulatif en grand des cartes de la table, booster par booster, pour les deux joueurs */
  function recapHTML() {
    const fresh = new Set((out?.cards || []).filter((x) => x.isNewCard).map((x) => x.id));
    const top = Math.max(...[...mine, ...theirs].map((c) => c.pts || 0));
    const big = (c, side) => { const k = cat.get(c.id); if (!k) return ''; const fin = c.variant && c.variant !== 'normal';
      return `<span class="vr-c ${fin ? 'fin' : ''} ${c.pts === top && top > 0 ? 'top' : ''}" style="--rc:${RARITY[c.rarity]?.color || '#999'}">
        <span class="vr-im"><img alt="" loading="lazy" src="${artUrl(k, { lite: true })}"><em class="vr-pts">+${fmt(c.pts || 0)}</em>${side === 'me' && fresh.has(c.id) ? `<i class="vr-new">${t('Nouvelle')}</i>` : ''}</span>
        <b class="vr-nm">${esc(tw(k.name))}</b><small class="vr-rr"><i>${t(RARITY[c.rarity]?.name || c.rarity)}</i>${fin ? ` · ${t(VARIANTS[c.variant]?.name || '')}` : ''}</small></span>`; };
    const side = (packs, who, name, total, won) => `<section class="vr-side ${who} ${won ? 'won' : ''}">
        <h3 class="vr-h"><span>${name}</span><b>${fmt(total)}</b>${won ? `<em>${t('rafle la table')}</em>` : ''}</h3>
        ${packs.map((p, i) => `<div class="vr-pack"><p class="vr-pl">${t(BOOSTERS[lineup[i]?.type]?.name || 'Booster')}</p><div class="vr-row">${p.map((c) => big(c, who)).join('')}</div></div>`).join('')}</section>`;
    const meWon = res === 'win', foeWon = res === 'lose';
    return `<div class="vr"><div class="vr-in"><header class="vr-head"><img class="vr-medal" alt="" src="assets/versus/vd-vs.webp"><h2>${t('Les cartes de la table')}</h2>
        <p class="small">${t('{n} cartes ouvertes', { n: mine.length + theirs.length })}</p></header>
      ${side(myPacks, 'me', myName ? esc(myName) : t('Toi'), sc.me, meWon)}${side(foePacks, 'foe', esc(foeName), sc.foe, foeWon)}
      <button class="btn primary block dc-plq dc-plq-red vr-back" data-v="recapx">${t('Revenir')}</button></div></div>`;
  }
  /* v833 : les cartes raflées, les plus rares d'abord */
  function tableWon(cards) {
    const rk = (x) => RARITY_ORDER.indexOf(x.rarity);
    const list = cards.map((x) => ({ x, c: cat.get(x.id) })).filter((o) => o.c).sort((a, b) => rk(b.x) - rk(a.x));
    return `<div class="vd-twon">${list.map(({ x, c }) => `<span class="vd-tw ${x.isNewCard ? 'fresh' : ''}" style="--rc:${RARITY[c.rarity]?.color || '#999'}"><img alt="" src="${artUrl(c, { lite: true })}">${x.isNewCard ? `<em>${t('Nouvelle')}</em>` : ''}</span>`).join('')}</div>`;
  }
  function close(silent) {
    if (closed) return;
    closed = true; done = true; sync = false;
    musicRelease();
    removeEventListener('resize', onRs);
    el.classList.remove('on');
    document.body.classList.remove('has-sheet', 'lock-scroll');
    setTimeout(() => el.remove(), 300);
    if (silent !== true) onClose?.();
  }
  el.__kill = () => close(true); /* v841 : l'écran quitté ferme le face-à-face (il restait par-dessus l'Accueil) */
  let picking = false;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b?.dataset.v === 'close') return close();
    if (b?.dataset.v === 'recap') { el.querySelector('.vr')?.remove(); el.insertAdjacentHTML('beforeend', recapHTML()); app.sfx['vd-flip']?.(); return; }
    if (b?.dataset.v === 'recapx') { el.querySelector('.vr')?.remove(); return; }
    if (b?.dataset.v === 'all') return finish();
    if (b?.dataset.v === 'rematch') { close(); onRematch?.(); return; }
    if (b?.dataset.v === 'react') {
      const grid = el.querySelector('.vd-regrid');
      if (grid.hidden) grid.innerHTML = g.emotesOwned().map((k) => `<button class="re-pick" data-v="re" data-re="${k}">${emoteHTML(k)}</button>`).join('');
      grid.hidden = !grid.hidden; app.sfx.tap?.(); return;
    }
    if (b?.dataset.v === 're' && onReact) {
      const k = b.dataset.re, box = el.querySelector('.vd-react');
      if (!box || box.dataset.busy) return; box.dataset.busy = '1';
      onReact(k).then(() => { r.my_react = k; box.outerHTML = `<p class="small muted">${t('Ta réaction')} : ${esc(t(EMOTES_TXT(k)))}</p>`; showEmote(k, 'me', ''); })
        .catch(() => { delete box.dataset.busy; });
      return;
    }
    if (b?.dataset.v === 'pick' && onPick && !picking) {
      picking = true;
      el.querySelectorAll('.vd-pick-c').forEach((x) => x.classList.toggle('on', x === b));
      onPick(+b.dataset.i).then((o) => {
        const tc = o?.trophy && app.catalog.get(o.trophy.id);
        const box = el.querySelector('.vd-pick');
        if (box) box.outerHTML = `<div class="vd-loots">${tc ? `<span class="vd-loot"><img alt="" src="${artUrl(tc, { lite: true })}"><span>${t('Copie de <b>{card}</b>', { card: esc(tc.name) })}${o.trophy.isNewCard ? ` <em>${t('Nouvelle !')}</em>` : ''}</span></span>` : ''}${o?.chest ? `<span class="vd-loot"><img alt="" src="assets/icons/chest.webp"><span>${t('Coffre abyssal')}</span></span>` : ''}</div>`;
        app.sfx.achievement?.();
      }).catch(() => { picking = false; el.querySelectorAll('.vd-pick-c').forEach((x) => x.classList.remove('on')); });
      return;
    }
    if (!done) { speed = 4; sync = false; }
  });
  run();
  return { close };
}
