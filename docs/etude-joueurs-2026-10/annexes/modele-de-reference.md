# ABYSSAL — Le Bestiaire interdit : modèle de référence factuel

Document de référence pour des agents qui simulent des joueurs sans lire le code. Tout ce qui suit a été lu dans le dépôt `/home/user/Abyssal` (version du code : **v327**, `js/config.js:4`). Les citations `fichier:ligne` renvoient à ce dépôt. « non trouvé » = chiffre absent du code. Aucune affirmation n'a été testée sur un vrai téléphone.

Conventions : **éclats** = monnaie principale (cristal) ; **cendres** = monnaie secondaire (Fournaise, niveaux). Les jours sont en heure locale de l'appareil (`js/core/save.js:6-9`), sauf le Tirage des Ombres (heure de Paris, `js/screens/shadow.js:16`).

---

## 1. Premier lancement, pas à pas

### 1.1 Écran d'ouverture
- Logo « ABYSSAL — Le Bestiaire interdit » plein écran avec une lueur animée sur l'œil (`index.html:33-35`).
- Durée minimale de l'intro : 2,6 s (0,3 s si l'appareil demande moins d'animations) (`index.html:39`).
- Puis le texte « Touche l'écran pour entrer » s'affiche ; le jeu attend un toucher (ce toucher débloque le son sur iPhone) (`js/main.js:296-304`). Si l'utilisateur a déjà touché l'écran, l'entrée est immédiate (`js/main.js:299`).
- En cas d'échec de chargement : « Impossible d'ouvrir le Bestiaire : … Vérifie ta connexion puis recharge la page. » (`js/main.js:316`).

### 1.2 Écran de compte obligatoire (depuis v325)
- Après le toucher, si aucune session n'existe, un écran plein recouvre le jeu (`js/main.js:293`, `js/ui/gate.js:18-50`). Il revient après une déconnexion ou une suppression de compte (`js/main.js:295`).
- Texte : « Crée ton compte pour entrer dans l'Abysse. Ta collection est sauvegardée en ligne : tu la retrouves sur n'importe quel appareil, et tu peux affronter les joueurs du monde entier. » (`js/ui/gate.js:29`).
- Onglet « Créer un compte » sélectionné par défaut (`js/ui/gate.js:34`). Deux onglets : « Se connecter » / « Créer un compte », plus « Mot de passe oublié ? » (`js/screens/account.js:52-60`).
- Champs de l'inscription : **e-mail + un seul champ mot de passe** (pas de confirmation à l'inscription, pas de pseudo) (`js/screens/account.js:54-56`). Règle : 8 caractères au moins, une majuscule, une minuscule, un chiffre, un symbole (placeholder « 8 caractères, Aa1 et symbole ») (`js/screens/account.js:56`, CLAUDE.md §1).
- Mentions : acceptation de la politique de confidentialité, « Il faut avoir 13 ans ou plus » ; « Données conservées : ton e-mail, ton pseudo et ta sauvegarde de jeu » (`js/screens/account.js:58,62`).
- « Confirm email » désactivé côté Supabase : l'inscription connecte tout de suite (CLAUDE.md §1). Seul « Mot de passe oublié » envoie un e-mail ; le service d'e-mails intégré n'en envoie que quelques-uns par heure pour tout le projet (CLAUDE.md §1).
- Le **pseudo** ne se choisit pas ici : il se règle plus tard dans Sanctuaire › Compte (3 à 16 caractères, lettres/chiffres/espace/_/-) (`js/screens/account.js:100-105`, `supabase/01-comptes.sql:7`). Sans pseudo : pas de classement de la Descente (`js/cloud/sync.js:134`) et pas de Tirage des Ombres (le serveur refuse : « Choisis d'abord un pseudo », `supabase/05-tirage.sql:455`).
- Une partie locale existante n'est jamais effacée : elle part en ligne à la connexion, ou le joueur choisit quelle partie garder (`js/ui/gate.js:4-6`, `js/cloud/sync.js:63-95`).
- Aucune bulle d'aide ne s'affiche derrière cet écran (`js/ui/coach.js:108`).

### 1.3 Guide d'accueil (`js/screens/welcome.js`)
Affiché une fois après la fermeture de l'écran de compte (`js/main.js:293`), rejouable dans Réglages › Tutoriels. **8 pages**, boutons « Passer » (page 1) / « Retour », « Suivant », « C'est parti ! » (`js/screens/welcome.js:59-68,84`) :
1. Bienvenue dans l'Abysse — le Bestiaire a été déchiré, retrouve les créatures dans des boosters, renforce-les, mène-les au combat.
2. Ouvre des boosters — gros bouton du milieu, déchirer le paquet, booster gratuit chaque jour, finitions holographique / feuille d'or / cosmique.
3. Ta collection — 4 pages : Cartes, Équipe (5 combattants), Renforcer, Fournaise.
4. Cendres et niveaux — brûler les doublons → cendres → niveaux (attaque, PV).
5. La Descente — 3 au combat, 2 en réserve, gardien tous les 5 étages, remonter pour garder le coffre.
6. Une autre aventure — Duels des Sceaux, jeu où l'on capture les cartes adverses.
7. Coffres et Tirage des Ombres — coffres gagnés en Aventure ; Tirage : un booster par jour, classement de la semaine, 3 premiers gagnent un coffre.
8. Reviens chaque jour — Accueil (offrande, missions, coffres) ; Sanctuaire (profil, succès, bestiaire, réglages).

### 1.4 Boosters de bienvenue et première équipe
- Sauvegarde de départ : **0 éclat, 60 cendres, 2 tickets de booster standard** (`js/config.js:84`, vérifié par `defaultSave()`).
- Le booster gratuit du jour est aussi disponible dès le premier jour (`js/core/game.js:133-138`) : un nouveau joueur peut donc ouvrir **3 boosters standard (9 cartes)** le jour 1. Les tickets sont consommés avant le gratuit (`js/core/game.js:152-153`).
- L'Accueil affiche « Tes 2 boosters de bienvenue t'attendent » tant que le joueur a moins de 3 créatures et au moins un ticket standard (`js/screens/home.js:61`, `js/core/game.js:486`). La Descente affiche alors « Ouvre d'abord tes boosters de bienvenue » (`js/screens/descent.js:56`).
- Équipe : tant que le joueur n'a jamais composé son équipe lui-même, elle est **remplie automatiquement** avec les meilleures cartes possédées dans le budget (`js/core/game.js:470-503`). Filet de sécurité : s'il reste moins de 3 créatures sans booster à ouvrir, 5 Communes sont offertes (Squelette Sentinelle NEC-001 Protecteur, Diablotin des Braises INF-001 Attaquant, Choriste de Lumière CEL-001 Soigneur, Méduse Funèbre ABY-003 Empoisonneur, Mandragore SAU-014 Entraveur) (`js/core/army.js:4`, `js/core/game.js:477-479`).
- Bouton « Suggérer une équipe » (force, synergies, rôles complémentaires) (`js/screens/army.js:135,177`).

### 1.5 Bulles d'aide (`js/ui/tutos.js`, `js/ui/coach.js`)
Chaque bulle s'affiche **une seule fois par partie**, avec un bouton « J'ai compris » ; elle se ferme aussi si l'on change d'écran (`js/ui/coach.js:104-128`). Toutes relisibles dans Réglages › Tutoriels (`js/screens/settings.js:49-59`). **29 bulles, ≈ 1 670 mots au total** (mesuré en retirant le HTML), de 30 à 74 mots chacune (médiane ≈ 58 mots).

| Clé | Titre | Quand elle apparaît | Mots |
|---|---|---|---|
| cb-intro | Le combat | 1er combat, avant le tutoriel guidé (`duel-ui.js:1103`) | 72 |
| cb-skill | Compétences et Ferveur | combat suivant, dès 1 Ferveur, après le combat guidé (`duel-ui.js:847`) | 58 |
| cb-intent | Lire les intentions | **jamais déclenchée automatiquement** (seulement dans Réglages) | 64 |
| cb-defense | Défense active | 1re attaque dangereuse en mode manuel (`duel-ui.js:804`) | 56 |
| cb-dice | Les dés | 1re compétence à dé choisie (`duel-ui.js:874`) | 58 |
| cb-break | Fêlure et Brisure | 1er ennemi à jauge de Brisure ou 1re Fêlure (`duel-ui.js:525,845`) | 62 |
| cb-goal | Objectif bonus | 1er combat avec objectif (`duel-ui.js:843`) | 46 |
| cb-entrance | Entrée en scène | 1re permutation (`duel-ui.js:905`) | 66 |
| cb-traits | Ennemis à mécanique | 1er ennemi à trait (`duel-ui.js:844,1098`) | 64 |
| cb-talent | Don de l'Abîme : les talents | 1re offre de talent (`descent.js:201`) | 49 |
| cb-phase2 | La phase 2 des gardiens | 1re phase 2 (`duel-ui.js:540`) | 48 |
| cb-runes | Les runes du gardien | 1er gardien à runes (`duel-ui.js:846`) | 57 |
| cb-duo | Assaut conjoint | 1er Assaut conjoint (`duel-ui.js:554`) | 60 |
| cb-combo | Marque, Brèche et enchaînement | 1re combinaison (`duel-ui.js:572,578`) | 63 |
| cb-ult | Le pouvoir d'équipe | Ferveur pleine la 1re fois (`duel-ui.js:232`) | 74 |
| army-team | Compose ton équipe | 1re visite de l'écran Équipe (`army.js:184`) | 59 |
| army-doors | La Descente | 1re expédition lancée (`descent.js:312`) | 69 |
| coffres | Les coffres | 1re visite de l'écran Coffres (`army.js:205`) | 66 |
| boosters | Les boosters | 1re visite de l'écran Boosters (`shop.js:87`) | 72 |
| collection | Ta collection | 1re visite de Collection (`collection.js:21`) | 46 |
| renfort | Renforcer | 1re visite de Renforcer (`forge.js:50`) | 30 |
| fournaise | La Fournaise | 1re visite de la Fournaise (`forge.js:99`) | 49 |
| tirage | Le Tirage des Ombres | 1re visite du Tirage (`shadow.js:133`) | 56 |
| sceaux | Duels des Sceaux | 1re visite de l'écran Sceaux ouvert (`sceaux.js:79`) | 59 |
| sceaux-awake | Les revanches implacables | visite des Sceaux après 1 rival battu (`sceaux.js:79`) | 50 |
| sceaux-board | Le plateau des Sceaux | 1re partie (`sceaux.js:244`) | 56 |
| sceaux-combo | Identique, Somme et Combo | 1re partie à règle Identique/Somme (`sceaux.js:244`) | 68 |
| sceaux-perks | Les pouvoirs de rareté | 1re partie avec une carte à pouvoir (`sceaux.js:245`) | 44 |
| son | Son, musique et vibrations | **jamais déclenchée automatiquement** | 50 |

Premier combat **guidé** : une main dorée montre quoi toucher (« C'est au tour de X : « Frappe » attaque et rapporte 1 PA », « Touche un ennemi pour l'attaquer », « Rien à faire : touche « Passer » »). Le guidage s'arrête après le premier tour ennemi (`js/screens/duel-ui.js:177-188,825`). Pendant ce guidage, les autres bulles sont retardées (`duel-ui.js:841`).

Ordre réaliste pour un nouveau joueur le jour 1 : compte → guide 8 pages → Boosters (bulle « boosters ») → ouverture de 2-3 boosters → Descente (bulle « army-doors ») → combat guidé (bulle « cb-intro ») → bulles de combat au fil des événements.

---

## 2. Navigation

### 2.1 Barre du bas : 5 onglets (`js/main.js:44-47`)
Accueil · Collection · **Boosters** (bouton central mis en avant, « orb ») · Aventure · Sanctuaire (`js/main.js:169`).
Pastilles : Boosters = nombre de tickets + booster gratuit + coffres ; Collection = point si cartes nouvelles ; Accueil = point si offrande ou mission à réclamer ; Aventure = point si une expédition est en cours ou si aucune torche n'a été utilisée aujourd'hui (`js/main.js:160-168`).

### 2.2 Sous-onglets (`js/main.js:56-60`)
- Collection : Cartes · Équipe · Renforcer · Fournaise (pastilles : nouvelles cartes, cendres récupérables, « ↑ » si un membre de l'équipe peut monter de niveau) (`js/main.js:148-153`).
- Boosters : Boosters · Coffres · Tirage.
- Aventure : Descente · Sceaux.
- Sanctuaire (tuiles, pas de sous-onglets) : Profil (grande tuile), Succès, Bestiaire, Compte, Réglages (+ Mode Créateur réservé à un badge) (`js/screens/menu.js:16-28`).

### 2.3 Nombre d'écrans
17 adresses distinctes (`js/main.js:39-43`) : Accueil, Collection, Équipe, Renforcer, Fournaise, Boosters, Coffres, Tirage, Descente, Sceaux, Sanctuaire, Profil, Succès (onglets Succès / Ensembles, `js/screens/achievements.js`), Bestiaire (onglets Créatures / Récits / Chasse / Royaumes, `js/screens/bestiary.js`), Royaume d'une faction, Compte, Réglages (onglets Jeu / Tutoriels / Sauvegarde / À propos, `js/screens/settings.js:28`). S'y ajoutent des couches plein écran : ouverture de booster, ouverture de coffre, fiche de carte (onglets Combat / Défis / Histoire / Rareté, `js/screens/detail.js`), combat, plateau des Sceaux, guide, écran de compte.

### 2.4 Barre du haut
Avatar + niveau du joueur + barre d'XP (touche → Profil) ; compteurs éclats et cendres ; toucher un compteur ouvre une explication et un raccourci (`js/main.js:94-136`). Bouton retour sur les sous-pages (`js/main.js:128-144`).

### 2.5 Accueil (`js/screens/home.js:56-71`), de haut en bas
1. Logo.
2. Bandeau « boosters de bienvenue » (nouveau joueur seulement).
3. « Ton prochain objectif » : 1 objectif en grand (reprendre l'expédition / atteindre l'étage N / première expédition) (`js/core/game.js:702-...`).
4. Événement de la semaine (2 factions, jours restants).
5. « Ensuite » : jusqu'à 2 autres objectifs (renforcer une créature, vaincre un gardien, battre un rival des Sceaux, compléter un ensemble ou un royaume).
6. « Aujourd'hui » : offrande du jour avec frise de 7 jours, coffre de la semaine, les 3 missions, coffres à ouvrir.
7. « N / 500 créatures découvertes ».
8. Pastille « N joueurs en ligne » (temps réel ; « Connexion… » ou « Hors ligne ») (`js/screens/home.js:70-79`).

---

## 3. Collection

### 3.1 Cartes
- **500 cartes**, 7 factions (`data/cards/*.json`) : Infernal 72, Abyssal 71, Céleste 71, Sauvage 73, Nécrotique 71, Primordial 71, Artificiel 71.
- 6 raretés (`js/config.js:6-13`) : Commune (C) **137**, Peu commune (PC) **119**, Rare (R) **121**, Hyper rare (HR) **78**, Mythique (M) **35**, Secrète (S) **10**.
- Par faction : Infernal C17/PC19/R19/HR12/M4/S1 ; Abyssal 21/18/16/9/6/1 ; Céleste 18/15/19/11/5/3 ; Sauvage 21/22/17/10/2/1 ; Nécrotique 23/17/15/10/5/1 ; Primordial 12/12/20/17/8/2 ; Artificiel 25/16/15/9/5/1.
- Rôle de chaque carte déduit de ses capacités (`js/core/army.js:105-114`) : Attaquant 124, Protecteur 100, Entraveur 78, Soutien 59, Soigneur 53, Empoisonneur 49, Fléau 37.
- Noms des cartes non possédées masqués tant que la faction n'est pas complétée à 50 % (`js/config.js:93`) ; on peut déchiffrer un nom pour **15 cendres** (`js/config.js:92`, `js/core/game.js:276-282`).
- Écran Collection : vue Grille ou Classeur ; filtres Toutes / Possédées / Manquantes / Nouvelles / ★ ; filtres faction, rareté, rôle, passif ; tri ; recherche (`js/screens/collection.js:30-41`).

### 3.2 Finitions (variantes, purement visuelles)
- Normale, Holographique, Feuille d'or, Cosmique (`js/config.js:66-71`). « Les variantes ne changent rien au combat » (`js/core/kits.js:10`).
- Taux par carte tirée : holo **4 %**, or **1,2 %**, cosmique **0,4 %** (`js/config.js:57`) ; ×1,5 dans le booster événement, ×2 dans le premium (`js/config.js:44,49`). Un seul tirage réparti entre les finitions autorisées (`js/core/boosters.js:23-33`).
- **Pas de feuille d'or** pour 117 Communes et 98 Peu communes (seulement normale / holo / cosmique) ; toutes les R, HR, M, S ont les 4 finitions.
- Par booster standard (commentaire du code) : ≈ 12 % d'avoir une holo, ≈ 3,6 % une or, ≈ 1,2 % une cosmique (`js/config.js:56`).

### 3.3 Sublimer (`js/core/game.js:372-389`)
Obtenir la finition suivante d'une carte déjà possédée dans la finition précédente (ordre normale → holo → or → cosmique, or sauté si absent). Coût = cendres de Fournaise de la rareté × facteur : holo ×4, or ×10, cosmique ×24 (`js/config.js:60`).
Exemples : Commune holo 20, Commune cosmique 120 ; Rare holo 100, or 250, cosmique 600 ; Mythique holo 600, or 1 500, cosmique 3 600 ; Secrète holo 1 500, or 3 750, cosmique 9 000 cendres. Se fait dans la fiche de carte, onglet Rareté.

### 3.4 Niveaux de carte
- Niveau 1 à **10** (`js/core/army.js:122`). Passer du niveau n à n+1 coûte `levelAsh[rareté] × n` cendres (`js/config.js:89-90`, `js/core/game.js:444-447`) : base C 10, PC 15, R 25, HR 40, M 60, S 80. **Coût total 1 → 10 = base × 45** : C 450, PC 675, R 1 125, HR 1 800, M 2 700, S 3 600 cendres. Chaque niveau donne +10 XP de joueur (`js/core/game.js:457`).
- Effet : attaque et PV × (1 + 0,08 × (niveau − 1)), soit ×1,72 au niveau 10 (`js/core/duel.js:43`).
- Paliers du kit de créature : niveau 1 frappe propre, **3 passif**, **6 compétence propre**, **9 Éveil**, **10 Apogée** (compétence propre rechargée un tour plus vite) (`js/core/kits.js:17-21,392-393`).
- Les doublons ne montent plus les niveaux : ils se brûlent (`js/core/game.js:218-222`).

### 3.5 Fournaise (`js/core/game.js:390-434`, `js/screens/forge.js`)
- Cendres par exemplaire brûlé = base de rareté × facteur de finition : base C 5, PC 10, R 25, HR 60, M 150, S 375 ; facteur normale 1, holo 3, or 8, cosmique 20 (`js/config.js:87-88`).
- « Tout brûler » ne brûle que les doublons (garde 1 exemplaire de chaque finition), avec confirmation (`js/screens/forge.js:70,87`). On peut brûler sa dernière copie après confirmation, sauf favori, sauf s'il resterait moins de 3 créatures, sauf créature en expédition (`js/core/game.js:395-400`).

### 3.6 Ensembles (17) (`data/sets.json`)
152 places au total. Récompense unique à la complétion (éclats + titre, parfois cadre ou ticket premium). Total : **8 550 éclats + 4 tickets premium**.
Les Sept Péchés capitaux (7 cartes, 500) ; Les Douze Titans (12, 600, cadre) ; Les Souverains infernaux (9, 500, cadre) ; Les Dragons primordiaux (9, 500 + premium) ; Les Gardiens du firmament (10, 500, cadre) ; Les Treize Fléaux (13, 600, cadre) ; Les Dieux oubliés (8, 450, cadre) ; Les Seigneurs des abysses (10, 500, cadre) ; Les Huit Plaies (8, 400, cadre) ; Les Entités du Néant (7, 700 + premium, cadre) ; Les Pactes scellés (7, 300) ; La Goétie (6, 300, cadre) ; Les Anciens Panthéons (14, 700 + premium) ; Les Monstres de légende (11, 500) ; Les Merveilles mécaniques (7, 500) ; Les Objets qui s'éveillent (8, 400) ; Les Soleils anciens (6, 600 + premium).
Faction complète : **250 éclats + cadre de faction** (`js/core/game.js:1288`).

### 3.7 Formes corrompues (`js/core/forms.js:5-18`)
4 créatures seulement ont une seconde forme (même carte, autre passif, choix libre hors expédition) : NEC-001 « Sentinelle Creuse » (vaincre le Dévoreur), CEL-005 « Statue Fêlée » (carte niveau 3), SAU-001 « Loup de l'Abîme » (vaincre la Matriarche), CEL-031 « Phénix de Cendre » (atteindre l'étage 15).

### 3.8 Renommée et défis de carte
- Chaque victoire en Descente donne +1 point de Renommée aux créatures restées debout (+2 après élite ou gardien) (`js/core/game.js:984`, `1026-1037`). Paliers : Vétéran 10, Héros 40, Légende 100 (`js/core/renown.js:1-5`), annoncés par une notification.
- 3 défis par créature (`js/core/game.js:5-9`) : 10 combats gagnés en restant debout (25 cendres, +3 Renommée) ; achever 25 ennemis (40 cendres, +5) ; porter le coup fatal à un gardien (60 cendres, +8). Réclamés dans la fiche, onglet Défis.

### 3.9 Favoris et vitrine
- Favori (étoile) : la dernière copie ne peut pas être brûlée (`js/core/game.js:1022-1023`).
- Vitrine du profil : **3 cartes** au plus ; avatar = une carte possédée ; nom 16 caractères (`js/core/game.js:1235-1243`).

---

## 4. Boosters

### 4.1 Types et prix (`js/config.js:34-52`)
| Booster | Prix | Emplacements | Contenu |
|---|---|---|---|
| Standard | **400 éclats** | base, base, PC+ | toutes factions |
| De faction | **500 éclats** | base, base, PC+ | une faction au choix |
| Événement | **550 éclats** | event, event, PC+ | les 2 factions de la semaine, finitions ×1,5 |
| Premium | **non vendu** (récompense) | base, PC+, R+ | toutes factions, finitions ×2 |

Le premium s'obtient par ticket : coffre abyssal, niveaux de joueur multiples de 5, certains succès et ensembles (`js/config.js:48`, `103`). Pas d'achat en argent réel (CLAUDE.md §5).

### 4.2 Tables de rareté (`js/config.js:18-26`)
- base : C 74 / PC 20 / R 4,8 / HR 1 / M 0,17 / S 0,03 %.
- PC+ : PC 82 / R 14 / HR 3,3 / M 0,6 / S 0,1 %.
- R+ : R 82 / HR 15 / M 2,6 / S 0,4 %.
- event : C 66 / PC 24 / R 7,5 / HR 2 / M 0,4 / S 0,1 %.
- HR+ (garantie) : HR 88 / M 10,5 / S 1,5 % ; M+ (garantie) : M 90 / S 10 %.
Si la rareté tirée n'existe pas dans la réserve (faction), on descend d'un cran (`js/core/boosters.js:70-80`).

Mesures (outil `tools/simulate.mjs`, 20 000 boosters chacun) :
- Standard : C 49,3 % · PC 40,2 % · R 7,8 % · HR 2,2 % · M 0,56 % · S 0,07 % des cartes ; au moins une HR+ : 6,3 % par booster ; au moins une M+ : 1,1 % ; ≈ 53 boosters entre deux M/S.
- Événement : HR+ 8,7 % ; M+ 1,7 % par booster.
- Premium : R 33,5 % des cartes ; HR+ 22,2 % ; M+ 3,9 % par booster.

### 4.3 Garanties (pitié) (`js/config.js:29-32`, `js/core/boosters.js:92-93`)
- Au **25e** booster sans HR ou mieux, la dernière carte est HR ou mieux.
- Au **100e** booster sans M ou mieux, la dernière carte est M ou mieux.
- Compteurs communs à tous les boosters, remis à zéro dès la rareté obtenue ; affichés sous forme de barres sur l'écran Boosters (`js/screens/shop.js:30-36`).

### 4.4 Ce qu'une carte rapporte en sortant
- Nouvelle créature : éclats de découverte C 1, PC 2, R 3, HR 7, M 12, S 25 (`js/config.js:85`) + XP C 10, PC 20, R 40, HR 80, M 160, S 300 (`js/config.js:99`).
- Doublon exact : rien d'autre que 2 XP (à brûler) ; nouvelle finition d'une carte connue : 4 XP (`js/core/game.js:218-226`).
- Chaque booster : +10 XP (`js/config.js:98`).

### 4.5 Booster gratuit quotidien (`js/core/game.js:131-138`, `js/config.js:120`)
1 booster standard gratuit par jour, à minuit (heure locale). **Ne s'accumule pas** : non ouvert = perdu. L'écran affiche le compte à rebours (`js/screens/shop.js:72-76`).

### 4.6 Événement de la semaine (`js/config.js:74-81`, `js/core/boosters.js:35-47`)
Rotation chaque lundi parmi 6 événements : Nuit des Sceaux brisés (Infernal + Nécrotique), Marée noire (Abyssal + Primordial), Écho de la Chute (Céleste + Infernal), Grande Chasse (Sauvage + Nécrotique), Silence des profondeurs (Abyssal + Artificiel), Aube sauvage (Céleste + Sauvage). Effets : booster événement, et 40 % des ennemis ordinaires de la Descente remplacés par des créatures de ces factions (`js/core/descent.js:120-125`).

### 4.7 Ouverture (`js/screens/opening.js`)
Glisser le doigt le long de la ligne (ou toucher) pour déchirer, puis retourner les cartes une par une (glisser/toucher), puis récapitulatif. Option « Ouverture rapide » (récapitulatif direct) dans les Réglages (`js/screens/settings.js:46`). Les cartes sont enregistrées avant l'animation (`js/screens/opening.js:1-3`).

### 4.8 Coffres (`js/core/descent.js:21-31`)
| Coffre | Contenu |
|---|---|
| Bois | 50 éclats + 20 cendres |
| Fer | 150 éclats + 40 cendres |
| Or | 1 booster standard (ticket) + 60 cendres |
| Abyssal | 1 booster premium (ticket) + 100 cendres |
Sources : fin d'expédition selon la profondeur, 1re victoire contre chaque gardien, 7e jour de série d'offrande (fer), coffre de la semaine (or), Tirage des Ombres (top 3), paliers de saison, succès « profondeur ». Ouverture animée dans Boosters › Coffres (`js/screens/army.js:189-207`).

### 4.9 Tirage des Ombres (réservé aux comptes avec pseudo)
- 1 tirage gratuit par jour (heure de Paris), tiré par le serveur ; **les cartes ne sont pas gagnées**, seule leur valeur compte (`js/screens/shadow.js:1-2`, `supabase/05-tirage.sql:445-477`).
- 5 cartes : 4 emplacements « base » + 1 « PC+ » (mêmes taux que le jeu), finitions anciennes plus rares (holo 2,5 %, or 0,5 %, cosmique 0,1 %) (`supabase/05-tirage.sql:457-467`).
- Choisir d'abord une faction : ses cartes valent double. Points : C 1, PC 2, R 6, HR 20, M 80, S 200, +8 par finition (`js/config.js:152`).
- Chaque tirage : **+15 éclats** (`js/config.js:149`, `js/core/game.js:347-355`).
- Classement du lundi au dimanche (somme des tirages) ; top 3 : coffre abyssal / or / fer, seulement s'il y a au moins 5 participants ; le prix arrive le lundi suivant à l'ouverture du jeu (`js/config.js:149`, `js/screens/shadow.js:20-35,47`).
- Le fichier serveur du dépôt contient une liste figée de **395 cartes** (`supabase/05-tirage.sql:16`) : les 105 dernières cartes ajoutées n'y figurent pas (sauf mise à jour hors dépôt, non trouvée).

---

## 5. Économie : éclats et cendres

### 5.1 Sources d'éclats
| Source | Montant | Référence |
|---|---|---|
| Offrande du jour | 50 + 5 × (jour de série − 1), plafond +30 → 50, 55, 60, 65, 70, 75, **80** max | `js/config.js:94`, `game.js:123-128` |
| Missions du jour (3/jour) | 30 à 40 chacune (+20 XP chacune) | `js/config.js:131-143`, `game.js:315-325` |
| Découverte d'une créature | C 1 … S 25 | `js/config.js:85` |
| Coffre de bois / fer | 50 / 150 | `descent.js:22-23` |
| Toute première victoire en combat | **+50** (une fois) | `game.js:11,979` |
| Descente : combats, trésors, ennemis nommés, objectifs | **15 % des montants de base** (voir 7.9), très faibles | `game.js:27,892-903` |
| Chasse : 40e victoire contre une même espèce | +100 | `game.js:940` |
| Duels des Sceaux | 20 à 150 par victoire (5 payées/jour) ; 1re victoire par rival +100 ; 1re revanche implacable +150 ; défi du jour +40 (nul : +10) | `sceaux.js:71-95`, `game.js:660-690` |
| Tirage des Ombres | 15 par jour | `config.js:149` |
| Niveau de joueur | +20 par niveau ; tous les 5 niveaux +50 et 1 ticket premium (au lieu de 20) | `config.js:103` |
| Succès (35) | 10 à 500, total **2 765** + 8 tickets premium | `data/achievements.json` |
| Ensembles (17) | 300 à 700, total **8 550** + 4 tickets premium | `data/sets.json` |
| Faction complète | 250 (+ cadre) | `game.js:1288` |
| Saison mensuelle | 80 (étage 5), 250 (étage 30) | `renown.js:76-82` |

### 5.2 Puits d'éclats
- Boosters : 400 / 500 / 550 (`js/config.js:36-45`). C'est le seul puits réel d'éclats.
- « Torche bénie » (220 éclats, rallume une torche, 2/jour) existe dans le code (`js/config.js:155-157`, `game.js:1210-1232`) mais **aucun écran ne la vend** (`itemsShopHTML` est importé sans être affiché, `js/screens/shop.js:1`) : seul un sac s'affiche si le joueur en possède déjà (`js/screens/descent.js:67`).

### 5.3 Sources de cendres
- Départ : 60 (`js/config.js:84`).
- Fournaise (doublons) : C 5 … S 375 × finition 1/3/8/20 (`js/config.js:87-88`).
- Combats gagnés en Descente (pas en descente libre) : round((2 + étage/2) × k), k = 1 combat, 2 élite, 3 gardien, étage plafonné à 25 → ex. étage 1 : 3/5/8 ; étage 10 : 7/14/21 ; étage 25 : 15/29/44 (`js/core/game.js:962`).
- Coffres : 20 / 40 / 60 / 100 (`descent.js:22-25`).
- Défis de carte : 25 / 40 / 60 par créature (`game.js:5-9`).

### 5.4 Puits de cendres
- Niveaux de carte (base × niveau, total base × 45 jusqu'au niveau 10) (§3.4).
- Sublimer (§3.3).
- Déchiffrer un nom : 15 (`js/config.js:92`).

### 5.5 Coffre de la semaine (`js/core/game.js:10,245-257`)
Jouer **5 jours différents** dans la semaine (lundi → dimanche) → 1 **coffre d'or**. Un jour compte dès qu'une action est enregistrée (`markPlayed` appelé par chaque sauvegarde, `game.js:73-75`).

### 5.6 Série de l'offrande
Manquer un jour remet la série à 1 (`game.js:123-127`). Tous les 7 jours d'affilée (jour 7, 14, 21…) : **+1 coffre de fer** (`game.js:263-265`). Affiché comme une frise de 7 cases sur l'Accueil.

### 5.7 Ordre de grandeur d'une journée « active » (calcul à partir des règles, non mesuré)
Offrande 50-80 + 3 missions ≈ 100 + Tirage 15 + 3 expéditions avec coffre (3 coffres de bois = 150 éclats et 60 cendres si on dépasse l'étage 3 ; 3 coffres de fer = 450 éclats et 120 cendres dès l'étage 8) + éclats de combat (quelques dizaines) + Sceaux (5 victoires payées : 100 à 500 selon les rivaux, plus les primes de première victoire). Un booster standard coûte 400 : un joueur assidu peut en acheter environ 1 à 2 par jour en plus du gratuit, davantage les jours de primes uniques.

---

## 6. Combat (Descente)

### 6.1 Équipe (`js/core/army.js:117-119`)
- 5 cartes : **3 au combat, 2 en réserve**. Budget **15 points** : coût C 1, PC 2, R 3, HR 4, M 5, S 6. (5 Communes = 5 ; 2 Mythiques + 3 Rares = 19 > 15, interdit.)
- 4 équipes enregistrables au plus (`js/core/game.js:516-523`).
- Équipe non modifiable pendant une expédition ; entre deux étages on peut échanger la place de deux créatures (`game.js:505-511,756-765`).

### 6.2 Statistiques (`js/core/duel.js:28-58`)
Gabarit Commune niveau 1 [attaque, PV] : Protecteur [2, 12], Attaquant [4, 7], Soigneur [2, 8], Empoisonneur [2, 8], Entraveur [3, 8], Soutien [3, 9], Fléau [2, 7]. Multiplicateur de rareté C 1 / PC 1,15 / R 1,3 / HR 1,45 / M 1,6 / S 1,75, puis niveau (×1,72 au niveau 10), puis petite répartition propre à la créature. Exemples réels : Squelette Sentinelle (C, Protecteur) 2 ATQ / 13 PV ; Diablotin des Braises (C, Attaquant) 4 / 6 ; Choriste de Lumière (C, Soigneur) 2 / 9.
Ennemis : force ×(1 + 0,06 par étage jusqu'au 20e, puis +0,03) (`descent.js:41`) ; élite PV ×1,6 et jauge de Brisure 6 ; gardien ATQ ×1,25, PV ×3, jauge 10 (`duel.js:46-48`) ; tous les ennemis −15 % PV en ordre d'initiative (`duel.js:1305`).

### 6.3 Initiative et tours (`js/core/duel.js:1301-1425`)
- Chaque créature (alliée ou ennemie) au combat joue **une fois par tour**, dans l'ordre de sa vitesse ; frise de portraits en haut de l'écran.
- Vitesse = rôle (Attaquant 6, Entraveur 6, Soutien 5, Empoisonneur 5, Fléau 4, Soigneur 4, Protecteur 3) + rareté (R/HR +1, M/S +2) + alliée +3 + niveau/4 ; élites et gardiens +1 ; plus un peu de hasard (`duel.js:1306-1309,1314-1316`).
- Les ennemis consécutifs jouent en bloc ; le joueur répond coup par coup aux attaques dangereuses.
- Bouton « Passer » quand rien n'est à faire (`duel-ui.js:82`).
- **Épuisement** dès le tour 15 : tout le monde perd 1, puis 2, puis 3… PV par tour, boucliers retirés (`duel.js:1037,1072-1078`).

### 6.4 PA (points d'action, par créature) (`js/core/skills.js:14-17`)
2 PA au début du combat ; +1 au début de chacun de ses tours ; +1 en attaquant, en se défendant ou sur une parade parfaite ; 6 au plus. Compétences de rôle : Rempart 1 PA, Coup d'estoc 2, Prière 2, Contagion 2, Entrave glaciale 2, Marque du chasseur 1, Raz-de-marée 3 (`skills.js:26-62`, `duel.js:536-538`).

### 6.5 Actions d'une créature (`js/core/duel.js:529-591`)
- **Attaque** (frappe propre au rôle/créature) : +1 PA, +1 Ferveur.
- **Compétence de rôle** (bouton doré), coûte des PA.
- **Compétence propre** (dès le niveau 6) : recharge de quelques tours, sans Ferveur (`kits.js:174-177`).
- **Défense** : −50 % de dégâts jusqu'à son prochain tour, +1 PA.
- **Permuter** : une créature de réserve entre et joue tout de suite, gratuit, une fois par tour ; effet d'entrée selon le rôle (bouclier ; +2 ATQ ; soin 15 % ; +2 poison ; ralentissement ; +1 Ferveur ; +1 Brisure aux élites/gardiens) (`duel.js:898-919`).
- **Hâte** (Soutien, 2 PA, 1/tour) : une alliée joue juste après.
- **Assaut conjoint** : sur un ennemi Fêlé, Brisé ou Marqué, la créature et celle qui joue juste après frappent ensemble (×1,25 chacune, effets des deux rôles), **3 Ferveur, 1 fois par combat**, l'alliée appelée perd son prochain tour (`duel.js:209,575-585`).

### 6.6 Ferveur et pouvoir d'équipe
- Jauge commune à l'équipe, **6 max** ; commence l'expédition à 2 (4 avec la règle « Nuit du pouvoir ») ; **3 au plus** gardés d'un combat au suivant (`skills.js:8-10`, `game.js:928`).
- Gains : attaque +1, faiblesse exploitée +1, esquive +1, parade parfaite +2, Fêlure +1, Brisure +2, rune brisée +1, coup de grâce +1, plus passifs (`duel.js:430-512,840,1253-1265`).
- Pouvoir d'équipe : Ferveur pleine, 1 fois par combat, ne termine pas le tour (`duel.js:921-945`). Sans Mythique ni Secrète : **Sceau du Serment** (soin 30 % + bouclier jusqu'à 50 % des PV). Une Mythique/Secrète le remplace selon sa faction : Renaissance (Céleste, Nécrotique), Cataclysme (Infernal, Primordial), Croc du Néant (Abyssal, Sauvage), Égide mécanique (Artificiel) (`army.js:133-142`).

### 6.7 Rôles (noms affichés, `js/core/army.js:96-104`, kits `js/core/skills.js:22-65`)
- **Protecteur** : les ennemis doivent le viser en premier (sauf assassins) ; Riposte (chaque coup encaissé = +1 dégât et +1 Brisure à sa prochaine attaque, 3 max) ; son attaque est un coup de rupture et pose une Brèche ; **Rempart** (1 PA) : protège un allié, encaisse à sa place avec −40 %.
- **Attaquant** : Exécution (+50 % sur cible brisée ou sous 30 % PV) ; **Coup d'estoc** (2 PA, D20) : coup de rupture ; réussite ×2, +3 Brisure, marque ; critique ×3 ; partielle ×1,2 ; échec critique : moitié et « exposée ».
- **Soigneur** : Souffle de vie (soin en fin de tour) ; **Prière** (2 PA) : soin 40 % PV max, excédent en bouclier, purge poison et gel.
- **Empoisonneur** : Morsure +2 poison, traverse les boucliers ; **Contagion** (2 PA, D20) : double et propage le poison.
- **Entraveur** : **Entrave glaciale** (2 PA, D20) : gèle (perd sa prochaine action, charge annulée) ; partielle : recule dans l'ordre du tour.
- **Soutien** : Cri de guerre (+1 ATQ à l'équipe chaque tour) ; **Marque du chasseur** (1 PA) ; Hâte.
- **Fléau** : Vague (touche les voisins à 50 %) ; **Raz-de-marée** (3 PA) : tous les ennemis à 70 %, coup de rupture, consomme les Marques, fait détoner le poison ≥ 6 (×1,5).

### 6.8 Dés (D20) et frappe rythmée
- Difficultés réelles (`duel.js:614-640`) : Coup d'estoc 10 (+3 contre gardien, +1 élite) ; Contagion 9 (+2 gardien) ; Entrave 8 (+6 gardien, +3 élite), bonus de rareté Entraveur R +1 … S +4.
- Bonus : Marque +3, Brisé +5, faiblesse +2, gel +3 (estoc/contagion), bénédiction +2. 1 naturel = échec critique ; 20 = critique.
- Avant le jet, un anneau se resserre : toucher au bon moment donne +1 (bien) ou +3 et réussite assurée (parfait) (`duel.js:33`, `duel-ui.js:678-698`).

### 6.9 Brisure / Fêlé / Brisé (élites et gardiens) (`duel.js:471-505`)
Jauge de Brisure (6 élite, 10 gardien). À zéro : l'ennemi est **Fêlé** (+1 Ferveur). Le prochain **coup de rupture** (attaque d'un Protecteur, Coup d'estoc, Raz-de-marée, ou coup qui consomme une Marque posée par une autre créature) le **Brise** : il perd sa prochaine action, son attaque annoncée est annulée, il subit +50 % de dégâts, les dés gagnent +5, +2 Ferveur. Sans rupture avant la fin du tour suivant, il se ressaisit.

### 6.10 Marque, Brèche, enchaînement
- **Marque** (Marque du chasseur, compétence à dé réussie) : le prochain coup d'une **autre** créature fait +50 % et +2 Brisure, puis la Marque part (2 tours max) (`skills.js:56`, `duel.js:206`).
- **Brèche** (attaque de Protecteur, Raz-de-marée) : prochain coup d'un autre allié perce le bouclier, +20 %, +3 Brisure (`tutos.js:19`).
- Frapper la même cible à plusieurs dans un tour : +1 dégât par coup, +2 max (`duel.js:205`).
- Bonus multiplicatifs plafonnés à ×3 la force de base du coup (`duel.js:269`).

### 6.11 États
- **Poison** : inflige sa valeur à chaque tour puis diminue de moitié ; 14 au plus (`duel.js:436-445,983-989`).
- **Gel** : passe son tour ; élites et gardiens immunisés 2 tours après (`duel.js:461-468`).
- **Ralenti** : prochaine attaque −50 %.
- **Provocation** (Hurlement, « Tous sur elle ») : chaque ennemi la vise à sa prochaine action (`duel.js:451-456`).
- **Défense** −50 % ; **Exposé** +25 % de dégâts subis ; **Proie désignée** (par un ennemi Soutien) : ciblée par tous, +20 % de dégâts pendant 2 tours.
- Faiblesses de faction ×1,5 : Sauvage craint Infernal, Infernal craint Abyssal, Abyssal craint Artificiel, Artificiel craint Primordial, Primordial craint Sauvage, Céleste craint Nécrotique, Nécrotique craint Céleste ; même faction ×0,75 (`skills.js:94-103`). Révélées en les exploitant ou par la Marque.
- Posséder la carte d'un ennemi (ou l'avoir vaincu 15 fois) : +1 dégât contre lui ; les Communes font +1 contre élites et gardiens (`duel.js:168-169`, `game.js:585`).

### 6.12 Défense active (`duel.js:1470,1539-1551`, `duel-ui.js:800-806`)
- Déclenchée par les attaques « dangereuses » : coup chargé, déflagration, sort de gel, Dévorer, Tempête de givre, et **toutes** les attaques des élites et gardiens.
- Une barre apparaît : toucher dans la zone dorée = **esquive** (aucun dégât, +1 Ferveur) ; sur le trait blanc au dernier instant = **parade parfaite** (aucun dégât, +1 PA, +2 Ferveur, +2 Brisure à l'attaquant, contre-attaque si la cible est Protecteur ou Attaquant).
- Fenêtre d'esquive : 230 ms de base (190 ms pour un coup chargé), ajustée par l'écart de niveau (−30 à +45 ms), −15 ms élite, −30 ms gardien, entre 160 et 320 ms ; fenêtre de parade ≈ 1/5 de l'esquive (32 à 64 ms).
- Réglage « Défense automatique » : 40 % d'esquives, jamais de parade (`settings.js:42-43`, `duel-ui.js:802`).

### 6.13 Intentions et familles d'ennemis
- Les élites et gardiens annoncent leurs grosses attaques (bandeau rouge, « ! » dans la frise) ; les attaques ordinaires ne s'annoncent pas (`tutos.js:8`). Intentions possibles : Attaque, Coup chargé, Se charge, Concentration, Déflagration, Protection, Soin, Désigne une proie, Renfort, Empoisonnement, Sort de gel, et celles des gardiens (`skills.js:126-145`).
- 9 familles de comportement (`skills.js:106-122`) : Prédateur (vise le plus blessé), Assassin (ignore les Protecteurs, vise le plus fragile), Berserker (+50 % sous la moitié des PV) — les trois pour les Attaquants ennemis ; Protecteur (bouclier), Mage (Fléau : concentration puis frappe de zone), Parasite (Empoisonneur), Contrôleur (Entraveur : gèle), Soutien (Soigneur/Soutien : soigne, renforce, désigne une proie), Gardien.
- Traits (dès l'étage 3 pour les ennemis ordinaires, chance 20 % + 2 %/étage, 50 % max ; élites dès l'étage 8 à 40 %) : Explosif, Voleur d'action, Lien d'égide (−35 % dégâts), Enragé (+2 ATQ sous 50 %) (`descent.js:127-139`).
- Ennemi nommé (15 % des salles dès l'étage 2) : PV ×1,3, ATQ ×1,15, butin d'éclats en plus (`descent.js:143-148`, `game.js:830-831`).

### 6.14 Objectif bonus (`duel.js:1691-1700`, `game.js:843-847`)
Un objectif facultatif par combat (dès l'étage 3, ou partout dès que le record atteint 5) : Sans perte, Éclair (3 tours), Assaut rapide (5 tours), Points faibles (2 faiblesses), Coordination, Lame-miroir (parade), Briseur, Brasier (pouvoir d'équipe). Réussi : éclats en plus (×0,15) et +1 Ferveur pour la suite.

### 6.15 Pilote automatique
**Aucun** : le mode Auto a été retiré en v240, « chaque combat se joue » (`duel-ui.js:958`). Seule la défense peut être automatique. Vitesse d'animation ×1/×2/×3 existe en interne (`duel-ui.js:52-54`) ; bouton visible non trouvé (« plus de bouton ×2 », `duel-ui.js:52`).

### 6.16 Durée d'un combat (mesures `tools/balance.mjs`, IA du jeu, défense moyenne 40 % esquives / 15 % parades, 20 combats par case)
| Équipe | Étage 3 | Élite 8 | Gardien 10 | Gardien 20 |
|---|---|---|---|---|
| 5 Communes niv. 1 | 100 %, 5,0 tours | 100 %, 11,1 t | 80 %, 13,8 t | 5 %, 17 t |
| Mixte Rares niv. 1 | 100 %, 4,1 t | 100 %, 5,9 t | 90 %, 11,0 t | 0 % |
| 3 Attaquants C niv. 1 | 100 %, 2,7 t | 100 %, 3,8 t | 95 %, 6,5 t | 90 %, 10 t |
| 5 Communes niv. 10 | 100 %, 3,9 t | 100 %, 5,0 t | 100 %, 8,6 t | 100 %, 9,3 t |
| 3 Protecteurs C niv. 1 | 100 %, 24 t | 90 %, 18,9 t | 60 %, 15,8 t | 0 % |
Ordre de grandeur : combat ordinaire 2 à 5 tours, élite 3 à 11, gardien 4 à 18. Le test de robustesse (`tools/fuzz.mjs 150`, joueurs aléatoires) donne 878 combats, 4 560 tours, soit ≈ 5,2 tours par combat.

---

## 7. La Descente

### 7.1 Torches
**3 expéditions avec coffre par jour** (`descent.js:7`). Après : « Descendre (sans coffre) » illimité — descente libre : pas de coffre, pas de cendres, éclats ×0,5, pas de saison, pas de recrutement de gardien (`game.js:597-599,894,953,962,1047`).

### 7.2 Structure d'un étage (`descent.js:79-103`)
- Étage 1 : une porte Combat. Étages suivants : choix **Combat** ou **Élite**. Tous les 5 étages : **Gardien** (seule porte).
- Ennemis : combat 2 (3 dès l'étage 3, 4 dès le 9) ; élite 1 élite + 1 (+1 dès l'étage 6) ; gardien seul (+1 serviteur dès l'étage 10). Au plus 3 au combat, le reste en réserve (`descent.js:108-117`, `duel.js:21`).
- Rareté des ennemis : étages 1-4 C/PC, 5-8 jusqu'à R, 9+ jusqu'à HR ; gardiens HR/M/S avant l'étage 20, M/S ensuite (`descent.js:60-67`).
- Plancher : ennemis jamais plus faciles que l'étage équivalent au niveau moyen de l'équipe (`descent.js:38-39`, `game.js:813`).
- Après une victoire : bonus au choix, **2 propositions** après un combat, **les 3** après élite/gardien (`descent.js:95-103`) : **Source sacrée** (soin 30 % des PV, 60 % avec « Sources bénies »), **Autel ancien** (une bénédiction parmi 3), **Trésor oublié** (éclats). Puis écran « Si tu remontes » (coffre actuel) / « Descendre à l'étage N+1 » (`descent.js:142-148`).
- Le donjon est le même pour tout le monde le même jour (graines par jour et étage, `descent.js:69-74`).

### 7.3 Gardiens (`js/core/bosses.js`, phase 2 `js/core/duel.js:1029-1035`)
Ordre : étage 5 Le Dévoreur, 10 La Matriarche du Givre, 15 Le Roi sans Visage, 20 L'Architecte, 25 L'Éclipse, puis le cycle recommence (30 = Dévoreur…) (`bosses.js:62-64`).
- **Dévoreur** : « Dévorer » arrache des PV à la créature la plus vigoureuse et le renforce (+1 ATQ, +2 en phase 2). Phase 2 « Engloutir » : avale une créature, la digère (−15 % PV/tour) ; une Brisure la libère.
- **Matriarche du Givre** : rassemble le froid un tour, puis Tempête de givre sur toute l'équipe + gel (2 en phase 2). Phase 2 « Carapace de glace » (absorbe 25 % de ses PV ; Infernaux ×2 ; Brisure la brise).
- **Roi sans Visage** : copie une compétence de l'équipe et la retourne. Phase 2 « Mille visages » : résiste (−50 %) à la faction du dernier agresseur.
- **Architecte** : tous les 2 tours, une Loi (silence : compétences +1 PA ; fer : −40 % de dégâts sauf brisé ; écho : renvoie 2 dégâts ; hâte : +1 PA pour toi mais ennemis +30 %). Phase 2 « Effondrement » : compte à rebours de 3 tours puis 45 % des PV à toute l'équipe ; chaque Brisure le repousse.
- **Éclipse** : aspects soleil/lune (faiblesses ×1,6 / résistances ×0,5). Phase 2 « Totalité » : toutes les autres factions −40 %.
- Phase 2 à 50 % des PV (ATQ ×1,2) ; « déchaîné » (phase 2 dès le début) en Cauchemar ou dès l'étage 30 (`game.js:50,826`).
- **Runes** : 3 runes, chacune −10 % de dégâts subis ; chacune cède à une action (Brisure, Marque consommée, parade parfaite, faiblesse, 6 poisons, Assaut conjoint, serviteurs abattus) ; les trois brisées → Fêlé (`duel.js:1362-1401`).
- Victoire : 25 % de chance que la carte du gardien (HR, M ou S) rejoigne la collection (`game.js:25,951-955`) ; **coffre** la première fois seulement (bois aux étages 5-15, fer au 20, or au 25) (`game.js:971-976`).

### 7.4 Talents « Don de l'Abîme » (`skills.js:187-202`, `game.js:849-867`)
Après chaque élite ou gardien vaincu : 3 propositions (créature + talent), une seule choisie, pour l'expédition en cours. 12 talents proposés : Brise-garde, Sceau de garde, Sangsue (30 % de vol de vie), Épines (2 dégâts renvoyés), Faim abyssale, Élan, Rémanence, Dernière muraille, Vigilance, Ferveur ardente (compétence −1 PA), Ténacité (tient à 1 PV), Perce-armure.

### 7.5 Bénédictions de l'autel (`descent.js:12-18`, `skills.js:173-182`)
12, pour toute l'expédition : Lames affûtées (+1 ATQ), Vigueur (+20 % PV max et soin complet), Sceau protecteur (bouclier en début de combat), Avidité (+30 % d'éclats), Lame-miroir, Marteau du Sceau (+1 Brisure), Fiole noire, Relais d'ombre, Curée, Sursis, Faveur du destin (+2 aux dés), Braise sacrée (+1 Ferveur par combat). On peut revenir de l'autel pour choisir un autre bonus (`game.js:1002-1007`).

### 7.6 Règle du jour (`descent.js:161-179`)
Une parmi 7, la même pour tous : Furie · faction (+25 % ATQ pour cette faction), Sommeil · faction (−25 % PV), Sources bénies (sources à 60 %), Ruée vers les éclats (+50 % d'éclats), Nuit du pouvoir (Ferveur de départ 4), Chasse aux élites (chaque élite : coffre de bois + éclats ×2), Abysse instable (+25 % de dégâts pour tous).

### 7.7 Modes
- **Maudite** (option sous « Descendre », seulement s'il reste une torche) : coffre +1 qualité, mais **rien** si l'équipe tombe ; confirmation demandée (`descent.js:59,309`, `game.js:1100-1110`).
- **Cauchemar** : s'ouvre au record de l'étage **20** ; ennemis +35 % PV et +25 % ATQ, gardiens déchaînés dès le début, coffre +1 qualité, éclats ×1,5 ; record séparé (`game.js:49,590,824`, `descent.js:304`).

### 7.8 Coffre de fin selon la profondeur (`descent.js:29-31`, `game.js:1100-1110`)
Rien avant l'étage 3 ; étages 3-7 bois, 8-15 fer, 16-24 or, 25+ abyssal. Équipe tombée ou abandon : coffre d'une qualité en dessous (rien si maudite) et **moitié des éclats** (`game.js:1084-1110`). Remonter : tout est gardé. Chaque étage franchi donne aussi 8 XP de joueur (`game.js:1126`).

### 7.9 Éclats de la Descente (×0,15, étage plafonné à 25) (`game.js:878-903,958-966`)
| Étage | Combat | Élite | Gardien | Trésor | Nommé | Objectif |
|---|---|---|---|---|---|---|
| 1 | 2 | 3 | — | 3 | — | 1 |
| 5 | 3 | 5 | 8 | 7 | 6 | 1 |
| 10 | 4 | 8 | 13 | 11 | 9 | 2 |
| 15 | 6 | 11 | 17 | 16 | 12 | 3 |
| 20 | 7 | 14 | 22 | 20 | 15 | 3 |
| 25+ | 9 | 17 | 26 | 25 | 18 | 4 |
Multiplicateurs : Avidité ×1,3, Ruée ×1,5, Cauchemar ×1,5, libre ×0,5 (`game.js:892-896`). Les éclats sont versés à la fin de l'expédition (moitié si défaite). Le vrai gain est donc le **coffre**.

### 7.10 Abandon
Bouton « Abandonner l'expédition » pendant l'expédition et dans la pause du combat : « Compte comme une défaite » (`descent.js:140`, `duel-ui.js:937`).

### 7.11 Classement du jour, saison, chasse
- Classement du jour : meilleur étage de chaque joueur pour le donjon du jour, top 30 ; nécessite compte + pseudo ; pas en Mode Créateur (`js/screens/descent.js:113-125`, `js/cloud/sync.js:133-139`).
- **Saison** = mois calendaire (`renown.js:75-87`) : paliers de profondeur (expéditions avec coffre) récompensés une fois par mois : étage 5 → 80 éclats ; 10 → coffre de fer ; 20 → coffre d'or ; 30 → 250 éclats ; 40 → coffre abyssal. Remise à zéro le 1er du mois.
- **Chasse** (Bestiaire) : par espèce vaincue, Découverte (1), Étude (5), Maîtrise (15 : +1 dégât contre elle), Trophée (40 : +100 éclats) (`descent.js:47-57`, `game.js:940`).

### 7.12 Difficulté de référence
Niveau de créature attendu à l'étage f : round((f − 6) × 0,75), entre 1 et 10 (étage 10 → 3, étage 15 → 7, étage 19+ → 10) (`descent.js:40`). Le mémo du projet indique « étage moyen ≈ 12 à 14 en normal » pour l'outil `fuzz.mjs` (CLAUDE.md §2) ; mesure faite ici : 12,8 (joueurs simulés à niveaux aléatoires, la moitié démarrant en profondeur : non représentatif d'un débutant).

### 7.13 Déroulé d'une expédition, écran par écran (`js/screens/descent.js`, `js/core/game.js:591-1130`)
1. **Vestibule** (Aventure › Descente) : record, torches (3 icônes), équipe (5 vignettes), pouvoir d'équipe et budget, « Modifier l'équipe », gros bouton **Descendre** (ou « Descendre (sans coffre) »), options Maudite / Cauchemar avec bouton d'explication, Règle du jour, tuiles Saison / Classement / Comment ça marche (6 étapes) (`descent.js:44-70`, `29`).
2. **Portes** de l'étage : 1 à 2 portes (Combat, Élite) ou la porte du Gardien ; chaque porte affiche à l'avance ce qu'elle rapporte (éclats, cendres, bonus proposés, talent possible) (`game.js:778-783`). Gardien : présentation qui attend un toucher (CLAUDE.md §4).
3. **Combat** (§6). Pause possible (croix en haut) avec « Abandonner l'expédition ».
4. **Victoire** : butin et état de l'équipe ; si élite/gardien et une créature sans talent : choix d'un **talent** obligatoire avant le bonus ; puis **bonus** (Source / Autel / Trésor) (`descent.js:150-180`, `game.js:869-890`).
5. **Palier** : « Si tu remontes » (coffre et éclats actuels) ou « Descendre à l'étage N+1 » (avec mention « Coffre amélioré » aux étages 3, 8, 16, 25) ; entre deux étages on peut toucher deux créatures pour échanger leur place (les 3 premières combattent) (`descent.js:142-148`, `38-39`).
6. **Fin** (remontée, équipe tombée ou abandon) : résumé (record, exploits, créature MVP si ≥ 2 ennemis achevés, prochain palier de coffre, progression vers le prochain booster), bouton « Ouvrir mon coffre », « Partager », « Continuer » (`descent.js:89-110`, `game.js:1100-1130`).
- Une créature à 0 PV à la fin d'un combat reste tombée pour toute l'expédition (seul le pouvoir Renaissance relève, pendant le combat). Les PV des survivantes ne remontent entre deux combats qu'avec la Source, la bénédiction Vigueur ou l'autel sans bénédiction restante (soin complet) ; pendant un combat, avec la Prière, Souffle de vie, Sceau du Serment, etc. (`game.js:911-925,869-890,1008-1016`).
- Une expédition commencée la veille reste jouable ; elle ne compte pas pour le record du jour ni les missions du jour (`game.js:1018-1024`).

---

## 8. Duels des Sceaux (`js/core/sceaux.js`, `js/screens/sceaux.js`)

### 8.1 Déblocage
Après le **premier gardien vaincu** (étage 5) ; avant : « Encore scellés » (`js/screens/sceaux.js:50-53`, `js/core/game.js:622`).

### 8.2 Règles
- Plateau 3 × 3 ; chaque joueur a 5 cartes ; chaque carte a 4 valeurs (haut, droite, bas, gauche) de 1 à 10 (« A ») ; **total 20 pour toutes les cartes** — la rareté rend seulement le profil plus tranché (`sceaux.js:1-11,17,27-38`).
- On pose une carte sur une case libre ; une valeur strictement supérieure à la valeur d'en face d'une carte adverse voisine la capture. Après 9 poses : cartes de chaque couleur sur le plateau + carte restée en main ; à 5-5, celui qui tient la case centrale gagne (`sceaux.js:4-7,236`).
- Pouvoirs de rareté : **Inviolable** (HR et S : résiste à la première capture), **Fureur** (M et S : capture aussi à égalité en étant posée) (`sceaux.js:57-61`).
- Règles spéciales (`sceaux.js:43-54`) : Classique, Cases sacrées, Plateau instable, Fraternité, Identique, Somme, Abîme, Usure, Archives, Néant.
- Main de 5 cartes choisie par le joueur (« Composer ma main »), sinon main conseillée ; complétée par les cartes de départ prêtées (`sceaux.js:126-145`, `game.js:612-621`).

### 8.3 Les 8 rivaux (dans l'ordre, chacun débloqué en battant le précédent) (`sceaux.js:71-89`)
| # | Rival | Règle | Récompense / victoire | Victoires d'un bon joueur (CLAUDE.md §4 ter) |
|---|---|---|---|---|
| 1 | Ilda, l'Initiée | Classique | 20 | ~90 % |
| 2 | Maître Orvel | Identique | 30 | ~83 % |
| 3 | Sœur Vesna | Cases sacrées | 40 | ~63 % |
| 4 | Le Maître des Sceaux | Somme | 55 | ~70 % |
| 5 | L'Écho de l'Abîme | Abîme | 70 | ~52 % |
| 6 | Mammon | Usure | 80 | ~38 % |
| 7 | L'Archiviste | Archives | 90 | ~33 % |
| 8 | La Souveraine du Néant | Néant | 100 | ~33 % |
Mains des rivaux de plus en plus rares (niveau 1 : C,C,C,PC,PC → niveau 5 : R,R,HR,HR,M) (`sceaux.js:106-119`).

### 8.4 Revanches implacables
Après une victoire contre un rival : bouton « Revanche implacable » (une étoile de plus, main plus rare, jeu plus fin), récompense ×1,5 (30 à 150), **+150 éclats la première fois** (`sceaux.js:90-95`).

### 8.5 Défi du jour
Un rival débloqué et une règle tirés selon la date (`sceaux.js:313-318`) ; une fois par jour : victoire **+40 éclats**, nul +10 (`game.js:673,680`).

### 8.6 Récompenses et plafonds (`sceaux.js:95`, `game.js:660-690`)
- **5 victoires payées par jour** (récompense du rival) ; au-delà, « plafonné ».
- Première victoire contre chaque rival : +100 ; première revanche implacable : +150 (soit 2 000 éclats de primes uniques au total).
- **Butin** : une fois par jour, après une victoire, garder une carte adverse capturée (rareté HR au plus) (`sceaux.js:97-102`, `game.js:679,691-697`).
- Titres : Initié des Sceaux (1re victoire), Maître des Sceaux, Briseur d'Échos, Souverain des Sceaux, Éveilleur des Sceaux (toutes les revanches) ; cadre des Sceaux en battant l'Écho (`sceaux.js:103`, `game.js:675-677`).
- Aucune XP de joueur n'est donnée par les Sceaux (non trouvé dans `sceauxFinish`).

### 8.7 Déroulé d'une partie (`js/screens/sceaux.js`, `js/core/sceaux.js:142-160`)
1. Écran Sceaux : liste des 8 rivaux (verrouillés tant que le précédent n'est pas battu), défi du jour, « Composer ma main », règles repliables (6 étapes « Comment jouer »).
2. Le premier joueur est tiré à pile ou face (`sceaux.js:148`). Le rival dit sa phrase d'accueil (`screens/sceaux.js:243`).
3. Toucher une de ses cartes puis une case libre ; animation des captures (« Inviolable ! » si une capture est bloquée). L'IA joue ensuite (force et part de coups imparfaits propres à chaque rival, `sceaux.js:71-89`, `278`).
4. Fin : victoire / défaite / nul, éclats gagnés (ou « plafonné »), titre éventuel, choix du **Butin** (une carte adverse capturée, une fois par jour).
- Une partie dure 9 poses (5 ou 4 du joueur selon qui commence). Pas de limite de parties par jour : seules les 5 premières victoires du jour sont payées.

---

## 9. Progression à long terme

- **Niveau du joueur** : XP pour passer du niveau n à n+1 = 150 + 90 × (n − 1) (`config.js:102`) ; cumul : niveau 5 = 1 140 XP, niveau 10 = 4 590, niveau 15 = 10 290, niveau 20 = 18 240. Sources d'XP : booster 10, découvertes 10-300, doublon 2, mission 20, niveau de carte 10, 8 par étage franchi en fin d'expédition. Récompense : 20 éclats/niveau, tous les 5 niveaux 50 éclats + 1 ticket premium (`config.js:103`).
- **Titres de niveau** : 1 Novice des Sceaux, 3 Lecteur de grimoires, 6 Chercheur de reliques, 10 Occultiste, 15 Archiviste interdit, 20 Gardien du Bestiaire, 30 Briseur de sceaux, 40 Voix du Néant (`config.js:106-109`). 42 titres au total (niveaux, succès, ensembles, Sceaux) (`js/core/unlocks.js`).
- **Cadres** : 17 définis (`config.js:111-117`), 15 obtenables avec une source connue (fer de départ, or, prisme, titans, néant, 7 factions, profondeurs, chasseur, sceaux) ; « Reliques » et « Guerre » : source non trouvée.
- **Succès** : 35 (`data/achievements.json`) — collection (1, 25, 50, 100, 150, 200, 300, 500 créatures ; première R/HR/M/S), factions (1, 7), ensembles (1, 6), lignée, boosters (1, 10, 50, 150, 300), finitions (1, 15), 1re carte brûlée, 7 offrandes, profondeur (5, 10, 15, 20), chasse (25, 100 espèces ; 5 maîtrises ; 1 trophée), carte niveau 5.
- **Ensembles** (17) et **royaumes** (7) : §3.6.
- **Saisons mensuelles** : §7.11.
- **Renommée** des créatures : §3.8.
- **Récits du Bestiaire** (`js/core/lore.js:1-12`) : fragments de royaume à 25 %, 50 %, 100 % de chaque faction ; récit de chaque gardien en le battant ; récit des formes corrompues ; **12 relations** entre créatures (prédation +20 %, rivalité +15 %, légende +1 ATQ/+10 % PV) découvertes en combat (`js/core/relations.js:1-5`).
- **Chasse** : §7.11.

---

## 10. Quotidien et en ligne

- **Offrande** + série de 7 jours : §5.1, §5.6.
- **Missions du jour** : 3 tirées chaque jour (même tirage pour tous ce jour-là, types tous différents) parmi 11 : Ouvre 2 boosters (30), Ouvre 3 boosters (40), Découvre 3 nouvelles créatures (30), Découvre 5 (40), Obtiens 3 cartes d'une faction (30), Obtiens 2 Rares ou mieux (35), Obtiens une variante (35), Brûle 3 cartes (30), Atteins l'étage 4 (40), Remporte 5 combats dans la Descente (35), Ouvre 2 coffres (30) (`config.js:131-143`, `game.js:285-302`). Réclamation manuelle sur l'Accueil.
- **Coffre de la semaine** : §5.5.
- **Événement de la semaine** : §4.6.
- **Joueurs en ligne** : compteur temps réel sur l'Accueil (Supabase Realtime, clé d'appareil anonyme) (`js/cloud/presence.js:1-12`).
- **Classements** : Descente du jour (top 30) ; Tirage (semaine top 10, meilleurs tirages du jour top 10) (`shadow.js:84-108`).
- **Profil public** (serveur) : pseudo, avatar, titre, niveau, nombre de cartes possédées, badge (`supabase/01-comptes.sql:5-13`). Aucun écran de consultation du profil d'un autre joueur trouvé : on voit pseudo, avatar et badge dans les lignes de classement.
- **Signalement** : toucher le pseudo d'un joueur dans un classement → signaler (5 motifs) ou masquer sur l'appareil ; masqué pour tous à partir de **3 signaleurs différents** ; 20 signalements par jour au plus par joueur (`js/ui/report.js:7-13`, `supabase/06-signalements.sql:79-86`). Filtre de pseudos (`js/core/moderation.js`).

---

## 11. Audio et visuel

- **Musiques** (fichiers `assets/music/`, faites avec ElevenLabs) : 6 ambiances — Accueil (aussi Collection, Sanctuaire), Boosters (aussi Coffres, Tirage), Descente, Combat, Gardien (dès qu'un gardien vivant est à l'écran), Sceaux (`js/ui/music.js:41-44,242-254`). En boucle ; écoute possible dans Réglages.
- **Sons** : 67 effets dans `assets/sfx/manifest.json` (coups, parade, esquive, gel, poison, révélations par rareté reveal-c/pc/r/hr/m/s, suspense, victoire, défaite, coffre, etc.). Aucun bip (CLAUDE.md §3). Vibrations optionnelles (iPhone : iOS 18+).
- **Ouverture de booster selon la rareté** (`js/screens/opening.js:100-101,244-322`) : aura sur le paquet si la meilleure carte est HR+ ; dernière carte < HR : petit temps de suspense (0,48 s, grondement) ; HR : la carte tremble, l'écran s'assombrit 0,6 s, vibration, flash ; M/S : 1,3 s de tension, bandeau « Mythique » / « Carte secrète », 36 particules ; finition : bandeau du nom de la finition. Textes d'indice : « Cette carte vibre sous tes doigts. » (HR), « Quelque chose d'immense attend derrière ce sceau… » (M/S).
- **Fin de combat** : blason « Victoire » / « Défaite » (`duel-ui.js:664-669`) ; puis écran de victoire de la Descente : éclats, cendres, coffre, exploits, butin de l'ennemi nommé, première victoire, recrutement de gardien, objectif, relation découverte, nouvelles rencontres, état de l'équipe, puis talent ou bonus (`js/screens/descent.js:150-180`). Défaite : bilan « Ce qui s'est passé » (qui a fait le plus de dégâts, attaque décisive, conseil) et « Voir le dernier tour ennemi » (`js/screens/descent.js:93-109`, `js/core/duel.js:1716-1734`). Bouton « Partager » le résumé.
- Annonces (succès, niveaux, Renommée, saison) en file, une à la fois ; au-delà de 2 événements simultanés, regroupées en une seule (`js/main.js:243-262`).

---

## 12. Réglages, sauvegarde, hors ligne

- **Réglages › Jeu** (`js/screens/settings.js:31-48`) : effets sonores + volume, musique + volume, écoute des ambiances, son en mode silencieux, vibrations, animations (selon l'appareil / réduites / complètes), défense active (manuelle / automatique), décor des combats (riche / sobre), ouverture rapide des boosters. Valeurs par défaut : son et musique activés, volume 0,7, musique 0,55, défense manuelle, décor riche (`js/core/save.js` defaultSave).
- **Tutoriels** : guide de départ + 29 bulles relisibles, « Réactiver toutes les bulles d'aide » (`settings.js:49-59`).
- **Sauvegarde** : locale après chaque action (`localStorage`, copie de secours, `js/core/game.js:73-83`, `js/config.js:124-125`) ; copier un code, télécharger un fichier, importer ; effacer toute la progression (`settings.js:61-76`). En ligne : envoi quelques secondes après chaque changement et à la mise en arrière-plan ; au démarrage, récupération si la partie a avancé sur un autre appareil (`js/cloud/sync.js:1-2,130-146`).
- **Hors ligne** : une fois connecté, le jeu reste jouable hors ligne (CLAUDE.md §1) ; service worker pour la version web (`js/main.js:327-345`). Hors ligne : pas de classement, pas de Tirage, compteur « Hors ligne ». Images introuvables masquées (`js/main.js:320-322`).
- Mise à jour web : annonce « Une nouvelle version d'ABYSSAL est prête. Touche ici pour l'installer. » (`js/main.js:332`).
- Compte : déconnexion, suppression de compte (`js/screens/account.js:118,139`).

---

## 13. Points faibles potentiels visibles dans le code (factuels)

### Accès et premier contact
1. Aucune partie possible avant la création d'un compte (e-mail + mot de passe à 5 contraintes) ; un premier lancement sans réseau bloque à l'écran de compte (`js/ui/gate.js:11-15`).
2. L'inscription ne demande pas de pseudo ; sans pseudo, le joueur n'apparaît pas au classement et le Tirage des Ombres est refusé par le serveur ; le réglage est dans Sanctuaire › Compte (`account.js:100-105`, `supabase/05-tirage.sql:455`).
3. Enchaînement d'entrée : intro 2,6 s + toucher + compte + guide de 8 pages avant le premier booster.
4. Réglages › Sauvegarde affiche encore « Ta progression est enregistrée **uniquement sur cet appareil** » alors que le compte est obligatoire et synchronisé (`settings.js:64`).

### Textes et vocabulaire
5. 29 bulles d'aide (≈ 1 670 mots), dont 9 de plus de 60 mots ; le guide fait 8 pages ; les deux premières bulles de combat (cb-intro 72 mots, cb-ult 74 mots) sont les plus longues.
6. Restes d'anciens noms : la bulle « Le pouvoir d'équipe » dit « Sceau du Gardien » alors que le pouvoir s'appelle « Sceau du Serment » (`tutos.js:25` vs `army.js:134`) ; la bulle « Duels des Sceaux » parle de « trophée » alors que l'écran dit « Butin » (`tutos.js:22` vs `screens/sceaux.js:212`) ; le titre « Éveilleur des Sceaux » subsiste alors que les revanches sont « implacables » (`game.js:675`, `unlocks.js:24`).
7. Deux bulles ne s'affichent jamais d'elles-mêmes : « Lire les intentions » (cb-intent) et « Son, musique et vibrations » (aucun appel trouvé).
8. Difficultés de dés : la description du Coup d'estoc n'indique pas le +3 contre les gardiens ; le kit déclare des DD (10/9/10) différents de ceux réellement utilisés (Entrave 8, `skills.js:32-50` vs `duel.js:619-629`) — l'écran affiche toutefois les chances réelles en visant.

### Nombre de mécaniques
9. Le combat superpose : initiative, PA individuels, Ferveur commune, pouvoir d'équipe (5 variantes), 7 rôles × compétence + compétence propre (niveau 6) + passifs (32 passifs dans `kits.js:104-137`) + Éveil + Apogée, Brisure/Fêlé/Brisé et coups de rupture, Marque, Brèche, Riposte, enchaînement, Hâte, Assaut conjoint, permutation et 7 effets d'entrée, poison/détonation, gel/ralenti, provocation, proie désignée, faiblesses de faction (cycle de 7), relations, 4 traits ennemis, 9 familles d'IA, objectifs bonus (8), runes (7 types), phases 2 (5), Lois (4), aspects (2), dés D20 avec frappe rythmée, défense active (esquive/parade), Épuisement au tour 15. Hors combat : 12 talents, 12 bénédictions, 7 règles du jour, 2 modes.
10. Les bulles de combat se déclenchent au fil des événements : un joueur peut voir plusieurs bulles dans un même combat (objectif, traits, Brisure, runes, compétence à la suite, `duel-ui.js:840-848`).

### Écrans chargés
11. Accueil : jusqu'à 8 blocs ; « Aujourd'hui » peut contenir 6 lignes (offrande, coffre de semaine, 3 missions, coffres).
12. Écran de combat : frise d'initiative, règles/objectif, 3 ennemis avec bandeaux d'intention et pastilles d'état, message, grille d'actions (jusqu'à 7 boutons : Attaque, compétence de rôle, compétence propre, Défense, Permuter, Hâte, Assaut conjoint, `duel.js:571-588`, `duel-ui.js:173`), 3 alliées, barre Ferveur/pouvoir, « Passer ».
13. Vestibule de la Descente : torches, équipe, pouvoir/budget, bouton, options Maudite/Cauchemar, règle du jour, 3 tuiles (Saison, Classement, Comment ça marche).

### Économie et rythme
14. Les éclats de combat de la Descente sont réduits à 15 % (2 éclats pour un combat de l'étage 1), alors que le panneau des éclats dit qu'on en gagne « surtout dans la Descente (combats, trésors, gardiens) » (`main.js:95`, `game.js:27`) ; l'essentiel vient des coffres de fin d'expédition.
15. Booster gratuit non cumulable ; coffre de la semaine conditionné à 5 jours ; série d'offrande remise à 1 au premier jour manqué.
16. Aucun combat automatique (retiré en v240) : chaque combat de chaque étage se joue à la main ; 3 expéditions par jour pour les coffres.
17. Fenêtres de défense active courtes (esquive 160-320 ms, parade 32-64 ms) sur écran tactile ; l'option automatique ne fait jamais de parade (moins de Ferveur et de PA).
18. Duels des Sceaux fermés tant que le gardien de l'étage 5 n'est pas battu ; Cauchemar fermé avant l'étage 20.
19. Une « Torche bénie » existe dans le code mais n'est vendue nulle part.
20. La liste de cartes du Tirage des Ombres côté serveur (dépôt) compte 395 cartes sur 500.

### Limites techniques
21. Fonctions en ligne dépendantes de Supabase (classements, Tirage, présence, sauvegarde en ligne) ; limite de quelques e-mails par heure pour « Mot de passe oublié » (CLAUDE.md §1).
22. Mise à jour de la version web via service worker : il faut parfois rouvrir l'app deux fois (CLAUDE.md §0).
23. Navigation privée / stockage bloqué : avertissement « ta progression ne sera pas conservée après fermeture » (`main.js:305`).

---

## 14. Glossaire

- **Éclats** : monnaie principale ; achète les boosters (400/500/550).
- **Cendres** : issues de la Fournaise, des combats et des coffres ; servent aux niveaux de carte, à Sublimer et à déchiffrer un nom.
- **Fournaise** : brûler des cartes (surtout les doublons) contre des cendres.
- **Sublimer** : obtenir la finition suivante d'une carte contre des cendres.
- **Finition / variante** : Normale, Holographique, Feuille d'or, Cosmique ; purement visuelle.
- **Ticket** : booster à ouvrir gratuitement (standard ou premium).
- **Torche** : une des 3 expéditions avec coffre du jour.
- **Descente** : expédition roguelite étage par étage ; **descente libre** = après les torches, sans coffre.
- **Maudite / Cauchemar** : modes à risque ; Cauchemar dès le record de l'étage 20.
- **Gardien** : boss tous les 5 étages ; **déchaîné** = phase 2 dès le début.
- **Élite** : ennemi renforcé (PV ×1,6, jauge de Brisure 6), mieux payé, ouvre un talent.
- **PA** : points d'action propres à chaque créature (2 au départ, +1 par tour, 6 max).
- **Ferveur** : jauge commune de l'équipe (6) ; pleine, elle lance le pouvoir d'équipe ; 3 gardés entre deux combats.
- **Pouvoir d'équipe** : Sceau du Serment, ou Renaissance / Cataclysme / Croc du Néant / Égide mécanique avec une Mythique ou Secrète.
- **Brisure** : jauge des élites et gardiens ; vide = **Fêlé** ; un **coup de rupture** le rend **Brisé** (perd son action, +50 % de dégâts subis, +5 aux dés).
- **Coup de rupture** : attaque d'un Protecteur, Coup d'estoc, Raz-de-marée, ou coup qui consomme une Marque.
- **Marque** : le prochain coup d'une autre créature fait +50 % et +2 Brisure.
- **Brèche** : prochain coup d'un autre allié perce le bouclier, +20 %, +3 Brisure.
- **Riposte** : charges du Protecteur (+1 dégât et +1 Brisure par charge, 3 max).
- **Hâte** : le Soutien fait jouer une alliée juste après lui.
- **Assaut conjoint** : deux créatures frappent ensemble (3 Ferveur, 1 fois par combat).
- **Esquive / parade parfaite** : défense active en touchant au bon moment.
- **Intention** : attaque annoncée d'un ennemi (« ! » dans la frise).
- **Runes** : 3 sceaux d'un gardien (−10 % de dégâts chacun).
- **Don de l'Abîme / talent** : règle bonus pour une créature, choisie après une élite ou un gardien.
- **Bénédiction** : bonus d'autel pour toute l'expédition.
- **Règle du jour** : modificateur de la Descente, le même pour tous.
- **Renommée** : points d'une créature (Vétéran 10, Héros 40, Légende 100).
- **Chasse** : compteur de victoires par espèce (Découverte, Étude, Maîtrise, Trophée).
- **Saison** : paliers de profondeur du mois.
- **Sceaux / Duels des Sceaux** : jeu de plateau 3 × 3 ; **implacable** = revanche plus dure ; **Butin** = carte adverse gardée une fois par jour ; **Inviolable / Fureur** = pouvoirs de rareté.
- **Tirage des Ombres** : booster quotidien en ligne qui ne donne pas les cartes, seulement des points de classement.
- **Pitié / garantie** : HR+ au plus tard au 25e booster, M+ au 100e.

---

## 15. Repères chiffrés pour la simulation (calculés à partir des règles, non mesurés en jeu)

### 15.1 Jour 1 d'un nouveau joueur
- Ressources de départ : 0 éclat, 60 cendres, 2 tickets standard ; +1 booster gratuit du jour → 3 boosters = 9 cartes, dont la 3e de chaque booster au moins Peu commune.
- Gains automatiques à l'ouverture : +10 XP par booster, + éclats et XP de découverte (une Commune nouvelle : 1 éclat, 10 XP ; une Peu commune : 2 éclats, 20 XP ; une Rare : 3 éclats, 40 XP). Ordre de grandeur pour 9 cartes en majorité nouvelles : ≈ 10-20 éclats et ≈ 150-250 XP → niveau 2 (150 XP) atteint, niveau 3 à 390 XP.
- 60 cendres = 6 montées de Commune du niveau 1 au 2 (10 chacune), ou une Commune jusqu'au niveau 3 (10 + 20) et deux autres au niveau 2.
- Offrande du jour 1 : 50 éclats. Missions : 3 × 30-40 éclats (si réalisables le jour 1 : « Ouvre 2 boosters », « Découvre 3 nouvelles créatures », « Ouvre 2 coffres »…).
- Première victoire en combat : +50 éclats. Première expédition : étage 1 = 1 combat simple guidé ; coffre de bois seulement si l'on franchit l'étage 3.
- Premier booster acheté (400 éclats) : en pratique pas avant le jour 2 ou 3 sans coffre de fer ni primes.

### 15.2 Durées indicatives
- Ouverture d'un booster : déchirure + 3 révélations ; ≈ 0,5 à 2,5 s d'animation par carte selon la rareté (§11), récapitulatif ; option « Ouverture rapide ».
- Combat : 2 à 18 tours selon le type (§6.16) ; chaque tour = 3 actions du joueur au plus (une par créature au combat) + réponses de défense active.
- Une expédition jusqu'à l'étage 3 = 3 combats + 2-3 choix de bonus ; jusqu'à l'étage 8 = 8 combats dont 1 gardien.
- Partie des Sceaux : 4-5 poses du joueur.

### 15.3 Plafonds et rythmes
| Élément | Rythme |
|---|---|
| Booster gratuit | 1/jour, non cumulable |
| Offrande | 1/jour, 50 → 80 éclats sur 7 jours, coffre de fer tous les 7 jours d'affilée |
| Missions | 3/jour, 30-40 éclats chacune |
| Expéditions avec coffre | 3/jour (illimité sans coffre) |
| Coffre de gardien | 1re victoire contre chaque gardien seulement (5 gardiens) |
| Sceaux payés | 5 victoires/jour ; défi du jour 1/jour ; Butin 1/jour |
| Tirage des Ombres | 1/jour (+15 éclats) ; prix hebdomadaire top 3 si ≥ 5 participants |
| Coffre de la semaine | 1/semaine (5 jours joués) |
| Saison | 5 paliers/mois |
| Pitié | HR+ ≤ 25 boosters ; M+ ≤ 100 boosters |

### 15.4 Coût pour « maximiser » une équipe de départ
Équipe de 5 Communes : 5 × 450 = 2 250 cendres pour les mettre au niveau 10. Une Commune brûlée rapporte 5 cendres (normale) : il faut donc l'équivalent de 450 doublons de Communes, ou des cendres de combats/coffres (ex. un combat ordinaire à l'étage 10 : 7 cendres ; coffre de fer : 40).
