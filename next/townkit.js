// townkit.js — tiny procedural "felt kit" for the real-scale town (run 11).
// Every building is a pile of primitives (boxes, extrusions, cylinders) baked into ONE merged, vertex-coloured
// felt mesh (+ an optional unlit "glow" mesh for neon / lit windows, + a cheap massing mesh for distance LOD).
// Local frame: x = across the front, z = toward the street (front faces +z), y = up. Units are metres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UVS = 1 / 1.25; // felt speckle: one texture tile per ~1.25 m, world-planar so big walls don't get giant fibres
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); BOX.translate(0, 0.5, 0);
const cylCache = new Map(), icoCache = new Map();
function cylT(seg, open) { const k = seg + (open ? 'o' : ''); if (!cylCache.has(k)) { const g = new THREE.CylinderGeometry(1, 1, 1, seg, 1, !!open).toNonIndexed(); g.translate(0, 0.5, 0); cylCache.set(k, g); } return cylCache.get(k); }
function icoT(d) { if (!icoCache.has(d)) icoCache.set(d, new THREE.IcosahedronGeometry(1, d).toNonIndexed()); return icoCache.get(d); }

// linear-light colour boost so the felt speckle map (avg ~0.8) doesn't darken the locked reference colours
export const COLOR_GAIN = { v: 1.18 };
export function col(hex) { _c.set(hex); return [Math.min(1, _c.r * COLOR_GAIN.v), Math.min(1, _c.g * COLOR_GAIN.v), Math.min(1, _c.b * COLOR_GAIN.v)]; }

export class Kit {
  constructor() { this.parts = []; this.lo = []; this.glow = []; this.solids = []; this.marks = {}; this.extras = []; this.stack = [new THREE.Matrix4()]; }
  get M() { return this.stack[this.stack.length - 1]; }
  // nested sub-frame: (x, y, z, rotY) relative to the current frame
  frame(x, y, z, ry, fn) { const m = new THREE.Matrix4().makeRotationY(ry || 0).setPosition(x, y, z); this.stack.push(this.M.clone().multiply(m)); fn(this); this.stack.pop(); return this; }
  _add(src, mat, color, o = {}) {
    let g = src.index ? src.toNonIndexed() : src.clone(); g.applyMatrix4(_m.multiplyMatrices(this.M, mat));
    const n = g.attributes.position.count, c = col(color), ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ca[i * 3] = c[0]; ca[i * 3 + 1] = c[1]; ca[i * 3 + 2] = c[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    planarUV(g);
    (o.glow ? this.glow : this.parts).push(g);
    if (o.lod) this.lo.push(g);
    return g;
  }
  // box: centre x, bottom y0, centre z, size w,h,d; o.rx/ry/rz rotate about the box centre
  box(x, y0, z, w, h, d, color, o = {}) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e);
    const T = new THREE.Matrix4().compose(_v.set(x, y0 + h / 2, z), _q, _s.set(w, h, d)).multiply(new THREE.Matrix4().makeTranslation(0, -0.5, 0));
    return this._add(BOX, T, color, o);
  }
  // axis-aligned box from corners
  aab(x0, y0, z0, x1, y1, z1, color, o) { return this.box((x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), color, o); }
  // a beam from point a to point b (3D), square section t (thick) x t2
  beam(a, b, t, color, o = {}, t2 = t) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    const T = new THREE.Matrix4().compose(A, _q, _s.set(t, L, t2));
    return this._add(BOX, T, color, o);
  }
  cyl(x, y0, z, r, h, color, o = {}) {
    const rt = o.rt ?? r; const g = cylT(o.seg || 8, o.open);
    let src = g; if (rt !== r) { src = g.clone(); const p = src.attributes.position; for (let i = 0; i < p.count; i++) { const k = p.getY(i); const f = (rt * k + r * (1 - k)) / r; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } src.computeVertexNormals(); }
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e);
    const T = new THREE.Matrix4().compose(_v.set(x, y0, z), _q, _s.set(r, h, r * (o.sz || 1)));
    return this._add(src, T, color, o);
  }
  // blob (shrub / tree crown / hydrangea): squashed icosphere
  blob(x, y, z, rx, ry, rz, color, o = {}) { const T = new THREE.Matrix4().compose(_v.set(x, y, z), _q.identity(), _s.set(rx, ry, rz)); return this._add(icoT(o.detail ?? 0), T, color, o); }
  // extrude a polygon drawn in the local XY plane (x across, y up) through z0..z0+depth
  ext(pts, z0, depth, color, o = {}) {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    if (o.holes) for (const h of o.holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: o.seg || 8 });
    g.deleteAttribute('uv');
    const T = new THREE.Matrix4().makeTranslation(0, 0, z0);
    if (o.ry) T.premultiply(new THREE.Matrix4().makeRotationY(o.ry));
    if (o.at) T.premultiply(new THREE.Matrix4().makeTranslation(...o.at));
    return this._add(g, T, color, o);
  }
  // gable roof over a w x d rectangle centred at (cx, cz), eaves at height y. ridge:'z' = gable faces the street.
  gable(cx, cz, w, d, y, rise, roofCol, wallCol, o = {}) {
    const ov = o.over ?? 0.35, th = o.thick ?? 0.16, ridgeZ = (o.ridge || 'z') === 'z';
    const span = ridgeZ ? w : d, len = ridgeZ ? d : w, half = span / 2;
    const ang = Math.atan2(rise, half), sl = Math.hypot(half + ov, rise + ov * Math.tan(ang));
    const L = len + 2 * (o.overEnd ?? ov);
    for (const s of [-1, 1]) {
      const mx = s * (half + ov - Math.cos(ang) * sl / 2), my = y + rise - Math.sin(ang) * sl / 2;
      if (ridgeZ) this.box(cx + mx, my - th / 2, cz, sl, th, L, roofCol, { rz: -s * ang, lod: true });
      else this.box(cx, my - th / 2, cz + mx, L, th, sl, roofCol, { rx: s * ang, lod: true });
    }
    if (wallCol) { // gable-end wall triangles (the prism under the roof)
      const tri = [[-half, 0], [half, 0], [0, rise]];
      if (ridgeZ) this.ext(tri, -len / 2, len, wallCol, { at: [cx, y, cz], lod: true });
      else this.ext(tri, -len / 2, len, wallCol, { at: [cx, y, cz], ry: Math.PI / 2, lod: true });
    }
    if (o.trim) { // fascia boards along the rakes at both gable ends
      const t = o.trimW ?? 0.22;
      for (const e of [-1, 1]) for (const s of [-1, 1]) {
        const a = [s * (half + ov * 0.9), y - ov * Math.tan(ang) * 0.9, e * (len / 2 + (o.overEnd ?? ov) + 0.02)], b = [0, y + rise + 0.05, a[2]];
        if (ridgeZ) this.beam([cx + a[0], a[1] - 0.02, cz + a[2]], [cx + b[0], b[1], cz + b[2]], t, o.trim, {}, 0.06);
        else this.beam([cx + a[2], a[1] - 0.02, cz + a[0]], [cx + b[2], b[1], cz + b[0]], t, o.trim, {}, 0.06);
      }
    }
    return this;
  }
  // window on a wall facing +z at local (x, y0 sill height, z = wall face). Frame, glass, mullions, sill.
  window(x, y0, z, w, h, o = {}) {
    const f = o.frame || '#f2ece2', ft = o.ft ?? 0.09, glass = o.glass || '#3c4650';
    this.box(x, y0, z + 0.02, w, h, 0.04, glass, { glow: o.glow });
    this.box(x, y0 - ft, z + 0.05, w + ft * 2, ft, 0.08, f); this.box(x, y0 + h, z + 0.05, w + ft * 2, ft, 0.08, f);
    this.box(x - w / 2 - ft / 2, y0, z + 0.05, ft, h, 0.08, f); this.box(x + w / 2 + ft / 2, y0, z + 0.05, ft, h, 0.08, f);
    const [nx, ny] = o.mull || [0, 0], mt = o.mt ?? 0.05, mc = o.mullCol || f;
    for (let i = 1; i <= nx; i++) this.box(x - w / 2 + w * i / (nx + 1), y0, z + 0.05, mt, h, 0.05, mc);
    for (let j = 1; j <= ny; j++) this.box(x, y0 + h * j / (ny + 1) - mt / 2, z + 0.05, w, mt, 0.05, mc);
    if (o.sill) this.box(x, y0 - ft - 0.08, z + 0.09, w + ft * 2 + 0.16, 0.1, 0.16, o.sill);
    if (o.shutters) for (const s of [-1, 1]) this.box(x + s * (w / 2 + ft + 0.03 + (o.shW ?? w * 0.32) / 2), y0 - ft * 0.5, z + 0.05, o.shW ?? w * 0.32, h + ft, 0.06, o.shutters);
    if (o.blind) this.box(x, y0 + h * (1 - o.blind), z + 0.03, w, h * o.blind, 0.03, o.blindCol || '#e6dec5');
    if (o.grille) { for (let i = 1; i < 5; i++) this.box(x - w / 2 + w * i / 5, y0, z + 0.11, 0.025, h, 0.025, o.grille); for (let j = 1; j < 4; j++) this.box(x, y0 + h * j / 4, z + 0.11, w, 0.025, 0.025, o.grille); }
    return this;
  }
  door(x, y0, z, w, h, color, o = {}) {
    const f = o.frame || '#f2ece2';
    this.box(x, y0, z + 0.03, w, h, 0.06, color);
    if (o.frame !== null) { this.box(x - w / 2 - 0.06, y0, z + 0.05, 0.12, h + 0.12, 0.08, f); this.box(x + w / 2 + 0.06, y0, z + 0.05, 0.12, h + 0.12, 0.08, f); this.box(x, y0 + h, z + 0.05, w + 0.24, 0.12, 0.08, f); }
    if (o.panels) { for (const py of [0.25, 0.62]) this.box(x, y0 + h * py, z + 0.07, w * 0.7, h * 0.28, 0.02, o.panels); }
    if (o.lite) this.box(x, y0 + h * 0.62, z + 0.07, w * 0.55, h * 0.28, 0.02, o.lite);
    this.box(x + w * 0.36, y0 + 1.0, z + 0.1, 0.06, 0.06, 0.06, o.knob || '#c9a24a');
    return this;
  }
  // stack of steps rising toward -z (into the house) from front edge zf, top at height top
  steps(x, zf, w, top, n, color, o = {}) { const tread = o.tread ?? 0.3; for (let i = 0; i < n; i++) this.box(x, o.y0 || 0, zf - tread * (n + i) / 2, w, top * (i + 1) / n, tread * (n - i), color); return this; }
  // a run of pickets / posts between two points (x,z) — height h
  pickets(a, b, h, color, o = {}) {
    const gap = o.gap ?? 0.16, L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / gap)), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    for (let i = 0; i <= n; i++) { const t = i / n; this.box(a[0] + (b[0] - a[0]) * t, o.y0 ?? 0, a[1] + (b[1] - a[1]) * t, o.pw ?? 0.08, h, 0.04, o.alt && i % 2 ? o.alt : color, { ry }); }
    if (o.rail !== false) for (const ry2 of o.rails || [h * 0.3, h * 0.78]) this.beam([a[0], ry2 + (o.y0 ?? 0), a[1]], [b[0], ry2 + (o.y0 ?? 0), b[1]], 0.05, o.railCol || color, {}, 0.05);
    return this;
  }
  // a simple rail: posts + top rail (+ optional balusters) along a polyline
  rail(pts, h, color, o = {}) {
    for (let i = 0; i < pts.length; i++) { const [x, z, y = 0] = pts[i]; this.box(x, y, z, o.post ?? 0.06, h, o.post ?? 0.06, color); }
    for (let i = 1; i < pts.length; i++) { const [x0, z0, y0 = 0] = pts[i - 1], [x1, z1, y1 = 0] = pts[i]; this.beam([x0, y0 + h, z0], [x1, y1 + h, z1], 0.05, color);
      if (o.bal) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / o.bal); for (let k = 1; k < n; k++) { const t = k / n; this.box(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, 0.025, h, 0.025, color); } } }
    return this;
  }
  // horizontal lap siding strips across a face facing +z at z, from x0..x1, y0..y1
  siding(x0, x1, y0, y1, z, color, o = {}) { const step = o.step ?? 0.24; for (let y = y0 + step; y < y1 - 0.02; y += step) this.box((x0 + x1) / 2, y - 0.025, z + 0.015, x1 - x0, 0.04, 0.03, color); return this; }
  // register an axis-aligned solid (local corners) for walking collisions + camera occlusion
  solid(x0, z0, x1, z1, h = 4) { this.solids.push([x0, z0, x1, z1, h, this.M.clone()]); return this; }
  // a ready-made mesh (sign, text) placed in the current frame
  put(mesh, x, y, z, ry = 0, rx = 0) { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0, 'YXZ'); mesh.applyMatrix4(this.M); this.extras.push(mesh); return mesh; }
  mark(name, x, z, extra) { const p = new THREE.Vector3(x, 0, z).applyMatrix4(this.M); this.marks[name] = { x: p.x, z: p.z, ...(extra || {}) }; return this; }

  // bake into meshes. mats: {felt, glow}
  build(mats, { shadow = true } = {}) {
    const out = new THREE.Group();
    const mk = (list, mat, name) => { if (!list.length) return null; const g = mergeGeometries(list, false); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.name = name; out.add(m); return m; };
    out.userData.detail = mk(this.parts, mats.felt, 'detail');
    if (out.userData.detail) { out.userData.detail.castShadow = shadow; out.userData.detail.receiveShadow = true; }
    out.userData.glow = mk(this.glow, mats.glow, 'glow');
    out.userData.lo = mk(this.lo, mats.felt, 'lo'); if (out.userData.lo) { out.userData.lo.visible = false; out.userData.lo.receiveShadow = true; }
    return out;
  }
}

function planarUV(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * UVS; uv[i * 2 + 1] = v * UVS;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// text on a canvas -> plane mesh (signs, neon letters). Returns a Mesh facing +z.
const texCache = new Map();
export function textPlane(text, w, h, { bg = '#f6efe0', fg = '#3a1f2a', font = 'bold', family = 'Georgia, serif', glow = false, border = null, pad = 0.12, italic = false, stroke = null, fit = 0.72 } = {}) {
  const key = [text, w, h, bg, fg, font, family, glow, border, italic, stroke, fit].join('|');
  let tex = texCache.get(key);
  if (!tex) {
    const px = 128, cw = Math.min(1024, Math.round(w * px)), ch = Math.min(512, Math.round(h * px)); const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } else g.clearRect(0, 0, cw, ch);
    if (border) { g.strokeStyle = border; g.lineWidth = ch * 0.07; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cw - g.lineWidth, ch - g.lineWidth); }
    const lines = String(text).split('\n'); let fs = ch * fit / lines.length;
    const setF = () => { g.font = `${italic ? 'italic ' : ''}${font} ${fs}px ${family}`; };
    setF(); while (Math.max(...lines.map(l => g.measureText(l).width)) > cw * (1 - pad * 2) && fs > 6) { fs *= 0.92; setF(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = fg; g.shadowBlur = fs * 0.35; }
    lines.forEach((l, i) => { const y = ch / 2 + (i - (lines.length - 1) / 2) * fs * 1.08; if (stroke) { g.lineWidth = fs * 0.12; g.strokeStyle = stroke; g.strokeText(l, cw / 2, y); } g.fillStyle = fg; g.fillText(l, cw / 2, y); });
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; texCache.set(key, tex);
  }
  const mat = glow ? new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, toneMapped: false, fog: true }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, transparent: !bg });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); return m;
}
