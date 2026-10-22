// Prépare le dossier www/ embarqué dans l'application Android / iPhone (Capacitor) :
// uniquement les fichiers du jeu (pas les outils, tests, images des stores…).
// Usage : node tools/build-www.mjs   (puis : npx cap sync)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'www');
import { KEEP, liveText } from './live-manifest.mjs';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const k of KEEP) fs.cpSync(path.join(ROOT, k), path.join(OUT, k), { recursive: true });
/* v618 : empreintes des fichiers embarqués : l'app les compare avec celles du site pour ses mises à jour à distance */
fs.writeFileSync(path.join(OUT, 'live.json'), liveText());
let n = 0, bytes = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { n++; bytes += fs.statSync(f).size; } } })(OUT);
console.log(`www/ : ${n} fichiers, ${(bytes / 1e6).toFixed(1)} Mo`);
// iPhone : le numéro de build Xcode suit le numéro du jeu (v366 → 366), comme versionCode sur Android.
// Seulement sur le Mac : ce fichier n'est jamais envoyé depuis la session, sinon il entre en conflit avec
// le réglage de signature qu'Xcode y écrit sur le Mac (GitHub Desktop refuse alors de récupérer les mises à jour).
const PBX = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const ver = (fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8').match(/VERSION = 'v(\d+)'/) || [])[1];
if (ver && fs.existsSync(PBX) && process.platform === 'darwin') { fs.writeFileSync(PBX, fs.readFileSync(PBX, 'utf8').replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${ver};`)); console.log(`iOS : build ${ver}`); }
