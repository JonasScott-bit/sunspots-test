// carnival.js — run 14: THE ONE HORSE FAIR, an old-school carnival at the east edge of town (x 76..150, z -4..96).
// Matched to the refs in /workspace/sunspots/carnival_refs (colours sampled from the photos, lifted for felt):
//   BUSTLER  — blue/white striped platform, red lettering, blue steel arch with letter discs, ticket booth, pennants
//   SKY WHEEL — tall steel lattice wheel with open bench seats · TWIRL-TOP — cream/red striped dome spinner with a spire
//   RHUMBA   — marquee-bulb script sign, pastel zigzag Googie mural, round cars + striped umbrellas on a blue disc, white low fence
//   BUMP CITY (bumper cars), the ONE HORSE CAROUSEL (twelve copies of the same horse), TIPSY CUPS
// Midway booths, food stands (made-up brands), string lights, pennants, power poles, gravel + grass, a parking lot off Mesa Rd.
// All procedural: merged felt geometry, instanced struts / bulbs / pennants. Organ (calliope) music by distance. Glows at night
// (?night or STAY TILL DARK at the ticket booth); everything goes wonky in WILD. Rides + booths are played by carnrides.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const FAIR = { x0: 76, x1: 150, z0: -4, z1: 96, mid: 62, cx: 112, cz: 46 };
export const RIDES_AT = { bustler: [92, 33], wheel: [136, 27], twirl: [99, 9], rhumba: [117, 37], carousel: [90, 84], cups: [108, 84], bump: [131, 84] };
const PALC = {
  red: '#b8463f', redL: '#b43d32', blue: '#90abcd', blueL: '#c3d2e9', sign: '#abbbd2', tent: '#dab87d', gravel: '#c2bfc6', grass: '#9b927f', sky: '#94b0db',
  steel: '#6c7276', cream: '#e3cfa8', domeRed: '#a8432f', seat: '#374f64', disc: '#5b86a3', carRed: '#b8463f', carTeal: '#3f9fa3', carWhite: '#ecebe4',
  pink: '#e3a0b8', teal: '#6fb8b8', yellow: '#e8c95a', white: '#f4f1ea', wood: '#7a5a3c', asphalt: '#5d5a5e',
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function tex(w, h, fn, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const stripes = (cols, n, vert = true) => tex(256, 64, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; if (vert) g.fillRect(i * w / n, 0, w / n + 1, h); else g.fillRect(0, i * h / n, w, h / n + 1); } });
function label(text, o = {}) {   // sign texture: rounded board + lettering
  const W = o.w || 512, H = o.h || 128;
  return tex(W, H, (g) => { g.fillStyle = o.bg || '#f4f1ea'; g.beginPath(); g.roundRect?.(4, 4, W - 8, H - 8, o.r ?? 18); if (!g.roundRect) g.rect(4, 4, W - 8, H - 8); g.fill();
    if (o.border) { g.lineWidth = 8; g.strokeStyle = o.border; g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = o.font || `900 ${H * 0.52}px Futura,"Arial Black",Avenir,sans-serif`;
    if (o.outline) { g.lineWidth = o.ow || 10; g.strokeStyle = o.outline; g.lineJoin = 'round'; g.strokeText(text, W / 2, H / 2 + (o.dy || 4)); }
    g.fillStyle = o.fg || '#b43d32'; g.fillText(text, W / 2, H / 2 + (o.dy || 4));
    if (o.sub) { g.font = `700 ${H * 0.18}px Futura,Avenir,sans-serif`; g.fillStyle = o.subc || '#2b1e3c'; g.fillText(o.sub, W / 2, H * 0.86); } });
}

export function createCarnival({ scene, feltMat, TS, colliders, LOW }) {
  const root = new THREE.Group(); root.name = 'carnival'; scene.add(root);
  const near = new THREE.Group(); near.name = 'carnival details'; root.add(near);   // LOD: hidden past ~150 m
  const VC = feltMat('#ffffff', { vertexColors: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const steelMat = feltMat(PALC.steel, { bumpScale: 0.2 });
  const C = { rides: {}, bulbs: [], night: 0, nightT: 0, wildK: 0, tris: 0, root, near, booths: {}, food: {}, PALC };
  const parts = [];   // [geo] with vertex colours, merged per group
  function P(list, geo, color, m) { geo = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) geo.applyMatrix4(m); const n = geo.attributes.position.count, a = new Float32Array(n * 3); _c.set(color); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!geo.index) geo = geo; list.push(geo); return geo; }
  function merged(list, parent, mat = VC, shadow = true) { if (!list.length) return null; const g = mergeGeometries(list.map(x => x.index ? x : x), false); const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
  function struts(parent, list, mat = steelMat, shadow = true) {   // list of [a, b, r] -> one InstancedMesh of boxes
    const box = new THREE.BoxGeometry(1, 1, 1); const im = new THREE.InstancedMesh(box, mat, list.length);
    list.forEach(([a, b, r], i) => { _v.subVectors(b, a); const L = _v.length(); _q.setFromUnitVectors(_u, _v.normalize()); _s.set(r, L, r); im.setMatrixAt(i, _m.compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), _q, _s)); });
    im.castShadow = shadow; im.receiveShadow = false; parent.add(im); return im;
  }
  function bulbs(parent, pts, cols = ['#fff1b8'], size = 0.13, group = 'all') {
    const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(size, 0), bulbMat, pts.length);
    pts.forEach((p, i) => { im.setMatrixAt(i, _m.makeTranslation(p.x, p.y, p.z)); im.setColorAt(i, _c.set(cols[i % cols.length])); });
    im.userData.base = pts.map((_, i) => cols[i % cols.length]); im.userData.group = group; parent.add(im); C.bulbs.push(im); return im;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (rt, rb, h, s = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
  const texMesh = (geo, map, parent, m4, extra = {}) => { const me = new THREE.Mesh(geo, feltMat('#ffffff', { map, ...extra })); if (m4) me.applyMatrix4(m4); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; };
  const boxes = TS.boxes, addBox = (x0, z0, x1, z1, h, name) => boxes.push({ x0, z0, x1, z1, h, name: 'carn_' + name });
  const circ = (x, z, r) => colliders.push({ x, z, r });

  // ------------------------------------------------------------------ ground: gravel lot with grass edges, the parking lot, the road in
  {
    const gTex = tex(256, 256, (g, w, h) => { g.fillStyle = PALC.gravel; g.fillRect(0, 0, w, h); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 2600; i++) { g.fillStyle = ['#a9a5ad', '#d8d5db', '#b6aea3', '#9c98a0'][i % 4]; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); } }, [14, 18]);
    const grassTex = tex(128, 128, (g, w, h) => { g.fillStyle = PALC.grass; g.fillRect(0, 0, w, h); let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) { g.fillStyle = ['#8a8270', '#a8a08a', '#7f8a62', '#b0a58c'][i % 4]; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); } }, [26, 34]);
    const gr = texMesh(new THREE.PlaneGeometry(FAIR.x1 - FAIR.x0 + 8, FAIR.z1 - FAIR.z0 + 8), grassTex, root, M4((FAIR.x0 + FAIR.x1) / 2, 0.018, (FAIR.z0 + FAIR.z1) / 2, -Math.PI / 2)); gr.castShadow = false; gr.name = 'fair grass';
    const gv = texMesh(new THREE.PlaneGeometry(FAIR.x1 - FAIR.x0 - 2, 82), gTex, root, M4((FAIR.x0 + FAIR.x1) / 2, 0.026, 47, -Math.PI / 2)); gv.castShadow = false; gv.name = 'fair gravel';
    const lotTex = tex(256, 256, (g, w, h) => { g.fillStyle = PALC.asphalt; g.fillRect(0, 0, w, h); g.fillStyle = '#efe9d8'; for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 2, 0, 4, h * 0.42); for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 2, h * 0.58, 4, h * 0.42); }, [3, 1]);
    const lot = texMesh(new THREE.PlaneGeometry(22, 24), lotTex, root, M4(63, 0.03, 79, -Math.PI / 2)); lot.castShadow = false; lot.name = 'fair parking lot';
    TS.mapRects = (TS.mapRects || []).concat([{ x0: FAIR.x0 - 4, z0: FAIR.z0 - 4, x1: FAIR.x1 + 4, z1: FAIR.z1 + 4, col: '#b7c08f' }, { x0: FAIR.x0 - 1, z0: 6, x1: FAIR.x1 - 1, z1: 88, col: '#cfccd2' }, { x0: 52, z0: 67, x1: 74, z1: 91, col: '#7a706a' }]);
    // parked felt cars in the lot (same cheap box cars as the drive-in)
    const L = [], cols = ['#9fd3c7', '#e8a0a0', '#f2e3b5', '#7fb3d5', '#d9b26f', '#b9a3d6'];
    [[56, 72], [62.5, 72], [69, 72], [56, 86], [69, 86]].forEach(([x, z], i) => { const c = cols[i % cols.length], ry = z < 79 ? 0 : Math.PI;
      P(L, box(1.9, 0.75, 4.1), c, M4(x, 0.62, z, 0, ry)); P(L, box(1.7, 0.6, 2.1), c, M4(x, 1.25, z - (ry ? -0.3 : 0.3), 0, ry)); P(L, box(1.72, 0.42, 1.9), '#3d4a5a', M4(x, 1.28, z - (ry ? -0.3 : 0.3), 0, ry, 0, 1.01, 0.9, 1.01));
      for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) P(L, cyl(0.36, 0.36, 0.3, 10), '#2b2628', M4(x + wx, 0.36, z + wz, 0, 0, Math.PI / 2)); addBox(x - 1, z - 2.1, x + 1, z + 2.1, 1.6, 'car' + i); });
    merged(L, root);
  }

  // ------------------------------------------------------------------ power poles + wires (ref: wooden poles, cross arms, sagging lines)
  {
    const L = [], wires = [], polesAt = [[46, 57], [60, 57], [74, 55], [76, -2], [92, -4], [110, -4], [128, -4], [146, -4], [152, 14], [152, 34], [152, 54], [152, 74], [152, 94]];
    for (const [x, z] of polesAt) { P(L, cyl(0.16, 0.2, 10, 7), PALC.wood, M4(x, 5, z)); P(L, box(2.2, 0.14, 0.14), PALC.wood, M4(x, 9.3, z, 0, z === -4 || z === -2 ? 0 : Math.PI / 2)); P(L, box(1.4, 0.12, 0.12), PALC.wood, M4(x, 8.6, z, 0, z === -4 || z === -2 ? 0 : Math.PI / 2));
      for (const o of [-0.9, 0, 0.9]) P(L, cyl(0.05, 0.05, 0.22, 5), '#e6e1d4', M4(x + (z === -4 || z === -2 ? o : 0), 9.48, z + (z === -4 || z === -2 ? 0 : o))); }
    merged(L, root);
    const pts = []; const seq = [polesAt.slice(0, 3), polesAt.slice(3, 8), polesAt.slice(7, 13)];
    for (const s of seq) for (let i = 0; i < s.length - 1; i++) { const [ax, az] = s[i], [bx, bz] = s[i + 1]; const ewA = Math.abs(bz - az) < Math.abs(bx - ax);
      for (const o of [-0.9, 0, 0.9]) { const ox = ewA ? 0 : o, oz = ewA ? o : 0; for (let k = 0; k < 10; k++) { const t0 = k / 10, t1 = (k + 1) / 10, y = (t) => 9.55 - Math.sin(t * Math.PI) * 0.9;
        pts.push(ax + ox + (bx - ax) * t0, y(t0), az + oz + (bz - az) * t0, ax + ox + (bx - ax) * t1, y(t1), az + oz + (bz - az) * t1); } } }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#2f2a2c' })); wl.name = 'power lines'; root.add(wl);
  }

  // ------------------------------------------------------------------ ENTRANCE: arch over Mesa Rd + ticket booth (white booth, blue roof like the ref)
  {
    const L = [], ax = 78;
    for (const z of [56.6, 67.4]) { P(L, cyl(0.28, 0.32, 7.4, 12), '#f4f1ea', M4(ax, 3.7, z)); for (let i = 0; i < 7; i++) P(L, cyl(0.3, 0.3, 0.42, 12), PALC.red, M4(ax, 0.6 + i * 1.0, z)); P(L, new THREE.SphereGeometry(0.42, 10, 8), PALC.yellow, M4(ax, 7.6, z)); }
    merged(L, root);
    const sign = texMesh(box(0.3, 2.0, 11.6), null, root, M4(ax, 7.0, 62)); sign.material = [feltMat('#f4f1ea'), feltMat('#f4f1ea'), feltMat(PALC.blue), feltMat(PALC.blue),
      feltMat('#fff', { map: label('ONE HORSE FAIR', { w: 1024, h: 180, bg: PALC.blueL, fg: PALC.redL, outline: '#f4f1ea', border: PALC.blue, sub: '· RIDES · GAMES · CORN DOGS · ONE HORSE ·' }) }),
      feltMat('#fff', { map: label('COME AGAIN', { w: 1024, h: 180, bg: PALC.blueL, fg: PALC.redL, outline: '#f4f1ea', border: PALC.blue }) })];
    sign.material[4].map.rotation = 0; sign.rotation.y = 0; sign.geometry = new THREE.BoxGeometry(11.6, 2.0, 0.3); sign.rotation.y = -Math.PI / 2;
    const ap = []; for (let i = 0; i <= 22; i++) ap.push(V(ax - 0.2, 8.05 + Math.sin(i / 22 * Math.PI) * 0.25, 56.6 + i / 22 * 10.8)); bulbs(near, ap, ['#fff1b8', '#ffb35a']);
    // ticket booth
    const B = [], bx = 82.5, bz = 55.2; P(B, box(2.0, 2.5, 1.8), '#f4f1ea', M4(bx, 1.25, bz)); P(B, box(2.5, 0.22, 2.3), PALC.blue, M4(bx, 2.62, bz)); P(B, box(2.1, 0.5, 1.9), '#f4f1ea', M4(bx, 2.9, bz));
    P(B, box(0.7, 0.75, 0.04), '#3a4552', M4(bx - 0.45, 1.6, bz + 0.92)); P(B, box(0.7, 0.75, 0.04), '#3a4552', M4(bx + 0.45, 1.6, bz + 0.92)); P(B, box(2.1, 0.08, 0.35), PALC.blue, M4(bx, 1.18, bz + 1.0));
    merged(B, root); texMesh(new THREE.PlaneGeometry(1.9, 0.45), label('TICKETS', { w: 256, h: 64, bg: '#f4f1ea', fg: PALC.redL }), root, M4(bx, 2.9, bz + 0.96));
    addBox(bx - 1.05, bz - 0.95, bx + 1.05, bz + 0.95, 3, 'ticket');
    for (const z of [56.6, 67.4]) circ(ax, z, 0.5);
    C.ticket = { x: bx, z: bz + 2.0 };
  }

  // ------------------------------------------------------------------ string lights + pennants along the midway
  {
    const poles = [], L = [];
    for (let x = 84; x <= 146; x += 10.5) for (const z of [57.2, 66.8]) { poles.push([x, z]); P(L, cyl(0.12, 0.14, 6, 7), PALC.wood, M4(x, 3, z)); circ(x, z, 0.3); }
    merged(L, root);
    const pts = [], wire = [], sag = (a, b, n, s) => { for (let i = 0; i <= n; i++) { const t = i / n; pts.push(V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * s, a.z + (b.z - a.z) * t)); if (i) wire.push(pts[pts.length - 2], pts[pts.length - 1]); } };
    for (const z of [57.2, 66.8]) for (let x = 84; x < 146; x += 10.5) sag(V(x, 5.9, z), V(x + 10.5, 5.9, z), 11, 0.7);
    for (let x = 84; x < 146; x += 10.5) sag(V(x, 5.9, 57.2), V(x + 10.5, 5.9, 66.8), 13, 1.0);
    bulbs(near, pts, ['#fff1b8', '#ffd27a', '#ff9a7a', '#bfe6ff'], 0.12, 'midway');
    const wg = new THREE.BufferGeometry().setFromPoints(wire); const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#3a302c' })); near.add(wl);
    // pennants: entrance -> first poles, plus round the BUSTLER
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.28, 0, 0, 0.28, 0, 0, 0, -0.62, 0], 3)); tri.computeVertexNormals();
    const pm = feltMat('#ffffff', { side: THREE.DoubleSide }); const pp = [];
    const pline = (a, b, n, s) => { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; pp.push([V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * s, a.z + (b.z - a.z) * t), Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2]); } };
    pline(V(78, 7.4, 56.6), V(84, 5.6, 57.2), 8, 0.4); pline(V(78, 7.4, 67.4), V(84, 5.6, 66.8), 8, 0.4);
    const [hx, hz] = RIDES_AT.bustler; pline(V(hx - 9, 4.5, hz + 7), V(hx, 9.6, hz), 12, 0.6); pline(V(hx + 9, 4.5, hz + 7), V(hx, 9.6, hz), 12, 0.6); pline(V(hx - 9, 4.5, hz - 7), V(hx, 9.6, hz), 12, 0.6); pline(V(hx + 9, 4.5, hz - 7), V(hx, 9.6, hz), 12, 0.6);
    const pim = new THREE.InstancedMesh(tri, pm, pp.length), pc = [PALC.redL, PALC.yellow, '#f4f1ea', PALC.blue, '#e88a3a'];
    pp.forEach(([p, ry], i) => { pim.setMatrixAt(i, _m.compose(p, _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1))); pim.setColorAt(i, _c.set(pc[i % pc.length])); }); pim.name = 'pennants'; near.add(pim); C.pennants = pim;
    for (const [x, z] of [[hx - 9, hz + 7], [hx + 9, hz + 7], [hx - 9, hz - 7], [hx + 9, hz - 7]]) { const l2 = []; P(l2, cyl(0.1, 0.12, 4.6, 6), PALC.blue, M4(x, 2.3, z)); merged(l2, root); }
  }

  // ------------------------------------------------------------------ midway booths + food stands
  const BOOTHS = [   // key, x, side (+1 = north row facing south), name, stripe colours, kind
    ['darts', 88, 1, 'POP-A-DART', [PALC.redL, '#f4f1ea'], 'game'], ['gallery', 96.5, 1, 'BALLOON BLASTER', [PALC.blue, '#f4f1ea'], 'game'], ['rings', 105, 1, 'RING-A-DING', [PALC.yellow, '#f4f1ea'], 'game'],
    ['striker', 88, -1, 'TEST YOUR METTLE', [PALC.redL, PALC.yellow], 'game'], ['moles', 96.5, -1, 'WHACK-A-GOPHER', ['#7fb36a', '#f4f1ea'], 'game'], ['prizes', 105, -1, 'PRIZE SHACK', [PALC.pink, '#f4f1ea'], 'game'],
    ['corndog', 121, 1, 'CORNY DOG CO.', ['#e88a3a', '#f4f1ea'], 'food'], ['floss', 129, 1, 'FLOSS BOSS', [PALC.pink, PALC.teal], 'food'], ['lemon', 121, -1, 'LEMON SHACK-UP', [PALC.yellow, '#f4f1ea'], 'food'], ['fry', 129, -1, 'FRY-O-RAMA', [PALC.redL, PALC.yellow], 'food'],
  ];
  for (const [key, x, side, name, cols, kind] of BOOTHS) {
    const z = side > 0 ? 53.6 : 70.4, fz = z + side * 1.9, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = side > 0 ? 0 : Math.PI; root.add(g); const L = [], W = 6.2, D = 3.6;
    P(L, box(W, 3.0, 0.2), '#efe6d6', M4(0, 1.5, -D / 2)); P(L, box(0.2, 3.0, D), '#efe6d6', M4(-W / 2, 1.5, 0)); P(L, box(0.2, 3.0, D), '#efe6d6', M4(W / 2, 1.5, 0));
    P(L, box(W, 1.05, 0.5), cols[0], M4(0, 0.53, D / 2 - 0.25)); P(L, box(W + 0.1, 0.1, 0.62), '#f4f1ea', M4(0, 1.1, D / 2 - 0.25)); P(L, box(W, 0.06, D), '#a89f92', M4(0, 0.03, 0));
    for (const sx of [-1, 1]) P(L, cyl(0.07, 0.07, 3.1, 6), '#f4f1ea', M4(sx * (W / 2 - 0.1), 1.55, D / 2 - 0.05));
    merged(L, g);
    const can = texMesh(new THREE.PlaneGeometry(W + 0.4, 2.1), stripes(cols, 10), g, M4(0, 3.35, 0.15, -Math.PI / 2 + 0.42), { side: THREE.DoubleSide }); can.castShadow = true;
    const val = texMesh(new THREE.PlaneGeometry(W + 0.4, 0.5), tex(256, 32, (c, w, h) => { for (let i = 0; i < 12; i++) { c.fillStyle = cols[i % 2]; c.fillRect(i * w / 12, 0, w / 12 + 1, h * 0.55); c.beginPath(); c.arc((i + 0.5) * w / 12, h * 0.55, w / 24, 0, Math.PI); c.fill(); } }), g, M4(0, 2.95, D / 2 + 0.12), { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    texMesh(new THREE.PlaneGeometry(W - 0.6, 1.1), label(name, { w: 768, h: 140, bg: '#f4f1ea', fg: kind === 'food' ? '#2b1e3c' : PALC.redL, border: cols[0] }), g, M4(0, 4.35, -D / 2 + 0.05 + 0.02));
    { const bb = []; P(bb, box(W - 0.4, 1.3, 0.12), cols[0], M4(0, 4.35, -D / 2 - 0.02)); merged(bb, g); }
    const hw = side > 0 ? [x - W / 2, z - D / 2, x + W / 2, z + D / 2 - 0.6] : [x - W / 2, z - D / 2 + 0.6, x + W / 2, z + D / 2]; addBox(...hw, 3.4, key);
    C.booths[key] = { key, x, z, side, g, front: { x, z: fz + side * 1.0 }, name, kind };
  }
  // booth furniture (inside, local to each booth: +z = toward the midway)
  const B = C.booths;
  { // prize walls: rows of felt plush on the back wall of every game booth
    const plush = []; for (const k of ['darts', 'gallery', 'rings', 'striker', 'moles', 'prizes']) for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) plush.push([B[k].g, -2.4 + i * 0.6, 1.5 + r * 0.55, -1.45]);
    const pg = new THREE.IcosahedronGeometry(0.25, 0); const im = new THREE.InstancedMesh(pg, feltMat('#ffffff'), plush.length); const pc = [PALC.pink, PALC.teal, PALC.yellow, '#b9a3d6', '#e88a3a', '#9fd3c7', PALC.redL];
    plush.forEach(([g, x, y, z], i) => { g.updateMatrixWorld(true); _v.set(x, y, z).applyMatrix4(g.matrixWorld); im.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.set(1, 0.9 + (i % 3) * 0.12, 0.85))); im.setColorAt(i, _c.set(pc[(i * 5) % pc.length])); });
    im.name = 'plush wall'; near.add(im);
  }
  { // food props on the roofs: a giant corn dog, a cotton-candy cone, a lemon, a basket of fries
    const L = []; const top = (k) => [B[k].x, 5.3, B[k].z];
    { const [x, y, z] = top('corndog'); P(L, new THREE.CapsuleGeometry(0.45, 1.6, 4, 10), '#c98a3c', M4(x, y + 0.6, z, 0, 0, 0.5)); P(L, cyl(0.06, 0.06, 1.2, 6), '#e6d2a8', M4(x - 0.62, y - 0.55, z, 0, 0, 0.5)); }
    { const [x, y, z] = top('floss'); P(L, new THREE.ConeGeometry(0.35, 1.3, 10), '#f4f1ea', M4(x, y - 0.1, z, Math.PI)); P(L, new THREE.IcosahedronGeometry(0.85, 1), PALC.pink, M4(x, y + 0.9, z)); }
    { const [x, y, z] = top('lemon'); P(L, new THREE.SphereGeometry(0.8, 14, 10), PALC.yellow, M4(x, y + 0.5, z, 0, 0, 0, 1.3, 1, 1)); P(L, new THREE.SphereGeometry(0.16, 8, 6), PALC.yellow, M4(x + 1.05, y + 0.5, z)); }
    { const [x, y, z] = top('fry'); P(L, cyl(0.75, 0.5, 0.9, 10), PALC.redL, M4(x, y + 0.2, z)); for (let i = 0; i < 9; i++) P(L, box(0.13, 1.1, 0.13), '#e8c95a', M4(x + Math.sin(i * 2.4) * 0.4, y + 0.8, z + Math.cos(i * 2.4) * 0.4, Math.sin(i) * 0.2, 0, Math.cos(i * 1.7) * 0.2)); }
    merged(L, near);
  }
  { // game furniture: dart board of balloons, gallery rail, bottle pyramid, the striker tower, the mole table
    const L = []; const at = (k, x, y, z) => { const g = B[k].g; g.updateMatrixWorld(true); return _v.set(x, y, z).applyMatrix4(g.matrixWorld).clone(); };
    const ry = (k) => B[k].g.rotation.y;
    { const p = at('darts', 0, 2.1, -1.32); P(L, box(4.6, 1.8, 0.12), '#c9a26e', M4(p.x, p.y, p.z, 0, ry('darts'))); }
    { const p = at('gallery', 0, 1.7, -1.1); P(L, box(5.6, 0.12, 0.12), '#6c7276', M4(p.x, p.y, p.z, 0, ry('gallery'))); P(L, box(5.6, 0.12, 0.12), '#6c7276', M4(p.x, p.y + 0.9, p.z, 0, ry('gallery'))); }
    { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) for (let j = 0; j < 3; j++) { const p = at('rings', -1.6 + j * 1.6 + (i - (3 - r) / 2) * 0.32, 1.15 + r * 0.34, -0.6 + r * 0.05); P(L, cyl(0.07, 0.11, 0.32, 8), j === 1 ? '#7fb36a' : '#9fd3c7', M4(p.x, p.y, p.z)); } }
    { const p = at('striker', 0, 0, 2.6); P(L, box(0.5, 6.6, 0.3), '#f4f1ea', M4(p.x, 3.3, p.z, 0, ry('striker'))); P(L, cyl(0.4, 0.4, 0.2, 14), '#d9b23a', M4(p.x, 6.7, p.z, Math.PI / 2, ry('striker'))); P(L, box(1.0, 0.3, 1.0), '#7a5a3c', M4(p.x, 0.15, p.z + (B.striker.side > 0 ? 0.5 : -0.5)));
      C.striker = { x: p.x, z: p.z, top: 6.6 }; addBox(p.x - 0.4, p.z - 0.4, p.x + 0.4, p.z + 0.4, 7, 'striker_tower'); }
    { const p = at('moles', 0, 0.95, 0.3); P(L, box(4.0, 0.12, 1.6), '#6f9a52', M4(p.x, p.y, p.z, 0, ry('moles'))); }
    merged(L, near);
    const sl = []; for (let i = 0; i < 12; i++) { const p = at('striker', 0, 0.5 + i * 0.5, 2.78); sl.push(V(p.x, p.y, p.z)); } bulbs(near, sl, ['#ffd27a', '#ff9a7a', '#ff6a5a'], 0.11, 'striker');
  }

  // ================================================================== RIDES
  // each: { key, name, root, seats: [Object3D], cam: 'pod' | 'orbit', speed (0..1, eased toward want), want, update(dt, t, k) }
  const ride = (key, name, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.name = 'ride ' + key; root.add(g); const r = { key, name, x, z, root: g, seats: [], speed: 0, want: 0, phase: 0, t: 0, cycle: Math.random() * 20 }; C.rides[key] = r; return r; };
  const rider = (parent, x, y, z, col) => { const L = []; P(L, new THREE.CapsuleGeometry(0.2, 0.35, 3, 8), col, M4(x, y + 0.35, z)); P(L, new THREE.SphereGeometry(0.17, 8, 6), '#e9d2b4', M4(x, y + 0.85, z)); P(L, new THREE.SphereGeometry(0.07, 6, 4), '#e9d2b4', M4(x - 0.12, y + 1.0, z)); P(L, new THREE.SphereGeometry(0.07, 6, 4), '#e9d2b4', M4(x + 0.12, y + 1.0, z)); return L; };
  const RIDER_C = ['#c45a48', '#5b86a3', '#e8c95a', '#7fb36a', '#b9a3d6', '#e88a3a'];

  // ---- BUSTLER (the Hustler ref): striped platform 18 x 14, ramp to the midway, blue arch with letter discs, sign, 8 sweeps with tubs
  {
    const [x, z] = RIDES_AT.bustler, R = ride('bustler', 'THE BUSTLER', x, z), g = R.root, PH = 1.5;
    const skirt = stripes([PALC.blue, '#f4f1ea'], 36), skirtS = stripes([PALC.blue, '#f4f1ea'], 28);
    const front = tex(1024, 96, (c, w, h) => { for (let i = 0; i < 36; i++) { c.fillStyle = i % 2 ? '#f4f1ea' : PALC.blue; c.fillRect(i * w / 36, 0, w / 36 + 1, h); }
      c.font = `900 ${h * 0.82}px "Cooper Black","Arial Black",Futura,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = '#7a1e18'; c.lineJoin = 'round'; c.strokeText('BUSTLER', w * 0.62, h * 0.55); c.fillStyle = PALC.redL; c.fillText('BUSTLER', w * 0.62, h * 0.55); });
    const deckMat = feltMat('#4a5a74'); const skirtM = [feltMat('#fff', { map: skirtS }), feltMat('#fff', { map: skirtS }), deckMat, deckMat, feltMat('#fff', { map: front }), feltMat('#fff', { map: skirt })];
    const plat = new THREE.Mesh(new THREE.BoxGeometry(18, PH, 14), skirtM); plat.position.y = PH / 2; plat.castShadow = plat.receiveShadow = true; g.add(plat);
    const L = []; // ramp + steps down to the midway (+z), blue railings
    for (let i = 0; i < 6; i++) P(L, box(4.2, 0.25, 0.55), '#4a5a74', M4(-5, PH - (i + 1) * 0.25, 7.3 + i * 0.55)); P(L, box(4.4, PH, 3.4), '#e8e6e0', M4(-5, PH / 2 - 0.02, 8.6, 0, 0, 0, 1, 0.98, 1));
    P(L, box(2.2, 2.4, 1.6), '#f4f1ea', M4(4.2, 1.2, 9.4)); P(L, box(2.6, 0.22, 2.0), PALC.blue, M4(4.2, 2.5, 9.4)); P(L, box(0.6, 0.6, 0.04), '#3a4552', M4(4.2, 1.6, 10.22));   // the little white ticket booth in front
    P(L, cyl(1.4, 1.8, 2.2, 14), '#c3d2e9', M4(0, PH + 1.1, 0)); P(L, cyl(0.5, 0.5, 4.0, 10), '#6c7276', M4(0, PH + 2.0, 0));
    merged(L, g);
    const rails = []; for (const sx of [-7.1, -2.9]) { rails.push([V(sx, PH + 1.0, 7.0), V(sx, 1.0, 10.3), 0.08]); for (let i = 0; i <= 4; i++) { const t = i / 4; rails.push([V(sx, PH * (1 - t) + 0.02, 7.0 + t * 3.3), V(sx, PH * (1 - t) + 1.0, 7.0 + t * 3.3), 0.06]); } }
    for (let i = 0; i < 18; i++) { const a = V(-9 + i, PH, -7), b = V(-9 + i, PH + 1.0, -7); rails.push([a, b, 0.05]); } rails.push([V(-9, PH + 1, -7), V(9, PH + 1, -7), 0.07]); rails.push([V(9, PH + 1, -7), V(9, PH + 1, 7), 0.07]); rails.push([V(-9, PH + 1, -7), V(-9, PH + 1, 7), 0.07]);
    struts(g, rails, feltMat(PALC.blue));
    // the arch: blue steel tube over the platform with 7 white letter discs
    const arc = new THREE.CatmullRomCurve3([V(-8.5, PH, -3), V(-7, 6.5, -3), V(-3.5, 9.4, -3), V(0, 10.2, -3), V(3.5, 9.4, -3), V(7, 6.5, -3), V(8.5, PH, -3)]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(arc, 40, 0.2, 6, false), feltMat(PALC.blue)); tube.castShadow = true; g.add(tube);
    const tube2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc.points.map(p => V(p.x * 0.92, p.y * 0.9 + 0.2, p.z))), 40, 0.12, 6, false), feltMat(PALC.blue)); g.add(tube2);
    const letters = 'BUSTLER', lc = [PALC.yellow, PALC.teal, PALC.redL, '#7fb36a', PALC.blue, PALC.pink, '#e88a3a'];
    for (let i = 0; i < 7; i++) { const p = arc.getPoint(0.14 + i * 0.12); const t = label(letters[i], { w: 128, h: 128, bg: '#f4f1ea', fg: lc[i], r: 64, border: '#c3d2e9' });
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 18), [feltMat('#f4f1ea'), feltMat('#fff', { map: t }), feltMat('#fff', { map: t })]); d.rotation.x = Math.PI / 2; d.rotation.y = 0; d.position.set(p.x, p.y + 0.55, p.z); d.castShadow = true; g.add(d); }
    // the box sign on a pole (ref: "HUSTLER" sign above the ride)
    const sp = []; P(sp, cyl(0.12, 0.12, 4.6, 8), PALC.steel, M4(-1.5, PH + 7.7, -6)); merged(sp, g);
    const sgn = texMesh(new THREE.BoxGeometry(5.4, 1.1, 0.3), null, g, M4(-1.5, PH + 10.3, -6)); const st = label('BUSTLER', { w: 512, h: 104, bg: '#f4f1ea', fg: PALC.blue, border: PALC.blue, font: '900 64px "Cooper Black","Arial Black",sans-serif' });
    sgn.material = [feltMat(PALC.blue), feltMat(PALC.blue), feltMat(PALC.blue), feltMat(PALC.blue), feltMat('#fff', { map: st }), feltMat('#fff', { map: st })];
    const ab = []; for (let i = 0; i <= 30; i++) ab.push(arc.getPoint(i / 30).clone().add(V(0, 0.28, 0.15))); bulbs(near, ab.map(p => p.clone().applyMatrix4(M4(x, 0, z))), ['#fff1b8', '#ff9a7a'], 0.12, 'bustler');
    // the sweep: hub spins, the 8 arms rise (like the real thing) and each tub turns
    const hub = new THREE.Group(); hub.position.set(0, PH + 3.6, 0); g.add(hub); R.hub = hub;
    for (let i = 0; i < 8; i++) { const arm = new THREE.Group(); arm.rotation.y = i / 8 * Math.PI * 2; hub.add(arm); const piv = new THREE.Group(); arm.add(piv);
      const A = []; P(A, box(0.3, 0.3, 6.0), '#6c7276', M4(0, 0, 3.0)); P(A, box(0.18, 1.6, 0.18), '#6c7276', M4(0, -0.8, 5.9)); merged(A, piv);
      const tub = new THREE.Group(); tub.position.set(0, -1.6, 5.9); piv.add(tub); const T = []; const col = i % 2 ? PALC.redL : PALC.blue;
      P(T, cyl(0.95, 0.75, 0.9, 14), col, M4(0, -0.45, 0)); P(T, cyl(1.0, 1.0, 0.14, 14), '#f4f1ea', M4(0, 0.02, 0)); P(T, box(1.4, 0.6, 0.3), '#f4f1ea', M4(0, -0.1, -0.5));
      if (i % 3 !== 1) T.push(...rider(null, 0.2, -0.75, 0.1, RIDER_C[i % 6])); merged(T, tub);
      const seat = new THREE.Object3D(); seat.position.set(0, -0.75, 0.2); tub.add(seat); R.seats.push(seat); arm.userData = { piv, tub }; }
    R.arms = hub.children;
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 1.9 * k; hub.rotation.y = R.phase; const lift = R.speed * (0.45 + 0.12 * Math.sin(t * 0.7)); for (const a of R.arms) { a.userData.piv.rotation.x = -lift; a.userData.tub.rotation.x = lift; a.userData.tub.rotation.y = R.phase * 1.3; } };
    addBox(x - 9, z - 7, x + 9, z + 7, 1.6, 'bustler'); addBox(x - 7.2, z + 7, x - 2.8, z + 10.3, 0.6, 'bustler_ramp_skip'); boxes.pop();
    R.board = { x: x - 5, z: z + 11.2 }; R.cam = 'orbit';
  }

  // ---- SKY WHEEL (ref: tall steel lattice wheel, open bench seats). Plane faces the midway (XY), axle along z.
  {
    const [x, z] = RIDES_AT.wheel, R = ride('wheel', 'THE SKY WHEEL', x, z), g = R.root, AX = 13.2, RAD = 11, N = 12;
    const S = []; // A-frame lattice towers (two per side)
    for (const sz of [-1.7, 1.7]) for (const sx of [-1, 1]) { const foot = V(sx * 6.2, 0, sz * 2.4), top = V(sx * 0.4, AX, sz);
      for (const o of [-0.35, 0.35]) S.push([foot.clone().add(V(0, 0, o)), top.clone().add(V(0, 0, o * 0.4)), 0.2]);
      for (let i = 0; i < 14; i++) { const a = foot.clone().lerp(top, i / 14).add(V(0, 0, -0.35 + 0.7 * (1 - i / 14) * 0 - 0.35 * (1 - i / 14) * 0)), b = foot.clone().lerp(top, (i + 1) / 14); S.push([a.clone().add(V(0, 0, (i % 2 ? 0.35 : -0.35) * (1 - i / 14 * 0.6))), b.clone().add(V(0, 0, (i % 2 ? -0.35 : 0.35) * (1 - (i + 1) / 14 * 0.6))), 0.07]); } }
    for (const sz of [-1.7, 1.7]) { S.push([V(-4.4, 3.8, sz * 1.85), V(4.4, 3.8, sz * 1.85), 0.12]); S.push([V(-2.6, 7.4, sz * 1.5), V(2.6, 7.4, sz * 1.5), 0.1]); }
    S.push([V(0, AX, -2.2), V(0, AX, 2.2), 0.36]);
    struts(g, S); const L = []; P(L, box(15, 0.5, 6.6), '#6a6660', M4(0, 0.25, 0)); P(L, box(4, 0.7, 2.4), '#4a5a74', M4(0, 0.35, 4.2)); P(L, box(1.4, 1.3, 1.0), PALC.redL, M4(5.6, 0.65, 4.0)); merged(L, g);
    // the wheel: two rims, lattice spokes (zigzag pairs), cross braces, and N seats kept level
    const wheel = new THREE.Group(); wheel.position.set(0, AX, 0); g.add(wheel); R.wheel = wheel; const W = [];
    for (const rz of [-1.05, 1.05]) { const seg = 36; for (let i = 0; i < seg; i++) { const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2; W.push([V(Math.cos(a0) * RAD, Math.sin(a0) * RAD, rz), V(Math.cos(a1) * RAD, Math.sin(a1) * RAD, rz), 0.16]);
        W.push([V(Math.cos(a0) * RAD * 0.62, Math.sin(a0) * RAD * 0.62, rz), V(Math.cos(a1) * RAD * 0.62, Math.sin(a1) * RAD * 0.62, rz), 0.1]); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = a + Math.PI / 16, ca = Math.cos(a), sa = Math.sin(a); W.push([V(ca * 0.6, sa * 0.6, rz * 0.4), V(ca * RAD, sa * RAD, rz), 0.09]); W.push([V(Math.cos(b) * 0.6, Math.sin(b) * 0.6, rz * 0.4), V(ca * RAD * 0.62, sa * RAD * 0.62, rz), 0.06]); } }
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, c = Math.cos(a) * RAD, s = Math.sin(a) * RAD; W.push([V(c, s, -1.05), V(c, s, 1.05), 0.1]); }
    struts(wheel, W, steelMat, true);
    const wb = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (let j = 1; j <= 5; j++) wb.push(V(Math.cos(a) * RAD * j / 5.4, Math.sin(a) * RAD * j / 5.4, 1.15)); } for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; wb.push(V(Math.cos(a) * (RAD + 0.25), Math.sin(a) * (RAD + 0.25), 1.15)); }
    bulbs(wheel, wb, ['#fff1b8', '#ffd27a', '#ff9a7a'], 0.13, 'wheel');
    R.pods = []; for (let i = 0; i < N; i++) { const pod = new THREE.Group(); wheel.add(pod); const a = i / N * Math.PI * 2; pod.position.set(Math.cos(a) * RAD, Math.sin(a) * RAD, 0); const Q = [];
      P(Q, box(0.08, 1.2, 0.08), '#2f3a46', M4(0, -0.6, -0.95)); P(Q, box(0.08, 1.2, 0.08), '#2f3a46', M4(0, -0.6, 0.95)); P(Q, box(0.9, 0.12, 2.0), PALC.seat, M4(0, -1.25, 0)); P(Q, box(0.12, 0.75, 2.0), PALC.seat, M4(-0.42, -0.9, 0));
      P(Q, box(0.06, 0.06, 2.0), '#c9c4bb', M4(0.45, -0.78, 0)); P(Q, box(1.0, 0.1, 2.1), PALC.seat, M4(-0.05, -0.02, 0));
      if (i % 3 === 0) Q.push(...rider(null, -0.05, -1.25, -0.45, RIDER_C[i % 6])); if (i % 4 === 1) Q.push(...rider(null, -0.05, -1.25, 0.45, RIDER_C[(i + 3) % 6]));
      merged(Q, pod); const seat = new THREE.Object3D(); seat.position.set(0.0, -1.2, 0.0); pod.add(seat); R.seats.push(seat); R.pods.push(pod); }
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 0.22 * k; wheel.rotation.z = R.phase; const sway = 0.05 * Math.sin(t * 1.3) * R.speed + (C.wildK > 0.01 ? Math.sin(t * 3.1) * 0.3 * C.wildK : 0);
      for (const p of R.pods) p.rotation.z = -R.phase + sway; };
    R.rad = RAD; R.ax = AX; R.n = N;
    for (const [fx, fz] of [[-6.2, -4.1], [6.2, -4.1], [-6.2, 4.1], [6.2, 4.1]]) circ(x + fx, z + fz, 0.6); addBox(x - 7.5, z - 3.3, x + 7.5, z + 3.3, 0.5, 'wheel_base');
    R.board = { x, z: z + 6.6 }; R.cam = 'pod';
  }

  // ---- TWIRL-TOP (ref: cream/red striped dome spinner with a spire, seats on arms underneath)
  {
    const [x, z] = RIDES_AT.twirl, R = ride('twirl', 'THE TWIRL-TOP', x, z), g = R.root;
    const domeT = tex(512, 256, (c, w, h) => { c.fillStyle = PALC.cream; c.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { c.fillStyle = PALC.domeRed; c.beginPath(); const x0 = i * w / 16; c.moveTo(x0 + w / 64, 0); c.lineTo(x0 + w / 32 + w / 64, 0); c.lineTo(x0 + w / 16 * 0.55, h * 0.62); c.lineTo(x0 + w / 16 * 0.45, h * 0.62); c.fill(); }
      c.fillStyle = PALC.domeRed; c.fillRect(0, h * 0.7, w, h * 0.12); c.fillStyle = '#efe0c0'; c.fillRect(0, h * 0.83, w, h * 0.17); });
    const L = []; P(L, cyl(6.6, 6.8, 0.5, 28), '#5f5a58', M4(0, 0.25, 0)); P(L, cyl(0.7, 0.9, 3.2, 12), '#efe0c0', M4(0, 1.9, 0)); merged(L, g);
    const spin = new THREE.Group(); g.add(spin); R.spin = spin;
    const dome = texMesh(new THREE.SphereGeometry(5.2, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeT, spin, M4(0, 3.4, 0, 0, 0, 0, 1, 0.62, 1)); dome.name = 'twirl dome';
    const D = []; P(D, cyl(5.25, 5.25, 0.3, 28, true), PALC.domeRed, M4(0, 3.45, 0)); P(D, cyl(0.25, 0.4, 5.0, 8), '#d9cfc0', M4(0, 8.4, 0)); P(D, new THREE.ConeGeometry(0.45, 1.6, 8), '#efe0c0', M4(0, 11.6, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const s = []; } merged(D, spin);
    const sp = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; sp.push([V(Math.cos(a) * 1.4, 6.3, Math.sin(a) * 1.4), V(Math.cos(a) * 0.2, 11.0, Math.sin(a) * 0.2), 0.09]); } struts(spin, sp, feltMat('#d9cfc0'));
    const tb = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; tb.push(V(Math.cos(a) * 5.3, 3.55, Math.sin(a) * 5.3)); } for (let i = 0; i < 10; i++) tb.push(V(0, 6.6 + i * 0.5, 0.3)); bulbs(spin, tb, ['#fff1b8', '#ff9a7a'], 0.12, 'twirl');
    R.tubs = []; for (let i = 0; i < 8; i++) { const arm = new THREE.Group(); arm.rotation.y = i / 8 * Math.PI * 2; spin.add(arm); const A = []; P(A, box(0.18, 0.18, 4.4), '#6c7276', M4(0, 3.0, 3.0, 0.32)); P(A, box(0.1, 1.4, 0.1), '#6c7276', M4(0, 1.75, 5.3)); merged(A, arm);
      const tub = new THREE.Group(); tub.position.set(0, 1.0, 5.3); arm.add(tub); const T = []; const col = [PALC.yellow, PALC.domeRed, PALC.teal, PALC.cream][i % 4];
      P(T, cyl(0.85, 0.7, 0.7, 12), col, M4(0, -0.1, 0)); P(T, box(1.2, 0.55, 0.22), '#f4f1ea', M4(0, 0.15, -0.45)); if (i % 2 === 0) T.push(...rider(null, 0, -0.35, 0.1, RIDER_C[(i + 2) % 6])); merged(T, tub);
      const seat = new THREE.Object3D(); seat.position.set(0, -0.35, 0.1); tub.add(seat); R.seats.push(seat); R.tubs.push({ arm, tub }); }
    const F = []; for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, b = (i + 1) / 30 * Math.PI * 2; F.push([V(Math.cos(a) * 7.4, 1.05, Math.sin(a) * 7.4), V(Math.cos(b) * 7.4, 1.05, Math.sin(b) * 7.4), 0.07]); F.push([V(Math.cos(a) * 7.4, 0, Math.sin(a) * 7.4), V(Math.cos(a) * 7.4, 1.1, Math.sin(a) * 7.4), 0.07]); F.push([V(Math.cos(a) * 7.4, 0.1, Math.sin(a) * 7.4), V(Math.cos(b) * 7.4, 1.0, Math.sin(b) * 7.4), 0.04]); }
    struts(g, F, feltMat('#c9c4bb'), false);
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 1.2 * k; spin.rotation.y = R.phase; for (const [i, o] of R.tubs.entries()) { o.tub.rotation.y = R.phase * 2.2 + i; o.arm.children[0].position.y = 0; o.tub.position.y = 1.0 + R.speed * (0.6 + 0.5 * Math.sin(t * 1.4 + i)); } };
    circ(x, z, 7.5); R.board = { x, z: z + 8.4 }; R.cam = 'orbit';
  }

  // ---- RHUMBA (ref: Calypso — blue disc, round cars w/ striped umbrellas, centre stick-fan, pastel zigzag Googie mural, marquee script sign, white fence)
  {
    const [x, z] = RIDES_AT.rhumba, R = ride('rhumba', 'THE RHUMBA', x, z), g = R.root, RD = 8.6;
    const discT = tex(512, 512, (c, w, h) => { c.fillStyle = PALC.disc; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2); for (let i = 0; i < 24; i++) { c.rotate(Math.PI * 2 / 24); c.fillStyle = i % 2 ? '#6d97b2' : '#53809c'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.52, -w * 0.06); c.lineTo(w * 0.52, w * 0.06); c.fill(); }
      c.fillStyle = '#7aa4bd'; c.beginPath(); c.arc(0, 0, w * 0.12, 0, 7); c.fill(); });
    const disc = new THREE.Mesh(cyl(RD, RD + 0.2, 0.45, 40), [feltMat('#46708c'), feltMat('#fff', { map: discT }), feltMat('#46708c')]); disc.position.y = 0.23; disc.receiveShadow = true; g.add(disc);
    const spin = new THREE.Group(); g.add(spin); R.spin = spin;
    const L = []; P(L, cyl(1.9, 0.9, 1.4, 16, true), PALC.teal, M4(0, 1.1, 0)); P(L, cyl(0.9, 0.9, 0.3, 16), PALC.teal, M4(0, 0.5, 0)); merged(L, spin);
    const fan = [], fc = [PALC.redL, '#f4f1ea', PALC.blue, PALC.yellow, '#e88a3a', PALC.pink, PALC.teal]; for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, tilt = 0.25 + (i % 3) * 0.08; fan.push([V(Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5), V(Math.cos(a) * (0.5 + 3.6 * Math.sin(tilt)), 1.2 + 3.6 * Math.cos(tilt) + (i % 2) * 0.4, Math.sin(a) * (0.5 + 3.6 * Math.sin(tilt))), 0.22]); }
    const fim = struts(spin, fan, feltMat('#ffffff')); fan.forEach((_, i) => fim.setColorAt(i, _c.set(fc[i % fc.length])));
    const umbT = stripes([PALC.pink, '#f4f1ea', PALC.teal, '#f4f1ea', PALC.yellow, '#f4f1ea'], 12);
    R.sweeps = []; for (let s = 0; s < 4; s++) { const sw = new THREE.Group(); sw.rotation.y = s / 4 * Math.PI * 2; spin.add(sw); const A = []; P(A, box(0.26, 0.2, 5.0), '#6c7276', M4(0, 0.62, 2.5)); merged(A, sw);
      const hubB = new THREE.Group(); hubB.position.set(0, 0, 5.0); sw.add(hubB); const cars = [];
      for (let j = 0; j < 3; j++) { const arm = new THREE.Group(); arm.rotation.y = j / 3 * Math.PI * 2; hubB.add(arm); const car = new THREE.Group(); car.position.set(0, 0.45, 1.8); arm.add(car); const C2 = []; const col = [PALC.carRed, PALC.carWhite, PALC.carTeal][(s + j) % 3];
        P(C2, new THREE.SphereGeometry(0.95, 14, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.5), col, M4(0, 0.6, 0, 0, 0, 0, 1, 0.75, 1.15)); P(C2, cyl(0.98, 0.98, 0.14, 14), '#f4f1ea', M4(0, 0.5, 0, 0, 0, 0, 1, 1, 1.15)); P(C2, box(1.3, 0.6, 0.2), col, M4(0, 0.85, -0.65));
        P(C2, cyl(0.04, 0.04, 2.0, 5), '#c9c4bb', M4(0, 1.6, 0.2)); P(C2, box(0.25, 0.2, 2.0), '#6c7276', M4(0, 0.15, -1.0)); if ((s + j) % 2 === 0) C2.push(...rider(null, 0, 0.25, 0.1, RIDER_C[(s * 3 + j) % 6]));
        merged(C2, car); texMesh(new THREE.ConeGeometry(1.15, 0.45, 12, 1, true), umbT, car, M4(0, 2.75, 0.2), { side: THREE.DoubleSide });
        const seat = new THREE.Object3D(); seat.position.set(0, 0.3, 0.1); car.add(seat); R.seats.push(seat); cars.push({ arm, car }); }
      R.sweeps.push({ sw, hubB, cars }); }
    // the Googie mural: pastel zigzag panels on an arc behind the ride (north), peaked tops
    const muralT = tex(512, 320, (c, w, h) => { const cols = [PALC.pink, PALC.teal, PALC.yellow, '#f4f1ea', '#e8b0c8', '#9ad0d0'];
      c.fillStyle = '#f4f1ea'; c.beginPath(); c.moveTo(0, h * 0.28); c.lineTo(w * 0.16, h * 0.02); c.lineTo(w * 0.32, h * 0.22); c.lineTo(w * 0.5, h * 0.0); c.lineTo(w * 0.68, h * 0.22); c.lineTo(w * 0.84, h * 0.02); c.lineTo(w, h * 0.28); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.save(); c.clip();
      c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); const x0 = (i / 14) * w * 1.2 - w * 0.1; c.moveTo(x0, h); c.lineTo(x0 + w * 0.12, h * 0.25); c.lineTo(x0 + w * 0.2, h); c.fill(); }
      for (let i = 0; i < 6; i++) { c.fillStyle = cols[(i + 2) % cols.length]; c.beginPath(); c.arc(w * (0.1 + i * 0.17), h * (0.45 + (i % 2) * 0.2), w * 0.06, 0, 7); c.fill(); }
      c.strokeStyle = '#2b1e3c'; c.lineWidth = 3; c.globalAlpha = 0.35; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(i * w / 9, h); c.lineTo(i * w / 9 + w * 0.08, h * 0.3); c.stroke(); } c.restore();
      c.strokeStyle = PALC.yellow; c.lineWidth = 10; c.beginPath(); c.moveTo(0, h * 0.28); c.lineTo(w * 0.16, h * 0.02); c.lineTo(w * 0.32, h * 0.22); c.lineTo(w * 0.5, h * 0.0); c.lineTo(w * 0.68, h * 0.22); c.lineTo(w * 0.84, h * 0.02); c.lineTo(w, h * 0.28); c.stroke(); });
    const mm = feltMat('#ffffff', { map: muralT, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }); const MR = 11.6;
    for (let i = 0; i < 6; i++) { const a = Math.PI * 1.12 + i / 5 * Math.PI * 0.76, pm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.4), mm); pm.position.set(Math.cos(a) * MR, 2.2, Math.sin(a) * MR); pm.lookAt(0, 2.2, 0); pm.castShadow = true; g.add(pm); }
    { const PS = []; for (let i = 0; i < 7; i++) { const a = Math.PI * 1.12 - 0.12 + i / 6 * (Math.PI * 0.76 + 0.24); PS.push([V(Math.cos(a) * (MR + 0.25), 0, Math.sin(a) * (MR + 0.25)), V(Math.cos(a) * (MR + 0.25), 4.2, Math.sin(a) * (MR + 0.25)), 0.16]); } struts(g, PS, feltMat('#d9cfc0')); }
    // marquee script sign on two posts above the mural
    const scr = tex(1024, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.font = `italic 700 ${h * 0.7}px "Brush Script MT","Snell Roundhand","Segoe Script",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 26; c.strokeStyle = '#d9cfc0'; c.lineJoin = 'round'; c.strokeText('Rhumba', w / 2, h * 0.55); c.lineWidth = 8; c.strokeStyle = '#6b97b0'; c.strokeText('Rhumba', w / 2, h * 0.55); c.fillStyle = '#f4f1ea'; c.fillText('Rhumba', w / 2, h * 0.55);
      c.fillStyle = '#fff1b8'; for (let i = 0; i < 46; i++) { c.beginPath(); c.arc(w * 0.12 + i * w * 0.0168, h * 0.18 + Math.sin(i * 0.9) * 6, 5, 0, 7); c.fill(); } });
    const sgm = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 2.4), new THREE.MeshBasicMaterial({ map: scr, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, toneMapped: false })); sgm.position.set(0, 6.4, -MR - 0.3); g.add(sgm); C.rhumbaSign = sgm;
    { const PS = [[V(-3, 0, -MR - 0.4), V(-3, 6.0, -MR - 0.4), 0.12], [V(3, 0, -MR - 0.4), V(3, 6.0, -MR - 0.4), 0.12]]; struts(g, PS); }
    const sb = []; for (let i = 0; i < 26; i++) sb.push(V(-4.4 + i * 0.35, 7.55 + Math.sin(i * 0.9) * 0.05, -MR - 0.2)); bulbs(g, sb, ['#fff1b8'], 0.1, 'rhumba');
    // the low white fence (front half), with a gap at the boarding gate
    const F = []; for (let i = 0; i < 28; i++) { const a = -0.15 + i / 28 * (Math.PI + 0.3), b = -0.15 + (i + 1) / 28 * (Math.PI + 0.3); if (i === 13) continue; const r = RD + 1.4;
      F.push([V(Math.cos(a) * r, 0.95, Math.sin(a) * r), V(Math.cos(b) * r, 0.95, Math.sin(b) * r), 0.07]); F.push([V(Math.cos(a) * r, 0.5, Math.sin(a) * r), V(Math.cos(b) * r, 0.5, Math.sin(b) * r), 0.05]); F.push([V(Math.cos(a) * r, 0, Math.sin(a) * r), V(Math.cos(a) * r, 1.0, Math.sin(a) * r), 0.08]); }
    struts(g, F, feltMat('#f4f1ea'), false);
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 0.9 * k; spin.rotation.y = R.phase; for (const [s, o] of R.sweeps.entries()) { o.hubB.rotation.y = -R.phase * 2.6 + s; for (const cr of o.cars) cr.car.rotation.y = R.phase * 0.5; } };
    circ(x, z, RD + 0.4); addBox(x - MR - 0.6, z - MR - 1.0, x + MR + 0.6, z - MR + 2.6, 4.4, 'rhumba_mural');
    R.board = { x, z: z + RD + 2.4 }; R.cam = 'orbit';
  }

  // ---- ONE HORSE CAROUSEL: striped canopy, twelve copies of the same horse
  {
    const [x, z] = RIDES_AT.carousel, R = ride('carousel', 'THE ONE HORSE CAROUSEL', x, z), g = R.root;
    const L = []; P(L, cyl(6.6, 6.8, 0.45, 32), '#c9a26e', M4(0, 0.22, 0)); merged(L, g);
    const spin = new THREE.Group(); g.add(spin); R.spin = spin; const S2 = []; P(S2, cyl(6.4, 6.4, 0.18, 32), '#e8dcc4', M4(0, 0.52, 0)); P(S2, cyl(1.3, 1.3, 4.2, 14), PALC.cream, M4(0, 2.6, 0)); P(S2, cyl(6.9, 6.9, 0.6, 32, true), PALC.redL, M4(0, 4.9, 0)); merged(S2, spin);
    const canT = tex(512, 128, (c, w, h) => { for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#f4f1ea' : PALC.redL; c.fillRect(i * w / 24, 0, w / 24 + 1, h); } });
    texMesh(new THREE.ConeGeometry(7.1, 2.6, 24, 1), canT, spin, M4(0, 6.5, 0)); const top = []; P(top, new THREE.SphereGeometry(0.4, 10, 8), PALC.yellow, M4(0, 7.9, 0)); P(top, cyl(0.06, 0.06, 1.2, 5), '#c9a26e', M4(0, 8.4, 0)); merged(top, spin);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), feltMat(PALC.blue, { side: THREE.DoubleSide })); fl.position.set(0.4, 8.75, 0); spin.add(fl);
    const cb = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; cb.push(V(Math.cos(a) * 6.95, 4.6, Math.sin(a) * 6.95)); } bulbs(spin, cb, ['#fff1b8', '#ffd27a'], 0.11, 'carousel');
    // one horse (felt) — reused twelve times
    const H = []; P(H, new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), '#f4f1ea', M4(0, 0, 0, 0, 0, Math.PI / 2)); P(H, new THREE.CapsuleGeometry(0.15, 0.55, 3, 8), '#f4f1ea', M4(0.62, 0.35, 0, 0, 0, -0.7)); P(H, box(0.5, 0.26, 0.26), '#f4f1ea', M4(0.95, 0.62, 0, 0, 0, -0.35));
    for (const [lx, lz] of [[0.42, 0.14], [0.42, -0.14], [-0.42, 0.14], [-0.42, -0.14]]) P(H, cyl(0.07, 0.06, 0.75, 6), '#f4f1ea', M4(lx, -0.48, lz, 0, 0, lx > 0 ? 0.5 : -0.4));
    P(H, box(0.5, 0.06, 0.5), PALC.redL, M4(0, 0.32, 0)); P(H, box(0.3, 0.4, 0.06), '#b98326', M4(0.65, 0.55, 0)); P(H, new THREE.ConeGeometry(0.08, 0.45, 6), '#b98326', M4(-0.62, 0.0, 0, 0, 0, 1.9)); P(H, new THREE.SphereGeometry(0.035, 5, 4), '#2b1e3c', M4(1.02, 0.7, 0.13)); P(H, new THREE.SphereGeometry(0.035, 5, 4), '#2b1e3c', M4(1.02, 0.7, -0.13));
    const hg = mergeGeometries(H, false); R.horses = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? 4.9 : 3.4; const h = new THREE.Mesh(hg, VC); h.castShadow = true; const pole = new THREE.Mesh(cyl(0.05, 0.05, 4.4, 6), feltMat('#d9b23a'));
      const hold = new THREE.Group(); hold.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); hold.rotation.y = -a + Math.PI; spin.add(hold); pole.position.y = 2.7; hold.add(pole); h.position.y = 1.6; hold.add(h);
      const seat = new THREE.Object3D(); seat.position.set(0, 0.18, 0); seat.rotation.y = -Math.PI / 2; h.add(seat); R.seats.push(seat); R.horses.push(h); }
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 0.55 * k; spin.rotation.y = R.phase; for (const [i, h] of R.horses.entries()) h.position.y = 1.55 + Math.sin(R.phase * 4 + i * 1.3) * 0.35 * R.speed; };
    circ(x, z, 7.0); R.board = { x: x + 7.8, z: z - 2.0 }; R.cam = 'orbit';
  }

  // ---- TIPSY CUPS (teacups)
  {
    const [x, z] = RIDES_AT.cups, R = ride('cups', 'TIPSY CUPS', x, z), g = R.root; const L = []; P(L, cyl(6.2, 6.4, 0.4, 30), '#e8dcc4', M4(0, 0.2, 0)); merged(L, g);
    const spin = new THREE.Group(); g.add(spin); R.spin = spin; const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.55 + Math.sin(t * Math.PI * 0.5) * 0.85, t * 1.1)); }
    const cupG = new THREE.LatheGeometry(prof, 16); R.cups = []; const cc = [PALC.pink, PALC.teal, PALC.yellow, '#b9a3d6', '#9fd3c7', '#e88a3a'];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const cup = new THREE.Group(); cup.position.set(Math.cos(a) * 3.8, 0.4, Math.sin(a) * 3.8); spin.add(cup); const m = new THREE.Mesh(cupG, feltMat(cc[i], { side: THREE.DoubleSide })); m.castShadow = true; cup.add(m);
      const Q = []; P(Q, new THREE.TorusGeometry(0.35, 0.08, 6, 10, Math.PI), '#f4f1ea', M4(1.42, 0.65, 0, 0, 0, -Math.PI / 2)); P(Q, cyl(0.6, 0.6, 0.12, 12), '#f4f1ea', M4(0, 0.1, 0)); if (i % 2) Q.push(...rider(null, 0, 0.05, 0.45, RIDER_C[i])); merged(Q, cup);
      const seat = new THREE.Object3D(); seat.position.set(0, 0.1, -0.35); cup.add(seat); R.seats.push(seat); R.cups.push(cup); }
    R.update = (dt, t, k) => { R.phase += dt * R.speed * 0.7 * k; spin.rotation.y = R.phase; for (const [i, c] of R.cups.entries()) c.rotation.y = R.phase * (2.4 + i * 0.3) * (i % 2 ? 1 : -1); };
    circ(x, z, 6.5); R.board = { x: x - 7.4, z: z - 2.0 }; R.cam = 'orbit';
  }

  // ---- BUMP CITY (bumper cars): steel floor, posts, striped canopy, ceiling grid, round cars with poles
  {
    const [x, z] = RIDES_AT.bump, R = ride('bump', 'BUMP CITY', x, z), g = R.root, W = 18, D = 11; R.W = W; R.D = D;
    const L = []; P(L, box(W + 1, 0.3, D + 1), '#6a6e74', M4(0, 0.15, 0)); P(L, box(W + 1.4, 0.5, 0.4), '#f4f1ea', M4(0, 0.25, -D / 2 - 0.7)); P(L, box(0.4, 0.5, D + 1.4), '#f4f1ea', M4(-W / 2 - 0.7, 0.25, 0)); P(L, box(0.4, 0.5, D + 1.4), '#f4f1ea', M4(W / 2 + 0.7, 0.25, 0));
    P(L, box(W / 2 - 1.5, 0.5, 0.4), '#f4f1ea', M4(-W / 4 - 0.75, 0.25, D / 2 + 0.7)); P(L, box(W / 2 - 1.5, 0.5, 0.4), '#f4f1ea', M4(W / 4 + 0.75, 0.25, D / 2 + 0.7));
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) P(L, cyl(0.15, 0.15, 4.4, 8), '#f4f1ea', M4(sx * (W / 2 + 0.7), 2.4, sz * (D / 2 + 0.7)));
    P(L, box(W + 2.4, 0.3, D + 2.4), '#2f3a46', M4(0, 4.6, 0)); merged(L, g);
    const roofT = stripes([PALC.redL, '#f4f1ea'], 18); texMesh(new THREE.BoxGeometry(W + 2.6, 0.9, D + 2.6), roofT, g, M4(0, 5.2, 0));
    const sgn = texMesh(new THREE.PlaneGeometry(8, 1.4), label('BUMP CITY', { w: 640, h: 112, bg: '#f4f1ea', fg: PALC.redL, border: PALC.yellow }), g, M4(0, 6.4, D / 2 + 1.35));
    const rb = []; for (let i = 0; i < 34; i++) rb.push(V(-W / 2 - 1.2 + i * (W + 2.4) / 33, 4.75, D / 2 + 1.35)); bulbs(g, rb, ['#fff1b8', '#ff9a7a', '#bfe6ff'], 0.11, 'bump');
    R.cars = []; const cc = [PALC.carRed, PALC.blue, PALC.yellow, PALC.carTeal, PALC.pink];
    for (let i = 0; i < 5; i++) { const car = new THREE.Group(); car.position.set(-6 + i * 3, 0.3, (i % 2 ? 2 : -2)); g.add(car); const Q = [];
      P(Q, cyl(0.95, 1.05, 0.55, 14), cc[i], M4(0, 0.38, 0, 0, 0, 0, 1, 1, 1.3)); P(Q, new THREE.TorusGeometry(1.08, 0.13, 6, 16), '#2b2628', M4(0, 0.2, 0, Math.PI / 2, 0, 0, 1, 1.3, 1)); P(Q, box(1.3, 0.7, 0.25), cc[i], M4(0, 0.8, -0.8));
      P(Q, cyl(0.04, 0.04, 3.6, 5), '#c9c4bb', M4(0, 2.4, -0.95)); P(Q, cyl(0.25, 0.25, 0.08, 10), '#2b2628', M4(0, 0.85, 0.55, 1.0)); if (i > 0) Q.push(...rider(null, 0, 0.35, -0.1, RIDER_C[i]));
      merged(Q, car); const seat = new THREE.Object3D(); seat.position.set(0, 0.35, -0.15); car.add(seat); R.seats.push(seat); R.cars.push({ g: car, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, yaw: Math.random() * 6, spin: 0, player: false }); }
    R.update = (dt, t, k) => { for (const c of R.cars) { if (c.player) continue; const sp = R.speed * k; c.g.position.x += c.vx * dt * sp; c.g.position.z += c.vz * dt * sp;
      if (Math.abs(c.g.position.x) > W / 2 - 1) { c.vx *= -1; c.g.position.x = Math.sign(c.g.position.x) * (W / 2 - 1); } if (Math.abs(c.g.position.z) > D / 2 - 1) { c.vz *= -1; c.g.position.z = Math.sign(c.g.position.z) * (D / 2 - 1); }
      c.yaw += (Math.atan2(c.vx, c.vz) - c.yaw) * 0; c.g.rotation.y = Math.atan2(c.vx, c.vz) + Math.sin(t * 2 + c.vx) * 0.2; } };
    addBox(x - W / 2 - 1, z - D / 2 - 1, x + W / 2 + 1, z - D / 2 - 0.4, 1, 'bump_n'); addBox(x - W / 2 - 1, z - D / 2 - 1, x - W / 2 - 0.4, z + D / 2 + 1, 1, 'bump_w'); addBox(x + W / 2 + 0.4, z - D / 2 - 1, x + W / 2 + 1, z + D / 2 + 1, 1, 'bump_e');
    addBox(x - W / 2 - 1, z + D / 2 + 0.4, x - 1.5, z + D / 2 + 1, 1, 'bump_s1'); addBox(x + 1.5, z + D / 2 + 0.4, x + W / 2 + 1, z + D / 2 + 1, 1, 'bump_s2');
    R.board = { x, z: z + D / 2 + 2.2 }; R.cam = 'orbit';
  }

  // ------------------------------------------------------------------ map + GO spots
  Object.assign(TS.spots, {
    carnival: { x: 75.4, z: 62, ry: -Math.PI / 2, map: 'One Horse Fair' },
    c_wheel: { x: RIDES_AT.wheel[0], z: RIDES_AT.wheel[1] + 7.4, ry: 0, map: 'Sky Wheel' },
    c_midway: { x: 96.5, z: 61.5, ry: 0, map: 'Midway games' },
    c_bustler: { x: RIDES_AT.bustler[0] - 5, z: RIDES_AT.bustler[1] + 12, ry: 0, map: 'The Bustler' },
    c_rhumba: { x: RIDES_AT.rhumba[0], z: RIDES_AT.rhumba[1] + 11.4, ry: 0, map: 'The Rhumba' },
    c_bump: { x: RIDES_AT.bump[0], z: RIDES_AT.bump[1] + 8, ry: 0, map: 'Bump City' },
  });

  // ------------------------------------------------------------------ night + WILD
  const Q = new URLSearchParams(location.search); C.nightT = Q.has('night') ? 1 : 0; C.night = C.nightT;
  const glow = new THREE.PointLight('#ffcf8a', 0, 70, 1.6); glow.position.set(FAIR.cx, 9, FAIR.cz + 10); root.add(glow);
  const lights = []; scene.traverse(o => { if (o.isLight && o !== glow) lights.push({ o, b: o.intensity, last: o.intensity }); });
  const NIGHT_BG = new THREE.Color('#1c2142'), NIGHT_FOG = new THREE.Color('#2a2448');
  let chaseT = 0;
  C.setNight = (on) => { C.nightT = on ? 1 : 0; };
  C.update = (dt, t, w, wolfPos) => {
    C.wildK = w; C.night += Math.max(-dt / 2.2, Math.min(dt / 2.2, C.nightT - C.night)); const n = C.night;
    const d = Math.hypot(wolfPos.x - FAIR.cx, wolfPos.z - FAIR.cz); root.visible = d < 420; near.visible = d < 170;
    if (n > 0.001 || C._wasN) { C._wasN = n > 0.001; scene.background.lerp(NIGHT_BG, n * 0.9); if (scene.fog) scene.fog.color.lerp(NIGHT_FOG, n * 0.9);
      for (const L of lights) { if (Math.abs(L.o.intensity - L.last) > 1e-5) L.b = L.o.intensity; L.o.intensity = L.b * (1 - 0.72 * n); L.last = L.o.intensity; } }
    glow.intensity = n * 60 + w * 25;
    // bulbs: pale by day, bright at night, a colour chase in WILD
    const k = 0.62 + 0.55 * n + 0.3 * w; bulbMat.color.setScalar(Math.min(1.6, k));
    if (d < 200) {
      if (w > 0.05 && (chaseT += dt) > 0.12) { chaseT = 0; const ph = Math.floor(t * 8); for (const im of C.bulbs) { const n2 = im.count; for (let i = 0; i < n2; i++) { const h = ((i + ph) % 12) / 12; im.setColorAt(i, _c.setHSL(h, 0.9, 0.62).lerp(_c2.set(im.userData.base[i]), 1 - w)); } im.instanceColor.needsUpdate = true; } C._chased = true; }
      else if (w <= 0.05 && C._chased) { C._chased = false; for (const im of C.bulbs) { im.userData.base.forEach((c, i) => im.setColorAt(i, _c.set(c))); im.instanceColor.needsUpdate = true; } }
      const kk = 1 + w * 1.6;
      for (const R of Object.values(C.rides)) { if (!R.held) { R.cycle += dt; const on = (R.cycle % 26) < 19; R.want = on ? 1 : 0; } R.speed += (R.want - R.speed) * (1 - Math.exp(-dt * 0.8)); R.update?.(dt, t, kk);
        R.root.rotation.z = w > 0.02 ? Math.sin(t * 0.9 + R.x) * 0.05 * w : 0; R.root.rotation.x = w > 0.02 ? Math.cos(t * 0.7 + R.z) * 0.04 * w : 0; }
      if (C.rhumbaSign) C.rhumbaSign.material.color.setScalar(0.85 + 0.4 * n + (w > 0.05 ? 0.3 * Math.sin(t * 9) * w : 0));
    }
    C.music?.update(dt, d, w);
  };
  const _c2 = new THREE.Color();
  // tris (for the log): everything under root
  root.updateMatrixWorld(true); let tris = 0; root.traverse(o => { if (!o.isMesh) return; const gg = o.geometry, n = gg.index ? gg.index.count / 3 : gg.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); }); C.tris = Math.round(tris);
  return C;
}

// ------------------------------------------------------------------ the organ: a little calliope waltz (original tune), by distance
export function createCalliope(audio) {
  const M = { on: false, vol: 0, t0: 0, step: 0 };
  // melody (semitones from C5, 0 = rest marker null) in 3/4, one entry per beat-third; a 32-bar loop
  const mel = [7, null, 4, 5, 7, 12, 11, null, 9, 7, null, null, 5, null, 2, 4, 5, 9, 7, null, 5, 4, null, null, 4, null, 0, 2, 4, 7, 9, 7, 5, 4, 2, 0, 2, null, null, 7, null, null,
    7, null, 4, 5, 7, 12, 14, null, 12, 11, null, null, 9, null, 11, 12, 14, 17, 16, 14, 12, 11, 9, 7, 9, null, 11, 12, null, 7, 4, null, 2, 0, null, null, null, null, null, null];
  const chords = [[0, 4, 7], [0, 4, 7], [5, 9, 12], [5, 9, 12], [7, 11, 14], [7, 11, 14], [0, 4, 7], [7, 11, 14], [0, 4, 7], [0, 4, 7], [5, 9, 12], [2, 5, 9], [0, 4, 7], [7, 11, 14], [0, 4, 7], [0, 4, 7]];
  let wave = null, out = null, nextT = 0, i = 0;
  const hz = (st, oct = 0) => 523.25 * Math.pow(2, (st + oct * 12) / 12);
  function ensure() {
    const ctx = audio.ctx; if (!ctx || !audio.BUS?.music) return false; if (out) return true;
    out = ctx.createGain(); out.gain.value = 0; out.connect(audio.BUS.music);
    const re = new Float32Array([0, 1, 0.55, 0.42, 0.2, 0.16, 0.08, 0.06, 0.03]), im = new Float32Array(re.length); wave = ctx.createPeriodicWave(re, im); nextT = ctx.currentTime + 0.1; return true;
  }
  function note(t, f, dur, g, wob) {
    const ctx = audio.ctx, o = ctx.createOscillator(), v = ctx.createGain(); o.setPeriodicWave(wave); o.frequency.setValueAtTime(f, t);
    if (wob) { o.frequency.linearRampToValueAtTime(f * (1 + (Math.random() - 0.5) * 0.08 * wob), t + dur); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.6; lg.gain.value = f * 0.006 * (1 + wob * 4); lfo.connect(lg); lg.connect(o.frequency);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.02); v.gain.setValueAtTime(g * 0.85, t + dur * 0.7); v.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(v); v.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  M.update = (dt, dist, w) => {
    const want = dist < 34 ? 1 : dist > 110 ? 0 : 1 - (dist - 34) / 76;
    if (want <= 0.001 && !M.on) return; if (!ensure()) return; const ctx = audio.ctx; if (ctx.state !== 'running') return;
    M.vol += (want - M.vol) * Math.min(1, dt * 1.5); out.gain.setTargetAtTime(M.vol * 0.32, ctx.currentTime, 0.1); M.on = M.vol > 0.003; M.w = w;
    if (!M.on) { nextT = ctx.currentTime + 0.1; return; }
    const beat = (60 / 168) / (w > 0.5 ? 0.86 + 0.1 * Math.sin(ctx.currentTime * 0.7) : 1);
    while (nextT < ctx.currentTime + 0.25) {
      const st = mel[i % mel.length], bar = Math.floor((i % mel.length) / 3), pos = i % 3, ch = chords[bar % chords.length];
      if (st != null) { let len = 1; while (mel[(i + len) % mel.length] === null && len < 3) len++; note(nextT, hz(st), beat * len * 0.92, 0.22, w); note(nextT, hz(st, 1), beat * len * 0.85, 0.05, w); }
      if (pos === 0) note(nextT, hz(ch[0], -2), beat * 0.8, 0.26, w); else { for (const c of ch) note(nextT, hz(c, -1), beat * 0.45, 0.07, w); }
      nextT += beat; i++;
    }
  };
  return M;
}
