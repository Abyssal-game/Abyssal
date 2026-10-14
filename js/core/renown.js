// Renommée des créatures (victoires vécues ensemble) et saisons mensuelles de la Descente.
export const FAME_TIERS = [
  { key: 'veteran', n: 10, name: 'Vétéran' },
  { key: 'heros', n: 40, name: 'Héros' },
  { key: 'legende', n: 100, name: 'Légende' },
];
// palier atteint (0 = aucun, 1 Vétéran, 2 Héros, 3 Légende)
export const fameTier = (pts = 0) => FAME_TIERS.filter((t) => pts >= t.n).length;
export const fameNext = (pts = 0) => FAME_TIERS.find((t) => pts < t.n) || null;

// Saison : un mois du calendrier. Paliers de profondeur atteints pendant le mois, récompensés une fois.
export const SEASON_STEPS = [
  { floor: 5, reward: { shards: 80 } },
  { floor: 10, reward: { chests: { fer: 1 } } },
  { floor: 20, reward: { chests: { or: 1 } } },
  { floor: 30, reward: { shards: 250 } },
  { floor: 40, reward: { chests: { abyssal: 1 } } },
];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function seasonId(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
export function seasonName(id) { const [y, m] = id.split('-'), n = MONTHS[+m - 1]; return `Saison ${/^[aeiou]/.test(n) ? 'd’' : 'de '}${n} ${y}`; }
// jours restants avant la fin du mois (le jour même compris)
export function seasonDaysLeft(date = new Date()) { return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() - date.getDate() + 1; }
