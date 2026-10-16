// v362 : chaque fichier du jeu doit être lisible par le navigateur. Les écrans (DOM) ne sont pas importés par les
// autres tests : une faute de syntaxe y passait inaperçue (v361 : un commentaire avait coupé une ligne du combat).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (d) => readdirSync(d).forEach((n) => { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); });
walk('js'); files.push('sw.js');

test('syntaxe de tous les fichiers JavaScript du jeu', () => {
  const bad = [];
  for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad.push(`${f} : ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); } }
  assert.deepEqual(bad, []);
});
