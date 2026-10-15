// Essai de l'application Android sur un téléphone simulé (GitHub Actions, voir .github/workflows/android.yml).
// Lance l'app, touche l'écran d'ouverture, visite quelques écrans, teste le bouton retour, et enregistre
// des captures + un rapport dans android-smoke/. Pilote la page du jeu par le débogage de la WebView.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = 'android-smoke'; fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.abyssalgame.abyssal';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { steps: [], errors: [] };
const step = (name, data = {}) => { report.steps.push({ name, ...data }); console.log('•', name, JSON.stringify(data)); };
let n = 0;
const shot = (name) => { const f = `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`; execSync(`adb exec-out screencap -p > ${f}`); step(`capture ${f}`); };

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
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages().find((p) => !p.url().startsWith('about:')) || browser.contexts()[0].pages()[0];
page.on('pageerror', (e) => report.errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
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

for (const [h, name] of [['#/collection', 'collection'], ['#/boutique', 'boosters'], ['#/descente', 'aventure'], ['#/parametres', 'reglages']]) {
  await page.evaluate((x) => { location.hash = x; }, h); await sleep(2500); shot(name);
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
fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(report, null, 1));
console.log('ERREURS JS :', report.errors.length ? report.errors : 'aucune');
await browser.close().catch(() => {});
