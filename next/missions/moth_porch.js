// missions/moth_porch.js — MOTH'S PORCH LIGHT (Night 7). Last fare of the week, and the fare is Moth. He has driven everyone
// home every night since 1979. Tonight the Wolf rides shotgun and Moth drives himself home.
// The trouble with being a moth: every porch light on the street pulls the cab toward it (you feel the wheel drift;
// steer against it). Brush the curb under one and Moth goes "ooh" and stalls, dazed. Bug zappers pull hardest of all.
// His porch light is the soft green one at the end of Juniper. His mom leaves it on.
// Stars: home · dazed once or never · 2 bumps or fewer. Secret: never get pulled under a bug zapper.
// QA: ?m=moth_porch [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, pal, waddleCar, nightSky, nightLights, sign, glowMat, glowSprite, Merge, sfx, clamp, lerp, rng, toScreen } from './kit.js';
import { createDrive } from './drivecore.js';

registerMission({
  id: 'moth_porch', key: 'porch', title: "MOTH'S PORCH LIGHT", chip: "MOTH'S PORCH LIGHT", room: 'moth', night: 7, where: "Moth's cab stand",
  rumour: 'Moth has driven everybody home every night since 1979. Nobody has ever driven Moth home.',
  todo: "Drive Moth home (Moth's cab stand)", doneMsg: '. Moth is home. His mom left the light on.',
  suns: [{ id: 'mp_done', name: "MOTH'S PORCH LIGHT", how: 'Get Moth home' }, { id: 'mp_star', name: 'STEADY HANDS', how: "Three stars on Moth's last fare" }, { id: 'mp_zap', name: 'NOT TONIGHT, ZAPPER', how: 'Never get pulled under a bug zapper' }],
  tip: 'STEER AGAINST THE PULL OF THE PORCH LIGHTS',
  create,
});
const CAMO = { dist: 7.0, height: 3.4, lookY: 1.4 };

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.background = new THREE.Color('#101230'); scene.fog = new THREE.Fog('#141634', 40, 240);
  const sky = nightSky(scene, { top: '#080a24', mid: '#1c1848', low: '#34245a', glow: '#8a6aff', dusk: 0.02 }); nightLights(scene, { hemi: 0.85 });
  const R = rng(1979);
  const cab = waddleCar('#f2c230', '#f6efe0', { open: true, cab: true }); const moth = CAST.moth(), wolf = CAST.wolf();
  for (const [p, x, y, z, sc] of [[moth, 0.4, 0.62, 0.15, 0.9], [wolf, -0.4, 0.62, 0.15, 0.9]]) { p.scale.setScalar(sc); p.position.set(x, y, z); p.userData.shadow.visible = false; cab.userData.body.add(p); }
  const route = [[280, 0], [70, 40], [260, 0], [80, -55], [300, 0], [60, 30], [260, 0]];
  const D = createDrive(scene, { theme: 'town', route, cross: [220, 520, 830, 1150], player: cab, cruise: 18, max: 24, boostV: 28, boostRecharge: 6, seed: 1979, traffic: { same: 6, oncoming: 8, cross: 2 }, peds: 10 });
  // porch lights + bug zappers along both curbs
  const lights = []; for (let s = 70; s < D.LEN - 70; s += 26 + R() * 16) { const side = R() < 0.5 ? -1 : 1, zap = lights.filter((l) => l.zap).length < 3 && s > 250 && R() < 0.12; const g = new THREE.Group(), m = new Merge();
    m.box(0.12, 2.4, 0.12, '#3a3a40', 0, 1.2, 0); if (zap) { m.box(0.5, 0.7, 0.5, '#2a2a3a', 0, 2.6, 0); } else m.box(0.36, 0.36, 0.36, '#f6efe0', 0, 2.5, 0); g.add(m.mesh());
    const col = zap ? '#8a7aff' : R.pick(['#ffd27a', '#ffe8b0', '#ffb87a']); const gl = glowSprite(col, zap ? 4.2 : 3.8, zap ? 4.2 : 3.8, 0.95); gl.position.y = 2.55; g.add(gl);
    if (zap) { const t = sign('ZAP', 0.5, 0.25, { bg: '#2a2a3a', fg: '#bfaaff', glow: true, border: false }); t.position.set(0, 2.15, 0.27); g.add(t); }
    D.root.add(g); D.place(g, s, side * (D.HALF + 0.9)); lights.push({ s, side, zap, g, gl, used: false }); }
  // home: a little house, the green porch light, Moth's mom
  const home = new THREE.Group(); { const m = new Merge(); m.box(7, 4, 6, '#6a7a5a', 0, 2, 0); m.cone(5.2, 2.6, '#3a2a2a', 0, 5.3, 0, 4, 0, Math.PI / 4); m.box(1.3, 2.2, 0.1, '#3a2a22', 0, 1.1, 3.02); m.box(3, 0.3, 1.6, '#8a6a4a', 0, 0.15, 3.8); home.add(m.mesh());
    const g = glowSprite('#9aff9a', 3.4, 3.4, 0.95); g.position.set(1.0, 2.5, 3.2); home.add(g); const pl = new THREE.PointLight('#9aff9a', 14, 12, 1.6); pl.position.set(1.0, 2.5, 3.6); home.add(pl); }
  const mom = pal({ body: '#b8a890', head: '#e0d6c0', ears: 'antenna', shirt: '#c86a8a', wings: '#d8ccb0', h: 0.95 }); mom.position.set(-0.6, 0.3, 3.9); home.add(mom);
  D.root.add(home); D.place(home, D.LEN - 22, D.HALF + 7, -Math.PI / 2);
  const glows = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.add(glowSprite('#bfe8ff', 1.6, 1.6, 0.6)); glows.push(D.add({ s: 160 + i * 230 + R() * 40, x: (R() - 0.5) * 6, y: 1.2, obj: g, r: 1.6, w: 1.0, air: true, onHit: () => { D.P.boostCharge = 1; sfx.tone(880, 0.2, 'sine', 0.2, 1.4); H.toast('MOONLIGHT · BOOST READY', 1.2); } })); }
  const G = { phase: 'off', t: 0, dazes: 0, dazeT: 0, zapped: false, pull: 0, auto: false, said: {} };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, dazes: 0, dazeT: 0, zapped: false, pull: 0, said: {} }); D.reset(10, 3); for (const l of lights) l.used = false;
    H.pill('daze', 'DAZED 0'); H.setMeter(0, 'THE PULL'); H.button('boost', 'FLOOR<br>IT'); const hk = H.button('honk', 'HONK', { alt: true }); hk.onDown = () => { sfx.horn(); if (G.dazeT > 0) { G.dazeT = Math.min(G.dazeT, 0.25); say(['MOTH', 'Huh? Sorry. Driving. I am driving.']); } };
    D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1, CAMO); c.I.padOn = true;
    H.say([['WOLF', 'Last fare of the week?'], ['MOTH', 'Last fare is me. I drive everybody home. Tonight I drive me home.'], ['MOTH', 'Problem. I am a moth. Porch lights. You understand.'], ['WOLF', 'I will keep you honest. Steer against the pull.']], () => { G.phase = 'run'; G.t = 0; H.hint('STEER AGAINST THE PULL', 2.2); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow(camera); const run = G.phase === 'run'; let ax = I.axis(); if (G.auto) ax = { x: autoAx() };
    // the pull: strongest light ahead within 22 m
    let pull = 0, near = null; for (const l of lights) { const ds = l.s - D.P.s; if (ds < -4 || ds > 22) continue; const k = (1 - Math.abs(ds - 6) / 18) * (l.zap ? 1.0 : 0.54); if (k > Math.abs(pull)) { pull = l.side * k; near = l; } }
    G.pull = lerp(G.pull, run ? pull : 0, Math.min(1, dt * 3)); l_flick(t);
    G.dazeT -= dt; const dazed = G.dazeT > 0; const steer = dazed ? { x: G.pull * 0.6 } : { x: clamp(ax.x + G.pull, -1.6, 1.6) };
    D.P.cruise = run ? (dazed ? 5 : 18) : 0; D.update(dt, t, run ? steer : { x: 0 }, run && !dazed && (H.btn.boost?.down || I.keys[' '] || (G.auto && D.P.boostCharge >= 1))); D.cam(camera, dt, CAMO);
    animPal(moth, dt, t, { cheer: dazed ? 0 : 0, wave: dazed ? 1 : 0 }); animPal(wolf, dt, t, {}); animPal(mom, dt, t, { wave: 1 });
    if (run) { H.setMeter(Math.abs(G.pull) / 1.15, near?.zap ? 'THE PULL · BUG ZAPPER!' : 'THE PULL');
      if (near && !near.used && Math.abs(near.s - D.P.s) < 3 && Math.sign(D.P.x) === near.side && Math.abs(D.P.x) > D.HALF - 1.7) { near.used = true; G.dazes++; G.dazeT = near.zap ? 2.2 : 1.3; sfx.tone(420, 0.6, 'sine', 0.18, 1.8); H.pill('daze', `DAZED ${G.dazes}`, G.dazes > 1); const sp = toScreen(cab.getWorldPosition(new THREE.Vector3()).setY(3), camera); H.float(sp.x, sp.y, near.zap ? 'BZZT!' : 'OOH…', near.zap ? '#bfaaff' : '#ffe1a8');
        if (near.zap) { G.zapped = true; sfx.noise(0.4, 0.3, 4200); say(['MOTH', 'BZZT. I am fine. My antennae are curly now.']); } else say(['MOTH', R.pick(['Ooh.', 'Ooh. Pretty.', 'Ooooh. Sorry.', 'That is a nice one.'])]); }
      if (near?.zap && !G.said['z' + near.s]) { G.said['z' + near.s] = 1; say(['WOLF', 'Bug zapper. Hard left. Hard right. Away from it.']); }
      for (const e of D.events.splice(0)) { if (e === 'bump' || e === 'tbone' || e === 'hit') { sfx.crash(); say(['MOTH', R.pick(['Sorry. Sorry.', 'That is on me. I am the meter.', 'Felt bumpers.'])]); } }
      if (!G.said.half && D.P.s > D.LEN * 0.5) { G.said.half = 1; say(['MOTH', 'Juniper Street. Green light at the end. Not that one. Not that one either.']); }
      if (D.P.s >= D.LEN - 30) { G.phase = 'home'; D.P.done = true; arrive(); } }
  };
  function l_flick(t) { for (const l of lights) if (l.zap) l.gl.material.opacity = 0.7 + Math.sin(t * 31 + l.s) * 0.25; }
  function autoAx() { const P = D.P; let want = -G.pull * 2.4; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 18 && Math.abs(n.x - (P.x + want * 0.3)) < 2.2) want = n.x > P.x ? -1 : 1; } want += clamp((2.6 - P.x) * 0.3, -0.5, 0.5); return clamp(want - G.pull, -1, 1); }
  function arrive() { sfx.good(); const stars = 1 + (G.dazes <= 1 ? 1 : 0) + (D.P.bumps <= 2 ? 1 : 0); const suns = ['mp_done']; if (stars === 3) suns.push('mp_star'); if (!G.zapped) suns.push('mp_zap');
    H.say([['', 'The end of Juniper. A small green porch light, and somebody waving under it.'], ['MOTH', 'She leaves it on. Every night. Since 1979.'], ['MOTH', '(He switches off the meter.) Destination.'], ['WOLF', 'Go on. I will park it.'], ['MOTH\'S MOM', 'You are late, sweetheart. Is that the Wolf? Bring the Wolf in. There is pie.']], () =>
      ctl.finish({ win: true, stars, title: 'DESTINATION', lines: [`Dazed ${G.dazes} · ${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'}${G.zapped ? ' · zapped once (he is fine)' : ''}`, 'MOTH: "Same time tomorrow. Somebody else drives."'], suns })); }
  return inst;
}
