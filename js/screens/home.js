// Accueil : logo, créature emblématique, accès rapides, progression, découvertes.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct } from '../ui/dom.js';
import { FACTION_ORDER } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { openFusion } from './fusion.js';
import { FUSION } from '../config.js';

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  // Créature du jour : une mythique possédée, sinon la silhouette d'une mythique
  // Créature du jour : la plus belle carte illustrée que le joueur possède déjà (rien n'est dévoilé).
  const ownedArt = cat.cards.filter((c) => g.owns(c.id) && hasRealArt(c.id));
  const best = ['S', 'M', 'HR', 'R'].map((r) => ownedArt.filter((c) => c.rarity === r)).find((l) => l.length);
  const mythics = cat.cards.filter((c) => c.rarity === 'M');
  const pool = best || (ownedArt.length ? ownedArt : mythics);
  const hero = pool[Math.floor(seeded('jour:' + today())() * pool.length)];
  const heroOwned = g.owns(hero.id);
  const fac = cat.faction[hero.faction];
  const ev = g.event();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);
  const freeCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + g.freePack().stock;

  const spare = ['C', 'PC', 'R', 'HR'].reduce((a, r) => a + g.spareCount(r), 0);
  function missionsHTML() {
    const m = g.missions();
    const end = new Date(); end.setHours(24, 0, 0, 0);
    const h = Math.max(1, Math.ceil((end - Date.now()) / 3600000));
    const allClaimed = m.list.every((x) => x.claimed);
    return `<section class="panel missions" aria-label="Missions du jour">
      <div class="mi-head"><h3>Missions du jour</h3><span class="small muted">Nouvelles dans ${h} h</span></div>
      ${m.list.map((x, i) => {
        const done = x.p >= x.n;
        return `<div class="mi ${x.claimed ? 'claimed' : ''}">
          <span class="mi-t">${esc(x.text)}</span>
          <span class="mi-r">${x.claimed ? `<span class="mi-ok">${icon('check')}Fait</span>` : done ? `<button class="btn small gold" data-act="mission" data-i="${i}">${icon('crystal')}+${x.shards}</button>` : `<span class="small muted">${icon('crystal')} ${x.shards}</span>`}</span>
          <span><span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span><span class="mi-n">${x.p} / ${x.n}</span></span>
        </div>`;
      }).join('')}
      ${m.bonus ? '' : `<div class="mi-bonus"><span class="small">${allClaimed ? 'Les trois missions sont accomplies !' : 'Accomplis les trois missions pour gagner un <b>booster standard</b>.'}</span>${allClaimed ? `<button class="btn small primary" data-act="mbonus">${icon('ticket')}Récupérer</button>` : ''}</div>`}
    </section>`;
  }

  root.innerHTML = `
    <section class="hero ${heroOwned ? '' : 'hero-empty'}" style="--fc:${fac.colors.secondary}">
      ${heroOwned ? `<div class="hero-art"><img alt="" src="${artUrl(hero)}"></div>` : ''}
      <div class="hero-veil"></div>
      <div class="hero-content">
        <div class="logo">${EMBLEM}<h1 class="wordmark">ABYSSAL</h1><p class="tagline"><i></i>Le Bestiaire interdit<i></i></p></div>
        ${heroOwned ? `<button class="hero-caption" data-act="hero" aria-label="Voir la créature du jour">
          <span class="small muted">Créature du jour</span>
          <b>${esc(hero.name)}</b>
          <span class="small" style="color:${fac.colors.secondary}">${sigil(hero.faction)} ${esc(fac.name)}</span>
        </button>` : '<span></span>'}
      </div>
    </section>

    <div class="home-cta">
      <a class="btn primary block big-cta" href="#/boutique">${icon('booster')}Ouvrir un booster${freeCount ? `<span class="cta-badge">${freeCount} gratuit${freeCount > 1 ? 's' : ''}</span>` : ''}</a>
    </div>

    ${g.canDailyClaim() ? `<div class="panel ornate daily">
      <div><h3>Offrande du jour</h3><p class="small muted">${daily.streak > 1 ? `Série de ${daily.streak} jours. ` : ''}Rien n’est perdu si tu manques un jour : la série recommence simplement.</p></div>
      <button class="btn gold" data-act="daily">${icon('crystal')}+${daily.amount}</button>
    </div>` : ''}

    ${missionsHTML()}

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
      <button class="tile" data-act="fusion">${icon('sparkle')}<b>Fusion</b><span>${spare} doublon${spare > 1 ? 's' : ''}</span></button>
    </nav>

    <a class="panel event-banner" href="#/boutique" style="--a:${cat.faction[ev.factions[0]].colors.secondary};--b:${cat.faction[ev.factions[1]].colors.secondary}">
      <span class="small muted">Événement de la semaine · encore ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}</span>
      <b>${esc(ev.name)}</b>
      <span class="small">${ev.factions.map((f) => `${sigil(f)} ${esc(cat.faction[f].name)}`).join(' · ')}</span>
    </a>

    ${recent.length ? `<h2 class="section-title">Dernières découvertes <a class="more" href="#/collection">Tout voir</a></h2>
    <div class="strip" id="recent">${recent.map((c) => cardHTML(c, { lazy: true, isNew: g.entry(c.id)?.isNew })).join('')}</div>` : ''}
    <footer class="credit">ABYSSAL · Créé par <b>Alexis Seguin</b></footer>
  `;
  lazyArt(root);
  bindActions(root, {
    hero() { app.openCard(hero.id); },
    fusion() { openFusion(app); },
    mission(el) {
      try { const r = g.claimMission(Number(el.dataset.i)); app.sfx.coin(); toast(`Mission accomplie : <b>+${r.shards} éclats</b>`, { kind: 'success', icon: 'crystal' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    mbonus() {
      try { g.claimMission('bonus'); app.sfx.achievement(); toast('Bonus des missions : <b>1 booster standard</b> offert !', { kind: 'epic', icon: 'ticket' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
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
