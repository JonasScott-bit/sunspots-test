// missions/water_tower.js — THE WATER TOWER (Night 2). Gecko climbed the town water tower at dusk to tie-dye it
// ("one colour, man"). Then the night got cold and gecko feet stop being sticky when they're cold. He's up by the red
// beacon, hugging it. Lynx holds the flashlight at the bottom and has opinions about technique.
// Climbing: drag anywhere to climb (up, down, around the tower). Grip drains while you hang on and refills on ledges
// (the cross-brace, the catwalk, the rim). GUST warnings: hold still. Pigeons peck: tap them to shoo. Wet tie-dye is
// slippery. Run out of grip and you slide to the last ledge. At the top Gecko climbs on your back: now climb DOWN.
// Stars: home · 1 slide or fewer · under 2:30. Secret: a felt kite has been stuck round the back of the tank since spring.
// QA: ?m=water_tower [&mauto] [&phase=down]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, canvasTex, Merge, mesh, box, cyl, ball, nightSky, nightLights, sfx, clamp, lerp, rng, pickNear, toScreen, blobShadow, TAU, M4, angLerp } from './kit.js';

registerMission({
  id: 'water_tower', key: 'wtow', title: 'THE WATER TOWER', chip: 'THE WATER TOWER', room: 'gecko', night: 2, where: "Gecko's laundry room",
  rumour: 'Somebody has been tie-dyeing the water tower. Half of it, anyway. The beacon is blinking in a worried way.',
  todo: 'Get Gecko down off the water tower (start at his laundry room)', doneMsg: '. Gecko is down. The tower is still half tie-dye.',
  suns: [{ id: 'wt_done', name: 'THE WATER TOWER', how: 'Bring Gecko down off the water tower' }, { id: 'wt_star', name: 'STICKY FEET', how: 'Three stars on the water tower' }, { id: 'wt_kite', name: 'THE KITE', how: "Something's been stuck on the water tower since spring" }],
  create,
});

const LAT = 3.4, TANK = 4.7, CAT = 12.2, RIM = 20.3, TOP = 21.7;
const LEDGES = [0, 6.1, CAT, RIM];
const rAt = (y) => (y < CAT - 0.05 ? LAT : y < RIM + 0.05 ? TANK + 0.25 : lerp(TANK + 0.2, 0.9, clamp((y - RIM) / (TOP + 0.6 - RIM), 0, 1)));

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#141634'); scene.fog = new THREE.Fog('#1a1838', 60, 320);
  const sky = nightSky(scene, { top: '#0a0c28', mid: '#22184a', low: '#3a2450', glow: '#ff9a6a', dusk: 0.12 }); nightLights(scene, { hemi: 1.0, moonI: 1.0 });
  const R = rng(1987), W = new THREE.Group(); scene.add(W);
  // town below: felt houses with lit windows, streetlight dots, the carnival wheel glowing in the distance
  { const m = new Merge(), gm = new Merge(); m.box(500, 0.2, 500, '#2a3a2a', 0, -0.1, 0);
    for (let i = 0; i < 70; i++) { const a = R() * TAU, d = 24 + R() * 140, x = Math.sin(a) * d, z = Math.cos(a) * d, w = 4 + R() * 4, h = 3 + R() * 4, c = R.pick(['#c9a27a', '#8aa2c2', '#c27a6a', '#e0c890', '#7a9a7a', '#b08ac2']);
      m.box(w, h, w * 0.8, c, x, h / 2, z, a); m.cone(w * 0.75, 2, '#5a2a2a', x, h + 1, z, 4, 0, a + Math.PI / 4); for (let k = 0; k < 2; k++) gm.box(0.8, 0.8, 0.05, R() < 0.7 ? '#ffd27a' : '#7a6a5a', x + Math.cos(a) * (k - 0.5) * w * 0.5 + Math.sin(a) * w * 0.41, h * 0.55, z - Math.sin(a) * (k - 0.5) * w * 0.5 + Math.cos(a) * w * 0.41, a); }
    W.add(m.mesh()); W.add(gm.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    const pts = []; for (let i = 0; i < 260; i++) { const a = R() * TAU, d = 20 + R() * 180; pts.push(Math.sin(a) * d, 0.5 + R() * 4, Math.cos(a) * d); } const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); W.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffd8a0', size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
    const wheel = new THREE.Group(); wheel.position.set(-120, 22, -150); W.add(wheel); const wg = new THREE.TorusGeometry(18, 0.5, 4, 40); wheel.add(new THREE.Mesh(wg, glowMat('#ff7ac2'))); for (let i = 0; i < 12; i++) { const s = glowSprite(i % 2 ? '#ffe86a' : '#7af2ff', 4, 4, 0.8); s.position.set(Math.cos(i / 12 * TAU) * 18, Math.sin(i / 12 * TAU) * 18, 0); wheel.add(s); } W.userData.wheel = wheel; }
  // the tower: four legs + a climbable lattice, a catwalk, a half-tie-dyed tank, a cone roof, a red beacon
  const tower = new THREE.Group(); scene.add(tower);
  const dye = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#b8c2c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa6ae'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
    const C = ['#ff5a8a', '#ffb23a', '#f6e04a', '#5ad27a', '#3ab8e0', '#9a6ae0']; for (let i = 0; i < 26; i++) { const cx = Math.random() * w * 0.5, cy = Math.random() * h; for (let r = 60; r > 4; r -= 9) { g.fillStyle = C[(i + r) % C.length]; g.globalAlpha = 0.6; g.beginPath(); g.arc(cx, cy, r * 0.8, 0, TAU); g.fill(); } } g.globalAlpha = 1;
    g.fillStyle = '#3a2a4a'; g.font = '900 54px Futura, system-ui'; g.textAlign = 'center'; g.fillText('PINEWOOD', w * 0.75, h * 0.56); });
  { const m = new Merge(); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; m.cyl(0.25, 0.32, CAT, '#8a8f9a', Math.sin(a) * LAT, CAT / 2, Math.cos(a) * LAT, 8); }
    for (let y = 1.5; y < CAT; y += 1.5) m.add(new THREE.TorusGeometry(LAT - 0.05, 0.06, 4, 16), y % 6 < 0.1 || Math.abs(y - 6) < 0.2 ? '#c9a24a' : '#8a8f9a', M4(0, y, 0, Math.PI / 2));
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; m.cyl(0.05, 0.05, CAT, '#7a7f8a', Math.sin(a) * (LAT - 0.05), CAT / 2, Math.cos(a) * (LAT - 0.05), 4); }
    m.add(new THREE.CylinderGeometry(TANK + 1.0, TANK + 1.0, 0.18, 24), '#6a6f7a', M4(0, CAT - 0.1, 0)); m.add(new THREE.TorusGeometry(TANK + 1.0, 0.06, 4, 28), '#c9a24a', M4(0, CAT + 0.9, 0, Math.PI / 2));
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; m.cyl(0.04, 0.04, 0.9, '#8a8f9a', Math.sin(a) * (TANK + 1.0), CAT + 0.45, Math.cos(a) * (TANK + 1.0), 4); }
    m.add(new THREE.ConeGeometry(TANK + 0.3, TOP + 0.6 - RIM, 18, 1, true), '#5a8aa8', M4(0, RIM + (TOP + 0.6 - RIM) / 2, 0)); m.add(new THREE.TorusGeometry(TANK + 0.15, 0.12, 4, 28), '#6a6f7a', M4(0, RIM, 0, Math.PI / 2));
    m.cyl(0.25, 0.3, 0.6, '#3a3a40', 0, TOP + 0.75, 0, 8); tower.add(m.mesh()); }
  mesh(new THREE.CylinderGeometry(TANK, TANK, RIM - CAT, 28, 1, true), new THREE.MeshLambertMaterial({ map: dye }), [0, (RIM + CAT) / 2, 0], tower);
  const beacon = mesh(new THREE.SphereGeometry(0.35, 10, 8), glowMat('#ff3a3a'), [0, TOP + 1.2, 0], tower), bglow = glowSprite('#ff3a3a', 5, 5, 0.8); bglow.position.copy(beacon.position); tower.add(bglow);
  // hazards + the kite
  const wet = [], birds = []; const surf = (th, y, off = 0) => new THREE.Vector3(Math.sin(th) * (rAt(y) + off), y, Math.cos(th) * (rAt(y) + off));
  for (const [th, y] of [[0.6, 14.5], [-0.9, 17.4], [2.2, 15.8], [0.1, 18.8], [-2.4, 13.6]]) { const p = mesh(new THREE.CircleGeometry(0.9, 12), felt('#3ad27a', { transparent: true, opacity: 0.85 }), null, tower); p.position.copy(surf(th, y, -0.2)); p.lookAt(surf(th, y, 3)); wet.push({ th, y, r: 0.95 }); }
  for (const [th, y] of [[0.35, 9.0], [-0.5, 16.0], [1.4, 18.0], [3.0, 7.5]]) { const g = new THREE.Group(), m = new Merge(); m.ball(0.28, '#8a8aa0', 0, 0.28, 0, 1, 0.9, 1.3); m.ball(0.18, '#6a6a8a', 0, 0.55, 0.22); m.cone(0.06, 0.16, '#e0a23a', 0, 0.55, 0.42, 4, Math.PI / 2); m.ball(0.06, '#ff7a3a', 0.08, 0.6, 0.34); g.add(m.mesh()); tower.add(g); birds.push({ g, th, y, th0: th, gone: 0, peck: 0 }); }
  const kite = new THREE.Group(); { const m = new Merge(); m.add(new THREE.CircleGeometry(0.8, 4), '#ff5a8a', M4(0, 0, 0, 0, 0, Math.PI / 4, 0.8, 1.2, 1)); m.box(0.04, 1.6, 0.02, '#f6efe0', 0, -1.1, 0); for (let i = 0; i < 3; i++) m.box(0.3, 0.12, 0.02, ['#ffe86a', '#3ab8e0', '#5ad27a'][i], 0.05 * i, -0.6 - i * 0.45, 0, 0.3); kite.add(new THREE.Mesh(m.mesh().geometry, felt('#ffffff', { vertexColors: true, side: THREE.DoubleSide }))); } const KTH = Math.PI, KY = 16.6; kite.position.copy(surf(KTH, KY, 0.15)); kite.lookAt(surf(KTH, KY, 3)); tower.add(kite);
  // the cast
  const wolf = CAST.wolf(), gecko = CAST.gecko(), lynx = CAST.lynx(); for (const p of [wolf, gecko, lynx]) scene.add(p); wolf.userData.shadow.visible = false; gecko.userData.shadow.visible = false;
  lynx.position.set(0, 0, LAT + 4); const torch = glowSprite('#fff2c8', 3.2, 3.2, 0.45); scene.add(torch); const beamTex = mesh(new THREE.CylinderGeometry(0.12, 1.6, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), null, scene);
  const P = { th: 0.1, y: 0, r: LAT, vth: 0, vy: 0, grip: 100, slide: 0, slideTo: 0, falls: 0, last: 0, carry: false, moving: 0, face: 0 };
  const G = { phase: 'off', t: 0, gust: 0, gustT: 9, kite: false, said: {}, auto: false, upT: 0 };
  const inst = { scene, camera, G, P, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const camS = { th: 0, y: 2 };
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; const down = c.opts?.phase === 'down';
    Object.assign(G, { phase: 'talk', t: 0, gust: 0, gustT: 10, kite: false, said: {}, upT: 0 }); Object.assign(P, { th: 0.1, y: down ? TOP - 0.2 : 0, vth: 0, vy: 0, grip: 100, slide: 0, falls: 0, last: down ? RIM : 0, carry: down });
    for (const b of birds) { b.gone = 0; b.th = b.th0; b.g.visible = true; } kite.visible = true;
    H.pill('h', '0 m'); H.pill('time', '0:00'); H.meter.style.display = 'block'; c.I.padOn = true;
    c.I.onTap = (x, y) => { const b = pickNear(birds.filter((q) => !q.gone).map((q) => q.g), x, y, camera, 80); if (b) { const q = birds.find((z) => z.g === b); shoo(q); return; } if (!G.kite && pickNear([kite], x, y, camera, 80)) grabKite(); };
    const lines = down ? [['GECKO', 'Okay. Down now. I believe in you, man.']] : [['LYNX', 'He went up at sunset with six buckets of dye.'], ['LYNX', 'Gecko feet stop being sticky when it gets cold. It got cold.'], ['GECKO (far away)', 'It is so beautiful up here. Help.'], ['LYNX', 'Drag to climb. Rest on the ledges. If the wind comes, hold still.'], ['LYNX', 'I will hold the flashlight. That is also a job.']];
    H.say(lines, () => { if (G.phase === 'talk') { G.phase = down ? 'down' : 'up'; G.t = 0; H.hint(down ? 'CLIMB DOWN' : 'CLIMB', 1.2); } });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 600);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  function shoo(q) { q.gone = 1; sfx.whoosh(); const sp = toScreen(q.g.position.clone(), camera); H.float(sp.x, sp.y, 'SHOO', '#bff2e0'); say(['PIGEON', R.pick(['Coo. Rude.', 'This is my tower.', 'Fine. FINE.'])]); }
  function grabKite() { G.kite = true; kite.visible = false; sfx.star(2); H.toast('☀ THE KITE'); say(['LYNX', 'That has been up there since April. It is Rabbit\'s. Do not tell her I knew.']); }
  function slide(why) { if (P.slide) return; let to = 0; for (const l of LEDGES) if (l < P.y - 0.4) to = l; if (P.carry) to = Math.max(to, 0); P.slide = 1; P.slideTo = to; P.falls++; sfx.bad(); H.hint(why, 1.4);
    say(P.carry ? ['GECKO', R.pick(['Whoa. Whoa. Okay. That was fun actually.', 'I felt that in my tail.'])] : ['LYNX', R.pick(['Ledges, Wolf. Ledges.', 'That looked bad from here. It was bad.', 'You slid. Slide less.'])]); }
  const onLedge = () => LEDGES.some((l) => Math.abs(P.y - l) < 0.35) || P.y <= 0.05;
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera); W.userData.wheel.rotation.z += dt * 0.08; bglow.material.opacity = 0.35 + 0.5 * (Math.sin(t * 3) > 0 ? 1 : 0.2);
    const climbing = G.phase === 'up' || G.phase === 'down';
    let ax = I.axis(); if (G.auto) ax = autoAx(); if (!climbing || P.slide) ax = { x: 0, y: 0 };
    // gusts
    if (climbing) { G.gustT -= dt; if (G.gustT <= 0 && G.gust === 0 && P.y > 4) { G.gust = 1; G.gustK = 1.3; H.hint('GUST! HOLD STILL', 0); sfx.whoosh(); } if (G.gust === 1) { G.gustK -= dt; if (G.gustK <= 0) { G.gust = 2; G.gustK = 1.6; sfx.whoosh(); } }
      if (G.gust === 2) { G.gustK -= dt; if (Math.hypot(ax.x, ax.y) > 0.3 && !onLedge()) { G.gust = 0; G.gustT = 9 + R() * 4; slide('BLOWN OFF'); } if (G.gustK <= 0) { G.gust = 0; G.gustT = 8 + R() * 5; H.hint('', 0); if (!G.said.gust) { G.said.gust = 1; say(['LYNX', 'Good. Like a sloth. A sloth with a plan.']); } } } }
    // climbing
    if (P.slide) { P.y = Math.max(P.slideTo, P.y - dt * 9); P.vth = 0; if (P.y <= P.slideTo + 0.01) { P.slide = 0; P.grip = Math.max(P.grip, 55); } }
    else if (climbing) {
      let wetK = 1; for (const w of wet) { if (Math.abs(Math.atan2(Math.sin(P.th - w.th), Math.cos(P.th - w.th))) * rAt(P.y) < w.r && Math.abs(P.y - w.y) < w.r) wetK = 3; }
      const spd = (P.carry ? 1.35 : 1.7) * (P.grip < 20 ? 0.6 : 1), mv = Math.hypot(ax.x, ax.y); P.moving = mv;
      P.vy = lerp(P.vy, -ax.y * spd, Math.min(1, dt * 8)); P.vth = lerp(P.vth, ax.x * spd / rAt(P.y), Math.min(1, dt * 8));
      const ny = clamp(P.y + P.vy * dt, 0, TOP); P.y = P.y < CAT && ny >= CAT && ny < CAT + 0.4 ? CAT : ny; P.th += P.vth * dt;
      if (onLedge()) P.grip = Math.min(100, P.grip + dt * 28); else P.grip -= dt * (mv > 0.2 ? 8 : 2.6) * wetK * (P.carry ? 1.3 : 1);
      if (wetK > 1 && !G.said.wet) { G.said.wet = 1; say(['GECKO (far away)', 'Careful, the dye is still wet. Isn\'t it gorgeous?']); }
      if (P.grip <= 0) { P.grip = 0; slide('NO GRIP'); }
      for (const b of birds) { if (b.gone) continue; const d = Math.abs(Math.atan2(Math.sin(P.th - b.th), Math.cos(P.th - b.th))) * rAt(P.y), dy = Math.abs(P.y - b.y); if (d < 0.9 && dy < 0.9 && t - b.peck > 1.2) { b.peck = t; P.grip -= 18; P.th += 0.3 * Math.sign(P.th - b.th || 1); sfx.bonk(); const sp = toScreen(b.g.position, camera); H.float(sp.x, sp.y, 'PECK', '#f2b0a0'); if (!G.said.bird) { G.said.bird = 1; say(['LYNX', 'Tap the pigeon. Tap it.']); } } }
      if (!G.kite && Math.abs(Math.atan2(Math.sin(P.th - KTH), Math.cos(P.th - KTH))) < 0.25 && Math.abs(P.y - KY) < 0.8) grabKite();
      if (G.phase === 'up' && P.y >= TOP - 0.05) { G.phase = 'top'; G.upT = G.t; sfx.good(); H.hint('', 0); H.say([['GECKO', 'Wolf! Man! Look at the carnival from here.'], ['WOLF', 'Get on my back.'], ['GECKO', 'Every colour is one colour from up here.'], ['WOLF', 'Get on my back.']], () => { P.carry = true; G.phase = 'down'; H.hint('NOW CLIMB DOWN', 1.4); P.last = RIM; }); }
      if (G.phase === 'down' && P.y <= 0.02) finish();
      if (!G.said.cat && P.y >= CAT && G.phase === 'up') { G.said.cat = 1; say(['LYNX', 'The catwalk. Rest. Breathe. Look at nothing.']); }
    }
    P.r = lerp(P.r, rAt(P.y), Math.min(1, dt * 10));
    for (const b of birds) { if (b.gone) { b.gone += dt; b.g.position.y += dt * 4; b.g.position.x += dt * 3; if (b.gone > 3) b.g.visible = false; } else { b.th = b.th0 + Math.sin(t * 0.3 + b.th0) * 0.3; b.g.position.copy(surf(b.th, b.y, 0.25)); b.g.rotation.y = b.th + Math.sin(t * 2) * 0.4; } }
    // the wolf on the tower (back to us), Gecko up top or riding along
    wolf.position.set(Math.sin(P.th) * (P.r + 0.35), P.y, Math.cos(P.th) * (P.r + 0.35)); wolf.rotation.y = P.th + Math.PI; animPal(wolf, dt, t, { walk: climbing ? Math.min(1, P.moving * 1.2) : 0, wave: G.phase === 'top' ? 1 : 0, panic: P.slide ? 1 : 0 });
    wolf.rotation.x = P.y >= RIM ? -0.5 : 0;
    if (P.carry) { gecko.position.copy(wolf.position).add(new THREE.Vector3(Math.sin(P.th) * 0.35, 1.05, Math.cos(P.th) * 0.35)); gecko.rotation.y = wolf.rotation.y; gecko.scale.setScalar(0.8); animPal(gecko, dt, t, { cheer: 0.5 }); }
    else { gecko.position.set(0.5, TOP + 0.6, 0.4); gecko.rotation.y = Math.sin(t) * 0.5; animPal(gecko, dt, t, { panic: 1 }); }
    animPal(lynx, dt, t, {}); lynx.rotation.y = Math.atan2(wolf.position.x - lynx.position.x, wolf.position.z - lynx.position.z);
    torch.position.copy(wolf.position).add(new THREE.Vector3(Math.sin(P.th) * -0.2, 1, Math.cos(P.th) * -0.2)); { const a = lynx.position.clone().setY(1.6), b2 = torch.position, L = a.distanceTo(b2); beamTex.position.copy(a).lerp(b2, 0.5); beamTex.scale.set(1, L, 1); beamTex.lookAt(b2); beamTex.rotateX(Math.PI / 2); }
    // hud
    if (climbing || G.phase === 'top') { H.pill('h', `${Math.round(P.y)} m${P.carry ? ' · 🦎 ON BACK' : ''}`); H.pill('time', `${Math.floor(G.t / 60)}:${String(Math.floor(G.t % 60)).padStart(2, '0')}`); H.setMeter(P.grip / 100, onLedge() ? 'GRIP · RESTING' : P.grip < 25 ? 'GRIP · LOW!' : 'GRIP'); }
    // camera: orbit outside the climber, a little below, looking up the tower
    const por = camera.aspect < 1; camS.th = angLerp(camS.th, P.th, Math.min(1, dt * 3)); camS.y = lerp(camS.y, P.y, Math.min(1, dt * 4));
    const cd = P.r + (por ? 15 : 9), ch = camS.y + (por ? 1.5 : 2.0); camera.position.set(Math.sin(camS.th) * cd, Math.max(1.2, ch), Math.cos(camS.th) * cd); camera.lookAt(Math.sin(camS.th) * P.r * 0.6, camS.y + (por ? 3.0 : 1.6), Math.cos(camS.th) * P.r * 0.6);
  };
  function finish() { G.phase = 'done'; sfx.good(); const time = G.t, stars = 1 + (P.falls <= 1 ? 1 : 0) + (time < 150 ? 1 : 0); const suns = ['wt_done']; if (stars === 3) suns.push('wt_star'); if (G.kite) suns.push('wt_kite');
    H.say([['GECKO', 'Solid ground. It is so boring. I love it.'], ['LYNX', 'You were great, Wolf. I mean it. Mostly the second half.']], () => ctl.finish({ win: true, stars, title: 'GECKO IS DOWN', lines: [`${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')} · ${P.falls} slide${P.falls === 1 ? '' : 's'}`, 'GECKO: "Next week: the other half."'], suns })); }
  function autoAx() { // QA autopilot: rest on ledges, hold still in gusts, shoo pigeons, steer round wet paint
    if (G.gust) return { x: 0, y: 0 }; const goingUp = G.phase === 'up'; if (onLedge() && P.grip < 95 && P.y > 0.1 && P.y < TOP - 0.1) return { x: 0, y: 0 };
    for (const b of birds) if (!b.gone && Math.abs(b.y - P.y) < 3 && Math.abs(Math.atan2(Math.sin(P.th - b.th), Math.cos(P.th - b.th))) < 0.8) shoo(b);
    let x = 0; for (const w of wet) { const d = Math.atan2(Math.sin(P.th - w.th), Math.cos(P.th - w.th)); if (Math.abs(w.y - P.y) < 1.8 && Math.abs(d) * rAt(P.y) < 1.6) x = d >= 0 ? 1 : -1; }
    return { x, y: goingUp ? -1 : 1 }; }
  return inst;
}
