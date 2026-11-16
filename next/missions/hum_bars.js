// missions/hum_bars.js — HUM A FEW BARS (Night 5). League night at the Gutter Bowl. The Hummingbird (he hums; he does not
// know the words) snatches the league trophy off the shelf and zips out the door. Ram's team won it. Ram is furious,
// in a calm way. The Wolf grabs the nearest ride: Gravy, Bear's horse, tied up outside.
// Chase down the Neon Strip at night on horseback: steer, JUMP the junk he knocks into the road (pins, sandwich boards,
// a runaway ball return), GALLOP when the horseshoe fills. When he dips low to gloat, get under him and GRAB.
// He wriggles free twice; the third grab sticks. If he reaches the end of the Strip first, he's gone.
// Stars: the trophy back · 2 bumps or fewer · caught him before the last stretch. Secret: hum along (catch all 12 gold notes).
// QA: ?m=hum_bars [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, nightSky, nightLights, sign, felt, glowMat, glowSprite, Merge, cyl, sfx, clamp, lerp, rng, toScreen } from './kit.js';
import { createDrive } from './drivecore.js';
import { buildHorseParts, PET_COL } from '../horses.js';

registerMission({
  id: 'hum_bars', key: 'hum', title: 'HUM A FEW BARS', chip: 'HUM A FEW BARS', room: 'bowl', night: 5, where: 'Gutter Bowl → the Neon Strip',
  rumour: 'The league trophy at the Gutter Bowl has a little hummingbird-sized dent in it. Ram says it is not funny.',
  todo: 'Get the league trophy back from the Hummingbird (the Gutter Bowl)', doneMsg: '. The trophy is back on the shelf. Gravy got a carrot.',
  suns: [{ id: 'hb_done', name: 'HUM A FEW BARS', how: 'Get the league trophy back' }, { id: 'hb_star', name: 'TRIPLE CROWN', how: 'Three stars on Gravy' }, { id: 'hb_hum', name: 'HUM ALONG', how: 'Catch all twelve gold notes he drops' }],
  tip: 'DRAG TO STEER · JUMP THE JUNK · GRAB WHEN HE DIPS',
  create,
});
const CAMO = { dist: 7.2, height: 4.8, lookY: 1.6 };

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#120e26'); scene.fog = new THREE.Fog('#1a1230', 45, 230);
  const sky = nightSky(scene, { top: '#0a0820', mid: '#24164a', low: '#4a2050', glow: '#ff5aa8', dusk: 0.05 }); nightLights(scene, { hemi: 1.0 });
  const R = rng(5150);
  // Gravy + riders (horse faces +x; drive objects face +z)
  const ride = new THREE.Group(), body = new THREE.Group(); ride.add(body);
  const HP = buildHorseParts({ col: PET_COL, feltMat: felt, LOW: true }); HP.root.rotation.y = -Math.PI / 2; HP.root.scale.setScalar(1.45); body.add(HP.root);
  const wolf = CAST.wolf(), ram = CAST.ram(); for (const [p, z, y] of [[wolf, 0.05, 1.37], [ram, -0.62, 1.4]]) { p.scale.setScalar(0.95); p.position.set(0, y, z); p.userData.shadow.visible = false; body.add(p); }
  const beam = new THREE.SpotLight('#ffe8c0', 0, 30, 0.6, 0.6, 1); ride.userData = { body, beam };
  const route = [[260, 0], [70, 35], [300, 0], [80, -40], [320, 0], [60, 25], [300, 0]];
  const D = createDrive(scene, { theme: 'strip', route, player: ride, cruise: 19, max: 26, boostV: 30, boostTime: 2.4, boostRecharge: 6, seed: 515, traffic: { same: 6, oncoming: 7, cross: 0 }, peds: 16, jump: true, steer: 8 });
  // the Hummingbird with the trophy
  const hum = CAST.hummer(); hum.scale.setScalar(2.2); hum.add(glowSprite('#7af2c2', 2.4, 2.4, 0.35)); const troph = new THREE.Group(); { const m = new Merge(); m.cyl(0.18, 0.08, 0.3, '#f2c230', 0, 0.3, 0, 12); m.cyl(0.05, 0.05, 0.2, '#f2c230', 0, 0.08, 0, 6); m.box(0.26, 0.06, 0.26, '#8a5a3a', 0, -0.03, 0); troph.add(m.mesh()); troph.add(glowSprite('#ffd86a', 1.2, 1.2, 0.45)); }
  troph.position.set(0.3, 0.5, 0.3); hum.add(troph); D.root.add(hum); const hShadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false })); hShadow.rotation.x = -Math.PI / 2; D.root.add(hShadow);
  const tag = sign('GUTTER BOWL', 5, 1.1, { bg: '#2a1a3a', fg: '#ff9ac2', glow: true }); tag.position.set(0, 6, 0); { const g = new THREE.Group(); g.add(tag); const m = new Merge(); m.box(10, 5, 6, '#3a2a4a', 0, 2.5, -3.2); m.box(3, 3, 0.2, '#ffd86a', 0, 1.5, -0.1); g.add(m.mesh()); D.root.add(g); D.place(g, 4, -D.HALF - 6, Math.PI / 2); }
  // junk he knocks into the road
  const junk = []; const KIND = ['pins', 'board', 'ball'];
  function junkObj(k) { const g = new THREE.Group(), m = new Merge(); if (k === 'pins') { for (let i = 0; i < 5; i++) { const x = -1.2 + i * 0.6; m.cyl(0.12, 0.16, 0.7, '#f6f2e8', x, 0.35, 0, 8); m.cyl(0.13, 0.13, 0.07, '#c9302a', x, 0.55, 0, 8); m.ball(0.11, '#f6f2e8', x, 0.78, 0); } }
    else if (k === 'board') { for (const sx of [-0.6, 0.6]) { m.box(0.08, 1.1, 0.08, '#6a4a3a', sx, 0.55, 0.18, 0, -0.3); m.box(0.08, 1.1, 0.08, '#6a4a3a', sx, 0.55, -0.18, 0, 0.3); } const b = sign('LANES\nOPEN', 1.4, 0.9, { bg: '#ff6fae', fg: '#2b1e3c' }); b.position.set(0, 0.62, 0.24); b.rotation.x = -0.3; g.add(b); } else { m.ball(0.55, '#2a3a8a', 0, 0.55, 0, 1, 1, 1, 12, 8); for (const [x, y] of [[-0.15, 0.9], [0.12, 0.92], [0, 0.75]]) m.ball(0.08, '#0a0a14', x, y, 0.45); }
    g.add(m.mesh()); return g; }
  const notes = [];
  const G = { phase: 'off', t: 0, gap: 30, grabs: 0, dipT: 0, dip: 0, hx: 0, hs: 0, notes: 0, nextJunk: 0, nextNote: 0, auto: false, said: {}, grabCd: 0, lastJunk: 0 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  function dropJunk() { const k = R.pick(KIND), x = clamp(G.hx + (R() - 0.5) * 3, -D.HALF + 1.5, D.HALF - 1.5), s = G.hs - 2; const o = junkObj(k); D.root.add(o);
    junk.push(D.add({ s, x, obj: o, r: 1.2, w: k === 'pins' ? 1.6 : 1.2, h: 0.9, solid: true, slow: 0.4, onHit: () => { sfx.crash(); D.P.bumps++; say(['RAM', R.pick(['Easy, Gravy.', 'That was a pin. A whole set of pins.', 'I am calm. I am very calm.'])]); } })); if (k === 'ball') junk[junk.length - 1].roll = (R() < 0.5 ? -1 : 1) * 2.5; }
  function dropNote() { if (G.notesDropped >= 12) return; G.notesDropped++; const g = new THREE.Group(); const sp = glowSprite('#ffd86a', 1.3, 1.3, 0.7); g.add(sp); const ns = sign('♪', 0.8, 0.8, { bg: null, fg: '#ffe86a', glow: true, border: false }); g.add(ns);
    notes.push(D.add({ s: G.hs - 1, x: G.hx, y: 1.6, obj: g, r: 1.4, w: 1.0, air: true, onHit: () => { G.notes++; sfx.tone(660 * Math.pow(1.06, G.notes), 0.18, 'triangle', 0.22); H.pill('notes', `♪ ${G.notes}/12`); if (G.notes === 12) { sfx.star(2); H.toast('☀ HUM ALONG', 2); } } })); }
  function grab() { if (G.phase !== 'run' || G.grabCd > 0) return; G.grabCd = 0.8; const dz = G.hs - D.P.s, dx = Math.abs(G.hx - D.P.x), lowEnough = G.dip > 0.6;
    if (dz < 5 && dz > -1 && dx < 1.8 && lowEnough) { G.grabs++; sfx.catch(); H.pill('grabs', `GRABS ${G.grabs}/3`); const s = toScreen(hum.getWorldPosition(new THREE.Vector3()), camera);
      if (G.grabs >= 3) { H.float(s.x, s.y, 'GOT HIM!', '#ffe86a'); win(); return; } H.float(s.x, s.y, 'SLIPPERY!', '#bff2e0'); G.gap = 20; G.dipT = 3.5; G.dip = 0; say(G.grabs === 1 ? ['HUMMINGBIRD', 'Hm hm hmmm. (He does not know the words.)'] : ['RAM', 'One more. He is tired. I can see his little wings.']); }
    else { sfx.tone(300, 0.08, 'square', 0.06); if (!G.said.miss) { G.said.miss = 1; say(['RAM', 'Wait for him to come down. He always has to show off.']); } } }
  function jump() { if (G.phase === 'run' && D.P.onGround !== false && D.P.y <= 0.01) { D.P.vy = 9.5; sfx.tone(260, 0.2, 'triangle', 0.18, 1.6); } }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, gap: 26, grabs: 0, dipT: 6, dip: 0, hx: 0, hs: 0, notes: 0, notesDropped: 0, nextJunk: 4, nextNote: 2.5, said: {}, grabCd: 0 });
    D.reset(10, 0); for (const j of [...junk, ...notes]) { j.obj.parent?.remove(j.obj); j.dead = true; } junk.length = notes.length = 0; D.things.splice(0, D.things.length, ...D.things.filter((t) => !t.dead));
    H.pill('grabs', 'GRABS 0/3'); H.pill('notes', '♪ 0/12'); H.setMeter(0, 'HUMMINGBIRD'); const gb = H.button('grab', 'GRAB'); gb.onDown = grab; const jb = H.button('jump', 'JUMP', { alt: true }); jb.onDown = jump; const bb = H.button('boost', 'GALLOP', { alt: true }); c.I.padOn = true; c.I.onSwipe = (dx, dy) => { if (dy < -30) jump(); };
    D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1, CAMO);
    H.say([['', 'League night. The trophy sits on the shelf behind the shoe counter. Then it does not.'], ['HUMMINGBIRD', 'Hm hm hmm hmmmm.'], ['RAM', 'He took the trophy. My team won that trophy.'], ['WOLF', 'Gravy. Gravy is tied up outside.'], ['RAM', 'Bear will not mind. Bear will mind a little.']], () => { G.phase = 'run'; G.t = 0; H.hint('JUMP THE JUNK · GRAB WHEN HE DIPS', 2.4); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera); const run = G.phase === 'run'; let ax = I.axis(); if (G.auto) ax = { x: autoAx() };
    if (I.keys[' '] || I.keys.arrowup) jump(); if (I.keys.e) grab(); G.grabCd -= dt;
    D.P.cruise = run ? 19 : 0; D.update(dt, t, run ? ax : { x: 0 }, run && (H.btn.boost?.down || I.keys.shift || (G.auto && D.P.boostCharge >= 1 && G.gap > 14))); D.cam(camera, dt, CAMO);
    // horse gait
    const gait = t * (D.P.v > 22 ? 16 : 12); HP.legs.forEach((l, k) => { l.rotation.z = Math.sin(gait + [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5][k]) * 0.6 * clamp(D.P.v / 15, 0, 1) * (D.P.y > 0.05 ? 0.3 : 1); });
    animPal(wolf, dt, t, {}); animPal(ram, dt, t, { cheer: G.grabs > 0 && G.phase === 'run' ? 0.3 : 0 });
    // the Hummingbird: flies ahead, zigzags, dips to gloat
    if (run) { const pv = D.P.v; G.dipT -= dt; if (G.dipT <= 0 && G.dip <= 0) { G.dip = 0.01; G.dipDur = 2.6; } if (G.dip > 0) { G.dipDur -= dt; G.dip = clamp(G.dipDur > 0.6 ? G.dip + dt * 2.5 : G.dip - dt * 2.5, 0, 1); if (G.dipDur <= 0 || (G.dipDur < 0.6 && G.dip <= 0)) { G.dip = 0; G.dipT = 4 + R() * 3; } }
      const want = G.dip > 0.2 ? 3 : 18 - G.grabs * 2, hv = G.dip > 0.3 ? (G.gap > 3 ? pv - 3 : pv) : clamp(19.5 + (want - G.gap) * 0.4, 8, 28); G.gap = clamp(G.gap + (hv - pv) * dt, 2.5, 45);
      G.hs = Math.min(D.LEN - 6, D.P.s + G.gap); G.hx = Math.sin(G.t * 0.7) * (D.HALF - 2.5) * 0.8;
      G.nextJunk -= dt; if (G.nextJunk <= 0 && G.dip <= 0 && G.hs < D.LEN - 80) { G.nextJunk = 2.0 + R() * 1.8; dropJunk(); } G.nextNote -= dt; if (G.nextNote <= 0) { G.nextNote = 7; dropNote(); }
      for (const j of junk) if (j.roll) { j.x = clamp(j.x + j.roll * dt, -D.HALF + 1, D.HALF - 1); if (Math.abs(j.x) >= D.HALF - 1.01) j.roll *= -1; D.place(j.obj, j.s, j.x); }
      H.setMeter(1 - clamp((G.gap - 3) / 30, 0, 1), G.dip > 0.6 ? 'HE IS DIPPING · GRAB!' : 'HUMMINGBIRD');
      if (G.auto && G.dip > 0.6 && G.gap < 4.5) grab(); if (G.auto) { const j = junk.find((q) => q.s - D.P.s > 2 && q.s - D.P.s < 7 && Math.abs(q.x - D.P.x) < 2.4 && !q.hitT); if (j) jump(); }
      for (const e of D.events.splice(0)) { if (e === 'bump' || e === 'tbone' || e === 'hit') { sfx.crash(); say(['WOLF', R.pick(['Sorry, Gravy.', 'Sorry, sorry.', 'Gravy, left. Your left.'])]); } }
      if (!G.said.half && D.P.s > D.LEN * 0.55) { G.said.half = 1; say(['RAM', 'The Strip ends at the river. If he makes the river, he is gone.']); }
      if (D.P.s >= D.LEN - 40) lose(); }
    const hy = 2.6 + Math.sin(t * 9) * 0.12 + (1 - G.dip) * 2.4; D.place(hum, G.hs || 30, G.hx || 0, Math.cos(G.t * 0.7) * 0.4, hy); D.place(hShadow, G.hs || 30, G.hx || 0); hShadow.position.y = 0.05; hum.children.forEach(() => 0); animPal(hum, dt, t, { cheer: G.dip > 0.4 ? 1 : 0 });
  };
  function autoAx() { const target = G.dip > 0.2 ? G.hx : G.hx * 0.5; let want = target; for (const n of D.npcs) { const ds = n.s - D.P.s; if (ds > 0 && ds < 18 && Math.abs(n.x - want) < 2.2) want = n.x > 0 ? n.x - 3 : n.x + 3; } return clamp((want - D.P.x) * 0.8, -1, 1); }
  function win() { G.phase = 'done'; D.P.done = true; sfx.good(); const stars = 1 + (D.P.bumps <= 2 ? 1 : 0) + (D.P.s < D.LEN * 0.8 ? 1 : 0); const suns = ['hb_done']; if (stars === 3) suns.push('hb_star'); if (G.notes >= 12) suns.push('hb_hum');
    H.say([['', 'The Wolf stands up in the saddle and closes one paw around a small, warm, humming bird.'], ['HUMMINGBIRD', 'Hm. (sorry)'], ['RAM', 'Thank you. Now put him down gently. Now give me the trophy. Gently.'], ['', 'Gravy eats a sandwich board. Nobody stops him.']], () =>
      ctl.finish({ win: true, stars, title: 'TROPHY BACK', lines: [`${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'} · ♪ ${G.notes}/12`, 'RAM: "He can visit it. On Tuesdays."'], suns })); }
  function lose() { G.phase = 'done'; D.P.done = true; H.say([['', 'The Hummingbird reaches the river and zips across it, humming, trophy and all.'], ['RAM', 'He will bring it back. He always brings it back. Eventually.']], () => ctl.finish({ win: false, stars: 0, title: 'HE GOT AWAY', lines: [`Grabs ${G.grabs}/3`, 'RAM: "Wait for him to dip. Then get under him."'], suns: [] })); }
  return inst;
}
