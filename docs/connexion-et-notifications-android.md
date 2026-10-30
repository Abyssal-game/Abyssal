# v917 : connexion Apple / Google et notifications Android — ce qu'il reste à régler

Le jeu est prêt : les boutons et l'envoi des notifications sont codés, mais **éteints** tant que les réglages ci-dessous
ne sont pas faits (rien ne casse en attendant). Ils marchent seulement dans une application construite **après la v917**
(la prochaine version envoyée par Xcode, et la prochaine version Android construite par GitHub).

Rien de secret ne doit m'être envoyé : ni fichier JSON de compte de service, ni clé `.p8`, ni mot de passe.
Les **identifiants de client** Google (qui finissent par `.apps.googleusercontent.com`) ne sont pas secrets : tu peux me les envoyer.

---

## A. « Continuer avec Apple » (iPhone)

1. **Supabase** → Authentication → **Sign In / Providers** → **Apple** → activer.
   - « Client IDs » : `com.abyssalgame.abyssal`
   - Le reste (Secret Key, Services ID) peut rester vide : il ne sert qu'à la connexion depuis un site web.
   - Enregistrer.
2. **Xcode** (sur le Mac, après la routine habituelle `npm install`, `build-www`, `cap sync ios`) : cible **App** →
   onglet **Signing & Capabilities** → **+ Capability** → **Sign in with Apple**. (Réglage local du Mac, comme l'équipe
   de signature : ne pas l'envoyer dans GitHub.)
3. Me dire « Apple est prêt » : je passe `SOCIAL.apple` à `true` dans `js/config.js`.

## B. « Continuer avec Google » (iPhone et Android)

Dans Google Cloud, projet **ABYSSAL** (`abyssal-513209`), → **API et services** → **Écran de consentement OAuth**
(nom ABYSSAL, e-mail contact@abyssal-game.fr, type « Externe », publier), puis → **Identifiants** → **+ Créer des
identifiants** → **ID client OAuth**, trois fois :

1. **Application Web** (nom « ABYSSAL web ») : rien d'autre à remplir. → identifiant **web**.
2. **iOS** : identifiant du bundle `com.abyssalgame.abyssal`. → identifiant **ios**.
3. **Android** : nom du paquet `com.abyssalgame.abyssal`, et l'**empreinte SHA-1** de la clé de signature de Google :
   Play Console → ABYSSAL → **Test et publication → Configuration → Intégrité de l'application** → « Certificat de la
   clé de signature d'application » → SHA-1. (Faire un 2e client Android avec le SHA-1 du « certificat de la clé
   d'importation », même page, pour les versions d'essai.)

Puis **Supabase** → Authentication → Sign In / Providers → **Google** → activer :
- « Client IDs » : l'identifiant **web**, une virgule, l'identifiant **ios** ;
- « Client Secret » : celui du client **web** (secret : à coller seulement dans Supabase) ;
- Enregistrer.

Enfin, m'envoyer les deux identifiants **web** et **ios** (pas le secret) : je les mets dans le jeu (`SOCIAL.google`)
et j'ajoute l'adresse de retour de Google dans `ios/App/App/Info.plist`.

## C. Notifications du serveur sur Android (Firebase)

1. **console.firebase.google.com** → **Ajouter un projet** → choisir le projet Google Cloud existant **ABYSSAL**
   (`abyssal-513209`) → pas besoin de Google Analytics.
2. Dans Firebase : **Ajouter une application** → Android → nom du paquet `com.abyssalgame.abyssal` → télécharger
   **google-services.json**.
3. **GitHub** → dépôt Abyssal → Settings → Secrets and variables → Actions → **New repository secret** :
   nom `GOOGLE_SERVICES_JSON`, valeur = tout le contenu du fichier `google-services.json`.
4. Firebase → ⚙️ Paramètres du projet → **Comptes de service** → **Générer une nouvelle clé privée** → un fichier JSON
   se télécharge. **Secret** : le coller en entier dans **Supabase** → Edge Functions → **Secrets** → nom
   `FCM_SERVICE_ACCOUNT`. Puis supprimer le fichier du téléphone ou de l'ordinateur.
5. Me dire « Firebase est prêt » : je passe `PUSH_ANDROID` à `true` (`js/config.js`) et je relance la construction Android.

À recoller dans Supabase pour la v917 : **`supabase/17-notifications.sql`** (les adresses Android gardent leurs
majuscules) et le nouveau **`supabase/22-tableau-de-bord.sql`** (Mode Créateur → Diagnostic → Tableau de bord).

## D. La fenêtre de note (rien à régler)

Elle apparaît après le 1er, le 3e et le 10e gardien vaincu, ou au fond de l'Abysse, au plus 3 fois et à 45 jours
d'écart. Apple décide lui-même s'il l'affiche (jamais dans une app lancée depuis Xcode de façon fiable, et sur TestFlight
elle ne fait rien : c'est normal) ; elle ne marche vraiment que dans l'app de l'App Store et du Play Store.
