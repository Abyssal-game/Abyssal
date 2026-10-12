// ABYSSAL : Guerre des Factions (règles pures). Un événement hebdomadaire, joué en solo :
// chaque semaine, tu prêtes serment à un royaume et tu le défends contre l'Abîme.
// Il n'y a pas d'autres joueurs ni de classement inventé : seulement tes points et des paliers fixes.
// Points : victoires dans la Descente, les Duels des Sceaux et la Chasse aux Reliques.
// Variété : au-delà d'un certain nombre de victoires du même genre dans la journée, elles rapportent moitié moins.
// Serment : +50 % dans la Descente et la Chasse si au moins 2 des 3 créatures au combat sont du royaume choisi.
export const WAR = {
  sources: {
    fight:  { name: 'Combat de la Descente', pts: 10, fresh: 8 },
    elite:  { name: 'Élite de la Descente', pts: 20, fresh: 4 },
    boss:   { name: 'Gardien de la Descente', pts: 40, fresh: 2 },
    sceaux: { name: 'Victoire aux Duels des Sceaux', pts: 15, fresh: 5 },
    relic:  { name: 'Salle gagnée à la Chasse aux Reliques', pts: 10, fresh: 8 },
    relicBoss: { name: 'Gardien du Reliquaire', pts: 40, fresh: 2 },
  },
  oathMult: 1.5,
  tiers: [
    { at: 100, shards: 40, name: 'Avant-poste tenu' },
    { at: 250, shards: 80, name: 'Rempart consolidé' },
    { at: 500, shards: 120, name: 'Front repoussé' },
    { at: 800, shards: 160, name: 'L’Abîme recule', frame: 'guerre', title: 'Héraut de la Guerre' },
  ],
};
// Points d'une victoire : moitié moins une fois la part « fraîche » du jour épuisée
export function warPoints(kind, usedToday, oath) {
  const s = WAR.sources[kind];
  if (!s) return 0;
  const base = usedToday < s.fresh ? s.pts : Math.ceil(s.pts / 2);
  return Math.round(base * (oath ? WAR.oathMult : 1));
}
export const tiersReached = (points) => WAR.tiers.map((t, i) => (points >= t.at ? i : -1)).filter((i) => i >= 0);
// Jours restants avant lundi (fin de la semaine de guerre), en comptant aujourd'hui
export function daysLeft(date) { const d = date.getDay(); return d === 0 ? 1 : 8 - d; }
