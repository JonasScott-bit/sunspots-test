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
import { setSunspotsDetail, SS_DETAIL } from './sunspots_material.js';
let SIMP = null;   // meshoptimizer 1.3.0 simplifier (WASM, MIT; vendor/meshopt), loaded lazily
const simp = () => SIMP ||= import('./vendor/meshopt/meshopt_simplifier.module.js').then(async (m) => { await m.MeshoptSimplifier.ready; return m.MeshoptSimplifier; });

export function installPerf({ scene, camera, renderer, key }) {
  const Q = new URLSearchParams(location.search);
  const ON = Q.get('perf') !== '0';
  const SOFT = /swiftshader|llvmpipe/i.test(quality.detected.gpu);   // QA's software renderer is not a device: never auto-step there
  const items = [];               // { m, char, r, c(local center), hidden, shadow0 }
  const known = new WeakSet();
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), wc = new THREE.Vector3(), sph = new THREE.Sphere();
  let frame = 0, lastScan = -1e9, lastCull = 0, lastLod = 0, paused = false, ftLast = performance.now(), ftAvg = 16.7;
  const LOD_ON = Q.get('lod') !== '0', FORCE = Q.get('lodshow');   // QA: ?lodshow=1|2 forces that LOD level at every distance
  const lodQ = [], lodCache = new Map(), UVW = [2, 2]; // lodCache: geometry uuid -> simplified geometry; UVW: UV weights for seam-preserving simplifyWithAttributes
  let lodBusy = false;
  // LODs: L1 (~28%, tight error) past a few metres; Meshy cast/statics also get L2 (~12%) past 3x that. Only the index
  // buffer changes, so skinning, morphs, UVs and the felt shader are untouched. Non-indexed townscape detail is left alone.
  // Meshy rigs/statics are full of UV seams (same position, split vertices); a plain simplify keeps every seam edge and
  // stalls at ~35-40%. 'Permissive' lets it collapse across seams, and passing the UVs as attributes keeps it from
  // smearing the texture while it does.
  // perf pass 2: the simplifier runs in a worker (lodworker.js); the main thread only copies typed arrays and wraps the
  // result. Builds start while the title is up (all LODs are usually done before play). Main-thread fallback if no worker.
  let W = null, wid = 0; const wcb = new Map();
  try { W = new Worker(new URL('./lodworker.js', import.meta.url), { type: 'module' }); W.onmessage = (e) => { const f = wcb.get(e.data.id); wcb.delete(e.data.id); f?.(e.data); }; W.onerror = () => { W = null; for (const f of wcb.values()) f({ error: 'worker' }); wcb.clear(); }; } catch (_) { W = null; }
  const viaWorker = (pos, idx, uv, jobs) => new Promise((res) => { const id = ++wid; wcb.set(id, res); W.postMessage({ id, pos, idx, uv, jobs, uvw: UVW }, [pos.buffer, idx.buffer].concat(uv ? [uv.buffer] : [])); });
  const copyF = (a, n, k) => (!a.isInterleavedBufferAttribute && a.itemSize === k && a.array instanceof Float32Array) ? a.array.slice(0, n * k) : (() => { const o = new Float32Array(n * k); for (let i = 0; i < n; i++) { o[i * k] = a.getX(i); o[i * k + 1] = a.getY(i); if (k === 3) o[i * k + 2] = a.getZ(i); } return o; })();
  function wrapLod(g, n, idx) {
    if (!idx) return null; const L = new THREE.BufferGeometry(); for (const k in g.attributes) L.setAttribute(k, g.attributes[k]);
    for (const k in g.morphAttributes) L.morphAttributes[k] = g.morphAttributes[k]; L.morphTargetsRelative = g.morphTargetsRelative;
    L.setIndex(new THREE.BufferAttribute(n > 65535 ? idx : new Uint16Array(idx), 1));
    L.boundingSphere = g.boundingSphere.clone(); L.boundingBox = g.boundingBox.clone(); L.userData.tris = idx.length / 3; return L;
  }
  async function buildLod(it) {
    let g = it.g0; if (lodCache.has(g.uuid)) { const c = lodCache.get(g.uuid); if (c) { it.lod = c[0]; it.lod2 = c[1]; } return; }
    const key = g.uuid;
    if (g.groups.length > 1 || !g.index) { lodCache.set(key, null); return; }   // non-indexed = merged townscape detail: it has its own detail/lo LOD; welding it ate railings and window frames
    if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
    const t0 = performance.now(), n = g.attributes.position.count, T0 = g.index.count / 3;
    const pos = copyF(g.attributes.position, n, 3), uv = g.attributes.uv ? copyF(g.attributes.uv, n, 2) : null, idx = new Uint32Array(g.index.array);
    // Mud fix (Nov 16 2026): LODs are SEAM-PRESERVING. The old 'Permissive' collapse merged vertices across UV seams, so on
    // MEDIUM (L1 past ~2 m, L2 past ~5 m) seam triangles stretched across neighbouring atlas islands = the brown/orange
    // blotches on every character and car on Scott's phone. Now: never collapse a seam, UVs weighted hard, and an L2 only
    // where the plain simplifier still gets well below L1. (A seam-locked Meshy rig stops at ~35-45%: that's the price.)
    const jobs = [{ frac: 0.3, err: 0.01, minTri: Math.min(1500, T0 * 0.3), perm: false }]; if (it.char) jobs.push({ frac: 0.15, err: 0.03, minTri: Math.min(600, T0 * 0.15), perm: false });
    let out;
    if (W) { const tm = performance.now() - t0; const r = await viaWorker(pos, idx, uv, jobs); if (r.error) throw new Error(r.error); out = r.out; stats.lodMainMs += tm; }
    else { const S = await simp(); const t1 = performance.now();
      out = jobs.map((j) => { const target = Math.max(Math.floor(j.minTri) * 3, Math.floor(idx.length * j.frac / 3) * 3), fl = j.perm ? ['Permissive'] : [];
        const [r] = uv ? S.simplifyWithAttributes(idx, pos, 3, uv, 2, UVW, null, target, j.err, fl) : S.simplify(idx, pos, 3, target, j.err, fl); return r.length > idx.length * 0.8 ? null : r; });
      const tm = performance.now() - t1; stats.lodMainMs += tm; if (tm > 30) mark(`LOD build on main thread ${tm.toFixed(0)} ms`); }
    const t2 = performance.now(); const L1 = wrapLod(g, n, out[0]), L2 = wrapLod(g, n, out[1]);
    if (!L1 && !L2) { lodCache.set(key, null); return; }
    const pair = [L1 || L2, L2 && (!L1 || L2.userData.tris < L1.userData.tris * 0.8) ? L2 : null];
    lodCache.set(key, pair); it.lod = pair[0]; it.lod2 = pair[1];
    stats.lodSaved += it.tri - pair[0].userData.tris; stats.lodMainMs += performance.now() - t2;
  }
  function pumpLod() {
    if (lodBusy || !lodQ.length) return; lodBusy = true; const it = lodQ.shift();
    buildLod(it).catch((e) => { console.warn('lod', e); lodCache.set(it.g0.uuid, null); }).finally(() => { lodBusy = false; stats.lods = items.filter((i) => i.lod).length; if (lodQ.length) setTimeout(pumpLod, W ? 0 : 60); });
  }
  // ---- hitch log (perf pass 2): what happened in the frame that took long. perfhud.js calls hitch() every frame (it
  // drains the notes) and keeps the frames > 50 ms with their notes for the COPY report.
  const H = { js: 0, render: 0, programs: 0, tex: 0, geo: 0, notes: [] }; let fStart = 0, lastActive = null, lastPR = renderer.getPixelRatio();
  function mark(n) { if (H.notes.length < 8) H.notes.push(n); }
  const r0 = renderer.render.bind(renderer);
  renderer.render = (sc, cam) => {
    const t0 = performance.now(), i = renderer.info, p0 = i.programs?.length || 0, x0 = i.memory.textures, g0 = i.memory.geometries;
    if (fStart && !renderer.getRenderTarget()) { H.js += t0 - fStart; fStart = 0; }
    r0(sc, cam);
    H.render += performance.now() - t0; H.programs += (i.programs?.length || 0) - p0; H.tex += Math.max(0, i.memory.textures - x0); H.geo += Math.max(0, i.memory.geometries - g0);
  };
  function hitch() { const o = { js: +H.js.toFixed(1), render: +H.render.toFixed(1), programs: H.programs, tex: H.tex, geo: H.geo, notes: H.notes.slice() }; H.js = H.render = 0; H.programs = H.tex = H.geo = 0; H.notes.length = 0; return o; }
  try { const AC = window.AudioContext || window.webkitAudioContext, d0 = AC?.prototype.decodeAudioData; if (d0) AC.prototype.decodeAudioData = function (...a) { mark('audio decode'); return d0.apply(this, a); }; } catch (_) {}
  try { const f0 = window.fetch; window.fetch = (...a) => f0(...a).then((r) => { const u = String(a[0]?.url || a[0]); if (/\.(glb|gltf|ktx2|png|jpe?g|webp|ogg|mp3|m4a|json)(\?|$)/i.test(u)) mark('loaded ' + u.split('/').pop().split('?')[0]); return r; }); } catch (_) {}
  // shader warm-up: compile every material in the scene (cast, carnival, pets, snack run...: most of it is added after
  // main.js's first compile) while the title is up, and again when a scan finds new materials. compileAsync uses
  // KHR_parallel_shader_compile where the browser has it, so a late warm-up does not block a frame.
  const seenMat = new WeakSet(); let warmBusy = false, warmDirty = true, lastWarm = -1e9;
  function warmUp() {
    if (warmBusy || !warmDirty) return; if (!window.__titleUp && performance.now() - lastWarm < 10000) return; lastWarm = performance.now(); warmDirty = false; warmBusy = true; const t0 = performance.now();
    const done = () => { warmBusy = false; stats.warmed++; };
    try { if (window.__titleUp || !renderer.compileAsync) { renderer.compile(scene, camera); done(); } else renderer.compileAsync(scene, camera).then(done, done); } catch (e) { done(); }
    const d = performance.now() - t0; stats.warmMs += d; if (!window.__titleUp && d > 30) mark(`shader warm-up ${d.toFixed(0)} ms`);   // the blocking part only
  }
  const stats = { lods: 0, lodSaved: 0, lodMainMs: 0, worker: !!W, warmMs: 0, warmed: 0, ups: [], items: 0, chars: 0, hidden: 0, noShadow: 0, cells: 0, tier: quality.tier, steps: [] };

  const triOf = (m) => { const g = m.geometry; if (!g) return 0; return ((g.index ? g.index.count : g.attributes.position?.count || 0) / 3) * (m.isInstancedMesh ? m.count : 1); };
  function scan() {
    lastScan = performance.now();
    scene.traverse((m) => {
      if (!m.isMesh || known.has(m)) return; known.add(m);
      for (const mt of [].concat(m.material || [])) if (!seenMat.has(mt)) { seenMat.add(mt); warmDirty = true; }
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
    setSunspotsDetail(SS_DETAIL[t.id] ?? 1);   // felt fibre/bump detail per tier (LOW: flat bold colour + rim)
    if (key?.shadow) {
      const want = t.shadowMap; if (key.shadow.mapSize.x !== want) { key.shadow.mapSize.set(want, want); key.shadow.map?.dispose(); key.shadow.map = null; }
      const type = t.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; if (renderer.shadowMap.type !== type) { renderer.shadowMap.type = type; renderer.shadowMap.needsUpdate = true; }
      key.shadow.radius = t.soft ? 4 : 1.5;   // plain PCF uses radius as tap spacing: 4 texels apart = ghosted, stripy shadow edges on MEDIUM/LOW
    }
    for (const c of cells()) { const u = c.userData.cactusCell; c.count = Math.max(u.solid, Math.round(u.total * t.cacti / 300)); }
  }
  onSettings((k) => { if (k === 'quality') applyTier(); });

  // AUTO tier by per-second medians (perf pass 2): a one-off hitch never counts. Up after 20 s holding vsync, down after
  // 6 s under ~35 fps (with the pixel ratio already at its floor). Only in town, never in the first seconds after the title
  // or a room, never on QA's software renderer. quality.js remembers the result per GPU.
  let secFt = [], secT = 0, hold = 5; const meds = [];
  function autoTier(ft) {
    if (!quality.auto || SOFT || document.hidden) { secFt.length = 0; secT = 0; return; }
    secFt.push(ft); secT += ft; if (secT < 1000) return;
    secFt.sort((x, y) => x - y); const med = secFt[secFt.length >> 1], p90 = secFt[Math.floor(secFt.length * 0.9)]; secFt.length = 0; secT = 0;
    if (hold > 0) { hold--; return; }
    meds.push([med, p90]); if (meds.length > 20) meds.shift();
    const last = (k) => meds.slice(-k);
    if (meds.length >= 6 && renderer.getPixelRatio() <= 1.01 && last(6).every(([m]) => m > 28)) { if (quality.stepDown()) { stats.steps.push(quality.tier); mark('quality down to ' + quality.tier); } meds.length = 0; hold = 5; }
    else if (meds.length >= 20 && quality.canStepUp() && meds.every(([m, p]) => m < 17.6 && p < 22)) { if (quality.stepUp()) { stats.ups.push(quality.tier); mark('quality up to ' + quality.tier); } meds.length = 0; hold = 8; }
  }
  // title-time work: keep LOD builds + scans + the shader warm-up going while the title is up (main.js does not call update() then)
  const idle = setInterval(() => { if (!window.__titleUp && frame > 0) return; if (performance.now() - lastScan > 1500) scan(); pumpLod(); warmUp(); }, 250);
  function update() {
    frame++; fStart = performance.now();
    const now = fStart, ft = Math.min(100, now - ftLast); ftLast = now; ftAvg += (Math.min(ft, 40) - ftAvg) * 0.05;
    const act = window.__town?.active || null; if (act !== lastActive) { mark(act ? 'enter room ' + act : 'leave room ' + lastActive); lastActive = act; hold = Math.max(hold, 3); }
    const pr = renderer.getPixelRatio(); if (pr !== lastPR) { lastPR = pr; }
    if (!ON) return;
    const off = !!act || document.body.classList.contains('map') || window.__titleUp;
    if (off) { if (!paused) restoreAll(); return; }
    paused = false;
    if (now - lastScan > 2000) { const t0 = performance.now(); scan(); const d = performance.now() - t0; if (d > 12) mark(`scene scan ${d.toFixed(0)} ms`); }   // new townsfolk / rigs loaded late
    if (warmDirty) warmUp();
    autoTier(ft);
    if (now - lastLod > 60) { lastLod = now; pumpLod(); }   // worker: no main-thread cost; fallback: one build at a time
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
      else if (it.lod) { const ld = t.lodDist * Math.min(1, Math.max(0.6, 20000 / it.tri)); const want = it.lod2 && d > ld * 3 ? it.lod2 : d > ld ? it.lod : it.g0; if (m.geometry !== want) m.geometry = want; }   // heavy rigs simplify sooner; L2 past 3x
    }
    const fogFar = scene.fog?.far || 1e9;
    let cv = 0; for (const c of cells()) { if (!c.boundingSphere) c.computeBoundingSphere(); const d = cp.distanceTo(c.boundingSphere.center) - c.boundingSphere.radius; const show = d < Math.min(fogFar, t.propCull + 40); c.layers.mask = show ? 1 : 0; if (show) cv++; }
    stats.hidden = hid; stats.noShadow = ns; stats.cells = cv;
  }
  applyTier(); scan();
  const api = { update, mark, hitch, stats: () => ({ ...stats, lodPending: lodQ.length + (lodBusy ? 1 : 0), ftAvg: +ftAvg.toFixed(1), dpr: renderer.getPixelRatio() }), restoreAll, applyTier, items };
  window.__perf = api; return api;
}
