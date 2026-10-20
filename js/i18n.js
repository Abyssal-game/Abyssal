// Langues du jeu (v506). Le français est la langue source : le code et les données restent écrits en français,
// et l'affichage est traduit au vol (traducteur du DOM ci-dessous) à partir d'un dictionnaire par langue
// (js/i18n/<langue>.js : { 'texte français': 'traduction' }).
// Clés : texte d'un bloc (paragraphe, bouton, titre…) avec ses balises de mise en forme simples (<b>, <i>, <small>…),
// espaces resserrés ; chaque nombre devient {0}, {1}… et chaque élément enfant (icône, image, pastille) {e0}, {e1}…
// Une phrase qui contient un nom ou une valeur non numérique passe par t() dans le code.
export const LANGS = { fr: 'Français', en: 'English' };
const KEY = 'abyssal.lang';
const browser = typeof window !== 'undefined' && typeof document !== 'undefined';

function pick() {
  try { const s = localStorage.getItem(KEY); if (s && LANGS[s]) return s; } catch (e) { /* stockage indisponible */ }
  const nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const l of nav) { const k = String(l || '').slice(0, 2).toLowerCase(); if (LANGS[k]) return k; }
  return 'fr';
}
export const LANG = browser ? pick() : 'fr';
let dict = null, names = null, nameRe = null;
if (browser && LANG !== 'fr') {
  try { const mod = await import(`./i18n/${LANG}.js`); dict = mod.default; names = mod.names || null; } catch (e) { dict = null; }
}
// v507 : noms propres (créatures, gardiens, personnages) : dans une phrase, chaque nom connu devient {n0}, {n1}…
// et la phrase se cherche sous cette forme (« Voir {n0} ») ; le nom est remis traduit
export function nameIndex(map) {
  const all = { ...map };
  for (const [k, v] of Object.entries(map)) { const m = k.match(/^(?:Le |La |Les |L’|L')(.+)$/); if (m && !(m[1] in all)) all[m[1]] = v; }
  const re = new RegExp(`(?<![\\p{L}])(${Object.keys(all).sort((a, b) => b.length - a.length).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'gu');
  return { all, re };
}
if (names) { const ix = nameIndex(names); names = ix.all; nameRe = ix.re; }
// Un mot ou un nom tel qu'affiché (pour les recherches : on cherche aussi dans la langue choisie)
export const tw = (s) => (s && (names?.[s] ?? dict?.[s])) || s;
export function nameKey(key, re) { const nm = []; return { key: key.replace(re, (m) => `{n${nm.push(m) - 1}}`), nm }; }
function look(key) {
  const tr = dict?.[key];
  if (tr != null) return { tr, nm: [] };
  if (!nameRe) return null;
  const nk = nameKey(key, nameRe);
  if (!nk.nm.length) return null;
  if (nk.key === '{n0}') return { tr: '{n0}', nm: nk.nm };
  const t2 = dict[nk.key];
  return t2 != null ? { tr: t2, nm: nk.nm } : null;
}
const fillNames = (tr, nm) => (nm.length ? tr.replace(/\{n(\d+)\}/g, (m, i) => (nm[+i] != null ? (names[nm[+i]] ?? nm[+i]) : m)) : tr);
const collecting = browser && (() => { try { return localStorage.getItem('abyssal.i18n.collect') === '1'; } catch (e) { return false; } })();

export function setLang(k) {
  if (!LANGS[k]) return;
  try { localStorage.setItem(KEY, k); } catch (e) { /* rien */ }
  location.reload();
}
export const langChosen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

// ——— Clés ———————————————————————————————————————————————————————————————
const NUM = /\d+(?:[  .,]\d{3})*(?:[.,]\d+)?/g;
const space = (s) => s.replace(/\s+/g, ' ').trim();
const fill = (tr, nums) => tr.replace(/\{(\d+)\}/g, (m, i) => (nums[+i] ?? m));

// Traduction d'une phrase depuis le code : t('Bonjour {name}', { name }) ; sans dictionnaire, le français.
export function t(fr, vars) {
  let s = dict?.[fr] ?? fr;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
// Texte simple (sans balise) : traduit s'il a une clé, avec ses nombres
export function tx(text) {
  if (!dict && !collecting) return text;
  const nums = [];
  const key = space(text).replace(NUM, (m) => `{${nums.push(m) - 1}}`);
  const hit = look(key);
  const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
  if (hit) return lead + fillNames(fill(hit.tr, nums), hit.nm) + tail;
  if (dict) {
    // citation entre guillemets, ou morceaux séparés par « · » : chacun traduit à part
    const q = text.match(/^(\s*)«\s*([\s\S]+?)\s*»(\s*)$/);
    if (q) { const v = tx(q[2]); if (v !== q[2]) return `${q[1]}“${v}”${q[3]}`; }
    if (text.includes(' · ')) { const parts = text.split(' · '), v = parts.map((x) => tx(x)); if (v.some((x, i) => x !== parts[i])) return v.join(' · '); }
  }
  miss(key); return text;
}

// ——— Traducteur du DOM ————————————————————————————————————————————————————
const FMT = new Set(['B', 'STRONG', 'I', 'EM', 'SMALL', 'U', 'SUP', 'SUB', 'S', 'MARK', 'BR']);
const INLINE = new Set([...FMT, 'SPAN', 'IMG', 'SVG', 'A', 'ABBR', 'CODE', 'KBD', 'TIME', 'DATA', 'LABEL', 'Q']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'VIDEO', 'AUDIO', 'NOSCRIPT', 'TEMPLATE']);
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
const LETTERS = /[A-Za-zÀ-ÿŒœ]{2}/;
const missing = new Map();
function miss(key) {
  if (!collecting || !LETTERS.test(key)) return;
  if (nameRe) key = nameKey(key, nameRe).key;
  missing.set(key, (missing.get(key) || 0) + 1);
}
if (collecting) {
  window.__i18nMissing = missing;
  // outil de collecte : les clés que produirait un morceau de HTML (sans rien traduire)
  window.__i18nKeysOf = (html) => {
    const box = document.createElement('div'); box.innerHTML = html; const out = new Set();
    const walk = (el) => {
      if (SKIP.has(el.tagName)) return;
      for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && LETTERS.test(v)) out.add(space(v).replace(NUM, (() => { let i = 0; return () => `{${i++}}`; })())); }
      if (el !== box && isBlock(el)) { out.add(keyOf(el).key); keyOf(el).els.forEach(walk); return; }
      for (const n of el.childNodes) { if (n.nodeType === 3 && LETTERS.test(n.data)) { let i = 0; out.add(space(n.data).replace(NUM, () => `{${i++}}`)); } else if (n.nodeType === 1) walk(n); }
    };
    if (isBlock(box)) { out.add(keyOf(box).key); keyOf(box).els.forEach(walk); } else walk(box);
    return [...out];
  };
}

const plain = (el) => FMT.has(el.tagName) && el.attributes.length === 0;
// Un bloc : du texte et seulement des éléments en ligne (mise en forme, icônes, pastilles)
function isBlock(el) {
  let text = false;
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { if (LETTERS.test(n.data)) text = true; }
    else if (n.nodeType === 1) {
      if (!INLINE.has(n.tagName.toUpperCase())) return false;
      if (plain(n) && !fmtOnly(n)) return false;
    }
  }
  return text || [...el.children].some((c) => plain(c) && LETTERS.test(c.textContent));
}
const fmtOnly = (el) => [...el.childNodes].every((n) => n.nodeType === 3 || (n.nodeType === 1 && plain(n) && fmtOnly(n)));
// Sérialise un bloc en clé : texte, balises simples gardées, autres éléments → {eK}, nombres → {K}
function keyOf(el) {
  const nums = [], els = [];
  const walk = (node) => {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) out += n.data.replace(NUM, (m) => `{${nums.push(m) - 1}}`);
      else if (n.nodeType === 1) {
        if (plain(n)) { const tg = n.tagName.toLowerCase(); out += tg === 'br' ? '<br>' : `<${tg}>${walk(n)}</${tg}>`; }
        else out += `{e${els.push(n) - 1}}`;
      }
    }
    return out;
  };
  return { key: space(walk(el)), nums, els };
}
function render(el, tr, nums, els) {
  const html = fill(tr, nums).replace(/\{e(\d+)\}/g, (m, i) => `<i data-i18e="${i}"></i>`);
  el.innerHTML = html;
  for (const ph of el.querySelectorAll('i[data-i18e]')) { const n = els[+ph.dataset.i18e]; if (n) ph.replaceWith(n); else ph.remove(); }
}
function attrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && LETTERS.test(v)) {
      let tr = tx(v);
      if (tr === v && v.includes(', ')) tr = v.split(', ').map((x) => tx(x)).join(', '); /* « Nom, Rare, Argentée » */
      if (tr !== v) el.setAttribute(a, tr);
    }
  }
}
function translateTree(root) {
  if (root.nodeType === 3) { const p = root.parentElement; if (p) translateTree(p); return; }
  if (root.nodeType !== 1 || SKIP.has(root.tagName) || root.closest?.('[translate="no"],.notranslate')) return;
  attrs(root);
  if (isBlock(root)) {
    const { key, nums, els } = keyOf(root);
    const hit = look(key);
    if (hit) render(root, fillNames(hit.tr, hit.nm), nums, els);
    else {
      miss(key);
      // repli : chaque morceau de texte du bloc (hors éléments enfants) traduit à part
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const parts = [];
      for (let n = w.nextNode(); n; n = w.nextNode()) if (LETTERS.test(n.data) && !els.some((e) => e.contains(n))) parts.push(n);
      for (const n of parts) { const v = tx(n.data); if (v !== n.data) n.data = v; }
    }
    for (const e of els) translateTree(e);
    return;
  }
  for (const n of [...root.childNodes]) {
    if (n.nodeType === 3) { if (LETTERS.test(n.data)) { const v = tx(n.data); if (v !== n.data) n.data = v; } }
    else if (n.nodeType === 1) translateTree(n);
  }
}
let obs = null;
export function startTranslator() {
  if (!browser || (!dict && !collecting)) return;
  document.documentElement.lang = LANG;
  document.title = tx(document.title);
  translateTree(document.body);
  obs = new MutationObserver((list) => {
    const seen = new Set();
    for (const m of list) {
      const t0 = m.type === 'characterData' ? m.target.parentElement : m.target;
      if (m.type === 'childList') for (const n of m.addedNodes) { if (n.nodeType === 1) seen.add(n); else if (n.nodeType === 3 && n.parentElement) seen.add(n.parentElement); }
      else if (t0) seen.add(t0);
    }
    // un élément ajouté dans un autre déjà listé est traité avec lui
    const top = [...seen].filter((n) => n.isConnected && ![...seen].some((o) => o !== n && o.contains(n)));
    for (const n of top) translateTree(n);
    obs.takeRecords(); // nos propres changements ne relancent pas le traducteur
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
