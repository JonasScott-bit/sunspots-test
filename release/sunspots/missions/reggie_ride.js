// missions/reggie_ride.js — REGGIE'S RIDE (Night 4). Reggie the raccoon bet his car on a game of pool with Larry Byrd and
// lost. Larry slid the pink slip across the felt. Larry never loses. Fuzzy Peach (a peach, fuzzy, in the corner booth)
// knows Larry's weakness: trick shots. Five of Larry's trick shots; win the slip back by making them before he does.
// Slingshot aim: drag back from anywhere (like pulling a cue), let go to shoot. Sink every coloured ball. Don't scratch.
// Three tries per shot; miss two shots outright and Larry keeps the car. Felt props sit on the table as blockers.
// Stars: car won · 8 strokes or fewer · the last shot first try. Secret: bounce the cue ball off Fuzzy Peach and still sink one.
// QA: ?m=reggie_ride [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, toScreen, TAU } from './kit.js';

registerMission({
  id: 'reggie_ride', key: 'reggie', title: "REGGIE'S RIDE", chip: "REGGIE'S RIDE", room: 'poolhall', night: 4, where: 'Pool · Billiards (Reggie)',
  rumour: "Reggie bet his car on a game of pool. With Larry Byrd. Reggie walks home now.",
  todo: "Win Reggie's car back from Larry (Pool · Billiards)", doneMsg: '. Reggie has his car back. He drives it very slowly now.',
  suns: [{ id: 'rr_done', name: "REGGIE'S RIDE", how: "Win Reggie's car back from Larry Byrd" }, { id: 'rr_star', name: 'NEVER PLAY POOL WITH WOLF', how: "Three stars on Larry's trick shots" }, { id: 'rr_peach', name: 'PEACH ASSIST', how: 'Bounce the cue ball off Fuzzy Peach and still sink a ball' }],
  tip: 'DRAG BACK FROM THE BALL · LET GO TO SHOOT', hintSide: 'right', tipMid: true,
  create,
});
const LX = 4, LZ = 2, BR = 0.17, PR = 0.42;   // table half-length/half-width (inside cushions), ball radius, pocket radius
const POCKETS = [[-LX, -LZ], [0, -LZ - 0.08], [LX, -LZ], [-LX, LZ], [0, LZ + 0.08], [LX, LZ]];
// shots: cue [x,z], balls [[x,z,col]...], props [[x,z,r,kind]]
const SHOTS = [
  { name: 'THE STRAIGHT ONE', line: '"Straight in. Corner. Even Reggie can do this one." (Reggie could not.)', cue: [-2, 0.4], balls: [[1.6, 1.0, '#e0503a']], props: [] },
  { name: 'AROUND THE PEACH', line: '"Fuzzy Peach is in the way. Fuzzy Peach is always in the way."', cue: [-2.6, -0.6], balls: [[3.4, -1.7, '#3a7ae0']], props: [[0.3, -1.2, 0.55, 'peach']] },
  { name: 'TWO IN TWO', line: '"Two balls. Two strokes. No misses. I did it in 1978. I am still talking about it."', cue: [-2.4, 0], balls: [[1.2, 0.0, '#f2c230'], [2.1, 0.9, '#3aa86a']], props: [], strokes: 2, perTry: 2 },
  { name: 'THE CHALK GATE', line: '"Between the chalk. Do not touch the chalk. The chalk is Dot\'s."', cue: [-3, 1.2], balls: [[2.1, -1.4, '#b07ae0']], props: [[0.6, -0.1, 0.3, 'chalk'], [0.4, 0.4, 0.3, 'chalk']] },
  { name: "LARRY'S SPECIAL", line: '"Both in the side. One stroke. Around my hat. I have never lost a bet."', cue: [-2.8, -1.2], balls: [[0, 1.7, '#e0503a'], [-0.3, 1.7, '#2a2426']], props: [[-1.8, 0.8, 0.45, 'hat']] },
];

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
  scene.background = new THREE.Color('#1a1418');
  scene.add(new THREE.HemisphereLight('#fff0d8', '#2a1a1a', 0.7)); const lamp = new THREE.PointLight('#ffe8c0', 60, 20, 1.5); lamp.position.set(0, 6, 0); scene.add(lamp);
  const R = rng(1978);
  { const m = new Merge(); m.box(LX * 2 + 1.4, 0.6, LZ * 2 + 1.4, '#5a2a1a', 0, -0.35, 0); m.box(LX * 2, 0.06, LZ * 2, '#2f7a4a', 0, 0, 0);
    for (const s of [-1, 1]) { m.box(LX * 2 + 0.2, 0.22, 0.35, '#3a6a3a', 0, 0.1, s * (LZ + 0.17)); m.box(0.35, 0.22, LZ * 2 + 0.2, '#3a6a3a', s * (LX + 0.17), 0.1, 0); }
    for (const [x, z] of POCKETS) m.cyl(PR, PR, 0.08, '#0a0606', x, 0.03, z, 14); m.box(40, 0.1, 30, '#7a2a2a', 0, -1.6, 0); scene.add(m.mesh()); }
  const ballMesh = (col) => ball(BR, col, [0, BR, 0], scene, 14, 10);
  const cue = ballMesh('#f6f2e8'); let balls = [], props = [];
  const aimLine = mesh(new THREE.BoxGeometry(1, 0.02, 0.04), glowMat('#fff3c8', 0.8), null, scene); aimLine.visible = false;
  const ghost = mesh(new THREE.RingGeometry(BR * 0.8, BR, 16), glowMat('#fff3c8', 0.6), null, scene); ghost.rotation.x = -Math.PI / 2; ghost.visible = false;
  const objLine = mesh(new THREE.BoxGeometry(1, 0.02, 0.03), glowMat('#9af2ff', 0.7), null, scene); objLine.visible = false;
  const powEl = document.createElement('div'); powEl.style.cssText = 'position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:180px;height:12px;border-radius:6px;background:rgba(20,12,30,.6);display:none;overflow:hidden;z-index:5'; const powBar = document.createElement('i'); powBar.style.cssText = 'display:block;height:100%;background:linear-gradient(90deg,#9af2c2,#ffd86a,#ff7a5a)'; powEl.appendChild(powBar);
  function rayHit(c, w) { let best = { t: 1e9, n: null }; // cue ray: first ball (ghost-ball contact), prop, or cushion
    for (const b of B) { if (b === c || !b.alive) continue; const ox = b.x - c.x, oz = b.z - c.z, pr = ox * w.x + oz * w.z, d2 = ox * ox + oz * oz - pr * pr, R2 = 4 * BR * BR; if (pr > 0 && d2 < R2) { const t = pr - Math.sqrt(R2 - d2); if (t < best.t) { const gx = c.x + w.x * t, gz = c.z + w.z * t, l = Math.hypot(b.x - gx, b.z - gz); best = { t, n: { x: (b.x - gx) / l, z: (b.z - gz) / l } }; } } }
    for (const p of props) { const ox = p.x - c.x, oz = p.z - c.z, pr = ox * w.x + oz * w.z, d2 = ox * ox + oz * oz - pr * pr, R2 = (p.r + BR) ** 2; if (pr > 0 && d2 < R2) { const t = pr - Math.sqrt(R2 - d2); if (t < best.t) best = { t, n: null }; } }
    for (const [v, p, lim] of [[w.x, c.x, LX - BR], [w.z, c.z, LZ - BR]]) if (Math.abs(v) > 1e-4) { const t = ((v > 0 ? lim : -lim) - p) / v; if (t > 0 && t < best.t) best = { t, n: null }; }
    return best; }
  const larry = CAST.larry(), reggie = CAST.reggie(), wolf = CAST.wolf(); larry.position.set(-LX - 1.6, -1.55, -1.2); reggie.position.set(LX + 1.6, -1.55, 1.4); wolf.position.set(-LX - 1.4, -1.55, 1.4); for (const p of [larry, reggie, wolf]) { p.scale.setScalar(1.2); scene.add(p); }
  larry.rotation.y = Math.PI / 2; reggie.rotation.y = -Math.PI / 2; wolf.rotation.y = Math.PI / 2;
  const slip = sign('PINK SLIP · 1 CAR', 1.2, 0.5, { bg: '#f6b8c8', fg: '#2b1e3c' }); slip.rotation.x = -Math.PI / 2; slip.position.set(LX + 1.5, -0.4, -1.0); scene.add(slip);
  const G = { phase: 'off', i: 0, tries: 0, strokes: 0, made: 0, fails: 0, firstTry: false, moving: false, peachHit: false, peachSun: false, scratch: false, sunk: 0, auto: false, said: {} };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const B = []; // physics bodies {m, x, z, vx, vz, alive, cue}
  function setup() { const S = SHOTS[G.i]; for (const b of balls) scene.remove(b); for (const p of props) scene.remove(p.g); balls = []; props = []; B.length = 0;
    B.push({ m: cue, x: S.cue[0], z: S.cue[1], vx: 0, vz: 0, alive: true, cue: true }); cue.visible = true;
    for (const [x, z, col] of S.balls) { const m = ballMesh(col); balls.push(m); B.push({ m, x, z, vx: 0, vz: 0, alive: true }); }
    for (const [x, z, r, kind] of S.props) { const g = new THREE.Group(), m = new Merge(); if (kind === 'peach') { m.ball(r, '#f6a88a', 0, r, 0, 1, 0.95, 1, 12, 8); m.box(0.08, 0.2, 0.06, '#5a3a1a', 0, r * 2, 0); for (const x of [-0.14, 0.14]) { m.ball(0.07, '#f6f2e8', x, r * 1.2, r * 0.88, 1, 1, 0.5, 6, 4); m.ball(0.035, '#1d1416', x, r * 1.2, r * 0.95, 1, 1, 1, 4, 3); } }
      else if (kind === 'chalk') m.box(r * 1.2, r * 1.2, r * 1.2, '#3a7ae0', 0, r * 0.6, 0); else { m.cyl(r * 0.7, r * 0.7, 0.5, '#c9302a', 0, 0.3, 0, 12); m.cyl(r, r, 0.06, '#c9302a', 0, 0.05, 0, 14); }
      g.add(m.mesh()); g.position.set(x, 0.03, z); scene.add(g); props.push({ g, x, z, r, kind }); }
    G.tries = 0; G.tryStrokes = 0; G.need = S.balls.length; G.sunk = 0; G.max = S.strokes || 3; G.phase = 'aim'; G.peachHit = false; H.pill('shot', `SHOT ${G.i + 1}/5`); H.pill('tries', `TRIES ${G.max - G.tries}`); H.pill('score', innerHeight > innerWidth ? `W ${G.made} · L ${G.fails}` : `WOLF ${G.made} · LARRY ${G.fails}`); H.hint(S.name, 1.6); sync(); }
  function sync() { for (const b of B) { b.m.position.set(b.x, BR + 0.03, b.z); b.m.visible = b.alive; } }
  const toWorld = (dx, dy) => (camera.aspect < 1 ? { x: dy, z: -dx } : { x: dx, z: dy });   // screen drag -> table plane (portrait turns the table)
  function shoot(dx, dy) { if (G.phase !== 'aim') return; const len = Math.hypot(dx, dy); if (len < 18) return; const w = toWorld(-dx / len, -dy / len), pw = clamp(len / 140, 0.15, 1);
    const c = B[0]; c.vx = w.x * pw * 9.5; c.vz = w.z * pw * 9.5; G.acc = 0; G.strokes++; if (!G.tryStrokes) G.tries++; G.tryStrokes = (G.tryStrokes || 0) + 1; G.sunkBefore = G.sunk; G.phase = 'roll'; G.sunkThis = 0; G.scratch = false; G.peachHit = false; sfx.tick(); sfx.bonk(); aimLine.visible = ghost.visible = false; H.pill('tries', `TRIES ${G.max - G.tries}`); }
  function step(dt) { for (const b of B) { if (!b.alive) continue; b.x += b.vx * dt; b.z += b.vz * dt; const sp = Math.hypot(b.vx, b.vz); if (sp > 0) { const ns = Math.max(0, sp - 1.3 * dt); b.vx *= ns / sp; b.vz *= ns / sp; }
      for (const [px, pz] of POCKETS) if (Math.hypot(b.x - px, b.z - pz) < PR) { b.alive = false; b.vx = b.vz = 0; G.sim||sfx.pop(); if (b.cue) { G.scratch = true; } else { G.sunk++; G.sunkThis++; if (!G.sim) { const s = toScreen(new THREE.Vector3(px, 0.4, pz), camera); H.float(s.x, s.y, 'IN!', '#ffe86a'); } } }
      if (!b.alive) continue;
      if (Math.abs(b.x) > LX - BR) { b.x = Math.sign(b.x) * (LX - BR); b.vx *= -0.82; G.sim||sfx.tone(180, 0.05, 'triangle', 0.12); } if (Math.abs(b.z) > LZ - BR) { b.z = Math.sign(b.z) * (LZ - BR); b.vz *= -0.82; G.sim||sfx.tone(180, 0.05, 'triangle', 0.12); }
      for (const p of props) { const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), m = p.r + BR; if (d < m && d > 0) { const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vz -= 1.8 * vn * nz; } b.x = p.x + nx * m; b.z = p.z + nz * m; if (p.kind === 'peach' && b.cue && !G.peachHit) { G.peachHit = true; G.sim||sfx.tone(500, 0.12, 'sine', 0.2, 1.4); G.sim||say(['FUZZY PEACH', 'Ow. Fuzzy.']); } if (p.kind === 'chalk' && !G.sim && !G.said.chalk) { G.said.chalk = 1; say(['LARRY BYRD', 'You touched the chalk.']); } } } }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (!a.alive || !b.alive) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < BR * 2 && d > 0) { const nx = dx / d, nz = dz / d, rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; if (rel > 0) { a.vx -= rel * nx; a.vz -= rel * nz; b.vx += rel * nx; b.vz += rel * nz; G.sim||sfx.tone(900, 0.04, 'triangle', 0.18); } const o = (BR * 2 - d) / 2; a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o; } } }
  function settle() { const S = SHOTS[G.i];
    if (G.peachHit && G.sunkThis > 0 && !G.peachSun) { G.peachSun = true; sfx.star(2); H.toast('☀ PEACH ASSIST'); say(['FUZZY PEACH', 'I meant to do that. We meant to do that.']); }
    if (G.sunk >= G.need && !G.scratch) { G.made++; if (G.i === 4) G.firstTry = G.tries === 1; sfx.good(); G.phase = 'wait'; H.say([['LARRY BYRD', R.pick(['Hm.', 'Lucky.', 'Hm. Hm.', 'I have never seen that before. I have done that before.'])]], next); return; }
    if (G.scratch) { say(['LARRY BYRD', 'Scratch. The cue ball went home.']); }
    if (!G.scratch && S.perTry && G.tryStrokes < S.perTry && G.sunk > G.sunkBefore) { G.phase = 'aim'; H.hint('ONE MORE', 1); return; }
    if (G.tries >= G.max) { G.fails++; sfx.bad(); G.phase = 'wait'; H.say([['LARRY BYRD', 'My turn.'], ['', 'Larry makes it. First try. Without looking.']], () => { if (G.fails >= 3) lose(); else next(); }); return; }
    setupKeep(); }
  function setupKeep() { const S = SHOTS[G.i]; // reset the shot (balls back) for another try
    B[0].x = S.cue[0]; B[0].z = S.cue[1]; B[0].vx = B[0].vz = 0; B[0].alive = true; S.balls.forEach((b, k) => { const o = B[k + 1]; o.x = b[0]; o.z = b[1]; o.vx = o.vz = 0; o.alive = true; }); G.sunk = 0; G.tryStrokes = 0; G.phase = 'aim'; sync(); }
  function next() { G.i++; if (G.i >= 5) return win(); const S = SHOTS[G.i]; H.say([['LARRY BYRD', S.line]], setup); }
  function win() { G.phase = 'done'; const stars = 1 + (G.strokes <= 8 ? 1 : 0) + (G.firstTry ? 1 : 0); const suns = ['rr_done']; if (stars === 3) suns.push('rr_star'); if (G.peachSun) suns.push('rr_peach');
    H.say([['LARRY BYRD', 'I have never lost a bet.'], ['LARRY BYRD', 'I have now lost a bet.'], ['', 'Larry slides the pink slip back across the felt.'], ['REGGIE', 'My car. My little car.'], ['FUZZY PEACH', 'Never play pool with the Wolf.']], () =>
      ctl.finish({ win: true, stars, title: "REGGIE'S RIDE", lines: [`${G.made}/5 trick shots · ${G.strokes} strokes`, 'REGGIE: "I am selling it. No. I am keeping it. I am driving it slowly."'], suns })); }
  function lose() { G.phase = 'done'; H.say([['LARRY BYRD', 'Three misses. The car stays with me.'], ['REGGIE', 'It was a good car.']], () => ctl.finish({ win: false, stars: 0, title: 'LARRY KEEPS THE CAR', lines: [`${G.made}/5 trick shots`, 'FUZZY PEACH: "Pull back further. Let go softer."'], suns: [] })); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', i: 0, strokes: 0, made: 0, fails: 0, firstTry: false, peachSun: false, said: {} });
    H.root.appendChild(powEl); c.I.padOn = false; c.I.onRelease = (dx, dy) => shoot(dx, dy);
    H.say([['REGGIE', 'I bet my car. On pool. With Larry.'], ['FUZZY PEACH', 'Nobody beats Larry at pool. But Larry cannot resist a trick shot.'], ['LARRY BYRD', 'Five trick shots. Make them before I do and the slip is yours.'], ['FUZZY PEACH', 'Drag back, like pulling the cue. Let go to shoot.']], () => { setup(); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); else if (G.phase === 'aim') autoShot(); }, 900);
  };
  inst.stop = () => { powEl.remove(); G.phase = 'off'; clearInterval(G.autoT); ctl && (ctl.I.onRelease = null); };
  function autoShot() { // QA: search shots by simulating the table (angle x power), take the first clean one
    const save = B.map((b) => ({ ...b })), keep = { peachHit: G.peachHit, scratch: G.scratch, sunk: G.sunk, sunkThis: G.sunkThis }; G.sim = true; let pick = null;
    const c0 = B[0], tgt = B.find((q) => !q.cue && q.alive), a0 = Math.atan2(tgt.z - c0.z, tgt.x - c0.x);
    outer: for (let k = 0; k < 160; k++) { const ang = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 80); for (const pw of [0.55, 0.75, 0.95, 0.4]) {
      B.forEach((b, i) => Object.assign(b, save[i])); G.scratch = false; G.sunk = keep.sunk; B[0].vx = Math.cos(ang) * pw * 9.5; B[0].vz = Math.sin(ang) * pw * 9.5;
      for (let n = 0; n < 1100; n++) { step(1 / 120); if (B.every((b) => !b.alive || Math.hypot(b.vx, b.vz) < 0.03)) break; }
      if (!G.scratch && (G.sunk >= G.need || (SHOTS[G.i].perTry && G.sunk > keep.sunk))) { pick = { ang, pw }; break outer; } } }
    B.forEach((b, i) => Object.assign(b, save[i])); Object.assign(G, keep); G.sim = false; sync();
    const ang = pick ? pick.ang : a0, pw = pick ? pick.pw : 0.6, wx = Math.cos(ang), wz = Math.sin(ang);
    const sx = camera.aspect < 1 ? -wz : wx, sy = camera.aspect < 1 ? wx : wz; shoot(-sx * pw * 140, -sy * pw * 140); }
  inst.update = (dt, t, I) => {
    if (G.phase === 'roll') { G.acc = Math.min((G.acc || 0) + dt, 0.25); while (G.acc >= 1 / 120) { G.acc -= 1 / 120; step(1 / 120); } sync(); if (B.every((b) => !b.alive || Math.hypot(b.vx, b.vz) < 0.03)) { for (const b of B) { b.vx = b.vz = 0; } settle(); } }
    if (G.phase === 'aim' && I.active && I.cur && I.downAt) { const dx = I.cur.x - I.downAt.x, dy = I.cur.y - I.downAt.y, len = Math.hypot(dx, dy); if (len > 12) { const w = toWorld(-dx / len, -dy / len), L = clamp(len / 140, 0.15, 1) * 3.2, c = B[0];
        const hitT = rayHit(c, w), D = Math.min(hitT.t, 9); aimLine.visible = ghost.visible = true; aimLine.scale.x = D; aimLine.position.set(c.x + w.x * D / 2, 0.24, c.z + w.z * D / 2); aimLine.rotation.y = -Math.atan2(w.z, w.x); ghost.position.set(c.x + w.x * D, 0.07, c.z + w.z * D);
        objLine.visible = !!hitT.n; if (hitT.n) { const ox = ghost.position.x, oz = ghost.position.z; objLine.scale.x = 1.2; objLine.position.set(ox + hitT.n.x * BR * 2 + hitT.n.x * 0.6, 0.24, oz + hitT.n.z * BR * 2 + hitT.n.z * 0.6); objLine.rotation.y = -Math.atan2(hitT.n.z, hitT.n.x); }
        powBar.style.width = Math.round(L / 3.2 * 100) + '%'; powEl.style.display = 'block'; powEl.style.width = innerHeight > innerWidth ? '120px' : '180px'; powEl.style.bottom = innerHeight > innerWidth ? '10px' : '16px'; } } if (!(G.phase === 'aim' && I.active)) { aimLine.visible = ghost.visible = objLine.visible = false; powEl.style.display = 'none'; }
    for (const p of props) if (p.kind === 'peach') p.g.rotation.y = Math.sin(t) * 0.2;
    animPal(larry, dt, t, { wave: G.phase === 'roll' ? 0 : 0 }); animPal(reggie, dt, t, { panic: G.phase === 'roll' ? 1 : 0 }); animPal(wolf, dt, t, {});
    const por = camera.aspect < 1; camera.up.set(por ? -1 : 0, 0, por ? 0 : -1); const hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), need = por ? Math.max((LZ + 1.2) / (hf * camera.aspect), (LX + 2.6) / hf) : Math.max((LX + 2.6) / (hf * camera.aspect), (LZ + 1.4) / hf);
    const ox = por ? -0.7 : 0; camera.position.set(ox, need, por ? 0.001 : 0.6); camera.lookAt(ox, 0, 0);
  };
  return inst;
}
