// Sunspots · Gutter Bowl: pure bowling logic (no three.js) so it can be unit-tested in node.
//   scoreGame(rolls, frames)   correct ten-pin scoring (strike/spare bonuses, bonus balls in the LAST frame; frames=3 for the quick game)
//   rollState(rolls, frames)   whose ball is next: frame, ball, fresh rack?, game over?
//   readSwipe(points, W, H)    a phone swipe -> { power, aim, hook } (or null if it wasn't a throw)
//   BowlSim                    a small custom 2D pin-action sim (ball + 10 pins as discs, falling pins topple neighbours, kickbacks, pit)

// ------------------------------------------------------------------ scoring
export function rollState(rolls, frames = 10) {
  let i = 0;
  for (let f = 0; f < frames; f++) {
    const last = f === frames - 1;
    if (!last) {
      if (i >= rolls.length) return { frame: f, ball: 0, fresh: true, done: false, pinsUp: 10 };
      if (rolls[i] === 10) { i += 1; continue; }
      if (i + 1 >= rolls.length) return { frame: f, ball: 1, fresh: false, done: false, pinsUp: 10 - rolls[i] };
      i += 2; continue;
    }
    const r = rolls.slice(i);   // last frame: up to 3 balls
    if (r.length === 0) return { frame: f, ball: 0, fresh: true, done: false, pinsUp: 10 };
    if (r.length === 1) return r[0] === 10 ? { frame: f, ball: 1, fresh: true, done: false, pinsUp: 10 } : { frame: f, ball: 1, fresh: false, done: false, pinsUp: 10 - r[0] };
    if (r.length === 2) {
      if (r[0] === 10) return r[1] === 10 ? { frame: f, ball: 2, fresh: true, done: false, pinsUp: 10 } : { frame: f, ball: 2, fresh: false, done: false, pinsUp: 10 - r[1] };
      if (r[0] + r[1] === 10) return { frame: f, ball: 2, fresh: true, done: false, pinsUp: 10 };
      return { frame: f, ball: 2, done: true, pinsUp: 0 };
    }
    return { frame: f, ball: 3, done: true, pinsUp: 0 };
  }
  return { frame: frames, ball: 0, done: true, pinsUp: 0 };
}

export function scoreGame(rolls, frames = 10) {
  const out = []; let i = 0, run = 0, ok = true;
  const at = (k) => rolls[k];
  for (let f = 0; f < frames; f++) {
    const last = f === frames - 1, fr = { rolls: [], marks: [], total: null };
    if (i >= rolls.length) { out.push(fr); ok = false; continue; }
    if (!last) {
      if (at(i) === 10) { fr.rolls = [10]; fr.marks = ['X'];
        if (at(i + 1) != null && at(i + 2) != null && ok) { run += 10 + at(i + 1) + at(i + 2); fr.total = run; } else ok = false; i += 1; }
      else { const a = at(i), b = at(i + 1); fr.rolls = b == null ? [a] : [a, b]; fr.marks = [mk(a)]; if (b != null) fr.marks.push(a + b === 10 ? '/' : mk(b));
        if (b == null) ok = false;
        else if (a + b === 10) { if (at(i + 2) != null && ok) { run += 10 + at(i + 2); fr.total = run; } else ok = false; }
        else if (ok) { run += a + b; fr.total = run; }
        i += 2; }
    } else {
      const r = rolls.slice(i, i + 3); fr.rolls = r;
      fr.marks = r.map((v, k) => {
        if (k === 0) return v === 10 ? 'X' : mk(v);
        if (k === 1) return r[0] === 10 ? (v === 10 ? 'X' : mk(v)) : (r[0] + v === 10 ? '/' : mk(v));
        const freshBefore = r[0] === 10 ? r[1] === 10 : r[0] + r[1] === 10;   // ball 3 on a full rack?
        if (freshBefore) return v === 10 ? 'X' : mk(v);
        return r[1] + v === 10 ? '/' : mk(v);
      });
      const st = rollState(rolls, frames);
      if (st.done && ok) { run += r.reduce((s, v) => s + v, 0); fr.total = run; } else ok = false;
      i += r.length;
    }
    out.push(fr);
  }
  const st = rollState(rolls, frames);
  return { frames: out, total: run, done: st.done, state: st };
}
const mk = (v) => v === 0 ? '-' : String(v);

// ------------------------------------------------------------------ touch: swipe -> throw
// points: [{x, y, t}] in CSS px / ms, in the order they were touched. Up the screen = toward the pins.
export function readSwipe(pts, W, H) {
  if (!pts || pts.length < 2) return null;
  const a = pts[0], z = pts[pts.length - 1], dy = a.y - z.y, dx = z.x - a.x;
  if (dy < H * 0.12) return null;                                   // too short / sideways / downward: not a throw
  let k = pts.length - 1; while (k > 0 && z.t - pts[k - 1].t < 110) k--;   // release speed over the last ~110 ms
  const b = pts[Math.max(0, k - 1)], dt = Math.max(16, z.t - b.t), v = Math.hypot(z.x - b.x, z.y - b.y) / dt * 1000 / H;   // screen heights / s
  const power = clamp((v - 0.5) / 3.0, 0.04, 1);
  const aim = clamp(Math.atan2(dx, dy) / 0.5, -1, 1);
  // hook: how much the end of the swipe bends away from its start (positive = bends right)
  const len = []; let s = 0; len.push(0); for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); len.push(s); }
  const pick = (u) => { const L = u * s; let i = 1; while (i < len.length - 1 && len[i] < L) i++; return pts[i]; };
  const p0 = pts[0], p1 = pick(0.4), p2 = pick(0.6), p3 = z;
  const ang = (p, q) => Math.atan2(q.x - p.x, p.y - q.y);
  let d = ang(p2, p3) - ang(p0, p1); d = Math.atan2(Math.sin(d), Math.cos(d));
  let hook = clamp(d / 0.75, -1, 1); if (Math.abs(hook) < 0.08) hook = 0;
  return { power, aim, hook, speed: v };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ pin action
// Lane coordinates: x across (0 = lane centre, + right), z along (0 = foul line, negative toward the pins), metres.
export const LANE = { L: 15.0, half: 0.533, gutter: 0.235, rowGap: 0.264, pinGap: 0.3048, ballR: 0.109, pinR: 0.06, headR: 0.045, pinH: 0.38 };
export const PIN_SPOTS = (() => { const s = []; for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) s.push([(k - r / 2) * LANE.pinGap, -LANE.L - r * LANE.rowGap]); return s; })();
// standard pin numbers for the spots above (row 0: 1; row 1: 2,3; row 2: 4,5,6; row 3: 7,8,9,10 from left to right)
export const PIN_NUM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ADJ = [[1, 2], [0, 2, 3, 4], [0, 1, 4, 5], [1, 4, 6, 7], [1, 2, 3, 5, 7, 8], [2, 4, 8, 9], [3, 7], [3, 4, 6, 8], [4, 5, 7, 9], [5, 8]];
export function isSplit(standing) {   // head pin down and the standing pins fall in 2+ separate groups (7-10, 4-6, ...)
  if (standing[0]) return false; const idx = standing.map((s, i) => s ? i : -1).filter(i => i >= 0); if (idx.length < 2) return false;
  const seen = new Set([idx[0]]), q = [idx[0]]; while (q.length) { const i = q.pop(); for (const j of ADJ[i]) if (standing[j] && !seen.has(j)) { seen.add(j); q.push(j); } }
  return seen.size < idx.length;
}

export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export class BowlSim {
  constructor(opt = {}) { this.R = opt.rand || Math.random; this.on = opt.on || (() => {}); this.pins = []; this.ball = null; this.t = 0; this.rack(); }
  rack(mask = null) {   // mask[i] = true to stand pin i (null = full rack)
    this.pins = PIN_SPOTS.map(([x, z], i) => ({ i, x, z, vx: 0, vz: 0, y: 0, vy: 0, up: !mask || !!mask[i], gone: !(!mask || mask[i]), tilt: 0, tv: 0, dir: 0, spin: 0, wob: 0, wobV: 0, wobDir: 0, hit: false }));
    for (const p of this.pins) if (p.gone) { p.up = false; }
    this.ball = null; this.t = 0; this.settleT = 0; this.passed = false; this.dodger = -1; this.dodged = 0;
  }
  // throw: x = release position across the lane, speed m/s, aim -1..1 (initial angle), hook -1..1, mass kg
  launch({ x = 0, z = -0.35, speed = 7.5, aim = 0, hook = 0, mass = 6.4 }) {
    this.ball = { x, z, vx: speed * aim * 0.032, vz: -speed, hook, mass, gutter: false, pit: false, roll: 0, sx: 0 };
    this.t = 0; this.settleT = 0; this.passed = false;
  }
  standing() { return this.pins.map(p => !p.gone && p.up); }
  downCount() { return this.pins.filter(p => !p.gone && !p.up).length; }   // knocked this roll (pins already gone before the roll are excluded)
  settled() { if (!this.ball) return false; if (this.t > 9 || this.settleT > 3.2) return true; if (this.settleT < 1.1) return false;
    return this.pins.every(p => p.gone || p.pit || (p.up ? Math.abs(p.wob) < 0.03 && Math.abs(p.wobV) < 0.3 : Math.hypot(p.vx, p.vz) < 0.08 && p.y === 0 && p.tilt >= Math.PI / 2 - 0.01)); }
  step(dt) { const n = Math.max(1, Math.ceil(dt / 0.004)); for (let k = 0; k < n; k++) this._step(dt / n); }
  _step(dt) {
    const { L, half, gutter, ballR, pinR, headR } = LANE, b = this.ball; this.t += dt;
    if (b && !b.pit) {
      // hook phase: the ball skids for the first ~40% of the lane, then the oil runs out and it bites
      const u = -b.z / L, bite = u < 0.38 ? 0 : Math.min(1, (u - 0.38) / 0.3);
      if (!b.gutter) b.vx += b.hook * 1.25 * bite * dt * (8 / Math.max(5, -b.vz));
      b.x += b.vx * dt; b.z += b.vz * dt; b.roll += -b.vz * dt / ballR;
      if (!b.gutter && Math.abs(b.x) > half - ballR * 0.2 && b.z > -L + 0.2) { b.gutter = true; b.x = Math.sign(b.x) * (half + gutter * 0.5); b.vx = 0; this.on('gutter', 1); }
      if (b.gutter) b.x += (Math.sign(b.x) * (half + gutter * 0.5) - b.x) * Math.min(1, dt * 20);
      const wall = half + gutter + 0.02; if (Math.abs(b.x) > wall - ballR) { b.x = Math.sign(b.x) * (wall - ballR); b.vx *= -0.3; this.on('wall', 0.6); }
      if (b.z < -L - 0.264 * 3 - 0.75) { b.pit = true; this.on('pit', 1); }
      if (b.z < -L + 0.2) this.passed = true;
      // the googly-eyed pin: steps aside when it sees the ball coming
      if (this.dodger >= 0 && !this.dodged) { const p = this.pins[this.dodger];
        if (p.up && !p.gone && p.z - b.z > -2.4 && p.z < b.z && Math.abs(p.x - b.x) < 0.24) { this.dodged = 0.0001; p.dodgeTo = p.x + (p.x >= b.x ? 1 : -1) * 0.12; this.on('dodge', p.i); } }
    }
    if (this.dodged > 0 && this.dodged < 0.3) { this.dodged += dt; const p = this.pins[this.dodger]; if (p.up) p.x += (p.dodgeTo - p.x) * Math.min(1, dt * 14); }
    if (b && (b.pit || b.gutter) && this.passed) this.settleT += dt;
    // pins: topple, hop, slide, spin
    for (const p of this.pins) { if (p.gone) continue;
      if (p.up) { if (p.wob > 0.0005 || Math.abs(p.wobV) > 0.001) { p.wobV += (-90 * p.wob - 3 * p.wobV) * dt; p.wob += p.wobV * dt;
          if (p.wob > 0.24) { this.fell(p, p.wobDir, 1.2); } else if (p.wob < 0) { p.wob = -p.wob * 0.5; p.wobV = -p.wobV * 0.5; } }
        p.x += p.vx * dt; p.z += p.vz * dt; const f = Math.exp(-dt * 12); p.vx *= f; p.vz *= f; }
      else { if (p.tilt < Math.PI / 2) { p.tv += 14 * Math.sin(p.tilt + 0.15) * dt; p.tilt += p.tv * dt; if (p.tilt >= Math.PI / 2) { p.tilt = Math.PI / 2; p.tv = 0; this.on('clunk', Math.min(1, Math.hypot(p.vx, p.vz) / 3 + 0.3)); } }
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= 9.8 * dt; if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy) > 0.6 ? -p.vy * 0.3 : 0; }
        const sp = Math.hypot(p.vx, p.vz), fr = (p.y > 0 ? 0.4 : p.tilt >= Math.PI / 2 - 0.01 ? 2.6 : 1.2) * dt; if (sp > 0) { const k = Math.max(0, sp - fr) / sp; p.vx *= k; p.vz *= k; }
        p.dir += p.spin * dt; p.spin *= Math.exp(-dt * 0.9); }
      // kickbacks + back of the deck
      const wall = half + gutter + 0.02; if (p.z < -L + 0.7 && Math.abs(p.x) > wall - pinR) { p.x = Math.sign(p.x) * (wall - pinR); if (Math.sign(p.vx) === Math.sign(p.x)) { this.on('wall', Math.min(1, Math.abs(p.vx) / 4)); p.vx *= -0.55; } if (p.up) this.fell(p, Math.atan2(-p.x, 0), 1); }
      if (p.z < -L - 0.264 * 3 - 0.45 || Math.abs(p.x) > wall + 0.3) { if (p.up) this.fell(p, Math.atan2(p.vx, p.vz), 1); if (p.z < -L - 1.4 || Math.abs(p.x) > wall + 0.3) { p.pit = true; } }
    }
    // collisions: ball vs pins, pins vs pins (pin bases + the heads of falling pins)
    const circ = []; for (const p of this.pins) { if (p.gone || p.pit) continue; circ.push({ p, x: p.x, z: p.z, r: pinR, head: false });
      if (!p.up && p.tilt > 0.25) { const s = Math.sin(p.tilt) * 0.3; circ.push({ p, x: p.x + Math.sin(p.dir) * s, z: p.z + Math.cos(p.dir) * s, r: headR, head: true }); } }
    if (b && !b.pit && !b.gutter) for (const c of circ) { const dx = c.x - b.x, dz = c.z - b.z, d = Math.hypot(dx, dz), m = ballR + c.r; if (d >= m || d === 0) continue;
      const nx = dx / d, nz = dz / d, p = c.p, rv = (b.vx - p.vx) * nx + (b.vz - p.vz) * nz; const push = (m - d);
      p.x += nx * push * 0.85; p.z += nz * push * 0.85; b.x -= nx * push * 0.15; b.z -= nz * push * 0.15;
      if (rv <= 0) continue; const mp = c.head ? 0.8 : 1.5, e = 0.72, J = (1 + e) * rv / (1 / b.mass + 1 / mp);
      b.vx -= J / b.mass * nx; b.vz -= J / b.mass * nz; this.kick(p, J / mp * nx, J / mp * nz, J / mp); this.on('ball', Math.min(1, rv / 7)); }
    for (let i = 0; i < circ.length; i++) for (let j = i + 1; j < circ.length; j++) { const A = circ[i], B = circ[j]; if (A.p === B.p) continue;
      const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), m = A.r + B.r; if (d >= m || d === 0) continue;
      const nx = dx / d, nz = dz / d, pa = A.p, pb = B.p, push = (m - d) * 0.5; pa.x -= nx * push; pa.z -= nz * push; pb.x += nx * push; pb.z += nz * push;
      const va = this.cv(A), vb = this.cv(B), rv = (va[0] - vb[0]) * nx + (va[1] - vb[1]) * nz; if (rv <= 0) continue;
      const J = (1 + 0.6) * rv / 2; this.kick(pa, -J * nx, -J * nz, J); this.kick(pb, J * nx, J * nz, J); if (J > 0.25) this.on('pin', Math.min(1, J / 3)); }
  }
  cv(c) { const p = c.p; if (!c.head) return [p.vx, p.vz]; const w = Math.cos(p.tilt) * 0.3 * p.tv; return [p.vx + Math.sin(p.dir) * w, p.vz + Math.cos(p.dir) * w]; }   // head moves as the pin tips over
  kick(p, dvx, dvz, mag) {
    if (p.up) { if (mag > 0.32) { p.vx += dvx * 0.6; p.vz += dvz * 0.6; this.fell(p, Math.atan2(dvx, dvz), mag); }
      else { p.wobV += mag * 9; p.wobDir = Math.atan2(dvx, dvz); p.vx += dvx * 0.2; p.vz += dvz * 0.2; } return; }
    p.vx += dvx; p.vz += dvz; if (mag > 1.2 && p.y === 0) p.vy += Math.min(2.2, mag * 0.35); p.spin += (this.R() - 0.5) * mag * 6;
  }
  fell(p, dir, mag) { if (!p.up) return; p.up = false; p.dir = dir; p.tilt = 0.05; p.tv = 2.5 + Math.min(6, mag * 1.6); p.spin = (this.R() - 0.5) * mag * 4; p.hit = true;
    if (mag > 2) p.vy = Math.min(2.4, mag * 0.28); this.on('fall', p.i); }
}
