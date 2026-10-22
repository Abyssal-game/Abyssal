// v618 : mises à jour à distance de l'application iPhone : liste signée, fichiers vérifiés, essai puis adoption de la version.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { liveManifest, liveText, KEEP, ROOT } from '../tools/live-manifest.mjs';
import { liveSign } from '../tools/live-site.mjs';
import { VERSION, LIVE_BASES } from '../js/config.js';

// Faux iPhone : stockage, Capacitor (Filesystem, WebView, App), réseau.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.document = { querySelector: () => ({ children: [1] }) };
const disk = new Map(); // chemin (dans Library/NoCloud) → Buffer
const BUILTIN = '/app/public';
const builtin = { 'index.html': 'accueil v1', 'js/a.js': 'a1', 'js/old.js': 'ancien', 'assets/x.webp': 'image' };
const calls = [];
const FS = {
  async getUri({ path: p }) { return { uri: `file:///lib/NoCloud/${p}` }; },
  async rmdir({ path: p }) { for (const k of [...disk.keys()]) if (k.startsWith(p + '/')) disk.delete(k); },
  async mkdir() {},
  async copy({ from, to }) { assert.equal(from, `file://${BUILTIN}`); for (const [f, c] of Object.entries(builtin)) disk.set(`${to}/${f}`, Buffer.from(c)); },
  async writeFile({ path: p, data, encoding }) { disk.set(p, encoding ? Buffer.from(data, 'utf8') : Buffer.from(data, 'base64')); },
  async deleteFile({ path: p }) { disk.delete(p); },
  async readdir() { return { files: [] }; },
};
const WebView = {
  async getServerBasePath() { return { path: BUILTIN }; },
  async setServerBasePath(o) { calls.push(['set', o.path]); },
  async persistServerBasePath() { calls.push(['persist']); },
};
const App = { async getInfo() { return { build: String(+VERSION.slice(1)) }; }, addListener() {} };
globalThis.window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: { Filesystem: FS, WebView, App } } };

const h = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const listOf = (files, v) => ({ v, native: +VERSION.slice(1), files: Object.fromEntries(Object.entries(files).map(([f, c]) => [f, h(c)])) });
const remote = { 'index.html': 'accueil v2', 'js/a.js': 'a1', 'assets/x.webp': 'image', 'js/b.js': 'nouveau' };
const NEXT = +VERSION.slice(1) + 1;
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const jwk = publicKey.export({ format: 'jwk' });
let served = {};
globalThis.fetch = async (url) => {
  const u = String(url).split('?')[0];
  const body = u === 'live.json' ? JSON.stringify(listOf(builtin, +VERSION.slice(1))) : served[u.replace(LIVE_BASES[0], '')];
  if (body == null) return { ok: false, status: 404 };
  const buf = Buffer.from(body);
  return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) };
};
const L = await import('../js/live.js');

test('live : différence entre deux listes, version voulue ou non', () => {
  const d = L.liveDiff(listOf(builtin, 1), listOf(remote, 2));
  assert.deepEqual(d.get.sort(), ['index.html', 'js/b.js']);
  assert.deepEqual(d.drop, ['js/old.js']);
  const run = +VERSION.slice(1);
  assert.ok(L.liveWanted({ v: run + 1, native: run }, { running: run, native: run }));
  assert.ok(!L.liveWanted({ v: run, native: run }, { running: run, native: run }), 'même version');
  assert.ok(!L.liveWanted({ v: run + 1, native: run + 1 }, { running: run, native: run }), 'demande une application plus récente');
  assert.ok(!L.liveWanted({ v: run + 1, native: run }, { running: run, native: run, bad: [run + 1] }), 'version qui a planté');
});

test('live : signature vérifiée (clé publique), liste modifiée refusée', async () => {
  const text = JSON.stringify(listOf(remote, NEXT));
  const sig = liveSign(text, pem);
  assert.ok(await L.liveVerify(text, sig, jwk));
  const forged = text.replace(`"v":${NEXT}`, `"v":${NEXT + 5}`);
  assert.notEqual(forged, text);
  assert.ok(!(await L.liveVerify(forged, sig, jwk)), 'liste modifiée après signature');
  assert.ok(!(await L.liveVerify(text, sig, null)), 'sans clé publique, rien n’est accepté');
  assert.ok(!(await L.liveVerify(text, '', jwk)));
});

test('live : liste des fichiers du jeu (empreintes justes, live.json non suivi par git)', () => {
  const m = liveManifest();
  assert.equal(m.v, +VERSION.slice(1));
  assert.ok(m.files['index.html'] && m.files['js/live.js'] && !Object.keys(m.files).some((f) => !KEEP.includes(f.split('/')[0])));
  assert.equal(m.files['js/live.js'], h(fs.readFileSync(path.join(ROOT, 'js/live.js'))));
  assert.ok(liveText().startsWith('{\n'));
  assert.ok(!fs.existsSync(path.join(ROOT, 'live.json')), 'live.json est fabriqué à la publication, pas gardé dans le dépôt');
});

test('live : sans signature, rien n’est téléchargé', async () => {
  L.liveTestKey(jwk);
  served = { 'live.json': JSON.stringify(listOf(remote, NEXT)) };
  const st = await L.liveCheck({ force: true });
  assert.equal(st.state, 'unsigned');
  assert.equal(disk.size, 0);
});

test('live : fichier modifié en route (empreinte fausse) : version refusée', async () => {
  const text = JSON.stringify(listOf(remote, NEXT));
  served = { 'live.json': text, 'live.sig': liveSign(text, pem), 'index.html': 'accueil v2', 'js/b.js': 'code piégé' };
  const st = await L.liveCheck({ force: true });
  assert.equal(st.state, 'error');
  assert.equal(st.ready, null);
});

test('live : version signée téléchargée, essayée au lancement, puis gardée', async () => {
  disk.clear();
  const text = JSON.stringify(listOf(remote, NEXT));
  served = { 'live.json': text, 'live.sig': liveSign(text, pem), 'index.html': 'accueil v2', 'js/b.js': 'nouveau' };
  const st = await L.liveCheck({ force: true });
  assert.equal(st.state, 'ready');
  assert.equal(st.ready, NEXT);
  const dir = `ionic_built_snapshots/v${NEXT}`;
  assert.equal(disk.get(`${dir}/index.html`).toString(), 'accueil v2');
  assert.equal(disk.get(`${dir}/js/b.js`).toString(), 'nouveau');
  assert.equal(disk.get(`${dir}/js/a.js`).toString(), 'a1', 'fichier inchangé : recopié, pas téléchargé');
  assert.ok(!disk.has(`${dir}/js/old.js`), 'fichier retiré');
  assert.equal(disk.get(`${dir}/live.json`).toString(), text);
  // lancement suivant : l'app repart sur la nouvelle version
  await L.initLive();
  assert.deepEqual(calls.at(-1), ['set', `/lib/NoCloud/${dir}`]);
  const s = JSON.parse(localStorage.getItem('abyssal.live'));
  assert.equal(s.trying, NEXT);
  assert.equal(s.ready, null);
});

test('live : une version qui n’a pas tenu est écartée', async () => {
  // l'app a été relancée sur l'ancienne version (plantage de la nouvelle) : on ne la reprend plus
  await L.initLive();
  const s = JSON.parse(localStorage.getItem('abyssal.live'));
  assert.equal(s.trying, null);
  assert.ok(s.bad.includes(NEXT));
  const st = await L.liveCheck({ force: true });
  assert.equal(st.state, 'uptodate');
});

test('live : Android, le jeu embarqué est recopié par le plugin natif LiveCopy', async () => {
  mem.clear(); disk.clear(); calls.length = 0;
  const C = globalThis.window.Capacitor;
  C.getPlatform = () => 'android';
  const dirs = [];
  const fsGetUri = FS.getUri;
  FS.getUri = async (o) => { dirs.push(o.directory); return fsGetUri(o); };
  C.Plugins.LiveCopy = { async copy({ from, to }) {
    assert.equal(from, 'public', 'jeu embarqué (assets « public »)');
    const rel = to.replace('/lib/NoCloud/', '');
    for (const [f, c] of Object.entries(builtin)) disk.set(`${rel}/${f}`, Buffer.from(c));
    return { path: to };
  } };
  WebView.getServerBasePath = async () => ({ path: 'public' });
  try {
    assert.ok(L.liveOn());
    const text = JSON.stringify(listOf(remote, NEXT + 1));
    served = { 'live.json': text, 'live.sig': liveSign(text, pem), 'index.html': 'accueil v2', 'js/b.js': 'nouveau' };
    const st = await L.liveCheck({ force: true });
    assert.equal(st.state, 'ready');
    const dir = `live/v${NEXT + 1}`;
    assert.equal(disk.get(`${dir}/js/b.js`).toString(), 'nouveau');
    assert.equal(disk.get(`${dir}/js/a.js`).toString(), 'a1');
    assert.ok(dirs.every((d) => d === 'DATA'), 'dossier de l’application sur Android');
    await L.initLive();
    assert.deepEqual(calls.at(-1), ['set', `/lib/NoCloud/${dir}`]);
  } finally { C.getPlatform = () => 'ios'; delete C.Plugins.LiveCopy; FS.getUri = fsGetUri; }
});
