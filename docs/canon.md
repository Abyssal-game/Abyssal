# ABYSSAL — Le canon de l'histoire (v673)

Référence unique pour tout texte d'histoire (récits de la Descente, fiches des gardiens, Chroniques du Bestiaire, futurs arcs). Tout nouveau texte doit rester d'accord avec ce fichier.

## Les vérités (ce qui est vrai, même si le joueur ne le sait pas encore)
1. **Le Bestiaire** a été forgé par les **sept royaumes** pour enfermer leurs créatures (Le Premier Souffle). Chaque page est un sceau, chaque sceau une créature.
2. **Les premiers Scelleurs** sont les **sept gardiens**, un par royaume, qui ont posé la main sur la reliure et juré de ne jamais l'ouvrir (Chronique II, prologue).
3. **Le Menteur est l'Horloger**, gardien des Artificiels, dernier artisan de la Forge Sans Maître. Il a glissé dans le livre **une page de trop** : le **Rêveur Sous la Fosse** (ABY-048). Il a aussi réglé l'horloge des Sceaux pour qu'elle ne sonne jamais la fin. Il a disparu (Chronique VII) : son nom, le septième, est **gratté** sur la première page.
4. **Le Rêveur** dort sous toutes les fosses. **L'Abysse est le plus grand de ses rêves** ; les **vingt gardiens** de la Descente sont les rêves de l'Abysse (des souvenirs déformés : l'Architecte, le Seigneur des Chaînes, le Juge croient avoir bâti, forgé ou écrit les Sceaux).
5. **Qui a déchiré le Bestiaire** : l'Abysse, qui voulait être lu, pour que celui qui rêve se réveille.
6. **Les royaumes se battent pour rester éveillés** : si tous dorment, le Rêveur s'éveille (Chronique X, Titans).
7. **Fin de la Descente** : vaincre l'Abysse referme l'œil… et **réveille le Rêveur** (« quelque chose vient d'ouvrir les yeux »). C'est la porte de la suite.

## Les indices déjà posés (dans l'ordre où le joueur les trouve)
| Où | Indice |
|---|---|
| Chronique I (1re carte) | un battement « régulier comme un tic-tac » |
| Chronique II (10 cartes) | un des sept gardiens a menti |
| Chronique VII (160 cartes) | l'Horloger, dernier artisan, a disparu |
| Chronique IX (250 cartes) | le Menteur a glissé une page de trop : le Rêveur |
| Figure « L'Horloger » | il a scellé le Bestiaire au nom des Artificiels |
| Figure « Lilith » | elle sait lequel a menti |
| Chapitre 10 (mi-chemin) | il a volé du temps aux Scelleurs ; une page pliée d'un vélin unique, qu'il cache |
| Fiche du gardien Horloger | ce n'est qu'un rêve à son image ; le vrai, l'un des sept, n'a jamais été revu |
| Chapitre 19 | la page de la Bête a été « recollée » (travail d'artisan) |
| Chapitre 20 | « un œil qui s'ouvre appartient toujours à quelqu'un » |
| Épilogue | 7 noms, le septième gratté ; quelque chose ouvre les yeux ; ombre de « Celui qui rêve » |

## Ce que le joueur ne doit **pas** encore lire en clair
- Que l'Horloger est le Menteur (seulement des indices). La révélation est pour le premier arc après la sortie.
- Le nom du Rêveur dans la Descente (on montre son ombre, sans nom).

## Structure (inchangée)
20 chapitres de 5 étages, 20 gardiens dans `BOSS_ORDER`, l'Horloger au chapitre 10 (milieu), l'Abysse à l'étage 100. Aucune raison de changer l'ordre ni le nombre d'étages.

## Suite prévue (après la sortie)
Arc 1 « La Première Veille » : le Rêveur éveillé, les royaumes qui luttent pour ne pas s'endormir, la chasse à l'Horloger (le vrai), Lilith qui répond enfin.

## Saisons du Codex (v674)
Pas de fêtes de la vraie vie (ni Noël, ni Saint-Valentin…). Chaque saison est une **veille** : depuis que le Rêveur remue, un royaume ou une figure du Bestiaire veille pour qu'il ne s'éveille pas. L'accroche de chaque saison (`pitch`, `js/core/codex.js`) le dit en une phrase.

| N° | Clé | Saison | Royaume / figure | Dates |
|---|---|---|---|---|
| I | s1-ames | La Nuit des Âmes | Nécrotique (le Passeur) | nov. 2026 |
| II | s3-hiver | L'Hiver éternel | la Matriarche du Givre | déc. 2026 |
| III | s9-marees | Les Marées noires | Abyssal (la Fosse du Rêveur) | janv. 2027 |
| IV | s5-racines | Le Réveil des Racines | Sauvage (la Forêt Première) | févr. 2027 |
| V | s6-carnaval | La Cour sans Visage | le Roi sans Visage | mars 2027 |
| VI | s4-coeurs | Le Pacte de sang | Infernal (la Géhenne) | avr. 2027 |
| VII | s7-lune | Les Jardins de la Lune pâle | Céleste (les Sept Cieux) | mai 2027 |
| VIII | s10-forge | La Forge sans Maître | Artificiel (indice sur l'Horloger) | juin 2027 |
| IX | s8-solstice | Le Brasier des Titans | Primordial (les Titans endormis) | juil. 2027 |
| X | s11-moissons | Les Moissons d'ombre | les songes semés par le Rêveur | août 2027 |
| XI | s12-anniv | Les Pages perdues | le Bestiaire lui-même | sept. 2027 |
