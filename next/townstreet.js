// townstreet.js — run 11 M3: street dressing. Utility poles + sagging wires (some janky), palms, classic '50s cars,
// parking lots, the sketchy spots (back alley, empty lot, chain-link corner) and filler storefronts between the ref buildings.
// Procedural felt, 0 Meshy credits. Everything is chunked into ~70 m cells so the townscape LOD/culling can drop far cells.
import * as THREE from 'three';
import { palm, sign, far, SERIF, SCRIPT } from './townshops.js';

const WOOD = ['#6b5644', '#75604a', '#5e4c3c'], WIRE = '#2a2426';
const CARS = [['#7fc8c0', '#f2ece0'], ['#e89ab0', '#f4eee4'], ['#c8302e', '#f2ece0'], ['#a8d4b0', '#e8e4d8'], ['#f0d27a', '#f2ece0'],
  ['#3a4a78', '#e8e4d8'], ['#2a2a2e', '#2a2a2e'], ['#e8e0d0', '#7fc8c0'], ['#d86a3a', '#f2e6d0'], ['#8ab0d8', '#f2ece0']];
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- a '50s car (sedan with fins). Local: nose toward +z.
export function car(k, x, z, ry, [body, top], o = {}) {
  k.frame(x, 0, z, ry, (f) => {
    const L = o.L ?? 5.3, W = 2.0, ch = '#d8d6ce';
    f.box(0, 0.3, 0, W, 0.5, L, body, { lod: true });                       // body tub
    f.box(0, 0.8, 0.95 - L / 2 + 2.2, W - 0.06, 0.08, 1.6, body);          // hood skin (front)
    f.box(0, 0.8, -L / 2 + 0.75, W - 0.06, 0.1, 1.4, body);                // trunk deck
    f.box(0, 0.8, -0.25, W - 0.2, 0.5, 2.3, '#36404c');                    // glasshouse
    f.box(0, 1.28, -0.3, W - 0.26, 0.1, 2.1, top, { lod: true });          // roof
    f.box(0, 0.46, 0, W + 0.02, 0.07, L - 0.6, ch);                        // side spear
    for (const s of [-1, 1]) {
      f.beam([s * 0.88, 0.8, -L / 2 + 1.5], [s * 0.92, 1.12, -L / 2 + 0.05], 0.13, body, {}, 0.05); // tail fins
      f.blob(s * 0.92, 1.0, -L / 2 + 0.06, 0.07, 0.12, 0.05, '#e83a2e', { glow: true });       // tail lights
      f.blob(s * 0.7, 0.66, L / 2 + 0.02, 0.15, 0.15, 0.06, '#f6efd8');                         // headlights
      for (const wz of [L / 2 - 1.0, -L / 2 + 1.1]) { f.cyl(s * (W / 2 + 0.02), 0.36, wz, 0.36, 0.22, '#1e1c1e', { rz: s * Math.PI / 2, seg: 9 }); f.cyl(s * (W / 2 + 0.05), 0.36, wz, 0.2, 0.2, '#f2efe6', { rz: s * Math.PI / 2, seg: 8 }); }
    }
    f.box(0, 0.22, L / 2 + 0.06, W + 0.1, 0.22, 0.14, ch); f.box(0, 0.22, -L / 2 - 0.06, W + 0.1, 0.22, 0.14, ch); // chrome bumpers
    f.box(0, 0.48, L / 2 + 0.03, 1.0, 0.18, 0.06, ch);                     // grille
    f.solid(-W / 2, -L / 2, W / 2, L / 2, 1.4);
  });
}

// chain-link: one shared alpha texture (felt-grey wire diamonds), UVs scaled per panel so the mesh stays 2 tris
let _cl = null;
function chainMat() {
  if (_cl) return _cl;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = '#a8aaa6'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  _cl = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }); return _cl;
}
// chain-link run a->b ([x,z]), height h, with posts + top rail (+ optional barbed wire); sag/hole for janky
function chainlink(k, a, b, h, o = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  const geo = new THREE.PlaneGeometry(L, h); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.12, uv.getY(i) * h / 0.12);
  if (o.sag) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) - o.sag * (1 - Math.abs(p.getX(i)) / (L / 2))); }
  const m = new THREE.Mesh(geo, chainMat()); k.put(m, (a[0] + b[0]) / 2, h / 2 + 0.04, (a[1] + b[1]) / 2, ry);
  const n = Math.max(1, Math.round(L / 3));
  for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, lean = o.lean && i % 2 ? o.lean : 0;
    k.beam([x, 0, z], [x + lean, h + 0.08, z], 0.07, '#8a8c88'); if (o.barb) k.beam([x + lean, h + 0.08, z], [x + lean, h + 0.5, z - 0.25], 0.04, '#6a6c68'); }
  k.beam([a[0], h, a[1]], [b[0], h - (o.sag || 0), b[1]], 0.045, '#9a9c98');
  if (o.barb) for (const y of [0.25, 0.42]) k.beam([a[0], h + y, a[1] - y * 0.5], [b[0], h + y, b[1] - y * 0.5], 0.015, '#4a4a4a');
  k.solid(Math.min(a[0], b[0]) - 0.05, Math.min(a[1], b[1]) - 0.05, Math.max(a[0], b[0]) + 0.05, Math.max(a[1], b[1]) + 0.05, h);
}

// ---------------------------------------------------------------- a filler storefront. Local front z=0 facing +z, centred x=0, back to -d.
function filler(k, o) {
  const { w, d = 12, h = 4.6, wall, trim = '#f2ece0' } = o, hw = w / 2;
  k.aab(-hw, 0, -d, hw, h, 0, wall, { lod: true }); k.solid(-hw, -d, hw, 0, h);
  k.aab(-hw - 0.08, h, -d, hw + 0.08, h + 0.22, 0.12, trim);               // coping
  if (o.parapet === 'step') { k.aab(-hw * 0.45, h, -0.3, hw * 0.45, h + 1.1, 0, wall, { lod: true }); k.aab(-hw * 0.45 - 0.06, h + 1.1, -0.35, hw * 0.45 + 0.06, h + 1.26, 0.08, trim); }
  if (o.parapet === 'peak') k.ext([[-hw, 0], [hw, 0], [hw, 0.4], [0, 1.4], [-hw, 0.4]], -0.3, 0.3, wall, { at: [0, h, 0], lod: true });
  if (o.kind === 'brick') { for (let y = 0.9; y < h - 0.2; y += 1.1) k.aab(-hw, y, 0, hw, y + 0.06, 0.025, o.mortar || '#8a5a46'); k.aab(-hw, h - 0.55, 0, hw, h - 0.3, 0.05, o.mortar || '#8a5a46'); }
  if (o.kind === 'board') for (let y = 0.3; y < h - 0.1; y += 0.26) k.aab(-hw, y, 0, hw, y + 0.04, 0.03, o.mortar || '#b8c4b0');
  if (o.kind === 'block') for (let y = 0.4; y < h; y += 0.4) k.aab(-hw, y, 0, hw, y + 0.025, 0.02, o.mortar || '#b8ab96');
  k.aab(-hw, 0, 0, hw, 0.45, 0.08, o.base || trim);                         // kick plate
  const dx = o.doorX ?? (o.door === 'left' ? -hw + 1.4 : 0);
  k.door(dx, 0, 0, 1.0, 2.3, o.doorCol || '#5a4a3a', { frame: trim, lite: o.lite || '#3a4450' });
  const wins = o.wins ?? [[-hw + 0.8, dx - 0.9], [dx + 0.9, hw - 0.8]];
  for (const [a, b] of wins) if (b - a > 0.8) k.window((a + b) / 2, 0.6, 0, b - a, 1.9, { frame: trim, glass: o.glass || '#3c4650', mull: [Math.floor((b - a) / 1.8), 0], blind: o.blind, blindCol: o.blindCol, grille: o.bars });
  if (o.boarded) for (const [a, b] of wins) k.aab(a, 0.6, 0.05, b, 2.5, 0.09, '#a89070');
  if (h > 6) for (let x = -hw + 1.4; x < hw - 0.6; x += 2.2) k.window(x, h - 2.6, 0, 1.0, 1.5, { frame: trim, glass: '#3a4048', sill: trim, blind: 0.3 });
  if (o.awn) { const [c1, c2] = o.awn, n = Math.max(4, Math.round(w / 0.6)), aw = w - 0.6;
    for (let i = 0; i < n; i++) k.box(-aw / 2 + aw * (i + 0.5) / n, 2.75, 0.55, aw / n + 0.01, 0.06, 1.25, i % 2 ? c2 : c1, { rx: 0.42 });
    k.box(0, 2.62, 1.12, aw, 0.26, 0.04, c1); }
  if (o.sign) sign(k, o.sign, 0, o.signY ?? (h - 0.8), 0.1, Math.min(w - 0.8, o.signW ?? w * 0.8), o.signH ?? 0.9, { bg: o.signBg ?? null, fg: o.signFg || '#3a1f2a', family: o.family, glow: o.signGlow, fit: o.fit ?? 0.7, italic: o.italic });
  if (o.ghost) sign(k, o.ghost, 0, h - 0.9 - (o.sign ? 1.0 : 0), 0.04, w * 0.85, 0.8, { fg: o.ghostCol || '#efe2c8', family: SERIF, fit: 0.6 });
  if (o.extra) o.extra(k, hw, h, d);
}

// ---------------------------------------------------------------- the dressing pass
export function buildStreet(TS, place) {
  const GRID = TS.GRID, WALK = 3.5;
  const doors = Object.values(TS.doors);
  const nearStreetX = (x, pad = 0) => GRID.ns.some(s => Math.abs(x - s.x) < s.hw + WALK + pad);
  const free = (x, z, r = 1) => !TS.boxes.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) && !doors.some(d => Math.hypot(d.x - x, d.z - z) < 2.6 + r)
    && !TS.props.some(p => Math.hypot(p[1] - x, p[2] - z) < 1.2 + r);
  // lamps standing in front of a door: slide them along the curb
  for (const p of TS.props) if (p[0] === 'lamp') for (const d of doors) if (Math.hypot(d.x - p[1], d.z - p[2]) < 3.2) p[1] += (p[1] >= d.x ? 1 : -1) * (3.4 - Math.abs(p[1] - d.x));

  // ---- cells: collect draw calls by ~70 m cell, then bake one place() per cell (LOD/culling per cell)
  const cells = new Map();
  const add = (x, z, fn) => { const key = Math.floor(x / 70) + ',' + Math.floor(z / 70); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(fn); };

  // ---- utility poles + sagging wires. A line runs along x at z; poles every `step`; every few are janky.
  const lines = [
    { z: -30.4, x0: -94, x1: 30, step: 25, side: -1 },       // back alley (north of Main St)
    { z: 12.75, x0: -166, x1: 26, step: 24, side: 1 },       // Main St, south curb
    { z: 57.85, x0: -190, x1: 40, step: 26, side: -1 },      // Mesa Ln, north curb
    { z: -53.05, x0: -120, x1: 48, step: 26, side: 1 },      // Neon Strip, south curb
  ];
  let pid = 0;
  for (const ln of lines) {
    const poles = [];
    for (let x = ln.x0; x <= ln.x1 + 0.1; x += ln.step) {
      let px = x; if (nearStreetX(px, 1)) continue;
      if (!free(px, ln.z, 0.3)) { px += 3; if (!free(px, ln.z, 0.3)) continue; }
      const i = pid++, jank = hash(i), h = 9.2 + hash(i + 7) * 1.2;
      const lean = jank > 0.66 ? (hash(i + 3) - 0.5) * 0.9 : 0, leanZ = jank > 0.8 ? ln.side * 0.35 : 0;
      poles.push({ x: px, z: ln.z, h, lean, leanZ, i, jank, tx: px + lean, tz: ln.z + leanZ });
    }
    for (let j = 0; j < poles.length; j++) {
      const P = poles[j], N = poles[j + 1];
      add(P.x, P.z, (k) => {
        const col = WOOD[P.i % 3], arm = P.jank > 0.5 && P.jank < 0.62 ? 0.22 : 0;   // a few crossarms knocked askew
        k.beam([P.x, 0, P.z], [P.tx, P.h, P.tz], 0.27, col, { lod: true }, 0.2);
        k.box(P.tx, P.h - 0.75, P.tz, 0.14, 0.14, 2.5, col, { rx: arm, lod: true });
        for (const o of [-1.1, 0, 1.1]) k.box(P.tx, P.h - 0.61 + o * Math.sin(arm) * -1, P.tz + o, 0.09, 0.16, 0.09, '#7f9a86');
        for (let s = 0; s < 9; s++) k.box(P.tx * (s / 12) + P.x * (1 - s / 12), 0.6 + s * 0.42, P.z + (P.tz - P.z) * s / 12 + ln.side * 0.15, 0.24, 0.03, 0.04, '#4a4a48'); // climbing steps
        if (P.i % 5 === 0) { k.cyl(P.tx + 0.32, P.h - 2.6, P.tz, 0.32, 1.0, '#8a8e8a', { seg: 8 }); k.cyl(P.tx + 0.32, P.h - 1.6, P.tz, 0.34, 0.08, '#6a6e6a', { seg: 8 }); } // transformer can
        if (P.i % 4 === 2) { k.box(P.tx, 3.4, P.tz + ln.side * 0.2, 0.36, 0.5, 0.22, '#7a7a70'); k.box(P.tx, 4.6, P.tz + ln.side * 0.4, 0.06, 0.06, 1.0, '#3a3a3a'); } // junction box + bent bracket
        if (P.i % 6 === 3) sign(k, ['LOST CAT', 'YARD SALE SAT', 'GUITAR LESSONS', 'HAVE YOU SEEN\nTHE SUN?'][P.i % 4], P.x + 0.01, 1.7, P.z + ln.side * 0.15, 0.42, 0.55, { bg: '#f4eee0', fg: '#3a2a2a', fit: 0.5, ry: ln.side > 0 ? 0 : Math.PI });
        if (!N || N.x - P.x > ln.step * 1.5) return;
        const wire = (a, b, sag, t, colr = WIRE) => { const n = 5; let prev = a;
          for (let s = 1; s <= n; s++) { const u = s / n, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]; k.beam(prev, p, t, colr); prev = p; } };
        for (const o of [-1.1, 1.1]) wire([P.tx, P.h - 0.5, P.tz + o], [N.tx, N.h - 0.5, N.tz + o], 0.55 + hash(P.i + o) * 0.5, 0.035);
        wire([P.tx, P.h - 2.0, P.tz], [N.tx, N.h - 2.0, N.tz], 0.9 + (P.i % 4 === 3 ? 1.6 : 0), 0.06);            // phone cable (one dragging low)
        if (P.i % 7 === 4) { const mx = (P.tx + N.tx) / 2, my = (P.h + N.h) / 2 - 0.5 - 0.75, mz = (P.tz + N.tz) / 2 + 1.1; // sneakers slung over the wire
          for (const s of [-0.16, 0.16]) { k.beam([mx, my, mz], [mx + s, my - 0.6, mz], 0.012, '#e8e4dc'); k.box(mx + s, my - 0.78, mz + 0.06, 0.12, 0.14, 0.3, s > 0 ? '#e8e4dc' : '#d8d4cc'); k.box(mx + s, my - 0.79, mz + 0.06, 0.13, 0.04, 0.32, '#c8302e'); } }
      });
    }
  }

  // ---- palms (sidewalks + cross streets), skipped anywhere they'd block a door or a building
  const palms = [];
  for (let x = -172; x <= 20; x += 24) palms.push([x + 6, 14.9]);
  for (const sx of [-40, -100]) for (const s of [-1, 1]) for (let z = 22; z <= 50; z += 14) palms.push([sx + s * 7.6, z]);
  for (const sx of [-40, -100]) for (const s of [-1, 1]) for (let z = -22; z >= -46; z -= 12) palms.push([sx + s * 7.6, z]);
  palms.push([36.8, -66], [44, -66], [-120, -67.5], [-104.5, -54.5], [-2.6, -67.6]);
  palms.forEach(([x, z], i) => { if (!free(x, z, 0.6)) return; add(x, z, (k) => palm(k, x, z, 7 + hash(i + 40) * 3.5, 0.08 + hash(i + 41) * 0.18, hash(i + 42) * 6.28)); });

  // ---- parked cars along the curbs (parallel), clear of crossings, the pickup and the bus stop
  const parked = [
    ...[-140, -117, -84, -66, -55, -20, -8].map(x => [x, 3.35, Math.PI / 2]), ...[-150, -128, -76, -28, -12, 2].map(x => [x, 10.65, -Math.PI / 2]),
    ...[-110, -88, -30, 6].map(x => [x, -64.65, Math.PI / 2]), ...[-70, -20, 10, 38].map(x => [x, -57.35, -Math.PI / 2]),
    ...[-150, -60, -10].map(x => [x, 58.6 + 1.1, Math.PI / 2]),
  ];
  parked.forEach(([x, z, ry], i) => { if (nearStreetX(x, 3.5)) return; add(x, z, (k) => car(k, x, z, ry, CARS[(i * 3 + 1) % CARS.length])); });

  // ---- parking lots (asphalt, stalls, wheel stops, a lot light, nose-in cars)
  const lot = (x0, z0, x1, z1, n, nose, carsAt, label) => add((x0 + x1) / 2, (z0 + z1) / 2, (k) => {
    k.aab(x0, 0, z0, x1, 0.05, z1, '#4a4446'); const sw = (x1 - x0) / n, back = nose > 0 ? z1 : z0;
    for (let i = 0; i <= n; i++) k.aab(x0 + i * sw - 0.06, 0.05, back - nose * 5.4, x0 + i * sw + 0.06, 0.056, back, '#e8e2d4');
    for (let i = 0; i < n; i++) k.box(x0 + (i + 0.5) * sw, 0.05, back - nose * 0.7, 1.6, 0.14, 0.22, '#c8c0b0');
    k.beam([x1 - 1, 0, (z0 + z1) / 2], [x1 - 1, 7.5, (z0 + z1) / 2], 0.2, '#8a8a86'); k.box(x1 - 1, 7.4, (z0 + z1) / 2, 2.4, 0.18, 0.5, '#6a6a66'); k.box(x1 - 1, 7.3, (z0 + z1) / 2, 2.2, 0.08, 0.4, '#fff2c8', { glow: true });
    if (label) sign(k, label, x0 + 1.6, 2.2, nose > 0 ? z0 + 0.3 : z1 - 0.3, 2.6, 0.9, { bg: '#f2ece0', fg: '#2a4a8a', fit: 0.5, ry: nose > 0 ? 0 : Math.PI });
    if (label) k.beam([x0 + 1.6, 0, nose > 0 ? z0 + 0.2 : z1 - 0.2], [x0 + 1.6, 1.75, nose > 0 ? z0 + 0.2 : z1 - 0.2], 0.08, '#8a8a86');
    for (const i of carsAt) car(k, x0 + (i + 0.5) * sw, back - nose * 2.9, nose > 0 ? 0 : Math.PI, CARS[(i * 7 + 3) % CARS.length]);
  });
  // run 13: the Main St customer lot (-76..-58.5, 16..29.5) is now the Horse Plaza (horse.js)
  lot(1.5, -52, 22, -38, 7, -1, [1, 2, 5], 'BOWL & POOL\nPARKING');        // Neon Strip south, beside the pool hall

  // ---- the back alley (z -31..-26): dumpsters, bags, crates, puddles, graffiti, a bare bulb over a back door
  add(-30, -28, (k) => {
    for (const [x, c] of [[-82, '#3f6a4a'], [-44.5, '#3a4a6a'], [-19, '#3f6a4a'], [14, '#7a4a2a']]) { k.aab(x - 1.0, 0, -27.4, x + 1.0, 1.3, -25.9, c); k.box(x, 1.3, -26.6, 2.1, 0.1, 1.7, '#2e3a32', { rx: -0.18 }); k.solid(x - 1.0, -27.4, x + 1.0, -25.9, 1.4); }
    for (let i = 0; i < 11; i++) { const x = -88 + hash(i + 90) * 112, z = -26.6 - hash(i + 91) * 1.2; k.blob(x, 0.32, z, 0.38, 0.34, 0.34, hash(i + 92) > 0.5 ? '#2a2a2e' : '#3a3e48'); }
    for (const [x, z] of [[-60, -27.2], [-58.8, -27.0], [4, -26.8], [-70, -27.5]]) k.box(x, 0, z, 0.8, 0.55, 0.6, '#9a7a52', { ry: hash(x) });
    for (const [x, z, r] of [[-66, -29, 1.6], [-28, -28.4, 1.1], [8, -29.2, 2.0], [-90, -28.2, 1.3]]) k.cyl(x, 0.031, z, r, 0.012, '#2e3446', { seg: 12, sz: 0.6 });
    for (const [x, z, t, c] of [[-23.25, -17.56, 'LARRY WAS HERE', '#e85a8a'], [-3, -17.56, 'KSUN SUX', '#5ec8d6'], [-61, -23.56, 'WHO TOOK\nTHE SUN?', '#f6d24a'], [-82.5, -19.56, 'SOCKS!!', '#a8d468']])
      sign(k, t, x, 2.0, z, 3.4, 1.3, { fg: c, family: SCRIPT, fit: 0.75, ry: Math.PI });
    for (const x of [-23.25, -3, 19]) { k.box(x, 2.5, -17.7, 0.1, 0.1, 0.4, '#3a3a3a'); k.blob(x, 2.42, -18.0, 0.09, 0.12, 0.09, '#ffe8a8', { glow: true }); }
    k.beam([-35, 0, -26.2], [-34.2, 2.2, -26.6], 0.08, '#8a8c88'); // a lone bent sign post
  });

  // ---- the empty lot (Main St north, between Pawn and TV Repair): dirt, weeds, tyres, a mattress, a cart, a sagging chain-link front with a hole
  add(-156, -10, (k) => {
    k.aab(-165.5, 0, -22, -146.5, 0.07, -1.6, '#b9663c');
    for (let i = 0; i < 26; i++) { const x = -165 + hash(i + 200) * 18, z = -21 + hash(i + 201) * 18; k.blob(x, 0.15, z, 0.35 + hash(i) * 0.4, 0.25 + hash(i + 1) * 0.35, 0.35, hash(i + 2) > 0.5 ? '#8a8a4a' : '#9a8a50'); }
    for (const [x, z] of [[-160, -8], [-159.2, -8.4], [-152, -16]]) k.cyl(x, 0.22, z, 0.42, 0.24, '#2a2626', { rz: Math.PI / 2, seg: 9 });
    k.box(-155, 0.07, -12, 1.5, 0.22, 2.0, '#e6dccb', { ry: 0.4 }); k.box(-155, 0.29, -12, 1.4, 0.02, 1.9, '#c9a0a8', { ry: 0.4 });
    k.frame(-149.5, 0, -6.5, 0.9, (f) => { f.box(0, 0.5, 0, 0.6, 0.5, 0.9, '#b0b4b0'); for (const s of [-1, 1]) for (const z of [-0.35, 0.35]) f.cyl(s * 0.25, 0.08, z, 0.08, 0.06, '#2a2626', { rz: Math.PI / 2, seg: 6 }); f.beam([0, 0.95, -0.45], [0, 1.1, -0.6], 0.06, '#b0b4b0'); });
    k.frame(-163, 0, -2.4, 0.18, (f) => { f.beam([-0.9, 0, 0], [-0.9, 2.1, 0], 0.09, '#7a6a5a'); f.beam([0.9, 0, 0], [0.9, 2.1, 0], 0.09, '#7a6a5a'); sign(f, 'FOR LEASE\nSUNSPOTS REALTY\nCALL 2-0000', 0, 1.7, 0.06, 2.0, 1.0, { bg: '#f2ece0', fg: '#b8322e', fit: 0.6 }); });
    chainlink(k, [-165.5, -1.8], [-158.5, -1.8], 1.9, { sag: 0.25 }); chainlink(k, [-156.2, -1.8], [-146.6, -1.8], 1.9, { sag: 0.55, lean: 0.25 }); // the gap is the hole
    chainlink(k, [-165.5, -1.8], [-165.5, -21.8], 1.9, {});
  });

  // ---- the chain-link corner (Neon Strip south x Palm St): barbed wire, KEEP OUT, an old boat on a trailer, a drum, weeds
  add(-116, -44, (k) => {
    k.aab(-124, 0, -52.4, -108.2, 0.06, -34, '#a8603a');
    chainlink(k, [-124, -52.3], [-108.3, -52.3], 2.4, { barb: true }); chainlink(k, [-108.3, -52.3], [-108.3, -34.2], 2.4, { barb: true, sag: 0.3 });
    chainlink(k, [-124, -52.3], [-124, -34.2], 2.4, { barb: true });
    sign(k, 'KEEP OUT', -116, 1.4, -52.2, 1.6, 0.6, { bg: '#f2ece0', fg: '#b8322e', fit: 0.6 }); sign(k, 'COMING SOON\nSUN-O-RAMA 1961', -112, 1.6, -52.18, 2.6, 1.1, { bg: '#e8d8a8', fg: '#3a4a7a', fit: 0.55 });
    k.frame(-117, 0, -44, 0.5, (f) => { f.box(0, 0.5, 0, 0.12, 0.12, 5.5, '#6a6a66'); for (const s of [-1, 1]) f.cyl(s * 0.9, 0.36, 0.8, 0.36, 0.2, '#2a2626', { rz: Math.PI / 2, seg: 9 });
      f.ext([[-1.0, 0], [1.0, 0], [1.15, 0.9], [-1.15, 0.9]], -2.4, 4.8, '#f2ece0', { at: [0, 0.7, 0] }); f.box(0, 1.55, 0, 2.3, 0.18, 4.9, '#5ec8d6'); f.box(0, 1.7, 2.6, 0.9, 0.3, 0.3, '#c8c4bc'); });
    k.cyl(-111.5, 0, -38, 0.42, 1.2, '#7a3a2a', { seg: 10 }); k.cyl(-111.5, 0.35, -38, 0.43, 0.06, '#5a2a1e', { seg: 10 });
    for (let i = 0; i < 18; i++) k.blob(-123 + hash(i + 300) * 14, 0.15, -51.5 + hash(i + 301) * 16.5, 0.4, 0.3 + hash(i + 302) * 0.4, 0.4, '#8a8a48');
  });

  // ---- filler storefronts: [x, z, ry, opts]
  const S = Math.PI;
  const fillers = [
    [-112.5, -1.5, 0, { w: 8, d: 12, h: 4.6, wall: '#e4d2b4', trim: '#3a6a8a', kind: 'block', sign: 'BARBER', signBg: '#f2ece0', signFg: '#3a6a8a', awn: ['#3a6a8a', '#f2ece0'],
      extra: (k, hw) => { k.cyl(hw - 0.5, 1.2, 0.3, 0.13, 1.4, '#f2ece0', { seg: 8 }); for (let i = 0; i < 4; i++) k.box(hw - 0.5, 1.3 + i * 0.32, 0.3, 0.28, 0.09, 0.28, i % 2 ? '#2a4a8a' : '#c8302e', { ry: i * 0.4 }); } }],
    [-140, -1.5, 0, { w: 12, d: 14, h: 7.4, wall: '#8a4a36', trim: '#e8dcc4', kind: 'brick', mortar: '#6e3a2a', sign: 'PAWN • LOANS', signBg: '#1e2a3a', signFg: '#f6d24a', bars: '#2a2a2a', awn: null,
      extra: (k, hw) => { for (const [x, y] of [[-0.3, 6.6], [0.3, 6.6], [0, 6.1]]) k.blob(x + hw - 1.0, y - 2.4, 0.9, 0.24, 0.24, 0.24, '#d9b24a'); k.beam([hw - 1.0, 4.6, 0], [hw - 1.0, 4.6, 0.9], 0.06, '#2a2a2a'); } }],
    [-174, -1.5, 0, { w: 13, d: 12, h: 5, wall: '#d8c8a8', trim: '#7a5a3a', kind: 'block', sign: "RAY'S TV REPAIR", signFg: '#a8302e', signBg: '#f2e6c8', parapet: 'step', blind: 0.5,
      extra: (k, hw) => { k.box(-hw + 2, 0.6, -0.4, 0.7, 0.55, 0.5, '#3a2e2a'); k.box(-hw + 2, 0.72, -0.14, 0.52, 0.4, 0.02, '#8ab0b8', { glow: true }); } }],
    [19.25, 15.5, S, { w: 16, d: 13, h: 6.4, wall: '#a0583e', trim: '#efe2c8', kind: 'brick', mortar: '#7e3e2c', sign: 'SUNSPOTS HARDWARE', signBg: '#2a4a3a', signFg: '#f2e6c8', awn: ['#2a5a3e', '#efe2c8'], parapet: 'step',
      extra: (k, hw) => { k.box(-hw + 1.4, 0, 0.8, 1.2, 0.9, 0.6, '#c8302e'); for (let i = 0; i < 3; i++) k.cyl(hw - 1.5 - i * 0.6, 0, 0.9, 0.24, 0.8, '#8a7a5a', { seg: 8 }); } }],
    [-53.25, 15.5, S, { w: 8.5, d: 11, h: 4.4, wall: '#c8d8c8', trim: '#f2ece0', kind: 'board', mortar: '#a8bca8', sign: 'SHOE REPAIR', signFg: '#5a3a2a', parapet: 'peak',
      extra: (k) => { k.box(-2.6, 3.3, 0.3, 0.7, 0.36, 0.12, '#5a3a2a'); } }],
    [-115, 15.5, S, { w: 12, d: 12, h: 4.8, wall: '#f0e0c0', trim: '#c8302e', kind: 'stucco', sign: 'MERCADO DEL SOL', signFg: '#c8302e', awn: ['#3f8a5a', '#f2ece0'],
      extra: (k, hw) => { for (let i = 0; i < 4; i++) k.box(-hw + 1.4 + i * 0.7, 0, 0.9, 0.6, 0.55, 0.5, ['#e85a2e', '#f6d24a', '#7fb04a', '#c8302e'][i]); } }],
    [-134, 15.5, S, { w: 20, d: 12, h: 4.2, wall: '#d8e0d8', trim: '#3a4a4e', kind: 'stucco', base: '#b8a080', sign: 'SUN STATE INSURANCE', signFg: '#3a4a4e', glass: '#3a4a50', blind: 0.6,
      extra: (k, hw) => { for (let x = -hw; x <= hw; x += 2.5) k.box(x, 0, 0.18, 0.18, 2.9, 0.35, '#e8ece6'); } }],
    [-165, 15.5, S, { w: 18, d: 14, h: 5.2, wall: '#e8d0a0', trim: '#2a3a5a', kind: 'block', sign: 'AUTO PARTS', signBg: '#c8302e', signFg: '#f2ece0', doorX: 6,
      wins: [[5, 8]], extra: (k) => { k.box(-3, 0, 0.04, 6.5, 4.0, 0.08, '#c8c4bc'); for (let y = 0.4; y < 4; y += 0.4) k.box(-3, y, 0.09, 6.5, 0.04, 0.03, '#a8a49c'); k.blob(-8.2, 0.4, 1.2, 0.5, 0.4, 0.5, '#2a2626'); } }],
    [-23.5, -52.5, S, { w: 14, d: 15, h: 4.2, wall: '#3a2e36', trim: '#8a6a7a', kind: 'block', mortar: '#2e242a', sign: 'TATTOO', signFg: '#ff4f8a', signGlow: true, family: SCRIPT, signW: 6, signH: 1.3, glass: '#2a1e2a',
      extra: (k) => { sign(k, 'WALK-INS', 3.4, 1.8, 0.1, 1.8, 0.4, { fg: '#5ef0f0', glow: true, fit: 0.7 }); } }],
    [34, -52.5, S, { w: 18, d: 14, h: 4.2, wall: '#f4e2c6', trim: '#d86a3a', kind: 'stucco', sign: 'DONUTS', signFg: '#d86a3a', awn: ['#d86a3a', '#f4e2c6'],
      extra: (k, hw, h) => { k.frame(0, h + 0.2, -2, 0, (f) => { f.beam([-0.6, 0, 0], [-0.6, 1.0, 0], 0.18, '#7a6a5a'); f.beam([0.6, 0, 0], [0.6, 1.0, 0], 0.18, '#7a6a5a');
        f.cyl(0, 3.0, 0, 2.2, 0.9, '#e8b070', { rx: Math.PI / 2, seg: 16 }); f.cyl(0, 3.0, 0.92, 1.9, 0.06, '#e87ab0', { rx: Math.PI / 2, seg: 16 }); f.cyl(0, 3.0, 0.98, 0.8, 0.02, '#3a2e2a', { rx: Math.PI / 2, seg: 12 }); }); } }],
    [-80, -52.5, S, { w: 20, d: 16, h: 5.6, wall: '#c8c8c0', trim: '#5a5a58', kind: 'block', sign: "BIG AL'S AUTO BODY", signFg: '#2a2a2e', signBg: '#f6d24a', doorX: 8, wins: [[6.5, 9.4]],
      extra: (k) => { for (const x of [-6, 0.5]) { k.box(x, 0, 0.04, 5.2, 4.2, 0.08, '#8a8a84'); for (let y = 0.5; y < 4.2; y += 0.5) k.box(x, y, 0.09, 5.2, 0.04, 0.03, '#6a6a66'); } } }],
    [-58, -52.5, S, { w: 14, d: 14, h: 4.6, wall: '#c8302e', trim: '#f6d24a', kind: 'stucco', sign: 'GOLDEN DRAGON', signFg: '#f6d24a', signGlow: true, signBg: '#2a1a1a', glass: '#3a2020',
      extra: (k, hw, h) => { for (const x of [-hw + 1.3, hw - 1.3]) { k.blob(x, 2.7, 0.5, 0.35, 0.45, 0.35, '#e8302e', { glow: true }); k.box(x, 3.15, 0.5, 0.06, 0.3, 0.06, '#2a1a1a'); } k.box(0, h + 0.2, 0.0, 6, 0.3, 0.6, '#2a6a4a', { rx: 0.1 }); } }],
  ];
  for (const [x, z, ry, o] of fillers) { const ok = !TS.boxes.some(b => x > b.x0 + 0.5 && x < b.x1 - 0.5 && Math.abs(z - (b.z0 + b.z1) / 2) < (b.z1 - b.z0) / 2 + 2); if (!ok) continue;
    place('filler_' + (o.sign || 'x').split(/\W/)[0].toLowerCase() + '_' + Math.round(x), x, z, ry, (k) => filler(k, o)); }

  // ---- run 11 (M4): THE CHAIN-LINK COURT (Palm St, west side, north of KSUN): one hoop, cracked asphalt, Larry Byrd inside. Gate faces Palm St.
  place('court', -108, -26, Math.PI / 2, (k) => {   // on Palm St's west side between the chain-link corner and KSUN; gate faces the street (+x)
    k.aab(-7, 0, -13.6, 7, 0.06, -0.4, '#5d5a5e');                                   // asphalt pad
    k.aab(-2.4, 0.06, -13.4, 2.4, 0.075, -7.6, '#c9584a'); k.aab(-2.3, 0.07, -13.3, 2.3, 0.08, -7.7, '#5d5a5e');   // painted key (outline)
    k.aab(-6.9, 0.06, -0.62, 6.9, 0.07, -0.5, '#efe2c4');                             // half-court line
    chainlink(k, [-7, -0.5], [-7, -13.6], 3.0, {}); chainlink(k, [7, -0.5], [7, -13.6], 3.0, { sag: 0.2 }); chainlink(k, [-7, -13.6], [7, -13.6], 3.0, {});
    chainlink(k, [-7, -0.5], [-1.6, -0.5], 3.0, {}); chainlink(k, [1.6, -0.5], [7, -0.5], 3.0, { lean: 0.15 });   // gate gap at the front
    k.beam([0, 0, -13.2], [0, 3.6, -13.2], 0.18, '#3f5f6e'); k.beam([0, 3.4, -13.2], [0, 3.4, -12.4], 0.12, '#3f5f6e');
    k.box(0, 2.85, -12.35, 1.8, 1.05, 0.06, '#efe2c4'); k.box(0, 2.95, -12.31, 0.6, 0.45, 0.02, '#c9584a');
    k.cyl(0, 3.03, -11.95, 0.24, 0.04, '#e06a2a', { seg: 14 });
    k.box(-5.6, 0, -6, 0.45, 0.45, 2.0, '#8a5a3a'); k.box(-5.4, 0, -3.6, 0.6, 0.45, 0.4, '#2f7ab8');
    sign(k, 'COURT', 0, 3.4, -0.45, 2.6, 0.7, { bg: '#f2ece0', fg: '#c9584a', fit: 0.65 }); k.beam([-1.6, 0, -0.5], [-1.6, 3.8, -0.5], 0.08, '#8a8c88'); k.beam([1.6, 0, -0.5], [1.6, 3.8, -0.5], 0.08, '#8a8c88');
    k.mark('door_court', 0, 1.0);
  }, { lodNear: 90 });

  // ---- the gas station (Neon Strip north, west of the motel): butterfly canopy, two pumps, little office
  place('gas_station', -111.5, -70.5, 0, (k) => {
    k.aab(-11, 0, -18, 11, 0.05, 0, '#c8c0b0');
    k.aab(-9, 0, -18, 3, 3.6, -11, '#f2ece0', { lod: true }); k.solid(-9, -18, 3, -11, 3.6); k.aab(-9.1, 0, -11.1, 3.1, 0.6, -10.9, '#c8302e');
    k.window(-5, 0.7, -11, 4.2, 2.4, { frame: '#c8302e', glass: '#3a4a52', mull: [2, 0] }); k.door(0.5, 0, -11, 1.0, 2.4, '#3a4a52', { frame: '#c8302e' });
    k.box(-3, 3.6, -14.5, 12.8, 0.2, 8, '#f2ece0', { rz: 0.06 });
    for (const x of [-4, 4]) k.box(x, 0, -5, 0.4, 4.4, 0.4, '#e8e4dc');
    k.box(-2.2, 4.4, -5, 4.6, 0.18, 6, '#c8302e', { rz: 0.16 }); k.box(2.2, 4.4, -5, 4.6, 0.18, 6, '#c8302e', { rz: -0.16 });
    for (const x of [-2, 2]) { k.box(x, 0.05, -5, 1.2, 0.2, 2.4, '#c8c4bc'); k.box(x, 0.25, -5, 0.6, 1.5, 0.45, '#c8302e'); k.cyl(x, 1.75, -5, 0.24, 0.42, '#f2ece0', { seg: 10 }); k.blob(x, 1.95, -5, 0.2, 0.12, 0.2, '#fff2c8', { glow: true }); }
    k.beam([8, 0, -1.0], [8, 7.5, -1.0], 0.25, '#e8e4dc'); k.cyl(8, 7.6, -1.0, 1.4, 0.3, '#c8302e', { rx: Math.PI / 2, seg: 16 });
    sign(k, 'SUN-O-GAS', 8, 7.6, -0.62, 2.4, 0.8, { fg: '#f6d24a', glow: true, fit: 0.6 }); sign(k, 'GAS 29¢', 8, 5.6, -0.86, 2.0, 0.7, { bg: '#f2ece0', fg: '#2a4a8a', fit: 0.65 }); k.box(8, 5.2, -1.0, 2.1, 0.8, 0.2, '#f2ece0');
    sign(k, 'SERVICE', -3, 3.15, -10.9, 3, 0.55, { fg: '#c8302e', fit: 0.7 });
    car(k, 6.5, -12, 0.3, CARS[0]); k.cyl(-10, 0, -2.5, 0.3, 1.0, '#3a6a8a', { seg: 8 }); // air / water stand
  }, { lodNear: 90 });

  // ---- bake the cells
  for (const [key, fns] of cells) place('dress_' + key, 0, 0, 0, (k) => { for (const fn of fns) fn(k); }, { melt: false, lodNear: 85 });
}
