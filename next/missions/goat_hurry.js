// missions/goat_hurry.js — GOAT IN A HURRY (Night 3). Goat shouts at stop signs. Tonight he bangs on the roof of Moth's
// cab: "DRIVE." He has to be somewhere at 1:59. He won't say where. Taxi time trial: the clock says 1:57:00 AM and it is
// a real clock. Goat's SHORTCUT gates (orange cones, sometimes in the oncoming lane) give you seconds back; tin cans are
// his tip. The town keeps doing its own thing: lights, queues, walkers, cross traffic.
// Stars: there by 1:59 · 1 bump or fewer · every shortcut. Secret: pick up five tin cans (Goat's tip).
// QA: ?m=goat_hurry [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, waddleCar, nightSky, nightLights, sign, glowMat, glowSprite, Merge, cyl, sfx, clamp, lerp, rng, toScreen, juice } from './kit.js';
import { createDrive } from './drivecore.js';

registerMission({
  id: 'goat_hurry', key: 'goat', title: 'GOAT IN A HURRY', chip: 'GOAT IN A HURRY', room: 'moth', night: 3, where: "Moth's pad (the night cab)",
  rumour: 'Every night at 1:57 somebody bangs on the roof of the night cab and says one word.',
  todo: "Get Goat where he's going by 1:59 (Moth's cab)", doneMsg: ". Goat got there at 1:59. Nothing happened. He's thrilled.",
  suns: [{ id: 'gh_done', name: 'GOAT IN A HURRY', how: 'Get Goat where he is going by 1:59' }, { id: 'gh_star', name: 'METER RUNNING', how: 'Three stars in the night cab' }, { id: 'gh_tip', name: "GOAT'S TIP", how: 'Goat tips in tin cans. Collect five.' }],
  tip: 'DRAG TO STEER · DRIVE THROUGH THE ORANGE SHORTCUTS',
  create,
});
const LIMIT = 120, CAMO = { dist: 7.0, height: 3.3, lookY: 1.4 };

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#141634'); scene.fog = new THREE.Fog('#181838', 40, 250);
  const sky = nightSky(scene, { top: '#0a0c28', mid: '#22184a', low: '#3a2450', glow: '#7a5aff', dusk: 0.04 }); nightLights(scene);
  const R = rng(1959);
  const cab = waddleCar('#f2c230', '#f6efe0', { open: true, cab: true });
  const moth = CAST.moth(), wolf = CAST.wolf(), goat = CAST.goat();
  for (const [p, x, y, z, sc] of [[moth, 0.4, 0.62, 0.15, 0.84], [wolf, -0.4, 0.62, 0.15, 0.84], [goat, 0, 0.78, -0.95, 0.86]]) { p.scale.setScalar(sc); p.position.set(x, y, z); p.userData.shadow.visible = false; cab.userData.body.add(p); }
  const route = [[300, 0], [80, -50], [260, 0], [90, 60], [320, -5], [80, 40], [300, 0], [90, -45], [260, 0]];
  const D = createDrive(scene, { theme: 'town', route, cross: [200, 470, 760, 1050, 1350, 1620], player: cab, cruise: 22, max: 28, boostV: 34, boostRecharge: 5, seed: 59, traffic: { same: 10, oncoming: 9, cross: 2 }, peds: 14 });
  // shortcut gates: two cones + a banner; some sit in the oncoming lane
  const gates = []; for (let i = 0; i < 9; i++) { const s = 140 + i * 180 + R() * 30, x = [-3, 3, 3, -3, 1.5, -3, 3, -1.5, 3][i]; const g = new THREE.Group(), m = new Merge();
    for (const dx of [-2.3, 2.3]) { m.cyl(0.08, 0.45, 1.1, '#ff7a3a', dx, 0.55, 0, 8); m.box(0.18, 2.6, 0.18, '#f6efe0', dx, 1.6, 0); } g.add(m.mesh()); const b = sign('SHORTCUT', 4.2, 0.6, { bg: '#ff7a3a', fg: '#2b1e3c' }); b.position.y = 3.0; g.add(b); const b2 = b.clone(); b2.rotation.y = Math.PI; b2.position.z = -0.02; g.add(b2);
    const gl = glowSprite('#ffb23a', 6, 3, 0.25); gl.position.y = 1.6; g.add(gl); D.root.add(g); D.place(g, s, x); gates.push({ s, x, g, hit: false, passed: false }); }
  const cans = []; for (let i = 0; i < 8; i++) { const g = new THREE.Group(); cyl(0.22, 0.22, 0.5, '#c9c0b0', [0, 0, 0], g, 10); cyl(0.23, 0.23, 0.25, '#c9302a', [0, 0, 0], g, 10); g.add(glowSprite('#ffe1a8', 1.4, 1.4, 0.4));
    cans.push(D.add({ s: 230 + i * 190 + R() * 40, x: (R() < 0.5 ? -1 : 1) * (1 + R() * 3.5), y: 0.6, obj: g, r: 1.6, w: 0.8, air: true, onHit: () => { G.cans++; sfx.pop(); H.toast(`TIN CAN (${G.cans})`, 1.1); if (G.cans === 5) { sfx.star(2); H.toast("☀ GOAT'S TIP", 2); say(['GOAT', 'That is your tip. Do not spend it all on cans.']); } }, tick: (dt, t, th) => { th.obj.rotation.y = t * 2.5; th.obj.rotation.z = 0.4; } })); }
  // the destination: the horse statue on the square, its clock
  const sq = new THREE.Group(); { const m = new Merge(); m.cyl(2.2, 2.6, 1.4, '#c9c0b0', 0, 0.7, 0, 12); m.box(2.4, 1.3, 0.7, '#8a6a4a', 0, 2.2, 0); m.box(0.5, 1.4, 0.5, '#8a6a4a', 0.9, 2.9, 0); m.box(0.4, 0.9, 0.4, '#8a6a4a', 1.2, 3.6, 0, 0, 0, -0.4); for (const [x, z] of [[-0.9, 0.25], [-0.9, -0.25], [0.8, 0.25], [0.8, -0.25]]) m.box(0.2, 1.0, 0.2, '#8a6a4a', x, 1.75, z); m.box(0.3, 6, 0.3, '#3a3a40', -4, 3, 0); sq.add(m.mesh()); }
  const clockF = sign('1:57', 1.4, 1.4, { bg: '#fff3dc', fg: '#2b1e3c' }); clockF.position.set(-4, 6.4, 0.2); sq.add(clockF); const cb = clockF.clone(); cb.rotation.y = Math.PI; cb.position.z = -0.2; sq.add(cb); D.root.add(sq); D.place(sq, D.LEN - 30, D.HALF + 7, Math.PI / 2);
  const G = { phase: 'off', t: 0, bonus: 0, gates: 0, cans: 0, auto: false, said: {}, bang: 0 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const clockStr = (sec) => { const s = 117 * 60 + Math.floor(sec); return `${Math.floor(s / 3600) || 1}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} AM`; };
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, bonus: 0, gates: 0, cans: 0, said: {}, bang: 0 }); D.reset(10, 3); for (const g of gates) { g.hit = g.passed = false; g.g.visible = true; }
    H.pill('clock', '1:57:00 AM'); H.pill('gates', 'SHORTCUTS 0/9'); H.button('boost', 'FLOOR<br>IT'); const hk = H.button('honk', 'HONK', { alt: true }); hk.onDown = () => { sfx.horn(); const n = D.npcs.find((q) => q.s - D.P.s > 0 && q.s - D.P.s < 20 && Math.abs(q.x - D.P.x) < 2.4); if (n) n.x = clamp(n.x + 2.2, -D.HALF + 1, D.HALF - 1); };
    D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1, CAMO); c.I.padOn = true;
    H.say([['', 'BANG. BANG. Somebody is hitting the roof of the cab.'], ['GOAT', 'DRIVE.'], ['MOTH', 'Where to?'], ['GOAT', 'I have to be somewhere at 1:59.'], ['MOTH', 'Where?'], ['GOAT', 'DRIVE.']], () => { if (G.phase === 'talk') { G.phase = 'count'; G.t = 0; } });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera); let ax = I.axis(); if (G.auto) ax = { x: auto() };
    const run = G.phase === 'run';
    if (G.phase === 'count') { const n = 3 - Math.floor(G.t); H.hint(n > 0 ? String(n) : 'GO!', 0); if (G.t > 3) { G.phase = 'run'; G.t = 0; H.hint('GO!', 0.8); sfx.ok(); } }
    D.P.cruise = run ? 22 : 0; D.update(dt, t, run ? ax : { x: 0 }, run && (H.btn.boost?.down || I.keys[' '] || (G.auto && D.P.boostCharge >= 1))); D.cam(camera, dt, CAMO);
    animPal(moth, dt, t, {}); animPal(wolf, dt, t, {}); G.bang -= dt; animPal(goat, dt, t, { cheer: G.bang > 0 ? 1 : 0 });
    if (run) {
      const used = G.t - G.bonus, left = LIMIT - used; H.pill('clock', clockStr(used), left < 20);
      for (const g of gates) { if (!g.passed && D.P.s > g.s) { g.passed = true; if (Math.abs(D.P.x - g.x) < 2.3) { g.hit = true; G.gates++; G.bonus += 3; sfx.good(); juice.burst(g.g.position.clone().setY(2), '#ff9a3a', 18, { speed: 5, size: 0.45 }); const sp = toScreen(g.g.position.clone().setY(3), camera); H.float(sp.x, sp.y, 'SHORTCUT −3s', '#ffe86a'); H.pill('gates', `SHORTCUTS ${G.gates}/9`); if (G.gates === 1) say(['GOAT', 'Good. Again.']); }
        else { G.bang = 0.8; sfx.bonk(); sfx.bonk(); say(['GOAT', R.pick(['DRIVE.', 'That was a shortcut.', 'Shortcut. Was. There.'])]); } } g.g.visible = Math.abs(g.s - D.P.s) < 200 && !g.hit; }
      for (const e of D.events.splice(0)) { if (e === 'red') say(['GOAT', R.pick(['Red is a suggestion.', 'STOP SIGNS ARE A SUGGESTION.', 'Good.'])]); if (e === 'bump' || e === 'tbone' || e === 'hit') { sfx.crash(); say(['MOTH', R.pick(['That is on the meter.', 'That one was me.', 'Sorry. Sorry.'])]); } }
      clockF.material.map && 0;
      if (D.P.s >= D.LEN - 34) { G.phase = 'arrive'; D.P.done = true; G.used = used; arrive(left >= 0); }
      else if (left <= 0) { G.phase = 'arrive'; D.P.done = true; G.used = LIMIT; H.say([['', 'The square clock clicks over to 1:59. Goat watches it from the back seat of the cab, a long way off.'], ['GOAT', '...'], ['GOAT', 'Tomorrow.']], () => ctl.finish({ win: false, stars: 0, title: 'LATE', lines: ['Goat has never been late. Until tonight.', `Shortcuts ${G.gates}/9`], suns: [] })); }
    }
  };
  function arrive(ok) { if (!ok) return; sfx.good(); const stars = 1 + (D.P.bumps <= 1 ? 1 : 0) + (G.gates === 9 ? 1 : 0); const suns = ['gh_done']; if (stars === 3) suns.push('gh_star'); if (G.cans >= 5) suns.push('gh_tip');
    H.say([['', 'The town square. The horse statue. The clock says 1:58 and something.'], ['', 'Goat gets out. He stands in front of the horse. The clock goes to 1:59.'], ['', 'Nothing happens.'], ['GOAT', 'Same as yesterday.'], ['GOAT', 'Thank you. Same time tomorrow.'], ['MOTH', 'He does this every night.'], ['WOLF', 'Waiting for what?'], ['MOTH', 'A horse came through town at one fifty-nine in \'58. He was a kid. He\'s waiting for the other one.'], ['MOTH', 'Everybody\'s waiting on something. Me, I wait for porch lights to go off.']], () =>
      ctl.finish({ win: true, stars, title: 'THERE BY 1:59', lines: [`Arrived ${clockStr(G.used)} · ${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'} · shortcuts ${G.gates}/9`, `Tin cans: ${G.cans}`], suns })); }
  function auto() { const P = D.P; const g = gates.find((q) => !q.passed && q.s - P.s > 0 && q.s - P.s < 70); let want = g ? g.x : 3; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 20 && Math.abs(n.x - want) < 2.0 && !(g && g.s - P.s < 12)) want = n.x > 0 ? -2.5 : 3; } return clamp((want - P.x) * 0.7, -1, 1); }
  return inst;
}
