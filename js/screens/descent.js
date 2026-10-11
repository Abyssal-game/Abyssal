// L'Aventure (la Descente) : ton équipe de cartes descend dans l'Abysse, étage par étage,
// affronte les créatures corrompues en duel et rapporte un coffre plein de boosters.
import { RARITY } from '../config.js';
import { DESCENT, ROOMS, BLESSINGS, CHESTS, chestForDepth } from '../core/descent.js';
import { TEAM, BUDGET } from '../core/army.js';
import { BOSS_POWERS, bossPowerOf } from '../core/duel.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { bagHTML, bindBag } from './items.js';
import { runDuel } from './duel-ui.js';
import { setScene, sceneUrl } from '../ui/scene.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';

// Illustrations des portes et des bonus
const DOOR_ART = { fight: 'door-fight', elite: 'door-elite', boss: 'door-boss', rest: 'rest', altar: 'altar', treasure: 'treasure' };
const HOW = [['cards', '#7FA8D8', 'Ton équipe', '5 de tes cartes : 3 au combat, 2 en réserve. Chaque doublon les fait monter de niveau.'], ['swords', '#E0485E', 'Le duel', 'Touche ta carte, puis l’ennemi. La cible riposte. Ensuite, « Fin du tour ».'], ['dodge', '#9FE0FF', 'Esquive et réserve', 'Pendant le tour ennemi, touche au bon moment pour esquiver. Une fois par tour, échange une carte avec la réserve.'], ['book', '#B48CFF', 'Connaître l’ennemi', 'Posséder la carte d’une créature corrompue donne +1 dégât contre elle.'], ['depth', '#F2C14E', 'Chaque étage', 'Combat simple ou élite, puis un bonus au choix : source, autel ou trésor. Gardien tous les 5 étages.'], ['chest', '#E8C35A', 'Le coffre', 'Remonte quand tu veux : plus tu descends, plus le coffre est beau [bois, fer, or, abyssal].']];
const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };

export default function descent(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.descent ||= { cursed: false, outcome: null });
  let battle = null, playing = false;

  const teamStrip = (ids, run) => `<div class="v2-strip">${ids.map((id, i) => { const c = cat.get(id); const m = run?.team.find((x) => x.id === id); return `<span class="v2-mini ${i >= TEAM.active ? 'res' : ''} ${m?.fallen ? 'fallen' : ''}" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}">${m ? `<span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span>` : `<small>${i < TEAM.active ? `Niv. ${g.cardLevel(id)}` : 'Rés.'}</small>`}</span>`; }).join('')}</div>`;
  const ruleHTML = (r) => `<section class="panel dc-rule bn-rule" style="--rf:${r.faction ? cat.faction[r.faction].colors.secondary : 'var(--gold)'}"><span class="dc-rule-ic">${r.faction ? sigil(r.faction) : icon('star')}</span><span><span class="small muted">Règle du jour</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span></section>`;
  const chestChip = (c) => (c ? `<span class="v2-chest-chip" style="--cc:${CHESTS[c].color}">${icon('lock')} ${esc(CHESTS[c].name)}</span>` : '<span class="v2-chest-chip none">aucun coffre</span>');

  // ——— Accueil de l'Aventure ———————————————————————————————————————————
  function lobby() {
    const d = g.descent(), torches = g.torchesLeft(), last = ui.outcome, team = g.team(), chests = g.chestCount();
    const news = g.s.armyNews;
    root.innerHTML = `<header class="screen-head dc-head"><h1>La Descente</h1><p class="muted">${d.best ? `Ton record : étage ${d.best}${d.bestToday ? ` · aujourd’hui : ${d.bestToday}` : ''}` : 'Descends, survis, rapporte un coffre.'}</p></header>
      ${news ? `<section class="panel ornate dc-news"><div class="dc-new-h"><span class="dc-new-ic">${icon('sparkle')}</span><span><b>Tes cartes combattent !</b><span class="small">Les héros ont quitté l’Abysse : ce sont maintenant tes créatures qui descendent. Chaque doublon fait monter une carte de niveau.</span>${news.shards ? `<span class="small">Ton ancien équipement et l’expérience de tes héros ont été changés en <b>${fmt(news.shards)} éclats</b>. Tes coffres sont gardés : ils contiennent maintenant des boosters.</span>` : ''}</span></div><button class="btn small ghost" data-act="news">OK</button></section>` : ''}
      ${last ? summaryHTML(last) : ''}
      ${chests ? `<a class="panel dc-chests" href="#/coffres"><span class="dc-new-ic">${icon('lock')}</span><span><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Pleins de boosters</span></span>${icon('next')}</a>` : ''}
      ${ruleHTML(g.rule())}
      ${weeklyHTML()}
      <section class="panel dc-go">
        <div class="dc-banner bn-expedition"><b>Expédition</b><span class="small">${d.best ? `Record : étage ${d.best}` : 'Ta première descente t’attend'}</span></div>
        <div class="dc-go-top"><span class="dc-torches">${Array.from({ length: DESCENT.torches }, (_, i) => `<i class="${i < torches ? 'on' : ''}">${icon('flame')}</i>`).join('')}</span><span class="small muted">${torches ? `${torches} expédition${torches > 1 ? 's' : ''} avec coffre aujourd’hui` : 'Expéditions du jour faites : tu peux rejouer, sans coffre'}</span></div>
        ${teamStrip(team)}
        <p class="small muted center">Pouvoir : <b>${esc(g.ultimate(team).name)}</b> · budget ${g.teamCost(team)} / ${BUDGET}</p>
        <a class="btn small ghost block" href="#/equipe">${icon('user')}Modifier l’équipe</a>
        ${team.length < TEAM.active ? `<p class="small v2-warn center">${icon('info')} Ajoute au moins ${TEAM.active} créatures à ton équipe pour descendre.</p>` : ''}
        <button class="btn ${ui.cursed && torches ? 'danger' : 'primary'} block big-cta" data-act="start" ${team.length >= TEAM.active ? '' : 'disabled'}>${icon('flame')}${torches ? 'Descendre' : 'Descendre (sans coffre)'}</button>
        ${torches ? `<div class="dc-curse-row ${ui.cursed ? 'on' : ''}"><span><b>${icon('skull')} Descente maudite</b><span class="small muted">coffre d’une qualité au-dessus, mais rien si l’équipe tombe</span></span><button class="switch" role="switch" aria-checked="${ui.cursed}" data-act="curse" aria-label="Descente maudite"><i></i></button></div>` : ''}
      </section>
      ${Object.values(g.s.items).some((n) => n > 0) ? bagHTML(g) : ''}
      <details class="panel dc-fold bn-ranking" id="lb"><summary>${icon('trophy')} Classement du jour</summary><div class="lb-body small muted">Chargement…</div></details>
      <details class="panel dc-fold dc-how"><summary>${icon('info')} Comment ça marche</summary>
        <ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol>
        <p class="small muted center">${DESCENT.torches} expéditions avec coffre par jour, puis tu peux rejouer sans coffre.</p></details>`;
    root.querySelector('#lb').addEventListener('toggle', (e) => { if (e.target.open) loadBoard(); }, { once: true });
  }

  // Créature de la semaine
  function weeklyHTML() {
    const w = g.weekly(), c = cat.get(w.id);
    return `<section class="panel dc-week ${w.done ? 'done' : ''}" data-act="weekcard" data-id="${c.id}"><span class="dc-week-art" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"></span>
      <span><span class="small muted">Créature de la semaine</span><b>${esc(c.name)}</b><span class="small">${w.done ? `${icon('check')} Vaincue : sa carte est à toi ! Nouvelle créature lundi.` : 'Elle rôde dans l’Abysse, comme <b>élite</b> à partir de l’étage 3. Vaincs-la pour gagner sa carte.'}</span></span></section>`;
  }
  function summaryHTML(s) {
    return `<section class="panel ornate dc-sum ${s.wiped ? 'lost' : 'won'}"><h2>${s.wiped ? 'L’équipe est tombée' : 'Retour à la surface'}</h2><p class="dc-depth">Étage <b>${s.floor}</b></p>
      <p class="small">${s.chests.length ? s.chests.map((c) => chestChip(c)).join(' ') : 'Aucun coffre cette fois.'} ${s.shards ? `· ${icon('crystal')} ${fmt(s.shards)} éclats` : ''}</p>
      ${s.chests.length ? `<a class="btn gold block" href="#/coffres">${icon('lock')}Ouvrir mes coffres</a>` : ''}
      <div class="row gap"><button class="btn small ghost" data-act="share">${icon('copy')}Partager</button><button class="btn small ghost" data-act="dismiss">OK</button></div></section>`;
  }

  async function loadBoard() {
    const box = root.querySelector('#lb .lb-body');
    if (!box) return;
    if (!cloud.isLoggedIn()) { box.innerHTML = 'Connecte-toi pour comparer ton étage avec les joueurs du monde entier. <a href="#/compte">Se connecter</a>'; return; }
    try {
      const day = g.descent().day;
      const rows = await cloud.leaderboard(day, 30);
      if (!root.contains(box)) return;
      const me = cloud.currentUser()?.id;
      const mine = g.descent().bestToday;
      box.classList.remove('muted');
      box.innerHTML = (rows.length ? rows.map((r, i) => {
        const av = r.profiles?.avatar && cat.get(r.profiles.avatar);
        return `<div class="lb-row ${r.user_id === me ? 'me' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-av">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${esc(r.profiles?.pseudo || '?')}${cloud.badgeHTML(r.profiles?.badge)}</b><span class="small muted">${esc(r.profiles?.title || '')}</span></span><span class="lb-floor">${r.cursed ? `${icon('skull')} ` : ''}Étage ${r.floor}</span></div>`;
      }).join('') : '<p class="small muted">Personne n’est encore descendu aujourd’hui. À toi d’ouvrir la voie !</p>')
        + (!sync.profile?.pseudo ? '<p class="small acc-warn"><a href="#/compte">Choisis un pseudo</a> pour apparaître au classement.</p>' : !rows.some((r) => r.user_id === me) && mine ? `<p class="small muted">Ton meilleur étage aujourd’hui : ${mine}.</p>` : '');
    } catch (e) { if (root.contains(box)) box.textContent = e.message; }
  }

  // ——— Expédition ———————————————————————————————————————————————————
  const runHead = (run) => `<header class="dc-run-head"><div><span class="small muted">${run.free ? 'Descente libre (sans coffre)' : run.cursed ? `<span class="dc-bad">${icon('skull')} Maudite</span>` : 'La Descente'}</span><h1>Étage ${run.floor}</h1></div><div class="dc-loot"><span>${icon('crystal')}${fmt(run.shards)}</span>${run.chests.length ? `<span>${icon('lock')}${run.chests.length}</span>` : ''}</div></header>
    ${teamStrip(run.team.map((m) => m.id), run)}
    <p class="dc-rule-line small">${icon('star')} <b>${esc(g.rule(run.day).name)}</b> · ${esc(g.rule(run.day).desc)}</p>`;
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">${doors.includes('boss') ? 'Un gardien barre la route.' : doors.length > 1 ? 'Deux passages. Le plus dangereux rapporte plus.' : 'Des créatures barrent le passage.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r} has-art" data-act="door" data-r="${r}" style="--art:url(${sceneUrl(DOOR_ART[r])})"><span class="dc-door-art"></span><span class="dc-door-ic">${icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${r === 'boss' ? `<b class="dc-bad">${esc(BOSS_POWERS[bossPowerOf(run.floor)].name)}</b> : ${esc(BOSS_POWERS[bossPowerOf(run.floor)].desc)}` : r === 'elite' && run.floor >= 3 && !g.weekly().done ? `${ROOMS[r].desc} <b class="dc-good">La créature de la semaine t’y attend !</b>` : ROOMS[r].desc}</span></button>`).join('')}</div>
      ${run.cleared ? `<button class="btn ghost block" data-act="leave">${icon('back')}Remonter</button>` : ''}`;
  }
  function clearedView(run, extra = '') {
    const now = g.chestNow(run), next = run.free ? null : chestForDepth(run.floor + 1);
    const alive = run.team.some((m) => !m.fallen);
    root.innerHTML = `${runHead(run)}${extra}
      <section class="panel dc-risk"><div><span class="small muted">Si tu remontes</span>${chestChip(now)}<span class="small muted">${icon('crystal')} ${fmt(run.shards)} éclats</span></div>
        <div><span class="small muted">Étage ${run.floor + 1}${(run.floor + 1) % DESCENT.bossEvery === 0 ? ' · gardien' : ''}</span>${run.free ? '<span class="small">Descente libre</span>' : `<span class="small">${next !== chestForDepth(run.floor) ? `Coffre amélioré : ${esc(CHESTS[next].name)}` : 'Même coffre'}</span>`}<span class="small muted">Si l’équipe tombe : ${run.cursed ? 'tout est perdu' : 'coffre d’une qualité en dessous'}</span></div></section>
      <div class="dc-choice">${alive ? `<button class="btn primary block big-cta" data-act="next">${icon('next')}Descendre à l’étage ${run.floor + 1}</button>` : ''}<button class="btn block" data-act="leave">${icon('back')}Remonter avec le coffre</button></div>`;
  }
  // Bonus choisi après une victoire
  function rewardView(run, extra = '') {
    root.innerHTML = `${runHead(run)}${extra}<p class="dc-prompt">Choisis ton bonus.</p>
      <div class="dc-doors ${run.rewards.length > 2 ? 'three' : ''}">${run.rewards.map((r) => `<button class="dc-door r-${r} has-art" data-act="reward" data-r="${r}" style="--art:url(${sceneUrl(DOOR_ART[r])})"><span class="dc-door-art"></span><span class="dc-door-ic">${icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${r === 'treasure' ? `+${fmt(Math.round((15 + run.floor * 6) * (run.free ? 0.5 : 1)))} éclats environ` : ROOMS[r].desc}</span></button>`).join('')}</div>`;
  }
  function altarView(run) {
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">L’autel murmure. Choisis une bénédiction.</p>
      <div class="dc-altar">${run.altar.map((k) => `<button class="dc-bl" data-act="bless" data-k="${k}"><span>${icon('star')}</span><b>${esc(BLESSINGS[k].name)}</b><span class="small">${esc(BLESSINGS[k].desc)}</span></button>`).join('')}</div>`;
  }
  function battleView(run) {
    if (battle) return;
    playing = true;
    const title = `Étage ${run.floor}${run.room === 'boss' ? ' · Gardien' : run.room === 'elite' ? ' · Élite' : ''}`;
    battle = runDuel(app, root, { title, onEnd: () => {
      battle = null; playing = false;
      app.pendingProgress = [];
      let out;
      try { out = g.finishBattle(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
      app.chrome();
      if (out.lost) { app.sfx.error(); ui.outcome = out.summary; render(); }
      else {
        app.sfx.reveal(out.room === 'boss' ? 'M' : 'R');
        const disc = out.discovered.map((id) => cat.get(id)?.name).filter(Boolean);
        rewardView(g.descent().run, `<p class="dc-event dc-win">${icon('swords')} <b>Victoire !</b> +${fmt(out.shards)} éclats${out.chest ? ` · <b>${esc(CHESTS[out.chest].name)}</b> gagné !` : ''}${disc.length ? `<br><span class="small">${icon('book')} Première rencontre : ${disc.map(esc).join(', ')}</span>` : ''}${out.weekly ? `<br><b class="dc-good">${icon('sparkle')} Créature de la semaine vaincue : ${esc(cat.get(out.weekly.id).name)} rejoint ta collection !</b>` : ''}</p>`);
      }
      window.scrollTo(0, 0);
      app.flushProgress();
    } });
  }
  function render() {
    const run = g.descent().run;
    setScene(run?.phase === 'battle' ? null : 'descent');
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    if (run.phase === 'reward') return rewardView(run);
    if (run.phase === 'battle') return battleView(run);
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
    curse() { ui.cursed = !ui.cursed; render(); },
    weekcard(el) { app.openCard(el.dataset.id); },
    news() { delete g.s.armyNews; g.persist(); render(); },
    async start() {
      if (ui.cursed && g.torchesLeft() && !(await confirmBox('Descente maudite : si toute l’équipe tombe, <b>tu ne rapportes rien</b>. Tu es sûr ?', { ok: 'Je descends', danger: true }))) return;
      try {
        g.startRun({ cursed: ui.cursed }); ui.outcome = null; app.sfx.tear(); app.chrome(); render(); window.scrollTo(0, 0);
        coach(app, 'army-doors', 'Choisis une porte à chaque étage. Plus tu descends, plus le <b>coffre</b> que tu rapporteras est beau. Tu peux <b>remonter</b> après chaque étage pour garder ton coffre.', { title: 'La Descente' });
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    door(el) {
      if (playing) return;
      let out;
      try { out = g.chooseDoor(el.dataset.r); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      if (out.battle) { window.scrollTo(0, 0); return battleView(g.descent().run); }
      render();
    },
    reward(el) {
      let out;
      try { out = g.chooseReward(el.dataset.r); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      if (out.altar) return render();
      app.sfx.coin();
      clearedView(g.descent().run, el.dataset.r === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source soigne tes créatures.</p>` : el.dataset.r === 'treasure' ? `<p class="dc-event">${icon('crystal')} +${fmt(out.shards)} éclats</p>` : out.healed ? `<p class="dc-event">${icon('star')} L’autel est muet, mais sa lumière soigne ton équipe.</p>` : '');
    },
    bless(el) { try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); clearedView(g.descent().run, `<p class="dc-event">${icon('star')} ${esc(BLESSINGS[el.dataset.k].name)} : ${esc(BLESSINGS[el.dataset.k].desc)}</p>`); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
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
