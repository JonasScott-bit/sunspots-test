// missions/band_night.js — BAND NIGHT (Night 5). One spotlight on an empty stage at the Gutter Bowl. Then: Hydrant on
// drums, Payphone on vocals (it rings in key), Couch on bass. Their first show. Somebody has to keep them in time.
// Three-lane rhythm: notes slide down the lanes; tap the lane's pad as each one crosses the line. The song is built
// live in WebAudio: miss a note and that part goes quiet. Keep the crowd with you (the meter) to the last chord.
// Stars: finished the set · 80% of notes · half of them PERFECT. Secret: hit 95% and they play an encore.
// QA: ?m=band_night [&mauto]
import * as THREE from 'three';
import { registerMission, CAST, animPal, folk, felt, glowMat, glowSprite, sign, Merge, mesh, box, cyl, ball, sfx, clamp, lerp, rng, TAU } from './kit.js';

registerMission({
  id: 'band_night', key: 'band', title: 'BAND NIGHT', chip: 'BAND NIGHT', room: 'bowl', night: 5, where: 'Gutter Bowl (the stage)',
  rumour: 'There is one spotlight on an empty stage at the Gutter Bowl. The hydrant from outside has been practising.',
  todo: 'Keep the band in time at the Gutter Bowl', doneMsg: '. Hydrant, Payphone and Couch played their first show. Couch cried.',
  suns: [{ id: 'bn_done', name: 'BAND NIGHT', how: 'Get the band through their first show' }, { id: 'bn_star', name: 'TIGHT', how: 'Three stars at Band Night' }, { id: 'bn_encore', name: 'ENCORE', how: 'Play well enough that they come back out' }],
  create,
});
const BPM = 104, BEAT = 60 / BPM, LANES = [{ label: 'BASS<br><small>COUCH</small>', col: '#7ac2c2' }, { label: 'DRUMS<br><small>HYDRANT</small>', col: '#e0503a' }, { label: 'VOX<br><small>PAYPHONE</small>', col: '#f2c230' }];
const BASSN = [55, 55, 65.4, 49], VOX = [659, 784, 880, 784, 659, 587, 659, 523];

function chart(R) { // sections of 8 bars (4 beats): which lanes play, how busy
  const sec = [[0, 0.5], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [1, 1]];   // [lanes mask idx, density]
  const MASK = [[0], [0, 1], [0, 1, 2], [1, 2]]; const N = []; let beat = 4;
  for (const [mi, den] of sec) { const lanes = MASK[mi]; for (let b = 0; b < 16; b++) { const t = (beat + b) * BEAT;
      for (const L of lanes) { const on = L === 1 ? (b % 2 === 0 || (den > 1 && R() < 0.35)) : L === 0 ? (b % 4 === 0 || (den > 0.6 && b % 4 === 2) || (den > 1 && R() < 0.25)) : (b % 4 === 1 || b % 4 === 3) && R() < 0.4 + den * 0.2;
        if (on && !N.some((n) => Math.abs(n.t - t) < 0.01 && n.l !== L && N.filter((q) => Math.abs(q.t - t) < 0.01).length >= 2)) N.push({ t, l: L, b: beat + b, hit: 0 }); }
      if (den > 1 && R() < 0.3) N.push({ t: t + BEAT / 2, l: R() < 0.5 ? 1 : 0, b: beat + b + 0.5, hit: 0 }); }
    beat += 16; }
  return { notes: N.sort((a, b) => a.t - b.t), end: (beat + 4) * BEAT }; }

function create({ hud: H }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  scene.background = new THREE.Color('#120c1c'); scene.fog = new THREE.Fog('#120c1c', 14, 40);
  scene.add(new THREE.HemisphereLight('#a08ad8', '#1a1020', 0.5)); const spot = new THREE.SpotLight('#fff0d0', 120, 30, 0.5, 0.5, 1.2); spot.position.set(0, 10, 5); spot.target.position.set(0, 1, -2); scene.add(spot, spot.target);
  const colL = [new THREE.PointLight('#7ac2c2', 0, 8), new THREE.PointLight('#e0503a', 0, 8), new THREE.PointLight('#f2c230', 0, 8)]; colL.forEach((l, i) => { l.position.set(-3 + i * 3, 3, -1); scene.add(l); });
  const R = rng(1984);
  { const m = new Merge(); m.box(14, 1, 6, '#5a2a3a', 0, 0.5, -3); m.box(14, 0.1, 0.3, '#f2c230', 0, 1.02, -0.1); m.box(16, 8, 0.2, '#2a1a3a', 0, 4, -6); for (let i = 0; i < 8; i++) m.box(0.12, 6, 0.12, '#c9a24a', -7 + i * 2, 4, -5.8); m.box(30, 0.1, 20, '#3a2a4a', 0, -0.02, 6);
    for (let i = 0; i < 5; i++) m.box(1.6, 0.04, 14, i % 2 ? '#c9a27a' : '#b8905f', -9 + i * 1.7 - 14, 0.02, 4); scene.add(m.mesh()); }
  const banner = sign('GUTTER BOWL  ·  FIRST SHOW', 6.8, 0.7, { bg: '#2a1a3a', fg: '#ff9ac2' }); banner.position.set(0, 4.05, -5.85); scene.add(banner);
  // the band: object characters with faces
  const face = (m, x, y, z, s = 1) => { for (const dx of [-0.12, 0.12]) { m.ball(0.09 * s, '#f6f2e8', x + dx * s, y, z, 1, 1, 0.5, 8, 6); m.ball(0.045 * s, '#1d1416', x + dx * s, y, z + 0.04 * s, 1, 1, 1, 6, 4); } m.box(0.18 * s, 0.03, 0.03, '#1d1416', x, y - 0.16 * s, z); };
  const couch = new THREE.Group(); { const m = new Merge(); m.box(2.4, 0.6, 1.0, '#7ac2c2', 0, 0.5, 0); m.box(2.4, 0.8, 0.3, '#6ab2b2', 0, 1.1, -0.4); for (const x of [-1.25, 1.25]) m.box(0.3, 0.8, 1.0, '#6ab2b2', x, 0.7, 0); face(m, 0, 1.15, -0.24, 1.6); m.box(0.25, 1.6, 0.12, '#8a5a3a', 0.9, 1.2, 0.3, 0, 0, -0.5); couch.add(m.mesh()); } couch.position.set(-3.4, 1, -2.6);
  const hyd = new THREE.Group(); { const m = new Merge(); m.cyl(0.4, 0.45, 1.3, '#e0503a', 0, 0.65, 0, 12); m.ball(0.42, '#e0503a', 0, 1.3, 0, 1, 0.7, 1); m.cyl(0.14, 0.14, 0.4, '#e0503a', 0.5, 0.9, 0, 8, 0, Math.PI / 2); m.cyl(0.14, 0.14, 0.4, '#e0503a', -0.5, 0.9, 0, 8, 0, Math.PI / 2); face(m, 0, 1.05, 0.42, 1.2);
    for (const [x, z, r] of [[-1, 0.4, 0.45], [1, 0.4, 0.45], [0, 0.9, 0.55]]) { m.cyl(r, r, 0.4, '#f6f2e8', x, 0.4, z, 12); m.cyl(r + 0.02, r + 0.02, 0.05, '#c9302a', x, 0.62, z, 12); } hyd.add(m.mesh()); } hyd.position.set(0, 1, -3.2);
  const phone = new THREE.Group(); { const m = new Merge(); m.box(0.9, 1.8, 0.6, '#3a5aa8', 0, 1.3, 0); m.box(0.7, 0.6, 0.1, '#c9c0b0', 0, 1.6, 0.31); face(m, 0, 1.65, 0.38, 1.0); m.box(0.12, 0.9, 0.12, '#2a2a30', 0, 0.4, 0); m.box(0.2, 0.5, 0.15, '#1d1416', 0.55, 1.4, 0.2, 0, 0, 0.3); phone.add(m.mesh()); } phone.position.set(3.4, 1, -2.6);
  scene.add(couch, hyd, phone); const band = [couch, hyd, phone], bump = [0, 0, 0];
  const crowd = []; for (let i = 0; i < 9; i++) { const p = folk(R); p.position.set(-5 + (i % 5) * 2.4 + (R() - 0.5), 0, 2.6 + Math.floor(i / 5) * 1.8 + R() * 0.4); p.rotation.y = Math.PI; scene.add(p); crowd.push(p); }
  const hum = CAST.hummer(); hum.position.set(6.2, 0, 3.6); hum.rotation.y = -2.4; scene.add(hum);
  // the lane highway (2D canvas over the scene)
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;pointer-events:none'; const g2 = cv.getContext('2d');
  const G = { phase: 'off', t: 0, notes: [], end: 0, crowd: 0.55, hits: 0, perf: 0, miss: 0, combo: 0, encore: false, auto: false, lastB: -1, said: {} };
  const inst = { scene, camera, G, get phase() { return G.phase; } }; let ctl = null, pads = [];
  const say = (...L) => { if (!H.talking()) H.say(L); };
  const LEAD = 2.2, SPEED = 1 / 1.6;   // notes are visible 1.6 s before the line
  function layout() { const por = innerHeight > innerWidth, W = por ? 318 : 294, top = por ? 132 : 84, bottom = por ? 124 : 88; cv.width = W * devicePixelRatio; cv.height = (innerHeight - top - bottom) * devicePixelRatio; cv.style.width = W + 'px'; cv.style.height = (innerHeight - top - bottom) + 'px'; cv.style.left = (innerWidth - W) / 2 + 'px'; cv.style.top = top + 'px'; }
  function playLane(l, n) { if (l === 0) sfx.tone(BASSN[Math.floor((n?.b ?? 0) / 8) % 4] * 2, 0.32, 'triangle', 0.42); else if (l === 1) sfx.drum(n && n.b % 2 >= 1 ? 1 : 0); else sfx.tone(VOX[Math.floor(n?.b ?? R() * 8) % 8], 0.2, 'square', 0.08); bump[l] = 1; colL[l].intensity = 18; }
  function hit(l) { if (G.phase !== 'play') return; const st = G.t - LEAD; let best = null, bd = 0.2; for (const n of G.notes) { if (n.hit || n.l !== l) continue; const d = Math.abs(n.t - st); if (d < bd) { bd = d; best = n; } if (n.t > st + 0.3) break; }
    if (!best) { G.combo = 0; G.crowd = Math.max(0, G.crowd - 0.01); sfx.tone(140, 0.06, 'square', 0.05); return; } best.hit = bd < 0.08 ? 2 : 1; G.hits++; if (best.hit === 2) G.perf++; G.combo++; G.crowd = Math.min(1, G.crowd + 0.012); playLane(l, best); fx.push({ l, t: 0.3, p: best.hit === 2 }); }
  const fx = [];
  function draw(st) { const w = cv.width, h = cv.height, d = devicePixelRatio, lw = w / 3, hy = h - 34 * d, nr = Math.min(lw * 0.2, 17 * d); g2.clearRect(0, 0, w, h);
    for (let l = 0; l < 3; l++) { const x = (l + 0.5) * lw, gr = g2.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,243,220,0.35)'); g2.strokeStyle = gr; g2.lineWidth = 1.5 * d; g2.beginPath(); g2.moveTo(x, 0); g2.lineTo(x, hy - nr); g2.stroke();
      const lit = fx.find((f) => f.l === l); g2.lineWidth = 3 * d; g2.strokeStyle = LANES[l].col; g2.shadowColor = LANES[l].col; g2.shadowBlur = lit ? 22 * d : 8 * d; g2.globalAlpha = lit ? 1 : 0.75; g2.beginPath(); g2.arc(x, hy, nr + 3 * d, 0, TAU); g2.stroke(); g2.globalAlpha = 1; g2.shadowBlur = 0; }
    for (const f of fx) { const x = (f.l + 0.5) * lw, k = 1 - f.t / 0.3; g2.strokeStyle = f.p ? 'rgba(255,232,106,' + (1 - k) + ')' : 'rgba(191,242,224,' + (1 - k) + ')'; g2.lineWidth = 3 * d; g2.beginPath(); g2.arc(x, hy, nr + 4 * d + k * 22 * d, 0, TAU); g2.stroke(); }
    for (const n of G.notes) { const dtN = n.t - st; if (dtN > 1.7) break; if (dtN < -0.3 || n.hit) continue; const y = hy - dtN * SPEED * hy, x = (n.l + 0.5) * lw, a = clamp((hy - (hy - y)) / (hy * 0.25), 0, 1); g2.globalAlpha = a;
      g2.shadowColor = LANES[n.l].col; g2.shadowBlur = 14 * d; g2.fillStyle = LANES[n.l].col; g2.beginPath(); g2.arc(x, y, nr, 0, TAU); g2.fill(); g2.shadowBlur = 0; g2.lineWidth = 2 * d; g2.strokeStyle = 'rgba(30,18,40,0.8)'; g2.stroke();
      g2.fillStyle = 'rgba(255,255,255,0.55)'; g2.beginPath(); g2.arc(x - nr * 0.3, y - nr * 0.3, nr * 0.32, 0, TAU); g2.fill(); g2.globalAlpha = 1; } }
  function start2(encore) { const ch = chart(rng(encore ? 77 : 1984)); G.notes = encore ? ch.notes.slice(0, 60).map((n) => ({ ...n })) : ch.notes; G.end = encore ? G.notes[G.notes.length - 1].t + 2 : ch.end; G.t = 0; G.lastB = -1; G.phase = 'play'; G.total = G.notes.length; G.hits = G.perf = G.miss = 0; G.combo = 0; }
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { phase: 'talk', t: 0, crowd: 0.55, hits: 0, perf: 0, miss: 0, combo: 0, encore: false, said: {} }); for (const n of G.notes) n.hit = 0;
    pads = H.pads(LANES, hit); H.setMeter(0.55, 'CROWD'); H.pill('combo', 'COMBO 0'); c.I.padOn = false; H.root.appendChild(cv); layout(); addEventListener('resize', layout);
    onkeydown = (e) => { const i = { '1': 0, '2': 1, '3': 2, a: 0, s: 1, d: 2, arrowleft: 0, arrowdown: 1, arrowright: 2 }[e.key.toLowerCase()]; if (i !== undefined) { H.flash(pads[i], 90); hit(i); } };
    H.say([['', 'One spotlight. An empty stage. Then the band walks on. (The couch is carried on.)'], ['HYDRANT', 'One, two, one two three four.'], ['PAYPHONE', '(ring, in key)'], ['', 'Tap each lane as the notes cross the line.']], () => start2(false));
    if (G.auto) G.autoT = setInterval(() => { if (H.talking()) H.skipSub(); }, 500);
  };
  inst.stop = () => { G.phase = 'off'; clearInterval(G.autoT); onkeydown = null; cv.remove(); removeEventListener('resize', layout); };
  inst.update = (dt, t) => {
    const st = G.t - LEAD;
    if (G.phase === 'play') { G.t += dt; const b = Math.floor(st / BEAT); if (b > G.lastB && st >= 0) { G.lastB = b; sfx.tone(7000, 0.02, 'square', 0.03); if (b % 4 === 0) [262, 330, 392].forEach((f, i) => sfx.tone(f * (b % 16 < 8 ? 1 : 0.89), BEAT * 3.6, 'sine', 0.035)); }
      for (const n of G.notes) { if (n.hit) continue; if (n.t > st + 0.25) break; if (G.auto && Math.abs(n.t - st) < 0.03) { H.flash(pads[n.l], 90); hit(n.l); continue; } if (st > n.t + 0.2) { n.hit = -1; G.miss++; G.combo = 0; G.crowd = Math.max(0, G.crowd - 0.04); } }
      H.setMeter(G.crowd, G.crowd > 0.75 ? 'CROWD · ON THEIR FEET' : G.crowd > 0.35 ? 'CROWD' : 'CROWD · LEAVING'); H.pill('combo', `COMBO ${G.combo}`);
      if (!G.said.mid && st > G.end * 0.45) { G.said.mid = 1; say(['HUMMINGBIRD (heckling)', G.crowd > 0.6 ? 'Okay. Okay, that is not bad.' : 'Is the couch even plugged in?']); }
      if (G.crowd <= 0) { G.phase = 'done'; H.say([['', 'The crowd drifts back to the lanes. Somebody bowls a strike, loudly.'], ['COUCH', 'We will practise.']], () => ctl.finish({ win: false, stars: 0, title: 'BOOED OFF (GENTLY)', lines: [`${G.hits}/${G.total} notes`, 'HYDRANT: "Watch the line, not the notes."'], suns: [] })); }
      else if (st > G.end) { G.phase = 'done'; finish(); } }
    draw(st); for (const f of fx) f.t -= dt; while (fx.length && fx[0].t <= 0) fx.shift();
    band.forEach((o, i) => { bump[i] = Math.max(0, bump[i] - dt * 5); o.scale.y = 1 + bump[i] * 0.12; o.position.y = 1 + bump[i] * 0.1; colL[i].intensity = Math.max(0, colL[i].intensity - dt * 50); });
    crowd.forEach((p, i) => { animPal(p, dt, t + i, { cheer: G.crowd > 0.7 && G.phase === 'play' ? 1 : 0 }); p.position.y = G.phase === 'play' && G.crowd > 0.5 ? Math.abs(Math.sin((st / BEAT) * Math.PI + i)) * 0.15 : 0; }); animPal(hum, dt, t, {});
    const por = camera.aspect < 1; camera.position.set(0, por ? 7 : 4.2, por ? 21 : 10); camera.lookAt(0, por ? 2.2 : 1.8, -2);
  };
  function finish() { const pct = G.hits / G.total, pp = G.hits ? G.perf / G.total : 0, stars = 1 + (pct >= 0.8 ? 1 : 0) + (pp >= 0.5 ? 1 : 0); const suns = ['bn_done']; if (stars === 3) suns.push('bn_star'); const enc = pct >= 0.95; if (enc) suns.push('bn_encore');
    H.say([['', 'The last chord. The couch holds it.'], ['', 'The crowd stands up. Even the Hummingbird.'], ...(enc ? [['', 'They will not stop clapping. The band comes back out. ENCORE.']] : []), ['PAYPHONE', 'Thank you. Please hang up.']], () =>
      ctl.finish({ win: true, stars, title: enc ? 'ENCORE!' : 'FIRST SHOW', lines: [`${G.hits}/${G.total} notes · ${G.perf} perfect · crowd ${Math.round(G.crowd * 100)}%`, 'HYDRANT: "Same time next week. I am not going anywhere. I am bolted down."'], suns })); }
  return inst;
}
