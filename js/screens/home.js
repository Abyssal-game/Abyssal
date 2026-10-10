// Accueil : logo, créature emblématique, accès rapides, progression, découvertes.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct } from '../ui/dom.js';
import { FACTION_ORDER } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  // Créature du jour : une mythique possédée, sinon la silhouette d'une mythique
  const mythics = cat.cards.filter((c) => c.rarity === 'M');
  const ownedM = mythics.filter((c) => g.owns(c.id));
  const pool = ownedM.length ? ownedM : mythics;
  const hero = pool[Math.floor(seeded('jour:' + today())() * pool.length)];
  const heroOwned = g.owns(hero.id);
  const fac = cat.faction[hero.faction];
  const ev = g.event();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);
  const freeCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + g.freePack().stock;

  root.innerHTML = `
    <section class="hero" style="--fc:${fac.colors.secondary}">
      <div class="hero-art"><img alt="" src="${artUrl(hero, { mystery: !heroOwned })}"></div>
      <div class="hero-veil"></div>
      <div class="hero-content">
        <div class="logo">${EMBLEM}<h1 class="wordmark">ABYSSAL</h1><p class="tagline">Le Bestiaire interdit</p></div>
        <button class="hero-caption" data-act="hero" aria-label="Voir la créature du jour">
          <span class="small muted">${heroOwned ? 'Créature du jour' : 'Une mythique t’attend'}</span>
          <b>${heroOwned ? esc(hero.name) : '???'}</b>
          <span class="small" style="color:${fac.colors.secondary}">${sigil(hero.faction)} ${esc(fac.name)}</span>
        </button>
      </div>
    </section>

    <div class="home-cta">
      <a class="btn primary block big-cta" href="#/boutique">${icon('booster')}Ouvrir un booster${freeCount ? `<span class="cta-badge">${freeCount} gratuit${freeCount > 1 ? 's' : ''}</span>` : ''}</a>
    </div>

    ${g.canDailyClaim() ? `<div class="panel ornate daily">
      <div><h3>Offrande du jour</h3><p class="small muted">${daily.streak > 1 ? `Série de ${daily.streak} jours. ` : ''}Rien n’est perdu si tu manques un jour : la série recommence simplement.</p></div>
      <button class="btn gold" data-act="daily">${icon('crystal')}+${daily.amount}</button>
    </div>` : ''}

    <div class="panel progress-card">
      <div class="ring" style="--p:${(owned / total) * 100};--c:var(--gold)"><span>${Math.floor((owned / total) * 100)}%</span></div>
      <div class="pc-text">
        <b>${owned} / ${total} créatures</b>
        <span class="small muted">${s.recent.length ? 'Le Bestiaire se reconstitue page après page.' : 'Le Bestiaire est encore scellé. Ouvre ton premier booster.'}</span>
        <div class="fac-mini">${FACTION_ORDER.map((f) => { const p = g.factionProgress(f); return `<a href="#/faction/${f}" class="fm" style="--c:${cat.faction[f].colors.secondary}" title="${esc(cat.faction[f].name)} : ${p.owned}/${p.total}" aria-label="${esc(cat.faction[f].name)} : ${p.owned} sur ${p.total}">${sigil(f)}<i style="height:${p.ratio * 100}%"></i></a>`; }).join('')}</div>
      </div>
    </div>

    <nav class="home-grid" aria-label="Accès rapides">
      <a class="tile" href="#/collection">${icon('cards')}<b>Collection</b><span>${owned} cartes</span></a>
      <a class="tile" href="#/bestiaire">${icon('book')}<b>Bestiaire</b><span>Chroniques et lore</span></a>
      <a class="tile" href="#/factions">${icon('shield')}<b>Factions</b><span>Sept royaumes</span></a>
      <a class="tile" href="#/succes">${icon('trophy')}<b>Succès</b><span>${Object.keys(s.achievements).length} / ${cat.achievements.length}</span></a>
      <a class="tile" href="#/parametres">${icon('gear')}<b>Réglages</b><span>Son, sauvegarde</span></a>
    </nav>

    <a class="panel event-banner" href="#/boutique" style="--a:${cat.faction[ev.factions[0]].colors.secondary};--b:${cat.faction[ev.factions[1]].colors.secondary}">
      <span class="small muted">Événement de la semaine · encore ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}</span>
      <b>${esc(ev.name)}</b>
      <span class="small">${ev.factions.map((f) => `${sigil(f)} ${esc(cat.faction[f].name)}`).join(' · ')}</span>
    </a>

    ${recent.length ? `<h2 class="section-title">Dernières découvertes <a class="more" href="#/collection">Tout voir</a></h2>
    <div class="strip" id="recent">${recent.map((c) => cardHTML(c, { lazy: true, isNew: g.entry(c.id)?.isNew })).join('')}</div>` : ''}
  `;
  lazyArt(root);
  bindActions(root, {
    hero() { app.openCard(hero.id); },
    daily() {
      try {
        const r = g.claimDaily();
        app.sfx.coin();
        toast(`Offrande reçue : <b>+${r.amount} éclats</b>`, { kind: 'success', icon: 'crystal' });
        app.refresh();
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
  });
  const strip = root.querySelector('#recent');
  strip?.addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) app.openCard(t.dataset.id, { list: recent.map((c) => c.id) }); });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
