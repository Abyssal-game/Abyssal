// Captures brutes pour les stores : le jeu en taille iPhone 6,9" (440×956 points, ×3), partie de démonstration.
// Usage : node tools/store-shots.mjs   → store/raw/*.png   (serveur local lancé automatiquement)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }
const { SAVE_KEY } = await import('../js/config.js');
const saveFor = (mode = '') => execFileSync('node', [path.join(ROOT, 'tools/store-demo-save.mjs'), mode], { maxBuffer: 1 << 26 }).toString();

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const OUT = path.join(ROOT, 'store/raw'); fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, hasTouch: true, serviceWorkers: 'block' });
await ctx.route(/supabase\.co/, (r) => r.abort());
const errs = [];
let p;
// Chaque capture part d'une page neuve, avec la partie de démonstration voulue.
async function open(mode = '') {
  if (p) await p.close();
  await ctx.clearCookies();
  p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL0 + 'robots.txt');
  await p.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, saveFor(mode)]);
  await p.goto(URL0); await p.waitForTimeout(3000);
  await p.mouse.click(220, 478); await p.waitForTimeout(2500);
}
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1800) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); };
const shot = async (name) => { await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await wait(200); await p.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('capture', name); };
const tap = async (sel, ms = 1200) => { await p.locator(sel).first().click(); await wait(ms); };

const only = process.argv.slice(2);
const steps = {
  async accueil() { await open(); await go('#/'); await shot('accueil'); },
  async collection() { await open(); await go('#/collection'); await p.evaluate(() => window.scrollTo(0, 560)); await wait(800); await shot('collection'); },
  async carte() { await open(); await go('#/collection'); await tap(`[data-id="${process.env.CARD || 'INF-001'}"]`, 2200); await shot('carte'); },
  async ouverture() { await open(); await go('#/boutique'); await tap('[data-act="buy"][data-type="premium"]', 2500); await p.getByText('Tout révéler').first().click(); await wait(Number(process.env.OPEN_MS || 4500)); await shot('ouverture'); },
  async equipe() { await open(); await go('#/equipe'); await shot('equipe'); },
  async combat() { await open('combat'); await go('#/descente', 3500); await shot('combat'); },
  async sceaux() { await open('sceaux'); await go('#/sceaux', 2500); await shot('sceaux'); },
  async bestiaire() { await open(); await go('#/bestiaire'); await shot('bestiaire'); },
};
for (const [k, f] of Object.entries(steps)) if (!only.length || only.includes(k)) { try { await f(); } catch (e) { console.log('ÉCHEC', k, e.message.split('\n')[0]); } }
console.log('erreurs de page :', errs);
await b.close(); server.close();
