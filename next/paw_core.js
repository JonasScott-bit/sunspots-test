// paw_core.js — run 9b: the Wolf's first-person paw on the ÆVISION remote, as pure data + math (no three.js import),
// so livingtv.js builds the meshes from it AND a Node test (bw_tmp/pawtest.mjs) can prove there is no interpenetration.
// Coordinates are remote-local (metres): the remote body is x ±0.033, y ±0.1075, z ±0.012; buttons sit on the face,
// z 0.012..0.018 (pressed: 0.008..0.014). Primitives: ell {c,r:[rx,ry,rz]}, cap {a,b,ra,rb} (tapered capsule), cone {a(base),b(tip),r}.
export const FACE_TOP = 0.018, PRESS = 0.004;
export const THUMB = { rBase: 0.0125, rMid: 0.011, rTip: 0.0088, L0: 0.075, B0: [0.05, -0.072, 0.012], rest: [0.019, -0.011], arch: 0.034, kAt: 0.42 };
const CONTACT = FACE_TOP + THUMB.rTip + 0.0006;   // tip-sphere centre height when it just touches a button top
export const TIP_Z = { contact: CONTACT, hover: CONTACT + 0.004, press: CONTACT - PRESS };
export const REMOTE_BOXES = [
  { min: [-0.033, -0.1075, -0.012], max: [0.033, 0.1075, 0.012] },   // body
  { min: [-0.03, -0.1, 0.0115], max: [0.03, 0.1, 0.0135] },          // face rim
  { min: [-0.025, 0.105, -0.01], max: [0.025, 0.115, 0.01] },        // IR window
];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]), nrm = (a) => mul(a, 1 / (len(a) || 1)), lerp = (a, b, t) => add(a, mul(sub(b, a), t));
export const V3 = { add, sub, mul, len, nrm, lerp };

// static hand (hand-local; the whole hand slides along the remote's length by dy so the thumb can reach every button)
export function handPrims() {
  const P = [];
  P.push({ t: 'ell', c: [-0.002, -0.07, -0.04], r: [0.043, 0.047, 0.023], m: 'fur' });          // palm, behind the remote
  P.push({ t: 'ell', c: [0.049, -0.082, -0.016], r: [0.0145, 0.027, 0.018], m: 'fur' });          // thenar pad (thumb root)
  P.push({ t: 'ell', c: [0.012, -0.124, -0.05], r: [0.031, 0.03, 0.028], m: 'fur' });             // wrist
  for (let i = 0; i < 4; i++) {   // four chunky fingers curling round the LEFT side; tips peek over the face edge, dark claws
    const y = -0.03 - i * 0.019, r = 0.0105 - i * 0.0006, rt = r * 0.86;
    const J = [[-0.016, y, -0.042], [-0.043, y, -0.03], [-0.0485, y, -0.004], [-0.0445, y, 0.014]];
    P.push({ t: 'cap', a: J[0], b: J[1], ra: r, rb: r, m: 'fur' }, { t: 'cap', a: J[1], b: J[2], ra: r, rb: r * 0.95, m: i % 2 ? 'fur' : 'fur2' }, { t: 'cap', a: J[2], b: J[3], ra: r * 0.95, rb: rt, m: 'fur' });
    const d = nrm(sub(J[3], J[2])), base = add(J[3], mul(d, rt * 0.62)); P.push({ t: 'cone', a: base, b: add(base, mul(nrm(add(d, [0.25, 0, 0])), 0.0095)), r: 0.0033, m: 'claw' });
  }
  P.push({ t: 'cap', a: [0.02, -0.15, -0.062], b: [0.03, -0.185, -0.08], ra: 0.036, rb: 0.037, m: 'cuff' });          // ribbed sweater cuff
  P.push({ t: 'cap', a: [0.03, -0.185, -0.08], b: [0.09, -0.44, -0.21], ra: 0.042, rb: 0.052, m: 'sleeve' });         // puffy mustard fleece sleeve
  return P;
}
export function slideFor(x, y) { const dx = THUMB.B0[0] - x, dz = THUMB.B0[2] - CONTACT, h = Math.sqrt(Math.max(0, THUMB.L0 ** 2 - dx * dx - dz * dz)); return Math.max(-0.01, Math.min(0.125, y - h - THUMB.B0[1])); }
// thumb chain: base on the thenar, knuckle arched up over the face, padded tip on the button; claw on the BACK of the tip (never pokes the button)
export function thumbPrims(T, dy) {
  const B = add(THUMB.B0, [0, dy, 0]), K = add(lerp(B, T, THUMB.kAt), [0, 0, THUMB.arch]);
  const d = nrm(sub(T, K)), up = nrm(add(mul(d, 0.55), [0, 0, 0.85])), base = add(T, mul(up, THUMB.rTip * 0.72));
  return { B, K, T, prims: [
    { t: 'cap', a: B, b: K, ra: THUMB.rBase, rb: THUMB.rMid, m: 'fur' }, { t: 'cap', a: K, b: T, ra: THUMB.rMid, rb: THUMB.rTip, m: 'fur2' },
    { t: 'cone', a: base, b: add(base, mul(nrm(add(d, [0, 0, 0.35])), 0.009)), r: 0.0033, m: 'claw' }] };
}
// thumb state machine: lift -> glide at hover height -> press the target (button follows the pad down) -> linger -> back to rest
export function thumbInit() { return { x: THUMB.rest[0], y: THUMB.rest[1], z: TIP_Z.contact, id: null, tx: 0, ty: 0, hold: 0, linger: 0 }; }
export function thumbAim(s, id, x, y) { s.id = id; s.tx = x; s.ty = y; s.hold = 0.16; s.linger = 0.7; }
export function thumbStep(s, dt) {
  const tx = s.id ? s.tx : THUMB.rest[0], ty = s.id ? s.ty : THUMB.rest[1], dxy = Math.hypot(tx - s.x, ty - s.y), there = dxy < 0.0012;
  let zt = s.id ? (there && s.hold > 0 ? TIP_Z.press : TIP_Z.hover) : (there ? TIP_Z.contact : TIP_Z.hover);
  if (s.z >= TIP_Z.contact - 1e-4) { const k = 1 - Math.exp(-dt * 24), mx = tx - s.x, my = ty - s.y, m = Math.hypot(mx, my), step = Math.min(m, Math.max(m * k, 0.06 * dt));
    if (m > 0) { s.x += mx / m * step; s.y += my / m * step; } }   // only glide sideways once the pad is up off the buttons
  else zt = Math.max(zt, s.id && there && s.hold > 0 ? TIP_Z.press : TIP_Z.contact);
  if (!there && s.z < TIP_Z.contact) zt = TIP_Z.hover;
  const kz = 1 - Math.exp(-dt * 30); s.z += (zt - s.z) * kz; if (Math.abs(zt - s.z) < 2e-5) s.z = zt;
  if (s.id && there) { if (s.hold > 0) { if (s.z <= TIP_Z.press + 4e-4) s.hold -= dt; } else if ((s.linger -= dt) <= 0) s.id = null; }
  return [s.x, s.y, s.z];
}
// how far the targeted button is pushed in by the pad (so the button and the pad never overlap)
export function buttonDepth(s, bx, by, bw, bh) { if (Math.abs(s.x - bx) > bw / 2 || Math.abs(s.y - by) > bh / 2) return 0; return Math.max(0, Math.min(PRESS, TIP_Z.contact - s.z)); }
