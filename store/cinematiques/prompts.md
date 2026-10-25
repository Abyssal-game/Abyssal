# Cinématiques (prologue et fin de la Descente) : prompts (v779)

Le lecteur des cinématiques (`js/screens/ending.js`) est prêt : chaque fichier livré est joué tout seul, sans autre code.
Tant qu'un fichier manque, l'ancien son reste (ou rien), et un gros plan manquant est simplement sauté.

## Intégration (pour Claude)
- **Musiques** (ElevenLabs Music) : source dans `store/music/<clé>-source.mp3`, silences coupés, volume moyen ≈ −22 dB,
  112 kb/s → `assets/music/prologue.mp3`, `assets/music/fin.mp3`, puis ajouter la clé à `assets/music/manifest.json`.
  Pas besoin de boucle parfaite : la cinématique dure moins longtemps que le morceau (fondu à la fin).
- **Bruitages** (ElevenLabs Sound Effects) : source dans `store/sfx/<clé>-source.mp3`, silences coupés, crête −3 dB,
  fondu de sortie → `assets/sfx/<clé>.mp3`, clé ajoutée à `assets/sfx/manifest.json`.
- **Gros plans animés** (Gemini, grille 4 × 2) : source dans `store/cinematiques/<nom>-source.jpg`, puis
  `python3 tools/cine-sheet.py <source> assets/<dossier>/<nom>.webp` (8 images de 300 × 375) ; vérifier une planche.
- **Voix** : `assets/voix/<langue>/<scène>.mp3` (silences coupés, crête −3 dB, moyenne ≈ −20 dB), puis ajouter
  `"<langue>/<scène>"` à `assets/voix/manifest.json`. Chaque langue est indépendante : on peut commencer par le français.

## 1. Musiques (ElevenLabs → Music)

**prologue** (environ 50 secondes)
```
Dark fantasy orchestral prologue, 50 seconds, slow and mythic. Opens with a deep low drone and a distant choir humming, like an ancient legend being told. Around 12 seconds, low taiko drums and a solemn cello theme rise as seven kingdoms forge a forbidden book. Around 25 seconds, a sudden silence, then a violent string stab and a tearing crescendo, chaotic and dissonant. Then a long falling descent: reverberating low brass, wind, a heartbeat-like pulse. Ends quiet and suspended on a single sustained dark chord, mysterious, inviting the listener to descend. No vocals with lyrics, no electronic beats, no bright major key, cinematic, intimate, dark candlelight atmosphere.
```

**fin** (environ 70 secondes)
```
Dark fantasy orchestral ending theme, 70 seconds, emotional and haunting. Opens with a very slow, deep breathing drone and soft low strings, like a giant eye slowly closing. Around 10 seconds, a fragile solo cello melody over warm pads, nostalgic and solemn, like an ancient parchment being revealed. Around 30 seconds, a gentle choir joins, rising with quiet pride as names are written in ink. Around 45 seconds, the harmony darkens: a low heartbeat pulse, an unsettling bass note, something awakening. Ends with a slow swell of strings and choir that resolves into an unresolved, mysterious chord, promising a sequel. No lyrics, no electronic beats, no cheerful melody, cinematic and intimate.
```

## 2. Bruitages (ElevenLabs → Sound Effects)

**ci-forge** (prologue, la forge des sept royaumes)
```
Deep mystical forge ambience, a huge hammer striking glowing metal twice with long reverb, roaring fire, crackling embers, a low magical hum of seven elements swirling, 5 seconds, dark fantasy, no music.
```
**ci-sceller** (prologue, les sept gardiens scellent le livre)
```
Hot red wax being pressed onto an ancient leather book, soft sizzling, a heavy stone seal pressed down with a deep magical thud and a low resonant hum fading out, 4 seconds, dark fantasy, no music.
```
**ci-dechirer** (prologue, le livre déchiré)
```
A thick ancient book violently ripped in two, loud tearing parchment and leather, a burst of magical energy like a short thunderclap, dozens of pages fluttering away in the wind, 4 seconds, dark fantasy, no music.
```
**ci-chute** (prologue, les pages tombent dans l'Abysse)
```
Pages and books falling into a bottomless chasm, long whooshing descent, wind howling in a deep canyon, distant echoes, a faint low growl from the depths at the end, 6 seconds, dark fantasy, no music.
```
**ci-abime** (prologue, au bord du gouffre)
```
Standing at the edge of a deep abyss at night, cold wind, distant low rumble from the depths, a lantern creaking softly, faint whispers far below, 6 seconds, dark fantasy ambience, no music.
```
**ci-oeil** (fin, l'œil qui se ferme)
```
A gigantic ancient creature slowly closing its eye, a deep wet organic creak, a long low rumble of the earth settling, then a soft final thud and silence, 5 seconds, dark fantasy, no music.
```
**ci-page** (fin, la page qui glisse)
```
A single old parchment page sliding slowly across a stone floor toward the listener, soft papery rustle, a faint magical shimmer, 3 seconds, quiet, dark fantasy, no music.
```
**ci-plume** (fin, chaque signature qui s'écrit)
```
A quill pen writing one quick signature on rough parchment, scratchy ink strokes, very short, 1 second, close and intimate, no music.
```
**ci-reveil** (fin, quelque chose ouvre les yeux)
```
Something enormous awakening in total darkness, one deep slow heartbeat, a long low breath, a soft wet sound of huge eyes opening, ominous, 4 seconds, dark fantasy, no music.
```
**ci-trophee** (fin, la page scellée de l'Abysse)
```
A magical page being sealed shut, a deep resonant boom, cracking wax, a dark shimmering chime of power fading into a low hum, 3 seconds, dark fantasy, triumphant but ominous, no music.
```

## 3. Gros plans animés (Gemini, une image chacun)

Même recette que l'œil qui se ferme : une seule image avec 8 vignettes, de gauche à droite puis la rangée du dessous,
même cadrage dans toutes les vignettes, seul le mouvement change.

**sceau** (prologue, après les sept gardiens) → `assets/prologue/sceau.webp`
```
A single image made of 8 panels arranged in a grid of 4 columns and 2 rows, read left to right then top to bottom, showing an animation sequence. Every panel has the exact same framing and camera: a close-up, seen from above, of a gloved hand pressing a heavy bronze seal into a pool of glowing red wax on the dark leather cover of an ancient book. Panel 1: the wax is liquid and glowing orange, the seal hovers above it. Panels 2 to 4: the seal comes down and presses into the wax, sparks and a little smoke rise. Panels 5 and 6: the seal lifts, revealing an imprinted closed eye in the wax, glowing bright. Panels 7 and 8: the wax cools down to deep red, the glow fades, a thin wisp of smoke remains. Dark fantasy painting, rich oil-painting style, warm candlelight, black background around the book, consistent colors and lighting in every panel. No text, no letters, no runes, no religious or occult symbols, no borders with ornaments, thin black lines between panels only.
```

**dechirure** (prologue, juste avant « Une nuit, quelqu'un l'a déchiré ») → `assets/prologue/dechirure.webp`
```
A single image made of 8 panels arranged in a grid of 4 columns and 2 rows, read left to right then top to bottom, showing an animation sequence. Every panel has the exact same framing and camera: a close-up of an ancient closed book with a dark leather cover and a red wax seal shaped like a closed eye, lying on a stone altar at night. Panel 1: the book is intact, faint violet light leaks from its edges. Panel 2: two shadowy hands grip the book on both sides. Panels 3 and 4: the cover cracks in the middle, the wax seal breaks, violet light bursts through the crack. Panels 5 and 6: the book is torn in two halves, pages explode outward in a storm of paper, violet lightning. Panels 7 and 8: the two torn halves fall apart, hundreds of loose pages fly away into the dark, the light fades. Dark fantasy painting, rich oil-painting style, dramatic lighting, consistent colors in every panel. No text, no letters, no runes, no religious or occult symbols, no borders with ornaments, thin black lines between panels only.
```

**reveil** (fin, après « quelque chose vient d'ouvrir les yeux ») → `assets/fin/reveil.webp`
```
A single image made of 8 panels arranged in a grid of 4 columns and 2 rows, read left to right then top to bottom, showing an animation sequence. Every panel has the exact same framing and camera: total darkness at the bottom of a deep abyss, with faint violet mist. Panel 1: only darkness and mist. Panels 2 and 3: two thin glowing violet slits appear in the dark, like huge eyelids starting to part. Panels 4 to 6: two enormous inhuman eyes slowly open, violet irises with vertical pupils, glowing, the mist swirls around them. Panels 7 and 8: the eyes are fully open and staring straight at the viewer, their light reflecting on the mist, ominous and calm. Dark fantasy painting, rich oil-painting style, deep black and violet palette, consistent colors in every panel. No text, no letters, no runes, no religious or occult symbols, no borders with ornaments, thin black lines between panels only.
```

## 4. Voix du narrateur (ElevenLabs → Text to Speech)

- Choisir **une seule voix** pour toutes les langues (modèle **Eleven Multilingual v2**), grave et posée, un conteur
  (par exemple une voix masculine âgée, « deep, calm, storyteller »). Réglages conseillés : Stability ≈ 55 %,
  Similarity ≈ 75 %, Style ≈ 20 %, vitesse un peu lente.
- Un fichier par bloc ci-dessous, nommé exactement comme indiqué (`pro-1.mp3`…). On peut commencer par le français :
  les autres langues gardent le texte écrit sans voix tant que leurs fichiers ne sont pas là.

### Français (dossier `assets/voix/fr/`)

**fin-1.mp3**
```
L’œil se referme.
```

**fin-2.mp3**
```
Dans le silence, une page glisse jusqu’à toi : la toute première du Bestiaire interdit, celle que personne n’avait jamais vue.
```

**fin-3.mp3**
```
Sept noms y sont signés, ceux des premiers Scelleurs ; le septième a été gratté jusqu’au vélin. Dessous, une ligne d’encre fraîche s’écrit toute seule : c’est ton nom.
```

**fin-4.mp3**
```
Les vingt chapitres sont refermés. Mais au bas de la page, quelque chose vient d’ouvrir les yeux.
```

**fin-5.mp3**
```
Tu n’as pas dompté l’Abysse : tu l’as refermé dans une page. Il ne combat pour personne. Il attend celui qui rêve.
```

**fin-6.mp3**
```
Celui qui rêve est réveillé. Le Bestiaire n’est pas encore fini.
```

**pro-1.mp3**
```
Les sept royaumes ont forgé le Bestiaire interdit pour enfermer ce qui ne devait plus marcher sous le ciel.
```

**pro-2.mp3**
```
Sept gardiens, un par royaume, l’ont scellé de leur main. Ce furent les premiers Scelleurs.
```

**pro-3.mp3**
```
Une nuit, quelqu’un l’a déchiré.
```

**pro-4.mp3**
```
Ses pages se sont envolées, et ses vingt chapitres sont tombés dans l’Abysse. Quelque chose les attendait.
```

**pro-5.mp3**
```
Tu es le dernier à savoir lire les sceaux. Descends, et referme-les.
```


### English (dossier `assets/voix/en/`)

**fin-1.mp3**
```
The eye closes.
```

**fin-2.mp3**
```
In the silence, a page drifts toward you: the very first page of the Forbidden Bestiary, the one no one had ever seen.
```

**fin-3.mp3**
```
Seven names are signed on it, those of the first Sealers; the seventh has been scraped down to the vellum. Beneath them, a line of fresh ink writes itself: it is your name.
```

**fin-4.mp3**
```
The twenty chapters are closed. But at the bottom of the page, something has just opened its eyes.
```

**fin-5.mp3**
```
You did not tame the Abyss: you closed it inside a page. It fights for no one. It waits for the one who dreams.
```

**fin-6.mp3**
```
The one who dreams is awake. The Bestiary is not finished yet.
```

**pro-1.mp3**
```
The seven realms forged the Forbidden Bestiary to lock away what must never again walk beneath the sky.
```

**pro-2.mp3**
```
Seven guardians, one for each realm, sealed it with their own hands. They were the first Sealers.
```

**pro-3.mp3**
```
One night, someone tore it apart.
```

**pro-4.mp3**
```
Its pages flew away, and its twenty chapters fell into the Abyss. Something was waiting for them.
```

**pro-5.mp3**
```
You are the last one who can read the seals. Descend, and close them again.
```


### Español (dossier `assets/voix/es/`)

**fin-1.mp3**
```
El ojo se cierra.
```

**fin-2.mp3**
```
En el silencio, una página se desliza hacia ti: la primerísima del Bestiario prohibido, la que nadie había visto jamás.
```

**fin-3.mp3**
```
Siete nombres la firman, los de los primeros Selladores; el séptimo ha sido raspado hasta la vitela. Debajo, una línea de tinta fresca se escribe sola: es tu nombre.
```

**fin-4.mp3**
```
Los veinte capítulos están cerrados. Pero al pie de la página, algo acaba de abrir los ojos.
```

**fin-5.mp3**
```
No has domado al Abismo: lo has encerrado en una página. No combate por nadie. Espera al que sueña.
```

**fin-6.mp3**
```
El que sueña ha despertado. El Bestiario aún no ha terminado.
```

**pro-1.mp3**
```
Los siete reinos forjaron el Bestiario prohibido para encerrar lo que nunca más debía caminar bajo el cielo.
```

**pro-2.mp3**
```
Siete guardianes, uno por reino, lo sellaron con sus propias manos. Fueron los primeros Selladores.
```

**pro-3.mp3**
```
Una noche, alguien lo desgarró.
```

**pro-4.mp3**
```
Sus páginas salieron volando y sus veinte capítulos cayeron al Abismo. Algo los estaba esperando.
```

**pro-5.mp3**
```
Eres el último que sabe leer los sellos. Desciende y vuelve a cerrarlos.
```


### Deutsch (dossier `assets/voix/de/`)

**fin-1.mp3**
```
Das Auge schließt sich.
```

**fin-2.mp3**
```
In der Stille gleitet eine Seite zu dir: die allererste des Verbotenen Bestiariums, die noch nie jemand gesehen hat.
```

**fin-3.mp3**
```
Sieben Namen stehen darauf, die der ersten Siegler; der siebte wurde bis aufs Pergament abgekratzt. Darunter schreibt sich eine Zeile frischer Tinte von selbst: dein Name.
```

**fin-4.mp3**
```
Die zwanzig Kapitel sind geschlossen. Doch am Fuß der Seite hat etwas gerade die Augen geöffnet.
```

**fin-5.mp3**
```
Du hast den Abgrund nicht gezähmt: Du hast ihn in eine Seite eingeschlossen. Er kämpft für niemanden. Er wartet auf den, der träumt.
```

**fin-6.mp3**
```
Der Träumende ist erwacht. Das Bestiarium ist noch nicht zu Ende.
```

**pro-1.mp3**
```
Die sieben Reiche schmiedeten das Verbotene Bestiarium, um wegzusperren, was nie wieder unter dem Himmel wandeln durfte.
```

**pro-2.mp3**
```
Sieben Wächter, einer für jedes Reich, versiegelten es mit eigener Hand. Sie waren die ersten Siegler.
```

**pro-3.mp3**
```
Eines Nachts hat es jemand zerrissen.
```

**pro-4.mp3**
```
Seine Seiten flogen davon, und seine zwanzig Kapitel stürzten in den Abgrund. Etwas wartete auf sie.
```

**pro-5.mp3**
```
Du bist der Letzte, der die Siegel lesen kann. Steig hinab und verschließe sie wieder.
```


### Italiano (dossier `assets/voix/it/`)

**fin-1.mp3**
```
L’occhio si chiude.
```

**fin-2.mp3**
```
Nel silenzio, una pagina scivola fino a te: la primissima del Bestiario proibito, quella che nessuno aveva mai visto.
```

**fin-3.mp3**
```
Vi sono firmati sette nomi, quelli dei primi Sigillatori; il settimo è stato raschiato fino alla pergamena. Sotto, una riga d’inchiostro fresco si scrive da sola: è il tuo nome.
```

**fin-4.mp3**
```
I venti capitoli sono chiusi. Ma in fondo alla pagina, qualcosa ha appena aperto gli occhi.
```

**fin-5.mp3**
```
Non hai domato l’Abisso: l’hai rinchiuso in una pagina. Non combatte per nessuno. Attende colui che sogna.
```

**fin-6.mp3**
```
Colui che sogna si è svegliato. Il Bestiario non è ancora finito.
```

**pro-1.mp3**
```
I sette regni forgiarono il Bestiario proibito per rinchiudere ciò che non doveva più camminare sotto il cielo.
```

**pro-2.mp3**
```
Sette guardiani, uno per regno, lo sigillarono con le proprie mani. Furono i primi Sigillatori.
```

**pro-3.mp3**
```
Una notte, qualcuno lo ha strappato.
```

**pro-4.mp3**
```
Le sue pagine sono volate via e i suoi venti capitoli sono caduti nell’Abisso. Qualcosa li stava aspettando.
```

**pro-5.mp3**
```
Sei l’ultimo a saper leggere i sigilli. Scendi, e richiudili.
```


### Português (Brasil) (dossier `assets/voix/pt/`)

**fin-1.mp3**
```
O olho se fecha.
```

**fin-2.mp3**
```
No silêncio, uma página desliza até você: a primeiríssima do Bestiário proibido, aquela que ninguém jamais tinha visto.
```

**fin-3.mp3**
```
Sete nomes estão assinados nela, os dos primeiros Seladores; o sétimo foi raspado até o pergaminho. Embaixo, uma linha de tinta fresca se escreve sozinha: é o seu nome.
```

**fin-4.mp3**
```
Os vinte capítulos estão fechados. Mas no pé da página, algo acabou de abrir os olhos.
```

**fin-5.mp3**
```
Você não domou o Abismo: você o fechou dentro de uma página. Ele não luta por ninguém. Ele espera aquele que sonha.
```

**fin-6.mp3**
```
Aquele que sonha despertou. O Bestiário ainda não terminou.
```

**pro-1.mp3**
```
Os sete reinos forjaram o Bestiário proibido para prender o que nunca mais devia caminhar sob o céu.
```

**pro-2.mp3**
```
Sete guardiões, um por reino, o selaram com as próprias mãos. Foram os primeiros Seladores.
```

**pro-3.mp3**
```
Uma noite, alguém o rasgou.
```

**pro-4.mp3**
```
Suas páginas voaram, e seus vinte capítulos caíram no Abismo. Algo estava à espera deles.
```

**pro-5.mp3**
```
Você é o último que sabe ler os selos. Desça, e feche-os de novo.
```

