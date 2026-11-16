// missions/blue_chalk.js — BLUE CHALK (Night 3). Somebody leaves Dot pool chalk as a tip. Every day. Blue. Sal says it's
// Larry Byrd ("Larry is a vulture, Dot"). Cake and Shake have the booth with the best view of the counter, and a camera.
// A stakeout in time-lapse: three nights at the Diner, 10 PM to 2 AM in forty seconds each. Customers come in, sit, eat,
// tip, leave: each one on their own schedule. When a paw (or wing) reaches for the tip jar, SNAP. Money is just a tip.
// Blue dust is a clue. Two shots of film a night. After the third night, point at who did it.
// Stars: right answer · three clues · no wasted film. Secret: tap Sal in the kitchen window (he has an alibi: eggs).
// QA: ?m=blue_chalk [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, pickNear, toScreen, TAU } from './kit.js';

registerMission({
  id: 'blue_chalk', key: 'chalk', title: 'BLUE CHALK', chip: 'BLUE CHALK', room: 'diner', night: 3, where: 'The Diner (Dot)',
  rumour: 'Somebody leaves Dot blue pool chalk as a tip. Every day. Sal has a theory. Sal always has a theory.',
  todo: "Stake out the Diner and find out who leaves the blue chalk", doneMsg: '. It was Larry. It was always Larry.',
  suns: [{ id: 'bc_done', name: 'BLUE CHALK', how: "Find out who leaves Dot the blue chalk" }, { id: 'bc_star', name: 'PRIVATE EYE', how: 'Three stars on the stakeout' }, { id: 'bc_eggs', name: "SAL'S ALIBI", how: 'Ask Sal where he was' }],
  tip: 'WATCH THE TIP JAR · SNAP WHEN A PAW REACHES IN',
  create,
});
const NIGHT = 40, SUSPECTS = ['larry', 'crow', 'heron', 'reggie', 'moth'], NAMES = { larry: 'LARRY', crow: 'CROW', heron: 'HERON', reggie: 'REGGIE', moth: 'MOTH', goat: 'GOAT', fuzz: 'FUZZ', squid: 'SQUID' };
const CLUES = ['A FEATHERED WING. Blue dust on the feathers.', 'A LITTLE PIN on the lapel: crossed pool cues.', 'A RED CAP. A beak. He is smiling at the tip jar like it is a person.'];

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  scene.background = new THREE.Color('#141634');
  scene.add(new THREE.HemisphereLight('#ffe8d0', '#3a2a3a', 0.9)); const k = new THREE.DirectionalLight('#fff0d8', 0.8); k.position.set(3, 8, 6); scene.add(k);
  const neon = new THREE.PointLight('#ff6a9a', 8, 14, 1.6); neon.position.set(0, 4, -3); scene.add(neon);
  const R = rng(1951);
  // the diner: checker floor, counter + stools, pass-through to the kitchen, a window to the night street, our booth up front
  { const m = new Merge(); for (let i = -10; i < 10; i++) for (let j = -5; j < 16; j++) m.box(1.2, 0.1, 1.2, (i + j) & 1 ? '#f6efe0' : '#2b2b38', i * 1.2 + 0.6, 0, j * 1.2 + 0.6); for (const sx of [-1, 1]) m.box(0.2, 7, 26, '#6ab2b2', sx * 12, 3.5, 8.4); m.box(24.2, 0.3, 26, '#e8e2d6', 0, 7, 8.4);
    m.box(24, 7, 0.2, '#7ac2c2', 0, 3.5, -4.6); m.box(24, 0.6, 0.25, '#c9302a', 0, 1.4, -4.45); m.box(4.4, 1.6, 0.1, '#1c2a5a', -4.5, 3.6, -4.45); m.box(3.4, 1.4, 0.1, '#ffd8a0', 3.4, 3.6, -4.45);
    m.box(11, 1.1, 1.0, '#c9302a', 0, 0.55, -2.0); m.box(11.4, 0.14, 1.3, '#e8e2d6', 0, 1.15, -2.0); for (let i = 0; i < 4; i++) { const x = -3.6 + i * 2.4; m.cyl(0.08, 0.08, 0.8, '#c9c0b0', x, 0.4, -0.9, 6); m.cyl(0.42, 0.42, 0.16, '#c9302a', x, 0.85, -0.9, 12); }
    m.box(5.4, 0.9, 1.4, '#c9302a', 0, 0.45, 5.2); m.box(5.6, 0.12, 1.5, '#e8e2d6', 0, 1.0, 5.2); scene.add(m.mesh()); }
  const nsign = sign("DINER · OPEN LATE", 3.6, 0.7, { bg: '#2a2240', fg: '#ff9ac2' }); nsign.position.set(-1.7, 4.75, -4.4); scene.add(nsign); for (let i = 0; i < 4; i++) { const g = glowSprite(i % 2 ? '#ffd27a' : '#ff9ac2', 0.8, 0.8, 0.8); g.position.set(-6 + i * 1.0, 3.3 + (i % 2) * 0.5, -4.3); scene.add(g); }
  const jar = new THREE.Group(); { cyl(0.22, 0.2, 0.42, new THREE.MeshLambertMaterial({ color: '#cfe6f0', transparent: true, opacity: 0.55 }), [0, 0.21, 0], jar, 12); } jar.position.set(0, 1.22, -1.9); scene.add(jar);
  const jarSign = sign('TIPS', 0.5, 0.18, { bg: '#f6efe0', fg: '#2b1e3c', border: false }); jarSign.position.set(0, 0.55, 0.23); jar.add(jarSign);
  const chalks = []; for (let i = 0; i < 6; i++) { const c = box(0.1, 0.1, 0.1, '#3a7ae0', [((i % 3) - 1) * 0.08, 0.06 + Math.floor(i / 3) * 0.1, 0], jar); c.visible = false; chalks.push(c); }
  const clockS = { v: '' }; const clockEl = sign('10:00', 1.0, 1.0, { bg: '#fff3dc', fg: '#2b1e3c' }); clockEl.position.set(0.85, 4.75, -4.4); scene.add(clockEl);
  // the staff + the booth crew
  const dot = CAST.dot(), sal = CAST.sal(); dot.position.set(-1, 0.2, -3.2); sal.position.set(3.4, 0.2, -4.1); scene.add(dot, sal);
  const cake = new THREE.Group(), shake = new THREE.Group(); { const m = new Merge(); m.add(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 3, 1, false, 0, TAU / 3), '#f6e2b8', new THREE.Matrix4().makeTranslation(0, 0.2, 0)); m.box(0.2, 0.1, 0.2, '#e0503a', 0.1, 0.45, 0.1); for (const x of [-0.08, 0.08]) { m.ball(0.06, '#f6f2e8', x + 0.1, 0.28, 0.34, 1, 1, 0.5, 6, 4); m.ball(0.03, '#1d1416', x + 0.1, 0.28, 0.37, 1, 1, 1, 4, 3); } cake.add(m.mesh()); }
  { const m = new Merge(); m.cyl(0.22, 0.14, 0.6, '#f2b8c8', 0, 0.3, 0, 10); m.ball(0.22, '#fff3f6', 0, 0.66, 0, 1, 0.6, 1); m.ball(0.06, '#c9302a', 0, 0.82, 0); m.cyl(0.02, 0.02, 0.5, '#e0503a', 0.08, 0.85, 0, 4, 0, -0.3); for (const x of [-0.07, 0.07]) { m.ball(0.05, '#f6f2e8', x, 0.36, 0.2, 1, 1, 0.5, 6, 4); m.ball(0.025, '#1d1416', x, 0.36, 0.23, 1, 1, 1, 4, 3); } shake.add(m.mesh()); }
  cake.position.set(-2.0, 1.06, 4.8); shake.position.set(2.0, 1.06, 4.8); cake.rotation.y = Math.PI; shake.rotation.y = Math.PI; scene.add(cake, shake); cake.scale.setScalar(1.7); shake.scale.setScalar(1.4);
  const camProp = new THREE.Group(); box(0.4, 0.26, 0.16, '#2a2426', [0, 0, 0], camProp); cyl(0.08, 0.08, 0.14, '#5a5a62', [0, 0, -0.12], camProp, 8).rotation.x = Math.PI / 2; camProp.position.set(-1.2, 1.2, 4.7); scene.add(camProp);
  // customers: a pool, each with a schedule per night
  const pool = {}; for (const k of [...SUSPECTS, 'goat', 'fuzz', 'squid']) { const p = CAST[k](); p.visible = false; scene.add(p); pool[k] = p; }
  const STOOL = [-3.6, -1.2, 1.2, 3.6];
  const G = { phase: 'off', t: 0, night: 0, film: 2, clues: 0, wasted: 0, sched: [], reach: null, alibi: false, auto: false, said: {}, wrong: [] };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null, flash = 0;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  function plan(n) { // each customer: come in, sit at a stool, eat, tip (reach), leave. Larry once a night, always.
    const others = R() < 0.5 ? ['crow', 'heron', 'reggie', 'goat'] : ['heron', 'crow', 'moth', 'fuzz', 'squid']; const list = ['larry', ...others.slice(0, 4)].sort(() => R() - 0.5); const used = [0, 0, 0, 0];
    return list.map((k, i) => { const tin = 2 + i * 6.4 + R() * 2, st = i % 4, eat = 7 + R() * 4; return { k, st, tin, tip: tin + 3 + eat * 0.6, out: tin + 3 + eat, chalk: k === 'larry', done: false, snapped: false }; }); }
  function startNight() { G.night++; G.t = 0; G.film = 2; G.sched = plan(G.night); for (const c of chalks) c.visible = false; H.pill('night', `NIGHT ${G.night}/3`); H.pill('film', '📷 ●●'); H.pill('clues', `CLUES ${G.clues}/3`); G.phase = 'watch'; H.hint(`NIGHT ${G.night}: 10 PM`, 1.4); }
  function snap() {
    if (G.phase !== 'watch' || G.film <= 0) return; G.film--; H.pill('film', '📷 ' + '●'.repeat(G.film) + '○'.repeat(2 - G.film)); flash = 1; sfx.tone(2400, 0.04, 'square', 0.1); sfx.noise(0.12, 0.2, 3000);
    const c = G.reach; if (c && c.chalk && !c.snapped) { c.snapped = true; G.clues++; H.pill('clues', `CLUES ${G.clues}/3`); sfx.good(); H.panel(`<b>PHOTO · NIGHT ${G.night}</b>${CLUES[G.clues - 1]}`); setTimeout(() => H.panel(null), 3500); say(['SHAKE', G.clues === 1 ? 'Feathers. That is a bird.' : G.clues === 2 ? 'Pool cues. A bird who plays pool.' : 'Oh. Oh, it is him.']); }
    else if (c) { G.wasted++; H.panel(`<b>PHOTO · NIGHT ${G.night}</b>A real tip. Coins. ${NAMES[c.k]} looks pleased with themself.`); setTimeout(() => H.panel(null), 2600); say(['CAKE', 'That is money. We want chalk.']); }
    else { G.wasted++; H.panel(`<b>PHOTO · NIGHT ${G.night}</b>The counter. A napkin. Nobody.`); setTimeout(() => H.panel(null), 2200); say(['CAKE', R.pick(['Lovely napkin.', 'You photographed nothing. Beautifully.'])]); } }
  function accuse(i) { if (G.phase !== 'accuse') return; const k = SUSPECTS[i]; if (k !== 'larry') { G.wrong.push(k); sfx.bad(); say(['SHAKE', R.pick([`Not ${NAMES[k]}. Look at the photos.`, `${NAMES[k]}? No. Feathers, a pool pin...`])]); if (G.wrong.length >= 2) end(false); return; } end(true); }
  function end(ok) { G.phase = 'done'; H.panel(null);
    if (!ok) { H.say([['DOT', 'Well, whoever it is, I hope they stop. I hope they never stop.']], () => ctl.finish({ win: false, stars: 0, title: 'CASE COLD', lines: [`Clues: ${G.clues}/3`, 'CAKE: "The bird with the pool pin, darling."'], suns: [] })); return; }
    sfx.good(); const stars = 1 + (G.clues >= 3 ? 1 : 0) + (G.wasted === 0 ? 1 : 0); const suns = ['bc_done']; if (stars === 3) suns.push('bc_star'); if (G.alibi) suns.push('bc_eggs');
    H.say([['DOT', 'Larry Byrd?'], ['SAL', 'I SAID. I said Larry. Larry is a vulture, Dot.'], ['LARRY BYRD', "I'm a heron's cousin. Distantly. Dot, I've never lost a bet."], ['LARRY BYRD', "I'm scared to make this one. Dinner. Friday."], ['DOT', '...You could have just said.'], ['SHAKE', 'Nobody ever just says.']], () =>
      ctl.finish({ win: true, stars, title: 'CASE CLOSED', lines: [`It was Larry Byrd · clues ${G.clues}/3 · wasted film ${G.wasted}`, 'CAKE: "We should open an agency."'], suns })); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, night: 0, film: 2, clues: 0, wasted: 0, sched: [], reach: null, alibi: false, said: {}, wrong: [] });
    const b = H.button('snap', 'SNAP 📷'); b.onDown = snap; c.I.padOn = false;
    c.I.onTap = (x, y) => { if (pickNear([sal], x, y, camera, 80) && !G.alibi) { G.alibi = true; sfx.star(2); H.toast("☀ SAL'S ALIBI"); H.say([['SAL', 'Where was I? Eggs. I was at eggs. Since 1962.']]); } else snap(); };
    H.say([['DOT', 'Blue chalk. In the tip jar. Every single day.'], ['SAL', "It's Larry Byrd."], ['CAKE', 'We have the booth. We have the camera. We have nowhere to be.'], ['SHAKE', 'When somebody reaches for the jar, snap. Two shots a night.'], ['CAKE', 'Coins are coins. We want blue.']], () => startNight());
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 600);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  const _v = new THREE.Vector3();
  inst.update = (dt, t) => {
    if (G.phase === 'watch') G.t += dt;
    const hr = 22 + (G.t / NIGHT) * 4, hh = Math.floor(hr) % 12 || 12, mm = Math.floor((hr % 1) * 60), cs = `${hh}:${String(mm).padStart(2, '0')}`; if (G.phase === 'watch') H.pill('clock', `${cs} ${hr >= 24 ? 'AM' : 'PM'}`);
    for (const p of Object.values(pool)) p.visible = false; G.reach = null;
    for (const c of G.sched) { const p = pool[c.k]; const tt = G.t; if (tt < c.tin || tt > c.out + 3) continue; p.visible = true; const sx = STOOL[c.st];
      if (tt < c.tin + 3) { const k = (tt - c.tin) / 3; p.position.set(lerp(-9, sx, k), 0, lerp(1.5, -0.6, k)); p.rotation.y = Math.atan2(sx + 9, -2.1) * 0; p.rotation.y = -Math.PI / 2 + k * Math.PI / 2 * 0 + (k < 1 ? Math.PI / 2 : 0); animPal(p, dt, t, { walk: 1 }); p.rotation.y = Math.PI / 2; }
      else if (tt < c.out) { p.position.set(sx, 0.35, -0.75); p.rotation.y = Math.PI; animPal(p, dt, t, { sit: 1 }); const r = tt - c.tip; if (r > 0 && r < 1.3) { G.reach = c; p.userData.arms[1].rotation.x = -1.5; p.userData.arms[1].rotation.z = 0.35; p.rotation.y = Math.PI + Math.atan2(jar.position.x - sx, 1.2) * 0.6; if (r < dt * 1.5) { sfx.tick(); } if (c.chalk && r > 0.9 && !c.dropped) { c.dropped = true; const n = chalks.findIndex((q) => !q.visible); if (n >= 0) chalks[n].visible = true; } }
        if (G.auto && G.reach === c && c.chalk && r > 0.4 && !c.snapped && G.film > 0) snap(); }
      else { const k = (tt - c.out) / 3; p.position.set(lerp(sx, -9, k), 0, lerp(-0.6, 1.5, k)); p.rotation.y = -Math.PI / 2; animPal(p, dt, t, { walk: 1 }); } }
    if (G.phase === 'watch' && G.t >= NIGHT) { for (const c of G.sched) c.dropped = false; if (G.night < 3) { G.phase = 'between'; H.say([['', `2 AM. The Diner closes. Night ${G.night} of 3.`], ...(G.night === 1 ? [['DOT', 'Blue chalk again. Of course.']] : [['SAL', 'Larry. I am telling you.']])], () => startNight()); }
      else { G.phase = 'accuse'; H.say([['CAKE', 'Three nights. Look at the photos. Who was it?']], () => { H.reset('BLUE CHALK'); H.pill('clues', `CLUES ${G.clues}/3`); H.panel(`<b>THE PHOTOS</b>${G.clues ? CLUES.slice(0, G.clues).map((x) => '• ' + x).join('<br>') : 'No photos of the jar. Go with your gut.'}`); H.pads(SUSPECTS.map((k) => ({ label: NAMES[k], col: k === 'larry' ? '#e0a03a' : k === 'crow' ? '#8a8aa0' : k === 'heron' ? '#9fb4c4' : k === 'reggie' ? '#c98a3a' : '#cfc2a2' })), accuse); if (G.auto) setTimeout(() => accuse(0), 800); }); } }
    animPal(dot, dt, t, { walk: 0.6 }); dot.position.x = Math.sin(t * 0.4) * 3.5; dot.rotation.y = Math.cos(t * 0.4) > 0 ? Math.PI / 2 : -Math.PI / 2; animPal(sal, dt, t, { wave: Math.sin(t * 0.7) > 0.6 ? 1 : 0 });
    cake.rotation.z = Math.sin(t * 2) * 0.03; shake.rotation.z = Math.sin(t * 2.3 + 1) * 0.03;
    flash = Math.max(0, flash - dt * 3); scene.background.setRGB(0.08 + flash * 0.9, 0.08 + flash * 0.9, 0.2 + flash * 0.8);
    const por = camera.aspect < 1, hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect; camera.position.set(0, por ? 5.2 : 4.0, por ? Math.max(9, 4.9 / hf) : 9.8); camera.lookAt(0, por ? 1.0 : 1.4, -1.4);
  };
  return inst;
}
