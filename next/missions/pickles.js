// missions/pickles.js — PICKLES (Night 1). Pickles is small, round, felt, and missing (again). Nan stands on the back
// porch of the tan Victorian shaking a treat tin at the dark. Bear came along. It's a flashlight hide-and-seek in Nan's
// garden: drag to sweep the torch, and anything with eyes glints back. Pickles' eyes glint amber; the frog's glint green;
// the moth just wants the light. When the light finds the hiding spot that rustles, tap it (or SEARCH). Pickles bolts
// twice before he lets you catch him. Bear's treat tin makes him squeak (three shakes).
// Stars: caught · 3 wrong searches or fewer · 1 shake or fewer. Secret: Nan's other glasses are somewhere in the garden.
// QA: ?m=pickles [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, felt, glowMat, glowSprite, sign, Merge, mesh, box, cyl, ball, nightSky, sfx, clamp, lerp, rng, pickNear, toScreen, blobShadow, TAU, M4 } from './kit.js';

registerMission({
  id: 'pickles', key: 'pick', title: 'PICKLES', chip: 'PICKLES', room: 'apt_vict', night: 1, where: 'The tan Victorian (Nan)',
  rumour: 'Nan is out on the back porch of the tan Victorian with a treat tin. Pickles is out again.',
  todo: "Find Pickles in Nan's garden (the tan Victorian)", doneMsg: '. Pickles is home. He was never lost. He says.',
  suns: [{ id: 'pk_done', name: 'PICKLES', how: "Find Pickles in Nan's garden" }, { id: 'pk_star', name: 'HAMSTER WHISPERER', how: "Three stars in Nan's garden" }, { id: 'pk_glass', name: "NAN'S OTHER GLASSES", how: "Nan's other glasses are out in the garden" }],
  tip: 'DRAG TO SWEEP THE TORCH · AMBER EYES = PICKLES',
  create,
});

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 400);
  scene.background = new THREE.Color('#0c0e24'); scene.fog = new THREE.Fog('#0c0e24', 22, 60);
  const sky = nightSky(scene, { top: '#070820', mid: '#141238', low: '#22183a', glow: '#4a3a8a', dusk: 0 });
  scene.add(new THREE.HemisphereLight('#6a72c0', '#1a1424', 0.55)); const moonL = new THREE.DirectionalLight('#8a90d8', 0.25); moonL.position.set(-6, 10, -8); scene.add(moonL);
  const porchL = new THREE.PointLight('#ffc37a', 9, 9, 1.8); porchL.position.set(0, 3.2, 6.2); scene.add(porchL);
  const torch = new THREE.SpotLight('#fff2c8', 60, 26, 0.36, 0.5, 1.4); scene.add(torch); scene.add(torch.target);
  const R = rng(321);
  // garden: lawn, path, fence, the back of the house + porch
  { const m = new Merge(); m.box(30, 0.2, 26, '#2f5a32', 0, -0.1, -2); m.box(1.4, 0.04, 10, '#8a7a6a', 0, 0.02, 0);
    for (let x = -9; x <= 9; x += 0.9) m.box(0.5, 1.8, 0.1, '#c9bca8', x, 0.9, -8.5); m.box(19, 0.12, 0.12, '#c9bca8', 0, 1.5, -8.45); for (const sx of [-1, 1]) for (let z = -8; z <= 5; z += 0.9) m.box(0.1, 1.8, 0.5, '#c9bca8', sx * 9.2, 0.9, z);
    m.box(6, 0.4, 2.4, '#7a5a3a', 0, 0.9, 6.0); for (let i = 0; i < 3; i++) m.box(2, 0.25, 0.5, '#6a4a2a', 0, 0.2 + i * 0.25, 4.6 - i * 0.4 + 0.8); for (const x of [-2.8, 2.8]) m.box(0.2, 2.6, 0.2, '#f6efe0', x, 2.2, 4.9);
    scene.add(m.mesh()); }
  const HIDE = [
    ['FLOWER POT', [-4.5, 0, -1.5], (m) => { m.cyl(0.55, 0.4, 0.8, '#c2603a', 0, 0.4, 0, 10); m.ball(0.6, '#3a8a4a', 0, 1.0, 0, 1, 0.7, 1); }],
    ['WATERING CAN', [3.6, 0, 0.5], (m) => { m.cyl(0.45, 0.45, 0.7, '#5a8aa8', 0, 0.35, 0, 10); m.cyl(0.06, 0.1, 0.9, '#5a8aa8', 0.6, 0.6, 0, 6, 0, -0.9); }],
    ['GARDEN GNOME', [-2.2, 0, -5.2], (m) => { m.cyl(0.3, 0.38, 0.6, '#3a5aa8', 0, 0.3, 0, 8); m.ball(0.26, '#e8c8a8', 0, 0.78, 0); m.ball(0.22, '#f6f2e8', 0, 0.66, 0.12, 1, 0.8, 0.6); m.cone(0.3, 0.6, '#c9302a', 0, 1.2, 0, 8); }],
    ['HEDGE', [6.5, 0, -4.5], (m) => { m.box(3.2, 1.5, 1.2, '#2a6a3a', 0, 0.75, 0); m.ball(0.7, '#2f7a42', -1, 1.4, 0); m.ball(0.8, '#2f7a42', 0.6, 1.5, 0); }],
    ['SHED', [-6.8, 0, -6.2], (m) => { m.box(2.6, 2.4, 2.2, '#8a5a6a', 0, 1.2, 0); m.cone(2.1, 1.1, '#5a2a3a', 0, 2.95, 0, 4, 0, Math.PI / 4); m.box(0.9, 1.6, 0.06, '#5a3a4a', 0.4, 0.8, 1.12); }],
    ['WHEELBARROW', [1.8, 0, -3.2], (m) => { m.box(1.4, 0.5, 0.9, '#c9302a', 0, 0.6, 0, 0.2); m.cyl(0.25, 0.25, 0.12, '#2a2426', 0.8, 0.25, 0, 8, 0, Math.PI / 2); m.box(0.08, 0.08, 1.2, '#6a4a2a', -0.9, 0.55, 0.3); m.box(0.08, 0.08, 1.2, '#6a4a2a', -0.9, 0.55, -0.3); }],
    ['BIRDBATH', [5.2, 0, 3.2], (m) => { m.cyl(0.15, 0.25, 1.0, '#c9c0b0', 0, 0.5, 0, 8); m.cyl(0.7, 0.5, 0.2, '#c9c0b0', 0, 1.05, 0, 12); m.cyl(0.6, 0.6, 0.04, '#5a7ab8', 0, 1.15, 0, 12); }],
    ['COMPOST BIN', [-6.5, 0, 2.0], (m) => { m.box(1.4, 1.2, 1.2, '#3a2a22', 0, 0.6, 0); m.box(1.5, 0.12, 1.3, '#4a3a2a', 0, 1.25, 0); }],
    ['UNDER THE STEPS', [0, 0, 4.2], (m) => { m.box(0.5, 0.3, 0.1, '#140e10', 0, 0.15, 0.5); }],
  ].map(([name, p, build]) => { const g = new THREE.Group(), m = new Merge(); build(m); g.add(m.mesh()); g.position.set(...p); scene.add(g); return { name, g, p: new THREE.Vector3(...p), wig: 0 }; });
  const gnome = HIDE[2]; const specs = new THREE.Group(); { const m = new Merge(); for (const x of [-0.08, 0.08]) m.add(new THREE.TorusGeometry(0.06, 0.015, 4, 10), '#c9a24a', M4(x, 0.82, 0.25)); specs.add(m.mesh()); } gnome.g.add(specs);
  // Pickles: small, round, felt
  const pk = new THREE.Group(); { const m = new Merge(); m.ball(0.28, '#e0a25a', 0, 0.26, 0, 1, 0.9, 1.1); m.ball(0.2, '#f6e6cc', 0, 0.2, 0.12, 1, 0.8, 0.8); for (const x of [-0.13, 0.13]) m.ball(0.08, '#e88a8a', x, 0.5, -0.02, 1, 1, 0.5); pk.add(m.mesh()); }
  const eyes = new THREE.Group(); for (const x of [-0.08, 0.08]) { const e = glowSprite('#ffb23a', 0.22, 0.22, 1); e.position.set(x, 0.34, 0.26); eyes.add(e); } pk.add(eyes); scene.add(pk); pk.visible = false;
  const frog = new THREE.Group(); for (const x of [-0.08, 0.08]) { const e = glowSprite('#7aff6a', 0.2, 0.2, 1); e.position.set(x, 0.2, 0); frog.add(e); } frog.position.set(-1.0, 0, 0.8); scene.add(frog);
  const moth = ball(0.12, '#c8bca8', [0, 2, 0], scene, 6, 4);
  const wolf = CAST.wolf(), bear = CAST.bear(), nan = CAST.nan(); wolf.position.set(-1.2, 1.1, 5.4); bear.position.set(1.4, 1.1, 5.6); nan.position.set(0.2, 1.1, 6.4); for (const p of [wolf, bear, nan]) { p.rotation.y = Math.PI; scene.add(p); }
  const tin = cyl(0.16, 0.16, 0.22, '#c9302a', [0.35, 0.95, -0.3], bear, 10);
  const pool = glowSprite('#fff2c8', 2.6, 2.6, 0.35); scene.add(pool);
  const aim = new THREE.Vector3(0, 0, 0);
  const G = { phase: 'off', t: 0, at: 0, round: 0, wrong: 0, shakes: 0, lit: 0, glasses: false, dash: null, said: {}, auto: false, busy: 0 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  function hideAt(i) { G.at = i; const h = HIDE[i]; pk.position.copy(h.p).add(new THREE.Vector3(0.7, 0, 0.6)); pk.visible = false; }
  function bolt() { let j; do j = Math.floor(R() * HIDE.length); while (j === G.at || HIDE[j].p.distanceTo(HIDE[G.at].p) < 5); G.dash = { from: pk.position.clone(), to: HIDE[j].p.clone().add(new THREE.Vector3(0.7, 0, 0.6)), t: 0, j }; pk.visible = true; sfx.whoosh(); sfx.tone(1400, 0.08, 'sine', 0.2, 1.3); }
  function search(h) {
    if (G.phase !== 'seek' || G.busy > 0 || G.dash) return; const i = HIDE.indexOf(h); G.busy = 0.6; h.wig = 0.6; sfx.bonk();
    const sp = toScreen(h.p.clone().setY(1.6), camera);
    if (h === gnome && !G.glasses && aim.distanceTo(h.p) < 2.2) { G.glasses = true; specs.visible = false; sfx.star(2); H.toast("☀ NAN'S OTHER GLASSES"); say(['NAN', 'My other glasses! The gnome has been reading.']); if (i !== G.at) return; }
    if (i === G.at) { G.round++; H.pill('r', `PICKLES ${G.round}/3`); if (G.round >= 3) return caught();
      H.float(sp.x, sp.y, 'ALMOST!', '#ffe86a'); say(G.round === 1 ? ['BEAR', 'He went that way! Every way!'] : ['NAN', 'He is playing. He thinks this is a game. It is a game.']); bolt(); }
    else { G.wrong++; H.float(sp.x, sp.y, `JUST A ${h.name}`, '#bfc8f2'); H.pill('w', `WRONG ${G.wrong}`); if (!G.said['w' + G.wrong] && G.wrong <= 3) { G.said['w' + G.wrong] = 1; say(['NAN', R.pick(['Not there, dear.', 'Look for the rustle.', 'His eyes are orange. Like a tiny sunset.'])]); } }
  }
  function caught() { G.phase = 'done'; pk.visible = true; sfx.good(); H.hint('GOT HIM', 2);
    H.say([['', 'A small, round, felt weight in your paws. He is warm. He is chewing something.'], ['NAN', 'Pickles! You were never lost. You were never lost.'], ['BEAR', 'What is he chewing?'], ['NAN', "Don't ask him that."]], () => {
      const stars = 1 + (G.wrong <= 3 ? 1 : 0) + (G.shakes <= 1 ? 1 : 0); const suns = ['pk_done']; if (stars === 3) suns.push('pk_star'); if (G.glasses) suns.push('pk_glass');
      ctl.finish({ win: true, stars, title: 'PICKLES IS HOME', lines: [`${Math.round(G.t)} s · ${G.wrong} wrong search${G.wrong === 1 ? '' : 'es'} · ${G.shakes} tin shake${G.shakes === 1 ? '' : 's'}`, 'NAN: "Same time next week, I expect."'], suns }); }); }
  function shake() { if (G.phase !== 'seek' || G.shakes >= 3) return; G.shakes++; sfx.drum(1); sfx.drum(1); tin.rotation.z = 0.6; H.btn.tin.innerHTML = `SHAKE<br>TIN ${3 - G.shakes}`; if (G.shakes >= 3) H.btn.tin.disabled = true;
    setTimeout(() => { sfx.tone(1600, 0.1, 'sine', 0.2, 1.2); const sp = toScreen(HIDE[G.at].p.clone().setY(1.2), camera); H.float(sp.x, sp.y, 'squeak!', '#ffb23a'); G.peek = 1.2; }, 500); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, round: 0, wrong: 0, shakes: 0, lit: 0, glasses: false, dash: null, said: {}, busy: 0, peek: 0 }); specs.visible = true; hideAt(5); aim.set(0, 0, 1);
    H.pill('r', 'PICKLES 0/3'); H.pill('w', 'WRONG 0'); H.pill('t', '2:00');
    const b = H.button('search', 'SEARCH'); b.onDown = () => { let best = null, bd = 2.2; for (const h of HIDE) { const d = h.p.distanceTo(aim); if (d < bd) { bd = d; best = h; } } if (best) search(best); };
    const tb = H.button('tin', 'SHAKE<br>TIN 3', { alt: true }); tb.onDown = shake;
    c.I.padOn = true; c.I.onTap = (x, y) => { const o = pickNear(HIDE.map((h) => h.g), x, y, camera, 80); if (o) { const h = HIDE.find((q) => q.g === o); aim.copy(h.p); search(h); } };
    H.say([['NAN', 'Pickles! Pickles. He does this.'], ['BEAR', 'Nan, it is midnight.'], ['NAN', 'He likes midnight. Wolf, dear, you have the torch.'], ['NAN', 'Sweep the garden. His eyes glint orange. When something rustles, look there.']], () => { G.phase = 'seek'; G.t = 0; H.hint('DRAG TO SWEEP THE TORCH', 2); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 600);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera); if (G.busy > 0) G.busy -= dt;
    let ax = I.axis(); if (G.auto && G.phase === 'seek') ax = autoAx(dt);
    if (G.phase === 'seek' || G.phase === 'talk') { aim.x = clamp(aim.x + ax.x * dt * 6, -8.5, 8.5); aim.z = clamp(aim.z + ax.y * dt * 6, -8, 4.5); }
    torch.position.copy(wolf.position).add(new THREE.Vector3(0.3, 1.3, -0.3)); torch.target.position.copy(aim); pool.position.copy(aim).setY(0.08);
    wolf.rotation.y = Math.atan2(aim.x - wolf.position.x, aim.z - wolf.position.z);
    // Pickles + the dash
    if (G.dash) { G.dash.t += dt * 1.6; const k = Math.min(1, G.dash.t); pk.position.lerpVectors(G.dash.from, G.dash.to, k); pk.position.y = Math.abs(Math.sin(k * 18)) * 0.15; if (k >= 1) { G.at = G.dash.j; G.dash = null; pk.visible = false; } }
    const near = !G.dash && aim.distanceTo(HIDE[G.at].p) < 2.0; if (G.peek > 0) G.peek -= dt;
    if (near && G.phase === 'seek') { G.lit += dt; HIDE[G.at].wig = Math.max(HIDE[G.at].wig, 0.15); if (G.lit > 0.2 && !G.said.glint) { G.said.glint = 1; say(['BEAR', 'Something blinked!']); } if (G.lit > 3.5 && G.round < 2) { G.lit = 0; say(['NAN', 'Too slow, he bolted.']); bolt(); } } else G.lit = Math.max(0, G.lit - dt);
    eyes.visible = true; pk.visible = !!G.dash || G.phase === 'done' || ((near || G.peek > 0) && G.phase === 'seek'); if (!G.dash && G.phase === 'seek') { pk.position.y = -0.18; pk.scale.setScalar(0.7); } else pk.scale.setScalar(1);
    for (const h of HIDE) { if (h.wig > 0) { h.wig -= dt; h.g.rotation.z = Math.sin(t * 40) * 0.05 * (h.wig > 0.3 ? 2 : 1); } else h.g.rotation.z = 0; }
    frog.visible = aim.distanceTo(frog.position) < 2.4; frog.position.x = -1.0 + Math.sin(t * 0.2) * 0.4;
    moth.position.set(aim.x + Math.sin(t * 5) * 0.6, 1.6 + Math.sin(t * 7) * 0.4, aim.z + Math.cos(t * 4) * 0.6);
    animPal(wolf, dt, t, {}); animPal(bear, dt, t, { panic: G.dash ? 1 : 0 }); animPal(nan, dt, t, { wave: G.phase === 'done' ? 1 : 0 }); tin.rotation.z = lerp(tin.rotation.z, Math.sin(t * 2) * 0.05, dt * 6);
    if (G.phase === 'seek') { const left = Math.max(0, 120 - G.t); H.pill('t', `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, left < 20);
      if (left <= 0) { G.phase = 'done'; H.say([['NAN', 'He will come in when he is hungry. He is always hungry.']], () => ctl.finish({ win: false, stars: 0, title: 'PICKLES IS STILL OUT', lines: [`Found him ${G.round} of 3 times.`, 'NAN: "Look for the rustle, dear."'], suns: [] })); } }
    const por = camera.aspect < 1; G.cx = lerp(G.cx || 0, por ? clamp(aim.x * 0.75, -5, 5) : aim.x * 0.25, Math.min(1, dt * 2.5)); camera.position.set(G.cx, por ? 14 : 9, por ? 13.5 : 11.5); camera.lookAt(G.cx, 0, por ? -1.6 : -1.6);
  };
  function autoAx(dt) { const tgt = G.glasses ? HIDE[G.at].p : gnome.p; const d = tgt.clone().sub(aim); if (d.length() < 0.5 && !G.dash) { if (G.busy <= 0) { if (!G.glasses) search(gnome); else if (G.lit > 0.4) search(HIDE[G.at]); } return { x: 0, y: 0 }; } d.normalize(); return { x: d.x, y: d.z }; }
  return inst;
}
