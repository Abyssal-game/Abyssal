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

/* v597 : défenses inventées dans le Labo des combats (Mode Créateur) : un chiffre 0 à 9 dans une séquence = la défense
   inventée n° 0 à 9. Briques : toucher ou maintenir, vitesse, taille de la zone d'or et du trait blanc, accélération,
   feinte, zone mobile, zone cachée (visible seulement quand le curseur approche), curseur qui part de la droite (sens
   inverse), curseur qui rebondit (seul le retour compte). Jugées sur la position du curseur au moment du toucher. */
export const CUSTOM_QTE = {};
export const QTE_BRICKS = { name: 'Défense inventée', base: 'tap', speed: 1, zone: 1, parry: 0.2, accel: 1.7, feint: false, move: 0, hide: 0, reverse: false, bounce: false };

/* bilan d'une séquence pour le moteur : tout paré = parade ; trop de ratés = touché ; sinon esquive */
export const defVerdict = (res, T) => res.every((r) => r === 'parry') ? 'parry' : res.filter((r) => r === 'none').length / res.length > T.missShare + 0.005 ? 'none' : 'dodge';

/* v670 : les tampons (« Esquive ! », « Parade ! », « Assaut amorti »…) ne sont plus posés dans l'écran du combat : sur l'iPhone,
   le tampon de fin d'Assaut faisait passer tout l'écran au noir le temps de son affichage (vidéo du propriétaire, Dévoreur).
   Ils vont dans un calque à part, fixe, hors du combat. Le Labo des défenses garde son arène. */
export function stampHost(dv) {
  if (dv && !dv.classList.contains('dv')) return dv;
  let h = document.getElementById('stamp-host');
  if (!h) { h = document.createElement('div'); h.id = 'stamp-host'; h.className = 'stamp-host'; h.setAttribute('aria-hidden', 'true'); document.body.appendChild(h); }
  return h;
}

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
      if (CUSTOM_QTE[letters[i]]) return passCustom(i, { ...QTE_BRICKS, ...CUSTOM_QTE[letters[i]] }, done1);
      const L = letters[i], hold = false /* v596 : plus jamais « maintenir puis relâcher » (demande du propriétaire) : un coup chargé se défend d'un toucher */, feint = L === 'x' || L === 'H', moving = L === 'm' || (strong && L === 'n' && i % 2 === 1);
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
      hint.textContent = 'Touche dans l’or : esquive · trait blanc : parade' + (n > 1 ? ` · coup ${i + 1}/${n}` : '');
      let t0 = 0, fin = false, raf = 0, lit = '';
      const zoneAt = (x) => (moving ? Math.min(0.97 - zw, Math.max(0.3, z0 + Math.sin(x * 9) * T.moveAmp)) : z0);
      const end = (res, when = null) => {
        if (fin) return; fin = true; cancelAnimationFrame(raf); setTap(null); letGo = null; held = false;
        anims.forEach((a) => { try { a.commitStyles?.(); a.cancel(); } catch (e) {} }); anims = [];
        bar.classList.remove('go', 'pp', 'held'); bar.classList.add(res === 'none' ? 'ko' : 'ok', `r-${res}`);
        pips[i]?.classList.remove('now'); pips[i]?.classList.add(`r-${res}`);
        {
          const stamp = document.createElement('div'); stamp.className = `dv-stamp s-${res}${n > 1 ? ' small' : ''}`;
          stamp.innerHTML = `<b>${res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Touché…'}</b>`;
          stampHost(dv).appendChild(stamp); setTimeout(() => stamp.remove(), n > 1 ? 520 : 900);
        }
        if (res === 'none') { sfx.miss?.(); } else if (i < n - 1) { (res === 'parry' ? sfx.parry : sfx.hit)?.(); } /* v705 : la vibration vient du son (raté, parade, coup) */ /* le dernier coup sonne avec son impact */
        out.push(res);
        onResult?.({ i, letter: L, res, ms: when != null && t0 ? Math.round(when - (t0 + tb)) : null, dodge: w.dodge, parry: w.parry, dur: Math.round(D) });
        done1();
      };
      /* v727 : le curseur (et la zone qui bouge) glissent par une animation du compositeur (Web Animations) : elle avance même si
         le reste du jeu prend du retard ; le toucher est jugé sur le temps exact (position calculée), plus sur les images affichées */
      let anims = [];
      const frames = (f) => Array.from({ length: 49 }, (_, k) => ({ offset: k / 48, transform: `translateX(${(f(k / 48) * bw).toFixed(1)}px)` }));
      const step = () => {
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x)), zz = moving ? zoneAt(x) : z0;
        const pz = zz + zw - pw, now = pos >= pz && pos <= pz + pw ? 'pp' : pos >= zz && pos <= zz + zw ? 'go' : '';
        if (now !== lit) { if (lit) bar.classList.remove(lit); if (now) bar.classList.add(now); lit = now; }
        if (x >= 1) end('none'); else raf = requestAnimationFrame(step);
      };
      const startRun = () => {
        t0 = performance.now();
        if (cur.animate) {
          anims = [cur.animate(frames((x) => ease(x)), { duration: D, easing: 'linear', fill: 'forwards' })];
          if (moving) anims.push(zEl.animate(frames((x) => zoneAt(x) - z0), { duration: D, easing: 'linear', fill: 'forwards' }));
          anims[0].ready?.then(() => { if (!fin && typeof anims[0].startTime === 'number') t0 = anims[0].startTime; }).catch(() => {});
        }
        raf = requestAnimationFrame(step);
      };
      const judgeAt = (at) => {
        const now = performance.now(), when = at && at <= now && now - at < 500 ? at : now;
        const tol = T.tolPx / Math.max(80, bw), rank = { parry: 2, dodge: 1, none: 0 };
        /* position au toucher, et une image plus tôt (ce que l'œil voyait encore) : le meilleur des deux */
        const res = [when, when - 17].map((tt) => { const x = (tt - t0) / D, pos = ease(Math.min(1, Math.max(0, x))), zz = zoneAt(x), pz = zz + zw - pw;
          return pos >= pz - tol && pos <= zz + zw + tol ? 'parry' : pos >= zz - tol && pos < pz - tol ? 'dodge' : 'none'; });
        anims.forEach((a) => { try { a.pause(); } catch (e) {} });
        end(res.sort((a, b) => rank[b] - rank[a])[0], when);
      };
      /* coup chargé : on appuie quand on veut, c'est le moment où l'on relâche qui compte */
      letGo = (ev) => { if (!hold || !held || fin) return; held = false; bar.classList.remove('held'); if (!t0) return end('none'); judgeAt(ev.timeStamp); };
      setTap((at) => {
        if (hold) { held = true; bar.classList.add('held'); return; }
        if (!t0) return; /* v575 : un toucher avant le départ du curseur ne compte pas */
        judgeAt(at);
      });
      const gap = i === 0 ? (reduced ? 500 : T.gapFirst) + Math.random() * T.gapFirstRand : beat || T.gapMin + Math.random() * T.gapRand; /* rythme irrégulier entre les coups (sauf l'Horloger) */
      setTimeout(() => { if (!fin && alive()) startRun(); else if (!alive()) end('none'); }, gap);
    });
    /* défense inventée : même barre, positions calculées par la fonction posAt (sens, rebond), jugement au temps */
    const passCustom = (i, C, done1) => {
      const hold = C.base === 'hold', w0 = typeof win === 'function' ? win('n') : win;
      const dodge = Math.max(30, w0.dodge * C.zone), parry = Math.max(15, Math.min(dodge, Math.round(dodge * C.parry)));
      const D = D0 * C.speed * (C.feint ? T.multFeint : 1) * (C.bounce ? 1.6 : 1);
      const fa = 0.25 + Math.random() * 0.1, fb = fa + 0.22 + Math.random() * 0.12, fp = 0.28 + Math.random() * 0.12;
      const ease = C.feint ? (x) => x <= 0 ? 0 : x < fa ? fp * (x / fa) ** 0.8 : x < fb ? fp + 0.035 * (x - fa) / (fb - fa) : fp + 0.035 + (1 - fp - 0.035) * ((x - fb) / (1 - fb)) ** 1.6
        : (x) => Math.max(0, x) ** C.accel;
      const H = 0.45; /* rebond : aller jusqu'à 45 % du temps, puis retour */
      const posAt = (x) => { x = Math.min(1, Math.max(0, x)); let p = C.bounce ? (x < H ? ease(x / H) : 1 - ease((x - H) / (1 - H)) * 0.97) : ease(x); return C.reverse ? 1 - p : p; };
      const imp = Math.min(0.99, T.impactMin + Math.random() * T.impactRand);
      const tb = C.bounce ? D * (H + (1 - H) * imp) : C.feint ? D * (fb + (1 - fb) * Math.min(0.99, imp)) : D * imp;
      const ta = Math.max(C.bounce ? D * H : 0, tb - dodge), tp = tb - parry;
      const pa = posAt(ta / D), pb = posAt(tb / D), pp = posAt(tp / D);
      const z0 = Math.min(pa, pb), zw = Math.max(0.004, Math.abs(pb - pa));
      const pz0 = Math.min(pp, pb), pw = Math.max(0.002, Math.abs(pb - pp));
      zEl.style.cssText = `left:${z0 * 100}%;width:${zw * 100}%`; zEl.style.transform = '';
      pEl.style.cssText = `left:${((pz0 - z0) / zw) * 100}%;width:${(pw / zw) * 100}%`;
      cur.style.transform = `translateX(${(posAt(0) * bw).toFixed(1)}px)`;
      bar.classList.remove('ok', 'ko', 'r-parry', 'r-dodge', 'r-none', 'go', 'pp', 'held', 'cb-hold', 'q-hide');
      if (hold) bar.classList.add('cb-hold');
      if (C.hide > 0) bar.classList.add('q-hide');
      pips[i]?.classList.add('now');
      hint.textContent = `${C.name || 'Défense inventée'} · ${hold ? 'maintiens, relâche dans l’or' : 'touche dans l’or'}${C.bounce ? ' · au retour' : ''}` + (n > 1 ? ` · coup ${i + 1}/${n}` : '');
      let t0 = 0, fin = false, raf = 0, lit = '';
      const end = (res, when = null) => {
        if (fin) return; fin = true; cancelAnimationFrame(raf); setTap(null); letGo = null; held = false;
        bar.classList.remove('go', 'pp', 'held', 'q-hide', 'q-show'); bar.classList.add(res === 'none' ? 'ko' : 'ok', `r-${res}`);
        pips[i]?.classList.remove('now'); pips[i]?.classList.add(`r-${res}`);
        const stamp = document.createElement('div'); stamp.className = `dv-stamp s-${res}${n > 1 ? ' small' : ''}`;
        stamp.innerHTML = `<b>${res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Touché…'}</b>`;
        stampHost(dv).appendChild(stamp); setTimeout(() => stamp.remove(), n > 1 ? 520 : 900);
        if (res === 'none') { sfx.miss?.(); } else if (i < n - 1) { (res === 'parry' ? sfx.parry : sfx.hit)?.(); } /* v705 : la vibration vient du son (raté, parade, coup) */
        out.push(res);
        onResult?.({ i, letter: letters[i], res, ms: when != null && t0 ? Math.round(when - (t0 + tb)) : null, dodge, parry, dur: Math.round(D) });
        done1();
      };
      const step = () => {
        const now = performance.now(), x = (now - t0) / D, ph = (now - t0) / D, mv = C.move ? Math.sin(ph * 9) * C.move : 0, pos = posAt(x);
        cur.style.transform = `translateX(${(pos * bw).toFixed(1)}px)`;
        if (C.move) zEl.style.transform = `translateX(${(mv * bw).toFixed(1)}px)`;
        if (C.hide > 0) bar.classList.toggle('q-show', Math.abs(pos - (z0 + zw / 2 + mv)) <= C.hide + zw / 2);
        const k = C.bounce && x < H ? '' : pos >= pz0 + mv && pos <= pz0 + mv + pw ? 'pp' : pos >= z0 + mv && pos <= z0 + mv + zw ? 'go' : '';
        if (k !== lit) { if (lit) bar.classList.remove(lit); if (k) bar.classList.add(k); lit = k; }
        if (x >= 1) end('none'); else raf = requestAnimationFrame(step);
      };
      const judgeAt = (at) => {
        /* jugé sur la position du curseur à l'instant du toucher, par rapport à la zone (déplacée si elle bouge) */
        const now = performance.now(), when = at && at <= now && now - at < 500 ? at : now, dt = when - t0, tol = T.tolPx / Math.max(80, bw);
        const mv = C.move ? Math.sin((dt / D) * 9) * C.move : 0, pos = posAt(dt / D);
        end(C.bounce && dt < D * H ? 'none' : pos >= pz0 + mv - tol && pos <= pz0 + mv + pw + tol ? 'parry' : pos >= z0 + mv - tol && pos <= z0 + mv + zw + tol ? 'dodge' : 'none', when);
      };
      letGo = (ev) => { if (!hold || !held || fin) return; held = false; bar.classList.remove('held'); if (!t0) return end('none'); judgeAt(ev.timeStamp); };
      setTap((at) => { if (hold) { held = true; bar.classList.add('held'); return; } if (!t0) return; judgeAt(at); });
      const gap = i === 0 ? (reduced ? 500 : T.gapFirst) + Math.random() * T.gapFirstRand : T.gapMin + Math.random() * T.gapRand;
      setTimeout(() => { if (!fin && alive()) { t0 = performance.now(); raf = requestAnimationFrame(step); } else if (!alive()) end('none'); }, gap);
    };
    (async () => {
      for (let i = 0; i < n && alive(); i++) { await pass(i); if (i < n - 1) await wait(T.pause); }
      bar.classList.add('fin');
      close();
    })();
  });
}

