# Faire relire les traductions par des joueurs natifs (v796)

Les 7 langues du jeu (anglais, espagnol, allemand, italien, portugais du Brésil, japonais, coréen) ont été traduites par
l'IA depuis le français. Elles sont cohérentes (glossaires `tools/i18n/glossaire-*.md`) mais **aucun locuteur natif ne les a
relues**. Voici comment le faire, sans rien à installer.

## 1. Trouver des relecteurs
- **TestFlight, lien public** : App Store Connect → ton app → TestFlight → *Testeurs externes* → nouveau groupe « Relecture »
  → activer le **lien public** (jusqu'à 10 000 testeurs, la première version passe une courte vérification d'Apple).
  Le lien s'ouvre sur n'importe quel iPhone, dans n'importe quel pays.
- Où poster le lien (un message par langue, en anglais suffit) : r/TCG, r/roguelites, r/gamedev (fil « Feedback Friday »),
  les Discord de jeux de cartes indépendants, et pour le japonais et le coréen : X (Twitter) avec #インディーゲーム ou
  #인디게임, et les groupes de traducteurs bénévoles (r/translator).
- Message conseillé : « Free dark-fantasy card game, looking for native speakers to proofread the <langue> version
  (30 minutes, your name in the credits if you wish). »

## 2. Ce qu'on leur demande
1. Choisir leur langue dans **Réglages → Jeu → Langue**.
2. Jouer 20 à 30 minutes : ouvrir les boosters de bienvenue, la Descente jusqu'au premier gardien, un mini-jeu du Cercle.
3. Dès qu'un texte est faux, maladroit ou coupé : faire une **capture d'écran**, puis toucher **« Écris-nous »** sous le choix
   de la langue (Réglages → Jeu) : l'e-mail part vers contact@abyssal-game.fr avec la langue en objet. Dans le message :
   l'écran, le texte, leur proposition.

## 3. Ce que tu fais ensuite
Tu me colles simplement les e-mails reçus (ou leurs captures) dans la conversation. Je corrige les dictionnaires
(`js/i18n/<langue>.js`, avec `node tools/i18n/add.mjs`) et je livre une version, qui arrive dans l'app par la mise à jour
à distance (pas besoin de repasser par l'App Store).

## 4. Points à faire vérifier en priorité
- **Japonais et coréen** : longueur des boutons (un texte trop long passe sur deux lignes), ton (le japonais de
  l'interface est neutre, les répliques des gardiens sont littéraires), noms des créatures en katakana / hangeul.
- **Toutes les langues** : les termes du jeu (Brisure, Ferveur, Marque, Veille…), les noms des gardiens, les répliques
  piquantes des réactions en ligne (l'humour se traduit mal).
