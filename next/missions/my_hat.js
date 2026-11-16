// missions/my_hat.js — MY HAT! (Night 6). Rabbit's tall hat comes off in a gust outside Lynx's place and rides the wind
// over the rooftops. Lynx goes up the fire escape after it, Rabbit right behind shouting "MY HAT!" the whole way.
// Rooftop runner at night: swipe (or ←/→) between three lanes, JUMP the gaps between buildings and the chimneys,
// SLIDE under the washing lines. Gusts carry the hat ahead; in a lull it drops low — jump up and grab it.
// Fall between roofs and you climb back up (the hat gets away a bit). If it gets too far ahead, it's gone over the river.
// Stars: caught · stumbled or fell once at most · caught inside 75 s. Secret: five odd socks off the washing lines.
// QA: ?m=my_hat [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, nightSky, nightLights, sign, felt, glowMat, glowSprite, Merge, box, cyl, sfx, clamp, lerp, rng, toScreen } from './kit.js';

registerMission({
  id: 'my_hat', key: 'hat', title: 'MY HAT!', chip: 'MY HAT!', room: 'lynx', night: 6, where: "Lynx's place → the rooftops",
  rumour: 'Rabbit has worn the same tall hat every day for thirty years. Tonight the wind wants it.',
  todo: "Catch Rabbit's hat over the rooftops (Lynx's place)", doneMsg: ". Rabbit has his hat back. He is holding it on with both paws.",
  suns: [{ id: 'mh_done', name: 'MY HAT!', how: "Catch Rabbit's hat over the rooftops" }, { id: 'mh_star', name: 'ROOF RUNNER', how: 'Three stars over the rooftops' }, { id: 'mh_socks', name: 'ODD SOCKS', how: 'Grab five odd socks off the washing lines' }],
  create,
});
const LANES = [-2.2, 0, 2.2], RUNV = 11.5;

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 700);
  scene.background = new THREE.Color('#10122c'); scene.fog = new THREE.Fog('#141634', 40, 160);
  const sky = nightSky(scene, { top: '#080a24', mid: '#1e1c4a', low: '#3a2a5a', glow: '#8a7aff', dusk: 0.03 }); nightLights(scene, { hemi: 1.05, moonI: 1.1 });
  const R = rng(6060);
  // rooftops: [z0, z1, y]; gaps between
  const roofs = []; { let z = -10, y = 0; for (let i = 0; i < 16; i++) { const len = i === 0 ? 40 : 18 + R() * 22; roofs.push({ z0: z, z1: z + len, y }); z += len + (i < 15 ? 3 + R() * 2.4 : 0); y = clamp(y + (R() - 0.5) * 1.6, -0.6, 1.2); } }
  const END = roofs[roofs.length - 1].z1;
  const WALLS = ['#5a3a4a', '#3a4a6a', '#6a4a3a', '#4a3a5a', '#3a5a5a'];
  { const m = new Merge(); for (const [i, r] of roofs.entries()) { const L = r.z1 - r.z0, c = WALLS[i % 5]; m.box(8, 14, L, c, 0, r.y - 7, (r.z0 + r.z1) / 2); m.box(8.4, 0.3, L + 0.2, '#2a2430', 0, r.y + 0.15, (r.z0 + r.z1) / 2); m.box(7.6, 0.02, L - 0.4, '#4a4450', 0, r.y + 0.31, (r.z0 + r.z1) / 2);
      for (let k = 2; k < L - 1; k += 3.2) for (let f = 0; f < 3; f++) for (const sx of [-1, 1]) if (R() < 0.6) m.box(0.05, 0.9, 0.9, R() < 0.5 ? '#ffd27a' : '#2a2a3a', sx * 4.02, r.y - 2 - f * 3.4, r.z0 + k); }
    m.box(60, 0.2, END + 200, '#1a1826', 0, -14, END / 2); for (let i = 0; i < 40; i++) { const sx = R() < 0.5 ? -1 : 1; m.box(6 + R() * 6, 4 + R() * 14, 6 + R() * 8, WALLS[i % 5], sx * (14 + R() * 20), -12, R() * END); } scene.add(m.mesh()); }
  const groundLights = []; for (let i = 0; i < 30; i++) { const g = glowSprite(R() < 0.5 ? '#ffd27a' : '#ff9ac2', 3, 3, 0.5); g.position.set((R() < 0.5 ? -1 : 1) * (10 + R() * 25), -12 + R() * 6, R() * END); scene.add(g); groundLights.push(g); }
  const river = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), glowMat('#3a5aa8', 0.5)); river.rotation.x = -Math.PI / 2; river.position.set(0, -13.8, END + 30); scene.add(river);
  // obstacles
  const obs = [], socks = [];
  for (const [i, r] of roofs.entries()) { if (i === 0) continue; let z = r.z0 + 6; while (z < r.z1 - 5) { const lane = Math.floor(R() * 3), kind = R() < 0.35 ? 'line' : R() < 0.6 ? 'chimney' : 'ac';
      const g = new THREE.Group(), m = new Merge();
      if (kind === 'chimney') { m.box(1.3, 1.2, 1.1, '#8a3a2a', 0, 0.6, 0); m.box(1.5, 0.2, 1.3, '#5a2a1a', 0, 1.25, 0); }
      else if (kind === 'ac') { m.box(1.5, 0.9, 1.1, '#9aa2aa', 0, 0.45, 0); m.cyl(0.38, 0.38, 0.06, '#3a3a40', 0, 0.92, 0, 12); }
      else { for (const sx of [-3.6, 3.6]) m.box(0.1, 2.0, 0.1, '#6a5a4a', sx, 1.0, 0); m.box(7.2, 0.03, 0.03, '#efe6d6', 0, 1.35, 0); for (let k = 0; k < 6; k++) m.box(0.55, 0.6, 0.04, R.pick(['#f2c230', '#ff6fae', '#5fe3d2', '#f6efe0', '#a98cff']), -3 + k * 1.2, 1.05, 0); }
      g.add(m.mesh()); g.position.set(kind === 'line' ? 0 : LANES[lane], r.y + 0.3, z); scene.add(g); obs.push({ kind, lane, z, y: r.y, g });
      if (kind === 'line' && socks.length < 7 && R() < 0.8) { const s = new THREE.Group(); const mm = new Merge(); mm.box(0.22, 0.45, 0.06, '#ff6fae', 0, 0, 0); mm.box(0.34, 0.16, 0.06, '#ff6fae', 0.07, -0.22, 0); s.add(mm.mesh()); s.add(glowSprite('#ffd86a', 1.0, 1.0, 0.45)); const sl = Math.floor(R() * 3); s.position.set(LANES[sl], r.y + 2.1, z + 4); scene.add(s); socks.push({ g: s, lane: sl, z: z + 4, y: r.y + 2.1, got: false }); }
      z += 7 + R() * 7; } }
  // the hat, Lynx, Rabbit
  const hat = new THREE.Group(); { const m = new Merge(); m.cyl(0.36, 0.36, 0.75, '#2a2430', 0, 0.42, 0, 16); m.cyl(0.6, 0.6, 0.06, '#2a2430', 0, 0.05, 0, 18); m.cyl(0.37, 0.37, 0.14, '#c9302a', 0, 0.18, 0, 16); hat.add(m.mesh()); hat.add(glowSprite('#fff0c8', 2.2, 2.2, 0.35)); } scene.add(hat);
  const lynx = CAST.lynx(), rabbit = CAST.rabbit(); scene.add(lynx, rabbit); lynx.userData.shadow.visible = rabbit.userData.shadow.visible = false;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const sideSign = sign("LYNX'S", 2.4, 0.7, { bg: '#2a2240', fg: '#ffd27a', glow: true }); sideSign.position.set(-4.05, -1.4, 4); sideSign.rotation.y = -Math.PI / 2; scene.add(sideSign);
  const G = { phase: 'off', t: 0, z: 0, x: 0, lane: 1, y: 0, vy: 0, slide: 0, stun: 0, falls: 0, stumbles: 0, hz: 25, hx: 0, hy: 3, lull: 0, lullT: 6, socks: 0, auto: false, said: {}, climb: 0 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const roofAt = (z) => roofs.find((r) => z >= r.z0 - 0.3 && z <= r.z1 + 0.3);
  const nextRoof = (z) => roofs.find((r) => r.z0 > z);
  function jump() { if (G.phase !== 'run' || G.stun > 0 || G.climb > 0) return; const r = roofAt(G.z); if (r && G.y <= r.y + 0.35 + 0.01) { G.vy = 8.6; G.slide = 0; sfx.tone(300, 0.16, 'triangle', 0.16, 1.5); } }
  function slide() { if (G.phase !== 'run' || G.stun > 0) return; const r = roofAt(G.z); if (r && G.y <= r.y + 0.36) { G.slide = 0.75; sfx.noise(0.25, 0.12, 900); } else G.vy = Math.min(G.vy, -10); }
  function laneTo(d) { if (G.phase !== 'run') return; G.lane = clamp(G.lane + d, 0, 2); sfx.tick(); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, z: 0, x: 0, lane: 1, y: roofs[0].y + 0.3, vy: 0, slide: 0, stun: 0, falls: 0, stumbles: 0, hz: 22, hx: 0, hy: 3, lull: 0, lullT: 7, socks: 0, said: {}, climb: 0 });
    for (const s of socks) { s.got = false; s.g.visible = true; } H.pill('hat', 'HAT 22 m'); H.pill('socks', 'SOCKS 0/5'); c.I.padOn = false;
    const jb = H.button('jump', 'JUMP'); jb.onDown = jump; const sb = H.button('slide', 'SLIDE', { alt: true }); sb.onDown = slide;
    c.I.onSwipe = (dx, dy) => { if (Math.abs(dx) > Math.abs(dy)) laneTo(dx > 0 ? 1 : -1); else if (dy < 0) jump(); else slide(); };
    c.I.onTap = (x) => { if (G.phase !== 'run') return; if (x < innerWidth * 0.33) laneTo(-1); else if (x > innerWidth * 0.67) laneTo(1); else jump(); };
    onkeydown = (e) => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') laneTo(-1); if (k === 'arrowright' || k === 'd') laneTo(1); if (k === 'arrowup' || k === 'w' || k === ' ') jump(); if (k === 'arrowdown' || k === 's') slide(); };
    H.say([['', 'A gust. A tall black hat goes up, and up, and over the gutter.'], ['RABBIT', 'MY HAT!'], ['LYNX', 'Fire escape. Come on.'], ['RABBIT', 'MY HAT!'], ['', 'Swipe to change lanes. Jump the gaps. Slide under the washing.']], () => { G.phase = 'run'; G.t = 0; H.hint('SWIPE ← → · JUMP · SLIDE', 2.2); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); onkeydown = null; };
  inst.update = (dt, t) => {
    G.t += dt; const run = G.phase === 'run'; sky.follow(camera);
    if (run) {
      if (G.auto) autoPlay();
      if (G.climb > 0) { G.climb -= dt; if (G.climb <= 0) { const r = nextRoof(G.z - 1) || roofs[roofs.length - 1]; G.z = r.z0 + 1; G.y = r.y + 0.3; G.vy = 0; } }
      else { const sp = G.stun > 0 ? 4 : RUNV + Math.min(2.5, G.t * 0.03); G.z += sp * dt; G.stun -= dt; G.slide -= dt;
        G.vy -= 22 * dt; G.y += G.vy * dt; const r = roofAt(G.z), floor = r ? r.y + 0.3 : -99; if (r && G.y <= floor && G.y > floor - 0.6) { G.y = floor; G.vy = 0; } else if (r && G.y < floor - 0.6) { /* hit the wall of a taller roof */ G.z -= sp * dt; G.vy = Math.max(G.vy, 0); G.stun = 0.4; }
        if (G.y < floor - 3 || (!r && G.y < -3)) { G.falls++; G.climb = 1.3; G.hz += 10; sfx.bad(); say(['RABBIT', R.pick(['MY HAT!', 'Are you all right? MY HAT!', 'LYNX!'])]); H.hint('CLIMBING BACK UP…', 1.2); } }
      G.x = lerp(G.x, LANES[G.lane], Math.min(1, dt * 12));
      // obstacles
      for (const o of obs) { if (o.hit || Math.abs(o.z - G.z) > 0.6) continue; const rel = G.y - (o.y + 0.3);
        if (o.kind === 'line') { if (G.slide <= 0 && rel < 1.9) bump(o, 'Washing. Face full of washing.'); } else if (o.lane === G.lane && rel < (o.kind === 'chimney' ? 1.3 : 1.0)) bump(o, o.kind === 'chimney' ? 'Chimney. Warm chimney.' : 'Ow. Air conditioner.'); }
      for (const s of socks) if (!s.got && Math.abs(s.z - G.z) < 0.8 && Math.abs(s.g.position.x - G.x) < 0.9 && G.y + 1.4 > s.y - 0.5) { s.got = true; s.g.visible = false; G.socks++; sfx.catch(); H.pill('socks', `SOCKS ${G.socks}/5`); if (G.socks === 5) { sfx.star(2); H.toast('☀ ODD SOCKS', 2); say(['LYNX', 'Five odd socks. Somebody is going to be very confused.']); } }
      // the hat on the wind
      G.lullT -= dt; if (G.lullT <= 0 && G.lull <= 0) { G.lull = 4.2; say(['', '(The wind drops.)']); } if (G.lull > 0) { G.lull -= dt; if (G.lull <= 0) G.lullT = 5 + R() * 3; }
      const gap0 = G.hz - G.z, hv = G.lull > 0 ? RUNV - 5 : gap0 < 14 ? RUNV + 4 : RUNV + 1 + Math.sin(G.t * 0.9) * 2.2; G.hz += hv * dt; const gap = G.hz - G.z; if (gap < 2 && G.lull <= 0) G.hz = G.z + 2;
      const hr = roofAt(G.hz) || nextRoof(G.hz) || roofs[roofs.length - 1]; G.hx = Math.sin(G.t * 0.55) * 2.4; G.hy = hr.y + (G.lull > 0 ? 2.1 : 3.4) + Math.sin(G.t * 3) * 0.2;
      H.pill('hat', `HAT ${Math.max(0, Math.round(gap))} m`, gap > 34);
      const hand = G.y + (G.slide > 0 ? 1.0 : 2.15); if (gap < 2.2 && gap > -1.5 && Math.abs(G.hx - G.x) < 1.3 && Math.abs(G.hy - hand) < 0.8 && G.climb <= 0) return win();
      if (gap > 45 || G.hz > END - 2) return lose(); if (!G.said.lull && G.lull > 0) { G.said.lull = 1; say(['LYNX', 'It is dropping. Get under it and jump.']); }
    }
    // pose
    const roofNow = roofAt(G.z); lynx.position.set(G.x, G.y, G.z); lynx.scale.set(1, G.slide > 0 ? 0.55 : 1, 1); lynx.rotation.x = G.slide > 0 ? -0.5 : 0; animPal(lynx, dt, t, { walk: run && G.climb <= 0 ? 1.6 : 0, cheer: G.y > (roofNow?.y ?? 0) + 0.6 ? 1 : 0 }); lynx.visible = G.climb <= 0;
    shadow.visible = !!roofNow && G.climb <= 0; if (roofNow) shadow.position.set(G.x, roofNow.y + 0.33, G.z);
    const rz = G.z - 1.1, rr = roofAt(rz), rxW = G.x + (G.lane === 2 ? -1.5 : 1.5); rabbit.position.set(lerp(rabbit.position.x, rxW, Math.min(1, dt * 4)), rr ? rr.y + 0.3 : rabbit.position.y, rz); rabbit.scale.setScalar(0.85); animPal(rabbit, dt, t, { walk: run ? 1.5 : 0, panic: run ? 1 : 0 }); rabbit.visible = G.climb <= 0 && !!rr;
    hat.position.set(G.hx, G.hy, G.hz || 22); hat.rotation.set(Math.sin(t * 2.3) * 0.5, t * 1.6, Math.cos(t * 1.9) * 0.4);
    const por = camera.aspect < 1, cy = (roofNow?.y ?? G.y) + (por ? 4.6 : 3.4); G.camY = lerp(G.camY ?? cy, cy, Math.min(1, dt * 3)); camera.position.set(G.x * 0.5, G.camY, G.z - (por ? 8.5 : 6.5)); camera.lookAt(G.x * 0.6, G.camY - (por ? 2.6 : 1.6), G.z + (por ? 9 : 10));
  };
  function bump(o, line) { o.hit = true; G.stumbles++; G.stun = 0.7; sfx.bonk(); G.hz += 3; say(['LYNX', line]); }
  function autoPlay() { const ahead = obs.filter((o) => !o.hit && o.z - G.z > 0 && o.z - G.z < 9); const r = roofAt(G.z);
    const blocked = (ln) => ahead.some((o) => o.kind !== 'line' && o.lane === ln && o.z - G.z < 7); const want = G.lull > 0 && G.hz - G.z < 12 ? clamp(Math.round(G.hx / 2.2) + 1, 0, 2) : G.lane;
    if (want !== G.lane && !blocked(want)) laneTo(Math.sign(want - G.lane)); else if (blocked(G.lane)) { const alt = [G.lane - 1, G.lane + 1].filter((l) => l >= 0 && l <= 2 && !blocked(l)); if (alt.length) laneTo(Math.sign(alt[0] - G.lane)); else if (ahead.some((o) => o.lane === G.lane && o.z - G.z < 2.4)) jump(); }
    const line = ahead.find((o) => o.kind === 'line' && o.z - G.z < 1.6); if (line) slide();
    if (r && r.z1 - G.z < 1.2 && r.z1 - G.z > 0) jump(); const nr = nextRoof(G.z); if (nr && r && nr.y > r.y + 0.5 && r.z1 - G.z < 2.0) jump();
    if (G.lull > 0 && G.hz - G.z < 2.6 && Math.abs(G.hx - G.x) < 1.1) jump(); }
  function win() { G.phase = 'done'; sfx.good(); const stars = 1 + (G.falls + G.stumbles <= 1 ? 1 : 0) + (G.t <= 75 ? 1 : 0); const suns = ['mh_done']; if (stars === 3) suns.push('mh_star'); if (G.socks >= 5) suns.push('mh_socks');
    H.say([['', 'Lynx jumps, stretches, and closes a paw on the brim.'], ['RABBIT', 'MY HAT!'], ['RABBIT', '(quietly) My hat.'], ['LYNX', 'Hold it on with both paws.'], ['RABBIT', 'I am never letting go of it again. How do we get down?']], () =>
      ctl.finish({ win: true, stars, title: 'HAT CAUGHT', lines: [`${Math.round(G.t)} s · falls ${G.falls} · stumbles ${G.stumbles} · socks ${G.socks}/5`, 'RABBIT: "MY HAT!" (He is happy. That is his happy voice.)'], suns })); }
  function lose() { G.phase = 'done'; H.say([['', 'The hat sails off the last roof and away over the river, turning slowly in the moonlight.'], ['RABBIT', 'my hat.'], ['LYNX', 'It will come back. Hats come back.']], () => ctl.finish({ win: false, stars: 0, title: 'GONE WITH THE WIND', lines: [`Falls ${G.falls} · stumbles ${G.stumbles}`, 'LYNX: "Wait for the wind to drop. Then jump."'], suns: [] })); }
  return inst;
}
