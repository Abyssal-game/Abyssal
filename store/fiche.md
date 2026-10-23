# ABYSSAL — fiche des stores (Google Play et App Store)

Tout ce qu'il faut copier-coller dans **Google Play Console** et **App Store Connect**. Chaque texte est dans son propre bloc. Sur GitHub, le bouton « copier » apparaît en haut à droite de chaque bloc.

Les images sont prêtes dans `store/google/` et `store/apple/`. Pour les refaire après un changement du jeu :
`node tools/store-shots.mjs` (captures) puis `node tools/store-compose.mjs` (mise en forme).

> Les textes décrivent le jeu **sans achat intégré**. Si des achats sont ajoutés un jour, il faudra modifier la partie « Équitable » de la description et les réponses aux questionnaires.

---

## 1. Adresses (identiques dans les deux stores)

Site web / URL marketing :
```
https://abyssal-game.fr/
```
Politique de confidentialité :
```
https://abyssal-game.fr/confidentialite.html
```
Assistance (Support URL chez Apple) :
```
https://abyssal-game.fr/aide.html
```
Suppression de compte (demandée par Google) :
```
https://abyssal-game.fr/confidentialite.html#suppression
```
E-mail de contact :
```
contact@abyssal-game.fr
```

---

## 2. Textes

### Nom de l'application (30 caractères au plus, les deux stores)
```
ABYSSAL – Bestiaire interdit
```

### Sous-titre (App Store, 30 caractères au plus)
```
Jeu de cartes dark fantasy
```

### Description courte (Google Play, 80 caractères au plus)
```
Ouvre des boosters, collectionne 506 créatures et descends dans l'Abysse.
```

### Texte promotionnel (App Store, 170 caractères au plus, modifiable à tout moment)
```
506 créatures, 20 gardiens et 100 étages jusqu'au fond de l'Abysse. Gratuit, sans publicité et sans achat : toutes les cartes se gagnent en jouant.
```

### Mots-clés (App Store, 100 caractères au plus, séparés par des virgules, sans espace)
```
collection,booster,tcg,ccg,démons,monstres,mythologie,roguelite,stratégie,deck,créatures,horreur
```
(Les mots du nom et du sous-titre comptent déjà : inutile de les répéter.)

### Description complète (les deux stores, 4000 caractères au plus)
```
Avant le temps, il n'existait que le Néant. Puis quelque chose s'éveilla.

ABYSSAL est un jeu de cartes à collectionner dark fantasy. Ouvre des boosters, rassemble 506 créatures tirées des mythes et des légendes, forme ton équipe et descends dans l'Abysse, étage après étage.

COLLECTIONNE
• 506 créatures illustrées : démons, anges déchus, dieux oubliés, dragons primordiaux, golems, spectres…
• 7 factions : Infernal, Abyssal, Céleste, Sauvage, Nécrotique, Primordial et Artificiel
• 6 raretés, de Commune à Secrète, et six finitions, de l'Argentée à la Prismatique
• 18 ensembles à compléter : les Sept Péchés capitaux, la Goétie, les Dragons primordiaux…
• Les probabilités de chaque booster sont affichées, avec des garanties réelles

COMBATS TACTIQUES
• Une équipe de 5 créatures : 3 au combat, 2 en réserve
• Chaque créature a son rôle, ses compétences et son passif
• La Descente, l'histoire du jeu : 20 chapitres, 100 étages, 20 gardiens aux pouvoirs uniques, et L'Abysse qui t'attend tout au fond
• Les Épreuves du jour : trois combats à ta mesure chaque jour, un coffre par victoire
• Esquive et pare les coups au bon moment, brise la garde des gardiens
• Rapporte des coffres, et le légendaire Booster de l'Abysse

LE CERCLE DE L'ABYSSE
• Les Duels des Sceaux : pose tes créatures sur le plateau et capture celles de l'adversaire, contre 8 rivaux
• Les Enchères de Mammon : des enchères à l'aveugle où miser pareil ne rapporte rien
• Le Pacte : tire des cartes, encore une… et arrête-toi avant de briser le pacte
• Les Cryptes : un jeu de mémoire où chaque paire réveille le pouvoir de sa faction
• Joue contre d'autres joueurs, en partie rapide ou à ton rythme, et défie tes amis
• Le Pari des Boosters : ouvre tes boosters face à un autre joueur, le meilleur tirage remporte tout

UN MONDE À DÉCOUVRIR
• Un Bestiaire illustré, avec l'histoire de chaque créature
• Des chroniques qui se débloquent au fil de tes découvertes
• Succès, titres, vitrine et statistiques

ÉQUITABLE
• Gratuit, sans publicité
• Aucun achat : toutes les cartes se gagnent en jouant
• Un booster gratuit chaque jour
• Partie sauvegardée en ligne sur ton compte, jouable aussi hors ligne
• Des amis, des profils à visiter et des classements chaque mois

Le Bestiaire interdit t'attend. Jusqu'où oseras-tu descendre ?
```

### Nouveautés de la première version
```
Première version d'ABYSSAL. Bonne descente dans l'Abysse !
```

### Copyright (App Store)
```
© 2026 ABYSSAL
```

---

## 3. Catégories

| | Google Play | App Store |
|---|---|---|
| Type | Jeu | Jeux |
| Catégorie | **Cartes** | Principale : **Cartes**, secondaire : **Stratégie** |
| Balises (Google, 5 au plus) | Cartes à collectionner, Fantasy, Un joueur, Hors ligne, Stylisé | — |
| Prix | Gratuit | Gratuit |
| Langue | Français (France) | Français |

---

## 4. Images

| Fichier | Store | Taille |
|---|---|---|
| `store/google/01-carte.png` … `08-accueil.png` | Google Play, captures du téléphone | 1080 × 1920 |
| `store/google/presentation-1024x500.png` | Google Play, image de présentation | 1024 × 500 |
| `store/google/icone-512.png` | Google Play, icône | 512 × 512 |
| `store/apple/01-carte.png` … `08-accueil.png` | App Store, captures iPhone 6,9" | 1320 × 2868 |
| `store/apple/icone-1024.png` | App Store (l'icône vient de l'app elle-même, voir plus bas) | 1024 × 1024 |

Ordre des captures et titres affichés dessus :
1. Carte en grand : « 500 créatures légendaires »
2. Ouverture de booster : « Ouvre tes boosters »
3. Combat : « Combats tactiques »
4. Équipe : « Forge ton équipe »
5. Collection : « Complète le Bestiaire »
6. Duel des Sceaux : « Les Duels des Sceaux »
7. Bestiaire : « Un monde à découvrir »
8. Accueil : « Gratuit, sans publicité »

L'icône 1024 × 1024 est tirée de l'image source du nouveau logo (2048 × 2048) : pleine netteté.

L'iPad n'est pas prévu : l'application sera déclarée « iPhone uniquement », ce qui évite de fournir des captures iPad.

---

## 5. Classification par âge

**Objectif : 13+ chez Apple, PEGI 12 en Europe chez Google.** Le jeu montre des créatures inquiétantes et des combats, mais sans sang réaliste ni contenu sexuel. Il n'y a ni achat ni discussion entre joueurs (seulement des réactions prédéfinies) ; le Pari des Boosters se joue avec la monnaie du jeu, jamais avec de l'argent réel.

Pandore (ART-068), autrefois dessinée nue, a été refaite habillée en v300 : aucune nudité n'est à déclarer.

### Apple (App Store Connect → Informations sur l'app → Classification par âge)
| Question | Réponse |
|---|---|
| Violence de dessin animé ou fantastique | Rare ou modérée |
| Violence réaliste | Aucune |
| Violence réaliste prolongée, sang | Aucune |
| Thèmes d'horreur ou d'épouvante | Rare ou modérée |
| Contenu sexuel, nudité | Aucun |
| Grossièretés, humour vulgaire | Aucun |
| Alcool, tabac, drogues | Aucun |
| Jeux d'argent simulés | **Rare ou modéré** : le Pari des Boosters fait miser des éclats (monnaie du jeu, jamais achetable) sur des boosters ouverts face à un autre joueur. Aucun argent réel. |
| Concours | Non |
| Thèmes médicaux | Aucun |
| Contenu généré par les utilisateurs | Oui, uniquement les pseudos : filtre, signalement et masquage dans le jeu |
| Messagerie ou discussion | Non |
| Achats intégrés | Non en 1.0 ; **Oui à partir de la 1.1** (obsidiennes, Codex enluminé, Pack du Fondateur : cosmétiques seulement) |
| Publicité | Non |
| Accès web sans restriction | Non |

Si Apple calcule un âge plus bas que 13+, choisis quand même **13+** (Apple permet un âge plus strict). Cela correspond à la page de confidentialité, qui dit que le jeu n'est pas destiné aux moins de 13 ans.

### Google (Play Console → Contenu de l'appli → Classification du contenu, questionnaire IARC)
- Catégorie : **Jeu**.
- Violence : oui, **fantastique**, entre créatures imaginaires, sans sang réaliste.
- Peur, horreur : oui, **éléments effrayants légers** (créatures démoniaques, ambiance sombre).
- Sexualité, nudité, grossièretés, drogues, jeux d'argent : **non**.
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Oui, un pseudo visible dans les classements.** Pas de discussion. Modération : filtre de mots et signalement.
- Achats numériques : **non** en 1.0, **oui** à partir de la 1.1 (cosmétiques seulement).

Résultat attendu : PEGI 12 en Europe (au pire PEGI 7). Public cible (Contenu de l'appli → Public cible) : **13 ans et plus**. Si on coche « moins de 13 ans », Google impose les règles « Familles ».

---

## 6. Données personnelles

### Google Play → Contenu de l'appli → Sécurité des données
- L'application collecte-t-elle des données ? **Oui** (seulement si le joueur crée un compte).
- Les données sont-elles chiffrées pendant le transfert ? **Oui** (HTTPS).
- Les utilisateurs peuvent-ils demander la suppression ? **Oui** : dans le jeu, et par e-mail (adresse de suppression ci-dessus).
- Partage avec des tiers : **Non** (Supabase est un prestataire qui héberge les données pour nous, ce n'est pas un partage).

| Type de données | Collectée | Facultative | Usage |
|---|---|---|---|
| Informations personnelles → Adresse e-mail | Oui | Oui (compte facultatif, proposé au premier lancement) | Gestion du compte |
| Informations personnelles → ID utilisateur | Oui | Oui | Gestion du compte, fonctionnalités de l'appli |
| Activité dans l'appli → Autre contenu généré par l'utilisateur (pseudo, sauvegarde, scores) | Oui | Oui | Fonctionnalités de l'appli |
| Position, contacts, photos, audio, finances, santé, navigation | Non | — | — |
| Plantages, diagnostics, identifiants publicitaires | Non | — | — |

### Apple → App Store Connect → Confidentialité de l'app
- Pistage (tracking) : **Non**, aucune donnée n'est utilisée pour suivre le joueur.
- Données **associées à l'identité** du joueur, toutes pour « Fonctionnalités de l'app » :
  - Coordonnées → **Adresse e-mail**
  - Identifiants → **Identifiant utilisateur**
  - Contenu utilisateur → **Contenu de jeu** (sauvegarde, scores) et **Autre contenu utilisateur** (pseudo)
  - **À ajouter avec la 1.1** : Achats → **Historique d'achats** (associé à l'identité, « Fonctionnalités de l'app », pas de pistage)
- Tout le reste : **Non collecté**.

---

## 7. Notes pour la vérification d'Apple (App Review Information → Notes)
```
Au premier lancement, ABYSSAL demande de créer un compte (e-mail et mot de passe) : la progression est liée au compte (sauvegarde en ligne, amis, classements, défis entre joueurs). Vous pouvez utiliser le compte de démonstration ci-dessus (onglet « Se connecter »). Touchez l'écran d'ouverture, puis ouvrez les 2 boosters de bienvenue (onglet Butin) pour former votre équipe.

Pourquoi un compte est nécessaire : la partie de chaque joueur est tenue par notre serveur (comme dans les jeux en ligne), pour qu'elle ne soit jamais perdue (changement ou perte de téléphone, suppression de l'application) et pour que les parties contre d'autres joueurs restent équitables. Le compte sert aussi aux amis, aux profils, aux jeux en ligne (Duels des Sceaux, Pacte, Enchères, Pari des Boosters) et aux classements du mois. Seuls un e-mail et un pseudo sont demandés. Suppression du compte dans le jeu : Sanctuaire → Compte → Supprimer mon compte.

Modération (seul contenu créé par les joueurs : les pseudos ; en partie en ligne, seules des réactions prédéfinies, sans texte libre) : les pseudos insultants sont refusés. Touchez le pseudo ou le portrait d'un autre joueur (classements, parties en ligne) pour ouvrir son profil, puis « Signaler ou masquer ce joueur ». Un pseudo signalé par plusieurs joueurs est remplacé automatiquement. Contact : contact@abyssal-game.fr

Aucun achat intégré, aucune publicité, aucun pistage.
```
**Compte de démonstration :** crée un compte réservé aux vérificateurs (par exemple `review.abyssal@gmail.com` avec un pseudo « Vérificateur »). Donne son e-mail et son mot de passe dans les champs « Sign-in information ». Google demande la même chose dans **Contenu de l'appli → Accès aux applis**.

---

## 8. Avant de soumettre : à faire

- [x] Exécuter `supabase/06-signalements.sql` dans Supabase (signalement des pseudos).
- [x] Ouvrir les inscriptions dans Supabase (fait le 15 octobre 2026). Le jeu propose « Créer un compte » et « Mot de passe oublié » depuis la v318 ; vérifier dans Supabase → Authentication → Email Templates que les liens pointent vers `https://abyssal-game.github.io/Abyssal/`.
- [x] Retirer du jeu la phrase « sur invitation » (fait en v318).
- [x] Refaire l'illustration de Pandore (ART-068), habillée (fait en v300).
- [ ] Vérifier que le nom « ABYSSAL » n'est pas déjà pris sur les deux stores et en marque déposée (base INPI / EUIPO).
- [x] Créer les comptes développeur : Google (25 $ une fois), Apple (99 $ par an).
- [ ] Google : confirmer l'accès à un vrai téléphone Android (exigé par la Play Console) : **Android mis de côté le 23 octobre 2026** (le propriétaire n'a pas d'appareil Android). Version signée prête (`abyssal-play-store`).
- [ ] Google, compte personnel récent : test fermé avec au moins 12 testeurs pendant 14 jours avant la publication.
- [ ] Emballer l'application (Capacitor) et la tester sur un vrai téléphone Android et sur iPhone (TestFlight).


---

## 9. Achats intégrés (version 1.1, Saison I du Codex le 1er décembre 2026)

Paiement par **RevenueCat** (module `@revenuecat/purchases-capacitor`, `js/iap.js`) ; le serveur de partie vérifie chaque achat auprès de RevenueCat (`serveur/iap.mjs`) avant de le donner.

### Produits à créer dans App Store Connect (Fonctionnalités → Achats intégrés)
| Identifiant du produit | Type | Nom de référence | Prix |
|---|---|---|---|
| `com.abyssalgame.abyssal.obsidiennes.100` | Consommable | 100 obsidiennes | 0,99 € |
| `com.abyssalgame.abyssal.obsidiennes.500` | Consommable | 600 obsidiennes | 4,99 € |
| `com.abyssalgame.abyssal.obsidiennes.1000` | Consommable | 1 300 obsidiennes | 9,99 € |
| `com.abyssalgame.abyssal.obsidiennes.2000` | Consommable | 2 800 obsidiennes | 19,99 € |
| `com.abyssalgame.abyssal.codex` | Consommable | Codex enluminé (une saison) | 4,99 € |
| `com.abyssalgame.abyssal.pack.fondateur` | Non consommable | Pack du Fondateur | 4,99 € |

Le Codex enluminé est **consommable** : il se rachète à chaque saison ; le serveur le rattache à la saison en cours (acheté deux fois la même saison : 500 obsidiennes à la place).

### Réglages
- Apple : contrat des applications payantes signé, **Small Business Program** (15 %), DSA « commerçant » une fois la micro-entreprise créée.
- RevenueCat : projet « ABYSSAL », app iOS (identifiant `com.abyssalgame.abyssal`, clé d'achats intégrés d'App Store Connect), **Transfer behavior : Keep with original App User ID** (un achat reste sur le compte qui l'a payé).
- Clé publique RevenueCat (`appl_…`) → `IAP_KEY.ios` dans `js/config.js` ; clé secrète (`sk_…`) → Supabase → Edge Functions → Secrets → **`REVENUECAT_SECRET`** (jamais dans le dépôt ni dans la conversation).
- Confidentialité de l'app : ajouter « Historique d'achats » (voir partie 6). Mettre à jour la page de confidentialité du site `abyssal-game.fr` (dépôt `site`) à la sortie de la 1.1.
