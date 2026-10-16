# ABYSSAL — Synthèse collective de l'étude simulée (100 joueurs, 30 jours)

Sources : `reference.md` (règles et chiffres lus dans le code v327), `parcours.md` (observation réelle en navigateur, iPhone 13 simulé), `mesures-familles.md` (bot jouant 30 jours), `retention.md`, les 7 bilans et les 100 fiches (A collectionneurs 20, B stratèges 20, C roguelite 15, D occasionnels 15, E très investis 10, F univers 10, G sceptiques 10).

Étiquettes : **[fait vérifié]** = code ou navigateur ; **[mesure moteur]** = simulation réelle des 30 jours ; **[hypothèse de simulation]** = ressenti, abandon ou préférence écrits par les agents joueurs. Les fréquences « n fiches sur 100 » viennent d'un relevé par mots-clés dans les sections C à J des fiches ; elles sont des ordres de grandeur, pas des comptages exacts. **Aucun chiffre de rétention ou de satisfaction ci-dessous n'est une prévision de marché.**

Repères d'ensemble [hypothèse de simulation] : 58 actifs, 19 occasionnels, 23 abandons au J30 ; aucun abandon avant J13, 15 des 23 entre J22 et J30. Grille moyenne (100 fiches, J3 → fin) : première impression 7,0 → 7,0 ; beauté des cartes 8,3 → 8,4 ; ambiance sonore 6,8 → 6,8 ; envie de revenir **7,4 → 5,1** ; satisfaction de la progression **7,1 → 4,6** ; variété **6,5 → 4,5** ; satisfaction globale 7,1 → 5,6. Le jeu séduit à l'arrivée et s'use à partir de la deuxième semaine : c'est la forme de toutes les familles.

---

## 1. Analyse par thème

### 1.1 Première impression
- **Points forts** (presque tous les profils) : l'ouverture du booster (déchirure, carte qui vibre, écran qui s'assombrit, bandeau Mythique/Secrète) est le moment le plus cité de l'étude, y compris chez les abandons (J093, J095, J100) [hypothèse appuyée sur une mise en scène vérifiée, `reference.md` §11]. Logo et fond noir cités par F (J090).
- **Problèmes** : écran de compte avant toute carte (10 fiches : J014, J026, J030, J045, J059, J062, J079, J090, J091, J095 ; G entière note 4-6) ; 33 touchers et dix fenêtres avant le premier combat [fait vérifié] ; « affronter les joueurs du monde entier » promet un PvP absent (cause d'abandon de J014) [fait vérifié] ; incohérences dès le premier booster (« INF-072 · 72/72 » sous « 1 / 72 », succès jumeaux, Gardien/Serment) [fait vérifié].
- **Profils** : D et G (6,2 et 5,5 contre 8,4 chez F). Notes ≤ 5 : J062 (3), J059, J092 (4), J045, J079, J091, J094, J097, J100 (5).
- **Désaccords** : J057, J070 (gacha) et J080 trouvent le compte normal ; J062 a fermé l'application.
- **Rétention** : coût invisible dans la simulation (aucun abandon au J1) ; c'est le facteur le plus sous-estimé (§4).
- **Modifications** : jouer avant le compte, au moins jusqu'au premier coffre ; retirer la promesse PvP ; relire les deux premiers écrans.

### 1.2 Prise en main
- **Points forts** : la main dorée suffit pour gagner le premier combat (J056, J058, J068) ; le combat « se comprend en jouant » (J079) ; les fiches de carte plaisent à ceux qui lisent (J023, J029, J052, J074).
- **Problèmes** (presque tous les profils) : trois bulles avancées tombent pendant le combat guidé de 2 tours [fait vérifié] ; les « saute tout » ratent la Brisure (J021, J086, J090 : 36-51 % de défaites) et surtout **Renforcer** (13 fiches : J011, J051, J060, J065, J091, J092, J093…), vers lequel rien n'oriente, avec « Pas assez de cendres ? » affiché à tort [fait vérifié, `parcours.md` §8]. La reprise d'une expédition le lendemain n'est expliquée nulle part : 18 fiches (J023, J034, J037, J044, J056, J058, J065, J068, J082, J084, J094…) ne l'ont pas su ou pas osé.
- **Désaccords** : garder et corriger les bulles (J059, J066, J073) contre une page de règles (J062, J063, J068, J079, J092, J100).
- **Rétention** : cause directe pour J051 (92 % de défaites), J093, J068 ; cause différée de nombreux plateaux.
- **Modifications** : une bulle par système, au moment utile ; passage guidé vers Renforcer après la première défaite ; « Tu pourras reprendre demain » sur l'écran de palier.

### 1.3 Interface et navigation
- **Points forts** : la frise d'initiative (J008, J021, J044, J060), le bloc « Aujourd'hui » (J059, J060), la vue Classeur (J006, J027, J061), « Tout brûler » (23 fiches), le résumé d'expédition honnête (J015, J037).
- **Problèmes** : 9 touchers par booster (15 fiches ; les gros ouvreurs passent en Ouverture rapide et le regrettent : J001, J008, J020) ; page Boosters à 3 éléments visibles sur 13, d'où des éclats dormants (J007 990, J063 4 208) [fait vérifié] ; boutons sous le pli, zones tactiles < 32 px (J089, J094, J097) [fait vérifié] ; Profil à 82 éléments, 17 écrans (13 fiches : J024, J027, J045, J052, J053, J077, J080, J090, J099) ; Sublimer dans l'onglet Rareté (21 fiches) ; réclamation manuelle de l'offrande (J009, J075, J077, J089, J094).
- **Désaccords** : garder la présentation plein écran du gardien (J062) contre la passer après la première victoire (J065, J067, J070).
- **Rétention** : rarement cause seule ; c'est le mécanisme par lequel Sublimer, boosters payants, Sceaux et reprise restent invisibles.
- **Modifications** : réclamation automatique ; Sublimer dans la Fournaise ; « Acheter un booster » dès 400 éclats ; talents et coffre au-dessus du pli.

### 1.4 Collection
- **Points forts** (A, D, F, E) : le compteur « N / 500 », le Classeur, les récits et royaumes à 25/50/100 %, le recrutement des gardiens (25 %) vécu comme « le vrai gacha » (J001, J046, J071, J080, J091).
- **Problèmes** : la part de nouvelles cartes tombe sous 10 par jour vers J10-J14 chez les gros ouvreurs et sous 5 après J21 [mesure moteur] (J001, J003, J017, J020, J080 ; 70-80 % de doublons) ; aucun moyen de viser une carte manquante ; noms masqués sous 50 % de la faction (10 fiches : J003, J006, J061, J081, J083, J088) [fait vérifié] ; doublons à 5-10 cendres jugés sans valeur (19 fiches). Cause d'abandon de J003 (J27) et de J083 (J29). Les familles atteignent 125 à 282 cartes au J30 ; maximum 384 [mesure moteur].
- **Désaccords** : J061 veut voir noms et silhouettes de tout ce qui manque ; J067 aime le mystère et le déchiffrage à 15 cendres. J003/J017/J020/J080 veulent un booster ou une conversion « cartes manquantes » ; J015/J019 refusent le ciblage (« tue la surprise »).
- **Rétention** : second moteur de décrochage après le record figé chez A, E, F.
- **Modifications** : afficher les noms dès 25 % ; conversion de doublons vers une carte manquante de même rareté (sans échange entre joueurs, décision du projet).

### 1.5 Raretés et boosters
- **Points forts** : barres de garantie HR/M visibles, « plus honnête que la plupart des gachas » (J001, J015, J019, J028, J096, J100) [fait vérifié].
- **Problèmes** : **les Secrètes et Mythiques viennent des gardiens, pas des paquets** : famille A, 4 Secrètes tirées en ≈ 1 600 boosters contre 31 possédées ; J080 7 Secrètes sur 10 sans en tirer une en 260 boosters ; J072 0 en 87 [mesure moteur]. Aucun écran ne le dit. Les finitions (4 / 1,2 / 0,4 % par carte, sans garantie) déçoivent les sept collectionneurs venus pour elles (J001, J002, J004, J007, J010, J014, J016 ; deux abandons J010, J016) [fait vérifié + hypothèse]. Taux par rareté non affichés (J019, J091, J100). Booster de faction à 500 pour les mêmes taux, aveugle aux doublons (J002, J003). Premium non vendu [fait vérifié].
- **Désaccords** : garantie de finition (J010, J016) contre « déjà une loterie de trop » (J002) ; J004/J018 acceptent la rareté mais veulent *voir* leurs finitions dans la grille.
- **Rétention** : forte pour A ; neutre ailleurs.
- **Modifications** : afficher les taux ; dire sur l'écran du gardien « 25 % de recruter sa carte » ; un reflet sur les miniatures et un filtre Finitions ; pas de hausse générale des taux.

### 1.6 Combats
- **Points forts** (B, C, E ; presque tous) : Brisure et coup de rupture, intentions des élites et gardiens, frise d'initiative, parade parfaite, Hâte, Assaut conjoint, Lois de l'Architecte (« la meilleure idée du jeu », J047 ; J055 : « le meilleur système de boss sur mobile »). Qualité des combats 7,0 → 6,1 ; B reste à 7,0.
- **Problèmes** : la « lecture des intentions » n'existe qu'un combat sur cinq (ennemis ordinaires muets) et la bulle correspondante ne se déclenche jamais (15 fiches : J003, J009, J022, J027, J032, J033, J038, J047, J092) [fait vérifié] ; la défense active (fenêtre 160-320 ms, départ aléatoire) punit fatigue et transports, et l'automatique ne pare jamais sans le dire (19 fiches : J023, J044, J060, J063, J069, J081, J089, J099) [fait vérifié] ; densité de l'écran (PA, Ferveur, « -4★ », runes, T2 : J006, J038, J060, J092) ; vocabulaire multiplié (Marque/Brèche/Fêlé/Brisé/Exposé/Proie : J092, J096) ; textes de compétences désynchronisés des vraies difficultés (Entrave 8, +3 gardien non écrit : J023, J028, J040, J047, J096) [fait vérifié].
- **Désaccords** : J025/J028/J096 adorent la parade au doigt ; J023/J029/J089 veulent du pur tour par tour.
- **Rétention** : le moteur retient (B est la famille la plus active : 13/20) ; les défaites incomprises font partir (J093, J099 à 82 %).
- **Modifications** : « Défense assistée » (barre ralentie, parade possible) proposée après 3 échecs ; une intention minimale sur les ordinaires ; descriptions générées depuis les vraies valeurs.

### 1.7 Équilibrage
- **Problème central** (presque tous les profils) : le **plancher de difficulté** calé sur le niveau moyen de l'équipe n'est écrit nulle part [fait vérifié, `reference.md` §7.2]. Une Mythique/Secrète niveau 1-4 à côté de Communes niveau 10 fait s'effondrer la run (J021, J026 pendant 14 jours, J032, J035, J040 à 73 %, J041, J046, J049) ; deux cartes montées et trois au niveau 1 font un mur à l'étage 6-13 (J009, J012, J015, J093). 10 fiches nomment le plancher, 14 réclament un « niveau conseillé ».
- **Composition unique** : « S10 S10 C10 C10 C10 » domine (8 équipes finales de B) car une Commune niveau 10 (×1,72 pour 1 point) bat une Rare niveau 1 (×1,3 pour 3) [fait vérifié] ; les équipes « originales » perdent (J035, J036, J039) ; trois Protecteurs = 24 tours et Épuisement (J036) [fait vérifié].
- **Cauchemar** (+35 % PV / +25 % ATQ, additionné au plancher) : mur à l'étage 1-7 pour J041, J073, J074, J079 (deux abandons) ; aucune bulle n'en parle [fait vérifié]. **Maudite** (rien si l'équipe tombe) : 0,6 de défaite en C contre 0,3 ailleurs [mesure moteur] (J048 41 pertes sur 57, J042 76 %).
- **Changement d'équipe puni** : aucun transfert de niveaux (S 3 600 cendres) ; J074 a payé six équipes.
- **Désaccords** : mode à niveau égal (J033, J092) contre niveaux 11-15 (J024, J025, J071, J080) ; J094 n'est resté que grâce aux niveaux.
- **Rétention** : première cause d'abandon par le combat (J012, J021, J045, J074, J079, J093).
- **Modifications** : « étage équivalent de ton équipe » au vestibule et au bilan de défaite ; avertissement à l'enrôlement d'une carte basse ; bulle Cauchemar ; plancher calculé sur les 3 au combat (J040).

### 1.8 Variété stratégique
- **Points forts** : 7 rôles, 32 passifs, règle du jour, gardiens à mécanique distincte.
- **Problèmes** : 12 talents et 12 bénédictions, « des +1 », épuisés en une semaine (J026, J034, J047, J049, J055, J096, J098) [fait vérifié] ; les trois joueurs à références roguelite/TCG (J092, J096, J098) concluent à une « profondeur affichée » contre une « ligne qui gagne » ; Sceaux où toutes les cartes totalisent 20, donc la collection n'y change rien (J092, J096) contre « équitable » (J018, J040, J097).
- **Profils** : B, C, G ; indifférent chez A, D, F.
- **Rétention** : abandon de J096 (J24) ; déclin de J047, J049.
- **Modifications** (prudentes) : quelques talents qui changent une règle plutôt que doubler le nombre ; afficher les synergies entre deux talents pris ; ne pas ajouter de système.

### 1.9 Progression
- **Constat dominant** [mesure moteur] : **le record est la durée de la séance, pas la force de l'équipe**. Un combat ≈ 1,2 min, ni automatique ni ×2 visible [fait vérifié] : 4 min = étage 3 (J068), 13 min = 13 étages (J034), 16 = 16 (J044), 43 = la soirée (J055). Record figé après la première semaine : B 12/20, C 11/15, D 13/15, G 8/10 avant J12. Satisfaction de la progression 7,1 → 4,6, le plus fort recul de la grille.
- **Très investis** : « fini » entre J7 et J10 (équipe au 10 : J075 J7, J071/J072 J8 ; record figé dès J2 pour J072, J073) ; saison consommée en 2-8 jours [fait vérifié] ; cycle des gardiens à 30 vécu comme la fin (15 fiches : J002, J024, J043, J047, J064, J067…).
- **Courts** : la boucle de 6-9 étages ne montre jamais la Matriarche ; le Dévoreur revient 17 à 28 fois (J058, J064, J066, J067).
- **Désaccords** : point de reprise au gardien (J034, J037, J058) contre descentes plus longues (J026, J027, J055).
- **Rétention** : citée dans 23 fiches ; moteur des « en déclin ».
- **Modifications** : reprise d'expédition comptant pour le record du jour de sa fin (J042, J044, J078) ; paliers au-delà de 40 et classement mensuel ; ×2 visible.

### 1.10 Récompenses
- **Points forts** : coffres de fer dès l'étage 8 (J015, J018, J063, J077), offrande jusqu'à 80, coffre de la semaine (« le jeu a remarqué que je viens », J060), Butin des Sceaux (« une carte choisie, pas tirée », J018).
- **Problèmes** : éclats de combat à 15 % (2 éclats à l'étage 1) alors que le panneau dit « surtout dans la Descente » (11 fiches : J013, J015, J037, J048, J049, J091, J100) [fait vérifié] ; cendres binaires : abondance morte (22 fiches ; A 3 255 en moyenne, E 15 020, J080 46 770 [mesure moteur]) ou pénurie pour qui change d'équipe (J074, J076) ; éclats sans puits (J024 39 119, J072 63 825 ; Torche bénie codée mais non vendue [fait vérifié]) ; descentes libres vides (×0,5, sans cendres) non signalées (J071, J073, J076, J077) ; Sceaux sans XP, plafonnés à 5 victoires (10 fiches : J018, J028, J031, J078, J083).
- **Désaccords** : puits de puissance (J071, J080) contre puits de collection (J075, J080) contre cosmétiques en cendres (J082, J087) contre transfert de niveaux (J074, J076).
- **Rétention** : J063 (4 000 éclats jamais vus), J074 (25 éclats), J077 (descentes vides), J013/J037 en déclin.
- **Modifications** : réécrire le panneau des éclats ; renommer la descente libre « entraînement » ; rendre visible le puits existant (Sublimer) avant d'en inventer un.

### 1.11 Durée des sessions
- **Problèmes** : la Descente « ne finit jamais d'elle-même » : 13 joueurs de A sur 20 dépassent leur temps prévu (J001 55/42 min, J008 61/47) [mesure moteur] ; à l'inverse, J073/J074/J076 n'ont pas de quoi remplir 95-114 min (3 torches, Sceaux plafonnés). Les 3-7 minutes (J057, J063, J068) demandent de fusionner victoire / bonus / descendre-remonter en un écran. Respect du temps : 6,3 → 5,3 ; 22 fiches à ≤ 4.
- **Points forts** : les Sceaux (1,5 min) sont « la seule chose qui respecte mes 12 minutes » (J045 ; aussi J031, J050, J090) ; une torche = 10-15 min convient aux pauses (J016, J076).
- **Désaccords** : expédition courte de 5-10 étages (J006, J043, J063, J090) contre rien de nouveau à ajouter mais une vraie reprise (J044, J068).
- **Rétention** : J023 (J21), J034 (J22), J068 (J18), J058 (J27).
- **Modifications** : « Terminer la séance » avec coffre depuis n'importe où (J079) ; estimation « ≈ N min » sur l'écran de palier ; reprise mise en avant sur l'Accueil.

### 1.12 Difficulté
- **Deux maux opposés** : trop facile pour prudents et experts (J029 une défaite en 29 jours, J087 3 %, J095 15 %, J096 0 défaite en 14 runs ; Cauchemar fermé avant l'étage 20 qu'ils n'atteignent pas en 18 min) ; trop dur et **sans diagnostic** pour les autres (J093 48 %, J099 82 %, J051 92 %). Le bilan « Ce qui s'est passé » est aimé (J060, J069, J079, J081, J099) mais ne nomme jamais la cause structurelle. Gardien battu le J1 par 96 profils sur 100 [mesure moteur], ce qu'un humain ne fera pas (§4) ; mur de l'étage 9 (4 ennemis, HR) dès le J1 (J041, J042, J045, J051, J053) [fait vérifié].
- **Désaccords** : Cauchemar dès l'étage 10 (J095, J096, J098) contre « Descente douce » (J089).
- **Rétention** : 6 abandons liés à l'opacité, 2 à l'ennui.
- **Modifications** : une ligne de diagnostic à la défaite ; Cauchemar par paliers (J041, J048, J053), ouvert plus tôt aux joueurs sans défaite ; pas de refonte des courbes.

### 1.13 Répétitivité
- Variété 6,5 → 4,5 ; 45 fiches à ≤ 4 au J30. Trois formes : même parcours étages 1-6 et même gardien chaque jour (D : J058, J064, J067) ; cycle des cinq gardiens « identique en plus gros » dès l'étage 30 (B, C, E : J024, J032, J043, J047, J082) ; 930 combats sur les mêmes Communes de l'événement (J053 ; 40 % des ennemis remplacés [fait vérifié]). Les 29 bulles ne proposent aucun passage obligé, donc les systèmes qui varieraient le jeu (Sceaux, Cauchemar, Chasse) restent invisibles pour une partie des joueurs.
- **Désaccords** : rotation du gardien de l'étage 5 (J064, J067) contre garder l'entrée en scène (J062) ; sixième gardien (J002, J043, J082, J092) contre variantes des cinq (J024, J032, J047) ; salles non combattantes (J053) ; combat rapide pour les étages connus (J070, J083, J093) refusé par J058/J066 (« c'est le parcours qu'il faut casser, pas la main »).
- **Rétention** : J043, J047, J058, J064, J067, J083, J092, J095.
- **Modifications** : variante au second cycle plutôt que nouveaux gardiens ; mémoire du dernier choix de porte ; présentation du gardien passée après trois victoires.

### 1.14 Ambiance visuelle
- **Point fort unanime** : beauté des cartes 8,3 → 8,4, la seule note qui ne baisse pas ; 31 fiches citent les illustrations, le dos de carte, le Classeur, les emblèmes. « Rien à ajouter, les 500 illustrations restent le cœur » (J082). Le mélange des panthéons est accepté s'il est assumé (J082, J084, J087) et une ligne « Source » est demandée par F.
- **Problèmes** : finitions invisibles en combat et dans la grille (J004, J010, J018, J043) ; icône `cb-breche.webp` manquante (carré vide : J087, J088, J093) [fait vérifié] ; cadrages et lumières qui se ressemblent (J087, J093, hypothèse d'œil professionnel) ; le violet et la densité de l'écran de combat pour les « sobres » (J006).
- **Rétention** : facteur de rétention positif chez A, D, F, G (J097, J099 tenus par la collection).
- **Modifications** : reflet sur la miniature ; icône manquante ; onglet Histoire en premier pour qui a choisi « saute les règles ».

### 1.15 Musiques et bruitages
- **Prudence** : aucun son n'a été écouté [fait vérifié] (`parcours.md` §14) ; 64 fiches sur 100 marquent la note sonore « confiance faible ». Moyenne 6,8 stable.
- **Points forts** [hypothèse] : six ambiances sans coupure, sons de rareté reconnaissables « les yeux fermés » (J085), « jamais un bip » (J081, J089, J090) ; notes 9-10 chez les deux joueurs « musique » (J085, J089).
- **Problèmes** : retour sonore du « parfait » jugé inaudible dans des écouteurs (J085, hypothèse) ; beaucoup jouent sans son (J021, J063). Rien de bloquant.
- **Modifications** : un son propre à la parade parfaite ; un lecteur dans le Sanctuaire (J085). Ne rien dégrader.

### 1.16 Tutoriels
- Thème le plus cité (42 fiches). [fait vérifié] : 29 bulles, ≈ 1 670 mots, 12 bulles et 740 mots en 5 étages, guide de 8 pages, fiche Combat de 495 mots ; deux bulles jamais déclenchées (« Lire les intentions », « Son »).
- **Problème structurel** : lus par ceux qui n'en ont pas besoin, sautés par ceux qui en auraient besoin. Les lecteurs retiennent les contradictions ; les non-lecteurs ratent Renforcer, la Brisure, la reprise, les Sceaux. « Les boosters » parle de « sublimer » avant la première cendre (J057, J069, J075, J091, J097) [fait vérifié].
- **Désaccords** : 20 mots + « En savoir plus » (J075, J086, J090) ; page de règles (J003, J018, J092, J100) ; garder et corriger (J059, J066, J073, J081) ; une bulle de plus pour Cauchemar (J073, J074) et une partie guidée des Sceaux (J067, J099).
- **Rétention** : indirecte mais massive (1.2, 1.7).
- **Modifications** : une bulle courte par système au moment utile ; « ? » contextuel en combat (J090) ; deux passages obligés : Renforcer après la première défaite, partie guidée des Sceaux.

### 1.17 Motivation à revenir
- Envie de revenir 7,4 → 5,1. **Ce qui ramène** [hypothèse] : booster gratuit et offrande (14 fiches de D sur 15 ; J099), le compteur /500, les récits après un gardien (J081, J094), les Sceaux comme second souffle (J018, J026, J031, J083, J086, J089, J097), le classement du jour pour qui a un pseudo (J080, J098), l'événement (J070), un record qui bouge encore (J042, J069, J098).
- **Ce qui fait oublier** : rendez-vous punitifs pour l'intermittent (booster gratuit perdu, série remise à 1, coffre à 5 jours [fait vérifié] : J005, J012, J054, J057, J085) ; rien de neuf après J7-J14 ; Sceaux jamais annoncés après le premier gardien [fait vérifié] (J007 ne les a jamais vus, J095 les découvre au J19) ; pseudo jamais demandé, donc classement et Tirage invisibles (11 fiches) ; « Atteins l'étage 4 » affiché à un record 14-18 (J068, J093, J095).
- **Désaccords** : J087 aime être récompensé de sa régularité ; J085 est parti pour la même règle.
- **Modifications** : annonce d'ouverture des Sceaux ; pseudo à l'inscription ; booster gratuit cumulable sur 2-3 jours ; objectif hebdomadaire calculé sur l'historique, jamais sous le record.

### 1.18 Raisons d'abandon
Les 23 abandons [hypothèse de simulation ; mécanismes vérifiés] se regroupent ainsi (un joueur peut compter deux fois) : **difficulté opaque** (plancher, Cauchemar, Renforcer jamais trouvé) J012, J021, J051, J063, J074, J079, J093 ; **record figé / répétition / cycle** J023, J034, J043, J058, J068, J077, J083, J095, J096 ; **collection** (doublons, finitions, 0 Secrète) J003, J010, J016, J083, J085 ; **textes incohérents** J100, J016, J093 ; **absence d'adversaire humain** J014, J096 ; **rendez-vous punitifs** J085 ; **compte obligatoire** comme déclencheur J079 ; **Sceaux avancés opaques** J035. Ennui (J095, J096) et mur (J093, J099) coexistent dans la même famille G à profils déclarés comparables : la différence est l'habileté réelle, que le jeu ne mesure pas.

---

## 2. Contradictions et fausses bonnes idées

**Complexité contre simplicité.** « Enlevez » : J006, J014, J038, J045, J062, J063, J068, J079, J092, J096, J100. « Expliquez tout, exactement » : J028, J030, J047, J052, J059, J066, J073, J081, J087. Compromis : ne retirer aucune mécanique du moteur (B et C l'aiment pour ça), réduire ce qui est *affiché* et *imposé* : une bulle courte par système à l'usage, le reste dans une page Règles et un « ? » contextuel. Ne pas fusionner les états Marque/Brèche/Fêlé (J092, J096) : ils portent des règles différentes ; une pastille « vulnérable + % » commune suffit.

**Récompenses contre prestige de la rareté.** Plus de finitions, pitié M à 50, Secrète garantie (J010, J016, J019) contre rareté préservée (J002, J015, J078 : « ça n'a de valeur que si c'est tombé »). Direction : garder les taux, rendre visible l'existant (taux affichés, recrutement de gardien annoncé, reflets dans la grille, Sublimer accessible). Ce qui fait souffrir est l'ignorance de la source des Secrètes, pas leur taux.

**Combats rapides contre profondeur.** ×2, combat rapide ou auto (J023, J044, J055, J070, J083, J093) contre « le combat se joue » (J058, J066, et le projet : Auto retiré en v240). Compromis : rendre visible le ×2 existant, fusionner les écrans de fin d'étage, faire compter la reprise du lendemain pour le record. La plupart des demandes d'« auto » sont des demandes de temps, pas de délégation. Ne pas réintroduire l'Auto.

**Contenu contre répétitivité.** 15 fiches demandent un sixième gardien, 24 talents, des reliques, des salles d'événement. Direction : cinq gardiens excellents valent mieux que vingt moyens. Variante au second cycle, trois ou quatre talents qui changent une règle, mémoire du choix de porte, présentation passée après trois victoires. Ne pas suivre J049 (reliques) ni J053 (salles narratives) avant d'avoir rendu visibles Chasse, Cauchemar et Sceaux, que la moitié des joueurs ignorent.

**Progression rapide contre long terme.** E a tout fini en 8 jours ; D n'a jamais vu la Matriarche. Niveaux 11-15 et paliers jusqu'à 100 (J024, J071, J075, J080) : 5 joueurs sur 100. Reprise, diagnostic, point de départ : une quarantaine. Servir d'abord les 40 (lisibilité, pas contenu) ; pour les 5, classement mensuel et quelques paliers ; refuser les niveaux 11-15, qui aggraveraient le plancher et la composition unique.

**Compte obligatoire contre invité.** Pour : J057, J070, J080 (et la décision du propriétaire). Contre : J014, J026, J030, J045, J059, J062, J079, J090, J091, J095. Le jeu bloque sans réseau [fait vérifié] et promet un PvP absent. Si la décision tient : retirer la promesse, demander le pseudo à l'inscription, tolérer le hors-ligne quand une session existe. Sinon : compte au premier coffre, partie locale conservée (mécanisme existant).

**Maudite.** Coffre minimal en défaite (J048, J051, J074) contre risque pur (J053, J055). Garder la règle, afficher le taux de défaite personnel sur la puce (J048).

**Sceaux.** Plus de Sceaux (tournoi, 9e rival, classement, PvP asynchrone : J018, J031, J078, J083, J086, J089, J097) ; moins de Sceaux dans l'Accueil et les titres (J017, J029, J055, J082) ; Sceaux compréhensibles (J030, J035, J038, J050, J071, J099). Seule la troisième ne contredit personne : règle du rival sur le plateau, bilan de partie, partie guidée. Le PvP asynchrone est la demande la plus fréquente de l'étude (J005, J011, J014, J026, J057, J065, J066, J072, J078, J092, J094, J096, J099) : un vrai chantier, à ne pas lancer avant la lisibilité du solo.

**À ne pas suivre** : échange de cartes entre joueurs (refusé par le projet ; J003, J066, J078) ; booster « cartes manquantes garanties » (J017 : dilue la rareté) ; supprimer le multiplicateur de niveau sur les PV (J033 : refonte du moteur) ; supprimer la Fournaise (J100) ; cendres convertibles en éclats (J071 : casse le seul puits d'éclats) ; mode « nuit » séparé (J069 : une défense assistée suffit).

---

## 3. Les dix conclusions les plus importantes

1. **Le record est fixé par l'horloge, pas par l'équipe.** [mesure moteur] Un combat ≈ 1,2 min, aucune accélération visible, reprise du lendemain non expliquée et non comptée pour le record du jour : 44 fiches sur 100 ont un record figé avant J12. C'est la cause de fond des déclins dans toutes les familles.
2. **Le plancher de difficulté est la règle la plus importante du jeu et il n'est écrit nulle part.** [fait vérifié] 24 fiches le nomment ou réclament un « niveau conseillé » ; six abandons en découlent (J012, J021, J074, J079, J093, J051 par Renforcer). Une ligne au vestibule et au bilan de défaite le résout.
3. **Renforcer n'est jamais sur le chemin.** [fait vérifié + mesure] Sept joueurs de D finissent le mois au niveau 1 avec 950-2 020 cendres ; « Pas assez de cendres ? » s'affiche à tort. 13 fiches ; un passage guidé après la première défaite suffirait.
4. **Les cendres n'ont pas de rythme : abondance morte ou pénurie.** [mesure moteur] 22 fiches ; A 3 255, E 15 020 cendres inutilisées en moyenne ; Sublimer, le puits prévu, est dans un onglet de fiche que 2 joueurs sur 100 ont trouvé. Le rendre visible avant d'inventer un puits.
5. **Secrètes et Mythiques viennent des gardiens, pas des boosters, et personne ne le sait.** [mesure moteur] 4 Secrètes tirées en 1 600 boosters chez A ; 7 sur 10 recrutées chez J080. L'annoncer sur l'écran du gardien change la stratégie des collectionneurs sans toucher aux taux.
6. **La variété s'effondre (6,5 → 4,5) pour deux publics opposés.** [hypothèse + fait] Les courts revoient le Dévoreur 17-28 fois ; les longs voient le cycle à 30. Variantes au second cycle et présentation passée après trois victoires, plutôt que du contenu neuf.
7. **Les textes faux coûtent la confiance de ceux qui lisent.** [fait vérifié] Sept incohérences relevées en navigateur (Gardien/Serment, trophée/Butin, 100 % des PV, Remonter avec le coffre, Hydre/Dévoreur, accord, icône 404) ; 15 fiches ; cause d'abandon de J100, facteur pour J016, J093. Une relecture, zéro design.
8. **Le tutoriel est trop long pour ceux qui sautent et mal placé pour ceux qui lisent.** [fait vérifié] 29 bulles, 1 670 mots, trois bulles avancées pendant un combat guidé de deux tours ; 42 fiches. Les deux camps veulent la même chose : court au bon moment, complet à la demande.
9. **La première minute est le point aveugle de l'étude.** [fait vérifié] Compte obligatoire bloquant hors réseau, promesse PvP non tenue, 33 touchers avant le premier combat : zéro abandon simulé au J1, mais D et G notent 6,2 et 5,5 et quatre fiches racontent une fuite ou une quasi-fuite (J059, J062, J079, J090).
10. **Ce qui doit être protégé : l'ouverture, les cartes, les gardiens, les Sceaux.** [hypothèse convergente] Beauté 8,4 stable ; l'ouverture lente citée dans 17 fiches de A sur 20 et par 5 abandons ; Lois de l'Architecte et phases 2 saluées par B, C, E ; les Sceaux retiennent J018, J026, J031, J083, J086, J089, J097. Aucune correction ci-dessus ne touche ces quatre éléments.

---

## 4. Limites de la méthode

- **Aucun abandon avant J8, alors que le churn réel du premier jour est le plus fort.** Les profils étaient voués à jouer ; compte, 33 touchers et écran dense n'ont produit aucun départ simulé. Les 76 % « non partis » au J30 n'ont aucune valeur prédictive ; seul l'ordre des causes est exploitable.
- **Le bot joue mieux qu'un débutant.** Gardien battu le J1 par 96 profils sur 100 ; défenses et anneaux réussis par un automate au timing parfait. Les murs réels (étage 9, défense active, Brisure) sont sous-estimés : les abandons par difficulté sont probablement plus nombreux et plus précoces que simulé.
- **Le bot déborde le temps prévu** (A : 38,9 min mesurées pour 33) : « la Descente ne finit pas d'elle-même » est en partie un artefact, même si l'absence de coupure propre est réelle.
- **Aucun son écouté, aucun geste tactile, aucun iPhone.** 64 notes sonores sur 100 en confiance faible ; parade, déchirure et « parfait » inaudible sont des hypothèses ; les tailles de boutons sont mesurées, pas éprouvées.
- **Rien d'en ligne testé** (Supabase inaccessible) : compte, synchronisation, classement, Tirage, présence. Les constats sur le pseudo viennent du code.
- **Le ressenti est écrit par des agents**, un par famille, qui ont pu amplifier une thèse (A les finitions, C Maudite, G les textes). Les convergences entre familles indépendantes (record figé, plancher, Renforcer, cendres, textes) sont plus solides que les constats d'une seule famille.
- **Fréquences approximatives** : relevés par mots-clés, mentions et non intensité.
- **Surestimé** : vitesse de progression (équipe au 10 dès J7-J10 chez E), nombre de boosters (le bot achète dès qu'il peut), lecture des bulles. **Sous-estimé** : abandon précoce, frustration tactile, effet de l'absence d'adversaire humain sur le bouche-à-oreille, et le poids du son, soigné par le propriétaire et entendu par personne ici.
