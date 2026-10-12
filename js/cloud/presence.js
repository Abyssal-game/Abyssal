// Joueurs connectés en ce moment : « présence » en temps réel de Supabase (Realtime),
// sans bibliothèque ni table : chaque appareil qui a le jeu ouvert rejoint le canal
// « abyssal-en-ligne » et s'y signale ; le serveur tient la liste à jour.
// Aucune donnée personnelle : une clé d'appareil anonyme et tirée au hasard.
import { CLOUD } from './cloud.js';

const TOPIC = 'realtime:abyssal-en-ligne';
const KEY = 'abyssal.presence';
const listeners = new Set();
let ws = null, ref = 0, joinRef = null, beat = 0, retry = 0, timer = 0;
const state = {}; // clé d'appareil -> métadonnées
export const presence = { count: null, status: 'off' }; // status : off | connecting | on | error

function deviceKey() {
  try {
    let k = localStorage.getItem(KEY);
    if (!k) { k = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(KEY, k); }
    return k;
  } catch (e) { return Math.random().toString(36).slice(2); }
}
function emit() { presence.count = presence.status === 'on' ? Math.max(1, Object.keys(state).length) : null; listeners.forEach((f) => f(presence)); }
export function onPresence(fn) { listeners.add(fn); fn(presence); return () => listeners.delete(fn); }
const send = (topic, event, payload) => { if (ws?.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: topic === TOPIC ? joinRef : undefined })); };

export function startPresence() {
  if (ws || typeof WebSocket === 'undefined') return;
  presence.status = 'connecting'; emit();
  const url = `${CLOUD.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(CLOUD.key)}&vsn=1.0.0`;
  try { ws = new WebSocket(url); } catch (e) { return fail(); }
  ws.onopen = () => {
    retry = 0;
    joinRef = String(++ref);
    ws.send(JSON.stringify({ topic: TOPIC, event: 'phx_join', ref: joinRef, join_ref: joinRef, payload: { config: { broadcast: { self: false }, presence: { key: deviceKey() }, private: false } } }));
    clearInterval(beat);
    beat = setInterval(() => send('phoenix', 'heartbeat', {}), 25000);
  };
  ws.onmessage = (m) => {
    let msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
    if (msg.topic !== TOPIC) return;
    if (msg.event === 'phx_reply' && msg.ref === joinRef) {
      if (msg.payload?.status === 'ok') { presence.status = 'on'; send(TOPIC, 'presence', { type: 'presence', event: 'track', payload: { t: Date.now() } }); emit(); }
      else fail();
    } else if (msg.event === 'presence_state') {
      Object.keys(state).forEach((k) => delete state[k]);
      Object.assign(state, msg.payload || {}); emit();
    } else if (msg.event === 'presence_diff') {
      Object.assign(state, msg.payload?.joins || {});
      Object.keys(msg.payload?.leaves || {}).forEach((k) => delete state[k]);
      emit();
    } else if (msg.event === 'phx_error' || msg.event === 'phx_close') fail();
  };
  ws.onclose = () => fail();
  ws.onerror = () => { /* onclose suit */ };
}
function fail() {
  clearInterval(beat);
  if (ws) { ws.onclose = null; try { ws.close(); } catch (e) { /* rien */ } }
  ws = null;
  presence.status = 'error'; emit();
  // nouvel essai, de plus en plus espacé (5 s, 10 s, 20 s… jusqu'à 2 min)
  clearTimeout(timer);
  timer = setTimeout(startPresence, Math.min(120000, 5000 * 2 ** retry++));
}
// L'application passe en arrière-plan : on se retire de la liste ; elle revient : on se reconnecte
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); clearInterval(beat); if (ws) { ws.onclose = null; try { ws.close(); } catch (e) { /* rien */ } ws = null; } presence.status = 'off'; }
    else { retry = 0; startPresence(); }
  });
}
