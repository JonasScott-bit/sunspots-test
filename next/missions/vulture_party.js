// missions/vulture_party.js — NOBODY SEES THE VULTURE COMING (Night 6). The Vulture lives in a glass house on the hill and
// says he hates surprises. Larry Byrd (inside man) says that is a lie: nobody has ever thrown him one.
// Stealth, top-down: Bear sneaks five party things in from the crate by the door and sets each one on its glowing spot
// while the Vulture wanders his own house. The walls are glass: he sees straight through them. Only the furniture hides
// you (couch, piano, bookcase, the big fern). His gaze is the amber fan on the floor; stand in it and he gets suspicious.
// Larry can DISTRACT him three times ("Have you seen my cap?"). Then hide behind the couch for the big moment.
// Stars: SURPRISE! · he never got past half-suspicious · one distraction or none. Secret: a party hat on his bust.
// QA: ?m=vulture_party [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, nightSky, sign, felt, glowMat, glowSprite, Merge, mesh, sfx, clamp, lerp, rng, toScreen, TAU } from './kit.js';

registerMission({
  id: 'vulture_party', key: 'vulture', title: 'NOBODY SEES THE VULTURE COMING', chip: 'SURPRISE PARTY', room: 'mansion', night: 6, where: 'The glass house on the hill',
  rumour: 'The Vulture says he hates surprises. Larry Byrd says nobody has ever thrown him one.',
  todo: 'Throw the Vulture a surprise party (the glass house)', doneMsg: '. The Vulture was surprised. He says he hated it. He is wearing the hat.',
  suns: [{ id: 'vp_done', name: 'SURPRISE!', how: 'Throw the Vulture a surprise party' }, { id: 'vp_star', name: 'NOBODY SAW', how: 'Three stars at the surprise party' }, { id: 'vp_hat', name: 'PARTY BUST', how: 'Put a party hat on the bust' }],
  create,
});
const HX = 6.5, HZ = 5.2;   // house half-size
const ITEMS = [['BANNER', -4.2, -4.6, '#ff6fae'], ['CAKE', 2.4, 1.2, '#f6efe0', -1], ['BALLOONS', -5.4, 2.8, '#f2c230'], ['STREAMERS', 2.0, -4.4, '#5fe3d2'], ['GIFT', 5.4, -3.6, '#a98cff']];
const FURN = [[-1.6, 1.6, 1.7, 0.55, '#7a3a5a', 'COUCH'], [2.6, -2.2, 1.0, 0.7, '#2a2430', 'PIANO'], [-5.7, -1.4, 0.4, 1.4, '#8a5a3a', 'BOOKCASE'], [1.2, 3.2, 0.6, 0.6, '#3a8a4a', 'FERN'], [4.4, 2.6, 1.3, 0.5, '#c9c0b0', 'COUNTER'], [-2.8, -2.6, 0.8, 0.8, '#5a4a6a', 'ARMCHAIR']];   // x, z, half-w, half-d
const ROUTE = [[-3.4, -0.2], [0.6, -0.8], [4.8, -0.6], [5.4, 4.2], [0.2, 4.4], [-4.8, 4.2], [-4.6, 0.4]];

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 300);
  scene.background = new THREE.Color('#0c0e24'); const sky = nightSky(scene, { top: '#080a20', mid: '#1a1a44', low: '#2a2a5a', glow: '#6a7aff' });
  const hemi = new THREE.HemisphereLight('#a0a8ff', '#2a2034', 1.0); scene.add(hemi); const lamp = new THREE.PointLight('#ffd8a0', 30, 16, 1.4); lamp.position.set(0, 4, 0); scene.add(lamp);
  const R = rng(1313);
  { const m = new Merge(); m.box(60, 0.1, 40, '#1e2a24', 0, -0.06, 0); m.box(HX * 2, 0.12, HZ * 2, '#d8d0c4', 0, 0, 0);
    for (let x = -HX; x < HX; x += 1.3) m.box(0.03, 0.01, HZ * 2, '#c8c0b4', x, 0.065, 0);
    for (const [x, z, hw, hd, c, k] of FURN) { if (k === 'COUCH') { m.box(hw * 2, 0.5, hd * 2, c, x, 0.3, z); m.box(hw * 2, 0.6, 0.25, c, x, 0.7, z + hd - 0.12); }
      else if (k === 'PIANO') { m.box(hw * 2, 1.1, hd * 2, c, x, 0.55, z); m.box(hw * 2, 0.06, 0.3, '#f6f2e8', x, 0.9, z - hd + 0.2); }
      else if (k === 'BOOKCASE') { m.box(hw * 2, 2.2, hd * 2, c, x, 1.1, z); for (let i = 0; i < 4; i++) m.box(hw * 1.6, 0.35, hd * 1.8, R.pick(['#c9302a', '#3a6a8a', '#f2c230', '#2f8a86']), x + 0.05, 0.35 + i * 0.5, z); }
      else if (k === 'FERN') { m.cyl(0.4, 0.3, 0.6, '#c86a3a', x, 0.3, z, 10); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; m.ball(0.45, c, x + Math.cos(a) * 0.35, 1.1, z + Math.sin(a) * 0.35, 1, 0.5, 1); } m.ball(0.5, '#4a9a5a', x, 1.4, z); }
      else m.box(hw * 2, k === 'COUNTER' ? 1.0 : 0.9, hd * 2, c, x, k === 'COUNTER' ? 0.5 : 0.45, z); }
    // glass frames + bust plinth + crate
    for (const [x0, z0, x1, z1] of [[-HX, -HZ, HX, -HZ], [-HX, HZ, -1, HZ], [1, HZ, HX, HZ], [-HX, -HZ, -HX, HZ], [HX, -HZ, HX, HZ]]) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 2); for (let i = 0; i <= n; i++) { const k = i / n; m.box(0.08, 2.6, 0.08, '#3a3a48', lerp(x0, x1, k), 1.3, lerp(z0, z1, k)); } m.box(Math.abs(x1 - x0) + 0.08, 0.08, Math.abs(z1 - z0) + 0.08, '#3a3a48', (x0 + x1) / 2, 2.6, (z0 + z1) / 2); }
    m.box(0.5, 1.0, 0.5, '#efe6d6', -0.2, 0.5, -4.6); m.box(1.0, 0.7, 0.8, '#a8784a', 0, 0.35, HZ + 1.2); scene.add(m.mesh()); }
  const glassMat = new THREE.MeshLambertMaterial({ color: '#9ad8ff', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z, w, ry] of [[0, -HZ, HX * 2, 0], [-HX, 0, HZ * 2, Math.PI / 2], [HX, 0, HZ * 2, Math.PI / 2], [-3.75, HZ, 5.5, 0], [3.75, HZ, 5.5, 0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), glassMat); p.position.set(x, 1.3, z); p.rotation.y = ry; scene.add(p); }
  const bust = new THREE.Group(); { const m = new Merge(); m.ball(0.22, '#efe6d6', 0, 1.2, 0); m.cone(0.07, 0.3, '#efe6d6', 0, 1.18, 0.25, 6, Math.PI / 2); m.box(0.35, 0.2, 0.25, '#efe6d6', 0, 1.02, 0); bust.add(m.mesh()); } bust.position.set(-0.2, 0, -4.6); scene.add(bust);
  const bustHat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 10), felt('#ff6fae')); bustHat.position.set(-0.2, 1.55, -4.6); bustHat.visible = false; scene.add(bustHat);
  const pianoHat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 10), felt('#ff6fae')); pianoHat.position.set(2.6, 1.28, -2.2); scene.add(pianoHat);
  // party items
  const itemObj = (k, col) => { const g = new THREE.Group(), m = new Merge(); if (k === 'BANNER') { const s = sign('HAPPY BIRTHDAY?', 2.4, 0.5, { bg: '#ff6fae', fg: '#2b1e3c' }); s.position.y = 2.1; g.add(s); m.box(0.05, 2.3, 0.05, '#6a5a4a', -1.2, 1.15, 0); m.box(0.05, 2.3, 0.05, '#6a5a4a', 1.2, 1.15, 0); }
    else if (k === 'CAKE') { m.cyl(0.35, 0.35, 0.3, col, 0, 1.15, 0, 14); m.cyl(0.36, 0.36, 0.06, '#ff6fae', 0, 1.3, 0, 14); for (let i = 0; i < 3; i++) m.cyl(0.02, 0.02, 0.15, '#5fe3d2', -0.12 + i * 0.12, 1.4, 0, 4); }
    else if (k === 'BALLOONS') { for (const [x, y, c] of [[-0.3, 2.0, '#f2c230'], [0.2, 2.25, '#ff6fae'], [0.35, 1.85, '#5fe3d2']]) { m.ball(0.3, c, x, y, 0, 1, 1.2, 1, 10, 8); m.box(0.01, 1.2, 0.01, '#efe6d6', x * 0.5, y - 0.9, 0); } }
    else if (k === 'STREAMERS') { for (let i = 0; i < 7; i++) m.box(0.12, 1.4, 0.02, ['#5fe3d2', '#ff6fae', '#f2c230'][i % 3], -1.2 + i * 0.4, 1.9, 0, 0, 0, (i % 2 ? 0.2 : -0.2)); m.box(2.8, 0.04, 0.04, '#efe6d6', 0, 2.6, 0); }
    else { m.box(0.6, 0.5, 0.6, col, 0, 0.25, 0); m.box(0.64, 0.08, 0.1, '#f2c230', 0, 0.5, 0); m.box(0.1, 0.08, 0.64, '#f2c230', 0, 0.5, 0); }
    g.add(m.mesh()); return g; };
  const items = ITEMS.map(([k, x, z, col]) => { const g = itemObj(k, col); g.position.set(x, 0, z); g.visible = false; scene.add(g); const ring = mesh(new THREE.RingGeometry(0.55, 0.75, 24), glowMat(col, 0.75), [x, 0.08, z], scene); ring.rotation.x = -Math.PI / 2; const lab = sign(k, 2.6, 0.7, { bg: null, fg: col, glow: true, border: false }); lab.rotation.x = -Math.PI / 2; lab.position.set(x, 0.09, z + 1.05 * (ITEMS.find((q) => q[0] === k)[4] || 1)); scene.add(lab); return { k, x, z, g, ring, lab, done: false }; });
  const crateRing = mesh(new THREE.RingGeometry(0.7, 0.9, 24), glowMat('#ffd86a', 0.7), [0, 0.03, HZ + 1.2], scene); crateRing.rotation.x = -Math.PI / 2;
  const hideRing = mesh(new THREE.RingGeometry(0.5, 0.7, 24), glowMat('#bff2e0', 0.8), [-1.6, 0.08, 2.75], scene); hideRing.rotation.x = -Math.PI / 2; hideRing.visible = false;
  const bustRing = mesh(new THREE.RingGeometry(0.4, 0.55, 20), glowMat('#ff6fae', 0.6), [-0.2, 0.08, -3.8], scene); bustRing.rotation.x = -Math.PI / 2; bustRing.visible = false;
  // vision fan
  const NR = 28, fanGeo = new THREE.BufferGeometry(); fanGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NR + 1) * 3 * 3), 3)); const fanMat = new THREE.MeshBasicMaterial({ color: '#ffb23a', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }); const fan = new THREE.Mesh(fanGeo, fanMat); fan.position.y = 0.1; fan.frustumCulled = false; scene.add(fan);
  const vul = CAST.vulture(), bear = CAST.bear(), larry = CAST.larry(); scene.add(vul, bear, larry); larry.position.set(5.6, 0, 2.6); larry.rotation.y = -Math.PI / 2;
  const carry = new THREE.Group(); bear.add(carry); carry.position.y = 2.4;
  const G = { px: 0, pz: 0, pl: 0, phase: 'off', t: 0, sus: 0, maxSus: 0, distracts: 0, distT: 0, wp: 0, pause: 0, look: 0, holding: null, hatHeld: false, hatDone: false, placed: 0, auto: false, said: {} };
  const V = { x: ROUTE[0][0], z: ROUTE[0][1], yaw: 0 }, P = { x: 0, z: HZ + 2.4 };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const RANGE = 6.5, HALF = 0.62;
  function rayLen(ox, oz, dx, dz, max) { let best = max; for (const [x, z, hw, hd, , k] of FURN) { if (k === 'COUCH' || k === 'ARMCHAIR' || k === 'COUNTER') { /* low: still blocks when you crouch behind */ }
      let t0 = -1e9, t1 = 1e9; for (const [o, d, lo, hi] of [[ox, dx, x - hw, x + hw], [oz, dz, z - hd, z + hd]]) { if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { t0 = 1e9; break; } } else { let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); } }
      if (t0 <= t1 && t0 > 0 && t0 < best) best = t0; } return best; }
  function sees(x, z) { const dx = x - V.x, dz = z - V.z, d = Math.hypot(dx, dz); if (d > RANGE || d < 0.01) return d < 0.9; let a = Math.atan2(dx, dz) - V.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > HALF) return false; return rayLen(V.x, V.z, dx / d, dz / d, d) >= d - 0.05; }
  const inWall = (x, z, pad = 0) => { const inside = (a, b) => Math.abs(a) < HX + 0.25 + pad && Math.abs(b) < HZ + 0.25 + pad, inn = (a, b) => Math.abs(a) < HX - 0.25 - pad && Math.abs(b) < HZ - 0.25 - pad; if (inside(x, z) && !inn(x, z)) return !(Math.abs(x) < 1 - pad && z > 0); for (const [fx, fz, hw, hd] of FURN) if (Math.abs(x - fx) < hw + 0.3 + pad && Math.abs(z - fz) < hd + 0.3 + pad) return true; return false; };
  function path(tx, tz) { const S = 0.25, X0 = -HX - 2, Z0 = -HZ - 1.5, NX = Math.round((HX * 2 + 4) / S), NZ = Math.round((HZ * 2 + 4.5) / S), id = (i, k) => k * NX + i, ci = (x) => clamp(Math.round((x - X0) / S), 0, NX - 1), ck = (z) => clamp(Math.round((z - Z0) / S), 0, NZ - 1);
    const st = id(ci(P.x), ck(P.z)), goal = id(ci(tx), ck(tz)), prev = new Int32Array(NX * NZ).fill(-1), q = [st]; prev[st] = st;
    for (let h = 0; h < q.length; h++) { const c = q[h]; if (c === goal) break; const i = c % NX, k = (c / NX) | 0; for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nk = k + dk; if (ni < 0 || nk < 0 || ni >= NX || nk >= NZ) continue; const n = id(ni, nk); if (prev[n] >= 0) continue; if (n !== goal && inWall(X0 + ni * S, Z0 + nk * S, 0.12)) continue; prev[n] = c; q.push(n); } }
    if (prev[goal] < 0) return null; const out = []; for (let c = goal; c !== st; c = prev[c]) out.push([X0 + (c % NX) * S, Z0 + ((c / NX) | 0) * S]); return out.reverse(); }
  function distract() { if (G.phase !== 'sneak' || G.distracts >= 3 || G.distT > 0) return; G.distracts++; G.distT = 5; sfx.tone(520, 0.2, 'triangle', 0.2); sfx.tone(390, 0.25, 'triangle', 0.2, 0, 0.2); H.btn.dist.innerHTML = `DISTRACT<br>${3 - G.distracts}`; if (G.distracts >= 3) H.btn.dist.disabled = true;
    say(['LARRY BYRD', R.pick(['Have you seen my cap? It is on my head. Have you seen it?', 'Come look at this spoon. It is a very good spoon.', 'I think your fridge is humming a song I know.'])]); }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; G.qaBlind = c.auto && !/mfair/.test(location.search);   // QA autopilot checks the flow; ?mfair keeps him sighted Object.assign(G, { phase: 'talk', t: 0, sus: 0, maxSus: 0, distracts: 0, distT: 0, wp: 1, pause: 0, holding: null, hatHeld: false, hatDone: false, placed: 0, said: {} }); V.x = ROUTE[0][0]; V.z = ROUTE[0][1]; P.x = 0; P.z = HZ + 2.4;
    for (const it of items) { it.done = false; it.g.visible = false; it.ring.visible = it.lab.visible = true; } bustHat.visible = false; pianoHat.visible = true; hideRing.visible = false; carry.clear();
    H.setMeter(0, 'SUSPICION'); H.pill('items', 'PARTY 0/5'); const db = H.button('dist', 'DISTRACT<br>3', { alt: true }); db.onDown = distract; c.I.padOn = true;
    H.say([['LARRY BYRD', 'He says he hates surprises.'], ['LARRY BYRD', 'Nobody has ever thrown him one. So how would he know.'], ['BEAR', 'It is a glass house, Larry.'], ['LARRY BYRD', 'Then stay behind the furniture. Stay out of the orange.'], ['', 'Carry each thing from the crate to its glowing spot.']], () => { G.phase = 'sneak'; G.t = 0; H.hint('STAY OUT OF THE ORANGE', 2.2); });
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); };
  inst.update = (dt, t, I) => {
    G.t += dt; sky.follow?.(camera); const sneak = G.phase === 'sneak' || G.phase === 'hide'; let ax = sneak ? I.axis() : { x: 0, y: 0 }; if (G.auto && sneak) ax = autoAx();
    const mv = Math.hypot(ax.x, ax.y), sp = G.holding ? 2.4 : 3.0; let nx = clamp(P.x + ax.x * sp * dt, -HX - 2, HX + 2), nz = clamp(P.z + ax.y * sp * dt, -HZ - 1.5, HZ + 3);
    if (!inWall(nx, P.z)) P.x = nx; if (!inWall(P.x, nz)) P.z = nz;
    G.px = +P.x.toFixed(2); G.pz = +P.z.toFixed(2); G.pl = G.path ? G.path.length : -1;
    bear.position.set(P.x, 0, P.z); if (mv > 0.1) bear.rotation.y = Math.atan2(ax.x, ax.y); animPal(bear, dt, t, { walk: mv * 0.8 });
    // Vulture
    G.distT -= dt; let tyaw;
    if (G.distT > 0) tyaw = Math.atan2(larry.position.x - V.x, larry.position.z - V.z);
    else if (G.pause > 0) { G.pause -= dt; tyaw = V.yaw + Math.sin(t * 1.4) * dt * 1.2; }
    else { const [wx, wz] = ROUTE[G.wp], dx = wx - V.x, dz = wz - V.z, d = Math.hypot(dx, dz); if (d < 0.1) { G.wp = (G.wp + 1) % ROUTE.length; G.pause = 1.2 + R() * 1.2; } else { V.x += dx / d * 1.25 * dt; V.z += dz / d * 1.25 * dt; tyaw = Math.atan2(dx, dz); } }
    if (tyaw !== undefined) { let da = tyaw - V.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); V.yaw += clamp(da, -2.6 * dt, 2.6 * dt); }
    vul.position.set(V.x, 0, V.z); vul.rotation.y = V.yaw; animPal(vul, dt, t, { walk: G.pause > 0 || G.distT > 0 ? 0 : 0.5 }); animPal(larry, dt, t, { wave: G.distT > 0 ? 1 : 0 });
    // fan
    const pos = fanGeo.attributes.position.array; for (let i = 0; i < NR; i++) { const a0 = V.yaw - HALF + (i / NR) * HALF * 2, a1 = V.yaw - HALF + ((i + 1) / NR) * HALF * 2; const l0 = rayLen(V.x, V.z, Math.sin(a0), Math.cos(a0), RANGE), l1 = rayLen(V.x, V.z, Math.sin(a1), Math.cos(a1), RANGE);
      pos.set([V.x, 0, V.z, V.x + Math.sin(a0) * l0, 0, V.z + Math.cos(a0) * l0, V.x + Math.sin(a1) * l1, 0, V.z + Math.cos(a1) * l1], i * 9); } fanGeo.attributes.position.needsUpdate = true;
    if (sneak) { const seen = sees(P.x, P.z) && !(G.auto && G.qaBlind); const d = Math.hypot(P.x - V.x, P.z - V.z); if (seen) { G.sus = Math.min(1, G.sus + dt * (0.26 + (RANGE - d) * 0.07)); if (!G.said.seen) { G.said.seen = 1; say(['VULTURE', 'Hm? Is someone there? I hate that.']); } } else G.sus = Math.max(0, G.sus - dt * 0.12);
      G.maxSus = Math.max(G.maxSus, G.sus); fanMat.color.set(seen ? '#ff5a3a' : '#ffb23a'); fanMat.opacity = seen ? 0.42 : 0.26; H.setMeter(G.sus, G.sus > 0.7 ? 'SUSPICION · HE IS COMING OVER' : 'SUSPICION');
      if (G.sus >= 1) return caught();
      // crate, items, hat
      if (!G.holding && !G.hatHeld && Math.hypot(P.x, P.z - HZ - 1.2) < 1.0) { const nxt = items.find((q) => !q.done); if (nxt) { G.holding = nxt; carry.clear(); const o = itemObj(nxt.k, ITEMS.find((q) => q[0] === nxt.k)[3]); o.scale.setScalar(0.45); o.position.y = -0.6; carry.add(o); sfx.pop(); H.hint(`CARRYING: ${nxt.k}`, 1.6); } }
      if (G.holding && Math.hypot(P.x - G.holding.x, P.z - G.holding.z) < 0.8) { const it = G.holding; it.done = true; it.g.visible = true; it.ring.visible = it.lab.visible = false; G.holding = null; carry.clear(); G.placed++; sfx.good(); H.pill('items', `PARTY ${G.placed}/5`); if (G.placed === 5) { G.phase = 'hide'; hideRing.visible = true; say(['LARRY BYRD', 'He is coming. Behind the couch. Now.']); } }
      if (!G.holding && !G.hatHeld && !G.hatDone && Math.hypot(P.x - 2.6, P.z - (-2.2 + 1.1)) < 0.8) { G.hatHeld = true; pianoHat.visible = false; carry.clear(); const h = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 10), felt('#ff6fae')); h.position.y = -0.2; carry.add(h); bustRing.visible = true; sfx.pop(); }
      if (G.hatHeld && Math.hypot(P.x - (-0.2), P.z - (-3.8)) < 0.7) { G.hatHeld = false; G.hatDone = true; carry.clear(); bustHat.visible = true; bustRing.visible = false; sfx.star(2); H.toast('☀ PARTY BUST', 2); }
      if (G.phase === 'hide' && Math.hypot(P.x + 1.6, P.z - 2.75) < 0.6) surprise(); }
    // camera fits the house
    const hf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), por = camera.aspect < 1, need = Math.max((HX + 0.8) / (hf * camera.aspect), (HZ + (por ? 3.4 : 3.8)) / hf); camera.position.set(0, need, need * 0.22 + 0.2); camera.lookAt(0, 0, por ? 0.2 : -0.3); if (!por) camera.setViewOffset(innerWidth, innerHeight, 0, -30, innerWidth, innerHeight); else camera.clearViewOffset();
  };
  function autoAx() { // QA: wait out of sight, move when the path is clear
    const target = G.hatHeld ? [-0.2, -3.8] : G.phase === 'hide' ? [-1.6, 2.75] : G.holding ? [G.holding.x, G.holding.z] : [0, HZ + 1.2]; if (G.distracts < 1 && G.placed === 2 && G.distT <= 0) distract();
    const key = target.join(','); if (G.pathKey !== key || !G.path || !G.path.length) { G.pathKey = key; G.path = path(target[0], target[1]) || []; }
    while (G.path.length && Math.hypot(G.path[0][0] - P.x, G.path[0][1] - P.z) < 0.18) G.path.shift(); const wp = G.path[0] || target, dx = wp[0] - P.x, dz = wp[1] - P.z, l = Math.hypot(dx, dz); if (l < 0.05) return { x: 0, y: 0 };
    if (!G.qaBlind) { if (sees(P.x, P.z)) { const ax = P.x - V.x, az = P.z - V.z, al = Math.hypot(ax, az) || 1; if (G.sus > 0.35 && G.distT <= 0) distract(); return { x: -az / al, y: ax / al }; } if (sees(P.x + dx / l * 0.9, P.z + dz / l * 0.9)) return { x: 0, y: 0 }; }
    return { x: dx / l, y: dz / l }; }
  function surprise() { G.phase = 'done'; sfx.good(); hemi.intensity = 0.2; lamp.intensity = 0; setTimeout(() => { hemi.intensity = 1.2; lamp.intensity = 40; sfx.sun?.(); }, 900);
    const stars = 1 + (G.maxSus < 0.5 ? 1 : 0) + (G.distracts <= 1 ? 1 : 0); const suns = ['vp_done']; if (stars === 3) suns.push('vp_star'); if (G.hatDone) suns.push('vp_hat');
    H.say([['', 'The Vulture comes into the dark living room and reaches for the lamp.'], ['EVERYBODY', 'SURPRISE!'], ['VULTURE', '...'], ['VULTURE', 'I hate this.'], ['LARRY BYRD', 'He is smiling. Look. That is what that is.'], ['VULTURE', 'Is there cake? I hate cake. Give me the big piece.']], () =>
      ctl.finish({ win: true, stars, title: 'SURPRISE!', lines: [`Suspicion peaked at ${Math.round(G.maxSus * 100)}% · distractions ${G.distracts}`, 'LARRY BYRD: "Nobody sees the Vulture coming. Nobody saw us coming either."'], suns })); }
  function caught() { G.phase = 'done'; sfx.bad(); H.say([['VULTURE', 'Bear. Why are you holding a cake in my living room.'], ['BEAR', 'No reason.'], ['VULTURE', 'Is this a surprise? I hate surprises.']], () => ctl.finish({ win: false, stars: 0, title: 'NOT A SURPRISE', lines: [`Party ${G.placed}/5`, 'LARRY BYRD: "Behind the furniture. The walls are glass, Bear."'], suns: [] })); }
  return inst;
}
