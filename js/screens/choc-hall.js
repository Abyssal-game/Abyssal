// v835 : « Le Panthéon d'hier » du Choc des Boosters : les 3 plus belles tables (total des deux joueurs) et les
// 3 plus belles cartes tirées la veille (jour de Paris), lues sur le serveur (choc_hall, supabase/09-multijoueur.sql).
// Toucher un joueur ouvre son profil (data-profile, géré par js/main.js).
import * as cloud from '../cloud/cloud.js';
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { EMBLEM } from '../ui/icons.js';
import { withPlate, frameCls } from '../ui/vitrine.js';
import { profileAttrs, shownName } from '../ui/report.js';
import { isBlocked } from '../core/moderation.js';
import { esc, fmt, openSheet } from '../ui/dom.js';
import { t, tw, LANG } from '../i18n.js';
import { playDuel } from './versus-duel.js';
import { fakeHall } from './choc-dev.js';

const FIN = { holo: 'Argentée', gold: 'Enluminée', galaxy: 'Abyssale', crystal: 'Cristalline', prism: 'Prismatique' };
const MEDAL = ['#F2C14E', '#C9D2DE', '#C07A45'];
/* v844 : images peintes (Gemini) ; tant qu'une image manque, le décor dessiné en CSS reste (classe has posée au chargement) */
const PIMG = (src, cls) => `<img class="${cls}" alt="" src="${src}" onload="this.parentNode.classList.add('has')" onerror="this.remove()">`;
const BG = () => `<span class="hl-bg">${PIMG('assets/choc/pantheon-fond.webp', 'hl-bg-img')}</span>`;
const medal = (i) => `<span class="hl-medal">${PIMG(`assets/choc/medaille-${i + 1}.webp`, 'hl-medal-img')}<b>${i + 1}</b></span>`;
let cache = null, cacheAt = 0, loading = null, sim = null;
/* v843 : Panthéon simulé du Mode Créateur (remplace celui du serveur tant qu'il est allumé) */
export function setHallSim(cat, lineupOf, kind) { sim = cat ? fakeHall(cat, lineupOf, kind) : null; return sim; }

// Les données d'hier (gardées 10 minutes : elles ne changent plus de la journée)
export function loadHall(force = false) {
  if (sim) return Promise.resolve(sim);
  if (!force && cache && Date.now() - cacheAt < 600000) return Promise.resolve(cache);
  if (loading) return loading;
  loading = cloud.chocHall().then((r) => { cache = r || { tables: [], cards: [], games: 0 }; cacheAt = Date.now(); return cache; })
    .catch((e) => { cache = { error: e?.message || String(e), tables: [], cards: [] }; cacheAt = Date.now() - 540000; return cache; })
    .finally(() => { loading = null; });
  return loading;
}
export const hallCached = () => sim || cache;

const dayLabel = (d) => { try { return new Date(`${d}T12:00:00`).toLocaleDateString(LANG === 'pt' ? 'pt-BR' : LANG, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return d; } };
const av = (cat, p) => { const c = !isBlocked(p.id) && p.avatar && cat.get(p.avatar); return `<span class="hl-av ${isBlocked(p.id) ? '' : frameCls(p.frame)}">${c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM}</span>`; };
const nm = (p) => (isBlocked(p.id) ? esc(shownName(p.id, p.pseudo)) : withPlate(p.plate, esc(p.pseudo || t('Joueur'))));
const mini = (cat, x, cls = '') => { const c = cat.get(x?.id); if (!c) return ''; const fin = x.variant && x.variant !== 'normal';
  return `<span class="hl-card ${cls} ${fin ? 'fin' : ''}" style="--rc:${RARITY[c.rarity]?.color || '#999'}"><img alt="" src="${artUrl(c, { lite: true })}"><em>${fmt(x.pts)}</em></span>`; };

// Tuile de l'écran du Choc (aperçu de la plus belle table d'hier)
export function hallTileHTML(cat) {
  const h = sim || cache, top = h?.tables?.[0];
  const sub = !h ? t('Chargement…') : h.error ? t('Les plus belles parties d’hier') : top ? t('Plus belle table d’hier : <b>{n} points</b>', { n: fmt(top.sum) }) : t('Personne n’a joué hier : à toi d’écrire la légende d’aujourd’hui.');
  return `<section class="panel kc-hall" data-mp="hall" role="button" tabindex="0" aria-label="${t('Le Panthéon d’hier')}">
    <img class="kc-hall-ic" alt="" src="assets/icons/crown2.webp">
    <span class="kc-hall-t"><b>${t('Le Panthéon d’hier')}</b><small>${sub}</small></span>
    ${top ? `<span class="kc-hall-avs">${av(cat, top.a)}${av(cat, top.b)}</span>` : ''}</section>`;
}

function tableHTML(cat, m, i) {
  const side = (p, w) => `<div class="hl-side ${m.winner === w ? 'win' : m.winner === 'draw' ? 'tie' : 'lose'}"${profileAttrs(p.id)}>
      ${av(cat, p)}<span class="hl-nm">${nm(p)}${!isBlocked(p.id) ? cloud.badgeHTML(p.badge) : ''}</span>
      <b class="hl-tot">${fmt(p.total)}</b>${m.winner === w ? `<span class="hl-crown">${t('rafle la table')}</span>` : ''}
      <span class="hl-best">${(p.best || []).map((x) => mini(cat, x)).join('')}</span></div>`;
  return `<li class="hl-table r${i + 1}" style="--mc:${MEDAL[i]}"><div class="hl-rank">${medal(i)}<small>${t('{n} points sur la table', { n: fmt(m.sum) })}${m.kind === 'mystere' ? ` · ${t('Dimanche mystère')}` : m.kind === 'premium' || m.types?.[2] === 'premium' ? ` · ${t('Samedi premium')}` : ''}</small></div>
    <div class="hl-duel">${side(m.a, 'a')}<span class="hl-vs"><img alt="" src="assets/versus/vd-vs.webp"></span>${side(m.b, 'b')}</div>
    ${m.packs ? `<button class="hl-replay" data-hreplay="${i}" translate="no"><span class="hl-rp-ic">${PIMG('assets/choc/revoir.webp', 'hl-rp-img')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span><span class="hl-rp-t"><b>Revoir la partie</b><small>Partie simulée · Mode Créateur</small></span></button>` : ''}
    <p class="hl-res small">${m.winner === 'draw' ? t('Égalité : chacun a gardé ses cartes.') : t('{name} est reparti avec {n} cartes.', { name: `<b>${esc(shownName((m.winner === 'a' ? m.a : m.b).id, (m.winner === 'a' ? m.a : m.b).pseudo))}</b>`, n: 18 })}</p></li>`;
}
function cardHTML(cat, x, i) {
  const c = cat.get(x.card?.id); if (!c) return '';
  const fin = x.card.variant && x.card.variant !== 'normal' ? FIN[x.card.variant] : null;
  return `<li class="hl-pull r${i + 1}" style="--mc:${MEDAL[i]};--rc:${RARITY[c.rarity]?.color || '#999'}">
    ${medal(i)}
    <span class="hl-big ${fin ? 'fin' : ''}"><img alt="" src="${artUrl(c, { lite: true })}"></span>
    <span class="hl-pt"><b>${esc(tw(c.name))}</b><small><i style="color:var(--rc)">${t(RARITY[c.rarity]?.name || c.rarity)}</i>${fin ? ` · ${t(fin)}` : ''} · ${fmt(x.card.pts)} ${t('points')}</small>
      <span class="hl-by"${profileAttrs(x.player.id)}>${av(cat, x.player)}<span>${t('tirée par')} <b>${nm(x.player)}</b>${x.won ? `<em>${t('a raflé la table')}</em>` : ''}</span></span></span></li>`;
}

export async function openHall(app) {
  const cat = app.catalog;
  const sh = openSheet(`<div class="hl">${BG()}<div class="hl-head"><img alt="" src="assets/icons/crown2.webp"><h2>${t('Le Panthéon d’hier')}</h2><p class="small muted">${t('Chargement…')}</p></div></div>`, { label: t('Le Panthéon d’hier'), full: true, cls: 'hl-sheet' });
  const h = await loadHall();
  if (!sh.body.isConnected) return;
  const head = `<div class="hl-head"><span class="hl-art">${PIMG('assets/choc/pantheon-titre.webp', 'hl-head-art')}<img class="hl-crown-ic" alt="" src="assets/icons/crown2.webp"></span><h2>${t('Le Panthéon d’hier')}</h2>
    <p class="small muted">${h.day ? `${esc(dayLabel(h.day))} · ` : ''}${t(h.games > 1 ? '{n} parties jouées' : '{n} partie jouée', { n: fmt(h.games || 0) })}</p></div>`;
  if (h.error) { sh.body.innerHTML = `<div class="hl">${BG()}${head}<p class="panel small center">${/function|choc_hall|schema/i.test(h.error) ? t('Le Panthéon n’est pas encore ouvert sur le serveur.') : esc(h.error)}</p></div>`; return; }
  if (!h.tables.length) { sh.body.innerHTML = `<div class="hl">${BG()}${head}<p class="panel center hl-empty">${t('Personne n’a joué hier : à toi d’écrire la légende d’aujourd’hui.')}</p></div>`; return; }
  sh.body.innerHTML = `<div class="hl">${BG()}${head}${h.sim ? '<p class="panel small center" translate="no">Panthéon simulé (Mode Créateur) : ces joueurs et ces parties sont inventés.</p>' : ''}
    <h3 class="hl-sec"><span>${t('Les plus belles tables')}</span></h3><p class="small muted hl-why">${t('Les parties où les boosters ont donné le plus de points, les deux joueurs réunis.')}</p>
    <ol class="hl-list">${h.tables.map((m, i) => tableHTML(cat, m, i)).join('')}</ol>
    <h3 class="hl-sec"><span>${t('Les plus beaux tirages')}</span></h3><p class="small muted hl-why">${t('Les meilleures cartes sorties d’un booster du Choc hier.')}</p>
    <ol class="hl-list">${h.cards.map((x, i) => cardHTML(cat, x, i)).join('')}</ol>
    <p class="small muted center">${t('Chaque matin, le Panthéon montre les exploits de la veille. Touche un joueur pour voir son profil.')}</p></div>`;
  if (h.sim) sh.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hreplay]'); if (!b) return;
    e.stopPropagation();
    const m = h.tables[+b.dataset.hreplay]; if (!m) return;
    const sum = (p) => p.flat().reduce((n, c) => n + c.pts, 0);
    playDuel(app, { my_cards: m.packs.a.flat(), their_cards: m.packs.b.flat(), lineup: m.lineup, avatar: m.b.avatar, my_score: sum(m.packs.a), their_score: sum(m.packs.b) }, null,
      { foeName: m.b.pseudo, myName: m.a.pseudo, myAvatar: m.a.avatar, table: true, train: true, replay: true });
  }, true);
}
