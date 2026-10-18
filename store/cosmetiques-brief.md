# Cosmétiques du Codex et de l'Échoppe : prompts Gemini (18 octobre 2026)

Catalogue préparé pour le pass de saison (« Le Codex de l'Abîme ») et la boutique en argent réel (« L'Échoppe »).
Tout est **décoratif** : cadres de profil et dos de cartes. Clés à garder (elles servent dans `js/core/codex.js`).

## Intégration à l'arrivée des images
- **Cadres de profil** (fond blanc, centre blanc vide) : `python3 tools/cutout-white.py source.jpg sortie.webp --holes`,
  puis découpe en anneau calé sur le cercle (comme `hp-ring`), 192 px, `assets/frames/<clé>.webp`, posé autour de l'avatar
  (`.pf-<clé>` : l'image remplace le cadre dessiné en CSS). Sources dans `store/frames/<clé>-source.jpg`.
- **Dos de cartes** (5:7 bord à bord) : recadrage 5:7, 600 × 840, `assets/backs/<clé>.webp`. Sources dans
  `store/backs/<clé>-source.jpg`. Reste à coder : le choix du dos dans le Profil et son application (`--card-back`).

## Cadres de profil (15)
| N° | Clé | Nom | Où |
|---|---|---|---|
| 1 | cx-encre | Cadre d'encre | Codex, palier 3 |
| 2 | cx-sang | Cadre de sang séché | Codex, palier 9 |
| 3 | cx-or | Cadre enluminé | Codex, palier 15 |
| 4 | cx-givre | Cadre de givre | Codex, palier 21 · Échoppe |
| 5 | cx-braise | Cadre des braises éternelles | Codex, palier 27 · Échoppe |
| 6 | cx-abime | Cadre de l'Abîme | Codex, palier 30 |
| 7 | cx-fondateur | Cadre du Fondateur | Pack du Fondateur |
| 8 | cx-os | Couronne d'ossements | réserve (saison II ou Échoppe) |
| 9 | cx-serpents | Cadre des serpents d'obsidienne | réserve |
| 10 | cx-vitrail | Cadre du vitrail céleste | réserve |
| 11 | cx-rouages | Cadre des rouages | réserve |
| 12 | cx-racines | Cadre des racines anciennes | réserve |
| 13 | cx-yeux | Cadre aux mille yeux | réserve |
| 14 | cx-chaines | Cadre des chaînes forgées | réserve |
| 15 | cx-ruche | Cadre de la ruche d'ambre | réserve |

## Dos de cartes (10)
| N° | Clé | Nom | Où |
|---|---|---|---|
| 1 | dos-codex | Dos du Codex | Codex, palier 6 |
| 2 | dos-abime | Dos de l'Abîme | Codex, palier 18 · Échoppe |
| 3 | dos-fondateur | Dos du Fondateur | Pack du Fondateur |
| 4 à 10 | dos-infernal … dos-artificiel | Dos des sept royaumes | réserve (collection de 7, Échoppe) |

Les prompts complets sont dans la conversation du 18 octobre 2026 (repris ci-dessous, un bloc par image).

## Prompts : cadres de profil

Règle commune : anneau seul, sur fond blanc pur, centre vide et blanc (il sera remplacé par le portrait du joueur).

### 1. cx-encre — Cadre d'encre
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) fait d'encre noire liquide et brillante qui coule en volutes calligraphiques autour du cercle, avec une fine plume d'oie noire posée en haut et quelques gouttes d'encre figées en bas. Reflets bleu nuit sur l'encre, filets d'argent terni qui bordent l'anneau à l'intérieur et à l'extérieur. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 2. cx-sang — Cadre de sang séché
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de fer noir martelé, recouvert de coulures de sang séché rouge sombre presque noir, avec quatre petits clous de fer forgé aux points cardinaux et une fine épine de ronce qui s'enroule autour. Reflets métalliques froids, sang mat et craquelé. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 3. cx-or — Cadre enluminé
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) façon enluminure de manuscrit médiéval : feuille d'or brunie, rinceaux de vigne dorés finement ciselés, petites perles de lapis-lazuli bleu profond et de rubis serties à intervalles réguliers, un minuscule fermoir de grimoire en haut. Or chaud et éclatant, reflets nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 4. cx-givre — Cadre de givre
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) d'argent gelé recouvert de cristaux de glace translucides bleu pâle, avec de fines stalactites pointues qui dépassent vers l'extérieur, des arabesques de givre gravées dans le métal et une petite rune de glace bleu clair en haut. Couleurs froides : argent, bleu glacier, blanc bleuté, reflets nets et brillants. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de brume ni de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 5. cx-braise — Cadre des braises éternelles
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de roche volcanique noire fendue, dont les fissures rougeoient de lave orange incandescente, avec de petites flammes nettes qui lèchent le bord extérieur et un cœur de braise en forme de losange en haut. Contraste fort : noir charbon et orange-or brûlant. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de fumée ni de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 6. cx-abime — Cadre de l'Abîme
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) d'obsidienne polie violet très sombre, traversé de runes gravées qui brillent d'un violet électrique, avec de fins tentacules d'ombre sculptés qui s'enroulent autour, et en haut un œil fermé serti d'or dont la paupière laisse filtrer une lueur violette. Bordures en or vieilli. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, prestigieux, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 7. cx-fondateur — Cadre du Fondateur
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Le cadre le plus prestigieux du jeu : un double anneau épais (environ 17 % du diamètre), l'extérieur en or massif ciselé de motifs de sceaux, l'intérieur en émail noir et violet profond, avec en haut un grand sceau de cire rouge sombre frappé d'un œil ouvert, et en bas une petite couronne d'or à sept pointes. Quatre améthystes taillées serties aux points cardinaux. Or chaud, reflets nets, sensation de rareté et d'ancienneté. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 8. cx-os — Couronne d'ossements
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) fait de vertèbres et de petits os ivoire jaunis assemblés comme un chapelet, avec un crâne miniature en haut aux orbites éclairées d'une faible lueur verte, et des liens de cuir noir qui tiennent l'ensemble. Ivoire patiné, ombres brunes, détails nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 9. cx-serpents — Cadre des serpents d'obsidienne
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Deux serpents sculptés dans l'obsidienne noire brillante forment un anneau épais (environ 14 % du diamètre) en s'enroulant l'un autour de l'autre, leurs têtes se faisant face en haut autour d'une émeraude, écailles finement gravées, yeux verts luisants, liseré d'or sur le ventre. Noir profond, vert émeraude, or. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 10. cx-vitrail — Cadre du vitrail céleste
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) en vitrail de cathédrale : morceaux de verre coloré ambre, bleu ciel et blanc nacré sertis de plomb noir, avec de petites ailes d'ange en or stylisées de chaque côté et une étoile à huit branches en haut. Lumière chaude qui traverse le verre, reflets nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de rayons ni de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 11. cx-rouages — Cadre des rouages
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) d'engrenages de laiton et de cuivre imbriqués, rivets d'acier, petits tubes de vapeur, et en haut un cadran d'horloge miniature dont l'aiguille luit d'un bleu électrique. Métaux patinés, reflets nets, mécanique précise. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de vapeur ni de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 12. cx-racines — Cadre des racines anciennes
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de racines et de branches noueuses entrelacées, écorce sombre couverte de mousse vert vif, petites feuilles et baies rouges, et en haut une griffe de bête sauvage en os prise dans les racines. Bruns profonds, verts vivants, détails nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 13. cx-yeux — Cadre aux mille yeux
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) de chair sombre et de cuir pourpre, parsemé de petits yeux dorés aux pupilles fendues qui regardent dans toutes les directions, cerclé de deux fins filets d'or, inquiétant mais élégant. Pourpre profond, or, reflets humides nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 14. cx-chaines — Cadre des chaînes forgées
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) formé de lourds maillons de chaîne en fer noir dont certains rougeoient encore de la forge, avec un gros cadenas ancien en haut et deux petits crochets de fer en bas. Fer sombre, rouge incandescent par endroits, reflets nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de fumée ni de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 15. cx-ruche — Cadre de la ruche d'ambre
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 14 % du diamètre) d'alvéoles hexagonales en ambre translucide doré, certaines remplies de miel sombre, d'autres contenant de minuscules guêpes figées, avec des ailes d'insecte nervurées qui s'étendent de chaque côté en haut. Ambre, or miel, brun sombre, reflets nets. L'intérieur du cercle est entièrement vide et blanc pur. Peinture numérique très détaillée, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

## Prompts : dos de cartes

Règle commune : format vertical 5:7, cadré bord à bord, motif symétrique, lisible en petit.

### 1. dos-codex — Dos du Codex
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. La couverture d'un grimoire ancien : cuir noir patiné, coins renforcés de laiton, fine bordure dorée sur les quatre côtés, et au centre un médaillon d'or gravé d'un livre ouvert dont les pages laissent échapper une lueur ambrée et une plume d'oie croisée devant. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 2. dos-abime — Dos de l'Abîme
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Un puits sans fond vu de dessus, en spirale vers le centre, fait de pierres noires et d'encre violette tourbillonnante, bordé d'un cadre d'obsidienne aux runes violettes lumineuses ; au fond du puits, un œil violet unique et grand ouvert. Violet profond, noir, touches d'or vieilli sur le cadre. Motif parfaitement symétrique gauche-droite, sensation de vertige, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 3. dos-fondateur — Dos du Fondateur
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Le dos le plus prestigieux du jeu : velours noir profond avec un motif de damas violet discret, double cadre d'or ciselé aux coins ornés de petites couronnes, et au centre un grand sceau de cire rouge sombre frappé d'un œil ouvert, entouré d'une couronne de lauriers d'or et de sept petites gemmes de couleurs différentes (rouge, bleu, blanc, vert, violet, ambre, cuivre). Motif parfaitement symétrique gauche-droite, luxueux, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 4. dos-infernal — Dos du royaume Infernal
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Plaque de fer noir fissurée dont les fentes rougeoient de lave, bordure de cornes et de pointes forgées sur les quatre côtés, et au centre un médaillon représentant une tête de démon cornu stylisée entourée d'un cercle de flammes. Noir, rouge sang, orange braise, or terni. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 5. dos-abyssal — Dos du royaume Abyssal
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Les profondeurs d'un océan sombre derrière une bordure de corail noir et de coquillages nacrés, et au centre un médaillon de nacre bleue montrant un kraken stylisé dont les tentacules forment une spirale, éclairé par des points bioluminescents turquoise. Bleu nuit, turquoise, nacre, argent. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 6. dos-celeste — Dos du royaume Céleste
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Marbre blanc veiné d'or, bordure de plumes d'ange dorées sur les quatre côtés, et au centre un médaillon solaire d'or blanc avec un œil serein entouré de rayons et d'une paire d'ailes déployées. Blanc nacré, or pâle, touches de bleu ciel. Motif parfaitement symétrique gauche-droite, lumineux mais pas aveuglant, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 7. dos-sauvage — Dos du royaume Sauvage
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Écorce sombre d'un arbre millénaire, bordure de lianes, de fougères et de griffes d'os sur les quatre côtés, et au centre un médaillon de bois sculpté montrant une tête de loup hurlant stylisée, entourée de feuilles vert vif. Vert forêt, brun, ivoire, touches d'ambre. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 8. dos-necrotique — Dos du royaume Nécrotique
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Pierre tombale violette sombre couverte de lichen, bordure d'os et de chaînes rouillées sur les quatre côtés, et au centre un médaillon d'argent terni montrant un crâne couronné entouré d'une brume violette et de petites âmes pâles. Violet sombre, gris os, vert spectral discret. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 9. dos-primordial — Dos du royaume Primordial
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Roche ancienne aux strates d'ambre et de cuivre, bordure de cristaux bruts et d'écailles de dragon sur les quatre côtés, et au centre un médaillon de bronze montrant une tête de dragon ancestral stylisée, ailes repliées, avec un œil d'ambre lumineux. Cuivre, ambre, brun roche, or. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 10. dos-artificiel — Dos du royaume Artificiel
```
Dos de carte à jouer pour un jeu de cartes dark fantasy, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée. Plaque d'acier sombre rivetée, bordure d'engrenages de laiton et de tubes de cuivre sur les quatre côtés, et au centre un médaillon mécanique montrant un masque d'automate inexpressif dans un engrenage, aux yeux bleu électrique. Acier, laiton, cuivre, bleu électrique. Motif parfaitement symétrique gauche-droite, emblème central net et lisible même en petit. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```
