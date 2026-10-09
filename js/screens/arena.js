// Arène (prototype) : duel contre l'ordinateur avec les cartes de la collection.
import { createDuel, play, attack, endTurn, canPlay, canAttack, targets, effAtk, RULES } from '../combat/engine.js';
import { nextAction, applyAction } from '../combat/ai.js';
import { cryptoRandom } from '../core/boosters.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, toast, bindActions, fmt, openSheet } from '../ui/dom.js';
import { ECONOMY } from '../config.js';

const DECK = 15;
const LEVELS = {
  novice: { name: 'Novice', maxPower: 4, heroHp: 20, desc: 'Un adversaire aux créatures modestes.' },
  adepte: { name: 'Adepte', maxPower: 7, heroHp: 25, desc: 'Un duel équilibré.' },
  maitre: { name: 'Maître', maxPower: 10, heroHp: 30, desc: 'Des créatures redoutables et plus de points de vie.' },
};

export function buildPlayerDeck(game) {
  const cat = game.catalog;
  const owned = Object.entries(game.s.collection).map(([id, e]) => ({ card: cat.get(id), n: e.n })).filter((x) => x.card).sort((a, b) => b.card.power - a.card.power || a.card.stats.cost - b.card.stats.cost);
  // Courbe de mana : quelques créatures bon marché pour pouvoir jouer dès le début.
  const copies = [];
  for (const { card, n } of owned) for (let i = 0; i < Math.min(2, n); i++) copies.push(card);
  const BUCKETS = [[1, 2, 5], [3, 4, 5], [5, 6, 3], [7, 10, 2]];
  const deck = [];
  const used = new Set();
  BUCKETS.forEach(([lo, hi, want]) => {
    copies.forEach((c, i) => { if (want > 0 && !used.has(i) && c.stats.cost >= lo && c.stats.cost <= hi) { deck.push(c.id); used.add(i); want--; } });
  });
  copies.forEach((c, i) => { if (deck.length < DECK && !used.has(i)) { deck.push(c.id); used.add(i); } });
  const loans = [];
  if (deck.length < DECK) {
    const commons = cat.byRarity.C.filter((c) => c.power <= 3);
    let i = 0;
    while (deck.length < DECK) { const id = commons[(i * 37) % commons.length].id; deck.push(id); loans.push(id); i++; }
  }
  return { deck, loans };
}

function buildAiDeck(cat, level, rng) {
  const pool = cat.cards.filter((c) => c.power <= LEVELS[level].maxPower);
  return Array.from({ length: DECK }, () => pool[Math.floor(rng() * pool.length)].id);
}

export default function arena(app, root) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.arena ||= { level: 'adepte' });
  let duel = null, selected = null, aiBusy = false, prev = null, alive = true;

  function lobby() {
    document.body.classList.remove('in-duel');
    const { deck, loans } = buildPlayerDeck(g);
    root.innerHTML = `
      <header class="screen-head"><h1>Arène</h1><p class="muted">Prototype jouable : affronte l’ordinateur avec les meilleures créatures de ta collection.</p></header>
      <section class="panel stack">
        <h2>Règles</h2>
        <ul class="small rules">
          <li>Chaque héros commence avec ${RULES.heroHp} points de vie (selon la difficulté). Réduis ceux de l’adversaire à zéro.</li>
          <li>À chaque tour, ta réserve de mana augmente de 1 (maximum ${RULES.maxMana}) et tu pioches une carte.</li>
          <li>Invoque des créatures en payant leur coût (5 au maximum sur le terrain). Elles attaquent à partir du tour suivant, sauf avec Charge.</li>
          <li>Une créature attaquée riposte. Chaque tranche de 3 points de DÉF réduit de 1 les dégâts subis. Une créature bien plus rapide que sa cible (VIT +3) frappe en premier.</li>
          <li>Les capacités et les passifs de faction s’appliquent automatiquement : ils sont décrits sur chaque carte.</li>
        </ul>
        <p class="small">Victoire : <b>+${ECONOMY.arena.win} éclats</b> · nul : +${ECONOMY.arena.draw} · défaite : +${ECONOMY.arena.loss}.</p>
      </section>
      <section class="panel stack">
        <h2>Difficulté</h2>
        <div class="seg wide" role="radiogroup">${Object.entries(LEVELS).map(([k, l]) => `<button class="seg-b" role="radio" data-act="level" data-v="${k}" aria-pressed="${st.level === k}" aria-checked="${st.level === k}">${l.name}</button>`).join('')}</div>
        <p class="small muted">${LEVELS[st.level].desc}</p>
      </section>
      <section class="panel stack">
        <h2>Ton deck (${DECK} cartes)</h2>
        <p class="small muted">Construit automatiquement avec tes meilleures créatures en respectant une courbe de mana (2 exemplaires au maximum).${loans.length ? ` <b>${loans.length} recrue${loans.length > 1 ? 's' : ''} prêtée${loans.length > 1 ? 's' : ''}</b> complète${loans.length > 1 ? 'nt' : ''} le deck tant que ta collection est petite.` : ''}</p>
        <div class="deck-list">${deck.slice().sort((a, b) => cat.get(a).stats.cost - cat.get(b).stats.cost).map((id) => { const c = cat.get(id); return `<span class="deck-chip ${loans.includes(id) && !g.owns(id) ? 'loan' : ''}" style="--fc:${cat.faction[c.faction].colors.secondary}"><i>${c.stats.cost}</i>${esc(c.name)}</span>`; }).join('')}</div>
        <button class="btn primary block" data-act="start">${icon('swords')}Commencer le duel</button>
      </section>
      <p class="small muted center">Bilan : ${g.s.stats.arenaWins} victoire${g.s.stats.arenaWins > 1 ? 's' : ''}, ${g.s.stats.arenaLosses} défaite${g.s.stats.arenaLosses > 1 ? 's' : ''}, ${g.s.stats.arenaDraws} nul${g.s.stats.arenaDraws > 1 ? 's' : ''}.</p>`;
  }

  function start() {
    const { deck } = buildPlayerDeck(g);
    const rng = cryptoRandom;
    const hp = LEVELS[st.level].heroHp;
    duel = createDuel({ decks: [deck, buildAiDeck(cat, st.level, rng)], names: ['Toi', `Adversaire ${LEVELS[st.level].name.toLowerCase()}`], heroHp: [RULES.heroHp, hp], rng, cards: cat.cards });
    selected = null; prev = null;
    drawDuel();
  }

  function unitHTML(u, side) {
    const card = cat.get(u.id);
    const tg = selected && side === 'foe' && targets(duel, 0, selected).includes(u.uid);
    const can = side === 'me' && canAttack(duel, 0, u.uid);
    const old = prev && prev[u.uid];
    const hit = old !== undefined && old > u.hp;
    const flags = [u.ab.guard && icon('shield'), u.aegis && '<span title="Égide">✦</span>', u.elusive && icon('eye'), u.drowned > 0 && '<span title="Englouti">≋</span>', u.poisoned && '<span title="Venin">☠</span>', side === 'me' && u.sick && !u.attacks && '<span title="Invoquée ce tour">z</span>'].filter(Boolean).join('');
    return `<button class="unit ${tg ? 'target' : ''} ${can ? 'ready' : ''} ${selected === u.uid ? 'selected' : ''} ${hit ? 'hit' : ''}" data-act="unit" data-side="${side}" data-uid="${u.uid}" style="--fc:${cat.faction[u.faction]?.colors.secondary || '#888'}" aria-label="${esc(u.name)}, ${effAtk(duel, u)} attaque, ${u.hp} points de vie">
      ${card ? `<img alt="" src="${artUrl(card, { lite: true })}">` : '<span class="token"></span>'}
      <span class="u-flags">${flags}</span>
      <span class="u-name">${esc(u.name)}</span>
      <span class="u-atk">${effAtk(duel, u)}</span><span class="u-hp ${u.hp < u.maxHp ? 'hurt' : ''}">${u.hp}</span>
      ${hit ? `<span class="dmg">-${old - u.hp}</span>` : ''}
    </button>`;
  }

  function heroHTML(p, side) {
    const pl = duel.players[p];
    const tg = selected && side === 'foe' && targets(duel, 0, selected).includes('hero');
    const hit = prev && prev['hero' + p] > pl.hp;
    return `<button class="hero-bar ${side} ${tg ? 'target' : ''} ${hit ? 'hit' : ''}" data-act="hero" data-side="${side}" ${side === 'me' ? 'tabindex="-1"' : ''}>
      <span class="hb-name">${esc(pl.name)}</span>
      <span class="hb-hp"><span class="progress"><i style="width:${Math.max(0, pl.hp / pl.maxHp) * 100}%;--bar:${side === 'me' ? '#5FD08F' : '#E0485F'}"></i></span><b>${Math.max(0, pl.hp)} PV</b></span>
      <span class="hb-meta small muted">${icon('flame')} ${pl.mana}/${pl.maxMana} · ${icon('cards')} ${pl.deck.length} · main ${pl.hand.length}</span>
      ${hit ? `<span class="dmg">-${prev['hero' + p] - pl.hp}</span>` : ''}
    </button>`;
  }

  function drawDuel() {
    if (!alive) return;
    document.body.classList.add('in-duel');
    const me = duel.players[0];
    const myTurn = duel.active === 0 && !duel.over;
    const last = duel.log.slice(-3).map((l) => `<p class="lg-${l.kind}">${esc(l.text)}</p>`).join('');
    root.innerHTML = `<div class="arena">
      ${heroHTML(1, 'foe')}
      <div class="board foe">${duel.players[1].board.map((u) => unitHTML(u, 'foe')).join('') || '<p class="small muted">Terrain vide</p>'}</div>
      <div class="duel-log" aria-live="polite">${last}</div>
      <div class="board me">${me.board.map((u) => unitHTML(u, 'me')).join('') || '<p class="small muted">Invoque une créature depuis ta main</p>'}</div>
      ${heroHTML(0, 'me')}
      <div class="mana">${Array.from({ length: me.maxMana }, (_, i) => `<i class="${i < me.mana ? 'on' : ''}"></i>`).join('')}</div>
      <div class="hand">${me.hand.map((id, i) => { const c = cat.get(id); const ok = myTurn && canPlay(duel, 0, i); return `<button class="hand-card ${ok ? 'playable' : ''}" data-act="play" data-i="${i}" style="--fc:${cat.faction[c.faction].colors.secondary}" aria-label="${esc(c.name)}, coût ${c.stats.cost}"><img alt="" src="${artUrl(c, { lite: true })}"><i class="hc-cost">${c.stats.cost}</i><span class="hc-name">${esc(c.name)}</span><span class="hc-st">${c.stats.atk} / ${c.stats.hp}</span></button>`; }).join('')}</div>
      <div class="duel-actions">
        <button class="btn small ghost" data-act="quit">Abandonner</button>
        <button class="btn small ghost" data-act="info">${icon('info')}Infos</button>
        <button class="btn ${myTurn ? 'primary' : ''}" data-act="end" ${myTurn && !aiBusy ? '' : 'disabled'}>${myTurn ? 'Fin du tour' : 'Tour adverse…'}</button>
      </div>
    </div>`;
    prev = snapshot();
    if (duel.over) setTimeout(finish, 600);
  }

  function snapshot() {
    const m = { hero0: duel.players[0].hp, hero1: duel.players[1].hp };
    duel.players.forEach((p) => p.board.forEach((u) => { m[u.uid] = u.hp; }));
    return m;
  }

  async function aiTurn() {
    aiBusy = true;
    drawDuel();
    const delay = app.reduced() ? 120 : 650;
    for (let i = 0; i < 40 && alive && !duel.over && duel.active === 1; i++) {
      await new Promise((r) => setTimeout(r, delay));
      if (!alive) return;
      const a = nextAction(duel, 1);
      duel = applyAction(duel, 1, a);
      if (a.type === 'attack') app.sfx.hit(); else if (a.type === 'play') app.sfx.summon();
      drawDuel();
    }
    aiBusy = false;
    drawDuel();
  }

  let finished = false;
  function finish() {
    if (finished || !alive) return;
    finished = true;
    const result = duel.winner === 0 ? 'win' : duel.winner === 1 ? 'loss' : 'draw';
    const { amount } = g.arenaResult(result);
    const title = { win: 'Victoire', loss: 'Défaite', draw: 'Match nul' }[result];
    if (result === 'win') app.sfx.achievement(); else app.sfx.error();
    const sh = openSheet(`<div class="center stack"><h2>${title}</h2><p>${result === 'win' ? 'Les sceaux de ton adversaire ont cédé.' : result === 'loss' ? 'Ton héros est tombé. Les créatures, elles, attendent la revanche.' : 'Aucun des deux camps n’a cédé.'}</p><p><b>+${fmt(amount)} éclats</b></p><div class="row gap" style="justify-content:center"><button class="btn" data-x="lobby">Retour</button><button class="btn primary" data-x="again">Rejouer</button></div></div>`, { cls: 'sheet-small', label: title, onClose: () => { if (alive && finished) { duel = null; finished = false; lobby(); } } });
    sh.body.addEventListener('click', (e) => {
      const x = e.target.closest('[data-x]')?.dataset.x;
      if (!x) return;
      sh.close();
      if (x === 'again') setTimeout(() => { finished = false; start(); }, 50);
    });
  }

  bindActions(root, {
    level(el) { st.level = el.dataset.v; lobby(); },
    start() { finished = false; start(); },
    play(el) {
      if (aiBusy || duel.active !== 0) return;
      const i = Number(el.dataset.i);
      if (!canPlay(duel, 0, i)) {
        const c = cat.get(duel.players[0].hand[i]);
        toast(duel.players[0].board.length >= RULES.boardMax ? 'Ton terrain est plein.' : `Pas assez de mana (${c.stats.cost} requis).`, { kind: 'error', ms: 1800 });
        return;
      }
      duel = play(duel, 0, i); selected = null; app.sfx.summon(); drawDuel();
    },
    unit(el) {
      const uid = Number(el.dataset.uid);
      if (el.dataset.side === 'me') {
        if (aiBusy || duel.active !== 0) return;
        if (!canAttack(duel, 0, uid)) { const u = duel.players[0].board.find((x) => x.uid === uid); toast(u && u.drowned ? 'Cette créature est engloutie ce tour-ci.' : 'Cette créature ne peut pas attaquer maintenant.', { ms: 1600 }); return; }
        selected = selected === uid ? null : uid; drawDuel();
        return;
      }
      if (selected && targets(duel, 0, selected).includes(uid)) { duel = attack(duel, 0, selected, uid); selected = null; app.sfx.hit(); drawDuel(); return; }
      const u = duel.players[1].board.find((x) => x.uid === uid);
      if (selected) toast(u?.ab.elusive && u.elusive ? 'Cible insaisissable.' : 'Un Gardien protège les autres cibles.', { ms: 1600 });
      else if (u && cat.get(u.id)) app.openCard(u.id, { list: null });
    },
    hero(el) {
      if (el.dataset.side !== 'foe' || !selected) return;
      if (!targets(duel, 0, selected).includes('hero')) { toast('Un Gardien protège le héros adverse.', { ms: 1600 }); return; }
      duel = attack(duel, 0, selected, 'hero'); selected = null; app.sfx.hit(); drawDuel();
    },
    end() { if (aiBusy || duel.over) return; selected = null; duel = endTurn(duel, 0); aiTurn(); },
    info() { openSheet(`<h2>Journal du duel</h2><div class="small stack">${duel.log.slice().reverse().map((l) => `<p class="lg-${l.kind}">${esc(l.text)}</p>`).join('')}</div>`, { label: 'Journal' }); },
    quit() { duel.over = true; duel.winner = 1; finish(); },
  });
  lobby();
  return () => { alive = false; document.body.classList.remove('in-duel'); };
}
