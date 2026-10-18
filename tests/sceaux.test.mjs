// Duels des Sceaux : valeurs, captures, fin de partie, IA, récompenses plafonnées, sauvegarde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as SC from '../js/core/sceaux.js';
import { migrate, defaultSave } from '../js/core/save.js';

const catalog = loadCatalog();
const ids = catalog.cards.map((c) => c.id);
const clock = () => new Date(2026, 9, 12, 12);
// Partie vide et contrôlée : mains fixées, règle classique, joueur qui commence
function game(first = 'p', rule = 'classique') {
  const st = SC.newGame(catalog, { hand: ids.slice(0, 5), rival: SC.RIVAL.initie, seed: 3 });
  st.rule = rule; st.cells = { blessed: null, cursed: null }; st.turn = first; st.first = first;
  st.hands.o = ids.slice(5, 10);
  return st;
}

test('valeurs : total 20 pour toute carte, de 1 à 10, stables', () => {
  for (const c of catalog.cards) {
    const v = SC.sideValues(c);
    assert.equal(v.reduce((a, b) => a + b, 0), 20, c.id);
    assert.ok(v.every((x) => x >= 1 && x <= 10));
    assert.deepEqual(SC.sideValues(c), v);
  }
  assert.equal(SC.showVal(10), 'A');
});

test('capture dans chacune des quatre directions, et pas à valeur égale', () => {
  for (let d = 0; d < 4; d++) {
    const cell = SC.neighbors(4)[(d + 2) % 4]; // case voisine du centre, dont le côté d regarde le centre
    for (const [want, flipped] of [[(v) => v > 5, true], [(v) => v === 5, false], [(v) => v < 5, false]]) {
      const st = game('p');
      st.board[4] = { id: ids[5], owner: 'o', vals: [5, 5, 5, 5] }; st.placed = 1;
      st.hands.p = [ids.find((id) => want(SC.sideValues(catalog.get(id))[d]))];
      const flips = SC.place(catalog, st, 'p', 0, cell);
      assert.equal(flips.length, flipped ? 1 : 0, `direction ${d}`);
      assert.equal(st.board[4].owner, flipped ? 'p' : 'o');
    }
  }
});

test('case prise, mauvais tour et carte absente sont refusés', () => {
  const st = game('p');
  SC.place(catalog, st, 'p', 0, 0);
  assert.throws(() => SC.place(catalog, st, 'p', 0, 1), /tour/);
  assert.throws(() => SC.place(catalog, st, 'o', 0, 0), /prise/);
  assert.throws(() => SC.place(catalog, st, 'o', 9, 1), /introuvable/);
  assert.throws(() => SC.place(catalog, st, 'o', 0, 9), /prise/);
});

test('la partie se termine après 9 poses ; le total compte la carte restée en main', () => {
  for (let seed = 0; seed < 30; seed++) {
    const st = game(seed % 2 ? 'p' : 'o');
    const rnd = rngFrom(seed);
    while (!st.over) { const m = SC.aiMove(catalog, st, 2, rnd); assert.ok(m, 'l’IA trouve toujours un coup'); SC.place(catalog, st, st.turn, m[0], m[1]); }
    assert.equal(st.placed, 9);
    assert.ok(st.board.every(Boolean));
    assert.equal(st.final.p + st.final.o, 10);
    const heart = st.board[SC.CENTER].owner;
    assert.equal(st.over, st.final.p > 5 ? 'won' : st.final.p < 5 ? 'lost' : heart === 'p' ? 'won' : 'lost', 'à 5 contre 5, le cœur du Sceau départage');
    assert.equal(st.tiebreak, st.final.p === 5);
    assert.throws(() => SC.place(catalog, st, st.turn, 0, 0), /terminée/);
  }
});

test('règles spéciales : cases bénie / maudite, plateau instable, fraternité', () => {
  const st = game('p', 'sacre');
  st.cells = { blessed: 0, cursed: 8 };
  const id = st.hands.p[0], base = SC.sideValues(catalog.get(id));
  assert.deepEqual(SC.valuesOn(catalog, st, id, 0, 'p'), base.map((x) => Math.min(10, x + 1)));
  assert.deepEqual(SC.valuesOn(catalog, st, id, 8, 'p'), base.map((x) => Math.max(1, x - 1)));
  const ins = SC.newGame(catalog, { hand: ids.slice(0, 5), rival: { ...SC.RIVAL.initie, rule: 'instable' }, seed: 11 });
  const seen = new Set([JSON.stringify(ins.cells)]);
  const rnd = rngFrom('i');
  while (!ins.over) { const m = SC.aiMove(catalog, ins, 1, rnd); SC.place(catalog, ins, ins.turn, m[0], m[1]); seen.add(JSON.stringify(ins.cells)); if (ins.cells.blessed != null) assert.equal(ins.board[ins.cells.blessed], null); }
  assert.ok(seen.size >= 2, 'les cases bougent');
  const fr = catalog.cards.filter((c) => c.faction === 'infernal').slice(0, 5).map((c) => c.id);
  const f = SC.newGame(catalog, { hand: fr, rival: { ...SC.RIVAL.initie, rule: 'faction' }, seed: 1 });
  assert.equal(f.fac.p, 'infernal');
  const v = SC.valuesOn(catalog, f, fr[0], 4, 'p'), b = SC.sideValues(catalog.get(fr[0]));
  assert.equal(v.reduce((a, c) => a + c, 0), 21);
  assert.equal(Math.min(...v) >= Math.min(...b), true);
});

test('IA : les niveaux élevés battent les niveaux bas', () => {
  let hi = 0, lo = 0;
  for (let s = 0; s < 40; s++) {
    const st = game(s % 2 ? 'p' : 'o');
    const r = rngFrom(`ai${s}`);
    while (!st.over) { const lvl = st.turn === 'o' ? 4 : 1; const m = SC.aiMove(catalog, st, lvl, r); SC.place(catalog, st, st.turn, m[0], m[1]); }
    if (st.over === 'lost') hi++; else if (st.over === 'won') lo++;
  }
  assert.ok(hi > lo * 2, `niveau 4 : ${hi} victoires, niveau 1 : ${lo}`);
});

function play(g, rival) {
  g.sceauxStart(rival ? { rival } : { daily: true });
  const st = g.s.sceaux.cur, r = rngFrom('pl');
  while (!st.over) { if (st.turn === 'o') g.sceauxAi(); else { const m = SC.aiMove(catalog, st, 4, r); g.sceauxPlay(m[0], m[1]); } }
  return st;
}
function forceWin(g, rival) {
  const st = play(g, rival);
  st.over = 'won'; st.final = { p: 7, o: 3 };
  return g.sceauxFinish();
}

test('récompenses : jamais payées deux fois, plafond quotidien, déblocage dans l’ordre', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('sc'), clock });
  assert.throws(() => g.sceauxStart({ rival: 'collectionneur' }), /précédent/);
  const s0 = g.s.shards;
  const out = forceWin(g, 'initie');
  assert.ok(out.first);
  assert.equal(out.shards, SC.SCEAUX_REWARD.firstWin + SC.RIVAL.initie.reward);
  assert.ok(g.s.shards - s0 >= out.shards);
  assert.ok(g.s.titles.includes(SC.SCEAUX_TITLES.initie));
  const s1 = g.s.shards;
  assert.deepEqual(g.sceauxFinish(), out, 'la même partie ne paie pas deux fois');
  assert.equal(g.s.shards, s1);
  g.sceauxQuit();
  assert.doesNotThrow(() => g.sceauxStart({ rival: 'collectionneur' }));
  g.sceauxQuit();
  for (let k = 0; k < 8; k++) { forceWin(g, 'initie'); g.sceauxQuit(); }
  assert.equal(g.s.sceaux.paidToday, SC.SCEAUX_REWARD.dailyPaid);
  const s2 = g.s.shards;
  const capped = forceWin(g, 'initie');
  assert.ok(capped.capped);
  assert.equal(capped.shards, SC.SCEAUX_REWARD.afterCap, 'v348 : au-delà du plafond, un petit gain reste');
  assert.ok(g.s.shards >= s2 + SC.SCEAUX_REWARD.afterCap);
  assert.equal(g.s.sceaux.wins, 10);
  assert.ok(g.s.sceaux.history.length <= 20);
});

test('défi du jour (v403) : ouvert après Ilda, règles déjà rencontrées seulement', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('dj2'), clock });
  g.s.sceaux.beaten = { initie: Date.now() };
  for (let i = 0; i < 20; i++) assert.ok(['classique', 'identique'].includes(SC.dailyChallenge(`2026-10-${10 + i}`, 2, ['identique']).rule));
  assert.equal(SC.dailyChallenge('2026-10-10', 1, []).rule, 'classique');
});

test('défi du jour : une seule fois par jour, même adversaire pour la journée', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('dj'), clock });
  assert.throws(() => g.sceauxStart({ daily: true }), /Ilda/, 'v403 : fermé avant une victoire contre Ilda');
  g.s.sceaux.beaten = { initie: Date.now() };
  const d = g.sceauxDaily();
  assert.deepEqual(g.sceauxDaily(), d);
  const st = play(g);
  assert.equal(st.rival, d.rival);
  assert.equal(st.rule, d.rule);
  st.over = 'won'; st.final = { p: 6, o: 4 };
  const out = g.sceauxFinish();
  assert.ok(out.shards >= SC.SCEAUX_REWARD.daily);
  g.sceauxQuit();
  assert.throws(() => g.sceauxStart({ daily: true }), /déjà/);
});

test('main : 5 cartes possédées ou prêtées ; la partie en cours survit à un rechargement', () => {
  const storage = new MemoryStorage();
  const g = new Game(catalog, storage, { rng: rngFrom('mh'), clock });
  assert.equal(g.sceauxHand().length, 5);
  assert.throws(() => g.setSceauxHand(ids.slice(0, 4)), /5/);
  const own = ids.slice(20, 25); own.forEach((id) => g.addCard(id));
  assert.deepEqual(g.setSceauxHand(own), own);
  g.sceauxStart({ rival: 'initie' });
  if (g.s.sceaux.cur.turn === 'o') g.sceauxAi();
  g.sceauxPlay(0, g.s.sceaux.cur.board.findIndex((c) => !c));
  const placed = g.s.sceaux.cur.placed;
  const g2 = new Game(catalog, storage, { rng: rngFrom('mh2'), clock });
  assert.equal(g2.s.sceaux.cur.placed, placed);
  assert.deepEqual(g2.sceauxHand(), own);
  // sauvegarde ancienne (sans « sceaux ») : complétée sans erreur
  const old = defaultSave(); delete old.sceaux;
  const m = migrate(old);
  assert.equal(m.sceaux.wins, 0);
  assert.deepEqual(m.sceaux.beaten, {});
});

// Pose directe de cartes aux valeurs choisies (sans passer par la main)
const put = (st, cell, owner, vals) => { st.board[cell] = { id: ids[20 + cell], owner, vals }; st.placed++; };

test('Identique : deux valeurs égales capturent, puis Combo en cascade', () => {
  // carte à poser : chercher une carte réelle et construire le plateau autour de ses valeurs
  const id = ids.find((x) => { const v = SC.sideValues(catalog.get(x)); return v[0] >= 2 && v[3] >= 2; });
  const v = SC.sideValues(catalog.get(id));
  const st = game('p', 'identique');
  st.hands.p = [id];
  // pose en 4 : voisin du haut (1) et de gauche (3) ont des valeurs égales en face
  put(st, 1, 'o', [5, 5, v[0], 5]);
  put(st, 3, 'o', [5, v[3], 5, 5]);
  put(st, 0, 'o', [5, 5, 5, 5]);      // voisine de 1 et de 3
  st.board[1].vals[3] = 9;            // la carte 1 capturée bat la carte 0 par sa gauche (9 > 5)
  const flips = SC.place(catalog, st, 'p', 0, 4);
  const rules = flips.map((f) => f.rule);
  assert.ok(rules.filter((r) => r === 'identique').length === 2, JSON.stringify(flips));
  assert.ok(rules.includes('combo'));
  assert.equal(st.board[0].owner, 'p');
});

test('Identique ne se déclenche pas sans la règle, ni avec une seule égalité', () => {
  const id = ids.find((x) => SC.sideValues(catalog.get(x))[0] >= 2);
  const v = SC.sideValues(catalog.get(id));
  const st = game('p', 'classique');
  st.hands.p = [id];
  put(st, 1, 'o', [5, 5, v[0], 5]);
  put(st, 3, 'o', [5, v[3], 5, 5]);
  assert.equal(SC.place(catalog, st, 'p', 0, 4).filter((f) => f.rule).length, 0);
  const st2 = game('p', 'identique');
  st2.hands.p = [id];
  put(st2, 1, 'o', [5, 5, v[0], 5]);
  put(st2, 3, 'o', [5, 10, 5, 5]);
  assert.equal(SC.place(catalog, st2, 'p', 0, 4).filter((f) => f.rule).length, 0);
});

test('Somme : même somme sur deux côtés ; une carte alliée compte pour déclencher', () => {
  const id = ids.find((x) => { const v = SC.sideValues(catalog.get(x)); return v[0] <= 8 && v[1] <= 8; });
  const v = SC.sideValues(catalog.get(id));
  const st = game('p', 'somme');
  st.hands.p = [id];
  const S = 11;
  put(st, 1, 'o', [5, 5, S - v[0], 5]);   // haut
  put(st, 5, 'p', [5, 5, 5, S - v[1]]);   // droite, à moi
  const flips = SC.place(catalog, st, 'p', 0, 4);
  assert.ok(flips.some((f) => f.cell === 1 && f.rule === 'somme'), JSON.stringify(flips));
  assert.equal(st.board[5].owner, 'p');
});

test('Abîme (v358, retirée en v359) : une partie commencée garde Identique, Somme et cases sacrées', () => {
  const st = SC.newGame(catalog, { hand: ids.slice(0, 5), rival: { ...SC.RIVAL.echo, rule: 'abime' }, seed: 4 });
  assert.ok(SC.ruleHas(st, 'identique') && SC.ruleHas(st, 'somme') && SC.ruleHas(st, 'sacre') && !SC.ruleHas(st, 'instable'));
  assert.ok(st.cells.blessed != null);
});

test('aucune égalité possible : 300 parties simulées', () => {
  for (let seed = 0; seed < 300; seed++) {
    const R = SC.RIVALS[seed % SC.RIVALS.length];
    const st = SC.newGame(catalog, { hand: ids.slice(seed % 50, seed % 50 + 5), rival: R, seed });
    const rnd = rngFrom('d' + seed);
    while (!st.over) { const m = SC.aiMove(catalog, st, 2, rnd); SC.place(catalog, st, st.turn, m[0], m[1]); }
    assert.notEqual(st.over, 'draw');
    assert.equal(st.final.p + st.final.o, 10);
  }
});

test('trophée : une carte adverse contrôlée, une fois par jour, Héroïque au plus', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('t'), clock });
  g.sceauxStart({ rival: 'initie' });
  const st = g.s.sceaux.cur;
  const opp = st.oppHand.find((id) => SC.TROPHY_MAX.includes(catalog.get(id).rarity));
  st.board = st.board.map((_, i) => ({ id: i === 0 ? opp : ids[i], owner: 'p', vals: [5, 5, 5, 5] }));
  st.hands.o = st.oppHand.filter((x) => x !== opp).slice(0, 1);
  st.over = 'won'; st.final = SC.score(st);
  const out = g.sceauxFinish();
  assert.deepEqual(out.trophy, [opp]);
  const had = g.owns(opp) ? g.entry(opp).n : 0;
  g.sceauxTrophy(opp);
  assert.equal(g.entry(opp).n, had + 1);
  assert.throws(() => g.sceauxTrophy(opp));
  g.sceauxQuit(); g.sceauxStart({ rival: 'initie' });
  const st2 = g.s.sceaux.cur; st2.board = st2.board.map((_, i) => ({ id: i === 0 ? st2.oppHand[0] : ids[i], owner: 'p', vals: [5, 5, 5, 5] }));
  st2.over = 'won'; st2.final = SC.score(st2);
  assert.equal(g.sceauxFinish().trophy, undefined, 'déjà pris aujourd’hui');
});

test('pouvoirs de rareté : Rempart résiste une fois, Fureur capture à égalité', () => {
  const hr = catalog.cards.find((c) => c.rarity === 'HR'), m = catalog.cards.find((c) => c.rarity === 'M');
  assert.deepEqual(SC.perksOf(hr), ['rempart']); assert.deepEqual(SC.perksOf(m), ['fureur']);
  assert.deepEqual(SC.perksOf(catalog.cards.find((c) => c.rarity === 'S')), ['rempart', 'fureur']);
  assert.deepEqual(SC.perksOf(catalog.cards.find((c) => c.rarity === 'C')), []);
  // Rempart : une carte HR adverse au centre, on la frappe deux fois avec des valeurs supérieures
  const st = game('p');
  st.board[4] = { id: hr.id, owner: 'o', vals: [1, 1, 1, 1], guard: true };
  st.hands.p = [ids[0], ids[1]];
  const f1 = SC.place(catalog, st, 'p', 0, 1);
  assert.ok(f1.some((f) => f.blocked)); assert.equal(st.board[4].owner, 'o'); assert.equal(st.board[4].guard, false);
  st.turn = 'p';
  const f2 = SC.place(catalog, st, 'p', 0, 3);
  assert.ok(f2.some((f) => f.cell === 4 && !f.blocked)); assert.equal(st.board[4].owner, 'p');
  // Fureur : une Mythique posée à côté d'une valeur égale capture
  const st2 = game('p');
  const vm = SC.sideValues(m);
  st2.board[4] = { id: ids[5], owner: 'o', vals: [1, 1, 1, vm[1]], guard: false };
  st2.hands.p = [m.id];
  const f3 = SC.place(catalog, st2, 'p', 0, 3);
  assert.ok(f3.some((f) => f.cell === 4 && f.rule === 'fureur')); assert.equal(st2.board[4].owner, 'p');
});

test('nouveaux adversaires et revanches éveillées', () => {
  assert.equal(SC.RIVALS.length, 8);
  for (const r of SC.RIVALS) { assert.ok(SC.RULES[r.rule], r.key); assert.ok(catalog.get(r.portrait), r.key); assert.equal(SC.rivalHand(catalog, r).length, 5); }
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('aw'), clock });
  assert.throws(() => g.sceauxStart({ rival: 'initie', awake: true }), /Bats/);
  forceWin(g, 'initie');
  g.sceauxQuit();
  g.sceauxStart({ rival: 'initie', awake: true });
  const st = g.s.sceaux.cur;
  assert.equal(st.awake, true); assert.equal(st.level, 2);
  while (!st.over) { if (st.turn === 'o') g.sceauxAi(); else { const m = SC.aiMove(catalog, st, 4, rngFrom('x')); g.sceauxPlay(m[0], m[1]); } }
  st.over = 'won'; st.final = { p: 7, o: 3 };
  const before = g.s.shards;
  const out = g.sceauxFinish();
  assert.ok(out.first); assert.ok(g.s.sceaux.awake.initie);
  assert.ok(g.s.shards - before >= SC.SCEAUX_REWARD.firstAwake);
  // v358 : seules les règles gardées sont jouées par les adversaires et le défi du jour
  for (const r of SC.RIVALS) assert.ok(SC.RULE_LIST.includes(r.rule), r.key);
  for (let d = 0; d < 40; d++) assert.ok(SC.RULE_LIST.includes(SC.dailyChallenge(`2026-11-${d}`, 8).rule));
  assert.deepEqual(SC.RULE_LIST, ['classique', 'sacre', 'identique', 'somme']);
});

test('v358 : une carte Inviolable qui résiste ne tombe pas dans la même pose', () => {
  const card = (id, vals, owner, guard = false) => ({ id, owner, from: owner, vals, guard });
  const shield = catalog.cards.find((c) => c.rarity === 'HR').id;
  // une carte posée dont le haut bat la carte du dessus ET forme une Somme avec la carte de gauche
  const plain = catalog.cards.find((c) => { if (c.rarity !== 'C') return false; const v = SC.sideValues(c); const t = 2 * v[0] - 1 - v[3]; return v[0] >= 2 && t >= 1 && t <= 10; }).id;
  const st = SC.newGame(catalog, { hand: [plain, plain, plain, plain, plain], rival: { ...SC.RIVAL.maitre, rule: 'somme' }, seed: 1 });
  st.turn = 'p'; st.cells = { blessed: null, cursed: null };
  const v = SC.valuesOn(catalog, st, plain, 4, 'p');
  st.board[1] = card(shield, [1, 1, v[0] - 1, 1], 'o', true); // au-dessus : plus faible, et Inviolable
  st.board[3] = card(plain, [1, 2 * v[0] - 1 - v[3], 1, 1], 'o'); // à gauche : même somme
  SC.place(catalog, st, 'p', 0, 4);
  assert.equal(st.board[1].owner, 'o', 'le bouclier résiste à la Somme, et la capture simple ne passe pas derrière');
  assert.equal(st.board[1].guard, false);
  assert.equal(st.board[3].owner, 'p');
});

test('v475 : chaque rival a sa force de jeu, et sa revanche implacable est notée au moins aussi dure', () => {
  let prev = 0;
  for (const R of SC.RIVALS) {
    assert.ok(Array.isArray(R.ai) && Array.isArray(R.aiAwake) && R.ai.length === 3 && R.aiAwake.length === 3, R.key);
    assert.ok(R.starsAwake >= R.stars && R.stars >= prev, `${R.key} étoiles`); prev = R.stars;
    const st = SC.newGame(catalog, { hand: SC.autoHand(catalog, []), rival: R, seed: 3 });
    assert.deepEqual(st.ai, { level: R.ai[0], slip: R.ai[1], tol: R.ai[2] });
    const A = SC.awakened(R);
    assert.deepEqual(SC.newGame(catalog, { hand: SC.autoHand(catalog, []), rival: A, seed: 3 }).ai, { level: R.aiAwake[0], slip: R.aiAwake[1], tol: R.aiAwake[2] });
  }
});

test('v475 : un coup imparfait reste proche du meilleur (écart borné)', () => {
  const st = SC.newGame(catalog, { hand: SC.autoHand(catalog, []), rival: SC.RIVALS[0], seed: 9 });
  SC.place(catalog, st, 'p', 0, 0);
  const best = SC.aiMove(catalog, st, 3, () => 0.99, 0);
  /* toujours une erreur, mais tolérance nulle : il ne reste que le meilleur coup (ou un coup de même valeur) */
  const m = SC.aiMove(catalog, st, 3, () => 0.01, 1, 0);
  const val = (mv) => { const t = JSON.parse(JSON.stringify(st)); return SC.place(catalog, t, 'o', mv[0], mv[1]).filter((f) => !f.blocked).length; };
  assert.equal(val(m), val(best));
});

test('v306 : le jeu le plus fort (fin de partie calculée) reste rapide et joue des coups valides', () => {
  const r = rngFrom('rapide');
  let slowest = 0;
  for (let g = 0; g < 4; g++) {
    const st = SC.newGame(catalog, { hand: SC.autoHand(catalog, []), rival: SC.awakened(SC.RIVAL.souverain), seed: 40 + g });
    while (!st.over) {
      const t0 = Date.now();
      const m = st.turn === 'o' ? SC.aiMove(catalog, st, 6, r, 0) : SC.aiMove(catalog, st, 2, r);
      slowest = Math.max(slowest, Date.now() - t0);
      SC.place(catalog, st, st.turn, m[0], m[1]);
    }
  }
  assert.ok(slowest < 1500, `coup le plus long : ${slowest} ms`);
});

test('v306 : une partie commencée avant la mise à jour (sans réglage) se termine normalement', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('ancienne') });
  g.s.bossesBeaten.devoreur = Date.now();
  const st = g.sceauxStart({ rival: 'initie' });
  delete st.ai; st.level = 5; // comme une ancienne sauvegarde
  const r = rngFrom('a');
  while (!st.over) { if (st.turn === 'o') assert.ok(g.sceauxAi()); else { const m = SC.aiMove(catalog, st, 2, r); g.sceauxPlay(m[0], m[1]); } }
  assert.ok(['won', 'lost', 'draw'].includes(st.over));
});

test('v408 : coffres des Sceaux à la première victoire (selon le rang) et au défi du jour', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('sc-ch'), clock });
  assert.equal(SC.sceauxChest('initie'), 'bois');
  assert.equal(SC.sceauxChest(SC.RIVALS[7].key), 'abyssal');
  assert.equal(SC.sceauxChest(SC.RIVALS[2].key, true), 'or', 'revanche implacable : un rang au-dessus');
  const b0 = g.s.chests.bois || 0;
  const out = forceWin(g, 'initie');
  assert.deepEqual(out.chests, ['bois']);
  assert.equal(g.s.chests.bois, b0 + 1);
  g.sceauxQuit();
  const again = forceWin(g, 'initie');
  assert.deepEqual(again.chests, [], 'une seule fois');
  g.sceauxQuit();
});
