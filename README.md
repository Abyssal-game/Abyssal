# ABYSSAL — Le Bestiaire interdit

Application d’ouverture de boosters et de collection de cartes dark fantasy, jouable dans le navigateur (iPhone, Safari, ordinateur, tablette) et installable comme application (PWA).

> « Avant le temps, il n’existait que le Néant. Puis quelque chose s’éveilla. »

## Ce que contient cette version

- **335 cartes distinctes** réparties en 7 factions (Infernal, Abyssal, Céleste, Sauvage, Nécrotique, Primordial, Artificiel) et 6 raretés : 110 Communes, 86 Peu communes, 69 Rares, 44 Hyper rares, 19 Mythiques, 7 Secrètes. Chaque carte a son nom, son titre, sa catégorie, une description visuelle, un lore court, ses variantes cosmétiques et un prompt d’illustration.
- **Boosters** standard, de faction, événement (rotation hebdomadaire) et premium, avec probabilités affichées, garanties réelles (Hyper rare au plus tard au 10e booster, Mythique au plus tard au 40e) et ouverture animée carte par carte ou d’un coup.
- **Collection** avec recherche, filtres (faction, rareté, possédées, manquantes, nouvelles), tri (numéro, nom, rareté, puissance, date) et silhouettes mystérieuses pour les cartes non découvertes.
- **Vue détaillée** : grand format inclinable, mode « illustration seule », variantes (holographique, chromatique, corrompue, illustration alternative, cosmique, ancestrale, feuille d’or, Édition des Sceaux), chance réelle d’obtenir la carte, lignée, ensembles.
- **Bestiaire** (encyclopédie et Chroniques débloquées au fil des découvertes), **Factions**, **Succès** (26) et **12 ensembles** thématiques à récompenses, **Profil** (titres, cadres, vitrine, statistiques, historique), **Réglages** (son, animations, taille du texte, contraste, sauvegarde).
- **Économie** : éclats (boosters) et cendres (obtenues avec les doublons, pour invoquer une carte manquante ou déchiffrer un nom). Offrande quotidienne facultative et booster standard gratuit qui se recharge toutes les 6 heures (2 en réserve au maximum), sans pénalité. **Aucun achat en argent réel.**

### Ce qui est provisoire

- **Les illustrations sont provisoires.** Elles sont générées par le jeu (silhouettes en contre-jour, décors propres à chaque faction) à partir de la fiche de chaque carte. Elles se remplacent une par une par de vraies images, sans toucher au code (voir plus bas).
- **La sauvegarde est locale** (localStorage de l’appareil). Elle n’est synchronisée nulle part ; l’export/import de sauvegarde sert à la conserver ou à la transférer.

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
3. Le jeu sera disponible à `https://<utilisateur>.github.io/<dépôt>/`.

Tous les chemins sont relatifs : le jeu fonctionne dans un sous-dossier. Sur iPhone : ouvrir le lien dans Safari, bouton Partager, « Sur l’écran d’accueil ». Après une première visite, le jeu fonctionne hors ligne (les polices Google sont mises en cache si elles ont été chargées une fois).

## Ajouter de nouvelles cartes

Les cartes sont dans `data/cards/<faction>.json`. Ces fichiers **font foi**.

1. Ajouter un objet **à la fin** du fichier de la faction, avec le numéro suivant (`INF-055`, etc.). Ne jamais renuméroter ni supprimer une carte existante : les sauvegardes des joueurs sont indexées par identifiant.
2. Champs : `id`, `number`, `name`, `title`, `faction`, `rarity` (`C`, `PC`, `R`, `HR`, `M`, `S`), `category`, `power` (sert au tri), `visual`, `lore`, `evolution` (ou `null`), `sets`, `variants`, `art`, `image`, `artPrompt`. Le plus simple est de copier une carte proche.
3. Pour l’ajouter à un ensemble : ajouter son identifiant dans `cards` de l’ensemble (`data/sets.json`) et le nom de l’ensemble dans `sets` de la carte.
4. Lancer `npm run check` puis `npm test`, puis incrémenter `VERSION` dans `sw.js`.

Le champ `art` décrit l’illustration provisoire : `form` (`hum`, `beast`, `dragon`, `serpent`, `tentacle`, `wheel`, `golem`, `spectre`, `skeleton`, `bird`, `fish`, `insect`, `tree`, `orb`, `swarm`, `blob`, `object`) et ses paramètres (tête, cornes, ailes, queue, décor…). Voir `js/art/creatures.js`.

## Remplacer les illustrations

1. Produire l’image (format vertical 5:7, idéalement 600 × 840 px, en WebP). Les prompts de toutes les cartes s’exportent avec `npm run prompts` (fichier `prompts.csv`) ; chaque fiche de carte les affiche aussi (« Fiche d’illustration »).
2. La déposer dans `assets/art/` sous le nom de l’identifiant : `assets/art/INF-052.webp` (et `INF-052-alt.webp` pour l’illustration alternative).
3. Ajouter l’identifiant à la liste `available` de `assets/art/manifest.json`.
4. `npm run check` vérifie que chaque image déclarée existe.

Une image déclarée mais introuvable est automatiquement remplacée par l’illustration provisoire : pas de carte vide ni d’image cassée. Les effets de rareté et de variante (cadres, holographie, chromatique…) s’appliquent aussi aux vraies images.

## Modifier les taux de rareté et l’économie

Tout est centralisé dans `js/config.js` :

- `TABLES` : poids de chaque rareté par type d’emplacement (par défaut 55 / 25 / 13 / 5 / 1,7 / 0,3 %) ;
- `BOOSTERS` : prix, emplacements, contenu de chaque booster ;
- `PITY` : seuils des garanties ;
- `VARIANT_RATES` : chances des variantes ;
- `ECONOMY` : monnaie de départ, récompenses de découverte, cendres des doublons, coût d’invocation, offrande quotidienne ;
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

Code et textes originaux. Les créatures issues des mythologies et du folklore du monde sont réinterprétées pour l’univers d’ABYSSAL. Aucune image externe n’est utilisée : toutes les illustrations actuelles sont générées par le jeu.
