// v907 : tour de contrôle « en action » : un robot joue jusqu'au bout l'ouverture d'un booster, un combat de la Descente
// et une partie de chaque jeu du Cercle (Duels des Sceaux, Pacte, Cryptes, Enchères), en iPhone SE et iPhone 13, en
// français et en anglais. Relève les erreurs JavaScript, les fichiers introuvables, les éléments hors écran et les
// boutons coupés à chaque étape, et prend une capture au début, au milieu et à la fin.
// Usage : python3 -m http.server 8092 (dans le dépôt), puis node tools/audit-action.mjs <dossier> [fr,en] [320,390]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const OUT = process.argv[2] || '/tmp/audit-action';
const LANGS = (process.argv[3] || 'fr,en').split(',');
const WIDTHS = (process.argv[4] || '320,390').split(',').map(Number);
const H = { 320: 568, 375: 667, 390: 844 };
fs.mkdirSync(OUT, { recursive: true });
const demo = JSON.parse(execFileSync('node', ['tools/store-demo-save.mjs', 'combat'], { maxBuffer: 1 << 26 }).toString());
demo.descent.run = null; demo.settings = { ...(demo.settings || {}), defense: 'auto', combatFast: true };
const report = [], done = [];
const add = (k, where, what) => report.push({ k, where, what });

const SCENES = {
  async booster(p) {
    await p.evaluate(() => { const g = window.__abyssal.game; g.s.tickets = { ...(g.s.tickets || {}), standard: 3 }; location.hash = '#/boutique'; });
    await p.waitForTimeout(1500);
    await p.evaluate(() => (document.querySelector('[data-open], .shop-buy, [data-act="open"]'))?.click());
    await p.waitForTimeout(1800);
    await p.evaluate(() => document.querySelector('.op-pack')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    await p.locator('.op-pack').first().press('Enter').catch(() => {});
    await p.waitForTimeout(1500);
    return { step: async () => { const box = await p.evaluate(() => { const c = document.querySelector('.op-pile .op-card, .op-pile > *, .op-card'); const r = c?.getBoundingClientRect(); return r ? [r.x + r.width / 2, r.y + r.height / 2] : null; }); if (box) await p.mouse.click(box[0], box[1]); else await p.evaluate(() => document.querySelector('.op-next, .op-done, [data-op="next"], [data-op="done"]')?.click()); },
      over: () => p.evaluate(() => !document.querySelector('.op-pile .op-card, .op-pack') || !!document.querySelector('.op-summary, .op-recap, .op-done')), max: 30, wait: 700 };
  },
  async combat(p) {
    await p.evaluate(() => { const g = window.__abyssal.game; g.setSetting('defense', 'auto'); g.setSetting('combatFast', true); g.setTeam(g.autoTeam()); g.startRun(); const run = g.s.descent.run; if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]); g.startBattle('fight'); location.hash = '#/aventure'; });
    await p.waitForTimeout(400); await p.evaluate(() => { location.hash = '#/descente'; }); await p.waitForTimeout(1800);
    return { step: () => p.evaluate(() => { const e = document.querySelector('.dv-c.enemy:not(.dead)'); if (e) e.click(); }),
      over: () => p.evaluate(() => !window.__abyssal.game.s.descent.run?.battle || !!window.__abyssal.game.s.descent.run.battle.over), max: 260, wait: 450 };
  },
  async sceaux(p) {
    await p.evaluate(() => { location.hash = '#/sceaux'; }); await p.waitForTimeout(1500);
    await p.locator('[data-sc="play"]').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(2500);
    return { step: () => p.evaluate(() => { const h = document.querySelector('.sc-hc:not([disabled])'); if (h) h.click(); const c = document.querySelector('.sc-cell[data-sc="cell"]'); if (c) c.click(); }),
      over: () => p.evaluate(() => !!document.querySelector('.sc-end')), max: 60, wait: 1600 };
  },
  async pacte(p) {
    await p.evaluate(() => { location.hash = '#/pacte'; }); await p.waitForTimeout(1500);
    await p.locator('[data-pa="play"]').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(2500);
    let n = 0;
    return { step: () => p.evaluate((k) => { const draw = document.querySelector('[data-pa="draw"]:not([disabled])'), stop = document.querySelector('[data-pa="stop"]:not([disabled])'); if (stop && k % 4 === 3) stop.click(); else if (draw) draw.click(); else if (stop) stop.click(); }, n++),
      over: () => p.evaluate(() => !!document.querySelector('.sc-end')), max: 160, wait: 1300 };
  },
  async cryptes(p) {
    await p.evaluate(() => { location.hash = '#/cryptes'; }); await p.waitForTimeout(1500);
    await p.locator('[data-cr="play"]').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(2500);
    return { step: () => p.evaluate(() => { const skip = document.querySelector('[data-cr="skip"]'); if (skip) { skip.click(); return; } const cs = [...document.querySelectorAll('.cr-c[data-cr="c"]:not(.up):not(.gone)')]; if (cs.length) cs[Math.floor(Math.random() * cs.length)].click(); }),
      over: () => p.evaluate(() => !!document.querySelector('.sc-end')), max: 200, wait: 1100 };
  },
  async encheres(p) {
    await p.evaluate(() => { location.hash = '#/encheres'; }); await p.waitForTimeout(1500);
    await p.locator('[data-en="play"]').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(2500);
    return { step: () => p.evaluate(() => { const os = [...document.querySelectorAll('[data-en="o"]:not([disabled])')]; if (os.length) os[Math.floor(Math.random() * os.length)].click(); document.querySelector('[data-en="bid"]:not([disabled])')?.click(); }),
      over: () => p.evaluate(() => !!document.querySelector('.sc-end')), max: 80, wait: 1800 };
  },
};

const check = (p) => p.evaluate(() => {
  const vw = innerWidth, out = { overflow: [], cut: [] };
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const name = (e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join('.')}`;
  const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
  for (const e of document.querySelectorAll('button, .btn, b, small, span, p, h1, h2, h3')) {
    if (!vis(e) || e.closest('.as, .dv-fx, .fx, [aria-hidden="true"]')) continue;
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && r.width < vw * 2 && !inScroller(e) && getComputedStyle(e).position !== 'fixed' && (e.textContent || '').trim()) out.overflow.push(`${name(e)} « ${e.textContent.trim().slice(0, 30)} »`);
    if (e.matches('button, .btn') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && (e.textContent || '').trim()) out.cut.push(`${name(e)} « ${e.textContent.trim().slice(0, 40)} »`);
  }
  return { overflow: [...new Set(out.overflow)].slice(0, 5), cut: [...new Set(out.cut)].slice(0, 5) };
});

const b = await chromium.launch();
for (const lang of LANGS) for (const W of WIDTHS) for (const [name, scene] of Object.entries(SCENES)) {
  const ctx = await b.newContext({ viewport: { width: W, height: H[W] || 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', hasTouch: true });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const p = await ctx.newPage(), where = `${lang} ${W} ${name}`;
  p.on('pageerror', (e) => add('erreur JS', where, e.message.slice(0, 180)));
  p.on('console', (m) => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/.test(m.text())) add('console', where, m.text().slice(0, 160)); });
  p.on('response', (r) => { const u = r.url(); if (u.includes('localhost:8092') && r.status() >= 400) add('fichier introuvable', where, `${r.status()} ${u.replace(/^.*8092\//, '')}`); });
  await p.goto('http://localhost:8092/robots.txt');
  await p.evaluate(([v, l]) => { localStorage.clear(); localStorage.setItem('abyssal.save', v); localStorage.setItem('abyssal.nogate', '1'); localStorage.setItem('abyssal.lang', l); }, [JSON.stringify(demo), lang]);
  await p.goto('http://localhost:8092/'); await p.waitForTimeout(2500); await p.mouse.click(W / 2, (H[W] || 844) / 2); await p.waitForTimeout(1500);
  const tidy = () => p.evaluate(() => { document.querySelectorAll('.coach button, .coach-ok, .sheet-close').forEach((x) => x.click()); [...document.querySelectorAll('button')].filter((x) => /^(J’ai compris|Got it|OK|Entendido|Verstanden|Ho capito|Entendi)$/i.test(x.textContent.trim())).forEach((x) => x.click()); });
  let steps = 0, ok = false;
  try {
    const s = await scene(p);
    await tidy();
    await p.screenshot({ path: `${OUT}/${lang}-${W}-${name}-1debut.png` });
    for (; steps < s.max; steps++) {
      await tidy();
      if (await s.over()) { ok = true; break; }
      await s.step(); await p.waitForTimeout(s.wait);
      if (steps === Math.floor(s.max / 6)) { await p.screenshot({ path: `${OUT}/${lang}-${W}-${name}-2milieu.png` }); const c = await check(p); c.overflow.forEach((x) => add('sort de l’écran', where + ' (milieu)', x)); c.cut.forEach((x) => add('bouton coupé', where + ' (milieu)', x)); }
    }
    await p.waitForTimeout(2500); await tidy(); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${lang}-${W}-${name}-3fin.png` });
    const c = await check(p); c.overflow.forEach((x) => add('sort de l’écran', where + ' (fin)', x)); c.cut.forEach((x) => add('bouton coupé', where + ' (fin)', x));
  } catch (e) { add('robot bloqué', where, String(e.message || e).slice(0, 160)); }
  done.push(`${where} : ${ok ? 'terminé' : 'pas terminé'} en ${steps} gestes`);
  await ctx.close();
}
await b.close();
const by = {};
for (const x of report) { const key = `${x.k} | ${x.what}`; (by[key] ||= { ...x, n: 0, where: new Set() }); by[key].n++; by[key].where.add(x.where); }
const lines = Object.values(by).map((x) => `[${x.k}] ${x.what}  — ${x.n}× (${[...x.where].slice(0, 3).join(' ; ')})`);
fs.writeFileSync(`${OUT}/rapport.txt`, [...done, '', ...lines].join('\n') + '\n');
console.log(done.join('\n')); console.log(`${lines.length} problèmes distincts (rapport : ${OUT}/rapport.txt)`);
