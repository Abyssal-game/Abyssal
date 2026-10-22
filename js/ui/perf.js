// v601 : moniteur de fluidité (Mode Créateur, demande du propriétaire : « observer les chutes de fps pendant les combats,
// les latences, et savoir à quel moment cela survient »). Quand il est allumé, chaque combat est suivi image par image
// (requestAnimationFrame) : images par seconde, images trop longues (saccades) avec ce que le combat faisait à ce moment-là
// (marques posées par l'écran de combat : coup, effet, barre de défense…), délai entre un toucher et l'image suivante.
// Les relevés restent sur l'appareil (localStorage) ; « Copier le rapport » donne un texte à coller dans la conversation.
const KEY = 'abyssal.perf', LOG = 'abyssal.perfLog', MAX_SESS = 12;
let on = false, sess = null, raf = 0, last = 0, pill = null, marks = [], winN = 0, winT = 0;
try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* rien */ }

export const perfOn = () => on;
export function setPerf(v) { on = !!v; try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* rien */ } if (!v) perfStop(); }
export function perfLog() { try { const a = JSON.parse(localStorage.getItem(LOG) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
export function perfClear() { try { localStorage.removeItem(LOG); } catch (e) { /* rien */ } }

/* marque : ce que fait le combat à cet instant (gardée 0,6 s pour expliquer une saccade) */
export function perfMark(name) {
  if (!sess) return;
  const t = performance.now();
  marks.push([t, name]); if (marks.length > 40) marks.shift();
  sess.counts[name] = (sess.counts[name] || 0) + 1;
}
const recent = (t) => [...new Set(marks.filter(([m]) => t - m < 600).map(([, n]) => n))].slice(-4).join(' + ') || 'aucune action notée';

function onTap(e) {
  if (!sess) return;
  const t0 = e.timeStamp;
  requestAnimationFrame(() => requestAnimationFrame((t2) => {
    if (!sess) return;
    const lat = Math.round(t2 - t0); /* toucher → image suivante affichée */
    sess.taps.push(lat);
    if (lat > 120) sess.slowTaps.push({ t: Math.round(t0 - sess.t0), ms: lat, what: recent(t0) });
  }));
}

export function perfStart(label) {
  if (!on) return;
  perfStop();
  sess = { label, at: new Date().toISOString(), t0: performance.now(), frames: 0, dts: [], hitches: [], counts: {}, taps: [], slowTaps: [], long: [] };
  marks = []; last = 0; winN = 0; winT = performance.now();
  pill = document.createElement('div'); pill.className = 'perf-pill'; pill.setAttribute('translate', 'no'); document.body.appendChild(pill);
  addEventListener('pointerdown', onTap, true);
  addEventListener('pagehide', perfStop, { once: true }); /* app fermée en plein combat : le relevé est gardé */
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    try { sess.obs = new PerformanceObserver((l) => { for (const x of l.getEntries()) if (sess) sess.long.push({ t: Math.round(x.startTime - sess.t0), ms: Math.round(x.duration), what: recent(x.startTime) }); }); sess.obs.observe({ type: 'longtask' }); } catch (e) { /* Safari : pas de tâches longues */ }
  }
  const loop = (t) => {
    if (!sess) return;
    if (last) {
      const dt = t - last; sess.frames++; sess.dts.push(Math.round(dt * 10) / 10); if (sess.dts.length > 20000) sess.dts.shift();
      const base = sess.base || 16.7;
      if (sess.frames === 60) { const s = sess.dts.slice().sort((a, b) => a - b); sess.base = s[Math.floor(s.length / 2)]; }
      if (dt > Math.max(40, base * 2.5) && !document.hidden) sess.hitches.push({ t: Math.round(t - sess.t0), ms: Math.round(dt), what: recent(t), nodes: document.getElementsByTagName('*').length });
      winN++;
      if (t - winT >= 500) { const fps = Math.round((winN * 1000) / (t - winT)); winN = 0; winT = t; if (pill) { pill.textContent = `${fps} i/s`; pill.className = `perf-pill ${fps < 40 ? 'bad' : fps < 55 ? 'mid' : ''}`; } }
    }
    last = t; raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function perfStop() {
  if (!sess) return;
  cancelAnimationFrame(raf); removeEventListener('pointerdown', onTap, true); removeEventListener('pagehide', perfStop);
  try { sess.obs?.disconnect(); } catch (e) { /* rien */ }
  pill?.remove(); pill = null;
  const s = sess; sess = null;
  const dur = Math.round(performance.now() - s.t0);
  if (dur < 3000) return;
  const dts = s.dts.slice().sort((a, b) => a - b), q = (p) => dts[Math.min(dts.length - 1, Math.floor(dts.length * p))] || 0;
  const base = s.base || q(0.5) || 16.7;
  const cause = {};
  for (const h of s.hitches) for (const w of h.what.split(' + ')) cause[w] = (cause[w] || 0) + h.ms;
  const rec = {
    label: s.label, at: s.at, dur, frames: s.frames, fps: Math.round((s.frames * 1000) / dur), hz: Math.round(1000 / base),
    p50: q(0.5), p95: q(0.95), p99: q(0.99), max: dts[dts.length - 1] || 0,
    slowShare: Math.round((100 * dts.filter((x) => x > base * 1.8).length) / Math.max(1, dts.length)),
    hitches: s.hitches.sort((a, b) => b.ms - a.ms).slice(0, 15), nHitch: s.hitches.length,
    cause: Object.entries(cause).sort((a, b) => b[1] - a[1]).slice(0, 8),
    taps: s.taps.length, tapMed: s.taps.length ? s.taps.slice().sort((a, b) => a - b)[Math.floor(s.taps.length / 2)] : null, slowTaps: s.slowTaps.slice(0, 10),
    long: s.long.sort((a, b) => b.ms - a.ms).slice(0, 8), marks: s.counts,
  };
  const log = perfLog(); log.unshift(rec);
  try { localStorage.setItem(LOG, JSON.stringify(log.slice(0, MAX_SESS))); } catch (e) { /* stockage plein */ }
}

/* texte du rapport à coller dans la conversation */
export function perfReport(info = {}) {
  const log = perfLog();
  const head = [`Moniteur de fluidité (${info.version || ''}) :`, `Appareil : ${navigator.userAgent}`, `Écran : ${screen.width} × ${screen.height}, densité ${devicePixelRatio}${info.extra ? ` · ${info.extra}` : ''}`, ''];
  if (!log.length) return [...head, 'Aucun combat relevé.'].join('\n');
  return [...head, ...log.map((r) => [
    `■ ${r.label} · ${new Date(r.at).toLocaleString('fr-FR')} · ${Math.round(r.dur / 1000)} s`,
    `  ${r.fps} i/s en moyenne (écran ≈ ${r.hz} Hz) · image médiane ${r.p50} ms, 95 % ${r.p95} ms, 99 % ${r.p99} ms, pire ${Math.round(r.max)} ms · images lentes ${r.slowShare} %`,
    `  Saccades : ${r.nHitch}${r.cause.length ? ` · surtout pendant : ${r.cause.map(([w, ms]) => `${w} (${ms} ms)`).join(', ')}` : ''}`,
    ...r.hitches.slice(0, 8).map((h) => `   - à ${(h.t / 1000).toFixed(1)} s : ${h.ms} ms · ${h.what} · ${h.nodes} éléments`),
    `  Touchers : ${r.taps}${r.tapMed != null ? `, délai médian ${r.tapMed} ms` : ''}${r.slowTaps.length ? ` · lents : ${r.slowTaps.map((x) => `${x.ms} ms (${x.what})`).join(', ')}` : ''}`,
    ...(r.long.length ? [`  Tâches longues : ${r.long.map((x) => `${x.ms} ms (${x.what})`).join(', ')}`] : []),
  ].join('\n'))].join('\n\n');
}
