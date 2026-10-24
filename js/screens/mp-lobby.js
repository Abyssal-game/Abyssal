// v523 : accueil « Contre un joueur » commun aux mini-jeux en ligne (Duels des Sceaux, Pacte…), tiré de sceaux-mp.js (v519-v522).
// Le serveur tient les parties (supabase/09-multijoueur.sql). Ce module gère la liste des parties, la recherche rapide,
// les défis aux amis, les résultats encaissés une fois, le classement du mois et la relecture de la partie ouverte ;
// chaque jeu fournit son écran de partie (spec.drawGame) et ses actions (spec.click).
//
// spec : { game, modeBar(), intro() (HTML sous « Nouvelle partie »), note (texte d'explication), create(pace, to) → id,
//   join(id), sub(v) (ligne d'une partie en cours), score(v) (score final), moveKey(v) (change à chaque coup),
//   drawGame(v, ctx, last), updated?(prev, v, ctx) (l'adversaire a joué), click?(k, b, ctx),
//   friendsOnly (v525 : seulement des défis entre amis, sans récompense ni classement : un bilan par ami à la place) }
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { MP_HOURS, MP_FAST_SECS, MP_REWARD } from '../core/mp.js';
import { isBlocked } from '../core/moderation.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, toast, confirmBox, openSheet, withPending } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { checkTurns } from '../cloud/mpwatch.js';
import { profileAttrs } from '../ui/report.js';
import { t } from '../i18n.js';
import { withPlate, frameCls, emoteHTML, showEmote } from '../ui/vitrine.js'; /* v564 */
const BUBBLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="12" cy="10.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.2" fill="currentColor"/></svg>';

export const MP_OFF = 'Les parties contre d’autres joueurs ne sont pas encore ouvertes sur le serveur.';
export const MP_RES = { win: 'Victoire', lose: 'Défaite', draw: 'Égalité' };

export function createMpLobby(app, root, spec) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state[`mp_${spec.game}`] ||= { open: null, sel: null });
  let clock = 0, list = null, err = null, busy = false, poll = 0, view = null, skew = 0, alive = true, friends = null, gen = 0;
  const avatar = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const foeName = (v) => (!v.foe ? '…' : isBlocked(v.foe.id) ? 'Joueur masqué' : v.foe.pseudo || 'Joueur');
  const msLeft = (v) => new Date(v.deadline).getTime() - (Date.now() + skew) - (v.pace === 'fast' ? 3000 : 0); /* 3 s de marge réseau côté serveur */
  const left = (v) => {
    const ms = msLeft(v);
    if (ms <= 0) return 'temps écoulé';
    if (v.pace === 'fast') return `${Math.ceil(ms / 1000)} s`;
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  };
  const myTurn = (v) => v.status === 'playing' && (v.turn === v.me || v.turn === 'ab'); /* v525 : 'ab' = les deux jouent en même temps (Enchères) */
  const resOf = (v) => (v.winner === 'draw' ? 'draw' : v.winner === v.me ? 'win' : 'lose');
  const errMsg = (e) => (e.status === 404 ? MP_OFF : e.message);
  function stopPoll() { clearTimeout(poll); poll = 0; clearInterval(clock); clock = 0; }
  function schedule(fn, ms) { clearTimeout(poll); poll = setTimeout(() => { if (alive && document.visibilityState === 'visible') fn(); else schedule(fn, ms); }, ms); } /* v574 : ne coupe plus le compte à rebours (il restait figé) */

  // ——— Accueil « Contre un joueur » ———
  async function lobby() {
    ui.open = null; view = null; clearInterval(clock); clock = 0; /* v574 */
    document.body.classList.remove('battle-mode');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) {
      root.innerHTML = `${spec.modeBar()}<section class="panel stack center"><p>Choisis d’abord ton pseudo : c’est lui que verront tes adversaires.</p><a class="btn primary block" href="#/compte">${icon('user')}Choisir mon pseudo</a></section>`; /* v528 : compte obligatoire, seul le pseudo peut manquer */
      return;
    }
    drawLobby();
    try { list = await cloud.mpList(spec.game); err = null; } catch (e) { err = errMsg(e); list = list || []; }
    if (!alive || ui.open) return;
    if (list[0]?.now) skew = new Date(list[0].now).getTime() - Date.now();
    // v522 : partie rapide trouvée pendant la recherche : on y va tout de suite
    const found = list.find((v) => v.pace === 'fast' && v.status === 'playing' && ui.searching === v.id);
    if (found) { ui.searching = null; toast(t('Adversaire trouvé : <b>{name}</b> !', { name: esc(foeName(found)) }), { icon: 'user' }); app.sfx.achievement?.(); return open(found.id); }
    const searching = list.find((v) => v.pace === 'fast' && v.status === 'waiting' && v.me === 'a');
    ui.searching = searching?.id || null; ui.searchingV = searching || null;
    await claimAll();
    if (!alive || ui.open) return; /* v527 : une partie ouverte pendant l'encaissement reste ouverte */
    checkTurns(app, { force: true });
    drawLobby();
    schedule(lobby, ui.searching ? 3000 : 20000);
  }
  // résultats des parties terminées : récompense encaissée une seule fois
  async function claimAll() {
    for (const v of (list || []).filter((x) => x.status === 'done' && !x.claimed)) {
      try {
        const { r, out } = await app.partie.first('mpClaim', spec.game, v.id, !!spec.friendsOnly); /* v539 : encaissé par le serveur de partie */
        v.claimed = true;
        if (out) toast(`${t(r === 'win' ? 'Victoire contre <b>{name}</b>' : r === 'lose' ? 'Défaite contre <b>{name}</b>' : 'Égalité contre <b>{name}</b>', { name: esc(foeName(v)) })}${v.reason === 'timeout' ? ` (${t('temps écoulé')})` : v.reason === 'resign' ? ` (${t('abandon')})` : ''}${out.shards ? ` · +${out.shards} ${t('éclats')}` : ''}`, { icon: r === 'win' ? 'crown' : 'info' });
      } catch (e) { /* on réessaiera */ }
    }
    app.chrome?.();
  }
  // recherche rapide, deux vitesses, défi à un ami et récompense (pas pour les jeux entre amis seulement)
  const quickHTML = (waiting, paidLeft) => `        ${ui.searching ? `<div class="mp-search"><span class="mp-spin"></span><span><b>${ui.searchingV?.public === false ? t('En attente de {name}…', { name: esc(foeName(ui.searchingV)) }) : 'Recherche d’un adversaire…'}</b><small>Partie rapide · reste sur cet écran, la partie démarre dès qu’un joueur arrive.</small></span><button class="btn small ghost" data-mp="leave" data-own="1" data-id="${esc(ui.searching)}">Annuler</button></div>` : ''}
        <div class="mp-paces">
          <button class="mp-pace fast" data-mp="quick" data-pace="fast" ${busy || ui.searching ? 'disabled' : ''}><img class="mp-pace-ic" alt="" src="assets/icons/mp-rapide.webp"><b>Partie rapide</b><span class="mp-pace-t">${MP_FAST_SECS} s par coup</span><small>Les deux joueurs connectés en même temps. Une partie dure quelques minutes.</small></button>
          <button class="mp-pace slow" data-mp="quick" data-pace="slow" ${busy || waiting.some((v) => v.public && v.pace !== 'fast') ? 'disabled' : ''}><img class="mp-pace-ic" alt="" src="assets/icons/mp-lente.webp"><b>Partie lente</b><span class="mp-pace-t">${MP_HOURS} h par coup</span><small>${waiting.some((v) => v.public && v.pace !== 'fast') ? 'Recherche en cours : la partie commence dès qu’un joueur arrive.' : 'Chacun joue quand il veut. Tu es prévenu quand c’est ton tour.'}</small></button>
        </div>
        <button class="btn block dc-plq dc-plq-dark" data-mp="friend" ${busy ? 'disabled' : ''}>${icon('user')}Défier un ami</button>
        <p class="small muted center">Victoire : +${MP_REWARD.win} éclats (${Math.max(0, paidLeft)} victoire${paidLeft > 1 ? 's' : ''} payée${paidLeft > 1 ? 's' : ''} restante${paidLeft > 1 ? 's' : ''} aujourd’hui) et une place au classement du mois.</p>`;
  function drawLobby() {
    const L = list || [];
    const mine = L.filter((v) => myTurn(v)), theirs = L.filter((v) => v.status === 'playing' && !myTurn(v));
    const invites = L.filter((v) => v.status === 'waiting' && v.me === 'b'), waiting = L.filter((v) => v.status === 'waiting' && v.me === 'a');
    const done = L.filter((v) => v.status === 'done').slice(0, 8);
    const st = g.s.mp[spec.game] || { wins: 0, losses: 0, draws: 0 };
    const paidLeft = MP_REWARD.paidPerDay - (g.s.mp.day === dayKey() ? g.s.mp.paid : 0);
    const row = (v, sub, acts) => `<div class="mp-row ${myTurn(v) ? 'hot' : ''}" ${v.status !== 'waiting' ? `data-mp="open" data-id="${esc(v.id)}" role="button" tabindex="0"` : ''}><span class="fr-av"${v.foe ? profileAttrs(v.foe.id) : ''}>${v.foe ? avatar(v.foe.avatar) : EMBLEM}</span><span class="fr-t"><b>${esc(v.foe ? foeName(v) : 'Un joueur au hasard')}<i class="mp-tag ${v.pace === 'fast' ? 'fast' : ''}">${v.pace === 'fast' ? 'Rapide' : 'Lente'}</i></b><small>${sub}</small></span>${acts || icon('next')}</div>`;
    root.innerHTML = `${spec.modeBar()}
      ${err ? `<p class="panel small center">${icon('info')} ${esc(err)}</p>` : ''}
      ${mine.length ? `<section class="panel mp-sec hot"><h2 class="section-title">À toi de jouer <span class="pill-n">${mine.length}</span></h2>${mine.map((v) => row(v, `${spec.sub(v)} · il te reste <b>${left(v)}</b>`)).join('')}</section>` : ''}
      ${invites.length ? `<section class="panel mp-sec"><h2 class="section-title">Défis reçus</h2>${invites.map((v) => row(v, 'Ton ami te défie', `<span class="vs-acts"><button class="btn small primary" data-mp="join" data-id="${esc(v.id)}">Accepter</button><button class="btn small ghost" data-mp="leave" data-id="${esc(v.id)}">Refuser</button></span>`)).join('')}</section>` : ''}
      <section class="panel mp-sec mp-new"><h2 class="section-title">Nouvelle partie</h2>
        <p class="small">${spec.note}</p>
        ${spec.intro?.() || ''}
        ${spec.friendsOnly ? `<button class="btn primary block dc-plq dc-plq-red" data-mp="friend" ${busy ? 'disabled' : ''}>${icon('user')}Défier un ami</button>
        <p class="small muted center">Entre amis seulement : pas de récompense, juste ton bilan contre chacun.</p>` : quickHTML(waiting, paidLeft)}
      </section>
      ${theirs.length ? `<section class="panel mp-sec"><h2 class="section-title">Au tour de l’adversaire</h2>${theirs.map((v) => row(v, `${spec.sub(v)} · il lui reste ${left(v)}`)).join('')}</section>` : ''}
      ${waiting.some((v) => !(v.public && v.pace === 'fast')) ? `<section class="panel mp-sec"><h2 class="section-title">En attente</h2>${waiting.filter((v) => !(v.public && v.pace === 'fast')).map((v) => row(v, v.public ? 'Recherche d’un adversaire (jusqu’à 24 h)' : t('Défi envoyé à {name}', { name: esc(foeName(v)) }), `<button class="btn small ghost" data-mp="leave" data-own="1" data-id="${esc(v.id)}">Annuler</button>`)).join('')}</section>` : ''}
      ${done.length ? `<details class="panel dc-fold mp-sec"><summary><span class="dc-sum-t">Parties terminées</span></summary>${done.map((v) => { const r = resOf(v); const sc = spec.score(v); return row(v, `<b class="vs-res ${r}">${MP_RES[r]}</b>${sc ? ` · ${sc}` : ''}${v.reason === 'timeout' ? ' · temps écoulé' : v.reason === 'resign' ? ' · abandon' : ''}`); }).join('')}</details>` : ''}
      ${spec.friendsOnly ? '<section class="panel mp-sec" id="mp-rec"><h2 class="section-title">Ton bilan contre tes amis</h2><div class="lb-body small muted">Chargement…</div></section>'
        : `<details class="panel dc-fold mp-sec" id="mp-rank"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/crown2.webp"><span class="dc-sum-t">Classement du mois</span></summary><div class="lb-body small muted">Chargement…</div></details>
      <p class="small muted center">Contre les joueurs : ${st.wins} victoire${st.wins > 1 ? 's' : ''} · ${st.losses} défaite${st.losses > 1 ? 's' : ''}</p>`}`;
    root.querySelector('#mp-rank')?.addEventListener('toggle', (e) => { if (e.target.open) ranking(); }, { once: true });
    if (spec.friendsOnly) record();
  }
  const dayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  // v525 : bilan contre chaque ami (Cryptes)
  async function record() {
    const box = root.querySelector('#mp-rec .lb-body'); if (!box) return;
    try {
      const rows = (await cloud.mpFriendRecord(spec.game)) || [];
      if (!root.contains(box)) return;
      box.classList.remove('muted');
      box.innerHTML = rows.length ? rows.map((r) => `<div class="lb-row"${profileAttrs(r.foe)}><span class="lb-av">${avatar(r.avatar)}</span><span class="lb-name"><b>${esc(isBlocked(r.foe) ? 'Joueur masqué' : r.pseudo || 'Joueur')}</b><span class="small muted">${t(r.wins + r.losses + r.draws > 1 ? '{n} parties' : '{n} partie', { n: r.wins + r.losses + r.draws })}${r.draws ? ` · ${t(r.draws > 1 ? '{n} égalités' : '{n} égalité', { n: r.draws })}` : ''}</span></span><span class="mp-wl"><b class="w">${r.wins}</b><i>–</i><b class="l">${r.losses}</b></span></div>`).join('') : '<p class="small muted">Pas encore de partie terminée contre un ami.</p>';
    } catch (e) { box.textContent = errMsg(e); }
  }
  async function ranking() {
    const box = root.querySelector('#mp-rank .lb-body'); if (!box) return;
    try {
      const rows = (await cloud.mpRanking(spec.game, 20)) || [];
      const me = cloud.currentUser()?.id;
      box.classList.remove('muted');
      box.innerHTML = rows.length ? rows.map((r, i) => `<div class="lb-row ${r.user_id === me ? 'me' : ''}"${r.user_id === me ? '' : profileAttrs(r.user_id)}><span class="lb-rank">${i + 1}</span><span class="lb-av ${isBlocked(r.user_id) ? '' : frameCls(r.frame)}">${avatar(r.avatar)}</span><span class="lb-name"><b>${isBlocked(r.user_id) ? 'Joueur masqué' : withPlate(r.plate, esc(r.pseudo || 'Joueur'))}</b><span class="small muted">${r.games} partie${r.games > 1 ? 's' : ''}</span></span><span class="lb-floor">${r.wins}</span></div>`).join('') : '<p class="small muted">Pas encore de victoire ce mois-ci. À toi !</p>';
    } catch (e) { box.textContent = errMsg(e); }
  }

  // ——— Partie ———
  /* v612 : dernier état vu de chaque partie, gardé sur l'appareil : en rouvrant une partie où l'adversaire a joué
     pendant ton absence (partie lente, 12 h par coup), son coup est rejoué comme si tu l'avais regardé en direct */
  const SEEN_KEY = () => `abyssal.mpSeen.${cloud.currentUser()?.id || 'x'}`;
  const seenAll = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY()) || '{}') || {}; } catch (e) { return {}; } };
  function seenSave(v) {
    if (!v?.id || !v.state) return;
    try {
      const all = seenAll();
      if (v.status === 'playing') all[v.id] = { t: Date.now(), v }; else delete all[v.id];
      const keep = Object.entries(all).sort((a, b) => b[1].t - a[1].t).slice(0, 12);
      localStorage.setItem(SEEN_KEY(), JSON.stringify(Object.fromEntries(keep)));
    } catch (e) { /* stockage plein ou bloqué : pas de rejeu, rien de grave */ }
  }
  async function open(id) {
    ui.open = id; ui.sel = null;
    try { view = await withPending(cloud.mpGet(id)); } catch (e) { toast(esc(errMsg(e)), { kind: 'error' }); return lobby(); }
    if (!alive || ui.open !== id) return;
    if (!view) return lobby();
    if (view.now) skew = new Date(view.now).getTime() - Date.now();
    ui.foeEmote = view.emotes?.[view.me === 'a' ? 'b' : 'a']?.at || null; /* v564 : une réaction déjà passée ne se rejoue pas */
    const old = seenAll()[id]?.v;
    if (old && old.state && old.me === view.me && spec.moveKey(old) !== spec.moveKey(view) && spec.updated) {
      /* v612 : l'adversaire a joué depuis ta dernière visite : on repart de ce que tu avais vu, puis son coup est rejoué */
      const now = view;
      view = { ...old, status: 'playing', updated_at: now.updated_at, deadline: now.deadline, now: now.now };
      spec.drawGame(view, ctx, null);
      await new Promise((r) => setTimeout(r, 450));
      if (!alive || ui.open !== id) return;
      view = now;
      busy = true; try { await spec.updated(old, now, ctx); } catch (e) { /* rejeu impossible : on montre l'état final */ } finally { busy = false; }
      if (!alive || ui.open !== id) return;
      draw(now.state?.last);
    } else draw(view.state?.last?.who && view.state.last.who !== view.me ? view.state.last : null);
    watch();
  }
  // l'adversaire joue : on le relit (1 s en partie rapide, 2 s en lente jouée en direct, sinon 8 s) tant que ce n'est pas notre tour
  function watch() {
    clearInterval(clock); clock = 0;
    if (!alive) return;
    if (view?.status === 'playing' && view.pace === 'fast') {
      // v522 : partie rapide : compte à rebours à l'écran, l'adversaire regardé toutes les 1,5 s
      clock = setInterval(tick, 250); tick();
      if (myTurn(view) && view.turn !== 'ab' && !(ui.talk > Date.now())) return schedule(() => refresh(), Math.max(1500, msLeft(view) + 3500)); /* 'ab' : on suit aussi la mise de l'adversaire */
      return schedule(() => refresh(), 1000); /* v576 : 1,5 s → 1 s */
    }
    const talk = ui.talk > Date.now(); /* v564 : pendant un échange de réactions, on regarde toutes les 3 s */
    if (!view || view.status !== 'playing' || myTurn(view)) { stopPoll(); if (view?.status === 'playing' || (talk && view)) schedule(() => refresh(), talk ? 3000 : 30000); return; }
    /* v576 : partie lente jouée en direct (dernier coup il y a moins de 3 min) : l'adversaire est relu toutes les 2 s
       au lieu de 8 ; il revient à 8 s quand la partie s'endort */
    const live = view.updated_at && Date.now() + skew - new Date(view.updated_at).getTime() < 180000;
    schedule(() => refresh(), talk ? 3000 : live ? 2000 : 8000);
  }
  function tick() {
    const el = root.querySelector('.mp-clock'); if (!el || !view) return;
    const ms = Math.max(0, msLeft(view)), secs = Math.ceil(ms / 1000);
    el.querySelector('b').textContent = `${secs} s`;
    el.style.setProperty('--p', `${Math.min(1, ms / (MP_FAST_SECS * 1000)) * 100}%`);
    el.classList.toggle('low', secs <= 10);
    if (secs <= 5 && secs > 0 && myTurn(view) && el.dataset.s !== String(secs)) { el.dataset.s = String(secs); app.sfx.tap?.(); }
  }
  async function refresh() {
    if (!ui.open || busy) return watch();
    const g0 = gen;
    let v; try { v = await cloud.mpGet(ui.open); } catch (e) { return watch(); }
    if (!alive || !v || v.id !== ui.open) return;
    if (g0 !== gen) return watch(); /* v527 : un coup joué pendant la relecture : sa vue est plus récente */
    const prev = view;
    view = v;
    seeEmote(v);
    if (prev && spec.moveKey(prev) !== spec.moveKey(v) && spec.updated) { busy = true; try { await spec.updated(prev, v, ctx); } finally { busy = false; } if (!alive || ui.open !== v.id) return; }
    draw(prev && spec.moveKey(prev) !== spec.moveKey(v) ? v.state?.last : null);
    watch();
  }
  function draw(last = null) {
    if (!alive) return;
    if (!view) return lobby();
    spec.drawGame(view, ctx, last);
    seenSave(view);
    emoteBtn();
    if (view.status === 'done' && !view.claimed) claimOne(view);
  }
  async function claimOne(v) {
    try { const { r, out } = await app.partie.first('mpClaim', spec.game, v.id, !!spec.friendsOnly); v.claimed = true; if (out) { if (r === 'win') app.sfx.victory?.(); else app.sfx.defeat?.(); if (out.shards) toast(`+${out.shards} éclats`, { icon: 'crystal' }); app.chrome?.(); } } catch (e) { /* plus tard */ }
  }
  // Coup joué au serveur : la nouvelle vue remplace l'ancienne ; en cas d'erreur, la partie est relue
  async function act(fn, quiet = false) {
    if (busy) return null;
    busy = true; gen++;
    let v;
    try { v = await (quiet ? fn() : withPending(fn())); } catch (e) { app.sfx.error(); toast(esc(errMsg(e)), { kind: 'error' }); busy = false; refresh(); return null; }
    busy = false;
    if (!alive) return null; /* v527 : l'écran a été quitté pendant l'envoi */
    if (v) { view = v; seeEmote(v); seenSave(v); }
    return v;
  }
  // v564 : réactions en ligne
  function seeEmote(v) {
    const e = v?.emotes?.[v.me === 'a' ? 'b' : 'a'];
    if (!e?.at || e.at === ui.foeEmote) return;
    const fresh = ui.foeEmote !== undefined;
    ui.foeEmote = e.at;
    if (fresh && !g.s.settings.reMute && !isBlocked(v.foe?.id)) { showEmote(e.k, 'foe', foeName(v), app.sfx.sheet); ui.talk = Date.now() + 30000; }
  }
  const emoteOpen = (v) => v && (v.status === 'playing' || (v.status === 'done' && Date.now() + skew - new Date(v.updated_at).getTime() < 9 * 60000));
  function emoteBtn() {
    if (!emoteOpen(view) || root.querySelector('.re-btn')) return;
    const bar = root.querySelector('.mq-bar'), back = bar?.lastElementChild;
    if (back) { /* Pacte, Cryptes, Enchères : dans la barre du haut, à côté du retour (au milieu, il cacherait des cartes) */
      const box = document.createElement('span'); box.className = 're-barbox';
      back.replaceWith(box); box.insertAdjacentHTML('beforeend', `<button class="btn small ghost re-btn in-bar" data-mp="emote" aria-label="Réactions">${BUBBLE}</button>`); box.append(back);
      return;
    }
    root.insertAdjacentHTML('beforeend', `<button class="re-btn" data-mp="emote" aria-label="Réactions">${BUBBLE}</button>`);
  }
  function pickEmote() {
    const id = ui.open, mute = !!g.s.settings.reMute;
    const sh = openSheet(`<h2>Réactions</h2><p class="small muted">Ton adversaire la voit tout de suite.</p>
      <div class="re-grid">${g.emotesOwned().map((k) => `<button class="re-pick" data-re="${k}">${emoteHTML(k)}</button>`).join('')}</div>
      ${g.shopOn() ? '<p class="small muted">D’autres réactions t’attendent à l’Échoppe.</p>' : ''}
      <button class="btn ghost block small" data-re-mute>${mute ? 'Montrer les réactions de l’adversaire' : 'Masquer les réactions de l’adversaire'}</button>`, { cls: 'sheet-small', label: 'Réactions' });
    sh.body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-re-mute]')) { g.setSetting('reMute', !mute); sh.close(); toast(mute ? 'Réactions de l’adversaire visibles.' : 'Réactions de l’adversaire masquées.'); return; }
      const b = e.target.closest('[data-re]'); if (!b) return;
      sh.close();
      try { await cloud.mpEmote(id, b.dataset.re); showEmote(b.dataset.re, 'me', null, app.sfx.sheet); ui.talk = Date.now() + 30000; if (ui.open === id) watch(); }
      catch (err) { app.sfx.error?.(); toast(esc(err.status === 404 ? 'Les réactions ne sont pas encore ouvertes sur le serveur.' : errMsg(err)), { kind: 'error' }); }
    });
  }
  async function quick(pace = 'slow') {
    if (busy) return;
    busy = true;
    try {
      const id = await spec.create(pace, null);
      const v = await cloud.mpGet(id);
      busy = false;
      if (v?.status === 'playing') { toast(t('Adversaire trouvé : <b>{name}</b> !', { name: esc(foeName(v)) }), { icon: 'user' }); return open(id); }
      if (pace === 'fast') ui.searching = id;
      else toast('Recherche d’un adversaire : ta partie commencera dès qu’un joueur arrive. Reviens plus tard !', { icon: 'hourglass', ms: 5000 });
    } catch (e) { busy = false; app.sfx.error(); toast(esc(errMsg(e)), { kind: 'error', ms: 6000 }); }
    lobby();
  }
  // v528 : revanche : défi au même joueur (même pas ami : le serveur l'accepte 30 min après la partie), même vitesse
  async function rematch() {
    const v = view; if (!v?.foe || busy) return;
    busy = true;
    try {
      await spec.create(v.pace || 'slow', v.foe.id);
      app.sfx.achievement?.();
      toast(t('Revanche proposée à <b>{name}</b> : la partie commence dès qu’il accepte.', { name: esc(foeName(v)) }), { kind: 'success', icon: 'user', ms: 5000 });
    } catch (e) { app.sfx.error(); toast(esc(errMsg(e)), { kind: 'error' }); }
    busy = false;
    stopPoll(); lobby();
  }
  async function friend() {
    if (!friends) { try { friends = (await cloud.friendList()).filter((f) => f.status === 'accepted'); } catch (e) { friends = []; } }
    let pace = 'slow';
    const sh = openSheet(`<h2>Défier un ami</h2>${friends.length ? `<div class="seg wide mp-fpace" role="group" aria-label="Vitesse"><button class="seg-b" data-pace="slow" aria-pressed="true">Lente · ${MP_HOURS} h par coup</button><button class="seg-b" data-pace="fast" aria-pressed="false">Rapide · ${MP_FAST_SECS} s</button></div><div class="mp-friends">${friends.map((f) => `<button class="vs-fr" data-f="${esc(f.id)}"><span class="fr-av">${avatar(f.avatar)}</span><b>${esc(f.pseudo)}</b></button>`).join('')}</div><p class="small muted mp-fnote">Il a 24 h pour accepter.</p>` : '<p>Pas encore d’ami.</p><a class="btn block" href="#/amis">Ajouter un ami</a>'}`, { cls: 'sheet-small', label: 'Défier un ami' });
    sh.body.addEventListener('click', async (e) => {
      const pb = e.target.closest('[data-pace]');
      if (pb) { pace = pb.dataset.pace; sh.body.querySelectorAll('[data-pace]').forEach((x) => x.setAttribute('aria-pressed', String(x === pb))); sh.body.querySelector('.mp-fnote').textContent = pace === 'fast' ? t('Partie rapide : ton ami a 5 minutes pour accepter, soyez connectés tous les deux.') : t('Il a 24 h pour accepter.'); return; }
      const b = e.target.closest('[data-f]'); if (!b || busy) return;
      busy = true;
      try { await spec.create(pace, b.dataset.f); sh.close(); if (pace === 'fast') ui.searching = null; toast('Défi envoyé ! La partie commence dès que ton ami accepte.', { kind: 'success', icon: 'user' }); }
      catch (err2) { app.sfx.error(); toast(esc(errMsg(err2)), { kind: 'error' }); }
      busy = false; lobby();
    });
  }

  // Outils prêtés à l'écran de partie du jeu
  const ctx = {
    ui, cat, foeName, avatar, left, myTurn, resOf, msLeft,
    get view() { return view; }, set view(v) { view = v; },
    get busy() { return busy; },
    get alive() { return alive; },
    plate: (v, mine, html) => withPlate(mine ? g.s.plate : v.foe?.plate, html), /* v564 : nom posé sur sa plaque */
    draw, watch, refresh, act, lobby,
    // barre de compte à rebours d'une partie rapide
    clockHTML: (v) => (v.status === 'playing' && v.pace === 'fast' ? `<div class="mp-clock ${myTurn(v) ? 'mine' : ''}"><span class="mp-clock-bar"></span><span class="mp-clock-t">${myTurn(v) ? 'À toi' : `<span translate="no">${esc(foeName(v))}</span>`} · <b>${left(v)}</b></span></div>` : ''),
    // encadré de fin de partie
    endHTML: (v, detail = '') => { const r = resOf(v); return `<div class="panel mp-end ${r}"><h2 class="vs-title ${r}">${MP_RES[r]}</h2><p>${detail}${v.reason === 'timeout' ? (r === 'win' ? ' Ton adversaire n’a pas joué à temps.' : ' Tu n’as pas joué à temps.') : v.reason === 'resign' ? (r === 'win' ? ' Ton adversaire a abandonné.' : ' Tu as abandonné.') : ''}</p>${v.foe && !isBlocked(v.foe.id) ? `<button class="btn block dc-plq dc-plq-red" data-mp="rematch">${icon('swords')}${t('Revanche contre {name}', { name: `<span translate="no">${esc(foeName(v))}</span>` })}</button>` : ''}<button class="btn primary block" data-mp="back">Revenir aux parties</button></div>`; },
    // message sous la partie quand ce n'est pas ton tour
    waitMsg: (v) => (v.pace === 'fast' ? t('Au tour de <b>{name}</b>…', { name: esc(foeName(v)) }) : t('Au tour de <b>{name}</b> (il lui reste {time}). Tu peux fermer le jeu : la partie t’attendra.', { name: esc(foeName(v)), time: left(v) })),
  };

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mp]');
    if (!b || b.disabled) return;
    const k = b.dataset.mp;
    if (k === 'open') return open(b.dataset.id);
    if (k === 'back') { stopPoll(); return lobby(); }
    if (k === 'emote') return pickEmote();
    if (k === 'quick') return quick(b.dataset.pace || 'slow');
    if (k === 'friend') return friend();
    if (k === 'rematch') return rematch();
    if (k === 'join') { if (busy) return; busy = true; try { await spec.join(b.dataset.id); busy = false; return open(b.dataset.id); } catch (err2) { busy = false; toast(esc(errMsg(err2)), { kind: 'error' }); return lobby(); } }
    if (k === 'leave') {
      if (!(await confirmBox('Annuler cette partie ?', { ok: 'Oui', cancel: 'Non' }))) return;
      /* v536 : « Annuler » sa propre partie n'abandonne jamais une partie qui vient de commencer (mp_cancel) ; « Refuser » un défi garde mp_leave */
      if (b.dataset.own) {
        try {
          const r = await cloud.mpCancel(b.dataset.id);
          if (r === 'none') { if (ui.searching === b.dataset.id) { ui.searching = null; ui.searchingV = null; } const m = await cloud.mpGet(b.dataset.id).catch(() => null); if (m?.status === 'playing') { toast('Un adversaire vient d’arriver : la partie commence !', { kind: 'success' }); return open(b.dataset.id); } }
          if (ui.searching === b.dataset.id) { ui.searching = null; ui.searchingV = null; }
        } catch (err2) { toast(esc(errMsg(err2)), { kind: 'error' }); }
        return lobby();
      }
      try { await cloud.mpLeave(b.dataset.id); } catch (err2) { toast(esc(errMsg(err2)), { kind: 'error' }); }
      return lobby();
    }
    if (k === 'resign') {
      if (!(await confirmBox('Abandonner la partie ? Elle sera comptée comme une défaite.', { ok: 'Abandonner', cancel: 'Continuer', danger: true }))) return;
      try { await cloud.mpLeave(ui.open); } catch (err2) { toast(esc(errMsg(err2)), { kind: 'error' }); }
      return refresh();
    }
    spec.click?.(k, b, ctx);
  });

  /* v536 : téléphone en arrière-plan pendant une recherche rapide : on l'annule (sinon partie trouvée sans toi, perdue au temps) */
  const onVis = () => {
    if (document.visibilityState === 'hidden' && alive && ui.searching) { cloud.mpCancel(ui.searching).catch(() => {}); ui.searching = null; ui.searchingV = null; }
    else if (document.visibilityState === 'visible' && alive && !ui.open) lobby();
  };
  return {
    show() { alive = true; document.addEventListener('visibilitychange', onVis); return ui.open ? open(ui.open) : lobby(); },
    stop() {
      alive = false; stopPoll(); document.removeEventListener('visibilitychange', onVis);
      /* v527 : une recherche rapide s'annule quand on quitte l'écran (sinon la partie démarrerait sans toi et serait perdue au temps) */
      if (ui.searching) { cloud.mpCancel(ui.searching).catch(() => {}); ui.searching = null; ui.searchingV = null; }
      spec.onStop?.();
    },
  };
}
