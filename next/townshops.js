// townshops.js — run 11 M2: commercial buildings + the Neon Strip, recreated from Scott's exterior refs (procedural felt).
// Same local frame as townscape.js houses: front face at z=0 facing +z, building runs back to -z; +x = viewer's right.
// Colours sampled from exterior_refs/*.jpg (median 7x7 patch, lit side) and locked in PALC.
import * as THREE from 'three';
import { textPlane } from './townkit.js';

export const PALC = {
  store: { wall: '#ead8c7', wall2: '#e6cec0', stain: '#d8bfb0', ledge: '#f0e4d8', sill: '#b0625d', diamond: '#d83f47', dframe: '#b8524f', picketR: '#c8463f', plank: '#b8423f', picketW: '#efe6dc', cooler: '#d43c0f', coolerLid: '#ece4da', sign: '#d9762e', steps: '#e4c9b9', pole: '#7a6656', iron: '#1e1a1a' },
  diner: { fascia: '#9a1424', fasciaDk: '#730413', header: '#efd9b0', base: '#6a2a24', baseDk: '#43271e', glass: '#e9a35e', mull: '#5a3326', neon: '#ff7a30', signBg: '#7a1a1c', signFg: '#fff1b0', signStroke: '#ff5a24', steel: '#c8c4bc' },
  laundry: { brick: '#b08e72', brickDk: '#8a6a52', trim: '#6e2420', trimDk: '#541b19', gold: '#c9a050', cream: '#f2e2c4', frame: '#7a2a24', awnR: '#b8322e', awnW: '#efe4cc', awnB: '#2a3550', tile: '#cfe3e2', washer: '#f2f0ea', round: '#efe6d8', roundBlue: '#4e677b', escape: '#a8352c', stone: '#d8c8b0' },
  post: { brick: '#9c4a38', stone: '#e8dfcc', bronze: '#4a3a2a', glass: '#2e3a3a', lawn: '#7d8a4a', hedge: '#4a5a32', box: '#2a4a8a' },
  dmv: { wall: '#e6dcc6', fin: '#e2d8c0', glass: '#3c4a4e', sage: '#a8b88a', roof: '#f2ede2', steel: '#3a3a3a', letters: '#3e4a3a', block: '#b8a080' },
  thrift: { wall: '#ecc970', trim: '#c98a3a', ghost: '#a8552c', awnO: '#d7782e', awnW: '#f1e3c4', door: '#7a4a2a', back: '#8a6a4a' },
  ksun: { wall: '#f0ebe0', trim: '#5a4a8a', block: '#b8cfd0', mastR: '#c8402e', mastW: '#efe6dc', neon: '#ff4f6a' },
  yard: { tin: ['#8a6a52', '#9a7a5a', '#7a7a72', '#a0603a', '#6e6a62'], post: '#5a4a3a', board: '#e8d8b0', tire: '#2a2626', rust: '#8a4a32', shack: '#9a8a70' },
  bowl: { wall: '#f9cfaa', wallSh: '#ecb891', wallR: '#ce8139', block: '#e9b88e', canopy: '#4c2d25', band: '#efdfa1', fin: '#3d1c15', dot: '#f2e6c8', signY: '#faec89', signR: '#ba464a', disc: '#a93a34', pole: '#e7e3d2', stone: '#efe2c4', stone2: '#cdbb9a', glass: '#532f27', cap: '#e8e0d0', script: '#b23a3a' },
  pool: { wall: '#eae1d8', base: '#4f3c36', frame: '#343f3e', block: '#7f8a86', grid: '#d8d8d0', curtain: '#e8e4da', door: '#575f59', letters: '#5a3a30', ghost: '#9a7a6e' },
  motel: { wall: '#f6c6d6', trim: '#2a9d9a', stone: '#c8b8a0', court: '#6a6460', deck: '#efe6d2', water: '#5ec8d6', coping: '#f2ece0', fence: '#e8f0ee', neonP: '#ff6fae', neonR: '#ff3b3b', star: '#ffd75a' },
  drivein: { lot: '#4f4646', fence: '#6a5446', screen: '#efe6d6', frame: '#3a3030', sign: '#e0c192', neonR: '#ff6a3a', signG: '#3f6f52', snack: '#f0e2c4', snackR: '#c8463f', post: '#5a5a5a' },
};

// ---------------------------------------------------------------- shared helpers
export const far = (m) => { m.userData.far = true; return m; };
// text plane centred at (x, y, z) in the kit frame (glowing = neon, stays visible far away)
export function sign(k, text, x, y, z, w, h, o = {}) {
  const m = textPlane(text, w, h, { bg: o.bg ?? null, fg: o.fg || '#3a1f2a', font: o.font || 'bold', family: o.family || 'Futura, Avenir, "Helvetica Neue", Arial, sans-serif', glow: !!o.glow, stroke: o.stroke || null, italic: !!o.italic, fit: o.fit ?? 0.72, pad: o.pad ?? 0.06, border: o.border || null });
  if (o.glow || o.far) far(m); return k.put(m, x, y, z, o.ry || 0);
}
export const SCRIPT = '"Brush Script MT", "Lobster", "Pacifico", "Segoe Script", cursive';
export const SERIF = 'Georgia, "Times New Roman", serif';
// a felt palm: segmented leaning trunk + drooping fronds
export function palm(k, x, z, h = 8, lean = 0.12, ang = 0) {
  const n = 6, lx = Math.sin(ang) * lean, lz = Math.cos(ang) * lean; let px = x, pz = z, py = 0;
  for (let i = 0; i < n; i++) { const nx = px + lx * h / n * (0.4 + i / n), nz = pz + lz * h / n * (0.4 + i / n), ny = py + h / n;
    k.beam([px, py, pz], [nx, ny, nz], 0.36 - i * 0.025, i % 2 ? '#8a7458' : '#7c6850'); px = nx; pz = nz; py = ny; }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, L = 2.6 + (i % 3) * 0.4, mx = px + Math.cos(a) * L * 0.55, mz = pz + Math.sin(a) * L * 0.55;
    k.beam([px, py, pz], [mx, py + 0.6, mz], 0.5, i % 2 ? '#4f6a34' : '#5d7a3a', {}, 0.06);
    k.beam([mx, py + 0.6, mz], [px + Math.cos(a) * L, py - 0.9, pz + Math.sin(a) * L], 0.42, i % 2 ? '#4a6230' : '#58723a', {}, 0.05); }
  k.blob(px, py - 0.1, pz, 0.45, 0.4, 0.45, '#6a5a3a');
}
// felt US-style flag on a pole (stripes as boxes)
function flag(k, x, z, h, w = 1.6) {
  k.cyl(x, 0, z, 0.06, h, '#d8d4cc', { seg: 6 }); k.blob(x, h + 0.05, z, 0.1, 0.1, 0.1, '#d9b24a');
  const fh = w * 0.55; for (let i = 0; i < 7; i++) k.box(x + 0.05 + w / 2, h - 0.15 - fh + i * fh / 7, z, w, fh / 7, 0.03, i % 2 ? '#f2eee6' : '#b8322e');
  k.box(x + 0.05 + w * 0.2, h - 0.15 - fh * 0.45, z + 0.01, w * 0.4, fh * 0.45, 0.04, '#2a3560');
}
// a tall drink with a paper cocktail umbrella (felt) standing at (x, y, z)
export function umbrellaCup(k, x, y, z, c = '#ff6fae', drink = '#f2a23a') {
  k.cyl(x, y, z, 0.055, 0.16, '#f4f0e6', { rt: 0.07, seg: 7 }); k.cyl(x, y + 0.02, z, 0.05, 0.12, drink, { rt: 0.064, seg: 7 }); k.box(x, y + 0.05, z, 0.13, 0.02, 0.13, '#c8302e', { ry: 0.4 });
  k.beam([x + 0.02, y + 0.1, z], [x + 0.06, y + 0.3, z + 0.02], 0.012, '#e8dcc0'); k.cyl(x + 0.06, y + 0.29, z + 0.02, 0.13, 0.05, c, { rt: 0.008, seg: 8, rz: 0.35 });
  k.beam([x - 0.02, y + 0.1, z], [x - 0.05, y + 0.26, z - 0.01], 0.012, '#5ec8d6');
}
function tableSet(k, x, z, c = '#c8c4bc', seat = '#b8322e') {
  k.cyl(x, 0, z, 0.06, 0.72, '#4a4a4a', { seg: 6 }); k.cyl(x, 0.72, z, 0.42, 0.05, c, { seg: 12 });
  umbrellaCup(k, x + 0.14, 0.77, z + 0.06, ['#ff6fae', '#5ec8d6', '#f6d24a'][Math.abs(Math.round(x * 3)) % 3]);
  for (const s of [-1, 1]) { k.box(x + s * 0.7, 0, z, 0.42, 0.45, 0.42, seat); k.box(x + s * 0.88, 0.45, z, 0.06, 0.45, 0.42, seat); }
}

// ================================================================= M2 builders
export function buildCommercial(TS, place) {
  buildMainNorth(place); buildYard(place); buildStore(place); buildStrip(TS, place);
}

function buildMainNorth(place) {
  // ---------------------------------------------------------------- THE DINER (x -31.5..-15): curved red fascia, wraparound lit glass, rooftop neon
  place('diner', -23.25, -1.5, 0, (k) => {
    const P = PALC.diner, X = 7.05, FZ = -3.0, R = 1.2, CZ = FZ - R;
    k.aab(-8.25, 0, -16, 8.25, 3.5, CZ, P.header, { lod: true }); k.aab(-8.25, 0, -16, 8.25, 1.0, CZ + 0.02, P.base); k.solid(-8.25, -16, 8.25, FZ, 4);
    k.aab(-8.4, 3.5, -16.2, 8.4, 3.8, CZ, P.fasciaDk, { lod: true });
    // the curved front: base / glass band / cream header / red fascia, with round ends
    const band = (y0, h, c, o = {}) => { k.aab(-X, y0, CZ, X, y0 + h, FZ + (o.out || 0), c, o); for (const s of [-1, 1]) k.cyl(s * X, y0, CZ, R + (o.out || 0), h, c, { seg: 16, ...o }); };
    band(0, 1.0, P.base, { lod: true, pat: 'panel', ps: 0.5 }); band(1.0, 0.06, P.neon, { glow: true, out: 0.04 }); band(1.06, 1.5, P.glass, { glow: true }); band(2.56, 0.45, P.header, { lod: true });
    band(2.72, 0.07, P.neon, { glow: true, out: 0.05 });
    // M6: deep red roof band (wraps the front, both curves and the sides) with a dark lip, warm-lit soffit and a neon edge — diner_01.jpg
    k.aab(-X, 2.95, CZ, X, 3.85, FZ + 0.8, P.fascia, { lod: true }); for (const s of [-1, 1]) k.cyl(s * X, 2.95, CZ, R + 0.8, 0.9, P.fascia, { seg: 18 });
    for (const s of [-1, 1]) { k.aab(s * 8.25, 2.95, -16.2, s * 9.05, 3.85, CZ, P.fascia, { lod: true }); k.aab(s * 8.25, 2.88, -16.1, s * 9.0, 2.95, CZ, '#ffc27a', { glow: true }); }
    k.aab(-X - 0.2, 3.85, CZ, X + 0.2, 3.95, FZ + 0.85, P.fasciaDk); for (const s of [-1, 1]) k.cyl(s * X, 3.85, CZ, R + 0.85, 0.1, P.fasciaDk, { seg: 18 });
    k.aab(-X, 2.88, FZ, X, 2.95, FZ + 0.78, '#ffc27a', { glow: true }); for (const s of [-1, 1]) k.cyl(s * X, 2.88, CZ, R + 0.78, 0.07, '#ffc27a', { seg: 18, glow: true });
    k.aab(-X, 2.93, FZ + 0.74, X, 3.0, FZ + 0.8, P.neon, { glow: true });
    // wraparound glass continues down both sides, with the neon strip under it and mullions
    for (const s of [-1, 1]) { const x = s * 8.25, zA = CZ, zB = -12.5;
      k.aab(x, 0, zB, x + s * 0.02, 1.0, zA, P.base, { pat: 'panel', ps: 0.5 }); k.aab(x, 1.0, zB, x + s * 0.06, 1.08, zA, P.neon, { glow: true });
      k.aab(x, 1.08, zB, x + s * 0.03, 2.56, zA, P.glass, { glow: true }); k.aab(x, 2.56, zB, x + s * 0.03, 2.88, zA, P.header);
      for (let z = zA - 0.6; z > zB; z -= 1.2) k.box(x + s * 0.05, 1.08, z, 0.06, 1.48, 0.08, P.mull); }
    // mullions round the glass (straight run + the two curves)
    for (let x = -X + 0.6; x < X; x += 1.2) if (Math.abs(x - 0.25) > 0.8) k.box(x, 1.06, FZ + 0.04, 0.08, 1.5, 0.06, P.mull);
    for (const s of [-1, 1]) for (let i = 1; i < 4; i++) { const a = i / 4 * Math.PI / 2; k.box(s * (X + Math.sin(a) * (R + 0.03)), 1.06, CZ + Math.cos(a) * (R + 0.03), 0.08, 1.5, 0.08, P.mull, { ry: s * a }); }
    // door: stainless frame + glass
    k.aab(-0.35, 0, FZ, 0.85, 2.3, FZ + 0.08, P.steel); k.aab(-0.25, 0.05, FZ + 0.05, 0.75, 2.2, FZ + 0.1, '#f0c890', { glow: true }); k.box(0.65, 1.0, FZ + 0.14, 0.05, 0.4, 0.05, '#e8e8e8');
    k.mark('door_diner', 0.25, 0.5);
    sign(k, 'OPEN 24 HRS', -4.6, 2.2, FZ + 0.12, 1.6, 0.36, { fg: '#ff4a6a', glow: true });
    // rooftop sign: two neon rows on a red board on steel legs
    k.aab(-5.5, 3.95, -6.6, 2.5, 8.9, -6.3, P.signBg); k.aab(-5.65, 3.95, -6.65, 2.65, 4.1, -6.25, P.fasciaDk);
    k.cyl(2.5, 6.42, -6.6, 2.47, 0.28, P.signBg, { rx: Math.PI / 2, seg: 16 }); // rounded right end like the ref board
    for (const [a, b] of [[[-5.5, 8.9], [2.5, 8.9]], [[-5.5, 3.98], [2.5, 3.98]], [[-5.5, 3.98], [-5.5, 8.9]]]) k.beam([a[0], a[1], -6.22], [b[0], b[1], -6.22], 0.1, P.neon, { glow: true });
    for (const x of [-4.6, 1.6]) k.beam([x, 3.6, -8.8], [x, 6.5, -6.6], 0.14, '#3a3a3a');
    sign(k, 'SUNSPOT', -1.5, 7.65, -6.24, 7.6, 1.9, { fg: P.signFg, stroke: P.signStroke, glow: true, fit: 0.9, family: '"Arial Black", Impact, Futura, sans-serif' });
    sign(k, 'DINER', -1.5, 5.25, -6.24, 6.4, 2.2, { fg: P.signFg, stroke: P.signStroke, glow: true, fit: 0.92, family: '"Arial Black", Impact, Futura, sans-serif' });
    // patio
    for (const x of [-6.2, -3.2, 3.6, 6.4]) tableSet(k, x, -1.4, P.steel, P.fascia);
    // M6: more sidewalk bistro tables (round tops, dark metal chairs) along the front and round both sides, as in diner_01.jpg
    const bistro = (x, z, n = 2) => { k.cyl(x, 0, z, 0.05, 0.74, '#2e2a28', { seg: 5 }); k.cyl(x, 0.72, z, 0.38, 0.04, '#5a4a40', { seg: 10 });
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.4, cx = x + Math.cos(a) * 0.62, cz = z + Math.sin(a) * 0.62;
        k.box(cx, 0, cz, 0.36, 0.46, 0.36, '#2e2a28', { ry: -a }); k.box(cx + Math.cos(a) * 0.17, 0.46, cz + Math.sin(a) * 0.17, 0.05, 0.42, 0.36, '#2e2a28', { ry: -a }); } };
    for (const x of [-4.7, 5.0]) bistro(x, -0.6, 3);
    for (const s of [-1, 1]) for (const z of [-5.0, -7.6, -10.2]) bistro(s * 10.0, z, 2);
  }, { foot: [14, 12] });

  // ---------------------------------------------------------------- LAUNDROMAT under brick apartments (x -12..6)
  place('laundromat', -3, -1.5, 0, (k) => {
    const P = PALC.laundry, H = 14.3;
    k.aab(-9, 0, -16, 9, H, -0.02, P.brick, { lod: true, pat: 'brick', ps: 0.085 }); k.solid(-9, -16, 9, 0, H);
    for (const x of [-9, -4.4, 0, 4.4, 9]) k.aab(x - 0.3, 4.4, 0, x + 0.3, H, 0.16, P.brickDk, { pat: 'brick', ps: 0.085 });
    for (let f = 0; f < 3; f++) { const y = 4.4 + f * 3.3; k.aab(-9.1, y - 0.12, 0, 9.1, y + 0.08, 0.2, P.stone);
      for (const x of [-6.6, -2.2, 2.2, 6.6]) { k.window(x, y + 0.85, 0.02, 1.3, 1.95, { frame: P.frame, glass: '#3a3a3c', mull: [0, 1], sill: P.stone, blind: f === 1 && x > 0 ? 0.3 : 0, blindCol: '#e6dccb' });
        k.box(x, y + 2.95, 0.12, 1.75, 0.22, 0.18, P.stone); k.box(x, y + 2.9, 0.2, 0.32, 0.36, 0.12, P.cream); } }
    k.box(-2.2, 7.85, 0.2, 0.8, 0.5, 0.5, '#d8d8d0'); // window AC unit
    // cornice + dentils
    k.aab(-9.2, H, -0.1, 9.2, H + 0.5, 0.55, '#c8a888', { lod: true }); k.aab(-9.35, H + 0.45, -0.1, 9.35, H + 0.75, 0.75, '#b89878');
    for (let x = -9; x <= 9; x += 0.45) k.box(x, H - 0.22, 0.42, 0.2, 0.22, 0.18, '#c8a888');
    // storefront: maroon pilasters, fascia with gold rules, base
    k.aab(-9, 0, 0, 9, 0.8, 0.22, P.trimDk); k.aab(-9, 3.3, 0, 9, 4.4, 0.3, P.trim); k.aab(-9, 3.33, 0.3, 9, 3.4, 0.33, P.gold); k.aab(-9, 4.26, 0.3, 9, 4.33, 0.33, P.gold);
    for (const [a, b] of [[-9, -8.4], [-3.3, -2.7], [5.4, 5.9], [8.4, 9]]) k.aab(a, 0, 0, b, 3.3, 0.28, P.trim);
    // see-in windows: interior back wall, floor, a row of washers, mullions (no pane)
    k.aab(-8.4, 0.8, -2.2, 5.4, 3.3, -2.0, P.tile); k.aab(-8.4, 0.75, -2.2, 5.4, 0.8, 0, '#e8e2cf'); k.aab(-8.4, 3.2, -2.2, 5.4, 3.3, 0, '#f6f2e6', { glow: true });
    for (let x = -7.7; x < 5; x += 0.95) { k.box(x, 0.8, -1.55, 0.82, 0.88, 0.7, P.washer); k.cyl(x, 1.2, -1.2, 0.27, 0.04, '#9aa0a4', { rx: Math.PI / 2, seg: 12 }); k.cyl(x, 1.2, -1.17, 0.2, 0.04, '#3e4448', { rx: Math.PI / 2, seg: 12 }); }
    for (let x = -8.4; x <= 5.4; x += 1.15) k.box(x, 0.8, 0.12, 0.08, 2.5, 0.08, P.frame);
    k.aab(-8.4, 2.55, 0.08, 5.4, 2.63, 0.16, P.frame);
    sign(k, 'LAUNDRY', -5.9, 3.85, 0.32, 4.6, 0.8, { bg: P.trim, fg: P.cream, border: P.cream, family: SERIF, fit: 0.66 });
    // striped awnings (red / cream / navy)
    const awn = (x0, x1) => { const cols = [P.awnR, P.awnW, P.awnB, P.awnW]; let i = 0;
      for (let x = x0; x < x1 - 0.01; x += 0.36, i++) { const w = Math.min(0.36, x1 - x); k.beam([x + w / 2, 3.25, 0.25], [x + w / 2, 2.55, 1.7], w, cols[i % 4], {}, 0.05); k.box(x + w / 2, 2.25, 1.7, w, 0.32, 0.04, cols[i % 4]); } };
    awn(-2.6, 5.3); awn(-8.3, -3.4);
    // door (right) with the "Open" neon
    k.door(6.65, 0, 0.02, 1.1, 2.4, P.trim, { frame: P.trimDk, lite: '#2a3a3a' }); sign(k, 'Open', 6.65, 1.95, 0.14, 0.8, 0.36, { fg: '#ff4a5a', glow: true, family: SCRIPT });
    k.mark('door_laundromat', 6.65, 0.5);
    // blade roundel: invented "Sun-Cola" laundry sign on an iron bracket
    k.beam([-8.6, 6.4, 0.1], [-8.6, 6.4, 2.0], 0.08, '#2a2222'); k.beam([-8.6, 5.4, 0.1], [-8.6, 6.4, 1.6], 0.06, '#2a2222');
    k.cyl(-8.6, 5.4, 1.25, 1.02, 0.14, P.roundBlue, { rz: Math.PI / 2, seg: 20 }); k.cyl(-8.6, 5.4, 1.25, 0.9, 0.18, P.round, { rz: Math.PI / 2, seg: 20 });
    for (const s of [-1, 1]) sign(k, 'DRINK\nSun-Cola\nLAUNDRY', s > 0 ? -8.55 : -8.83, 5.4, 1.25, 1.55, 1.55, { fg: '#b8322e', family: SCRIPT, fit: 0.8, ry: s * Math.PI / 2, far: true });
    flag(k, -9.4, 0.6, 5.2, 1.3);
    // fire escape (red iron) up the right bay
    for (let f = 0; f < 3; f++) { const y = 4.4 + f * 3.3 + 0.1; k.aab(5.2, y, 0.05, 8.8, y + 0.08, 1.2, P.escape); k.rail([[5.2, 1.2, y], [8.8, 1.2, y]], 0.95, P.escape, { bal: 0.25 });
      k.beam([5.6, y + 0.05, 1.0], [8.2, y + 3.35, 1.0], 0.07, P.escape); }
  }, { foot: [14, 14] });

  // ---------------------------------------------------------------- POST OFFICE (x 10..28): 1930s red brick, limestone, steps, arched windows, cupola, flag
  place('post', 19, -1.5, 0, (k) => {
    const P = PALC.post, FZ = -4;
    k.aab(-9, 0, -20, 9, 7, FZ, P.brick, { lod: true, pat: 'brick', ps: 0.085 }); k.solid(-9, -20, 9, FZ, 7);
    k.aab(-9.1, 0, FZ, 9.1, 1.0, FZ + 0.15, P.stone, { pat: 'block', ps: 0.35 }); k.aab(-9.2, 6.0, FZ, 9.2, 7.0, FZ + 0.3, P.stone, { lod: true }); k.aab(-9.3, 7.0, FZ - 0.2, 9.3, 7.25, FZ + 0.42, P.stone);
    for (let x = -8.8; x <= 8.8; x += 0.55) k.box(x, 7.25, FZ + 0.1, 0.18, 0.6, 0.18, P.stone); k.aab(-9.3, 7.85, FZ - 0.1, 9.3, 8.0, FZ + 0.3, P.stone);
    sign(k, 'SUNSPOTS · POST OFFICE', 0, 6.5, FZ + 0.32, 13, 0.6, { fg: '#4a4038', family: SERIF, fit: 0.8, far: true });
    for (const x of [-7.2, -4.2, 4.2, 7.2]) { k.window(x, 1.7, FZ, 1.5, 3.0, { frame: '#f2eee6', glass: P.glass, mull: [2, 4], sill: P.stone });
      const ar = [[-0.84, 0]]; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; ar.push([Math.cos(a) * 0.84, Math.sin(a) * 0.84]); } k.ext(ar, FZ + 0.02, 0.06, P.glass, { at: [x, 4.75, 0] });
      k.box(x, 5.45, FZ + 0.1, 0.36, 0.4, 0.14, P.stone); }
    // entrance: stone surround, bronze doors, transom, steps, globe lamps
    k.aab(-1.8, 1.0, FZ, 1.8, 5.0, FZ + 0.25, P.stone); k.aab(-1.2, 1.0, FZ + 0.1, 1.2, 3.5, FZ + 0.3, P.bronze); k.box(0, 1.0, FZ + 0.31, 0.04, 2.5, 0.03, '#2a2018');
    k.aab(-1.2, 3.6, FZ + 0.1, 1.2, 4.6, FZ + 0.3, P.glass); k.box(0, 4.0, FZ + 0.32, 0.5, 0.5, 0.03, '#c9a04a');
    k.steps(0, -1.8, 4.2, 1.0, 5, P.stone, { tread: 0.44 });
    for (const s of [-1, 1]) { k.cyl(s * 2.5, 0, -1.9, 0.08, 2.6, '#2a2a2a', { seg: 6 }); k.blob(s * 2.5, 2.8, -1.9, 0.26, 0.26, 0.26, '#fff4d8', { glow: true }); }
    k.mark('door_post', 0, 0.5);
    // lawn + hedges, flag, cupola, mailbox at the curb
    for (const s of [-1, 1]) { k.aab(s * 2.3, 0, FZ, s * 9, 0.08, -0.05, P.lawn); k.aab(s * 2.6, 0, -0.9, s * 8.8, 0.7, -0.3, P.hedge); }
    flag(k, -6.2, -2.6, 10, 2.0);
    k.aab(-1.2, 7, -12.2, 1.2, 9.0, -9.8, '#f2eee6'); k.cyl(0, 9.0, -11, 1.25, 1.6, '#3f6a5a', { rt: 0.05, seg: 4, ry: Math.PI / 4 });
    k.aab(6.2, 0, 1.6, 6.8, 0.9, 2.2, P.box); k.cyl(6.5, 0.9, 1.9, 0.3, 0.6, P.box, { rz: Math.PI / 2, seg: 10, sz: 1 });
  }, { foot: [14, 14] });

  // ---------------------------------------------------------------- DMV (x -72..-50): 1960s precast fins, ribbon glass, flat slab roof
  place('dmv', -61, -1.5, 0, (k) => {
    const P = PALC.dmv, FZ = -3;
    k.aab(-11, 0, -22, 11, 4.4, FZ, P.wall, { lod: true, pat: 'block', ps: 0.2 }); k.solid(-11, -22, 11, FZ, 4.4);
    k.aab(-11.6, 4.4, -22.6, 11.6, 4.95, FZ + 0.8, P.roof, { lod: true });
    k.aab(-11, 0.9, FZ - 0.02, 11, 3.9, FZ + 0.02, P.glass); k.aab(-11, 0, FZ, 11, 0.9, FZ + 0.05, P.sage); k.aab(-11, 3.9, FZ, 11, 4.4, FZ + 0.05, P.sage);
    for (let x = -10.5; x <= 10.6; x += 1.1) if (Math.abs(x) > 1.8) k.box(x, 0, FZ + 0.35, 0.22, 4.4, 0.7, P.fin);
    k.aab(-3, 3.3, FZ, 3, 3.55, -0.3, P.roof); for (const s of [-1, 1]) k.cyl(s * 2.6, 0, -0.6, 0.06, 3.3, P.steel, { seg: 6 });
    k.aab(-1.4, 0, FZ + 0.03, 1.4, 2.5, FZ + 0.06, '#5a6a6a'); k.box(0, 0, FZ + 0.07, 0.06, 2.5, 0.03, '#c8c8c0');
    sign(k, 'DEPARTMENT OF MOTOR VEHICLES', 0, 4.68, FZ + 0.82, 15, 0.42, { fg: P.letters, fit: 0.85, far: true });
    k.mark('door_dmv', 0, 0.5);
    k.aab(5.8, 0, -1.6, 8.6, 1.1, -0.9, P.block); sign(k, 'DMV\nTAKE A NUMBER', 7.2, 0.6, -0.88, 2.6, 0.8, { bg: '#efe9dc', fg: '#3e4a3a', fit: 0.8 });
    for (const x of [-9.5, -6, 4, 9.5]) { k.aab(x - 1.2, 0, -2.6, x + 1.2, 0.5, -1.4, P.block); k.blob(x, 0.6, -2.0, 1.1, 0.35, 0.5, '#5a7a3a'); }
    flag(k, -8, -0.8, 8.5, 1.6);
  }, { foot: [14, 14] });

  // ---------------------------------------------------------------- SECOND SUN THRIFT (x -90..-75): 1920s two-storey false front, ghost sign, striped awning
  place('thrift', -82.5, -1.5, 0, (k) => {
    const P = PALC.thrift;
    k.ext([[-7.5, 0], [7.5, 0], [7.5, 7.6], [3, 7.6], [3, 8.3], [-3, 8.3], [-3, 7.6], [-7.5, 7.6]], -0.3, 0.3, P.wall, { lod: true, pat: 'stucco' });
    k.aab(-7.5, 0, -18, 7.5, 7.4, -0.3, P.wall, { lod: true, pat: 'stucco' }); k.solid(-7.5, -18, 7.5, 0, 7.4);
    k.aab(-7.6, 7.45, -0.1, 7.6, 7.7, 0.15, P.trim); k.aab(-3.1, 8.2, -0.1, 3.1, 8.45, 0.15, P.trim); k.aab(-7.6, 3.65, 0, 7.6, 3.85, 0.18, P.trim);
    sign(k, 'SECOND SUN THRIFT', 0, 6.5, 0.02, 12, 1.25, { fg: P.ghost, family: SERIF, fit: 0.7, far: true });
    for (const x of [-4.5, 0, 4.5]) k.window(x, 4.3, 0, 1.2, 1.6, { frame: '#f6f0e2', glass: '#3a3a3c', mull: [0, 1], sill: P.trim });
    // display windows with stuff inside
    k.aab(-7, 0.6, -1.4, 7, 3.0, -1.2, P.back); k.aab(-7, 0, -1.4, 7, 0.6, 0.1, P.trim);
    for (const x of [-7.2, -1.15, 1.15, 7.2]) k.box(x, 0.6, 0.05, 0.25, 3.0, 0.2, P.trim); k.aab(-7, 2.95, 0, 7, 3.6, 0.1, '#e8dcc0');
    for (let x = -6.6; x < 7; x += 0.7) k.box(x, 2.95, 0.12, 0.05, 0.65, 0.04, P.trim);
    k.cyl(-5.2, 0.6, -0.8, 0.22, 1.1, '#e8c8b0', { seg: 8 }); k.blob(-5.2, 2.0, -0.8, 0.18, 0.22, 0.18, '#e8c8b0'); k.cyl(-5.2, 1.0, -0.8, 0.32, 0.9, '#3f6a8a', { rt: 0.22, seg: 8 });
    k.cyl(-3.4, 0.6, -0.8, 0.05, 1.2, '#c9a04a', { seg: 6 }); k.cyl(-3.4, 1.8, -0.8, 0.34, 0.4, '#f0d890', { rt: 0.18, seg: 8 });
    for (let i = 0; i < 3; i++) k.box(3.5, 0.6 + i * 0.32, -0.8, 1.1 - i * 0.15, 0.3, 0.55, ['#8a3a2a', '#3a5a4a', '#c9a04a'][i]);
    k.box(5.5, 0.6, -0.8, 0.6, 0.5, 0.6, '#6a4a3a'); k.box(5.5, 1.1, -1.05, 0.6, 0.7, 0.08, '#6a4a3a');
    k.door(0, 0, -0.6, 1.1, 2.6, P.door, { frame: P.trim, lite: '#3a3a3a' }); k.mark('door_thrift', 0, 0.5);
    { const cols = [P.awnO, P.awnW]; let i = 0; for (let x = -7.3; x < 7.29; x += 0.5, i++) { k.beam([x + 0.25, 3.6, 0.15], [x + 0.25, 3.0, 1.5], 0.5, cols[i % 2], {}, 0.05); k.box(x + 0.25, 2.75, 1.5, 0.5, 0.28, 0.04, cols[i % 2]); } }
    // clothes rack + sandwich board on the sidewalk
    k.beam([-6.4, 1.5, 0.9], [-4.0, 1.5, 0.9], 0.04, '#9a9a9a'); for (const x of [-6.4, -4]) k.box(x, 0, 0.9, 0.04, 1.5, 0.04, '#9a9a9a');
    ['#c8463f', '#3f6a8a', '#e8c86a', '#7a5a8a', '#4a7a4a', '#d88a5a'].forEach((c, i) => k.box(-6.1 + i * 0.42, 0.55, 0.9, 0.3, 0.9, 0.4, c));
    k.box(3.2, 0, 1.0, 0.7, 1.0, 0.06, '#3a2a22', { rx: 0.2 }); sign(k, 'OPEN\nbuy · sell', 3.2, 0.6, 1.12, 0.6, 0.6, { bg: '#2e2622', fg: '#f2e6c8', fit: 0.6 });
  }, { foot: [13, 14] });

  // ---------------------------------------------------------------- KSUN RADIO & CH.2 (x -133..-117): streamline moderne + lattice mast
  place('ksun', -125, -1.5, 0, (k) => {
    const P = PALC.ksun, FZ = -3, H = 6.4;
    k.aab(-5, 0, -16, 8, H, FZ, P.wall, { lod: true, pat: 'stucco' }); k.aab(-8, 0, -16, -5, H, -6, P.wall, { lod: true, pat: 'stucco' }); k.cyl(-5, 0, -6, 3, H, P.wall, { seg: 20, lod: true }); k.solid(-8, -16, 8, FZ, H);
    for (const y of [4.6, 5.0, 5.4]) { k.aab(-5, y, FZ, 8, y + 0.12, FZ + 0.08, P.trim); k.cyl(-5, y, -6, 3.06, 0.12, P.trim, { seg: 20 }); }
    k.aab(-8.1, H, -16.1, 8.1, H + 0.25, FZ + 0.1, P.trim); k.cyl(-5, H, -6, 3.1, 0.25, P.trim, { seg: 20 });
    k.window(-2.2, 0.9, FZ, 2.4, 3.4, { frame: P.wall, glass: P.block, mull: [7, 10], mullCol: '#eef0ea', ft: 0.05 });
    k.window(5.2, 1.2, FZ, 4.2, 1.5, { frame: P.trim, glass: '#2e3640', mull: [3, 0] });
    k.door(1.8, 0, FZ, 1.2, 2.4, '#5a4a8a', { frame: '#e8e2f0', lite: '#2e3640' }); k.mark('door_ksun', 1.8, 0.5);
    k.aab(0.4, 2.9, FZ, 3.2, 3.1, -1.6, P.trim); k.cyl(1.8, 2.9, -1.6, 1.4, 0.2, P.trim, { seg: 16 });
    k.box(1.8, 3.3, FZ + 0.05, 1.6, 0.42, 0.1, '#3a1a22'); sign(k, 'ON AIR', 1.8, 3.51, FZ + 0.11, 1.4, 0.36, { fg: '#ff3a4a', glow: true });
    sign(k, 'RADIO · CH. 2', -3.5, 6.0, FZ + 0.09, 3.0, 0.32, { fg: P.trim, family: SERIF, fit: 0.8 });
    // the roof fin: K S U N stacked in neon
    k.aab(5.4, H, -3.6, 6.9, H + 6.2, -3.2, P.trim); for (let i = 0; i < 4; i++) sign(k, 'KSUN'[i], 6.15, H + 5.4 - i * 1.45, -3.18, 1.2, 1.3, { fg: P.neon, glow: true, fit: 0.95, family: '"Arial Black", Impact, sans-serif' });
    // lattice mast behind (red / white bands), beacons, three guy wires
    const mx = -2, mz = -11, MH = 36, r = 0.85, legs = [0, 1, 2].map(i => [mx + Math.cos(i * 2.094) * r, mz + Math.sin(i * 2.094) * r]);
    for (let s = 0; s < MH; s += 3) { const c = Math.floor(s / 6) % 2 ? P.mastW : P.mastR;
      for (let i = 0; i < 3; i++) { const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 3]; k.beam([ax, s, az], [ax, s + 3, az], 0.12, c); k.beam([ax, s, az], [bx, s + 3, bz], 0.05, c); k.beam([ax, s + 3, az], [bx, s + 3, bz], 0.05, c); } }
    k.blob(mx, MH + 0.3, mz, 0.3, 0.3, 0.3, '#ff2a2a', { glow: true }); k.blob(mx + 0.9, MH / 2, mz, 0.22, 0.22, 0.22, '#ff2a2a', { glow: true });
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; k.beam([mx, MH * 0.75, mz], [mx + Math.cos(a) * 14, 0, mz + Math.sin(a) * 9], 0.03, '#6a6a6a'); }
  }, { foot: [14, 14], lodNear: 90 });
}

// ---------------------------------------------------------------- CROW'S YARD (Main St south, x -95..-78): janky tin fence, gate, junk, shack
function buildYard(place) {
  place('yard', -86.5, 15.7, Math.PI, (k) => {
    const P = PALC.yard; let i = 0;
    const tin = (x0, x1, z0, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.2), ry = Math.atan2(-(z1 - z0), x1 - x0);
      for (let j = 0; j < n; j++, i++) { const t = (j + 0.5) / n, h = 2.2 + ((i * 37) % 5) * 0.1; k.box(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, L / n + 0.04, h, 0.06, P.tin[(i * 7) % 5], { ry, rz: ((i * 13) % 5 - 2) * 0.015 }); } };
    tin(-8.5, -2.1, 0, 0); tin(2.1, 8.5, 0, 0); tin(-8.5, -8.5, 0, -20); tin(8.5, 8.5, 0, -20); tin(-8.5, 8.5, -20, -20);
    k.solid(-8.5, -0.15, -2.1, 0.15, 2.4); k.solid(2.1, -0.15, 8.5, 0.15, 2.4); k.solid(-8.65, -20, -8.35, 0, 2.4); k.solid(8.35, -20, 8.65, 0, 2.4); k.solid(-8.5, -20.15, 8.5, -19.85, 2.4);
    for (const x of [-2.1, 2.1]) k.box(x, 0, 0, 0.22, 3.4, 0.22, P.post);
    k.box(0, 3.0, 0.05, 4.6, 0.95, 0.12, '#6a5444', { rz: 0.03 }); sign(k, "CROW'S YARD\nwe buy · we sell · we stare", 0, 3.48, 0.13, 4.4, 0.85, { bg: P.board, fg: '#3a1f2a', family: SERIF, fit: 0.78 });
    k.box(-1.6, 0, -0.6, 1.4, 1.8, 0.05, '#8a8a82', { ry: -1.0 }); // chain-link gate wing swung open (flat felt)
    k.mark('door_yard', 0, 0.7);
    // shack office
    k.aab(4.5, 0, -8, 8.2, 2.6, -3, P.shack); k.solid(4.5, -8, 8.2, -3, 2.6); k.box(6.35, 2.6, -5.5, 4.4, 0.08, 5.8, '#8a8a82', { rz: 0.1 });
    k.door(4.45, 0, -5.4, 0.9, 2.0, '#6a5a4a', { frame: '#5a4a3a' }); k.window(5.8, 1.1, -3, 1.0, 0.8, { frame: '#5a4a3a', glass: '#3a3a3a' });
    // junk: tyre stacks, a rusted car body, scrap heaps, a dead fridge
    for (const [x, z, n] of [[-6.5, -3, 4], [-5.4, -3.6, 2], [6.8, -12, 5], [-4, -16, 3]]) for (let j = 0; j < n; j++) k.cyl(x, j * 0.26, z, 0.42, 0.25, P.tire, { seg: 10 });
    k.aab(-7.5, 0.3, -12.2, -3.3, 1.1, -10.3, P.rust); k.aab(-6.6, 1.1, -12.0, -4.6, 1.7, -10.5, '#7a4030'); for (const [x, z] of [[-7, -12.2], [-3.8, -12.2], [-7, -10.3], [-3.8, -10.3]]) k.cyl(x, 0.35, z, 0.32, 0.18, P.tire, { rx: Math.PI / 2, seg: 8 });
    for (const [x, z, s] of [[3.5, -15, 1.4], [-1, -18, 1.1], [6.5, -17.5, 1.2]]) { k.blob(x, 0.2, z, s, s * 0.6, s, '#6e6a62'); k.blob(x + 0.5, 0.4, z + 0.3, s * 0.6, s * 0.5, s * 0.6, P.rust); }
    k.box(-6.8, 0, -7.5, 0.8, 1.7, 0.7, '#ece8de', { ry: 0.3, rz: 0.06 });
  }, { foot: [14, 14] });
}

// ---------------------------------------------------------------- the CONVENIENCE STORE, EXACT (desert road end; door = scenes.js store anchor 90,-1011.5)
// Ref scale: 0.0134 m/px, origin at the door's bottom centre (px 545, 425).
function buildStore(place) {
  place('store', 90, -1011.5, 0, (k) => {
    const P = PALC.store, s = 0.0134, X = (px) => (px - 545) * s, Y = (py) => (425 - py) * s;
    k.ext([[X(130), -0.3], [X(810), -0.3], [X(810), Y(92)], [X(320), Y(48)], [X(130), Y(70)]], -8, 8, P.wall, { lod: true, pat: 'stucco', ps: 0.42 });
    // ghost sign + scuffs
    k.aab(X(230), Y(130), 0, X(390), Y(126), 0.02, P.stain); k.aab(X(230), Y(88), 0, X(390), Y(84), 0.02, P.stain); k.aab(X(228), Y(130), 0, X(232), Y(84), 0.02, P.stain); k.aab(X(388), Y(130), 0, X(392), Y(84), 0.02, P.stain);
    for (const [px, py, w, h] of [[330, 210, 6, 30], [455, 400, 30, 8], [610, 445, 40, 10], [200, 300, 3, 40], [780, 300, 3, 30]]) k.aab(X(px), Y(py + h), 0, X(px + w), Y(py), 0.015, P.stain);
    // boarded window panels: thin raised outline, white ledge on top, red sill, vent slot
    for (const [x0, x1, y0, y1, sy, v] of [[195, 425, 228, 372, 372, 300], [640, 780, 228, 368, 365, 702]]) {
      for (const [a, b, c, d] of [[x0, y0, x1, y0 + 4], [x0, y1 - 4, x1, y1], [x0, y0, x0 + 4, y1], [x1 - 4, y0, x1, y1]]) k.aab(X(a), Y(d), 0, X(c), Y(b), 0.03, P.stain);
      k.aab(X(x0 - 5), Y(y0 + 6), 0, X(x1 + 5), Y(y0), 0.12, P.ledge); k.aab(X(x0 + 3), Y(sy + 5), 0, X(x1 - 3), Y(sy - 2), 0.1, P.sill);
      k.aab(X(v), Y(262), 0, X(v + 20), Y(252), 0.04, '#2a2222'); }
    // the door: red frame round the opening (scenes.js hangs the swinging door), ledge + lamp above, address
    k.aab(X(495), 0, 0, X(505), Y(233), 0.1, P.dframe); k.aab(X(585), 0, 0, X(595), Y(233), 0.1, P.dframe); k.aab(X(495), Y(240), 0, X(595), Y(230), 0.1, P.dframe);
    k.aab(X(472), Y(212), 0, X(626), Y(205), 0.14, P.ledge); k.box(X(548), Y(225), 0.1, 0.14, 0.14, 0.12, P.iron);
    sign(k, '6\n5\n7', X(598), Y(265), 0.03, 0.14, 0.42, { fg: '#3a3030', fit: 0.95 });
    k.aab(X(490), 0, 0, X(655), 0.06, 1.2, P.steps);
    // iron gate bars + diagonal hand rails down the step
    for (const px of [487, 507, 630, 655]) k.box(X(px), 0, 0.1 + (px > 600 ? 0.3 : 0.15), 0.03, Y(222), 0.03, P.iron);
    for (const px of [487, 655]) k.beam([X(px), 1.05, 0.15], [X(px), 0.75, 1.15], 0.03, P.iron);
    // orange sign box, red diamond
    k.aab(X(192), Y(188), 0, X(228), Y(153), 0.08, P.sign); sign(k, 'ICE\nCOLD', X(210), Y(170), 0.085, 0.4, 0.36, { fg: '#fff3e0', fit: 0.8 });
    k.ext([[X(673), Y(157)], [X(711), Y(179)], [X(749), Y(157)], [X(711), Y(135)]], 0, 0.03, P.diamond);
    // picket fences: left (red) + right (red with white rails), the tall red plank fence far left
    k.pickets([X(100), 1.3], [X(450), 1.3], 1.1, P.picketR, { gap: 0.2, pw: 0.1, rails: [0.22, 0.8] });
    k.pickets([X(690), 1.3], [X(900), 1.3], 1.1, P.picketR, { gap: 0.2, pw: 0.1, rails: [0.22, 0.8], railCol: P.picketW });
    k.aab(X(0), 0, 1.4, X(95), 2.2, 1.5, P.plank); for (let px = 5; px < 95; px += 14) k.aab(X(px), 0, 1.5, X(px + 1), 2.2, 1.52, '#9a3634');
    // the cooler on the sidewalk, the pole behind
    k.box(X(690), 0, 3.0, 0.78, 0.4, 0.46, P.cooler); k.box(X(690), 0.4, 3.0, 0.8, 0.07, 0.48, P.coolerLid); k.box(X(690), 0.25, 3.25, 0.3, 0.05, 0.05, P.coolerLid);
    k.cyl(X(665), 0, -9.5, 0.16, 10.5, P.pole, { seg: 8 }); k.box(X(665), 9.4, -9.5, 2.4, 0.14, 0.14, P.pole);
  }, { foot: [10, 8], lodNear: 120 });
}

// ================================================================= the Neon Strip (z -61): Gutter Bowl, the Motel + Pool, the Eye-Max Drive-In, the Pool Hall, neon pylons
function buildStrip(TS, place) {
  // ---------------------------------------------------------------- GUTTER BOWL (x -45..-8), real size: 37 m frontage, 40 m deep
  place('bowl', -26.5, -70.5, 0, (k) => {
    const P = PALC.bowl, FZ = -5.5, H = 6.6;
    k.aab(-18.5, 0, -45, 18.5, H, FZ, P.wall, { lod: true, pat: 'stucco', ps: 0.7 }); k.aab(-18.6, H, -45.1, 18.6, H + 0.3, FZ + 0.1, P.cap, { lod: true }); k.solid(-18.5, -45, 18.5, FZ, H);
    // stepped zig-zag block relief (the ref's long tan wall)
    for (let r = 0; r < 8; r++) { const y = 0.9 + r * 0.66, ph = r % 6 < 3 ? r % 6 : 6 - r % 6;
      for (let x = -18 + ph * 0.9; x < -3; x += 5.4) k.box(x + 0.6, y, FZ + 0.06, 1.2, 0.36, 0.14, P.block); }
    for (let y = 1.0; y < H; y += 1.44) k.aab(-18.5, y, FZ, -3, y + 0.04, FZ + 0.03, P.wallSh);
    sign(k, 'Gutter Bowl', -12, 5.3, FZ + 0.2, 10, 1.9, { fg: P.script, family: SCRIPT, fit: 0.86, far: true });
    // the sprawling Googie canopy (ref: Sepulveda Bowl): a deep flat roof sweeping well past the entrance, cream soffit,
    // thick dark fascia with a row of light dots, V-shaped folded-plate fins at the west end and a fan of tall fins to the east
    const CX0 = -5.6, CX1 = 23.4, CZ = 1.6, CY = 4.1;
    k.aab(CX0, CY, FZ, CX1, CY + 0.06, CZ, P.band); k.aab(CX0, CY + 0.06, FZ, CX1, CY + 0.3, CZ - 0.2, P.canopy);
    k.aab(CX0 - 0.1, CY - 0.2, CZ - 0.22, CX1 + 0.1, CY + 0.95, CZ, P.canopy); k.aab(CX0 - 0.1, CY - 0.28, CZ - 0.22, CX1 + 0.1, CY - 0.2, CZ + 0.02, P.band);
    for (const x of [CX0 - 0.1, CX1 - 0.12]) k.aab(x, CY - 0.2, FZ, x + 0.22, CY + 0.95, CZ, P.canopy);
    for (let x = CX0 + 0.5; x < CX1 - 0.3; x += 0.85) k.cyl(x, CY + 0.37, CZ + 0.005, 0.13, 0.02, P.dot, { rx: Math.PI / 2, seg: 6 });
    for (let x = CX0 + 0.6; x < CX1; x += 3.2) k.aab(x, CY + 0.07, FZ + 0.2, x + 0.06, CY + 0.075, CZ - 0.3, '#ffe2a8', { glow: true });
    for (let x = 2.5; x < 17; x += 4.5) k.cyl(x, 0, CZ - 0.5, 0.07, CY, P.canopy, { seg: 6 });
    k.aab(-3, 0, FZ + 0.02, 10, 3.3, FZ + 0.06, P.glass); for (let x = -3; x <= 10; x += 1.3) k.box(x, 0, FZ + 0.08, 0.07, 3.3, 0.05, '#c8b8a0');
    k.aab(-1.3, 0, FZ + 0.06, 1.3, 2.4, FZ + 0.1, '#f2c88a', { glow: true }); k.mark('door_bowl', 0, 0.5);
    k.aab(10, 0, FZ, 17.6, 3.3, FZ + 0.3, P.stone, { pat: 'stone', ps: 0.4 }); for (let i = 0; i < 22; i++) k.box(10.4 + (i * 2.37) % 7, 0.2 + ((i * 1.31) % 2.9), FZ + 0.31, 0.5 + (i % 3) * 0.15, 0.28, 0.04, P.stone2);
    sign(k, 'Cocktail Bar', 4.0, 2.2, FZ + 0.12, 4.6, 1.0, { fg: P.band, family: SCRIPT, fit: 0.8 });
    // west end: two folded-plate V's standing in front of the fascia, dotted
    for (const vx of [-4.6, -1.6]) for (const s of [-1, 1]) {
      k.ext([[vx + s * 0.08, 0], [vx + s * 0.4, 0], [vx + s * 1.5, 6.6], [vx + s * 0.7, 6.6]], CZ + 0.05, 0.1, P.fin);
      for (let j = 0; j < 6; j++) { const t = (0.6 + j * 1.0) / 6.6; k.box(vx + s * (0.24 + t * 0.85), 0.6 + j * 1.0, CZ + 0.16, 0.13, 0.13, 0.03, P.dot); } }
    // east end: a fan of six tall leaning blades running front-to-back, stepping down to the east
    for (let i = 0; i < 6; i++) { const x = 17.9 + i * 1.1, top = 8.2 - i * 0.4;
      k.ext([[-(CZ - 0.5), 0], [-(CZ + 0.1), 0], [-(CZ + 1.0), top], [-(CZ - 1.5), top - 0.5]], 0, 0.12, P.fin, { ry: Math.PI / 2, at: [x, 0, 0] });
      for (let j = 0; j < 6; j++) k.box(x + 0.06, 0.7 + j * (top - 1.2) / 6, CZ - 0.2 + j * 0.12, 0.18, 0.13, 0.13, P.dot); }
    k.solid(17.8, CZ - 1.2, 23.6, CZ + 0.3, 6);
    // the sign tower: twin white poles, the tilted yellow trapezoid, two red discs
    for (const x of [-7.6, -6.4]) k.cyl(x, 0, -1.4, 0.18, 17, P.pole, { seg: 8 });
    k.frame(-7, 0, -1.2, 0.18, (f) => { f.ext([[-3.1, 0], [3.1, 0], [1.9, -5.4], [-1.9, -5.4]], -0.2, 0.25, P.signY, { at: [0, 18.8, 0] });
      f.ext([[-3.25, 0.12], [3.25, 0.12], [2.0, -5.5], [-2.0, -5.5], [-1.9, -5.4], [1.9, -5.4], [3.1, 0], [-3.1, 0]], -0.22, 0.29, P.signR, { at: [0, 18.8, 0] });
      sign(f, 'Gutter', 0, 17.8, 0.08, 4.4, 1.4, { fg: P.signR, family: SCRIPT, glow: true, fit: 0.9 }); sign(f, 'Bowl', 0, 15.6, 0.08, 3.6, 2.3, { fg: P.signR, family: SCRIPT, glow: true, fit: 0.95 });
      for (const [y, t] of [[12.2, 'COCKTAILS'], [10.6, 'COFFEE SHOP']]) { f.cyl(0, y, 0, 1.3, 0.18, P.disc, { rx: Math.PI / 2, seg: 18, sz: 0.5 }); sign(f, t, 0, y, 0.2, 2.0, 0.42, { fg: '#fff0d0', glow: true, fit: 0.8 }); } });
    k.solid(-7.9, -1.7, -6.1, -1.1, 17);
    palm(k, -3.6, -2.2, 9, 0.18, 0.4); palm(k, 18.2, -2.4, 7.5, 0.1, -0.6);
  }, { foot: [14, 14], lodNear: 110 });

  // ---------------------------------------------------------------- LEAVE-THE-LIGHT-ON MOTEL (x -98..-50) + THE MOTEL POOL
  place('motel', -74, -70.5, 0, (k) => {
    const P = PALC.motel;
    // office: pink box, stone panel, big glass, butterfly roof
    k.aab(-5, 0, -10, 5, 3.4, -1, P.wall, { lod: true, pat: 'stucco' }); k.solid(-5, -10, 5, -1, 3.6); k.aab(-5, 0, -1.2, -3, 3.4, -0.9, P.stone, { pat: 'stone', ps: 0.3 });
    k.aab(-2.8, 0.5, -1.03, 4.6, 3.0, -0.97, '#3a4a4e'); k.aab(-0.6, 0, -0.98, 0.6, 2.4, -0.92, '#f6d8a8', { glow: true }); k.mark('door_motel', 0, 0.5);
    for (const s of [-1, 1]) k.box(s * 2.75, 3.25, -5.5, 5.8, 0.22, 10.4, P.trim, { rz: s * 0.17 });
    sign(k, 'OFFICE', 2.4, 2.65, -0.9, 2.2, 0.5, { fg: P.trim, glow: true });
    // the VACANCY pylon: teal board + pink MOTEL letters, script line, VACANCY, starburst
    const sx = -9, sz = -0.8;
    for (const x of [sx - 0.8, sx + 0.8]) k.cyl(x, 0, sz, 0.12, 9.2, P.trim, { seg: 6 });
    k.ext([[-1.3, 0], [1.3, 0], [1.6, 5.6], [-0.9, 5.2]], -0.15, 0.3, P.trim, { at: [sx, 5.2, sz] });
    for (let i = 0; i < 5; i++) sign(k, 'MOTEL'[i], sx + 0.1, 9.9 - i * 1.0, sz + 0.17, 1.0, 0.95, { fg: P.neonP, glow: true, fit: 0.95, family: '"Arial Black", Impact, sans-serif' });
    k.box(sx, 4.0, sz, 5.2, 1.0, 0.25, '#2a1f2a'); sign(k, 'Leave the Light On', sx, 4.5, sz + 0.14, 5.0, 0.9, { fg: '#fff0c8', glow: true, family: SCRIPT, fit: 0.8 });
    k.box(sx + 0.4, 2.95, sz, 3.4, 0.8, 0.2, '#1e1a1e'); sign(k, 'VACANCY', sx + 0.65, 3.35, sz + 0.11, 2.7, 0.62, { fg: P.neonR, glow: true, fit: 0.85 }); sign(k, 'NO', sx - 1.0, 3.35, sz + 0.11, 0.5, 0.5, { fg: '#6a5a5a' });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.beam([sx + 0.3, 11.4, sz], [sx + 0.3 + Math.cos(a) * 1.0, 11.4 + Math.sin(a) * 1.0, sz], 0.08, P.star, { glow: true }); }
    k.blob(sx + 0.3, 11.4, sz, 0.25, 0.25, 0.25, P.star, { glow: true }); k.solid(sx - 1, sz - 0.3, sx + 1, sz + 0.3, 9);
    // west wing (doors face the court, +x) and north wing (doors face the street)
    k.aab(-24, 0, -34, -14, 3.2, -3, P.wall, { lod: true, pat: 'stucco' }); k.aab(-24.4, 3.2, -34.4, -12, 3.5, -2.6, P.trim, { lod: true }); k.solid(-24, -34, -14, -3, 3.4);
    k.aab(-24, 0, -36, 24, 3.2, -28, P.wall, { lod: true, pat: 'stucco' }); k.aab(-24.4, 3.2, -36.4, 24.4, 3.5, -26, P.trim, { lod: true }); k.solid(-24, -36, 24, -28, 3.4);
    let n = 1; const room = (f) => { f.door(0, 0, 0, 0.95, 2.1, n % 2 ? P.trim : '#e8a0b8', { frame: '#f2ece0' }); f.window(1.6, 1.0, 0, 1.3, 1.0, { frame: '#f2ece0', glass: '#3a4a4e', blind: 0.6, blindCol: '#efe0c8' });
      f.blob(-0.75, 2.4, 0.15, 0.1, 0.12, 0.1, '#fff2b0', { glow: true }); sign(f, String(n++), 0, 2.3, 0.08, 0.3, 0.2, { fg: '#2a2a2a' }); };
    for (let z = -6; z > -27; z -= 4) k.frame(-14, 0, z, Math.PI / 2, room);
    for (let x = -10; x < 6; x += 4) k.frame(x, 0, -28, 0, room);
    for (let z = -4; z > -28; z -= 4) k.cyl(-12.2, 0, z, 0.06, 3.2, '#f2ece0', { seg: 6 }); for (let x = -12; x < 25; x += 4) k.cyl(x, 0, -26.2, 0.06, 3.2, '#f2ece0', { seg: 6 });
    // the court + stripes
    k.aab(-14, 0, -28, 6, 0.04, -0.5, P.court); for (let x = -11; x < 6; x += 3) k.aab(x, 0.04, -26, x + 0.12, 0.045, -21, '#f2ece0');
    // THE MOTEL POOL: deck, kidney water, coping, diving board, ladder, loungers, umbrellas, fence + gate
    k.aab(6, 0, -26, 23, 0.06, -1, P.deck);
    for (const [x, z, r] of [[12, -11, 4.0], [17.5, -15.5, 4.6]]) { k.cyl(x, 0.0, z, r + 0.4, 0.09, P.coping, { seg: 22 }); k.cyl(x, 0.0, z, r, 0.1, P.water, { seg: 22 }); }
    k.box(17.5, 0.35, -21.3, 0.5, 0.08, 2.8, '#f2f2ee'); k.box(17.5, 0, -22.4, 0.6, 0.38, 0.6, '#c8c4bc');
    for (const s of [-0.35, 0.35]) k.beam([9.0 + s, 0, -8.6], [9.0 + s, 0.9, -8.2], 0.04, '#c8ccd0');
    for (const [x, z, r] of [[8, -20, 0.4], [9.6, -21, 0.2], [21, -6, -0.3], [21, -9, -0.2]]) { k.box(x, 0.25, z, 0.7, 0.12, 1.8, '#f2f2ee', { ry: r }); k.box(x, 0.3, z - 0.8, 0.7, 0.5, 0.12, '#f2f2ee', { ry: r, rx: -0.5 }); }
    for (const [x, z, c] of [[8.4, -19.6, '#ffd75a'], [9.9, -20.7, '#5ec8d6'], [21.3, -7.6, P.neonP]]) { k.box(x, 0, z, 0.36, 0.42, 0.36, '#f2f2ee'); umbrellaCup(k, x, 0.42, z, c); }
    for (const [x, z, c] of [[8.4, -17.5, P.neonP], [21.2, -12, P.trim]]) { k.cyl(x, 0, z, 0.04, 2.3, '#e8e8e8', { seg: 5 }); k.cyl(x, 2.0, z, 1.4, 0.55, c, { rt: 0.06, seg: 8 }); }
    k.pickets([6.2, -0.8], [12.8, -0.8], 1.2, P.fence, { gap: 0.14, pw: 0.04 }); k.pickets([15.2, -0.8], [23, -0.8], 1.2, P.fence, { gap: 0.14, pw: 0.04 });
    k.pickets([23, -0.8], [23, -26], 1.2, P.fence, { gap: 0.3, pw: 0.04 }); k.pickets([6.2, -0.8], [6.2, -26], 1.2, P.fence, { gap: 0.3, pw: 0.04 });
    k.solid(6.2, -1.0, 12.8, -0.6, 1.2); k.solid(15.2, -1.0, 23, -0.6, 1.2);
    sign(k, 'POOL', 14, 1.6, -0.75, 1.6, 0.5, { bg: P.trim, fg: '#f2ece0', fit: 0.8 }); k.box(14, 1.35, -0.8, 1.7, 0.6, 0.04, P.trim);
    k.mark('door_pool', 14, 0.5);
    palm(k, 4.6, -3.0, 8.5, 0.2, 2.6); palm(k, -12.5, -1.6, 7, 0.12, -0.3);
  }, { foot: [14, 14], lodNear: 110 });

  // ---------------------------------------------------------------- EYE-MAX DRIVE-IN (x -2..32): neon arrow pylon, ticket booth, speaker rows, snack bar, big screen
  place('drivein', 15, -70.5, 0, (k) => {
    const P = PALC.drivein;
    k.aab(-17, 0, -50, 17, 0.03, -0.5, P.lot);
    k.aab(-17, 0, -50, -16.8, 2.2, -1, P.fence); k.aab(16.8, 0, -50, 17, 2.2, -1, P.fence); k.aab(-17, 0, -1.1, -3.5, 2.2, -0.9, P.fence, { pat: 'batten', ps: 0.18 }); k.aab(7.5, 0, -1.1, 17, 2.2, -0.9, P.fence, { pat: 'batten', ps: 0.18 });
    k.solid(-17, -50, -16.8, -1, 2.2); k.solid(16.8, -50, 17, -1, 2.2); k.solid(-17, -1.1, -3.5, -0.9, 2.2); k.solid(7.5, -1.1, 17, -0.9, 2.2);
    // ticket booth in the entrance lane
    k.aab(1.0, 0, -4.2, 3.0, 2.4, -2.2, '#f0e2c4'); k.aab(0.7, 2.4, -4.5, 3.3, 2.6, -1.9, P.snackR); k.window(2.0, 1.0, -2.2, 1.4, 0.9, { frame: P.snackR, glass: '#f2d8a8', glow: true });
    sign(k, 'TICKETS', 2.0, 2.2, -2.15, 1.6, 0.34, { fg: P.snackR, fit: 0.8 }); k.solid(1.0, -4.2, 3.0, -2.2, 2.6); k.mark('door_drivein', 2.0, 0.5);
    // speaker posts in rows
    for (let z = -12; z > -43; z -= 7) for (let x = -14; x <= 14; x += 4) { k.box(x, 0, z, 0.1, 1.2, 0.1, P.post); k.box(x, 1.1, z, 0.36, 0.26, 0.2, '#8a8a7a'); }
    // snack bar
    k.aab(-15.5, 0, -16, -8.5, 3.0, -10, P.snack); k.aab(-15.5, 2.2, -10, -8.5, 2.5, -9.98, P.snackR); k.aab(-15.8, 3.0, -16.3, -8.2, 3.25, -9.4, P.snackR); k.solid(-15.5, -16, -8.5, -10, 3);
    sign(k, 'SNACK BAR', -12, 3.7, -9.6, 4.6, 0.8, { fg: '#ffe08a', glow: true, bg: null, stroke: '#c8463f' }); k.window(-12, 0.9, -10, 4.0, 1.1, { frame: P.snackR, glass: '#f6d0a0', glow: true, mull: [3, 0] });
    // the big screen (faces the cars) on a dark timber frame
    k.aab(-12.5, 0, -50.4, 12.5, 15, -50, P.frame); for (let x = -12; x <= 12; x += 3) k.beam([x, 0, -53], [x, 14, -50.5], 0.25, P.frame); k.solid(-12.5, -53, 12.5, -50, 15);
    k.aab(-12, 3.4, -50.0, 12, 14.4, -49.8, P.screen);
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 232; const g = cv.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 232); gr.addColorStop(0, '#d9c4a8'); gr.addColorStop(1, '#9c7d69'); g.fillStyle = gr; g.fillRect(0, 0, 512, 232);
      g.fillStyle = '#5a4436'; g.beginPath(); g.ellipse(170, 120, 52, 64, 0, 0, 7); g.fill(); g.fillRect(100, 170, 140, 70); g.beginPath(); g.ellipse(330, 112, 48, 60, 0, 0, 7); g.fill(); g.fillRect(268, 160, 130, 80);
      g.fillStyle = '#efe0c8'; g.beginPath(); g.ellipse(170, 128, 36, 46, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(330, 120, 34, 44, 0, 0, 7); g.fill();
      g.fillStyle = '#2a201a'; g.font = 'bold 22px Futura, sans-serif'; g.fillText('EYE-MAX · TONIGHT', 14, 28);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      k.put(far(new THREE.Mesh(new THREE.PlaneGeometry(23.4, 10.6), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }))), 0, 8.9, -49.75); }
    // the neon arrow pylon at the gate (Eye-Max script, green DRIVE-IN bar, fan arrow with neon ribs)
    const sx = -6, sz = -0.6;
    k.cyl(sx, 0, sz - 0.3, 0.16, 12, '#c8c4bc', { seg: 6 });
    k.ext([[-1.8, 0], [1.8, 0], [0, -6.2]], -0.12, 0.24, P.sign, { at: [sx, 9.2, sz] });
    for (let i = -3; i <= 3; i++) k.beam([sx + i * 0.5, 9.1, sz + 0.14], [sx, 3.2, sz + 0.14], 0.08, P.neonR, { glow: true });
    k.box(sx, 9.2, sz, 4.2, 0.9, 0.3, P.signG); sign(k, 'DRIVE-IN', sx, 9.65, sz + 0.16, 3.9, 0.8, { fg: '#f2f0d8', glow: true, fit: 0.8 });
    k.cyl(sx, 11.4, sz, 2.3, 0.26, '#2a1f2a', { rx: Math.PI / 2, seg: 18, sz: 0.5 }); sign(k, 'Eye-Max', sx, 11.4, sz + 0.3, 4.2, 1.4, { fg: '#ffb070', stroke: '#ff5a3a', glow: true, family: SCRIPT, fit: 0.9 });
    k.box(sx, 7.6, sz + 0.1, 2.6, 0.8, 0.12, '#f2ece0'); sign(k, 'DOUBLE FEATURE', sx, 8.0, sz + 0.17, 2.5, 0.6, { fg: '#2a2a2a', fit: 0.6 });
  }, { foot: [14, 14], lodNear: 110 });

  // ---------------------------------------------------------------- POOL HALL (strip south side, x -20..-4): white stucco, glass block, painted "POOL", dark base
  // Ref scale 0.0095 m/px around the door (px 507, ground py 545); a second window bay added on the left for the wider plot.
  place('poolhall', -12, -52.5, Math.PI, (k) => {
    const P = PALC.pool, s = 0.0095, X = (px) => (px - 507) * s, Y = (py) => (545 - py) * s, L = -8.2, R = X(810) + 0.1;
    k.aab(L, 0, -14, R, Y(60), 0, P.wall, { lod: true, pat: 'stucco', ps: 0.45 }); k.aab(-1.6, Y(60), -0.6, 1.9, Y(60) + 0.7, 0, P.wall); k.solid(L, -14, R, 0, 5);
    k.aab(L, Y(60) - 0.1, -0.2, R, Y(60), 0.12, '#f2ece4');
    k.aab(L, 0, 0, X(450), 1.19, 0.06, P.base, { pat: 'stucco', ps: 0.35 }); k.aab(X(575), 0, 0, R, 1.09, 0.06, P.base, { pat: 'stucco', ps: 0.35 });
    const bigWin = (dx) => { k.aab(X(100) + dx, 1.19, 0, X(315) + dx, Y(190), 0.14, P.frame);
      k.aab(X(100) + dx + 0.18, 1.35, 0.1, X(315) + dx - 0.18, Y(190) - 0.18, 0.16, P.curtain); k.box((X(100) + X(315)) / 2 + dx, 1.35, 0.17, 0.08, Y(190) - 1.53, 0.04, P.frame);
      k.window((X(130) + X(300)) / 2 + dx, Y(222), 0.0, X(300) - X(130), Y(85) - Y(222), { frame: P.wall, glass: P.block, mull: [7, 6], mullCol: P.grid, ft: 0.05 }); };
    bigWin(0); bigWin(-4.2);
    // curved glass-block column, door + transom, right glass-block panel, small right window
    k.cyl((X(340) + X(440)) / 2, Y(425), 0, (X(440) - X(340)) / 2, Y(140) - Y(425), P.block, { seg: 10 });
    for (let y = Y(425) + 0.2; y < Y(140); y += 0.2) k.cyl((X(340) + X(440)) / 2, y, 0, (X(440) - X(340)) / 2 + 0.01, 0.02, P.grid, { seg: 10 });
    k.aab(X(455), 0, 0, X(560), Y(265), 0.1, P.frame); k.aab(X(455) + 0.08, 0.15, 0.1, X(560) - 0.08, Y(265) - 0.08, 0.12, P.door); k.aab(X(455) + 0.12, 1.2, 0.12, X(560) - 0.12, Y(265) - 0.2, 0.13, '#3a403e');
    k.box(X(545), 1.1, 0.16, 0.04, 0.12, 0.04, '#c8c8c0'); k.window(0, Y(260), 0, X(580) - X(440), Y(205) - Y(260), { frame: P.frame, glass: '#2a302e', mull: [2, 0] });
    k.window((X(595) + X(715)) / 2, Y(430), 0, X(715) - X(595), Y(235) - Y(430), { frame: P.wall, glass: P.block, mull: [5, 8], mullCol: P.grid, ft: 0.04 });
    k.window((X(740) + X(800)) / 2, Y(430) + 0.1, 0, X(800) - X(740), Y(255) - Y(430) - 0.1, { frame: '#e8e4dc', glass: P.curtain, ft: 0.06 });
    sign(k, 'POOL', (X(400) + X(560)) / 2, (Y(75) + Y(170)) / 2, 0.02, X(560) - X(400) + 0.3, Y(75) - Y(170), { fg: P.letters, family: SERIF, fit: 0.95 });
    sign(k, 'BILLIARDS', 0.1, Y(30), 0.02, 3.2, 0.62, { fg: P.ghost, family: SERIF, fit: 0.9 });
    k.ext([[0, 0], [0.34, 0], [0.17, 0.42]], 0.02, 0.02, P.letters, { at: [X(570), Y(150), 0] });
    for (const [px, py, h] of [[230, 425, 0.5], [600, 430, 0.35], [140, 425, 0.3]]) k.aab(X(px), Y(py) - h, 0.06, X(px) + 0.05, Y(py), 0.07, '#8a8278');
    k.mark('door_poolhall', 0, 0.6);
  }, { foot: [12, 12] });

  // ---------------------------------------------------------------- neon pylons along the Strip
  place('neon_strip', 0, 0, 0, (k) => {
    const pyl = (x, z, h, lines, fg, bg, w = 3.2, bh = 1.6) => { k.cyl(x, 0, z, 0.12, h, '#9a9a96', { seg: 6 }); k.box(x, h - bh, z, 0.25, bh, w, bg); k.solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, h);
      for (const s of [-1, 1]) sign(k, lines, x + s * 0.14, h - bh / 2, z, w - 0.2, bh - 0.2, { fg, glow: true, ry: s * Math.PI / 2, fit: 0.8 }); };
    pyl(-30, -54.0, 6.5, 'COCKTAILS', '#7af0ff', '#1e2a3a', 3.6, 1.2); k.ext([[-0.6, 0.9], [0.6, 0.9], [0.05, 0], [0.05, -0.7], [0.35, -0.8], [-0.35, -0.8], [-0.05, -0.7], [-0.05, 0]], -0.05, 0.1, '#7af0ff', { at: [-30, 7.5, -54], ry: Math.PI / 2, glow: true });
    pyl(4, -54.0, 6, 'EAT', '#ff5a4a', '#2a1f1a', 2.6, 1.4); pyl(22, -54.0, 6, 'LIQUOR', '#ffd25a', '#2a1a2a'); pyl(44, -54.0, 5.5, 'CHECKS\nCASHED', '#7aff9a', '#1e2a22', 2.8, 1.6);
    pyl(-110, -54.0, 7, 'PALMS\nLOUNGE', '#ff7ad8', '#1e1a2e', 3.0, 1.8); pyl(-60, -54.0, 6, 'BAIL BONDS', '#fff2a0', '#2a2622', 3.4, 1.1);
    palm(k, -36, -54, 9, 0.15, 1.0); palm(k, -84, -54, 8, 0.1, 2.0); palm(k, 12, -54, 8.5, 0.16, -1.2); palm(k, 34, -54, 7.5, 0.1, 0.4);
  }, { melt: false, lodNear: 9999 });
}
