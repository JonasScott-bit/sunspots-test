// missions/drivecore.js — the shared night-road engine for the cast missions (Grandma's Cat drive, License and Fur,
// Goat in a Hurry, Never Made It, Return to Sender, Hum a Few Bars, My Hat!). A felt town strung along one long road:
// a curved ribbon of asphalt with lane dashes and curbs, felt houses / shops with lit windows, streetlamps (one Points cloud
// for every halo), cross streets with working traffic lights, NPC cars that keep to their lanes, stop at reds and queue,
// oncoming traffic, cross traffic on the green, pedestrians who wait for the walk sign — the town lives its own life
// and you weave through it. Phone controls: drag anywhere to steer (floating thumb pad), big BOOST/HONK buttons on the right.
// Everything static is merged per 160 m chunk (a few draw calls), vertex-coloured felt (matte Lambert) + unlit window glow.
import * as THREE from 'three';
import { Merge, felt, glowMat, glowTex, waddleCar, spinWheels, pal, animPal, folk, rng, clamp, lerp, TAU, sign, VCM, blobShadow } from './kit.js';

const _p = { x: 0, z: 0, yaw: 0 }, _v = new THREE.Vector3(), _l = new THREE.Vector3();
export const THEMES = {
  town: { ground: '#2a2a3a', walls: ['#e9c27e', '#f2a6b8', '#bfe0e2', '#c6d6a6', '#f6efe0', '#d9c0f0', '#f2d27a', '#e0705a'], roofs: ['#7a4e2e', '#4a3a5a', '#2f5a3e', '#8a3a3a', '#3a4a6a'], win: ['#ffd98a', '#ffcf7a', '#ffe8b0', '#9fd6ff'], lot: 13, setback: 3.5, cactus: 0.15, trees: 0.35, fence: 0.4 },
  strip: { ground: '#24202e', walls: ['#3a2a4a', '#2a3a4a', '#4a2a3a', '#2a2a3a'], roofs: ['#1a1424', '#24182a'], win: ['#ff6fae', '#5fe3d2', '#f6b23a', '#a98cff'], lot: 16, setback: 2.5, neon: 0.8, cactus: 0.05, trees: 0, fence: 0 },
  edge: { ground: '#3a2e30', walls: ['#e9c27e', '#c9a77a', '#f6efe0'], roofs: ['#7a4e2e', '#5a3a2a'], win: ['#ffd98a'], lot: 34, setback: 6, cactus: 0.7, trees: 0.05, fence: 0.6 },
};

export function createDrive(scene, o = {}) {
  const R = rng(o.seed || 4242), TH = THEMES[o.theme || 'town'];
  const W = o.width || 12, HALF = W / 2, SIDE = o.side ?? 3.2;
  // ---------------------------------------------------------------- centreline: integrate heading over [length, turnDeg] pieces
  const pts = [{ x: 0, z: 0, h: 0 }]; let h = 0, x = 0, z = 0; const STEP = 2;
  for (const [len, turn = 0] of o.route || [[600, 0]]) { const n = Math.max(1, Math.round(len / STEP)), dh = (turn * Math.PI / 180) / n; for (let i = 0; i < n; i++) { h += dh; x += Math.sin(h) * STEP; z += Math.cos(h) * STEP; pts.push({ x, z, h }); } }
  const LEN = (pts.length - 1) * STEP;
  const road = {
    len: LEN, W, HALF, pts,
    at(s, out = _p) { s = clamp(s, 0, LEN - 0.001); const f = s / STEP, i = Math.floor(f), k = f - i, a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)]; out.x = a.x + (b.x - a.x) * k; out.z = a.z + (b.z - a.z) * k; out.yaw = a.h + (b.h - a.h) * k; return out; },
    pos: null,
  };
  // lateral offset: +off = the right of travel (right-hand traffic); heading h -> forward (sin h, cos h), right (-cos h, sin h)
  road.pos = (s, off, v = new THREE.Vector3(), y = 0) => { const p = road.at(s); return v.set(p.x - Math.cos(p.yaw) * off, y, p.z + Math.sin(p.yaw) * off); };

  // ---------------------------------------------------------------- textures: asphalt with dashes, curbs, crosswalks
  const asphalt = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#3a3640'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgba(${v},${v - 4},${v + 8},.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    const lx = (off) => 128 + off / W * 256;
    g.fillStyle = '#f2c230'; g.fillRect(lx(0) - 3, 0, 2.5, 256); g.fillRect(lx(0) + 1, 0, 2.5, 256);   // double yellow
    g.fillStyle = '#efe6d6'; for (const off of o.dash || [-W / 4, W / 4]) for (let y = 0; y < 256; y += 64) g.fillRect(lx(off) - 2, y, 4, 34);
    g.fillRect(lx(-HALF + 0.35) - 2, 0, 4, 256); g.fillRect(lx(HALF - 0.35) - 2, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const root = new THREE.Group(); root.name = 'drive'; scene.add(root);
  // the road ribbon + curbs + sidewalks (one geometry per chunk)
  const CH = 160, chunks = [];
  function ribbon(s0, s1, offA, offB, y, mat, vRep = 0) { const n = Math.max(2, Math.ceil((s1 - s0) / 4) + 1), pos = [], uv = [], idx = [];
    for (let i = 0; i < n; i++) { const s = s0 + (s1 - s0) * i / (n - 1); const a = road.pos(s, offA, _v, y), ax = a.x, az = a.z; const b = road.pos(s, offB, _l, y); pos.push(ax, y, az, b.x, y, b.z); uv.push(0, vRep ? s / vRep : 0, 1, vRep ? s / vRep : 0); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.array[1] < 0) { idx.reverse(); g.setIndex(idx); g.computeVertexNormals(); }
    return new THREE.Mesh(g, mat); }
  const roadMat = new THREE.MeshLambertMaterial({ map: asphalt }), walkMat = felt('#8a8290'), curbMat = felt('#c9c0b0');
  if (!o.noRoad) for (let s = 0; s < LEN; s += CH) { const e = Math.min(LEN, s + CH + 0.5); const g = new THREE.Group(); g.add(ribbon(s, e, -HALF, HALF, 0.02, roadMat, 16));
    for (const sd of [-1, 1]) { g.add(ribbon(s, e, sd * HALF, sd * (HALF + 0.35), 0.12, curbMat)); g.add(ribbon(s, e, sd * (HALF + 0.35), sd * (HALF + SIDE), 0.12, walkMat)); } g.userData.s = [s, e]; root.add(g); chunks.push(g); }
  // ground: one big felt plane under it all
  { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 400, z1 - z0 + 400), felt(o.ground || TH.ground)); gr.rotation.x = -Math.PI / 2; gr.position.set((x0 + x1) / 2, -0.02, (z0 + z1) / 2); root.add(gr); road.bounds = { x0, x1, z0, z1 }; }

  // ---------------------------------------------------------------- cross streets + traffic lights
  const X = [];   // intersections: { s, light: 'g'|'y'|'r', t, poles }
  for (const s of o.cross || []) {
    const it = { s, t: R() * 8, state: 'g', lamps: [] }; X.push(it);
    if (!o.noRoad) { const cr = new THREE.Mesh(new THREE.PlaneGeometry(9, 90), roadMat); const p = road.at(s); cr.rotation.order = 'YXZ'; cr.rotation.set(-Math.PI / 2, p.yaw + Math.PI / 2, 0); cr.position.set(p.x, 0.03, p.z); root.add(cr);
      for (const sd of [-1, 1]) { const zebra = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.6), new THREE.MeshLambertMaterial({ map: zebraTex(), transparent: true })); zebra.rotation.order = 'YXZ'; zebra.rotation.set(-Math.PI / 2, p.yaw, 0); road.pos(s + sd * 6, 0, zebra.position, 0.05); root.add(zebra); } }
    // a light pole on the right corner, facing the driver
    const pole = new THREE.Group(); const pm = felt('#2f3236'); pole.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.2, 8), pm)); pole.children[0].position.y = 2.6;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4), pm); arm.position.set(0, 5.1, 0); arm.rotation.y = Math.PI / 2; pole.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.5), felt('#f2c230')); head.position.set(-3.6, 4.7, 0); pole.add(head);
    for (const [k, y, c] of [['r', 5.2, '#ff3a3a'], ['y', 4.7, '#ffb43a'], ['g', 4.2, '#3aff8a']]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.19, 12), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); l.position.set(-3.6, y, 0.26); l.userData = { k, c: new THREE.Color(c) }; pole.add(l); it.lamps.push(l); }
    const p = road.at(s - 6.5); road.pos(s - 6.5, HALF + 1.2, pole.position); pole.rotation.y = p.yaw + Math.PI; root.add(pole); it.pole = pole;
  }
  function zebraTex() { return zebraTex.t ||= (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#efe6d6'; for (let x = 4; x < 256; x += 22) g.fillRect(x, 2, 12, 28); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(); }
  const nearX = (s, ahead = 1) => X.find((it) => ahead ? it.s - s > 0 && it.s - s < 40 : Math.abs(it.s - s) < 6);

  // ---------------------------------------------------------------- scenery along both sides (merged per chunk)
  const halos = [], pools = [];   // streetlamp halo positions (one Points cloud)
  const lampEvery = o.lampEvery || 28;
  if (!o.noScenery) for (let s0 = 0; s0 < LEN; s0 += CH) {
    const mm = new Merge(), mg = new Merge(); const s1 = Math.min(LEN, s0 + CH);
    for (const sd of [-1, 1]) for (let s = s0 + R() * 4; s < s1; s += TH.lot * (0.8 + R() * 0.5)) {
      if (X.some((it) => Math.abs(it.s - s) < 9)) continue; if ((o.gapsAt || []).some(([a, b]) => s > a && s < b)) continue;
      const p = road.at(s), yaw = p.yaw + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), back = HALF + SIDE + TH.setback + R() * 2;
      const c = road.pos(s, sd * back, _v); const w = TH.lot * (0.55 + R() * 0.3), d = 6 + R() * 4, hh = (o.theme === 'strip' ? 4.5 : 3) + R() * (o.theme === 'strip' ? 3 : 1.5);
      const off = (u, v) => [c.x + Math.sin(yaw) * v + Math.cos(yaw) * u, c.z + Math.cos(yaw) * v - Math.sin(yaw) * u];   // u: along the street, v: away from it
      const [bx, bz] = off(0, d / 2); const wall = R.pick(TH.walls), roof = R.pick(TH.roofs);
      mm.box(w, hh, d, wall, ...[bx, hh / 2, bz], yaw);
      if (o.theme !== 'strip') { mm.add(roofGeo(w + 0.6, d + 0.6, 1.4 + R()), roof, new THREE.Matrix4().makeRotationY(yaw).setPosition(bx, hh, bz)); }
      else mm.box(w + 0.3, 0.4, d + 0.3, roof, bx, hh + 0.2, bz, yaw);
      // lit windows + door on the street face
      const nw = Math.max(1, Math.floor(w / 2.6));
      for (let i = 0; i < nw; i++) { const u = (i - (nw - 1) / 2) * 2.4; if (R() < 0.72) { const [wx, wz] = off(u, -0.04); mg.box(1.1, 1.0, 0.05, R.pick(TH.win), wx, hh * 0.55, wz, yaw); } }
      const [dx, dz] = off(w * 0.3 * (R() < 0.5 ? -1 : 1), -0.05); mm.box(0.9, 1.9, 0.06, '#5a3a2a', dx, 0.95, dz, yaw);
      if (o.theme === 'strip' || (TH.neon && R() < TH.neon)) { const [nx, nz] = off(0, -0.2); mg.box(w * 0.7, 0.7, 0.08, R.pick(TH.win), nx, hh + 0.9, nz, yaw); }
      // yard dressing
      if (R() < TH.fence) for (let k = -2; k <= 2; k++) { const [px, pz] = off(k * w / 5, -1.8); mm.box(0.12, 0.8, 0.12, '#efe6d6', px, 0.4, pz, yaw); }
      if (R() < TH.trees) { const [tx, tz] = off(w * 0.5 + 1, -1.6); mm.cyl(0.15, 0.2, 1.6, '#6a4a2a', tx, 0.8, tz, 6); mm.ball(1.1, R.pick(['#3a6a3a', '#4a7a3a', '#2f5a3e']), tx, 2.3, tz, 1, 1.1, 1, 7, 5); }
      if (R() < TH.cactus) { const [tx, tz] = off(-w * 0.5 - 1.2, -1.4); mm.cyl(0.25, 0.3, 2.2, '#4a8a4a', tx, 1.1, tz, 7); mm.cyl(0.14, 0.14, 0.9, '#4a8a4a', tx + 0.4, 1.4, tz, 6); }
    }
    for (let s = s0 + 6; s < s1; s += lampEvery) for (const sd of [-1, 1]) { if (sd > 0 && ((s / lampEvery) | 0) % 2) continue; const b = road.pos(s, sd * (HALF + 0.8), _v); mm.cyl(0.08, 0.1, 4.6, '#2f3236', b.x, 2.3, b.z, 6); const hd = road.pos(s, sd * (HALF - 0.4), _l); mm.box(0.9, 0.12, 0.3, '#2f3236', (b.x + hd.x) / 2, 4.6, (b.z + hd.z) / 2, road.at(s).yaw + Math.PI / 2); mg.ball(0.22, '#fff0c0', hd.x, 4.45, hd.z, 1, 0.6, 1, 6, 4); halos.push(hd.x, 4.4, hd.z); pools.push([hd.x, hd.z]); }
    const g = new THREE.Group(); g.add(mm.mesh(VCM()), mg.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); g.userData.s = [s0 - 20, s1 + 20]; root.add(g); chunks.push(g);
  }
  function roofGeo(w, d, rh) { const g = new THREE.BufferGeometry(), hw = w / 2, hd = d / 2; const P = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, -hw, rh, 0, hw, rh, 0];
    const I = [0, 4, 1, 1, 4, 5, 2, 5, 3, 3, 5, 4, 0, 3, 4, 1, 5, 2]; const pos = []; for (const i of I) pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }
  // lamp light pools on the road (one instanced quad) + halos (one Points)
  if (halos.length) { const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));
    root.add(new THREE.Points(hg, new THREE.PointsMaterial({ map: glowTex(), color: o.haloCol || '#ffd9a0', size: 5, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })));
    const pm = new THREE.InstancedMesh(new THREE.CircleGeometry(4.2, 16), new THREE.MeshBasicMaterial({ map: glowTex(), color: '#ffcf8a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), pools.length);
    const m = new THREE.Matrix4(); pools.forEach(([px, pz], i) => { m.makeRotationX(-Math.PI / 2).setPosition(px, 0.06, pz); pm.setMatrixAt(i, m); }); pm.renderOrder = 2; root.add(pm); }

  // ---------------------------------------------------------------- the player (car / horse / on foot) in road space
  const P = { s: o.s0 || 8, x: o.x0 ?? W / 4, v: 0, vx: 0, y: 0, vy: 0, boost: 0, boostCharge: 1, bumps: 0, nearMiss: 0, ranRed: 0, obj: o.player || waddleCar(o.color || '#e7b23a'), shake: 0, stun: 0, cruise: o.cruise || 20, max: o.max || 26, boostV: o.boostV || 34, done: false, onGround: true, fell: 0 };
  root.add(P.obj);

  // ---------------------------------------------------------------- the town's own life: traffic, cross traffic, pedestrians
  const CARCOL = ['#3a6aa8', '#c9302a', '#2fae8a', '#efe6d6', '#8a4fc0', '#e0705a', '#5a5a62', '#f2a6b8'];
  const npcs = [], peds = [], things = [];
  const nSame = o.traffic?.same ?? 8, nOn = o.traffic?.oncoming ?? 8, nCross = o.traffic?.cross ?? 2;
  for (let i = 0; i < nSame; i++) { const c = waddleCar(R.pick(CARCOL), '#f6efe0', { lite: true }); c.userData.beam.visible = false; root.add(c); npcs.push({ obj: c, s: 40 + (i + R()) * (LEN - 80) / nSame, x: R() < 0.5 ? W / 4 : W / 4 + (o.lanesRight > 1 ? W / 4 : 0), dir: 1, v0: 9 + R() * 6, v: 10, wait: 0, honk: 0 }); }
  for (let i = 0; i < nOn; i++) { const c = waddleCar(R.pick(CARCOL), '#f6efe0', { lite: true }); root.add(c); npcs.push({ obj: c, s: 60 + (i + R()) * (LEN - 80) / nOn, x: -W / 4, dir: -1, v0: 11 + R() * 6, v: 12, wait: 0 }); }
  const cross = [];
  for (const it of X) for (let k = 0; k < nCross; k++) { const c = waddleCar(R.pick(CARCOL), '#f6efe0', { lite: true }); c.userData.beam.visible = false; root.add(c); cross.push({ obj: c, it, u: -40 + R() * 80, dir: k % 2 ? 1 : -1, v: 10 + R() * 4 }); }
  for (let i = 0; i < (o.peds ?? 14); i++) { const f = folk(R); root.add(f); const sd = R() < 0.5 ? -1 : 1; peds.push({ obj: f, s: R() * LEN, side: sd, off: sd * (HALF + 1.2 + R() * (SIDE - 1.6)), v: (R() < 0.5 ? -1 : 1) * (0.8 + R() * 0.7), cross: null, t: R() * 10 }); }

  function lightAt(it) { return it.state; }
  function tickLights(dt) { for (const it of X) { it.t += dt; const cyc = it.t % 13; it.state = cyc < 7 ? 'g' : cyc < 8.6 ? 'y' : 'r'; for (const l of it.lamps) l.material.color.copy(l.userData.c).multiplyScalar(l.userData.k === it.state ? 1 : 0.16); } }
  function place(obj, s, x, yaw = 0, y = 0) { const p = road.at(s); road.pos(s, x, obj.position, y); obj.rotation.y = p.yaw + yaw; }

  // ---------------------------------------------------------------- things: obstacles + pickups placed in road space
  function add(t) { t.obj && root.add(t.obj); t.r ??= 1.6; t.w ??= 1.0; t.alive = true; things.push(t); if (t.obj) place(t.obj, t.s, t.x, t.yaw || 0, t.y || 0); return t; }

  const api = { road, P, X, npcs, peds, cross, things, root, add, place, nearX, lightAt, chunks, events: [], onBump: null, onRed: null, onNearMiss: null, tris: 0, LEN, W, HALF };

  // ---------------------------------------------------------------- per-frame
  api.update = (dt, t, ax = { x: 0 }, wantBoost = false) => {
    tickLights(dt);
    // player
    if (P.stun > 0) P.stun -= dt;
    if (wantBoost && P.boostCharge >= 1 && P.boost <= 0) { P.boost = o.boostTime || 2.2; P.boostCharge = 0; api.events.push('boost'); }
    if (P.boost > 0) P.boost -= dt; else P.boostCharge = Math.min(1, P.boostCharge + dt / (o.boostRecharge || 7));
    const target = P.done ? 0 : P.stun > 0 ? P.cruise * 0.35 : P.boost > 0 ? P.boostV : P.cruise + (o.slipstream ? slip() : 0);
    P.v = lerp(P.v, target, Math.min(1, dt * (P.v < target ? (o.accel || 1.4) : 2.5)));
    P.vx = lerp(P.vx, ax.x * (o.steer || 9) * (P.done ? 0 : 1), Math.min(1, dt * 8));
    const lim = HALF - 1.0 + (o.offroad || 0); P.x = clamp(P.x + P.vx * dt, -lim, lim);
    if (o.jump) { P.vy -= 24 * dt; P.y += P.vy * dt; const floor = api.floorAt ? api.floorAt(P.s, P.x) : 0; if (floor !== null && P.y <= floor && P.vy <= 0 && P.y > floor - 0.8) { P.y = floor; P.vy = 0; P.onGround = true; } else P.onGround = false; if (P.y < -6) { P.fell++; api.events.push('fell'); api.respawn?.(); } }
    P.s = Math.min(LEN - 2, P.s + P.v * dt);
    place(P.obj, P.s, P.x, -Math.atan2(P.vx, Math.max(4, P.v)) * 0.9, P.y);
    P.obj.rotation.z = -P.vx * 0.012; if (P.obj.userData.wheels) spinWheels(P.obj, P.v * dt);
    if (P.obj.userData.body) P.obj.userData.body.position.y = Math.abs(Math.sin(t * 13)) * 0.04 * (P.v / 20) + (P.shake > 0 ? Math.sin(t * 60) * 0.06 : 0);
    if (P.shake > 0) P.shake -= dt;
    // red lights
    for (const it of X) { if (!it.passed && P.s > it.s) { it.passed = true; if (it.state === 'r') { P.ranRed++; api.events.push('red'); api.onRed?.(it); } } }
    // NPC cars: keep lanes, follow the car ahead, stop at red/yellow, loop around the course
    for (const n of npcs) {
      let want = n.v0;
      if (n.dir > 0) { const it = X.find((q) => q.s - n.s > 0 && q.s - n.s < 14); if (it && it.state !== 'g') want = (it.s - 8 - n.s) > 0.5 ? Math.min(want, (it.s - 8 - n.s) * 1.2) : 0; }
      else { const it = X.find((q) => n.s - q.s > 0 && n.s - q.s < 14); if (it && it.state !== 'g') want = (n.s - (it.s + 8)) > 0.5 ? Math.min(want, (n.s - it.s - 8) * 1.2) : 0; }
      for (const m of npcs) if (m !== n && m.dir === n.dir && Math.abs(m.x - n.x) < 1.5) { const gap = (m.s - n.s) * n.dir; if (gap > 0 && gap < 9) want = Math.min(want, Math.max(0, (gap - 5) * 2)); }
      if (n.dir > 0 && Math.abs(P.x - n.x) < 2.8) { const gap = P.s - n.s; if (gap > 0 && gap < 14) want = Math.min(want, Math.max(0, P.v - 1 - (gap < 10 ? 4 : 0))); }   // never tailgate into the chase cam
      n.v = lerp(n.v, want, Math.min(1, dt * 3)); n.s += n.v * n.dir * dt;
      if (n.s > LEN - 2) n.s = 2; if (n.s < 2) n.s = LEN - 3;
      place(n.obj, n.s, n.x, n.dir > 0 ? 0 : Math.PI); spinWheels(n.obj, n.v * dt);
      // collisions with the player
      const ds = n.s - P.s, dx = n.x - P.x;
      if (Math.abs(ds) < 3.4 && Math.abs(dx) < 1.75 && P.y < 1.2) { bump(n, dx); }
      else if (!n.missed && Math.abs(ds) < 2 && Math.abs(dx) < 2.8 && P.v > 12) { n.missed = 1; P.nearMiss++; P.boostCharge = Math.min(1, P.boostCharge + 0.25); api.events.push('near'); api.onNearMiss?.(n); }
      if (Math.abs(ds) > 12) n.missed = 0;
    }
    // cross traffic: moves only while the main road is red (their green)
    for (const c of cross) { const approaching = c.dir > 0 ? (c.u > -10 && c.u < -6) : (c.u < 10 && c.u > 6); const go = c.it.state === 'r' || !approaching;
      c.v = lerp(c.v, go ? 11 : 0, Math.min(1, dt * 3));
      c.u += c.dir * c.v * dt; if (c.u > 45) c.u = -45; if (c.u < -45) c.u = 45;
      const p = road.at(c.it.s); road.pos(c.it.s + (c.dir > 0 ? -2 : 2), c.u, c.obj.position); c.obj.rotation.y = p.yaw + (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2); spinWheels(c.obj, c.v * dt);
      if (Math.abs(P.s - c.it.s) < 3 && Math.abs(P.x - c.u) < 2.3 && P.y < 1.2) bump(c, c.u - P.x, true); }
    // pedestrians: stroll the sidewalks, cross at the zebra when the main road is red
    for (const pd of peds) { pd.t += dt; const it = X.find((q) => Math.abs(q.s - 6 - pd.s) < 1.2);
      if (!pd.cross && it && it.state === 'r' && R() < 0.02) pd.cross = { it, from: pd.off, to: -pd.off, k: 0 };
      if (pd.cross) { pd.cross.k += dt / 6; pd.off = lerp(pd.cross.from, pd.cross.to, Math.min(1, pd.cross.k)); if (pd.cross.k >= 1) { pd.side *= -1; pd.cross = null; } place(pd.obj, pd.s, pd.off, -Math.PI / 2 * Math.sign(pd.side)); animPal(pd.obj, dt, t, { walk: 1 });
        if (Math.abs(pd.s - P.s) < 2.4 && Math.abs(pd.off - P.x) < 1.4 && P.v > 3 && P.y < 1) { P.v *= 0.3; P.stun = 0.5; api.events.push('ped'); pd.cross.k = Math.min(1, pd.cross.k + 0.2); } }
      else { pd.s += pd.v * dt; if (pd.s > LEN) pd.s = 0; if (pd.s < 0) pd.s = LEN; place(pd.obj, pd.s, pd.off, pd.v > 0 ? 0 : Math.PI); animPal(pd.obj, dt, t, { walk: Math.abs(pd.v) > 0.1 ? 1 : 0, wave: Math.abs(pd.s - P.s) < 8 && pd.t % 9 < 1.5 ? 1 : 0 }); }
      pd.obj.visible = Math.abs(pd.s - P.s) < 140; }
    // things
    for (const th of things) { if (!th.alive) continue; th.tick?.(dt, t, th, api); if (th.obj && th.moving) place(th.obj, th.s, th.x, th.yaw || 0, th.y || 0);
      if (Math.abs(th.s - P.s) < th.r && Math.abs(th.x - P.x) < th.w + 0.8 && (th.air || P.y < (th.h ?? 1.2))) { if (th.solid) { if (!th.hitT || t - th.hitT > 1) { th.hitT = t; P.v *= th.slow ?? 0.35; P.stun = th.stun ?? 0.6; P.shake = 0.4; P.bumps++; api.events.push('hit'); th.onHit?.(th, api); } } else { th.onHit?.(th, api); if (th.once !== false) { th.alive = false; if (th.obj) th.obj.visible = false; } } }
      if (th.obj && !th.moving) th.obj.visible = th.alive && Math.abs(th.s - P.s) < 180; }
    for (const c of chunks) { const [a, b] = c.userData.s; c.visible = b > P.s - (o.behind || 90) && a < P.s + (o.ahead || 260); }
    // cull far NPCs
    for (const n of npcs) n.obj.visible = Math.abs(n.s - P.s) < 160; for (const c of cross) c.obj.visible = Math.abs(c.it.s - P.s) < 160;
  };
  function slip() { for (const n of npcs) if (n.dir > 0 && Math.abs(n.x - P.x) < 1.6 && n.s - P.s > 4 && n.s - P.s < 14) return 4; return 0; }
  function bump(n, dx, crossing) { if (n.bumpT && performance.now() - n.bumpT < 900) return; n.bumpT = performance.now(); P.bumps++; P.v *= 0.35; P.stun = 0.8; P.shake = 0.5; P.vx = 0; P.x = clamp(P.x - Math.sign(dx || 1) * 1.2, -HALF + 1, HALF - 1); n.v = 0; api.events.push(crossing ? 'tbone' : 'bump'); api.onBump?.(n); }

  // ---------------------------------------------------------------- chase camera (portrait sits higher and further back)
  const camLook = new THREE.Vector3(), camPos = new THREE.Vector3(); let camInit = false;
  api.cam = (cam, dt, { dist = 8.5, height = 4.2, ahead = 9, portrait = cam.aspect < 1, lookY = 1.2 } = {}) => {
    const d = portrait ? dist * 1.35 : dist, hh = portrait ? height * 1.5 : height;
    const back = road.pos(Math.max(0, P.s - d), P.x * 0.6, _v, P.y + hh); const look = road.pos(Math.min(LEN, P.s + ahead), P.x * 0.8, _l, P.y + lookY);
    if (!camInit) { camPos.copy(back); camLook.copy(look); camInit = true; } const k = Math.min(1, dt * 6); camPos.lerp(back, k); camLook.lerp(look, Math.min(1, dt * 8));
    cam.position.copy(camPos); if (P.shake > 0) cam.position.y += Math.sin(performance.now() * 0.06) * 0.08; cam.lookAt(camLook);
    const f = (portrait ? 64 : 54) + (P.boost > 0 ? 7 : 0); if (Math.abs(cam.fov - f) > 0.1) { cam.fov = lerp(cam.fov, f, Math.min(1, dt * 4)); cam.updateProjectionMatrix(); }
  };
  api.resetCam = () => { camInit = false; };
  api.reset = (s0 = o.s0 || 8, x0 = o.x0 ?? W / 4) => { P.s = s0; P.x = x0; P.v = 0; P.vx = 0; P.y = 0; P.vy = 0; P.boost = 0; P.boostCharge = 1; P.bumps = 0; P.nearMiss = 0; P.ranRed = 0; P.stun = 0; P.done = false; P.fell = 0; for (const it of X) it.passed = false; for (const th of things) { th.alive = true; th.hitT = 0; if (th.obj) th.obj.visible = true; th.reset?.(th); } camInit = false; api.events.length = 0; };
  return api;
}
