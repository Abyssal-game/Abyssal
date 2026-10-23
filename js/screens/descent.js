// L'Aventure (la Descente) : ton équipe de cartes descend dans l'Abysse, étage par étage,
// affronte les créatures corrompues en duel et rapporte un coffre (éclats ou booster).
import { RARITY, BOOSTERS, FINAL_FLOOR } from '../config.js';
import { DESCENT, ROOMS, BLESSINGS, CHESTS, floorFloor, OMENS, advisedPower as powerFor, powerPts, CHAPTER, CHAPTERS, chapterOf, chapterStart, floorFirstReward } from '../core/descent.js';
import { TEAM } from '../core/army.js';
import { BOSSES, bossOf } from '../core/bosses.js';
import { PACTS } from '../core/pacts.js';
import { TALENTS } from '../core/skills.js';
import { RELATION } from '../core/relations.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { chestSVG } from '../ui/chest.js';
import { runDuel } from './duel-ui.js';
import { PHASE2 } from '../core/duel.js';
import { WEEKLY_FLOOR, NIGHTMARE_AT, AWAKEN_AT, NIGHT_TIERS, NIGHT_TIER_OPEN, nightTier } from '../core/game.js';
import { setScene, sceneUrl } from '../ui/scene.js';
import { PROLOGUE, EPILOGUE, chapterStory } from '../core/story.js';
import { BRAISE_IC, braiseBar, openRevive, openBraiseInfo } from '../ui/braise.js';
import { t, tw } from '../i18n.js';

// Illustrations des portes et des bonus
const DOOR_ART = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss', rest: 'rest', altar: 'altar', treasure: 'treasure' };
const HOW = [['cards', '#7FA8D8', 'Ton équipe', '5 de tes cartes : 3 au combat, 2 en réserve. Les cendres de la Fournaise les font monter de niveau.'], ['swords', '#E0485E', 'Le combat', 'Chacun son tour, dans l’ordre de la vitesse : chaque créature joue une fois par tour avec ses propres PA. L’attaque en rapporte, les compétences en coûtent. La Ferveur lance le pouvoir d’équipe ; tu en gardes 3 au plus d’un combat à l’autre.'], ['dodge', '#9FE0FF', 'Lire et parer', 'Les ennemis annoncent leurs attaques. Chacune se défend sur la barre, coup par coup (enchaînements, feintes) : esquive, ou parade parfaite. Brise les élites et les gardiens pour annuler leur coup.'], ['book', '#B48CFF', 'Connaître l’ennemi', 'Posséder la carte d’une créature corrompue donne +1 dégât contre elle.'], ['depth', '#F2C14E', 'Les chapitres', 'La Descente compte 20 chapitres de 5 étages : quatre étages (combat simple ou élite, puis un bonus au choix : source, autel ou trésor), puis le gardien. Tes PV se gardent d’un étage à l’autre. Si ton équipe tombe, tu recommences le chapitre, jamais depuis le début.'], ['braise', '#FF8A4C', 'Les Braises de vie', 'Une créature tombée pendant un chapitre gagné reste à terre ensuite. Une Braise de vie la ranime : chaque gardien en donne, une est offerte chaque jour, et elles s’achètent en cendres.'], ['omen', '#B48CFF', 'Le présage', 'Après ton premier gardien vaincu, chaque chapitre commence par un présage au choix parmi trois : un avantage et un prix pour tout le chapitre.'], ['chest', '#E8C35A', 'Les récompenses', 'La première victoire à chaque étage rapporte des éclats et des cendres, de plus en plus en descendant, et un coffre au 3e étage de chaque chapitre. Chaque gardien donne un coffre d’or (étages 5, 15, 25…) ou un coffre abyssal (étages 10, 20, 30…). Rejouer un chapitre ne rapporte que les petits gains des combats.'], ['crown', '#B04BFF', 'Le fond : étage 100', 'L’étage 100 est le dernier : L’Abysse y attend. Le vaincre donne le Booster de l’Abysse (5 cartes, une Mythique ou mieux, toutes en finition) avec une Secrète que tu n’as pas.']];
const DOOR_PIC = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss', };
const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };

export default function descent(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.descent ||= { nightmare: false, outcome: null });
  const nt = () => { const t = ui.ntier || 1; return g.nightTierOpen(t) ? t : 1; }; // v367 : palier de Cauchemar choisi
  let battle = null, playing = false;

  // swap (v307) : entre deux étages, toucher deux créatures échange leur place (les 3 premières combattent)
  const teamStrip = (ids, run, swap = false) => `<div class="v2-strip ${swap ? 'swappable' : ''}">${ids.map((id, i) => { const c = cat.get(id); const m = run?.team.find((x) => x.id === id); const dn = run ? !!m?.fallen : g.isFallen(id) /* v668 : à terre d'un chapitre à l'autre */; const can = swap && m && !m.fallen; const rv = !run && dn; return `<${can || rv ? 'button' : 'span'} class="v2-mini ${i >= TEAM.active ? 'res' : ''} ${dn ? 'fallen' : ''} ${can && ui.tsel === i ? 'sel' : ''}" style="--rc:${RARITY[c.rarity].color}"${can ? ` data-act="tswap" data-i="${i}" aria-label="${esc(c.name)} : ${i < TEAM.active ? 'au combat' : 'en réserve'}, ${m.hp} PV sur ${m.maxHp}"` : rv ? ` data-act="revive" data-id="${id}" aria-label="Ranimer ${esc(c.name)}"` : ''}><img alt="" src="${artUrl(c, { lite: true })}">${dn ? '<img class="v2-skull" alt="" src="assets/icons/mort.webp">' /* v665 */ : ''}${m ? `<span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span>` : `<small>${i < TEAM.active ? `Niv. ${g.cardLevel(id)}` : 'Rés.'}</small>`}</${can || rv ? 'button' : 'span'}>`; }).join('')}</div>`;
  const ruleHTML = (r) => `<section class="panel dc-rule bn-rule" style="--rf:${r.faction ? cat.faction[r.faction].colors.secondary : 'var(--gold)'}"><span class="dc-rule-ic">${r.faction ? sigil(r.faction) : picon('rule')}</span><span><span class="small muted">Règle du jour</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span></section>`;
  const chestChip = (c) => (c ? `<span class="v2-chest-chip" style="--cc:${CHESTS[c].color}">${icon('p:chest')} ${esc(CHESTS[c].name)}</span>` : '<span class="v2-chest-chip none">aucun coffre</span>');

  // v406 : la campagne en chapitres de 5 étages ; le chapitre choisi (en cours par défaut, ou un chapitre à rejouer)
  const chapNow = () => g.chapterNow();
  const startFloor = () => (g.startFloors().includes(ui.start) ? ui.start : chapterStart(chapNow()));
  const chapDone = (ch) => (g.descent().best || 0) >= ch * CHAPTER;
  const bossChest = (ch) => ((ch % 2) ? 'or' : 'abyssal');
  /* v469 : chaque gain dans sa pastille, espacées (avant : icônes et chiffres collés) */
  const rewardLine = (r) => `<span class="rw-line">${[r.shards && `<span class="rw-i">${icon('crystal')}+${fmt(r.shards)}</span>`, r.ash && `<span class="rw-i">${icon('ash')}+${fmt(r.ash)}</span>`, ...Object.keys(r.chests || {}).map((c) => `<span class="rw-i" style="color:${CHESTS[c].color}">${icon('p:chest')}${esc(CHESTS[c].name)}</span>`), r.braises && `<span class="rw-i rw-br">${BRAISE_IC}+${r.braises}</span>`].filter(Boolean).join('')}</span>`;
  function chapterHTML() {
    const d = g.descent(), best = d.best || 0, start = startFloor(), ch = chapterOf(start), done = chapDone(ch), bk = bossOf(ch * CHAPTER), B = BOSSES[bk];
    const floors = Array.from({ length: CHAPTER }, (_, i) => start + i);
    return `<div class="dc-chap ${done ? 'done' : ''}">
      <div class="dc-chap-h">${BOSS_FIGS.has(bk) ? `<img class="dc-chap-fig" alt="" src="assets/bosses/${bk}.webp">` : ''}<span><span class="dc-chap-k">Chapitre ${ch} / ${CHAPTERS}${done ? ' · terminé' : ''}</span><b>${esc(chapterStory(ch)?.title || B.name)}</b><small>${esc(B.name)} · ${esc(B.title)}</small></span><button class="dc-chap-read icon-btn" data-act="story" data-c="${ch}" aria-label="Lire le récit du chapitre">${icon('book')}</button></div>
      <ol class="dc-chap-floors">${floors.map((f) => `<li class="${f <= best ? 'ok' : ''} ${f === best + 1 ? 'next' : ''} ${f % CHAPTER === 0 ? 'boss' : ''}"><span>${f <= best ? icon('check') : f % CHAPTER === 0 ? icon('crown') : f}</span><small>${f % CHAPTER === 0 ? 'Gardien' : `Étage ${f}`}</small></li>`).join('')}</ol>
      <p class="small dc-chap-rw">${done ? `Chapitre déjà terminé : le rejouer ne rapporte que les petits gains des combats${g.nightmareUnlocked() ? ', sauf en <b>Cauchemar</b>' : ''}.` : `Chaque étage gagné pour la première fois rapporte des éclats et des cendres. Gardien vaincu : <b style="color:${CHESTS[bossChest(ch)].color}">${esc(CHESTS[bossChest(ch)].name.toLowerCase())}</b>.`}</p>
      ${!done && g.grit(ch) ? `<p class="small dc-grit">${icon('p:level-up')} <b>Persévérance</b> : après ${g.grit(ch)} défaite${g.grit(ch) > 1 ? 's' : ''} sur ce chapitre, ses ennemis sont affaiblis de ${Math.round(100 * (1 - g.gritMult(ch)))} % jusqu’à ta victoire.</p>` : ''}
    </div>${chapsHTML()}`;
  }
  function chapsHTML() {
    const fl = g.startFloors();
    if (fl.length < 2) return '';
    const s = startFloor();
    return `<details class="dc-starts" ${chapterOf(s) !== chapNow() ? 'open' : ''}><summary class="small muted">Rejouer un chapitre</summary><div class="dc-starts-row">${fl.map((f) => { const c = chapterOf(f); return `<button class="dc-st ${f === s ? 'on' : ''}" data-act="startat" data-f="${f}" aria-pressed="${f === s}">${c === chapNow() && !chapDone(c) ? `${c} · en cours` : c}</button>`; }).join('')}</div></details>`;
  }

  // ——— Accueil de l'Aventure ———————————————————————————————————————————
  function lobby() {
    const d = g.descent(), last = ui.outcome, team = g.team(), chests = g.chestCount();
    if (g.s.armyNews) { delete g.s.armyNews; g.persist(); } // ancien message de transition (héros → cartes) : retiré
    const start = startFloor(), ch = chapterOf(start), replay = chapDone(ch), night = ui.nightmare && replay && g.nightmareUnlocked();
    const standing = team.filter((id) => !g.isFallen(id)).length; /* v668 */
    root.innerHTML = `<header class="screen-head dc-head ui-hero bn-descente"><h1>La Descente</h1><p class="muted">${g.campaignDone() ? 'Tu as atteint le fond de l’Abysse' : d.best ? `Chapitre ${chapNow()} sur ${CHAPTERS} · record : étage ${d.best}` : 'Descends étage par étage jusqu’au fond de l’Abysse.'}</p></header>
      ${last ? summaryHTML(last) : ''}
      ${'' /* v548 : rappel des coffres retiré de la Descente (déjà sur l'Accueil et sur l'onglet Butin) */}
      <section class="panel dc-go">
        ${chapterHTML()}
        ${teamStrip(team)}
        ${braiseBar(g, team)}
        <p class="small muted center">Pouvoir : <b>${esc(g.ultimate(team).name)}</b></p>
        ${levelHint(team, d)}
        <div class="dc-teambtns"><a class="btn small ghost dc-plq dc-plq-dark" href="#/equipe">${icon('p:team-ic')}Mon équipe</a><a class="btn small ghost dc-plq dc-plq-dark" href="#/renfort">${icon('p:level-up')}Renforcer</a></div>
        ${team.length < TEAM.active ? (g.welcomePending() ? `<a class="btn gold block" href="#/boutique">${icon('ticket')}Ouvre d’abord tes boosters de bienvenue</a>` : `<p class="small v2-warn center">${icon('info')} Ajoute au moins ${TEAM.active} créatures à ton équipe pour descendre.</p>`) : ''}
        ${team.length >= TEAM.active && standing < TEAM.active ? `<p class="small v2-warn center">${icon('info')} Il faut ${TEAM.active} créatures debout pour descendre : ranime-les avec une Braise de vie, ou remplace-les dans ton équipe.</p>` : ''}
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="start" ${standing >= TEAM.active ? '' : 'disabled'}>${icon('p:descend')}${replay ? `Rejouer le chapitre ${ch}` : d.best ? `Commencer le chapitre ${ch}` : 'Commencer la Descente'}</button>
        ${replay ? `<div class="dc-opts">
          ${g.nightmareUnlocked() ? `<button class="dc-opt dc-opt-night ${ui.nightmare ? 'on' : ''}" data-act="night" aria-pressed="${!!ui.nightmare}">${icon('skull')}<b>Cauchemar</b><small>${g.nightBest(nt()) ? `record : étage ${g.nightBest(nt())}` : `ennemis +${Math.round((NIGHT_TIERS[nt()].hp - 1) * 100)} % PV, +${Math.round((NIGHT_TIERS[nt()].atk - 1) * 100)} % ATQ`} · récompenses ×${String(NIGHT_TIERS[nt()].shards).replace('.', ',')}</small></button>` : `<button class="dc-opt off" data-act="optinfo">${icon('lock')}<b>Cauchemar</b><small>dès l’étage ${NIGHTMARE_AT}</small></button>`}
          <button class="dc-opt-info icon-btn" data-act="optinfo" aria-label="Explications du Cauchemar">${icon('info')}</button>
        </div>` : ''}
        ${night ? `<div class="dc-ntiers" role="radiogroup" aria-label="Palier du Cauchemar">${[1, 2, 3].map((t) => { const open = g.nightTierOpen(t); return `<button class="dc-nt ${nt() === t ? 'on' : ''} ${open ? '' : 'off'}" role="radio" aria-checked="${nt() === t}" data-act="ntier" data-t="${t}" ${open ? '' : 'disabled'}><b>${['', 'I', 'II', 'III'][t]}</b><small>${open ? `coffres +${NIGHT_TIERS[t].chest} · éclats ×${String(NIGHT_TIERS[t].shards).replace('.', ',')}` : `${icon('lock')} étage ${NIGHT_TIER_OPEN} en ${['', 'I', 'II'][t - 1]}`}</small></button>`; }).join('')}</div>
        <p class="small dc-riskwarn">${icon('skull')} ${NIGHT_TIERS[nt()].name} : les ennemis ont la force de l’<b>étage ${g.nightmareEquiv(start, nt())}</b> en mode normal, et les gardiens sont déchaînés. Chaque étage gagné pour la première fois à ce palier redonne sa récompense, en plus généreux.${riskAdvice()}</p>` : ''}
      </section>
      ${summitHTML(d)}
      ${g.rule().off ? '' : ruleHTML(g.rule())}
      <div class="dc-links dc-links-one">
        <button class="dc-link" data-act="open" data-f="how">${picon('help')}<b>Comment ça marche</b><small>en ${HOW.length} étapes</small></button>
      </div>`;
    if (last?.record && !last.cheered) { last.cheered = true; setTimeout(() => app.sfx.achievement?.(), 250); root.querySelector('.dc-sum2')?.classList.add('cheer'); } // record battu : on fête
  }

  // v328 : la difficulté suit le niveau moyen de l'équipe (plancher, core/descent.js) : on l'écrit enfin, avec le niveau conseillé
  const avgLevel = (ids) => (ids.length ? ids.reduce((a, id) => a + g.cardLevel(id), 0) / ids.length : 1);
  // v331 : risque personnel des modes Maudite et Cauchemar (expéditions perdues sur jouées)
  function riskLine(k, dflt) {
    const r = g.descent().risk?.[k];
    return r?.n ? `perdues : ${r.lost} sur ${r.n}` : dflt;
  }
  /* v459 puis v495 (plus de budget d'équipe) : une équipe toute au niveau 10 et à la force du fond (2,55) n'est plus
     dite « trop faible » : la suite se joue sur la façon de combattre */
  const maxed = (team) => team.length && team.every((id) => g.cardLevel(id) >= 10) && g.teamPower(team) >= 2.5;
  function riskAdvice() {
    const team = g.team(), d = g.descent(), tp = g.teamPower(team), need = powerFor(Math.max((d.best || 0) + 1, 5));
    if (tp < need * 0.95 && !maxed(team)) return ` <b>Ton équipe est sous la force conseillée</b> (${powerPts(tp)} pour ${powerPts(need)}) : le risque est élevé.`;
    const r = [ui.nightmare && d.risk?.night].filter((x) => x && x.n >= 3).sort((a, b) => b.lost / b.n - a.lost / a.n)[0];
    return r && r.lost / r.n >= 0.5 ? ` Tu as perdu ${r.lost} de tes ${r.n} derniers chapitres dans ce mode.` : '';
  }
  function levelHint(team, d) {
    if (team.length < 3) return '';
    // v345 : force de l'équipe (rareté × niveau) plutôt que niveau seul
    const avg = avgLevel(team), tp = g.teamPower(team), target = Math.max((d.best || 0) + 1, 5), need = powerFor(target), top = maxed(team) && tp < need * 0.95, ok = tp >= need * 0.95 || top;
    return `<p class="small center dc-lvl ${ok ? 'ok' : 'low'}">${icon('p:level-up')} Force de ton équipe : <b>${powerPts(tp)}</b>${top ? ' · <b>au maximum</b> : à cette profondeur, tout se joue sur ta défense, la Brisure, les talents et les présages' : ` · conseillée pour l’étage ${target} : <b>${powerPts(need)}</b>${ok ? '' : ' · <a href="#/renfort">la renforcer</a>'}`}</p>
      <details class="dc-floorhelp small muted"><summary>Comment la difficulté marche</summary><p>La <b>force</b> d’une créature dépend de sa rareté et de son niveau : une Mythique au niveau 1 vaut une Commune au niveau 8. Monter de niveau ou aligner des créatures plus rares rend l’équipe plus forte.</p><p>Dans la Descente, chaque étage a <b>sa force fixe</b> : renforcer ton équipe rend donc les chapitres plus faciles. Les <b>Épreuves du jour</b> et le <b>Cauchemar</b>, eux, s’adaptent à ta force (dès l’étage 1 en Cauchemar, les ennemis valent ceux de l’étage ${floorFloor(avg)} au moins).</p><p>Une équipe très en dessous de la force de l’étage se fait vite abattre ; à force égale, ce sont <b>tes esquives, tes parades et la Brisure</b> qui décident : chaque attaque ennemie frappe fort si tu ne la défends pas.</p></details>`;
  }
  function weakHint(floor) {
    const team = g.team(), tp = g.teamPower(team), need = powerFor(floor), low = team.filter((id) => g.cardPower(id) < need * 0.9);
    if (tp >= need * 0.95 || maxed(team)) return '';
    const can = team.filter((id) => { const c = g.upgradeCost(id); return c && c <= g.s.ash; });
    return `<div class="dc-why dc-weak"><b>${icon('p:level-up')} Ton équipe était trop faible pour cet étage</b><p class="small">Force de l’équipe <strong>${powerPts(tp)}</strong>, alors que l’étage ${floor} en demande environ <strong>${powerPts(need)}</strong>${low.length ? ` (${low.length} créature${low.length > 1 ? 's' : ''} en dessous)` : ''}.${can.length ? ` Tu as <strong>${fmt(g.s.ash)} cendres</strong> : de quoi en faire monter ${can.length > 1 ? 'plusieurs' : 'une'} tout de suite.` : ' Brûle tes doublons dans la Fournaise pour gagner des cendres.'}</p><a class="btn small gold" href="#/renfort">${icon('p:level-up')}Renforcer mon équipe</a></div>`;
  }

  // Éclats possédés et progression vers le prochain booster standard
  function boosterProgressHTML(have) {
    const price = BOOSTERS.standard.price;
    if (have >= price) return `<p class="vx-week dc-bp"><span>${icon('crystal')} Tu as <b>${fmt(have)} éclats</b> : de quoi acheter un booster.</span></p>`;
    return `<p class="vx-week dc-bp"><span>${icon('crystal')} <b>${fmt(have)} / ${fmt(price)} éclats</b> pour ton prochain booster</span><span class="progress"><i style="width:${(have / price) * 100}%"></i></span></p>`;
  }
  // v394 : le fond de l'Abysse, étage 100 (le dernier) : ce qu'il rapporte, et où en est le joueur
  function summitHTML(d, full = false) {
    const best = Math.min(FINAL_FLOOR, d.best || 0), done = !!g.s.bossesBeaten?.abysse;
    // v404 : une simple ligne tant que le record est loin du fond (le grand encart écrasait le premier écran)
    if (!full && best < 50 && !done) return `<button class="panel dc-summit-line" data-act="open" data-f="summit"><img alt="" src="assets/packs/abysse2.webp"><span><b>Objectif ultime : l’étage ${FINAL_FLOOR}</b><small>L’Abysse et son booster légendaire · ton record : ${best} / ${FINAL_FLOOR}</small></span>${icon('next')}</button>`;
    /* v448 : dans une fenêtre, plus d'encadré dans le cadre : titre en tête (à côté de la croix), sachet au centre */
    if (full) return `<div class="center dc-smh"><b class="dc-sm-k">${done ? 'Fond de l’Abysse atteint' : 'Le fond de l’Abysse'}</b><h2>Étage ${FINAL_FLOOR} · L’Abysse</h2></div>
      <div class="dc-sms"><img class="dc-sms-pack" alt="" src="assets/packs/abysse2.webp">
        <p>Le dernier étage de la Descente. La première victoire contre L’Abysse donne le <b>Booster de l’Abysse</b> : 5 cartes, une Mythique ou mieux, toutes au moins argentées, avec <b>une Secrète que tu n’as pas</b>.</p>
        ${done ? '' : '<p class="small muted">Première victoire : titre « Vainqueur de l’Abysse », Cadre de l’Œil et 2 coffres abyssaux.</p>'}
        <div class="dc-sm-bar"><span class="progress"><i style="width:${(best / FINAL_FLOOR) * 100}%"></i></span><small>Ton record : ${best} / ${FINAL_FLOOR}</small></div></div>`;
    return `<section class="panel dc-summit ${done ? 'done' : ''}"><img class="dc-sm-pack" alt="" src="assets/packs/abysse2.webp">
      <div class="dc-sm-body"><b class="dc-sm-k">${done ? 'Fond de l’Abysse atteint' : 'Le fond de l’Abysse'}</b><h2>Étage ${FINAL_FLOOR} · L’Abysse</h2>
        <p class="small">Le dernier étage de la Descente. La première victoire contre L’Abysse donne le <b>Booster de l’Abysse</b> : 5 cartes, une Mythique ou mieux, toutes au moins argentées, avec <b>une Secrète que tu n’as pas</b>.</p>
        ${done ? '' : '<p class="small muted">Première victoire : titre « Vainqueur de l’Abysse », Cadre de l’Œil et 2 coffres abyssaux.</p>'}
        <div class="dc-sm-bar"><span class="progress"><i style="width:${(best / FINAL_FLOOR) * 100}%"></i></span><small>Ton record : ${best} / ${FINAL_FLOOR}</small></div></div></section>`;
  }
  function summaryHTML(s) {
    const ch = s.chapterDone || s.chapter || chapterOf(s.start || 1), next = s.chapterDone && !s.summit && s.chapterDone < CHAPTERS ? s.chapterDone + 1 : 0;
    const title = s.summit ? 'Le fond de l’Abysse' : s.chapterDone ? `Chapitre ${ch} terminé` : s.abandoned ? 'Chapitre abandonné' : 'L’équipe est tombée';
    const sub = s.summit ? 'L’Abysse est vaincu. Tu es descendu au plus profond de la Descente.' : s.chapterDone ? `${s.boss ? `${esc(BOSSES[s.boss.key]?.name || 'Le gardien')} est vaincu. ` : ''}${next ? `Le chapitre ${next} est ouvert.` : ''}` : `Tu gardes tout ce que tu as gagné. Le chapitre ${ch} reprendra à l’étage ${chapterStart(ch)}.`;
    const fl = s.firstLoot;
    const bk = s.boss?.key, nextB = next ? bossOf(next * CHAPTER) : null;
    /* v421 : fin de chapitre marquante : le gardien vaincu s'efface, le coffre gagné en grand, le chapitre suivant se dévoile */
    const chEnd = s.chapterDone && bk ? `<div class="dc-chend">${BOSS_FIGS.has(bk) ? `<img class="dc-chend-fig" alt="" src="assets/bosses/${bk}.webp">` : ''}<span class="dc-chend-seal">${icon('check')} Chapitre refermé</span></div>` : '';
    const chChest = s.chapterDone && s.bossChest ? `<div class="dc-chend-chest" style="--cc:${CHESTS[s.bossChest].color}">${chestSVG(s.bossChest)}<b>${esc(CHESTS[s.bossChest].name)}</b></div>` : '';
    const chNext = nextB ? `<div class="panel dc-chnext">${BOSS_FIGS.has(nextB) ? `<img alt="" src="assets/bosses/${nextB}.webp">` : ''}<span><span class="dc-chap-k">Chapitre ${next} · ouvert</span><b>${esc(chapterStory(next)?.title || '')}</b><small>${esc(BOSSES[nextB].name)} t’attend à l’étage ${next * CHAPTER}</small></span></div>` : '';
    return `<section class="dc-sum2 ${s.wiped ? 'lost' : 'won'} ${s.chapterDone ? 'chapter' : ''}">
      ${chEnd || crestHTML(!s.wiped, s.chapterDone ? ch : s.floor, s.chapterDone ? 'Chapitre' : (s.floor > 1 ? 'Étages' : 'Étage'), 'dc-sum2-crest')}
      <h2>${title}</h2>
      <p class="dc-sum2-sub">${sub}</p>
      ${s.boss && s.chapterDone ? bossRecap(s.boss) : ''}
      ${s.abyssPack ? `<a class="panel dc-summit-win" href="#/boutique"><img alt="" src="assets/packs/abysse2.webp"><span><b>Booster de l’Abysse</b><span class="small">Il t’attend dans les Boosters.${s.abyss ? ' Avec une Secrète que tu n’as pas encore.' : ''}</span></span></a>` : ''}
      ${s.abyss ? `<div class="panel st-epi"><span class="bx-k">Épilogue</span><h3>${esc(EPILOGUE.title)}</h3><p>${esc(EPILOGUE.text)}</p></div><p class="vx-week vx-first">${icon('crown')} Titre « Vainqueur de l’Abysse », Cadre de l’Œil de l’Abysse et <b>2 coffres abyssaux</b> !</p>` : ''}
      ${chChest}${chNext}
      ${s.braises ? `<p class="vx-week br-won">${BRAISE_IC} <b>+${s.braises} Braise${s.braises > 1 ? 's' : ''} de vie</b> : de quoi ranimer une créature tombée.</p>` : ''}
      ${s.fallen?.length ? `<p class="vx-week br-down"><img class="br-skull" alt="" src="assets/icons/mort.webp"> ${s.fallen.length > 1 ? `${s.fallen.length} créatures restent à terre : touche-les dans ton équipe pour les ranimer` : `<span translate="no">${esc(t('{name} reste à terre : touche-la dans ton équipe pour la ranimer avec une Braise de vie.', { name: tw(cat.get(s.fallen[0])?.name || 'Une créature') }))}</span>`}${s.fallen.length > 1 ? ' avec une Braise de vie.' : ''}</p>` : ''}
      ${next ? `<button class="btn primary block big-cta dc-plq dc-plq-red" data-act="nextchap" data-c="${next}">${icon('p:descend')}Commencer le chapitre ${next}</button>` : ''}
      ${s.chests.length ? `<a class="btn ${next ? 'gold' : 'primary'} block dc-plq ${next ? 'dc-plq-dark' : 'dc-plq-red'} dc-chestcta" href="#/coffres">${icon('p:chest')}Ouvrir ${s.chests.length > 1 ? 'mes coffres' : 'mon coffre'}</a>` : ''}
      ${s.record && !s.chapterDone ? `<p class="vx-week dc-record">${icon('crown')} <b>Nouveau record !</b> Jamais tu n’étais descendu aussi bas : étage ${s.floor}.</p>` : ''}
      ${s.nightmareRecord ? `<p class="vx-week">${icon('skull')} Nouveau record en ${(NIGHT_TIERS[s.nightTier || 1] || NIGHT_TIERS[1]).name} : étage ${s.floor} !</p>` : ''}
      ${s.wiped && app.state.lastEnemyTurn ? `<details class="dc-why dc-last"><summary>${icon('eye')} Voir le dernier tour ennemi</summary><ul class="dc-last-ul">${app.state.lastEnemyTurn}</ul></details>` : ''}
      ${s.feats && s.feats.wins ? `<div class="dc-feats">${[[s.feats.hit, 'Plus gros coup', 'hit'], [s.feats.kills, 'Ennemis vaincus', 'kills'], [s.feats.syn, 'Synergies', 'syn'], [s.feats.breaks, 'Brisures', 'breaks'], [s.feats.perfect, 'Frappes parfaites', 'perfect'], [s.feats.parries, 'Parades', 'parries']].filter(([n]) => n > 0).map(([n, l, ic]) => `<span class="dc-feat"><img class="dc-feat-ic" alt="" src="assets/icons/ft-${ic}.webp"><b>${n}</b><small>${l}</small></span>`).join('')}</div>` : ''}
      ${s.mvp && cat.get(s.mvp.id) ? `<p class="vx-week dc-mvp">${icon('star')} <b>${esc(cat.get(s.mvp.id).name)}</b> a achevé ${s.mvp.n} ennemis pendant le chapitre.</p>` : ''}
      ${s.shardsNow !== undefined ? boosterProgressHTML(s.shardsNow) : ''}
      ${s.wiped ? weakHint((s.floor || 0) + 1) : ''}
      ${s.report?.length ? `<div class="dc-why"><b>${icon('info')} Ce qui s’est passé</b>${s.report.map((l) => `<p class="small">${esc(l)}</p>`).join('')}${s.wiped && g.s.settings.defense === 'auto' ? '<p class="small">Ta défense est en <b>automatique</b> : elle n’esquive que 4 coups sur 10 et ne pare jamais. Essaie la défense <b>manuelle</b> (Réglages → Jeu).</p>' : ''}</div>` : ''}
      <div class="dc-sum2-loot">${s.chests.map((c) => `<span class="dc-sum2-chest" style="--cc:${CHESTS[c].color}">${chestSVG(c)}<b>${esc(CHESTS[c].name)}</b></span>`).join('')}${(fl?.shards || 0) + s.shards ? `<span class="dc-sum2-shards">${icon('crystal')}<b>+${fmt((fl?.shards || 0) + s.shards)}</b><small>éclats</small></span>` : ''}${fl?.ash ? `<span class="dc-sum2-shards">${icon('ash')}<b>+${fmt(fl.ash)}</b><small>cendres</small></span>` : ''}${!s.chests.length && !s.shards && !fl?.shards ? '<span class="dc-sum2-sub">Aucun butin cette fois.</span>' : ''}</div>
      <div class="dc-sum2-row"><button class="btn dc-plq dc-plq-dark" data-act="share">${icon('copy')}Partager</button><button class="btn dc-plq dc-plq-dark" data-act="dismiss">Continuer</button></div>
    </section>`;
  }

  // ——— Expédition ———————————————————————————————————————————————————
  // v373 : porte du gardien épurée (figure, nom, titre, pastille « déchaîné ») ; son mécanisme est expliqué sur sa présentation
  const BOSS_FIGS = new Set(['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse']);
  const bossDoor = (run) => { const k = bossOf(run.floor), b = BOSSES[k], wild = run.nightmare || run.floor >= AWAKEN_AT;
    return `<span class="dc-bdoor">${BOSS_FIGS.has(k) ? `<img class="dc-bfig" alt="" src="assets/bosses/${k}.webp">` : ''}<b class="dc-bname">${esc(b.name)}</b><span class="dc-btitle">${esc(b.title)}</span>${wild ? '<span class="dc-bwild">Déchaîné · Furie dès le 1er tour</span>' : ''}</span>`; };
  const runHead = (run) => `<header class="dc-run-head"><div><span class="small muted">${run.nightmare ? `<span class="dc-bad">${icon('skull')} ${nightTier(run).name}</span> · ` : ''}Chapitre ${chapterOf(run.start || run.floor)}${g.firstClear(run) ? '' : ' · déjà franchi'}</span><h1>Étage ${run.floor}</h1>${run.omen && OMENS[run.omen] ? `<button class="dc-omen-pill" data-act="omeninfo">${icon(OMENS[run.omen].icon)} ${esc(OMENS[run.omen].name)}</button>` : ''}</div><div class="dc-loot"><span>${icon('crystal')}${fmt(run.shards)}</span>${run.chests.length ? `<span>${icon('p:chest')}${run.chests.length}</span>` : ''}</div></header>
    ${teamStrip(run.team.map((m) => m.id), run, run.phase !== 'battle')}
    ${run.phase !== 'battle' && run.team.filter((m) => !m.fallen).length > 1 ? `<p class="dc-swap-hint small muted">${ui.tsel != null ? 'Touche la créature avec qui échanger sa place.' : 'Touche deux créatures pour échanger leur place : les 3 premières combattent.'}</p>` : ''}
    ${g.rule(run.day).off ? '' : `<p class="dc-rule-line small">${picon('rule')} <b>${esc(g.rule(run.day).name)}</b> · ${esc(g.rule(run.day).desc)}</p>`}`; /* v469 : règles du jour retirées (v430) : plus de ligne vide */
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">${doors.includes('boss') ? 'Un gardien barre la route.' : doors.length > 1 ? 'Deux passages. Le plus dangereux rapporte plus.' : 'Des créatures barrent le passage.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r} has-art" data-act="door" data-r="${r}" style="--art:url(${sceneUrl(DOOR_ART[r])})"><span class="dc-door-art"></span><span class="dc-door-ic ${DOOR_PIC[r] ? 'pic' : ''}">${DOOR_PIC[r] ? picon(DOOR_PIC[r]) : icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${r === 'boss' ? bossDoor(run) : ROOMS[r].desc}</span></button>`).join('')}</div>
      ${firstLine(run)}
      ${g.canCancelRun() ? `<button class="btn ghost block dc-cancel" data-act="cancelrun">${icon('back')}Annuler</button><p class="small muted center">Rien n’a encore été joué : tu peux revenir sans conséquence.</p>` : `<button class="btn ghost small block dc-abandon" data-act="abandon">${icon('p:abandon')}Abandonner le chapitre</button>`}`;
  }
  // v406 : ce que rapporte la première victoire à cet étage
  function firstLine(run, floor = run.floor) {
    if (!g.firstClear(run, floor)) return `<p class="small muted center dc-first">${icon('check')} Étage déjà franchi : seuls les petits gains des combats.</p>`;
    return `<p class="small center dc-first">${icon('star')} Première victoire ici : ${rewardLine(g.floorReward(run, floor))}</p>`;
  }
  function clearedView(run, extra = '') {
    const alive = run.team.some((m) => !m.fallen), nf = run.floor + 1;
    root.innerHTML = `${runHead(run)}${extra}
      <div class="dc-choice">${alive ? `<button class="dc-stair down" data-act="next">${picon('stairs-down')}<span><b>Descendre à l’étage ${nf}</b><span class="small">${nf % CHAPTER === 0 ? `Le gardien du chapitre : ${esc(BOSSES[bossOf(nf)].name)}` : 'Plus profond, plus dangereux'}</span></span></button>` : ''}</div>
      ${alive ? firstLine(run, nf) : ''}
      <p class="small muted center dc-pause">${icon('hourglass')} Pas le temps ? Ferme simplement le jeu : le chapitre t’attendra ici, même demain.</p>
      <button class="btn ghost small block dc-abandon" data-act="abandon">${icon('p:abandon')}Abandonner le chapitre</button>`;
  }
  // Fin de combat : la victoire et son butin, l'état de l'équipe, puis un seul choix (le bonus)
  function rewardView(run) {
    const w = ui.win && ui.win.floor === run.floor ? ui.win : null;
    // v328 : PV calculés sur toute l'équipe, créatures tombées comprises (« 100 % » s'affichait avec une créature à 0 PV)
    const fallenN = run.team.filter((m) => m.fallen).length, pct = Math.round((run.team.reduce((a, m) => a + (m.fallen ? 0 : m.hp), 0) / Math.max(1, run.team.reduce((a, m) => a + m.maxHp, 0))) * 100);
    const heal = Math.round(g.restHeal(run) * 100); // v308 : valeurs réelles (v334 : Disette 15 %)
    const effect = (r) => (r === 'rest' ? `Soigne ${heal} % des PV de chaque créature` : r === 'altar' ? 'Une bénédiction au choix pour tout le chapitre' : `Environ +${fmt(g.treasurePreview())} éclats`);
    const feats = w?.stats ? [w.stats.parries && `${w.stats.parries} parade${w.stats.parries > 1 ? 's' : ''}`, w.stats.breaks && `${w.stats.breaks} Brisure${w.stats.breaks > 1 ? 's' : ''}`, w.stats.crits && `${w.stats.crits} critique${w.stats.crits > 1 ? 's' : ''}`].filter(Boolean) : [];
    root.innerHTML = `<section class="vx ${w?.room || ''}">
      <div class="vx-hero">${crestHTML(true, run.floor, 'Étage', 'vx-crest')}<h1>Victoire</h1><span class="vx-k">${w?.room === 'boss' ? 'Gardien vaincu' : w?.room === 'elite' ? 'Élite vaincue' : `Étage ${run.floor} franchi`}</span>
        ${w ? `<div class="vx-loot"><span class="vx-chip">${icon('crystal')}+${fmt(w.shards + (w.first?.shards || 0))}</span>${w.ash + (w.first?.ash || 0) ? `<span class="vx-chip">${icon('ash')}+${fmt(w.ash + (w.first?.ash || 0))}</span>` : ''}${w.chest ? `<span class="vx-chip gold" style="--cc:${CHESTS[w.chest].color}">${icon('p:chest')}${esc(CHESTS[w.chest].name)}</span>` : ''}${feats.length ? `<span class="vx-chip feat">${icon('p:feats')}${feats.join(' · ')}</span>` : ''}</div>` : ''}
        ${w?.named ? `<p class="vx-week">${icon('skull')} <b>${esc(w.named.title)}</b> a succombé : butin de <b>+${fmt(w.named.shards)} éclats</b>.</p>` : ''}
        ${w?.firstWin ? `<p class="vx-week vx-first">${icon('star')} <b>Ta toute première victoire !</b> L’Abysse t’offre <b>+${fmt(w.firstWin)} éclats</b>.</p>` : ''}
        ${w?.abyss ? `<p class="vx-week vx-first">${icon('crown')} <b>Tu as vaincu L’Abysse.</b> Titre « Vainqueur de l’Abysse », Cadre de l’Œil de l’Abysse et <b>2 coffres abyssaux</b> !</p>` : ''}
        ${w?.bossTicket ? `<p class="vx-week">${icon('crown')} Le gardien laisse un <b>ticket de booster premium</b> derrière lui !</p>` : ''}
        ${w?.weekly ? `<p class="vx-week">${icon('sparkle')} <b>${esc(cat.get(w.weekly).name)}</b> rejoint ta collection !</p>` : ''}
        ${w?.boss ? bossRecap(w.boss) : ''}
        ${w?.goal ? `<p class="vx-week vx-goal ${w.goal.state}"><img class="vx-gico" alt="" src="assets/icons/goal.webp"> Objectif « ${esc(w.goal.name)} » : ${w.goal.state === 'done' ? `<b class="dc-good">réussi</b> · +${fmt(w.goalShards)} éclats et +1 Ferveur` : '<b>manqué</b>'}</p>` : ''}
        ${w?.report?.length ? `<p class="vx-week vx-best">${icon('star')} ${esc(w.report[0])}</p>` : ''}
        ${w?.relNew?.length ? `<p class="vx-week">${icon('p:combo')} Relation découverte : <b>${w.relNew.map((k) => esc(RELATION[k]?.name || k)).join(', ')}</b>. Retrouve-la dans le Bestiaire.</p>` : ''}
        ${w?.disc?.length ? `<div class="vx-disc"><span class="small muted">${picon('discover')}Nouvelles rencontres</span>${w.disc.slice(0, 5).map((id) => `<img alt="${esc(cat.get(id).name)}" title="${esc(cat.get(id).name)}" src="${artUrl(cat.get(id), { lite: true })}">`).join('')}</div>` : ''}
      </div>
      <div class="vx-team"><span class="small muted">Ton équipe · ${pct} % des PV${fallenN ? ` · ${fallenN} tombée${fallenN > 1 ? 's' : ''}` : ''}</span>${teamStrip(run.team.map((m) => m.id), run)}</div>
      ${run.talentOffer?.length ? `<h2 class="vx-h">Don de l’Abîme : choisis un talent</h2><p class="small muted center">Pour ce chapitre seulement.</p>
      <div class="vx-tal">${run.talentOffer.map((o, i) => { const c = cat.get(o.id); return `<button class="vx-talc" data-act="talent" data-i="${i}"><span class="vx-talart"><img alt="" src="${artUrl(c, { lite: true })}"><img class="vx-talico" alt="" src="assets/icons/tal-${o.talent}.webp"></span><span><b>${esc(TALENTS[o.talent].name)}</b><span class="small">${esc(c.name)} : ${esc(TALENTS[o.talent].desc)}</span></span>${icon('next')}</button>`; }).join('')}</div>` : `<h2 class="vx-h">Choisis ton bonus</h2>
      <div class="vx-picks">${run.rewards.map((r) => `<button class="vx-pick r-${r}" data-act="reward" data-r="${r}"><span class="vx-pic" style="--art:url(${sceneUrl(DOOR_ART[r])})"></span><span class="vx-pt"><b>${icon(ROOM_ICON[r])} ${ROOMS[r].name}</b><span class="small">${effect(r)}</span></span>${icon('next')}</button>`).join('')}</div>`}
    </section>`;
  }
  function altarView(run) {
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">L’autel murmure. Choisis une bénédiction.</p>
      <div class="dc-altar">${run.altar.map((k) => `<button class="dc-bl ${ui.bless === k ? 'on' : ''}" data-act="blesspick" data-k="${k}" aria-pressed="${ui.bless === k}" style="--bw:${Math.max(6, ...BLESSINGS[k].name.split(/[\s-]+/).map((w) => w.length))}"><span>${picon('rule')}</span><b>${esc(BLESSINGS[k].name)}</b></button>`).join('')}</div>
      ${run.altar.includes(ui.bless) ? `<div class="panel dc-bl-pick"><b>${esc(BLESSINGS[ui.bless].name)}</b><p>${esc(BLESSINGS[ui.bless].desc)}</p><button class="btn primary block" data-act="bless" data-k="${ui.bless}">Recevoir cette bénédiction</button></div>` : '<p class="small muted center dc-bl-hint">Touche une stèle pour lire sa bénédiction.</p>'}
      ${run.rewardsBak ? `<button class="btn ghost block" data-act="unaltar">${icon('back')}Revenir aux bonus</button>` : ''}`;
  }
  // v378 : combat mis en pause — on reste dans l'onglet Aventure, le combat attend d'être repris
  function pausedView(run) {
    root.innerHTML = `${runHead(run)}<section class="panel dc-paused"><h2>${icon('hourglass')} Combat en pause</h2>
      <p class="small">${run.room === 'boss' ? 'Le gardien' : run.room === 'elite' ? 'L’élite' : 'Le combat'} de l’étage ${run.floor} t’attend, exactement là où tu l’as laissé.</p>
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="resume">${icon('swords')}Reprendre le combat</button></section>
      <button class="btn ghost small block dc-abandon" data-act="abandon">${icon('p:abandon')}Abandonner le chapitre</button>`;
  }
  function battleView(run) {
    if (battle) return;
    playing = true;
    const title = `Étage ${run.floor}${run.room === 'boss' ? ' · Gardien' : run.room === 'elite' ? ' · Élite' : ''}`;
    battle = runDuel(app, root, { title, onAbandon: () => abandon(), onPause: () => {
      if (battle) { battle.stop(); battle = null; }
      playing = false; ui.paused = true; app.chrome(); render(); window.scrollTo(0, 0);
    }, onEnd: () => {
      battle = null; playing = false;
      const stats = run.battle?.stats || null;
      app.pendingProgress = [];
      let out;
      try { out = g.finishBattle(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
      app.chrome();
      if (out.lost) { app.sfx.error(); ui.outcome = out.summary; ui.win = null; render(); }
      else if (out.summit) { app.sfx.reveal('S'); ui.outcome = out.summary; ui.win = null; ui.start = null; ui.nightmare = false; render(); toast(out.abyssPack ? '<b>Tu as atteint le fond de l’Abysse !</b> Le Booster de l’Abysse t’attend dans les Boosters.' : '<b>L’Abysse est vaincu, une fois de plus.</b>', { kind: 'epic', icon: 'crown', ms: 7000 }); }
      else if (out.chapter) { app.sfx.reveal('M'); ui.outcome = out.summary; ui.win = null; ui.start = null; render(); if (out.first) toast(`<b>Chapitre ${out.chapter} terminé !</b> ${out.chest ? `${esc(CHESTS[out.chest].name)} gagné.` : ''}`, { kind: 'epic', icon: 'crown', ms: 5000 }); }
      else {
        app.sfx.reveal(out.room === 'boss' ? 'M' : 'R');
        const r = g.descent().run;
        ui.win = { goal: out.goal || null, goalShards: out.goalShards || 0, floor: r.floor, room: out.room, shards: out.shards, ash: out.ash || 0, chest: out.chest || null, disc: out.discovered.filter((id) => cat.get(id)), weekly: out.weekly?.id || null, bossTicket: out.bossTicket || 0, abyss: !!out.abyss, stats, boss: out.boss || null, relNew: out.relNew || [], report: out.report || [], firstWin: out.firstWin || 0, named: out.named || null, first: out.first || null };
        rewardView(r);
        if (r.talentOffer?.length) tuto(app, 'cb-talent');
      }
      window.scrollTo(0, 0);
      app.flushProgress();
      // v328 : le premier gardien vaincu ouvre les Duels des Sceaux ; on le dit (avant, seul le succès s'affichait)
    } });
  }
  // Abandon : confirmation avec les conséquences exactes, puis bilan comme une défaite
  async function abandon() {
    const p = g.abandonPreview();
    if (!p) return;
    const lines = ['Tu gardes tout ce que tu as gagné (éclats, cendres et coffres).', `Le chapitre ${p.chapter} reprendra à son premier étage, l’étage ${chapterStart(p.chapter)}.`];
    if (!(await confirmBox(`<b>Abandonner le chapitre ?</b><br>${lines.filter(Boolean).map((l) => `• ${l}`).join('<br>')}`, { ok: 'Abandonner', danger: true }))) return;
    if (battle) { battle.stop(); battle = null; }
    playing = false;
    document.body.classList.remove('battle-mode');
    app.pendingProgress = [];
    try { ui.outcome = g.abandonRun(); ui.win = null; } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    app.sfx.error(); app.chrome(); render(); window.scrollTo(0, 0);
    app.flushProgress();
  }
  // Pactes de l'Abîme : trois propositions facultatives avant un combat d'élite ou de gardien
  // v334 : Présage de départ, un choix parmi trois pour toute l'expédition
  function omenView(run) {
    const offer = run.omenOffer || [];
    root.innerHTML = `${runHead(run)}
      <section class="pk-head om-head"><img alt="" src="assets/icons/omen.webp"><div><h2>Présage</h2><p class="small">Avant de descendre, l’Abysse te montre trois présages. Choisis-en un : il dure <b>tout le chapitre</b>, avec un vrai avantage et un vrai prix. Les mêmes pour tout le monde aujourd’hui.</p></div></section>
      <div class="pk-list">${offer.map((k) => { const o = OMENS[k]; return `<button class="pk-c om-c ${ui.omen === k ? 'on' : ''}" data-act="omenpick" data-k="${k}" aria-pressed="${ui.omen === k}">
        <b>${icon(o.icon)} ${esc(o.name)}</b><span class="pk-gain"><i>Gain</i>${esc(o.gain)}</span><span class="pk-cost"><i>Prix</i>${esc(o.cost)}</span></button>`; }).join('')}</div>
      <div class="pk-actions">${offer.includes(ui.omen) ? `<button class="btn primary block big-cta dc-plq dc-plq-red" data-act="omengo">Suivre le ${esc(OMENS[ui.omen].name)}</button>` : '<p class="small muted center">Touche un présage pour le choisir.</p>'}</div>
      ${g.canCancelRun() ? `<button class="btn ghost block dc-cancel" data-act="cancelrun">${icon('back')}Annuler</button><p class="small muted center">Rien n’a encore été joué : tu peux revenir sans conséquence.</p>` : `<button class="btn ghost small block dc-abandon" data-act="abandon">${icon('p:abandon')}Abandonner le chapitre</button>`}`;
  }
  function pactView(run) {
    const boss = run.pendingRoom === 'boss' ? BOSSES[bossOf(run.floor)] : null;
    root.innerHTML = `${runHead(run)}
      <section class="pk-head"><img alt="" src="assets/icons/seal.webp"><div><h2>Pactes de l’Abîme</h2><p class="small">${boss ? `${esc(boss.name)} t’attend.` : 'Une élite redoutable t’attend.'} Une voix te propose un marché. Chaque pacte dure ce seul combat : un vrai avantage, et un vrai prix.</p></div></section>
      <div class="pk-list">${(run.pactOffer || []).map((k) => { const p = PACTS[k]; return `<button class="pk-c ${ui.pact === k ? 'on' : ''}" data-act="pactpick" data-k="${k}" style="--pk:${p.color}" aria-pressed="${ui.pact === k}">
        <b>${esc(p.name)}</b><span class="pk-gain"><i>Gain</i>${esc(p.gain)}</span><span class="pk-cost"><i>Prix</i>${esc(p.cost)}</span></button>`; }).join('')}</div>
      <div class="pk-actions">${ui.pact && (run.pactOffer || []).includes(ui.pact) ? `<button class="btn primary block big-cta dc-plq dc-plq-red" data-act="pactgo">Signer le ${esc(PACTS[ui.pact].name)}</button>` : '<p class="small muted center">Touche un pacte pour le choisir.</p>'}
        <button class="btn block dc-plq dc-plq-dark" data-act="pactno">Refuser et combattre sans pacte</button></div>`;
  }
  // Récapitulatif après un gardien : mécaniques rencontrées, interruptions, faiblesses, récit débloqué
  function bossRecap(b) {
    const B = BOSSES[b.key];
    return `<div class="bx-recap"><b>${esc(B.name)} vaincu</b>
      <ul>${b.log.map((m) => `<li>${esc(m)}</li>`).join('')}
      <li>Interruptions réussies : <b>${b.interrupts}</b>${b.key === 'devoreur' ? ` · festins du Dévoreur : <b>${b.feasts}</b>` : ''}</li></ul>
      ${b.first ? `<p class="small">${icon('p:genesis')} Nouveau récit dans le Bestiaire : <i>${esc(B.name)}</i>.</p>` : ''}</div>`;
  }
  function startPact(key) {
    let out;
    try { out = g.choosePact(key); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    ui.pact = null;
    if (key) app.sfx.discover();
    if (out.battle) enterBattle();
  }
  // v421 : récit d'un chapitre (au premier départ, puis relisible depuis la carte du chapitre)
  function storyHTML(ch) {
    const t = chapterStory(ch);
    return `${ch === 1 ? `<p class="st-pro">${esc(PROLOGUE)}</p>` : ''}<span class="bx-k">Chapitre ${ch} / ${CHAPTERS}</span><h1>${esc(t?.title || '')}</h1><p class="bx-p">${esc(t?.text || '')}</p>`;
  }
  function showStory(ch, then) {
    /* v444 : le récit s’affiche aussi en animations réduites (c’est du contenu, pas un effet) */
    const el = document.createElement('div');
    el.className = 'bx-intro st-intro';
    el.innerHTML = `<div class="bx-in">${storyHTML(ch)}<span class="bx-tap">Touche pour descendre</span></div>`;
    document.body.appendChild(el);
    app.sfx.page?.(); /* v439 : page du Bestiaire (ElevenLabs) */
    let done = false;
    el.addEventListener('click', () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 300); then?.(); });
  }
  // Entrée en combat ; un gardien a droit à une courte présentation (touche pour passer)
  function enterBattle() {
    window.scrollTo(0, 0);
    const run = g.descent().run;
    const key = run.battle?.bossKey;
    if (!key || app.reduced()) return battleView(run);
    const b = BOSSES[key], seen = g.s.bossesBeaten[key];
    const el = document.createElement('div');
    el.className = 'bx-intro';
    // v348 : gardien déjà vaincu 3 fois : présentation courte (nom, mécanique, contre), qui se ferme seule après 2 s
    const short = (g.s.bossWins?.[key] || 0) >= 3;
    if (short) {
      el.classList.add('short');
      el.innerHTML = `<div class="bx-in"><span class="bx-k">Étage ${run.floor} · Gardien</span><h1>${esc(b.name)}</h1><p class="bx-m"><b>Sa mécanique</b> ${esc(b.mechanic)}</p><p class="bx-m good"><b>Pour le contrer</b> ${esc(b.counter)}</p><span class="bx-tap">Touche pour combattre</span></div>`;
      document.body.appendChild(el); app.sfx.boss?.();
      let done = false;
      const go = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 300); battleView(g.descent().run); };
      el.addEventListener('click', go); setTimeout(go, 2000);
      return;
    }
    el.innerHTML = `<div class="bx-in"><span class="bx-k">Étage ${run.floor} · Gardien</span><h1>${esc(b.name)}</h1><p class="bx-t">${esc(b.title)}</p><p class="bx-p">${esc(b.intro)}</p><p class="bx-m"><b>Sa mécanique</b> ${esc(b.mechanic)}</p><p class="bx-m bx-loot"><b>Récompense</b> ${g.firstClear(run) && run.floor >= FINAL_FLOOR ? 'Première victoire : le Booster de l’Abysse et un coffre abyssal.' : g.firstClear(run) ? `Première victoire : ${esc(CHESTS[(run.floor / CHAPTER) % 2 ? 'or' : 'abyssal'].name.toLowerCase())}, et le chapitre ${chapterOf(run.floor) + 1} s’ouvre.` : 'Déjà vaincu : la victoire termine le chapitre.'}</p>${PHASE2[key] ? `<p class="bx-m"><img class="bx-ph" alt="" src="assets/ui/ph-${key}.webp" onerror="this.remove()"><b>À mi-vie : ${esc(PHASE2[key].name)}</b> ${esc(PHASE2[key].desc)}</p>` : ''}${seen ? `<p class="bx-m good"><b>Pour le contrer</b> ${esc(b.counter)}</p>` : ''}<span class="bx-tap">Touche pour combattre</span></div>`;
    document.body.appendChild(el);
    app.sfx.boss?.();
    let done = false;
    const go = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 300); battleView(g.descent().run); };
    el.addEventListener('click', go);
    // v295 : plus de lancement automatique — on lit à son rythme, le combat commence au toucher
  }
  function render() {
    const run = g.descent().run;
    setScene(run?.phase === 'battle' && !ui.paused ? null : 'descent');
    if (run?.phase !== 'battle') ui.paused = false;
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    if (run.phase === 'reward') return rewardView(run);
    if (run.phase === 'battle') return ui.paused ? pausedView(run) : battleView(run);
    if (run.phase === 'pact') return pactView(run);
    if (run.phase === 'omen') return omenView(run);
    return clearedView(run);
  }

  function share() {
    const s = ui.outcome || {};
    const d = g.descent();
    const txt = `ABYSSAL · La Descente : ${s.summit ? 'j’ai atteint le fond de l’Abysse, étage 100' : s.chapterDone ? `j’ai terminé le chapitre ${s.chapterDone}` : `j’ai atteint l’étage ${s.floor ?? d.best}`} ! Tu fais mieux ? ${location.origin}${location.pathname}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else navigator.clipboard?.writeText(txt).then(() => toast('Score copié : colle-le dans un message.', { icon: 'copy' }));
  }

  bindActions(root, {
    tswap(el) {
      const i = Number(el.dataset.i);
      if (ui.tsel == null || ui.tsel === i) { ui.tsel = ui.tsel === i ? null : i; render(); return; }
      try { g.swapRunTeam(ui.tsel, i); app.sfx.sheet?.(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
      ui.tsel = null; render();
    },
    startat(el) { ui.start = +el.dataset.f || 1; render(); },
    revive(el) { openRevive(app, el.dataset.id, () => render()); },
    braiseinfo() { openBraiseInfo(); },
    ntier(el) { ui.ntier = +el.dataset.t || 1; app.sfx.tap?.(); render(); },
    night() { ui.nightmare = !ui.nightmare; render(); if (ui.nightmare) tuto(app, 'dc-nightmare', { force: false }); },
    // v320 : saison, classement et aide s'ouvrent dans une fenêtre (la page ne les empile plus)
    open(el) {
      const f = el.dataset.f;
      if (f === 'summit') openSheet(summitHTML(g.descent(), true), { label: 'Le fond de l’Abysse', cls: 'dc-sheet' });
      else openSheet(`<h2 class="center">Comment ça marche</h2><ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol><p class="small muted center">Joue autant que tu veux : la Descente n’a pas de limite par jour.</p>`, { label: 'Aide', cls: 'dc-sheet' });
    },
    optinfo() {
      openSheet(`<h2 class="center">Le Cauchemar</h2>
        <p><b>${icon('skull')} Mode Cauchemar</b><br><span class="small">${g.nightmareUnlocked() ? '' : `S’ouvre quand tu as atteint l’étage ${NIGHTMARE_AT}. `}On y rejoue un chapitre déjà terminé : ennemis plus forts, gardiens déchaînés dès le début, et chaque étage gagné pour la première fois à ce palier redonne sa récompense, avec plus d’éclats et des coffres meilleurs. Trois paliers : ${[1, 2, 3].map((t) => `<b>${NIGHT_TIERS[t].name}</b> (ennemis +${Math.round((NIGHT_TIERS[t].hp - 1) * 100)} % PV et +${Math.round((NIGHT_TIERS[t].atk - 1) * 100)} % ATQ, coffres +${NIGHT_TIERS[t].chest}, éclats ×${String(NIGHT_TIERS[t].shards).replace('.', ',')})`).join(', ')}. Chaque palier s’ouvre quand tu atteins l’étage ${NIGHT_TIER_OPEN} au palier précédent.</span></p>`, { label: 'Modes', cls: 'dc-sheet sheet-small' });
    },
    weekcard(el) { app.openCard(el.dataset.id); },
    news() { delete g.s.armyNews; g.persist(); render(); },
    async start() {
      const st = startFloor();
      try {
        g.startRun({ nightmare: ui.nightmare && g.nightmareUnlocked() && chapDone(chapterOf(st)) ? nt() : 0, start: st }); ui.outcome = null; ui.tsel = null; app.sfx.tear(); app.chrome(); render(); window.scrollTo(0, 0);
        const ch = chapterOf(st), seen = (g.s.storySeen ||= {});
        const after = () => { if (g.descent().run?.phase === 'doors') tuto(app, 'army-doors'); };
        if (!chapDone(ch) && !seen[ch]) { seen[ch] = Date.now(); g.persist(); showStory(ch, after); } else after();
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    story(el) { /* v448 : titre du chapitre en tête de la fenêtre (plus de grand vide sous la croix), prologue ensuite */
      const ch = +el.dataset.c, s = chapterStory(ch); app.sfx.page?.();
      openSheet(`<div class="center st-head"><span class="bx-k">Chapitre ${ch} / ${CHAPTERS}</span><h2>${esc(s?.title || '')}</h2></div><div class="st-sheet st-sheet2">${ch === 1 ? `<span class="st-prok">Prologue</span><p class="st-pro">${esc(PROLOGUE)}</p>` : ''}<p class="bx-p">${esc(s?.text || '')}</p></div>`, { label: 'Récit du chapitre', cls: 'dc-sheet' }); },
    omeninfo() { const o = OMENS[g.descent().run?.omen]; if (o) openSheet(`<h2 class="center">${esc(o.name)}</h2><p><b class="dc-good">Gain</b> ${esc(o.gain)}</p><p><b class="dc-bad">Prix</b> ${esc(o.cost)}</p><p class="small muted">Il dure tout le chapitre.</p>`, { label: 'Présage', cls: 'dc-sheet sheet-small' }); },
    omenpick(el) { ui.omen = el.dataset.k; app.sfx.tap(); render(); },
    omengo() {
      try { const o = g.chooseOmen(ui.omen); ui.omen = null; app.sfx.discover(); toast(`${esc(o.name)} : ${esc(o.gain)}`, { icon: 'star' }); render(); window.scrollTo(0, 0); tuto(app, 'army-doors'); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    door(el) {
      if (playing) return;
      let out;
      try { out = g.chooseDoor(el.dataset.r); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      if (out.pact) { ui.pact = null; app.sfx.boss?.(); window.scrollTo(0, 0); return render(); }
      if (out.battle) return enterBattle();
      render();
    },
    talent(el) {
      try { const o = g.chooseTalent(+el.dataset.i); app.sfx.discover(); toast(`${esc(cat.get(o.id).name)} : ${esc(TALENTS[o.talent].name)}`, { icon: 'star' }); rewardView(g.descent().run); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    pactpick(el) { ui.pact = el.dataset.k; app.sfx.tap(); render(); },
    pactgo() { startPact(ui.pact); },
    pactno() { startPact(null); },
    reward(el) {
      let out;
      try { out = g.chooseReward(el.dataset.r); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      // v367 : écrans de fin d'étage rapprochés — la décision (remonter / descendre) garde en tête le résumé de la victoire
      const w = ui.win;
      ui.winBar = w ? `<div class="dc-wonbar"><img class="dc-wb-crest" alt="" src="assets/icons/victoire.webp"><span class="dc-wb-t"><b>Victoire · étage ${w.floor}</b><span class="dc-wb-loot"><span>${icon('crystal')}+${fmt(w.shards)}</span>${w.ash ? `<span>${icon('ash')}+${fmt(w.ash)}</span>` : ''}${w.chest ? `<span style="color:${CHESTS[w.chest].color}">${icon('p:chest')}${esc(CHESTS[w.chest].name)}</span>` : ''}</span></span></div>` : '';
      ui.win = null;
      if (out.altar) return render();
      app.sfx.coin();
      clearedView(g.descent().run, ui.winBar + (el.dataset.r === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source soigne tes créatures.</p>` : el.dataset.r === 'treasure' ? `<p class="dc-event">${icon('crystal')} +${fmt(out.shards)} éclats</p>` : out.healed ? `<p class="dc-event">${icon('star')} L’autel est muet, mais sa lumière soigne ton équipe.</p>` : ''));
    },
    blesspick(el) { ui.bless = el.dataset.k; app.sfx.tap(); altarView(g.descent().run); },
    bless(el) { ui.bless = null;  try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); clearedView(g.descent().run, (ui.winBar || '') + `<p class="dc-event">${icon('p:rule')} ${esc(BLESSINGS[el.dataset.k].name)} : ${esc(BLESSINGS[el.dataset.k].desc)}</p>`); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    unaltar() { try { g.cancelAltar(); app.sfx.tap(); render(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { ui.winBar = ''; try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    abandon() { abandon(); },
    resume() { ui.paused = false; app.sfx.tap(); render(); },
    cancelrun() { try { g.cancelRun(); ui.omen = null; ui.outcome = null; ui.win = null; app.sfx.tap(); toast('Chapitre annulé, sans conséquence.', { icon: 'back' }); app.chrome(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    nextchap(el) { ui.start = chapterStart(+el.dataset.c); ui.nightmare = false; ui.outcome = null; render(); window.scrollTo(0, 0); },
    share() { share(); },
    dismiss() { ui.outcome = null; render(); },
  });
  render();
  app.refreshView = () => { if (!playing) render(); };
  return () => { app.refreshView = null; if (battle) { battle.stop(); battle = null; } };
}
