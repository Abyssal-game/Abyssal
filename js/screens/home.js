// Accueil : logo, deux accès principaux et ce qui est à faire aujourd'hui.
import { mpw, checkTurns } from '../cloud/mpwatch.js';
import * as cloud from '../cloud/cloud.js';
import { shownName, profileAttrs } from '../ui/report.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct, openSheet, paint } from '../ui/dom.js';
import { t } from '../i18n.js';
import { FACTION_ORDER, ECONOMY } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { setScene } from '../ui/scene.js';
import { shadowDone } from './shadow.js';

// Icône et couleur de chaque type de mission du jour
const MISSION_LOOK = { booster: ['booster', '#E0485E'], new: ['book', '#B48CFF'], rare: ['crystal', '#6FB4FF'], variant: ['holo', '#FF8AD8'], burn: ['furnace', '#FF9A3A'], depth: ['depth', '#9C7BFF'], trial: ['crest-elite', '#E0485E'], win: ['crown', '#F2C14E'], daily: ['crystal', '#7FD3FF'], chest: ['chest', '#E8C35A'] };

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);

  const chests = g.chestCount();

  // « Aujourd'hui » : tout ce qui se récupère ou s'accomplit dans la journée, au même endroit.
  function todayHTML() {
    const m = g.missions();
    const rows = [];
    // Série de jours : 7 cases, un coffre de fer au 7e jour
    const sd = g.canDailyClaim() ? daily.streak : (s.daily.streak || 0), pos = ((sd - 1) % 7) + 1;
    /* v644 : chaque case montre ce que rapporte son jour (éclats, coffre de fer au 7e) ; toucher l'offrande ouvre le détail */
    const dayGain = (k) => g.dailyGainFor(sd - pos + k + 1);
    const streakBar = `<span class="td-streak">${Array.from({ length: 7 }, (_, k) => `<i class="${k < (g.canDailyClaim() ? pos - 1 : pos) ? 'on' : ''} ${k === pos - 1 && g.canDailyClaim() ? 'now' : ''} ${k === 6 ? 'chest' : ''}">${k === 6 ? '<img alt="" src="assets/chests/fer.webp">' : `<em>${k + 1}</em>`}<small>${dayGain(k)}</small></i>`).join('')}</span>`;
    rows.push(`<div class="td-row td-daily ${g.canDailyClaim() ? '' : 'done'}" data-act="dailyinfo" role="button"><span class="td-ic mi" style="--mc:#F2C14E">${picon('streak')}</span><span class="td-t"><b>Offrande du jour</b><span class="small muted">${g.canDailyClaim() ? `Jour ${pos} sur 7 · aujourd’hui ${daily.amount} éclats${pos === 7 ? ' et un coffre de fer' : ''}` : `Reçue : ${dayGain(pos - 1)} éclats${pos === 7 ? ' et un coffre de fer' : ''} · demain ${pos === 7 ? g.dailyGainFor(sd + 1) : dayGain(pos)} éclats`}</span>${streakBar}</span>${g.canDailyClaim() ? `<span class="td-auto" title="Arrive tout seul">+${daily.amount}</span>` : ''}</div>`); /* v841 : « Reçue » déjà dit dans la ligne */
    /* v755 : Tirage, Épreuves, Jeux du jour et coffres sur une rangée de tuiles (avant : quatre longues lignes) */
    const tiles = [];
    const tile = (href, ic, col, title, sub, hot) => `<a class="td-tile ${hot ? 'hot' : 'done'}" href="${href}" style="--mc:${col}"><span class="td-tile-ic">${ic.startsWith('img:') ? `<img class="td-tok" alt="" src="${ic.slice(4)}">` : picon(ic)}</span><b>${title}</b><small>${sub}</small></a>`;
    if (cloud.isLoggedIn()) { const shDone = shadowDone(g); tiles.push(tile('#/tirage', 'img:assets/jeux/sh-jeton.webp', '#9B6BFF', 'Tirage des Ombres', shDone ? 'Fait · demain' : 'À tirer', !shDone));
      /* v839 : le jeton du Choc ne se garde pas : rappel tant qu'il n'a pas servi aujourd'hui */
      const ck = g.s.choc, chocLeft = !ck || ck.day !== today() || ck.n > 0;
      tiles.push(tile('#/versus', 'img:assets/jeux/kc-jeton2.webp', '#E0485E', 'Choc des Boosters', chocLeft ? 'Jeton à jouer' : 'Joué · demain', chocLeft)); }
    const tl = g.trials().done.filter((x) => !x).length;
    if (g.team().length >= 3) tiles.push(tile('#/epreuves', 'crest-elite', '#E0485E', 'Épreuves du jour', tl ? `${tl} à jouer` : 'Terminées', !!tl));
    { const gl = g.gamesDailyLeft(); if (gl.length) tiles.push(tile('#/jeux', 'seal', '#C9A45A', 'Jeux du jour', `${gl.length} défi${gl.length > 1 ? 's' : ''}`, true)); }
    if (chests) tiles.push(tile('#/coffres', 'chest', '#E8C35A', 'Coffres', `${chests} à ouvrir`, true));
    if (tiles.length) rows.push(`<div class="td-tiles" style="--n:${tiles.length}">${tiles.join('')}</div>`);
    // v696 : ce qui t'attend en ligne est maintenant dans « Le Cercle t'attend », en tête de l'Accueil
    rows.push('<h3 class="td-sub">Missions</h3>'); /* v658 : « Missions » (le coffre de la semaine n'est pas une mission du jour) */
    /* v755 : missions déjà faites repliées sous les autres */
    const mRow = (x, i) => { const done = x.p >= x.n; return `<div class="td-row ${x.claimed ? 'done' : ''}" data-act="minfo" data-i="${i}" role="button"><span class="td-ic mi" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : MISSION_LOOK[x.kind]?.[1] || '#C8A45D'}">${x.claimed ? icon('check') : x.faction ? sigil(x.faction) : picon(MISSION_LOOK[x.kind]?.[0] || 'seal')}</span><span class="td-t"><b>${esc(x.text)}</b>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}</span>${x.claimed ? '<span class="small muted">Fait</span>' : done ? `<span class="td-auto" title="Arrive tout seul">+${x.shards}</span>` : `<span class="td-n small muted">${x.p}/${x.n}</span>`}</div>`; };
    m.list.forEach((x, i) => { if (!x.claimed) rows.push(mRow(x, i)); });
    { const fin = m.list.map((x, i) => (x.claimed ? mRow(x, i) : '')).filter(Boolean); if (fin.length) rows.push(`<details class="td-fin"><summary class="small muted">${fin.length > 1 ? `${fin.length} missions faites` : '1 mission faite'}</summary>${fin.join('')}</details>`); }
    const wch = g.weekChest();
    if (!wch.claimed) rows.push(`<div class="td-row ${wch.ready ? '' : 'wait'}" data-act="wkinfo" role="button"><span class="td-ic mi" style="--mc:#F2C14E">${picon('chest')}</span><span class="td-t"><b>Coffre de la semaine</b><span class="small muted">${wch.ready ? 'Tu as joué 5 jours cette semaine : un coffre d’or t’attend !' : `Joue ${wch.need} jours cette semaine pour un coffre d’or · ${wch.days} / ${wch.need}`}</span>${wch.ready ? '' : `<span class="progress"><i style="width:${(wch.days / wch.need) * 100}%"></i></span>`}</span>${wch.ready ? '<span class="td-auto">Coffre</span>' : ''}</div>`);
    return `<section class="panel today"><div class="today-head"><h2>Aujourd’hui</h2></div>${rows.join('')}</section>`;
  }


  // v696 : « Le Cercle t'attend » : chaque partie à jouer, défi reçu, duel du Pari à voir et demande d'ami,
  // avec son bouton (Jouer, Accepter, Refuser, Voir) : plus besoin d'aller chercher le défi dans le menu du jeu.
  const GAME = {
    sceaux: { name: 'Duels des Sceaux', bn: 'bn-sceaux', mode: 'sceaux', route: 'sceaux' },
    pacte: { name: 'Le Pacte', bn: 'bn-pacte', mode: 'pacte', route: 'pacte' },
    encheres: { name: 'Les Enchères', bn: 'bn-encheres', mode: 'encheresMode', route: 'encheres' },
    cryptes: { name: 'Les Cryptes', bn: 'bn-cryptes', mode: 'cryptesMode', route: 'cryptes' },
    versus: { name: 'Le Choc des Boosters', bn: 'bn-versus', route: 'versus' },
    choc: { name: 'Le Choc des Boosters', bn: 'bn-versus', mode: 'chocMode', route: 'versus' }, /* v811 */
    amis: { name: 'Amis', bn: 'bn-amis', route: 'amis' },
  };
  const portrait = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const leftOf = (x) => {
    const ms = new Date(x.deadline).getTime() - Date.now();
    if (!(ms > 0)) return '';
    if (x.pace === 'fast') return t('{n} s pour jouer', { n: Math.ceil(ms / 1000) });
    const h = Math.floor(ms / 3600000), mn = Math.floor((ms % 3600000) / 60000);
    return h ? t('{h} h {m} pour jouer', { h, m: String(mn).padStart(2, '0') }) : t('{m} min pour jouer', { m: mn });
  };
  function circleHTML() {
    const list = mpw.cards || [];
    if (!list.length) return '';
    const card = (x, i) => {
      const G = GAME[x.game] || GAME.sceaux, who = `<b translate="no">${esc(shownName(x.foe.id, x.foe.pseudo))}</b>`;
      const pace = x.pace === 'fast' ? `<i class="ol-tag fast">${t('Rapide')}</i>` : x.pace ? `<i class="ol-tag">${t('Lente')}</i>` : '';
      let kick, line, acts;
      if (x.k === 'turn') { kick = 'À toi de jouer'; line = t('Contre {name}', { name: who }); acts = `<button class="btn small primary" data-act="olplay" data-i="${i}">${icon('swords')}Jouer</button>`; }
      else if (x.k === 'inv') { kick = 'Défi reçu'; line = t('{name} te défie', { name: who }); acts = `<button class="btn small primary" data-act="oljoin" data-i="${i}">Accepter</button><button class="btn small ghost" data-act="olno" data-i="${i}">Refuser</button>`; }
      else if (x.k === 'pari-see') { kick = 'Duel à voir'; line = t(x.mine === false ? 'Ton duel contre {name} est prêt' : '{name} a relevé ton défi', { name: who }); acts = `<button class="btn small primary" data-act="olgo" data-i="${i}">Voir le duel</button>`; }
      else if (x.k === 'pari-inv') { kick = 'Défi reçu'; line = t('{name} te défie', { name: who }); acts = `<button class="btn small primary" data-act="olgo" data-i="${i}">Voir le défi</button>`; }
      else { kick = 'Demande d’ami'; line = t('{name} veut devenir ton ami', { name: who }); acts = `<button class="btn small primary" data-act="olfyes" data-i="${i}">Accepter</button><button class="btn small ghost" data-act="olfno" data-i="${i}">Refuser</button>`; }
      const time = x.k === 'turn' ? leftOf(x) : '';
      return `<div class="ol-card ${G.bn} ${x.k === 'turn' ? 'hot' : ''}">
        <span class="ol-av"${profileAttrs(x.foe.id)}>${portrait(x.foe.avatar)}</span>
        <span class="ol-t"><span class="ol-k">${kick} · ${t(G.name)}${pace}</span><span class="ol-l">${line}</span>${time ? `<span class="ol-time">${time}</span>` : ''}</span>
        <span class="ol-acts">${acts}</span></div>`;
    };
    return `<section class="panel ornate ol-wrap"><h2 class="ol-h"><img class="ol-em" alt="" src="assets/brand/emblem.webp">Le Cercle t’attend<span class="ol-n">${list.length}</span></h2>${list.map(card).join('')}</section>`;
  }
  // Objectifs : un proche, un de progression, un de collection ; chacun mène à son écran
  // Objectifs : le premier en grand en haut de l'accueil (« Ton prochain objectif »), les autres plus bas
  const goals = g.welcomePending() ? [] : g.goals().filter((x) => x.kind !== 'trial' && x.kind !== 'run' && x.title !== 'Commence la Descente'); /* v411 : les Épreuves sont dans « Aujourd'hui » ; v699 : « Commence la Descente » = le bouton Jouer */
  const GCOL = { run: '#E0485E', depth: '#9C7BFF', boss: '#FF6B7F', sceaux: '#E8C35A', collection: '#7FA8D8', forge: '#F08A3C', sublime: '#C9A8FF', shop: '#F2C14E', trial: '#E0485E' };
  const goalRow = (x, cls = 'hg-row') => `<a class="${cls}" href="${x.href}" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : GCOL[x.kind]}">
      <span class="td-ic mi">${x.faction ? sigil(x.faction) : picon(x.icon)}</span>
      <span class="td-t">${cls === 'hg-main' ? '<span class="hg-k">Ton prochain objectif</span>' : ''}<b>${esc(x.title)}</b><span class="small muted">${esc(x.sub)}</span>${x.n ? `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>` : ''}</span>${icon('next')}</a>`;
  /* v699 : un grand bouton « Jouer » sous le logo (reprendre ou continuer la Descente en un toucher) */
  function playHTML() {
    if (g.welcomePending()) return '';
    const run = g.s.descent.run, d = g.descent();
    const ch = run ? Math.ceil((run.floor || 1) / 5) : g.chapterNow();
    const done = !run && (d.best || 0) >= 100;
    const label = run ? `Reprendre le chapitre ${ch}` : done ? 'Retourner dans l’Abysse' : d.best ? `Continuer · chapitre ${ch}` : 'Descendre';
    const tc = g.torches();
    const sub = !tc.left ? 'Torches éteintes · retour demain' : run ? `Étage ${run.floor} en cours · ${tc.left} Torche${tc.left > 1 ? 's' : ''}` : done ? 'Rejoue un chapitre ou tente le Cauchemar' : `La Descente t’attend · ${tc.left} Torche${tc.left > 1 ? 's' : ''}`;
    return `<a class="btn primary block big-cta dc-plq dc-plq-red hm-play" href="#/descente">${icon('p:descend')}<span><b>${label}</b><small>${sub}</small></span></a>`;
  }
  function mainGoalHTML() { return goals.length ? `<section class="panel ornate hg-main-wrap">${goalRow(goals[0], 'hg-main')}</section>` : ''; }
  paint(root, `
    <section class="home-brand">
      <h1 class="hb-title"><img src="assets/brand/title.webp" alt="ABYSSAL — Le Bestiaire interdit"></h1>
    </section>

    ${g.welcomePending() ? `<a class="panel ornate hw-welcome" href="#/boutique"><span class="hw-ic">${picon('ticket')}</span><span><b>${g.s.welcomeGift > 0 ? `Cadeau de bienvenue : ${g.s.welcomeGift > 1 ? `${g.s.welcomeGift} boosters offerts` : '1 booster offert'} !` : g.s.tickets.standard > 1 ? `Tes ${g.s.tickets.standard} boosters de bienvenue t’attendent` : 'Ton booster de bienvenue t’attend'}</b><span class="small">${g.s.welcomeGift > 0 && g.freePack().stock ? 'Plus ton booster gratuit du jour. ' : ''}Ouvre-les pour découvrir tes premières créatures : elles formeront ton équipe.</span></span>${icon('next')}</a>` : ''}
    ${playHTML()}
    ${circleHTML()}
    ${mainGoalHTML()}

    ${todayHTML()}
    <p class="home-col small muted center"><a href="#/collection">${owned} / ${total} créatures découvertes</a></p>
    ${skyHTML()}
  `);
  // (v413 : le nombre de joueurs en ligne n'est plus sur l'Accueil : Réglages → À propos, tout en bas)
  document.querySelectorAll('body > .online-pill').forEach((x) => x.remove());
  lazyArt(root);
  setScene('home');
  /* v793 : Accueil vivant : la lumière suit l'heure du joueur (nuit, aube, jour, crépuscule) et le tourbillon
     s'intensifie à mesure que la Descente s'enfonce ; une fois l'Abysse vaincu, il devient un œil d'or apaisé */
  function skyHTML() {
    const h = new Date().getHours();
    const tod = h >= 21 || h < 5 ? 'nuit' : h < 8 ? 'aube' : h < 18 ? 'jour' : 'crepuscule';
    const best = g.s.descent?.best || 0, won = !!g.s.bossesBeaten?.abysse;
    const deep = won ? 'calme' : best >= 75 ? 4 : best >= 50 ? 3 : best >= 20 ? 2 : best >= 5 ? 1 : 0;
    const motes = Array.from({ length: 7 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--d:${(i * 1.7) % 9}s;--t:${11 + (i * 3) % 7}s"></i>`).join('');
    return `<div class="home-sky tod-${tod} deep-${deep}" aria-hidden="true"><b class="hs-tint"></b><b class="hs-vortex"></b>${tod === 'nuit' ? '<b class="hs-stars"></b>' : ''}<span class="hs-motes">${motes}</span></div>`;
  }
  function openMatch(x, join) {
    const G = GAME[x.game]; if (!G) return;
    (app.state[G.mode] ||= { mode: 'solo' }).mode = 'mp';
    const ui = (app.state[`mp_${x.game}`] ||= { open: null, sel: null });
    if (join) { ui.open = null; ui.join = x.id; } else { ui.join = null; ui.open = x.id; }
    app.sfx.tap?.();
    app.go(G.route);
  }
  async function friendAnswer(el, yes) {
    const x = mpw.cards[Number(el.dataset.i)]; if (!x) return;
    el.disabled = true;
    try { await cloud.friendRespond(x.id, yes); toast(yes ? 'Vous êtes maintenant amis !' : 'Demande refusée.', { kind: yes ? 'success' : undefined, icon: 'user' }); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    await checkTurns(app, { force: true }); app.refresh();
  }
  /* v696 : l'Accueil relit ce qui t'attend en ligne (au plus toutes les 15 s) */
  checkTurns(app, { gap: 15000, force: true });
  bindActions(root, {
    /* v696 : boutons de « Le Cercle t'attend » */
    olplay(el) { const x = mpw.cards[Number(el.dataset.i)]; if (x) openMatch(x, false); },
    oljoin(el) { const x = mpw.cards[Number(el.dataset.i)]; if (x) openMatch(x, true); },
    olgo(el) { const x = mpw.cards[Number(el.dataset.i)]; if (x) app.go((GAME[x.game] || GAME.amis).route); },
    async olno(el) {
      const x = mpw.cards[Number(el.dataset.i)]; if (!x) return;
      el.disabled = true;
      try { await cloud.mpLeave(x.id); toast('Défi refusé.', { icon: 'user' }); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
      await checkTurns(app, { force: true }); app.refresh();
    },
    async olfyes(el) { await friendAnswer(el, true); },
    async olfno(el) { await friendAnswer(el, false); },
    minfo(el) { /* v658 : toucher une mission montre sa récompense */
      const x = g.missions().list[Number(el.dataset.i)]; if (!x) return;
      const done = x.p >= x.n;
      openSheet(`<h2>Mission</h2><p><b>${esc(x.text)}</b></p>
        <p class="small muted">${x.claimed ? 'Mission accomplie : récompense reçue.' : done ? 'Mission accomplie : la récompense arrive toute seule.' : `Progression : ${x.p} / ${x.n}`}</p>
        ${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}
        <div class="mi-reward"><span class="small muted">Récompense</span><b>${picon('crystal')}${x.shards} éclats</b></div>
        <p class="small muted">Les missions changent chaque jour à minuit.</p>`, { cls: 'sheet-small', label: 'Mission' });
    },
    wkinfo() {
      const w = g.weekChest();
      openSheet(`<h2>Coffre de la semaine</h2><p class="small muted">Joue ${w.need} jours différents dans la semaine (du lundi au dimanche) : un coffre d’or t’attend.</p>
        <span class="progress"><i style="width:${Math.min(100, (w.days / w.need) * 100)}%"></i></span><p class="small muted">${w.days} / ${w.need} jours cette semaine</p>
        <div class="mi-reward"><span class="small muted">Récompense</span><b><img alt="" src="assets/chests/or.webp">un coffre d’or</b></div>`, { cls: 'sheet-small', label: 'Coffre de la semaine' });
    },
    dailyinfo() { /* v644 : ce que rapporte l'offrande, jour par jour */
      const E = ECONOMY.daily, sh = picon('crystal');
      openSheet(`<h2>Offrande du jour</h2><p class="muted">Chaque jour où tu ouvres le jeu, l’offrande arrive toute seule. Plus ta série de jours d’affilée est longue, plus elle rapporte.</p>
        <div class="dl-days">${Array.from({ length: 7 }, (_, k) => `<div class="dl-day ${k === 6 ? 'chest' : ''}"><b>Jour ${k + 1}</b><span>${sh}${E.base + Math.min(E.maxStreakBonus, k * E.perStreakDay)} éclats</span>${k === 6 ? '<span><img alt="" src="assets/chests/fer.webp">+ un coffre de fer</span>' : ''}</div>`).join('')}</div>
        <p class="small muted">Après le 7e jour, la série continue : ${E.base + E.maxStreakBonus} éclats chaque jour, et un coffre de fer tous les 7 jours. Un jour manqué fait seulement reculer la série d’un jour.</p>`, { label: 'Offrande du jour' });
    },
    weekchest() {
      try { g.claimWeekChest(); app.sfx.chest?.(); toast('Coffre de la semaine : <b>un coffre d’or</b> rejoint tes coffres !', { kind: 'epic', icon: 'trophy' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    mission(el) {
      try { const r = g.claimMission(Number(el.dataset.i)); app.sfx.coin(); toast(`Mission accomplie : <b>+${r.shards} éclats</b>`, { kind: 'success', icon: 'crystal' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    daily() {
      try {
        const r = g.claimDaily();
        app.sfx.coin();
        toast(`Offrande reçue : <b>+${r.amount} éclats</b>${r.chest ? ' et <b>un coffre de fer</b> pour tes 7 jours d’affilée !' : ''}`, { kind: r.chest ? 'epic' : 'success', icon: 'crystal' });
        app.refresh();
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
