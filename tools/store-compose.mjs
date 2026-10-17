// Images finales des stores, à partir des captures de store/raw (voir tools/store-shots.mjs) :
//   store/apple/   captures iPhone 6,9" 1320×2868 + icône 1024×1024 (sans transparence)
//   store/google/  captures téléphone 1080×1920 + icône 512×512 + image de présentation 1024×500
// Usage : node tools/store-compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;

// Ordre d'affichage dans les stores : la première image est la plus vue.
export const SHOTS = [
  ['carte', '500 créatures légendaires', 'Démons, dieux oubliés, dragons primordiaux…'],
  ['ouverture', 'Ouvre tes boosters', 'Holo, Or, Cosmique : chaque carte peut surprendre'],
  ['combat', 'Combats tactiques', '20 gardiens, esquive, parade et Brisure'],
  ['equipe', 'Forge ton équipe', '3 au combat, 2 en réserve, synergies de factions'],
  ['collection', 'Complète le Bestiaire', '7 factions, 6 raretés, 17 ensembles'],
  ['sceaux', 'Les Duels des Sceaux', 'Un second jeu de cartes, contre 8 rivaux'],
  ['bestiaire', 'Un monde à découvrir', 'Chaque créature a son histoire'],
  ['accueil', 'Gratuit, sans publicité', 'Ta collection sauvegardée en ligne'],
];

const FONTS = `<link rel="stylesheet" href="${url('css/fonts.css')}">`;
const BG = `radial-gradient(120% 70% at 50% 0%, #3A1A4A 0%, #160B20 45%, #08090D 100%)`;

function shotHTML(file, title, sub, W, H) {
  const top = Math.round(H * 0.19), pad = Math.round(W * 0.06);
  const imgH = H - top - pad, imgW = Math.round(imgH * 1320 / 2868);
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${BG};}
    .cap{position:absolute;top:0;left:0;right:0;height:${top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 ${pad}px;box-sizing:border-box;}
    h1{margin:0;font:700 ${Math.round(W * 0.072)}px/1.1 'Cinzel',serif;letter-spacing:.04em;color:#E8C77A;text-shadow:0 0 ${Math.round(W * 0.03)}px rgba(200,164,93,.45);}
    p{margin:${Math.round(W * 0.02)}px 0 0;font:500 ${Math.round(W * 0.038)}px/1.3 'Alegreya Sans',sans-serif;color:#D9CFE6;}
    .ph{position:absolute;left:50%;top:${top}px;transform:translateX(-50%);width:${imgW}px;height:${imgH}px;border-radius:${Math.round(imgW * 0.07)}px;overflow:hidden;
        box-shadow:0 0 0 ${Math.max(3, Math.round(W * 0.004))}px #C8A45D,0 ${Math.round(W * 0.02)}px ${Math.round(W * 0.08)}px rgba(0,0,0,.8),0 0 ${Math.round(W * 0.06)}px rgba(150,90,200,.35);}
    .ph img{width:100%;height:100%;display:block;object-fit:cover;object-position:top;}
  </style></head><body><div class="cap"><h1>${title}</h1><p>${sub}</p></div><div class="ph"><img src="${url(`store/raw/${file}.png`)}"></div></body></html>`;
}

const featureHTML = () => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#08090D;}
  .bg{position:absolute;inset:0;background:url(${url('assets/scenes/home.webp')}) center 35%/cover;opacity:.55;}
  .fade{position:absolute;inset:0;background:radial-gradient(70% 90% at 50% 45%, rgba(8,9,13,.1), rgba(8,9,13,.9));}
  .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
  img{width:470px;filter:drop-shadow(0 0 24px rgba(200,164,93,.45));}
  p{margin:14px 0 0;font:600 30px/1.2 'Alegreya Sans',sans-serif;color:#E9DEF5;letter-spacing:.03em;text-shadow:0 2px 8px #000;}
</style></head><body><div class="bg"></div><div class="fade"></div><div class="c"><img src="${url('assets/brand/title.webp')}"><p>Collectionne · Combats · Descends dans l’Abysse</p></div></body></html>`;

const b = await chromium.launch();
async function render(html, W, H, out) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const tmp = path.join(ROOT, 'store/.compose.html'); // une vraie page locale : elle peut charger les images du dépôt
  fs.writeFileSync(tmp, html);
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  fs.rmSync(tmp);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: out, omitBackground: false });
  await p.close();
  console.log('image', path.relative(ROOT, out));
}
for (const dir of ['store/apple', 'store/google']) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
let n = 0;
for (const [file, title, sub] of SHOTS) {
  if (!fs.existsSync(path.join(ROOT, `store/raw/${file}.png`))) { console.log('capture manquante :', file); continue; }
  n++;
  const name = `${String(n).padStart(2, '0')}-${file}.png`;
  await render(shotHTML(file, title, sub, 1320, 2868), 1320, 2868, path.join(ROOT, 'store/apple', name));
  await render(shotHTML(file, title, sub, 1080, 1920), 1080, 1920, path.join(ROOT, 'store/google', name));
}
await render(featureHTML(), 1024, 500, path.join(ROOT, 'store/google/presentation-1024x500.png'));
// Icônes des stores : fabriquées par tools/brand.py à partir de l'image source (pleine résolution)
await b.close();
