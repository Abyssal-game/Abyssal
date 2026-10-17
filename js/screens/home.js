// Accueil : logo, deux accès principaux et ce qui est à faire aujourd'hui.
import { isGuest } from '../ui/gate.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct } from '../ui/dom.js';
import { FACTION_ORDER } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { setScene } from '../ui/scene.js';
import { onPresence } from '../cloud/presence.js';

// Icône et couleur de chaque type de mission du jour
const MISSION_LOOK = { booster: ['booster', '#E0485E'], new: ['book', '#B48CFF'], rare: ['crystal', '#6FB4FF'], variant: ['holo', '#FF8AD8'], burn: ['furnace', '#FF9A3A'], depth: ['depth', '#9C7BFF'], trial: ['crest-elite', '#E0485E'], win: ['crown', '#F2C14E'], daily: ['crystal', '#7FD3FF'], chest: ['chest', '#E8C35A'] };

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  const ev = g.event();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);

  const chests = g.chestCount();

  // « Aujourd'hui » : tout ce qui se récupère ou s'accomplit dans la journée, au même endroit.
  function todayHTML() {
    const m = g.missions();
    const rows = [];
    // Série de jours : 7 cases, un coffre de fer au 7e jour
    const sd = g.canDailyClaim() ? daily.streak : (s.daily.streak || 0), pos = ((sd - 1) % 7) + 1;
    const streakBar = `<span class="td-streak">${Array.from({ length: 7 }, (_, k) => `<i class="${k < (g.canDailyClaim() ? pos - 1 : pos) ? 'on' : ''} ${k === pos - 1 && g.canDailyClaim() ? 'now' : ''} ${k === 6 ? 'chest' : ''}">${k === 6 ? icon('lock') : k + 1}</i>`).join('')}</span>`;
    rows.push(`<div class="td-row td-daily ${g.canDailyClaim() ? '' : 'done'}"><span class="td-ic mi" style="--mc:#F2C14E">${picon('streak')}</span><span class="td-t"><b>Offrande du jour</b><span class="small muted">${g.canDailyClaim() ? `Jour ${pos} sur 7${pos === 7 ? ' : un coffre de fer en plus !' : ''}` : `Récupérée · série de ${sd} jour${sd > 1 ? 's' : ''}`}</span>${streakBar}</span>${g.canDailyClaim() ? `<button class="btn small gold" data-act="daily">+${daily.amount}</button>` : `<span class="small muted">Demain</span>`}</div>`);
    // v411 : ce qui se joue aujourd'hui, puis les missions, puis le coffre de la semaine (avant : tout mélangé)
    const tl = g.trials().done.filter((x) => !x).length, tw = g.trials().done.filter((x) => x === 'won').length;
    if (g.team().length >= 3) rows.push(`<a class="td-row ${tl ? '' : 'done'}" href="#/epreuves"><span class="td-ic mi" style="--mc:#E0485E">${picon('crest-elite')}</span><span class="td-t"><b>Épreuves du jour</b><span class="small muted">${tl ? `${tl} combat${tl > 1 ? 's' : ''} à jouer · un coffre par victoire` : `Faites : ${tw} victoire${tw > 1 ? 's' : ''} sur 3 · retour demain`}</span></span>${tl ? icon('next') : '<span class="small muted">Demain</span>'}</a>`);
    if (chests) rows.push(`<a class="td-row" href="#/coffres"><span class="td-ic mi" style="--mc:#E8C35A">${picon('chest')}</span><span class="td-t"><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Éclats et boosters</span></span>${icon('next')}</a>`);
    rows.push('<h3 class="td-sub">Missions du jour</h3>');
    m.list.forEach((x, i) => {
      const done = x.p >= x.n;
      rows.push(`<div class="td-row ${x.claimed ? 'done' : ''}"><span class="td-ic mi" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : MISSION_LOOK[x.kind]?.[1] || '#C8A45D'}">${x.claimed ? icon('check') : x.faction ? sigil(x.faction) : picon(MISSION_LOOK[x.kind]?.[0] || 'seal')}</span><span class="td-t"><b>${esc(x.text)}</b>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}</span>${x.claimed ? '<span class="small muted">Fait</span>' : done ? `<button class="btn small gold" data-act="mission" data-i="${i}">+${x.shards}</button>` : `<span class="td-n small muted">${x.p}/${x.n}</span>`}</div>`);
    });
    const wch = g.weekChest();
    if (!wch.claimed) rows.push(`<div class="td-row ${wch.ready ? '' : 'wait'}"><span class="td-ic mi" style="--mc:#F2C14E">${picon('chest')}</span><span class="td-t"><b>Coffre de la semaine</b><span class="small muted">${wch.ready ? 'Tu as joué 5 jours cette semaine : un coffre d’or t’attend !' : `Joue ${wch.need} jours cette semaine pour un coffre d’or · ${wch.days} / ${wch.need}`}</span>${wch.ready ? '' : `<span class="progress"><i style="width:${(wch.days / wch.need) * 100}%"></i></span>`}</span>${wch.ready ? '<button class="btn small gold td-claim" data-act="weekchest">Ouvrir</button>' : ''}</div>`);
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
  function goalsHTML() {
    const list = goals.slice(1);
    if (!list.length) return '';
    return `<section class="panel hg"><h2>Tes prochains objectifs</h2>${list.map((x) => goalRow(x)).join('')}</section>`;
  }

  root.innerHTML = `
    <section class="home-brand">
      <h1 class="hb-title"><img src="assets/brand/title.webp" alt="ABYSSAL — Le Bestiaire interdit"></h1>
    </section>

    ${g.welcomePending() ? `<a class="panel ornate hw-welcome" href="#/boutique"><span class="hw-ic">${picon('ticket')}</span><span><b>${g.s.tickets.standard > 1 ? `Tes ${g.s.tickets.standard} boosters de bienvenue t’attendent` : 'Ton booster de bienvenue t’attend'}</b><span class="small">Ouvre-les pour découvrir tes premières créatures : elles formeront ton équipe.</span></span>${icon('next')}</a>` : ''}
    ${isGuest() && !g.welcomePending() ? `<a class="panel hw-guest" href="#/compte"><span class="hw-ic">${icon('info')}</span><span><b>Mode invité : ta partie n’est pas sauvegardée en ligne</b><span class="small">Crée un compte gratuit pour ne jamais la perdre (changement de téléphone, appli supprimée).</span></span>${icon('next')}</a>` : ''}
    ${mainGoalHTML()}

    ${todayHTML()}
    ${goalsHTML()}
    <a class="panel hw-event" href="#/boutique" style="--e1:${cat.faction[ev.factions[0]].colors.secondary};--e2:${cat.faction[ev.factions[1]].colors.secondary}">
      <span class="hw-ev-sig">${sigil(ev.factions[0])}${sigil(ev.factions[1])}</span>
      <span><span class="small muted">Événement de la semaine · encore ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}</span><b>${esc(ev.name)}</b><span class="small">${esc(ev.desc)}</span></span>${icon('next')}</a>
    <p class="home-col small muted center"><a href="#/collection">${owned} / ${total} créatures découvertes</a></p>
    <div class="online-pill" role="status" aria-live="polite"><img class="on-ic" alt="" src="assets/icons/online.webp"><span class="on-dot"></span><span class="on-t">Connexion…</span></div>
  `;
  // Joueurs connectés en ce moment (mis à jour en direct)
  // la pastille reste dans le contenu de l'Accueil (v223) ; on retire une éventuelle ancienne copie posée sur la page
  document.querySelectorAll('body > .online-pill').forEach((x) => x.remove());
  const pill = root.querySelector('.online-pill');
  const offP = onPresence((p) => {
    pill.classList.toggle('live', p.status === 'on');
    pill.querySelector('.on-t').innerHTML = p.status === 'on' ? `<b>${fmt(p.count)}</b> joueur${p.count > 1 ? 's' : ''} en ligne` : p.status === 'connecting' ? 'Connexion…' : 'Hors ligne';
  });
  lazyArt(root);
  setScene('home');
  bindActions(root, {
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
  return () => { app.refreshView = null; offP(); pill.remove(); };
}
