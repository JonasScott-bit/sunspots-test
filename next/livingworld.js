// livingworld.js — run 14 (D): the living town. Waddle cars on lane loops (they stop for the Wolf and honk), sidewalk
// pedestrians, NPC scenes (the diner argument, Bear vs Gecko at the hoop, Larry Byrd hustling outside the pool hall,
// Moth's cab giving rides, a fender-bender, a chase), three story arcs told through chatter + flyers (a feud, a romance,
// a lost pet), random street events, WILD chaos, and the FUZZ-O-METER with Officer Fuzz in a waddle cop car.
// All procedural felt, no skinned rigs (0 of the 3-rig budget). Anything beyond ~60 m from the camera is hidden and
// only coarsely simulated. Schedules run on the town clock: it advances with play and jumps with the store clock.
import * as THREE from 'three';
import { textPlane } from './townkit.js';
import { GRID } from './townscape.js';

const TAU = Math.PI * 2, R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const VIS = 60;   // m: NPCs beyond this are hidden

export function installLivingWorld({ T, TS, level, wolfState, scene, camera, feltMat, audio, CR, QT }) {
  const G = new THREE.Group(); G.name = 'livingworld'; scene.add(G);
  const M = {}; const mat = (c) => (M[c] ||= feltMat(c));
  let tris = 0; const count = (geo) => { tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; return geo; };
  const mesh = (geo, c, p, parent) => { const m = new THREE.Mesh(count(geo), mat(c)); if (p) m.position.set(p[0], p[1], p[2]); m.castShadow = false; parent.add(m); return m; };
  const LW = { tris: 0, cars: [], peds: [], fuzz: 0, events: [], arcs: { feud: 0, romance: 0, pet: 0 }, log: [], townT: 0 };
  const wild = () => !!document.getElementById('wildBtn')?.classList.contains('on');
  const say = (who, text, at, h = 2.4) => { if (!T.bubble) return; const p = typeof at === 'function' ? at() : at; if (!p || near(p) > 26) return; T.bubble(who, wild() ? text.toUpperCase() : text, at, h); };
  const wp = wolfState.pos; const near = (p) => Math.hypot(p.x - wp.x, p.z - wp.z);
  const busy = () => !!(T.active || CR?.busy || CR?.seatM || CR?.game || window.__titleUp);
  const honk = (p) => { if (near(p) < 30) audio?.horn?.(); };
  const toast = (s) => T.M?.toast?.(s);
  const logEv = (s) => { LW.log.push(s); if (LW.log.length > 30) LW.log.shift(); };

  // ------------------------------------------------------------------ felt pals (no rigs: a pivot per leg + bob)
  function pal({ body = '#c9a37a', head, ears = 'round', ear = null, snout = null, hat = null, shirt = null, h = 1.0, tail = null }) {
    const g = new THREE.Group(), s = h; head ||= body;
    const torso = mesh(new THREE.CapsuleGeometry(0.3 * s, 0.38 * s, 2, 7), shirt || body, [0, 0.78 * s, 0], g);
    const hd = new THREE.Group(); hd.position.set(0, 1.38 * s, 0); g.add(hd);
    mesh(new THREE.SphereGeometry(0.27 * s, 8, 6), head, [0, 0, 0], hd);
    for (const sx of [-1, 1]) {
      if (ears === 'round') mesh(new THREE.SphereGeometry(0.1 * s, 5, 4), ear || head, [sx * 0.2 * s, 0.22 * s, -0.02], hd);
      if (ears === 'long') { const e = mesh(new THREE.CapsuleGeometry(0.06 * s, 0.32 * s, 2, 5), ear || head, [sx * 0.12 * s, 0.38 * s, -0.04], hd); e.rotation.z = -sx * 0.25; }
      if (ears === 'pointy') { const e = mesh(new THREE.ConeGeometry(0.09 * s, 0.22 * s, 4), ear || head, [sx * 0.16 * s, 0.28 * s, 0], hd); e.rotation.z = -sx * 0.3; }
      if (ears === 'antenna') { const e = mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.4 * s, 3), '#3a2a2a', [sx * 0.1 * s, 0.38 * s, 0], hd); e.rotation.z = -sx * 0.4; mesh(new THREE.SphereGeometry(0.05 * s, 4, 3), ear || '#3a2a2a', [sx * 0.19 * s, 0.56 * s, 0], hd); }
      mesh(new THREE.SphereGeometry(0.035 * s, 4, 3), '#1d1416', [sx * 0.1 * s, 0.05 * s, 0.24 * s], hd);
    }
    if (snout) mesh(new THREE.SphereGeometry(0.12 * s, 6, 4), snout, [0, -0.06 * s, 0.24 * s], hd).scale.set(1, 0.75, 1.1);
    if (hat) { mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.03 * s, 9), hat, [0, 0.22 * s, 0], hd); mesh(new THREE.CylinderGeometry(0.17 * s, 0.19 * s, 0.2 * s, 9), hat, [0, 0.32 * s, 0], hd); }
    if (tail) { const t = mesh(new THREE.CapsuleGeometry(0.06 * s, 0.4 * s, 2, 5), tail, [0, 0.6 * s, -0.32 * s], g); t.rotation.x = -0.9; }
    const legs = [], arms = [];
    for (const sx of [-1, 1]) {
      const lp = new THREE.Group(); lp.position.set(sx * 0.13 * s, 0.42 * s, 0); g.add(lp); mesh(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.42 * s, 5), body, [0, -0.21 * s, 0], lp); legs.push(lp);
      const ap = new THREE.Group(); ap.position.set(sx * 0.33 * s, 1.0 * s, 0); g.add(ap); mesh(new THREE.CapsuleGeometry(0.055 * s, 0.32 * s, 2, 5), body, [0, -0.2 * s, 0], ap); ap.rotation.z = sx * 0.15; arms.push(ap);
    }
    g.userData = { torso, hd, legs, arms, h: s, ph: R() * 10 };
    return g;
  }
  function animPal(g, dt, spd, t) {   // walk cycle + idle bob
    const u = g.userData; u.ph += dt * (spd > 0.05 ? 4 + spd * 2.2 : 1.5); const sw = spd > 0.05 ? Math.min(0.7, 0.25 + spd * 0.18) : 0;
    u.legs[0].rotation.x = Math.sin(u.ph) * sw; u.legs[1].rotation.x = -Math.sin(u.ph) * sw;
    u.arms[0].rotation.x = -Math.sin(u.ph) * sw * 0.8; u.arms[1].rotation.x = Math.sin(u.ph) * sw * 0.8;
    u.torso.position.y = 0.78 * u.h + (spd > 0.05 ? Math.abs(Math.sin(u.ph)) * 0.05 : Math.sin(u.ph) * 0.012);
    u.hd.position.y = u.torso.position.y + 0.6 * u.h; u.hd.rotation.z = Math.sin(u.ph * 0.5) * 0.06;
  }
  const talkArms = (g, t) => { const u = g.userData; u.arms[0].rotation.x = -0.8 + Math.sin(t * 7) * 0.5; u.arms[1].rotation.x = -0.4 + Math.cos(t * 5) * 0.4; };

  // ------------------------------------------------------------------ waddle cars
  const CAR_COLS = [['#e89ab0', '#f4eee4'], ['#7fc8c0', '#f2ece0'], ['#f0d27a', '#f2ece0'], ['#a8d4b0', '#e8e4d8'], ['#d86a3a', '#f2e6d0'], ['#8ab0d8', '#f2ece0']];
  function waddleCar(col, trim, driver, roof) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const b = mesh(new THREE.CapsuleGeometry(0.62, 2.1, 2, 8), col, [0, 0.72, 0], body); b.rotation.x = Math.PI / 2; b.scale.set(1.25, 1, 0.8);
    mesh(new THREE.SphereGeometry(0.62, 8, 5, 0, TAU, 0, Math.PI / 2), trim, [0, 1.05, -0.25], body).scale.set(1.15, 0.9, 1.35);   // cabin bubble
    mesh(new THREE.BoxGeometry(1.7, 0.12, 0.2), '#e8e2d6', [0, 0.55, 1.68], body); mesh(new THREE.BoxGeometry(1.7, 0.12, 0.2), '#e8e2d6', [0, 0.55, -1.68], body);   // bumpers
    for (const sx of [-0.5, 0.5]) mesh(new THREE.SphereGeometry(0.12, 5, 4), '#fff3c8', [sx, 0.82, 1.62], body);
    const wheels = [];
    for (const [x, z] of [[-0.78, 1.0], [0.78, 1.0], [-0.78, -1.0], [0.78, -1.0]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 9), '#2a2426', [x, 0.34, z], g); w.rotation.z = Math.PI / 2; wheels.push(w); }
    if (driver) { driver.scale.setScalar(0.62); driver.position.set(-0.3, 0.42, -0.15); body.add(driver); }
    if (roof) { const s = textPlane(roof, 1.6, 0.42, { bg: '#f6efe0', fg: '#3a1f2a', font: 'bold', family: 'Futura, Avenir, sans-serif' }); s.position.set(0, 1.85, -0.25); body.add(s);
      const s2 = s.clone(); s2.rotation.y = Math.PI; body.add(s2); mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), '#3a1f2a', [0, 1.55, -0.25], body); tris += 4; }
    g.userData = { body, wheels }; return g;
  }

  // lane loops on the street grid (right-hand traffic), corners at street centre crossings
  const st = (n) => [...GRID.ew, ...GRID.ns].find(s => s.n === n);
  const XA0 = st('palm').x, XA1 = st('east').x, ZA0 = st('main').z, ZA1 = st('mesa').z, XB1 = st('sun').x, ZB0 = st('strip').z;
  const LOOPS = { A: [[XA0, ZA0], [XA1, ZA0], [XA1, ZA1], [XA0, ZA1]], B: [[XA0, ZB0], [XB1, ZB0], [XB1, ZA0], [XA0, ZA0]] };
  function lane(pts, rev, off = 1.9) {
    const P = rev ? pts.slice().reverse() : pts.slice(), n = P.length, out = [];
    const nrm = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [-dz / l, dx / l]; };
    for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], n1 = nrm(a, b), n2 = nrm(b, c); out.push([b[0] + (n1[0] + n2[0]) * off, b[1] + (n1[1] + n2[1]) * off]); }
    const segs = out.map((p, i) => { const q = out[(i + 1) % n]; return { a: p, b: q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
    let L = 0; for (const s of segs) { s.s0 = L; L += s.len; } return { segs, L };
  }
  function at(ln, s, out) { s = ((s % ln.L) + ln.L) % ln.L; for (const g of ln.segs) if (s <= g.s0 + g.len) { const k = (s - g.s0) / g.len; out.x = g.a[0] + (g.b[0] - g.a[0]) * k; out.z = g.a[1] + (g.b[1] - g.a[1]) * k; out.yaw = Math.atan2(g.b[0] - g.a[0], g.b[1] - g.a[1]); return out; } return out; }
  const LANES = { A: lane(LOOPS.A, false), Ar: lane(LOOPS.A, true), B: lane(LOOPS.B, false), Br: lane(LOOPS.B, true) };

  // the cast (made-up names, felt critters)
  const CAST = {
    moth: () => pal({ body: '#b8a890', head: '#d8ccb4', ears: 'antenna', shirt: '#6a7a5a' }),
    goat: () => pal({ body: '#e8e0d0', ears: 'pointy', snout: '#d8ccb8', shirt: '#c64246' }),
    pig: () => pal({ body: '#f0b4b0', ears: 'pointy', snout: '#e89a98', shirt: '#3a4a78' }),
    duck: () => pal({ body: '#f2ece0', snout: '#f0a43a', ears: 'none', shirt: '#7fc8c0' }),
    cat: () => pal({ body: '#e8a060', ears: 'pointy', shirt: '#a8d4b0', tail: '#e8a060' }),
    rabbit: () => pal({ body: '#cfc5bb', ears: 'long', ear: '#e8c8c8', shirt: '#f0d27a' }),
    dog: () => pal({ body: '#a07850', ears: 'long', ear: '#6b4a32', snout: '#c8a888', shirt: '#e89ab0' }),
    hen: () => pal({ body: '#f6f0e4', head: '#f6f0e4', ears: 'none', snout: '#f0b04a', shirt: '#e0705a', hat: null }),
    possum: () => pal({ body: '#b8b4b0', head: '#e8e2dc', ears: 'round', ear: '#2a2426', snout: '#f0c8c8', shirt: '#f2ece0' }),
    raccoon: () => pal({ body: '#8a8680', ears: 'round', snout: '#e8e2dc', shirt: '#d86a3a', tail: '#5a5652' }),
    sheep: () => pal({ body: '#f2ece0', head: '#3a3436', ears: 'round', ear: '#3a3436', shirt: '#8ab0d8' }),
    bear: () => pal({ body: '#7a5236', ears: 'round', snout: '#c8a07a', shirt: '#c64246', h: 1.15 }),
    gecko: () => pal({ body: '#8ac46a', head: '#9ad47a', ears: 'none', snout: '#9ad47a', shirt: '#f2ece0', tail: '#8ac46a', h: 0.9 }),
    fuzz: () => pal({ body: '#e6dcc8', head: '#efe6d4', ears: 'long', ear: '#c8b498', snout: '#f6efe2', shirt: '#2f3f6a', hat: '#2f3f6a' }),
  };

  const CARS = [
    { id: 'cab', lane: 'A', s: 20, v: 6.5, col: ['#f0d27a', '#2a2426'], who: 'moth', name: 'MOTH', roof: "MOTH'S RIDES" },
    { id: 'plum', lane: 'A', s: 150, v: 7, col: CAR_COLS[0], who: 'goat', name: 'GOAT IN A HURRY' },
    { id: 'mint', lane: 'Ar', s: 60, v: 6.5, col: CAR_COLS[1], who: 'duck', name: 'DUCK' },
    { id: 'lemon', lane: 'Ar', s: 230, v: 7.5, col: ['#d86a3a', '#f2e6d0'], who: 'cat', name: 'THE LEMON KID' },
    { id: 'cream', lane: 'B', s: 40, v: 6, col: CAR_COLS[3], who: 'pig', name: 'PIG' },
    { id: 'navy', lane: 'Br', s: 120, v: 6.5, col: CAR_COLS[5], who: 'dog', name: 'DOG' },
  ];
  for (const c of CARS) { c.root = waddleCar(c.col[0], c.col[1], CAST[c.who](), c.roof); G.add(c.root); c.ln = LANES[c.lane]; c.cur = 0; c.p = { x: 0, z: 0, yaw: 0 }; c.stopT = 0; c.blockT = 0; c.hop = 0; c.hopV = 0; c.spin = 0; c.ph = R() * 9; LW.cars.push(c); }
  const CARBY = Object.fromEntries(CARS.map(c => [c.id, c]));
  // Officer Fuzz (waddle cop car, parked on Main)
  const COPHOME = { x: -85, z: ZA0 + 4.0, yaw: Math.PI / 2 };
  const cop = { id: 'cop', root: waddleCar('#f2ece0', '#2f3f6a', CAST.fuzz(), 'FUZZ'), p: { ...COPHOME }, v: 0, mode: 'parked', target: null, t: 0, hop: 0, hopV: 0, spin: 0, ph: 0 };
  G.add(cop.root); { const b = cop.root.userData.body; cop.lights = [mesh(new THREE.SphereGeometry(0.14, 5, 4), '#c8302e', [-0.25, 1.62, 0.2], b), mesh(new THREE.SphereGeometry(0.14, 5, 4), '#3a6ac8', [0.25, 1.62, 0.2], b)];
    cop.lights.forEach((l, i) => { l.material = new THREE.MeshBasicMaterial({ color: i ? '#3a6ac8' : '#c8302e', toneMapped: false }); }); }

  // ------------------------------------------------------------------ pedestrians on the sidewalks
  const zN = ZA0 - 5 - 1.75, zS = ZA0 + 5 + 1.75, xW = XB1 - 5 - 1.75, xE = XB1 + 5 + 1.75;
  const PEDS = [
    { who: 'rabbit', name: 'RABBIT', path: [[-92, zS], [-52, zS]] },
    { who: 'sheep', name: 'NAN', path: [[-30, zS], [28, zS]], owner: true },
    { who: 'duck', name: 'DUCK', path: [[-95, zN], [-52, zN]] },
    { who: 'pig', name: 'PIG', path: [[xW, -50], [xW, -12]] },
    { who: 'cat', name: 'CAT', path: [[xE, 20], [xE, 55]] },
    { who: 'dog', name: 'DOG', path: [[-28, zN], [30, zN]] },
    { who: 'goat', name: 'GOAT', path: [[xE, -50], [xE, -12]] },
  ];
  for (const p of PEDS) { p.root = CAST[p.who](); G.add(p.root); p.k = R(); p.dir = R() < 0.5 ? 1 : -1; p.wait = R() * 3; p.v = 1.1 + R() * 0.4; p.tumble = 0; p.talkT = 0; p.root.position.set(p.path[0][0], 0, p.path[0][1]); LW.peds.push(p); }

  // ------------------------------------------------------------------ scene sets (anchored to door marks)
  const mk = (k, fx, fz) => { const m = TS.marks?.['door_' + k] || TS.doors?.[k]; const r = m?.ry || 0; return m ? { x: m.x + Math.sin(r) * 3.2, z: m.z + Math.cos(r) * 3.2, ry: r } : { x: fx, z: fz, ry: 0 }; };
  const DINER = mk('diner', -23, 3), POOL = mk('poolhall', -12, -56), COURT = mk('court', -107, -22);
  const actor = (who, x, z, ry) => { const g = CAST[who](); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g); return g; };
  const side = (A, d) => ({ x: A.x + Math.cos(A.ry) * d, z: A.z - Math.sin(A.ry) * d });
  // diner argument: DOT (hen, waitress) vs SAL (possum, cook)
  const dA = side(DINER, -1.1), dB = side(DINER, 1.1);
  const dot = actor('hen', dA.x, dA.z, DINER.ry + Math.PI / 2), sal = actor('possum', dB.x, dB.z, DINER.ry - Math.PI / 2);
  // hoops: Bear vs Gecko on the court apron, a felt hoop + ball
  const hoopAt = side(COURT, 3.2), bearAt = side(COURT, -1.5), geckoAt = side(COURT, 0.4);
  const hoop = new THREE.Group(); hoop.position.set(hoopAt.x, 0, hoopAt.z); hoop.rotation.y = COURT.ry - Math.PI / 2; G.add(hoop);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.1, 6), '#8a8c88', [0, 1.55, -0.3], hoop); mesh(new THREE.BoxGeometry(1.2, 0.8, 0.06), '#f2ece0', [0, 3.3, -0.25], hoop);
  const rim = mesh(new THREE.TorusGeometry(0.24, 0.025, 4, 10), '#d86a3a', [0, 3.05, 0], hoop); rim.rotation.x = Math.PI / 2;
  const bear = actor('bear', bearAt.x, bearAt.z, 0), gecko = actor('gecko', geckoAt.x, geckoAt.z, 0);
  const ball = mesh(new THREE.SphereGeometry(0.13, 7, 5), '#d86a3a', [bearAt.x, 1.3, bearAt.z], G);
  // pool hall: Larry Byrd (felt vulture stand-in, lighter than the room model) hustling REGGIE (raccoon)
  const lA = side(POOL, -0.9), lB = side(POOL, 0.9);
  const larry = actor('possum', lA.x, lA.z, POOL.ry + Math.PI / 2); larry.traverse(o => { if (o.isMesh && o.material === mat('#b8b4b0')) o.material = mat('#2a2422'); if (o.isMesh && o.material === mat('#e8e2dc')) o.material = mat('#c4473a'); if (o.isMesh && o.material === mat('#f2ece0')) o.material = mat('#2f55a8'); });
  const reggie = actor('raccoon', lB.x, lB.z, POOL.ry - Math.PI / 2);
  const coin = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 8), '#e8c45a', [lA.x, 1.2, lA.z], G);
  // Moth's cab stand on Main (south kerb, eastbound lane)
  const STAND = { x: -60, z: ZA0 + 1.9 }; { const pole = new THREE.Group(); pole.position.set(STAND.x, 0, ZA0 + 5.6); G.add(pole); mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), '#6b5644', [0, 1.3, 0], pole);
    const sgn = textPlane('CAB STAND\nMOTH\'S RIDES', 1.1, 0.7, { bg: '#f0d27a', fg: '#2a2426', family: 'Futura, Avenir, sans-serif' }); sgn.position.set(0, 2.5, 0.04); pole.add(sgn); const s2 = sgn.clone(); s2.rotation.y = Math.PI; s2.position.z = -0.04; pole.add(s2); tris += 8; }

  // ------------------------------------------------------------------ story arcs (chatter + flyers)
  const ARCS = {
    feud: { title: 'THE HOOP FEUD', flyers: ['BEAR SAYS:\nTHE HOOP IS\nBEAR\'S HOOP', 'GECKO SAYS:\nIT\'S A PUBLIC\nHOOP, BEAR', 'GRUDGE MATCH\nBEAR v GECKO\nFIRST TO 1', 'BEAR + GECKO\nSORRY ABOUT\nTHE HOOP'],
      lines: [['BEAR', 'That hoop was there when I got here. So it is mine.'], ['GECKO', 'Bear thinks the hoop is Bear\'s. The hoop belongs to the sky.'], ['', 'Grudge match at the court. First to one point. It has been going for three days.'], ['BEAR', 'Gecko and I are friends now. We share the hoop. Gecko gets the bottom half.']] },
    romance: { title: 'DOT + LARRY', flyers: ['SECRET ADMIRER\nSEEKS DOT\n(THE DINER)', 'DOT: WHO\nKEEPS LEAVING\nCHALK ON MY TIP', 'LARRY BYRD\nIS A VULTURE\n- SAL', 'DOT + LARRY\nDINNER FOR TWO\n(THE DINER)'],
      lines: [['DOT', 'Somebody leaves me pool chalk for a tip. Every day. Blue.'], ['SAL', 'It\'s Larry Byrd. I know it\'s Larry Byrd. Larry is a vulture, Dot.'], ['LARRY BYRD', 'Dot. The waitress. I\'ve never lost a bet. I\'m scared to make this one.'], ['DOT', 'Larry asked me to dinner. At the diner. Where I work. Sal is cooking. Sal is furious.']] },
    pet: { title: 'LOST: PICKLES', flyers: ['LOST\nPICKLES\n(A FELT HAMSTER)', 'STILL LOST\nPICKLES\nLIKES SEEDS + CABS', 'PICKLES WAS\nSEEN IN A CAB\nHAVE YOU SEEN', 'PICKLES IS\nHOME. THANK\nYOU, WOLF'],
      lines: [['NAN', 'Have you seen Pickles? Small. Round. Felt. Answers to nothing, like the cat.'], ['MOTH', 'Had a hamster in the back today. Paid in seeds. I gave change.'], ['NAN', 'Moth says Pickles rode to the horse. The statue. Pickles loves that horse.'], ['NAN', 'Pickles is home. Pickles is asleep in a teacup. Thank you, Wolf.']] },
  };
  const FLY_AT = [[-58.4, ZA0 + 8.4], [-33.2, ZA0 + 8.4], [-106, ZA0 - 8.4]];
  const flyers = {};
  Object.keys(ARCS).forEach((k, i) => { const [x, z] = FLY_AT[i]; const post = new THREE.Group(); post.position.set(x, 0, z); G.add(post); mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.4, 6), '#6b5644', [0, 1.2, 0], post);
    flyers[k] = ARCS[k].flyers.map((t, j) => { const f = textPlane(t, 0.9, 0.9, { bg: j === 3 ? '#e8f0d0' : '#f6efe0', fg: '#3a1f2a', family: 'Futura, Avenir, sans-serif', fit: 0.8 }); f.position.set(0, 1.75, 0.1); f.visible = j === 0; post.add(f);
      const b = f.clone(); b.rotation.y = Math.PI; b.position.z = -0.1; post.add(b); f.userData.back = b; b.visible = f.visible; tris += 4; return f; });
    T.addSpot({ id: 'lw_flyer_' + k, x, z, r: 1.8, label: 'READ THE FLYER', act: () => { const s = LW.arcs[k]; seen(k); return [['', ARCS[k].flyers[s].replace(/\n/g, ' ')], ARCS[k].lines[s]]; } }); });
  function setArc(k, s) { s = Math.min(3, s); if (LW.arcs[k] >= s) return; LW.arcs[k] = s; flyers[k].forEach((f, j) => { f.visible = f.userData.back.visible = j === s; }); logEv('arc ' + k + ' ' + s); if (s === 3) toast(ARCS[k].title + ' — the end.'); }
  const seenT = {}; function seen(k) { seenT[k] = (seenT[k] || 0) + 1; }

  // Pickles (the lost felt hamster): shows up by the horse statue at stage 2, carried back to NAN
  const pickles = new THREE.Group(); mesh(new THREE.SphereGeometry(0.16, 7, 5), '#e8b070', [0, 0.14, 0], pickles).scale.set(1.2, 0.9, 1);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.05, 4, 3), '#e8b070', [s * 0.09, 0.27, 0.05], pickles); mesh(new THREE.SphereGeometry(0.02, 3, 2), '#1d1416', [0, 0.18, 0.18], pickles);
  const PK = { x: -71, z: 13.6 };   // under the bench on the Main St sidewalk
  pickles.position.set(PK.x, 0, PK.z); pickles.visible = false; G.add(pickles); let carry = false;
  T.addSpot({ id: 'lw_pickles', x: PK.x, z: PK.z, r: 2.2, on: () => LW.arcs.pet === 2 && !carry, label: 'PICK UP PICKLES', act: () => { carry = true; pickles.visible = false; logEv('pickles picked'); return [['', 'A small, round, felt hamster. It is looking at the horse.'], ['', 'You pick up Pickles. Pickles allows this.']]; } });
  const nan = PEDS.find(p => p.owner);
  const nanSpot = T.addSpot({ id: 'lw_nan', x: 0, z: 0, r: 2.4, on: () => carry, label: 'GIVE PICKLES TO NAN', act: () => { carry = false; setArc('pet', 3); T.M?.toast?.('LOST: PICKLES — found.'); return [['NAN', 'PICKLES.'], ['NAN', 'Where were you? The horse? Of course the horse.'], ['', 'Pickles goes in the pocket. Pickles was always going in the pocket.']]; } });

  // ------------------------------------------------------------------ the town clock + schedules
  const clockS = () => (level.left != null ? 14 * 3600 - level.left : 0);   // the store clock (game seconds)
  let lastClock = clockS();
  const SLOT = 30;   // town seconds per schedule slot; 8 slots = one town "day"
  const slot = () => Math.floor(LW.townT / SLOT) % 8;
  const SCHED = {   // slot -> what the set pieces are doing
    hoops: [1, 1, 0, 1, 1, 1, 0, 1], diner: [0, 1, 1, 0, 1, 1, 0, 1], pool: [1, 1, 1, 0, 1, 1, 1, 0], fender: [0, 0, 1, 0, 0, 0, 1, 0], chase: [0, 0, 0, 0, 1, 0, 0, 0],
  };
  const LINES = {
    diner: [[['DOT', 'Two eggs, Sal. TWO.'], ['SAL', 'I made two eggs. One of them is shy.']], [['SAL', 'Who put pool chalk in the tip jar?'], ['DOT', 'Nobody. It\'s a mystery. A blue mystery.']], [['DOT', 'The ketchup is ketchup, Sal. Stop calling it "red gravy".'], ['SAL', 'Red. Gravy.']], [['SAL', 'Dot, I am the cook. You are the waitress. Larry is a vulture.'], ['DOT', 'Larry is a regular.'], ['SAL', 'Vultures are regulars. That\'s the problem.']]],
    pool: [[['LARRY BYRD', 'Coin toss. Heads I win. Tails you lose.'], ['REGGIE', 'Okay. Wait.']], [['LARRY BYRD', 'Double or nothing.'], ['REGGIE', 'I have nothing.'], ['LARRY BYRD', 'Then double it.']], [['LARRY BYRD', 'I don\'t hustle. I explain things slowly for money.']], [['REGGIE', 'I lost my hat, my lunch and the bus.'], ['LARRY BYRD', 'You can win back the bus.']]],
    hoops: [[['BEAR', 'That\'s a foul.'], ['GECKO', 'You fouled ME.'], ['BEAR', 'It\'s the sweater.']], [['GECKO', 'Check ball.'], ['BEAR', 'Check what?']], [['BEAR', 'Swish.'], ['GECKO', 'That hit the pole, the board, a bird and the rim.'], ['BEAR', 'Swish.']]],
    honk: [['', 'HONK.'], ['', 'HOOONK.'], ['', 'honk honk.'], ['', 'The car waddles at you. Politely. Then not.']],
    driver: ['You\'re in the road, Wolf.', 'This is a road. For cars. I\'m a car.', 'Move it, fuzzy.', 'I have places to waddle.', 'Do you mind?'],
    fender: [['GOAT IN A HURRY', 'You STOPPED.'], ['MOTH', 'It\'s a stop sign.'], ['GOAT IN A HURRY', 'There\'s no stop sign.'], ['MOTH', 'Then why did I stop?']],
    chase: [['OFFICER FUZZ', 'LEMON KID! That is a speed!'], ['THE LEMON KID', 'It\'s a waddle! I\'m waddling fast!']],
    caught: [['OFFICER FUZZ', 'Alright, alright. License and fur.'], ['OFFICER FUZZ', 'This is a citation. It says "a lot". Have a good day.'], ['', 'The Fuzz-o-meter resets. Officer Fuzz waddles back to the doughnut.']],
    escape: [['OFFICER FUZZ', 'Lost the fuzzy one. Lunch.']],
    ped: { normal: [['', 'Afternoon.'], ['', 'Have you seen the horse? The statue one?'], ['', 'Hot one today. Every day is a hot one.'], ['', 'The store closes at two. It always has.'], ['', 'I\'m walking. That\'s it. That\'s the errand.']], bump: [['', 'HEY.'], ['', 'Watch the tail!'], ['', 'Rude. Fuzzy, but rude.'], ['', 'I\'m telling Officer Fuzz.']] },
    wild: [['', 'THE STREET IS MELTING. NOBODY PANIC. EVERYBODY DANCE.'], ['', 'WADDLE WADDLE WADDLE.'], ['', 'HONK IF YOU\'RE MELTING.'], ['', 'MY HAT IS A SOUP.']],
  };

  // ------------------------------------------------------------------ HUD: the Fuzz-o-meter
  const hud = document.createElement('div'); hud.id = 'fuzzo';
  hud.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);z-index:30;font:700 11px/1 Futura,Avenir,sans-serif;letter-spacing:.12em;color:#3a1f2a;background:#f6efe0;border:2px solid #3a1f2a;border-radius:14px;padding:5px 10px;display:none;pointer-events:none;white-space:nowrap';
  document.body.appendChild(hud);
  const renderHud = () => { const n = Math.min(5, Math.round(LW.fuzz)); hud.style.display = LW.fuzz > 0.05 || cop.mode === 'chase' ? 'block' : 'none'; hud.innerHTML = 'FUZZ-O-METER ' + '<span style="color:#c8302e">' + '●'.repeat(n) + '</span>' + '○'.repeat(5 - n) + (cop.mode === 'chase' && cop.target === 'wolf' ? ' · <span style="color:#3a6ac8">OFFICER FUZZ IS COMING</span>' : ''); };
  let offT = 0; const offense = (n, why) => { LW.fuzz = Math.min(5, LW.fuzz + n); offT = 0; logEv('fuzz +' + n + ' ' + why); renderHud(); if (LW.fuzz >= 3 && cop.mode !== 'chase') dispatch('wolf'); };

  function dispatch(target) { cop.mode = 'chase'; cop.target = target; cop.t = 0; cop.lost = 0; honk(cop.p); logEv('cop chase ' + target); if (target === 'wolf') { toast('FUZZ-O-METER: 3. Officer Fuzz is on the way.'); say('OFFICER FUZZ', 'You there. Fuzzy. Hold it.', () => cop.p); } renderHud(); }

  // ------------------------------------------------------------------ Moth's cab: rides
  T.addSpot({ id: 'lw_cab', x: STAND.x, z: STAND.z + 2.6, r: 3.8, on: () => CARBY.cab.stopT > 0.5 && CARBY.cab.atStand && !level.inCar, label: 'RIDE WITH MOTH',
    act: () => { const w = QT?.where?.('carnival'); CARBY.cab.stopT = 0.4; logEv('moth ride');
      if (w) setTimeout(() => QT.jump(w), 2600);
      return [['MOTH', 'Where to?'], ['WOLF', 'Wherever you\'re going.'], ['MOTH', 'Everybody goes to the fair. Hop in. Mind the hamster seeds.']]; } });

  // ------------------------------------------------------------------ random street events
  const PROPS = {};
  function prop(kind) {
    if (PROPS[kind]) return PROPS[kind]; const g = new THREE.Group();
    if (kind === 'tumbleweed') { const m = mesh(new THREE.IcosahedronGeometry(0.55, 1), '#b89a68', [0, 0.55, 0], g); m.material = new THREE.MeshStandardMaterial({ color: '#b89a68', wireframe: true }); }
    if (kind === 'cart') { mesh(new THREE.BoxGeometry(0.7, 0.5, 1.0), '#b8b4b0', [0, 0.75, 0], g); for (const [x, z] of [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]]) mesh(new THREE.SphereGeometry(0.08, 4, 3), '#2a2426', [x, 0.08, z], g); mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), '#b8b4b0', [0, 0.4, 0], g); }
    if (kind === 'balloon') { mesh(new THREE.SphereGeometry(0.4, 7, 5), '#e8806a', [0, 2, 0], g).scale.set(1, 1.2, 1); mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.6, 3), '#3a1f2a', [0, 1, 0], g); }
    if (kind === 'hat') { mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 9), '#3a4a78', [0, 0.1, 0], g); mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 9), '#3a4a78', [0, 0.22, 0], g); }
    g.visible = false; G.add(g); return (PROPS[kind] = g);
  }
  const EVENTS = {
    tumbleweed: { lines: [['', 'A tumbleweed. Going somewhere. Further than you.']], go(e) { e.g = prop('tumbleweed'); e.dir = R() < 0.5 ? 1 : -1; e.p = { x: wp.x - e.dir * 14, z: wp.z + 3 }; e.dur = 9; }, tick(e, dt) { e.p.x += e.dir * dt * 3.2; e.g.position.set(e.p.x, Math.abs(Math.sin(e.t * 5)) * 0.4, e.p.z); e.g.rotation.z -= e.dir * dt * 6; } },
    cart: { lines: [['', 'A runaway shopping cart. Last Minute Snacks wants it back. It does not want to go back.']], go(e) { e.g = prop('cart'); e.p = { x: wp.x + 10, z: wp.z - 6 }; e.dur = 8; }, tick(e, dt) { e.p.x -= dt * 2.4; e.p.z += dt * 1.6; e.g.position.set(e.p.x, 0, e.p.z); e.g.rotation.y = Math.sin(e.t * 3) * 0.4; } },
    balloon: { lines: [['', 'Somebody let go of a balloon. It goes up. It\'s fine. It\'s a balloon.']], go(e) { e.g = prop('balloon'); e.p = { x: wp.x + 3, y: 0, z: wp.z + 2 }; e.dur = 10; }, tick(e, dt) { e.p.y += dt * 1.6; e.p.x += Math.sin(e.t * 2) * dt; e.g.position.set(e.p.x, e.p.y, e.p.z); } },
    hat: { lines: [['RABBIT', 'MY HAT!'], ['', 'A hat blows down the street. A rabbit chases the hat. The hat is winning.']], go(e) { e.g = prop('hat'); e.ped = PEDS[0]; e.p = { x: wp.x + 2, z: wp.z + 1 }; e.dur = 9; e.ped.chase = e; }, tick(e, dt) { e.p.x += dt * 3.0; e.g.position.set(e.p.x, 0.2 + Math.abs(Math.sin(e.t * 4)) * 0.6, e.p.z); e.g.rotation.y += dt * 5; }, end(e) { e.ped.chase = null; } },
  };
  function startEvent(k) { const E = EVENTS[k]; const e = { k, t: 0 }; E.go(e); e.g.visible = true; LW.events.push(e); logEv('event ' + k); const L = E.lines; if (!LW.scene) { T.bubbleSay ? T.bubbleSay(L.map(l => [l[0] || 'SUNSPOTS', l[1]]), () => (e.p || wp), 1.6) : null; } }
  let evT = 25 + R() * 20;

  // ------------------------------------------------------------------ set pieces (scenes)
  LW.scene = null; const scT = { diner: 6, pool: 12, hoops: 3, fender: 40, chase: 70 }; const scI = { diner: 0, pool: 0, hoops: 0 };
  function runLines(k, at, L) { if (near(typeof at === 'function' ? at() : at) > 22) return false; LW.scene = k; T.bubbleSay?.(L.map(l => [l[0], wild() ? l[1].toUpperCase() : l[1]]), at, 2.4); setTimeout(() => { if (LW.scene === k) LW.scene = null; }, 2600 * L.length); logEv('scene ' + k); return true; }
  let shot = null;   // hoops ball flight

  // fender-bender: the car behind Moth's cab doesn't stop in time
  function fender() {
    const a = CARBY.cab, b = CARBY.plum; if (a.ln !== b.ln || a.stopT > 0 || (b.root.visible && Math.abs(b.cur - (a.cur - 6)) > 3)) return false;
    b.cur = a.cur - 6; b.ram = 1.4; a.stopT = 1.2; logEv('fender-bender'); return true;
  }

  // ------------------------------------------------------------------ per-frame
  const _v = new THREE.Vector3(); let lastWild = false;
  function carAhead(c, dist, lat) {   // something in c's lane ahead within dist?
    const fx = Math.sin(c.p.yaw), fz = Math.cos(c.p.yaw);
    const test = (x, z) => { const dx = x - c.p.x, dz = z - c.p.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); return f > 0.5 && f < dist && l < lat; };
    for (const o of CARS) if (o !== c && test(o.p.x, o.p.z) && Math.cos(o.p.yaw - c.p.yaw) > 0.3) return o;
    if (test(cop.p.x, cop.p.z)) return cop;
    if (!busy() && test(wp.x, wp.z)) return 'wolf';
    if (level.car && !level.inCar && test(level.car.pos.x, level.car.pos.z)) return 'car';
    return null;
  }
  function poseCar(c, dt, t, spd, W) {
    const r = c.root, u = r.userData; c.ph += dt * (2 + spd * 0.9) * (W ? 2 : 1);
    if (c.hopV || c.hop > 0) { c.hopV -= 20 * dt; c.hop = Math.max(0, c.hop + c.hopV * dt); if (c.hop === 0) c.hopV = 0; }
    r.position.set(c.p.x, c.hop, c.p.z); r.rotation.y = c.p.yaw + c.spin;
    const wad = (spd > 0.3 ? 0.07 : 0.015) * (W ? 2.4 : 1);   // the waddle: roll side to side, wheels bob in turn
    u.body.rotation.z = Math.sin(c.ph) * wad; u.body.position.y = Math.abs(Math.sin(c.ph)) * wad * 0.8;
    u.wheels.forEach((w, i) => { w.position.y = 0.34 + Math.max(0, Math.sin(c.ph + (i % 2) * Math.PI)) * wad * 1.2; w.rotation.x += spd * dt / 0.34; });
  }

  LW.update = (dt, t) => {
    if (T.active) { G.visible = false; hud.style.display = 'none'; return; } G.visible = true;
    const W = wild(); if (W !== lastWild) { lastWild = W; if (W) { offense(0.5, 'wild'); evT = 3; } }
    // the town clock: always ticks, and jumps forward with the store clock
    const cs = clockS(), dc = Math.max(0, cs - lastClock); lastClock = cs; LW.townT += dt + dc * 2;
    const sl = slot(); if (sl !== LW.slot) { LW.slot = sl; logEv('slot ' + sl); }
    // story arcs advance with town time and with what the Wolf has seen
    const day = Math.floor(LW.townT / (SLOT * 3));
    for (const k of ['feud', 'romance']) if (LW.arcs[k] < 3 && (day > LW.arcs[k] || (seenT[k] || 0) > LW.arcs[k] + 1)) setArc(k, LW.arcs[k] + 1);
    if (LW.arcs.pet < 2 && (day > LW.arcs.pet || (seenT.pet || 0) > LW.arcs.pet)) setArc('pet', LW.arcs.pet + 1);
    pickles.visible = LW.arcs.pet === 2 && !carry; if (pickles.visible) pickles.rotation.y = Math.sin(t * 1.3) * 0.6;
    const cam = camera.position, vis = (p) => Math.hypot(p.x - cam.x, p.z - cam.z) < VIS;

    // ---- cars
    for (const c of CARS) {
      let want = c.v * (W ? 1.5 : 1) * (c.chased ? 1.6 : 1);
      const ah = carAhead(c, c.ram ? 0 : 7.5, 1.6);
      if (c.stopT > 0) { c.stopT -= dt; want = 0; }
      else if (ah) { want = 0; c.blockT += dt;
        if (ah === 'wolf') { if (c.blockT > 1.5 && !c.honked) { c.honked = 1; honk(c.p); say(c.name, pick(LINES.driver), () => c.p, 2.4); }
          if (c.blockT > 4.5 && c.honked === 1) { c.honked = 2; honk(c.p); offense(1, 'blocking ' + c.id); } } }
      else { c.blockT = 0; c.honked = 0; }
      // the cab stops at its stand each lap
      at(c.ln, c.cur, c.p); c.atStand = c.id === 'cab' && Math.hypot(c.p.x - STAND.x, c.p.z - STAND.z) < 2.2;
      if (c.atStand && !c.standDone && c.stopT <= 0) { c.stopT = 12; c.standDone = true; if (near(c.p) < 20) say('MOTH', pick(['Cab\'s here. Moth\'s Rides. One moth, one ride.', 'Anybody? Fair? Horse? Somewhere?', 'Seats are clean. Mostly seeds.']), () => c.p); }
      if (!c.atStand) c.standDone = false;
      c.spd = THREE.MathUtils.lerp(c.spd || 0, want, 1 - Math.exp(-dt * (want < (c.spd || 0) ? 4 : 1.2)));
      if (c.ram) { c.spd = 8; c.ram -= dt; const a = CARBY.cab; if (Math.abs(c.cur - a.cur) < 3.6 || c.ram <= 0) { c.ram = 0; c.spd = 0; c.stopT = 7; a.stopT = 7; a.hopV = 4; c.hopV = 3; honk(a.p); setTimeout(() => honk(a.p), 600); setTimeout(() => honk(c.p), 1300); runLines('fender', () => a.p, LINES.fender); } }
      c.cur += c.spd * dt; at(c.ln, c.cur, c.p);
      if (W && c.spd > 2) { c.p.x += Math.sin(t * 1.7 + c.ph) * 0.6; if (R() < dt * 0.05) honk(c.p); }
      // the boot car rams a waddle car
      if (level.car && level.inCar && Math.abs(level.car.v) > 3 && Math.hypot(level.car.pos.x - c.p.x, level.car.pos.z - c.p.z) < 2.6 && !(c.bonkT > 0)) { c.bonkT = 3; c.hopV = 5; c.spin = 0.5; c.stopT = 4; honk(c.p); say(c.name, 'MY WADDLE!', () => c.p); offense(2, 'rammed ' + c.id); }
      if (c.bonkT > 0) c.bonkT -= dt; c.spin *= Math.exp(-dt * 1.5);
      const v = vis(c.p); c.root.visible = v; if (v) poseCar(c, dt, t, c.spd, W);
    }
    // ---- Officer Fuzz
    cop.t += dt; const lt = cop.lights; const flash = cop.mode === 'chase';
    lt[0].visible = !flash || Math.sin(t * 14) > 0; lt[1].visible = !flash || Math.sin(t * 14) < 0;
    if (cop.mode === 'chase') {
      const tgt = cop.target === 'wolf' ? (level.inCar ? level.car.pos : wp) : CARBY[cop.target]?.p;
      const dx = tgt.x - cop.p.x, dz = tgt.z - cop.p.z, d = Math.hypot(dx, dz);
      const hidden = cop.target === 'wolf' && busy();
      if (hidden) cop.lost += dt; else if (d > 70) cop.lost += dt; else cop.lost = Math.max(0, cop.lost - dt);
      const sp = hidden ? 0 : cop.target === 'wolf' ? (level.inCar ? 11 : 7.4) : 12;
      const yaw = Math.atan2(dx, dz); cop.p.yaw += wrapA(yaw - cop.p.yaw) * Math.min(1, dt * 3); cop.v = THREE.MathUtils.lerp(cop.v, d > 3 ? sp : 0, 1 - Math.exp(-dt * 2));
      cop.p.x += Math.sin(cop.p.yaw) * cop.v * dt; cop.p.z += Math.cos(cop.p.yaw) * cop.v * dt;
      if (R() < dt * 0.4) honk(cop.p);
      if (d < 3.2) { // caught
        if (cop.target === 'wolf') { LW.fuzz = 0; cop.mode = 'return'; logEv('caught'); T.outSay?.(LINES.caught); }
        else { const c = CARBY[cop.target]; c.chased = false; c.stopT = 6; cop.mode = 'return'; runLines('chase', () => cop.p, [['OFFICER FUZZ', 'Pull over. Over. More over.'], ['THE LEMON KID', 'I was waddling within the waddle limit!'], ['OFFICER FUZZ', 'Warning. A felt one.']]); }
        renderHud();
      } else if (cop.lost > 8 || (cop.target !== 'wolf' && cop.t > 40)) { if (cop.target === 'wolf') { LW.fuzz = 1; say('OFFICER FUZZ', LINES.escape[0][1], () => cop.p); toast('You lost Officer Fuzz.'); logEv('escaped'); } else if (CARBY[cop.target]) CARBY[cop.target].chased = false; cop.mode = 'return'; renderHud(); }
    } else if (cop.mode === 'return') {
      const dx = COPHOME.x - cop.p.x, dz = COPHOME.z - cop.p.z, d = Math.hypot(dx, dz);
      if (d < 1 || !vis(cop.p) && near(COPHOME) > VIS) { Object.assign(cop.p, COPHOME); cop.v = 0; cop.mode = 'parked'; }
      else { const yaw = Math.atan2(dx, dz); cop.p.yaw += wrapA(yaw - cop.p.yaw) * Math.min(1, dt * 3); cop.v = THREE.MathUtils.lerp(cop.v, Math.min(6, d), 1 - Math.exp(-dt * 2)); cop.p.x += Math.sin(cop.p.yaw) * cop.v * dt; cop.p.z += Math.cos(cop.p.yaw) * cop.v * dt; }
    } else cop.v = 0;
    { const v = vis(cop.p); cop.root.visible = v; if (v) poseCar(cop, dt, t, cop.v, W); }
    // fuzz cools off when the Wolf behaves
    offT += dt; if (cop.mode !== 'chase' && offT > 25 && LW.fuzz > 0) { LW.fuzz = Math.max(0, LW.fuzz - 1); offT = 0; renderHud(); }
    { const show = !busy() && (LW.fuzz > 0.05 || cop.mode === 'chase'); if ((hud.style.display !== 'none') !== show) { renderHud(); if (!show) hud.style.display = 'none'; } }

    // ---- pedestrians
    const wsp = wolfState.speed || 0;
    for (const p of PEDS) {
      const g = p.root; let spd = 0;
      if (p.tumble > 0) { p.tumble -= dt; g.rotation.x = Math.sin(Math.min(1, (1.4 - p.tumble) * 3) * Math.PI / 2) * -1.3 * (p.tumble > 0.3 ? 1 : p.tumble / 0.3); }
      else if (p.chase) { const e = p.chase; const dx = e.p.x - g.position.x, dz = e.p.z - g.position.z; g.rotation.y = Math.atan2(dx, dz); spd = 3; g.position.x += Math.sin(g.rotation.y) * spd * dt; g.position.z += Math.cos(g.rotation.y) * spd * dt; }
      else if (W && R() < 0.5) { spd = 2.4; g.rotation.y += dt * 4; g.position.y = Math.abs(Math.sin(t * 6 + p.k * 9)) * 0.5; }
      else if (p.wait > 0) { p.wait -= dt; g.position.y = 0; }
      else { const [a, b] = p.path, L = Math.hypot(b[0] - a[0], b[1] - a[1]); p.k += p.dir * p.v * dt / L; if (p.k > 1 || p.k < 0) { p.k = Math.max(0, Math.min(1, p.k)); p.dir *= -1; p.wait = 1 + R() * 4; }
        const tx = a[0] + (b[0] - a[0]) * p.k, tz = a[1] + (b[1] - a[1]) * p.k; spd = p.v; g.position.set(THREE.MathUtils.lerp(g.position.x, tx, Math.min(1, dt * 3)), 0, THREE.MathUtils.lerp(g.position.z, tz, Math.min(1, dt * 3)));
        g.rotation.y = Math.atan2((b[0] - a[0]) * p.dir, (b[1] - a[1]) * p.dir); if (p.tumble <= 0) g.rotation.x = 0; }
      const d = near(g.position);
      if (!busy() && !level.inCar && d < 1.1 && wsp > 5 && p.tumble <= 0) { p.tumble = 1.4; say(p.name, pick(LINES.ped.bump)[1], () => g.position, 2.2); offense(1, 'bumped ' + p.name); }
      if (!busy() && d < 3.2 && d > 1.2 && p.talkT < t && !LW.scene) { p.talkT = t + 45; p.wait = Math.max(p.wait, 3); g.rotation.y = Math.atan2(wp.x - g.position.x, wp.z - g.position.z);
        const arc = p.owner ? 'pet' : pick(['feud', 'romance', 'pet', null, null]); const l = W ? pick(LINES.wild) : arc ? ARCS[arc].lines[LW.arcs[arc]] : pick(LINES.ped.normal);
        if (arc) seen(arc); const txt = !arc || W || !l[0] || l[0] === p.name ? l[1] : 'Word is: ' + l[1].replace(/^I /, l[0][0] + l[0].slice(1).toLowerCase() + ' ');
        say(p.name, txt, () => g.position, 2.3); }
      if (p.owner) { nanSpot.x = g.position.x; nanSpot.z = g.position.z; }
      const v = vis(g.position); g.visible = v; if (v) animPal(g, dt, spd, t);
    }

    // ---- set pieces (only animated when near)
    const sched = (k) => SCHED[k][sl];
    if (vis(DINER)) { const on = sched('diner'); animPal(dot, dt, 0, t); animPal(sal, dt, 0, t); if (on) { talkArms(dot, t); talkArms(sal, t + 1); }
      if (on && (scT.diner -= dt) <= 0 && !LW.scene) { scT.diner = 20; if (runLines('diner', DINER, LINES.diner[scI.diner++ % LINES.diner.length])) seen('romance'); } }
    if (vis(POOL)) { const on = sched('pool'); animPal(larry, dt, 0, t); animPal(reggie, dt, 0, t); if (on) { talkArms(larry, t); coin.position.y = 1.2 + Math.abs(Math.sin(t * 2.2)) * 0.9; coin.rotation.x += dt * 14; } else coin.position.y = 1.0;
      if (on && (scT.pool -= dt) <= 0 && !LW.scene) { scT.pool = 22; if (runLines('pool', POOL, LINES.pool[scI.pool++ % LINES.pool.length])) seen('romance'); } }
    if (vis(COURT)) { const on = sched('hoops'); const sh = [bear, gecko];
      sh.forEach((g, i) => { animPal(g, dt, on ? 0.6 : 0, t + i); if (on) { g.position.x = [bearAt, geckoAt][i].x + Math.sin(t * 0.7 + i * 2) * 1.2; g.rotation.y = Math.atan2(hoopAt.x - g.position.x, hoopAt.z - g.position.z); } });
      if (on) { if (!shot) { const who = sh[Math.floor(t) % 2]; shot = { t: 0, a: who.position.clone().setY(1.6), made: R() < 0.35 }; }
        shot.t += dt / 1.3; const k = Math.min(1, shot.t), end = shot.made ? new THREE.Vector3(hoopAt.x, 3.05, hoopAt.z) : new THREE.Vector3(hoopAt.x + 0.6, 3.2, hoopAt.z + 0.4);
        ball.position.lerpVectors(shot.a, end, k); ball.position.y += Math.sin(k * Math.PI) * 2.2; if (k >= 1) { if (shot.made && near(hoopAt) < 18 && !LW.scene) say('GECKO', pick(['Lucky.', 'Swish. Allegedly.', 'That one counts for me.']), hoopAt, 3.4); shot = null; }
        if ((scT.hoops -= dt) <= 0 && !LW.scene) { scT.hoops = 24; if (runLines('hoops', COURT, LINES.hoops[scI.hoops++ % LINES.hoops.length])) seen('feud'); } }
      else ball.position.set(bearAt.x + 0.4, 0.13, bearAt.z); }
    // scheduled fender-bender + chase (anywhere — the town just does this)
    if (sched('fender') && (scT.fender -= dt) <= 0) { scT.fender = 60; fender(); }
    if (sched('chase') && cop.mode === 'parked' && (scT.chase -= dt) <= 0) { scT.chase = 90; CARBY.lemon.chased = true; dispatch('lemon'); runLines('chase', () => cop.p, LINES.chase); }
    // random street events (and WILD chaos: more of them, faster)
    if (!busy() && (evT -= dt * (W ? 4 : 1)) <= 0) { evT = 35 + R() * 25; const free = Object.keys(EVENTS).filter(k => !LW.events.some(e => e.k === k)); if (free.length) startEvent(pick(free)); if (W && !LW.scene) say('SUNSPOTS', pick(LINES.wild)[1], () => wp, 2.6); }
    for (let i = LW.events.length - 1; i >= 0; i--) { const e = LW.events[i], E = EVENTS[e.k]; e.t += dt; E.tick(e, dt); if (e.t > e.dur) { e.g.visible = false; E.end?.(e); LW.events.splice(i, 1); } }
    if (W && R() < dt * 0.08 && cop.mode === 'parked') { const c = pick(CARS.filter(c => c.id !== 'cab')); c.chased = true; dispatch(c.id); }
  };

  LW.tris = tris; LW.scT = scT; LW.cop = cop; LW.offense = offense; LW.dispatch = dispatch; LW.startEvent = startEvent; LW.setArc = setArc; LW.fender = fender; LW.carry = () => carry; LW.at = { DINER, POOL, COURT, STAND, PK, hoop: hoopAt };
  LW.stats = () => ({ tris, cars: CARS.length + 1, peds: PEDS.length, actors: 7, rigs: 0, visible: G.children.filter(o => o.visible).length });
  return LW;
}
