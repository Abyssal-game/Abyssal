// v794 : découpe un fichier ElevenLabs reçu (toutes les répliques d'un personnage dans une langue, séparées par des pauses)
// node tools/voix-cut.mjs <personnage> <langue> <fichier.mp3>
//   → assets/voix/<langue>/<personnage>-<empreinte>.mp3 (une réplique par fichier) + assets/voix/manifest.json
// Coupes : au milieu des N−1 plus longs silences ; chaque réplique : silences de bord retirés, −18 LUFS, crête −3 dB,
// petits fondus, mono 80 kb/s (comme les voix des cinématiques, v783). Source gardée : store/voix/<personnage>-<langue>-source.mp3
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { voiceCast } from '../js/core/voice-cast.js';
import { vkey } from '../js/ui/voice-key.js';

const [speaker, lang, src] = process.argv.slice(2);
if (!speaker || !lang || !src) { console.error('usage : node tools/voix-cut.mjs <personnage> <langue> <fichier.mp3>'); process.exit(1); }
const c = voiceCast().find((x) => x.speaker === speaker);
if (!c) { console.error(`personnage inconnu : ${speaker}`); process.exit(1); }
const N = c.lines.length;
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString().trim());
const det = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', 'silencedetect=noise=-40dB:d=0.45', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const sil = [];
let st = null;
for (const l of det.split('\n')) {
  const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
  if (a) st = Number(a[1]);
  if (b && st != null) { sil.push({ s: st, e: Number(b[1]) }); st = null; }
}
// silences intérieurs seulement (pas le début ni la fin du fichier)
const inner = sil.filter((x) => x.s > 0.15 && x.e < dur - 0.15).map((x) => ({ ...x, d: x.e - x.s, m: (x.s + x.e) / 2 }));
if (inner.length < N - 1) { console.error(`seulement ${inner.length} pauses trouvées pour ${N} répliques : le fichier ne correspond pas (vérifie les <break>).`); process.exit(1); }
const cuts = inner.sort((a, b) => b.d - a.d).slice(0, N - 1).map((x) => x.m).sort((a, b) => a - b);
const bounds = [0, ...cuts, dur];
fs.mkdirSync(`assets/voix/${lang}`, { recursive: true });
fs.mkdirSync('store/voix', { recursive: true });
fs.copyFileSync(src, `store/voix/${speaker}-${lang}-source.mp3`);
const man = new Set(JSON.parse(fs.readFileSync('assets/voix/manifest.json', 'utf8')));
const AF = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,'
  + 'loudnorm=I=-18:TP=-3:LRA=11,afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse';
for (let i = 0; i < N; i++) {
  const k = vkey(speaker, c.lines[i]), out = `assets/voix/${lang}/${k}.mp3`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', bounds[i].toFixed(3), '-to', bounds[i + 1].toFixed(3), '-i', src, '-af', AF, '-ac', '1', '-ar', '44100', '-b:a', '80k', out]);
  man.add(`${lang}/${k}`);
  const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim());
  const ratio = d / Math.max(1, c.lines[i].length);
  console.log(`${String(i + 1).padStart(2)} ${d.toFixed(2)} s ${ratio < 0.03 || ratio > 0.16 ? '⚠ ' : ''}${c.lines[i]}`);
}
fs.writeFileSync('assets/voix/manifest.json', JSON.stringify([...man].sort()));
console.log(`${N} répliques → assets/voix/${lang}/ ; manifeste à jour.`);
