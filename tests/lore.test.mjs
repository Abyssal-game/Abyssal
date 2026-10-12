// Bestiaire narratif et formes corrompues : déblocages, lecture, choix de forme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { loreEntries, unreadLore, markLoreRead, FRAGMENTS } from '../js/core/lore.js';
import { FORMS } from '../js/core/forms.js';
import { duelUnit } from '../js/core/duel.js';

const catalog = loadCatalog();
const newGame = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('lore'), clock: () => new Date(2026, 9, 12, 12) });

test('récits : tous scellés au départ, avec une indication pour chacun', () => {
  const g = newGame();
  const all = loreEntries(g, catalog);
  assert.equal(all.filter((e) => e.kind === 'frag').length, 21);
  assert.equal(Object.keys(FRAGMENTS).length, 7);
  assert.ok(all.every((e) => !e.unlocked && e.hint && e.title && e.text));
  assert.equal(new Set(all.map((e) => e.key)).size, all.length);
});

test('récits : gardien vaincu, relation découverte, quart d’une faction', () => {
  const g = newGame();
  g.s.bossesBeaten.devoreur = Date.now();
  g.s.relations['r-ange-demon'] = Date.now();
  const inf = catalog.byFaction.infernal;
  inf.slice(0, Math.ceil(inf.length / 4)).forEach((c) => g.addCard(c.id));
  const open = loreEntries(g, catalog).filter((e) => e.unlocked).map((e) => e.key);
  assert.ok(open.includes('boss:devoreur'));
  assert.ok(open.includes('rel:r-ange-demon'));
  assert.ok(open.includes('frag:infernal:0'));
  assert.ok(!open.includes('frag:infernal:1'));
  const unread = unreadLore(g, catalog).map((e) => e.key);
  assert.deepEqual(unread.sort(), open.sort());
  markLoreRead(g, unread);
  assert.equal(unreadLore(g, catalog).length, 0);
});

test('formes corrompues : verrouillées, éveillées, choisies, et appliquées au combat', () => {
  const g = newGame();
  const id = 'NEC-001', f = FORMS[id];
  assert.throws(() => g.setForm(id, 'corrompue'), /éveillée/);
  g.addCard(id);
  assert.throws(() => g.setForm(id, 'corrompue'), /éveillée/);
  g.s.bossesBeaten[f.cond.boss] = Date.now();
  g.setForm(id, 'corrompue');
  assert.equal(g.formOf(id), 'corrompue');
  assert.ok(loreEntries(g, catalog).find((e) => e.key === `form:${id}`).unlocked);
  const base = duelUnit(catalog.get(id)), cor = duelUnit(catalog.get(id), { form: g.formOf(id) });
  assert.equal(cor.form, f.passive); assert.equal(cor.name, f.name);
  assert.ok(cor.maxHp < base.maxHp);
  g.setForm(id, null);
  assert.equal(g.formOf(id), null);
  // pas de changement pendant une chasse en cours
  g.setForm(id, 'corrompue');
  g.s.relics.run = { phase: 'paths' };
  assert.throws(() => g.setForm(id, null), /chasse/);
});
