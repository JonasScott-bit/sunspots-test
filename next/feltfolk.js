// feltfolk.js — the procedural felt-and-clay cast builder (Nov 16 2026, quality pass "two worlds colliding").
// Replaces the capsule-and-sphere "toy" pals. Same rig contract as the old pal() so every mission keeps working:
//   group.userData = { torso, hd, legs:[L,R], arms:[L,R], h, ph, shadow, base:{ torso, hd, leg } }
//   arms/legs are pivots (shoulder / hip) hanging along -y, head pivot sits on the neck; animFolk() drives them.
// Look: flocked felt on fur, hair and clothes (fibre texture + soft fuzz rim); matte clay on eyes, noses, beaks, horns,
// hooves, shoes, glasses (flat colour, faint rim). Adult proportions (head ~1/4.8 of height), heavy-lidded deadpan eyes like
// the crew GLBs, snouts/muzzles/beaks per species, tapered limbs, mitten hands, shoes, 70s flares, clothes as their own shells.
// One shared material (one shader program), 6 merged meshes per character, two LODs (hi ~3-4.5k tris, lo ~0.9-1.3k tris)
// picked per frame by distance. 0 rigs. Also exports feltCow() (the desert / snack-run cows).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, PI = Math.PI;
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// ------------------------------------------------------------------ material: felt fibre where felt=1, flat clay where felt=0
let TEX = null, MAT = null, MAT_SH = null;
function feltTex() {
  if (TEX) return TEX; const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  g.fillStyle = '#ececec'; g.fillRect(0, 0, N, N); let s = 9127; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let i = 0; i < 4200; i++) { const x = r() * N, y = r() * N, a = r() * TAU, l = 2 + r() * 6, cu = (r() - 0.5) * 2.4, v = r() < 0.55 ? 255 : 150, al = 0.12 + r() * 0.22;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.strokeStyle = `rgba(${v},${v},${v},${al})`; g.lineWidth = 0.7 + r() * 0.5; g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a + cu) * l * 0.6, y + oy + Math.sin(a + cu) * l * 0.6, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); } }
  TEX = new THREE.CanvasTexture(c); TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping; TEX.colorSpace = THREE.SRGBColorSpace; TEX.anisotropy = 2; return TEX;
}
export function folkMat() {
  if (MAT) return MAT;
  MAT = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, map: feltTex() });
  MAT.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float felt;\nvarying float vFelt;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvFelt = felt;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFelt;')
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n diffuseColor.rgb *= mix( vec3( 0.97 ), sampledDiffuseColor.rgb * 1.04, vFelt );\n#endif')
      .replace('#include <opaque_fragment>', [
        '{ float fr = 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );',
        '  float fuzz = pow( fr, 2.2 ) * mix( 0.10, 0.42, vFelt );',   // flocked felt catches light at the silhouette; clay only a faint glow
        '  outgoingLight += ( outgoingLight * 0.85 + diffuseColor.rgb * 0.05 ) * fuzz;',
        '  outgoingLight = outgoingLight * 0.95 + diffuseColor.rgb * 0.035; }',   // a hazy print lift: shadows never go muddy
        '#include <opaque_fragment>'].join('\n'));
  };
  MAT.customProgramCacheKey = () => 'feltfolk-v1';
  return MAT;
}

// ------------------------------------------------------------------ geometry helpers (all indexed, smooth normals, welded seams)
function weld(g) { for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); g = mergeVertices(g, 1e-5); g.computeVertexNormals(); return g; }
// deformed sphere: radii + optional fn(v, n) that edits the vertex (unit-sphere normal n)
export function blob(rx, ry, rz, ws = 16, hs = 12, fn = null) {
  const g = new THREE.SphereGeometry(1, ws, hs); const p = g.attributes.position, n = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { n.fromBufferAttribute(p, i); v.set(n.x * rx, n.y * ry, n.z * rz); if (fn) fn(v, n); p.setXYZ(i, v.x, v.y, v.z); }
  return weld(g);
}
// lathe around y: pts [[r, y], ...], squash x/z
export function lathe(pts, seg = 16, sx = 1, sz = 1, phiStart = 0, phiLen = TAU) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg, phiStart, phiLen); g.scale(sx, 1, sz);
  return phiLen < TAU - 1e-3 ? (() => { for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); g.computeVertexNormals(); return g; })() : weld(g);
}
// tube swept through points with per-point radius (rounded caps). opts.sq = [sx, sz] cross-section squash, opts.lobes = [n, amt]
export function sweep(pts, radii, radial = 8, opts = {}) {
  const P = pts.map((p) => new THREE.Vector3(...p)); const R = radii.slice(); const n0 = P.length;
  const T0 = P[1].clone().sub(P[0]).normalize(), T1 = P[n0 - 1].clone().sub(P[n0 - 2]).normalize();
  if (opts.caps !== false) { const r0 = R[0], r1 = R[n0 - 1];
    P.unshift(P[0].clone().addScaledVector(T0, -r0 * 0.55)); R.unshift(r0 * 0.72); P.unshift(P[0].clone().addScaledVector(T0, -r0 * 0.3)); R.unshift(r0 * 0.05);
    P.push(P[P.length - 1].clone().addScaledVector(T1, r1 * 0.55)); R.push(r1 * 0.72); P.push(P[P.length - 1].clone().addScaledVector(T1, r1 * 0.3)); R.push(r1 * 0.05); }
  const n = P.length, pos = [], idx = []; let N = new THREE.Vector3(), B = new THREE.Vector3(), Tp = null; const sq = opts.sq || [1, 1], lobes = opts.lobes;
  for (let i = 0; i < n; i++) {
    const T = (i === 0 ? P[1].clone().sub(P[0]) : i === n - 1 ? P[i].clone().sub(P[i - 1]) : P[i + 1].clone().sub(P[i - 1])).normalize();
    if (!Tp) { const up = Math.abs(T.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1); N.crossVectors(up, T).normalize(); if (opts.up) N.copy(opts.up).sub(T.clone().multiplyScalar(opts.up.dot(T))).normalize(); }
    else { const ax = new THREE.Vector3().crossVectors(Tp, T); const l = ax.length(); if (l > 1e-6) N.applyAxisAngle(ax.divideScalar(l), Math.acos(THREE.MathUtils.clamp(Tp.dot(T), -1, 1))); }
    B.crossVectors(T, N).normalize(); Tp = T;
    for (let j = 0; j < radial; j++) { const a = j / radial * TAU; let r = R[i]; if (lobes) r *= 1 + Math.cos(a * lobes[0]) * lobes[1];
      const cx = Math.cos(a) * r * sq[0], cy = Math.sin(a) * r * sq[1]; pos.push(P[i].x + N.x * cx + B.x * cy, P[i].y + N.y * cx + B.y * cy, P[i].z + N.z * cx + B.z * cy); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const lerp = (a, b, k) => a + (b - a) * k;
// smooth sample of a list of [t, value] pairs
const curve = (pts, t) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const k = (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); const s = k * k * (3 - 2 * k); return lerp(pts[i - 1][1], pts[i][1], s); } return pts[pts.length - 1][1]; };

// ------------------------------------------------------------------ Part: collects coloured geometry, emits one mesh
class Part {
  constructor(s) { this.L = []; this.s = s; }
  // col: '#hex' | fn(x,y,z) -> '#hex' (evaluated in final local space), felt: 1 felt / 0 clay
  add(geo, col, felt = 1, m = null) {
    let g = geo.index ? geo : geo; if (m) g = g.clone().applyMatrix4(m); else g = g.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (!g.index) { const a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(i); g.setIndex(a); }
    const p = g.attributes.position, nn = g.attributes.normal, n = p.count, ca = new Float32Array(n * 3), fa = new Float32Array(n), uv = new Float32Array(n * 2);
    const D = 3.4;
    for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let cc = typeof col === 'function' ? col(x, y, z) : col; if (typeof cc === 'function') cc = cc(x, y, z); _c.set(cc); ca[i * 3] = _c.r; ca[i * 3 + 1] = _c.g; ca[i * 3 + 2] = _c.b; fa[i] = felt;
      const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)), az = Math.abs(nn.getZ(i));
      if (ay > ax && ay > az) { uv[i * 2] = x * D; uv[i * 2 + 1] = z * D; } else if (ax > az) { uv[i * 2] = z * D + 0.37; uv[i * 2 + 1] = y * D; } else { uv[i * 2] = x * D + 0.71; uv[i * 2 + 1] = y * D; } }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.setAttribute('felt', new THREE.BufferAttribute(fa, 1)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.L.push(g); return this;
  }
  geo() { if (!this.L.length) return null; const g = mergeGeometries(this.L, false); g.scale(this.s, this.s, this.s); g.computeBoundingSphere(); this.L = []; return g; }
}
const triCount = (g) => g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0;

// ------------------------------------------------------------------ colour helpers
const shade = (hex, k) => { if (typeof hex === 'function') hex = hex(0, 0.3, 0.2); const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * (k < 1 ? 1.05 : 0.95)), THREE.MathUtils.clamp(hsl.l * k, 0, 1)); return '#' + c.getHexString(); };

// ------------------------------------------------------------------ the builder
// spec: see FOLK below. Q = detail (1 hi, ~0.45 lo). Returns geometries per moving part + pivot positions (unit space x s).
function buildFolk(sp, Q) {
  const s = sp.h || 1, Sg = (n, mn = 3) => Math.max(mn, Math.round(n * Q));
  const P = { torso: new Part(s), head: new Part(s), leg0: new Part(s), leg1: new Part(s), arm0: new Part(s), arm1: new Part(s) };
  const fur = sp.fur || '#c9a37a', face = sp.face || fur, top = sp.top || fur, sleeve = sp.sleeve || top, pants = sp.pants || (sp.dress || sp.skirt ? fur : top);
  const fat = sp.fat || 1, W = 0.2 * fat * (sp.wide || 1), TL = 0.54 * (sp.torsoK || 1), legLen = 0.76 * (sp.legs || 1), hipY = legLen + 0.03;
  const R = sp.headR || 0.225, neckLen = sp.neck ?? 0.07, waist = 0.1 * TL / 0.54, shY = TL * 0.86;
  const kind = sp.kind || 'plain';
  const big = kind === 'banana' || kind === 'wrench';

  // ---------------- torso (pivot at the hips)
  const T = P.torso;
  if (!big) {
    const k = TL / 0.54, D = sp.depth || 0.76, belly = sp.belly || (fat > 1.08 ? 0.12 : 0.03);
    const prof = [[0, -0.075], [0.6, -0.07], [0.93, -0.035], [1.0, 0.03], [0.975, 0.085], [0.965, 0.112], [0.94, 0.15], [0.91, 0.2], [0.99, 0.3], [1.04, 0.38], [0.99, 0.45], [0.82, 0.5], [0.5, 0.535], [0, 0.545]].map(([r, y]) => [r * W, y * k]);
    if (sp.chest) prof[7][0] *= sp.chest;
    const g = lathe(prof, Sg(22, 8), 1, D);
    { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (z > 0) p.setZ(i, z * (1 + belly * Math.exp(-(((y / k) - 0.2) ** 2) / 0.02))); } g.computeVertexNormals(); }
    const vestC = sp.vest, front = (x, y, z, lim) => z > 0 && Math.abs(x) < lim;
    const col = (x, y, z) => {
      const yy = y / k;
      if (!(sp.dress || sp.skirt) && yy < 0.1 && !sp.onepiece) return pants;
      if (sp.vneck && front(x, y, z, Math.max(0, (yy - 0.3)) * 0.55) && yy > 0.3) return sp.vneck;   // shirt/tie showing in a V
      if (vestC && yy > 0.06 && yy < 0.47 && !(front(x, y, z, Math.max(0, (yy - 0.22)) * 0.45) && yy > 0.22)) return vestC;
      if (sp.stripe && z > 0 && Math.abs(x) < 0.008) return sp.stripe;   // zip / placket
      if (sp.chevron && yy > 0.2 && yy < 0.42) { const v = (yy * 18 + Math.abs(x) * 14) % 2; if (v < 0.7) return sp.chevron; }
      return sp.dress || top;
    };
    T.add(g, col, 1);
    // garment edges (each garment reads as its own shell)
    if (!(sp.dress || sp.skirt) && !sp.onepiece) T.add(new THREE.TorusGeometry(0.955 * W, 0.02 * k, Sg(5, 3), Sg(22, 8)), shade(top, sp.sweater ? 0.9 : 0.94), 1, M4(0, 0.1 * k, 0, PI / 2, 0, 0, 1, 1 / D * 0 + 1, 1).multiply(new THREE.Matrix4().makeScale(1, D, 1)));
    if (vestC) T.add(new THREE.TorusGeometry(0.98 * W, 0.022 * k, 4, Sg(22, 8)), shade(vestC, 0.9), 1, M4(0, 0.07 * k, 0, PI / 2).multiply(new THREE.Matrix4().makeScale(1, D, 1)));
    if (sp.belt) T.add(new THREE.TorusGeometry(0.985 * W, 0.024 * k, 4, Sg(22, 8)), sp.belt, 1, M4(0, 0.085 * k, 0, PI / 2).multiply(new THREE.Matrix4().makeScale(1, D, 1)));
    // neck + collar
    const nk = sp.neckCol || face; T.add(lathe([[0, 0.5 * k], [0.072 * (sp.neckW || 1), 0.5 * k], [0.068 * (sp.neckW || 1), 0.545 * k + neckLen + 0.03], [0, 0.545 * k + neckLen + 0.04]], Sg(10, 6)), nk, 1);
    const cs = sp.collar || 'crew';
    if (cs === 'turtle') { T.add(lathe([[0, 0.5 * k], [0.1, 0.5 * k], [0.094, 0.545 * k + neckLen * 0.75], [0.07, 0.548 * k + neckLen * 0.8]], Sg(14, 6)), top, 1); T.add(new THREE.TorusGeometry(0.088, 0.02, 4, Sg(14, 6)), shade(top, 0.92), 1, M4(0, 0.545 * k + neckLen * 0.72, 0, PI / 2)); }
    else if (cs === 'crew') T.add(new THREE.TorusGeometry(0.083, 0.017, 4, Sg(14, 6)), shade(top, 0.9), 1, M4(0, 0.535 * k, 0, PI / 2));
    else if (cs === 'shirt' || cs === 'uniform') { for (const sx of [-1, 1]) T.add(blob(0.055, 0.012, 0.045, Sg(8, 4), Sg(5, 3)), sp.collarCol || shade(top, 1.06), 1, M4(sx * 0.045, 0.528 * k, 0.07, -0.5, sx * 0.5, sx * 0.55));
      for (let i = 0; i < 3; i++) T.add(blob(0.009, 0.009, 0.005, 6, 4), sp.buttons || shade(top, 0.6), 0, M4(0, (0.43 - i * 0.1) * k, D * W * (i === 1 ? 1.05 + belly * 0.7 : 1.02) + 0.004)); }
    else if (cs === 'hood') { T.add(new THREE.TorusGeometry(0.1, 0.045, Sg(6, 3), Sg(14, 6), PI * 1.25), top, 1, M4(0, 0.54 * k, -0.01, PI / 2 + 0.25, 0, -PI * 0.125 + PI / 2 + PI));
      for (const sx of [-1, 1]) T.add(sweep([[sx * 0.04, 0.52 * k, 0.12], [sx * 0.045, 0.43 * k, 0.15]], [0.006, 0.006], 4), '#f2ece0', 1); }
    else if (cs === 'fur') T.add(new THREE.TorusGeometry(0.135, 0.06, Sg(7, 4), Sg(16, 7)), sp.collarCol || '#d8c4a0', 1, M4(0, 0.52 * k, -0.005, PI / 2 - 0.15, 0, 0, 1.1, 1, 1));
    else if (cs === 'lapel') { for (const sx of [-1, 1]) T.add(blob(0.03, 0.12, 0.012, Sg(6, 4), Sg(6, 3)), sp.lapelCol || shade(top, 0.82), 1, M4(sx * 0.06, 0.42 * k, D * W * 1.03, 0.1, sx * 0.35, -sx * 0.32)); }
    if (sp.badge) T.add(star5(0.028), sp.badge, 0, M4(-0.09, 0.39 * k, D * W * 1.04 + 0.004, 0, -0.25));
    if (sp.pocket) for (const sx of [-1, 1]) T.add(blob(0.04, 0.035, 0.008, 6, 4), shade(top, 0.9), 1, M4(sx * 0.1, 0.36 * k, D * W * 1.02, 0, sx * 0.3));
    // open coat / cardigan / jacket shell
    if (sp.coat) { const c = sp.coat, L = c.len ?? -0.1, gap = c.gap ?? 0.5, wf = c.w || 1.1, flare = c.flare ?? 1.12;
      const cp = [[0.55 * W * wf, 0.53 * k], [0.86 * W * wf, 0.5 * k], [1.03 * W * wf, 0.43 * k], [1.07 * W * wf, 0.32 * k], [1.03 * W * wf, 0.18 * k], [1.06 * W * wf * (flare * 0.5 + 0.5), 0.04 * k], [1.08 * W * wf * flare, L * k]];
      const fr = (y) => curve(cp.map(([r, yy]) => [yy, r]).reverse(), y);
      T.add(lathe(cp.slice().reverse(), Sg(24, 8), 1, D * 1.05, gap / 2, TAU - gap), c.col, 1);
      for (const sx of [-1, 1]) { const ed = []; const er = []; for (let i = 0; i <= 6; i++) { const y = lerp(L, 0.52, i / 6) * k, r = fr(y); ed.push([Math.sin(sx * gap / 2) * r, y, Math.cos(gap / 2) * r * D * 1.05]); er.push(0.012); }
        T.add(sweep(ed, er, 4, { caps: false }), c.trim || shade(c.col, 0.85), 1); }
      if (c.buttons) for (let i = 0; i < 3; i++) { const y = (0.4 - i * 0.12) * k, r = fr(y); T.add(blob(0.011, 0.011, 0.006, 6, 4), c.buttons, 0, M4(Math.sin(gap / 2 + 0.06) * r, y, Math.cos(gap / 2 + 0.06) * r * D * 1.05 + 0.004)); }
      if (c.fur) T.add(new THREE.TorusGeometry(0.13, 0.055, Sg(7, 4), Sg(16, 7)), c.fur, 1, M4(0, 0.52 * k, -0.01, PI / 2 - 0.2, 0, 0, 1.15, 1, 1)); }
    // skirt / dress / apron
    if (sp.dress || sp.skirt) { const sc = sp.skirt || sp.dress, L = sp.skirtLen ?? -0.42;
      T.add(lathe([[1.3 * W, L + 0.012], [1.48 * W, L], [1.42 * W, L + 0.06], [1.18 * W, -0.12], [1.0 * W, 0.05 * k], [0.9 * W, 0.14 * k]], Sg(22, 8), 1, D * 1.1), sc, 1);
      T.add(new THREE.TorusGeometry(1.46 * W, 0.016, 4, Sg(22, 8)), shade(sc, 0.88), 1, M4(0, L + 0.008, 0, PI / 2).multiply(new THREE.Matrix4().makeScale(1, D * 1.1, 1))); }
    if (sp.apron) T.add(lathe([[1.53 * W, -0.34], [1.32 * W, -0.1], [1.24 * W, 0.08 * k]], Sg(8, 4), 1, D * 1.12, -0.85, 1.7), sp.apron, 1);
    if (sp.apron) T.add(lathe([[1.02 * W, 0.08 * k], [1.0 * W, 0.36 * k]], Sg(6, 3), 1, D * 1.06, -0.6, 1.2), sp.apron, 1);
    // tail
    if (sp.tail) addTail(T, sp.tail, W, D, Sg);
    // wings on the back (moth)
    if (sp.wings) for (const sx of [-1, 1]) { T.add(blob(0.34, 0.26, 0.02, Sg(14, 6), Sg(8, 4), (v) => { v.y += Math.abs(v.x) * 0.25; }), (x, y, z) => (Math.hypot(Math.abs(x) - 0.3, y - 0.42) < 0.075 ? (sp.wingSpot || shade(sp.wings, 0.7)) : sp.wings), 1, M4(sx * 0.3, 0.36 * k, -0.17, 0.15, sx * 0.45, sx * 0.25)); }
  }

  // ---------------- legs (pivot at the hip)
  const legX = (sp.legX || 0.48) * W;
  for (const i of [0, 1]) { const L = P['leg' + i], sx = i ? 1 : -1;
    if (big) { if (kind === 'banana') tentacleLeg(L, sp, sx, Sg, legLen); continue; }
    addLeg(L, sp, sx, Sg, legLen, pants, fur); }

  // ---------------- arms (pivot at the shoulder)
  const armX = W * 0.98;
  for (const i of [0, 1]) { const A = P['arm' + i], sx = i ? 1 : -1; if (kind === 'wrench') { addArm(A, { ...sp, sleeve: sp.sleeve || '#e86a2a', hands: sp.hands || '#f2b632', shortSleeve: false, armW: 0.75 }, sx, Sg); continue; }
    if (kind === 'banana') { tentacleArm(A, sp, sx, Sg); continue; } addArm(A, sp, sx, Sg); }

  // ---------------- head (pivot at the top of the neck)
  const H = P.head; let headY = R * 0.78, headZ = 0.0;
  if (kind === 'banana') bananaBody(P, sp, Sg); else if (kind === 'wrench') wrenchBody(P, sp, Sg); else buildHead(H, sp, R, Sg);

  const pv = {
    hd: big ? [0, 0, 0] : [0, hipY + 0.545 * TL / 0.54 + neckLen, 0], headOff: [0, big ? 0 : headY, headZ],
    torso: [0, big ? 0 : hipY, 0], leg: [legX, hipY], arm: [armX, hipY + shY], hipY, s,
  };
  if (kind === 'banana') { pv.torso = [0, 0, 0]; pv.hd = [0, 0.95, 0]; pv.headOff = [0, 0, 0]; pv.leg = [0.07, 0.32]; pv.arm = [0.2, 0.98]; pv.hipY = 0.32; }
  if (kind === 'wrench') { pv.torso = [0, 0, 0]; pv.hd = [0, 1.12, 0]; pv.headOff = [0, 0, 0]; pv.leg = [0.06, 0.2]; pv.arm = [0.1, 0.98]; pv.hipY = 0.2; }
  // head geometry is built around the skull centre: shift it onto the pivot
  const geos = {}; for (const k of Object.keys(P)) geos[k] = P[k].geo();
  if (geos.head && !big) geos.head.translate(0, headY * s, headZ * s);
  return { geos, pv };
}

function star5(r) { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + PI / 2, rr = i % 2 ? r * 0.45 : r; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: r * 0.25, bevelEnabled: false }); return g; }

function addTail(T, t, W, D, Sg) {
  const c = t.col, k = t.kind || 'bushy';
  if (k === 'bushy' || k === 'ringed') { const pts = [[0, 0.05, -W * D * 0.8], [0, 0.0, -W * D - 0.12], [0, 0.02, -W * D - 0.3], [0, 0.12, -W * D - 0.42], [0, 0.22, -W * D - 0.45]];
    T.add(sweep(pts, [0.04, 0.08, 0.1, 0.085, 0.04], Sg(10, 5)), k === 'ringed' ? (x, y, z) => (Math.floor((-z * 13 + y * 6)) % 2 ? t.col2 || '#2a2426' : c) : (x, y, z) => (y > 0.16 && t.tip ? t.tip : c), 1); }
  else if (k === 'thin') { const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8; pts.push([Math.sin(a * 4) * 0.06, 0.05 - a * 0.04 + Math.sin(a * 3) * 0.06, -W * D * 0.85 - a * 0.42]); } T.add(sweep(pts, pts.map((_, i) => 0.016 - i * 0.0012), Sg(6, 4)), c, 1); }
  else if (k === 'puff') T.add(blob(0.06, 0.06, 0.05, Sg(10, 5), Sg(7, 4)), c, 1, M4(0, 0.03, -W * D - 0.02));
  else if (k === 'curl') { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU * 0.9; pts.push([Math.sin(a) * 0.06, 0.06 + Math.cos(a) * 0.06 - 0.06 + i * 0.004, -W * D - 0.02 - i * 0.012]); } T.add(sweep(pts, pts.map((_, i) => 0.016 - i * 0.001), Sg(6, 4)), c, 1); }
  else if (k === 'lizard') { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10; pts.push([Math.sin(a * 5) * 0.08 * a, 0.0 - a * 0.08 + (a > 0.7 ? (a - 0.7) * 0.3 : 0), -W * D * 0.8 - a * 0.55]); }
    T.add(sweep(pts, pts.map((_, i) => 0.07 * (1 - i / 11) + 0.01), Sg(8, 5)), t.fn || c, 1); }
  else if (k === 'feather') for (let i = -1; i <= 1; i++) T.add(blob(0.04, 0.012, 0.13, Sg(8, 4), Sg(5, 3)), c, 1, M4(i * 0.04, 0.0, -W * D - 0.08, 0.5, i * 0.25));
}

function addLeg(L, sp, sx, Sg, legLen, pants, fur) {
  const st = sp.legStyle || 'straight', bare = sp.bareLegs || fur, bot = -legLen + 0.03;
  const flare = st === 'flare' ? 1.42 : st === 'shorts' ? 1 : 1.02;
  const lw = sp.legW || 1, foot = sp.feet || 'shoe';
  if (foot === 'bird') {   // thin clay bird legs below the trousers/shorts/feathers
    const cut = st === 'shorts' ? -0.28 : -legLen * 0.62;
    L.add(sweep([[0, 0.02, 0], [0, cut * 0.5, 0.0], [0, cut, 0.01]], [0.08 * lw, 0.075 * lw, (st === 'shorts' ? 0.085 : 0.07) * lw], Sg(10, 6)), st === 'none' ? fur : pants, 1);
    const lg = sp.legCol || '#e8913a'; L.add(sweep([[0, cut, 0.01], [0, -legLen * 0.75, 0.01], [0, bot + 0.01, 0.0]], [0.02, 0.019, 0.02], Sg(6, 4)), lg, 0);
    for (const a of [-0.5, 0, 0.5, PI]) { const l = a === PI ? 0.06 : 0.1; L.add(sweep([[0, bot + 0.012, 0], [Math.sin(a) * l, bot + 0.005, Math.cos(a) * l]], [0.014, 0.01], 4), lg, 0); }
    return;
  }
  const pts = [[0, 0.03, 0], [sx * 0.004, -legLen * 0.25, 0.0], [sx * 0.006, -legLen * 0.52, 0.012], [sx * 0.004, -legLen * 0.78, 0.0], [0, bot + 0.07, -0.005], [0, bot + 0.045, -0.005]];
  const rr = [0.1, 0.094, 0.078, 0.071, 0.076 * flare, 0.082 * flare].map((r) => r * lw * (sp.fat > 1.08 ? 1.12 : 1));
  const shortCut = -0.26;
  L.add(sweep(pts, rr, Sg(12, 6)), st === 'shorts' ? (x, y) => (y > shortCut ? pants : bare) : st === 'bare' ? bare : pants, 1);
  if (st === 'shorts') L.add(new THREE.TorusGeometry(0.082 * lw, 0.014, 4, Sg(12, 6)), shade(pants, 0.88), 1, M4(sx * 0.005, shortCut, 0.004, PI / 2));
  else if (st !== 'bare') L.add(new THREE.TorusGeometry(rr[5] * 0.98, 0.012, 4, Sg(12, 6)), shade(pants, 0.86), 1, M4(0, bot + 0.045, -0.005, PI / 2));
  if (foot === 'hoof') { L.add(lathe([[0, bot], [0.055, bot], [0.062, bot + 0.05], [0.05, bot + 0.07], [0, bot + 0.07]], Sg(10, 6)), sp.hoof || '#3a2e2a', 0); L.add(blob(0.006, 0.035, 0.03, 4, 4), shade(sp.hoof || '#3a2e2a', 0.6), 0, M4(0, bot + 0.03, 0.05)); return; }
  if (foot === 'paw') { L.add(blob(0.07, 0.05, sp.bigFeet ? 0.17 : 0.11, Sg(12, 6), Sg(8, 4), (v) => { if (v.y < 0) v.y *= 0.45; }), sp.feetCol || fur, 1, M4(0, bot + 0.035, sp.bigFeet ? 0.07 : 0.035)); return; }
  if (foot === 'none') return;
  const sc = sp.shoes || '#3a2a26', sole = sp.sole || shade(sc, 0.55);
  L.add(blob(0.07, 0.052, 0.125, Sg(14, 6), Sg(9, 4), (v) => { if (v.y < 0) v.y *= 0.42; if (v.z > 0) v.y += v.z * 0.12; }), (x, y) => (y < bot + 0.016 ? sole : sc), 0, M4(0, bot + 0.04, 0.035));
  if (foot === 'sneaker') L.add(new THREE.TorusGeometry(0.05, 0.008, 3, Sg(10, 5), PI), sp.lace || '#e8e2d6', 0, M4(0, bot + 0.07, 0.07, -0.9));
}

function addArm(A, sp, sx, Sg) {
  const sl = sp.sleeve || sp.top || sp.fur, fur = sp.fur, hand = sp.hands || fur, aw = (sp.armW || 1) * Math.sqrt(sp.fat || 1), L = 0.52 * (sp.armK || 1);
  A.add(blob(0.08 * aw, 0.085 * aw, 0.08 * aw, Sg(10, 6), Sg(8, 4)), sl, 1, M4(0, -0.02, 0));
  const pts = [[0, -0.02, 0], [sx * 0.008, -L * 0.5, 0.015], [sx * 0.012, -L * 0.96, 0.045]], rr = [0.074 * aw, 0.062 * aw, 0.054 * aw];
  const ss = sp.shortSleeve ? -L * 0.34 : -L * 0.92;
  A.add(sweep(pts, rr, Sg(10, 6)), (x, y) => (y > ss ? sl : (sp.wingArm || fur)), 1);
  if (!sp.shortSleeve) A.add(new THREE.TorusGeometry(0.047 * aw, 0.012, 4, Sg(10, 5)), shade(sl, sp.cuff ? 1 : 0.86), 1, M4(sx * 0.011, -L * 0.9, 0.042, PI / 2 + 0.08));
  else A.add(new THREE.TorusGeometry(0.058 * aw, 0.011, 4, Sg(10, 5)), shade(sl, 0.88), 1, M4(sx * 0.004, ss, 0.006, PI / 2));
  if (sp.hand === 'wing') { for (let i = 0; i < 3; i++) A.add(blob(0.022, 0.07 - i * 0.012, 0.012, 6, 4), hand, 1, M4(sx * (0.012 + i * 0.012 * sx * 0), -L - 0.04 + i * 0.012, 0.05 - i * 0.022, -0.2)); return; }
  const glove = !!sp.gloves, hf = glove ? 0 : 1;
  A.add(blob(0.058 * aw, 0.07, 0.04, Sg(10, 5), Sg(8, 4), (v) => { if (v.y < 0) v.z *= 1 + v.y * 2; }), hand, hf, M4(sx * 0.012, -L - 0.05, 0.05, 0.15, 0, sx * 0.05));
  A.add(blob(0.021, 0.037, 0.021, 6, 4), hand, hf, M4(-sx * 0.03, -L - 0.03, 0.08, 0.6, 0, sx * 0.6));
  if (glove) A.add(new THREE.TorusGeometry(0.05, 0.014, 4, Sg(10, 5)), hand, 0, M4(sx * 0.012, -L - 0.005, 0.048, PI / 2));
}

// ---------------- eyes like the crew's: clay eyeball, iris + pupil, a heavy felt upper lid with a darker rim, a small lower lid
function addEye(H, o, Sg) {
  const r = o.r, m = M4(o.x, o.y, o.z, o.pitch || 0, o.yaw || 0, o.roll || 0), e = o.open ?? 0.06, lidC = o.lid, sx = Math.sign(o.x) || 1;
  const add = (g, c, f, mm) => H.add(g, c, f, mm ? m.clone().multiply(mm) : m);
  add(blob(r, r, r * 0.92, Sg(12, 6), Sg(9, 5)), o.white || '#f4efe4', 0);
  if (!o.dark) { add(blob(r * 0.56, r * 0.56, r * 0.2, Sg(10, 5), Sg(6, 3)), o.iris || '#4a2e22', 0, M4(o.look || 0, -r * 0.08, r * 0.84));
    add(blob(r * 0.3, r * 0.3, r * 0.12, Sg(8, 4), Sg(5, 3)), '#120c0e', 0, M4((o.look || 0) * 1.1, -r * 0.08, r * 0.95));
    add(blob(r * 0.1, r * 0.1, r * 0.05, 5, 3), '#ffffff', 0, M4(-sx * r * 0.18 + (o.look || 0), -r * 0.2, r * 0.99)); }
  else add(blob(r * 0.8, r * 0.8, r * 0.3, Sg(10, 5), Sg(6, 3)), '#120c0e', 0, M4(0, 0, r * 0.75));
  if (o.noLid) return;
  const th = PI / 2 - e, lr = r * 1.13, roll = -sx * (o.droop ?? 0.14);
  add(new THREE.SphereGeometry(lr, Sg(14, 7), Sg(6, 3), 0, TAU, 0, th), lidC, 1, M4(0, 0, 0, 0.0, 0, roll));
  add(new THREE.TorusGeometry(lr * Math.cos(e), r * 0.08, 4, Sg(14, 7)), o.rim || shade(lidC, 0.62), 1, new THREE.Matrix4().makeRotationZ(roll).multiply(M4(0, lr * Math.sin(e), 0, PI / 2)));
  add(new THREE.SphereGeometry(r * 1.08, Sg(12, 6), 2, 0, TAU, PI - 0.6, 0.6), lidC, 1);
}

const SNOUTED = new Set(['canine', 'dog', 'goat', 'ram', 'sheep', 'cow', 'rodent', 'raccoon', 'possum', 'anteater', 'bear']);
function buildHead(H, sp, R, Sg) {
  const kind = sp.kind || 'plain', face = sp.face || sp.fur || '#c9a37a', mz = sp.muzzle || face, nose = sp.nose || '#2a2024', ear = sp.ear || face, inner = sp.earIn || shade(face, 1.15);
  let rx = R, ry = R * 1.02, rz = R * 0.96, eyeY = R * 0.18, eyeX = R * 0.36, eyeR = R * 0.22 * (sp.eyeK || 1), eyeOpen = sp.open ?? 0.06;
  const bird = kind === 'bird' || kind === 'hen';
  if (kind === 'shovel') {   // the Farmhand: a felt-handled shovel blade for a head, one heavy-lidded eye
    H.add(blob(R * 0.95, R * 1.35, R * 0.2, Sg(16, 8), Sg(14, 6), (v, n) => { v.x = Math.sign(n.x) * Math.pow(Math.abs(n.x), 0.6) * R * 0.95; if (n.y > 0) v.y = Math.pow(n.y, 0.8) * R * 1.35; else v.x *= 1 + n.y * 0.62; v.z -= Math.abs(n.x) * R * 0.06; }), face, 0, M4(0, R * 0.55, 0));   // Nov 16: spade blade, round shoulders, narrows to the socket
    H.add(new THREE.CylinderGeometry(R * 0.18, R * 0.2, R * 0.7, Sg(10, 6)), '#b8946a', 0, M4(0, -R * 0.55, 0));
    addEye(H, { x: 0, y: R * 0.9, z: R * 0.16, r: R * 0.36, lid: face, open: 0.08, iris: '#4a3a2a', droop: 0 }, Sg);
    for (let i = 0; i < 9; i++) { const t = i / 8 - 0.5; H.add(blob(R * 0.09, R * 0.05, R * 0.05, 6, 4), '#2a2020', 1, M4(t * R * 0.8, R * 1.33 + Math.cos(t * 2.4) * R * 0.08, R * 0.2, 0, 0, -t * 0.9)); }   // bushy brow
    return;
  }
  if (kind === 'bear') { rx *= 1.1; ry *= 0.98; }
  if (kind === 'goat' || kind === 'ram' || kind === 'sheep') { ry *= 0.98; rx *= 0.8; rz *= 0.9; eyeX = R * 0.42; eyeY = R * 0.22; }
  if (kind === 'fruit') { rx = R * 1.0; ry = R * 1.08; rz = R * 0.98; eyeY = R * 0.15; eyeX = R * 0.32; }
  if (bird) { eyeX = R * 0.58; eyeY = R * 0.2; eyeR = R * 0.2 * (sp.eyeK || 1); }
  if (kind === 'lizard') { rx *= 1.2; ry *= 0.86; rz *= 1.05; eyeX = R * 0.66; eyeY = R * 0.48; eyeR = R * 0.34; }
  if (kind === 'moth') { eyeX = R * 0.48; eyeR = R * 0.3; }
  const skullCol = sp.headFn || (sp.throat ? (x, y, z) => (y < -R * 0.22 && z > -R * 0.25 ? sp.throat : face) : null) || ((sp.mask && sp.maskPaint) ? (x, y, z) => { // raccoon mask band over the eyes
    const d = Math.abs(y - eyeY * 1.0); return z > R * 0.1 && d < R * 0.22 && Math.abs(x) < R * 0.95 ? sp.mask : (y > R * 0.55 && sp.crown ? sp.crown : face); } : sp.crown ? (x, y) => (y > R * 0.5 ? sp.crown : face) : face);
  const skull = blob(rx, ry, rz, Sg(22, 10), Sg(16, 8), (v, n) => {
    if (kind === 'fruit' && sp.nubs) { const t = Math.abs(n.y); if (t > 0.85 && n.y < 0) v.y -= (t - 0.85) * R * 0.0; }
    if (n.z < -0.2) v.z *= 0.95;                      // flatter back of the head
    if (n.y < -0.3 && kind !== 'fruit') v.y *= 0.92;  // jaw tucks in
    if (kind === 'bear' || kind === 'rodent') { const ch = Math.exp(-((n.y + 0.25) ** 2) / 0.08) * Math.max(0, Math.abs(n.x) - 0.3); v.x *= 1 + ch * 0.18; }   // cheeks
    if (bird && n.z > 0) { const w = n.z * n.z; v.z += R * 0.32 * w * (1 - Math.max(0, n.y) * 0.5); v.y -= R * 0.05 * w; v.x *= 1 - 0.12 * w; }   // Nov 16: a bird skull runs forward into the beak
    if (SNOUTED.has(kind) && n.z > 0.2) { const w = THREE.MathUtils.smoothstep(n.z, 0.2, 0.95) * THREE.MathUtils.smoothstep(0.55 - n.y, 0, 0.7); v.z += R * (kind === 'goat' || kind === 'ram' ? 0.3 : 0.22) * w; v.y -= R * 0.06 * w; }   // Nov 16: the brow runs on into the snout (no ball-plus-tube)
  });
  H.add(skull, skullCol, kind === 'fruit' && sp.clayHead ? 0 : 1);
  // fruit nub / stem
  if (kind === 'fruit' && sp.nubs) H.add(blob(R * 0.12, R * 0.12, R * 0.1, 8, 6), shade(face, 0.92), 1, M4(0, ry * 0.98, 0));
  // ---- muzzle / snout / beak
  const mzr = sp.mz || {};
  if (['canine', 'cat', 'lynx', 'bear', 'rodent', 'raccoon', 'goat', 'ram', 'rabbit', 'pig', 'sheep', 'possum', 'cow', 'anteater', 'dog'].includes(kind)) {
    let pts, rad, tip;
    if (kind === 'canine' || kind === 'dog') { const L = mzr.len ?? (kind === 'dog' ? 0.55 : 1.0), Z = (z) => R * (0.25 + (z - 0.25) * L);   // Nov 16 likeness: long wedge snout off the brow
      pts = [[0, -R * 0.04, Z(0.25)], [0, -R * 0.14, Z(0.85)], [0, -R * 0.25, Z(1.45)], [0, -R * 0.33, Z(1.95)], [0, -R * 0.37, Z(2.2)]]; rad = [R * 0.66, R * 0.48, R * 0.32, R * 0.21, R * 0.14]; }
    else if (kind === 'bear') { pts = [[0, -R * 0.24, R * 0.5], [0, -R * 0.33, R * 1.28]]; rad = [R * 0.6, R * 0.48]; }
    else if (kind === 'rodent' || kind === 'raccoon' || kind === 'possum') { const L = mzr.len ?? (kind === 'raccoon' ? 1.15 : 1.05); pts = [[0, -R * 0.16, R * 0.45], [0, -R * 0.27, R * (0.5 + L * 0.55)], [0, -R * 0.32, R * (0.5 + L)]]; rad = [R * 0.55, R * 0.32, R * 0.14]; }
    else if (kind === 'goat' || kind === 'ram' || kind === 'sheep' || kind === 'cow') { const L = mzr.len ?? (kind === 'goat' ? 1.4 : kind === 'ram' ? 1.35 : 0.8); pts = [[0, R * 0.08, R * 0.0], [0, -R * 0.18, R * (0.2 + L * 0.35)], [0, -R * 0.46, R * (0.3 + L * 0.68)], [0, -R * 0.66, R * (0.35 + L * 0.85)]]; rad = [R * 0.72, R * 0.56, R * 0.42, R * 0.33]; }   // Nov 16: one long face from the brow (goat / ram)
    else if (kind === 'anteater') { pts = [[0, R * 0.05, R * 0.3], [0, -R * 0.15, R * 1.2], [0, -R * 0.4, R * 2.3], [0, -R * 0.62, R * 3.2], [0, -R * 0.72, R * 3.5]]; rad = [R * 0.72, R * 0.42, R * 0.24, R * 0.15, R * 0.12]; }
    else if (kind === 'pig') { pts = [[0, -R * 0.2, R * 0.75], [0, -R * 0.2, R * 1.1]]; rad = [R * 0.32, R * 0.3]; }
    else { pts = [[0, -R * 0.28, R * 0.6], [0, -R * 0.3, R * 0.9]]; rad = [R * 0.32, R * 0.26]; }   // cat, lynx, rabbit: short muzzle
    if (kind === 'cat' || kind === 'lynx' || kind === 'rabbit') {   // two whisker pads + chin
      const pk = kind === 'rabbit' ? 1.3 : 1; for (const sx of [-1, 1]) H.add(blob(R * 0.2 * pk, R * 0.17 * pk, R * 0.17 * pk, Sg(10, 5), Sg(8, 4)), mz, 1, M4(sx * R * 0.14 * pk, -R * 0.33, R * 0.86));
      H.add(blob(R * 0.14, R * 0.1, R * 0.12, Sg(8, 4), Sg(6, 3)), mz, 1, M4(0, -R * 0.5, R * 0.78));
      H.add(blob(R * 0.08, R * 0.06, R * 0.06, Sg(8, 4), Sg(6, 3)), nose, 0, M4(0, -R * 0.2, R * 1.0));
      if (kind === 'rabbit') for (const sx of [-1, 1]) H.add(blob(R * 0.07, R * 0.13, R * 0.035, 6, 4), '#f6f2ea', 0, M4(sx * R * 0.072, -R * 0.6, R * 1.0));   // buck teeth
    } else {
      H.add(sweep(pts, rad, Sg(14, 6), { sq: kind === 'bear' ? [1.12, 0.92] : kind === 'goat' || kind === 'ram' ? [0.9, 1.05] : [1, 0.9], lobes: kind === 'bear' ? [4, 0.05] : null }), mz, 1);
      const tp = pts[pts.length - 1], tr = rad[rad.length - 1];
      if (kind === 'pig') { H.add(new THREE.CylinderGeometry(tr * 1.02, tr * 1.04, R * 0.08, Sg(14, 6)), shade(mz, 0.95), 1, M4(tp[0], tp[1], tp[2] + tr * 0.3, PI / 2)); for (const sx of [-1, 1]) H.add(blob(R * 0.05, R * 0.07, R * 0.03, 5, 4), shade(mz, 0.55), 0, M4(sx * R * 0.1, tp[1], tp[2] + tr * 0.36)); }
      else if (kind === 'goat' || kind === 'ram' || kind === 'sheep' || kind === 'cow') { for (const sx of [-1, 1]) H.add(blob(R * 0.05, R * 0.035, R * 0.03, 5, 4), sp.nostril || shade(mz, 0.5), 0, M4(sx * R * 0.12, tp[1] + tr * 0.25, tp[2] + tr * 0.85, -0.3)); H.add(sweep([[-R * 0.12, tp[1] - tr * 0.45, tp[2] + tr * 0.6], [0, tp[1] - tr * 0.55, tp[2] + tr * 0.72], [R * 0.12, tp[1] - tr * 0.45, tp[2] + tr * 0.6]], [R * 0.018, R * 0.018, R * 0.018], 4), shade(mz, 0.55), 1); }
      else { const nr0 = 0; const nr = kind === 'bear' ? [R * 0.2, R * 0.13, R * 0.12] : kind === 'anteater' ? [R * 0.13, R * 0.11, R * 0.07] : kind === 'rodent' ? [R * 0.16, R * 0.13, R * 0.12] : [R * 0.15, R * 0.11, R * 0.11];
        H.add(blob(nr[0], nr[1], nr[2], Sg(10, 5), Sg(8, 4), (v) => { if (v.y < 0) v.x *= 1 + v.y * 2.2; }), nose, 0, M4(tp[0], tp[1] + tr * 0.35, tp[2] + tr * 0.72));
        if (kind !== 'anteater') H.add(sweep([[-tr * 0.55, tp[1] - tr * 0.55, tp[2] - tr * 0.2], [0, tp[1] - tr * 0.62, tp[2] + tr * 0.35], [tr * 0.55, tp[1] - tr * 0.55, tp[2] - tr * 0.2]], [R * 0.016, R * 0.016, R * 0.016], 4), shade(mz, 0.5), 1); }
      if (sp.teeth) H.add(blob(R * 0.1, R * 0.08, R * 0.03, 6, 4), '#f6f2ea', 0, M4(0, tp[1] - tr * 0.78, tp[2] + tr * 0.05));
    }
  }
  if (bird) { const b = sp.beak || {}, L = (b.len ?? 0.9) * R, bw = (b.w ?? 0.3) * R, drop = b.drop ?? 0.1, by = -R * 0.12, bz0 = (rz + R * 0.3) * 0.86;   // beak root sits at the front of the (forward-running) skull
    const pts = []; for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([0, by - t * L * drop - (b.hook ? Math.max(0, t - 0.75) * L * 0.9 : 0), bz0 + t * L]); }
    H.add(sweep(pts, pts.map((_, i) => bw * (1 - i / 5.6) + R * 0.01), Sg(12, 6), { sq: [1, b.flat ?? 0.78] }), b.col || '#e0a03a', 0);
    { const ck = b.cere ?? 1; if (ck > 0) H.add(blob((R * 0.22 + bw * 0.35) * ck, (R * 0.2 + bw * 0.3) * ck, R * 0.26 * ck, Sg(12, 6), Sg(8, 4)), face, 1, M4(0, by + R * 0.02, bz0 - R * 0.06 - R * 0.1 * (1 - ck))); }   // feathered base of the beak
    H.add(sweep([[-bw * 0.9, by - bw * 0.15, bz0 + R * 0.04], [0, by - bw * 0.15 - L * drop * 0.4, bz0 + L * 0.5], [0, by - L * drop * 0.9, bz0 + L * 0.92]], [R * 0.012, R * 0.01, R * 0.008], 3, { caps: false }), shade(b.col || '#e0a03a', 0.55), 0);
    if (kind === 'hen') { for (let i = 0; i < 4; i++) H.add(blob(R * 0.2, R * 0.3, R * 0.1, 8, 6), sp.comb || '#d8302a', 1, M4(0, ry * 0.92 + R * 0.16 - Math.abs(i - 1.5) * R * 0.06, R * (0.4 - i * 0.24), -0.3 + i * 0.22)); for (const sx of [-1, 1]) H.add(blob(R * 0.08, R * 0.16, R * 0.06, 8, 5), sp.comb || '#d8302a', 1, M4(sx * R * 0.06, by - R * 0.3, bz0 + R * 0.04)); }
    if (sp.crest) for (const k of [-1, 0, 1]) H.add(sweep([[k * R * 0.12, ry * 0.75, -R * 0.1], [k * R * 0.2, ry * 0.95 + R * 0.1, -R * 0.75], [k * R * 0.25, ry * 0.95 + (k ? 0 : R * 0.25), -R * 1.7]], [R * 0.09, R * 0.06, R * 0.012], Sg(6, 4), { sq: [0.5, 1] }), sp.crest, 1);
  }
  if (kind === 'fruit' || kind === 'plain' || kind === 'lizard' || kind === 'moth') {   // small nose bump + deadpan mouth
    if (kind === 'lizard') {   // Nov 16 likeness: broad rounded gecko snout + wide deadpan grin + nostrils
      const sx0 = rx * 0.9, sy0 = ry * 0.6, sz0 = R * 0.85, cy0 = -R * 0.2, cz0 = R * 0.5;
      H.add(blob(sx0, sy0, sz0, Sg(18, 9), Sg(12, 6)), skullCol, 1, M4(0, cy0, cz0));
      const gp = []; for (let i = 0; i <= 8; i++) { const t = i / 8 - 0.5, a = t * 2.3; gp.push([Math.sin(a) * sx0 * 1.0, cy0 - sy0 * 0.22 + Math.abs(t) ** 2 * R * 0.5, cz0 + Math.cos(a) * sz0 * 1.0]); }
      H.add(sweep(gp, gp.map(() => R * 0.028), 4), '#3a1a3a', 0);
      for (const sx of [-1, 1]) H.add(blob(R * 0.05, R * 0.035, R * 0.03, 5, 4), '#3a1a3a', 0, M4(sx * R * 0.18, cy0 + sy0 * 0.35, cz0 + sz0 * 0.93));
    } else {
    if (kind !== 'lizard' && kind !== 'moth') H.add(blob(R * 0.1, R * 0.09, R * 0.08, Sg(8, 4), Sg(6, 3)), sp.nose || shade(face, 0.92), 1, M4(0, -R * 0.05, rz * 0.98));
    const my = kind === 'lizard' ? -R * 0.22 : -R * 0.36, mw = kind === 'lizard' ? 0.85 : 0.32;
    const mp = []; for (let i = 0; i <= 4; i++) { const t = i / 4 - 0.5, x = t * R * mw * 2, z = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (my / ry) ** 2)) * rz; mp.push([x, my + (sp.smirk ? t * R * 0.08 : 0), z]); }
    H.add(sweep(mp, mp.map(() => R * 0.016), 4), shade(face, 0.45), 1);
  } }
  // ---- ears
  const et = sp.ears ?? ({ bear: 'round', canine: 'pointy', dog: 'floppy', cat: 'pointy', lynx: 'tufted', rodent: 'mouse', raccoon: 'round', possum: 'round', goat: 'side', ram: 'side', sheep: 'side', cow: 'side', rabbit: 'long', pig: 'pointy', anteater: 'round', moth: 'antenna' }[kind] || null);
  for (const sx of [-1, 1]) {
    if (et === 'round') { const ek = kind === 'raccoon' ? 1.35 : 1.1; H.add(blob(R * 0.2 * ek, R * 0.2 * ek, R * 0.08, Sg(10, 5), Sg(8, 4)), ear, 1, M4(sx * R * 0.7, R * 0.7, -R * 0.1, -0.1, sx * 0.25, -sx * 0.5)); H.add(blob(R * 0.12 * ek, R * 0.12 * ek, R * 0.04, Sg(8, 4), Sg(6, 3)), inner, 1, M4(sx * R * 0.72, R * 0.7, -R * 0.03, -0.1, sx * 0.25, -sx * 0.5)); }
    else if (et === 'mouse') { H.add(blob(R * 0.56, R * 0.56, R * 0.08, Sg(14, 6), Sg(10, 5)), ear, 1, M4(sx * R * 1.05, R * 0.6, -R * 0.12, -0.1, sx * 0.3, -sx * 0.5)); H.add(blob(R * 0.41, R * 0.41, R * 0.04, Sg(12, 5), Sg(8, 4)), inner, 1, M4(sx * R * 1.07, R * 0.6, -R * 0.05, -0.1, sx * 0.3, -sx * 0.5)); }
    else if (et === 'pointy' || et === 'tufted') { const tall = et === 'tufted' ? 1.05 : (sp.earK || 0.62);
      const eg = new THREE.ConeGeometry(R * 0.26 * (sp.earW || 1), R * tall, Sg(10, 5), 1); eg.translate(0, R * tall / 2, 0); const eg2 = weld(eg); const mm = M4(sx * R * 0.5, R * 0.62, -R * 0.12, -0.12, 0, -sx * 0.38, 1, 1, 0.42);
      H.add(eg2, ear, 1, mm); const ig = new THREE.ConeGeometry(R * 0.15, R * tall * 0.72, Sg(8, 4), 1); ig.translate(0, R * tall * 0.36, 0); H.add(weld(ig), inner, 1, mm.clone().multiply(M4(0, R * 0.04, R * 0.12, 0, 0, 0, 1, 1, 0.6)));
      if (et === 'tufted') H.add(sweep([[0, R * tall * 0.85, 0], [sx * R * 0.04, R * tall * 1.3, 0], [sx * R * 0.1, R * tall * 1.7, 0]], [R * 0.06, R * 0.04, R * 0.01], 5), sp.tuft || '#1e1618', 1, mm); }
    if (kind === 'lynx') for (let k = 0; k < 3; k++) H.add(sweep([[sx * R * 0.6, -R * (0.05 + k * 0.17), R * 0.2], [sx * R * (1.02 + k * 0.06), -R * (0.22 + k * 0.2), R * 0.05], [sx * R * (1.25 + k * 0.05), -R * (0.42 + k * 0.22), -R * 0.05]], [R * 0.2, R * 0.12, R * 0.02], Sg(7, 4), { sq: [1, 0.5] }), k ? (sp.muzzle || face) : face, 1);   // Nov 16 likeness: cheek ruff
    else if (et === 'long') { const mm = M4(sx * R * 0.3, R * 0.8, -R * 0.1, -0.12, sx * 0.1, -sx * 0.2);
      H.add(sweep([[0, 0, 0], [0, R * 0.7, 0.0], [sx * R * 0.05, R * 1.45, -R * 0.06], [sx * R * 0.08, R * 1.8, -R * 0.1]], [R * 0.13, R * 0.17, R * 0.14, R * 0.06], Sg(10, 5), { sq: [1, 0.45] }), ear, 1, mm);
      H.add(sweep([[0, R * 0.1, R * 0.06], [0, R * 0.7, R * 0.07], [sx * R * 0.05, R * 1.4, R * 0.0]], [R * 0.07, R * 0.11, R * 0.07], Sg(8, 4), { sq: [1, 0.3] }), inner, 1, mm); }
    else if (et === 'side') { const mm = M4(sx * R * 0.85, R * 0.3, -R * 0.1, 0, sx * 0.25, -sx * 1.25);
      H.add(blob(R * 0.17, R * 0.44, R * 0.08, Sg(10, 5), Sg(8, 4), (v) => { v.y += R * 0.33; }), ear, 1, mm); H.add(blob(R * 0.1, R * 0.32, R * 0.03, Sg(8, 4), Sg(6, 3), (v) => { v.y += R * 0.35; v.z += R * 0.06; }), inner, 1, mm); }
    else if (et === 'floppy') H.add(sweep([[sx * R * 0.6, R * 0.55, -R * 0.1], [sx * R * 0.95, R * 0.25, -R * 0.12], [sx * R * 1.02, -R * 0.35, -R * 0.05]], [R * 0.14, R * 0.2, R * 0.16], Sg(10, 5), { sq: [0.45, 1] }), ear, 1);
    else if (et === 'antenna') { const pts = [[sx * R * 0.25, ry * 0.85, R * 0.2], [sx * R * 0.5, ry * 1.4, R * 0.35], [sx * R * 0.85, ry * 1.8, R * 0.2]]; H.add(sweep(pts, [R * 0.04, R * 0.03, R * 0.025], 5), sp.antenna || '#4a3a30', 1);
      for (let i = 1; i <= 4; i++) { const t = i / 5, p = [lerp(pts[0][0], pts[2][0], t), lerp(pts[0][1], pts[2][1], t) + Math.sin(t * PI) * R * 0.15, lerp(pts[0][2], pts[2][2], t)]; H.add(blob(R * 0.14 * (1 - t * 0.4), R * 0.03, R * 0.05, 6, 4), sp.antenna || '#4a3a30', 1, M4(p[0] + sx * R * 0.05, p[1], p[2], 0, 0, sx * 0.6)); } }
  }
  // ---- horns
  if (sp.horns) { const hc = sp.horns;
    for (const sx of [-1, 1]) {
      if (kind === 'ram') { const pts = []; for (let i = 0; i <= 16; i++) { const a = -0.5 + i / 16 * TAU * 1.05, rr = R * (0.85 - i * 0.034); pts.push([sx * (R * 0.55 + i * R * 0.05), R * 0.2 + Math.cos(a) * rr, -R * 0.05 - Math.sin(a) * rr]); }
        H.add(sweep(pts, pts.map((_, i) => R * (0.3 - i * 0.016)), Sg(10, 6), { lobes: [7, 0.07] }), hc, 0); }
      else { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([sx * (R * 0.3 + t * R * 0.3), R * 0.72 + t * R * 1.25 - t * t * R * 0.55, R * 0.1 - t * R * 1.1 - t * t * R * 0.45]); }
        H.add(sweep(pts, pts.map((_, i) => R * (0.21 - i * 0.018)), Sg(8, 5), { lobes: [5, 0.07] }), hc, 0); } } }
  if (sp.beard) H.add(sweep([[0, -R * 0.8, R * 1.15], [0, -R * 1.15, R * 1.2], [0, -R * 1.55, R * 1.05]], [R * 0.16, R * 0.11, R * 0.02], Sg(8, 4)), sp.beard, 1);
  // ---- eyes
  if (kind !== 'wrench') for (const sx of [-1, 1]) { const x = sx * eyeX, y = eyeY, z = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (y / ry) ** 2)) * rz - eyeR * 0.35;
    addEye(H, { x, y, z, r: eyeR, yaw: Math.asin(THREE.MathUtils.clamp(x / rx, -1, 1)) * 0.85, pitch: -0.05, lid: sp.lid || (sp.mask ? sp.mask : face), open: eyeOpen, iris: sp.iris, dark: sp.darkEyes, droop: sp.droop, noLid: sp.noLid }, Sg); }
  if (sp.mask) for (const sx of [-1, 1]) { const x = sx * eyeX * 0.98, z = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (eyeY / ry) ** 2)) * rz, yw = Math.asin(THREE.MathUtils.clamp(x / rx, -1, 1)) * 0.85;   // Nov 16: the raccoon mask is felt, not a painted band
    H.add(blob(eyeR * 2.2, eyeR * 1.3, R * 0.16, Sg(14, 7), Sg(8, 4)), sp.mask, 1, M4(x + sx * eyeR * 0.25, eyeY - eyeR * 0.3, z - R * 0.1, 0, yw, -sx * 0.18));
    H.add(blob(eyeR * 1.3, eyeR * 0.42, R * 0.12, Sg(10, 5), Sg(6, 3)), sp.brow || '#efe8dc', 1, M4(x, eyeY + eyeR * 1.75, z - R * 0.12, -0.2, yw, sx * 0.25)); }
  // ---- glasses
  if (sp.glasses) { const g = sp.glasses, gr = eyeR * (g.dark ? 1.55 : 1.45);
    for (const sx of [-1, 1]) { const x = sx * eyeX, z = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (eyeY / ry) ** 2)) * rz + eyeR * (g.dark ? 1.0 : 0.55);
      const mm = M4(x, eyeY, z, 0, Math.asin(THREE.MathUtils.clamp(x / rx, -1, 1)) * 0.7, 0);
      H.add(new THREE.TorusGeometry(gr, R * 0.028, 4, Sg(16, 8)), g.col || '#2a1e1a', 0, mm);
      if (g.dark) H.add(new THREE.CircleGeometry(gr, Sg(16, 8)), '#1a1418', 0, mm.clone().multiply(M4(0, 0, -R * 0.005)));
      H.add(sweep([[x + sx * gr * 0.95, eyeY, z - R * 0.02], [sx * rx * 0.98, eyeY + R * 0.03, -R * 0.05]], [R * 0.02, R * 0.018], 4, { caps: false }), g.col || '#2a1e1a', 0); }
    H.add(sweep([[-eyeX + gr * 0.9, eyeY + R * 0.02, rz * 0.92 + eyeR * 0.4], [0, eyeY + R * 0.05, rz * 1.0 + eyeR * 0.5], [eyeX - gr * 0.9, eyeY + R * 0.02, rz * 0.92 + eyeR * 0.4]], [R * 0.02, R * 0.02, R * 0.02], 4, { caps: false }), g.col || '#2a1e1a', 0); }
  // ---- hair / hats
  if (sp.hair) { const hc = sp.hair.col;
    H.add(blob(rx * 1.06, ry * 0.7, rz * 1.04, Sg(18, 8), Sg(10, 5), (v, n) => { if (n.y < 0.15) v.y = Math.max(v.y, ry * 0.08 - (n.z < 0 ? R * 0.35 : 0)); v.x += Math.sin(n.z * 9 + n.x * 7) * R * 0.025; }), hc, 1, M4(0, R * 0.35, -R * 0.05));
    if (sp.hair.bun) H.add(blob(R * 0.3, R * 0.26, R * 0.28, Sg(12, 6), Sg(9, 4), (v, n) => { v.x += Math.sin(n.y * 10) * R * 0.02; }), hc, 1, M4(0, ry * 1.05, -R * 0.45)); }
  if (sp.hat) { const h = sp.hat, hc = h.col;
    if (h.kind === 'police') { H.add(lathe([[0, ry * 0.62], [rx * 1.02, ry * 0.6], [rx * 1.08, ry * 0.85], [rx * 1.25, ry * 1.05], [rx * 1.2, ry * 1.12], [0, ry * 1.1]], Sg(18, 8)), hc, 1, M4(0, 0, -R * 0.05));
      H.add(blob(rx * 0.75, R * 0.03, R * 0.38, Sg(12, 6), 4, (v, n) => { if (n.z < 0) v.z *= 0.1; }), '#141822', 0, M4(0, ry * 0.63, rz * 0.7, 0.25));
      H.add(new THREE.TorusGeometry(rx * 1.04, R * 0.04, 4, Sg(18, 8)), h.band || shade(hc, 0.6), 1, M4(0, ry * 0.66, -R * 0.05, PI / 2));
      H.add(star5(R * 0.12), h.badge || '#e8c04a', 0, M4(0, ry * 0.82, rz * 1.02 + R * 0.03, -0.15)); }
    else if (h.kind === 'cap') { H.add(blob(rx * 1.04, ry * 0.62, rz * 1.04, Sg(16, 8), Sg(8, 4), (v, n) => { if (n.y < 0) v.y = 0; }), hc, 1, M4(0, ry * 0.42, 0));
      H.add(blob(rx * 0.78, R * 0.035, R * 0.5, Sg(12, 6), 4, (v, n) => { if (n.z < 0) v.z *= 0.1; }), h.brim || hc, 1, M4(0, ry * 0.45, rz * 0.82, 0.12));
      H.add(blob(R * 0.07, R * 0.04, R * 0.07, 6, 4), shade(hc, 0.85), 1, M4(0, ry * 1.04, 0)); }
    else if (h.kind === 'chef') { H.add(lathe([[0, ry * 0.5], [rx * 1.03, ry * 0.5], [rx * 1.06, ry * 0.8], [rx * 0.95, ry * 1.05], [0, ry * 1.12]], Sg(16, 8), 1, 1), hc, 1);
      H.add(new THREE.TorusGeometry(rx * 1.04, R * 0.04, 4, Sg(16, 8)), shade(hc, 0.92), 1, M4(0, ry * 0.52, 0, PI / 2)); }
    else if (h.kind === 'top') { H.add(lathe([[0, ry * 0.7], [rx * 1.5, ry * 0.68], [rx * 1.52, ry * 0.74], [rx * 0.85, ry * 0.76], [rx * 0.82, ry * 1.9], [0, ry * 1.92]], Sg(18, 8)), hc, 1); H.add(new THREE.TorusGeometry(rx * 0.84, R * 0.06, 4, Sg(16, 8)), h.band || '#c9302a', 1, M4(0, ry * 0.86, 0, PI / 2)); }
    else if (h.kind === 'brim') { H.add(lathe([[0, ry * 0.62], [rx * 1.6, ry * 0.6], [rx * 1.62, ry * 0.66], [rx * 0.95, ry * 0.7], [rx * 0.88, ry * 1.15], [0, ry * 1.2]], Sg(18, 8)), hc, 1); H.add(new THREE.TorusGeometry(rx * 0.92, R * 0.05, 4, Sg(16, 8)), h.band || shade(hc, 0.7), 1, M4(0, ry * 0.75, 0, PI / 2)); }
  }
}

// ---------------- Banana Squid: a tall banana (5 soft ridges), heavy-lidded face, long nose, red plaid shawl, tentacles
const bx = (y) => 0.05 * Math.sin((y - 0.3) / 1.6 * PI) + (y > 1.4 ? (y - 1.4) ** 2 * 0.45 : 0);
const br = (y) => curve([[0.22, 0.13], [0.3, 0.18], [0.7, 0.205], [1.1, 0.2], [1.4, 0.175], [1.65, 0.11], [1.8, 0.05], [1.86, 0.03]], y);
function bananaBody(P, sp, Sg) {
  const yel = sp.fur || '#f2d64a', tip = '#4a3424', HY = 0.95;
  const seg = (y0, y1, n, dy) => { const pts = [], rr = []; for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n); pts.push([bx(y), y - dy, 0]); rr.push(br(y)); } return [pts, rr]; };
  { const [pts, rr] = seg(0.22, 1.02, 8, 0); P.torso.add(sweep(pts, rr, Sg(18, 8), { lobes: [5, 0.045] }), yel, 1); }
  { const [pts, rr] = seg(0.9, 1.86, 10, HY); P.head.add(sweep(pts, rr, Sg(18, 8), { lobes: [5, 0.045] }), (x, y) => (y + HY > 1.8 ? tip : yel), 1);
    P.head.add(blob(0.032, 0.05, 0.032, 6, 4), tip, 0, M4(bx(1.9), 1.9 - HY, 0)); }
  // face (head part, pivot at HY)
  const fy = 1.3, fz = br(fy) * 0.92, cx = bx(fy);
  for (const sx of [-1, 1]) addEye(P.head, { x: cx + sx * 0.075, y: fy - HY + 0.05, z: fz - 0.016, r: 0.064, yaw: sx * 0.32, lid: shade(yel, 0.96), open: 0.0, droop: 0.22, iris: '#5a3a1a' }, Sg);
  P.head.add(sweep([[cx, fy - HY + 0.01, fz], [cx, fy - HY - 0.09, fz + 0.06], [cx, fy - HY - 0.2, fz + 0.075]], [0.034, 0.042, 0.056], Sg(10, 5)), shade(yel, 0.94), 1);
  P.head.add(sweep([[cx - 0.04, fy - HY - 0.24, fz - 0.03], [cx, fy - HY - 0.25, fz - 0.01], [cx + 0.04, fy - HY - 0.24, fz - 0.03]], [0.008, 0.008, 0.008], 4), '#6a4a1a', 1);
  // plaid shawl over the shoulders, with a fringe
  const plaid = (x, y, z) => { const a = Math.atan2(x, z), u = (a / TAU * 16 + 8) % 1, v = (y * 16) % 1; if (u < 0.14 || v < 0.14) return '#4a1418'; if (Math.abs(u - 0.55) < 0.05 || Math.abs(v - 0.55) < 0.05) return '#f2d6a0'; return '#c42a26'; };
  P.torso.add(lathe([[0.21, 1.1], [0.25, 1.06], [0.31, 0.95], [0.36, 0.8], [0.355, 0.78], [0.2, 0.8]].reverse(), Sg(26, 10), 1, 0.9), plaid, 1);
  for (let i = 0; i < Sg(22, 10); i++) { const a = i / Sg(22, 10) * TAU; P.torso.add(new THREE.CylinderGeometry(0.008, 0.006, 0.07, 3), '#c42a26', 1, M4(Math.sin(a) * 0.35, 0.745, Math.cos(a) * 0.35 * 0.9)); }
  // a bundle of felt sausages held to the chest
  for (let i = 0; i < 4; i++) P.torso.add(sweep([[-0.09 + i * 0.05, 0.72, 0.27], [-0.07 + i * 0.05, 0.6, 0.31], [-0.08 + i * 0.05, 0.48, 0.29]], [0.03, 0.033, 0.03], Sg(8, 4)), i % 2 ? '#c8603a' : '#b8502e', 1);
}
function tentacleLeg(L, sp, sx, Sg) {   // pivot at (sx*0.07, 0.32): three tentacles fan out to the floor
  const c = sp.tent || '#e8c23a';
  for (let k = 0; k < 3; k++) { const a = sx * (0.35 + k * 0.55) + (k === 1 ? 0 : 0), dx = Math.sin(a), dz = Math.cos(a) * (k === 2 ? -1 : 1); const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([dx * (0.04 + t * 0.32), -0.02 - Math.min(1, t * 1.4) * 0.28 + (t > 0.8 ? (t - 0.8) * 0.25 : 0), dz * (0.03 + t * 0.28)]); }
    L.add(sweep(pts, pts.map((_, i) => 0.055 * (1 - i / 7.5) + 0.008), Sg(8, 5)), c, 1); }
}
function tentacleArm(A, sp, sx, Sg) {
  const c = sp.tent || '#e8c23a', pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([sx * (0.02 + Math.sin(t * 2.2) * 0.07), -t * 0.42, 0.06 + t * 0.14 - (t > 0.75 ? (t - 0.75) * 0.3 : 0)]); }
  A.add(sweep(pts, pts.map((_, i) => 0.045 * (1 - i / 8) + 0.008), Sg(8, 5)), c, 1);
}
// ---------------- Wrench: a tan clay adjustable wrench with a big nose, dot eyes, orange arms, yellow gloves (no legs: he hops)
function wrenchBody(P, sp, Sg) {
  const tan = sp.fur || '#c8a27a', HY = 1.08;
  const slab = (w, h, d) => blob(w, h, d, Sg(14, 6), Sg(12, 6), (v, n) => { const k = 0.55; v.x = Math.sign(n.x) * Math.pow(Math.abs(n.x), k) * w; v.z = Math.sign(n.z) * Math.pow(Math.abs(n.z), k) * d; });
  P.torso.add(slab(0.085, 0.52, 0.045), tan, 0, M4(0, 0.6, 0));
  P.torso.add(new THREE.TorusGeometry(0.05, 0.022, 5, Sg(14, 6)), shade(tan, 0.9), 0, M4(0, 0.2, 0.0)); P.torso.add(new THREE.CircleGeometry(0.05, Sg(12, 6)), '#2a2024', 0, M4(0, 0.2, 0.04));
  P.torso.add(new THREE.CircleGeometry(0.05, Sg(12, 6)), '#2a2024', 0, M4(0, 0.2, -0.04, 0, PI));
  P.head.add(slab(0.19, 0.12, 0.05), tan, 0, M4(0, 0.03, 0));
  P.head.add(slab(0.085, 0.11, 0.05), tan, 0, M4(-0.11, 0.17, 0, 0, 0, 0.1)); P.head.add(slab(0.08, 0.085, 0.05), tan, 0, M4(0.115, 0.15, 0, 0, 0, -0.08));
  P.head.add(new THREE.CylinderGeometry(0.035, 0.035, 0.12, Sg(10, 6)), shade(tan, 0.85), 0, M4(0.17, 0.04, 0, 0, 0, PI / 2));
  for (let i = 0; i < 5; i++) P.head.add(new THREE.TorusGeometry(0.037, 0.006, 3, Sg(10, 5)), shade(tan, 0.75), 0, M4(0.13 + i * 0.02, 0.04, 0, 0, PI / 2));
  for (const sx of [-1, 1]) P.head.add(blob(0.016, 0.02, 0.01, 6, 4), '#1a1416', 0, M4(sx * 0.05, 0.05, 0.05));
  P.head.add(sweep([[0, 0.03, 0.045], [0, -0.08, 0.08], [0, -0.17, 0.1]], [0.03, 0.045, 0.06], Sg(12, 6)), shade(tan, 1.04), 0);
  void HY;
}

// ------------------------------------------------------------------ the cast (each one matched to its bible / ref sheet)
const plaidFn = (base, dark, light) => (x, y, z) => { const u = ((x + 1) * 9) % 1, v = ((y + 1) * 9) % 1; if (u < 0.16 || v < 0.16) return dark; if (Math.abs(u - 0.58) < 0.05 || Math.abs(v - 0.58) < 0.05) return light; return base; };
const swirl = (x, y, z) => { const a = Math.sin(x * 23 + Math.sin(y * 17) * 2.2 + z * 9) + Math.sin(y * 13 - z * 19); return a > 0.7 ? '#e8822a' : a < -0.6 ? '#5ab04a' : '#7a3a9a'; };
export const FOLK = {
  wolf: { kind: 'canine', fur: '#4a4a54', face: '#4e4e58', muzzle: '#5a5a64', nose: '#141214', iris: '#e0482a', ears: 'pointy', earK: 1.25, earW: 1.3, earIn: '#3a3a42', top: '#e2a83a', collar: 'turtle', sweater: 1, pants: '#e0705a', legStyle: 'straight', feet: 'paw', feetCol: '#2e2e34', hands: '#3a3a42', tail: { kind: 'bushy', col: '#40404a' }, fat: 1.05 },
  bear: { kind: 'bear', fur: '#6a4430', muzzle: '#8a6040', nose: '#1e1410', top: '#6e1f2a', collar: 'turtle', sweater: 1, pants: '#1f7a7a', shoes: '#3a2418', hands: '#5a3a28', fat: 1.22, wide: 1.06, h: 1.12, headR: 0.25, neck: 0.04 },
  grandma: { kind: 'bear', fur: '#8a5a3a', muzzle: '#b08560', nose: '#2a1a14', glasses: { col: '#3a2a22' }, hair: { col: '#efece6', bun: 1 }, top: '#efe2c6', sleeve: '#7a2232', coat: { col: '#efe2c6', len: -0.12, gap: 0.6, buttons: '#7a2232' }, dress: '#6a6e34', skirt: '#6a6e34', skirtLen: -0.44, shoes: '#5a3a24', hands: '#7a4e32', fat: 1.16, h: 0.98, headR: 0.245, open: 0.1 },
  gecko: { kind: 'lizard', fur: swirl, face: '#7a3a9a', headFn: swirl, lid: '#7a3a9a', top: swirl, onepiece: 0, pants: '#efe2c8', legStyle: 'flare', feet: 'paw', feetCol: '#7a3a9a', hands: '#5ab04a', tail: { kind: 'curl', col: swirl }, h: 0.92, iris: '#e8c03a' },
  lynx: { kind: 'lynx', fur: '#d8b98a', muzzle: '#f2e6cc', nose: '#3a2226', iris: '#8ac8e8', ears: 'tufted', top: '#2f8a86', collar: 'turtle', pants: '#efe2c8', legStyle: 'flare', shoes: '#5a3a28', hands: '#d0b080', tail: { kind: 'puff', col: '#d8b98a' } },
  heron: { kind: 'bird', fur: '#cfd6dc', face: '#eef0f2', crest: '#1e1e24', beak: { col: '#e8a82a', len: 3.3, w: 0.28, drop: 0.1, flat: 0.7 }, top: '#5a2a7a', collar: 'hood', pants: '#efe2c6', legStyle: 'shorts', feet: 'bird', legCol: '#e8822a', hand: 'wing', hands: '#cfd6dc', h: 1.08, legs: 1.12, headR: 0.2, iris: '#e8c03a' },
  ram: { kind: 'ram', fur: '#2a2628', face: '#2a2628', muzzle: '#343032', horns: '#55505a', iris: '#e8c03a', earIn: '#4a4044', top: '#c8602a', coat: { col: '#c8602a', len: 0.02, gap: 0.3, fur: '#efe6d6', trim: '#efe6d6' }, collar: 'crew', pants: '#4a5a2a', feet: 'hoof', hoof: '#2a2628', hands: '#2a2628', h: 1.0 },
  crow: { kind: 'bird', fur: '#26262c', face: '#2a2a30', beak: { col: '#34303a', len: 2.1, w: 0.52, drop: 0.16, hook: 1, flat: 0.85 }, iris: '#d83a2a', top: '#3a6a3a', collar: 'hood', pants: '#e0a83a', legStyle: 'flare', feet: 'bird', legCol: '#2a2628', hand: 'wing', hands: '#26262c', tail: { kind: 'feather', col: '#26262c' } },
  moth: { kind: 'moth', fur: '#cfc2a2', face: '#e0d6c0', darkEyes: 1, noLid: 1, antenna: '#6a5a48', top: '#6a7a5a', pants: '#5a4a3a', wings: '#d8ccb0', wingSpot: '#8a6a4a', shoes: '#4a3a2e', hands: '#cfc2a2', collar: 'crew' },
  squid: { kind: 'banana', fur: '#f2d64a', tent: '#e8c23a', h: 0.95 },
  anteater: { kind: 'anteater', fur: '#2e2a2c', face: '#d8ccb4', muzzle: '#d0c2a8', headFn: (x, y, z) => (z < -0.05 ? '#2e2a2c' : '#d8ccb4'), top: '#e0a83a', chevron: '#6e1f2a', collar: 'crew', pants: '#6e1f2a', shoes: '#2a2024', hands: '#2e2a2c', tail: { kind: 'bushy', col: '#2e2a2c', tip: '#d8ccb4' } },
  vulture: { kind: 'bird', fur: '#2a2224', face: '#e89a9a', beak: { col: '#e8d8b0', len: 1.3, w: 0.46, drop: 0.25, hook: 1, flat: 0.95, cere: 0.55 }, glasses: { col: '#141014', dark: 1 }, top: '#1e2a4a', vneck: '#e8e2d6', collar: 'lapel', coat: { col: '#22305a', len: -0.55, gap: 0.55, flare: 1.25, w: 1.16, fur: '#9a7a5a' }, pants: '#1e2a4a', shoes: '#141822', hands: '#e89a9a', h: 1.15, neck: 0.11, neckW: 0.8, neckCol: '#e89a9a' },
  larry: { kind: 'bird', fur: '#9a9aa0', face: '#3a9a5a', throat: '#e6d6bc', beak: { col: '#2a2226', len: 2.9, w: 0.12, drop: 0.05 }, iris: '#2a1a14', top: '#e8705a', collar: 'lapel', lapelCol: '#c85040', pants: '#9a9aa0', legStyle: 'shorts', feet: 'bird', legCol: '#2a2226', hand: 'wing', hands: '#3a9a5a', h: 0.74, headR: 0.24, tail: { kind: 'feather', col: '#3a9a5a' } },
  fuzz: { kind: 'bear', fur: '#4a3024', muzzle: '#9a7458', nose: '#141010', top: '#1e2a52', collar: 'uniform', collarCol: '#24325e', badge: '#e8c04a', pocket: 1, belt: '#141418', buttons: '#e8c04a', pants: '#1e2a52', shoes: '#141418', hat: { kind: 'police', col: '#1a2448', badge: '#e8c04a' }, hands: '#3e281e', fat: 1.22, h: 1.05, headR: 0.25, open: 0.0 },
  lemon: { kind: 'fruit', face: '#f6dc3a', fur: '#f6dc3a', nubs: 1, headR: 0.32, neck: 0.0, top: '#3a9a4a', shortSleeve: 1, collar: 'crew', pants: '#22305a', legStyle: 'shorts', bareLegs: '#f2d43a', feet: 'sneaker', shoes: '#f2efe8', sole: '#d8d0c4', hat: { kind: 'cap', col: '#3a9a4a' }, hands: '#f2d43a', h: 0.85, smirk: 1, iris: '#4a2e22' },
  goat: { kind: 'goat', fur: '#e8e0cc', face: '#ece4d2', muzzle: '#ece4d2', nose: '#8a7a6a', earIn: '#d8b8a8', horns: '#8a6a4a', beard: '#e2d8c2', iris: '#c8a040', top: '#3e4ea6', collar: 'shirt', buttons: '#e8e2d6', pants: '#3a3a40', feet: 'hoof', hoof: '#5a4a3e', hands: '#e2d8c4', open: 0.12 },
  rabbit: { kind: 'rabbit', fur: '#8c86a6', muzzle: '#e8e4ee', eyeK: 1.4, earIn: '#e0a090', nose: '#e0806e', iris: '#f2c83a', teeth: 1, top: '#f0dcb0', collar: 'shirt', vest: '#3f8a3e', pants: '#d89a2a', legStyle: 'flare', feet: 'paw', bigFeet: 1, feetCol: '#8c86a6', hands: '#8c86a6', tail: { kind: 'puff', col: '#c9c2d4' }, h: 0.95, sleeve: '#f0dcb0' },
  reggie: { kind: 'raccoon', fur: '#7a7a82', face: '#8a8a92', mask: '#2a2628', muzzle: '#e8e2d6', earIn: '#e8e2d6', nose: '#141012', glasses: { col: '#141012' }, top: '#c98a3a', shortSleeve: 1, collar: 'crew', pants: '#3a3a44', shoes: '#2a2a30', hands: '#3a3a40', tail: { kind: 'ringed', col: '#8a8a92', col2: '#2a2628' } },
  sal: { kind: 'rodent', fur: '#a89aa8', face: '#b4a6b4', muzzle: '#c4b6c2', nose: '#e88a9a', earIn: '#e8b0b8', top: '#f4f0e8', collar: 'shirt', shortSleeve: 1, pants: '#3a3a44', shoes: '#2a2a30', hat: { kind: 'chef', col: '#f6f4ee' }, hands: '#b4a6b4', tail: { kind: 'thin', col: '#e8b8b8' }, fat: 1.32, belly: 0.2, open: 0.1 },
  dot: { kind: 'hen', fur: '#f2e6d2', face: '#f6ecdc', beak: { col: '#e8a83a', len: 0.85, w: 0.44, drop: 0.25, flat: 0.9 }, comb: '#d8302a', top: '#6ab8b8', dress: '#6ab8b8', skirt: '#6ab8b8', apron: '#f6f2ea', collar: 'crew', feet: 'bird', legCol: '#e8a83a', legStyle: 'none', hand: 'wing', hands: '#f2e6d2', fat: 1.1 },
  nan: { kind: 'rodent', fur: '#c8b8b0', face: '#d0c0b8', muzzle: '#dccfc6', nose: '#d88a8a', earIn: '#e8b8b8', hair: { col: '#f2f0ea' }, glasses: { col: '#6a4a3a' }, top: '#efe6dc', collar: 'shirt', sleeve: '#b8a0d8', coat: { col: '#b8a0d8', len: -0.06, gap: 0.55, buttons: '#efe6dc' }, skirt: '#6a4a8a', dress: '#efe6dc', shoes: '#5a3a2a', hands: '#d0c0b8', h: 0.92, open: 0.14, tail: { kind: 'thin', col: '#e0b8b8' } },
  wrench: { kind: 'wrench', fur: '#c8a27a', sleeve: '#e86a2a', hands: '#f2b632', gloves: 1 },
  hummer: { kind: 'bird', fur: '#3aa88a', face: '#4ac29a', beak: { col: '#2a2226', len: 2.9, w: 0.12, drop: 0.04 }, top: '#c9306a', collar: 'crew', pants: '#3a3a4a', legStyle: 'shorts', feet: 'bird', legCol: '#2a2226', hand: 'wing', hands: '#3aa88a', h: 0.72, headR: 0.24, tail: { kind: 'feather', col: '#2a8a7a' } },
  farmhand: { kind: 'shovel', fur: '#c9925f', face: '#c8b8a0', top: plaidFn('#c42a26', '#4a1418', '#f2d6a0'), sleeve: plaidFn('#c42a26', '#4a1418', '#f2d6a0'), collar: 'shirt', collarCol: '#c42a26', buttons: '#f2e6c8', pants: '#3a4a6a', shoes: '#e8c03a', hands: '#c9925f' },
  someone: { kind: 'plain', fur: '#a8a0b8', top: '#f2a6b8', pants: '#4ab8b0', shoes: '#3a2a2a', h: 0.95 },
  peach: { kind: 'fruit', face: '#f6a88a', fur: '#f6a88a', headR: 0.28, neck: 0, top: '#f6a88a', pants: '#8a5a3a', bareLegs: '#f6a88a', hands: '#f6a88a', h: 0.85 },
  farmhand_alt: null,
  // town-only faces (the living world)
  pig: { kind: 'pig', fur: '#f0b4b0', muzzle: '#e89a98', earIn: '#e89a98', top: '#3a4a78', collar: 'crew', pants: '#e8dcc8', shoes: '#3a2a2a', hands: '#f0b4b0', tail: { kind: 'curl', col: '#f0b4b0' }, fat: 1.15 },
  duck: { kind: 'bird', fur: '#f2ece0', face: '#f6f0e6', beak: { col: '#f0a43a', len: 0.7, w: 0.38, drop: 0.05 }, top: '#7fc8c0', collar: 'crew', pants: '#3a4a6a', legStyle: 'shorts', feet: 'bird', legCol: '#f0a43a', hand: 'wing', hands: '#f2ece0' },
  cat: { kind: 'cat', fur: '#e8a060', muzzle: '#f6e2c8', nose: '#e0806e', iris: '#6ab84a', top: '#a8d4b0', collar: 'turtle', pants: '#3a3a4a', legStyle: 'flare', shoes: '#3a2a2a', hands: '#e8a060', tail: { kind: 'thin', col: '#e8a060' } },
  dog: { kind: 'dog', fur: '#a07850', ear: '#6b4a32', muzzle: '#c8a888', nose: '#1a1214', top: '#e89ab0', collar: 'shirt', pants: '#3a3a4a', shoes: '#3a2a22', hands: '#a07850', tail: { kind: 'bushy', col: '#a07850' } },
  sheep: { kind: 'sheep', fur: '#f2ece0', face: '#3a3436', muzzle: '#3a3436', ear: '#3a3436', top: '#8ab0d8', collar: 'turtle', pants: '#5a4a6a', feet: 'hoof', hands: '#3a3436', hair: { col: '#f6f2ea' } },
};
// ---- shovel-headed Farmhand (one eye) is a head variant

// ------------------------------------------------------------------ assembly: pivots, two LODs, blob shadow
let SHT = null, EMPTY = null;
function shadowMesh(r) {
  if (!SHT) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(20,8,24,1)'); gr.addColorStop(0.5, 'rgba(20,8,24,.5)'); gr.addColorStop(1, 'rgba(20,8,24,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); SHT = new THREE.CanvasTexture(c); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: SHT, transparent: true, opacity: 0.4, depthWrite: false })); m.rotation.x = -PI / 2; m.position.y = 0.02; m.renderOrder = 1; return m;
}
const BUILT = new Map();   // per spec object: geometry is shared between every copy of the same character
export const LOD = { near: 7.5, far: 8.5, lowTier: () => (window.__quality?.tier === 'low') };
const _wp = new THREE.Vector3();
function lodSwitch(meshes, u) { return function (renderer, scene, camera) {
  this.getWorldPosition(_wp); const sc = u.h || 1, d = _wp.distanceTo(camera.position) / Math.max(0.4, sc * (u.lodScale || 1)), lt = LOD.lowTier() ? 0.6 : 1;
  const want = u.lodLvl ? (d < LOD.near * lt ? 0 : 1) : (d > LOD.far * lt ? 1 : 0);
  if (want !== u.lodLvl) { u.lodLvl = want; for (const m of meshes) { const g = m.userData.lod[want]; if (g) m.geometry = g; } } }; }
export function folk(spec, opts = {}) {
  const sp = typeof spec === 'string' ? FOLK[spec] : spec; if (!sp) return folk('someone');
  let B = BUILT.get(sp); if (!B) { B = { hi: buildFolk(sp, 0.8), lo: buildFolk(sp, 0.4) }; BUILT.set(sp, B); }
  const { hi, lo } = B, pv = hi.pv, s = pv.s, mat = folkMat(), g = new THREE.Group(), meshes = [];
  EMPTY ||= new THREE.BufferGeometry();
  const mk = (k, parent) => { if (!hi.geos[k]) return null; const m = new THREE.Mesh(hi.geos[k], mat); m.userData.lod = [hi.geos[k], lo.geos[k]]; m.castShadow = false; m.receiveShadow = false; parent.add(m); meshes.push(m); return m; };
  const torso = new THREE.Group(); torso.position.set(0, pv.torso[1] * s, 0); g.add(torso); const tm = mk('torso', torso);
  const hd = new THREE.Group(); hd.position.set(0, pv.hd[1] * s, 0); g.add(hd); mk('head', hd);
  const legs = [], arms = [];
  for (const i of [0, 1]) { const sx = i ? 1 : -1;
    const lp = new THREE.Group(); lp.position.set(sx * pv.leg[0] * s, pv.leg[1] * s, 0); g.add(lp); mk('leg' + i, lp); legs.push(lp);
    const ap = new THREE.Group(); ap.position.set(sx * pv.arm[0] * s, pv.arm[1] * s, 0); ap.rotation.z = sx * 0.1; g.add(ap); mk('arm' + i, ap); arms.push(ap); }
  const sh = shadowMesh(0.42 * s * (sp.fat || 1)); g.add(sh);
  const u = { folk: sp, torso, hd, legs, arms, h: s, ph: Math.random() * 10, shadow: sh, base: { torso: torso.position.y, hd: hd.position.y, leg: pv.leg[1] * s, arm: pv.arm[1] * s }, lodLvl: 0, lodScale: opts.lodScale || 1, meshes };
  g.userData = u; g.name = 'folk:' + (sp.name || Object.keys(FOLK).find((k) => FOLK[k] === sp) || 'custom');
  const anchor = tm || meshes[0]; if (anchor) anchor.onBeforeRender = lodSwitch(meshes, u);
  return g;
}
export function folkTris(g, lvl = 0) { let n = 0; for (const m of g.userData.meshes || []) n += triCount(m.userData.lod[lvl]); return Math.round(n); }

// legacy pal() options -> a folk spec (missions that still build a one-off pal with raw colours)
const LEGACY = new Map();
export function palSpec(o = {}) {
  const key = JSON.stringify(o); if (LEGACY.has(key)) return LEGACY.get(key);
  const body = o.body || '#c9a37a', head = o.head || body;
  let kind = 'plain';
  if (o.tent) kind = 'banana'; else if (o.beak) kind = 'bird'; else if (o.longsnout) kind = 'anteater'; else if (o.horns) kind = o.ears === 'pointy' ? 'goat' : 'ram';
  else if (o.ears === 'long') kind = 'rabbit'; else if (o.ears === 'antenna') kind = 'moth'; else if (o.ears === 'tall') kind = 'lynx'; else if (o.ears === 'pointy') kind = o.snout ? 'canine' : 'cat'; else if (o.ears === 'round' || o.snout) kind = 'bear';
  const sp = { kind, fur: body, face: head, muzzle: o.snout || o.longsnout || undefined, nose: o.nose, ear: o.ear || undefined, earIn: o.earIn, iris: o.eyes && o.eyes !== '#f6f2e8' ? o.eyes : undefined,
    horns: o.horns, top: o.shirt || body, sleeve: o.sleeve, pants: o.pants || (o.shirt ? shade(o.shirt, 0.6) : body), skirt: o.skirt, dress: o.skirt ? (o.shirt || body) : undefined, vest: o.vest,
    hands: o.hands || body, h: o.h || 1, fat: o.fat || 1, tail: o.tail ? { kind: kind === 'bird' ? 'feather' : 'bushy', col: o.tail } : null, wings: o.wings && kind === 'moth' ? o.wings : undefined,
    glasses: o.glasses ? { col: o.glasses } : null, hair: o.hair ? { col: o.hair, bun: o.bun } : null, hat: o.hat ? { kind: 'police', col: o.hat } : o.cap ? { kind: 'cap', col: o.cap } : null,
    beak: o.beak ? { col: o.beak, len: (o.beakLen || 0.5) / 0.28 * 0.55 } : null, feet: kind === 'bird' ? 'bird' : o.bigFeet ? 'paw' : 'shoe', bigFeet: o.bigFeet, shoes: o.shoes || '#3a2a26', collar: 'crew', tent: o.tent };
  if (kind === 'bird') { sp.legStyle = 'shorts'; sp.hand = 'wing'; sp.hands = body; }
  LEGACY.set(key, sp); return sp;
}

// ------------------------------------------------------------------ motion (same contract as the old animPal)
export function animFolk(g, dt, t, { walk = 0, wave = 0, cheer = 0, panic = 0, sit = 0, spd = null } = {}) {
  const u = g.userData; if (!u?.base) return; if (spd != null) walk = spd > 0.05 ? Math.min(1.6, 0.35 + spd * 0.45) : 0;
  u.ph += dt * (walk ? 6.2 * Math.max(0.6, walk) : 1.5); const h = u.h, b = u.base, ph = u.ph;
  const sw = walk ? Math.min(0.62, 0.32 + walk * 0.25) : 0, bob = walk ? Math.abs(Math.cos(ph)) * 0.035 * h : Math.sin(ph) * 0.006 * h;
  const sitDrop = sit ? (u.folk?.kind === 'banana' ? 0.1 : 0.36) * h : 0;
  u.torso.position.y = b.torso + bob - sitDrop; u.hd.position.y = b.hd + bob * 1.1 - sitDrop;
  u.torso.rotation.y = walk ? Math.sin(ph) * 0.07 : 0; u.torso.rotation.z = walk ? Math.sin(ph) * 0.025 : Math.sin(ph * 0.5) * 0.008; u.torso.rotation.x = walk ? 0.05 : 0;
  u.hd.rotation.set(walk ? -0.04 : Math.sin(ph * 0.31) * 0.03, walk ? -Math.sin(ph) * 0.05 : Math.sin(ph * 0.23) * 0.12, Math.sin(ph * 0.5) * 0.04 + (panic ? Math.sin(t * 22) * 0.12 : 0));
  for (const i of [0, 1]) { const L = u.legs[i], A = u.arms[i], sx = i ? 1 : -1, ss = i ? -1 : 1;
    L.position.y = b.leg - sitDrop + (walk ? Math.max(0, Math.sin(ph * ss)) * 0.02 * h : 0); L.rotation.set(sit ? -1.45 : Math.sin(ph) * sw * ss, 0, 0);
    A.position.y = b.arm + bob - sitDrop; A.rotation.set(walk ? -Math.sin(ph) * sw * 0.75 * ss : Math.sin(ph * 0.5 + i) * 0.03, 0, sx * (0.1 + (walk ? 0.03 : 0)));
  }
  const A1 = u.arms[1], A0 = u.arms[0];
  if (wave) { A1.rotation.set(-0.3, 0, 2.5 + Math.sin(t * 9) * 0.35); }
  if (cheer || panic) { const k = Math.sin(t * (panic ? 18 : 10)); A0.rotation.set(-0.2, 0, -2.6 - k * 0.25); A1.rotation.set(-0.2, 0, 2.6 + k * 0.25); const j = Math.abs(k) * 0.06 * h; u.torso.position.y += j; u.hd.position.y += j; A0.position.y += j; A1.position.y += j; }
}

// ------------------------------------------------------------------ felt cows (desert road + snack run): one good cow, not five boxes
// Rounded barrel body (lathe), soft patches (vertex colour from a smooth field, per-cow seed), a big pink felt muzzle with
// nostrils, heavy-lidded deadpan eyes, clay horns + hooves, felt ears and a tufted tail. Pivots: head (on the shoulders), four
// legs, tail. userData.anim(dt, t, speed, graze?) walks (diagonal gait) when moving and grazes / chews / flicks when still.
const COWB = new Map();
function buildCow(seed, Q, o) {
  const Sg = (n, mn = 3) => Math.max(mn, Math.round(n * Q)), hide = o.hide || '#f2ebdc', spot = o.spot || '#2e2628', pink = o.muzzle || '#e8aaa2';
  const r = (k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const a1 = r(1) * 6, a2 = r(2) * 6, a3 = r(3) * 6;
  const patch = (x, y, z) => { const f = Math.sin(x * 4.2 + a1) * Math.sin(y * 3.6 + a2) * Math.sin(z * 3.1 + a3) + 0.45 * Math.sin(x * 7.3 + z * 5.1 + a2) * Math.sin(y * 6.1 - a1); return f > 0.38 ? spot : hide; };
  const P = { body: new Part(1), head: new Part(1), tail: new Part(1), l0: new Part(1), l1: new Part(1), l2: new Part(1), l3: new Part(1) };
  const BY = 0.84;   // body centre height
  const CP = [[-0.86, 0], [-0.83, 0.26], [-0.68, 0.4], [-0.4, 0.46], [-0.05, 0.48], [0.3, 0.47], [0.56, 0.42], [0.76, 0.3], [0.82, 0]]; const rows = Sg(22, 9), prof = [];
  for (let i = 0; i <= rows; i++) { const z = lerp(-0.86, 0.82, i / rows); prof.push([i === 0 || i === rows ? 0 : curve(CP, z), z]); }
  const g = lathe(prof, Sg(30, 9), 0.82, 0.92);
  g.rotateX(PI / 2); { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y > 0) p.setY(i, y * (1 - 0.06 * Math.exp(-(z * z) / 0.2))); else p.setY(i, y * (1 + 0.08 * Math.exp(-((z + 0.1) ** 2) / 0.3))); } g.computeVertexNormals(); }
  g.translate(0, BY, 0); P.body.add(g, patch, 1);
  P.body.add(blob(0.13, 0.08, 0.12, Sg(10, 5), Sg(7, 4)), pink, 1, M4(0, BY - 0.42, -0.35));
  for (const [x, z] of [[-0.05, -0.3], [0.05, -0.3], [-0.05, -0.4], [0.05, -0.4]]) P.body.add(new THREE.CylinderGeometry(0.014, 0.01, 0.06, 4), pink, 1, M4(x, BY - 0.49, z));
  // head (pivot on the shoulders): neck, skull, broad pink muzzle, ears, horns, eyes, forelock
  const HP = [0, BY + 0.22, 0.6];
  P.head.add(sweep([[0, -0.08, -0.1], [0, 0.0, 0.16], [0, 0.04, 0.34]], [0.27, 0.22, 0.19], Sg(14, 6)), (x, y, z) => patch(x, y + HP[1], z + HP[2]), 1);
  P.head.add(blob(0.2, 0.21, 0.24, Sg(16, 8), Sg(12, 6), (v, n) => { if (n.z < -0.3) v.z *= 0.9; }), (x, y, z) => (r(4) > 0.5 && x > 0.02 && y > 0.06 ? spot : hide), 1, M4(0, 0.08, 0.44));
  P.head.add(blob(0.19, 0.14, 0.15, Sg(14, 6), Sg(10, 5), (v, n) => { if (n.y > 0.3) v.y *= 0.8; }), pink, 1, M4(0, -0.06, 0.64));
  for (const sx of [-1, 1]) { P.head.add(blob(0.04, 0.026, 0.02, 6, 4), '#7a3a3a', 0, M4(sx * 0.07, -0.02, 0.785, -0.4, sx * 0.25));
    P.head.add(blob(0.15, 0.06, 0.035, Sg(10, 5), Sg(7, 4), (v) => { v.x += 0.1 * Math.sign(sx); }), hide, 1, M4(sx * 0.13, 0.2, 0.36, 0, 0, sx * -0.35));
    P.head.add(blob(0.09, 0.035, 0.02, Sg(8, 4), Sg(6, 3), (v) => { v.x += 0.1 * Math.sign(sx); }), pink, 1, M4(sx * 0.14, 0.2, 0.375, 0, 0, sx * -0.35));
    P.head.add(sweep([[sx * 0.1, 0.24, 0.42], [sx * 0.19, 0.3, 0.42], [sx * 0.21, 0.4, 0.4]], [0.035, 0.028, 0.012], Sg(7, 4)), '#efe2c2', 0);
    addEye(P.head, { x: sx * 0.12, y: 0.13, z: 0.6, r: 0.045, yaw: sx * 0.55, lid: hide, open: 0.0, droop: 0.18, iris: '#3a2a22' }, Sg); }
  P.head.add(sweep([[-0.06, -0.15, 0.72], [0, -0.165, 0.75], [0.06, -0.15, 0.72]], [0.008, 0.008, 0.008], 4), '#7a3a3a', 1);
  P.head.add(blob(0.09, 0.05, 0.07, Sg(8, 4), Sg(6, 3), (v, n) => { v.y += Math.sin(n.x * 9) * 0.01; }), spot, 1, M4(0, 0.28, 0.48, -0.3));
  // legs (pivot at the top of the leg), hooves
  const LP = [[-0.25, 0.56], [0.25, 0.56], [-0.25, -0.56], [0.25, -0.56]];
  LP.forEach(([x, z], i) => { const L = P['l' + i]; L.add(sweep([[0, 0.06, 0], [0, -0.2, 0.01], [0, -0.38, 0], [0, -0.5, 0]], [0.12, 0.09, 0.075, 0.08], Sg(10, 5)), (xx, y, zz) => patch(xx + x, y + BY - 0.1, zz + z), 1);
    L.add(lathe([[0, -0.58], [0.085, -0.58], [0.088, -0.53], [0.078, -0.5], [0, -0.5]], Sg(10, 5)), '#3a2e2a', 0); });
  // tail
  P.tail.add(sweep([[0, 0, 0], [0, -0.2, -0.05], [0, -0.42, -0.04]], [0.03, 0.022, 0.02], Sg(6, 4)), hide, 1); P.tail.add(blob(0.05, 0.09, 0.05, Sg(8, 4), Sg(6, 3)), spot, 1, M4(0, -0.5, -0.04));
  const geos = {}; for (const k of Object.keys(P)) geos[k] = P[k].geo();
  return { geos, HP, LP, BY };
}
export function feltCow(o = {}) {
  const seed = o.seed ?? Math.floor(Math.random() * 9); const key = seed % 4 + (o.hide || '') + (o.spot || '');
  let B = COWB.get(key); if (!B) { B = { hi: buildCow(seed % 4 + 1, 1, o), lo: buildCow(seed % 4 + 1, 0.42, o) }; COWB.set(key, B); }
  const { hi, lo } = B, mat = folkMat(), g = new THREE.Group(), meshes = [];
  const mk = (k, parent) => { const m = new THREE.Mesh(hi.geos[k], mat); m.userData.lod = [hi.geos[k], lo.geos[k]]; parent.add(m); meshes.push(m); return m; };
  const body = new THREE.Group(); g.add(body); const bm = mk('body', body);
  const head = new THREE.Group(); head.position.set(...hi.HP); body.add(head); mk('head', head);
  const tail = new THREE.Group(); tail.position.set(0, hi.BY + 0.3, -0.8); body.add(tail); mk('tail', tail);
  const legs = hi.LP.map(([x, z], i) => { const l = new THREE.Group(); l.position.set(x, 0.58, z); g.add(l); mk('l' + i, l); return l; });
  const sh = shadowMesh(0.95); sh.scale.set(0.75, 1.15, 1); g.add(sh);
  const u = { body, head, tail, legs, meshes, h: 1.4, lodLvl: 0, ph: Math.random() * 10, graze: 0, chew: 0, look: Math.random() * 6, tris: [0, 1].map((l) => Math.round(meshes.reduce((n, m) => n + triCount(m.userData.lod[l]), 0))) };
  bm.onBeforeRender = lodSwitch(meshes, u);
  u.anim = (dt, t, v = 0, grazeHint = null) => {
    const walking = Math.abs(v) > 0.12; u.ph += dt * (walking ? 2.2 + Math.abs(v) * 2.4 : 0.8);
    const wantG = grazeHint ?? (walking ? 0 : 1); u.graze += (wantG - u.graze) * Math.min(1, dt * (wantG ? 0.8 : 2.5));
    const sw = walking ? Math.min(0.42, 0.18 + Math.abs(v) * 0.3) : 0, ph = u.ph;
    legs[0].rotation.x = Math.sin(ph) * sw; legs[3].rotation.x = Math.sin(ph) * sw; legs[1].rotation.x = -Math.sin(ph) * sw; legs[2].rotation.x = -Math.sin(ph) * sw;
    body.position.y = walking ? Math.abs(Math.cos(ph)) * 0.025 : 0; body.rotation.z = walking ? Math.sin(ph) * 0.025 : 0; body.rotation.x = Math.sin(t * 0.9 + u.look) * 0.006;
    body.scale.set(1 + Math.sin(t * 1.3 + u.look) * 0.008, 1, 1);
    // head: walking = nod with the stride; grazing = head down, slow chew, now and then a long deadpan look up
    const lookUp = Math.max(0, Math.sin(t * 0.21 + u.look) - 0.82) * 5.5;
    const gz = u.graze * (1 - Math.min(1, lookUp));
    head.rotation.x = gz * 1.25 + (walking ? Math.sin(ph * 2) * 0.05 : Math.sin(t * 7.5) * 0.025 * gz) - (1 - gz) * 0.08;
    head.rotation.y = (1 - gz) * Math.sin(t * 0.33 + u.look) * 0.35 + gz * Math.sin(t * 0.5) * 0.12; head.rotation.z = gz * Math.sin(t * 3.7) * 0.03;
    tail.rotation.z = Math.sin(t * 1.7 + u.look) * 0.35 + Math.sin(t * 5.3) * 0.06; tail.rotation.x = 0.15;
  };
  u.anim(0, 0, 0, 0); g.userData = u; g.name = 'feltcow'; return g;
}

// ------------------------------------------------------------------ rider(k): a seated felt passenger for the cockpit's back seat
// Same contract the cockpit's old capsule blockouts had: { root, torso, headG, head, eyes, mouth, tongue, arms[{ sh, hand, fing, sx }] }.
// headG is the head pivot, mouth/tongue are felt pieces on the face (the cockpit squashes the mouth and pokes the tongue out),
// arms are the figure's own shoulder pivots (index 0 = the +x arm, like the blockouts). Own material copy: the cockpit's wild-mode
// rider melt patches it without touching the rest of the cast.
const RIDER_FACE = { squid: [0.044, 0.07, 0.2], farmhand: [0, 0.075, 0.075] };
export function rider(k, { headY = 0.98, scale = 0.92 } = {}) {
  const g = folk(k), u = g.userData; animFolk(g, 0, 0, { sit: 1 }); u.shadow.visible = false; g.scale.setScalar(scale);
  const base = folkMat(), mat = base.clone(); mat.onBeforeCompile = base.onBeforeCompile; mat.customProgramCacheKey = base.customProgramCacheKey;
  for (const m of u.meshes) m.material = mat;
  const root = new THREE.Group(); root.add(g); g.position.y = headY - u.hd.position.y * scale;
  const [mx, my, mz] = RIDER_FACE[k] || [0, -0.05, 0.2], hd = u.hd;
  const dark = new THREE.MeshLambertMaterial({ color: '#3a1a1a' }), pink = new THREE.MeshLambertMaterial({ color: '#e86a7a' });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), dark); mouth.position.set(mx, my, mz); hd.add(mouth);
  const tg = new THREE.Group(); tg.position.set(0, my + 0.06, 0); hd.add(tg);   // the cockpit writes tongue.position.y = -0.1 - k (old blockout mouth at -0.06)
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 6), pink); tongue.scale.set(1, 1.4, 0.5); tongue.position.set(mx, -0.1, mz + 0.012); tongue.visible = false; tg.add(tongue);
  const arms = [[u.arms[1], 1], [u.arms[0], -1]].map(([sh, sx]) => { const am = sh.children.find((c) => c.isMesh), gb = am?.userData.lod[0]; if (gb && !gb.boundingBox) gb.computeBoundingBox();
    const ly = gb ? gb.boundingBox.min.y : -0.4, hand = new THREE.Group(); hand.position.set(0, ly * 0.92, 0.02); sh.add(hand);
    const fing = new THREE.Group(); fing.position.copy(hand.position).add(new THREE.Vector3(0, -0.03, 0)); fing.visible = false; sh.add(fing);
    for (const s2 of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.11, 6), mat); f.geometry.setAttribute('felt', new THREE.Float32BufferAttribute(new Float32Array(f.geometry.attributes.position.count).fill(1), 1));
      const col = new THREE.Color(FOLK[k]?.hands || '#d8a77a'), c = new Float32Array(f.geometry.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = col.r; c[i + 1] = col.g; c[i + 2] = col.b; } f.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
      f.position.set(s2 * 0.02, -0.05, 0); f.rotation.z = s2 * 0.12; fing.add(f); }
    return { sh, hand, fing, sx }; });
  const head = hd.children.find((c) => c.isMesh);
  return { root, torso: u.torso, headG: hd, head, eyes: [new THREE.Object3D(), new THREE.Object3D()], mouth, tongue, arms, folk: g };
}
