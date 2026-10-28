// v881 : parrainage (demande du propriétaire du 28 octobre 2026). Ton code = ton pseudo. Un nouveau joueur l'entre dans ses
// 7 premiers jours ; quand il a joué 3 jours différents (dans les 14 jours) et vaincu le premier gardien, le serveur valide :
// il reçoit son cadeau, toi le palier suivant (10 au plus). Serveur : supabase/21-parrainage.sql, serveur/partie.mjs.
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { serverMode } from '../cloud/partie.js';
import { REFERRAL } from '../config.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, paint } from '../ui/dom.js';
import { t, tw } from '../i18n.js';
import { isNative } from '../native.js';
import { linkParrain } from '../ui/parrain.js';

const SITE = 'https://abyssal-game.fr';
const plural = (n, one, many) => (n > 1 ? `${n} ${many}` : `${n} ${one}`);
// une récompense, ligne par ligne
export function rewardLines(r) {
  const out = [], tk = r.tickets || {};
  if (r.frame) out.push('Cadre de profil exclusif');
  if (r.back) out.push('Dos de carte vivant exclusif');
  if (r.title) out.push(t('Titre « {name} »', { name: esc(tw(r.title)) }));
  if (tk.standard) out.push(plural(tk.standard, 'booster standard', 'boosters standard'));
  if (tk.premium) out.push(plural(tk.premium, 'booster premium', 'boosters premium'));
  if (tk.event) out.push(plural(tk.event, 'Booster des Alliances', 'Boosters des Alliances'));
  if (tk.faction) out.push(plural(tk.faction, 'booster de faction au choix', 'boosters de faction au choix'));
  if (r.shards) out.push(`${fmt(r.shards)} éclats`);
  if (r.ash) out.push(`${fmt(r.ash)} cendres`);
  return out;
}
/* v882 : aperçu du cadre (5e) et du dos vivant (10e) */
const peekHTML = (r) => (r.frame ? `<span class="prn-peek avatar-mini pf pf-${r.frame}">${EMBLEM}</span>` : r.back ? `<img class="prn-peek prn-back" alt="" loading="lazy" src="assets/backs/${r.back}.webp">` : '');
const gainHTML = (r) => `<div class="prn-gain">${rewardLines(r).map((x) => `<p>${x}</p>`).join('')}</div>${peekHTML(r)}`;

function stateLine(k) {
  if (k.state === 'ok') return k.rank && k.rank <= REFERRAL.max ? t('Validé · palier {n}', { n: k.rank }) : 'Validé';
  if (k.state === 'expired') return 'Délai de 14 jours dépassé';
  if (k.state === 'device') return 'Même téléphone que son parrain : non valable';
  return `${Math.min(k.days || 0, REFERRAL.needDays)} / ${REFERRAL.needDays} jours de jeu · ${k.boss ? 'premier gardien vaincu' : 'premier gardien à vaincre'}`;
}

export default function parrainage(app, root) {
  const g = app.game;
  let alive = true, data = null, err = null, busy = false;
  const me = () => sync.profile?.pseudo || null;

  function draw() {
    const paid = new Set(g.s.parrain?.paid || []), nextRank = Array.from({ length: REFERRAL.max }, (_, i) => i + 1).find((k) => !paid.has(k));
    const kids = data?.kids || [], mine = data?.mine || null;
    const born = data?.born ? new Date(data.born).getTime() : 0, canLink = !mine && born && Date.now() - born < REFERRAL.linkDays * 864e5;
    const code = me();
    paint(root, `
      <header class="screen-head ui-hero bn-amis"><h1>Parrainage</h1><p class="muted">Invite tes proches dans l’Abîme : quand ils s’y installent, vous êtes récompensés tous les deux.</p></header>
      ${!cloud.isLoggedIn() || !serverMode() ? `<p class="panel small center">${icon('info')} Le parrainage demande une connexion au serveur. Reviens dans un instant.</p>` : ''}
      <section class="panel ornate stack prn-code">
        ${code ? `<p class="small muted center">Ton code de parrainage</p><p class="prn-big notranslate">${esc(code)}</p>
          <button class="btn primary block" data-prn="share">${icon('upload')}Inviter un ami</button>`
          : `<p class="center">Choisis d’abord ton pseudo : c’est ton code de parrainage.</p><button class="btn primary block" data-prn="pseudo">Choisir mon pseudo</button>`}
        <p class="small muted center">${t('Parrainages validés : {n} sur {max}', { n: paid.size, max: REFERRAL.max })}</p>
      </section>
      ${mine ? `<section class="panel stack prn-mine"><h2 class="section-title">${t('Ton parrain : {name}', { name: `<b class="notranslate">${esc(mine.parrain || '?')}</b>` })}</h2>
          <p class="small">${stateLine(mine)}</p>
          ${mine.state === 'wait' ? '<p class="small muted">Joue 3 jours différents et bats le premier gardien (étage 5) : vous serez récompensés tous les deux.</p>' : ''}
          ${mine.state === 'ok' || mine.state === 'wait' ? `<p class="small muted">${mine.state === 'ok' ? 'Ton cadeau, reçu :' : 'Ton cadeau :'}</p>${gainHTML(REFERRAL.gift)}` : ''}</section>`
        : canLink ? `<section class="panel stack prn-link"><h2 class="section-title">Un ami t’a invité ?</h2>
          <p class="small muted">Entre son pseudo (dans les 7 premiers jours de ton compte). Tu recevras :</p>${gainHTML(REFERRAL.gift)}
          <form class="row gap" id="prn-form"><input class="input plain" name="code" maxlength="16" minlength="3" placeholder="Pseudo de ton parrain" autocomplete="off" required><button class="btn primary" type="submit">Valider</button></form></section>` : ''}
      <section class="panel stack prn-how"><h2 class="section-title">Comment ça marche</h2>
        <p class="small"><b>1.</b> Ton ami entre ton pseudo en créant son compte, ou ici dans ses 7 premiers jours.</p>
        <p class="small"><b>2.</b> Il joue 3 jours différents dans les 14 jours, et bat le premier gardien.</p>
        <p class="small"><b>3.</b> Il reçoit son cadeau de bienvenue, et toi le palier suivant. Plus tu parraines, plus c’est beau, jusqu’au dixième.</p>
        <p class="small muted">Un ami qui joue sur ton téléphone ne compte pas.</p></section>
      <h2 class="section-title">Tes récompenses</h2>
      <ol class="prn-ladder">${REFERRAL.ladder.map((r, i) => { const k = i + 1, got = paid.has(k); return `<li class="panel prn-step${got ? ' got' : ''}${k === nextRank ? ' next' : ''}${r.frame || r.back ? ' big' : ''}"><span class="prn-n">${k}</span>${gainHTML(r)}<span class="prn-st">${got ? icon('check') : k === nextRank ? '<small>Prochain</small>' : icon('lock')}</span></li>`; }).join('')}</ol>
      <h2 class="section-title">Tes filleuls${kids.length ? ` <span class="pill-n">${kids.length}</span>` : ''}</h2>
      ${err ? `<p class="panel small center">${icon('info')} ${esc(err)}</p>` : !data ? '<p class="small muted center">Chargement…</p>'
        : kids.length ? kids.map((k) => `<div class="panel prn-kid ${esc(k.state)}"><b class="notranslate">${esc(k.pseudo || t('Compte supprimé'))}</b><small>${stateLine(k)}</small></div>`).join('')
        : '<p class="small muted center">Personne pour l’instant. Partage ton code !</p>'}`);
  }

  async function load() {
    try { await app.partie?.flush?.({ par: true }); } catch (e) { /* hors ligne : on montre ce qu'on a */ }
    try { data = await cloud.parrainList(); err = null; }
    catch (e) { err = /parrain_list|Could not find|404/i.test(e.message || '') ? 'Le parrainage ouvre très bientôt.' : e.message; }
    if (alive) draw();
  }

  async function share() {
    const code = me(); if (!code) return;
    const text = t('Rejoins-moi dans ABYSSAL, le jeu de cartes dark fantasy ! En créant ton compte, entre mon code de parrainage {code} : nous serons récompensés tous les deux. {url}', { code, url: SITE });
    const cap = window.Capacitor?.Plugins;
    try {
      if (isNative() && cap?.Share) { await cap.Share.share({ title: 'ABYSSAL', text }); return; }
      if (navigator.share) { await navigator.share({ title: 'ABYSSAL', text }); return; }
    } catch (e) { if (/cancel|abort/i.test(String(e?.name || e?.message || e))) return; }
    try { await navigator.clipboard.writeText(text); toast('Invitation copiée : colle-la dans un message.', { kind: 'success', icon: 'copy' }); }
    catch (e) { toast(t('Ton code de parrainage : {code}', { code: esc(code) }), { icon: 'user', ms: 6000 }); }
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-prn]'); if (!b) return;
    if (b.dataset.prn === 'share') share();
    if (b.dataset.prn === 'pseudo') (await import('./account.js')).askPseudo(app);
  });
  root.addEventListener('submit', async (e) => {
    if (e.target.id !== 'prn-form') return;
    e.preventDefault(); if (busy) return;
    const v = String(new FormData(e.target).get('code') || '').trim(); if (!v) return;
    busy = true;
    if (await linkParrain(app, v)) { data = null; draw(); await load(); }
    busy = false;
  });
  draw(); load();
  app.refreshView = () => { if (alive) draw(); };
  return () => { alive = false; app.refreshView = null; };
}
