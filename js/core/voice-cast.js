// v794 : la distribution des voix : qui dit quoi (répliques en français, dans l'ordre où elles sont lues dans ElevenLabs).
// Sert aux outils (tools/voix-script.mjs, tools/voix-cut.mjs) ; le jeu, lui, trouve une voix par son texte (js/ui/voice.js).
import { NARRATOR, BOSS_LINES } from './voices.js';
import { BOSSES, BOSS_ORDER, VEILLEURS } from './bosses.js';
import { RIVALS as SC } from './sceaux.js';
import { RIVALS as PA } from './pacte.js';
import { RIVALS as CR } from './cryptes.js';
import { BIDDERS as EN } from './encheres.js';
import { EMOTES } from './codex.js';

const list = (R) => (Array.isArray(R) ? R : Object.entries(R).map(([key, r]) => ({ key, ...r })));
const uniq = (a) => [...new Set(a.filter(Boolean))];

/** [{ speaker, name, voice (description pour ElevenLabs, en anglais), lines: [français…] }] */
export function voiceCast() {
  const out = [{ speaker: 'narrateur', name: 'Le narrateur', voice: 'SAME VOICE AS THE CINEMATICS NARRATOR (prologue and ending).', lines: Object.values(NARRATOR).flat() }];
  for (const k of [...BOSS_ORDER, ...Object.keys(VEILLEURS)]) { /* v795 : les Veilleurs aussi */
    const L = BOSS_LINES[k]; if (!L) continue;
    const re = Object.values(EMOTES).find((e) => e.boss === k)?.text;
    out.push({ speaker: `boss-${k}`, name: BOSSES[k].name, voice: BOSS_VOICE[k] || '', lines: uniq([L.in, L.again, L.fury, L.p3, L.down, re]) });
  }
  const keys = uniq(list(SC).map((r) => r.key));
  for (const key of keys) {
    const rs = [SC, PA, CR, EN].map((R) => list(R).find((r) => r.key === key)).filter(Boolean);
    const re = Object.values(EMOTES).find((e) => e.who === key)?.text;
    out.push({ speaker: `arb-${key}`, name: rs[0].name, voice: ARB_VOICE[key] || '', lines: uniq([...rs.flatMap((r) => [r.hello, r.win, r.lose, r.beaten, r.gloat]), re]) });
  }
  for (const [k, e] of Object.entries(EMOTES)) {
    if (e.boss || e.who) continue;
    out.push({ speaker: k, name: e.name || k, voice: RE_VOICE[k] || RE_VOICE.default, lines: [e.text] });
  }
  return out;
}

// Descriptions des voix (Voice Design d'ElevenLabs, en anglais : c'est la langue que l'outil comprend le mieux)
export const BOSS_VOICE = {
  devoreur: 'Huge, guttural, wet growl of a bottomless hungry beast; slow, greedy, almost chewing the words. Deep male, monstrous, low pitch.',
  matriarche: 'Old regal woman, cold and calm as a frozen lake; soft, motherly but icy, slight breath of frost between words.',
  roi: 'Androgynous, smooth and theatrical voice, faintly layered as if several people speak at once behind a mask; amused, vain.',
  architecte: 'Precise, dry, middle-aged male scholar; measured cadence, condescending, every word placed like a stone.',
  eclipse: 'Ethereal female voice, half bright half dark, echoing; serene and treacherous, slightly reverberated.',
  essaim: 'Female queen voice with a buzzing undertone, many whispers behind it; maternal, hungry, unsettling.',
  bourreau: 'Heavy, slow, emotionless deep male voice, tired executioner; flat and final, no anger.',
  choeur: 'A drowned choir: several male sailors speaking together, wet, distant, sad and haunting, slightly underwater.',
  chaines: 'Booming blacksmith lord, deep and metallic, proud and furious, voice like an anvil.',
  horloge: 'Thin, meticulous old craftsman, ticking rhythm in his speech, polite and quietly menacing.',
  miroirs: 'Elegant aging witch, two voices slightly out of sync (her and her reflection), mocking and sly.',
  golem: 'Very deep, gravelly, slow voice made of stone and ash; each word grinds; resentful, unstoppable.',
  peste: 'Whispering, hoarse, sexless voice, like a breath in the ear; patient, sickly, intimate.',
  chasseur: 'Calm, low, close-mic hunter voice, almost a whisper; confident, cold, predatory.',
  voeux: 'Seductive, sweet female voice with a cruel smile; slow, honeyed, merchant of wishes.',
  titan: 'Colossal, extremely deep and slow voice, sleepy and immense, like a mountain waking up.',
  jumeaux: 'Two voices speaking in unison, one bright male, one dark male, perfectly together; solemn and bound.',
  juge: 'Stern, authoritative old male judge, crisp diction, cold courtroom echo; merciless.',
  bete: 'Monstrous voice with seven overlapping growls; apocalyptic, deep, impatient.',
  'v-ames': 'Regal, cold queen of the dead, low female voice, slow and weary, faint echo of a river.',
  'v-hiver': 'Huge old wolf speaking, rough breathy growl, cold and tired, low male voice.',
  'v-marees': 'Enormous sea serpent, deep wet booming voice, envious and bitter, slow.',
  'v-racines': 'Ancient queen of thorns, dry rustling female voice, proud and poisonous.',
  'v-cour': 'Smooth mocking masked god, voice with a smoky whisper behind it, playful and cruel.',
  'v-pacte': 'Seductive dark mother of night, velvet female voice, slow, smiling, dangerous.',
  'v-lune': 'Sly fox spirit, light teasing female voice, echoing as if from several places.',
  'v-forge': 'Gruff old divine blacksmith, deep tired male voice, hammering rhythm.',
  'v-titans': 'Giant of black fire, very deep crackling voice, solemn and burning.',
  'v-moissons': 'Sad gentle reaper, soft hollow male voice, melancholic.',
  'v-pages': 'Three old sisters speaking together, dry whispering female voices in unison.',
  abysse: 'Vast, ancient, genderless voice from the bottom of the world, very deep with a soft echo; patient, almost tender, terrifying.',
};
export const ARB_VOICE = {
  initie: 'Young, shy, enthusiastic apprentice girl; warm, a bit nervous, playful.',
  collectionneur: 'Pompous wealthy old collector, refined accent, fussy and proud.',
  stratege: 'Calm, pious female strategist, soft and certain, quietly superior.',
  maitre: 'Wise, dry old master of the game, patient teacher with a sharp tongue.',
  echo: 'Strange echoing voice that repeats faintly, playful and eerie, from the abyss.',
  banquier: 'Greedy smooth-talking demon banker, velvet voice, smiling, always calculating.',
  archiviste: 'Dusty, quiet old librarian, precise and dry, slightly condescending.',
  souverain: 'Imperious queen of the void, cold, slow and majestic, faint reverb.',
};
export const RE_VOICE = {
  default: 'The Seal Reader (the player character): young adult, calm, warm and polite scholar; neutral gender if possible.',
  're-feu-follet': 'Tiny flickering will-o’-the-wisp voice, high, giggling, mischievous.',
  're-passeur': 'Old ferryman of souls, slow, deep, patient and ominous.',
  're-blizzard': 'Howling icy voice, breathy and sharp, like wind.',
  're-sentinelle': 'Stern armored sentinel, deep, short and firm.',
};
