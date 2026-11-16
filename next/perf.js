// Sunspots ship pass, part 2 (Nov 16 2026): town frame budget for phones.
// The town frame used to draw 490k-800k triangles (everything in the main scene, plus most of it again in the shadow pass).
// This keeps the felt/clay look and only stops drawing what the player cannot see:
//  * characters (Meshy rigs + statues, 6k-100k tris each, most with frustum culling turned off): hidden past the tier's
//    distance or when well behind the camera; they stop casting shadows past a shorter distance.
//  * heavy props (>1.5k tris): hidden past the tier's prop distance (the fog has already eaten them by then).
//  * far cactus cells (main.js): hidden past the fog, thinned to the tier's count.
//  * LOD: every heavy mesh (>6k tris: Meshy cast, statues, Moth) gets a simplified index buffer built in the background
//    with meshoptimizer (same vertices, so skinning, UVs and the felt shader are untouched); it swaps in past a few metres.
//  * quality tier (quality.js): pixel-ratio cap, shadow map size / softness; AUTO steps down one tier if the frame rate
//    stays low with the resolution already at its floor.
// Hiding uses object.layers (mask 0), never .visible, so it can't fight the game code that shows/hides things.
// Off inside rooms (their own scene), in the top-down map, and with ?perf=0. window.__perf.stats() for QA.
import * as THREE from 'three';
import { quality, onSettings } from './quality.js';
let SIMP = null;   // meshoptimizer 1.3.0 simplifier (WASM, MIT; vendor/meshopt), loaded lazily
const simp = () => SIMP ||= import('./vendor/meshopt/meshopt_simplifier.module.js').then(async (m) => { await m.MeshoptSimplifier.ready; return m.MeshoptSimplifier; });

export function installPerf({ scene, camera, renderer, key }) {
  const Q = new URLSearchParams(location.search);
  const ON = Q.get('perf') !== '0';
  const SOFT = /swiftshader|llvmpipe/i.test(quality.detected.gpu);   // QA's software renderer is not a device: never auto-step there
  const items = [];               // { m, char, r, c(local center), hidden, shadow0 }
  const known = new WeakSet();
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), wc = new THREE.Vector3(), sph = new THREE.Sphere();
  let frame = 0, lastScan = -1e9, lastCull = 0, lastLod = 0, paused = false, slowT = 0, warm = 0, ftLast = performance.now(), ftAvg = 16.7;
  const LOD_ON = Q.get('lod') !== '0', FORCE = Q.get('lodshow');   // QA: ?lodshow=1|2 forces that LOD level at every distance
  const lodQ = [], lodCache = new Map();   // geometry uuid -> simplified geometry (clones share geometry)
  let lodBusy = false;
  // LODs: L1 (~28%, tight error) past a few metres; Meshy cast/statics also get L2 (~12%) past 3x that. Only the index
  // buffer changes, so skinning, morphs, UVs and the felt shader are untouched. Non-indexed townscape detail is left alone.
  // Meshy rigs/statics are full of UV seams (same position, split vertices); a plain simplify keeps every seam edge and
  // stalls at ~35-40%. 'Permissive' lets it collapse across seams, and passing the UVs as attributes keeps it from
  // smearing the texture while it does.
  function mkLod(g, S, src, pos, uv, n, frac, err, minTri, perm) {
    const target = Math.max(Math.floor(minTri) * 3, Math.floor(src.length * frac / 3) * 3);
    const fl = perm ? ['Permissive'] : [];
    const [idx] = uv ? S.simplifyWithAttributes(src, pos, 3, uv, 2, [0.5, 0.5], null, target, err, fl) : S.simplify(src, pos, 3, target, err, fl);
    if (idx.length > src.length * 0.8) return null;
    const L = new THREE.BufferGeometry(); for (const k in g.attributes) L.setAttribute(k, g.attributes[k]);
    for (const k in g.morphAttributes) L.morphAttributes[k] = g.morphAttributes[k]; L.morphTargetsRelative = g.morphTargetsRelative;
    L.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    L.boundingSphere = g.boundingSphere.clone(); L.boundingBox = g.boundingBox.clone(); L.userData.tris = idx.length / 3;
    return L;
  }
  async function buildLod(it) {
    let g = it.g0; if (lodCache.has(g.uuid)) { const c = lodCache.get(g.uuid); if (c) { it.lod = c[0]; it.lod2 = c[1]; } return; }
    const key = g.uuid;
    if (g.groups.length > 1) { lodCache.set(key, null); return; }
    if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
    const S = await simp();
    const base = g;
    if (!g.index) { lodCache.set(key, null); return; }   // non-indexed = merged townscape detail: it has its own detail/lo LOD; welding it ate railings and window frames
    const pa = base.attributes.position, n = pa.count, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = pa.getX(i); pos[i * 3 + 1] = pa.getY(i); pos[i * 3 + 2] = pa.getZ(i); }
    const src = base.index.array instanceof Uint32Array || base.index.array instanceof Uint16Array ? base.index.array : new Uint32Array(base.index.array);
    const T0 = src.length / 3, ua = base.attributes.uv; let uv = null;
    if (ua) { uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = ua.getX(i); uv[i * 2 + 1] = ua.getY(i); } }
    // Meshy cast/statics (it.char): seam-permissive L1 + a far L2. Hard-edged props (lamps, cacti, shelters): a plain L1 only.
    const L1 = mkLod(base, S, src, pos, uv, n, 0.28, 0.012, Math.min(1500, T0 * 0.3), it.char);
    const L2 = it.char ? mkLod(base, S, src, pos, uv, n, 0.12, 0.04, Math.min(600, T0 * 0.12), true) : null;
    if (!L1 && !L2) { lodCache.set(key, null); return; }
    const pair = [L1 || L2, L2 && (!L1 || L2.userData.tris < L1.userData.tris * 0.8) ? L2 : null];
    lodCache.set(key, pair); it.lod = pair[0]; it.lod2 = pair[1];
    stats.lodSaved += it.tri - pair[0].userData.tris;
  }
  function pumpLod() {
    if (lodBusy || !lodQ.length) return; lodBusy = true; const it = lodQ.shift();
    buildLod(it).catch((e) => { console.warn('lod', e); lodCache.set(it.g0.uuid, null); }).finally(() => { lodBusy = false; stats.lods = items.filter((i) => i.lod).length; });
  }
  const stats = { lods: 0, lodSaved: 0, items: 0, chars: 0, hidden: 0, noShadow: 0, cells: 0, tier: quality.tier, steps: [] };

  const triOf = (m) => { const g = m.geometry; if (!g) return 0; return ((g.index ? g.index.count : g.attributes.position?.count || 0) / 3) * (m.isInstancedMesh ? m.count : 1); };
  function scan() {
    lastScan = performance.now();
    scene.traverse((m) => {
      if (!m.isMesh || known.has(m)) return; known.add(m);
      if (m.userData.noCull || m.userData.cactusCell) return;
      if (m.parent?.name === 'ts_streets' && m.castShadow) m.castShadow = false;   // flat streets/kerbs: shadow pass cost (12.7k tris) for no visible shadow; they still receive
      const tri = triOf(m); const skin = !!m.isSkinnedMesh;
      if (!skin && tri < 800) return;   // 800+: felt cacti/lamp clones get LODs too (one build per shared geometry)
      const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const bs = g.boundingSphere; if (!bs || !isFinite(bs.radius)) return;
      if (m.isInstancedMesh) return;   // instanced crowds manage themselves
      const char = skin || m.frustumCulled === false || /^(Mesh_0|char\d|mesh_0)$/.test(m.name || '');
      const scale = (() => { m.updateWorldMatrix(true, false); return m.matrixWorld.getMaxScaleOnAxis(); })();
      if (!char && bs.radius * scale > 45) return;   // ground, terrain, whole-street merges: leave to the frustum
      const it = { m, char, tri, c: bs.center.clone(), r0: bs.radius, hidden: false, shadow0: m.castShadow, noShadow: false, g0: m.geometry, lod: null };
      items.push(it); if (LOD_ON && (tri >= 6000 || (!char && !skin))) lodQ.push(it);
    });
    stats.items = items.length; stats.chars = items.filter((i) => i.char).length;
  }
  const hide = (it, h) => { if (it.hidden === h) return; it.hidden = h; if (h) { it.mask = it.m.layers.mask; it.m.layers.mask = 0; } else it.m.layers.mask = it.mask ?? 1; };
  const shadow = (it, off) => { if (it.noShadow === off) return; it.noShadow = off; it.m.castShadow = off ? false : it.shadow0; };
  function restoreAll() { for (const it of items) { hide(it, false); shadow(it, false); } for (const c of cells()) c.layers.mask = 1; paused = true; }
  const cells = () => window.__cactusCells || [];

  function applyTier() {
    const t = quality.t; stats.tier = t.id;
    if (key?.shadow) {
      const want = t.shadowMap; if (key.shadow.mapSize.x !== want) { key.shadow.mapSize.set(want, want); key.shadow.map?.dispose(); key.shadow.map = null; }
      const type = t.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; if (renderer.shadowMap.type !== type) { renderer.shadowMap.type = type; renderer.shadowMap.needsUpdate = true; }
    }
    for (const c of cells()) { const u = c.userData.cactusCell; c.count = Math.max(u.solid, Math.round(u.total * t.cacti / 300)); }
  }
  onSettings((k) => { if (k === 'quality') applyTier(); });

  function update() {
    frame++;
    const now = performance.now(), ft = Math.min(100, now - ftLast); ftLast = now; ftAvg += (ft - ftAvg) * 0.05;
    if (!ON) return;
    const off = !!window.__town?.active || document.body.classList.contains('map') || window.__titleUp;
    if (off) { if (!paused) restoreAll(); return; }
    paused = false;
    if (now - lastScan > 2000) scan();   // new townsfolk / rigs loaded late
    // AUTO safety net: pixel ratio already at its floor and still under ~35 fps for 6 s -> one tier down
    if (++warm > 300 && quality.auto && !SOFT && !document.hidden && renderer.getPixelRatio() <= 1.01 && ftAvg > 28) { if ((slowT += ft) > 6000) { slowT = 0; warm = 0; if (quality.stepDown()) { stats.steps.push(quality.tier); console.info('quality: auto step down to', quality.tier); } } } else slowT = 0;
    if (now - lastLod > 60) { lastLod = now; pumpLod(); }   // one LOD build at a time (a 100k mesh takes ~20 ms on a phone)
    if (now - lastCull < 100) return; lastCull = now;   // ~10 Hz is plenty for distance culling
    const t = quality.t, cp = camera.position;
    camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    let hid = 0, ns = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i], m = it.m;
      if (!m.parent) { items.splice(i, 1); continue; }   // removed from the scene
      m.updateWorldMatrix(true, false);
      wc.copy(it.c).applyMatrix4(m.matrixWorld); const r = it.r0 * m.matrixWorld.getMaxScaleOnAxis();
      const d = Math.max(0, cp.distanceTo(wc) - r);
      let h;
      // heavy rigs drop their shadow sooner (a 100k-tri Moth costs as much in the shadow pass as in the view)
      if (it.char) { h = d > t.charCull; if (!h && d > 10 && m.frustumCulled === false) { sph.set(wc, r + 2.5); h = !fr.intersectsSphere(sph); } shadow(it, d > t.charShadow * Math.min(1, Math.max(0.3, 20000 / it.tri))); }
      else h = it.tri >= 1500 && d > t.propCull;
      hide(it, h); if (it.hidden) hid++; if (it.noShadow) ns++;
      if (it.lod && FORCE) { const want = FORCE === '2' && it.lod2 ? it.lod2 : it.lod; if (m.geometry !== want) m.geometry = want; }
      else if (it.lod) { const ld = t.lodDist * Math.min(1, Math.max(0.3, 20000 / it.tri)); const want = it.lod2 && d > ld * 3 ? it.lod2 : d > ld ? it.lod : it.g0; if (m.geometry !== want) m.geometry = want; }   // heavy rigs simplify sooner; L2 past 3x
    }
    const fogFar = scene.fog?.far || 1e9;
    let cv = 0; for (const c of cells()) { if (!c.boundingSphere) c.computeBoundingSphere(); const d = cp.distanceTo(c.boundingSphere.center) - c.boundingSphere.radius; const show = d < Math.min(fogFar, t.propCull + 40); c.layers.mask = show ? 1 : 0; if (show) cv++; }
    stats.hidden = hid; stats.noShadow = ns; stats.cells = cv;
  }
  applyTier(); scan();
  const api = { update, stats: () => ({ ...stats, lodPending: lodQ.length + (lodBusy ? 1 : 0), ftAvg: +ftAvg.toFixed(1), dpr: renderer.getPixelRatio() }), restoreAll, applyTier, items };
  window.__perf = api; return api;
}
