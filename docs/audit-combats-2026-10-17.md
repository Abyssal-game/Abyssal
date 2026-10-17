# Audit de complexité des combats (17 octobre 2026)

Relevé fait dans le code (v396), sans rien modifier : chaque mécanique, l'étage où un joueur qui débute la rencontre, ce qui l'explique.

## Constat

- **Rien n'est réellement débloqué progressivement.** Seules trois bulles d'aide sont repoussées à l'étage 3 de la première expédition (pouvoir d'équipe, combinaisons, dés) ; les mécaniques elles-mêmes sont toutes actives dès l'étage 1.
- **Étage 1** : une vingtaine de notions visibles ou actives. Frise et vitesse, PA par créature, attaque au nom propre, compétence, défense, permuter et entrées en scène, Ferveur et pouvoir d'équipe, statuts, familles d'ennemis, garde des Protecteurs, Riposte, Brèche, enchaînement, synergie, dé et lancer chargé, Marque, Assaut conjoint, faiblesse de faction, coup de grâce, Exécution, relations Proie/Rivaux, résumé du tour ennemi, bonus d'après combat et bénédictions.
- **Étage 2 (élite)** : pic brutal. Jauge de Brisure, Fêlure, coup de rupture, Brisure, grosses attaques annoncées, barre de défense sur chaque coup, talents, et trois bulles d'aide d'affilée.
- **Étage 3** : objectifs de combat, traits des ennemis, 3 ennemis, premier coffre, et rafale des trois bulles repoussées.
- **Étage 5 (premier gardien)** : présentation, runes, serviteur, intentions des ennemis ordinaires, phase 2 « Engloutir ». Puis présages et Gouffre débloqués.

## Incohérences relevées (à corriger en priorité)

1. Le tutoriel de défense dit « les attaques ordinaires ne demandent rien », alors que les coups chargés, déflagrations et gels des ennemis ordinaires déclenchent la barre.
2. Avant l'étage 5, un ennemi ordinaire qui « se charge » n'est pas annoncé sur sa carte : la barre de défense arrive sans prévenir.
3. La bulle des intentions décrit « à son tour / au tour suivant », texte masqué à l'écran (il ne reste qu'une icône).
4. La bulle de la Ferveur parle des « losanges violets », mais l'étiquette « Ferveur » est masquée.
5. Le Coup d'estoc annonce « exposée » mais l'état affiché est « Déséquilibrée » ; « Exposé » existe encore à côté.
6. Fêlé et Brisé utilisent la même icône.
7. Runes du gardien appelées « sceaux » dans un message.
8. Épuisement : l'aide dit « au-delà du 15e tour », il commence au 15e.
9. Règle du jour invisible pendant le combat, alors qu'elle change les dégâts.
10. Code mort : `intentChip`, `drawAims`, `threats` calculé sans être utilisé, pactes (retirés en v250).

## Mots qui se marchent dessus

Carapace (5 sens), Sceau (5), Miroir (4), Chasse (4), Proie (3), Renaissance (3), Égide (3), Dévoreur (3), Raz-de-marée (3), Furie (3), Exécution (2), Bris de glace (2), Marée montante (2), Hâte (2), Enchaînement / Enchaînée / Chaînes, Défense / Défense active, Riposte (charges) / « Riposte ! » (contre-attaque), Ralenti / Retardée (même icône que « Dans l'ombre »), Protecteur / Soutien / Gardien (rôles alliés et familles ennemies). La phase 2 des gardiens est appelée « phase 2 », « Furie » et « déchaîné ».

## Pistes

1. Corriger les incohérences ci-dessus (sans changer le jeu).
2. Déblocage réel par paliers pour la première expédition.
3. Harmoniser le vocabulaire (un mot = une idée).
4. Simplifier la Brisure à l'affichage (« Brisé » + « brise-le pour annuler son gros coup »).
5. Alléger l'écran par défaut (moins de pastilles, détail au toucher).
