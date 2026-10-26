// v794 : nom du fichier d'une réplique : <personnage>-<empreinte du texte français> (le même calcul dans le jeu et les outils)
/** empreinte courte et stable d'un texte (FNV-1a 32 bits sur les unités UTF-16) */
export function vhash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
export const vkey = (speaker, fr) => `${speaker}-${vhash(fr)}`;
