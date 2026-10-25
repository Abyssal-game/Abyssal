// v754 : chaque nom d'attaque, style et identité de combat généré par tools/gen-kits.mjs a sa traduction dans les 5 langues
// (après v658 et v676, 43 cartes montraient leurs attaques en français dans les autres langues)
import test from 'node:test';
import assert from 'node:assert/strict';
import { GEN_KITS } from '../js/core/kits-data.js';

test('v754 : noms des attaques et styles de combat générés traduits dans les 5 langues', async () => {
  const want = new Set();
  for (const k of Object.values(GEN_KITS)) for (const x of [k.s, k.k, k.m?.name]) if (x) want.add(x);
  for (const l of ['en', 'es', 'de', 'it', 'pt']) {
    const m = await import(`../js/i18n/${l}.js`), dict = m.default, names = m.names || {};
    const miss = [...want].filter((x) => !(x in dict) && !(x in names));
    assert.deepEqual(miss, [], `${l} : à traduire après gen-kits`);
  }
});
