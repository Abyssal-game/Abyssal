// Écran de combat : héros (bas) contre créatures (haut). Frise d'initiative, intentions
// ennemies affichées, compétences de classe, jauge d'invocation, parade et frappe en rythme.
import { RARITY } from '../config.js';
import { HEROES, INVOCATIONS, FAMILIES, huntStage, HUNT_STAGES, RES_NAMES } from '../core/heroes.js';
import { SKILLS, MAX_ENERGY, beginTurn, current, timeline, front, alive, targets, act, plan, canInvoke, intentPreview } from '../core/battle.js';
import { artUrl } from '../art/assets.js';
import { heroArtUrl } from '../ui/hero.js';
import { cardHTML } from '../ui/card.js';
import { coach } from '../ui/coach.js';
import { icon } from '../ui/icons.js';
import { esc, toast, openSheet } from '../ui/dom.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STATUS = [['stealth', 'Ombre'], ['bear', 'Ours'], ['inspired', 'Inspiré'], ['weak', 'Affaibli'], ['regen', 'Régén.'], ['stun', 'Étourdi'], ['poison', 'Poison'], ['burn', 'Brûlure'], ['frozen', 'Gelé'], ['mark', 'Marqué'], ['exposed', 'Exposé'], ['shield', 'Bouclier'], ['taunt', 'Défi'], ['armorUp', 'Garde'], ['defend', 'Défense'], ['enraged', 'Enragé']];
const INTENT = {
  attack: ['swords', 'Attaque'], hunt: ['swords', 'Traque'], double: ['swords', 'Double attaque'], poison: ['skull', 'Morsure venimeuse'],
  aoe: ['flame', 'Frappe toute l’équipe'], guard: ['shield', 'Bouclier'], heal: ['heart', 'Soin'], charge: ['sparkle', 'Prépare une attaque…'],
  heavy: ['sparkle', 'COUP DÉVASTATEUR'], stunheavy: ['sparkle', 'COUP ÉTOURDISSANT'],
};

export function runBattle(app, root, { title, onEnd }) {
  const g = app.game, cat = app.catalog;
  const run = g.descent().run;
  const st = run.battle;
  const ui = (app.state.battle ||= { auto: false, speed: 1, rhythm: true });
  let alive_ = true, pick = null;
  document.body.classList.add('battle-mode');
  const reduced = app.reduced();
  const step = (ms) => (reduced ? Math.min(ms, 120) : ms) / ui.speed;
  const invDef = INVOCATIONS[st.inv?.key] || null;

  root.innerHTML = `<div class="tb ${run.room}">
    <div class="tb-top"><b>${esc(title)}</b><span class="row gap">
      <button class="btn small ghost" data-b="pause" aria-label="Pause">${icon('close')}</button>
      <button class="btn small ghost ${ui.rhythm ? 'on' : ''}" data-b="rhythm" title="Frappe en rythme">${icon('sparkle')}</button>
      <button class="btn small ghost ${ui.auto ? 'on' : ''}" data-b="auto">Auto</button>
      <button class="btn small ghost" data-b="speed">×${ui.speed}</button></span></div>
    <div class="tb-line" aria-label="Ordre des tours"></div>
    <div class="tb-side enemy"></div>
    <div class="tb-msg" aria-live="polite"></div>
    ${invDef ? `<div class="tb-gauge" style="--ic:${invDef.color}"><span class="tb-g-name">${esc(invDef.name)}</span><span class="tb-g-bar"><i></i></span><span class="tb-g-v"></span></div>` : ''}
    <div class="tb-side ally"></div>
    <div class="tb-cmd"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const lineEl = $('.tb-line'), enEl = $('.tb-side.enemy'), alEl = $('.tb-side.ally'), msgEl = $('.tb-msg'), cmdEl = $('.tb-cmd');
  $('.tb-top').addEventListener('click', (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    if (b.dataset.b === 'pause') { toast('Combat en pause : il t’attend dans la Descente.', { icon: 'swords' }); app.go(''); return; }
    if (b.dataset.b === 'rhythm') { ui.rhythm = !ui.rhythm; b.classList.toggle('on', ui.rhythm); toast(ui.rhythm ? 'Frappe en rythme activée : touche au bon moment pour un critique.' : 'Frappe en rythme désactivée (la parade reste disponible).', { icon: 'sparkle' }); }
    if (b.dataset.b === 'auto') { ui.auto = !ui.auto; b.classList.toggle('on', ui.auto); if (ui.auto && pick) pick(null); }
    if (b.dataset.b === 'speed') { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 3 : 1; b.textContent = `×${ui.speed}`; }
  });

  // ——— Affichage ———
  const statusHTML = (u) => { const s = STATUS.filter(([k]) => u.st[k]).map(([, l]) => `<i>${l}</i>`).join(''); return s ? `<span class="tb-st">${s}</span>` : ''; };
  const intentHTML = (e) => {
    const p = intentPreview(st, e);
    if (!p) return '';
    const [ic, label] = INTENT[p.k] || INTENT.attack;
    const t = p.t && st.units[p.t];
    const danger = ['heavy', 'stunheavy'].includes(p.k);
    return `<span class="tb-int ${danger ? 'danger' : ''} ${p.k === 'charge' ? 'charging' : ''}">${icon(ic)}<b>${p.dmg ? p.dmg : ''}</b><em>${esc(label)}${t && t.hp > 0 && p.k !== 'aoe' ? ` · ${esc(t.name.split(' ')[0])}` : ''}</em></span>`;
  };
  // Tuiles en forme de carte : illustration pleine, nom et PV posés en bas
  const enemyTile = (u, active) => `<button class="tb-u enemy ${active ? 'active' : ''} ${u.boss ? 'boss' : ''} ${u.st.charging ? 'charging' : ''}" data-uid="${u.uid}" style="--rc:${RARITY[u.rarity]?.color || '#888'}">
      <span class="tb-art"><img alt="" src="${artUrl(cat.get(u.id))}"></span>
      ${intentHTML(u)}
      ${statusHTML(u)}
      <span class="tb-foot"><span class="tb-nm">${esc(u.name)}</span><span class="tb-sub">${u.boss ? 'Gardien · ' : u.elite ? 'Élite · ' : ''}Niv. ${u.level}${st.mastery?.[u.id] ? ` · <b class="tb-know">${icon('book')}+${Math.round((st.mastery[u.id] === true ? 0.1 : st.mastery[u.id]) * 100)} %</b>` : ''}</span>
        <span class="tb-hp"><span class="hpbar"><i style="width:${Math.max(0, u.hp / u.maxHp) * 100}%"></i></span><b>${Math.max(0, u.hp)}</b></span></span>
    </button>`;
  const heroTile = (u, active) => {
    const h = HEROES[u.id];
    return `<button class="tb-u heroic ${active ? 'active' : ''} ${u.hp <= 0 ? 'dead' : ''}" data-uid="${u.uid}" style="--rc:${h.color}">
      <span class="tb-art"><img alt="" src="${heroArtUrl(u.id)}"></span>
      ${statusHTML(u)}${u.st.protectedBy ? '<span class="tb-prot">' + icon('shield') + '</span>' : ''}
      <span class="tb-foot"><span class="tb-nm">${esc(h.name.split(' ')[0])} <small>Niv. ${u.level}</small></span>
        <span class="tb-hp"><span class="hpbar"><i style="width:${Math.max(0, u.hp / u.maxHp) * 100}%"></i></span><b>${Math.max(0, u.hp)}</b></span>
        <span class="tb-en">${Array.from({ length: MAX_ENERGY }, (_, i) => `<i class="${i < u.energy ? 'on' : ''}"></i>`).join('')}${h.res ? `<span class="tb-res" title="${RES_NAMES[h.res] || ''}"><i style="width:${u.res || 0}%"></i></span>` : ''}</span></span>
    </button>`;
  };
  function draw() {
    if (!alive_) return;
    const cur = current(st);
    const en = front(st, 'enemy'), reserve = alive(st, 'enemy').length - en.length;
    enEl.dataset.n = en.length;
    enEl.innerHTML = en.map((u) => enemyTile(u, cur && cur.uid === u.uid)).join('') + (reserve > 0 ? `<span class="tb-bench">+${reserve}</span>` : '');
    alEl.innerHTML = st.order.ally.map((id) => heroTile(st.units[id], cur && cur.uid === id)).join('');
    lineEl.innerHTML = timeline(st, 8).map((id, i) => { const u = st.units[id]; return `<span class="tb-t ${u.side} ${i === 0 ? 'now' : ''}"><img alt="" src="${u.kind === 'hero' ? heroArtUrl(u.id) : artUrl(cat.get(u.id), { lite: true })}"></span>`; }).join('');
    if (invDef) {
      $('.tb-g-bar i').style.width = `${st.gauge || 0}%`;
      $('.tb-g-v').textContent = (st.gauge || 0) >= 100 ? 'PRÊTE !' : `${Math.floor(st.gauge || 0)} %`;
      $('.tb-gauge').classList.toggle('full', (st.gauge || 0) >= 100);
    }
  }
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);
  const say = (html) => { msgEl.innerHTML = html; };
  const float = (uid, txt, cls) => { const t = el(uid); if (!t) return; const f = document.createElement('span'); f.className = `dc-float ${cls}`; f.textContent = txt; t.appendChild(f); setTimeout(() => f.remove(), 950); };
  const bump = (uid, cls) => { const t = el(uid); if (t) { t.classList.remove(cls); void t.offsetWidth; t.classList.add(cls); } };

  async function summonFx(key) {
    const inv = INVOCATIONS[key]; if (!inv) return;
    const fx = document.createElement('div');
    fx.className = 'tb-summon';
    fx.style.setProperty('--ic', inv.color);
    fx.innerHTML = `<img alt="" src="${artUrl(cat.get(inv.card))}"><b>${esc(inv.name)}</b>`;
    root.querySelector('.tb').appendChild(fx);
    app.sfx.reveal('M');
    try { navigator.vibrate?.([30, 40, 60]); } catch (e) { /* rien */ }
    await wait(reduced ? 300 : 1500 / Math.min(ui.speed, 2));
    fx.classList.add('out');
    setTimeout(() => fx.remove(), 400);
  }

  async function play(ev) {
    for (const e of ev) {
      if (!alive_) return;
      const u = e.u && st.units[e.u];
      if (e.d !== undefined && ['hit', 'dot'].includes(e.t)) {
        draw();
        if (e.a) bump(e.a, st.units[e.a]?.side === 'enemy' ? 'lunge-down' : 'lunge');
        bump(e.u, 'struck');
        float(e.u, `${e.crit ? '✦ ' : ''}${e.shatter ? 'BRISURE ' : ''}-${e.d}`, e.poison ? 'venom' : e.burn ? 'crit' : e.crit || e.counter || e.shatter || e.big ? 'crit' : 'dmg');
        if (e.dodge) float(e.u, 'Parade', 'spell');
        app.sfx.hit();
        await wait(step(e.crit || e.big || e.heavy ? 520 : e.aoe ? 220 : 380));
        continue;
      }
      switch (e.t) {
        case 'skill': say(`<b>${esc(u.name.split(' ')[0])}</b> · ${esc(e.name)}`); app.sfx.summon(); await wait(step(360)); break;
        case 'intent': { const [, label] = INTENT[e.k] || INTENT.attack; if (e.k !== 'charge') say(`<b class="dc-bad">${esc(u.name)}</b> · ${esc(label)}`); await wait(step(e.k === 'charge' ? 50 : 250)); break; }
        case 'charge': say(`<b class="dc-bad">${esc(u.name)}</b> prépare une attaque dévastatrice !`); draw(); bump(e.u, 'charge-pulse'); await wait(step(700));
          if (!ui.auto) await coach(app, 'b-charge', 'Cet ennemi <b>prépare un gros coup</b> pour son prochain tour. Trois réponses : l’<b>interrompre</b> (Lance de givre de Morgane), <b>protéger</b> sa cible (Égide d’Aldric), ou le <b>parer</b> : touche l’écran quand le cercle rouge se resserre sur ton héros.', { title: 'Attaque préparée' });
          break;
        case 'interrupt': draw(); float(e.u, 'INTERROMPU !', 'crit'); app.sfx.coin(); await wait(step(600)); break;
        case 'heal': draw(); float(e.u, `+${e.d}`, 'heal'); await wait(step(280)); break;
        case 'parry': draw(); bump(e.u, 'parry'); float(e.u, 'PARADE !', 'crit'); app.sfx.coin(); await wait(step(450)); break;
        case 'cover': draw(); float(e.v, 'Protégé', 'spell'); await wait(step(200)); break;
        case 'block': draw(); float(e.u, 'Bloqué', 'spell'); await wait(step(300)); break;
        case 'dodge': draw(); float(e.u, 'Esquive', 'spell'); await wait(step(300)); break;
        case 'status': draw(); float(e.u, e.s, 'spell'); await wait(step(300)); break;
        case 'stunned': say(`<b>${esc(u.name)}</b> est étourdi.`); draw(); float(e.u, 'Étourdi', 'spell'); await wait(step(500)); break;
        case 'defend': draw(); float(e.u, 'Défense', 'spell'); await wait(step(280)); break;
        case 'summon': draw(); await summonFx(e.inv); break;
        case 'revive': draw(); float(e.u, 'Relevé !', 'heal'); await wait(step(400)); break;
        case 'item': draw(); await wait(step(250)); break;
        case 'die': { const t = el(e.u); t?.classList.add('dead'); await wait(step(450)); draw(); break; }
        default: break;
      }
    }
    draw();
  }

  // Cercle de rythme : toucher quand il atteint la carte. Fenêtre généreuse.
  function rhythm(uid, label, kind) {
    return new Promise(async (resolve) => {
      const t = el(uid);
      if (!t || !alive_) return resolve('miss');
      await wait(200 + Math.random() * (kind === 'parry' ? 500 : 150));
      if (!alive_) return resolve('miss');
      const ring = document.createElement('span');
      ring.className = `tb-ring ${kind}`;
      ring.innerHTML = `<i></i><b>${label}</b>`;
      t.appendChild(ring);
      const D = 1050 / Math.min(ui.speed, 1.5);
      ring.style.setProperty('--d', `${D}ms`);
      const t0 = performance.now();
      let done = false;
      const finish = (r) => {
        if (done) return; done = true;
        root.removeEventListener('pointerdown', tap, true);
        ring.classList.add(r);
        ring.querySelector('b').textContent = r === 'perfect' ? 'PARFAIT !' : r === 'good' ? 'Bien' : 'Raté';
        setTimeout(() => ring.remove(), 450);
        resolve(r);
      };
      const tap = (e) => {
        e.preventDefault(); e.stopPropagation();
        const k = (performance.now() - t0) / D;
        finish(k >= 0.8 && k <= 1.12 ? 'perfect' : k >= 0.55 && k <= 1.22 ? 'good' : 'miss');
      };
      root.addEventListener('pointerdown', tap, true);
      setTimeout(() => finish('miss'), D * 1.25);
    });
  }

  // Fiche d'un ennemi (sa carte, son niveau, son comportement)
  function enemyInfo(u) {
    const c = cat.get(u.id), kills = g.huntKills(u.id), stage = huntStage(kills);
    const owned = g.owns(u.id), known = stage >= 1 || owned, bonus = Math.round(g.knowledge(u.id) * 100);
    openSheet(`<div class="tb-info">
      <div class="tb-info-card">${cardHTML(c, { size: 'full', mystery: !g.owns(c.id) && stage < 0, nameKnown: true })}</div>
      <h3>${esc(u.name)} · niveau ${u.level}${u.boss ? ' · gardien' : u.elite ? ' · élite' : ''}</h3>
      <dl class="facts"><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div><div><dt>Attaque</dt><dd>${u.atk}</dd></div><div><dt>Défense</dt><dd>${u.def}</dd></div><div><dt>Vitesse</dt><dd>${u.spd}</dd></div></dl>
      <p class="small"><b>${esc(FAMILIES[u.family].name)}</b>${known ? ` : ${esc(FAMILIES[u.family].desc)}` : ' : comportement inconnu. Obtiens sa carte, ou vaincs-la 5 fois, pour l’étudier.'}</p>
      <p class="small ${bonus ? 'dc-good' : 'muted'}">${icon('book')} ${bonus ? `Tu la connais : tes héros lui infligent +${bonus} % de dégâts.` : 'Possède sa carte pour connaître son point faible (+10 % de dégâts).'}</p>
      <p class="small muted">Bestiaire de chasse : ${stage < 0 ? 'jamais vaincue' : `${esc(HUNT_STAGES[stage].name)} (${kills} victoire${kills > 1 ? 's' : ''})`}.</p>
    </div>`, { label: u.name });
  }

  // ——— Choix du joueur ———
  function choose(u) {
    return new Promise((resolve) => {
      let targeting = null;
      pick = (a) => { pick = null; targeting = null; cmdEl.innerHTML = ''; root.querySelectorAll('.tb-u.target').forEach((x) => x.classList.remove('target')); resolve(a); };
      const h = HEROES[u.id];
      const menu = () => {
        targeting = null;
        root.querySelectorAll('.tb-u.target').forEach((x) => x.classList.remove('target'));
        const items = ['baume', 'elixir'].filter((k) => g.itemCount(k));
        cmdEl.innerHTML = `
          <div class="tb-acts">
            ${canInvoke(st) ? `<button class="tb-a inv" data-c="invoke" style="--ic:${invDef.color}">${icon('sparkle')}<b>Invoquer ${esc(invDef.name)}</b></button>` : ''}
            <button class="tb-a main" data-c="attack">${icon('swords')}<b>Attaque</b></button>
            ${u.skills.map((k) => `<button class="tb-a" data-c="skill" data-k="${k}" ${u.energy < SKILLS[k].cost ? 'disabled' : ''}><span class="tb-cost">${'◆'.repeat(SKILLS[k].cost)}</span><b>${esc(SKILLS[k].name)}</b><small>${esc(SKILLS[k].desc)}</small></button>`).join('')}
            <button class="tb-a" data-c="defend">${icon('shield')}<b>Défendre</b><small>Dégâts ÷2, +1 énergie</small></button>
            ${items.length ? `<button class="tb-a" data-c="items">${icon('heart')}<b>Objet</b><small>${items.map((k) => `${k === 'baume' ? 'Baume' : 'Élixir'} ×${g.itemCount(k)}`).join(' · ')}</small></button>` : ''}
          </div>`;
      };
      const selectTarget = (ids, then, hint) => {
        if (ids.length === 1) return then(ids[0]);
        targeting = then;
        cmdEl.innerHTML = `<p class="tb-who">${hint}</p><button class="btn small ghost" data-c="menu">${icon('back')}Retour</button>`;
        ids.forEach((id) => el(id)?.classList.add('target'));
      };
      root.onclick = (e) => {
        const tile = e.target.closest('.tb-u');
        if (tile && targeting && tile.classList.contains('target')) { const f = targeting; targeting = null; f(tile.dataset.uid); return; }
        if (tile && !targeting && tile.classList.contains('enemy')) { enemyInfo(st.units[tile.dataset.uid]); return; }
        const b = e.target.closest('.tb-cmd [data-c]');
        if (!b || b.disabled || !pick) return;
        const c = b.dataset.c;
        if (c === 'menu') return menu();
        if (c === 'invoke') return pick({ actor: u.uid, action: 'invoke' });
        if (c === 'attack') return selectTarget(targets(st, u, 'enemy'), (t) => pick({ actor: u.uid, action: 'attack', target: t }), 'Choisis une cible');
        if (c === 'defend') return pick({ actor: u.uid, action: 'defend' });
        if (c === 'skill') {
          const k = b.dataset.k, kind = SKILLS[k].target;
          if (kind === 'enemy') return selectTarget(targets(st, u, 'enemy'), (t) => pick({ actor: u.uid, action: 'skill', skill: k, target: t }), 'Choisis une cible');
          if (kind === 'ally') return selectTarget(targets(st, u, 'ally'), (t) => pick({ actor: u.uid, action: 'skill', skill: k, target: t }), 'Choisis un allié');
          return pick({ actor: u.uid, action: 'skill', skill: k });
        }
        if (c === 'items') {
          cmdEl.innerHTML = `<p class="tb-who">Utiliser un objet</p><div class="tb-acts">
            ${g.itemCount('baume') ? `<button class="tb-a" data-c="baume"><b>Baume ×${g.itemCount('baume')}</b><small>50 % des PV d’un héros</small></button>` : ''}
            ${g.itemCount('elixir') ? `<button class="tb-a" data-c="elixir"><b>Élixir ×${g.itemCount('elixir')}</b><small>40 % des PV à toute l’équipe</small></button>` : ''}
            <button class="tb-a" data-c="menu">${icon('back')}<b>Retour</b></button></div>`;
          return;
        }
        if (c === 'baume') return selectTarget(targets(st, u, 'ally'), (t) => { try { pick({ actor: u.uid, action: 'item', item: 'baume', target: t, ...g.battleItem('baume') }); } catch (err) { toast(esc(err.message), { kind: 'error' }); menu(); } }, 'Soigner quel héros ?');
        if (c === 'elixir') { try { pick({ actor: u.uid, action: 'item', item: 'elixir', ...g.battleItem('elixir') }); } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
      };
      menu();
    });
  }
  const singleStrike = (a) => a.action === 'attack' || (a.action === 'skill' && SKILLS[a.skill]?.target === 'enemy');

  // ——— Boucle du combat ———
  async function loop() {
    draw();
    while (alive_ && !st.over) {
      let u = current(st);
      if (!u) break;
      if (st.pending !== u.uid) {
        const b = beginTurn(st);
        if (b.ev.length) await play(b.ev);
        if (!alive_) return;
        if (b.skip) { g.persist(); continue; }
        u = current(st);
        st.pending = u.uid;
        g.persist();
      }
      draw();
      let a;
      if (u.kind === 'enemy') {
        const p = intentPreview(st, u);
        const tgt = p?.t && st.units[p.t];
        let parry = 'miss';
        if (!ui.auto && tgt && ['heavy', 'stunheavy'].includes(p.k) && !st.resumedParry) {
          say(`<b class="dc-bad">${esc(u.name)}</b> frappe ${esc(tgt.name.split(' ')[0])} : <b>pare !</b>`);
          parry = await rhythm(tgt.uid, 'Pare !', 'parry');
        } else await wait(step(450));
        a = { actor: u.uid, action: 'enemy', parry };
      } else if (ui.auto) {
        a = plan(st, u);
        await wait(step(320));
      } else {
        say(`À toi de jouer : <b>${esc(HEROES[u.id].name.split(' ')[0])}</b>`);
        await coach(app, 'b-turn', 'C’est le tour de <b>' + esc(HEROES[u.id].name.split(' ')[0]) + '</b> (sa carte est soulevée). Touche <b>Attaque</b>, puis l’ennemi à frapper.<br><br>Au-dessus de chaque ennemi s’affiche <b>ce qu’il fera</b> à son tour, et sur qui. Les <b>◆</b> sous tes héros sont leur énergie : les compétences en coûtent, et on en regagne un à chaque tour.', { title: 'Ton premier combat' });
        if (canInvoke(st)) await coach(app, 'b-gauge', `La jauge est pleine : touche <b>Invoquer ${esc(invDef?.name || '')}</b> pour appeler ton invocation. Elle se remplit quand tes héros agissent ou sont frappés.`, { title: 'Invocation prête' });
        a = await choose(u);
        if (!alive_) return;
        if (!a) a = plan(st, u);
        if (!ui.auto && ui.rhythm && singleStrike(a)) await coach(app, 'b-strike', 'Un cercle doré va se resserrer sur la cible. <b>Touche l’écran</b> quand il touche la carte : frappe <b>parfaite</b>, dégâts augmentés. Tu peux couper ce bonus avec le bouton ✦ en haut.', { title: 'Frappe en rythme' });
        if (!ui.auto && ui.rhythm && singleStrike(a)) a.strike = await rhythm(a.target || front(st, 'enemy')[0]?.uid, 'Frappe !', 'strike');
      }
      if (!alive_) return;
      st.pending = null;
      const ev = act(st, a);
      g.persist();
      await play(ev);
    }
    if (!alive_) return;
    cmdEl.innerHTML = '';
    say(st.over === 'won' ? '<b class="dc-good">Victoire !</b>' : '<b class="dc-bad">Défaite…</b>');
    await wait(step(700));
    if (alive_) { document.body.classList.remove('battle-mode'); root.onclick = null; onEnd(); }
  }
  loop();
  return { stop() { alive_ = false; document.body.classList.remove('battle-mode'); root.onclick = null; if (pick) pick(null); } };
}
