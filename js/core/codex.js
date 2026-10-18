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
  title: 'Saison I · Les Cendres du Dévoreur',
  ends: '2026-12-31',                    // affiché seulement (aucune fermeture automatique dans l'ébauche)
  tiers: 30,                             // nombre de paliers
  xpPerTier: 100,                        // points de Codex par palier
  price: '4,99 €',
  store: 'com.abyssalgame.abyssal.codex1',
};

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
};
// Dos de cartes : images à faire par Gemini (assets/backs/<clé>.webp) ; dans l'ébauche, ils se gagnent mais ne s'affichent pas encore
export const CODEX_BACKS = { 'dos-codex': 'Dos du Codex', 'dos-abime': 'Dos de l’Abîme', 'dos-fondateur': 'Dos du Fondateur' };

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

// ——— L'Échoppe : ce qui se vendra en argent réel (prix affichés seulement) ———
export const SHOP = [
  { id: 'codex', name: CODEX.premiumName, price: CODEX.price, store: CODEX.store, kind: 'codex',
    desc: `Débloque la voie enluminée de la saison : ${Object.keys(PREM).length} récompenses cosmétiques (cadres, titres, dos de cartes).` },
  { id: 'fondateur', name: 'Pack du Fondateur', price: '9,99 €', store: 'com.abyssalgame.abyssal.fondateur', once: true,
    give: { frame: 'cx-fondateur', title: 'Fondateur', back: 'dos-fondateur' },
    desc: 'Vendu une seule fois. Le cadre et le dos de cartes du Fondateur, et le titre « Fondateur » (badge au classement).' },
  { id: 'cadre-givre', name: 'Cadre de givre', price: '1,99 €', store: 'com.abyssalgame.abyssal.cadre.givre', give: { frame: 'cx-givre' }, desc: 'Un cadre de profil gelé, aux reflets bleutés.' },
  { id: 'cadre-braise', name: 'Cadre des braises éternelles', price: '1,99 €', store: 'com.abyssalgame.abyssal.cadre.braise', give: { frame: 'cx-braise' }, desc: 'Un cadre de profil qui couve comme une forge.' },
  { id: 'dos-abime', name: 'Dos de l’Abîme', price: '2,99 €', store: 'com.abyssalgame.abyssal.dos.abime', give: { back: 'dos-abime' }, desc: 'Un dos de cartes pour toute ta collection (image à venir).' },
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
