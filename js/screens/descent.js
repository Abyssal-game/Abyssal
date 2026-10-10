// La Descente : équipe, expédition étage par étage, combats animés, butin.
import { RARITY, VARIANTS } from '../config.js';
import { DESCENT, ROOMS, BLESSINGS, unitPower, factionBonus } from '../core/descent.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, confirmBox, bindActions } from '../ui/dom.js';

const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hours = (ms) => { const h = Math.ceil(ms / 3600000); return `${h} h`; };

export default function descent(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.descent ||= { cursed: false, speed: 1, outcome: null });
  let playing = false, skip = false;

  // ——— Accueil de la Descente ——————————————————————————————————————————
  function lobby() {
    const d = g.descent();
    const team = d.team.filter((id) => g.owns(id));
    const units = g.teamUnits(team);
    const fb = factionBonus(team.map((id) => cat.get(id)));
    const ready = team.filter((id) => !g.isWounded(id)).length;
    const torches = g.torchesLeft();
    const last = ui.outcome;
    root.innerHTML = `
      <header class="screen-head dc-head"><h1>La Descente</h1><p class="muted">Chaque jour, l’Abysse change de visage. Jusqu’où oseras-tu descendre ?</p></header>
      ${last ? summaryHTML(last) : ''}
      <section class="panel dc-stats">
        <div><span class="dc-torches">${Array.from({ length: DESCENT.torches }, (_, i) => `<i class="${i < torches ? 'on' : ''}">${icon('flame')}</i>`).join('')}</span><span class="small muted">Torches du jour</span></div>
        <div><b>${d.bestToday ? `Étage ${d.bestToday}` : '—'}</b><span class="small muted">Record du jour</span></div>
        <div><b>${d.best ? `Étage ${d.best}` : '—'}</b><span class="small muted">Record absolu</span></div>
      </section>
      <h2 class="section-title">Ton équipe <span class="small muted">${team.length} / ${DESCENT.teamSize}</span></h2>
      <div class="dc-team">${Array.from({ length: DESCENT.teamSize }, (_, i) => {
        const id = team[i];
        if (!id) return `<button class="dc-slot empty" data-act="team" aria-label="Ajouter une carte">${icon('plus')}</button>`;
        const c = cat.get(id), w = g.isWounded(id);
        return `<button class="dc-slot ${w ? 'wounded' : ''}" data-act="team">${cardHTML(c, { variant: g.bestCombatVariant(id) })}<span class="dc-lv">Niv. ${g.cardLevel(id)}</span>${w ? `<span class="dc-wound">${icon('heart')}${hours(g.woundLeft(id))}</span>` : ''}</button>`;
      }).join('')}</div>
      <p class="small muted">${team.length ? `Puissance ${fmt(units.reduce((a, u) => a + unitPower(u), 0))}${fb.bonus ? ` · bonus ${esc(cat.faction[fb.faction].name)} +${Math.round(fb.bonus * 100)} % (${fb.n} cartes)` : ' · 3 cartes d’une même faction donnent un bonus'}` : 'Choisis jusqu’à 6 cartes. Les variantes et les niveaux rendent tes cartes plus fortes.'}</p>
      <button class="btn block" data-act="team">${icon('cards')}Composer l’équipe</button>
      <div class="ri-forbid dc-curse ${ui.cursed ? 'on' : ''}"><div><b>${icon('skull')} Descente maudite</b><p class="small">Butin <b>doublé</b>. Mais une carte qui tombe est <b>perdue</b> (un exemplaire quitte ta collection).</p></div>
        <button class="switch" role="switch" aria-checked="${ui.cursed}" data-act="curse" aria-label="Descente maudite"><i></i></button></div>
      <button class="btn ${ui.cursed ? 'danger' : 'primary'} block big-cta" data-act="start" ${torches && ready >= 3 ? '' : 'disabled'}>${icon('flame')}${torches ? 'Allumer une torche et descendre' : 'Plus de torche : reviens demain'}</button>
      ${ready < 3 ? `<p class="small muted center">Il faut au moins 3 cartes en état de combattre.</p>` : ''}
      <details class="panel dc-rules"><summary>${icon('info')} Comment ça marche</summary>
        <ul class="small">
          <li>Chaque jour : ${DESCENT.torches} torches, donc ${DESCENT.torches} expéditions. Le donjon est le même pour tout le monde ce jour-là.</li>
          <li>À chaque étage, choisis une porte : combat, élite, autel, source, trésor. Tous les ${DESCENT.bossEvery} étages, un gardien garde le passage (et un booster).</li>
          <li>Les combats sont automatiques : les 3 premières cartes se battent, les autres prennent la relève. Les PV ne remontent pas d’un étage à l’autre.</li>
          <li>Après chaque étage : <b>remonter</b> avec le butin, ou <b>descendre</b> plus bas pour plus. Si toute l’équipe tombe, la moitié du butin est perdue.</li>
          <li>Une carte tombée se repose ${DESCENT.woundHours} h. En descente maudite, elle est perdue.</li>
          <li>Les cartes gagnent de l’expérience (niveau 10 maximum, +6 % par niveau). Les variantes donnent aussi de la force : holographique +5 %, chromatique +8 %, or +12 %, cosmique +16 %.</li>
        </ul></details>`;
    lazyArt(root);
  }

  function summaryHTML(s) {
    const lootLine = [s.loot.shards ? `${icon('crystal')} ${fmt(s.loot.shards)} éclats` : '', s.loot.ash ? `${icon('ash')} ${fmt(s.loot.ash)} cendres` : '', ...Object.entries(s.loot.tickets || {}).map(([t, n]) => `${icon('ticket')} ${n} booster${n > 1 ? 's' : ''} ${t === 'premium' ? 'premium' : 'standard'}`)].filter(Boolean).join(' · ');
    return `<section class="panel ornate dc-sum ${s.wiped ? 'lost' : 'won'}">
      <h2>${s.wiped ? 'L’équipe est tombée' : 'Retour à la surface'}</h2>
      <p class="dc-depth">Étage <b>${s.floor}</b></p>
      <p class="small">${lootLine || 'Aucun butin.'}${s.wiped ? ' <span class="muted">(la moitié a été perdue)</span>' : ''}</p>
      ${s.levelUps.length ? `<p class="small">${icon('sparkle')} ${s.levelUps.map((l) => `${esc(cat.get(l.id).name)} passe niveau ${l.level}`).join(', ')}</p>` : ''}
      ${s.lostCards.length ? `<p class="small dc-bad">${icon('skull')} Perdues : ${s.lostCards.map((l) => `${esc(cat.get(l.id).name)}${l.variant !== 'normal' ? ` (${esc(VARIANTS[l.variant].name)})` : ''}`).join(', ')}</p>` : s.fallen.length ? `<p class="small muted">${icon('heart')} Au repos ${DESCENT.woundHours} h : ${s.fallen.map((id) => esc(cat.get(id).name)).join(', ')}</p>` : ''}
      <div class="row gap wrap"><button class="btn small" data-act="share">${icon('upload')}Partager mon score</button><button class="btn small ghost" data-act="dismiss">OK</button></div>
    </section>`;
  }

  // ——— Expédition en cours ————————————————————————————————————————————
  function teamStrip(run) {
    return `<div class="dc-strip">${run.team.map((m) => { const c = cat.get(m.id); return `<div class="dc-mini ${m.fallen ? 'fallen' : ''}" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"><span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span></div>`; }).join('')}</div>`;
  }
  function runHead(run) {
    return `<header class="dc-run-head">
      <div><span class="small muted">${run.cursed ? `<span class="dc-bad">${icon('skull')} Maudite</span> · ` : ''}La Descente</span><h1>Étage ${run.floor}</h1></div>
      <div class="dc-loot"><span>${icon('crystal')}${fmt(run.loot.shards)}</span><span>${icon('ash')}${fmt(run.loot.ash)}</span>${Object.values(run.loot.tickets).reduce((a, b) => a + b, 0) ? `<span>${icon('ticket')}${Object.values(run.loot.tickets).reduce((a, b) => a + b, 0)}</span>` : ''}</div>
    </header>
    ${teamStrip(run)}
    ${run.blessings.length ? `<div class="chips dc-bless">${run.blessings.map((k) => `<span class="chip" title="${esc(BLESSINGS[k].desc)}">${icon('star')}${esc(BLESSINGS[k].name)}</span>`).join('')}</div>` : ''}`;
  }
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}
      <p class="dc-prompt">${doors.length > 1 ? 'Deux passages s’ouvrent devant toi.' : 'Un gardien barre la route.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r}" data-act="door" data-r="${r}"><span class="dc-door-ic">${icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${ROOMS[r].desc}</span></button>`).join('')}</div>
      ${run.cleared ? `<button class="btn ghost block" data-act="leave">${icon('back')}Remonter avec le butin</button>` : ''}`;
  }
  function clearedView(run, extra = '') {
    const nextBoss = (run.floor + 1) % DESCENT.bossEvery === 0;
    root.innerHTML = `${runHead(run)}
      ${extra}
      <div class="dc-choice">
        <button class="btn primary block big-cta" data-act="next">${icon('next')}Descendre à l’étage ${run.floor + 1}${nextBoss ? ' (gardien)' : ''}</button>
        <button class="btn block" data-act="leave">${icon('back')}Remonter avec le butin</button>
        <p class="small muted center">Si toute l’équipe tombe plus bas, la moitié du butin est perdue${run.cursed ? ' et les cartes tombées aussi' : ''}.</p>
      </div>`;
  }
  function altarView(run) {
    root.innerHTML = `${runHead(run)}
      <p class="dc-prompt">L’autel murmure. Choisis une bénédiction pour le reste de l’expédition.</p>
      <div class="dc-altar">${run.altar.map((k) => `<button class="dc-bl" data-act="bless" data-k="${k}"><span>${icon('star')}</span><b>${esc(BLESSINGS[k].name)}</b><span class="small">${esc(BLESSINGS[k].desc)}</span></button>`).join('')}</div>`;
  }
  function render() {
    const run = g.descent().run;
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    return clearedView(run);
  }

  // ——— Combat animé ——————————————————————————————————————————————————
  async function playFight(f, room, run) {
    playing = true; skip = false;
    const units = new Map();
    const allies = f.allies.map((u) => ({ ...u })), enemies = f.enemies.map((u) => ({ ...u }));
    [...allies, ...enemies].forEach((u) => units.set(u.uid, u));
    root.innerHTML = `<div class="dc-battle ${room}">
      <div class="dc-bhead"><b>${room === 'boss' ? 'Gardien de l’étage' : room === 'elite' ? 'Combat d’élite' : 'Combat'} · étage ${run.floor}</b>
        <span class="row gap"><button class="btn small ghost" data-b="speed">×${ui.speed}</button><button class="btn small ghost" data-b="skip">Passer</button></span></div>
      <div class="dc-side enemy" id="dc-en"></div>
      <div class="dc-vs"><span id="dc-round">Tour 1</span></div>
      <div class="dc-side ally" id="dc-al"></div>
      <div class="dc-bend" hidden></div>
    </div>`;
    const tile = (u) => { const c = cat.get(u.id); return `<div class="dc-u ${u.hp <= 0 ? 'dead' : ''} ${u.remnant ? 'remnant' : ''}" data-uid="${u.uid}" style="--rc:${RARITY[u.rarity]?.color || '#888'}">
      <div class="dc-u-art"><img alt="" src="${artUrl(c, { lite: true })}"></div>
      <div class="dc-u-info"><span class="dc-u-nm">${esc(u.remnant ? 'Reste' : u.name)}</span><span class="dc-u-st"><b class="atk">${u.atk}</b>${icon('swords')}<b class="hpn">${Math.max(0, u.hp)}</b>${icon('heart')}</span></div>
      <span class="hpbar"><i style="width:${Math.max(0, u.hp / u.maxHp) * 100}%"></i></span></div>`; };
    const drawSide = (list, el) => {
      const alive = list.filter((u) => u.hp > 0);
      const front = alive.slice(0, DESCENT.front), bench = alive.length - front.length;
      el.innerHTML = front.map(tile).join('') + (bench > 0 ? `<span class="dc-bench">+${bench}</span>` : '');
    };
    const en = root.querySelector('#dc-en'), al = root.querySelector('#dc-al');
    const redraw = () => { drawSide(enemies, en); drawSide(allies, al); };
    redraw();
    root.querySelector('.dc-battle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      if (b.dataset.b === 'skip') skip = true;
      if (b.dataset.b === 'speed') { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1; b.textContent = `×${ui.speed}`; }
    });
    const float = (uid, txt, cls) => {
      const el = root.querySelector(`[data-uid="${uid}"]`); if (!el || skip) return;
      const f2 = document.createElement('span'); f2.className = `dc-float ${cls}`; f2.textContent = txt; el.appendChild(f2);
      setTimeout(() => f2.remove(), 900);
    };
    const setHp = (u) => {
      const el = root.querySelector(`[data-uid="${u.uid}"]`); if (!el) return;
      el.querySelector('.hpbar i').style.width = `${Math.max(0, u.hp / u.maxHp) * 100}%`;
      el.querySelector('.hpn').textContent = Math.max(0, u.hp);
      el.querySelector('.atk').textContent = u.atk;
    };
    const reduced = app.reduced();
    for (const e of f.events) {
      const step = skip ? 0 : (reduced ? 120 : 330) / ui.speed;
      const u = e.u && units.get(e.u);
      switch (e.t) {
        case 'round': root.querySelector('#dc-round').textContent = `Tour ${e.n}`; break;
        case 'hit': case 'spell': case 'burst': case 'venom': {
          if (!u) break;
          u.hp = e.hp;
          const a = e.a && root.querySelector(`[data-uid="${e.a}"]`);
          if (a && !skip) { a.classList.remove('lunge'); void a.offsetWidth; a.classList.add('lunge'); }
          const t = root.querySelector(`[data-uid="${e.u}"]`);
          if (t && !skip) { t.classList.remove('struck'); void t.offsetWidth; t.classList.add('struck'); }
          setHp(u); float(e.u, `-${e.d}`, e.t === 'venom' ? 'venom' : e.t === 'hit' ? 'dmg' : 'spell');
          if (!skip && e.t === 'hit') app.sfx.hit();
          await wait(step);
          break;
        }
        case 'heal': if (u) { u.hp = e.hp; setHp(u); float(e.u, `+${e.d}`, 'heal'); await wait(step * 0.6); } break;
        case 'block': float(e.u, 'Bloqué', 'spell'); await wait(step * 0.6); break;
        case 'stun': case 'stunned': float(e.u, 'Étourdi', 'spell'); await wait(step * 0.5); break;
        case 'grow': if (u) { u.atk = e.atk; u.hp = e.hp; setHp(u); float(e.u, '+ATQ', 'heal'); } break;
        case 'die': if (u) { u.hp = 0; const t = root.querySelector(`[data-uid="${e.u}"]`); t?.classList.add('dead'); await wait(step * 1.2); redraw(); } break;
        case 'summon': { const nu = { ...e.unit }; units.set(nu.uid, nu); const list = nu.side === 'ally' ? allies : enemies; const i = list.findIndex((x) => x.uid === e.after); list.splice(i + 1, 0, nu); redraw(); break; }
        default: break;
      }
    }
    redraw();
    playing = false;
  }

  // ——— Actions ————————————————————————————————————————————————————————
  async function door(room) {
    if (playing) return;
    const run = g.descent().run;
    let out;
    try { app.pendingProgress = []; out = g.chooseDoor(room); }
    catch (e) { app.pendingProgress = null; toast(esc(e.message), { kind: 'error' }); return; }
    if (out.fight) {
      await playFight(out.fight, room, run);
      const end = root.querySelector('.dc-bend');
      if (out.lost) {
        app.sfx.error();
        end.innerHTML = `<h2 class="dc-bad">Défaite</h2><p class="small">L’Abysse a eu raison de ton équipe.</p><button class="btn primary block" data-act="after">Voir le bilan</button>`;
        ui.outcome = out.summary;
      } else {
        app.sfx.reveal(room === 'boss' ? 'M' : 'R');
        end.innerHTML = `<h2 class="dc-good">Victoire</h2><p class="small">${lootText(out.loot)}</p><button class="btn primary block" data-act="after">Continuer</button>`;
      }
      end.hidden = false;
      end.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (out.altar) {
      render();
    } else {
      const msg = room === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source referme les blessures de ton équipe.</p>`
        : room === 'treasure' ? `<p class="dc-event">${icon('crystal')} Le coffre s’ouvre : ${lootText(out.loot)}</p>`
        : out.healed ? `<p class="dc-event">${icon('star')} L’autel est muet, mais sa lumière soigne ton équipe.</p>` : '';
      app.sfx.coin();
      clearedView(g.descent().run, msg);
    }
    app.flushProgress();
  }
  const lootText = (l = {}) => [l.shards ? `+${fmt(l.shards)} éclats` : '', l.ash ? `+${fmt(l.ash)} cendres` : '', ...Object.entries(l.tickets || {}).map(([t, n]) => `+${n} booster ${t === 'premium' ? 'premium' : 'standard'}`)].filter(Boolean).join(', ') || 'Rien cette fois.';

  function share() {
    const s = ui.outcome || {};
    const d = g.descent();
    const txt = `ABYSSAL · La Descente du ${new Date().toLocaleDateString('fr-FR')} : j’ai atteint l’étage ${s.floor ?? d.bestToday}${s.cursed ? ' en descente maudite' : ''} ! Tu fais mieux ? ${location.origin}${location.pathname}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else navigator.clipboard?.writeText(txt).then(() => toast('Score copié : colle-le dans un message.', { icon: 'copy' }));
  }

  function teamPicker() {
    const d = g.descent();
    let sel = d.team.filter((id) => g.owns(id));
    const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter(Boolean);
    const power = Object.fromEntries(owned.map((c) => [c.id, unitPower(g.teamUnits([c.id])[0])]));
    owned.sort((a, b) => power[b.id] - power[a.id]);
    const sheet = openSheet('', { full: true, cls: 'dc-pick', label: 'Composer l’équipe', onClose: () => { g.setTeam(sel); render(); } });
    const draw = () => {
      sheet.setContent(`<h2>Composer l’équipe</h2>
        <p class="small muted">Touche jusqu’à ${DESCENT.teamSize} cartes. L’ordre compte : les 3 premières combattent en premier. Triées par puissance.</p>
        <div class="row gap wrap"><button class="btn small" data-p="auto">${icon('sparkle')}Équipe la plus forte</button><button class="btn small ghost" data-p="clear">Vider</button><span class="small muted">${sel.length} / ${DESCENT.teamSize}</span></div>
        <div class="grid-cards dc-grid">${owned.map((c) => { const i = sel.indexOf(c.id), w = g.isWounded(c.id); return `<div class="dc-pk ${i >= 0 ? 'on' : ''} ${w ? 'wounded' : ''}" data-id="${c.id}">${cardHTML(c, { lazy: true, variant: g.bestCombatVariant(c.id) })}<span class="dc-pow">${power[c.id]}</span><span class="dc-lv">Niv. ${g.cardLevel(c.id)}</span>${i >= 0 ? `<span class="dc-ord">${i + 1}</span>` : ''}${w ? `<span class="dc-wound">${icon('heart')}${hours(g.woundLeft(c.id))}</span>` : ''}</div>`; }).join('')}</div>
        <button class="btn primary block dc-ok" data-p="ok">Valider l’équipe</button>`);
      lazyArt(sheet.body);
    };
    sheet.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (b) {
        if (b.dataset.p === 'auto') sel = owned.filter((c) => !g.isWounded(c.id)).slice(0, DESCENT.teamSize).map((c) => c.id);
        if (b.dataset.p === 'clear') sel = [];
        if (b.dataset.p === 'ok') { sheet.close(); return; }
        draw(); return;
      }
      const t = e.target.closest('.dc-pk');
      if (!t) return;
      const id = t.dataset.id;
      if (sel.includes(id)) sel = sel.filter((x) => x !== id);
      else if (sel.length < DESCENT.teamSize) sel = [...sel, id];
      else { toast(`Ton équipe est complète (${DESCENT.teamSize} cartes).`, { icon: 'info' }); return; }
      app.sfx.tap();
      draw();
    });
    draw();
  }

  bindActions(root, {
    team() { if (!g.descent().run) teamPicker(); },
    curse() { ui.cursed = !ui.cursed; render(); },
    async start() {
      if (ui.cursed && !(await confirmBox('Descente maudite : chaque carte qui tombe sera <b>perdue</b>. Tu es sûr ?', { ok: 'Je descends', danger: true }))) return;
      try { g.startRun({ cursed: ui.cursed }); ui.outcome = null; app.sfx.tear(); render(); window.scrollTo(0, 0); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    door(el) { door(el.dataset.r); },
    bless(el) { try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); clearedView(g.descent().run, `<p class="dc-event">${icon('star')} ${esc(BLESSINGS[el.dataset.k].name)} : ${esc(BLESSINGS[el.dataset.k].desc)}</p>`); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    async leave() {
      if (!(await confirmBox('Remonter maintenant avec tout le butin ?', { ok: 'Remonter' }))) return;
      app.pendingProgress = [];
      ui.outcome = g.endRun(false);
      app.sfx.coin();
      render(); window.scrollTo(0, 0);
      app.flushProgress();
    },
    after() { render(); window.scrollTo(0, 0); },
    share() { share(); },
    dismiss() { ui.outcome = null; render(); },
  });
  render();
  app.refreshView = () => { if (!playing) render(); };
  return () => { app.refreshView = null; skip = true; };
}
