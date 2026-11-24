// paw_mesh.js — run 9c: the Wolf's first-person paw as ONE soft blended felt-fur mesh (pure math, no three.js import,
// so bw_tmp/pawtest.mjs can test the real triangles). The static hand = a smooth union of paw_core's primitives
// polygonised with surface nets; the remote (swept over the hand's whole slide range) is carved out 0.8 mm proud, so
// the hand can never cut into it. The thumb is a single smooth tapered sweep along a parabola through B-K-T (convex,
// so it always rides ABOVE the old proven segments) with a rounded padded tip; both carry fur tufts + curved claws.
// Output arrays: pos, nrm, dir (strand direction), tip (0..1 lighter tips), pad (0..1 dark pad), idx.
import { THUMB, V3, clawSpecs } from './paw_core.js';
const { add, sub, mul, len, nrm } = V3;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hash = (i) => { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// signed distances
const sdEll = (p, c, r) => { const a = (p[0] - c[0]) / r[0], b = (p[1] - c[1]) / r[1], d = (p[2] - c[2]) / r[2]; return (Math.sqrt(a * a + b * b + d * d) - 1) * (r.m ?? (r.m = Math.min(r[0], r[1], r[2]))); };
function sdRoundCone(p, A, Bp, r1, r2) {   // iq's round cone (tapered capsule), scalar math (hot path)
  const bx = Bp[0] - A[0], by = Bp[1] - A[1], bz = Bp[2] - A[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const px = p[0] - A[0], py = p[1] - A[1], pz = p[2] - A[2], y = px * bx + py * by + pz * bz, z = y - l2;
  const xx = px * l2 - bx * y, xy = py * l2 - by * y, xz = pz * l2 - bz * y, x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1; }
const sdBox = (p, mn, mx) => { const q0 = Math.max(mn[0] - p[0], p[0] - mx[0]), q1 = Math.max(mn[1] - p[1], p[1] - mx[1]), q2 = Math.max(mn[2] - p[2], p[2] - mx[2]);
  const o0 = Math.max(q0, 0), o1 = Math.max(q1, 0), o2 = Math.max(q2, 0); return Math.sqrt(o0 * o0 + o1 * o1 + o2 * o2) + Math.min(Math.max(q0, q1, q2), 0); };
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
// the remote in HAND coordinates, swept over the slide range (dy -0.01..0.125), + the button/rim layer, 0.8 mm margin
export const CARVE = [{ min: [-0.033, -0.1075 - 0.125, -0.012], max: [0.033, 0.1075 + 0.01, 0.012] }, { min: [-0.031, -0.1 - 0.125, 0.0], max: [0.031, 0.1 + 0.01, 0.0185] }];
const MARGIN = 0.0008;
export function handField(prims, k = 0.0085) {
  const P = prims.filter((p) => p.m === 'fur');
  return (p, info) => { let d = 1e9, best = -1, bd = 1e9;
    for (let i = 0; i < P.length; i++) { const pr = P[i], di = pr.t === 'ell' ? sdEll(p, pr.c, pr.r) : sdRoundCone(p, pr.a, pr.b, pr.ra, pr.rb); d = d > 1e8 ? di : smin(d, di, pr.seg === 2 ? 0.005 : k); if (di < bd) { bd = di; best = i; } }
    let c = 1e9; for (const b of CARVE) c = Math.min(c, sdBox(p, b.min, b.max)); d = Math.max(d, MARGIN - c);
    if (info) { info.prim = P[best]; } return d; };
}
const primBox = (pr, e) => pr.t === 'ell' ? [sub(pr.c, add(pr.r, [e, e, e])), add(pr.c, add(pr.r, [e, e, e]))] : (() => { const r = Math.max(pr.ra, pr.rb) + e; return [[0, 1, 2].map((i) => Math.min(pr.a[i], pr.b[i]) - r), [0, 1, 2].map((i) => Math.max(pr.a[i], pr.b[i]) + r)]; })();
// surface nets over a box grid
function surfaceNets(f, lo, hi, h, boxes) {
  const n = [0, 1, 2].map((i) => Math.ceil((hi[i] - lo[i]) / h) + 1), [nx, ny, nz] = n, F = new Float32Array(nx * ny * nz).fill(h * 4), I = (x, y, z) => x + nx * (y + ny * z);
  const ix = (v, i) => clamp(Math.floor((v - lo[i]) / h), 0, n[i] - 1), done = new Uint8Array(nx * ny * nz);   // only evaluate near the primitives (empty space stays "outside")
  for (const [a, b] of boxes) for (let z = ix(a[2], 2); z <= ix(b[2], 2) + 1 && z < nz; z++) for (let y = ix(a[1], 1); y <= ix(b[1], 1) + 1 && y < ny; y++) for (let x = ix(a[0], 0); x <= ix(b[0], 0) + 1 && x < nx; x++) { const k = I(x, y, z); if (!done[k]) { done[k] = 1; F[k] = f([lo[0] + x * h, lo[1] + y * h, lo[2] + z * h]); } }
  const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [], idx = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    const v = C.map((c) => F[I(x + c[0], y + c[1], z + c[2])]); let s = [0, 0, 0], cnt = 0;
    for (const [a, b] of E) if ((v[a] < 0) !== (v[b] < 0)) { const t = v[a] / (v[a] - v[b]); for (let i = 0; i < 3; i++) s[i] += C[a][i] + (C[b][i] - C[a][i]) * t; cnt++; }
    if (!cnt) continue; vid[I(x, y, z)] = pos.length; pos.push([lo[0] + (x + s[0] / cnt) * h, lo[1] + (y + s[1] / cnt) * h, lo[2] + (z + s[2] / cnt) * h]); }
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const v0 = F[I(x, y, z)];
    for (let ax = 0; ax < 3; ax++) { const o = [0, 0, 0]; o[ax] = 1; const v1 = F[I(x + o[0], y + o[1], z + o[2])]; if ((v0 < 0) === (v1 < 0)) continue;
      const u = [0, 0, 0], w = [0, 0, 0]; u[(ax + 1) % 3] = 1; w[(ax + 2) % 3] = 1;
      const q = [[0, 0, 0], u, add(u, w), w].map((d) => vid[I(x - d[0], y - d[1], z - d[2])]); if (q.some((k) => k < 0)) continue;
      if (v0 < 0) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]); } }
  return { pos, idx };
}
const grad = (f, p, e = 0.0004) => nrm([f(add(p, [e, 0, 0])) - f(add(p, [-e, 0, 0])), f(add(p, [0, e, 0])) - f(add(p, [0, -e, 0])), f(add(p, [0, 0, e])) - f(add(p, [0, 0, -e]))]);
// one fur tuft = a little bent 3-sided spike (base ring + mid + tip), lit with the surface normal
function tuft(out, base, n, dir, L, r, seed, tip0 = 0.25, lift = 0.55) {
  const t1 = nrm(cross(n, dir)), t2 = nrm(cross(n, t1)), ax = nrm(add(mul(n, lift), mul(dir, 0.85))), mid = add(base, mul(ax, L * 0.55)), end = add(add(base, mul(ax, L)), mul(dir, L * 0.25 * (0.5 + seed)));
  const b0 = out.pos.length / 3; for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + seed * 6, o = add(mul(t1, Math.cos(a) * r), mul(t2, Math.sin(a) * r)); out.v(add(sub(base, mul(ax, r)), o), n, dir, tip0, 0); }
  out.v(mid, n, dir, (tip0 + 1) / 2, 0); out.v(end, n, dir, 1, 0);
  for (let k = 0; k < 3; k++) { const a = b0 + k, b = b0 + (k + 1) % 3; out.idx.push(a, b, b0 + 4); }   // 3-sided spike to the bent tip (double-sided material); vertex b0+3 kept for layout
}
function claw(out, a, d, bend, L, r) {   // curved tapering hook
  const N = 5, S = 6, b0 = out.pos.length / 3; d = nrm(d); let side = nrm(cross(d, bend)); if (!isFinite(side[0])) side = [0, 1, 0];
  for (let i = 0; i <= N; i++) { const t = i / N, c = add(add(a, mul(d, L * t)), mul(nrm(bend), L * 0.45 * t * t)), tg = nrm(add(d, mul(nrm(bend), 0.9 * t))), up = nrm(cross(side, tg)), rr = r * (1 - t * 0.92);
    for (let k = 0; k < S; k++) { const ang = k / S * Math.PI * 2, nn = add(mul(side, Math.cos(ang)), mul(up, Math.sin(ang))); out.v(add(c, mul(nn, rr)), nn, tg, 0, 0); } }
  for (let i = 0; i < N; i++) for (let k = 0; k < S; k++) { const p = b0 + i * S + k, q = b0 + i * S + (k + 1) % S; out.idx.push(p, q, p + S, q, q + S, p + S); }
}
const builder = () => { const o = { pos: [], nrm: [], dir: [], tip: [], pad: [], idx: [] }; o.v = (p, n, d, t, pd) => { o.pos.push(...p); o.nrm.push(...n); o.dir.push(...d); o.tip.push(t); o.pad.push(pd); }; return o; };
export function buildHand(prims, opts = {}) {
  const h = opts.h ?? 0.0028, f = handField(prims), lo = [-0.07, -0.168, -0.09], hi = [0.074, 0.0, 0.032];
  const sn = surfaceNets(f, lo, hi, h, prims.filter((p) => p.m === 'fur').map((p) => primBox(p, 0.009 + 2 * h))), fur = builder(), cl = builder(), info = {};
  // one pass of smoothing (keeps carve contacts outside: clamp any vertex that ends up closer than the margin)
  const nb = sn.pos.map(() => []); for (let i = 0; i < sn.idx.length; i += 3) for (let k = 0; k < 3; k++) nb[sn.idx[i + k]].push(sn.idx[i + (k + 1) % 3]);
  const sm = sn.pos.map((p, i) => { if (!nb[i].length) return p; let s = [0, 0, 0]; for (const j of nb[i]) s = add(s, sn.pos[j]); const q = add(mul(p, 0.5), mul(s, 0.5 / nb[i].length)); let c = 1e9; for (const b of CARVE) c = Math.min(c, sdBox(q, b.min, b.max)); return c > MARGIN * 0.9 ? q : p; });
  sm.forEach((p) => { const n = grad(f, p); f(p, info); const pr = info.prim; let d = pr.t === 'cap' ? nrm(sub(pr.b, pr.a)) : pr.seg === 2 ? [0.4, 0, 1] : [0.05, 1, -0.15];
    d = nrm(sub(d, mul(n, dot(d, n)))); let tp = 0.08; if (pr.f !== undefined) { tp = pr.seg === 2 ? 0.75 : pr.seg === 1 ? 0.3 + 0.4 * clamp(dot(sub(p, pr.a), nrm(sub(pr.b, pr.a))) / len(sub(pr.b, pr.a)), 0, 1) : 0.12; }
    fur.v(p, n, d, tp, pr.seg === 2 ? clamp((dot(n, [0.9, 0, -0.2]) - 0.2) * 2, 0, 1) * 0.8 : 0); });
  fur.idx.push(...sn.idx); fur.nSurf = sn.idx.length / 3;
  // fur tufts breaking the outline (denser at the wrist and the outer edges); never within 5 mm of the remote
  const nv = sm.length;
  for (let i = 0; i < nv; i++) { const p = sm[i]; let c = 1e9; for (const b of CARVE) c = Math.min(c, sdBox(p, b.min, b.max)); if (c < 0.0055) continue;
    const wrist = p[1] < -0.108, edge = p[0] < -0.052 || p[2] < -0.07 || p[0] > 0.05, pr = wrist ? 0.26 : edge ? 0.2 : 0.06; if (hash(i) > pr) continue;
    const n = fur.nrm.slice(i * 3, i * 3 + 3), d = fur.dir.slice(i * 3, i * 3 + 3), s = hash(i + 7.3); tuft(fur, p, n, d, (wrist ? 0.0048 : 0.0036) * (0.7 + 0.6 * s), 0.0011, s, fur.tip[i] + 0.15); }
  // the fluffy ruff poking out of the ribbed mustard cuff
  const cuff = prims.find((p) => p.m === 'cuff'), ax = nrm(sub(cuff.a, cuff.b)), u = nrm(cross(ax, [1, 0, 0])), w = nrm(cross(ax, u));
  for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2, s = hash(i + 101), rad = add(mul(u, Math.cos(a)), mul(w, Math.sin(a))), base = add(add(cuff.a, mul(rad, cuff.ra * (0.82 + 0.1 * s))), mul(ax, -0.004 + 0.004 * hash(i + 3)));
    tuft(fur, base, rad, nrm(add(ax, mul(rad, 0.35))), 0.008 + 0.006 * s, 0.0024, s, 0.35); }
  for (const c of clawSpecs()) claw(cl, c.a, c.d, c.bend, c.L, c.r);
  return { fur, claw: cl };
}
// ---- the thumb: fixed topology, positions re-filled every frame
const TR = 22, TS = 16, TCAP = 6, TT = 72;
const thumbTufts = Array.from({ length: TT }, (_, i) => { const t = 0.06 + 0.86 * hash(i + 41), side = hash(i + 77); return { t, a: Math.PI * (t > 0.75 ? 0.1 + 0.8 * side : -0.22 + 1.44 * side), s: hash(i + 9) }; });   // all round the outline, top-only near the pressing tip
export function thumbTopology() {   // index buffers for the thumb fur + claw (built once)
  const fi = [], N = TR + TCAP; for (let i = 0; i < N - 1; i++) for (let k = 0; k < TS; k++) { const p = i * TS + k, q = i * TS + (k + 1) % TS; fi.push(p, p + TS, q, q, p + TS, q + TS); }   // N rings (sweep + cap)
  const capV = N * TS, L = (N - 1) * TS; for (let k = 0; k < TS; k++) fi.push(L + k, capV, L + (k + 1) % TS);
  let b0 = capV + 1; for (let j = 0; j < TT; j++, b0 += 5) for (let k = 0; k < 3; k++) { const a = b0 + k, b = b0 + (k + 1) % 3; fi.push(a, b, b0 + 4); }
  const ci = []; for (let i = 0; i < 5; i++) for (let k = 0; k < 6; k++) { const p = i * 6 + k, q = i * 6 + (k + 1) % 6; ci.push(p, q, p + 6, q, q + 6, p + 6); }
  return { fur: fi, claw: ci, nFur: b0, nClaw: 36 };
}
export function buildThumb(B, K, T) {
  const P1 = sub(mul(K, 2), mul(add(B, T), 0.5)), at = (t) => add(add(mul(B, (1 - t) * (1 - t)), mul(P1, 2 * t * (1 - t))), mul(T, t * t)), tg = (t) => nrm(add(mul(sub(P1, B), 2 * (1 - t)), mul(sub(T, P1), 2 * t)));
  const rad = (t) => t < 0.5 ? THUMB.rBase + (THUMB.rMid - THUMB.rBase) * t / 0.5 : THUMB.rMid + (THUMB.rTip - THUMB.rMid) * (t - 0.5) / 0.5;
  const out = builder(), frame = (t) => { const d = tg(t); let s = cross(d, [0, 0, 1]); s = len(s) < 1e-4 ? [1, 0, 0] : nrm(s); return { d, s, u: nrm(cross(s, d)) }; };
  for (let i = 0; i < TR; i++) { const t = i / (TR - 1), c = at(t), { d, s, u } = frame(t), r = rad(t) * (1 + 0.05 * Math.sin(t * Math.PI));   // a little plump in the middle
    for (let k = 0; k < TS; k++) { const a = k / TS * Math.PI * 2, n = add(mul(s, Math.cos(a)), mul(u, Math.sin(a))), rr = r * (1 + 0.16 * Math.sin(t * Math.PI) * Math.max(0, n[2]) + 0.06 * Math.sin(t * Math.PI) * Math.abs(dot(n, s))); out.v(add(c, mul(n, rr)), n, d, 0.1 + 0.55 * t * t, t > 0.55 ? clamp((-n[2] - 0.15) * 1.6, 0, 1) * clamp((t - 0.55) * 4, 0, 1) : 0); } }
  const { d, s, u } = frame(1);
  for (let i = 1; i <= TCAP; i++) { const ph = i / (TCAP + 0) * Math.PI / 2 * (i === TCAP ? 0.999 : 1), c = add(T, mul(d, THUMB.rTip * Math.sin(ph))), r = THUMB.rTip * Math.cos(ph);
    for (let k = 0; k < TS; k++) { const a = k / TS * Math.PI * 2, rn = add(mul(s, Math.cos(a)), mul(u, Math.sin(a))), n = nrm(add(mul(rn, Math.cos(ph)), mul(d, Math.sin(ph)))); out.v(add(c, mul(rn, r)), n, d, 0.7, clamp((-n[2] - 0.1) * 1.8, 0, 1)); } }
  out.v(add(T, mul(d, THUMB.rTip)), d, d, 0.7, clamp(-d[2] * 1.8, 0, 1));
  for (const tf of thumbTufts) { const c = at(tf.t), fr = frame(tf.t), n = add(mul(fr.s, Math.cos(tf.a)), mul(fr.u, Math.sin(tf.a))), r = rad(tf.t); tuft(out, add(c, mul(n, r * 0.9)), n, fr.d, 0.0046 * (0.7 + 0.6 * tf.s), 0.0012, tf.s, 0.3 + 0.5 * tf.t, 1.0); }
  const cl = builder(), up = nrm(add(mul(d, 0.55), [0, 0, 0.85])), base = add(T, mul(up, THUMB.rTip * 0.8));
  claw(cl, base, nrm(add(d, [0, 0, 0.45])), [0, 0, -1], 0.0085, 0.0024);
  return { fur: out, claw: cl };
}
