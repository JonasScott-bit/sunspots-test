// dreamstore.js — LAST MINUTE SNACKS, inside. Scott (Oct 31): the Level 1 store is a happy DREAM store, lots of floatiness —
// snacks drifting, bobbing and spinning in the air like a dream ("the paradise bliss float").
// Played from scenes.js as a blocking beat of store_win ({ do: 'interior' }): the Wolf goes in the door -> fade -> you walk
// him around a warm glowing felt shop (floating thumb pad like town, arrows/WASD), grab 3-5 floating snacks (walk into one,
// or tap it and he walks over), then the counter: the Clerk rings him up -> fade -> back outside to the existing exit beat.
// Late = the lose scene (door locked), so there is no interior. Skip (hold SKIP) jumps straight out.
// Budget: ~25-40k tris by tier, rigs: the Wolf + the Clerk (heron) = 2, snacks are InstancedMesh (one draw per product),
// no real lights added (warm look = the scene's own hemi/key re-tinted while inside + emissive lamps), so no shader recompiles.
// Built in the main scene out past the store (north of the road end, nothing else in view), hidden until used.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quality } from './quality.js';

const O = { x: 90, z: -1086 };                 // interior centre (world); local +z = toward the door/camera, -z = back wall
const HW = 4.4, HD = 3.2, H = 3.3, FR = HD + 3.4;   // half width, half depth of the shop floor, height; FR = front wall (an entry run so the camera sits inside)
const DOOR = [0, HD + 0.7], COUNTER = { x: 3.25, z: 1.35 }, CLERK_AT = [4.1, 1.35];
const PRODUCTS = [   // invented packaging only (same names as the snack run shelf)
  { id: 'puffs', n: 'MOON PUFFS', kind: 'bag', c: '#f3d36b', f: '#4a2a7a', b: '#7a4ad8' },
  { id: 'sour', n: 'SOUR SUNSPOTS', kind: 'bag', c: '#ff8a5c', f: '#fff3dc', b: '#ffd23a' },
  { id: 'nacho', n: 'NACHO NOVA', kind: 'bag', c: '#ff9f2a', f: '#3a1a10', b: '#c8463f' },
  { id: 'pickle', n: 'PICKLE CRISPS', kind: 'bag', c: '#8cc56a', f: '#1e3a1a', b: '#f3e6a8' },
  { id: 'cheez', n: 'CHEEZ-NO', kind: 'bag', c: '#ffd23a', f: '#c8463f', b: '#ff8a5c' },
  { id: 'gloop', n: 'GLOOP COLA', kind: 'can', c: '#7a3a2a', f: '#ffe7a8', b: '#c8463f' },
  { id: 'frosty', n: 'FROSTY FLOP', kind: 'can', c: '#bfe6f2', f: '#2a4a7a', b: '#ffffff' },
  { id: 'drops', n: 'DREAM DROPS', kind: 'candy', c: '#ffb0c8', f: '#7a2a4a', b: '#ffe7f0' },
];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k, smooth = (k) => k * k * (3 - 2 * k);

export function createDreamStore(ctx) {
  const { scene, feltMat, getWolf, puppet, actors, onSay, voDur, ui } = ctx;
  const camera = ctx.camera;
  const tierLow = () => { try { return quality.tier === 'low'; } catch (_) { return false; } };
  const DS = { active: false, built: false, root: null, heroes: [], inst: [], t: 0 };
  const toW = (x, y, z, out = new THREE.Vector3()) => out.set(O.x + x, y, O.z + z);

  // ---------------------------------------------------------------- textures (canvas, felt-ish)
  function cv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  const fibres = (g, w, h, a = 0.05, n = 900) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,20,40'},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); } };
  const soft = (inner, outer = 'rgba(255,255,255,0)') => cv(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  function labelTex(p) {
    return cv(256, 256, (g, w, h) => {
      g.fillStyle = p.c; g.fillRect(0, 0, w, h); fibres(g, w, h, 0.05);
      g.fillStyle = p.b; g.beginPath(); g.ellipse(w / 2, h * 0.56, w * 0.36, h * 0.2, -0.2, 0, Math.PI * 2); g.fill();   // the window / blob
      g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * (0.18 + i * 0.16), h * 0.86, 6, 0, 7); g.fill(); }
      g.fillStyle = p.f; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = p.n.split(' '); g.font = `900 ${words.length > 1 ? 40 : 48}px Futura, Avenir, 'Arial Black', sans-serif`;
      words.forEach((wd, i) => g.fillText(wd, w / 2, h * (0.22 + i * 0.17)));
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);   // crimps
    });
  }

  // ---------------------------------------------------------------- geometry
  function bagGeo() {   // a puffed pillow bag: box with the faces bulged, crimped top/bottom
    const g = new THREE.BoxGeometry(0.34, 0.46, 0.13, 4, 6, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.17, y = p.getY(i) / 0.23, z = p.getZ(i);
      const puff = Math.max(0, 1 - x * x) * Math.max(0, 1 - Math.pow(Math.abs(y), 3)); p.setZ(i, z * (0.25 + 1.35 * puff)); p.setX(i, p.getX(i) * (1 - 0.08 * Math.abs(y))); }
    g.computeVertexNormals(); return g;
  }
  const canGeo = () => { const g = new THREE.CylinderGeometry(0.075, 0.075, 0.21, 14, 1); g.rotateY(Math.PI); return g; };
  function candyGeo() { const s = new THREE.SphereGeometry(0.075, 10, 7); s.scale(1.25, 1, 1);
    const a = new THREE.ConeGeometry(0.06, 0.1, 7); a.rotateZ(Math.PI / 2); a.translate(0.14, 0, 0); const b = a.clone(); b.rotateZ(Math.PI);
    return mergeGeometries([s.toNonIndexed(), a.toNonIndexed(), b.toNonIndexed()]); }

  // ---------------------------------------------------------------- build (once, hidden)
  const mats = [];
  function M(color, extra) { const m = feltMat(color, extra); mats.push(m); return m; }
  function box(G, w, h, d, x, y, z, color, extra) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, extra)); m.position.set(x, y, z); G.add(m); return m; }
  const COLL = [];   // local AABBs [x0, x1, z0, z1]
  function solid(x, z, w, d) { COLL.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); }
  function build() {
    if (DS.built) return; DS.built = true; const low = tierLow();
    const G = new THREE.Group(); G.position.set(O.x, 0, O.z); G.visible = false; scene.add(G); DS.root = G;
    // floor: warm checker felt
    const floorT = cv(256, 256, (g, w, h) => { const s = w / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f8e6d2' : '#f2c6c0'; g.fillRect(i * s, j * s, s, s); } fibres(g, w, h, 0.05, 1500); });
    floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(4.4, 3.2);
    floorT.repeat.set(4.4, (HD + FR) / 2); const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HD + FR), M('#ffffff', { map: floorT })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.025, (FR - HD) / 2); G.add(floor);   // above the desert ground plane (no z-fight)
    // walls: peach-to-lilac dream wallpaper with felt clouds
    const wallT = cv(256, 256, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, '#c9a8e0'); l.addColorStop(0.55, '#f4b8b0'); l.addColorStop(1, '#f6caa0'); g.fillStyle = l; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,246,236,0.55)'; for (let i = 0; i < 7; i++) { const x = (i * 71) % w, y = 30 + (i * 53) % 110; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 14, y + (k % 2) * 6, 14, 0, 7); g.fill(); } }
      g.fillStyle = 'rgba(122,74,150,0.35)'; g.fillRect(0, h * 0.72, w, 6); fibres(g, w, h, 0.05, 1500); });
    wallT.wrapS = THREE.RepeatWrapping; wallT.repeat.set(3, 1);
    const wallM = M('#ffffff', { map: wallT, side: THREE.DoubleSide });
    const wall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallM); m.position.set(x, H / 2, z); m.rotation.y = ry; G.add(m); return m; };
    const D2 = HD + FR, zc = (FR - HD) / 2;
    wall(HW * 2, 0, -HD, 0); wall(D2, -HW, zc, Math.PI / 2); wall(D2, HW, zc, -Math.PI / 2); wall(HW * 2, 0, FR, Math.PI);
    // ceiling + glowing felt moon lamps
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, D2), M('#d8b4e4')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, zc); G.add(ceil);
    const lampM = M('#fff1c8', { emissive: new THREE.Color('#ffd89a'), emissiveIntensity: 1.6 });
    const lampG = new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); lampG.rotateX(Math.PI);
    DS.lamps = [[-2.6, -1.2], [0, -1.2], [2.6, -1.2], [-1.4, 1.4], [1.4, 1.4]].map(([x, z]) => { const m = new THREE.Mesh(lampG, lampM); m.position.set(x, H, z); G.add(m); return m; });
    // light shafts (soft additive cones) under the lamps = the dreamy haze
    const shaftT = cv(32, 128, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, 'rgba(255,226,170,0.55)'); l.addColorStop(1, 'rgba(255,190,200,0)'); g.fillStyle = l; g.fillRect(0, 0, w, h); });
    const shaftM = new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: low ? 0.35 : 0.5 });
    const shaftG = new THREE.CylinderGeometry(0.25, 1.15, H - 0.05, 16, 1, true); shaftG.translate(0, -(H - 0.05) / 2, 0);
    DS.shafts = DS.lamps.slice(0, low ? 3 : 5).map((l) => { const m = new THREE.Mesh(shaftG, shaftM); m.position.set(l.position.x, H - 0.02, l.position.z); m.renderOrder = 5; G.add(m); return m; });
    // shelving: three back units + two island gondolas (felt, rounded look via a top lip), counter front right
    const SH = ['#7a4ad8', '#3aa8a0', '#e0607a'];
    const unit = (x, z, w, d, h, ci, ry = 0) => { const u = new THREE.Group(); u.position.set(x, 0, z); u.rotation.y = ry; G.add(u);
      box(u, w, h, 0.08, 0, h / 2, -d / 2 + 0.04, SH[ci]); box(u, 0.08, h, d, -w / 2, h / 2, 0, SH[ci]); box(u, 0.08, h, d, w / 2, h / 2, 0, SH[ci]);
      for (const y of [0.12, 0.62, 1.12, 1.62]) if (y < h) box(u, w, 0.06, d, 0, y, 0, '#fff0dc');
      return u; };
    unit(-2.7, -HD + 0.3, 2.3, 0.55, 1.9, 0); unit(0, -HD + 0.3, 2.3, 0.55, 1.9, 1); unit(2.7, -HD + 0.3, 2.3, 0.55, 1.9, 2);
    solid(0, -HD + 0.3, HW * 2, 0.7);
    unit(-1.75, 0.05, 1.7, 0.7, 1.25, 1, Math.PI / 2); unit(0.75, 0.05, 1.7, 0.7, 1.25, 2, Math.PI / 2);
    solid(-1.75, 0.05, 0.8, 1.8); solid(0.75, 0.05, 0.8, 1.8);
    // the counter + register + a tiny bell, and the sign
    box(G, 0.9, 1.0, 1.9, COUNTER.x + 0.1, 0.5, COUNTER.z, '#f6b23a'); box(G, 1.0, 0.07, 2.0, COUNTER.x + 0.1, 1.03, COUNTER.z, '#fff0dc');
    box(G, 0.36, 0.26, 0.32, COUNTER.x + 0.15, 1.2, COUNTER.z + 0.45, '#5a4a6a'); box(G, 0.3, 0.12, 0.05, COUNTER.x + 0.15, 1.38, COUNTER.z + 0.35, '#9fe8b0', { emissive: new THREE.Color('#4ad07a'), emissiveIntensity: 0.6 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffd23a')); bell.position.set(COUNTER.x - 0.2, 1.07, COUNTER.z - 0.4); G.add(bell);
    solid(COUNTER.x + 0.1, COUNTER.z, 1.0, 2.0); solid(CLERK_AT[0], CLERK_AT[1], 0.6, 0.8);
    const signT = cv(512, 128, (g, w, h) => { g.fillStyle = '#4a2a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd89a'; g.font = "900 54px Futura, Avenir, 'Arial Black', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PARADISE BLISS', w / 2, h * 0.42); g.font = '700 22px Futura, Avenir, sans-serif'; g.fillStyle = '#ffb0c8'; g.fillText('THE FLOATING AISLES · OPEN TILL 2', w / 2, h * 0.8); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), M('#ffffff', { map: signT, emissive: new THREE.Color('#ffffff'), emissiveMap: signT, emissiveIntensity: 0.55 })); sign.position.set(0, 2.6, -HD + 0.02); G.add(sign);
    // floating snacks: one InstancedMesh per product
    const geos = { bag: bagGeo(), can: canGeo(), candy: candyGeo() };
    const per = low ? 7 : 12; const _m = new THREE.Matrix4();
    for (const p of PRODUCTS) {
      const tex = labelTex(p), mat = M('#ffffff', { map: tex, emissive: new THREE.Color(p.c), emissiveIntensity: 0.12 }); p.mat = mat; p.geo = geos[p.kind];
      const im = new THREE.InstancedMesh(p.geo, mat, per); im.frustumCulled = false; G.add(im);
      const st = [];
      for (let i = 0; i < per; i++) {
        // half drift off the shelves (back wall + gondolas), half hang up in the air over the aisles
        let x, y, z; const r = Math.random();
        // clearances (drift +-0.28/0.16/0.22 + half a bag): never through a shelf, a gondola top, a wall or the ceiling
        if (r < 0.35) { x = -HW + 0.8 + Math.random() * (HW * 2 - 1.6); z = -HD + 1.05 + Math.random() * 0.3; y = 0.55 + Math.random() * 2.1; }
        else if (r < 0.6) { const gx = Math.random() < 0.5 ? -1.75 : 0.75; x = gx + (Math.random() - 0.5) * 0.8; z = 0.05 + (Math.random() - 0.5) * 1.4; y = 1.75 + Math.random() * 0.95; }
        else { x = -HW + 0.8 + Math.random() * (HW * 2 - 1.6); z = -HD + 1.1 + Math.random() * (HD * 2 - 0.6); y = 1.9 + Math.random() * 0.85; }
        st.push({ x, y, z, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.35, s: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6), tilt: 0.3 + Math.random() * 0.5, sc: 0.85 + Math.random() * 0.4 });
      }
      DS.inst.push({ im, st, p }); }
    // the grabbable ones: bigger, glowing halo, at paw height in the aisles
    const haloM = new THREE.SpriteMaterial({ map: soft('rgba(255,236,190,0.9)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const spots = [[-3.3, -1.6], [-0.55, -1.75], [2.0, -1.7], [-3.0, 0.9], [-0.5, 1.15], [1.9, 0.4], [-2.4, 2.1], [0.9, 2.25], [-1.0, -1.3], [3.4, -0.6]];
    spots.forEach(([x, z], i) => { const p = PRODUCTS[i % PRODUCTS.length]; const g = new THREE.Group(); const m = new THREE.Mesh(p.geo, p.mat); m.scale.setScalar(p.kind === 'bag' ? 1.25 : 1.7); g.add(m);
      const h = new THREE.Sprite(haloM); h.scale.setScalar(0.85); g.add(h); g.position.set(x, 1.05, z); G.add(g);
      DS.heroes.push({ g, m, h, p, x, z, ph: i * 0.9, got: false, fly: 0 }); });
    // drifting motes
    const N = low ? 70 : 160, pos = new Float32Array(N * 3), col = new Float32Array(N * 3); DS.motes = [];
    const pal = [new THREE.Color('#ffe7a8'), new THREE.Color('#ffb0c8'), new THREE.Color('#c9a8ff'), new THREE.Color('#fff3dc')];
    for (let i = 0; i < N; i++) { DS.motes.push({ x: (Math.random() * 2 - 1) * HW, y: Math.random() * H, z: (Math.random() * 2 - 1) * HD, v: 0.05 + Math.random() * 0.12, ph: Math.random() * 6.28 }); const c = pal[i % 4]; col.set([c.r, c.g, c.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: soft('rgba(255,255,255,1)'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
    pts.frustumCulled = false; G.add(pts); DS.pts = pts;
    // the Wolf's soft shadow + the counter ring (shows once he has enough)
    DS.blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ map: soft('rgba(60,20,50,0.45)', 'rgba(60,20,50,0)'), transparent: true, depthWrite: false, fog: false })); DS.blob.rotation.x = -Math.PI / 2; DS.blob.position.y = 0.035; G.add(DS.blob);
    DS.ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32), new THREE.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); DS.ring.rotation.x = -Math.PI / 2; DS.ring.position.set(COUNTER.x - 0.95, 0.04, COUNTER.z); G.add(DS.ring);
    for (const o of G.children) o.traverse?.((k) => { if (k.isMesh) { k.castShadow = false; k.receiveShadow = false; } });
    G.updateMatrixWorld(true);
    let n = 0; G.traverse((o) => { if (o.isMesh) { const g = o.geometry, c = (g.index ? g.index.count : g.attributes.position.count) / 3; n += c * (o.isInstancedMesh ? o.count : 1); } }); DS.tris = Math.round(n);
    // warm up the shaders while the player is still driving
    try { const r = window.__sunspots?.renderer; if (r?.compileAsync) { G.visible = true; r.compileAsync(G, camera, scene).catch(() => {}).finally(() => { if (!DS.active) G.visible = false; }); } } catch (_) {}
  }

  // ---------------------------------------------------------------- overlay: HUD pill, thumb pad, warm haze, fades
  let ov = null;
  function overlay() {
    if (ov) return ov; const st = document.createElement('style');
    st.textContent = `#dsOv{position:fixed;inset:0;z-index:7;display:none;touch-action:none}
#dsOv .haze{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 35%,rgba(255,226,190,.12),rgba(255,190,210,.05) 50%,rgba(0,0,0,0) 100%);mix-blend-mode:screen}
#dsOv .vig{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 90px rgba(40,10,40,.35)}
#dsOv .pill{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);transform:translateX(-50%);padding:8px 16px;border-radius:22px;background:rgba(58,30,80,.72);color:#fff3dc;font:700 13px/1.25 Futura,Avenir,sans-serif;letter-spacing:.08em;text-align:center;white-space:nowrap;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.3)}
#dsOv .pill b{color:#ffd89a;font-size:15px;letter-spacing:.14em;display:block}
#dsOv .pill i{font-style:normal;color:#ffb0c8}
#dsOv .tip{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);transform:translateX(-50%);color:rgba(255,243,220,.85);font:600 12px Futura,Avenir,sans-serif;letter-spacing:.12em;pointer-events:none;text-align:center;width:90vw;transition:opacity .5s}
#dsOv .pad{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,240,220,.18);border:2px solid rgba(255,240,220,.45);display:none;pointer-events:none}
#dsOv .pad i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(255,240,220,.7)}
#dsFade{position:fixed;inset:0;z-index:12;background:#140a18;opacity:0;pointer-events:none;transition:opacity .45s}
body.dsIn #sceneSub{bottom:calc(env(safe-area-inset-bottom,0px) + 64px)}
body.dsIn #chatBubble,body.scene #chatBubble,body.dsIn #fuzzo{display:none!important}`;
    document.head.appendChild(st);
    ov = document.createElement('div'); ov.id = 'dsOv'; ov.innerHTML = '<div class="haze"></div><div class="vig"></div><div class="pill"></div><div class="tip">DRAG TO WALK · TAP A GLOWING SNACK</div><div class="pad"><i></i></div>';
    document.body.appendChild(ov); const f = document.createElement('div'); f.id = 'dsFade'; document.body.appendChild(f); DS.fadeEl = f;
    const pad = ov.querySelector('.pad'), knob = pad.querySelector('i'); const R = 52; let id = null, o0 = null, t0 = 0, moved = 0;
    ov.addEventListener('pointerdown', (e) => { if (!DS.active || DS.phase !== 'shop') return; if (id !== null) return; id = e.pointerId; o0 = { x: e.clientX, y: e.clientY }; t0 = performance.now(); moved = 0;
      pad.style.left = e.clientX + 'px'; pad.style.top = e.clientY + 'px'; knob.style.transform = ''; try { ov.setPointerCapture(id); } catch (_) {} e.preventDefault(); });
    ov.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; let dx = e.clientX - o0.x, dy = e.clientY - o0.y; const l = Math.hypot(dx, dy); moved = Math.max(moved, l);
      if (l > 8) { pad.style.display = 'block'; DS.goal = null; } if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; DS.in.x = dx / R; DS.in.y = dy / R; });
    const up = (e) => { if (e.pointerId !== id) return; id = null; pad.style.display = 'none'; DS.in.x = DS.in.y = 0;
      if (moved < 10 && performance.now() - t0 < 350) tapAt(e.clientX, e.clientY); };
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
    return ov;
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tapAt(x, y) {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    let best = null, bd = 1e9; const tmp = new THREE.Vector3();
    for (const h of DS.heroes) { if (h.got) continue; h.g.getWorldPosition(tmp); const d = ray.ray.distanceSqToPoint(tmp), r = 0.55 + 0.07 * tmp.distanceTo(camera.position); if (d < r * r && d < bd) { bd = d; best = h; } }   // forgiving: a fingertip on a phone
    if (best) { DS.goal = { x: best.x, z: best.z + 0.0, hero: best }; return; }
    // tap the floor = walk there
    const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) DS.goal = { x: clamp(hit.x - O.x, -HW + 0.4, HW - 0.4), z: clamp(hit.z - O.z, -HD + 0.75, HD + 1.8) };
  }
  function fade(on) { if (DS.fadeEl) DS.fadeEl.style.opacity = on ? 1 : 0; }
  function setPill() { const n = DS.got, el = ov.querySelector('.pill');
    el.innerHTML = n < 3 ? `<b>PARADISE BLISS</b>GRAB SNACKS <i>${n} / 3</i>` : n < 5 ? `<b>PARADISE BLISS</b><i>${n}</i> IN PAW · THE COUNTER (OR GRAB UP TO 5)` : `<b>PARADISE BLISS</b>PAWS FULL · TAKE THEM TO THE COUNTER`; }

  // ---------------------------------------------------------------- lines (subtitle bar + the recorded voice)
  const SPK = { wolf: ['WOLF', '#f6b23a'], clerk: ['CLERK', '#c9a2ff'] };
  DS.lines = []; DS.lineT = 0;
  function say(who, text, vo, keep) { DS.lines.push({ who, text, vo, keep }); }
  function sayNow(who, text, vo) { DS.lines = DS.lines.filter((l) => l.keep); say(who, text, vo); }   // reactions: only the newest one waits
  function tickLines(dt) {
    if (DS.lineT > 0) { DS.lineT -= dt; if (DS.lineT <= 0) ui.sub?.classList.remove('on'); return; }
    const l = DS.lines.shift(); if (!l) return;
    const d = Math.max(1.6, 0.9 + l.text.length * 0.055, (l.vo ? (voDur?.(l.vo) || 0) + 0.35 : 0));
    try { onSay?.(l.who, true, d, l.vo); } catch (_) {}
    if (ui.sub) { ui.subName.textContent = SPK[l.who][0]; ui.subName.style.color = SPK[l.who][1]; ui.subText.textContent = l.text; ui.sub.classList.add('on'); }
    DS.lineT = d + 0.15; const c = actors().clerk; if (l.who === 'clerk' && c) c.nod = 0;
  }
  const lineBusy = () => DS.lineT > 0 || DS.lines.length > 0;

  // ---------------------------------------------------------------- the beat
  const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _l = new THREE.Vector3(), _cl = new THREE.Vector3();
  function collide(p) {
    p.x = clamp(p.x, -HW + 0.35, HW - 0.35); p.z = clamp(p.z, -HD + 0.35, HD + 1.6);
    for (const [x0, x1, z0, z1] of COLL) { const r = 0.3; if (p.x > x0 - r && p.x < x1 + r && p.z > z0 - r && p.z < z1 + r) {
      const dl = p.x - (x0 - r), dr = (x1 + r) - p.x, dn = p.z - (z0 - r), ds = (z1 + r) - p.z, m = Math.min(dl, dr, dn, ds);
      if (m === dl) p.x = x0 - r; else if (m === dr) p.x = x1 + r; else if (m === dn) p.z = z0 - r; else p.z = z1 + r; } }
  }
  function task(run, opts = {}) {
    build(); overlay();
    const w = getWolf(), clerk = actors().clerk, fin = window.__sunspots?.fin;
    const S = { p: new THREE.Vector3(DOOR[0], 0, DOOR[1]), yaw: Math.PI, speed: 0, t: 0, done: false, ended: false };
    DS.active = true; DS.phase = 'in'; DS.got = 0; DS.t = 0; DS.in = { x: 0, y: 0 }; DS.goal = null; DS.lines = []; DS.lineT = 0; DS.idle = 0; DS.nag = 0; DS.saidFloat = false;
    for (const h of DS.heroes) { h.got = false; h.fly = 0; h.g.visible = true; h.g.scale.setScalar(1); h.g.position.set(h.x, 1.05, h.z); }
    const saved = fin ? { hemiI: fin.hemi.intensity } : null;
    let fadeT = 0;
    fade(true);
    const begin = () => {
      DS.root.visible = true; ov.style.display = 'block'; document.body.classList.add('dsIn'); document.body.classList.remove('lbox');
      if (w) { w.visible = true; w.scale.setScalar(puppet.base || 1); } puppet.on = true; puppet.speed = 0;
      if (clerk) { toW(CLERK_AT[0], 0, CLERK_AT[1], _v); clerk.setPos(_v.x, _v.z, 0); clerk.setYaw(-Math.PI / 2); clerk.show(true); clerk.look = null; }
      S.p.set(DOOR[0], 0, DOOR[1]); S.yaw = Math.PI; setPill(); ov.querySelector('.tip').style.opacity = 1;
      say('clerk', 'Ah. A customer. How unexpected.', 'vo_clerk_07', true); say('clerk', 'Welcome to the store. Please do not touch the floating merchandise.', 'vo_clerk_03', true);
      DS.phase = 'shop'; setTimeout(() => fade(false), 60); };
    const out = () => { if (S.ended) return; S.ended = true; DS.active = false; DS.phase = 'off';
      DS.root.visible = false; ov.style.display = 'none'; document.body.classList.remove('dsIn'); if (document.body.classList.contains('scene')) document.body.classList.add('lbox');
      ui.sub?.classList.remove('on'); DS.lines = []; DS.lineT = 0;
      if (w) w.visible = false; puppet.speed = 0;
      if (clerk) clerk.show(false);
      if (saved && fin) fin.hemi.intensity = saved.hemiI;
      window.__dreamStore = { played: true, got: DS.got, secs: +S.t.toFixed(1) }; setTimeout(() => fade(false), 80); };
    let startT = 0.5, checkout = 0;
    return {
      update(dt) {
        S.t += dt; DS.t += dt; const t = DS.t;
        if (DS.phase === 'in') { startT -= dt; if (startT <= 0) begin(); return false; }
        if (DS.phase === 'outro') { fadeT -= dt; if (fadeT <= 0) { out(); return true; } animate(dt, t); return false; }
        // --- shop: move
        let ix = DS.in.x, iy = DS.in.y; const k = window.__sunspots?.keys || {};
        if (k.ArrowLeft || k.KeyA) ix -= 1; if (k.ArrowRight || k.KeyD) ix += 1; if (k.ArrowUp || k.KeyW) iy -= 1; if (k.ArrowDown || k.KeyS) iy += 1;
        let mx = ix, mz = iy;
        if (Math.hypot(mx, mz) < 0.12 && DS.goal) { mx = DS.goal.x - S.p.x; mz = DS.goal.z - S.p.z; const d = Math.hypot(mx, mz); if (d < 0.12) { DS.goal = null; mx = mz = 0; } else { mx /= d; mz /= d; if (d < 0.5) { mx *= d / 0.5; mz *= d / 0.5; } } }
        const m = Math.min(1, Math.hypot(mx, mz)), want = phase() === 'checkout' ? 0 : m * 2.1;
        S.speed = lerp(S.speed, want, 1 - Math.exp(-dt * 8));
        if (m > 0.05 && phase() !== 'checkout') { const y = Math.atan2(mx, mz); S.yaw += Math.atan2(Math.sin(y - S.yaw), Math.cos(y - S.yaw)) * Math.min(1, dt * 10);
          const l = Math.hypot(mx, mz) || 1; S.p.x += mx / l * S.speed * dt; S.p.z += mz / l * S.speed * dt; collide(S.p); DS.idle = 0; ov.querySelector('.tip').style.opacity = 0; } else DS.idle += dt;
        // --- grab: walk into one (paw reach)
        for (const h of DS.heroes) { if (h.got || DS.got >= 5) continue; if (Math.hypot(h.x - S.p.x, h.z - S.p.z) < 0.62) { h.got = true; h.fly = 0.001; DS.got++; setPill(); ctx.playCue?.('sfx_chip_bag');
          if (DS.goal?.hero === h) DS.goal = null;
          if (DS.got === 1 && !DS.saidFloat) { DS.saidFloat = true; sayNow('wolf', 'The chips are floating. Of course they are.', 'vo_wolf_18'); }
          else if (DS.got === 2) sayNow('clerk', 'The chips are free-range. They go where they like.', 'vo_clerk_04');
          else if (DS.got === 3) sayNow('clerk', 'The pretzels chose you. Congratulations.', 'vo_clerk_10');
          else if (DS.got === 5) sayNow('clerk', 'Will that be everything, or will you be lingering?', 'vo_clerk_08'); } }
        // --- nudges
        if (DS.idle > 14 && !lineBusy() && DS.nag < 2) { DS.idle = 0; DS.nag++; say('clerk', DS.nag === 1 ? 'That aisle is for looking, not for wanting.' : 'You have until two. I have a clock. It is very accurate.', DS.nag === 1 ? 'vo_clerk_06' : 'vo_clerk_05'); }
        // --- the counter
        if (DS.got >= 3 && !checkout && Math.hypot(S.p.x - (COUNTER.x - 0.95), S.p.z - COUNTER.z) < 0.75) { checkout = 1; DS.goal = null; DS.phase = 'checkout';
          DS.lines = []; if (DS.got < 5) say('clerk', 'Will that be everything, or will you be lingering?', 'vo_clerk_08');
          say('clerk', 'Exact change only. Emotionally exact.', 'vo_clerk_09'); say('clerk', 'You made it. I am almost disappointed.', 'vo_clerk_13'); ctx.playCue?.('sfx_chip_bag'); }
        if (DS.phase === 'checkout') { S.speed = lerp(S.speed, 0, 1 - Math.exp(-dt * 8)); const y = Math.atan2(CLERK_AT[0] - S.p.x, CLERK_AT[1] - S.p.z); S.yaw += Math.atan2(Math.sin(y - S.yaw), Math.cos(y - S.yaw)) * Math.min(1, dt * 6);
          if (!lineBusy()) { DS.phase = 'outro'; fadeT = 0.55; fade(true); } }
        animate(dt, t); return false;
      },
      finish() { out(); },
    };
    function phase() { return DS.phase; }
    function animate(dt, t) {
      tickLines(dt);
      // Wolf: walk gait from speed, a gentle float (bob + lean) that grows when he walks
      const bob = 0.075 + 0.035 * Math.sin(t * 2.1) + Math.min(1, S.speed / 2) * 0.03;
      toW(S.p.x, bob, S.p.z, _v); if (w) { w.position.copy(_v); w.rotation.set(0, S.yaw, Math.sin(t * 1.3) * 0.025); }
      puppet.speed = S.speed; puppet.headYaw = 0;
      DS.blob.position.set(S.p.x, 0.035, S.p.z); DS.blob.scale.setScalar(1 - bob * 1.4);
      // snacks: drift, bob, spin
      const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
      _cl.copy(camera.position).sub(DS.root.position);
      for (const { im, st } of DS.inst) { for (let i = 0; i < st.length; i++) { const s = st[i], u = t * s.a + s.ph;
        pv.set(s.x + Math.sin(u) * 0.28, s.y + Math.sin(u * 1.7) * 0.16, s.z + Math.cos(u * 0.8) * 0.22);
        e.set(Math.sin(u * 0.9) * s.tilt, t * s.s + s.ph, Math.cos(u * 0.7) * s.tilt * 0.6); q.setFromEuler(e);
        const dc = pv.distanceTo(_cl), near = dc < 1.6 ? smooth(clamp((dc - 0.7) / 0.9, 0, 1)) : 1; sv.setScalar(s.sc * near); M4.compose(pv, q, sv); im.setMatrixAt(i, M4); }   // near the lens they shrink away instead of filling the screen
        im.instanceMatrix.needsUpdate = true; }
      for (const h of DS.heroes) {
        if (h.got) { if (h.fly > 0 && h.fly < 1) { h.fly = Math.min(1, h.fly + dt / 0.4); const f = smooth(h.fly); h.g.position.lerp(_l.set(S.p.x, 1.1, S.p.z), f * 0.5); h.g.scale.setScalar(1 - f * 0.85); if (h.fly >= 1) h.g.visible = false; } continue; }
        h.g.position.set(h.x + Math.sin(t * 0.7 + h.ph) * 0.08, 1.0 + Math.sin(t * 1.4 + h.ph) * 0.12, h.z + Math.cos(t * 0.6 + h.ph) * 0.06);
        h.m.rotation.set(Math.sin(t * 0.8 + h.ph) * 0.25, t * 0.9 + h.ph, Math.cos(t * 0.6 + h.ph) * 0.15); h.h.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2 + h.ph); }
      // motes rise and sway
      const a = DS.pts.geometry.attributes.position;
      for (let i = 0; i < DS.motes.length; i++) { const mo = DS.motes[i]; mo.y += mo.v * dt; if (mo.y > H) mo.y = 0.05; a.setXYZ(i, mo.x + Math.sin(t * 0.5 + mo.ph) * 0.25, mo.y, mo.z + Math.cos(t * 0.4 + mo.ph) * 0.2); }
      a.needsUpdate = true;
      for (const s of DS.shafts) s.material.opacity = (s.material.userData.base ??= s.material.opacity) * (0.85 + 0.15 * Math.sin(t * 0.7));
      DS.ring.material.opacity = DS.got >= 3 && DS.phase === 'shop' ? 0.45 + 0.3 * Math.sin(t * 3) : 0;
      // the Clerk faces the Wolf
      if (clerk) { const y = Math.atan2(S.p.x - CLERK_AT[0], S.p.z - CLERK_AT[1]); const cy = clerk.getYaw(); clerk.setYaw(cy + Math.atan2(Math.sin(y - cy), Math.cos(y - cy)) * Math.min(1, dt * 3)); clerk.setSpeed(0); }
    }
  }
  // ---------------------------------------------------------------- camera + warm grade (called by the director every frame while inside)
  let camP = null;
  function cam(c, dt) {
    if (!DS.active || DS.phase === 'in') return false;
    const w = getWolf(); if (!w) return false;
    const por = innerHeight > innerWidth, lx = w.position.x - O.x, lz = w.position.z - O.z;
    if (DS.phase === 'checkout' || DS.phase === 'outro') {   // a two-shot at the counter: the Wolf and the Clerk, the floating aisles behind
      const want = _c.set(O.x + COUNTER.x - (por ? 2.3 : 2.9), por ? 2.05 : 1.85, O.z + COUNTER.z + (por ? 2.9 : 2.3));
      camP.lerp(want, 1 - Math.exp(-dt * 2.2)); c.position.copy(camP); c.lookAt(_l.set(O.x + (lx + CLERK_AT[0]) / 2, 1.25, O.z + (lz + CLERK_AT[1]) / 2));
      const fov = por ? 62 : 46; if (Math.abs(c.fov - fov) > 0.01) { c.fov = fov; c.updateProjectionMatrix(); } c.updateMatrixWorld(); grade(); return true; }
    const want = _c.set(O.x + clamp(lx * 0.5, -2.4, 2.4), por ? 3.0 : 2.7, O.z + clamp(lz + (por ? 3.7 : 3.3), 0.4, FR - 0.15));
    if (!camP || dt > 0.5) camP = want.clone(); else camP.lerp(want, 1 - Math.exp(-dt * 3.2));
    c.position.copy(camP); c.lookAt(_l.set(O.x + lx * 0.85, 0.9, O.z + lz - 1.1));
    const fov = por ? 66 : 50; if (Math.abs(c.fov - fov) > 0.01) { c.fov = fov; c.updateProjectionMatrix(); } c.updateMatrixWorld();
    grade(); return true;
  }
  function grade() {
    const fin = window.__sunspots?.fin; if (fin) { fin.hemi.color.set('#ffd9c4'); fin.hemi.groundColor.set('#d08a9a'); fin.hemi.intensity = 1.3; fin.key.color.set('#ffcf9a'); fin.key.intensity = 1.25; if (fin.fill) fin.fill.intensity = 0.6; }
  }
  const api = { build, task, camera: cam, get active() { return DS.active; }, DS, reset() { if (DS.active) { DS.active = false; DS.phase = 'off'; if (DS.root) DS.root.visible = false; if (ov) ov.style.display = 'none'; document.body.classList.remove('dsIn'); fade(false); } } };
  window.__ds = api;   // QA
  return api;
}
