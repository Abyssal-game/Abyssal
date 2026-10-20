// v519 : ce qui t'attend en ligne. Vérifié au lancement, au retour dans l'app et toutes les 2 minutes ;
// v521 : aussi le Pari des Boosters (défi relevé, défi reçu), les défis et parties trouvées des Sceaux et les demandes
// d'ami. Chaque nouvelle est annoncée une fois (annonce en bas de l'écran), comptée dans la pastille du sous-onglet
// Jeux, et listée dans « Aujourd'hui » sur l'Accueil (mpw.items).
import * as cloud from './cloud.js';
import { sync } from './sync.js';
import { esc, toast } from '../ui/dom.js';
import { t } from '../i18n.js';
import { syncReminders } from '../notify.js';

export const mpw = { turns: 0, games: 0, friends: 0, items: [] };
const SEEN = 'abyssal.mpSeen';
let last = 0, busy = false;

export async function checkTurns(app, { force = false } = {}) {
  if (busy || !cloud.isLoggedIn() || !sync.profile?.pseudo) return;
  if (!force && Date.now() - last < 110000) return;
  busy = true; last = Date.now();
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '{}'); } catch (e) { /* rien */ }
  const items = [];
  const say = (key, msg, icon = 'hourglass', where = null) => { if (seen[key]) return; seen[key] = 1; if (app.route !== where) toast(msg, { icon, ms: 5500 }); };
  const who = (p) => `<b>${esc(p || t('un joueur'))}</b>`;
  let turns = [];
  // Duels des Sceaux en ligne
  try {
    const L = await cloud.mpList('sceaux');
    turns = L.filter((v) => v.status === 'playing' && v.turn === v.me);
    for (const v of turns) say(`${v.id}:${v.state?.placed}`, t('À toi de jouer aux Duels des Sceaux contre {name} !', { name: who(v.foe?.pseudo) }), 'hourglass', 'sceaux');
    for (const v of L.filter((x) => x.status === 'playing' && x.me === 'a' && !x.state?.placed)) say(`go:${v.id}`, t('Ta partie des Duels des Sceaux contre {name} a commencé !', { name: who(v.foe?.pseudo) }), 'user', 'sceaux');
    const inv = L.filter((v) => v.status === 'waiting' && v.me === 'b');
    for (const v of inv) say(`inv:${v.id}`, t('{name} te défie aux Duels des Sceaux !', { name: who(v.foe?.pseudo) }), 'user', 'sceaux');
    if (turns.length) items.push({ href: '#/sceaux', icon: 'hourglass', title: t(turns.length > 1 ? 'À toi de jouer dans {n} parties des Sceaux' : 'À toi de jouer aux Duels des Sceaux', { n: turns.length }), sub: turns.map((v) => esc(v.foe?.pseudo || '')).join(', ') });
    if (inv.length) items.push({ href: '#/sceaux', icon: 'seal', title: t(inv.length > 1 ? '{n} défis reçus aux Duels des Sceaux' : 'Un défi reçu aux Duels des Sceaux', { n: inv.length }), sub: inv.map((v) => esc(v.foe?.pseudo || '')).join(', ') });
    mpw.turns = turns.length + inv.length;
  } catch (e) { /* serveur sans les parties en ligne : rien */ }
  // Pari des Boosters
  try {
    const d = await cloud.versusList();
    const mine = d?.mine || [];
    const see = mine.filter((r) => r.status === 'done' && !r.claimed);
    const inv = mine.filter((r) => r.status === 'open' && !r.mine);
    for (const r of see) say(`pari:${r.id}`, t('{name} a relevé ton défi au Pari des Boosters : va voir le duel !', { name: who(r.pseudo) }), 'crystal', 'versus');
    for (const r of inv) say(`pinv:${r.id}`, t('{name} te défie au Pari des Boosters !', { name: who(r.pseudo) }), 'crystal', 'versus');
    if (see.length) items.push({ href: '#/versus', icon: 'booster', title: t(see.length > 1 ? '{n} duels du Pari à voir' : 'Un duel du Pari à voir', { n: see.length }), sub: t('Ton défi a été relevé') });
    if (inv.length) items.push({ href: '#/versus', icon: 'booster', title: t(inv.length > 1 ? '{n} défis reçus au Pari des Boosters' : 'Un défi reçu au Pari des Boosters', { n: inv.length }), sub: inv.map((r) => esc(r.pseudo || '')).join(', ') });
    mpw.games = see.length + inv.length;
  } catch (e) { /* rien */ }
  // Demandes d'ami
  try {
    const fr = (await cloud.friendList()).filter((f) => f.status === 'pending' && f.incoming);
    for (const f of fr) say(`fr:${f.id}`, t('{name} veut devenir ton ami !', { name: who(f.pseudo) }), 'user', 'amis');
    if (fr.length) items.push({ href: '#/amis', icon: 'amis', title: t(fr.length > 1 ? '{n} demandes d’ami' : 'Une demande d’ami', { n: fr.length }), sub: fr.map((f) => esc(f.pseudo || '')).join(', ') });
    mpw.friends = fr.length;
  } catch (e) { /* rien */ }
  const keys = Object.keys(seen); if (keys.length > 200) seen = Object.fromEntries(keys.slice(-200).map((k) => [k, 1]));
  try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch (e) { /* rien */ }
  const changed = JSON.stringify(items) !== JSON.stringify(mpw.items);
  mpw.items = items;
  if (changed) { app.chrome?.(); if (app.route === '' && !document.querySelector('.sheet-wrap, .opening, .vd')) app.refresh?.(); }
  syncReminders(app.game, turns.filter((v) => v.pace !== 'fast')); /* v522 : pas de rappel pour les parties rapides */
  busy = false;
}
