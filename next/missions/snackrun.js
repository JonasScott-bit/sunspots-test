// next/missions/snackrun.js — LATE NIGHT SNACK RUN. Next Level rework of Level 1 "Last Minute Snacks" (Nov 15 2026).
// Scott: the snack run is a NIGHT run; the whole point is getting to the store before it closes at 2:00 AM.
//  1:40 AM at the Wolf's house (the crew on the yard couch hands over THE LIST) -> his own waddle car through town (Banana Squid
//  wants a lift at the bus stop, Officer Fuzz runs a speed check at the town edge) -> the desert road (felt cows wander across;
//  at the fork the SHORTCUT has Gecko's 2 AM yard sale, the long road has Moth's cab you can draft) -> LAST MINUTE SNACKS (the
//  neon flickers harder as 2:00 gets close, then goes dark) -> pick the list off the shelves -> drive home to the couch.
//  Lose = the sign goes dark before you get there. Win = 1-3 stars (got the snacks home / whole list right / home by 2:15) + badges.
// Self-contained: night lighting applied AFTER main.js's palette each frame (WILD still wins), its own HUD/UI, felt characters
// built from primitives (0 rigs, 0 Meshy, ~11k tris, hidden when not running). Holds the old level clock while it runs.
// main.js hooks: installSnackRun(ctx) once + SR.update(dt, t, wild) before render. Optional intro: video/snackrun_intro.mp4 via cinematic.js
// (only requested if a HEAD check finds it; HOLD TO SKIP; plays once per page load; ?nointro skips it).
// QA: ?snackrun auto-starts after the title. window.__snackrun = { start, go, quit, S, jump(m), arrive(), pick(id), checkout(), home(), shots }.
import * as THREE from 'three';
import { playCinematic, CINE } from '../cinematic.js';
import { NIGHT as BASE_NIGHT } from '../level.js';
import { folk as feltFolk, FOLK, palSpec, feltCow } from '../feltfolk.js';
import { CAST, animPal as kitAnimPal } from './kit.js';
const CREW_GLB = new Set(['bear', 'heron', 'ram', 'gecko', 'moth', 'wolf', 'lynx', 'crow', 'anteater']);   // the opening level is night too (?day = old look, QA only)   // shared clip player (TAP FOR SOUND, HOLD TO SKIP)

const SCALE = 11;                       // game seconds per real second (1:40 -> 2:00 = ~109 s of real driving)
const T0 = 6000, CLOSE = 7200, STAR_HOME = 8100;   // 1:40:00, 2:00:00, 2:15:00 (seconds after midnight)
const CAR0 = [24, 60.6, Math.PI / 2], HOME = [31, 60.4], STORE = [90, -1011.5], STORE_ARRIVE = [90, -1001];
const COUCH = [17.6, 51.2];   // Nov 16: off the East St sidewalk, in the Wolf's front yard west of the driveway
const INTRO = 'video/snackrun_intro.mp4';
const ITEMS = {
  puffs: { n: 'MOON PUFFS', s: 'BIG BAG', c: '#f3d36b', f: '#4a2a7a' },
  puffsmini: { n: 'MOON PUFFS', s: 'mini bag', c: '#f3d36b', f: '#4a2a7a', mini: 1 },
  sour: { n: 'SOUR SUNSPOTS', s: 'gummies', c: '#ff8a5c', f: '#fff3dc' },
  sweet: { n: 'SWEET SUNSPOTS', s: 'gummies', c: '#ffb0c8', f: '#7a2a4a' },
  gloop: { n: 'GLOOP COLA', s: 'warm is fine', c: '#7a3a2a', f: '#ffe7a8', can: 1 },
  gloopz: { n: 'GLOOP ZERO-ISH', s: 'mostly zero', c: '#3a3a48', f: '#e8e8f0', can: 1 },
  nacho: { n: 'NACHO NOVA', s: 'extra dust', c: '#ff9f2a', f: '#3a1a10' },
  nebula: { n: 'NACHO NEBULA', s: 'less dust', c: '#8a5ad8', f: '#ffe7a8' },
  pickle: { n: 'PICKLE CRISPS', s: 'dill-ish', c: '#8cc56a', f: '#1e3a1a' },
  cheez: { n: 'CHEEZ-NO', s: 'puffs', c: '#ffd23a', f: '#c8463f' },
  jerky: { n: 'BEEF-ISH STIX', s: 'probably', c: '#a2582e', f: '#fff3dc' },
  frosty: { n: 'FROSTY FLOP', s: 'ice cream', c: '#bfe6f2', f: '#2a4a7a', can: 1 },
};
const RAM_PICKS = [['gloop', 'GLOOP COLA. Warm is fine.'], ['jerky', 'BEEF-ISH STIX. Whatever they are.'], ['frosty', 'FROSTY FLOP. It will melt. Good.']];

export function installSnackRun(C) {
  const { scene, camera, level: L, wolfState, town: T, TS, feltMat, audio, LT } = C;
  const Q = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const R = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const A = (fn) => { try { fn(); } catch (_) { } };   // audio is optional
  const S = { on: false, phase: 'off', clock: T0, t: 0, list: [], basket: new Set(), badges: new Set(), bonks: 0, arriveAt: 0, leaveAt: 0, homeAt: 0, stars: 0, squid: false, gecko: false, fuzz: 'none', drafted: 0, won: null, heldLeft: 0, boost: 0 };
  const SR = { S, tris: 0, root: new THREE.Group() }; SR.root.name = 'snackrun'; SR.root.visible = false; scene.add(SR.root);

  // ------------------------------------------------------------ felt kit (cached materials, matte, no rigs)
  const MC = new Map(); const fm = (c) => { if (!MC.has(c)) MC.set(c, feltMat(c)); return MC.get(c); };
  const BM = new Map(); const glowM = (c, o = 1, add = false) => { const k = c + o + add; if (!BM.has(k)) BM.set(k, new THREE.MeshBasicMaterial({ color: c, transparent: o < 1 || add, opacity: o, toneMapped: false, fog: false, depthWrite: !add, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); return BM.get(k); };
  const count = (g) => { const p = g.attributes.position.count; SR.tris += g.index ? g.index.count / 3 : p / 3; return g; };
  const mesh = (geo, m, p, parent, shadow = true) => { const o = new THREE.Mesh(count(geo), typeof m === 'string' ? fm(m) : m); if (p) o.position.set(p[0], p[1], p[2]); o.castShadow = shadow; parent.add(o); return o; };
  const box = (w, h, d, m, p, parent) => mesh(new THREE.BoxGeometry(w, h, d), m, p, parent);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const board = (text, w, h, { bg = '#f2e6c8', fg = '#a2302a', font = 'bold 64px Futura, Avenir, sans-serif', glow = false, sub = null } = {}) => {
    const tex = canvasTex(512, Math.round(512 * h / w), (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = fg; g.setLineDash([10, 8]); g.lineWidth = 5; g.strokeRect(10, 10, W - 20, H - 20); }
      g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = text.split('\n');
      lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * H / (lines.length + 0.6) - (sub ? H * 0.1 : 0), W - 30));
      if (sub) { g.font = 'bold 28px Futura, Avenir, sans-serif'; g.fillText(sub, W / 2, H * 0.8, W - 30); } });
    return new THREE.Mesh(count(new THREE.PlaneGeometry(w, h)), glow ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  };
  const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const glowSprite = (c, sx, sy, o = 0.7) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.set(sx, sy, 1); return s; };

  // the cast: feltfolk.js characters (felt + clay, ref-matched, 2 LODs, 0 rigs); one-off figures go through palSpec()
  const pal = (o) => (typeof o === 'string' && CREW_GLB.has(o) ? CAST[o]() : feltFolk(typeof o === 'string' ? FOLK[o] : palSpec(o)));   // Nov 16: the real crew are their GLBs
  const animPal = (g, dt, t, o = {}) => kitAnimPal(g, dt, t, o);
  const at = (o, x, z, yaw = 0, parent = SR.root) => { o.position.set(x, 0, z); o.rotation.y = yaw; parent.add(o); return o; };
  const face = (o, x, z) => { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); };

  // ------------------------------------------------------------ world: places along the route
  const MAIN = L.MAIN, SHORT = L.SHORT;
  const dIdx = (road, x, z) => { let b = 0, bd = 1e18; road.s.forEach((v, i) => { const d = (v.x - x) ** 2 + (v.z - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
  const D0 = MAIN.cum[dIdx(MAIN, 44, 3)];                 // where Main St becomes the desert road
  const onRoad = (road, d, off = 0) => L.atDist(road, clamp(d, 0, road.len), off);

  // the crew on the Wolf's yard couch (models/cast/diner_couch is already there)
  const crew = {
    bear: pal('bear'), heron: pal('heron'), ram: pal('ram'),
  };
  at(crew.bear, COUCH[0] - 1.9, COUCH[1] + 1.7, 0.25); at(crew.heron, COUCH[0], COUCH[1] + 2.1, 0); at(crew.ram, COUCH[0] + 1.9, COUCH[1] + 1.7, -0.25);
  const squidPal = at(pal('squid'), 33.2, -0.6, Math.PI);   // Banana Squid, MAIN ST bus stop
  const squidHome = at(pal('squid'), COUCH[0] + 3.6, COUCH[1] + 1.5, -0.5); squidHome.visible = false;
  // Officer Fuzz's speed check at the town edge (a clipboard and a stopwatch; nothing else)
  const fz = onRoad(MAIN, D0 + 52, 6.2), fuzzPal = at(pal('fuzz'), fz.x, fz.z, fz.yaw - Math.PI / 2);
  { const cb = box(0.3, 0.4, 0.04, '#f2e6c8', [0, -0.25, 0.08], fuzzPal.userData.arms[0]); void cb; }
  const fzs = onRoad(MAIN, D0 + 8, 5.4), fuzzSign = new THREE.Group(); at(fuzzSign, fzs.x, fzs.z, fzs.yaw + Math.PI);
  { const b = board('SPEED CHECK\nAHEAD', 2.0, 1.3, { bg: '#ffe7a8', fg: '#24324e', sub: 'OFFICER FUZZ IS WATCHING · 15' }); b.position.set(0, 1.5, 0); fuzzSign.add(b);
    for (const sx of [-0.8, 0.8]) box(0.08, 1.4, 0.08, '#6a5446', [sx, 0.7, -0.05], fuzzSign); }
  const FUZZ_D = D0 + 52;
  // felt cows that wander across the long road (obstacles: bonk = lose speed)
  const cows = [];
  { let seed = 0;   // Nov 16: sculpted felt-and-clay cows (feltfolk.js feltCow) instead of BoxGeometry blocks; they walk, stop and graze
    for (const [dd, n] of [[D0 + 230, 3], [D0 + 800, 2]]) { const r = onRoad(MAIN, dd);
      for (let i = 0; i < n; i++) { const g = feltCow({ seed: seed++ }); at(g, r.x, r.z, r.yaw + Math.PI / 2); cows.push({ g, cx: r.x, cz: r.z, yaw: r.yaw, ph: i * 1.7 + dd * 0.01, lane: (i - (n - 1) / 2) * 3.0, hitT: 0, lx: null }); } } }
  // tumbleweeds rolling across near the store
  const tumbles = [];
  for (const dd of [MAIN.len - 170, MAIN.len - 95]) { const r = onRoad(MAIN, dd); const g = new THREE.Group(); mesh(new THREE.IcosahedronGeometry(0.7, 1), new THREE.MeshStandardMaterial({ color: '#a07440', roughness: 1, wireframe: true }), [0, 0.7, 0], g); at(g, r.x, r.z); tumbles.push({ g, r, ph: R() * 6, hitT: 0 }); }
  // ROAD WORK on the shortcut (from the design pass): sawhorses + blinking amber lamps block one half; squeeze past or bonk
  const works = [];
  if (!BASE_NIGHT) for (const frac of [0.24, 0.84]) { const r = onRoad(SHORT, SHORT.len * frac, SHORT.w * 0.22), g = new THREE.Group(); at(g, r.x, r.z, r.yaw);   // (night level.js already builds these; reuse)
    for (const sx of [-1.0, 0, 1.0]) { box(0.95, 0.22, 0.08, '#f2e6c8', [sx, 0.95, 0], g); box(0.3, 0.2, 0.09, '#e0702a', [sx, 0.95, 0.01], g); for (const lx of [-0.4, 0.4]) box(0.07, 0.95, 0.07, '#f2e6c8', [sx + lx, 0.47, 0], g); }
    const lamps = [-1.2, 1.2].map((sx) => mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb02a', toneMapped: false }), [sx, 1.18, 0], g, false));
    const sg = board('ROAD WORK\n(NOBODY WORKING)', 1.8, 0.9, { bg: '#ffb02a', fg: '#2a2326', font: 'bold 56px Futura, Avenir, sans-serif' }); sg.position.set(0, 1.75, -0.06); sg.rotation.y = Math.PI; g.add(sg); const sg2 = sg.clone(); sg2.rotation.y = 0; sg2.position.z = 0.06; g.add(sg2);
    works.push({ x: r.x, z: r.z, yaw: r.yaw, lamps }); }
  // Gecko's 2 AM yard sale on the SHORTCUT
  const gk = onRoad(SHORT, SHORT.len * 0.42, 6.5), gecko = new THREE.Group(); at(gecko, gk.x, gk.z, gk.yaw - Math.PI / 2);
  const geckoPal = pal('gecko'); geckoPal.position.set(0.9, 0, -0.6); gecko.add(geckoPal);
  box(2.2, 0.08, 0.9, '#c49a6a', [-0.6, 0.78, 0.4], gecko); for (const [lx, lz] of [[-1.6, 0], [0.4, 0], [-1.6, 0.8], [0.4, 0.8]]) box(0.07, 0.78, 0.07, '#8a6a4a', [lx, 0.39, lz], gecko);
  box(0.4, 0.3, 0.3, '#e8a0b0', [-1.2, 0.97, 0.4], gecko); box(0.3, 0.5, 0.3, '#8ab0d8', [-0.5, 1.07, 0.4], gecko); mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 10), '#f2d64a', [0.1, 1.0, 0.4], gecko);
  mesh(new THREE.SphereGeometry(0.12, 8, 6), glowM('#ffd27a'), [-0.1, 1.0, 0.7], gecko, false); { const s = glowSprite('#ffb44a', 3, 3, 0.8); s.position.set(-0.1, 1.1, 0.7); gecko.add(s); }
  { const b = board('YARD SALE\n2 AM', 1.6, 1.0, { bg: '#f2e6c8', fg: '#3f6f52', sub: 'EVERYTHING 1¢' }); b.position.set(-0.6, 1.6, 0.9); gecko.add(b); }
  const GECKO_D = SHORT.len * 0.42;
  // Moth's cab, idling on the long road; pulls out and lets you draft it
  const cab = new THREE.Group(), cabBody = new THREE.Group(); cab.add(cabBody);
  { const b = mesh(new THREE.CapsuleGeometry(0.62, 2.1, 2, 10), '#f2c53a', [0, 0.72, 0], cabBody); b.rotation.x = Math.PI / 2; b.scale.set(1.25, 1, 0.8);
    mesh(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f2ece0', [0, 1.05, -0.25], cabBody).scale.set(1.15, 0.9, 1.35);
    for (const [wx, wz] of [[-0.7, 0.9], [0.7, 0.9], [-0.7, -0.9], [0.7, -0.9]]) mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), '#2a2326', [wx, 0.32, wz], cabBody).rotation.z = Math.PI / 2;
    const sg = board("MOTH'S\nRIDES", 0.9, 0.42, { bg: '#2a2326', fg: '#ffe7a8', glow: true }); sg.position.set(0, 1.82, -0.2); cabBody.add(sg); const sg2 = sg.clone(); sg2.rotation.y = Math.PI; sg2.position.z = -0.21; cabBody.add(sg2);
    const mothPal = pal('moth'); mothPal.scale.setScalar(0.6); mothPal.userData.shadow.visible = false; mothPal.position.set(0, 0.55, -0.25); cabBody.add(mothPal);
    for (const sx of [-0.45, 0.45]) { mesh(new THREE.SphereGeometry(0.1, 8, 6), glowM('#fff2c0'), [sx, 0.78, 1.55], cabBody, false); mesh(new THREE.SphereGeometry(0.08, 6, 4), glowM('#ff4a3a'), [sx, 0.78, -1.55], cabBody, false); }
    const tl = glowSprite('#ff5a3a', 3.2, 1.6, 0.55); tl.position.set(0, 0.8, -1.9); cabBody.add(tl); }
  const MOTH_D0 = MAIN.cum[dIdx(MAIN, 60, -470)] + 30;   // waits just past where the shortcut rejoins... no: on the long road before the rejoin
  const MOTH_START = D0 + 430; const mothR = { d: MOTH_START, v: 0, state: 'wait', said: false };
  void MOTH_D0; SR.moth = mothR;
  // LAST MINUTE SNACKS neon: two words that flicker on their own, an OPEN/CLOSED sign, a beam you can see from town
  const neon = new THREE.Group(); at(neon, STORE[0] - 1.0, STORE[1] + 0.35, 0, BASE_NIGHT ? scene : SR.root);   // the sign is always on at night (the opening run sees it too)
  const neonTex = (txt, col) => canvasTex(1024, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.font = 'bold 150px Futura, Avenir, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = col; g.shadowBlur = 48; g.strokeStyle = col; g.lineWidth = 22; g.strokeText(txt, W / 2, H / 2, W - 60); g.strokeText(txt, W / 2, H / 2, W - 60);
    g.shadowBlur = 12; g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText(txt, W / 2, H / 2, W - 60); g.shadowBlur = 0; g.fillStyle = col; g.fillText(txt, W / 2, H / 2, W - 60); });
  const backer = box(12.4, 3.6, 0.25, '#2b1630', [0, 7.4, 0], neon); void backer;
  for (const sx of [-5.4, 5.4]) box(0.2, 2.2, 0.2, '#3a3030', [sx, 5.0, -0.1], neon);
  const nm = (t, c) => new THREE.MeshBasicMaterial({ map: neonTex(t, c), transparent: true, toneMapped: false, fog: false, depthWrite: false });
  const neonA = mesh(new THREE.PlaneGeometry(11.8, 1.85), nm('LAST MINUTE', '#ff5fb4'), [0, 8.2, 0.14], neon, false);
  const neonB = mesh(new THREE.PlaneGeometry(11.8, 1.85), nm('SNACKS', '#ffb02a'), [0, 6.55, 0.14], neon, false);
  const openM = nm('OPEN TILL 2', '#5af0c8'), closedM = nm('CLOSED', '#ff3a3a');
  const openS = mesh(new THREE.PlaneGeometry(2.8, 0.7), openM, [3.4, 2.6, 0.2], neon, false);
  const neonGlow = glowSprite('#ff6ab8', 22, 9, 0.6); neonGlow.position.set(0, 7.4, 0.6); neon.add(neonGlow);
  { const lot = new THREE.Mesh(count(new THREE.CircleGeometry(15, 24)), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ff9ac8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); lot.rotation.x = -Math.PI / 2; lot.position.set(1, 0.08, 9); neon.add(lot); SR.lot = lot;
    const door = glowSprite('#ffe0a0', 5, 6, 0.75); door.position.set(1.0, 1.6, 0.6); neon.add(door); SR.door = door; }
  const beam = mesh(new THREE.CylinderGeometry(1.2, 2.4, 160, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ff7ac0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), [0, 88, -4], neon, false);
  // home: porch beam + the crew's couch glow
  const homeBeam = mesh(new THREE.CylinderGeometry(0.8, 1.6, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#7ad8ff', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), [HOME[0], 30, HOME[1] - 4], SR.root, false);
  // road reflectors every 28 m on both edges (one InstancedMesh for posts, one glowing for the caps)
  { const pts = []; for (const road of [MAIN, SHORT]) for (let d = (road === MAIN ? D0 : 0); d < road.len - 10; d += 28) for (const sd of [-1, 1]) { const r = onRoad(road, d, sd * (road.w / 2 + 1.2)); pts.push(r); }
    const pg = count(new THREE.BoxGeometry(0.12, 0.9, 0.12)), cg = count(new THREE.BoxGeometry(0.14, 0.16, 0.14)); SR.tris += (pts.length - 1) * 24;
    const posts = new THREE.InstancedMesh(pg, fm('#f2e6c8'), pts.length), caps = new THREE.InstancedMesh(cg, glowM('#ffb02a'), pts.length), m4 = new THREE.Matrix4();
    pts.forEach((p, i) => { m4.makeTranslation(p.x, 0.45, p.z); posts.setMatrixAt(i, m4); m4.makeTranslation(p.x, 0.95, p.z); caps.setMatrixAt(i, m4); }); SR.root.add(posts, caps); }
  // streetlamp glow + warm light pools on Main St (the town's own lamp models; glow only at night)
  const lampGlow = new THREE.Group(); (BASE_NIGHT ? scene : SR.root).add(lampGlow);   // streetlamps glow all night
  { const lamps = (TS?.props || []).filter((p) => p[0] === 'lamp'); const pool = count(new THREE.CircleGeometry(4.2, 20)); SR.tris += lamps.length * 20;
    const poolM = new THREE.MeshBasicMaterial({ map: glowTex, color: '#ffc27a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (const p of lamps) { const s = glowSprite('#ffd08a', 2.6, 2.6, 0.9); s.position.set(p[1], 4.15, p[2]); lampGlow.add(s); const c = new THREE.Mesh(pool, poolM); c.rotation.x = -Math.PI / 2; c.position.set(p[1], 0.06, p[2]); lampGlow.add(c); } }
  // headlights: one spotlight + a soft additive pool on the road, parented to the Wolf's own car while the run is on
  const head = new THREE.Group(); const spot = new THREE.SpotLight('#fff0c8', 0, 48, 0.55, 0.7, 1.2); spot.position.set(0, 1.0, 1.4); spot.target.position.set(0, 0, 14); head.add(spot, spot.target);
  const hpool = new THREE.Mesh(count(new THREE.PlaneGeometry(7, 16)), new THREE.MeshBasicMaterial({ map: glowTex, color: '#fff0c0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); hpool.rotation.x = -Math.PI / 2; hpool.position.set(0, 0.07, 9.5); head.add(hpool);
  for (const sx of [-0.42, 0.42]) { const s = glowSprite('#fff6d8', 1.1, 1.1, 0.95); s.position.set(sx, 0.75, 1.7); head.add(s); }
  let lightsAdded = false;

  // ------------------------------------------------------------ night look (after main.js sets the day palette each frame)
  const NIGHT = { sky: new THREE.Color('#121640'), fog: new THREE.Color('#171b46'), ground: new THREE.Color('#4a3050'), hemi: new THREE.Color('#6a76c0'), hemiG: new THREE.Color('#2e2238'), key: new THREE.Color('#b8c6ff'), sun: new THREE.Color('#f1ecd2') };
  let nightK = 0, saved = null;
  function applyNight(dt, wild) {
    const want = S.on ? 1 : 0; nightK = clamp(nightK + (want - nightK) * Math.min(1, dt * 2.5), 0, 1); if (Math.abs(nightK - want) < 0.002) nightK = want;
    if (nightK <= 0) { if (saved) { scene.fog.near = saved.near; scene.fog.far = saved.far; LT.hemi.intensity = saved.hemiI; saved = null; } return; }
    if (!saved) saved = { near: scene.fog.near, far: scene.fog.far, hemiI: LT.hemi.intensity };
    const k = nightK * (1 - wild * 0.85);
    scene.background.lerp(NIGHT.sky, k); scene.fog.color.lerp(NIGHT.fog, k); scene.fog.near = lerp(saved.near, 28, k); scene.fog.far = lerp(saved.far, 230, k);
    LT.groundMat.color.lerp(NIGHT.ground, k); LT.hemi.color.lerp(NIGHT.hemi, k); LT.hemi.groundColor.lerp(NIGHT.hemiG, k); LT.hemi.intensity = lerp(saved.hemiI, 0.72, k);
    LT.key.color.lerp(NIGHT.key, k); LT.key.intensity = lerp(LT.key.intensity, 0.55, k); if (LT.fill) LT.fill.intensity = lerp(LT.fill.intensity, 0.26, k);
    LT.discMat?.color.lerp(NIGHT.sun, k); LT.lidMat?.color.copy(LT.discMat.color).multiplyScalar(0.9); if (LT.halo) { LT.halo.material.color.lerp(NIGHT.sun, k); LT.halo.material.opacity = lerp(LT.halo.material.opacity, 0.45, k); }
    if (!BASE_NIGHT) lampGlow.visible = k > 0.2; if (!BASE_NIGHT) for (const c of lampGlow.children) if (c.material.opacity != null) c.material.opacity = (c.isSprite ? 0.9 : 0.55) * k;
  }

  // ------------------------------------------------------------ UI (felt cards, big phone buttons)
  const css = document.createElement('style'); css.id = 'srCss';
  css.textContent = `
  #srBtn{position:fixed;z-index:8;left:calc(env(safe-area-inset-left) + 12px);bottom:calc(env(safe-area-inset-bottom) + 132px);min-height:48px;padding:0 16px;border:0;border-radius:24px;background:#2b1e46e6;color:#ffe1a8;font:800 12px Futura,Avenir,system-ui,sans-serif;letter-spacing:.14em;box-shadow:inset 0 0 0 2px #ff9ad288,0 3px 0 #120a1e;display:none;-webkit-tap-highlight-color:transparent}
  #srBtn b{color:#ff9ad2} @media (orientation:portrait){#srBtn{bottom:auto;top:calc(env(safe-area-inset-top) + 118px);min-height:40px;font-size:12px}}   /* Nov 16: never over the Wolf in portrait */
  body.room #srBtn,body.scene #srBtn,body.driving #srBtn,body.ended #srBtn,body.snackrun #srBtn{display:none!important}
  body.snackrun #townObj,body.snackrun #title{display:none!important}
  #srHud{position:fixed;z-index:6;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 8px);display:none;flex-direction:column;align-items:center;pointer-events:none;color:#ffe9d0;font-family:Futura,Avenir,system-ui,sans-serif;text-shadow:0 2px 0 #0008}
  body.snackrun #srHud{display:flex}
  #srArrow{width:44px;height:44px;margin-top:4px;transition:transform .15s linear;filter:drop-shadow(0 2px 0 #0008)}
  #srList{position:fixed;z-index:6;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 146px);display:none;background:#f2e6c8ee;color:#3a2418;border-radius:12px;padding:5px 9px;font:700 9px Futura,Avenir,system-ui,sans-serif;letter-spacing:.08em;line-height:1.5;box-shadow:inset 0 0 0 2px #a2302a55;pointer-events:none;max-width:42vw}
  body.snackrun #srList{display:block} body.snackrun.srShop #srList{display:none}
  @media (orientation:landscape) and (max-height:520px){#srList{left:calc(50% + 34px);top:calc(env(safe-area-inset-top) + 8px);max-width:26vw}}
  #srList h4{margin:0 0 2px;font-size:10px;color:#a2302a;letter-spacing:.2em} #srList .ok{opacity:.45;text-decoration:line-through}
  #srAsk{position:fixed;z-index:12;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 96px);display:none;flex-direction:column;align-items:center;gap:8px;background:#2b1e46ee;color:#ffe9d0;border-radius:18px;padding:10px 14px;font:700 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.06em;text-align:center;max-width:86vw;box-shadow:inset 0 0 0 2px #ffe1a855}
  #srAsk.on{display:flex} #srAsk .row{display:flex;gap:10px} #srAsk button,.srBig{min-height:52px;min-width:120px;padding:0 16px;border:0;border-radius:26px;font:800 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.1em;color:#2b1e46;background:#ffe1a8;-webkit-tap-highlight-color:transparent;box-shadow:0 3px 0 #0006}
  #srAsk button.no,.srBig.no{background:#4a3a66;color:#ffe1a8}
  #srCard{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:#0c0a22cc;color:#ffe9d0;font-family:Futura,Avenir,system-ui,sans-serif;text-align:center;padding:16px}
  #srCard.on{display:flex} #srCard .in{max-width:520px;width:100%;background:#2b1e46;border-radius:22px;padding:18px 18px 16px;box-shadow:inset 0 0 0 3px #ff9ad255,0 6px 0 #0008;max-height:92vh;overflow:auto}
  #srCard h1{margin:0;font-size:22px;letter-spacing:.18em;color:#ff9ad2} #srCard h2{margin:4px 0 10px;font-size:12px;letter-spacing:.24em;color:#ffe1a8;opacity:.85}
  #srCard p{margin:6px 0;font-size:13px;line-height:1.45;letter-spacing:.03em} #srCard .stars{font-size:44px;letter-spacing:.12em;color:#ffd23a;text-shadow:0 3px 0 #0008} #srCard .stars i{color:#5a4a7a;font-style:normal}
  #srCard .badges{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0} #srCard .badges span{background:#f2e6c8;color:#3a2418;border-radius:12px;padding:4px 9px;font-size:10px;font-weight:800;letter-spacing:.1em}
  #srCard .row{display:flex;gap:10px;justify-content:center;margin-top:12px;flex-wrap:wrap} #srCard ul{list-style:none;padding:0;margin:8px 0;font-size:12px;line-height:1.7;letter-spacing:.06em} #srCard ul b{color:#ff9ad2}
  #srShop{position:fixed;inset:0;z-index:30;display:none;flex-direction:column;background:linear-gradient(#2a2238f2,#1a1428f6);color:#ffe9d0;font-family:Futura,Avenir,system-ui,sans-serif;padding:calc(env(safe-area-inset-top) + 8px) 10px calc(env(safe-area-inset-bottom) + 10px)}
  body.srShop #srShop{display:flex}
  #srShop .top{display:flex;justify-content:space-between;align-items:center;gap:8px} #srShop .top h3{margin:0;font-size:14px;letter-spacing:.2em;color:#ff9ad2} #srShop .clk{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}
  #srShop .clk.late{color:#ff8a8a;animation:srp .5s ease-in-out infinite alternate} @keyframes srp{to{opacity:.4}}
  #srShop .say{font-size:11px;letter-spacing:.08em;opacity:.85;margin:4px 0 6px;min-height:15px}
  #srShop .need{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px} #srShop .need span{background:#f2e6c8;color:#3a2418;border-radius:10px;padding:3px 8px;font-size:10px;font-weight:800;letter-spacing:.06em} #srShop .need span.ok{background:#8cc56a}
  #srShop .shelf{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-content:center;background:repeating-linear-gradient(#0000 0 calc(33.3% - 8px),#6a4a3a 0 33.3%);padding:6px;border-radius:12px;min-height:0}
  @media (orientation:portrait){#srShop .shelf{grid-template-columns:repeat(3,1fr);background:repeating-linear-gradient(#0000 0 calc(25% - 8px),#6a4a3a 0 25%)}}
  .srBag{position:relative;border:0;border-radius:14px 14px 10px 10px;min-height:62px;padding:8px 4px 6px;font:800 11px Futura,Avenir,system-ui,sans-serif;letter-spacing:.04em;line-height:1.15;box-shadow:inset 0 0 0 2px #0002,inset 0 0 0 5px #fff3,0 4px 0 #0006;-webkit-tap-highlight-color:transparent;transition:transform .1s}
  .srBag:before{content:'';position:absolute;left:8%;right:8%;top:3px;border-top:2px dashed #fff8}
  .srBag small{display:block;font-size:9px;font-weight:700;opacity:.8;letter-spacing:.08em;margin-top:2px} .srBag.can{border-radius:20px} .srBag.mini{transform:scale(.86)}
  .srBag.in{transform:translateY(-4px) rotate(-3deg);outline:4px solid #8cf0b8;outline-offset:2px} .srBag.in:after{content:'✓';position:absolute;right:6px;top:2px;font-size:16px;color:#1e3a1a;background:#8cf0b8;border-radius:50%;width:22px;height:22px;line-height:22px}
  #srShop .bot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px} #srShop .bot .n{font-size:11px;letter-spacing:.12em;opacity:.85}
  #srFade{position:fixed;inset:0;z-index:45;background:#0a0818;opacity:0;pointer-events:none;transition:opacity .45s}
  `;
  document.head.appendChild(css);
  const el = (tag, id, html = '') => { const e = document.createElement(tag); if (id) e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
  const btn = el('button', 'srBtn', '🌙 <b>LATE NIGHT</b> SNACK RUN');
  const hudEl = el('div', 'srHud', '<svg id="srArrow" viewBox="0 0 44 44"><path d="M22 3 L36 34 L22 27 L8 34 Z" fill="#ffe1a8" stroke="#2b1e46" stroke-width="3" stroke-linejoin="round"/></svg>');
  const arrow = hudEl.querySelector('#srArrow');
  const listEl = el('div', 'srList'); const ask = el('div', 'srAsk'); const card = el('div', 'srCard'); const shop = el('div', 'srShop'); const fade = el('div', 'srFade');
  const clockEl = $('clk'), subEl = $('clkSub'), objEl = $('obj'), distEl = $('dist');
  // Sunspots: a win = LAST MINUTE SNACKS (journal.js 'snacks', same as the opening level); ★★★ and the Squid lift add one each (kit.js-style S.msn ids)
  const SR_SUNS = [{ id: 'sr_star', name: 'SNACK RUN ★★★', how: 'Late Night Snack Run: the whole list, home by 2:15' }, { id: 'sr_squid', name: 'ONE MORE FOR THE COUCH', how: 'Late Night Snack Run: give Banana Squid a lift from the bus stop' }];
  { const X = (window.__jnX ||= { start: {}, plain: {}, suns: [], night: {} }); for (const s of SR_SUNS) if (!X.suns.some((o) => o.id === s.id)) X.suns.push({ ...s, got: () => !!(window.__town?.state?.msn || {})[s.id] }); }
  const townS = () => (T || window.__town)?.state;
  const fmt = (g) => { g = Math.floor(g); const h = Math.floor(g / 3600), m = Math.floor(g / 60) % 60; return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')} AM`; };
  const fmtS = (g) => { g = Math.floor(g); const h = Math.floor(g / 3600), m = Math.floor(g / 60) % 60, s = g % 60; return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} AM`; };
  const toast = (m, s = 2.6) => L.toast?.(m, s);
  const bubble = (who, text, p, h = 2.4) => A(() => T?.bubble?.(who, text, p, h));
  const fadeTo = (o) => new Promise((r) => { fade.style.opacity = o; setTimeout(r, 470); });
  btn.addEventListener('click', (e) => { e.stopPropagation(); start(); });
  for (const e of [btn, ask, card, shop]) e.addEventListener('pointerdown', (ev) => ev.stopPropagation());

  function renderList() {
    listEl.innerHTML = '<h4>THE LIST</h4>' + S.list.map(([who, id]) => `<div class="${S.basket.has(id) ? 'ok' : ''}">${who} · ${ITEMS[id].n}${id === 'puffs' ? ' (BIG)' : ''}</div>`).join('');
  }
  let askCb = null, askKey = null;
  function askShow(key, html, yes, no, cbYes, cbNo) {
    if (askKey === key) return; askKey = key; askCb = { cbYes, cbNo };
    ask.innerHTML = `<div>${html}</div><div class="row"><button class="yes">${yes}</button><button class="no">${no}</button></div>`; ask.classList.add('on'); A(() => audio.ui('tick'));
    ask.querySelector('.yes').onclick = () => { const c = askCb; askHide(); A(() => audio.ui('confirm')); c?.cbYes?.(); };
    ask.querySelector('.no').onclick = () => { const c = askCb; askHide(); c?.cbNo?.(); };
  }
  function askHide(key) { if (key && askKey !== key) return; ask.classList.remove('on'); askKey = null; askCb = null; }

  // ------------------------------------------------------------ intro clip (optional; skippable)
  async function playIntro() {
    if (Q.has('nointro') || SR.introSeen) return false;
    let ok = false; try { const r = await fetch(INTRO, { method: 'HEAD', cache: 'no-store' }); ok = r.ok && !/text\/html/.test(r.headers.get('content-type') || ''); } catch (_) { }
    if (!ok) return false; SR.introSeen = true;
    CINE.snackrun_intro ||= { src: INTRO, title: 'LATE NIGHT SNACK RUN' };
    const r = await playCinematic('snackrun_intro'); return !!r?.played;
  }

  // ------------------------------------------------------------ run flow
  const okToStart = () => L.mode === 'walk' && !L.ended && !L.frozen && !T?.active && !window.__titleUp && !document.body.classList.contains('scene') && !S.on;
  async function start() {
    if (S.on) return; if (!okToStart()) { toast('Finish what you are doing first.', 2); return; }
    A(() => audio.ui('confirm'));
    await playIntro();
    await fadeTo(1);
    S.heldLeft = L.left; S.subText = subEl?.textContent || ''; S.on = true; S.phase = 'brief'; S.clock = T0; S.t = 0; S.basket.clear(); S.badges.clear(); S.bonks = 0; S.squid = false; S.gecko = false; S.fuzz = 'none'; S.drafted = 0; S.won = null; S.boost = 0;
    S.arriveAt = S.leaveAt = S.homeAt = 0; S.closedShown = false; S.forkSaid = false; S.mothSaid = false; S.fuzzStop = 0; S.fuzzNear = false; S.fuzzSped = false; S.late2 = false; S.right = 0; S.wrong = 0; S.listOK = false; L.frozen = false;
    const ram = RAM_PICKS[Math.floor(R() * RAM_PICKS.length)];
    S.list = [['BEAR', 'puffs', 'MOON PUFFS — the BIG bag'], ['HERON', 'sour', 'SOUR SUNSPOTS. Not sweet.'], ['RAM', ram[0], ram[1]], ['WOLF', 'nacho', 'NACHO NOVA. Extra dust.']];
    document.body.classList.add('snackrun'); SR.root.visible = true; squidPal.visible = true; squidHome.visible = false; S.cars = 0;
    if (!lightsAdded && !BASE_NIGHT) { lightsAdded = true; L.free.root.add(head); }   // night level.js already has headlights
    head.visible = true; spot.intensity = 0;
    mothR.d = MOTH_START; mothR.v = 0; mothR.state = 'wait'; placeCab();
    L.parkFree(...CAR0); wolfState.pos.set(CAR0[0] - 1.2, 0, CAR0[1] - 2.4); wolfState.yaw = Math.PI / 2; wolfState.speed = 0; C.snap?.();
    renderList(); setTimeout(() => fadeTo(0), 120);
    card.innerHTML = `<div class="in"><h1>LATE NIGHT SNACK RUN</h1><h2>1:40 AM · LAST MINUTE SNACKS CLOSES AT 2:00</h2>
      <p>The crew is on the couch. Somebody said “snacks.” Nobody moved. Then everybody looked at the Wolf.</p>
      <ul>${S.list.map(([w, , t]) => `<li><b>${w}</b> · ${t}</li>`).join('')}</ul>
      <p style="opacity:.8;font-size:11px">Drive to the store (40 mi. north, apparently 1 km). Shortcut at the fork. Watch for cows. Officer Fuzz is timing people.</p>
      <div class="row"><button class="srBig go">GO ▸</button><button class="srBig no quit">NOT NOW</button></div></div>`;
    card.classList.add('on');
    card.querySelector('.go').onclick = () => go(); card.querySelector('.quit').onclick = () => quit();
    bubble('BEAR', 'Big bag. The BIG bag.', () => crew.bear.position, 2.6);
  }
  function go() {
    if (!S.on || S.phase !== 'brief') return; card.classList.remove('on'); A(() => audio.ui('confirm'));
    L.enterFree(); S.phase = 'go'; S.t = 0; spot.intensity = 26; toast('1:40 AM. Twenty minutes. Go.', 2.4);
  }
  function quit() {
    card.classList.remove('on'); askHide(); document.body.classList.remove('srShop');
    if (!S.on) return; const wasFar = L.solo && TS && !TS.inTown(L.free.pos.x, L.free.pos.z, 4);
    const finishQuit = () => { if (L.solo) { L.free.v = 0; L.exitCar(); } if (subEl) subEl.textContent = S.subText; clockEl?.classList.remove('late'); S.on = false; S.phase = 'off'; L.left = S.heldLeft; L.frozen = false; document.body.classList.remove('snackrun'); spot.intensity = 0; head.visible = false; setTimeout(() => { if (!S.on) SR.root.visible = false; }, 600); };
    if (wasFar) { fadeTo(1).then(() => { L.free.v = 0; L.parkFree(...CAR0); C.snap?.(); finishQuit(); setTimeout(() => fadeTo(0), 150); }); } else finishQuit();
  }
  SR.start = start; SR.go = go; SR.quit = quit;

  // shopping (2D felt shelf; the clock keeps running; at 2:00 the clerk rings up whatever is in your paws)
  const CLERK = ['The clerk is mopping toward you. Slowly. Like a threat.', 'CLERK: Take your time. You have none.', 'CLERK: The bags are where the bags are.', 'CLERK: We close at two. Not two-oh-one.', 'The clerk turns off aisle two. You were not in aisle two.'];
  function openShop() {
    S.phase = 'shop'; S.arriveAt = S.clock; L.frozen = true; L.free.v = 0; askHide(); document.body.classList.add('srShop'); A(() => audio.ev('mus_store_arrive'));
    const ids = Object.keys(ITEMS).sort(() => R() - 0.5);
    shop.innerHTML = `<div class="top"><h3>LAST MINUTE SNACKS</h3><div class="clk"></div></div><div class="say">${CLERK[0]}</div><div class="need"></div>
      <div class="shelf">${ids.map((id) => { const it = ITEMS[id]; return `<button class="srBag${it.can ? ' can' : ''}${it.mini ? ' mini' : ''}" data-id="${id}" style="background:${it.c};color:${it.f}">${it.n}<small>${it.s}</small></button>`; }).join('')}</div>
      <div class="bot"><div class="n">TAP TO GRAB · TAP AGAIN TO PUT BACK</div><button class="srBig out">CHECK OUT ▸</button></div>`;
    shop.querySelectorAll('.srBag').forEach((b) => b.onclick = () => { const id = b.dataset.id; if (S.basket.has(id)) S.basket.delete(id); else S.basket.add(id); b.classList.toggle('in', S.basket.has(id)); A(() => audio.ui('tick')); renderNeed(); });
    shop.querySelector('.out').onclick = () => checkout(false);
    renderNeed(); S.clerkT = 0; S.clerkI = 0;
  }
  function renderNeed() { const n = shop.querySelector('.need'); if (n) n.innerHTML = S.list.map(([w, id]) => `<span class="${S.basket.has(id) ? 'ok' : ''}">${w}: ${ITEMS[id].n}${id === 'puffs' ? ' (BIG)' : ''}</span>`).join(''); renderList(); }
  function checkout(forced) {
    if (S.phase !== 'shop') return; S.phase = 'leaving'; S.leaveAt = S.clock; document.body.classList.remove('srShop');
    const need = S.list.map(([, id]) => id), got = [...S.basket], right = need.filter((id) => S.basket.has(id)).length, wrong = got.filter((id) => !need.includes(id)).length;
    S.right = right; S.wrong = wrong; S.listOK = right === need.length && wrong === 0;
    toast(forced ? 'CLERK: It is two. Whatever is in your paws.' : S.listOK ? 'CLERK: That is a correct amount of snacks.' : got.length ? 'CLERK: Interesting choices. Bag?' : 'CLERK: You bought nothing. Bold.', 3);
    fadeTo(1).then(() => { const r = onRoad(MAIN, MAIN.len - 30); L.free.v = 0; L.parkFree(r.x, r.z, r.yaw + Math.PI); C.snap?.(); L.frozen = false; S.phase = 'home'; renderList(); setTimeout(() => fadeTo(0), 150);
      setTimeout(() => toast('Now home. The crew is not getting any less hungry.', 2.6), 700); });
  }
  SR.pick = (id) => { const b = shop.querySelector(`[data-id="${id}"]`); if (b) b.click(); };
  SR.checkout = () => checkout(false);

  function lose() {
    if (S.phase !== 'go') return; S.phase = 'end'; S.won = false; L.frozen = true; L.free.v = 0; askHide(); A(() => { audio.ev('finish', { won: false }); audio.stingDone = false; });
    showEnd(false);
  }
  function win() {
    S.phase = 'end'; S.won = true; S.homeAt = S.clock; L.free.v = 0; askHide();
    S.stars = 1 + (S.listOK ? 1 : 0) + (S.homeAt <= STAR_HOME ? 1 : 0);
    if (!S.bonks) S.badges.add('NO BONKS');
    { const st = townS(); S.gotSuns = []; if (st) { st.msn ||= {}; if (!st.snacks) { st.snacks = 1; S.gotSuns.push('LAST MINUTE SNACKS'); } if (S.stars === 3 && !st.msn.sr_star) { st.msn.sr_star = 1; S.gotSuns.push(SR_SUNS[0].name); } if (S.squid && !st.msn.sr_squid) { st.msn.sr_squid = 1; S.gotSuns.push(SR_SUNS[1].name); } try { (T || window.__town).M?.save?.(); } catch (_) { } } }
    try { const k = 'sunspots.snackrun.v1', b = JSON.parse(localStorage.getItem(k) || '{}'); if (!b.stars || S.stars > b.stars) b.stars = S.stars; b.runs = (b.runs || 0) + 1; localStorage.setItem(k, JSON.stringify(b)); S.best = b.stars; } catch (_) { }
    A(() => { audio.ev('finish', { won: true }); audio.stingDone = false; });
    if (S.squid) { squidHome.visible = true; }
    bubble('HERON', S.listOK ? 'Sour. Correct. Thank you.' : 'This is… a snack. Technically.', () => crew.heron.position, 2.6);
    setTimeout(() => showEnd(true), 1200);
  }
  function showEnd(won) {
    const st = won ? '★'.repeat(S.stars) + `<i>${'★'.repeat(3 - S.stars)}</i>` : '<i>★★★</i>';
    const lines = won ? [`At the store ${fmt(S.arriveAt)} · home ${fmt(S.homeAt)}`, `List: ${S.right}/${S.list.length} right${S.wrong ? `, ${S.wrong} extra` : ''}`] : ['The neon says CLOSED. The Wolf looks at it for a while.', 'The clerk waves through the glass. It is not a friendly wave. It is not an unfriendly wave.'];
    const tips = won ? [S.listOK ? '★ whole list right' : '☆ get the whole list right (the BIG bag, not the mini)', S.homeAt <= STAR_HOME ? '★ home by 2:15' : '☆ be home by 2:15 AM'] : ['Tip: the shortcut is shorter but bumpy. Draft Moth on the long road. Officer Fuzz stops anyone over 15.'];
    card.innerHTML = `<div class="in"><h1>${won ? 'SNACKS ACQUIRED' : 'CLOSED.'}</h1><h2>LATE NIGHT SNACK RUN${won && S.best ? ` · BEST ${'★'.repeat(S.best)}` : ''}</h2>
      <div class="stars">${st}</div>${lines.map((l) => `<p>${l}</p>`).join('')}<p style="font-size:11px;opacity:.8">${tips.join('<br>')}</p>
      <div class="badges">${(won ? S.gotSuns || [] : []).map((n) => `<span>☀ ${n}</span>`).join('')}${[...S.badges].map((b) => `<span>${b}</span>`).join('')}</div>
      <div class="row"><button class="srBig again">TRY AGAIN</button><button class="srBig no done">BACK TO TOWN</button></div></div>`;
    card.classList.add('on');
    card.querySelector('.again').onclick = () => { quit(); setTimeout(() => start(), 700); };
    card.querySelector('.done').onclick = () => quit();
  }

  // ------------------------------------------------------------ helpers for the route
  const carP = () => L.solo ? L.free.pos : wolfState.pos;
  const roadAhead = (dir) => { const c = carP(), nr = L.nearestRoad(c.x, c.z); const road = nr.road === SHORT || nr.road === MAIN ? nr.road : MAIN; const i = nr.road === road ? nr.i : dIdx(road, c.x, c.z); const j = clamp(i + dir * 14, 0, road.s.length - 1); return road.s[j]; };
  const _v = new THREE.Vector3();
  function target() {
    const c = carP();
    if (S.phase === 'go' || S.phase === 'brief') {
      if (c.z > 50 && c.x < 33) return { x: 36, z: 60 };
      if (c.z > 11 && c.x < 40) return { x: 36, z: 6 };
      if (c.z > -24) return { x: 52, z: -30 };
      if (Math.hypot(c.x - STORE_ARRIVE[0], c.z - STORE_ARRIVE[1]) < 160) return { x: STORE_ARRIVE[0], z: STORE_ARRIVE[1] };
      return roadAhead(1);
    }
    if (c.z < -24) return roadAhead(-1);
    if (c.z < 4 || c.x > 40) return { x: 36, z: 8 };
    if (c.z < 56) return { x: 36, z: 60 };
    return { x: HOME[0], z: HOME[1] };
  }
  function placeCab() { const r = onRoad(MAIN, mothR.d, mothR.state === 'wait' ? 4.2 : 1.2); cab.position.set(r.x, 0, r.z); cab.rotation.y = r.yaw; if (!cab.parent) SR.root.add(cab); }
  function bonk(msg) { const c = L.free; if (c.bonkT > 0) return; c.v *= -0.25; c.hopV = 1.8; c.bonkT = 0.9; S.bonks++; A(() => audio.ev('bonk', { solo: true })); toast(msg, 1.8); }
  function addTime(sec, why) { S.clock += sec; toast(`${why}  (+${Math.round(sec / 60 * 10) / 10} min)`, 2.6); }

  // ------------------------------------------------------------ per frame (called by main.js after the level + palette, before render)
  SR.update = (dt, t, wild = 0) => {
    applyNight(dt, wild);
    // the start button: outside, on foot, nothing else going on
    const showBtn = !S.on && okToStart() && !Q.has('nosnackrun') && !!townS()?.snacks; /* Nov 16: a replay, after the opening run (it needs his own car) */ if (showBtn !== (btn.style.display === 'block')) btn.style.display = showBtn ? 'block' : 'none';
    if (!S.on && BASE_NIGHT) neonTick(L.ended && L.mode === 'lost' ? 0 : L.left, t);   // the opening run: same sign, its own 1:57:30 clock
    if (!S.on && townS()?.snacks && !L.ended && (L.mode === 'walk' || L.mode === 'solo')) {   // snacks delivered (either run): no stale pickup line, no 2:00 CLOSED
      if (S.pinLeft == null) S.pinLeft = Math.max(L.left, 31); L.left = S.pinLeft;
      const n = T?.M?.errands?.().length || 0, ob = L.mode === 'solo' ? 'Your waddle car. Drive anywhere. GET OUT to park.' : n ? 'Snacks delivered. Run your errands.' : 'Snacks delivered. The JOURNAL has rumours.';
      if (objEl && objEl.textContent !== ob) objEl.textContent = ob; if (distEl && distEl.textContent) distEl.textContent = ''; if (subEl && subEl.textContent !== 'SNACKS DELIVERED') subEl.textContent = 'SNACKS DELIVERED';
      if (L.pickupRing) L.pickupRing.material.opacity = 0;
    }
    if (!S.on && nightK <= 0) return;
    if (!SR.root.visible) return;
    for (const [k, p] of Object.entries(crew)) animPal(p, dt, t, { wave: (S.phase === 'brief' || S.phase === 'end') ? 1 : 0 }); void 0;
    if (squidHome.visible) animPal(squidHome, dt, t, { wave: 1 });
    if (!S.on) return;
    const c = L.free, cp = L.solo ? c.pos : wolfState.pos, run = S.phase === 'go' || S.phase === 'home';
    // hold the old level clock (its own CLOSED ending must not fire) and run ours
    L.left = S.heldLeft;
    if (run && !L.frozen) S.clock += dt * SCALE; else if (S.phase === 'shop') S.clock += dt * SCALE;
    S.t += dt;
    const leftG = CLOSE - S.clock;
    if (clockEl) { const txt = fmtS(S.clock); if (clockEl.textContent !== txt) clockEl.textContent = txt; clockEl.classList.toggle('late', S.phase !== 'home' && S.phase !== 'end' && leftG < 180); }
    if (subEl) { const txt = S.phase === 'home' || (S.phase === 'end' && S.won) ? 'HOME BY 2:15 FOR ★' : leftG > 0 ? `STORE CLOSES 2:00 AM · ${Math.ceil(leftG / 60)} MIN LEFT` : 'STORE CLOSED'; if (subEl.textContent !== txt) subEl.textContent = txt; }
    const tg = target(); const dd = Math.hypot(tg.x - cp.x, tg.z - cp.z);
    if (objEl) objEl.textContent = S.phase === 'brief' ? 'The crew wants snacks.' : S.phase === 'go' ? 'Get to LAST MINUTE SNACKS before 2:00.' : S.phase === 'home' ? 'Get the snacks home to the couch.' : S.phase === 'shop' ? 'Shop.' : '';
    if (distEl) { const ds = S.phase === 'go' ? Math.hypot(STORE_ARRIVE[0] - cp.x, STORE_ARRIVE[1] - cp.z) : Math.hypot(HOME[0] - cp.x, HOME[1] - cp.z); distEl.textContent = S.phase === 'go' ? `STORE ${ds > 999 ? (ds / 1000).toFixed(1) + ' km' : Math.round(ds) + ' m'}` : S.phase === 'home' ? `HOME ${ds > 999 ? (ds / 1000).toFixed(1) + ' km' : Math.round(ds) + ' m'}` : ''; }
    // arrow (screen-up = camera forward)
    camera.getWorldDirection(_v); const camYaw = Math.atan2(_v.x, _v.z), brg = Math.atan2(tg.x - cp.x, tg.z - cp.z); let rel = brg - camYaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    arrow.style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`; arrow.style.opacity = run && dd > 6 ? 1 : 0.25;
    neonTick(leftG, t);
    homeBeam.visible = S.phase === 'home' || S.phase === 'end';
    spot.intensity = L.solo ? 26 : 0; hpool.visible = L.solo;
    if (S.phase === 'brief' || S.phase === 'end') return;
    renderListTick();
    if (S.phase === 'shop') {
      const ce = shop.querySelector('.clk'); if (ce) { ce.textContent = fmtS(S.clock); ce.classList.toggle('late', leftG < 60); }
      S.clerkT += dt; if (S.clerkT > 4.5) { S.clerkT = 0; S.clerkI = (S.clerkI + 1) % CLERK.length; const s = shop.querySelector('.say'); if (s) s.textContent = leftG < 60 ? 'The lights over the chips go out. Then the lights over the other chips.' : CLERK[S.clerkI]; }
      if (leftG <= 0) checkout(true);
      return;
    }
    if (!run) return;
    // --- the GO leg: lose when 2:00 arrives before you do
    if (S.phase === 'go') {
      if (leftG <= 0) { toast('2:00. The sign goes dark.', 3); lose(); return; }
      if (leftG < 120 && !S.late2) { S.late2 = true; toast('Two minutes. The sign is flickering.', 2.4); }
      if (Math.hypot(cp.x - STORE_ARRIVE[0], cp.z - STORE_ARRIVE[1]) < 15) { openShop(); return; }
      if (!S.forkSaid && Math.hypot(cp.x - 44, cp.z + 92) < 18) { S.forkSaid = true; toast(S.squid ? 'SQUID: Shortcut left. Gecko is having a sale. Do not stop.' : 'The fork. SHORTCUT is bumpy. The long road has Moth.', 3); }
    }
    // --- Banana Squid at the bus stop (go leg only)
    if (S.phase === 'go' && squidPal.visible) { const d = Math.hypot(cp.x - squidPal.position.x, cp.z - squidPal.position.z);
      animPal(squidPal, dt, t, { wave: d < 30 ? 1 : 0 }); face(squidPal, cp.x, cp.z);
      if (d < 16) askShow('squid', '🍌 BANANA SQUID waves you down.<br><small>“Going north? I need PICKLE CRISPS. I will pay you in squid facts.”</small>', 'GIVE A RIDE (+1 min)', 'KEEP DRIVING',
        () => { S.squid = true; squidPal.visible = false; c.v = 0; addTime(60, 'Squid climbs in the back.'); S.list.push(['SQUID', 'pickle', 'PICKLE CRISPS']); S.badges.add("SQUID'S RIDE"); renderList(); bubble('SQUID', 'Fact: I am not a banana.', () => cp, 2); },
        () => { bubble('SQUID', 'Fine. The bus will come. (It will not.)', () => squidPal.position); });
      else if (d > 24) askHide('squid'); }
    // --- Officer Fuzz's speed check (both legs; a stop costs 1.5 min)
    { const d = Math.hypot(cp.x - fuzzPal.position.x, cp.z - fuzzPal.position.z); animPal(fuzzPal, dt, t, { wave: S.fuzzStop > 0 ? 1 : 0 }); face(fuzzPal, cp.x, cp.z);
      if (S.fuzzStop > 0) { S.fuzzStop -= dt; c.v = 0; if (S.fuzzStop <= 0) { toast('OFFICER FUZZ: Fifteen. It is on the sign. Go.', 2.2); } }
      else if (d < 18) { if (!S.fuzzNear) { S.fuzzNear = true; S.fuzzSped = false; }
        if (!S.fuzzSped && Math.abs(c.v) > 15.5) { const sp = Math.abs(c.v); S.fuzzSped = true; S.fuzzStop = 2.2; c.v = 0; S.fuzz = 'stopped'; S.badges.delete('FUZZ APPROVED'); addTime(90, 'OFFICER FUZZ: License and fur.'); bubble('OFFICER FUZZ', 'That was ' + Math.round(sp) + '. The sign says 15.', () => fuzzPal.position, 2.6); A(() => audio.horn()); } }
      else if (d > 18 && S.fuzzNear) { S.fuzzNear = false; if (!S.fuzzSped) { if (S.fuzz !== 'stopped') { S.fuzz = 'ok'; S.badges.add('FUZZ APPROVED'); } bubble('OFFICER FUZZ', 'Under fifteen. Respect.', () => fuzzPal.position, 2.6); } }
    }
    // --- cows (wander across; bonk)
    for (const cw of cows) { if (cw.wait > 0) cw.wait -= dt; else { const c0 = Math.cos(cw.ph); cw.ph += dt * 0.32; if (Math.cos(cw.ph) * c0 < 0) cw.wait = 4 + R() * 5; }   // reach the kerb, stop, graze, wander back
      const lat = Math.sin(cw.ph) * 7 + cw.lane, fx = Math.cos(cw.yaw), fz = -Math.sin(cw.yaw);
      const x = cw.cx + fx * lat, z = cw.cz + fz * lat; cw.g.position.set(x, 0, z); cw.g.rotation.y = cw.yaw + (Math.cos(cw.ph) > 0 ? Math.PI / 2 : -Math.PI / 2);
      cw.g.userData.anim(dt, t, cw.wait > 0 ? 0 : Math.abs(Math.cos(cw.ph)) * 7 * 0.32);   // walks mid-crossing, slows, grazes at each kerb
      if (Math.hypot(cp.x - x, cp.z - z) < 2.5 && Math.abs(c.v) > 2) bonk(['A cow. It does not move. It is a cow.', 'Moo. (deadpan)', 'Felt cow. No harm. Some judgement.'][Math.floor(R() * 3)]); }
    for (const tw of tumbles) { tw.ph += dt * 0.5; const lat = Math.sin(tw.ph) * 9, fx = Math.cos(tw.r.yaw), fz = -Math.sin(tw.r.yaw); const x = tw.r.x + fx * lat, z = tw.r.z + fz * lat;
      tw.g.position.set(x, Math.abs(Math.sin(tw.ph * 6)) * 0.4, z); tw.g.rotation.z += dt * 3 * Math.sign(Math.cos(tw.ph));
      if (Math.hypot(cp.x - x, cp.z - z) < 2.1 && Math.abs(c.v) > 2 && c.bonkT <= 0) { c.v *= 0.6; c.bonkT = 0.6; A(() => audio.ev('tumble')); toast('Tumbleweed. Taking its time.', 1.6); } }
    for (const w of works) { const on = Math.sin(t * 6 + w.x) > 0; for (const l of w.lamps) l.material.color.set(on ? '#ffb02a' : '#5a3a12');
      const dx = c.pos.x - w.x, dz = c.pos.z - w.z, al = dx * Math.sin(w.yaw) + dz * Math.cos(w.yaw), lat = dx * Math.cos(w.yaw) - dz * Math.sin(w.yaw);
      if (L.solo && Math.abs(al) < 1.3 && Math.abs(lat) < 1.7) { c.pos.x += Math.sin(w.yaw) * Math.sign(al || -1) * (1.35 - Math.abs(al)); c.pos.z += Math.cos(w.yaw) * Math.sign(al || -1) * (1.35 - Math.abs(al)); if (Math.abs(c.v) > 2) bonk('ROAD WORK. Nobody working. Still a sawhorse.'); } }
    // --- Gecko's yard sale (shortcut, go leg)
    if (S.phase === 'go' && !S.gecko) { const d = Math.hypot(cp.x - gecko.position.x, cp.z - gecko.position.z); animPal(geckoPal, dt, t, { wave: d < 35 ? 1 : 0 });
      if (d < 18) askShow('gecko', '🦎 GECKO’S 2 AM YARD SALE<br><small>“Everything one cent. Including this horse-shaped air freshener.”</small>', 'BROWSE (+1.5 min)', 'KEEP DRIVING',
        () => { S.gecko = true; c.v = 0; addTime(90, 'You buy the air freshener. It smells like a horse.'); S.badges.add('HORSE AIR FRESHENER'); bubble('GECKO', 'Pleasure. No refunds. No funds.', () => gecko.position, 2.2); },
        () => { S.gecko = true; bubble('GECKO', 'Your loss. One cent of loss.', () => gecko.position, 2.2); });
      else if (d > 26) askHide('gecko'); }
    // --- Moth's cab: pulls out as you come by on the long road; stay close behind to draft (+speed)
    { const myD = MAIN.cum[dIdx(MAIN, cp.x, cp.z)], onMain = L.nearestRoad(cp.x, cp.z).road === MAIN;
      if (mothR.state === 'wait' && S.phase === 'go' && onMain && myD > mothR.d - 45 && myD < mothR.d + 10) { mothR.state = 'drive'; mothR.v = 12; bubble('MOTH', 'Store? Follow the tail lights. Stay close.', () => cab.position, 2.4); toast("MOTH'S cab pulls out. Stay right behind it to draft.", 2.6); A(() => audio.horn()); }
      if (mothR.state === 'drive') { const gap = mothR.d - myD; const want = gap > 26 ? 13 : gap < 8 ? 22 : 19.5; mothR.v = lerp(mothR.v, want, 1 - Math.exp(-dt * 1.5)); mothR.d += mothR.v * dt;
        if (mothR.d > MAIN.len - 70) { mothR.state = 'park'; mothR.d = MAIN.len - 70; }
        const drafting = onMain && gap > 2.5 && gap < 16 && c.v > 8 && S.phase === 'go'; S.boost = lerp(S.boost, drafting ? 1 : 0, 1 - Math.exp(-dt * 3));
        if (drafting) { S.drafted += dt; if (S.drafted > 6) S.badges.add('DRAFTED MOTH'); } }
      else S.boost = lerp(S.boost, 0, 1 - Math.exp(-dt * 3));
      if (S.boost > 0.02 && !L.frozen && L.solo) { c.pos.x += Math.sin(c.yaw) * S.boost * 6.5 * dt; c.pos.z += Math.cos(c.yaw) * S.boost * 6.5 * dt; }
      placeCab(); cabBody.position.y = Math.abs(Math.sin(t * (mothR.state === 'drive' ? 14 : 3))) * 0.04;
      if (Math.hypot(cp.x - cab.position.x, cp.z - cab.position.z) < 2.8 && Math.abs(c.v) > 3) bonk("Bonk. MOTH: 'Felt bumpers. We're fine. Back off a little.'"); }
    // --- home
    if (S.phase === 'home' && Math.hypot(cp.x - HOME[0], cp.z - HOME[1]) < 9 && Math.abs(c.v) < 9) { c.v = 0; L.frozen = true; win(); }
  };
  // neon: steady, then flickering harder as 2:00 gets close, then dark + CLOSED (leftG = game seconds to 2:00)
  function neonTick(leftG, t) {
    const fl = leftG <= 0 ? 0 : leftG > 300 ? 1 : (() => { const k = 1 - leftG / 300, n = Math.sin(t * 37.1) * Math.sin(t * 13.7 + 1.3) + Math.sin(t * 5.3) * 0.3; return n > 1 - k * 1.6 ? 0.12 : 1; })();
      const fl2 = leftG <= 0 ? 0 : leftG > 180 ? 1 : (Math.sin(t * 29.3 + 2) * Math.sin(t * 7.9) > 0.55 - (1 - leftG / 180) ? 0.08 : 1);
      neonA.material.opacity = fl; neonB.material.opacity = Math.min(fl, fl2); neonGlow.material.opacity = 0.6 * Math.max(fl, fl2) * (leftG <= 0 ? 0 : 1); beam.material.opacity = leftG <= 0 ? 0.02 : 0.16 * fl; SR.lot.material.opacity = leftG <= 0 ? 0.08 : 0.55 * Math.max(fl, 0.4); SR.door.material.opacity = leftG <= 0 ? 0.1 : 0.75;
      const closed = leftG <= 0; if ((openS.material === closedM) !== closed) openS.material = closed ? closedM : openM; openS.material.opacity = closed ? (Math.sin(t * 3) > 0 ? 1 : 0.6) : fl;
  }
  let listSig = '';
  function renderListTick() { const sig = S.list.length + ':' + [...S.basket].join(','); if (sig !== listSig) { listSig = sig; renderList(); } }

  // ------------------------------------------------------------ QA hooks
  SR.jump = (m, road = 'main') => { const R2 = road === 'short' ? SHORT : MAIN; const r = onRoad(R2, m); L.free.pos.set(r.x, 0, r.z); L.free.yaw = r.yaw; L.free.v = 0; C.snap?.(); };
  SR.arrive = () => { const r = onRoad(MAIN, MAIN.len - 4); L.free.pos.set(r.x, 0, r.z); L.free.yaw = r.yaw; L.free.v = 0; };
  SR.home = () => { L.free.pos.set(HOME[0] - 3, 0, HOME[1]); L.free.v = 0; };
  SR.D0 = D0; SR.MAINLEN = MAIN.len; SR.SHORTLEN = SHORT.len;
  if (Q.has('snackrun')) { const tryStart = () => { if (okToStart() && window.__ready) start(); else setTimeout(tryStart, 400); }; setTimeout(tryStart, 600); }
  return SR;
}
