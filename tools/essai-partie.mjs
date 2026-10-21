// v539 : essai du serveur de partie dans Chromium, sans Supabase : la fonction « partie » est remplacée par le vrai code du
// serveur (serveur/partie.mjs) avec une base en mémoire. Vérifie : premier contact, booster tiré par le serveur, triche annulée,
// tour des écrans sans erreur. Usage : python3 -m http.server 8092 (dans le dossier du jeu), puis
//   node tools/essai-partie.mjs [server|legacy] [dossier des captures]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { handle } from '../serveur/partie.mjs';

const UID = '11111111-1111-1111-1111-111111111111';
const mode = process.argv[2] || 'server', SHOTS = process.argv[3];
const rows = new Map(), calls = [];
const db = {
  async lock(u) { return JSON.parse(JSON.stringify(rows.get(u) || { data: null, version: 0, seqs: {} })); }, async unlock() {},
  async save(u, r) { rows.set(u, JSON.parse(JSON.stringify(r))); return true; }, async legacySave() { return null; }, async isCreator() { return false; },
  async publish() {}, async versusDuel() { return null; }, async shadowDrew() { return false; }, async rpc(n) { throw new Error(`rpc ${n}`); },
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, serviceWorkers: 'block', locale: 'fr-FR' });
let legacySaves = 0;
await ctx.route(/supabase\.co/, async (r) => {
  const u = r.request().url(), m = r.request().method();
  const json = (x, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
  if (u.includes('/functions/v1/partie')) {
    if (mode === 'legacy') return json({ message: 'Requested function was not found' }, 404);
    const body = JSON.parse(r.request().postData() || '{}');
    const out = await handle({ uid: UID, token: 't', body }, { db });
    calls.push(body.ops.map((o) => o.m).join(',') || '-');
    return json(out.body, out.status);
  }
  if (u.includes('/rest/v1/saves') && m === 'POST') { legacySaves++; return r.fulfill({ status: 201, body: '' }); }
  if (u.includes('/profiles') && m === 'GET') return json([{ id: UID, pseudo: 'Alice', pseudo_locked: true }]);
  if (m === 'GET') return json([]);
  return u.includes('/rpc/') ? json(null) : r.fulfill({ status: 204, body: '' });
});
const p = await ctx.newPage(); p.setDefaultTimeout(5000);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:8092/robots.txt');
await p.evaluate((me) => { localStorage.clear(); localStorage.setItem('abyssal.session', JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: Date.now() + 9e6, user: { id: me, email: 'a@b.c' } })); }, UID);
await p.goto('http://localhost:8092/'); await p.waitForTimeout(2500); await p.mouse.click(195, 330); await p.waitForTimeout(2500);
const tidy = async () => { for (let i = 0; i < 4; i++) { await p.evaluate(() => document.querySelectorAll('.coach button, .sheet-close').forEach((x) => x.click())); await p.waitForTimeout(250); } };
const st = () => p.evaluate(() => { const g = window.__abyssal.game; return { shards: g.s.shards, col: Object.keys(g.s.collection).length, boosters: g.s.stats.boosters }; });
const srv = () => rows.get(UID)?.data;
await tidy();
await p.evaluate(() => { location.hash = '#/boutique'; }); await p.waitForTimeout(1200); await tidy();
await p.evaluate(() => document.querySelector('.shop-buy')?.click()); await p.waitForTimeout(1500);
const shown = await p.locator('.opening').count();
if (SHOTS) await p.screenshot({ path: `${SHOTS}/partie-${mode}-ouverture.png` });
await p.evaluate(() => { document.querySelector('.opening')?.remove(); document.body.classList.remove('battle-mode'); });
console.log('ouverture affichée', shown, '· téléphone', JSON.stringify(await st()), mode === 'server' ? `· serveur ${JSON.stringify({ shards: srv().shards, col: Object.keys(srv().collection).length, boosters: srv().stats.boosters })}` : '');
// triche : éclats ajoutés sur le téléphone, puis une action ordinaire
await p.evaluate(async () => { const g = window.__abyssal.game; g.s.shards += 99999; g.markAllSeen(); try { await window.__abyssal.partie.flush(); } catch (e) { /* rien */ } });
await p.waitForTimeout(3500);
await p.evaluate(async () => { try { await window.__abyssal.partie.flush(); } catch (e) { /* rien */ } }); await p.waitForTimeout(500);
console.log('après la triche · téléphone', (await st()).shards, mode === 'server' ? `· serveur ${srv().shards}` : '');
// v540 : un vrai combat joué par l'écran de combat (toucher les ennemis), défense automatique, puis comparaison avec le serveur
await p.evaluate(() => { const g = window.__abyssal.game; g.setSetting('defense', 'auto'); g.setSetting('motion', 'reduce'); g.setSetting('combatFast', true); g.setTeam(g.autoTeam()); g.startRun(); const run = g.s.descent.run; if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]); g.startBattle('fight'); location.hash = '#/aventure'; });
await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#/descente'; }); await p.waitForTimeout(1500);
let fought = 0;
for (let i = 0; i < 240; i++) {
  const over = await p.evaluate(() => !window.__abyssal.game.s.descent.run?.battle || !!window.__abyssal.game.s.descent.run.battle.over);
  if (over) break;
  await p.evaluate(() => { document.querySelectorAll('.coach button, .sheet-close').forEach((x) => x.click()); const e = document.querySelector('.dv-c.enemy:not(.dead)'); if (e) e.click(); });
  fought++; await p.waitForTimeout(500);
}
await p.waitForTimeout(2500); await tidy();
await p.evaluate(async () => { for (let i = 0; i < 4; i++) { try { await window.__abyssal.partie.flush(); } catch (e) { /* rien */ } } });
await p.waitForTimeout(800);
const fin = await p.evaluate(async () => { const { digest } = await import('./js/core/ops.js'); const g = window.__abyssal.game; return { d: digest(g.s), floor: g.s.descent.run?.cleared ?? g.s.descent.last?.floor, best: g.s.descent.best, shards: g.s.shards, ops: (await import('./js/cloud/partie.js')).pendingOps() }; });
if (mode === 'server') { const { digest } = await import('../js/core/ops.js'); console.log('combat joué par l’écran (', fought, 'touchers) · téléphone', JSON.stringify(fin), '· serveur', JSON.stringify({ d: digest(srv()), floor: srv().descent.run?.cleared ?? srv().descent.last?.floor, best: srv().descent.best, shards: srv().shards }), fin.d === digest(srv()) ? '· IDENTIQUES' : '· DIFFÉRENTS'); }
else console.log('combat joué par l’écran (', fought, 'touchers) ·', JSON.stringify(fin));
// tour des écrans
for (const r of ['', 'collection', 'boutique', 'coffres', 'descente', 'epreuves', 'jeux', 'sceaux', 'pacte', 'cryptes', 'encheres', 'menu', 'bestiaire', 'succes', 'profil', 'parametres', 'compte', 'amis', 'equipe', 'renfort', 'fournaise']) {
  await p.evaluate((r) => { location.hash = '#/' + r; }, r); await p.waitForTimeout(700); await tidy();
}
await p.evaluate(() => { location.hash = '#/parametres'; }); await p.waitForTimeout(700); await tidy();
await p.evaluate(() => document.querySelector('[data-act="tab"][data-k="about"]')?.click()); await p.waitForTimeout(500);
console.log('À propos :', await p.evaluate(() => document.querySelector('.set-partie')?.textContent || '(absent)'));
if (SHOTS) await p.screenshot({ path: `${SHOTS}/partie-${mode}-apropos.png` });
console.log('envois au serveur', calls.length, '· anciennes sauvegardes', legacySaves, '· erreurs', JSON.stringify(errs));
await b.close();
