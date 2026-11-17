// missions/license_fur.js — LICENSE AND FUR (Night 2). Officer Fuzz and the Lemon Kid. The Lemon Kid blows past the diner
// in his lemon kart for the third time tonight; Officer Fuzz's hat spins. Fuzz deputises the Wolf for one night, and Moth
// (who is "not driving you anywhere else") drives. Driving pursuit through the living town: pull ALONGSIDE the kart and
// HONK to tag him (three tags and he gives up). He weaves, runs reds, kicks lemonade stands into the road behind him.
// Cross traffic, queues and walkers carry on around you. Stars: caught him · 2 bumps or fewer · under a minute. Secret: no reds.
// QA: ?m=license_fur [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, waddleCar, spinWheels, nightSky, nightLights, sign, mesh, box, cyl, ball, glowSprite, sfx, clamp, lerp, rng, toScreen, blobShadow, M4, Merge, juice } from './kit.js';
import { createDrive } from './drivecore.js';

registerMission({
  id: 'license_fur', key: 'lfur', title: 'LICENSE AND FUR', chip: 'LICENSE AND FUR', room: 'diner', night: 2, where: 'The Diner (Officer Fuzz)',
  rumour: 'The Lemon Kid blows past the diner every night. Officer Fuzz is running out of hat.',
  todo: 'Help Officer Fuzz catch the Lemon Kid (the Diner)', doneMsg: '. The Lemon Kid got a citation. It says "a lot".',
  suns: [{ id: 'lf_done', name: 'LICENSE AND FUR', how: 'Get deputised at the Diner and catch the Lemon Kid' }, { id: 'lf_star', name: 'DEPUTY OF THE NIGHT', how: 'Three stars chasing the Lemon Kid' }, { id: 'lf_law', name: 'BY THE BOOK', how: 'Catch the Lemon Kid without running one red light' }],
  tip: 'PULL ALONGSIDE THE LEMON KID · HONK TO TAG HIM',
  create,
});

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.fog = new THREE.Fog('#181838', 40, 240); scene.background = new THREE.Color('#141634');
  const sky = nightSky(scene, { top: '#0a0c28', mid: '#22184a', low: '#3a2450', glow: '#7a5aff', dusk: 0.05 }); nightLights(scene);
  const R = rng(911);
  const cab = waddleCar('#f2c230', '#f6efe0', { open: true, cab: true });
  const moth = CAST.moth(), wolf = CAST.wolf(); for (const [p, x] of [[moth, 0.36], [wolf, -0.36]]) { p.scale.setScalar(0.84); p.position.set(x * 1.05, 0.62, 0.15); p.userData.shadow.visible = false; cab.userData.body.add(p); }
  const route = [[260, 0], [80, 50], [240, 0], [90, -60], [300, 5], [80, 45], [260, 0], [90, -40], [200, 0]];
  const D = createDrive(scene, { theme: 'town', route, cross: [180, 420, 640, 880, 1100, 1320], player: cab, cruise: 20, max: 26, boostV: 33, boostRecharge: 6, seed: 12, traffic: { same: 10, oncoming: 10, cross: 2 }, peds: 12 });
  // the Lemon Kid's kart: a felt lemon on four tiny wheels
  const kart = new THREE.Group(), kb = new THREE.Group(); kart.add(kb); { const m = new Merge(); m.ball(0.75, '#f6d83a', 0, 0.6, 0, 1.1, 0.7, 1.6, 12, 8); m.ball(0.18, '#f2c230', 0, 0.62, 1.2, 1, 1, 1, 6, 4); m.ball(0.18, '#f2c230', 0, 0.62, -1.2, 1, 1, 1, 6, 4); m.box(0.5, 0.06, 0.25, '#3aa86a', 0.1, 1.15, -0.4, 0.4); kb.add(m.mesh()); }
  const wh = []; for (const [x, z] of [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]]) { const w = cyl(0.22, 0.22, 0.18, '#2a2426', [x, 0.22, z], kart, 8); w.rotation.z = Math.PI / 2; wh.push(w); }
  const kid = CAST.lemon(); kid.scale.setScalar(0.62); kid.position.set(0, 0.62, -0.1); kid.userData.shadow.visible = false; kb.add(kid); kart.add(blobShadow(1.1, 0.4)); const kg = glowSprite('#ffe86a', 3, 3, 0.35); kg.position.y = 1; kart.add(kg);
  D.root.add(kart); kart.scale.setScalar(1.25); let ktag = null; const _kv = new THREE.Vector3();
  const K = { s: 60, x: -1.5, tx: -1.5, v: 0, weave: 2, drop: 6, boost: 0, stun: 0 };
  const stands = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); box(1.4, 0.9, 0.6, '#f6efe0', [0, 0.45, 0], g); const s = sign('LEMONADE\n5¢', 1.3, 0.6, { bg: '#f6d83a', fg: '#3a2a1a' }); s.position.set(0, 1.25, 0.31); g.add(s); g.visible = false; stands.push(D.add({ s: -999, x: 0, obj: g, solid: true, r: 1.2, w: 0.9, slow: 0.45, onHit: () => { sfx.crash(); say(['MOTH', R.pick(['Lemonade.', 'That was five cents.', 'I swerved. In my heart.'])]); } })); }
  const G = { phase: 'off', t: 0, tags: 0, lost: 0, auto: false, said: {}, window: false };
  const inst = { scene, camera, G, D, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, tags: 0, lost: 0, said: {}, window: false, cool: 0, cT: 0 });
    D.reset(14, 3); Object.assign(K, { s: 70, x: -1.5, tx: -1.5, v: 0, weave: 2, drop: 5, boost: 0, stun: 0, panic: 0, cool: 0 }); ktag = H.tag('LEMON KID'); for (const st of stands) { st.s = -999; st.obj.visible = false; }
    H.pill('tags', 'TAGS 0/3'); H.pill('gap', 'LEMON KID —'); H.pill('time', '1:30');
    const hk = H.button('honk', 'HONK'); hk.onDown = honk; H.button('boost', 'PUNCH<br>IT', { alt: true });
    D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1);
    H.say([['OFFICER FUZZ', 'That is the third time tonight. My hat cannot take a fourth.'], ['OFFICER FUZZ', 'Wolf. Raise your right paw. You are deputised.'], ['MOTH', "I'm not driving you anywhere else."], ['OFFICER FUZZ', 'Get alongside him and honk. That is the law.'], ['MOTH', 'Meter is running.']], () => { if (G.phase === 'talk') { G.phase = 'count'; G.t = 0; } });
    if (G.auto) setTimeout(() => { if (G.phase === 'talk') { H.subQ = []; H.skipSub(); } }, 500);
  };
  inst.stop = () => { G.phase = 'off'; };
  function honk() { sfx.horn(); if (G.phase !== 'chase') return; if (G.window) { G.tags++; G.window = false; G.cool = 2.2; K.boost = 2.5; K.tx = -K.tx; sfx.good(); juice.burst(kart.position.clone().setY(1.6), '#f6d83a', 20, { speed: 5, size: 0.45 }); juice.shake(0.12, 0.2); const sp = toScreen(kart.position.clone().setY(2.4), camera); H.float(sp.x, sp.y, `TAG ${G.tags}!`, '#ffe86a'); H.pill('tags', `TAGS ${G.tags}/3`);
      H.say([[['LEMON KID', 'Not even close!'], ['MOTH', 'It was close.']], [['LEMON KID', 'Okay that was close.'], ['OFFICER FUZZ (radio)', 'Again, deputy.']], [['LEMON KID', 'FINE. Fine.']]][Math.min(2, G.tags - 1)]);
      if (G.tags >= 3) win(); } else if (!G.said.miss) { G.said.miss = 1; say(['MOTH', 'He has to be next to us. Then honk.']); } }
  function win() { G.cT = G.t; G.phase = 'caught'; G.t = 0; D.P.done = true; K.s = Math.max(K.s, D.P.s + 7); K.tx = D.HALF - 2; H.hint('GOT HIM', 2); H.pill('gap', 'CAUGHT'); if (ktag) ktag.textContent = 'CITED'; H.say([['LEMON KID', 'I just wanted to see the store close.'], ['OFFICER FUZZ', 'Everybody does, kid.'], ['OFFICER FUZZ', 'This is a citation. It says "a lot".']]); }
  function lose(why) { G.phase = 'done'; ctl.finish({ win: false, stars: 0, title: 'HE GOT AWAY', lines: [why, `Tags: ${G.tags}/3`], suns: [] }); }
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera);
    let ax = I.axis(); if (G.auto) ax = { x: auto() };
    const chase = G.phase === 'chase';
    if (G.phase === 'count') { const n = 3 - Math.floor(G.t); H.hint(n > 0 ? String(n) : 'GO!', 0); if (G.t > 3) { G.phase = 'chase'; G.t = 0; H.hint('GO!', 0.8); sfx.ok(); } }
    D.P.cruise = chase ? 20 : 0;
    D.update(dt, t, chase ? ax : { x: 0 }, chase && (H.btn.boost?.down || I.keys[' '] || (G.auto && D.P.boostCharge >= 1 && K.s - D.P.s > 8 && K.s - D.P.s < 40)));
    D.cam(camera, dt);
    // the kart
    if (chase || G.phase === 'count' || G.phase === 'caught') {
      const gapK = K.s - D.P.s; if (chase && gapK < 9 && gapK > -2 && K.panic <= 0 && K.cool <= 0 && D.P.boost <= 0) { K.panic = 1.4; K.cool = 3.5; } if (K.panic > 0) K.panic -= dt; if (K.cool > 0) K.cool -= dt;
      const kv = G.phase === 'caught' ? 0 : chase ? (K.stun > 0 ? 9 : K.boost > 0 ? 30 : K.panic > 0 ? 24 : gapK < -3 ? 27 : gapK > 60 ? 15 : gapK < 20 ? 17 : 18.6) : 0; K.v = lerp(K.v, kv, Math.min(1, dt * 2)); if (K.boost > 0) K.boost -= dt; if (K.stun > 0) K.stun -= dt;
      K.weave -= dt; if (chase && K.weave <= 0) { K.weave = 1.6 + R() * 2.4; K.tx = clamp(R() < 0.5 ? -3 : 3 + (R() - 0.5) * 2, -4.5, 4.5); }
      for (const n of D.npcs) { const ds = (n.s - K.s) * 1; if (ds > 0 && ds < 16 && Math.abs(n.x - K.tx) < 2) K.tx = K.tx > 0 ? -3 : 3; if (Math.abs(ds) < 3 && Math.abs(n.x - K.x) < 1.6 && K.stun <= 0) { K.stun = 0.8; sfx.bonk(); } }
      K.x = lerp(K.x, K.tx, Math.min(1, dt * 2.2)); K.s = Math.min(D.LEN - 4, K.s + K.v * dt);
      D.place(kart, K.s, K.x, -(K.tx - K.x) * 0.15); kb.position.y = Math.abs(Math.sin(t * 15)) * 0.06; for (const w of wh) w.rotation.x += K.v * dt / 0.22; animPal(kid, dt, t, { cheer: K.boost > 0 ? 1 : 0 });
      if (chase) { K.drop -= dt; if (K.drop <= 0 && K.s - D.P.s > 18) { K.drop = 4 + R() * 3; const st = stands.find((q) => q.s < D.P.s - 20) || stands[0]; st.s = K.s - 3; st.x = K.x; st.alive = true; st.obj.visible = true; D.place(st.obj, st.s, st.x); say(['LEMON KID', R.pick(['Lemonade! Fresh!', 'Free sample!', 'Watch the stand!'])]); } }
    }
    if (chase) {
      const gap = K.s - D.P.s, dx = K.x - D.P.x; G.gap = Math.round(gap); G.dx = Math.round(dx * 10) / 10; G.kc = Math.round(K.cool * 10) / 10; G.v = Math.round(D.P.v ?? 0); G.kv = Math.round(K.v); if (G.cool > 0) G.cool -= dt; G.window = !(G.cool > 0) && Math.abs(gap) < 6 && Math.abs(dx) < 4;
      H.pill('gap', G.window ? 'HONK NOW!' : `LEMON KID ${Math.max(0, Math.round(gap))} m`, G.window); if (H.btn.honk) H.btn.honk.style.transform = G.window ? 'scale(1.15)' : '';
      if (G.auto && G.window) honk();
      H.place(ktag, _kv.copy(kart.position).setY(3.2), camera); ktag.textContent = G.window ? 'HONK!' : K.panic > 0 ? 'LEMON KID · ZOOM' : 'LEMON KID';
      const left = Math.max(0, 90 - (G.phase === 'chase' ? G.t : G.cT)); H.pill('time', `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, left < 15);
      if (gap > 110) { G.lost += dt; if (G.lost > 0.1 && !G.said.far) { G.said.far = 1; say(['OFFICER FUZZ (radio)', 'You are losing him, deputy.']); } } else G.lost = 0;
      for (const e of D.events.splice(0)) { if (e === 'red') say(['MOTH', R.pick(['That was red.', 'I am a professional.', 'Fuzz did not see that. Fuzz is in the diner.'])]); if (e === 'bump' || e === 'tbone') { sfx.crash(); say(['MOTH', R.pick(['Bonk.', 'Sorry. Sorry. Sorry.', 'Add it to the meter.'])]); } if (e === 'near') { const sp = toScreen(cab.position.clone().setY(2), camera); H.float(sp.x, sp.y, 'CLOSE ONE · BOOST +', '#7af2c2'); } }
      if (G.phase !== 'chase') {} else if (left <= 0) lose('Time. Officer Fuzz is out of hat.'); else if (G.lost > 6) lose('Gone. Just a smell of lemons.'); else if (K.s >= D.LEN - 6) lose('He made it to the county line.');
    }
    if (G.phase === 'caught') { H.place(ktag, _kv.copy(kart.position).setY(3.2), camera); kb.rotation.z = Math.sin(t * 3) * 0.05; if (G.t > 4) G.phase = 'done';
      if (G.phase === 'done') { const time = G.cT; const stars = 1 + (D.P.bumps <= 2 ? 1 : 0) + (time < 60 ? 1 : 0); const suns = ['lf_done']; if (stars === 3) suns.push('lf_star'); if (!D.P.ranRed) suns.push('lf_law');
        ctl.finish({ win: true, stars, title: 'GOT THE LEMON KID', lines: [`Caught in ${Math.round(time)} s · ${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'} · ${D.P.ranRed} red light${D.P.ranRed === 1 ? '' : 's'}`, 'OFFICER FUZZ: "Keep the badge. I have a drawer of them."'], suns }); } }
    if (G.phase === 'chase') G.cT = G.t;
    animPal(moth, dt, t, {}); animPal(wolf, dt, t, { wave: G.window ? 1 : 0 });
  };
  function auto() { const P = D.P; let want = K.x; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 22 && Math.abs(n.x - want) < 2.2) want = n.x > 0 ? -3 : 3.5; } for (const th of D.things) if (th.alive && th.solid && th.s - P.s > 0 && th.s - P.s < 14 && Math.abs(th.x - want) < 1.8) want += th.x > want ? -2.4 : 2.4; return clamp((want - P.x) * 0.6, -1, 1); }
  return inst;
}
