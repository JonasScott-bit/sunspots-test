// missions/kit.js — shared kit for the Next Level cast missions (Nov 16 2026).
// Every mission is its own module (missions/<id>.js) that calls registerMission(def). The kit does the plumbing so each
// mission file is just its game: felt/clay matte primitives + felt "pals", a night sky, the mission HUD (big, phone-first text),
// touch input (drag-steer pad, tap-in-world, action buttons), the room "lane" takeover (same slot as bowling / swim lesson),
// playCinematic('<id>_intro') before play (skips when the clip is missing), results + stars, Sunspots (journal), Night gates,
// the shared errand table (T.M: TO DO / DONE / minimap target) and QA hooks (?m=<id> straight in, ?mauto autopilot, ?unlock).
// 0 rigs (characters are felt pals or rest-pose lo GLBs with procedural motion), 0 Meshy, budgets checked per scene.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sunspotsApply, bothMats, matteGLB } from '../sunspots_material.js';
import { folk as feltFolk, FOLK, palSpec, animFolk } from '../feltfolk.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { playCinematic } from '../cinematic.js';
import { audio } from '../audio.js';

export const Q = new URLSearchParams(location.search);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const TAU = Math.PI * 2;
export function rng(seed = 1234567) { let s = seed % 2147483647 || 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; r.range = (a, b) => a + (b - a) * r(); r.pick = (a) => a[Math.floor(r() * a.length) % a.length]; return r; }
export const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// ------------------------------------------------------------------ Nights: Sunspots open them (A Short Hike's feathers)
export const NIGHTS = [
  { n: 1, need: 0, name: 'NIGHT 1 · LAST MINUTE SNACKS', opens: 'Main St' },
  { n: 2, need: 2, name: "NIGHT 2 · TACO TUESDAY'S", opens: 'the Neon Strip' },
  { n: 3, need: 5, name: 'NIGHT 3 · THE SWIM LESSON', opens: 'the Mansion' },
  { n: 4, need: 8, name: "NIGHT 4 · GRANDMA'S CAT", opens: "Grandma's side of town" },
  { n: 5, need: 12, name: 'NIGHT 5 · ONE HORSE FAIR', opens: 'the Fair after dark' },
  { n: 6, need: 17, name: 'NIGHT 6 · TWO HORSES', opens: 'the farm road' },
  { n: 7, need: 21, name: 'NIGHT 7 · SAME OLD ONE HORSE TOWN', opens: 'sunrise in Horse Plaza' },
];
window.__msnNights = NIGHTS;

// ------------------------------------------------------------------ felt + clay materials (matte Lambert, one fibre texture)
let FIBRE = null;
export function fibreTex() {
  if (FIBRE) return FIBRE; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, 128, 128); const r = rng(11);
  for (let i = 0; i < 1500; i++) { const x = r() * 128, y = r() * 128, a = r() * TAU, l = 2 + r() * 5, v = r() < 0.5 ? 255 : 110; g.strokeStyle = `rgba(${v},${v},${v},${0.1 + r() * 0.2})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l, y + Math.sin(a + 1) * l, x + Math.cos(a) * l * 1.6, y + Math.sin(a) * l * 1.6); g.stroke(); }
  FIBRE = new THREE.CanvasTexture(c); FIBRE.wrapS = FIBRE.wrapT = THREE.RepeatWrapping; FIBRE.colorSpace = THREE.SRGBColorSpace; return FIBRE;
}
const MC = new Map();
export function felt(col = '#ffffff', o = {}) { const k = col + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshLambertMaterial({ color: col, map: fibreTex(), ...o })); return MC.get(k); }
export const VCM = () => felt('#ffffff', { vertexColors: true });
export function glowMat(col, op = 1, add = false) { const k = 'g' + col + op + add; if (!MC.has(k)) MC.set(k, new THREE.MeshBasicMaterial({ color: col, transparent: op < 1 || add, opacity: op, toneMapped: false, fog: !add, depthWrite: !add, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); return MC.get(k); }
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
let GLOWT = null;
export function glowTex() { return GLOWT ||= canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); }
export function glowSprite(col, sx, sy = sx, op = 0.7) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.set(sx, sy, 1); return s; }
let SHT = null;
export function blobShadow(r = 0.5, op = 0.45) { SHT ||= canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(20,8,24,1)'); gr.addColorStop(0.5, 'rgba(20,8,24,.5)'); gr.addColorStop(1, 'rgba(20,8,24,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: SHT, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 1; return m; }

// ------------------------------------------------------------------ primitive helpers (meshes) + a merged vertex-colour builder
export function mesh(geo, m, p, parent) { const o = new THREE.Mesh(geo, typeof m === 'string' ? felt(m) : m); if (p) o.position.set(p[0], p[1], p[2]); if (parent) parent.add(o); return o; }
export const box = (w, h, d, m, p, parent) => mesh(new THREE.BoxGeometry(w, h, d), m, p, parent);
export const cyl = (rt, rb, h, m, p, parent, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, p, parent);
export const ball = (r, m, p, parent, ws = 10, hs = 7) => mesh(new THREE.SphereGeometry(r, ws, hs), m, p, parent);
const _e = new THREE.Euler(), _c = new THREE.Color(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
export class Merge {   // collect primitives with a colour + matrix, emit one mesh (one draw call)
  constructor() { this.L = []; }
  add(geo, col, m) { geo = geo.index ? geo.toNonIndexed() : geo.clone(); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k); if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (m) geo.applyMatrix4(m); const n = geo.attributes.position.count, a = new Float32Array(n * 3); _c.set(col); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); this.L.push(geo); return this; }
  box(w, h, d, col, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), col, M4(x, y, z, rx, ry, rz)); }
  cyl(rt, rb, h, col, x, y, z, seg = 8, rx = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), col, M4(x, y, z, rx, 0, rz)); }
  ball(r, col, x, y, z, sx = 1, sy = 1, sz = 1, ws = 8, hs = 6) { return this.add(new THREE.SphereGeometry(r, ws, hs), col, M4(x, y, z, 0, 0, 0, sx, sy, sz)); }
  cone(r, h, col, x, y, z, seg = 6, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.ConeGeometry(r, h, seg), col, M4(x, y, z, rx, ry, rz)); }
  mesh(mat) { if (!this.L.length) return new THREE.Group(); const m = new THREE.Mesh(mergeGeometries(this.L, false), mat || VCM()); this.L = []; return m; }
}
export function countTris(root) { let n = 0; root.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible !== false) { const g = o.geometry; let vis = true, p = o.parent; while (p) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) return; const c = (g.index ? g.index.count : g.attributes.position.count) / 3; n += c * (o.isInstancedMesh ? o.count : 1); } }); return Math.round(n); }

// sign board (canvas text on a plane). glow = unlit (neon / lit window)
export function sign(text, w, h, { bg = '#f2e6c8', fg = '#3a1f2a', font = '800 64px Futura, Avenir, system-ui, sans-serif', glow = false, border = true, sub = null } = {}) {
  const CW = w / h > 4 ? 1024 : 512, tex = canvasTex(CW, Math.max(64, Math.round(CW * h / w)), (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); if (border) { g.strokeStyle = fg; g.setLineDash([10, 8]); g.lineWidth = 5; g.strokeRect(10, 10, W - 20, H - 20); } }
    g.fillStyle = fg; const nL = text.split('\n').length, fpx = Math.min(parseInt(font.match(/(\d+)px/)?.[1] || 64), Math.floor(H * (sub ? 0.5 : 0.66) / (nL + (nL > 1 ? 0.3 : 0)))); g.font = font.replace(/\d+px/, fpx + 'px'); g.textAlign = 'center'; g.textBaseline = 'middle'; const L = text.split('\n'); L.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (L.length - 1) / 2) * H / (L.length + 0.6) - (sub ? H * 0.1 : 0), W - 30));
    if (sub) { g.font = '700 30px Futura, Avenir, system-ui, sans-serif'; g.fillText(sub, W / 2, H * 0.82, W - 30); } });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: !bg, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
}

// ------------------------------------------------------------------ felt cast: feltfolk.js builds every character (felt + clay, adult proportions)
// pal(o) keeps the old option names for one-off figures; CAST.<name>() is the ref-matched cast member. Same rig contract as before:
// userData { torso, hd, legs, arms, h, ph, shadow } (pivots), driven by animPal(). Two LODs each, shared geometry, 0 rigs.
export function pal(o = {}) { return feltFolk(palSpec(o)); }
// procedural motion: walk cycle, idle breathe, wave, cheer, panic, sit
export function animPal(g, dt, t, o = {}) { if (g.userData?.crewWrap) crewAnim(g, t, o); else animFolk(g, dt, t, o); }
// Nov 16: the real crew (Wolf, Bear, Moth, Ram, Heron, Crow, Lynx, Gecko, Anteater, Fuzzy Peach) are their own GLBs, not felt stand-ins.
// CAST.<crew>() returns a wrapper at once (same pivot contract, so mission code is unchanged) and drops the GLB in when it lands
// (cached after the first load). Felt figures are only for the characters with no GLB.
const CREW_H = { wolf: 1.75, moth: 1.95, bear: 1.95, ram: 1.8, heron: 1.95, crow: 1.6, lynx: 1.75, gecko: 1.45, anteater: 1.7, peach: 1.5 };
function crewCast(k) {
  const h = CREW_H[k], w = new THREE.Group(), pv = (x, y) => { const g = new THREE.Group(); g.position.set(x, y, 0); w.add(g); return g; };
  const sh = blobShadow(0.42 * h / 1.8, 0.4); w.add(sh); w.name = 'crew:' + k;
  w.userData = { crewWrap: k, h: h / 1.75, ph: Math.random() * 6, shadow: sh, torso: pv(0, h * 0.55), hd: pv(0, h * 0.88), legs: [pv(-0.12, h * 0.45), pv(0.12, h * 0.45)], arms: [pv(-0.24, h * 0.76), pv(0.24, h * 0.76)], glbW: null };
  crewGLB(k, h).then((o) => { if (o.userData.shadow) o.userData.shadow.visible = false; w.add(o); w.userData.glbW = o; }).catch(() => {});
  return w;
}
function crewAnim(w, t, { walk = 0, wave = 0, cheer = 0, panic = 0 } = {}) {
  const o = w.userData.glbW; if (!o) return; const u = o.userData;
  if (!u.glb) { animFolk(o, 0.016, t, { walk, wave, cheer, panic }); return; }
  const live = u.rig ? rigTick(o, t, walk) : false, i = u.inner, k = Math.sin(t * (panic ? 18 : 10));
  i.position.y = (cheer || panic) ? Math.abs(k) * 0.06 * u.h : wave ? Math.abs(Math.sin(t * 6)) * 0.015 * u.h : 0;
  i.rotation.z = (live ? 0 : Math.sin(t * 1.3 + u.ph) * 0.03) + (panic ? Math.sin(t * 22) * 0.05 : wave ? Math.sin(t * 5) * 0.03 : 0);
  i.scale.y = live ? 1 : 1 + Math.sin(t * 2 + u.ph) * 0.012;
}
export const CAST = Object.fromEntries(['wolf', 'bear', 'grandma', 'gecko', 'lynx', 'heron', 'ram', 'crow', 'moth', 'squid', 'anteater', 'vulture', 'larry', 'fuzz', 'lemon', 'goat', 'rabbit', 'reggie', 'peach', 'sal', 'dot', 'nan', 'wrench', 'hummer', 'farmhand', 'someone']
  .map((k) => [k, CREW_H[k] ? () => crewCast(k) : () => feltFolk(FOLK[k])]));
export const feltCast = (k) => feltFolk(FOLK[k]);   // the felt build of anyone, for the crewGLB fallback
// townsfolk: a handful of town faces in varied clothes (specs memoised so copies share geometry)
const FOLKV = new Map();
export function folk(r = Math.random, h = 0.9 + Math.random() * 0.25) { const KS = ['pig', 'duck', 'cat', 'dog', 'sheep', 'pig'],   // every townsfolk face is a real species (no blank 'someone' ball)
    SH = ['#3a6a8a', '#f2c230', '#2fae8a', '#c9302a', '#8a7ab8', '#ff6fae', '#f6efe0', '#e0705a'], PA = ['#3a3a4a', '#5a4a3a', '#2f4a6a', '#e8dcc8'];
  const k = KS[Math.floor(r() * KS.length) % KS.length], a = Math.floor(r() * SH.length) % SH.length, b = Math.floor(r() * PA.length) % PA.length, hh = Math.round(h * 10) / 10, key = k + a + b + hh;
  if (!FOLKV.has(key)) FOLKV.set(key, { ...FOLK[k], name: 'town_' + k, q: 0.62, qLo: 0.28, top: SH[a], sleeve: SH[a], pants: PA[b], h: hh * (FOLK[k].h || 1) });
  return feltFolk(FOLKV.get(key)); }

// ------------------------------------------------------------------ the waddle car (felt capsule, bubble cabin, bumpers, headlights)
export function waddleCar(col = '#e7b23a', trim = '#f6efe0', { roof = null, cop = false, tow = false, cab = false, lite = false, open = false } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mm = new Merge(), gm = new Merge();
  mm.add(new THREE.CapsuleGeometry(0.62, 2.1, 3, 10), col, M4(0, 0.72, 0, Math.PI / 2, 0, 0, 1.25, 1, 0.8));
  if (!open) mm.add(new THREE.SphereGeometry(0.62, 10, 6, 0, TAU, 0, Math.PI / 2), trim, M4(0, 1.05, -0.25, 0, 0, 0, 1.15, 0.9, 1.35));
  else { mm.box(1.3, 0.5, 0.06, '#cfe6f0', 0, 1.25, 0.55, -0.35); mm.box(1.5, 0.1, 2.2, '#c94a4a', 0, 1.0, -0.35); mm.box(1.4, 0.22, 0.1, '#c94a4a', 0, 1.1, -1.5); }   // open-top: windscreen, gingham-red seats
  mm.box(1.7, 0.14, 0.22, '#e8e2d6', 0, 0.55, 1.68); mm.box(1.7, 0.14, 0.22, '#e8e2d6', 0, 0.55, -1.68);
  for (const sx of [-0.5, 0.5]) { gm.ball(0.13, '#fff3c8', sx, 0.82, 1.63, 1, 1, 1, 8, 6); gm.ball(0.09, '#ff4a4a', sx, 0.8, -1.66, 1, 1, 1, 6, 4); }
  for (const sx of [-0.28, 0.28]) { mm.ball(0.15, '#f6f2e8', sx, 1.28, 0.42, 1, 1, 1, 10, 8); mm.ball(0.07, '#1d1416', sx, 1.28, 0.55, 1, 1, 1, 6, 5); }   // every waddle car has a face
  if (cop) { gm.box(0.5, 0.14, 0.2, '#ff3a4a', -0.26, 1.62, -0.25); gm.box(0.5, 0.14, 0.2, '#3a6aff', 0.26, 1.62, -0.25); }
  if (tow) { mm.box(0.14, 1.0, 0.14, '#3a3a40', 0, 1.3, -1.3, 0, -0.5); mm.box(0.06, 0.6, 0.06, '#c9c0b0', 0, 1.4, -1.85); }
  const wheels = [], WP = [[-0.78, 1.0], [0.78, 1.0], [-0.78, -1.0], [0.78, -1.0]];
  if (lite) for (const [x, z] of WP) mm.add(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), '#2a2426', M4(x, 0.34, z, 0, 0, Math.PI / 2));
  body.add(mm.mesh()); body.add(gm.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
  if (!lite) for (const [x, z] of WP) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), '#2a2426', [x, 0.34, z], g); w.rotation.z = Math.PI / 2; wheels.push(w); }
  const roofSign = (txt, w, h, o) => { for (const ry of [0, Math.PI]) { const s = sign(txt, w, h, o); s.position.set(0, 1.74, -0.25 - (ry ? 0.02 : 0)); s.rotation.y = ry; body.add(s); } };   // two-sided, so it reads from the chase cam too
  if (cab) roofSign('CAB', 0.8, 0.3, { bg: '#f2c230', fg: '#2a1a14' });
  if (roof) roofSign(roof, 1.4, 0.36);
  const sh = blobShadow(1.5, 0.45); sh.scale.set(0.8, 1.35, 1); g.add(sh);
  const beam = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: '#fff0b8', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));   // headlight pool on the road
  beam.rotation.x = -Math.PI / 2; beam.scale.set(2.2, 4.5, 1); beam.position.set(0, 0.05, 5.4); g.add(beam);
  g.userData = { body, wheels, beam, seats: [[-0.3, 0.55, -0.1], [0.3, 0.55, -0.1], [0, 0.55, -0.8]] };
  return g;
}
export function spinWheels(car, ds) { for (const w of car.userData.wheels) w.rotation.x += ds / 0.34; }

// ------------------------------------------------------------------ night sky: gradient dome, stars, the moon-pale eye sun
export function nightSky(scene, { top = '#0d0f2e', mid = '#2a1f5a', low = '#5a3a6a', glow = '#ff9a6a', moon = true, stars = 500, R = 600, dusk = 0 } = {}) {
  const U = { cTop: { value: new THREE.Color(top) }, cMid: { value: new THREE.Color(mid) }, cLow: { value: new THREE.Color(low) }, cGlow: { value: new THREE.Color(glow) }, uDusk: { value: dusk } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 cTop,cMid,cLow,cGlow; uniform float uDusk; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(cLow, cMid, smoothstep(-0.05, 0.25, h)); c = mix(c, cTop, smoothstep(0.25, 0.8, h)); float gl = smoothstep(0.35, -0.02, h) * (0.35 + uDusk * 0.65); c = mix(c, cGlow, gl * 0.55); gl_FragColor = vec4(c, 1.0); }' }));
  sky.renderOrder = -10; scene.add(sky);
  const st = new Float32Array(stars * 3), r = rng(77); for (let i = 0; i < stars; i++) { const a = r() * TAU, y = 0.12 + r() * 0.88, rr = Math.sqrt(1 - y * y); st.set([Math.cos(a) * rr * R * 0.9, y * R * 0.9, Math.sin(a) * rr * R * 0.9], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(st, 3));
  const sp = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff3dc', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.85 * (1 - dusk * 0.7), fog: false, depthWrite: false })); scene.add(sp);
  let mo = null; if (moon) { mo = new THREE.Group(); const d = mesh(new THREE.CircleGeometry(R * 0.05, 24), glowMat('#ffe9b8'), null, mo); const iris = mesh(new THREE.CircleGeometry(R * 0.022, 20), glowMat('#c9a35a'), [0, 0, 0.5], mo); const pu = mesh(new THREE.CircleGeometry(R * 0.009, 14), glowMat('#3a2a22'), [0, 0, 1], mo);
    const h = glowSprite('#ffe1a8', R * 0.22, R * 0.22, 0.35); mo.add(h); mo.position.set(-R * 0.35, R * 0.45, -R * 0.6); mo.lookAt(0, 0, 0); scene.add(mo); }
  const api = { sky, stars: sp, moon: mo, U, follow(cam) { sky.position.copy(cam.position); sp.position.copy(cam.position); if (mo) { mo.position.set(cam.position.x - R * 0.35, R * 0.45, cam.position.z - R * 0.6); } } };
  return api;
}
export function nightLights(scene, { sky = '#8a94ff', ground = '#3a2a3a', hemi = 0.95, moon = '#c8ccff', moonI = 0.9, warm = '#ffd2a0', warmI = 0.35 } = {}) {
  const h = new THREE.HemisphereLight(sky, ground, hemi); scene.add(h);
  const m = new THREE.DirectionalLight(moon, moonI); m.position.set(-30, 60, 25); scene.add(m);
  const w = new THREE.DirectionalLight(warm, warmI); w.position.set(20, 10, 40); scene.add(w);
  return { hemi: h, moon: m, warm: w };
}

// ------------------------------------------------------------------ lo GLB crew: real rigs (idle / walk clips), at most 3 live at once
// Each copy gets its own skeleton (SkeletonUtils.clone) and a mixer. breathe() runs the mixer for up to RIG_MAX characters that
// are on screen this frame (walk clip when it is moving, idle when it stands); any others hold an idle pose sampled at load,
// never the bind T-pose. Characters with no GLB fall back to the feltfolk cast.
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const glbCache = {};
export const RIG_MAX = 3;
const LIVE = new Map();
// The Meshy clips carry bone position/scale tracks in the source file's units: played on a resized copy they blow the mesh up into
// giant sheets. Rotation tracks alone give the right idle/walk at any size.
const ROT = new WeakMap();
function rotOnly(gl) { if (!ROT.has(gl)) { let hip = null; gl.scene.traverse((o) => { if (!hip && o.isBone && !o.parent?.isBone) hip = o.name; });
  // hips keep their bind orientation: the Meshy idles swing the whole body 60-90 degrees off its facing.
  ROT.set(gl, (gl.animations || []).map((c) => new THREE.AnimationClip(c.name, c.duration, c.tracks.filter((tr) => tr.name.endsWith('.quaternion') && tr.name !== hip + '.quaternion')))); } return ROT.get(gl); }
export const liveRigs = () => LIVE.size;
// The town2 lo-GLBs are indexed and already carry reasonably smooth stored normals (Bear: median 8.8°
// from the face, Wolf 8.3°). Those normals live on an InterleavedBufferAttribute: THREE.computeVertexNormals()
// writes mostly zeros into that buffer (Bear 14593/15325, Wolf 18101/19899) and must not be called.
// Unique positions are ~1/3 of the vertex count because of UV-seam splits (Bear 5848 of 15325, Wolf 5438
// of 19899, same at 1e-5 and 1e-4 of the bbox). Average the *stored* normals across those coincidences
// (leave UVs and skin weights alone), copy them onto a standalone BufferAttribute, and drop the
// nearly-flat baked normalMap so it cannot re-sharpen the cage.
function solidNormals(src) {
  const arr = new Float32Array(src.count * 3);
  for (let i = 0; i < src.count; i++) { arr[i * 3] = src.getX(i); arr[i * 3 + 1] = src.getY(i); arr[i * 3 + 2] = src.getZ(i); }
  return new THREE.BufferAttribute(arr, 3);
}
function smoothNormalsByPos(g, deg = 55) {
  const pos = g.attributes.position, src = g.attributes.normal;
  if (!pos || !src) return;
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const maxDim = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) || 1;
  const tol = 1e-4 * maxDim, minDot = Math.cos(deg * Math.PI / 180), buckets = new Map();
  const nrm = solidNormals(src);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getX(i) / tol) + ',' + Math.round(pos.getY(i) / tol) + ',' + Math.round(pos.getZ(i) / tol);
    let a = buckets.get(k); if (!a) buckets.set(k, a = []); a.push(i);
  }
  const out = new Float32Array(nrm.count * 3);
  for (const idxs of buckets.values()) {
    for (const i of idxs) {
      const ix = nrm.getX(i), iy = nrm.getY(i), iz = nrm.getZ(i);
      let x = 0, y = 0, z = 0;
      for (const j of idxs) {
        const jx = nrm.getX(j), jy = nrm.getY(j), jz = nrm.getZ(j);
        if (ix * jx + iy * jy + iz * jz >= minDot) { x += jx; y += jy; z += jz; }
      }
      const l = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
    }
  }
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, out[i * 3], out[i * 3 + 1], out[i * 3 + 2]);
  nrm.needsUpdate = true;
  g.setAttribute('normal', nrm);
}

export async function crewGLB(k, h = 1.8) {
  const f = { bear: 'town2/bear_lo.glb', heron: 'town2/heron_lo.glb', ram: 'town2/ram_lo.glb', wolf: 'town2/wolf_lo.glb', lynx: 'town2/lynx_lo.glb', crow: 'town2/crow_lo.glb', gecko: 'town2/gecko_lo.glb', anteater: 'cast2/anteater.glb', moth: 'town2/moth_lo.glb', cake: 'town2/cake_lo.glb', shake: 'town2/shake_lo.glb', peach: 'town2/fuzzy_peach_lo.glb' }[k];
  try { if (!f) throw new Error('no glb ' + k);
    const gl = await (glbCache[f] ||= new Promise((res, rej) => loader.load(new URL('../models/' + f, import.meta.url).href, res, undefined, rej)));
    if (!gl.userData.feltSmooth) {
      gl.scene.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); if (!o.isMesh || !o.geometry) return;
        try { smoothNormalsByPos(o.geometry, 55); } catch (_) {}
        for (const m of bothMats(o)) {
          if (!m) continue;
          m.flatShading = false;
          if ('normalMap' in m) m.normalMap = null;
          if (m.normalScale) m.normalScale.set(0, 0);
          m.needsUpdate = true;
        }
      });
      gl.userData.feltSmooth = true;
    }
    const root = skClone(gl.scene); root.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; if (o.isSkinnedMesh) { o.skeleton.pose(); o.frustumCulled = false; } } });
    root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root), s = h / Math.max(0.01, b.max.y - b.min.y); root.scale.multiplyScalar(s); root.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(root); root.position.x -= (b2.min.x + b2.max.x) / 2; root.position.z -= (b2.min.z + b2.max.z) / 2; root.position.y -= b2.min.y;
    try { sunspotsApply(root, k, h); } catch (_) { }
    // Matte + FrontSide on every material (incl. the pre-felt original the phone watchdog may swap back to).
    // Meshy shells are double-sided with glTF metalness default 1 and a near-black roughness map: inside a mission
    // they read as glassy shards. Closed meshes, felt look: front faces, no metal, roughness 0.9.
    try { matteGLB(root); } catch (_) { root.traverse((o) => { if (o.isMesh) for (const m of bothMats(o)) { m.side = THREE.FrontSide; m.metalness = 0; m.roughness = 0.9; m.needsUpdate = true; } }); }
    const w = new THREE.Group(); const inner = new THREE.Group(); inner.add(root); w.add(inner); const sh = blobShadow(0.45 * h / 1.8, 0.4); w.add(sh); w.userData = { glb: true, inner, h, ph: Math.random() * 6, shadow: sh };
    const clips = rotOnly(gl), find = (re) => clips.find((c) => re.test(c.name));
    const ic = find(/idle/i) || find(/seated/i), wc = find(/walk/i);
    if (ic || wc) { const mixer = new THREE.AnimationMixer(root), R = { mixer, idle: ic ? mixer.clipAction(ic) : null, walk: wc ? mixer.clipAction(wc) : null, wW: 0, spd: 0 };
      if (R.walk) { R.walk.play(); R.walk.setEffectiveWeight(R.idle ? 0 : 1); }
      if (R.idle) { R.idle.play(); R.idle.setEffectiveWeight(1); }
      mixer.update(((ic || wc).duration || 1) * Math.random()); w.userData.rig = R; }   // a natural idle pose from frame one
    return w;
  } catch (e) { console.warn('kit: crew glb fallback', k, e?.message || e); const p = feltFolk(FOLK[k] || FOLK.wolf); p.scale.setScalar(h / 1.75); return p; }
}
const _rw = new THREE.Vector3();
function rigTick(o, t, hint = 0) {
  const u = o.userData, R = u.rig, now = performance.now(); for (const [k, v] of LIVE) if (now - v > 700 || !k.parent) LIVE.delete(k);
  if (!LIVE.has(o) && LIVE.size >= RIG_MAX) return false;
  let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible !== false; if (!vis) { LIVE.delete(o); return false; }
  LIVE.set(o, now); const dt = THREE.MathUtils.clamp(t - (u.rt ?? t), 0, 0.1); u.rt = t;
  o.getWorldPosition(_rw); const v = u.rp && dt > 0 ? Math.hypot(_rw.x - u.rp.x, _rw.z - u.rp.z) / dt : 0; (u.rp ||= new THREE.Vector3()).copy(_rw);
  R.spd += (Math.max(Math.min(v, 6), hint * 1.3) - R.spd) * Math.min(1, dt * 6);
  if (R.walk && R.idle) { R.wW += ((R.spd > 0.35 ? 1 : 0) - R.wW) * Math.min(1, dt * 5); R.walk.setEffectiveWeight(R.wW); R.idle.setEffectiveWeight(1 - R.wW); }
  if (R.walk) R.walk.timeScale = THREE.MathUtils.clamp(R.spd / (1.25 * (u.h / 1.8)), 0.6, 1.8);   // feet keep pace with the ground
  R.mixer.update(dt); return true;
}
export function breathe(o, t, { bob = 0, lean = 0, hop = 0 } = {}) { const u = o.userData; if (!u) return;
  if (u.crewWrap) { if (u.glbW) breathe(u.glbW, t, { bob, lean, hop }); return; }
  if (u.glb) { const i = u.inner, live = u.rig ? rigTick(o, t) : false; i.scale.y = live ? 1 : 1 + Math.sin(t * 2 + u.ph) * 0.012; i.position.y = Math.abs(Math.sin(t * 9 + u.ph)) * hop + Math.sin(t * 2.2 + u.ph) * bob; i.rotation.z = (live ? 0 : Math.sin(t * 1.3 + u.ph) * 0.03) + lean; }
  else animPal(o, 0.016, t, {}); }

export const sfx = (() => {
  let C = null; const ac = () => { if (audio?.mode === 'off') return null; C = audio?.ctx || C || (window.AudioContext ? new AudioContext() : null); if (C?.state === 'suspended') C.resume().catch(() => { }); return C; };
  const vol = () => (audio?.sfxVol ?? 1) * 0.45;
  function tone(f, d = 0.15, type = 'sine', g = 0.25, slide = 0, when = 0) { const c = ac(); if (!c) return; const t = c.currentTime + when, o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g * vol(), t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(a).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d = 0.2, g = 0.2, f = 1200, when = 0) { const c = ac(); if (!c) return; const t = c.currentTime + when, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; const a = c.createGain(); a.gain.value = g * vol(); s.connect(bp).connect(a).connect(c.destination); s.start(t); }
  return {
    tone, noise,
    tick: () => tone(880, 0.06, 'square', 0.08), ok: () => { tone(660, 0.12, 'triangle', 0.2); tone(990, 0.18, 'triangle', 0.16, 0, 0.08); },
    good: () => { tone(523, 0.1, 'triangle', 0.18); tone(659, 0.1, 'triangle', 0.18, 0, 0.07); tone(784, 0.2, 'triangle', 0.2, 0, 0.14); },
    bad: () => { tone(220, 0.3, 'sawtooth', 0.12, 0.6); }, bonk: () => { tone(200, 0.25, 'triangle', 0.3, 0.45); noise(0.08, 0.15, 400); juice?.shake(0.15, 0.2); },
    crash: () => { noise(0.35, 0.35, 900); tone(140, 0.3, 'square', 0.1, 0.5); juice?.shake(0.35, 0.35); }, smash: () => { noise(0.25, 0.3, 3200); tone(1800, 0.12, 'triangle', 0.08, 0.4); noise(0.2, 0.2, 5200, 0.05); },
    horn: () => { tone(392, 0.32, 'square', 0.13); tone(494, 0.32, 'square', 0.1); }, meow: () => { tone(700, 0.35, 'sawtooth', 0.08, 1.6); tone(1050, 0.3, 'sine', 0.06, 0.7, 0.15); },
    whoosh: () => noise(0.3, 0.2, 700), pop: () => tone(900, 0.08, 'sine', 0.25, 0.3), catch: () => { tone(740, 0.08, 'triangle', 0.22); tone(1110, 0.14, 'sine', 0.18, 0, 0.05); },
    star: (i = 0) => tone(660 * Math.pow(1.26, i), 0.35, 'triangle', 0.22), sun: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.16, 0, i * 0.09)); },
    note: (f, d = 0.18, type = 'triangle', g = 0.22) => tone(f, d, type, g), drum: (k = 0) => k ? noise(0.08, 0.3, 4200) : (tone(120, 0.18, 'sine', 0.5, 0.4), noise(0.05, 0.15, 200)),
  };
})();

// ------------------------------------------------------------------ the mission HUD (DOM, one per page, re-skinned per mission)
let H = null;
export function hud() {
  if (H) return H;
  const css = document.createElement('style'); css.id = 'msnCss';
  css.textContent = `#msn{position:fixed;inset:0;z-index:30;display:none;pointer-events:none;font:700 15px/1.3 Futura,Avenir,system-ui,sans-serif;color:#fff3dc;-webkit-user-select:none;user-select:none}
  body.msn #msn{display:block} body.msn #roomUI,body.msn #townObj,body.msn #sceneSub,body.msn #qtBtn,body.msn #jnBtn,body.msn #mmap,body.msn #toast,body.msn #hud{display:none!important}
  #msn .top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 10px);display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:0 calc(env(safe-area-inset-right) + 66px) 0 calc(env(safe-area-inset-left) + 60px)}
  #msn .pill{background:#2b1e3ce6;border-radius:18px;padding:7px 14px;font:800 15px system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 3px 0 #120a1c;white-space:nowrap}
  #msn .pill.warn{background:#a8323ae6;animation:msnW .6s ease infinite alternate} @keyframes msnW{to{transform:scale(1.07)}}
  #msn .ttl{position:absolute;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 56px);max-width:calc(50vw - min(31vw,160px) - 24px);line-height:1.5;font:800 12px system-ui,sans-serif;letter-spacing:.22em;color:#ffe1a8;opacity:.85;text-shadow:0 2px 6px #000a}
  #msn .meter{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 56px);width:min(62vw,320px);height:16px;border-radius:9px;background:#2b1e3cd0;overflow:hidden;box-shadow:0 2px 0 #120a1c;display:none}
  #msn .meter u{display:block;height:100%;width:0;background:linear-gradient(90deg,#f6b23a,#e0503a);border-radius:9px;transition:width .2s} #msn .meter b{position:absolute;inset:0;text-align:center;font:800 11px/16px system-ui,sans-serif;letter-spacing:.16em}
  #msn .hint{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);width:min(86vw,520px);text-align:center;font:800 clamp(18px,4.6vw,26px)/1.25 Futura,Avenir,system-ui,sans-serif;text-shadow:0 3px 10px #000c,0 0 2px #000;opacity:0;transition:opacity .3s}
  #msn .hint.on{opacity:1}
  #msn .sub{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 118px);transform:translateX(-50%);width:min(90vw,560px);text-align:center;background:#1a1024d0;border-radius:16px;padding:10px 14px;opacity:0;transition:opacity .25s;font:600 clamp(15px,3.9vw,19px)/1.35 Futura,Avenir,system-ui,sans-serif}
  #msn .sub.on{opacity:1} #msn .sub i{display:block;font:800 11px system-ui,sans-serif;letter-spacing:.24em;color:#f6b23a;font-style:normal;margin-bottom:2px}
  @media (orientation:landscape){#msn .sub{bottom:calc(env(safe-area-inset-bottom) + 18px);width:min(60vw,560px)} #msn .hint{top:24%}}
  #msn .btns{position:absolute;right:calc(env(safe-area-inset-right) + 14px);bottom:calc(env(safe-area-inset-bottom) + 18px);display:flex;flex-direction:column-reverse;gap:12px;align-items:flex-end;pointer-events:auto}
  #msn .btns button,#msn .big,#msn .card button,#msn .quit{border:0;border-radius:40px;background:#f6b23a;color:#2b1e3c;font:800 15px system-ui,sans-serif;letter-spacing:.1em;box-shadow:0 5px 0 #8a5a12;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  #msn .btns button{min-width:84px;min-height:84px;border-radius:50%;padding:0 8px} #msn .btns button.alt{background:#7ac2c2;box-shadow:0 5px 0 #2f6a6a} #msn .btns button.on,#msn .btns button:active{transform:translateY(4px);box-shadow:0 1px 0 #8a5a12}
  #msn .btns button[disabled]{opacity:.4}
  #msn .big{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 34px);transform:translateX(-50%);min-width:210px;min-height:60px;padding:0 26px;font-size:18px;pointer-events:auto;display:none}
  #msn .quit{position:absolute;right:calc(env(safe-area-inset-right) + 12px);top:calc(env(safe-area-inset-top) + 10px);min-width:52px;min-height:44px;background:#2b1e3ce6;color:#ffe1a8;box-shadow:0 3px 0 #120a1c;font-size:13px;pointer-events:auto}
  #msn .pad{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid #fff3dc66;background:#2b1e3c33;display:none} #msn .pad i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:#fff3dcaa}
  #msn .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.96);width:min(88vw,400px);max-height:86vh;overflow:auto;background:#f4ead2;color:#2b1e3c;border-radius:22px;padding:18px 18px 16px;box-shadow:0 14px 50px #000b;text-align:center;opacity:0;pointer-events:none;transition:.25s}
  #msn .card.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%)} #msn .card b{display:block;font:800 12px system-ui,sans-serif;letter-spacing:.26em;color:#8a5a12} #msn .card h2{margin:6px 0 4px;font:800 24px Futura,Avenir,system-ui,sans-serif;letter-spacing:.04em}
  #msn .card .stars{font-size:40px;letter-spacing:6px;color:#e0a224;margin:2px 0 6px} #msn .card .stars s{color:#cdbf9f;text-decoration:none}
  #msn .card p{margin:4px 0;color:#4a3d52;font:600 15px/1.35 Futura,Avenir,system-ui,sans-serif} #msn .card .sun{display:inline-block;margin:4px 3px;padding:6px 11px;border-radius:14px;background:#2b1e3c;color:#ffe1a8;font:800 12px system-ui,sans-serif;letter-spacing:.08em}
  #msn .card .sun.new{background:#e0a224;color:#2b1e3c} #msn .card .row{display:flex;gap:10px;margin-top:12px} #msn .card button{flex:1;min-height:54px;border-radius:16px} #msn .card button.alt{background:#2b1e3c;color:#ffe1a8;box-shadow:0 5px 0 #120a1c}
  #msn .fade{position:fixed;inset:0;background:#0d0a18;opacity:0;transition:opacity .35s;pointer-events:none;z-index:31}
  @media (orientation:portrait){#msn .ttl{display:none} #msn .top{top:calc(env(safe-area-inset-top) + 60px);padding:0 8px} #msn .meter{top:calc(env(safe-area-inset-top) + 104px)} #msn#msn .toast{top:calc(env(safe-area-inset-top) + 132px)}}
  @media (orientation:portrait){#msn.btnsOn .sub{bottom:calc(env(safe-area-inset-bottom) + 18px);left:12px;transform:none;width:calc(100vw - 166px)} #msn.btnsOn.btns1 .sub{bottom:calc(env(safe-area-inset-bottom) + 118px);left:50%;transform:translateX(-50%);width:min(90vw,560px)}}
  @media (orientation:landscape){#msn .top{padding:0 calc(env(safe-area-inset-right) + 112px) 0 calc(env(safe-area-inset-left) + 112px)}}
  #msn .toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 92px);transform:translateX(-50%);background:#e0a224;color:#2b1e3c;border-radius:16px;padding:8px 14px;font:800 14px system-ui,sans-serif;letter-spacing:.06em;opacity:0;transition:opacity .3s;white-space:nowrap}
  #msn .pads{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 14px);display:none;justify-content:center;gap:10px;pointer-events:auto;padding:0 10px}
  #msn.padsOn .pads{display:flex} #msn.padsOn .sub{bottom:calc(env(safe-area-inset-bottom) + 132px)} #msn.padsOn .btns{display:none}
  #msn .pads button{flex:0 1 96px;height:96px;border:0;border-radius:24px;color:#2b1e3c;font:800 14px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 6px 0 #0008;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .06s,filter .06s}
  #msn .pads button.lit{filter:brightness(1.45) saturate(1.2);transform:scale(1.08)} #msn .pads button.on{transform:translateY(5px);box-shadow:0 1px 0 #0008} #msn .pads button[disabled]{opacity:.45}
  @media (orientation:landscape){#msn .pads button{flex-basis:88px;height:78px}} 
  #msn .panel{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 100px);transform:translateX(-50%);width:min(84vw,360px);background:#f4ead2;color:#2b1e3c;border-radius:18px;padding:12px 14px;box-shadow:0 8px 0 #0006,0 10px 30px #0008;text-align:center;display:none;pointer-events:none;font:700 16px/1.3 Futura,Avenir,system-ui,sans-serif}
  #msn .panel b{display:block;font:800 11px system-ui,sans-serif;letter-spacing:.22em;color:#8a5a12;margin-bottom:4px} #msn .panel.on{display:block} @media (orientation:landscape){#msn .panel{top:calc(env(safe-area-inset-top) + 64px)}}
  #msn .toast.on{opacity:1} #msn .layer{position:absolute;inset:0;pointer-events:auto;touch-action:none}
  #msn .float{position:absolute;transform:translate(-50%,-50%);font:800 18px system-ui,sans-serif;text-shadow:0 2px 6px #000c;pointer-events:none;transition:transform .8s ease-out,opacity .8s ease-out}
  #msn .tag{position:absolute;transform:translate(-50%,-100%);background:#2b1e3ce6;color:#ffe1a8;border-radius:12px;padding:4px 9px;font:800 12px system-ui,sans-serif;letter-spacing:.08em;pointer-events:none;white-space:nowrap}
  #msn#msn .hint{top:calc(env(safe-area-inset-top) + 126px);transform:translate(-50%,0);font-size:clamp(15px,3.9vw,19px);letter-spacing:.05em;text-shadow:0 2px 8px #000,0 0 3px #000}
  @media (orientation:portrait){#msn#msn .hint{top:calc(env(safe-area-inset-top) + 170px)}}
  @media (orientation:landscape){#msn#msn.hintL .hint{left:calc(env(safe-area-inset-left) + 14px);top:162px;transform:none;text-align:left;max-width:min(240px,28vw);font-size:15px;white-space:normal}}
  #msn .tip{position:absolute;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 100px);max-width:max(150px,calc(50vw - 216px));font:800 14px system-ui,sans-serif;letter-spacing:.06em;line-height:1.35;color:#fff;text-shadow:0 1px 0 #000,0 0 6px #000,0 0 14px #000c;opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .35s;pointer-events:none}
  #msn .tip b{display:block;font-size:10px;letter-spacing:.24em;color:#ffd86a;margin-bottom:2px}
  #msn .tip.on{opacity:1;transform:none}
  @media (orientation:portrait){#msn .tip{left:50%;top:calc(env(safe-area-inset-top) + 128px);transform:translate(-50%,-6px);max-width:88vw;text-align:center;white-space:normal}#msn .tip.on{transform:translate(-50%,0)}}
  @media (orientation:portrait){#msn#msn.tipOn .hint,#msn#msn.tipOn .toast{top:calc(env(safe-area-inset-top) + 214px)}}
  @media (orientation:landscape){#msn#msn.hintL.tipOn .hint{top:212px} #msn#msn.tipOn:not(.hintL):not(.hintR) .hint{top:calc(env(safe-area-inset-top) + 168px)}}
  @media (orientation:landscape){#msn#msn.hintR .hint{left:auto;right:calc(env(safe-area-inset-right) + 14px);top:46%;transform:none;text-align:right;max-width:150px;font-size:15px;white-space:normal}}
  @media (orientation:portrait){#msn#msn.panelOn .tip{top:calc(env(safe-area-inset-top) + 236px)}}
  #msn#msn.tipMid .tip{left:50%;top:38%;transform:translate(-50%,-6px);text-align:center;max-width:min(80vw,420px)} #msn#msn.tipMid .tip.on{transform:translate(-50%,0)}
  #msn .edge{position:fixed;inset:0;pointer-events:none;z-index:4;animation:edgeF .5s ease-out forwards}@keyframes edgeF{from{opacity:1}to{opacity:0}}
  #msn .lbl{position:absolute;transform:translate(-50%,-50%);font:800 14px Futura,Avenir,system-ui,sans-serif;letter-spacing:.1em;pointer-events:none;white-space:nowrap;text-shadow:0 1px 0 #000,0 0 6px #000,0 0 12px #000c}
  #msn .float{animation:fpop .35s ease-out}
  @keyframes fpop{0%{scale:.4}60%{scale:1.25}100%{scale:1}}
  #msn .card.on h2{animation:cpop .45s cubic-bezier(.2,1.6,.4,1)}
  @keyframes cpop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
  #msn .card .stars i{display:inline-block;font-style:normal;animation:spop .5s cubic-bezier(.2,1.8,.4,1) both}
  @keyframes spop{0%{transform:scale(0) rotate(-40deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
  #msn .card.lose.on{animation:cshake .45s}
  @keyframes cshake{0%,100%{margin-left:0}20%{margin-left:-10px}40%{margin-left:9px}60%{margin-left:-6px}80%{margin-left:4px}}
  #msn .confetti{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;pointer-events:none;animation:cfall linear forwards}
  @keyframes cfall{to{transform:translate(var(--dx),110vh) rotate(var(--r));opacity:.9}}
`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'msn';
  root.innerHTML = `<div class="layer"></div><div class="top"></div><div class="ttl"></div><div class="meter"><u></u><b></b></div><div class="hint"></div><div class="tip"></div><div class="sub"><i></i><span></span></div><div class="toast"></div><div class="pads"></div><div class="panel"></div><div class="pad"><i></i></div><div class="btns"></div><button class="big"></button><button class="quit" aria-label="Leave the mission">✕</button><div class="card"></div><div class="fade"></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  H = { root, layer: $('.layer'), top: $('.top'), ttl: $('.ttl'), meter: $('.meter'), hintEl: $('.hint'), tipEl: $('.tip'), subEl: $('.sub'), toastEl: $('.toast'), pad: $('.pad'), btnsEl: $('.btns'), padsEl: $('.pads'), panelEl: $('.panel'), bigEl: $('.big'), quitEl: $('.quit'), card: $('.card'), fadeEl: $('.fade'), pills: {}, btn: {}, tags: [] };
  for (const el of [H.padsEl, H.btnsEl, H.bigEl, H.quitEl, H.card]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
  H.reset = (title = '') => { H.tipEl.classList.remove('on'); H.root.classList.remove('tipOn'); H.top.innerHTML = ''; H.padsEl.innerHTML = ''; H.root.classList.remove('padsOn'); H.panelEl.classList.remove('on'); H.pills = {}; H.btnsEl.innerHTML = ''; H.btn = {}; H.root.classList.remove('btnsOn', 'btns1'); H.ttl.textContent = title; H.meter.style.display = 'none'; H.hint(''); H.subEl.classList.remove('on'); H.subQ = []; H.bigEl.style.display = 'none'; H.card.classList.remove('on'); for (const t of H.tags) t.remove(); H.tags = []; H.pad.style.display = 'none'; };
  H.pill = (k, text, warn = false) => { let p = H.pills[k]; if (!p) { p = H.pills[k] = document.createElement('div'); p.className = 'pill'; H.top.appendChild(p); } if (p._t !== text) { p.textContent = text; p._t = text; } p.classList.toggle('warn', !!warn); return p; };
  H.setMeter = (v, label = '', show = true) => { H.meter.style.display = show ? 'block' : 'none'; H.meter.querySelector('u').style.width = Math.round(clamp(v, 0, 1) * 100) + '%'; H.meter.querySelector('b').textContent = label; };
  let hintT = null; H.hint = (t, sec = 0) => { clearTimeout(hintT); H.hintEl.textContent = t || ''; H.hintEl.classList.toggle('on', !!t); if (t && sec) hintT = setTimeout(() => H.hintEl.classList.remove('on'), sec * 1000); };
  let toastT = null; H.toast = (t, sec = 2.2) => { clearTimeout(toastT); H.toastEl.textContent = t; H.toastEl.classList.add('on'); toastT = setTimeout(() => H.toastEl.classList.remove('on'), sec * 1000); };
  // subtitles: queue of [name, text, fn?]; auto-advance, tap the layer to skip ahead
  H.subQ = []; let subT = 0, subDone = null;
  H.say = (L, done) => new Promise((res) => { H.subQ = L.slice(); subDone = () => { done?.(); res(); }; nextSub(); });
  function nextSub() { const l = H.subQ.shift(); if (!l) { H.subEl.classList.remove('on'); const f = subDone; subDone = null; f?.(); return; } try { l[2]?.(); } catch (e) { console.warn(e); } H.subEl.querySelector('i').textContent = l[0] || ''; H.subEl.querySelector('span').textContent = l[1]; H.subEl.classList.add('on'); subT = 1.5 + l[1].length * 0.05; }
  H.tickSub = (dt) => { if (!H.subEl.classList.contains('on')) return; subT -= dt; if (subT <= 0) nextSub(); };
  H.skipSub = () => { if (H.subEl.classList.contains('on')) { nextSub(); return true; } return false; };
  H.talking = () => H.subEl.classList.contains('on');
  H.button = (k, label, { alt = false, hold = false } = {}) => { const b = document.createElement('button'); b.innerHTML = label; if (alt) b.className = 'alt'; H.btnsEl.appendChild(b); H.btn[k] = b; b.down = false; H.root.classList.add('btnsOn');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.down = true; b.classList.add('on'); b.onDown?.(); }); const up = () => { if (!b.down) return; b.down = false; b.classList.remove('on'); b.onUp?.(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); return b; };
  H.pads = (defs, onHit) => { H.padsEl.innerHTML = ''; H.root.classList.add('padsOn'); return defs.map((d, i) => { const b = document.createElement('button'); b.innerHTML = d.label; b.style.background = d.col; H.padsEl.appendChild(b);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (b.disabled) return; b.classList.add('on'); onHit(i, b); }); const up = () => b.classList.remove('on'); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); return b; }); };
  H.panel = (html) => { H.root.classList.toggle('panelOn', html != null); if (html == null) { H.panelEl.classList.remove('on'); return; } if (H.panelEl._h !== html) { H.panelEl.innerHTML = html; H.panelEl._h = html; } H.panelEl.classList.add('on'); };
  H.flash = (b, ms = 160) => { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), ms); };
  H.big = (label, fn) => new Promise((res) => { H.bigEl.textContent = label; H.bigEl.style.display = 'block'; H.bigEl.onclick = (e) => { e.stopPropagation(); H.bigEl.style.display = 'none'; sfx.ok(); fn?.(); res(); }; });
  H.fade = (on, ms = 350) => new Promise((r) => { H.fadeEl.style.transition = `opacity ${ms}ms`; H.fadeEl.style.opacity = on ? 1 : 0; setTimeout(r, ms + 20); });
  H.float = (x, y, text, col = '#ffe1a8') => { const d = document.createElement('div'); d.className = 'float'; d.textContent = text; d.style.left = clamp(x, 70, innerWidth - 70) + 'px'; d.style.top = clamp(y, 110, innerHeight - 60) + 'px'; d.style.color = col; d.style.whiteSpace = 'nowrap'; root.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'translate(-50%,-160%)'; d.style.opacity = 0; }); setTimeout(() => d.remove(), 900); };
  H.tag = (text) => { const d = document.createElement('div'); d.className = 'tag'; d.textContent = text; root.appendChild(d); H.tags.push(d); return d; };
  H.place = (el, v, cam) => { _v.copy(v).project(cam); const on = _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2; el.style.display = on ? 'block' : 'none'; if (on) { el.style.left = ((_v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - _v.y) / 2 * innerHeight) + 'px'; } return on; };
  return H;
}

// ------------------------------------------------------------------ touch input on the mission layer
// steer(): a floating thumb pad wherever the finger lands (x/y in -1..1). taps: onTap(x, y). Keyboard: arrows / WASD / space.
export function input() {
  const h = hud(), I = { x: 0, y: 0, active: false, taps: [], keys: {}, onTap: null, onSwipe: null, padOn: true };
  let id = null, sx = 0, sy = 0, t0 = 0;
  h.layer.addEventListener('pointerdown', (e) => { if (h.skipSub()) return; if (id !== null) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; t0 = performance.now(); I.active = true; I.x = I.y = 0; I.downAt = { x: sx, y: sy };
    if (I.padOn) { h.pad.style.display = 'block'; h.pad.style.left = sx + 'px'; h.pad.style.top = sy + 'px'; h.pad.firstChild.style.transform = ''; } try { h.layer.setPointerCapture(e.pointerId); } catch (_) { } });
  h.layer.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; const dx = e.clientX - sx, dy = e.clientY - sy, R = 55; I.x = clamp(dx / R, -1, 1); I.y = clamp(dy / R, -1, 1); if (I.padOn) h.pad.firstChild.style.transform = `translate(${I.x * 34}px,${I.y * 34}px)`; I.cur = { x: e.clientX, y: e.clientY }; });
  const up = (e) => { if (e.pointerId !== id) return; id = null; I.active = false; h.pad.style.display = 'none'; const dt = performance.now() - t0, dx = e.clientX - sx, dy = e.clientY - sy;
    if (dt < 320 && Math.hypot(dx, dy) < 14) I.onTap?.(e.clientX, e.clientY); else if (dt < 450 && Math.hypot(dx, dy) > 40) I.onSwipe?.(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    I.onRelease?.(dx, dy, dt); I.x = I.y = 0; };
  h.layer.addEventListener('pointerup', up); h.layer.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => { I.keys[e.key.toLowerCase()] = true; }); addEventListener('keyup', (e) => { I.keys[e.key.toLowerCase()] = false; });
  I.axis = () => { const k = I.keys; let x = I.x, y = I.y; if (k.arrowleft || k.a) x = -1; if (k.arrowright || k.d) x = 1; if (k.arrowup || k.w) y = -1; if (k.arrowdown || k.s) y = 1; return { x, y }; };
  I.reset = () => { I.x = I.y = 0; I.active = false; id = null; h.pad.style.display = 'none'; I.onTap = I.onSwipe = I.onRelease = null; I.padOn = true; };
  return I;
}
// screen -> world ray against a list of objects (returns the nearest object whose screen centre is within r px, the forgiving phone tap)
export function pickNear(objs, x, y, cam, r = 70) { let best = null, bd = r; const b = new THREE.Box3(), p = new THREE.Vector3(); for (const o of objs) { if (!o || o.visible === false) continue; b.setFromObject(o); b.getCenter(p).project(cam); if (p.z > 1) continue; const sx = (p.x + 1) / 2 * innerWidth, sy = (1 - p.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = o; } } return best; }
export function toScreen(v, cam) { _v.copy(v).project(cam); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, on: _v.z < 1 }; }

// ------------------------------------------------------------------ registry: errands, journal, Night gates, room chips, the takeover
const REG = (window.__msnReg ||= {});
export function sunTotal(T) { const S = T?.state || window.__town?.state || {}; return Object.keys(S.sun || {}).length; }
function nightOf(def) { return NIGHTS[(def.night || 1) - 1] || NIGHTS[0]; }
export function locked(T, def) { if (Q.has('unlock') || Q.has('m')) return false; const sh = window.__shell; if (sh?.nightOpen) return !sh.nightOpen(def.night || 1); return sunTotal(T) < nightOf(def).need; }   // shell.js owns Nights + the demo cutoff when present

export function registerMission(def) {
  REG[def.id] = def; def.state = 'off';
  const boot = () => { const T = window.__town; if (!T || !window.__ready || !T.M) { setTimeout(boot, 300); return; } try { install(T, def); } catch (e) { console.warn('mission install failed', def.id, e); } };
  boot(); return def;
}
function install(T, def) {
  const M = T.M, S = T.state; const id = def.key || def.id;   // errand key in S (short)
  S.msn ||= {}; S.msnBest ||= {};
  // the shared errand table: TO DO (step 1), DONE (step 2), minimap target = the room door
  M.OBJ[id] = ['', def.todo || ('Play ' + def.title), '']; M.TITLE[id] = def.title; M.DONE[id] = 2; M.DONE_MSG[id] = def.doneMsg || '.'; M.TGT[id] = [0, def.room];
  if (!M.MLIST.includes(id)) M.MLIST.push(id); S[id] = S[id] || 0;
  // journal: rumour (where it starts), and the Sunspots it leaves (journal.js reads window.__jnX)
  const X = (window.__jnX ||= { start: {}, plain: {}, suns: [], night: {} });
  X.start[id] = [def.room, def.rumour || def.todo]; X.plain[id] = def.where || def.title; X.night[id] = def.night || 1;
  for (const s of def.suns || []) if (!X.suns.some((o) => o.id === s.id)) X.suns.push({ id: s.id, name: s.name, how: s.how, got: () => !!(window.__town?.state?.msn || {})[s.id] });
  // the room chip (like the swim lesson): shows in the start room, opens the mission (or the Night gate card)
  const CHIP = { id: 'msn_' + def.id, get label() { return (locked(T, def) ? '🔒 ' : '▶ ') + def.chip; } };   // a DOM chip only (not in A.who, so tapping the room never starts it by accident)
  setInterval(() => { const A = T.rooms?.[def.room]; if (!A || !A.who) return;
    if (T.active === def.room && !T.busy && !T.lane && def.state === 'off') { const ch = document.getElementById('roomChips'); if (ch && ch.children.length && ![...ch.children].some((b) => b.dataset.msn === def.id)) { const b = document.createElement('button'); b.dataset.msn = def.id; b.textContent = CHIP.label; if (!S.seen?.[CHIP.id]) b.className = 'new'; b.onclick = (e) => { e.stopPropagation(); S.seen && (S.seen[CHIP.id] = 1); run(T, def); }; ch.appendChild(b); } } }, 400);
  // QA: ?m=<id> walks into the room and starts it (after the title)
  if (Q.get('m') === def.id) { const go = () => { if (window.__titleUp || T.busy) { setTimeout(go, 300); return; } if (T.active !== def.room) { if (T.active) T.exit(); else T.enter(def.room); setTimeout(go, 900); return; } run(T, def, { phase: Q.get('phase') || null }); }; setTimeout(go, 600); }
  (window.__msn ||= {})[def.id] = def;
}

let RUN = null;
// ------------------------------------------------------------------ juice: screen shake + particle bursts (any mission, via kit)
const FX = { shake: 0, shakeT: 0, off: new THREE.Vector3(), parts: [], scene: null };
export const juice = {
  shake(a = 0.3, d = 0.35) { FX.shake = Math.max(FX.shake, a); FX.shakeT = Math.max(FX.shakeT, d); },
  burst(pos, col = '#ffe86a', n = 14, { speed = 4, up = 3, size = 0.35, life = 0.8, grav = 9 } = {}) { const sc = FX.scene; if (!sc || !pos) return; for (let i = 0; i < n && FX.parts.length < 160; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(size); sp.position.copy(pos); sc.add(sp);
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.6); FX.parts.push({ sp, vx: Math.cos(a) * v, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * v, t: life * (0.6 + Math.random() * 0.4), life, size, grav }); } },
  confetti(root, n = 46) { const C = ['#f2c230', '#ff6fae', '#5fe3d2', '#a98cff', '#ff7a3a', '#f6efe0']; for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'confetti'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = C[i % C.length]; d.style.setProperty('--dx', (Math.random() - 0.5) * 160 + 'px'); d.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg'); d.style.animationDuration = 1.6 + Math.random() * 1.4 + 's'; d.style.animationDelay = Math.random() * 0.5 + 's'; root.appendChild(d); setTimeout(() => d.remove(), 3800); } },
};
const _fwd = new THREE.Vector3();
juice.edge = (col = '#ffd86a') => { const r = H?.root; if (!r) return; const d = document.createElement('div'); d.className = 'edge'; d.style.boxShadow = `inset 0 0 60px 12px ${col}`; r.appendChild(d); setTimeout(() => d.remove(), 520); };
juice.pop = () => { const c = FX.cam; if (c && FX.scene) { c.getWorldDirection(_fwd); juice.burst(c.position.clone().addScaledVector(_fwd, 4).add(new THREE.Vector3(0, 0.6, 0)), '#ffe86a', 10, { speed: 1.4, up: 1.6, size: 0.18, life: 0.6, grav: 3 }); } juice.edge('#ffd86a88'); };
{ const g = sfx.good, b = sfx.bad; sfx.good = () => { g(); juice.pop(); }; sfx.bad = () => { b(); juice.edge('#ff4a3aaa'); juice.shake(0.1, 0.18); }; }
function fxTick(dt, cam) { cam.position.sub(FX.off); FX.off.set(0, 0, 0); }
function fxPost(dt, cam) { if (FX.shakeT > 0) { FX.shakeT -= dt; const k = FX.shake * Math.max(0, Math.min(1, FX.shakeT / 0.25)); FX.off.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k * 0.5); cam.position.add(FX.off); if (FX.shakeT <= 0) FX.shake = 0; }
  for (let i = FX.parts.length - 1; i >= 0; i--) { const p = FX.parts[i]; p.t -= dt; if (p.t <= 0) { p.sp.parent?.remove(p.sp); p.sp.material.dispose(); FX.parts.splice(i, 1); continue; } p.vy -= p.grav * dt; p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt; const k = p.t / p.life; p.sp.material.opacity = Math.min(1, k * 1.6); p.sp.scale.setScalar(p.size * (0.5 + k * 0.7)); } }
function fxClear() { for (const p of FX.parts) p.sp.parent?.remove(p.sp); FX.parts.length = 0; FX.shake = FX.shakeT = 0; FX.off.set(0, 0, 0); }
export async function run(T, def, opts = {}) {
  if (RUN || T.busy || T.lane || T.active !== def.room) return false;
  const h = hud(), S = T.state, M = T.M, id = def.key || def.id;
  if (locked(T, def)) { const N = nightOf(def); h.reset(); document.body.classList.add('msnlock'); showCard(h, { kicker: N.name, title: def.title, lines: [window.__shell?.lockLine?.(def.night || 1) || `Opens at ${N.need} Sunspots. You have ${sunTotal(T)}.`, 'Errands, games and secrets around town all leave one. Check the JOURNAL.'], buttons: [['OKAY', () => { h.card.classList.remove('on'); h.root.style.display = ''; document.body.classList.remove('msnlock'); }]] }); h.root.style.display = 'block'; return false; }
  RUN = def; T.busy = true; def.state = 'intro';
  h.root.style.display = 'block'; await h.fade(true, 300);
  const A = T.rooms[T.active], saved = { scene: T.scene, camera: T.camera };
  if (!opts.phase && !Q.has('nointro') && !Q.has('mauto') && def.video !== false) { try { const r = await playCinematic(def.video || (def.id + '_intro')); def.video_played = r?.played; } catch (_) { } }
  const inst = def.inst ||= def.create({ T, S, M, hud: h, def });
  const I = def.I ||= input(); I.reset();
  h.reset(def.title); h.quitEl.onclick = (e) => { e.stopPropagation(); quit(); };
  document.body.classList.add('msn'); window.__town?.hushBubble?.(); h.root.style.display = '';
  if ((S[id] || 0) === 0) { S[id] = 1; M.save(); }
  let last = 0;
  const LANE = { scene: inst.scene, camera: inst.camera, update: (dt, t) => { const a = innerWidth / innerHeight; if (Math.abs(a - last) > 1e-3) { last = a; inst.camera.aspect = a; inst.resize?.(a); inst.camera.updateProjectionMatrix(); } h.tickSub(dt); const dd = Math.min(dt, 0.05); fxTick(dd, inst.camera); try { inst.update(dd, t, I); } catch (e) { console.warn(def.id, e); } fxPost(dd, inst.camera); }, end: () => detach() };
  const ctl = { finish, quit, I, hud: h, auto: Q.has('mauto'), opts };
  FX.scene = inst.scene; FX.cam = inst.camera; fxClear(); h.root.classList.toggle('hintL', def.hintSide === true); h.root.classList.toggle('hintR', def.hintSide === 'right'); h.root.classList.toggle('tipMid', !!def.tipMid); h.root.classList.remove('panelOn');
  try { await inst.start(ctl); } catch (e) { console.warn('mission start failed', def.id, e); }
  if (def.tip) setTimeout(() => { if (def.state !== 'play') return; h.tipEl.innerHTML = `<b>HOW TO PLAY</b>`; h.tipEl.append(def.tip); h.tipEl.classList.add('on'); h.root.classList.add('tipOn'); clearTimeout(h.tipT); h.tipT = setTimeout(() => { h.tipEl.classList.remove('on'); h.root.classList.remove('tipOn'); }, 6000); }, 400);
  T.lane = LANE; T.scene = inst.scene; T.camera = inst.camera; last = 0; def.state = 'play';
  def.test = { get tris() { return countTris(inst.scene); }, get phase() { return inst.phase; }, inst, ctl };
  await h.fade(false, 350); T.busy = false;
  async function finish(res) {   // res: { stars, title, lines, suns: [ids earned], win }
    def.state = 'result'; const got = []; let fresh = 0;
    for (const sid of res.suns || []) { const s = (def.suns || []).find((o) => o.id === sid); if (!s) continue; if (!S.msn[sid]) { S.msn[sid] = 1; fresh++; } got.push([s.name, !!fresh && !S.sun?.[sid]]); }
    if (res.win !== false) { S[id] = 2; } S.msnBest[def.id] = Math.max(S.msnBest[def.id] || 0, res.stars || 0); M.save();
    if (res.win === false) { sfx.tone(392, 0.28, 'triangle', 0.2); sfx.tone(349, 0.28, 'triangle', 0.2, 0, 0.26); sfx.tone(262, 0.6, 'triangle', 0.22, -0.3, 0.52); juice.shake(0.18, 0.3); }
    else { [523, 659, 784, 1046, 1318].forEach((f, i) => sfx.tone(f, i === 4 ? 0.6 : 0.16, 'triangle', 0.2, 0, i * 0.09)); juice.confetti(h.root, res.stars >= 3 ? 70 : 40); juice.shake(0.12, 0.25); }
    for (let i = 0; i < (res.stars || 0); i++) setTimeout(() => sfx.star(i), 250 + i * 260); if (fresh) setTimeout(() => sfx.sun(), 1100);
    def.result = res;
    showCard(h, { kicker: res.win === false ? 'NOT THIS TIME' : def.title, title: res.title || (res.win === false ? 'SO CLOSE' : 'DONE'), stars: res.stars, lines: res.lines || [],
      suns: (def.suns || []).map((s) => [s.name, !!S.msn[s.id], (res.suns || []).includes(s.id)]),
      buttons: [['AGAIN', () => restart()], ['DONE', () => quit(), true]] });
  }
  async function restart() { h.card.classList.remove('on'); await h.fade(true, 250); I.reset(); h.reset(def.title); try { inst.stop?.(); await inst.start(ctl); } catch (e) { console.warn(e); } def.state = 'play'; await h.fade(false, 300); }
  async function quit() { if (def.state === 'leaving') return; def.state = 'leaving'; await h.fade(true, 300); detach(); await h.fade(false, 300); }
  function detach() { if (RUN !== def) return; try { inst.stop?.(); } catch (e) { console.warn(e); } h.card.classList.remove('on'); h.reset(); I.reset(); document.body.classList.remove('msn');
    if (T.lane === LANE) { T.lane = null; T.scene = A?.scene || saved.scene; T.camera = saved.camera; } RUN = null; def.state = 'off'; T.busy = false; }
  return true;
}
function showCard(h, { kicker = '', title = '', stars = null, lines = [], suns = [], buttons = [] }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  h.card.innerHTML = `<b>${esc(kicker)}</b><h2>${esc(title)}</h2>` + (stars != null ? `<div class="stars">${[0, 1, 2].map((i) => i < stars ? `<i style="animation-delay:${0.25 + i * 0.26}s">★</i>` : '<s>★</s>').join('')}</div>` : '') + lines.map((l) => `<p>${esc(l)}</p>`).join('')
    + (suns.length ? '<div>' + suns.map(([n, have, now]) => `<span class="sun${now && have ? ' new' : ''}">${have ? '☀ ' + esc(n) : '☀ ???'}</span>`).join('') + '</div>' : '')
    + `<div class="row">${buttons.map(([l], i) => `<button data-i="${i}"${buttons[i][2] ? '' : ' class="alt"'}>${esc(l)}</button>`).join('')}</div>`;
  h.card.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); sfx.tick(); buttons[+b.dataset.i][1](); }));
  h.card.classList.toggle('lose', kicker === 'NOT THIS TIME'); h.card.classList.add('on');
}
export const missions = () => REG;
