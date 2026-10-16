// Simulation RÉELLE (moteur du jeu, sans navigateur) de 30 jours de jeu pour un profil.
// Entrée : profils.json (paramètres de comportement). Sortie : trajectoires.json (état mesuré jour par jour).
// Le joueur « bot » applique la politique du profil ; les combats sont joués par le moteur (pilote automatique
// ou coups au hasard selon l'habileté), les Sceaux par l'IA du jeu au niveau du joueur.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = '/home/user/Abyssal';
const { createCatalog } = await import(ROOT + '/js/core/catalog.js');
const { FACTION_ORDER, BOOSTERS } = await import(ROOT + '/js/config.js');
const { Game } = await import(ROOT + '/js/core/game.js');
const D = await import(ROOT + '/js/core/duel.js');
const SC = await import(ROOT + '/js/core/sceaux.js');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const cat = createCatalog({ cards: FACTION_ORDER.flatMap((f) => read(`data/cards/${f}.json`)), factions: read('data/factions.json'), sets: read('data/sets.json'), abilities: read('data/abilities.json'), achievements: read('data/achievements.json'), lore: read('data/lore.json') });
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.get(k) ?? null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const dir = path.dirname(new URL(import.meta.url).pathname);
const profiles = JSON.parse(fs.readFileSync(path.join(dir, 'profils.json'), 'utf8'));
const out = {};

function playBattle(st, r, P, cnt) {
  const def = () => { const x = r(); return x < P.parry ? 'parry' : x < P.parry + P.dodge ? 'dodge' : 'none'; };
  for (let t = 0; t < 300 && !st.over; t++) {
    if (r() < P.skill) { D.autoActs(st); cnt.turns++; }
    else {
      for (let k = 0; k < 8 && !st.over && st.turn === 'ally'; k++) {
        if (D.ultReady(st) && r() < 0.5) { D.useUlt(st); continue; }
        const us = D.front(st, 'ally').filter((u) => D.actionsFor(st, u.uid).some((a) => a.ok));
        if (!us.length) break;
        const u = us[Math.floor(r() * us.length)];
        const acts = D.actionsFor(st, u.uid).filter((a) => a.ok && a.key !== 'swap');
        if (!acts.length) break;
        const a = acts[Math.floor(r() * acts.length)];
        const ts = a.target === 'none' ? [null] : D.actionTargets(st, u.uid, a.key);
        if (!ts.length) break;
        D.act(st, u.uid, a.key, ts[Math.floor(r() * ts.length)]);
      }
      cnt.turns++;
    }
    if (st.over) break;
    D.endTurn(st, def);
  }
  if (!st.over) st.over = 'lost';
}

for (const P of profiles) {
  const r = rng(P.seed);
  let day = 0;
  const clock = () => new Date(2026, 10, 2 + day, 19, 0);
  const g = new Game(cat, new Mem(), { rng: r, clock });
  g.s.name = P.id;
  const log = [];
  const tot = { battles: 0, turns: 0, runs: 0, boosters: 0, sceaux: 0, sceauxWon: 0, wipes: 0, bossesBeaten: 0 };
  for (day = 0; day < 30; day++) {
    const on = P.days[day];
    let budget = () => 0;
    const cnt = { variantes: 0, battles: 0, turns: 0, runs: 0, boosters: 0, sceaux: 0, sceauxWon: 0, floors: [], wipes: 0, newCards: 0, rares: [] };
    if (on) {
      const before = g.uniqueCount();
      const openAll = () => {
        for (const [k, n] of Object.entries({ ...g.s.chests })) for (let i = 0; i < n; i++) { try { g.openChest(k); } catch (e) { break; } }
        for (const type of ['standard', 'premium', 'event', 'faction']) {
          for (let i = 0; i < 40; i++) {
            const free = type === 'standard' && g.freePack().stock > 0;
            if (!((g.s.tickets[type] || 0) > 0 || free)) break;
            const res = g.openBooster(type, type === 'faction' ? { faction: P.favFaction } : {}); cnt.boosters++;
            (res.opening?.cards || []).forEach((c) => { const card = cat.get(c.id); if (card && ['HR', 'M', 'S'].includes(card.rarity)) cnt.rares.push(card.rarity); if (c.variant && c.variant !== 'normal') cnt.variantes++; });
          }
        }
        // achats avec les éclats
        const buy = P.buy; // 'standard' | 'faction' | 'event' | 'save'
        if (buy !== 'save') for (let i = 0; i < 20; i++) { const price = BOOSTERS[buy].price; if (g.s.shards - price < P.keepShards) break; try { const res = g.openBooster(buy, buy === 'faction' ? { faction: P.favFaction } : {}); cnt.boosters++; (res.opening?.cards || []).forEach((c) => { const card = cat.get(c.id); if (card && ['HR', 'M', 'S'].includes(card.rarity)) cnt.rares.push(card.rarity); if (c.variant && c.variant !== 'normal') cnt.variantes++; }); } catch (e) { break; } }
      };
      try { if (g.canDailyClaim()) g.claimDaily(); } catch (e) {}
      openAll();
      // équipe et Fournaise
      if (P.furnace) { try { g.burnSpares(); } catch (e) {} }
      const team = g.autoTeam(P.teamStyle === 'favoris' ? g.s.team.filter((id) => g.owns(id)).slice(0, 2) : []);
      try { if (team.length >= 3) g.setTeam(team); } catch (e) {}
      if (P.upgrade) for (let k = 0; k < 20; k++) { const ids = g.team(); let up = false; for (const id of ids) { try { g.upgrade(id); up = true; } catch (e) {} } if (!up) break; }
      // Descente
      budget = () => cnt.battles * 1.2 + cnt.sceaux * 1.5 + cnt.boosters * 0.3 + 2; // minutes réelles estimées
      for (let run = 0; run < P.runsPerDay && g.team().length >= 3; run++) {
        if (g.torchesLeft() <= 0 && !P.freeRuns) break;
        if (budget() >= P.minutesParJour) break;
        try { g.startRun({ cursed: r() < P.cursed, nightmare: g.nightmareUnlocked() && r() < P.nightmare }); } catch (e) { break; }
        cnt.runs++;
        for (let k = 0; k < 400 && g.s.descent.run; k++) {
          const R = g.s.descent.run;
          if (budget() >= P.minutesParJour * 1.3 && R.phase === 'cleared') { g.endRun(false); break; } // plus le temps : on remonte
          if (R.phase === 'doors') { const ds = g.doors(); const pref = ds.includes(P.door) ? P.door : ds[Math.floor(r() * ds.length)]; const o = g.chooseDoor(pref); if (o?.battle) { cnt.battles++; playBattle(R.battle, r, P, cnt); const res = g.finishBattle(); if (res?.summary) { if (res.summary.wiped !== false) {} } } }
          else if (R.phase === 'pact') { g.choosePact(null); cnt.battles++; playBattle(g.s.descent.run.battle, r, P, cnt); g.finishBattle(); }
          else if (R.phase === 'battle') { cnt.battles++; playBattle(R.battle, r, P, cnt); g.finishBattle(); }
          else if (R.phase === 'reward' && R.talentOffer?.length) g.chooseTalent(Math.floor(r() * R.talentOffer.length));
          else if (R.phase === 'reward') g.chooseReward(R.rewards[Math.floor(r() * R.rewards.length)]);
          else if (R.phase === 'altar') g.chooseBlessing(R.altar[Math.floor(r() * R.altar.length)]);
          else if (R.phase === 'cleared') {
            const alive = R.team.filter((m) => !m.fallen), hp = alive.reduce((a, m) => a + m.hp, 0) / Math.max(1, alive.reduce((a, m) => a + m.maxHp, 0));
            if ((hp < P.retreatHp || alive.length < 3) && r() < P.prudence) g.endRun(false); else g.nextFloor();
          } else break;
        }
        const last = g.s.descent.last; if (last) { cnt.floors.push(last.floor); if (last.wiped) cnt.wipes++; }
      }
      openAll();
      // Sceaux
      if (g.sceauxOpen()) for (let k = 0; k < P.sceauxPerDay && budget() < P.minutesParJour * 1.3; k++) {
        const unlocked = g.sceauxUnlocked();
        let opts;
        if (k === 0 && g.s.sceaux.dailyDone !== g.sceauxDaily && P.sceauxDaily) opts = { daily: true };
        else { const i = Math.max(0, unlocked - 1 - (r() < 0.4 ? 1 : 0)); opts = { rival: SC.RIVALS[Math.max(0, i)].key }; }
        try { g.sceauxStart(opts); } catch (e) { try { g.sceauxStart({ rival: SC.RIVALS[Math.max(0, unlocked - 1)].key }); } catch (e2) { break; } }
        const st = g.s.sceaux.cur;
        for (let m = 0; m < 12 && !st.over; m++) {
          if (st.turn === 'p') { const mv = SC.aiMove(cat, st, P.sceauxSkill, r, 0.15); g.sceauxPlay(mv[0], mv[1]); } else g.sceauxAi();
        }
        const res = g.sceauxFinish(); cnt.sceaux++; if (res?.result === 'won') cnt.sceauxWon++;
        if (res?.result === 'won' && st.trophy?.length) { try { g.sceauxTrophy(st.trophy[0]); } catch (e) {} }
        g.s.sceaux.cur = null;
      }
      // missions, coffre de la semaine
      g.missions().list.forEach((x, i) => { if (x.p >= x.n && !x.claimed) try { g.claimMission(i); } catch (e) {} });
      try { if (g.weekChest().ready) g.claimWeekChest(); } catch (e) {}
      openAll();
      cnt.newCards = g.uniqueCount() - before;
      g.markPlayed?.();
    }
    for (const k of ['battles', 'turns', 'runs', 'boosters', 'sceaux', 'sceauxWon', 'wipes']) tot[k] += cnt[k];
    tot.bossesBeaten = Object.keys(g.s.bossesBeaten || {}).length;
    const lv = g.levelInfo();
    log.push({
      j: day + 1, joue: !!on, cartes: g.uniqueCount(), nouvelles: cnt.newCards, HR_M_S_tirees: cnt.rares.join(''), boosters: cnt.boosters, expeditions: cnt.runs,
      etages: cnt.floors.join(','), combats: cnt.battles, toursJoues: cnt.turns, defaites: cnt.wipes, variantesTirees: cnt.variantes, minutesEstimees: Math.round(budget()), sceaux: `${cnt.sceauxWon}/${cnt.sceaux}`,
      record: g.descent().best || 0, eclats: g.s.shards, cendres: g.s.ash, niveau: lv.level, gardiensBattus: Object.keys(g.s.bossesBeaten || {}).length,
      succes: Object.keys(g.s.achievements).length, rivauxSceaux: g.sceauxUnlocked(),
      equipeNiveaux: g.team().map((id) => `${cat.get(id).rarity}${g.cardLevel(id)}`).join(' '),
    });
  }
  const rar = {}; for (const id of Object.keys(g.s.collection)) { const c = cat.get(id); if (c) rar[c.rarity] = (rar[c.rarity] || 0) + 1; }
  out[P.id] = { totaux: tot, final: { cartes: g.uniqueCount(), parRarete: rar, variantes: g.variantCount(), record: g.descent().best || 0, niveau: g.levelInfo().level, succes: Object.keys(g.s.achievements).length, titres: g.s.titles.length, ensemblesComplets: cat.sets ? cat.sets.filter((s) => g.setProgress(s.key)?.done).length : null, equipe: g.team().map((id) => cat.get(id).name) }, jours: log };
}
fs.writeFileSync(path.join(dir, 'trajectoires.json'), JSON.stringify(out, null, 1));
console.log('profils simulés :', Object.keys(out).length);
