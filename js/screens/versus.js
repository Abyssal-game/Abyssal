// v811 : le Choc des Boosters refait (décision du propriétaire du 26 octobre 2026 : un vrai enjeu, sans jeu d'argent).
// Entrée : un jeton du Choc (un par jour, trois en réserve, jamais en vente). Chacun ouvre 2 boosters en même temps que
// l'adversaire, puis 3 manches de cartes posées en secret ; un 3e booster arrive après la 2e manche. Chacun garde les cartes
// qui ont gagné leur manche, plus une au choix ; le gagnant prend aussi la copie d'une carte adverse. Le reste retourne à
// l'Abysse. Parties en ligne : supabase/09-multijoueur.sql (choc_*), créées et encaissées par le serveur de partie.
// Les anciens duels (Choc payant, v513-v810) restent visibles jusqu'à ce qu'ils soient vus et encaissés.
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { CHOC, newGame, apply, aiPick, viewFor } from '../core/choc.js';
import { LEAGUES, LEAGUE_PTS, LEAGUE_REWARD, STREAK_CHESTS, STREAK_MULT, streakMult, leagueIdx, lineupOf } from '../core/versus.js';
import { drawBooster } from '../core/boosters.js';
import { CHESTS } from '../core/descent.js';
import { LUCK_POINTS } from '../config.js';
import { cardPts } from '../core/versus.js';
import { isBlocked } from '../core/moderation.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM, picon } from '../ui/icons.js';
import { profileAttrs } from '../ui/report.js';
import { esc, fmt, toast, confirmBox, openSheet, withPending } from '../ui/dom.js';
import { playDuel, pickGridHTML, leagueBadge, flameHTML } from './versus-duel.js';
import { createMpLobby } from './mp-lobby.js';
import { createChocGame } from './choc-game.js';
import { t, tw } from '../i18n.js';

/* v833 : « Le butin de la table » (retour à l'idée de départ du propriétaire) */
const HOW = () => [['p:seal', '#E8C35A', 'Un jeton par partie', 'Chaque partie coûte un jeton du Choc. Tu en reçois un chaque jour ({m} en réserve au plus) ; le coffre de la semaine, le Tournoi du Cercle et le Codex en donnent d’autres. Les jetons ne s’achètent pas.', { m: CHOC.tokensMax }],
  ['booster', '#C9A45A', 'Les boosters s’ouvrent', 'Toi et ton adversaire ouvrez trois boosters chacun, en même temps. Les cartes tombent sur la table : elles ne sont encore à personne. Le samedi et le dimanche, le troisième booster est un booster premium.'],
  ['crown', '#F2C14E', 'Les points', 'Commune {c}, Peu commune {pc}, Rare {r}, Hyper rare {hr}, Mythique {mm}, Secrète {ss}, +{v} avec une finition.', { c: LUCK_POINTS.C, pc: LUCK_POINTS.PC, r: LUCK_POINTS.R, hr: LUCK_POINTS.HR, mm: LUCK_POINTS.M, ss: LUCK_POINTS.S, v: LUCK_POINTS.variant }],
  ['swords', '#E0485E', 'Le butin de la table', 'Le meilleur total rafle toutes les cartes de la table : les siennes et celles de l’adversaire. Le perdant repart les mains vides. Égalité : chacun garde les siennes.'],
  ['cards', '#7FE0A0', 'Rien à perdre de ta collection', 'Tu ne mises rien : ni éclats, ni cartes de ta collection. Seules les cartes ouvertes pendant la partie sont en jeu.'],
  ['streak', '#FF8A3D', 'Série et Ligue', 'Victoire : {s} éclats × ta Série ardente (jusqu’à ×{x}), et un coffre à 3, 5, 7 et 10 victoires d’affilée. Ligue du mois : +{w} par victoire, −{l} par défaite.', { s: CHOC.winShards, x: STREAK_MULT.at(-1), w: LEAGUE_PTS.win, l: Math.abs(LEAGUE_PTS.lose) }],
  ['ui-eye', '#E0485E', 'Aucune triche', 'Les boosters sont ouverts et comptés par le serveur : personne ne peut truquer un tirage.']];
const howLi = ([ic, c, ti, d, p], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic.startsWith('p:') ? ic.slice(2) : ic)}<em>${i + 1}</em></span><span><b>${t(ti)}</b><span class="small">${t(d, p)}</span></span></li>`;
export const chocHowHTML = () => `<ol class="how-steps">${HOW().map((x, i) => howLi(x, i)).join('')}</ol>`;
/* v834 : le samedi et le dimanche (heure de Paris, comme le serveur), le 3e booster de chacun est premium */
export const chocWeekend = (now = Date.now()) => { try { const w = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(now)); return w === 'Sat' || w === 'Sun'; } catch (e) { const d = new Date(now).getDay(); return d === 0 || d === 6; } };
const CHEST_NAME = Object.fromEntries(Object.entries(CHESTS).map(([k, c]) => [k, c.name]));
const OFF = 'Le Choc des Boosters n’est pas encore ouvert sur le serveur.';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export default function versusScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const game = createChocGame(app, root);
  let old = null, train = null, alive = true;
  const pic = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const oname = (r) => (isBlocked(r.mine ? r.b : r.a) ? 'Joueur masqué' : r.pseudo || 'Joueur');
  const tokens = () => g.chocTokens().n;

  function head() {
    const n = tokens();
    return `<header class="screen-head ui-hero bn-versus"><h1>${t('Le Choc des Boosters')}</h1><p class="muted">${t('Trois boosters chacun, ouverts en même temps. Le meilleur total rafle toute la table.')}</p></header>
      <section class="panel kc-tok"><div class="kc-toks">${Array.from({ length: Math.max(CHOC.tokensMax, n) }, (_, i) => `<span class="kc-tk ${i < n ? 'on' : ''}"><img alt="" src="assets/jeux/kc-jeton.webp" onerror="this.onerror=null;this.src='assets/icons/seal.webp'"></span>`).join('')}</div>
        <span><b>${t(n > 1 ? '{n} jetons du Choc' : '{n} jeton du Choc', { n })}</b><small>${n < CHOC.tokensMax ? t('Un nouveau jeton chaque jour (jusqu’à {m}).', { m: CHOC.tokensMax }) : t('Réserve pleine : joue pour ne pas perdre le jeton de demain.')}</small></span></section>
      ${chocWeekend(g.clock()) ? `<section class="panel kc-wkd"><img alt="" src="assets/packs/premium.webp" onerror="this.remove()"><span><b>${t('Week-end premium')}</b><small>${t('Aujourd’hui, le troisième booster de chacun est un booster premium.')}</small></span></section>` : ''}
      ${leagueHTML()}`;
  }
  const monthName = (m) => `${t(MONTHS[+m.slice(5, 7) - 1] || '')} ${m.slice(0, 4)}`;
  function leagueHTML() {
    const lg = g.chocLeague(), v = g.s.versus, i = leagueIdx(lg.pts), L = LEAGUES[i], N = LEAGUES[i + 1];
    const d = new Date(g.clock()), days = Math.max(1, Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 1) - d) / 86400000));
    const pct = N ? Math.round(((lg.pts - L.min) / (N.min - L.min)) * 100) : 100;
    const s = v.streak || 0;
    return `<section class="panel vs-league" style="--lgc:${L.color}" data-mp="league" role="button" tabindex="0" aria-label="${t('Les Ligues du Choc')}">
      <div class="vs-lg-top">${leagueBadge(i, 'big')}<div class="vs-lg-t"><b>${t('Ligue {l}', { l: t(L.name) })}</b><small>${fmt(lg.pts)} ${t('points')} · ${t('fin dans {n} j', { n: days })}</small></div>${s >= 1 ? flameHTML(s, 'big') : ''}</div>
      <div class="vs-lg-bar"><i style="width:${pct}%"></i></div>
      <p class="small muted">${N ? t('Ligue {l} à {n} points.', { l: t(N.name), n: N.min }) : t('Tu es tout en haut : tiens bon jusqu’à la fin du mois.')} ${s >= 1 ? t('Série ardente : <b>{n}</b> · prochaine victoire, butin ×{m}', { n: s, m: String(streakMult(s + 1)).replace('.', ',') }) : ''}</p>
      <span class="vs-lg-more">${t('Toutes les ligues')} ${icon('next')}</span></section>`;
  }
  /* v834 : toucher la Ligue = tout savoir (ligues, points, récompenses, Série ardente) */
  function leagueSheet() {
    const lg = g.chocLeague(), cur = leagueIdx(lg.pts);
    const rwTxt = (k) => { const r = LEAGUE_REWARD[k]; if (!r) return t('Pas de récompense'); const out = [];
      for (const [c, n] of Object.entries(r.chests || {})) out.push((n > 1 ? `${n} × ` : '') + t(CHEST_NAME[c] || c));
      for (const [k2, n] of Object.entries(r.tickets || {})) if (k2 === 'premium') out.push(t(n > 1 ? '{n} tickets premium' : '{n} ticket premium', { n }));
      return out.join(' + '); };
    const rows = LEAGUES.map((L, i) => `<li class="lg-row ${i === cur ? 'cur' : ''}" style="--lgc:${L.color}">${leagueBadge(i)}<span><b>${t('Ligue {l}', { l: t(L.name) })}</b><small>${i ? t('dès {n} points', { n: L.min }) : t('point de départ')}</small></span><em>${rwTxt(L.k)}</em></li>`).reverse().join('');
    const mults = STREAK_MULT.map((m, i) => ({ i, m })).filter((x) => x.i >= 2 && x.m !== STREAK_MULT[x.i - 1]).map((x) => `<span class="lg-chip">${t('{n}e victoire', { n: x.i })} · ×${String(x.m).replace('.', ',')}</span>`).join('');
    const chests = Object.entries(STREAK_CHESTS).map(([n, c]) => `<span class="lg-chip">${n} · ${t(CHEST_NAME[c] || c)}</span>`).join('');
    openSheet(`<div class="lg-sheet"><h2>${t('Les Ligues du Choc')}</h2>
      <p class="small">${t('Chaque mois, tout le monde repart en Bronze. Tes victoires au Choc te font monter de ligue ; à la fin du mois, ta ligue te rapporte une récompense.')}</p>
      <p class="small"><b>${t('Ta ligue : {l} · {n} points', { l: t(LEAGUES[cur].name), n: fmt(lg.pts) })}</b></p>
      <ol class="lg-list">${rows}</ol>
      <h3>${t('Les points')}</h3>
      <ul class="small lg-pts"><li>${t('Victoire : <b>+{w}</b> points, +{b} de plus par victoire déjà enchaînée (jusqu’à +{m}).', { w: LEAGUE_PTS.win, b: LEAGUE_PTS.streakBonus, m: LEAGUE_PTS.streakMax })}</li><li>${t('Défaite : <b>{l}</b> points (jamais sous 0).', { l: LEAGUE_PTS.lose })}</li><li>${t('Égalité : rien ne change.')}</li><li>${t('La récompense de fin de mois va dans tes coffres si tu as joué au moins une partie ce mois-ci.')}</li></ul>
      <h3>${t('La Série ardente')}</h3>
      <p class="small">${t('Chaque victoire d’affilée attise ta Série : ton butin en éclats ({s} par victoire) est multiplié. Une défaite l’éteint, une égalité la garde.', { s: CHOC.winShards })}</p>
      <div class="lg-chips">${mults}</div>
      <p class="small">${t('Coffres de série :')}</p><div class="lg-chips">${chests}</div></div>`, { label: t('Les Ligues du Choc') });
  }
  function lastMonth() {
    const x = g.s.versus.lgLast; let seen = null;
    try { seen = localStorage.getItem('abyssal.chocSeen'); } catch (e) { /* stockage indisponible */ }
    if (!x || !x.played || seen === x.m) return;
    try { localStorage.setItem('abyssal.chocSeen', x.m); } catch (e) { /* idem */ }
    const L = LEAGUES[x.tier], rw = LEAGUE_REWARD[L.k];
    openSheet(`<div class="center stack">${leagueBadge(x.tier, 'huge')}<h2>${t('Fin de la Ligue · {m}', { m: monthName(x.m) })}</h2>
      <p>${t('Tu termines en ligue <b>{l}</b> avec {n} points.', { l: t(L.name), n: fmt(x.pts) })}</p>
      <p class="small muted">${rw ? t('Ta récompense est dans tes coffres.') : t('Atteins la ligue Argent pour gagner une récompense.')}</p></div>`, { label: t('Ligue du mois') });
  }

  // ——— Anciens duels (Choc payant d'avant v811) : vus et encaissés normalement, plus de nouveaux ———
  async function loadOld() {
    try { old = await cloud.versusList(); } catch (e) { old = null; return; }
    for (const r of (old?.mine || []).filter((x) => x.mine && !x.claimed && ['cancelled', 'declined', 'expired'].includes(x.status))) {
      try { const { out } = await app.partie.first('versusClaim', r.id); r.claimed = true; if (out?.shards) toast(t('Ancien défi du Choc : <b>{n} éclats</b> rendus.', { n: fmt(out.shards) }), { icon: 'crystal' }); } catch (e) { /* plus tard */ }
    }
  }
  function oldHTML() {
    const mine = old?.mine || [];
    const toSee = mine.filter((r) => r.status === 'done' && !r.claimed), picks = mine.filter((r) => g.s.versus.pick?.[r.id]);
    const waiting = mine.filter((r) => r.status === 'open' && r.mine), incoming = mine.filter((r) => r.status === 'open' && !r.mine);
    const past = mine.filter((r) => r.status === 'done' && r.claimed).slice(0, 6);
    if (!toSee.length && !picks.length && !waiting.length && !incoming.length && !past.length) return '';
    const row = (r, acts, sub) => `<div class="vs-row"><span class="fr-av"${profileAttrs(r.mine ? r.b : r.a)}>${pic(r.avatar)}</span><span class="fr-t"><b>${esc(r.public && r.mine ? t('Ouvert à tous') : oname(r))}</b><small>${sub}</small></span>${acts}</div>`;
    return `<details class="panel dc-fold vs-sec" ${toSee.length || picks.length ? 'open' : ''}><summary><span class="dc-sum-t">${t('Anciens duels du Choc')}</span></summary>
      <p class="small muted">${t('Les duels lancés avant la nouvelle formule se terminent et se paient comme avant.')}</p>
      ${toSee.map((r) => row(r, `<button class="btn small primary" data-mp="v-see" data-id="${esc(r.id)}">${t('Voir le duel')}</button>`, t('Ton défi a été relevé'))).join('')}
      ${picks.map((r) => row(r, `<button class="btn small primary" data-mp="v-pick" data-id="${esc(r.id)}">${icon('crown')} ${t('Choisir')}</button>`, t('Butin à choisir'))).join('')}
      ${incoming.map((r) => row(r, `<button class="btn small ghost" data-mp="v-decline" data-id="${esc(r.id)}">${t('Refuser')}</button>`, t('Ancien défi reçu'))).join('')}
      ${waiting.map((r) => row(r, `<button class="btn small ghost" data-mp="v-cancel" data-id="${esc(r.id)}">${t('Annuler')}</button>`, t('En attente · tes éclats te seront rendus'))).join('')}
      ${past.map((r) => { const res = r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose'; return row(r, `<button class="btn small ghost vs-replay" data-mp="v-replay" data-id="${esc(r.id)}">${icon('refresh')}${fmt(r.my_score)} – ${fmt(r.their_score)}</button>`, t({ win: 'Victoire', tie: 'Égalité', lose: 'Défaite' }[res])); }).join('')}
    </details>`;
  }
  const oldErr = (e) => { app.sfx.error(); toast(esc(e.status === 404 ? OFF : e.message), { kind: 'error', icon: 'info' }); };
  async function oldSee(id, ctx) {
    const r = old?.mine?.find((x) => x.id === id); if (!r) return;
    try { const { res, out: o } = await withPending(app.partie.first('versusClaim', id)); r.claimed = true; app.chrome?.(); oldDuel(r, o || { result: res.result, cards: [] }, ctx); } catch (e) { oldErr(e); }
  }
  function oldDuel(r, out, ctx) {
    playDuel(app, r, out, { foeName: oname(r), myAvatar: g.shownAvatar() || sync.profile?.avatar,
      onPick: (i) => app.partie.first('versusPick', r.id, i).then((x) => { app.chrome?.(); return x.out; }),
      onClose: () => { if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); } ctx.lobby(); } });
  }
  function oldPick(id, ctx) {
    const r = old?.mine?.find((x) => x.id === id); if (!r) return;
    const sh = openSheet(`<h2 class="center">${t('Ton butin')}</h2><p class="small center">${t('Choisis ta carte parmi celles de {name} :', { name: esc(oname(r)) })}</p>${pickGridHTML(app, r.their_cards)}`, { label: t('Ton butin') });
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-v="pick"]'); if (!b || sh.busy) return;
      sh.busy = true;
      try { await withPending(app.partie.first('versusPick', r.id, +b.dataset.i)); app.chrome?.(); sh.close(); toast(t('Butin ajouté à ta collection.'), { kind: 'success', icon: 'crown' }); ctx.lobby(); } catch (er) { sh.busy = false; oldErr(er); }
    });
  }
  async function oldCancel(id, decline, ctx) {
    if (!(await confirmBox(decline ? t('Refuser ce défi ? Ton ami récupère ses éclats.') : t('Annuler ce défi ? Tes éclats te sont rendus.'), { ok: t(decline ? 'Refuser' : 'Annuler le défi'), cancel: t('Retour') }))) return;
    try { await cloud.versusCancel(id); if (!decline) { const { out } = await app.partie.first('versusClaim', id); if (out?.shards) toast(t('<b>{n} éclats</b> rendus.', { n: fmt(out.shards) }), { icon: 'crystal' }); } } catch (e) { oldErr(e); }
    app.chrome?.(); await loadOld(); ctx.lobby();
  }

  // ——— Entraînement contre l'Abysse : même partie, jouée sur le téléphone, sans jeton ni récompense ———
  const tctx = { train: true, alive: true, busy: false, myTurn: (v) => v.status === 'playing', foeName: () => t('L’Abysse'), avatar: () => '<img alt="" src="assets/brand/emblem.webp">',
    plate: (v, mine, html) => html, clockHTML: () => '' };
  const tview = () => ({ id: null, me: 'a', status: train.st.over ? 'done' : 'playing', state: viewFor(train.st, 'a'), foe: null, pace: 'slow', turn: train.st.turn, claimed: true, reason: 'score' });
  const pack = () => drawBooster('standard', cat).cards.map((c) => ({ id: c.id, rarity: c.rarity, variant: c.variant || 'normal', faction: cat.get(c.id)?.faction }));
  /* v833 : entraînement du butin de la table : boosters tirés sur le téléphone, rien n'est gagné ni perdu */
  function startTrain() {
    const types = ['standard', 'standard', chocWeekend(g.clock()) ? 'premium' : 'standard'];
    const pk = (ty = 'standard') => drawBooster(ty, cat).cards.map((c) => { const x = { id: c.id, rarity: c.rarity, variant: c.variant || 'normal' }; return { ...x, pts: cardPts(x) }; });
    const a = types.map(pk), b = types.map(pk), sum = (p) => p.flat().reduce((n, c) => n + c.pts, 0);
    const r = { my_cards: a.flat(), their_cards: b.flat(), lineup: types.map((type) => ({ type })), my_score: sum(a), their_score: sum(b) };
    playDuel(app, r, null, { foeName: t('L’Abysse'), myAvatar: g.shownAvatar() || sync.profile?.avatar, table: true, train: true });
  }
  async function trainPlay(i, f) {
    try {
      train.st = apply(train.st, 'a', i, f);
      tctx.busy = true; game.drawGame(tview(), tctx);
      await new Promise((r) => setTimeout(r, app.reduced() ? 150 : 900));
      if (!train) return;
      const ai = aiPick(train.st, 'b', Math.random);
      train.st = apply(train.st, 'b', ai.i, ai.f);
      tctx.busy = false;
      await game.reveal(tview(), train.st.last, tctx);
      if (train) game.drawGame(tview(), tctx);
    } catch (e) { tctx.busy = false; if (e !== game.STOP) { toast(esc(e.message), { kind: 'error' }); if (train) game.drawGame(tview(), tctx); } }
  }

  // ——— v833 : une partie du butin de la table (jouée par le serveur dès que les deux joueurs sont là) ———
  let showing = null;
  function tableR(v) {
    const me = v.me, foe = me === 'a' ? 'b' : 'a', st = v.state;
    return { my_cards: st.packs[me].flat(), their_cards: st.packs[foe].flat(), lineup: st.packs[me].map((_, i) => ({ type: st.types?.[i] === 'premium' ? 'premium' : 'standard' })),
      avatar: v.foe?.avatar, my_score: st.total[me], their_score: st.total[foe], sachet: v.foe?.sachet, choc: v.foe?.choc };
  }
  async function tableShow(v, ctx) {
    if (showing === v.id) return;
    showing = v.id;
    root.innerHTML = `<div class="panel center kc-twait"><p>${t('Les boosters s’ouvrent…')}</p></div>`;
    let out = null;
    if (!v.claimed) {
      try { const { out: o } = await withPending(app.partie.first('chocClaim', v.id, null, null)); v.claimed = true; out = o || null; app.chrome?.(); }
      catch (e) { showing = null; app.sfx.error(); toast(esc(e.message), { kind: 'error' }); return ctx.lobby(); }
    }
    playDuel(app, tableR(v), out, { foeName: ctx.foeName(v), myAvatar: g.shownAvatar() || sync.profile?.avatar, table: true,
      onClose: () => { showing = null; if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); } ctx.lobby(); } });
  }

  // ——— Une partie en ligne ———
  async function play(i, f, ctx) {
    const prev = ctx.view;
    const v = await ctx.act(() => cloud.mpAct(ctx.ui.open, { pick: i, flames: f }));
    if (!v) return;
    const ev = v.state?.last;
    if (ev && ev.n > (prev.state?.n || 0)) { try { await game.reveal(v, ev, ctx); } catch (e) { if (e !== game.STOP) throw e; } }
    ctx.draw(); ctx.watch();
  }
  async function claim(ctx) {
    const v = ctx.view; if (!v || v.claimed) return;
    const { keep, take } = game.claimArgs();
    try {
      const { res, out } = await withPending(app.partie.first('chocClaim', v.id, keep, take));
      v.claimed = true;
      if (out) { game.setDone(v.id, out); if (out.result === 'win') app.sfx['vd-win']?.(); else if (out.result === 'lose') app.sfx['vd-lose']?.(); else app.sfx['vd-flip']?.(); }
      else if (res?.result === 'already') toast(t('Tes cartes de cette partie sont déjà dans ta collection.'));
      app.chrome?.();
      ctx.draw();
      if (out?.progress?.length) { app.pendingProgress = out.progress; app.flushProgress?.(); }
    } catch (e) { app.sfx.error(); toast(esc(e.message), { kind: 'error' }); }
  }

  const lobby = createMpLobby(app, root, {
    game: 'choc', noAutoClaim: true, noRanking: true, instant: true,
    busyLocal: () => !!train,
    modeBar: () => head(),
    note: t('Lance une recherche : dès qu’un joueur arrive, vos boosters s’ouvrent en même temps. Le meilleur total rafle toute la table.'),
    intro: () => `<button class="btn block dc-plq dc-plq-dark kc-trainbtn" data-mp="train">${icon('p:help')}${t('Entraînement contre l’Abysse')}</button><p class="small muted center kc-trainsub">${t('Sans jeton, rien à gagner ni à perdre')}</p>`, /* v813 : la ligne d'explication dépassait du bouton */
    canPlay: () => tokens() > 0,
    livePace: ({ disabled }) => `<button class="btn primary block dc-plq dc-plq-red kc-live" data-mp="quick" data-pace="fast" ${disabled ? 'disabled' : ''}><span>${t('Jouer en direct')}</span><span class="kc-cost"><img alt="" src="assets/jeux/kc-jeton.webp" onerror="this.onerror=null;this.src='assets/icons/seal.webp'">1</span></button>`,
    rewardNote: () => `<p class="small muted center">${tokens() > 0 ? t('Une partie coûte <b>1 jeton</b>. Le gagnant rafle toutes les cartes ouvertes, le perdant repart les mains vides.') : t('Plus de jeton aujourd’hui : un nouveau arrive demain. Tu peux t’entraîner contre l’Abysse.')}</p>`,
    onLobby: async () => { const n = await app.partie.first('chocRefund'); if (n > 0) { toast(t(n > 1 ? '{n} jetons du Choc rendus (parties jamais commencées).' : '{n} jeton du Choc rendu (partie jamais commencée).', { n }), { icon: 'info' }); app.chrome?.(); } },
    top: (L, row) => { const end = L.filter((v) => v.status === 'done' && !v.claimed); return end.length ? `<section class="panel mp-sec hot"><h2 class="section-title">${t('Boosters à ouvrir')} <span class="pill-n">${end.length}</span></h2>${end.map((v) => row(v, v.state?.table ? t('Ton adversaire est là : ouvre vos boosters') : t('Partie terminée : choisis tes cartes'))).join('')}</section>` : ''; },
    bottom: () => `${oldHTML()}<details class="panel dc-fold dc-how vs-rules"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">${t('Comment ça marche')}</span></summary>${chocHowHTML(cat)}</details>`,
    create: async (pace, to) => { const id = await app.partie.first('chocNew', to, pace); app.chrome?.(); return id; },
    join: async (id) => { const r = await app.partie.first('chocJoin', id); app.chrome?.(); return r; },
    sub: (v) => (v.state?.table ? (v.claimed ? `${fmt(v.state.total[v.me])} – ${fmt(v.state.total[v.me === 'a' ? 'b' : 'a'])}` : t('Boosters à ouvrir')) : v.state?.wins ? t('Manche {n} · {a} – {b}', { n: Math.min(v.state.r, CHOC.rounds), a: v.state.wins[v.me], b: v.state.wins[v.me === 'a' ? 'b' : 'a'] }) : ''),
    score: (v) => (v.state?.table ? `${fmt(v.state.total[v.me])} – ${fmt(v.state.total[v.me === 'a' ? 'b' : 'a'])}` : v.state?.wins ? `${v.state.wins[v.me]} – ${v.state.wins[v.me === 'a' ? 'b' : 'a']}` : ''),
    moveKey: (v) => `${v.status}:${v.state?.n || 0}:${v.turn}:${v.state?.pick ? JSON.stringify(v.state.pick) : ''}`,
    drawGame: (v, ctx) => {
      if (v.state?.table) return tableShow(v, ctx); /* v833 */
      game.start();
      if (v.status === 'playing' && v.id && (v.state?.n || 0) === 0 && !game.seen(v.id, 'start') && !game.anim) { game.openPacks(v, ctx, 'start').then(() => { if (ctx.view === v || ctx.view?.id === v.id) game.drawGame(ctx.view, ctx); }); return; }
      if (game.anim) return;
      game.drawGame(v, ctx);
    },
    updated: async (prev, v, ctx) => {
      const ev = v.state?.last;
      if (!ev || ev.n <= (prev.state?.n || 0)) return;
      try { await game.reveal(v, ev, ctx); } catch (e) { if (e !== game.STOP) throw e; }
    },
    onStop: () => game.stop(),
    click: async (k, b, ctx) => {
      if (k === 'rules') return openSheet(`<div class="sc-rules"><h2>${t('Le Choc des Boosters')}</h2>${chocHowHTML(cat)}</div>`, { label: t('Règles du Choc') });
      if (k === 'train') return startTrain();
      if (k === 'league') return leagueSheet();
      if (k === 'tback') { train = null; game.stop(); document.body.classList.remove('battle-mode'); return ctx.lobby(); }
      if (k === 'oskip') return;
      if (k === 'v-see') return oldSee(b.dataset.id, ctx);
      if (k === 'v-pick') return oldPick(b.dataset.id, ctx);
      if (k === 'v-cancel') return oldCancel(b.dataset.id, false, ctx);
      if (k === 'v-decline') return oldCancel(b.dataset.id, true, ctx);
      if (k === 'v-replay') { const r = old?.mine?.find((x) => x.id === b.dataset.id); if (r) oldDuel(r, null, ctx); return; }
      if (train) return game.click(k, b, tview(), tctx, (i, s) => trainPlay(i, s));
      if (k === 'claim') return claim(ctx);
      const v = ctx.view;
      if (!v || ctx.busy) return;
      return game.click(k, b, v, ctx, (i, s) => play(i, s, ctx));
    },
  });

  app.holdRefresh = () => alive; /* la partie du serveur (jetons, cartes gardées) arrive sans redessiner l'écran : il se redessine lui-même */
  loadOld().finally(() => {
    if (!alive) return;
    lobby.show();
    if (app.state.chocTrain) { app.state.chocTrain = false; startTrain(); } /* v813 : lancé depuis le Mode Créateur */
  });
  lastMonth();
  return () => { alive = false; app.holdRefresh = null; train = null; lobby.stop(); game.stop(); document.body.classList.remove('battle-mode'); document.querySelector('.sc-scene')?.remove(); };
}
