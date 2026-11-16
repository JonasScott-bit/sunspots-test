// missions/return_sender.js — RETURN TO SENDER (Night 1). Every letter in town goes to the pink apartment, and every one
// is for the wrong name. SOMEONE (Apt. 6) has never been seen. Mailbox (the actual mailbox) is sick of it.
//  1 THE SORT — the Post Office back room. Read each envelope, put it in the right cubby (BEAR, HERON, MOTH, APT 6, HORSE).
//    The addresses are wrong in the way only this town gets wrong. 60 seconds.
//  2 THE ROUTE — Mailbox rides shotgun in the mail car. Drive the round; when a stop comes up on your right, TOSS (stay in
//    the right lane). Each cubby's letters go to that stop. Wrong-sorted letters come straight back out: "Not me."
// Stars: route done · 1 sorting mistake or fewer · every letter landed. Secret: one envelope is addressed to Mailbox. Tap him.
// QA: ?m=return_sender [&mauto] [&phase=route]
import * as THREE from 'three';
import { registerMission, CAST, animPal, waddleCar, nightSky, nightLights, sign, felt, glowMat, glowSprite, Merge, mesh, box, sfx, clamp, lerp, rng, pickNear, toScreen, TAU, M4 } from './kit.js';
import { createDrive } from './drivecore.js';

registerMission({
  id: 'return_sender', key: 'rts', title: 'RETURN TO SENDER', chip: 'RETURN TO SENDER', room: 'post', night: 1, where: 'The Post Office',
  rumour: 'Every letter in town ends up at the pink apartment. Nobody there is ever the right name.',
  todo: 'Sort the wrong-name mail and drive the round (the Post Office)', doneMsg: '. Apartment 6 slid one letter back: "Not me."',
  suns: [{ id: 'rs_done', name: 'RETURN TO SENDER', how: 'Sort the wrong-name mail and drive the round' }, { id: 'rs_star', name: 'FIRST CLASS', how: 'Three stars on the mail round' }, { id: 'rs_self', name: 'FROM: MAILBOX', how: 'One letter is for the mailbox' }],
  tip: 'READ THE ENVELOPE · TAP THE RIGHT CUBBY',
  create,
});

const BINS = [{ k: 'BEAR', col: '#c98a4a' }, { k: 'HERON', col: '#f2a0b8' }, { k: 'MOTH', col: '#c9b8f2' }, { k: 'APT 6', col: '#f26a9a' }, { k: 'HORSE', col: '#e0c890' }];
const LETTERS = [
  ['TO MY LITTLE CUB', 'love, Grandma (Sunday house)', 0], ['MR. R. FLAMINGO', 'tall, one leg, the bathroom', 1], ['OCCUPANT, APT. 9', '(a nine, upside down)', 3],
  ['THE HORSE', 'c/o The Town Square', 4], ['WHOEVER IS UP AT 3 AM', 'by the porch light', 2], ['DEAR NOBODY', 'the pink building', 3],
  ['MASTER B. GRIZZLY', 'age 34, couch', 0], ['STILL WATER, ONE LEG UP', 'please forward', 1], ['TO: MAILBOX', 'FROM: MAILBOX', -1],
  ['WHOM IT MAY CONCERN', '(it concerns hay)', 4], ['THE NIGHT CAB', 'Mesa Rd, light on', 2],
];
const STOPS = [[150, 0], [270, 2], [390, 1], [520, 4], [660, 3]];   // [s, bin]

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#141634'); scene.fog = new THREE.Fog('#181838', 40, 240);
  const sky = nightSky(scene, { top: '#0a0c28', mid: '#22184a', low: '#3a2450', glow: '#7a5aff', dusk: 0.05 }); nightLights(scene);
  const R = rng(66);
  const mailbox = () => { const g = new THREE.Group(), m = new Merge(); m.box(0.8, 0.8, 1.1, '#2f5aa8', 0, 0.75, 0); m.cyl(0.4, 0.4, 1.1, '#2f5aa8', 0, 1.15, 0, 12, Math.PI / 2); m.box(0.12, 0.7, 0.12, '#3a3a40', 0, 0.2, 0);
    for (const x of [-0.17, 0.17]) { m.ball(0.12, '#f6f2e8', x, 1.05, 0.56, 1, 1, 0.5, 8, 6); m.ball(0.06, '#1d1416', x, 1.05, 0.62, 1, 1, 1, 6, 4); } m.box(0.3, 0.05, 0.05, '#1d1416', 0, 0.8, 0.56); m.box(0.06, 0.4, 0.05, '#e0503a', 0.44, 1.2, -0.2); m.box(0.2, 0.12, 0.04, '#e0503a', 0.5, 1.38, -0.2); g.add(m.mesh()); return g; };
  // ================================================================== 1. THE SORT (back room of the Post Office, off at x=3000)
  const room = new THREE.Group(); room.position.x = 3000; scene.add(room);
  const amb = new THREE.PointLight('#ffd8a8', 30, 30, 1.4); amb.position.set(3000, 6, 4); scene.add(amb);
  { const m = new Merge(); m.box(40, 18, 0.2, '#d9cfb0', 0, 9, -2); m.box(40, 0.2, 40, '#6a4a3a', 0, 0, 18); m.box(7, 0.2, 2.2, '#8a5a3a', 0, 1.6, 0.6); for (const x of [-3.3, 3.3]) m.box(0.2, 1.6, 0.2, '#5a3a2a', x, 0.8, 0.6);
    BINS.forEach((b, i) => { const x = (i - 2) * 1.7; m.box(1.5, 1.4, 0.8, '#5a3a2a', x, 3.6, -1.6); m.box(1.3, 1.2, 0.1, '#2a1a14', x, 3.6, -1.25); }); room.add(m.mesh()); }
  BINS.forEach((b, i) => { const s = sign(b.k, 1.4, 0.4, { bg: b.col, fg: '#2b1e3c' }); s.position.set((i - 2) * 1.7, 4.55, -1.15); room.add(s); });
  const poster = sign('WE DELIVER (MOSTLY)', 3.6, 0.7, { bg: '#2f5aa8', fg: '#fff3dc' }); poster.position.set(0, 6.1, -1.85); room.add(poster);
  const mbox = mailbox(); mbox.position.set(2.6, 1.7, 0.5); mbox.rotation.y = -0.4; room.add(mbox);
  const sorter = CAST.wolf(); sorter.position.set(-0.6, 0, 2.0); sorter.rotation.y = Math.PI; room.add(sorter);
  const env = new THREE.Group(); { const m = new Merge(); m.box(0.9, 0.55, 0.03, '#f6efe0', 0, 0, 0); m.box(0.3, 0.2, 0.04, '#e0503a', 0.28, 0.12, 0); env.add(m.mesh()); } room.add(env); env.visible = false;
  // ================================================================== 2. THE ROUTE
  const car = waddleCar('#2f5aa8', '#f6efe0', { open: true, roof: 'MAIL' }); const drv = CAST.wolf(); drv.scale.setScalar(0.84); drv.position.set(0.4, 0.62, 0.15); drv.userData.shadow.visible = false; car.userData.body.add(drv);
  const rider = mailbox(); rider.scale.setScalar(0.62); rider.position.set(-0.4, 0.55, 0.1); car.userData.body.add(rider);
  const D = createDrive(scene, { theme: 'town', route: [[200, 0], [70, -45], [200, 0], [80, 50], [260, 0]], cross: [110, 330, 600], player: car, cruise: 16, max: 22, boostV: 26, seed: 6, traffic: { same: 6, oncoming: 8, cross: 2 }, peds: 12 });
  const stops = STOPS.map(([s, b]) => { const g = mailbox(); g.scale.setScalar(1.3); const t = sign(BINS[b].k, 1.6, 0.5, { bg: BINS[b].col, fg: '#2b1e3c' }); t.position.set(0, 2.6, 0); g.add(t); const gl = glowSprite('#ffe86a', 3, 3, 0); gl.position.y = 1.4; g.add(gl); D.root.add(g); D.place(g, s, D.HALF + 1.6, -Math.PI / 2); return { s, b, g, gl, done: false }; });
  const flying = []; for (let i = 0; i < 6; i++) { const e = env.clone(); e.visible = false; scene.add(e); flying.push({ e, t: 9 }); }
  const G = { phase: 'off', t: 0, i: 0, wrong: 0, bins: [[], [], [], [], []], landed: 0, missed: 0, returned: 0, self: false, total: 0, auto: false, said: {} };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null, pads = [];
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const cur = () => LETTERS[G.i];
  function showLetter() { const L = cur(); if (!L) return sortDone(); H.panel(`<b>LETTER ${G.i + 1} OF ${LETTERS.length}</b><div style="font:800 19px Futura,system-ui;letter-spacing:.04em">${L[0]}</div><div style="opacity:.75">${L[1]}</div>`); }
  function sortHit(i) { if (G.phase !== 'sort') return; const L = cur(); if (!L) return; const sp = toScreen(new THREE.Vector3(3000 + (i - 2) * 1.7, 4.6, -1.2), camera);
    if (L[2] === -1) { say(['MAILBOX', 'That one is mine. I wrote it to myself. Give it here.']); sfx.bad(); return; }
    G.bins[i].push(L); fly(i); if (L[2] === i) { sfx.catch(); H.float(sp.x, sp.y, '✓', '#bff2e0'); } else { G.wrong++; sfx.bad(); H.float(sp.x, sp.y, 'HM.', '#f2b0a0'); say(['MAILBOX', R.pick(['Bold choice.', 'That is not where that goes. Go on, though.', 'Somebody is getting the wrong letter. Again.'])]); }
    G.i++; showLetter(); }
  function fly(i) { env.visible = true; env.position.set(-0.4, 2.4, 1.2); G.flyTo = new THREE.Vector3((i - 2) * 1.7, 3.6, -1.3); G.flyT = 0; }
  function tapMailbox() { const L = cur(); if (G.phase === 'sort' && L && L[2] === -1) { G.self = true; sfx.star(2); H.toast('☀ FROM: MAILBOX'); H.say([['MAILBOX', '(reads it) "Dear Mailbox. You are doing great."'], ['MAILBOX', 'I am. I am doing great.']]); G.i++; showLetter(); } else if (G.phase === 'sort') say(['MAILBOX', R.pick(['I am not a cubby.', 'Feed me later.'])]); }
  function sortDone() { H.panel(null); G.phase = 'wait'; H.say([['MAILBOX', G.wrong ? `${G.wrong} wrong. They will come back. They always come back.` : 'All of them right. I am moved.'], ['MAILBOX', 'Now we drive. I ride in front. Toss when a stop is on your right.']], () => toRoute()); }
  function toRoute() { D.root.visible = true; G.phase = 'count'; G.t = 0; H.reset('RETURN TO SENDER'); D.reset(10, 3); D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1, CAMO);
    for (const st of stops) { st.done = false; st.gl.material.opacity = 0; } G.total = G.bins.reduce((a, b) => a + b.length, 0); G.landed = G.missed = G.returned = 0;
    H.pill('mail', `MAIL ${G.total}`); H.pill('land', 'LANDED 0'); const b = H.button('toss', 'TOSS ✉'); b.onDown = toss; ctl.I.padOn = true; ctl.I.onTap = null; }
  const CAMO = { dist: 7.0, height: 3.3, lookY: 1.4 };
  function nextStop() { return stops.find((st) => !st.done && st.s - D.P.s > -3); }
  function toss() { if (G.phase !== 'route') return; const st = nextStop(); const fl = flying.find((f) => f.t >= 1); if (!st) return; const bag = G.bins[st.b]; const ds = st.s - D.P.s;
    if (ds > 16 || ds < -3 || D.P.x < 0.5) { if (!G.said.lane) { G.said.lane = 1; say(['MAILBOX', 'Right lane. Then toss. When it lights up.']); } sfx.tick(); return; }
    if (!bag.length) { st.done = true; say(['MAILBOX', 'Nothing for them. There is never anything for them.']); return; }
    const L = bag.shift(); if (fl) { fl.t = 0; fl.from = car.position.clone().setY(1.6); fl.to = st.g.position.clone().setY(1.6); fl.e.visible = true; } sfx.whoosh();
    if (L[2] === st.b) { G.landed++; setTimeout(() => sfx.catch(), 400); const sp = toScreen(st.g.position.clone().setY(3.4), camera); H.float(sp.x, sp.y, 'DELIVERED', '#bff2e0'); }
    else { G.returned++; setTimeout(() => { sfx.bad(); const sp = toScreen(st.g.position.clone().setY(3.4), camera); H.float(sp.x, sp.y, '"NOT ME."', '#f2b0a0'); }, 450); }
    if (!bag.length) st.done = true; H.pill('mail', `MAIL ${G.bins.reduce((a, b) => a + b.length, 0)}`); H.pill('land', `LANDED ${G.landed}`); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, i: 0, wrong: 0, bins: [[], [], [], [], []], landed: 0, missed: 0, returned: 0, self: false, said: {} });
    if (c.opts?.phase === 'route') { LETTERS.forEach((L) => L[2] >= 0 && G.bins[L[2]].push(L)); G.self = false; toRoute(); return; }
    c.I.padOn = false; c.I.onTap = (x, y) => { if (pickNear([mbox], x, y, camera, 90)) tapMailbox(); };
    pads = H.pads(BINS.map((b) => ({ label: b.k, col: b.col })), sortHit); H.pill('t', '1:00'); H.pill('w', 'WRONG 0');
    camera.fov = 50; camera.updateProjectionMatrix();
    H.say([['MAILBOX', 'Every letter in town comes to me. Every letter is wrong.'], ['MAILBOX', 'Read the envelope. Pick the cubby. Fast.'], ['WOLF', 'Who lives in Apartment 6?'], ['MAILBOX', 'Someone.']], () => { G.phase = 'sort'; G.t = 0; showLetter(); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 600);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera);
    if (G.phase === 'talk' || G.phase === 'sort' || (G.phase === 'wait' && !G.routeOn)) {
      const por = camera.aspect < 1, hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect; D.root.visible = false; camera.position.set(3000, por ? 4.2 : 3.8, por ? 5.0 / hf : 9.5); camera.lookAt(3000, por ? 2.9 : 3.0, -0.5);
      animPal(sorter, dt, t, { wave: G.flyT < 0.4 ? 1 : 0 }); mbox.rotation.z = Math.sin(t * 2) * 0.03;
      if (G.flyT !== undefined && G.flyT < 1) { G.flyT += dt * 2.6; env.position.lerpVectors(new THREE.Vector3(-0.4, 2.4, 1.2), G.flyTo, Math.min(1, G.flyT)); env.position.y += Math.sin(Math.min(1, G.flyT) * Math.PI) * 0.8; env.rotation.z += dt * 9; if (G.flyT >= 1) env.visible = false; }
      if (G.phase === 'sort') { const left = Math.max(0, 60 - G.t), lc = Math.ceil(left); H.pill('t', `${Math.floor(lc / 60)}:${String(lc % 60).padStart(2, '0')}`, left < 10); H.pill('w', `WRONG ${G.wrong}`, G.wrong > 1);
        if (G.auto && G.t > (G.i + 1) * 1.1) { const L = cur(); if (L) { if (L[2] === -1) tapMailbox(); else { H.flash(pads[L[2]]); sortHit(L[2]); } } }
        if (left <= 0) { while (cur()) { const L = cur(); if (L[2] >= 0) { G.bins[(L[2] + 1) % 5].push(L); G.wrong++; } G.i++; } say(['MAILBOX', 'Time. I put the rest in. Somewhere.']); sortDone(); } }
      return; }
    if (G.phase === 'count' || G.phase === 'route' || G.phase === 'end') {
      G.routeOn = true; let ax = I.axis(); if (G.auto) ax = { x: autoAx() };
      if (G.phase === 'count') { const n = 3 - Math.floor(G.t); H.hint(n > 0 ? String(n) : 'GO!', 0); if (G.t > 3) { G.phase = 'route'; G.t = 0; H.hint('GO!', 0.8); sfx.ok(); } }
      D.P.cruise = G.phase === 'route' ? 16 : 0; D.update(dt, t, G.phase === 'route' ? ax : { x: 0 }); D.cam(camera, dt, CAMO);
      animPal(drv, dt, t, {}); rider.rotation.z = Math.sin(t * 7) * 0.04;
      const ns = nextStop(); for (const st of stops) { const on = st === ns && st.s - D.P.s < 16 && st.s - D.P.s > -3 && G.bins[st.b].length; st.gl.material.opacity = on ? 0.6 + Math.sin(t * 10) * 0.3 : 0; }
      if (G.phase === 'route') { if (ns && D.P.s > ns.s + 3) { G.missed += G.bins[ns.b].length; G.bins[ns.b] = []; ns.done = true; say(['MAILBOX', R.pick(['Missed it. They will get it tomorrow. Or never.', 'That was a stop.'])]); }
        if (G.auto && ns && ns.s - D.P.s < 12 && ns.s - D.P.s > 0 && D.P.x > 0.5 && (G.autoK = (G.autoK || 0) + dt) > 0.25) { G.autoK = 0; toss(); }
        for (const e of D.events.splice(0)) if (e === 'bump' || e === 'tbone') { sfx.crash(); say(['MAILBOX', 'Careful. I am full of glass. (Postcards of glass.)']); }
        if (D.P.s > STOPS[STOPS.length - 1][0] + 30) { G.phase = 'end'; D.P.done = true; finish(); } }
      for (const f of flying) if (f.t < 1) { f.t += dt * 2.2; f.e.position.lerpVectors(f.from, f.to, Math.min(1, f.t)); f.e.position.y += Math.sin(Math.min(1, f.t) * Math.PI) * 2; f.e.rotation.y += dt * 12; if (f.t >= 1) f.e.visible = false; }
    }
  };
  function finish() { const all = LETTERS.length - 1, stars = 1 + (G.wrong <= 1 ? 1 : 0) + (G.landed === all ? 1 : 0); const suns = ['rs_done']; if (stars === 3) suns.push('rs_star'); if (G.self) suns.push('rs_self');
    H.say([['', 'At the pink building, a letter slides back out under the door of Apartment 6.'], ['', 'On the back, in pencil: "Not me."'], ['MAILBOX', 'Someone. Every time.']], () =>
      ctl.finish({ win: true, stars, title: 'MAIL DELIVERED', lines: [`${G.landed}/${all} landed · ${G.wrong} sorted wrong · ${G.missed} missed`, 'MAILBOX: "Same time tomorrow. It will all be wrong again."'], suns })); }
  function autoAx() { const P = D.P; let want = 3.2; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 18 && Math.abs(n.x - want) < 2.2) want = 1.2; } return clamp((want - P.x) * 0.6, -1, 1); }
  return inst;
}
