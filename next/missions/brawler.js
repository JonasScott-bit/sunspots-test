// missions/brawler.js — Next Level: TACO TUESDAY'S BACKLANE BRAWLER
// A first-person felt fist-fight in the back lane behind Taco Tuesday's (the Neon Strip, east of the donut place), Tuesday night.
// You are the Wolf: your own felt paws, mustard sleeves. Three escalating bouts against the taco joint's regulars:
//   1. HARD SHELL (a crunchy taco)  2. PIT BOSS (half an avocado)  3. EL SCORCHO (a masked hot-sauce bottle: sauce spray + flying tacos)
// Slapstick only: fists, dodges, a flying taco you can catch and eat, a hot-sauce gag. No weapons.
// Touch: tap LEFT / RIGHT half = jab that side · hold BLOCK · swipe (or the arrow buttons) = dodge · hold HOWL when the meter is full, let go.
// Keys:  J / K jab · A D (or arrows) dodge · S / Space hold block · W / E hold special.
// Plugs into town.js like minigames.js (an object with .scene/.camera/.begin/.update/.end that town.js swaps in as T.lane).
// Everything procedural felt/clay + canvas signs; the crowd is 3 cast GLBs in rest pose (no mixers = 0 extra rigs).
// Optional intro clip: next/video/brawler_intro.mp4 via cinematic.js (TAP FOR SOUND / HOLD TO SKIP). Missing file = straight to the fight.
import * as THREE from 'three';
import { playCinematic } from '../cinematic.js';

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ town hooks (used by town.js)
export const TACO_DOOR = { x: 48, z: -39.85, ry: 0 };   // back door of the shack, facing the back lane (+z)
export const TACO_ROOM = { name: 'TACO TUESDAY\'S BACK LANE', wall: '#7a3a34', trim: '#2fae8a', floor: '#3e3a40', floor2: '#36323a', light: '#c8ccff', real: true, W: 9, D: 6.5 };
export const VIDEO = 'video/brawler_intro.mp4';

// ------------------------------------------------------------------ canvas + felt kit
function cv(w, h, draw, rx = 1, ry = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rx !== 1 || ry !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); } return t; }
function speck(g, w, h, n = 1400, a = 0.08) { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
function shade(hex, k) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); }
function kit(feltMat) {
  const M = new Map();
  const fm = (c, o) => { if (o) return feltMat(c, o); if (!M.has(c)) M.set(c, feltMat(c)); return M.get(c); };
  const box = (w, h, d, c) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return new THREE.Mesh(g, typeof c === 'string' ? fm(c) : c); };
  const cyl = (rt, rb, h, c, s = 10) => { const g = new THREE.CylinderGeometry(rt, rb, h, s); g.translate(0, h / 2, 0); return new THREE.Mesh(g, typeof c === 'string' ? fm(c) : c); };
  const ball = (r, c, ws = 12, hs = 9) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), typeof c === 'string' ? fm(c) : c);
  const plane = (w, h, map, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 1, ...o }));
  const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const sign = (text, w, h, bg, fg, opt = {}) => { const t = cv(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); speck(g, cw, ch, 500, 0.06);
      const L = text.split('\n'); let fs = Math.round(ch / (L.length + 0.6)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
      const font = () => `${opt.weight || 700} ${fs}px ${opt.font || 'Futura, Avenir, sans-serif'}`; g.font = font(); for (const l of L) while (g.measureText(l).width > cw * 0.9 && fs > 10) { fs -= 2; g.font = font(); }
      if (opt.glow) { g.shadowColor = fg; g.shadowBlur = 18; } L.forEach((l, i) => g.fillText(l, cw / 2, ch * (i + 0.5) / L.length)); });
    return plane(w, h, t, opt.glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: opt.glow } : {}); };
  return { fm, box, cyl, ball, plane, at, sign };
}

// ------------------------------------------------------------------ shared textures (lazy)
let TX = null;
function tex() {
  if (TX) return TX;
  const brick = (base, mortar) => cv(256, 256, (g, w, h) => { g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) { const x = c * 32 + (r % 2 ? 16 : 0), y = r * 16; g.fillStyle = shade(base, Math.random() * 0.12 - 0.06); g.fillRect(x + 2, y + 2, 28, 12); }
    speck(g, w, h, 2200, 0.07); }, 3, 1.6);
  TX = {
    brick: brick('#8a4036', '#4a2a2c'),
    brick2: brick('#6f4a6a', '#3a2638'),
    asphalt: cv(256, 256, (g, w, h) => { g.fillStyle = '#3e3a42'; g.fillRect(0, 0, w, h); speck(g, w, h, 4000, 0.07);
      g.strokeStyle = 'rgba(20,16,22,.6)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(40,46,90,.45)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 20, 8 + Math.random() * 8, Math.random(), 0, 7); g.fill(); } }, 3, 4),
    sky: cv(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120c2a'); gr.addColorStop(0.6, '#2a1f52'); gr.addColorStop(1, '#5a2f62'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,243,220,${0.3 + Math.random() * 0.6})`; const s = Math.random() < 0.15 ? 3 : 2; g.fillRect(Math.random() * w, Math.random() * h * 0.7, s, s); }
      g.fillStyle = '#f6e7b8'; g.beginPath(); g.arc(w * 0.72, h * 0.28, 30, 0, 7); g.fill(); g.fillStyle = 'rgba(200,180,120,.5)'; for (const [dx, dy, r] of [[-8, -6, 6], [9, 7, 5], [4, -12, 3]]) { g.beginPath(); g.arc(w * 0.72 + dx, h * 0.28 + dy, r, 0, 7); g.fill(); }
      g.fillStyle = '#1c1430'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 24) g.lineTo(x, h * (0.78 + Math.sin(x * 0.03) * 0.04 + (x % 72 === 0 ? -0.1 : 0))); g.lineTo(w, h); g.fill(); }),
    awning: cv(256, 64, (g, w, h) => { const C = ['#ff6fae', '#fff3dc', '#2fae8a', '#fff3dc']; for (let i = 0; i < 16; i++) { g.fillStyle = C[i % 4]; g.fillRect(i * 16, 0, 16, h); } speck(g, w, h, 600, 0.08); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, h - 10, w, 10); }),
    neon: cv(512, 192, (g, w, h) => { g.fillStyle = '#1c1220'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#ff6fae'; g.shadowBlur = 22; g.fillStyle = '#ffd0e6'; g.font = '700 74px "Brush Script MT","Snell Roundhand",cursive'; g.fillText('Taco Tuesday\'s', w / 2 + 28, h * 0.42);
      g.shadowColor = '#5fffc8'; g.fillStyle = '#c8fff0'; g.font = '700 26px Futura,Avenir,sans-serif'; g.fillText('BACK DOOR · OPEN \'TIL 2AM', w / 2, h * 0.82);
      g.shadowColor = '#ffd04a'; g.strokeStyle = '#ffe28a'; g.lineWidth = 6; g.beginPath(); g.arc(58, h * 0.5, 34, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); g.strokeStyle = '#7dff9a'; g.beginPath(); g.moveTo(30, h * 0.5); for (let x = 30; x <= 86; x += 8) g.lineTo(x, h * 0.5 - 8 + (x % 16 ? 0 : -6)); g.stroke(); }),
  };
  return TX;
}

// ------------------------------------------------------------------ the back lane (shared by the room view and the first-person fight)
// Lane runs along -z: brick walls at x = ±2.9, Taco Tuesday's back door on the right wall, a chain-link end with the night sky.
function buildLane(G, K, o = {}) {
  const T = tex(), len = o.len || 15, z0 = o.z0 ?? 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6.4, len), new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, z0 - len / 2); G.add(ground);
  const wallM = new THREE.MeshStandardMaterial({ map: T.brick, roughness: 1 }), wallM2 = new THREE.MeshStandardMaterial({ map: T.brick2, roughness: 1 });
  wallM.map.repeat.set(len / 3, 1.6); wallM2.map.repeat.set(len / 3, 1.6);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(len, 5), s < 0 ? wallM2 : wallM); w.position.set(s * 2.9, 2.5, z0 - len / 2); w.rotation.y = -s * Math.PI / 2; G.add(w);
    const cap = K.box(0.25, 0.18, len, '#3a2430'); K.at(cap, s * 2.85, 5, z0 - len / 2); G.add(cap); }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: T.sky, fog: false })); sky.position.set(0, 3.6, z0 - len - 3); G.add(sky);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(6, len + 3), new THREE.MeshBasicMaterial({ map: T.sky, fog: false })); top.rotation.x = Math.PI / 2; top.position.set(0, 5.05, z0 - len / 2 - 1); G.add(top);
  const fT = cv(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#a8aab4'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, 18, 7);
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.6), new THREE.MeshStandardMaterial({ map: fT, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 })); fence.position.set(0, 1.3, z0 - len + 0.2); G.add(fence);
  for (const x of [-2.8, 0, 2.8]) { const p = K.cyl(0.04, 0.04, 2.7, '#8a8c94', 6); K.at(p, x, 0, z0 - len + 0.2); G.add(p); }
  // Taco Tuesday's back door (right wall), warm kitchen light, neon sign, a bare bulb
  const dz = o.doorZ ?? -3.2;
  const door = new THREE.Group(); door.add(K.box(1.3, 2.4, 0.12, '#2a1f2a')); const slab = K.box(1.05, 2.15, 0.08, '#2fae8a'); slab.position.z = 0.05; door.add(slab);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshBasicMaterial({ color: '#ffcf7a' })); win.position.set(0, 1.62, 0.1); door.add(win);
  const knob = K.ball(0.05, '#e0b04a', 8, 6); knob.position.set(0.38, 1.05, 0.12); door.add(knob);
  const step = K.box(1.6, 0.16, 0.6, '#6a5a5a'); step.position.z = 0.25; door.add(step);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c0' })); bulb.position.set(0, 2.75, 0.3); door.add(bulb);
  const shadeM = K.cyl(0.08, 0.2, 0.12, '#2a3a3a', 10); shadeM.position.set(0, 2.78, 0.3); door.add(shadeM);
  const kitchen = K.sign('KITCHEN · STAFF & CHALLENGERS ONLY', 1.2, 0.18, '#fff3dc', '#3a1f2a'); kitchen.position.set(0, 2.3, 0.11); door.add(kitchen);
  door.position.set(2.88, 0, dz); door.rotation.y = -Math.PI / 2; G.add(door);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98), new THREE.MeshStandardMaterial({ map: T.neon, emissive: new THREE.Color('#ffffff'), emissiveMap: T.neon, emissiveIntensity: 0.95, roughness: 1 }));
  neon.position.set(2.86, 3.55, dz - 1.9); neon.rotation.y = -Math.PI / 2; G.add(neon);
  // string lights zig-zagging across the lane (one instanced mesh)
  const N = 48, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N), cols = ['#ffd27a', '#ff8ac0', '#8affd2', '#fff3dc'], m4 = new THREE.Matrix4(), c = new THREE.Color();
  const wire = []; for (let i = 0; i < N; i++) { const seg = Math.floor(i / 12), f = (i % 12) / 11, za = z0 - 2 - seg * 3, zb = za - 1.5, s = seg % 2 ? -1 : 1;
    const x = lerp(-2.8 * s, 2.8 * s, f), z = lerp(za, zb, f), y = 4.3 - Math.sin(f * Math.PI) * 0.6; m4.makeTranslation(x, y, z); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, c.set(cols[i % 4])); wire.push(new THREE.Vector3(x, y + 0.06, z)); }
  G.add(bulbs);
  for (let s = 0; s < 4; s++) G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire.slice(s * 12, s * 12 + 12)), new THREE.LineBasicMaterial({ color: '#2a2030' })));
  // dumpster ("FELT BIN"), crates, a mop bucket, the rules board
  const bin = new THREE.Group(); bin.add(K.box(1.7, 1.1, 0.95, '#2f6a4a')); const lid = K.box(1.78, 0.08, 1.0, '#244f38'); lid.position.y = 1.1; lid.rotation.x = -0.12; bin.add(lid);
  const bl = K.sign('BIN · NO FIGHTERS', 1.1, 0.22, '#244f38', '#fff3dc'); bl.position.set(0, 0.7, 0.48); bin.add(bl); K.at(bin, -2.0, 0, z0 - 9.2, Math.PI / 2); G.add(bin);
  const crate = (x, z, y = 0, c2 = '#b88a5a', lab = 'LIMES') => { const g = new THREE.Group(); g.add(K.box(0.62, 0.48, 0.48, c2)); const l = K.sign(lab, 0.5, 0.16, '#efe2c4', '#2f7a4a'); l.position.set(0, 0.26, 0.245); g.add(l); K.at(g, x, y, z, rnd(-0.3, 0.3)); G.add(g); return g; };
  crate(-2.35, z0 - 4.4); crate(-2.3, z0 - 4.5, 0.48, '#c99a6a', 'TORTILLAS'); crate(2.35, dz + 1.4, 0, '#b88a5a', 'ONIONS'); crate(-2.4, z0 - 11.5, 0, '#a87a4a', 'LIMES'); crate(2.3, z0 - 11.2, 0, '#c99a6a', 'SALSA (MILD)');
  const bucket = new THREE.Group(); bucket.add(K.cyl(0.2, 0.17, 0.36, '#f2c230', 12)); const mop = K.cyl(0.02, 0.02, 1.3, '#c9a06a', 5); mop.rotation.z = 0.25; mop.position.y = 0.1; bucket.add(mop); K.at(bucket, 2.4, 0, dz - 1.0); G.add(bucket);
  const rules = K.sign('BACK LANE RULES\n1. FISTS ONLY  2. NO BITING (WOLF)\n3. LOSER BUSSES TABLES', 1.5, 0.75, '#2a2a28', '#f3efe2', { font: '"Comic Sans MS", cursive' }); rules.position.set(-2.88, 1.9, z0 - 6.2); rules.rotation.y = Math.PI / 2; G.add(rules);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.66, 40), new THREE.MeshBasicMaterial({ color: '#efe6d0', transparent: true, opacity: 0.55 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.01, o.ringZ ?? -0.4); G.add(ring);
  const warm = new THREE.PointLight('#ffb36a', 7, 7.5, 2); warm.position.set(2.2, 2.6, dz); G.add(warm);
  const pink = new THREE.PointLight('#ff5fa8', 4, 6, 2); pink.position.set(2.0, 3.4, dz - 1.9); G.add(pink);
  return { door, neon, bin };
}

// ------------------------------------------------------------------ the three regulars (procedural felt)
function eyes(K, g, x, y, z, r = 0.075, sep = 0.16) { const out = []; for (const s of [-1, 1]) { const w = K.ball(r, '#fff8ec', 12, 9); w.position.set(x + s * sep / 2, y, z); w.scale.z = 0.6; g.add(w);
    const p = K.ball(r * 0.48, '#1a1218', 10, 8); p.position.set(x + s * sep / 2, y, z + r * 0.48); g.add(p);
    const b = K.box(r * 2.2, r * 0.5, r * 0.5, '#2a1a1a'); b.geometry.translate(0, -r * 0.25, 0); b.position.set(x + s * sep / 2, y + r * 1.25, z + r * 0.2); b.rotation.z = s * 0.25; g.add(b); out.push({ w, p, b, s }); } return out; }
function legs(K, g, x, c, shoe, h = 0.4) { for (const s of [-1, 1]) { if (h > 0.05) { const l = K.cyl(0.07, 0.08, h, c, 8); l.position.set(s * x, 0.06, 0); g.add(l); } const sh = K.ball(0.13, shoe, 10, 8); sh.scale.set(1, 0.55, 1.4); sh.position.set(s * x, 0.07, 0.06); g.add(sh); } }
function arm(K, c, glove, len = 0.46, gr = 0.14) {
  const pv = new THREE.Group(); const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, len, 4, 8), K.fm(c)); up.position.y = -len / 2; pv.add(up);
  const gm = K.fm(glove, { emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0 }); const gl = new THREE.Mesh(new THREE.SphereGeometry(gr, 14, 10), gm); gl.scale.set(1, 0.92, 1.12); gl.position.y = -len - gr * 0.6; pv.add(gl);
  const cuff = K.cyl(gr * 0.72, gr * 0.72, 0.07, '#fff3dc', 10); cuff.position.y = -len - 0.02; pv.add(cuff);
  pv.userData = { glove: gl, gm, len }; return pv; }
export const FOES = [
  { id: 'shell', name: 'HARD SHELL', tag: 'Crunchy outside. Also crunchy inside.', hp: 50, tell: 0.95, rec: 1.1, idle: [1.2, 2.0], dmg: 8, atks: ['L', 'R', 'L', 'R', 'S'], combo: 1, feint: 0, interrupt: true, word: ['CRUNCH!', 'CRACK!', 'SNAP!'], crumb: ['#f2c24a', '#7fbf4a', '#e0502e'] },
  { id: 'pit', name: 'PIT BOSS', tag: 'Half an avocado. All attitude.', hp: 80, tell: 0.72, rec: 0.8, idle: [0.9, 1.6], dmg: 11, atks: ['L', 'R', 'S', 'U', 'L', 'R'], combo: 2, feint: 0.22, interrupt: false, word: ['SQUISH!', 'SPLAT!', 'BONK!'], crumb: ['#9fc95a', '#c9d98a', '#6a4a2a'] },
  { id: 'scorcho', name: 'EL SCORCHO', tag: 'Masked. Bottled. Extra hot.', hp: 110, tell: 0.6, rec: 0.62, idle: [0.7, 1.3], dmg: 13, atks: ['L', 'R', 'S', 'U', 'spray', 'taco', 'L', 'R'], combo: 3, feint: 0.18, interrupt: false, word: ['GLUG!', 'SIZZLE!', 'POW!'], crumb: ['#e0302a', '#ff8a3a', '#ffd04a'] },
];
function makeFoe(K, id) {
  const root = new THREE.Group(), torso = new THREE.Group(); root.add(torso); let E, sh = 1.0, sx = 0.55, H = 1.7; const extra = {};
  if (id === 'shell') {   // a crunchy taco standing on its curve: semicircle body, fillings on top
    const g = new THREE.CylinderGeometry(0.66, 0.66, 0.42, 26, 1, false, -Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(g, K.fm('#e9b44c', { side: THREE.DoubleSide })); body.position.y = 1.32; torso.add(body);
    for (let i = 0; i < 18; i++) { const sp = K.ball(0.035, '#c98a30', 6, 4); const a = rnd(-1.3, 1.3), r = rnd(0.15, 0.6); sp.position.set(Math.sin(a) * r, 1.32 - Math.cos(a) * r, 0.215); sp.scale.z = 0.3; torso.add(sp); }
    for (let i = 0; i < 9; i++) { const l = K.ball(0.13, i % 3 ? '#7fbf4a' : '#5fa83a', 8, 6); l.scale.set(1.2, 0.55, 0.9); l.position.set(-0.56 + i * 0.14, 1.36 + Math.sin(i * 2.1) * 0.03, rnd(-0.08, 0.08)); torso.add(l); }
    for (const x of [-0.32, 0.05, 0.38]) { const t = K.ball(0.09, '#e0502e', 10, 8); t.scale.y = 0.6; t.position.set(x, 1.45, 0.02); torso.add(t); }
    for (let i = 0; i < 7; i++) { const ch = K.box(0.03, 0.03, 0.22, '#ffd04a'); ch.position.set(rnd(-0.45, 0.45), 1.44, rnd(-0.06, 0.06)); ch.rotation.set(rnd(-0.4, 0.4), rnd(-1, 1), 0.2); torso.add(ch); }
    E = eyes(K, torso, 0, 1.12, 0.22, 0.08, 0.26); const mouth = K.box(0.18, 0.035, 0.03, '#5a2a1a'); mouth.position.set(0, 0.92, 0.215); torso.add(mouth); extra.mouth = mouth;
    legs(K, root, 0.18, '#e9b44c', '#e0502e', 0.62); sh = 1.08; sx = 0.62; H = 1.6;
  } else if (id === 'pit') {   // half an avocado: dark skin back, pale face, the pit as a belly
    const skin = K.ball(0.62, '#3d5a2a', 22, 16); skin.scale.set(1, 1.28, 0.55); skin.position.y = 1.2; torso.add(skin);
    const rim = K.ball(0.585, '#9fc95a', 22, 16); rim.scale.set(1, 1.27, 0.4); rim.position.set(0, 1.2, 0.08); torso.add(rim);
    const flesh = K.ball(0.56, '#c9d98a', 22, 16); flesh.scale.set(1, 1.26, 0.36); flesh.position.set(0, 1.2, 0.14); torso.add(flesh);
    const pit = K.ball(0.25, '#7a4a2a', 16, 12); pit.scale.z = 0.7; pit.position.set(0, 0.98, 0.27); torso.add(pit); extra.pit = pit;
    const shine = K.ball(0.06, '#a8784a', 8, 6); shine.position.set(-0.08, 1.06, 0.44); shine.scale.z = 0.4; torso.add(shine);
    E = eyes(K, torso, 0, 1.52, 0.3, 0.085, 0.26); const mouth = K.box(0.22, 0.04, 0.03, '#2a3a1a'); mouth.position.set(0, 1.32, 0.33); mouth.rotation.z = 0.12; torso.add(mouth); extra.mouth = mouth;
    const band = K.box(0.9, 0.08, 0.1, '#c9302a'); band.position.set(0, 1.74, 0.16); torso.add(band);   // a sweatband
    legs(K, root, 0.22, '#3d5a2a', '#2a2a30', 0.5); sh = 1.3; sx = 0.6; H = 1.95;
  } else {   // EL SCORCHO: a hot-sauce bottle in a luchador mask (made-up label)
    const red = K.fm('#c9302a'); const body = K.cyl(0.42, 0.44, 0.95, red, 22); body.position.y = 0.45; torso.add(body);
    const shoulder = K.cyl(0.16, 0.42, 0.32, red, 22); shoulder.position.y = 1.4; torso.add(shoulder);
    const neck = K.cyl(0.15, 0.16, 0.26, red, 16); neck.position.y = 1.72; torso.add(neck);
    const cap = K.cyl(0.18, 0.18, 0.2, '#2a2a2e', 16); cap.position.y = 1.96; torso.add(cap); extra.cap = cap;
    const labT = cv(512, 192, (g, w, h) => { g.fillStyle = '#fff3dc'; g.fillRect(0, 0, w, h); speck(g, w, h, 600, 0.06); g.fillStyle = '#2a8a6a'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
      g.fillStyle = '#e0302a'; g.font = '700 46px Futura,Avenir,sans-serif'; g.textAlign = 'center'; for (const cx of [0.25, 0.75]) { g.fillText('EL SCORCHO', w * cx, h * 0.6); }
      g.font = '700 18px Futura,Avenir,sans-serif'; g.fillStyle = '#3a1f2a'; for (const cx of [0.25, 0.75]) g.fillText('SALSA PICANTE · XXX HOT', w * cx, h * 0.82); });
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.445, 0.455, 0.42, 22, 1, true), new THREE.MeshStandardMaterial({ map: labT, roughness: 1 })); lab.position.y = 0.66; torso.add(lab);
    const mask = K.ball(0.425, '#2f55a8', 22, 14); mask.scale.set(1, 0.62, 1); mask.position.y = 1.25; torso.add(mask);
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), K.fm(i % 2 ? '#ffd04a' : '#ff8a3a')); const a = -0.9 + i * 0.3; f.position.set(Math.sin(a) * 0.4, 1.32, Math.cos(a) * 0.4); f.rotation.x = 0.5; f.rotation.z = -a * 0.5; torso.add(f); }
    for (const s of [-1, 1]) { const hole = K.ball(0.1, '#fff3dc', 12, 8); hole.scale.set(1.3, 0.8, 0.4); hole.position.set(s * 0.13, 1.22, 0.37); torso.add(hole); }
    E = eyes(K, torso, 0, 1.22, 0.4, 0.06, 0.26); const mouth = K.box(0.2, 0.04, 0.03, '#3a1f2a'); mouth.position.set(0, 1.02, 0.44); torso.add(mouth); extra.mouth = mouth;
    legs(K, root, 0.22, '#c9302a', '#ffd04a', 0); torso.position.y = 0.12; sh = 1.22; sx = 0.46; H = 2.2; extra.y0 = 0.12;
  }
  const glove = id === 'pit' ? '#e8e2d4' : id === 'scorcho' ? '#ffd04a' : '#fff3dc', armC = id === 'shell' ? '#d9a03c' : id === 'pit' ? '#3d5a2a' : '#c9302a';
  const arms = {}; for (const s of [-1, 1]) { const a = arm(K, armC, glove, id === 'pit' ? 0.5 : 0.44, id === 'scorcho' ? 0.15 : 0.14); a.position.set(s * sx, sh, 0.02); torso.add(a); arms[s < 0 ? 'L' : 'R'] = a; }
  // the tell marker: a felt "!" (yellow = block or dodge, red "!!" = dodge only)
  const tellT = cv(128, 128, (g) => { g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = '#3a1f2a'; g.font = '900 96px Futura,Avenir,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 64, 70); });
  const tellR = cv(128, 128, (g) => { g.fillStyle = '#e0302a'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = '#fff3dc'; g.font = '900 80px Futura,Avenir,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!!', 64, 70); });
  const tell = new THREE.Sprite(new THREE.SpriteMaterial({ map: tellT, depthTest: false, transparent: true })); tell.scale.setScalar(0.34); tell.position.y = H + 0.3; tell.visible = false; tell.renderOrder = 5; root.add(tell);
  const dizzy = new THREE.Group(); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: '#ffd04a' })); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38); dizzy.add(s); }
  dizzy.position.y = H + 0.05; dizzy.visible = false; root.add(dizzy);
  root.userData = { id, torso, arms, E, tell, tellT, tellR, dizzy, H, extra };
  return root;
}

// ------------------------------------------------------------------ the Wolf's felt paws (camera space)
function makePaws(K) {
  const out = {}; const fur = K.fm('#8d8a96'), pad = K.fm('#f0dcc8'), sleeve = K.fm('#e9a62c');
  for (const s of [-1, 1]) {
    const g = new THREE.Group(), p = new THREE.Group(); g.add(p);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), fur); paw.scale.set(1.05, 0.86, 1.2); p.add(paw);
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), fur); k.position.set(-0.054 + i * 0.036, 0.045, -0.095); p.add(k); const cl = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.03, 5), pad); cl.rotation.x = -Math.PI / 2; cl.position.set(-0.054 + i * 0.036, 0.03, -0.13); p.add(cl); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.05, 3, 6), fur); th.rotation.z = Math.PI / 2; th.position.set(-s * 0.09, -0.02, -0.05); p.add(th);
    const pd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pad); pd.scale.set(1, 0.4, 1); pd.position.set(0, -0.075, -0.01); p.add(pd);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.34, 14), sleeve); sl.rotation.x = Math.PI / 2; sl.position.z = 0.22; p.add(sl);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.022, 6, 16), K.fm('#c98a1c')); cuff.position.z = 0.07; p.add(cuff);
    const glowM = new THREE.MeshBasicMaterial({ color: '#ffd04a', transparent: true, opacity: 0, depthWrite: false }); const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glowM); p.add(glow);
    g.userData = { p, glowM }; g.position.set(s * 0.22, -0.23, -0.62); out[s < 0 ? 'L' : 'R'] = g;
  }
  return out;
}

// ------------------------------------------------------------------ sfx (synth on the game's sfx bus; respects the sound mode)
function sfx(audio) {
  const on = () => audio?.ctx && audio.BUS?.sfx && (audio.mode === 'all' || audio.mode === 'sound') && audio.ctx.state === 'running';
  let noise = null; const nz = () => { if (noise) return noise; const c = audio.ctx, b = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (noise = b); };
  const env = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const thump = (f0 = 140, f1 = 45, dur = 0.18, vol = 0.9) => { if (!on()) return; const c = audio.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, 0.005, vol, dur); o.connect(g).connect(audio.BUS.sfx); o.start(t); o.stop(t + dur + 0.02); };
  const hiss = (freq = 1400, q = 0.8, dur = 0.25, vol = 0.4, sweep = 0) => { if (!on()) return; const c = audio.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = nz(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur); f.Q.value = q; env(g, t, Math.min(0.03, dur / 3), vol, dur); s.connect(f).connect(g).connect(audio.BUS.sfx); s.start(t); s.stop(t + dur + 0.05); };
  const tone = (fr, dur = 0.6, vol = 0.3, type = 'sine') => { if (!on()) return; const c = audio.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = fr; env(g, t, 0.004, vol, dur); o.connect(g).connect(audio.BUS.sfx); o.start(t); o.stop(t + dur + 0.02); };
  return {
    jab: () => hiss(900, 0.7, 0.09, 0.22, 2.2),
    hit: (big) => { thump(big ? 170 : 130, 40, big ? 0.3 : 0.16, big ? 1 : 0.8); hiss(2400, 1.2, 0.07, 0.35); },
    blocked: () => { thump(260, 120, 0.08, 0.5); hiss(3200, 2, 0.05, 0.2); },
    hurt: () => { thump(90, 35, 0.22, 1); hiss(600, 0.6, 0.18, 0.3); },
    whoosh: () => hiss(500, 0.6, 0.32, 0.35, 3.5),
    tell: (red) => tone(red ? 520 : 760, 0.12, 0.12, 'triangle'),
    cheer: (k = 1) => { hiss(1100, 0.5, 0.9 * k, 0.28 * k, 1.3); hiss(2200, 0.7, 0.7 * k, 0.12 * k, 0.8); },
    bell: () => { tone(880, 1.1, 0.25); tone(1320, 0.9, 0.12); setTimeout(() => { tone(880, 1.1, 0.25); tone(1320, 0.9, 0.12); }, 260); },
    crunch: () => { for (let i = 0; i < 4; i++) setTimeout(() => hiss(rnd(1800, 3600), 3, 0.05, 0.3), i * 45); },
    spray: () => hiss(3000, 0.4, 0.5, 0.3, 0.5),
    howl: () => { try { if (on() && audio.play && audio.buf?.sfx_wolf_howl) audio.play('sfx_wolf_howl', { gain: 0.8 }); else tone(440, 0.5, 0.15, 'sawtooth'); } catch (_) { } },
    warm: () => { try { audio?.load?.('sfx_wolf_howl')?.catch?.(() => { }); } catch (_) { } },
  };
}

// ------------------------------------------------------------------ DOM (one overlay)
let UI = null;
function ui() {
  if (UI) return UI;
  const css = document.createElement('style'); css.id = 'brCss';
  css.textContent = `
  #brUI{position:fixed;inset:0;z-index:9;display:none;font-family:Futura,Avenir,sans-serif;color:#fff3dc;-webkit-user-select:none;user-select:none;touch-action:none}
  body.br #brUI{display:block} body.br #roomUI,body.br #townObj,body.br #sceneSub,body.br #qtBtn,body.br #jnBtn,body.br #mmap{display:none!important}
  #brPad{position:absolute;inset:0;touch-action:none}
  .brBars{position:absolute;top:calc(env(safe-area-inset-top) + 12px);width:min(36vw,250px);pointer-events:none}
  #brMe{left:calc(env(safe-area-inset-left) + 58px)} #brFoe{right:calc(env(safe-area-inset-right) + 12px);text-align:right}
  .brBars b{display:block;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.18em;text-shadow:0 1px 4px #000;margin-bottom:3px}
  .brBar{height:13px;border-radius:7px;background:rgba(20,12,20,.6);box-shadow:0 0 0 2px #fff3dc;overflow:hidden;position:relative}
  .brBar i{position:absolute;top:0;bottom:0;left:0;width:100%;border-radius:7px;transition:width .15s}
  .brBar.hp i{background:linear-gradient(#ff8a6a,#e0402e)} .brBar.st{height:8px;margin-top:5px} .brBar.st i{background:linear-gradient(#ffe28a,#f2b632)}
  .brBar.st.low i{background:#8a7a6a} #brFoe .brBar i{left:auto;right:0}
  #brMid{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 10px);text-align:center;font:700 11px Futura,Avenir,sans-serif;letter-spacing:.2em;text-shadow:0 1px 4px #000;pointer-events:none}
  #brMid u{display:block;text-decoration:none;font-size:15px;color:#ffd04a;margin-top:2px}
  #brExit{position:absolute;right:calc(env(safe-area-inset-right) + 12px);top:calc(env(safe-area-inset-top) + 50px);border:0;border-radius:999px;padding:7px 14px;font:700 11px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:rgba(255,243,220,.85);box-shadow:0 3px 0 #b9a58a}
  .brBtn{position:absolute;border:0;border-radius:50%;font:800 12px Futura,Avenir,sans-serif;letter-spacing:.12em;color:#3a1f2a;background:rgba(255,243,220,.82);box-shadow:0 4px 0 #b9a58a,0 6px 16px rgba(0,0,0,.35);touch-action:none;-webkit-tap-highlight-color:transparent}
  .brBtn.on{transform:translateY(3px);box-shadow:0 1px 0 #b9a58a;background:#ffc98a}
  #brBlock{left:50%;bottom:calc(env(safe-area-inset-bottom) + 14px);width:80px;height:80px;margin-left:-40px}
  #brSpec{left:calc(50% + 54px);bottom:calc(env(safe-area-inset-bottom) + 24px);width:60px;height:60px;font-size:10px;background:rgba(90,70,110,.75);color:#d8c8f0;box-shadow:0 4px 0 #3a2a4a}
  #brSpec.ready{background:#ffd04a;color:#3a1f2a;box-shadow:0 4px 0 #b8832e,0 0 22px #ffd04a;animation:brPulse .8s infinite alternate}
  @keyframes brPulse{to{transform:scale(1.08)}}
  #brSpec svg{position:absolute;left:-8px;top:-8px;width:76px;height:76px;transform:rotate(-90deg);pointer-events:none}
  #brDL,#brDR{bottom:calc(env(safe-area-inset-bottom) + 18px);width:66px;height:66px;font-size:20px}
  #brDL{left:calc(env(safe-area-inset-left) + 16px)} #brDR{right:calc(env(safe-area-inset-right) + 16px)}
  .brZone{position:absolute;top:46%;font:800 11px Futura,Avenir,sans-serif;letter-spacing:.2em;color:rgba(255,243,220,.42);pointer-events:none;text-shadow:0 1px 3px #000}
  #brZL{left:calc(env(safe-area-inset-left) + 18px)} #brZR{right:calc(env(safe-area-inset-right) + 18px)}
  #brHint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 108px);text-align:center;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.14em;text-shadow:0 1px 5px #000;pointer-events:none;transition:opacity .4s;opacity:0}
  #brCrowd{position:absolute;left:calc(env(safe-area-inset-left) + 58px);top:calc(env(safe-area-inset-top) + 62px);max-width:40vw;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.06em;text-shadow:0 1px 4px #000;pointer-events:none;opacity:0;transition:opacity .3s}
  #brCrowd.on{opacity:1} #brCrowd b{color:#ffd04a;letter-spacing:.16em;margin-right:6px}
  #brBig{position:absolute;left:0;right:0;top:36%;text-align:center;font:700 clamp(40px,12vw,86px) "Brush Script MT","Snell Roundhand",cursive;color:#ffd04a;text-shadow:0 4px 0 #b8332e,0 8px 20px rgba(0,0,0,.5);opacity:0;transform:scale(.6) rotate(-6deg);transition:opacity .15s,transform .3s;pointer-events:none}
  #brBig.on{opacity:1;transform:scale(1) rotate(-6deg)} #brBig small{display:block;font:700 14px Futura,Avenir,sans-serif;letter-spacing:.22em;color:#fff3dc}
  .brPop{position:absolute;font:900 30px Futura,Avenir,sans-serif;color:#fff3dc;-webkit-text-stroke:2px #3a1f2a;text-shadow:0 3px 0 #e0402e;pointer-events:none;animation:brPop .7s ease-out forwards}
  @keyframes brPop{0%{transform:translate(-50%,-50%) scale(.4) rotate(-8deg);opacity:1}30%{transform:translate(-50%,-70%) scale(1.15) rotate(4deg)}100%{transform:translate(-50%,-140%) scale(1);opacity:0}}
  #brFlash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(224,48,42,0) 40%,rgba(224,48,42,.75) 100%)}
  #brSplat{position:absolute;inset:0;pointer-events:none;opacity:0}
  #brSplat i{position:absolute;border-radius:50%;box-shadow:inset -6px -6px 0 rgba(0,0,0,.18)}
  #brPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(86vw,370px);max-height:86vh;overflow:auto;padding:16px 16px 14px;border-radius:14px;background:#3a2418;box-shadow:0 0 0 4px #ff6fae,0 12px 30px rgba(0,0,0,.55);text-align:center;display:none}
  #brPanel.on{display:block} #brPanel h3{margin:0 0 2px;font:700 34px "Brush Script MT","Snell Roundhand",cursive;color:#ffd9c0} #brPanel h4{margin:0 0 8px;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.24em;color:#ffd04a}
  #brPanel p{margin:0 0 8px;font-size:12px;letter-spacing:.1em;line-height:1.55;color:#efe2c4} #brPanel .stars{font-size:34px;letter-spacing:.1em;color:#ffd04a;text-shadow:0 2px 0 #b8332e} #brPanel .stars s{color:#6a5048;text-decoration:none;text-shadow:none}
  #brPanel button{display:block;width:100%;margin:8px 0 0;border:0;border-radius:999px;padding:12px;font:700 14px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:#ffc98a;box-shadow:0 4px 0 #c27b45}
  #brPanel button.alt{background:#efe2c4;box-shadow:0 4px 0 #b9a58a}
  body.br.brCard .brBtn,body.br.brCard .brZone{opacity:.25}
`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'brUI';
  el.innerHTML = `<div id="brPad"></div><div id="brFlash"></div><div id="brSplat"></div>
    <div class="brBars" id="brMe"><b>WOLF</b><div class="brBar hp"><i></i></div><div class="brBar st"><i></i></div></div>
    <div class="brBars" id="brFoe"><b>—</b><div class="brBar hp"><i></i></div></div>
    <div id="brMid">BOUT 1 / 3<u>0:00</u></div><button id="brExit">LEAVE</button>
    <div class="brZone" id="brZL">◀ JAB</div><div class="brZone" id="brZR">JAB ▶</div>
    <div id="brCrowd"></div><div id="brHint"></div><div id="brBig"></div>
    <button class="brBtn" id="brDL">◀</button><button class="brBtn" id="brBlock">BLOCK</button><button class="brBtn" id="brDR">▶</button>
    <button class="brBtn" id="brSpec"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="35" fill="none" stroke="rgba(255,243,220,.25)" stroke-width="5"/><circle id="brSpecArc" cx="38" cy="38" r="35" fill="none" stroke="#ffd04a" stroke-width="5" stroke-dasharray="220" stroke-dashoffset="220" stroke-linecap="round"/></svg>HOWL</button>
    <div id="brPanel"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  let bigT = 0, crowdT = 0; const lastBar = new Map();
  UI = { el, pad: $('#brPad'), meHp: $('#brMe .hp i'), meSt: $('#brMe .st i'), meStBar: $('#brMe .st'), foeName: $('#brFoe b'), foeHp: $('#brFoe .hp i'), mid: $('#brMid'), exit: $('#brExit'),
    block: $('#brBlock'), spec: $('#brSpec'), arc: $('#brSpecArc'), dl: $('#brDL'), dr: $('#brDR'), hint: $('#brHint'), crowd: $('#brCrowd'), big: $('#brBig'), flashEl: $('#brFlash'), splat: $('#brSplat'), panel: $('#brPanel'),
    bar(elm, f) { const v = Math.round(clamp(f, 0, 1) * 1000) / 10; if (lastBar.get(elm) !== v) { lastBar.set(elm, v); elm.style.width = v + '%'; } },
    flash(txt, small = '', ms = 1000) { UI.big.innerHTML = txt + (small ? `<small>${small}</small>` : ''); UI.big.classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => UI.big.classList.remove('on'), ms); },
    shout(who, line) { UI.crowd.innerHTML = `<b>${who}</b>${line}`; UI.crowd.classList.add('on'); clearTimeout(crowdT); crowdT = setTimeout(() => UI.crowd.classList.remove('on'), 2200); },
    pop(txt, x, y, col) { const d = document.createElement('div'); d.className = 'brPop'; d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; if (col) d.style.textShadow = `0 3px 0 ${col}`; el.appendChild(d); setTimeout(() => d.remove(), 720); },
    showPanel(h, sub, p, btns) { UI.panel.innerHTML = `<h3>${h}</h3>${sub ? `<h4>${sub}</h4>` : ''}<p>${p}</p>` + btns.map((b, i) => `<button data-i="${i}" class="${b.alt ? 'alt' : ''}">${b.t}</button>`).join('');
      UI.panel.querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); UI.panel.classList.remove('on'); document.body.classList.remove('brCard'); btns[+b.dataset.i].f(); }); UI.panel.classList.add('on'); document.body.classList.add('brCard'); },
  };
  return UI;
}

// ------------------------------------------------------------------ the room (third-person: the lane, the crew, the three regulars waiting)
export function brawlerRoom(kitIn) {
  const { glb, feltMat, S, play } = kitIn;
  return {
    async taco(G, A) {
      const K = kit(feltMat), sc = G.parent; if (sc) sc.background = new THREE.Color('#1a1430');
      buildLane(G, K, { z0: 3.6, len: 13, doorZ: -1.0, ringZ: 0.3 });
      const [bear, heron] = await Promise.all([glb('town2/bear_lo.glb', 1.85, 'bear', { rest: 'breathe' }), glb('town2/heron_lo.glb', 1.9, 'heron', { rest: 'breathe' })]);
      K.at(bear, -2.05, 0, -0.3, 0.8); G.add(bear); K.at(heron, -1.3, 0, -2.5, 0.4); G.add(heron);
      const foes = FOES.map((f, i) => { const o = makeFoe(K, f.id); o.scale.setScalar(0.8); K.at(o, 0.15 + i * 0.95, 0, -2.4 + (i % 2) * 0.3, -0.3); G.add(o); return o; });
      const best = S.brawl?.best || 0;
      const board = K.sign('TONIGHT · BACK LANE\n3 BOUTS · FISTS ONLY\n' + (best ? 'BEST: ' + '★'.repeat(best) + '☆'.repeat(3 - best) : 'NO CHAMP YET'), 1.2, 0.9, '#2a2a28', '#f3efe2', { font: '"Comic Sans MS", cursive' });
      board.position.set(2.86, 1.5, 1.2); board.rotation.y = -Math.PI / 2; G.add(board);
      A.wolfSpot = [0.2, 1.7]; A.anim = []; A.proc = [bear, heron]; A.view = { lw: 5.4, pw: 4.4, h: 2.2, look: -0.8 }; A.bounds = [-2.3, 2.3, -1.4, 2.6];
      A.tick = (dt, t) => { foes.forEach((o, i) => { const u = o.userData; u.torso.rotation.z = Math.sin(t * 2 + i) * 0.05; u.torso.position.y = (u.extra.y0 || 0) + Math.abs(Math.sin(t * 3 + i * 1.3)) * 0.03;
        u.arms.L.rotation.x = -2.0 + Math.sin(t * 3.1 + i) * 0.12; u.arms.R.rotation.x = -1.8 + Math.cos(t * 2.7 + i) * 0.12; u.arms.L.rotation.z = -0.3; u.arms.R.rotation.z = 0.3; }); };
      const fight = () => [['BEAR', 'Three bouts. Tuesday tradition.'], ['BEAR', 'Fists only. Watch the gloves glow, then move.'], ['', 'You roll up your sleeves.', () => play(A)]];
      A.who = [
        { id: 'brawl', label: 'BACK LANE BRAWL (PLAY)', o: foes[1], talk: fight },
        { id: 'bear', label: 'BEAR', o: bear, talk: () => S.brawl ? [['BEAR', `Best night: ${S.brawl.best} star${S.brawl.best > 1 ? 's' : ''}.`], ['BEAR', S.brawl.best >= 3 ? 'Grandma would be proud. She bets on you.' : 'Watch the glow on their gloves. Then move.']] : [['BEAR', 'Every Tuesday, after close, the regulars settle things out back.'], ['BEAR', 'Nobody remembers what. That\'s not the point.']] },
        { id: 'heron', label: 'HERON', o: heron, talk: () => [['HERON', 'Yellow "!" means block it or dodge it.'], ['HERON', 'Red "!!" means dodge. Swipe away from the glove.'], ['HERON', 'Hit them right after they miss. That\'s when they wobble.']] },
        { id: 'shell', label: 'HARD SHELL', o: foes[0], talk: () => [['HARD SHELL', 'I\'m crunchy on the outside.'], ['WOLF', 'And the inside?'], ['HARD SHELL', 'Also crunchy. I\'m very consistent.']] },
        { id: 'pit', label: 'PIT BOSS', o: foes[1], talk: () => [['PIT BOSS', 'I\'m the one with the pit.'], ['PIT BOSS', 'You know what\'s in a pit? Nothing. Pure focus.']] },
        { id: 'scorcho', label: 'EL SCORCHO', o: foes[2], talk: () => [['EL SCORCHO', 'Tres equis. Three X. Extra hot.'], ['EL SCORCHO', 'If I throw a taco, catch it. It would be rude not to.']] },
        { id: 'board', label: 'CHALKBOARD', o: board, talk: () => [['', 'TONIGHT · BACK LANE · 3 BOUTS · FISTS ONLY.'], ['', best ? 'BEST: ' + best + ' of 3 stars. In your handwriting.' : 'NO CHAMP YET. Somebody drew a wolf. Badly.']] },
      ];
    },
  };
}

// ------------------------------------------------------------------ the outside: a felt taco shack on the Neon Strip, back door on the lane
export function placeTacoShack(TS, scene, feltMat, colliders) {
  if (!TS || !scene || TS.doors.taco) return null; const K = kit(feltMat), T = tex(), g = new THREE.Group();
  const X0 = 45, X1 = 51, Z0 = -48, Z1 = -40, H = 3.4, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  const body = K.box(X1 - X0, H, Z1 - Z0, '#d98a5a'); body.position.set(cx, 0, cz); g.add(body);
  const roof = K.box(X1 - X0 + 0.5, 0.22, Z1 - Z0 + 0.5, '#7a3a2a'); roof.position.set(cx, H, cz); g.add(roof);
  const band = K.box(X1 - X0 + 0.04, 0.35, Z1 - Z0 + 0.04, '#2fae8a'); band.position.set(cx, H - 0.5, cz); g.add(band);
  // front (faces the Neon Strip street, -z)
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 0.4, 1.0), feltMat('#ffffff', { map: T.awning, side: THREE.DoubleSide })); aw.position.set(cx, 2.55, Z0 - 0.42); aw.rotation.set(0.95, Math.PI, 0); g.add(aw);
  const fsb = K.box(4.6, 1.35, 0.12, '#1c1220'); fsb.position.set(cx, H + 0.1, Z0 + 0.05); g.add(fsb);
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.2), new THREE.MeshStandardMaterial({ map: T.neon, emissive: new THREE.Color('#ffffff'), emissiveMap: T.neon, emissiveIntensity: 0.6, roughness: 1 })); fs.position.set(cx, H + 0.77, Z0 - 0.02); fs.rotation.y = Math.PI; g.add(fs);
  const win = K.box(2.4, 1.0, 0.06, '#ffcf7a'); win.position.set(cx, 1.0, Z0 - 0.02); g.add(win);
  const sill = K.box(2.7, 0.1, 0.4, '#7a3a2a'); sill.position.set(cx, 0.95, Z0 - 0.2); g.add(sill);
  const menu = K.sign('TACOS · TUESDAYS ONLY\nOPEN \'TIL 2AM', 2.4, 0.5, '#fff3dc', '#c9302a'); menu.position.set(cx, 2.15, Z0 - 0.04); menu.rotation.y = Math.PI; g.add(menu);
  // back (faces the lane, +z): door, bulb, glowing arrow sign, crates, bin
  const bd = K.box(1.05, 2.15, 0.1, '#2fae8a'); bd.position.set(TACO_DOOR.x, 0, Z1 + 0.03); g.add(bd);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.4), new THREE.MeshBasicMaterial({ color: '#ffcf7a' })); bw.position.set(TACO_DOOR.x, 1.62, Z1 + 0.09); g.add(bw);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c0' })); bulb.position.set(TACO_DOOR.x, 2.6, Z1 + 0.3); g.add(bulb);
  const bs = K.sign('TACO TUESDAY\'S\nBACK DOOR · BRAWL', 1.6, 0.56, '#1c1220', '#ff9ad0', { glow: 0.7 }); bs.position.set(TACO_DOOR.x + 1.75, 2.35, Z1 + 0.04); g.add(bs);
  const crate = (x, y) => { const c = K.box(0.6, 0.46, 0.46, '#b88a5a'); c.position.set(x, y, Z1 + 0.4); g.add(c); };
  crate(X0 + 0.5, 0); crate(X0 + 0.55, 0.46); crate(X0 + 1.15, 0);
  const bin = K.box(1.2, 1.0, 0.7, '#2f6a4a'); bin.position.set(X1 - 0.75, 0, Z1 + 0.5); g.add(bin);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
  TS.boxes.push({ x0: X0, z0: Z0, x1: X1, z1: Z1, h: H + 1, name: 'taco_shack' });
  colliders?.push({ x: X0 + 0.8, z: Z1 + 0.4, r: 0.6 }, { x: X1 - 0.75, z: Z1 + 0.5, r: 0.7 });
  TS.doors.taco = { x: TACO_DOOR.x, z: TACO_DOOR.z, ry: TACO_DOOR.ry, built: true };
  return g;
}

// ------------------------------------------------------------------ the fight
export function createBrawler({ feltMat, audio, glb, say, onLeave, onDone } = {}) {
  const K = kit(feltMat), U = ui(), SFX = sfx(audio);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#141026'); scene.fog = new THREE.Fog('#1a1430', 10, 24);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 60); scene.add(camera);
  scene.add(new THREE.HemisphereLight('#9aa4ff', '#3a2a3a', 1.0));
  const moon = new THREE.DirectionalLight('#c8ccff', 1.1); moon.position.set(-3, 8, 4); scene.add(moon);
  const front = new THREE.DirectionalLight('#ffd9b0', 0.6); front.position.set(1, 2, 6); scene.add(front);
  buildLane(scene, K, { z0: 4, len: 15, doorZ: -2.4, ringZ: -0.4 });
  const H = { scene, camera, active: false }, EYE = [1.25, 1.42, 1.45];
  const foes = FOES.map(f => { const o = makeFoe(K, f.id); o.visible = false; o.position.set(0, 0, -0.55); scene.add(o); return o; });
  // the crowd: three of the crew (rest-pose GLBs: no mixers, so no extra rigs) + felt townsfolk
  const crowd = [];
  const CREW = [['town2/bear_lo.glb', 1.85, 'bear', -2.0, -2.2, 0.9], ['town2/heron_lo.glb', 1.95, 'heron', -1.45, -4.6, 0.45], ['town2/ram_lo.glb', 1.8, 'ram', 2.05, -2.0, -0.95]];
  let crewP = null; const loadCrew = () => crewP || (crewP = Promise.all(CREW.map(([f, h, look, x, z, ry]) => glb ? glb(f, h, look, { rest: 'breathe' }).then(o => { o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = false; }); K.at(o, x, 0, z, ry); scene.add(o); crowd.push({ o, ph: Math.random() * 6, ex: 0 }); }).catch(e => console.warn('brawler crowd', f, e)) : null)));
  const FOLK = [['#c9925f', '#3a6a8a', -2.2, -6.6], ['#6a8a5a', '#f2c230', -0.8, -7.4], ['#b86a8a', '#2fae8a', 0.6, -7.6], ['#e0b080', '#c9302a', 2.0, -6.8], ['#8a7ab8', '#fff3dc', 1.6, -4.6], ['#d9a06a', '#ff6fae', -0.2, -8.0]];
  for (const [skin, shirt, x, z] of FOLK) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.6, 4, 10), K.fm(shirt)); b.position.y = 0.6; g.add(b);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), K.fm(skin)); hd.position.y = 1.3; g.add(hd);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), K.fm('#1a1218')); e.position.set(s * 0.08, 1.34, 0.19); g.add(e);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 3, 6), K.fm(shirt)); a.position.set(s * 0.3, 1.05, 0); a.rotation.z = s * 2.6; g.add(a); }
    K.at(g, x, 0, z, Math.atan2(-x, 1.6 - z)); scene.add(g); crowd.push({ o: g, ph: Math.random() * 6, ex: 0 }); }
  const paws = makePaws(K); camera.add(paws.L, paws.R);
  // crumbs (one instanced pool)
  const NC = 40, crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NC); crumbs.frustumCulled = false; scene.add(crumbs);
  const CR = Array.from({ length: NC }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), life: 0 })); let crI = 0;
  const _m = new THREE.Matrix4(), _c = new THREE.Color(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), _tp = new THREE.Vector3(), _hide = new THREE.Vector3(0, -9, 0);
  for (let i = 0; i < NC; i++) { _m.makeTranslation(0, -9, 0); crumbs.setMatrixAt(i, _m); crumbs.setColorAt(i, _c.set('#ffffff')); }
  const burst = (pos, colors, n = 10) => { for (let i = 0; i < n; i++) { const c = CR[crI]; c.p.copy(pos); c.v.set(rnd(-1.6, 1.6), rnd(0.8, 2.6), rnd(-0.2, 1.8)); c.life = rnd(0.5, 0.9); crumbs.setColorAt(crI, _c.set(pick(colors))); crI = (crI + 1) % NC; } crumbs.instanceColor.needsUpdate = true; };
  // the flying taco + the sauce spray
  const taco = new THREE.Group(); { const g = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14, 1, false, -Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); taco.add(new THREE.Mesh(g, K.fm('#e9b44c', { side: THREE.DoubleSide })));
    for (let i = 0; i < 4; i++) { const l = K.ball(0.04, '#7fbf4a', 6, 5); l.position.set(-0.11 + i * 0.075, 0.01, 0); taco.add(l); } } taco.visible = false; scene.add(taco);
  const sprayM = new THREE.MeshBasicMaterial({ color: '#ff3a1a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }); const spray = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 14, 1, true), sprayM); spray.rotation.x = -Math.PI / 2; spray.position.set(0, 1.75, 0.7); spray.visible = false; scene.add(spray);

  // ---------------------------------------------------------------- state
  const P = { hp: 100, sta: 100, meter: 0, block: false, dodge: 0, dodgeDir: 0, dodgeT0: -9, jab: { L: 0, R: 0 }, jabCd: 0, charge: -1, upper: 0, hurtT: 0, staT: 0, puff: false };
  const F = { i: 0, def: FOES[0], o: foes[0], hp: 50, st: 'idle', t: 0, dur: 1.5, atk: null, combo: 0, guard: 'L', inRow: 0, flash: 0, feint: false, lean: 0, guardT: 0 };
  const R = { taken: 0, perfect: 0, counters: 0, retries: 0, time: 0, boutT: 0, hits: 0 };
  let phase = 'idle', leaveCb = onLeave, shake = 0, hitStop = 0, slow = 0, pend = [], proj = null, sprayT = -1, tSec = 0, hintN = 0, shoutT = 0;
  const now = () => tSec;
  const hud = () => { U.bar(U.meHp, P.hp / 100); U.bar(U.meSt, P.sta / 100); U.meStBar.classList.toggle('low', P.sta < 12); U.bar(U.foeHp, F.hp / F.def.hp); if (U.foeName.textContent !== F.def.name) U.foeName.textContent = F.def.name;
    const off = Math.round(220 * (1 - P.meter / 100)); if (U.arc._o !== off) { U.arc._o = off; U.arc.setAttribute('stroke-dashoffset', off); } U.spec.classList.toggle('ready', P.meter >= 100);
    const s = Math.floor(R.boutT), txt = `BOUT ${F.i + 1} / 3<u>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</u>`; if (U.mid._t !== txt) { U.mid._t = txt; U.mid.innerHTML = txt; } };
  const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
  const LINES = {
    land: [['BEAR', 'That\'s it! Open side!'], ['RAM', 'Lovely jab, lad.'], ['TOWNSFOLK', 'He felt that. I felt that.'], ['HERON', 'Again! Again!'], ['TOWNSFOLK', 'OOOOH!']],
    counter: [['HERON', 'Right after the miss! Textbook!'], ['BEAR', 'Wobble punch!'], ['RAM', 'Now that\'s a counter.']],
    perfect: [['RAM', 'He wasn\'t even there!'], ['HERON', 'Like a leaf. A wolf-shaped leaf.'], ['TOWNSFOLK', 'OLÉ!']],
    hurt: [['BEAR', 'Hands up, son!'], ['RAM', 'Watch the glow, lad.'], ['HERON', 'Oof. I\'m okay. Are you okay?']],
    guard: [['HERON', 'He\'s covering that side. Hit the other one!'], ['BEAR', 'Other side! Other side!']],
    red: [['HERON', 'Red one! Dodge it!'], ['RAM', 'Can\'t block that, lad. Move!']],
    feint: [['TOWNSFOLK', 'HA! FAKE!'], ['BEAR', 'That was a fake. I fell for it from here.']],
  };
  const shout = (k, force) => { if (!force && now() < shoutT) return; shoutT = now() + 2.4; const [w, l] = pick(LINES[k]); U.shout(w, l); };
  const cheer = (k = 1) => { for (const c of crowd) c.ex = Math.min(1.4, c.ex + k); SFX.cheer(Math.min(1, 0.4 + k * 0.5)); };
  const hint = (txt, ms = 2600) => { U.hint.textContent = txt; U.hint.style.opacity = 1; clearTimeout(hint._t); hint._t = setTimeout(() => { U.hint.style.opacity = 0; }, ms); };
  const pop = (w) => { const [x, y] = project(_tp.set(0, F.o.userData.H * 0.75, 0).add(F.o.position)); U.pop(w, x + rnd(-30, 30), y, '#6a6a7a'); };

  function setFoe(i) {
    F.i = i; F.def = FOES[i]; foes.forEach((o, k) => { o.visible = k === i; }); F.o = foes[i]; F.hp = F.def.hp; F.st = 'idle'; F.t = 0; F.dur = rnd(...F.def.idle) + 0.8; F.atk = null; F.combo = 0; F.guard = pick(['L', 'R']); F.inRow = 0; F.guardT = 0; F.lean = 0; pend = []; P.block = false; P.charge = -1; P.upper = 0; P.jab.L = P.jab.R = P.jabCd = 0; P.dodge = 0; paws.R.userData.glowM.opacity = 0;
    const u = F.o.userData; u.torso.rotation.set(0, 0, 0); u.dizzy.visible = false; u.tell.visible = false; F.o.position.set(0, 0, -0.55); R.boutT = 0;
  }
  function card(i, first) {
    phase = 'card'; setFoe(i); hud(); const f = FOES[i];
    const how = i === 0 ? '<br><br>TAP LEFT / RIGHT SIDE = JAB<br>HOLD BLOCK · SWIPE OR ◀ ▶ = DODGE<br>HOWL METER FULL? HOLD HOWL, LET GO.<br>Yellow ! = block or dodge · Red !! = dodge.' : i === 1 ? '<br><br>He fakes sometimes. Uppercuts are red !! (dodge those).<br>Dodge AWAY from the glowing glove.' : '<br><br>Dodge the sauce (red !!). If he throws a taco, BLOCK to catch it (+8).';
    U.showPanel(f.name, `BOUT ${i + 1} OF 3`, f.tag + how, [{ t: 'FIGHT!', f: () => go() }, ...(first ? [{ t: 'NOT TONIGHT', alt: true, f: () => H.leave() }] : [])]);
  }
  function go() { phase = 'fight'; U.flash('Fight!', FOES[F.i].name, 900); SFX.bell(); cheer(0.8); hintN = 0; if (F.i === 0) hint('HE GUARDS ONE SIDE · JAB THE OTHER', 3200); }

  // ---------------------------------------------------------------- the Wolf
  function jab(side) {
    if (phase !== 'fight' || P.dodge > 0 || P.block || P.charge >= 0 || P.jabCd > 0 || P.upper > 0) return false;
    const weak = P.sta < 12; P.sta = Math.max(0, P.sta - 12); P.staT = 0.45; P.jab[side] = 0.0001; P.jabCd = weak ? 0.42 : 0.24; SFX.jab();
    if (weak && !P.puff) { P.puff = true; hint('OUT OF PUFF · BACK OFF A SECOND', 1800); }
    pend.push({ t: 0.085, f: () => landJab(side, weak ? 0.35 : 1) }); return true;
  }
  function hitFoe(dmg, word, big) {
    F.hp = Math.max(0, F.hp - dmg); F.flash = 0.16; R.hits++; const u = F.o.userData, pos = new THREE.Vector3(rnd(-0.2, 0.2), u.H * 0.7, -0.2).add(F.o.position);
    burst(pos, F.def.crumb, big ? 18 : 8); const [x, y] = project(pos); U.pop(word || pick(F.def.word), x, y); SFX.hit(big); hitStop = big ? 0.12 : 0.05; shake = Math.max(shake, big ? 0.5 : 0.18);
    if (F.def.id === 'shell') SFX.crunch(); if (!big) P.meter = Math.min(100, P.meter + 9);
    if (F.hp <= 0) ko();
  }
  function landJab(side, pw) {
    if (phase !== 'fight' || F.st === 'ko') return; const st = F.st;
    if (st === 'recover' || st === 'stagger') { R.counters++; hitFoe(Math.round(8 * pw), 'COUNTER!'); cheer(0.7); shout('counter'); if (F.st !== 'ko') { F.lean = side === 'L' ? 1 : -1; } return; }
    if (st === 'windup') { if (F.def.interrupt && F.t / F.dur < 0.65 && pw >= 1) { hitFoe(4, 'STOPPED!'); if (F.st !== 'ko') stagger(0.7); cheer(0.5); return; } SFX.blocked(); pop('TOUGH!'); return; }
    if (st === 'guardup' || (st === 'idle' && F.guard === side)) { SFX.blocked(); pop('GUARD!'); F.inRow = 0; if (++hintN === 3) shout('guard', true); if (F.i > 0 && st === 'idle' && Math.random() < 0.3 * F.i) startAtk(true); return; }
    if (st === 'idle' || st === 'strike') { hitFoe(Math.round(4 * pw)); if (F.st === 'ko') return; F.lean = side === 'L' ? 1 : -1; cheer(0.35); shout('land'); hintN = 0;
      if (st === 'idle') { if (++F.inRow >= 3) { F.inRow = 0; F.st = 'guardup'; F.t = 0; F.dur = 0.7; } else if (Math.random() < 0.5) F.guard = side === 'L' ? 'R' : 'L'; } }
  }
  function dodge(dir) { if (phase !== 'fight' || P.dodge > 0 || P.charge >= 0) return false; P.dodge = 0.42; P.dodgeDir = dir; P.dodgeT0 = now(); P.block = false; SFX.whoosh(); return true; }
  function startCharge() { if (phase !== 'fight' || P.meter < 100 || P.charge >= 0 || P.dodge > 0) return false; P.charge = 0; P.block = false; return true; }
  function releaseCharge() {
    if (P.charge < 0) return false; const c = P.charge; P.charge = -1; paws.R.userData.glowM.opacity = 0;
    if (c < 0.4) { hint('HOLD HOWL A LITTLE LONGER', 1400); return false; }
    P.meter = 0; P.upper = 0.0001; SFX.howl(); pend.push({ t: 0.13, f: () => { if (phase !== 'fight' || F.st === 'ko') return; hitFoe(22, 'HOWLER!', true); U.flash('Howler!', '', 700); cheer(1.2); if (F.st !== 'ko') stagger(1.0); } }); return true;
  }
  function stagger(d) { F.st = 'stagger'; F.t = 0; F.dur = d; F.atk = null; F.combo = 0; F.o.userData.tell.visible = false; }

  // ---------------------------------------------------------------- the regulars' AI
  function startAtk(quick) {
    const D = F.def; let a = pick(D.atks); if ((a === 'spray' || a === 'taco') && F.combo > 0) a = pick(['L', 'R']);
    F.st = 'windup'; F.t = 0; F.atk = a; F.feint = !quick && F.combo === 0 && Math.random() < D.feint && a !== 'spray' && a !== 'taco';
    F.dur = D.tell * (F.combo > 0 ? 0.7 : quick ? 0.85 : 1) * (a === 'spray' ? 1.35 : a === 'taco' ? 1.15 : a === 'U' ? 1.12 : 1);
    const red = a === 'U' || a === 'spray', u = F.o.userData; u.tell.material.map = red ? u.tellR : u.tellT; u.tell.material.needsUpdate = true; u.tell.visible = false;
    if (red && F.i >= 1) shout('red');
  }
  function strike() {
    const a = F.atk; F.st = 'strike'; F.t = 0; F.dur = a === 'spray' ? 0.5 : 0.16; F.o.userData.tell.visible = false;
    if (a === 'taco') { proj = { t: 0, dur: 0.75, from: new THREE.Vector3(-0.5, 1.4, -0.4) }; taco.visible = true; SFX.whoosh(); afterAtk(true, 0.3); return; }
    if (a === 'spray') { sprayT = 0; spray.visible = true; SFX.spray(); pend.push({ t: 0.16, f: () => resolve('spray') }); return; }
    SFX.whoosh(); pend.push({ t: 0.06, f: () => resolve(a) });
  }
  function resolve(a) {
    if (phase !== 'fight') return; const D = F.def, dmg = D.dmg * (a === 'U' ? 1.3 : a === 'spray' ? 1.1 : a === 'taco' ? 0.7 : 1), proj_ = a === 'taco';
    const dodging = P.dodge > 0 && P.dodge < 0.4, safe = a === 'L' ? 1 : a === 'R' ? -1 : 0;   // a hook from screen-left: dodge right
    const dodged = dodging && (safe === 0 || F.i === 0 || P.dodgeDir === safe);
    if (dodged) { if (now() - P.dodgeT0 < 0.3) { R.perfect++; P.meter = Math.min(100, P.meter + 25); U.flash('Perfect!', '', 600); slow = 0.35; shout('perfect', true); cheer(0.6); if (!proj_) F.dur += 0.25; } else pop('WHIFF!');
      if (!proj_) afterAtk(true); return; }
    if (P.block && (a === 'L' || a === 'R' || a === 'S' || a === 'taco')) {
      if (a === 'taco') { P.hp = Math.min(100, P.hp + 8); U.flash('Crunch!', 'CAUGHT IT · ATE IT · +8', 900); SFX.crunch(); cheer(0.9); return; }
      P.sta -= 14; P.staT = 0.6; SFX.blocked(); shake = Math.max(shake, 0.1);
      if (P.sta <= 0) { P.sta = 0; P.block = false; hurt(dmg * 0.6, 'GUARD BROKEN'); } else hurt(dmg * 0.12, null, true);
      afterAtk(true); return; }
    hurt(dmg, a === 'spray' ? 'HOT HOT HOT!' : a === 'U' ? 'UPPERCUT!' : null); if (a === 'spray') P.sta = Math.max(0, P.sta - 30);
    if (a === 'taco') { U.splat.innerHTML = Array.from({ length: 7 }, () => `<i style="left:${rnd(10, 80)}%;top:${rnd(10, 70)}%;width:${rnd(40, 110)}px;height:${rnd(30, 80)}px;background:${pick(['#7fbf4a', '#e0502e', '#ffd04a'])}"></i>`).join(''); U.splat.style.transition = 'none'; U.splat.style.opacity = 1; requestAnimationFrame(() => requestAnimationFrame(() => { U.splat.style.transition = 'opacity 1.4s'; U.splat.style.opacity = 0; })); return; }
    afterAtk(false);
  }
  function hurt(d, txt, soft) {
    d = Math.round(d); P.hp = Math.max(0, P.hp - d); R.taken += d;
    if (!soft) { SFX.hurt(); shake = Math.max(shake, 0.6); hitStop = 0.08; P.hurtT = 0.35; U.flashEl.style.transition = 'none'; U.flashEl.style.opacity = 1; requestAnimationFrame(() => requestAnimationFrame(() => { U.flashEl.style.transition = 'opacity .5s'; U.flashEl.style.opacity = 0; })); shout('hurt'); }
    if (txt) U.flash(txt, '', 700); if (P.hp <= 0) lose();
  }
  function afterAtk(missed, delay) {
    if (phase !== 'fight' || F.st === 'ko' || F.st === 'stagger') return; F.combo++;
    if (F.combo < F.def.combo && Math.random() < 0.75 && F.atk !== 'spray' && F.atk !== 'taco') { pend.push({ t: 0.18, f: () => { if (phase === 'fight' && F.st === 'strike') startAtk(true); } }); return; }
    pend.push({ t: delay ?? (F.atk === 'spray' ? 0.36 : 0.12), f: () => { if (phase !== 'fight' || F.st === 'ko' || F.st === 'stagger') return; F.combo = 0; F.st = 'recover'; F.t = 0; F.dur = F.def.rec * (missed ? 1 : 0.55); } });
  }
  function ko() {
    F.st = 'ko'; F.t = 0; F.o.userData.tell.visible = false; phase = 'ko'; SFX.bell(); cheer(1.4); U.flash('K.O.!', FOES[F.i].name + ' IS SEEING STARS', 1600); slow = 0.6; proj = null; taco.visible = false; spray.visible = false; pend = [];
    setTimeout(() => { if (!H.active || phase !== 'ko') return; if (F.i < 2) { P.hp = Math.min(100, P.hp + 40); P.sta = 100; card(F.i + 1); } else win(); }, 2200);
  }
  const stars = () => 1 + (R.retries === 0 ? 1 : 0) + (R.retries === 0 && R.taken <= 110 ? 1 : 0);
  function win() {
    phase = 'over'; const s = stars(), t = Math.round(R.time), st = '★'.repeat(s) + `<s>${'★'.repeat(3 - s)}</s>`;
    H.last = { win: true, stars: s, ...R }; const extra = onDone?.(H.last);
    U.showPanel('Back Lane Champ', 'TACO TUESDAY\'S', `<span class="stars">${st}</span><br>DAMAGE TAKEN ${R.taken} · PERFECT DODGES ${R.perfect}<br>COUNTERS ${R.counters} · RETRIES ${R.retries} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}<br><br>★ win · ★★ no retries · ★★★ no retries + took 110 or less`,
      [{ t: 'DONE', f: () => { H.leave(); if (extra) setTimeout(() => say?.(extra), 900); } }, { t: 'RUN IT BACK', alt: true, f: () => restart() }]);
  }
  function lose() {
    if (phase !== 'fight') return; phase = 'over'; proj = null; pend = []; taco.visible = false; spray.visible = false; F.o.userData.tell.visible = false; SFX.bell();
    U.flash('K.O.\'d', '', 1200); H.last = { win: false, stars: 0, bout: F.i + 1, ...R };
    setTimeout(() => { if (!H.active) return; U.showPanel('Down Goes The Wolf', `BOUT ${F.i + 1} · ${FOES[F.i].name}`, `<span class="stars"><s>★★★</s></span><br>${pick(['The crowd helps you up. Bear dusts you off.', 'You see three tacos. Only one of them is real.', 'Heron fans you with a menu.'])}<br><br>Tip: ${F.i === 0 ? 'jab the side he isn\'t covering, block the yellow !' : F.i === 1 ? 'red !! is an uppercut: dodge it. He fakes, so wait for the glove.' : 'dodge the sauce, BLOCK a flying taco to catch it (+8).'}`,
      [{ t: 'RETRY BOUT', f: () => { R.retries++; P.hp = 100; P.sta = 100; P.meter = Math.max(P.meter, 50); card(F.i); } }, { t: 'LEAVE', alt: true, f: () => { onDone?.(H.last); H.leave(); } }]); }, 1300);
  }
  function restart() { Object.assign(R, { taken: 0, perfect: 0, counters: 0, retries: 0, time: 0, hits: 0 }); Object.assign(P, { hp: 100, sta: 100, meter: 0, block: false, dodge: 0, charge: -1, upper: 0, puff: false }); card(0, true); }

  // ---------------------------------------------------------------- input: tap halves = jab, swipe = dodge, hold BLOCK, hold/release HOWL; keys on desktop
  const ptrs = new Map();
  U.pad.addEventListener('pointerdown', (e) => { if (H.active && phase === 'fight') ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), used: false }); });
  U.pad.addEventListener('pointermove', (e) => { const p = ptrs.get(e.pointerId); if (!p || p.used || !H.active) return; const dx = e.clientX - p.x; if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(e.clientY - p.y) * 1.2) { p.used = true; dodge(dx < 0 ? -1 : 1); } });
  U.pad.addEventListener('pointerup', (e) => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!p || p.used || !H.active) return; if (performance.now() - p.t < 500) jab(p.x < innerWidth / 2 ? 'L' : 'R'); });
  U.pad.addEventListener('pointercancel', (e) => ptrs.delete(e.pointerId));
  const hold = (btn, down, up) => { btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!H.active) return; btn.classList.add('on'); try { btn.setPointerCapture(e.pointerId); } catch (_) { } down(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, (e) => { e.stopPropagation(); if (!btn.classList.contains('on')) return; btn.classList.remove('on'); up?.(); }); };
  hold(U.block, () => { if (phase === 'fight' && P.dodge <= 0 && P.charge < 0) P.block = true; }, () => { P.block = false; });
  hold(U.dl, () => dodge(-1)); hold(U.dr, () => dodge(1));
  hold(U.spec, () => { if (!startCharge() && phase === 'fight' && P.meter < 100) hint('LAND HITS + PERFECT DODGES TO FILL THE HOWL', 1600); }, () => releaseCharge());
  U.exit.addEventListener('click', (e) => { e.stopPropagation(); if (H.active) H.leave(); });
  const KEYS = { j: () => jab('L'), k: () => jab('R'), a: () => dodge(-1), arrowleft: () => dodge(-1), d: () => dodge(1), arrowright: () => dodge(1) };
  const BLK = new Set(['s', ' ', 'arrowdown']), SPC = new Set(['w', 'e', 'arrowup']);
  addEventListener('keydown', (e) => { if (!H.active || e.repeat) return; const k = e.key.toLowerCase(); if (KEYS[k]) { KEYS[k](); e.preventDefault(); }
    if (BLK.has(k)) { if (phase === 'fight' && P.dodge <= 0 && P.charge < 0) P.block = true; e.preventDefault(); } if (SPC.has(k)) startCharge(); });
  addEventListener('keyup', (e) => { if (!H.active) return; const k = e.key.toLowerCase(); if (BLK.has(k)) P.block = false; if (SPC.has(k)) releaseCharge(); });

  const clearHeld = () => { P.block = false; P.charge = -1; paws.R.userData.glowM.opacity = 0; ptrs.clear(); for (const b of [U.block, U.dl, U.dr, U.spec]) b.classList.remove('on'); };
  addEventListener('blur', clearHeld); document.addEventListener('visibilitychange', () => { if (document.hidden) clearHeld(); });

  // ---------------------------------------------------------------- per-frame
  function pawPose(side, t) {   // rest / jab / block / charge / uppercut, blended
    const s = side === 'L' ? -1 : 1, g = paws[side], j = P.jab[side];
    let x = s * 0.22, y = -0.23 + Math.sin(t * 3.2 + s) * 0.012, z = -0.62, rx = 0.4, ry = -s * 0.15, rz = s * 0.18;
    if (P.block) { x = s * 0.1; y = -0.1; z = -0.42; rx = 1.25; ry = s * 0.1; rz = -s * 0.15; }
    if (j > 0) { const e = j < 0.33 ? ease(j / 0.33) : 1 - ease((j - 0.33) / 0.67); x = lerp(x, s * 0.05, e); y = lerp(y, -0.07, e); z = lerp(z, -1.05, e); rz = lerp(rz, -s * 0.5, e); rx = lerp(rx, 0.2, e); }
    if (side === 'R' && P.charge >= 0) { const c = Math.min(1, P.charge / 0.4); x = lerp(x, 0.34, c); y = lerp(y, -0.42, c); z = lerp(z, -0.42, c); rx = lerp(rx, 1.1, c) + Math.sin(t * 40) * 0.03 * c; g.userData.glowM.opacity = 0.25 + 0.35 * c; }
    if (side === 'R' && P.upper > 0) { const u = P.upper, e = u < 0.3 ? ease(u / 0.3) : 1 - ease((u - 0.3) / 0.7); x = lerp(0.32, 0.03, e); y = lerp(-0.42, 0.04, e); z = lerp(-0.45, -1.0, e); rx = lerp(1.1, 0.45, e); g.userData.glowM.opacity = 0.5 * (1 - u); }
    if (P.hurtT > 0) { y -= P.hurtT * 0.25; rz += s * P.hurtT * 0.6; }
    const pk = clamp(camera.aspect / 1.6, 0.45, 1); x *= 0.5 + 0.5 * pk; g.scale.setScalar(0.72 + 0.28 * pk);
    const k = j > 0 || P.upper > 0 ? 0.85 : 0.4; g.position.set(lerp(g.position.x, x, k), lerp(g.position.y, y, k), lerp(g.position.z, z, k)); g.rotation.set(rx, ry, rz);
  }
  function armPose(a, side, st, p, t, atk) {   // a regular's arm: guard / wind-up / strike / recover
    const s = side === 'L' ? -1 : 1; let rx = -2.0 + Math.sin(t * 3 + s) * 0.08, ry = s * 0.15, rz = s * 0.25, sc = 1, glow = 0;
    const mine = atk && (atk === side || ((atk === 'S' || atk === 'U' || atk === 'spray') && side === 'R') || (atk === 'taco' && side === 'L'));
    if ((st === 'idle' && F.guard === side) || st === 'guardup') { rx = -2.6; rz = -s * 0.4; ry = -s * 0.3; }
    if (st === 'windup' && mine) { const e = ease(p / 0.8); rx = lerp(-2.0, atk === 'U' ? -0.35 : -2.8, e); ry = lerp(s * 0.15, s * 1.25, e); rz = lerp(s * 0.25, s * 0.95, e); glow = e; sc = 1 - 0.12 * e; }
    if (st === 'strike' && mine && atk !== 'spray') { const e = ease(Math.min(1, p * 2.2)); rx = atk === 'U' ? lerp(-0.35, -2.3, e) : lerp(-2.8, -1.62, e); ry = atk === 'S' || atk === 'U' || atk === 'taco' ? lerp(s * 0.6, 0, e) : lerp(s * 1.25, -s * 0.55, e); rz = lerp(s * 0.95, 0, e); sc = lerp(0.9, 2.4, e); glow = 1 - e * 0.5; }
    if (st === 'recover') { rx = -1.1 - Math.sin(t * 6) * 0.15; rz = s * 0.6; ry = s * 0.4; }
    if (st === 'stagger' || st === 'ko') { rx = -0.6 + Math.sin(t * 9 + s) * 0.4; rz = s * 1.1; }
    const fast = st === 'strike' ? 0.8 : 0.3; a.rotation.x = lerp(a.rotation.x, rx, fast); a.rotation.y = lerp(a.rotation.y, ry, fast); a.rotation.z = lerp(a.rotation.z, rz, fast); a.scale.y = lerp(a.scale.y, sc, st === 'strike' ? 0.7 : 0.3);
    a.userData.gm.emissiveIntensity = glow * (0.6 + 0.4 * Math.sin(t * 30));
  }
  H.update = (dtIn, t) => {
    if (!H.active || document.hidden) return; const c = camera; if (Math.abs(c.aspect - innerWidth / innerHeight) > 1e-3) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
    const fv = c.aspect < 0.8 ? 72 : 56; if (c.fov !== fv) { c.fov = fv; c.updateProjectionMatrix(); }
    let dt = Math.min(0.05, dtIn || 0); if (hitStop > 0) { hitStop -= dt; dt *= 0.05; } if (slow > 0) { slow -= Math.min(0.05, dtIn || 0); dt *= 0.4; } tSec += dt;
    if (phase === 'fight') { R.time += dt; R.boutT += dt; }
    for (let i = pend.length - 1; i >= 0; i--) { const e = pend[i]; if (!e) continue; e.t -= dt; if (e.t <= 0) { pend.splice(i, 1); e.f(); } }
    for (const s of ['L', 'R']) if (P.jab[s] > 0) { P.jab[s] += dt / (P.puff ? 0.38 : 0.26); if (P.jab[s] >= 1) P.jab[s] = 0; }
    P.jabCd = Math.max(0, P.jabCd - dt); P.hurtT = Math.max(0, P.hurtT - dt);
    if (P.upper > 0) { P.upper += dt / 0.4; if (P.upper >= 1) P.upper = 0; }
    if (P.charge >= 0) P.charge += dt;
    if (P.dodge > 0) P.dodge = Math.max(0, P.dodge - dt);
    P.staT -= dt; if (P.staT <= 0 && phase === 'fight') P.sta = Math.min(100, P.sta + dt * (P.block ? 10 : 30)); if (P.puff && P.sta > 40) P.puff = false;
    // the regular
    const u = F.o.userData, D = F.def; F.t += dt; const p = F.dur > 0 ? F.t / F.dur : 1;
    if (phase === 'fight') {
      if (F.st === 'idle') { F.guardT += dt; if (F.guardT > 2.4 - F.i * 0.5) { F.guardT = 0; F.guard = F.guard === 'L' ? 'R' : 'L'; } if (F.t >= F.dur) startAtk(false); }
      else if (F.st === 'guardup') { if (F.t >= F.dur) startAtk(true); }
      else if (F.st === 'windup') { if (p > 0.35 && !u.tell.visible && !F.feint) { u.tell.visible = true; SFX.tell(F.atk === 'U' || F.atk === 'spray'); }
        if (F.feint && p > 0.62) { F.st = 'idle'; F.t = 0; F.dur = rnd(0.4, 0.8); u.tell.visible = false; shout('feint'); } else if (F.t >= F.dur) strike(); }
      else if (F.st === 'strike') { if (F.t > 1.5) { F.st = 'idle'; F.t = 0; F.dur = rnd(...D.idle); } }
      else if (F.st === 'recover' || F.st === 'stagger') { if (F.t >= F.dur) { F.st = 'idle'; F.t = 0; F.dur = rnd(...D.idle); F.inRow = 0; } }
    }
    const tr = u.torso, y0 = u.extra.y0 || 0; F.lean *= Math.pow(0.02, dt); F.flash = Math.max(0, F.flash - dt);
    if (F.st === 'ko') { const e = ease(F.t / 0.7); tr.rotation.set(lerp(0, -1.35, e), 0, 0); F.o.position.z = -0.55 - e * 0.6; u.dizzy.visible = F.t > 0.6; u.dizzy.rotation.y += dt * 4; u.dizzy.position.y = u.H * (1 - 0.6 * e) + 0.1; }
    else { const w = F.st === 'windup' ? ease(p) : 0, sk = F.st === 'strike' ? 1 : 0, wb = F.st === 'recover' || F.st === 'stagger' ? 1 : 0, side = F.atk === 'L' ? 1 : F.atk === 'R' ? -1 : 0;
      tr.rotation.x = lerp(tr.rotation.x, -0.12 * w + 0.22 * sk - 0.15 * wb * Math.sin(t * 7), 0.25);
      tr.rotation.z = lerp(tr.rotation.z, F.lean * 0.35 + wb * Math.sin(t * 8) * 0.2 - side * 0.12 * w, 0.3);
      tr.rotation.y = lerp(tr.rotation.y, side * (0.4 * w - 0.5 * sk), 0.3);
      tr.position.y = y0 + Math.abs(Math.sin(t * (4 + F.i))) * 0.03 + (F.flash > 0 ? -0.04 : 0); tr.scale.set(1 + F.flash * 0.5, 1 - F.flash * 0.6, 1);
      F.o.position.z = lerp(F.o.position.z, -0.55 + sk * 0.35 - w * 0.12, 0.3); F.o.position.x = Math.sin(t * 1.3) * 0.08; }
    for (const e of u.E) { e.b.rotation.z = e.s * (F.st === 'windup' ? 0.55 : F.st === 'stagger' || F.st === 'ko' ? -0.3 : 0.25); e.p.scale.setScalar(F.st === 'windup' ? 0.75 : 1); }
    if (u.extra.cap) u.extra.cap.position.y = 1.96 + (F.st === 'strike' && F.atk === 'spray' ? 0.18 : 0);
    if (u.tell.visible) u.tell.scale.setScalar(0.32 + Math.sin(t * 22) * 0.04);
    armPose(u.arms.L, 'L', F.st, p, t, F.atk); armPose(u.arms.R, 'R', F.st, p, t, F.atk);
    // the flying taco, the sauce
    if (proj) { proj.t += dt; const e = clamp(proj.t / proj.dur, 0, 1); _tp.set(0, EYE[F.i], 2.2); taco.position.lerpVectors(proj.from, _tp, e); taco.position.y += Math.sin(e * Math.PI) * 0.4; taco.rotation.set(t * 9, t * 5, 0); if (e >= 1) { proj = null; taco.visible = false; resolve('taco'); } }
    if (sprayT >= 0) { sprayT += dt; sprayM.opacity = Math.sin(clamp(sprayT / 0.5, 0, 1) * Math.PI) * 0.55; spray.scale.set(1 + sprayT, 1, 1 + sprayT); if (sprayT > 0.5) { sprayT = -1; spray.visible = false; } }
    // crumbs
    for (let i = 0; i < NC; i++) { const cc = CR[i]; if (cc.life <= 0) { if (cc.life > -1) { cc.life = -1; _m.compose(_hide, _q.identity(), _s); crumbs.setMatrixAt(i, _m); } continue; }
      cc.life -= dt; cc.v.y -= 9 * dt; cc.p.addScaledVector(cc.v, dt); if (cc.p.y < 0.03) { cc.p.y = 0.03; cc.v.set(0, 0, 0); } _e.set(cc.life * 7, cc.life * 5, 0); _q.setFromEuler(_e); _m.compose(cc.p, _q, _s); crumbs.setMatrixAt(i, _m); }
    crumbs.instanceMatrix.needsUpdate = true;
    // crowd
    for (const cr of crowd) { cr.ex = Math.max(0, cr.ex - dt * 0.6); const k = Math.min(1, cr.ex); cr.o.position.y = Math.abs(Math.sin(t * 7 + cr.ph)) * 0.16 * k + Math.sin(t * 2 + cr.ph) * 0.01; cr.o.rotation.z = Math.sin(t * 5 + cr.ph) * 0.06 * Math.min(1, k + 0.2); }
    // camera: dodge sway, hurt shake, breathing
    const dd = P.dodge > 0 ? Math.sin((1 - P.dodge / 0.42) * Math.PI) : 0; shake = Math.max(0, shake - dt * 2.2);
    c.position.set(P.dodgeDir * dd * 0.62 + (Math.random() - 0.5) * shake * 0.08, EYE[F.i] - dd * 0.1 + Math.sin(t * 2.2) * 0.008 + (Math.random() - 0.5) * shake * 0.06, 2.35 + (1 - clamp(c.aspect / 1.6, 0.45, 1)) * 2.2);
    c.rotation.set(-0.03, 0, -P.dodgeDir * dd * 0.16 + (Math.random() - 0.5) * shake * 0.03);
    pawPose('L', t); pawPose('R', t);
    if (phase === 'fight' || phase === 'ko') hud();
  };
  H.begin = (o = {}) => {
    H.active = true; leaveCb = o.onLeave || onLeave; document.body.classList.add('br'); SFX.warm(); loadCrew();
    pend = []; hitStop = slow = shake = 0; restart(); U.panel.classList.remove('on'); document.body.classList.remove('brCard'); phase = 'intro'; setFoe(0); hud();
    playCinematic('brawler_intro').then((r) => { H.introPlayed = r.played; if (H.active && phase === 'intro') card(0, true); });
  };
  H.leave = () => { if (!H.active) return; const cb = leaveCb; H.end(); cb?.({}); };
  H.end = () => { H.active = false; phase = 'idle'; pend = []; proj = null; taco.visible = false; spray.visible = false; sprayT = -1; P.block = false; P.charge = -1; document.body.classList.remove('br', 'brCard'); U.panel.classList.remove('on'); for (const b of [U.block, U.dl, U.dr, U.spec]) b.classList.remove('on'); };
  H.tris = () => { let n = 0; scene.traverseVisible(m => { if (m.isMesh && m.geometry) { const g = m.geometry, cc = g.index ? g.index.count : g.attributes.position.count; n += cc / 3 * (m.isInstancedMesh ? m.count : 1); } }); return Math.round(n); };
  H.crewReady = () => crewP || Promise.resolve();
  H.test = { get phase() { return phase; }, get foe() { return F.def.id; }, get foeHp() { return F.hp; }, get foeSt() { return F.st; }, get atk() { return F.atk; }, get hp() { return P.hp; }, get sta() { return P.sta; }, get meter() { return P.meter; }, get R() { return R; }, get crowd() { return crowd.length; }, get last() { return H.last; },
    fight: () => { U.panel.classList.remove('on'); document.body.classList.remove('brCard'); go(); }, jab, dodge, block: (on) => { P.block = !!on; }, special: () => { P.meter = 100; startCharge(); P.charge = 0.5; return releaseCharge(); },
    koFoe: () => { if (phase === 'fight') { F.hp = 1; F.st = 'recover'; F.t = 0; F.dur = 1; landJab('L', 1); } }, forceAtk: (a) => { if (phase !== 'fight') return; startAtk(false); F.atk = a; F.feint = false; const red = a === 'U' || a === 'spray', uu = F.o.userData; uu.tell.material.map = red ? uu.tellR : uu.tellT; },
    freeze: (st) => { pend = []; F.st = st; F.t = 0; F.dur = 99; }, advance: (sec) => { for (let i = 0; i < sec * 60; i++) H.update(1 / 60, tSec + 1 / 60); }, tris: () => H.tris() };
  return H;
}
