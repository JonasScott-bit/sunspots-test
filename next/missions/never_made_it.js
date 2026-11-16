// missions/never_made_it.js — NEVER MADE IT (Night 3). Wrench has never made it to Last Minute Snacks before 2:00. Not
// once. Every night at 1:58 he is seen pushing a dead car down Main St. Crow has a yard full of junk and an idea.
//  1 THE BUILD — six parts, three choices each, from Crow's junk: chassis, wheels, engine, steering, seat, extras.
//    Every part has weight, power and grip. If the weight beats the power it won't start ("it's a sculpture").
//  2 THE RUN — whatever you built, drive it from Crow's yard to Last Minute Snacks out on the edge of town. 1:57:30 AM.
//    The doors lock at 2:00. Your car handles like what you built it from.
// Stars: made it · 2 bumps or fewer · there by 1:59. Secret: build it with the KSUN radio (it only gets one station).
// QA: ?m=never_made_it [&mauto] [&phase=run]
import * as THREE from 'three';
import { registerMission, CAST, animPal, nightSky, nightLights, sign, felt, glowMat, glowSprite, glowTex, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, toScreen, blobShadow, TAU, M4 } from './kit.js';
import { createDrive } from './drivecore.js';

registerMission({
  id: 'never_made_it', key: 'wrench', title: 'NEVER MADE IT', chip: 'NEVER MADE IT', room: 'yard', night: 3, where: "Crow's yard (Wrench)",
  rumour: 'Every night at 1:58 somebody pushes a dead car down Main St. He has never made it to the store by 2.',
  todo: "Build Wrench a car from Crow's junk and get him to the store by 2:00", doneMsg: '. Wrench made it. First time ever. He bought one gum.',
  suns: [{ id: 'nm_done', name: 'NEVER MADE IT', how: "Build Wrench a car from Crow's junk and get him there by 2" }, { id: 'nm_star', name: 'JUNK GENIUS', how: 'Three stars on the junk-car run' }, { id: 'nm_radio', name: 'ONE STATION', how: 'Build the car with a radio in it' }],
  create,
});
// [label, weight, power, grip, line]
const SLOTS = [
  ['CHASSIS', [['SHOPPING CART', 1, 0, 1, 'CROW: "It has a wobbly wheel. That is character."'], ['BATHTUB', 3, 0, 2, 'CROW: "Claw feet. It will never tip. It will barely move."'], ['A DOOR', 0, 0, 0, 'CROW: "Light. Flat. Knob included."']]],
  ['WHEELS', [['BIKE WHEELS', 0, 0, 1, 'WRENCH: "Thin. Quick. Like me in 1970."'], ['TRACTOR TYRES', 2, 0, 3, 'CROW: "From the farm. The horse does not need them."'], ['ROLLER SKATES', 0, 0, -1, 'CROW: "Very fast. Not in any direction you pick."']]],
  ['ENGINE', [['LAWNMOWER', 1, 5, 0, 'CROW: "Pull the cord. Keep pulling."'], ['BLENDER', 0, 3, 0, 'WRENCH: "Smoothie speed."'], ['LEAF BLOWER', 1, 7, 0, 'CROW: "It blows. Backwards. Which is forwards for us."']]],
  ['STEERING', [['FRYING PAN', 0, 0, 1, 'WRENCH: "Cast iron. Breakfast later."'], ['A RECORD', 0, 0, 0, 'CROW: "Side B. Nobody plays side B."'], ['BOAT WHEEL', 1, 0, 2, 'CROW: "From a boat. The boat is fine."']]],
  ['SEAT', [['COUCH CUSHION', 0, 0, 0, 'WRENCH: "Found a dime in it."'], ['A BUCKET', 0, 0, 1, 'CROW: "Upside down. You sit on the bottom."'], ["CROW'S CHAIR", 1, 0, 0, 'CROW: "That is my chair. Take it. Take it."']]],
  ['EXTRAS', [['KSUN RADIO', 1, 0, 0, 'CROW: "It only gets one station. Good one."'], ['FUZZY DICE', 0, 0, 0, 'WRENCH: "For luck. I have never had luck."'], ['NOTHING', 0, 0, 0, 'CROW: "Minimalist."']]],
];
const LIMIT = 150, CAMO = { dist: 7.0, height: 3.3, lookY: 1.3 };

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#141634'); scene.fog = new THREE.Fog('#1a1838', 40, 260);
  const sky = nightSky(scene, { top: '#0a0c28', mid: '#22184a', low: '#4a2e5e', glow: '#ff8a5a', dusk: 0.06 }); nightLights(scene);
  const R = rng(1958);
  // the car: one group whose body fills up part by part (it is also the player car in the run)
  const car = new THREE.Group(), body = new THREE.Group(); car.add(body); const sh = blobShadow(1.5, 0.45); sh.scale.set(0.8, 1.35, 1); car.add(sh);
  const beam = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: glowTex(), color: '#fff0b8', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); beam.rotation.x = -Math.PI / 2; beam.scale.set(2.2, 4.5, 1); beam.position.set(0, 0.05, 5.2); car.add(beam);
  car.userData = { body, wheels: [], beam }; const parts = Array(6).fill(null);
  function build(slot, i) { if (parts[slot]) { body.remove(parts[slot]); if (slot === 1) car.userData.wheels = []; } const g = new THREE.Group(), m = new Merge();
    if (slot === 0) { if (i === 0) { for (const y of [0.55, 1.15]) { m.box(1.4, 0.05, 2.4, '#b8c0c8', 0, y, 0); } for (const x of [-0.7, 0.7]) for (const z of [-1.2, 1.2]) m.box(0.05, 0.65, 0.05, '#b8c0c8', x, 0.85, z); for (let z = -1.1; z <= 1.1; z += 0.3) for (const x of [-0.7, 0.7]) m.box(0.03, 0.6, 0.03, '#9aa2aa', x, 0.85, z); m.box(1.4, 0.06, 0.06, '#c9302a', 0, 1.35, -1.45); }
      else if (i === 1) { m.box(1.5, 0.7, 2.6, '#f6f2e8', 0, 0.85, 0); m.box(1.3, 0.1, 2.3, '#cfe6f0', 0, 1.18, 0); for (const x of [-0.6, 0.6]) for (const z of [-1.1, 1.1]) m.ball(0.12, '#c9a24a', x, 0.45, z); }
      else { m.box(1.3, 0.12, 2.6, '#a8784a', 0, 0.6, 0); m.box(1.0, 0.04, 0.9, '#8a5a3a', 0, 0.68, 0.6); m.box(1.0, 0.04, 0.9, '#8a5a3a', 0, 0.68, -0.6); m.ball(0.07, '#c9a24a', 0.5, 0.7, 0); } }
    if (slot === 2) { const y = 1.0, z = 1.0; if (i === 0) { m.box(0.8, 0.5, 0.6, '#c9302a', 0, y, z); m.cyl(0.18, 0.18, 0.2, '#3a3a40', 0, y + 0.35, z, 8); m.box(0.04, 0.04, 0.5, '#2a2a30', 0.3, y + 0.2, z - 0.3); }
      else if (i === 1) { m.cyl(0.25, 0.3, 0.3, '#3a3a40', 0, y - 0.05, z, 10); m.cyl(0.22, 0.18, 0.55, '#cfe6f0', 0, y + 0.37, z, 10); m.ball(0.18, '#f2a0b8', 0, y + 0.3, z, 1, 0.8, 1, 8, 6); }
      else { m.cyl(0.16, 0.16, 1.6, '#ff7a3a', 0, y + 0.2, -0.6, 10, Math.PI / 2); m.box(0.5, 0.5, 0.5, '#ff7a3a', 0.3, y + 0.1, z); m.cyl(0.24, 0.16, 0.2, '#3a3a40', 0, y + 0.2, -1.45, 10, Math.PI / 2); } }
    if (slot === 3) { const p = [0.32, 1.35, 0.35]; if (i === 0) { m.cyl(0.26, 0.24, 0.06, '#2a2426', ...p, 12, 1.0); m.box(0.06, 0.06, 0.5, '#2a2426', p[0], p[1] - 0.2, p[2] + 0.2, 0, 1.0); }
      else if (i === 1) { m.cyl(0.3, 0.3, 0.02, '#1d1416', ...p, 16, 1.0); m.cyl(0.1, 0.1, 0.03, '#e0503a', ...p, 8, 1.0); }
      else { m.add(new THREE.TorusGeometry(0.28, 0.04, 4, 12), '#8a5a3a', M4(p[0], p[1], p[2], 1.0 - Math.PI / 2)); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; m.box(0.03, 0.03, 0.75, '#8a5a3a', p[0] + Math.cos(a) * 0.01, p[1] + Math.sin(a) * 0.3 * Math.cos(1.0), p[2] - Math.sin(a) * 0.3 * Math.sin(1.0), 0, 1.0 - Math.PI / 2, a); } } }
    if (slot === 4) { const p = [0.32, 0.95, -0.25]; if (i === 0) m.box(0.75, 0.22, 0.75, '#c98a6a', ...p); else if (i === 1) m.cyl(0.32, 0.26, 0.4, '#3a8ac2', p[0], p[1] + 0.05, p[2], 10); else { m.box(0.7, 0.1, 0.7, '#6a4a2a', ...p); m.box(0.7, 0.8, 0.1, '#6a4a2a', p[0], p[1] + 0.4, p[2] - 0.35); } }
    if (slot === 5) { if (i === 0) { m.box(0.5, 0.3, 0.2, '#3a2a2a', -0.4, 1.2, 0.6); m.box(0.02, 0.5, 0.02, '#c9c0b0', -0.55, 1.55, 0.6); } else if (i === 1) { m.box(0.14, 0.14, 0.14, '#f6f2e8', 0.3, 1.75, 0.6, 0.4); m.box(0.14, 0.14, 0.14, '#f2a0b8', 0.45, 1.7, 0.6, -0.3); } }
    if (slot === 1) { const WP = [[-0.8, 1.0], [0.8, 1.0], [-0.8, -1.0], [0.8, -1.0]]; const [r, w, c] = [[0.42, 0.08, '#2a2426'], [0.5, 0.42, '#1a1618'], [0.16, 0.12, '#c9302a']][i];
      for (const [x, z] of WP) { const wm = mesh(new THREE.CylinderGeometry(r, r, w, 12), c, [x, r, z], car); wm.rotation.z = Math.PI / 2; car.userData.wheels.push(wm); if (i === 2) box(0.3, 0.3, 0.45, '#f6efe0', [x, r + 0.25, z], wm.parent); }
      g.userData.wheels = car.userData.wheels.slice(); }
    g.add(m.mesh()); body.add(g); parts[slot] = g; if (slot === 1) { for (const w of g.userData.wheels) { car.remove(w); g.add(w); } } }
  const choice = [];
  // Crow's yard (build view), off at x=4000
  const yard = new THREE.Group(); yard.position.x = 4000; scene.add(yard);
  { const m = new Merge(); m.box(40, 0.2, 40, '#5a4a3a', 0, -0.1, 0); for (let i = 0; i < 26; i++) { const a = R() * TAU, d = 6 + R() * 6; m.box(0.6 + R() * 1.6, 0.4 + R() * 1.4, 0.6 + R() * 1.4, R.pick(['#8a8f9a', '#c9302a', '#3a6a8a', '#c9a24a', '#5a5a62', '#e0c890']), Math.sin(a) * d * 1.2, 0.5, -Math.abs(Math.cos(a)) * d - 3, a); }
    for (let x = -12; x <= 12; x += 1.2) m.box(0.08, 2.4, 0.08, '#9aa2aa', x, 1.2, -10); m.box(24, 0.06, 0.06, '#9aa2aa', 0, 2.3, -10); yard.add(m.mesh()); }
  const yl = new THREE.PointLight('#ffd8a8', 26, 22, 1.4); yl.position.set(4002, 6, 4); scene.add(yl); const yglow = glowSprite('#ffd8a8', 3, 3, 0.6); yglow.position.set(2, 6, 4); yard.add(yglow);
  const crowS = sign("CROW'S YARD · EVERYTHING WORKS (ONCE)", 7, 0.8, { bg: '#2a2240', fg: '#ffe1a8' }); crowS.position.set(0, 2.75, -9.9); yard.add(crowS);
  const wrench = CAST.wrench(), crow = CAST.crow(); wrench.position.set(-2.4, 0, 1.2); crow.position.set(2.6, 0, 0.8); wrench.rotation.y = 0.6; crow.rotation.y = -0.6; yard.add(wrench, crow);
  yard.add(car);
  // the run: edge of town, out to the store
  const route = [[300, 0], [100, 40], [320, 0], [90, -55], [360, 5], [80, 30], [400, 0], [120, -20], [300, 0]];
  const D = createDrive(scene, { theme: 'edge', route, cross: [260, 700, 1150, 1600], player: null, cruise: 20, max: 26, boostV: 30, seed: 158, traffic: { same: 6, oncoming: 6, cross: 1 }, peds: 6 });
  D.root.remove(D.P.obj); D.root.visible = false;
  const store = new THREE.Group(); { const m = new Merge(); m.box(12, 5, 7, '#e9c27e', 0, 2.5, 0); m.box(4, 3, 0.1, '#ffe8a8', 0, 1.5, 3.55); store.add(m.mesh()); } const neon = sign('LAST MINUTE SNACKS', 8, 1.2, { bg: '#2a1a3a', fg: '#ff7ac2', glow: true }); neon.position.set(0, 5.8, 3.6); store.add(neon); D.root.add(store); D.place(store, D.LEN - 25, D.HALF + 10, -Math.PI / 2);
  const G = { phase: 'off', t: 0, slot: 0, auto: false, said: {}, spd: 20, steer: 9 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const stats = () => { let w = 0, p = 0, g = 0; choice.forEach((c, s) => { if (c === undefined) return; const o = SLOTS[s][1][c]; w += o[1]; p += o[2]; g += o[3]; }); return { w, p, g }; };
  function showSlot() { const S = SLOTS[G.slot]; const st = stats(); H.panel(`<b>PART ${G.slot + 1} OF 6 · ${S[0]}</b><div style="font:600 14px system-ui">POWER ${st.p} · WEIGHT ${st.w} · GRIP ${st.g}</div>`);
    H.pads(S[1].map((o, i) => ({ label: `${o[0]}<br><small style="font-weight:600;letter-spacing:0">${o[1] ? 'W' + o[1] : ''}${o[2] ? ' P' + o[2] : ''}${o[3] ? ` G${o[3] > 0 ? '+' : ''}${o[3]}` : ''}</small>`, col: ['#e0a03a', '#7ac2c2', '#c9b8f2'][i] })), pick); }
  function pick(i) { if (G.phase !== 'build') return; const S = SLOTS[G.slot]; choice[G.slot] = i; build(G.slot, i); sfx.bonk(); sfx.catch(); const o = S[1][i]; const who = o[4].split(':')[0]; H.say([[who, o[4].slice(who.length + 2).replace(/"/g, '')]]);
    G.slot++; if (G.slot < 6) { showSlot(); return; } const st = stats();
    if (st.p <= st.w) { G.phase = 'wait'; H.panel(`<b>IT WON'T START</b>POWER ${st.p} · WEIGHT ${st.w}`); H.say([['', 'Wrench pulls the cord. Pulls it again. Nothing.'], ['CROW', "It's a sculpture. It's a nice sculpture. Pick a bigger engine or a lighter frame."]], () => { G.phase = 'build'; G.slot = st.w >= 4 ? 0 : 2; showSlot(); }); return; }
    G.phase = 'wait'; H.panel(null); G.spd = clamp(15 + st.p * 1.4 - st.w * 0.6, 14, 27); G.steer = clamp(6 + st.g * 1.4, 4, 13);
    H.say([['', 'Wrench pulls the cord. It coughs. It catches. It is a car. Probably.'], ['WRENCH', 'It is 1:57 and a half. I have never made it.'], ['CROW', 'You have never had a bathtub with a lawnmower in it.'], ['WRENCH', 'Drive. You drive. I will believe.']], () => toRun()); }
  function toRun() { H.reset('NEVER MADE IT'); G.phase = 'count'; G.t = 0; yard.remove(car); car.position.set(0, 0, 0); car.rotation.set(0, 0, 0); D.P.obj = car; D.root.add(car); D.root.visible = true; yard.visible = false;
    const sw = CAST.wrench(); sw.scale.setScalar(0.8); sw.position.set(0.32, 0.75, -0.25); sw.userData.shadow.visible = false; body.add(sw); G.driver = sw; const sc = CAST.crow(); sc.scale.setScalar(0.75); sc.position.set(-0.35, 0.7, -0.6); sc.userData.shadow.visible = false; body.add(sc); G.pass = sc;
    D.reset(10, 3); D.P.cruise = 0; D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1, CAMO); H.pill('clock', '1:57:30 AM'); H.pill('car', `SPEED ${Math.round(G.spd)} · GRIP ${Math.round(G.steer)}`); H.button('boost', 'FLOOR<br>IT'); ctl.I.padOn = true;
    if (choice[5] === 0) { sfx.sun(); say(['KSUN (radio)', "It's late. You're listening to KSUN. It's the only station."]); } }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, slot: 0, said: {} }); choice.length = 0; for (let s = 0; s < 6; s++) if (parts[s]) { body.remove(parts[s]); parts[s] = null; } car.userData.wheels = [];
    if (G.driver) { body.remove(G.driver, G.pass); G.driver = null; } if (car.parent !== yard) { car.parent?.remove(car); yard.add(car); } car.position.set(0, 0, 0); car.rotation.set(0, 0.7, 0); yard.visible = true; D.root.visible = false;
    if (c.opts?.phase === 'run') { [0, 0, 2, 2, 1, 0].forEach((v, s) => { choice[s] = v; build(s, v); }); G.spd = 22; G.steer = 10; return toRun(); }
    c.I.padOn = false; camera.fov = 52; camera.updateProjectionMatrix();
    H.say([['WRENCH', "Every night. 1:58. My car dies on Main Street. I push it. I never make it."], ['CROW', 'I have a yard full of things that are almost cars.'], ['CROW', 'Six parts. Three of each. The engine has to beat the weight.']], () => { G.phase = 'build'; showSlot(); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); else if (G.phase === 'build') pick([0, 0, 2, 2, 1, 0][G.slot]); }, 700);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  const clockStr = (sec) => { const s = 117 * 60 + 30 + Math.floor(sec); return `1:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} AM`; };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera);
    if (yard.visible) { car.rotation.y += dt * 0.3; animPal(wrench, dt, t, { cheer: G.phase === 'wait' ? 1 : 0 }); animPal(crow, dt, t, { wave: H.talking() ? 1 : 0 });
      const por = camera.aspect < 1, hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect; camera.position.set(4000, por ? 4.6 : 3.4, por ? Math.max(11, 3.6 / hf) : 7.5); camera.lookAt(4000, por ? -0.6 : 0.9, 0); return; }
    let ax = I.axis(); if (G.auto) ax = { x: autoAx() }; const run = G.phase === 'run';
    if (G.phase === 'count') { const n = 3 - Math.floor(G.t); H.hint(n > 0 ? String(n) : 'GO!', 0); if (G.t > 3) { G.phase = 'run'; G.t = 0; H.hint('GO!', 0.8); sfx.ok(); } }
    D.P.cruise = run ? G.spd : 0; ax = { x: ax.x * G.steer / 9 + (choice[1] === 2 && run ? Math.sin(t * 2.3) * 0.25 : 0) };
    D.update(dt, t, run ? ax : { x: 0 }, run && (H.btn.boost?.down || I.keys[' '] || (G.auto && D.P.boostCharge >= 1))); D.cam(camera, dt, CAMO); animPal(G.driver, dt, t, {}); animPal(G.pass, dt, t, { cheer: D.P.boost > 0 ? 1 : 0 });
    if (run) { const left = LIMIT - G.t; H.pill('clock', clockStr(G.t), left < 20);
      for (const e of D.events.splice(0)) if (e === 'bump' || e === 'tbone' || e === 'hit') { sfx.crash(); say(['WRENCH', R.pick(['It held! It held.', 'Something fell off. Something we did not need.', 'Do not look back.'])]); }
      if (!G.said.half && D.P.s > D.LEN / 2) { G.said.half = 1; say(['WRENCH', 'This is further than I have ever got.']); }
      if (D.P.s >= D.LEN - 28) { G.phase = 'done'; D.P.done = true; const time = G.t, stars = 1 + (D.P.bumps <= 2 ? 1 : 0) + (time <= 90 ? 1 : 0); const suns = ['nm_done']; if (stars === 3) suns.push('nm_star'); if (choice[5] === 0) suns.push('nm_radio');
        H.say([['', `Last Minute Snacks. The clock over the door says ${clockStr(time).replace(' AM', '')}.`], ['WRENCH', 'I made it.'], ['WRENCH', 'I made it. I do not need anything. I just wanted to come in.'], ['', 'He buys one gum.']], () => ctl.finish({ win: true, stars, title: 'WRENCH MADE IT', lines: [`${clockStr(time)} · ${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'}`, `Built from: ${choice.map((c, s) => SLOTS[s][1][c][0].toLowerCase()).join(', ')}`], suns })); }
      else if (left <= 0) { G.phase = 'done'; D.P.done = true; H.say([['', '2:00. Somewhere ahead, a neon sign turns off.'], ['WRENCH', 'Tomorrow. It is a good car. It is a good car.']], () => ctl.finish({ win: false, stars: 0, title: 'NEVER MADE IT. AGAIN.', lines: ['Try a lighter build, or more engine.'], suns: [] })); } }
  };
  function autoAx() { const P = D.P; let want = 3; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 20 && Math.abs(n.x - want) < 2.2) want = 1; } return clamp((want - P.x) * 0.6, -1, 1); }
  return inst;
}
