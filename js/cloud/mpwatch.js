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
// Jeux en ligne surveillés : textes des annonces, page du jeu, clé qui change à chaque tour
const GAMES = [
  { game: 'sceaux', route: 'sceaux', key: (v) => v.state?.placed, started: (v) => v.state?.placed,
    turn: 'À toi de jouer aux Duels des Sceaux contre {name} !', go: 'Ta partie des Duels des Sceaux contre {name} a commencé !', inv: '{name} te défie aux Duels des Sceaux !',
    turn1: 'À toi de jouer aux Duels des Sceaux', turnsN: 'À toi de jouer dans {n} parties des Sceaux', inv1: 'Un défi reçu aux Duels des Sceaux', invN: '{n} défis reçus aux Duels des Sceaux' },
  { game: 'pacte', route: 'pacte', key: (v) => (v.state?.turns?.a || 0) + (v.state?.turns?.b || 0), started: (v) => v.state?.n,
    turn: 'À toi de jouer au Pacte contre {name} !', go: 'Ta partie du Pacte contre {name} a commencé !', inv: '{name} te défie au Pacte !',
    turn1: 'À toi de jouer au Pacte', turnsN: 'À toi de jouer dans {n} parties du Pacte', inv1: 'Un défi reçu au Pacte', invN: '{n} défis reçus au Pacte' },
  /* v525 : Enchères (les deux joueurs misent en même temps) et Cryptes entre amis */
  { game: 'encheres', route: 'encheres', key: (v) => v.state?.i, started: (v) => v.state?.n,
    turn: 'À toi de miser aux Enchères contre {name} !', go: 'Ta vente des Enchères contre {name} a commencé !', inv: '{name} te défie aux Enchères !',
    turn1: 'À toi de miser aux Enchères', turnsN: 'À toi de miser dans {n} ventes des Enchères', inv1: 'Un défi reçu aux Enchères', invN: '{n} défis reçus aux Enchères' },
  { game: 'cryptes', route: 'cryptes', key: (v) => v.state?.turns, started: (v) => v.state?.n,
    turn: 'À toi de jouer aux Cryptes contre {name} !', go: 'Ta partie des Cryptes contre {name} a commencé !', inv: '{name} te défie aux Cryptes !',
    turn1: 'À toi de jouer aux Cryptes', turnsN: 'À toi de jouer dans {n} parties des Cryptes', inv1: 'Un défi reçu aux Cryptes', invN: '{n} défis reçus aux Cryptes' },
];
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
  // Duels des Sceaux et Pacte en ligne (v523 : le Pacte aussi)
  let nTurns = 0;
  for (const G of GAMES) {
    try {
      const L = await cloud.mpList(G.game);
      const mine = L.filter((v) => v.status === 'playing' && (v.turn === v.me || v.turn === 'ab'));
      turns.push(...mine);
      for (const v of mine) say(`${v.id}:${G.key(v)}`, t(G.turn, { name: who(v.foe?.pseudo) }), 'hourglass', G.route);
      for (const v of L.filter((x) => x.status === 'playing' && x.me === 'a' && !G.started(x))) say(`go:${v.id}`, t(G.go, { name: who(v.foe?.pseudo) }), 'user', G.route);
      const inv = L.filter((v) => v.status === 'waiting' && v.me === 'b');
      for (const v of inv) say(`inv:${v.id}`, t(G.inv, { name: who(v.foe?.pseudo) }), 'user', G.route);
      if (mine.length) items.push({ href: `#/${G.route}`, icon: 'hourglass', title: t(mine.length > 1 ? G.turnsN : G.turn1, { n: mine.length }), sub: mine.map((v) => esc(v.foe?.pseudo || '')).join(', ') });
      if (inv.length) items.push({ href: `#/${G.route}`, icon: 'seal', title: t(inv.length > 1 ? G.invN : G.inv1, { n: inv.length }), sub: inv.map((v) => esc(v.foe?.pseudo || '')).join(', ') });
      nTurns += mine.length + inv.length;
    } catch (e) { /* serveur sans les parties en ligne : rien */ }
  }
  mpw.turns = nTurns;
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
