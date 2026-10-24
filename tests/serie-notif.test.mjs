// v708 : notification « série d'offrandes brisée », le lendemain d'un jour sans visite, à 11 h
import test from 'node:test';
import assert from 'node:assert/strict';

const sched = [];
const LN = {
  getPending: async () => ({ notifications: [] }), cancel: async () => {},
  schedule: async ({ notifications }) => { sched.push(...notifications); },
};
globalThis.window = { addEventListener() {}, removeEventListener() {}, Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', isPluginAvailable: () => false, Plugins: { LocalNotifications: LN } } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.navigator ??= { language: 'fr-FR' };
globalThis.document ??= { addEventListener() {}, documentElement: { lang: 'fr', dataset: {} }, querySelector: () => null };
const { syncDaily } = await import('../js/notify.js');

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const game = (daily, notif = true) => ({ s: { settings: { notif }, daily }, freePack: () => ({ stock: 0 }), codexLive: () => false });

test('programmée au surlendemain de la dernière offrande, à 11 h, avec la série', async () => {
  sched.length = 0;
  const now = new Date();
  await syncDaily(game({ last: ymd(now), streak: 5 }));
  const n = sched.find((x) => x.id === 1003);
  assert.ok(n, 'notification de série programmée');
  const exp = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 11, 0, 0, 0);
  assert.equal(n.schedule.at.getTime(), exp.getTime());
  assert.match(n.body, /\b5\b/);
  assert.match(n.title, /Abyss/);
});

test('rien à perdre (série de 1) ou notifications coupées : pas de notification', async () => {
  sched.length = 0;
  await syncDaily(game({ last: ymd(new Date()), streak: 1 }));
  assert.ok(!sched.some((x) => x.id === 1003));
  await syncDaily(game({ last: ymd(new Date()), streak: 6 }, false));
  assert.ok(!sched.some((x) => x.id === 1003));
});
