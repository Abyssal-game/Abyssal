// Index du catalogue (cartes, factions, ensembles…) construit une fois au démarrage.
import { RARITY_ORDER, FACTION_ORDER, PORTRAITS } from '../config.js';

export function createCatalog({ cards, factions, sets, abilities, achievements, lore }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const byFaction = Object.fromEntries(FACTION_ORDER.map((f) => [f, cards.filter((c) => c.faction === f)]));
  const byRarity = Object.fromEntries(RARITY_ORDER.map((r) => [r, cards.filter((c) => c.rarity === r)]));
  const lines = {};
  cards.forEach((c) => {
    if (!c.evolution) return;
    (lines[c.evolution.line] ||= { key: c.evolution.line, name: c.evolution.name, cards: [] }).cards.push(c);
  });
  Object.values(lines).forEach((l) => l.cards.sort((a, b) => a.evolution.stage - b.evolution.stage));
  return {
    cards,
    byId,
    byFaction,
    byRarity,
    factions,
    faction: Object.fromEntries(factions.map((f) => [f.key, f])),
    sets,
    set: Object.fromEntries(sets.map((s) => [s.key, s])),
    abilities,
    achievements,
    lore,
    lines,
    get(id) { return byId.get(id) || PORTRAITS[id]; }, /* v890 : un portrait hors collection (avatar du Gardien) se lit comme une carte */
  };
}

export async function loadCatalogData(base = './') {
  const get = async (p) => {
    const r = await fetch(base + p);
    if (!r.ok) throw new Error(`Chargement impossible : ${p} (${r.status})`);
    return r.json();
  };
  const factions = await get('data/factions.json');
  const [cardLists, sets, abilities, achievements, lore] = await Promise.all([
    Promise.all(FACTION_ORDER.map((f) => get(`data/cards/${f}.json`))),
    get('data/sets.json'), get('data/abilities.json'), get('data/achievements.json'), get('data/lore.json')
  ]);
  return { cards: cardLists.flat(), factions, sets, abilities, achievements, lore };
}
