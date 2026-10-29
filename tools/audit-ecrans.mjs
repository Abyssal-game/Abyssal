// v906 : grand tour de contrôle avant une version des stores. Visite chaque écran (partie neuve et partie avancée),
// en iPhone SE (320 × 568, 375 × 667) et iPhone 13 (390 × 844), en français et en anglais, et relève :
// erreurs JavaScript, images qui ne se chargent pas, page plus large que l'écran, éléments qui sortent de l'écran,
// boutons dont le texte est coupé, textes non traduits (en anglais). Captures dans le dossier donné.
// Usage : python3 -m http.server 8092 (dans le dépôt), puis node tools/audit-ecrans.mjs <dossier> [fr,en] [320,375,390]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const OUT = process.argv[2] || '/tmp/audit';
const LANGS = (process.argv[3] || 'fr,en').split(',');
const WIDTHS = (process.argv[4] || '320,375,390').split(',').map(Number);
const H = { 320: 568, 375: 667, 390: 844 };
const ROUTES = ['', 'collection', 'boutique', 'coffres', 'tirage', 'descente', 'epreuves', 'jeux', 'sceaux', 'encheres', 'pacte', 'cryptes', 'versus', 'menu', 'bestiaire', 'factions', 'succes', 'profil', 'parametres', 'compte', 'amis', 'equipe', 'renfort', 'fournaise', 'codex', 'parrainage'];
fs.mkdirSync(OUT, { recursive: true });
const demo = JSON.parse(execFileSync('node', ['tools/store-demo-save.mjs', 'combat'], { maxBuffer: 1 << 26 }).toString());
demo.descent.run = null; demo.settings = { ...(demo.settings || {}), dev: true }; demo.devCodex = true;
const SAVES = { neuf: null, avance: demo };
const report = [];
const add = (k, where, what) => report.push({ k, where, what });

const b = await chromium.launch();
for (const lang of LANGS) for (const W of WIDTHS) for (const [who, save] of Object.entries(SAVES)) {
  const ctx = await b.newContext({ viewport: { width: W, height: H[W] || 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', hasTouch: true });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const p = await ctx.newPage();
  let here = 'démarrage';
  p.on('pageerror', (e) => add('erreur JS', `${lang} ${W} ${who} ${here}`, e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/.test(m.text())) add('console', `${lang} ${W} ${who} ${here}`, m.text().slice(0, 160)); });
  p.on('requestfailed', (r) => { const u = r.url(); if (u.includes('localhost') && !/supabase/.test(u)) add('fichier introuvable', `${lang} ${W} ${who} ${here}`, u.replace(/^.*8092\//, '')); });
  p.on('response', (r) => { const u = r.url(); if (u.includes('localhost:8092') && r.status() >= 400) add('fichier introuvable', `${lang} ${W} ${who} ${here}`, `${r.status()} ${u.replace(/^.*8092\//, '')}`); });
  await p.goto('http://localhost:8092/robots.txt');
  await p.evaluate(([v, l]) => { localStorage.clear(); if (v) localStorage.setItem('abyssal.save', v); localStorage.setItem('abyssal.nogate', '1'); localStorage.setItem('abyssal.i18n.collect', '1'); localStorage.setItem('abyssal.lang', l); }, [save ? JSON.stringify(save) : null, lang]);
  await p.goto('http://localhost:8092/'); await p.waitForTimeout(2500); await p.mouse.click(W / 2, (H[W] || 844) / 2); await p.waitForTimeout(1500);
  const closeSheets = async () => { for (let i = 0; i < 4; i++) { const c = p.locator('.sheet-close'); if (await c.count()) { await c.last().click({ timeout: 600 }).catch(() => {}); await p.waitForTimeout(200); } } };
  for (const r of ROUTES) {
    here = '#/' + r;
    await p.evaluate((r) => { location.hash = '#/' + r; }, r); await p.waitForTimeout(1300); await closeSheets();
    await p.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
    await p.waitForTimeout(300);
    const res = await p.evaluate(() => {
      const vw = innerWidth, out = { wide: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0, overflow: [], cut: [], img: [] };
      const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const name = (e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join('.')}`;
      const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
      for (const e of document.querySelectorAll('#view *, .sheet *')) {
        if (!vis(e)) continue;
        const r = e.getBoundingClientRect();
        if ((r.right > vw + 2 || r.left < -2) && r.width < vw * 3 && !inScroller(e) && getComputedStyle(e).position !== 'fixed') out.overflow.push(`${name(e)} (${Math.round(r.left)}→${Math.round(r.right)})`);
        if (e.matches('button, .btn, .chip, a.btn') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && (e.textContent || '').trim()) out.cut.push(`${name(e)} « ${e.textContent.trim().slice(0, 40)} »`);
        if (e.tagName === 'IMG' && e.complete && e.naturalWidth === 0 && e.getAttribute('src')) out.img.push(e.getAttribute('src'));
      }
      out.overflow = [...new Set(out.overflow)].slice(0, 6); out.cut = [...new Set(out.cut)].slice(0, 6); out.img = [...new Set(out.img)];
      return out;
    });
    const w = `${lang} ${W} ${who} ${here}`;
    if (res.wide) add('page trop large', w, `${res.wide}px pour ${W}px`);
    res.overflow.forEach((x) => add('sort de l’écran', w, x));
    res.cut.forEach((x) => add('bouton coupé', w, x));
    res.img.forEach((x) => add('image cassée', w, x));
    if (W === 390 || W === 320) await p.screenshot({ path: `${OUT}/${lang}-${W}-${who}-${r || 'accueil'}.png` });
  }
  if (lang !== 'fr') { const m = await p.evaluate(() => [...(window.__i18nMissing || new Map())].map(([k]) => k)); m.forEach((k) => add('non traduit', `${lang} ${who}`, k.slice(0, 120))); }
  await ctx.close();
}
await b.close();
const by = {};
for (const x of report) { const key = `${x.k} | ${x.what}`; (by[key] ||= { ...x, n: 0, where: new Set() }); by[key].n++; by[key].where.add(x.where); }
const lines = Object.values(by).sort((a, c) => a.k.localeCompare(c.k)).map((x) => `[${x.k}] ${x.what}  — ${x.n}× (${[...x.where].slice(0, 3).join(' ; ')})`);
fs.writeFileSync(`${OUT}/rapport.txt`, lines.join('\n') + '\n');
console.log(`${lines.length} problèmes distincts (rapport : ${OUT}/rapport.txt)`);
