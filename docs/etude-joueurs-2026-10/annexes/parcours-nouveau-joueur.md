# ABYSSAL : parcours observé d'un nouveau joueur (Chromium, taille iPhone 13)

Observé le 16 octobre 2026 sur la version **v327** (Réglages → À propos), servie en local (`python3 -m http.server 8093`). Navigateur : Chromium piloté par Playwright, 390 × 844, deviceScaleFactor 2, mode tactile, langue fr-FR, service worker bloqué. Supabase était injoignable depuis l'environnement.

Scripts, journaux et 129 captures : `/tmp/claude-0/-home-user-Abyssal/70da482a-ba4b-5c1e-8cda-260e06628dfd/scratchpad/etude/parcours/` (captures dans `shots/`, journaux `*.log` et `*.out`).

**Limites de la mesure.** Les touchers sont des clics simulés et le script réagit vite : il attend environ 0,9 s entre deux actions et ne lit pas les textes. Les durées sont donc des **minimums**. Un vrai joueur qui lit les bulles mettra probablement 2 à 3 fois plus longtemps, mais ce facteur est une estimation, pas une mesure. Les défenses actives et les anneaux de dé ont été réussis par un automate placé dans la page, avec un timing parfait. Rien n'a été testé sur un vrai iPhone.

---

## 1. Chronologie

| # | Étape | Ce qui s'affiche | Touchers | Durée mesurée (script) |
|---|---|---|---|---|
| 0 | Lancement | Logo ABYSSAL sur fond noir pendant environ 2,6 s | 0 (voir la note) | 2,6 s |
| 1 | Écran de compte (obligatoire) | Formulaire « Créer un compte » | Bloqué : réseau indisponible | – |
| 2 | Guide d'accueil | Fenêtre de 8 pages | 8 (« Suivant » ×7, puis « C'est parti ! ») ou 1 (« Passer ») | environ 6 s en enchaînant |
| 3 | Accueil | Bandeau « Tes 2 boosters de bienvenue t'attendent » | 1 | – |
| 4 | Page Boosters | Bulle « Les boosters » (73 mots) | 1 (J'ai compris) | – |
| 5 | Booster de bienvenue 1 | Paquet → déchirure → 3 cartes retournées une à une → récapitulatif | 9 (Ouvrir, déchirer, 3 × [retourner + suivante], Fermer) | environ 24 s |
| 6 | Booster de bienvenue 2 | Même déroulé | 9 | environ 22 s |
| 7 | (facultatif) Booster gratuit du jour | « Tout révéler » mène directement au récapitulatif | 3 | environ 4 s |
| 8 | Équipe | Formée **automatiquement** dès l'ouverture des boosters | 0 | – |
| 9 | Aventure → première porte | Onglet Aventure, « Descendre », bulle « La Descente », porte « Combat », bulle « Le combat » | 5 | – |
| 10 | Combat de l'étage 1 (guidé) | Main dorée sur 3 attaques, puis 3 bulles | 13 (dont 6 guidés par la main) | 2 tours, 29 s |
| 11 | Étages 2, 3 et 4 | Récompense, bonus, choix descendre ou remonter, portes, combat | Combats : 20, 23 et 41 touchers | 4, 4 et 7 tours ; 49, 55 et 88 s |
| 12 | Remonter à l'étage 4 | Confirmation, puis résumé de l'expédition | 2 | – |
| 13 | Ouvrir le coffre de bois | Boosters → Coffres → bulle → coffre → toucher le coffre → Continuer | 6 | environ 6 s |
| 14 | (copie de la partie) Étage 5, gardien | Présentation du Dévoreur, 2 bulles, combat, talent | environ 37 touchers de combat | environ 300 s, coupure comprise |

Bilan pour les 4 premiers étages : 4 combats, 97 touchers en combat, 19 touchers hors combat, environ **268 s de jeu scripté**.

Bilan du lancement au premier combat : 8 (guide) + 2 + 9 + 9 + 5 = **33 touchers** au minimum (24 si l'on touche « Passer » dans le guide).

> **Note sur l'écran d'ouverture.** Dans Chromium piloté par Playwright, `navigator.userActivation.hasBeenActive` vaut déjà `true`. Le message « Touche l'écran pour entrer » n'est donc **jamais apparu** et l'écran suivant s'est ouvert seul vers 3,9 s. Sur iPhone, un toucher de plus est attendu ; il n'a pas été observé.

---

## 2. Écran de compte (`js/ui/gate.js`)

Captures : `shots/02-gate.png`, `04` à `10`.

- **Logo** ABYSSAL, puis ce texte d'introduction (99 mots en tout sur l'écran) : « Crée ton compte pour entrer dans l'Abysse. Ta collection est sauvegardée en ligne : tu la retrouves sur n'importe quel appareil, et tu peux affronter les joueurs du monde entier. »
- **Onglets** « Se connecter » et « Créer un compte » (165 × 38 px). L'onglet « Créer un compte » est sélectionné par défaut.
- **Champs** : E-mail et Mot de passe, sans champ de pseudo. Le mot de passe a pour exemple de saisie « 8 caractères, Aa1 et symbole ».
- **Règle affichée** : « 8 caractères au moins, avec une majuscule, une minuscule, un chiffre et un symbole (! ? # …). »
- **Bouton** « CRÉER MON COMPTE » (324 × 46 px).
- **Mentions** : « En créant un compte, tu acceptes la politique de confidentialité. Il faut avoir 13 ans ou plus. » puis « Données conservées : ton e-mail, ton pseudo et ta sauvegarde de jeu. Rien d'autre. Tu peux supprimer ton compte à tout moment. »
- Tout tient sur un écran, sans défilement. Aucune zone tactile ne fait moins de 32 px.

Ce qui se passe quand on essaie :
- **Mot de passe de 3 caractères** : c'est l'infobulle native du navigateur qui répond, en anglais dans ce Chromium : « Please lengthen this text to 8 characters or more (you are currently using 3 characters). » Aucun message du jeu.
- **« abcdefgh »** : une annonce rouge du jeu apparaît : « Mot de passe trop faible : 8 caractères au moins, avec une majuscule, une minuscule, un chiffre et un symbole (! ? # …). »
- **Mot de passe valide (Abyssal!2026)** : une annonce rouge apparaît : « **Pas de connexion au serveur. Vérifie ton réseau.** » L'écran de compte reste affiché ; aucune autre issue n'est proposée.
- **Onglet « Se connecter »** : boutons « SE CONNECTER » et « MOT DE PASSE OUBLIÉ ? ».
- **Mot de passe oublié** : texte « Tu recevras un e-mail avec un lien : il te ramène au jeu pour choisir un nouveau mot de passe. » et boutons « ENVOYER LE LIEN » et « RETOUR ». L'envoi donne la même annonce « Pas de connexion au serveur. Vérifie ton réseau. »
- **Contournements tentés** : la touche Échap et un lien direct vers `#/boutique` n'enlèvent pas l'écran ; l'adresse est remise sur `#/`.

**Conséquence observée : sans réseau, un nouveau joueur ne peut pas entrer dans le jeu du tout.** Pour la suite, l'écran a été contourné avec `abyssal.nogate`.

---

## 3. Guide d'accueil

8 pages, 217 mots en tout. Chacune a une illustration, des points de progression, et les boutons « Passer » ou « Retour » plus « Suivant ».

1. **Bienvenue dans l'Abysse** (28 mots) : « Le Bestiaire interdit a été déchiré. Ses créatures se cachent dans des boosters scellés… »
2. **Ouvre des boosters** (32) : « Le gros bouton du milieu. Déchire le paquet du doigt, puis retourne les cartes. Un booster gratuit t'attend chaque jour… holographique, feuille d'or ou cosmique. »
3. **Ta collection** (19) : « L'onglet Collection a quatre pages, en haut : Cartes, Équipe (tes 5 combattants), Renforcer et Fournaise. »
4. **Cendres et niveaux** (27) : Fournaise → cendres ; Renforcer → niveaux.
5. **La Descente** (30) : « 3 créatures au combat, 2 en réserve. Un gardien tous les 5 étages. Remonte quand tu veux pour garder ton coffre. »
6. **Une autre aventure** (18) : « Toujours dans Aventure : les Duels des Sceaux… » La page **ne dit pas** que ce mode est verrouillé jusqu'au premier gardien.
7. **Coffres et Tirage des Ombres** (35) : parle du classement de la semaine et des 3 premiers. Le Tirage demande d'être en ligne.
8. **Reviens chaque jour** (28) : offrande, missions, coffres ; le Sanctuaire.

La fenêtre recouvre l'Accueil. Les écrans décrits (Fournaise, Renforcer, Tirage, Sceaux) n'ont alors jamais été vus.

---

## 4. Accueil d'un nouveau joueur (`shots/22-accueil.png`)

- **En-tête** : avatar, niveau 1, et le titre « **Novice des Sceaux** » à la place du nom. Compteurs : 0 éclat, 60 cendres.
- **Contenu, de haut en bas** : logo ; bandeau « Tes 2 boosters de bienvenue t'attendent » ; événement de la semaine « L'Aube sauvage » ; bloc « Aujourd'hui » (offrande du jour +50, coffre de la semaine 1/5, trois missions : « Obtiens 3 cartes Céleste », « Atteins l'étage 4 de la Descente », « Obtiens 2 cartes Rares ou mieux ») ; « 0 / 500 créatures découvertes » ; pastille « Hors ligne ».
- 109 mots, page de 1 239 px de haut, 12 éléments interactifs.
- **Barre du bas** : badge « 3 » sur Boosters (2 tickets et le booster gratuit), points rouges sur Accueil et Aventure.

**Après les boosters**, le bandeau de bienvenue disparaît. « TON PROCHAIN OBJECTIF : Lance ta première expédition · un coffre t'attend dès l'étage 3 » apparaît, ainsi que « Ensuite » (« Vaincs Le Dévoreur », « Complète le royaume Abyssal 2 / 71 »).

**Après la première expédition**, l'objectif devient « Atteins l'étage 5 ». La mission « Atteins l'étage 4 » affiche un bouton « +40 », qu'il faut toucher sur l'Accueil.

**À la fin de la séance**, l'offrande du jour (+50) n'avait toujours pas été récupérée. Le jeu ne l'a jamais proposée en dehors du point rouge et de la ligne sur l'Accueil.

---

## 5. Boosters de bienvenue

- **Page Boosters** : 131 mots, page de 1 655 px, 13 éléments interactifs dont seulement 3 visibles sans défiler. La bulle « Les boosters » (73 mots) apparaît d'abord. Elle parle de **sublimer**, une notion que le joueur n'a pas encore rencontrée.
- **Bouton** « OUVRIR · TICKET (2) ». En dessous, le booster de faction (500) et le booster événement (550) sont désactivés, avec « Il te manque 500 éclats » et « Il te manque 550 éclats ».
- **Paquet** (`shots/32-op1-paquet.png`) : aide « Glisse le doigt le long de la ligne pour déchirer, ou touche le booster. » Bouton « Tout révéler » en haut à droite. Le paquet est animé en continu : Playwright l'a jugé « instable » et le clic normal a échoué ; il a fallu toucher par coordonnées.
- **Chaque carte** : un toucher pour la retourner, un autre pour passer à la suivante. Aide affichée : « Glisse la carte sur le côté, ou touche-la pour la suivante. »
- **Sous chaque carte**, par exemple : « Peu commune · Nouvelle entrée au Bestiaire · Infernal : 1 / 72 · Elle peut rejoindre ton équipe · Attaquant ».
- **Incohérence possible** : la carte Hannya porte « INF-072 · 72/72 » alors que la ligne en dessous indique « Infernal : 1 / 72 ».
- **Récapitulatif** : « 3 NOUVELLES CRÉATURES », les 3 cartes marquées « Nouvelle recrue », « +6 éclats · +70 XP », boutons « FERMER » et « ENCORE UN · TICKET (1) ».
- **Annonces pendant l'ouverture** :
  - « Succès débloqué : Premier sceau brisé » (booster 1) ;
  - « Le premier sceau » (booster 2), deux noms presque identiques ;
  - « Reflet changeant » quand une carte cosmique sort ;
  - « Niveau 2 atteint ! 20 éclats » (booster gratuit).
- **Recouvrement** : l'annonce de succès recouvre le titre du récapitulatif (`shots/35-op2-resume.png`).
- **Résultat observé** : 8 cartes, toutes Communes ou Peu communes, dont une Peu commune **cosmique** (Récif Vivant) et un doublon (Hibou Mécanique). Le booster gratuit propose un bouton « Brûler +5 ».

---

## 6. Équipe

- **Formée automatiquement** dès le premier booster : Hannya, Gardienne du Seuil d'Or, Draugr au combat ; Récif Vivant et Le Murmure du Néant en réserve ; budget 9/15. Le joueur n'a **rien eu à faire** et rien ne l'en a prévenu.
- **Page Équipe** (`shots/42-equipe.png`) : 295 mots, 35 éléments interactifs, page de 2 070 px.
  - Contenu : budget et coûts par rareté, « SUGGÉRER UNE ÉQUIPE », « VIDER », une consigne d'emploi, « Mes équipes / Enregistrer », 5 cartes avec ▲▼ et ✕, les synergies, le pouvoir « Sceau du Serment », puis toute la collection avec « + Ajouter ».
  - Bulle « Compose ton équipe » (61 mots) : elle dit « un **coût** (en haut à droite) ». Sur les cartes, le coin en haut à droite montre l'emblème de faction ; le coût (« 2 ») est dans un disque doré **à sa gauche**. Elle annonce aussi une « capacité (icône en haut à gauche) ».
  - La bulle recouvre les cartes qu'elle décrit.
  - Boutons ▼ et ✕ de **34 × 30 px**, sous le minimum de 44 px conseillé par Apple.

Ce que le joueur doit comprendre, d'après les textes : 3 au combat et 2 en réserve, budget de 15, coût par rareté, rôle, attaque et PV, niveau, synergies et pouvoir d'équipe.

---

## 7. Première Descente et écran de combat

**Accueil de l'Aventure** (`shots/50-aventure.png`) : 77 mots, 8 éléments interactifs. On y voit :
- « Ta première descente t'attend · 3 expéditions avec coffre aujourd'hui » ;
- la bande d'équipe et « Pouvoir : Sceau du Serment · budget 9 / 15 » ;
- « MODIFIER L'ÉQUIPE », « DESCENDRE » ;
- les puces « Maudite » (coffre +1, rien si l'équipe tombe) et « Cauchemar » (dès l'étage 20, avec cadenas) ;
- « Règle du jour : Ruée vers les éclats » ;
- les tuiles Saison, Classement (« Connecte-toi… ») et « Comment ça marche » (6 étapes, 180 mots).

Après « Descendre » : bulle « La Descente » (70 mots). L'étage 1 propose **une seule porte**, « Combat ». La bulle « Le combat » (74 mots) apparaît **avant** l'écran de combat.

### Écran de combat (`shots/d-c1-e1-guide-1.png`)

- **En haut** : « Étage 1 », boutons « ? » et pause (36 × 36 px).
- **Frise d'initiative** de 6 portraits, avec un marqueur « T2 ».
- **Ennemis** : Chérubin 2/13 et Lectrice Aveugle 3/9, avec un aperçu de dégâts « -4 ».
- **Message central** : « C'est au tour d'Hannya : « Griffe ardente » attaque et rapporte 1 PA ».
- **Panneau d'actions** de la créature active : nom, rôle, « · SON TOUR », 3 losanges de PA sur 6, et **4 tuiles** de 79 × 75 px (Griffe ardente +1 PA, Coup d'estoc ◆◆ D20, Défense +1 PA, Permuter « libre »).
- **Mes 3 cartes**, une pastille « Voir la réserve » (56 × 32, et 38 × 32 aux étages 3 et 4), la barre Ferveur et pouvoir (« Sceau du Serment 2/6 »), le bouton « PASSER ».
- En tout : **14 à 15 éléments interactifs**, aucun débordement de texte.
- Le **nom de l'attaque change selon la créature** (Griffe ardente, Étreinte funèbre, Lame céleste, Lame de fond). La bulle « Le combat » dit pourtant « choisis **Attaque** ».

### Premier combat guidé

Mesures : 2 tours, 13 touchers, 29 s.
- La **main dorée** guide 3 fois (6 touchers). Elle montre « « Griffe ardente » attaque et rapporte 1 PA », puis « Touche un ennemi pour l'attaquer », et ainsi de suite pour Draugr puis pour la Gardienne. Elle est posée en partie sur le nom et le rôle de la créature.
- **Pendant le guidage**, au 2e passage de la main, la bulle **« Marque, Brèche et enchaînement »** (65 mots) s'ouvre.
- Puis la bulle **« Le pouvoir d'équipe »** (75 mots) apparaît, car la Ferveur commence à 2/6 et se remplit au tour 1. Elle dit : « Sans Mythique ni Secrète dans l'équipe, c'est le **Sceau du Gardien** ». Le bouton affiche « **Sceau du Serment** ».
- **Fenêtre du pouvoir** : « coûte toute la Ferveur (6)… Chacune de tes créatures au combat récupère 30 % de ses PV et reçoit un bouclier… LANCER LE POUVOIR ». Annonce qui suit : « Sceau du Serment : +4 PV rendus · boucliers ». Aux étages 3 et 4 : +2 et +3 PV.
- Bulle **« Les dés »** (59 mots), puis l'anneau du Coup d'estoc. Le script l'a réussi parfaitement (« PARFAIT ! +3 »).
- **Image manquante** : `assets/icons/cb-breche.webp` (erreur 404, 3 fois). Elle est utilisée pour la bulle d'effet `cb-cpop` de la Brèche.

**Fin du combat** : écran « Victoire · Étage 1 franchi », +2 éclats, +3 cendres, et ces lignes :
- « Ta toute première victoire ! L'Abysse t'offre +50 éclats. »
- « Fait marquant : 2 enchaînements et 1 coup de grâce. »
- « Relation découverte : La Guerre d'en haut, La lumière qui délivre. »
- « Nouvelles rencontres ».

Puis « Choisis ton bonus » (Source sacrée / Trésor oublié), sous le pli à l'étage 1.

### Défense active (QTE)

Elle s'est déclenchée pour la première fois à l'**étage 3**, sur un « SORT DE GEL ! », précédée de la bulle « Défense active » (57 mots). Libellé de la barre : « Zone dorée : esquive · trait blanc, au dernier instant : parade ».

Mesures : la zone dorée couvre **27 à 34 %** de la barre. Le curseur démarre de façon aléatoire 0,3 à 0,75 s après l'apparition, puis traverse la barre en 0,9 s en accélérant. Le script a touché à chaque fois entre 1,2 et 1,35 s après l'apparition : **5 esquives sur 5** (étages 3 et 5). Aucune parade n'a été tentée.

### Bulles d'aide rencontrées

Nombre de mots entre parenthèses.

| Moment | Bulles |
|---|---|
| Avant la 1re porte | La Descente (70), Le combat (74) |
| Combat de l'étage 1 | Marque, Brèche et enchaînement (65), Le pouvoir d'équipe (75), Les dés (59) |
| Avant l'étage 2 | Compétences et Ferveur (59) |
| Avant l'étage 3 | Objectif bonus (46) |
| Combat de l'étage 3 | Défense active (57) |
| Avant l'étage 4 | Ennemis à mécanique (64) |
| Avant le gardien | Fêlure et Brisure (65), Les runes du gardien (58) |
| Après le gardien | Don de l'Abîme : les talents (49) |

Total : **12 bulles, environ 740 mots**, en 5 étages. S'y ajoutent hors combat : Boosters (73), Collection (49), Compose ton équipe (61), Renforcer (31), Fournaise (50), Coffres (67), Tirage (57).

Réglages → Tutoriels en recense 29, plus le guide de départ.

### Étages suivants

- **Étages 2 à 4** : on choisit entre « Combat » et « Élite (éclats doublés et 3 bonus) ». Le script a toujours pris « Combat ».
- **Étage 2** : **Draugr est tombé**, définitivement pour l'expédition (0/13). Les écrans suivants affichaient pourtant « **Ton équipe · 100 % des PV** ».
- **Étage 2** : texte « Morvenn la Maudite est **tombé** » (accord au masculin).
- **Objectifs bonus réussis** : « Sans perte » (étage 3) et « Brasier » (étage 4).
- **Écran « descendre ou remonter »** (`shots/d-choix-remonter-e1.png`) aux étages 1 et 2, alors qu'il n'y a pas encore de coffre :
  - à gauche : « Pas encore de coffre : il arrive dès l'étage 3 » ;
  - à droite : « Même coffre » et « Si l'équipe tombe : coffre d'une qualité en dessous » ;
  - sur le bouton : « Remonter **avec le coffre** · Tu gardes le coffre et tes éclats ».
  - La confirmation dit aussi « Remonter maintenant avec ton coffre ? ».
- **Résumé de l'expédition** (`shots/d-resume-expedition.png`) :
  - « Retour à la surface », « Nouveau record ! … étage 4 » ;
  - statistiques : Plus gros coup 10, Ennemis vaincus 10, Synergies 9, Frappes parfaites 12 ;
  - « Hannya a achevé 7 ennemis », « Prochain palier : coffre de fer dès l'étage 8 », « 145 / 400 éclats pour ton prochain booster » ;
  - le bouton « **OUVRIR MON COFFRE** » est **sous le pli** : aucun bouton du résumé n'est visible sans défiler.
  - L'en-tête « Ton record : étage 4 · aujourd'hui : 4 » se coupe en laissant « : 4 » seul à la ligne.

### Gardien (étage 5, sur une copie de la partie)

- **Présentation** plein écran (`shots/g-presentation-e5.png`) : « Le Dévoreur · La faim qui ne dort jamais », sa mécanique (Dévorer), « À mi-vie : ENGLOUTIR » avec une illustration, et « Touche pour combattre ».
- **Dans le combat**, la carte du gardien s'appelle « **Hydre de Lerne** » ; le nom « Le Dévoreur » n'y apparaît pas. Pastilles « Brasier » et runes « −30 % ».
- **À mi-vie**, une fenêtre « ENGLOUTIR… Touche pour continuer » bloque le combat jusqu'au toucher. Mon automate ne la gérait pas au départ : le combat a été coupé puis **repris après fermeture du navigateur**, et la reprise a bien retrouvé l'état du combat.
- **Victoire** (combat repris, 6 tours) : « Gardien vaincu », coffre de bois, « Interruptions réussies : 0 · festins du Dévoreur : 0 », « Nouveau récit dans le Bestiaire ».
- **Choix du talent** : 3 talents (Élan, Brise-garde, Ténacité), tous **sous le pli** (0 sur 3 visibles sans défiler).
- **Annonces** : seulement « Succès débloqué : Premier gardien ». **Aucune annonce** ne dit que les Duels des Sceaux sont désormais ouverts. Le palier de saison de l'étage 5 apparaît comme réclamé dans l'état de la partie (`claimed: [5]`), mais aucune annonce n'a été captée.

---

## 8. Coffre

Parcours (aucun raccourci depuis le résumé après rechargement) : Boosters → Coffres. Bulle « Les coffres » (67 mots).
- Les 4 coffres sont affichés, dont 3 désactivés.
- On touche « Coffre de bois », puis le coffre : message « Touche le coffre pour l'ouvrir », puis « Le sceau cède… ».
- Résultat : « +50 éclats et +20 cendres ! · 195 / 400 éclats pour ton prochain booster », bouton CONTINUER.
- **6 touchers**.

Ensuite, Renforcer affichait 94 cendres et des niveaux à 15 cendres, avec en bas « **Pas assez de cendres ?** Brûle tes doublons… », alors que tous les niveaux proposés étaient abordables. Le jeu n'a jamais orienté le joueur vers Renforcer pendant les 5 étages.

---

## 9. Tour des onglets

Partie de nouveau joueur, après les boosters.

| Page | Au premier coup d'œil | Mots | Interactifs (visibles sans défiler) | Remarques |
|---|---|---|---|---|
| Collection › Cartes | Bandeau 8/500, Grille/Classeur, recherche, filtres Toutes/**Possédées**/Manquantes/Nouvelles/★, « Filtres et tri », grille | 70 | 40 (31) | Bulle 49 mots ; le filtre « Possédées » est actif par défaut |
| Équipe | Voir la section 6 | 295 | 35 (14) | ▼ ✕ en 34 × 30 px |
| Renforcer | 60 cendres, liste des 5 créatures, « NIV. 2 · 15 · +1 ATQ » | 117 | 13 (10) | « Niv. 3 : Blindage, Sentinelle… » sans explication |
| Fournaise | « TOUT BRÛLER (1) · +5 », doublon Hibou, « Avancé : brûler une autre carte » | 46 | 11 (3) | Bulle 50 mots |
| Boosters | 3 boosters, puis « Prochain booster gratuit dans 18 h 18 » | 136 | 13 (2) | Standard à 400, faction à 500, événement à 550 : tous désactivés avec 68 éclats |
| Coffres | 4 coffres désactivés, « D'où viennent les coffres ? » | 52 | 4 (4) | Bulle 67 mots |
| Tirage | Prix de la semaine, règles, « Le Tirage se joue en ligne : connecte-toi » | 91 | 2 | Bulle 57 mots qui explique un mode inaccessible ici (hors ligne) |
| Descente | Voir la section 7 | 77 | 8 (5) | – |
| Sceaux | « Encore scellés · Vaincs ton premier gardien dans la Descente (étage 5) pour ouvrir les Duels des Sceaux. » et « ALLER À LA DESCENTE » | 35 | 1 | Verrouillé, message clair |
| Sanctuaire | 5 entrées : Profil, Succès (3/35), Bestiaire, Compte, Réglages | 40 | 5 | – |
| Profil | Nom « Novice des Sceaux », vitrine, statistiques, titres et cadres | 69 | **82** (9) | Environ 70 puces et cadres verrouillés dans la page ; « Personnaliser » en 114 × 30 et « Ton nom » en 122 × 25 |
| Succès | « Les plus proches » (5), « Les 27 autres succès » | 94 | 2 | – |
| Bestiaire | 4 onglets, 7 royaumes, recherche, 2 entrées sur 71, « 69 pages encore scellées » | 85 | 14 | – |
| Compte | Même formulaire que l'écran de compte (onglet Se connecter) | 56 | 6 | – |
| Réglages › Jeu | Son, musique, écoute des 6 ambiances, mode silencieux, vibrations, animations, défense Manuelle/Automatique, décor, ouverture rapide | 186 | 24 (15) | Page de 1 585 px |
| Réglages › Tutoriels | 29 bulles, chacune marquée « Déjà vu » ou « Pas encore rencontré » | 223 | – | – |
| Réglages › Sauvegarde | « Ta progression est enregistrée uniquement sur cet appareil… » | 56 | – | – |

**Fiche de carte** (toucher une carte dans Collection) : en-tête, 4 finitions, puis Favori et Brûler (73 × 28 et 74 × 28 px), et 4 onglets (Combat, Défis, Histoire, Rareté). L'onglet Combat compte **495 mots** : rôle, Coup d'estoc, trait, 5 paliers de niveau, forces et faiblesses, 6 combinaisons.

---

## 10. Duels des Sceaux

**Nouveau joueur** : verrouillés (voir le tableau). Le guide d'accueil (page 6) les présente sans le préciser, et le titre par défaut du joueur est « Novice des Sceaux ».

**Après le gardien** : la page s'ouvre avec la bulle « Duels des Sceaux » (63 mots). On y trouve un défi du jour, Ilda (1 étoile), 7 adversaires verrouillés, « Ta main » et « Comment ça marche ». La bulle dit « Une fois par jour, une victoire te laisse garder une carte adverse : **le trophée** » ; l'écran et le résultat disent « **Butin** ».

**Partie avancée** (sauvegarde de démonstration, bulles des Sceaux remises à zéro) :
- plateau de 9 cases (99 × 134 px) et 5 cartes en main (66 × 93 px) ;
- deux bulles à la suite : « Le plateau des Sceaux » (59 mots), puis « Les pouvoirs de rareté » (46 mots).
- Mon script n'a pas su jouer la partie jusqu'au bout.

---

## 11. Erreurs techniques relevées

- **Aucune erreur JavaScript de page** (`pageerror`) pendant tout le parcours.
- **Une image manquante** : `assets/icons/cb-breche.webp` (404). Elle est construite par `duel-ui.js` ligne 346 (`assets/icons/cb-${key}.webp`) ; seules cb-bastion, cb-chain, cb-chasse et cb-glace existent.
- **Erreurs réseau attendues** : WebSocket et requêtes Supabase en échec (proxy). L'Accueil affiche « Hors ligne » ou « Connexion… ».
- **Aucun débordement horizontal ni texte coupé** sur les pages visitées. Les seuls « textes coupés » détectés sont des libellés réservés aux lecteurs d'écran.
- **Zones tactiles de moins de 32 px** : ▼ et ✕ de l'Équipe (34 × 30), Favori et Brûler de la fiche (28 px de haut), « Ton nom » (25 px de haut), « Personnaliser » (30 px), « Voir la réserve » en combat (38 × 32). Les boutons « ? » et pause du combat font 36 × 36.
- **Élément qui n'a pas réagi au clic normal** : le paquet de booster animé (« élément instable » pour Playwright). Un toucher par coordonnées l'a ouvert.

---

## 12. Frictions observées (faits)

1. Le compte est obligatoire : **sans réseau, impossible d'entrer**. Le seul retour est « Pas de connexion au serveur. Vérifie ton réseau. »
2. Un mot de passe trop court déclenche l'infobulle native du navigateur (en anglais dans ce Chromium), pas un message du jeu.
3. Il faut **au moins 33 touchers** et 10 fenêtres ou bulles entre le lancement et le premier combat, sans compter l'écran de compte.
4. Un booster de 3 cartes demande **9 touchers** ; « Tout révéler » le ramène à 3.
5. L'équipe se forme toute seule sans message ; la bulle d'équipe explique pourtant comment la composer (budget, coût, capacité).
6. La bulle d'équipe situe le coût « en haut à droite » ; sur la carte, ce coin porte l'emblème de faction et le coût est à côté.
7. Le premier combat guidé fait apparaître 3 bulles avancées en 2 tours : Marque et Brèche, pouvoir d'équipe, dés.
8. Bulle « pouvoir d'équipe » : « Sceau du **Gardien** » ; bouton : « Sceau du **Serment** ».
9. La bulle « Le combat » dit « choisis Attaque » ; le bouton porte un nom propre à chaque créature (Griffe ardente…).
10. Aux étages 1 et 2, l'écran affiche « Remonter avec le coffre / Tu gardes le coffre », « Même coffre » et « coffre d'une qualité en dessous » alors qu'il n'y a pas encore de coffre.
11. « Ton équipe · 100 % des PV » s'affiche alors qu'une créature est tombée (Draugr 0/13).
12. « Morvenn la Maudite est tombé » (accord).
13. Plusieurs boutons sont sous le pli : « Ouvrir mon coffre » sur le résumé de l'expédition, les 3 talents après le gardien, le bonus de l'étage 1.
14. Gardien : présenté comme « Le Dévoreur », sa carte s'appelle « Hydre de Lerne ».
15. Aucune annonce n'indique que les Sceaux s'ouvrent après le gardien ; seul « Succès débloqué : Premier gardien » apparaît.
16. Bulle des Sceaux : « le trophée » ; écran : « Butin ».
17. Deux succès aux noms presque identiques dès les deux premiers boosters : « Premier sceau brisé » et « Le premier sceau ».
18. L'annonce de succès recouvre le titre du récapitulatif du booster.
19. Renforcer affiche « Pas assez de cendres ? » avec 94 cendres, alors que les niveaux coûtent 10 à 15 cendres. Le joueur n'est jamais orienté vers Renforcer pendant les 5 premiers étages.
20. L'offrande du jour (+50) et la mission terminée (+40) ne se récupèrent qu'en touchant sur l'Accueil ; à la fin de la séance, elles étaient toujours en attente.
21. La bulle « Le Tirage des Ombres » s'affiche même quand le Tirage est inaccessible (hors ligne).
22. Le guide présente les Sceaux sans dire qu'ils sont verrouillés.
23. L'icône `cb-breche.webp` est manquante (404).
24. Plusieurs boutons font moins de 32 px de haut (Équipe ▼ ✕, Favori, Brûler, Ton nom, Personnaliser, Voir la réserve).
25. Densité : 82 éléments interactifs dans Profil ; 495 mots dans l'onglet Combat de la fiche de carte ; environ 740 mots de bulles en 5 étages, plus 217 mots de guide.

## 13. Hypothèses (interprétations, non mesurées)

- Le compte obligatoire avant toute découverte, combiné à la limite d'e-mails de Supabase, risque de faire partir des joueurs dès la première minute, surtout avec un réseau instable (métro, avion).
- Un nouveau joueur ne retiendra sans doute pas les notions présentées dans le premier combat (Marque, Brèche, Ferveur, PA, dés, pouvoir) : elles arrivent en 2 tours, alors que la main dorée suffit à gagner.
- La formation automatique de l'équipe est confortable, mais le joueur ne sait peut-être pas qu'il a une équipe ni pourquoi celle-là.
- L'écran « remonter avec le coffre » aux étages 1 et 2 peut pousser à remonter trop tôt sans rien gagner.
- La défense active laisse une fenêtre d'environ 0,2 à 0,3 s (calcul tiré du code, non mesuré sur un humain), avec un démarrage aléatoire. Elle risque d'être frustrante au doigt, surtout sur un « Sort de gel » sans annonce préalable.
- Les nombreux nombres (PA, Ferveur 2/6, aperçus de dégâts « -4★ », runes « −30 % », « T2 ») rendent l'écran de combat dense pour un débutant.
- Le titre « Novice des Sceaux » donné à un joueur qui n'a pas accès aux Sceaux peut prêter à confusion.

## 14. Ce que je n'ai pas pu observer

- **Création de compte réelle**, connexion, synchronisation, classements, Tirage des Ombres et nombre de joueurs en ligne : Supabase était inaccessible.
- **L'écran « Touche l'écran pour entrer »**, sauté à cause de l'activation utilisateur de Playwright.
- **Sons, musique, vibrations**, rendu Safari et iOS réel, vrais gestes du doigt (glisser pour déchirer, glisser la carte) : seuls des clics ont été simulés.
- **La difficulté réelle pour un humain** des défenses actives et des dés : l'automate a toujours réussi, et aucune parade n'a été tentée.
- **Défaite, élite, autel et bénédiction, pacte, Assaut conjoint, phase 2 jouée en continu** : le combat du gardien a été interrompu puis repris, et la bulle « La phase 2 des gardiens » n'a pas été vue.
- **Une partie complète des Duels des Sceaux** : le script s'est arrêté avant la fin.
- **Les mises à jour par service worker**, bloqué volontairement.
- **D'autres tailles d'écran**, comme l'iPhone SE.
