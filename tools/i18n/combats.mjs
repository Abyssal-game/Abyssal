// Combats joués au hasard en anglais (mode collecte) : relève les textes non traduits
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2]; const BOSSES = (process.argv[3] || 'devoreur').split(',');
const demo = JSON.parse(execFileSync('node', ['tools/store-demo-save.mjs', 'combat']).toString()); demo.descent.run = null; demo.settings = { ...(demo.settings || {}), dev: true };
const b = await chromium.launch(); const all = new Set(); const errs = [];
const W = 390, H = 664;
const ctx = await b.newContext({ viewport: { width: W, height: H }, serviceWorkers: 'block', hasTouch: false });
await ctx.route(/supabase\.co/, (r) => r.abort());
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8092/robots.txt');
await p.evaluate((v) => { localStorage.clear(); localStorage.setItem('abyssal.save', v); localStorage.setItem('abyssal.nogate', '1'); localStorage.setItem('abyssal.lang', 'en'); localStorage.setItem('abyssal.i18n.collect', '1'); }, JSON.stringify(demo));
await p.goto('http://localhost:8092/'); await p.waitForTimeout(2500); await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1000);
const grab = async () => { for (const k of await p.evaluate(() => [...window.__i18nMissing.keys()])) all.add(k); };
const vis = async (sel) => { const l = p.locator(sel).first(); return (await l.count()) && (await l.isVisible().catch(() => false)) ? l : null; };
for (const boss of BOSSES) {
  await p.evaluate((k) => { window.__abyssal.game.devBoss(k, { power: true }); window.__abyssal.game.persist(); location.hash = '#/accueil'; }, boss); await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = '#/descente'; }); await p.waitForTimeout(1500);
  let helpDone = false;
  for (let i = 0; i < 150; i++) {
    let l;
    if ((l = await vis('.cb-def:not(.ok):not(.ko)'))) { await p.waitForTimeout(250 + Math.random() * 500); await p.mouse.click(W / 2, H / 3); await p.waitForTimeout(150); continue; }
    if ((l = await vis('.coach button, .tuto button, button:text-matches("got it|compris|ok", "i")'))) { await grab(); await l.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250); continue; }
    if ((l = await vis('.dv-c.enemy')) && (await vis('.cb-a'))) {
      if (!helpDone) { helpDone = true; for (const s of ['[data-d="help"]', '[data-d="ult"]', '.cb-law', '[data-d="reserve"]']) { const h = await vis(s); if (h) { await h.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(500); await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; })); await p.waitForTimeout(200); await grab(); for (let c = 0; c < 3; c++) { const x = await vis('.sheet-close'); if (x) { await x.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250); } } } } }
      const acts = p.locator('.cb-a:not(.off)'); const n = await acts.count();
      if (n) { await acts.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(250); await grab(); const tg = p.locator('.dv-c.target'); const m = await tg.count(); if (m) await tg.nth(Math.floor(Math.random() * m)).click({ timeout: 1500 }).catch(() => {}); else { const e = p.locator('.dv-c.enemy:not(.dead)'); if (await e.count()) await e.first().click({ timeout: 1500 }).catch(() => {}); } await p.waitForTimeout(600); continue; }
      const end = await vis('[data-d="end"]'); if (end) { await end.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(500); continue; }
    }
    if ((l = await vis('.sheet-close'))) { await grab(); await l.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); continue; }
    if ((l = await vis('[data-act="door"]'))) { await l.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1200); await p.mouse.click(W / 2, H / 2); await p.waitForTimeout(1000); continue; }
    if ((l = await vis('[data-act="reward"], [data-act="talent"], [data-act="next"], [data-act="blesspick"], [data-act="omenpick"], [data-act="omengo"]'))) { await grab(); await l.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(700); if (i > 40) break; continue; }
    await p.waitForTimeout(300); await grab();
  }
  await grab(); await p.screenshot({ path: `${S}/en/bot-${boss}.png` });
  console.log(boss, all.size);
  fs.writeFileSync(`${S}/i18n/miss-bot-${boss}.json`, JSON.stringify([...all], null, 1));
}
fs.writeFileSync(`${S}/i18n/miss-bot-${BOSSES[0]}.json`, JSON.stringify([...all], null, 1));
console.log('erreurs', errs.slice(0, 5)); await b.close();
