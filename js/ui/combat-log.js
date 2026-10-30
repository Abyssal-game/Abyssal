// v927 : enregistreur de combats (Mode Créateur, demande du propriétaire du 30 octobre 2026 : « qu'elle enregistre plein de
// choses pendant mes combats, les créatures avec leur niveau, les ennemis, la facilité ou la difficulté, les esquives et
// parades réussies, la force des coups donnés et reçus, les abus… pour que je puisse t'envoyer un fichier »).
// Allumé, chaque combat (Descente, Épreuves, Labo) est suivi coup par coup : équipe et ennemis au départ, chaque action
// (qui, quoi, sur qui, dé chargé, jet, dégâts), chaque coup ennemi avec la défense touche par touche (avance ou retard du doigt
// en ms), les PV à chaque tour. À la fin : bilan calculé (dégâts, défense, dés, difficulté, abus possibles).
// Tout reste sur l'appareil (localStorage) ; « Envoyer le fichier » le passe par le menu Partager de l'app.
// Rien ici ne change le combat : on lit seulement ce que le moteur renvoie.
const KEY = 'abyssal.clog', LOG = 'abyssal.clogLog', MAX = 40, MAX_STEPS = 900;
let on = false, cur = null, pendHits = [], pendDice = null;
try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* rien */ }

export const clogOn = () => on;
export function setClog(v) { on = !!v; try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* rien */ } if (!v) cur = null; }
export function clogList() { try { const a = JSON.parse(localStorage.getItem(LOG) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
export function clogClear() { try { localStorage.removeItem(LOG); } catch (e) { /* rien */ } }
export const clogRecording = () => !!cur;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const r2 = (x) => Math.round(x * 100) / 100;

/* photo d'une créature au départ */
function unitInfo(u) {
  return {
    uid: u.uid, id: u.id, name: u.name, side: u.side, rarity: u.rarity, faction: u.faction, role: u.role, fam: u.fam || undefined,
    level: u.level, pow: u.pow != null ? r2(u.pow) : undefined, atk: u.atk, hp: u.hp, maxHp: u.maxHp,
    boss: u.boss || undefined, elite: u.elite || undefined, brkMax: u.brkMax || undefined, trait: u.trait || undefined,
    talent: u.talent || undefined, form: u.form || undefined, shield: u.shield || undefined,
  };
}
const hpMap = (st) => Object.fromEntries(Object.values(st.units).map((u) => [u.uid, Math.max(0, u.hp)]));

/* événement du moteur réduit à l'essentiel */
const KEEP = ['u', 'a', 'src', 'd', 'hp', 'kind', 'tgt', 'r', 'mod', 'dc', 'total', 'tier', 'perfect', 'n', 'graze', 'side', 'combo', 'k', 'trait', 'syn'];
function slim(e) {
  const o = { t: e.t };
  for (const k of KEEP) if (e[k] !== undefined && e[k] !== null && e[k] !== false) o[k] = e[k];
  if (typeof e.s === 'string') o.s = e.s.slice(0, 48);
  return o;
}
const DROP = new Set(['actor', 'pa', 'enter', 'law']);

/* début d'un combat : ctx = ce que l'écran sait (étage, salle, règle du jour, présage, réglages…) */
export function clogStart(st, ctx = {}) {
  if (!on || !st) { cur = null; return; }
  pendHits = []; pendDice = null;
  const units = Object.values(st.units);
  const fresh = !st.seq && (st.round || 1) <= 1 && units.every((u) => u.side !== 'enemy' || u.hp >= u.maxHp);
  cur = {
    v: 1, at: new Date().toISOString(), t0: now(), ...ctx, resumed: !fresh || undefined,
    bossKey: st.bossKey || undefined, goal: st.goal || undefined, init: !!st.init, refPow: st.refPow != null ? r2(st.refPow) : undefined,
    fervor0: st.fervor ?? st.gauge, ult: st.ult || undefined, pact: st.pact || undefined, relics: st.relics?.length ? st.relics : undefined,
    allies: (st.order?.ally || []).map((id) => st.units[id]).filter(Boolean).map(unitInfo),
    enemies: (st.order?.enemy || []).map((id) => st.units[id]).filter(Boolean).map(unitInfo),
    steps: [], rounds: [{ r: st.round || 1, t: 0, hp: hpMap(st), fervor: st.fervor ?? st.gauge }],
    lastT: now(),
  };
  try {
    addEventListener('pagehide', onHide, { once: true });
    document.querySelector('.clog-pill')?.remove();
    const p = document.createElement('div'); p.className = 'clog-pill'; p.setAttribute('translate', 'no'); p.textContent = '● REC'; document.body.appendChild(p);
  } catch (e) { /* hors navigateur */ }
}
function onHide() { if (cur && cur.st) clogEnd(cur.st, 'app fermée'); }

/* l'écran passe ses appels au moteur par ici : chaque coup est noté avec les événements qu'il produit */
const HOOK = { duelAct: 'act', duelUlt: 'ult', duelPass: 'pass', duelNext: 'next', duelEnemy: 'enemy', duelEndEnemy: 'endEnemy' };
export function clogWrap(E, st) {
  if (!cur) return E;
  cur.st = st;
  return new Proxy(E, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (!HOOK[k]) return v.bind(t);
      return (...args) => {
        const t1 = now();
        const res = v.apply(t, args);
        try { if (cur) note(st, HOOK[k], args, res, t1); } catch (e) { /* l'enregistreur ne casse jamais un combat */ }
        return res;
      };
    },
  });
}

function note(st, kind, args, res, t1) {
  if (cur.steps.length >= MAX_STEPS) { cur.cut = true; return; }
  const step = { i: cur.steps.length, r: st.round || 0, t: Math.round(t1 - cur.t0), k: kind };
  let ev = [];
  if (kind === 'act') {
    const [, uid, key, tgt, rh] = args;
    Object.assign(step, { u: uid, key, tgt: tgt || undefined, rh: rh || undefined, think: Math.round(t1 - cur.lastT) });
    if (pendDice) { step.dice = pendDice; pendDice = null; }
    ev = res || [];
  } else if (kind === 'enemy') {
    const [, a, def] = args;
    Object.assign(step, { u: a, def });
    if (cur.nextQ && cur.nextQ.a === a) { step.kind = cur.nextQ.kind; step.tgtU = cur.nextQ.t; step.qte = cur.nextQ.qte; }
    if (pendHits.length) { step.hits = pendHits; pendHits = []; }
    if (cur.defInfo) { Object.assign(step, cur.defInfo); cur.defInfo = null; }
    ev = res || [];
  } else if (kind === 'next') {
    if (!res) return;
    const s = res.s || {};
    cur.nextQ = { a: s.a, kind: s.kind, t: s.t, qte: !!s.qte };
    ev = res.skips || [];
    if (!ev.length) return;
    step.skips = true;
  } else ev = res || [];
  step.ev = (Array.isArray(ev) ? ev : []).filter((e) => e && !DROP.has(e.t)).map(slim);
  cur.steps.push(step);
  if (kind === 'enemy' || kind === 'endEnemy' || kind === 'act' || kind === 'ult' || kind === 'pass') cur.lastT = now();
  const last = cur.rounds[cur.rounds.length - 1];
  if ((st.round || 0) !== last.r || st.over) cur.rounds.push({ r: st.round || 0, t: Math.round(now() - cur.t0), hp: hpMap(st), fervor: st.fervor ?? st.gauge });
}

/* détail d'une défense : chaque touche de la barre ou du cercle (appelé par playBar via onResult) */
export function clogHit(h) {
  if (!cur || !h) return;
  pendHits.push({ l: h.letter, res: h.res, ms: h.ms, dw: h.dodge, pw: h.parry, dur: h.dur });
}
/* ce que l'écran sait de la défense qui se prépare (séquence, Assaut, mode) */
export function clogDefInfo(o) { if (cur) cur.defInfo = o; }
/* lancer chargé du dé : bonus obtenu et écart à la cible (0 = centre) */
export function clogDice(o) { if (cur) pendDice = o; }

/* fin du combat (gagné, perdu) ou sortie (pause, abandon, app fermée) */
export function clogEnd(st, why = '') {
  if (!cur) return null;
  const c = cur; cur = null; pendHits = []; pendDice = null;
  try { removeEventListener('pagehide', onHide); document.querySelector('.clog-pill')?.remove(); } catch (e) { /* rien */ }
  if (!c.steps.length) return null;
  const s = st || c.st;
  delete c.st; delete c.nextQ; delete c.defInfo; delete c.lastT; delete c.t0;
  c.over = s?.over || why || 'interrompu';
  c.end = { round: s?.round, hp: s ? hpMap(s) : {}, fervor: s?.fervor ?? s?.gauge, stats: s?.stats ? { ...s.stats } : undefined, fallen: s?.fallenLog || undefined };
  c.secs = Math.round(((c.steps[c.steps.length - 1]?.t) || 0) / 1000);
  try { c.sum = clogAnalyze(c); } catch (e) { c.sum = { err: String(e?.message || e) }; }
  const log = clogList(); log.unshift(c);
  let keep = log.slice(0, MAX);
  for (;;) {
    try { localStorage.setItem(LOG, JSON.stringify(keep)); break; } catch (e) { if (keep.length <= 1) break; keep = keep.slice(0, Math.max(1, Math.floor(keep.length * 0.7))); }
  }
  return c;
}

// ——— Bilan d'un combat (pur : testable dans node) ———
export function clogAnalyze(c) {
  const U = {};
  for (const u of [...(c.allies || []), ...(c.enemies || [])]) U[u.uid] = { ...u, out: 0, in: 0, healOut: 0, healIn: 0, kills: 0, acts: {}, hits: [], taken: [], fell: null };
  const side = (uid) => U[uid]?.side || (String(uid || '')[0] === 'a' ? 'ally' : String(uid || '')[0] === 'e' ? 'enemy' : '');
  const mk = (uid) => (U[uid] ||= { uid, name: uid, side: side(uid), out: 0, in: 0, healOut: 0, healIn: 0, kills: 0, acts: {}, hits: [], taken: [], fell: null });
  const dice = { n: 0, perfect: 0, good: 0, miss: 0, gaps: [] }, rolls = { n: 0, crit: 0, success: 0, partial: 0, fumble: 0 };
  const def = { attacks: 0, qte: 0, dodge: 0, parry: 0, none: 0, keys: 0, keysOk: 0, early: 0, late: 0, msOk: [], msAll: [], byLetter: {}, dmgDefended: 0, dmgOpen: 0, assault: { n: 0, parry: 0, dodge: 0, none: 0 } };
  let skipsEnemy = 0, enemyActs = 0, maxOut = null, maxIn = null, combos = 0, breaks = 0, finishers = 0;
  const thinks = [];
  for (const st of c.steps || []) {
    const actor = st.u;
    if (st.k === 'act') {
      const a = mk(actor); a.acts[st.key] = (a.acts[st.key] || 0) + 1;
      if (st.think != null) thinks.push(st.think);
      if (st.dice) { dice.n++; dice[st.dice.bonus >= 2 ? 'perfect' : st.dice.bonus ? 'good' : 'miss']++; if (st.dice.gap != null) dice.gaps.push(st.dice.gap); }
    }
    if (st.k === 'enemy') {
      enemyActs++; def.attacks++;
      if (st.qte) {
        def.qte++; def[st.def === 'dodge' ? 'dodge' : st.def === 'parry' ? 'parry' : 'none']++;
        if (st.assault) { def.assault.n++; def.assault[st.def === 'dodge' ? 'dodge' : st.def === 'parry' ? 'parry' : 'none']++; }
      }
      for (const h of st.hits || []) {
        def.keys++;
        const L = (def.byLetter[h.l] ||= { n: 0, parry: 0, dodge: 0, none: 0 });
        L.n++; L[h.res === 'parry' ? 'parry' : h.res === 'dodge' ? 'dodge' : 'none']++;
        if (h.res !== 'none') def.keysOk++;
        if (h.ms != null) { def.msAll.push(h.ms); if (h.res !== 'none') def.msOk.push(h.ms); else if (h.ms < 0) def.early++; else def.late++; }
        else if (h.res === 'none') def.late++;
      }
    }
    if (st.skips) skipsEnemy += (st.ev || []).filter((e) => e.t === 'status').length ? 1 : 0;
    let dmgThis = 0;
    const lastSrc = {};
    for (const e of st.ev || []) {
      if (e.t === 'dmg') {
        const src = e.src || (st.k === 'act' ? actor : st.k === 'enemy' ? actor : null);
        const t = mk(e.u); t.in += e.d; t.taken.push(e.d); if (src) lastSrc[e.u] = src;
        if (src) { const s = mk(src); s.out += e.d; s.hits.push(e.d); }
        const hit = { d: e.d, u: e.u, src, r: st.r, key: st.key || st.kind };
        if (side(e.u) === 'enemy') { if (!maxOut || e.d > maxOut.d) maxOut = hit; }
        else if (side(e.u) === 'ally') { if (!maxIn || e.d > maxIn.d) maxIn = hit; dmgThis += e.d; }
      } else if (e.t === 'heal') { mk(e.u).healIn += e.d || 0; if (st.k === 'act' && actor) mk(actor).healOut += e.d || 0; }
      else if (e.t === 'die') { const t = mk(e.u); if (t.fell == null) t.fell = st.r; const k = lastSrc[e.u] || (st.k === 'act' ? actor : null); if (k && side(k) !== side(e.u)) mk(k).kills++; }
      else if (e.t === 'roll') { rolls.n++; rolls[e.tier] = (rolls[e.tier] || 0) + 1; }
      else if (e.t === 'combo') combos++;
      else if (e.t === 'broken') breaks++;
      else if (e.t === 'finisher') finishers++;
    }
    if (st.k === 'enemy') { if (st.def === 'dodge' || st.def === 'parry') def.dmgDefended += dmgThis; else def.dmgOpen += dmgThis; }
  }
  const allies = Object.values(U).filter((u) => u.side === 'ally'), foes = Object.values(U).filter((u) => u.side === 'enemy');
  const sum = (a, f) => a.reduce((x, y) => x + (f(y) || 0), 0);
  const endHp = c.end?.hp || {};
  const allyMax = sum(c.allies || [], (u) => u.maxHp), allyStart = sum(c.allies || [], (u) => u.hp), allyEnd = sum(c.allies || [], (u) => endHp[u.uid] ?? 0);
  const foeMax = sum(c.enemies || [], (u) => u.maxHp);
  let minPct = allyMax ? allyStart / allyMax : 1;
  for (const R of c.rounds || []) { const h = sum(c.allies || [], (u) => R.hp?.[u.uid] ?? 0); if (allyMax) minPct = Math.min(minPct, h / allyMax); }
  const pct = (x) => Math.round(100 * x);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const fallenAllies = allies.filter((u) => u.fell != null || (endHp[u.uid] ?? 1) <= 0).length;
  const rounds = c.end?.round || (c.rounds || []).slice(-1)[0]?.r || 0;
  const playerActs = sum(allies, (u) => sum(Object.values(u.acts), (n) => n));
  const totalDmgOut = sum(foes, (u) => u.in), totalDmgIn = sum(allies, (u) => u.in), totalHeal = sum(allies, (u) => u.healIn);

  /* difficulté ressentie */
  let level = 'Équilibré';
  if (c.over === 'lost') level = 'Défaite';
  else if (c.over === 'won') {
    if (fallenAllies >= 2 || minPct < 0.25) level = 'Très difficile';
    else if (fallenAllies === 1 || minPct < 0.45) level = 'Difficile';
    else if (minPct >= 0.85 && rounds <= 3) level = 'Très facile';
    else if (minPct >= 0.7) level = 'Facile';
  } else level = 'Non terminé';

  /* abus possibles et choses étranges */
  const flags = [];
  const keys = {}; allies.forEach((u) => Object.entries(u.acts).forEach(([k, n]) => { keys[k] = (keys[k] || 0) + n; }));
  const topKey = Object.entries(keys).sort((a, b) => b[1] - a[1])[0];
  if (topKey && playerActs >= 6 && topKey[1] / playerActs >= 0.7) flags.push(`Action répétée : « ${topKey[0]} » = ${pct(topKey[1] / playerActs)} % des actions (${topKey[1]}/${playerActs})`);
  if (maxOut && foeMax && maxOut.d >= 0.4 * foeMax && (c.enemies || []).length > 1) flags.push(`Coup démesuré : ${maxOut.d} dégâts d’un coup (${pct(maxOut.d / foeMax)} des PV de tous les ennemis) par ${U[maxOut.src]?.name || maxOut.src} (${maxOut.key || '?'})`);
  for (const f of foes) if (f.maxHp && f.hits.length === 0 && f.in >= f.maxHp && (f.boss || f.elite)) flags.push(`${f.boss ? 'Gardien' : 'Élite'} tué(e) sans avoir pu jouer`);
  for (const a of allies) if (a.maxHp && a.healIn > 1.5 * a.maxHp) flags.push(`${a.name} soigné(e) de ${a.healIn} PV (${pct(a.healIn / a.maxHp)} de ses PV max)`);
  const bigFoe = foes.find((f) => f.boss || f.elite);
  if (c.over === 'won' && bigFoe && rounds <= 1) flags.push(`${bigFoe.boss ? 'Gardien' : 'Élite'} battu(e) dès le 1er tour`);
  if (c.over === 'won' && totalDmgIn === 0 && enemyActs >= 2) flags.push('Aucun dégât reçu de tout le combat');
  if (def.qte >= 5 && def.parry / def.qte >= 0.9) flags.push(`Parades trop faciles ? ${def.parry}/${def.qte} attaques parées`);
  if (def.qte >= 5 && (def.dodge + def.parry) / def.qte <= 0.15) flags.push(`Défenses presque toutes ratées (${def.dodge + def.parry}/${def.qte})`);
  if (enemyActs + skipsEnemy >= 4 && skipsEnemy / (enemyActs + skipsEnemy) >= 0.5) flags.push(`Ennemis bloqués la moitié du temps ou plus (${skipsEnemy} tours perdus pour ${enemyActs} coups)`);
  if (dice.n >= 4 && dice.perfect / dice.n >= 0.9) flags.push(`Dé chargé parfait ${dice.perfect}/${dice.n} : peut-être trop facile`);
  if (rolls.n >= 4 && (rolls.fumble || 0) / rolls.n >= 0.4) flags.push(`Beaucoup d’échecs critiques au dé (${rolls.fumble}/${rolls.n})`);

  const unit = (u) => ({
    name: u.name, lv: u.level, rar: u.rarity, role: u.role, out: u.out, in: u.in, heal: u.healOut || undefined, healed: u.healIn || undefined, kills: u.kills || undefined,
    maxHit: u.hits.length ? Math.max(...u.hits) : 0, avgHit: avg(u.hits), acts: Object.keys(u.acts).length ? u.acts : undefined, fell: u.fell ?? undefined,
    hpEnd: endHp[u.uid] != null ? `${endHp[u.uid]}/${u.maxHp}` : undefined,
  });
  return {
    level, rounds, playerActs, enemyActs, enemySkips: skipsEnemy,
    team: { hpStart: pct(allyMax ? allyStart / allyMax : 1), hpEnd: pct(allyMax ? allyEnd / allyMax : 0), hpMin: pct(minPct), fallen: fallenAllies },
    dmg: { out: totalDmgOut, in: totalDmgIn, heal: totalHeal, foeMaxHp: foeMax, maxOut, maxIn, combos, breaks, finishers },
    defense: {
      attacks: def.attacks, qte: def.qte, dodge: def.dodge, parry: def.parry, none: def.none,
      rate: def.qte ? pct((def.dodge + def.parry) / def.qte) : null, keys: def.keys, keysOk: def.keysOk, early: def.early, late: def.late,
      msMedOk: med(def.msOk), msMedAll: med(def.msAll), byLetter: def.byLetter, dmgOpen: def.dmgOpen, dmgDefended: def.dmgDefended, assault: def.assault.n ? def.assault : undefined,
    },
    dice: dice.n ? { n: dice.n, perfect: dice.perfect, good: dice.good, miss: dice.miss, gapMed: med(dice.gaps) } : undefined,
    rolls: rolls.n ? rolls : undefined,
    thinkMed: med(thinks),
    units: { allies: allies.map(unit), enemies: foes.map(unit) },
    flags,
  };
}

/* texte lisible (en tête du fichier, et « Copier le résumé ») */
export function clogText(list = clogList()) {
  if (!list.length) return 'Aucun combat enregistré.';
  const out = [];
  for (const c of list.slice().reverse()) {
    const s = c.sum || {};
    const where = c.where === 'trial' ? 'Épreuve' : c.where === 'lab' ? 'Labo' : 'Descente';
    out.push(`■ ${new Date(c.at).toLocaleString('fr-FR')} · ${where} · étage ${c.floor ?? '?'} · ${c.room || ''}${c.bossKey ? ` · gardien ${c.bossKey}` : ''} · ${c.over === 'won' ? 'VICTOIRE' : c.over === 'lost' ? 'DÉFAITE' : String(c.over).toUpperCase()} · ${s.level || ''}`);
    out.push(`  ${s.rounds} tour(s), ${c.secs} s · écart de force ${c.gap ?? '?'} · défense ${c.defMode || '?'} · vitesse ×${c.fast ? 2 : 1}${c.rule ? ` · règle ${c.rule}` : ''}${c.omen ? ` · présage ${c.omen}` : ''}${c.resumed ? ' · repris en cours' : ''}`);
    out.push(`  Équipe : ${(c.allies || []).map((u) => `${u.name} (${u.rarity} niv ${u.level}, ${u.role}, ${u.hp}/${u.maxHp})`).join(' · ')}`);
    out.push(`  Ennemis : ${(c.enemies || []).map((u) => `${u.name} (${u.rarity}${u.boss ? ' GARDIEN' : u.elite ? ' élite' : ''}, ATQ ${u.atk}, PV ${u.maxHp}${u.trait ? `, ${u.trait}` : ''})`).join(' · ')}`);
    if (s.team) out.push(`  PV de l’équipe : ${s.team.hpStart} % → ${s.team.hpEnd} % (au plus bas ${s.team.hpMin} %) · tombées ${s.team.fallen}`);
    if (s.dmg) out.push(`  Dégâts donnés ${s.dmg.out} (PV ennemis ${s.dmg.foeMaxHp}) · reçus ${s.dmg.in} · soins ${s.dmg.heal} · plus gros coup donné ${s.dmg.maxOut?.d ?? 0} · reçu ${s.dmg.maxIn?.d ?? 0} · Brisures ${s.dmg.breaks}`);
    if (s.defense) out.push(`  Défense : ${s.defense.dodge} esquives, ${s.defense.parry} parades, ${s.defense.none} ratées sur ${s.defense.qte} (${s.defense.rate ?? '—'} %) · touches ${s.defense.keysOk}/${s.defense.keys} · trop tôt ${s.defense.early}, trop tard ${s.defense.late} · écart médian ${s.defense.msMedAll ?? '—'} ms`);
    if (s.dice) out.push(`  Dé chargé : ${s.dice.perfect} parfaits, ${s.dice.good} bien, ${s.dice.miss} ratés sur ${s.dice.n}`);
    for (const f of s.flags || []) out.push(`  ⚠ ${f}`);
    out.push('');
  }
  return out.join('\n');
}
