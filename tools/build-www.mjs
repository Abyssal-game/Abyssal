// Prépare le dossier www/ embarqué dans l'application Android / iPhone (Capacitor) :
// uniquement les fichiers du jeu (pas les outils, tests, images des stores…).
// Usage : node tools/build-www.mjs   (puis : npx cap sync)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'www');
const KEEP = ['index.html', 'manifest.webmanifest', 'confidentialite.html', 'sw.js', 'css', 'js', 'data', 'assets', 'icons'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const k of KEEP) fs.cpSync(path.join(ROOT, k), path.join(OUT, k), { recursive: true });
let n = 0, bytes = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { n++; bytes += fs.statSync(f).size; } } })(OUT);
console.log(`www/ : ${n} fichiers, ${(bytes / 1e6).toFixed(1)} Mo`);
