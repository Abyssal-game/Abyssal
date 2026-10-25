// v771 : la fin de la Descente, après la première victoire contre l'Abysse (et rejouable : Bestiaire → Histoire, Mode Créateur).
// L'œil se referme, la première page du Bestiaire glisse jusqu'au joueur, les sept noms (le septième gratté) puis le sien,
// celui qui rêve ouvre les yeux, la page scellée de l'Abysse (trophée : elle ne combat jamais), puis l'annonce de l'Arc I.
import { esc } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';

const NAMES = ['La Scelleuse de Braise', 'Le Scelleur des Fosses', 'La Scelleuse des Cieux', 'Le Scelleur des Bois', 'La Scelleuse des Tombes', 'Le Scelleur des Montagnes'];

/* la page scellée de l'Abysse : affichée comme une carte, mais jamais dans la collection ni en combat */
export function abyssPageHTML() {
  return `<div class="endx-card"><img alt="" src="assets/fin/carte-abysse.webp"><span class="endx-cn"><b>L’Abysse</b><small>Le plus grand rêve</small></span><span class="endx-tag">Page scellée · Trophée</span></div>`;
}

export function playEnding(app, { name } = {}) {
  return new Promise((done) => {
    const who = name || sync.profile?.pseudo || app.game?.s?.name || 'Toi';
    const el = document.createElement('div');
    el.className = 'endx';
    const scenes = [
      { img: 'oeil', cls: 'eye', text: 'L’œil se referme.', sfx: () => app.sfx.rumble?.() },
      { img: 'page', cls: 'page', text: 'Dans le silence, une page glisse jusqu’à toi : la toute première du Bestiaire interdit, celle que personne n’avait jamais vue.', sfx: () => app.sfx.page?.() },
      { img: 'velin', cls: 'velin', text: 'Sept noms y sont signés, ceux des premiers Scelleurs ; le septième a été gratté jusqu’au vélin. Dessous, une ligne d’encre fraîche s’écrit toute seule : c’est ton nom.', sfx: () => app.sfx.page?.(),
        extra: `<div class="endx-names">${NAMES.map((n, i) => `<span style="--d:${0.5 + i * 0.55}s">${esc(n)}</span>`).join('')}<span class="scr" style="--d:${0.5 + 6 * 0.55}s" translate="no">~~~~~~~~~~</span><span class="me" style="--d:${0.9 + 7 * 0.55}s" translate="no">${esc(who)}</span></div>` },
      { img: 'reveur', cls: 'dream', text: 'Les vingt chapitres sont refermés. Mais au bas de la page, quelque chose vient d’ouvrir les yeux.', sfx: () => app.sfx.rumble?.(), extra: '<i class="endx-eyes"></i>' },
      { cls: 'trophy', sfx: () => app.sfx.reveal?.('S'), extra: `<div class="endx-tro"><span class="endx-k">Le dernier rêve</span>${abyssPageHTML()}<p>Tu n’as pas dompté l’Abysse : tu l’as refermé dans une page. Il ne combat pour personne. Il attend celui qui rêve.</p><small>Elle t’attend dans le Bestiaire, onglet Histoire.</small></div>` },
      { cls: 'tease', sfx: () => app.sfx.sheet?.(), extra: `<div class="endx-arc"><span class="endx-k">Arc I</span><h2>La Première Veille</h2><p>Celui qui rêve est réveillé. Le Bestiaire n’est pas encore fini.</p><b class="endx-soon">Bientôt</b><button class="btn gold" data-endx="close">Fermer</button></div>` },
    ];
    let i = -1, busy = false;
    const show = () => {
      const s = scenes[i];
      el.innerHTML = `<div class="endx-s ${s.cls}">${s.img ? `<img class="endx-bg" alt="" src="assets/fin/${s.img}.webp">` : ''}${s.extra || ''}${s.text ? `<p class="endx-t">${esc(s.text)}</p>` : ''}${i < scenes.length - 1 ? `<span class="endx-tap">Touche pour continuer</span>` : ''}</div><button class="endx-skip" data-endx="skip">Passer</button>`;
      try { s.sfx?.(); } catch { /* son facultatif */ }
    };
    const next = () => { if (busy) return; if (i >= scenes.length - 1) return close(); busy = true; i++; show(); setTimeout(() => { busy = false; }, 900); };
    const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 400); };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-endx]');
      if (b?.dataset.endx === 'close') return close();
      if (b?.dataset.endx === 'skip') { if (i < scenes.length - 2) { i = scenes.length - 3; busy = false; } else return close(); }
      next();
    });
    document.body.appendChild(el);
    next();
  });
}
