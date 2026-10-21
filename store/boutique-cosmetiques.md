# L'Échoppe : 100 cosmétiques à faire peindre par Gemini (19 octobre 2026)

Catalogue préparé pour la boutique en obsidiennes et les saisons du Codex. Tout est **décoratif** : rien ne rend une créature plus forte.
Les clés (`cx-…`, `dos-…`, `fin-…`…) sont définitives : elles serviront de noms de fichiers et de clés de sauvegarde.

## Comment s'en servir
- Un prompt = une image. Coller le prompt tel quel dans Gemini, en demandant le format indiqué si Gemini l'ignore.
- Garder la source sous `store/<famille>/<clé>-source.jpg`, puis l'intégrer avec l'outil indiqué pour sa famille.
- Si Gemini ajoute du texte, des chiffres ou un fond gris : régénérer (ces défauts gâchent le détourage).

## Prix conseillés (obsidiennes ; v546, baissés sur le modèle de Clash of Clans : 100 ≈ 0,99 €, gros paquets jusqu'à +40 %)
| Rang | Cadre | Dos | Finition | Arène | Autres |
|---|---|---|---|---|---|
| Rare | 100-140 | 120-140 | — | — | — |
| Épique | 180-200 | 200 | 300 | 250 | 140-220 |
| Légendaire | 250-280 | 280 | 350 | 320 | 200-300 |
| Mythique | 450 | — | 450 | — | — |

## Collections et calendrier (décision du 19 octobre 2026)
- **Aucun objet limité dans le temps** : tous les cosmétiques ajoutés au jeu restent en vente à l'Échoppe, contre des obsidiennes.
- **Saison I du Codex : décembre 2026** (le jeu doit d'abord être sur l'App Store). Thème proposé : **Hiver éternel** (ses objets en vedette pendant la saison).
- **Nuit des Âmes**, **Cœurs maudits** : thèmes à mettre en vedette à leur période (fin octobre, février) les années suivantes, sans jamais les retirer de la vente.
- **Les sept trônes** : un cadre légendaire par faction, à mettre en vente en lot (−20 %).
- **Trophées des gardiens** : cadres et dos aux couleurs des gardiens ; idée : réservés aux joueurs qui ont vaincu le gardien, puis achetables.
- **Arts interdits**, **Merveilles** : fond de catalogue permanent ; la **Couronne du Souverain de l'Abysse** et les finitions **Impériale** et **Néant** sont les pièces maîtresses (vitrine de l'Échoppe).
- Familles nouvelles à coder avant vente : finitions de prestige (habillage d'une carte), arènes, habillages de booster, coups signés, plateaux, emblèmes, portraits. Cadres et dos se branchent tout de suite (outils existants).

## Cadres de profil (22)
*cadre peint posé autour de l’avatar (comme les cadres du Codex).*

Intégration : python3 tools/frame-art.py <clé> store/frames/<clé>-source.jpg 1.9 → assets/frames/<clé>.webp, puis ajouter la clé à CODEX_FRAMES et au CATALOG (js/core/codex.js) et une ligne .pf-<clé> { --fr: … } en fin de css/army.css.

### 1. `cx-lanternes` — Cadre des lanternes d’âmes
Épique · 180 obsidiennes · collection Nuit des Âmes
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de vrilles de vigne noire desséchée qui s'enroulent en spirale, auxquelles pendent cinq petites lanternes de fer forgé ; dans chacune flotte une âme en forme de flamme vert pâle au visage à peine esquissé. Petites chauves-souris de fer découpé posées sur les vrilles, bougies de cire noire fondue en bas, gouttes de cire figées. Couleurs : noir charbon, vert spectral lumineux, touches d'orange citrouille sur la cire. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 2. `cx-voile` — Cadre du voile des trépassés
Légendaire · 250 obsidiennes · collection Nuit des Âmes
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) fait d'un voile de soie spectrale bleu pâle, translucide, qui ondule autour du cercle ; dans ses plis se devinent des visages d'esprits sereins aux yeux clos, comme sculptés dans la brume solide. Le voile est retenu par un fin cercle d'argent ancien gravé de feuilles d'if, avec en haut une petite clé de crypte en argent et en bas un lys blanc fané. Couleurs : bleu glacé lumineux, blanc nacré, argent terni. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 3. `cx-houx` — Couronne du solstice noir
Épique · 180 obsidiennes · collection Hiver éternel
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Une couronne épaisse (environ 15 % du diamètre) de houx aux feuilles vert très sombre presque noires, bordées de givre blanc, parsemée de baies rouge sang brillantes, entrelacée d'un ruban de velours bordeaux ; quatre petites bougies blanches allumées aux points cardinaux, flammes nettes et dorées, et de fines aiguilles de glace qui pendent vers l'extérieur. Couleurs : vert noir, rouge sang, blanc givre, or chaud des flammes. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 4. `cx-aurore` — Cadre de l’aurore boréale
Légendaire · 250 obsidiennes · collection Hiver éternel
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de glace polie et transparente cerclée d'argent, dans lequel ondulent des voiles d'aurore boréale vert émeraude, turquoise et violet, comme une lumière prisonnière de la glace ; de petites étoiles scintillantes piquées dans la glace, et en haut un cristal de neige à six branches finement taillé dans le cristal. Couleurs : vert et violet lumineux sur bleu nuit, argent froid. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 5. `cx-roses` — Cadre des roses noires
Épique · 180 obsidiennes · collection Cœurs maudits
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de tiges de rosier noir aux épines acérées, tressées serrées, avec sept roses noires veloutées aux pétales bordés de rouge profond ; en haut, un cœur de rubis taillé, transpercé d'une fine dague d'argent, d'où perle une goutte rouge figée. Couleurs : noir velours, rouge rubis lumineux, argent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 6. `cx-prince` — Couronne du Prince des Enfers
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Infernale.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) de fer noir forgé et d'or en fusion qui coule dans des sillons gravés, hérissé de cornes torsadées d'obsidienne qui se dressent vers l'extérieur, de plus en plus hautes vers le haut, comme une couronne de démon ; au sommet, un grand rubis en forme de flamme qui rougeoie de l'intérieur ; petites flammes nettes qui lèchent la base des cornes. Couleurs : noir, rouge braise, or brûlant. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 7. `cx-leviathan` — Cadre du Léviathan
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Abyssale.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Le corps d'un léviathan des abysses forme un anneau épais (environ 16 % du diamètre) : écailles bleu nuit et turquoise aux reflets nacrés, nageoires dorsales translucides, rangées de points bioluminescents cyan le long du flanc ; sa tête au crâne cornu en haut mord le bout de sa propre queue, des perles noires sont accrochées à ses barbillons. Couleurs : bleu abyssal, turquoise lumineux, nacre, argent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 8. `cx-seraphin` — Cadre du Séraphin
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Céleste.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Six grandes ailes de séraphin aux plumes blanches bordées d'or s'enroulent par paires en un anneau épais (environ 16 % du diamètre), leurs pointes se croisant en haut et en bas ; un fin cercle d'or martelé gravé d'étoiles court à l'intérieur ; au sommet, une auréole d'or pur flotte juste au-dessus du cercle, rattachée par deux fins rayons. Couleurs : blanc nacré, or chaud, très légère touche de bleu ciel dans les ombres des plumes. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 9. `cx-meute` — Cadre de la meute
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Sauvage.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) de fourrure de loup gris sombre tressée de lanières de cuir, cousue de crocs et de griffes de bêtes ; en haut, un crâne de loup géant aux mâchoires entrouvertes coiffé de bois de cerf ramifiés ; en bas, trois longues griffures rouges gravées dans une plaque d'os. Petites plumes de rapace et perles de bois accrochées. Couleurs : gris, brun, ivoire, rouge sang séché, vert mousse. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 10. `cx-liche` — Cadre de la Liche
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Nécrotique.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) de filigrane d'argent noirci finement ajouré, serti de petites phalanges et de vertèbres ; en haut, une couronne de liche à pointes d'os portant un phylactère en cristal où tourbillonne un feu d'âme vert émeraude ; des runes funéraires gravées brillent faiblement du même vert sur tout le pourtour. Couleurs : argent noirci, ivoire, vert spectral lumineux. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 11. `cx-ouroboros` — Cadre de l’Ouroboros
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Primordiale.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un dragon ancestral forme un anneau épais (environ 16 % du diamètre) en se mordant la queue : écailles d'ambre et de bronze très détaillées, crête dorsale de pointes de cristal orange, petites ailes repliées sur le haut ; ses yeux sont deux topazes lumineuses ; entre ses crocs, la pointe de la queue. Fins éclats de lave dans les jointures des écailles. Couleurs : ambre, bronze, or, orange incandescent. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 12. `cx-automate` — Cadre de l’Automate
Légendaire · 250 obsidiennes · collection Les sept trônes · Faction Artificielle.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) de laiton poli et d'acier bleui, fait de plaques articulées rivetées comme une armure mécanique, traversé de fins tubes de verre où circule une énergie bleu électrique ; en haut, un cœur mécanique en forme de rosace avec un engrenage central et une lentille de cristal bleu lumineux ; minuscules vis et ressorts visibles. Couleurs : laiton doré, acier bleu, cyan électrique. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 13. `cx-gueule` — Cadre de la Gueule du Dévoreur
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : le Dévoreur.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) en forme de gueule béante vue de face : lèvres de chair sombre et violacée, plusieurs rangées de dents acérées couleur ivoire jauni tournées vers le centre, tout autour du cercle, filets de salive brillante entre les dents, gencives rouge sombre. Inquiétant mais net et élégant, comme un bijou macabre. Couleurs : pourpre sombre, ivoire, rouge. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 14. `cx-eclipse` — Cadre de l’Éclipse
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : l’Éclipse.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) en forme de couronne solaire d'éclipse totale : un disque noir parfait borde l'intérieur, et autour jaillissent des filaments de plasma dorés et blancs, réguliers comme une corolle ; un fin cercle d'or gravé de symboles astronomiques géométriques enserre l'ensemble ; en haut, un petit croissant d'argent. Couleurs : noir profond, or incandescent, blanc lumineux. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 15. `cx-horloger` — Cadre de l’Horloger
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : l’Horloger.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) en forme de cadran d'horloge ancienne : couronne de laiton ciselée, graduations fines et régulières en émail noir (traits seulement, aucun chiffre), petites aiguilles de fer bleui, et en haut un remontoir orné ; des engrenages visibles par de petites fenêtres ajourées ; une fêlure traverse le verre bombé sur un côté. Couleurs : laiton, émail ivoire, noir, bleu acier. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 16. `cx-balance` — Cadre du Juge des Sceaux
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : le Juge des Sceaux.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de marbre noir veiné d'or, cerclé de deux chaînes d'or fines ; en haut, une balance de justice en or dont les deux plateaux pendent de chaque côté de l'anneau ; quatre sceaux de cire rouge sombre frappés d'un œil sont collés aux points cardinaux, avec de petits rubans de parchemin vierge. Couleurs : noir marbre, or, rouge cire. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 17. `cx-constellation` — Cadre des constellations
Légendaire · 280 obsidiennes · collection Merveilles · Prestige.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) taillé dans un ciel nocturne : fond bleu nuit profond semé de nébuleuses violettes et de milliers d'étoiles, où des constellations sont tracées par de fins traits d'or reliant des étoiles plus brillantes ; l'anneau est bordé de deux fins cercles d'or gravés comme un astrolabe ; en haut, une étoile à huit branches éclatante. Couleurs : bleu nuit, violet, or, blanc étoilé. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 18. `cx-geode` — Cadre de la géode d’améthyste
Épique · 180 obsidiennes · collection Merveilles
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 16 % du diamètre) en forme de géode ouverte : une croûte de pierre grise rugueuse à l'extérieur, et vers l'intérieur une couronne de cristaux d'améthyste violets aux pointes translucides tournées vers le centre, reflets lumineux nets, quelques cristaux de quartz blanc et de petites veines d'or. Couleurs : violet profond à lavande, gris pierre, or. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 19. `cx-sablier` — Cadre du sablier éternel
Épique · 180 obsidiennes · collection Merveilles
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de verre soufflé transparent cerclé de bronze, à l'intérieur duquel coule en boucle un sable d'or scintillant ; en haut et en bas, deux montures de sablier en bronze ciselé ; de fins grains d'or en suspension dans le verre. Reflets du verre nets et brillants. Couleurs : bronze, or sable, verre légèrement bleuté. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 20. `cx-pages` — Cadre du grimoire déchiré
Épique · 180 obsidiennes · collection Merveilles · Rappelle l’histoire du Bestiaire interdit.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de pages de parchemin ancien qui tourbillonnent en cercle, bords brûlés et dorés, couvertes de dessins de créatures à l'encre sépia (aucune écriture, seulement des croquis et des motifs) ; un ruban de soie rouge relie les pages, une plume d'oie et un petit encrier de bronze en bas, un fermoir de grimoire doré en haut. Couleurs : parchemin crème, sépia, or, rouge. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 21. `cx-corbeau` — Cadre des corbeaux
Épique · 180 obsidiennes · collection Merveilles
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de plumes de corbeau noires aux reflets bleus et violets, disposées en écailles régulières ; en haut, un crâne de corbeau poli coiffé d'un petit croissant d'argent, aux orbites où brille une lueur ambrée ; de fines chaînettes d'argent et deux plumes plus longues qui pendent en bas. Couleurs : noir irisé, bleu pétrole, argent, ambre. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 22. `cx-souverain` — Couronne du Souverain de l’Abysse
Mythique · 450 obsidiennes · collection Merveilles · Pièce maîtresse de l’Échoppe.
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Le cadre le plus spectaculaire du jeu : un anneau très épais (environ 18 % du diamètre) d'or noir ciselé, entièrement gravé de runes, d'où s'élève en haut une haute couronne à sept pointes, chaque pointe sertie d'une gemme aux couleurs des sept royaumes (rouge, bleu, blanc, vert, violet, ambre, cuivre) ; derrière l'anneau, des flammes violettes nettes et stylisées comme un feu héraldique ; en bas, un œil ouvert à l'iris violet serti dans un sceau d'or. Sensation de pouvoir absolu et de rareté extrême. Couleurs : or noir, or brillant, violet électrique, éclats des sept gemmes. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

## Dos de cartes (22)
*le dos de toutes les cartes face cachée (boosters, Cryptes, mains adverses).*

Intégration : python3 tools/back-art.py <clé> store/backs/<clé>-source.jpg (--opaque si le dos est clair) → assets/backs/<clé>.webp, puis CODEX_BACKS et CATALOG.

### 23. `dos-ames` — Dos de la Nuit des Âmes
Épique · 200 obsidiennes · collection Nuit des Âmes
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une grille de cimetière en fer forgé vue de face, ses volutes formant un cadre ; au centre, une grande lanterne de fer suspendue où tournoient des âmes vert pâle en spirale, autour d'elle des chauves-souris en silhouette et des branches d'if mort ; fond de brume nocturne bleu violet, pleine lune pâle derrière la lanterne. Couleurs : noir, vert spectral lumineux, bleu nuit, touches d'orange citrouille. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 24. `dos-solstice` — Dos du solstice noir
Épique · 200 obsidiennes · collection Hiver éternel
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une rosace de vitrail glacé : un grand flocon de neige à six branches au centre, en cristal blanc lumineux, entouré de couronnes de houx noir aux baies rouges et de rameaux de sapin givrés, le tout serti dans un réseau de plomb argenté ; fond bleu nuit profond semé d'étoiles. Couleurs : bleu nuit, blanc glacier, argent, rouge baie. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 25. `dos-roses` — Dos des cœurs maudits
Épique · 200 obsidiennes · collection Cœurs maudits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Velours noir orné d'un motif de damas de roses bordeaux à peine visible ; au centre, un cœur anatomique stylisé en rubis taillé, transpercé de deux dagues d'argent croisées, entouré d'une couronne de roses noires et d'épines ; quatre petites roses aux coins. Couleurs : noir, bordeaux, rouge rubis lumineux, argent. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 26. `dos-lune-sang` — Dos de la Lune de sang
Épique · 200 obsidiennes · collection Cœurs maudits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une immense lune rouge sang au centre, finement texturée de cratères, posée sur un ciel noir ; devant elle, la silhouette d'un arbre mort aux branches tordues qui forment une symétrie parfaite ; sous la lune, un lac noir qui la reflète ; cadre d'argent gravé de phases lunaires (cercles et croissants). Couleurs : rouge sang, noir, argent. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 27. `dos-devoreur` — Dos du Dévoreur
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : le Dévoreur.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Vu de face, un tourbillon de chair sombre en spirale vers le centre, bordé de rangées concentriques de dents ivoire, comme le fond d'une gueule sans fin ; au cœur, une lueur rouge pulsante ; cadre extérieur de fer noir rivé, aux coins en forme de crocs. Couleurs : pourpre sombre, ivoire, rouge, fer noir. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 28. `dos-eclipse` — Dos de l’Éclipse
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : l’Éclipse.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une éclipse totale au centre : disque noir parfait entouré d'une couronne de lumière dorée et blanche ; autour, un astrolabe d'or aux anneaux concentriques gravés de symboles astronomiques géométriques ; fond d'un ciel noir violacé ; aux coins, de petits soleils noirs. Couleurs : noir, or lumineux, blanc, violet profond. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 29. `dos-horloger` — Dos de l’Horloger
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : l’Horloger.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Le mécanisme d'une horloge ancienne vue de face, à nu : engrenages de laiton imbriqués, ressorts, rubis d'horlogerie, balancier au centre ; au milieu, un cadran rond d'émail ivoire aux graduations fines sans chiffres, avec deux aiguilles de fer bleui ; fines fêlures dans le verre. Couleurs : laiton, cuivre, ivoire, bleu acier. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 30. `dos-miroirs` — Dos de la Sorcière des Miroirs
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : la Sorcière des Miroirs.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Un grand miroir ovale au centre, cadre d'argent baroque, dont la surface brisée en éclats reflète chacun un fragment d'œil violet ; autour, un kaléidoscope de petits miroirs en losange qui se répètent en symétrie parfaite ; fond de velours noir. Couleurs : argent, noir, violet, reflets blancs nets. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 31. `dos-jumeaux` — Dos des Jumeaux du Crépuscule
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : les Jumeaux du Crépuscule.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. La carte coupée verticalement en deux moitiés parfaitement symétriques : à gauche le jour (ciel or et rose, soleil), à droite la nuit (ciel bleu nuit, lune et étoiles) ; au centre, un médaillon rond partagé entre un visage de soleil et un visage de lune qui se tournent le dos ; cadre d'or d'un côté et d'argent de l'autre. Couleurs : or, rose crépuscule, bleu nuit, argent. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 32. `dos-titan` — Dos du Titan Endormi
Épique · 200 obsidiennes · collection Trophées des gardiens · Gardien : le Titan Endormi.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Le visage d'un titan de pierre endormi sculpté dans la montagne, vu de face, yeux clos, couvert de mousse et de racines, de petites cascades coulant de sa barbe de roche ; une fissure lumineuse orangée sur son front ; cadre de pierre taillée aux runes anciennes. Couleurs : gris pierre, vert mousse, orange lave, brun. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 33. `dos-abysse` — Dos de L’Abysse
Légendaire · 280 obsidiennes · collection Trophées des gardiens · Gardien : L’Abysse (étage 100).
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. L'ultime dos : un œil immense au centre, à l'iris violet strié d'or, dont la pupille fendue s'ouvre sur un vide étoilé ; autour, des tentacules d'ombre s'enroulent en symétrie parfaite et forment un cadre vivant ; derrière, des runes violettes lumineuses en cercles concentriques ; bordure d'or noir. Sensation de face-à-face avec le gardien final. Couleurs : noir, violet électrique, or. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 34. `dos-tarot` — Dos du tarot interdit
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Style tarot art nouveau : fines lignes d'or sur fond noir mat, arche ornementale aux volutes végétales, au centre une lune en croissant tenant un œil, entourée de rayons d'étoiles, deux serpents stylisés qui montent symétriquement de chaque côté, motifs géométriques sacrés aux coins. Élégant et graphique. Couleurs : noir mat, or. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 35. `dos-vitrail` — Dos du vitrail de cathédrale
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Un vitrail gothique de cathédrale au soleil couchant, sans aucun flocon, sans houx ni sapin, rien d’hivernal : grande rosace centrale aux pétales de verre rouge rubis, bleu cobalt et or, sertis de plomb noir, avec au cœur une créature ailée stylisée ; ogives et quadrilobes autour, lumière qui traverse le verre comme au coucher du soleil. Couleurs : rubis, cobalt, or, noir plomb. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 36. `dos-mosaique` — Dos de la mosaïque d’or
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une mosaïque byzantine en tesselles de verre doré et d'émail : fond d'or scintillant, au centre un grand dragon enroulé en cercle en tesselles vert émeraude et rouge, bordures de motifs géométriques en tesselles bleu lapis et blanc. Chaque tesselle visible, reflets irréguliers de l'or. Couleurs : or, émeraude, rouge, lapis. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 37. `dos-encre` — Dos de l’encre et du dragon
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Peinture à l'encre de Chine sur papier de riz ivoire, façon lavis : un dragon serpentin qui monte en spirale au centre parmi les nuages, coups de pinceau vifs et dégradés de gris, un seul accent rouge vermillon (une perle dans la griffe du dragon) ; bordure fine noire. Élégance et vide maîtrisé. Couleurs : noir d'encre, gris, ivoire, un rouge. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 38. `dos-alchimie` — Dos de l’alchimiste
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Un diagramme alchimique gravé sur cuivre patiné : cercles concentriques, triangle et carré inscrits, symboles des éléments (formes géométriques seulement), soleil et lune aux deux côtés, petites fioles et athanor dans les coins ; traits fins comme une gravure ancienne, lueur dorée au centre. Couleurs : cuivre, vert-de-gris, or. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 39. `dos-carte-abysse` — Dos de la carte de l’Abysse
Épique · 200 obsidiennes · collection Arts interdits · Rappelle les 100 étages de la Descente.
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une carte ancienne dessinée sur parchemin : une gigantesque fosse en spirale qui descend vers le centre en étages, avec de minuscules ponts, escaliers et ruines dessinés à l'encre, une rose des vents ornée en haut (sans lettres), des monstres marins esquissés dans les marges, taches de thé et bords brûlés. Couleurs : parchemin, sépia, rouge vermillon, touches d'or. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 40. `dos-reliquaire` — Dos du reliquaire
Légendaire · 280 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Le couvercle d'un reliquaire médiéval : or repoussé, émaux cloisonnés bleu et rouge, cabochons de grenat, perles fines ; au centre, une fenêtre de cristal derrière laquelle repose une plume blanche lumineuse ; filigranes délicats aux coins. Luxe sacré, reflets précieux. Couleurs : or, bleu émail, rouge grenat, blanc nacré. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 41. `dos-tapisserie` — Dos de la chasse maudite
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une tapisserie médiévale tissée (fils visibles, couleurs un peu passées) : au centre une bête fabuleuse noire aux yeux rouges dans une forêt stylisée, entourée de fleurs millefleurs, de lapins et d'oiseaux ; bordure tissée de feuillages ; quelques fils d'or qui accrochent la lumière. Couleurs : rouge garance, vert, bleu, ivoire, or. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 42. `dos-art-deco` — Dos d’or noir
Légendaire · 280 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Style art déco luxueux : laque noire profonde, motifs géométriques en éventail et en rayons de soleil en feuille d'or, fines lignes parallèles, au centre un œil stylisé dans un losange d'or et d'onyx, coins à degrés. Sobre, net, très chic. Couleurs : noir laqué, or brillant, une touche de violet. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 43. `dos-vivant` — Dos de chair vivante
Légendaire · 280 obsidiennes · collection Merveilles
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une couverture de grimoire faite de cuir pâle qui semble vivant : veines bleutées sous la surface, coutures épaisses en croix, et au centre une paupière fermée cousue dont s'échappe une lueur ambrée entre les points ; coins et fermoirs en fer rouillé. Dérangeant, raffiné, très détaillé. Couleurs : chair pâle, bleu veine, ambre, fer rouillé. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 44. `dos-nebuleuse` — Dos de la nébuleuse
Légendaire · 280 obsidiennes · collection Merveilles
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Une nébuleuse cosmique en spirale au centre, violette, rose et bleue, avec des étoiles naissantes éclatantes ; au cœur, un petit soleil noir entouré d'un anneau de lumière ; cadre d'argent fin gravé de constellations aux coins. Profondeur immense, couleurs vibrantes. Couleurs : violet, magenta, bleu, blanc, argent. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

## Finitions de prestige (14)
*nouvelles finitions purement décoratives, appliquées à une carte qu’on possède (« habillage ») ; cadre peint + effet sur l’illustration.*

Intégration : python3 tools/variant-frame2.py store/variants/<clé>-source.jpg assets/variants/<clé>-frame.webp 2.2 → cadre posé par .tcg-vframe ; l’effet sur l’illustration se fait en CSS (fin de css/card.css). Système « habillage » à coder.

### 45. `fin-ecarlate` — Finition Écarlate
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : illustration en rouge et noir (ton sur ton), gouttes qui perlent lentement en haut.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. La bordure est en laque rouge sang brillante qui semble encore humide, bordée de deux filets d'or fin ; quelques gouttes de sang figées restent posées sur la bordure elle-même sans couler vers l'intérieur ; petits crocs d'or aux quatre coins. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 46. `fin-givree` — Finition Givrée
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : illustration refroidie, givre qui gagne les bords, petits flocons qui tombent.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. La bordure est une baguette de glace bleutée translucide sur une âme d'argent, couverte de fleurs de givre gravées dans son épaisseur, avec un petit flocon de cristal serti à chaque coin ; aucune stalactite. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 47. `fin-spectrale` — Finition Spectrale
Légendaire · 350 obsidiennes · collection Finitions de prestige · Effet : créature à demi transparente qui ondule, double image fantôme qui la suit.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est fait de brume solide bleu pâle lumineuse, comme un fantôme de cadre : volutes d'ectoplasme qui forment les barres, visages d'esprits à peine visibles dans les ornements des coins, contours lumineux nets. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 48. `fin-vitrail` — Finition Vitrail
Légendaire · 350 obsidiennes · collection Finitions de prestige · Effet : illustration découpée en éclats de vitrail, lumière qui la traverse quand on incline.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. La bordure est une étroite bande de vitrail : une seule rangée de petits morceaux de verre coloré (rubis, cobalt, ambre, émeraude) sertis de plomb noir, qui laissent passer une lumière vive, avec une minuscule rosace gothique à chaque coin. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 49. `fin-estampe` — Finition Estampe
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : illustration rendue en lavis d'encre sur papier ivoire, un seul accent rouge.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est peint à l'encre noire au pinceau, à grands traits vifs, avec des éclaboussures d'encre maîtrisées aux coins et un petit sceau rouge vermillon carré (sans écriture) en bas à droite. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 50. `fin-incandescente` — Finition Incandescente
Légendaire · 350 obsidiennes · collection Finitions de prestige · Effet : braises qui montent sur la carte, bords de l'illustration qui rougeoient.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est en roche volcanique noire fissurée dont les fentes rougeoient de lave orange, avec des braises incandescentes nettes posées sur les ornements et de petites flammes aux coins. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 51. `fin-constellee` — Finition Constellée
Légendaire · 350 obsidiennes · collection Finitions de prestige · Effet : le fond de l'illustration devient un ciel étoilé qui bouge avec l'inclinaison.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est un fin cercle d'astrolabe en or étiré en rectangle, gravé de constellations aux étoiles serties de petits diamants, avec une étoile éclatante au milieu du bord haut et des croissants de lune aux coins. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 52. `fin-ossuaire` — Finition Ossuaire
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : illustration en tons sépia et vert pâle, lueur d'âme verte dans les yeux de la créature.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est fait d'os ivoire assemblés comme dans une chapelle d'ossements : fémurs pour les barres, petits crânes aux quatre coins, vertèbres en chapelet au milieu des bords, fils d'argent noirci qui les relient. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 53. `fin-nacree` — Finition Nacrée
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : reflets irisés qui glissent sur toute la carte quand on l'incline.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est en nacre irisée aux reflets rose, vert et bleu, incrusté de perles fines et bordé d'or blanc, avec des coquillages stylisés aux coins. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 54. `fin-runique` — Finition Runique
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : runes qui s'allument une à une autour de l'illustration.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est taillé dans une pierre sombre ancienne, couvert de runes gravées qui brillent d'un bleu vif, avec des menhirs miniatures aux coins et des fissures lumineuses. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 55. `fin-scellee` — Finition Scellée
Épique · 300 obsidiennes · collection Finitions de prestige · Effet : la carte apparaît enchaînée, les chaînes se brisent à l'ouverture du booster.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est fait de lourdes chaînes de fer noir tendues le long des bords, fermées aux quatre coins par de grands sceaux de cire rouge sombre frappés d'un œil, avec un cadenas ancien au milieu du bord bas. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 56. `fin-draconique` — Finition Draconique
Légendaire · 350 obsidiennes · collection Finitions de prestige · Effet : écailles qui brillent par vagues, souffle de chaleur qui fait onduler l'image.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est fait d'écailles de dragon en bronze et ambre qui se chevauchent, avec des griffes de dragon qui agrippent les quatre coins et une tête de dragon en relief au milieu du bord haut aux yeux de topaze lumineux. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 57. `fin-imperiale` — Finition Impériale
Mythique · 450 obsidiennes · collection Finitions de prestige · Effet : poussière d'or qui scintille, lumière royale, nom en lettres d'or relief.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre le plus luxueux : or massif ciselé, velours violet impérial dans de petits panneaux, améthystes et perles serties, couronnes d'or miniatures aux quatre coins, médaillon à l'œil ouvert au milieu du bord haut. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

### 58. `fin-neant` — Finition Néant
Mythique · 450 obsidiennes · collection Finitions de prestige · Effet : l'illustration se fissure par endroits sur un vide étoilé, distorsion légère à l'inclinaison.
```
Cadre ornemental TRÈS FIN pour une carte à jouer d'un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, vu parfaitement de face, sur fond noir pur uni. Le cadre est une simple bordure étroite qui suit exactement le bord rectangulaire de la carte, comme un passe-partout fin : chaque côté fait au maximum 6 % de la largeur de l'image, les quatre coins portent de petits ornements qui ne dépassent pas 12 % de la largeur. Au moins 80 % de l'image, tout le grand rectangle central, est vide et entièrement noir pur : rien ne pend, ne coule, ne pousse ni ne déborde vers l'intérieur (pas de stalactites, de gouttes, de lianes, de rayons ni de fumée vers le centre). Le cadre doit ressembler à la bordure fine d'un cadre photo précieux, pas à un décor. Le cadre est une déchirure dans la réalité : bords de fissures noires aux lisières violettes lumineuses, à travers lesquelles on aperçoit un ciel étoilé, éclats de réalité qui flottent près des coins, comme si la carte était découpée dans le vide. Le cadre est lumineux et bien contrasté sur le noir, avec des contours nets, sans halo diffus. Peinture numérique très détaillée, matières réalistes, parfaitement symétrique gauche-droite et haut-bas. Aucun texte, aucune lettre, aucun chiffre, aucun logo, absolument rien à l'intérieur du cadre.
```

## Arènes de combat (10)
*le décor de fond de tous tes combats.*

Intégration : recadrage 720 × 1290 dans assets/battle/ar-<clé>.webp ; choix de l’arène au Profil, à coder.

### 59. `ar-bibliotheque` — La Bibliothèque interdite
Légendaire · 320 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Une bibliothèque gothique immense et abandonnée : rayonnages qui montent à perte de vue, escaliers en colimaçon, livres enchaînés, pages qui flottent dans l'air éclairées par des bougies suspendues ; au loin en haut, une grande verrière ronde par où tombe un rayon de lune ; sol de dalles noires et blanches usées. Couleurs : bois sombre, or des bougies, bleu lunaire. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 60. `ar-cathedrale` — La Cathédrale engloutie
Légendaire · 320 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. La nef d'une cathédrale gothique engloutie sous la mer : piliers couverts de corail et d'anémones, vitraux brisés traversés de rayons de lumière bleue, bancs de poissons lumineux et méduses en haut, bulles qui montent, sol de dalles recouvert de sable. Couleurs : bleu profond, turquoise, rose corail, or terni. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 61. `ar-forge` — La Forge infernale
Épique · 250 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Une forge colossale creusée dans un volcan : chaînes gigantesques qui pendent, cascades de métal en fusion sur les côtés, enclumes de pierre noire, braises qui flottent, gueule de lave rougeoyante tout en haut ; sol de basalte fendu par des fissures orange. Couleurs : noir, rouge, orange incandescent. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 62. `ar-jardin` — Le Jardin des astres
Légendaire · 320 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Un jardin céleste suspendu au-dessus des nuages au crépuscule : arches de marbre blanc couvertes de glycines lumineuses, fontaines dont l'eau monte vers le ciel, planètes et lunes énormes dans le ciel rose et violet, pétales qui volent ; sol de marbre veiné d'or. Couleurs : blanc, or, rose, lavande. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 63. `ar-foret` — La Forêt des premiers âges
Épique · 250 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Une forêt primordiale aux arbres gigantesques couverts de mousse, racines grandes comme des ponts, champignons bioluminescents bleus et verts, rayons de soleil verts filtrés par la canopée, lucioles ; sol de mousse et de racines. Couleurs : vert profond, bleu luminescent, or doux. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 64. `ar-crypte` — La Crypte des rois
Épique · 250 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Une crypte souterraine aux voûtes basses : gisants de pierre de rois anciens alignés sur les côtés, niches d'ossements, toiles d'araignée, cierges verts qui brûlent d'un feu froid, escalier qui descend dans le noir en haut ; sol de dalles gravées. Couleurs : gris pierre, vert spectral, noir. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 65. `ar-observatoire` — L’Observatoire mécanique
Légendaire · 320 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Une salle d'observatoire de laiton et de verre : gigantesque orrery aux planètes en métal qui tourne en haut, télescope géant, engrenages dans les murs, tuyaux de vapeur, coupole ouverte sur un ciel étoilé ; sol de parquet de cuivre gravé. Couleurs : laiton, cuivre, bleu nuit, cyan électrique. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 66. `ar-pont` — Le Pont au-dessus de l’Abysse
Légendaire · 320 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Un étroit pont de pierre en ruine suspendu au-dessus d'un gouffre sans fond qui tourbillonne de brume violette, colonnes brisées, chaînes qui pendent dans le vide, ciel noir déchiré par des éclairs violets en haut ; le pont occupe le bas de l'image. Vertige et grandeur. Couleurs : noir, violet, gris pierre. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 67. `ar-cimetiere` — Le Cimetière de la Nuit des Âmes
Épique · 250 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. Un cimetière la nuit des morts : tombes penchées, grilles de fer forgé, lanternes vertes, citrouilles taillées aux bougies, if noir, âmes lumineuses qui flottent, pleine lune orange énorme en haut ; sol de terre et de feuilles mortes. Couleurs : noir, orange, vert spectral. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

### 68. `ar-palais` — Le Palais de glace
Épique · 250 obsidiennes · collection Arènes
```
Décor de fond pour l'écran de combat d'un jeu de cartes dark fantasy sur téléphone, format vertical 9:16, vue frontale légèrement plongeante, peinture numérique cinématographique très détaillée, profondeur atmosphérique. La salle du trône d'un palais de glace : colonnes de glace translucide, lustres de cristal, aurore boréale visible par une immense verrière en haut, flocons qui tombent doucement ; sol de glace polie qui reflète la lumière. Couleurs : bleu glacier, blanc, vert et violet de l'aurore. Composition : le tiers haut porte les éléments les plus spectaculaires ; toute la bande centrale (de 20 % à 85 % de la hauteur) reste calme, plus sombre et peu détaillée, car deux rangées de cartes seront posées par-dessus ; le sol en bas, simple et lisible. Lumière d'ambiance cohérente, contraste doux au centre. Aucun personnage, aucune créature, aucune arme posée, aucun texte, aucune lettre, aucun logo.
```

## Habillages de booster (8)
*l’apparence du sachet quand tu ouvres un booster standard (contenu identique).*

Intégration : python3 tools/pack-art.py <clé> source.jpg → assets/packs/<clé>.webp (marges noires transparentes) ; choix au Profil, à coder.

### 69. `pk-grimoire` — Sachet du grimoire d’or
Épique · 160 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet imite la couverture d'un grimoire : cuir noir gaufré, coins et fermoirs d'or ciselé, au centre un œil doré dans un cercle de runes, fine dorure sur les bords. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 70. `pk-dragon` — Sachet en écailles de dragon
Épique · 160 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est fait d'écailles de dragon rouge et or qui se chevauchent, avec au centre un œil de dragon à pupille fendue, ambré et lumineux, encerclé d'or. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 71. `pk-reliquaire` — Sachet reliquaire
Légendaire · 220 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est une feuille de métal précieux repoussé : or et argent, émaux bleus et rouges, cabochons de grenat aux coins, au centre une croix de lumière stylisée en cristal. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 72. `pk-vivant` — Sachet de chair vivante
Légendaire · 220 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est en cuir pâle aux veines bleutées, cousu de gros points noirs, avec au centre une paupière cousue d'où filtre une lumière ambrée ; inquiétant et raffiné. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 73. `pk-astral` — Sachet astral
Légendaire · 220 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est une étoffe noire où tourbillonne une nébuleuse violette et bleue pleine d'étoiles, avec au centre une constellation en fils d'or et un petit soleil noir. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 74. `pk-ames` — Sachet de la Nuit des Âmes
Épique · 160 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est orange citrouille et noir, décoré de toiles d'araignée argentées, avec au centre une lanterne de fer d'où s'échappent des âmes vert pâle, et des chauves-souris en silhouette. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 75. `pk-solstice` — Sachet du solstice
Épique · 160 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est bleu nuit givré, orné de houx noir aux baies rouges et d'un grand flocon de cristal au centre, avec des fils d'argent et un petit ruban de velours rouge. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 76. `pk-roses` — Sachet des roses noires
Épique · 160 obsidiennes · collection Habillages de booster
```
Sachet de booster de cartes à collectionner pour un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, vertical (rapport 7:12), le sachet entier visible et centré, sur fond noir pur uni. Bords haut et bas sertis et dentelés comme un vrai sachet scellé à chaud, léger relief de l'emballage, reflets réalistes sur la matière. Le sachet est en velours noir brodé de roses bordeaux, avec au centre un cœur de rubis transpercé d'une dague d'argent, et des épines argentées sur les bords. Dans le quart inférieur, un cartouche horizontal sombre et lisse, vide, bien visible (le jeu y écrira le nom du booster). Peinture numérique très détaillée, produit qu'on a envie d'ouvrir, symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

## Coups signés (8)
*l’effet de coup de tes créatures en combat, à la place de la lame d’or.*

Intégration : python3 tools/fx-sheet.py source.jpg assets/fx/<clé>.webp puis conversion RGBA (comme les autres planches, v362) ; branché dans le cas dmg de play() (js/screens/duel-ui.js), à coder.

### 77. `fx-lame-ombre` — Coup signé : Lame d’ombre
Épique · 220 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : une entaille diagonale d'ombre violette et noire, bordée d'un fil de lumière violette vive, qui laisse derrière elle des éclats de ténèbres comme du verre brisé. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 78. `fx-feu-noir` — Coup signé : Flammes noires
Légendaire · 300 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : une griffure de trois traits de feu noir aux bords rouge incandescent, qui explose en langues de flammes sombres et en braises rouges. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 79. `fx-griffes-givre` — Coup signé : Griffes de givre
Épique · 220 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : trois griffures parallèles de glace bleu clair qui se figent en cristaux tranchants, puis éclatent en éclats de glace et en poudre de neige. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 80. `fx-foudre` — Coup signé : Jugement de foudre
Légendaire · 300 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : un éclair blanc et bleu électrique qui frappe à la verticale, ramifié, avec un éclat d'impact rond et des étincelles qui rebondissent. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 81. `fx-petales` — Coup signé : Pluie de pétales
Épique · 220 obsidiennes · collection Coups signés · Collection Cœurs maudits.
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : une entaille courbe faite d'un tourbillon de pétales de rose rouge sang et de petites épines, qui s'ouvre en corolle puis se disperse en pétales qui tombent. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 82. `fx-ames` — Coup signé : Morsure des âmes
Épique · 220 obsidiennes · collection Coups signés · Collection Nuit des Âmes.
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : des âmes vert pâle aux visages hurlants qui fondent en spirale sur la cible, impact en vortex vert, puis volutes spectrales qui s'éteignent. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 83. `fx-dragon` — Coup signé : Souffle du dragon
Légendaire · 300 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : une gerbe de feu doré et orange qui jaillit en cône, prend la forme d'une tête de dragon à l'impact, puis retombe en écailles de feu. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

### 84. `fx-sceau-runique` — Coup signé : Sceau runique
Légendaire · 300 obsidiennes · collection Coups signés
```
Planche de 8 images d'animation d'un effet visuel pour un jeu vidéo, disposées en grille de 4 colonnes et 2 rangées de cases carrées identiques, format 2:1, sur fond noir pur uni, sans bordure, sans trait ni espace visible entre les cases. Les 8 cases montrent, de gauche à droite puis de haut en bas, les étapes successives d'un même coup porté au centre : 1 et 2 l'apparition, 3 et 4 la montée, 5 l'impact maximal (la case la plus spectaculaire), 6 à 8 la dissipation en particules qui s'éteignent. L'effet : un cercle de runes dorées qui se dessine, se resserre et frappe en une étoile de lumière d'or éclatante, puis les runes se brisent en éclats lumineux. Dans chaque case, l'effet est centré et ne touche jamais les bords de sa case. Couleurs lumineuses et saturées sur noir pur (le noir deviendra transparent), énergie dense au cœur, contours nets. Aucun personnage, aucune arme tenue, aucun texte.
```

## Plateaux des Sceaux (4)
*le plateau des Duels des Sceaux.*

Intégration : recadrage 896 × 1200 dans assets/sceaux/plateau-<clé>.webp ; grille des cases à recaler sur l’image (.sc-plate) ; choix à coder.

### 85. `sc-obsidienne` — Plateau d’obsidienne
Légendaire · 250 obsidiennes · collection Plateaux des Sceaux
```
Plateau de jeu pour un duel de cartes dans un jeu dark fantasy haut de gamme, vu parfaitement de dessus, format vertical 3:4, peinture numérique très détaillée. Au centre, une grille de 3 × 3 cases carrées identiques, alignées, bien séparées par de fins rebords, chaque case assez grande pour recevoir une carte et légèrement creusée, la surface des cases unie et calme. Autour de la grille, un large cadre ornemental qui remplit toute l'image jusqu'aux bords. Le plateau est taillé dans une obsidienne noire polie veinée de violet, les cases bordées de fins filets d'or, le cadre gravé de runes violettes lumineuses et orné aux quatre coins d'yeux sertis d'améthyste. Lumière douce venant du haut, les neuf cases également éclairées, aucun objet posé sur les cases. Parfaitement symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 86. `sc-ivoire` — Plateau d’ivoire et d’or
Épique · 200 obsidiennes · collection Plateaux des Sceaux
```
Plateau de jeu pour un duel de cartes dans un jeu dark fantasy haut de gamme, vu parfaitement de dessus, format vertical 3:4, peinture numérique très détaillée. Au centre, une grille de 3 × 3 cases carrées identiques, alignées, bien séparées par de fins rebords, chaque case assez grande pour recevoir une carte et légèrement creusée, la surface des cases unie et calme. Autour de la grille, un large cadre ornemental qui remplit toute l'image jusqu'aux bords. Le plateau est en ivoire ancien et ébène incrustés comme un échiquier de roi, les cases en ivoire veiné, les rebords en ébène, le cadre en or ciselé de feuilles d'acanthe avec quatre lions d'or aux coins. Lumière douce venant du haut, les neuf cases également éclairées, aucun objet posé sur les cases. Parfaitement symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 87. `sc-mousse` — Plateau des menhirs
Épique · 200 obsidiennes · collection Plateaux des Sceaux
```
Plateau de jeu pour un duel de cartes dans un jeu dark fantasy haut de gamme, vu parfaitement de dessus, format vertical 3:4, peinture numérique très détaillée. Au centre, une grille de 3 × 3 cases carrées identiques, alignées, bien séparées par de fins rebords, chaque case assez grande pour recevoir une carte et légèrement creusée, la surface des cases unie et calme. Autour de la grille, un large cadre ornemental qui remplit toute l'image jusqu'aux bords. Le plateau est une dalle de pierre ancienne couverte de mousse et de lichens, les cases taillées dans la pierre, le cadre fait de racines et de petits menhirs gravés de spirales, avec des champignons lumineux aux coins. Lumière douce venant du haut, les neuf cases également éclairées, aucun objet posé sur les cases. Parfaitement symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 88. `sc-glace` — Plateau de glace
Épique · 200 obsidiennes · collection Plateaux des Sceaux
```
Plateau de jeu pour un duel de cartes dans un jeu dark fantasy haut de gamme, vu parfaitement de dessus, format vertical 3:4, peinture numérique très détaillée. Au centre, une grille de 3 × 3 cases carrées identiques, alignées, bien séparées par de fins rebords, chaque case assez grande pour recevoir une carte et légèrement creusée, la surface des cases unie et calme. Autour de la grille, un large cadre ornemental qui remplit toute l'image jusqu'aux bords. Le plateau est une plaque de glace épaisse et translucide où l'on devine des bulles et des fissures, les cases bordées d'argent, le cadre fait de cristaux de glace taillés et de flocons sertis aux coins. Lumière douce venant du haut, les neuf cases également éclairées, aucun objet posé sur les cases. Parfaitement symétrique. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

## Emblèmes de classement (6)
*un petit blason à côté de ton nom dans les classements.*

Intégration : python3 tools/cutout-white.py source.jpg assets/emblems/<clé>.webp, 96 px ; affichage au classement, à coder (et à envoyer en ligne avec le profil).

### 89. `em-couronne` — Emblème de la couronne
Légendaire · 200 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Une couronne d'or à sept pointes posée sur un écu rond d'émail violet profond, bordure d'or perlée. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 90. `em-crane` — Emblème du crâne couronné
Épique · 140 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un crâne d'argent poli portant une petite couronne d'épines, sur un écu rond d'émail noir, bordure d'argent. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 91. `em-oeil` — Emblème de l’œil
Épique · 140 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un œil ouvert à l'iris violet lumineux, entouré de rayons d'or, sur un écu rond d'émail noir, bordure d'or. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 92. `em-dagues` — Emblème des dagues croisées
Épique · 140 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Deux dagues d'acier croisées derrière une goutte de rubis, sur un écu rond d'émail rouge sombre, bordure de fer noir. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 93. `em-dragon` — Emblème du dragon
Légendaire · 200 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Une tête de dragon de profil en or, gueule ouverte, sur un écu rond d'émail vert émeraude, bordure d'or. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 94. `em-rose` — Emblème de la rose noire
Épique · 140 obsidiennes · collection Emblèmes
```
Emblème héraldique rond affiché à côté du nom d'un joueur dans un classement de jeu de cartes dark fantasy, médaillon vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Une rose noire aux bords rouges, tige épineuse, sur un écu rond d'émail ivoire, bordure d'argent. Formes simples et fortes, silhouette immédiatement reconnaissable même en très petit (24 pixels), contours nets, métal et émail aux reflets francs. Pas de halo diffus, pas d'ombre portée. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

## Portraits exclusifs (6)
*un portrait peint à la place de la créature choisie comme avatar.*

Intégration : recadrage carré 512 px, assets/avatars/<clé>.webp ; choix au Profil, à coder.

### 95. `av-inquisitrice` — Portrait : L’Inquisitrice
Légendaire · 220 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Une inquisitrice au visage grave et beau, cheveux noirs tirés, cicatrice fine sur la pommette, en armure de plaques noires gravées d'or et col de fourrure, un pendentif en forme d'œil sur la poitrine ; derrière elle, les vitraux rouges d'une chapelle. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

### 96. `av-necromancien` — Portrait : Le Nécromancien
Légendaire · 220 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Un nécromancien âgé aux yeux d'un vert spectral lumineux, longue barbe blanche tressée d'anneaux d'argent, capuche de velours noir brodée d'os, une main décharnée levée près du visage d'où monte une flamme verte ; derrière lui, une crypte. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

### 97. `av-chevalier` — Portrait : Le Chevalier déchu
Légendaire · 220 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Un chevalier au heaume brisé qui laisse voir la moitié d'un visage marqué et un œil rouge, armure noire fendue d'où sort une lueur rouge, cape en lambeaux ; derrière lui, un champ de bataille sous un ciel rouge. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

### 98. `av-oracle` — Portrait : L’Oracle aveugle
Légendaire · 220 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Une oracle aux yeux bandés d'un tissu d'or, peau sombre, tatouages lumineux bleu pâle sur les joues, coiffe de plumes blanches et de perles ; trois petits yeux d'or flottent autour de sa tête ; derrière elle, un ciel étoilé. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

### 99. `av-alchimiste` — Portrait : L’Alchimiste
Épique · 180 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Un alchimiste aux lunettes de cuivre relevées sur le front, visage malicieux taché de suie, manteau de cuir aux poches pleines de fioles lumineuses, une fiole verte qui fume tenue près du visage ; derrière lui, un laboratoire. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

### 100. `av-chasseuse` — Portrait : La Chasseuse de reliques
Épique · 180 obsidiennes · collection Portraits
```
Portrait de joueur pour un jeu de cartes dark fantasy haut de gamme, buste vu de trois quarts face, cadrage serré tête et épaules, format carré 1:1, peinture numérique très détaillée façon illustration de carte premium, éclairage dramatique en clair-obscur, fond sombre et flou qui rappelle le lieu du personnage. Le visage est au centre de l'image, à égale distance des bords, car le portrait sera découpé en cercle. Une chasseuse de reliques au regard vif, capuche de cuir, cheveux roux tressés, foulard, une boucle d'oreille en dent de bête, une carte enroulée sur l'épaule ; derrière elle, l'entrée d'une ruine éclairée par une torche. Regard fort et expression marquée, matières riches, palette cohérente. Aucun texte, aucune lettre, aucun logo, pas de cadre ni de bordure.
```

## Ajouts du 20 octobre 2026 (nouvelles idées, intégrables tout de suite)
*cadres et dos : mêmes outils que plus haut (`frame-art.py --fit`, `back-art.py`).*

### 101. `cx-carnaval` — Cadre du carnaval des ombres
Légendaire · 250 obsidiennes · collection Carnaval des ombres
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) fait de masques vénitiens de carnaval noirs et or qui se chevauchent tout autour du cercle, certains souriants, d'autres tristes, aux yeux vides ; rubans de satin pourpre qui s'enroulent entre eux, plumes noires irisées et petits grelots d'or ; un grand masque doré à longues plumes au sommet. Couleurs : noir laqué, or, pourpre profond, touches de vert émeraude dans les plumes. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 102. `cx-phalenes` — Cadre des phalènes
Épique · 180 obsidiennes · collection Arts interdits
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de branches d'argent noirci finement gravées, sur lesquelles sont posés sept grands papillons de nuit aux ailes de velours brun, gris et violet, dont les ailes portent des ocelles ronds qui ressemblent à des yeux dorés ; poussière d'ailes scintillante posée sur l'anneau, petite lune d'argent en croissant au sommet. Couleurs : argent noirci, brun velours, violet, or pâle. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 103. `cx-cristaux-sang` — Cadre des cristaux de sang
Légendaire · 280 obsidiennes · collection Merveilles
```
Cadre de portrait circulaire pour l'avatar d'un joueur dans un jeu de cartes dark fantasy haut de gamme, vu parfaitement de face, centré, format carré 1:1, sur fond blanc pur uni. Un anneau épais (environ 15 % du diamètre) de roche noire brute d'où jaillissent des cristaux rouge rubis translucides et taillés en pointes, qui poussent tous vers l'extérieur du cercle ; une lumière rouge vive brille au cœur des cristaux, fines veines d'or dans la roche, quelques éclats de cristal plus petits entre les grands. Couleurs : noir, rouge rubis lumineux, or. L'intérieur du cercle est entièrement vide et blanc pur (il recevra le portrait du joueur). Peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium, matières réalistes, éclairage dramatique venant du haut, symétrique, lisible même en très petit (48 pixels). Pas de halo diffus sur le fond, pas d'ombre portée, rien qui flotte détaché de l'anneau. Aucun texte, aucune lettre, aucun chiffre, aucun logo, rien au centre.
```

### 104. `dos-carnaval` — Dos du carnaval des ombres
Légendaire · 280 obsidiennes · collection Carnaval des ombres
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Au centre, un grand masque vénitien de carnaval en porcelaine noire et or, aux yeux vides d'où s'échappe une lueur violette, couronné de longues plumes noires et pourpres ; autour de lui, des rubans de satin et des losanges d'arlequin noirs, pourpres et or qui forment un motif régulier jusqu'aux bords ; confettis d'or figés dans l'air. Couleurs : noir laqué, pourpre profond, or, éclats violets. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 105. `dos-phalene` — Dos de la grande phalène
Épique · 200 obsidiennes · collection Arts interdits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Au centre, un immense papillon de nuit vu de face, ailes grandes ouvertes qui remplissent presque toute la largeur de la carte ; ses ailes de velours brun et violet portent deux grands ocelles dorés qui ressemblent à des yeux, et des motifs fins comme de la dentelle ; derrière lui, un croissant de lune d'argent et un fond bleu nuit semé de poussière d'or. Couleurs : brun velours, violet, or, bleu nuit, argent. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```

### 106. `dos-coeur-mecanique` — Dos du cœur mécanique
Légendaire · 280 obsidiennes · collection Cœurs maudits
```
Dos de carte à jouer pour un jeu de cartes dark fantasy haut de gamme, format vertical 5:7, cadré bord à bord (l'illustration remplit toute l'image, sans marge ni fond autour), peinture numérique très détaillée, qualité d'illustration de jeu de cartes premium. Au centre, un cœur anatomique fait de laiton, de cuivre et de verre, dont on voit les engrenages et les petits pistons à travers des vitres ; une lumière rouge pulse en son centre ; des tuyaux de cuivre en partent comme des artères et se ramifient en volutes régulières jusqu'aux bords de la carte, sur un fond de velours bordeaux sombre. Couleurs : laiton, cuivre, rouge lumineux, bordeaux, noir. Une fine bordure régulière court sur les quatre côtés à égale distance du bord. Motif parfaitement symétrique gauche-droite, emblème central net, contrasté et lisible même quand la carte est toute petite. Aucun texte, aucune lettre, aucun chiffre, aucun logo.
```
