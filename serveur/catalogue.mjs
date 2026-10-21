// v539 : le catalogue du jeu côté serveur (mêmes fichiers que le jeu, lus comme modules JSON : Node et Deno).
import { createCatalog } from '../js/core/catalog.js';
import infernal from '../data/cards/infernal.json' with { type: 'json' };
import abyssal from '../data/cards/abyssal.json' with { type: 'json' };
import celeste from '../data/cards/celeste.json' with { type: 'json' };
import sauvage from '../data/cards/sauvage.json' with { type: 'json' };
import necrotique from '../data/cards/necrotique.json' with { type: 'json' };
import primordial from '../data/cards/primordial.json' with { type: 'json' };
import artificiel from '../data/cards/artificiel.json' with { type: 'json' };
import factions from '../data/factions.json' with { type: 'json' };
import sets from '../data/sets.json' with { type: 'json' };
import abilities from '../data/abilities.json' with { type: 'json' };
import achievements from '../data/achievements.json' with { type: 'json' };
import lore from '../data/lore.json' with { type: 'json' };
import { FACTION_ORDER } from '../js/config.js';

const LISTS = { infernal, abyssal, celeste, sauvage, necrotique, primordial, artificiel };
let cat = null;
// même ordre que loadCatalogData (js/core/catalog.js)
export function catalogue() {
  if (!cat) cat = createCatalog({ cards: FACTION_ORDER.flatMap((f) => LISTS[f]), factions, sets, abilities, achievements, lore });
  return cat;
}
