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
const silences = (noise, d) => {
  const det = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', `silencedetect=noise=${noise}dB:d=${d}`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const out = [];
  let st = null;
  for (const l of det.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/), b = l.match(/silence_end: ([\d.]+)/);
    if (a) st = Number(a[1]);
    if (b && st != null) { out.push({ s: st, e: Number(b[1]) }); st = null; }
  }
  return out;
};
// silences intérieurs seulement (pas le début ni la fin du fichier) ; v801 : si deux répliques sont collées, on cherche des pauses plus courtes
let sil = silences(-40, 0.2);
const innerOf = (l) => l.filter((x) => x.s > 0.15 && x.e < dur - 0.15).map((x) => ({ ...x, d: x.e - x.s, m: (x.s + x.e) / 2 }));
if (innerOf(sil).length < N - 1) sil = silences(-35, 0.06);
const inner = innerOf(sil);
if (inner.length < N - 1) { console.error(`seulement ${inner.length} pauses trouvées pour ${N} répliques : le fichier ne correspond pas (vérifie les <break>).`); process.exit(1); }
// v801 : coupes choisies par programmation dynamique : chaque réplique doit durer à peu près la part de sa longueur
// de texte (les pauses à l'intérieur d'une réplique, après un point, peuvent être aussi longues qu'entre deux répliques),
// et une coupe préfère une longue pause.
const head = sil.length && sil[0].s <= 0.15 ? sil[0].e : 0, tail = sil.length && sil[sil.length - 1].e >= dur - 0.15 ? sil[sil.length - 1].s : dur;
const gapAvg = inner.slice().sort((a, b) => b.d - a.d).slice(0, N - 1).reduce((t, x) => t + x.d, 0) / (N - 1);
const chars = c.lines.map((l) => l.length), totC = chars.reduce((a, b) => a + b, 0);
const speech = tail - head - gapAvg * (N - 1);
const want = chars.map((n) => (speech * n) / totC);
const pts = [{ m: head, d: 0, s: head, e: head }, ...inner, { m: tail, d: 0, s: tail, e: tail }];
const P = pts.length, INF = 1e18;
const cost = (i, j, k) => { const len = pts[j].s - pts[i].e; const r = len / Math.max(0.3, want[k]); return Math.log(Math.max(r, 0.05)) ** 2; };
const D = Array.from({ length: N + 1 }, () => new Array(P).fill(INF)), B = Array.from({ length: N + 1 }, () => new Array(P).fill(-1));
D[0][0] = 0;
for (let k = 1; k <= N; k++) for (let j = 1; j < P; j++) {
  if (k === N && j !== P - 1) continue;
  if (k < N && j === P - 1) continue;
  const bonus = k < N ? -0.6 * Math.min(pts[j].d / gapAvg, 1.5) : 0;
  for (let i = 0; i < j; i++) { if (D[k - 1][i] >= INF) continue; const v = D[k - 1][i] + cost(i, j, k - 1) + bonus; if (v < D[k][j]) { D[k][j] = v; B[k][j] = i; } }
}
const idx = []; for (let k = N, j = P - 1; k > 0; k--) { idx.push(j); j = B[k][j]; }
const cuts = idx.reverse().slice(0, N - 1).map((j) => pts[j].m);
const bounds = [0, ...cuts, dur];
if (process.env.VOIX_DEBUG) console.log(cuts.map((x) => x.toFixed(2)).join(" "));
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
