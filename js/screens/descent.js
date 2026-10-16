// L'Aventure (la Descente) : ton équipe de cartes descend dans l'Abysse, étage par étage,
// affronte les créatures corrompues en duel et rapporte un coffre (éclats ou booster).
import { RARITY, BOOSTERS } from '../config.js';
import { DESCENT, ROOMS, BLESSINGS, CHESTS, chestForDepth, expectedLevel, floorFloor } from '../core/descent.js';
import { TEAM, BUDGET } from '../core/army.js';
import { BOSSES, bossOf } from '../core/bosses.js';
import { PACTS } from '../core/pacts.js';
import { TALENTS } from '../core/skills.js';
import { RELATION } from '../core/relations.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { bagHTML, bindBag } from './items.js';
import { chestSVG } from '../ui/chest.js';
import { rowAttrs, shownName, bindReport } from '../ui/report.js';
import { isBlocked } from '../core/moderation.js';
import { runDuel } from './duel-ui.js';
import { PHASE2 } from '../core/duel.js';
import { SEASON_STEPS, seasonName, seasonDaysLeft } from '../core/renown.js';
import { WEEKLY_FLOOR, NIGHTMARE_AT, AWAKEN_AT } from '../core/game.js';
import { setScene, sceneUrl } from '../ui/scene.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';

// Illustrations des portes et des bonus
const DOOR_ART = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss', rest: 'rest', altar: 'altar', treasure: 'treasure' };
const HOW = [['cards', '#7FA8D8', 'Ton équipe', '5 de tes cartes : 3 au combat, 2 en réserve. Les cendres de la Fournaise les font monter de niveau.'], ['swords', '#E0485E', 'Le combat', 'Chacun son tour, dans l’ordre de la vitesse : chaque créature joue une fois par tour avec ses propres PA. L’attaque en rapporte, les compétences en coûtent. La Ferveur lance le pouvoir d’équipe ; tu en gardes 3 au plus d’un combat à l’autre.'], ['dodge', '#9FE0FF', 'Lire et parer', 'Les gardiens et les élites annoncent leurs grosses attaques. Contre les attaques dangereuses, touche au bon moment : esquive, ou parade parfaite. Brise les élites et les gardiens pour annuler leur coup.'], ['book', '#B48CFF', 'Connaître l’ennemi', 'Posséder la carte d’une créature corrompue donne +1 dégât contre elle.'], ['depth', '#F2C14E', 'Chaque étage', 'Combat simple ou élite, puis un bonus au choix : source, autel ou trésor. Gardien tous les 5 étages.'], ['chest', '#E8C35A', 'Le coffre', 'Remonte quand tu veux : plus tu descends, plus le coffre est beau (bois, fer, or, abyssal).']];
const DOOR_PIC = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss' };
const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };

export default function descent(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.descent ||= { cursed: false, nightmare: false, outcome: null });
  let battle = null, playing = false;

  // swap (v307) : entre deux étages, toucher deux créatures échange leur place (les 3 premières combattent)
  const teamStrip = (ids, run, swap = false) => `<div class="v2-strip ${swap ? 'swappable' : ''}">${ids.map((id, i) => { const c = cat.get(id); const m = run?.team.find((x) => x.id === id); const can = swap && m && !m.fallen; return `<${can ? 'button' : 'span'} class="v2-mini ${i >= TEAM.active ? 'res' : ''} ${m?.fallen ? 'fallen' : ''} ${can && ui.tsel === i ? 'sel' : ''}" style="--rc:${RARITY[c.rarity].color}"${can ? ` data-act="tswap" data-i="${i}" aria-label="${esc(c.name)} : ${i < TEAM.active ? 'au combat' : 'en réserve'}, ${m.hp} PV sur ${m.maxHp}"` : ''}><img alt="" src="${artUrl(c, { lite: true })}">${m ? `<span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span>` : `<small>${i < TEAM.active ? `Niv. ${g.cardLevel(id)}` : 'Rés.'}</small>`}</${can ? 'button' : 'span'}>`; }).join('')}</div>`;
  const ruleHTML = (r) => `<section class="panel dc-rule bn-rule" style="--rf:${r.faction ? cat.faction[r.faction].colors.secondary : 'var(--gold)'}"><span class="dc-rule-ic">${r.faction ? sigil(r.faction) : picon('rule')}</span><span><span class="small muted">Règle du jour</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span></section>`;
  const chestChip = (c) => (c ? `<span class="v2-chest-chip" style="--cc:${CHESTS[c].color}">${icon('p:chest')} ${esc(CHESTS[c].name)}</span>` : '<span class="v2-chest-chip none">aucun coffre</span>');

  // ——— Accueil de l'Aventure ———————————————————————————————————————————
  function lobby() {
    const d = g.descent(), torches = g.torchesLeft(), last = ui.outcome, team = g.team(), chests = g.chestCount();
    if (g.s.armyNews) { delete g.s.armyNews; g.persist(); } // ancien message de transition (héros → cartes) : retiré
    const news = false;
    root.innerHTML = `<header class="screen-head dc-head ui-hero bn-descente"><h1>La Descente</h1><p class="muted">${d.best ? `Ton record : étage ${d.best}${d.bestToday ? ` · aujourd’hui : ${d.bestToday}` : ''}` : 'Descends, survis, rapporte un coffre.'}</p></header>
      ${news ? `<section class="panel ornate dc-news"><div class="dc-new-h"><span class="dc-new-ic">${icon('sparkle')}</span><span><b>Tes cartes combattent !</b><span class="small">Les héros ont quitté l’Abysse : ce sont maintenant tes créatures qui descendent. Chaque doublon fait monter une carte de niveau.</span>${news.shards ? `<span class="small">Ton ancien équipement et l’expérience de tes héros ont été changés en <b>${fmt(news.shards)} éclats</b>. Tes coffres sont gardés : ils contiennent maintenant des boosters.</span>` : ''}</span></div><button class="btn small ghost" data-act="news">OK</button></section>` : ''}
      ${last ? summaryHTML(last) : ''}
      ${chests ? `<a class="panel dc-chests" href="#/coffres"><span class="dc-new-ic">${icon('p:chest')}</span><span><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Éclats et boosters</span></span>${icon('next')}</a>` : ''}
      <section class="panel dc-go">
        <div class="dc-banner bn-expedition"><b>Expédition</b><span class="small">${d.best ? `Record : étage ${d.best}` : 'Ta première descente t’attend'}</span></div>
        <div class="dc-go-top"><span class="dc-torches">${Array.from({ length: DESCENT.torches }, (_, i) => `<i class="${i < torches ? 'on' : ''}">${picon(i < torches ? 'torch-on' : 'torch-off')}</i>`).join('')}</span><span class="small muted">${torches ? `${torches} expédition${torches > 1 ? 's' : ''} avec coffre aujourd’hui` : 'Expéditions du jour faites : tu peux rejouer, sans coffre'}</span></div>
        ${teamStrip(team)}
        <p class="small muted center">Pouvoir : <b>${esc(g.ultimate(team).name)}</b> · budget ${g.teamCost(team)} / ${BUDGET}</p>
        ${levelHint(team, d)}
        <div class="dc-teambtns"><a class="btn small ghost dc-plq dc-plq-dark" href="#/equipe">${icon('p:team-ic')}Mon équipe</a><a class="btn small ghost dc-plq dc-plq-dark" href="#/renfort">${icon('p:level-up')}Renforcer</a></div>
        ${team.length < TEAM.active ? (g.welcomePending() ? `<a class="btn gold block" href="#/boutique">${icon('ticket')}Ouvre d’abord tes boosters de bienvenue</a>` : `<p class="small v2-warn center">${icon('info')} Ajoute au moins ${TEAM.active} créatures à ton équipe pour descendre.</p>`) : ''}
        <button class="btn ${ui.cursed && torches ? 'danger' : 'primary'} block big-cta dc-plq dc-plq-red" data-act="start" ${team.length >= TEAM.active ? '' : 'disabled'}>${icon('p:descend')}${torches ? 'Descendre' : 'Descendre (sans coffre)'}</button>
        <div class="dc-opts">
          ${torches ? `<button class="dc-opt ${ui.cursed ? 'on' : ''}" data-act="curse" aria-pressed="${ui.cursed}">${icon('skull')}<b>Maudite</b><small>coffre +1, rien si l’équipe tombe</small></button>` : ''}
          ${g.nightmareUnlocked() ? `<button class="dc-opt dc-opt-night ${ui.nightmare ? 'on' : ''}" data-act="night" aria-pressed="${ui.nightmare}">${icon('skull')}<b>Cauchemar</b><small>${d.bestNightmare ? `record : étage ${d.bestNightmare}` : 'ennemis plus forts, coffre +1'}</small></button>` : `<button class="dc-opt off" data-act="optinfo">${icon('lock')}<b>Cauchemar</b><small>dès l’étage ${NIGHTMARE_AT}</small></button>`}
          <button class="dc-opt-info icon-btn" data-act="optinfo" aria-label="Explications des modes">${icon('info')}</button>
        </div>
      </section>
      ${ruleHTML(g.rule())}
      ${Object.values(g.s.items).some((n) => n > 0) ? bagHTML(g) : ''}
      <div class="dc-links">
        ${seasonHTML() ? `<button class="dc-link" data-act="open" data-f="season">${picon('season')}<b>Saison</b><small>paliers du mois</small></button>` : ''}
        <button class="dc-link" data-act="open" data-f="board">${picon('crown')}<b>Classement</b><small>du jour</small></button>
        <button class="dc-link" data-act="open" data-f="how">${picon('help')}<b>Comment ça marche</b><small>en ${HOW.length} étapes</small></button>
      </div>`;
    if (last?.record && !last.cheered) { last.cheered = true; setTimeout(() => app.sfx.achievement?.(), 250); root.querySelector('.dc-sum2')?.classList.add('cheer'); } // record battu : on fête
  }

  // v328 : la difficulté suit le niveau moyen de l'équipe (plancher, core/descent.js) : on l'écrit enfin, avec le niveau conseillé
  const avgLevel = (ids) => (ids.length ? ids.reduce((a, id) => a + g.cardLevel(id), 0) / ids.length : 1);
  function levelHint(team, d) {
    if (team.length < 3) return '';
    const avg = avgLevel(team), target = Math.max((d.best || 0) + 1, 5), need = expectedLevel(target), ok = avg + 0.5 >= need;
    return `<p class="small center dc-lvl ${ok ? 'ok' : 'low'}">${icon('p:level-up')} Niveau moyen de ton équipe : <b>${avg.toFixed(1).replace('.', ',')}</b> · conseillé pour l’étage ${target} : <b>${need}</b>${ok ? '' : ' · <a href="#/renfort">la renforcer</a>'}</p>
      <details class="dc-floorhelp small muted"><summary>Comment la difficulté s’adapte</summary><p>Les combats ordinaires et les élites ne sont jamais plus faciles que l’étage qui correspond au <b>niveau moyen</b> de ton équipe (actuellement l’étage ${floorFloor(avg)}). Monter une seule carte rend donc les combats plus durs pour toutes : fais monter l’équipe <b>ensemble</b>. Les gardiens, eux, gardent toujours la force de leur étage.</p></details>`;
  }
  function weakHint(floor) {
    const team = g.team(), avg = avgLevel(team), need = expectedLevel(floor), low = team.filter((id) => g.cardLevel(id) < need);
    if (avg + 1 >= need && !low.length) return '';
    const can = team.filter((id) => { const c = g.upgradeCost(id); return c && c <= g.s.ash; });
    return `<div class="dc-why dc-weak"><b>${icon('p:level-up')} Ton équipe était trop faible pour cet étage</b><p class="small">Niveau moyen <strong>${avg.toFixed(1).replace('.', ',')}</strong>, alors que l’étage ${floor} attend le niveau <strong>${need}</strong>${low.length ? ` (${low.length} créature${low.length > 1 ? 's' : ''} en dessous)` : ''}.${can.length ? ` Tu as <strong>${fmt(g.s.ash)} cendres</strong> : de quoi en faire monter ${can.length > 1 ? 'plusieurs' : 'une'} tout de suite.` : ' Brûle tes doublons dans la Fournaise pour gagner des cendres.'}</p><a class="btn small gold" href="#/renfort">${icon('p:level-up')}Renforcer mon équipe</a></div>`;
  }

  // Saison du mois : paliers de profondeur récompensés une fois
  function seasonHTML() {
    const se = g.season(), left = seasonDaysLeft(g.clock()), max = SEASON_STEPS[SEASON_STEPS.length - 1].floor;
    const rw = (r) => (r.shards ? `${icon('crystal')}${fmt(r.shards)}` : Object.keys(r.chests).map((c) => chestSVG(c)).join(''));
    return `<section class="panel dc-season"><div class="dc-season-h"><img class="dc-season-ic" alt="" src="assets/icons/season.webp" onerror="this.remove()"><span><b>${esc(seasonName(se.id))}</b><span class="small muted">Meilleur étage du mois : ${se.best || '—'} · fin dans ${left} jour${left > 1 ? 's' : ''}</span></span></div>
      <div class="dc-season-track"><i style="width:${Math.min(100, (se.best / max) * 100)}%"></i></div>
      <ol class="dc-season-steps">${SEASON_STEPS.map((st) => { const ok = se.claimed.includes(st.floor); return `<li class="${ok ? 'ok' : ''}"><span class="dc-season-rw">${ok ? icon('check') : rw(st.reward)}</span><small>Étage ${st.floor}</small></li>`; }).join('')}</ol>
      <p class="small muted">Atteins ces étages ce mois-ci (expéditions avec coffre) : chaque palier se gagne une fois par saison. Tout repart à zéro le 1er du mois.</p></section>`;
  }

  // Éclats possédés et progression vers le prochain booster standard
  function boosterProgressHTML(have) {
    const price = BOOSTERS.standard.price;
    if (have >= price) return `<p class="vx-week dc-bp"><span>${icon('crystal')} Tu as <b>${fmt(have)} éclats</b> : de quoi acheter un booster.</span></p>`;
    return `<p class="vx-week dc-bp"><span>${icon('crystal')} <b>${fmt(have)} / ${fmt(price)} éclats</b> pour ton prochain booster</span><span class="progress"><i style="width:${(have / price) * 100}%"></i></span></p>`;
  }
  function summaryHTML(s) {
    return `<section class="dc-sum2 ${s.wiped ? 'lost' : 'won'}">
      ${crestHTML(!s.wiped, s.floor, 'Étage', 'dc-sum2-crest')}
      <h2>${s.abandoned ? 'Expédition abandonnée' : s.wiped ? 'L’équipe est tombée' : 'Retour à la surface'}</h2>
      <p class="dc-sum2-sub">${s.wiped ? (s.cursed ? 'Descente maudite : le butin est perdu.' : 'Tu gardes la moitié des éclats et un coffre plus modeste.') : 'Tu remontes avec tout ton butin.'}</p>
      ${s.chests.length ? `<a class="btn primary block dc-plq dc-plq-red dc-chestcta" href="#/coffres">${icon('p:chest')}Ouvrir ${s.chests.length > 1 ? 'mes coffres' : 'mon coffre'}</a>` : ''}
      ${s.record ? `<p class="vx-week dc-record">${icon('crown')} <b>Nouveau record !</b> Jamais tu n’étais descendu aussi bas : étage ${s.floor}.</p>` : ''}
      ${s.nightmareRecord ? `<p class="vx-week">${icon('skull')} Nouveau record en mode Cauchemar : étage ${s.floor} !</p>` : ''}
      ${s.wiped && app.state.lastEnemyTurn ? `<details class="dc-why dc-last"><summary>${icon('eye')} Voir le dernier tour ennemi</summary><ul class="dc-last-ul">${app.state.lastEnemyTurn}</ul></details>` : ''}
      ${s.feats && s.feats.wins ? `<div class="dc-feats">${[[s.feats.hit, 'Plus gros coup', 'hit'], [s.feats.kills, 'Ennemis vaincus', 'kills'], [s.feats.syn, 'Synergies', 'syn'], [s.feats.breaks, 'Brisures', 'breaks'], [s.feats.perfect, 'Frappes parfaites', 'perfect'], [s.feats.parries, 'Parades', 'parries']].filter(([n]) => n > 0).map(([n, l, ic]) => `<span class="dc-feat"><img class="dc-feat-ic" alt="" src="assets/icons/ft-${ic}.webp"><b>${n}</b><small>${l}</small></span>`).join('')}</div>` : ''}
      ${s.mvp && cat.get(s.mvp.id) ? `<p class="vx-week dc-mvp">${icon('star')} <b>${esc(cat.get(s.mvp.id).name)}</b> a achevé ${s.mvp.n} ennemis pendant l’expédition.</p>` : ''}
      ${s.nextChest ? `<p class="vx-week dc-next">${icon('p:chest')} Prochain palier : <b>${esc(CHESTS[s.nextChest.chest].name.toLowerCase())}</b> dès l’étage ${s.nextChest.floor}.</p>` : ''}
      ${s.shardsNow !== undefined ? boosterProgressHTML(s.shardsNow) : ''}
      ${s.wiped ? weakHint((s.floor || 0) + 1) : ''}
      ${s.report?.length ? `<div class="dc-why"><b>${icon('info')} Ce qui s’est passé</b>${s.report.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="dc-sum2-loot">${s.chests.map((c) => `<span class="dc-sum2-chest" style="--cc:${CHESTS[c].color}">${chestSVG(c)}<b>${esc(CHESTS[c].name)}</b></span>`).join('')}${s.shards ? `<span class="dc-sum2-shards">${icon('crystal')}<b>+${fmt(s.shards)}</b><small>éclats</small></span>` : ''}${!s.chests.length && !s.shards ? '<span class="dc-sum2-sub">Aucun butin cette fois.</span>' : ''}</div>
      <div class="dc-sum2-row"><button class="btn dc-plq dc-plq-dark" data-act="share">${icon('copy')}Partager</button><button class="btn dc-plq dc-plq-dark" data-act="dismiss">Continuer</button></div>
    </section>`;
  }

  async function loadBoard(box) {
    if (!box) return;
    if (!cloud.isLoggedIn()) { box.innerHTML = 'Connecte-toi pour comparer ton étage avec les joueurs du monde entier. <a href="#/compte">Se connecter</a>'; return; }
    try {
      const day = g.descent().day;
      const rows = await cloud.leaderboard(day, 30);
      if (!document.contains(box)) return;
      const me = cloud.currentUser()?.id;
      const mine = g.descent().bestToday;
      box.classList.remove('muted');
      box.innerHTML = (rows.length ? rows.map((r, i) => {
        const hid = isBlocked(r.user_id), av = !hid && r.profiles?.avatar && cat.get(r.profiles.avatar);
        return `<div class="lb-row ${r.user_id === me ? 'me' : ''}"${rowAttrs(r.user_id, r.profiles?.pseudo, me)}><span class="lb-rank">${i + 1}</span><span class="lb-av">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${esc(shownName(r.user_id, r.profiles?.pseudo))}${hid ? '' : cloud.badgeHTML(r.profiles?.badge)}</b><span class="small muted">${hid ? '' : esc(r.profiles?.title || '')}</span></span><span class="lb-floor">${r.cursed ? `${icon('skull')} ` : ''}Étage ${r.floor}</span></div>`;
      }).join('') : '<p class="small muted">Personne n’est encore descendu aujourd’hui. À toi d’ouvrir la voie !</p>')
        + (!sync.profile?.pseudo ? '<p class="small acc-warn"><a href="#/compte">Choisis un pseudo</a> pour apparaître au classement.</p>' : !rows.some((r) => r.user_id === me) && mine ? `<p class="small muted">Ton meilleur étage aujourd’hui : ${mine}.</p>` : '');
      bindReport(box, () => loadBoard(box));
    } catch (e) { if (document.contains(box)) box.textContent = e.message; }
  }

  // ——— Expédition ———————————————————————————————————————————————————
  const runHead = (run) => `<header class="dc-run-head"><div><span class="small muted">${run.nightmare ? `<span class="dc-bad">${icon('skull')} Cauchemar</span> · ` : ''}${run.free ? 'Descente libre (sans coffre)' : run.cursed ? `<span class="dc-bad">${icon('skull')} Maudite</span>` : 'La Descente'}</span><h1>Étage ${run.floor}</h1></div><div class="dc-loot"><span>${icon('crystal')}${fmt(run.shards)}</span>${run.chests.length ? `<span>${icon('p:chest')}${run.chests.length}</span>` : ''}</div></header>
    ${teamStrip(run.team.map((m) => m.id), run, run.phase !== 'battle')}
    ${run.phase !== 'battle' && run.team.filter((m) => !m.fallen).length > 1 ? `<p class="dc-swap-hint small muted">${ui.tsel != null ? 'Touche la créature avec qui échanger sa place.' : 'Touche deux créatures pour échanger leur place : les 3 premières combattent.'}</p>` : ''}
    <p class="dc-rule-line small">${picon('rule')} <b>${esc(g.rule(run.day).name)}</b> · ${esc(g.rule(run.day).desc)}</p>`;
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">${doors.includes('boss') ? 'Un gardien barre la route.' : doors.length > 1 ? 'Deux passages. Le plus dangereux rapporte plus.' : 'Des créatures barrent le passage.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r} has-art" data-act="door" data-r="${r}" style="--art:url(${sceneUrl(DOOR_ART[r])})"><span class="dc-door-art"></span><span class="dc-door-ic ${DOOR_PIC[r] ? 'pic' : ''}">${DOOR_PIC[r] ? picon(DOOR_PIC[r]) : icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${r === 'boss' ? `<b class="dc-bad">${esc(BOSSES[bossOf(run.floor)].name)}${run.nightmare || run.floor >= AWAKEN_AT ? ' (déchaîné)' : ''}</b> : ${esc(BOSSES[bossOf(run.floor)].mechanic)}${run.nightmare || run.floor >= AWAKEN_AT ? ' <b class="dc-bad">Déchaîné : sa phase 2 commence dès le premier tour.</b>' : ''}${g.s.bossesBeaten[bossOf(run.floor)] ? ` <b class="dc-good">Contre : ${esc(BOSSES[bossOf(run.floor)].counter)}</b>` : ''}` : ROOMS[r].desc}</span></button>`).join('')}</div>
      ${run.cleared ? `<button class="btn ghost block" data-act="leave">${icon('back')}Remonter</button>` : ''}
      <button class="btn ghost small block dc-abandon" data-act="abandon">${icon('p:abandon')}Abandonner l’expédition</button>`;
  }
  function clearedView(run, extra = '') {
    const now = g.chestNow(run), next = run.free ? null : chestForDepth(run.floor + 1);
    const alive = run.team.some((m) => !m.fallen);
    root.innerHTML = `${runHead(run)}${extra}
      <section class="dc-risk2">
        <div class="dr-up"><span class="dr-k">Si tu remontes</span>${now ? `<span class="dr-chest">${chestSVG(now)}</span><b style="color:${CHESTS[now].color}">${esc(CHESTS[now].name)}</b><span class="dr-sub">${esc(CHESTS[now].desc)}</span>` : `<span class="dr-sub">${run.free ? 'Pas de coffre (descente libre)' : 'Pas encore de coffre : il arrive dès l’étage 3'}</span>`}<span class="dr-shards">${icon('crystal')}<b>${fmt(run.shards)}</b> éclats</span></div>
        <div class="dr-down"><span class="dr-k">Étage ${run.floor + 1}${(run.floor + 1) % DESCENT.bossEvery === 0 ? ' · gardien' : ''}</span><img class="dr-stair" alt="" src="assets/icons/stairs-down.webp">${run.free ? '<b>Descente libre</b>' : !now && !next ? '<b>Pas encore de coffre</b><span class="dr-sub">Le premier arrive à l’étage 3</span>' : next !== chestForDepth(run.floor) ? `<b class="dc-good">${now ? 'Coffre amélioré' : 'Premier coffre'}</b><span class="dr-sub">${esc(CHESTS[next].name)}</span>` : '<b>Même coffre</b><span class="dr-sub">Il s’améliore aux étages 3, 8, 16 et 25</span>'}<span class="dr-risk">${icon('skull')}${run.cursed ? 'Si l’équipe tombe : tout est perdu' : now ? 'Si l’équipe tombe : coffre d’une qualité en dessous' : 'Si l’équipe tombe : la moitié des éclats'}</span></div>
      </section>
      <div class="dc-choice">${alive ? `<button class="dc-stair down" data-act="next">${picon('stairs-down')}<span><b>Descendre à l’étage ${run.floor + 1}</b><span class="small">${run.free ? 'Plus profond, plus dangereux' : next !== chestForDepth(run.floor) ? `Plus dangereux, mais ${esc(CHESTS[next].name.toLowerCase())} à la clé` : 'Plus profond, plus dangereux'}</span></span></button>` : ''}<button class="dc-stair up" data-act="leave">${picon('stairs-up')}<span><b>${now ? 'Remonter avec le coffre' : 'Remonter'}</b><span class="small">${run.free ? 'Fin de la descente libre' : now ? 'Tu gardes le coffre et tes éclats' : 'Tu gardes seulement tes éclats'}</span></span></button></div>
      <p class="small muted center dc-pause">${icon('hourglass')} Pas le temps ? Ferme simplement le jeu : l’expédition t’attendra ici, même demain, et ses étages comptent pour ton record.</p>`;
  }
  // Fin de combat : la victoire et son butin, l'état de l'équipe, puis un seul choix (le bonus)
  function rewardView(run) {
    const w = ui.win && ui.win.floor === run.floor ? ui.win : null;
    // v328 : PV calculés sur toute l'équipe, créatures tombées comprises (« 100 % » s'affichait avec une créature à 0 PV)
    const fallenN = run.team.filter((m) => m.fallen).length, pct = Math.round((run.team.reduce((a, m) => a + (m.fallen ? 0 : m.hp), 0) / Math.max(1, run.team.reduce((a, m) => a + m.maxHp, 0))) * 100);
    const heal = g.rule(run.day).key === 'sources' ? 60 : 30; // v308 : valeurs réelles (game.js : 0.3, 0.6 avec Sources bénies)
    const effect = (r) => (r === 'rest' ? `Soigne ${heal} % des PV de chaque créature` : r === 'altar' ? 'Une bénédiction au choix pour toute l’expédition' : `Environ +${fmt(g.treasurePreview())} éclats`);
    const feats = w?.stats ? [w.stats.parries && `${w.stats.parries} parade${w.stats.parries > 1 ? 's' : ''}`, w.stats.breaks && `${w.stats.breaks} Brisure${w.stats.breaks > 1 ? 's' : ''}`, w.stats.crits && `${w.stats.crits} critique${w.stats.crits > 1 ? 's' : ''}`].filter(Boolean) : [];
    root.innerHTML = `<section class="vx ${w?.room || ''}">
      <div class="vx-hero">${crestHTML(true, run.floor, 'Étage', 'vx-crest')}<h1>Victoire</h1><span class="vx-k">${w?.room === 'boss' ? 'Gardien vaincu' : w?.room === 'elite' ? 'Élite vaincue' : `Étage ${run.floor} franchi`}</span>
        ${w ? `<div class="vx-loot"><span class="vx-chip">${icon('crystal')}+${fmt(w.shards)}</span>${w.ash ? `<span class="vx-chip">${icon('ash')}+${fmt(w.ash)}</span>` : ''}${w.chest ? `<span class="vx-chip gold" style="--cc:${CHESTS[w.chest].color}">${icon('p:chest')}${esc(CHESTS[w.chest].name)}</span>` : ''}${feats.length ? `<span class="vx-chip feat">${icon('p:feats')}${feats.join(' · ')}</span>` : ''}</div>` : ''}
        ${w?.named ? `<p class="vx-week">${icon('skull')} <b>${esc(w.named.title)}</b> a succombé : butin de <b>+${fmt(w.named.shards)} éclats</b>.</p>` : ''}
        ${w?.firstWin ? `<p class="vx-week vx-first">${icon('star')} <b>Ta toute première victoire !</b> L’Abysse t’offre <b>+${fmt(w.firstWin)} éclats</b>.</p>` : ''}
        ${w?.recruit ? `<p class="vx-week">${icon('crown')} Le gardien vaincu, <b>${esc(cat.get(w.recruit).name)}</b>, rejoint ta collection !</p>` : ''}
        ${w?.weekly ? `<p class="vx-week">${icon('sparkle')} <b>${esc(cat.get(w.weekly).name)}</b> rejoint ta collection !</p>` : ''}
        ${w?.boss ? bossRecap(w.boss) : ''}
        ${w?.goal ? `<p class="vx-week vx-goal ${w.goal.state}"><img class="vx-gico" alt="" src="assets/icons/goal.webp"> Objectif « ${esc(w.goal.name)} » : ${w.goal.state === 'done' ? `<b class="dc-good">réussi</b> · +${fmt(w.goalShards)} éclats et +1 Ferveur` : '<b>manqué</b>'}</p>` : ''}
        ${w?.report?.length ? `<p class="vx-week vx-best">${icon('star')} ${esc(w.report[0])}</p>` : ''}
        ${w?.relNew?.length ? `<p class="vx-week">${icon('p:combo')} Relation découverte : <b>${w.relNew.map((k) => esc(RELATION[k]?.name || k)).join(', ')}</b>. Retrouve-la dans le Bestiaire.</p>` : ''}
        ${w?.disc?.length ? `<div class="vx-disc"><span class="small muted">${picon('discover')}Nouvelles rencontres</span>${w.disc.slice(0, 5).map((id) => `<img alt="${esc(cat.get(id).name)}" title="${esc(cat.get(id).name)}" src="${artUrl(cat.get(id), { lite: true })}">`).join('')}</div>` : ''}
      </div>
      <div class="vx-team"><span class="small muted">Ton équipe · ${pct} % des PV${fallenN ? ` · ${fallenN} tombée${fallenN > 1 ? 's' : ''}` : ''}</span>${teamStrip(run.team.map((m) => m.id), run)}</div>
      ${run.talentOffer?.length ? `<h2 class="vx-h">Don de l’Abîme : choisis un talent</h2><p class="small muted center">Pour cette expédition seulement.</p>
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
  function battleView(run) {
    if (battle) return;
    playing = true;
    const title = `Étage ${run.floor}${run.room === 'boss' ? ' · Gardien' : run.room === 'elite' ? ' · Élite' : ''}`;
    battle = runDuel(app, root, { title, onAbandon: () => abandon(), onEnd: () => {
      battle = null; playing = false;
      const stats = run.battle?.stats || null;
      app.pendingProgress = [];
      let out;
      try { out = g.finishBattle(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
      app.chrome();
      if (out.lost) { app.sfx.error(); ui.outcome = out.summary; ui.win = null; render(); }
      else {
        app.sfx.reveal(out.room === 'boss' ? 'M' : 'R');
        const r = g.descent().run;
        ui.win = { goal: out.goal || null, goalShards: out.goalShards || 0, floor: r.floor, room: out.room, shards: out.shards, ash: out.ash || 0, chest: out.chest || null, disc: out.discovered.filter((id) => cat.get(id)), weekly: out.weekly?.id || null, recruit: out.recruit?.id || null, stats, boss: out.boss || null, relNew: out.relNew || [], report: out.report || [], firstWin: out.firstWin || 0, named: out.named || null };
        rewardView(r);
        if (r.talentOffer?.length) tuto(app, 'cb-talent');
      }
      window.scrollTo(0, 0);
      app.flushProgress();
      // v328 : le premier gardien vaincu ouvre les Duels des Sceaux ; on le dit (avant, seul le succès s'affichait)
      if (out.boss?.first && Object.keys(g.s.bossesBeaten || {}).length === 1) toast('<b>Les Duels des Sceaux sont ouverts !</b> Un second jeu de cartes, en deux minutes : Aventure → Sceaux.', { kind: 'epic', icon: 'trophy', ms: 7000 });
    } });
  }
  // Abandon : confirmation avec les conséquences exactes, puis bilan comme une défaite
  async function abandon() {
    const p = g.abandonPreview();
    if (!p) return;
    const lines = p.cursed ? ['Descente maudite : <b>tu perds tout</b> (éclats et coffres).']
      : [`Tu gardes <b>${fmt(p.shards)} éclats</b> (la moitié).`, p.free ? 'Descente libre : pas de coffre.' : p.chest ? `Coffre de fin : <b>${esc(CHESTS[p.chest].name.toLowerCase())}</b> (un rang plus bas).` : 'Pas de coffre de fin (pas encore assez profond).', p.kept ? `Les ${p.kept} coffre${p.kept > 1 ? 's' : ''} trouvé${p.kept > 1 ? 's' : ''} en route sont gardés.` : ''];
    lines.push('Ta torche reste utilisée. L’expédition compte comme une défaite.');
    if (!(await confirmBox(`<b>Abandonner l’expédition ?</b><br>${lines.filter(Boolean).map((l) => `• ${l}`).join('<br>')}`, { ok: 'Abandonner', danger: true }))) return;
    if (battle) { battle.stop(); battle = null; }
    playing = false;
    document.body.classList.remove('battle-mode');
    app.pendingProgress = [];
    try { ui.outcome = g.abandonRun(); ui.win = null; } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    app.sfx.error(); app.chrome(); render(); window.scrollTo(0, 0);
    app.flushProgress();
  }
  // Pactes de l'Abîme : trois propositions facultatives avant un combat d'élite ou de gardien
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
  // Entrée en combat ; un gardien a droit à une courte présentation (touche pour passer)
  function enterBattle() {
    window.scrollTo(0, 0);
    const run = g.descent().run;
    const key = run.battle?.bossKey;
    if (!key || app.reduced()) return battleView(run);
    const b = BOSSES[key], seen = g.s.bossesBeaten[key];
    const el = document.createElement('div');
    el.className = 'bx-intro';
    el.innerHTML = `<div class="bx-in"><span class="bx-k">Étage ${run.floor} · Gardien</span><h1>${esc(b.name)}</h1><p class="bx-t">${esc(b.title)}</p><p class="bx-p">${esc(b.intro)}</p><p class="bx-m"><b>Sa mécanique</b> ${esc(b.mechanic)}</p>${PHASE2[key] ? `<p class="bx-m"><img class="bx-ph" alt="" src="assets/ui/ph-${key}.webp"><b>À mi-vie : ${esc(PHASE2[key].name)}</b> ${esc(PHASE2[key].desc)}</p>` : ''}${seen ? `<p class="bx-m good"><b>Pour le contrer</b> ${esc(b.counter)}</p>` : ''}<span class="bx-tap">Touche pour combattre</span></div>`;
    document.body.appendChild(el);
    app.sfx.boss?.();
    let done = false;
    const go = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 300); battleView(g.descent().run); };
    el.addEventListener('click', go);
    // v295 : plus de lancement automatique — on lit à son rythme, le combat commence au toucher
  }
  function render() {
    const run = g.descent().run;
    setScene(run?.phase === 'battle' ? null : 'descent');
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    if (run.phase === 'reward') return rewardView(run);
    if (run.phase === 'battle') return battleView(run);
    if (run.phase === 'pact') return pactView(run);
    return clearedView(run);
  }

  function share() {
    const s = ui.outcome || {};
    const d = g.descent();
    const txt = `ABYSSAL · La Descente du ${new Date().toLocaleDateString('fr-FR')} : j’ai atteint l’étage ${s.floor ?? d.bestToday}${s.cursed ? ' en descente maudite' : ''} ! Tu fais mieux ? ${location.origin}${location.pathname}`;
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
    curse() { ui.cursed = !ui.cursed; render(); },
    night() { ui.nightmare = !ui.nightmare; render(); },
    // v320 : saison, classement et aide s'ouvrent dans une fenêtre (la page ne les empile plus)
    open(el) {
      const f = el.dataset.f;
      if (f === 'season') openSheet(`<h2 class="center">Saison et paliers</h2>${seasonHTML()}`, { label: 'Saison', cls: 'dc-sheet' });
      else if (f === 'board') { const sh = openSheet('<h2 class="center">Classement du jour</h2><div class="lb-body small muted">Chargement…</div>', { label: 'Classement', cls: 'dc-sheet' }); loadBoard(sh.body.querySelector('.lb-body')); }
      else openSheet(`<h2 class="center">Comment ça marche</h2><ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol><p class="small muted center">${DESCENT.torches} expéditions avec coffre par jour, puis tu peux rejouer sans coffre.</p>`, { label: 'Aide', cls: 'dc-sheet' });
    },
    optinfo() {
      openSheet(`<h2 class="center">Les modes de descente</h2>
        <p><b>${icon('skull')} Descente maudite</b><br><span class="small">Le coffre rapporté est d’une qualité au-dessus, mais si l’équipe tombe, tu ne rapportes rien.</span></p>
        <p><b>${icon('skull')} Mode Cauchemar</b><br><span class="small">${g.nightmareUnlocked() ? '' : `S’ouvre quand tu as atteint l’étage ${NIGHTMARE_AT}. `}Ennemis plus forts (+35 % PV, +25 % ATQ), gardiens déchaînés dès le début ; coffre d’une qualité au-dessus et +50 % d’éclats.</span></p>`, { label: 'Modes', cls: 'dc-sheet sheet-small' });
    },
    weekcard(el) { app.openCard(el.dataset.id); },
    news() { delete g.s.armyNews; g.persist(); render(); },
    async start() {
      if (ui.cursed && g.torchesLeft() && !(await confirmBox('Descente maudite : si toute l’équipe tombe, <b>tu ne rapportes rien</b>. Tu es sûr ?', { ok: 'Je descends', danger: true }))) return;
      try {
        g.startRun({ cursed: ui.cursed, nightmare: ui.nightmare && g.nightmareUnlocked() }); ui.outcome = null; ui.tsel = null; app.sfx.tear(); app.chrome(); render(); window.scrollTo(0, 0);
        tuto(app, 'army-doors');
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
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
      ui.win = null;
      if (out.altar) return render();
      app.sfx.coin();
      clearedView(g.descent().run, el.dataset.r === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source soigne tes créatures.</p>` : el.dataset.r === 'treasure' ? `<p class="dc-event">${icon('crystal')} +${fmt(out.shards)} éclats</p>` : out.healed ? `<p class="dc-event">${icon('star')} L’autel est muet, mais sa lumière soigne ton équipe.</p>` : '');
    },
    blesspick(el) { ui.bless = el.dataset.k; app.sfx.tap(); altarView(g.descent().run); },
    bless(el) { ui.bless = null;  try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); clearedView(g.descent().run, `<p class="dc-event">${icon('p:rule')} ${esc(BLESSINGS[el.dataset.k].name)} : ${esc(BLESSINGS[el.dataset.k].desc)}</p>`); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    unaltar() { try { g.cancelAltar(); app.sfx.tap(); render(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    abandon() { abandon(); },
    async leave() {
      if (!(await confirmBox('Remonter maintenant avec ton coffre ?', { ok: 'Remonter' }))) return;
      app.pendingProgress = [];
      ui.outcome = g.endRun(false);
      app.sfx.coin(); app.chrome(); render(); window.scrollTo(0, 0);
      app.flushProgress();
    },
    share() { share(); },
    dismiss() { ui.outcome = null; render(); },
  });
  bindBag(app, root, () => render());
  render();
  app.refreshView = () => { if (!playing) render(); };
  return () => { app.refreshView = null; if (battle) { battle.stop(); battle = null; } };
}
