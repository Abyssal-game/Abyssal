// Génère les icônes PNG de l'application à partir d'un SVG (nécessite Playwright).
// Usage : node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const star = (() => { let d = ''; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 7; d += `${i ? 'L' : 'M'}${(256 + Math.cos(a) * 150).toFixed(1)} ${(236 + Math.sin(a) * 150).toFixed(1)}`; } return d + 'Z'; })();
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="bg" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#3A1640"/><stop offset=".55" stop-color="#140A1C"/><stop offset="1" stop-color="#08090D"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF2C0"/><stop offset=".5" stop-color="#C8A45D"/><stop offset="1" stop-color="#6B5226"/></linearGradient>
<filter id="gl"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)" filter="url(#gl)">
<g fill="none" stroke="url(#g)" stroke-width="8"><circle cx="256" cy="236" r="180"/><circle cx="256" cy="236" r="158" stroke-width="3" stroke-dasharray="8 12"/><path d="${star}"/>
<path d="M150 236s40-50 106-50 106 50 106 50-40 50-106 50-106-50-106-50z"/></g>
<circle cx="256" cy="236" r="30" fill="url(#g)"/><circle cx="256" cy="236" r="12" fill="#08090D"/>
<text x="256" y="470" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="58" letter-spacing="10" fill="url(#g)">ABYSSAL</text></g></svg>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
async function shot(file, size, pad) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:#08090D">${svg(pad).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await p.screenshot({ path: path.join(ROOT, 'icons', file), clip: { x: 0, y: 0, width: size, height: size } });
}
fs.mkdirSync(path.join(ROOT, 'icons'), { recursive: true });
await shot('icon-512.png', 512, 1);
await shot('icon-192.png', 192, 1);
await shot('icon-maskable-512.png', 512, 0.78);
await shot('apple-touch-icon.png', 180, 0.92);
await shot('favicon.png', 64, 1);
await b.close();
console.log('Icônes générées dans icons/');
