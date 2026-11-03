// horses.js — Scott's horse (ref: 360s/horse/bear_horse_01.mp4): a stylised clay horse with a bright orange-red body,
// a shaggy black mane with a blue-green sheen, big round googly eyes, a long droopy rounded snout, small pointed ears,
// a thin tail, chunky straight legs with black hooves and a slight barrel body. Built procedurally in hand-flat felt
// (0 Meshy credits). One builder makes both horses in town:
//   • GRAVY, Bear's pet horse: lives at a hitching post in a little corral in Bear's front yard. Walk up, RIDE; same
//     controls as walking but faster, gallop bob, procedural 4-leg walk/gallop cycle (no mixer, 0 rigs). DISMOUNT like GET OUT.
//   • the HUGE Horse Plaza statue (horse.js): the same design, recoloured purple + blue, fuzzy-melted.
// SWAPPABLE: set HORSE_MODEL.pet / .statue to a GLB path (or ?petglb= / ?statueglb=) and that model replaces the
// procedural body when it loads; if it fails or is null, the procedural build stays. Both get redone from the video later.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const HORSE_MODEL = { pet: null, statue: null };   // e.g. 'models/bear_horse.glb' once Meshy is topped up
{ const Q = new URLSearchParams(location.search); if (Q.get('petglb')) HORSE_MODEL.pet = Q.get('petglb'); if (Q.get('statueglb')) HORSE_MODEL.statue = Q.get('statueglb'); }

// colours sampled from the 360 frames (body median #ee3e01, mane #08150a, sheen #032120 lifted a touch for felt)
export const PET_COL = { body: '#ee3e01', body2: '#d83804', mane: '#0d1915', sheen: '#13544e', hoof: '#141212', eyeW: '#f3eee4', pupil: '#0d0b0b' };
export const STATUE_COL = { body: '#7a48b4', body2: '#6a3ca2', mane: '#2a56c2', sheen: '#58a4e6', hoof: '#2b4aa8', eyeW: '#ece6f6', pupil: '#1c1630' };

const C = new THREE.Color(), C2 = new THREE.Color();
const M4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function part(list, geo, mat4, color, color2) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(mat4); if (g.attributes.uv) g.deleteAttribute('uv');
  const p = g.attributes.position, n = p.count, ca = new Float32Array(n * 3); C.set(color); C2.set(color2 || color);
  for (let i = 0; i < n; i++) { const k = 0.5 + 0.5 * Math.sin(p.getX(i) * 9 + p.getY(i) * 5 + p.getZ(i) * 7), v = 0.95 + 0.05 * Math.sin(p.getX(i) * 23 + p.getY(i) * 17);
    ca[i * 3] = (C.r + (C2.r - C.r) * k) * v; ca[i * 3 + 1] = (C.g + (C2.g - C.g) * k) * v; ca[i * 3 + 2] = (C.b + (C2.b - C.b) * k) * v; }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); list.push(g); return g;
}
// tapered limb a->b (radii ra, rb); sz squashes it sideways (world z) for the flat snout
function limb(list, a, b, ra, rb, color, color2, seg = 12, sz = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(rb, ra, L, seg, 3, true); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  const m = new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)); if (sz !== 1) m.premultiply(new THREE.Matrix4().makeScale(1, 1, sz).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0)));
  return part(list, g, m, color, color2);
}
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// leg layout (horse-local: faces +x, ground y=0, hips at y=HIP)
export const HIP = 0.8;
const LEGS = [[0.36, 0.15], [0.36, -0.15], [-0.38, 0.15], [-0.38, -0.15]];   // LF RF LH RH  (z+ = horse's left)

// ---------------------------------------------------------------- geometry
// returns { torso: BufferGeometry, legs: [BufferGeometry x4] (hip at origin), eyes: [{p, n}], tris }
export function horseGeometry(col, o = {}) {
  const melt = !!o.melt, S = new THREE.SphereGeometry(1, o.lo ? 12 : 18, o.lo ? 8 : 12), SL = new THREE.SphereGeometry(1, 10, 7);
  const T = [], B = col.body, B2 = col.body2;
  // barrel body (slight barrel), chest, rump, belly
  part(T, S, M4(0, 0.97, 0, 0.5, 0.25, 0.235), B, B2);
  part(T, S, M4(0.3, 0.99, 0, 0.27, 0.255, 0.215), B, B2);
  part(T, S, M4(-0.34, 1.0, 0, 0.3, 0.26, 0.235), B, B2);
  part(T, S, M4(0.0, 0.9, 0, 0.42, 0.2, 0.22), B, B2);
  // neck: tall + nearly upright, a touch forward; thick at the base
  limb(T, [0.3, 1.0, 0], [0.5, 1.88, 0], 0.18, 0.125, B, B2, 16);
  part(T, S, M4(0.34, 1.12, 0, 0.17, 0.2, 0.17), B, B2);
  // head: small cranium, then the long droopy rounded snout down + forward to a broad flat-ended muzzle
  part(T, S, M4(0.53, 1.96, 0, 0.13, 0.135, 0.12), B, B2);
  limb(T, [0.56, 1.92, 0], [0.84, 1.52, 0], 0.11, 0.15, B, B2, 18, 0.85);
  part(T, S, M4(0.87, 1.48, 0, 0.155, 0.12, 0.13, 0, 0, -0.55), B, B2);
  part(T, SL, M4(0.98, 1.43, 0.055, 0.024, 0.026, 0.02), col.body2); part(T, SL, M4(0.98, 1.43, -0.055, 0.024, 0.026, 0.02), col.body2);   // nostril dimples
  // small pointed ears
  for (const s of [1, -1]) { const g = new THREE.ConeGeometry(0.04, 0.15, 10); part(T, g, M4(0.5, 2.1, s * 0.07, 1, 1, 0.62, s * -0.28, 0, -0.12), B, B2); }
  // thin tail, hanging
  limb(T, [-0.6, 1.1, 0], [-0.68, 0.86, 0], 0.035, 0.028, B, B2, 8); limb(T, [-0.68, 0.86, 0], [-0.66, 0.6, 0.01], 0.028, 0.02, B, B2, 8);
  part(T, SL, M4(-0.66, 0.57, 0.01, 0.035, 0.06, 0.035), B, B2);
  // shaggy mane: a crest along the back of the neck + long strands falling down the left side, forelock between the ears
  const nkA = [0.38, 1.12], nkB = [0.47, 2.0];
  for (let i = 0; i < 6; i++) { const t = i / 5; part(T, S, M4(nkA[0] + (nkB[0] - nkA[0]) * t - 0.1, nkA[1] + (nkB[1] - nkA[1]) * t, 0.01, 0.07, 0.12, 0.085), col.mane, col.sheen); }
  const NS = o.lo ? 28 : 54;   // long shaggy strands, mostly down the left, some right, longest near the top (like the ref)
  for (let i = 0; i < NS; i++) { const t = (i + rnd(i) * 0.6) / NS, rx = nkA[0] + (nkB[0] - nkA[0]) * t - 0.13, ry = nkA[1] + (nkB[1] - nkA[1]) * t + 0.05;
    const side = i % 3 === 0 ? -1 : 1, len = 0.3 + 0.42 * rnd(i + 9) * (0.35 + 0.65 * t), zz = side * (0.03 + 0.06 * rnd(i + 3));
    const c1 = rnd(i + 17) < 0.4 ? col.sheen : col.mane;
    limb(T, [rx, ry, zz], [rx - 0.06 - 0.07 * rnd(i + 5), ry - len, zz + side * (0.1 + 0.06 * t)], 0.05, 0.012, c1, col.mane, 6); }
  for (let i = 0; i < 9; i++) limb(T, [0.47, 2.1, (i - 4) * 0.014], [0.6 + 0.04 * rnd(i), 1.99 - 0.08 * rnd(i + 2), (i - 4) * 0.035], 0.03, 0.008, i % 3 ? col.mane : col.sheen, col.mane, 6);
  // eyes (positions only; the googly-eye meshes are made separately so the statue's pupils can glow in WILD)
  const eyes = [1, -1].map(s => ({ p: new THREE.Vector3(0.6, 2.04, s * 0.1), n: new THREE.Vector3(0.62, 0.3, s * 0.72).normalize(), s }));
  // legs: chunky + straight, black hooves (hip at origin)
  const legGeo = (k) => { const L = []; limb(L, [0, 0.02, 0], [0, -HIP + 0.1, 0], 0.085, 0.074, B, B2, 12); part(L, S, M4(0, -0.02, 0, 0.1, 0.1, 0.095), B, B2);
    const h = new THREE.CylinderGeometry(0.082, 0.088, 0.1, 14); part(L, h, M4(0.006, -HIP + 0.05, 0, 1, 1, 1), col.hoof);
    if (melt) part(L, S, M4(0.02, -HIP + 0.012, 0, 0.16, 0.025, 0.14), col.hoof);
    return L; };
  if (melt) {   // fuzzy melt: drips off the belly, chin + flanks, and a puddle at the hooves
    for (const [x, z, l] of [[0.12, 0.12, 0.2], [-0.2, -0.1, 0.15], [0.32, -0.06, 0.24], [-0.45, 0.12, 0.13]]) part(T, S, M4(x, 0.74 - l * 0.4, z, 0.05, l, 0.05), B, B2);
    for (const [x, y, z, l] of [[0.84, 1.45, 0.03, 0.12], [0.6, 1.2, 0.12, 0.1], [-0.45, 0.95, 0.24, 0.13], [0.1, 0.92, -0.25, 0.12], [0.33, 1.5, -0.1, 0.1]]) part(T, S, M4(x, y - l * 0.5, z, 0.035, l, 0.035), B, B2);
    part(T, S, M4(0.0, -HIP + HIP + 0.008, 0, 0.95, 0.025, 0.42), col.body2);   // puddle (world y ~0)
    for (const [x, z] of [[-0.8, 0.33], [0.7, -0.34], [0.9, 0.3], [-0.1, -0.42]]) part(T, S, M4(x, 0.01, z, 0.2, 0.02, 0.14), col.body2);
  }
  const fin = (list) => mergeGeometries(list, false);   // keep the primitives' smooth normals (clay, not facets)
  const legs = LEGS.map((_, k) => fin(legGeo(k)));
  let torso = fin(T);
  if (melt) {   // everything merged (legs placed), then slump + bulge low + lumpy felt
    const all = [torso, ...legs.map((g, k) => g.clone().translate(LEGS[k][0], HIP, LEGS[k][1]))];
    torso = mergeGeometries(all, false); const p = torso.attributes.position, s = 2.8;   // deform in the old statue's units
    for (let i = 0; i < p.count; i++) { let x = p.getX(i) * s, y = p.getY(i) * s, z = p.getZ(i) * s;
      const sag = 0.08 * Math.max(0, y - 1.0); y -= sag * (0.6 + 0.4 * Math.sin(x * 1.7));
      const low = Math.max(0, 1.0 - y) * 0.12; x *= 1 + low * 0.15; z *= 1 + low * 0.45;
      const n = (Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - x * 0.9) + 0.5 * Math.sin(y * 3.3 + z * 2.6)) * 0.03; p.setXYZ(i, (x + n) / s, (y + n * 0.6) / s, (z + n) / s); }
    torso.deleteAttribute('normal'); torso = mergeVertices(torso, 1e-4); torso.computeVertexNormals();   // smooth after the slump
  }
  const tc = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  return { torso, legs: melt ? [] : legs, eyes, tris: Math.round(tc(torso) + (melt ? 0 : legs.reduce((a, g) => a + tc(g), 0)) + 2 * 3 * 140) };
}

// googly eye: a round body-colour ball, a white ring + big black pupil on its outer face
function googly(col, bodyMat, pupilMat, whiteMat, lo) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, lo ? 12 : 16, lo ? 8 : 12), bodyMat); ball.scale.set(1, 1, 0.75); g.add(ball);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 20), whiteMat); ring.rotation.x = Math.PI / 2; ring.position.z = 0.072; g.add(ring);
  const pup = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), pupilMat); pup.scale.set(1, 1, 0.45); pup.position.set(0.004, -0.004, 0.08); g.add(pup);
  return { g, pup };
}

// ---------------------------------------------------------------- a whole horse (Group facing +x). opts: col, melt, feltMat, LOW, pupilMat
export function buildHorse(o) {
  const { col, feltMat } = o, G = buildHorseParts(o);
  return G;
}
export function buildHorseParts(o) {
  const { col, feltMat, LOW } = o;
  const geo = horseGeometry(col, { melt: o.melt, lo: o.lo ?? LOW });
  const mat = feltMat('#ffffff', { vertexColors: true, bumpScale: o.melt ? 0.9 : 0.5 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = new THREE.Mesh(geo.torso, mat); torso.castShadow = !LOW; torso.receiveShadow = true; body.add(torso);
  const legs = geo.legs.map((g, k) => { const piv = new THREE.Group(); piv.position.set(LEGS[k][0], HIP, LEGS[k][1]); const m = new THREE.Mesh(g, mat); m.castShadow = !LOW; piv.add(m); root.add(piv); return piv; });
  const bodyMat = feltMat(col.body, { bumpScale: 0.3 }), whiteMat = new THREE.MeshStandardMaterial({ color: col.eyeW, roughness: 0.55 });
  const pupilMat = o.pupilMat || new THREE.MeshStandardMaterial({ color: col.pupil, roughness: 0.3, metalness: 0 });
  const eyes = geo.eyes.map(e => { const { g, pup } = googly(col, bodyMat, pupilMat, whiteMat, LOW); g.position.copy(e.p); g.lookAt(e.p.clone().add(e.n)); body.add(g); return { g, pup, s: e.s }; });
  return { root, body, torso, legs, eyes, mat, pupilMat, tris: geo.tris };
}
// swap in a GLB when one is configured (keeps the procedural build if it fails). fit: target length along x
export function trySwapModel(H, path, fit = 1.75) {
  if (!path) return Promise.resolve(false);
  return new GLTFLoader().loadAsync(path).then((g) => { const m = g.scene, bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3());
    const k = fit / Math.max(sz.x, sz.z); m.scale.setScalar(k); m.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k);
    if (sz.z > sz.x) m.rotation.y = Math.PI / 2;
    H.torso.visible = false; for (const l of H.legs) l.visible = false; for (const e of H.eyes) e.g.visible = false; H.body.add(m); H.model = m; return true; })
    .catch((e) => { console.warn('horse model failed, keeping the procedural horse', path, e?.message); return false; });
}

// ---------------------------------------------------------------- GRAVY: Bear's pet horse
export const PET_NAME = 'GRAVY';
export function createPetHorse(C0) {
  const { scene, TS, feltMat, LOW, colliders, audio } = C0;
  const SC = 1.12;   // ~1.45 m at the back, ~2.4 m to the ears
  const H = buildHorseParts({ col: PET_COL, feltMat, LOW });
  H.root.scale.setScalar(SC); H.root.name = 'bear_horse'; scene.add(H.root);
  // home: a hitching post in a little corral in Bear's front yard (east of the drive), gate open to the sidewalk
  const HOME = { x: 8.2, z: 51.4, yaw: -Math.PI / 2 };   // facing the street (+z)
  TS.place('bear_corral', 8.0, 51.0, 0, (k) => {
    const W = '#8a5a36', W2 = '#a8744a';
    const x0 = -2.0, x1 = 2.0, z0 = -3.0, z1 = 3.0;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [x0, 0], [x1, 0], [0, z0], [-1.2, z1], [1.2, z1]]) k.beam([x, 0, z], [x, 1.15, z], 0.07, W);
    for (const y of [0.55, 1.0]) { k.beam([x0, y, z0], [x1, y, z0], 0.045, W2); k.beam([x0, y, z0], [x0, y, z1], 0.045, W2); k.beam([x1, y, z0], [x1, y, z1], 0.045, W2);
      k.beam([x0, y, z1], [-1.2, y, z1], 0.045, W2); k.beam([1.2, y, z1], [x1, y, z1], 0.045, W2); }   // gate gap on the street side
    k.aab(x0, 0, z0, x1, 0.03, z1, '#c8b27e');                                    // trodden straw
    k.beam([-0.9, 0, -1.9], [-0.9, 1.05, -1.9], 0.08, W); k.beam([0.9, 0, -1.9], [0.9, 1.05, -1.9], 0.08, W); k.beam([-1.0, 1.0, -1.9], [1.0, 1.0, -1.9], 0.06, W2);   // hitching rail
    k.aab(-1.7, 0, -2.85, -0.7, 0.42, -2.35, '#6f8fa8'); k.aab(-1.62, 0.36, -2.78, -0.78, 0.4, -2.42, '#9cc4dc');   // water trough
    for (let i = 0; i < 3; i++) k.blob(1.3, 0.25 + i * 0.12, -2.4, 0.45 - i * 0.08, 0.2, 0.4 - i * 0.07, i % 2 ? '#d8bd6a' : '#e4ca78');   // hay
    k.mark('spot_gravy', 0, 1.6);
  }, { lodNear: 80, melt: false });
  TS.spots.bearhorse = { x: HOME.x, z: HOME.z + 1.6, ry: 0, map: "Bear's horse", label: 'RIDE ' + PET_NAME };
  // solid corral sides (circles along the rails; the street side is the gate)
  for (let i = 0; i <= 6; i++) { colliders?.push({ x: 6.0, z: 48 + i, r: 0.18 }, { x: 10.0, z: 48 + i, r: 0.18 }); }
  for (let i = 0; i <= 4; i++) colliders?.push({ x: 6 + i, z: 48, r: 0.18 });
  colliders?.push({ x: 6.6, z: 54, r: 0.18 }, { x: 9.4, z: 54, r: 0.18 });

  const P = { H, name: PET_NAME, mounted: false, pos: new THREE.Vector3(HOME.x, 0, HOME.z), yaw: HOME.yaw + Math.PI / 2, speed: 0, ph: 0, home: HOME, tris: H.tris, rides: 0 };
  // wolfState-style yaw: forward = (sin yaw, cos yaw); horse group faces +x -> rotation.y = yaw - PI/2
  const place = () => { H.root.position.set(P.pos.x, 0, P.pos.z); H.root.rotation.y = P.yaw - Math.PI / 2; };
  place();
  trySwapModel(H, HORSE_MODEL.pet, 1.75);
  // speed curve while mounted (same stick as walking): trot up to ~6, gallop ~13.5
  P.target = (mag) => mag < 0.08 ? 0 : mag > 0.75 ? 13.5 : 4.6 * (mag / 0.75) + 1.0;
  P.saddle = new THREE.Vector3(-0.06, 1.21, 0);   // horse-local, top of the back
  const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
  // clop: short knocky noise burst through the sfx bus
  let nb = null; const clop = (vol) => { const A = audio; const ctx = A?.ctx; if (!ctx || !A.BUS?.sfx) return;
    if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate * 0.06 | 0, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6); }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; s.playbackRate.value = 0.8 + Math.random() * 0.4; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 2.5; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(A.BUS.sfx); s.start(); };
  let lastFoot = [0, 0, 0, 0];
  P.update = (dt, t, w, ws) => {
    if (P.mounted) { P.pos.set(ws.pos.x, 0, ws.pos.z); P.yaw = ws.yaw; P.speed = ws.speed; }
    else P.speed += (0 - P.speed) * (1 - Math.exp(-dt * 6));
    place();
    const sp = P.speed, gal = THREE.MathUtils.smoothstep(sp, 6.5, 10.5), move = THREE.MathUtils.clamp(sp / 1.2, 0, 1);
    const cad = sp < 0.2 ? 0 : THREE.MathUtils.lerp(0.9 + sp * 0.18, 1.9 + sp * 0.05, gal);   // strides per second
    P.ph = (P.ph + dt * cad) % 1;
    // walk/trot: diagonal pairs (LF+RH, RF+LH); gallop: rotary (LH, RH, LF, RF close together)
    const walkOff = [0, 0.5, 0.5, 0], galOff = [0.55, 0.65, 0.0, 0.1], amp = THREE.MathUtils.lerp(0.42, 0.72, gal) * move;
    for (let k = 0; k < 4; k++) { const off = walkOff[k] * (1 - gal) + galOff[k] * gal, a = (P.ph + off) * Math.PI * 2;
      H.legs[k].rotation.z = Math.sin(a) * amp;
      const down = Math.cos(a) > 0 ? 1 : 0; if (down && !lastFoot[k] && move > 0.3 && (P.mounted || sp > 0.5)) clop(0.25 + 0.25 * gal); lastFoot[k] = down; }
    // body: gallop bob + rock, head nod; idle: breathe + tail swish + slow head dip
    const bob = Math.abs(Math.sin(P.ph * Math.PI * 2)) * (0.025 + 0.07 * gal) * move;
    H.body.position.y = bob + Math.sin(t * 1.6) * 0.004; H.body.rotation.z = Math.sin(P.ph * Math.PI * 2) * 0.05 * gal * move + (1 - move) * Math.sin(t * 0.45) * 0.015;
    for (const L of H.legs) L.position.y = HIP + bob * 0.6;
    for (const e of H.eyes) e.pup.position.x = 0.004 + Math.sin(t * 2.7 + e.s + sp) * 0.006 * (1 + 2 * w);   // googly wobble
    P.bob = bob * SC;
  };
  // where the Wolf sits (world matrix). The rider pose is applied by main.js
  const _one = new THREE.Vector3(1, 1, 1);
  P.seatMatrix = (out) => { H.root.updateMatrixWorld(true); _v.copy(P.saddle).applyMatrix4(H.body.matrixWorld); return out.compose(_v, H.root.quaternion, _one); };
  P.near = (p, r = 2.6) => !P.mounted && Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < r;
  return P;
}
