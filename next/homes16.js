// homes16.js — run 16: walk-in interiors for the last seven houses (ram, anteater, apt_vict, moth, apt_pink, mansion, farm).
// Each copies one real era (see the header line of each builder), felt + clay, matte, colours pulled from its exterior ref.
// Budget: <60k tris, the Wolf is the only rig (owners/objects use glb {rest} = procedural breathe/bob via idles.js gestures).
import * as THREE from 'three';
import { larryByrd } from './minigames.js';

export function homes16(K) {
  const { glb, box, cyl, at, sign, cvTex, texMat, pane, realRoom, feltMat, eyes, playhouse, wob, txt, say, S, save } = K;
  const H = 3.4, yy = (h, y) => h * (1 - y / H);
  const ball = (r, c, seg = 10) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), feltMat(c)); m.castShadow = true; return m; };
  const glowM = (c, k = 0.8) => feltMat(c, { emissive: new THREE.Color(c), emissiveIntensity: k });
  const glowBall = (r, c, k = 0.8, seg = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), glowM(c, k));
  const add = (G, o, x, y, z, ry = 0) => { at(o, x, y, z, ry); G.add(o); return o; };
  const wallPane = (G, w, h, t, x, y, z, ry = 0, glow = 0) => { const m = pane(w, h, t, glow); m.position.set(x, y, z); m.rotation.y = ry; G.add(m); return m; };
  const fibres = (g, w, h, a = 0.05, n = 600) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); } };
  const boards = (cols, step) => (g, w, h) => { for (let x = 0, i = 0; x < w; x += step, i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(x, 0, step, h); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 1.5, h); for (let y = (i * 37) % 90; y < h; y += 90 + (i % 3) * 20) g.fillRect(x, y, step, 1.5); } fibres(g, w, h); };
  const lampLight = (G, c, x, y, z, i = 0.6, d = 3.5) => { const L = new THREE.PointLight(c, i, d); L.position.set(x, y, z); G.add(L); return L; };
  const R = {};

  // ---------------------------------------------------------------- RAM: a 1924 California Craftsman bungalow, kept exactly as it was in 1958
  // ref ram_house_01: mustard stucco, dusty pink-brown trim, black wrought iron. Inside: box-beam ceiling, oak wainscot + plate rail, Batchelder-style tile fireplace,
  // built-in leaded-glass bookcases, a Morris chair, a 1950s console radio on KSUN 1490. Chore: LOCK UP (chain, deadbolt, NOT HOME). Bowling trophies: high score 0.
  R.ram = async (G, A) => {
    const MUST = '#e9c27e', OAK = '#7a4e2e', OAK2 = '#6a4226', TRIM = '#b88272', IRON = '#1a1616', CREAM = '#f3e6c8';
    const [ram] = await Promise.all([glb('town2/ram_lo.glb', 1.75, 'ram', { rest: 'breathe' })]);
    const wains = (g, w, h, top = 1.3, step = 40) => { g.fillStyle = MUST; g.fillRect(0, 0, w, h); fibres(g, w, h, 0.04, 900);
      g.fillStyle = OAK; g.fillRect(0, yy(h, top), w, h); for (let x = 0; x < w; x += step) { g.fillStyle = OAK2; g.fillRect(x, yy(h, top), 6, h); }
      g.fillStyle = OAK2; g.fillRect(0, yy(h, top + 0.06), w, 8); g.fillStyle = OAK; g.fillRect(0, yy(h, 2.25), w, 9); g.fillStyle = TRIM; g.fillRect(0, yy(h, 2.25) + 9, w, 3); };
    realRoom(G, { H,
      floor: cvTex(256, 256, boards(['#a8743f', '#9c6a38', '#b07c46'], 16), 3, 2.4),
      back: cvTex(1024, 256, (g, w, h) => wains(g, w, h)), left: cvTex(512, 256, (g, w, h) => wains(g, w, h)), right: cvTex(512, 256, (g, w, h) => wains(g, w, h)),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); g.fillStyle = OAK2; for (let p = 0; p < w; p += 64) { g.fillRect(p, 0, 10, h); g.fillRect(0, p, w, 10); } }, 2, 1.4),
      cy: [3.1, 3.4], cz: 4.6, ceilGlow: 0.35 });
    // fireplace: Batchelder tiles (earthy, low-relief squares), oak mantel, a clinker-brick hearth
    const fpT = cvTex(256, 256, (g, w, h) => { const C = ['#b8774a', '#8a9a6a', '#c9a46a', '#7a8a8a', '#a8603a']; for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = C[(x / 32 + y / 32 * 3) % 5]; g.fillRect(x + 2, y + 2, 28, 28); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + 8, y + 8, 16, 16); } g.fillStyle = '#2a1a12'; g.fillRect(w * 0.28, h * 0.48, w * 0.44, h * 0.52); });
    wallPane(G, 1.7, 1.25, fpT, -0.6, 0.62, -2.96);
    add(G, box(2.0, 0.08, 0.28, OAK, 0.02), -0.6, 1.25, -2.86); add(G, box(1.9, 0.1, 0.5, '#8a5a4a', 0.03), -0.6, 0, -2.65);
    const embers = add(G, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.2), glowM('#e8743a', 0.9)), -0.6, 0.12, -2.88);
    // built-in bookcases each side, leaded glass doors (diamond leading)
    const leadT = cvTex(128, 256, (g, w, h) => { g.fillStyle = '#c9d6c6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; for (let k = -h; k < w + h; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } });
    for (const x of [-2.15, 0.95]) { add(G, box(0.9, 1.3, 0.4, OAK, 0.03), x, 0, -2.78); const gl = pane(0.7, 1.0, leadT); gl.position.set(x, 0.68, -2.575); G.add(gl);
      for (let i = 0; i < 4; i++) add(G, box(0.12, 0.3, 0.2, ['#7a2a2a', '#2f4a3e', '#c9a24a', '#3a3a6a'][i], 0.01), x - 0.24 + i * 0.15, 0.9, -2.75); }
    // trophies on the mantel: HIGH SCORE 0
    const trophies = [-1.2, -0.6, 0.0].map((x, i) => { const t = new THREE.Group(); t.add(box(0.16, 0.06, 0.12, OAK2, 0.01)); const c = cyl(0.03, 0.025, 0.14 + i * 0.03, '#d9b44a', 8); c.position.y = 0.06; t.add(c); const cup = cyl(0.08, 0.04, 0.1, '#d9b44a', 10); cup.position.y = 0.2 + i * 0.03; t.add(cup); return add(G, t, x, 1.33, -2.85); });
    const plaque = sign('GUTTER BOWL\nHIGH SCORE: 0', 0.5, 0.18, '#2a1a12', '#d9b44a', 0.8); plaque.position.set(-0.6, 1.95, -2.97); G.add(plaque);
    // the door (right of the back wall): heavy oak, wrought-iron grille, three locks
    const door = new THREE.Group(); door.add(box(0.95, 2.1, 0.08, '#3a2418', 0.03)); const grille = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = cyl(0.012, 0.012, 0.5, IRON, 5); b.position.set(-0.15 + i * 0.1, 1.35, 0.06); grille.add(b); } door.add(grille);
    const knob = ball(0.045, '#c9a24a'); knob.position.set(0.36, 1.0, 0.07); door.add(knob);
    const chain = new THREE.Group(); for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 4, 8), feltMat('#a8a8a0')); l.position.set(0.2 + i * 0.035, 1.5, 0.07); l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); } chain.visible = false; door.add(chain);
    const bolt = box(0.12, 0.05, 0.05, '#c9a24a', 0.01); bolt.position.set(0.3, 1.22, 0.06); door.add(bolt);
    const nh = sign('HOME', 0.34, 0.14, CREAM, '#7a2a2a', 0.8), nhMap = nh.material.map, nhNot = sign('NOT HOME', 0.34, 0.14, CREAM, '#7a2a2a', 0.8).material.map; nh.position.set(0, 1.72, 0.06); door.add(nh);
    eyes(A, door, [[0, 1.55, 0.05]], 0.04);   // the peephole looks back
    add(G, door, 2.75, 0, -2.92);
    // console radio (1950s, blonde wood, cloth grille, glowing dial) + Morris chair + braided rug + a floor lamp with a mica shade
    const radio = new THREE.Group(); radio.add(box(0.9, 0.95, 0.42, '#c8a070', 0.05)); const grillT = cvTex(128, 64, (g, w, h) => { g.fillStyle = '#8a6a4a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8a070'; g.lineWidth = 3; for (let x = 8; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
    const gp = pane(0.7, 0.36, grillT); gp.position.set(0, 0.35, 0.215); radio.add(gp); const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), glowM('#f2c46a', 0.7)); dial.position.set(0, 0.75, 0.215); radio.add(dial);
    const needle = box(0.01, 0.09, 0.01, '#7a2a2a', 0.003); needle.position.set(0, 0.7, 0.22); radio.add(needle); eyes(A, radio, [[-0.18, 0.88, 0.215], [0.18, 0.88, 0.215]], 0.045); add(G, radio, -3.2, 0, -2.45, 0.35);
    const chair = new THREE.Group(); chair.add(box(0.8, 0.42, 0.8, OAK, 0.03)); const cush = box(0.66, 0.12, 0.66, '#7a3a2a', 0.05); cush.position.y = 0.42; chair.add(cush);
    const back = new THREE.Group(); const bk = box(0.66, 0.75, 0.12, '#7a3a2a', 0.05); back.add(bk); back.position.set(0, 0.5, -0.34); back.rotation.x = -0.25; chair.add(back);
    for (const s of [-1, 1]) { const arm = box(0.1, 0.1, 0.9, OAK2, 0.02); arm.position.set(s * 0.4, 0.62, 0); chair.add(arm); } add(G, chair, -2.2, 0, -0.9, 0.5);
    const rug = cyl(1.2, 1.2, 0.02, '#9a5a3a', 24); rug.scale.z = 0.62; add(G, rug, -0.4, 0.004, -0.5); const rug2 = cyl(0.95, 0.95, 0.022, '#c9a46a', 24); rug2.scale.z = 0.62; add(G, rug2, -0.4, 0.006, -0.5);
    const lamp = new THREE.Group(); lamp.add(cyl(0.15, 0.18, 0.04, IRON, 10)); const pole = cyl(0.015, 0.015, 1.5, IRON, 5); lamp.add(pole); const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.28, 8), glowM('#f2b45a', 0.55)); shade.position.y = 1.55; lamp.add(shade); add(G, lamp, -3.3, 0, -0.6);
    lampLight(G, '#ffcf8a', -3.2, 1.6, -0.6, 0.5);
    const mat = sign('GO AWAY', 0.9, 0.5, '#8a6a3a', '#2a1a12', 0.6); mat.rotation.x = -Math.PI / 2; add(G, mat, 2.75, 0.012, -2.25); mat.rotation.x = -Math.PI / 2;
    eyes(A, mat, [[-0.3, 0.12, 0.005], [0.3, 0.12, 0.005]], 0.05);
    at(ram, 1.85, 0, -1.65, -0.25); G.add(ram);
    A.lock = 0; A.st = 0; A.wolfSpot = [0.9, 1.6]; A.anim = []; A.proc = [ram]; A.view = { look: -0.45 };
    A.setAir = () => { A.lock = 0; chain.visible = false; bolt.position.x = 0.3; nh.material.map = nhMap; nh.rotation.y = 0; A.flip = 0; back.rotation.x = -0.25; };
    A.onEnter = () => say([['RAM', 'Not buying. Not selling. Not home.'], ['RAM', 'Okay. I\'m home. Lock the door behind you. All of it.']]);
    A.tick = (dt, t) => { embers.material.emissiveIntensity = 0.7 + 0.25 * Math.sin(t * 5) * Math.sin(t * 1.7); needle.position.x = -0.2 + A.st * 0.2 + Math.sin(t * 0.7) * 0.004;
      if (A.polish > 0) { A.polish -= dt; for (const tr of trophies) tr.rotation.y += dt * 6; } if (A.flip > 0) { A.flip = Math.max(0, A.flip - dt * 3); nh.rotation.y = Math.PI * (1 - A.flip); } };
    const STA = [['KSUN 1490', [['RADIO (KSUN 1490)', 'Weather: sunny. Tomorrow: sunny. The weekend: also sunny. Nothing happened.']]],
      ['KSUN 1490 (other end of the dial)', [['RADIO (KSUN 1490)', 'You\'re listening to KSUN. You were also listening to KSUN on the other end of the dial.']]],
      ['KSUN 1490 (the middle)', [['RADIO (KSUN 1490)', 'Contest line\'s open. Be caller four. Ram, we know you\'re listening. Pick up.'], ['RAM', 'I\'m not home.']]]];
    A.who = [
      { id: 'ram_door', label: () => 'THE DOOR', o: door, talk: () => { if (A.lock === 0) { A.lock = 1; chain.visible = true; return [['', 'Chain on. (LOCK UP 1/3)'], ['RAM', 'Good. Now the deadbolt.']]; }
        if (A.lock === 1) { A.lock = 2; bolt.position.x = 0.44; return [['', 'Ka-chunk. Deadbolt. (LOCK UP 2/3)'], ['RAM', 'Now flip the sign.']]; }
        if (A.lock === 2) { A.lock = 3; A.flip = 1; nh.material.map = nhNot; return [['', 'The sign on the door now says NOT HOME. (LOCK UP 3/3)'], ['RAM', 'Perfect. Nobody can get in.'], ['WOLF', 'I\'m in.'], ['RAM', 'You were already in. That\'s a different thing.']]; }
        return [['THE DOOR', '(through the peephole) Locked. Very locked. Unlock me on your way out. Or don\'t. He likes it either way.']]; } },
      { id: 'ram_radio', label: 'CONSOLE RADIO', o: radio, talk: () => { const s = STA[A.st]; A.st = (A.st + 1) % STA.length; return [['', 'You turn the big knob. ' + s[0] + '.'], ...s[1]]; } },
      { id: 'ram_trophy', label: 'TROPHIES (POLISH)', o: trophies[1], talk: () => { A.polish = 1.2; return [['', 'You polish three bowling trophies.'], ['', 'All three are engraved "HIGH SCORE: 0".'], ['RAM', 'Three years running. Nobody\'s come close.']]; } },
      { id: 'ram_chair', label: 'MORRIS CHAIR', o: chair, talk: () => { back.rotation.x = back.rotation.x < -0.4 ? -0.25 : -0.6; return back.rotation.x < -0.4 ? [['MORRIS CHAIR', 'Click. I recline. Four notches. He only uses one.'], ['MORRIS CHAIR', 'It\'s called "watching the door".']] : [['MORRIS CHAIR', 'Click. Upright. Like a gentleman in 1924.']]; } },
      { id: 'ram_mat', label: 'WELCOME MAT', o: mat, talk: () => [['WELCOME MAT', 'I say GO AWAY.'], ['WELCOME MAT', 'You\'re standing on me. That\'s the opposite.']] },
      { id: 'ram', label: 'RAM', o: ram, talk: () => A.lock >= 3 ? [['RAM', 'Locked in. Now we can relax.'], ['RAM', 'Want to bowl? Gutter Bowl. Bring two dollars. You won\'t beat zero.']] : [['RAM', 'This house was built in 1924. I moved in in 1958.'], ['RAM', 'Nothing\'s changed since. That\'s the plan.']] },
    ];
    for (const w of A.who) if (typeof w.label === 'function') w.label = w.label();
    playhouse(A);
  };

  // ---------------------------------------------------------------- ANTEATER: a 1931 Storybook-Tudor breakfast room
  // ref anteater_house_01: mint stucco, teal trim, big gridded window, arched entry, red steps. Inside: rough mint plaster, teal arches, a gridded casement window,
  // an arched telephone niche (1931 builders loved them), red quarry-tile floor, a built-in arched china cupboard, a breakfast nook with high-back benches,
  // a cream-and-teal enamel range with a kettle, and the ant farm (his roommates). Chore: BREAKFAST (cupboard, kettle, bowl).
  R.anteater = async (G, A) => {
    const NX = 1.9, NZ = -1.25, MINT = '#c2e6cd', TEAL = '#3f8a86', RED = '#dc6065', CREAM = '#f0f2ea', DARK = '#2a3a38';
    const [ant] = await Promise.all([glb('town2/anteater_lo.glb', 1.55, 'anteater', { rest: 'breathe' })]);
    const plaster = (g, w, h, arch) => { g.fillStyle = MINT; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,90,70'},0.08)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 3 + Math.random() * 6, Math.random() * 3, 0, 7); g.fill(); }
      g.fillStyle = TEAL; g.fillRect(0, yy(h, 0.12), w, h); g.fillRect(0, yy(h, 3.0), w, 5); };
    realRoom(G, { H,
      floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#f0e6d6'; g.fillRect(0, 0, w, h); const C = [RED, '#c85a54', '#d86a5e']; for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = C[(x + y * 3) / 32 % 3]; g.fillRect(x + 2, y + 2, 28, 28); } g.fillStyle = TEAL; for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) g.fillRect(x - 3, y - 3, 6, 6); }, 4, 3),
      back: cvTex(1024, 256, (g, w, h) => plaster(g, w, h)), left: cvTex(512, 256, (g, w, h) => plaster(g, w, h)), right: cvTex(512, 256, (g, w, h) => plaster(g, w, h)),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#eef6ec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfe2d0'; g.lineWidth = 6; for (let r = 30; r < 200; r += 40) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); } }, 1, 1), cy: [3.0, 3.4], cz: 4.6, ceilGlow: 0.35 });
    // the big gridded casement window (centre-left), teal frame, morning outside
    const winT = cvTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd2e6'); gr.addColorStop(0.7, '#e8f0d8'); gr.addColorStop(0.71, '#9a966c'); gr.addColorStop(1, '#8a865c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(w * 0.75, h * 0.22, 18, 0, 7); g.fill(); g.strokeStyle = CREAM; g.lineWidth = 7; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(w * k / 4, 0); g.lineTo(w * k / 4, h); g.stroke(); } for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(0, h * k / 5); g.lineTo(w, h * k / 5); g.stroke(); } });
    wallPane(G, 1.5, 1.6, winT, -1.4, 1.75, -2.97, 0, 0.35); add(G, box(1.7, 0.1, 0.12, TEAL, 0.02), -1.4, 0.9, -2.94); add(G, box(1.7, 0.1, 0.08, TEAL, 0.02), -1.4, 2.55, -2.94);
    for (const s of [-1, 1]) add(G, box(0.1, 1.75, 0.08, TEAL, 0.02), -1.4 + s * 0.8, 0.85, -2.94);
    // arched telephone niche (right of back wall) with a candlestick phone
    const archT = cvTex(128, 192, (g, w, h) => { g.fillStyle = MINT; g.fillRect(0, 0, w, h); g.fillStyle = TEAL; g.beginPath(); g.moveTo(14, h); g.lineTo(14, 60); g.arc(w / 2, 60, w / 2 - 14, Math.PI, 0); g.lineTo(w - 14, h); g.fill(); g.fillStyle = '#2f6a66'; g.beginPath(); g.moveTo(24, h); g.lineTo(24, 62); g.arc(w / 2, 62, w / 2 - 24, Math.PI, 0); g.lineTo(w - 24, h); g.fill(); });
    wallPane(G, 0.7, 1.05, archT, 0.25, 1.55, -2.97); add(G, box(0.5, 0.05, 0.22, CREAM, 0.02), 0.25, 1.18, -2.86);
    const phone = new THREE.Group(); phone.add(cyl(0.06, 0.08, 0.03, DARK, 10)); const st = cyl(0.015, 0.02, 0.24, DARK, 6); phone.add(st); const mouth = cyl(0.04, 0.025, 0.05, DARK, 8); mouth.position.y = 0.24; phone.add(mouth);
    const rec = cyl(0.025, 0.02, 0.1, DARK, 6); rec.rotation.z = 0.4; rec.position.set(0.08, 0.15, 0); phone.add(rec); add(G, phone, 0.25, 1.21, -2.86);
    // built-in arched china cupboard (left), teal, glass upper with plates; ANT-O's inside
    const cup = new THREE.Group(); cup.add(box(1.1, 2.3, 0.45, TEAL, 0.04)); const glT = cvTex(128, 192, (g, w, h) => { g.fillStyle = '#2f6a66'; g.fillRect(0, 0, w, h); g.fillStyle = CREAM; for (const y of [50, 110, 170]) for (let x = 14; x < w - 10; x += 26) { g.beginPath(); g.arc(x + 10, y - 16, 11, 0, 7); g.fill(); } g.fillStyle = MINT; g.fillRect(0, 0, w, 20); });
    const cg = pane(0.86, 1.1, glT); cg.position.set(0, 1.6, 0.23); cup.add(cg); add(G, cup, -3.2, 0, -2.6);
    const antos = new THREE.Group(); const cb = box(0.22, 0.32, 0.08, '#f2b632', 0.01); antos.add(cb); const lab = sign('ANT-O\'s\nNO ANTS*', 0.2, 0.2, '#f2b632', '#7a2a2a', 0.8); lab.position.set(0, 0.17, 0.042); antos.add(lab); antos.visible = false; add(G, antos, NX + 0.1, 0.78, NZ - 0.3, -0.3);
    // breakfast nook: table + two high-back Tudor benches (arched tops)
    const table = new THREE.Group(); const tt = box(0.8, 0.06, 1.2, '#8a5a3a', 0.02); tt.position.y = 0.72; table.add(tt); const leg = box(0.12, 0.72, 0.12, '#6a4226', 0.02); table.add(leg); add(G, table, NX, 0, NZ);
    for (const s of [-1, 1]) { const b = new THREE.Group(); b.add(box(1.2, 0.45, 0.42, TEAL, 0.03)); const bb = box(1.2, 1.1, 0.08, TEAL, 0.03); bb.position.set(0, 0.45, -0.2); b.add(bb); const cap = cyl(0.6, 0.6, 0.08, TEAL, 16); cap.rotation.x = Math.PI / 2; cap.scale.y = 0.4; cap.position.set(0, 1.55, -0.16); b.add(cap); add(G, b, NX + s * 0.72, 0, NZ, -s * Math.PI / 2); }
    const bowl = cyl(0.13, 0.08, 0.08, CREAM, 12); add(G, bowl, NX, 0.78, NZ + 0.2); const milk = cyl(0.11, 0.11, 0.01, '#f2b632', 12); milk.visible = false; add(G, milk, NX, 0.84, NZ + 0.2);
    const straw = cyl(0.008, 0.008, 0.5, '#e05a5a', 5); add(G, straw, NX - 0.05, 0.8, NZ + 0.2); straw.rotation.z = 0.5;
    // 1930s range + kettle
    const range = new THREE.Group(); range.add(box(1.0, 0.9, 0.6, CREAM, 0.06)); for (let i = 0; i < 2; i++) { const d = box(0.38, 0.32, 0.02, TEAL, 0.03); d.position.set(-0.22 + i * 0.44, 0.3, 0.3); range.add(d); } const top = box(1.0, 0.04, 0.6, DARK, 0.01); top.position.y = 0.9; range.add(top);
    const splash = box(1.0, 0.45, 0.06, CREAM, 0.04); splash.position.set(0, 0.92, -0.28); range.add(splash); add(G, range, -1.4, 0, -2.6);
    const kettle = new THREE.Group(); const kb = ball(0.13, RED, 12); kb.scale.y = 0.8; kettle.add(kb); const sp = cyl(0.015, 0.03, 0.14, RED, 6); sp.rotation.z = -1.0; sp.position.set(0.12, 0.03, 0); kettle.add(sp); const kh = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 4, 10, Math.PI), feltMat(DARK)); kh.position.y = 0.08; kettle.add(kh);
    eyes(A, kettle, [[-0.05, 0.04, 0.12], [0.05, 0.04, 0.12]], 0.025); add(G, kettle, -1.6, 1.04, -2.5);
    const steam = []; for (let i = 0; i < 4; i++) { const s = ball(0.05 + i * 0.015, '#ffffff', 8); s.material.transparent = true; s.material.opacity = 0; add(G, s, -1.45, 1.15, -2.5); steam.push(s); }
    // the ant farm (his roommates): glass slab with tunnels, ants marching (one instanced mesh)
    const farm = new THREE.Group(); farm.add(box(1.0, 0.06, 0.2, '#6a4226', 0.01)); const tunT = cvTex(256, 160, (g, w, h) => { g.fillStyle = '#c9a46a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8f0e0'; g.fillRect(0, 0, w, 22); g.strokeStyle = '#7a5a3a'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(30, 22); g.bezierCurveTo(40, 80, 120, 60, 130, 120); g.bezierCurveTo(140, 150, 210, 140, 220, 90); g.lineTo(230, 22); g.stroke(); g.beginPath(); g.moveTo(130, 120); g.lineTo(70, 140); g.stroke(); txt(g, 'ANT-HAVEN DELUXE', w / 2, 12, 12, '#2a3a38'); });
    const tun = pane(0.95, 0.6, tunT); tun.position.set(0, 0.37, 0.06); farm.add(tun); const fr = box(1.0, 0.66, 0.1, '#6a4226', 0.01); fr.position.z = -0.02; farm.add(fr); add(G, farm, 3.1, 0.9, -2.7, -0.35);
    const stand = box(0.9, 0.9, 0.5, '#8a5a3a', 0.03); add(G, stand, 3.1, 0, -2.6, -0.35);
    const PATH = new THREE.CatmullRomCurve3([[-0.4, 0.3], [-0.36, 0.08], [-0.08, 0.13], [-0.0, -0.08], [0.1, -0.15], [0.28, -0.1], [0.36, 0.06], [0.38, 0.3]].map(([x, y]) => new THREE.Vector3(x, y + 0.37, 0.065)));
    const ants = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.012, 0.005), feltMat('#1a1210'), 22); farm.add(ants); const dm = new THREE.Object3D();
    at(ant, -0.5, 0, -1.7, 0.4); G.add(ant);
    A.din = 0; A.antV = 0.05; A.wolfSpot = [0.6, 1.5]; A.anim = []; A.proc = [ant]; A.view = { look: -0.45 };
    A.setAir = () => { A.din = 0; antos.visible = false; milk.visible = false; };
    A.onEnter = () => say([['ANTEATER', 'I\'m eating. You know what. Come in anyway.'], ['ANTEATER', 'Mind the ants. They\'re roommates. Not breakfast.']]);
    A.tick = (dt, t) => { for (let i = 0; i < 22; i++) { const u = ((t * A.antV + i / 22) % 1 + 1) % 1, p = PATH.getPointAt(u), q = PATH.getTangentAt(u); dm.position.copy(p); dm.rotation.z = Math.atan2(q.y, q.x); dm.updateMatrix(); ants.setMatrixAt(i, dm.matrix); } ants.instanceMatrix.needsUpdate = true;
      if (A.whistle > 0) { A.whistle -= dt; kettle.position.y = 1.04 + Math.abs(Math.sin(t * 30)) * 0.012; } steam.forEach((s, i) => { const u = (t * 0.6 + i / 4) % 1; s.position.set(-1.45 + u * 0.15, 1.15 + u * 0.5, -2.5); s.material.opacity = (A.whistle > 0 ? 0.6 : 0.12) * (1 - u); });
      if (A.antV > 0.05) A.antV = Math.max(0.05, A.antV - dt * 0.03); };
    A.who = [
      { id: 'ant_cup', label: 'CHINA CUPBOARD', o: cup, talk: () => { if (A.din === 0) { A.din = 1; antos.visible = true; return [['', 'Behind the plates: a box of ANT-O\'s. *Asterisk: "mostly".'], ['ANTEATER', 'That\'s breakfast. Kettle next.'], ['', 'BREAKFAST 1/3']]; } return [['CHINA CUPBOARD', 'Twelve plates. He uses one. The other eleven are for show. I\'m a show cupboard.']]; } },
      { id: 'ant_kettle', label: 'KETTLE', o: kettle, talk: () => { A.whistle = 2.2; if (A.din === 1) { A.din = 2; return [['KETTLE', 'Wheeeeeeee.'], ['KETTLE', 'That\'s my whole job. I love my job.'], ['', 'Hot water for the ANT-O\'s. BREAKFAST 2/3']]; } return [['KETTLE', 'Wheeee. (I\'m not even on. I just like it.)']]; } },
      { id: 'ant_bowl', label: 'BOWL', o: bowl, talk: () => { if (A.din === 2) { A.din = 3; milk.visible = true; return [['', 'ANT-O\'s, hot water, one long straw.'], ['ANTEATER', '(slurp) Mostly no ants.'], ['ANTEATER', 'Mostly.'], ['', 'BREAKFAST: done. (3/3)']]; } return A.din >= 3 ? [['', 'An empty bowl. A very long straw.']] : [['', 'An empty bowl. Something goes in it. Ask the cupboard.']]; } },
      { id: 'ant_farm', label: 'ANT FARM', o: farm, talk: () => { A.antV = 0.22; return Math.random() < 0.5 ? [['THE ANTS (all of them)', 'WE ARE MARCHING.'], ['WOLF', 'Where to?'], ['THE ANTS', 'AROUND.']] : [['THE ANTS', 'WE PAY RENT. IN TUNNELS.'], ['ANTEATER', 'They do. Look at those tunnels.']]; } },
      { id: 'ant_phone', label: 'PHONE NICHE', o: phone, talk: () => [['', 'You lift the candlestick phone.'], ['OPERATOR (made of felt)', 'Number, please.'], ['WOLF', 'Who\'s calling?'], ['OPERATOR', 'You are. Number, please.'], ['', 'You hang up. The niche is very proud of the phone.']] },
      { id: 'anteater', label: 'ANTEATER', o: ant, talk: () => A.din >= 3 ? [['ANTEATER', 'Full. Thank you. Now the ants and I watch the window.'], ['ANTEATER', 'Nothing happens out there. It\'s very relaxing.']] : [['ANTEATER', 'House is from 1931. Arches everywhere. I don\'t trust a square doorway.'], ['ANTEATER', 'Breakfast first. Then trust.']] },
    ];
    playhouse(A);
  };

  // ---------------------------------------------------------------- APT_VICT: an 1889 Queen Anne front parlor (upstairs flat in the tan Victorian, #2 on the apartment row)
  // ref apartment_row_moth_01 (#2 tan, white gingerbread). Inside: oxblood-and-gold damask paper, a Lincrusta dado, walnut, a plaster ceiling medallion with a two-arm gasolier,
  // a bay with lace, a tufted settee, a walnut pump organ, a brass speaking tube to the landlord ("A VOICE"). Chore: RENT DAY (cushion, organ, rent box).
  R.apt_vict = async (G, A) => {
    const OX = '#6a1f24', GOLD = '#c9a24a', WAL = '#4a2a1a', TAN = '#d9c29a', LACE = '#f4ecdc', TEAL = '#2f5a5a';
    const damask = (g, w, h) => { g.fillStyle = OX; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(201,162,74,0.55)';
      for (let y = 0; y < h * 0.7; y += 40) for (let x = (y / 40 % 2) * 20; x < w; x += 40) { g.beginPath(); g.ellipse(x, y, 7, 13, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - 9, y + 4, 6, 3, -0.6, 0, 7); g.ellipse(x + 9, y + 4, 6, 3, 0.6, 0, 7); g.fill(); }
      g.fillStyle = '#5a3a22'; g.fillRect(0, yy(h, 0.95), w, h); g.fillStyle = '#6a4a2a'; for (let x = 0; x < w; x += 22) { g.beginPath(); g.arc(x + 11, yy(h, 0.55), 7, 0, 7); g.fill(); }
      g.fillStyle = WAL; g.fillRect(0, yy(h, 0.98), w, 6); g.fillRect(0, yy(h, 0.14), w, h); g.fillStyle = GOLD; g.fillRect(0, yy(h, 2.85), w, 3); g.fillStyle = TAN; g.fillRect(0, 0, w, yy(h, 2.85)); };
    realRoom(G, { H,
      floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#6a3a22'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = (x + y) / 32 % 2 ? '#7a4628' : '#5e321e'; g.save(); g.translate(x + 16, y + 16); g.rotate(((x + y) / 32 % 2) * Math.PI / 2); for (let k = -16; k < 16; k += 6) g.fillRect(-16, k, 32, 4); g.restore(); } }, 3, 2.4),
      back: cvTex(1024, 256, damask), left: cvTex(512, 256, damask), right: cvTex(512, 256, damask),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#efe4cc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9c8a4'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); }, 1, 1), cy: [3.2, 3.4], cz: 4.6, ceilGlow: 0.3 });
    // medallion + gasolier (two glowing tulip shades)
    const med = cyl(0.42, 0.42, 0.04, '#e8dcc0', 18); add(G, med, 0, 3.17, -0.9); const gas = new THREE.Group(); const rod = cyl(0.015, 0.015, 0.8, GOLD, 6); rod.position.y = -0.8; gas.add(rod);
    const arm = box(0.9, 0.03, 0.03, GOLD, 0.01); arm.position.y = -0.8; gas.add(arm); const flames = [];
    for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.14, 8), glowM('#f6d48a', 0.6)); sh.position.set(s * 0.45, -0.72, 0); gas.add(sh); flames.push(sh); }
    add(G, gas, 0, 3.17, -0.9); lampLight(G, '#ffd8a0', 0, 2.2, -0.9, 0.5, 5);
    // bay window with lace (centre back, angled side panes)
    const laceT = cvTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ab0c8'); gr.addColorStop(1, '#d6c8a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(244,236,220,0.75)'; for (let y = 0; y < h; y += 14) for (let x = (y / 14 % 2) * 7; x < w; x += 14) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } g.fillStyle = LACE; g.fillRect(0, h - 26, w, 26); });
    for (const [x, ry, z] of [[-0.75, 0.5, -2.75], [0, 0, -2.96], [0.75, -0.5, -2.75]]) { const wp = wallPane(G, 0.7, 1.9, laceT, x, 1.75, z, ry, 0.25); const fr = box(0.8, 0.08, 0.1, WAL, 0.01); add(G, fr, x, 0.78, z + 0.04, ry); }
    const valance = box(2.4, 0.3, 0.12, OX, 0.03); add(G, valance, 0, 2.7, -2.82); const fringe = box(2.4, 0.06, 0.13, GOLD, 0.01); add(G, fringe, 0, 2.66, -2.82);
    // tufted settee (teal velvet felt, buttons), cushion with the coin under it
    const sett = new THREE.Group(); sett.add(box(1.7, 0.45, 0.7, WAL, 0.04)); const seat = box(1.6, 0.14, 0.62, TEAL, 0.06); seat.position.y = 0.45; sett.add(seat); const sb = box(1.7, 0.7, 0.14, TEAL, 0.08); sb.position.set(0, 0.55, -0.3); sett.add(sb);
    const crest = cyl(0.4, 0.4, 0.1, TEAL, 16); crest.rotation.x = Math.PI / 2; crest.scale.set(1.8, 1, 0.6); crest.position.set(0, 1.18, -0.25); sett.add(crest);
    for (let i = 0; i < 6; i++) { const bt = ball(0.025, GOLD, 6); bt.position.set(-0.6 + i * 0.24, 0.8 + (i % 2) * 0.15, -0.22); sett.add(bt); }
    const cushion = box(0.5, 0.14, 0.4, GOLD, 0.06); cushion.position.set(0.45, 0.6, 0); cushion.rotation.y = 0.2; sett.add(cushion);
    eyes(A, sett, [[-0.25, 1.15, -0.18], [0.25, 1.15, -0.18]], 0.06); add(G, sett, -2.2, 0, -1.4, 0.55);
    // pump organ (walnut, high back with a mirror and spindles, two pedals)
    const organ = new THREE.Group(); organ.add(box(1.3, 0.85, 0.6, WAL, 0.03)); const keys = box(1.1, 0.04, 0.22, LACE, 0.01); keys.position.set(0, 0.85, 0.22); organ.add(keys);
    for (let i = 0; i < 8; i++) { const k = box(0.05, 0.02, 0.12, '#1a1210', 0.005); k.position.set(-0.45 + i * 0.13, 0.885, 0.2); organ.add(k); }
    const hutch = box(1.3, 1.2, 0.2, WAL, 0.03); hutch.position.set(0, 0.95, -0.2); organ.add(hutch); const mir = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), feltMat('#b8c4c8')); mir.position.set(0, 1.6, -0.09); organ.add(mir);
    const pedals = [-1, 1].map(s => { const pd = box(0.2, 0.04, 0.28, '#3a2a1a', 0.01); pd.position.set(s * 0.18, 0.08, 0.32); organ.add(pd); return pd; });
    const stops = sign('HARMONIA PARLOR ORGAN CO.', 0.8, 0.1, WAL, GOLD, 0.7); stops.position.set(0, 1.0, -0.09); organ.add(stops);
    const billO = sign('RENT\nOWED', 0.2, 0.24, LACE, OX, 0.6); billO.position.set(0.4, 1.12, -0.085); billO.visible = false; organ.add(billO);
    add(G, organ, 2.3, 0, -2.6, -0.2);
    const notes = []; for (let i = 0; i < 4; i++) { const n = sign('♪', 0.16, 0.16, OX, GOLD, 0.9); n.material.transparent = true; n.material.opacity = 0; add(G, n, 2.3, 1.6, -2.3); notes.push(n); }
    // speaking tube (brass, whistle cap) + the rent box on a little table + hat rack + stereoscope on a parlour table
    const tube = new THREE.Group(); const tp = cyl(0.03, 0.03, 1.4, GOLD, 8); tube.add(tp); const mouth = cyl(0.07, 0.04, 0.12, GOLD, 10); mouth.rotation.x = Math.PI / 2; mouth.position.set(0, 1.4, 0.06); tube.add(mouth);
    const cap = cyl(0.05, 0.05, 0.03, '#a8843a', 10); cap.rotation.x = Math.PI / 2; cap.position.set(0, 1.4, 0.13); tube.add(cap); add(G, tube, 3.85, 0.4, -1.0, -Math.PI / 2);
    const rtab = new THREE.Group(); const rtt = cyl(0.3, 0.3, 0.04, WAL, 14); rtt.position.y = 0.7; rtab.add(rtt, cyl(0.04, 0.12, 0.7, WAL, 8)); const rbox = box(0.3, 0.16, 0.2, '#5a3a22', 0.02); rbox.position.y = 0.74; rtab.add(rbox);
    const rl = sign('RENT', 0.2, 0.07, '#5a3a22', GOLD, 0.8); rl.position.set(0, 0.82, 0.102); rtab.add(rl); add(G, rtab, 3.2, 0, -0.6);
    const coin = cyl(0.04, 0.04, 0.01, GOLD, 10); coin.visible = false; add(G, coin, 3.2, 0.9, -0.6);
    const rack = new THREE.Group(); rack.add(cyl(0.2, 0.22, 0.04, WAL, 10)); rack.add(cyl(0.025, 0.025, 1.8, WAL, 6)); for (let i = 0; i < 4; i++) { const pg = cyl(0.015, 0.015, 0.2, GOLD, 5); pg.rotation.z = 1.0; pg.position.set(Math.cos(i * 1.57) * 0.08, 1.65, Math.sin(i * 1.57) * 0.08); pg.rotation.y = i * 1.57; rack.add(pg); }
    const bowler = new THREE.Group(); const crown = ball(0.12, '#1a1616', 10); crown.scale.y = 0.75; bowler.add(crown); const brim = cyl(0.17, 0.17, 0.015, '#1a1616', 14); bowler.add(brim); bowler.position.y = 1.82; rack.add(bowler);
    eyes(A, rack, [[-0.04, 1.55, 0.03], [0.04, 1.55, 0.03]], 0.025); add(G, rack, -3.4, 0, -2.5);
    const ptab = new THREE.Group(); const pt = cyl(0.35, 0.35, 0.04, '#5a3a22', 14); pt.position.y = 0.7; ptab.add(pt, cyl(0.04, 0.15, 0.7, WAL, 8)); const clothT = cyl(0.37, 0.4, 0.2, OX, 14); clothT.position.y = 0.52; ptab.add(clothT);
    const stereo = new THREE.Group(); const hood = box(0.18, 0.08, 0.1, WAL, 0.02); stereo.add(hood); const stick = box(0.03, 0.02, 0.3, '#5a3a22', 0.005); stick.position.set(0, 0.02, 0.18); stereo.add(stick); const card = box(0.18, 0.09, 0.005, TAN, 0.002); card.position.set(0, 0.03, 0.32); stereo.add(card);
    stereo.position.y = 0.74; ptab.add(stereo); add(G, ptab, -0.6, 0, -0.6);
    const vict = { rent: 0, play: 0 }; A.wolfSpot = [0.6, 1.6]; A.anim = []; A.proc = []; A.view = { look: -0.45 };
    A.setAir = () => { vict.rent = 0; billO.visible = false; coin.visible = false; cushion.position.y = 0.6; };
    A.onEnter = () => say([['A VOICE (speaking tube)', 'Landlord says no visitors.'], ['A VOICE', 'I\'m the landlord. Since you\'re in: it\'s rent day. Find the rent.']]);
    A.tick = (dt, t) => { flames.forEach((f, i) => f.material.emissiveIntensity = 0.55 + 0.08 * Math.sin(t * 9 + i * 2) * Math.sin(t * 2.3)); if (vict.play > 0) { vict.play -= dt; pedals[0].position.y = 0.08 - 0.04 * Math.max(0, Math.sin(t * 8)); pedals[1].position.y = 0.08 - 0.04 * Math.max(0, -Math.sin(t * 8)); }
      notes.forEach((n, i) => { const u = (t * 0.5 + i / 4) % 1; n.position.set(2.2 + Math.sin(u * 6 + i) * 0.3, 1.5 + u * 1.2, -2.3); n.material.opacity = vict.play > 0 ? 1 - u : 0; });
      if (vict.cush > 0) { vict.cush -= dt; cushion.position.y = 0.6 + Math.sin(vict.cush * 6) * 0.08; } };
    A.who = [
      { id: 'vict_settee', label: 'SETTEE', o: sett, talk: () => { vict.cush = 1; if (vict.rent === 0) { vict.rent = 1; return [['', 'Under the cushion: one gold coin. Dated 1889.'], ['SETTEE', 'That\'s been tickling me for a hundred years. Thank you.'], ['', 'RENT DAY 1/3']]; } return [['SETTEE', 'I\'m horsehair inside. Not the statue\'s. Different horse.']]; } },
      { id: 'vict_organ', label: 'PUMP ORGAN', o: organ, talk: () => { vict.play = 3.5; if (vict.rent === 1) { vict.rent = 2; billO.visible = true; return [['', 'You pump the pedals. Something wheezes out of the pipes: a folded bill.'], ['PUMP ORGAN', 'HARMONIA PARLOR ORGAN CO. I play one hymn and it\'s an invoice.'], ['', 'RENT DAY 2/3']]; } return [['PUMP ORGAN', 'Wheeeze-hum. Wheeeze-hum.'], ['PUMP ORGAN', 'I know one song. It\'s called "Is That The Landlord".']]; } },
      { id: 'vict_rent', label: 'RENT BOX', o: rtab, talk: () => { if (vict.rent === 2) { vict.rent = 3; coin.visible = true; return [['', 'Coin and bill, into the rent box. Clink.'], ['A VOICE (speaking tube)', 'Received. Rent is paid until 1890.'], ['A VOICE', 'Which is when I say it is.'], ['', 'RENT DAY: done. (3/3)']]; } return vict.rent >= 3 ? [['RENT BOX', 'Full. Well. One coin. For me that\'s full.']] : [['RENT BOX', 'Empty. The coin\'s somewhere soft. The bill\'s somewhere musical.']]; } },
      { id: 'vict_tube', label: 'SPEAKING TUBE', o: tube, talk: () => [['', 'You pull the whistle cap and blow. Fweeeet.'], ['A VOICE', 'Yes?'], ['WOLF', 'Where are you?'], ['A VOICE', 'Downstairs. Or upstairs. The tube goes both ways. I\'m the landlord of both.']] },
      { id: 'vict_stereo', label: 'STEREOSCOPE', o: stereo, talk: () => [['', 'Two photos of the same horse, side by side. You look through the hood.'], ['', 'It pops out in 3-D: the horse statue, 1889.'], ['STEREOSCOPE', 'It was already a statue then. Nobody remembers when it wasn\'t.']] },
      { id: 'vict_rack', label: 'HAT RACK', o: rack, talk: () => [['HAT RACK', 'One bowler. Nobody\'s. It came with the flat.'], ['HAT RACK', 'I give it back to whoever owns it. Nobody owns it. I keep giving.']] },
    ];
    playhouse(A);
  };

  // ---------------------------------------------------------------- MOTH: a 1974 rental den (#4, the sage clapboard on the apartment row)
  // Walnut-grain panelling, one harvest-gold wall with an orange/brown supergraphic, avocado shag, a brown plaid sofa, a macramé owl, a lava lamp, a CB radio on a TV tray,
  // the SUN-O-CAB roof light and meter by the door, and the porch-light switch. Moth (he) drifts toward whatever lamp is on.
  // Chore: CLOCK IN (porch light off, unplug the lava lamp, hand him the cab keys).
  R.moth = async (G, A) => {
    const GOLD = '#d9a62a', AVO = '#7a8a3a', BRN = '#5a3a1e', ORG = '#d9682a', SAGE = '#a8b89a', CREAM = '#efe2c0';
    const [moth] = await Promise.all([glb('town2/moth_lo.glb', 1.5, 'moth', { rest: 'breathe' })]);
    const panel = (g, w, h) => { for (let x = 0, i = 0; x < w; x += 24, i++) { g.fillStyle = ['#6a4426', '#5e3c20', '#73492a'][i % 3]; g.fillRect(x, 0, 24, h); g.fillStyle = '#3a2412'; g.fillRect(x, 0, 2, h); g.strokeStyle = 'rgba(40,20,8,0.35)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + 6 + k * 6, 0); g.bezierCurveTo(x + 2 + k * 6, h * 0.3, x + 12 + k * 6, h * 0.6, x + 6 + k * 6, h); g.stroke(); } } };
    const gold = (g, w, h) => { g.fillStyle = GOLD; g.fillRect(0, 0, w, h); const bands = [ORG, BRN, '#b8541e']; bands.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 26; g.beginPath(); g.moveTo(-20, h * 0.85 - i * 30); g.lineTo(w * 0.55, h * 0.85 - i * 30); g.arc(w * 0.55, h * 0.85 - i * 30 - 120, 120, Math.PI / 2, 0, true); g.lineTo(w * 0.55 + 120, -20); g.stroke(); }); };
    realRoom(G, { H,
      floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = AVO; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.strokeStyle = ['#6a7a2e', '#8a9a46', '#5e6c28', '#9aa856'][i % 4]; g.lineWidth = 2; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 6, y - 5); g.stroke(); } }, 4, 3, 0.3),
      back: cvTex(1024, 256, gold), left: cvTex(512, 256, panel), right: cvTex(512, 256, panel),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#f2ead8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 2, 2), cy: [3.25, 3.4], cz: 4.6, ceilGlow: 0.3 });
    // sofa (brown/orange plaid), coffee table, shag-top ottoman
    const plaid = cvTex(128, 128, (g, w, h) => { g.fillStyle = BRN; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(217,104,42,0.6)'; for (let k = 0; k < w; k += 32) { g.fillRect(k, 0, 10, h); g.fillRect(0, k, w, 10); } g.fillStyle = 'rgba(217,166,42,0.5)'; for (let k = 16; k < w; k += 32) { g.fillRect(k, 0, 3, h); g.fillRect(0, k, w, 3); } }, 2, 1);
    const sofa = new THREE.Group(); const sb = box(2.2, 0.45, 0.85, BRN, 0.08); sofa.add(sb); const sback = box(2.2, 0.55, 0.22, BRN, 0.1); sback.position.set(0, 0.45, -0.32); sofa.add(sback);
    for (const s of [-1, 1]) { const ar = box(0.25, 0.65, 0.85, BRN, 0.1); ar.position.x = s * 1.05; sofa.add(ar); }
    for (const m of [sb, sback]) m.material = texMat(plaid); add(G, sofa, -1.0, 0, -2.4);
    const ctab = box(1.1, 0.35, 0.55, '#3a2412', 0.04); add(G, ctab, -1.0, 0, -1.3);
    const keys = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 10), feltMat(GOLD)); ring.rotation.x = Math.PI / 2; keys.add(ring); const tag = box(0.08, 0.01, 0.05, ORG, 0.005); tag.position.set(0.07, 0, 0); keys.add(tag); add(G, keys, -0.8, 0.36, -1.3);
    // lava lamp (glow + three moving blobs) on an end table
    add(G, box(0.5, 0.55, 0.5, '#3a2412', 0.03), -2.6, 0, -2.5);
    const lava = new THREE.Group(); const lb = cyl(0.1, 0.07, 0.15, GOLD, 10); lava.add(lb); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.42, 12), glowM('#e8582a', 0.55)); glass.position.y = 0.36; lava.add(glass);
    const blobs = [0, 1, 2].map(i => { const b = glowBall(0.035 + i * 0.008, '#ffd04a', 0.9, 8); lava.add(b); return b; }); add(G, lava, -2.6, 0.55, -2.5); const lavaL = lampLight(G, '#ff8a4a', -2.6, 1.0, -2.3, 0.6, 3);
    // macramé owl wall hanging (felt cords + beads)
    const owl = new THREE.Group(); const dow = cyl(0.01, 0.01, 0.5, '#8a6a3a', 5); dow.rotation.z = Math.PI / 2; dow.position.set(0.25, 0, 0); owl.add(dow);
    for (let i = 0; i < 7; i++) { const c = cyl(0.008, 0.008, 0.55 + (i % 3) * 0.1, CREAM, 4); c.position.set(-0.18 + i * 0.06, -0.6 - (i % 3) * 0.1, 0); owl.add(c); }
    const body = ball(0.16, CREAM, 10); body.scale.set(1, 1.2, 0.3); body.position.y = -0.3; owl.add(body); eyes(A, owl, [[-0.06, -0.22, 0.05], [0.06, -0.22, 0.05]], 0.05); add(G, owl, -1.0, 2.55, -2.95);
    // CB radio on a TV tray, wood-grain console TV
    const tray = new THREE.Group(); tray.add(box(0.5, 0.03, 0.35, ORG, 0.01)); tray.children[0].position.y = 0.7; for (const s of [-1, 1]) { const lg = cyl(0.01, 0.01, 0.72, GOLD, 4); lg.rotation.z = s * 0.25; lg.position.x = s * 0.06; tray.add(lg); }
    const cb = new THREE.Group(); cb.add(box(0.32, 0.1, 0.24, '#2a2a2a', 0.01)); const cbf = sign('CB · CH 19', 0.28, 0.07, '#1a1a1a', '#f2b632', 0.7); cbf.position.set(0, 0.05, 0.121); cb.add(cbf); const mic = box(0.06, 0.09, 0.04, '#2a2a2a', 0.02); mic.position.set(0.22, 0.04, 0.05); cb.add(mic);
    const ant = cyl(0.004, 0.004, 0.5, '#9a9a9a', 4); ant.position.set(-0.12, 0.1, -0.08); cb.add(ant); cb.position.y = 0.73; tray.add(cb); add(G, tray, 1.0, 0, -2.4);
    const tv = new THREE.Group(); tv.add(box(1.0, 0.75, 0.5, '#6a4426', 0.05)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), glowM('#4a5a5a', 0.15)); scr.position.set(-0.12, 0.42, 0.252); tv.add(scr); add(G, tv, 2.4, 0, -2.6, -0.3);
    // door wall (right): door, porch-light switch, SUN-O-CAB roof light on a hook, meter on the side table
    const door = box(0.95, 2.1, 0.08, '#4a2e18', 0.02); add(G, door, 3.92, 0, -0.9, -Math.PI / 2);
    const sw = new THREE.Group(); sw.add(box(0.1, 0.16, 0.02, CREAM, 0.01)); const tog = box(0.025, 0.05, 0.03, CREAM, 0.008); tog.position.set(0, 0.1, 0.02); sw.add(tog); const swl = sign('PORCH', 0.14, 0.05, CREAM, BRN, 0.8); swl.position.set(0, 0.22, 0.012); sw.add(swl); add(G, sw, 3.93, 1.1, 0.0, -Math.PI / 2);
    const cab = new THREE.Group(); cab.add(box(0.5, 0.18, 0.18, '#f2c230', 0.05)); const cabS = sign('SUN-O-CAB', 0.46, 0.12, '#f2c230', '#1a1616', 0.7); cabS.position.set(0, 0.09, 0.092); cab.add(cabS); add(G, cab, 3.4, 0, -2.6, -0.4);
    const meter = new THREE.Group(); meter.add(box(0.22, 0.18, 0.12, '#2a2a2a', 0.02)); const mr = sign('$0.00', 0.18, 0.06, '#1a1a1a', '#e8582a', 0.8); mr.position.set(0, 0.11, 0.061); meter.add(mr); add(G, meter, 3.4, 0.18, -2.6, -0.4);
    // porch light glow (seen through the little door window)
    const porch = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), glowM('#fff0a0', 1.2)); add(G, porch, 3.88, 1.8, -0.9, -Math.PI / 2);
    at(moth, 0.6, 0, -1.6, 0.2); G.add(moth);
    const lit = { porch: true, lava: true, keys: false, step: 0 };
    A.wolfSpot = [0.2, 1.6]; A.anim = []; A.proc = [moth]; A.view = { look: -0.45 };
    const reset = () => { Object.assign(lit, { porch: true, lava: true, keys: false, step: 0 }); keys.visible = true; tog.position.y = 0.1; porch.material.emissiveIntensity = 1.2; glass.material.emissiveIntensity = 0.55; lavaL.intensity = 0.6; blobs.forEach(b => b.visible = true); moth.position.set(0.6, 0, -1.6); };
    A.setAir = reset;
    A.onEnter = () => say([['MOTH', 'Can\'t come out. Porch light\'s on. You understand.'], ['MOTH', 'Need a ride? I\'m the ride. Help me get to work: lights off, keys.']]);
    const goal = new THREE.Vector3();
    A.tick = (dt, t) => { blobs.forEach((b, i) => { b.position.set(Math.sin(t * 0.3 + i) * 0.02, 0.2 + 0.32 * (0.5 + 0.5 * Math.sin(t * (0.25 + i * 0.07) + i * 2)), Math.cos(t * 0.4 + i) * 0.02); });
      // he drifts toward a lit lamp (porch first, then the lava lamp), or toward the door when he's on shift
      if (lit.step >= 3) goal.set(3.2, 0, -0.9); else if (lit.porch) goal.set(3.1 + Math.sin(t * 0.8) * 0.15, 0, -0.4); else if (lit.lava) goal.set(-1.9 + Math.sin(t * 0.9) * 0.15, 0, -1.7); else goal.set(0.6, 0, -1.6);
      moth.position.lerp(goal, Math.min(1, dt * 0.6)); moth.rotation.y += (Math.atan2(goal.x - moth.position.x, goal.z - moth.position.z + 0.6) * 0.5 - moth.rotation.y) * Math.min(1, dt * 2);
      scr.material.emissiveIntensity = 0.12 + 0.05 * Math.sin(t * 11) * Math.sin(t * 3); };
    const CB = [[['CB RADIO', 'Breaker one-nine, this is Felt Trucker. Anybody seen the horse?'], ['CB RADIO', 'Ten-four, it\'s in the square. It\'s always in the square.']],
      [['CB RADIO', 'This is Big Al. Store closes at two. Repeat, two. Over.'], ['CB RADIO', 'It\'s two-fifteen, Al.'], ['CB RADIO', '...Over.']], [['CB RADIO', 'SUN-O-CAB, come in. Fare at the diner, wants to go to the diner.'], ['MOTH', 'That\'s my favourite kind of fare.']]];
    let cbi = 0;
    A.who = [
      { id: 'moth_switch', label: 'PORCH SWITCH', o: sw, talk: () => { if (lit.porch) { lit.porch = false; lit.step = Math.max(lit.step, 1); tog.position.y = 0.05; porch.material.emissiveIntensity = 0; return [['', 'Click. The porch light goes out. (CLOCK IN 1/3)'], ['MOTH', 'Oh. Oh, I can think again.'], ['MOTH', 'Except... the lava lamp.']]; } return [['', 'The porch light stays off. He has to work.']]; } },
      { id: 'moth_lava', label: 'LAVA LAMP', o: lava, talk: () => { if (lit.lava && !lit.porch) { lit.lava = false; lit.step = Math.max(lit.step, 2); glass.material.emissiveIntensity = 0.05; lavaL.intensity = 0; blobs.forEach(b => b.visible = false); return [['', 'You unplug the lava lamp. The blobs slump. (CLOCK IN 2/3)'], ['LAVA LAMP', 'Fine. I\'ll be a vase.'], ['MOTH', 'Free! Keys are on the table.']]; }
        return lit.lava ? [['LAVA LAMP', 'Bloop. Bloop. I\'m mesmerising. Ask him.'], ['MOTH', '(staring at the porch light) One lamp at a time.']] : [['LAVA LAMP', 'Vase mode. Don\'t talk to me.']]; } },
      { id: 'moth_keys', label: 'CAB KEYS', o: keys, talk: () => { if (lit.step === 2) { lit.step = 3; keys.visible = false; return [['', 'You hand Moth the SUN-O-CAB keys. (CLOCK IN 3/3)'], ['MOTH', 'Meter\'s running. Where to? Everywhere\'s close.'], ['MOTH', 'If I swerve at a streetlight, grab the wheel.']]; } return lit.step >= 3 ? [['', 'He\'s got them.']] : [['MOTH', 'Not yet. Can\'t drive with a lamp on. I\'ll just drive at it.']]; } },
      { id: 'moth_cb', label: 'CB RADIO', o: cb, talk: () => CB[cbi++ % CB.length] },
      { id: 'moth_owl', label: 'MACRAMÉ OWL', o: owl, talk: () => [['MACRAMÉ OWL', 'I was knotted in 1974. I\'ve been watching the shag grow since.'], ['MACRAMÉ OWL', 'Moths and owls. We have a history. He\'s fine. I\'m string.']] },
      { id: 'moth', label: 'MOTH', o: moth, talk: () => lit.step >= 3 ? [['MOTH', 'Clocked in. SUN-O-CAB, the only cab. Hop in any time it\'s dark.']] : [['MOTH', 'Sixteen years driving. Not one fare. People flag me and I just go to their porch light.'], ['MOTH', 'I\'m very punctual for porches.']] },
    ];
    playhouse(A);
  };

  // ---------------------------------------------------------------- APT_PINK: a 1956 Miami-Modern efficiency (#6, the pink stucco with the bay)
  // Pink-and-cream terrazzo, flamingo-pink kitchenette with a cream counter, a turquoise accent wall with a starburst clock, a boomerang-pattern dinette,
  // a bay window seat with venetian blinds, a flamingo lamp, a blonde hi-fi console. Nobody you can see lives here; SOMEONE talks from behind the bedroom door.
  // Chore: SORT THE MAIL (four letters, all for the wrong name).
  R.apt_pink = async (G, A) => {
    const PINK = '#f2a6b8', PINK2 = '#e88aa2', CREAM = '#f6ecd8', TURQ = '#4ab8b0', GREY = '#c9cdd0', BLOND = '#d9b880', INK = '#2a2440';
    const pinkWall = (g, w, h) => { g.fillStyle = PINK; g.fillRect(0, 0, w, h); g.fillStyle = CREAM; g.fillRect(0, yy(h, 0.12), w, h); g.fillStyle = PINK2; g.fillRect(0, yy(h, 0.14), w, 4); };
    realRoom(G, { H,
      floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#f2e2dc'; g.fillRect(0, 0, w, h); const C = [PINK2, '#c9cdd0', '#8a8a92', '#f6f0e6', TURQ]; for (let i = 0; i < 1400; i++) { g.fillStyle = C[i % 5]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); } g.fillStyle = '#d9c8b8'; for (let k = 0; k < w; k += 128) { g.fillRect(k, 0, 2, h); g.fillRect(0, k, w, 2); } }, 3, 2.4),
      back: cvTex(1024, 256, (g, w, h) => { pinkWall(g, w, h); g.fillStyle = TURQ; g.fillRect(w * 0.36, 0, w * 0.3, yy(h, 0.14)); }), left: cvTex(512, 256, pinkWall), right: cvTex(512, 256, pinkWall),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#fbf4ea'; g.fillRect(0, 0, w, h); }, 1, 1), cy: [3.2, 3.4], cz: 4.6, ceilGlow: 0.45 });
    // kitchenette (left back): flamingo cabinets, cream counter, a little round-shouldered fridge, a pale-grey range hood
    add(G, box(2.0, 0.9, 0.6, PINK2, 0.04), -2.6, 0, -2.65); add(G, box(2.1, 0.05, 0.65, CREAM, 0.02), -2.6, 0.9, -2.65); add(G, box(2.0, 0.6, 0.34, PINK2, 0.04), -2.6, 1.75, -2.8);
    for (let i = 0; i < 4; i++) add(G, box(0.06, 0.03, 0.03, GREY, 0.01), -3.35 + i * 0.5, 0.7, -2.33);
    const fr = new THREE.Group(); fr.add(box(0.75, 1.55, 0.65, CREAM, 0.16)); const fh = box(0.05, 0.3, 0.05, GREY, 0.02); fh.position.set(0.3, 1.0, 0.33); fr.add(fh); const fb = sign('FRIGI-PALM', 0.4, 0.08, CREAM, PINK2, 0.8); fb.position.set(0, 1.42, 0.326); fr.add(fb); add(G, fr, -1.2, 0, -2.6);
    // starburst clock on the turquoise wall
    const clock = new THREE.Group(); clock.add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), feltMat(CREAM))); for (let i = 0; i < 12; i++) { const r = box(0.02, 0.32, 0.01, '#c9a24a', 0.005); r.rotation.z = i * Math.PI / 6; r.position.set(0, 0, -0.005); r.geometry.translate(0, 0.08, 0); clock.add(r); }
    const hand = box(0.012, 0.12, 0.01, INK, 0.003); hand.position.z = 0.01; clock.add(hand); add(G, clock, 0.05, 2.45, -2.96);
    // bay window seat (centre-right): three angled panes with venetian blinds, cushion, a stack of throw pillows
    const view = cvTex(128, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7ac8e8'); gr.addColorStop(1, '#e8f4f0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = PINK; g.fillRect(10, h * 0.45, 50, h); g.fillStyle = '#f6d0a0'; g.fillRect(70, h * 0.55, 50, h); g.fillStyle = '#3a8a4a'; g.beginPath(); g.arc(64, h * 0.38, 18, 0, 7); g.fill(); g.fillRect(62, h * 0.38, 4, h); });
    const slats = []; const BX = 1.6;
    for (const [dx, ry, dz] of [[-0.85, 0.55, 0.22], [0, 0, 0], [0.85, -0.55, 0.22]]) { wallPane(G, 0.75, 1.5, view, BX + dx, 1.75, -2.95 + dz, ry, 0.35);
      const bl = new THREE.Group(); for (let k = 0; k < 12; k++) { const sl = box(0.74, 0.012, 0.11, CREAM, 0.004); sl.position.y = 2.45 - k * 0.12; sl.rotation.x = 1.35; bl.add(sl); slats.push(sl); } at(bl, BX + dx, 0, -2.88 + dz, ry); bl.position.z += 0.02; G.add(bl); }
    const seat = box(2.4, 0.5, 0.6, CREAM, 0.05); add(G, seat, BX, 0, -2.55); const cush = box(2.3, 0.1, 0.55, TURQ, 0.04); add(G, cush, BX, 0.5, -2.55);
    for (const [x, c] of [[-0.7, PINK2], [0.75, '#f2c230']]) { const pl = box(0.35, 0.3, 0.12, c, 0.06); add(G, pl, BX + x, 0.6, -2.7, x * 0.3); }
    // boomerang dinette: kidney top with the boomerang print, pale-grey legs, two vinyl chairs; the mail pile on top
    const boomT = cvTex(256, 128, (g, w, h) => { g.fillStyle = '#f6ecd8'; g.fillRect(0, 0, w, h); const C = [PINK2, TURQ, '#c9a24a', '#8a8a92']; for (let i = 0; i < 40; i++) { g.save(); g.translate((i * 53) % w, (i * 31) % h); g.rotate(i); g.strokeStyle = C[i % 4]; g.lineWidth = 4; g.beginPath(); g.moveTo(-12, 6); g.lineTo(0, -4); g.lineTo(12, 6); g.stroke(); g.restore(); } });
    const tbl = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 24), texMat(boomT)); top.scale.z = 0.62; top.position.y = 0.74; tbl.add(top); tbl.add(cyl(0.03, 0.03, 0.74, GREY, 6)); tbl.add(cyl(0.25, 0.25, 0.02, GREY, 14)); add(G, tbl, -1.0, 0, -0.9);
    for (const s of [-1, 1]) { const ch = new THREE.Group(); const st = box(0.42, 0.08, 0.42, TURQ, 0.04); st.position.y = 0.45; ch.add(st, cyl(0.02, 0.02, 0.45, GREY, 5)); const cb = box(0.42, 0.38, 0.06, TURQ, 0.04); cb.position.set(0, 0.55, -0.2); ch.add(cb); add(G, ch, -1.0 + s * 0.85, 0, -0.9, -s * Math.PI / 2); }
    const NAMES = [['MR. R. FLAMINGO', 'Apartment 6.', 'This is apartment 6. Nobody here is a Mr. Flamingo. Probably.'], ['OCCUPANT', 'Apartment 9.', 'There is no apartment 9. There\'s a 6. Upside down.'], ['THE HORSE', 'c/o The Town Square', 'It\'s a bill. The horse owes eleven cents.'], ['SOMEONE ELSE', 'Apt. 6, Sunspots', 'Close. Very close. Still not SOMEONE.']];
    const mail = new THREE.Group(); const letters = NAMES.map((_, i) => { const l = box(0.22, 0.012, 0.13, ['#f6f0e6', '#e8d8f0', '#f2e0a8', '#dff0f0'][i], 0.003); l.position.set((i % 2) * 0.03, 0.012 * i, (i % 3) * 0.02); l.rotation.y = i * 0.3; mail.add(l); return l; }); add(G, mail, -1.0, 0.76, -0.9);
    const tray = box(0.3, 0.06, 0.2, PINK2, 0.02); add(G, tray, -2.1, 0.92, -2.55); const trayL = sign('RETURN TO SENDER', 0.28, 0.05, PINK2, CREAM, 0.8); trayL.position.set(-2.1, 0.96, -2.44); G.add(trayL);
    // flamingo lamp (pink felt bird base, one leg, fringed shade) + blonde hi-fi with a turntable
    const flam = new THREE.Group(); flam.add(cyl(0.12, 0.14, 0.03, CREAM, 12)); const lg = cyl(0.012, 0.012, 0.5, PINK2, 5); flam.add(lg); const fbody = ball(0.12, PINK, 10); fbody.scale.set(1.3, 0.8, 0.7); fbody.position.y = 0.55; flam.add(fbody);
    const nk = cyl(0.025, 0.02, 0.35, PINK, 6); nk.position.set(0.12, 0.6, 0); nk.rotation.z = -0.3; flam.add(nk); const fhd = ball(0.05, PINK, 8); fhd.position.set(0.2, 0.95, 0); flam.add(fhd);
    const lshade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.24, 10), glowM('#fbe6c8', 0.5)); lshade.position.y = 1.2; flam.add(lshade); eyes(A, flam, [[0.22, 0.97, 0.04]], 0.018);
    add(G, box(0.5, 0.5, 0.45, BLOND, 0.03), -3.4, 0, -0.4); add(G, flam, -3.4, 0.5, -0.4, 0.6); lampLight(G, '#ffd8c8', -3.3, 1.9, -0.4, 0.45, 3.5);
    const hifi = new THREE.Group(); hifi.add(box(1.4, 0.7, 0.5, BLOND, 0.04)); for (const s of [-1, 1]) { const sp = box(0.45, 0.4, 0.01, '#8a6a4a', 0.01); sp.position.set(s * 0.42, 0.15, 0.25); hifi.add(sp); }
    const lid = box(0.6, 0.02, 0.45, BLOND, 0.01); lid.position.set(0, 0.7, 0); hifi.add(lid); const plat = cyl(0.17, 0.17, 0.02, '#1a1616', 16); plat.position.y = 0.72; hifi.add(plat);
    const label = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), feltMat(PINK2)); label.rotation.x = -Math.PI / 2; label.position.set(0.06, 0.012, 0); plat.add(label); for (let i = 0; i < 4; i++) { const ft = cyl(0.015, 0.008, 0.18, '#3a2a1a', 4); ft.position.set((i % 2 ? 0.6 : -0.6), -0.18, (i < 2 ? 0.2 : -0.2)); hifi.add(ft); }
    hifi.position.y = 0.18; add(G, hifi, 3.25, 0.18, -1.3, -Math.PI / 2);
    const bdoor = box(0.85, 2.05, 0.06, CREAM, 0.02); add(G, bdoor, -3.92, 0, -1.9, Math.PI / 2); const knob = ball(0.035, '#c9a24a', 8); add(G, knob, -3.86, 1.0, -1.6);
    const pk = { mail: 0, rec: 0, open: false, spin: 0 }; A.wolfSpot = [0.4, 1.6]; A.anim = []; A.proc = []; A.view = { look: -0.45 };
    A.setAir = () => { pk.mail = 0; letters.forEach(l => l.visible = true); pk.open = false; slats.forEach(s => s.rotation.x = 1.35); };
    A.onEnter = () => say([['SOMEONE (behind the bedroom door)', 'Wrong apartment.'], ['SOMEONE', 'They\'re all the wrong apartment. Since you\'re here, sort the mail?']]);
    A.tick = (dt, t) => { hand.rotation.z = -t * 0.3; if (pk.spin > 0) { pk.spin -= dt; plat.rotation.y -= dt * 3.5; } const want = pk.open ? 0.15 : 1.35; for (const sl of slats) sl.rotation.x += (want - sl.rotation.x) * Math.min(1, dt * 4); };
    const RECS = [['"Mambo for a Flamingo" — CORAL TONE RECORDS', [['HI-FI', 'Cha-cha-cha. That\'s the whole lyric. It\'s a hit.']]], ['"Moonlight Over the Motel" — PALMETTO HI-FI', [['HI-FI', 'Ooo-ooo. A slow one. SOMEONE always plays this one twice.']]], ['"Sounds of the Sun, Vol. 2" — SOLARIA', [['HI-FI', 'Side two is just a sunny afternoon. Forty minutes. Nothing happens.'], ['SOMEONE', 'My favourite part is the nothing.']]]];
    A.who = [
      { id: 'pink_mail', label: 'THE MAIL', o: mail, talk: () => { if (pk.mail < 4) { const [to, addr, joke] = NAMES[pk.mail]; letters[3 - pk.mail].visible = false; pk.mail++; return [['', `Letter ${pk.mail}: "${to}, ${addr}"`], ['SOMEONE', 'Not me.'], ['', joke + ' Into RETURN TO SENDER. (SORT THE MAIL ' + pk.mail + '/4)'], ...(pk.mail === 4 ? [['SOMEONE', 'All wrong. Perfect. Same as yesterday.'], ['', 'SORT THE MAIL: done.']] : [])]; } return [['', 'Nothing left on the table. The mailman will bring four more wrong ones tomorrow.']]; } },
      { id: 'pink_hifi', label: 'HI-FI', o: hifi, talk: () => { const r = RECS[pk.rec++ % RECS.length]; pk.spin = 6; return [['', 'You drop the needle: ' + r[0] + '.'], ...r[1]]; } },
      { id: 'pink_blinds', label: 'BLINDS', o: slats[14], talk: () => { pk.open = !pk.open; return pk.open ? [['', 'You tilt the blinds open. Sun, palms, the pink building next door.'], ['SOMEONE', 'Close them a little. The neighbours are also wrong.']] : [['', 'Blinds shut. Stripes of light on the terrazzo.']]; } },
      { id: 'pink_lamp', label: 'FLAMINGO LAMP', o: flam, talk: () => [['FLAMINGO LAMP', 'One leg. Since 1956. I\'m not tired. I\'m elegant.'], ['FLAMINGO LAMP', 'The heron down the road stole my look.']] },
      { id: 'pink_door', label: 'BEDROOM DOOR', o: bdoor, talk: () => [['', 'You knock on the bedroom door.'], ['SOMEONE', 'Wrong door.'], ['WOLF', 'Who are you?'], ['SOMEONE', 'Someone. The name on the mailbox is someone else\'s. It works out.']] },
    ];
    playhouse(A);
  };

  // ---------------------------------------------------------------- MANSION: a 2024 hillside glass house (ref vulture_byrd_mansion_01: white planes, charcoal frames, gold LED coves, magenta bougainvillea, dusk)
  // Inside: double-height great room, white plaster, oak floor, gold cove light, a full glass back wall at dusk, a sunken magenta conversation pit, a sculptural perch for the Vulture,
  // a regulation hoop in the "ballroom", a pool table (Larry Byrd's), a newspaper stack (subscription cancelled 1979), an intercom panel.
  R.mansion = async (G, A) => {
    const WHITE = '#f2efe8', CHAR = '#2f3236', OAK = '#c9a47a', GOLD = '#f2c46a', MAG = '#c83a8a', GREEN = '#2f6a4a';
    realRoom(G, { H, W: 9, D: 6.4,
      floor: cvTex(256, 256, (g, w, h) => { for (let y = 0, i = 0; y < h; y += 20, i++) { g.fillStyle = ['#c9a47a', '#bf9a70', '#d2ad84'][i % 3]; g.fillRect(0, y, w, 20); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 1.5); g.fillRect((i * 97) % w, y, 1.5, 20); } }, 3, 2.4),
      back: cvTex(1024, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a4a7a'); gr.addColorStop(0.45, '#e8a86a'); gr.addColorStop(0.62, '#f6d08a'); gr.addColorStop(0.63, '#2a4a3a'); gr.addColorStop(1, '#1e3a2e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#1e3a2e'; for (const x of [120, 300, 760, 900]) { g.fillRect(x, h * 0.35, 5, h * 0.3); for (let k = 0; k < 6; k++) { g.save(); g.translate(x + 2, h * 0.35); g.rotate(-1.4 + k * 0.55); g.fillRect(0, -3, 34, 6); g.restore(); } }
        g.fillStyle = 'rgba(255,240,200,0.8)'; for (let i = 0; i < 18; i++) g.fillRect((i * 151) % w, h * 0.64 + (i * 37) % 30, 3, 3);
        g.fillStyle = CHAR; for (let x = 0; x <= w; x += w / 6) g.fillRect(x - 5, 0, 10, h); g.fillRect(0, h * 0.5, w, 8); g.fillRect(0, h - 22, w, 22); }, 1, 1, 0.3),
      left: cvTex(512, 256, (g, w, h) => { g.fillStyle = WHITE; g.fillRect(0, 0, w, h); g.fillStyle = '#e4dfd4'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 2, h); }), right: cvTex(512, 256, (g, w, h) => { g.fillStyle = WHITE; g.fillRect(0, 0, w, h); g.fillStyle = '#e4dfd4'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 2, h); }),
      ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, w, h); }, 1, 1), cy: [3.35, 3.4], cz: 4.8, ceilGlow: 0.4 });
    // gold LED coves (glow strips) along the top of the side walls and the glass
    for (const [x, z, w, ry] of [[0, -3.12, 9.2, 0], [-4.45, 0, 6.2, Math.PI / 2], [4.45, 0, 6.2, -Math.PI / 2]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), glowM(GOLD, 1.0)); c.position.set(x, 3.25, z); c.rotation.y = ry; G.add(c); }
    // planters with magenta bougainvillea against the glass
    for (const x of [-3.6, 3.6]) { add(G, box(0.9, 0.5, 0.5, CHAR, 0.03), x, 0, -2.85); for (let i = 0; i < 7; i++) { const b = ball(0.16, i % 3 ? MAG : GREEN, 8); add(G, b, x - 0.35 + (i % 4) * 0.23, 0.55 + Math.floor(i / 4) * 0.18, -2.85 + (i % 2) * 0.1); } }
    // sunken conversation pit: a magenta sectional ringing a recessed rug (we read the sink as a darker step)
    const pit = new THREE.Group(); const rug = cyl(1.3, 1.3, 0.02, '#e8d8c8', 24); rug.scale.z = 0.7; pit.add(rug); const step = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.45, 24, 1), feltMat('#a88a6a')); step.rotation.x = -Math.PI / 2; step.scale.y = 0.7; step.position.y = 0.025; pit.add(step);
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175) + Math.PI; const sec = box(0.85, 0.38, 0.55, MAG, 0.1); sec.position.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 0.7); sec.rotation.y = -a - Math.PI / 2; pit.add(sec); }
    const ctab = cyl(0.35, 0.35, 0.3, WHITE, 16); pit.add(ctab); add(G, pit, -1.6, 0, -0.6);
    const papers = new THREE.Group(); for (let i = 0; i < 7; i++) { const pp = box(0.42, 0.06, 0.3, i % 2 ? '#e8e2d2' : '#d8d2c2', 0.01); pp.position.set((i % 3) * 0.02 - 0.02, i * 0.06, 0); pp.rotation.y = (i % 2) * 0.12; papers.add(pp); }
    const head = sign('SUNSPOTS SENTINEL\nSTOP DELIVERY · 1979', 0.42, 0.3, '#e8e2d2', '#2a2440', 0.55); head.rotation.x = -Math.PI / 2; head.position.set(0, 0.43, 0); papers.add(head); add(G, papers, 0.45, 0, -2.6);
    // the hoop (ballroom end, right): charcoal post, glass-look board (pale felt), orange rim, felt net
    const hoop = new THREE.Group(); const post = box(0.14, 3.0, 0.14, CHAR, 0.03); hoop.add(post); const board = box(1.0, 0.65, 0.04, '#e8eef0', 0.02); board.position.set(0, 2.55, 0.25); hoop.add(board);
    const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), feltMat(CHAR)); sq.position.set(0, 2.75, 0.275); hoop.add(sq); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 5, 16), feltMat('#e8582a')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 2.6, 0.5); hoop.add(rim);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.3, 10, 1, true), feltMat('#f6f2ea')); net.position.set(0, 2.45, 0.5); hoop.add(net); add(G, hoop, 3.6, 0, -1.2, -Math.PI / 2 + 0.2);
    const ballB = ball(0.12, '#d9682a', 12); add(G, ballB, 2.2, 0.12, -0.2); const RIMW = new THREE.Vector3(); hoop.updateMatrixWorld(true); rim.getWorldPosition(RIMW);
    // pool table (Larry's), cue ball + 8 ball
    const pool = new THREE.Group(); pool.add(box(1.9, 0.75, 1.05, CHAR, 0.04)); const felt = box(1.75, 0.04, 0.9, GREEN, 0.01); felt.position.y = 0.75; pool.add(felt);
    for (const s of [-1, 1]) { const rl = box(1.9, 0.08, 0.08, CHAR, 0.02); rl.position.set(0, 0.76, s * 0.5); pool.add(rl); }
    const cue = ball(0.04, '#f6f2ea', 8); cue.position.set(-0.5, 0.83, 0); pool.add(cue); const eight = ball(0.04, '#111111', 8); eight.position.set(0.4, 0.83, 0.15); pool.add(eight);
    const stick = cyl(0.012, 0.02, 1.0, '#c9a47a', 6); stick.rotation.z = Math.PI / 2 - 0.08; stick.position.set(-1.05, 0.86, 0); pool.add(stick); add(G, pool, 1.8, 0, -2.2);
    // Larry Byrd at the table; THE VULTURE on a sculptural perch (recoloured: plum robe, grey head, no jersey number)
    const larry = larryByrd(feltMat); larry.scale.setScalar(0.88); add(G, larry, 2.9, 0, -1.9, -0.6);
    const vmap = { '#2f55a8': '#6a2a4a', '#c4473a': '#8a8480', '#f3efe2': '#6a2a4a' }; const vFelt = (c, x) => feltMat(vmap[c] || c, x);
    const vult = larryByrd(vFelt); vult.traverse(o => { if (o.isMesh && o.material?.isMeshBasicMaterial) o.visible = false; }); vult.scale.setScalar(0.82);
    const perch = new THREE.Group(); perch.add(cyl(0.35, 0.4, 0.08, CHAR, 16)); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 24, Math.PI * 1.3), feltMat(GOLD)); arc.position.y = 0.6; arc.rotation.z = -0.4; perch.add(arc);
    const bar = cyl(0.03, 0.03, 0.9, GOLD, 6); bar.rotation.z = Math.PI / 2; bar.position.set(0.45, 1.15, 0); bar.geometry.translate(0, -0.45, 0); perch.add(bar);
    vult.position.set(0, 1.15 - 0.6, 0); perch.add(vult); add(G, perch, -0.75, 0, -2.4, 0.35);
    // intercom panel by the glass (left)
    const icom = new THREE.Group(); icom.add(box(0.2, 0.32, 0.03, CHAR, 0.01)); const ib = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), glowM('#7ad8e8', 0.8)); ib.position.set(0, 0.1, 0.02); icom.add(ib); add(G, icom, -4.38, 1.3, -1.6, Math.PI / 2);
    const mn = { throw: -1, made: 0, tries: 0, bet: 0, pool: -1 }; const BALL0 = new THREE.Vector3(2.2, 1.6, -0.2);
    A.wolfSpot = [0.4, 1.7]; A.anim = []; A.proc = []; A.view = { look: -0.45 };
    A.setAir = () => { mn.throw = -1; mn.pool = -1; eight.visible = true; eight.position.set(0.4, 0.83, 0.15); cue.position.set(-0.5, 0.83, 0); ballB.position.set(2.2, 0.12, -0.2); };
    A.onEnter = () => say([['VULTURE (intercom, from the perch)', 'Larry\'s practising free throws in the ballroom. You may circle. Briefly.'], ['LARRY BYRD', 'Pool. Right here. Bring money. Bring a lot of money.']]);
    const lh = larry.userData.head, vh = vult.userData.head;
    A.tick = (dt, t) => { if (lh) lh.rotation.y = Math.sin(t * 0.7) * 0.4; if (vh) vh.rotation.y = Math.sin(t * 0.25) * 0.6; vult.rotation.z = Math.sin(t * 0.6) * 0.04; perch.rotation.y = 0.35 + Math.sin(t * 0.2) * 0.08;
      ib.material.emissiveIntensity = mn.buzz > 0 ? 0.8 + 0.6 * Math.sin(t * 20) : 0.6; if (mn.buzz > 0) mn.buzz -= dt;
      if (mn.throw >= 0) { mn.throw += dt; const u = Math.min(1, mn.throw / 1.1), end = mn.made ? RIMW : new THREE.Vector3(RIMW.x - 0.1, RIMW.y + 0.05, RIMW.z + 0.35);
        if (u < 1) { ballB.position.lerpVectors(BALL0, end, u); ballB.position.y += Math.sin(u * Math.PI) * 1.2; } else { const d = mn.throw - 1.1; ballB.position.set(end.x + (mn.made ? 0 : d * 0.8), Math.max(0.12, end.y - d * d * 6 - d * 2), end.z + (mn.made ? 0 : d * 0.6)); if (d > 1.4) { mn.throw = -1; ballB.position.set(2.2, 0.12, -0.2); } } }
      if (mn.pool >= 0) { mn.pool += dt; const p = mn.pool; if (p < 0.4) cue.position.x = -0.5 + p * 2.0; else if (p < 1.6) { eight.position.x = 0.4 + (p - 0.4) * 0.38; eight.position.z = 0.15 + (p - 0.4) * 0.22; } else if (mn.bet) eight.visible = false; if (p > 3.5) { mn.pool = -1; eight.visible = true; eight.position.set(0.4, 0.83, 0.15); cue.position.set(-0.5, 0.83, 0); } } };
    A.who = [
      { id: 'man_hoop', label: 'FREE THROW', o: hoop, talk: () => { mn.tries++; mn.made = Math.random() < 0.45 ? 1 : 0; mn.throw = 0; if (mn.made) mn.score = (mn.score || 0) + 1;
        return mn.made ? [['', `Swish. (${mn.score} of ${mn.tries})`], ['LARRY BYRD', 'Beginner\'s luck. In the ballroom. My ballroom.']] : [['', `Off the rim. (${mn.score || 0} of ${mn.tries})`], ['LARRY BYRD', 'Brick. Want to make it interesting? Pool table. Ten dollars.']]; } },
      { id: 'man_pool', label: 'POOL BET', o: pool, talk: () => { mn.bet = 1; mn.pool = 0; return [['LARRY BYRD', 'Eight ball, corner pocket. Three rails. Ten dollars.'], ['', 'Larry shoots. Click. Click-click-click. The eight drops.'], ['LARRY BYRD', 'You owe me ten dollars.'], ['WOLF', 'I never said yes.'], ['LARRY BYRD', 'Never play pool with Larry. Everybody knows that. Now you know that. Ten dollars.']]; } },
      { id: 'man_icom', label: 'INTERCOM', o: icom, talk: () => { mn.buzz = 1.5; return [['', 'Bzzzzt.'], ['VULTURE (intercom)', 'Who is it.'], ['WOLF', 'It\'s me. I\'m inside.'], ['VULTURE (intercom)', 'Then why are you buzzing. Go away from inside.']]; } },
      { id: 'man_papers', label: 'NEWSPAPERS', o: papers, talk: () => [['', 'Seven papers. The SUNSPOTS SENTINEL. The top one says STOP DELIVERY · 1979.'], ['NEWSPAPERS', 'He cancelled us in 1979. They still deliver one a day.'], ['NEWSPAPERS', 'Same headline every day: "SUNNY". Accurate.']] },
      { id: 'man_vult', label: 'VULTURE', o: perch, talk: () => [['VULTURE', 'I built this house in a year. Glass on every side. I like to see things coming.'], ['VULTURE', 'Nothing comes. It\'s very peaceful.'], ['VULTURE', 'Larry pays rent in pool winnings. From you, apparently.']] },
      { id: 'man_larry', label: 'LARRY BYRD', o: larry, talk: () => [['LARRY BYRD', 'Court\'s the court. This is the ballroom. Different rules.'], ['LARRY BYRD', 'In the ballroom, I\'m always up by two.']] },
    ];
    playhouse(A);
  };
  return R;
}
