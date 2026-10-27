# Le Rituel interdit — conception (27 octobre 2026, à valider avant tout code)

Mode solo sans combat, roguelite de score, fondé sur les propriétés déjà présentes sur les 500 cartes.

## 0. Ce que le projet offre déjà (mesuré dans les données)

- 7 factions ; 7 rôles de combat (Attaquant 121, Protecteur 102, Entraveur 89, Soutien 58, Empoisonneur 53, Fléau 47, Soigneur 36) ; 6 raretés (C 137, PC 119, R 121, HR 78, M 41, S 10) ; 72 catégories (« Démon », « Ange », « Yōkai »…), dont 17 n'ont qu'une seule carte et 13 en ont 10 ou plus ; 19 lignées d'évolution ; 143 cartes dans des ensembles ; statistiques ATQ/DEF/VIT/MAG/PV ; niveau et finitions propres au joueur.
- La « puissance » d'une carte suit presque exactement sa rareté (C : 1-2, M/S : 9-10) : **à ne pas utiliser comme score**, sinon les cartes rares gagnent d'office.
- Simulation (`/tmp`, 400 mains de 7 cartes) : avec la règle « deux voisines partagent au moins une propriété parmi faction, rôle, rareté, catégorie », une chaîne de 5 est possible dans 97 % des mains → ce lien simple ne crée aucune tension. Avec « au moins **deux** propriétés partagées », la meilleure chaîne d'une main fait en moyenne 3,1 (grimoire de 20 cartes) et 2,7 (grimoire de 60) : la tension est là, et un grimoire resserré fait mieux qu'un grimoire large. Avec des Communes et Peu communes seulement, la moyenne monte à 3,7 : **les petites raretés se lient plus facilement**, ce qui protège contre le « les rares gagnent ».

## Étape A — Trois architectures

### A1. Le Cercle (l'intuition de départ : moteur positionnel)
- Règle : 8 emplacements en cercle ; à chaque manche, le rituel « tourne » et chaque créature déclenche son effet sur ses voisines, dans l'ordre ; on doit atteindre un seuil.
- Tour du joueur : acheter, vendre, déplacer des créatures entre les manches ; la résolution est automatique.
- Créatures : chacune a un effet (ajout, multiplication, répétition, inversion d'ordre…).
- Synergies : positions adjacentes, ordre de résolution.
- Difficulté : seuils croissants.
- Addiction : construction d'un moteur, explosion de chiffres.
- Différences : proche de Luck be a Landlord et des Jokers de Balatro (moteur passif).
- Risques : **peu de décisions pendant la manche** (on regarde le moteur tourner) ; une fois la bonne disposition trouvée, elle se répète (puzzle « résolu ») ; exactement le « jeu de placement prévisible » que tu ne veux pas ; il faut écrire un effet par créature.
- Développement : moyen ; animation de résolution lourde à lire sur petit écran.

### A2. La Litanie (chaîne de liens tirée d'une main) — **retenue**
- Règle : tu as une main de 7 créatures piochées dans ton grimoire. Tu prononces une Litanie : 2 à 5 créatures **dans l'ordre**. Deux voisines qui partagent des propriétés (faction, rôle, rareté, lignée) forment un Lien ; plus le lien est riche, plus la Ferveur (multiplicateur) monte. Score = Essence × Ferveur.
- Tour : choisir quelles cartes et dans quel ordre ; ou défausser pour repiocher.
- Créatures : leurs propriétés **existantes** font tout le jeu de base ; leur rôle donne un « verbe » (7 effets pour 500 cartes) ; leur faction peut être « éveillée » par une relique.
- Synergies : liens doubles et triples, verbes qui réagissent à la position, reliques qui changent la valeur des liens.
- Difficulté : seuils, malédictions des Gardiens, grimoire qui grossit.
- Addiction : chaque main est un petit problème neuf ; les gros coups (« Nœud » de 3 propriétés) se voient et se calculent ; la construction se fait entre les rites.
- Différences : aucune main de poker ; la valeur vient des **relations entre cartes voisines**, pas de figures fixes ; aucun mode existant ne fonctionne ainsi (Pacte = stop ou encore, Sceaux = grille, Cryptes = mémoire, Enchères = offres).
- Risques : un style « une seule faction » trop fort ; lisibilité des liens ; trop de couches d'effets.
- Développement : moyen ; tout est déterministe (graine) : compatible avec le serveur de partie.

### A3. Le Puits (sac de créatures, tirer ou s'arrêter)
- Règle : tes créatures sont dans un sac ; tu les tires une à une dans le Puits ; chaque créature ajoute de l'Essence et parfois de la Corruption ; trop de Corruption et le rite échoue.
- Tour : tirer encore ou s'arrêter ; entre les rites, ajouter ou retirer des créatures du sac.
- Synergies : effets à l'entrée dans le Puits, purification.
- Addiction : tension du « encore une », forte.
- Risques : **double du Pacte** (même boucle), décisions surtout binaires, sentiment de hasard.
- Développement : faible.

### Comparaison

| Critère | A1 Cercle | A2 Litanie | A3 Puits |
|---|---|---|---|
| Décisions à chaque tour | faibles | **fortes** (choix + ordre + défausse) | binaires |
| Utilise les cartes telles quelles | non (un effet par carte) | **oui** (propriétés) | en partie |
| Profondeur de construction | forte | forte | moyenne |
| Lisibilité mobile | moyenne | bonne si liens dessinés | très bonne |
| Risque de « déjà vu » | Balatro / Landlord | faible | **le Pacte** |
| Les rares gagnent-elles ? | oui si effets par rareté | **non** (se lient moins) | dépend |
| Coût de développement | moyen + 500 effets | moyen | faible |

**Choix : A2 la Litanie**, avec deux idées reprises : le moteur des reliques de A1 (règles qui changent la valeur des liens) et le risque volontaire de A3 (Sacrifice, malédictions acceptées contre des Âmes).

## Étape B — Une partie entière

1. **Lancement** (Le Cercle → Rituel) : « Rituel du jour » (mêmes conditions pour tous) ou « Rituel libre ». Choix du **grimoire de départ** : 3 tirages de 5 créatures **pris dans ta collection** (plus 3 Âmes errantes prêtées si tu as moins de 20 cartes), tu en gardes 4 dans chaque tirage → 12 créatures. Tu ne prends pas « tes meilleures » : tu prends celles qui **se lient**.
2. **Écran** (portrait, une main) : en haut, le seuil du rite, ton score, les Litanies et défausses restantes ; au centre, l'**Autel** (5 cases) où se pose la Litanie, avec entre chaque carte un **sceau de lien** qui s'allume (icône de faction, de rôle, de rareté, de lignée) ; en bas, la main de 7 en éventail ; un aperçu « Essence × Ferveur = score » qui se met à jour pendant que tu poses.
3. **Actions** : toucher une carte de la main la pose à la suite sur l'Autel (toucher sur l'Autel la retire) ; « Prononcer » joue la Litanie ; « Défausser » (sélection de 1 à 5 cartes) pioche autant. 3 Litanies et 3 défausses par rite.
4. **Gagner des créatures et améliorations** : après chaque rite réussi, l'**Antichambre** : tu reçois des Âmes (base + Litanies non utilisées + dépassement du seuil) et tu choisis parmi : recruter une créature (3 offres tirées de ta collection, la rareté ne change pas le prix), bannir une créature du grimoire, acheter un **Sceau interdit** (relique), poser une **Mutation** sur une créature. Une fois sur deux, un **Événement** remplace une offre (§D).
5. **Calcul du score** :
   - Chaque créature apporte **10 d'Essence** (la même pour toutes).
   - Chaque paire de voisines compte ses propriétés communes : faction, rôle, rareté, lignée.
     - 1 propriété = **Lien** : +1 Ferveur.
     - 2 propriétés = **Lien tressé** : +3 Ferveur.
     - 3 propriétés = **Nœud** : +3 Ferveur puis ×2.
     - 4 propriétés = **Nœud parfait** (rare : même lignée, même faction, même rôle, même rareté) : +3 puis ×3.
     - 0 propriété = **Rupture** : la Ferveur accumulée jusque-là est **divisée par 2**.
   - Ferveur de départ : 1. Ordre de calcul : les ajouts dans l'ordre de la Litanie, puis les multiplications, puis les verbes.
   - Score = Essence × Ferveur, ajouté au total du rite.
6. **Seuils** : 3 Cercles de 2 rites (un rite simple, puis un rite de **Gardien** avec une malédiction). Seuils : I = 200 / 400 ; II = 1 000 / 1 800 ; III = 4 500 / 8 000. Après le Cercle III : **Descente sans fin** (seuil ×1,8 à chaque rite) pour le record.
7. **Événements** : choix à coût et contrepartie (§D) ; les malédictions des Gardiens forcent à changer de plan.
8. **Bascule** : une relique ou une mutation transforme un type de lien faible en moteur (exemple ci-dessous).
9. **Fin** : un rite non atteint après les 3 Litanies → la partie s'arrête ; ou victoire après le Gardien du Cercle III, puis la Descente sans fin.
10. **Ce qu'on garde** : record personnel, rang au Rituel du jour, **Grimoire des Litanies** (journal des Nœuds parfaits et des combinaisons découvertes, avec l'illustration des deux créatures liées), Sceaux débloqués pour les parties suivantes (de la variété, pas de la puissance), petite récompense en éclats plafonnée par jour, titres. Rien qui rende la Descente plus facile.

### Exemple de partie (nombres cohérents avec les règles ci-dessus)
- **Grimoire** : 12 créatures, dont 4 Démons infernaux (2 Attaquants, 1 Soutien, 1 Fléau), 3 créatures marines abyssales, 2 Anges célestes Soigneurs, 3 divers.
- **Rite I-1, seuil 200.**
  - Main : Diablotin (Infernal, Attaquant, Démon, C), Imp (Infernal, Soutien, Démon, C), Kappa (Sauvage, Entraveur, Yōkai, PC), Sirène (Abyssal, Soutien, marine, PC), Ange gardien (Céleste, Soigneur, Ange, R)…
  - Litanie « Imp → Diablotin » : faction + lignée + rareté = **Nœud**. Ferveur (1+3)×2 = 8. Essence 20, mais Diablotin est Attaquant **en dernier** (son verbe ×3 sur son Essence) : 10 + 30 = 40. Score 40 × 8 = **320**. Rite réussi avec une seule Litanie : 2 Litanies non jouées = +2 Âmes.
- **Antichambre** (6 Âmes) : le joueur hésite entre recruter un 3e Démon (4 Âmes) et le Sceau « **Encre de sang** » (5 Âmes : les bonus d'Essence deviennent de la Ferveur). Il prend le Démon : il construit un plan « Démons ».
- **Rite I-2 (Gardien : Schisme, les liens de faction ne comptent pas), seuil 400.**
  - Son plan « Démons » perd le lien de faction.
  - Litanie 1 : « Démon Soutien PC → Kappa PC → Sirène PC ». Seule la rareté est commune : deux Liens, Ferveur 1 + 1 + 1 = 3. Essence 30 → **90**.
  - Il défausse 3 cartes et repioche.
  - Litanie 2 : « Imp → Diablotin ». Lignée + rareté (la faction ne compte plus) = Lien tressé, Ferveur 1 + 3 = 4. Essence 10 + 30 (Coup de grâce) = 40 → **160**. Total 250.
  - Litanie 3 : il a gardé ses deux Anges, Soigneurs, Célestes, Rares. Rôle + lignée + rareté = Nœud, Ferveur (1 + 3) × 2 = 8. Essence 20 → **160**. Total **410** : le Gardien tombe de justesse.
  - S'il avait joué ses Anges trop tôt, il perdait : la malédiction l'a obligé à garder sa meilleure paire pour la fin.
- **La bascule (Cercle II, Gardien à 1 800)** :
  - Le joueur a pris le Sceau **Chœur unanime** (×3 si tous les liens partagent une même propriété) et monté un grimoire céleste.
  - Il a aussi un Protecteur céleste dont la DEF est la plus haute stat (signe **Garde** : ses deux liens comptent une propriété de plus).
  - Litanie de 5 Célestes, Protecteur en 2e place, Attaquant en dernier :
    - les deux liens du Protecteur deviennent des Liens tressés (+3, +3) ;
    - les deux autres sont de simples Liens de faction (+1, +1) ;
    - tous partagent la faction, donc le Chœur s'applique.
  - Ferveur (1 + 3 + 3 + 1 + 1) × 3 = **27**. Essence 40 + 30 (Coup de grâce) = 70 → **1 890** en une seule Litanie, plus que tout le seuil du Gardien.
  - C'est le moment « attends, si je combine ça avec ça… » : un Protecteur, carte banale dans ce mode, devient la pièce maîtresse.

## Étape C — Les effets des créatures (aucune réécriture des 500 cartes)

Trois couches, toutes calculées depuis les données existantes :
- **Couche 1, les liens** : tout le monde, sans texte.
- **Couche 2, le verbe du rôle** : 7 effets pour 500 cartes, montrés en une ligne sur la carte.
- **Couche 3, le rite de faction** : 7 effets, **endormis** au départ et réveillés seulement par un Sceau de faction (pour garder la base simple).
- Plus quelques signes rares tirés des statistiques, des lignées d'évolution et des ensembles.

Une seule table manuelle est nécessaire : les **72 catégories regroupées en ~12 lignées** (Démons, Anges, Morts-vivants, Créatures marines, Yōkai, Dieux anciens, Bêtes, Dragons et serpents, Esprits, Automates, Mythologiques, Primordiaux). Les 17 catégories d'une seule carte deviennent ainsi utiles.

| # | Nom | Source | Effet exact | Synergie | Puissance | Risques |
|---|---|---|---|---|---|---|
| 1 | Coup de grâce | Attaquant | En **dernière** place : son Essence ×3. | Tout ce qui pousse à finir sur un Attaquant ; Sablier inversé. | moyen | trop simple → plafonné à une fois par Litanie |
| 2 | Pont | Protecteur | La carte **après** lui n'a pas besoin de lien (pas de Rupture, mais pas de bonus). | Glisser une carte isolée ; Chœur unanime. | moyen | avec plusieurs Protecteurs, liens inutiles → le pont ne se cumule pas |
| 3 | Rappel | Soigneur | Après la Litanie, une créature jouée revient dans la main. | Rejouer un Attaquant ; garder une paire rare. | moyen | boucle Soigneur ↔ Soigneur : il ne peut pas se rappeler lui-même |
| 4 | Venin | Empoisonneur | +1 Venin sur le rite ; chaque Litanie suivante de ce rite gagne +5 Essence par Venin. | Jouer les Empoisonneurs tôt ; Mutation Écho. | faible au début, fort en fin de rite | explosion : Venin plafonné à 6 par rite |
| 5 | Écho | Entraveur | Recopie le lien précédent (même s'il n'en forme pas). | Recopier un Nœud = +3 et ×2 une 2e fois. | fort | Écho → Écho → Écho : un Écho ne recopie pas un Écho |
| 6 | Cantique | Soutien | +1 Ferveur par créature de **sa faction** placée après lui. | Litanie mono-faction, Soutien en tête. | moyen | domination du mono-faction → Schisme, Bestiaire ouvert |
| 7 | Sacrifice | Fléau | Ferveur ×2, puis le Fléau quitte le grimoire pour la partie. | Très fort pour un seuil serré ; perte du moteur. | fort, coûteux | grimoire vidé : jamais en dessous de 8 cartes |
| 8 | Brasier | Infernal (éveillé) | +1 Ferveur pour chaque Infernal qui suit un Infernal ; la dernière carte brûle (défaussée). | Chaîne infernale longue. | moyen | défausse forcée = vraie contrepartie |
| 9 | Marée | Abyssal (éveillé) | Les Abyssaux gagnent +2 d'Essence à chaque Litanie jouée dans le rite. | Garder les Abyssaux pour la 3e Litanie. | croissant | aucun |
| 10 | Auréole | Céleste (éveillé) | La première Rupture de chaque Litanie est ignorée. | Litanies longues et risquées. | moyen | avec Pont : plafonné |
| 11 | Meute | Sauvage (éveillé) | +3 d'Essence par Sauvage **gardé en main**. | Décision : jouer ou garder. | moyen | main pleine de Sauvages → plafond +15 |
| 12 | Retour | Nécrotique (éveillé) | +2 d'Essence par créature défaussée ce rite. | Défausser beaucoup ; Lanterne des âmes. | croissant | plafonné à 10 défausses comptées |
| 13 | Résonance | Primordial (éveillé) | Son Essence devient la plus haute Essence de la Litanie. | Après un Attaquant final ou de la Marée. | fort | copie de copie interdite |
| 14 | Mécanisme | Artificiel (éveillé) | Rejoue le verbe de la carte juste avant. | Artificiel après un Cantique ou un Venin. | fort | ne rejoue pas Sacrifice ni Mécanisme |
| 15 | Force | ATQ la plus haute de ses stats | +ATQ/2 en Essence. | Builds « Essence ». | faible | aucun |
| 16 | Arcane | MAG la plus haute | +1 Ferveur si ses deux voisines sont de factions différentes. | Builds multi-factions (contre le mono). | moyen | aucun |
| 17 | Célérité | VIT la plus haute | Pioche 1 carte après la Litanie. | Défausses gratuites. | moyen | pioche infinie : max 1 par Litanie |
| 18 | Garde | DEF la plus haute | Les liens avec ses deux voisines comptent +1 propriété (s'il y a déjà un lien). | Transforme des Liens en Liens tressés. | fort | deux Gardes voisins : +1 au total |
| 19 | Métamorphose | Lignée d'évolution | Deux stades consécutifs d'une même lignée : Nœud automatique. | Collectionner une lignée complète. | fort, rare | 19 cartes seulement : ressenti « trouvaille » |
| 20 | Ensemble | Ensembles de cartes | 3 cartes d'un même ensemble dans la Litanie : +5 Ferveur. | Les ensembles de la collection deviennent utiles. | moyen | 143 cartes : à surveiller |
| 21 | Présence | Mythique / Secrète | Son verbe joue deux fois, **mais** elle n'a jamais de lien de rareté (trop seule). | Puissante en milieu de chaîne, difficile à lier. | moyen | équilibré par la rareté des liens |
| 22 | Reflet | Finition affichée | **Cosmétique seulement** : la carte brille sur l'Autel. | — | nul | les finitions s'achètent (Sublimer) : jamais d'effet de score (pas de pay-to-win) |

Le niveau des cartes n'a **aucun effet** dans ce mode : un débutant et un vétéran jouent à armes égales.

## Étape D — Sceaux interdits (reliques), Mutations, Événements

### Sceaux (achetés dans l'Antichambre, 3 au plus à la fois)
1. **Encre de sang** : les bonus d'Essence (Venin, Marée, Meute, Force, Gravée…) deviennent de la Ferveur : +10 d'Essence → +1 Ferveur ; l'Essence de base (10 par créature) ne change pas. *Faible au début, monstrueux avec Venin, Marée et Meute.*
2. **Chœur unanime** : ×3 si tous les liens de la Litanie partagent une même propriété. *Mono-faction ou mono-rôle.*
3. **Bestiaire ouvert** : +1 Ferveur par faction différente dans la Litanie. *L'inverse du Chœur : on ne peut pas tout avoir.*
4. **Couronne d'épines** : Ferveur ×2, mais les Litanies font 3 créatures au plus.
5. **Ouroboros** : si la dernière carte se lie à la première, ce lien compte aussi (la Litanie se referme). *Avec Écho et Garde.*
6. **Sablier inversé** : les verbes « en dernière place » jouent en première place et inversement. *Change le rôle des Attaquants et des Soutiens.*
7. **Cloche du glas** : chaque Litanie de 5 donne +1 Ferveur permanente pour la partie. *Pousse à des chaînes longues au lieu de Nœuds courts.*
8. **Pacte du vide** : +3 défausses par rite, mais main de 5. *Avec Retour (Nécrotique).*
9. **Lanterne des âmes** : chaque créature défaussée dans le rite donne +0,5 Ferveur à la prochaine Litanie.
10. **Grimoire des noms** : les lignées voisines (Démons ↔ Anges déchus, Dragons ↔ serpents…) comptent comme la même lignée. *Ouvre des Nœuds.*
11. **Miroir fêlé** : la première créature de chaque Litanie est rejouée à la fin ; tous les 3 usages, une carte de ta main est détruite pour le rite.
12. **Tisserand** : les raretés voisines (C/PC, R/HR, M/S) forment un lien de rareté. *Rend les Mythiques liables.*
13. **Sceau brisé** : plus de Ruptures, mais tous les liens rapportent moitié moins.
14. **Calice de la Fournaise** : chaque Sacrifice rapporte 3 Âmes. *Économie de Fléaux.*
15. **Œil du Rêveur** : tu vois les 3 prochaines cartes de la pioche. *Contrôle, pour les joueurs qui planifient.*
16. **Les 7 Sceaux de faction** : éveillent le rite de faction (n° 8 à 14 du tableau C).

### Mutations (posées sur une créature, pour la partie)
- **Double allégeance** : 2e faction.
- **Métamorphe** : sa lignée se lie à toutes.
- **Écho** : son verbe joue deux fois.
- **Gravée** : +2 d'Essence chaque fois qu'elle est jouée (elle grandit pendant la partie).
- **Masque** : copie le rôle de sa voisine de gauche.

### Événements (une offre sur deux, entre les rites)
- **L'Autel des noms** : bannis 2 créatures, gagne un Sceau gratuit.
- **Le Collectionneur** : échange ta meilleure Mutation contre 8 Âmes.
- **Malédiction volontaire** : accepte la malédiction du prochain Gardien dès maintenant, contre +6 Âmes.
- **Le Double** : une créature est copiée dans le grimoire (avec ses Mutations).
- **Le Gouffre** : saute le prochain rite simple (pas d'Âmes de ce rite), le Gardien arrive tout de suite.

Rappel : aucun mot de jeu d'argent (« mise », « pari », « jackpot », « tenter sa chance ») depuis le refus d'Apple du 24 octobre 2026.

## Étape E — Progression

- **Durée** : 6 rites × (3 Litanies d'environ 15 s, plus 20 s d'Antichambre) ≈ 5 à 6 min ; la partie est sauvegardée à tout moment (fermer l'app ne la perd pas).
- **Seuils** (calés sur l'exemple) :

  | Cercle | Rite simple | Gardien |
  |---|---|---|
  | I | 200 | 400 |
  | II | 1 000 | 1 800 |
  | III | 4 500 | 8 000 |

  Puis la Descente sans fin ×1,8 par rite. La croissance par 4 à 5 d'un Cercle à l'autre oblige à **construire**, pas seulement à bien jouer sa main.
- **Gardiens** (une malédiction, tirée parmi 6 ; la même pour tous au Rituel du jour) : Schisme (pas de lien de faction), Silence (pas de verbes), Étau (Litanies de 3 au plus), Brouillard (la main est retournée jusqu'à ce qu'on la touche), Avarice (chaque défausse coûte 1 Âme), Miroir noir (la lignée ne compte pas).
- **Récompenses intermédiaires** : Âmes à chaque rite, Sceau gratuit après chaque Gardien.
- **Score comparable** : total de la partie (somme des rites, plus la Descente sans fin).
- **Rituel du jour** : même graine, même grimoire **prêté** à tous (indépendant de la collection, donc équitable) ; une tentative comptée ; classement (plus tard, avec un SQL).

## Étape F — Critique honnête

- **Mono-faction dominant** (Cantique, Chœur, liens faciles)
  - Contre-mesures : le Gardien Schisme ; Bestiaire ouvert et Arcane récompensent l'inverse ; Rupture coûteuse.
  - À mesurer par simulation avant l'implémentation (un robot par style, comme `tools/chasse-sim.mjs`).
- **Explosion multiplicative** : voulue, comme dans Balatro.
  - Les plafonds par effet (Venin 6, Écho et Mécanisme non récursifs) empêchent les boucles.
  - La Descente sans fin absorbe les scores énormes.
  - Les nombres s'affichent en « 12,4 k », « 3,1 M ».
- **Partie triviale** avec Encre de sang + Marée + Venin
  - Les Sceaux sont limités à 3.
  - La rotation des offres est réglée pour que deux Sceaux « moteurs » arrivent rarement avant le Cercle II.
- **Manque de contrôle** (mauvaise main) : 3 défausses, Célérité, Œil du Rêveur ; aperçu du score avant de valider ; il n'y a jamais de hasard dans le calcul.
- **Répétitivité**
  - Les 6 malédictions, les 7 rites de faction à éveiller, le Grimoire des Litanies à remplir et le Rituel du jour varient les parties.
  - Prévoir d'ajouter des Sceaux par saison.
- **Lisibilité**
  - Au plus 5 cartes sur l'Autel, avec le lien dessiné en icônes entre elles. La couleur de l'icône allumée dit la force du lien : gris = Lien, or = Lien tressé, violet = Nœud.
  - Une seule ligne de verbe par carte ; les rites de faction n'apparaissent que si leur Sceau est possédé.
- **Surcharge d'interface** : l'Antichambre a 4 offres au plus ; les détails s'ouvrent en fenêtre au toucher long.
- **Collection de 500 cartes**
  - Le grimoire est tiré **de** la collection ; les recrues sont proposées à partir de la collection, en favorisant les cartes qui se lient au grimoire (sinon les offres seraient inutiles).
  - Un joueur à 15 cartes reçoit des Âmes errantes prêtées (Communes neutres).
  - La table « catégorie → lignée » est la seule chose à écrire à la main (72 lignes) ; les futures cartes y entrent toutes seules.
- **Ce que je n'aime pas encore**
  - Le Rappel du Soigneur peut rendre la main « trop confortable ».
  - L'Écho de l'Entraveur est peut-être le meilleur verbe.
  - Les deux sont à surveiller dans le prototype.
  - Le rite de faction Brasier (défausse forcée) est le seul vraiment punitif : à tester tel quel.

## Étape G — Prototype minimal

- **Contenu**
  - 7 verbes de rôle (couche 2) et les liens (couche 1), sur **toute la collection** : aucune carte à écrire. Le prototype a donc déjà ses 500 créatures.
  - 8 Sceaux : Encre de sang, Chœur unanime, Bestiaire ouvert, Couronne d'épines, Ouroboros, Cloche du glas, Pacte du vide, Tisserand.
  - 2 Mutations : Double allégeance, Écho.
  - 4 rites (Cercles I et II), 2 malédictions (Schisme, Étau).
  - Antichambre : recruter, bannir, Sceau.
- **Reporté** : rites de faction, signes de stats, Métamorphose, Ensembles, Événements, Descente sans fin, Rituel du jour, classement.
- **Règles à coder** : `js/core/rituel.js` (graine, pioche, liens, score, verbes, Sceaux), opérations rejouées par le serveur (`ritualStart`, `ritualPlay`, `ritualDiscard`, `ritualShop`) dans `OPS`/`ARGS`, état dans la sauvegarde (`s.rituel`).
- **Écran** : `js/screens/rituel.js`, avec l'Autel, la main, l'aperçu du score, l'Antichambre et le bilan.
- **Réutilisé** : `cardHTML` en mini, icônes de faction et de rôle, sons existants.
- **Indicateurs de réussite**
  - Part des parties relancées dans la minute qui suit une défaite (> 50 %).
  - Durée médiane d'une partie (4 à 7 min).
  - Part des Litanies qui contiennent un Nœud (10 à 25 % : rare mais atteignable).
  - Diversité des Sceaux achetés par les gagnants (aucun > 40 %).
  - Écart de score entre une collection de Communes et une collection pleine de Mythiques : **doit rester faible**.
  - Simulation par robots avant de faire tester des humains.
