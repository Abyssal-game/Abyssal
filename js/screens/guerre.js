// Guerre des Factions : serment de la semaine, points, paliers, historique. Jouée en solo contre l'Abîme.
import { WAR, tiersReached, daysLeft } from '../core/war.js';
import { FACTION_ORDER } from '../config.js';
import { icon, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';

export default function guerreScreen(app, root) {
  const g = app.game, cat = app.catalog;

  function render() {
    setScene('factions');
    const w = g.war(), left = daysLeft(g.clock()), top = WAR.tiers[WAR.tiers.length - 1].at;
    const reached = tiersReached(w.points), F = w.side ? cat.faction[w.side] : null;
    const day = new Date(g.clock()), dk = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    root.innerHTML = `<header class="screen-head ui-hero bn-faction"><h1>Guerre des Factions</h1><p class="muted">Chaque semaine, prête serment à un royaume et repousse l’Abîme à ses frontières.</p>
        <span class="sc-rec">${left > 1 ? `Encore ${left} jours` : 'Dernier jour'} · nouvelle guerre lundi</span></header>
      ${w.report ? `<section class="panel wr-report"><b>La guerre précédente est finie</b><span class="small">Pour ${esc(cat.faction[w.report.side].name)} : ${fmt(w.report.points)} points, ${w.report.tiers} palier${w.report.tiers > 1 ? 's' : ''} sur ${WAR.tiers.length}.${w.report.paid ? ` Les récompenses oubliées t’ont été versées : <b>+${fmt(w.report.paid)}</b> éclats.` : ''}</span><button class="btn small ghost" data-act="okrep">OK</button></section>` : ''}
      ${w.side ? `<section class="panel wr-side" style="--fc:${F.colors.secondary}"><span class="wr-sig">${sigil(w.side)}</span><span><span class="small muted">Ton serment cette semaine</span><b>${esc(F.realm)}</b><span class="small">${esc(F.motto)}</span></span></section>
        <section class="panel wr-front"><div class="wr-pts"><b>${fmt(w.points)}</b><span class="small muted">points de guerre</span></div>
          <div class="wr-bar"><i style="width:${Math.min(100, (w.points / top) * 100)}%;--fc:${F.colors.secondary}"></i>${WAR.tiers.map((t) => `<em style="left:${(t.at / top) * 100}%" class="${w.points >= t.at ? 'ok' : ''}"></em>`).join('')}</div>
          <div class="wr-tiers">${WAR.tiers.map((t, i) => { const ok = reached.includes(i), got = w.claimed[i]; return `<div class="wr-tier ${ok ? 'ok' : ''} ${got ? 'got' : ''}"><span><b>${esc(t.name)}</b><span class="small muted">${fmt(t.at)} points · ${icon('crystal')}${t.shards}${t.frame ? ' · Cadre de la Guerre' : ''}${t.title ? ` · titre « ${esc(t.title)} »` : ''}</span></span>${got ? `<span class="wr-got">${icon('check')}</span>` : ok ? `<button class="btn small primary" data-act="claim" data-i="${i}">Recevoir</button>` : `<span class="small muted">${fmt(t.at - w.points)} à faire</span>`}</div>`; }).join('')}</div></section>`
      : `<section class="panel wr-pick"><h2>Choisis ton royaume</h2><p class="small">Ton serment dure jusqu’à lundi. Les combats gagnés avec au moins <b>2 créatures de ce royaume</b> sur 3 au combat rapportent <b>50 % de points en plus</b>.</p>
          <div class="wr-facs">${FACTION_ORDER.map((f) => `<button class="wr-fac" data-act="join" data-f="${f}" style="--fc:${cat.faction[f].colors.secondary}"><span class="wr-sig">${sigil(f)}</span><b>${esc(cat.faction[f].name)}</b><span class="small muted">${g.factionProgress(f).owned} carte${g.factionProgress(f).owned > 1 ? 's' : ''}</span></button>`).join('')}</div></section>`}
      <section class="panel wr-how"><h2>Gagner des points</h2>
        <ul>${Object.entries(WAR.sources).map(([k, s]) => { const n = w.used[`${k}:${dk}`] || 0; return `<li><span>${esc(s.name)}</span><b>${s.pts}</b><span class="small muted">${n}/${s.fresh} aujourd’hui${n >= s.fresh ? ' · moitié moins' : ''}</span></li>`; }).join('')}</ul>
        <p class="small muted">Varie tes activités : au-delà du nombre indiqué dans la journée, une victoire du même genre rapporte moitié moins.</p></section>
      <p class="small muted center wr-honest">${picon('rule')} La Guerre des Factions se joue en solo, contre l’Abîme : il n’y a ni autres joueurs ni classement. Seuls comptent tes points et les paliers.</p>
      ${w.history.length ? `<h2 class="section-title">Guerres passées</h2><div class="stack">${w.history.map((h) => `<div class="panel wr-hist" style="--fc:${cat.faction[h.side].colors.secondary}"><span class="wr-sig sm">${sigil(h.side)}</span><span><b>${esc(cat.faction[h.side].name)}</b><span class="small muted">${fmt(h.points)} points · ${h.tiers} / ${WAR.tiers.length} paliers</span></span></div>`).join('')}</div>` : ''}`;
    tuto(app, 'guerre');
  }

  bindActions(root, {
    async join(el) {
      const f = el.dataset.f;
      if (!(await confirmBox(`Prêter serment à <b>${esc(cat.faction[f].realm)}</b> jusqu’à lundi ? Tu ne pourras plus changer cette semaine.`, { ok: 'Prêter serment' }))) return;
      try { g.warJoin(f); app.sfx.discover?.(); render(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    claim(el) {
      try { const t = g.warClaim(Number(el.dataset.i)); app.sfx.reveal?.('R'); app.chrome?.(); toast(`<b>${esc(t.name)}</b> : +${t.shards} éclats${t.frame ? ', Cadre de la Guerre' : ''}${t.title ? `, titre « ${esc(t.title)} »` : ''}`, { icon: 'crystal' }); render(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    okrep() { g.s.war.report = null; g.persist(); render(); },
  });
  render();
}
