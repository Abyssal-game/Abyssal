// Essai de l'application Android sur un téléphone simulé (GitHub Actions, voir .github/workflows/android.yml).
// Lance l'app, touche l'écran d'ouverture, visite quelques écrans, teste le bouton retour, et enregistre
// des captures + un rapport dans android-smoke/. Pilote la page du jeu par le débogage de la WebView.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const OUT = 'android-smoke'; fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.abyssalgame.abyssal';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { steps: [], errors: [] };
// le rapport est écrit même si l'essai s'interrompt (téléphone simulé arrêté…)
process.on('exit', () => { fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(report, null, 1)); console.log('RAPPORT', JSON.stringify(report)); });
const step = (name, data = {}) => { report.steps.push({ name, ...data }); console.log('•', name, JSON.stringify(data)); };
let n = 0;
const shot = (name) => {
  const f = `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`;
  try { execSync(`adb exec-out screencap -p > ${f}`); step(`capture ${f}`); }
  catch (e) { fs.rmSync(f, { force: true }); report.errors.push(`capture ${name} impossible : ${String(e.message).split('\n')[1] || e.message}`); }
};
const alive = () => { try { return !!sh(`adb shell pidof ${PKG}`); } catch (e) { return false; } };

sh(`adb install -r ${process.argv[2] || 'android/app/build/outputs/apk/debug/app-debug.apk'}`);
sh('adb logcat -c');
sh(`adb shell am start -n ${PKG}/.MainActivity`);
await sleep(12000);
shot('ouverture');
const [, W, H] = sh('adb shell wm size').match(/(\d+)x(\d+)/).map(Number);
step('écran', { W, H });

// débogage de la WebView : on s'y connecte comme à un navigateur
const pid = sh(`adb shell pidof ${PKG}`);
sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);
// petit client du protocole de débogage (la WebView d'Android n'accepte pas les outils de navigateur complets)
const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = targets.find((t) => t.type === 'page' && !t.url.startsWith('about:')) || targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const waiting = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') report.errors.push(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') report.errors.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
};
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp('Runtime.enable');
const page = {
  url: () => target.url,
  evaluate: async (fn, arg) => {
    const res = await cdp('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg)})`, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || 'erreur');
    return res.result?.result?.value;
  },
};
step('page', { url: page.url() });

sh(`adb shell input tap ${W / 2} ${H / 2}`);
await sleep(5000);
shot('accueil');
const info = await page.evaluate(() => ({
  native: !!window.Capacitor?.isNativePlatform?.(), classe: document.documentElement.className,
  swControle: !!navigator.serviceWorker?.controller, hash: location.hash,
  plugins: Object.keys(window.Capacitor?.Plugins || {}),
  zoneSure: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
}));
step('état', info);

// premier lancement : le guide d'accueil est ouvert, le bouton retour doit le fermer
const sheets = () => page.evaluate(() => document.querySelectorAll('.sheet-wrap').length);
const before = await sheets();
sh('adb shell input keyevent KEYCODE_BACK'); await sleep(1500);
step('retour sur le guide d’accueil', { fenetresAvant: before, fenetresApres: await sheets() });
const closeTips = async () => { for (let i = 0; i < 4 && await page.evaluate(() => !!document.querySelector('.coach button')); i++) { sh('adb shell input keyevent KEYCODE_BACK'); await sleep(700); } };
for (const [h, name] of [['#/collection', 'collection'], ['#/boutique', 'boosters'], ['#/descente', 'aventure'], ['#/parametres', 'reglages']]) {
  await page.evaluate((x) => { location.hash = x; }, h); await sleep(3500); await closeTips(); shot(name);
  step(`écran ${name}`, { appEnVie: alive(), contenu: await page.evaluate(() => { const m = document.querySelector('#app, main') || document.body; const ps = [...m.querySelectorAll('.panel')]; return { panneaux: ps.length, visibles: ps.filter((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.1; }).length, texte: (m.innerText || '').length }; }) });
}
// bouton retour : depuis Réglages, on doit revenir à l'écran précédent, pas quitter le jeu
sh('adb shell input keyevent KEYCODE_BACK'); await sleep(1500);
step('retour 1', { hash: await page.evaluate(() => location.hash), auPremierPlan: sh('adb shell dumpsys activity activities').includes(`${PKG}/.MainActivity`) });
// une fenêtre ouverte se ferme avec le bouton retour
await page.evaluate(() => { location.hash = '#/compte'; }); await sleep(2000);
shot('compte');
await page.evaluate(() => { location.hash = '#/'; }); await sleep(1500);
sh('adb shell input keyevent KEYCODE_BACK'); await sleep(1500);
step('retour à l’accueil (l’app passe en arrière-plan)', { focus: sh('adb shell dumpsys window | grep -m1 mCurrentFocus || true') });

fs.writeFileSync(`${OUT}/logcat.txt`, sh('adb logcat -d -s Capacitor:* Capacitor/Console:* chromium:* AndroidRuntime:E || true'));
console.log('ERREURS JS :', report.errors.length ? report.errors : 'aucune');
ws.close();
