// v407 : les Épreuves du jour. Trois combats par jour (combat, élite, gardien), réglés sur la force réelle du joueur ;
// une tentative chacun, une récompense par victoire. La saison du mois et le classement du jour se jouent ici.
import { RARITY } from '../config.js';
import { CHESTS } from '../core/descent.js';
import { TEAM } from '../core/army.js';
import { BOSSES } from '../core/bosses.js';
import { TRIALS } from '../core/game.js';
import { SEASON_STEPS, seasonName, seasonDaysLeft } from '../core/renown.js';
import { artUrl } from '../art/assets.js';
import { icon, picon, sigil, EMBLEM, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { chestSVG } from '../ui/chest.js';
import { setScene, sceneUrl } from '../ui/scene.js';
import { rowAttrs, shownName, bindReport } from '../ui/report.js';
import { isBlocked } from '../core/moderation.js';
import { tuto } from '../ui/tutos.js';
import { runDuel } from './duel-ui.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';

const DOOR = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss' }; /* v454 : l'Épreuve III sans gardien (élite de repli) prend la porte du Gouffre : jamais deux portes pareilles */

export default function trials(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.trials ||= { result: null, paused: false });
  let battle = null, playing = false;

  const rewardChips = (r) => [...Object.keys(r.chests || {}).map((c) => `<span class="ep-rw" style="--cc:${CHESTS[c].color}">${chestSVG(c)}<b>${esc(CHESTS[c].name)}</b></span>`), r.shards ? `<span class="ep-rw">${icon('crystal')}<b>+${fmt(r.shards)}</b></span>` : ''].join('');
  const teamStrip = (ids) => `<div class="v2-strip">${ids.map((id, i) => { const c = cat.get(id); return `<span class="v2-mini ${i >= TEAM.active ? 'res' : ''}" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"><small>${i < TEAM.active ? `Niv. ${g.cardLevel(id)}` : 'Rés.'}</small></span>`; }).join('')}</div>`;

  function cardHTML(i) {
    const x = g.trialInfo(i), t = g.trials(), cur = t.cur === i && t.battle, B = x.boss ? BOSSES[x.boss] : null;
    const state = x.state === 'won' ? `<span class="ep-st won">${icon('check')} Gagnée</span>` : x.state === 'lost' ? `<span class="ep-st lost">${icon('close')} Perdue</span>` : cur ? '<span class="ep-st cur">En cours</span>' : '';
    return `<article class="ep-c r-${x.room} ${x.state || ''}" style="--art:url(${sceneUrl(i === 2 && x.room !== 'boss' ? 'door-gouffre' : DOOR[x.room])})">
      <span class="ep-art"></span>
      <div class="ep-body"><span class="ep-k">Épreuve ${['I', 'II', 'III'][i]} · ${esc(x.room === 'boss' ? 'Gardien' : x.room === 'elite' ? 'Élite' : 'Combat')}</span>
        <b>${esc(B ? B.name : TRIALS[i].room === 'boss' ? 'Une élite redoutable' : TRIALS[i].name)}</b>
        <span class="small muted">${B ? esc(B.title) : TRIALS[i].room === 'boss' ? 'Bats ton premier gardien dans la Descente : il viendra ici.' : x.room === 'elite' ? 'Une créature d’élite et sa garde' : 'Des créatures corrompues'} · force de l’étage ${x.floor}</span>
        <div class="ep-rws">${x.state === 'lost' ? '<span class="small muted">Pas de récompense aujourd’hui.</span>' : rewardChips(x.reward)}</div>
        ${state}
        ${!x.state ? `<button class="btn ${cur ? 'gold' : 'primary'} block dc-plq ${cur ? 'dc-plq-dark' : 'dc-plq-red'}" data-act="go" data-i="${i}" ${g.team().length >= TEAM.active ? '' : 'disabled'}>${icon('swords')}${cur ? 'Reprendre le combat' : 'Combattre'}</button>` : ''}
      </div></article>`;
  }

  function resultHTML(r) {
    return `<section class="dc-sum2 ep-res ${r.won ? 'won' : 'lost'}">
      ${crestHTML(r.won, ['I', 'II', 'III'][r.i], 'Épreuve', 'dc-sum2-crest')}
      <h2>${r.won ? 'Épreuve gagnée' : 'Épreuve perdue'}</h2>
      <p class="dc-sum2-sub">${r.won ? `+${r.points} points au classement du jour.` : 'Elle reviendra demain, avec de nouveaux ennemis.'}</p>
      ${r.won && r.reward ? `<div class="ep-rws center">${rewardChips(r.reward)}</div>` : ''}
      ${r.won && r.reward?.chests ? `<a class="btn primary block dc-plq dc-plq-red" href="#/coffres">${icon('p:chest')}Ouvrir mon coffre</a>` : ''}
      ${r.firstWin ? `<p class="vx-week vx-first">${icon('star')} <b>Ta toute première victoire !</b> L’Abysse t’offre <b>+${fmt(r.firstWin)} éclats</b>.</p>` : ''}
      ${r.report?.length ? `<div class="dc-why"><b>${icon('info')} Ce qui s’est passé</b>${r.report.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="dc-sum2-row"><button class="btn dc-plq dc-plq-dark" data-act="dismiss">Continuer</button></div></section>`;
  }

  function seasonHTML() {
    const se = g.season(), left = seasonDaysLeft(g.clock()), max = SEASON_STEPS[SEASON_STEPS.length - 1].wins;
    const rw = (r) => (r.shards ? `${icon('crystal')}${fmt(r.shards)}` : Object.keys(r.chests).map((c) => chestSVG(c)).join(''));
    return `<section class="panel dc-season"><div class="dc-season-h"><img class="dc-season-ic" alt="" src="assets/icons/season.webp" onerror="this.remove()"><span><b>${esc(seasonName(se.id))}</b><span class="small muted">Épreuves gagnées ce mois : ${se.best || 0} · fin dans ${left} jour${left > 1 ? 's' : ''}</span></span></div>
      <div class="dc-season-track"><i style="width:${Math.min(100, ((se.best || 0) / max) * 100)}%"></i></div>
      <ol class="dc-season-steps">${SEASON_STEPS.map((st) => { const ok = se.claimed.includes(st.wins); return `<li class="${ok ? 'ok' : ''}"><span class="dc-season-rw">${ok ? icon('check') : rw(st.reward)}</span><small>${st.wins} victoires</small></li>`; }).join('')}</ol>
      <p class="small muted">Chaque Épreuve gagnée ce mois-ci compte. Chaque palier se gagne une fois par saison ; tout repart à zéro le 1er du mois.</p></section>`;
  }

  async function loadBoard(box) {
    if (!box) return;
    if (!cloud.isLoggedIn()) { box.innerHTML = 'Connecte-toi pour comparer ton score avec les joueurs du monde entier. <a href="#/compte">Se connecter</a>'; return; }
    try {
      const day = g.trials().day;
      const rows = await cloud.leaderboard(day, 30);
      if (!document.contains(box)) return;
      const me = cloud.currentUser()?.id, mine = g.trials().score || 0;
      box.classList.remove('muted');
      box.innerHTML = (rows.length ? rows.map((r, i) => {
        const hid = isBlocked(r.user_id), av = !hid && r.profiles?.avatar && cat.get(r.profiles.avatar);
        return `<div class="lb-row ${r.user_id === me ? 'me' : ''}"${rowAttrs(r.user_id, r.profiles?.pseudo, me)}><span class="lb-rank">${i + 1}</span><span class="lb-av">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${esc(shownName(r.user_id, r.profiles?.pseudo))}${hid ? '' : cloud.badgeHTML(r.profiles?.badge)}${!hid && r.profiles?.title === 'Vainqueur de l’Abysse' ? '<span class="pbadge pb-abysse">Fond de l’Abysse</span>' : ''}</b><span class="small muted">${hid ? '' : esc(r.profiles?.title || '')}</span></span><span class="lb-floor">${fmt(r.floor)} pts</span></div>`;
      }).join('') : '<p class="small muted">Personne n’a encore joué aujourd’hui. À toi d’ouvrir la voie !</p>')
        + (!sync.profile?.pseudo ? '<p class="small acc-warn"><a href="#/compte">Choisis un pseudo</a> pour apparaître au classement.</p>' : !rows.some((r) => r.user_id === me) && mine ? `<p class="small muted">Ton score aujourd’hui : ${mine} points.</p>` : '');
      bindReport(box, () => loadBoard(box));
    } catch (e) { if (document.contains(box)) box.textContent = e.message; }
  }

  function list() {
    const t = g.trials(), team = g.team(), wins = t.done.filter((x) => x === 'won').length, r = g.rule();
    root.innerHTML = `<header class="screen-head dc-head ui-hero bn-trial"><h1>Les Épreuves du jour</h1><p class="muted">${wins} sur 3 gagnée${wins > 1 ? 's' : ''} · ${fmt(t.score || 0)} points</p></header>
      ${ui.result ? resultHTML(ui.result) : ''}
      <p class="small muted center ep-intro">Les ennemis sont réglés sur tes <b>meilleures cartes</b> : ni trop faciles, ni impossibles. Une seule tentative par Épreuve ; elles reviennent à minuit.</p>
      ${team.length < TEAM.active ? `<p class="small center ep-need">Il te faut au moins ${TEAM.active} créatures dans ton équipe pour combattre : ouvre tes boosters (onglet Butin), puis compose ton équipe.</p>` : ''}
      <div class="ep-list">${TRIALS.map((_, i) => cardHTML(i)).join('')}</div>
      <section class="panel ep-team">${teamStrip(team)}<div class="dc-teambtns"><a class="btn small ghost dc-plq dc-plq-dark" href="#/equipe">${icon('p:team-ic')}Mon équipe</a><a class="btn small ghost dc-plq dc-plq-dark" href="#/renfort">${icon('p:level-up')}Renforcer</a></div></section>
      ${r.off ? '' : `<section class="panel dc-rule bn-rule" style="--rf:${r.faction ? cat.faction[r.faction].colors.secondary : 'var(--gold)'}"><span class="dc-rule-ic">${r.faction ? sigil(r.faction) : picon('rule')}</span><span><span class="small muted">Règle du jour</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span></section>`}
      <div class="dc-links">
        <button class="dc-link" data-act="open" data-f="season">${picon('season')}<b>Saison</b><small>paliers du mois</small></button>
        <button class="dc-link" data-act="open" data-f="board">${picon('crown')}<b>Classement</b><small>du jour</small></button>
        <button class="dc-link" data-act="open" data-f="how">${picon('help')}<b>Comment ça marche</b><small>les Épreuves</small></button>
      </div>`;
  }

  function battleView() {
    if (battle) return;
    const run = g.trialRun();
    if (!run) return list();
    playing = true;
    const i = g.trials().cur;
    battle = runDuel(app, root, { title: `Épreuve ${['I', 'II', 'III'][i]} · ${TRIALS[i].short}`, run, pause: 'Combat en pause : il t’attend dans les Épreuves.',
      onAbandon: () => abandon(),
      onPause: () => { if (battle) { battle.stop(); battle = null; } playing = false; ui.paused = true; app.chrome(); render(); window.scrollTo(0, 0); },
      onEnd: () => {
        battle = null; playing = false;
        app.pendingProgress = [];
        let out;
        try { out = g.finishTrial(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
        app.chrome();
        if (out.won) app.sfx.reveal(out.i === 2 ? 'M' : 'R'); else app.sfx.error();
        ui.result = out; render(); window.scrollTo(0, 0);
        app.flushProgress();
      } });
  }
  async function abandon() {
    if (!(await confirmBox('<b>Abandonner cette Épreuve ?</b><br>Elle comptera comme perdue pour aujourd’hui.', { ok: 'Abandonner', danger: true }))) return;
    if (battle) { battle.stop(); battle = null; }
    playing = false;
    document.body.classList.remove('battle-mode');
    app.pendingProgress = [];
    try { ui.result = g.abandonTrial(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    app.sfx.error(); app.chrome(); render(); window.scrollTo(0, 0);
    app.flushProgress();
  }

  function render() {
    const t = g.trials();
    const inBattle = !!t.battle && !ui.paused;
    setScene(inBattle ? null : 'descent');
    if (!t.battle) ui.paused = false;
    if (inBattle) return battleView();
    list();
  }

  bindActions(root, {
    go(el) {
      if (playing) return;
      const i = +el.dataset.i, t = g.trials();
      if (t.battle && t.cur === i) { ui.paused = false; ui.result = null; app.sfx.tap(); return render(); }
      try { g.startTrial(i); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      ui.result = null; ui.paused = false; app.sfx.tear?.(); window.scrollTo(0, 0); render();
    },
    dismiss() { ui.result = null; render(); },
    open(el) {
      const f = el.dataset.f;
      if (f === 'season') openSheet(`<h2 class="center">Saison et paliers</h2>${seasonHTML()}`, { label: 'Saison', cls: 'dc-sheet' });
      else if (f === 'board') { const sh = openSheet('<h2 class="center">Classement du jour</h2><p class="small muted center">Chaque Épreuve gagnée rapporte 100 points, plus 1 point par pour cent de PV qui restent à ton équipe.</p><div class="lb-body small muted">Chargement…</div>', { label: 'Classement', cls: 'dc-sheet' }); loadBoard(sh.body.querySelector('.lb-body')); }
      else openSheet(`<h2 class="center">Les Épreuves du jour</h2><ol class="how-steps">${[
        ['swords', '#E0485E', 'Trois combats', 'Chaque jour : un combat, une élite et un gardien que tu as déjà vaincu dans la Descente. Ton équipe commence chaque Épreuve avec tous ses PV.'],
        ['level-up', '#7FA8D8', 'À ta mesure', 'La force des ennemis suit tes 5 meilleures cartes (rareté et niveau), même si elles ne sont pas dans ton équipe. Renforcer tes créatures rend les Épreuves plus dures, mais aussi mieux payées quand tu avances dans la Descente.'],
        ['chest', '#E8C35A', 'Une récompense par victoire', 'Chaque Épreuve gagnée donne un coffre et des éclats ; le coffre grandit avec ta progression dans la Descente. Une seule tentative : une Épreuve perdue revient demain.'],
        ['crown', '#B04BFF', 'Saison et classement', 'Tes victoires du mois font avancer la saison (paliers récompensés). Le classement du jour compte tes points : 100 par victoire, plus les PV qui restent à ton équipe.'],
      ].map(([ic, c, t2, d], k) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${k + 1}</em></span><span><b>${t2}</b><span class="small">${d}</span></span></li>`).join('')}</ol>`, { label: 'Aide', cls: 'dc-sheet' });
    },
  });
  render();
  tuto(app, 'trials', { force: false });
  app.refreshView = () => { if (!playing) render(); };
  return () => { app.refreshView = null; if (battle) { battle.stop(); battle = null; } };
}
