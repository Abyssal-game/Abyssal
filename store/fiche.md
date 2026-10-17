# ABYSSAL — fiche des stores (Google Play et App Store)

Tout ce qu'il faut copier-coller dans **Google Play Console** et **App Store Connect**. Chaque texte est dans son propre bloc. Sur GitHub, le bouton « copier » apparaît en haut à droite de chaque bloc.

Les images sont prêtes dans `store/google/` et `store/apple/`. Pour les refaire après un changement du jeu :
`node tools/store-shots.mjs` (captures) puis `node tools/store-compose.mjs` (mise en forme).

> Les textes décrivent le jeu **sans achat intégré**. Si des achats sont ajoutés un jour, il faudra modifier la partie « Équitable » de la description et les réponses aux questionnaires.

---

## 1. Adresses (identiques dans les deux stores)

Site web / URL marketing :
```
https://abyssal-game.github.io/Abyssal/
```
Politique de confidentialité :
```
https://abyssal-game.github.io/Abyssal/confidentialite.html
```
Assistance (Support URL chez Apple) :
```
https://abyssal-game.github.io/Abyssal/confidentialite.html#contact
```
Suppression de compte (demandée par Google) :
```
https://abyssal-game.github.io/Abyssal/confidentialite.html#suppression
```
E-mail de contact :
```
abyssal.gamecards@gmail.com
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
Ouvre des boosters, collectionne 500 créatures et descends dans l'Abysse.
```

### Texte promotionnel (App Store, 170 caractères au plus, modifiable à tout moment)
```
500 créatures, 20 gardiens et 100 étages jusqu'au fond de l'Abysse. Gratuit, sans publicité et sans achat : toutes les cartes se gagnent en jouant.
```

### Mots-clés (App Store, 100 caractères au plus, séparés par des virgules, sans espace)
```
collection,booster,tcg,ccg,démons,monstres,mythologie,roguelite,stratégie,deck,créatures,horreur
```
(Les mots du nom et du sous-titre comptent déjà : inutile de les répéter.)

### Description complète (les deux stores, 4000 caractères au plus)
```
Avant le temps, il n'existait que le Néant. Puis quelque chose s'éveilla.

ABYSSAL est un jeu de cartes à collectionner dark fantasy. Ouvre des boosters, rassemble 500 créatures tirées des mythes et des légendes, forme ton équipe et descends dans l'Abysse, étage après étage.

COLLECTIONNE
• 500 créatures illustrées : démons, anges déchus, dieux oubliés, dragons primordiaux, golems, spectres…
• 7 factions : Infernal, Abyssal, Céleste, Sauvage, Nécrotique, Primordial et Artificiel
• 6 raretés, de Commune à Secrète, et des finitions Holo, Or et Cosmique
• 17 ensembles à compléter : les Sept Péchés capitaux, la Goétie, les Dragons primordiaux…
• Les probabilités de chaque booster sont affichées, avec des garanties réelles

COMBATS TACTIQUES
• Une équipe de 5 créatures : 3 au combat, 2 en réserve
• Chaque créature a son rôle, ses compétences et son passif
• La Descente : 100 étages, 20 gardiens aux pouvoirs uniques, et L'Abysse qui t'attend tout au fond
• Esquive et pare les coups au bon moment, brise la garde des gardiens
• Rapporte des coffres, et le légendaire Booster de l'Abysse
• Une règle différente chaque jour pour changer ta stratégie

LES DUELS DES SCEAUX
• Un second jeu de cartes : pose tes créatures sur le plateau et capture celles de l'adversaire
• 8 rivaux à défier, chacun avec ses propres règles

UN MONDE À DÉCOUVRIR
• Un Bestiaire illustré, avec l'histoire de chaque créature
• Des chroniques qui se débloquent au fil de tes découvertes
• Succès, titres, vitrine et statistiques

ÉQUITABLE
• Gratuit, sans publicité
• Aucun achat : toutes les cartes se gagnent en jouant
• Un booster gratuit chaque jour
• Jouable hors ligne, avec ou sans compte
• Ta collection sauvegardée en ligne avec ton compte, et les classements du monde entier

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

**Objectif : 13+ chez Apple, PEGI 12 en Europe chez Google.** Le jeu montre des créatures inquiétantes et des combats, mais sans sang réaliste ni contenu sexuel. Il n'y a ni achat, ni pari, ni discussion entre joueurs.

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
| Jeux d'argent simulés | Aucun (les boosters se gagnent en jouant, on ne mise rien) |
| Concours | Non |
| Thèmes médicaux | Aucun |
| Contenu généré par les utilisateurs | Oui, uniquement les pseudos : filtre, signalement et masquage dans le jeu |
| Messagerie ou discussion | Non |
| Achats intégrés | Non |
| Publicité | Non |
| Accès web sans restriction | Non |

Si Apple calcule un âge plus bas que 13+, choisis quand même **13+** (Apple permet un âge plus strict). Cela correspond à la page de confidentialité, qui dit que le jeu n'est pas destiné aux moins de 13 ans.

### Google (Play Console → Contenu de l'appli → Classification du contenu, questionnaire IARC)
- Catégorie : **Jeu**.
- Violence : oui, **fantastique**, entre créatures imaginaires, sans sang réaliste.
- Peur, horreur : oui, **éléments effrayants légers** (créatures démoniaques, ambiance sombre).
- Sexualité, nudité, grossièretés, drogues, jeux d'argent : **non**.
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Oui, un pseudo visible dans les classements.** Pas de discussion. Modération : filtre de mots et signalement.
- Achats numériques : **non**.

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
- Tout le reste : **Non collecté**.

---

## 7. Notes pour la vérification d'Apple (App Review Information → Notes)
```
Au premier lancement, ABYSSAL propose de créer un compte (e-mail et mot de passe) ou de « Jouer sans compte ». Vous pouvez utiliser le compte de démonstration ci-dessus (onglet « Se connecter ») ou jouer sans compte. Touchez l'écran d'ouverture, puis ouvrez les 2 boosters de bienvenue (onglet Boosters) pour former votre équipe.

Pourquoi un compte est proposé : la collection de cartes (500 créatures, plusieurs semaines de jeu) est sauvegardée en ligne pour ne jamais être perdue (changement ou perte de téléphone, suppression de l'application) ; il sert aussi aux classements quotidiens, aux saisons, au Tirage des Ombres et au profil public. Seuls un e-mail et un pseudo sont demandés, et le compte se supprime dans le jeu. Suppression du compte dans le jeu : Sanctuaire → Compte → Supprimer mon compte.

Modération des pseudos (seul contenu créé par les joueurs) : les pseudos insultants sont refusés. Dans un classement (Aventure → La Descente → Classement du jour), touchez le pseudo d'un autre joueur pour le signaler ou le masquer. Un pseudo signalé par plusieurs joueurs est remplacé automatiquement. Contact : abyssal.gamecards@gmail.com

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
- [ ] Créer les comptes développeur : Google (25 $ une fois), Apple (99 $ par an).
- [ ] Google, compte personnel récent : test fermé avec au moins 12 testeurs pendant 14 jours avant la publication.
- [ ] Emballer l'application (Capacitor) et la tester sur un vrai téléphone Android et sur iPhone (TestFlight).
