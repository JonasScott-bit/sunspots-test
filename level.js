// Level 1 — "Last Minute Snacks". The convenience store closes at 2:00 PM. Walk to the pickup spot, ride out.
// Layout data + road + driving + townsfolk + HUD. main.js owns the renderer, wolf and Wild Mode; this owns the level.
import * as THREE from 'three';
import { radio } from './radio.js';

// ------------------------------------------------------------------ layout (metres; -z = north, toward the sun)
export const LAYOUT = {
  townCenter: [2, 4], walkRadius: 46,                    // invisible boundary on foot
  wolfHouse: [-10, 28, Math.PI],                          // small peach adobe, south edge, door faces the town
  wolfStart: [-10, 15.5, Math.PI],                        // x, z, yaw (facing north, sun ahead)
  pickup: [27, 7], carStart: [29, 7.2, Math.PI / 2],      // rideshare waits on the road, east edge of town
  store: [90, -1016], storeArrive: [90, -1000, 13],       // convenience store at the end of the desert road
  // townsfolk wander spots (invisible markers)
  spots: { bus_stop: [-8, -0.6], fountain_s: [2.5, 1.2], diner_door: [1.5, -7.3], payphone: [8.2, -2.6], lamp: [10.5, 1.6], adobe_w: [-14.5, -6.6],
    adobe_e: [17.5, -0.5], road_w: [-20, 11.5], parked_car: [10, 12.2], wolf_gate: [-6.5, 18.5] },
};
// main road: town street (west end -> pickup) then a winding desert road north to the store
const MAIN_PTS = [[-46, 7.5], [-24, 7.2], [0, 7], [26, 7], [44, 3], [56, -30], [48, -75], [40, -110], [92, -138], [140, -168], [172, -222], [176, -278], [150, -340], [110, -402], [60, -470],
  [85, -560], [62, -650], [100, -735], [76, -820], [104, -900], [92, -960], [90, -1000]];
// the fork: a narrower, straighter shortcut from (40,-110) to (60,-470). Has a cattle guard and a tumbleweed.
const SHORT_PTS = [[48, -75], [40, -110], [27, -190], [43, -290], [36, -390], [60, -470], [85, -560]];
const DRIVE_PTS = [[-10, 24], [-10, 16], [-9.5, 10]]; // the Wolf's dirt driveway

const ROAD_W = 7.2, SHORT_W = 5.0;
const START_LEFT = 150; // seconds of game clock: 1:57:30 PM -> 2:00:00 PM

export function createLevel(C) {
  const { scene, colliders, feltMat, rbox, makeMeltable, rnd, clamp, lerp, smooth, FELT } = C;
  const L = { mode: 'walk', left: START_LEFT, started: false, ended: false, roads: [], cast: [], wanderers: [], obstacles: {}, toastT: 0 };

  // -------------------------------------------------------------- roads (sampled ribbons)
  function makePath(pts, name, w, from, to) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    let s = curve.getSpacedPoints(Math.ceil(curve.getLength() / 2));
    if (from) { const i0 = nearestIdx(s, from), i1 = nearestIdx(s, to); s = s.slice(i0, i1 + 1); }
    const cum = [0]; for (let i = 1; i < s.length; i++) cum.push(cum[i - 1] + s[i].distanceTo(s[i - 1]));
    const p = { name, w, s, cum, len: cum[cum.length - 1] };
    L.roads.push(p); return p;
  }
  function nearestIdx(s, [x, z]) { let b = 0, bd = 1e9; s.forEach((v, i) => { const d = (v.x - x) ** 2 + (v.z - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
  const MAIN = makePath(MAIN_PTS, 'main', ROAD_W);
  const SHORT = makePath(SHORT_PTS, 'shortcut', SHORT_W, [40, -110], [60, -470]);
  const DRIVEWAY = makePath(DRIVE_PTS, 'driveway', 3.0);
  L.MAIN = MAIN; L.SHORT = SHORT;
  // nearest point on any road: {d, road, i}
  L.nearestRoad = (x, z) => {
    let best = { d: 1e9, road: null, i: 0 };
    for (const r of L.roads) { const s = r.s; for (let i = 0; i < s.length; i += 1) { const d = (s[i].x - x) ** 2 + (s[i].z - z) ** 2; if (d < best.d) best = { d, road: r, i }; } }
    best.d = Math.sqrt(best.d); return best;
  };
  L.distToRoad = (x, z) => L.nearestRoad(x, z).d;
  const roadMat = feltMat('#c98048', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const shortMat = feltMat('#c27a44', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const edgeMat = feltMat('#b56b3a', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  L.roadMats = [[roadMat, '#c98048'], [shortMat, '#c27a44'], [edgeMat, '#b56b3a']];
  function ribbon(p, mat, w, y, wobble = 0.35) {
    const s = p.s, pos = [], uv = [], idx = [];
    for (let i = 0; i < s.length; i++) {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
      const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      const hw = w / 2 + wobble * (Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.23 + 1) * 0.4); // soft, hand-cut felt edge
      pos.push(s[i].x + nx * hw, y, s[i].z + nz * hw, s[i].x - nx * hw, y, s[i].z - nz * hw);
      uv.push(0, p.cum[i] / 3, w / 3, p.cum[i] / 3);
      if (i < s.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, k) => k % 3 === 1 ? 1 : 0), 3));
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
  }
  ribbon(MAIN, edgeMat, ROAD_W + 1.6, 0.012, 0.6); ribbon(MAIN, roadMat, ROAD_W, 0.02);
  ribbon(SHORT, edgeMat, SHORT_W + 1.2, 0.013, 0.5); ribbon(SHORT, shortMat, SHORT_W, 0.024, 0.25);
  ribbon(DRIVEWAY, roadMat, 3.0, 0.021, 0.15);
  // centre tyre ruts (darker felt stripes) along the desert stretch
  { const rutMat = feltMat('#a05e34', { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }); L.roadMats.push([rutMat, '#a05e34']);
    for (const off of [-1.3, 1.3]) { const s = MAIN.s.slice(nearestIdx(MAIN.s, [44, 3])).map(v => v.clone()); const p = { s: [], cum: [] };
      for (let i = 0; i < s.length; i++) { const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)]; const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1; p.s.push(new THREE.Vector3(s[i].x - tz / tl * off, 0, s[i].z + tx / tl * off)); p.cum.push(i * 2); }
      ribbon(p, rutMat, 0.5, 0.028, 0.05); } }

  // -------------------------------------------------------------- helpers
  const group = (x, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g; };
  const add = (g, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  const cyl = (r, h, color, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), feltMat(color)); m.castShadow = m.receiveShadow = true; return m; };
  const sph = (r, color) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), feltMat(color)); m.castShadow = true; return m; };
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function signBoard(text, w, h, { bg = '#f3dcb0', fg = '#4a2a18', font = 'bold 64px Futura, Avenir, sans-serif', glow = false } = {}) {
    const tex = canvasTex(512, Math.round(512 * h / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .08})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = text.split('\n'); lines.forEach((t, i) => g.fillText(t, W / 2, H / 2 + (i - (lines.length - 1) / 2) * H / (lines.length + 0.4))); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow ? new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }) : feltMat('#ffffff', { map: tex, bumpScale: 0.15 }));
    return m;
  }
  function signPost(x, z, ry, text, w = 2.2, h = 0.9) {
    const g = group(x, z, ry); add(g, cyl(0.07, 2.2, '#8a5a34'), -w * 0.35, 1.1, 0); add(g, cyl(0.07, 2.2, '#8a5a34'), w * 0.35, 1.1, 0);
    const b = add(g, signBoard(text, w, h, { font: `bold ${Math.round(150 / (text.split('\n').length + 0.6))}px Futura, Avenir, sans-serif` }), 0, 2.0, 0.08);
    const back = add(g, rbox(w + 0.1, h + 0.1, 0.1, 0.04, '#a05e34'), 0, 2.0 - (h + 0.1) / 2, 0); void b; void back;
    colliders.push({ x, z, r: 0.5 });
    makeMeltable(g, { tint: '#ff8070', puddle: 0.8, puddleColor: '#f2907f' });
    return g;
  }

  // -------------------------------------------------------------- pickup spot (felt ring + sign) in town
  { const [x, z] = LAYOUT.pickup;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.0, 40), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x - 2.5, 0.04, z + 4.4); scene.add(ring); L.pickupRing = ring;
    signPost(x - 4.6, z + 5.6, 0, 'RIDE\nPICKUP', 1.6, 1.0);
  }

  // -------------------------------------------------------------- the rideshare car: OUR BOOT CAR (mustard felt hatchback on four coral rubber boots)
  // The GLB is a single static mesh (no rig). The boots walk procedurally in the vertex shader (see L.setBootCar); the body waddles here.
  // Car-local axes: +z = forward, +x = car's left (driver side), y up. Length ~4.3 m, height 2.0 m.
  const car = new THREE.Group(); scene.add(car);
  const body = new THREE.Group(); car.add(body);
  const topper = add(body, rbox(0.9, 0.3, 0.3, 0.1, '#ffd36b'), 0, 1.93, -0.55); topper.material = topper.material.clone(); topper.material.emissive = new THREE.Color('#ff9a2a'); topper.material.emissiveIntensity = 0.5;
  add(body, signBoard('RIDE', 0.8, 0.24, { bg: '#ffd36b', fg: '#5a2a10', font: 'bold 120px Futura, Avenir, sans-serif' }), 0, 2.08, -0.39);
  const wheels = [];
  // driver: the moth (approved in concept, not modelled yet) -> tan felt seated stand-in with two feathery antennae
  const TAN = '#cfae84', TAN_D = '#b48f63';
  const driver = new THREE.Group(); driver.position.set(0.48, 0.0, -0.05); body.add(driver);
  add(driver, rbox(0.62, 0.62, 0.5, 0.24, TAN), 0, 0.78, 0);                       // fuzzy torso (seated; legs hidden in the body)
  const mHead = add(driver, sph(0.23, TAN), 0, 1.6, 0.04); mHead.scale.set(1, 0.92, 0.95);
  for (const sx of [-0.1, 0.1]) { const e = add(driver, sph(0.075, '#3a2622'), sx, 1.8, 0.24); e.scale.set(1, 1.2, 0.6); e.position.y = 1.62; } // big dark moth eyes, half-lidded look
  add(driver, rbox(0.66, 0.16, 0.5, 0.08, TAN_D), 0, 1.36, 0.0);                  // fluffy collar
  for (const sx of [-1, 1]) { // feathery antennae: a curved stalk with little felt barbs either side
    const ant = new THREE.Group(); ant.position.set(sx * 0.09, 1.79, 0.1); ant.rotation.set(-0.95, 0, sx * -0.3); driver.add(ant);
    const stalk = cyl(0.014, 0.32, TAN_D, 6); stalk.position.y = 0.16; ant.add(stalk);
    for (let k = 0; k < 6; k++) { const y = 0.06 + k * 0.045, len = 0.05 + Math.sin((k + 1) / 8 * Math.PI) * 0.07;
      for (const side of [-1, 1]) { const barb = rbox(len, 0.012, 0.02, 0.005, TAN); barb.geometry = barb.geometry.clone(); barb.position.set(side * len / 2, y, 0); barb.rotation.z = side * 0.5; ant.add(barb); } }
    L.antennae = (L.antennae || []).concat(ant);
  }
  for (const sx of [-0.24, 0.24]) { const a = add(driver, rbox(0.12, 0.12, 0.5, 0.06, TAN), sx, 1.12, 0.3); a.rotation.x = -0.5; }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), feltMat('#3a2a26')); wheel.position.set(0, 1.2, 0.58); wheel.rotation.x = -1.0; driver.add(wheel);
  L.car = { root: car, body, wheels, driver, wheel, pos: new THREE.Vector3(), yaw: 0, v: 0, hop: 0, hopV: 0, steer: 0, bonkT: 0, step: 0, stepAmp: 0 };
  L.seat = new THREE.Vector3(-0.5, 0.5, -0.05); L.seatScale = 0.82; // wolf rides shotgun (car-local; legs hidden below the window line)
  // boot car GLB -> car body. Orientation is found from the mesh (roof sits toward the rear); boots found from the sole clusters.
  const bootU = { uStep: { value: 0 }, uLift: { value: 0 }, uStride: { value: 0 }, uRear: { value: 1 }, uBMinY: { value: 0 }, uBH: { value: 1 }, uBootC: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] }, uBootR: { value: new THREE.Vector2(0.24, 0.15) } };
  const BOOT_VERT = `
    { float yr = (transformed.y - uBMinY) / uBH;
      float bw = 1.0 - smoothstep(0.24, 0.34, yr);
      if (bw > 0.0) {
        int qi = (transformed.x > 0.0 ? 0 : 2) + (transformed.z > 0.0 ? 0 : 1);
        vec2 bc = uBootC[0]; if (qi == 1) bc = uBootC[1]; if (qi == 2) bc = uBootC[2]; if (qi == 3) bc = uBootC[3];
        vec2 dd = (transformed.xz - bc) / uBootR; bw *= 1.0 - smoothstep(1.0, 1.35, length(dd));
        float diag = (transformed.x * uRear > 0.0) == (transformed.z > 0.0) ? 0.0 : 3.14159265;
        float ph = uStep + diag;
        float lift = max(0.0, sin(ph));
        transformed.y += bw * lift * uLift;
        transformed.x += bw * cos(ph) * uStride * uRear;
        transformed.z += bw * lift * uLift * 0.25 * sign(transformed.z);
      } }`;
  function chainBoot(mat) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => { prev?.call(mat, sh, r); Object.assign(sh.uniforms, bootU);
      sh.vertexShader = 'uniform float uStep,uLift,uStride,uRear,uBMinY,uBH;uniform vec2 uBootC[4];uniform vec2 uBootR;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BOOT_VERT); };
    const pk = mat.customProgramCacheKey?.bind(mat); mat.customProgramCacheKey = () => (pk ? pk() : '') + '|boots';
  }
  L.setBootCar = (scn, normalize) => {
    let mesh = null; scn.traverse(o => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return;
    const g = mesh.geometry, P = g.attributes.position, v = new THREE.Vector3(); g.computeBoundingBox(); const bb = g.boundingBox, H = bb.max.y - bb.min.y;
    let rx = 0, rn = 0; const q = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const yr = (v.y - bb.min.y) / H;
      if (yr > 0.9) { rx += v.x; rn++; }
      if (yr < 0.06) { const k = (v.x > 0 ? 0 : 2) + (v.z > 0 ? 0 : 1); q[k][0] += v.x; q[k][1] += v.z; q[k][2]++; } }
    const rear = Math.sign(rx / Math.max(1, rn)) || 1; // +1: rear of the car is at mesh +x
    bootU.uRear.value = rear; bootU.uBMinY.value = bb.min.y; bootU.uBH.value = H;
    q.forEach((a, k) => bootU.uBootC.value[k].set(a[0] / Math.max(1, a[2]), a[1] / Math.max(1, a[2])));
    const L0 = bb.max.x - bb.min.x; bootU.uBootR.value.set(L0 * 0.125, (bb.max.z - bb.min.z) * 0.16);
    L.car.baseLift = H * 0.085; L.car.baseStride = L0 * 0.035;
    scn.rotation.y = rear * Math.PI / 2; // nose -> +z
    const holder = new THREE.Group(); holder.add(normalize(scn, 2.0)); body.add(holder);
    scn.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.roughness = 1; o.material.metalness = 0; } });
    makeMeltable(holder, { tint: '#ffb070', puddle: 0, bend: 0.4 });
    scn.traverse(o => { if (o.isMesh) { chainBoot(o.material); if (o.customDepthMaterial) chainBoot(o.customDepthMaterial); } });
    L.car.model = holder;
  };
  // boots: a bouncy step cycle whose speed follows the car's speed; body bobs and waddles on top
  function animateBoots(dt, t) {
    const c = L.car, sp = Math.abs(c.v);
    const amp = clamp(sp / 3, 0, 1); c.stepAmp = lerp(c.stepAmp, amp, 1 - Math.exp(-dt * 6));
    const hz = sp < 0.05 ? 0.6 : Math.min(1.1 + sp * 0.22, 5.2); // steps per second follow speed (capped so it stays readable)
    c.step += dt * hz * Math.PI * 2 * Math.sign(c.v || 1);
    const idle = 1 - c.stepAmp, a = 0.18 + 0.82 * c.stepAmp; // parked: slow little weight shuffle
    bootU.uStep.value = c.step; bootU.uLift.value = (c.baseLift || 0) * a; bootU.uStride.value = (c.baseStride || 0) * a;
    const s2 = Math.sin(c.step * 2);
    c.body.position.y = (Math.abs(Math.sin(c.step)) * 0.11 + 0.02) * a;              // bounce on each step
    c.bodyRoll = Math.sin(c.step) * 0.045 * a + idle * 0.01 * Math.sin(t * 1.3);      // waddle
    c.bodyPitch = s2 * 0.012 * a;
    c.body.rotation.z = (c.lean || 0) + c.bodyRoll; c.body.rotation.x = (c.pitch || 0) + c.bodyPitch;
    for (const an of L.antennae || []) an.rotation.x = -0.95 + Math.sin(c.step * 2 + 0.6) * 0.08 * a + Math.sin(t * 2.1) * 0.03;
  }
  L.animateBoots = animateBoots;
  function placeCar() { const [x, z, y] = LAYOUT.carStart; L.car.pos.set(x, 0, z); L.car.yaw = y; L.car.v = 0; L.car.hop = 0; L.car.hopV = 0; car.position.copy(L.car.pos); car.rotation.y = y; }
  placeCar();

  // -------------------------------------------------------------- convenience store (felt blockout, glowing sign, big 2:00 clock)
  { const [sx, sz] = LAYOUT.store; const g = group(sx, sz, 0);
    const W = 16, D = 9, H = 4.6;
    add(g, rbox(W, H, D, 0.5, '#f2b98a'), 0, 0, 0);
    add(g, rbox(W + 0.6, 0.55, D + 0.6, 0.2, '#e79f6e'), 0, H - 0.1, 0);                           // roof trim
    add(g, rbox(W + 1.2, 0.25, 3.2, 0.1, '#e7c494'), 0, 3.35, D / 2 + 1.4);                         // awning
    for (const px of [-W / 2, -W / 4, W / 4, W / 2]) add(g, cyl(0.12, 3.4, '#b56b3a'), px, 1.7, D / 2 + 2.8);
    for (const wx of [-4.6, 4.6]) add(g, rbox(5.0, 2.1, 0.12, 0.12, '#34404a'), wx, 0.8, D / 2);   // big windows
    add(g, rbox(2.2, 2.7, 0.14, 0.1, '#5a3a2a'), 0, 0, D / 2);                                       // door
    for (const [px, txt] of [[-4.6, 'CHIPS'], [4.6, 'ICE']]) add(g, signBoard(txt, 2.2, 0.55, { bg: '#ffe7a8', fg: '#a2302a', font: 'bold 110px Futura, Avenir, sans-serif' }), px, 2.35, D / 2 + 0.08);
    // glowing sign on the roof
    const sign = add(g, signBoard('CONVENIENCE', 11, 1.7, { bg: '#2b1630', fg: '#ff9ad2', font: 'bold 74px Futura, Avenir, sans-serif', glow: true }), 0, H + 1.6, D / 2 - 1.2);
    add(g, rbox(11.4, 2.1, 0.3, 0.12, '#5a3a4a'), 0, H + 0.55, D / 2 - 1.42);
    L.storeSign = sign;
    const glowTex = canvasTex(128, 64, (c) => { const gr = c.createRadialGradient(64, 32, 4, 64, 32, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 64); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff5fb4', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.scale.set(17, 5, 1); glow.position.set(sx, H + 1.6, sz + D / 2 - 0.6); scene.add(glow); L.storeGlow = glow;
    // big clock on a felt tower beside the store: frozen at 2:00 (closing time)
    const clockTex = canvasTex(512, 512, (c, w) => { c.fillStyle = '#f6e8c8'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill(); c.lineWidth = 18; c.strokeStyle = '#a2302a'; c.stroke();
      c.fillStyle = '#3a2418'; c.font = 'bold 54px Futura, Avenir, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
      c.lineCap = 'round'; c.strokeStyle = '#2a1a14'; c.lineWidth = 22; const ha = 2 / 12 * Math.PI * 2 - Math.PI / 2; c.beginPath(); c.moveTo(256, 256); c.lineTo(256 + Math.cos(ha) * 110, 256 + Math.sin(ha) * 110); c.stroke();
      c.lineWidth = 14; c.beginPath(); c.moveTo(256, 256); c.lineTo(256, 256 - 165); c.stroke(); c.fillStyle = '#a2302a'; c.beginPath(); c.arc(256, 256, 16, 0, 7); c.fill();
      c.fillStyle = '#a2302a'; c.font = 'bold 34px Futura, Avenir, sans-serif'; c.fillText('CLOSES', 256, 330); void w; });
    const tower = group(sx + W / 2 + 3.2, sz + 2, -0.25);
    add(tower, rbox(1.4, 6.2, 1.4, 0.3, '#e7a676'), 0, 0, 0);
    add(tower, cyl(1.7, 0.5, '#d68a5c', 36), 0, 7.2, 0).rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ map: clockTex, fog: false, toneMapped: false })); add(tower, face, 0, 7.2, 0.27);
    add(tower, signBoard('CLOSES 2:00 PM', 3.2, 0.7, { bg: '#ffe7a8', fg: '#a2302a', font: 'bold 64px Futura, Avenir, sans-serif' }), 0, 5.5, 0.72);
    colliders.push({ x: sx - 5, z: sz, r: 4.6 }, { x: sx, z: sz, r: 4.6 }, { x: sx + 5, z: sz, r: 4.6 }, { x: sx + W / 2 + 3.2, z: sz + 2, r: 1.2 });
    makeMeltable(g, { tint: '#ff8070', puddle: 9.5, puddleColor: '#ff8a7c', drips: { drip: 'box', footprint: [W, D], height: H + 0.4, kind: 'adobe' } });
    makeMeltable(tower, { tint: '#ff7a6c', puddle: 1.8, puddleColor: '#f2907f', bend: 0.5 });
    // parking lot
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), feltMat('#d4a06a', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); lot.rotation.x = -Math.PI / 2; lot.position.set(sx, 0.018, sz + D / 2 + 8); lot.receiveShadow = true; scene.add(lot); L.roadMats.push([lot.material, '#d4a06a']);
    for (let i = -2; i <= 2; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4.2), new THREE.MeshBasicMaterial({ color: '#f3e3c0', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); st.rotation.x = -Math.PI / 2; st.position.set(sx + i * 3.2, 0.03, sz + D / 2 + 4.4); scene.add(st); }
  }

  // -------------------------------------------------------------- obstacles: cattle guards, roadside + in-road cacti, a slow tumbleweed, fork signs
  function atRoad(p, frac, off = 0) { const i = Math.round(frac * (p.s.length - 1)); const a = p.s[Math.max(0, i - 1)], b = p.s[Math.min(p.s.length - 1, i + 1)]; const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1; return { x: p.s[i].x - tz / tl * off, z: p.s[i].z + tx / tl * off, yaw: Math.atan2(tx, tz), i }; }
  function atDist(p, d, off = 0) { let i = p.cum.findIndex(c => c >= d); if (i < 0) i = p.cum.length - 1; return atRoad(p, i / (p.s.length - 1), off); }
  L.atDist = atDist;
  L.guards = [];
  function cattleGuard(p, d) {
    const r = atDist(p, d); const g = group(r.x, r.z, r.yaw); const w = p.w + 0.6;
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.2), feltMat('#3a2622', { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.03; g.add(pit);
    for (let k = 0; k < 7; k++) add(g, rbox(w, 0.1, 0.13, 0.05, '#b8b0a2'), 0, 0.02, -0.95 + k * 0.32);
    for (const sx of [-w / 2 - 0.3, w / 2 + 0.3]) { add(g, cyl(0.12, 1.3, '#8a5a34'), sx, 0.65, 0); colliders.push({ x: r.x + Math.cos(r.yaw) * sx, z: r.z - Math.sin(r.yaw) * sx, r: 0.3 }); }
    makeMeltable(g, { tint: '#c86a7a', puddle: 0, puddleColor: '#d0808a' });
    L.guards.push({ x: r.x, z: r.z, yaw: r.yaw, hit: false });
  }
  cattleGuard(MAIN, MAIN.cum[nearestIdx(MAIN.s, [53, -48])]);
  cattleGuard(SHORT, SHORT.len * 0.42);
  // fork signs
  { const f = atDist(MAIN, MAIN.cum[nearestIdx(MAIN.s, [44, -95])]);
    signPost(f.x + 6.5, f.z + 1, f.yaw + Math.PI, 'STORE\nLONG WAY →', 2.4, 1.0);
    signPost(f.x - 6.5, f.z - 2, f.yaw + Math.PI, '← SHORTCUT\n(PROBABLY)', 2.4, 1.0); }
  // cacti: roadside dressing + a few in the road on curves (steer round them)
  L.roadCacti = [];
  L.placeRoadCacti = (town) => {
    const kinds = ['cactus_tall', 'cactus_mid', 'cactus_small'];
    const put = (kind, x, z, cr) => { const root = C.feltify(town[kind].scene.clone(true)); root.position.set(x, 0, z); root.rotation.y = rnd() * 6.28; const s = 0.85 + rnd() * 0.4; root.scale.setScalar(s); scene.add(root);
      colliders.push({ x, z, r: cr * s }); makeMeltable(root, { tint: '#a02a5a', puddle: 0.9 * s, puddleColor: '#d0507e', drips: { kind: 'cactus' } }); L.roadCacti.push(root); };
    // roadside, both sides, every ~45 m along the desert stretch
    for (const p of [MAIN, SHORT]) for (let d = p === MAIN ? 120 : 20; d < p.len - 30; d += 38 + rnd() * 20) { const side = rnd() < 0.5 ? -1 : 1; const r = atDist(p, d, side * (p.w / 2 + 2.5 + rnd() * 5)); put(kinds[Math.floor(rnd() * 3)], r.x, r.z, 0.5); }
    // in-road (deadpan obstacles): just off-centre, on gentle curves
    for (const d of [260, 470, 640, 830, 1010, 1180]) { if (d > MAIN.len - 40) continue; const r = atDist(MAIN, d, (rnd() < 0.5 ? -1 : 1) * 1.4); put('cactus_mid', r.x, r.z, 0.45); }
    for (const d of [90, 250]) { const r = atDist(SHORT, d, 1.0); put('cactus_small', r.x, r.z, 0.4); }
  };
  // tumbleweed: rolls slowly back and forth across the shortcut
  { const tw = new THREE.Group(); const m = feltMat('#b98a4e');
    for (let k = 0; k < 9; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55 + rnd() * 0.15, 0.045, 6, 22), m); t.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); t.castShadow = true; tw.add(t); }
    tw.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), feltMat('#a07440', { wireframe: true })));
    scene.add(tw); const r = atDist(SHORT, SHORT.len * 0.66); L.tumble = { obj: tw, cx: r.x, cz: r.z, yaw: r.yaw, ph: 0, push: 0 }; }
  L.obstacles = { guards: L.guards, tumble: L.tumble };

  // -------------------------------------------------------------- townsfolk spots (invisible markers) + rigged cast
  L.spotMarkers = [];
  for (const [name, [x, z]] of Object.entries(LAYOUT.spots)) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), new THREE.MeshBasicMaterial({ color: '#ffe08a' })); o.name = 'spot_' + name; o.position.set(x, 0.06, z); o.visible = false; scene.add(o); L.spotMarkers.push(o); }
  const SPOTS = Object.values(LAYOUT.spots);

  async function loadCast(load, normalize) {
    const M = './models/cast/';
    const spec = [
      ['house_fridge_walking', { h: 2.0, x: -7.4, z: 25.2, ry: Math.PI + 0.35, still: true, cr: 0.6 }],     // by the Wolf's door
      ['diner_couch', { h: 0.95, x: -14.6, z: 24.4, ry: Math.PI * 0.92, prop: true, cr: 1.1 }],           // couch in the front yard
      ['diner_stove', { h: 1.05, x: -16.7, z: 26.0, ry: Math.PI * 0.85, prop: true, cr: 0.6 }],           // stove beside it
      ['mainst_payphone_blockhead_walking', { h: 2.0, x: 7.9, z: -4.6, ry: 0.25, still: true, cr: 0.5 }], // stands by the payphone
      ['mainst_hydrant_spin_walking', { h: 1.15, x: 4.6, z: 2.2, ry: -0.5, still: true, cr: 0.45, spin: true }],
      ['wanderer_banana_squid_walking', { h: 1.7, wander: true, spot: 0 }],
      ['wanderer_shovel_farmhand_walking', { h: 1.8, wander: true, spot: 4 }],
      ['wanderer_wrench_walking', { h: 1.6, wander: true, spot: 7 }],
    ];
    const gl = await Promise.all(spec.map(([n]) => load(M + n + '.glb').catch(e => { console.warn('cast', n, e); return null; })));
    spec.forEach(([name, o], i) => {
      const g = gl[i]; if (!g) return;
      const holder = new THREE.Group(); const m = normalize(g.scene, o.h);
      m.traverse(k => { if (k.isMesh) { k.castShadow = k.receiveShadow = true; k.frustumCulled = false; if (k.material) { k.material.roughness = 1; k.material.metalness = 0; } } });
      holder.add(m); scene.add(holder);
      if (o.wander) { const [x, z] = SPOTS[o.spot]; holder.position.set(x, 0, z); }
      else { holder.position.set(o.x, 0, o.z); holder.rotation.y = o.ry; if (o.cr) colliders.push({ x: o.x, z: o.z, r: o.cr }); }
      if (o.prop) { makeMeltable(holder, { tint: '#ff7a80', puddle: 1.2, puddleColor: '#f39286' }); return; }
      const c = { name, holder, body: m, sy: m.scale.y, ph: rnd() * 6.28, spin: o.spin };
      if (g.animations.length) { c.mixer = new THREE.AnimationMixer(m); c.act = c.mixer.clipAction(g.animations[0]); c.act.play(); c.act.setEffectiveWeight(0); }
      if (o.wander) Object.assign(c, { wander: true, from: o.spot, to: o.spot, wait: 1 + rnd() * 3, speed: 0.9 + rnd() * 0.25, yaw: rnd() * 6.28 });
      L.cast.push(c);
    });
  }
  L.loadCast = loadCast;
  function updateCast(dt, t, wolfPos) {
    for (const c of L.cast) {
      const h = c.holder;
      if (c.wander) {
        if (c.wait > 0) { c.wait -= dt; c.moving = false; if (c.wait <= 0) { let n; do n = Math.floor(rnd() * SPOTS.length); while (n === c.to); c.from = c.to; c.to = n; } }
        else {
          const [tx, tz] = SPOTS[c.to]; const dx = tx - h.position.x, dz = tz - h.position.z, d = Math.hypot(dx, dz);
          if (d < 0.4) { c.wait = 2.5 + rnd() * 5; c.moving = false; }
          else { c.moving = true; let want = Math.atan2(dx, dz); let dd = want - c.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); c.yaw += dd * (1 - Math.exp(-dt * 3));
            h.position.x += Math.sin(c.yaw) * c.speed * dt; h.position.z += Math.cos(c.yaw) * c.speed * dt;
            for (const k of colliders) { const ex = h.position.x - k.x, ez = h.position.z - k.z, e = Math.hypot(ex, ez), r = k.r + 0.35; if (e < r && e > 1e-4) { h.position.x = k.x + ex / e * r; h.position.z = k.z + ez / e * r; c.yaw += 0.6 * dt * 4; } }
            const wx = h.position.x - wolfPos.x, wz = h.position.z - wolfPos.z, wd = Math.hypot(wx, wz); if (wd < 1.0 && wd > 1e-4) { h.position.x = wolfPos.x + wx / wd; h.position.z = wolfPos.z + wz / wd; } }
          h.rotation.y = c.yaw;
        }
        const k = 1 - Math.exp(-dt * 5); c.w = lerp(c.w || 0, c.moving ? 1 : 0, k);
        if (c.act) { c.act.setEffectiveWeight(c.w); c.act.timeScale = 0.85; }
      }
      // deadpan idle: breathing + slow weight shift (bind pose); the hydrant turns very slowly on the spot
      const idle = 1 - (c.w || 0);
      c.body.scale.y = c.sy * (1 + idle * 0.014 * Math.sin(t * 1.9 + c.ph));
      c.body.rotation.z = idle * 0.025 * Math.sin(t * 0.5 + c.ph);
      if (c.spin) h.rotation.y += dt * 0.35;
      if (c.mixer) c.mixer.update(dt);
    }
  }

  // -------------------------------------------------------------- HUD (DOM)
  const $ = id => document.getElementById(id);
  const hud = { clock: $('clk'), sub: $('clkSub'), obj: $('obj'), dist: $('dist'), getIn: $('getIn'), drive: $('drive'), toast: $('toast'), end: $('endScr') };
  const fmt = (left) => { const s = Math.max(0, Math.ceil(14 * 3600 - left)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')} PM`; };
  L.fmt = fmt;
  function toast(msg, sec = 3) { if (!hud.toast) return; hud.toast.textContent = msg; hud.toast.style.opacity = 1; L.toastT = sec; }
  L.toast = toast;
  const ctl = { left: false, right: false, gas: false, brake: false, tilt: null };
  L.ctl = ctl;
  for (const [id, k] of [['bL', 'left'], ['bR', 'right'], ['bGas', 'gas'], ['bBrake', 'brake']]) {
    const el = $(id); if (!el) continue;
    const on = e => { e.preventDefault(); ctl[k] = true; el.classList.add('on'); }, off = e => { e.preventDefault(); ctl[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  }
  $('bTilt')?.addEventListener('click', async () => {
    if (ctl.tilt !== null) { ctl.tilt = null; $('bTilt').classList.remove('on'); return; }
    try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return; } } catch (e) { return; }
    ctl.tilt = 0; $('bTilt').classList.add('on');
    addEventListener('deviceorientation', ev => { if (ctl.tilt === null) return; const land = innerWidth > innerHeight; const v = land ? (ev.beta || 0) * (screen.orientation?.angle === 270 || window.orientation === -90 ? -1 : 1) : (ev.gamma || 0); ctl.tilt = clamp(v / 25, -1, 1); });
  });
  hud.getIn?.addEventListener('click', () => L.enterCar());
  // the radio: procedurally generated "wild foreign music" (radio.js). Audio may only start after a user gesture.
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => radio.unlock(), { passive: true });
  $('bVol')?.addEventListener('click', (e) => { e.preventDefault(); toast('nope.', 1.6); }); // the volume knob does nothing
  L.radioVol = 0;
  $('retry')?.addEventListener('click', () => L.reset());

  // -------------------------------------------------------------- state machine
  L.enterCar = () => { if (L.mode !== 'walk' || L.ended) return; L.mode = 'drive'; L.inCar = true; document.body.classList.add('driving'); hud.getIn.style.display = 'none'; toast('The driver nods once. You steer.', 3.5); C.onEnterCar?.(); };
  L.reset = () => { L.mode = 'walk'; L.inCar = false; L.left = START_LEFT; L.ended = false; L.started = false; document.body.classList.remove('driving', 'ended', 'won', 'lost'); placeCar(); for (const g of L.guards) g.hit = false; L.forkSaid = false; C.onReset?.(); };
  function finish(won) {
    if (L.ended) return; L.ended = true; L.mode = won ? 'won' : 'lost'; document.body.classList.add('ended', won ? 'won' : 'lost');
    $('endTitle').textContent = won ? 'SNACKS ACQUIRED.' : 'CLOSED.';
    $('endSub').textContent = won ? `Arrived ${fmt(L.left)}. The store was still open. Nobody said anything.` : 'The store closed at 2:00 PM. The Wolf looks at the sign for a while.';
  }
  L.finish = finish;
  L.forceEnd = (won) => finish(won);
  L.teleportCar = (d, road = MAIN) => { const r = atDist(road, d); L.car.pos.set(r.x, 0, r.z); L.car.yaw = r.yaw; L.car.v = 0; if (L.mode === 'walk') L.enterCar(); };

  // car update
  const fwd = new THREE.Vector3();
  function updateCar(dt, keys) {
    const c = L.car;
    let steer = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0) + (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (ctl.tilt !== null && ctl.tilt !== undefined) steer += ctl.tilt;
    steer = clamp(steer, -1, 1); c.steer = lerp(c.steer, steer, 1 - Math.exp(-dt * 8));
    const gas = ctl.gas || keys.ArrowUp || keys.KeyW, brake = ctl.brake || keys.ArrowDown || keys.KeyS || keys.Space;
    const nr = L.nearestRoad(c.pos.x, c.pos.z), onRoad = nr.d < nr.road.w / 2 + 0.8;
    const vmax = onRoad ? (nr.road === SHORT ? 17 : 19) : 9;
    if (gas) c.v += (c.v < 0 ? 14 : 8.5 * (1 - Math.max(0, c.v) / (vmax + 2))) * dt;
    else if (brake) c.v -= (c.v > 0.3 ? 16 : 4) * dt;
    else c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), (1.2 + Math.abs(c.v) * 0.06) * dt);
    c.v = clamp(c.v, -5, Math.max(vmax, c.v - 10 * dt)); if (!onRoad && c.v > vmax) c.v = lerp(c.v, vmax, 1 - Math.exp(-dt * 2));
    c.yaw -= c.steer * 1.25 * clamp(Math.abs(c.v) / 6, 0, 1) * Math.sign(c.v || 1) * dt * (1 - 0.25 * clamp(c.v / 19, 0, 1));
    fwd.set(Math.sin(c.yaw), 0, Math.cos(c.yaw));
    c.pos.addScaledVector(fwd, c.v * dt);
    // collisions (cacti, buildings, posts): bonk + bounce back, deadpan
    c.bonkT -= dt;
    for (const k of colliders) { const dx = c.pos.x - k.x, dz = c.pos.z - k.z, d = Math.hypot(dx, dz), r = k.r + 1.4; if (d < r && d > 1e-4) { c.pos.x = k.x + dx / d * r; c.pos.z = k.z + dz / d * r; if (Math.abs(c.v) > 3 && c.bonkT <= 0) { c.v *= -0.25; c.hopV = 1.6; c.bonkT = 0.8; toast(['(cactus)', 'Bonk.', 'The driver blinks.', '(that was a cactus)'][Math.floor(rnd() * 4)], 1.6); } else c.v *= 0.9; } }
    // invisible boundary: the desert looks endless, but the car is gently turned back toward the road
    if (nr.d > 38) { const p = nr.road.s[nr.i], k = (nr.d - 38) / nr.d; c.pos.x -= (c.pos.x - p.x) * k; c.pos.z -= (c.pos.z - p.z) * k; c.v *= 0.97; if (!L.edgeSaid) { toast('Nothing out there. Back to the road.', 2.2); L.edgeSaid = true; } } else if (nr.d < 20) L.edgeSaid = false;
    // cattle guards: rattle + small hop, a little speed lost
    for (const g of L.guards) { const d = Math.hypot(c.pos.x - g.x, c.pos.z - g.z); if (d < 2.4 && !g.hit) { g.hit = true; if (Math.abs(c.v) > 5) { c.hopV = 2.4; c.v *= 0.82; toast('Cattle guard. Rattle rattle.', 1.8); } } else if (d > 8) g.hit = false; }
    // tumbleweed
    const tw = L.tumble, td = Math.hypot(c.pos.x - tw.obj.position.x, c.pos.z - tw.obj.position.z);
    if (td < 2.0 && tw.push <= 0) { tw.push = 1.4; tw.pushDir = c.yaw; c.v *= 0.55; toast('A tumbleweed, taking its time.', 2.2); }
    // suspension hop
    c.hopV -= 14 * dt; c.hop = Math.max(0, c.hop + c.hopV * dt); if (c.hop === 0 && c.hopV < 0) c.hopV = 0;
    const rough = onRoad ? (nr.road === SHORT ? 0.02 : 0.008) : 0.035;
    c.root.position.set(c.pos.x, c.hop, c.pos.z); c.root.rotation.y = c.yaw;
    c.lean = -c.steer * 0.04 * clamp(c.v / 12, 0, 1); c.pitch = -0.02 * (gas ? 1 : 0) + 0.03 * (brake && c.v > 1 ? 1 : 0) + Math.sin(performance.now() * 0.03) * rough * clamp(c.v / 8, 0, 1);
    c.wheel.rotation.z = c.steer * 1.2;
    // fork hint
    if (!L.forkSaid && Math.hypot(c.pos.x - 44, c.pos.z + 92) < 16) { L.forkSaid = true; toast('A fork. One way says SHORTCUT.', 2.6); }
    // arrival
    const [ax, az, ar] = LAYOUT.storeArrive; if (Math.hypot(c.pos.x - ax, c.pos.z - az) < ar) finish(true);
    return nr;
  }
  L.carFwd = fwd;

  // per-frame
  L.update = (dt, t, { wolfPos, keys, wild, titleUp }) => {
    // wild tint for roads
    for (const [m, base] of L.roadMats) m.color.set(base).lerp(new THREE.Color('#c2507a'), wild * 0.75);
    if (L.storeGlow) L.storeGlow.material.opacity = 0.45 + 0.15 * Math.sin(t * 3) + wild * 0.2;
    if (L.pickupRing) { L.pickupRing.material.opacity = L.mode === 'walk' ? 0.55 + 0.3 * Math.sin(t * 3) : 0; }
    // tumbleweed: slow roll across the shortcut and back
    { const tw = L.tumble; tw.ph += dt * 0.11; const off = Math.sin(tw.ph) * 9; const nx = Math.cos(tw.yaw), nz = -Math.sin(tw.yaw);
      if (tw.push > 0) { tw.push -= dt; tw.cx += Math.sin(tw.pushDir) * dt * 6 * tw.push; tw.cz += Math.cos(tw.pushDir) * dt * 6 * tw.push; }
      tw.obj.position.set(tw.cx + nx * off, 0.62 + Math.abs(Math.sin(t * 2.2)) * 0.12, tw.cz + nz * off); tw.obj.rotation.x += dt * 0.6; tw.obj.rotation.z = Math.cos(tw.ph) * 1.5; }
    updateCast(dt, t, wolfPos);
    if (L.toastT > 0) { L.toastT -= dt; if (L.toastT <= 0 && hud.toast) hud.toast.style.opacity = 0; }
    // clock
    if (!titleUp && !L.ended) { L.started = true; L.left -= dt; if (L.left <= 0) { L.left = 0; finish(false); } }
    if (hud.clock) { hud.clock.textContent = fmt(L.left); hud.clock.classList.toggle('late', L.left < 30); }
    let nr = null;
    if (L.mode === 'drive') nr = updateCar(dt, keys); else { L.car.v *= Math.exp(-dt * 3); }
    animateBoots(dt, t);
    { const dc = Math.hypot(wolfPos.x - L.car.pos.x, wolfPos.z - L.car.pos.z);
      const want = titleUp ? 0 : L.inCar ? (L.mode === 'lost' ? 0.25 : 1) : clamp(1 - dc / 22, 0, 1) * 0.22; // loud in the car, faint from the street
      if (Math.abs(want - L.radioVol) > 0.02 || (want === 0 && L.radioVol !== 0)) { L.radioVol = want; radio.set(want); } }
    if (L.mode === 'walk') {
      const d = Math.hypot(wolfPos.x - L.car.pos.x, wolfPos.z - L.car.pos.z);
      if (hud.getIn) hud.getIn.style.display = d < 5 && !L.ended ? 'block' : 'none';
      if (d < 5 && (keys.KeyE || keys.Enter)) L.enterCar();
      if (hud.obj) hud.obj.textContent = 'Walk to the ride pickup, east end of the street.';
      if (hud.dist) hud.dist.textContent = Math.round(d) + ' m to pickup';
    } else if (L.mode === 'drive') {
      if (hud.obj) hud.obj.textContent = 'Get to the convenience store.';
      const [ax, az] = LAYOUT.storeArrive; const onMainIdx = nr.road === MAIN ? nr.i : nr.road === SHORT ? nearestIdx(MAIN.s, [nr.road.s[nr.i].x, nr.road.s[nr.i].z]) : 0;
      const remain = Math.max(Math.hypot(L.car.pos.x - ax, L.car.pos.z - az), MAIN.len - MAIN.cum[onMainIdx]);
      if (hud.dist) hud.dist.textContent = `STORE ${Math.round(remain)} m`;
    }
  };
  // seat transform for the wolf (world)
  const _q = new THREE.Vector3();
  L.seatWorld = (out) => { L.car.root.updateMatrixWorld(); return out.copy(L.seat).applyMatrix4(L.car.body.matrixWorld); };
  // chase camera
  L.chaseCam = (camera, dt, portrait, snap) => {
    const c = L.car, f = _q.set(Math.sin(c.yaw), 0, Math.cos(c.yaw));
    const dist = portrait ? 10.5 : 9, h = portrait ? 4.4 : 3.6;
    const want = new THREE.Vector3(c.pos.x - f.x * dist, h + c.hop * 0.5, c.pos.z - f.z * dist);
    if (snap) camera.position.copy(want); else camera.position.lerp(want, 1 - Math.exp(-dt * 4));
    const look = new THREE.Vector3(c.pos.x + f.x * 8, 2.5, c.pos.z + f.z * 8);
    camera.lookAt(look); return look;
  };
  return L;
}
