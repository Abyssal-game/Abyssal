// v858 : la Grande Chasse (js/core/chasse.js). Une bête par semaine pour tous les joueurs : sa grande carte, la jauge de
// ses PV (dégâts de tous les chasseurs, tenus par le serveur), tes jours de chasse, ses pouvoirs, le butin et le classement.
import { TEAM } from '../core/army.js';
import { BOSSES } from '../core/bosses.js';
import { HUNT, HUNT_LOOT, HUNT_ART, HUNT_MILES, HUNT_KILLER, PASSIVES, TIER_LINES, huntTierOf } from '../core/chasse.js';
import { CHESTS } from '../core/descent.js';
import { artUrl } from '../art/assets.js';
import { icon, picon, sigil, EMBLEM } from '../ui/icons.js';
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
    ...[r.title, r.title2].filter(Boolean).map((x) => `<span class="ep-rw">${icon('p:titles')}<b>${esc(t(x))}</b></span>`)].join('');
  const tierOf = (v) => (v?.hp_max && !v.killed ? huntTierOf(v.dmg, v.hp_max) : 0); /* v866 : palier de la bête (vie commune) */
  const pname = (k) => t(PASSIVES[k]?.name || k);
  /* v866 : temps écoulé depuis un coup (fil des derniers coups) */
  const ago = (at) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60000)); return m < 1 ? t('à l’instant') : m < 60 ? t('il y a {n} min', { n: m }) : m < 1440 ? t('il y a {n} h', { n: Math.round(m / 60) }) : t('il y a {n} j', { n: Math.round(m / 1440) }); };

  // jours restants avant lundi (heure du joueur)
  const daysLeft = () => { const d = g.clock(), dow = (d.getDay() + 6) % 7; return 7 - dow; };

  function bossHTML(key) {
    const B = BOSSES[key], v = ui.view, tier = tierOf(v), hpMax = v?.hp_max || 0, dmg = v?.dmg || 0, left = Math.max(0, hpMax - dmg), pct = hpMax ? Math.max(0, Math.min(100, (left / hpMax) * 100)) : 100;
    return `<section class="gc-boss ${v?.killed ? 'killed' : ''}" style="--fc:${cat.faction[B.faction]?.colors.secondary || '#E0485E'}">
      <div class="gc-card"><img alt="" src="${huntArt(cat, key)}"><span class="gc-card-n"><b>${esc(B.name)}</b><small>${esc(B.title)}</small></span>${v?.killed ? `<span class="gc-dead">${t('Abattue')}</span>` : ''}</div>
      <p class="gc-intro">« ${esc(B.intro)} »</p>
      <div class="gc-hp"><div class="gc-hp-h"><b>${icon('heart')} ${t('PV de la bête')}</b><span>${v ? `${fmt(left)} / ${fmt(hpMax)}` : '…'}</span></div>
        <div class="gc-bar"><i style="width:${pct}%"></i>${HUNT.tiers.map((x) => `<s class="gc-tick" style="left:${x * 100}%"></s>`).join('')}</div>
        <p class="small muted">${v ? (v.killed ? t('La bête est tombée ! Chaque chasseur reçoit sa part du butin.') : t('{n} chasseurs cette semaine · chaque nouveau chasseur la rend plus coriace.', { n: v.hunters || 0 })) : !cloud.isLoggedIn() ? t('Connecte-toi pour chasser avec les autres joueurs.') : t('Chargement de la jauge…')}</p></div>
      ${v?.killed && v.killer ? `<p class="gc-killer">${icon('p:titles')} ${t('Coup de grâce : {w}', { w: esc(isBlocked(v.killer.user_id) ? t('Joueur masqué') : v.killer.pseudo || t('Chasseur')) })}</p>` : ''}
      ${tier ? `<p class="gc-tier">${icon('p:danger')} <span>${t('{b}, {l} : {p}', { b: esc(B.name), l: t(TIER_LINES[tier]), p: (B.rise || []).slice(0, tier).map(pname).join(', ') || t('plus forte') })}</span></p>` : ''}
      ${B.bane ? `<p class="gc-bane" style="--bc:${cat.faction[B.bane]?.colors.secondary || '#F2C14E'}"><span class="gc-bane-s">${sigil(B.bane)}</span><span><b>${t('Point faible de la semaine')}</b><small>${t('Tes créatures de la faction {f} lui infligent +{p} %.', { f: esc(cat.faction[B.bane]?.name || B.bane), p: Math.round((HUNT.bane - 1) * 100) })}</small></span></p>` : ''}
    </section>`;
  }

  function mineHTML(c) {
    const W = c.weeks[c.cur], d0 = g.clock(), dow = (d0.getDay() + 6) % 7;
    const dayKeys = Object.keys(W.days), hunted = new Set(dayKeys.map((k) => (new Date(`${k}T12:00:00`).getDay() + 6) % 7));
    return `<section class="panel gc-mine"><div class="gc-mine-h"><b>${t('Ta chasse de la semaine')}</b><span class="small muted">${t('fin dans {n} j', { n: daysLeft() })}</span></div>
      <div class="gc-days">${DAYS.map((l, i) => `<span class="gc-day ${i === dow ? 'today' : ''} ${hunted.has(i) ? 'done' : ''}">${hunted.has(i) ? icon('check') : l}</span>`).join('')}</div>
      <div class="gc-stats"><span><small>${t('Dégâts')}</small><b>${fmt(W.total || 0)}</b></span><span><small>${t('Meilleur combat')}</small><b>${fmt(W.best || 0)}</b></span><span><small>${t('Jours de chasse')}</small><b>${dayKeys.length}</b></span>${ui.view?.me ? `<span><small>${t('Rang')}</small><b>${ui.view.me.rank}</b></span>` : ''}</div>
      ${milesHTML(W)}</section>`;
  }

  /* v866 : paliers personnels de la semaine (un coffre chacun, même si la bête survit) */
  function milesHTML(W) {
    const tot = W.total || 0, n = W.miles || 0, max = HUNT_MILES.at(-1).dmg;
    return `<div class="gc-miles"><div class="gc-miles-h"><b>${t('Tes paliers de la semaine')}</b><span class="small muted">${n < HUNT_MILES.length ? t('prochain : {d} dégâts', { d: fmt(HUNT_MILES[n].dmg) }) : t('tous atteints')}</span></div>
      <div class="gc-mbar"><i style="width:${Math.min(100, (tot / max) * 100)}%"></i>${HUNT_MILES.map((m, i) => `<span class="gc-mstep ${i < n ? 'done' : ''}" style="left:${(m.dmg / max) * 100}%">${chestSVG(Object.keys(m.reward.chests)[0])}</span>`).join('')}</div></div>`;
  }
  /* v866 : derniers coups de tous les chasseurs */
  function feedHTML() {
    const f = ui.view?.feed;
    if (!f?.length) return '';
    const me = cloud.currentUser()?.id;
    return `<section class="panel gc-feed"><b>${icon('swords')} ${t('Derniers coups')}</b><ul>${f.slice(0, 6).map((x) => `<li class="${x.user_id === me ? 'me' : ''}"><span>${esc(isBlocked(x.user_id) ? t('Joueur masqué') : x.pseudo || t('Chasseur'))}</span><b>−${fmt(x.dmg)}</b><small class="muted">${ago(x.at)}</small></li>`).join('')}</ul></section>`;
  }

  function actionHTML(c) {
    const cur = !!c.battle, done = g.chasseDone(), team = g.team();
    if (team.length < TEAM.active) return `<p class="small center ep-need">${t('Il te faut au moins {n} créatures dans ton équipe pour chasser.', { n: TEAM.active })}</p>`;
    if (done && !cur) return `<p class="gc-wait">${icon('check')} ${t('Tu as chassé aujourd’hui. La bête t’attend demain.')}</p>`;
    return `<button class="btn primary block big-cta dc-plq dc-plq-red gc-go" data-act="go">${icon('swords')}${cur ? t('Reprendre la chasse') : t('Affronter la bête')}</button>
      <p class="small muted center">${t('Un combat par jour · elle frappe plus fort à chaque tour, et au tour {r} elle lance l’Anéantissement · tes dégâts comptent toujours.', { r: HUNT.rounds })}</p>`;
  }

  function powersHTML(key) {
    const B = BOSSES[key], P = (k) => PASSIVES[k] ? `<li><b>${esc(PASSIVES[k].name)}</b> <span class="small">${esc(PASSIVES[k].desc)}</span></li>` : '';
    return `<p>${esc(B.mechanic)}</p>
      <ul class="gc-pw">${P('aura')}${(B.passive || []).map(P).join('')}</ul>
      <p class="small muted">${t('En Furie (à partir du tour {n}) :', { n: HUNT.fury })}</p><ul class="gc-pw">${(B.furyPassive || []).map(P).join('')}</ul>
      <p class="small"><b>${t('Comment la blesser')}</b> : ${esc(B.counter)}</p>
      <h3>${t('L’Anéantissement')}</h3>
      <p class="small">${t('La bête frappe {p} % plus fort à chaque tour. À la fin du tour {r}, elle lance l’Anéantissement : ni parade ni esquive, toute ton équipe tombe. Il est annoncé {w} tours avant : frappe le plus fort possible d’ici là.', { p: Math.round(HUNT.ramp * 100), r: HUNT.rounds, w: HUNT.warn })}</p>
      <h3>${t('Quand elle faiblit')}</h3>
      <p class="small">${t('À 75 %, 50 % et 25 % de sa vie, la bête change pour tous les chasseurs : +{a} % d’ATQ et un nouveau pouvoir à chaque fois.', { a: Math.round(HUNT.tierAtk * 100) })}</p>
      <ul class="gc-pw">${(B.rise || []).map((k, i) => `<li><b>${['75 %', '50 %', '25 %'][i]} · ${esc(pname(k))}</b> <span class="small">${esc(PASSIVES[k]?.desc || '')}</span></li>`).join('')}</ul>
      ${B.bane ? `<p class="small"><b>${t('Point faible de la semaine')}</b> : ${t('Tes créatures de la faction {f} lui infligent +{p} %.', { f: esc(cat.faction[B.bane]?.name || B.bane), p: Math.round((HUNT.bane - 1) * 100) })}</p>` : ''}`;
  }

  function lootHTML() {
    const L = HUNT_LOOT;
    return `<ul class="gc-loot">
      <li><span>${t('Chaque combat')}</span><div class="ep-rws">${rewardChips({ shards: HUNT.fightShards })}</div></li>
      <li><span>${t('Bête abattue : chaque chasseur')}</span><div class="ep-rws">${rewardChips(L.base)}</div></li>
      <li><span>${t('{n} jours de chasse ou plus', { n: L.faithful.days })}</span><div class="ep-rws">${rewardChips(L.faithful.reward)}</div></li>
      <li><span>${t('Les {n} plus gros dégâts', { n: L.top.n })}</span><div class="ep-rws">${rewardChips(L.top.reward)}</div></li>
      <li><span>${t('Le coup de grâce (celui qui l’abat)')}</span><div class="ep-rws">${rewardChips({ chests: HUNT_KILLER.chests, title2: HUNT_KILLER.title })}</div></li>
      ${HUNT_MILES.map((m) => `<li><span>${t('{d} dégâts dans la semaine (même si elle survit)', { d: fmt(m.dmg) })}</span><div class="ep-rws">${rewardChips(m.reward)}</div></li>`).join('')}</ul>`;
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
    const v = ui.view, part = v?.hp_max && r.dmg ? (r.dmg / v.hp_max) * 100 : 0;
    return `<section class="dc-sum2 ep-res gc-res ${r.survived ? 'won' : 'lost'}">
      <h2>${r.cata ? t('L’Anéantissement a balayé ton équipe') : r.survived ? t('La bête se détourne') : t('Ton équipe est tombée')}</h2>
      <p class="gc-res-dmg"><small>${t('Dégâts infligés')}</small><b>${fmt(r.dmg)}</b></p>
      ${part ? `<p class="gc-part">${t('Tu as porté {p} % de la vie de la bête', { p: part >= 10 ? Math.round(part) : part.toFixed(1).replace('.', ',') })}</p>` : ''}
      <p class="dc-sum2-sub">${r.cata ? t('Tu as tenu jusqu’à l’Anéantissement ({n} tours) : rien ne pouvait l’arrêter. Reviens demain !', { n: HUNT.rounds }) : r.survived ? t('Tu as tenu les {n} tours. Tes dégâts s’ajoutent à ceux de tous les chasseurs.', { n: HUNT.rounds }) : t('Tu as tenu {n} tour(s). Tes dégâts comptent quand même pour tous.', { n: r.rounds })}</p>
      <div class="ep-rws center">${rewardChips(r.reward || {})}</div>
      ${r.miles?.length ? `<div class="gc-res-miles"><b>${t('Palier atteint !')}</b><div class="ep-rws center">${r.miles.map((m) => rewardChips(m.reward)).join('')}</div>${r.miles.some((m) => m.reward.chests) ? `<a class="btn small ghost" href="#/coffres">${icon('p:chest')}${t('Ouvrir mes coffres')}</a>` : ''}</div>` : ''}
      ${!serverMode() ? `<p class="small muted center">${t('Tes dégâts seront ajoutés à la jauge commune dès que le serveur de partie sera actif.')}</p>` : ''}
      ${r.report?.length ? `<div class="dc-why"><b>${icon('info')} ${t('Ce qui s’est passé')}</b>${r.report.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="dc-sum2-row"><button class="btn dc-plq dc-plq-dark" data-act="dismiss">${t('Continuer')}</button></div></section>`;
  }

  function list() {
    const c = g.chasse(), key = g.chasseBoss();
    root.innerHTML = `<header class="screen-head dc-head ui-hero gc-head gc-hero bn-chasse"><h1>${t('La Grande Chasse')}</h1><p class="muted">${t('Une bête pour tous les joueurs. Chacun la blesse, ensemble on l’abat.')}</p></header>
      ${ui.result ? resultHTML(ui.result) : ''}
      ${claimHTML(c)}
      ${bossHTML(key)}
      ${actionHTML(c)}
      ${mineHTML(c)}
      ${feedHTML()}
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
      announce(c.cur);
      if (!playing) render();
    } catch (e) { /* SQL 20 pas encore collé : la jauge reste « … » */ }
  }

  /* v866 : annonce une fois ce qui a changé pour tous depuis ta dernière visite : la bête change de forme, ou elle est tombée */
  function announce(week) {
    const v = ui.view; if (!v) return;
    const B = BOSSES[g.chasseBoss()], tier = tierOf(v), K = 'abyssal.chasse.seen';
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { seen = {}; }
    if (seen.w !== week) seen = { w: week, tier: 0, killed: false };
    if (v.killed && !seen.killed) toast(`${icon('p:titles')} ${t('La bête est tombée ! Coup de grâce : {w}.', { w: esc(v.killer?.pseudo || t('un chasseur')) })}`, { kind: 'success' });
    else if (tier > (seen.tier || 0)) toast(`${icon('p:danger')} ${t('{b}, {l} ! Nouveau pouvoir : {p}.', { b: esc(B.name), l: t(TIER_LINES[tier]), p: esc(pname(B.rise?.[tier - 1])) })}`, { ms: 6000 });
    seen.tier = Math.max(seen.tier || 0, tier); seen.killed = !!v.killed;
    try { localStorage.setItem(K, JSON.stringify(seen)); } catch (e) { /* rien */ }
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
      try { g.startChasse(tierOf(ui.view)); /* v866 : le serveur de partie le remplace par le vrai palier */ } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
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
