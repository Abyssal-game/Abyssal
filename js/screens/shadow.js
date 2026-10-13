// Tirage des Ombres : un booster gratuit par jour, tiré par le serveur. Les cartes ne sont pas gagnées :
// seule compte leur valeur. Classement de la semaine, coffres pour les 3 premiers.
import { FACTION_ORDER, SHADOW, LUCK_POINTS } from '../config.js';
import { CHESTS } from '../core/descent.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, bindActions } from '../ui/dom.js';
import { chestSVG } from '../ui/chest.js';
import { openPack } from './opening.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';

// Jour et semaine à l'heure de Paris (comme le serveur)
export const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (day, n) => { const t = new Date(`${day}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const weekOf = (day) => { const t = new Date(`${day}T12:00:00Z`); return addDays(day, -((t.getUTCDay() + 6) % 7)); };
const MEDAL = ['#F2C14E', '#C9D1DE', '#C98A4E'];

// Prix de la semaine passée : demandé au serveur une fois par semaine (rien si déjà réclamé)
export async function claimShadowPrize(app) {
  const g = app.game;
  if (!cloud.isLoggedIn()) return null;
  const last = addDays(weekOf(parisDay()), -7);
  const sh = g.shadowState();
  if (sh.prizes[last] !== undefined || sh.asked === last) return null;
  try {
    const rank = await cloud.shadowClaim(last);
    sh.asked = last; g.persist();
    if (!rank) return null;
    const chest = g.shadowPrize(last, rank);
    if (chest) { app.sfx.achievement?.(); toast(`Tirage des Ombres : tu as fini <b>${rank === 1 ? '1er' : `${rank}e`}</b> la semaine dernière ! <b>${esc(CHESTS[chest].name)}</b> ajouté à tes coffres.`, { kind: 'epic', icon: 'crown', ms: 5000 }); app.chrome?.(); }
    return chest;
  } catch (e) { return null; }
}

export default function shadowScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.shadow ||= { faction: null });
  let mine = null, day = parisDay(), loading = true, err = null, busy = false;

  const row = (r, i, val, sub) => {
    const av = r.profiles?.avatar || r.avatar, c = av && cat.get(av), me = r.user_id === cloud.currentUser()?.id;
    return `<div class="lb-row ${me ? 'me' : ''}"><span class="lb-rank" ${i < 3 ? `style="color:${MEDAL[i]}"` : ''}>${i + 1}</span><span class="lb-av">${c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b>${esc(r.profiles?.pseudo || r.pseudo || '?')}${cloud.badgeHTML(r.profiles?.badge || r.badge)}</b><span class="small muted">${sub}</span></span><span class="lb-floor">${fmt(val)}</span></div>`;
  };

  function draw() {
    const logged = cloud.isLoggedIn();
    root.innerHTML = `<header class="screen-head ui-hero bn-shadow"><h1>Le Tirage des Ombres</h1><p class="muted">Un booster gratuit par jour. Tu ne gardes pas les cartes : seule leur valeur compte pour le classement de la semaine.</p></header>
      <section class="panel sh-prizes"><h2 class="section-title">Prix de la semaine</h2>
        <div class="sh-pz">${SHADOW.prizes.map((k, i) => `<span class="sh-p" style="--mc:${MEDAL[i]}">${chestSVG(k)}<b>${i + 1}${i ? 'e' : 'er'}</b><small>${esc(CHESTS[k].name)}</small></span>`).join('')}</div>
        <p class="small muted">Classement du lundi au dimanche : tes tirages s’additionnent. Les coffres sont donnés s’il y a au moins ${SHADOW.minPlayers} participants, et arrivent le lundi suivant quand tu ouvres le jeu. Chaque tirage rapporte aussi <b>${SHADOW.participation} éclats</b>.</p>
      </section>
      ${!logged ? `<section class="panel center"><p>Le Tirage se joue en ligne : connecte-toi pour participer.</p><a class="btn primary block" href="#/compte">${icon('user')}Se connecter</a></section>`
        : loading ? '<p class="muted center">Chargement…</p>'
        : err ? `<p class="panel small center">${esc(err)}</p>`
        : mine ? mineHTML() : pickHTML()}
      ${logged ? `<details class="panel dc-fold" id="shw" open><summary><span class="dc-sum-t">Classement de la semaine</span></summary><div class="lb-body small muted">Chargement…</div></details>
      <details class="panel dc-fold" id="shd"><summary><span class="dc-sum-t">Meilleurs tirages du jour</span></summary><div class="lb-body small muted">Chargement…</div></details>` : ''}
      <a class="btn ghost block" href="#/boutique">${icon('back')}Retour aux boosters</a>`;
    if (logged && !loading) { loadWeek(); root.querySelector('#shd')?.addEventListener('toggle', (e) => { if (e.target.open) loadDay(); }, { once: true }); }
  }
  function pickHTML() {
    return `<section class="panel sh-pick"><h2 class="section-title">Ton tirage du jour</h2>
      <p class="small">Choisis d’abord une faction : ses cartes vaudront <b>le double</b>. Valeur : Commune ${LUCK_POINTS.C}, Peu commune ${LUCK_POINTS.PC}, Rare ${LUCK_POINTS.R}, Hyper rare ${LUCK_POINTS.HR}, Mythique ${LUCK_POINTS.M}, Secrète ${LUCK_POINTS.S}, +${LUCK_POINTS.variant} par finition.</p>
      <div class="chips fac-grid sh-fac" role="radiogroup" aria-label="Faction double">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${ui.faction === f}" aria-checked="${ui.faction === f}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="draw" ${ui.faction && !busy ? '' : 'disabled'}>${icon('p:shadow')}${ui.faction ? 'Ouvrir le booster des Ombres' : 'Choisis une faction'}</button>
    </section>`;
  }
  function mineHTML() {
    return `<section class="panel sh-mine"><h2 class="section-title">Ton tirage du jour</h2>
      <p class="sh-score"><b>${fmt(mine.score)}</b> points <span class="small muted">· faction ${esc(cat.faction[mine.faction]?.name || '')} ×2</span></p>
      <div class="sh-cards">${mine.cards.map((c) => { const k = cat.get(c.id); return k ? `<span class="sh-c v-${c.variant}"><img alt="${esc(k.name)}" src="${artUrl(k, { lite: true })}"><small>+${c.pts}</small></span>` : ''; }).join('')}</div>
      <p class="small muted">Prochain tirage demain. Reviens chaque jour : chaque tirage s’ajoute à ton total de la semaine.</p>
    </section>`;
  }
  async function loadWeek() {
    const box = root.querySelector('#shw .lb-body');
    if (!box) return;
    try {
      const rows = await cloud.shadowWeek(weekOf(day), 10);
      if (!root.contains(box)) return;
      const n = rows[0]?.participants || 0;
      box.classList.remove('muted');
      box.innerHTML = (rows.length ? rows.map((r, i) => row(r, i, r.total, `${r.days} tirage${r.days > 1 ? 's' : ''}`)).join('') : '<p class="small muted">Personne n’a encore tiré cette semaine. À toi !</p>')
        + `<p class="small muted">${n} participant${n > 1 ? 's' : ''} cette semaine${n < SHADOW.minPlayers ? ` : il en faut ${SHADOW.minPlayers} pour que les coffres soient donnés.` : '.'}</p>`
        + (!sync.profile?.pseudo ? '<p class="small acc-warn"><a href="#/compte">Choisis un pseudo</a> pour apparaître au classement.</p>' : '');
    } catch (e) { if (root.contains(box)) box.textContent = e.status === 404 ? 'Le Tirage des Ombres n’est pas encore activé sur le serveur.' : e.message; }
  }
  async function loadDay() {
    const box = root.querySelector('#shd .lb-body');
    if (!box) return;
    try {
      const rows = await cloud.shadowDay(day, 10);
      if (!root.contains(box)) return;
      box.classList.remove('muted');
      box.innerHTML = rows.length ? rows.map((r, i) => row(r, i, r.score, `faction ${esc(cat.faction[r.faction]?.name || '')}`)).join('') : '<p class="small muted">Aucun tirage aujourd’hui pour l’instant.</p>';
    } catch (e) { if (root.contains(box)) box.textContent = e.message; }
  }
  async function load() {
    day = parisDay();
    if (!cloud.isLoggedIn()) { loading = false; return draw(); }
    try { mine = await cloud.shadowMine(day); err = null; }
    catch (e) { err = e.status === 404 ? 'Le Tirage des Ombres n’est pas encore activé sur le serveur.' : e.message; }
    loading = false;
    draw();
    claimShadowPrize(app);
  }
  async function doDraw() {
    if (busy || !ui.faction) return;
    busy = true; draw();
    let res;
    try { res = await cloud.shadowDraw(ui.faction); }
    catch (e) { busy = false; app.sfx.error(); toast(esc(e.status === 404 ? 'Le Tirage des Ombres n’est pas encore activé sur le serveur.' : e.message), { kind: 'error' }); return load(); }
    busy = false;
    const cards = (res.cards || []).filter((c) => cat.get(c.id));
    mine = { cards, score: res.score, faction: ui.faction, day: res.day };
    const shards = g.shadowPay(res.day);
    app.chrome?.();
    openPack(app, 'standard', { title: 'Booster des Ombres', packKey: 'shadow', preset: { cards, score: res.score, rewards: { shards, xp: 0 } }, onDone: () => draw() });
    draw();
  }
  bindActions(root, {
    fac(el) { ui.faction = el.dataset.v; app.sfx.tap(); draw(); },
    draw() { doDraw(); },
  });
  draw();
  load();
}
