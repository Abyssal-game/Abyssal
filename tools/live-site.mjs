// v618 : fabrique le site publié (GitHub Pages, par .github/workflows/pages.yml) : le jeu seul (pas les notes, outils,
// sources des images ni projets natifs), plus live.json et sa signature live.sig pour les mises à jour à distance.
// La clé secrète vient de la variable d'environnement LIVE_SIGN_KEY (secret GitHub, clé ECDSA P-256 au format PEM) ;
// sans elle, le site est publié sans signature et les applications ne prennent aucune mise à jour.
// Usage : node tools/live-site.mjs <dossier de sortie>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, KEEP, liveText } from './live-manifest.mjs';

const OUT = path.resolve(process.argv[2] || '_site');
const EXTRA = ['404.html', 'robots.txt', '.nojekyll', 'v2', 's'];

// Signature ECDSA P-256 / SHA-256 au format brut (r‖s, 64 octets), celui que lit crypto.subtle dans l'application.
export function liveSign(text, pem) {
  return crypto.sign('sha256', Buffer.from(text, 'utf8'), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'tools/live-site.mjs')) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const k of [...KEEP, ...EXTRA]) if (fs.existsSync(path.join(ROOT, k))) fs.cpSync(path.join(ROOT, k), path.join(OUT, k), { recursive: true });
  const text = liveText();
  fs.writeFileSync(path.join(OUT, 'live.json'), text);
  const pem = process.env.LIVE_SIGN_KEY || '';
  if (pem.trim()) {
    fs.writeFileSync(path.join(OUT, 'live.sig'), liveSign(text, pem) + '\n');
    console.log('live.json signé');
  } else console.log('::warning::Secret LIVE_SIGN_KEY absent : site publié sans signature, aucune mise à jour à distance.');
}
