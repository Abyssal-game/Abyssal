// Chasse aux Reliques : accueil, choix des chemins, salles (combat, événement, marchand, relique), bilan.
import * as HT from '../core/hunt.js';
import { TEAM } from '../core/army.js';
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, picon, crestHTML } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { runDuel } from './duel-ui.js';

const R = HT.RELICS;
const rIcon = (k) => picon(R[k].icon);

export default function reliquesScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.reliques ||= { pick: null, drop: null, last: null });
  let battle = null;

  const strip = (run) => `<div class="v2-strip">${run.team.map((m, i) => { const c = cat.get(m.id); return `<span class="v2-mini ${i >= TEAM.active ? 'res' : ''} ${m.fallen ? 'fallen' : ''}" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}"><span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span></span>`; }).join('')}</div>`;
  const relicRow = (run) => `<div class="rq-relics">${Array.from({ length: HT.RELIC_MAX }, (_, i) => { const k = run.relics[i]; return k ? `<button class="rq-rel" data-act="relinfo" data-k="${k}" aria-label="${esc(R[k].name)}">${rIcon(k)}</button>` : '<span class="rq-rel empty"></span>'; }).join('')}</div>`;
  const loot = (run) => `<div class="rq-loot"><span class="rq-risk">${icon('crystal')}<b>${fmt(run.risk)}</b><small>en jeu</small></span><span class="rq-safe">${picon('seal')}<b>${fmt(run.safe)}</b><small>à l’abri</small></span></div>`;
  const track = (run) => `<div class="rq-track" aria-label="Salle ${run.step} sur ${HT.HUNT.rooms}">${Array.from({ length: HT.HUNT.rooms }, (_, i) => { const n = i + 1; return `<i class="${n < run.step ? 'done' : n === run.step ? 'cur' : ''} ${HT.HUNT.seuils.includes(n) ? 'seuil' : ''} ${n === HT.HUNT.rooms ? 'boss' : ''}"></i>`; }).join('')}</div>`;
  const head = (run) => `<header class="rq-head"><div class="rq-ht"><b>Salle ${Math.min(run.step, HT.HUNT.rooms)} / ${HT.HUNT.rooms}</b>${run.paid ? '' : '<span class="small muted">chasse sans récompense</span>'}</div>${track(run)}<div class="rq-hb">${loot(run)}${relicRow(run)}</div>${strip(run)}</header>`;
  const relicCard = (k, { on = false, act = 'rpick', price = null } = {}) => `<button class="rq-rc ${on ? 'on' : ''}" data-act="${act}" data-k="${k}" aria-pressed="${on}">
    <span class="rq-rc-ic">${rIcon(k)}</span><span class="rq-rc-t"><b>${esc(R[k].name)}</b><span class="rq-g"><i>Gain</i>${esc(R[k].gain)}</span><span class="rq-c"><i>Prix</i>${esc(R[k].cost)}</span></span>${price != null ? `<span class="rq-price">${icon('crystal')}${price}</span>` : ''}</button>`;

  function lobby() {
    document.body.classList.remove('battle-mode');
    setScene('descent');
    const h = g.relicHunt(), left = g.relicPaidLeft(), team = g.team(), last = ui.last;
    root.innerHTML = `<header class="screen-head ui-hero bn-cursed"><h1>Chasse aux Reliques</h1><p class="muted">Neuf salles, des reliques qui changent tout, et un butin à ramener vivant.</p>
        <span class="sc-rec">${h.runs ? `Record : ${h.best} salle${h.best > 1 ? 's' : ''} · ${h.wins || 0} gardien${(h.wins || 0) > 1 ? 's' : ''} vaincu${(h.wins || 0) > 1 ? 's' : ''}` : 'Ta première chasse t’attend'}</span></header>
      ${last ? endHTML(last) : ''}
      <section class="panel rq-how"><h2>Comment ça marche</h2><ul class="small">
        <li>Choisis une <b>relique de départ</b>, puis, à chaque salle, entre <b>deux chemins</b> : combat, événement, marchand, relique ou rencontre singulière.</li>
        <li>Tu portes <b>4 reliques</b> au plus. Chacune a un <b>gain</b> et un <b>prix</b>.</li>
        <li>Le butin gagné est <b>en jeu</b> : si l’équipe tombe, il est perdu. Il passe <b>à l’abri</b> aux seuils (après les salles ${HT.HUNT.seuils.join(' et ')}), chez le Passeur, ou si tu <b>sors</b> entre deux salles.</li>
        <li>Le <b>Gardien du Reliquaire</b> t’attend à la salle ${HT.HUNT.rooms} : coffre d’or garanti.</li></ul></section>
      <section class="panel dc-go">
        ${team.length >= TEAM.active ? strip({ team: team.map((id) => ({ id, hp: 1, maxHp: 1 })) }) : ''}
        <p class="small muted center">${left ? `${left} chasse${left > 1 ? 's' : ''} avec butin aujourd’hui (jusqu’à ${HT.HUNT.lootCap} éclats chacune)` : 'Chasses avec butin faites aujourd’hui : tu peux rejouer, sans récompense'}</p>
        <a class="btn small ghost block dc-plq dc-plq-dark" href="#/equipe">${icon('p:team-ic')}Modifier l’équipe</a>
        ${team.length < TEAM.active ? `<p class="small v2-warn center">${icon('info')} Ajoute au moins ${TEAM.active} créatures à ton équipe.</p>` : ''}
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="start" ${team.length >= TEAM.active ? '' : 'disabled'}>${picon('hunt')}${left ? 'Partir en chasse' : 'Partir (sans récompense)'}</button>
      </section>
      <h2 class="section-title">Les reliques</h2>
      <div class="rq-list">${HT.RELIC_KEYS.map((k) => relicCard(k, { act: 'relinfo' })).join('')}</div>`;
    tuto(app, 'reliques');
  }
  function endHTML(s) {
    return `<section class="dc-sum2 ${s.wiped ? 'lost' : 'won'}">${crestHTML(!s.wiped, s.won ? '★' : s.rooms, s.won ? 'Gardien' : 'Salles', 'dc-sum2-crest')}
      <h2>${s.won ? 'Le Reliquaire est à toi' : s.wiped ? 'L’équipe est tombée' : 'Retour avec le butin'}</h2>
      <p class="rq-sum">${s.paid ? `${icon('crystal')} <b>+${fmt(s.shards)}</b> éclats` : 'Chasse sans récompense'}${s.lost ? ` · <span class="muted">${fmt(s.lost)} perdus</span>` : ''}${s.chest ? ` · ${icon('p:chest')} coffre d’or` : ''}</p>
      ${s.relics.length ? `<div class="rq-relics center">${s.relics.map((k) => `<span class="rq-rel">${rIcon(k)}</span>`).join('')}</div>` : ''}
      ${s.title ? `<p class="small">${icon('p:titles')} Nouveau titre : <b>${esc(s.title)}</b></p>` : ''}${s.frame ? `<p class="small">${icon('p:titles')} Nouveau cadre : <b>Cadre des Reliques</b></p>` : ''}
      <button class="btn small ghost" data-act="okend">OK</button></section>`;
  }
  // Relique de départ, salle de relique, ou relique après une rencontre singulière
  function relicView(run) {
    const full = run.relics.length >= HT.RELIC_MAX;
    const pick = run.offer.includes(ui.pick) ? ui.pick : null;
    root.innerHTML = `${run.phase === 'start' ? '' : head(run)}
      <section class="pk-head"><img alt="" src="assets/icons/crown.webp"><div><h2>${run.phase === 'start' ? 'Ta relique de départ' : 'Un reliquaire s’ouvre'}</h2><p class="small">${run.phase === 'start' ? 'Elle t’accompagnera toute la chasse. Choisis-la bien.' : 'Prends une relique, ou laisse-les dormir.'}</p></div></section>
      <div class="rq-list">${run.offer.map((k) => relicCard(k, { on: pick === k })).join('')}</div>
      ${pick && full ? `<p class="small center">Tu portes déjà ${HT.RELIC_MAX} reliques. Touche celle que tu laisses ici&nbsp;:</p><div class="rq-relics center">${run.relics.map((k) => `<button class="rq-rel ${ui.drop === k ? 'drop' : ''}" data-act="rdrop" data-k="${k}" aria-label="Laisser ${esc(R[k].name)}">${rIcon(k)}</button>`).join('')}</div>` : ''}
      <div class="pk-actions">${pick && (!full || ui.drop) ? `<button class="btn primary block big-cta dc-plq dc-plq-red" data-act="rtake">Prendre ${esc(R[pick].name)}</button>` : `<p class="small muted center">${pick ? 'Choisis la relique à laisser.' : 'Touche une relique pour la choisir.'}</p>`}
        <button class="btn block dc-plq dc-plq-dark" data-act="rskip">${run.phase === 'start' ? 'Partir sans relique' : 'Laisser le reliquaire'}</button></div>`;
  }
  function pathsView(run) {
    root.innerHTML = `${head(run)}
      ${run.secured ? `<p class="rq-note">${picon('seal')} Seuil franchi : <b>${fmt(run.secured)}</b> éclats mis à l’abri.</p>` : ''}
      <p class="dc-prompt">${run.step === HT.HUNT.rooms ? 'Le Gardien du Reliquaire t’attend.' : 'Deux passages s’ouvrent devant toi.'}</p>
      <div class="rq-paths">${run.paths.map((r) => `<button class="rq-path r-${r}" data-act="go" data-r="${r}"><span class="rq-pi">${icon(HT.ROOMS[r].icon)}</span><span><b>${esc(HT.ROOMS[r].name)}</b><span class="small">${esc(HT.ROOMS[r].desc)}</span></span>${icon('next')}</button>`).join('')}</div>
      <button class="btn block dc-plq dc-plq-dark rq-exit" data-act="exit">${picon('stairs-up')}Sortir avec le butin (${fmt(run.risk + run.safe)})</button>`;
  }
  function eventView(run) {
    const ev = HT.EVENT[run.event];
    root.innerHTML = `${head(run)}<section class="panel rq-ev"><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
      <div class="rq-evc">${ev.choices.map((c, i) => `<button class="btn block rq-ch" data-act="ev" data-i="${i}" ${c.needRelic && !run.relics.length ? 'disabled' : ''}><b>${esc(c.label)}</b><span class="small">${esc(c.desc)}</span></button>`).join('')}</div></section>`;
  }
  function merchantView(run) {
    const P = (k) => HT.shopPrice(k, run.relics), have = run.risk + run.safe;
    const fallen = run.team.filter((m) => m.fallen);
    root.innerHTML = `${head(run)}<section class="panel rq-shop"><h2>${picon('ticket')} Le marchand</h2><p class="small muted">On paie avec le butin : d’abord celui en jeu, puis celui à l’abri.${run.relics.includes('lanterne') ? ' La Lanterne des Noyés te coûte 25 % de plus.' : ''}</p>
      <button class="rq-item" data-act="buy" data-k="heal" ${run.shop.heal || have < P('heal') ? 'disabled' : ''}><b>${esc(HT.SHOP.heal.name)}</b><span class="small">${esc(HT.SHOP.heal.desc)}</span><span class="rq-price">${run.shop.heal ? 'acheté' : `${icon('crystal')}${P('heal')}`}</span></button>
      ${fallen.map((m) => `<button class="rq-item" data-act="buy" data-k="revive" data-id="${m.id}" ${have < P('revive') ? 'disabled' : ''}><b>${esc(HT.SHOP.revive.name)} : ${esc(cat.get(m.id).name)}</b><span class="small">${esc(HT.SHOP.revive.desc)}</span><span class="rq-price">${icon('crystal')}${P('revive')}</span></button>`).join('')}
      <button class="rq-item" data-act="buy" data-k="passeur" ${run.risk ? '' : 'disabled'}><b>${esc(HT.SHOP.passeur.name)}</b><span class="small">${esc(HT.SHOP.passeur.desc)}</span><span class="rq-price">${run.risk ? `−${Math.ceil(run.risk * 0.15)}` : '—'}</span></button>
      ${run.shop.relics.length ? `<h3>Reliques</h3><div class="rq-list">${run.shop.relics.map((k) => relicCard(k, { act: 'buyrel', price: P('relic'), on: ui.pick === k })).join('')}</div>` : ''}
      ${ui.pick && run.shop.relics.includes(ui.pick) ? `${run.relics.length >= HT.RELIC_MAX ? `<p class="small center">Touche la relique que tu laisses&nbsp;:</p><div class="rq-relics center">${run.relics.map((k) => `<button class="rq-rel ${ui.drop === k ? 'drop' : ''}" data-act="rdrop" data-k="${k}">${rIcon(k)}</button>`).join('')}</div>` : ''}
        <button class="btn primary block" data-act="buyrelok" ${have < P('relic') || (run.relics.length >= HT.RELIC_MAX && !ui.drop) ? 'disabled' : ''}>Acheter ${esc(R[ui.pick].name)} (${P('relic')})</button>` : ''}
      </section><button class="btn primary block big-cta dc-plq dc-plq-red" data-act="leave">Continuer la chasse</button>`;
  }
  function battleView(run) {
    if (battle) return;
    const title = `Salle ${run.step} · ${HT.ROOMS[run.cur].name}`;
    battle = runDuel(app, root, { title, run, pause: 'Combat en pause : il t’attend dans la Chasse aux Reliques.', onEnd: () => {
      battle = null;
      app.pendingProgress = [];
      let out;
      try { out = g.relicFinishBattle(); } catch (e) { app.flushProgress(); toast(esc(e.message), { kind: 'error' }); return render(); }
      app.chrome();
      if (out.summary) { app.sfx.error(); ui.last = out.summary; }
      else {
        app.sfx.reveal(out.room === 'boss' ? 'M' : 'R');
        if (out.next?.won) ui.last = out.next;
        else toast(`Victoire : <b>+${fmt(out.shards)}</b> éclats en jeu${out.lantern ? ' · la Lanterne soigne ton équipe' : ''}${out.war ? `<br>+${out.war} points de guerre` : ''}`, { icon: 'crystal' });
      }
      ui.pick = null; ui.drop = null;
      window.scrollTo(0, 0);
      render();
      app.flushProgress();
    } });
  }
  function render() {
    const run = g.relicRun();
    setScene(run?.phase === 'battle' ? null : 'descent');
    if (!run) return lobby();
    if (run.phase === 'start' || run.phase === 'relic') return relicView(run);
    if (run.phase === 'paths') return pathsView(run);
    if (run.phase === 'event') return eventView(run);
    if (run.phase === 'merchant') return merchantView(run);
    if (run.phase === 'battle') return battleView(run);
    return lobby();
  }
  const done = (out) => { if (out && out.rooms !== undefined && !g.relicRun()) ui.last = out; };
  const act = (fn) => { try { const r = fn(); ui.pick = null; ui.drop = null; return r; } catch (e) { toast(esc(e.message), { kind: 'error' }); return null; } };

  bindActions(root, {
    async start() {
      if (!g.relicPaidLeft() && !(await confirmBox('Tes chasses avec butin sont faites pour aujourd’hui. Partir quand même, <b>sans récompense</b> ?', { ok: 'Partir' }))) return;
      try { g.relicStart(); ui.last = null; ui.pick = null; app.sfx.tear?.(); app.chrome(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    okend() { ui.last = null; render(); },
    relinfo(el) { const k = el.dataset.k; openSheet(`<div class="rq-sheet"><div class="rq-rc-ic big">${rIcon(k)}</div><h2>${esc(R[k].name)}</h2><p class="rq-g"><i>Gain</i>${esc(R[k].gain)}</p><p class="rq-c"><i>Prix</i>${esc(R[k].cost)}</p></div>`, { label: R[k].name }); },
    rpick(el) { ui.pick = el.dataset.k; ui.drop = null; app.sfx.tap(); render(); },
    rdrop(el) { ui.drop = el.dataset.k; app.sfx.tap(); render(); },
    rtake() { const k = ui.pick, d = ui.drop; const r = act(() => g.relicPick(k, d)); if (r) { app.sfx.discover?.(); done(r); render(); window.scrollTo(0, 0); } },
    rskip() { const r = act(() => g.relicPick(null)); if (r) { done(r); render(); window.scrollTo(0, 0); } },
    go(el) {
      const r = act(() => g.relicGo(el.dataset.r));
      if (!r) return;
      window.scrollTo(0, 0);
      if (r.done) done(r.done);
      if (r.room === 'boss') app.sfx.boss?.();
      render();
    },
    async exit() {
      const run = g.relicRun();
      if (!(await confirmBox(`Sortir maintenant ? Tu gardes <b>${fmt(run.risk + run.safe)}</b> éclats${run.paid ? '' : ' (chasse sans récompense : rien n’est versé)'}.`, { ok: 'Sortir' }))) return;
      const r = act(() => g.relicExit()); if (r) { ui.last = r; app.chrome(); render(); window.scrollTo(0, 0); }
    },
    ev(el) {
      const out = act(() => g.relicEvent(Number(el.dataset.i)));
      if (!out) return;
      const bits = [];
      if (out.relic) bits.push(`Relique : <b>${esc(R[out.relic].name)}</b>`);
      if (out.relicFull) bits.push('Tu ne peux plus porter de relique : elle devient du butin');
      if (out.lost) bits.push(`Tu laisses <b>${esc(R[out.lost].name)}</b>`);
      if (out.won === true) bits.push('Pile : le pendu double ta mise !');
      if (out.won === false) bits.push(`Face : le pendu garde ${fmt(out.lostShards)} éclats`);
      if (out.shards) bits.push(`+${fmt(out.shards)} éclats en jeu`);
      if (out.secured) bits.push(`${fmt(out.secured)} éclats mis à l’abri`);
      if (bits.length) toast(bits.join('<br>'), { ms: 3200 });
      done(out.next);
      window.scrollTo(0, 0);
      render();
    },
    buy(el) { const r = act(() => g.relicBuy(el.dataset.k, el.dataset.id || null)); if (r) { app.sfx.coin?.(); if (r.secured != null) toast(`${fmt(r.secured)} éclats mis à l’abri`, { icon: 'crystal' }); render(); } },
    buyrel(el) { ui.pick = el.dataset.k; ui.drop = null; app.sfx.tap(); render(); },
    buyrelok() { const k = ui.pick, d = ui.drop; const r = act(() => g.relicBuy('relic', k, d)); if (r) { app.sfx.discover?.(); render(); } },
    leave() { const r = act(() => g.relicLeaveShop()); if (r) { done(r); window.scrollTo(0, 0); render(); } },
  });

  render();
  return () => { if (battle) { battle.stop(); battle = null; } document.body.classList.remove('battle-mode'); };
}
