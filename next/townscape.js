// townscape.js — run 11: the real-scale Sunspots town (procedural felt, 0 Meshy credits).
// Streets, sidewalks, curbs, lots, and the houses / storefronts recreated from Scott's reference photos.
// Each building = one merged vertex-coloured felt mesh (+ unlit glow mesh + distance massing mesh). Colours are
// point-sampled from the reference photos (median of a small patch, daylight side) — see PAL.
import * as THREE from 'three';
import { Kit, textPlane } from './townkit.js';
import { buildCommercial } from './townshops.js';
import { buildStreet } from './townstreet.js';

// ---------------------------------------------------------------- locked palettes (sampled from exterior_refs/*.jpg)
export const PAL = {
  bear: { wall: '#e9dcd3', wall2: '#ead7cb', trim: '#c64246', trim2: '#cd4e5a', garage: '#ead7cb', door: '#2e2626', curtain: '#cfc5bb', chimney: '#e8dcd4', shrub: '#3a5a3a', lawn: '#929e6a', drive: '#d7c4bb', fence: '#7a1f2a', roof: '#5f5658' },
  wolf: { wall: '#e6ddce', roof: '#9a8267', screen: '#d1c1a5', gate: '#7c5032', garage: '#ece8db', hydr: '#c8647a', hydrLeaf: '#4f6a3a', steps: '#c1a174', blind: '#e6dec5', wtrim: '#8a6a4a', lawn: '#686635', rail: '#26221e', awning: '#e2cdb3' },
  store: { wall: '#ead8c7', wall2: '#ecd6c8', sill: '#b0625d', diamond: '#d83f47', door: '#ead9ce', dframe: '#b8524f', picketR: '#c8463f', picketW: '#efe6dc', cooler: '#d43c0f', coolerLid: '#ece4da', sign: '#d9762e', steps: '#e4c9b9', dirt: '#bc9381', pole: '#7a6656', iron: '#1e1a1a' },
  crow: { wall: '#ecddc8', gable: '#efd9c6', green: '#2f7a58', post: '#709c78', rail: '#197850', door: '#5f8a64', roof: '#d2ab94', steps: '#6f8f6a', porch: '#d4866f', block: '#3a3640', mainRoof: '#6a6066' },
  lynx: { wall: '#f8f1e7', yellow: '#f9e29f', garage: '#fae6a6', roof: '#5e5259', curb: '#c75f57', path: '#c86258', tree: '#3d4a30', fence: '#d87d73', lawn: '#988e4c', door: '#906a52' },
  heron: { siding: '#d8d2c6', shingle: '#c6bfb2', roof: '#cab2a1', garage: '#ece6dc', steps: '#da442c', drive: '#908684', gravel: '#9a8f8f', door: '#2c3447', fence: '#d4916a', rail: '#1e1e22', trim: '#f2eee6' },
  ram: { wall: '#f0c887', trim: '#b88272', vent: '#2a1a12', steps: '#a29e92', bowl: '#d9683a', lawn: '#b5a85a', door: '#1e1a1a', iron: '#1a1616', roof: '#6a5a52' },
  gecko: { wall: '#eac5b2', fascia: '#efe6dc', steps: '#d04d4e', block: '#bfb2a6', rail: '#f2ece4', roof: '#7a6a66', poleY: '#e8c43a', poleB: '#1e1a1a' },
  anteater: { wall: '#c2e6cd', roof: '#a8a49a', trim: '#3f8a86', steps: '#dc6065', wframe: '#f0f2ea', hose: '#3f8a5a', chimney: '#c4dccb', lawn: '#9a966c' },
  apt: { brown: '#b38877', brownTrim: '#8a6152', vict: '#a49884', victTrim: '#5a2a2c', cream: '#e3e2d8', black: '#2a2826', sage: '#a2b6b5', white: '#f2f0ea', column: '#e8ece8' },
  farm: { house: '#ededeb', shutter: '#2a2a28', roof: '#5a5a5c', door: '#b55049', barn: '#8a2a2a', barnTrim: '#efe9e0', gravel: '#ded4c9', lawn: '#6a8a3a' },
  mansion: { white: '#f2f1ee', dark: '#3a3f4a', gold: '#ffc060', glass: '#f1c895', glassCool: '#9fb4c8', flower: '#c0409a', car: '#141214', plaza: '#8a91ac', stair: '#e6ebf0' },
  street: { asphalt: '#605a56', walk: '#d8cdbf', curb: '#e8e0d4', dash: '#e8c25a', white: '#f2eee4', lot: '#6a6460', gravel: '#b9a48e', alley: '#8a7f74' },
};

// ---------------------------------------------------------------- street grid (x east, z south; -z = north toward the sun)
const WALK = 3.5;
export const GRID = {
  ew: [ // name, centre z, x0, x1, half width
    { n: 'main', z: 7, x0: -182, x1: 44, hw: 5 },
    { n: 'strip', z: -61, x0: -124, x1: 52, hw: 5 },
    { n: 'mesa', z: 62, x0: -196, x1: 44, hw: 4 },
  ],
  ns: [
    { n: 'sun', x: -40, z0: -69.5, z1: 69.5, hw: 5 },
    { n: 'palm', x: -100, z0: -69.5, z1: 69.5, hw: 4.5 },
    { n: 'east', x: 36, z0: 12, z1: 58, hw: 4 },
  ],
  walkRect: [-238, -134, 58, 138], // x0, z0, x1, z1 — the town on foot
};

export function createTownscape(C) {
  const { scene, feltMat, makeMeltable, LOW } = C;
  const mats = { felt: feltMat('#ffffff', { vertexColors: true }), glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) };
  const TS = { buildings: [], boxes: [], doors: {}, marks: {}, GRID, PAL, stats: { tris: 0 } };
  const S = PAL.street;

  // ---------------------------------------------------------------- placing a building
  function place(name, x, z, ry, fn, o = {}) {
    const k = new Kit(); fn(k, o);
    const g = k.build(mats, { shadow: !LOW }); g.name = 'ts_' + name; g.position.set(x, 0, z); g.rotation.y = ry;
    for (const m of k.extras) g.add(m);
    scene.add(g); g.updateMatrixWorld(true);
    const W = g.matrixWorld;
    for (const [x0, z0, x1, z1, h, M] of k.solids) {
      const a = new THREE.Vector3(x0, 0, z0).applyMatrix4(M).applyMatrix4(W), b = new THREE.Vector3(x1, 0, z1).applyMatrix4(M).applyMatrix4(W);
      TS.boxes.push({ x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z), h, name });
    }
    for (const [mk, v] of Object.entries(k.marks)) { const p = new THREE.Vector3(v.x, 0, v.z).applyMatrix4(W); TS.marks[mk] = { ...v, x: p.x, z: p.z, ry: (v.ry || 0) + ry }; }
    const bs = new THREE.Box3().setFromObject(g); const c = bs.getCenter(new THREE.Vector3()), r = bs.getSize(new THREE.Vector3()).length() / 2;
    const b = { name, g, c, r, detail: g.userData.detail, lo: g.userData.lo, glow: g.userData.glow, extras: k.extras, lodNear: o.lodNear ?? 70 };
    if (g.userData.detail) TS.stats.tris += g.userData.detail.geometry.attributes.position.count / 3;
    if (o.melt !== false) makeMeltable(g, { tint: o.tint || '#ff7f86', puddle: 0, drips: o.drips === false ? null : { drip: 'box', footprint: o.foot || [Math.min(14, bs.max.x - bs.min.x), Math.min(14, bs.max.z - bs.min.z)], height: o.dripY, kind: 'building' } });
    TS.buildings.push(b); return b;
  }
  TS.place = place;

  // ---------------------------------------------------------------- streets, sidewalks, curbs, markings
  place('streets', 0, 0, 0, (k) => {
    const cutsEW = (z) => GRID.ns.filter(s => z >= s.z0 - 0.01 && z <= s.z1 + 0.01).map(s => [s.x - s.hw, s.x + s.hw]);
    const cutsNS = (x) => GRID.ew.filter(s => x >= s.x0 && x <= s.x1).map(s => [s.z - s.hw - WALK, s.z + s.hw + WALK]);
    const segs = (a, b, cuts) => { let out = [[a, b]]; for (const [c0, c1] of cuts) out = out.flatMap(([u, v]) => (c1 <= u || c0 >= v) ? [[u, v]] : [[u, Math.min(v, c0)], [Math.max(u, c1), v]].filter(([p, q]) => q - p > 0.3)); return out; };
    for (const s of GRID.ew) {
      k.aab(s.x0, 0, s.z - s.hw, s.x1, 0.035, s.z + s.hw, S.asphalt);
      for (const side of [-1, 1]) {
        const zc = s.z + side * s.hw, zo = zc + side * WALK;
        for (const [u, v] of segs(s.x0, s.x1, cutsEW(zc))) { k.aab(u, 0, Math.min(zc, zo), v, 0.08, Math.max(zc, zo), S.walk); k.aab(u, 0, zc - 0.11, v, 0.14, zc + 0.11, S.curb);
          for (let x = u + 1.8; x < v - 0.5; x += 1.8) k.aab(x - 0.02, 0.08, Math.min(zc, zo) + 0.2, x + 0.02, 0.083, Math.max(zc, zo) - 0.2, '#c4b8aa'); } // expansion joints
      }
      for (const [u, v] of segs(s.x0 + 2, s.x1 - 2, GRID.ns.map(n => [n.x - n.hw - 2, n.x + n.hw + 2]))) for (let x = u; x < v - 2; x += 6) k.aab(x, 0.035, s.z - 0.08, x + 3, 0.04, s.z + 0.08, S.dash);
    }
    for (const s of GRID.ns) {
      k.aab(s.x - s.hw, 0, s.z0, s.x + s.hw, 0.034, s.z1, S.asphalt);
      for (const side of [-1, 1]) {
        const xc = s.x + side * s.hw, xo = xc + side * WALK;
        for (const [u, v] of segs(s.z0, s.z1, cutsNS(xc).map(([a, b]) => [a + WALK, b - WALK]))) { k.aab(Math.min(xc, xo), 0, u, Math.max(xc, xo), 0.08, v, S.walk); k.aab(xc - 0.11, 0, u, xc + 0.11, 0.14, v, S.curb); }
      }
      // crosswalks where it meets an EW street
      for (const e of GRID.ew) if (s.x >= e.x0 && s.x <= e.x1 && e.z >= s.z0 && e.z <= s.z1) for (const side of [-1, 1]) {
        const zc = e.z + side * (e.hw + 1.4); for (let x = s.x - s.hw + 0.5; x < s.x + s.hw - 0.4; x += 1.0) k.aab(x, 0.035, zc - 1.1, x + 0.5, 0.04, zc + 1.1, S.white);
        const xc = s.x + side * (s.hw + 1.4); for (let z = e.z - e.hw + 0.5; z < e.z + e.hw - 0.4; z += 1.0) k.aab(xc - 1.1, 0.035, z, xc + 1.1, 0.04, z + 0.5, S.white);
      }
    }
    // alley behind Main St (north side) and the rear parking lot
    k.aab(-96, 0, -31, 32, 0.03, -26, S.alley);
  }, { melt: true, drips: false, lodNear: 9999, tint: '#c2507a' });

  // ---------------------------------------------------------------- per-frame: LOD / culling
  const _cp = new THREE.Vector3();
  TS.update = (camera) => {
    _cp.copy(camera.position);
    for (const b of TS.buildings) {
      const d = _cp.distanceTo(b.c) - b.r, near = d < b.lodNear;
      if (b.detail) b.detail.visible = near || !b.lo; if (b.lo) b.lo.visible = !near;
      if (b.glow) b.glow.visible = d < 260;
      if (b.extras.length) { const v = d < 110; if (b.extrasOn !== v) { b.extrasOn = v; for (const e of b.extras) e.visible = v || !!e.userData.far; } }
    }
  };
  // walking collisions against building footprints (axis-aligned)
  TS.collide = (p, r = 0.45) => {
    for (const b of TS.boxes) {
      if (p.x < b.x0 - r || p.x > b.x1 + r || p.z < b.z0 - r || p.z > b.z1 + r) continue;
      const dl = p.x - (b.x0 - r), dr = (b.x1 + r) - p.x, dn = p.z - (b.z0 - r), ds = (b.z1 + r) - p.z, m = Math.min(dl, dr, dn, ds);
      if (m === dl) p.x = b.x0 - r; else if (m === dr) p.x = b.x1 + r; else if (m === dn) p.z = b.z0 - r; else p.z = b.z1 + r;
    }
  };
  // third-person camera: pull in when a building sits between the Wolf and the lens
  const _d = new THREE.Vector3();
  TS.camClamp = (target, cam) => {
    _d.subVectors(cam, target); let best = 1;
    for (const b of TS.boxes) {
      let t0 = 0, t1 = 1;
      const lo = [b.x0 - 0.2, 0, b.z0 - 0.2], hi = [b.x1 + 0.2, b.h + 0.3, b.z1 + 0.2], o = [target.x, target.y, target.z], d = [_d.x, _d.y, _d.z];
      let hit = true;
      for (let a = 0; a < 3; a++) { if (Math.abs(d[a]) < 1e-6) { if (o[a] < lo[a] || o[a] > hi[a]) { hit = false; break; } continue; }
        let u = (lo[a] - o[a]) / d[a], v = (hi[a] - o[a]) / d[a]; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) { hit = false; break; } }
      if (hit && t0 > 0.02 && t0 < best) best = t0;
    }
    if (best < 1) cam.copy(target).addScaledVector(_d, Math.max(0.12, best - 0.05));
    return best;
  };
  TS.inTown = (x, z, pad = 0) => { const [x0, z0, x1, z1] = GRID.walkRect; return x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad; };
  TS.clampWalk = (p) => { const [x0, z0, x1, z1] = GRID.walkRect; let out = false; if (p.x < x0) { p.x = x0; out = true; } if (p.x > x1) { p.x = x1; out = true; } if (p.z < z0) { p.z = z0; out = true; } if (p.z > z1) { p.z = z1; out = true; } return out; };

  // ---------------------------------------------------------------- doors, outdoor spots, street furniture
  // provisional door plots (M1): each later building replaces its entry with a real door mark (door_<room>)
  const plan = { diner: [-23, -1.0, 0], laundromat: [-3, -1.0, 0], post: [19, -1.0, 0], dmv: [-61, -1.0, 0], thrift: [-82.5, -1.0, 0], ksun: [-125, -1.0, 0],
    yard: [-86.5, 15.0, Math.PI], bowl: [-26.5, -70.0, 0], motel: [-74, -70.0, 0], pool: [-60, -70.0, 0], drivein: [17, -70.0, 0] };
  for (const [r, [x, z, ry]] of Object.entries(plan)) TS.doors[r] = { x, z, ry, built: false };
  TS.spots = { fence: { x: -86.5, z: 18.5, ry: Math.PI }, drivein: { x: 17, z: -112, ry: Math.PI, hide: true } };
  TS.props = [ // [town model, x, z, ry, collider r, puddle r]
    ['bus_shelter', 32.5, -0.2, 0, 1.7, 2.3], ['payphone', 9.4, 14.6, Math.PI, 0.5, 0.9],
    ...[-170, -146, -122, -98, -74, -50, -26, -2, 22].flatMap(x => [['lamp', x + 4, 1.6, 0, 0.35, 0.8], ['lamp', x - 8, 12.4, Math.PI, 0.35, 0.8]]),
  ];
  TS.bench = [28.6, 0.2, 0];
  TS.busStops = [{ name: 'MAIN ST', x: 31, z: 1.2 }];

  buildHouses(TS, place); buildResidential(TS, place); buildCommercial(TS, place);
  for (const [n, d] of Object.entries(TS.marks)) if (n.startsWith('door_')) TS.doors[n.slice(5)] = { ...d, built: true };
  buildStreet(TS, place);
  for (const [n, d] of Object.entries(TS.marks)) if (n.startsWith('door_') && !TS.doors[n.slice(5)]) TS.doors[n.slice(5)] = { ...d, built: true };   // run 11 (M4): door marks placed by the street dressing (the court)
  return TS;
}

// ================================================================= houses (M1)
// Local frame for every house: front wall centred at x=0, z=0; the house goes back toward -z; the yard runs +z to the sidewalk.
function buildHouses(TS, place) {
  const MN = { north: 47, south: 77, yard: 7.5 }; // Mesa Lane: north-side fronts at z=47 (facing south), south-side fronts at z=77 (facing north)
  const lot = (k, w, yard, lawn, o = {}) => { k.aab(-w / 2, 0, 0, w / 2, 0.03, yard, lawn); if (o.back) k.aab(-w / 2, 0, -o.back, w / 2, 0.025, 0, lawn); };
  const walkTo = (k, x, w, z0, z1, c) => k.aab(x - w / 2, 0, z0, x + w / 2, 0.045, z1, c);

  // ---- WOLF: white stucco storybook, swooping gable over an arched wood side gate, door awning, steps + black rails, hydrangeas, garage
  place('wolf_house', 22, MN.north, 0, (k) => {
    const P = PAL.wolf, H = 5.4;
    lot(k, 20, MN.yard, P.lawn, { back: 8 });
    k.aab(-3.2, 0, -10, 6.2, H, 0, P.wall, { lod: true }); k.solid(-3.2, -10, 6.2, 0, H + 3);
    k.aab(-3.25, 0, -10, 6.25, 0.35, 0.04, '#d6ccbc');                            // plinth
    k.gable(1.5, -5, 9.4, 10, H, 3.6, P.roof, P.wall, { over: 0.3, ridge: 'z' });
    // the storybook swoop: a white wing whose roof line sweeps down concave to the left over the arched gate
    const sw = []; for (let i = 0; i <= 12; i++) { const t = i / 12; sw.push([-3.2 - t * 4.6, 2.3 + (H + 2.6 - 2.3) * Math.pow(1 - t, 2.2)]); }
    k.ext([[-3.2, 0], [-7.8, 0], ...sw.slice().reverse()], -0.5, 0.5, P.wall, { lod: true });
    for (let i = 1; i < sw.length; i++) k.beam([sw[i - 1][0], sw[i - 1][1] + 0.08, 0.05], [sw[i][0], sw[i][1] + 0.08, 0.05], 0.22, P.roof, {}, 0.6);
    k.solid(-7.8, -0.5, -3.2, 0, 3);
    const arch = [[-6.9, 0], [-4.1, 0], [-4.1, 1.6]]; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; arch.push([-5.5 + Math.cos(a) * 1.4, 1.6 + Math.sin(a) * 0.75]); }
    k.ext(arch, 0.0, 0.08, P.gate); for (let x = -6.6; x < -4.2; x += 0.42) k.box(x, 0, 0.09, 0.05, 2.0, 0.02, '#5e3a24');
    // entry: raised stoop, steps, black rails, screen door, awning
    k.aab(-0.4, 0, 0, 2.2, 1.0, 1.5, '#e8dfd0'); k.steps(0.9, 3.0, 1.3, 1.0, 5, P.steps, { tread: 0.3 });
    k.rail([[0.15, 1.5, 1.0], [0.15, 3.0, 0.15]], 0.9, P.rail, { bal: 0.12 }); k.rail([[1.65, 1.5, 1.0], [1.65, 3.0, 0.15]], 0.9, P.rail, { bal: 0.12 });
    k.door(0.9, 1.0, 0, 0.95, 2.05, P.screen, { frame: P.wall, panels: '#bfae92', knob: '#3a2a1a' }); k.mark('door_wolf', 0.9, 3.6);
    k.box(0.9, 3.25, 0.45, 1.7, 0.1, 0.9, P.awning, { rx: 0.35 }); for (const s of [-1, 1]) k.beam([0.9 + s * 0.8, 3.2, 0.05], [0.9 + s * 0.8, 2.9, 0.75], 0.05, P.rail);
    k.window(-1.9, 1.2, 0, 1.6, 1.5, { frame: P.wtrim, glass: '#4a4c50', blind: 0.6, blindCol: P.blind, sill: P.wall, mull: [1, 0] });
    k.window(4.0, 3.0, 0, 1.4, 1.3, { frame: P.wtrim, glass: '#4a4c50', blind: 0.5, blindCol: P.blind, sill: P.wall });
    k.window(1.5, 6.1, 0, 0.7, 0.8, { frame: P.wtrim, glass: '#4a4c50', mull: [1, 1] });
    k.door(4.0, 0, 0, 2.7, 2.2, P.garage, { frame: P.wall, knob: P.garage }); for (let y = 0.55; y < 2.2; y += 0.55) k.box(4.0, y, 0.07, 2.6, 0.03, 0.02, '#d2cdc0');
    walkTo(k, 4.0, 3.0, 0, MN.yard + 3.5, '#cfc6b8');                                      // driveway
    walkTo(k, 0.9, 1.2, 3.0, MN.yard, '#cfc6b8');
    for (const [x, z, s] of [[-0.9, 0.6, 1], [2.9, 0.6, 0.85], [-2.6, 0.5, 0.9]]) { k.blob(x, 0.45 * s, z, 0.75 * s, 0.55 * s, 0.55 * s, P.hydrLeaf); for (let i = 0; i < 5; i++) k.blob(x + Math.cos(i * 1.3) * 0.45 * s, 0.75 * s + (i % 2) * 0.12, z + Math.sin(i * 1.3) * 0.3, 0.26 * s, 0.24 * s, 0.24 * s, P.hydr); }
    k.box(9.6, 0, 0, 0.12, 1.2, 0.12, '#6a5040'); k.box(9.6, 1.2, 0, 0.4, 0.3, 0.5, '#2a3a5a');   // mailbox post (real mailbox character lands in M4)
  }, { tint: '#ff7a86', foot: [9, 10] });

  // ---- BEAR: cream stucco, red gable trim, red/cream grid garage door, chimney, lawn, red fence, shrub
  place('bear_house', 0, MN.north, 0, (k) => {
    const P = PAL.bear, H = 2.9;
    lot(k, 20, MN.yard, P.lawn, { back: 8 });
    k.aab(-6.5, 0, -11, 6.5, H, -1.2, P.wall, { lod: true }); k.solid(-6.5, -11, 6.5, 0.4, 4.5);
    k.aab(0.2, 0, -1.2, 6.5, H, 0.4, P.wall, { lod: true });                          // garage wing steps forward
    k.aab(-6.5, 0, -1.2, -2.4, H, 0, P.wall2);
    k.gable(0, -6, 13, 9.8, H, 1.7, P.roof, P.wall, { over: 0.4, ridge: 'x' });
    k.gable(3.35, -0.6, 6.3, 2.2, H, 1.9, P.roof, P.wall, { over: 0.35, ridge: 'z', trim: P.trim, overEnd: 0.25 });
    k.gable(-4.4, -0.6, 4.2, 1.8, H, 1.3, P.roof, P.wall2, { over: 0.3, ridge: 'z', trim: P.trim, overEnd: 0.2 });
    k.aab(-6.6, H - 0.2, 0.0, 6.6, H, 0.55, P.trim);                                  // red fascia band
    // garage door: cream panels in a red grid
    const gx = 3.35, gw = 4.8, gh = 2.2; k.box(gx, 0, 0.42, gw + 0.2, gh + 0.1, 0.05, P.trim);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) k.box(gx - gw / 2 + gw * (i + 0.5) / 4, 0.06 + gh * j / 4, 0.46, gw / 4 - 0.14, gh / 4 - 0.12, 0.04, P.garage);
    k.door(-1.4, 0, -1.2, 1.0, 2.1, P.door, { frame: P.trim }); k.mark('door_living90', -1.4, 1.6);
    k.aab(-2.4, 0, -1.2, -0.2, 0.18, 0.3, '#d9cfc4');
    k.window(-4.4, 1.0, 0, 2.0, 1.2, { frame: P.trim, glass: P.curtain, mull: [1, 0], sill: P.trim });
    k.aab(-6.3, 0, -3.5, -5.2, 5.0, -2.4, P.chimney, { lod: true }); k.aab(-6.4, 4.9, -3.6, -5.1, 5.1, -2.3, '#d6c8bc');
    walkTo(k, 3.35, 5.0, 0.4, MN.yard + 3.5, P.drive); walkTo(k, -1.4, 1.1, 0.3, MN.yard, P.drive);
    k.blob(-3.0, 0.7, 0.9, 1.0, 0.9, 0.8, P.shrub); k.blob(-5.8, 0.5, 0.8, 0.8, 0.6, 0.6, P.shrub);
    k.pickets([-9.8, 7.4], [-9.8, -6], 1.2, P.fence, { gap: 0.14 });
  }, { tint: '#ff8a7c', foot: [13, 11] });

  // ---- LYNX: white clapboard, yellow trim / shutters / garage door, red curbs + path, tall evergreen, red fence
  place('lynx_house', -22, MN.north, 0, (k) => {
    const P = PAL.lynx, H = 2.8;
    lot(k, 20, MN.yard, P.lawn, { back: 8 });
    k.aab(-7, 0, -10, 7, H, 0, P.wall, { lod: true }); k.solid(-7, -10, 7, 0.6, 4.2);
    k.aab(-7, 0, 0, -1.6, H, 0.6, P.wall);
    k.siding(-7, 7, 0.2, H, 0, '#e6ddd0'); k.siding(-7, -1.6, 0.2, H, 0.6, '#e6ddd0');
    k.gable(0, -5, 14, 10, H, 1.6, P.roof, P.wall, { over: 0.45, ridge: 'x' });
    k.gable(-4.3, 0.0, 5.4, 1.4, H, 1.5, P.roof, P.wall, { over: 0.35, ridge: 'z', trim: P.yellow, overEnd: 0.3 });
    k.aab(-7.1, H - 0.22, 0, 7.1, H, 0.12, P.yellow);
    k.door(-4.3, 0, 0.6, 3.9, 2.2, P.garage, { frame: P.yellow, knob: P.garage }); for (let y = 0.55; y < 2.2; y += 0.55) k.box(-4.3, y, 0.67, 3.8, 0.03, 0.02, '#e8cf88');
    k.door(0.4, 0, 0, 0.95, 2.05, P.door, { frame: P.yellow }); k.mark('door_lynx', 0.4, 1.4);
    for (const x of [2.8, 5.4]) k.window(x, 1.0, 0, 1.5, 1.2, { frame: '#f2ece0', glass: '#3c4248', shutters: P.yellow, shW: 0.45, mull: [1, 0] });
    walkTo(k, -4.3, 4.0, 0.6, MN.yard + 3.5, '#d8cdbf');
    // red path + painted red curbs
    walkTo(k, 0.4, 1.1, 0, 4.2, P.path); k.aab(0.4 - 0.55, 0, 3.6, 4.6, 0.05, 4.2, P.path); walkTo(k, 4.3, 0.9, 4.2, MN.yard, P.path);
    k.aab(-9.9, 0, MN.yard - 0.25, 9.9, 0.16, MN.yard, P.curb);
    k.aab(-2, 0, 0.1, 6.8, 0.22, 0.4, P.curb);
    for (const [x, s] of [[-1.3, 0.8], [6.6, 0.9]]) k.blob(x, 0.5 * s, 0.9, 0.6 * s, 0.6 * s, 0.6 * s, '#4a6a3a');
    for (let i = 0; i < 5; i++) k.cyl(-8.6, 1.4 + i * 1.8, -3, 2.6 - i * 0.45, 2.6, P.tree, { rt: 0.15, seg: 8, lod: true }); k.cyl(-8.6, 0, -3, 0.25, 1.6, '#4a3a2c', { seg: 6 });
    k.pickets([9.8, 7.0], [9.8, -6], 1.1, P.fence, { gap: 0.15 });
  }, { tint: '#ff7a86', foot: [14, 10] });

  // ---- CROW: pink-cream cottage, green trim, gable window, shingled porch roof, green rails/posts/door/steps, dark breeze-block wall
  place('crow_house', -62, MN.north, 0, (k) => {
    const P = PAL.crow, H = 3.0;
    lot(k, 20, MN.yard, '#8a8f62', { back: 8 });
    k.aab(-4, 0, -10, 4, H, 0, P.wall, { lod: true }); k.solid(-4, -10, 4, 2.4, 4.5);
    k.gable(0, -5, 8, 10, H, 2.8, P.mainRoof, P.gable, { over: 0.35, ridge: 'z', trim: P.green, trimW: 0.26 });
    k.window(0, H + 0.6, 0.05, 0.75, 0.75, { frame: P.green, glass: '#3e3a3a', ft: 0.12, mull: [1, 1] });
    // porch: pink floor at 0.7, green posts + rails, shed roof of pinkish shingle
    k.aab(-4, 0, 0, 4, 0.7, 2.4, P.porch); k.aab(-4.05, 0, 2.3, 4.05, 0.7, 2.45, P.green);
    for (const x of [-3.85, -1.3, 1.3, 3.85]) k.box(x, 0.7, 2.25, 0.2, 2.15, 0.2, P.post);
    k.box(0, 2.82, 1.25, 8.6, 0.16, 2.8, P.roof, { rx: 0.18 }); k.aab(-4.3, 2.55, 2.55, 4.3, 2.78, 2.7, P.green);
    for (const [a, b] of [[-3.85, -1.3], [1.3, 3.85]]) k.rail([[a, 2.25, 0.7], [b, 2.25, 0.7]], 0.85, P.rail, { bal: 0.13 });
    k.steps(0, 3.9, 2.6, 0.7, 3, P.steps, { tread: 0.5 });
    k.door(0, 0.7, 0, 0.95, 2.05, P.door, { frame: P.green, lite: '#3e3a3a' }); k.mark('door_crow', 0, 4.4);
    for (const x of [-2.5, 2.5]) k.window(x, 1.3, 0, 1.1, 1.3, { frame: P.green, glass: '#4a4446', ft: 0.12, mull: [0, 1] });
    walkTo(k, 0, 2.6, 3.9, MN.yard, '#c9b9a8');
    // dark breeze-block wall at the right of the lot
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const x = 5.2 + i * 0.5, y = j * 0.45; k.box(x, y, 1.0, 0.46, 0.41, 0.3, P.block); k.box(x, y + 0.12, 1.16, 0.18, 0.17, 0.02, '#1a1620'); }
    k.solid(5.0, 0.8, 9.6, 1.2, 1.8);
  }, { tint: '#ff7a86', foot: [8, 12] });

  // ---- HERON: greige shingle siding, tan roof, tall gable, white garage, red-orange steps + driveway strips
  place('heron_house', -84, MN.north, 0, (k) => {
    const P = PAL.heron;
    lot(k, 20, MN.yard, '#8a8f62', { back: 8 });
    k.aab(-0.6, 0, -11, 5.4, 5.0, 0, P.siding, { lod: true }); k.solid(-5.4, -11, 5.4, 1.4, 7.5);
    k.gable(2.4, -5.5, 6.0, 11, 5.0, 3.0, P.roof, P.siding, { over: 0.35, ridge: 'z', trim: P.trim, trimW: 0.16 });
    k.aab(-5.4, 0, -10, -0.6, 3.0, 1.4, P.siding, { lod: true });
    k.gable(-3.0, -4.3, 4.8, 11.4, 3.0, 2.3, P.roof, P.siding, { over: 0.3, ridge: 'z', trim: P.trim, trimW: 0.14 });
    for (let y = 0.25; y < 4.9; y += 0.22) k.box(2.4, y, 0.015, 6.0, 0.04, 0.03, P.shingle);
    for (let y = 0.25; y < 2.95; y += 0.22) k.box(-3.0, y, 1.415, 4.8, 0.04, 0.03, P.shingle);
    k.door(2.4, 0, 0, 2.7, 2.25, P.garage, { frame: P.trim, knob: P.garage }); for (let y = 0.55; y < 2.25; y += 0.55) k.box(2.4, y, 0.07, 2.6, 0.03, 0.02, '#d8d0c4');
    k.window(2.4, 3.1, 0, 1.4, 1.2, { frame: P.trim, glass: '#3a3e46', mull: [1, 0] });
    k.window(-4.1, 1.1, 1.4, 0.9, 1.3, { frame: P.trim, glass: '#3a3e46', mull: [0, 1] });
    k.aab(-3.0, 0, 1.4, -1.2, 0.9, 2.4, P.steps); k.steps(-2.1, 4.0, 1.4, 0.9, 4, P.steps, { tread: 0.4 });
    k.rail([[-1.3, 4.0, 0.0], [-1.3, 2.4, 0.9], [-1.3, 1.45, 0.9]], 0.9, P.rail); k.rail([[-2.9, 4.0, 0], [-2.9, 2.4, 0.9]], 0.9, P.rail);
    k.door(-2.1, 0.9, 1.4, 0.9, 2.05, P.door, { frame: P.trim }); k.mark('door_heron', -2.1, 4.6);
    k.aab(-0.6, 0, 0, 5.4, 0.04, MN.yard + 3.5, P.drive); for (const x of [1.3, 3.5]) k.aab(x - 0.45, 0, 0, x + 0.45, 0.05, MN.yard + 3.5, P.steps);
    k.aab(-5.4, 0, 1.4, -0.6, 0.035, MN.yard, P.gravel);
    k.pickets([-9.8, 7.0], [-9.8, -6], 1.3, P.fence, { gap: 0.13 });
  }, { tint: '#ff8a7c', foot: [11, 12] });

  // ---- GECKO: tiny salmon clapboard, white gable fascia, porch posts, picket rail, red steps, cinder-block planters, leaning guy-wire poles
  place('gecko_house', -122, MN.north, 0, (k) => {
    const P = PAL.gecko, H = 2.8;
    lot(k, 20, MN.yard, '#8f8a5a', { back: 8 });
    k.aab(-3.5, 0.5, -8, 3.5, H + 0.5, 0, P.wall, { lod: true }); k.aab(-3.5, 0, -8, 3.5, 0.5, 0, '#c8b4a8'); k.solid(-3.5, -8, 3.5, 2.2, 4.5);
    k.siding(-3.5, 3.5, 0.6, H + 0.5, 0, '#d8b09e');
    k.gable(0, -4, 7, 8, H + 0.5, 2.2, P.roof, P.wall, { over: 0.4, ridge: 'z', trim: P.fascia, trimW: 0.34 });
    k.aab(-3.5, 0, 0, 3.5, 0.5, 2.0, '#c9b7a8');
    for (const x of [-3.3, 3.3]) k.box(x, 0.5, 1.85, 0.16, 2.4, 0.16, P.fascia);
    k.box(0, 2.95, 1.0, 7.4, 0.14, 2.2, P.roof, { rx: 0.12 }); k.aab(-3.7, 2.75, 2.05, 3.7, 2.95, 2.15, P.fascia);
    k.pickets([-3.3, 1.9], [-0.8, 1.9], 0.85, P.rail, { gap: 0.12, rails: [0.1, 0.78], y0: 0.5 }); k.pickets([0.8, 1.9], [3.3, 1.9], 0.85, P.rail, { gap: 0.12, rails: [0.1, 0.78], y0: 0.5 });
    k.steps(0, 3.4, 1.5, 0.5, 3, P.steps, { tread: 0.47 });
    k.door(0, 0.5, 0, 0.9, 2.0, '#efe6dc', { frame: P.fascia, lite: '#5a4a4a' }); k.mark('door_gecko', 0, 3.9);
    k.window(-2.0, 1.4, 0, 1.0, 1.2, { frame: P.fascia, glass: '#4a4446', mull: [0, 1] }); k.window(2.0, 1.4, 0, 1.0, 1.2, { frame: P.fascia, glass: '#4a4446', mull: [0, 1] });
    for (const x of [-3.0, -2.2, 2.2, 3.0]) { k.box(x, 0, 3.0, 0.8, 0.42, 0.4, P.block); k.blob(x, 0.55, 3.0, 0.35, 0.25, 0.2, '#5a7a3a'); }
    walkTo(k, 0, 1.4, 3.4, MN.yard, '#cfc3b4');
    for (const [x, lean] of [[-8.0, 0.16], [7.2, -0.12]]) { for (let i = 0; i < 6; i++) k.box(x + Math.sin(lean) * i * 0.4, i * 0.4 * Math.cos(lean), MN.yard - 0.8, 0.12, 0.4, 0.12, i % 2 ? P.poleB : P.poleY, { rz: -lean }); k.beam([x + Math.sin(lean) * 2.3, 2.3, MN.yard - 0.8], [x - lean * 30, 9.5, -2], 0.02, '#222'); }
  }, { tint: '#ff7a86', foot: [7, 10] });

  // ---- RAM (south side): mustard stucco, dusty pink-brown trim, slatted gable vent, porch with black wrought-iron rails, grilles, scrolled door
  place('ram_house', 22, MN.south, Math.PI, (k) => {
    const P = PAL.ram, H = 3.0;
    lot(k, 20, MN.yard, P.lawn, { back: 8 });
    k.aab(-4.5, 0.6, -11, 4.5, H + 0.6, -2.0, P.wall, { lod: true }); k.aab(-4.5, 0, -11, 4.5, 0.6, 0, '#d8b070'); k.solid(-4.5, -11, 4.5, 0, 5);
    k.aab(-4.5, 0.6, -2.0, -3.9, H + 0.6, 0, P.wall); k.aab(3.9, 0.6, -2.0, 4.5, H + 0.6, 0, P.wall);
    k.gable(0, -5.5, 9, 11, H + 0.6, 2.6, P.roof, P.wall, { over: 0.35, ridge: 'z', trim: P.trim, trimW: 0.26 });
    k.aab(-4.6, H + 0.38, -0.1, 4.6, H + 0.6, 0.06, P.trim);
    for (let i = 0; i < 6; i++) k.box(0, H + 1.05 + i * 0.13, 0.04, 1.3 - i * 0.14, 0.06, 0.04, P.vent); k.box(0, H + 0.95, 0.02, 1.45, 0.92, 0.02, P.trim);
    k.aab(-4.5, 0.55, -2.0, 4.5, 0.62, 0, '#c8b8a0');                                  // porch floor
    for (const x of [-4.2, 4.2]) k.box(x, 0.6, -0.15, 0.3, H, 0.3, P.trim);
    k.rail([[-4.0, -0.15, 0.62], [-0.9, -0.15, 0.62]], 0.9, P.iron, { bal: 0.11 }); k.rail([[0.9, -0.15, 0.62], [4.0, -0.15, 0.62]], 0.9, P.iron, { bal: 0.11 });
    for (let i = 0; i < 6; i++) k.box(-2.45 + (i % 3 - 1) * 0.9, 0.62 + 0.45 + Math.floor(i / 3) * 0.08, -0.14, 0.28, 0.28, 0.02, P.iron, { rz: 0.785 }); // scroll motif
    k.steps(0, 1.6, 1.8, 0.6, 3, P.steps, { tread: 0.53 });
    k.door(-0.2, 0.6, -2.0, 0.95, 2.1, '#6a4b3a', { frame: P.trim }); k.mark('door_ram', -0.2, 2.2);
    for (let i = 0; i < 4; i++) k.box(-0.2, 0.75 + i * 0.5, -1.92, 0.9, 0.04, 0.03, P.iron); for (let i = 0; i < 4; i++) k.box(-0.62 + i * 0.28, 0.6, -1.92, 0.03, 2.0, 0.03, P.iron);
    for (const x of [-2.6, 2.3]) k.window(x, 1.4, -2.0, 1.3, 1.4, { frame: P.trim, glass: '#3e3a36', grille: P.iron });
    for (const x of [-1.2, 1.2]) { k.cyl(x, 0, 1.75, 0.32, 0.3, P.bowl, { rt: 0.42, seg: 10 }); k.blob(x, 0.36, 1.75, 0.3, 0.14, 0.3, '#5a7a3a'); }
    walkTo(k, 0, 1.6, 1.6, MN.yard, '#c9bfa8');
  }, { tint: '#ff8a7c', foot: [9, 11] });

  // ---- ANTEATER (south side): mint-green stucco Tudor, two pointed gables, big gridded window, arched entry, red steps, chimney, coiled hose
  place('anteater_house', 0, MN.south, Math.PI, (k) => {
    const P = PAL.anteater, H = 3.0;
    lot(k, 20, MN.yard, P.lawn, { back: 8 });
    k.aab(-4.6, 0, -11, 4.2, H, -0.0, P.wall, { lod: true }); k.solid(-4.6, -11, 4.2, 1.6, 6);
    k.gable(-0.8, -5.5, 7.6, 11, H, 3.6, P.roof, P.wall, { over: 0.3, ridge: 'z', trim: P.trim, trimW: 0.2 });
    k.aab(1.8, 0, 0, 4.2, 3.2, 1.6, P.wall, { lod: true });
    k.gable(3.0, 0.8, 2.4, 1.6, 3.2, 2.0, P.roof, P.wall, { over: 0.15, ridge: 'z', trim: P.trim, trimW: 0.16, overEnd: 0.12 });
    const ar = [[2.4, 0], [3.6, 0], [3.6, 1.6]]; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; ar.push([3.0 + Math.cos(a) * 0.6, 1.6 + Math.sin(a) * 0.62]); }
    k.ext(ar.map(([x, y]) => [x, y + 0.6]), 1.6, 0.03, '#2a3a38');
    k.steps(3.0, 2.9, 1.6, 0.6, 3, P.steps, { tread: 0.43 }); k.aab(2.2, 0, 1.6, 3.8, 0.6, 2.9 - 1.29, P.steps);
    k.mark('door_anteater', 3.0, 3.4);
    k.window(-1.0, 0.9, 0, 2.6, 1.9, { frame: P.wframe, glass: '#3c4444', mull: [4, 3], mt: 0.04, ft: 0.14, sill: P.trim });
    k.window(-0.8, 4.0, 0, 0.6, 0.8, { frame: P.trim, glass: '#3c4444' });
    k.aab(-4.9, 0, -6.6, -4.1, 6.4, -5.4, P.chimney, { lod: true }); k.aab(-5.0, 6.3, -6.7, -4.0, 6.5, -5.3, '#b8c4b8');
    for (let i = 0; i < 4; i++) k.cyl(-2.8, 0.03 + i * 0.05, 2.6, 0.45 - i * 0.07, 0.05, P.hose, { seg: 12, open: true });
    k.cyl(-2.8, 0, 2.6, 0.06, 0.25, P.hose, { seg: 6 });
    walkTo(k, 3.0, 1.4, 2.9, MN.yard, '#cfc6b4');
  }, { tint: '#ff7a86', foot: [9, 11] });

}

// ================================================================= apartment row, mansion, farm (M1 residential)
function buildResidential(TS, place) {
  const A = PAL.apt;
  // ---- APARTMENT ROW (Main St south side, x 8 .. -31.5): the ref's four (brownstone, tan Victorian, cream stone modern,
  // sage clapboard porch = the Moth's) + three more so no two are alike. Local: +x = viewer's right from the street.
  place('apt_row', -11.75, 15.5, Math.PI, (k) => {
    const FZ = -2.6, D = 14, fh = 3.0;
    let x = -19.75;
    const cornice = (x0, x1, y, c, deep = 0.5, dent) => { k.aab(x0 - 0.1, y, FZ, x1 + 0.1, y + 0.55, FZ + deep, c); k.aab(x0 - 0.15, y + 0.5, FZ, x1 + 0.15, y + 0.7, FZ + deep + 0.12, c);
      if (dent) for (let u = x0 + 0.15; u < x1 - 0.1; u += 0.32) k.box(u, y - 0.16, FZ + deep * 0.6, 0.14, 0.16, 0.12, dent); };
    const body = (x0, x1, h, c) => { k.aab(x0, 0, FZ - D, x1, h, FZ, c, { lod: true }); k.solid(x0, FZ - D, x1, FZ, h); };
    const S = []; // [width, fn(x0, x1, xc)]
    // 1. brownstone: rosy brown, heavy cornice + window hoods, arched garden-level windows
    S.push([6.4, (x0, x1, xc) => { const H = 4 * fh + 0.4; body(x0, x1, H, A.brown); cornice(x0, x1, H - 0.7, A.brownTrim, 0.55, A.brownTrim);
      for (let f = 1; f < 4; f++) for (const u of [-1.5, 1.5]) { k.window(xc + u, f * fh + 0.7, FZ, 1.15, 1.75, { frame: '#3c4638', glass: '#3a3c3c', mull: [0, 1], sill: A.brownTrim, blind: 0.35, blindCol: '#e6e0d4' });
        k.box(xc + u, f * fh + 2.55, FZ + 0.12, 1.6, 0.22, 0.24, A.brownTrim); }
      for (const u of [-1.5, 1.5]) { const ar = [[-0.6, 0], [0.6, 0], [0.6, 1.2]]; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; ar.push([Math.cos(a) * 0.6, 1.2 + Math.sin(a) * 0.55]); }
        k.ext(ar, FZ + 0.01, 0.05, '#3a3c3c', { at: [xc + u, 0.6, 0] }); }
      k.aab(x0, 0, FZ, x1, 0.6, FZ + 0.15, '#9a7464'); k.pickets([x0 + 0.2, -0.4], [x1 - 0.2, -0.4], 0.9, '#2a2622', { gap: 0.14, pw: 0.03 }); }]);
    // 2. tan Victorian: vertical board siding, dark red trim bands + frames, stone stoop with white rails, double door
    S.push([5.0, (x0, x1, xc) => { const H = 4 * fh + 0.2; body(x0, x1, H, A.vict); for (let u = x0 + 0.25; u < x1; u += 0.25) k.box(u, 0.6, FZ + 0.02, 0.04, H - 0.9, 0.03, '#958a76');
      for (let f = 1; f <= 4; f++) k.aab(x0, f * fh - 0.15, FZ, x1, f * fh + 0.1, FZ + 0.12, A.victTrim);
      cornice(x0, x1, H - 0.6, A.victTrim, 0.6, '#3a1a1c'); k.aab(xc - 1.4, H, FZ - 3, xc + 1.4, H + 1.3, FZ - 1.5, A.victTrim);
      for (let f = 1; f < 4; f++) { k.window(xc, f * fh + 0.6, FZ, 1.3, 2.0, { frame: A.victTrim, ft: 0.16, glass: '#3c3a40', mull: [0, 1] }); k.box(xc, f * fh + 2.62, FZ + 0.1, 1.9, 0.26, 0.2, A.victTrim); }
      k.door(xc - 0.8, 1.2, FZ, 1.3, 2.3, '#5a3020', { frame: A.victTrim, panels: '#6a3a28' }); k.window(xc + 1.25, 1.6, FZ, 0.8, 1.5, { frame: A.victTrim, glass: '#3c3a40' });
      k.aab(xc - 1.6, 0, FZ, xc, 1.2, FZ + 0.6, '#9a4a40'); k.steps(xc - 0.8, 0, 1.5, 1.2, 6, '#9a4a40', { tread: 0.33 });
      for (const s of [-1, 1]) k.rail([[xc - 0.8 + s * 0.8, FZ + 0.6, 1.2], [xc - 0.8 + s * 0.8, -0.1, 0.1]], 0.9, '#f0ece4', { bal: 0.14 }); k.mark('door_apt_vict', xc - 0.8, 0.6); }]);
    // 3. cream stone modern: block joints, black frames, black balcony w/ planters, black front fence, penthouse box
    S.push([5.0, (x0, x1, xc) => { const H = 4 * fh + 0.6; body(x0, x1, H, A.cream);
      for (let y = 0.5; y < H; y += 0.5) k.box(xc, y, FZ + 0.015, x1 - x0, 0.03, 0.02, '#cfcdc2'); for (let y = 0; y < H - 0.5; y += 1.0) for (let u = x0 + ((y / 1.0) % 2 ? 0.6 : 1.2); u < x1; u += 1.2) k.box(u, y + 0.5, FZ + 0.015, 0.03, 0.5, 0.02, '#cfcdc2');
      k.aab(x0, H - 0.6, FZ, x1, H, FZ + 0.25, '#efeee8'); k.aab(xc - 2.0, H, FZ - 5, xc + 2.0, H + 2.4, FZ - 2, '#dad8d0');
      for (let f = 1; f < 4; f++) k.window(xc, f * fh + 0.5, FZ, 1.9, 1.9, { frame: A.black, ft: 0.12, glass: '#3a4040', mull: [1, 0] });
      k.aab(xc - 1.3, fh + 0.3, FZ, xc + 1.3, fh + 0.45, FZ + 0.6, A.black); for (let u = xc - 1.25; u <= xc + 1.3; u += 0.12) k.box(u, fh + 0.45, FZ + 0.58, 0.03, 0.9, 0.03, A.black);
      k.aab(xc - 1.3, fh + 1.33, FZ, xc + 1.3, fh + 1.38, FZ + 0.62, A.black); for (const u of [-0.7, 0.7]) { k.box(xc + u, fh + 0.45, FZ + 0.3, 0.35, 0.35, 0.3, '#4a4440'); k.blob(xc + u, fh + 1.0, FZ + 0.3, 0.32, 0.4, 0.3, '#3f6a3a'); }
      k.door(xc - 0.9, 0.3, FZ, 1.0, 2.3, '#2a2a2a', { frame: A.black, lite: '#5a6060' }); k.window(xc + 0.9, 0.9, FZ, 1.0, 1.2, { frame: A.black, glass: '#3a4040' });
      k.aab(xc - 1.5, 0, FZ, xc - 0.3, 0.3, FZ + 0.8, '#d6d4ca'); k.box(xc - 0.1, 0, -0.3, 0.06, 1.0, 0.06, A.black);
      for (let u = x0 + 0.1; u < x1; u += 0.16) if (Math.abs(u - (xc - 0.9)) > 0.7) k.box(u, 0, -0.3, 0.03, 0.95, 0.03, A.black); k.beam([x0, 0.95, -0.3], [x1, 0.95, -0.3], 0.05, A.black);
      k.blob(xc + 1.2, 0.4, -1.4, 1.0, 0.5, 0.8, '#3a6a32'); }]);
    // 4. sage clapboard, white-column porch over a brick basement (THE MOTH'S)
    S.push([7.6, (x0, x1, xc) => { const B = 2.4, H = B + 3 * fh + 0.4; body(x0, x1, H, A.sage); k.siding(x0, x1, B, H - 0.7, FZ, '#93a7a6', { step: 0.22 });
      k.aab(x0, 0, FZ, x1, B, FZ + 0.08, '#7a3a34'); cornice(x0, x1, H - 0.75, A.white, 0.45, A.white);
      for (let f = 0; f < 3; f++) for (const u of [-2.3, 0, 2.3]) { if (f === 0 && u === 2.3) continue; k.window(xc + u, B + f * fh + 0.7, FZ, 1.0, 1.6, { frame: A.white, ft: 0.13, glass: '#3a4242', mull: [1, 1], mt: 0.035 }); k.box(xc + u, B + f * fh + 2.42, FZ + 0.1, 1.5, 0.2, 0.2, A.white); }
      for (const u of [-2.3, 0]) k.window(xc + u, 0.4, FZ, 1.0, 1.4, { frame: '#2a2622', glass: '#2e3030', grille: '#1e1a1a' });
      k.door(xc + 2.3, B, FZ, 1.0, 2.3, '#5a2a26', { frame: A.white, lite: '#3a3a3a' }); k.mark('door_moth', xc + 2.6, 0.4);
      const PZ = FZ + 2.4; k.aab(x0 + 0.1, B - 0.25, FZ, x1 - 0.1, B, PZ, A.white); k.aab(x0, B + 3.0, FZ, x1, B + 3.3, PZ + 0.2, A.white);
      for (let i = 0; i < 5; i++) { const u = x0 + 0.35 + i * (x1 - x0 - 0.7) / 4; k.cyl(u, 0, PZ - 0.1, 0.16, B + 3.0, A.column, { seg: 10 }); k.box(u, B + 2.85, PZ - 0.1, 0.42, 0.16, 0.42, A.column); }
      k.rail([[x0 + 0.35, PZ - 0.1, B], [x1 - 2.0, PZ - 0.1, B]], 0.85, A.white, { bal: 0.13 });
      k.steps(x1 - 0.95, 0.1, 1.3, B, 9, '#6a6260', { tread: 0.27 }); for (const s of [-1, 1]) k.rail([[x1 - 0.95 + s * 0.68, PZ - 0.1, B], [x1 - 0.95 + s * 0.68, 0.0, 0.1]], 0.9, A.white, { bal: 0.15 });
      for (let u = x0 + 0.1; u < x1 - 1.8; u += 0.15) k.box(u, 0, -0.2, 0.03, 1.0, 0.03, '#1e1a1a'); k.beam([x0, 1.0, -0.2], [x1 - 1.8, 1.0, -0.2], 0.05, '#1e1a1a');
      k.aab(x0 - 0.5, H - 2, FZ - 3, x0 + 0.5, H + 0.9, FZ - 2, '#a0523e'); }]);
    // 5. butter-yellow brick, green cornice, white lintels, two-up windows, green door with a transom
    S.push([5.2, (x0, x1, xc) => { const H = 3 * fh + 0.5; body(x0, x1, H, '#d9c48a'); for (let y = 0.3; y < H - 0.6; y += 0.3) k.box(xc, y, FZ + 0.012, x1 - x0, 0.02, 0.02, '#c8b277');
      cornice(x0, x1, H - 0.6, '#3f6a4a', 0.5, '#3f6a4a');
      for (let f = 0; f < 3; f++) for (const u of [-1.3, 1.3]) { if (f === 0 && u < 0) continue; k.window(xc + u, f * fh + 0.8, FZ, 1.1, 1.6, { frame: '#f2ece0', glass: '#3a3e3c', mull: [0, 1], sill: '#f2ece0' }); k.box(xc + u, f * fh + 2.45, FZ + 0.08, 1.4, 0.18, 0.16, '#f2ece0'); }
      k.door(xc - 1.3, 0.45, FZ, 1.0, 2.2, '#3f6a4a', { frame: '#f2ece0', panels: '#4c7a56' }); k.window(xc - 1.3, 2.8, FZ, 1.0, 0.35, { frame: '#f2ece0', glass: '#4a4a3a' });
      k.steps(xc - 1.3, FZ + 0.9, 1.4, 0.45, 3, '#bcb4a6', { tread: 0.3 }); k.box(xc + 1.3, 0, FZ + 0.4, 1.4, 0.35, 0.6, '#b0703e'); for (let i = 0; i < 4; i++) k.blob(xc + 0.8 + i * 0.33, 0.45, FZ + 0.4, 0.2, 0.2, 0.2, i % 2 ? '#d04a5a' : '#f0d040'); }]);
    // 6. pink stucco with a white two-storey bay window and a terracotta parapet
    S.push([5.4, (x0, x1, xc) => { const H = 3 * fh + 0.6; body(x0, x1, H, '#e7b3a6'); k.aab(x0, H - 0.4, FZ, x1, H, FZ + 0.18, '#b8603e'); for (let u = x0; u < x1; u += 0.3) k.cyl(u + 0.15, H - 0.05, FZ + 0.12, 0.13, 0.24, '#c06a44', { seg: 6, rz: Math.PI / 2 });
      k.aab(xc - 0.3, fh * 0.9, FZ, xc + 2.4, 3 * fh - 0.1, FZ + 0.9, '#e7b3a6'); for (let f = 1; f < 3; f++) { k.window(xc + 1.05, f * fh + 0.5, FZ + 0.9, 1.6, 1.7, { frame: '#f6f2ea', ft: 0.12, glass: '#3a3c40', mull: [1, 0] }); k.aab(xc - 0.3, f * fh + 0.25, FZ, xc + 2.4, f * fh + 0.35, FZ + 1.0, '#f6f2ea'); }
      for (let f = 1; f < 3; f++) k.window(xc - 1.6, f * fh + 0.6, FZ, 0.9, 1.6, { frame: '#f6f2ea', glass: '#3a3c40', mull: [0, 1] });
      k.door(xc - 1.4, 0.3, FZ, 1.1, 2.2, '#2a5a6a', { frame: '#f6f2ea', panels: '#346a7a' }); k.window(xc + 1.1, 0.9, FZ, 1.6, 1.3, { frame: '#f6f2ea', glass: '#3a3c40', grille: '#2a2a2a' });
      k.aab(xc - 2.1, 0, FZ, xc - 0.7, 0.3, FZ + 0.7, '#d8c4b8'); k.mark('door_apt_pink', xc - 1.4, -0.6); }]);
    // 7. oxblood brick walk-up, cream cornice, white lintels + sills, black iron stoop rail
    S.push([4.9, (x0, x1, xc) => { const H = 4 * fh + 0.2; body(x0, x1, H, '#9a4a3c'); for (let y = 0.3; y < H - 0.6; y += 0.3) k.box(xc, y, FZ + 0.012, x1 - x0, 0.02, 0.02, '#874034');
      cornice(x0, x1, H - 0.7, '#e8e0d0', 0.6, '#e8e0d0');
      for (let f = 1; f < 4; f++) for (const u of [-1.2, 1.2]) { k.window(xc + u, f * fh + 0.7, FZ, 1.0, 1.7, { frame: '#e8e2d6', glass: '#323436', mull: [0, 1], sill: '#e8e0d0' }); k.box(xc + u, f * fh + 2.5, FZ + 0.09, 1.3, 0.22, 0.18, '#e8e0d0'); }
      k.door(xc + 1.0, 1.0, FZ, 1.1, 2.3, '#2a2422', { frame: '#e8e0d0', lite: '#4a4a48' }); k.window(xc - 1.2, 1.3, FZ, 1.0, 1.5, { frame: '#e8e2d6', glass: '#323436', grille: '#1a1a1a' });
      k.aab(xc + 0.2, 0, FZ, xc + 1.8, 1.0, FZ + 0.6, '#b8b0a4'); k.steps(xc + 1.0, -0.2, 1.4, 1.0, 5, '#b8b0a4', { tread: 0.36 });
      for (const s of [-1, 1]) k.rail([[xc + 1.0 + s * 0.72, FZ + 0.6, 1.0], [xc + 1.0 + s * 0.72, -0.3, 0.1]], 0.9, '#1e1a1a', { bal: 0.12 }); }]);
    for (const [w, fn] of S) { fn(x, x + w, x + w / 2); x += w; }
    k.aab(-19.75, 0, FZ, 19.75, 0.04, 0, '#cfc4b4');                                        // front areaway paving
  }, { tint: '#ff7f86', foot: [14, 10], lodNear: 90 });

  // ---- VULTURE + LARRY BYRD MANSION (Mesa Ln south side, x -150..-185): glassy modern, gold LED fascias, glass balconies,
  // lit stair, two black cars, reflecting plaza, magenta planters. The fanciest place in town — still felt.
  place('mansion', -167.5, 77, Math.PI, (k) => {
    const M = PAL.mansion, G = 3.2;                       // garage storey height; the house sits on a white podium
    k.aab(-17, 0, -26, 17, 0.03, 7.5, '#7f9a5a');                                            // lawn
    k.aab(-12, 0.0, 0.0, 15, 0.06, 7.5, M.plaza); for (let i = 0; i < 6; i++) k.box(-8 + i * 4.4, 0.06, 3.5 + (i % 2), 2.6, 0.005, 0.18, '#c8d0e4', { glow: true });  // reflecting plaza + glints
    // podium + garage
    k.aab(-8, 0, -16, 13, G, -9.0, M.white, { lod: true }); k.aab(-8, 0, -9, -3.6, G, -1.0, M.white, { lod: true }); k.aab(12.4, 0, -9, 13, G, -1.0, M.white); k.solid(-8, -16, 13, -0.6, 10);
    k.aab(-3.6, G - 0.3, -9, 12.4, G, -1.0, '#f4ecdc'); k.aab(-3.5, 0.2, -8.98, 12.3, G - 0.35, -8.94, '#f6e6c8', { glow: true }); // the lit garage: warm back wall, cars parked inside
    k.aab(-3.6, 0, -9, 12.4, 0.04, -0.6, '#e8e4dc'); for (const u of [-1.8, 4.5, 10.5]) k.box(u, G - 0.32, -5, 0.4, 0.02, 0.4, '#fff4d0', { glow: true });
    for (const u of [-3.6, 4.2, 12.1]) k.aab(u - 0.3, 0, -1.0, u + 0.3, G, -0.4, M.white);
    k.aab(-8.2, G - 0.4, -1.2, 13.2, G + 0.15, 0.2, M.white);
    for (const [u, c] of [[0.8, M.car], [8.2, M.car]]) { k.aab(u - 1.0, 0.25, -5.6, u + 1.0, 0.95, -1.0, c); k.aab(u - 0.85, 0.95, -4.6, u + 0.85, 1.45, -2.2, c); k.aab(u - 0.8, 1.0, -2.25, u + 0.8, 1.4, -2.15, '#5a6478'); for (const s of [-1, 1]) for (const z of [-1.6, -5.0]) k.cyl(u + s * 0.95, 0.35, z, 0.35, 0.18, '#0e0e10', { seg: 10, rz: Math.PI / 2 });
      k.box(u, 0.62, -0.98, 0.6, 0.25, 0.04, '#c8ccd2'); for (const s of [-1, 1]) k.box(u + s * 0.7, 0.7, -0.97, 0.3, 0.1, 0.03, '#fff6d8', { glow: true }); }
    // magenta flower planters along the terrace lip
    for (let u = -7.5; u < 12.8; u += 0.9) { k.box(u, G + 0.15, -0.4, 0.85, 0.35, 0.6, '#ece8e0'); k.blob(u, G + 0.65, -0.4, 0.5, 0.32, 0.36, (Math.round(u * 3) % 3) ? M.flower : '#3e6a3a'); }
    // main floor: glass boxes + white piers
    const F1 = G + 0.15, F2 = F1 + 3.4, F3 = F2 + 3.2;
    k.aab(-8, F1, -15, 1.5, F2, -2.5, M.white, { lod: true }); k.aab(1.5, F1, -15, 12, F2, -4.5, M.white, { lod: true });
    k.window(-3.6, F1 + 0.3, -2.5, 6.4, 2.8, { frame: M.dark, ft: 0.12, glass: M.glass, glow: true, mull: [3, 0], mt: 0.08 });
    k.window(6.8, F1 + 0.2, -4.5, 7.6, 2.9, { frame: M.dark, ft: 0.1, glass: M.glass, glow: true, mull: [3, 0], mt: 0.08 });
    for (const u of [2.0, 11.6]) k.aab(u - 0.5, F1, -4.5, u + 0.5, F2, -2.6, M.white);
    // upper floor slab + balcony (glass rail) on the right, tall glass corner on the left
    k.aab(1.0, F2, -15, 13, F2 + 0.4, -1.4, M.white); k.box(7, F2 + 0.4, -1.45, 12, 1.0, 0.06, M.glassCool); k.aab(1.0, F2 + 0.02, -1.4, 13, F2 + 0.12, -1.35, M.gold, { glow: true });
    for (const u of [3, 6, 9, 12]) k.blob(u, F2 + 0.65, -2.0, 0.45, 0.35, 0.35, u % 2 ? M.flower : '#3e6a3a');
    k.aab(-9, F2, -15, 2.0, F3, -2.5, M.white, { lod: true }); k.window(-3.2, F2 + 0.1, -2.5, 4.4, 2.9, { frame: M.dark, ft: 0.14, glass: M.glass, glow: true, mull: [2, 1], mt: 0.08 });
    k.window(-7.4, F2 + 0.8, -2.5, 1.2, 1.6, { frame: M.dark, glass: '#5a6a80', mull: [1, 0] });
    k.aab(2.0, F2 + 0.4, -15, 12.5, F3 - 0.4, -6, M.white, { lod: true }); k.window(7.2, F2 + 0.7, -6, 7.0, 2.2, { frame: M.dark, glass: M.glass, glow: true, mull: [3, 0] });
    // flat roof slabs: dark fascia + gold LED strips (unlit-glow)
    const slab = (x0, x1, z0, z1, y) => { k.aab(x0, y, z0, x1, y + 0.55, z1, M.dark, { lod: true }); k.aab(x0 + 0.1, y - 0.12, z1 - 0.02, x1 - 0.1, y, z1 + 0.02, M.gold, { glow: true }); k.aab(x0 + 0.2, y + 0.55, z0 + 0.2, x1 - 0.2, y + 0.65, z1 - 0.2, '#e8e8ea'); };
    slab(-10.2, 2.8, -16, -1.2, F3); slab(1.6, 14, -16, -4.8, F3 - 0.4);
    k.aab(-9.0, F2 - 0.15, -16, 1.6, F2 + 0.25, -1.6, M.white); k.aab(-8.9, F2 - 0.25, -1.7, 1.5, F2 - 0.15, -1.6, M.gold, { glow: true });
    // the lit stair (left): white treads with glow risers + glass side panels
    const ST = 14, sx = -10.5; for (let i = 0; i < ST; i++) { const y = (i + 1) * F1 / ST, z = 2.2 - i * 0.36;
      k.aab(sx - 1.5, 0, z - 0.36, sx + 1.5, y, z, M.stair); k.aab(sx - 1.4, y - 0.05, z - 0.02, sx + 1.4, y - 0.01, z + 0.01, '#fff2cc', { glow: true }); }
    for (const s of [-1, 1]) k.beam([sx + s * 1.55, 0.2, 2.2], [sx + s * 1.55, F1 + 0.2, 2.2 - ST * 0.36], 0.9, M.glassCool, {}, 0.04);
    k.aab(sx - 1.5, 0, -3.0, sx + 2.5, F1, -1.0, M.white);
    k.mark('door_mansion', sx, 3.2);
    // palms + hedges + bollard lights
    for (const [u, z, h] of [[-15, 2, 7.5], [15.5, -3, 8.5], [16, 4, 6.8], [-15.5, -10, 8]]) { k.cyl(u, 0, z, 0.22, h, '#8a6a4a', { rt: 0.16, seg: 6 }); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; k.box(u + Math.cos(a) * 1.0, h - 0.3, z + Math.sin(a) * 1.0, 2.2, 0.08, 0.5, '#3f6a32', { ry: -a, rz: 0.35 }); } }
    for (let u = -16; u < -12.5; u += 1.1) k.blob(u, 0.5, 5, 0.6, 0.55, 0.6, '#3a5a2e');
    for (const u of [-6, -1, 4, 9, 14]) { k.cyl(u, 0, 7.0, 0.1, 0.6, '#2a2a2e', { seg: 6 }); k.box(u, 0.6, 7.0, 0.16, 0.08, 0.16, '#fff0c0', { glow: true }); }
  }, { tint: '#ff86a0', foot: [14, 14], lodNear: 90 });

  // ---- FARM (edge of town, west of Mesa Ln): white New England farmhouse, black shutters, red door, dormer, red ell, red barn, gravel, lawn, trees, dog
  const FX = -214, FZz = 96; // local +z faces world +x (toward town)
  place('farm', FX, FZz, Math.PI / 2, (k) => {
    const P = PAL.farm, H = 3.0;
    k.aab(-28, 0, -16, 22, 0.03, 24, P.lawn);
    const L = (wx, wz) => [-(wz - FZz), wx - FX];                                              // world -> local
    { const pts = [L(-196, 62), L(-200, 70), L(-205, 80), L(-208, 88), [0, 9], [0, 3]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
      for (let j = 0; j < n; j++) { const t = (j + 0.5) / n; k.box(a[0] + (b[0] - a[0]) * t, 0.02, a[1] + (b[1] - a[1]) * t, 2.8, 0.03, 2.3, P.gravel, { ry: Math.atan2(b[0] - a[0], b[1] - a[1]) }); } } }
    // farmhouse: 1.5 storeys, ridge parallel to the street, centred shed dormer
    k.aab(-5.5, 0, -7, 5.5, H, 0, P.house, { lod: true }); k.solid(-5.5, -7, 5.5, 0, 7);
    k.gable(0, -3.5, 11, 7, H, 3.4, P.roof, P.house, { over: 0.35, ridge: 'x' }); k.siding(-5.5, 5.5, 0.4, H, 0, '#dcdcd8', { step: 0.24 });
    k.aab(-1.6, H + 0.4, -2.4, 1.6, H + 1.9, -0.6, P.house); k.box(0, H + 1.9, -1.4, 3.6, 0.16, 2.4, P.roof, { rx: 0.18 });
    k.window(0, H + 0.7, -0.6, 2.2, 0.9, { frame: '#f6f6f2', glass: '#3a3e44', mull: [2, 0] });
    k.door(0.9, 0, 0, 0.95, 2.1, P.door, { frame: '#f6f6f2', panels: '#a8443e' }); k.steps(0.9, 0.6, 1.4, 0.3, 2, '#c8c4bc', { tread: 0.3 }); k.mark('door_farm', 0.9, 1.6);
    for (const u of [-4.2, -2.4, 3.0, 4.6]) k.window(u, 0.9, 0, 0.8, 1.5, { frame: '#f6f6f2', glass: '#3a3e44', mull: [1, 1], mt: 0.03, shutters: P.shutter, shW: 0.36 });
    for (const u of [-3.2, 3.2]) k.window(u, H + 0.25, 0.25, 0.6, 0.9, { frame: '#f6f6f2', glass: '#3a3e44', shutters: P.shutter, shW: 0.3 });
    k.aab(1.8, 0, -4.4, 2.6, H + 4.4, -3.6, '#a84a3e', { lod: true });
    // the ell (red metal roof, skylight) and its chimney
    k.aab(5.5, 0, -6.5, 12, 2.7, -0.8, P.house, { lod: true }); k.gable(8.75, -3.65, 6.5, 5.7, 2.7, 1.7, '#9a3e36', P.house, { over: 0.3, ridge: 'x' }); k.box(9.2, 3.1, -2.4, 1.2, 0.05, 0.9, '#a8b8c8', { rx: 0.55 });
    k.aab(10.0, 0, -5.0, 10.7, 5.4, -4.3, '#a84a3e'); k.window(8.0, 0.9, -0.8, 1.4, 1.2, { frame: '#f6f6f2', glass: '#3a3e44', mull: [2, 0] }); k.solid(5.5, -6.5, 12, -0.8, 5);
    // red barn: two garage doors, white trim, pale metal roof, flower bed
    k.aab(17, 0, -9, 27, 4.2, 0, P.barn, { lod: true }); k.solid(17, -9, 27, 0, 8); k.gable(22, -4.5, 10, 9, 4.2, 3.0, '#e4e4e6', P.barn, { over: 0.3, ridge: 'x' });
    for (const u of [19.6, 24.4]) { k.door(u, 0, 0, 3.2, 2.7, '#8f2c2c', { frame: P.barnTrim, knob: '#2a2a2a' }); k.beam([u - 1.5, 0.1, 0.1], [u + 1.5, 2.6, 0.1], 0.1, P.barnTrim); k.beam([u + 1.5, 0.1, 0.1], [u - 1.5, 2.6, 0.1], 0.1, P.barnTrim); }
    for (const u of [17.05, 26.95]) k.box(u, 0, 0.02, 0.14, 4.2, 0.06, P.barnTrim); k.window(22, 5.0, 0.0, 0.9, 0.9, { frame: P.barnTrim, glass: '#2a2626' });
    for (let u = 18; u < 26; u += 0.5) k.blob(u, 0.3, 0.7, 0.3, 0.3, 0.3, (Math.round(u * 2) % 3) ? '#d05a8a' : '#e8c040');
    k.cyl(28.5, 0, 2.0, 0.12, 7.5, '#6a5040', { seg: 6 });                                    // the yard light pole
    // big shade trees + a little tan dog
    for (const [u, z, s] of [[-14, 10, 1.3], [-20, -4, 1.1], [14, 14, 1.5], [-9, -12, 1.0], [30, -8, 1.2]]) { k.cyl(u, 0, z, 0.45 * s, 4.5 * s, '#4a3a2e', { rt: 0.3 * s, seg: 7 }); k.blob(u, 6.2 * s, z, 3.4 * s, 2.8 * s, 3.2 * s, '#3f6a2e', { detail: 1 }); k.blob(u + 1.2 * s, 7.4 * s, z - 0.8, 2.4 * s, 2.0 * s, 2.2 * s, '#4f7a36'); }
    k.aab(8.4, 0.25, 12.3, 9.2, 0.6, 12.6, '#b07a48'); k.box(9.35, 0.45, 12.45, 0.32, 0.3, 0.26, '#b07a48'); k.box(9.5, 0.75, 12.4, 0.08, 0.14, 0.05, '#8a5a34'); for (const u of [8.5, 9.1]) for (const z of [12.35, 12.55]) k.box(u, 0, z, 0.08, 0.27, 0.08, '#b07a48'); k.beam([8.4, 0.5, 12.45], [8.1, 0.75, 12.45], 0.05, '#b07a48');
  }, { tint: '#ff8a8a', foot: [12, 8], lodNear: 90 });
}
