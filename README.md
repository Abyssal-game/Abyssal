# ABYSSAL — Le Bestiaire interdit

Application d’ouverture de boosters et de collection de cartes dark fantasy, jouable dans le navigateur (iPhone, Safari, ordinateur, tablette) et installable comme application (PWA).

> « Avant le temps, il n’existait que le Néant. Puis quelque chose s’éveilla. »

## Ce que contient cette version

- **335 cartes distinctes** réparties en 7 factions (Infernal, Abyssal, Céleste, Sauvage, Nécrotique, Primordial, Artificiel) et 6 raretés : 110 Communes, 86 Peu communes, 69 Rares, 44 Hyper rares, 19 Mythiques, 7 Secrètes. Chaque carte a son nom, son titre, sa catégorie, une description visuelle, un lore court, ses variantes cosmétiques et un prompt d’illustration.
- **Boosters** standard, de faction, événement (rotation hebdomadaire) et premium, avec probabilités affichées, garanties réelles (Hyper rare au plus tard au 10e booster, Mythique au plus tard au 40e) et ouverture animée carte par carte ou d’un coup.
- **Collection** avec recherche, filtres (faction, rareté, possédées, manquantes, nouvelles), tri (numéro, nom, rareté, puissance, date) et silhouettes mystérieuses pour les cartes non découvertes.
- **Vue détaillée** : grand format inclinable, mode « illustration seule », variantes (holographique, chromatique, corrompue, illustration alternative, cosmique, ancestrale, feuille d’or, Édition des Sceaux), chance réelle d’obtenir la carte, lignée, ensembles.
- **Bestiaire** (encyclopédie et Chroniques débloquées au fil des découvertes), **Factions**, **Succès** (26) et **12 ensembles** thématiques à récompenses, **Profil** (titres, cadres, vitrine, statistiques, historique), **Réglages** (son, animations, taille du texte, contraste, sauvegarde).
- **Économie** : éclats (boosters) et cendres (doublons brûlés, combats de la Descente, coffres ; pour monter les niveaux ou déchiffrer un nom — l’invocation de cartes a été retirée). Offrande quotidienne facultative et booster standard gratuit qui se recharge toutes les 6 heures (2 en réserve au maximum), sans pénalité.

### Ce qui est provisoire

- **Les illustrations sont provisoires.** Elles sont générées par le jeu (silhouettes en contre-jour, décors propres à chaque faction) à partir de la fiche de chaque carte. Elles se remplacent une par une par de vraies images, sans toucher au code (voir plus bas).
- **La sauvegarde est locale** (localStorage de l’appareil). Elle n’est synchronisée nulle part ; l’export/import de sauvegarde sert à la conserver ou à la transférer.

## Boucle de jeu

- **L’équipe de cartes** (`js/core/army.js`, écran `js/screens/army.js`) : les cartes sont des créatures qui combattent. 3 au combat, 2 en réserve, budget de 15 points selon la rareté (Commune 1 … Secrète 6). Chaque doublon fait monter la carte de niveau (10 au plus). Le rôle (et la capacité de duel) est déduit des capacités de la carte. Une Mythique ou Secrète de l’équipe remplace le Sceau du Gardien par son pouvoir.
- **Le combat tactique** (règles `js/core/duel.js`, données `js/core/skills.js`, écran `js/screens/duel-ui.js`) : 3 points d’action par tour pour l’équipe (2 actions par créature au plus). Chaque rôle a un kit : attaque de base, compétence signature (Rempart, Coup d’estoc, Prière, Contagion, Entrave, Marque, Raz-de-marée) et passif. La Ferveur (6 au plus, gardée entre les combats) paie les compétences et le pouvoir d’équipe. Jets de D20 pour les compétences à risque (chances et modificateurs affichés avant le lancer). Ennemis répartis en familles de comportement (prédateur, assassin, berserker, protecteur, mage, parasite, contrôleur, soutien, gardien) qui annoncent leurs intentions. Défense active (esquive, parade parfaite) sur les attaques dangereuses, réglable. Jauge de Brisure pour les élites et les gardiens ; gardiens en deux phases. Faiblesses entre factions. Le hasard est enregistré dans l’état du combat (reprise exacte, tests reproductibles). Les anciens combats en cours sont convertis (`upgradeDuel`).
- **La Descente** (`js/core/descent.js`, écran `js/screens/descent.js`) : 3 expéditions avec coffre par jour (puis sans coffre), deux portes par étage, gardien tous les 5 étages. Les ennemis sont les créatures du Bestiaire, corrompues, plus fortes en profondeur ; posséder la carte d’une créature (ou la maîtriser à la chasse) donne +1 dégât contre elle. La profondeur atteinte donne le coffre (bois, fer, or, abyssal) ; bois et fer donnent des éclats, or et abyssal un booster (`CHESTS`). Coffres illustrés : `assets/chests/<clé>.webp` et `<clé>-open.webp` (liste `chests` du manifeste). Symboles de factions illustrés : `assets/factions/<clé>.webp` (liste `factions`).
- Les anciens héros, l’Arsenal et les pactes ont été retirés : à la première ouverture, `convertHeroes()` (dans `js/core/game.js`) change l’expérience et l’équipement en éclats et garde les coffres.
- **Règle du jour** (`dailyRule` dans `js/core/descent.js`) : une règle différente chaque jour pour la Descente (furie ou sommeil d’une faction, sources bénies, ruée vers les éclats, nuit du pouvoir, chasse aux élites, Abysse instable). **Bulles d’aide** (`js/ui/coach.js`) : montrées une fois, réactivables dans les Réglages.
- **Rituel d’élévation** (`js/screens/ritual.js`) : faire monter une carte d’un cran (normale → holographique → or → cosmique) contre des cendres. Il réussit toujours et ne touche pas aux doublons (qui donnent les niveaux). Réglages dans `RITUAL` (`js/config.js`).
- **Missions du jour**, **classeur** par faction et **statistiques de chance** dans le profil.

## Lancer le jeu

Aucune installation n’est nécessaire : ce sont des fichiers statiques.

```bash
python3 -m http.server 8080      # ou : npm start
# puis ouvrir http://localhost:8080
```

(Ouvrir `index.html` directement en double-cliquant ne fonctionne pas : les navigateurs bloquent le chargement des données JSON hors serveur.)

## Version de production

Il n’y a **pas d’étape de construction** : le dossier tel quel est la version de production. Avant chaque publication :

1. `npm test` — tests du moteur (tirages, garanties, boosters gratuits, sauvegarde, succès).
2. `npm run check` — validation des données (identifiants, champs, capacités, ensembles, illustrations déclarées).
3. Incrémenter `VERSION` dans `sw.js` (par exemple `abyssal-v2`) pour que les joueurs reçoivent la mise à jour. Le jeu affiche alors « Une nouvelle version est prête ».

Node.js 18 ou plus suffit pour ces commandes ; aucune dépendance n’est à installer.

## Déployer sur GitHub Pages

1. Pousser le contenu du dossier à la racine d’un dépôt (branche `main`).
2. Dans le dépôt : **Settings → Pages → Build and deployment → Deploy from a branch**, choisir `main` et `/ (root)`.
3. Le jeu est disponible à l’adresse publique https://abyssal-game.github.io/Abyssal/ et la page de confidentialité à https://abyssal-game.github.io/Abyssal/confidentialite.html.

Tous les chemins sont relatifs : le jeu fonctionne dans un sous-dossier. Sur iPhone : ouvrir le lien dans Safari, bouton Partager, « Sur l’écran d’accueil ». Après une première visite, le jeu fonctionne hors ligne (les polices Google sont mises en cache si elles ont été chargées une fois).

## Ajouter de nouvelles cartes

Les cartes sont dans `data/cards/<faction>.json`. Ces fichiers **font foi**.

1. Ajouter un objet **à la fin** du fichier de la faction, avec le numéro suivant (`INF-055`, etc.). Ne jamais renuméroter ni supprimer une carte existante : les sauvegardes des joueurs sont indexées par identifiant.
2. Champs : `id`, `number`, `name`, `title`, `faction`, `rarity` (`C`, `PC`, `R`, `HR`, `M`, `S`), `category`, `power` (sert au tri), `visual`, `lore`, `evolution` (ou `null`), `sets`, `variants`, `art`, `image`, `artPrompt`. Le plus simple est de copier une carte proche.
3. Pour l’ajouter à un ensemble : ajouter son identifiant dans `cards` de l’ensemble (`data/sets.json`) et le nom de l’ensemble dans `sets` de la carte.
4. Lancer `npm run check` puis `npm test`, puis incrémenter `VERSION` dans `sw.js`.

Le champ `art` décrit l’illustration provisoire : `form` (`hum`, `beast`, `dragon`, `serpent`, `tentacle`, `wheel`, `golem`, `spectre`, `skeleton`, `bird`, `fish`, `insect`, `tree`, `orb`, `swarm`, `blob`, `object`) et ses paramètres (tête, cornes, ailes, queue, décor…). Voir `js/art/creatures.js`.

## Donner une identité propre à une créature

Chaque créature garde le kit de son rôle (`js/core/skills.js`) et y ajoute son identité (`js/core/kits.js`), débloquée par niveau : **frappe** (niv. 1), **passif** (niv. 3), **compétence propre** (niv. 6, sans Ferveur, avec un temps de recharge) et **Éveil** (niv. 9). Aucune donnée de sauvegarde en plus : seul le niveau déjà stocké compte.

Les 395 identités : 12 écrites à la main (`HAND_KITS`), les autres générées par `node tools/gen-kits.mjs` dans `js/core/kits-data.js` (à relancer après l'ajout d'une carte). Le passif vient de la première capacité de la carte, le second passif (Éveil) de la deuxième ; la frappe dépend de la faction ; la compétence est un modèle du rôle composé d'effets élémentaires (`OPS`), réglé sur un budget de puissance.

Pour écrire une identité à la main :

1. Ajouter une entrée à `HAND_KITS` : `style`, `stat` (répartition attaque / PV, produit proche de 1), `strike` (effets reconnus : `mult`, `hits`, `brk`, `brkCharging`, `pierce`, `poisonMore`, `splashPoison`, `burn`, `healLowest`, `lowBonus`, `lifeShare`), `passive`, `move`, `plus`, `moins`, `synergy`.
2. Un nouveau passif : une entrée dans `PASSIVES` et son effet dans `duel.js` (chercher `passiveOf(`). Une nouvelle compétence : une entrée dans `MOVES` avec `run` (effet), `ai` (quand l’IA la joue), `cd` (recharge) et l’icône peinte `assets/pw/<icon>.webp`.
3. `npm test` vérifie qu’aucun passif ni aucune compétence n’est affiché sans effet. `node tools/balance.mjs` compare des équipes ; `depth()` mesure la profondeur moyenne atteinte en Descente.

## Remplacer les illustrations

1. Produire l’image (format vertical 5:7, idéalement 600 × 840 px, en WebP). Les prompts de toutes les cartes s’exportent avec `npm run prompts` (fichier `prompts.csv`) ; chaque fiche de carte les affiche aussi (« Fiche d’illustration »).
2. La déposer dans `assets/art/` sous le nom de l’identifiant : `assets/art/INF-052.webp` (et `INF-052-alt.webp` pour l’illustration alternative).
3. Ajouter l’identifiant à la liste `available` de `assets/art/manifest.json`.
4. `npm run check` vérifie que chaque image déclarée existe.

Une image déclarée mais introuvable est automatiquement remplacée par l’illustration provisoire : pas de carte vide ni d’image cassée. Les effets de rareté et de variante (cadres, holographie, chromatique…) s’appliquent aussi aux vraies images.

## Remplacer les visuels de boosters

`python3 tools/add-pack.py <clé> <image>` découpe le paquet sur son fond uni et l’enregistre dans `assets/packs/<clé>.webp` (clés : `standard`, `premium`, `event`, et une par faction). Le logo, le nom et la déchirure sont ajoutés par le jeu : l’image ne doit contenir aucun texte.

## Modifier les taux de rareté et l’économie

Tout est centralisé dans `js/config.js` :

- `TABLES` : poids de chaque rareté par type d’emplacement (par défaut 55 / 25 / 13 / 5 / 1,7 / 0,3 %) ;
- `BOOSTERS` : prix, emplacements, contenu de chaque booster ;
- `PITY` : seuils des garanties ;
- `VARIANT_RATES` : chances des variantes ;
- `ECONOMY` : monnaie de départ, récompenses de découverte, cendres des doublons, offrande quotidienne ;
- `FREE_PACK` : fréquence et réserve des boosters gratuits ;
- `XP`, `LEVEL_TITLES` : progression ;
- `EVENTS` : rotation des boosters événement.

Les probabilités affichées dans le jeu sont calculées à partir de ces mêmes valeurs.

## Tester les boosters

- `npm run sim -- 20000` : simule 20 000 ouvertures de chaque booster avec les vraies règles et affiche la répartition obtenue.
- `npm test` vérifie notamment la répartition sur 100 000 tirages, les garanties, les pools de faction et d’événement, l’enregistrement des cartes et les doublons.
- **Mode développeur dans le jeu** : ouvrir le jeu avec `?dev=1` à la fin de l’adresse, ou toucher 7 fois la ligne « Version » dans Réglages. Il permet d’ajouter des éclats, des cendres et des tickets, de forcer une garantie, de simuler 10 000 boosters et de tout débloquer.

## Architecture

```
index.html, manifest.webmanifest, sw.js   page, PWA, cache hors ligne
css/            base.css (fondations), card.css (cartes et variantes), screens.css (écrans)
data/           cartes par faction, factions, ensembles, capacités, succès, lore
js/config.js    raretés, tables, boosters, économie, progression
js/core/        catalog.js (index), boosters.js (tirages), save.js (sauvegarde, migration, export), game.js (état et règles)
js/art/         geometry.js, scenes.js, creatures.js, procedural.js (illustrations provisoires), assets.js (vraies images ou provisoires)
js/ui/          dom.js, icons.js, card.js (composant carte), sound.js (sons synthétisés)
js/screens/     un module par écran
tests/          tests Node (node --test)
tools/          validate, simulate, export-prompts, make-icons
```

La logique (`js/core`) ne dépend pas du navigateur et se teste dans Node. La sauvegarde est versionnée (`SAVE_VERSION`) et migrée automatiquement ; une copie de secours est conservée et restaurée si la sauvegarde principale est abîmée.

## Licence et contenus

Code et textes originaux. Les créatures issues des mythologies, du folklore et de la littérature du domaine public sont réinterprétées pour l’univers d’ABYSSAL.

- Illustrations : générées avec Gemini (Google) à partir de descriptions écrites pour le jeu, puis intégrées au projet. Aucune ne reprend une franchise ou le style d’un artiste nommé.
- Sons et musiques : générés avec ElevenLabs, abonnement payant (usage commercial autorisé, sans mention obligatoire).
- Polices : Cinzel, Alegreya et Alegreya Sans, sous licence SIL Open Font License 1.1, intégrées dans `assets/fonts/` avec leurs licences (`OFL-*.txt`).
