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

const RES = { win: 'Victoire', tie: 'Égalité', lose: 'Défaite' };
const EMB = { win: 'vd-win', lose: 'vd-lose', tie: 'vd-tie' }; /* v524 : emblèmes Gemini de fin (v526 : égalité) */
const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);

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
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => el.classList.add('on'));

  let speed = app.reduced() || g.s.settings.fastOpen ? 4 : 1, done = false, closed = false;
  const sc = { me: 0, foe: 0 };
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms / speed));
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
    const it = lineup[p];
    const pk = packHTML(it.type, cat, { faction: it.faction, event: it.factions ? { factions: it.factions } : ev });
    const fp = q('.vd-pack.foe'), mp = q('.vd-pack.me');
    fp.innerHTML = pk; mp.innerHTML = pk;
    q('.vd-step').textContent = lineup.length > 1 ? `${t('Booster')} ${p + 1} / ${lineup.length}` : '';
    [fp, mp].forEach((x) => { x.className = `vd-pack ${x === fp ? 'foe' : 'me'} in`; });
    q('.vd-mid').classList.add('show');
    await wait(550);
    [fp, mp].forEach((x) => x.classList.add('shake'));
    app.sfx.suspense?.();
    await wait(1000);
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
    const big = RI(c.rarity) >= RI('HR') || c.variant !== 'normal';
    if (big && speed === 1) { n.classList.add('tease'); app.sfx.suspensebig?.(); await wait(900); n.classList.remove('tease'); }
    if (done) return; /* v527 : « Tout révéler » a déjà posé les totaux */
    n.classList.add('on');
    if (big) { n.classList.add('big'); app.sfx['vd-rare']?.(); } else app.sfx['vd-flip']?.();
    burst(n, big ? 3.2 : 1.7);
    sc[side] += c.pts;
    setScore(side); lead();
    await wait(big ? 900 : 560);
  }
  async function run() {
    await wait(500);
    for (let p = 0; p < lineup.length && !done; p++) {
      await tear(p);
      const n = Math.max(myPacks[p].length, foePacks[p].length);
      for (let i = 0; i < n && !done; i++) {
        if (i < foePacks[p].length) await reveal('foe', p, i);
        if (done) break;
        if (i < myPacks[p].length) await reveal('me', p, i);
      }
      if (!done && p < lineup.length - 1) await wait(700);
    }
    finish();
  }
  function finish() {
    if (done) return;
    done = true;
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
    closed = true; done = true;
    el.classList.remove('on');
    document.body.classList.remove('has-sheet');
    setTimeout(() => el.remove(), 300);
    onClose?.();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (b?.dataset.v === 'close') return close();
    if (b?.dataset.v === 'all') return finish();
    if (!done) speed = 4;
  });
  run();
  return { close };
}
