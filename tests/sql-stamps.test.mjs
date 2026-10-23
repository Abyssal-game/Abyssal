// v678 : chaque fichier SQL qui se recolle par-dessus porte l'empreinte de son contenu, la même que celle
// attendue par l'écran « État du serveur ». Si ce test échoue : node tools/sql-stamp.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STAMPED, fileOf, hashOf } from '../tools/sql-stamp.mjs';
import { SQL_STAMPS } from '../js/cloud/sql-stamps.js';

test('v678 : empreintes des fichiers SQL à jour (sinon : node tools/sql-stamp.mjs)', () => {
  for (const n of STAMPED) {
    const txt = fs.readFileSync(new URL(`../supabase/${fileOf(n)}`, import.meta.url), 'utf8'), h = hashOf(txt);
    assert.equal(SQL_STAMPS[n]?.stamp, h, `${n} : empreinte attendue par le jeu`);
    assert.ok(txt.includes(`values ('${n}', '${h}')`), `${n} : empreinte écrite dans le fichier`);
  }
});
