// v519 : Duels des Sceaux contre d'autres joueurs (« Contre un joueur » dans l'accueil des Sceaux).
// Parties à son rythme : le serveur tient la partie (supabase/09-multijoueur.sql), applique les règles et le délai
// par coup (MP_HOURS) ; un coup pas joué à temps fait perdre la partie. Partie rapide (joueur au hasard) ou défi à un ami.
import * as SC from '../core/sceaux.js';
import * as cloud from '../cloud/cloud.js';
import { sync } from '../cloud/sync.js';
import { MP_HOURS, MP_REWARD } from '../core/mp.js';
import { isBlocked } from '../core/moderation.js';
import { openRuleHelp } from '../ui/sceaux-demo.js';
import { artUrl } from '../art/assets.js';
import { icon, picon, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { checkTurns } from '../cloud/mpwatch.js';
import { t } from '../i18n.js';

const OFF = 'Les parties contre d’autres joueurs ne sont pas encore ouvertes sur le serveur.';
const RULE_MED = { classique: 'sc-rule-classique', sacre: 'sc-rule-sacre', identique: 'sc-rule-identique', somme: 'sc-rule-somme' };
const RES = { win: 'Victoire', lose: 'Défaite', draw: 'Égalité' };

export function createSceauxMp(app, root, { scCard, modeBar }) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.sceauxMp ||= { open: null, sel: null });
  let list = null, err = null, busy = false, poll = 0, view = null, skew = 0, alive = true, friends = null;
  const avatar = (id) => { const c = id && cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const foeName = (v) => (!v.foe ? '…' : isBlocked(v.foe.id) ? 'Joueur masqué' : v.foe.pseudo || 'Joueur');
  const left = (v) => {
    const ms = new Date(v.deadline).getTime() - (Date.now() + skew);
    if (ms <= 0) return 'temps écoulé';
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  };
  const myTurn = (v) => v.status === 'playing' && v.turn === v.me;
  const resOf = (v) => (v.winner === 'draw' ? 'draw' : v.winner === v.me ? 'win' : 'lose');
  const errMsg = (e) => (e.status === 404 ? OFF : e.message);
  function stopPoll() { clearTimeout(poll); poll = 0; }
  function schedule(fn, ms) { stopPoll(); poll = setTimeout(() => { if (alive && document.visibilityState === 'visible') fn(); else schedule(fn, ms); }, ms); }

  // ——— Accueil « Contre un joueur » ———
  async function lobby() {
    ui.open = null; view = null;
    document.body.classList.remove('battle-mode');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) {
      root.innerHTML = `${modeBar()}<section class="panel stack center"><p>${!cloud.isLoggedIn() ? 'Connecte-toi pour jouer contre d’autres joueurs.' : 'Choisis d’abord ton pseudo : c’est lui que verront tes adversaires.'}</p><a class="btn primary block" href="#/compte">${icon('user')}${!cloud.isLoggedIn() ? 'Se connecter' : 'Choisir mon pseudo'}</a></section>`;
      return;
    }
    drawLobby();
    try { list = await cloud.mpList('sceaux'); err = null; } catch (e) { err = errMsg(e); list = list || []; }
    if (!alive || ui.open) return;
    if (list[0]?.now) skew = new Date(list[0].now).getTime() - Date.now();
    await claimAll();
    checkTurns(app, { force: true });
    drawLobby();
    schedule(lobby, 20000);
  }
  // résultats des parties terminées : récompense encaissée une seule fois
  async function claimAll() {
    for (const v of (list || []).filter((x) => x.status === 'done' && !x.claimed)) {
      try {
        const r = await cloud.mpClaim(v.id);
        v.claimed = true;
        const out = g.mpReward('sceaux', v.id, r);
        if (out) toast(`${t(r === 'win' ? 'Victoire contre <b>{name}</b>' : r === 'lose' ? 'Défaite contre <b>{name}</b>' : 'Égalité contre <b>{name}</b>', { name: esc(foeName(v)) })}${v.reason === 'timeout' ? ` (${t('temps écoulé')})` : v.reason === 'resign' ? ` (${t('abandon')})` : ''}${out.shards ? ` · +${out.shards} ${t('éclats')}` : ''}`, { icon: r === 'win' ? 'crown' : 'info' });
      } catch (e) { /* on réessaiera */ }
    }
    app.chrome?.();
  }
  function drawLobby() {
    const hand = g.sceauxHand();
    const L = list || [];
    const mine = L.filter((v) => myTurn(v)), theirs = L.filter((v) => v.status === 'playing' && !myTurn(v));
    const invites = L.filter((v) => v.status === 'waiting' && v.me === 'b'), waiting = L.filter((v) => v.status === 'waiting' && v.me === 'a');
    const done = L.filter((v) => v.status === 'done').slice(0, 8);
    const st = g.s.mp.sceaux || { wins: 0, losses: 0, draws: 0 };
    const paidLeft = MP_REWARD.paidPerDay - (g.s.mp.day === dayKey() ? g.s.mp.paid : 0);
    const row = (v, sub, acts) => `<div class="mp-row ${myTurn(v) ? 'hot' : ''}" ${v.status !== 'waiting' ? `data-mp="open" data-id="${esc(v.id)}" role="button" tabindex="0"` : ''}><span class="fr-av">${v.foe ? avatar(v.foe.avatar) : EMBLEM}</span><span class="fr-t"><b>${esc(v.foe ? foeName(v) : 'Un joueur au hasard')}</b><small>${sub}</small></span>${acts || icon('next')}</div>`;
    const rule = (v) => (v.state?.rule ? `Règle « ${esc(SC.RULES[v.state.rule]?.name || '')} »` : '');
    root.innerHTML = `${modeBar()}
      ${err ? `<p class="panel small center">${icon('info')} ${esc(err)}</p>` : ''}
      ${mine.length ? `<section class="panel mp-sec hot"><h2 class="section-title">À toi de jouer <span class="pill-n">${mine.length}</span></h2>${mine.map((v) => row(v, `${rule(v)} · il te reste <b>${left(v)}</b>`)).join('')}</section>` : ''}
      ${invites.length ? `<section class="panel mp-sec"><h2 class="section-title">Défis reçus</h2>${invites.map((v) => row(v, 'Ton ami te défie', `<span class="vs-acts"><button class="btn small primary" data-mp="join" data-id="${esc(v.id)}">Accepter</button><button class="btn small ghost" data-mp="leave" data-id="${esc(v.id)}">Refuser</button></span>`)).join('')}</section>` : ''}
      <section class="panel mp-sec mp-new"><h2 class="section-title">Nouvelle partie</h2>
        <p class="small">Chacun joue son coup quand il veut, mais tu as <b>${MP_HOURS} h</b> pour jouer chaque coup : passé ce délai, <b>la partie est perdue</b>. La règle est tirée au hasard.</p>
        <div class="sc-row mp-hand">${hand.map((id) => scCard(cat, id, { owner: 'p', cls: 'sc-mini' })).join('')}</div>
        <p class="small muted center">Ta main (elle se compose dans « Contre l’Abysse »).</p>
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-mp="quick" ${busy || waiting.some((v) => v.public) ? 'disabled' : ''}>${icon('p:swords')}${waiting.some((v) => v.public) ? 'Recherche d’un adversaire…' : 'Partie rapide · un joueur au hasard'}</button>
        <button class="btn block dc-plq dc-plq-dark" data-mp="friend" ${busy ? 'disabled' : ''}>${icon('user')}Défier un ami</button>
        <p class="small muted center">Victoire : +${MP_REWARD.win} éclats (${Math.max(0, paidLeft)} victoire${paidLeft > 1 ? 's' : ''} payée${paidLeft > 1 ? 's' : ''} restante${paidLeft > 1 ? 's' : ''} aujourd’hui) et une place au classement du mois.</p>
      </section>
      ${theirs.length ? `<section class="panel mp-sec"><h2 class="section-title">Au tour de l’adversaire</h2>${theirs.map((v) => row(v, `${rule(v)} · il lui reste ${left(v)}`)).join('')}</section>` : ''}
      ${waiting.length ? `<section class="panel mp-sec"><h2 class="section-title">En attente</h2>${waiting.map((v) => row(v, v.public ? 'Recherche d’un adversaire (jusqu’à 24 h)' : t('Défi envoyé à {name}', { name: esc(foeName(v)) }), `<button class="btn small ghost" data-mp="leave" data-id="${esc(v.id)}">Annuler</button>`)).join('')}</section>` : ''}
      ${done.length ? `<details class="panel dc-fold mp-sec"><summary><span class="dc-sum-t">Parties terminées</span></summary>${done.map((v) => { const r = resOf(v); return row(v, `<b class="vs-res ${r}">${RES[r]}</b>${v.state?.final ? ` · ${v.state.final[v.me]} – ${v.state.final[v.me === 'a' ? 'b' : 'a']}` : ''}${v.reason === 'timeout' ? ' · temps écoulé' : v.reason === 'resign' ? ' · abandon' : ''}`); }).join('')}</details>` : ''}
      <details class="panel dc-fold mp-sec" id="mp-rank"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/crown.webp"><span class="dc-sum-t">Classement du mois</span></summary><div class="lb-body small muted">Chargement…</div></details>
      <p class="small muted center">Contre les joueurs : ${st.wins} victoire${st.wins > 1 ? 's' : ''} · ${st.losses} défaite${st.losses > 1 ? 's' : ''}</p>`;
    root.querySelector('#mp-rank')?.addEventListener('toggle', (e) => { if (e.target.open) ranking(); }, { once: true });
  }
  const dayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  async function ranking() {
    const box = root.querySelector('#mp-rank .lb-body'); if (!box) return;
    try {
      const rows = await cloud.mpRanking('sceaux', 20);
      const me = cloud.currentUser()?.id;
      box.classList.remove('muted');
      box.innerHTML = rows.length ? rows.map((r, i) => `<div class="lb-row ${r.user_id === me ? 'me' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-av">${avatar(r.avatar)}</span><span class="lb-name"><b>${esc(isBlocked(r.user_id) ? 'Joueur masqué' : r.pseudo || 'Joueur')}</b><span class="small muted">${r.games} partie${r.games > 1 ? 's' : ''}</span></span><span class="lb-floor">${r.wins}</span></div>`).join('') : '<p class="small muted">Pas encore de victoire ce mois-ci. À toi !</p>';
    } catch (e) { box.textContent = errMsg(e); }
  }

  // ——— Partie ———
  async function open(id) {
    ui.open = id; ui.sel = null;
    try { view = await cloud.mpGet(id); } catch (e) { toast(esc(errMsg(e)), { kind: 'error' }); return lobby(); }
    if (!alive || ui.open !== id) return;
    if (!view) return lobby();
    if (view.now) skew = new Date(view.now).getTime() - Date.now();
    drawGame();
    watch();
  }
  // l'adversaire joue : on regarde toutes les 8 s tant que la partie est ouverte et que ce n'est pas notre tour
  function watch() {
    if (!view || view.status !== 'playing' || myTurn(view)) { stopPoll(); if (view?.status === 'playing') schedule(() => refresh(), 30000); return; }
    schedule(() => refresh(), 8000);
  }
  async function refresh() {
    if (!ui.open || busy) return watch();
    let v; try { v = await cloud.mpGet(ui.open); } catch (e) { return watch(); }
    if (!alive || !v || v.id !== ui.open) return;
    const before = view?.state?.placed;
    view = v;
    drawGame(v.state.placed !== before ? v.state.last : null);
    if (v.state.placed !== before && v.state.last?.who !== v.me) app.sfx.pose?.();
    watch();
  }
  // état au format du moteur du jeu (toi = 'p'), pour l'aperçu des captures
  function local(v) {
    const me = v.me, s = v.state, mine = (o) => (o === me ? 'p' : 'o');
    return { rule: s.rule, board: s.board.map((c) => (c ? { id: c.id, owner: mine(c.o), vals: c.v, guard: c.g } : null)), hands: { p: s.hands[me].slice(), o: s.hands[me === 'a' ? 'b' : 'a'].slice() },
      turn: 'p', placed: s.placed, cells: s.cells || {}, over: null, last: null, log: [], fac: {} };
  }
  function drawGame(last = null) {
    const v = view; if (!v) return lobby();
    const s = v.state, me = v.me, foe = me === 'a' ? 'b' : 'a';
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene th-salle'; sc.style.backgroundImage = 'url(assets/sceaux/salle.webp)';
    const score = { p: s.hands[me].length, o: s.hands[foe].length };
    s.board.forEach((c) => { if (c) score[c.o === me ? 'p' : 'o']++; });
    const mt = myTurn(v) && !busy;
    const loc = local(v);
    const flipped = new Set(last?.flips || []);
    const preview = (i) => {
      if (ui.sel == null || !mt || s.board[i]) return '';
      try { const t = JSON.parse(JSON.stringify(loc)); SC.place(cat, t, 'p', ui.sel, i); const n = t.log.at(-1)?.flips.length || 0; return n ? `<i class="sc-pv">+${n}</i>` : ''; } catch (e) { return ''; }
    };
    const rs = (i) => `${i === s.cells?.blessed ? '<span class="sc-rs bless"></span><span class="sc-tag bless">+1</span>' : ''}${i === s.cells?.cursed ? '<span class="sc-rs curse"></span><span class="sc-tag curse">−1</span>' : ''}`;
    const cell = (c, i) => (!c
      ? `<button class="sc-cell ${i === SC.CENTER ? 'heart' : ''} ${ui.sel != null && mt ? 'can' : ''}" data-mp="cell" data-i="${i}" aria-label="Case ${i + 1}">${rs(i)}${preview(i)}</button>`
      : `<div class="sc-cell full ${i === SC.CENTER ? 'heart' : ''} ${last?.cell === i ? 'drop' : ''} ${flipped.has(i) ? 'mp-flip' : ''}" data-i="${i}">${scCard(cat, c.id, { vals: c.v, owner: c.o === me ? 'p' : 'o', back: true, guard: c.g })}${rs(i)}</div>`);
    const over = v.status === 'done', r = over ? resOf(v) : null;
    const msg = over ? '' : mt ? (ui.sel == null ? `À toi de jouer : touche une de tes cartes, puis une case libre. Il te reste <b>${left(v)}</b>.` : 'Touche une case libre pour poser la carte.')
      : t('Au tour de <b>{name}</b> (il lui reste {time}). Tu peux fermer le jeu : la partie t’attendra.', { name: esc(foeName(v)), time: left(v) });
    root.innerHTML = `<div class="sc-game mp-game ${app.reduced() ? 'rm' : ''}">
      <div class="sc-bar"><span class="sc-who ${!over && !myTurn(v) ? 'on' : ''}"><span class="sc-med">${avatar(v.foe?.avatar)}</span><span><b>${esc(foeName(v))}</b><small>Contre un joueur</small></span></span>
        <span class="sc-score" aria-label="Score : toi ${score.p}, adversaire ${score.o}"><b class="p">${score.p}</b><i>·</i><b class="o">${score.o}</b></span>
        <button class="btn small ghost" data-mp="back" aria-label="Revenir à la liste">${icon('close')}</button></div>
      <div class="sc-sub"><span class="sc-ohand open">${s.hands[foe].map((id) => scCard(cat, id, { owner: 'o', cls: 'sc-mini' })).join('')}</span>
        <button class="sc-rule" data-mp="rule">${RULE_MED[s.rule] ? `<img class="sc-ricon" alt="" src="assets/icons/${RULE_MED[s.rule]}.webp">` : icon('p:rule')}${esc(SC.RULES[s.rule]?.name || '')}</button></div>
      <div class="sc-bwrap"><div class="sc-board"><div class="sc-plate">${s.board.map(cell).join('')}</div></div></div>
      <p class="sc-msg">${msg}</p>
      ${over ? `<div class="panel mp-end ${r}"><h2 class="vs-title ${r}">${RES[r]}</h2><p>${s.final ? `${s.final[me]} cartes contre ${s.final[foe]}.` : ''}${v.reason === 'timeout' ? (r === 'win' ? ' Ton adversaire n’a pas joué à temps.' : ' Tu n’as pas joué à temps.') : v.reason === 'resign' ? (r === 'win' ? ' Ton adversaire a abandonné.' : ' Tu as abandonné.') : ''}</p><button class="btn primary block" data-mp="back">Revenir aux parties</button></div>`
        : `<div class="sc-tray ${mt ? 'on' : ''}"><div class="sc-hand-row">${s.hands[me].map((id, k) => `<button class="sc-hc ${ui.sel === k ? 'sel' : ''}" data-mp="pick" data-k="${k}" ${mt ? '' : 'disabled'}>${ui.sel === k ? '<span class="sc-halo"></span>' : ''}${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div>
        <button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}Abandonner</button></div>`}
    </div>`;
    if (over && !v.claimed) claimOne(v);
  }
  async function claimOne(v) {
    try { const r = await cloud.mpClaim(v.id); v.claimed = true; const out = g.mpReward('sceaux', v.id, r); if (out) { if (r === 'win') app.sfx.victory?.(); else app.sfx.defeat?.(); if (out.shards) toast(`+${out.shards} éclats`, { icon: 'crystal' }); app.chrome?.(); } } catch (e) { /* plus tard */ }
  }
  async function play(cell) {
    if (busy || ui.sel == null) return;
    busy = true;
    const idx = ui.sel;
    try { view = await cloud.sceauxMpPlay(ui.open, idx, cell); ui.sel = null; app.sfx.pose?.(); }
    catch (e) { app.sfx.error(); toast(esc(errMsg(e)), { kind: 'error' }); busy = false; return refresh(); }
    busy = false;
    drawGame(view.state.last);
    watch();
  }
  async function quick() {
    if (busy) return;
    busy = true;
    try {
      const id = await cloud.sceauxMpNew(g.sceauxHand());
      const v = await cloud.mpGet(id);
      busy = false;
      if (v?.status === 'playing') { toast(t('Adversaire trouvé : <b>{name}</b> !', { name: esc(foeName(v)) }), { icon: 'user' }); return open(id); }
      toast('Recherche d’un adversaire : ta partie commencera dès qu’un joueur arrive. Reviens plus tard !', { icon: 'hourglass', ms: 5000 });
    } catch (e) { busy = false; app.sfx.error(); toast(esc(errMsg(e)), { kind: 'error', ms: 6000 }); }
    lobby();
  }
  async function friend() {
    if (!friends) { try { friends = (await cloud.friendList()).filter((f) => f.status === 'accepted'); } catch (e) { friends = []; } }
    const sh = openSheet(`<h2>Défier un ami</h2>${friends.length ? `<div class="mp-friends">${friends.map((f) => `<button class="vs-fr" data-f="${esc(f.id)}"><span class="fr-av">${avatar(f.avatar)}</span><b>${esc(f.pseudo)}</b></button>`).join('')}</div><p class="small muted">Il a 24 h pour accepter. Ensuite, ${MP_HOURS} h par coup.</p>` : '<p>Pas encore d’ami.</p><a class="btn block" href="#/amis">Ajouter un ami</a>'}`, { cls: 'sheet-small', label: 'Défier un ami' });
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-f]'); if (!b || busy) return;
      busy = true;
      try { await cloud.sceauxMpNew(g.sceauxHand(), b.dataset.f); sh.close(); toast('Défi envoyé ! La partie commence dès que ton ami accepte.', { kind: 'success', icon: 'user' }); }
      catch (err2) { app.sfx.error(); toast(esc(errMsg(err2)), { kind: 'error' }); }
      busy = false; lobby();
    });
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mp]');
    if (!b || b.disabled) return;
    const k = b.dataset.mp;
    if (k === 'open') return open(b.dataset.id);
    if (k === 'back') { stopPoll(); return lobby(); }
    if (k === 'quick') return quick();
    if (k === 'friend') return friend();
    if (k === 'rule') return openRuleHelp(app, view?.state?.rule || 'classique');
    if (k === 'join') { busy = true; try { await cloud.sceauxMpJoin(b.dataset.id, g.sceauxHand()); busy = false; return open(b.dataset.id); } catch (err2) { busy = false; toast(esc(errMsg(err2)), { kind: 'error' }); return lobby(); } }
    if (k === 'leave') {
      if (!(await confirmBox('Annuler cette partie ?', { ok: 'Oui', cancel: 'Non' }))) return;
      try { await cloud.mpLeave(b.dataset.id); } catch (err2) { toast(esc(errMsg(err2)), { kind: 'error' }); }
      return lobby();
    }
    if (k === 'resign') {
      if (!(await confirmBox('Abandonner la partie ? Elle sera comptée comme une défaite.', { ok: 'Abandonner', cancel: 'Continuer', danger: true }))) return;
      try { await cloud.mpLeave(ui.open); } catch (err2) { toast(esc(errMsg(err2)), { kind: 'error' }); }
      return refresh();
    }
    if (!view || !myTurn(view) || busy) return;
    if (k === 'pick') { ui.sel = Number(b.dataset.k); app.sfx.tap(); return drawGame(); }
    if (k === 'cell') return play(Number(b.dataset.i));
  });

  return {
    show() { alive = true; return ui.open ? open(ui.open) : lobby(); },
    stop() { alive = false; stopPoll(); },
  };
}
