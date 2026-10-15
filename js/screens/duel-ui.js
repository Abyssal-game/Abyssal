// ABYSSAL : écran du combat tactique.
// Toucher une de tes créatures ouvre ses actions (Attaque, compétence, Défense, Permuter) ; on choisit
// ensuite la cible. Les compétences à risque montrent leurs chances et modificateurs avant le jet de D20.
// Tour ennemi : chaque ennemi exécute son intention ; les attaques dangereuses ouvrent la défense
// active (esquive dans l'or, parade parfaite sur le trait blanc, au dernier instant). Toute la logique est dans core/duel.js.
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil, roleIcon, actIcon, crestHTML } from '../ui/icons.js';
import { esc, openSheet, toast } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { cardHTML } from '../ui/card.js';
import {
  BOSS_POWERS, INTENTS, SYNERGIES, PACK_BONUS, FERVOR_MAX, AP_MAX, PA_MAX, passTurn, speedOf, front, reserve, actionsFor, actionTargets, act, preview,
  ENTRANCES, GOALS, goalState, RHYTHM, PHASE2, beginEnemyTurn, nextEnemy, enemyAct, endEnemyTurn, takeSkips, defenseWindow, threats, intentInfo, useUlt, ultReady, autoActs, comboOf,
} from '../core/duel.js';
import { KITS, AI_FAMILIES, DICE_TIERS, WEAK_TO, TALENTS } from '../core/skills.js';
import { BOSSES, LAWS, ASPECTS } from '../core/bosses.js';
import { PACTS } from '../core/pacts.js';
import { TRAITS } from '../core/descent.js';
import { RELICS } from '../core/relics.js';
import { ULTS } from '../core/army.js';
import { mountDiorama, roomFor } from '../ui/diorama.js';
import { moveIconUrl, passivesOf, passiveIconUrl, moveFor, PASSIVES } from '../core/kits.js';

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
const IN_PIC = { gorge: 'heavy', gather: 'channel', blizzard: 'frost', mimic: 'channel', copy: 'heavy', decree: 'rally', shift: 'charge' };
const intentIcon = (k) => `<img class="iicon" alt="" src="assets/icons/in-${IN_PIC[k] || k}.webp">`;

export function runDuel(app, root, { title, onEnd, onAbandon = null, run: runOpt = null, pause = 'Combat en pause : il t’attend dans la Descente.' }) {
  const g = app.game, cat = app.catalog, run = runOpt || g.descent().run, st = run.battle;
  const ui = (app.state.duel ||= { fast: 0 }); // v255 : plus de bouton ×2, vitesse unique
  const reduced = app.reduced();
  const T = (ms) => (reduced ? Math.min(ms, 80) : ui.fast === 3 ? ms * 0.25 : ui.fast ? ms * 0.45 : ms); // vitesse ×1, ×2 ou ×3
  const defMode = g.s.settings?.defense === 'auto' ? 'auto' : 'on'; // v269 : défense active manuelle, ou automatique (réglages)
  let alive_ = true, busy = false, sel = null, mode = null; // mode : action en attente de cible
  let holdT = null, held = false; // appui long sur une action : sa description (v249, plus de fenêtre de confirmation)
  const ctl = new AbortController();
  const ult = ULTS[st.ult];
  document.body.classList.add('battle-mode');

  FX.forEach((n) => { new Image().src = fxUrl(n); });
  // Décor de la salle : la peinture de l'étage, ou la salle propre au gardien
  const room = roomFor(floorBg(run.floor, run.room), st.bossKey);
  root.innerHTML = `<div class="dv cb ${run.room} has-bg" style="--bgimg:${room.paint ? `url(${abs(room.paint)})` : bgOf(run)}">
    <div class="dv-top"><b>${esc(title)}</b><span class="row gap">
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
  const dio = mountDiorama($('.dv'), { room, decor: g.s.settings?.decor || 'riche', reduced, aspect: st.aspect });
  const enEl = $('.dv-row.enemy'), alEl = $('.dv-row.ally'), msgEl = $('.dv-msg'), actsEl = $('.cb-acts');
  const say = (h) => { msgEl.innerHTML = h; };
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);

  // ——— Carte de combat ———
  let th = {}, tgtInfo = {}, lastGoal = null;
  // États : icônes peintes (le chiffre du poison et du bonus d'attaque en pastille)
  const st_ = (k, title, val = '') => `<i class="sti" title="${title}"><img alt="${title}" src="assets/icons/st-${k}.webp">${val !== '' ? `<b>${val}</b>` : ''}</i>`;
  const statusHTML = (u) => [
    u.broken ? st_('broken', 'Brisé : +50 % de dégâts subis, +5 aux jets') : '',
    u.cracked ? st_('broken', 'Fêlé : un coup de rupture le brise (attaque d’un Protecteur, Coup d’estoc, Raz-de-marée, ou coup qui consomme une Marque)') : '',
    u.riposte ? `<i class="bo cb-rip" title="Riposte chargée : sa prochaine attaque fait +${u.riposte} dégât(s) et +${u.riposte} Brisure">⚔${u.riposte}</i>` : '',
    u.shield ? st_('shield', 'Bouclier : bloque un coup') : '',
    u.ward ? st_('seal', `Sceau : absorbe encore ${u.ward} dégâts`, u.ward) : '',
    u.poison ? st_('poison', `Poison : ${u.poison} dégâts au début de son tour`, u.poison) : '',
    u.frozen || u.stunned ? st_('frost', 'Gelé : passe son tour') : '',
    u.slow ? st_('slow', 'Ralenti : prochaine attaque -50 %') : '',
    u.mark ? st_('mark', 'Marqué : le prochain coup d’une autre de tes créatures fait +50 % et +2 Brisure, puis la Marque part. +3 aux jets') : '',
    u.defend ? st_('defend', 'Défense : -50 % de dégâts') : '',
    u.guardBy ? st_('guard', 'Protégé par un Rempart') : '',
    u.exposed ? st_('exposed', 'Déséquilibrée : +25 % de dégâts subis') : '',
    u.trait && TRAITS[u.trait] ? st_(u.trait, `${TRAITS[u.trait].name} : ${TRAITS[u.trait].desc}`) : '',
    u.breach ? st_('breach', 'Brèche : le prochain coup d’un autre allié perce son bouclier, +20 % de dégâts, +3 Brisure') : '',
    u.open ? st_('open', 'Exposé : la prochaine attaque d’un autre allié fait +50 % de dégâts et +1 Ferveur') : '',
    u.boost ? `<i class="bo" title="Attaque renforcée pour ce tour">+${u.boost} ATQ</i>` : '',
    u.prey ? st_('prey', 'Proie désignée : tous les ennemis la visent (+20 % de dégâts)') : '',
    u.ice ? st_('ice', `Carapace de glace : absorbe ${u.ice} dégâts`, u.ice) : '',
    u.doom != null && !u.broken ? st_('doom', `Effondrement dans ${u.doom} tour(s) : brise-le pour le repousser`, u.doom) : '',
    u.mask ? st_('mask', `Il porte le visage ${cat.faction[u.mask]?.name || u.mask} : il résiste à cette faction (−50 %)`) : '',
    u.totality ? st_('totality', 'Totalité : seules ses faiblesses le blessent pleinement') : '',
    ...passivesOf(u).map((p) => (passiveIconUrl(p) ? `<i class="sti ckp" title="Passif : ${esc(PASSIVES[p].name)} · ${esc(PASSIVES[p].desc)}"><img alt="" src="${passiveIconUrl(p)}"></i>` : '')),
    u.talent && TALENTS[u.talent] ? `<i class="sti" title="Talent : ${esc(TALENTS[u.talent].name)} · ${esc(TALENTS[u.talent].desc)}"><img alt="" src="assets/icons/tal-${u.talent}.webp"></i>` : '',
  ].join('');
  const intentChip = (u) => {
    const i = intentInfo(st, u);
    if (!i || st.turn !== 'ally') return '';
    const named = ['hunt', 'charge', 'channel', 'shield', 'heal', 'rally', 'frost', 'gather', 'mimic', 'decree', 'shift'].includes(i.kind);
    const label = i.kind === 'mimic' ? `Copie : ${esc(i.copyName)}` : i.kind === 'decree' ? esc(LAWS[i.law]?.name || 'Décret') : i.kind === 'shift' ? esc(ASPECTS[i.aspect]?.name || 'Bascule')
      : named ? esc(i.def.name) : i.kind === 'copy' ? `${esc(i.copyName)}${i.dmg ? ` ${i.dmg}` : ''}` : `${i.dmg}${i.aoe ? ' ×3' : ''}`;
    const brk = u.brkMax && !u.broken && i.danger >= 2 ? `<small class="cb-ibrk" title="Brise-le pour annuler cette action">◆ ${u.brk}</small>` : '';
    const cd = ['charge', 'channel', 'gather', 'mimic'].includes(i.kind) ? '<em class="cb-icd" title="Frappe au prochain tour">⏳1</em>' : '';
    return `<span class="cb-int d${i.danger} k-${i.kind}" title="${esc(i.def.name)} : ${esc(i.def.desc)}">${intentIcon(i.kind)}<b>${label}</b>${i.danger >= 2 ? `<em>${DANGER[i.danger]}</em>` : ''}${cd}${brk}</span>`;
  };
  // v265 : la grosse attaque annoncée d'un gardien ou d'une élite, aussi sur sa carte
  const cardWarn = (u) => { const now = bigOf(u, false), nx = now ? null : bigOf(u, true), k = now || nx; if (!k) return ''; const real = PREP_IT[k] || k; return `<span class="cb-warn ${PREP_IT[k] || nx ? 'prep' : ''}" title="${esc(INTENTS[real].desc)}">${intentIcon(real)}<b>${esc(INTENTS[real].name)}</b><small>${now && !PREP_IT[now] ? 'à son tour' : 'au tour suivant'}</small></span>`; };
  const cardEl = (u) => {
    const c = cat.get(u.id), kit = KITS[u.role];
    const dead = u.hp <= 0, enemy = u.side === 'enemy';
    const ready = !enemy && st.turn === 'ally' && actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap');
    const tgt = tgtInfo[u.uid];
    return `<button class="dv-c ${u.side} ${enemy ? 'corrupt' : ''} ${dead ? 'dead' : ''} ${ready ? 'ready' : ''} ${!enemy && st.turn === 'ally' && !ready ? 'spent' : ''} ${sel === u.uid ? 'sel' : ''} ${u.boss ? 'boss' : ''} ${u.phase2 ? 'p2' : ''} ${u.defend ? 'def' : ''} ${u.broken ? 'broken' : ''} ${u.cracked ? 'fele' : ''} ${tgt ? 'target' : ''} ${u.brkMax ? 'has-brk' : ''} ${enemy && intentInfo(st, u) && st.turn === 'ally' ? 'has-int' : ''}" data-uid="${u.uid}" data-rar="${u.rarity}" style="--rc:${RARITY[u.rarity].color}" aria-label="${esc(c.name)}, ${Math.max(0, u.hp)} PV">
      <span class="dv-base" aria-hidden="true"></span>
      <span class="dv-art"><img alt="" src="${artUrl(c)}"></span>
      <span class="dv-kw ${enemy && u.fam ? 'fam' : ''}" title="${esc(enemy && u.fam ? AI_FAMILIES[u.fam].desc : kit.name)}">${roleIcon(kit.kw)}<em>${esc(enemy && u.fam ? AI_FAMILIES[u.fam].name : kit.name)}</em></span>
      ${u.boss ? `<span class="dv-boss"><img alt="" src="assets/icons/crest-boss.webp">${u.phase2 ? 'Furie' : 'Gardien'}</span>` : u.elite ? '<span class="dv-boss elite"><img alt="" src="assets/icons/crest-elite.webp">Élite</span>' : ''}
      <span class="dv-nm ${u.named ? 'named' : ''}">${esc(u.named ? u.title : c.name)}</span>
      ${u.brkMax ? `<span class="cb-brk ${u.broken || u.cracked ? 'is-broken' : ''} ${u.cracked ? 'is-fele' : ''}" title="Brisure">${u.broken ? '<img alt="" src="assets/icons/st-broken.webp"><b>BRISÉ</b>' : u.cracked ? '<b>FÊLÉ</b>' : `<i style="width:${(u.brk / u.brkMax) * 100}%"></i>`}</span>` : ''}
      <span class="dv-atk">${icon('swords')}<b>${u.atk + (u.boost || 0)}</b></span>
      <span class="dv-hp ${u.hp < u.maxHp ? 'hurt' : ''}">${icon('heart')}<b>${Math.max(0, u.hp)}</b></span>
            ${tgt ? `<span class="cb-tgt">${tgt}</span>` : ''}
      <span class="dv-st">${statusHTML(u)}</span>
      ${enemy && !dead ? cardWarn(u) : ''}
    </button>`;
  };
  const resHTML = (side) => {
    const r = reserve(st, side);
    if (!r.length) return '';
    if (side === 'enemy') return `<span class="dv-res" title="Réserve ennemie">+${r.length}</span>`;
    return `<span class="dv-resv cb-resv" aria-label="Réserve">${r.map((u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}" title="${esc(cat.get(u.id).name)} : ${u.hp}/${u.maxHp} PV">`).join('')}<small>Réserve</small></span>`;
  };

  // ——— Barre d'actions de la créature choisie ———
  function actsHTML() {
    const u = sel && st.units[sel];
    if (!u || st.turn !== 'ally' || busy) return '';
    const kit = KITS[u.role];
    const list = actionsFor(st, u.uid).filter((a) => a.key !== 'duo' || a.ok); // l'Assaut conjoint n'apparaît que lorsqu'il est possible
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
    else if (sel && actionsFor(st, sel)[0].ok) { t = actsEl.querySelector('[data-a="attack"]'); txt = `C’est au tour de ${esc(cat.get(st.units[sel].id).name)} : « ${esc(actionsFor(st, sel)[0].name)} » attaque et rapporte 1 PA`; }
    else { t = $('.dv-end'); txt = 'Rien à faire : touche « Passer »'; }
    if (t) { t.classList.add('guide'); say(`<b class="dc-good">${txt}</b>`); }
  }
  function endGuide() { if (!guide) return; guide = false; g.s.tips = { ...(g.s.tips || {}), 'cb-guide': Date.now() }; g.persist(); }

  // ——— Affichage ———
  function draw() {
    if (!alive_) return;
    // v262 : la créature dont c'est le tour est toujours celle qui est choisie
    if (st.init && st.turn === 'ally' && !st.over) sel = st.actor; else if (st.init) sel = null;
    th = threats(st);
    tgtInfo = {};
    const pk = mode ? mode.key : sel && st.turn === 'ally' && actionsFor(st, sel)[0]?.ok ? 'attack' : null;
    if (pk && sel && st.turn === 'ally') {
      for (const id of actionTargets(st, sel, pk)) {
        const p = preview(st, sel, pk, id);
        const cb = p.dmg && st.units[id].side === 'enemy' ? comboOf(st, st.units[sel], st.units[id]) : 0, cbTxt = cb ? ` <i class="cmb">+${cb}</i>` : '';
        const bk = p.breaks ? ' <i class="brk on">BRISE !</i>' : p.brk ? (p.cracks ? ' <i class="brk fl">FÊLE</i>' : ` <i class="brk">◆${p.brk}</i>`) : '';
        const tu = st.units[id], synOk = tu.side === 'enemy' && p.dmg && ((tu.breach && tu.breach.by !== sel) || (tu.mark && tu.markBy !== sel) || (tu.frozen > 0 && pk === 'estoc'));
        // v270 : une valeur et une seule mention, la plus importante (K.O. > Brise > Fêle > Marque/Synergie > Enchaînement > Brisure)
        const ko = !p.roll && p.dmg && p.dmg >= tu.hp && tu.side === 'enemy';
        const tag = ko ? '' : p.breaks || p.cracks ? bk : synOk ? ` <i class="cmb sy">${tu.mark && tu.markBy !== sel ? '+50 %' : 'Syn.'}</i>` : cb ? cbTxt : bk;
        tgtInfo[id] = (p.roll ? `${p.roll.chance}%` : p.dmg ? (ko ? '<b class="ko">K.O.</b>' : `-${p.dmg}${p.weak ? '★' : ''}`) : 'Cible') + tag;
      }
    }
    enEl.innerHTML = front(st, 'enemy').map(cardEl).join('') + resHTML('enemy');
    const gl = goalState(st);
    if (gl && gl.state === 'done' && lastGoal !== 'done' && lastGoal !== null) { app.sfx.achievement?.(); banner(`${icon('star')} Objectif réussi !`, 'good', 1100); }
    if (gl && gl.state === 'fail' && lastGoal === 'pending') toast(`Objectif « ${esc(gl.name)} » manqué.`, { icon: 'info' });
    lastGoal = gl ? gl.state : null;
    const rules = [gl ? `<span class="cb-law cb-goal s-${gl.state}" data-d="rule" data-k="goal"><img class="cb-gico" alt="" src="assets/icons/goal.webp">${gl.state === 'done' ? '✓ ' : gl.state === 'fail' ? '✗ ' : ''}<b>${esc(gl.name)}</b>${gl.p && gl.state === 'pending' ? ` <small>${gl.p}</small>` : ''}</span>` : '',
      st.pact && PACTS[st.pact] ? `<span class="cb-law" style="--pk:${PACTS[st.pact].color}" data-d="rule" data-k="pact">${icon('p:seal')}<b>${esc(PACTS[st.pact].name)}</b></span>` : '',
      st.law ? `<span class="cb-law" data-d="rule" data-k="law"><b>${esc(LAWS[st.law].name)}</b></span>` : '',
      st.aspect ? `<span class="cb-law" data-d="rule" data-k="aspect"><b>${esc(ASPECTS[st.aspect].name)}</b></span>` : '',
      (st.relics || []).length ? `<span class="cb-law" data-d="rule" data-k="relics">${icon('p:crown')}<b>${st.relics.length} relique${st.relics.length > 1 ? 's' : ''}</b></span>` : ''].join('');
    const rulesEl = $('.cb-rules'); if (rulesEl) { rulesEl.innerHTML = rules; rulesEl.hidden = !rules; }
    alEl.innerHTML = front(st, 'ally').map(cardEl).join('');
    const sw = st.swallowed && st.units[st.swallowed];
    $('.dv-resw').innerHTML = resHTML('ally') + (sw?.swallowed ? `<span class="cb-swal" title="Engloutie : brise le Dévoreur pour la libérer"><img alt="" src="${artUrl(cat.get(sw.id), { lite: true })}"><small>Engloutie · ${sw.hp} PV</small></span>` : '');
    const showActs = !!sel && st.turn === 'ally' && !busy && !st.over;
    actsEl.hidden = !showActs;
    actsEl.innerHTML = showActs ? actsHTML() : '';
    const pu = st.init ? st.units[st.actor] : null, paNow = st.init ? (st.turn === 'ally' && pu ? pu.pa || 0 : 0) : st.ap;
    $('.cb-pips').innerHTML = Array.from({ length: st.init ? PA_MAX : Math.max(AP_MAX, st.ap) }, (_, i) => `<i class="${i < paNow ? 'on' : ''}"></i>`).join('');
    $('.cb-gems').innerHTML = Array.from({ length: FERVOR_MAX }, (_, i) => `<i class="${i < st.fervor ? 'on' : ''}"></i>`).join('');
    const ready = ultReady(st);
    if (ready && !g.s.tips?.['cb-ult']) tuto(app, 'cb-ult');
    $('.cb-res').classList.toggle('ready', ready);
    $('.cb-ult small').textContent = st.ultUsed ? 'Utilisé' : ready ? '' : `${st.fervor}/${FERVOR_MAX}`;
    const canMore = (st.init || st.ap > 0) && front(st, 'ally').some((u) => actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap' && a.key !== 'defend'));
    $('.dv-end').classList.toggle('pulse', st.turn === 'ally' && !canMore && !busy);
    root.querySelectorAll('.dv-bar button').forEach((b) => { const off = busy || st.turn !== 'ally' || !!st.over; b.disabled = off; b.classList.toggle('off', off); });
    if (!busy && st.turn === 'ally' && !st.over) {
      if (mode) say(`<b>${esc(mode.name)}</b> · touche la cible <button class="cb-cancel" data-d="cancel">Annuler</button>`);
      else if (sel && st.init) say(''); // v270 : le panneau d'actions montre déjà qui joue et ses PA
      else if (sel) say(`Choisis une action · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe`);
      else say(canMore ? `Touche une créature · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe` : 'Touche <b>Passer</b>');
    } else if (st.turn === 'enemy' && !st.over) say('<b class="dc-bad">Tour des créatures corrompues</b>');
    guideStep();
    drawTimeline();
  }
  // Tracés rouges : d'un ennemi qui prépare un coup dangereux vers la créature qu'il vise (v253)
  // Ordre des tours (v258) : colonne de portraits en haut à gauche. Ton équipe joue ensemble, puis chaque ennemi à son tour.
  let tlSig = '', acting = null;
  // v265 : seules les grosses attaques des gardiens et des élites s'annoncent sur la frise (les coups ordinaires restent cachés)
  const BIG_IT = ['heavy', 'blast', 'gorge', 'blizzard', 'copy'], PREP_IT = { charge: 'heavy', channel: 'blast', gather: 'blizzard', mimic: 'copy' };
  const bigOf = (u, next) => {
    if (!(u.boss || u.elite) || u.hp <= 0) return null;
    const it = u.intent && !u.intent.cancelled ? u.intent.kind : null;
    if (!next) return it && (BIG_IT.includes(it) || PREP_IT[it]) ? it : null;
    return (u.charged && BIG_IT.includes(u.charged) ? u.charged : null) || (it && PREP_IT[it]) || null;
  };
  function drawTimeline() {
    const box = $('.cb-tl'); if (!box) return;
    if (st.over) { box.innerHTML = ''; return; }
    if (st.init) {
      // v262 : chaque créature a sa place dans l'ordre (vitesse) ; après le séparateur, le tour suivant
      const ok = (u) => u && u.hp > 0 && !u.swallowed && front(st, u.side).includes(u);
      const now = st.turn === 'enemy' ? [...(acting && !st.queue.includes(acting) ? [acting] : []), ...st.queue] : st.actor ? [st.actor] : [];
      const cur = [...now, ...st.init.slice((st.ip ?? -1) + 1)].map((id) => st.units[id]).filter(ok);
      const nxt = st.init.map((id) => st.units[id]).filter(ok);
      const list = [...cur.map((u) => ({ u, w: bigOf(u, false) })), { sep: st.round + 1 }, ...nxt.map((u) => ({ u, w: bigOf(u, true) }))].slice(0, 9); // v270 : frise horizontale
      const pic = (u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}">`;
      const sig = list.map((x) => x.sep ? `T${x.sep}` : x.u.uid).join(',');
      const moved = tlSig && tlSig.split(',')[0] !== sig.split(',')[0];
      tlSig = sig;
      box.innerHTML = list.map((x, i) => (x.sep ? `<span class="cb-tlsep" title="Tour suivant">T${x.sep}</span>`
        : `<span class="cb-tlr ${x.u.side === 'enemy' ? 'foe' : 'al'} ${i === 0 ? 'now' : ''} ${x.u.boss ? 'boss' : x.u.elite ? 'elite' : ''} ${x.w ? 'warn' : ''}" title="${esc(cat.get(x.u.id).name)}${x.w ? ` : ${esc(INTENTS[PREP_IT[x.w] || x.w].name)}` : ''}"><span class="cb-tlp">${pic(x.u)}</span>${x.w ? '<i class="cb-tlx">!</i>' : ''}</span>`)).join('');
      if (moved && !reduced) { box.classList.remove('shift'); void box.offsetWidth; box.classList.add('shift'); }
      return;
    }
    const allies = front(st, 'ally').filter((u) => u.hp > 0), foes = front(st, 'enemy').filter((u) => u.hp > 0);
    const team = { team: true, key: `T${st.round}` };
    const q = [...(acting && !st.queue.includes(acting) ? [acting] : []), ...st.queue];
    const enemyNow = st.turn === 'enemy' ? q.map((id) => st.units[id]).filter((u) => u && u.hp > 0 && foes.includes(u)) : [];
    const seq = st.turn === 'ally' ? [team, ...foes, { team: true, key: `T${st.round + 1}` }, ...foes] : [...enemyNow, { team: true, key: `T${st.round + 1}` }, ...foes, { team: true }];
    const list = seq.slice(0, 5);
    const pic = (u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}">`;
    const sig = list.map((x) => (x.team ? x.key : x.uid)).join(',');
    const moved = tlSig && tlSig.split(',')[0] !== sig.split(',')[0];
    tlSig = sig;
    box.innerHTML = list.map((x, i) => (x.team
      ? `<span class="cb-tlr team ${i === 0 ? 'now' : ''}" title="Ton équipe"><span class="cb-tlp">${allies.slice(0, 3).map(pic).join('')}</span></span>`
      : `<span class="cb-tlr foe ${i === 0 ? 'now' : ''} ${x.boss ? 'boss' : x.elite ? 'elite' : ''}" title="${esc(cat.get(x.id).name)}"><span class="cb-tlp">${pic(x)}</span></span>`)).join('');
    if (moved && !reduced) { box.classList.remove('shift'); void box.offsetWidth; box.classList.add('shift'); }
  }
  function drawAims() {
    root.querySelectorAll('.cb-aim').forEach((x) => x.remove());
    if (reduced || st.turn !== 'ally' || st.over || busy) return;
    const box = $('.dv'); if (!box) return;
    const r0 = box.getBoundingClientRect();
    for (const e of front(st, 'enemy')) {
      const i = intentInfo(st, e); if (!i || i.danger < 2 || !i.target) continue;
      const a = el(e.uid), b = el(i.target); if (!a || !b) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.left - r0.left + ra.width / 2, y1 = ra.bottom - r0.top - 8, x2 = rb.left - r0.left + rb.width / 2, y2 = rb.top - r0.top + 10;
      const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      const s = document.createElement('span'); s.className = `cb-aim d${i.danger}`;
      s.style.cssText = `left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${ang}deg)`;
      box.appendChild(s);
    }
  }

  // ——— Effets ———
  const shake = (big) => { if (reduced) return; const d = $('.dv'); d.classList.remove('shake', 'big'); void d.offsetWidth; d.classList.add('shake'); d.classList.toggle('big', !!big); };
  const sparks = (uid, cls = '') => {
    if (reduced) return;
    const t = el(uid); if (!t) return;
    const b = document.createElement('span'); b.className = `dv-burst ${cls}`;
    b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36 + Math.round(Math.random() * 20)}deg;--r:${30 + Math.round(Math.random() * 26)}px"></i>`).join('');
    t.appendChild(b); setTimeout(() => b.remove(), cls === 'ember' ? 1000 : 650);
  };
  const fxAt = (uid, name, { big = false, center = false } = {}) => {
    if (reduced) return;
    const box = $('.dv'); if (!box) return;
    const b = box.getBoundingClientRect();
    let x = b.width / 2, y = b.height / 2, size = b.width * 0.9;
    if (!center) { const t = el(uid); if (!t) return; const r = t.getBoundingClientRect(); x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; size = r.width * (big ? 1.9 : 1.45); }
    const im = document.createElement('img');
    im.className = `dv-fx fx-${name}${center ? ' center' : ''}`; im.alt = ''; im.src = fxUrl(name);
    im.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
    box.appendChild(im); setTimeout(() => im.remove(), center ? 1400 : 750);
  };
  // Caméra simulée : léger glissement vers un point de l'écran (jamais sur les commandes)
  const cam = (uid, k = 1) => {
    if (reduced) return;
    const d = $('.dv'), t = el(uid); if (!d || !t) return;
    const b = d.getBoundingClientRect(), r = t.getBoundingClientRect();
    d.style.setProperty('--cx', `${((r.left + r.width / 2 - b.left) / b.width - 0.5) * -10 * k}px`);
    d.style.setProperty('--cy', `${((r.top + r.height / 2 - b.top) / b.height - 0.5) * -10 * k}px`);
    d.classList.remove('cam'); void d.offsetWidth; d.classList.add('cam');
  };
  // Arrêt sur image : le coup « pèse » un instant
  const hitstop = async (ms) => { if (reduced) return; const d = $('.dv'); d?.classList.add('hitstop'); await wait(T(ms)); d?.classList.remove('hitstop'); };
  // Icône d'une combinaison réussie, qui jaillit de la carte
  // (posée sur le combat, pas dans la carte : la carte est redessinée pendant l'animation)
  const comboPop = (uid, key) => {
    const t = el(uid), box = $('.dv'); if (!t || !box) return;
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
  const ROLE_FX = { protecteur: 'role-shock', degats: 'role-claw', poison: 'role-venom', controle: 'role-frost', soin: 'role-shock', soutien: 'role-claw', zone: 'role-claw' };
  const fxSheet = (uid, name, { k = 1.6, d = 600, center = false, row = false } = {}) => {
    if (reduced) return;
    const box = $('.dv'); if (!box) return;
    const b = box.getBoundingClientRect(); let x = b.width / 2, y = b.height / 2, w = b.width * 0.9, h = w;
    if (row) { const r = $('.dv-row.enemy')?.getBoundingClientRect(); if (!r) return; x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; w = r.width * 1.1; h = r.height * 1.25; }
    else if (!center) { const t = el(uid), r = t ? t.getBoundingClientRect() : lastRect[uid]; if (!r) return; x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; w = h = r.width * k; }
    const n = document.createElement('span'); n.className = 'kx-sprite fxs';
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
    box.className = `cb-dice t-${e.tier}`;
    box.innerHTML = `<div class="cb-d20"><img class="cb-die" alt="" src="assets/fx/d20.webp"><b>?</b></div>
      <p class="cb-dline"></p><p class="cb-dtier"></p>`;
    $('.dv').appendChild(box);
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
  let lastAtk = null, fatalDone = false; // dernière créature alliée à avoir agi : gros plan du coup fatal sur le dernier ennemi
  const DICE_KEYS = ['estoc', 'contagion', 'entrave'];
  async function play(ev) {
    for (const e of ev) {
      if (!alive_) return;
      switch (e.t) {
        case 'act':
          lastAtk = st.units[e.u]?.side === 'ally' ? e.u : null;
          if (e.skill) {
            const own = moveFor(st.units[e.u], e.key);
            app.sfx.skill();
            banner(`${own ? `<img class="aicon" alt="" src="${moveIconUrl(own.icon)}">` : actIcon(KITS[st.units[e.u].role].skill.key, KITS[st.units[e.u].role].skill.icon)} ${esc(e.name)}`, own ? 'skill own' : 'skill', 700);
            await wait(T(360));
          }
          if (e.tgt && st.units[e.tgt]?.side === 'enemy' && DICE_KEYS.includes(e.key)) pendingLunge = { u: e.u, tgt: e.tgt };
          else if (e.tgt && st.units[e.tgt]?.side === 'enemy' && e.key !== 'marque' && e.key !== 'entrave') { lunge(e.u, e.tgt); cam(e.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          else if (e.key === 'marque' && e.tgt) { fxSheet(e.tgt, 'role-mark', { k: 1.7, d: 650 }); ring(e.tgt, 'mark'); await wait(T(420)); }
          break;
        case 'eact': {
          const def = INTENTS[e.kind];
          lastAtk = null;
          if (e.kind === 'heavy' || e.kind === 'blast') banner(`${intentIcon(e.kind)} ${esc(def.name)} !`, 'danger', 700);
          if (e.tgt && st.units[e.tgt]?.side === 'ally') { lunge(e.a, e.tgt); cam(e.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          else await wait(T(200));
          break;
        }
        case 'attack': break;
        case 'counter': lunge(e.a, e.u); float(e.a, 'Riposte !', 'syn'); await wait(T(260)); break;
        case 'dmg': {
          const t = el(e.u);
          if (t) { t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); const hp = t.querySelector('.dv-hp b'); if (hp) hp.textContent = Math.max(0, e.hp); t.querySelector('.dv-hp')?.classList.add('hurt'); }
          const crit = lastTier === 'crit', heavy = crit || e.d >= 8;
          lastTier = null;
          if (heavy) await hitstop(crit ? 140 : 70);
          const sU = e.src && st.units[e.src];
          if (sU?.side === 'ally' && ROLE_FX[sU.role] && !aoeHit) { fxSheet(e.u, ROLE_FX[sU.role], { k: heavy ? 2 : 1.7 }); if (crit) fxAt(e.u, 'crit', { big: true }); }
          else if (!aoeHit) fxAt(e.u, crit ? 'crit' : heavy ? 'impact' : 'slash', { big: heavy });
          if (crit) dio.flare();
          float(e.u, crit ? `CRITIQUE −${e.d}` : `-${e.d}`, crit ? 'dmg big crit' : heavy ? 'dmg big' : 'dmg'); (heavy ? app.sfx.smash : app.sfx.slash)(); sparks(e.u, crit ? 'gold' : ''); if (heavy || e.hp <= 0) shake(crit || e.d >= 12);
          await wait(T(heavy ? 300 : 220));
          break;
        }
        case 'heal': { app.sfx.heal(); fxSheet(e.u, 'role-heal', { k: 1.5, d: 700 }); float(e.u, `+${e.d}`, 'heal'); const hp = el(e.u)?.querySelector('.dv-hp b'); if (hp) hp.textContent = st.units[e.u].hp; await wait(T(200)); break; }
        case 'block': app.sfx.block(); ring(e.u, 'guard'); float(e.u, 'Bloqué', 'info'); sparks(e.u, 'blue'); await wait(T(240)); break;
        case 'dodge': {
          app.sfx.dodge();
          if (e.u) { fxAt(e.u, 'dodge', { big: true }); const t = el(e.u); if (t) { t.classList.remove('dodge'); void t.offsetWidth; t.classList.add('dodge'); } float(e.u, 'Esquive !', 'dodge'); }
          else banner('Esquive !', 'good', 600);
          await wait(T(320));
          break;
        }
        case 'parry': app.sfx.parry(); dio.flare(); await hitstop(120); if (e.u) { ring(e.u, 'parry'); fxAt(e.u, 'parry', { big: true }); sparks(e.u, 'gold'); cam(e.u, -0.8); } banner('Parade parfaite !', 'parry', 800); shake(false); await wait(T(420)); break;
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
          banner('BRISURE !', 'broken', 1000); fxAt(e.u, 'break', { big: true }); sparks(e.u, 'big'); shake(true); dio.brk();
          await wait(T(700)); d?.classList.remove('focus');
          break;
        }
        case 'cracked': {
          app.sfx.shatter?.(); draw(); el(e.u)?.classList.add('cracking'); ring(e.u, 'break'); banner('FÊLÉ !', 'broken', 900); float(e.u, 'Coup de rupture pour le briser', 'syn'); shake(false);
          await wait(T(600)); if (!g.s.tips?.['cb-break']) await tuto(app, 'cb-break');
          break;
        }
        case 'recover': app.sfx.recover?.(); float(e.u, 'Se relève', 'info'); await wait(T(260)); break;
        case 'roll': {
          await rollFx(e); lastTier = e.tier;
          const P = pendingLunge; pendingLunge = null;
          if (P && e.tier !== 'fumble') { lunge(P.u, P.tgt); cam(P.tgt, 0.6); await wait(T(LUNGE_HIT)); }
          break;
        }
        case 'boss': { if (e.s === 'Effondrement !') fxAt(null, 'collapse', { center: true }); app.sfx.boss(); dio.roar(); const t = el(e.u); if (t) { t.classList.remove('roar'); void t.offsetWidth; t.classList.add('roar'); } float(e.u, e.s, 'boss'); shake(true); await wait(T(650)); break; }
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
          app.sfx.death(); fxAt(e.a, 'swallow', { big: true }); float(e.a, 'Engloutie !', 'boss'); shake(true); await wait(T(800)); draw(); break;
        }
        case 'release': app.sfx.enter(); draw(); el(e.u)?.classList.add('enter'); ring(e.u, 'enter'); await wait(T(400)); break;
        case 'duo': {
          // Assaut conjoint : les deux créatures s'élancent l'une après l'autre
          app.sfx.synergy?.(); banner(`<small>${esc(cat.get(st.units[e.u].id).name)} + ${esc(cat.get(st.units[e.p].id).name)}</small>Assaut conjoint`, 'synergy', 1100);
          if (!reduced) { lunge(e.u, e.tgt); await wait(T(160)); lunge(e.p, e.tgt); cam(e.tgt, 0.8); }
          await wait(T(LUNGE_HIT + 120)); shake(true);
          if (!g.s.tips?.['cb-duo']) tuto(app, 'cb-duo');
          break;
        }
        case 'swap': app.sfx.enter(); draw(); el(e.u)?.classList.add('enter'); float(e.u, 'Entre en jeu', 'info'); await wait(T(340)); break;
        case 'aoe': if (e.side === 'enemy') shake(true); else if (st.units[e.u]?.side === 'ally') { fxSheet(null, 'role-wave', { row: true, d: 720 }); aoeHit = true; setTimeout(() => { aoeHit = false; }, T(900)); await wait(T(260)); } await wait(T(150)); break;
        case 'status':
          if (e.k === 'poison') { if (/\+|×/.test(e.s)) { app.sfx.poison(); fxAt(e.u, 'venom', { big: !!e.syn }); } }
          else if (e.k === 'frost' && /^Gel/.test(e.s) && !/passe/.test(e.s)) { app.sfx.freeze(); fxSheet(e.u, 'role-frost', { k: 1.7, d: 650 }); }
          else if (e.k === 'guard' && /^(Tous sur elle|Hurlement)/.test(e.s)) { app.sfx.taunt?.(); fxAt(e.u, 'taunt', { big: true }); ring(e.u, 'guard'); }
          else if (e.k === 'guard') { app.sfx.shield?.(); fxAt(e.u, 'shield'); ring(e.u, 'guard'); }
          else if (e.k === 'heal' && /^\+\d+ ATQ/.test(e.s)) { app.sfx.boost?.(); fxAt(e.u, 'boost'); }
          else if (e.k === 'mark') { app.sfx.mark?.(); fxAt(e.u, /Maudite/.test(e.s) ? 'curse' : 'seal'); ring(e.u, 'mark'); }
          if (/vole en éclats/.test(e.s)) { app.sfx.shatter(); fxAt(e.u, 'iceshatter', { big: true }); }
          if (e.s === 'Proie désignée') fxAt(e.u, 'prey', { big: true });
          else if (e.syn) app.sfx.skill();
          if (e.k === 'entrance') ring(e.u, 'enter');
          if (e.trait === 'explosif') { fxSheet(e.u, 'fx-explode', { k: 2.6, d: 760 }); app.sfx.explode?.(); shake(true); banner(`<img class="cb-trico" alt="" src="assets/icons/st-explosif.webp"> Explosion !`, 'danger', 800); }
          else if (e.trait) { if (e.trait === 'enrage') fxSheet(e.u, 'fx-enrage', { k: 1.9, d: 820 }); (e.trait === 'enrage' ? app.sfx.enrage : app.sfx.boss)?.(); banner(`<img class="cb-trico" alt="" src="assets/icons/st-${e.trait}.webp"> ${esc(e.s)}`, 'danger', 800); }
          if (e.combo && e.by && e.a && e.by !== e.a && st.units[e.by]?.side === 'ally') { synergy(e.by, e.a, e.s); await wait(T(380)); if (!g.s.tips?.['cb-combo']) tuto(app, 'cb-combo'); }
          if (e.combo) comboPop(e.u, e.combo);
          float(e.u, e.s, e.syn ? 'syn' : e.k === 'bad' ? 'dmg' : 'info');
          draw();
          await wait(T(e.syn ? 480 : 260));
          break;
        case 'combo': comboPop(e.u, 'chain'); float(e.u, `Chaîne ×${e.n}`, 'combo'); app.sfx.chain?.(); await wait(T(260)); if (!g.s.tips?.['cb-combo']) tuto(app, 'cb-combo'); break;
        case 'finisher': { if (st.over === 'won') break; if (!reduced) { const d = $('.dv'); d.classList.add('slowmo'); setTimeout(() => d.classList.remove('slowmo'), 700); } banner('Coup de grâce !', 'finisher', 800); app.sfx.finisher?.(); await wait(T(380)); break; }
        case 'die': {
          const u = st.units[e.u];
          if (u?.boss) {
            // mort d'un gardien : ralenti, le décor réagit, il se dissipe en cendres
            const d = $('.dv'); if (!reduced) d?.classList.add('slowmo', 'bossfall');
            dio.fallen();
            app.sfx.boss(); await hitstop(220); app.sfx.death();
            fxAt(e.u, 'death', { big: true }); sparks(e.u, 'big'); el(e.u)?.classList.add('dying', 'ashes'); shake(true);
            banner(`${esc(cat.get(u.id).name)} est vaincu`, 'finisher', 1300);
            await wait(T(1100)); d?.classList.remove('slowmo', 'bossfall'); draw(); break;
          }
          // coup fatal : le dernier ennemi tombe sous un coup allié → gros plan, une fois par combat
          if (u?.side === 'enemy' && st.over === 'won' && lastAtk && !fatalDone) { fatalDone = true; await closeup(lastAtk, e.u, 'Coup fatal', { crit: true, sub: '' }); }
          // ennemi K.O. : fissures et flash, la carte vole en éclats, les braises montent (planches Gemini, v256)
          if (u?.side === 'enemy' && await shatterFx(e.u)) { draw(); break; }
          // la carte blanchit, se fissure, puis part en cendres (braises qui montent)
          app.sfx.death(); fxAt(e.u, 'death', { big: true }); sparks(e.u, 'ember'); el(e.u)?.classList.add('dying', 'cracking'); await wait(T(640)); draw(); break;
        }
        case 'enter': draw(); el(e.u)?.classList.add('enter'); await wait(T(340)); break;
        case 'revive': draw(); float(e.u, 'Relevée !', 'heal'); await wait(T(280)); break;
        case 'actor': draw(); if (!reduced) { const t = el(e.u); t?.classList.remove('myturn'); void t?.offsetWidth; t?.classList.add('myturn'); } app.sfx.actor?.(); await wait(T(260)); break;
        case 'pa': { const t = el(e.u); if (t && st.units[e.u]?.side === 'ally') { float(e.u, `+${e.d} PA`, 'pa'); app.sfx.pa?.(); } break; }
        case 'phase': draw(); say(e.side === 'enemy' ? '<b class="dc-bad">Tour des créatures corrompues</b>' : 'À toi !'); turnBanner(e.side); await wait(T(e.side === 'enemy' ? 520 : 420)); break;
        case 'ult': if (st.ult === 'sceau') dio.seal(); else dio.ult(); await ultFx(); break;
        case 'law': if (e.aspect) dio.aspect(e.aspect); draw(); banner(e.fatigue ? `${icon('skull')} Épuisement : chaque tour blesse tout le monde` : e.law ? esc(LAWS[e.law].name) : esc(ASPECTS[e.aspect].name), e.fatigue ? 'danger' : 'skill', 1300); await wait(T(e.fatigue ? 900 : 700)); break;
        default: break;
      }
    }
    draw();
  }
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
    b.innerHTML = `${st.bossKey ? `<img class="cb-phimg" alt="" src="assets/ui/ph-${st.bossKey}.webp">` : ''}<b>${esc(P.name)}</b><p>${esc(P.desc)}</p><small>Touche pour continuer</small>`;
    $('.dv').appendChild(b);
    await new Promise((res) => { const go = () => { b.remove(); res(); }; b.addEventListener('pointerdown', go, { once: true }); setTimeout(go, reduced ? 2500 : 6000); });
  }
  async function ultFx() {
    const c = run.ult.card ? cat.get(run.ult.card) : null;
    const fx = document.createElement('div');
    fx.className = 'tb-summon'; fx.style.setProperty('--ic', ult.color);
    fx.innerHTML = `${c ? `<img alt="" src="${artUrl(c)}">` : `<span class="tb-sceau">${EMBLEM}</span>`}<b>${esc(ult.name)}</b>`;
    $('.dv').appendChild(fx);
    $('.dv').style.setProperty('--uc', ult.color);
    $('.dv').classList.add('ultflash'); fxSheet(null, 'ult-seal', { center: true, d: 1100 }); setTimeout(() => $('.dv')?.classList.remove('ultflash'), 900);
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
    if (alive_) { alive_ = false; ctl.abort(); dio.destroy(); document.body.classList.remove('battle-mode'); onEnd(); }
  }

  // ——— Défense active ———
  // Un curseur traverse la barre en accélérant. Toucher dans l'or : esquive. Sur le trait blanc, au tout dernier instant : parade parfaite.
  let defTap = null;
  // ——— Attaque rythmée : un anneau se resserre sur le cercle de runes ; toucher au bon moment donne un bonus au jet ———
  function rhythmQTE(name, uid) {
    return new Promise((resolve) => {
      const D = 1250, from = 2.4, to = 0.4; // durée et échelle de l'anneau (1 = posé sur la cible dorée)
      const ov = document.createElement('div');
      ov.className = 'ry';
      const cu = uid && st.units[uid] ? cat.get(st.units[uid].id) : null;
      ov.innerHTML = `<div class="ry-c"><span class="ry-glow"></span><span class="ry-in">${cu ? `<img alt="" src="${artUrl(cu, { lite: true })}">` : ''}<i class="ry-med"></i></span><span class="ry-tgt"></span><span class="ry-out"></span><b class="ry-res"></b></div>
        <p class="ry-t"><b>${esc(name)}</b><small>Touche quand l’anneau blanc rejoint le cercle d’or</small></p>`;
      $('.dv').appendChild(ov);
      const out = ov.querySelector('.ry-out'), res = ov.querySelector('.ry-res');
      let t0 = 0, done = false, raf = 0;
      const scaleAt = (x) => from + (to - from) * Math.min(1, x); // vitesse constante : le moment se lit à l'œil
      const end = (s) => {
        if (done) return; done = true; cancelAnimationFrame(raf); defTap = null;
        const gap = s === null ? 9 : Math.abs(s - 1);
        const bonus = gap <= 0.1 ? RHYTHM.perfect : gap <= 0.28 ? RHYTHM.good : 0;
        ov.classList.add(bonus === RHYTHM.perfect ? 'perfect' : bonus ? 'good' : 'miss');
        res.textContent = bonus === RHYTHM.perfect ? `Parfait ! +${bonus}` : bonus ? `Bien ! +${bonus}` : s === null ? 'Trop tard' : 'Raté';
        if (bonus === RHYTHM.perfect) { app.sfx.perfect(); if (!reduced) { const d = $('.dv'); d.classList.remove('ry-shake'); void d.offsetWidth; d.classList.add('ry-shake'); } }
        else if (bonus) app.sfx.hit(); else app.sfx.miss();
        setTimeout(() => { ov.classList.add('out'); setTimeout(() => { ov.remove(); resolve(bonus); }, 220); }, bonus === RHYTHM.perfect ? 650 : 480);
      };
      const step = () => {
        const x = (performance.now() - t0) / D, s = scaleAt(x);
        out.style.transform = `translate(-50%, -50%) scale(${s})`;
        const near = Math.abs(s - 1) <= 0.28; out.classList.toggle('near', near); ov.classList.toggle('near', near);
        if (x >= 1) end(null); else raf = requestAnimationFrame(step);
      };
      defTap = () => { if (!t0) return; end(scaleAt((performance.now() - t0) / D)); };
      app.sfx.swipe?.();
      setTimeout(() => { if (!done && alive_) { t0 = performance.now(); raf = requestAnimationFrame(step); } }, reduced ? 200 : 380);
    });
  }
  function defenseQTE(s) {
    return new Promise((resolve) => {
      const e = st.units[s.a], moving = e?.boss || e?.elite;
      const w = defenseWindow(st, s.a, s.t), ease = (x) => x ** 1.7, D = 900;
      const k = defMode === 'easy' ? 1.6 : 1;
      const width = (ms) => Math.max(0.03, ease(Math.min(1, 0.75 + (ms * k) / D)) - ease(0.75));
      const zw = width(w.dodge), pw = Math.min(zw, width(w.parry));
      const z0 = 0.35 + Math.random() * (0.6 - zw);
      const tEls = s.kind === 'blast' ? front(st, 'ally').map((u) => el(u.uid)) : [el(s.t)];
      el(s.a)?.classList.add('aim'); tEls.forEach((x) => x?.classList.add('aimed'));
      const def = INTENTS[s.kind];
      const bar = document.createElement('div');
      bar.className = 'dv-dodge cb-def';
      bar.innerHTML = `<span class="dv-dodge-t">${intentIcon(s.kind)} ${esc(def.name)} ! <small>Zone dorée : esquive · trait blanc, au dernier instant : parade</small></span><span class="dv-dodge-bar"><i class="rail"></i><i class="z"><i class="p"></i></i><i class="c"></i></span>`;
      $('.dv-mid').appendChild(bar); $('.dv-mid').classList.add('qte'); $('.dv')?.classList.add('qte-on');
      const cur = bar.querySelector('.c'), zEl = bar.querySelector('.z'), pEl = bar.querySelector('.p');
      zEl.style.cssText = `left:${z0 * 100}%;width:${zw * 100}%`;
      pEl.style.cssText = `left:${((zw - pw) / zw) * 100}%;width:${(pw / zw) * 100}%`;
      let t0 = 0, done = false, raf = 0;
      const zoneAt = (x) => (moving ? Math.min(0.97 - zw, Math.max(0.3, z0 + Math.sin(x * 9) * 0.1)) : z0);
      const end = (res) => {
        if (done) return; done = true; cancelAnimationFrame(raf); defTap = null;
        bar.classList.add(res === 'none' ? 'ko' : 'ok', `r-${res}`);
        bar.querySelector('.dv-dodge-t').textContent = res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Raté…';
        $('.dv')?.classList.remove('qte-on');
        // tampon du résultat, au centre de l'écran
        const stamp = document.createElement('div'); stamp.className = `dv-stamp s-${res}`;
        stamp.innerHTML = `<b>${res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Touché…'}</b>`;
        $('.dv')?.appendChild(stamp); setTimeout(() => stamp.remove(), 900);
        if (res === 'none') app.sfx.miss();
        setTimeout(() => { bar.remove(); $('.dv-mid')?.classList.remove('qte'); el(s.a)?.classList.remove('aim'); tEls.forEach((x) => x?.classList.remove('aimed')); resolve(res); }, res === 'none' ? 200 : 300);
      };
      const step = () => {
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x));
        cur.style.left = `${pos * 100}%`;
        if (moving) zEl.style.left = `${zoneAt(x) * 100}%`;
        if (x >= 1) end('none'); else raf = requestAnimationFrame(step);
      };
      defTap = () => {
        if (!t0) return end('none'); // trop tôt
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x)), zz = zoneAt(x);
        const pz = zz + zw - pw; // la parade : le tout dernier instant de la zone, juste avant l'impact
        end(pos >= pz && pos <= pz + pw ? 'parry' : pos >= zz && pos <= zz + zw ? 'dodge' : 'none');
      };
      setTimeout(() => { if (!done && alive_) { t0 = performance.now(); raf = requestAnimationFrame(step); } }, (reduced ? 250 : 300) + Math.random() * 450);
    });
  }
  // Résumé du tour ennemi : une ligne par ennemi, affichée au début de ton tour
  let log = null;
  const nm = (uid) => { const u = st.units[uid]; return u ? esc(cat.get(u.id).name) : ''; };
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
    if (st.over || !alive_) return;
    const html = rows.slice(-5).map((r) => `<li>${r.a ? `<b>${nm(r.a)}</b> <i>${esc(r.k)}</i>` : '<b>Fin du tour</b>'}${r.parts.length ? ` · ${r.parts.slice(0, 4).join(', ')}` : ''}</li>`).join('');
    const box = document.createElement('button');
    box.className = 'cb-recap';
    box.setAttribute('aria-label', 'Résumé du tour ennemi, touche pour fermer');
    box.innerHTML = `<span class="cb-recap-h">Tour ennemi <small>touche pour fermer</small></span><ul>${html}</ul>`;
    box.addEventListener('click', (ev) => { ev.stopPropagation(); box.remove(); });
    $('.dv').appendChild(box);
    // le premier toucher n'importe où ferme le résumé (et agit normalement)
    setTimeout(() => $('.dv')?.addEventListener('pointerdown', () => box.remove(), { once: true, capture: true }), 50);
  }
  async function enemyTurn() {
    log ||= [];
    for (let s = nextEnemy(st); s && alive_; s = nextEnemy(st)) {
      const skips = takeSkips(st);
      logEvents(skips);
      if (skips.length) await play(skips);
      let res = 'none';
      if (s.qte && defMode === 'auto') res = Math.random() < 0.4 ? 'dodge' : 'none'; // automatique : 40 % d'esquives, jamais de parade
      else if (s.qte && defMode !== 'off') {
        if (!g.s.tips?.['cb-defense']) await tuto(app, 'cb-defense');
        if (!alive_) return;
        res = await defenseQTE(s);
      }
      if (!alive_) return;
      acting = s.a; drawTimeline();
      const ev = enemyAct(st, s.a, res); g.persist();
      logEvents(ev);
      lastDef = res; // pas de gros plan d'impact si le coup est esquivé ou paré
      await play(ev);
      lastDef = 'none'; acting = null;
    }
    if (!alive_) return;
    const ev = endEnemyTurn(st); g.persist();
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
    const ev = beginEnemyTurn(st); g.persist(); // en ordre d'initiative : « Passer »
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
    if (st.goal) await tuto(app, 'cb-goal');
    if (foes.some((e) => e.trait)) await tuto(app, 'cb-traits');
    if (foes.some((e) => e.brkMax)) await tuto(app, 'cb-break');
    if (st.fervor >= 1 && g.s.tips?.['cb-guide']) await tuto(app, 'cb-skill');
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
    if (a.target === 'none') { mode = null; return exec(() => act(st, u, key)); }
    const ts = actionTargets(st, u, key);
    if (key === 'swap') { if (ts.length === 1) { mode = null; return exec(() => act(st, u, 'swap', ts[0])); } return pickReserve(); }
    if (a.dice && !g.s.tips?.['cb-dice']) await tuto(app, 'cb-dice');
    if (ts.length === 1 && (key === 'rempart' || key === 'priere')) { mode = null; return exec(() => act(st, u, key, ts[0])); }
    mode = { key, name: a.name, dice: !!a.dice };
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
      else if (t?.side === 'enemy' && key !== 'priere' && key !== 'rempart') toast('Une créature avec <b>Garde</b> protège les autres : vise-la d’abord.', { icon: 'shield' });
      return;
    }
    const a = actionsFor(st, sel).find((x) => x.key === key);
    const u = sel; mode = null;
    if (a.dice) { // compétence à dé : la frappe rythmée part tout de suite, puis le jet
      busy = true; app.sfx.tap(); draw();
      st.rhythm = await rhythmQTE(a.name, u);
      if (!alive_) return;
    }
    return exec(() => act(st, u, key, uid));
  }
  async function pickReserve() {
    if (!g.s.tips?.['cb-entrance']) await tuto(app, 'cb-entrance');
    const r = reserve(st, 'ally'), su = st.units[sel];
    const sh = openSheet(`<h2>Qui entre en jeu ?</h2><p class="small muted">À la place de <b>${esc(cat.get(su.id).name)}</b>. ${st.init ? `Gratuit : elle prend sa place dans l’ordre des tours et joue tout de suite${st.freeSwap ? ' (Relais d’ombre : +2 PA)' : ''}` : `Coût : ${st.freeSwap ? 'gratuit (Relais d’ombre)' : '1 action'}. Elle peut agir ce tour-ci`} ; PV, PA et états sont conservés.</p>
      <div class="dv-pick">${r.map((x) => `<button class="dv-pick-c" data-in="${x.uid}"><img alt="" src="${artUrl(cat.get(x.id), { lite: true })}"><b>${esc(cat.get(x.id).name)}</b><span>${esc(KITS[x.role].name)} · ${icon('swords')}${x.atk} · ${icon('heart')}${x.hp}/${x.maxHp}</span>${ENTRANCES[x.role] ? `<small class="dv-pick-e"><b>${esc(ENTRANCES[x.role].name)}</b> : ${esc(ENTRANCES[x.role].desc)}</small>` : ''}</button>`).join('')}</div>`, { label: 'Permuter' });
    sh.body.addEventListener('click', (ev) => { const p = ev.target.closest('[data-in]'); if (p) { sh.close(); const u = sel; mode = null; exec(() => act(st, u, 'swap', p.dataset.in)); } });
  }

  // Règles en vigueur : pacte, loi de l'Architecte, aspect de l'Éclipse, reliques
  function ruleSheet(k) {
    let h = '';
    if (k === 'goal') { const gl = goalState(st); if (gl) h = `<h2>Objectif : ${esc(gl.name)}</h2><p>${esc(gl.desc)}</p><p class="small muted">Facultatif. Réussi et combat gagné : des éclats en plus et 1 Ferveur pour la suite de l’expédition.</p><p><b>${gl.state === 'done' ? 'Réussi !' : gl.state === 'fail' ? 'Manqué pour ce combat.' : `En cours${gl.p ? ` (${gl.p})` : ''}.`}</b></p>`; }
    else if (k === 'pact' && PACTS[st.pact]) h = `<h2>${esc(PACTS[st.pact].name)}</h2><p><b class="dc-good">Gain</b> : ${esc(PACTS[st.pact].gain)}</p><p><b class="dc-bad">Prix</b> : ${esc(PACTS[st.pact].cost)}</p>`;
    else if (k === 'law' && LAWS[st.law]) h = `<h2>${esc(LAWS[st.law].name)}</h2><p>${esc(LAWS[st.law].desc)}</p><p class="small muted">L’Architecte change de Loi tous les deux tours ; la prochaine est annoncée sur sa carte.</p>`;
    else if (k === 'aspect' && ASPECTS[st.aspect]) { const A = ASPECTS[st.aspect]; h = `<h2>${esc(A.name)}</h2><p>Faible face à <b>${A.weak.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}</b> (+60 %), résiste à <b>${A.resist.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}</b> (−50 %).</p>`; }
    else if (k === 'relics') h = `<h2>Tes reliques</h2>${(st.relics || []).map((r) => `<p class="small"><b>${esc(RELICS[r].name)}</b> : ${esc(RELICS[r].gain)} <span class="dc-bad">${esc(RELICS[r].cost)}</span></p>`).join('')}`;
    if (h) openSheet(`<div class="cb-rulesheet">${h}</div>`, { label: 'Règle en vigueur' });
  }
  // ——— Touchers ———
  root.addEventListener('pointerdown', (e) => { if (defTap && !e.target.closest('[data-d="quit"],[data-d="help"]')) { e.preventDefault(); defTap(); } }, { signal: ctl.signal });
  root.addEventListener('pointerdown', (e) => { const ab = e.target.closest('[data-a]'); clearTimeout(holdT); held = false; if (!ab || busy || !sel) return; holdT = setTimeout(() => { held = true; actInfo(ab.dataset.a); }, 420); }, { signal: ctl.signal });
  for (const t of ['pointerup', 'pointercancel']) root.addEventListener(t, () => clearTimeout(holdT), { signal: ctl.signal });
  root.addEventListener('pointermove', (e) => { if (holdT && e.target.closest('[data-a]') == null) clearTimeout(holdT); }, { signal: ctl.signal });
  root.addEventListener('click', async (e) => {
    if (!alive_) return;
    const b = e.target.closest('[data-d]');
    if (b) {
      const k = b.dataset.d;
      if (k === 'quit') {
        if (!onAbandon) { toast(pause, { icon: 'swords' }); app.go(''); return; }
        const sh = openSheet(`<div class="cb-pause"><h2>${icon('swords')} Pause</h2>
          <button class="btn primary block" data-p="pause">Mettre en pause</button><p class="small muted">Le combat t’attend dans la Descente, exactement là où tu l’as laissé.</p>
          <button class="btn ghost block cb-abandon" data-p="abandon">${icon('p:abandon')}Abandonner l’expédition</button><p class="small muted">Compte comme une défaite.</p>
          <button class="btn ghost block" data-p="back">Reprendre le combat</button></div>`, { label: 'Pause' });
        sh.body.addEventListener('click', (ev) => {
          const p = ev.target.closest('[data-p]')?.dataset.p;
          if (!p) return;
          sh.close();
          if (p === 'pause') { toast(pause, { icon: 'swords' }); app.go(''); }
          if (p === 'abandon') onAbandon();
        });
        return;
      }
      if (k === 'help') return help();
      if (k === 'rule') return ruleSheet(b.dataset.k);
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
    if (sel && actionsFor(st, sel)[0].ok && actionTargets(st, sel, 'attack').includes(u.uid)) { const a = sel; return exec(() => act(st, a, 'attack', u.uid)); }
    info(u);
  }, { signal: ctl.signal });

  // ——— Pouvoir d'équipe : explication avant, récapitulatif après ———
  const ULT_HOW = {
    sceau: 'Chacune de tes créatures au combat récupère 30 % de ses PV et reçoit un bouclier qui absorbe des dégâts jusqu’à la moitié de ses PV max.',
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
    const ev = useUlt(st); g.persist();
    await play(ev);
    const healed = ev.filter((x) => x.t === 'heal').reduce((a, x) => a + x.d, 0);
    const dmg = ev.filter((x) => x.t === 'dmg').reduce((a, x) => a + x.d, 0);
    const revived = ev.filter((x) => x.t === 'revive').length;
    const parts = [revived && `${revived} créature${revived > 1 ? 's' : ''} relevée${revived > 1 ? 's' : ''}`, healed && `+${healed} PV rendus`, dmg && `${dmg} dégâts infligés`, ['sceau', 'aegis'].includes(st.ult) && 'boucliers sur tes créatures', st.ult === 'aegis' && (st.init ? '+2 PA chacune' : '+2 actions')].filter(Boolean);
    toast(`<b>${esc(ult.name)}</b> : ${parts.join(' · ') || 'aucun effet'}`, { icon: 'sparkle', kind: 'success' });
    busy = false; draw();
    if (st.over) finish();
  }

  // ——— Fiches ———
  function info(u) {
    const c = cat.get(u.id), kit = KITS[u.role];
    const i = u.side === 'enemy' ? intentInfo(st, u) : null;
    const fam = u.fam ? AI_FAMILIES[u.fam] : null;
    const weakF = u.side === 'enemy' && (st.discovered[u.faction] || u.mark) ? WEAK_TO[u.faction] : null;
    const tgtName = i?.target && st.units[i.target]?.side === 'ally' ? cat.get(st.units[i.target].id).name : '';
    openSheet(`<div class="tb-info"><div class="tb-info-card ${u.side === 'enemy' ? 'corrupt' : ''}">${cardHTML(c, { size: 'full', nameKnown: true })}</div>
      <h3>${esc(c.name)}${u.side === 'enemy' ? ' corrompu' : ''}</h3>
      <dl class="facts"><div><dt>Attaque</dt><dd>${u.atk + (u.boost || 0)}</dd></div><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div><div><dt>Niveau</dt><dd>${u.level || 1}</dd></div>${st.init ? `<div><dt>Vitesse</dt><dd>${speedOf(u)}</dd></div>` : ''}${st.init && u.side === 'ally' ? `<div><dt>PA</dt><dd>${u.pa || 0} / ${PA_MAX}</dd></div>` : ''}${u.brkMax ? `<div><dt>Brisure</dt><dd>${u.broken ? 'Brisé' : `${u.brk} / ${u.brkMax}`}</dd></div>` : ''}</dl>
      ${u.side === 'enemy' && (bigOf(u, false) || bigOf(u, true)) ? `<p class="small dc-bad"><b>Annonce</b> : ${esc(bigOf(u, false) ? (PREP_IT[bigOf(u, false)] ? `il prépare ${INTENTS[PREP_IT[bigOf(u, false)]].name} pour le tour suivant` : `${INTENTS[bigOf(u, false)].name} à son prochain tour`) : `${INTENTS[bigOf(u, true)].name} au tour suivant`)}. ${esc(INTENTS[PREP_IT[bigOf(u, false)] || bigOf(u, false) || bigOf(u, true)].desc)} Brise-le pour l’annuler.</p>` : ''}
      ${u.trait && TRAITS[u.trait] ? `<p class="small dc-bad cb-trait"><img class="cb-trico" alt="" src="assets/icons/st-${u.trait}.webp"><b>${esc(TRAITS[u.trait].name)}</b> : ${esc(TRAITS[u.trait].desc)}</p>` : ''}
      ${fam ? `<p class="small"><b>${esc(fam.name)}</b> : ${esc(fam.desc)} <span class="dc-good">${esc(fam.counter)}</span></p>` : ''}
      ${u.boss && st.bossKey ? `<p class="small dc-bad"><b>${esc(BOSSES[st.bossKey].name)}</b> : ${esc(BOSSES[st.bossKey].mechanic)} Sous la moitié de ses PV, il entre en phase 2 et accélère.</p>${g.s.bossesBeaten[st.bossKey] ? `<p class="small dc-good"><b>Pour le contrer</b> : ${esc(BOSSES[st.bossKey].counter)}</p>` : ''}${u.aspect ? `<p class="small"><b>${esc(ASPECTS[u.aspect].name)}</b> : faible face à ${ASPECTS[u.aspect].weak.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}, résiste à ${ASPECTS[u.aspect].resist.map((f) => esc(cat.faction[f]?.name || f)).join(' et ')}.</p>` : ''}` : ''}
      ${u.boss && st.bossPower && !st.bossKey ? `<p class="small dc-bad"><b>${esc(BOSS_POWERS[st.bossPower].name)}</b> : ${esc(BOSS_POWERS[st.bossPower].desc)} Sous la moitié de ses PV, il entre en phase 2.</p><p class="small dc-good"><b>Point faible</b> : ${esc(BOSS_POWERS[st.bossPower].counter)}</p>` : ''}
      ${u.side === 'enemy' ? `<p class="small">${weakF ? `<b>Faiblesse</b> : ${sigil(weakF)} ${esc(cat.faction[weakF]?.name || weakF)} (+50 % de dégâts)` : '<b>Faiblesse</b> : inconnue. Frappe-la avec la bonne faction, ou marque-la, pour la découvrir.'}</p>` : `
      <p class="small"><b>${actIcon('attack')} ${esc(kit.basic.name)}</b> (gratuit, +1 PA) : ${esc(kit.basic.desc)}</p>
      <p class="small"><b>${actIcon(kit.skill.key, kit.skill.icon)} ${esc(kit.skill.name)}</b> (${kit.skill.pa} PA) : ${esc(kit.skill.desc)}</p>
      <p class="small"><b>${esc(kit.passive.name)}</b> : ${esc(kit.passive.desc)}</p>
      ${u.rarity === 'C' ? `<p class="small dc-good">${icon('star')} Instinct de meute : +${PACK_BONUS} dégât aux élites et aux gardiens.</p>` : ''}`}
      ${u.side === 'enemy' && g.owns(u.id) ? `<p class="small dc-good">${icon('book')} Tu possèdes sa carte : tes créatures lui font +1 dégât.</p>` : ''}
      <p class="small muted">${statusLines(u)}</p></div>`, { label: c.name });
  }
  function statusLines(u) {
    const s = [];
    if (u.shield) s.push('Bouclier : bloque le prochain coup.');
    if (u.ward) s.push(`Sceau du Gardien : absorbe encore ${u.ward} dégâts.`);
    if (u.poison) s.push(`Poison ${u.poison} : perd ${u.poison} PV au début de son tour, puis le poison diminue de moitié.`);
    if (u.frozen || u.stunned) s.push('Gelé : passe son prochain tour.');
    if (u.slow) s.push('Ralenti : sa prochaine attaque fait moitié moins mal.');
    if (u.mark) s.push('Marqué : +30 % de dégâts subis, +3 aux jets de dés contre lui.');
    if (u.broken) s.push('Brisé : +50 % de dégâts subis, +5 aux jets.');
    if (u.defend) s.push('En défense : -50 % de dégâts.');
    if (u.guardBy) s.push('Protégé par un Rempart.');
    return s.join(' ');
  }
  function help() {
    openSheet(`<h2>Le combat</h2><ul class="small">
      <li><b>Chacun son tour</b> : toutes les créatures, les tiennes et les ennemies, jouent une fois par tour, dans l’ordre de leur vitesse. L’ordre s’affiche en haut à gauche ; « T2 » marque le début du tour suivant. Quand c’est le tour d’une de tes créatures, ses actions s’ouvrent : choisis l’action, puis la cible. Raccourci : touche un ennemi pour l’attaquer.</li>
      <li><b>PA</b> (points d’action, ${PA_MAX} au plus) : chaque créature a les siens. Elle en gagne 1 au début de chacun de ses tours, 1 en attaquant, 1 en se défendant et 1 sur une parade parfaite. Ses compétences les dépensent : alterne attaques et compétences, et fais jouer toute ton équipe.</li>
      <li><b>Attaque</b> (gratuite, +1 PA) : dégâts fiables, +1 Ferveur. <b>Défense</b> (gratuite, +1 PA) : -50 % de dégâts jusqu’à son prochain tour. <b>Passer</b> : elle ne fait rien. <b>Permuter</b> (une fois par tour) : une créature de la réserve prend sa place et joue tout de suite ; PV, PA et états sont gardés, et la réserve récupère 10 % de PV par tour. En entrant, elle déclenche un petit effet lié à son rôle (bouclier, soin, Ferveur, ralentissement…).</li>
      <li><b>Brisure</b> : en visant un élite ou un gardien, la cible affiche la Brisure que ton coup va infliger (◆), et « BRISE ! » quand il va le briser. Un seul coup ne retire jamais plus de 40 % des PV d’un gardien.</li>
      <li><b>Ferveur</b> (${FERVOR_MAX} au plus, commune à l’équipe et gardée d’un combat à l’autre) : attaques, faiblesses, esquives (+1), parades parfaites (+2) et Brisures (+2) la remplissent. Pleine, elle lance le <b>pouvoir d’équipe</b> (${esc(ult.name)} : ${esc(ult.desc)}), pendant le tour d’une de tes créatures, sans le terminer.</li>
      <li><b>Défense active</b> (coups chargés, attaques de zone, sorts, élites et gardiens) : touche dans l’or pour esquiver (+1 Ferveur), sur le trait blanc, au tout dernier instant, pour parer (aucun dégât, +1 PA, +2 Ferveur, Brisure, contre-attaque des Gardes et des Assauts).</li>
      <li><b>Dés</b> : Coup d’estoc, Contagion et Entrave lancent un D20 contre une difficulté (DD). 1 : échec critique ; sous le DD : réussite partielle ; DD atteint : réussite ; 20 : critique. Marque, gel, Brisure et faiblesse donnent des bonus.</li>
      <li><b>Enchaînement</b> : chaque créature qui frappe un ennemi déjà touché ce tour-ci par une autre de tes créatures gagne +1 dégât (+2 au plus). Le « +1 » doré sur la cible l’annonce.</li>
      <li><b>Coup de grâce</b> : achever un ennemi donne +1 Ferveur.</li>
      <li><b>Fêlure et Brisure</b> (élites, gardiens) : jauge vide, l’ennemi est <b>Fêlé</b>. Un <b>coup de rupture</b> (attaque d’un Protecteur, Coup d’estoc, Raz-de-marée, ou coup qui consomme une Marque) le <b>brise</b> : son attaque annoncée est annulée, il perd sa prochaine action, subit +50 % de dégâts et +5 aux jets contre lui jusqu’à la fin du tour suivant. Sans rupture avant la fin du tour suivant, il se ressaisit (jauge à moitié).</li>
      <li><b>Marque</b> : le prochain coup d’une <b>autre</b> de tes créatures fait +50 % et +2 Brisure, puis elle part. Garde-la pour ton plus gros coup.</li>
      <li><b>Hâte</b> (Soutien, ${2} PA, une fois par tour) : une de tes créatures qui n’a pas encore joué joue juste après elle. <b>Retard</b> : une Entrave partielle fait reculer l’ennemi de 2 places dans l’ordre du tour (1 pour un gardien).</li>
      <li><b>Assaut conjoint</b> (3 Ferveur, une fois par combat) : sur un ennemi Fêlé, Brisé ou Marqué, ta créature et celle qui joue juste après frappent ensemble (×1,25 chacune), avec l’effet de leurs deux rôles. L’alliée appelée perd son tour à venir. C’est aussi un coup de rupture.</li>
      <li><b>Détonation</b> : un ennemi à 6 poisons ou plus explose sous un Raz-de-marée (poison × 1,5 de dégâts d’un coup).</li>
      <li><b>Annonces</b> : les grosses attaques des gardiens et des élites s’affichent sur la frise, à côté de leur portrait. Brise-les avant qu’ils jouent pour les annuler.</li>
      <li><b>Riposte chargée</b> : chaque coup encaissé par un Protecteur charge sa riposte (3 au plus) : +1 dégât et +1 Brisure par charge à sa prochaine attaque. <b>Prière</b> : le soin en trop devient un bouclier.</li>
      <li><b>Faiblesses</b> : chaque faction en craint une autre (+50 % de dégâts) ; contre sa propre faction : -25 %. ★ sur une cible = faiblesse exploitée.</li>
      <li><b>Instinct de meute</b> : tes Communes font +${PACK_BONUS} dégât aux élites et aux gardiens.</li></ul>
      <h3>L’identité des créatures</h3><p class="small">Chaque créature a sa propre identité, qui se révèle en montant de niveau : leur <b>frappe</b> (niveau 1) remplace l’attaque de leur rôle, puis viennent un <b>passif</b> (niveau 3), une <b>compétence propre</b> (niveau 6, la case dorée en plus de celle du rôle) et l’<b>Éveil</b> (niveau 9). Tout est détaillé sur la fiche de la carte.</p>
      <h3>Les rôles</h3>${Object.values(KITS).map((k) => `<p class="small">${roleIcon(k.kw)} <b>${esc(k.name)}</b> · <b>${esc(k.skill.name)}</b> (${k.skill.pa} PA) : ${esc(k.skill.desc)} <i>${esc(k.passive.name)} : ${esc(k.passive.desc)}</i></p>`).join('')}
      <h3>Les combinaisons</h3>${SYNERGIES.map((x) => `<p class="small"><b class="dv-syn-n">${esc(x.name)}</b> : ${esc(x.desc)}</p>`).join('')}
      <h3>Les ennemis</h3>${Object.values(AI_FAMILIES).map((f) => `<p class="small"><b>${esc(f.name)}</b> : ${esc(f.desc)} <span class="dc-good">${esc(f.counter)}</span></p>`).join('')}
      <h3>Les gardiens</h3>${Object.entries(BOSSES).map(([k, x]) => `<p class="small"><b>${esc(x.name)}</b> : ${esc(x.mechanic)}${g.s.bossesBeaten[k] ? ` <span class="dc-good">${esc(x.counter)}</span>` : ''}</p>`).join('')}
      <p class="small muted">Sous la moitié de leurs PV, les gardiens entrent en phase 2 : plus forts, ils alternent coups chargés et déflagrations, et visent tes Soigneurs.</p>`, { label: 'Règles du combat' });
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
  return { stop() { alive_ = false; ctl.abort(); dio.destroy(); document.body.classList.remove('battle-mode'); } };
}
