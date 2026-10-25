// v771 : la fin de la Descente, après la première victoire contre l'Abysse (et rejouable : Bestiaire → Histoire, Mode Créateur).
// L'œil se referme, la première page du Bestiaire glisse jusqu'au joueur, les sept noms (le septième gratté) puis le sien,
// celui qui rêve ouvre les yeux, la page scellée de l'Abysse (trophée : elle ne combat jamais), puis l'annonce de l'Arc I.
import { esc } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';

const NAMES = [['braise', 'La Scelleuse de Braise'], ['fosses', 'Le Scelleur des Fosses'], ['cieux', 'La Scelleuse des Cieux'], ['bois', 'Le Scelleur des Bois'], ['tombes', 'La Scelleuse des Tombes'], ['montagnes', 'Le Scelleur des Montagnes']]; /* v774 : une signature peinte par Scelleur */
const EYE_FRAMES = 8;

/* la page scellée de l'Abysse : affichée comme une carte, mais jamais dans la collection ni en combat */
export function abyssPageHTML() {
  return `<div class="endx-card"><img alt="" src="assets/fin/carte-abysse.webp"><span class="endx-cn"><b>L’Abysse</b><small>Le plus grand rêve</small></span><span class="endx-tag">Page scellée · Trophée</span></div>`;
}

export function playEnding(app, { name } = {}) {
  const who = name || sync.profile?.pseudo || app.game?.s?.name || 'Toi';
  const scenes = [
    { cls: 'eye', text: 'L’œil se referme.', sfx: () => app.sfx.rumble?.(), extra: '<div class="endx-eyeanim"></div>' }, /* v774 : l'œil qui se ferme, 8 images */
    { img: 'page', cls: 'page', text: 'Dans le silence, une page glisse jusqu’à toi : la toute première du Bestiaire interdit, celle que personne n’avait jamais vue.', sfx: () => app.sfx.page?.() },
    { img: 'velin', cls: 'velin', text: 'Sept noms y sont signés, ceux des premiers Scelleurs ; le septième a été gratté jusqu’au vélin. Dessous, une ligne d’encre fraîche s’écrit toute seule : c’est ton nom.', sfx: () => app.sfx.page?.(),
      extra: `<div class="endx-names">${NAMES.map(([k, n], i) => `<span style="--d:${0.5 + i * 0.55}s"><img alt="${esc(n)}" src="assets/fin/sig-${k}.webp"></span>`).join('')}<span class="scr" style="--d:${0.5 + 6 * 0.55}s"><img alt="" src="assets/fin/sig-gratte.webp"></span><span class="me" style="--d:${0.9 + 7 * 0.55}s" translate="no">${esc(who)}</span></div>` },
    { img: 'reveur', cls: 'dream', text: 'Les vingt chapitres sont refermés. Mais au bas de la page, quelque chose vient d’ouvrir les yeux.', sfx: () => app.sfx.rumble?.(), extra: '<i class="endx-eyes"></i>' },
    { cls: 'trophy', sfx: () => app.sfx.reveal?.('S'), extra: `<div class="endx-tro"><span class="endx-k">Le dernier rêve</span>${abyssPageHTML()}<p>Tu n’as pas dompté l’Abysse : tu l’as refermé dans une page. Il ne combat pour personne. Il attend celui qui rêve.</p><small>Elle t’attend dans le Bestiaire, onglet Histoire.</small></div>` },
    { cls: 'tease', sfx: () => app.sfx.sheet?.(), extra: `<div class="endx-arc"><span class="endx-k">Arc I</span><h2>La Première Veille</h2><p>Celui qui rêve est réveillé. Le Bestiaire n’est pas encore fini.</p><b class="endx-soon">Bientôt</b><button class="btn gold" data-endx="close">Fermer</button></div>` },
  ];
  return playScenes(app, scenes, { dir: 'fin', skipTo: scenes.length - 2 });
}

/* v775 : le prologue, au tout premier lancement (avant le guide de bienvenue) ; revisible dans Bestiaire → Histoire */
export function playPrologue(app) {
  const scenes = [
    { img: 'p1', text: 'Les sept royaumes ont forgé le Bestiaire interdit pour enfermer ce qui ne devait plus marcher sous le ciel.', sfx: () => app.sfx.rumble?.() },
    { img: 'p2b', text: 'Sept gardiens, un par royaume, l’ont scellé de leur main. Ce furent les premiers Scelleurs.', sfx: () => app.sfx.page?.() },
    { img: 'p3', text: 'Une nuit, quelqu’un l’a déchiré.', sfx: () => app.sfx.rip?.() },
    { img: 'p4', text: 'Ses pages se sont envolées, et ses vingt chapitres sont tombés dans l’Abysse. Quelque chose les attendait.', sfx: () => app.sfx.rumble?.() },
    { img: 'p5', cls: 'last', text: 'Tu es le dernier à savoir lire les sceaux. Descends, et referme-les.', sfx: () => app.sfx.page?.(), after: '<button class="btn gold endx-go" data-endx="close">Commencer</button>' },
  ];
  return playScenes(app, scenes, { dir: 'prologue' });
}

function playScenes(app, scenes, { dir, skipTo = -1 }) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'endx';
    let i = -1, busy = false;
    const show = () => {
      const s = scenes[i];
      el.innerHTML = `<div class="endx-s ${s.cls || ''}">${s.img ? `<img class="endx-bg" alt="" src="assets/${dir}/${s.img}.webp">` : ''}${s.extra || ''}${s.text ? `<p class="endx-t">${esc(s.text)}</p>` : ''}${s.after || ''}${i < scenes.length - 1 ? `<span class="endx-tap">Touche pour continuer</span>` : ''}</div><button class="endx-skip" data-endx="skip">Passer</button>`;
      try { s.sfx?.(); } catch { /* son facultatif */ }
      const nx = scenes[i + 1]; if (nx?.img) new Image().src = `assets/${dir}/${nx.img}.webp`;
      const eye = el.querySelector('.endx-eyeanim'); /* v774 : image tenue, puis la paupière descend */
      if (eye) { let f = 0; const step = () => { if (!eye.isConnected || f >= EYE_FRAMES - 1) return; f++; eye.style.backgroundPositionX = `${(f / (EYE_FRAMES - 1)) * 100}%`; setTimeout(step, f === EYE_FRAMES - 2 ? 520 : 300); }; setTimeout(step, 1500); }
    };
    const next = () => { if (busy) return; if (i >= scenes.length - 1) return close(); busy = true; i++; show(); setTimeout(() => { busy = false; }, 900); };
    const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 400); };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-endx]');
      if (b?.dataset.endx === 'close') return close();
      if (b?.dataset.endx === 'skip') { if (skipTo >= 0 && i < skipTo) { i = skipTo - 1; busy = false; } else return close(); }
      next();
    });
    document.body.appendChild(el);
    next();
  });
}
