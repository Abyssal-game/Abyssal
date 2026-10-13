// Les Salles Oubliées en 3D (three.js, chargé à la demande) : la salle de donjon, les figurines
// sur leur socle, les lumières de torches, la caméra qu'on tourne au doigt.
// Ce module ne connaît pas les règles : salles.js lui donne l'état et lui dit quoi animer.
const SL = 'assets/salles/';
let THREE = null;

export async function create3D(host, { artFor, onTap, reduced = false }) {
  THREE ||= await import('../vendor/three.module.min.js');
  const T = THREE;
  // ——— Rendu ———
  const canvas = document.createElement('canvas');
  canvas.className = 's3-cv';
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const ov = document.createElement('div'); ov.className = 's3-ov';
  host.append(canvas, ov);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x07060a, 0.022);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  const loader = new T.TextureLoader();
  const texCache = new Map();
  const tex = (url, { srgb = true, rep = null } = {}) => {
    const k = url + (rep ? rep.join(',') : '');
    if (texCache.has(k)) return texCache.get(k);
    const t = loader.load(url);
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (rep[2] != null) t.offset.set(rep[2], rep[3]); }
    texCache.set(k, t);
    return t;
  };
  // Petites textures dessinées (lueurs, anneaux, cases)
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,220,160,.8)'); r.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const cellTex = canvasTex(128, 128, (g, w) => {
    const r = 18, m = 8;
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7; g.shadowColor = 'white'; g.shadowBlur = 10;
    // rectangle arrondi tracé à la main (roundRect n'existe pas sur les anciens iPhone)
    const x0 = m, y0 = m, x1 = w - m, y1 = w - m;
    g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); g.stroke();
    const f = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 1.4); f.addColorStop(0, 'rgba(255,255,255,.08)'); f.addColorStop(1, 'rgba(255,255,255,.35)');
    g.fillStyle = f; g.fill();
  });
  const ringTex = canvasTex(256, 256, (g, w) => {
    g.translate(w / 2, w / 2); g.strokeStyle = 'white'; g.lineWidth = 10; g.shadowColor = 'white'; g.shadowBlur = 14;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(0, 0, w / 2 - 22, (i / 12) * Math.PI * 2, ((i + 0.62) / 12) * Math.PI * 2); g.stroke(); }
  });
  const gateTex = canvasTex(64, 128, (g, w, h) => { const r = g.createLinearGradient(0, h, 0, 0); r.addColorStop(0, 'rgba(200,150,255,.95)'); r.addColorStop(0.6, 'rgba(140,80,255,.55)'); r.addColorStop(1, 'rgba(90,40,200,.1)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const haloTex = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, w * 0.22, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });

  // ——— Lumières ———
  scene.add(new T.HemisphereLight(0x9aa6d0, 0x2a1a0c, 1.25));
  const moon = new T.DirectionalLight(0xc8d2ff, 2.1);
  moon.position.set(-4, 10, 5); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.02;
  Object.assign(moon.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  scene.add(moon);
  const warm = new T.PointLight(0xffb070, 22, 14, 1.5); warm.position.set(0, 3.2, 3.5); scene.add(warm);

  // ——— Groupes ———
  const world = new T.Group(); scene.add(world);
  const roomG = new T.Group(); world.add(roomG);
  const hintG = new T.Group(); world.add(hintG);
  const unitG = new T.Group(); world.add(unitG);
  const fxG = new T.Group(); world.add(fxG);

  // Table sous le plateau
  const table = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ map: tex(SL + 'table.webp', { rep: [3, 2] }), color: 0x6a5240, roughness: 0.85 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.32; table.receiveShadow = true; world.add(table);

  const FLOOR_Y = 0.07; // dessus des dalles
  let W = 8, H = 9;
  const wx = (x) => x - (W - 1) / 2, wz = (y) => y - (H - 1) / 2;

  // Matériaux communs
  const stoneTop = new T.MeshStandardMaterial({ map: tex(SL + 'wall.webp'), roughness: 0.8, metalness: 0.15, color: 0xb8b0a8 });
  const stoneSide = new T.MeshStandardMaterial({ map: tex(SL + 'floor.webp', { rep: [0.5, 0.5] }), roughness: 0.95, color: 0x9a9ca6 });
  const floorMats = [0, 1, 2, 3].map((i) => new T.MeshStandardMaterial({ map: tex(SL + 'floor.webp', { rep: [0.5, 0.5, (i % 2) * 0.5, Math.floor(i / 2) * 0.5] }), roughness: 0.9, color: 0xe6e4ea }));
  const floorSide = new T.MeshStandardMaterial({ color: 0x2a2a30, roughness: 1 });
  const gold = new T.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.85, roughness: 0.32 });
  const darkWood = new T.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 });

  // ——— Torches (flammes + lumière qui vacille) ———
  const flames = [];
  function torch(x, y, z, light) {
    const g = new T.Group();
    const stick = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.42, 8), darkWood); stick.position.y = 0.21; g.add(stick);
    const cup = new T.Mesh(new T.CylinderGeometry(0.09, 0.05, 0.1, 10), gold); cup.position.y = 0.44; g.add(cup);
    const fl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    fl.position.y = 0.6; fl.scale.set(0.45, 0.65, 1); g.add(fl);
    g.position.set(x, y, z); roomG.add(g);
    const f = { sprite: fl, light: null, base: 0, seed: Math.random() * 100 };
    if (light) { const L = new T.PointLight(0xff8a3a, 14, 6.5, 1.6); L.position.set(x, y + 0.65, z); roomG.add(L); f.light = L; f.base = 14; }
    flames.push(f);
  }
  // Poussière qui flotte dans la lumière
  let dust = null;
  function makeDust() {
    const n = 90, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * W; pos[i * 3 + 1] = Math.random() * 2.2 + 0.2; pos[i * 3 + 2] = (Math.random() - 0.5) * H; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    dust = new T.Points(geo, new T.PointsMaterial({ map: glowTex, size: 0.06, color: 0xffd9a0, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    roomG.add(dust);
  }

  // ——— La salle ———
  let door = null; const chests = new Map(); let trapG = null;
  function room(st) {
    roomG.clear(); chests.clear(); flames.length = 0; door = null;
    H = st.grid.length; W = st.grid[0].length;
    const box = new T.BoxGeometry(1, 1, 1);
    // socle de la salle
    const slab = new T.Mesh(new T.BoxGeometry(W + 0.4, 0.3, H + 0.4), new T.MeshStandardMaterial({ color: 0x15141a, roughness: 1 }));
    slab.position.y = -0.16; slab.receiveShadow = true; roomG.add(slab);
    const rim = new T.Mesh(new T.BoxGeometry(W + 0.5, 0.06, H + 0.5), gold); rim.position.y = -0.3; roomG.add(rim);
    st.grid.forEach((row, y) => [...row].forEach((c, x) => {
      const X = wx(x), Z = wz(y);
      if (c === '#') {
        // murs : hauts au fond, de plus en plus bas vers le joueur pour ne rien cacher
        const front = y === H - 1, side = (x === 0 || x === W - 1) && !front;
        const h = front ? 0.26 : side ? 0.45 + 0.55 * (1 - y / (H - 1)) : 0.95;
        const m = new T.Mesh(box, [stoneSide, stoneSide, stoneTop, stoneSide, stoneSide, stoneSide]);
        m.scale.set(1, h, 1); m.position.set(X, h / 2 - 0.02, Z); m.castShadow = !front; m.receiveShadow = true; roomG.add(m);
        return;
      }
      const t = new T.Mesh(box, [floorSide, floorSide, floorMats[(x * 7 + y * 13) % 4], floorSide, floorSide, floorSide]);
      t.scale.set(0.96, 0.14, 0.96); t.position.set(X, 0, Z); t.receiveShadow = true;
      t.rotation.y = ((x * 3 + y) % 4) * (Math.PI / 2);
      roomG.add(t);
      if (c === 'x') pillar(X, Z);
      if (c === 'D') {
        // porte adossée au mur voisin, tournée vers la salle
        const wall = (xx, yy) => st.grid[yy]?.[xx] === '#';
        if (wall(x, y - 1)) makeDoor(X, Z - 0.42, st.doorOpen, 0);
        else if (wall(x - 1, y)) makeDoor(X - 0.42, Z, st.doorOpen, Math.PI / 2);
        else if (wall(x + 1, y)) makeDoor(X + 0.42, Z, st.doorOpen, -Math.PI / 2);
        else makeDoor(X, Z + 0.42, st.doorOpen, Math.PI);
      }
    }));
    // torches : aux coins du fond et sur les côtés
    torch(wx(1) - 0.45, 1.35, wz(0) + 0.1, true);
    torch(wx(W - 2) + 0.45, 1.35, wz(0) + 0.1, true);
    torch(wx(0) + 0.1, 0.9, wz(Math.floor(H / 2)), true);
    torch(wx(W - 1) - 0.1, 0.9, wz(Math.floor(H / 2)), false);
    for (const ch of st.chests) addChest(ch);
    traps(st);
    makeDust();
    fitShadow();
    roomG.traverse((o) => { if (o.isMesh && o.material !== gold && !o.castShadow) o.receiveShadow = true; });
  }
  function pillar(X, Z) {
    const g = new T.Group();
    const base = new T.Mesh(new T.BoxGeometry(0.8, 0.18, 0.8), stoneSide); base.position.y = 0.16; g.add(base);
    const col = new T.Mesh(new T.CylinderGeometry(0.26, 0.3, 1.5, 12), stoneSide); col.position.y = 0.98; g.add(col);
    const cap = new T.Mesh(new T.BoxGeometry(0.72, 0.16, 0.72), stoneTop); cap.position.y = 1.78; g.add(cap);
    const band = new T.Mesh(new T.TorusGeometry(0.3, 0.03, 6, 20), gold); band.rotation.x = Math.PI / 2; band.position.y = 0.4; g.add(band);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(X, 0, Z); roomG.add(g);
  }
  function makeDoor(X, Z, open, rot) {
    const g = new T.Group();
    const frameM = stoneSide;
    const l = new T.Mesh(new T.BoxGeometry(0.16, 1.5, 0.34), frameM); l.position.set(-0.46, 0.75, 0); g.add(l);
    const r = l.clone(); r.position.x = 0.46; g.add(r);
    const top = new T.Mesh(new T.BoxGeometry(1.1, 0.2, 0.36), stoneTop); top.position.y = 1.55; g.add(top);
    const pivot = new T.Group(); pivot.position.set(-0.38, 0, 0.18); g.add(pivot);
    const leaf = new T.Mesh(new T.PlaneGeometry(0.78, 1.42), new T.MeshStandardMaterial({ map: tex(SL + 'door-closed.webp'), transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.7 }));
    leaf.position.set(0.39, 0.72, 0); pivot.add(leaf);
    const glow = new T.PointLight(0xa070ff, open ? 6 : 0, 3.5, 2); glow.position.set(0, 0.8, 0.5); g.add(glow);
    // passage lumineux qui apparaît quand la porte s'ouvre
    const gate = new T.Mesh(new T.PlaneGeometry(0.8, 1.44), new T.MeshBasicMaterial({ map: gateTex, transparent: true, opacity: open ? 1 : 0, blending: T.AdditiveBlending, depthWrite: false }));
    gate.position.set(0, 0.72, -0.02); g.add(gate);
    g.position.set(X, 0.05, Z); g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    roomG.add(g);
    door = { pivot, glow, gate, open };
    if (open) pivot.rotation.y = -1.7;
  }
  function setDoor(open) {
    if (!door || door.open === open) return;
    door.open = open;
    tween(700, (k) => { const v = open ? k : 1 - k; door.pivot.rotation.y = -1.7 * v; door.glow.intensity = 6 * v; door.gate.material.opacity = v; });
  }
  function addChest(ch) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex(SL + `chest-${ch.open ? 'open' : 'closed'}.webp`), transparent: true, alphaTest: 0.2 }));
    s.scale.set(0.95, 0.95, 1); s.position.set(wx(ch.x), FLOOR_Y + 0.42, wz(ch.y)); s.center.set(0.5, 0.5);
    roomG.add(s); chests.set(`${ch.x},${ch.y}`, s);
    const sh = new T.Mesh(new T.CircleGeometry(0.36, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(wx(ch.x), FLOOR_Y + 0.005, wz(ch.y)); roomG.add(sh);
  }
  function chest(x, y) { const s = chests.get(`${x},${y}`); if (s) { s.material.map = tex(SL + 'chest-open.webp'); s.material.needsUpdate = true; pulse(wx(x), wz(y), 0xffd36a); } }
  function traps(st) {
    if (trapG) roomG.remove(trapG);
    trapG = new T.Group();
    for (const t of st.traps) {
      const m = new T.Mesh(new T.PlaneGeometry(0.86, 0.86), new T.MeshStandardMaterial({ map: tex(SL + 'trap.webp'), transparent: true, alphaTest: 0.2, emissive: 0xffc860, emissiveIntensity: 0.35, emissiveMap: tex(SL + 'trap.webp') }));
      m.rotation.x = -Math.PI / 2; m.position.set(wx(t.x), FLOOR_Y + 0.01, wz(t.y)); trapG.add(m);
    }
    roomG.add(trapG);
  }
  function fitShadow() { moon.target.position.set(0, 0, 0); scene.add(moon.target); }

  // ——— Figurines ———
  const units = new Map(); // uid → { g, fig, card, base, label, u }
  const ART_W = 0.8, ART_H = 1.12;
  function makeUnit(u) {
    const g = new T.Group();
    const big = u.boss ? 1.3 : u.elite ? 1.1 : u.minion ? 0.82 : 1;
    const kind = u.side === 'ally' ? 'ally' : u.boss ? 'boss' : u.elite ? 'elite' : 'enemy';
    const rimCol = { ally: 0xd8b25a, enemy: 0x8a2030, elite: 0x6a3aa0, boss: 0x1a1a1a }[kind];
    const fig = new T.Group(); g.add(fig);
    if (!u.portal) {
      const baseTop = new T.MeshStandardMaterial({ map: tex(SL + `base-${kind}.webp`), transparent: true, roughness: 0.45, metalness: 0.5 });
      const baseSide = new T.MeshStandardMaterial({ color: rimCol, metalness: 0.8, roughness: 0.35 });
      const base = new T.Mesh(new T.CylinderGeometry(0.4, 0.44, 0.1, 40), [baseSide, baseTop, baseSide]);
      base.position.y = FLOOR_Y + 0.05; base.castShadow = true; base.receiveShadow = true; g.add(base);
      // carte debout (figurine en carton, comme sur une vraie table de jeu)
      const art = artFor(u);
      const front = new T.MeshStandardMaterial({ map: tex(art), roughness: 0.55, metalness: 0.05 });
      const back = new T.MeshStandardMaterial({ map: tex(SL + 'card-back.webp'), roughness: 0.6 });
      const edge = new T.MeshStandardMaterial({ color: u.side === 'ally' ? 0xc9a24e : 0x9a2a3a, metalness: 0.8, roughness: 0.3 });
      const card = new T.Mesh(new T.BoxGeometry(ART_W, ART_H, 0.035), [edge, edge, edge, edge, front, back]);
      card.position.y = FLOOR_Y + 0.1 + ART_H / 2 + 0.02; card.castShadow = true;
      // cadre : doré pour tes figurines, rouge scellé pour les ennemis
      const frame = new T.Mesh(new T.PlaneGeometry(ART_W * 1.01, ART_H * 1.01), new T.MeshStandardMaterial({ map: tex(`assets/variants/${u.side === 'ally' ? 'gold' : 'seal'}-frame.webp`), transparent: true, alphaTest: 0.35, metalness: 0.6, roughness: 0.35 }));
      frame.position.z = 0.0185; card.add(frame);
      fig.add(card);
      const foot = new T.Mesh(new T.BoxGeometry(0.34, 0.06, 0.12), edge); foot.position.y = FLOOR_Y + 0.13; fig.add(foot);
      g.userData.card = card; g.userData.front = front;
    } else {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex(SL + 'portal.webp'), transparent: true, alphaTest: 0.15 }));
      s.scale.set(1.05, 1.05, 1); s.position.y = FLOOR_Y + 0.45; fig.add(s);
      const L = new T.PointLight(0x9a5aff, 3, 2.5, 2); L.position.y = 0.6; g.add(L);
      g.userData.front = s.material;
    }
    fig.scale.setScalar(big);
    g.userData.big = big;
    // ce qu'on touche : exactement ce qu'on voit (carte, cadre, socle, portail)
    const picks = [];
    g.traverse((c) => { if (c.isMesh || c.isSprite) { c.userData.uid = u.uid; picks.push(c); } });
    // anneau de sélection / de cible
    const ring = new T.Mesh(new T.PlaneGeometry(1.25, 1.25), new T.MeshBasicMaterial({ map: haloTex, color: 0xffd36a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = FLOOR_Y + 0.012; g.add(ring);
    const tgt = new T.Mesh(new T.PlaneGeometry(1.15, 1.15), new T.MeshBasicMaterial({ map: ringTex, color: 0xff5a6e, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    tgt.rotation.x = -Math.PI / 2; tgt.position.y = FLOOR_Y + 0.016; g.add(tgt);
    const label = document.createElement('div');
    label.className = `s3-lab ${u.side}`;
    label.innerHTML = '<span class="s3-hp"><i></i></span><span class="s3-badges"></span><span class="s3-acts"></span>';
    ov.appendChild(label);
    g.position.set(wx(u.x), 0, wz(u.y));
    unitG.add(g);
    const o = { g, fig, ring, tgt, picks, label, u, x: u.x, y: u.y };
    units.set(u.uid, o);
    return o;
  }
  let sel = null;
  function sync(st, { selUid = null, labels } = {}) {
    sel = selUid;
    const seen = new Set();
    for (const u of Object.values(st.units)) {
      if (u.hp <= 0) continue;
      seen.add(u.uid);
      let o = units.get(u.uid);
      if (!o) o = makeUnit(u);
      o.u = u;
      // une figurine qui a encore un déplacement à rejouer attend son tour (sinon elle glisserait trop tôt)
      if ((o.x !== u.x || o.y !== u.y) && !o.walking && !o.pend) { o.x = u.x; o.y = u.y; slide(o, wx(u.x), wz(u.y)); }
      const L = labels?.(u) || {};
      o.label.querySelector('.s3-hp i').style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
      o.label.querySelector('.s3-hp').classList.toggle('low', u.hp <= u.maxHp * 0.3);
      o.label.querySelector('.s3-badges').innerHTML = L.badges || '';
      o.label.querySelector('.s3-acts').innerHTML = L.acts || '';
      o.done = !!L.done;
      if (o.g.userData.front?.color) o.g.userData.front.color.setScalar(o.done ? 0.45 : 1);
    }
    for (const [uid, o] of units) if (!seen.has(uid) && !o.dying) removeUnit(uid);
  }
  function removeUnit(uid) { const o = units.get(uid); if (!o) return; unitG.remove(o.g); o.label.remove(); units.delete(uid); }

  // ——— Surbrillances ———
  const hintMat = (c) => new T.MeshBasicMaterial({ map: cellTex, color: c, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false });
  const hintGeo = new T.PlaneGeometry(0.92, 0.92);
  let hintCells = [];
  let hintSet = { move: new Set(), target: new Set(), hit: new Set(), tUnits: new Set() };
  function hints({ move = [], target = [], hit = [], tUnits = [] } = {}) {
    hintG.clear(); hintCells = [];
    const add = (c, col) => { const m = new T.Mesh(hintGeo, hintMat(col)); m.rotation.x = -Math.PI / 2; m.position.set(wx(c.x), FLOOR_Y + 0.008, wz(c.y)); hintG.add(m); hintCells.push(m); };
    move.forEach((c) => add(c, 0xffcf5a));
    target.forEach((c) => add(c, 0xb06aff));
    hintSet = { move: new Set(move.map((c) => `${c.x},${c.y}`)), target: new Set(target.map((c) => `${c.x},${c.y}`)), hit: new Set(hit), tUnits: new Set(tUnits) };
  }

  // ——— Animations ———
  const tweens = [];
  function tween(ms, f) {
    return new Promise((res) => { if (reduced) { f(1); res(); return; } tweens.push({ t0: performance.now(), ms, f, res }); });
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function slide(o, X, Z) { const x0 = o.g.position.x, z0 = o.g.position.z; return tween(260, (k) => { const e = ease(k); o.g.position.x = x0 + (X - x0) * e; o.g.position.z = z0 + (Z - z0) * e; o.g.position.y = Math.sin(Math.PI * k) * 0.25; }); }
  async function walk(uid, path) {
    const o = units.get(uid); if (!o) return;
    if (!path || path.length < 2) { o.pend = Math.max(0, (o.pend || 0) - 1); return; }
    o.walking = true;
    for (let i = 1; i < path.length; i++) await slide(o, wx(path[i].x), wz(path[i].y));
    const p = path[path.length - 1]; o.x = p.x; o.y = p.y; o.walking = false; o.pend = Math.max(0, (o.pend || 0) - 1);
  }
  async function bump(uid, toUid) {
    const o = units.get(uid), t = units.get(toUid); if (!o) return;
    const dx = t ? t.g.position.x - o.g.position.x : 0, dz = t ? t.g.position.z - o.g.position.z : -1, d = Math.hypot(dx, dz) || 1;
    const x0 = o.g.position.x, z0 = o.g.position.z;
    await tween(240, (k) => { const s = Math.sin(Math.PI * k) * 0.32; o.g.position.x = x0 + (dx / d) * s; o.g.position.z = z0 + (dz / d) * s; o.fig.rotation.x = -Math.sin(Math.PI * k) * 0.25; });
  }
  // Gerbe d'étincelles (coups, critiques)
  function sparks(X, Y, Z, col = 0xffb050, n = 12) {
    if (reduced) return;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      sp.scale.setScalar(0.12 + Math.random() * 0.1); sp.position.set(X, Y, Z); fxG.add(sp);
      const a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 1.6;
      parts.push({ sp, vx: Math.cos(a) * v, vy: 1 + Math.random() * 2.2, vz: Math.sin(a) * v });
    }
    let prev = 0;
    tween(520, (k) => { const dt = (k - prev) * 0.52; prev = k; for (const q of parts) { q.vy -= 9 * dt; q.sp.position.x += q.vx * dt; q.sp.position.y = Math.max(FLOOR_Y + 0.02, q.sp.position.y + q.vy * dt); q.sp.position.z += q.vz * dt; q.sp.material.opacity = 1 - k; } })
      .then(() => parts.forEach((q) => fxG.remove(q.sp)));
  }
  function hitFx(uid) {
    const o = units.get(uid); if (!o) return;
    const m = o.g.userData.front; pulse(o.g.position.x, o.g.position.z, 0xff3040);
    sparks(o.g.position.x, 0.7 * (o.g.userData.big || 1), o.g.position.z + 0.1, 0xff7040);
    const x0 = o.g.position.x;
    tween(320, (k) => { o.g.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.06 * (1 - k); if (m?.emissive) { m.emissive.setRGB(1 - k, 0.1 * (1 - k), 0.1 * (1 - k)); } });
  }
  async function death(uid) {
    const o = units.get(uid); if (!o) return;
    o.dying = true; o.label.style.opacity = '0';
    await tween(480, (k) => { o.fig.rotation.x = -k * 1.45; o.g.position.y = -k * 0.08; o.g.traverse((c) => { if (c.material && !Array.isArray(c.material)) { c.material.transparent = true; c.material.opacity = Math.min(c.material.opacity ?? 1, 1 - k * 0.9); } }); });
    removeUnit(uid);
  }
  function spawn(uid) {
    const o = units.get(uid); if (!o) return;
    pulse(o.g.position.x, o.g.position.z, 0x9a5aff);
    tween(420, (k) => { const s = 0.2 + 0.8 * ease(k); o.fig.scale.setScalar(s * o.g.userData.big); });
  }
  function pulse(X, Z, col) {
    const m = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map: haloTex, color: col, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(X, FLOOR_Y + 0.02, Z); fxG.add(m);
    tween(520, (k) => { m.scale.setScalar(0.4 + k * 1.1); m.material.opacity = 1 - k; }).then(() => fxG.remove(m));
  }
  function flash(x, y, r = 0) {
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const m = new T.Mesh(hintGeo, hintMat(0xff6a30)); m.rotation.x = -Math.PI / 2; m.position.set(wx(xx), FLOOR_Y + 0.02, wz(yy)); fxG.add(m);
      tween(600, (k) => { m.material.opacity = (1 - k) * 0.95; }).then(() => fxG.remove(m));
    }
  }
  // Dé qui roule sur la table à côté de la figurine qui agit, puis affiche son résultat
  const dieMat = new T.MeshStandardMaterial({ color: 0x1c1626, metalness: 0.35, roughness: 0.35, flatShading: true, emissive: 0x000000 });
  const dieEdge = new T.LineBasicMaterial({ color: 0xe8c35a });
  const TIER_COL = { crit: 0xffd36a, success: 0x7fe0a0, miss: 0x9fb4c8, fumble: 0xff4d6a, bonus: 0xffd36a };
  async function dice(e, label) {
    const o = units.get(e.u);
    const geo = e.d === 6 ? new T.BoxGeometry(0.36, 0.36, 0.36) : new T.IcosahedronGeometry(0.3, 0);
    const die = new T.Mesh(geo, dieMat.clone()); die.castShadow = true;
    die.add(new T.LineSegments(new T.EdgesGeometry(geo), dieEdge));
    const ox = o ? o.g.position.x : 0, oz = o ? o.g.position.z : 0;
    const side = ox > 0 ? -1 : 1;
    const x1 = ox + side * (0.55 + Math.random() * 0.2), z1 = oz + 0.35 + Math.random() * 0.2;
    const x0 = x1 + side * 0.9, z0 = z1 + 1.1, rest = FLOOR_Y + (e.d === 6 ? 0.18 : 0.25);
    const ax = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), spin = 16 + Math.random() * 8;
    die.position.set(x0, 1.8, z0); fxG.add(die);
    await tween(reduced ? 1 : 620, (k) => {
      // chute puis deux rebonds qui s'amortissent
      const y = k < 0.55 ? 1.8 - (1.8 - rest) * Math.pow(k / 0.55, 2) : k < 0.82 ? rest + Math.sin(((k - 0.55) / 0.27) * Math.PI) * 0.28 : rest + Math.sin(((k - 0.82) / 0.18) * Math.PI) * 0.08;
      die.position.set(x0 + (x1 - x0) * ease(k), y, z0 + (z1 - z0) * ease(k));
      die.rotateOnAxis(ax, (1 - k) * spin * 0.016);
    });
    const col = TIER_COL[e.tier] || 0xffffff;
    die.material.emissive.setHex(col); die.material.emissiveIntensity = 0.35;
    pulse(x1, z1, col);
    const v = new T.Vector3(x1, rest + 0.45, z1).project(camera);
    const t = document.createElement('div'); t.className = `s3-die ${e.tier || ''}`;
    t.innerHTML = `<b>${e.n}</b>${label ? `<span>${label}</span>` : ''}`;
    t.style.left = `${(v.x * 0.5 + 0.5) * host.clientWidth}px`; t.style.top = `${(-v.y * 0.5 + 0.5) * host.clientHeight}px`;
    ov.appendChild(t);
    await new Promise((r) => setTimeout(r, reduced ? 200 : e.tier === 'crit' || e.tier === 'fumble' ? 900 : 650));
    t.classList.add('out'); setTimeout(() => t.remove(), 300);
    tween(300, (k) => { die.scale.setScalar(1 - k); }).then(() => fxG.remove(die));
    if (e.tier === 'crit') { shake(0.12); sparks(x1, rest + 0.2, z1, 0xffd36a, 18); }
  }
  // Petite secousse de la caméra (critique, gardien)
  let shakeAmt = 0;
  function shake(a = 0.1) { shakeAmt = Math.max(shakeAmt, a); }

  // Texte qui s'envole au-dessus d'une figurine (dégâts, soins…)
  function float(uid, txt, cls) {
    const o = units.get(uid); if (!o) return;
    const p = project(o, 1.25); if (!p) return;
    const f = document.createElement('span'); f.className = `dv-float s3-float ${cls}`; f.textContent = txt;
    f.style.left = `${p.x}px`; f.style.top = `${p.y}px`; ov.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  // ——— Caméra : tourner au doigt, pincer pour zoomer ———
  const cam = { yaw: 0, pitch: 0.98, dist: 13, fit: 13, tx: 0, tz: 0.5 };
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // distance pour que tout le plateau tienne dans l'écran
    const vf = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const needW = (W + 0.8) / 2 / Math.tan(hf / 2), needH = (H * Math.cos(cam.pitch) * 0.5 + 1.6) / Math.tan(vf / 2);
    const fit = Math.max(needW, needH) * 1.02;
    if (cam.dist === cam.fit) cam.dist = fit;
    cam.fit = fit;
    cam.dist = Math.min(Math.max(cam.dist, fit * 0.5), fit * 1.25);
  }
  function placeCam() {
    const { yaw, pitch, dist } = cam;
    camera.position.set(cam.tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, cam.tz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(cam.tx, 0.2, cam.tz);
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const ptrs = new Map(); let drag = null, pinch = null, lastTouch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch, moved: 0, t: performance.now() };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.dist }; drag = null; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cam.dist = Math.min(cam.fit * 1.25, Math.max(cam.fit * 0.5, pinch.dist * (pinch.d / d))); lastTouch = performance.now(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 10) {
      cam.yaw = Math.max(-0.75, Math.min(0.75, drag.yaw - dx * 0.006));
      cam.pitch = Math.max(0.62, Math.min(1.35, drag.pitch + dy * 0.004));
      lastTouch = performance.now();
    }
  });
  const up = (e) => {
    const wasTap = drag && drag.moved <= 10 && ptrs.size === 1 && performance.now() - drag.t < 700;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (wasTap) onTap(pick(e.clientX, e.clientY));
    if (!ptrs.size) drag = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
  canvas.style.touchAction = 'none';
  // Retour doux à la vue de départ après un moment sans toucher
  function recenter() { cam.yaw = 0; cam.pitch = 0.98; cam.dist = cam.fit; }

  // Touché : figurine ou case du plateau
  const ray = new T.Raycaster(), ndc = new T.Vector2(), floorPlane = new T.Plane(new T.Vector3(0, 1, 0), -FLOOR_Y), hitP = new T.Vector3();
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const live = [...units.values()].filter((o) => !o.dying);
    // la case du plateau sous le doigt
    let cell = null;
    if (ray.ray.intersectPlane(floorPlane, hitP)) {
      const x = Math.round(hitP.x + (W - 1) / 2), y = Math.round(hitP.z + (H - 1) / 2);
      if (x >= 0 && y >= 0 && x < W && y < H) cell = { x, y };
    }
    const k0 = cell && `${cell.x},${cell.y}`;
    const cellFree = cell && (hintSet.move.has(k0) || hintSet.target.has(k0)) && !live.some((o) => o.u.x === cell.x && o.u.y === cell.y);
    // 1. une figurine visible sous le doigt (la plus proche de la caméra)
    const hits = ray.intersectObjects(live.flatMap((o) => o.picks), false);
    if (hits.length) {
      const uid = hits[0].object.userData.uid, o = units.get(uid);
      if (hintSet.hit.has(uid) || hintSet.tUnits.has(uid)) return { uid };
      // ta figurine déjà choisie, ou un ennemi hors de portée, cache une case dorée : c'est la case qu'on vise
      if (cellFree && (uid === sel || o.u.side !== 'ally')) return { cell };
      return { uid };
    }
    // 2. la case elle-même
    if (cell) {
      const k = `${cell.x},${cell.y}`;
      const on = live.find((o) => o.u.x === cell.x && o.u.y === cell.y);
      if (!on && (hintSet.move.has(k) || hintSet.target.has(k))) return { cell };
      if (on) return { uid: on.u.uid };
    }
    // 3. tout près d'une figurine (doigt un peu à côté de la carte) : la plus proche, en priorité une cible possible
    let best = null, bd = 34;
    for (const o of live) {
      const p = project(o, 0.62); if (!p) continue;
      const d = Math.hypot(p.x - (cx - r.left), p.y - (cy - r.top)) - (hintSet.hit.has(o.u.uid) || hintSet.tUnits.has(o.u.uid) ? 10 : 0);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) return { uid: best.u.uid };
    return cell ? { cell } : null;
  }

  // ——— Projection pour les étiquettes (PV, actions) ———
  const v3 = new T.Vector3();
  function project(o, hgt) {
    v3.set(o.g.position.x, (FLOOR_Y + 0.1 + ART_H + 0.12) * (o.g.userData.big || 1) * (hgt || 1) + o.g.position.y, o.g.position.z);
    v3.project(camera);
    if (v3.z > 1) return null;
    return { x: (v3.x * 0.5 + 0.5) * host.clientWidth, y: (-v3.y * 0.5 + 0.5) * host.clientHeight };
  }

  // ——— Boucle ———
  let raf = 0, alive = true, last = performance.now(), lastDraw = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    // au repos (torches, poussière), 30 images par seconde suffisent : la batterie dure plus longtemps
    if (!tweens.length && !drag && !pinch && shakeAmt < 0.001 && now - lastDraw < 31) return;
    lastDraw = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i], k = Math.min(1, (now - tw.t0) / tw.ms); tw.f(k); if (k >= 1) { tweens.splice(i, 1); tw.res(); } }
    if (!drag && !pinch && now - lastTouch > 6000 && (cam.yaw || cam.dist !== cam.fit || cam.pitch !== 0.98)) {
      cam.yaw *= 0.96; cam.pitch += (0.98 - cam.pitch) * 0.04; cam.dist += (cam.fit - cam.dist) * 0.04;
      if (Math.abs(cam.yaw) < 0.002 && Math.abs(cam.pitch - 0.98) < 0.002 && Math.abs(cam.dist - cam.fit) < 0.01) recenter();
    }
    placeCam();
    if (shakeAmt > 0.001 && !reduced) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt; shakeAmt *= 0.88; } else shakeAmt = 0;
    const t = now / 1000;
    for (const f of flames) {
      const fl = 0.85 + Math.sin(t * 9 + f.seed) * 0.08 + Math.sin(t * 23 + f.seed * 2) * 0.06 + (Math.random() - 0.5) * 0.06;
      f.sprite.scale.set(0.42 * fl, 0.62 * fl, 1);
      if (f.light) f.light.intensity = f.base * fl;
    }
    if (dust && !reduced) { const p = dust.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 0.05; if (y > 2.5) y = 0.2; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.02); } p.needsUpdate = true; }
    const pz = 0.55 + Math.sin(t * 4) * 0.25;
    for (const m of hintCells) m.material.opacity = pz + 0.2;
    // figurines : face à la caméra, anneaux, étiquettes
    for (const o of units.values()) {
      if (!o.dying) { o.fig.rotation.y = Math.atan2(camera.position.x - o.g.position.x, camera.position.z - o.g.position.z); if (o.g.userData.card) o.g.userData.card.rotation.x = -(cam.pitch - 0.25) * 0.35; }
      const isSel = sel === o.u.uid;
      o.ring.material.opacity = isSel ? 0.75 + Math.sin(t * 5) * 0.2 : 0;
      o.fig.position.y = isSel && !reduced ? 0.06 + Math.sin(t * 3) * 0.03 : 0;
      const tg = hintSet.hit.has(o.u.uid) || hintSet.tUnits.has(o.u.uid);
      o.tgt.material.opacity = tg ? 0.95 : 0;
      o.tgt.material.color.setHex(hintSet.hit.has(o.u.uid) ? 0xff4a5e : 0x7fe0a0);
      if (tg) o.tgt.rotation.z = t * 0.8;
      const p = project(o);
      if (p && !o.dying) { o.label.style.transform = `translate(${p.x}px, ${p.y}px)`; o.label.style.opacity = '1'; } else o.label.style.opacity = '0';
    }
    renderer.render(scene, camera);
  }
  resize();
  raf = requestAnimationFrame(frame);

  return {
    room(st) { room(st); for (const uid of [...units.keys()]) removeUnit(uid); resize(); },
    sync, hints, walk,
    // déplacements à venir dans la liste d'événements ; settle() les libère tous à la fin
    expect(uids) { for (const uid of uids) { const o = units.get(uid); if (o) o.pend = (o.pend || 0) + 1; } },
    settle() { for (const o of units.values()) o.pend = 0; }, bump, hit: hitFx, death, spawn, flash, float, chest, door: setDoor, traps, dice, shake,
    hintSet: () => hintSet,
    // pour les tests automatisés : position à l'écran d'une case ou d'une figurine
    pickAt(x, y) { return pick(x, y); },
    screenOfCell(x, y) { const r = canvas.getBoundingClientRect(); v3.set(wx(x), FLOOR_Y, wz(y)).project(camera); return { x: r.left + (v3.x * 0.5 + 0.5) * r.width, y: r.top + (-v3.y * 0.5 + 0.5) * r.height }; },
    screenOfUnit(uid) { const o = units.get(uid); if (!o) return null; const r = canvas.getBoundingClientRect(); v3.set(o.g.position.x, 0.6 * (o.g.userData.big || 1), o.g.position.z).project(camera); return { x: r.left + (v3.x * 0.5 + 0.5) * r.width, y: r.top + (-v3.y * 0.5 + 0.5) * r.height }; },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss?.(); host.innerHTML = ''; },
  };
}
