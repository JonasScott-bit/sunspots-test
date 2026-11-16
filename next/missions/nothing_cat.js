// missions/nothing_cat.js — NOTHING THE CAT (Night 4). A flyer flaps on the laundromat pole: LOST: NOTHING. A black cat.
// Answers to Nothing. Nobody has ever seen him. Anteater has (a nose like that, you notice things).
// Listening + stealth in the Spin Cycle laundromat after hours: you can't see Nothing, you hear him. His collar bell
// jingles (the ♪ marks drift toward where it came from, the closer you are the sharper they get). Drag to sneak.
// When his tail flicks (the room dims, 👁), FREEZE: move while he's looking and he bolts to another hiding place.
// Get close while he loafs and GRAB. Anteater can SNIFF (three times): his paw prints glow for a moment.
// Stars: caught · bolted once or never · sniffed once or never. Secret: read the flyer on the wall (tap it).
// QA: ?m=nothing_cat [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, pickNear, toScreen, TAU } from './kit.js';

registerMission({
  id: 'nothing_cat', key: 'nothing', title: 'NOTHING THE CAT', chip: 'NOTHING THE CAT', room: 'laundromat', night: 4, where: 'The laundromat (after hours)',
  rumour: 'LOST: NOTHING. A black cat. The flyer on the laundromat pole has been there for years. The tail was seen Tuesday.',
  todo: 'Find Nothing the cat (the laundromat, after hours)', doneMsg: '. You found Nothing. He was there the whole time.',
  suns: [{ id: 'nc_done', name: 'NOTHING THE CAT', how: 'Find Nothing the cat in the laundromat' }, { id: 'nc_star', name: 'QUIET AS NOTHING', how: 'Three stars finding Nothing' }, { id: 'nc_flyer', name: 'REWARD: NOTHING', how: 'Read the flyer' }],
  tip: 'FOLLOW THE BELL ♪ · FREEZE WHEN HIS TAIL FLICKS', hintSide: true,
  create,
});
const SPOTS = [[-5, -3.2, 'IN DRYER 3'], [-1.6, -3.2, 'ON THE FOLDING TABLE'], [3.2, -3.2, 'IN DRYER 7'], [5.6, 0.4, 'IN THE LOST SOCKS BIN'], [1.0, 2.2, 'UNDER THE BENCH'], [-4.6, 2.6, 'IN A LAUNDRY BASKET'], [-0.8, -0.4, 'ON TOP OF WASHER 4']];

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  scene.background = new THREE.Color('#0e1020');
  const hemi = new THREE.HemisphereLight('#8a9ad8', '#2a2434', 0.8); scene.add(hemi); const vend = new THREE.PointLight('#7af2ff', 12, 12, 1.6); vend.position.set(6.5, 2.4, -2); scene.add(vend);
  const R = rng(404);
  { const m = new Merge(); m.box(16, 0.1, 10, '#c9c0b0', 0, -0.05, 0); m.box(16, 5, 0.2, '#e0d6f0', 0, 2.5, -4.6); for (const sx of [-1, 1]) m.box(0.2, 5, 10, '#d0c6e0', sx * 8, 2.5, 0);
    for (let i = 0; i < 6; i++) { const x = -5.6 + i * 1.8; m.box(1.5, 1.6, 1.2, '#f6f2e8', x, 0.8, -3.9); m.cyl(0.5, 0.5, 0.06, '#5a6a8a', x, 0.85, -3.28, 14, Math.PI / 2); m.box(1.5, 1.4, 1.2, '#f6f2e8', x, 2.4, -3.9); m.cyl(0.45, 0.45, 0.06, '#3a3a40', x, 2.4, -3.28, 14, Math.PI / 2); }
    for (let i = 0; i < 4; i++) m.box(1.4, 1.1, 1.2, '#c9e0e8', -3 + i * 1.6, 0.55, -0.4); m.box(3, 0.9, 1.0, '#a8784a', -1.6, 0.45, -2.6); m.box(3.4, 0.5, 0.8, '#3a6a8a', 1.0, 0.5, 2.6); m.box(1.2, 0.9, 1.2, '#c9302a', 5.6, 0.45, 0.4); m.cyl(0.6, 0.5, 0.7, '#e0c890', -4.6, 0.35, 2.6, 10);
    m.box(1.2, 2.4, 0.9, '#2a5a8a', 6.6, 1.2, -2.4); scene.add(m.mesh()); }
  const flyer = sign('LOST: NOTHING\nBLACK CAT\nREWARD', 1.0, 1.2, { bg: '#f6efe0', fg: '#2b1e3c' }); flyer.position.set(-7.85, 2.4, 0.5); flyer.rotation.y = Math.PI / 2; scene.add(flyer);
  const nameS = sign('SPIN CYCLE · OPEN 24 HRS (NOT TONIGHT)', 6, 0.6, { bg: '#2a2240', fg: '#7af2ff' }); nameS.position.set(0, 3.55, -4.45); scene.add(nameS);
  // Nothing: a black felt cat that is almost not there
  const cat = new THREE.Group(); { const m = new Merge(); m.ball(0.32, '#121014', 0, 0.3, 0, 1.4, 0.9, 1); m.ball(0.22, '#121014', 0.42, 0.5, 0); m.cone(0.08, 0.16, '#121014', 0.42, 0.72, 0.1, 4); m.cone(0.08, 0.16, '#121014', 0.42, 0.72, -0.1, 4); m.cyl(0.04, 0.04, 0.6, '#121014', -0.5, 0.5, 0, 5, 0, 0.8); cat.add(new THREE.Mesh(m.mesh().geometry, felt('#ffffff', { vertexColors: true, transparent: true, opacity: 0.85 }))); }
  const ceyes = new THREE.Group(); for (const z of [-0.07, 0.07]) { const e = glowSprite('#d8ff6a', 0.14, 0.14, 1); e.position.set(0.6, 0.54, z); ceyes.add(e); } cat.add(ceyes); scene.add(cat);
  const bell = glowSprite('#ffd86a', 0.3, 0.3, 0.9); bell.position.set(0.5, 0.32, 0); cat.add(bell);
  const prints = []; for (let i = 0; i < 14; i++) { const p = mesh(new THREE.CircleGeometry(0.1, 8), glowMat('#7af2c2', 0.8), null, scene); p.rotation.x = -Math.PI / 2; p.visible = false; prints.push(p); }
  const wolf = CAST.wolf(), ant = CAST.anteater(); scene.add(wolf, ant);
  const G = { phase: 'off', t: 0, at: 0, st: 'loaf', stT: 5, bolts: 0, sniffs: 0, sniffT: 0, flyer: false, jT: 1, auto: false, said: {}, dash: null };
  const P = { x: 0, z: 3.6 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const spot = (i) => new THREE.Vector3(SPOTS[i][0], 0, SPOTS[i][1]);
  function jingle() { const c = spot(G.at), d = Math.hypot(P.x - c.x, P.z - c.z), fuzz = clamp(d * 0.35, 0.2, 2.5), pos = c.clone().add(new THREE.Vector3((R() - 0.5) * fuzz, 1.2, (R() - 0.5) * fuzz)); const s = toScreen(pos, camera); H.float(s.x, s.y, d < 3 ? '♪♪' : '♪', '#ffd86a'); sfx.tone(2600 + R() * 400, 0.06, 'sine', clamp(0.25 - d * 0.02, 0.04, 0.25)); sfx.tone(3300, 0.05, 'sine', clamp(0.18 - d * 0.02, 0.03, 0.2), 0, 0.07); }
  function bolt() { G.bolts++; let j; do j = Math.floor(R() * SPOTS.length); while (j === G.at || spot(j).distanceTo(spot(G.at)) < 4); G.dash = { from: spot(G.at), to: spot(j), t: 0, j }; sfx.whoosh(); H.pill('b', `BOLTED ${G.bolts}`); say(['ANTEATER', R.pick(['He went. I felt him go.', 'Gone. Somewhere left. Or right.', 'He saw you. He sees everything. Nobody sees him.'])]); G.st = 'loaf'; G.stT = 4; }
  function sniff() { if (G.phase !== 'hunt' || G.sniffs >= 3) return; G.sniffs++; G.sniffT = 3.2; sfx.tone(300, 0.3, 'sawtooth', 0.06, 0.6); H.btn.sniff.innerHTML = `SNIFF<br>${3 - G.sniffs}`; if (G.sniffs >= 3) H.btn.sniff.disabled = true;
    const a = new THREE.Vector3(P.x, 0, P.z), b = spot(G.at); prints.forEach((p, i) => { const k = (i + 1) / (prints.length + 1); p.position.lerpVectors(a, b, k); p.position.x += Math.sin(i * 1.7) * 0.25; p.position.y = 0.02; p.visible = true; }); say(['ANTEATER', R.pick(['Sniff. That way.', 'Cat. Recent. Fabric softener.', 'He went past the dryers.'])]); }
  function grab() { if (G.phase !== 'hunt') return; const c = spot(G.at), d = Math.hypot(P.x - c.x, P.z - c.z); if (G.dash || d > 1.5) { sfx.bad(); if (!G.said.far) { G.said.far = 1; say(['ANTEATER', 'Closer. He is right there. Probably.']); } return; }
    if (G.st === 'watch') { bolt(); return; } G.phase = 'done'; sfx.good(); cat.visible = true; ceyes.visible = true; cat.position.copy(c);
    H.say([['', `${SPOTS[G.at][2]}: a warm, heavy, purring nothing.`], ['ANTEATER', 'Nothing. Hello, Nothing.'], ['', 'Nothing looks at you like you are the one who was lost.']], () => {
      const stars = 1 + (G.bolts <= 1 ? 1 : 0) + (G.sniffs <= 1 ? 1 : 0); const suns = ['nc_done']; if (stars === 3) suns.push('nc_star'); if (G.flyer) suns.push('nc_flyer');
      ctl.finish({ win: true, stars, title: 'YOU FOUND NOTHING', lines: [`${Math.round(G.t)} s · bolted ${G.bolts} · sniffed ${G.sniffs}`, 'ANTEATER: "He lives here. He is not lost. The flyer is lost."'], suns }); }); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, at: [2, 3, 5][Math.floor(Math.random() * 3)], st: 'loaf', stT: 6, bolts: 0, sniffs: 0, sniffT: 0, flyer: false, jT: 1, said: {}, dash: null }); P.x = 0; P.z = 3.6; for (const p of prints) p.visible = false;
    H.pill('b', 'BOLTED 0'); H.pill('t', '2:30'); const gb = H.button('grab', 'GRAB'); gb.onDown = grab; const sb = H.button('sniff', 'SNIFF<br>3', { alt: true }); sb.onDown = sniff; c.I.padOn = true;
    c.I.onTap = (x, y) => { if (!G.flyer && pickNear([flyer], x, y, camera, 80)) { G.flyer = true; sfx.star(2); H.toast('☀ REWARD: NOTHING'); H.say([['', 'LOST: NOTHING. Black cat. Answers to Nothing. Has never answered.'], ['', 'REWARD: NOTHING. (Small print: he is fine.)']]); } };
    H.say([['ANTEATER', 'Nothing lives here. Nobody has ever seen him.'], ['ANTEATER', 'Listen for the bell. When his tail flicks, freeze.'], ['ANTEATER', 'I can sniff him out. Three times. My nose gets tired.']], () => { G.phase = 'hunt'; G.t = 0; H.hint('LISTEN · DRAG TO SNEAK', 2); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 600);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; let ax = I.axis(); if (G.auto) ax = autoAx(); const hunt = G.phase === 'hunt'; if (!hunt) ax = { x: 0, y: 0 };
    const mv = Math.hypot(ax.x, ax.y); P.x = clamp(P.x + ax.x * dt * 3.2, -7.4, 7.4); P.z = clamp(P.z + ax.y * dt * 3.2, -2.6, 4.4);
    for (const [cx, cz, hw, hd] of [[-1.6, -0.4, 3.3, 0.7], [-1.6, -2.6, 1.6, 0.6], [1.0, 2.6, 1.8, 0.5]]) { if (Math.abs(P.x - cx) < hw && Math.abs(P.z - cz) < hd) { if (Math.abs(P.x - cx) / hw > Math.abs(P.z - cz) / hd) P.x = cx + Math.sign(P.x - cx) * hw; else P.z = cz + Math.sign(P.z - cz) * hd; } }
    wolf.position.set(P.x, 0, P.z); if (mv > 0.1) wolf.rotation.y = Math.atan2(ax.x, ax.y); animPal(wolf, dt, t, { walk: mv * 0.7 });
    ant.position.lerp(new THREE.Vector3(P.x - 0.9, 0, P.z + 0.8), Math.min(1, dt * 2)); ant.rotation.y = Math.atan2(P.x - ant.position.x, P.z - ant.position.z); animPal(ant, dt, t, { walk: 0.4 });
    // Nothing
    if (G.dash) { G.dash.t += dt * 1.8; const k = Math.min(1, G.dash.t); cat.position.lerpVectors(G.dash.from, G.dash.to, k); if (k >= 1) { G.at = G.dash.j; G.dash = null; } } else cat.position.copy(spot(G.at));
    const d = Math.hypot(P.x - cat.position.x, P.z - cat.position.z); cat.visible = !!G.dash || d < 2.2 || G.phase === 'done'; cat.children[0].material.opacity = G.dash ? 0.5 : clamp(1.4 - d * 0.5, 0.15, 0.85); ceyes.visible = cat.visible && G.st === 'watch';
    if (hunt) { G.stT -= dt; if (G.st === 'loaf' && G.stT <= 0 && !G.dash) { G.st = 'warn'; G.stT = 0.9; sfx.tone(240, 0.3, 'triangle', 0.12, 1.6); H.hint('👁 FREEZE', 0); }
      else if (G.st === 'warn' && G.stT <= 0) { G.st = 'watch'; G.stT = 2.2; } else if (G.st === 'watch') { if (mv > 0.15 && d < 6) { H.hint('', 0); bolt(); } else if (G.stT <= 0) { G.st = 'loaf'; G.stT = 4 + R() * 4; H.hint('', 0); } }
      hemi.intensity = lerp(hemi.intensity, G.st === 'loaf' ? 0.8 : 0.4, Math.min(1, dt * 6));
      G.jT -= dt; if (G.jT <= 0 && !G.dash) { G.jT = d < 3 ? 1.1 : 2.2; jingle(); }
      if (G.sniffT > 0) { G.sniffT -= dt; if (G.sniffT <= 0) for (const p of prints) p.visible = false; }
      const left = Math.max(0, 150 - G.t); H.pill('t', `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, left < 20);
      if (G.auto && d < 1.2 && G.st === 'loaf') grab();
      if (left <= 0) { G.phase = 'done'; H.say([['ANTEATER', 'He is still here. He is always here.']], () => ctl.finish({ win: false, stars: 0, title: 'NOTHING FOUND', lines: [`Bolted ${G.bolts} times.`, 'ANTEATER: "Freeze when the tail flicks."'], suns: [] })); } }
    const por = camera.aspect < 1; nameS.visible = !por; const cx = por ? clamp(P.x, -4.2, 4.2) : P.x * 0.2, cz = por ? clamp(P.z * 0.5, -1, 1.6) : 0; G.camX = lerp(G.camX ?? cx, cx, Math.min(1, dt * 3)); camera.position.set(G.camX, por ? 12 : 9.5, por ? cz + 7.5 : 8.5 + P.z * 0.2); camera.lookAt(G.camX, 0, por ? cz - 0.6 : 0);
  };
  function autoAx() { if (G.st !== 'loaf' || G.dash) return { x: 0, y: 0 }; if (G.sniffs < 1 && G.t > 2) sniff(); const c = spot(G.at), dx = c.x - P.x, dz = c.z + 0.9 - P.z, l = Math.hypot(dx, dz); if (l < 0.3) return { x: 0, y: 0 }; return { x: dx / l, y: dz / l }; }
  return inst;
}
