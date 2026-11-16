// missions/grandma_cat.js — GRANDMA'S CAT (Night 4 headliner). Sunday dinner at Bear's. Grandma stops mid-bite:
// she left DUCHESS shut in the bedroom at her house. With the good china. Two halves, one Sunspot chain:
//  1 THE DRIVE — the mustard waddle car across town at night (DRIVER below: Bear by default, it's his grandma; the Wolf rides shotgun; Grandma in the back with
//    opinions). Drag to steer, FLOOR IT to boost, HONK and the car ahead pulls over. Real traffic lights (run a red and the
//    cross traffic is real too), queues, oncoming cars, people walking their own walks, cat treats on the road.
//    DUCHESS vs THE HOUSE climbs the whole way: the later you get there, the more is already on the floor.
//  2 THE HOUSE — Grandma's 1950s bungalow as a cut-away dollhouse (bedroom, hall, front room, kitchen). Duchess has the
//    zoomies: she paws a knick-knack (it wobbles, "!"), then swats it off. TAP it to catch it before it hits the floor.
//    When she sits to wash (or stops for a TREAT you picked up on the road) TAP HER to scoop her up and end it.
//  Stars: caught Duchess · 3 or fewer broken · 1 or fewer broken and there before the meter passed half. Secret: under the bed.
// Intro clip: playCinematic('grandma_cat_intro') (skips if missing). QA: ?m=grandma_cat [&phase=house] [&mauto] [&unlock]
import * as THREE from 'three';
import { registerMission, hud, CAST, pal, animPal, waddleCar, nightSky, nightLights, felt, glowMat, glowSprite, sign, Merge, VCM, blobShadow, mesh, box, cyl, ball, sfx, clamp, lerp, smooth, rng, pickNear, toScreen, countTris, TAU, M4 } from './kit.js';
import { createDrive } from './drivecore.js';

// OPEN QUESTION for Scott: who drives? One switch: 'bear' (default) or 'wolf'.
const DRIVER_DEFAULT = 'bear';   // <- flip to 'wolf' if Scott says so (QA override: ?driver=wolf)
export const DRIVER = ['bear', 'wolf'].includes(new URLSearchParams(location.search).get('driver')) ? new URLSearchParams(location.search).get('driver') : DRIVER_DEFAULT;
const PAR = 58;   // seconds: arriving before this keeps the meter under half
registerMission({
  id: 'grandma_cat', key: 'gcat', title: "GRANDMA'S CAT", chip: "GRANDMA'S CAT", room: 'living90', night: 4, where: "Bear's house (Sunday)",
  rumour: "Bear's grandma comes over for Sunday dinner. Tonight she keeps checking her watch.",
  todo: "Get Grandma home before Duchess wrecks the house (start at Bear's)", doneMsg: '. Duchess was fine. She always is.',
  video: 'grandma_cat_intro',
  suns: [{ id: 'gc_done', name: "GRANDMA'S CAT", how: "Get Grandma home before her cat wrecks the house" },
    { id: 'gc_star', name: 'NOT A SCRATCH', how: "Three stars at Grandma's" },
    { id: 'gc_mouse', name: 'THE FELT MOUSE', how: "Duchess keeps something under Grandma's bed" }],
  create,
});

function create({ T, S, hud: H }) {
  const scene = new THREE.Scene(); scene.name = "grandma's cat";
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
  scene.fog = new THREE.Fog('#1a1838', 40, 230); scene.background = new THREE.Color('#141634');
  const sky = nightSky(scene, { top: '#0b0d2a', mid: '#251c52', low: '#4a2e5e', glow: '#ff8a5a', dusk: 0.25 });
  const L = nightLights(scene);
  const R = rng(1950);
  // ================================================================== 1. THE DRIVE
  const car = waddleCar('#e7b23a', '#f6efe0', { open: true });
  const crew = { wolf: CAST.wolf(), bear: CAST.bear(), grandma: CAST.grandma() };
  const seat = [[0.36, 0.66, 0.05], [-0.36, 0.66, 0.05], [0.0, 0.7, -0.9]];   // driver, shotgun, back (left-hand drive = +x is the car's left)
  const SC = { wolf: 0.62, bear: 0.66, grandma: 0.6 };
  [crew[DRIVER], crew[DRIVER === 'bear' ? 'wolf' : 'bear'], crew.grandma].forEach((p, i) => { p.scale.setScalar(SC[Object.keys(crew).find((k) => crew[k] === p)]); p.position.set(seat[i][0], seat[i][1], seat[i][2]); p.userData.shadow.visible = false; car.userData.body.add(p); });
  const route = [[150, 0], [70, 55], [170, 0], [60, -70], [190, 8], [80, 60], [150, -10], [60, -30], [90, 0]];
  const D = createDrive(scene, { theme: 'town', route, cross: [140, 330, 520, 700, 860], player: car, cruise: 19, max: 24, boostV: 31, seed: 77, traffic: { same: 9, oncoming: 9, cross: 2 }, peds: 12 });
  const LEN = D.LEN, END = LEN - 26;
  // Grandma's bungalow at the end of the road (right side), porch light on, a cat shadow in the front window
  const bung = new THREE.Group(); { const m = new Merge(); m.box(11, 3.2, 8, '#f6dcc0', 0, 1.6, 4); m.add(roofG(12, 9, 2), '#7a3a3a', M4(0, 3.2, 4)); m.box(3.2, 0.25, 2.2, '#c9b8a0', 0, 0.12, -1.0);
    m.box(1.0, 2.0, 0.08, '#2f6a6a', 0, 1.0, -0.02); for (const x of [-3.4, 3.4]) m.box(1.8, 1.2, 0.08, '#ffd98a', x, 1.7, -0.03); m.cyl(0.1, 0.1, 2.6, '#efe6d6', -1.4, 1.3, -1.8, 6); m.cyl(0.1, 0.1, 2.6, '#efe6d6', 1.4, 1.3, -1.8, 6); m.box(3.4, 0.2, 2.4, '#7a3a3a', 0, 2.65, -0.9);
    for (let k = -4; k <= 4; k++) if (Math.abs(k) > 1) m.box(0.12, 0.8, 0.12, '#efe6d6', k * 1.2, 0.4, -4.2);
    bung.add(m.mesh()); const pl = glowSprite('#ffd9a0', 3, 3, 0.8); pl.position.set(0, 2.4, -1.6); bung.add(pl);
    const s = sign("GRANDMA'S", 1.6, 0.5, { bg: '#f6efe0', fg: '#7a3a3a' }); s.position.set(2.2, 1.0, -4.3); s.rotation.y = Math.PI; bung.add(s);
    const catSh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: catTex(), transparent: true, depthWrite: false })); catSh.position.set(3.4, 1.65, -0.09); catSh.rotation.y = Math.PI; bung.add(catSh); bung.userData.cat = catSh; }
  D.root.add(bung); { D.road.pos(LEN - 14, D.HALF + 12, bung.position); const p = D.road.at(LEN - 14); bung.rotation.y = p.yaw - Math.PI / 2; }
  // road dressing: cat treats (pickups), bins, cones, Officer Fuzz's speed trap, a raccoon crossing
  const treats = [], fish = fishGeo();
  for (const s of [60, 120, 210, 285, 400, 470, 590, 650, 760, 820, 900]) { const x = (R() < 0.5 ? -1 : 1) * (1 + R() * 3.2); const o = new THREE.Mesh(fish, glowMat('#ffb36a')); o.scale.setScalar(1.6); const g = new THREE.Group(); g.add(o); const h = glowSprite('#ffcf8a', 1.6, 1.6, 0.55); g.add(h);
    treats.push(D.add({ s, x, y: 0.7, obj: g, r: 1.8, w: 0.9, air: true, onHit: () => { G.treats++; sfx.pop(); H.toast(`CAT TREAT (${G.treats})`, 1.2); say(['GRANDMA', R.pick(['Ooh, her favourites.', 'Keep those. She can be bought.', 'Good boy. Wolf. Whichever.'])]); }, tick: (dt, t, th) => { th.obj.rotation.y = t * 2; th.obj.position.y = 0.7 + Math.sin(t * 3 + th.s) * 0.15; } })); }
  for (const s of [180, 250, 440, 560, 740, 800, 930]) { const kind = R() < 0.5 ? 'bin' : 'cones'; const g = new THREE.Group(); if (kind === 'bin') { cyl(0.45, 0.4, 1.0, '#5a7a6a', [0, 0.5, 0], g, 10); cyl(0.5, 0.5, 0.1, '#4a6a5a', [0, 1.02, 0], g, 10); } else for (const dx of [-0.9, 0, 0.9]) { cyl(0.05, 0.32, 0.8, '#ff7a3a', [dx, 0.4, 0], g, 8); cyl(0.33, 0.33, 0.05, '#ff7a3a', [dx, 0.03, 0], g, 8); }
    D.add({ s, x: (R() < 0.5 ? 1 : -1) * (1.5 + R() * 2.5), obj: g, solid: true, r: 1.4, w: kind === 'bin' ? 0.5 : 1.3, onHit: () => { sfx.bonk(); say(['GRANDMA', R.pick(['My hip.', 'That was a bin, dear.', 'I felt that in my teeth.'])]); } }); }
  const fuzzCar = waddleCar('#f6efe0', '#2a3a6a', { cop: true }); const fuzz = CAST.fuzz(); fuzz.scale.setScalar(0.55); fuzz.position.set(-0.3, 0.55, 0); fuzz.userData.shadow.visible = false; fuzzCar.userData.body.add(fuzz);
  D.add({ s: 610, x: D.HALF + 1.6, obj: fuzzCar, yaw: Math.PI * 0.85, r: 5, w: 3.5, once: true, onHit: (th, d) => { if (d.P.v > 25) { sfx.horn(); say(['OFFICER FUZZ', "Slow down! It's Sunday!"], ['GRANDMA', "It's an emergency, Gerald."], ['OFFICER FUZZ', 'Oh. Hi, Mrs. B.']); } else say(['OFFICER FUZZ', 'Evening, Mrs. B. Drive safe.'], ['GRANDMA', 'Evening, Gerald.']); } });
  const coon = CAST.reggie(); coon.scale.setScalar(0.8);
  const coonT = D.add({ s: 505, x: -D.HALF - 1, obj: coon, moving: true, solid: false, r: 2, w: 0.6, once: false, onHit: () => { if (!G.coonHit) { G.coonHit = 1; D.P.v *= 0.5; sfx.bonk(); say(['', 'A raccoon crosses with a slice of pie. He takes his time.'], ['GRANDMA', 'Is that my pie?']); } }, tick: (dt, t, th, d) => { if (Math.abs(d.P.s - th.s) < 45) th.x = Math.min(D.HALF + 1, th.x + dt * 1.5); animPal(th.obj, dt, t, { walk: 1 }); th.yaw = -Math.PI / 2; }, reset: (th) => { th.x = -D.HALF - 1; } });

  // ================================================================== 2. THE HOUSE (cut-away dollhouse, placed far from the road)
  const house = new THREE.Group(); house.position.set(5000, 0, 0); house.visible = false; scene.add(house);
  const HL = new THREE.Group(); house.add(HL); { const hm = new THREE.HemisphereLight('#ffe8c8', '#4a3040', 1.15); const k = new THREE.DirectionalLight('#ffe2b8', 1.0); k.position.set(4, 10, 8); k.target.position.set(0, 0, 0); HL.add(hm, k, k.target); }
  const RM = { bed: [-3.6, -2.6], front: [3.6, -2.6], hall: [-3.6, 2.6], kitchen: [3.6, 2.6] };   // 2x2: bedroom | front room / hall | kitchen (back row is -z)
  const WALLH = 1.3, perches = [], items = [];
  { const m = new Merge();
    const floors = { bed: '#c9a47a', front: '#b88f5a', hall: '#d8c7a6', kitchen: '#e8e2cf' }, walls = { bed: '#f2c6c6', front: '#bfe0c8', hall: '#f2e6c0', kitchen: '#c8e0f0' };
    for (const [k, [x, z]] of Object.entries(RM)) { m.box(7.0, 0.1, 5.0, floors[k], x, -0.05, z); if (k === 'kitchen') for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) m.box(0.98, 0.012, 0.98, '#3a7a8a', x - 3 + i, 0.006, z - 2 + j); }
    // outer walls (back tall, sides + front low = dollhouse cut-away) and inner walls with doorways
    m.box(14.2, 2.6, 0.2, '#f2c6c6', 0, 1.3, -5.1); m.box(0.2, WALLH, 10.2, '#f2e6c0', -7.1, WALLH / 2, 0); m.box(0.2, WALLH, 10.2, '#c8e0f0', 7.1, WALLH / 2, 0); m.box(14.2, 0.5, 0.2, '#e8dcc0', 0, 0.25, 5.1);
    m.box(0.2, WALLH, 3.6, '#e0d2b8', 0, WALLH / 2, -3.2); m.box(0.2, WALLH, 3.6, '#e0d2b8', 0, WALLH / 2, 3.2); m.box(2.6, WALLH, 0.2, '#e0d2b8', -5.6, WALLH / 2, 0); m.box(2.6, WALLH, 0.2, '#e0d2b8', 5.6, WALLH / 2, 0); m.box(2.6, WALLH, 0.2, '#e0d2b8', -1.4, WALLH / 2, 0); m.box(2.6, WALLH, 0.2, '#e0d2b8', 1.4, WALLH / 2, 0);
    // wallpaper dots on the back wall (bedroom florals, front room stripes)
    for (let i = 0; i < 22; i++) m.ball(0.07, '#d88aa0', -6.6 + i * 0.3, 1.6 + (i % 3) * 0.3, -4.98, 1, 1, 0.3, 5, 4); for (let i = 0; i < 12; i++) m.box(0.12, 2.4, 0.02, '#a8d0b4', 0.6 + i * 0.55, 1.3, -4.99);
    // BEDROOM: bed (the secret is under it), dresser, nightstand, window + shredded curtains
    m.box(2.2, 0.5, 3.0, '#f6efe0', -5.3, 0.35, -3.2); m.box(2.2, 0.25, 0.9, '#efd0d8', -5.3, 0.7, -4.3); m.box(2.3, 1.0, 0.15, '#7a4e2e', -5.3, 0.5, -4.75); m.box(2.25, 0.08, 2.0, '#c94a6a', -5.3, 0.64, -2.7);
    m.box(1.6, 1.0, 0.6, '#9a6a3a', -2.0, 0.5, -4.6); m.box(0.6, 0.6, 0.5, '#9a6a3a', -3.8, 0.3, -4.6); m.box(1.6, 1.1, 0.05, '#2a2a4a', -2.0, 2.0, -4.98);
    for (let i = 0; i < 6; i++) m.box(0.12, 0.9 - (i % 3) * 0.25, 0.04, '#e88aa0', -2.8 + i * 0.32, 1.9 + (i % 3) * 0.12, -4.92);
    // FRONT ROOM: sofa, TV console, mantel + fireplace, bookshelf, piano
    m.box(2.6, 0.5, 0.9, '#5a8a6a', 2.5, 0.25, -1.3); m.box(2.6, 0.6, 0.25, '#4a7a5a', 2.5, 0.6, -0.95); m.box(1.4, 0.7, 0.6, '#7a4e2e', 6.2, 0.35, -4.4); m.box(0.9, 0.7, 0.5, '#4a4a52', 6.2, 1.05, -4.4);
    m.box(1.8, 1.0, 0.4, '#c9b8a0', 3.2, 0.5, -4.8); m.box(2.1, 0.12, 0.55, '#8a5a3a', 3.2, 1.06, -4.75); m.box(0.8, 0.5, 0.1, '#2a1a1a', 3.2, 0.3, -4.58);
    m.box(1.4, 1.8, 0.4, '#7a4e2e', 0.9, 0.9, -4.75); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) m.box(0.14, 0.38, 0.28, ['#c9302a', '#3a6aa8', '#f2c230', '#2fae8a'][(i + r) % 4], 0.4 + i * 0.2, 0.3 + r * 0.6, -4.72);
    // HALL: coat rack, side table, family photos, the front door
    m.box(1.2, 0.8, 0.5, '#9a6a3a', -2.0, 0.4, 4.6); m.box(0.9, 2.0, 0.1, '#2f6a6a', -6.0, 1.0, 5.02); m.cyl(0.05, 0.05, 1.8, '#5a3a2a', -6.6, 0.9, 1.0, 6);
    m.box(1.8, 0.1, 0.4, '#7a4e2e', -5.6, 1.0, 0.25);
    // KITCHEN: counter run, fridge (rounded 50s), table + chairs, cookie shelf
    m.box(5.0, 0.9, 0.7, '#f6efe0', 4.0, 0.45, 4.6); m.box(5.0, 0.06, 0.75, '#e86a6a', 4.0, 0.92, 4.6); m.box(0.9, 1.9, 0.8, '#bfe6e0', 6.5, 0.95, 1.0); m.box(1.4, 0.06, 1.0, '#e8e2cf', 3.2, 0.75, 2.4); m.cyl(0.06, 0.06, 0.75, '#c9c0b0', 3.2, 0.37, 2.4, 6);
    m.box(1.6, 0.1, 0.35, '#7a4e2e', 2.2, 1.15, 0.25);
    house.add(m.mesh()); }
  const bedHit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 3.0), new THREE.MeshBasicMaterial({ visible: false })); bedHit.position.set(-5.3, 0.35, -3.2); house.add(bedHit);
  const mouse = new THREE.Group(); ball(0.12, '#9a9aa2', [0, 0.1, 0], mouse, 8, 6).scale.set(1, 0.8, 1.5); cyl(0.01, 0.01, 0.3, '#e88aa0', [0, 0.08, -0.25], mouse, 4).rotation.x = 1.3; mouse.position.set(-5.3, 0.02, -2.0); mouse.visible = false; house.add(mouse);
  // perches + knick-knacks: [name, x, y, z, kind, colour]
  const PER = [['CHINA TEACUP', -2.4, 1.02, -4.55, 'cup', '#f6f2e8'], ['PERFUME', -1.6, 1.02, -4.55, 'vase', '#d8a0e8'], ['NIGHT LAMP', -3.8, 0.62, -4.55, 'lamp', '#ffd98a'],
    ['MANTEL CLOCK', 3.2, 1.14, -4.75, 'clock', '#c9a35a'], ['GOOD VASE', 2.5, 1.14, -4.75, 'vase', '#3a8aa8'], ['WEDDING PHOTO', 4.0, 1.14, -4.75, 'frame', '#c9302a'], ['SNOW GLOBE', 1.1, 1.82, -4.75, 'globe', '#bfe6f2'], ['TV ROOSTER', 6.2, 1.42, -4.4, 'rooster', '#e0705a'],
    ['FAMILY PHOTO', -6.1, 1.07, 0.25, 'frame', '#2f8a86'], ['GNOME', -5.1, 1.07, 0.25, 'gnome', '#c9302a'], ['FISH BOWL', -2.0, 0.82, 4.6, 'globe', '#7ad8f2'],
    ['COOKIE JAR', 2.0, 1.22, 0.25, 'jar', '#e8b36a'], ['GRAVY BOAT', 4.6, 0.97, 4.6, 'cup', '#f6efe0'], ['SALT + PEPPER', 3.2, 0.8, 2.4, 'pair', '#efe6d6'], ['GOOD PLATE', 3.4, 0.97, 4.6, 'plate', '#a8d0e8']];
  for (const [name, x, y, z, kind, col] of PER) { const o = knick(kind, col); o.position.set(x, y, z); house.add(o); const it = { name, o, home: new THREE.Vector3(x, y, z), st: 'shelf', t: 0, v: new THREE.Vector3(), floor: 0 }; o.userData.it = it; items.push(it); perches.push({ x, z: z + 0.45, it }); }
  const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.07), felt('#ffffff'), 60); shards.count = 60; const SH = Array.from({ length: 60 }, () => ({ p: new THREE.Vector3(0, -5, 0), v: new THREE.Vector3(), life: 0, c: new THREE.Color() })); let shI = 0; house.add(shards); shards.frustumCulled = false;
  const duchess = catModel(); house.add(duchess); const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 24), new THREE.MeshBasicMaterial({ color: '#ffe1a8', transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; duchess.add(ring);
  const hWolf = CAST.wolf(), hBear = CAST.bear(), hGran = CAST.grandma(); hWolf.scale.setScalar(0.85); hBear.scale.setScalar(0.85); hGran.scale.setScalar(0.8); house.add(hWolf, hBear, hGran);
  const treatObj = new THREE.Mesh(fish, glowMat('#ffb36a')); treatObj.visible = false; house.add(treatObj);

  // ================================================================== state + flow
  const G = { phase: 'off', t: 0, drive: 0, treats: 0, meter: 0, broken: 0, saved: 0, pre: 0, caught: false, mouse: false, coonHit: 0, auto: false, said: {} };
  const inst = { scene, camera, G, D, get phase() { return G.phase; } };
  let ctl = null;
  const say = (...L) => { if (!H.talking()) H.say(L); };
  inst.start = async (c) => {
    ctl = c; G.auto = c.auto; Object.assign(G, { t: 0, drive: 0, treats: 0, meter: 0, broken: 0, saved: 0, pre: 0, caught: false, coonHit: 0, said: {}, swats: 0, sit: 0, tired: 0 });
    D.reset(8, D.W / 4); D.P.obj.visible = true; sky.sky.visible = true; house.visible = false; D.root.visible = true; scene.fog.near = 40; scene.fog.far = 230; scene.background.set('#141634');
    H.pill('clock', 'SUN 8:52 PM'); H.pill('treat', '🐟 0'); H.setMeter(0, 'DUCHESS vs THE HOUSE');
    const b = H.button('boost', 'FLOOR<br>IT'); const hk = H.button('honk', 'HONK', { alt: true }); hk.onDown = honk;
    c.I.onTap = null; c.I.padOn = true;
    if (c.opts.phase === 'house') { G.drive = 40; toHouse(); return; }
    G.phase = 'talk'; camera.fov = 55; D.update(0.016, 0, { x: 0 }); D.resetCam(); D.cam(camera, 1);
    H.say([['GRANDMA', "Duchess. I left Duchess in the bedroom."], ['BEAR', 'With the door shut?'], ['GRANDMA', 'With my good china, dear.'], DRIVER === 'bear' ? ['BEAR', 'Keys. Everybody in. I\'m driving.'] : ['WOLF', 'Get in.']], () => { if (G.phase === 'talk') go(); });
    if (G.auto) setTimeout(() => { if (G.phase === 'talk') { H.subQ = []; H.skipSub(); } }, 600);
  };
  function go() { G.phase = 'count'; G.t = 0; H.hint('3', 0); sfx.tick(); }
  function honk() { sfx.horn(); const P = D.P; let best = null; for (const n of D.npcs) if (n.dir > 0 && n.s - P.s > 3 && n.s - P.s < 26 && Math.abs(n.x - P.x) < 2) best = n; if (best) { best.x = D.W / 4 + 2.3; best.pulled = 1; best.v *= 0.7; if (!G.said.honk) { G.said.honk = 1; say(['GRANDMA', 'Lean on it, sweetie.']); } } for (const p of D.peds) if (Math.abs(p.s - P.s) < 20 && p.cross) p.cross.k = Math.min(1, p.cross.k + 0.3); }
  inst.stop = () => { G.phase = 'off'; };
  inst.resize = () => { };

  function toHouse() {
    G.phase = 'house'; G.t = 0; const m = clamp(G.drive / (PAR * 2), 0, 1); G.meter = m; G.pre = Math.min(4, Math.floor(m * 5));
    D.root.visible = false; house.visible = true; scene.fog.near = 60; scene.fog.far = 200; scene.background.set('#1a1024'); sky.sky.visible = false;
    H.reset("GRANDMA'S CAT"); H.pill('saved', 'SAVED 0'); H.pill('broken', 'BROKEN 0'); H.pill('time', '1:15');
    const tb = H.button('treat', `TREAT<br>🐟 ${G.treats}`); tb.onDown = throwTreat; if (!G.treats) tb.disabled = true;
    for (const it of items) { it.st = 'shelf'; it.o.position.copy(it.home); it.o.rotation.set(0, 0, 0); it.o.visible = true; }
    for (let i = 0; i < G.pre; i++) { const it = items[(i * 5 + 2) % items.length]; it.st = 'broken'; it.o.position.set(it.home.x + 0.3, 0.05, it.home.z + 0.6); it.o.rotation.set(1.5, 0, 0.4); G.broken++; }
    Object.assign(cat, { x: -2, z: 3.5, tx: -2, tz: 3.5, st: 'run', t: 0, target: null, speed: 3.2, y: 0, sitT: 0 });
    hWolf.position.set(-6, 0, 4.2); hBear.position.set(-5.2, 0, 4.4); hGran.position.set(-6.3, 0, 3.0); hGran.rotation.y = 0.8;
    ctl.I.padOn = false; ctl.I.onTap = tapHouse;
    H.say([['GRANDMA', G.pre ? `Oh, Duchess. ${G.pre === 1 ? 'Something' : G.pre + ' things'} already on the floor.` : 'Not a thing out of place. Yet.'], ['BEAR', 'Tap what she knocks. Catch it before it lands.'], ['WOLF', 'When she sits, grab her.']]);
    H.hint('TAP what she knocks off', 3);
  }
  // ---------------- the cat
  const cat = { x: 0, z: 0, tx: 0, tz: 0, st: 'run', t: 0, target: null, speed: 3.2, y: 0, sitT: 0 };
  function pickPerch() { const free = perches.filter((p) => p.it.st === 'shelf' && p !== cat.target); if (!free.length) return null; free.sort((a, b) => Math.hypot(a.x - cat.x, a.z - cat.z) - Math.hypot(b.x - cat.x, b.z - cat.z)); return free[Math.min(free.length - 1, Math.floor(Math.random() * Math.min(4, free.length)))]; }
  function swat(it) { it.st = 'fall'; it.t = 0; it.v.set((Math.random() - 0.5) * 1.6, 2.2, 1.6 + Math.random()); sfx.meow(); G.swats++; it.tag ||= H.tag('!'); }
  function catchItem(it, how) { it.st = 'saved'; it.t = 0; G.saved++; sfx.catch(); const sp = toScreen(it.o.getWorldPosition(new THREE.Vector3()), camera); H.float(sp.x, sp.y, how === 'early' ? 'STEADY!' : 'SAVED!', '#ffe1a8'); if (it.tag) { it.tag.remove(); H.tags = H.tags.filter((x) => x !== it.tag); it.tag = null; }
    const who = it.home.x < 0 ? hWolf : hBear; who.userData.dash = { x: it.home.x, z: it.home.z + 0.9, t: 0.6 }; }
  function smash(it) { it.st = 'broken'; G.broken++; sfx.smash(); const p = it.o.position; for (let i = 0; i < 10; i++) { const s = SH[shI++ % SH.length]; s.p.copy(p); s.v.set((Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4); s.life = 1.2; s.c.copy(it.o.userData.col || new THREE.Color('#ffffff')); }
    it.o.position.y = 0.05; it.o.rotation.set(1.5, 0, Math.random()); if (it.tag) { it.tag.remove(); H.tags = H.tags.filter((x) => x !== it.tag); it.tag = null; }
    if (!G.said['b' + G.broken]) { G.said['b' + G.broken] = 1; say(['GRANDMA', R.pick(["That was my mother's.", 'It was ugly anyway. Do not tell her.', 'Duchess. DUCHESS.', 'That one I got at the fair.'])]); } }
  function throwTreat() { if (G.phase !== 'house' || G.treats <= 0 || treatObj.visible) return; G.treats--; H.btn.treat.innerHTML = `TREAT<br>🐟 ${G.treats}`; if (!G.treats) H.btn.treat.disabled = true; sfx.pop();
    treatObj.position.set(clamp(cat.x + 1.5, -6, 6), 0.08, clamp(cat.z + 1.2, -4, 4)); treatObj.visible = true; cat.st = 'treat'; cat.tx = treatObj.position.x; cat.tz = treatObj.position.z; say(['GRANDMA', 'Duchess! Din-dins!']); }
  function tapHouse(x, y) {
    if (G.phase !== 'house') return;
    // items first (falling or wobbling), then the cat, then the bed
    const live = items.filter((i) => i.st === 'fall' || i.st === 'wobble').map((i) => i.o); const hit = pickNear(live, x, y, camera, 90);
    if (hit) { const it = hit.userData.it; if (it.st === 'wobble') { catchItem(it, 'early'); cat.st = 'run'; cat.target = null; } else catchItem(it); return; }
    if (pickNear([duchess], x, y, camera, 80)) { if (cat.st === 'sit' || cat.st === 'eat') { grab(); } else { sfx.meow(); const sp = toScreen(duchess.position.clone().add(house.position), camera); H.float(sp.x, sp.y, 'TOO QUICK', '#ffb0a0'); } return; }
    if (!G.mouse && pickNear([bedHit], x, y, camera, 70)) { G.mouse = true; mouse.visible = true; sfx.good(); H.toast('UNDER THE BED: A FELT MOUSE', 2.5); say(['GRANDMA', "Her mousie! She hides it from me."]); }
  }
  function grab() { G.caught = true; G.phase = 'caught'; G.t = 0; cat.st = 'held'; sfx.good(); H.hint('GOT HER!', 2); treatObj.visible = false; say(['DUCHESS', 'Mrrp.'], ['GRANDMA', 'There she is. My good girl.'], ['BEAR', 'She broke a gnome.'], ['GRANDMA', 'She meant to.']); }
  function result(timeout) {
    G.phase = 'done'; const okBroken = G.broken <= 3, great = G.broken <= 1 && G.drive <= PAR; const stars = G.caught ? 1 + (okBroken ? 1 : 0) + (great ? 1 : 0) : 0;
    const suns = []; if (G.caught) suns.push('gc_done'); if (stars === 3) suns.push('gc_star'); if (G.mouse) suns.push('gc_mouse');
    const lines = [`Drive: ${fmt(G.drive)} (par ${fmt(PAR)}) · ${D.P.bumps} bump${D.P.bumps === 1 ? '' : 's'}${D.P.ranRed ? ` · ${D.P.ranRed} red light${D.P.ranRed > 1 ? 's' : ''}` : ''}`, `Saved ${G.saved} · broken ${G.broken}${G.pre ? ` (${G.pre} before you got there)` : ''}`];
    lines.push(G.caught ? (stars === 3 ? 'GRANDMA: "Not a scratch. Well. One gnome."' : 'GRANDMA: "She\'s fine. The house is fine-ish."') : 'GRANDMA: "She\'ll come out when she\'s hungry. She\'s always hungry."');
    ctl.finish({ win: G.caught, stars, title: G.caught ? 'DUCHESS IS SAFE' : 'DUCHESS GOT AWAY', lines, suns });
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ================================================================== per-frame
  const _w = new THREE.Vector3();
  inst.update = (dt, t, I) => {
    G.t += dt;
    if (G.phase === 'talk' || G.phase === 'count' || G.phase === 'drive' || G.phase === 'arrive') {
      let ax = I.axis(); if (G.auto) ax = { x: autoSteer() };
      const wantB = G.phase === 'drive' && (H.btn.boost?.down || I.keys[' '] || (G.auto && D.P.boostCharge >= 1 && G.t > 3));
      if (G.phase === 'count') { const n = 3 - Math.floor(G.t); H.hint(n > 0 ? String(n) : 'GO!', 0); if (G.t > 3) { G.phase = 'drive'; G.t = 0; H.hint('GO!', 0.8); sfx.ok(); } }
      if (G.phase !== 'drive' && G.phase !== 'arrive') { D.P.cruise = 0; } else D.P.cruise = 19;
      D.update(dt, t, G.phase === 'drive' ? ax : { x: 0 }, wantB); D.cam(camera, dt);
      sky.follow(camera);
      if (G.phase === 'drive') { G.drive += dt; G.meter = clamp(G.drive / (PAR * 2), 0, 1); H.setMeter(G.meter, G.meter < 0.5 ? 'DUCHESS vs THE HOUSE' : G.meter < 0.8 ? 'SHE IS ON THE CURTAINS' : 'THE GOOD CHINA'); const mins = 52 + Math.floor(G.drive / 20); H.pill('clock', `SUN ${mins >= 60 ? '9:' + String(mins - 60).padStart(2, '0') : '8:' + mins} PM`, G.meter > 0.7);
        H.pill('treat', `🐟 ${G.treats}`); const bb = H.btn.boost; if (bb) bb.style.opacity = D.P.boostCharge >= 1 || D.P.boost > 0 ? 1 : 0.45;
        for (const e of D.events.splice(0)) { if (e === 'boost') { sfx.whoosh(); if (!G.said.boost) { G.said.boost = 1; say(['GRANDMA', 'Floor it, sweetie. I have a heart condition and I want to use it.']); } }
          if (e === 'red') say(['GRANDMA', R.pick(['That was red, dear.', 'Red means hurry, right?', 'Gerald did not see that.'])]);
          if (e === 'near') { const sp = toScreen(car.getWorldPosition(_w).setY(2), camera); H.float(sp.x, sp.y, 'CLOSE ONE · BOOST +', '#7af2c2'); if (!G.said.near) { G.said.near = 1; say(['GRANDMA', 'Again! Do that again.']); } }
          if (e === 'bump' || e === 'tbone') { sfx.crash(); say([e === 'tbone' ? 'BEAR' : 'GRANDMA', R.pick(e === 'tbone' ? ['WE HAD A RED.', 'They had the green!'] : ['My hip.', 'Sorry! SORRY.', 'Felt bumpers, dear. We are fine.'])]); }
          if (e === 'ped') { sfx.bonk(); say(['', R.pick(['"Hey! Walking here!"', '"It is SUNDAY!"', '"My good shoes!"'])]); } }
        const lines = [[0.22, ['GRANDMA', "She'll be on the dresser by now."]], [0.4, ['GRANDMA', "She's on the curtains. I can feel it."]], [0.62, ['BEAR', 'How do you know?'], ['GRANDMA', 'I just know.']], [0.85, ['GRANDMA', 'Not the good china. Not the GOOD china.']]];
        for (const [k, ...l] of lines) if (G.meter > k && !G.said['m' + k]) { G.said['m' + k] = 1; say(...l); }
        if (D.P.s > END) { G.phase = 'arrive'; G.t = 0; D.P.done = true; sfx.good(); H.hint("GRANDMA'S!", 1.6); say(['GRANDMA', 'Quick, quick. The key is under the gnome.']); } }
      if (G.phase === 'arrive') { bung.userData.cat.position.y = 1.65 + Math.abs(Math.sin(t * 8)) * 0.15; if (G.t > 2.4) { H.fade(true, 300).then(() => { toHouse(); H.fade(false, 300); }); G.phase = 'wait'; } }
      animPal(crew.wolf, dt, t, {}); animPal(crew.bear, dt, t, { panic: G.meter > 0.8 ? 1 : 0 }); animPal(crew.grandma, dt, t, { wave: G.phase === 'arrive' ? 1 : 0 });
      return;
    }
    if (G.phase === 'house' || G.phase === 'caught') { houseTick(dt, t, I); return; }
  };
  function autoSteer() { const P = D.P; let want = D.W / 4; for (const n of D.npcs) { const ds = n.s - P.s; if (ds > 0 && ds < 26 && Math.abs(n.x - want) < 2) want = want > 0 ? -D.W / 4 + 0.2 : D.W / 4; }
    for (const th of D.things) { if (!th.alive) continue; const ds = th.s - P.s; if (ds > 0 && ds < 16) { if (th.solid && Math.abs(th.x - want) < th.w + 1.2) want += (th.x > want ? -1 : 1) * (th.w + 1.6); else if (!th.solid && th.air) want = th.x; } }
    return clamp((want - P.x) * 0.6, -1, 1); }
  // ---------------- house tick
  const TL = 75;
  function houseTick(dt, t, I) {
    const left = Math.max(0, TL - G.t); H.pill('time', fmt(left), left < 12); H.pill('saved', 'SAVED ' + G.saved); H.pill('broken', 'BROKEN ' + G.broken, G.broken > 3);
    // camera: dollhouse view, drifts toward the cat
    const por = camera.aspect < 1, hx = house.position.x;   // portrait turns the dollhouse so its long side runs up the screen
    if (por) { const cz = clamp(cat.z * 0.15, -0.8, 0.8); camera.fov = 54; camera.position.set(hx + 15, 19, cz); camera.lookAt(hx + 0.4, 0, cz * 0.8); }
    else { const cx = clamp(cat.x * 0.25, -1.5, 1.5); camera.fov = 46; camera.position.set(hx + cx, 12.5, 11.5); camera.lookAt(hx + cx * 0.8, 0, 0.4); } camera.updateProjectionMatrix();
    // cat brain
    const spd = cat.speed * (1 + G.t / 90);
    if (G.phase === 'house') {
      if (cat.st === 'run') { if (!cat.target) { cat.target = pickPerch(); if (!cat.target) { cat.st = 'sit'; cat.sitT = 3; } else { cat.tx = cat.target.x; cat.tz = cat.target.z; } }
        if (cat.target && Math.hypot(cat.tx - cat.x, cat.tz - cat.z) < 0.15) { cat.st = 'paw'; cat.t = 0; cat.target.it.st = cat.target.it.st === 'shelf' ? 'wobble' : cat.target.it.st; cat.target.it.t = 0; cat.target.it.tag ||= H.tag('!'); }
        cat.sitT += dt; if (cat.sitT > 11 + Math.random() * 4 && cat.st === 'run') { cat.st = 'sit'; cat.t = 0; cat.sitT = 0; } }
      else if (cat.st === 'paw') { cat.t += dt; const it = cat.target?.it; if (!it || it.st !== 'wobble') { cat.st = 'run'; cat.target = null; } else if (cat.t > Math.max(0.55, 1.25 - G.t / 120)) { swat(it); cat.st = 'run'; cat.target = null; if (G.t > 35 && Math.random() < 0.35) { const p2 = pickPerch(); if (p2 && Math.hypot(p2.x - cat.x, p2.z - cat.z) < 2.6) swat(p2.it); } } }
      else if (cat.st === 'sit') { cat.t += dt; if (cat.t > 2.2) { cat.st = 'run'; cat.t = 0; } }
      else if (cat.st === 'treat') { if (Math.hypot(cat.tx - cat.x, cat.tz - cat.z) < 0.4) { cat.st = 'eat'; cat.t = 0; } }
      else if (cat.st === 'eat') { cat.t += dt; if (cat.t > 3.0) { cat.st = 'run'; treatObj.visible = false; } }
      if (cat.st === 'run' || cat.st === 'treat') { const dx = cat.tx - cat.x, dz = cat.tz - cat.z, d = Math.hypot(dx, dz); if (d > 0.01) { const s = Math.min(d, spd * (cat.st === 'treat' ? 1.4 : 1) * dt); cat.x += dx / d * s; cat.z += dz / d * s; duchess.rotation.y = angLerp2(duchess.rotation.y, Math.atan2(dx, dz), dt * 10); } }
      if (left <= 0) { result(true); return; }
      if (G.auto) autoPlay();
    }
    // cat pose
    let y = cat.st === 'paw' && cat.target ? Math.min(cat.target.it.home.y - 0.05, 0.25 + cat.t * 3) : cat.st === 'held' ? 1.0 : Math.abs(Math.sin(t * 16)) * (cat.st === 'run' ? 0.12 : 0);
    if (cat.st === 'run' || cat.st === 'treat') { const nw = Math.min(Math.abs(cat.x), Math.abs(cat.z)); if (nw < 0.6) y = Math.max(y, 1.5 * (1 - nw / 0.6)); }   // she leaps the low walls
    duchess.position.set(cat.st === 'held' ? hWolf.position.x + 0.3 : cat.x, y, cat.st === 'held' ? hWolf.position.z + 0.4 : cat.z);
    const u = duchess.userData; u.tail.rotation.x = -0.8 + Math.sin(t * (cat.st === 'paw' ? 14 : 5)) * 0.4; u.body.scale.y = cat.st === 'sit' || cat.st === 'eat' ? 1.15 : 1; u.body.position.y = cat.st === 'sit' ? 0.32 : 0.26;
    u.paw.rotation.x = cat.st === 'paw' ? -1.2 + Math.sin(t * 18) * 0.6 : cat.st === 'sit' ? -1.6 + Math.sin(t * 6) * 0.3 : 0;
    ring.material.opacity = (cat.st === 'sit' || cat.st === 'eat') && G.phase === 'house' ? 0.55 + Math.sin(t * 10) * 0.35 : 0;
    // items
    for (const it of items) { const o = it.o;
      if (it.st === 'wobble') { it.t += dt; o.rotation.z = Math.sin(t * 30) * 0.18 * Math.min(1, it.t * 2); }
      else if (it.st === 'fall') { it.t += dt; it.v.y -= 9.8 * dt * 0.75; o.position.addScaledVector(it.v, dt); o.rotation.x += dt * 6; if (o.position.y <= 0.06) smash(it); }
      else if (it.st === 'saved') { it.t += dt; o.position.lerp(it.home, Math.min(1, dt * 5)); o.rotation.set(0, 0, 0); if (it.t > 0.6) { it.st = 'shelf'; o.position.copy(it.home); } }
      else if (it.st === 'shelf') o.rotation.z *= 0.8;
      if (it.tag) { H.place(it.tag, o.getWorldPosition(_w).setY(o.position.y + 0.6), camera); if (it.st !== 'wobble' && it.st !== 'fall') { it.tag.remove(); it.tag = null; } } }
    H.tags = H.tags.filter((x) => x.isConnected);
    // shards
    const m4 = new THREE.Matrix4(); for (let i = 0; i < SH.length; i++) { const s = SH[i]; if (s.life > 0) { s.life -= dt; s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < 0.03) { s.p.y = 0.03; s.v.multiplyScalar(0.5); s.v.y *= -0.3; } } m4.makeRotationY(i).setPosition(s.life > 0 ? s.p : _w.set(0, -5, 0)); shards.setMatrixAt(i, m4); shards.setColorAt(i, s.c); } shards.instanceMatrix.needsUpdate = true; if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
    // the crew: dash to saves, then drift back; Grandma at the hall door
    for (const [p, home] of [[hWolf, [-1.2, 1.6]], [hBear, [1.4, 1.6]]]) { const d = p.userData.dash; const tx = d ? d.x : home[0], tz = d ? d.z : home[1]; const dx = tx - p.position.x, dz = tz - p.position.z, dd = Math.hypot(dx, dz);
      if (dd > 0.1) { const s = Math.min(dd, dt * (d ? 9 : 2.4)); p.position.x += dx / dd * s; p.position.z += dz / dd * s; p.rotation.y = Math.atan2(dx, dz); } if (d) { d.t -= dt; if (d.t <= 0) p.userData.dash = null; }
      animPal(p, dt, t, { walk: dd > 0.1 ? 1 : 0, cheer: G.phase === 'caught' ? 1 : 0 }); }
    hGran.position.lerp(_w.set(-6.0, 0, 2.2), dt); animPal(hGran, dt, t, { wave: G.phase === 'caught' ? 1 : 0, panic: G.phase === 'house' && G.broken > G.pre + 2 ? 1 : 0 });
    if (G.phase === 'caught' && G.t > 3.2) result(false);
  }
  let autoT = 0; function autoPlay() { autoT += 1 / 60; for (const it of items) if (it.st === 'fall' && it.o.position.y < it.home.y - 0.15 && Math.random() < 0.5) catchItem(it); if (G.t > 18 && (cat.st === 'sit' || cat.st === 'eat')) grab(); if (G.t > 6 && G.treats && !treatObj.visible && cat.st === 'run') throwTreat(); }
  return inst;
}
const angLerp2 = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k);
function roofG(w, d, h) { const g = new THREE.BufferGeometry(), hw = w / 2, hd = d / 2; const P = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, -hw, h, 0, hw, h, 0]; const I = [0, 4, 1, 1, 4, 5, 2, 5, 3, 3, 5, 4, 0, 3, 4, 1, 5, 2]; const pos = []; for (const i of I) pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }
function fishGeo() { const m = new Merge(); m.ball(0.22, '#ffffff', 0, 0, 0, 1.4, 0.7, 0.5, 8, 6); m.cone(0.16, 0.22, '#ffffff', -0.36, 0, 0, 4, 0, 0, Math.PI / 2); return m.mesh().geometry; }
let CATT = null; function catTex() { if (CATT) return CATT; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#2a1a24'; g.beginPath(); g.ellipse(32, 44, 16, 14, 0, 0, 7); g.fill(); g.beginPath(); g.arc(32, 24, 11, 0, 7); g.fill(); g.beginPath(); g.moveTo(22, 18); g.lineTo(25, 6); g.lineTo(30, 15); g.fill(); g.beginPath(); g.moveTo(42, 18); g.lineTo(39, 6); g.lineTo(34, 15); g.fill(); g.lineWidth = 5; g.strokeStyle = '#2a1a24'; g.beginPath(); g.moveTo(46, 52); g.quadraticCurveTo(62, 40, 54, 26); g.stroke(); CATT = new THREE.CanvasTexture(c); return CATT; }
function knick(kind, col) {
  const g = new THREE.Group(), c = col; g.userData.col = new THREE.Color(col);
  if (kind === 'cup') { cyl(0.11, 0.08, 0.12, c, [0, 0.06, 0], g, 10); cyl(0.14, 0.14, 0.015, c, [0, 0.005, 0], g, 12); const h = mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8), c, [0.12, 0.07, 0], g); }
  else if (kind === 'vase') { ball(0.12, c, [0, 0.12, 0], g, 10, 8).scale.set(1, 1.3, 1); cyl(0.05, 0.07, 0.14, c, [0, 0.3, 0], g, 8); }
  else if (kind === 'lamp') { cyl(0.05, 0.08, 0.25, '#c9b8a0', [0, 0.12, 0], g, 8); cyl(0.1, 0.18, 0.18, glowMat(c), [0, 0.33, 0], g, 10); }
  else if (kind === 'clock') { box(0.36, 0.26, 0.12, '#7a4e2e', [0, 0.13, 0], g); mesh(new THREE.CircleGeometry(0.09, 14), '#f6efe0', [0, 0.15, 0.065], g); }
  else if (kind === 'frame') { box(0.24, 0.3, 0.04, c, [0, 0.15, 0], g).rotation.x = -0.15; box(0.18, 0.22, 0.01, '#f2e6c8', [0, 0.15, 0.025], g).rotation.x = -0.15; }
  else if (kind === 'globe') { ball(0.14, felt(c, { transparent: true, opacity: 0.8 }), [0, 0.16, 0], g, 12, 8); cyl(0.12, 0.13, 0.05, '#7a4e2e', [0, 0.02, 0], g, 10); }
  else if (kind === 'rooster') { ball(0.1, c, [0, 0.12, 0], g, 8, 6).scale.set(1, 1, 1.4); ball(0.06, c, [0, 0.24, 0.08], g, 6, 5); box(0.02, 0.06, 0.06, '#c9302a', [0, 0.3, 0.08], g); }
  else if (kind === 'gnome') { cyl(0.08, 0.1, 0.16, '#3a6aa8', [0, 0.08, 0], g, 8); ball(0.06, '#efd2b8', [0, 0.2, 0], g, 6, 5); mesh(new THREE.ConeGeometry(0.07, 0.18, 8), c, [0, 0.32, 0], g); }
  else if (kind === 'jar') { cyl(0.13, 0.13, 0.22, c, [0, 0.11, 0], g, 10); ball(0.06, '#c9302a', [0, 0.25, 0], g, 6, 5); }
  else if (kind === 'pair') { cyl(0.04, 0.05, 0.14, '#efe6d6', [-0.06, 0.07, 0], g, 8); cyl(0.04, 0.05, 0.14, '#3a3a40', [0.06, 0.07, 0], g, 8); }
  else if (kind === 'plate') { cyl(0.16, 0.12, 0.03, c, [0, 0.12, 0], g, 14).rotation.x = -1.2; }
  return g;
}
function catModel() {   // DUCHESS: a round felt tortoiseshell with a judgmental face
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  ball(0.3, '#3a2a2a', [0, 0, 0], body, 12, 8).scale.set(0.9, 0.8, 1.25); ball(0.12, '#c97a3a', [0.12, 0.1, 0.1], body, 6, 4); ball(0.1, '#efe2c8', [-0.08, -0.05, 0.25], body, 6, 4);
  const hd = new THREE.Group(); hd.position.set(0, 0.24, 0.32); body.add(hd); ball(0.2, '#3a2a2a', [0, 0, 0], hd, 12, 8); ball(0.08, '#c97a3a', [-0.08, 0.1, 0.1], hd, 6, 4);
  for (const s of [-1, 1]) { mesh(new THREE.ConeGeometry(0.07, 0.14, 5), '#3a2a2a', [s * 0.11, 0.18, -0.02], hd).rotation.z = -s * 0.3; ball(0.05, '#e8d24a', [s * 0.075, 0.03, 0.16], hd, 8, 6); ball(0.022, '#1a1214', [s * 0.075, 0.03, 0.205], hd, 5, 4); }
  ball(0.03, '#e88aa0', [0, -0.03, 0.19], hd, 5, 4);
  const tail = new THREE.Group(); tail.position.set(0, 0.05, -0.32); body.add(tail); mesh(new THREE.CapsuleGeometry(0.045, 0.42, 2, 6), '#3a2a2a', [0, 0.22, 0], tail);
  const paw = new THREE.Group(); paw.position.set(0.12, -0.05, 0.25); body.add(paw); mesh(new THREE.CapsuleGeometry(0.045, 0.16, 2, 6), '#efe2c8', [0, 0, 0.08], paw).rotation.x = Math.PI / 2;
  for (const [x, z] of [[-0.14, 0.2], [-0.14, -0.2], [0.14, -0.2]]) mesh(new THREE.CapsuleGeometry(0.045, 0.14, 2, 6), '#3a2a2a', [x, -0.18, z], body);
  body.position.y = 0.26; g.add(blobShadow(0.4, 0.4)); g.userData = { body, tail, paw, hd }; return g;
}
