// v556 : Atelier des cosmétiques (Mode Créateur, demande du propriétaire) : voir tous les cadres, dos et finitions,
// les essayer en grand et les trier (garder, retirer, à revoir). Le tri reste sur l'appareil (localStorage) ;
// « Copier mon tri » donne un texte à coller dans la conversation pour appliquer les choix dans le jeu.
// Outil du propriétaire, en français seulement (translate="no").
import { CODEX_FRAMES, CODEX_BACKS, FINISHES, CATALOG, SEASONS, SHOP, CODEX_ONLY, RETIRED_COSM, PLATES, EMOTES, SACHETS } from '../core/codex.js';
import { FRAMES } from '../config.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, toast, openSheet, confirmBox } from '../ui/dom.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { emoteHTML } from '../ui/vitrine.js'; /* v564 */

const KEY = 'abyssal.cosmTri';
const ST = { keep: 'Garder', drop: 'Retirer', maybe: 'À revoir' };
const KINDS = { frame: 'Cadres', back: 'Dos', finish: 'Finitions', plate: 'Plaques', emote: 'Réactions', sachet: 'Sachets' };
const readTri = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const writeTri = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* rien */ } };

/* d'où vient chaque objet : saison du Codex (palier), Échoppe (prix), Pack du Fondateur, gratuit en jouant… */
function origins() {
  const o = {};
  const add = (k, txt, grp) => { if (k && !o[k]) o[k] = { txt, grp }; };
  for (const se of SEASONS) for (const t of se.tiers) {
    const r = t.prem; if (!r) continue;
    for (const k of [r.frame, r.back, r.finish, r.sachet]) add(k, `Saison ${se.num} · ${se.name} · palier ${t.tier}${t.tier === 30 ? ' (ultime)' : ''}`, `s:${se.key}`);
  }
  for (const it of CATALOG) for (const k of [it.give.frame, it.give.back, it.give.finish, it.give.plate, it.give.emote, ...(it.give.backs || [])]) add(k, it.kind === 'bundle' ? `Échoppe · lot « ${it.name} »` : `Échoppe · ${it.cost} obsidiennes`, 'shop');
  for (const it of SHOP) for (const k of [it.give?.frame, it.give?.back, it.give?.sachet]) add(k, `Échoppe · ${it.name}`, 'shop');
  for (const k of RETIRED_COSM) add(k, 'Retiré · ton tri du 21 octobre 2026', 'none'); /* v562 */
  for (const k of CODEX_ONLY) add(k, 'Codex · aucune saison pour l’instant', 'none');
  return o;
}

function allItems() {
  const o = origins(), out = [];
  for (const [k, n] of Object.entries(FRAMES)) out.push({ id: k, kind: 'frame', name: n, from: { txt: 'Gratuit · gagné en jouant', grp: 'free' } });
  for (const [k, n] of Object.entries(CODEX_FRAMES)) out.push({ id: k, kind: 'frame', name: n, from: o[k] || { txt: 'Réserve · nulle part', grp: 'none' } });
  out.push({ id: 'back', kind: 'back', name: 'Dos de l’Abysse (de base)', from: { txt: 'Gratuit · dos de départ', grp: 'free' } });
  for (const [k, n] of Object.entries(CODEX_BACKS)) out.push({ id: k, kind: 'back', name: n, from: o[k] || { txt: 'Réserve · nulle part', grp: 'none' } });
  for (const [k, n] of Object.entries(SACHETS)) out.push({ id: k, kind: 'sachet', name: n, from: o[k] || { txt: 'Réserve · nulle part', grp: 'none' } }); /* v565 */
  for (const [k, n] of Object.entries(PLATES)) out.push({ id: k, kind: 'plate', name: n, from: o[k] || { txt: 'Réserve · nulle part', grp: 'none' } }); /* v564 */
  for (const [k, e] of Object.entries(EMOTES)) out.push({ id: k, kind: 'emote', name: `${e.name || 'Réaction offerte'} · « ${e.text} »`, from: e.free ? { txt: 'Gratuit · offerte à tous', grp: 'free' } : o[k] || { txt: 'Réserve · nulle part', grp: 'none' } });
  for (const [k, f] of Object.entries(FINISHES)) out.push({ id: k, kind: 'finish', name: `Finition ${f.name}`, desc: f.desc, from: o[k] || { txt: 'Réserve · nulle part', grp: 'none' } });
  return out;
}

export function openCosmeticsLab(app) {
  const g = app.game, cat = app.catalog;
  const items = allItems();
  let tri = readTri();
  const ui = { kind: 'frame', from: 'all', st: 'all' };
  const av = cat.get(g.shownAvatar?.() || g.s.avatar);
  const avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
  const backSrc = (id) => `assets/backs/${id}.webp`;
  const cards = (g.bestCards?.(6) || []).filter(Boolean);
  if (!cards.length) cards.push(cat.get('ABY-039'));

  const groups = () => {
    const seen = new Map([['all', 'Toutes origines'], ['free', 'Gratuits'], ['shop', 'Échoppe']]);
    for (const se of SEASONS) seen.set(`s:${se.key}`, `Saison ${se.num}`);
    seen.set('none', 'Sans place');
    return [...seen];
  };
  const shown = () => items.filter((it) => it.kind === ui.kind && (ui.from === 'all' || it.from.grp === ui.from)
    && (ui.st === 'all' || (ui.st === 'todo' ? !tri[it.id] : tri[it.id] === ui.st)));

  const thumb = (it) => it.kind === 'frame' ? `<span class="avatar-big pf pf-${esc(it.id)}">${avImg}</span>`
    : it.kind === 'back' ? `<img class="cl-back" alt="" src="${backSrc(it.id)}" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'cl-miss',textContent:'image manquante'}))">`
    : it.kind === 'sachet' ? `<img class="cl-back" alt="" src="assets/packs/${esc(it.id)}.webp">`
    : it.kind === 'plate' ? `<span class="np np-${esc(it.id)} np-demo">Pseudo</span>`
    : it.kind === 'emote' ? `<span class="re-tile">${emoteHTML(it.id)}</span>`
    : `<span class="cl-fin">${cardHTML(cards[0], { dress: it.id })}</span>`;
  const badge = (id) => tri[id] ? `<em class="cl-st ${tri[id]}">${ST[tri[id]]}</em>` : '';

  const sheet = openSheet('', { full: true, cls: 'cl-lab', label: 'Atelier des cosmétiques' });
  sheet.el.setAttribute('translate', 'no');
  function draw() {
    const list = shown(), all = items.filter((it) => it.kind === ui.kind);
    const n = (s) => all.filter((it) => (s === 'todo' ? !tri[it.id] : tri[it.id] === s)).length;
    sheet.setContent(`
      <h2>${icon('crown')} Atelier des cosmétiques</h2>
      <p class="small muted">Tous les cadres, dos et finitions du jeu. Touche un objet pour le voir en grand, puis choisis <b>Garder</b>, <b>Retirer</b> ou <b>À revoir</b>. Ton tri reste sur ce téléphone ; « Copier mon tri » te donne un texte à me coller pour que je l'applique.</p>
      <div class="seg wide cl-seg">${Object.entries(KINDS).map(([k, v]) => `<button class="seg-b ${ui.kind === k ? 'on' : ''}" data-cl="kind" data-v="${k}">${v} (${items.filter((it) => it.kind === k).length})</button>`).join('')}</div>
      <div class="cl-chips">${[['all', `Tous (${all.length})`], ['todo', `À trier (${n('todo')})`], ['keep', `Gardés (${n('keep')})`], ['drop', `À retirer (${n('drop')})`], ['maybe', `À revoir (${n('maybe')})`]].map(([k, v]) => `<button class="chip" aria-pressed="${ui.st === k}" data-cl="st" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="cl-chips">${groups().map(([k, v]) => `<button class="chip" aria-pressed="${ui.from === k}" data-cl="from" data-v="${k}">${esc(v)}</button>`).join('')}</div>
      ${list.length ? `<div class="cl-grid">${list.map((it) => `<button class="cl-tile ${tri[it.id] || ''}" data-cl="see" data-id="${esc(it.id)}">
          <span class="cl-th">${thumb(it)}</span><b>${esc(it.name)}</b><small>${esc(it.from.txt)}</small>${badge(it.id)}</button>`).join('')}</div>`
        : '<p class="small muted center">Rien dans ce filtre.</p>'}
      <div class="cl-foot"><button class="btn gold block" data-cl="copy">${icon('download')}Copier mon tri</button>
        <button class="btn small block" data-cl="clear">Tout remettre « à trier »</button></div>`);
  }

  function preview(id) {
    const list = shown(); let i = Math.max(0, list.findIndex((x) => x.id === id));
    let pick = 0, plain = false, stopTilt = null;
    const sh = openSheet('', { full: true, cls: 'cx-pv cl-pv', label: 'Aperçu', onClose: () => { stopTilt?.(); draw(); } });
    sh.el.setAttribute('translate', 'no');
    const body = (it) => {
      if (it.kind === 'frame') return `<div class="cx-pv-prof"><span class="avatar-big pf pf-${esc(it.id)}">${avImg}</span><div><b>${esc(g.s.name || 'Ton nom')}</b><span>${esc(g.s.title || '')}</span></div></div>
        <p class="cx-pv-cap">En petit (barre du haut, classements)</p>
        <div class="cx-pv-vs"><div><span class="top-avatar pf pf-${esc(it.id)}">${avImg}</span><small>Barre du haut</small></div><div><span class="avatar-mini pf pf-${esc(it.id)}">${avImg}</span><small>Classement</small></div><div><span class="avatar-mini pf pf-${esc(g.s.frame)}">${avImg}</span><small>Ton cadre actuel</small></div></div>`;
      if (it.kind === 'back') return `<div class="cx-pv-back"><img alt="" src="${backSrc(it.id)}"></div>
        <p class="cx-pv-cap">À l'ouverture d'un booster</p><div class="cx-pv-fan">${[0, 1, 2].map(() => `<img alt="" src="${backSrc(it.id)}">`).join('')}</div>`;
      if (it.kind === 'sachet') return `<div class="cx-pv-back"><img alt="" src="assets/packs/${esc(it.id)}.webp"></div>`;
      if (it.kind === 'plate') return `<div class="cx-pv-prof"><span class="avatar-big pf pf-${esc(g.s.frame)}">${avImg}</span><div><b><span class="np np-${esc(it.id)}">${esc(g.s.name || 'Ton pseudo')}</span></b><span>${esc(g.s.title || '')}</span></div></div>
        <p class="cx-pv-cap">Au classement</p><div class="lb-row cx-pv-lb"><span class="lb-rank">1</span><span class="lb-av">${avImg}</span><span class="lb-name"><b><span class="np np-${esc(it.id)}">${esc(g.s.name || 'Ton pseudo')}</span></b><span class="small muted">${esc(g.s.title || '')}</span></span><span class="lb-floor">412 pts</span></div>`;
      if (it.kind === 'emote') return `<p class="cx-pv-cap">Ce que voit l'adversaire</p><div class="re-bubble demo on">${emoteHTML(it.id)}<small>${esc(g.s.name || 'Pseudo')}</small></div>`;
      const c = cards[pick % cards.length];
      return `<div class="cx-pvf-stage"><div class="detail-card cx-pvf-card">${cardHTML(c, { size: 'full', variant: 'normal', dress: plain ? null : it.id })}</div></div>
        <div class="cx-pvf-seg"><button class="${plain ? 'on' : ''}" data-pv="plain">Sans finition</button><button class="${plain ? '' : 'on'}" data-pv="dress">Avec</button></div>
        ${cards.length > 1 ? `<div class="cx-pvf-pick">${cards.map((x, j) => `<button class="${j === pick % cards.length ? 'on' : ''}" data-pv="pick" data-i="${j}">${cardHTML(x, { dress: it.id })}</button>`).join('')}</div>` : ''}`;
    };
    const paint = () => {
      stopTilt?.();
      const it = list[i];
      sh.setContent(`<p class="small muted center cl-pos">${i + 1} / ${list.length} · ${KINDS[it.kind]}</p>
        <h2 class="center cx-pv-title">${esc(it.name)}</h2><p class="small center cl-from">${esc(it.from.txt)}</p>${it.desc ? `<p class="small muted center">${esc(it.desc)}</p>` : ''}
        ${body(it)}
        <div class="cl-dock"><div class="cl-vote">${Object.entries(ST).map(([k, v]) => `<button class="btn ${tri[it.id] === k ? 'on ' : ''}cl-v ${k}" data-pv="vote" data-v="${k}">${v}</button>`).join('')}</div>
        <div class="cl-nav"><button class="btn small" data-pv="prev" ${i ? '' : 'disabled'}>‹ Précédent</button><button class="btn small" data-pv="next" ${i < list.length - 1 ? '' : 'disabled'}>Suivant ›</button></div></div>`);
      const dc = sh.body.querySelector('.cx-pvf-card'); stopTilt = dc ? enableTilt(dc, { reduced: app.reduced?.() }) : null;
    };
    paint();
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pv]'); if (!b) return;
      const k = b.dataset.pv, it = list[i];
      if (k === 'vote') {
        tri[it.id] = tri[it.id] === b.dataset.v ? undefined : b.dataset.v; if (!tri[it.id]) delete tri[it.id]; writeTri(tri); app.sfx.tap?.();
        if (tri[it.id] && i < list.length - 1) { i++; sh.el.scrollTo?.({ top: 0 }); } /* on passe tout de suite au suivant */
      }
      if (k === 'prev' && i) i--;
      if (k === 'next' && i < list.length - 1) i++;
      if (k === 'pick') pick = +b.dataset.i;
      if (k === 'plain' || k === 'dress') plain = k === 'plain';
      if (k === 'prev' || k === 'next') sh.el.scrollTo?.({ top: 0 });
      paint();
    });
  }

  function report() {
    const lines = ['Tri des cosmétiques (Atelier du Mode Créateur) :'];
    for (const [s, label] of [['drop', 'À RETIRER'], ['maybe', 'À REVOIR'], ['keep', 'À GARDER']]) {
      const l = items.filter((it) => tri[it.id] === s);
      lines.push('', `${label} (${l.length}) :`, ...(l.length ? l.map((it) => `- ${it.name} (${it.id}) · ${it.from.txt}`) : ['- aucun']));
    }
    lines.push('', `Pas encore triés : ${items.filter((it) => !tri[it.id]).length}`);
    return lines.join('\n');
  }

  sheet.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cl]'); if (!b) return;
    const k = b.dataset.cl;
    if (k === 'kind') { ui.kind = b.dataset.v; ui.from = 'all'; }
    if (k === 'st') ui.st = b.dataset.v;
    if (k === 'from') ui.from = b.dataset.v;
    if (k === 'see') return preview(b.dataset.id);
    if (k === 'copy') {
      const txt = report();
      try { await navigator.clipboard.writeText(txt); toast('Tri copié : colle-le dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
      catch (err) { const s2 = openSheet(`<h2 class="center">Ton tri</h2><p class="small muted center">Sélectionne tout le texte et copie-le.</p><textarea class="input cl-txt" readonly>${esc(txt)}</textarea>`, { label: 'Ton tri' }); s2.el.setAttribute('translate', 'no'); }
      return;
    }
    if (k === 'clear') { if (!(await confirmBox('Effacer tout ton tri des cosmétiques ?', { ok: 'Effacer', danger: true }))) return; tri = {}; writeTri(tri); }
    app.sfx.tap?.(); draw();
  });
  draw();
}
