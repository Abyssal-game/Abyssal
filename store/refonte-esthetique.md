# Refonte esthétique (tour du 27 octobre 2026)

Prompts Gemini pour remplacer ce qui ne suit pas l'identité du jeu (orfèvrerie ancienne, enluminure gothique, bougies, or et noir).

## 1. Cadres de profil encore dessinés en simple trait de couleur (22)

Intégration : `python3 tools/frame-art.py <clé> <image> --fit` puis brancher l'image sur `.pf-<clé>` comme les cadres du Codex.

### 1.1. `base` — Cadre de fer (cadre de départ)

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau assez fin (environ 10 % du diamètre) de fer noirci martelé, sobre et solide, cerclé de deux filets de fer plus clair, tenu par huit gros rivets ronds régulièrement espacés ; fines rayures d'usure et légère patine de rouille brune dans les creux. Couleurs : gris fer sombre, reflets argent froid, touches de rouille. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.2. `or` — Cadre d’or

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 13 % du diamètre) d'or ancien ciselé de feuilles d'acanthe qui s'enroulent tout autour, bordé de deux rangs de petites perles d'or ; quatre petits grenats taillés en cabochon aux points cardinaux. Couleurs : or chaud et profond, ombres brun-bronze, rouge grenat. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.3. `prisme` — Cadre prismatique

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 13 % du diamètre) de cristal taillé à facettes, serti dans une fine monture d'argent ancien ; la lumière se décompose dans le cristal en reflets irisés discrets (rose, vert, bleu, or), comme un vitrail de pierre précieuse, sur un fond de cristal sombre presque noir. Couleurs : noir cristal, reflets arc-en-ciel subtils, argent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.4. `titan` — Cadre des Titans

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau très épais (environ 17 % du diamètre) de pierre colossale gris-vert, sculptée de deux titans endormis couchés le long du cercle, leurs grandes mains de pierre se rejoignant en haut ; des chaînes de bronze vert-de-gris brisées pendent sur leurs bras. Couleurs : pierre grise et verte, bronze patiné, mousse sombre. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.5. `neant` — Cadre du Néant

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) d'obsidienne noire polie, fendue en plusieurs endroits ; par les fissures suinte une lumière violette froide, comme si le vide se trouvait derrière la pierre ; de fins éclats d'obsidienne restent attachés au bord extérieur. Couleurs : noir profond, violet lumineux, reflets bleu nuit. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.6. `infernal` — Cadre infernal

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de chaînes de fer chauffées au rouge, tressées serré, retenues par quatre sceaux de cire rouge sang marqués d'une flamme cornue stylisée ; petites flammes nettes qui sortent entre les maillons. Couleurs : noir fer, rouge braise, orange incandescent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.7. `abyssal` — Cadre abyssal

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de corail noir et de coquillages nacrés, entrelacé de fins tentacules bleu nuit ponctués de points bioluminescents cyan ; trois perles noires et une grande perle grise en haut. Couleurs : bleu des profondeurs, cyan lumineux, nacre, noir. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.8. `celeste` — Cadre céleste

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) d'argent blanc et d'or pâle, recouvert de plumes blanches superposées comme des écailles ; en haut, de fins rayons d'or qui s'écartent en éventail ; de petits nuages sculptés en argent à la base. Couleurs : blanc nacré, or pâle, bleu ciel très léger dans les ombres. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.9. `sauvage` — Cadre sauvage

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de racines et de bois noueux tressés, couverts de mousse vert sombre et de quelques feuilles d'automne ; deux crocs de loup en ivoire et une plume de rapace sont noués au cercle par des lanières de cuir. Couleurs : brun écorce, vert mousse, ocre des feuilles, ivoire. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.10. `necrotique` — Cadre nécrotique

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de vertèbres et d'os blanchis assemblés, avec quatre petits crânes de corbeau aux points cardinaux ; de fines flammes vert pâle, nettes, brûlent dans les orbites ; lierre noir desséché enroulé autour. Couleurs : os ivoire grisé, vert spectral, noir. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.11. `primordial` — Cadre primordial

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de roche volcanique noire couverte d'écailles de dragon ambrées ; des veines de lave orange coulent dans les fissures ; en haut, un gros morceau d'ambre où est figé un petit insecte ancien. Couleurs : noir basalte, ambre doré, orange lave. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.12. `artificiel` — Cadre artificiel

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) d'engrenages de laiton et de cuivre imbriqués, de petits tubes de verre remplis d'un liquide bleu lumineux, de rivets et de minuscules cadrans sans aiguille ni chiffre ; en haut, un masque d'automate en laiton aux yeux bleus. Couleurs : laiton, cuivre, bleu acier lumineux. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.13. `abysse` — Cadre des Profondeurs

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de pierre noire sculptée d'un escalier en spirale qui s'enfonce tout autour du cercle, éclairé de loin en loin par de petites torches ; une brume violette monte d'en bas. Couleurs : noir pierre, violet brumeux, or chaud des torches. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.14. `chasseur` — Cadre du Chasseur

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de cuir sombre cousu et de lanières tressées, garni de trophées : crocs, griffes, une petite corne et des plumes noires, avec deux pointes de flèche en fer croisées en bas. Couleurs : cuir brun foncé, ivoire, fer, plumes noires. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.15. `sceaux` — Cadre des Sceaux

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) fait d'un ruban de parchemin ancien enroulé, sur lequel sont posés neuf petits sceaux de cire rouge sombre aux empreintes abstraites (spirales, feuilles, vagues), avec des fils de soie dorée qui pendent des sceaux. Couleurs : parchemin beige, rouge cire, or. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.16. `reliques` — Cadre des Reliques

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) en forme de reliquaire d'or noirci, percé de petites alcôves vitrées qui contiennent des reliques : une clé ancienne, une dent, une fiole de sang, une plume, un anneau ; filigrane d'or entre les alcôves. Couleurs : or noirci, verre ambré, rouge sombre. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.17. `guerre` — Cadre de la Guerre

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de lames d'épées ébréchées disposées en couronne, pointes vers l'extérieur, liées par un cercle de fer ; deux lambeaux de bannières rouges déchirées pendent en bas. Couleurs : acier gris, rouge sang, fer noir. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.18. `braise` — Cadre de braise

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de charbon de bois fendu qui rougeoie de l'intérieur, comme des braises encore vivantes, avec de fines craquelures orange et quelques escarbilles collées au bord. Couleurs : noir charbon, orange braise, rouge sombre. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.19. `forge` — Cadre de la Forge

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de fer chauffé à blanc sur sa moitié haute et refroidi en gris sur sa moitié basse, posé sur une petite enclume en bas ; un marteau de forgeron est appuyé contre l'anneau ; étincelles nettes figées tout près du métal. Couleurs : blanc-jaune incandescent, orange, gris acier. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.20. `phenix` — Cadre du Phénix

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Deux ailes de phénix aux plumes de flamme s'enroulent pour former un anneau épais (environ 16 % du diamètre) ; la tête du phénix, bec d'or et œil incandescent, se dresse en haut ; la queue retombe en bas en longues plumes de feu. Couleurs : or, orange vif, rouge, touches de blanc incandescent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.21. `oeil` — Cadre de l’Œil de l’Abysse (vaincre l’étage 100)

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau très épais (environ 17 % du diamètre) d'obsidienne et d'or noirci, gravé de fines volutes ; en haut, un grand œil vertical à pupille fendue, iris violet lumineux, serti dans une paupière d'or ; de petites améthystes taillées tout autour ; lueur violette dans les gravures. Couleurs : noir, or ancien, violet intense. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### 1.22. `choc` — Cadre du Choc (100 victoires au Choc des Boosters)

```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) en deux moitiés qui s'entrechoquent : à gauche, métal rouge sombre ciselé, à droite, argent froid ciselé ; elles se rencontrent en haut et en bas dans une gerbe d'éclats de cartes déchirées et d'étincelles nettes. Couleurs : rouge sang, argent, or des étincelles. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

## 2. Bannières

Intégration : recadrage 900 × 297 dans `assets/ui/` (nouveau nom de fichier, le service worker garde l'ancien).

### `bn-faction` — Bannière du « Booster de faction » (aujourd’hui : des portails néon multicolores qui font jeu vidéo)

```
Bannière panoramique très large au format 3:1 (par exemple 1800 × 600 pixels) pour un jeu de cartes dark fantasy haut de gamme. Toute la moitié gauche est sombre, presque noire, vide et sans détail (elle recevra un titre) ; le sujet est dans le tiers droit. Sur un autel de pierre sombre, sept sachets de boosters scellés sont posés debout, côte à côte, chacun fermé par un sceau de cire d'une couleur différente : rouge braise, bleu des profondeurs, blanc nacré et or, vert forêt, vert spectral pâle, ambre, bleu acier. Chaque sachet reçoit un très léger reflet de sa couleur, sans néon. Bougies de cire noire fondues, toiles d'araignée, un vieux grimoire ouvert au pied de l'autel. Peinture numérique très détaillée, ambiance de salle souterraine éclairée à la bougie, lumière chaude et dramatique, qualité d'illustration de jeu de cartes premium. Aucun texte, aucune lettre, aucun chiffre, aucun logo. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `bn-event` — Bannière du « Booster des Alliances » (aujourd’hui : une carte rouge dans un orage, image banale)

```
Bannière panoramique très large au format 3:1 (par exemple 1800 × 600 pixels) pour un jeu de cartes dark fantasy haut de gamme. Toute la moitié gauche est sombre, presque noire, vide et sans détail (elle recevra un titre) ; le sujet est dans le tiers droit. Deux sachets de boosters scellés, l'un rouge sombre et l'autre bleu nuit, liés ensemble par un ruban de soie dorée et un seul grand sceau de cire fait de deux moitiés de couleurs différentes qui se rejoignent ; ils sont posés sur un pupitre de bois sculpté, entre deux chandeliers ; deux mains gantées de cuir, venues de chaque côté, se serrent au-dessus d'eux en signe de pacte. Peinture numérique très détaillée, ambiance de salle souterraine éclairée à la bougie, lumière chaude et dramatique, qualité d'illustration de jeu de cartes premium. Aucun texte, aucune lettre, aucun chiffre, aucun logo. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

## 3. Sceaux de cire du Pacte (7, un par faction)

Aujourd'hui : de simples disques de couleur sur le parchemin. Intégration : détourage fond blanc (`tools/cutout-white.py`), 160 px, dans `assets/jeux/pa-cire-<faction>.webp`, posés sur `.pa-seal` quand la faction est jouée.

### `pa-cire-infernal`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire rouge sang ; empreinte : une flamme stylisée surmontée de deux petites cornes recourbées. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-abyssal`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire bleu nuit aux reflets turquoise ; empreinte : un tentacule enroulé sur lui-même au-dessus d'une vague. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-celeste`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire blanc nacré veinée d'or ; empreinte : une aile déployée sous un petit soleil rayonnant (rayons droits, sans étoile). Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-sauvage`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire vert forêt ; empreinte : trois griffes parallèles traversant une feuille de chêne. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-necrotique`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire vert-de-gris très pâle presque grise ; empreinte : un crâne de corbeau de profil. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-primordial`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire ambre orangée ; empreinte : une tête de dragon de profil sur des écailles. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

### `pa-cire-artificiel`

```
Un seul sceau de cire, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni, qui occupe environ 80 % de l'image. Cire épaisse aux bords irréguliers et légèrement coulés, empreinte nette en relief au centre. Cire bleu acier ; empreinte : un engrenage autour d'un petit œil mécanique. Peinture numérique très réaliste, lumière douce venant du haut, détails nets, lisible même en très petit (40 pixels). Pas d'ombre portée, pas de ruban ni de papier sous le sceau. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```

## 4. Icône de l'Offrande du jour (Accueil)

Aujourd'hui : une petite icône terne. Intégration : détourage fond blanc, 160 px.

```
Une coupe d'offrande ancienne en or noirci, posée sur un petit socle, remplie d'éclats de cristal bleu lumineux qui débordent légèrement, deux bougies noires allumées de chaque côté ; vue de trois quarts face, centrée, format carré 1:1, sur fond blanc pur uni, l'objet occupe environ 80 % de l'image. Peinture numérique très détaillée, matières réalistes, lumière chaude, lisible même en très petit (48 pixels). Pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre. Style adulte d'orfèvrerie ancienne et d'enluminure gothique, jamais mignon, jamais cartoon, aucune couleur bonbon. Aucun symbole religieux ou politique réel (pas de croix, pas d'étoile à cinq ou six branches, pas de pentagramme, pas de rune qui ressemble à un symbole connu).
```
