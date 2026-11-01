// Sunspots — first playable test scene (three.js web prototype)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createLevel, LAYOUT } from './level.js';
import { createCockpit } from './cockpit.js';
import { createMoth } from './moth.js';
import { createDirector } from './scenes.js';
import { audio } from './audio.js';
window.__SUNSPOTS_VERSION = 'v8';

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot');
const MAP = Q.get('map'); // QA: ?map=town|route -> top-down orthographic layout render
const QCAM = Q.get('cam') ? Q.get('cam').split(',').map(Number) : null; // QA: ?cam=x,y,z,tx,ty,tz
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT }); renderer.localClippingEnabled = true;
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
const hemi = new THREE.HemisphereLight(PAL.hemiSky[0].clone(), new THREE.Color('#e08a5a'), 1.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(PAL.key[0].clone(), 2.3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
const sc = key.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
scene.add(key, key.target);
const KEY_OFFSET = new THREE.Vector3(-30, 34, 30); // warm light from front-left like the concept art: lit fronts, shadows fall back-right

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
  float newH = mh * (1.0 - 0.17 * m) - m * (0.07 + 0.08 * drip) * pow(mh, 3.0) - m * drip * 0.08 * sin(mh * 3.14159) + wob * mh;
  // bottom spreads out into a puddle-ish skirt, top leans
  // base flows out a fixed distance (metres), not a ratio, so big buildings don't turn into pancakes
  float rl = max(length(rel), 1e-3);
  transformed.xz = uCenter + rel + rel / rl * m * (0.55 * pow(1.0 - mh, 5.0) + 0.08 * (1.0 - mh)) * min(1.0, rl);
  transformed.x += m * 0.10 * mh * mh * uHeight * sin(uSeed);
  transformed.z += m * 0.10 * mh * mh * uHeight * cos(uSeed);
  transformed.y = uMinY + max(newH, 0.0) * uHeight;
  // bend (lamp posts): the top curls over like a warm candy cane
  float bk = m * uBend;
  transformed.x += bk * uHeight * 0.42 * pow(mh, 2.2) * cos(uSeed);
  transformed.z += bk * uHeight * 0.42 * pow(mh, 2.2) * sin(uSeed);
  transformed.y -= bk * uHeight * 0.22 * pow(mh, 3.0);
  transformed = (uFromRoot * vec4(transformed, 1.0)).xyz;
`;
function patchMelt(mat, u) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, G);
    sh.vertexShader = 'uniform float uMelt,uMinY,uHeight,uSeed,uTime,uBend;uniform vec2 uCenter;uniform mat4 uToRoot,uFromRoot;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + MELT_VERT);
    if (sh.fragmentShader) {
      sh.fragmentShader = 'uniform float uWild;uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.30, 0.59, 0.11));
        vec3 wildCol = uTint * (0.45 + 1.1 * lum);
        diffuseColor.rgb = mix(diffuseColor.rgb, wildCol, uWild * 0.86);`);
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
    uMelt: { value: 0 }, uBend: { value: 0 }, uMinY: { value: b.min.y }, uHeight: { value: Math.max(1e-4, b.max.y - b.min.y) },
    uCenter: { value: new THREE.Vector2((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2) },
    uSeed: { value: seedv ?? rnd() * 6.28 }, uTint: { value: new THREE.Color(tint || '#ff7f8a') },
  };
}
function depthMatFor(u) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, G);
    sh.vertexShader = 'uniform float uMelt,uMinY,uHeight,uSeed,uTime,uBend;uniform vec2 uCenter;uniform mat4 uToRoot,uFromRoot;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + MELT_VERT);
  };
  return d;
}

// RIDER MELT: the cast inside the boot car (moth, Wolf riding shotgun, back-seat blockouts) are animated / skinned, so
// the static root-space melt can't hold them. This one runs after skinning, in CAR space: heads sag and slump toward
// the seat, cheeks drip in lobes, everything wobbles like warm wax, and the felt goes the same Wild tint.
const RIDE = { uCar: { value: new THREE.Matrix4() }, uCarInv: { value: new THREE.Matrix4() }, uRTint: { value: new THREE.Color('#ff8a7a') } };
const RIDER_PROJ = /* glsl */`
  vec4 rW = modelMatrix * vec4(transformed, 1.0);
  vec3 rc = (uCarInv * rW).xyz;
  float rm = uRM;
  float rh = clamp((rc.y - 0.55) / 1.4, 0.0, 1.0);
  float ra = atan(rc.z + 0.4, rc.x - 0.0);
  float rl = pow(max(0.0, sin(ra * 5.0 + uRSeed) * sin(ra * 3.0 - uRSeed * 1.7 + 1.3)), 2.0);
  float rwb = sin(uTime * 1.9 + rc.x * 3.0 + rc.z * 2.0 + uRSeed);
  rc.y -= rm * rh * rh * (0.13 + 0.12 * rl) - rm * 0.025 * rwb * rh;
  rc.x += rm * 0.07 * rh * rh * sin(uTime * 0.8 + uRSeed);
  rc.z += rm * 0.05 * rh * rh * cos(uTime * 0.7 + uRSeed * 2.0);
  vec4 mvPosition = viewMatrix * (uCar * vec4(rc, 1.0));
  gl_Position = projectionMatrix * mvPosition;
`;
function patchRider(mat, seed, rm) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, RIDE, G); sh.uniforms.uRM = rm; sh.uniforms.uRSeed = { value: seed };
    const hasT = /uniform float[^;]*uTime/.test(sh.vertexShader);
    sh.vertexShader = 'uniform mat4 uCar,uCarInv;uniform float uRM,uRSeed;' + (hasT ? '' : 'uniform float uTime;') + '\n' + sh.vertexShader.replace('#include <project_vertex>', RIDER_PROJ);
    if (sh.fragmentShader.includes('#include <color_fragment>')) sh.fragmentShader = 'uniform float uRM;uniform vec3 uRTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float rLum = dot(diffuseColor.rgb, vec3(0.30, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, uRTint * (0.45 + 1.1 * rLum), uRM * 0.8); }`);
  };
  const pk = mat.customProgramCacheKey?.bind(mat); mat.customProgramCacheKey = () => (pk ? pk() : '') + '|rider';
  mat.needsUpdate = true;
  return mat;
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
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshPhysicalMaterial({ color, roughness: 1, map: FELT, bumpMap: FELT_BUMP, bumpScale: 0.8, sheen: 0.8, sheenRoughness: 0.9, sheenColor: new THREE.Color('#ffc8d8'), polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.scale.setScalar(0.001); m.receiveShadow = true;
  return m;
}
// Wax drips: one instanced mesh for the whole town. Each drip hangs from a roof edge, rides the sag of its
// building (same formula as MELT_VERT at the top edge) and grows with the melt.
const DRIP_MAX = 320;
const dripGeo = (() => { const pts = [[0, 0.03], [1.0, 0.02], [0.92, -0.12], [0.76, -0.36], [0.7, -0.6], [0.8, -0.78], [0.78, -0.9], [0.6, -0.99], [0.32, -1.04], [0, -1.05]].map(([x, y]) => new THREE.Vector2(x, y)); const g = new THREE.LatheGeometry(pts, 12); g.computeVertexNormals(); return g; })();
// FUZZY MELT: drips are flocked felt (velvet sheen + felt bump), never glossy goo
const dripMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 1, metalness: 0, map: FELT, bumpMap: FELT_BUMP, bumpScale: 0.9, sheen: 1, sheenRoughness: 0.85, sheenColor: new THREE.Color('#ffc2d6'), emissive: '#ff4a6a', emissiveIntensity: 0.05 });
const dripMesh = new THREE.InstancedMesh(dripGeo, dripMat, DRIP_MAX); dripMesh.count = 0; dripMesh.castShadow = true; dripMesh.frustumCulled = false;
dripMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(dripMesh);
const dripList = []; // {entry, lx, ly, lz, ang, w, len, ph}
function perimeter(spec, n) { // points (x,z) on the top outline in root space, plus outward angle
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5 + (rnd() - 0.5) * 0.6) / n;
    if (spec.drip === 'box' || spec.drip === 'stadium') {
      const [w, d] = spec.footprint; const P = 2 * (w + d); let u = t * P, x, z;
      if (spec.drip === 'stadium') { const r = d / 2, hx = w / 2 - r, L = 4 * hx + 2 * Math.PI * r; u = t * L;
        if (u < 2 * hx) { x = -hx + u; z = r; } else if (u < 2 * hx + Math.PI * r) { const a = Math.PI / 2 - (u - 2 * hx) / r; x = hx + Math.cos(a) * r; z = Math.sin(a) * r; } else if (u < 4 * hx + Math.PI * r) { x = hx - (u - 2 * hx - Math.PI * r); z = -r; } else { const a = -Math.PI / 2 - (u - 4 * hx - Math.PI * r) / r; x = -hx + Math.cos(a) * r; z = Math.sin(a) * r; } }
      else if (u < w) { x = -w / 2 + u; z = d / 2; } else if (u < w + d) { x = w / 2; z = d / 2 - (u - w); } else if (u < 2 * w + d) { x = w / 2 - (u - w - d); z = -d / 2; } else { x = -w / 2; z = -d / 2 + (u - 2 * w - d); }
      out.push([x, z]);
    } else { const a = t * Math.PI * 2, r = spec.radius || 1; out.push([Math.cos(a) * r, Math.sin(a) * r]); }
  }
  return out;
}
function makeMeltable(root, { tint = '#ff7f8a', puddle = 1, puddleColor = '#f08a8a', delay = rnd() * 0.35, drips = null, bend = 0 } = {}) {
  const entry = { root, meshes: [], delay, puddle: null, puddleColor };
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
    u.uBend.value = bend;
    o.material = patchMelt(o.material.clone(), u);
    o.customDepthMaterial = depthMatFor(u);
    entry.meshes.push({ mesh: o, u });
  });
  entry.box = box; entry.seed = s;
  if (drips && drips.drip && drips.kind !== 'cactus') {
    const H = box.max.y - box.min.y, edgeY = Math.min(drips.height ?? box.max.y, box.max.y);
    const n = drips.kind === 'lamp' ? 3 : drips.kind === 'payphone' ? 3 : drips.kind === 'fountain' ? 9 : Math.round(clamp((drips.footprint ? drips.footprint[0] + drips.footprint[1] : 6) * 1.5, 6, 22));
    const thick = drips.kind === 'lamp' || drips.kind === 'payphone' ? 0.13 : drips.kind === 'fountain' ? 0.24 : 0.38;
    for (const [x, z] of perimeter(drips, n)) {
      if (dripList.length >= DRIP_MAX) break;
      dripList.push({ entry, lx: x * 1.01, lz: z * 1.01, ly: edgeY - 0.04, mh: (edgeY - box.min.y) / H, H, cx: (box.min.x + box.max.x) / 2, cz: (box.min.z + box.max.z) / 2,
        w: thick * (0.7 + rnd() * 0.7), len: (0.4 + Math.pow(rnd(), 1.5) * 1.15) * (drips.kind === 'lamp' || drips.kind === 'payphone' ? 0.45 : drips.kind === 'fountain' ? 0.4 : 1), ph: rnd() * 6.28, color: new THREE.Color(puddleColor).offsetHSL(0, 0.05, -0.02 + rnd() * 0.05) });
    }
  }
  if (puddle > 0) {
    const p = puddleMesh(puddle, puddleColor);
    p.position.x = root.position.x; p.position.z = root.position.z;
    scene.add(p); entry.puddle = p; entry.puddleR = 1;
  }
  meltables.push(entry);
  return entry;
}
const _dm = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _dv = new THREE.Vector3(), _ds = new THREE.Vector3();
function updateDrips(t) {
  let i = 0;
  for (const d of dripList) {
    const e = d.entry, m = e.k || 0; if (m < 0.02) continue;
    // replicate MELT_VERT at the drip's anchor (root space)
    const ang = Math.atan2(d.lz - d.cz, d.lx - d.cx), seed = e.seed;
    const dr = Math.pow(Math.max(0, Math.sin(ang * 5 + seed) * Math.sin(ang * 3 - seed * 1.7 + 1.3)), 2);
    const mh = d.mh, wob = 0.03 * Math.sin(t * 1.7 + seed + mh * 4) * m;
    const newH = mh * (1 - 0.17 * m) - m * (0.07 + 0.08 * dr) * mh ** 3 - m * dr * 0.08 * Math.sin(mh * Math.PI) + wob * mh;
    const rl = Math.max(Math.hypot(d.lx - d.cx, d.lz - d.cz), 1e-3), spread = 1 + m * (0.55 * (1 - mh) ** 5 + 0.08 * (1 - mh)) * Math.min(1, rl) / rl;
    _dv.set(d.cx + (d.lx - d.cx) * spread + m * 0.10 * mh * mh * d.H * Math.sin(seed), e.box.min.y + Math.max(newH, 0) * d.H - 0.03, d.cz + (d.lz - d.cz) * spread + m * 0.10 * mh * mh * d.H * Math.cos(seed));
    _dv.applyMatrix4(e.root.matrixWorld);
    const grow = smooth(clamp(m * 1.25 - 0.15, 0, 1));
    const L = Math.max(0.001, d.len * grow * (1 + 0.05 * Math.sin(t * 0.9 + d.ph)) * (0.6 + 0.4 * dr + 0.4));
    _ds.set(d.w * (0.6 + 0.4 * grow), L, d.w * (0.6 + 0.4 * grow));
    _dm.compose(_dv, _dq.identity(), _ds);
    dripMesh.setMatrixAt(i, _dm); dripMesh.setColorAt(i, d.color); i++;
  }
  dripMesh.count = i; dripMesh.instanceMatrix.needsUpdate = true; if (dripMesh.instanceColor) dripMesh.instanceColor.needsUpdate = true;
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
const GROUND_FELT = feltTexture(256, 238, 20); // finer, cleaner speckle for the big flat ground
const groundTex = GROUND_FELT; groundTex.repeat.set(220, 220); groundTex.needsUpdate = true;
groundMat.map = groundTex;
const groundBump = FELT_BUMP.clone(); groundBump.repeat.set(220, 220); groundBump.needsUpdate = true; groundMat.bumpMap = groundBump;
const ground = new THREE.Mesh(new THREE.CircleGeometry(1600, 64), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// ---------------------------------------------------------------- set pieces (procedural felt GLBs from tools/build_town.mjs)
const colliders = []; // {x,z,r}
// layout: [model, x, z, rotY, collider r, puddle r]
const TOWN = [
  ['adobe_a', -14, -11, 0.25, 2.8, 3.4], ['adobe_b', -5.5, -19, 0.05, 2.5, 3.0], ['adobe_c', 13, -14, -0.3, 3.0, 3.7],
  ['adobe_small', 19, -3, -0.9, 2.0, 2.4], ['adobe_a', -19, 1, 1.1, 2.8, 3.4], ['adobe_small', 23, -15, -0.6, 2.0, 2.4], ['adobe_b', -24, -9, 0.7, 2.5, 3.0],
  ['diner', 2, -12, 0, 0, 6.2], ['fountain', 0, -3, 0, 2.9, 3.4], ['bus_shelter', -8, -4.5, 0.35, 1.7, 2.3], ['lamp', 9, -1, 0, 0.45, 1.0],
  ['payphone', 6.6, -3.5, -0.35, 0.5, 0.9], ['cactus_tall', -11.5, -7.6, 0.4, 0.55, 1.3], ['cactus_small', 4.6, -2.5, -0.5, 0.4, 0.75],
  ['cactus_mid', 15.5, -7.5, 1.2, 0.45, 1.0], ['cactus_tall', -21, -16, 2.1, 0.55, 1.3], ['cactus_mid', 8.5, -19, 0.3, 0.45, 1.0],
  // Level 1: the Wolf's house (small peach adobe, south edge, door faces town) + a cactus by the gate
  ['adobe_small', -10, 28, Math.PI, 2.0, 2.4], ['cactus_small', -5.2, 23.4, 0.8, 0.4, 0.75], ['cactus_mid', -26, 15, 0.4, 0.45, 1.0], ['adobe_b', 30, -6, -0.7, 2.5, 3.0],
];
const WAX = { adobe: '#ff7c78', diner: '#ff8378', fountain: '#ff8a7c', shelter: '#ff7a76', lamp: '#ff7480', payphone: '#ff867a', cactus: '#d0507e' };
const TINT = { adobe: '#ff7a6c', diner: '#ff8270', fountain: '#ff8672', shelter: '#ff786c', lamp: '#ff7078', payphone: '#ff8070', cactus: '#a02a5a' };
const PEACH = new THREE.Color('#ffae62');
function feltify(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const m0 = o.material;
    const c0 = m0.color.clone();
    if (/felt_(wall|trim|roof|stone|basin|frame|body|post|sign|base|seat)/.test(m0.name || '')) c0.lerp(PEACH, 0.5); // peach, not terracotta (approved town image)
    const m = feltMat(c0, { emissive: m0.emissive.clone(), map: m0.map || FELT, bumpScale: 0.22 });
    if (m0.map) { m.map.colorSpace = THREE.SRGBColorSpace; }
    o.material = m; o.castShadow = o.receiveShadow = true;
  });
  return root;
}
let dinerMelt, neonSpec = null;
function placeTown(models) {
  for (const [name, x, z, ry, cr, pr] of TOWN) {
    const src = models[name]; const root = feltify(src.scene.clone(true));
    const ex = src.scene.children[0]?.userData?.sunspots || {};
    root.position.set(x, 0, z); root.rotation.y = ry; scene.add(root);
    if (name === 'diner') colliders.push({ x: x - 2.8, z, r: 2.6 }, { x, z, r: 2.6 }, { x: x + 2.8, z, r: 2.6 });
    else if (cr) colliders.push({ x, z, r: cr });
    const kind = ex.kind === 'shelter' ? 'shelter' : (ex.kind || 'adobe');
    const e = makeMeltable(root, { tint: TINT[kind] || '#ff8f86', puddle: pr, puddleColor: WAX[kind] || '#f2907f', drips: ex, bend: ex.bend || 0 });
    if (name === 'diner') { dinerMelt = e; neonSpec = { ...ex.neon, x, z }; }
  }
}

// Distant cacti: one instanced felt saguaro (cactus_far.glb) scattered to the horizon
function placeFarCacti(gltf) {
  let geo; gltf.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
  const N = 300;
  const u = meltUniforms(geo, '#7a2f5a', 1.3);
  const mat = patchMelt(feltMat('#58773a'), u);
  const inst = new THREE.InstancedMesh(geo, mat, N); inst.castShadow = true; inst.customDepthMaterial = depthMatFor(u);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
  let i = 0;
  const M = level.MAIN; let tries = 0;
  while (i < N && tries++ < 5000) {
    let x, z;
    if (i < 110) { const r = 30 + Math.pow(rnd(), 1.3) * 330, a = rnd() * Math.PI * 2; x = Math.cos(a) * r; z = Math.sin(a) * r; }
    else { const k = Math.floor(rnd() * M.s.length), side = rnd() < 0.5 ? -1 : 1, off = 14 + Math.pow(rnd(), 1.4) * 170; const a = M.s[Math.max(0, k - 1)], b = M.s[Math.min(M.s.length - 1, k + 1)]; const tl = Math.hypot(b.x - a.x, b.z - a.z) || 1; x = M.s[k].x - (b.z - a.z) / tl * off * side; z = M.s[k].z + (b.x - a.x) / tl * off * side; }
    const rd = level.distToRoad(x, z); if (rd < 10 || Math.hypot(x - 2, z - 6) < 34) continue;
    const r = rd;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
    const s = 0.75 + rnd() * 0.8;
    m4.compose(new THREE.Vector3(x, 0, z), q, sv.set(s, s * (0.8 + rnd() * 0.45), s));
    inst.setMatrixAt(i++, m4);
    if (r < 45) colliders.push({ x, z, r: 0.6 * s });
  }
  scene.add(inst);
  meltables.push({ root: inst, meshes: [{ mesh: inst, u }], delay: 0.15, puddle: null, drips: [] });
}

// neon (hot pink only) — positioned from the diner's extras once it loads
const NEON = new THREE.Color('#ff2fa0');
const neonMat = new THREE.MeshBasicMaterial({ color: '#3b2a2a', fog: false });
const neonRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.09, 8, 48), neonMat); neonRing.visible = false; scene.add(neonRing);
const neonStrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 7.0, 4, 8), neonMat); neonStrip.rotation.z = Math.PI / 2; neonStrip.visible = false; scene.add(neonStrip);
const neonGlowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const neonGlows = [];
for (const s of [[3.6, 3.6], [8.5, 1.3]]) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: neonGlowTex, color: NEON, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.scale.set(...s, 1); scene.add(sp); neonGlows.push(sp);
}
const neonLight = new THREE.PointLight(NEON, 0, 13, 1.6); scene.add(neonLight);

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
const iris = new THREE.Group(); iris.position.y = EY; iris.renderOrder = 10; sun.add(iris); // group order = sun's (10) so iris kids (15-17) sort between eye-white (14) and lid (18)
const irisTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, '#9aa07a'); gr.addColorStop(.75, '#6c7556'); gr.addColorStop(1, '#3e432f'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28; g.strokeStyle = `rgba(40,45,25,${Math.random() * .4})`; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); g.stroke(); } });
const irisM = new THREE.Mesh(new THREE.CircleGeometry(0.12, 48), clipped('#ffffff', { map: irisTex })); irisM.renderOrder = 15; iris.add(irisM);
const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), clipped('#16120e')); pupil.renderOrder = 16; iris.add(pupil);
const glint = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), clipped('#fffaf0')); glint.position.set(0.035, 0.035, 0); glint.renderOrder = 17; iris.add(glint);
// lid: shape from parabola edge up to above the eye; edge y = s*(1-(x/w)^2), s in [EH_T (open) .. -EH_B*0.55 (closed)]
const LID_N = 32;
const lidGeo = new THREE.BufferGeometry();
{ const pos = new Float32Array((LID_N + 1) * 2 * 3); const idx = []; for (let i = 0; i < LID_N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } lidGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lidGeo.setIndex(idx); }
const lidMat = clipped('#d9961f', { stencilZPass: THREE.IncrementStencilOp }); // lid marks covered samples (1->2): iris/pupil can only draw where eye-white is visible AND uncovered
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
const LIDQ = new URLSearchParams(location.search).has('lid') ? +new URLSearchParams(location.search).get('lid') : null;
function updateLid(c) {
  const s = lerp(EH_T + 0.006, -EH_B * 1.12, c);
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
  iris.visible = c < 0.95; // belt and braces: fully hidden near/at closed (blink peak and Wild)
  for (const m of lashes) { const x = m.userData.x, k = 1 - (x / EW) ** 2; m.position.set(x * 1.0, EY + s * k - 0.03, 0); m.rotation.z = x * 1.2; m.visible = c > 0.85; }
}
updateLid(0);
// clouds overlapping the sun (soft dark felt puffs)
const cloudTex = canvasTex(512, 256, (g, w, h) => { g.filter = 'blur(14px)'; g.fillStyle = '#fff'; const puffs = [[150, 150, 70], [230, 115, 85], [320, 135, 70], [390, 160, 50], [100, 170, 45], [250, 175, 90]]; for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r * .8, 0, 7); g.fill(); } g.filter = 'none'; g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 205, w, h); });
const cloudDripTex = canvasTex(256, 256, (g, w, h) => { // gentle fuzzy felt drips hanging from a cloud's flat bottom
  g.fillStyle = '#fff'; g.filter = 'blur(9px)'; g.fillRect(10, 0, w - 20, 26);
  const dr = [[44, .30, 15], [92, .55, 18], [140, .22, 14], [176, .45, 16], [214, .28, 13]];
  for (const [x, l, r] of dr) { const L = 20 + l * (h - 70); g.beginPath(); g.moveTo(x - r, 0); g.lineTo(x - r * 0.75, L); g.arc(x, L, r * 0.95, Math.PI, 0, true); g.lineTo(x + r, 0); g.fill(); }
  g.filter = 'none'; g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .35})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 2.5); } // fibre fuzz
});
const clouds = [];
for (const [x, y, s, o] of [[-1.05, 0.05, 0.85, .85], [1.08, -0.12, 0.95, .85], [0.55, 0.7, 0.5, .8], [-1.75, -0.42, 0.55, .6]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * s, 0.8 * s), sunMat(PAL.cloud[0].clone(), { map: cloudTex, transparent: true, opacity: o }));
  m.position.set(x, y, 0); m.userData.base = [x, y]; L(m, 20); clouds.push(m);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(0.95 * s, 0.38 * s).translate(0, -0.19 * s, 0), sunMat(PAL.cloud[1].clone(), { map: cloudDripTex, transparent: true, opacity: 0 }));
  d.position.set(0, -0.225 * s, 0); d.renderOrder = 20; m.add(d); m.userData.drip = d; m.userData.o = o;
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
manager.onProgress = (_u, a, b) => { bar.style.width = (a / b * 100) + '%'; window.__title?.progress(a / b); };
const loader = new GLTFLoader(manager);
loader.setMeshoptDecoder(MeshoptDecoder);
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

let wolf, mixer, actWalk, actRun, actIdle, wolfReady = false, wolfBaseScale = 1;
// scenes.js drives the Wolf on foot during cutscenes through this puppet (gait from speed, head look)
const puppet = { on: false, speed: 0, headYaw: 0, headTilt: 0, base: 1 };
let director = null;
const wolfState = { pos: new THREE.Vector3(LAYOUT.wolfStart[0], 0, LAYOUT.wolfStart[1]), yaw: LAYOUT.wolfStart[2], speed: 0 };
// ---------------------------------------------------------------- level 1: Last Minute Snacks (roads, car, store, townsfolk, HUD)
const level = createLevel({ scene, colliders, feltMat, rbox, makeMeltable, feltify: (r) => feltify(r), rnd, clamp, lerp, smooth, FELT,
  onEnterCar: () => { if (actWalk) { actWalk.setEffectiveWeight(0); actRun.setEffectiveWeight(0); actIdle.setEffectiveWeight(1); } wolfState.speed = 0; snapCam = true; },
  onReset: () => { director?.reset(); moth?.reset(); wolfState.pos.set(LAYOUT.wolfStart[0], 0, LAYOUT.wolfStart[1]); wolfState.yaw = LAYOUT.wolfStart[2]; wolfState.speed = 0; camYawTarget = camYaw = 0; snapCam = true; } });
let snapCam = false;
// first person: the moth driver's cockpit (default while driving) + the Wolf's own eyes on foot (eye button, hold 0.5 s / V)
const cockpit = createCockpit(level, { feltMat, rbox, clamp, lerp, rnd: Math.random, patchRider }); level.cockpit = cockpit;
let moth = null; const wolfRM = { value: 0 };
if (Q.has('chase')) cockpit.setChase(true);
if (Q.has('look')) cockpit.holdLook = [(+Q.get('look') || 0) * Math.PI / 180, (+Q.get('lookp') || 0) * Math.PI / 180];
if (Q.get('prank')) cockpit.forceAct = Q.get('prank');
const FP = { on: Q.has('fp') ? 1 : 0, k: Q.has('fp') ? 1 : 0, pitch: Q.has('fpp') ? +Q.get('fpp') * Math.PI / 180 : 0, tpPos: new THREE.Vector3(0, 4, 14), tpQ: new THREE.Quaternion(), fpPos: new THREE.Vector3(), fpQ: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), bob: 0 };
// FP arms: mustard sweater sleeves + grey furry paws at the bottom edges while walking; crossed arms when idle (look down)
const SWEATER = '#d39a2e', PAW = '#8f8b86';
const fpArms = new THREE.Group(), fpCross = new THREE.Group(); scene.add(fpArms, fpCross); fpArms.visible = fpCross.visible = false;
function sleeve(len, r) { const g = new THREE.Group(); const sl = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, len, 14), feltMat(SWEATER)); sl.rotation.x = Math.PI / 2; sl.position.z = -len / 2; g.add(sl);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, r * 0.22, 8, 16), feltMat('#b98326')); cuff.position.z = -len; g.add(cuff);
  const paw = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 16, 12), feltMat(PAW, { bumpScale: 1.4 })); paw.scale.set(1, 0.8, 1.25); paw.position.z = -len - r * 0.9; g.add(paw);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), feltMat(PAW, { bumpScale: 1.4 })); f.position.set((i - 1.5) * r * 0.5, r * 0.12, -len - r * 2.0); g.add(f); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 5; } }); return g; }
const fpL = sleeve(0.55, 0.085), fpR = sleeve(0.55, 0.085); fpArms.add(fpL, fpR);
{ const a = sleeve(0.5, 0.09), b = sleeve(0.5, 0.09); a.position.set(-0.24, 0.0, 0.02); a.rotation.set(0, -1.32, 0.15); b.position.set(0.24, 0.05, -0.02); b.rotation.set(0, 1.32, -0.15); fpCross.add(a, b); }
const eyeBtn = document.getElementById('eyeBtn'), eyeRing = eyeBtn.querySelector('.ring'), fpFx = document.getElementById('fpFx'), hazeT = document.getElementById('hazeT');
function setWolfGhost(on) { for (const m of wolf.userData.mats || []) { m.colorWrite = !on; m.depthWrite = !on; } }
function toggleFP() { audio.ui('confirm'); if (level.inCar) { cockpit.setChase(!cockpit.chase); eyeBtn.classList.toggle('fp', !cockpit.chase); } else { FP.on = FP.on ? 0 : 1; eyeBtn.classList.toggle('fp', !!FP.on); } try { navigator.vibrate && navigator.vibrate(12); } catch (_) {} }
{ let holdT = null, raf = 0; const RING = 163.4;
  const fill = (x) => eyeRing.style.strokeDashoffset = RING * (1 - x);
  const step = () => { if (holdT === null) return; const x = Math.min(1, (performance.now() - holdT) / 500); fill(x);
    if (x >= 1) { holdT = null; toggleFP(); setTimeout(() => fill(0), 160); return; } raf = requestAnimationFrame(step); };
  eyeBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { eyeBtn.setPointerCapture(e.pointerId); } catch (_) {} holdT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); });
  const up = e => { e.preventDefault(); e.stopPropagation(); if (holdT !== null) { holdT = null; cancelAnimationFrame(raf); fill(0); eyeBtn.classList.remove('wig'); void eyeBtn.offsetWidth; eyeBtn.classList.add('wig'); } };
  eyeBtn.addEventListener('pointerup', up); eyeBtn.addEventListener('pointercancel', up); eyeBtn.addEventListener('contextmenu', e => e.preventDefault());
  eyeBtn.addEventListener('animationend', () => eyeBtn.classList.remove('wig')); }
if (FP.on) eyeBtn.classList.add('fp');

async function loadAll() {
  const M = './models/';
  const TOWN_MODELS = ['adobe_a', 'adobe_b', 'adobe_c', 'adobe_small', 'diner', 'fountain', 'bus_shelter', 'lamp', 'payphone', 'cactus_tall', 'cactus_mid', 'cactus_small', 'cactus_far'];
  const [w, bench, hydrant, car, lantern, rain, ...townG] = await Promise.all([
    'wolf_armsdown.glb', 'busstop_bench.glb', 'mainst_hydrant.glb', 'mainst_car.glb',
    'mines_lantern.glb', 'busstop_rain_cloud.glb', ...TOWN_MODELS.map(n => 'town/' + n + '.glb')].map(f => load(M + f)));
  const town = Object.fromEntries(TOWN_MODELS.map((n, i) => [n, townG[i]]));
  placeTown(town); placeFarCacti(town.cactus_far); level.placeRoadCacti(town);
  const castP = level.loadCast(load, normalize);
  if (neonSpec) { // hot-pink neon: ring around the ball sign + strip along the roof lip
    const [rx, ry, rz, rr] = neonSpec.ring, [sx, sy, sz, sl] = neonSpec.strip;
    neonRing.position.set(neonSpec.x + rx, ry, neonSpec.z + rz); neonRing.scale.setScalar(rr / 1.32);
    neonStrip.position.set(neonSpec.x + sx, sy, neonSpec.z + sz); neonStrip.scale.set(1, sl / 7.0, 1);
    neonGlows[0].position.copy(neonRing.position).z += 0.2; neonGlows[1].position.copy(neonStrip.position).z += 0.25;
    neonLight.position.set(neonSpec.x, 3.2, neonSpec.z + 3.2);
    for (const o of [neonRing, neonStrip, ...neonGlows]) o.userData.y0 = o.position.y;
  }

  // dressing: Meshy characters/props standing about the square
  prop(bench, { h: 1.15, x: -4.6, z: -4.2, ry: 0.15, collide: 1.0, puddle: 1.3 });
  void hydrant; // the static hydrant is replaced by the rigged mainst_hydrant_spin townsperson (level.js)
  level.setBootCar(car.scene, normalize);
  // the real moth driver (rigged Meshy model, meshopt + 1024 webp): replaces the felt stand-in + placeholder gloves
  load(M + 'moth_driver.glb').then(g => { moth = createMoth(g, level, cockpit, { scene, patchRider }); cockpit.useMoth(moth); window.__moth = moth; })
    .catch(e => console.warn('moth driver model failed, keeping the stand-in', e)); // the boot car is the rideshare: parked at the pickup, drivable, walks on its boots
  prop(lantern, { h: 1.0, x: 8.3, z: 0.4, ry: -0.8, collide: 0.4, puddle: 0.7 });
  const rc = prop(rain, { h: 2.6, x: -10.6, z: -2.6, ry: 0.6, collide: 0.5, puddle: 1.0 });

  // Wolf
  wolf = new THREE.Group();
  const wm = normalize(w.scene, 1.75);
  wm.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material.roughness = 1; o.material.metalness = 0; } });
  wolf.add(wm); scene.add(wolf);
  wolf.userData.mats = []; wm.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => wolf.userData.mats.push(m)); });
  for (const m of wolf.userData.mats) patchRider(m, 2.4, wolfRM); // wild: fuzzy-melts while riding shotgun
  mixer = new THREE.AnimationMixer(wm);
  // v10: arms-down Meshy rig (texture-fixed grey) with idle / walk / run clips merged in one file (tools/build_armsdown.mjs).
  // Full-body clips now (the old arms-crossed sculpt tore when the arms moved, so v9 kept only the legs).
  // Hips keep their bind x/z (clips stay in place) and a slightly softer bob; scale tracks dropped.
  const inPlace = (clip) => {
    const tracks = [];
    for (const tr of clip.tracks) {
      const [bone, prop] = tr.name.split('.');
      if (prop === 'scale') continue;
      if (bone === 'Hips' && prop === 'position') {
        const b = wm.getObjectByName('Hips'), t2 = tr.clone();
        for (let i = 0; i < t2.values.length; i += 3) { t2.values[i] = b.position.x; t2.values[i + 2] = b.position.z; t2.values[i + 1] = b.position.y + (t2.values[i + 1] - b.position.y) * 0.8; }
        tracks.push(t2); continue;
      }
      tracks.push(tr.clone());
    }
    return new THREE.AnimationClip(clip.name + '_inplace', clip.duration, tracks);
  };
  const wClip = n => w.animations.find(c => c.name === n) || w.animations[0];
  // walk/run are phase-driven (timeScale 0, time set from the shared gait phase); idle loops on its own clock.
  // Weights always sum to 1 (the bind pose is an A-pose, never shown). No arms-crossed clip exists for this rig, so a long idle is just idle.
  actWalk = mixer.clipAction(inPlace(wClip('walk'))); actRun = mixer.clipAction(inPlace(wClip('run'))); actIdle = mixer.clipAction(inPlace(wClip('idle')));
  actWalk.play(); actRun.play(); actIdle.play(); actWalk.setEffectiveWeight(0); actRun.setEffectiveWeight(0); actIdle.setEffectiveWeight(1);
  wolf.userData.body = wm; wolf.userData.sy = wm.scale.y; wolf.userData.phase = 0;
  // idle head glance: only the Head bone (not in any clip) gets a small yaw/tilt on top of its bind pose
  const hb = wm.getObjectByName('Head');
  wolf.userData.feet = ['LeftFoot', 'RightFoot'].map(n => wm.getObjectByName(n)).filter(Boolean);
  if (hb) wolf.userData.head = { bone: hb, bind: hb.quaternion.clone(), q: new THREE.Quaternion(), e: new THREE.Euler(), yaw: 0, tilt: 0 };
  await castP;
  wolfReady = true;
}

// ---------------------------------------------------------------- input: floating joystick + sky drag to orbit + keyboard
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
const input = { x: 0, y: 0 }; let joyId = null, joyO = { x: 0, y: 0 }, lookId = null, lookLast = 0, lookLastY = 0;
const DEBUG = {};
let camYaw = 0, camYawTarget = 0, manualLookT = 0;
const R = 52;
canvas.addEventListener('pointerdown', e => {
  if (level.mode !== 'walk' || level.frozen) return;
  const portrait = innerHeight > innerWidth;
  const isLook = portrait ? e.clientY < innerHeight * 0.38 : e.clientX > innerWidth * 0.6;
  if (isLook && lookId === null) { lookId = e.pointerId; lookLast = e.clientX; lookLastY = e.clientY; canvas.setPointerCapture(e.pointerId); return; }
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
    camYawTarget -= (e.clientX - lookLast) * (FP.on ? 0.006 : 0.008); lookLast = e.clientX; manualLookT = 2.5;
    if (FP.on) FP.pitch = clamp(FP.pitch - (e.clientY - lookLastY) * 0.005, -1.15, 0.6); lookLastY = e.clientY;
  }
});
const endPtr = e => { if (e.pointerId === joyId) { joyId = null; input.x = input.y = 0; joy.style.display = 'none'; } if (e.pointerId === lookId) lookId = null; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
const keys = {}; addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyM') toggleWild(); if (e.code === 'KeyV' && !e.repeat && level.mode === 'walk' && !level.frozen) toggleFP(); }); addEventListener('keyup', e => keys[e.code] = false);

// ---------------------------------------------------------------- wild mode
let wild = Q.has('wild') ? 1 : 0, wildTarget = wild;
const wildBtn = document.getElementById('wildBtn');
function toggleWild() { wildTarget = wildTarget ? 0 : 1; audio.wild(!!wildTarget); wildBtn.classList.toggle('on', !!wildTarget); wildBtn.textContent = wildTarget ? 'SUNSHINE' : 'WILD'; }
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
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// grain canvas
{ const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); const im = x.createImageData(160, 160); for (let i = 0; i < 160 * 160; i++) { const v = 128 + (Math.random() - .5) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0);
  const g = document.getElementById('grain'); g.style.backgroundImage = `url(${c.toDataURL()})`; g.style.backgroundSize = (160 / Math.min(devicePixelRatio || 1, 2)) + 'px'; }

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let mapCam = null;
const tmpV = new THREE.Vector3(), camTarget = new THREE.Vector3(), sunScreen = new THREE.Vector3(), wolfScreen = new THREE.Vector3();
const irisOff = new THREE.Vector2();
camera.position.set(0, 4, 14);
const col = new THREE.Color();
// adaptive resolution: hold ~60 fps on phones by stepping the pixel ratio down (and back up) with frame time
const DPR_MAX = Math.min(window.devicePixelRatio || 1, SHOT ? 1 : 2), DPR_MIN = Math.min(DPR_MAX, 1);
let dpr = DPR_MAX, ftAvg = 16.7, ftLast = performance.now(), dprHold = 0;
function adaptDPR() {
  const now = performance.now(), ft = Math.min(100, now - ftLast); ftLast = now;
  ftAvg += (ft - ftAvg) * 0.05; if (SHOT || document.hidden || --dprHold > 0) return;
  let nd = dpr;
  if (ftAvg > 18.5 && dpr > DPR_MIN) nd = Math.max(DPR_MIN, dpr - 0.25);
  else if (ftAvg < 14 && dpr < DPR_MAX) nd = Math.min(DPR_MAX, dpr + 0.25);
  if (nd !== dpr) { dpr = nd; renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); dprHold = 90; }
}
function frame() {
  if (window.__titleUp) { clock.getDelta(); ftLast = performance.now(); requestAnimationFrame(frame); return; } // title screen owns the GPU
  adaptDPR();
  const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime; G.uTime.value = t;

  // wild transition (~2s)
  wild += clamp(wildTarget - wild, -dt / 2, dt / 2);
  const w = smooth(wild); G.uWild.value = w;
  scene.background.lerpColors(PAL.sky[0], PAL.sky[1], w);
  scene.fog.color.lerpColors(PAL.fog[0], PAL.fog[1], w);
  groundMat.color.lerpColors(PAL.ground[0], PAL.ground[1], w);
  hemi.color.lerpColors(PAL.hemiSky[0], PAL.hemiSky[1], w); hemi.groundColor.copy(groundMat.color).lerp(col.set('#f6c4a2'), 0.6 * (1 - w));
  key.color.lerpColors(PAL.key[0], PAL.key[1], w); key.intensity = lerp(2.3, 1.6, w);
  discMat.color.lerpColors(PAL.sun[0], PAL.sun[1], w);
  lidMat.color.copy(discMat.color).multiplyScalar(0.9);
  halo.material.color.set('#ffcf6a').lerp(col.set('#ff7a3a'), w); halo.material.opacity = lerp(0.18, 0.75, w); halo.scale.setScalar(lerp(1, 1.25, w));
  spots.material.opacity = w * 0.9;
  for (const d of drips) { const L2 = d.userData.len * smooth(clamp(wild * 1.3 - 0.3, 0, 1)); d.scale.set(1, Math.max(0.001, L2), 1); d.position.y = d.userData.yEdge - L2 * 0.5 + 0.02; d.visible = L2 > 0.005; }
  for (const c of clouds) {
    c.material.color.lerpColors(PAL.cloud[0], PAL.cloud[1], w); c.position.x = c.userData.base[0] + Math.sin(t * 0.05 + c.userData.base[1] * 3) * 0.06;
    const dg = smooth(clamp(wild * 1.4 - 0.4, 0, 1)), dd = c.userData.drip; // drips sag down slowly after the colour shift
    dd.visible = dg > 0.01; dd.material.opacity = c.userData.o * dg; dd.material.color.copy(c.material.color);
    dd.scale.y = Math.max(0.01, dg * (1 + 0.05 * Math.sin(t * 0.9 + c.userData.base[0] * 4)));
  }
  // neon
  const nOn = smooth(clamp((wild - 0.35) / 0.65, 0, 1));
  const flick = nOn > 0 && nOn < 1 ? (Math.sin(t * 60) > 0.2 ? 1 : 0.35) : 1;
  neonMat.color.set('#3b2a2a').lerp(NEON, nOn * flick);
  neonRing.visible = neonStrip.visible = nOn > 0.01;
  { const sag = smooth(clamp(wild, 0, 1)); // neon rides down with the melting diner
    for (const o of [neonRing, neonStrip, ...neonGlows]) if (o.userData.y0) o.position.y = o.userData.y0 * (1 - (o.userData.y0 > 3.5 ? 0.25 : 0.19) * sag); }
  for (const g of neonGlows) g.material.opacity = nOn * 0.6 * flick;
  neonLight.intensity = nOn * 9 * flick;
  // melt (staggered per object)
  for (const m of meltables) {
    const k = smooth(clamp((wild - m.delay) / (1 - m.delay * 0.6), 0, 1));
    m.k = k; for (const e of m.meshes) e.u.uMelt.value = k;
    if (m.puddle) { m.puddle.scale.setScalar(Math.max(0.001, k * 0.75)); m.puddle.material.color.set(m.puddleColor).lerp(groundMat.color, 0.12); }
  }
  updateDrips(t);

  // level (clock, car, townsfolk, obstacles)
  director?.update(dt, t, { wolfPos: wolfState.pos, titleUp: !!window.__titleUp || !wolfReady || !!MAP });   // scenes: triggers + timeline
  level.update(dt, t, { wolfPos: wolfState.pos, keys, wild: w, titleUp: !!window.__titleUp || !wolfReady || !!MAP });
  wolfFootsteps(); audio.update(dt);
  // wolf riding shotgun
  if (wolfReady && level.inCar && !puppet.on) {
    level.car.root.updateMatrixWorld(true); cockpit.wolfRig.matrixWorld.decompose(wolf.position, wolf.quaternion, tmpV); wolf.scale.setScalar(wolfBaseScale * level.seatScale); wolfState.pos.copy(wolf.position).setY(0);
    actWalk.setEffectiveWeight(0); actRun.setEffectiveWeight(0); actIdle.setEffectiveWeight(1); actIdle.timeScale = 1;
    const body = wolf.userData.body; body.rotation.set(0, 0, Math.sin(t * 7) * 0.01 * clamp(level.car.v / 10, 0, 1)); body.position.x = 0; body.scale.y = wolf.userData.sy; mixer.update(dt);
    const hd0 = wolf.userData.head; if (hd0) { hd0.e.set(cockpit.wolfHeadTilt || 0, cockpit.wolfHeadYaw || 0, 0); hd0.q.setFromEuler(hd0.e); hd0.bone.quaternion.multiply(hd0.q); }
  }
  cockpit.wolfH = 1.75 * wolfBaseScale * level.seatScale; cockpit.update(dt, t);
  { const rk = smooth(clamp(wild, 0, 1)); level.car.body.updateMatrixWorld(true); RIDE.uCar.value.copy(level.car.body.matrixWorld); RIDE.uCarInv.value.copy(level.car.body.matrixWorld).invert();
    if (cockpit.rm) cockpit.rm.value = rk; wolfRM.value = level.inCar && !puppet.on ? rk : 0; moth?.update(dt, t, wolfState.pos, rk); }
  // wolf as a scene puppet: scenes.js sets position/yaw/scale + puppet.speed; same shared-phase gait as walking
  if (wolfReady && puppet.on) {
    const sp = puppet.speed, move = clamp(sp / 1.4, 0, 1), idle = 1 - move;
    wolf.userData.phase = (wolf.userData.phase + dt * 0.95 * clamp(sp / 2.4, 0.45, 1.25) * move) % 1; const ph = wolf.userData.phase;
    actWalk.setEffectiveWeight(move); actRun.setEffectiveWeight(0); actIdle.setEffectiveWeight(idle); actWalk.time = ph * actWalk.getClip().duration; actWalk.timeScale = actRun.timeScale = 0;
    const body = wolf.userData.body, shift = Math.sin(t * 0.55) * 0.6 + Math.sin(t * 0.23 + 1.3) * 0.4;
    body.rotation.set(0.02 * move, 0, Math.sin(ph * Math.PI * 2) * 0.02 * move + idle * shift * 0.012); body.position.x = idle * shift * 0.012;
    body.scale.y = wolf.userData.sy;
    mixer.update(dt);
    const hd = wolf.userData.head; if (hd) { hd.yaw = puppet.headYaw || 0; hd.tilt = puppet.headTilt || 0; hd.e.set(hd.tilt * 0.4, hd.yaw, hd.tilt); hd.q.setFromEuler(hd.e); hd.bone.quaternion.multiply(hd.q); }
    wolfState.pos.copy(wolf.position).setY(0); wolfState.yaw = wolf.rotation.y; wolfState.speed = sp;
  }
  // wolf movement
  if (wolfReady && level.mode === 'walk' && !level.frozen && !puppet.on) {
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
    { const [cx, cz] = LAYOUT.townCenter, R0 = LAYOUT.walkRadius, dx = p.x - cx, dz = p.z - cz, pr = Math.hypot(dx, dz); // invisible boundary: town on foot, the desert is for driving
      if (pr > R0) { p.x = cx + dx * R0 / pr; p.z = cz + dz * R0 / pr; if (!level.edgeWalkSaid) { level.toast('Too far to walk. Catch the ride.', 2.4); level.edgeWalkSaid = true; } } else if (pr < R0 - 6) level.edgeWalkSaid = false; }
    wolf.position.copy(p); wolf.rotation.set(0, wolfState.yaw, 0); wolf.scale.setScalar(wolfBaseScale);
    // anim blend
    const sp = wolfState.speed;
    // one shared gait phase drives both clips so walk<->run blends stay in step; weight 0 = clean bind pose (idle)
    const move = clamp(sp / 1.4, 0, 1), runK = smooth(clamp((sp - 3.4) / 2.6, 0, 1));
    const cadence = lerp(0.95, 1.55, runK) * clamp(sp / 2.4, 0.45, 1.25); // gait cycles per second
    wolf.userData.phase = (wolf.userData.phase + dt * cadence * move) % 1;
    const ph = wolf.userData.phase;
    actWalk.setEffectiveWeight(move * (1 - runK)); actRun.setEffectiveWeight(move * runK); actIdle.setEffectiveWeight(1 - move);
    actWalk.time = ph * actWalk.getClip().duration; actRun.time = ph * actRun.getClip().duration;
    actWalk.timeScale = actRun.timeScale = 0;
    // procedural upper body: forward lean with speed, sway with the stride, lean into turns, idle breathing + slow weight shift
    const body = wolf.userData.body, idle = 1 - move;
    wolf.userData.turn = lerp(wolf.userData.turn || 0, clamp((wolfState.yaw - (wolf.userData.lastYaw ?? wolfState.yaw)) / Math.max(dt, 1e-3), -3, 3), 1 - Math.exp(-dt * 6));
    wolf.userData.lastYaw = wolfState.yaw;
    body.rotation.x = lerp(0, 0.05, runK) * move + 0.02 * move; // the v10 clips carry their own lean; just a touch extra
    // idle: slow weight shift side to side (hip sway + counter-lean), breathing
    const shift = Math.sin(t * 0.55) * 0.6 + Math.sin(t * 0.23 + 1.3) * 0.4;
    body.rotation.z = Math.sin(ph * Math.PI * 2) * 0.02 * move - wolf.userData.turn * 0.04 * move + idle * shift * 0.012; // idle clip breathes; keep a faint weight shift
    body.position.x = idle * shift * 0.012;
    body.scale.y = wolf.userData.sy;
    mixer.update(dt);
    const hd = wolf.userData.head;
    if (hd) {
      // deadpan glance cycle (~9 s): hold centre, look slowly left, hold, centre, look right, hold. Fades out as he moves.
      const c = (t % 9) / 9, sm = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
      const g = (sm(0.18, 0.30, c) - sm(0.42, 0.52, c)) * 0.32 - (sm(0.62, 0.72, c) - sm(0.86, 0.96, c)) * 0.26;
      const k = 1 - Math.exp(-dt * 5);
      hd.yaw = lerp(hd.yaw, g * idle - wolf.userData.turn * 0.05 * move, k);
      hd.tilt = lerp(hd.tilt, idle * 0.05 * Math.sin(t * 0.4), k);
      hd.e.set(hd.tilt * 0.4, hd.yaw, hd.tilt); hd.q.setFromEuler(hd.e);
      hd.bone.quaternion.multiply(hd.q);
    }
    // camera auto-follows behind travel direction unless the player recently dragged the sky
    manualLookT -= dt;
    if (manualLookT <= 0 && sp > 1 && !FP.on) { let d = (wolfState.yaw + Math.PI) - camYawTarget; d = Math.atan2(Math.sin(d), Math.cos(d)); camYawTarget += d * (1 - Math.exp(-dt * 0.8)); }
  }
  camYaw += (camYawTarget - camYaw) * (1 - Math.exp(-dt * 6));
  const portrait = innerHeight > innerWidth;
  const dist = portrait ? 10.5 : 9.5, hgt = portrait ? 4.2 : 3.3;
  const wp = wolfReady ? wolf.position : wolfState.pos;
  let wantFov = portrait ? 62 : 50, wantNear = 0.1;
  if (level.inCar !== FP.wasInCar) { FP.wasInCar = level.inCar; if (level.inCar) cockpit.chase = cockpit.savedChase(); eyeBtn.classList.toggle('fp', level.inCar ? !cockpit.chase : !!FP.on); }
  else if (level.inCar && eyeBtn.classList.contains('fp') === cockpit.chase) eyeBtn.classList.toggle('fp', !cockpit.chase); // C key on desktop
  const fpDrive = level.inCar && !cockpit.chase;
  if (level.inCar) {
    if (fpDrive) { cockpit.camera(camera); wantFov = portrait ? 76 : 62; wantNear = 0.03; snapCam = false; }
    else { level.chaseCam(camera, dt, portrait, snapCam); snapCam = false; }
    if (Q.has('carside')) { const c = level.car, sd = +Q.get('carside') || 7; camera.position.set(c.pos.x + Math.cos(c.yaw) * sd + Math.sin(c.yaw) * 1.5, 1.5, c.pos.z - Math.sin(c.yaw) * sd + Math.cos(c.yaw) * 1.5); camera.lookAt(c.pos.x, 1.0, c.pos.z); } }
  else {
    tmpV.set(wp.x + Math.sin(camYaw) * dist, hgt, wp.z + Math.cos(camYaw) * dist);
    if (snapCam) { FP.tpPos.copy(tmpV); } else FP.tpPos.lerp(tmpV, 1 - Math.exp(-dt * 5));
    camTarget.set(wp.x, portrait ? 2.6 : 2.75, wp.z);
    camera.position.copy(FP.tpPos); camera.lookAt(camTarget); FP.tpQ.copy(camera.quaternion);
    // the Wolf's eyes: quick smooth blend (~0.35 s), free look, gentle walk bob (a bit more in Wild)
    FP.k = clamp(FP.k + (FP.on ? 1 : -1) * dt / 0.35, 0, 1); if (snapCam) FP.k = FP.on; snapCam = false;
    const e = smooth(FP.k);
    if (e > 0 && wolfReady) {
      const move = clamp(wolfState.speed / 1.4, 0, 1), ph = wolf.userData.phase || 0, wb = 1 + w * 0.8;
      const hb = wolf.userData.head?.bone; if (hb) { wolf.updateMatrixWorld(true); hb.getWorldPosition(FP.fpPos); FP.fpPos.y = Math.max(FP.fpPos.y + 0.12, 1.2); } else FP.fpPos.set(wp.x, 1.62, wp.z);
      FP.fpPos.x = wp.x - Math.sin(camYaw) * 0.14; FP.fpPos.z = wp.z - Math.cos(camYaw) * 0.14;      // eyes sit just in front of the head, centred over the body
      FP.fpPos.y += Math.sin(ph * Math.PI * 4) * 0.028 * move * wb + (w ? Math.sin(t * 1.3) * 0.02 * w : 0);
      FP.e.set(FP.pitch + Math.sin(ph * Math.PI * 4 + 0.6) * 0.012 * move * wb, camYaw, Math.sin(ph * Math.PI * 2) * 0.012 * move * wb + Math.sin(t * 0.9) * 0.025 * w);
      FP.fpQ.setFromEuler(FP.e);
      camera.position.lerpVectors(FP.tpPos, FP.fpPos, e); camera.quaternion.slerpQuaternions(FP.tpQ, FP.fpQ, e);
      wantFov = lerp(wantFov, portrait ? 74 : 64, e); wantNear = lerp(0.1, 0.03, e);
    }
    // sleeves + paws ride the camera; crossed arms hang off the body (only seen when looking down while idle)
    const showArms = e > 0.85 && wolfReady;
    fpArms.visible = showArms; fpCross.visible = false; // v10: arms-down Wolf, so no crossed-arms prop when looking down
    if (showArms) {
      const move = clamp(wolfState.speed / 1.4, 0, 1), ph = (wolf.userData.phase || 0) * Math.PI * 2, idle = 1 - move;
      fpArms.position.copy(camera.position); fpArms.quaternion.copy(camera.quaternion);
      const sw = Math.sin(ph) * 0.07 * move, dn = idle * 0.45;
      fpL.position.set(-0.3, -0.4 - dn + Math.abs(Math.sin(ph)) * 0.015 * move, -0.05 + sw); fpL.rotation.set(0.38 + sw * 0.8, -0.18, 0.1);
      fpR.position.set(0.3, -0.4 - dn + Math.abs(Math.cos(ph)) * 0.015 * move, -0.05 - sw); fpR.rotation.set(0.38 - sw * 0.8, 0.18, -0.1);
      const prt = innerHeight > innerWidth, cd = prt ? 0.36 : 0.32; // portrait: smaller, lower, a touch further out so they don't fill the screen
      fpCross.position.set(FP.fpPos.x - Math.sin(camYaw) * cd, FP.fpPos.y - (prt ? 0.66 : 0.58), FP.fpPos.z - Math.cos(camYaw) * cd); fpCross.rotation.set(0, camYaw, 0);
      fpCross.scale.setScalar(idle > 0.3 ? (prt ? 0.4 : 0.62) : 0.001);
    }
    // the Wolf model hides in first person but still casts his shadow (colour/depth writes off; the shadow pass ignores those)
    const hideWolf = e > 0.6; if (wolfReady && hideWolf !== !!FP.hidden) { FP.hidden = hideWolf; setWolfGhost(hideWolf); }
    // Wild first person: warm pink vignette with wobbly fuzzy-melt edges
    const fx = e * w; fpFx.style.opacity = fx.toFixed(3);
    if (fx > 0.01 && ((t * 12) | 0) !== FP.hz) { FP.hz = (t * 12) | 0; hazeT.setAttribute('baseFrequency', `${(0.011 + 0.003 * Math.sin(t * 1.7)).toFixed(4)} ${(0.018 + 0.004 * Math.cos(t * 1.3)).toFixed(4)}`); hazeT.setAttribute('seed', String(3 + (FP.hz % 7))); }
  }
  if (level.inCar) { fpArms.visible = fpCross.visible = false; fpFx.style.opacity = 0; if (FP.hidden) { FP.hidden = false; setWolfGhost(false); } }
  if (camera.fov !== wantFov || camera.near !== wantNear) { camera.fov = wantFov; camera.near = wantNear; camera.updateProjectionMatrix(); }
  const cc = DEBUG.closeCam; // screenshot/QA hook: close-up orbit relative to the wolf's facing
  if (cc && wolfReady) { const a = wolfState.yaw + (cc.yaw || 0); camera.position.set(wp.x + Math.sin(a) * cc.dist, cc.h, wp.z + Math.cos(a) * cc.dist); camTarget.set(wp.x, cc.ty, wp.z); camera.lookAt(camTarget); }
  if (QCAM) { camera.position.set(QCAM[0], QCAM[1], QCAM[2]); camTarget.set(QCAM[3], QCAM[4], QCAM[5]); camera.lookAt(camTarget); }
  director?.camera(camera, dt);   // scene shots / hand-back blend + speech bubbles
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
  if (LIDQ !== null) lc = LIDQ;
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

  if (MAP) { // top-down layout render for the level map
    if (!mapCam) { const town = MAP === 'town', asp = innerWidth / innerHeight; const [cx, cz, hz] = town ? [4, 6, 34] : [62, -495, 560]; const hx = hz * asp;
      mapCam = new THREE.OrthographicCamera(-hx, hx, hz, -hz, 1, 3000); mapCam.position.set(cx, 1000, cz); mapCam.up.set(0, 0, -1); mapCam.lookAt(cx, 0, cz);
      window.__mapView = { cx, cz, hx, hz }; sun.visible = false; scene.fog.near = 1e5; scene.fog.far = 2e5; for (const m of level.spotMarkers) m.visible = true;
      document.body.classList.add('map'); const sc2 = key.shadow.camera; sc2.left = sc2.bottom = town ? -40 : -40; sc2.right = sc2.top = 40; sc2.updateProjectionMatrix(); }
    key.position.set(window.__mapView.cx, 0, window.__mapView.cz).add(KEY_OFFSET); key.target.position.set(window.__mapView.cx, 0, window.__mapView.cz);
    renderer.render(scene, mapCam); requestAnimationFrame(frame); return;
  }
  cockpit.renderMirror(renderer, scene);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

loadAll().then(() => {
  const ld = document.getElementById('load'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 900);
  renderer.compile(scene, camera); // warm shaders while the title screen is up
  window.__title?.ready();
  // QA hooks: ?drive  ?at=<metres along road>  ?short  ?end=win|lose
  if (Q.has('greet')) { wolfState.pos.set(LAYOUT.pickup[0] - 5, 0, LAYOUT.pickup[1] + 0.5); wolfState.yaw = Math.PI / 2; camYawTarget = camYaw = 0; snapCam = true; }
  if (Q.has('walk')) { input.y = -(+Q.get('walk') || 0.6); }  // QA: hold the joystick forward
  if (Q.has('drive') || Q.has('at')) { level.enterCar(); if (Q.has('at')) level.teleportCar(+Q.get('at') || 0, Q.has('short') ? level.SHORT : level.MAIN); }
  if (Q.get('end')) setTimeout(() => level.forceEnd(Q.get('end') === 'win'), 300);
  if (Q.has('gas')) keys.ArrowUp = true;
  // motion scenes (scenes.js). ?scenes=0 turns them off (old instant arrival / 2:00 lose)
  if (Q.get('scenes') !== '0') {
    director = createDirector({ scene, camera, L: level, CK: cockpit, load: (u) => load(u), normalize, feltMat, rbox, colliders, puppet,
      getWolf: () => wolf, getMoth: () => moth, playCue: (n) => audio.playCue(n), onSay: (who, blocking, dur, vo) => audio.say(who, blocking, dur, vo), voDur: (n) => audio.voDur(n), onSkip: () => { audio.stopVoice(); audio.ui('confirm'); },
      onFreeze: () => { for (const k in keys) keys[k] = false; input.x = input.y = 0; joyId = null; lookId = null; joy.style.display = 'none';
        const c = level.ctl; c.left = c.right = c.gas = c.brake = false; c.tilt = null; document.querySelectorAll('#drive .on, #drive .down').forEach(b => b.classList.remove('on', 'down')); } });
    puppet.base = wolfBaseScale; window.__director = director;
    director.init().then(() => { if (Q.get('scene')) debugScene(Q.get('scene')); }).catch(e => console.warn('scenes failed to load', e));
  }
  window.__ready = true;
}).catch(e => { document.getElementById('err').style.display = 'block'; document.getElementById('err').textContent = 'Load error: ' + e.message; console.error(e); });
requestAnimationFrame(frame);
// QA: ?scene=store_win|store_lose|roadside|handoff_test drives you there (after the title is dismissed) and lets it play
function debugScene(name) {
  const go = () => {
    if (window.__titleUp) { setTimeout(go, 200); return; }
    if (level.mode === 'walk') level.enterCar();
    if (name === 'store_win' || name === 'store_lose') {
      if (name === 'store_lose') level.left = -20; else level.left = Math.max(level.left, 60);
      level.teleportCar(level.MAIN.len - 38); keys.ArrowUp = true;
    } else if (name === 'roadside') {
      const A = director.anchors.roadside(); level.teleportCar(A.d - 120); DEBUG.autopilot = true;
    } else director.play(name);
  };
  go();
}
// QA autopilot: hold gas and steer along MAIN (roadside probe)
function autopilot() { if (!DEBUG.autopilot || level.mode !== 'drive' || level.frozen) return; const c = level.car, nr = level.nearestRoad(c.pos.x, c.pos.z);
  const r = level.atDist(level.MAIN, level.MAIN.cum[nr.road === level.MAIN ? nr.i : 0] + 14); const want = Math.atan2(r.x - c.pos.x, r.z - c.pos.z);
  const d = Math.atan2(Math.sin(want - c.yaw), Math.cos(want - c.yaw)); level.ctl.left = d > 0.04; level.ctl.right = d < -0.04; level.ctl.gas = c.v < 13; }
setInterval(autopilot, 50);
// ---------------------------------------------------------------- audio (audio.js): hooks
audio.attach({ L: level, CK: cockpit, getDirector: () => director, getWild: () => wild, wolfState });
cockpit.onCast = (m, from, to) => audio.cast(m, from, to);
// UI: a tick on button presses, a confirm on toggles (TILT; the eye/skip rings confirm when they complete; WILD has its sting)
addEventListener('pointerdown', e => { const b = e.target.closest?.('.dbtn,#getIn,#retry,#eyeBtn,#skipBtn'); if (!b || b.id === 'bHorn') return;
  if (b.id === 'bTilt') audio.ui('confirm'); else audio.ui('tick', /^(bL|bR|bGas|bBrake)$/.test(b.id)); }, { capture: true, passive: true });
// Wolf footsteps on foot: the gait is one shared phase (0-1) driving the walk/run clips, so each foot plant happens at a
// fixed phase. Those phases are measured once from the walk clip's foot bones (heel strike per foot), then a step plays
// whenever the phase crosses one - frame-rate independent, same for the player walk and scene puppeting.
const _fv = new THREE.Vector3();
function calibrateFeet() {
  const f = wolf.userData.feet, wm = wolf.userData.body; if (!f?.length) return [0, 0.5];
  const prof = [], wW = actWalk.getEffectiveWeight(), wR = actRun.getEffectiveWeight(), wI = actIdle.getEffectiveWeight(), tW = actWalk.time, tR = actRun.time, tI = actIdle.time, N = 64, best = f.map(() => [1e9, 0]);
  actWalk.setEffectiveWeight(1); actRun.setEffectiveWeight(0); actIdle.setEffectiveWeight(0);
  for (let k = 0; k < N; k++) { actWalk.time = k / N * actWalk.getClip().duration; mixer.update(0); wm.updateMatrixWorld(true);
    f.forEach((b, i) => { b.getWorldPosition(_fv); const y = _fv.y; (prof[i] ||= []).push(y); if (y < best[i][0]) best[i] = [y, k / N]; }); }
  wolf.userData.footProfile = prof.map(r => r.map(y => +(y - Math.min(...r)).toFixed(3)));
  actWalk.setEffectiveWeight(wW); actRun.setEffectiveWeight(wR); actIdle.setEffectiveWeight(wI); actWalk.time = tW; actRun.time = tR; actIdle.time = tI; mixer.update(0);
  // contact = the phase where the foot first comes down to within 8% of its lowest point (heel strike), not the lowest point itself
  return wolf.userData.footProfile.map((r, i) => { const th = Math.max(...r) * 0.08; for (let k = 0; k < N; k++) if (r[k] < th && r[(k + N - 1) % N] >= th) return k / N; return best[i][1]; });
}
function wolfFootsteps() {
  if (!wolfReady || !wolf || level.inCar || window.__titleUp) return;
  const u = wolf.userData; if (!u.plants) u.plants = calibrateFeet();
  const ph = u.phase || 0, p0 = u.lastPh ?? ph; u.lastPh = ph;
  const sp = puppet.on ? puppet.speed : wolfState.speed, d = ((ph - p0) % 1 + 1) % 1; if (sp < 0.3 || d === 0 || d > 0.5) return;
  for (const q of u.plants) if (((q - p0) % 1 + 1) % 1 > 0 && ((q - p0) % 1 + 1) % 1 <= d) { u.steps = (u.steps || 0) + 1; audio.step(Math.abs(sp)); }
}
window.__sunspots = { puppet, get director() { return director; }, DEBUG, toggleWild, toggleFP, FP, cockpit, input, keys, get wild() { return wild; }, scene, camera, level, wolfState };
