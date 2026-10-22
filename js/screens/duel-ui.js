// ABYSSAL : écran du combat tactique.
// Toucher une de tes créatures ouvre ses actions (Attaque, compétence, Défense, Permuter) ; on choisit
// ensuite la cible. Les compétences à risque montrent leurs chances et modificateurs avant le jet de D20.
// Tour ennemi : chaque ennemi exécute son intention ; les attaques dangereuses ouvrent la défense
// active (esquive dans l'or, parade parfaite sur le trait blanc, au dernier instant). Toute la logique est dans core/duel.js.
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil, roleIcon, actIcon, crestHTML } from '../ui/icons.js';
import { esc, openSheet, toast, frSpaces } from '../ui/dom.js';
import { deName } from '../core/synergy.js';
import { LANG, t as tr, tx, tw } from '../i18n.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { cardHTML } from '../ui/card.js';
import {
  BOSS_POWERS, FORBID, INTENTS, SYNERGIES, PACK_BONUS, FERVOR_MAX, AP_MAX, PA_MAX, passTurn, speedOf, front, reserve, actionsFor, actionTargets, act, preview,
  ENTRANCES, GOALS, goalState, RUNES, runesLeft, SERVANT_POWER, RHYTHM, PHASE2, beginEnemyTurn, nextEnemy, enemyAct, endEnemyTurn, takeSkips, defenseWindow, intentInfo, useUlt, ultReady, autoActs, comboOf,
} from '../core/duel.js';
import { KITS, AI_FAMILIES, DICE_TIERS, WEAK_TO, TALENTS } from '../core/skills.js';
import { BOSSES, LAWS, ASPECTS } from '../core/bosses.js';
// v328 : premier combat allégé — pendant les deux premiers étages de la première expédition, seules la main dorée et les
// bulles de base s'affichent ; Marque/enchaînement, pouvoir d'équipe et dés attendent la suite (relisibles dans Réglages)
const CB_ICON = new Set(['bastion', 'chasse', 'glace']); // images présentes dans assets/icons/cb-*.webp
import { PACTS } from '../core/pacts.js';
import { TRAITS, traitIcon, OMENS } from '../core/descent.js';
import { RELICS } from '../core/relics.js';
import { ULTS } from '../core/army.js';
import { mountDiorama, roomFor } from '../ui/diorama.js';
import { moveIconUrl, passivesOf, passiveIconUrl, moveFor, PASSIVES } from '../core/kits.js';
import { hap } from '../ui/sound.js';
import { playBar, defVerdict, FAM_RHYTHM, KIND_RHYTHM, BOSS_ASSAULT } from '../ui/def-bar.js'; /* v594 */
import { getTune } from '../ui/def-tune.js';
import { perfStart, perfStop, perfMark } from '../ui/perf.js'; /* v601 : moniteur de fluidité */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Décor selon la profondeur (salle du Gardien à part) et effets illustrés (fond noir fondu en mode « écran »)
const bgOld = (run) => `assets/battle/bg-${run.room === 'boss' ? 'boss' : run.floor >= 15 ? 4 : run.floor >= 10 ? 3 : run.floor >= 5 ? 2 : 1}.webp`;
// Décor propre à l'étage : un décor tous les 2 étages (f-1 à f-16), un décor unique par gardien (g-1 à g-8).
// Si l'image n'existe pas encore, l'ancien décor (posé dessous) reste visible.
export function floorBg(floor, room) {
  if (room === 'boss' || floor % 5 === 0) return `assets/battle/g-${Math.min(8, Math.max(1, Math.round(floor / 5)))}.webp`;
  const n = floor - Math.floor(floor / 5); // rang parmi les étages sans gardien
  return `assets/battle/f-${Math.min(16, Math.ceil(n / 2))}.webp`;
}
const abs = (u) => new URL(u, document.baseURI).href;
const bgOf = (run) => `url(${abs(floorBg(run.floor, run.room))}), url(${abs(bgOld(run))})`;
const FX = ['break', 'parry', 'crit', 'swallow', 'iceshatter', 'collapse', 'prey', 'slash', 'impact', 'dodge', 'heal', 'venom', 'frost', 'seal', 'death', 'd20', 'd20-crit', 'd20-fumble'];
// Effets des compétences propres : image peinte quand elle existe, sinon l'effet le plus proche
const FX_NEW = new Set(['shield', 'boost', 'taunt', 'fervor', 'curse']); // effets peints livrés (lot X)
const FX_FALLBACK = { shield: 'parry', boost: 'burst', taunt: 'prey', fervor: 'seal', curse: 'seal' };
const fxUrl = (n) => `assets/fx/${FX_FALLBACK[n] && !FX_NEW.has(n) ? FX_FALLBACK[n] : n}.webp`;
const DANGER = ['', '', 'Danger', 'Mortel'];
// Icône peinte d'une intention ennemie
// les intentions des gardiens réutilisent les icônes peintes les plus proches
const FORBID_SHORT = { attack: 'attaque', skill: 'compétences', defend: 'défense' };
const IN_PIC = { flurry: 'hit', grab: 'frost', gorge: 'heavy', gather: 'channel', blizzard: 'frost', mimic: 'channel', copy: 'heavy', decree: 'rally', shift: 'charge', brood: 'channel', swarm: 'poison', sentence: 'charge', execute: 'heavy', chant: 'channel', lament: 'blast', chain: 'frost', wind: 'charge', rewind: 'heal', tick2: 'hit', mirror: 'shield', ambush: 'heavy', wish: 'heal', price: 'blast', slumber: 'shield', quake: 'blast', verdict: 'rally' };
const intentIcon = (k) => `<img class="iicon" alt="" src="assets/icons/in-${IN_PIC[k] || (/^labp\d/.test(k) ? 'charge' : /^lab\d/.test(k) ? 'heavy' : k)}.webp">`; /* v596 : attaques inventées au Labo */

export function runDuel(app, root, { title, onEnd, onAbandon = null, onPause = null, run: runOpt = null, pause = 'Combat en pause : il t’attend dans la Descente.', engine = null }) {
  // v493 : force attendue à l'étage ÷ force moyenne de l'équipe (1 = à niveau)
  const gapOf = (st) => { if (!st.refPow) return 1; const al = st.order.ally.map((id) => st.units[id]).filter((u) => u.pow); return al.length ? st.refPow / (al.reduce((a, u) => a + u.pow, 0) / al.length) : 1; };
  const firstSteps = () => !!run?.day && !run.free && !run.trial && g.novice() && (run.floor || 0) <= 2; /* v398 : premiers pas */
  const settling = () => { const d = app.game.s.descent; return (d.runs || 0) <= 1 && (d.run?.floor || 1) <= 2; }; // v328 : voir plus haut
  const g = app.game, cat = app.catalog, run = runOpt || g.descent().run, st = run.battle;
  const where = run.lab ? 'lab' : run.trial ? 'trial' : 'run';
  perfStart(`${where === 'lab' ? 'Labo' : where === 'trial' ? 'Épreuve' : 'Descente'} · étage ${run.floor || '?'}${run.room === 'boss' || st.bossKey ? ` · gardien ${st.bossKey || ''}` : run.room === 'elite' ? ' · élite' : ''}`);
  const E = engine || g; /* v595 : le banc d'essai du Labo joue sur son propre combat (js/core/lab.js), hors sauvegarde et serveur */ /* v540 : chaque coup passe par le jeu (g.duel…) : le serveur de partie rejoue le combat */
  const ui = (app.state.duel ||= { fast: 0 });
  ui.fast = g.s.settings.combatFast ? 1 : 0; // v331 : bouton ×2 de retour (étude joueurs : un combat ≈ 1,2 min) ; la défense active garde son rythme
  const reduced = app.reduced();
  const light = g.s.settings?.quality === 'light'; // v374 : « Effets allégés » (Réglages) pour les téléphones qui peinent
  const T = (ms) => (reduced ? Math.min(ms, 80) : ui.fast === 3 ? ms * 0.25 : ui.fast ? ms * 0.45 : ms); // vitesse ×1, ×2 ou ×3
  const defMode = g.s.settings?.defense === 'auto' ? 'auto' : 'on'; // v269 : manuelle ou automatique (v333 : mode « assistée » retiré, il redevient manuel)
  let alive_ = true, busy = false, sel = null, mode = null; // mode : action en attente de cible
  let holdT = null, held = false; // appui long sur une action : sa description (v249, plus de fenêtre de confirmation)
  const ctl = new AbortController();
  const ult = ULTS[st.ult];
  document.body.classList.add('battle-mode');

  FX.forEach((n) => { new Image().src = fxUrl(n); });
  new Image().src = 'assets/fx/fx-duo.webp'; // v276 : planche de l'Assaut conjoint, chargée d'avance
  // Décor de la salle : la peinture de l'étage, ou la salle propre au gardien
  const room = roomFor(floorBg(run.floor, run.room), st.bossKey);
  root.innerHTML = `<div class="dv cb ${run.room} has-bg" style="--bgimg:${room.paint ? `url(${abs(room.paint)})` : bgOf(run)}">
    <div class="dv-top"><b>${esc(title)}</b><span class="row gap">
      <button class="btn small ghost cb-speed ${ui.fast ? 'on' : ''}" data-d="speed" aria-label="Vitesse des animations" aria-pressed="${!!ui.fast}">×${ui.fast ? 2 : 1}</button>
      <button class="btn small ghost" data-d="help" aria-label="Règles du combat">?</button>
      <button class="btn small ghost" data-d="quit" aria-label="Pause">${icon('close')}</button></span></div>
    <div class="cb-rules"></div>
    <div class="cb-tl" aria-label="Ordre des tours"></div>
    <div class="dv-row enemy"></div>
    <div class="dv-mid"><span class="dv-msg" aria-live="polite"></span><span class="dv-resw"></span></div>
    <div class="cb-acts" hidden></div>
    <div class="dv-row ally"></div>
    <div class="dv-bar cb-bar">
      <button class="cb-res" data-d="ult" style="--uc:${ult.color}" aria-label="Actions, Ferveur et pouvoir d’équipe">
        ${st.init ? '<span class="cb-pips" hidden></span>' : '<span class="cb-ap"><small>PA</small><span class="cb-pips"></span></span>'}
        <span class="cb-fv"><small>Ferveur</small><span class="cb-gems"></span></span>
        <span class="cb-ult"><img class="cb-pw" alt="" src="assets/icons/power.webp"><b>${esc(ult.name)}</b><small></small></span>
      </button>
      <button class="btn primary dv-end" data-d="end">Passer</button>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const dio = mountDiorama($('.dv'), { room, decor: light ? 'sobre' : g.s.settings?.decor || 'riche', reduced, aspect: st.aspect });
  // v362 : les planches d'effets les plus jouées sont décodées dès l'entrée en combat (sinon le premier coup saccade)
  if (!reduced) {
    const keep = new Set(['strike', 'foe-strike', 'crit-strike', 'fx-dodge', 'fx-parry', 'fx-graze', 'fx-shelter', 'def-clash', 'def-ring', 'dice-ring', 'dice-charge', 'dice-perfect', 'dice-land']);
    Object.values(st.units).forEach((u) => { if (u.side !== 'ally') return; const c = cat.get(u.id); if (c) keep.add(`circle-${c.faction}`); const k = KITS[u.role]?.skill?.key; if (k) keep.add(`sk-${k}`); });
    keep.forEach((n) => { const im = new Image(); im.src = `assets/fx/${n}.webp`; im.decode?.().catch(() => {}); });
    /* v603 : effets de mort et figures du gardien (2e forme comprise) décodés d'avance : ils saccadaient la 1re fois */
    ['kill-crack', 'kill-shatter', 'kill-embers', 'death'].forEach((n) => { const im = new Image(); im.src = `assets/fx/${n}.webp`; im.decode?.().catch(() => {}); });
    if (st.bossKey) [st.bossKey, `carte-${st.bossKey}`, { abysse: 'abysse-2', jumeaux: 'jumeaux-nuit' }[st.bossKey]].filter(Boolean).forEach((n) => { const im = new Image(); im.onerror = () => {}; im.src = `assets/bosses/${n}.webp`; im.decode?.().catch(() => {}); });
  }
  const enEl = $('.dv-row.enemy'), alEl = $('.dv-row.ally'), msgEl = $('.dv-msg'), actsEl = $('.cb-acts');
  const say = (h) => { msgEl.innerHTML = frSpaces(h); }; // v319 : « » et : ! ? ne se retrouvent plus seuls en début de ligne
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);
  // v365 : mises à jour ciblées (avant, chaque événement reconstruisait tout : cartes, illustrations, frise…).
  // setHTML : ne réécrit une zone que si son contenu a changé. patchRow : ne remplace que les cartes qui ont changé,
  // et une carte remplacée garde son illustration déjà décodée.
  const setHTML = (node, html) => { if (node && node._h !== html) { node.innerHTML = html; node._h = html; } };
  const tpl = document.createElement('template');
  const patchRow = (row, parts) => {
    if (!row) return;
    const old = new Map([...row.children].filter((x) => x.dataset.uid).map((x) => [x.dataset.uid, x]));
    const out = parts.map(({ uid, html }) => {
      const o = uid && old.get(uid);
      if (o && o._h === html) { if (o.className !== o._cls) o.className = o._cls; return o; } // comme une carte neuve, sans la reconstruire
      tpl.innerHTML = html.trim(); const n = tpl.content.firstElementChild; n._h = html; n._cls = n.className;
      const oi = o?.querySelector('.dv-art img'), ni = n.querySelector('.dv-art img');
      if (oi && ni && oi.getAttribute('src') === ni.getAttribute('src')) ni.replaceWith(oi);
      return n;
    });
    if (out.length === row.children.length && out.every((n, i) => row.children[i] === n)) return;
    row.replaceChildren(...out);
  };

  // ——— Carte de combat ———
  let tgtInfo = {}, lastGoal = null;
  // États : icônes peintes (le chiffre du poison et du bonus d'attaque en pastille)
  const st_ = (k, title, val = '') => { const [ic, mod] = k.split(' '); return `<i class="sti${mod ? ` sti-${mod}` : ''}" title="${title}"><img alt="${title}" src="assets/icons/st-${ic}.webp">${val !== '' ? `<b>${val}</b>` : ''}</i>`; };
  const statusList = (u) => [
    u.broken ? st_('broken', 'Brisé : +50 % de dégâts subis, +5 aux jets') : '',
    u.cracked ? st_('broken fele', 'Fêlé : un coup de rupture le brise (attaque d’un Protecteur, Coup d’estoc, Raz-de-marée, ou coup qui consomme une Marque)') : '',
    u.condemned ? st_('exposed', 'Condamnée : le Bourreau l’exécutera à son prochain tour (permute-la en réserve pour l’épargner)') : '',
    u.frozen || u.stunned ? st_('frost', 'Gelé : passe son tour') : '',
    u.mark ? st_('mark', 'Marqué : le prochain coup d’une autre de tes créatures fait +50 % et +2 Brisure, puis la Marque part. +3 aux jets') : '',
    u.prey ? st_('prey', 'Proie désignée : tous les ennemis la visent (+20 % de dégâts)') : '',
    u.riposte ? `<i class="bo cb-rip" title="Riposte chargée : sa prochaine attaque fait +${u.riposte} dégât(s) et +${u.riposte} Brisure">⚔${u.riposte}</i>` : '',
    u.shield ? st_('shield', 'Bouclier : bloque un coup') : '',
    u.ward ? st_('seal', `Barrière : absorbe encore ${u.ward} dégâts`, u.ward) : '',
    u.poison ? st_('poison', `Poison : ${u.poison} dégâts au début de son tour`, u.poison) : '',
    u.mirror ? st_('shield', 'Miroir : le prochain coup qu’elle reçoit se retourne contre l’attaquant (60 %). Le poison passe à travers.') : '',
    u.ashArmor ? st_('guard', `Armure de cendres : −${u.ashArmor * 6} % de dégâts reçus (une Brisure la fait tomber)`, u.ashArmor) : '',
    u.veiled ? st_('slow', u.mark ? 'Dans l’ombre, mais la Marque le révèle' : 'Dans l’ombre : −70 % de dégâts reçus (une Marque le révèle)') : '',
    u.slow ? st_('slow', 'Ralenti : prochaine attaque −50 %') : '',
    u.defend ? st_('defend', 'Défense : −50 % de dégâts') : '',
    u.guardBy ? st_('guard', 'Protégé par un Rempart') : '',
    u.exposed ? st_('exposed', 'Déséquilibrée : +25 % de dégâts subis') : '',
    u.trait && TRAITS[u.trait] ? st_(traitIcon(u.trait), `${TRAITS[u.trait].name} : ${TRAITS[u.trait].desc}`) : '',
    u.breach ? st_('breach', 'Brèche : le prochain coup d’un autre allié perce son bouclier, +20 % de dégâts, +3 Brisure') : '',
    u.boost ? `<i class="bo" title="Attaque renforcée pour ce tour">+${u.boost} ATQ</i>` : '',
    u.ice ? st_('ice', `Carapace de glace : absorbe ${u.ice} dégâts`, u.ice) : '',
    u.doom != null && !u.broken ? st_('doom', `Effondrement dans ${u.doom} tour(s) : brise-le pour le repousser`, u.doom) : '',
    u.mask ? st_('mask', `Il porte le visage ${cat.faction[u.mask]?.name || u.mask} : il résiste à cette faction (−50 %)`) : '',
    u.totality ? st_('totality', 'Totalité : seules ses faiblesses le blessent pleinement') : '',
  ].filter(Boolean); /* v400 : passifs et talent (permanents) ne sont plus sur la carte : ils sont dans sa fiche (appui long) */
  const statusHTML = (u) => statusList(u).join('');
  // v279 : bandeau d'états au-dessus de la carte, 3 pastilles au plus (2 si une attaque est annoncée) ; le reste en « +N », détaillé au toucher
  const statusBand = (u, warn) => { const L = statusList(u), max = warn ? 1 : 2, more = L.length - max; /* v400 : 2 pastilles au plus (1 si une attaque est annoncée) */
    return `<span class="dv-st">${(more > 0 ? L.slice(0, max) : L).join('')}${more > 0 ? `<i class="sti cb-more" title="${more} autre(s) effet(s) : touche la carte">+${more}</i>` : ''}</span>`; };
  // v348 : dès l'étage 5 de la Descente, les ennemis ordinaires annoncent aussi leur coup (dégâts → cible), en discret
  const ORD_INT_FROM = 1; /* v502 : dès le premier étage */
  const ordIntent = (u) => {
    if (u.boss || u.elite || st.turn !== 'ally' || !run || (run.floor || 0) < ORD_INT_FROM) return '';
    const i = intentInfo(st, u); if (!i) return '';
    const t = u.intent?.t && st.units[u.intent.t];
    const who = i.aoe ? 'tous' : t ? esc((tw(cat.get(t.id)?.name || '').split(/[\s,’']/).find((w) => w && !/^(the|le|la|les|l)$/i.test(w))) || '') /* v507 : nom affiché, sans l'article */ : '';
    const val = i.dmg ? `${i.dmg}` : esc(i.def.name);
    return `<span class="cb-oint d${i.danger}" title="${esc(i.def.name)} : ${esc(i.def.desc)}">${intentIcon(i.kind)}<b>${val}</b>${who ? `<small>→ ${who}</small>` : ''}</span>`;
  };
  // v265 : la grosse attaque annoncée d'un gardien ou d'une élite, aussi sur sa carte
  const cardWarn = (u) => { const now = bigOf(u, false), nx = now ? null : bigOf(u, true), k = now || nx; if (!k) return ''; const real = PREP_IT[k] || k; const help = u.boss ? Math.min(2, front(st, 'enemy').filter((x) => x !== u && x.hp > 0).length) : 0;
    return `<span class="cb-warn ${PREP_IT[k] || nx ? 'prep' : ''}" title="${esc(INTENTS[real].desc)}${help ? ` Renforcée par ses serviteurs : +${help * SERVANT_POWER * 100} %.` : ''}">${intentIcon(real)}<b>${esc(INTENTS[real].name)}${help ? ` +${help * SERVANT_POWER * 100} %` : ''}</b><small>${now && !PREP_IT[now] ? 'à son tour' : 'au tour suivant'}</small></span>`; };
  // v368 : les cinq gardiens ont leur figure peinte (Gemini, détourée) qui sort de leur carte par le haut
  const BOSS_FIG = new Set(['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse']);
  // v375 : un gardien n'est pas une carte de la collection — son nom et sa figure peinte partout en combat
  // v392 : le jumeau de la Nuit a sa propre figure ; l'Abysse change de forme dans sa dernière phase
  const isFig = (u) => (u?.boss || u?.twin) && BOSS_FIG.has(st.bossKey);
  const figKey = (u) => (u.twin ? 'jumeaux-nuit' : st.bossKey === 'abysse' && u.form === 2 ? 'abysse-2' : st.bossKey);
  const uName = (u) => (u?.twin ? 'Le Jumeau de la Nuit' : u?.boss && st.bossKey === 'jumeaux' ? 'Le Jumeau du Jour' : u?.boss && st.bossKey && BOSSES[st.bossKey] ? BOSSES[st.bossKey].name : cat.get(u.id)?.name || '');
  const uPic = (u) => (isFig(u) ? `assets/bosses/${figKey(u)}.webp` : artUrl(cat.get(u.id), { lite: true }));
  const cardEl = (u) => {
    const c = cat.get(u.id), kit = KITS[u.role];
    const dead = u.hp <= 0, enemy = u.side === 'enemy';
    const ready = !enemy && st.turn === 'ally' && actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap');
    const tgt = tgtInfo[u.uid];
    return `<button class="dv-c ${u.side} ${isFig(u) ? 'has-fig' : ''} ${u.twin ? 'twin' : ''} ${enemy ? 'corrupt' : ''} ${dead ? 'dead' : ''} ${!dead && u.hp <= u.maxHp * 0.3 ? 'hp3' : !dead && u.hp <= u.maxHp * 0.6 ? 'hp2' : ''} ${ready ? 'ready' : ''} ${!enemy && st.turn === 'ally' && !ready ? 'spent' : ''} ${sel === u.uid ? 'sel' : ''} ${u.boss ? 'boss' : ''} ${u.phase2 ? 'p2' : ''} ${u.defend ? 'def' : ''} ${!enemy && !dead && (u.frozen || u.stunned) ? 'unav' : ''} ${u.broken ? 'broken' : ''} ${u.cracked ? 'fele' : ''} ${tgt ? 'target' : ''} ${u.brkMax ? 'has-brk' : ''} ${enemy && intentInfo(st, u) && st.turn === 'ally' ? 'has-int' : ''}" data-uid="${u.uid}" data-rar="${u.rarity}" style="--rc:${RARITY[u.rarity].color}" aria-label="${esc(uName(u))}, ${Math.max(0, u.hp)} PV">
      <span class="dv-base" aria-hidden="true"></span>
      ${isFig(u) ? `<span class="dv-art dv-bart" aria-hidden="true"><img alt="" decoding="async" src="assets/bosses/carte-${st.bossKey}.webp"><span class="dv-crk" aria-hidden="true"></span></span><img class="dv-bfig" alt="" src="assets/bosses/${figKey(u)}.webp">` /* v605 : le gardien a de nouveau sa carte (fond peint de sa Furie), sa figure en déborde */ : `<span class="dv-art"><img alt="" decoding="async" src="${artUrl(c, { lite: true })}"><span class="dv-crk" aria-hidden="true"></span></span>`}
      <span class="dv-kw ${enemy && u.fam ? 'fam' : ''}" title="${esc(enemy && u.fam ? AI_FAMILIES[u.fam].desc : kit.name)}">${roleIcon(kit.kw)}<em>${esc(enemy && u.fam ? AI_FAMILIES[u.fam].name : kit.name)}</em></span>
      ${u.boss ? `<span class="dv-boss"><img alt="" src="assets/icons/crest-boss.webp">${u.phase2 ? 'Furie' : 'Gardien'}</span>` : u.elite ? '<span class="dv-boss elite"><img alt="" src="assets/icons/crest-elite.webp">Élite</span>' : ''}
      <span class="dv-nm ${u.named || ((u.boss || u.twin) && st.bossKey) ? 'named' : ''}">${esc((u.boss || u.twin) && st.bossKey && BOSSES[st.bossKey] ? uName(u) : u.named ? u.title : c.name)}</span>
      ${u.brkMax ? `<span class="cb-brk ${u.broken || u.cracked ? 'is-broken' : ''} ${u.cracked ? 'is-fele' : ''}" title="Brisure">${u.broken ? '<img alt="" src="assets/icons/st-broken.webp"><b>BRISÉ</b>' : u.cracked ? '<b>À BRISER</b>' : `<i style="width:${(u.brk / u.brkMax) * 100}%"></i>`}</span>` : ''}
      <span class="dv-atk">${icon('swords')}<b>${u.atk + (u.boost || 0)}</b></span>
      <span class="dv-hp ${u.hp < u.maxHp ? 'hurt' : ''} ${u.hp > 0 && u.hp <= u.maxHp * 0.3 ? 'low' : ''}" style="--hpp:${Math.max(0, Math.min(100, Math.round((Math.max(0, u.hp) / Math.max(1, u.maxHp)) * 100)))}">${icon('heart')}<i class="hpr" aria-hidden="true"></i><b>${Math.max(0, u.hp)}</b></span>
            ${tgt ? `<span class="cb-tgt">${tgt}</span>` : ''}
      ${(() => { const w = enemy && !dead ? cardWarn(u) || ordIntent(u) : ''; return `<span class="cb-above">${statusBand(u, !!w)}${w}</span>`; })()}
    </button>`;
  };
  const resHTML = (side) => {
    const r = reserve(st, side);
    if (!r.length) return '';
    if (side === 'enemy') return `<span class="dv-res" title="Réserve ennemie">+${r.length}</span>`;
    return `<button class="dv-resv cb-resv" data-d="reserve" aria-label="Voir la réserve">${r.map((u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}" title="${esc(cat.get(u.id).name)} : ${u.hp}/${u.maxHp} PV">`).join('')}<small>Réserve</small></button>`;
  };

  // ——— Barre d'actions de la créature choisie ———
  function actsHTML() {
    const u = sel && st.units[sel];
    if (!u || st.turn !== 'ally' || busy) return '';
    const kit = KITS[u.role];
    const list = actionsFor(st, u.uid).filter((a) => a.key !== 'duo' || (a.ok && !firstSteps())); // l'Assaut conjoint n'apparaît que lorsqu'il est possible
    const c = cat.get(u.id), pa = u.pa || 0;
    // v262 : c'est son tour ; ses PA (points d'action personnels) s'affichent en losanges
    return `<div class="cb-head"><span class="cb-por" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"></span>
      <span class="cb-who"><b>${esc(c.name)}</b><span class="cb-role">${roleIcon(kit.kw)}${esc(kit.name)}<em class="cb-myturn"> · son tour</em></span></span>
      <span class="cb-upips" title="${pa} PA : attaque ou défense +1, compétences selon leur coût">${Array.from({ length: PA_MAX }, (_, i) => `<i class="${i < pa ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="cb-grid ${list.length > 5 ? 'n8' : list.length > 4 ? 'n5' : ''}">${list.map((a) => `<button class="cb-a ${a.ok ? '' : 'off'} ${mode?.key === a.key ? 'on' : ''} ${a.key === kit.skill.key ? 'sig' : ''} ${a.own ? 'own' : ''}" data-a="${a.key}" aria-disabled="${!a.ok}"><span class="cb-tile" aria-hidden="true"></span>
        <span class="cb-ai">${a.own ? `<img class="aicon" alt="" src="${moveIconUrl(a.icon)}">` : actIcon(a.key, a.icon)}</span><b>${esc(a.name)}</b>
        <span class="cb-cost">${a.gain ? `<i class="gain">+${a.gain} PA</i>` : '<i class="pa"></i>'.repeat(a.ap) || (a.key === 'duo' ? '' : `<i class="free">${st.init ? 'libre' : '0'}</i>`)}${a.fervor ? `<i class="fv">${a.fervor}</i>` : ''}${a.dice ? '<i class="d20">D20</i>' : ''}${a.own && a.wait ? `<i class="cdw" title="Se recharge">${a.wait}</i>` : ''}</span></button>`).join('')}</div>`;
  }
  // ——— Tutoriel du premier combat : une main dorée montre quoi toucher ———
  let guide = !g.s.tips?.['cb-guide'];
  function guideStep() {
    root.querySelectorAll('.guide').forEach((x) => x.classList.remove('guide'));
    if (!guide || busy || st.turn !== 'ally' || st.over) return;
    let t = null, txt = '';
    if (mode?.key === 'attack') { t = el(actionTargets(st, sel, 'attack')[0]); txt = 'Touche un ennemi pour l’attaquer'; }
    else if (sel && actionsFor(st, sel)[0].ok) { t = actsEl.querySelector('[data-a="attack"]'); txt = LANG === 'fr' ? `C’est au tour ${esc(deName(cat.get(st.units[sel].id).name))} : « ${esc(actionsFor(st, sel)[0].name)} » attaque et rapporte 1 PA` : tr('C’est au tour de {name} : « {move} » attaque et rapporte 1 PA', { name: esc(tw(cat.get(st.units[sel].id).name)), move: esc(tw(actionsFor(st, sel)[0].name)) }); }
    else { t = $('.dv-end'); txt = 'Rien à faire : touche « Passer »'; }
    if (t) { t.classList.add('guide'); say(`<b class="dc-good">${txt}</b>`); }
  }
  function endGuide() { if (!guide) return; guide = false; g.s.tips = { ...(g.s.tips || {}), 'cb-guide': Date.now() }; g.persist(); }

  // ——— Affichage ———
  function draw() {
    if (!alive_) return;
    perfMark('dessin');
    // v262 : la créature dont c'est le tour est toujours celle qui est choisie
    if (st.init && st.turn === 'ally' && !st.over) sel = st.actor; else if (st.init) sel = null;
    tgtInfo = {};
    const pk = mode ? mode.key : sel && st.turn === 'ally' && actionsFor(st, sel)[0]?.ok ? 'attack' : null;
    if (pk && sel && st.turn === 'ally') {
      for (const id of actionTargets(st, sel, pk)) {
        const p = preview(st, sel, pk, id);
        const cb = p.dmg && st.units[id].side === 'enemy' ? comboOf(st, st.units[sel], st.units[id]) : 0, cbTxt = cb ? ` <i class="cmb">+${cb}</i>` : '';
        const bk = p.breaks ? ' <i class="brk on">BRISE !</i>' : p.brk ? (p.cracks ? ' <i class="brk fl">FÊLURE</i>' : ` <i class="brk">◆${p.brk}</i>`) : '';
        const tu = st.units[id], synOk = tu.side === 'enemy' && p.dmg && ((tu.breach && tu.breach.by !== sel) || (tu.mark && tu.markBy !== sel) || (tu.frozen > 0 && pk === 'estoc'));
        // v270 : une valeur et une seule mention, la plus importante (K.O. > Brise > Fêle > Marque/Synergie > Enchaînement > Brisure)
        const ko = !p.roll && p.dmg && p.dmg >= tu.hp && tu.side === 'enemy';
        const tag = ko ? '' : p.breaks || p.cracks ? bk : synOk ? ` <i class="cmb sy">${tu.mark && tu.markBy !== sel ? '+50 %' : 'Syn.'}</i>` : cb ? cbTxt : bk;
        tgtInfo[id] = (p.roll ? `${p.roll.chance}%` : p.dmg ? (ko ? '<b class="ko">K.O.</b>' : `-${p.dmg}${p.weak ? '★' : ''}`) : 'Cible') + tag;
      }
    }
    patchRow(enEl, [...front(st, 'enemy').map((u) => ({ uid: u.uid, html: cardEl(u) })), ...(resHTML('enemy') ? [{ uid: null, html: resHTML('enemy') }] : [])]);
    const gl = goalState(st);
    if (gl && gl.state === 'done' && lastGoal !== 'done' && lastGoal !== null) { app.sfx.achievement?.(); banner(`${icon('star')} Objectif réussi !`, 'good', 1100); }
    if (gl && gl.state === 'fail' && lastGoal === 'pending') toast(`Objectif « ${esc(gl.name)} » manqué.`, { icon: 'info' });
    lastGoal = gl ? gl.state : null;
    const gap = gapOf(st); /* v493 : écart de niveau : ennemis trop forts pour l'équipe */
    const rules = [gap >= 1.1 ? `<span class="cb-law cb-gap" data-d="rule" data-k="gap">${icon('p:danger')}<b>Ennemis trop forts</b></span>` : '', gl ? `<span class="cb-law cb-goal s-${gl.state}" data-d="rule" data-k="goal"><img class="cb-gico" alt="" src="assets/icons/goal.webp">${gl.state === 'done' ? '✓ ' : gl.state === 'fail' ? '✗ ' : ''}<b>${esc(gl.name)}</b>${gl.p && gl.state === 'pending' ? ` <small>${gl.p}</small>` : ''}</span>` : '',
      st.pact && PACTS[st.pact] ? `<span class="cb-law" style="--pk:${PACTS[st.pact].color}" data-d="rule" data-k="pact">${icon('p:seal')}<b>${esc(PACTS[st.pact].name)}</b></span>` : '',
      st.law ? `<span class="cb-law" data-d="rule" data-k="law"><b>${esc(LAWS[st.law].name)}</b></span>` : '',
      st.forbid ? `<span class="cb-law cb-forbid" title="Verdict du Juge : interdit de ${esc(FORBID[st.forbid])} jusqu’à sa prochaine action"><b>Interdit : ${esc(FORBID_SHORT[st.forbid])}</b></span>` : '',
      st.aspect ? `<span class="cb-law" data-d="rule" data-k="aspect"><b>${esc(ASPECTS[st.aspect].name)}</b></span>` : '',
      st.runes ? `<span class="cb-law cb-runes" data-d="rule" data-k="runes" title="Runes du gardien">${st.runes.map((r) => `<img alt="" src="assets/ui/${r.broken ? 'rune-broken' : 'rune'}.webp" class="${r.broken ? 'off' : ''}">`).join('')}<b>${runesLeft(st) ? `−${runesLeft(st) * 10} %` : 'Rompues'}</b></span>` : '',
      st.omen && OMENS[st.omen] ? `<span class="cb-law" data-d="rule" data-k="omen">${icon(OMENS[st.omen].icon)}<b>Présage</b></span>` : (st.relics || []).length ? `<span class="cb-law" data-d="rule" data-k="relics">${icon('p:crown')}<b>${st.relics.length} relique${st.relics.length > 1 ? 's' : ''}</b></span>` : '',
      run?.day && g.rule(run.day) && !g.rule(run.day).off ? `<span class="cb-law cb-day" data-d="rule" data-k="day">${icon('p:rule')}<b>${esc(g.rule(run.day).name)}</b></span>` : ''].join(''); /* v400 : règle du jour en dernier */
    const rulesEl = $('.cb-rules'); if (rulesEl) { setHTML(rulesEl, rules); rulesEl.hidden = !rules; }
    const night = st.bossKey === 'abysse' && Object.values(st.units).some((u) => u.boss && u.night && u.hp > 0), dvEl = $('.dv'); /* v392 : la Nuit sans fin assombrit et fissure la salle */
    if (dvEl && dvEl.classList.contains('abyss-night') !== night) dvEl.classList.toggle('abyss-night', night);
    patchRow(alEl, front(st, 'ally').map((u) => ({ uid: u.uid, html: cardEl(u) })));
    const sw = st.swallowed && st.units[st.swallowed];
    setHTML($('.dv-resw'), resHTML('ally') + (sw?.swallowed ? `<span class="cb-swal" title="Engloutie : brise le Dévoreur pour la libérer"><img alt="" src="${artUrl(cat.get(sw.id), { lite: true })}"><small>Engloutie · ${sw.hp} PV</small></span>` : ''));
    const showActs = !!sel && st.turn === 'ally' && !busy && !st.over;
    actsEl.hidden = !showActs;
    setHTML(actsEl, showActs ? actsHTML() : '');
    const pu = st.init ? st.units[st.actor] : null, paNow = st.init ? (st.turn === 'ally' && pu ? pu.pa || 0 : 0) : st.ap;
    setHTML($('.cb-pips'), Array.from({ length: st.init ? PA_MAX : Math.max(AP_MAX, st.ap) }, (_, i) => `<i class="${i < paNow ? 'on' : ''}"></i>`).join(''));
    setHTML($('.cb-gems'), Array.from({ length: FERVOR_MAX }, (_, i) => `<i class="${i < st.fervor ? 'on' : ''}"></i>`).join(''));
    const ready = ultReady(st);
    if (ready && !g.s.tips?.['cb-ult'] && !settling()) tuto(app, 'cb-ult');
    $('.cb-res').classList.toggle('ready', ready);
    $('.cb-ult small').textContent = st.ultUsed ? 'Utilisé' : ready ? '' : `${st.fervor}/${FERVOR_MAX}`;
    const canMore = (st.init || st.ap > 0) && front(st, 'ally').some((u) => actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap' && a.key !== 'defend'));
    $('.dv-end').classList.toggle('pulse', st.turn === 'ally' && !canMore && !busy);
    root.querySelectorAll('.dv-bar button').forEach((b) => { const off = busy || st.turn !== 'ally' || !!st.over; b.disabled = off; b.classList.toggle('off', off); });
    if (!busy && st.turn === 'ally' && !st.over) {
      if (mode) say(`<b>${esc(mode.name)}</b><span class="cb-hint">${mode.key === 'duo' ? 'Choisis l’ennemi à frapper ensemble' : mode.key === 'rempart' ? 'Choisis l’allié à protéger' : mode.key === 'priere' ? 'Choisis l’allié à soigner' : mode.target === 'ally' ? 'Choisis un allié' : 'Choisis une cible'}</span><button class="cb-cancel" data-d="cancel">Annuler</button>`);
      else if (sel && st.init) say(''); // v270 : le panneau d'actions montre déjà qui joue et ses PA
      else if (sel) say(`Choisis une action · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe`);
      else say(canMore ? `Touche une créature · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe` : 'Touche <b>Passer</b>');
    } else if (st.turn === 'enemy' && !st.over) say('<b class="dc-bad">Tour des créatures corrompues</b>');
    guideStep();
    drawTimeline();
    $('.dv')?.classList.toggle('cb-aiming', !!mode); // v279 : en visée, la réserve s'efface
  }
  // Tracés rouges : d'un ennemi qui prépare un coup dangereux vers la créature qu'il vise (v253)
  // Ordre des tours (v258) : frise horizontale de portraits en haut de l’écran (v270). Ton équipe joue ensemble, puis chaque ennemi à son tour.
  let tlSig = '', acting = null;
  // v265 : seules les grosses attaques des gardiens et des élites s'annoncent sur la frise (les coups ordinaires restent cachés)
  const BIG_IT = ['heavy', 'blast', 'gorge', 'blizzard', 'copy', 'swarm', 'execute', 'lament', 'ambush', 'price', 'quake'], PREP_IT = { charge: 'heavy', channel: 'blast', gather: 'blizzard', mimic: 'copy', brood: 'swarm', sentence: 'execute', chant: 'lament', wish: 'price' };
  const bigOf = (u, next) => {
    if (u.hp <= 0) return null; /* v398 : les ennemis ordinaires aussi (leur coup chargé déclenche la barre de défense) */
    const it = u.intent && !u.intent.cancelled ? u.intent.kind : null;
    if (!next) return it && (BIG_IT.includes(it) || PREP_IT[it]) ? it : null;
    return (u.charged && BIG_IT.includes(u.charged) ? u.charged : null) || (it && PREP_IT[it]) || null;
  };
  function drawTimeline() {
    const box = $('.cb-tl'); if (!box) return;
    if (st.over) { setHTML(box, ''); return; }
    if (st.init) {
      // v262 : chaque créature a sa place dans l'ordre (vitesse) ; après le séparateur, le tour suivant
      const ok = (u) => u && u.hp > 0 && !u.swallowed && front(st, u.side).includes(u);
      const now = st.turn === 'enemy' ? [...(acting && !st.queue.includes(acting) ? [acting] : []), ...st.queue] : st.actor ? [st.actor] : [];
      const cur = [...now, ...st.init.slice((st.ip ?? -1) + 1)].map((id) => st.units[id]).filter(ok);
      const nxt = st.init.map((id) => st.units[id]).filter(ok);
      const list = [...cur.map((u) => ({ u, w: bigOf(u, false) })), { sep: st.round + 1 }, ...nxt.map((u) => ({ u, w: bigOf(u, true) }))].slice(0, 9); // v270 : frise horizontale
      const pic = (u) => `<img alt="" src="${uPic(u)}">`;
      const sig = list.map((x) => x.sep ? `T${x.sep}` : x.u.uid).join(',');
      const moved = tlSig && tlSig.split(',')[0] !== sig.split(',')[0];
      tlSig = sig;
      setHTML(box, list.map((x, i) => (x.sep ? `<span class="cb-tlsep" title="Tour suivant">T${x.sep}</span>`
        : `<span class="cb-tlr ${x.u.side === 'enemy' ? 'foe' : 'al'} ${i === 0 ? 'now' : ''} ${x.u.boss ? 'boss' : x.u.elite ? 'elite' : ''} ${x.w ? 'warn' : ''}" title="${esc(uName(x.u))}${x.w ? ` : ${esc(INTENTS[PREP_IT[x.w] || x.w].name)}` : ''}"><span class="cb-tlp">${pic(x.u)}</span>${x.w ? '<i class="cb-tlx">!</i>' : ''}</span>`)).join(''));
      if (moved && !reduced) { box.classList.remove('shift'); void box.offsetWidth; box.classList.add('shift'); }
      return;
    }
    const allies = front(st, 'ally').filter((u) => u.hp > 0), foes = front(st, 'enemy').filter((u) => u.hp > 0);
    const team = { team: true, key: `T${st.round}` };
    const q = [...(acting && !st.queue.includes(acting) ? [acting] : []), ...st.queue];
    const enemyNow = st.turn === 'enemy' ? q.map((id) => st.units[id]).filter((u) => u && u.hp > 0 && foes.includes(u)) : [];
    const seq = st.turn === 'ally' ? [team, ...foes, { team: true, key: `T${st.round + 1}` }, ...foes] : [...enemyNow, { team: true, key: `T${st.round + 1}` }, ...foes, { team: true }];
    const list = seq.slice(0, 5);
    const pic = (u) => `<img alt="" src="${uPic(u)}">`;
    const sig = list.map((x) => (x.team ? x.key : x.uid)).join(',');
    const moved = tlSig && tlSig.split(',')[0] !== sig.split(',')[0];
    tlSig = sig;
    setHTML(box, list.map((x, i) => (x.team
      ? `<span class="cb-tlr team ${i === 0 ? 'now' : ''}" title="Ton équipe"><span class="cb-tlp">${allies.slice(0, 3).map(pic).join('')}</span></span>`
      : `<span class="cb-tlr foe ${i === 0 ? 'now' : ''} ${x.boss ? 'boss' : x.elite ? 'elite' : ''}" title="${esc(uName(x))}"><span class="cb-tlp">${pic(x)}</span></span>`)).join(''));
    if (moved && !reduced) { box.classList.remove('shift'); void box.offsetWidth; box.classList.add('shift'); }
  }


  // ——— Effets ———
  // v365 : secousse et caméra en animations directes sur le plateau (avant : une classe ajoutée sur tout le plateau,
  // donc tous les styles recalculés, et une mise en page forcée à chaque coup)
  const SHAKE = { small: [220, [[-3, 1], [3, -1], [-1, 0]]], norm: [300, [[-5, 2], [5, -2], [-3, 1], [2, 0]]], big: [500, [[-9, 4], [8, -4], [-6, 3], [5, -2], [-3, 1]]] }; /* v597 : plus de rotation (Safari laissait un grand rectangle noir sur l'écran : tout le plateau était redessiné de travers) */
  let shakeA = [], camA = [];
  /* v633 : secousse et caméra posées sur les deux rangées de cartes, plus jamais sur tout l'écran du combat : sur iPhone, Safari
     laissait un grand rectangle noir quand tout l'écran (une seule très grande couche) bougeait à chaque coup d'un Assaut */
  const moveEls = () => [...root.querySelectorAll('.dv-row')];
  /* v611 : positions lues une seule fois par image pendant un coup (caméra, éclair, effet peint) : avant, chaque lecture
     après un ajout d'élément forçait la page à se recalculer, plusieurs fois au même instant */
  const rcache = new Map(); let rcRaf = 0;
  const rectOf = (n) => { if (!rcRaf) rcRaf = requestAnimationFrame(() => { rcache.clear(); rcRaf = 0; }); let r = rcache.get(n); if (!r) { r = n.getBoundingClientRect(); rcache.set(n, r); } return r; };
  const shake = (big, small = false) => {
    perfMark(big ? 'grosse secousse' : 'secousse');
    if (reduced) return; const rows = moveEls(); if (!rows.length || !rows[0].animate) return;
    const [dur, pts] = SHAKE[big ? 'big' : small ? 'small' : 'norm'];
    shakeA.forEach((a) => a.cancel());
    shakeA = rows.map((d) => d.animate([{ transform: 'none' }, ...pts.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { transform: 'none' }], { duration: T(dur), easing: 'ease' }));
  };
  // v346 : éclair d'impact — une lumière blanche et dorée jaillit du point touché
  const impactFlash = (uid, big) => { if (reduced || light) return; const t = el(uid), box = $('.dv'); if (!t || !box) return; const b = rectOf(box), r = rectOf(t); const f = document.createElement('span'); f.className = `dv-iflash ${big ? 'big' : ''} ${st.units[uid]?.side === 'ally' ? 'foe' : ''}`; f.style.cssText = `left:${r.left - b.left + r.width / 2}px;top:${r.top - b.top + r.height / 2}px`; box.appendChild(f); setTimeout(() => f.remove(), 420); };
  const sparks = (uid, cls = '') => {
    if (reduced || light) return;
    const t = el(uid); if (!t) return;
    const b = document.createElement('span'); b.className = `dv-burst ${cls}`;
    b.innerHTML = Array.from({ length: 6 }, (_, i) => `<i style="--a:${i * 60 + Math.round(Math.random() * 20)}deg;--r:${30 + Math.round(Math.random() * 26)}px"></i>`).join('');
    t.appendChild(b); setTimeout(() => b.remove(), cls === 'ember' ? 1000 : 650);
  };
  const fxAt = (uid, name, { big = false, center = false } = {}) => {
    if (reduced) return;
    const box = $('.dv'); if (!box) return;
    const b = rectOf(box);
    let x = b.width / 2, y = b.height / 2, size = b.width * 0.9;
    if (!center) { const t = el(uid); if (!t) return; const r = rectOf(t); x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; size = r.width * (big ? 1.9 : 1.45); }
    const im = document.createElement('img');
    im.className = `dv-fx fx-${name}${center ? ' center' : ''}`; im.alt = ''; im.src = fxUrl(name);
    im.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
    box.appendChild(im); setTimeout(() => im.remove(), center ? 1400 : 750);
  };
  // Caméra simulée : léger glissement vers un point de l'écran (jamais sur les commandes)
  const cam = (uid, k = 1) => {
    perfMark('caméra');
    if (reduced || light) return;
    const d = $('.dv'), t = el(uid); if (!d || !t) return;
    const b = rectOf(d), r = rectOf(t);
    const cx = ((r.left + r.width / 2 - b.left) / b.width - 0.5) * -10 * k, cy = ((r.top + r.height / 2 - b.top) / b.height - 0.5) * -10 * k;
    if (!d.animate || d.classList.contains('qte-on')) return; /* v633 : pas de caméra pendant une défense */
    camA.forEach((a) => a.cancel());
    camA = moveEls().map((r) => r.animate([{ translate: '0 0' }, { translate: `${cx.toFixed(1)}px ${cy.toFixed(1)}px`, offset: 0.3 }, { translate: '0 0' }], { duration: T(450), easing: 'ease-out' }));
  };
  // Arrêt sur image : le coup « pèse » un instant
  /* v509 : PV d'une carte mis à jour au moment du coup (chiffre ET anneau de vie ; avant, l'anneau attendait le dessin suivant) */
  const setHp = (c, uid, hp) => {
    const box = c.querySelector('.dv-hp'); if (!box) return;
    const u = st.units[uid], v = Math.max(0, hp ?? u?.hp ?? 0), mx = Math.max(1, u?.maxHp || 1);
    const b = box.querySelector('b'); if (b) b.textContent = v;
    box.style.setProperty('--hpp', Math.max(0, Math.min(100, Math.round((v / mx) * 100))));
    box.classList.toggle('hurt', v < mx); box.classList.toggle('low', v > 0 && v <= mx * 0.3);
  };
  const hitstop = async (ms) => {
    if (reduced) return;
    // v365 : on fige seulement les animations des cartes, sans changer de classe (plus de recalcul de tout le plateau)
    const cards = [...root.querySelectorAll('.dv-c')], an = cards.flatMap((c) => c.getAnimations?.() || []).filter((a) => a.playState === 'running');
    an.forEach((a) => a.pause()); await wait(T(ms)); an.forEach((a) => { try { a.play(); } catch (e) { /* animation terminée */ } });
  };
  // Icône d'une combinaison réussie, qui jaillit de la carte
  // (posée sur le combat, pas dans la carte : la carte est redessinée pendant l'animation)
  const comboPop = (uid, key) => {
    const t = el(uid), box = $('.dv'); if (!t || !box || !CB_ICON.has(key)) return; // v353 : plus de petite épée de repli (cb-chain) par-dessus la lame d'or
    const b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
    const i = document.createElement('img'); i.className = 'cb-cpop'; i.alt = ''; i.src = `assets/icons/cb-${key}.webp`;
    i.style.cssText = `left:${r.left - b.left + r.width / 2}px;top:${r.top - b.top + r.height * 0.4}px;width:${Math.min(76, r.width * 0.64)}px`;
    box.appendChild(i); setTimeout(() => i.remove(), 1200);
  };
  // Un passif d'identité agit : son icône jaillit de la carte, avec son nom
  const passivePop = (uid, p) => {
    const t = el(uid), box = $('.dv'); if (!t || !box || !passiveIconUrl(p)) return;
    const b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
    const i = document.createElement('img'); i.className = 'cb-cpop ckpop'; i.alt = ''; i.src = passiveIconUrl(p);
    i.style.cssText = `left:${r.left - b.left + r.width / 2}px;top:${r.top - b.top + r.height * 0.4}px;width:${Math.min(70, r.width * 0.6)}px`;
    box.appendChild(i); setTimeout(() => i.remove(), 1200);
  };
  // Synergie entre deux alliés : un trait de lumière relie la poseuse à celle qui exploite, et la bannière le nomme
  const synergy = (byUid, aUid, label) => {
    app.sfx.synergy?.();
    banner(`<small>Synergie</small>${esc(label)}`, 'synergy', 1000);
    if (reduced) return;
    const box = $('.dv'), a = el(byUid), b = el(aUid); if (!box || !a || !b) return;
    const r0 = box.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.left - r0.left + ra.width / 2, y1 = ra.top - r0.top + ra.height * .45, x2 = rb.left - r0.left + rb.width / 2, y2 = rb.top - r0.top + rb.height * .45;
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const beam = document.createElement('span'); beam.className = 'cb-beam';
    beam.style.cssText = `left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${ang}deg)`;
    box.appendChild(beam); setTimeout(() => beam.remove(), 900);
    a.classList.remove('synlit'); void a.offsetWidth; a.classList.add('synlit');
  };
  // Carte ennemie qui vole en éclats : calque de fissures, puis deux planches de 8 images jouées image par image
  const shatterFx = async (uid) => {
    const t = el(uid), box = $('.dv'); if (!t || !box || reduced) return false;
    const b = box.getBoundingClientRect(), r = t.getBoundingClientRect(); lastRect[uid] = r;
    const x = r.left - b.left, y = r.top - b.top, cx = x + r.width / 2, cy = y + r.height / 2, S = r.height / 0.69;
    const ck = document.createElement('img'); ck.className = 'kx-crack'; ck.alt = ''; ck.src = 'assets/fx/kill-crack.webp';
    ck.style.cssText = `left:${x}px;top:${y}px;width:${r.width}px;height:${r.height}px`;
    box.appendChild(ck); t.classList.add('kx-flash'); app.sfx.shatter?.();
    await hitstop(120);
    const sp = (cls, k, dy, d) => { const n = document.createElement('span'); n.className = `kx-sprite ${cls}`; n.style.cssText = `left:${cx}px;top:${cy + dy}px;width:${S * k}px;height:${S * k}px;--d:${d}ms`; box.appendChild(n); return n; };
    const sh = sp('kx-shatter', 1, 0, T(760));
    await wait(T(170)); t.style.visibility = 'hidden'; ck.remove(); app.sfx.death(); shake(false);
    const em = sp('kx-embers', 1.15, -r.height * 0.12, T(950));
    await wait(T(520));
    setTimeout(() => { sh.remove(); em.remove(); }, T(520));
    return true;
  };
  // Planche peinte de 8 images (assets/fx/<nom>.webp) jouée sur une carte, au centre, ou sur toute la rangée ennemie
  const ROLE_FX = { protecteur: 'strike', degats: 'strike', poison: 'strike', controle: 'strike', soin: 'strike', soutien: 'strike', zone: 'strike' }; // v343 : « strike » (lame d'or) ; v350 : sur tous les coups, quel que soit le rôle (le poison et le gel gardent leur propre effet quand ils s'appliquent)
  const fxSheet = (uid, name, { k = 1.6, d = 600, center = false, row = false, cls = '' } = {}) => {
    if (reduced) return;
    const box = $('.dv'); if (!box) return;
    const b = box.getBoundingClientRect(); let x = b.width / 2, y = b.height / 2, w = b.width * 0.9, h = w;
    if (row) { const r = $('.dv-row.enemy')?.getBoundingClientRect(); if (!r) return; x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; w = r.width * 1.1; h = r.height * 1.25; }
    else if (!center) { const t = el(uid), r = t ? t.getBoundingClientRect() : lastRect[uid]; if (!r) return; x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; w = h = r.width * k; }
    const n = document.createElement('span'); n.className = `kx-sprite fxs ${cls}`;
    n.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;--d:${T(d)}ms;background-image:url(assets/fx/${name}.webp)`;
    box.appendChild(n); setTimeout(() => n.remove(), T(d) + 80);
  };
  // Bandeau peint de changement de tour : or « À toi ! », épines rouges « Tour ennemi »
  const turnBanner = (side) => {
    if (st.over) return;
    const b = document.createElement('div'); b.className = `cb-turn ${side === 'enemy' ? 'foe' : 'ally'}`;
    b.innerHTML = `<b>${side === 'enemy' ? 'Tour ennemi' : 'À toi !'}</b>`;
    (side === 'enemy' ? app.sfx.enemyturn : app.sfx.yourturn)?.();
    $('.dv')?.appendChild(b); setTimeout(() => b.remove(), reduced ? 500 : 1100);
  };
  let aoeHit = false; const lastRect = {}; // place d'une carte disparue (pour l'explosion d'un ennemi déjà tombé) // pendant un Raz-de-marée : une seule vague pour toute la rangée
  // v357 : esquive — deux silhouettes fantômes de la carte restent derrière elle et s'effacent
  const ghost = (uid) => {
    if (reduced) return; const t = el(uid), box = $('.dv'); if (!t || !box) return;
    const b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
    [1].forEach((i) => { const g = t.cloneNode(true); g.removeAttribute('data-uid'); /* v362 : une seule silhouette (plus léger) */ g.querySelectorAll('[data-uid]').forEach((x) => x.removeAttribute('data-uid'));
      g.className = `${t.className} dv-ghost g${i}`; g.classList.remove('dodge', 'hit', 'aimed', 'aim');
      g.style.cssText = `position:absolute;left:${r.left - b.left}px;top:${r.top - b.top}px;width:${r.width}px;height:${r.height}px;margin:0`;
      box.appendChild(g); setTimeout(() => g.remove(), 560); });
  };
  // v357 : parade — l'attaquant est repoussé en arrière, comme s'il avait encaissé le contre
  const recoil = (uid) => { if (reduced || !uid) return; const a = el(uid); if (!a) return; a.classList.remove('recoil'); void a.offsetWidth; a.classList.add('recoil'); setTimeout(() => a.classList.remove('recoil'), 520); };
  // v367 : chaque faction meurt à sa façon (braises, bulles, lumière, feuilles, âme, éclats de pierre, étincelles)
  const deathFx = (uid) => {
    if (reduced) return; const u = st.units[uid], t = el(uid), box = $('.dv'); if (!u || !t || !box) return;
    const f = cat.get(u.id)?.faction || 'infernal', b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
    const n = document.createElement('span'); n.className = `dv-soul f-${f}`;
    n.style.cssText = `left:${r.left - b.left + r.width / 2}px;top:${r.top - b.top + r.height / 2}px;width:${r.width}px;height:${r.height}px`;
    n.innerHTML = Array.from({ length: light ? 6 : 12 }, () => `<i style="--x:${(Math.random() * 100 - 50).toFixed(0)}%;--y:${(Math.random() * 60 - 20).toFixed(0)}%;--dx:${(Math.random() * 80 - 40).toFixed(0)}px;--dl:${(Math.random() * 0.35).toFixed(2)}s;--sz:${(4 + Math.random() * 7).toFixed(1)}px;--rt:${Math.round(Math.random() * 360)}deg"></i>`).join('');
    box.appendChild(n); setTimeout(() => n.remove(), 1500);
  };
  const ring = (uid, cls) => { if (reduced) return; const t = el(uid); if (!t) return; const r = document.createElement('span'); r.className = `cb-ring ${cls}`; t.appendChild(r); setTimeout(() => r.remove(), 750); };
  const float = (uid, txt, cls) => { const t = el(uid); if (!t) return; const f = document.createElement('span'); f.className = `dv-float ${cls}`; f.textContent = txt; t.appendChild(f); setTimeout(() => f.remove(), 900); };
  const banner = (html, cls = '', ms = 900) => {
    const b = document.createElement('div'); b.className = `cb-banner ${cls}`; b.innerHTML = html;
    $('.dv').appendChild(b); setTimeout(() => b.remove(), T(ms) + 200);
  };
  const fervorPop = (d, why) => {
    const f = $('.cb-fv'); if (!f) return;
    const s = document.createElement('span'); s.className = 'cb-fpop'; s.textContent = `+${d}${why ? ` ${why}` : ''}`;
    f.appendChild(s); setTimeout(() => s.remove(), 1000);
  };

  // Jet de D20 animé (toucher pour passer)
  async function rollFx(e) {
    if (e.perfect && e.tier === 'success') banner('Frappe parfaite : réussite assurée', 'parry', 800);
    const tier = DICE_TIERS[e.tier];
    const box = document.createElement('div');
    box.className = `cb-dice t-${e.tier} ${lastThrow ? 'landing' : ''}`; // v352 : le dé lancé retombe (v356 : même après le plan de la compétence)
    lastThrow = 0;
    box.innerHTML = `<div class="cb-d20"><img class="cb-die" alt="" src="assets/fx/d20.webp"><b>?</b></div>
      <p class="cb-dline"></p><p class="cb-dtier"></p>`;
    $('.dv').appendChild(box);
    if (box.classList.contains('landing') && !reduced) { // v356 : onde d'impact quand le dé lancé touche le sol
      const d = box.querySelector('.cb-d20'), S = d.offsetWidth * 2.6;
      setTimeout(() => { if (!box.isConnected) return; const n = document.createElement('span'); n.className = 'kx-sprite fxs';
        n.style.cssText = `left:${d.offsetLeft + d.offsetWidth / 2}px;top:${d.offsetTop + d.offsetHeight * 0.92 - S * 0.22}px;width:${S}px;height:${S}px;--d:720ms;background-image:url(assets/fx/dice-land.webp)`;
        box.appendChild(n); setTimeout(() => n.remove(), 800); }, 260);
    }
    const num = box.querySelector('b');
    app.sfx.dice();
    let skip = false;
    box.addEventListener('pointerdown', () => { skip = true; }, { once: true });
    const spin = T(650), t0 = performance.now();
    while (!skip && performance.now() - t0 < spin && alive_) { num.textContent = 1 + Math.floor(Math.random() * 20); await wait(55); }
    num.textContent = e.r;
    if (e.tier === 'crit' || e.tier === 'fumble') box.querySelector('.cb-die').src = `assets/fx/d20-${e.tier === 'crit' ? 'crit' : 'fumble'}.webp`;
    box.classList.add('done');
    box.querySelector('.cb-dline').innerHTML = `${e.r}${e.mods.map(([n, v]) => ` <span>+${v} ${esc(n)}</span>`).join('')} = <b>${e.total}</b> · DD ${e.dc}`;
    box.querySelector('.cb-dtier').innerHTML = `<b style="color:${tier.color}">${tier.name}</b>`;
    if (e.tier === 'crit') { app.sfx.crit(); shake(true); } else if (e.tier === 'fumble') app.sfx.fumble(); else app.sfx.tap();
    await wait(skip ? T(350) : T(e.tier === 'crit' || e.tier === 'fumble' ? 1100 : 800));
    box.classList.add('out'); setTimeout(() => box.remove(), 250);
  }

  // ——— Lecture des événements (animations) ———
  let lastTier = null; // résultat du dernier jet de dé : le coup qui suit le montre
  let lastDef = 'none'; // résultat de la dernière défense active
  let pendingLunge = null; // élan d'une compétence à dé, joué après le jet (pas avant)
  let pendingSkill = null, skillHit = null; // v499 : planche d'une compétence à dé jouée après le jet, à la place de la lame du coup
  let burstSrc = null, burstN = 0; // v499 : coups enchaînés d'une même créature (triple morsure, ruée…) : compteur ×2, ×3
  /* prochain coup de la même action (on saute les événements de jauge) : sert à enchaîner les coups sans arrêt sur image */
  const nextHit = (ev, i) => { for (let j = i + 1; j < ev.length; j++) { const x = ev[j]; if (x.t === 'dmg') return x; if (!['brk', 'fervor', 'pa', 'combo', 'status'].includes(x.t)) return null; } return null; };
  let lastAtk = null, fatalDone = false; // dernière créature alliée à avoir agi : gros plan du coup fatal sur le dernier ennemi
  const DICE_KEYS = ['estoc', 'contagion', 'entrave'];
  async function play(ev) {
    for (let ei = 0; ei < ev.length; ei++) {
      const e = ev[ei];
      if (!alive_) return;
      perfMark(e.kind ? `${e.t}:${e.kind}` : e.t);
      switch (e.t) {
        case 'act':
          lastAtk = st.units[e.u]?.side === 'ally' ? e.u : null; lastTier = null; pendingSkill = null; skillHit = null; burstSrc = null;
          if (e.skill) {
            const own = moveFor(st.units[e.u], e.key);
            const ic = own ? `<img class="aicon" alt="" src="${moveIconUrl(own.icon)}">` : actIcon(KITS[st.units[e.u].role].skill.key, KITS[st.units[e.u].role].skill.icon);
            app.sfx.skill();
            // v357 : la carte s'éveille sur place (repli : le bandeau), puis la planche de la compétence part sur la cible
            if (!(await castFx(e.u, e.name, { ic }))) { banner(`${ic} ${esc(e.name)}`, own ? 'skill own' : 'skill', 700); await wait(T(360)); }
            /* v499 : compétence à dé (estoc, contagion, entrave) : sa planche part après le jet, comme le vrai coup (avant : un premier « coup » avant le dé, puis un second après) */
            if (DICE_KEYS.includes(e.key)) pendingSkill = { key: KITS[st.units[e.u].role].skill.key, u: e.u, tgt: e.tgt };
            else if (skillFx(KITS[st.units[e.u].role].skill.key, e.u, e.tgt)) await wait(T(240));
          }
          if (e.tgt && st.units[e.tgt]?.side === 'enemy' && DICE_KEYS.includes(e.key)) pendingLunge = { u: e.u, tgt: e.tgt };
          else if (e.tgt && st.units[e.tgt]?.side === 'enemy' && e.key !== 'marque' && e.key !== 'entrave') { lunge(e.u, e.tgt); cam(e.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          else if (e.key === 'marque' && e.tgt) { if (!e.skill || !SKILL_FX.marque) fxSheet(e.tgt, 'role-mark', { k: 2.5, d: 800 }); ring(e.tgt, 'mark'); await wait(T(420)); }
          break;
        case 'eact': {
          const def = INTENTS[e.kind];
          lastAtk = null; lastTier = null; burstSrc = null;
          // v338 : la grosse attaque d'une élite, et chaque coup spécial d'un gardien, s'annoncent sur son illustration en plein écran
          const ua = st.units[e.a], bigK = ua?.boss ? BOSS_SHOT.has(e.kind) : ua?.elite && (e.kind === 'heavy' || e.kind === 'blast');
          const shot = bigK && def && (await castFx(e.a, `${def.name} !`, { ic: intentIcon(e.kind), foe: true }));
          if (!shot && (e.kind === 'heavy' || e.kind === 'blast')) banner(`${intentIcon(e.kind)} ${esc(def.name)} !`, 'danger', 700);
          if (e.tgt && st.units[e.tgt]?.side === 'ally') { lunge(e.a, e.tgt); cam(e.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          else await wait(T(200));
          break;
        }
        case 'attack': break;
        case 'counter': lunge(e.a, e.u); float(e.a, 'Contre-attaque !', 'syn'); await wait(T(260)); break;
        case 'dmg': {
          /* v499 : dégâts sans attaquant (poison, épuisement, marée, pacte…) : une simple marque, sans lame ni secousse */
          if (!e.src) {
            const tt = el(e.u);
            if (tt) setHp(tt, e.u, e.hp);
            float(e.u, `-${e.d}`, `dmg tick ${st.units[e.u]?.poison ? 'venom' : ''}`); app.sfx.tap?.();
            await wait(T(170)); break;
          }
          const nx = nextHit(ev, ei), chain = burstSrc === e.src, more = !!(nx && nx.src === e.src);
          burstN = chain ? burstN + 1 : 1; burstSrc = more ? e.src : null;
          const t = el(e.u);
          const crit = lastTier === 'crit', heavy = crit || e.d >= 8;
          lastTier = null;
          const viaSkill = skillHit && skillHit === e.u; skillHit = null;
          /* v509 : tout part au même instant, l'impact : son, PV (chiffre et anneau), chiffre de dégâts, effets ; l'arrêt sur image vient après */
          (heavy ? app.sfx.smash : app.sfx.slash)();
          if (t) { t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); setHp(t, e.u, e.hp); }
          float(e.u, `${crit ? 'CRITIQUE ' : ''}−${e.d}${burstN > 1 ? ` ×${burstN}` : ''}`, crit ? 'dmg big crit' : heavy ? 'dmg big' : 'dmg');
          // v341 : chaque coup marque l'impact — entaille lumineuse sur la carte touchée et court arrêt sur image
          if (t && !reduced && !aoeHit) { const k = document.createElement('span'); k.className = `dv-cut ${st.units[e.u]?.side === 'ally' ? 'foe' : ''} ${heavy ? 'big' : ''}`; k.style.setProperty('--ca', `${-38 + Math.round(Math.random() * 30)}deg`); t.appendChild(k); setTimeout(() => k.remove(), 520); }
          const sU = e.src && st.units[e.src];
          // v343 : planches peintes (Gemini) — lame d'or pour tes coups, griffes corrompues pour les ennemis, croix runique pour les critiques
          // v346 : effets plus grands et plus longs, éclair d'impact sur la cible, coup de caméra vers elle
          if (viaSkill) { /* la planche de la compétence a déjà marqué l'impact */ }
          else if (sU?.side === 'ally' && ROLE_FX[sU.role] && !aoeHit) { if (crit) fxSheet(e.u, 'crit-strike', { k: 3.2, d: 900 }); else fxSheet(e.u, ROLE_FX[sU.role], { k: heavy ? 3 : 2.6, d: 760 }); }
          else if (!aoeHit) { if (crit) fxSheet(e.u, 'crit-strike', { k: 3.2, d: 900 }); else fxSheet(e.u, 'foe-strike', { k: heavy ? 3 : 2.6, d: 760 }); }
          if (!aoeHit) { if (!viaSkill) impactFlash(e.u, heavy); if (!chain) cam(e.u, heavy ? 1.6 : 1.1); }
          if (crit) dio.flare();
          sparks(e.u, crit ? 'gold' : ''); if (!aoeHit) shake(!more && (crit || heavy || e.hp <= 0), more || !(crit || heavy || e.hp <= 0));
          if (!more) await hitstop(crit ? 140 : heavy ? 80 : 45); /* v499 : coups enchaînés sans arrêt sur image, seul le dernier pèse */
          await wait(T(more ? 170 : heavy ? 260 : 190));
          break;
        }
        case 'heal': { app.sfx.heal(); fxSheet(e.u, 'role-heal', { k: 2.3, d: 850 }); float(e.u, `+${e.d}`, 'heal'); const hc = el(e.u); if (hc) setHp(hc, e.u, e.hp ?? st.units[e.u].hp); await wait(T(200)); break; }
        case 'block': lastTier = null; skillHit = null; app.sfx.block(); ring(e.u, 'guard'); float(e.u, 'Bloqué', 'info'); sparks(e.u, 'blue'); await wait(T(240)); break;
        case 'dodge': {
          app.sfx.dodge();
          if (e.u) { ghost(e.u); fxSheet(e.u, 'fx-dodge', { k: 2.3, d: 720 }); fxSheet(e.u, 'fx-graze', { k: 2, d: 700 }); /* v503 : l'esquive érafle */ cam(e.u, 0.6); shake(false, true); const t = el(e.u); if (t) { t.classList.remove('dodge'); void t.offsetWidth; t.classList.add('dodge'); } float(e.u, 'Esquive !', 'dodge'); }
          else { front(st, 'ally').forEach((x) => fxSheet(x.uid, 'fx-graze', { k: 2, d: 700 })); banner('Éraflés…', 'good', 600); } /* v503 : attaque de zone, glissé tardif */
          await wait(T(320));
          break;
        }
        case 'parry': app.sfx.parry(); dio.flare(); await hitstop(120); if (e.u) { ring(e.u, 'parry'); fxSheet(e.u, 'def-clash', { k: 2.7, d: 760 }); fxSheet(e.u, 'fx-parry', { k: 2.1, d: 820 }); recoil(e.a); /* v361 : choc des lames (Gemini) + anneau d'or */ impactFlash(e.u, true); sparks(e.u, 'gold'); cam(e.u, -0.8); } else front(st, 'ally').forEach((x) => fxSheet(x.uid, 'fx-shelter', { k: 2.4, d: 900 })); /* v503 : attaque de zone évitée à temps : dôme */ banner(e.u ? 'Parade parfaite !' : 'À l’abri !', 'parry', 800); shake(false); await wait(T(420)); break;
        case 'fervor': fervorPop(e.d, e.why); draw(); break;
        case 'passive': app.sfx.passive?.(); passivePop(e.u, e.p); float(e.u, PASSIVES[e.p]?.name || '', 'syn'); await wait(T(320)); break;
        case 'brk': { const t = el(e.u)?.querySelector('.cb-brk i'); if (t) t.style.width = `${(e.brk / e.max) * 100}%`; break; }
        case 'broken': {
          // suspension, fissures lumineuses, rupture, puis l'état vulnérable apparaît
          const d = $('.dv'), t = el(e.u);
          if (!reduced) { d?.classList.add('focus'); t?.classList.add('cracking'); }
          await hitstop(160);
          app.sfx.shatter(); draw();
          const t2 = el(e.u); t2?.classList.add('shatter', 'cracked'); ring(e.u, 'break');
          banner('BRISURE !', 'broken', 1000); fxSheet(e.u, 'fx-break', { k: 2.7, d: 880 }); impactFlash(e.u, true); cam(e.u, 1.6); await hitstop(110); sparks(e.u, 'big'); shake(true); dio.brk();
          await wait(T(700)); d?.classList.remove('focus');
          break;
        }
        case 'rune': {
          app.sfx.shatter?.(); if (e.u) fxSheet(e.u, 'fx-rune', { k: 2.2, d: 760 }); shake(false); draw();
          banner(`<small>Rune brisée</small>${esc(RUNES[e.k]?.name || '')}${e.left ? ` · ${e.left} restante${e.left > 1 ? 's' : ''}` : ''}`, 'synergy', 1000);
          await wait(T(620));
          break;
        }
        case 'cracked': {
          app.sfx.shatter?.(); draw(); el(e.u)?.classList.add('cracking'); ring(e.u, 'break'); banner('À BRISER !', 'broken', 900); float(e.u, 'Protecteur, estoc ou Marque : brise-le !', 'syn'); shake(false);
          await wait(T(600)); if (!g.s.tips?.['cb-break']) await tuto(app, 'cb-break');
          break;
        }
        case 'recover': app.sfx.recover?.(); float(e.u, 'Se relève', 'info'); await wait(T(260)); break;
        case 'roll': {
          await rollFx(e); lastTier = e.tier;
          const P = pendingLunge; pendingLunge = null;
          if (P && e.tier !== 'fumble') { lunge(P.u, P.tgt); cam(P.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          const S = pendingSkill; pendingSkill = null;
          if (S && e.tier !== 'fumble' && skillFx(S.key, S.u, S.tgt)) skillHit = S.tgt; /* la planche de la compétence est l'impact du coup qui suit */
          break;
        }
        case 'boss': { if (e.s === 'Effondrement !') fxSheet(null, 'fx-collapse', { center: true, d: 1100 }); app.sfx.boss(); dio.roar(); const t = el(e.u); if (t) { t.classList.remove('roar'); void t.offsetWidth; t.classList.add('roar'); } float(e.u, e.s, 'boss'); shake(true); await wait(T(650)); break; }
        case 'phase2': {
          app.sfx.boss(); dio.fury(); dio.roar(); draw(); banner(`${icon('skull')} ${esc(e.s)}`, 'danger', 1200); shake(true); await wait(T(900));
          const P = PHASE2[e.key];
          if (P) await phaseCard(P);
          if (P && !g.s.tips?.['cb-phase2']) await tuto(app, 'cb-phase2');
          break;
        }
        case 'swallow': {
          const t = el(e.u), b = el(e.a);
          if (t && b && !reduced) { const rt = t.getBoundingClientRect(), rb = b.getBoundingClientRect(); t.style.setProperty('--dx', `${rb.left - rt.left}px`); t.style.setProperty('--dy', `${rb.top - rt.top}px`); t.classList.add('swallowed'); }
          app.sfx.death(); fxSheet(e.a, 'fx-swallow', { k: 2.8, d: 950 }); float(e.a, 'Engloutie !', 'boss'); shake(true); await wait(T(800)); draw(); break;
        }
        case 'release': app.sfx.enter(); draw(); el(e.u)?.classList.add('enter'); ring(e.u, 'enter'); await wait(T(400)); break;
        case 'duo': {
          // Assaut conjoint : les deux créatures s'élancent l'une après l'autre
          app.sfx.synergy?.(); banner(`<small>${esc(cat.get(st.units[e.u].id).name)} + ${esc(cat.get(st.units[e.p].id).name)}</small>Assaut conjoint`, 'synergy', 1100);
          if (!reduced) { lunge(e.u, e.tgt); await wait(T(160)); lunge(e.p, e.tgt); cam(e.tgt, 0.8); fxSheet(e.tgt, 'fx-duo', { k: 2.4, d: 960 }); } // v276 : deux traînées qui se croisent, cercle, éclats (planche Gemini)
          await wait(T(LUNGE_HIT + 120)); shake(true);
          if (!g.s.tips?.['cb-duo']) tuto(app, 'cb-duo');
          break;
        }
        case 'swap': app.sfx.enter(); draw(); el(e.u)?.classList.add('enter'); float(e.u, 'Entre en jeu', 'info'); await wait(T(340)); break;
        case 'aoe': if (e.side === 'enemy') shake(true); else if (st.units[e.u]?.side === 'ally') { fxSheet(null, 'role-wave', { row: true, d: 720 }); aoeHit = true; setTimeout(() => { aoeHit = false; }, T(900)); await wait(T(260)); } await wait(T(150)); break;
        case 'status':
          if (e.k === 'poison') { if (/\+|×/.test(e.s)) { app.sfx.poison(); fxSheet(e.u, 'fx-venom', { k: e.syn ? 2.5 : 2.1, d: 850 }); } }
          else if (e.k === 'frost' && /^Gel/.test(e.s) && !/passe/.test(e.s)) { app.sfx.freeze(); fxSheet(e.u, 'role-frost', { k: 2.5, d: 800 }); impactFlash(e.u, false); }
          else if (e.k === 'guard' && /^(Tous sur elle|Hurlement)/.test(e.s)) { app.sfx.taunt?.(); fxSheet(e.u, 'fx-taunt', { k: 2.5, d: 820 }); ring(e.u, 'guard'); }
          else if (e.k === 'guard') { app.sfx.shield?.(); fxSheet(e.u, 'fx-shield', { k: 2.2, d: 820 }); ring(e.u, 'guard'); }
          else if (e.k === 'heal' && /^\+\d+ ATQ/.test(e.s)) { app.sfx.boost?.(); fxSheet(e.u, 'fx-boost', { k: 2.2, d: 820 }); }
          else if (e.k === 'mark') { app.sfx.mark?.(); if (/Maudite/.test(e.s)) fxSheet(e.u, 'fx-curse', { k: 2.4, d: 880 }); else fxAt(e.u, 'seal'); ring(e.u, 'mark'); }
          if (/vole en éclats/.test(e.s)) { app.sfx.shatter(); fxSheet(e.u, 'fx-iceshatter', { k: 2.5, d: 820 }); }
          if (e.s === 'Proie désignée') fxSheet(e.u, 'fx-prey', { k: 2.4, d: 820 });
          else if (e.syn) app.sfx.skill();
          if (e.k === 'entrance') ring(e.u, 'enter');
          if (e.trait === 'explosif') { fxSheet(e.u, 'fx-explode', { k: 2.6, d: 760 }); app.sfx.explode?.(); shake(true); banner(`<img class="cb-trico" alt="" src="assets/icons/st-explosif.webp"> Explosion !`, 'danger', 800); }
          else if (e.trait) { if (e.trait === 'enrage') fxSheet(e.u, 'fx-enrage', { k: 1.9, d: 820 }); (e.trait === 'enrage' ? app.sfx.enrage : app.sfx.boss)?.(); banner(`<img class="cb-trico" alt="" src="assets/icons/st-${traitIcon(e.trait)}.webp"> ${esc(e.s)}`, 'danger', 800); }
          if (e.combo && e.by && e.a && e.by !== e.a && st.units[e.by]?.side === 'ally') { synergy(e.by, e.a, e.s); await wait(T(380)); if (!g.s.tips?.['cb-combo'] && !settling()) tuto(app, 'cb-combo'); }
          if (e.combo) comboPop(e.u, e.combo);
          float(e.u, e.s, e.syn ? 'syn' : e.k === 'bad' ? 'dmg' : 'info');
          draw();
          await wait(T(e.syn ? 480 : 260));
          break;
        case 'combo': float(e.u, `Chaîne ×${e.n}`, 'combo'); app.sfx.chain?.(); await wait(T(260)); if (!g.s.tips?.['cb-combo'] && !settling()) tuto(app, 'cb-combo'); break;
        case 'finisher': { if (st.over === 'won') break; if (!reduced) { const d = $('.dv'); d.classList.add('slowmo'); setTimeout(() => d.classList.remove('slowmo'), 700); } banner('Coup de grâce !', 'finisher', 800); app.sfx.finisher?.(); await wait(T(380)); break; }
        case 'die': {
          const u = st.units[e.u];
          if (u?.boss) {
            // mort d'un gardien : ralenti, le décor réagit, il se dissipe en cendres
            const d = $('.dv'); if (!reduced) d?.classList.add('slowmo', 'bossfall');
            dio.fallen();
            app.sfx.boss(); await hitstop(220); app.sfx.death();
            fxAt(e.u, 'death', { big: true }); sparks(e.u, 'big'); deathFx(e.u); el(e.u)?.classList.add('dying', 'ashes'); shake(true);
            banner(`${esc(uName(u))} est vaincu`, 'finisher', 1300);
            await wait(T(1100)); d?.classList.remove('slowmo', 'bossfall'); draw(); break;
          }
          // coup fatal : le dernier ennemi tombe sous un coup allié → gros plan, une fois par combat
          if (u?.side === 'enemy' && st.over === 'won' && lastAtk && !fatalDone) { fatalDone = true; await closeup(lastAtk, e.u, 'Coup fatal', { crit: true, sub: '' }); }
          // ennemi K.O. : fissures et flash, la carte vole en éclats, les braises montent (planches Gemini, v256)
          deathFx(e.u);
          if (u?.side === 'enemy' && await shatterFx(e.u)) { draw(); break; }
          // la carte blanchit, se fissure, puis part en cendres (braises qui montent)
          app.sfx.death(); fxAt(e.u, 'death', { big: true }); sparks(e.u, 'ember'); el(e.u)?.classList.add('dying', 'cracking'); await wait(T(640)); draw(); break;
        }
        case 'enter': draw(); el(e.u)?.classList.add('enter'); await wait(T(340)); break;
        case 'revive': draw(); app.sfx.summon?.(); float(e.u, 'Relevée !', 'heal'); await wait(T(280)); break;
        case 'actor': draw(); if (!reduced) { const t = el(e.u); t?.classList.remove('myturn'); void t?.offsetWidth; t?.classList.add('myturn'); } app.sfx.actor?.(); await wait(T(260)); break;
        case 'pa': { const t = el(e.u); if (t && st.units[e.u]?.side === 'ally') { float(e.u, `+${e.d} PA`, 'pa'); app.sfx.pa?.(); } break; }
        case 'phase': draw(); say(e.side === 'enemy' ? '<b class="dc-bad">Tour des créatures corrompues</b>' : 'À toi !'); turnBanner(e.side); await wait(T(e.side === 'enemy' ? 520 : 420)); break;
        case 'ult': if (st.ult === 'sceau') dio.seal(); else dio.ult(); await ultFx(); break;
        case 'law':
          if ('forbid' in e) { draw(); if (e.forbid) { banner(`${icon('skull')} Verdict : interdit de ${esc(FORBID[e.forbid])}`, 'danger', 1300); await wait(T(800)); } break; }
          if (e.aspect) dio.aspect(e.aspect); draw(); banner(e.fatigue ? `${icon('skull')} Épuisement : chaque tour blesse tout le monde` : e.law ? esc(LAWS[e.law].name) : esc(ASPECTS[e.aspect].name), e.fatigue ? 'danger' : 'skill', 1300); await wait(T(e.fatigue ? 900 : 700)); break;
        default: break;
      }
    }
    draw();
  }
  // ——— Plan en pleine illustration (v338) : la créature qui lance une compétence (ou la grosse attaque d'un gardien,
  // d'une élite) occupe tout l'écran le temps d'un plan de cinéma : lente poussée de caméra, lumière de sa faction,
  // nom du coup. Plus court quand la créature l'a déjà eu dans ce combat ; un toucher le passe ; absent si les
  // animations sont réduites ou en vitesse ×3.
  const shotSeen = new Set();
  const BOSS_SHOT = new Set(['heavy', 'blast', 'charge', 'gorge', 'gather', 'blizzard', 'mimic', 'copy', 'decree', 'shift', 'brood', 'swarm', 'sentence', 'execute', 'chant', 'lament', 'chain', 'wind', 'rewind', 'mirror', 'ambush', 'wish', 'price', 'quake', 'verdict']);
  // v357 : « la carte s'éveille » (remplace le plan en pleine illustration, jugé sans intérêt par le propriétaire) :
  // la carte se soulève et s'illumine à la couleur de sa faction, un cercle magique de la faction tourne sous elle,
  // le nom du coup s'affiche au-dessus. Ennemis : la carte gronde, rougit et tremble. Puis le sort part sur la cible.
  const CIRCLES = new Set(['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel']); // v359 : les 7 cercles Gemini // factions dont le cercle Gemini est arrivé (assets/fx/circle-<faction>.webp) ; repli : dice-ring
  async function castFx(uid, label, { ic = '', foe = false } = {}) {
    const u = st.units[uid], t = el(uid);
    if (!u || !t || reduced || ui.fast === 3) return false;
    perfMark('lancement de compétence');
    const c = cat.get(u.id); if (!c) return false;
    const again = shotSeen.has(uid); shotSeen.add(uid);
    const d = T(again ? 520 : 760);
    t.style.setProperty('--fc', foe ? '#FF3B4E' : cat.faction[c.faction]?.colors?.secondary || '#F2C14E');
    t.style.setProperty('--cd', `${d}ms`);
    t.classList.remove('cast', 'cast-foe'); void t.offsetWidth; t.classList.add(foe ? 'cast-foe' : 'cast');
    // posés sur le plateau (pas dans la carte) : cercle à ses pieds, nom au-dessus d'elle (en dessous pour un ennemi)
    const box = $('.dv'), bb = box.getBoundingClientRect(), r = t.getBoundingClientRect(), cx = r.left - bb.left + r.width / 2;
    const circ = document.createElement('img'); circ.alt = ''; circ.className = `cast-circ ${foe ? 'foe' : ''}`;
    circ.src = !foe && CIRCLES.has(c.faction) ? `assets/fx/circle-${c.faction}.webp` : 'assets/fx/dice-ring.webp';
    circ.style.cssText = `left:${cx}px;top:${r.bottom - bb.top - r.height * 0.06}px;width:${r.width * 1.8}px;--cd:${d}ms`;
    const lbl = document.createElement('span'); lbl.className = `cast-lbl ${foe ? 'foe' : ''}`; lbl.innerHTML = `${ic}<b>${esc(label)}</b>`;
    lbl.style.cssText = foe ? `left:${cx}px;top:${r.bottom - bb.top + 10}px;--fc:#FF3B4E` : `left:${cx}px;top:${r.top - bb.top - 10}px;translate:-50% -100%;--fc:${t.style.getPropertyValue('--fc')}`;
    box.append(circ, lbl);
    if (foe) { shake(true); dio.roar?.(); } /* v499 : plus d'éclair d'impact sur ta propre carte (il ressemblait à un coup) */
    await wait(d);
    t.classList.remove('cast', 'cast-foe'); circ.classList.add('out'); lbl.classList.add('out');
    setTimeout(() => { circ.remove(); lbl.remove(); }, 260);
    return true;
  }
  // Planche propre à chaque compétence de rôle, jouée sur la cible (assets/fx/sk-<clé>.webp, ajoutées à l'arrivée des images)
  const SKILL_FX = { estoc: { k: 2.8, d: 820 }, contagion: { k: 2.6, d: 850 }, entrave: { k: 2.6, d: 880 }, marque: { k: 2.5, d: 850 }, raz: { row: true, d: 900 }, rempart: { k: 2.5, d: 900 }, priere: { k: 2.5, d: 920 } }; // v359
  const skillFx = (key, uid, tgt) => {
    const f = SKILL_FX[key]; if (!f) return false;
    if (f.row) fxSheet(null, `sk-${key}`, { row: true, d: f.d }); else fxSheet(tgt || uid, `sk-${key}`, { k: f.k, d: f.d });
    return true;
  };
  const LUNGE_HIT = 190; // instant du contact dans l'élan (ms), synchronisé avec dvLunge
  // ——— Gros plan (v236) : compétences et coups critiques. Bandes de cinéma, les deux cartes au centre,
  // l'attaquant s'élance, impact. Accéléré avec la vitesse ×2/×3, absent si les animations sont réduites.
  async function closeup(aUid, tUid, label, { crit = false, own = null, sub = null } = {}) {
    const a = el(aUid), t = el(tUid), box = $('.dv');
    if (!a || !t || !box || reduced || ui.fast === 3) return false;
    const enemyAtk = st.units[aUid]?.side === 'enemy';
    const ov = document.createElement('div');
    ov.className = `cu ${enemyAtk ? 'foe' : ''} ${crit ? 'crit' : ''}`;
    ov.style.setProperty('--cu', `${T(1000)}ms`);
    const cw = Math.min(150, Math.max(a.getBoundingClientRect().width, t.getBoundingClientRect().width));
    const clone = (n, cls) => { const c = n.cloneNode(true); c.className = `${n.className} cu-card ${cls}`; c.classList.remove('lunge', 'hit', 'dodge', 'roar', 'enter', 'cracking', 'dying', 'guide'); c.style.width = `${cw}px`; c.removeAttribute('data-uid'); c.querySelectorAll('[data-uid]').forEach((x) => x.removeAttribute('data-uid')); return c; };
    ov.innerHTML = `<span class="cu-bar top"></span><span class="cu-bar bot"></span><span class="cu-flash"></span>
      <div class="cu-stage"></div><p class="cu-lbl">${own ? `<img class="aicon" alt="" src="${moveIconUrl(own.icon)}">` : ''}<b>${esc(label)}</b>${sub ?? (crit ? 'Critique !' : '') ? `<small>${sub ?? 'Critique !'}</small>` : ''}</p>`;
    const stage = ov.querySelector('.cu-stage');
    stage.append(clone(a, 'cu-a'), clone(t, 'cu-t'));
    const fx = document.createElement('img'); fx.className = 'cu-fx'; fx.alt = ''; fx.src = `assets/fx/${crit ? 'crit' : 'impact'}.webp`; stage.appendChild(fx);
    box.appendChild(ov);
    await wait(T(470)); // l'élan atteint la cible
    (crit ? app.sfx.crit : app.sfx.smash)(); if (crit) shake(true);
    await wait(T(530));
    ov.classList.add('out'); setTimeout(() => ov.remove(), T(220));
    return true;
  }
  function lunge(aUid, tUid) {
    const a = el(aUid), t = el(tUid);
    if (!a || !t || reduced) return;
    const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
    a.style.setProperty('--dx', `${(rt.left - ra.left) * 0.62}px`);
    a.style.setProperty('--dy', `${(rt.top - ra.top) * 0.62}px`);
    a.style.setProperty('--ld', `${T(420)}ms`);
    a.classList.remove('lunge'); void a.offsetWidth; a.classList.add('lunge');
  }
  // Explication courte d'une phase 2 (touche pour passer)
  async function phaseCard(P) {
    const b = document.createElement('div');
    b.className = 'cb-phase';
    b.innerHTML = `${st.bossKey ? `<img class="cb-phimg" alt="" src="assets/ui/ph-${st.bossKey}.webp" onerror="this.remove()">` : ''}<b>${esc(P.name)}</b><p>${esc(P.desc)}</p><small>Touche pour continuer</small>`;
    $('.dv').appendChild(b);
    await new Promise((res) => { const go = () => { b.remove(); res(); }; b.addEventListener('pointerdown', go, { once: true }); }); // v295 : attend le toucher, plus de fermeture automatique
  }
  const ULT_FX = { sceau: 'ult-sceau', revive: 'ult-revive', nova: 'ult-nova', smite: 'ult-smite', aegis: 'ult-aegis' }; // v354-v355 : une planche Gemini par pouvoir d'équipe
  async function ultFx() {
    const c = run.ult.card ? cat.get(run.ult.card) : null;
    const fx = document.createElement('div');
    fx.className = 'tb-summon'; fx.style.setProperty('--ic', ult.color);
    fx.innerHTML = `${c ? `<img alt="" src="${artUrl(c)}">` : `<span class="tb-sceau">${EMBLEM}</span>`}<b>${esc(ult.name)}</b>`;
    $('.dv').appendChild(fx);
    $('.dv').style.setProperty('--uc', ult.color);
    $('.dv').classList.add('ultflash'); fxSheet(null, ULT_FX[st.ult] || 'ult-seal', { center: true, d: 1300, cls: 'ultfx' }); setTimeout(() => $('.dv')?.classList.remove('ultflash'), 900);
    app.sfx.ult();
    await wait(reduced ? 300 : T(1200));
    fx.classList.add('out'); setTimeout(() => fx.remove(), 400);
  }

  async function finish() {
    if (!st.over || !alive_) return;
    busy = true; sel = null; mode = null; draw();
    say(st.over === 'won' ? '<b class="dc-good">Victoire !</b>' : '<b class="dc-bad">Défaite…</b>');
    (st.over === 'won' ? (st.bossKey ? app.sfx.bossvictory : app.sfx.victory) : app.sfx.defeat)();
    $('.dv').insertAdjacentHTML('beforeend', `<div class="cb-end">${crestHTML(st.over === 'won', st.over === 'won' ? 'Victoire' : 'Défaite')}</div>`);
    await wait(T(st.over === 'won' ? 850 : 1200));
    if (alive_) { alive_ = false; perfStop(); ctl.abort(); dio.destroy(); document.body.classList.remove('battle-mode'); onEnd(); }
  }

  // ——— Défense active ———
  // Un curseur traverse la barre en accélérant. Toucher dans l'or : esquive. Sur le trait blanc, au tout dernier instant : parade parfaite.
  let defTap = null;
  // ——— Attaque rythmée : un anneau se resserre sur le cercle de runes ; toucher au bon moment donne un bonus au jet ———
  // v352 : « lancer chargé ». Le d20 apparaît au centre ; on maintient le doigt pour le charger (il vibre et s'illumine
  // à la couleur de la faction, une jauge circulaire se remplit puis redescend), on relâche dans l'or : le dé part en
  // tournoyant et retombe dans le jet. Mêmes bonus qu'avant (RHYTHM.good / RHYTHM.perfect), seule la mise en scène change.
  let lastThrow = 0;
  function rhythmQTE(name, uid) {
    return new Promise((resolve) => {
      // v375 : plus exigeant — la cible change de place à chaque lancer, fenêtres resserrées, jauge plus rapide qui accélère en montant
      const RISE = 820, TGT = 0.5 + Math.random() * 0.36, PERF = 0.035, GOOD = 0.11, C = 2 * Math.PI * 44;
      const cu = uid && st.units[uid] ? cat.get(st.units[uid].id) : null;
      const fc = (cu && cat.faction[cu.faction]?.colors?.secondary) || '#F2C14E';
      const arc = (a, b) => `stroke-dasharray="${((b - a) * C).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-a * C).toFixed(1)}"`;
      const ov = document.createElement('div');
      ov.className = 'ry ry2';
      ov.style.setProperty('--fc', fc);
      ov.innerHTML = `<div class="ry2-c"><span class="ry-glow"></span><img class="ry2-ring" alt="" src="assets/fx/dice-ring.webp"><span class="ry2-chg"></span>
          <svg class="ry2-g" viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="44"/><circle class="zg" cx="50" cy="50" r="44" ${arc(TGT - GOOD, TGT + GOOD)}/><circle class="zp" cx="50" cy="50" r="44" ${arc(TGT - PERF, TGT + PERF)}/><circle class="fill" cx="50" cy="50" r="44" stroke-dasharray="0 ${C.toFixed(1)}"/></svg>
          <div class="ry2-die"><img alt="" src="assets/fx/d20.webp"></div><span class="ry2-flash"></span><b class="ry-res"></b></div>
        <p class="ry-t"><b>${esc(name)}</b><small>Maintiens le doigt pour charger le dé, relâche dans l’or, au centre pour un parfait</small></p>`;
      $('.dv').appendChild(ov);
      const chg = ov.querySelector('.ry2-chg'), fill = ov.querySelector('.fill'), die = ov.querySelector('.ry2-die'), res = ov.querySelector('.ry-res');
      let t0 = 0, x = 0, done = false, raf = 0, holding = false;
      const idle = setTimeout(() => { if (!holding) finish(null); }, 6000);
      const level = (ms) => { const k = (ms / RISE) % 2; return (k <= 1 ? k : 2 - k) ** 1.5; }; /* monte puis redescend, de plus en plus vite vers le haut */
      const step = () => {
        x = level(performance.now() - t0);
        fill.setAttribute('stroke-dasharray', `${(x * C).toFixed(1)} ${C.toFixed(1)}`);
        const g = Math.abs(x - TGT);
        ov.classList.toggle('near', g <= GOOD); ov.classList.toggle('hot', g <= PERF);
        ov.style.setProperty('--ch', x.toFixed(3));
        chg.style.backgroundPositionX = `${(Math.min(7, Math.floor(x * 8)) * 100 / 7).toFixed(2)}%`; // v356 : planche « charge » réglée sur la jauge
        if (!reduced) die.style.translate = `${((Math.random() - 0.5) * 9 * x).toFixed(1)}px ${((Math.random() - 0.5) * 9 * x).toFixed(1)}px`;
        if (performance.now() - t0 > RISE * 6) release(); else raf = requestAnimationFrame(step);
      };
      const press = (e) => { if (done || holding) return; e.preventDefault(); holding = true; clearTimeout(idle); ov.classList.add('hold'); t0 = performance.now(); app.sfx.tap?.(); raf = requestAnimationFrame(step); };
      const release = () => { if (!holding || done) return; holding = false; finish(x); };
      function finish(v) {
        if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(idle);
        ov.removeEventListener('pointerdown', press); removeEventListener('pointerup', release); removeEventListener('pointercancel', release);
        const gap = v === null ? 9 : Math.abs(v - TGT);
        const bonus = gap <= PERF ? RHYTHM.perfect : gap <= GOOD ? RHYTHM.good : 0;
        ov.classList.remove('hold', 'near', 'hot'); ov.classList.add(bonus === RHYTHM.perfect ? 'perfect' : bonus ? 'good' : 'miss', 'thrown');
        die.style.translate = '';
        res.textContent = bonus === RHYTHM.perfect ? `Parfait ! +${bonus}` : bonus ? `Bien ! +${bonus}` : v === null ? 'Lancé au hasard' : 'Raté';
        if (bonus && !reduced) { const n = document.createElement('span'); n.className = `kx-sprite fxs ry2-burst${bonus === RHYTHM.perfect ? '' : ' small'}`; n.style.cssText = `--d:${bonus === RHYTHM.perfect ? 760 : 600}ms;background-image:url(assets/fx/dice-perfect.webp)`; ov.querySelector('.ry2-c').appendChild(n); } // v356 : éclat d'or au lâcher réussi
        if (bonus === RHYTHM.perfect) { app.sfx.perfect(); if (!reduced) { shake(true); /* v633 : plus de secousse sur tout l'écran */ /* v607 : la secousse ne reste plus posée sur le plateau */ } }
        else if (bonus) app.sfx.hit(); else app.sfx.miss();
        app.sfx.swipe?.();
        lastThrow = 1;
        setTimeout(() => { ov.classList.add('out'); setTimeout(() => { ov.remove(); resolve(bonus); }, 200); }, bonus === RHYTHM.perfect ? 700 : 520);
      }
      ov.addEventListener('pointerdown', press);
      addEventListener('pointerup', release); addEventListener('pointercancel', release);
      app.sfx.swipe?.();
    });
  }
  /* v575 : toute la défense se joue sur la barre (le glisser, les cercles, le martèlement et les points faibles sont retirés,
     « seule la barre fonctionne bien »). Comme dans Clair Obscur, une attaque est une SÉQUENCE de coups : le curseur repasse
     pour chaque coup, et chaque ennemi a son rythme, qu'on apprend en jouant. Lettres d'une séquence :
     n coup simple · f rapide · l lent · x feinte (le curseur s'arrête, puis fonce) · m zone mobile · h coup chargé (v596 : un simple toucher,
     comme les autres) · H coup chargé avec feinte. Parade parfaite de toute la séquence = contre-attaque (moteur). */
  const ASSAULT_K = ['heavy', 'blast', 'gorge', 'blizzard', 'copy', 'swarm', 'execute', 'lament', 'ambush', 'price', 'quake', 'chain', 'tick2'];
  /* v594 : FAM_RHYTHM, KIND_RHYTHM, BOSS_ASSAULT dans js/ui/def-bar.js (partagés avec le Labo des défenses) */
  /* séquence d'une attaque : propre au coup, sinon au rythme de la famille ; une élite ajoute un coup rapide */
  function seqFor(s) {
    const e = st.units[s.a];
    let q = KIND_RHYTHM[s.kind] || (intentInfo(st, e)?.aoe ? 'lx' : FAM_RHYTHM[e?.fam] || 'n');
    if (e?.elite && !e.boss && q.length < 3 && !/[hH]/.test(q)) q += 'f';
    return q;
  }
  /* bilan d'une séquence pour le moteur : tout paré = parade ; un raté sur trois coups ou plus = esquive ; sinon touché */
  const verdict = (res) => defVerdict(res, getTune()); /* v594 : règle réglable au Labo des défenses */
  async function tipFor(q) {
    for (const k of ['cb-def-tap', q.length > 1 && 'cb-def-combo', /[xH]/.test(q) && 'cb-def-feint'].filter(Boolean)) {
      if (!g.s.tips?.[k]) await tuto(app, k);
      if (!alive_) return;
    }
  }
  async function defenseQTE(s) {
    const e0 = st.units[s.a];
    const A = e0?.boss && ASSAULT_K.includes(s.kind) && BOSS_ASSAULT[st.bossKey];
    if (A) return assaultQTE(s, A);
    const q = seqFor(s);
    await tipFor(q);
    if (!alive_) return 'none';
    return verdict(await barQTE(s, q));
  }
  /* v558 : Assaut d'un gardien : sa grosse attaque, une séquence plus longue, avec sa mise en scène */
  async function assaultQTE(s, A) {
    const e = st.units[s.a];
    if (!g.s.tips?.['cb-assault']) await tuto(app, 'cb-assault');
    await tipFor(A.seq);
    if (!alive_) return 'none';
    const ov = document.createElement('div'); ov.className = 'cb-assault';
    ov.innerHTML = `<div class="cb-as-in"><small>Assaut · ${esc(uName(e))}</small><b>${esc(A.name)}</b></div>`;
    $('.dv')?.appendChild(ov); app.sfx.boss?.();
    if (!reduced) { shake(true); /* v633 : plus de secousse sur tout l'écran */ /* v607 : la secousse ne reste plus posée sur le plateau */ }
    await wait(reduced ? 500 : 1100);
    ov.classList.add('out'); setTimeout(() => ov.remove(), 250);
    const res = await barQTE(s, A.seq, { beat: A.beat, title: A.name });
    const r = verdict(res.length ? res : ['none']);
    const end = document.createElement('div'); end.className = `dv-stamp s-${r} as`;
    end.innerHTML = `<b>${r === 'parry' ? 'Assaut brisé !' : r === 'dodge' ? 'Assaut amorti' : 'Assaut subi…'}</b>`;
    $('.dv')?.appendChild(end); setTimeout(() => end.remove(), 1000);
    if (r === 'parry') app.sfx.perfect?.();
    await wait(reduced ? 250 : 650);
    return r;
  }
  /* La barre : v594, code commun avec le Labo des défenses (js/ui/def-bar.js) ; réglages du Labo si le Créateur l'a demandé */
  async function barQTE(s, q = 'n', { beat = 0, title = '' } = {}) {
    const e = st.units[s.a], T = getTune();
    perfMark(title ? 'Assaut de gardien' : 'barre de défense');
    const tEls = s.kind === 'blast' || intentInfo(st, e)?.aoe ? front(st, 'ally').map((u) => el(u.uid)) : [el(s.t)];
    el(s.a)?.classList.add('aim'); tEls.forEach((x) => x?.classList.add('aimed'));
    const def = INTENTS[s.kind] || INTENTS.hit;
    const out = await playBar({ mid: $('.dv-mid'), dv: $('.dv'), letters: [...q], tier: e?.boss ? 'boss' : e?.elite ? 'elite' : 'normal',
      win: () => defenseWindow(st, s.a, s.t, T), beat, titleHTML: `${intentIcon(s.kind)} ${esc(title || `${def.name} !`)}`,
      reduced, alive: () => alive_, setTap: (f) => { defTap = f; }, sfx: app.sfx, hap, T });
    el(s.a)?.classList.remove('aim'); tEls.forEach((x) => x?.classList.remove('aimed'));
    return out;
  }
  // Résumé du tour ennemi : une ligne par ennemi, affichée au début de ton tour
  let log = null;
  const nm = (uid) => { const u = st.units[uid]; return u ? esc(uName(u)) : ''; };
  function logEvents(ev) {
    if (!log) return;
    for (const e of ev) {
      if (e.t === 'eact') { log.push({ a: e.a, k: INTENTS[e.kind]?.name || '', parts: [] }); continue; }
      const cur = log[log.length - 1] || (log.push({ a: null, k: '', parts: [] }), log[log.length - 1]);
      const who = e.u ? nm(e.u) : '', mine = e.u && st.units[e.u]?.side === 'ally';
      const tag = (t) => `<span class="${mine ? 'r-me' : 'r-foe'}">${t}</span>`;
      if (e.t === 'dmg') cur.parts.push(tag(`${who} −${e.d}`));
      else if (e.t === 'die') cur.parts.push(tag(`${who} tombe`));
      else if (e.t === 'heal') cur.parts.push(`<span class="r-heal">${who} +${e.d}</span>`);
      else if (e.t === 'block') cur.parts.push(`${who} bloque`);
      else if (e.t === 'dodge') cur.parts.push('<span class="r-good">esquivé</span>');
      else if (e.t === 'parry') cur.parts.push('<span class="r-good">parade parfaite</span>');
      else if (e.t === 'status' && e.u && !e.syn && e.u !== cur.a) cur.parts.push(`${who} : ${esc(e.s)}`);
    }
  }
  function showLog() {
    root.querySelector('.cb-recap')?.remove();
    const rows = (log || []).filter((r) => r.parts.length || r.a);
    log = null;
    if (!rows.length) return;
    const html0 = rows.slice(-6).map((r) => `<li>${r.a ? `<b>${nm(r.a)}</b> <i>${esc(r.k)}</i>` : '<b>Fin du tour</b>'}${r.parts.length ? ` · ${r.parts.slice(0, 4).join(', ')}` : ''}</li>`).join('');
    app.state.lastEnemyTurn = html0; // gardé pour « Voir ce qui s'est passé » après une défaite
    /* v409 : plus de fenêtre « Tour ennemi » pendant le combat (jugée pénible) ; le résumé reste lisible après une défaite */
  }
  async function enemyTurn() {
    log ||= [];
    for (let n = E.duelNext(where); n && alive_; n = E.duelNext(where)) {
      const s = n.s, skips = n.skips;
      logEvents(skips);
      if (skips.length) await play(skips);
      let res = 'none';
      if (s.qte && defMode === 'auto') res = Math.random() < 0.4 ? 'dodge' : 'none'; // automatique : 40 % d'esquives, jamais de parade
      else if (s.qte && defMode !== 'off') {
        /* v558 : un conseil court à la première rencontre de chaque geste (tipFor), à la place du long texte cb-defense4 */
        if (!alive_) return;
        res = await defenseQTE(s);
        // v331 : après 3 défenses ratées dans l'expédition, on rappelle qu'il existe une défense assistée ou automatique (une seule fois)
        if (res === 'none') { run.defMiss = (run.defMiss || 0) + 1; if (run.defMiss >= 3 && !g.s.tips?.['def-help']) { g.s.tips = { ...(g.s.tips || {}), 'def-help': Date.now() }; toast('Les défenses sont difficiles ? Dans <b>Réglages → Jeu</b>, tu peux choisir la défense <b>automatique</b> (4 esquives sur 10, sans parade).', { icon: 'info', ms: 8000 }); } }
      }
      if (!alive_) return;
      acting = s.a; drawTimeline();
      const ev = E.duelEnemy(where, s.a, res);
      logEvents(ev);
      lastDef = res; // pas de gros plan d'impact si le coup est esquivé ou paré
      await play(ev);
      lastDef = 'none'; acting = null;
    }
    if (!alive_) return;
    const ev = E.duelEndEnemy(where);
    logEvents(ev.filter((e) => e.t !== 'eact'));
    await play(ev);
  }
  // Les ennemis jouent jusqu'au tour de ta prochaine créature (v262 : l'ordre alterne entre les deux camps)
  async function foesPlay() {
    log = [];
    for (let k = 0; k < 16 && alive_ && !st.over && st.turn === 'enemy'; k++) await enemyTurn();
    if (guide) endGuide();
    if (!alive_ || st.over) return;
    setTimeout(() => { if (alive_ && !busy && st.turn === 'ally') showLog(); }, reduced ? 0 : 1000); // après le bandeau « À toi ! »
  }
  async function doEnd() {
    if (busy || st.turn !== 'ally' || st.over) return;
    busy = true; mode = null; if (!st.init) sel = null; draw();
    const ev = E.duelPass(where); // en ordre d'initiative : « Passer »
    await play(ev);
    if (!st.over && st.turn === 'enemy') await foesPlay();
    busy = false; draw();
    if (st.over) return finish();
    tips();
  }
  // Bulles d'aide au bon moment (une seule fois chacune)
  async function tips() {
    if (busy || st.over || guide) return;
    const foes = front(st, 'enemy');
    // v398 : deux bulles au plus à la fois (l'audit relevait des rafales de 3 à 5) ; les autres viendront à un combat suivant
    const want = [
      [!!st.goal, 'cb-goal'],
      [foes.some((e) => e.boss || e.elite || bigOf(e, false) || bigOf(e, true)) || (run?.floor || 0) >= ORD_INT_FROM, 'cb-intent'],
      [foes.some((e) => e.brkMax), 'cb-break'],
      [!!st.runes, 'cb-runes'],
      [foes.some((e) => e.trait), 'cb-traits'],
      [st.fervor >= 1 && !!g.s.tips?.['cb-guide'], 'cb-skill'],
    ].filter(([ok, k]) => ok && !g.s.tips?.[k]).slice(0, 2);
    for (const [, k] of want) await tuto(app, k);
    draw();
  }

  // ——— Actions du joueur ———
  async function exec(fn) {
    busy = true; draw();
    const ev = fn(); g.persist();
    await play(ev);
    if (!st.over && st.turn === 'enemy') { await foesPlay(); if (!st.over) tips(); }
    busy = false;
    if (sel && !actionsFor(st, sel).some((a) => a.ok && a.key !== 'swap')) sel = null;
    draw();
    if (st.over) return finish();
  }
  const seenMv = new Set();
  async function choose(key) {
    const a = actionsFor(st, sel).find((x) => x.key === key);
    if (!a) return;
    if (!a.ok) { app.sfx.error(); toast(esc(a.why), { icon: 'info' }); return; }
    app.sfx.tap();
    // compétence propre : son effet est rappelé la première fois dans le combat
    if (a.own && !seenMv.has(sel + key)) { seenMv.add(sel + key); toast(`<b>${esc(a.name)}</b> : ${esc(a.desc)}`, { icon: 'sparkle', ms: 4200 }); }
    const u = sel;
    if (a.target === 'none') { mode = null; return exec(() => E.duelAct(where, u, key)); }
    const ts = actionTargets(st, u, key);
    if (key === 'swap') { if (ts.length === 1) { mode = null; return exec(() => E.duelAct(where, u, 'swap', ts[0])); } return pickReserve(); }
    if (a.dice && !g.s.tips?.['cb-dice3'] && !settling()) await tuto(app, 'cb-dice3');
    if (ts.length === 1 && (key === 'rempart' || key === 'priere')) { mode = null; return exec(() => E.duelAct(where, u, key, ts[0])); }
    mode = { key, name: a.name, dice: !!a.dice, target: a.target };
    draw();
  }
  // Description d'une action (appui long sur sa tuile)
  function actInfo(key) {
    const u = sel && st.units[sel]; if (!u) return;
    const a = actionsFor(st, sel).find((x) => x.key === key); if (!a) return;
    const d = a.desc || (key === KITS[u.role].skill.key ? KITS[u.role].skill.desc : '');
    app.sfx.tap();
    toast(`<b>${esc(a.name)}</b>${a.dice ? ' · dé à 20 faces' : ''}${a.gain ? ` · gratuit, +${a.gain} PA` : a.ap ? ` · ${a.ap} ${st.init ? 'PA' : `action${a.ap > 1 ? 's' : ''}`}` : ' · gratuit'}${d ? `<br>${esc(d)}` : ''}${!a.ok && a.why ? `<br><i>${esc(a.why)}</i>` : ''}`, { icon: 'sparkle', ms: 4200 });
  }
  async function pickTarget(uid) {
    const key = mode.key;
    if (!actionTargets(st, sel, key).includes(uid)) {
      const t = st.units[uid];
      if (key === 'entrave' && t?.frostCD > 0) toast('Elle vient d’être gelée : immunisée au gel ce tour-ci.', { icon: 'info' });
      else if (t?.side === 'enemy' && key !== 'priere' && key !== 'rempart') toast('Un <b>Protecteur</b> ennemi protège les autres : vise-le d’abord.', { icon: 'shield' });
      return;
    }
    const a = actionsFor(st, sel).find((x) => x.key === key);
    const u = sel; mode = null;
    let rh = 0;
    if (a.dice) { // compétence à dé : la frappe rythmée part tout de suite, puis le jet
      busy = true; app.sfx.tap(); draw();
      rh = await rhythmQTE(a.name, u); /* v509 : lancer chargé dès le premier combat (avant v509 : automatique aux étages 1-2) */
      if (!alive_) return;
    }
    return exec(() => E.duelAct(where, u, key, uid, rh));
  }
  async function pickReserve() {
    if (!g.s.tips?.['cb-entrance']) await tuto(app, 'cb-entrance');
    const r = reserve(st, 'ally'), su = st.units[sel];
    const sh = openSheet(`<h2>Qui entre en jeu ?</h2><p class="small muted">À la place de <b>${esc(cat.get(su.id).name)}</b>. ${st.init ? `Gratuit : elle prend sa place dans l’ordre des tours et joue tout de suite${st.freeSwap ? ' (Relais d’ombre : +2 PA)' : ''}` : `Coût : ${st.freeSwap ? 'gratuit (Relais d’ombre)' : '1 action'}. Elle peut agir ce tour-ci`} ; PV, PA et états sont conservés.</p>
      <div class="dv-pick">${r.map((x) => `<button class="dv-pick-c" data-in="${x.uid}"><img alt="" src="${artUrl(cat.get(x.id), { lite: true })}"><b>${esc(cat.get(x.id).name)}</b><span>${esc(KITS[x.role].name)} · ${icon('swords')}${x.atk} · ${icon('heart')}${x.hp}/${x.maxHp}</span>${ENTRANCES[x.role] ? `<small class="dv-pick-e"><b>${esc(ENTRANCES[x.role].name)}</b> : ${esc(ENTRANCES[x.role].desc)}</small>` : ''}</button>`).join('')}</div>`, { label: 'Permuter' });
    sh.body.addEventListener('click', (ev) => { const p = ev.target.closest('[data-in]'); if (p) { sh.close(); const u = sel; mode = null; exec(() => E.duelAct(where, u, 'swap', p.dataset.in)); } });
  }

  // Règles en vigueur : pacte, loi de l'Architecte, aspect de l'Éclipse, reliques
  function ruleSheet(k) {
    let h = '';
    if (k === 'gap') { const gp = gapOf(st), d = Math.round((1 - 1 / gp ** 2) * 100); h = `<h2>Ennemis trop forts</h2><p>Ces ennemis sont bien plus forts que ton équipe (environ ×${gp.toFixed(1)}).</p><p>Tes créatures leur font <b>${d} % de dégâts en moins</b>, et leurs coups ne sont plus retenus : ils peuvent abattre une créature d’un seul coup.</p><p class="small muted">Renforce ton équipe (Collection › Forge) ou choisis des créatures plus rares avant de descendre aussi bas.</p>`; }
    else if (k === 'goal') { const gl = goalState(st); if (gl) h = `<h2>Objectif : ${esc(gl.name)}</h2><p>${esc(gl.desc)}</p><p class="small muted">Facultatif. Réussi et combat gagné : des éclats en plus et 1 Ferveur pour la suite du chapitre.</p><p><b>${gl.state === 'done' ? 'Réussi !' : gl.state === 'fail' ? 'Manqué pour ce combat.' : `En cours${gl.p ? ` (${gl.p})` : ''}.`}</b></p>`; }
    else if (k === 'pact' && PACTS[st.pact]) h = `<h2>${esc(PACTS[st.pact].name)}</h2><p><b class="dc-good">Gain</b> : ${esc(PACTS[st.pact].gain)}</p><p><b class="dc-bad">Prix</b> : ${esc(PACTS[st.pact].cost)}</p>`;
    else if (k === 'law' && LAWS[st.law]) h = `<h2>${esc(LAWS[st.law].name)}</h2><p>${esc(LAWS[st.law].desc)}</p><p class="small muted">L’Architecte change de Loi tous les deux tours ; la prochaine est annoncée sur sa carte.</p>`;
    else if (k === 'aspect' && ASPECTS[st.aspect]) { const A = ASPECTS[st.aspect]; h = `<h2>${esc(A.name)}</h2><p>Faible face à <b>${A.weak.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}</b> (+60 %), résiste à <b>${A.resist.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}</b> (−50 %).</p>`; }
    else if (k === 'runes' && st.runes) h = `<h2>Les runes du gardien</h2><p class="small">Tant qu’elles tiennent, chaque rune retire <b>10 %</b> des dégâts que subit le gardien. Brise les trois : il est <b>Fêlé</b> sur-le-champ.</p>${st.runes.map((r) => `<p class="small cb-runeline ${r.broken ? 'off' : ''}"><img alt="" src="assets/ui/${r.broken ? 'rune-broken' : 'rune'}.webp"><span><b>${esc(RUNES[r.k].name)}</b>${r.broken ? ' · <span class="dc-good">brisée</span>' : ''}<br>${esc(RUNES[r.k].hint)}</span></p>`).join('')}`;
    else if (k === 'omen' && OMENS[st.omen]) h = `<h2>${esc(OMENS[st.omen].name)}</h2><p class="small"><b class="dc-good">Gain</b> ${esc(OMENS[st.omen].gain)}</p><p class="small"><b class="dc-bad">Prix</b> ${esc(OMENS[st.omen].cost)}</p>`;
    else if (k === 'day' && run) { const R = g.rule(run.day); h = `<h2>Règle du jour : ${esc(R.name)}</h2><p>${esc(R.desc)}</p><p class="small muted">Elle vaut pour la Descente et les Épreuves d’aujourd’hui.</p>`; }
    else if (k === 'relics') h = `<h2>Tes reliques</h2>${(st.relics || []).map((r) => `<p class="small"><b>${esc(RELICS[r].name)}</b> : ${esc(RELICS[r].gain)} <span class="dc-bad">${esc(RELICS[r].cost)}</span></p>`).join('')}`;
    if (h) openSheet(`<div class="cb-rulesheet">${h}</div>`, { label: 'Règle en vigueur' });
  }
  // ——— Touchers ———
  root.addEventListener('pointerdown', (e) => { if (defTap && !e.target.closest('[data-d="quit"],[data-d="help"],[data-d="speed"]')) { e.preventDefault(); defTap(e.timeStamp); } }, { signal: ctl.signal });
  root.addEventListener('pointerdown', (e) => {
    const ab = e.target.closest('[data-a]'); clearTimeout(holdT); held = false;
    // v329 : appui long sur une carte (ennemie ou alliée) = sa fiche ; le toucher court garde l'attaque rapide
    const cd = !ab && e.target.closest('.dv-c');
    if (cd) { const u = st.units[cd.dataset.uid]; if (u) holdT = setTimeout(() => { held = true; app.sfx.tap?.(); hap(1); info(u); }, 420); return; }
    if (!ab || busy || !sel) return; holdT = setTimeout(() => { held = true; actInfo(ab.dataset.a); }, 420);
  }, { signal: ctl.signal });
  for (const t of ['pointerup', 'pointercancel']) root.addEventListener(t, () => clearTimeout(holdT), { signal: ctl.signal });
  root.addEventListener('pointermove', (e) => { if (holdT && e.target.closest('[data-a]') == null && e.target.closest('.dv-c') == null) clearTimeout(holdT); }, { signal: ctl.signal });
  root.addEventListener('contextmenu', (e) => { if (e.target.closest('.dv-c, [data-a]')) e.preventDefault(); }, { signal: ctl.signal });
  root.addEventListener('click', async (e) => {
    if (!alive_) return;
    const b = e.target.closest('[data-d]');
    if (b) {
      const k = b.dataset.d;
      if (k === 'quit') {
        if (!onAbandon) { toast(pause, { icon: 'swords' }); app.go(''); return; }
        const sh = openSheet(run.lab ? `<div class="cb-pause"><h2>${icon('swords')} Pause</h2>
          <button class="btn primary block" data-p="abandon">Quitter le combat d’essai</button><p class="small muted">Retour au Labo des combats. Rien n’est gagné ni perdu.</p>
          <button class="btn ghost block" data-p="back">Reprendre le combat</button></div>` : `<div class="cb-pause"><h2>${icon('swords')} Pause</h2>
          <button class="btn primary block" data-p="pause">Mettre en pause</button><p class="small muted">Le combat t’attend ${run.trial ? 'dans les Épreuves' : 'dans la Descente'}, exactement là où tu l’as laissé.</p>
          <button class="btn ghost block cb-abandon" data-p="abandon">${icon('p:abandon')}${run.trial ? 'Abandonner l’Épreuve' : 'Abandonner le chapitre'}</button><p class="small muted">${run.trial ? 'Elle comptera comme perdue pour aujourd’hui.' : 'Tu gardes ton butin ; le chapitre recommencera à son premier étage.'}</p>
          <button class="btn ghost block" data-p="back">Reprendre le combat</button></div>`, { label: 'Pause' });
        sh.body.addEventListener('click', (ev) => {
          const p = ev.target.closest('[data-p]')?.dataset.p;
          if (!p) return;
          sh.close();
          if (p === 'pause') { toast(pause, { icon: 'swords' }); if (onPause) onPause(); else app.go(''); } /* v378 : la Descente reste sur l'onglet Aventure */
          if (p === 'abandon') onAbandon();
        });
        return;
      }
      if (k === 'help') return help();
      if (k === 'speed') { ui.fast = ui.fast ? 0 : 1; g.setSetting('combatFast', !!ui.fast); b.textContent = `×${ui.fast ? 2 : 1}`; b.classList.toggle('on', !!ui.fast); b.setAttribute('aria-pressed', String(!!ui.fast)); app.sfx.tap(); return; }
      if (k === 'rule') return ruleSheet(b.dataset.k);
      if (k === 'reserve') return reserveSheet();
      if (busy) return;
      if (k === 'desel') { sel = null; mode = null; draw(); return; }
      if (k === 'cancel') { mode = null; draw(); return; }
      if (k === 'end') return doEnd();
      if (k === 'ult') {
        return ultSheet();
      }
      // (mode Auto retiré en v240 : chaque combat se joue)
      return;
    }
    const ab = e.target.closest('[data-a]');
    if (ab) { if (held) { held = false; return; } if (!busy && sel) choose(ab.dataset.a); return; }
    const c = e.target.closest('.dv-c');
    if (c && held) { held = false; return; } // l'appui long a déjà ouvert la fiche
    if (!c || busy || st.over) return;
    const u = st.units[c.dataset.uid];
    if (mode) return pickTarget(u.uid);
    if (u.side === 'ally') {
      if (sel === u.uid) { info(u); return; }
      if (st.turn === 'ally' && actionsFor(st, u.uid).some((a) => a.ok)) { sel = u.uid; app.sfx.tap(); draw(); }
      else info(u);
      return;
    }
    // ennemi touché avec une créature choisie : attaque directe (raccourci)
    if (sel && actionsFor(st, sel)[0].ok && actionTargets(st, sel, 'attack').includes(u.uid)) { const a = sel; return exec(() => E.duelAct(where, a, 'attack', u.uid)); }
    /* v444 : ennemi hors d'atteinte (couvert par un Protecteur…) : on dit qui viser au lieu d'ouvrir sa fiche (appui long) */
    if (sel && actionsFor(st, sel)[0].ok && !u.dead) { const ok = actionTargets(st, sel, 'attack'); if (ok.length) { app.sfx.tap?.(); toast(tr('{name} est protégé : vise d’abord {list}.', { name: esc(tw(uName(u))), list: ok.map((x) => `<b>${esc(tw(uName(st.units[x])))}</b>`).join(tr(' ou ')) }), { icon: 'shield' }); return; } }
    info(u);
  }, { signal: ctl.signal });

  // ——— Pouvoir d'équipe : explication avant, récapitulatif après ———
  const ULT_HOW = {
    sceau: 'Chacune de tes créatures au combat récupère 20 % de ses PV et reçoit un bouclier qui absorbe des dégâts jusqu’à 30 % de ses PV max.',
    revive: 'Tes créatures tombées reviennent au combat avec la moitié de leurs PV. Si aucune n’est tombée, tes créatures au combat récupèrent 40 % de leurs PV.',
    nova: 'Chaque ennemi au combat subit des dégâts (plus forts à chaque tour qui passe) et sa jauge de Brisure baisse.',
    smite: 'L’ennemi qui a le plus de PV subit un coup énorme (plus fort à chaque tour) et sa jauge de Brisure baisse fortement.',
    aegis: 'Tes créatures au combat reçoivent un bouclier, sont libérées du gel et gagnent chacune 2 PA.',
  };
  function ultSheet() {
    const ready = ultReady(st), c = run.ult.card ? cat.get(run.ult.card) : null;
    const sh = openSheet(`<div class="cb-ultsheet" style="--uc:${ult.color}">
      <div class="cb-ult-hero">${c ? `<img alt="" src="${artUrl(c)}">` : '<img alt="" src="assets/icons/power.webp">'}</div>
      <h2>${esc(ult.name)}</h2>
      <p class="small muted">Pouvoir d’équipe${c ? ` de ${esc(c.name)}` : ''} · coûte <b>toute la Ferveur (${FERVOR_MAX})</b>, ${st.init ? 'se lance pendant le tour d’une de tes créatures sans le terminer' : 'et <b>1 action</b>'} · <b>une fois par combat</b></p>
      <p>${esc(ULT_HOW[st.ult] || ult.desc)}</p>
      ${ready ? `<button class="btn primary block big-cta dc-plq dc-plq-red" data-u="go">${icon('p:power')}Lancer le pouvoir</button>` : `<p class="small cb-ult-need">${st.ultUsed ? 'Déjà utilisé dans ce combat. Il revient au prochain.' : st.fervor < FERVOR_MAX ? `Encore ${FERVOR_MAX - st.fervor} Ferveur à gagner : attaque, exploite les faiblesses, esquive, pare et brise les ennemis.` : st.init ? 'Attends le tour d’une de tes créatures.' : 'Il te faut encore 1 action ce tour-ci.'}</p>`}
    </div>`, { label: ult.name });
    sh.body.addEventListener('click', (e) => { if (e.target.closest('[data-u="go"]')) { sh.close(); castUlt(); } });
  }
  async function castUlt() {
    if (!ultReady(st)) return;
    sel = null; mode = null; busy = true; draw();
    const ev = E.duelUlt(where);
    await play(ev);
    const healed = ev.filter((x) => x.t === 'heal').reduce((a, x) => a + x.d, 0);
    const dmg = ev.filter((x) => x.t === 'dmg').reduce((a, x) => a + x.d, 0);
    const revived = ev.filter((x) => x.t === 'revive').length;
    const parts = [revived && `${revived} créature${revived > 1 ? 's' : ''} relevée${revived > 1 ? 's' : ''}`, healed && `+${healed} PV rendus`, dmg && `${dmg} dégâts infligés`, ['sceau', 'aegis'].includes(st.ult) && 'boucliers sur tes créatures', st.ult === 'aegis' && (st.init ? '+2 PA chacune' : '+2 actions')].filter(Boolean);
    toast(`<b>${esc(ult.name)}</b> : ${parts.join(' · ') || 'aucun effet'}`, { icon: 'sparkle', kind: 'success' });
    busy = false; draw();
    if (st.over) finish();
    else if (st.turn === 'enemy') await foesPlay(); /* v536 : le pouvoir peut faire passer la main aux ennemis (créature qui agissait tombée) */
  }

  // ——— Fiches ———
  function info(u) {
    const c = cat.get(u.id), kit = KITS[u.role];
    const i = u.side === 'enemy' ? intentInfo(st, u) : null;
    const fam = u.fam ? AI_FAMILIES[u.fam] : null;
    const weakF = u.side === 'enemy' && (st.discovered[u.faction] || u.mark) ? WEAK_TO[u.faction] : null;
    const tgtName = i?.target && st.units[i.target]?.side === 'ally' ? cat.get(st.units[i.target].id).name : '';
    openSheet(`<div class="tb-info">${isFig(u) ? `<div class="tb-info-boss"><img alt="" src="${uPic(u)}"><small>${esc(BOSSES[st.bossKey].title || '')}</small></div>` : `<div class="tb-info-card ${u.side === 'enemy' ? 'corrupt' : ''}">${cardHTML(c, { size: 'full', nameKnown: true })}</div>`}
      <h3>${isFig(u) ? esc(uName(u)) : `${esc(c.name)}${u.side === 'enemy' ? ' corrompu' : ''}`}</h3>
      <dl class="facts"><div><dt>Attaque</dt><dd>${u.atk + (u.boost || 0)}</dd></div><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div><div><dt>Niveau</dt><dd>${u.level || 1}</dd></div>${st.init ? `<div><dt>Vitesse</dt><dd>${speedOf(u)}</dd></div>` : ''}${st.init && u.side === 'ally' ? `<div><dt>PA</dt><dd>${u.pa || 0} / ${PA_MAX}</dd></div>` : ''}${u.brkMax ? `<div><dt>Brisure</dt><dd>${u.broken ? 'Brisé' : `${u.brk} / ${u.brkMax}`}</dd></div>` : ''}</dl>
      ${u.side === 'enemy' && (bigOf(u, false) || bigOf(u, true)) ? `<p class="small dc-bad"><b>Annonce</b> : ${esc(bigOf(u, false) ? (PREP_IT[bigOf(u, false)] ? `il prépare ${INTENTS[PREP_IT[bigOf(u, false)]].name} pour le tour suivant` : `${INTENTS[bigOf(u, false)].name} à son prochain tour`) : `${INTENTS[bigOf(u, true)].name} au tour suivant`)}. ${esc(INTENTS[PREP_IT[bigOf(u, false)] || bigOf(u, false) || bigOf(u, true)].desc)} Brise-le pour l’annuler.</p>` : ''}
      ${u.trait && TRAITS[u.trait] ? `<p class="small dc-bad cb-trait"><img class="cb-trico" alt="" src="assets/icons/st-${traitIcon(u.trait)}.webp"><b>${esc(TRAITS[u.trait].name)}</b> : ${esc(TRAITS[u.trait].desc)}</p>` : ''}
      ${fam ? `<p class="small"><b>${esc(fam.name)}</b> : ${esc(fam.desc)} <span class="dc-good">${esc(fam.counter)}</span></p>` : ''}
      ${u.boss && st.bossKey ? `<p class="small dc-bad"><b>${esc(BOSSES[st.bossKey].name)}</b> : ${esc(BOSSES[st.bossKey].mechanic)} Sous la moitié de ses PV, il entre en phase 2 et accélère.</p>${g.s.bossesBeaten[st.bossKey] ? `<p class="small dc-good"><b>Pour le contrer</b> : ${esc(BOSSES[st.bossKey].counter)}</p>` : ''}${u.aspect ? `<p class="small"><b>${esc(ASPECTS[u.aspect].name)}</b> : faible face à ${ASPECTS[u.aspect].weak.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}, résiste à ${ASPECTS[u.aspect].resist.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}.</p>` : ''}` : ''}
      ${u.boss && st.bossPower && !st.bossKey ? `<p class="small dc-bad"><b>${esc(BOSS_POWERS[st.bossPower].name)}</b> : ${esc(BOSS_POWERS[st.bossPower].desc)} Sous la moitié de ses PV, il entre en phase 2.</p><p class="small dc-good"><b>Point faible</b> : ${esc(BOSS_POWERS[st.bossPower].counter)}</p>` : ''}
      ${u.side === 'enemy' ? `<p class="small">${weakF ? `<b>Faiblesse</b> : ${sigil(weakF)} ${esc(cat.faction[weakF]?.name || weakF)} (+50 % de dégâts)` : '<b>Faiblesse</b> : inconnue. Frappe-la avec la bonne faction, ou marque-la, pour la découvrir.'}</p>` : `
      <p class="small"><b>${actIcon('attack')} ${esc(kit.basic.name)}</b> (gratuit, +1 PA) : ${esc(kit.basic.desc)}</p>
      <p class="small"><b>${actIcon(kit.skill.key, kit.skill.icon)} ${esc(kit.skill.name)}</b> (${kit.skill.pa} PA) : ${esc(kit.skill.desc)}</p>
      <p class="small"><b>${esc(kit.passive.name)}</b> : ${esc(kit.passive.desc)}</p>
      ${u.rarity === 'C' ? `<p class="small dc-good">${icon('star')} Instinct de meute : +${PACK_BONUS} dégât aux élites et aux gardiens.</p>` : ''}`}
      ${u.side === 'enemy' && g.owns(u.id) ? `<p class="small dc-good">${icon('book')} Tu possèdes sa carte : tes créatures lui font +1 dégât.</p>` : ''}
      ${passivesOf(u).filter((p) => PASSIVES[p]).map((p) => `<p class="small"><b>${esc(PASSIVES[p].name)}</b> : ${esc(PASSIVES[p].desc)}</p>`).join('')}
      ${u.talent && TALENTS[u.talent] ? `<p class="small"><b>Talent · ${esc(TALENTS[u.talent].name)}</b> : ${esc(TALENTS[u.talent].desc)}</p>` : ''}
      <p class="small muted">${statusLines(u)}</p></div>`, { label: uName(u) });
  }
  // v289 : la réserve au toucher — les cartes des créatures en attente, pour juger d'un remplacement
  function reserveSheet() {
    const r = reserve(st, 'ally');
    if (!r.length) return;
    const sh = openSheet(`<h2>${icon('team')} Ta réserve</h2>
      <p class="small muted">Pour faire entrer l’une d’elles, choisis l’action <b>Permuter</b> de la créature qui joue. Touche une carte pour tout voir.</p>
      <div class="cb-rsv">${r.map((x) => { const c = cat.get(x.id), kit = KITS[x.role]; return `<button class="cb-rsv-c" data-u="${x.uid}">
        <span class="cb-rsv-card">${cardHTML(c, { size: 'full', nameKnown: true, variant: g.shownVariant(x.id) })}</span>
        <span class="cb-rsv-st"><span>${roleIcon(kit.kw)}<b>${esc(kit.name)}</b></span><span>${icon('swords')}${x.atk + (x.boost || 0)}</span><span>${icon('heart')}${Math.max(0, x.hp)}/${x.maxHp}</span></span>
        ${ENTRANCES[x.role] ? `<small class="cb-rsv-e"><b>En entrant</b> : ${esc(ENTRANCES[x.role].desc)}</small>` : ''}</button>`; }).join('')}</div>`, { label: 'Réserve' });
    sh.body.addEventListener('click', (ev) => { const id = ev.target.closest('[data-u]')?.dataset.u; if (id) { sh.close(); info(st.units[id]); } });
  }
  function statusLines(u) {
    const s = [];
    if (u.shield) s.push('Bouclier : bloque le prochain coup.');
    if (u.ward) s.push(`Barrière : absorbe encore ${u.ward} dégâts.`);
    if (u.poison) s.push(`Poison ${u.poison} : perd ${u.poison} PV au début de son tour, puis le poison diminue de moitié.`);
    if (u.frozen || u.stunned) s.push('Gelé : passe son prochain tour.');
    if (u.slow) s.push('Ralenti : sa prochaine attaque fait moitié moins mal.');
    if (u.mark) s.push('Marqué : le prochain coup d’une autre de tes créatures fait +50 % et +2 Brisure, +3 aux jets de dés contre lui.');
    if (u.broken) s.push('Brisé : +50 % de dégâts subis, +5 aux jets.');
    if (u.defend) s.push('En défense : −50 % de dégâts.');
    if (u.guardBy) s.push('Protégé par un Rempart.');
    return s.join(' ');
  }
  function help() {
    openSheet(`<h2>Le combat</h2><ul class="small">
      <li><b>Chacun son tour</b> : toutes les créatures, les tiennes et les ennemies, jouent une fois par tour, dans l’ordre de leur vitesse. L’ordre s’affiche en haut de l’écran ; « T2 » marque le début du tour suivant. Quand c’est le tour d’une de tes créatures, ses actions s’ouvrent : choisis l’action, puis la cible. Raccourci : touche un ennemi pour l’attaquer.</li>
      <li><b>PA</b> (points d’action, ${PA_MAX} au plus) : chaque créature a les siens. Elle en gagne 1 au début de chacun de ses tours, 1 en attaquant, 1 en se défendant et 1 sur une parade parfaite. Ses compétences les dépensent : alterne attaques et compétences, et fais jouer toute ton équipe.</li>
      <li><b>Attaque</b> (gratuite, +1 PA) : dégâts fiables, +1 Ferveur. <b>Défense</b> (gratuite, +1 PA) : −50 % de dégâts jusqu’à son prochain tour. <b>Passer</b> : elle ne fait rien. <b>Permuter</b> (une fois par tour) : une créature de la réserve prend sa place et joue tout de suite ; PV, PA et états sont gardés, et la réserve récupère 10 % de PV par tour. En entrant, elle déclenche un petit effet lié à son rôle (bouclier, soin, Ferveur, ralentissement…).</li>
      <li><b>Brisure</b> : en visant une élite ou un gardien, la cible affiche la Brisure que ton coup va infliger (◆), et « BRISE ! » quand il va le briser. Un seul coup ne retire jamais plus de 40 % des PV d’un gardien.</li>
      <li><b>Ferveur</b> (${FERVOR_MAX} au plus, commune à l’équipe ; tu en gardes 3 au plus d’un combat à l’autre) : attaques, faiblesses, esquives (+1), parades parfaites (+2) et Brisures (+2) la remplissent. Pleine, elle lance le <b>pouvoir d’équipe</b> (${esc(ult.name)} : ${esc(ult.desc)}), pendant le tour d’une de tes créatures, sans le terminer.</li>
      <li><b>Voir une carte</b> : garde le doigt appuyé sur une carte (ennemie ou alliée) pour ouvrir sa fiche : PV, attaque, intention, passifs. Un toucher court sur un ennemi attaque toujours directement.</li>
      <li><b>Défense active</b> (toutes les attaques ennemies) : coup simple, touche dans l’or pour esquiver (ta créature est éraflée, +1 Ferveur), sur le trait blanc, au tout dernier instant, pour parer (aucun dégât, +1 PA, +2 Ferveur, Brisure, contre-attaque des Protecteurs et des Attaquants) ; coup chargé, il frappe plus fort mais se défend du même toucher ; enchaînement, le curseur repasse pour chaque coup (tout parer pour une parade parfaite, un raté sur trois coups = éraflé) ; feinte, le curseur s’arrête puis fonce. Chaque famille d’ennemis a son rythme. La grosse attaque de chaque gardien est un <b>Assaut</b> : une longue séquence, toujours la même pour lui.</li>
      <li><b>Dés</b> : Coup d’estoc, Contagion et Entrave lancent un D20 contre une difficulté (DD). 1 : échec critique ; sous le DD : réussite partielle ; DD atteint : réussite ; 20 : critique. Marque, gel, Brisure et faiblesse donnent des bonus.</li>
      <li><b>Chaîne</b> : chaque créature qui frappe un ennemi déjà touché ce tour-ci par une autre de tes créatures gagne +1 dégât (+2 au plus). Le « +1 » doré sur la cible l’annonce.</li>
      <li><b>Coup de grâce</b> : achever un ennemi donne +1 Ferveur.</li>
      <li><b>Fêlure et Brisure</b> (élites, gardiens) : jauge vide, l’ennemi est <b>Fêlé</b>. Un <b>coup de rupture</b> (attaque d’un Protecteur, Coup d’estoc, Raz-de-marée, ou coup qui consomme une Marque) le <b>brise</b> : son attaque annoncée est annulée, il perd sa prochaine action, subit +50 % de dégâts et +5 aux jets contre lui jusqu’à la fin du tour suivant. Sans rupture avant la fin du tour suivant, il se ressaisit (jauge à moitié).</li>
      <li><b>Marque</b> : le prochain coup d’une <b>autre</b> de tes créatures fait +50 % et +2 Brisure, puis elle part. Garde-la pour ton plus gros coup.</li>
      <li><b>Hâte</b> (Soutien, ${2} PA, une fois par tour) : une de tes créatures qui n’a pas encore joué joue juste après elle. <b>Retard</b> : une Entrave partielle fait reculer l’ennemi de 2 places dans l’ordre du tour (1 pour un gardien).</li>
      <li><b>Assaut conjoint</b> (3 Ferveur, une fois par combat) : sur un ennemi Fêlé, Brisé ou Marqué, ta créature et celle qui joue juste après frappent ensemble (×1,25 chacune), avec l’effet de leurs deux rôles. L’alliée appelée perd son tour à venir. C’est aussi un coup de rupture.</li>
      <li><b>Détonation</b> : un ennemi à 6 poisons ou plus explose sous un Raz-de-marée (poison × 1,5 de dégâts d’un coup).</li>
      <li><b>Runes du gardien</b> : trois runes le protègent (−10 % de dégâts chacune). Chacune cède à une action précise : touche la pastille des runes en haut pour les lire. Les trois brisées, il est Fêlé.</li>
      <li><b>Serviteurs</b> : chaque serviteur encore debout renforce la grosse attaque du gardien (+20 %, +40 % au plus). Les abattre d’abord l’affaiblit.</li>
      <li><b>Annonces</b> : les grosses attaques des gardiens et des élites s’affichent sur la frise, à côté de leur portrait. Brise-les avant qu’ils jouent pour les annuler.</li>
      <li><b>Riposte chargée</b> : chaque coup encaissé par un Protecteur charge sa riposte (3 au plus) : +1 dégât et +1 Brisure par charge à sa prochaine attaque. <b>Prière</b> : le soin en trop devient un bouclier.</li>
      <li><b>Faiblesses</b> : chaque faction en craint une autre (+50 % de dégâts) ; contre sa propre faction : −25 %. ★ sur une cible = faiblesse exploitée.</li>
      <li><b>Instinct de meute</b> : tes Communes font +${PACK_BONUS} dégât aux élites et aux gardiens.</li></ul>
      <h3>L’identité des créatures</h3><p class="small">Chaque créature a sa propre identité, qui se révèle en montant de niveau : sa <b>frappe</b> (niveau 1) remplace l’attaque de son rôle, puis viennent un <b>passif</b> (niveau 3), une <b>compétence propre</b> (niveau 6, la case violette à côté de la compétence dorée de son rôle), l’<b>Éveil</b> (niveau 9) et l’<b>Apogée</b> (niveau 10). Tout est détaillé sur la fiche de la carte.</p>
      <h3>Les rôles</h3>${Object.values(KITS).map((k) => `<p class="small">${roleIcon(k.kw)} <b>${esc(k.name)}</b> · <b>${esc(k.skill.name)}</b> (${k.skill.pa} PA) : ${esc(k.skill.desc)} <i>${esc(k.passive.name)} : ${esc(k.passive.desc)}</i></p>`).join('')}
      <h3>Les combinaisons</h3>${SYNERGIES.map((x) => `<p class="small"><b class="dv-syn-n">${esc(x.name)}</b> : ${esc(x.desc)}</p>`).join('')}
      <h3>Les ennemis</h3>${Object.values(AI_FAMILIES).map((f) => `<p class="small"><b>${esc(f.name)}</b> : ${esc(f.desc)} <span class="dc-good">${esc(f.counter)}</span></p>`).join('')}
      <h3>Les gardiens</h3>${Object.entries(BOSSES).map(([k, x]) => `<p class="small"><b>${esc(x.name)}</b> : ${esc(x.mechanic)}${g.s.bossesBeaten[k] ? ` <span class="dc-good">${esc(x.counter)}</span>` : ''}</p>`).join('')}
      <p class="small muted">Sous la moitié de leurs PV, les gardiens entrent en <b>Furie</b> (leur phase 2, écusson « Furie ») : plus forts, ils déclenchent leur mécanique de Furie (une fenêtre l’annonce), accélèrent leur grosse attaque et visent tes Soigneurs. Un gardien <b>déchaîné</b> est en Furie dès le premier tour. Dès le 15e tour, l’Épuisement blesse les deux camps.</p>`, { label: 'Règles du combat' });
  }

  draw();
  // passifs qui ont agi dès le début du combat (Égide, Augure, Engloutir, Éruption, Cataclysme) : on le dit une fois
  if (st.round === 1 && st.turn === 'ally' && !st.openShown) {
    st.openShown = true;
    const OPEN = ['egide', 'augure', 'engloutir', 'eruption', 'cataclysme'];
    const lines = front(st, 'ally').map((u) => { const ps = passivesOf(u).filter((p) => OPEN.includes(p)); return ps.length ? `<b>${esc(cat.get(u.id).name)}</b> : ${ps.map((p) => esc(PASSIVES[p].name)).join(', ')}` : ''; }).filter(Boolean);
    if (lines.length) setTimeout(() => toast(`Début du combat<br>${lines.join('<br>')}`, { icon: 'sparkle', ms: 4200 }), 600);
  }
  // combat repris pendant le tour ennemi (application fermée en plein tour)
  if (st.turn === 'ally' && !st.over && front(st, 'enemy').some((e) => e.trait) && !g.s.tips?.['cb-traits']) setTimeout(() => { if (alive_) tuto(app, 'cb-traits'); }, 900);
  if (st.over) finish();
  else {
    // l'ordre des tours peut commencer par les ennemis : ils jouent après le tutoriel éventuel
    busy = st.turn === 'enemy'; draw();
    (guide ? tuto(app, 'cb-intro') : Promise.resolve()).then(async () => {
      if (!alive_) return;
      if (st.turn === 'enemy' && !st.over) { busy = true; draw(); await foesPlay(); busy = false; draw(); if (st.over) return finish(); }
      draw(); if (!guide) tips();
    });
  }
  return { stop() { alive_ = false; perfStop(); ctl.abort(); dio.destroy(); document.body.classList.remove('battle-mode'); } };
}
