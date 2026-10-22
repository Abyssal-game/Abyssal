// v592 : Revue des doublons (Mode Créateur, demande du propriétaire du 22 octobre 2026) : les cosmétiques qui se
// ressemblent, posés côte à côte groupe par groupe, puis les moins beaux et ceux à surveiller (symboles), avec pour
// chacun « À garder » ou « À supprimer ». Le choix reste sur l'appareil (localStorage) ; « Copier mon choix » donne
// un texte à coller dans la conversation pour appliquer les suppressions. Outil en français seulement (translate="no").
import { CODEX_FRAMES, CODEX_BACKS, SACHETS, PLATES, REMOVED_COSM } from '../core/codex.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, toast, openSheet, confirmBox } from '../ui/dom.js';
import { artUrl } from '../art/assets.js';

const KEY = 'abyssal.cosmRevue';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const write = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* rien */ } };

/* n° = numéros de la liste donnée dans la conversation du 22 octobre 2026 */
const SECTIONS = [
  { title: 'Doublons · cadres', groups: [
    ['1', 'Anneaux noirs presque nus', ['cx-vif-corbeau', 'cx-vif-obsidienne']],
    ['2', 'Anneau sombre et gemmes rouges', ['cx-vif-araignee', 'cx-vif-sang', 'cx-vif-rubis']],
    ['3', 'Argent et pierres blanches', ['cx-vif-lune', 'cx-vif-perle']],
    ['4', 'Lueur vert-turquoise', ['cx-vif-serpent', 'cx-vif-maree']],
    ['5', 'Bleu pâle', ['cx-vif-loup', 'cx-vif-foudre']],
    ['6', 'Sombre à reflets verts', ['cx-vif-kraken', 'cx-vif-foret']],
  ] },
  { title: 'Doublons · dos', groups: [
    ['7', 'Spirale ou trou noir au centre', ['dos-vif-nebuleuse', 'dos-vif-portail', 'dos-vif-eclipse']],
    ['8', 'Grand œil au centre', ['dos-vif-oeil-or', 'dos-vif-abysse', 'dos-vif-kraken']],
    ['9', 'Cœur au centre', ['dos-vif-coeur-dragon', 'dos-vif-coeur-mecanique']],
  ] },
  { title: 'Doublons · sachets', groups: [
    ['10', 'Deux cœurs rouges', ['sachet-vif-sang', 'sachet-vif-coeur']],
    ['11', 'Cristaux de glace', ['sachet-givre', 'sachet-vif-givre-noir']],
    ['12', 'Cristaux violets', ['sachet-vif-geode', 'sachet-vif-ecrin', 'sachet-obsidienne']],
    ['13', 'Grands yeux', ['sachet-vif-dragon', 'sachet-vif-abysse']],
  ] },
  { title: 'Doublons · plaques', groups: [
    ['14', 'Rectangles sombres presque unis', ['pl-obsidienne', 'pl-grimoire', 'pl-ossuaire', 'pl-pierre', 'pl-eclipse']],
    ['15', 'Bleu glacé', ['pl-loup', 'pl-givre']],
  ] },
  { title: 'Doublons · saisons du Codex', groups: [
    ['16-17', 'Flocon de neige au centre', ['dos-solstice', 'dos-vif-hiver', 'dos-aurore']],
    ['18', 'Cœur rouge transpercé', ['dos-roses', 'dos-coeurs']],
  ] },
  { title: 'Les moins beaux', groups: [
    ['19', 'Peau recousue sur fond beige', ['dos-vivant']],
    ['20', 'Rose et pastel', ['dos-jumeaux']],
    ['21', 'Fond blanc', ['dos-encre']],
    ['22', 'Marbre blanc', ['dos-celeste']],
    ['23', 'Parchemin pâle et délavé', ['dos-carte-abysse']],
    ['24', 'Médaillon sans bordure', ['dos-titan']],
    ['25', 'Terne, peu lisible', ['dos-tapisserie']],
    ['26', 'Coulures boueuses', ['pl-sang']],
    ['27', 'Bords flous', ['pl-givre', 'pl-abysse']],
  ] },
  { title: 'À surveiller (symboles)', groups: [
    ['28', 'Œil dans un losange à rayons', ['dos-art-deco']],
    ['29', 'Œil sous un croissant de lune', ['dos-tarot']],
    ['30', 'Œil dans un disque solaire', ['sachet-grimoire']],
  ] },
];

/* v593 : les objets supprimés après la revue du 22 octobre 2026 ne s'affichent plus (un groupe vidé disparaît) */
const GONE = new Set(REMOVED_COSM);
for (const sec of SECTIONS) sec.groups = sec.groups.map(([n, l, list]) => [n, l, list.filter((id) => !GONE.has(id))]).filter((gr) => gr[2].length);

const kindOf = (id) => id.startsWith('cx-') ? 'frame' : id.startsWith('dos-') ? 'back' : id.startsWith('sachet-') ? 'sachet' : 'plate';
const nameOf = (id) => {
  const n = CODEX_FRAMES[id] || CODEX_BACKS[id] || SACHETS[id] || PLATES[id];
  return typeof n === 'string' ? n : n?.name || id;
};

export function openCosmeticsReview(app) {
  const g = app.game, cat = app.catalog;
  let pick = read();
  const av = cat.get(g.shownAvatar?.() || g.s.avatar);
  const avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
  const pic = (id) => {
    const k = kindOf(id);
    if (k === 'frame') return `<span class="avatar-big pf pf-${esc(id)}">${avImg}</span>`;
    if (k === 'back') return `<img class="rv-back" loading="lazy" alt="" src="assets/backs/${esc(id)}.webp">`;
    if (k === 'sachet') return `<img class="rv-back" loading="lazy" alt="" src="assets/packs/${esc(id)}.webp">`;
    return `<span class="np np-${esc(id)} np-demo">${esc(g.s.name || 'Pseudo')}</span>`;
  };
  const ids = [...new Set(SECTIONS.flatMap((s) => s.groups.flatMap((gr) => gr[2])))];
  const item = (id) => `<div class="rv-it ${pick[id] || ''} k-${kindOf(id)}">
      <span class="rv-pic">${pic(id)}</span><b>${esc(nameOf(id))}</b><small>${esc(id)}</small>
      <div class="rv-vote"><button class="btn small rv-v keep ${pick[id] === 'keep' ? 'on' : ''}" data-rv="keep" data-id="${esc(id)}">À garder</button><button class="btn small rv-v drop ${pick[id] === 'drop' ? 'on' : ''}" data-rv="drop" data-id="${esc(id)}">À supprimer</button></div></div>`;

  const sheet = openSheet('', { full: true, cls: 'cl-lab rv-lab', label: 'Revue des doublons' });
  sheet.el.setAttribute('translate', 'no');
  function draw() {
    const done = ids.filter((id) => pick[id]).length, drops = ids.filter((id) => pick[id] === 'drop').length;
    sheet.setContent(`
      <h2>${icon('crown')} Revue des doublons</h2>
      <p class="small muted">Les cosmétiques qui se ressemblent sont posés côte à côte, groupe par groupe. Puis les moins beaux et ceux à surveiller. Pour chacun, touche <b>À garder</b> ou <b>À supprimer</b>. Ton choix reste sur ce téléphone ; « Copier mon choix » te donne un texte à me coller.</p>
      <p class="small center rv-count">${done} / ${ids.length} décidés · ${drops} à supprimer</p>
      ${SECTIONS.map((s) => `<h3 class="rv-sec">${esc(s.title)}</h3>${s.groups.map(([n, label, list]) => `<section class="rv-grp"><p class="rv-gt"><em>${esc(n)}</em> ${esc(label)}</p><div class="rv-row">${list.map(item).join('')}</div></section>`).join('')}`).join('')}
      <div class="cl-foot"><button class="btn gold block" data-rv="copy">${icon('download')}Copier mon choix</button>
        <button class="btn small block" data-rv="clear">Tout effacer</button></div>`);
  }

  function report() {
    const l = (s) => ids.filter((id) => pick[id] === s).map((id) => `- ${nameOf(id)} (${id})`);
    const d = l('drop'), k = l('keep');
    return ['Revue des doublons (Mode Créateur) :', '', `À SUPPRIMER (${d.length}) :`, ...(d.length ? d : ['- aucun']),
      '', `À GARDER (${k.length}) :`, ...(k.length ? k : ['- aucun']), '', `Pas encore décidés : ${ids.length - d.length - k.length}`].join('\n');
  }

  sheet.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rv]'); if (!b) return;
    const k = b.dataset.rv;
    if (k === 'keep' || k === 'drop') {
      const id = b.dataset.id;
      if (pick[id] === k) delete pick[id]; else pick[id] = k;
      write(pick); app.sfx.tap?.();
      const y = sheet.el.scrollTop; draw(); sheet.el.scrollTop = y;
      return;
    }
    if (k === 'copy') {
      const txt = report();
      try { await navigator.clipboard.writeText(txt); toast('Choix copié : colle-le dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
      catch (err) { const s2 = openSheet(`<h2 class="center">Ton choix</h2><p class="small muted center">Sélectionne tout le texte et copie-le.</p><textarea class="input cl-txt" readonly>${esc(txt)}</textarea>`, { label: 'Ton choix' }); s2.el.setAttribute('translate', 'no'); }
      return;
    }
    if (k === 'clear') { if (!(await confirmBox('Effacer tout ton choix ?', { ok: 'Effacer', danger: true }))) return; pick = {}; write(pick); draw(); }
  });
  draw();
}
