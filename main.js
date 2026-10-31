// Sunspots — first playable test scene (three.js web prototype)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot');
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const smooth = t => t * t * (3 - 2 * t);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- palette
const PAL = {
  sky:    [new THREE.Color('#1d4fb6'), new THREE.Color('#3b1c8e')],
  ground: [new THREE.Color('#dc5a2f'), new THREE.Color('#c11f4c')],
  fog:    [new THREE.Color('#d65f36'), new THREE.Color('#b8245a')],
  sun:    [new THREE.Color('#e3a126'), new THREE.Color('#ff6d2e')],
  cloud:  [new THREE.Color('#3f3d48'), new THREE.Color('#5b2463')],
  hemiSky:[new THREE.Color('#9fb6ff'), new THREE.Color('#b07ad8')],
  key:    [new THREE.Color('#fff0d2'), new THREE.Color('#ffb0a0')],
};

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SHOT ? 1 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = PAL.sky[0].clone();
scene.fog = new THREE.Fog(PAL.fog[0].clone(), 45, 330);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(PAL.hemiSky[0].clone(), new THREE.Color('#d8653a'), 1.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(PAL.key[0].clone(), 2.3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
const sc = key.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
scene.add(key, key.target);
const KEY_OFFSET = new THREE.Vector3(-22, 40, -30); // warm hard light from the sun side, shadows fall toward camera

// ---------------------------------------------------------------- felt texture (procedural speckle)
function feltTexture(size = 256, base = 235, spread = 40) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = base - Math.random() * spread * (Math.random() < .15 ? 2 : 1);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const FELT = feltTexture();
const FELT_BUMP = feltTexture(256, 200, 120); FELT_BUMP.colorSpace = THREE.NoColorSpace;

// ---------------------------------------------------------------- global uniforms
const G = { uWild: { value: 0 }, uTime: { value: 0 } };

// Melt + wild-tint material patch. Works on any MeshStandardMaterial (GLB or primitive).
// Per-object uniforms: uMelt, uMinY, uHeight, uCenter, uSeed, uTint
const MELT_VERT = /* glsl */`
  transformed = (uToRoot * vec4(transformed, 1.0)).xyz; // melt in the prop's root space so multi-part props sag as one
  float mh = clamp((transformed.y - uMinY) / uHeight, 0.0, 1.0);
  vec2 rel = transformed.xz - uCenter;
  float ang = atan(rel.y, rel.x);
  float drip = pow(max(0.0, sin(ang * 5.0 + uSeed) * sin(ang * 3.0 - uSeed * 1.7 + 1.3)), 2.0);
  float m = uMelt;
  // sag: squash height, more at the top; wobble a little like warm wax
  float wob = 0.03 * sin(uTime * 1.7 + uSeed + mh * 4.0) * m;
  float newH = mh * (1.0 - 0.30 * m) - m * (0.10 + 0.10 * drip) * pow(mh, 3.0) - m * drip * 0.08 * sin(mh * 3.14159) + wob * mh;
  // bottom spreads out into a puddle-ish skirt, top leans
  float spread = 1.0 + m * 0.45 * pow(1.0 - mh, 6.0) + m * 0.06 * (1.0 - mh);
  transformed.xz = uCenter + rel * spread;
  transformed.x += m * 0.10 * mh * mh * uHeight * sin(uSeed);
  transformed.z += m * 0.10 * mh * mh * uHeight * cos(uSeed);
  transformed.y = uMinY + max(newH, 0.0) * uHeight;
  transformed = (uFromRoot * vec4(transformed, 1.0)).xyz;
`;
function patchMelt(mat, u) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, G);
    sh.vertexShader = 'uniform float uMelt,uMinY,uHeight,uSeed,uTime;uniform vec2 uCenter;uniform mat4 uToRoot,uFromRoot;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + MELT_VERT);
    if (sh.fragmentShader) {
      sh.fragmentShader = 'uniform float uWild;uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.30, 0.59, 0.11));
        vec3 wildCol = uTint * (0.45 + 1.1 * lum);
        diffuseColor.rgb = mix(diffuseColor.rgb, wildCol, uWild * 0.78);`);
    }
  };
  mat.customProgramCacheKey = () => 'melt';
  return mat;
}
function meltUniforms(geo, tint, seedv, box, toRoot) {
  let b = box; if (!b) { geo.computeBoundingBox(); b = geo.boundingBox; }
  const T = toRoot || new THREE.Matrix4();
  return {
    uToRoot: { value: T.clone() }, uFromRoot: { value: T.clone().invert() },
    uMelt: { value: 0 }, uMinY: { value: b.min.y }, uHeight: { value: Math.max(1e-4, b.max.y - b.min.y) },
    uCenter: { value: new THREE.Vector2((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2) },
    uSeed: { value: seedv ?? rnd() * 6.28 }, uTint: { value: new THREE.Color(tint || '#ff7f8a') },
  };
}
function depthMatFor(u) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, G);
    sh.vertexShader = 'uniform float uMelt,uMinY,uHeight,uSeed,uTime;uniform vec2 uCenter;uniform mat4 uToRoot,uFromRoot;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + MELT_VERT);
  };
  return d;
}

// meltables: { root, meshes:[{mesh,u}], delay, puddle }
const meltables = [];
function puddleMesh(radius, color) {
  const s = new THREE.Shape(); const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    const r = radius * (1 + 0.18 * Math.sin(a * 3 + radius) + 0.1 * Math.sin(a * 7 + 1.3));
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color, roughness: .55, map: FELT, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.scale.setScalar(0.001); m.receiveShadow = true;
  return m;
}
function makeMeltable(root, { tint = '#ff7f8a', puddle = 1, puddleColor = '#f08a8a', delay = rnd() * 0.35 } = {}) {
  const entry = { root, meshes: [], delay, puddle: null };
  const s = rnd() * 6.28;
  // bounding box of the whole prop in its own root space
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) { o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld)); box.union(tmp); } });
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    const inst = o.isInstancedMesh;
    const u = inst ? meltUniforms(o.geometry, tint, s) : meltUniforms(o.geometry, tint, s, box, new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld));
    o.material = patchMelt(o.material.clone(), u);
    o.customDepthMaterial = depthMatFor(u);
    entry.meshes.push({ mesh: o, u });
  });
  if (puddle > 0) {
    const p = puddleMesh(puddle, puddleColor);
    p.position.x = root.position.x; p.position.z = root.position.z;
    scene.add(p); entry.puddle = p; entry.puddleR = 1;
  }
  meltables.push(entry);
  return entry;
}

// ---------------------------------------------------------------- felt primitive helper
function feltMat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, map: FELT, bumpMap: FELT_BUMP, bumpScale: 0.6, ...extra });
}
function rbox(w, h, d, r, color) {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, feltMat(color)); m.castShadow = m.receiveShadow = true; return m;
}
function bakeGroup(group) { // merge-free: just mark shadows
  group.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); return group;
}

// ---------------------------------------------------------------- ground
const groundMat = new THREE.MeshStandardMaterial({ color: PAL.ground[0].clone(), roughness: 1, map: FELT, bumpMap: FELT_BUMP, bumpScale: 0.4 });
FELT.repeat.set(1, 1);
const groundTex = FELT.clone(); groundTex.repeat.set(220, 220); groundTex.needsUpdate = true;
groundMat.map = groundTex;
const groundBump = FELT_BUMP.clone(); groundBump.repeat.set(220, 220); groundBump.needsUpdate = true; groundMat.bumpMap = groundBump;
const ground = new THREE.Mesh(new THREE.CircleGeometry(1600, 64), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// ---------------------------------------------------------------- set pieces (primitives)
const colliders = []; // {x,z,r}
const ADOBE = ['#c98e58', '#c48552', '#cf9963', '#bf8150'];
function adobe(x, z, w, h, d, rot = 0, color = ADOBE[0]) {
  const g = new THREE.Group();
  const body = rbox(w, h, d, 0.55, color); g.add(body);
  const roof = rbox(w * 0.96, 0.35, d * 0.96, 0.17, color); roof.position.y = h - 0.05; g.add(roof);
  const dark = feltMat('#4a3527');
  const door = rbox(0.9, 1.7, 0.2, 0.3, '#57402d'); door.position.set(w * 0.18, 0, d / 2 - 0.05); g.add(door);
  for (const sx of [-0.28, 0.42]) { if (w < 3 && sx > 0) continue; const win = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.75, 0.2, 2, 0.25), dark); win.position.set(w * sx - (sx > 0 ? 0 : 0), h * 0.58, d / 2); if (Math.abs(win.position.x - door.position.x) < 1) win.position.x -= 1.2; g.add(win); }
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(bakeGroup(g));
  colliders.push({ x, z, r: Math.max(w, d) * 0.55 });
  makeMeltable(g, { tint: '#ff8f86', puddle: Math.max(w, d) * 0.7, puddleColor: '#f48f7f' });
  return g;
}
adobe(-14, -11, 5, 3.0, 4, 0.25, ADOBE[0]);
adobe(-5.5, -19, 4.5, 2.6, 3.6, 0.05, ADOBE[1]);
adobe(13, -14, 5.4, 2.8, 4.2, -0.3, ADOBE[2]);
adobe(19, -3, 4, 2.4, 3.5, -0.9, ADOBE[3]);
adobe(-19, 1, 4.2, 2.7, 3.8, 1.1, ADOBE[1]);

let dinerMelt;
// Diner: low rounded building with a ball sign on top (concept), neon in wild mode
const diner = new THREE.Group();
{
  const c = '#cf9a64';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 2.6, 40), feltMat(c)); body.scale.z = 0.55; body.position.y = 1.3; diner.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.32, 10, 48), feltMat(c)); lip.rotation.x = Math.PI / 2; lip.scale.y = 0.55; lip.position.y = 2.65; diner.add(lip);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.75, 0.5, 40), feltMat(c)); roof.scale.z = 0.55; roof.position.y = 2.75; diner.add(roof);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 0.4, 40), feltMat('#c99260')); top.scale.z = 0.5; top.position.y = 3.15; diner.add(top);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 10), feltMat(c)); post.position.y = 3.6; diner.add(post);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 20), feltMat('#d8a46c')); ball.scale.z = 0.45; ball.position.y = 4.95; diner.add(ball);
  const dark = feltMat('#3d2c22');
  for (const x of [-2.9, -1.6, 1.6, 2.9]) { const w = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.85, 0.3, 2, 0.2), dark); w.position.set(x, 1.55, 2.48 - Math.abs(x) * 0.06); w.lookAt(x * 1.3, 1.55, 6); diner.add(w); }
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.9, 0.3, 2, 0.15), feltMat('#4f3a2a')); door.position.set(0, 0.95, 2.5); diner.add(door);
  diner.position.set(2, 0, -12);
  scene.add(bakeGroup(diner));
  colliders.push({ x: 2, z: -12, r: 4.4 }, { x: -1, z: -12, r: 3 }, { x: 5, z: -12, r: 3 });
  dinerMelt = makeMeltable(diner, { tint: '#ff9a8e', puddle: 6, puddleColor: '#f59584' });
}
// neon (hot pink only)
const NEON = new THREE.Color('#ff2fa0');
const neonMat = new THREE.MeshBasicMaterial({ color: '#3b2a2a', fog: false });
const neonRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.09, 8, 48), neonMat); neonRing.position.set(2, 4.95, -12 + 0.25); scene.add(neonRing);
const neonStrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 7.4, 4, 8), neonMat); neonStrip.rotation.z = Math.PI / 2; neonStrip.position.set(2, 2.35, -12 + 2.62); scene.add(neonStrip);
const neonGlowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const neonGlows = [];
for (const [p, s] of [[[2, 4.95, -11.7], [3.6, 3.6]], [[2, 2.35, -9.3], [8.5, 1.3]]]) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: neonGlowTex, color: NEON, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.set(...p); sp.scale.set(...s, 1); scene.add(sp); neonGlows.push(sp);
}
const neonLight = new THREE.PointLight(NEON, 0, 13, 1.6); neonLight.position.set(2, 3.2, -8.5); scene.add(neonLight);

// Fountain (lathe) in the middle of the square
{
  const pts = [[0, 0], [2.4, 0], [2.55, 0.15], [2.55, 0.55], [2.35, 0.62], [2.1, 0.5], [0.55, 0.45], [0.42, 0.9], [0.42, 1.2], [1.0, 1.35], [1.05, 1.55], [0.7, 1.62], [0.3, 1.7], [0.28, 2.05], [0.42, 2.2], [0.3, 2.45], [0, 2.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const f = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), feltMat('#cf9c66'));
  f.castShadow = f.receiveShadow = true;
  const fg = new THREE.Group(); fg.add(f);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), feltMat('#7a5a8a', { roughness: .6 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.48; fg.add(water);
  fg.position.set(0, 0, -3); scene.add(fg);
  colliders.push({ x: 0, z: -3, r: 2.7 });
  makeMeltable(fg, { tint: '#ff9c8a', puddle: 3.2, puddleColor: '#f6a08a' });
}
// Bus shelter (concept: arched felt box)
{
  const g = new THREE.Group(); const c = '#b98552';
  const back = rbox(2.6, 2.6, 0.35, 0.15, c); back.position.z = -0.6; g.add(back);
  const side = rbox(0.35, 2.6, 1.4, 0.15, c); side.position.x = -1.15; g.add(side);
  const roof = rbox(3.1, 0.35, 1.9, 0.17, '#a97648'); roof.position.set(0, 2.55, 0); g.add(roof);
  const seat = rbox(2.2, 0.18, 0.6, 0.08, '#a97648'); seat.position.set(0.1, 0.55, -0.25); g.add(seat);
  g.position.set(-8, 0, -4.5); g.rotation.y = 0.35; scene.add(bakeGroup(g));
  colliders.push({ x: -8, z: -4.5, r: 1.6 });
  makeMeltable(g, { tint: '#ff8c84', puddle: 2.2, puddleColor: '#f4927e' });
}
// Street lamp post (concept)
{
  const g = new THREE.Group(); const c = '#c49460';
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.5, 16), feltMat(c)); base.position.y = .25; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.6, 12), feltMat(c)); pole.position.y = 2.2; g.add(pole);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 16), feltMat(c)); cup.position.y = 4.1; g.add(cup);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.7, 16), feltMat('#e2b77a')); lamp.position.y = 4.6; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.45, 16), feltMat(c)); cap.position.y = 5.15; g.add(cap);
  g.position.set(9, 0, -1); scene.add(bakeGroup(g));
  colliders.push({ x: 9, z: -1, r: 0.6 });
  makeMeltable(g, { tint: '#ff8a8a', puddle: 1.1, puddleColor: '#f28c84' });
}

// Distant cacti: instanced felt primitives out to the horizon
function cactusGeo() {
  const parts = [];
  const trunk = new THREE.CapsuleGeometry(0.35, 2.6, 4, 10); trunk.translate(0, 1.65, 0); parts.push(trunk);
  const a1 = new THREE.CapsuleGeometry(0.22, 0.9, 4, 8); a1.translate(-0.75, 1.9, 0); parts.push(a1);
  const a1b = new THREE.CapsuleGeometry(0.2, 0.45, 4, 8); a1b.rotateZ(Math.PI / 2); a1b.translate(-0.45, 1.45, 0); parts.push(a1b);
  const a2 = new THREE.CapsuleGeometry(0.2, 0.7, 4, 8); a2.translate(0.7, 2.3, 0); parts.push(a2);
  const a2b = new THREE.CapsuleGeometry(0.18, 0.4, 4, 8); a2b.rotateZ(Math.PI / 2); a2b.translate(0.42, 1.95, 0); parts.push(a2b);
  // manual merge
  let pos = [], nor = [], uv = [], idx = [], off = 0;
  for (const p of parts) { const g = p.index ? p : p; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array); for (const i of g.index.array) idx.push(i + off); off += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); m.setIndex(idx);
  return m;
}
{
  const N = 90; const geo = cactusGeo();
  const u = meltUniforms(geo, '#a8325e', 1.3);
  const mat = patchMelt(feltMat('#4f7a3c'), u);
  const inst = new THREE.InstancedMesh(geo, mat, N); inst.castShadow = true; inst.customDepthMaterial = depthMatFor(u);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
  let i = 0;
  while (i < N) {
    const r = 26 + Math.pow(rnd(), 1.4) * 320, a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    const s = 0.7 + rnd() * 0.9;
    m4.compose(new THREE.Vector3(x, 0, z), q, sv.set(s, s * (0.8 + rnd() * 0.5), s));
    inst.setMatrixAt(i++, m4);
    if (r < 40) colliders.push({ x, z, r: 0.6 * s });
  }
  scene.add(inst);
  meltables.push({ root: inst, meshes: [{ mesh: inst, u }], delay: 0.15, puddle: null });
}

// ---------------------------------------------------------------- EYE SUN (layers: disc, spots, eye-white, iris/pupil, lid, lash line, brow)
const sun = new THREE.Group(); scene.add(sun);
sun.renderOrder = 10;
const SUN_DIR = new THREE.Vector3(0, 0.25, -1).normalize();
const SUN_DIST = 900, SUN_R = 118;
function sunMat(color, o = {}) { return new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false, transparent: false, ...o }); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const sunFelt = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '120,70,0' : '255,240,200'},${Math.random() * .22})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } const gr = g.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .5); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(110,60,0,.18)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const L = (o, order) => { o.renderOrder = order; sun.add(o); return o; };
// halo (hazy glow)
const haloTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
const halo = L(new THREE.Mesh(new THREE.PlaneGeometry(2.0 * 1.55, 2.0 * 1.55), sunMat('#ffcf6a', { map: haloTex, transparent: true, opacity: .25 })), 10);
const discMat = sunMat(PAL.sun[0].clone(), { map: sunFelt });
const disc = L(new THREE.Mesh(new THREE.CircleGeometry(1, 96), discMat), 11);
// drips (wild): hang below the disc, grow with wild
const drips = [];
for (let i = 0; i < 9; i++) {
  const x = -0.78 + i * 0.195 + (rnd() - .5) * .05;
  const w = 0.05 + rnd() * 0.045;
  const yEdge = -Math.sqrt(Math.max(0, 1 - x * x));
  const d = new THREE.Mesh(new THREE.CapsuleGeometry(w, 1, 4, 10), discMat);
  d.position.set(x, yEdge + 0.05, 0); d.userData = { yEdge, len: 0.12 + rnd() * 0.32, w };
  L(d, 11); drips.push(d);
}
const spotTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = w * (.12 + Math.random() * .76), y = h * (.12 + Math.random() * .76); if (Math.hypot(x - w / 2, y - h * .44) < 150) continue; const r = 8 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(90,25,10,.85)'); gr.addColorStop(.7, 'rgba(110,30,10,.5)'); gr.addColorStop(1, 'rgba(110,30,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const spots = L(new THREE.Mesh(new THREE.CircleGeometry(1, 96), sunMat('#ffffff', { map: spotTex, transparent: true, opacity: 0 })), 12);
// eye geometry: parabolic almond, y = h*(1-(x/w)^2)
const EW = 0.40, EH_T = 0.17, EH_B = 0.12, EY = 0.08;
const almond = (() => { const s = new THREE.Shape(); s.moveTo(-EW, 0); s.quadraticCurveTo(0, EH_T * 2, EW, 0); s.quadraticCurveTo(0, -EH_B * 2, -EW, 0); return new THREE.ShapeGeometry(s, 32); })();
const shadowTex = canvasTex(256, 128, (g) => { g.setTransform(2, 0, 0, 1, 0, 0); const gr = g.createRadialGradient(64, 56, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(90,50,0,.5)'); gr.addColorStop(1, 'rgba(90,50,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const underShadow = L(new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.42), sunMat('#ffffff', { map: shadowTex, transparent: true, opacity: .55 })), 13); underShadow.position.set(0, EY - 0.1, 0);
const eyeWhite = L(new THREE.Mesh(almond, sunMat('#efe2c8', { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp })), 14); eyeWhite.position.y = EY;
const clipped = (c, o = {}) => sunMat(c, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.KeepStencilOp, stencilFail: THREE.KeepStencilOp, ...o });
const iris = new THREE.Group(); iris.position.y = EY; L(iris, 15);
const irisTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, '#9aa07a'); gr.addColorStop(.75, '#6c7556'); gr.addColorStop(1, '#3e432f'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28; g.strokeStyle = `rgba(40,45,25,${Math.random() * .4})`; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); g.stroke(); } });
const irisM = new THREE.Mesh(new THREE.CircleGeometry(0.12, 48), clipped('#ffffff', { map: irisTex })); irisM.renderOrder = 15; iris.add(irisM);
const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), clipped('#16120e')); pupil.renderOrder = 16; iris.add(pupil);
const glint = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), clipped('#fffaf0')); glint.position.set(0.035, 0.035, 0); glint.renderOrder = 17; iris.add(glint);
// lid: shape from parabola edge up to above the eye; edge y = s*(1-(x/w)^2), s in [EH_T (open) .. -EH_B*0.55 (closed)]
const LID_N = 32;
const lidGeo = new THREE.BufferGeometry();
{ const pos = new Float32Array((LID_N + 1) * 2 * 3); const idx = []; for (let i = 0; i < LID_N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } lidGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lidGeo.setIndex(idx); }
const lidMat = clipped('#d9961f');
const lid = L(new THREE.Mesh(lidGeo, lidMat), 18); lid.position.y = EY; lid.frustumCulled = false;
const lashGeo = new THREE.BufferGeometry();
{ const pos = new Float32Array((LID_N + 1) * 2 * 3); const idx = []; for (let i = 0; i < LID_N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } lashGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lashGeo.setIndex(idx); }
const lash = L(new THREE.Mesh(lashGeo, sunMat('#2e1d10')), 19); lash.position.y = EY; lash.frustumCulled = false;
// little lashes (visible when closed)
const lashes = [];
for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.009, 0.05), sunMat('#2e1d10')); m.userData.x = -EW * 0.7 + i * (EW * 1.4 / 8); L(m, 19); lashes.push(m); }
// lower lash line (thin)
{ const pts = []; for (let i = 0; i <= 24; i++) { const x = -EW + i / 24 * 2 * EW; pts.push(new THREE.Vector3(x, EY - EH_B * (1 - (x / EW) ** 2), 0)); } const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#6b4512', fog: false, depthWrite: false, transparent: true, opacity: .7 })); L(l, 19); }
// brow: tapered thick arc
{ const N = 30, pos = [], idx = []; for (let i = 0; i <= N; i++) { const t = i / N, x = -0.46 + t * 0.92; const y = EY + 0.27 + 0.07 * (1 - ((x + 0.04) / 0.48) ** 2); const th = 0.012 + 0.028 * Math.sin(Math.PI * Math.pow(t, 0.8)); pos.push(x, y + th, 0, x, y - th, 0); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); L(new THREE.Mesh(g, sunMat('#3a2412')), 19); }
let lidClose = 0; // 0 open .. 1 closed
function updateLid(c) {
  const s = lerp(EH_T + 0.006, -EH_B * 0.5, c);
  const p = lidGeo.attributes.position.array, q = lashGeo.attributes.position.array;
  const th = lerp(0.010, 0.013, c);
  for (let i = 0; i <= LID_N; i++) {
    const x = -EW * 1.04 + i / LID_N * EW * 2.08, k = Math.max(0, 1 - (x / EW) ** 2);
    const y = s * k;
    p.set([x, y, 0, x, EH_T + 0.1, 0], i * 6);
    const tt = th * (0.35 + 0.65 * Math.sqrt(k)); const yy = Math.min(y, EH_T * k + 0.004); const yb = Math.max(yy, -EH_B * k);
    q.set([x, yb + tt, 0, x, yb - tt * 0.6, 0], i * 6);
  }
  lidGeo.attributes.position.needsUpdate = true; lashGeo.attributes.position.needsUpdate = true;
  for (const m of lashes) { const x = m.userData.x, k = 1 - (x / EW) ** 2; m.position.set(x * 1.0, EY + s * k - 0.03, 0); m.rotation.z = x * 1.2; m.visible = c > 0.85; }
}
updateLid(0);
// clouds overlapping the sun (soft dark felt puffs)
const cloudTex = canvasTex(512, 256, (g, w, h) => { g.filter = 'blur(14px)'; g.fillStyle = '#fff'; const puffs = [[150, 150, 70], [230, 115, 85], [320, 135, 70], [390, 160, 50], [100, 170, 45], [250, 175, 90]]; for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r * .8, 0, 7); g.fill(); } g.filter = 'none'; g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 205, w, h); });
const clouds = [];
for (const [x, y, s, o] of [[-1.05, 0.05, 0.85, .85], [1.08, -0.12, 0.95, .85], [0.55, 0.7, 0.5, .8], [-1.75, -0.42, 0.55, .6]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * s, 0.8 * s), sunMat(PAL.cloud[0].clone(), { map: cloudTex, transparent: true, opacity: o }));
  m.position.set(x, y, 0); m.userData.base = [x, y]; L(m, 20); clouds.push(m);
}
sun.scale.setScalar(SUN_R);
function placeSun() {
  // the sun sits "at infinity": fixed world direction, flat to the viewer, never rolls or moves on its own
  const land = camera.aspect > 1;
  SUN_DIR.set(0, land ? 0.165 : 0.25, -1).normalize(); sun.scale.setScalar(land ? 96 : SUN_R);
  sun.position.copy(camera.position).addScaledVector(SUN_DIR, SUN_DIST);
  sun.scale.setScalar(camera.aspect > 1 ? SUN_R * 1.08 : SUN_R);
  sun.quaternion.copy(camera.quaternion); // face the camera (no roll: camera has no roll)
}

// ---------------------------------------------------------------- loading GLBs
const manager = new THREE.LoadingManager();
const bar = document.querySelector('#bar i');
manager.onProgress = (_u, a, b) => { bar.style.width = (a / b * 100) + '%'; };
const loader = new GLTFLoader(manager);
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));

function normalize(obj, height) {
  obj.updateMatrixWorld(true);
  obj.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.boundingBox = null; } });
  const b = new THREE.Box3().setFromObject(obj);
  const s = height / (b.max.y - b.min.y);
  obj.scale.multiplyScalar(s); obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
  const cx = (b2.min.x + b2.max.x) / 2, cz = (b2.min.z + b2.max.z) / 2;
  obj.position.x -= cx; obj.position.z -= cz;
  return obj;
}
function prop(gltf, { h, x, z, ry = 0, tint = '#ff8a8a', puddle = 1, collide = 0.6 }) {
  const holder = new THREE.Group();
  const m = normalize(gltf.scene, h);
  m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.roughness = 1; o.material.metalness = 0; } });
  holder.add(m); holder.position.set(x, 0, z); holder.rotation.y = ry; scene.add(holder);
  if (collide) colliders.push({ x, z, r: collide });
  makeMeltable(holder, { tint, puddle, puddleColor: '#f39286' });
  return holder;
}

let wolf, mixer, actWalk, actRun, wolfReady = false;
const wolfState = { pos: new THREE.Vector3(0, 0, 6), yaw: Math.PI, speed: 0 };

async function loadAll() {
  const M = './models/';
  const [w, wRun, bench, cactus, hydrant, car, payphone, lantern, dinerChar, rain] = await Promise.all([
    'wolf.glb', 'wolf_run_anim.glb', 'busstop_bench.glb', 'busstop_cactus.glb', 'mainst_hydrant.glb', 'mainst_car.glb',
    'mainst_payphone_blockhead.glb', 'mines_lantern.glb', 'mainst_diner_building.glb', 'busstop_rain_cloud.glb'].map(f => load(M + f)));

  // dressing: Meshy characters/props standing about the square
  prop(bench, { h: 1.15, x: -4.6, z: -4.2, ry: 0.15, collide: 1.0, puddle: 1.3 });
  prop(cactus, { h: 3.4, x: -11.5, z: -8, ry: 0.4, collide: 0.8, tint: '#b2386a', puddle: 1.2 });
  prop({ scene: cactus.scene.clone() }, { h: 1.6, x: 4.6, z: -2.5, ry: -0.5, collide: 0.5, tint: '#b2386a', puddle: 0.8 });
  prop(hydrant, { h: 1.1, x: 3.2, z: 3.2, ry: -0.6, collide: 0.45, puddle: 0.8 });
  prop(car, { h: 1.7, x: 13, z: 2.5, ry: -1.9, collide: 1.7, puddle: 2.2 });
  prop(payphone, { h: 2.1, x: 6.6, z: -3.5, ry: -0.35, collide: 0.6, puddle: 1.0 });
  prop(lantern, { h: 1.0, x: 8.3, z: 0.4, ry: -0.8, collide: 0.4, puddle: 0.7 });
  prop(dinerChar, { h: 2.4, x: -3.5, z: -9.5, ry: 0.5, collide: 1.3, puddle: 1.6 });
  const rc = prop(rain, { h: 2.6, x: -10.6, z: -2.6, ry: 0.6, collide: 0.5, puddle: 1.0 });

  // Wolf
  wolf = new THREE.Group();
  const wm = normalize(w.scene, 1.75);
  wm.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material.roughness = 1; o.material.metalness = 0; } });
  wolf.add(wm); scene.add(wolf);
  mixer = new THREE.AnimationMixer(wm);
  const walkClip = w.animations[0];
  const runClip = wRun.animations[0];
  // strip root translation so the wolf walks in place (we move him in code)
  actWalk = mixer.clipAction(walkClip); actRun = mixer.clipAction(runClip);
  actWalk.play(); actRun.play(); actWalk.setEffectiveWeight(0); actRun.setEffectiveWeight(0);
  wolfReady = true;
}

// ---------------------------------------------------------------- input: floating joystick + sky drag to orbit + keyboard
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
const input = { x: 0, y: 0 }; let joyId = null, joyO = { x: 0, y: 0 }, lookId = null, lookLast = 0;
let camYaw = 0, camYawTarget = 0, manualLookT = 0;
const R = 52;
canvas.addEventListener('pointerdown', e => {
  const portrait = innerHeight > innerWidth;
  const isLook = portrait ? e.clientY < innerHeight * 0.38 : e.clientX > innerWidth * 0.6;
  if (isLook && lookId === null) { lookId = e.pointerId; lookLast = e.clientX; canvas.setPointerCapture(e.pointerId); return; }
  if (joyId !== null) return;
  joyId = e.pointerId; joyO = { x: e.clientX, y: e.clientY };
  joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.style.display = 'block'; knob.style.transform = '';
  canvas.setPointerCapture(e.pointerId);
  document.getElementById('hint').style.opacity = 0;
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId === joyId) {
    let dx = e.clientX - joyO.x, dy = e.clientY - joyO.y; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.x = dx / R; input.y = dy / R;
  } else if (e.pointerId === lookId) {
    camYawTarget -= (e.clientX - lookLast) * 0.008; lookLast = e.clientX; manualLookT = 2.5;
  }
});
const endPtr = e => { if (e.pointerId === joyId) { joyId = null; input.x = input.y = 0; joy.style.display = 'none'; } if (e.pointerId === lookId) lookId = null; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
const keys = {}; addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyM') toggleWild(); }); addEventListener('keyup', e => keys[e.code] = false);

// ---------------------------------------------------------------- wild mode
let wild = Q.has('wild') ? 1 : 0, wildTarget = wild;
const wildBtn = document.getElementById('wildBtn');
function toggleWild() { wildTarget = wildTarget ? 0 : 1; wildBtn.classList.toggle('on', !!wildTarget); wildBtn.textContent = wildTarget ? 'SUNSHINE' : 'WILD'; }
wildBtn.addEventListener('click', toggleWild);
if (wild) { wildBtn.classList.add('on'); wildBtn.textContent = 'SUNSHINE'; }

// ---------------------------------------------------------------- blink
let nextBlink = 2.5 + Math.random() * 3, blinkT = -1;
function blinkCurve(t) { // slow heavy lid: 0.38s down, 0.14 hold, 0.55s up
  if (t < 0.38) return smooth(t / 0.38);
  if (t < 0.52) return 1;
  if (t < 1.07) return 1 - smooth((t - 0.52) / 0.55);
  return -1;
}

// ---------------------------------------------------------------- resize
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// grain canvas
{ const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); const im = x.createImageData(160, 160); for (let i = 0; i < 160 * 160; i++) { const v = 128 + (Math.random() - .5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0);
  const g = document.getElementById('grain'); g.style.backgroundImage = `url(${c.toDataURL()})`; g.style.backgroundSize = (160 / Math.min(devicePixelRatio || 1, 2)) + 'px'; }

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3(), camTarget = new THREE.Vector3(), sunScreen = new THREE.Vector3(), wolfScreen = new THREE.Vector3();
const irisOff = new THREE.Vector2();
camera.position.set(0, 4, 14);
const col = new THREE.Color();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime; G.uTime.value = t;

  // wild transition (~2s)
  wild += clamp(wildTarget - wild, -dt / 2, dt / 2);
  const w = smooth(wild); G.uWild.value = w;
  scene.background.lerpColors(PAL.sky[0], PAL.sky[1], w);
  scene.fog.color.lerpColors(PAL.fog[0], PAL.fog[1], w);
  groundMat.color.lerpColors(PAL.ground[0], PAL.ground[1], w);
  hemi.color.lerpColors(PAL.hemiSky[0], PAL.hemiSky[1], w); hemi.groundColor.copy(groundMat.color);
  key.color.lerpColors(PAL.key[0], PAL.key[1], w); key.intensity = lerp(2.3, 1.6, w);
  discMat.color.lerpColors(PAL.sun[0], PAL.sun[1], w);
  lidMat.color.copy(discMat.color).multiplyScalar(0.9);
  halo.material.color.set('#ffcf6a').lerp(col.set('#ff7a3a'), w); halo.material.opacity = lerp(0.18, 0.75, w); halo.scale.setScalar(lerp(1, 1.25, w));
  spots.material.opacity = w * 0.9;
  for (const d of drips) { const L2 = d.userData.len * smooth(clamp(wild * 1.3 - 0.3, 0, 1)); d.scale.set(1, Math.max(0.001, L2), 1); d.position.y = d.userData.yEdge - L2 * 0.5 + 0.02; d.visible = L2 > 0.005; }
  for (const c of clouds) { c.material.color.lerpColors(PAL.cloud[0], PAL.cloud[1], w); c.position.x = c.userData.base[0] + Math.sin(t * 0.05 + c.userData.base[1] * 3) * 0.06; }
  // neon
  const nOn = smooth(clamp((wild - 0.35) / 0.65, 0, 1));
  const flick = nOn > 0 && nOn < 1 ? (Math.sin(t * 60) > 0.2 ? 1 : 0.35) : 1;
  neonMat.color.set('#3b2a2a').lerp(NEON, nOn * flick);
  neonRing.visible = neonStrip.visible = nOn > 0.01;
  { const sag = smooth(clamp(wild, 0, 1)); // neon rides down with the melting diner
    neonRing.position.y = 4.95 * (1 - 0.42 * sag); neonStrip.position.y = 2.35 * (1 - 0.3 * sag);
    for (const g of neonGlows) { g.userData.y0 ??= g.position.y; g.position.y = g.userData.y0 * (1 - (g.userData.y0 > 3.5 ? 0.42 : 0.3) * sag); } }
  for (const g of neonGlows) g.material.opacity = nOn * 0.6 * flick;
  neonLight.intensity = nOn * 9 * flick;
  // melt (staggered per object)
  for (const m of meltables) {
    const k = smooth(clamp((wild - m.delay) / (1 - m.delay * 0.6), 0, 1));
    for (const e of m.meshes) e.u.uMelt.value = k;
    if (m.puddle) { m.puddle.scale.setScalar(Math.max(0.001, k * 0.75)); m.puddle.material.color.set('#f39286').lerp(groundMat.color, 0.15); }
  }

  // wolf movement
  if (wolfReady) {
    let ix = input.x, iy = input.y;
    if (keys.KeyW || keys.ArrowUp) iy = -1; if (keys.KeyS || keys.ArrowDown) iy = 1; if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
    if (keys.ShiftLeft) { ix *= 1; iy *= 1; } else if (!input.x && !input.y && (ix || iy)) { const l = Math.hypot(ix, iy); ix *= 0.6 / l; iy *= 0.6 / l; }
    const mag = Math.min(1, Math.hypot(ix, iy));
    const target = mag < 0.08 ? 0 : (mag > 0.75 ? 7.2 : 2.6 * (mag / 0.75) + 0.6);
    wolfState.speed = lerp(wolfState.speed, target, 1 - Math.exp(-dt * 8));
    if (mag > 0.08) {
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw); // camera forward (on ground) = -(fx,fz)
      const mx = -fx * -iy + fz * ix * 1, mz = -fz * -iy - fx * ix;
      const desired = Math.atan2(mx, mz);
      let d = desired - wolfState.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      wolfState.yaw += d * (1 - Math.exp(-dt * 10));
    }
    const p = wolfState.pos;
    p.x += Math.sin(wolfState.yaw) * wolfState.speed * dt; p.z += Math.cos(wolfState.yaw) * wolfState.speed * dt;
    for (const c of colliders) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.45; if (d < r && d > 1e-4) { p.x = c.x + dx / d * r; p.z = c.z + dz / d * r; } }
    const pr = Math.hypot(p.x, p.z); if (pr > 300) { p.x *= 300 / pr; p.z *= 300 / pr; }
    wolf.position.copy(p); wolf.rotation.y = wolfState.yaw;
    // anim blend
    const sp = wolfState.speed;
    const wWalk = clamp(sp / 1.2, 0, 1) * (1 - clamp((sp - 3.2) / 2.5, 0, 1)), wRun = clamp((sp - 3.2) / 2.5, 0, 1);
    actWalk.setEffectiveWeight(wWalk); actRun.setEffectiveWeight(wRun);
    actWalk.timeScale = clamp(sp / 2.2, 0.5, 1.4); actRun.timeScale = clamp(sp / 7, 0.7, 1.2);
    // idle: hold first frame pose (walk weight 0 -> bind pose) with gentle breathing
    const idle = 1 - clamp(sp / 0.6, 0, 1);
    if (idle > 0.5) { actWalk.setEffectiveWeight(Math.max(wWalk, 1)); actWalk.timeScale = 0; }
    wolf.children[0].scale.y = wolf.children[0].userData.sy ??= wolf.children[0].scale.y;
    wolf.children[0].scale.y = wolf.children[0].userData.sy * (1 + idle * 0.012 * Math.sin(t * 2.2));
    mixer.update(dt);
    // camera auto-follows behind travel direction unless the player recently dragged the sky
    manualLookT -= dt;
    if (manualLookT <= 0 && sp > 1) { let d = (wolfState.yaw + Math.PI) - camYawTarget; d = Math.atan2(Math.sin(d), Math.cos(d)); camYawTarget += d * (1 - Math.exp(-dt * 0.8)); }
  }
  camYaw += (camYawTarget - camYaw) * (1 - Math.exp(-dt * 6));
  const portrait = innerHeight > innerWidth;
  const dist = portrait ? 10.5 : 9.5, hgt = portrait ? 4.2 : 3.3;
  const wp = wolfReady ? wolf.position : wolfState.pos;
  tmpV.set(wp.x + Math.sin(camYaw) * dist, hgt, wp.z + Math.cos(camYaw) * dist);
  camera.position.lerp(tmpV, 1 - Math.exp(-dt * 5));
  camTarget.set(wp.x, portrait ? 2.6 : 2.75, wp.z);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld();
  key.position.copy(wp).add(KEY_OFFSET); key.target.position.copy(wp);

  // the sun: fixed, only the eye acts
  placeSun();
  // blink / close
  let lc = lidClose;
  if (wildTarget === 1 || wild > 0.05) { lc = Math.min(1, lc + dt / 0.9); blinkT = -1; } // close and stay closed through Wild Mode
  else if (blinkT < 0 && lc > 0) { lc = Math.max(0, lc - dt / 0.9); } // slow open after the town reforms
  else {
    if (blinkT < 0) { nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0; nextBlink = 2.5 + Math.random() * 5.5; if (Math.random() < .2) nextBlink = 0.7; } }
    if (blinkT >= 0) { blinkT += dt; const b = blinkCurve(blinkT); if (b < 0) { blinkT = -1; lc = 0; } else lc = b; }
  }
  if (lc !== lidClose) { lidClose = lc; updateLid(lc); }
  // pupil tracking: look from the sun's face toward the wolf on screen
  if (wolfReady) {
    sunScreen.copy(sun.position).project(camera); wolfScreen.copy(wolf.position).setY(1.2).project(camera);
    let dx = (wolfScreen.x - sunScreen.x) * camera.aspect, dy = wolfScreen.y - sunScreen.y;
    if (wolfScreen.z > 1) { dx = -dx; dy = -Math.abs(dy); }
    const l = Math.hypot(dx, dy) || 1; const reach = clamp(l / 0.9, 0, 1);
    const tx = dx / l * reach * 0.25, ty = dy / l * reach * 0.075;
    irisOff.x = lerp(irisOff.x, tx, 1 - Math.exp(-dt * 6)); irisOff.y = lerp(irisOff.y, ty, 1 - Math.exp(-dt * 6));
    iris.position.set(irisOff.x, EY + irisOff.y, 0);
    pupil.scale.setScalar(lerp(1, 0.8, w));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

loadAll().then(() => {
  const ld = document.getElementById('load'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 900);
  window.__ready = true;
}).catch(e => { document.getElementById('err').style.display = 'block'; document.getElementById('err').textContent = 'Load error: ' + e.message; console.error(e); });
requestAnimationFrame(frame);
window.__sunspots = { toggleWild, input, keys, get wild() { return wild; }, scene, camera };
