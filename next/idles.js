// Run 15 idle variety: one randomized gesture every 4-12 s per character (weighted, no immediate repeats, de-synced),
// blended in/out over a calm rest idle. No mixers: the Wolf gets procedural bone offsets layered after its idle clip,
// everyone else gets transform offsets on groups/pivots they already have. window.__idle logs what played (QA).
import * as THREE from 'three';
const R = Math.random, S = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LOG = [], ALL = new Set();
if (typeof window !== 'undefined') window.__idle = { log: LOG, all: ALL, force: null, fast: 1 };

// pool: { name: [weight, seconds] }
export function gesturer(pool, tag = '?', o = {}) {
  const names = Object.keys(pool);
  const g = { tag, name: null, last: null, t: 0, dur: 1, k: 0, p: 0, wait: o.first ?? (1 + R() * 9), min: o.min ?? 4, max: o.max ?? 12, ph: R() * 50 };
  const pick = () => { let tot = 0; for (const n of names) if (n !== g.last) tot += pool[n][0]; let r = R() * tot;
    for (const n of names) { if (n === g.last) continue; r -= pool[n][0]; if (r <= 0) return n; } return names.find(n => n !== g.last) || names[0]; };
  g.update = (dt, idle = 1) => {
    const F = window.__idle; if (tag === 'wolf') F.wolfT = (F.wolfT || 0) + dt;
    if (F.force && F.force.tag === tag) { g.name = F.force.name; g.p = F.force.p ?? 0.5; g.k = 1; g.dur = pool[g.name]?.[1] || 2; g.t = g.p * g.dur; return g; }
    if (g.name) { g.t += dt; g.p = g.t / g.dur; const f = Math.min(0.35, 0.5 / g.dur);
      g.k = S(0, f, g.p) * (1 - S(1 - f, 1, g.p)) * idle;
      if (g.p >= 1 || idle < 0.05) { g.last = g.name; g.name = null; g.k = 0; g.wait = Math.max(1.2, g.min + R() * (g.max - g.min) - g.dur); } }   // start-to-start 4-12 s
    else if (idle > 0.9) { g.wait -= dt * (F.fast || 1); if (g.wait <= 0) { g.name = pick(); g.t = 0; g.p = 0; g.dur = pool[g.name][1]; LOG.push([tag, g.name, +performance.now().toFixed(0)]); if (LOG.length > 400) LOG.shift(); } }
    else g.wait = Math.max(g.wait, 1.5);
    return g;
  };
  if (tag === 'wolf') ALL.add(g); return g;
}

// ------------------------------------------------------------------ Wolf: richest pool, bone offsets in model space
export const WOLF_POOL = { look: [0.45, 3.2], scratch: [1.2, 2.8], stretch: [1, 3.0], shift: [1.3, 3.2], paw: [1.1, 2.6], tap: [1.1, 2.8], yawn: [0.8, 3.0], shrug: [1, 2.0], sun: [0.9, 2.8], sweater: [1, 2.4] };
const sin = Math.sin, PI = Math.PI;
// model axes: +X = Wolf's left, +Y up, +Z forward. [bone, rx, ry, rz] (radians, before envelope)
function wolfPose(n, p, t) {
  const hold = S(0, 0.3, p) * (1 - S(0.7, 1, p));
  switch (n) {
    case 'look': { const y = sin(p * PI * 2) * 0.5; return [['Spine', 0, y * 0.15, 0], ['neck', 0, y * 0.3, 0], ['Head', 0.04, y * 0.55, 0]]; }
    case 'scratch': { const s = sin(t * 15) * 0.14; return [['Head', 0.1, -0.1, 0.18], ['RightArm', -0.5, 0, -1.9], ['RightForeArm', 0, 0, -1.35 + s], ['RightHand', 0, 0, s]]; }
    case 'stretch': { const u = S(0.15, 0.55, p) * (1 - S(0.75, 1, p)); return [['Spine01', -0.12 * u, 0, 0], ['Spine', -0.1 * u, 0, 0], ['Head', -0.3 * u, 0, 0], ['RightArm', -0.4 * u, 0, -2.5 * u], ['LeftArm', -0.4 * u, 0, 2.5 * u], ['RightForeArm', 0, 0, -0.3 * u], ['LeftForeArm', 0, 0, 0.3 * u]]; }
    case 'shift': return [['Spine02', 0, 0, 0.07], ['Spine', 0, 0, -0.06], ['Head', 0, 0.08, -0.05], ['RightUpLeg', 0, 0, -0.05], ['RightLeg', 0.22, 0, 0], ['RightFoot', -0.18, 0, 0]];
    case 'paw': return [['Head', 0.38, 0.28, 0], ['neck', 0.12, 0.1, 0], ['LeftArm', -0.95, 0, -0.15], ['LeftForeArm', -1.25, 0, 0], ['LeftHand', 0.4 * sin(p * PI * 3), 0.5, 0]];
    case 'tap': { const b = Math.max(0, sin(t * 10)); return [['RightFoot', -0.35 * b, 0, 0], ['RightToeBase', -0.15 * b, 0, 0], ['Head', 0.03 * b, -0.12, 0.04]]; }
    case 'yawn': { const u = S(0.1, 0.5, p) * (1 - S(0.8, 1, p)); return [['Spine', -0.12 * u, 0, 0], ['Head', -0.45 * u, 0, 0.06 * u], ['RightArm', -1.05 * u, 0, 0.15 * u], ['RightForeArm', -1.6 * u, 0, 0]]; }
    case 'shrug': { const u = S(0.1, 0.35, p) * (1 - S(0.6, 0.95, p)); return [['LeftShoulder', 0, 0, 0.3 * u], ['RightShoulder', 0, 0, -0.3 * u], ['LeftForeArm', -0.9 * u, 0.5 * u, 0], ['RightForeArm', -0.9 * u, -0.5 * u, 0], ['Head', 0, 0, 0.14 * u]]; }
    case 'sun': return [['Spine', -0.08, 0.1, 0], ['neck', -0.15, 0.1, 0], ['Head', -0.5, 0.25, 0], ['RightArm', -1.2, 0, 0.25], ['RightForeArm', -1.5, 0, 0.3]];
    case 'sweater': { const tug = 0.12 * sin(p * PI * 6) * hold; return [['Head', 0.35, 0, 0], ['Spine', 0.05, 0, 0], ['LeftArm', -0.55 + tug, 0, -0.3], ['RightArm', -0.55 + tug, 0, 0.3], ['LeftForeArm', -0.7, -0.4, 0], ['RightForeArm', -0.7, 0.4, 0]]; }
  }
  return [];
}
const _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _wi = new THREE.Quaternion(), _p = new THREE.Quaternion(), _pi = new THREE.Quaternion(), _e = new THREE.Euler();
const ORDER = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
// rig: { root (model object, faces +Z), bones: name->Bone }. Call right after mixer.update (clips rewrite these bones every frame)
export function wolfIdle(rig, tag = 'wolf') {
  const g = gesturer(WOLF_POOL, tag, { first: 2 + R() * 3 });
  const W = { g, bones: rig.bones, root: rig.root };
  W.apply = (dt, t, idle) => {
    g.update(dt, idle); W.k = g.k; if (g.k < 0.002 || !g.name) return;
    const list = wolfPose(g.name, g.p, t); if (!list.length) return;
    list.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
    W.root.getWorldQuaternion(_w); _wi.copy(_w).invert();
    for (const [n, x, y, z] of list) { const b = W.bones[n]; if (!b) continue;
      _q.setFromEuler(_e.set(x * g.k, y * g.k, z * g.k, 'YXZ'));
      _q.premultiply(_w).multiply(_wi);                      // model-space rotation -> world
      b.parent.getWorldQuaternion(_p); _pi.copy(_p).invert();
      _q.premultiply(_pi).multiply(_p);                       // world -> parent space
      b.quaternion.premultiply(_q); }
  };
  return W;
}

// ------------------------------------------------------------------ transform gestures (rest-pose cast, object characters, felt pals, horses)
export const CAST_POOL = { look: [0.5, 3.0], nod: [1, 1.8], stretch: [1, 2.4], shift: [1.2, 2.8], hop: [0.8, 1.2], lean: [1, 2.2], shrug: [1, 1.6], sun: [0.8, 2.4] };
export const PROP_POOL = { wiggle: [1, 1.6], hop: [1, 1.2], lean: [1, 2.2], peek: [0.6, 2.6], shiver: [0.9, 1.2], tilt: [1, 2.2] };
// returns { rx, ry, rz, y (fraction of h), sy (scale-y multiplier), sx } offsets for the current gesture
export function castOffsets(g, t) {
  const o = { rx: 0, ry: 0, rz: 0, y: 0, sy: 1, sx: 1 }; if (!g.name || g.k < 0.002) return o; const k = g.k, p = g.p;
  switch (g.name) {
    case 'look': o.ry = sin(p * PI * 2) * 0.4 * k; break;
    case 'nod': o.rx = Math.max(0, sin(p * PI * 4)) * 0.1 * k; break;
    case 'stretch': o.sy = 1 + 0.06 * k; o.sx = 1 - 0.03 * k; o.rx = -0.05 * k; break;
    case 'shift': o.rz = 0.06 * k; break;
    case 'hop': { const h = Math.max(0, sin(p * PI)); o.y = 0.06 * h * k; o.sy = 1 + 0.04 * h * k; break; }
    case 'lean': o.rx = 0.1 * k; break;
    case 'shrug': { const u = Math.max(0, sin(p * PI)); o.sy = 1 + 0.035 * u * k; o.rz = 0.03 * sin(p * PI * 2) * k; break; }
    case 'sun': o.rx = -0.14 * k; o.ry = 0.15 * k; break;
    case 'wiggle': o.rz = sin(t * 14) * 0.07 * k; break;
    case 'peek': o.ry = sin(p * PI) * 0.6 * k; break;
    case 'shiver': o.rz = sin(t * 30) * 0.03 * k; o.sy = 1 - 0.02 * k; break;
    case 'tilt': o.rz = -0.08 * k; o.rx = 0.04 * k; break;
  }
  return o;
}
// felt pals (livingworld): arms/legs/head pivots
export const PAL_POOL = { look: [0.5, 2.8], scratch: [1.2, 2.2], stretch: [1, 2.4], tap: [1, 2.4], yawn: [0.8, 2.4], shrug: [1, 1.6], wave: [0.8, 1.8], sun: [0.8, 2.2] };
export function palGesture(u, g, t) {
  if (!g.name || g.k < 0.002) return; const k = g.k, p = g.p, A = u.arms, L = u.legs, hd = u.hd;
  switch (g.name) {
    case 'look': hd.rotation.y = sin(p * PI * 2) * 0.6 * k; break;
    case 'scratch': A[1].rotation.x += -2.6 * k; A[1].rotation.z += -0.5 * k + sin(t * 16) * 0.12 * k; hd.rotation.z += -0.15 * k; break;
    case 'stretch': A[0].rotation.x += -2.9 * k; A[1].rotation.x += -2.9 * k; hd.rotation.x = -0.25 * k; break;
    case 'tap': L[1].rotation.x += -Math.max(0, sin(t * 10)) * 0.25 * k; break;
    case 'yawn': A[0].rotation.x += -1.9 * k; hd.rotation.x = -0.35 * k; break;
    case 'shrug': A[0].rotation.z += -0.5 * k; A[1].rotation.z += 0.5 * k; hd.rotation.z += 0.12 * k; break;
    case 'wave': A[1].rotation.x += -2.7 * k; A[1].rotation.z += sin(t * 9) * 0.35 * k; break;
    case 'sun': hd.rotation.x = -0.4 * k; A[0].rotation.x += -2.2 * k; break;
  }
}
export const HORSE_POOL = { snort: [1, 1.4], dip: [1, 2.6], shake: [0.8, 1.2], lean: [1, 2.4], look: [0.5, 2.6], paw: [1, 2.0] };
