// Fond illustré d'un écran (Accueil, Descente) : posé derrière la page, retiré à chaque changement d'écran.
export const sceneUrl = (name) => new URL(`assets/scenes/${name}.webp`, document.baseURI).href;
export function setScene(name) {
  const b = document.body;
  if (!name) { b.classList.remove('scene'); return; }
  b.style.setProperty('--scene', `url(${sceneUrl(name)})`);
  b.classList.add('scene');
}
