// missions/ant_farm.js — ANT FARM STRIKE (Night 2). The ants in Anteater's ant farm have walked off the job: tiny picket
// signs, a tiny union, one demand per verse. Banana Squid speaks Ant (it's mostly rhythm). Call and response: the colony
// plays a chant on its four chambers (STOMP, CLAP, HUM, KAZOO); you echo it back on the four pads. Get the order right and
// keep the groove and they grant you the next clause. Six verses, three slip-ups allowed. Anteater has never eaten an ant.
// Stars: settled · 1 slip-up or fewer · mostly PERFECT. Secret: one ant is not on strike. He's reading. Tap him.
// QA: ?m=ant_farm [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, canvasTex, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, pickNear, toScreen, blobShadow, TAU, M4 } from './kit.js';

registerMission({
  id: 'ant_farm', key: 'ants', title: 'ANT FARM STRIKE', chip: 'ANT FARM STRIKE', room: 'anteater', night: 2, where: "Anteater's breakfast room",
  rumour: "Anteater's ant farm has gone very quiet. Tiny signs in the sand. Banana Squid has been asked to come over.",
  todo: "Talk the ants back to work (Anteater's house)", doneMsg: '. The ants signed. In very small writing.',
  suns: [{ id: 'af_done', name: 'ANT FARM STRIKE', how: "Settle the strike in Anteater's ant farm" }, { id: 'af_star', name: 'UNION REP', how: 'Three stars at the ant farm' }, { id: 'af_book', name: 'THE ONE WHO READS', how: 'One ant is not on strike' }],
  create,
});

const PADS = [{ label: 'STOMP', col: '#e0603a', f: 0 }, { label: 'CLAP', col: '#f2c230', f: 1 }, { label: 'HUM', col: '#3fb8a8', f: 2 }, { label: 'KAZOO', col: '#b07ae0', f: 3 }];
const VERSES = [
  { demand: 'MORE CRUMBS', n: 3, give: ['ANTEATER', 'Crumbs. Yes. Toast crumbs, every morning.'], squid: 'They say: more crumbs. Toast, specifically.' },
  { demand: 'NO TAPPING ON THE GLASS', n: 4, give: ['ANTEATER', 'I would never. Wolf, stop tapping the glass.'], squid: 'They say: nobody taps the glass.' },
  { demand: 'A TINY WINDOW', n: 4, give: ['ANTEATER', 'I can cut a tiny window. With a tiny saw.'], squid: 'A window. So they can see out. You are the view.' },
  { demand: 'WEEKENDS', n: 5, give: ['ANTEATER', 'Fine. Weekends. Saturday AND Sunday.'], squid: 'Weekends. They want to know what they are.' },
  { demand: 'A NAME FOR THE FARM', n: 6, give: ['ANTEATER', '"The Colony." No. "Hill Valley." No. "Sand Town."'], squid: 'They want a name. They are taking "Sand Town".' },
  { demand: 'RESPECT', n: 7, give: ['ANTEATER', 'You have it. I have never eaten an ant. I am a vegetarian.'], squid: 'Final verse. They want respect. And it is in four-four.' },
];

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  scene.background = new THREE.Color('#2a1a26');
  scene.add(new THREE.HemisphereLight('#ffe6c8', '#3a2430', 0.9)); const key = new THREE.DirectionalLight('#ffd8a8', 1.1); key.position.set(-4, 9, 8); scene.add(key);
  const lampL = new THREE.PointLight('#ffc37a', 18, 14, 1.6); lampL.position.set(-5.4, 5.6, 1.2); scene.add(lampL);
  const R = rng(4004), room = new THREE.Group(); scene.add(room);
  // a Storybook-Tudor breakfast room at night: cream plaster, dark beams, a diamond-pane window with the moon in it
  { const m = new Merge(); m.box(30, 14, 0.2, '#efe2c4', 0, 7, -2.2); m.box(30, 0.2, 24, '#7a4a2e', 0, 0, 9.8);
    for (const x of [-12, -7.5, 7.5, 12]) m.box(0.5, 14, 0.25, '#4a2a1a', x, 7, -2.05); m.box(30, 0.5, 0.25, '#4a2a1a', 0, 9.2, -2.05); m.box(30, 0.5, 0.25, '#4a2a1a', 0, 0.25, -2.05);
    m.box(7.4, 0.24, 2.4, '#6a3a22', 0, 1.0, -0.6); for (const x of [-3.4, 3.4]) m.box(0.26, 1.0, 0.26, '#4a2a1a', x, 0.5, -0.6);   // the desk
    m.box(3.4, 3.2, 0.12, '#4a2a1a', -10, 6.8, -2.08); m.box(3.0, 2.8, 0.06, '#1c2a5a', -10, 6.8, -2.0);
    m.cyl(0.8, 1.2, 0.8, '#d98a3a', -6.2, 6.0, -1.2, 10); m.cyl(0.06, 0.06, 5.6, '#2a2220', -6.2, 2.8, -1.2, 6); m.cyl(0.5, 0.5, 0.12, '#2a2220', -6.2, 0.06, -1.2, 10);   // a floor lamp
    room.add(m.mesh()); }
  const moon = mesh(new THREE.CircleGeometry(0.6, 20), glowMat('#fff2c8'), [-9.6, 7.3, -1.95], room); const lg = glowSprite('#ffc37a', 4, 4, 0.5); lg.position.set(-6.2, 5.6, -1.0); room.add(lg);
  const banner = sign('LOCAL 4 · ANTS ON STRIKE', 6.4, 0.9, { bg: '#c9302a', fg: '#fff3dc' }); banner.position.set(0, 6.75, -2.0); room.add(banner);
  // the farm: a sand slab between glass, four chambers joined by tunnels
  const FW = 8, FH = 4.6, FY = 1.1 + FH / 2, CH = [[-2.9, -0.9], [-0.95, 0.5], [0.95, -0.6], [2.9, 0.6]].map(([x, y]) => ({ x, y: FY + y, rx: 0.82, ry: 0.55 }));
  const sandT = canvasTex(512, 300, (g, w, h) => { g.fillStyle = '#d9b27a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${120 + Math.random() * 60},${80 + Math.random() * 40},40,.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#1e2040'; g.fillRect(0, 0, w, h * 0.09); const X = (x) => (x / FW + 0.5) * w, Y = (y) => (1 - (y - FY + FH / 2) / FH) * h; g.strokeStyle = '#6a4424'; g.lineCap = 'round'; g.lineWidth = 22;
    g.beginPath(); g.moveTo(X(-2.9), Y(FY + FH / 2 - 0.3)); for (const c of CH) g.lineTo(X(c.x), Y(c.y)); g.stroke(); g.beginPath(); g.moveTo(X(0.95), Y(CH[2].y)); g.lineTo(X(1.8), Y(FY + FH / 2 - 0.3)); g.stroke(); g.beginPath(); g.moveTo(X(2.9), Y(CH[3].y)); g.lineTo(X(3.5), Y(FY + 1.75)); g.stroke();
    g.fillStyle = '#5a3a1e'; for (const c of CH) { g.beginPath(); g.ellipse(X(c.x), Y(c.y), c.rx / FW * w, c.ry / FH * h, 0, 0, TAU); g.fill(); } g.beginPath(); g.ellipse(X(3.5), Y(FY + 1.75), 22, 16, 0, 0, TAU); g.fill(); });
  const farm = new THREE.Group(); room.add(farm);
  mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshLambertMaterial({ map: sandT }), [0, FY, 0], farm);
  { const m = new Merge(); m.box(FW + 0.5, 0.3, 0.6, '#7a3a1e', 0, FY - FH / 2 - 0.15, 0); m.box(FW + 0.5, 0.25, 0.6, '#7a3a1e', 0, FY + FH / 2 + 0.12, 0); for (const x of [-1, 1]) m.box(0.28, FH + 0.5, 0.6, '#7a3a1e', x * (FW / 2 + 0.11), FY, 0); farm.add(m.mesh()); }
  const glass = mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.08, depthWrite: false }), [0, FY, 0.28], farm);
  for (const [i, c] of CH.entries()) { const tb = sign(PADS[i].label, 0.9, 0.26, { bg: PADS[i].col, fg: '#2b1e3c', border: false }); tb.position.set(c.x, c.y - c.ry - 0.12, 0.2); farm.add(tb); }
  const glows = CH.map((c, i) => { const s = glowSprite(PADS[i].col, 2.4, 1.8, 0); s.position.set(c.x, c.y, 0.2); farm.add(s); return s; });
  // ants: one InstancedMesh, 7 per chamber + 9 picketing on the surface
  const antM = new Merge(); antM.ball(0.09, '#2a1a1a', 0, 0.1, 0, 1, 0.9, 1, 6, 4); antM.ball(0.07, '#2a1a1a', -0.13, 0.1, 0, 1, 1, 1, 6, 4); antM.ball(0.11, '#3a1a1a', 0.16, 0.1, 0, 1.3, 0.9, 1, 6, 4);
  for (const x of [-0.06, 0.02, 0.1]) antM.box(0.02, 0.02, 0.24, '#2a1a1a', x, 0.04, 0, 0, 0, 0); antM.ball(0.03, '#f6f2e8', -0.17, 0.14, 0.05, 1, 1, 1, 4, 3);
  const aGeo = antM.mesh().geometry, N = 28 + 9, ants = new THREE.InstancedMesh(aGeo, felt('#ffffff', { vertexColors: true }), N); farm.add(ants); ants.position.z = 0.12;
  const A = []; for (let i = 0; i < N; i++) { const ch = i < 28 ? i % 4 : -1; A.push({ ch, a: R() * TAU, r: 0.3 + R() * 0.5, sp: (R() < 0.5 ? -1 : 1) * (0.3 + R() * 0.5), jump: 0, x: -3.5 + (i - 28) * 0.8 }); }
  // picket signs (a few per chamber + the surface line)
  const SIGNS = ['ON STRIKE', 'MORE CRUMBS', 'WE DIG IT', 'NO TAPPING', 'LOCAL 4', 'SAND TOWN', 'UNFAIR', 'HONK'];
  const pick = []; for (let i = 0; i < 12; i++) { const g = new THREE.Group(); box(0.03, 0.42, 0.02, '#c9a27a', [0, 0.21, 0], g); const s = sign(SIGNS[i % SIGNS.length], 0.62, 0.3, { bg: i % 3 ? '#f6efe0' : '#c9302a', fg: i % 3 ? '#2a1a14' : '#fff3dc', border: false }); s.position.y = 0.5; g.add(s); farm.add(g); pick.push({ g, ch: i < 8 ? i % 4 : -1, i }); }
  // the one who reads
  const reader = new THREE.Group(); { const m = new Merge(); m.ball(0.11, '#3a1a1a', 0, 0.1, 0, 1.3, 0.9, 1, 6, 4); m.ball(0.09, '#2a1a1a', -0.15, 0.08, 0); m.box(0.18, 0.13, 0.03, '#2f5a8a', 0.15, 0.14, 0.06, 0.3); reader.add(m.mesh()); } reader.position.set(3.5, FY + 1.68, 0.12); farm.add(reader);
  // the crew
  const anteater = CAST.anteater(), squid = CAST.squid(), wolf = CAST.wolf(); for (const p of [anteater, squid, wolf]) { p.scale.setScalar(1.35); room.add(p); }
  const G = { phase: 'off', t: 0, v: 0, slips: 0, perfect: 0, notes: 0, pat: [], k: 0, tap0: 0, said: {}, book: false, auto: false };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null, pads = [];
  const beat = 60 / 100, half = beat / 2;
  function makePattern(n) { const p = []; let t = 0; for (let i = 0; i < n; i++) { p.push({ pad: Math.floor(R() * 4), t }); t += R() < 0.3 && G.v > 1 ? half : R() < 0.75 ? beat : beat * 1.5; } for (let i = 1; i < p.length; i++) if (p[i].pad === p[i - 1].pad && R() < 0.5) p[i].pad = (p[i].pad + 1 + Math.floor(R() * 3)) % 4; return p; }
  function play(i) { const f = PADS[i].f; if (f === 0) sfx.drum(0); else if (f === 1) { sfx.drum(1); sfx.tone(1400, 0.05, 'square', 0.05); } else if (f === 2) sfx.note(262 + 33 * (G.v % 3), 0.28, 'sine', 0.3); else sfx.tone(466, 0.22, 'sawtooth', 0.12, 1.12); glows[i].material.opacity = 0.9; for (const a of A) if (a.ch === i) a.jump = 0.25 + Math.random() * 0.1; }
  function verse() { const V = VERSES[G.v]; G.pat = makePattern(V.n); G.phase = 'call'; G.t = -beat * 2; G.k = 0; G.ticks = 0; H.hint(`VERSE ${G.v + 1}: ${V.demand}`, 0); setPads(false); H.pill('verse', `VERSE ${G.v + 1}/6`); }
  function setPads(on) { for (const b of pads) b.disabled = !on; }
  function hit(i) {
    play(i); if (G.phase !== 'echo') return; const n = G.pat[G.k], now = G.t; if (!n) return;
    if (i !== n.pad) { slip('Wrong chamber.'); return; }
    if (G.k === 0) G.tap0 = now; const err = Math.abs((now - G.tap0) - n.t); G.notes++; const sp = toScreen(new THREE.Vector3(CH[i].x, CH[i].y + 0.9, 0.3), camera);
    if (err < 0.11) { G.perfect++; H.float(sp.x, sp.y, 'PERFECT', '#ffe86a'); } else if (err < 0.26) H.float(sp.x, sp.y, 'GOOD', '#bff2e0'); else H.float(sp.x, sp.y, 'LATE-ISH', '#f2b0a0');
    G.k++; G.last = now; if (G.k >= G.pat.length) granted();
  }
  function slip(why) { G.slips++; sfx.bad(); H.pill('slips', '❤'.repeat(Math.max(0, 3 - G.slips)) + '♡'.repeat(Math.min(3, G.slips))); setPads(false);
    if (G.slips >= 3) { G.phase = 'done'; H.say([['BANANA SQUID', 'They are going back to the picket line.'], ['ANTEATER', 'I will make toast anyway.']], () => ctl.finish({ win: false, stars: 0, title: 'STILL ON STRIKE', lines: [`Got to verse ${G.v + 1} of 6.`, 'BANANA SQUID: "Listen to the first beat. Then the gaps."'], suns: [] })); return; }
    G.phase = 'wait'; H.say([['BANANA SQUID', why + ' ' + R.pick(['Again. Slower in your heart.', 'They will say it again.', 'Ant is a hard language.'])]], () => { if (G.phase === 'wait') { G.pat.forEach(() => 0); G.phase = 'call'; G.t = -beat * 2; G.k = 0; G.ticks = 0; } }); }
  function granted() { setPads(false); G.phase = 'wait'; sfx.good(); for (const a of A) a.jump = 0.35; const V = VERSES[G.v]; H.pill('strike', `STRIKE ${Math.round((1 - (G.v + 1) / 6) * 100)}%`);
    H.say([V.give, ...(G.v === 5 ? [['BANANA SQUID', 'They accept. They are going back to work.'], ['BANANA SQUID', 'Work is mostly carrying one crumb very far.']] : [])], () => { G.v++; if (G.v >= 6) done(); else { H.say([['BANANA SQUID', VERSES[G.v].squid]], () => verse()); } }); }
  function done() { G.phase = 'done'; const pr = G.notes ? G.perfect / G.notes : 0, stars = 1 + (G.slips <= 1 ? 1 : 0) + (pr >= 0.6 ? 1 : 0); const suns = ['af_done']; if (stars === 3) suns.push('af_star'); if (G.book) suns.push('af_book');
    ctl.finish({ win: true, stars, title: 'STRIKE SETTLED', lines: [`${G.perfect}/${G.notes} PERFECT · ${G.slips} slip-up${G.slips === 1 ? '' : 's'}`, 'ANTEATER: "Toast. Every morning. It is in writing now."'], suns }); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, v: 0, slips: 0, perfect: 0, notes: 0, k: 0, said: {}, book: false });
    pads = H.pads(PADS, hit); setPads(false); H.pill('verse', 'VERSE 1/6'); H.pill('slips', '❤❤❤'); H.pill('strike', 'STRIKE 100%');
    c.I.padOn = false; c.I.onTap = (x, y) => { if (pickNear([reader], x, y, camera, 60) && !G.book) { G.book = true; sfx.star(2); H.toast('☀ THE ONE WHO READS'); H.say([['', 'One ant, off by himself, with a very small book.'], ['BANANA SQUID', 'He is not on strike. He is on page two hundred and twelve.']]); } };
    for (const [k, i] of [['1', 0], ['2', 1], ['3', 2], ['4', 3], ['arrowleft', 0], ['arrowup', 1], ['arrowdown', 2], ['arrowright', 3]]) G['k' + k] = i;
    onkeydown = (e) => { const i = G['k' + e.key.toLowerCase()]; if (i !== undefined && !pads[i]?.disabled) { pads[i].classList.add('on'); setTimeout(() => pads[i].classList.remove('on'), 90); hit(i); } };
    H.say([['ANTEATER', 'They stopped digging on Tuesday. Then the signs came out.'], ['BANANA SQUID', 'I speak a little Ant. It is all rhythm.'], ['BANANA SQUID', 'They chant it. You chant it back. Same pads, same gaps.'], ['WOLF', 'What do they want?'], ['BANANA SQUID', VERSES[0].squid]], () => verse());
    if (G.auto) { G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 700); }
  };
  inst.stop = () => { G.phase = 'off'; onkeydown = null; clearInterval(G.autoT); };
  inst.update = (dt, t) => {
    G.t += dt;
    if (G.phase === 'call') { if (G.t < 0) { const tk = Math.floor((G.t + beat * 2) / beat); if (tk >= G.ticks && G.ticks < 2) { G.ticks++; sfx.tick(); } }
      while (G.k < G.pat.length && G.t >= G.pat[G.k].t) { const i = G.pat[G.k].pad; play(i); H.flash(pads[i], 220); G.k++; }
      if (G.k >= G.pat.length && G.t > G.pat[G.pat.length - 1].t + beat) { G.phase = 'echo'; G.k = 0; G.t = 0; G.last = 0; setPads(true); H.hint('YOUR TURN', 1.1); sfx.ok(); } }
    if (G.phase === 'echo') { if (G.auto) { const n = G.pat[G.k]; if (n && ((G.k === 0 && G.t > 0.6) || (G.k > 0 && G.t - G.tap0 >= n.t))) { H.flash(pads[n.pad]); hit(n.pad); } }
      if ((G.k === 0 && G.t > 5) || (G.k > 0 && G.t - G.last > 3)) slip('Too quiet.'); }
    for (const g of glows) g.material.opacity = Math.max(0, g.material.opacity - dt * 3);
    // ants
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    A.forEach((a, i) => { let x, y, rz; if (a.ch >= 0) { const c = CH[a.ch]; a.a += a.sp * dt * (G.phase === 'done' ? 3 : 1); x = c.x + Math.cos(a.a) * c.rx * a.r * 1.4; y = c.y - c.ry * 0.75 + Math.abs(Math.sin(a.a * 0.5)) * 0.1; rz = 0; }
      else { a.x += dt * 0.5; if (a.x > 3.4) a.x = -3.6; x = a.x; y = FY + FH / 2 - 0.42; rz = 0; }
      if (a.jump > 0) { a.jump -= dt; y += Math.sin((a.jump / 0.35) * Math.PI) * 0.25; } e.set(0, a.ch >= 0 ? (Math.sin(a.a) > 0 ? Math.PI : 0) : 0, rz); q.setFromEuler(e); sc.setScalar(2.2); m.compose(v.set(x, y - FY, 0), q, sc); m.elements[13] += FY; ants.setMatrixAt(i, m); });
    ants.instanceMatrix.needsUpdate = true;
    pick.forEach((p) => { if (p.ch >= 0) { const c = CH[p.ch], o = p.i < 4 ? -0.45 : 0.4; p.g.position.set(c.x + o, c.y - c.ry * 0.75 + (A.find((a) => a.ch === p.ch)?.jump > 0 ? 0.15 : 0), 0.18); } else { p.g.position.set(((p.i * 1.9 + t * 0.5) % 7.2) - 3.6, FY + FH / 2 - 0.42, 0.18); } p.g.rotation.z = Math.sin(t * 3 + p.i) * 0.12; p.g.visible = G.phase !== 'done' || p.ch < 0; });
    reader.rotation.z = Math.sin(t * 0.7) * 0.05;
    // the crew + the camera
    const por = camera.aspect < 1;
    if (por) { anteater.position.set(-2.5, 0, 6.5); squid.position.set(2.5, 0, 6.5); wolf.position.set(0, 0, 8); } else { anteater.position.set(-5.4, 0, 0.6); squid.position.set(5.4, 0, 0.6); wolf.position.set(-7.6, 0, 1.6); }
    anteater.rotation.y = por ? 0.3 : 0.5; squid.rotation.y = por ? -0.3 : -0.5; wolf.rotation.y = 0.5;
    animPal(anteater, dt, t, { wave: G.phase === 'wait' ? 1 : 0 }); animPal(squid, dt, t, { cheer: G.phase === 'call' ? 1 : 0 }); animPal(wolf, dt, t, {});
    const hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, dist = por ? (FW / 2 + 0.6) / hf : 10.2;
    camera.position.set(0, por ? FY + 1.2 : FY + 0.6, dist); camera.lookAt(0, por ? FY - 2.4 : FY - 0.1, 0);
  };
  return inst;
}
