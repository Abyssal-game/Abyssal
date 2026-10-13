// Épreuve du jour : le même combat pour tous les joueurs (équipe imposée, ennemis et dés fixés).
// On peut la rejouer autant qu'on veut ; seul le meilleur score du jour compte, la récompense une fois par jour.
import { RARITY } from '../config.js';
const HOW = [
  ['trial', '#E0485E', 'Le même combat pour tous', 'Chaque jour, une équipe imposée affronte les mêmes ennemis, avec les mêmes dés, pour tous les joueurs.'],
  ['team-ic', '#7FA8D8', 'Ton équipe imposée', '3 créatures au combat, 2 en réserve, toutes au niveau 3 : tes propres cartes ne comptent pas.'],
  ['crown', '#F2C14E', 'Le score', '1 000 points, moins 80 par tour, plus 3 par % de PV restants : gagne vite et sans trop de blessures.'],
  ['crystal', '#7FD3FF', 'La récompense', 'Ta première victoire du jour rapporte 40 éclats. Rejoue autant que tu veux : seul ton meilleur score compte.'],
  ['online', '#9C7BFF', 'Le classement', 'Connecté, ton meilleur score entre au classement du jour. Partage-le pour défier tes amis.'],
];
import { artUrl } from '../art/assets.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { PACTS } from '../core/pacts.js';
import { KITS } from '../core/skills.js';
import { roleOf } from '../core/army.js';
import { runDuel } from './duel-ui.js';
import { tuto } from '../ui/tutos.js';
import { EMBLEM } from '../ui/icons.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';

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
      <details class="panel dc-fold bn-ranking" id="tlb"><summary><span class="dc-sum-t">Classement de l’Épreuve</span></summary><div class="lb-body small muted">Chargement…</div></details>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>
        <ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol></details>
      <a class="btn ghost block" href="#/descente">${icon('back')}Retour à l’Aventure</a>`;
    root.querySelector('#tlb')?.addEventListener('toggle', (e) => { if (e.target.open) loadBoard(); }, { once: true });
    if (result?.won) root.querySelector('#tlb').open = true;
  }
  async function loadBoard() {
    const box = root.querySelector('#tlb .lb-body');
    if (!box) return;
    if (!cloud.isLoggedIn()) { box.innerHTML = 'Connecte-toi pour comparer ton score avec les autres joueurs. <a href="#/compte">Se connecter</a>'; return; }
    try {
      const t = g.trial();
      if (t.best && !t.sent) { await cloud.submitTrial(t.day, t.best.score, t.best.rounds, t.best.hp); t.sent = t.best.score; g.persist(); }
      const rows = await cloud.trialBoard(t.day, 30);
      if (!root.contains(box)) return;
      const me = cloud.currentUser()?.id;
      box.classList.remove('muted');
      box.innerHTML = (rows.length ? rows.map((r, i) => {
        const av = r.profiles?.avatar && cat.get(r.profiles.avatar);
        return `<div class="lb-row ${r.user_id === me ? 'me' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-av">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${esc(r.profiles?.pseudo || '?')}${cloud.badgeHTML(r.profiles?.badge)}</b><span class="small muted">${r.rounds} tour${r.rounds > 1 ? 's' : ''} · ${r.hp} % de PV</span></span><span class="lb-floor">${fmt(r.score)}</span></div>`;
      }).join('') : '<p class="small muted">Personne n’a encore réussi l’Épreuve aujourd’hui. À toi !</p>')
        + (!sync.profile?.pseudo ? '<p class="small acc-warn"><a href="#/compte">Choisis un pseudo</a> pour apparaître au classement.</p>' : '');
    } catch (e) {
      if (!root.contains(box)) return;
      box.textContent = e.status === 404 ? 'Le classement en ligne de l’Épreuve n’est pas encore activé sur le serveur.' : e.message;
    }
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
  tuto(app, 'trial');
  return () => { if (battle) { battle.stop(); battle = null; } document.body.classList.remove('battle-mode'); };
}
