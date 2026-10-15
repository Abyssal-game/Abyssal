# ABYSSAL — mémo de passation pour Claude Code

Ce texte reprend tout ce qu'il faut savoir du projet. Ce fichier est lu automatiquement par chaque nouvelle session : le tenir à jour quand une décision ou une routine change.

## 0. Travailler avec le propriétaire
- Il est francophone, n'est pas développeur et travaille **uniquement depuis son iPhone**. Réponds en français simple et chaleureux. Après chaque livraison, dis-lui exactement quoi faire : fermer puis rouvrir l'app **deux fois** (le service worker sert d'abord l'ancienne version), puis vérifier le numéro dans **Réglages → À propos**.
- « Je ne veux rien avoir à faire moi-même » : fais tout ce qui est faisable. Il accepte de copier-coller des prompts que tu lui donnes.
- **Ne prétends jamais avoir testé** ce que tu n'as pas réellement exécuté. Précise toujours que rien n'a été testé sur un vrai iPhone.
- Travaille directement sur `main`, sans version d'essai ni salle de test.
- Prompts d'images (Gemini) : écrits en entier, **un bloc de code par prompt**.
- Ne jamais toucher au projet **Psynapse** (autre jeu, dépôt psynapsegame/Psynapse).
- Ne jamais demander la clé `service_role` ni le mot de passe Supabase. Les fichiers `supabase/*.sql` sont collés par le propriétaire dans Supabase → SQL Editor → New query → Run. Pour tester un SQL avant livraison : PostgreSQL 16 est installé (`/usr/lib/postgresql/16/bin`), lancer une base temporaire avec l'utilisateur `postgres` et simuler `auth.users` / `auth.uid()`.
- Messages de commit : terminés par les lignes Co-Authored-By et Claude-Session habituelles, **sans nom de modèle**.

## 1. Le jeu
- ABYSSAL — Le Bestiaire interdit : jeu de cartes dark fantasy en PWA. ES modules, **aucune étape de build**. Collection de 500 créatures dans 7 factions (infernal, abyssal, céleste, sauvage, nécrotique, primordial, artificiel) et 6 raretés (C, PC, R, HR, M, S). Boosters, Descente (roguelite : un combat par étage, gardiens, coffres), combats tactiques, Sceaux, Fournaise, succès, ensembles.
- Dépôt : **Abyssal-game/Abyssal** (transféré depuis psynapsegame/Abyssal), branche `main`.
- Adresse publique : **https://abyssal-game.github.io/Abyssal/**. Le code d'accès (SCEAU-7713) a été **retiré en v297** : le jeu s'ouvre sans code.
- Page de confidentialité : **https://abyssal-game.github.io/Abyssal/confidentialite.html**. Contact : **abyssal.gamecards@gmail.com**.
- Compte en ligne facultatif via **Supabase** (`js/cloud/`, SQL dans `supabase/`) : sauvegarde, profil public, classements, suppression de compte. Après le transfert, le propriétaire doit mettre à jour Supabase → Authentication → URL Configuration (Site URL `https://abyssal-game.github.io/Abyssal/`, Redirect URL `https://abyssal-game.github.io/Abyssal/**`).
- Le réseau de la session bloque github.io : pour vérifier la publication, passe par l'outil GitHub (déploiements Pages) ou demande une capture au propriétaire.

## 2. Routine de livraison
1. Version : **ligne 4** de `js/config.js` **et** de `sw.js`, toujours le même numéro (`sed -i "4s/vX/vY/" js/config.js sw.js`). Actuellement **v298**.
2. Tests : `node --test tests/*.test.mjs` (187 tests), `node tools/validate.mjs`. Si le combat ou l'équilibre change : `node tools/fuzz.mjs 300` (étage moyen ≈ 12 à 14 en normal).
3. Vérification dans le navigateur avec Playwright (`/opt/node-tools/node_modules/playwright/index.mjs`, Chromium déjà installé), avec un serveur local `python3 -m http.server 8092` lancé dans le dossier. Tailles iPhone SE et iPhone 13. **L'écran d'ouverture attend un toucher** (« Touche l'écran pour entrer ») : dans les scripts, cliquer au milieu de l'écran (dans la fenêtre 390×664) avant tout le reste.
4. Commit, push, réponse en français.

## 3. Règles de fond
- **Sauvegardes** : ne jamais renuméroter ni supprimer une carte. On ajoute seulement à la fin. Les numéros (INF-001, ART-071…) sont la clé des sauvegardes.
- Ajouter des créatures : fichier de lot `data/lot-*.json` → `node tools/add-lot.mjs data/lot-x.json --write` → `node tools/gen-kits.mjs` (identités de combat dans `js/core/kits-data.js`) → `python3 tools/add-art.py <ID> <image>` pour chaque illustration (recadrage 5:7, 600×840 et miniature dans `assets/art/lite/`).
- Refaire une illustration existante : `tools/redo-art.json` liste les descriptions, `node tools/redo-art.mjs` affiche les prompts, `node tools/redo-art.mjs <ID> --write` enregistre la description après réception de l'image.
- Emblèmes d'ensembles : image sur fond blanc → `python3 tools/cutout.py src.jpg out.webp` → 192×192 dans `assets/sets/`, puis ajouter la clé dans `SET_ART` (`js/ui/icons.js`).
- Sons : fichiers dans `assets/sfx/` (liste dans `assets/sfx/manifest.json`), avec un repli synthétisé dans `js/ui/sound.js`. Sons et musiques faits avec ElevenLabs (abonnement payant). **Aucun bip** : le carillon « discover » a été supprimé (remplacé par le son « sheet »), et les fins tonales des sons de rareté Commune et Rare ont été coupées. Le propriétaire déteste les bips.
- Illustrations : Gemini. Polices intégrées au jeu (`css/fonts.css`, `assets/fonts/`, licences OFL). Aucun appel à Google.
- CSS en couches : plus loin dans `css/army.css` = prioritaire. On ajoute les nouvelles règles **à la fin**, avec un commentaire `/* vNNN : … */`.

## 4. Où trouver quoi
- Moteur de combat : `js/core/duel.js`. Initiative (`st.init`, `st.actor`), PA par créature, Ferveur, Brisure/Fracture, Marque, Riposte, Hâte, Retard, Assaut conjoint, détonation du poison, runes de gardien.
- Kits et rôles : `js/core/kits.js`, `js/core/skills.js`, et `js/core/kits-data.js` (généré).
- Écran de combat : `js/screens/duel-ui.js` (frise d'initiative en haut, bandeaux d'états au-dessus des cartes, réserve consultable au toucher).
- Descente : `js/core/descent.js` et `js/screens/descent.js` (présentation du gardien : attend un toucher, pas de lancement automatique).
- Boosters : `js/core/boosters.js` et `js/screens/opening.js`. Fiche de carte : `js/screens/detail.js` (onglet Rareté, Sublimer).
- Partie, économie, sauvegarde : `js/core/game.js`, `js/core/save.js`, `js/config.js` (`VARIANT_RATES` holo 4 / or 1,2 / cosmique 0,4 % ; `SUBLIME_ASH`).
- Annonces : `toast()` dans `js/ui/dom.js`. **File d'attente**, une seule annonce à la fois, le son joue à l'affichage.
- Tutoriels : `js/ui/tutos.js`.

## 5. Décisions déjà prises
- Pas de « salle d'épreuve » ni de version de test : tout va sur main.
- Pas de créature de la semaine, pas de butin « Si tu gagnes » sur les portes, pas de Salles Oubliées / 3D (retirées).
- Finitions : plus fréquentes qu'au début, et **Sublimer** (finition suivante contre des cendres, toujours plus cher que ce que rapporte la carte brûlée).
- Écran de combat : le violet doit rester discret. Les pastilles d'état sont au-dessus des cartes, les infos de visée en haut de la carte.
- Pas de boosters vendus contre de l'argent réel, ni d'achats qui donnent de la puissance. Si un jour il y a des achats : surtout cosmétiques (cadres, dos de cartes…), pack fondateur, passe de saison.

## 6. Projets en cours / idées
- Publication sur les stores. Le propriétaire aura un **Mac**. Plan : Android d'abord, puis iOS via Xcode et TestFlight. Emballage avec Capacitor. Code d'accès : fait (retiré en v297). Signalement et filtre des pseudos : fait en v298 (`js/core/moderation.js`, `js/ui/report.js`, `supabase/06-signalements.sql` — les listes de mots du JS et du SQL doivent rester identiques, un test le vérifie). Reste : fiche de store (captures, description, âge 12+), emballage Capacitor, ouverture des inscriptions dans Supabase, tests sur vrais téléphones, vérifier que le nom « ABYSSAL » est libre, refaire Nosferatu (NEC-035) et peut-être Pandore (Z22) habillée.
- Proposition d'achats intégrés (surtout cosmétiques) : à préparer **seulement si le propriétaire le demande**.
