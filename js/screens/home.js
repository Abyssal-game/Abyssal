// Accueil : logo, deux accès principaux et ce qui est à faire aujourd'hui.
import { mpw } from '../cloud/mpwatch.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct, openSheet } from '../ui/dom.js';
import { FACTION_ORDER, ECONOMY } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { setScene } from '../ui/scene.js';

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
    rows.push(`<div class="td-row td-daily ${g.canDailyClaim() ? '' : 'done'}" data-act="dailyinfo" role="button"><span class="td-ic mi" style="--mc:#F2C14E">${picon('streak')}</span><span class="td-t"><b>Offrande du jour</b><span class="small muted">${g.canDailyClaim() ? `Jour ${pos} sur 7 · aujourd’hui ${daily.amount} éclats${pos === 7 ? ' et un coffre de fer' : ''}` : `Reçue : ${dayGain(pos - 1)} éclats${pos === 7 ? ' et un coffre de fer' : ''} · demain ${pos === 7 ? g.dailyGainFor(sd + 1) : dayGain(pos)} éclats`}</span>${streakBar}</span>${g.canDailyClaim() ? `<span class="td-auto" title="Arrive tout seul">+${daily.amount}</span>` : `<span class="small muted">Reçue</span>`}</div>`);
    // v411 : ce qui se joue aujourd'hui, puis les missions, puis le coffre de la semaine (avant : tout mélangé)
    const tl = g.trials().done.filter((x) => !x).length, tw = g.trials().done.filter((x) => x === 'won').length;
    if (g.team().length >= 3) rows.push(`<a class="td-row ${tl ? '' : 'done'}" href="#/epreuves"><span class="td-ic mi" style="--mc:#E0485E">${picon('crest-elite')}</span><span class="td-t"><b>Épreuves du jour</b><span class="small muted">${tl ? `${tl} combat${tl > 1 ? 's' : ''} à jouer · un coffre par victoire` : `Terminées : ${tw} victoire${tw > 1 ? 's' : ''} sur 3 · retour demain`}</span></span>${tl ? icon('next') : '<span class="small muted">Demain</span>'}</a>`);
    /* v466 : défis du jour de la Salle des jeux encore à relever */
    { const gl = g.gamesDailyLeft(); if (gl.length) rows.push(`<a class="td-row" href="#/jeux"><span class="td-ic mi" style="--mc:#C9A45A">${picon('seal')}</span><span class="td-t"><b>Jeux du jour</b><span class="small muted">${gl.length} défi${gl.length > 1 ? 's' : ''} à relever · un coffre de bois par victoire</span></span>${icon('next')}</a>`); }
    if (chests) rows.push(`<a class="td-row" href="#/coffres"><span class="td-ic mi" style="--mc:#E8C35A">${picon('chest')}</span><span class="td-t"><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Éclats et boosters</span></span>${icon('next')}</a>`);
    // v521 : ce qui t'attend en ligne (à toi de jouer, défis, duels à voir, demandes d'ami), en tête
    for (const it of mpw.items) rows.unshift(`<a class="td-row td-live" href="${it.href}"><span class="td-ic mi" style="--mc:#F2C14E">${picon(it.icon)}</span><span class="td-t"><b>${it.title}</b><span class="small muted">${it.sub}</span></span><span class="td-new">!</span>${icon('next')}</a>`);
    rows.push('<h3 class="td-sub">Missions</h3>'); /* v658 : « Missions » (le coffre de la semaine n'est pas une mission du jour) */
    m.list.forEach((x, i) => {
      const done = x.p >= x.n;
      rows.push(`<div class="td-row ${x.claimed ? 'done' : ''}" data-act="minfo" data-i="${i}" role="button"><span class="td-ic mi" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : MISSION_LOOK[x.kind]?.[1] || '#C8A45D'}">${x.claimed ? icon('check') : x.faction ? sigil(x.faction) : picon(MISSION_LOOK[x.kind]?.[0] || 'seal')}</span><span class="td-t"><b>${esc(x.text)}</b>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}</span>${x.claimed ? '<span class="small muted">Fait</span>' : done ? `<span class="td-auto" title="Arrive tout seul">+${x.shards}</span>` : `<span class="td-n small muted">${x.p}/${x.n}</span>`}</div>`);
    });
    const wch = g.weekChest();
    if (!wch.claimed) rows.push(`<div class="td-row ${wch.ready ? '' : 'wait'}" data-act="wkinfo" role="button"><span class="td-ic mi" style="--mc:#F2C14E">${picon('chest')}</span><span class="td-t"><b>Coffre de la semaine</b><span class="small muted">${wch.ready ? 'Tu as joué 5 jours cette semaine : un coffre d’or t’attend !' : `Joue ${wch.need} jours cette semaine pour un coffre d’or · ${wch.days} / ${wch.need}`}</span>${wch.ready ? '' : `<span class="progress"><i style="width:${(wch.days / wch.need) * 100}%"></i></span>`}</span>${wch.ready ? '<span class="td-auto">Coffre</span>' : ''}</div>`);
    return `<section class="panel today"><div class="today-head"><h2>Aujourd’hui</h2></div>${rows.join('')}</section>`;
  }

  // Objectifs : un proche, un de progression, un de collection ; chacun mène à son écran
  // Objectifs : le premier en grand en haut de l'accueil (« Ton prochain objectif »), les autres plus bas
  const goals = g.welcomePending() ? [] : g.goals().filter((x) => x.kind !== 'trial'); /* v411 : les Épreuves sont dans « Aujourd'hui » */
  const GCOL = { run: '#E0485E', depth: '#9C7BFF', boss: '#FF6B7F', sceaux: '#E8C35A', collection: '#7FA8D8', forge: '#F08A3C', sublime: '#C9A8FF', shop: '#F2C14E', trial: '#E0485E' };
  const goalRow = (x, cls = 'hg-row') => `<a class="${cls}" href="${x.href}" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : GCOL[x.kind]}">
      <span class="td-ic mi">${x.faction ? sigil(x.faction) : picon(x.icon)}</span>
      <span class="td-t">${cls === 'hg-main' ? '<span class="hg-k">Ton prochain objectif</span>' : ''}<b>${esc(x.title)}</b><span class="small muted">${esc(x.sub)}</span>${x.n ? `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>` : ''}</span>${icon('next')}</a>`;
  function mainGoalHTML() { return goals.length ? `<section class="panel ornate hg-main-wrap">${goalRow(goals[0], 'hg-main')}</section>` : ''; }
  root.innerHTML = `
    <section class="home-brand">
      <h1 class="hb-title"><img src="assets/brand/title.webp" alt="ABYSSAL — Le Bestiaire interdit"></h1>
    </section>

    ${g.welcomePending() ? `<a class="panel ornate hw-welcome" href="#/boutique"><span class="hw-ic">${picon('ticket')}</span><span><b>${g.s.welcomeGift > 0 ? `Cadeau de bienvenue : ${g.s.welcomeGift > 1 ? `${g.s.welcomeGift} boosters offerts` : '1 booster offert'} !` : g.s.tickets.standard > 1 ? `Tes ${g.s.tickets.standard} boosters de bienvenue t’attendent` : 'Ton booster de bienvenue t’attend'}</b><span class="small">${g.s.welcomeGift > 0 && g.freePack().stock ? 'Plus ton booster gratuit du jour. ' : ''}Ouvre-les pour découvrir tes premières créatures : elles formeront ton équipe.</span></span>${icon('next')}</a>` : ''}
    ${mainGoalHTML()}

    ${todayHTML()}
    <p class="home-col small muted center"><a href="#/collection">${owned} / ${total} créatures découvertes</a></p>
  `;
  // (v413 : le nombre de joueurs en ligne n'est plus sur l'Accueil : Réglages → À propos, tout en bas)
  document.querySelectorAll('body > .online-pill').forEach((x) => x.remove());
  lazyArt(root);
  setScene('home');
  bindActions(root, {
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
