# ABYSSAL — Direction artistique du nouveau logo

Dossier préparé pour générer le nouveau logo avec Gemini. Rien n'est encore généré : ce sont des instructions. Le logo sera intégré dans le jeu une fois l'image reçue.

## 1. Diagnostic du logo actuel

| Élément | Ce qui fonctionne | Ce qui pose problème |
|---|---|---|
| Sceau doré à pointes (`icons/icon-512.png`, `assets/brand/emblem.webp`, `seal-big.webp`) | Or et violet bien choisis, l'œil reptilien intrigue | Vingt pointes fines : en petit format, elles deviennent une bordure dentelée illisible. Le sceau ressemble à un soleil ou à une médaille générique. |
| Étoile à six branches gravée | — | C'est le symbole de l'étoile de David (ou sceau de Salomon). Dans un univers démoniaque, il peut être mal perçu, voire refusé à la validation d'un store. **À abandonner.** |
| Œil reptilien | Point focal fort, déjà associé au jeu | Placé au fond d'un disque plat, il manque de profondeur et de récit. |
| Titre « ABYSSAL » (`title.webp`) | Lisible, typographie à empattements | Or biseauté avec fissures rouges : très courant dans les jeux mobiles. Le petit sceau au-dessus du Y est trop petit pour exister. |

Ce que le nouveau logo doit garder : **l'œil** (déjà la signature du jeu), **l'or ancien**, **le violet abyssal**, **le noir**.

## 2. Pistes étudiées

1. **Le Sceau fendu (recommandée).** Un sceau d'obsidienne massif, cerclé d'or ancien, fendu de haut en bas par une fissure verticale. Dans la fissure s'ouvre une pupille de créature : le sceau qui retenait le Bestiaire est en train de céder, et quelque chose regarde à travers. La silhouette est simple (un disque et une fente) et l'histoire se comprend immédiatement (« interdit », « abîme », « créature »). C'est la continuité avec l'œil actuel, en beaucoup plus fort.
2. **Le Grimoire scellé.** Un grimoire noir vu de face, fermé par une serrure-œil en or, avec des griffes qui dépassent des pages. C'est très narratif, mais la silhouette rectangulaire est moins iconique dans un carré, et il y a beaucoup de détails.
3. **L'Ouroboros de l'Abîme.** Un serpent primordial enroulé en cercle autour d'un puits sans fond violet. La silhouette est forte, mais l'ouroboros est un motif très répandu et il éloigne le jeu de son œil signature.

**Choix : piste 1, le Sceau fendu.**

## 3. Livrables à demander à Gemini

| Livrable | Format demandé à Gemini | Usages dans le jeu |
|---|---|---|
| A. Emblème (icône) | Carré 1:1, la plus haute résolution possible (idéalement 2048 × 2048), fond sombre travaillé, sans aucun texte | Icône de l'application iPhone (1024), Android (adaptative 432 + Play 512), PWA 512 / 192 / 180, favicon 64, emblème des classements, écran de démarrage Android |
| B. Logo complet | Format paysage 16:9, haute résolution, nom « ABYSSAL » + emblème, fond noir uni | Écran d'accueil du jeu, écran d'ouverture, fiche des stores (image de présentation 1024 × 500), captures promotionnelles |
| C. (facultatif) Logo complet avec signature | Même chose, avec « LE BESTIAIRE INTERDIT » sous le nom | Écran d'ouverture, supports promotionnels |

La transparence se fait de mon côté : le logo complet est demandé sur un **fond noir uni**, et je le détoure proprement. Gemini produit souvent de faux damiers « transparents », il vaut mieux ne pas lui demander de fond transparent.

## 4. Critères pour juger les images

1. **Réduite à la taille d'un ongle (environ 60 px)**, l'icône doit rester reconnaissable : un disque sombre, une fente lumineuse, un œil.
2. Il n'y a qu'**un seul point focal** : la pupille dans la fissure.
3. **Trois couleurs dominent** : noir, or, violet. Le reste n'est qu'un reflet.
4. **Aucune lettre ni aucun symbole religieux** dans l'icône (pas de pentagramme, d'étoile à six branches, de croix ni de rune).
5. Dans le logo complet, le mot est **exactement** « ABYSSAL » (7 lettres : A, B, Y, S, S, A, L), sans lettre déformée.
6. Il n'y a ni filigrane, ni signature, ni maquette de téléphone, ni texte parasite.

## 5. Prompt principal : emblème de l'application (à utiliser en premier)

```
Crée l'emblème officiel (icône d'application) d'ABYSSAL — Le Bestiaire interdit, un jeu mobile premium de collection de créatures mythologiques dans un univers dark fantasy sombre, occulte et spectaculaire. Le joueur y ouvre un grimoire interdit dont les créatures ont été scellées depuis des siècles : démons, dieux oubliés, dragons primordiaux, entités du néant.

CONCEPT : « Le Sceau fendu ». Un sceau ancien, massif, circulaire, taillé dans de l'obsidienne noire polie, cerclé d'un épais anneau d'or ancien martelé. Le sceau est fendu de haut en bas par une seule fissure verticale nette, légèrement irrégulière, qui s'élargit au centre en forme d'amande. Dans cette ouverture, on voit une immense pupille verticale de créature, fendue comme celle d'un reptile ou d'un dragon, avec un iris d'or incandescent et ambre profond, comme si une chose colossale enfermée dans le sceau ouvrait l'œil et regardait le joueur à travers la brèche. Le sceau est en train de céder : c'est le moment exact où l'interdit se brise.

COMPOSITION :
- Image carrée, format 1:1, très haute résolution.
- Le sceau est parfaitement centré et occupe environ 70 % de la largeur de l'image ; garder une marge sombre généreuse tout autour (au moins 15 % de chaque côté) pour permettre le recadrage en cercle ou en carré arrondi.
- Vue strictement de face, symétrique, frontale, comme une médaille ou un blason.
- Un seul point focal : la pupille lumineuse au centre de la fissure. Tout le reste guide le regard vers elle.
- Silhouette simple et forte, reconnaissable même réduite à 60 pixels : un disque sombre cerclé d'or, une fente lumineuse verticale, un œil.
- L'anneau d'or est épais et sobre, avec quatre ou huit encoches larges et régulières (aux points cardinaux), pas de pointes fines, pas de dentelle. Sur l'anneau, quelques gravures abstraites larges et peu nombreuses, purement ornementales.
- De la fissure s'échappe une lueur violette abyssale, avec quelques éclats de lumière et de minuscules fragments d'obsidienne qui se détachent sur les bords de la brèche. Sobre : la lumière souligne la fente, elle ne noie pas l'image.
- Arrière-plan : un noir profond légèrement bleuté et violacé, avec un halo violet très doux derrière le sceau, qui fait ressortir sa silhouette. Aucun décor, aucun paysage.

PALETTE (resserrée et très contrastée) :
- Noir obsidienne (dominante, 60 %).
- Or ancien patiné, avec des reflets chauds sur les arêtes (25 %).
- Violet abyssal lumineux dans la fissure et le halo (10 %).
- Or incandescent et ambre seulement dans l'iris (5 %, point focal).
- Pas d'autres couleurs : pas de rouge sang, pas de vert, pas de bleu vif.

MATIÈRES ET LUMIÈRE :
- Obsidienne lisse avec des reflets spéculaires nets, quelques micro-rayures.
- Or massif ancien, légèrement usé, aux arêtes brillantes et aux creux plus sombres.
- Éclairage dramatique : lumière principale venant de la fissure elle-même (le sceau est éclairé de l'intérieur), plus une lumière d'appoint froide en haut à gauche qui dessine le volume de l'anneau.
- Style : illustration numérique de très haute qualité, semi-réaliste, peinture digitale de jeu vidéo premium, finition de blason d'identité visuelle, détails nets et lisibles, contrastes francs.

LISIBILITÉ EN PETITE TAILLE (contrainte essentielle) :
- Formes larges, contours épais, pas de détails fins indispensables.
- Le contraste entre le sceau noir, l'anneau d'or et la fente lumineuse doit fonctionner même en très petit et même en noir et blanc.
- Aucun élément important près des bords de l'image.

À ÉVITER ABSOLUMENT :
- Aucun texte, aucune lettre, aucun chiffre, aucune fausse écriture, aucune rune lisible.
- Aucun symbole religieux ou politique : pas d'étoile à six branches, pas de pentagramme, pas de croix, pas de croix inversée, pas de swastika, pas de symbole existant.
- Pas de crâne, pas d'épées, pas de flammes, pas de griffes ajoutées, pas d'ailes, pas de chaînes.
- Pas de pointes fines tout autour du sceau, pas d'effet « soleil ».
- Pas de cadre carré, pas de bordure d'image, pas de coins arrondis dessinés, pas de maquette de téléphone ou d'écran.
- Pas de filigrane, pas de signature, pas de logo de marque.
- Pas d'aspect cartoon, pas d'aspect plastique ou 3D bon marché, pas de surcharge de particules.

CRITÈRES DE RÉUSSITE : en voyant l'image une demi-seconde, on doit comprendre « un sceau ancien qui se brise et une créature qui regarde à travers ». L'image doit avoir l'impact d'une icône de jeu premium qui arrête le défilement dans une boutique d'applications.
```

## 6. Prompt du logo complet (à utiliser après avoir validé l'emblème)

Joindre à Gemini l'image de l'emblème retenu, puis :

```
Voici l'emblème officiel du jeu ABYSSAL (le sceau d'obsidienne fendu, avec une pupille de créature dans la fissure). Crée maintenant le logo complet du jeu, en gardant exactement le même style, la même palette (noir obsidienne, or ancien, violet abyssal, iris d'or incandescent) et le même emblème.

TEXTE : le mot ABYSSAL, en lettres capitales, orthographié exactement A-B-Y-S-S-A-L (7 lettres, deux S consécutifs, aucune autre lettre). Aucun autre texte.

COMPOSITION :
- Format paysage 16:9, très haute résolution, sur un fond noir uni et profond, sans décor.
- Le mot ABYSSAL est centré horizontalement, sur une seule ligne, en grand.
- L'emblème (le sceau fendu) est intégré à la place de l'espace entre le Y et le premier S, ou au-dessus du centre du mot, à une taille nettement plus grande que les lettres en hauteur, comme le cœur du logo. Le mot et l'emblème forment un bloc compact et équilibré.
- Garder une marge noire d'au moins 10 % autour du bloc.

TYPOGRAPHIE :
- Capitales à empattements, inspirées des inscriptions romaines gravées dans la pierre (dans l'esprit de Trajan ou Cinzel), larges, puissantes, élégantes, très lisibles, avec un espacement des lettres généreux et régulier.
- Les lettres sont en or ancien massif, taillées en biseau, avec des arêtes brillantes. Une fine fissure violette lumineuse parcourt une seule lettre (le Y), en écho à la fissure du sceau. Pas d'autres fissures.
- Pas de lettres déformées, pas de lettres fantaisie, pas de ligatures, pas d'ornements qui gênent la lecture.

LUMIÈRE ET FINITION : même éclairage dramatique que l'emblème, halo violet très doux derrière le bloc, reflets nets sur l'or. Rendu d'identité visuelle de jeu vidéo premium, net et propre.

À ÉVITER : toute autre lettre ou faute d'orthographe, texte en double, sous-titre, slogan, filigrane, signature, maquette, cadre, crânes, épées, flammes, symboles religieux, pointes autour du sceau.
```

## 7. Variante avec la signature (facultative)

Avec le logo complet validé joint à Gemini :

```
Reprends exactement ce logo ABYSSAL, sans rien changer au mot ni à l'emblème, et ajoute en dessous une signature sur une seule ligne : LE BESTIAIRE INTERDIT, en capitales fines à empattements, couleur or pâle, environ trois fois plus petite que le mot ABYSSAL, centrée, avec un espacement des lettres large et élégant, et deux fines lignes dorées de chaque côté. Orthographe exacte : L-E, B-E-S-T-I-A-I-R-E, I-N-T-E-R-D-I-T. Format paysage 16:9, même fond noir uni. Aucun autre texte.
```

## 8. Pistes alternatives (seulement si le Sceau fendu ne te plaît pas)

**Le Grimoire scellé**
```
Crée l'emblème carré (icône d'application, sans aucun texte) d'ABYSSAL — Le Bestiaire interdit, jeu mobile premium dark fantasy de collection de créatures mythologiques. Sujet unique et centré, vu strictement de face : un épais grimoire ancien relié de cuir noir, aux coins renforcés d'or ancien, fermé par une serrure ronde en or en forme d'œil de dragon à pupille verticale incandescente. Une lumière violette abyssale filtre entre les pages fermées, et deux longues griffes noires dépassent légèrement de la tranche, comme si une créature tentait de sortir. Le livre occupe 65 % de l'image, avec une large marge sombre autour. Fond noir profond avec un halo violet doux. Palette resserrée : noir, or ancien, violet abyssal, ambre pour l'œil. Silhouette simple et lisible même réduite à 60 pixels, formes larges, un seul point focal (l'œil-serrure). Illustration numérique semi-réaliste de très haute qualité, éclairage dramatique. Aucun texte, aucune lettre, aucune rune lisible, aucun symbole religieux (pas d'étoile, pas de pentagramme, pas de croix), pas de crâne, pas de chaîne, pas de filigrane, pas de cadre, pas de maquette.
```

**L'Ouroboros de l'Abîme**
```
Crée l'emblème carré (icône d'application, sans aucun texte) d'ABYSSAL — Le Bestiaire interdit, jeu mobile premium dark fantasy de collection de créatures mythologiques. Sujet unique et centré, vu de face : un serpent-dragon primordial aux écailles d'obsidienne liserées d'or ancien, enroulé en un cercle parfait qui se mord la queue, entourant un puits sans fond d'où monte une lueur violette abyssale. La tête du serpent est en haut du cercle, avec un œil unique d'or incandescent à pupille verticale, seul point focal de l'image. Le cercle occupe 70 % de l'image, avec une large marge sombre autour. Fond noir profond, halo violet doux. Palette resserrée : noir, or ancien, violet, ambre pour l'œil. Silhouette épaisse et lisible même réduite à 60 pixels, pas de détails fins indispensables. Illustration numérique semi-réaliste de très haute qualité, éclairage dramatique venant du puits. Aucun texte, aucune lettre, aucune rune, aucun symbole religieux, pas de crâne, pas de flammes, pas de filigrane, pas de cadre, pas de maquette.
```

## 9. Prompts de révision (à envoyer à Gemini après une première image)

Trop chargé :
```
Garde exactement le même concept, la même composition et la même palette, mais simplifie fortement : retire les petits détails, les particules et les gravures superflues, élargis les formes et épaissis les contours, pour que l'image reste parfaitement lisible réduite à 60 pixels. Un seul point focal : la pupille dans la fissure.
```

Manque d'impact :
```
Garde le même concept et la même composition, mais rends l'image beaucoup plus saisissante : contraste plus fort entre le noir de l'obsidienne et la lumière de la fissure, pupille plus grande et plus intense, éclairage plus dramatique venant de l'intérieur du sceau, arêtes d'or plus brillantes. L'image doit arrêter le regard au premier coup d'œil.
```

Trop générique :
```
Le résultat ressemble à un logo de jeu mobile générique. Garde le sceau d'obsidienne cerclé d'or et la fissure verticale, mais rends-le plus singulier et plus inquiétant : la fissure doit vraiment donner l'impression que le sceau cède sous la pression d'une créature énorme, avec des éclats d'obsidienne qui se soulèvent sur les bords, et la pupille doit sembler vivante et nous fixer. Supprime tout ce qui fait « décoration standard ».
```

Illisible en petit :
```
Réduis mentalement l'image à 60 pixels : elle doit rester reconnaissable. Agrandis le sceau pour qu'il occupe 70 % de l'image, épaissis l'anneau d'or, simplifie la fissure en une seule fente verticale nette, agrandis la pupille, supprime tous les détails fins, et augmente le contraste entre le sceau sombre et le fond.
```

Mauvaise palette :
```
Garde exactement la même image, mais corrige les couleurs : uniquement du noir obsidienne (dominant), de l'or ancien patiné, du violet abyssal pour la lueur de la fissure, et de l'or incandescent ambré seulement dans l'iris. Retire tout rouge, vert, bleu vif ou autre couleur.
```

Symbole trop banal :
```
Le symbole central est trop banal. Garde le sceau d'obsidienne et l'anneau d'or, mais remplace le motif central par une seule fissure verticale qui s'ouvre en amande au centre et laisse voir une pupille verticale de créature géante. Retire tout autre motif central.
```

Texte incorrect (logo complet) :
```
Le mot est mal écrit. Il doit être écrit exactement ABYSSAL, en capitales : A, B, Y, S, S, A, L (sept lettres, deux S consécutifs), sur une seule ligne, sans aucune autre lettre ni aucun autre mot. Garde tout le reste identique.
```

Trop lumineux :
```
Garde la même image, mais rends-la plus sombre et plus mystérieuse : réduis le halo violet, assombris l'arrière-plan vers un noir profond, limite la lumière à la fissure et à la pupille, et diminue les reflets sur l'or pour qu'ils ne soulignent que les arêtes.
```

Trop sombre :
```
Garde la même image, mais rends-la plus lisible : éclaircis légèrement l'anneau d'or et ses reliefs, renforce la lueur violette de la fissure et l'éclat de la pupille, et sépare mieux la silhouette du sceau du fond avec un halo violet doux derrière lui.
```

## 10. Dimensions préparées à l'intégration (faites de mon côté à partir de l'image reçue)

| Fichier | Taille | Usage |
|---|---|---|
| `icons/icon-512.png` | 512 × 512 | PWA, Play Store |
| `icons/icon-192.png` | 192 × 192 | PWA |
| `icons/icon-maskable-512.png` | 512 × 512, sujet dans les 80 % centraux | Android (icône découpée en cercle) |
| `icons/apple-touch-icon.png` | 180 × 180, sans transparence | Écran d'accueil iPhone |
| `icons/favicon.png` | 64 × 64 | Onglet du navigateur |
| `store/apple/icone-1024.png` | 1024 × 1024, sans transparence | App Store |
| `store/google/icone-512.png` | 512 × 512 | Play Store |
| Icônes Android `android/app/src/main/res/mipmap-*` | 48 à 192, et premier plan adaptatif de 108 à 432 | Application Android |
| `assets/brand/emblem.webp` | 320 × 320 | Classements, petits emblèmes du jeu |
| `assets/brand/seal-big.webp` | environ 680 × 680, détouré | Écran d'ouverture |
| `assets/brand/title.webp` | environ 900 × 334, détouré | Accueil et écran d'ouverture |
| `store/google/presentation-1024x500.png` | 1024 × 500 | Image de présentation Play Store |

Pour que toutes ces versions soient nettes, il faut une image source de **1024 × 1024 au minimum** (idéalement 2048).
