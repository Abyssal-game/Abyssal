// v794 : prépare les textes à faire lire dans ElevenLabs : store/voix/voix.md (un bloc par personnage et par langue).
// node tools/voix-script.mjs [personnage…]   (sans argument : tous)
// Chaque bloc = les répliques dans l'ordre, séparées par une pause de 1,5 s : tools/voix-cut.mjs découpe ensuite le fichier reçu.
import fs from 'node:fs';
import { voiceCast } from '../js/core/voice-cast.js';
import { vkey } from '../js/ui/voice-key.js';

const LANGS = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano', pt: 'Português (Brasil)' };
const dict = {};
for (const l of Object.keys(LANGS)) if (l !== 'fr') dict[l] = (await import(`../js/i18n/${l}.js`)).default;
const only = process.argv.slice(2);
const cast = voiceCast().filter((c) => !only.length || only.includes(c.speaker));
const done = new Set(JSON.parse(fs.readFileSync('assets/voix/manifest.json', 'utf8')));
let md = `# ABYSSAL — voix des personnages (ElevenLabs)

Généré par \`node tools/voix-script.mjs\` (v794). **Ne pas modifier à la main** : les textes viennent du jeu.

## Comment faire (une fois par personnage)
1. ElevenLabs → **Voices → Add a new voice → Voice Design** : colle la description du personnage (bloc « Voix »), génère, garde la meilleure, enregistre-la sous le nom du personnage. Le narrateur garde **la même voix que les cinématiques**.
2. ElevenLabs → **Text to Speech**, modèle **Eleven Multilingual v2**, la voix du personnage. Colle le bloc de la langue (les balises \`<break time="1.5s" />\` font les pauses : elles sont indispensables pour que je découpe le fichier).
3. Télécharge le MP3 et nomme-le **\`<personnage>-<langue>.mp3\`** (ex. \`boss-devoreur-fr.mp3\`), puis envoie-le-moi. Je le découpe et je l'intègre.
4. Tu peux commencer par le **français** seulement : chaque langue s'ajoute quand tu veux. Sans voix, le jeu affiche simplement le texte.

Personnages : ${cast.length} · répliques : ${cast.reduce((a, c) => a + c.lines.length, 0)} par langue.
`;
for (const c of cast) {
  const have = Object.keys(LANGS).filter((l) => c.lines.every((fr) => done.has(`${l}/${vkey(c.speaker, fr)}`)));
  md += `\n---\n\n## ${c.speaker} · ${c.name}${have.length ? ` (déjà fait : ${have.join(', ')})` : ''}\n\nVoix :\n\`\`\`\n${c.voice}\n\`\`\`\n`;
  for (const [l, name] of Object.entries(LANGS)) {
    const lines = c.lines.map((fr) => (l === 'fr' ? fr : dict[l][fr] || `⚠ ${fr}`));
    md += `\n${name} → \`${c.speaker}-${l}.mp3\`\n\`\`\`\n${lines.join('\n<break time="1.5s" />\n')}\n\`\`\`\n`;
  }
}
fs.mkdirSync('store/voix', { recursive: true });
fs.writeFileSync('store/voix/voix.md', md);
console.log('store/voix/voix.md', cast.length, 'personnages');
