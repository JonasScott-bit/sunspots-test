// horse.js — run 13: THE HORSE. Sunspots' one horse, as a huge fuzzy-melt felt statue on a plinth in the new
// Horse Plaza (Main St south, where the customer lot was), plus the SAME OLD ONE HORSE TOWN welcome signs at both
// ends of Main St. Procedural felt, 0 Meshy credits. In WILD the eyes glow red (emissive + soft halo sprites).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sign, SERIF } from './townshops.js';

export const SLOGAN = 'SAME OLD ONE HORSE TOWN';
export const PLAZA = { x: -67.25, z: 22.6, x0: -76, z0: 16, x1: -58.5, z1: 29.5 };   // the old CUSTOMER PARKING lot
const PL = { x: -67.25, z: 22.6, w: 10.2, d: 4.6, h: 2.25 }, HS = 1.55;   // horse ~9 m tall at the ears                          // plinth (top at h)

// deterministic lumpy noise for the hand-felted surface
const nz = (x, y, z) => Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - x * 0.9) + 0.5 * Math.sin(y * 3.3 + z * 2.6);
const C = new THREE.Color();
function part(list, geo, mat4, color, o = {}) {
  const g = geo.clone(); g.applyMatrix4(mat4);
  const p = g.attributes.position, n = p.count, ca = new Float32Array(n * 3); C.set(color);
  for (let i = 0; i < n; i++) { const v = 0.94 + 0.06 * Math.sin(p.getX(i) * 5 + p.getY(i) * 3); ca[i * 3] = C.r * v; ca[i * 3 + 1] = C.g * v; ca[i * 3 + 2] = C.b * v; }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.userData.melt = o.melt ?? 1; list.push(g); return g;
}
const M4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// a tapered limb from a to b (radii ra, rb)
function limb(list, a, b, ra, rb, color, seg = 12) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(rb, ra, L, seg, 4); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return part(list, g, new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)), color);
}

export function createHorse(C0) {
  const { scene, TS, feltMat, LOW } = C0;
  const H = { wild: 0, eyes: [], state: 'plinth' };
  // ---------------------------------------------------------------- the plaza + plinth (townscape kit: collisions, LOD, minimap boxes)
  TS.place('horse_plaza', PLAZA.x, PLAZA.z, 0, (k) => {
    const hx = (PLAZA.x1 - PLAZA.x0) / 2, hz = (PLAZA.z1 - PLAZA.z0) / 2;
    k.aab(-hx, 0, -hz, hx, 0.07, hz, '#d9c4a4', { pat: 'tile', ps: 1.1 });                      // felt flagstones
    k.aab(-hx, 0, -hz, hx, 0.09, -hz + 0.35, '#c4ab88');                                         // kerb
    for (const s of [-1, 1]) { k.aab(s > 0 ? hx - 0.6 : -hx, 0, -hz + 1, s > 0 ? hx : -hx + 0.6, 0.6, hz - 0.5, '#b88a62'); // low planter walls
      for (let i = 0; i < 6; i++) k.blob(s * (hx - 0.3), 0.75, -hz + 2 + i * 2, 0.55, 0.42, 0.55, i % 2 ? '#6f8a4a' : '#7d9a52'); }
    const px = PL.x - PLAZA.x, pz = PL.z - PLAZA.z;
    k.aab(px - PL.w / 2 - 0.5, 0, pz - PL.d / 2 - 0.5, px + PL.w / 2 + 0.5, 0.35, pz + PL.d / 2 + 0.5, '#c99c7e', { pat: 'stone', ps: 0.5 });   // step
    k.aab(px - PL.w / 2, 0.35, pz - PL.d / 2, px + PL.w / 2, PL.h - 0.22, pz + PL.d / 2, '#d8a487', { pat: 'stone', ps: 0.6, lod: true });     // sandstone
    k.aab(px - PL.w / 2 - 0.18, PL.h - 0.22, pz - PL.d / 2 - 0.18, px + PL.w / 2 + 0.18, PL.h, pz + PL.d / 2 + 0.18, '#e6bfa0', { lod: true }); // cap
    k.solid(px - PL.w / 2 - 0.5, pz - PL.d / 2 - 0.5, px + PL.w / 2 + 0.5, pz + PL.d / 2 + 0.5, PL.h + 5);
    // plaques: front (Main St side, -z) + back
    k.aab(px - 1.9, 0.75, pz - PL.d / 2 - 0.06, px + 1.9, 1.95, pz - PL.d / 2, '#b8903e');
    sign(k, 'SUNSPOTS\n' + SLOGAN + '\nERECTED 1951 · MELTED 1951', px, 1.35, pz - PL.d / 2 - 0.08, 3.6, 1.1, { bg: '#c49a48', fg: '#3a2414', family: SERIF, fit: 0.62, ry: Math.PI });
    k.aab(px - 1.4, 0.9, pz + PL.d / 2, px + 1.4, 1.7, pz + PL.d / 2 + 0.06, '#b8903e');
    sign(k, 'THE HORSE\n"IT WAS HERE FIRST"', px, 1.3, pz + PL.d / 2 + 0.08, 2.6, 0.7, { bg: '#c49a48', fg: '#3a2414', family: SERIF, fit: 0.6 });
    // benches facing the horse + a DO NOT FEED sign
    for (const s of [-1, 1]) k.frame(px + s * 4.6, 0, pz - 4.6, s * 0.35, (f) => { f.box(0, 0.42, 0, 2.2, 0.1, 0.6, '#9a6a44'); f.box(0, 0.52, 0.3, 2.2, 0.5, 0.08, '#9a6a44'); for (const x of [-0.9, 0.9]) f.box(x, 0, 0, 0.12, 0.42, 0.5, '#4a3a34'); });
    k.beam([px + 7.2, 0, pz - 3.4], [px + 7.2, 1.2, pz - 3.4], 0.06, '#6a5a4a');
    sign(k, 'PLEASE DO NOT\nFEED THE STATUE', px + 7.2, 1.0, pz - 3.42, 1.0, 0.5, { bg: '#f2ece0', fg: '#a8302e', fit: 0.55, ry: Math.PI });
    k.mark('spot_statue', px, pz - PL.d / 2 - 1.9);
  }, { lodNear: 90, melt: false });
  TS.spots.statue = { x: TS.marks.spot_statue.x, z: TS.marks.spot_statue.z, ry: Math.PI, map: 'Horse Statue', label: 'READ THE PLAQUE' };

  // ---------------------------------------------------------------- the horse (own mesh: felt, vertex colour, lumpy + slumped)
  const BODY = '#c98a54', DARK = '#a86a3e', MANE = '#f2dcb4', HOOF = '#6a4a3a';
  const parts = [], S = new THREE.SphereGeometry(1, 16, 10), SL = new THREE.SphereGeometry(1, 10, 7);
  part(parts, S, M4(0, 3.0, 0, 2.55, 1.22, 1.12), BODY);                                    // barrel
  part(parts, S, M4(-1.6, 3.15, 0, 1.25, 1.12, 1.05), BODY);                               // rump
  part(parts, S, M4(1.55, 3.2, 0, 1.15, 1.18, 1.0), BODY);                                 // chest
  for (const [x, zs] of [[1.75, 1], [-1.75, 1]]) for (const s of [-1, 1]) {
    const lx = x + (x > 0 ? 0.08 : -0.08), lz = s * 0.62 * zs;
    limb(parts, [lx, 2.6, lz], [lx + (s > 0 ? 0.05 : -0.04), 0.35, lz + s * 0.06], 0.52, 0.42, BODY);
    part(parts, S, M4(lx, 1.25, lz, 0.5, 0.42, 0.5), BODY);                               // knee lump
    part(parts, S, M4(lx + 0.05, 0.18, lz + s * 0.08, 0.72, 0.28, 0.68), HOOF);           // melted hoof puddling on the cap
  }
  limb(parts, [2.1, 3.55, 0], [3.0, 5.05, 0], 0.72, 0.5, BODY);                             // neck (leans forward)
  part(parts, S, M4(3.35, 4.8, 0, 0.98, 0.52, 0.5, 0, 0, -0.62), BODY);                     // head, nose drooping
  part(parts, S, M4(3.95, 4.15, 0, 0.5, 0.42, 0.42), DARK);                                 // muzzle
  part(parts, SL, M4(4.12, 4.08, 0.2, 0.07, 0.07, 0.05), '#3a2418'); part(parts, SL, M4(4.12, 4.08, -0.2, 0.07, 0.07, 0.05), '#3a2418'); // nostrils
  limb(parts, [3.0, 5.25, 0.2], [3.05, 5.85, 0.42], 0.16, 0.05, BODY, 8);                   // ear up
  limb(parts, [3.0, 5.25, -0.2], [3.25, 5.0, -0.85], 0.16, 0.05, BODY, 8);                  // ear flopped (heat)
  for (let i = 0; i < 7; i++) { const t = i / 6; part(parts, S, M4(2.1 + t * 0.95, 4.1 + t * 1.15, 0, 0.38, 0.42 - t * 0.08, 0.26), MANE); // mane ridge
    part(parts, SL, M4(2.0 + t * 0.95, 3.75 + t * 1.15, 0.28, 0.16, 0.42, 0.12), MANE); }   // mane hanging over one side
  part(parts, S, M4(3.15, 5.35, 0, 0.3, 0.2, 0.24), MANE);                                  // forelock
  limb(parts, [-2.6, 3.6, 0], [-3.05, 2.4, 0.05], 0.36, 0.3, MANE); limb(parts, [-3.05, 2.4, 0.05], [-3.0, 0.9, 0.1], 0.3, 0.2, MANE);
  part(parts, S, M4(-2.98, 0.75, 0.1, 0.3, 0.36, 0.3), MANE);                               // tail tip (a drip)
  for (const [x, z, l] of [[0.4, 0.5, 0.7], [-0.6, -0.4, 0.5], [1.0, -0.3, 0.9], [-1.4, 0.55, 0.45]]) part(parts, S, M4(x, 1.85 - l * 0.4, z, 0.2, l, 0.2), BODY); // belly drips
  part(parts, S, M4(3.95, 3.62, 0.05, 0.13, 0.4, 0.13), DARK);
  part(parts, S, M4(0.2, 0.04, 0.1, 3.4, 0.09, 1.55), DARK);                              // the melt puddle it stands in
  for (const [x, z] of [[-3.1, 1.2], [2.6, -1.3], [3.3, 1.1], [-0.4, -1.5]]) part(parts, S, M4(x, 0.05, z, 0.7, 0.07, 0.5), DARK);
  for (const [x, y, z, l] of [[3.4, 4.4, 0.4, 0.35], [2.4, 3.7, 0.55, 0.3], [-2.0, 2.8, 0.9, 0.45], [1.2, 2.5, -0.95, 0.4]]) part(parts, S, M4(x, y - l * 0.5, z, 0.13, l, 0.13), BODY); // side drips                              // chin drip
  // the melt: everything slumps a little toward the plinth and bulges out low; lumpy felt surface
  const geos = parts.map(g => { const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const sag = 0.09 * Math.max(0, y - 1.0); y -= sag * (0.6 + 0.4 * Math.sin(x * 1.7));
      const low = Math.max(0, 1.2 - y) * 0.12; x *= 1 + low * 0.2; z *= 1 + low * 0.5;
      const n = nz(x, y, z) * 0.035; p.setXYZ(i, x + n, y + n * 0.6, z + n); }
    g.deleteAttribute('uv'); const nn = g.index ? g.toNonIndexed() : g; nn.computeVertexNormals(); return nn; });
  const geo = mergeGeometries(geos, false); geo.computeBoundingSphere();
  const mat = feltMat('#ffffff', { vertexColors: true, bumpScale: 0.9 });
  const horse = new THREE.Mesh(geo, mat); horse.castShadow = !LOW; horse.receiveShadow = true; horse.name = 'horse_statue';
  // eyes: dull felt buttons normally; red emissive in WILD
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#2a1c1a', roughness: 1, metalness: 0, emissive: '#ff2414', emissiveIntensity: 0 });
  const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,220,200,1)'); gr.addColorStop(0.25, 'rgba(255,60,40,.85)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const rig = new THREE.Group(); rig.add(horse);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), eyeMat); e.position.set(3.48, 4.86, s * 0.45); e.scale.set(1, 1, 0.6); rig.add(e);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#ff3a24', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    h.position.set(3.56, 4.86, s * 0.56); h.scale.setScalar(1.3); h.visible = false; rig.add(h); H.eyes.push({ e, h, s });
  }
  rig.position.set(PL.x, PL.h, PL.z); rig.rotation.y = 0; rig.scale.setScalar(HS);   // profile to Main St, head east (toward the sun coming up)
  scene.add(rig); H.rig = rig; H.horse = horse;
  H.tris = geo.attributes.position.count / 3 + 2 * 160;
  if (TS.stats) TS.stats.tris += H.tris;

  // ---------------------------------------------------------------- welcome signs at both ends of Main St (two-sided)
  const welcome = (name, x, z, ry, sub) => TS.place(name, x, z, ry, (k) => {
    for (const x2 of [-3.2, 3.2]) { k.beam([x2, 0, 0], [x2, 4.6, 0], 0.26, '#6b5644'); }
    k.aab(-4.1, 1.9, -0.16, 4.1, 5.1, 0.16, '#f2e6c8');                                     // board
    k.aab(-4.25, 1.75, -0.2, 4.25, 1.95, 0.2, '#c8463f'); k.aab(-4.25, 5.05, -0.2, 4.25, 5.25, 0.2, '#c8463f');
    k.cyl(0, 5.25, 0, 1.3, 0.24, '#f2b632', { rx: Math.PI / 2, seg: 16 });                  // half-sun on top
    for (let i = 0; i < 7; i++) { const a = Math.PI * (i + 0.5) / 7; k.beam([Math.cos(a) * 1.35, 5.25 + Math.sin(a) * 1.35, 0], [Math.cos(a) * 1.9, 5.25 + Math.sin(a) * 1.9, 0], 0.18, '#f2b632'); }
    // a tiny felt horse on the sign, slumping
    k.blob(2.9, 5.6, 0, 0.55, 0.25, 0.18, '#c98a54'); k.blob(3.45, 5.85, 0, 0.18, 0.28, 0.14, '#c98a54'); for (const x2 of [2.55, 3.2]) k.beam([x2, 5.0, 0], [x2, 5.45, 0], 0.09, '#c98a54');
    for (const f of [1, -1]) { sign(k, 'WELCOME TO', 0, 4.35, f * 0.18, 4.4, 0.5, { fg: '#2a4a8a', fit: 0.6, ry: f > 0 ? 0 : Math.PI });
      sign(k, 'SUNSPOTS', 0, 3.25, f * 0.18, 7.4, 1.1, { fg: '#c8463f', family: SERIF, fit: 0.82, ry: f > 0 ? 0 : Math.PI });
      sign(k, SLOGAN, 0, 2.55, f * 0.18, 7.4, 0.6, { fg: '#3a2418', fit: 0.72, ry: f > 0 ? 0 : Math.PI });
      sign(k, sub, 0, 2.17, f * 0.18, 5.6, 0.42, { fg: '#6a5a4a', fit: 0.55, ry: f > 0 ? 0 : Math.PI }); }
    k.solid(-4.2, -0.3, 4.2, 0.3, 5.3);
  }, { lodNear: 140, melt: true, drips: false });
  welcome('welcome_east', 50.5, 13.5, -2.4, 'POP. ABOUT THE SAME');
  welcome('welcome_west', -189, 14.5, -Math.PI / 2, 'YOU ARE NOW LEAVING. PROBABLY.');
  H.signs = [{ x: 50.5, z: 13.5 }, { x: -189, z: 14.5 }];

  // ---------------------------------------------------------------- per-frame: WILD eyes (fade in ~2 s with the WILD ease) + a slow felt breath
  const off = { plinth: [PL.x, PL.h, PL.z, HS, 0], farm: [-205, 0, 101, 0.42, -2.4], gone: null };
  H.setAt = (where) => { H.state = where; const o = off[where]; rig.visible = !!o; if (o) { rig.position.set(o[0], o[1], o[2]); rig.scale.setScalar(o[3]); rig.rotation.y = o[4]; } };
  H.update = (dt, t, w) => {
    H.wild = w; if (!rig.visible) return;
    const pulse = 0.82 + 0.18 * Math.sin(t * 3.1), k = w * pulse;
    eyeMat.emissiveIntensity = k * 3.2; eyeMat.color.set('#2a1c1a').lerp(C.set('#ff3a24'), w * 0.6);
    for (const { h } of H.eyes) { h.visible = w > 0.01; h.material.opacity = k * 0.95; h.scale.setScalar((1.0 + 0.5 * w + 0.15 * Math.sin(t * 3.1)) * (rig.scale.x < 1 ? 0.6 : 1)); }
    horse.scale.y = 1 + Math.sin(t * 0.8) * 0.006 + w * 0.01 * Math.sin(t * 2.3);
  };
  H.eyeGlow = () => eyeMat.emissiveIntensity;
  return H;
}
