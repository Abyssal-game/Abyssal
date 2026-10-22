// v618 : mises à jour à distance de l'application (iPhone) : liste des fichiers du jeu et de leur empreinte (live.json).
// Le téléphone compare la liste publiée avec la sienne et ne télécharge que les fichiers qui ont changé.
// live.json n'est pas dans le dépôt : tools/build-www.mjs le met dans l'application, tools/live-site.mjs dans le site publié
// (où il est signé). Usage manuel : node tools/live-manifest.mjs <dossier>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Fichiers du jeu embarqués dans l'application et publiés sur le site.
export const KEEP = ['index.html', 'manifest.webmanifest', 'confidentialite.html', 'sw.js', 'css', 'js', 'data', 'assets', 'icons'];

export function liveManifest() {
  const cfg = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
  const v = +(cfg.match(/VERSION = 'v(\d+)'/) || [])[1];
  const native = +(cfg.match(/LIVE_NATIVE = (\d+)/) || [])[1];
  const files = {};
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    if (fs.statSync(abs).isDirectory()) { for (const e of fs.readdirSync(abs).sort()) if (!e.startsWith('.')) walk(`${rel}/${e}`); }
    else files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 16);
  };
  for (const k of KEEP) walk(k);
  return { v, native, files };
}
// Un fichier par ligne : lisible, et ce texte exact est celui qui est signé.
export const liveText = () => JSON.stringify(liveManifest(), null, 1) + '\n';

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = process.argv[2];
  if (!out) { console.error('Usage : node tools/live-manifest.mjs <dossier>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'live.json'), liveText());
  const m = liveManifest();
  console.log(`live.json : v${m.v}, ${Object.keys(m.files).length} fichiers (application ≥ ${m.native})`);
}
