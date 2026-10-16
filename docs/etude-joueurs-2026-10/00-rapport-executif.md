# ABYSSAL — Étude utilisateur simulée : 100 joueurs, 30 jours (16 octobre 2026)

## Comment lire cette étude

Ce dossier simule le premier mois de 100 joueurs fictifs. Il mélange trois niveaux de certitude, toujours étiquetés dans les documents :

- **Fait vérifié** : lu dans le code du jeu (v327) ou observé dans un navigateur Chromium à la taille iPhone 13 (129 captures). Solide.
- **Mesure moteur** : le vrai moteur du jeu a été piloté hors navigateur, 30 jours par profil, en respectant le temps de jeu quotidien et les jours de connexion de chaque profil (un combat ≈ 1,2 min). Les nombres de cartes, raretés, étages, éclats et cendres sont donc réels pour ce rythme de jeu. Le bot joue mieux qu'un débutant.
- **Hypothèse de simulation** : le ressenti, les erreurs de compréhension, les abandons. Écrits par sept agents indépendants (un par famille), qui n'ont lu ni le code ni les fiches des autres, à partir d'un modèle de référence du jeu, du parcours observé et des mesures de leurs joueurs.

**Rien ici n'est une mesure sur de vrais humains.** Les chiffres de rétention ne prédisent pas le marché ; seul l'ordre des problèmes et leur convergence entre familles indépendantes sont exploitables. Rien n'a été testé sur un vrai iPhone, aucun son n'a été écouté, rien d'en ligne n'a été testé (serveur inaccessible).

## Les 10 conclusions

1. **Le record d'étage est fixé par l'horloge, pas par la force de l'équipe.** [mesure moteur] Un combat dure environ 1,2 min, rien n'accélère, et personne ne sait qu'une expédition entamée se reprend le lendemain. 44 fiches sur 100 ont un record figé avant le jour 12. C'est la cause de fond de la lassitude dans toutes les familles.
2. **La règle la plus importante du jeu n'est écrite nulle part.** [fait vérifié] La difficulté d'un étage suit le niveau moyen de l'équipe (`expectedLevel`). Une Secrète de niveau 1 ajoutée à des Communes niveau 10 fait s'effondrer l'équipe, et le joueur croit à un bug. 24 fiches, 6 abandons.
3. **Renforcer n'est jamais mis sur le chemin du joueur.** [fait + mesure] Sept occasionnels sur quinze finissent le mois avec une équipe entièrement niveau 1 et 950 à 2 020 cendres. L'écran affiche « Pas assez de cendres ? » avec 94 cendres alors qu'un niveau coûte 10.
4. **Les cendres n'ont pas de rythme.** [mesure moteur] Pénurie la première semaine, puis montagne inutile : 3 000 à 15 000 cendres mortes en moyenne selon la famille une fois l'équipe au niveau 10. Sublimer, le puits prévu, est caché dans l'onglet Rareté d'une fiche : 2 joueurs sur 100 l'ont trouvé.
5. **Les Secrètes et Mythiques viennent des gardiens, pas des boosters, et personne ne le sait.** [mesure moteur] 4 Secrètes tirées en 1 600 boosters chez les collectionneurs, contre 27 recrutées sur des gardiens (25 % de chance). Les chasseurs de Secrètes ouvrent des paquets pour rien.
6. **La variété s'effondre pour deux publics opposés.** Les séances courtes revoient le même Dévoreur 17 à 28 fois ; les longues voient le cycle complet des gardiens dès l'étage 30. Note de variété : 6,5 au jour 3, 4,5 au jour 30.
7. **Les textes faux coûtent la confiance.** [fait vérifié] Sept incohérences relevées en navigateur : « Sceau du Gardien » dans une bulle contre « Sceau du Serment » sur le bouton, « trophée » contre « Butin », « 100 % des PV » avec une créature tombée, « Remonter avec le coffre » aux étages 1 et 2 sans coffre, « Le Dévoreur » dont la carte s'appelle « Hydre de Lerne », une faute d'accord, une icône manquante. Cause directe d'un abandon, facteur pour deux autres.
8. **Le tutoriel est trop long pour ceux qui sautent et mal placé pour ceux qui lisent.** [fait vérifié] 29 bulles, 1 670 mots, 33 touchers avant le premier combat, trois bulles avancées (Marque, pouvoir d'équipe, dés) pendant un combat guidé de deux tours. 42 fiches.
9. **La première minute est le point aveugle de l'étude.** Compte obligatoire qui bloque sans réseau, 33 touchers, page 6 du guide qui promet des Duels alors verrouillés. Zéro abandon simulé au jour 1 parce que les profils étaient voués à jouer ; dans la vraie vie, c'est là que l'on perd le plus de monde.
10. **Ce qu'il faut protéger : l'ouverture des boosters, les cartes, les gardiens, les Sceaux.** La beauté est notée 8,4 et ne baisse pas. L'ouverture lente est le point fort le plus cité, y compris par ceux qui abandonnent. Les gardiens à mécanique et leur phase 2, le recrutement à 25 %, les Duels des Sceaux tels quels retiennent des joueurs de toutes les familles. Aucune correction proposée ne touche ces quatre éléments.

## Rétention simulée (à ne pas lire comme une prévision)

| Jour | Joueurs n'ayant pas décidé d'arrêter | Actifs (ouvert le jeu dans les 3 derniers jours) |
|---|---|---|
| J1 | 100 | 100 |
| J3 | 100 | 100 |
| J7 | 100 | 98 |
| J14 | 98 | 96 |
| J21 | 91 | 88 |
| J30 | 76 | 70 |

Au jour 30 : 58 actifs (dont 9 en déclin annoncé), 19 occasionnels, 23 abandons. Les abandons arrivent tard (15 sur 23 après le jour 21) parce que la simulation ne modélise pas la fuite du premier jour ; dans la réalité, elle serait la première cause de perte. Note globale moyenne : environ 7,2 au jour 3, 5,6 au jour 30. Détail par famille et causes dans `04-retention-simulee.md`.

## Les 10 modifications à faire en premier (meilleur rapport valeur / effort / risque)

Les sept premières sont des textes ou des conditions d'affichage : quelques heures de travail, aucun risque pour les sauvegardes.

1. **Relecture : un seul nom par objet** (Sceau du Serment, Butin, Dévoreur / nom de la carte, accord, icône manquante).
2. **Palier des étages 1 et 2 sans faux coffre** : ne plus écrire « Remonter avec le coffre » avant l'étage 3.
3. **PV de l'équipe calculés avec les créatures tombées** (plus de « 100 % » faux).
4. **« Pas assez de cendres ? » affiché seulement quand c'est vrai.**
5. **Plancher de difficulté visible** : « Niveau conseillé : N » au vestibule, et au bilan de défaite « ton équipe était en dessous du niveau attendu ».
6. **Renforcer sur le chemin** : un objectif du premier jour, un bouton au vestibule, une phrase au bilan de défaite.
7. **Annoncer l'ouverture des Duels des Sceaux** après le premier gardien (aucun occasionnel sur quinze n'y a joué en 30 jours).
8. **Reprise d'expédition expliquée et comptée** : dire qu'une expédition se reprend le lendemain, et que son étage compte pour le record.
9. **Premier combat allégé** : au plus une bulle à l'étage 1, les bulles avancées plus tard.
10. **Sublimer visible dans la Fournaise**, avec un objectif qui y mène quand l'équipe est au niveau 10.

Le backlog complet (39 propositions P0 à P3, avec preuves, difficulté, risque et critère de succès) est dans `03-backlog-et-priorites.md`.

## Fausses bonnes idées (à ne pas suivre)

Des joueurs demandent l'inverse les uns des autres : plus de bulles contre moins de bulles, des boosters plus généreux contre plus de prestige pour la rareté, des combats plus rapides contre plus de profondeur, du contenu neuf contre moins de répétition, un mode invité contre le compte obligatoire. Le détail et les compromis recommandés sont dans la partie 2 de `02-analyse-collective.md`. Direction retenue : **ne pas ajouter de systèmes** ; rendre visibles et compréhensibles ceux qui existent (plancher, Renforcer, Sublimer, reprise, gardiens), et corriger les textes.

## Incertitudes à valider avec de vrais joueurs

- **Solide** : les textes faux, les boutons sous le pli, l'icône manquante, les 33 touchers, le plancher non écrit, les chiffres d'économie (cendres mortes, Secrètes des gardiens).
- **À confirmer** : le poids réel du record figé dans la lassitude, la part des joueurs qui ne trouvent jamais Renforcer, l'effet du Dévoreur revu 20 fois.
- **Humains seulement** : la première minute (écran de compte réel, création de compte), la défense active au doigt sur un vrai écran, le son, la rétention du jour 1.

## Contenu du dossier

- `00-rapport-executif.md` : ce document.
- `fiches/` : les 100 fiches de joueurs, par famille (A collectionneurs, B stratèges, C roguelite, D occasionnels, E très investis, F univers et style, G sceptiques), chacune avec profil, évolution, notes J3 et J30, verdict et témoignage, puis un bilan de famille.
- `02-analyse-collective.md` : 18 thèmes, contradictions, 10 conclusions, limites de la méthode.
- `03-backlog-et-priorites.md` : 39 propositions P0 à P3, les 10 premières, ce qu'il ne faut pas changer, incertitudes.
- `04-retention-simulee.md` : tableau par jour et par famille, causes d'abandon.
- `annexes/` : modèle de référence du jeu (chiffres et règles lus dans le code), parcours réel d'un nouveau joueur, mesures du moteur par famille et par joueur, profils, simulateur et générateur de profils.

Aucune modification du jeu n'a été faite pendant l'étude. Version du jeu étudiée : v327.
