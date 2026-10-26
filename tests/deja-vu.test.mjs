// v810 : les marques « déjà vu » d'un compte ne sont jamais effacées par un téléphone remis à neuf
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFree } from '../js/core/ops.js';

test('v810 : guide, cadeau et bulles déjà vus restent vus', () => {
  assert.equal(mergeFree('seenIntro', 4, false), 4);
  assert.equal(mergeFree('seenIntro', false, 4), 4);
  assert.equal(mergeFree('giftShown', true, false), true);
  assert.deepEqual(mergeFree('tips', { a: 1, b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 });
  assert.deepEqual(mergeFree('storySeen', { 1: true }, {}), { 1: true });
  assert.equal(mergeFree('shadow.drew', '2026-10-26', '2026-10-20'), '2026-10-26');
  assert.deepEqual(mergeFree('settings', { music: 1 }, { music: 0 }), { music: 0 }, 'les réglages du téléphone gagnent');
  assert.equal(mergeFree('seenIntro', null, 4), 4);
});
