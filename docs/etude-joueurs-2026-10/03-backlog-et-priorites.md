# ABYSSAL — Backlog priorisé issu de l'étude simulée (100 joueurs, 30 jours)

Version étudiée : **v327**. Trois niveaux de preuve sont distingués partout : **fait vérifié** (code ou navigateur, cité de `reference.md` / `parcours.md`), **mesure moteur** (bot sur 30 jours, `mesures-familles.md`), **hypothèse de simulation** (ressenti écrit par les agents joueurs dans les fiches). Les fréquences « n fiches / 100 » comptent les fiches qui mentionnent explicitement le point dans les sections C à J ; elles sont des ordres de grandeur, pas des sondages réels. Aucune proposition n'a été implémentée ni testée sur iPhone.

Contraintes respectées : pas de boosters payants ni d'achats de puissance ; le compte obligatoire est une décision du propriétaire (un seul point le touche, en option) ; aucune carte supprimée ou renumérotée ; violet discret en combat ; aucun bip.

---

## 1. Backlog priorisé

Format de chaque bloc : **1** problème · **2** profils · **3** fréquence · **4** preuves · **5** amélioration · **6** impact expérience · **7** impact rétention · **8** difficulté (fichier) · **9** risque · **10** maintenance · **11** critère de succès.

### P0 — à corriger immédiatement

**P0-1. Écran « Remonter avec le coffre » aux étages 1 et 2, sans coffre**
1. L'écran de palier affiche « Remonter avec le coffre · Tu gardes le coffre », « Même coffre », « coffre d'une qualité en dessous » alors que `chestForDepth` vaut `null` avant l'étage 3 ; des joueurs remontent à vide.
2. Toutes les familles ; surtout débutants et courts : J007, J013, J016, J019, J028, J034, J041, J042, J057, J063, J068, J077, J081, J091, J094, J098, J100.
3. 17 fiches / 100 ; observé en navigateur (`parcours.md` friction 10).
4. « il l'a fait plusieurs fois » (J063, étages « 2,7 », « 3,6 ») ; « elle a remonté une fois pour rien le J5 » (J007) ; J094, J013 idem.
5. `js/screens/descent.js` `clearedView` : quand `now` est `null` et `!run.free`, remplacer le bloc « Si tu remontes » par une seule ligne « Pas encore de coffre : il arrive à l'étage 3 », et le bouton par « Remonter (rien à garder) » en style discret ; garder la confirmation.
6. Supprime une fausse décision et une incohérence vue dès le J1.
7. Évite les expéditions « pour rien » du premier jour (hypothèse : cause partielle de J063, J068).
8. Faible (`descent.js`, texte et condition).
9. Nul pour les sauvegardes ; vérifier la descente libre (`run.free`).
10. Nul.
11. Playwright : aucun mot « coffre » sur le palier des étages 1-2 ; vrais joueurs : 0 remontée avant l'étage 3 dans les journaux de la première expédition.

**P0-2. « Ton équipe · 100 % des PV » avec une créature tombée**
1. Le pourcentage est calculé sur les survivantes seulement (`descent.js:155`), donc 100 % avec Draugr à 0/13.
2. Tous les « lit tout » et profils « bug » : J016, J019, J028, J041, J042, J059, J060, J061, J066, J073, J077, J080, J091, J093, J098, J100.
3. 16 fiches ; observé en navigateur (friction 11).
4. « si le texte ment, qu'est-ce qui ment d'autre ? » (J073) ; cause d'abandon citée par J100 et J016.
5. Calculer sur les 5 membres (tombée = 0 PV) et ajouter « · 1 tombée » quand `m.fallen`.
6. Rétablit la confiance dans l'écran de victoire.
7. Indirect mais réel chez les sceptiques (famille G, note 4,7).
8. Faible (`descent.js` `rewardView`).
9. Nul.
10. Nul.
11. Test Node sur le calcul ; Playwright après une chute à l'étage 2.

**P0-3. Lot de relecture : un seul nom par objet**
1. Restes d'anciens noms : « Sceau du Gardien » (`tutos.js:25`, `army.js:63`), « trophée » (`tutos.js:22`), « Le Dévoreur » présenté puis « Hydre de Lerne » en combat, « Morvenn la Maudite est tombé » (`duel.js:1722`, `descent.js:162`), « INF-072 · 72/72 » au-dessus de « Infernal : 1 / 72 », « enregistrée uniquement sur cet appareil » (`settings.js:64`), succès jumeaux « Premier sceau brisé » / « Le premier sceau » (`achievements.json` lignes 2 et 18), titre « Éveilleur des Sceaux ».
2. Toutes familles ; ces incohérences sont la cause d'abandon de J100 et un facteur pour J016, J093, J042, J052.
3. ≈ 30 fiches citent au moins une de ces incohérences ; toutes observées en navigateur (frictions 8, 12, 14, 16, 17) ou dans le code.
4. « trois incohérences en une séance disqualifient le reste » (J100) ; « 7 textes contradictoires relevés en trois semaines » (J052).
5. Textes seulement : « Sceau du Serment » partout ; « Butin » dans la bulle ; afficher « Le Dévoreur » (nom de scénario) sur la carte du gardien, avec « Hydre de Lerne » en sous-titre ; accord `tombé${fem ? 'e' : ''}` via le genre déjà présent dans les données de carte (à vérifier) ou formule neutre « a succombé » ; une seule numérotation sous la carte révélée ; renommer le succès `boosters_1` en « Premier paquet déchiré » (clé inchangée) ; texte de Sauvegarde mis à jour pour le compte.
6. Aucun joueur attentif ne doute plus du jeu dès la première séance.
7. Supprime une cause d'abandon citée explicitement (J100, J016).
8. Faible (textes dans `tutos.js`, `army.js`, `duel.js`, `descent.js`, `duel-ui.js`, `settings.js`, `achievements.json`).
9. Nul : aucune clé ni titre stocké ne change (règle v319). Un test vérifie déjà la cohérence du vocabulaire ; l'étendre.
10. Faible : ajouter un test qui interdit « Sceau du Gardien » et « trophée » dans `js/`.
11. `grep` vide ; relecture en navigateur des étages 1-5.

**P0-4. Icône `assets/icons/cb-breche.webp` manquante (404)**
1. `duel-ui.js:346` construit `cb-${key}` ; seuls bastion, chain, chasse, glace existent : la bulle d'effet de la Brèche affiche un carré vide.
2. Profils visuels : J087, J088, J093, J061, J081.
3. 5 fiches ; observé en navigateur (friction 23, 3 erreurs 404).
4. « qu'il a vue comme un carré vide » (J087).
5. Ajouter l'image (même recette que les quatre autres) ou retomber sur `cb-chain` quand le fichier manque.
6. Fini le carré vide dans la bulle la plus fréquente du combat.
7. Faible, mais c'est un signe de finition.
8. Faible.
9. Nul.
10. Nul.
11. Zéro 404 dans la console Playwright sur 5 étages.

**P0-5. « Pas assez de cendres ? » affiché à tort dans Renforcer**
1. `forge.js:35` affiche ce lien quelles que soient les cendres ; J060 l'a cru pendant 30 jours.
2. Occasionnels et sceptiques : J009, J045, J056, J060, J069, J074, J093.
3. 7 fiches ; observé en navigateur (94 cendres, niveaux à 15).
4. « l'a convaincu qu'il n'avait rien à faire dans Renforcer » (J060) ; « affiché avec 4 000 cendres » (J093).
5. Texte conditionnel : si une créature de l'équipe peut monter, « Tu as N cendres : X peut passer niveau 2 (10) » ; sinon le lien actuel.
6. Le premier écran de progression dit la vérité.
7. Attaque directement la cause mesurée des équipes niveau 1 (7 joueurs de la famille D sur 15 au J30).
8. Faible (`forge.js`, `g.cardLevel`, `levelAsh`).
9. Nul.
10. Nul.
11. Playwright : texte conditionnel ; vrais joueurs : part de comptes avec équipe toute niveau 1 au J7.

**P0-6. Les Sceaux s'ouvrent après le premier gardien sans aucune annonce**
1. Seul « Succès débloqué : Premier gardien » s'affiche (friction 15) ; le guide présente les Sceaux sans dire qu'ils sont fermés (friction 22) ; le titre de départ est « Novice des Sceaux ».
2. Collectionneurs, occasionnels, sceptiques : J007, J014, J041, J042, J046, J048, J052, J057, J082, J095, J100.
3. 11 fiches ; fait vérifié. Famille D : 0 partie de Sceaux en 30 jours sur 15 joueurs (mesure moteur).
4. « ça, j'aurais dû l'avoir le premier jour » (J095, abandon J19) ; J007 ne les a jamais vus.
5. Dans `game.js` fin de combat (ligne 947, `first`), pousser une annonce « Les Duels des Sceaux sont ouverts ! » (son `sheet`, pas de bip) et ajouter « Joue ta première partie des Sceaux » dans « Ensuite » ; page 6 du guide : « (s'ouvrent après ton premier gardien) » ; titre de niveau 1 renommé « Novice de l'Abysse » (texte seulement ; la clé `titles[0]` stockée est le libellé : vérifier `unlocks.js` avant de toucher, sinon laisser).
6. Le second jeu du produit est découvert au bon moment.
7. Les Sceaux retiennent J018, J031, J083, J086, J089, J097 : les faire découvrir est un levier de rétention mesurable.
8. Faible (`game.js`, `welcome.js`, `tutos.js`).
9. File d'annonces : vérifier qu'elle n'écrase pas le succès (regroupement au-delà de 2).
10. Nul.
11. Vrais joueurs : part des comptes avec ≥ 1 partie de Sceaux dans les 48 h après le premier gardien.

**P0-7. Boutons essentiels sous le pli**
1. « Ouvrir mon coffre » sur le résumé, les 3 talents après le gardien, le bonus de l'étage 1 : 0 bouton visible sans défiler en 390 × 844.
2. J041, J058, J069 ; tous les joueurs courts.
3. 3 fiches ; observé en navigateur (friction 13).
4. « le choix fait au hasard » (J058) ; « une tape de plus à chaque fois » (J069).
5. Résumé : bouton « Ouvrir mon coffre » collé en bas (`position: sticky`) ; talents : titre plus court et cartes de talent plus compactes ; bonus : réduire l'en-tête de victoire quand il n'y a ni fait marquant ni relation. Règles ajoutées à la fin de `css/army.css` avec `/* v328 : … */`.
6. Une tape de moins, et le choix de talent devient visible.
7. Faible mais quotidien.
8. Faible (CSS).
9. Vérifier iPhone SE (667 px).
10. Nul.
11. Playwright SE et 13 : bouton visible sans défiler.

**P0-8. Zones tactiles sous 44 px**
1. ▼ ✕ de l'Équipe (34 × 30), Favori / Brûler (28 px), « Ton nom » (25), « Personnaliser » (30), « Voir la réserve » (38 × 32).
2. Joueurs de nuit et à une main : J044, J060, J089, J094, J097, J038.
3. 6 fiches ; observé (friction 24).
4. « trop petits pour des doigts de 3 h du matin » (J094) ; J038 a mis trois jours à voir « Voir la réserve ».
5. Hauteur minimale 44 px sur ces six contrôles (CSS, fin de `army.css`).
6. Moins d'erreurs de toucher, conformité Apple.
7. Faible.
8. Faible.
9. Réserve en combat : vérifier qu'elle ne masque pas les cartes.
10. Nul.
11. Script Playwright qui mesure les boîtes (déjà écrit pour l'étude).

**P0-9. Mot de passe trop court : infobulle native du navigateur, en anglais**
1. `minlength` déclenche le message du navigateur avant la validation du jeu.
2. Tous les nouveaux joueurs ; 7 joueurs de la famille D ont vu un refus de mot de passe (hypothèse de simulation).
3. Observé en navigateur (friction 2).
4. « Please lengthen this text to 8 characters or more ».
5. `novalidate` sur le formulaire et validation `pwOk` côté jeu, même message rouge que pour « abcdefgh ».
6. Un seul ton, en français.
7. Faible mais au point le plus fragile du parcours.
8. Faible (`js/screens/account.js`).
9. Nul.
10. Nul.
11. Playwright : message du jeu pour « abc ».

### P1 — priorité élevée

**P1-1. Rendre le plancher de difficulté visible**
1. `floorFloor(avgLevel)` et `expectedLevel(floor)` existent (`descent.js:39-40`) mais ne sont affichés nulle part ; monter deux cartes et laisser les autres au niveau 1 rend l'étage 3 mortel sans message.
2. Stratèges, roguelite, très investis, sceptiques : J005, J009, J012, J015, J021, J026, J033, J040, J046, J049, J050, J051, J059, J060, J069, J074, J076, J077, J079, J083, J090, J093, J094, J099.
3. 24 fiches ; cause d'abandon de J012, J021, J074, J079, J093 ; mesure moteur : record figé après J7 chez 11/15 roguelite, 13/15 occasionnels.
4. « il a cru à un bug quand l'étage 3 est devenu mortel après avoir monté ses Communes » (J021) ; « avec la règle du plancher écrite sur un post-it » (J040).
5. Vestibule : ligne « Niveau conseillé pour l'étage N+1 : X · ton équipe : Y » (Y = moyenne des 5, le plancher s'appuie dessus) ; écran de porte : même chiffre ; `battleReport` (duel.js:1716) : ajouter « Tes créatures sont niveau Y ; l'étage attend le niveau X » quand Y < X − 1 ; « Comment ça marche » : une étape sur le plancher.
6. La difficulté devient lisible sans changer l'équilibre.
7. C'est le constat le plus partagé de l'étude après les textes : fort.
8. Faible à moyenne (`screens/descent.js`, `core/duel.js`, données déjà calculées).
9. Nul pour les sauvegardes ; ne pas modifier `FLOOR_MARGIN`.
10. Faible.
11. Vrais joueurs : part des comptes dont la moyenne d'équipe est sous le niveau attendu de leur record à J14.

**P1-2. Mettre Renforcer sur le chemin**
1. Rien n'oriente vers Renforcer pendant les 5 premiers étages ; la pastille « ↑ » est prise pour une notification ; la bulle « Les boosters » parle de « sublimer » avant.
2. J009, J011, J015, J050, J051, J056, J059, J060, J063, J065, J067, J069, J091, J092, J093, J094.
3. 16 fiches ; mesure : équipe toute niveau 1 au J30 chez 7/15 occasionnels, J051 (92 % de défaites), J011 (6 859 cendres).
4. « Renforcer n'a jamais été mis sur son chemin » (J011) ; « conquis par Renforcer 17 jours trop tard » (J094).
5. Objectif « Ton prochain objectif » : « Monte X au niveau 2 (10 cendres) » dès que cendres ≥ coût et qu'aucune carte n'a été montée ; bouton « Renforcer » à côté de « Modifier l'équipe » dans le vestibule ; action « Monter X au niveau N » dans le bilan de défaite ; retirer « sublimer » de la bulle Boosters ; renommer la pastille « ↑ » en « +1 » avec texte « 3 créatures peuvent monter » dans Collection.
6. Le premier levier de progression est découvert le jour 1.
7. Fort : explique la moitié des murs incompris.
8. Moyenne (`game.js` objectifs, `screens/descent.js`, `main.js` pastilles, `tutos.js`).
9. Faible ; attention au bruit si l'objectif revient trop souvent (une fois jusqu'à la première montée).
10. Faible.
11. Vrais joueurs : première montée de niveau avant J2 pour 80 % des comptes.

**P1-3. Expédition en cours : dire qu'elle se reprend, et compter la reprise**
1. Personne ne sait qu'une expédition commencée se reprend le lendemain ; la règle « ne compte pas pour le record ni les missions du jour » (`game.js:1023`) dissuade ceux qui la connaissent ; le point rouge sur Aventure est lu comme un reproche. Le record est devenu la durée de séance (mesure : 12/20 stratèges, 13/15 occasionnels, 7/10 univers).
2. Toutes les familles, surtout les séances courtes : J006, J023, J034, J037, J042, J044, J056, J058, J065, J066, J068, J072, J078, J079, J082, J084.
3. 16 fiches ; cause d'abandon de J023, J034, J068, J058.
4. « le point rouge sur Aventure ressemble à un reproche » (J068) ; « 13 minutes = 13 étages » (J034).
5. (a) Textes : sur l'écran de palier « Tu peux t'arrêter ici : l'expédition t'attendra demain » ; sur l'Accueil, objectif « Reprendre l'expédition · étage N » déjà prévu par `game.js` (vérifier qu'il passe devant l'événement) ; libellé de la pastille. (b) Règle à décider par le propriétaire : faire compter la reprise pour le **record personnel** (déjà le cas via `d.best`) et le dire ; laisser le classement du jour tel quel (le donjon change chaque jour), mais compter les missions du jour de la fin.
6. Les joueurs de 5-15 minutes voient enfin le gardien de l'étage 10.
7. Fort : c'est la cause principale du « record figé » des courts.
8. Faible pour (a) ; faible pour (b) (`game.js:1023`, une condition).
9. (b) peut gonfler la mission « Atteins l'étage 4 » ; sans effet sur les sauvegardes.
10. Nul.
11. Vrais joueurs : part des expéditions reprises le lendemain ; record moyen à J14 chez les comptes à moins de 10 min/jour.

**P1-4. Sublimer visible là où sont les cendres**
1. Sublimer vit dans l'onglet Rareté de la fiche ; les cendres s'accumulent sans emploi dès que l'équipe est au niveau 10 (mesure : 3 255 cendres inutilisées en moyenne chez les collectionneurs, 15 020 chez les très investis, 46 770 pour J080).
2. Collectionneurs, univers, très investis : J001, J002, J004, J008, J010, J017, J020, J043, J075, J082, J087.
3. 11 fiches explicites ; bilans A et F unanimes ; mesure moteur.
4. « personne ne va chercher une dépense dans un onglet de fiche » (bilan A) ; « la pire faute du jeu » pour un collectionneur (J087).
5. Bouton « Sublimer » dans la Fournaise à côté de « Tout brûler », listant les favorites sublimables avec le coût ; objectif Accueil « Sublime une carte » quand les cendres dépassent 5 × le coût du prochain niveau utile ; afficher le coût sur la fiche dès l'en-tête des 4 finitions.
6. Le puits cosmétique existant redevient un but.
7. Moyen : touche les deux « en déclin » de la famille A et une partie des cendres mortes de E.
8. Faible à moyenne (`forge.js`, `game.js` objectifs ; `sublimeInfo` existe).
9. Nul pour les sauvegardes.
10. Faible.
11. Vrais joueurs : nombre de sublimations par compte à J30 (aujourd'hui ≈ 0 dans la simulation hors J004, J010).

**P1-5. Alléger le premier combat : trois bulles avancées en deux tours**
1. Marque/Brèche (63 mots), pouvoir d'équipe (74), dés (58) s'ouvrent pendant le guidage de la main dorée ; 12 bulles, 740 mots en 5 étages.
2. Tous les « saute tout » et la moitié des « lit tout » : J006, J013, J014, J021, J032, J038, J045, J046, J059, J066, J075, J079, J081, J086, J090, J092, J096, J097, J100.
3. 19 fiches ; observé (friction 7).
4. « il les a lues, il n'en a rien retenu » (J081) ; « trop tôt, trop long » (J032) ; J086 a sauté Brisure et l'a payé (51 % de défaites).
5. `duel-ui.js:841` : ne déclencher `cb-combo`, `cb-ult`, `cb-dice` qu'à partir de la deuxième expédition (ou après le premier gardien) ; `cb-ult` à la première Ferveur pleine hors guidage ; chaque bulle : première phrase en gras (≤ 20 mots) puis « En savoir plus » qui déplie le reste (même HTML, `details`).
6. Le premier combat reste la main dorée et rien d'autre.
7. Moyen : les joueurs qui ratent la Brisure perdent plus (J086, J090, J021).
8. Moyenne (`duel-ui.js` conditions, `coach.js` rendu, `tutos.js`).
9. Les bulles restent relisibles dans Réglages ; ne pas supprimer de clé.
10. Faible.
11. Playwright : 1 bulle maximum pendant le combat de l'étage 1 ; vrais joueurs : part des combats de gardien avec ≥ 1 Brisure à J7.

**P1-6. Règle du rival écrite sur le plateau des Sceaux, et bouton « ? »**
1. Les règles Cases sacrées, Abîme, Usure, Archives, Néant n'ont aucune bulle ; celle d'Identique/Somme ne se relit pas sur place ; aucun bilan de partie.
2. J001, J008, J011, J013, J030, J035, J037, J038, J039, J050, J053, J071, J076, J099.
3. 14 fiches ; cause d'abandon de J035 ; mesure : « moyens » à 29-33 % de victoires (famille E).
4. « Usure, Archives restent des mots » (J050) ; « il a cru à un hasard truqué » (J035).
5. Une ligne au-dessus des 9 cases : nom de la règle + phrase courte (déjà dans `SC.RULES`) ; bouton « ? » qui rouvre la bulle ; après une défaite, une ligne de bilan « La pose N en coin a offert 2 captures » (compter les captures subies par pose dans `sceaux.js`).
6. Les Sceaux deviennent compréhensibles pour les non-lecteurs.
7. Moyen à fort : les Sceaux sont le second souffle de F et G.
8. Faible pour la ligne et le « ? » (`screens/sceaux.js`) ; moyenne pour le bilan.
9. Ne pas toucher aux forces d'IA (réglées par simulation, CLAUDE.md §4 ter).
10. Faible.
11. Vrais joueurs : taux de victoire contre les rivaux 3-5 ; parties jouées par semaine.

**P1-7. Bilan de défaite qui nomme la cause**
1. « Ce qui s'est passé » dit qui a frappé, pas pourquoi l'équipe était trop faible ni quelle mécanique a manqué.
2. J012, J035, J059, J069, J074, J079, J086, J091, J093, J099.
3. 10 fiches ; le bilan existant est pourtant aimé (J060, J069, J079, J081, J099).
4. « une ligne qui nomme la mécanique ratée : le gardien était Fêlé, un coup de rupture l'aurait Brisé » (J086).
5. `battleReport` : ajouter la ligne de niveau (voir P1-1), « Un ennemi est resté Fêlé N tours sans être Brisé », « Défense automatique : aucune parade possible », et un bouton d'action (« Renforcer », « Changer d'équipe ») sur l'écran de fin.
6. Chaque défaite enseigne quelque chose.
7. Moyen : réduit le « mur sans diagnostic » (J093, J012).
8. Faible à moyenne (`duel.js`, `screens/descent.js`).
9. Nul.
10. Faible.
11. Vrais joueurs : montée de niveau dans l'heure qui suit une défaite « niveau insuffisant ».

**P1-8. Défense active : proposer l'automatique, dire qu'il ne pare pas, offrir un cran « assistée »**
1. Fenêtres de 160-320 ms (parade 32-64 ms) avec départ aléatoire ; l'automatique fait 40 % d'esquives et jamais de parade, sans le dire.
2. Joueurs fatigués ou en transport : J023, J029, J044, J053, J060, J063, J069, J081, J089, J099 ; à l'inverse J024, J025, J095, J096 adorent la parade.
3. 10 fiches pour, 4 contre ; hypothèse de simulation (l'automate réussissait toujours) ; fenêtre lue dans le code.
4. « le jeu ne dit nulle part que l'automatique est plus faible » (J089) ; « entre deux portières ; 39 % de défaites » (J063).
5. Après 3 défenses ratées dans une expédition, annonce « Tu peux passer la défense en automatique (Réglages) » avec raccourci ; dans Réglages, texte « Automatique : 40 % d'esquives, pas de parade » ; troisième choix « Assistée » : curseur ×0,5 et parade possible (à équilibrer avec `tools/fuzz.mjs 300`).
6. Le combat reste jouable au doigt à 23 h sans supprimer la parade des experts.
7. Moyen : touche le taux de défaite des occasionnels (28-39 %).
8. Moyenne (`duel-ui.js:800-806`, `settings.js`, `duel.js:1539`).
9. Équilibre : l'assistée ne doit pas dépasser le manuel moyen (40/15) ; mesure fuzz avant et après.
10. Faible.
11. Fuzz : taux de victoire assistée entre auto et manuel ; vrais joueurs : défaites par expédition des comptes en mode assisté.

**P1-9. Offrande et missions versées sans aller-retour**
1. L'offrande (+50) et la mission terminée (+40) ne se réclament que sur l'Accueil ; en fin de séance observée, elles étaient encore en attente.
2. J009, J075, J077, J080, J089, J091, J094, J098.
3. 8 fiches ; observé (friction 20).
4. « il en a oublié plusieurs » (J009) ; « point rouge invisible pour lui » (J094).
5. Verser l'offrande à l'ouverture de l'Accueil avec une annonce (son `chest`), ou un seul bouton « Tout récupérer » en haut du bloc « Aujourd'hui » ; garder la frise de 7 jours.
6. Le quotidien tient en un geste.
7. Faible à moyen (régularité).
8. Faible (`game.js`, `home.js`).
9. File d'annonces ; ne pas doubler les sons.
10. Nul.
11. Vrais joueurs : part des offrandes réclamées le jour même.

**P1-10. Transparence des taux et de la source réelle des Secrètes**
1. Les taux par rareté ne sont pas affichés ; aucun écran ne dit que 25 % des gardiens donnent leur carte (31 Secrètes sur 35 possédées en famille A viennent des gardiens, 4 des boosters).
2. J001, J002, J007, J015, J019, J046, J071, J072, J080, J091, J100.
3. 11 fiches ; mesure moteur (M/S par booster : 0,56 % / 0,07 %).
4. « le vrai gacha, c'est le boss, pas le paquet » (J091) ; J001 a ouvert 200 boosters en chassant la Secrète.
5. Écran Boosters : ligne « Taux par carte : C 49 % · PC 40 % · R 7,8 % · HR 2,2 % · M 0,56 % · S 0,07 % » sous les barres de garantie ; présentation du gardien : « 25 % de chances de recruter sa carte » ; panneau des éclats (`main.js:95`) : « surtout grâce aux coffres de fin d'expédition » au lieu de « combats ».
6. Les attentes sont justes dès le J1.
7. Moyen : les barres de pitié sont déjà citées comme « honnêtes » par 9 fiches.
8. Faible (textes ; chiffres de `tools/simulate.mjs`).
9. Nul.
10. Faible : recalculer si `VARIANT_RATES` ou les tables changent.
11. Vrais joueurs : question de sortie « d'où viennent les Secrètes ? ».

**P1-11. Descente libre renommée et expliquée**
1. « Descendre (sans coffre) » cache « pas de cendres, pas de saison, éclats ×0,5, pas de recrutement ».
2. J047, J051, J071, J073, J076, J077, J079.
3. 7 fiches ; fait vérifié (`game.js:597-599`).
4. « deux descentes libres vides par jour » pendant deux semaines (J077).
5. Libellé « Entraînement · ni coffre, ni cendres, éclats réduits », en style secondaire, avec une ligne d'explication ; garder la Chasse.
6. Plus de séances « pour rien ».
7. Faible à moyen (J077 a réduit son jeu pour ça).
8. Faible (`screens/descent.js`).
9. Nul.
10. Nul.
11. Vrais joueurs : part des descentes libres par compte.

**P1-12. Boosters payants et éclats dormants**
1. La page Boosters montre 3 éléments sur 13 sans défiler ; le souvenir du « Il te manque 500 éclats » du J1 colle ; J063 a fini avec 4 208 éclats sans savoir qu'on achète des boosters.
2. J004, J006, J007, J009, J014, J016, J019, J062, J063, J064, J067.
3. 11 fiches ; mesure : cendres et éclats dormants chez les acheteurs de faction.
4. « il n'a jamais su qu'il pouvait acheter des boosters » (J063, abandon J25).
5. Objectif Accueil « Tu peux ouvrir un booster (400 éclats) » dès que les éclats suffisent et qu'aucun booster n'a été acheté ; sur le booster de faction, « X cartes manquantes dans cette faction » (J003, J017, J020) ; remonter les trois boosters payants au-dessus du pli.
6. L'économie devient visible sans rien vendre de plus.
7. Moyen : les éclats dormants sont une cause de plateau de collection.
8. Faible (`home.js`, `shop.js`, `game.js` objectifs).
9. Nul.
10. Nul.
11. Vrais joueurs : éclats moyens au J14 chez les comptes sans achat.

### P2 — importante, moins urgente ou ciblée

**P2-1. Cauchemar : une bulle et une échelle**
1. Aucune des 29 bulles ne parle du Cauchemar ni du plancher ; +35 % PV / +25 % ATQ + gardiens déchaînés + plancher = mur à l'étage 1 pour une équipe niveau 10.
2. Très investis et roguelite : J041, J048, J053, J073, J074, J079, J092.
3. 7 fiches ; cause d'abandon de J074 et J079 (76 % de défaites).
4. « 5 défaites sur 5 au J22 aux étages 1-3 » (J079).
5. Bulle `cb-nightmare` à la première activation (texte des règles réelles) ; sur la puce : « difficulté équivalente : étage N » ; record Cauchemar affiché au vestibule et dans le résumé ; à étudier séparément : paliers +10/+20/+35 % (équilibrage, fuzz).
6. Le mode difficile cesse d'être un piège.
7. Moyen, ciblé sur les joueurs les plus investis.
8. Faible pour la bulle et l'affichage ; forte pour les paliers (`game.js:824`, mesure).
9. Paliers : record Cauchemar séparé déjà existant ; ne pas mélanger.
10. Faible.
11. Vrais joueurs : taux de défaite des 5 premières expéditions Cauchemar.

**P2-2. Maudite : afficher le risque personnel**
1. « rien si l'équipe tombe » : J048 a perdu 41 expéditions Maudites sur 57 ; désaccord sur la règle (J048, J051 veulent un coffre réduit ; J053, J055 tiennent au risque pur).
2. Roguelite : J042, J048, J051, J053, J055.
3. 5 fiches ; mesure : taux de défaite famille C 0,6, double des autres.
4. « beaucoup de midis pour rien » (J042).
5. Sans changer la règle : sur la puce Maudite, « tu as perdu N de tes 10 dernières maudites » et le pictogramme « coffre +1 / 0 si défaite » ; conserver la confirmation.
6. Le choix reste un choix de risque, mais informé.
7. Faible à moyen.
8. Faible (`screens/descent.js`, compteur dans la sauvegarde : ajout de champ, pas de modification).
9. Nul.
10. Nul.
11. Vrais joueurs : part des Maudites chez les comptes à > 50 % de défaites.

**P2-3. Intermittents : booster gratuit cumulable à 2, offrande qui recule d'un cran**
1. Booster non ouvert perdu, série remise à 1, coffre de la semaine à 5 jours.
2. J005, J012, J039, J054, J057, J070, J085 ; à l'inverse J087 aime la régularité récompensée.
3. 7 fiches pour ; cause d'abandon de J085.
4. « ça me punit de travailler » (J005).
5. Booster gratuit cumulable jusqu'à 2 (`game.js:131-138`) ; série d'offrande qui perd un cran par jour manqué au lieu de repartir à 1 ; coffre de la semaine inchangé.
6. Revenir après deux jours n'est plus puni.
7. Moyen sur les occasionnels (statut « occasionnel » : 19/100).
8. Moyenne (`game.js`, économie ; relancer `sim30.mjs` pour mesurer les cartes/jour).
9. Économie : +1 booster possible par absence ; mesurer.
10. Faible.
11. Simulation : cartes à J30 des profils à 3 jours/semaine ; vrais joueurs : retour après 2 jours d'absence.

**P2-4. Page Équipe : force d'équipe et paliers visibles**
1. Remplacer une niveau 10 par une Secrète niveau 1 fait chuter la run sans avertissement ; les passifs de niveau 3/6 ne se lisent que dans la fiche.
2. J021, J026, J036, J040, J041, J046, J049.
3. 7 fiches ; fait (×1,72 au niveau 10).
4. « ta force d'équipe baisse de 40 % » demandé par J041.
5. Sous l'équipe : « Niveau moyen : 7,2 → étage conseillé : N » qui change en direct ; sous chaque carte, « Niv. 3 : Blindage » déjà présent dans Renforcer, repris ici ; coût total jusqu'au niveau 10 affiché avant d'enrôler une M/S.
6. Composer devient une décision informée.
7. Moyen : évite les effondrements de J046, J049, J041.
8. Moyenne (`screens/army.js`, page déjà dense : 2 070 px, à condenser en même temps).
9. Nul.
10. Faible.
11. Vrais joueurs : nombre de retours en arrière après un changement d'équipe.

**P2-5. Vitesse ×2 visible en combat (décision à revalider)**
1. `ui.fast` existe (`duel-ui.js:52`), le bouton a été retiré en v255 ; un combat ≈ 1,2 min, le record est l'horloge.
2. J023, J025, J042, J044, J055, J070, J083 ; J058 et J066 refusent tout automatisme mais pas une vitesse.
3. 7 fiches ; mesure : combats/jour 27-52 chez les assidus.
4. « le code la contient, pas de bouton » (J055).
5. Un bouton « ×2 » dans la pause ou à côté de « ? », mémorisé dans les réglages ; pas de combat automatique (décision du propriétaire v240 respectée).
6. Les étages connus passent plus vite sans retirer la main du joueur.
7. Moyen sur les séances courtes.
8. Faible (`duel-ui.js`, `settings.js`).
9. Décision passée (v255) : à confirmer avec le propriétaire ; vérifier les QTE (fenêtres non accélérées).
10. Nul.
11. Vrais joueurs : part des combats en ×2 ; durée moyenne d'une torche.

**P2-6. Gardien quotidien : passer la présentation après trois victoires**
1. Les joueurs de 7 minutes voient le Dévoreur à chaque séance (J067 : 25 fois) avec la présentation plein écran et le toucher obligatoire ; J062 veut la garder.
2. J058, J064, J065, J067, J070 ; contre : J062.
3. 5 fiches pour, 1 contre ; cause d'abandon de J058.
4. « une vraie entrée en scène » (J062) contre « l'exaspération quotidienne » (J067).
5. À partir de la 3e victoire contre un gardien, afficher une version courte (nom, mécanique, « Touche pour combattre ») qui se ferme aussi d'elle-même après 2 s ; garder la version longue pour un gardien jamais battu.
6. Respecte les deux camps.
7. Faible à moyen.
8. Faible (`screens/descent.js`, `bossesBeaten` et `kills`).
9. Nul.
10. Nul.
11. Vrais joueurs : temps entre « porte Gardien » et premier coup.

**P2-7. Fiche de carte : Histoire d'abord, ligne « Origine »**
1. L'onglet Combat (495 mots) s'ouvre en premier ; la famille univers vient pour l'Histoire et cherche la source hors du jeu.
2. J061, J062, J064, J084, J087, J088 ; J012, J029, J052, J074 aiment l'onglet Combat.
3. 6 fiches pour, 4 attachées au Combat.
4. « il voulait la légende et il tombe sur six combinaisons » (J084).
5. Mémoriser le dernier onglet ouvert (`localStorage`) ; onglet Combat replié par sections (rôle, paliers, combinaisons) ; ligne « Origine : … » à ajouter aux données quand elle existe (champ nouveau, pas de renumérotation).
6. Chacun ouvre la fiche sur ce qu'il cherche.
7. Faible à moyen (famille F note 6,0, très attachée aux récits).
8. Faible pour l'onglet mémorisé ; moyenne pour « Origine » (500 textes à écrire : contenu, à faire par lots).
9. Nul.
10. Moyen pour « Origine ».
11. Vrais joueurs : onglet le plus ouvert.

**P2-8. Lecture des intentions : déclencher la bulle, annoncer les ordinaires dès l'étage 5**
1. `cb-intent` n'est jamais appelée ; les ennemis ordinaires n'annoncent rien.
2. J009, J018, J022, J027, J028, J032, J047, J092.
3. 8 fiches.
4. « la meilleure du jeu, jamais montrée » (J009).
5. Appeler `cb-intent` au premier élite ; à partir de l'étage 5, afficher « Attaque → cible » sur les ordinaires (hypothèse d'équilibre : plus d'information pour le joueur, à mesurer au fuzz).
6. Ce que le combat promet existe.
7. Moyen chez les stratèges.
8. Faible pour la bulle ; moyenne pour les intentions (`duel-ui.js`, `skills.js:126-145`).
9. Densité de l'écran : intention en pastille, pas en bandeau rouge.
10. Faible.
11. Fuzz : taux de victoire ; vrais joueurs : esquives réussies.

**P2-9. Textes de compétences générés depuis les vraies difficultés**
1. Entrave annoncée 10, réelle 8 ; +3/+6 contre gardien non écrits.
2. J023, J028, J040, J047, J096.
3. 5 fiches ; fait (`skills.js:32-50` vs `duel.js:619-629`).
4. « un moteur honnête dans un habillage qui ment parfois » (J028).
5. Une seule table de DD dans `duel.js`, lue par `skills.js` pour les descriptions ; mentionner « +3 contre un gardien ».
6. Les lecteurs vérifient et trouvent juste.
7. Faible, mais confiance.
8. Moyenne (`skills.js`, `duel.js`, `kits-data.js` généré : relancer `gen-kits.mjs`).
9. `gen-kits.mjs` doit reproduire `kits-data.js` à l'identique hors textes.
10. Faible ensuite.
11. Test Node : description = DD utilisée.

**P2-10. Sceaux : plafond en éclats plutôt qu'en victoires, et bilan**
1. 5 victoires payées par jour, puis « plafonné » ; aucune XP.
2. J028, J031, J035, J078 ; indifférents : J029, J022.
3. 4 fiches ; désaccord interne (J078 veut XP et Butin Mythique ; décision v306 : ne pas toucher aux valeurs).
4. « les parties suivantes ne donnent ni éclats, ni XP » (J031).
5. Plafond quotidien exprimé en éclats (même total), avec un petit gain résiduel (5) au-delà ; 10 XP par partie.
6. Le mode préféré de certains n'est plus gris après 10 minutes.
7. Faible à moyen, ciblé.
8. Faible (`game.js:660-690`).
9. Économie : vérifier le total journalier au sim.
10. Nul.
11. Parties par jour chez les joueurs de Sceaux.

**P2-11. Pseudo et classement : demander le pseudo à la première connexion, afficher le rang**
1. Le texte de l'inscription annonce un pseudo conservé, mais ne le demande pas ; sans pseudo, pas de classement ni de Tirage ; le rang du jour n'apparaît jamais en fin d'expédition.
2. J041, J042, J046, J061, J077, J079, J080, J098, J100.
3. 9 fiches ; fait (`sync.js:134`, `05-tirage.sql:455`).
4. « pseudo annoncé non demandé » (J100) ; « tu es 12e aujourd'hui » demandé par J046.
5. Après la première connexion réussie, une feuille « Choisis ton nom » (facultative, filtre `moderation.js`) ; sur le résumé d'expédition, « Classement du jour : Ne » quand le pseudo existe.
6. Le classement existant devient visible.
7. Moyen : le classement retient J080, J098, J046.
8. Moyenne (`gate.js`/`account.js`, `sync.js`, `screens/descent.js`) ; non testable depuis la session (Supabase bloqué).
9. Ne jamais demander la clé service_role ; respecter les règles de pseudo existantes.
10. Faible.
11. Part des comptes avec pseudo à J1.

**P2-12. Missions irréalisables pour le profil**
1. « Atteins l'étage 4 » proposé à un record 14 ou 18 ; « Ouvre 2 coffres » à qui ne fait qu'une expédition.
2. J044, J068, J093, J095, J099.
3. 5 fiches.
4. « il la réclamait chaque jour sans fierté » (J093).
5. Tirage des missions pondéré par l'historique : étage cible = min(record + 1, 8) ; exclure « Ouvre 2 coffres » si moins de 2 torches utilisées en moyenne.
6. Les missions redeviennent des objectifs.
7. Faible.
8. Moyenne (`config.js:131-143`, `game.js:285-302` : le tirage est commun à tous le même jour, il faudrait un tirage par joueur).
9. Perte du « même tirage pour tous » : à arbitrer.
10. Faible.
11. Part des missions réclamées.

**P2-13. Finitions visibles dans le classeur**
1. Les finitions possédées ne se voient pas dans la grille ; pas de filtre.
2. J004, J010, J018, J043.
3. 4 fiches ; cause partielle d'abandon de J010.
4. « il ne sait même pas qu'il en a 8 » (J010).
5. Reflet discret sur la miniature holo/or/cosmique, filtre « Finitions » avec compteur.
6. Les collectionneurs de finitions voient leur collection.
7. Faible à moyen, ciblé.
8. Faible à moyenne (`collection.js`, CSS).
9. Performance de la grille (500 cartes).
10. Nul.
11. Usage du filtre.

### P3 — exploratoire

**P3-1. Mode invité différé (option, pas évidence)**
1. Sans réseau, impossible d'entrer ; le compte avant toute carte coûte la première impression (G : notes 4 à 6) ; 2 joueurs ont failli partir (J062, J059), 1 abandon le cite (J079).
2. Pour : J030, J045, J059, J062, J079, J090, J091, J092, J097, J100 ; contre ou indifférents : J057, J070, J080, J073, J075.
3. 10 fiches pour, 5 contre ; fait (`gate.js`, friction 1) ; hypothèse de simulation sur l'abandon.
4. « laissez-moi goûter, puis demandez » (J030) ; « normal pour un jeu en ligne » (J080).
5. Décision du propriétaire maintenue. Si elle évolue : un bouton « Jouer hors ligne jusqu'au premier gardien » qui réaffiche l'écran de compte au gardien (le mécanisme `abyssal.nogate` et la fusion de parties locales existent déjà). À minima dès maintenant : message hors réseau plus utile (« Réessaie quand tu as du réseau ; ta partie t'attend »).
6. Évite les départs de la première minute.
7. Potentiellement fort sur la rétention J1 ; invérifiable sans vrais joueurs.
8. Faible (le gate existe) ; risque produit, pas technique.
9. Règle 5.1.1 d'Apple déjà signalée ; fusion locale/en ligne à tester.
10. Faible.
11. Vrais joueurs : taux de création de compte réussie au premier lancement.

**P3-2. Puits cosmétique pour les cendres**
1. Cendres mortes dès que l'équipe est au niveau 10 ; Sublimer ne suffit pas à tous (J078 refuse « ce qui n'est pas tombé »).
2. J043, J052, J072, J082, J087, J071, J080.
3. 7 fiches ; mesure moteur.
4. « donnez-moi quelque chose à regarder » (J043).
5. Dos de cartes et cadres achetables en cendres, cohérents avec le plan d'achats cosmétiques (CLAUDE.md §6) ; aucun gain de puissance.
6. Les cendres redeviennent une monnaie.
7. Moyen à long terme.
8. Moyenne (données, `unlocks.js`, écran).
9. Cohérence avec la future boutique payante : réserver certains cosmétiques.
10. Moyen (assets).
11. Cendres moyennes à J30 des équipes au niveau 10.

**P3-3. Sceaux asynchrones ou duel par code**
1. Première demande d'ajout de l'étude, pas d'adversaire humain.
2. J005, J014, J026, J057, J065, J066, J072, J078, J092, J094, J096, J099.
3. 12 fiches ; cause partielle d'abandon de J014, J096.
4. « un deuxième jeu … contre un robot » (J066).
5. Partie des Sceaux contre la main enregistrée d'un autre joueur (IA en secours), rang hebdomadaire ; ne rien promettre à l'inscription avant.
6. Donne un sens au « monde entier » de l'écran de compte.
7. Potentiellement fort, mais non mesurable sans serveur.
8. Forte (Supabase, SQL, anti-triche).
9. Modération, charge serveur.
10. Fort.
11. Parties contre humains par semaine.

**P3-4. Variation après l'étage 30**
1. Le cycle des gardiens recommence à 30 ; vécu comme déjà-vu par ceux qui y arrivent.
2. J002, J024, J032, J043, J047, J055, J071.
3. 7 fiches (joueurs au-delà de 30 : minorité).
4. « identique en plus gros » (J024).
5. Pas de nouveau gardien par réflexe ; une variante légère par cycle (second serviteur, phase 2 dès le début déjà existante) ou une règle du jour supplémentaire, après avoir corrigé le reste.
6. Le record garde un sens pour les profonds.
7. Faible sur l'ensemble, ciblé.
8. Forte (`bosses.js`, `duel.js`, mesure fuzz).
9. Équilibre.
10. Moyen.
11. Record moyen à J30 des comptes à > 40 min/jour.

**P3-5. Fusionner les écrans de fin d'étage**
1. Victoire → bonus → descendre/remonter : trois écrans par étage.
2. J063, J064, J068, J069, J070.
3. 5 fiches, séances de 3-7 minutes.
4. « un seul écran Continuer / Remonter suffirait » (J063).
5. Bonus et palier sur un même écran quand il n'y a ni talent ni relation ; à maquetter avant.
6. Moins de touchers par étage.
7. Faible à moyen.
8. Moyenne (`screens/descent.js`, risque de densité).
9. Lisibilité ; tester SE.
10. Faible.
11. Touchers par étage (script Playwright de l'étude).

---

## 2. Les 10 modifications à faire en premier

Choix par rapport valeur / effort / risque ; les sept premières sont des textes ou des conditions d'affichage.

1. **P0-3 Lot de relecture (un seul nom par objet).** Prioritaire parce que ≈ 30 fiches le relèvent et que c'est la seule cause d'abandon réparable en une heure (J100, J016). Résout la méfiance des lecteurs. Bénéficiaires : tous les « lit tout ». Test : `grep` interdit dans `tests/`, Playwright sur les étages 1-5. Succès : zéro incohérence relevée par un lecteur attentif en 30 minutes.
2. **P0-1 Palier des étages 1-2 sans faux coffre.** 17 fiches, remontées à vide le J1. Bénéficiaires : débutants et courts. Test : Playwright (texte du palier). Succès : 0 remontée avant l'étage 3 chez les nouveaux comptes.
3. **P0-2 PV de l'équipe avec les tombées.** 16 fiches, vu dès le J1. Test Node sur le calcul. Succès : identique à P0-3.
4. **P0-5 « Pas assez de cendres ? » conditionnel.** Une ligne, et c'est la cause de 30 jours d'équipe niveau 1 pour J060. Bénéficiaires : famille D. Test : Playwright avec 94 cendres. Succès : part des équipes toute niveau 1 à J7.
5. **P1-1 Plancher visible (vestibule + bilan de défaite).** 24 fiches, 5 abandons ; les fonctions existent déjà. Bénéficiaires : B, C, E, G. Test : Node (`expectedLevel`), Playwright, puis vrais joueurs. Succès : question de sortie « pourquoi as-tu perdu ? » répondue correctement ; écart moyenne d'équipe / niveau attendu à J14.
6. **P1-2 Renforcer sur le chemin (objectif J1 + bouton vestibule + bilan).** 16 fiches, 7/15 occasionnels au niveau 1 à J30. Test : Playwright (objectif affiché après les boosters) ; vrais joueurs. Succès : première montée avant J2 pour 80 % des comptes.
7. **P0-6 Annonce de l'ouverture des Sceaux.** 11 fiches, 0 partie en famille D. Test : Playwright après le gardien 5. Succès : première partie dans les 48 h pour la moitié des comptes.
8. **P1-3 Reprise d'expédition dite et comptée.** 16 fiches, 4 abandons de séances courtes ; textes faibles, une condition dans `game.js:1023` à arbitrer. Test : Node (record du jour), Playwright (texte du palier), vrais joueurs. Succès : expéditions reprises le lendemain ; record J14 des comptes < 10 min/jour.
9. **P1-5 Premier combat allégé.** 19 fiches ; conditions dans `duel-ui.js`. Test : Playwright (≤ 1 bulle à l'étage 1) ; vrais joueurs sur la Brisure. Succès : Brisure réussie au premier gardien par la majorité.
10. **P1-4 Sublimer dans la Fournaise + objectif.** 11 fiches, mesure des cendres mortes. Test : Node (`sublimeInfo`), Playwright. Succès : sublimations par compte à J30 > 0 chez les équipes niveau 10.

En réserve immédiate, même coût : P0-4 (icône), P0-7 (sous le pli), P0-8 (44 px), P0-9 (mot de passe), P1-9 (offrande), P1-11 (descente libre), P1-10 (taux).

---

## 3. Ce qu'il ne faut surtout pas changer

- **L'ouverture lente des boosters** (déchirure au doigt, carte qui vibre, écran qui s'assombrit, bandeau Mythique / Secrète, grondement) : point fort le plus cité de l'étude, y compris chez ceux qui abandonnent — 17/20 collectionneurs, 14/15 occasionnels, J081, J082, J087, J093, J095, J097, J099, J100. « Élément à ne surtout pas dégrader » dans ≈ 45 verdicts. Les gros ouvreurs demandent un lot ou « Tout révéler » par défaut (J008, J005, J091) : ajouter une option, jamais retirer le rituel. « Tout révéler » lui-même est aimé des courts (J057, J065, J070).
- **Le recrutement des gardiens (25 %)** : « le vrai gacha, c'est le boss » — J004, J007, J019, J045, J046, J071, J072, J074, J075, J080, J091. Ne pas le réduire pour pousser les boosters.
- **Les gardiens à mécanique, leurs présentations et phases 2** (Dévoreur, Matriarche, Roi sans Visage, Architecte, Éclipse ; déchaînés) : J021, J024, J032, J042, J047, J053, J055 (« le meilleur système de boss sur mobile »), J059, J062, J064, J084, J088, J098.
- **Les Duels des Sceaux tels quels** : total 20 pour toutes les cartes (J018 « juste », J040, J097), 8 rivaux avec leur règle propre et leurs phrases (J026, J031, J083, J086, J089), parties de 1,5 min, Butin choisi (J003, J018, J051). Désaccord assumé : J092 et J096 trouvent le total fixe sans intérêt ; la décision du 15 octobre 2026 tient.
- **Les récits, relations et royaumes** : J005, J008, J009, J011, J017, J030, J051, J052, J064, J081, J088, J090 ; la famille F vit de cela. Leur rythme est critiqué (J088), pas leur existence.
- **La transparence** : barres de pitié, chances de dé affichées en visant, coûts de niveau, « 145 / 400 éclats » — J001, J010, J015, J019, J028, J037, J096, J097, J100.
- **La vue Classeur, les filtres et le compteur « N / 500 »** : J006, J027, J039, J046, J061, J066, J087, J001, J090.
- **La bande-son sans bip et les sons de rareté** : J081, J085 (9 et 10), J089, J090, J063, J064 ; à ne jamais synthétiser de bip, règle du propriétaire.
- **La gratuité sans pression** (J002 : « enfin un jeu qui ne me tend pas la main ») et l'absence d'achats de puissance.
- **« Tout brûler » avec confirmation** (J002, J006, J042, J044, J061, J063, J074), **la parade parfaite et l'anneau du dé** (J024, J025, J035, J058, J095, J096), **la frise d'initiative et le « ! »** (J008, J021, J044, J060), **le bilan de défaite « Ce qui s'est passé »** (J060, J069, J079, J081, J099 — à enrichir, pas à remplacer), **la reprise exacte d'un combat interrompu** (J028, J031, J047, J094).
- **La règle « 3 propositions, un talent »** après élite (J041, J049, J084, J088) et **« Remonter quand on veut avec son coffre »** (J050, J054) : la demande porte sur le texte des étages 1-2, pas sur la règle.

---

## 4. Incertitudes à valider avec de vrais joueurs

### Conclusions solides (code, navigateur, mesure moteur)
- Les incohérences de texte et l'icône 404 existent et apparaissent dès les étages 1-2 (`parcours.md` §12).
- L'écran de palier parle de coffre avant l'étage 3 ; le pourcentage de PV ignore les tombées ; « Pas assez de cendres ? » est inconditionnel ; aucune annonce n'ouvre les Sceaux ; `cb-intent` et `son` ne se déclenchent jamais.
- 33 touchers et une dizaine de fenêtres au minimum avant le premier combat ; 9 touchers par booster ; 12 bulles (≈ 740 mots) en 5 étages.
- Le plancher de difficulté, le niveau attendu par étage et la règle « expédition reprise ≠ record du jour » sont dans le code et nulle part à l'écran.
- Un combat ≈ 1,2 min pour le bot ; sans accélération ni automatisme, le nombre d'étages par séance est borné par le temps (mesure moteur, 100 profils).
- Mythiques et Secrètes viennent surtout des gardiens : 0,56 % et 0,07 % par carte de booster standard (20 000 boosters simulés) contre 25 % par gardien.
- Les cendres s'accumulent sans puits dès que l'équipe est au niveau 10 (mesure : 15 020 en moyenne chez les très investis).
- Sans réseau, un nouveau joueur ne peut pas entrer (`gate.js`).

### Hypothèses de simulation à confirmer
- Que les textes incohérents fassent réellement partir des joueurs (J100, J016) plutôt que de simplement les agacer.
- Que les joueurs humains remontent à vide aux étages 1-2 (le bot ne l'a pas fait ; les fiches le disent).
- L'ampleur du « mur de l'étage 9 le jour 1 » pour un vrai débutant (le bot bat le gardien 5 dès le J1 dans 96 cas sur 100 : un humain fera moins).
- Que les joueurs ne découvrent pas Renforcer seuls : le bot ne cliquait pas, les fiches extrapolent.
- Les taux de victoire aux Sceaux des joueurs « moyens » (29-33 %) : calibrés sur une IA niveau 3, pas sur des humains.
- Les chiffres de rétention (76 non partis, 58 actifs à J30) : écrits par des agents, à ne jamais présenter comme une prévision.
- Les causes d'abandon tardives (déjà-vu après l'étage 25, cycle des gardiens) : minorité de joueurs, ressenti non mesurable.
- L'effet d'un booster gratuit cumulable sur le retour des intermittents.

### Questions qui exigent des humains
- **Son** : bande-son, sons de rareté, retour sonore de la parade et de l'anneau (J085) : rien n'a été écouté.
- **Défense active au doigt** : les fenêtres de 160-320 ms et 32-64 ms viennent du code ; l'automate a toujours réussi ; aucune parade n'a été tentée. Taux réel d'esquive d'un humain en bus, à 23 h, sur iPhone SE et 13.
- **Écran de compte réel** : création, limite d'e-mails Supabase, réseau instable, gestes du mot de passe sur iPhone ; part de joueurs perdus avant la première carte.
- **Rétention J1 et J7** : premier lancement sur un vrai iPhone, avec le toucher « Touche l'écran pour entrer » que Playwright a sauté, le service worker et les deux réouvertures.
- **Gestes** : glisser pour déchirer, glisser la carte, instabilité du paquet animé (Playwright a dû toucher par coordonnées).
- **Lisibilité** de l'écran de combat (14-15 éléments, « T2 », « -4★ », runes) et du Profil (82 éléments) sur un écran de 4,7 pouces.
- **Durée réelle** des bulles lues (le facteur 2-3 est une estimation) et donc du temps jusqu'au premier combat.
- **Préférences opposées** à trancher avec des joueurs réels : bulles longues ou courtes, ouverture lente ou par lot, présentation du gardien à chaque fois ou passée, Maudite « rien » ou coffre réduit, compte avant ou après la première expédition.
