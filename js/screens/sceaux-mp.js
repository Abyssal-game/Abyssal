// v519 : Duels des Sceaux contre d'autres joueurs (« Contre un joueur » dans l'accueil des Sceaux).
// Parties à son rythme : le serveur tient la partie (supabase/09-multijoueur.sql), applique les règles et le délai
// par coup ; un coup pas joué à temps fait perdre la partie. Partie rapide (joueur au hasard) ou défi à un ami.
// v523 : l'accueil, la recherche, les défis et le suivi des parties sont communs aux jeux en ligne (mp-lobby.js).
import * as SC from '../core/sceaux.js';
import * as cloud from '../cloud/cloud.js';
import { openRuleHelp } from '../ui/sceaux-demo.js';
import { icon } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { createMpLobby } from './mp-lobby.js';

const RULE_MED = { classique: 'sc-rule-classique', sacre: 'sc-rule-sacre', identique: 'sc-rule-identique', somme: 'sc-rule-somme' };

export function createSceauxMp(app, root, { scCard, modeBar }) {
  const g = app.game, cat = app.catalog;

  // état au format du moteur du jeu (toi = 'p'), pour l'aperçu des captures
  function local(v) {
    const me = v.me, s = v.state, mine = (o) => (o === me ? 'p' : 'o');
    return { rule: s.rule, board: s.board.map((c) => (c ? { id: c.id, owner: mine(c.o), vals: c.v, guard: c.g } : null)), hands: { p: s.hands[me].slice(), o: s.hands[me === 'a' ? 'b' : 'a'].slice() },
      turn: 'p', placed: s.placed, cells: s.cells || {}, over: null, last: null, log: [], fac: {} };
  }
  function drawGame(v, ctx, last) {
    if (!ctx.alive) return;
    const { ui, foeName, avatar, left, myTurn } = ctx;
    const s = v.state, me = v.me, foe = me === 'a' ? 'b' : 'a';
    document.body.classList.add('battle-mode');
    setScene(null);
    let sc = document.querySelector('.sc-scene');
    if (!sc) { sc = document.createElement('div'); document.body.prepend(sc); }
    sc.className = 'sc-scene th-salle'; sc.style.backgroundImage = 'url(assets/sceaux/salle.webp)';
    const score = { p: s.hands[me].length, o: s.hands[foe].length };
    s.board.forEach((c) => { if (c) score[c.o === me ? 'p' : 'o']++; });
    const mt = myTurn(v) && !ctx.busy;
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
    const over = v.status === 'done';
    const msg = over ? '' : mt ? (ui.sel == null ? (v.pace === 'fast' ? 'À toi de jouer : touche une de tes cartes, puis une case libre.' : `À toi de jouer : touche une de tes cartes, puis une case libre. Il te reste <b>${left(v)}</b>.`) : 'Touche une case libre pour poser la carte.')
      : ctx.waitMsg(v);
    root.innerHTML = `<div class="sc-game mp-game ${app.reduced() ? 'rm' : ''}">
      <div class="sc-bar"><span class="sc-who ${!over && !myTurn(v) ? 'on' : ''}"><span class="sc-med">${avatar(v.foe?.avatar)}</span><span><b>${esc(foeName(v))}</b><small>Contre un joueur</small></span></span>
        <span class="sc-score" aria-label="Score : toi ${score.p}, adversaire ${score.o}"><b class="p">${score.p}</b><i>·</i><b class="o">${score.o}</b></span>
        <button class="btn small ghost" data-mp="back" aria-label="Revenir à la liste">${icon('close')}</button></div>
      <div class="sc-sub"><span class="sc-ohand open">${s.hands[foe].map((id) => scCard(cat, id, { owner: 'o', cls: 'sc-mini' })).join('')}</span>
        <button class="sc-rule" data-mp="rule">${RULE_MED[s.rule] ? `<img class="sc-ricon" alt="" src="assets/icons/${RULE_MED[s.rule]}.webp">` : icon('p:rule')}${esc(SC.RULES[s.rule]?.name || '')}</button></div>
      <div class="sc-bwrap"><div class="sc-board"><div class="sc-plate">${s.board.map(cell).join('')}</div></div></div>
      ${!over ? ctx.clockHTML(v) : ''}
      <p class="sc-msg">${msg}</p>
      ${over ? ctx.endHTML(v, s.final ? `${s.final[me]} cartes contre ${s.final[foe]}.` : '')
        : `<div class="sc-tray ${mt ? 'on' : ''}"><div class="sc-hand-row">${s.hands[me].map((id, k) => `<button class="sc-hc ${ui.sel === k ? 'sel' : ''}" data-mp="pick" data-k="${k}" ${mt ? '' : 'disabled'}>${ui.sel === k ? '<span class="sc-halo"></span>' : ''}${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div>
        <button class="btn small ghost mp-resign" data-mp="resign">${icon('p:danger')}Abandonner</button></div>`}
    </div>`;
  }
  async function play(ctx, cell) {
    if (ctx.busy || ctx.ui.sel == null) return;
    const idx = ctx.ui.sel;
    const v = await ctx.act(() => cloud.sceauxMpPlay(ctx.ui.open, idx, cell));
    if (!v) return;
    ctx.ui.sel = null; app.sfx.pose?.();
    ctx.draw(v.state.last);
    ctx.watch();
  }

  return createMpLobby(app, root, {
    game: 'sceaux', modeBar,
    note: 'Choisis ta vitesse. Si tu ne joues pas ton coup à temps, <b>la partie est perdue</b>. La règle est tirée au hasard.',
    intro: () => `<div class="sc-row mp-hand">${g.sceauxHand().map((id) => scCard(cat, id, { owner: 'p', cls: 'sc-mini' })).join('')}</div>
        <p class="small muted center">Ta main (elle se compose dans « Contre l’Abysse »).</p>`,
    create: (pace, to) => cloud.sceauxMpNew(g.sceauxHand(), to, pace),
    join: (id) => cloud.sceauxMpJoin(id, g.sceauxHand()),
    sub: (v) => (v.state?.rule ? `Règle « ${esc(SC.RULES[v.state.rule]?.name || '')} »` : ''),
    score: (v) => (v.state?.final ? `${v.state.final[v.me]} – ${v.state.final[v.me === 'a' ? 'b' : 'a']}` : ''),
    moveKey: (v) => v.state?.placed,
    drawGame,
    updated: async (prev, v) => { if (v.state.last?.who !== v.me) app.sfx.pose?.(); },
    click: (k, b, ctx) => {
      if (k === 'rule') return openRuleHelp(app, ctx.view?.state?.rule || 'classique');
      const v = ctx.view;
      if (!v || !ctx.myTurn(v) || ctx.busy) return;
      if (k === 'pick') { ctx.ui.sel = Number(b.dataset.k); app.sfx.tap(); return ctx.draw(); }
      if (k === 'cell') return play(ctx, Number(b.dataset.i));
    },
  });
}
