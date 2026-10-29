# Achats sur Android (Google Play) : le guide pas à pas (v908)

But : que l'Échoppe marche sur Android comme sur iPhone, avec les mêmes 6 articles. Le jeu est déjà prêt (module RevenueCat
dans l'app Android, serveur qui vérifie aussi les achats Google, messages « Google Play » sur Android). Il manque seulement
les réglages chez Google et chez RevenueCat, que toi seul peux faire, puis **une clé publique** à me donner.

Tant que cette clé n'est pas dans le jeu, l'Échoppe Android affiche « Les achats ouvrent bientôt » : rien ne casse.

---

## Étape 1 — Le profil de paiement (Play Console), 10 minutes
1. Play Console → menu de gauche **Paramètres** (en bas) → **Profil de paiement** (parfois « Compte marchand »).
2. Créer le profil avec les informations de la micro-entreprise (nom commercial ABYSSAL, adresse, compte bancaire Crédit Mutuel).
3. Google peut demander une vérification (pièce d'identité, justificatif) : compter quelques jours.

À savoir : comme chez Apple, Google affiche l'adresse du vendeur sur la fiche du jeu quand il y a des achats (règle européenne).

## Étape 2 — Les 6 articles (Play Console), 20 minutes
Play Console → ABYSSAL → **Monétiser avec Play** → **Produits** → **Produits intégrés** (ou « Produits ponctuels ») →
« Créer un produit ». **L'identifiant doit être exactement celui-ci** (copier-coller, il ne se change plus ensuite) :

| Identifiant du produit | Nom | Prix conseillé |
|---|---|---|
| `com.abyssalgame.abyssal.obsidiennes.100` | 100 obsidiennes | 0,99 € |
| `com.abyssalgame.abyssal.obsidiennes.500` | 600 obsidiennes | 4,99 € |
| `com.abyssalgame.abyssal.obsidiennes.1000` | 1 300 obsidiennes | 9,99 € |
| `com.abyssalgame.abyssal.obsidiennes.2000` | 2 800 obsidiennes | 19,99 € |
| `com.abyssalgame.abyssal.codex` | Codex enluminé | 4,99 € |
| `com.abyssalgame.abyssal.pack.fondateur` | Pack du Fondateur | 4,99 € |

Pour chacun : un nom, une courte description (reprendre celles d'App Store Connect), le prix en euros (Google calcule
les autres pays), puis **Activer**. Si la console dit qu'il faut d'abord envoyer une version qui gère la facturation :
la version de test fermé déjà envoyée la contient (module RevenueCat) ; sinon, me le dire, je relance une version.

## Étape 3 — Relier Google à RevenueCat, 30 minutes (une seule fois)
RevenueCat doit pouvoir lire les achats chez Google. Il faut lui créer un « compte de service » :
1. Dans RevenueCat (app.revenuecat.com) → projet ABYSSAL → **Apps & providers** → **+ New** → **Google Play Store** :
   nom « ABYSSAL Android », identifiant du paquet `com.abyssalgame.abyssal`.
2. RevenueCat affiche alors un lien vers son guide « Google Play service credentials » : le suivre, il montre chaque écran.
   En résumé : dans Google Cloud, créer un compte de service, activer les deux API « Google Play Android Developer API »
   et « Google Play Developer Reporting API », télécharger la clé JSON ; puis dans Play Console → **Utilisateurs et
   autorisations** → inviter l'adresse e-mail du compte de service avec les droits « Afficher les informations de
   l'application », « Afficher les données financières » et « Gérer les commandes et les abonnements ».
3. Revenir dans RevenueCat, déposer le fichier JSON dans l'app Android. **Ce fichier est secret : ne jamais me l'envoyer,
   ne jamais le mettre dans le dépôt.** RevenueCat peut mettre jusqu'à 36 heures pour le valider (c'est normal).
4. RevenueCat → **Products** → importer les 6 produits Google. Pour le **Pack du Fondateur**, choisir le type
   **« Non-consumable »** (on ne l'achète qu'une fois) ; les 5 autres restent **« Consumable »** (on peut les racheter :
   obsidiennes, et le Codex à chaque saison).

## Étape 4 — La clé publique pour le jeu (1 minute)
RevenueCat → projet ABYSSAL → **API keys** → la clé publique de l'app Android : elle commence par **`goog_`**.
Me l'envoyer dans la conversation : je la mets dans le jeu (`IAP_KEY.android` dans `js/config.js`) et je livre.
Cette clé-là est faite pour être dans l'app (publique). Ne jamais m'envoyer une clé qui commence par `sk_` (secrète).

Rien à changer côté Supabase : le secret `REVENUECAT_SECRET` déjà posé sert pour l'iPhone et pour Android.

## Étape 5 — L'essai (avec le test fermé)
1. Play Console → **Paramètres** → **Test des licences** : ajouter ton adresse Google (et celles des testeurs qui veulent
   essayer) : leurs achats seront des achats d'essai, **gratuits**.
2. Comme tu n'as pas de téléphone Android, l'essai se fait par un testeur, ou par moi sur le téléphone simulé de
   GitHub Actions (là, sans compte Google, je ne peux vérifier que l'affichage, pas un vrai achat).
3. Mêmes essais que sur iPhone (`docs/achats-verification.md`, partie B) : prix en euros affichés, achat du plus petit
   paquet, Pack du Fondateur, « Restaurer mes achats », annulation.

## Ordre conseillé
Étapes 1 et 2 dès que possible (la vérification de Google peut prendre quelques jours), étape 3 ensuite, étape 4 quand
RevenueCat a validé la clé JSON. L'Échoppe s'ouvre en même temps sur iPhone et Android le jour de l'envoi de la 1.2
(`CODEX.shopFrom`) : si Android n'est pas prêt ce jour-là, l'Échoppe Android montre simplement « Les achats ouvrent
bientôt », sans rien casser.
