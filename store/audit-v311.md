# ABYSSAL — Audit intégral du 15 octobre 2026 (v307 → v311)

Quatre audits ont été menés en parallèle, chacun avec des tests réellement exécutés : écrans, moteur de jeu, audio, tutoriels. Toutes les corrections ont été vérifiées par la suite de tests (200 tests), l'essai d'endurance (`tools/fuzz.mjs 300`) et des parcours dans un navigateur Chromium aux tailles iPhone SE (375 × 667) et iPhone 13 (390 × 844).

**Limites :** aucun test sur un vrai iPhone ni avec Safari (seul Chromium est disponible), pas d'écoute des sons (mesures uniquement), et pas de test des fonctions en ligne (serveur Supabase inaccessible depuis l'environnement de test).

## 1. Inventaire exploré

- **Onglets :** Accueil, Collection (Cartes, Équipe, Renforcer, Fournaise), Boosters (Boosters, Coffres, Tirage), Aventure (Descente, Sceaux), Sanctuaire (Profil, Bestiaire, Factions, Succès, Réglages, Compte).
- **Onglets internes :**
  - Collection : Grille et Classeur, avec les filtres.
  - Bestiaire : Créatures, Récits, Chasse, Royaumes.
  - Réglages : Jeu, Tutoriels, Sauvegarde, À propos.
  - Succès et Ensembles.
  - Profil.
- **Fenêtres :**
  - Fiche de carte (Combat, Défis, Histoire, Rareté).
  - Probabilités, ouverture de booster et de coffre.
  - Brûler, Tout brûler, confirmations, avatar, renommer.
  - Aide du combat, pause, pouvoir d'équipe, réserve.
- **Parties en cours :** écran des portes, combat, duel des Sceaux.
- **Parcours :** nouveau joueur complet, états vides, ressources insuffisantes, retours arrière, fermeture des fenêtres.
- **Ressources :** 500 illustrations, 67 bruitages, 6 musiques, 404 fichiers gardés hors ligne (12,5 Mo).

## 2. Bugs corrigés

### Critique (P0)
- **Sauvegarde :** une sauvegarde illisible (abîmée, ou écrite par une version plus récente du jeu) était remplacée par une partie vide, puis la copie de secours était écrasée à son tour.
  - Correction : elle est désormais mise de côté et restaurée automatiquement dès qu'une version du jeu sait la relire, avec un message au joueur (v310).
- **Audio :** au démarrage, l'Accueil jouait souvent une ambiance synthétisée pleine de cloches aiguës au lieu de la vraie musique (v309).
- **Audio :** le son du tour de chaque créature était un bip (raies pures vers 2 kHz) (v309).

### Important (P1)
- **Ennemi tué au début du combat :** tué par un passif d'ouverture (Éruption, Cataclysme), il revenait à 1 PV et comptait deux fois (v310).
- **Rune de la Rouille :** elle ne cédait pas quand Contagion portait le poison à 6 (v310).
- **Représailles :** son bonus de dégâts encaissés n'était jamais appliqué (v310).
- **Carte inconnue :** une carte d'une version plus récente du jeu bloquait les boosters, l'offrande et les niveaux (v310).
- **Aides fausses ou périmées (14 textes), corrigées en v308 :**
  - intentions des ennemis ;
  - Ferveur gardée (3 au plus) ;
  - Source sacrée (30 % et 60 %, et non 40 % et 80 %) ;
  - estimation du trésor, environ 6 fois trop forte ;
  - coffre de gardien, donné seulement à la première victoire ;
  - phase 2 des gardiens ;
  - compétence propre (case violette) ;
  - finitions obtenues aussi par Sublimer ;
  - invocation retirée du jeu ;
  - trophée « Héroïque », devenu « Hyper rare ».
- **Bulles d'aide :** elles restaient affichées et s'empilaient quand on changeait d'écran (v311).
- **Coffre :** il restait ouvert par-dessus les autres écrans et ne se fermait pas avec Échap (v311).
- **Équipe :** « Vider » effaçait l'équipe sans confirmation (v311).
- **Grammaire :** « C'est au tour de Le Rêveur », « créatures de Le Royaume… » (v311).
- **Classeur :** l'en-tête se chevauchait (v311).

### Finition (P2)
- **Combat (v310) :**
  - mort traitée deux fois (Épines puis Explosion) ;
  - victoire et défaite simultanées affichées comme une victoire ;
  - éclaboussures de la Vague sur les mauvaises voisines ;
  - Phénix de Cendre qui soignait au lieu de coûter ;
  - Insaisissable qui le restait après un Coup d'estoc ;
  - ta propre carte proposée comme trophée aux Sceaux ;
  - créature remise en jeu qui faisait perdre son tour à l'actrice ou rejouer une autre créature ;
  - tour bloqué après un pouvoir d'équipe.
- **Bulles d'aide (v308) :** 14 bulles trop longues raccourcies. Les bulles défilent au lieu d'être coupées sur petit écran, et un « : » ou un « ! » ne se retrouve plus seul en début de ligne.
- **Écrans (v311) :**
  - zones tactiles agrandies (boutons d'équipe, puces, filtres, interrupteurs, bouton retour) ;
  - compteurs d'ensembles sur une ligne ;
  - libellés « Effacer » et « Reprendre la partie » ;
  - « Tout révéler » masqué au résumé ;
  - anciennes adresses redirigées.
- **Audio (v309) :**
  - révélation d'une Commune quasi inaudible (+17 dB) ;
  - coffre, ouverture et victoire de gardien rehaussés ;
  - boucles des musiques qui sautaient 100 ms ;
  - musique du gardien la plus basse ;
  - anti-rebond des sons ;
  - mémoire limitée à 2 musiques décodées (au lieu d'environ 270 Mo possibles) ;
  - noms d'écrans « Accueil » et « Boosters » dans les réglages.

## 3. Vérifié sans problème

- Aucune erreur JavaScript, aucune image cassée, aucun débordement horizontal sur tous les écrans, dans les deux tailles.
- Taux des boosters conformes aux taux affichés (200 000 boosters simulés), garanties respectées.
- Fournaise et Sublimer toujours à perte : pas d'exploitation possible.
- Reprise exacte d'un combat après rechargement (284 combats).
- Export et import de sauvegarde, taille de sauvegarde stable (environ 26 Ko).
- Combats toujours terminés, PV, PA et Ferveur toujours dans leurs bornes (23 000 combats simulés).

## 4 bis. Suite donnée le 15 octobre 2026 (v319)

- Rôles : une seule série de noms (Protecteur, Attaquant, Soigneur, Empoisonneur, Entraveur, Soutien, Fléau) partout. Homonymes levés par des renommages de textes (liste dans CLAUDE.md, section 3).
- Hurlement : la provocation couvre maintenant le tour ennemi suivant quand elle est lancée après eux. Rune du Sang : cède à tout dégât qui exploite la faiblesse de faction. Rémanence : appliquée à toutes les Marques posées par la créature. Dévoreur : la digestion passe par la mort normale (Renaissance, Ténacité, etc.). Six tests ajoutés (`tests/combat5.test.mjs`), endurance sans dérive (étage moyen 14,2).
- Bouton retour : les feuilles ajoutent une entrée d'historique (le retour les ferme sans quitter la page) ; le bouton retour du haut n'ajoute plus d'entrée.
- Noms coupés : barre du haut (16 lettres tiennent, deux lignes sur une sous-page), en-tête du profil, cartes en combat (3 lignes), bandeau d'action (2 lignes).
- Audio : silences initiaux coupés sur 9 sons, fondu de sortie sur `suspense`, `summon` joué quand une créature se relève.

## 4. Problèmes restants (non corrigés, à décider)

- **Pages chargées :** Bestiaire → Récits (longue liste de récits scellés) et Profil → Titres.
- **Familles d'ennemis :** celles du Bestiaire diffèrent des comportements réels en combat.
- **Textes et code jamais affichés :** pactes, reliques, anciens textes de capacités.

## 5. Nouveau logo

Dossier complet dans `store/logo-brief.md` : diagnostic, concept retenu (le Sceau fendu), prompts Gemini, variantes, révisions et dimensions. Le logo sera intégré une fois l'image générée par Gemini.
