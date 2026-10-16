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
// iPhone : le numéro de build Xcode suit le numéro du jeu (v366 → 366), comme versionCode sur Android
const PBX = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const ver = (fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8').match(/VERSION = 'v(\d+)'/) || [])[1];
if (ver && fs.existsSync(PBX)) { fs.writeFileSync(PBX, fs.readFileSync(PBX, 'utf8').replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${ver};`)); console.log(`iOS : build ${ver}`); }
