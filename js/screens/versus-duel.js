// v521 : le face-à-face du Pari des Boosters, en plein écran (demande du propriétaire : « que ça prenne l'écran entier,
// un beau décor, les boosters déchirés en même temps, les 3 cartes qui sortent, puis on enchaîne… et du suspense »).
// Pour chaque booster de la composition : les deux sachets apparaissent face à face, tremblent, se déchirent ensemble,
// les cartes jaillissent face cachée vers leur place, puis se retournent une à une, en alternance, avec leurs points.
// Un toucher accélère (×4) ; « Tout révéler » termine d'un coup.
import { BOOSTERS, RARITY } from '../config.js';
import { lineupOf, scoreOf } from '../core/versus.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, fmt } from '../ui/dom.js';
import { packHTML } from './shop.js';
import { t } from '../i18n.js';
import { musicCue, musicSeek, musicRelease } from '../ui/music.js';
import { skinOk } from '../ui/vitrine.js';

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

export function playDuel(app, r, out, { foeName, myAvatar, onClose } = {}) {
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
  const plate = (side, name, av) => `<div class="vd-plate ${side}"><span class="vd-pav">${pic(av)}</span><b class="vd-pname">${name}</b><span class="vd-sc" data-sc="${side}">0</span></div>`;
  const el = document.createElement('div');
  el.className = `vd ${app.reduced() ? 'rm' : ''} n${lineup.length}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('Le Pari des Boosters'));
  el.innerHTML = `<div class="vd-board"><span class="vd-embers"></span>
      ${plate('foe', esc(foeName), r.avatar)}
      ${rows(foePacks, 'foe')}
      <div class="vd-center"><span class="vd-step"></span><img class="vd-medal" alt="" src="assets/versus/vd-vs.webp"><button class="vd-skip" data-v="all">${icon('skip')}Tout révéler</button></div>
      ${rows(myPacks, 'me')}
      ${plate('me', t('Toi'), myAvatar)}
    </div>
    <div class="vd-mid"><div class="vd-pack foe"></div><span class="vd-vs"></span><div class="vd-pack me"></div></div>
    <div class="vd-end" hidden></div>`;
  document.body.appendChild(el);
  document.body.classList.add('has-sheet', 'lock-scroll');
  requestAnimationFrame(() => el.classList.add('on'));

  let speed = app.reduced() || g.s.settings.fastOpen ? 4 : 1, done = false, closed = false;
  const sc = { me: 0, foe: 0 };
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms / speed));
  /* v563 : horloge de la musique (voir musicPlan) ; un toucher (×4) ou « Tout révéler » quitte le calage */
  const plan = musicPlan(lineup.map((_, p) => [...myPacks[p], ...foePacks[p]]));
  let sync = speed === 1;
  const t0 = performance.now(), pos = () => plan.start + (performance.now() - t0) / 1000;
  const until = (x, ms) => (!sync ? wait(ms) : new Promise((ok) => {
    const f = () => { if (!sync || done) return ok(); const d = (x - pos()) * 1000; if (d <= 8) return ok(); setTimeout(f, Math.min(d, 250)); };
    f();
  }));
  const pace = (p) => (sync ? plan.scale[p] : 1);
  musicCue('pari', plan.start);
  const q = (s) => el.querySelector(s);
  const setScore = (side) => { const n = q(`[data-sc="${side}"]`); n.textContent = fmt(sc[side]); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); };
  const lead = () => { q('.vd-plate.me').classList.toggle('lead', sc.me > sc.foe); q('.vd-plate.foe').classList.toggle('lead', sc.foe > sc.me); };
  // v524 : éclat peint (assets/fx/vd-reveal.webp) quand une carte se retourne, plus grand pour une grosse carte
  const burst = (n, k) => {
    if (app.reduced()) return;
    const b = el.getBoundingClientRect(), c = n.getBoundingClientRect(), w = c.width * k;
    const f = document.createElement('span'); f.className = 'kx-sprite vd-fxb';
    f.style.cssText = `left:${c.left - b.left + c.width / 2}px;top:${c.top - b.top + c.height / 2}px;width:${w}px;height:${w}px;--d:${Math.round((k > 2 ? 900 : 650) / speed)}ms;background-image:url(assets/fx/vd-reveal.webp)`;
    el.appendChild(f); setTimeout(() => f.remove(), 1000);
  };

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
    [fp, mp].forEach((x) => x.classList.add('shake'));
    app.sfx.suspense?.();
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
    sc[side] += c.pts;
    setScore(side); lead();
    await wait((big ? 900 : 560) * pace(p));
  }
  async function run() {
    for (let p = 0; p < lineup.length && !done; p++) {
      await until(plan.tears[p] - APPEAR, p ? 0 : 500);
      if (done) break;
      await tear(p);
      const n = Math.max(myPacks[p].length, foePacks[p].length);
      for (let i = 0; i < n && !done; i++) {
        if (i < foePacks[p].length) await reveal('foe', p, i);
        if (done) break;
        if (i < myPacks[p].length) await reveal('me', p, i);
      }
      if (!done && p < lineup.length - 1 && !sync) await wait(700);
    }
    if (!done) await until(DROP, 0); /* le silence de la musique, puis le résultat sur l'explosion */
    finish();
  }
  function finish() {
    if (done) return;
    if (!sync || Math.abs(pos() - DROP) > 0.35) musicSeek(DROP - 0.05);
    done = true; sync = false;
    el.querySelectorAll('.vd-c').forEach((c) => c.classList.add('out', 'on'));
    sc.me = scoreOf(mine); sc.foe = scoreOf(theirs);
    setScore('me'); setScore('foe'); lead();
    q('.vd-mid').classList.remove('show');
    q('.vd-skip').hidden = true; q('.vd-step').textContent = '';
    const nWon = out?.cards?.length || (res === 'win' ? mine.length + theirs.length : res === 'tie' ? mine.length : 0);
    const fresh = (out?.cards || []).filter((c) => c.isNewCard).length;
    el.classList.add('end', res);
    const end = q('.vd-end');
    end.hidden = false;
    end.innerHTML = `<div class="vd-burst"></div><img class="vd-emb ${res}" alt="" src="assets/versus/${EMB[res]}.webp"><h2 class="vd-title ${res}">${t(RES[res])}</h2>
      <p class="vd-tally"><b>${fmt(sc.me)}</b> <span>${t('contre')}</span> <b>${fmt(sc.foe)}</b></p>
      <p>${res === 'win' ? t(fresh ? 'Tu remportes <b>les {n} cartes</b> du duel, dont <b>{f} nouvelles</b> !' : 'Tu remportes <b>les {n} cartes</b> du duel !', { n: nWon, f: fresh })
        : res === 'tie' ? t('Même total : tu gardes <b>les {n} cartes</b> de tes boosters.', { n: nWon }) : t('{name} remporte toutes les cartes.', { name: esc(foeName) })}</p>
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-v="close">${t('Fermer')}</button>`;
    if (res === 'win') app.sfx['vd-win']?.(); else if (res === 'lose') app.sfx['vd-lose']?.(); else app.sfx['vd-flip']?.();
  }
  function close() {
    if (closed) return;
    closed = true; done = true; sync = false;
    musicRelease();
    el.classList.remove('on');
    document.body.classList.remove('has-sheet', 'lock-scroll');
    setTimeout(() => el.remove(), 300);
    onClose?.();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b?.dataset.v === 'close') return close();
    if (b?.dataset.v === 'all') return finish();
    if (!done) { speed = 4; sync = false; }
  });
  run();
  return { close };
}
