// v794 : répliques dites à voix haute (ElevenLabs). Le texte français sert de clé : la voix est trouvée par
// assets/voix/<langue>/<personnage>-<empreinte du texte>.mp3 (js/ui/voice.js). Changer un texte = refaire sa voix.
// Le narrateur : une phrase au plus toutes les 20 secondes en combat (voir js/ui/voice.js).
export const NARRATOR = {
  "crit": ["Un coup juste. Le Bestiaire s’en souviendra.", "Voilà comment on referme une page.", "Net. Précis. Impitoyable."],
  "fall": ["Une page se froisse… mais le livre tient bon.", "Elle est tombée. Les autres doivent tenir.", "L’Abysse prend son dû."],
  "break": ["Brisé. Frappe, maintenant !", "Sa garde vole en éclats."],
  "parry": ["Parade parfaite. L’ennemi chancelle.", "Pas une égratignure."],
  "ult": ["Toute l’équipe, d’un seul souffle."],
  "fury": ["Le rêve se déchire. Voici sa vraie colère.", "Prends garde : il ne retient plus ses coups."],
  "boss-down": ["Un rêve de moins. L’Abysse frissonne.", "Le gardien s’efface. La page est à toi."],
  "close": ["De justesse… mais la victoire n’a pas de mémoire.", "Un souffle de plus, et tout était perdu."],
  "defeat": ["Le chapitre se referme sur toi. Pour cette fois.", "Relève-toi. Les pages t’attendent encore.", "L’Abysse sourit. Ce n’est qu’un recul."],
  "chapter": ["Un chapitre refermé. D’autres attendent dans les profondeurs.", "Une page de plus revient au Bestiaire."],
  "secret": ["Cette page-là n’aurait jamais dû être retrouvée.", "Le Bestiaire tremble. Une Secrète."],
  "mythic": ["Une Mythique. Les royaumes en parlent encore."],
};

// Les gardiens : entrée (in), retour après une victoire (again), Furie (fury), 3e phase de l'Abysse (p3), défaite (down).
export const BOSS_LINES = {
  devoreur: { in: "Encore de la viande fraîche.", again: "Tu reviens ? J’avais encore faim.", fury: "Ma faim n’a plus de fond !", down: "J’ai… encore… faim…" },
  matriarche: { in: "Approche. Le froid ne fait mal qu’au début.", again: "Tu n’as donc pas assez gelé ?", fury: "Que l’hiver ne finisse jamais !", down: "Le printemps… déjà ?" },
  roi: { in: "Ton visage m’irait si bien.", again: "Tu me rapportes mon visage ?", fury: "Mille masques, et tous contre toi !", down: "Enfin… mon vrai visage…" },
  architecte: { in: "Ici, les règles, c’est moi qui les trace.", again: "J’ai redessiné les plans. Pour toi.", fury: "Je réécris tout ! Même ta victoire !", down: "Les plans… étaient faux…" },
  eclipse: { in: "Ni jour, ni nuit. Seulement moi.", again: "Le ciel se souvient de toi.", fury: "Que la lumière s’éteigne !", down: "Le soleil… reprend sa place…" },
  essaim: { in: "Mes filles ont faim. Toi, tu feras l’affaire.", again: "La ruche a gardé ton odeur.", fury: "Mille dards, une seule colère !", down: "La ruche… se tait…" },
  bourreau: { in: "Agenouille-toi. Ce sera plus rapide.", again: "Ta tête m’avait échappé. Plus maintenant.", fury: "La sentence tombe !", down: "Qui… me jugera, moi ?" },
  choeur: { in: "Chante avec nous. Sous l’eau, c’est plus doux.", again: "Le chant ne t’a pas oublié.", fury: "Que la marée t’emporte !", down: "Notre chant… s’éteint enfin…" },
  chaines: { in: "Chaque maillon, je l’ai forgé de mes mains.", again: "J’ai forgé une chaîne à ta taille.", fury: "Nul ne quitte ma forge !", down: "Les chaînes… se brisent…" },
  horloge: { in: "Tic-tac. Ton temps commence maintenant.", again: "Encore toi ? Je t’attendais à l’heure.", fury: "Le temps ne t’appartient plus !", down: "L’horloge… s’arrête…" },
  miroirs: { in: "Regarde-toi bien. C’est la dernière fois.", again: "Mon reflet t’attendait.", fury: "Chaque coup te reviendra !", down: "Laquelle de nous… se brise ?" },
  golem: { in: "Frappe. Je me souviens de chaque cendre.", again: "J’ai durci depuis notre rencontre.", fury: "Chaque coup me rend plus fort !", down: "Cendres… aux cendres…" },
  peste: { in: "Respire. Je ne demande rien de plus.", again: "Ton souffle m’appartient déjà.", fury: "Que tout se ternisse !", down: "Je reviendrai… à chaque souffle…" },
  chasseur: { in: "Tu ne me vois pas. Moi, je te vois.", again: "Je connais déjà ta piste.", fury: "Plus d’ombre où te cacher !", down: "Touché… enfin…" },
  voeux: { in: "Fais un vœu. Je fixerai le prix.", again: "Tu reviens payer ta dette ?", fury: "L’heure de payer est venue !", down: "Ce vœu-là… je ne l’ai pas vu venir…" },
  titan: { in: "Qui ose marcher sur mon dos ?", again: "Tu m’as encore réveillé.", fury: "La montagne se lève !", down: "Je… me rendors…" },
  jumeaux: { in: "À deux, nous ne perdons jamais.", again: "Le jour et la nuit se souviennent de toi.", fury: "Tu as séparé ce qui était lié !", down: "Ensemble… jusqu’au bout…" },
  juge: { in: "Accusé, levez-vous.", again: "Récidive. La peine sera double.", fury: "Verdict : coupable !", down: "La séance… est levée…" },
  bete: { in: "Le dernier Sceau tremble. J’arrive.", again: "Mes sept têtes se souviennent de toi.", fury: "Sept couronnes, sept colères !", down: "Pas… encore… le jour…" },
  abysse: { in: "Tu es descendu si loin. Pour moi ?", again: "Tu reviens au fond. Tu ne peux plus t’en passer.", fury: "Tous mes rêves, contre toi.", p3: "Alors vois ma nuit. Sans fin.", down: "Ferme les yeux… quelqu’un d’autre les ouvre…" },
  /* v795 : les Veilleurs (chapitre de saison) */
  'v-ames': { in: "Encore un vivant. Il en manque toujours un.", again: "Tu repasses le fleuve ? Il se souvient de toi.", fury: "Le fleuve se ferme derrière toi !", down: "Je dormais… debout… merci." },
  'v-hiver': { in: "Ton souffle fume. Bientôt, il gèlera.", again: "Encore toi. L’hiver n’oublie pas.", fury: "Le dernier hiver, c’est maintenant !", down: "La neige… retombe enfin vers le sol." },
  'v-marees': { in: "Toi, tu ne dors pas. Je t’envie.", again: "La marée te ramène toujours.", fury: "Que la mer noire monte !", down: "Je rentre au large… il rêve encore ?" },
  'v-racines': { in: "Mes épines ont rêvé de toi.", again: "Tu repousses comme une mauvaise herbe.", fury: "Que le bois se referme !", down: "Les racines… se taisent…" },
  'v-cour': { in: "Quel masque portes-tu, ce soir ?", again: "Toujours le même visage. Que c’est ennuyeux.", fury: "Mille reflets, et aucun n’est toi !", down: "Enfin… quelqu’un m’a reconnu." },
  'v-pacte': { in: "Fais un vœu. Je ne demanderai presque rien.", again: "Tu reviens payer ta dette ?", fury: "La nuit m’est due !", down: "Garde ta nuit… je la reprendrai." },
  'v-lune': { in: "Laquelle de nous est la vraie ? Devine.", again: "Tu m’as trouvée une fois. Plus maintenant.", fury: "Neuf lueurs, neuf morsures !", down: "La lune pâlit… je peux dormir." },
  'v-forge': { in: "Pousse-toi. J’ai des chaînes à forger.", again: "Tu reviens te faire marteler ?", fury: "Que l’enclume se fende !", down: "Pour qui… forgeais-je déjà ?" },
  'v-titans': { in: "Le feu ne doit jamais s’éteindre. Toi, si.", again: "Encore un peu de bois pour mon brasier.", fury: "Brûle, et qu’ils restent couchés !", down: "Le brasier… tient encore…" },
  'v-moissons': { in: "Donne-moi ton souvenir le plus cher.", again: "Tu as déjà oublié notre dernier combat ?", fury: "La grande moisson commence !", down: "Garde-les… tes souvenirs…" },
  'v-pages': { in: "Il nous manque une page. Tu l’as lue ?", again: "Ton fil est plus court que la dernière fois.", fury: "La coupe tombe !", down: "La page est… à sa place." },
};
