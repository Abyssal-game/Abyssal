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
  await p.evaluate(([k, v, l]) => { localStorage.clear(); localStorage.setItem(k, v); localStorage.setItem('abyssal.nogate', '1'); localStorage.setItem('abyssal.lang', l); }, [SAVE_KEY, saveFor(mode), process.env.LANG_SHOTS || 'fr']);  /* v536 : langue forcée (sinon celle du navigateur) */
  await p.goto(URL0); await p.waitForTimeout(3000);
  await p.mouse.click(220, 478); await p.waitForTimeout(2500);
}
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1800) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); };
const shot = async (name) => { await p.addStyleTag({ content: '.toast, .prog-chip { display: none !important; }' }); await p.evaluate(() => document.querySelectorAll('.toast, .prog-chip').forEach((t) => t.remove()) /* v678 : pastille des récompenses aussi */); await wait(200); await p.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('capture', name); };
const tap = async (sel, ms = 1200) => { await p.locator(sel).first().click(); await wait(ms); };

const only = process.argv.slice(2);
const steps = {
  async accueil() { await open(); await go('#/'); await shot('accueil'); },
  /* v889 : collection rangée par rareté (Secrètes et Mythiques avec leurs finitions en premier) */
  async collection() { await open(); await p.evaluate(() => { window.__abyssal.state.col = { q: '', factions: [], rarities: [], show: 'owned', sort: 'rarity', view: 'grid', albumFac: 'infernal', albumPage: 0 }; }); await go('#/collection'); await p.evaluate((y) => window.scrollTo(0, y), Number(process.env.COL_Y || 0)); await wait(800); await shot('collection'); },
  /* v889 : carte et finition au choix (CARD, VARIANT), ouvertes directement : le toucher dans la grille ouvrait toujours la première carte */
  async carte() { await open(); await go('#/collection'); await p.evaluate(([id, v]) => window.__abyssal.openCard(id, v ? { variant: v } : {}), [process.env.CARD || 'ABY-045', process.env.VARIANT || 'gold']); await wait(2200); await shot('carte'); },
  async ouverture() { await open(); await go('#/boutique'); await tap('[data-act="buy"][data-type="premium"]', 2500); await p.getByText('Tout révéler').first().click(); await wait(Number(process.env.OPEN_MS || 4500)); await shot('ouverture'); },
  async equipe() { await open(); await go('#/equipe'); await shot('equipe'); },
  /* v889 : combat contre un gardien des profondeurs (sa présentation attend un toucher) */
  async combat() {
    await open('gardien'); await go('#/descente', 3500);
    for (let i = 0; i < 6 && await p.locator('.cb2').count() === 0; i++) { await p.mouse.click(220, 300); await wait(1500); }
    await wait(Number(process.env.FIGHT_MS || 2500)); await shot('combat');
  },
  async sceaux() { await open('sceaux'); await go('#/sceaux', 6000); await shot('sceaux'); }, /* v889 : on attend la fin des animations de capture */
  async bestiaire() { await open(); await go('#/bestiaire'); await shot('bestiaire'); },
};
for (const [k, f] of Object.entries(steps)) if (!only.length || only.includes(k)) { try { await f(); } catch (e) { console.log('ÉCHEC', k, e.message.split('\n')[0]); } }
console.log('erreurs de page :', errs);
await b.close(); server.close();
