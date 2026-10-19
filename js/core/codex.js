// v470 : ÉBAUCHE du pass de saison (« Le Codex de l'Abîme ») et de la boutique en argent réel (« L'Échoppe »).
// Caché : visible seulement en Mode Créateur, option « Codex et Échoppe » (`s.devCodex`). Rien ne se paie encore :
// les achats sont simulés (aperçu), le vrai paiement passera plus tard par l'App Store (identifiants `store`).
// Règle du propriétaire (17 octobre 2026) : en argent réel, seulement du cosmétique (cadres, dos de cartes, titres,
// pack fondateur, pass de saison) ; jamais d'éclats, de cendres, de coffres ni de boosters. La voie gratuite du Codex,
// elle, se gagne en jouant et peut donner éclats, cendres, coffres et tickets.

// ——— Réglages de la saison (à modifier ici) ———
export const CODEX = {
  name: 'Le Codex de l’Abîme',
  premiumName: 'Codex enluminé',
  season: 'saison-1',                    // changer cette clé = nouvelle saison (points et récompenses remis à zéro)
  title: 'Saison I · L’Hiver éternel',   // v477 : première saison prévue en décembre 2026 (après la sortie sur l'App Store)
  starts: '2026-12-01',
  ends: '2027-01-31',                    // affiché seulement (aucune ouverture ni fermeture automatique dans l'ébauche)
  tiers: 30,                             // nombre de paliers
  xpPerTier: 100,                        // points de Codex par palier
  cost: 500,                             // v474 : prix en obsidiennes (≈ 4,99 €)
  store: 'com.abyssalgame.abyssal.codex1',
};

// ——— v474 : la monnaie payante, les Obsidiennes (achetées en euros, dépensées seulement en cosmétiques) ———
// Règle : les joueurs gratuits gardent les cosmétiques simples (cadres dessinés en CSS, titres, dos de l'Abysse) gagnés
// en jouant ; les cosmétiques peints (cadres et dos Gemini) viennent du Codex enluminé ou de l'Échoppe, en obsidiennes.
export const OBS = { name: 'Obsidiennes', one: 'obsidienne' };
export const OBS_PACKS = [
  { id: 'obs-100', n: 100, bonus: 0, price: '0,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.100' },
  { id: 'obs-500', n: 500, bonus: 50, price: '4,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.500' },
  { id: 'obs-1000', n: 1000, bonus: 150, price: '9,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.1000' },
  { id: 'obs-2000', n: 2000, bonus: 400, price: '19,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.2000' },
];

// Points de Codex gagnés en jouant
export const CODEX_XP = {
  floor: 20,      // première victoire à un étage de la Descente
  boss: 60,       // première victoire contre un gardien (fin de chapitre)
  win: 5,         // toute autre victoire dans la Descente
  trial: 30,      // Épreuve du jour gagnée
  game: 15,       // partie gagnée dans la Salle des jeux
  mission: 15,    // mission du jour encaissée
};
export const CODEX_XP_LABEL = { floor: 'Étage franchi (1re fois)', boss: 'Gardien vaincu (1re fois)', win: 'Autre victoire dans la Descente', trial: 'Épreuve du jour gagnée', game: 'Partie gagnée dans la Salle des jeux', mission: 'Mission du jour' };

// Cosmétiques propres au Codex et à l'Échoppe (v472 : cadres peints par Gemini, assets/frames/<clé>.webp, posés par .pf-<clé>)
export const CODEX_FRAMES = {
  'cx-encre': 'Cadre d’encre', 'cx-sang': 'Cadre de sang séché', 'cx-or': 'Cadre enluminé', 'cx-abime': 'Cadre de l’Abîme',
  'cx-fondateur': 'Cadre du Fondateur', 'cx-givre': 'Cadre de givre', 'cx-braise': 'Cadre des braises éternelles',
  /* v472 : réserve (saison II ou Échoppe), images prêtes dans assets/frames/ */
  'cx-os': 'Couronne d’ossements', 'cx-serpents': 'Cadre des serpents d’obsidienne', 'cx-vitrail': 'Cadre du vitrail céleste', 'cx-rouages': 'Cadre des rouages',
  'cx-racines': 'Cadre des racines anciennes', 'cx-yeux': 'Cadre aux mille yeux', 'cx-chaines': 'Cadre des chaînes forgées', 'cx-ruche': 'Cadre de la ruche d’ambre',
  /* v479 : catalogue de l'Échoppe (store/boutique-cosmetiques.md) : Nuit des Âmes, Hiver éternel, Cœurs maudits, les sept trônes, trophées des gardiens */
  'cx-lanternes': 'Cadre des lanternes d’âmes', 'cx-voile': 'Cadre du voile des trépassés', 'cx-houx': 'Couronne du solstice noir', 'cx-aurore': 'Cadre de l’aurore boréale',
  'cx-roses': 'Cadre des roses noires', 'cx-prince': 'Couronne du Prince des Enfers', 'cx-leviathan': 'Cadre du Léviathan', 'cx-seraphin': 'Cadre du Séraphin',
  'cx-meute': 'Cadre de la meute', 'cx-liche': 'Cadre de la Liche', 'cx-ouroboros': 'Cadre de l’Ouroboros', 'cx-automate': 'Cadre de l’Automate',
  'cx-gueule': 'Cadre de la Gueule du Dévoreur', 'cx-eclipse': 'Cadre de l’Éclipse', 'cx-horloger': 'Cadre de l’Horloger', 'cx-balance': 'Cadre du Juge des Sceaux',
  /* v480 */ 'cx-constellation': 'Cadre des constellations', 'cx-geode': 'Cadre de la géode d’améthyste', 'cx-sablier': 'Cadre du sablier éternel', 'cx-pages': 'Cadre du grimoire déchiré', 'cx-corbeau': 'Cadre des corbeaux', 'cx-souverain': 'Couronne du Souverain de l’Abysse',
};
// Dos de cartes (v473 : images Gemini, assets/backs/<clé>.webp, tools/back-art.py ; choisis au Profil)
export const CODEX_BACKS = { 'dos-codex': 'Dos du Codex', 'dos-abime': 'Dos de l’Abîme', 'dos-fondateur': 'Dos du Fondateur',
  /* réserve : collection « Les sept royaumes » (Échoppe ou saison II) */
  'dos-infernal': 'Dos du royaume Infernal', 'dos-abyssal': 'Dos du royaume Abyssal', 'dos-celeste': 'Dos du royaume Céleste', 'dos-sauvage': 'Dos du royaume Sauvage',
  'dos-necrotique': 'Dos du royaume Nécrotique', 'dos-primordial': 'Dos du royaume Primordial', 'dos-artificiel': 'Dos du royaume Artificiel',
  /* v480 : catalogue de l'Échoppe */ 'dos-ames': 'Dos de la Nuit des Âmes', 'dos-solstice': 'Dos du solstice noir', 'dos-roses': 'Dos des cœurs maudits', 'dos-lune-sang': 'Dos de la Lune de sang', 'dos-devoreur': 'Dos du Dévoreur', 'dos-eclipse': 'Dos de l’Éclipse', 'dos-horloger': 'Dos de l’Horloger', 'dos-miroirs': 'Dos de la Sorcière des Miroirs', 'dos-jumeaux': 'Dos des Jumeaux du Crépuscule', 'dos-titan': 'Dos du Titan Endormi',
  /* v481 */ 'dos-abysse': 'Dos de L’Abysse', 'dos-tarot': 'Dos du tarot interdit', 'dos-mosaique': 'Dos de la mosaïque d’or', 'dos-encre': 'Dos de l’encre et du dragon', 'dos-alchimie': 'Dos de l’alchimiste', 'dos-carte-abysse': 'Dos de la carte de l’Abysse', 'dos-reliquaire': 'Dos du reliquaire', 'dos-tapisserie': 'Dos de la chasse maudite', 'dos-art-deco': 'Dos d’or noir', 'dos-vivant': 'Dos de chair vivante', 'dos-nebuleuse': 'Dos de la nébuleuse', 'dos-vitrail': 'Dos du vitrail de cathédrale' };

// v482 : finitions de prestige (« habillages ») : un cadre peint posé sur une carte qu'on possède, sans rien changer à
// ses valeurs. Achetée une fois, une finition s'applique à autant de cartes qu'on veut (une par carte), au choix dans sa fiche.
export const FINISHES = {
  'fin-ecarlate': { name: 'Écarlate', desc: 'Laque rouge sang et filets d’or.' },
  'fin-givree': { name: 'Givrée', desc: 'Glace bleutée sur une âme d’argent.' },
  'fin-spectrale': { name: 'Spectrale', desc: 'Brume spectrale et visages d’esprits.' },
  'fin-vitrail': { name: 'Vitrail', desc: 'Verre de cathédrale serti de plomb.' },
};
// Catalogue de l'Échoppe, en obsidiennes (le Codex enluminé donne aussi givre, braises et dos de l'Abîme)
const F = (k, cost) => ({ id: k, kind: 'frame', give: { frame: k }, cost });
const B = (k, cost) => ({ id: k, kind: 'back', give: { back: k }, cost });
const FN = (k, cost) => ({ id: k, kind: 'finish', give: { finish: k }, cost });
export const ROYAUMES = ['dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel'];
export const CATALOG = [
  F('cx-givre', 250), F('cx-braise', 250), F('cx-os', 300), F('cx-serpents', 300), F('cx-vitrail', 300), F('cx-rouages', 300),
  F('cx-racines', 300), F('cx-chaines', 300), F('cx-yeux', 350), F('cx-ruche', 350),
  F('cx-lanternes', 450), F('cx-voile', 700), F('cx-houx', 450), F('cx-aurore', 700), F('cx-roses', 450), F('cx-prince', 700), F('cx-leviathan', 700), F('cx-seraphin', 700), F('cx-meute', 700), F('cx-liche', 700), F('cx-ouroboros', 700), F('cx-automate', 700), F('cx-gueule', 500), F('cx-eclipse', 500), F('cx-horloger', 500), F('cx-balance', 500),
  F('cx-constellation', 750), F('cx-geode', 450), F('cx-sablier', 450), F('cx-pages', 450), F('cx-corbeau', 450), F('cx-souverain', 1200),
  B('dos-abime', 350), B('dos-ames', 500), B('dos-solstice', 500), B('dos-roses', 500), B('dos-lune-sang', 500), B('dos-devoreur', 500), B('dos-eclipse', 500), B('dos-horloger', 500), B('dos-miroirs', 500), B('dos-jumeaux', 500), B('dos-titan', 500),
  B('dos-abysse', 750), B('dos-tarot', 500), B('dos-mosaique', 500), B('dos-encre', 500), B('dos-alchimie', 500), B('dos-carte-abysse', 500), B('dos-reliquaire', 750), B('dos-tapisserie', 500), B('dos-art-deco', 750), B('dos-vivant', 750), B('dos-nebuleuse', 750), B('dos-vitrail', 500), ...ROYAUMES.map((k) => B(k, 300)),
  FN('fin-ecarlate', 800), FN('fin-givree', 800), FN('fin-spectrale', 1000), FN('fin-vitrail', 1000),
  { id: 'royaumes', kind: 'bundle', name: 'Les sept royaumes', give: { backs: ROYAUMES }, cost: 1500, desc: 'Les sept dos des royaumes d’un coup (2 100 à l’unité).' },
];
// Exclusifs du Codex enluminé (jamais en vente) : cadres d'encre, de sang, enluminé, de l'Abîme, dos du Codex, titres.
export const CODEX_ONLY = ['cx-encre', 'cx-sang', 'cx-or', 'cx-abime', 'dos-codex'];

// Paliers : voie gratuite (en jouant) et voie enluminée (achetée, cosmétique seulement). null = rien à ce palier.
const FREE = (t) => (t === CODEX.tiers ? { chests: { abyssal: 1 }, title: 'Lecteur assidu' }
  : t % 10 === 0 ? { tickets: { standard: 2 } }
  : t % 5 === 0 ? { chests: { [t < 15 ? 'fer' : 'or']: 1 } }
  : t % 2 === 0 ? { ash: 20 + 5 * t }
  : { shards: 40 + 10 * t });
const PREM = {
  1: { title: 'Scribe de l’Abîme' }, 3: { frame: 'cx-encre' }, 6: { back: 'dos-codex' }, 9: { frame: 'cx-sang' },
  12: { title: 'Enlumineur' }, 15: { frame: 'cx-or' }, 18: { back: 'dos-abime' }, 21: { frame: 'cx-givre' },
  24: { title: 'Gardien des pages' }, 27: { frame: 'cx-braise' }, 30: { frame: 'cx-abime', title: 'Maître du Codex' },
};
export const CODEX_TIERS = Array.from({ length: CODEX.tiers }, (_, i) => ({ tier: i + 1, free: FREE(i + 1), prem: PREM[i + 1] || null }));

// ——— L'Échoppe en euros : les obsidiennes et le Pack du Fondateur (prix affichés seulement) ———
export const SHOP = [
  ...OBS_PACKS.map((p) => ({ id: p.id, kind: 'obs', name: `${p.n + p.bonus} obsidiennes`, price: p.price, store: p.store, give: { obs: p.n + p.bonus }, bonus: p.bonus })),
  { id: 'fondateur', name: 'Pack du Fondateur', price: '9,99 €', store: 'com.abyssalgame.abyssal.fondateur', once: true,
    give: { frame: 'cx-fondateur', title: 'Fondateur', back: 'dos-fondateur', obs: 500 },
    desc: 'Vendu une seule fois. Le cadre et le dos de cartes du Fondateur, le titre « Fondateur » (badge au classement) et 500 obsidiennes.' },
];

// ——— État ———
export const freshCodex = () => ({ season: CODEX.season, xp: 0, premium: false, free: [], prem: [], log: {} });
export function codexState(s) {
  if (!s.codex || s.codex.season !== CODEX.season) s.codex = freshCodex();
  return s.codex;
}
export const codexTier = (c) => Math.min(CODEX.tiers, Math.floor(c.xp / CODEX.xpPerTier));
export const tierProgress = (c) => (codexTier(c) >= CODEX.tiers ? 1 : (c.xp % CODEX.xpPerTier) / CODEX.xpPerTier);
export const claimable = (c) => CODEX_TIERS.filter((t) => t.tier <= codexTier(c) && ((t.free && !c.free.includes(t.tier)) || (c.premium && t.prem && !c.prem.includes(t.tier)))).length;
