// v858 : la Grande Chasse (js/core/chasse.js). Une bête par semaine pour tous les joueurs : sa grande carte, la jauge de
// ses PV (dégâts de tous les chasseurs, tenus par le serveur), tes jours de chasse, ses pouvoirs, le butin et le classement.
import { TEAM } from '../core/army.js';
import { BOSSES } from '../core/bosses.js';
import { HUNT, HUNT_LOOT, HUNT_ART, PASSIVES } from '../core/chasse.js';
import { CHESTS } from '../core/descent.js';
import { artUrl } from '../art/assets.js';
import { icon, picon, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { chestSVG } from '../ui/chest.js';
import { setScene } from '../ui/scene.js';
import { rowAttrs, bindReport } from '../ui/report.js';
import { isBlocked } from '../core/moderation.js';
import { withPlate, frameCls } from '../ui/vitrine.js';
import { runDuel } from './duel-ui.js';
import * as cloud from '../cloud/cloud.js';
import { serverMode, flush, pendingOps } from '../cloud/partie.js';
import { t } from '../i18n.js';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const huntArt = (cat, key) => (HUNT_ART.has(key) ? `assets/bosses/chasse-${key}.webp` /* v859 : 600 px, plus net en grande carte */ : artUrl(cat.get(BOSSES[key].card)));

export default function chasse(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.chasse ||= { result: null, paused: false, view: null, prev: null });
  let battle = null, playing = false, gone = false;

  const rewardChips = (r) => [...Object.keys(r.chests || {}).map((c) => `<span class="ep-rw" style="--cc:${CHESTS[c].color}">${chestSVG(c)}<b>${esc(CHESTS[c].name)}</b></span>`),
    r.shards ? `<span class="ep-rw">${icon('crystal')}<b>+${fmt(r.shards)}</b></span>` : '',
    r.tickets?.premium ? `<span class="ep-rw">${icon('ticket')}<b>${t('{n} ticket premium', { n: r.tickets.premium })}</b></span>` : '',
    r.title ? `<span class="ep-rw">${icon('p:titles')}<b>${esc(r.title)}</b></span>` : ''].join('');

  // jours restants avant lundi (heure du joueur)
  const daysLeft = () => { const d = g.clock(), dow = (d.getDay() + 6) % 7; return 7 - dow; };

  function bossHTML(key) {
    const B = BOSSES[key], v = ui.view, hpMax = v?.hp_max || 0, dmg = v?.dmg || 0, left = Math.max(0, hpMax - dmg), pct = hpMax ? Math.max(0, Math.min(100, (left / hpMax) * 100)) : 100;
    return `<section class="gc-boss ${v?.killed ? 'killed' : ''}" style="--fc:${cat.faction[B.faction]?.colors.secondary || '#E0485E'}">
      <div class="gc-card"><img alt="" src="${huntArt(cat, key)}"><span class="gc-card-n"><b>${esc(B.name)}</b><small>${esc(B.title)}</small></span>${v?.killed ? `<span class="gc-dead">${t('Abattue')}</span>` : ''}</div>
      <p class="gc-intro">« ${esc(B.intro)} »</p>
      <div class="gc-hp"><div class="gc-hp-h"><b>${icon('heart')} ${t('PV de la bête')}</b><span>${v ? `${fmt(left)} / ${fmt(hpMax)}` : '…'}</span></div>
        <div class="gc-bar"><i style="width:${pct}%"></i></div>
        <p class="small muted">${v ? (v.killed ? t('La bête est tombée ! Chaque chasseur reçoit sa part du butin.') : t('{n} chasseurs cette semaine · chaque nouveau chasseur la rend plus coriace.', { n: v.hunters || 0 })) : !cloud.isLoggedIn() ? t('Connecte-toi pour chasser avec les autres joueurs.') : t('Chargement de la jauge…')}</p></div>
    </section>`;
  }

  function mineHTML(c) {
    const W = c.weeks[c.cur], d0 = g.clock(), dow = (d0.getDay() + 6) % 7;
    const dayKeys = Object.keys(W.days), hunted = new Set(dayKeys.map((k) => (new Date(`${k}T12:00:00`).getDay() + 6) % 7));
    return `<section class="panel gc-mine"><div class="gc-mine-h"><b>${t('Ta chasse de la semaine')}</b><span class="small muted">${t('fin dans {n} j', { n: daysLeft() })}</span></div>
      <div class="gc-days">${DAYS.map((l, i) => `<span class="gc-day ${i === dow ? 'today' : ''} ${hunted.has(i) ? 'done' : ''}">${hunted.has(i) ? icon('check') : l}</span>`).join('')}</div>
      <div class="gc-stats"><span><small>${t('Dégâts')}</small><b>${fmt(W.total || 0)}</b></span><span><small>${t('Meilleur combat')}</small><b>${fmt(W.best || 0)}</b></span><span><small>${t('Jours de chasse')}</small><b>${dayKeys.length}</b></span>${ui.view?.me ? `<span><small>${t('Rang')}</small><b>${ui.view.me.rank}</b></span>` : ''}</div></section>`;
  }

  function actionHTML(c) {
    const cur = !!c.battle, done = g.chasseDone(), team = g.team();
    if (team.length < TEAM.active) return `<p class="small center ep-need">${t('Il te faut au moins {n} créatures dans ton équipe pour chasser.', { n: TEAM.active })}</p>`;
    if (done && !cur) return `<p class="gc-wait">${icon('check')} ${t('Tu as chassé aujourd’hui. La bête t’attend demain.')}</p>`;
    return `<button class="btn primary block big-cta dc-plq dc-plq-red gc-go" data-act="go">${icon('swords')}${cur ? t('Reprendre la chasse') : t('Affronter la bête')}</button>
      <p class="small muted center">${t('Un combat par jour · {r} tours au plus · tes dégâts comptent même si ton équipe tombe.', { r: HUNT.rounds })}</p>`;
  }

  function powersHTML(key) {
    const B = BOSSES[key], P = (k) => PASSIVES[k] ? `<li><b>${esc(PASSIVES[k].name)}</b> <span class="small">${esc(PASSIVES[k].desc)}</span></li>` : '';
    return `<p>${esc(B.mechanic)}</p>
      <ul class="gc-pw">${P('aura')}${(B.passive || []).map(P).join('')}</ul>
      <p class="small muted">${t('En Furie (à partir du tour {n}) :', { n: HUNT.fury })}</p><ul class="gc-pw">${(B.furyPassive || []).map(P).join('')}</ul>
      <p class="small"><b>${t('Comment la blesser')}</b> : ${esc(B.counter)}</p>`;
  }

  function lootHTML() {
    const L = HUNT_LOOT;
    return `<ul class="gc-loot">
      <li><span>${t('Chaque combat')}</span><div class="ep-rws">${rewardChips({ shards: HUNT.fightShards })}</div></li>
      <li><span>${t('Bête abattue : chaque chasseur')}</span><div class="ep-rws">${rewardChips(L.base)}</div></li>
      <li><span>${t('{n} jours de chasse ou plus', { n: L.faithful.days })}</span><div class="ep-rws">${rewardChips(L.faithful.reward)}</div></li>
      <li><span>${t('Les {n} plus gros dégâts', { n: L.top.n })}</span><div class="ep-rws">${rewardChips(L.top.reward)}</div></li></ul>`;
  }

  // butin à réclamer : cette semaine (bête déjà abattue) ou la semaine passée
  function claimHTML(c) {
    const out = [];
    for (const [w, v] of [[c.cur, ui.view], [c.cur - 1, ui.prev]]) {
      const me = g.chasseLootInfo(w);
      if (!v?.killed || !me.days || me.claimed) continue;
      out.push(`<section class="panel gc-claim"><b>${icon('p:chest')} ${w === c.cur ? t('La bête est tombée !') : t('La bête de la semaine passée est tombée !')}</b>
        <p class="small">${t('Tu as chassé {n} jour(s) : ta part du butin t’attend.', { n: me.days })}</p>
        <button class="btn gold block" data-act="claim" data-w="${w}">${t('Réclamer le butin')}</button></section>`);
    }
    return out.join('');
  }

  function resultHTML(r) {
    return `<section class="dc-sum2 ep-res gc-res ${r.survived ? 'won' : 'lost'}">
      <h2>${r.survived ? t('La bête se détourne') : t('Ton équipe est tombée')}</h2>
      <p class="gc-res-dmg"><small>${t('Dégâts infligés')}</small><b>${fmt(r.dmg)}</b></p>
      <p class="dc-sum2-sub">${r.survived ? t('Tu as tenu les {n} tours. Tes dégâts s’ajoutent à ceux de tous les chasseurs.', { n: HUNT.rounds }) : t('Tu as tenu {n} tour(s). Tes dégâts comptent quand même pour tous.', { n: r.rounds })}</p>
      <div class="ep-rws center">${rewardChips(r.reward || {})}</div>
      ${!serverMode() ? `<p class="small muted center">${t('Tes dégâts seront ajoutés à la jauge commune dès que le serveur de partie sera actif.')}</p>` : ''}
      ${r.report?.length ? `<div class="dc-why"><b>${icon('info')} ${t('Ce qui s’est passé')}</b>${r.report.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="dc-sum2-row"><button class="btn dc-plq dc-plq-dark" data-act="dismiss">${t('Continuer')}</button></div></section>`;
  }

  function list() {
    const c = g.chasse(), key = g.chasseBoss();
    root.innerHTML = `<header class="screen-head dc-head ui-hero gc-head gc-hero" style="--bn:url(${new URL(huntArt(cat, key), document.baseURI).href})"><h1>${t('La Grande Chasse')}</h1><p class="muted">${t('Une bête pour tous les joueurs. Chacun la blesse, ensemble on l’abat.')}</p></header>
      ${ui.result ? resultHTML(ui.result) : ''}
      ${claimHTML(c)}
      ${bossHTML(key)}
      ${actionHTML(c)}
      ${mineHTML(c)}
      <div class="dc-links ep-links2 gc-links">
        <button class="dc-link" data-act="open" data-f="powers">${picon('danger')}<b>${t('Ses pouvoirs')}</b><small>${t('et comment la blesser')}</small></button>
        <button class="dc-link" data-act="open" data-f="board">${picon('crown')}<b>${t('Les chasseurs')}</b><small>${t('classement de la semaine')}</small></button>
        <button class="dc-link" data-act="open" data-f="loot">${picon('chest')}<b>${t('Le butin')}</b><small>${t('ce que la chasse rapporte')}</small></button>
      </div>`;
  }

  async function loadView() {
    if (!cloud.isLoggedIn()) return;
    const c = g.chasse();
    try {
      const [v, p] = await Promise.all([cloud.chasseView(c.cur), g.chasseLootInfo(c.cur - 1).days ? cloud.chasseView(c.cur - 1).catch(() => null) : null]);
      if (gone) return;
      ui.view = v || null; ui.prev = p || null;
      if (!playing) render();
    } catch (e) { /* SQL 20 pas encore collé : la jauge reste « … » */ }
  }

  function boardHTML() {
    const v = ui.view, me = cloud.currentUser()?.id;
    if (!v) return `<p class="small muted center">${t('Classement indisponible pour l’instant. Réessaie dans un moment.')}</p>`;
    if (!v.top?.length) return `<p class="small muted center">${t('Personne n’a encore blessé la bête cette semaine. À toi d’ouvrir la chasse !')}</p>`;
    return `<div class="lb-body">${v.top.map((r) => {
      const hid = isBlocked(r.user_id), av = !hid && r.avatar && cat.get(r.avatar);
      return `<div class="lb-row ${r.user_id === me ? 'me' : ''}"${rowAttrs(r.user_id, r.pseudo, me)}><span class="lb-rank">${r.rank}</span><span class="lb-av ${hid ? '' : frameCls(r.frame)}">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${withPlate(hid ? t('Joueur masqué') : esc(r.pseudo || t('Chasseur')), hid ? null : r.plate)}</b><small class="muted">${t('{n} combat(s)', { n: r.fights })}</small></span><span class="lb-score">${fmt(r.dmg)}</span></div>`;
    }).join('')}</div>${v.me && v.me.rank > 20 ? `<p class="small muted center">${t('Ton rang : {r} ({d} dégâts)', { r: v.me.rank, d: fmt(v.me.dmg) })}</p>` : ''}`;
  }

  function battleView() {
    if (battle) return;
    const run = g.chasseRun();
    if (!run) return list();
    /* v862 : en combat, la bête montre la vie commune (la même que la jauge de cette page, lue même si elle arrive après le début) */
    Object.defineProperty(run, 'pool', { get: () => { const v = ui.view; return v?.hp_max ? { max: v.hp_max, left: Math.max(0, v.hp_max - (v.dmg || 0)) } : null; } });
    playing = true;
    battle = runDuel(app, root, { title: t('La Grande Chasse'), run, pause: t('Combat en pause : il t’attend dans la Grande Chasse.'),
      onAbandon: () => abandon(),
      onPause: () => { if (battle) { battle.stop(); battle = null; } playing = false; ui.paused = true; app.chrome(); render(); window.scrollTo(0, 0); },
      onEnd: () => {
        battle = null; playing = false;
        app.pendingProgress = [];
        let out;
        try { out = g.finishChasse(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
        app.chrome(); app.sfx.reveal?.(out.survived ? 'M' : 'R');
        ui.result = out; render(); window.scrollTo(0, 0);
        app.flushProgress();
        counted(out); /* v862 : le serveur compte les dégâts après avoir rejoué le combat */
      } });
  }
  async function abandon() {
    if (!(await confirmBox(`<b>${t('Quitter la chasse ?')}</b><br>${t('Les dégâts déjà infligés comptent, mais tu ne pourras plus chasser aujourd’hui.')}`, { ok: t('Quitter'), danger: true }))) return;
    if (battle) { battle.stop(); battle = null; }
    playing = false;
    document.body.classList.remove('battle-mode');
    app.pendingProgress = [];
    try { ui.result = g.abandonChasse(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    app.chrome(); render(); window.scrollTo(0, 0);
    app.flushProgress();
    counted(ui.result);
  }
  /* v862 : la jauge suit tout de suite tes dégâts, puis se recharge une fois tous les coups du combat reçus par le serveur
     (avant : relue au bout de 2,5 s, souvent avant que le serveur ait rejoué le combat : « 600 / 600 ») */
  async function counted(out) {
    if (ui.view && out?.dmg) { ui.view = { ...ui.view, dmg: (ui.view.dmg || 0) + out.dmg }; if (!playing) render(); }
    if (serverMode()) for (let k = 0; k < 30 && pendingOps(); k++) { try { await flush(); } catch (e) { break; } }
    if (!gone) loadView();
  }

  function render() {
    const c = g.chasse();
    const inBattle = !!c.battle && !ui.paused;
    setScene(inBattle ? null : 'descent');
    if (!c.battle) ui.paused = false;
    if (inBattle) return battleView();
    list();
  }

  bindActions(root, {
    go() {
      if (playing) return;
      const c = g.chasse();
      if (c.battle) { ui.paused = false; ui.result = null; app.sfx.tap(); return render(); }
      try { g.startChasse(); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      ui.result = null; ui.paused = false; app.sfx.tear?.(); window.scrollTo(0, 0); render();
    },
    dismiss() { ui.result = null; render(); },
    async claim(el) {
      const w = +el.dataset.w; el.disabled = true;
      try {
        const r = await app.partie.first('chasseClaim', w);
        app.sfx.reveal?.('M'); app.chrome();
        openSheet(`<div class="gc-won"><h2 class="center">${t('Le butin de la Chasse')}</h2><div class="ep-rws center">${rewardChips(r || {})}</div>${r?.chests ? `<a class="btn primary block dc-plq dc-plq-red" href="#/coffres">${icon('p:chest')}${t('Ouvrir mes coffres')}</a>` : ''}</div>`, { label: t('Butin'), cls: 'dc-sheet' });
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
      render();
    },
    open(el) {
      const f = el.dataset.f, key = g.chasseBoss();
      if (f === 'powers') openSheet(`<h2 class="center">${esc(BOSSES[key].name)}</h2>${powersHTML(key)}`, { label: t('Ses pouvoirs'), cls: 'dc-sheet gc-sheet' });
      else if (f === 'loot') openSheet(`<h2 class="center">${t('Le butin')}</h2>${lootHTML()}<p class="small muted">${t('Le butin de la semaine se réclame ici dès que la bête tombe, et jusqu’à la fin de la semaine suivante.')}</p>`, { label: t('Le butin'), cls: 'dc-sheet gc-sheet' });
      else if (f === 'board') { const sh = openSheet(`<h2 class="center">${t('Les chasseurs')}</h2><p class="small muted center">${t('Dégâts infligés à la bête cette semaine.')}</p><div class="gc-board">${boardHTML()}</div>`, { label: t('Les chasseurs'), cls: 'dc-sheet' }); bindReport(sh.body, () => loadView()); }
    },
  });
  render();
  loadView();
  app.refreshView = () => { if (!playing) render(); };
  return () => { gone = true; app.refreshView = null; if (battle) { battle.stop(); battle = null; } };
}
