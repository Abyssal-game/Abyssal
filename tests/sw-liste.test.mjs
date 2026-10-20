// v536 : chaque module du jeu est dans la liste hors ligne du service worker (sinon, après une mise à jour hors ligne,
// l'app ne démarre pas, ou un module ancien du navigateur se mélange au nouveau)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('service worker : tous les fichiers de js/ sont préchargés', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const all = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) all.push(p.split(path.sep).join('/')); } })('js');
  const missing = all.filter((p) => !sw.includes(`'${p}'`));
  assert.deepEqual(missing, []);
});
