// Génère les icônes PNG de l'application à partir d'un SVG (nécessite Playwright).
// Usage : node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const { EMBLEM } = await import('../js/ui/icons.js');
const inner = EMBLEM.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="bg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#3A1A4A"/><stop offset=".55" stop-color="#140A1C"/><stop offset="1" stop-color="#08090D"/></radialGradient>
<filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feColorMatrix in="b" values="0 0 0 0 .8 0 0 0 0 .62 0 0 0 0 .3 0 0 0 .7 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)"><g filter="url(#gl)" transform="translate(46 46) scale(4.2)">${inner}</g></g></svg>`;

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
