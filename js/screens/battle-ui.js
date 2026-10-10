// Écran de combat au tour par tour : frise d'initiative, commandes, cibles,
// parade et frappe en rythme (un cercle se resserre : toucher au bon moment).
import { RARITY } from '../config.js';
import { SKILLS, MAX_ENERGY, beginTurn, current, timeline, front, bench, targets, act, plan, skillsOf } from '../core/battle.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, toast } from '../ui/dom.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STATUS = [['stun', 'Étourdi'], ['poison', 'Poison'], ['shield', 'Égide'], ['guard', 'Provoc.'], ['hidden', 'Caché'], ['atkUp', 'ATQ+'], ['armorT', 'Carapace'], ['fear', 'Effroi'], ['defend', 'Garde']];

export function runBattle(app, root, { title, onEnd }) {
  const g = app.game, cat = app.catalog;
  const run = g.descent().run;
  const st = run.battle;
  const ui = (app.state.battle ||= { auto: false, speed: 1 });
  let alive = true;
  document.body.classList.add('battle-mode'); // plein écran : barres du haut et du bas masquées
  const reduced = app.reduced();
  const step = (ms) => (reduced ? Math.min(ms, 120) : ms) / ui.speed;

  root.innerHTML = `<div class="tb ${run.room}">
    <div class="tb-top"><b>${esc(title)}</b><span class="row gap"><button class="btn small ghost ${ui.auto ? 'on' : ''}" data-b="auto">${icon('refresh')}Auto</button><button class="btn small ghost" data-b="speed">×${ui.speed}</button></span></div>
    <div class="tb-line" aria-label="Ordre des tours"></div>
    <div class="tb-side enemy"></div>
    <div class="tb-msg" aria-live="polite"></div>
    <div class="tb-side ally"></div>
    <div class="tb-cmd"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const lineEl = $('.tb-line'), enEl = $('.tb-side.enemy'), alEl = $('.tb-side.ally'), msgEl = $('.tb-msg'), cmdEl = $('.tb-cmd');
  root.querySelector('.tb-top').addEventListener('click', (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    if (b.dataset.b === 'auto') { ui.auto = !ui.auto; b.classList.toggle('on', ui.auto); if (ui.auto && pick) pick(null); }
    if (b.dataset.b === 'speed') { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 3 : 1; b.textContent = `×${ui.speed}`; }
  });

  // ——— Affichage ———
  const tile = (u, active) => {
    const c = cat.get(u.id);
    const sts = STATUS.filter(([k]) => u.st[k]).map(([, l]) => `<i>${l}</i>`).join('');
    return `<button class="tb-u ${u.side} ${active ? 'active' : ''}" data-uid="${u.uid}" style="--rc:${RARITY[u.rarity]?.color || '#888'}">
      <span class="tb-art"><img alt="" src="${artUrl(c, { lite: true })}"></span>
      <span class="tb-nm">${esc(u.remnant ? 'Reste' : u.name)}</span>
      <span class="tb-hp"><span class="hpbar"><i style="width:${Math.max(0, u.hp / u.maxHp) * 100}%"></i></span><b>${Math.max(0, u.hp)}</b></span>
      <span class="tb-en">${Array.from({ length: MAX_ENERGY }, (_, i) => `<i class="${i < u.energy ? 'on' : ''}"></i>`).join('')}</span>
      ${sts ? `<span class="tb-st">${sts}</span>` : ''}
    </button>`;
  };
  function draw() {
    if (!alive) return;
    const cur = current(st);
    const side = (s, el) => {
      const b = bench(st, s).length;
      el.innerHTML = front(st, s).map((u) => tile(u, cur && cur.uid === u.uid)).join('') + (b ? `<span class="tb-bench">+${b}</span>` : '');
    };
    side('enemy', enEl); side('ally', alEl);
    lineEl.innerHTML = timeline(st, 8).map((id, i) => { const u = st.units[id]; return `<span class="tb-t ${u.side} ${i === 0 ? 'now' : ''}"><img alt="" src="${artUrl(cat.get(u.id), { lite: true })}"></span>`; }).join('');
  }
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);
  const say = (html) => { msgEl.innerHTML = html; };
  const float = (uid, txt, cls) => {
    const t = el(uid); if (!t) return;
    const f = document.createElement('span'); f.className = `dc-float ${cls}`; f.textContent = txt; t.appendChild(f);
    setTimeout(() => f.remove(), 950);
  };
  const bump = (uid, cls) => { const t = el(uid); if (t) { t.classList.remove(cls); void t.offsetWidth; t.classList.add(cls); } };

  async function play(ev) {
    for (const e of ev) {
      if (!alive) return;
      const u = e.u && st.units[e.u];
      if (e.d !== undefined && ['hit', 'skill', 'burst', 'poison'].includes(e.t)) {
        draw();
        if (e.a) bump(e.a, u.side === 'enemy' ? 'lunge' : 'lunge-down');
        bump(e.u, 'struck');
        float(e.u, `${e.crit ? '✦ ' : ''}-${e.d}`, e.t === 'poison' ? 'venom' : e.crit || e.counter ? 'crit' : 'dmg');
        if (e.dodge) float(e.u, 'Esquive', 'spell');
        app.sfx.hit();
        await wait(step(e.crit ? 520 : 400));
        continue;
      }
      switch (e.t) {
        case 'skill': say(`<b>${esc(u.name)}</b> · ${esc(e.name)}`); app.sfx.summon(); await wait(step(380)); break;
        case 'heal': draw(); float(e.u, `+${e.d}`, 'heal'); await wait(step(300)); break;
        case 'parry': draw(); bump(e.u, 'parry'); float(e.u, 'PARADE !', 'crit'); app.sfx.coin(); await wait(step(420)); break;
        case 'block': draw(); float(e.u, 'Bloqué', 'spell'); await wait(step(300)); break;
        case 'status': draw(); float(e.u, e.s, 'spell'); await wait(step(320)); break;
        case 'stunned': say(`<b>${esc(u.name)}</b> est étourdi.`); draw(); float(e.u, 'Étourdi', 'spell'); await wait(step(500)); break;
        case 'defend': draw(); float(e.u, 'Garde', 'spell'); await wait(step(300)); break;
        case 'swap': draw(); await wait(step(300)); break;
        case 'item': draw(); await wait(step(250)); break;
        case 'grow': draw(); float(e.u, 'Plus fort !', 'heal'); await wait(step(300)); break;
        case 'die': { const t = el(e.u); t?.classList.add('dead'); await wait(step(500)); draw(); break; }
        case 'summon': draw(); break;
      }
    }
    draw();
  }

  // ——— Action en rythme : un cercle se resserre, toucher quand il atteint la cible ———
  function rhythm(uid, label, kind) {
    return new Promise(async (resolve) => {
      const t = el(uid);
      if (!t || !alive) return resolve('miss');
      await wait(250 + Math.random() * (kind === 'parry' ? 650 : 200)); // l'ennemi prend son élan : rythme imprévisible
      if (!alive) return resolve('miss');
      const ring = document.createElement('span');
      ring.className = `tb-ring ${kind}`;
      ring.innerHTML = `<i></i><b>${label}</b>`;
      t.appendChild(ring);
      const D = 950 / Math.min(ui.speed, 1.5);
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
        const k = (performance.now() - t0) / D; // 1 = le cercle touche la carte
        finish(k >= 0.84 && k <= 1.08 ? 'perfect' : k >= 0.62 && k <= 1.18 ? 'good' : 'miss');
      };
      root.addEventListener('pointerdown', tap, true);
      setTimeout(() => finish('miss'), D * 1.2);
    });
  }

  // ——— Choix du joueur ———
  let pick = null;
  function choose(u) {
    return new Promise((resolve) => {
      pick = (a) => { pick = null; cmdEl.innerHTML = ''; root.querySelectorAll('.tb-u.target').forEach((x) => x.classList.remove('target')); resolve(a); };
      const menu = () => {
        const sk = skillsOf(u);
        const hasBench = bench(st, 'ally').length > 0;
        const items = ['baume', 'elixir'].filter((k) => g.itemCount(k));
        cmdEl.innerHTML = `<p class="tb-who">Au tour de <b>${esc(u.name)}</b></p>
          <div class="tb-acts">
            <button class="tb-a main" data-c="attack">${icon('swords')}<b>Attaque</b></button>
            ${sk.map((k) => `<button class="tb-a" data-c="skill" data-k="${k}" ${u.energy < SKILLS[k].cost ? 'disabled' : ''}><span class="tb-cost">${'◆'.repeat(SKILLS[k].cost)}</span><b>${esc(SKILLS[k].name)}</b><small>${esc(SKILLS[k].desc)}</small></button>`).join('')}
            <button class="tb-a" data-c="defend">${icon('shield')}<b>Défendre</b><small>Dégâts ÷2, +1 énergie</small></button>
            ${items.length ? `<button class="tb-a" data-c="items">${icon('heart')}<b>Objet</b><small>${items.map((k) => `${k === 'baume' ? 'Baume' : 'Élixir'} ×${g.itemCount(k)}`).join(' · ')}</small></button>` : ''}
            ${hasBench ? `<button class="tb-a" data-c="swap">${icon('refresh')}<b>Relève</b><small>Envoyer une carte de réserve</small></button>` : ''}
          </div>`;
      };
      const selectTarget = (ids, then, hint) => {
        if (ids.length === 1) return then(ids[0]);
        cmdEl.innerHTML = `<p class="tb-who">${hint}</p><button class="btn small ghost" data-c="back">${icon('back')}Retour</button>`;
        ids.forEach((id) => el(id)?.classList.add('target'));
        const onTap = (e) => {
          const t = e.target.closest('.tb-u.target');
          if (!t) return;
          root.removeEventListener('click', onTap);
          then(t.dataset.uid);
        };
        root.addEventListener('click', onTap);
        cmdEl.querySelector('[data-c="back"]').addEventListener('click', () => { root.removeEventListener('click', onTap); root.querySelectorAll('.tb-u.target').forEach((x) => x.classList.remove('target')); menu(); }, { once: true });
      };
      cmdEl.onclick = (e) => {
        const b = e.target.closest('[data-c]');
        if (!b || b.disabled || !pick) return;
        const c = b.dataset.c;
        if (c === 'attack') selectTarget(targets(st, u, 'enemy'), (t) => pick({ actor: u.uid, action: 'attack', target: t }), 'Choisis une cible');
        if (c === 'defend') pick({ actor: u.uid, action: 'defend' });
        if (c === 'skill') {
          const k = b.dataset.k, kind = SKILLS[k].target;
          if (kind === 'enemy') selectTarget(targets(st, u, 'enemy'), (t) => pick({ actor: u.uid, action: 'skill', skill: k, target: t }), 'Choisis une cible');
          else if (kind === 'ally') selectTarget(targets(st, u, 'ally'), (t) => pick({ actor: u.uid, action: 'skill', skill: k, target: t }), 'Choisis un allié');
          else pick({ actor: u.uid, action: 'skill', skill: k });
        }
        if (c === 'swap') {
          const ids = targets(st, u, 'swap');
          cmdEl.innerHTML = `<p class="tb-who">Quelle carte envoyer ?</p><div class="tb-acts">${ids.map((id) => `<button class="tb-a" data-c="sw" data-id="${id}"><b>${esc(st.units[id].name)}</b><small>${st.units[id].hp} / ${st.units[id].maxHp} PV</small></button>`).join('')}<button class="tb-a" data-c="menu">${icon('back')}<b>Retour</b></button></div>`;
        }
        if (c === 'sw') pick({ actor: u.uid, action: 'swap', target: b.dataset.id });
        if (c === 'items') {
          cmdEl.innerHTML = `<p class="tb-who">Utiliser un objet</p><div class="tb-acts">
            ${g.itemCount('baume') ? `<button class="tb-a" data-c="baume"><b>Baume de soin ×${g.itemCount('baume')}</b><small>50 % des PV d’une carte</small></button>` : ''}
            ${g.itemCount('elixir') ? `<button class="tb-a" data-c="elixir"><b>Élixir ×${g.itemCount('elixir')}</b><small>40 % des PV à la première ligne</small></button>` : ''}
            <button class="tb-a" data-c="menu">${icon('back')}<b>Retour</b></button></div>`;
        }
        if (c === 'baume') selectTarget(targets(st, u, 'ally'), (t) => { try { pick({ actor: u.uid, action: 'item', item: 'baume', target: t, ...g.battleItem('baume') }); } catch (err) { toast(esc(err.message), { kind: 'error' }); menu(); } }, 'Soigner quelle carte ?');
        if (c === 'elixir') { try { pick({ actor: u.uid, action: 'item', item: 'elixir', ...g.battleItem('elixir') }); } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
        if (c === 'menu') menu();
      };
      menu();
    });
  }
  const isStrike = (a) => a.action === 'attack' || (a.action === 'skill' && ['enemy', 'enemies'].includes(SKILLS[a.skill]?.target));
  const singleOnAlly = (a) => (a.action === 'attack' || (a.action === 'skill' && SKILLS[a.skill]?.target === 'enemy')) && a.target;

  // ——— Boucle du combat ———
  async function loop() {
    draw();
    while (alive && !st.over) {
      let u = current(st);
      if (!u) break;
      if (st.pending !== u.uid) {
        const b = beginTurn(st);
        if (b.ev.length) await play(b.ev);
        if (b.skip) { g.persist(); continue; }
        u = current(st);
        st.pending = u.uid;
        g.persist();
      }
      draw();
      let a;
      if (u.side === 'enemy') {
        // une action ennemie déjà annoncée avant une fermeture de l'app ne peut plus être parée
        const resumed = !!st.plan && st.plan.actor === u.uid;
        a = resumed ? st.plan : plan(st, u);
        st.plan = a; g.persist();
        const verb = a.action === 'skill' ? SKILLS[a.skill].name : a.action === 'attack' ? 'Attaque' : a.action === 'defend' ? 'Se protège' : '…';
        const tgt = a.target && st.units[a.target];
        say(`<b class="dc-bad">${esc(u.name)}</b> · ${esc(verb)}${tgt && tgt.side === 'ally' ? ` sur <b>${esc(tgt.name)}</b>` : ''}`);
        let parry = 'miss';
        if (!resumed && !ui.auto && singleOnAlly(a) && tgt?.side === 'ally') parry = await rhythm(a.target, 'Pare !', 'parry');
        else await wait(step(550));
        a = { ...a, parry };
      } else if (ui.auto) {
        a = plan(st, u);
        await wait(step(350));
      } else {
        say(`À toi de jouer : <b>${esc(u.name)}</b>`);
        a = await choose(u);
        if (!a) a = plan(st, u); // l'auto vient d'être activé
        if (!alive) return;
        if (!ui.auto && isStrike(a)) a.strike = await rhythm(a.target || front(st, 'enemy')[0]?.uid, 'Frappe !', 'strike');
      }
      if (!alive) return;
      st.plan = null; st.pending = null;
      const ev = act(st, a);
      g.persist();
      await play(ev);
    }
    if (!alive) return;
    cmdEl.innerHTML = '';
    say(st.over === 'won' ? '<b class="dc-good">Victoire !</b>' : '<b class="dc-bad">Défaite…</b>');
    await wait(step(700));
    if (alive) { document.body.classList.remove('battle-mode'); onEnd(); }
  }
  loop();
  return { stop() { alive = false; document.body.classList.remove('battle-mode'); if (pick) pick(null); } };
}
