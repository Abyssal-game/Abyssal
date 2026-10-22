// v594 : la barre de défense, sortie de l'écran de combat (js/screens/duel-ui.js) pour que le Labo des défenses du Mode
// Créateur joue exactement le même geste. Un passage du curseur par lettre de la séquence (n simple · f rapide · l lent ·
// x feinte · m zone mobile · h chargé · H chargé avec feinte). Zone réglée en TEMPS (v388), toucher jugé sur l'image affichée
// à cet instant (v509). Retourne la liste des résultats ('parry' | 'dodge' | 'none'), un par coup.
/* rythme des ennemis (déplacé de duel-ui.js en v594) */
export const FAM_RHYTHM = { predateur: 'nf', assassin: 'ff', berserker: 'x', protecteur: 'n', mage: 'l', parasite: 'nf', controleur: 'm', soutien: 'n', gardien: 'nx' };
export const KIND_RHYTHM = { tick2: 'ff', poison: 'nf', flurry: 'fff', grab: 'nx', chain: 'nnf', frost: 'm', heavy: 'h', gorge: 'h', execute: 'H', ambush: 'xf', blast: 'lx' };
/* chaque gardien : nom de son Assaut et sa séquence (de 3 à 5 coups, rythme propre ; l'Horloger frappe en mesure) */
export const BOSS_ASSAULT = {
  devoreur: { name: 'La Faim sans fond', seq: 'fxh' },
  matriarche: { name: 'L’Hiver mordant', seq: 'mmx' },
  roi: { name: 'Le Reflet volé', seq: 'xnx' },
  architecte: { name: 'L’Effondrement', seq: 'lxH' },
  eclipse: { name: 'Éclipse totale', seq: 'mhx' },
  essaim: { name: 'La Nuée', seq: 'ffff' },
  bourreau: { name: 'La Hache du Bourreau', seq: 'hxH' },
  choeur: { name: 'Le Chant des Noyés', seq: 'lmx' },
  chaines: { name: 'Les Mille Chaînes', seq: 'nnnf' },
  horloge: { name: 'L’Heure exacte', seq: 'nnnn', beat: 320 },
  miroirs: { name: 'Le Palais des Miroirs', seq: 'xxn' },
  golem: { name: 'Avalanche de cendres', seq: 'llH' },
  peste: { name: 'Le Souffle gris', seq: 'mfx' },
  chasseur: { name: 'La Traque', seq: 'fxf' },
  voeux: { name: 'Le Prix à payer', seq: 'nmh' },
  titan: { name: 'Le Réveil du Titan', seq: 'Hxf' },
  jumeaux: { name: 'Crépuscule double', seq: 'ffxx' },
  juge: { name: 'Le Jugement', seq: 'hnx' },
  bete: { name: 'L’Apocalypse', seq: 'fxmH' },
  abysse: { name: 'La Nuit sans fin', seq: 'xfmxH' },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* bilan d'une séquence pour le moteur : tout paré = parade ; trop de ratés = touché ; sinon esquive */
export const defVerdict = (res, T) => res.every((r) => r === 'parry') ? 'parry' : res.filter((r) => r === 'none').length / res.length > T.missShare + 0.005 ? 'none' : 'dodge';

export function playBar({ mid, dv, letters, tier = 'normal', win, beat = 0, titleHTML = '', reduced = false, alive = () => true, setTap, sfx = {}, hap = () => {}, T, onResult = null }) {
  return new Promise((resolve) => {
    const n = letters.length, strong = tier !== 'normal';
    const bar = document.createElement('div');
    bar.className = 'dv-dodge cb-def';
    bar.innerHTML = `<span class="dv-dodge-t">${titleHTML} <small></small></span>${n > 1 ? `<span class="cb-hits">${letters.map(() => '<i></i>').join('')}</span>` : ''}<span class="dv-dodge-bar"><i class="rail"></i><i class="z"><i class="p"></i></i><i class="c"></i></span>`;
    mid.appendChild(bar); mid.classList.add('qte'); dv?.classList.add('qte-on');
    const cur = bar.querySelector('.c'), zEl = bar.querySelector('.z'), pEl = bar.querySelector('.p'), hint = bar.querySelector('small'), pips = bar.querySelectorAll('.cb-hits i');
    const bw = bar.querySelector('.dv-dodge-bar').offsetWidth; /* une seule mesure : le curseur glisse ensuite en transform */
    const D0 = tier === 'boss' ? T.durBoss : tier === 'elite' ? T.durElite : T.durNormal;
    const out = [];
    let held = false, letGo = null;
    const upH = (ev) => letGo?.(ev);
    addEventListener('pointerup', upH, true); addEventListener('pointercancel', upH, true);
    const close = () => {
      setTap(null); removeEventListener('pointerup', upH, true); removeEventListener('pointercancel', upH, true);
      setTimeout(() => { bar.remove(); mid.classList.remove('qte'); dv?.classList.remove('qte-on'); resolve(out); }, 260);
    };
    const pass = (i) => new Promise((done1) => {
      const L = letters[i], hold = L === 'h' || L === 'H', feint = L === 'x' || L === 'H', moving = L === 'm' || (strong && L === 'n' && i % 2 === 1);
      const w = typeof win === 'function' ? win(L) : win;
      const D = D0 * (L === 'f' ? T.multFast : L === 'l' ? T.multSlow : 1) * (feint ? T.multFeint : 1) * (beat ? T.multBeat : 1);
      /* trajet du curseur : accéléré (puissance K) ; feinte : il avance, s'arrête presque, puis fonce */
      const K = strong ? T.accelElite + Math.random() * T.accelEliteRand : T.accelNormal;
      const fa = 0.25 + Math.random() * 0.1, fb = fa + 0.22 + Math.random() * 0.12, fp = 0.28 + Math.random() * 0.12;
      const ease = feint
        ? (x) => x <= 0 ? 0 : x < fa ? fp * (x / fa) ** 0.8 : x < fb ? fp + 0.035 * (x - fa) / (fb - fa) : fp + 0.035 + (1 - fp - 0.035) * ((x - fb) / (1 - fb)) ** 1.6
        : (x) => Math.max(0, x) ** K;
      const r = Math.random(), imp = Math.min(0.99, T.impactMin + r * T.impactRand), impF = Math.min(0.99, T.impactMin + r * T.impactRand * 0.3 / 0.35);
      const tb = feint ? D * (fb + (1 - fb) * impF) : D * imp;
      const ta = Math.max(0, tb - w.dodge), tp = tb - w.parry; /* fin de zone = impact ; parade = son dernier instant */
      const za = ease(ta / D), zb = ease(tb / D), pz0 = ease(tp / D);
      const zw = Math.max(1e-4, zb - za), pw = Math.min(zw, zb - pz0), z0 = za;
      zEl.style.cssText = `left:${z0 * 100}%;width:${zw * 100}%`; zEl.style.transform = '';
      pEl.style.cssText = `left:${((zw - pw) / zw) * 100}%;width:${(pw / zw) * 100}%`;
      cur.style.transform = 'translateX(0px)';
      bar.classList.remove('ok', 'ko', 'r-parry', 'r-dodge', 'r-none', 'go', 'pp', 'held', 'cb-hold');
      if (hold) bar.classList.add('cb-hold');
      pips[i]?.classList.add('now');
      hint.textContent = (hold ? 'Maintiens le doigt, relâche dans l’or · trait blanc : parade' : 'Touche dans l’or : esquive · trait blanc : parade') + (n > 1 ? ` · coup ${i + 1}/${n}` : '');
      let t0 = 0, fin = false, raf = 0, lit = '';
      const zoneAt = (x) => (moving ? Math.min(0.97 - zw, Math.max(0.3, z0 + Math.sin(x * 9) * T.moveAmp)) : z0);
      const end = (res, when = null) => {
        if (fin) return; fin = true; cancelAnimationFrame(raf); setTap(null); letGo = null; held = false;
        bar.classList.remove('go', 'pp', 'held'); bar.classList.add(res === 'none' ? 'ko' : 'ok', `r-${res}`);
        pips[i]?.classList.remove('now'); pips[i]?.classList.add(`r-${res}`);
        {
          const stamp = document.createElement('div'); stamp.className = `dv-stamp s-${res}${n > 1 ? ' small' : ''}`;
          stamp.innerHTML = `<b>${res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Touché…'}</b>`;
          dv?.appendChild(stamp); setTimeout(() => stamp.remove(), n > 1 ? 520 : 900);
        }
        if (res === 'none') { sfx.miss?.(); hap(2); } else if (i < n - 1) { (res === 'parry' ? sfx.parry : sfx.hit)?.(); hap(1); } /* le dernier coup sonne avec son impact */
        out.push(res);
        onResult?.({ i, letter: L, res, ms: when != null && t0 ? Math.round(when - (t0 + tb)) : null, dodge: w.dodge, parry: w.parry, dur: Math.round(D) });
        done1();
      };
      const shown = [];
      const step = () => {
        const now0 = performance.now(), x = (now0 - t0) / D, pos = ease(Math.min(1, x)), zz = moving ? zoneAt(x) : z0;
        cur.style.transform = `translateX(${(pos * bw).toFixed(1)}px)`;
        shown.push([now0, pos, zz]); if (shown.length > 12) shown.shift();
        if (moving) zEl.style.transform = `translateX(${((zz - z0) * bw).toFixed(1)}px)`;
        const pz = zz + zw - pw, now = pos >= pz && pos <= pz + pw ? 'pp' : pos >= zz && pos <= zz + zw ? 'go' : '';
        if (now !== lit) { if (lit) bar.classList.remove(lit); if (now) bar.classList.add(now); lit = now; }
        if (x >= 1) end('none'); else raf = requestAnimationFrame(step);
      };
      const judgeAt = (at) => {
        const now = performance.now(), when = at && at <= now && now - at < 500 ? at : now;
        const seen = shown.filter((r) => r[0] <= when).slice(-2);
        if (!seen.length) { const x = (when - t0) / D; seen.push([when, ease(Math.min(1, x)), zoneAt(x)]); }
        const tol = T.tolPx / Math.max(80, bw), rank = { parry: 2, dodge: 1, none: 0 };
        const res = seen.map(([, pos, zz]) => { const pz = zz + zw - pw;
          return pos >= pz - tol && pos <= zz + zw + tol ? 'parry' : pos >= zz - tol && pos < pz - tol ? 'dodge' : 'none'; });
        end(res.sort((a, b) => rank[b] - rank[a])[0], when);
      };
      /* coup chargé : on appuie quand on veut, c'est le moment où l'on relâche qui compte */
      letGo = (ev) => { if (!hold || !held || fin) return; held = false; bar.classList.remove('held'); if (!t0) return end('none'); judgeAt(ev.timeStamp); };
      setTap((at) => {
        if (hold) { held = true; bar.classList.add('held'); return; }
        if (!t0) return; /* v575 : un toucher avant le départ du curseur ne compte pas */
        judgeAt(at);
      });
      const gap = i === 0 ? (reduced ? 250 : T.gapFirst) + Math.random() * T.gapFirstRand : beat || T.gapMin + Math.random() * T.gapRand; /* rythme irrégulier entre les coups (sauf l'Horloger) */
      setTimeout(() => { if (!fin && alive()) { t0 = performance.now(); raf = requestAnimationFrame(step); } else if (!alive()) end('none'); }, gap);
    });
    (async () => {
      for (let i = 0; i < n && alive(); i++) { await pass(i); if (i < n - 1) await wait(T.pause); }
      bar.classList.add('fin');
      close();
    })();
  });
}

