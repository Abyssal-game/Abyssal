// Amis (v500) : ajouter des joueurs par leur pseudo, répondre aux demandes, voir la fiche d'un ami
// (collection, succès, statistiques). Serveur : supabase/07-amis.sql. Fiche publiée par sync.js (js/core/friends.js).
import * as cloud from '../cloud/cloud.js';
import { sync, refreshProfile } from '../cloud/sync.js';
import { cardEntry, cleanCard } from '../core/friends.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox } from '../ui/dom.js';
import { FRIEND_MSG, MASKED_NAME, openReport } from '../ui/report.js';
import { isBlocked } from '../core/moderation.js';
import { t } from '../i18n.js';
import { RARITY_ORDER, FACTION_ORDER } from '../config.js';
import { withPlate, fondCls, fondStyle } from '../ui/vitrine.js'; /* v564 */

let cache = null; // dernière liste reçue (pour afficher la fiche sans attendre)
const VBEST = ['prism', 'crystal', 'galaxy', 'gold', 'holo', 'normal'];
const GAMES = [['sceaux', 'Duels des Sceaux'], ['pacte', 'Le Pacte'], ['cryptes', 'Les Cryptes'], ['encheres', 'Les Enchères']];

export default function friends(app, root, params = []) {
  const g = app.game, cat = app.catalog;
  let alive = true, busy = false, filter = 'all';
  const pic = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const head = (sub) => `<header class="screen-head ui-hero bn-amis"><h1>Amis</h1><p class="muted">${sub}</p></header>`;

  // ——— Liste : ajouter, demandes reçues, amis, demandes envoyées ———
  async function list() {
    const me = cloud.isLoggedIn() && sync.profile?.pseudo; /* v528 : compte obligatoire, seul le pseudo peut manquer */
    root.innerHTML = `${head('Ajoute des joueurs grâce à leur pseudo et découvre leur collection, leurs succès et leurs exploits.')}
      ${me ? `<section class="panel stack fr-me"><p class="small">Ton pseudo : <b>${esc(me)}</b> · donne-le à tes amis pour qu’ils t’ajoutent.</p>
        <form class="row gap fr-add" id="fr-add"><input class="input plain" name="pseudo" maxlength="16" minlength="3" placeholder="Pseudo d’un joueur" autocomplete="off" required><button class="btn primary" type="submit">Ajouter</button></form></section>`
        : `<section class="panel stack center"><p>Choisis d’abord ton pseudo : c’est grâce à lui que tes amis te trouvent.</p><a class="btn primary block" href="#/compte">Choisir mon pseudo</a></section>`}
      <div id="fr-list"><p class="small muted center">Chargement…</p></div>`;
    root.querySelector('#fr-add')?.addEventListener('submit', async (e) => {
      e.preventDefault(); if (busy) return;
      const v = String(new FormData(e.target).get('pseudo') || '').trim(); if (!v) return;
      busy = true;
      try { const out = await cloud.friendRequest(v); toast(FRIEND_MSG[out] || 'Fait.', { kind: 'success', icon: 'user' }); e.target.reset(); await load(); }
      catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info', ms: 6000 }); }
      busy = false;
    });
    if (me) await load(); else root.querySelector('#fr-list')?.remove();
  }
  async function load() {
    const box = root.querySelector('#fr-list'); if (!box) return;
    let rows;
    try { rows = await cloud.friendList(); cache = rows; }
    catch (err) { if (alive) box.innerHTML = `<p class="panel small center">${icon('info')} ${esc(err.message)}</p>`; return; }
    if (!alive) return;
    const inc = rows.filter((r) => r.status === 'pending' && r.incoming), out = rows.filter((r) => r.status === 'pending' && !r.incoming), ok = rows.filter((r) => r.status === 'accepted');
    const row = (r, acts) => `<div class="panel fr-row" data-open="${esc(r.id)}" role="button" tabindex="0">
        <span class="fr-av">${pic(r.avatar)}</span>
        <span class="fr-t"><b>${esc(r.pseudo)}</b>${r.badge ? ` ${cloud.badgeHTML(r.badge)}` : ''}<small>${esc(r.title || '')}${r.status === 'accepted' && r.level ? ` · niveau ${r.level}` : ''}${r.status === 'accepted' && r.owned ? ` · ${r.owned} créatures` : ''}</small></span>
        ${acts}</div>`;
    box.innerHTML = `
      ${inc.length ? `<h2 class="section-title">Demandes reçues <span class="pill-n">${inc.length}</span></h2>${inc.map((r) => row(r, `<span class="fr-acts"><button class="btn small primary" data-yes="${esc(r.id)}">Accepter</button><button class="btn small ghost" data-no="${esc(r.id)}">Refuser</button></span>`)).join('')}` : ''}
      <h2 class="section-title">Tes amis${ok.length ? ` <span class="pill-n">${ok.length}</span>` : ''}</h2>
      ${ok.length ? ok.map((r) => row(r, `<span class="fr-go">${icon('next')}</span>`)).join('') : '<p class="small muted center">Pas encore d’ami. Ajoute un joueur avec son pseudo, ou touche un pseudo dans un classement.</p>'}
      ${out.length ? `<h2 class="section-title">Demandes envoyées</h2>${out.map((r) => row(r, `<span class="fr-acts"><span class="small muted">En attente</span><button class="btn small ghost" data-cancel="${esc(r.id)}">Annuler</button></span>`)).join('')}` : ''}`;
  }
  async function act(fn, msg, back = null) {
    if (busy) return; busy = true;
    try { await fn(); if (msg) toast(msg, { icon: 'user' }); cache = null; if (back) await page(back); else await load(); }
    catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info' }); }
    busy = false;
  }

  // ——— Fiche d'un joueur (v528 : ami ou non ; sa collection complète reste réservée à ses amis) ———
  async function profileOf(id) {
    try { return await cloud.publicProfile(id); }
    catch (err) {
      if (err.status !== 404) throw err;
      /* serveur sans 10-profils.sql : seulement la fiche d'un ami, comme avant */
      const [row, list0] = await Promise.all([cloud.playerCard(id), cache ? Promise.resolve(cache) : cloud.friendList()]);
      cache = list0;
      const f = (list0 || []).find((r) => r.id === id);
      if (!f || f.status !== 'accepted') throw new Error('Ce joueur n’est pas ton ami.');
      return { ...f, friend: 'accepted', data: row?.data || null };
    }
  }
  async function page(id) {
    const info = (cache || []).find((r) => r.id === id);
    root.innerHTML = `${head(info ? esc(info.pseudo) : 'Profil d’un joueur')}<p class="small muted center">Chargement…</p>`;
    let f;
    try { f = await profileOf(id); }
    catch (err) { if (alive) root.innerHTML = `${head('Profil d’un joueur')}<p class="panel small center">${icon('info')} ${esc(err.message)}</p><a class="btn block" href="#/amis">Retour aux amis</a>`; return; }
    if (!alive) return;
    if (!f) { root.innerHTML = `${head('Profil d’un joueur')}<p class="panel small center">Ce joueur est introuvable.</p>`; return; }
    const masked = isBlocked(id), name = masked ? MASKED_NAME : f.pseudo || 'Joueur';
    const d = cleanCard(f.data), partial = !!d?.partial;
    if (!d) {
      root.innerHTML = `<section class="panel ornate profile-head bn-profile fr-head"><div class="av-col"><span class="avatar-big pf pf-fer">${pic(f.avatar)}</span></div>
        <div class="ph-text"><h1><span class="ph-name">${esc(name)}</span></h1><p class="ph-title">${esc(f.title || '')}</p><p class="muted small">Niveau ${f.level || 1}</p></div></section>
        <p class="panel small center">${t('{name} n’a pas encore partagé son profil : il apparaîtra quand il aura ouvert le jeu à jour.', { name: esc(name) })}</p>${actsHTML(f, name)}`;
      return;
    }
    const ids = Object.keys(d.col || {}).filter((x) => cat.get(x));
    const total = partial ? d.n || 0 : ids.length;
    const mine = new Set(Object.keys(g.s.collection).filter((x) => cat.get(x)));
    const common = ids.filter((x) => mine.has(x)).length, theirs = ids.length - common, onlyMe = [...mine].filter((x) => !(x in d.col)).length;
    const st = d.st || {}, gm = st.games || {};
    const achN = cat.achievements.length, achOk = (d.ach || []).filter((k) => cat.achievements.some((a) => a.key === k));
    const best = (x) => { const e = cardEntry(d, x); return (e && VBEST.find((v) => e.variants.includes(v))) || 'normal'; };
    const tile = (n, t) => `<div class="panel stat"><b>${n}</b><span>${t}</span></div>`;
    const draw = () => {
      const grid = root.querySelector('#fr-grid'); if (!grid) return;
      let shown = ids.slice();
      if (filter === 'new') shown = shown.filter((x) => !mine.has(x));
      else if (FACTION_ORDER.includes(filter)) shown = shown.filter((x) => cat.get(x).faction === filter);
      shown.sort((a, b) => RARITY_ORDER.indexOf(cat.get(b).rarity) - RARITY_ORDER.indexOf(cat.get(a).rarity) || a.localeCompare(b));
      grid.innerHTML = shown.length ? shown.map((x) => { const e = cardEntry(d, x); return cardHTML(cat.get(x), { variant: best(x), lazy: true, foreign: true, tag: `${e.lv > 1 ? `<span class="fr-lv">Niv. ${e.lv}</span>` : ''}${mine.has(x) ? '' : '<span class="fr-newc">Tu ne l’as pas</span>'}` }); }).join('') : '<p class="small muted">Aucune carte ici.</p>';
      lazyArt(grid);
      root.querySelectorAll('[data-flt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.flt === filter)));
    };
    root.innerHTML = `
      <section class="panel ornate profile-head bn-profile fr-head ${fondCls(d.fond)}"${fondStyle(d.fond)}>
        <div class="av-col"><span class="avatar-big pf pf-${esc(d.frame || 'fer')}">${pic(d.avatar || f.avatar)}</span></div>
        <div class="ph-text"><h1><span class="ph-name">${withPlate(d.plate, esc(name))}</span></h1>${f.badge ? cloud.badgeHTML(f.badge) : ''}<p class="ph-title">${esc(d.title || f.title || '')}</p><p class="muted small">Niveau ${d.lv || f.level || 1}${f.friend === 'accepted' ? ' · ton ami' : ''}</p></div>
      </section>
      ${(d.show || []).filter((x) => cat.get(x)).length ? `<h2 class="section-title">Sa vitrine</h2><div class="showcase">${d.show.filter((x) => cat.get(x)).map((x) => cardHTML(cat.get(x), { variant: best(x), foreign: true })).join('')}</div>` : ''}
      <div class="stats-grid pf-3">
        ${tile(`${total}`, `créatures sur ${cat.cards.length}`)}${tile(st.best || 0, 'étage record')}${tile(`${achOk.length}/${achN}`, 'succès')}
        ${tile(st.bosses || 0, 'gardiens vaincus')}${tile(st.trials || 0, 'Épreuves gagnées')}${tile(fmt(st.boosters || 0), 'boosters ouverts')}
      </div>
      ${partial ? '' : `<section class="panel fr-cmp"><p class="small"><b>${common}</b> créatures en commun · <b>${theirs}</b> qu’il a et pas toi · <b>${onlyMe}</b> que tu as et pas lui</p></section>`}
      <details class="panel dc-fold"><summary>${icon('crown')} Ses exploits</summary><div>
        <div class="stats-grid">${GAMES.map(([k, n]) => tile(gm[k]?.w || 0, `victoires · ${n}`)).join('')}${tile(d.titles || 0, 'titres gagnés')}${tile((d.sets || []).length, 'ensembles complétés')}${st.night ? tile(st.night, 'record en Cauchemar') : ''}</div>
      </div></details>
      <details class="panel dc-fold"><summary>${icon('crown')} Ses succès (${achOk.length})</summary><div class="fr-ach">
        ${achOk.length ? cat.achievements.filter((a) => achOk.includes(a.key)).map((a) => `<div class="fr-ach-i"><b>${esc(a.name)}</b><span class="small muted">${esc(a.desc)}</span></div>`).join('') : '<p class="small muted">Aucun succès pour l’instant.</p>'}
      </div></details>
      ${partial ? `<section class="panel stack center fr-locked"><p class="small">${icon('lock')} Sa collection complète est visible par ses amis.</p></section>` : `<h2 class="section-title">Sa collection</h2>
      <div class="chips fr-flt" role="group" aria-label="Filtrer sa collection"><button class="chip" data-flt="all">Toutes</button><button class="chip" data-flt="new">Que tu n’as pas</button>${FACTION_ORDER.map((k) => `<button class="chip" data-flt="${k}" style="--chip:${cat.faction[k].colors.secondary}" >${sigil(k)}<span>${esc(cat.faction[k].name)}</span></button>`).join('')}</div>
      <div class="grid-cards fr-grid" id="fr-grid"></div>`}
      ${actsHTML(f, name)}`;
    draw();
    root.querySelector('.fr-flt')?.addEventListener('click', (e) => { const b = e.target.closest('[data-flt]'); if (b) { filter = b.dataset.flt; draw(); } });
  }
  // boutons du bas d'un profil : selon le lien d'amitié, puis signaler / masquer
  const actsHTML = (f, name) => (f.me ? '' : `<div class="stack fr-pacts">
      ${f.friend === 'accepted' ? '' : f.friend === 'sent' ? `<p class="small muted center">Demande d’ami envoyée : il doit l’accepter.</p><button class="btn ghost small block" data-cancel="${esc(f.id)}" data-back="${esc(f.id)}">Annuler ma demande</button>`
        : f.friend === 'received' ? `<p class="small center">${t('{name} veut devenir ton ami !', { name: esc(name) })}</p><div class="row gap"><button class="btn primary grow" data-yes="${esc(f.id)}" data-back="${esc(f.id)}">Accepter</button><button class="btn ghost grow" data-no="${esc(f.id)}" data-back="${esc(f.id)}">Refuser</button></div>`
        : `<button class="btn primary block" data-addf="${esc(f.pseudo || '')}" data-back="${esc(f.id)}">${icon('user')}Ajouter en ami</button>`}
      <button class="btn ghost small block" data-report="${esc(f.id)}" data-name="${esc(f.pseudo || '')}">Signaler ou masquer ce joueur</button>
      ${f.friend === 'accepted' ? removeBtn(f) : ''}
    </div>`);
  const removeBtn = (f) => `<button class="btn ghost small block fr-remove" data-remove="${esc(f.id)}" data-name="${esc(f.pseudo)}">Retirer de mes amis</button>`;

  root.addEventListener('click', async (e) => {
    const t = e.target;
    const o = t.closest('[data-open]'); if (o && !t.closest('button')) { app.go(`amis/${o.dataset.open}`); return; }
    const y = t.closest('[data-yes]'); if (y) return act(() => cloud.friendRespond(y.dataset.yes, true), 'Vous êtes maintenant amis !', y.dataset.back);
    const n = t.closest('[data-no]'); if (n) return act(() => cloud.friendRespond(n.dataset.no, false), 'Demande refusée.', n.dataset.back);
    const c = t.closest('[data-cancel]'); if (c) return act(() => cloud.friendRemove(c.dataset.cancel), 'Demande annulée.', c.dataset.back);
    const a = t.closest('[data-addf]'); if (a) return act(async () => { const out = await cloud.friendRequest(a.dataset.addf); toast(FRIEND_MSG[out] || 'Fait.', { kind: 'success', icon: 'user' }); }, '', a.dataset.back);
    const rp = t.closest('[data-report]'); if (rp) { openReport(rp.dataset.report, rp.dataset.name, () => page(rp.dataset.report), { noFriend: true }); return; }
    const r = t.closest('[data-remove]');
    if (r) {
      if (!(await confirmBox(`Retirer ${esc(r.dataset.name)} de tes amis ? Vous ne verrez plus vos fiches.`, { ok: 'Retirer', danger: true }))) return;
      try { await cloud.friendRemove(r.dataset.remove); toast('Ami retiré.', { icon: 'user' }); app.go('amis'); }
      catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info' }); }
    }
  });
  root.addEventListener('keydown', (e) => { const o = e.target.closest?.('[data-open]'); if (o && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); app.go(`amis/${o.dataset.open}`); } });

  if (cloud.isLoggedIn() && !sync.profile) refreshProfile().then(() => { if (alive && !params[0]) list(); });
  if (params[0]) page(params[0]); else list();
  return () => { alive = false; };
}
