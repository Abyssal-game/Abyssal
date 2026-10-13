// Épreuve du jour : le même combat pour tous les joueurs (équipe imposée, ennemis et dés fixés).
// On peut la rejouer autant qu'on veut ; seul le meilleur score du jour compte, la récompense une fois par jour.
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { PACTS } from '../core/pacts.js';
import { KITS } from '../core/skills.js';
import { roleOf } from '../core/army.js';
import { runDuel } from './duel-ui.js';

export default function trialScreen(app, root) {
  const g = app.game, cat = app.catalog;
  let battle = null, result = null;

  const mini = (id, extra = '') => { const c = cat.get(id); return `<span class="tr-c" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"><b>${esc(c.name)}</b><small>${esc(KITS[roleOf(c)].name)}${extra}</small></span>`; };
  function lobby() {
    setScene('descent');
    const t = g.trial(), d = g.trialDef(t.day), P = d.pact && PACTS[d.pact];
    root.innerHTML = `<header class="screen-head ui-hero bn-trial"><h1>Épreuve du jour</h1><p class="muted">Le même combat pour tout le monde aujourd’hui. Gagne en peu de tours, avec le plus de PV possible.</p></header>
      ${result ? resultHTML(result) : ''}
      <section class="panel tr-box">
        <h2 class="section-title">Ton équipe imposée <small class="muted">niveau 3</small></h2>
        <div class="tr-row">${d.team.map((id, i) => mini(id, i >= 3 ? ' · réserve' : '')).join('')}</div>
        <h2 class="section-title">En face</h2>
        <div class="tr-row">${d.enemies.map((e) => mini(e.id, e.elite ? ' · élite' : '')).join('')}</div>
        ${P ? `<p class="small tr-pact" style="--pk:${P.color}"><b>${esc(P.name)}</b> imposé : ${esc(P.gain)} <span class="dc-bad">${esc(P.cost)}</span></p>` : ''}
        <p class="small muted">Score : 1 000 − 80 par tour + 3 par % de PV restants. Première victoire du jour : <b>+40 éclats</b>${t.paid ? ' (déjà gagnée)' : ''}.</p>
        ${t.best ? `<p class="tr-best">${icon('crown')} Ton meilleur score du jour : <b>${fmt(t.best.score)}</b> <span class="small muted">(${t.best.rounds} tour${t.best.rounds > 1 ? 's' : ''}, ${t.best.hp} % de PV)</span></p>` : ''}
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="go">${icon('swords')}${t.run ? 'Reprendre l’épreuve' : t.tries ? 'Retenter l’épreuve' : 'Lancer l’épreuve'}</button>
        ${t.best ? `<button class="btn ghost block" data-act="share">${icon('copy')}Partager mon score</button>` : ''}
      </section>
      <a class="btn ghost block" href="#/descente">${icon('back')}Retour à l’Aventure</a>`;
  }
  function resultHTML(r) {
    return `<section class="panel tr-res ${r.won ? 'won' : 'lost'}"><b>${r.won ? 'Épreuve réussie' : 'Épreuve perdue'}</b>
      ${r.won ? `<span class="tr-score">${fmt(r.score)}</span><span class="small">${r.rounds} tour${r.rounds > 1 ? 's' : ''} · ${r.hp} % de PV restants${r.record ? ' · <b class="dc-good">nouveau record du jour !</b>' : ''}</span>${r.shards ? `<span class="small">${icon('crystal')} +${r.shards} éclats</span>` : ''}` : '<span class="small">Change d’approche : l’équipe et les ennemis seront les mêmes.</span>'}</section>`;
  }
  function play() {
    const t = g.trial();
    if (!t.run) g.trialStart();
    const run = g.trial().run;
    setScene(null);
    battle = runDuel(app, root, { title: 'Épreuve du jour', run, pause: 'Épreuve en pause : reprends-la depuis l’Aventure.', onEnd: () => {
      battle = null;
      try { result = g.trialFinish(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
      app.chrome?.();
      (result?.won ? app.sfx.victory : app.sfx.defeat)?.();
      lobby(); window.scrollTo(0, 0);
    } });
  }
  function share() {
    const b = g.trial().best;
    if (!b) return;
    const txt = `ABYSSAL · Épreuve du jour du ${new Date().toLocaleDateString('fr-FR')} : ${b.score} points (${b.rounds} tour${b.rounds > 1 ? 's' : ''}, ${b.hp} % de PV). Tu fais mieux ? ${location.origin}${location.pathname}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else navigator.clipboard?.writeText(txt).then(() => toast('Score copié : colle-le dans un message.', { icon: 'copy' }));
  }
  bindActions(root, { go() { result = null; play(); }, share() { share(); } });
  lobby();
  return () => { if (battle) { battle.stop(); battle = null; } document.body.classList.remove('battle-mode'); };
}
