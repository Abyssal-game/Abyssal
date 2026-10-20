import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const ROUTES = ['', 'collection', 'boutique', 'coffres', 'tirage', 'descente', 'epreuves', 'jeux', 'sceaux', 'encheres', 'pacte', 'cryptes', 'menu', 'bestiaire', 'factions', 'succes', 'profil', 'parametres', 'compte', 'amis', 'equipe', 'renfort', 'fournaise', 'codex'];
const demo = JSON.parse(execFileSync('node', ['tools/store-demo-save.mjs', 'combat']).toString()); demo.descent.run = null; demo.settings = { ...(demo.settings || {}), dev: true }; demo.devCodex = true;
const saves = { nouveau: null, avance: demo };
const all = new Map();
const b = await chromium.launch();
for (const [who, save] of Object.entries(saves)) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', hasTouch: true });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8092/robots.txt');
  await p.evaluate((v) => { localStorage.clear(); if (v) localStorage.setItem('abyssal.save', v); localStorage.setItem('abyssal.nogate', '1'); localStorage.setItem('abyssal.i18n.collect', '1'); localStorage.setItem('abyssal.lang', 'en'); }, save ? JSON.stringify(save) : null);
  await p.goto('http://localhost:8092/'); await p.waitForTimeout(2500); await p.mouse.click(195, 400); await p.waitForTimeout(1500);
  const grab = async () => { const m = await p.evaluate(() => [...(window.__i18nMissing || new Map())].map(([k]) => k)); for (const k of m) all.set(k, (all.get(k) || 0) + 1); };
  const closeSheets = async () => { for (let i = 0; i < 4; i++) { const c = p.locator('.sheet-close'); if (await c.count()) { await c.last().click().catch(() => {}); await p.waitForTimeout(200); } } };
  await grab(); await closeSheets();
  for (const r of ROUTES) {
    await p.evaluate((r) => { location.hash = '#/' + r; }, r); await p.waitForTimeout(1200); await closeSheets();
    // déplier les détails, puis essayer les onglets internes
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    const segs = await p.locator('#view .seg-b, #view [role="tab"], #view .cx-seg button, #view .chips .chip').count();
    for (let i = 0; i < Math.min(segs, 12); i++) { await p.locator('#view .seg-b, #view [role="tab"], #view .cx-seg button, #view .chips .chip').nth(i).click({ timeout: 800 }).catch(() => {}); await p.waitForTimeout(350); await closeSheets(); await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; })); }
    // ouvrir les aides « ? » et « Comment ça marche »
    const helps = p.locator('#view [data-help], #view [data-act="help"], #view .help-btn, #view [data-d="help"], #view [data-act="how"]');
    const nh = await helps.count();
    for (let i = 0; i < Math.min(nh, 6); i++) { await helps.nth(i).click({ timeout: 800 }).catch(() => {}); await p.waitForTimeout(400); await grab(); await closeSheets(); }
    await grab();
    await p.screenshot({ path: `${S}/en/${who}-${r || 'accueil'}.png` });
  }
  console.log(who, 'clés', all.size, 'erreurs', errs.slice(0, 3));
  await ctx.close();
}
fs.writeFileSync(`${S}/i18n/missing-en.json`, JSON.stringify([...all.keys()], null, 1));
console.log('total', all.size);
await b.close();
