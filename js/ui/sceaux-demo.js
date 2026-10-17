// v329 : aide animée des Duels des Sceaux. Pour chaque règle, une petite scène sur un plateau 3 × 3 qui se joue
// étape par étape (lecture automatique en boucle, ou pas à pas), avec une phrase d'explication par étape.
// Les valeurs sont celles d'une carte : [haut, droite, bas, gauche]. Cartes bleues = toi, rouges = l'adversaire.
import { openSheet, esc } from './dom.js';
import * as SC from '../core/sceaux.js';

const SIDES = ['t', 'r', 'b', 'l'];
// c(valeurs, camp, options) : une carte posée ; m(marque) : une case vide marquée (+ bénie, − maudite)
const c = (v, o, x = {}) => ({ v, o, ...x });
const m = (mark) => ({ mark });

export const SCENES = {
  base: { name: 'Capturer', frames: [
    { cells: [null, null, null, null, c([5, 4, 6, 3], 'o'), null, null, null, null], cap: 'L’adversaire (rouge) a posé une carte. Chaque carte a quatre valeurs, une par côté.' },
    { cells: [null, null, null, c([4, 6, 2, 5], 'p', { new: 1, hl: 'r' }), c([5, 4, 6, 3], 'o', { hl: 'l' }), null, null, null, null], cap: 'Tu poses ta carte (bleue) juste à sa gauche : ton 6 fait face à son 3.' },
    { cells: [null, null, null, c([4, 6, 2, 5], 'p', { hl: 'r' }), c([5, 4, 6, 3], 'p', { flip: 1, hl: 'l' }), null, null, null, null], cap: '6 est plus grand que 3 : sa carte est capturée et passe à ta couleur.' },
    { cells: [null, c([3, 5, 4, 2], 'o', { new: 1, hl: 'b' }), null, c([4, 6, 2, 5], 'p'), c([5, 4, 6, 3], 'p', { hl: 't' }), null, null, null, null], cap: 'Il pose au-dessus : son 4 contre ton 5. Plus petit : rien ne se passe. À égalité non plus.' },
    { cells: [null, c([3, 5, 4, 2], 'o'), null, c([4, 6, 2, 5], 'p'), c([5, 4, 6, 3], 'p'), null, null, null, null], cap: 'Après les 9 poses, celui qui a le plus de cartes à sa couleur gagne.' },
  ] },
  identique: { name: 'Identique', frames: [
    { cells: [null, c([3, 5, 4, 6], 'o'), null, c([2, 7, 5, 3], 'o'), null, null, c([3, 4, 2, 6], 'o'), null, null], cap: 'Identique : on regarde les valeurs ÉGALES, pas les plus fortes.' },
    { cells: [null, c([3, 5, 4, 6], 'o', { hl: 'b' }), null, c([2, 7, 5, 3], 'o', { hl: 'r' }), c([4, 6, 2, 7], 'p', { new: 1, hl: 'tl' }), null, c([3, 4, 2, 6], 'o'), null, null], cap: 'Ton 4 touche un 4, et ton 7 touche un 7 : deux égalités, avec deux cartes voisines.' },
    { cells: [null, c([3, 5, 4, 6], 'p', { flip: 1, hl: 'b' }), null, c([2, 7, 5, 3], 'p', { flip: 1, hl: 'r' }), c([4, 6, 2, 7], 'p', { hl: 'tl' }), null, c([3, 4, 2, 6], 'o'), null, null], cap: 'Deux égalités ou plus : ces deux cartes sont capturées, même si tu n’es pas plus fort.' },
    { cells: [null, c([3, 5, 4, 6], 'p'), null, c([2, 7, 5, 3], 'p', { hl: 'b' }), c([4, 6, 2, 7], 'p'), null, c([3, 4, 2, 6], 'o', { hl: 't' }), null, null], cap: 'Combo : une carte capturée attaque à son tour. Son 5 fait face au 3 de la carte du dessous…' },
    { cells: [null, c([3, 5, 4, 6], 'p'), null, c([2, 7, 5, 3], 'p', { hl: 'b' }), c([4, 6, 2, 7], 'p'), null, c([3, 4, 2, 6], 'p', { flip: 1, hl: 't' }), null, null], cap: '…5 est plus grand que 3 : capturée aussi, en cascade. Trois cartes d’un coup.' },
  ] },
  somme: { name: 'Somme', frames: [
    { cells: [null, c([3, 6, 5, 2], 'o'), null, c([4, 2, 6, 5], 'o'), null, null, null, null, null], cap: 'Somme : on additionne ta valeur et celle d’en face, de chaque côté.' },
    { cells: [null, c([3, 6, 5, 2], 'o', { hl: 'b' }), null, c([4, 2, 6, 5], 'o', { hl: 'r' }), c([4, 3, 5, 7], 'p', { new: 1, hl: 'tl', sum: { t: '4 + 5 = 9', l: '7 + 2 = 9' } }), null, null, null, null], cap: 'En haut : 4 + 5 = 9. À gauche : 7 + 2 = 9. Deux fois la même somme.' },
    { cells: [null, c([3, 6, 5, 2], 'p', { flip: 1 }), null, c([4, 2, 6, 5], 'p', { flip: 1 }), c([4, 3, 5, 7], 'p', { hl: 'tl' }), null, null, null, null], cap: 'Même somme avec deux voisines ou plus : elles sont capturées. Puis le Combo continue, comme pour Identique.' },
  ] },
  sacre: { name: 'Cases sacrées', frames: [
    { cells: [null, null, null, null, m('+'), null, null, null, m('−')], cap: 'Deux cases spéciales : une bénie (+) et une maudite (−).' },
    { cells: [null, null, null, null, c([5, 6, 4, 7], 'p', { new: 1, mark: '+', bonus: 1 }), null, null, null, m('−')], cap: 'Une carte posée sur la case bénie gagne +1 sur ses quatre valeurs (4 5 3 6 devient 5 6 4 7).' },
    { cells: [null, null, null, null, c([5, 6, 4, 7], 'p', { mark: '+', bonus: 1 }), null, null, null, c([5, 3, 4, 2], 'o', { new: 1, mark: '−', malus: 1 })], cap: 'Sur la case maudite, c’est −1 partout. Choisis bien où tu poses tes cartes faibles.' },
  ] },
  instable: { name: 'Plateau instable', frames: [
    { cells: [null, null, m('+'), null, null, null, m('−'), null, null], cap: 'Plateau instable : une case bénie (+1) et une case maudite (−1)…' },
    { cells: [null, null, m('+'), null, c([4, 5, 6, 3], 'p', { new: 1 }), null, m('−'), null, null], cap: 'Une première pose…' },
    { cells: [null, null, m('+'), c([5, 2, 4, 6], 'o', { new: 1 }), c([4, 5, 6, 3], 'p'), null, m('−'), null, null], cap: '…puis une deuxième…' },
    { cells: [m('−'), null, null, c([5, 2, 4, 6], 'o'), c([4, 5, 6, 3], 'p'), null, null, null, m('+')], cap: '…et les deux cases changent de place. Toutes les deux poses, regarde où elles sont parties.' },
  ] },
  faction: { name: 'Fraternité', frames: [
    { cells: [c([5, 6, 2, 7], 'p', { fac: 1 }), c([3, 4, 6, 7], 'p', { fac: 1 }), c([6, 3, 5, 6], 'p', { fac: 1 }), null, null, null, null, null, null], cap: 'Dans ta main : trois cartes de la même faction (même emblème).' },
    { cells: [c([5, 6, 2, 7], 'p', { fac: 1, hl: 'b' }), c([3, 4, 6, 7], 'p', { fac: 1, hl: 't' }), c([6, 3, 5, 6], 'p', { fac: 1, hl: 'r' }), null, null, null, null, null, null], cap: 'La Fraternité repère la valeur la plus faible de chacune…' },
    { cells: [c([5, 6, 3, 7], 'p', { fac: 1, hl: 'b', up: 'b' }), c([4, 4, 6, 7], 'p', { fac: 1, hl: 't', up: 't' }), c([6, 4, 5, 6], 'p', { fac: 1, hl: 'r', up: 'r' }), null, null, null, null, null, null], cap: '…et lui donne +1, pour toute la partie. Il faut au moins 3 cartes d’une même faction.' },
  ] },
  perks: { name: 'Pouvoirs de rareté', frames: [
    { cells: [null, null, null, null, c([5, 4, 6, 3], 'o', { shield: 1 }), null, null, null, null], cap: 'Inviolable (Hyper rares et Secrètes) : un bouclier doré.' },
    { cells: [null, null, null, c([4, 7, 2, 5], 'p', { new: 1, hl: 'r' }), c([5, 4, 6, 3], 'o', { shield: 1, hl: 'l' }), null, null, null, null], cap: 'Ton 7 bat son 3 : normalement, elle serait capturée…' },
    { cells: [null, null, null, c([4, 7, 2, 5], 'p'), c([5, 4, 6, 3], 'o', { broke: 1 }), null, null, null, null], cap: '…mais le bouclier encaisse la première capture et tombe. La suivante passera.' },
    { cells: [null, c([3, 5, 4, 6], 'o', { hl: 'b' }), null, null, c([4, 6, 2, 5], 'p', { new: 1, fire: 1, hl: 't' }), null, null, null, null], cap: 'Fureur (Mythiques et Secrètes) : quand tu la poses, elle capture aussi à égalité. 4 contre 4…' },
    { cells: [null, c([3, 5, 4, 6], 'p', { flip: 1, hl: 'b' }), null, null, c([4, 6, 2, 5], 'p', { fire: 1, hl: 't' }), null, null, null, null], cap: '…capturée. Les Secrètes ont les deux pouvoirs.' },
  ] },
};
// Scènes à montrer pour chaque règle d'adversaire
export const RULE_SCENES = {
  classique: ['base', 'perks'], sacre: ['sacre', 'base'], instable: ['instable', 'base'], faction: ['faction', 'base'],
  identique: ['identique', 'base'], somme: ['somme', 'base'], abime: ['identique', 'somme', 'sacre'], usure: ['identique', 'sacre'],
  archive: ['somme', 'faction'], neant: ['identique', 'somme', 'faction', 'instable'],
};

const valHTML = (cell) => SIDES.map((sd, i) => {
  const hl = cell.hl?.includes(sd) ? ' hl' : '', up = cell.up === sd ? ' up' : '';
  return `<i class="sd-v sd-${sd}${hl}${up}">${cell.v[i]}${cell.sum?.[sd] ? `<em class="sd-sum">${esc(cell.sum[sd])}</em>` : ''}</i>`;
}).join('');
function cellHTML(cell) {
  if (!cell) return '<span class="sd-cell"></span>';
  const mk = cell.mark ? `<span class="sd-mark ${cell.mark === '+' ? 'good' : 'bad'}">${cell.mark}</span>` : '';
  if (!cell.v) return `<span class="sd-cell">${mk}</span>`;
  const cls = ['sd-card', cell.o === 'p' ? 'p' : 'o', cell.new ? 'new' : '', cell.flip ? 'flip' : '', cell.bonus ? 'bonus' : '', cell.malus ? 'malus' : '', cell.fac ? 'fac' : ''].filter(Boolean).join(' ');
  return `<span class="sd-cell">${mk}<span class="${cls}">${valHTML(cell)}${cell.shield ? '<img class="sd-pk" alt="" src="assets/icons/pk-rempart.webp">' : ''}${cell.broke ? '<img class="sd-pk broke" alt="" src="assets/icons/pk-rempart.webp">' : ''}${cell.fire ? '<img class="sd-pk" alt="" src="assets/icons/pk-fureur.webp">' : ''}${cell.fac ? '<img class="sd-fac" alt="" src="assets/icons/sc-faction.webp">' : ''}${cell.bonus ? '<b class="sd-tag good">+1</b>' : ''}${cell.malus ? '<b class="sd-tag bad">−1</b>' : ''}</span></span>`;
}

// Ouvre l'aide d'une règle (ou de toutes) dans une fenêtre. reduced : pas de lecture automatique.
export function openRuleHelp(app, ruleKey = 'classique', { onAll } = {}) {
  const rule = SC.RULES[ruleKey] || SC.RULES.classique;
  const scenes = RULE_SCENES[ruleKey] || ['base'];
  let si = 0, fi = 0, timer = null, playing = !app.reduced?.();
  const sh = openSheet('', { label: `Règle : ${rule.name}`, cls: 'sd-sheet', onClose: () => clearTimeout(timer) });
  function draw() {
    const sc = SCENES[scenes[si]], fr = sc.frames[fi];
    sh.setContent(`<div class="sd">
      <h2 class="center">${esc(rule.name)}</h2>
      <p class="small center sd-desc">${esc(rule.desc)}</p>
      ${scenes.length > 1 ? `<div class="seg wide sd-tabs" role="group" aria-label="Exemples">${scenes.map((k, i) => `<button class="seg-b" data-sd="scene" data-i="${i}" aria-pressed="${i === si}">${esc(SCENES[k].name)}</button>`).join('')}</div>` : `<p class="sd-k center">${esc(sc.name)}</p>`}
      <div class="sd-board" aria-hidden="true">${fr.cells.map(cellHTML).join('')}</div>
      <p class="sd-cap" aria-live="polite"><b>${fi + 1}/${sc.frames.length}</b> ${esc(fr.cap)}</p>
      <div class="sd-ctl"><button class="btn small ghost" data-sd="prev" aria-label="Étape précédente">‹</button><button class="btn small ghost" data-sd="play">${playing ? 'Pause' : 'Lecture'}</button><button class="btn small ghost" data-sd="next" aria-label="Étape suivante">›</button></div>
      <p class="small muted center">Bleu : tes cartes · Rouge : l’adversaire</p>
      ${onAll ? '<button class="btn small ghost block" data-sd="all">Toutes les règles des Sceaux</button>' : ''}
    </div>`);
    clearTimeout(timer);
    if (playing) timer = setTimeout(() => { fi = (fi + 1) % sc.frames.length; draw(); }, fi === sc.frames.length - 1 ? 3200 : 2400);
  }
  sh.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sd]'); if (!b) return;
    const k = b.dataset.sd, n = SCENES[scenes[si]].frames.length;
    if (k === 'all') { sh.close(); onAll?.(); return; }
    if (k === 'scene') { si = +b.dataset.i; fi = 0; }
    if (k === 'prev') { fi = (fi - 1 + n) % n; playing = false; }
    if (k === 'next') { fi = (fi + 1) % n; playing = false; }
    if (k === 'play') playing = !playing;
    app.sfx?.tap?.();
    draw();
  });
  draw();
  return sh;
}
