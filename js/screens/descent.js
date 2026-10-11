// La Descente : équipe, expédition étage par étage, combats animés, butin.
import { DESCENT, ROOMS, BLESSINGS } from '../core/descent.js';
import { HEROES, HERO_ORDER, INVOCATIONS, INVOCATION_ORDER } from '../core/heroes.js';
import { heroCardHTML, heroArtUrl, invocationCardHTML } from '../ui/hero.js';
import { openHero, openInvocation, fillInvocationArt } from './heroes.js';
import { lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, confirmBox, bindActions } from '../ui/dom.js';
import { bagHTML, bindBag } from './items.js';
import { runBattle } from './battle-ui.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { EMBLEM, sigil } from '../ui/icons.js';
import { CHESTS, KEYS } from '../core/gear.js';

// Coffres et clés d'un butin, en texte
const chestText = (l = {}, plus = '') => [...Object.entries(l.chests || {}).filter(([, n]) => n).map(([t, n]) => `${plus}${n} ${CHESTS[t].name.toLowerCase()}`), ...Object.entries(l.keys || {}).filter(([, n]) => n).map(([t, n]) => `${plus}${n} ${KEYS[t].name.toLowerCase()}`)];
const chestN = (l = {}) => Object.values(l.chests || {}).reduce((a, b) => a + b, 0);

const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function descent(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.descent ||= { cursed: false, speed: 1, outcome: null });
  let playing = false, skip = false;

  const chestsWaiting = () => Object.values(g.arsenal().chests).reduce((a, n) => a + n, 0);
  // ——— Accueil de la Descente ——————————————————————————————————————————
  function lobby() {
    const d = g.descent();
    const party = g.s.party.filter((k) => g.s.heroes[k]);
    const torches = g.torchesLeft();
    const last = ui.outcome;
    const danger = g.floorDanger(1);
    const news = g.takeHeroNews();
    const pactNews = g.s.pactNews; if (pactNews) { g.s.pactNews = false; g.persist(); }
    const inv = INVOCATIONS[g.s.invocation] || INVOCATIONS.phenix;
    const ready = torches && party.length === DESCENT.teamSize;
    root.innerHTML = `
      <header class="screen-head dc-head"><h1>La Descente</h1><p class="muted">${d.best ? `Ton record : étage ${d.best}${d.bestToday ? ` · aujourd’hui : ${d.bestToday}` : ''}` : 'Chaque jour, l’Abysse change de visage.'}</p></header>
      ${last ? summaryHTML(last) : ''}
      ${pactNews ? `<section class="panel ornate dc-news"><div class="dc-new-h"><span class="dc-new-ic">${icon('sparkle')}</span><span><b>Les pactes sont débloqués !</b><span class="small">Chaque héros peut maintenant se lier à une de tes cartes : sa faction donne l’effet, sa rareté le renforce.</span><span class="small muted">Aventure, puis Héros : touche un héros, puis « Pacte ».</span></span></div></section>` : ''}
      ${news.length ? `<section class="panel ornate dc-news">${news.map((k) => `<div class="dc-new-h" style="--hc:${HEROES[k].color}"><img alt="" src="${heroArtUrl(k)}"><span><b>${esc(HEROES[k].name)} rejoint ton équipe !</b><span class="small">${esc(HEROES[k].cls)} · ${esc(HEROES[k].role)}</span></span></div>`).join('')}<p class="small muted">Touche « Modifier » pour l’emmener avec toi.</p></section>` : ''}
      <section class="panel dc-go">
        <div class="dc-go-top"><span class="dc-torches">${Array.from({ length: DESCENT.torches }, (_, i) => `<i class="${i < torches ? 'on' : ''}">${icon('flame')}</i>`).join('')}</span><span class="small muted">${torches ? `${torches} expédition${torches > 1 ? 's' : ''} possible${torches > 1 ? 's' : ''} aujourd’hui` : 'Plus de torche : reviens demain'}</span></div>
        <div class="dc-team">
          ${party.map((k) => `<span class="dc-tm" style="--hc:${HEROES[k].color}"><img alt="" src="${heroArtUrl(k)}">${g.pactFor(k) ? `<span class="dc-pact">${sigil(g.pactCard(k).faction)}</span>` : ''}<b>${esc(HEROES[k].name.split(' ')[0])}</b><small>Niv. ${g.heroLevel(k)}${g.heroWounded(k) ? ' · blessé' : ''}</small></span>`).join('')}
          ${Array.from({ length: DESCENT.teamSize - party.length }, () => '<span class="dc-tm empty"><i>+</i><small>Héros</small></span>').join('')}
          <span class="dc-tm inv" style="--hc:${inv.color}"><span class="ic-art" data-card="${inv.card}"></span><b>${esc(inv.name)}</b><small>Invocation</small></span>
        </div>
        <button class="btn small ghost block" data-act="team">${icon('user')}Modifier l’équipe</button>
        <button class="btn ${ui.cursed ? 'danger' : 'primary'} block big-cta" data-act="start" ${ready ? '' : 'disabled'}>${icon('flame')}${torches ? 'Descendre' : 'Reviens demain'}</button>
        <div class="dc-curse-row ${ui.cursed ? 'on' : ''}"><span><b>${icon('skull')} Descente maudite</b><span class="small muted">butin doublé, mais tout est perdu si l’équipe tombe</span></span>
          <button class="switch" role="switch" aria-checked="${ui.cursed}" data-act="curse" aria-label="Descente maudite"><i></i></button></div>
        <p class="small muted center">${party.length < DESCENT.teamSize ? `Choisis ${DESCENT.teamSize} héros.` : `Premier étage : créatures niveau ${danger.level}`}</p>
      </section>
      <div class="dc-tiles">
        <a class="dc-tile" href="#/heros">${icon('swords')}<b>Héros</b></a>
        <a class="dc-tile" href="#/arsenal">${icon('shield')}<b>Arsenal</b>${chestsWaiting() ? `<span class="badge">${chestsWaiting()}</span>` : ''}</a>
        <a class="dc-tile" href="#/marchand">${icon('heart')}<b>Marchand</b></a>
      </div>
      <details class="panel dc-fold" id="lb"><summary>${icon('trophy')} Classement du jour</summary><div class="lb-body small muted">Chargement…</div></details>
      <details class="panel dc-fold"><summary>${icon('info')} Comment ça marche</summary>
        <ul class="small">
          <li>${DESCENT.torches} expéditions par jour. Le donjon est le même pour tout le monde ce jour-là.</li>
          <li>Tes <b>3 héros</b> affrontent les créatures du Bestiaire, de plus en plus fortes en profondeur. Ils gagnent des niveaux à chaque expédition.</li>
          <li>Les ennemis <b>annoncent</b> leur prochaine action. Quand l’un d’eux prépare un gros coup, interromps-le, protège la cible ou <b>pare</b> au bon moment.</li>
          <li>La <b>jauge d’invocation</b> se remplit en combat : pleine, elle appelle ton invocation.</li>
          <li>Les salles au trésor, les élites et les gardiens donnent des <b>coffres</b> pour équiper tes héros (Arsenal).</li>
          <li>Après chaque étage : <b>remonter</b> avec le butin, ou <b>descendre</b>. Si l’équipe tombe, tu perds la moitié des éclats et les coffres trouvés.</li>
          <li>De nouveaux héros te rejoignent en descendant : Kaël (étage 3), Thalia (6), Lucien (9), Ossian (12).</li>
        </ul></details>`;
    fillInvocationArt(app, root);
    root.querySelector('#lb').addEventListener('toggle', (e) => { if (e.target.open) loadBoard(); }, { once: true });
  }

  // Composition de l'équipe et choix de l'invocation, dans une fenêtre
  function teamSheet() {
    const sh = openSheet('', { label: 'Équipe', onClose: () => render() });
    const draw = () => {
      const party = g.s.party.filter((k) => g.s.heroes[k]);
      sh.setContent(`<h2>Ton équipe <span class="small muted">${party.length} / ${DESCENT.teamSize}</span></h2>
        <p class="small muted">Touche un héros pour l’ajouter ou le retirer.</p>
        <div class="hc-grid dc-party">${HERO_ORDER.filter((k) => g.s.heroes[k]).map((k) => heroCardHTML(g, k, { selected: party.includes(k), order: party.indexOf(k) + 1 })).join('')}</div>
        <h3 class="section-title">Invocation</h3>
        <div class="ic-grid">${INVOCATION_ORDER.map((k) => invocationCardHTML(g, k, { selected: g.s.invocation === k })).join('')}</div>
        <button class="btn primary block" data-close>Valider</button>`);
      fillInvocationArt(app, sh.body);
    };
    sh.body.addEventListener('click', (e) => {
      const h = e.target.closest('[data-hero]');
      if (h) {
        const k = h.dataset.hero;
        let party = g.s.party.filter((x) => g.s.heroes[x]);
        if (party.includes(k)) party = party.filter((x) => x !== k);
        else if (party.length < DESCENT.teamSize) party = [...party, k];
        else party = [...party.slice(1), k];
        g.setParty(party); app.sfx.tap(); return draw();
      }
      const i = e.target.closest('.ic-c[data-inv]');
      if (i && g.invocationUnlocked(i.dataset.inv)) { g.setInvocation(i.dataset.inv); app.sfx.tap(); return draw(); }
      if (e.target.closest('[data-close]')) sh.close();
    });
    draw();
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

  function summaryHTML(s) {
    const lootLine = [s.loot.shards ? `${icon('crystal')} ${fmt(s.loot.shards)} éclats` : '', s.loot.ash ? `${icon('ash')} ${fmt(s.loot.ash)} cendres` : '', ...Object.entries(s.loot.tickets || {}).map(([t, n]) => `${icon('ticket')} ${n} booster${n > 1 ? 's' : ''} ${t === 'premium' ? 'premium' : 'standard'}`), ...chestText(s.loot).map((x) => `${icon('lock')} ${x}`)].filter(Boolean).join(' · ');
    const kills = Object.entries(s.kills || {});
    return `<section class="panel ornate dc-sum ${s.wiped ? 'lost' : 'won'}">
      <h2>${s.wiped ? 'L’équipe est tombée' : 'Retour à la surface'}</h2>
      <p class="dc-depth">Étage <b>${s.floor}</b></p>
      <p class="small">${lootLine || 'Aucun butin.'}${s.wiped ? ` <span class="muted">(${s.cursed ? 'tout a été perdu' : 'la moitié a été perdue'})</span>` : ''}</p>
      ${s.levelUps?.length ? `<p class="small dc-good">${icon('sparkle')} ${s.levelUps.map((l) => `${esc(HEROES[l.id]?.name || l.id)} passe niveau ${l.level}`).join(', ')}</p>` : ''}
      ${s.invUp ? `<p class="small dc-good">${icon('sparkle')} ${esc(INVOCATIONS[s.invUp.key].name)} passe niveau ${s.invUp.level}</p>` : ''}
      ${kills.length ? `<p class="small muted">${icon('book')} Créatures vaincues : ${kills.reduce((a, [, n]) => a + n, 0)} (${kills.length} espèce${kills.length > 1 ? 's' : ''})</p>` : ''}
      ${s.fallen?.length ? `<p class="small muted">${icon('heart')} Affaiblis ${DESCENT.woundHours} h : ${s.fallen.map((k) => esc(HEROES[k]?.name || k)).join(', ')}</p>` : ''}
      ${chestN(s.loot) ? `<a class="btn small gold" href="#/arsenal">${icon('lock')}Ouvrir mes coffres</a>` : ''}
      <div class="row gap wrap"><button class="btn small" data-act="share">${icon('upload')}Partager mon score</button><button class="btn small ghost" data-act="dismiss">OK</button></div>
    </section>`;
  }

  // ——— Expédition en cours ————————————————————————————————————————————
  function teamStrip(run) {
    return `<div class="dc-strip hero-strip">${run.team.map((m) => `<div class="dc-mini ${m.fallen ? 'fallen' : ''}" style="--rc:${HEROES[m.id].color}"><img alt="" src="${heroArtUrl(m.id)}"><span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span></div>`).join('')}
      <div class="dc-gauge" title="Jauge d’invocation"><span>${esc(INVOCATIONS[run.inv].name)}</span><span class="progress"><i style="width:${run.gauge || 0}%;--bar:${INVOCATIONS[run.inv].color}"></i></span></div></div>`;
  }
  function runHead(run) {
    return `<header class="dc-run-head">
      <div><span class="small muted">${run.cursed ? `<span class="dc-bad">${icon('skull')} Maudite</span> · ` : ''}La Descente</span><h1>Étage ${run.floor}</h1></div>
      <div class="dc-loot"><span>${icon('crystal')}${fmt(run.loot.shards)}</span><span>${icon('ash')}${fmt(run.loot.ash)}</span>${Object.values(run.loot.tickets).reduce((a, b) => a + b, 0) ? `<span>${icon('ticket')}${Object.values(run.loot.tickets).reduce((a, b) => a + b, 0)}</span>` : ''}${chestN(run.loot) ? `<span>${icon('lock')}${chestN(run.loot)}</span>` : ''}</div>
    </header>
    ${teamStrip(run)}
    ${run.blessings.length ? `<div class="chips dc-bless">${run.blessings.map((k) => `<span class="chip" title="${esc(BLESSINGS[k].desc)}">${icon('star')}${esc(BLESSINGS[k].name)}</span>`).join('')}</div>` : ''}`;
  }
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}
      <p class="dc-prompt">${doors.length > 1 ? 'Deux passages s’ouvrent devant toi.' : 'Un gardien barre la route.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r}" data-act="door" data-r="${r}"><span class="dc-door-ic">${icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${ROOMS[r].desc}</span></button>`).join('')}</div>
      ${run.cleared ? `<button class="btn ghost block" data-act="leave">${icon('back')}Remonter avec le butin</button>` : ''}`;
  }
  function clearedView(run, extra = '') {
    const nextBoss = (run.floor + 1) % DESCENT.bossEvery === 0;
    const dz = g.floorDanger(run.floor + 1);
    const lose = run.cursed ? run.loot.shards : Math.ceil(run.loot.shards / 2);
    const tk = Object.values(run.loot.tickets).reduce((a, b) => a + b, 0);
    root.innerHTML = `${runHead(run)}
      ${extra}
      <section class="panel dc-risk">
        <div><span class="small muted">Étage ${run.floor + 1}${nextBoss ? ' · gardien' : ''}</span><b class="dz dz-${dz.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}">${dz.label}</b><span class="small muted">créatures niv. ${dz.level}${nextBoss ? '+' : ''} · tes héros niv. ${dz.heroLevel}</span></div>
        <div><span class="small muted">Si l’équipe tombe</span><b class="dc-bad">−${fmt(lose)} éclats</b><span class="small muted">${tk ? `et ${tk} booster${tk > 1 ? 's' : ''} ` : ''}${chestN(run.loot) ? `${tk ? '+' : 'et'} ${chestN(run.loot)} coffre${chestN(run.loot) > 1 ? 's' : ''} ` : ''}${run.cursed ? '(tout le butin)' : '(la moitié des éclats)'}</span></div>
      </section>
      <div class="dc-choice">
        <button class="btn primary block big-cta" data-act="next">${icon('next')}Descendre à l’étage ${run.floor + 1}${nextBoss ? ' (gardien)' : ''}</button>
        <button class="btn block" data-act="leave">${icon('back')}Remonter avec le butin</button>
      </div>`;
  }
  function altarView(run) {
    root.innerHTML = `${runHead(run)}
      <p class="dc-prompt">L’autel murmure. Choisis une bénédiction pour le reste de l’expédition.</p>
      <div class="dc-altar">${run.altar.map((k) => `<button class="dc-bl" data-act="bless" data-k="${k}"><span>${icon('star')}</span><b>${esc(BLESSINGS[k].name)}</b><span class="small">${esc(BLESSINGS[k].desc)}</span></button>`).join('')}</div>`;
  }
  function render() {
    const run = g.descent().run;
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    if (run.phase === 'battle') return battleView(run);
    return clearedView(run);
  }

  // ——— Combat au tour par tour ————————————————————————————————————————
  let battle = null;
  function battleView(run) {
    if (battle) return;
    playing = true;
    const room = run.room;
    const title = `Étage ${run.floor}${room === 'boss' ? ' · Gardien' : room === 'elite' ? ' · Élite' : ''}`;
    battle = runBattle(app, root, { title, onEnd: () => {
      battle = null; playing = false;
      let out;
      try { app.pendingProgress = []; out = g.finishBattle(); } catch (e) { app.pendingProgress = null; toast(esc(e.message), { kind: 'error' }); return render(); }
      if (out.lost) {
        app.sfx.error();
        ui.outcome = out.summary;
        render();
      } else {
        app.sfx.reveal(room === 'boss' ? 'M' : 'R');
        const disc = (out.discovered || []).map((id) => cat.get(id)?.name).filter(Boolean);
        clearedView(g.descent().run, `<p class="dc-event dc-win">${icon('swords')} <b>Victoire !</b> ${lootText(out.loot)} · +${out.xp} XP${disc.length ? `<br><span class="small">${icon('book')} Nouveau au Bestiaire de chasse : ${disc.map(esc).join(', ')}</span>` : ''}</p>`);
      }
      window.scrollTo(0, 0);
      app.flushProgress();
    } });
  }

  // ——— Actions ————————————————————————————————————————————————————————
  async function door(room) {
    if (playing) return;
    const run = g.descent().run;
    let out;
    try { app.pendingProgress = []; out = g.chooseDoor(room); }
    catch (e) { app.pendingProgress = null; toast(esc(e.message), { kind: 'error' }); return; }
    if (out.battle) {
      app.pendingProgress = null;
      window.scrollTo(0, 0);
      battleView(g.descent().run);
      return;
    } else if (out.altar) {
      render();
    } else {
      const msg = room === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source referme les blessures de ton équipe.</p>`
        : room === 'treasure' ? `<p class="dc-event">${icon('crystal')} Le coffre s’ouvre : ${lootText(out.loot)}</p>`
        : out.healed ? `<p class="dc-event">${icon('star')} L’autel est muet, mais sa lumière soigne ton équipe.</p>` : '';
      app.sfx.coin();
      clearedView(g.descent().run, msg);
    }
    app.flushProgress();
  }
  const lootText = (l = {}) => [l.shards ? `+${fmt(l.shards)} éclats` : '', l.ash ? `+${fmt(l.ash)} cendres` : '', ...Object.entries(l.tickets || {}).map(([t, n]) => `+${n} booster ${t === 'premium' ? 'premium' : 'standard'}`), ...chestText(l, '+')].filter(Boolean).join(', ') || 'Rien cette fois.';

  function share() {
    const s = ui.outcome || {};
    const d = g.descent();
    const txt = `ABYSSAL · La Descente du ${new Date().toLocaleDateString('fr-FR')} : j’ai atteint l’étage ${s.floor ?? d.bestToday}${s.cursed ? ' en descente maudite' : ''} ! Tu fais mieux ? ${location.origin}${location.pathname}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else navigator.clipboard?.writeText(txt).then(() => toast('Score copié : colle-le dans un message.', { icon: 'copy' }));
  }

  bindActions(root, {
    team() { teamSheet(); },
    curse() { ui.cursed = !ui.cursed; render(); },
    async start() {
      if (ui.cursed && !(await confirmBox('Descente maudite : si toute l’équipe tombe, <b>tout le butin</b> est perdu. Tu es sûr ?', { ok: 'Je descends', danger: true }))) return;
      try { g.startRun({ cursed: ui.cursed }); ui.outcome = null; app.sfx.tear(); render(); window.scrollTo(0, 0); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    door(el) { door(el.dataset.r); },
    bless(el) { try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); clearedView(g.descent().run, `<p class="dc-event">${icon('star')} ${esc(BLESSINGS[el.dataset.k].name)} : ${esc(BLESSINGS[el.dataset.k].desc)}</p>`); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    async leave() {
      if (!(await confirmBox('Remonter maintenant avec tout le butin ?', { ok: 'Remonter' }))) return;
      app.pendingProgress = [];
      ui.outcome = g.endRun(false);
      app.sfx.coin();
      render(); window.scrollTo(0, 0);
      app.flushProgress();
    },
    after() { render(); window.scrollTo(0, 0); },
    share() { share(); },
    dismiss() { ui.outcome = null; render(); },
  });
  render();
  app.refreshView = () => { if (!playing) render(); };
  return () => { app.refreshView = null; skip = true; if (battle) { battle.stop(); battle = null; } };
}
