// missions/swimlesson.js — Next Level: LATE NIGHT SWIM LESSON WITH RAM.
//   Night at Ram's (1924 Craftsman) -> tea -> intro clip video/ram_swim_intro.mp4 (if it exists; hold/tap to skip)
//   -> the Boss's pool (the Vulture's 2024 glass house; he's out of town till Thursday) -> DIVE IN -> THE MELT: zero-G,
//   the water lifts off in blobs, the crew floats -> free-float swim -> a Star Fox-style rail through misty glowing rings
//   (teal / violet / pale gold, never rainbow), combos, gentle obstacles (floating pool toys, drifting lawn chairs),
//   the crew swimming alongside, one big final ring, a soft landing back in the pool, stars.
// Self-installing (index.html <script type=module>); plugs into the room "lane" slot of town.js (T.lane / T.scene / T.camera),
// so main.js renders it like the bowling lane. 1 rig (the room's Wolf); crew = static lo models with procedural motion. 0 Meshy.
// QA: ?swim (straight in) · ?swim=quick (skip the tea talk) · ?swim=fly (skip to the float) · ?swimauto (autopilot) · window.__swim
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sunspotsApply, sunspotsLowEnd } from '../sunspots_material.js';
import { audio } from '../audio.js';

const Q = new URLSearchParams(location.search);
const VIDEO = 'video/ram_swim_intro.mp4';
const PAL = { teal: new THREE.Color('#5fe3d2'), violet: new THREE.Color('#a98cff'), gold: new THREE.Color('#ffe3a1'), mist: new THREE.Color('#7fd8e8') };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = THREE.MathUtils.lerp, smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let seed = 90210; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ------------------------------------------------------------------ felt helpers (matte, vertex-coloured, one fibre texture)
let FELT = null;
function feltTex() { if (FELT) return FELT; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 128, 128); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1400; i++) { const x = r() * 128, y = r() * 128, a = r() * 6.28, l = 2 + r() * 5, v = r() < 0.5 ? 255 : 120; g.strokeStyle = `rgba(${v},${v},${v},${0.12 + r() * 0.2})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l, y + Math.sin(a + 1) * l, x + Math.cos(a) * l * 1.6, y + Math.sin(a) * l * 1.6); g.stroke(); }
  FELT = new THREE.CanvasTexture(c); FELT.wrapS = FELT.wrapT = THREE.RepeatWrapping; FELT.colorSpace = THREE.SRGBColorSpace; return FELT; }
const matCache = {};
function felt(extra = {}) { const k = JSON.stringify(extra); return matCache[k] ||= new THREE.MeshLambertMaterial({ vertexColors: true, map: feltTex(), ...extra }); }
const _e = new THREE.Euler(), _c = new THREE.Color();
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const KEEP = ['position', 'normal', 'uv', 'color'];
function part(L, geo, col, m) { geo = geo.index ? geo.toNonIndexed() : geo; if (m) geo.applyMatrix4(m); const n = geo.attributes.position.count, a = new Float32Array(n * 3); _c.set(col);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(geo.attributes)) if (!KEEP.includes(k)) geo.deleteAttribute(k); L.push(geo); }
function stripes(geo, cols, axis = 'x', freq = 6) {   // per-face colour bands by angle (felt stripes, no textures)
  geo = geo.index ? geo.toNonIndexed() : geo; const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3), C = cols.map(c => new THREE.Color(c));
  for (let t = 0; t < n; t += 3) { let cx = 0, cy = 0, cz = 0; for (let j = 0; j < 3; j++) { cx += p.getX(t + j); cy += p.getY(t + j); cz += p.getZ(t + j); }
    const ang = axis === 'y' ? Math.atan2(cz, cx) : Math.atan2(cy, cx); const idx = ((Math.floor((ang / (Math.PI * 2) + 1) * freq * C.length)) % C.length + C.length) % C.length, cc = C[idx];
    for (let j = 0; j < 3; j++) { a[(t + j) * 3] = cc.r; a[(t + j) * 3 + 1] = cc.g; a[(t + j) * 3 + 2] = cc.b; } }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
const mesh = (L, m) => new THREE.Mesh(mergeGeometries(L, false), m || felt());
const triCount = (root) => { let n = 0; root.traverseVisible(o => { if (o.isMesh) { const g = o.geometry; n += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } }); return Math.round(n); };

// ------------------------------------------------------------------ props (felt, procedural)
function lawnChair() { const L = [];
  for (const sx of [-1, 1]) { part(L, new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), '#f4f1ea', M4(sx * 0.32, 0.32, 0, Math.PI / 2 - 0.12)); part(L, new THREE.CylinderGeometry(0.03, 0.03, 0.75, 5), '#f4f1ea', M4(sx * 0.32, 0.62, -0.92, -0.45)); part(L, new THREE.CylinderGeometry(0.025, 0.025, 0.36, 4), '#f4f1ea', M4(sx * 0.32, 0.16, 0.55)); part(L, new THREE.CylinderGeometry(0.025, 0.025, 0.36, 4), '#f4f1ea', M4(sx * 0.32, 0.16, -0.5)); }
  const web = ['#3fb8a8', '#f4f1ea', '#e8806a', '#f4f1ea'];
  for (let i = 0; i < 8; i++) part(L, new THREE.BoxGeometry(0.62, 0.025, 0.14), web[i % 4], M4(0, 0.36 + i * 0.003, 0.62 - i * 0.17, -0.12));
  for (let i = 0; i < 4; i++) part(L, new THREE.BoxGeometry(0.62, 0.025, 0.14), web[(i + 1) % 4], M4(0, 0.5 + i * 0.13, -0.86 - i * 0.07, -1.1));
  return mesh(L); }
function donut(cols = ['#e8806a', '#f4f1ea']) { return mesh([stripes(new THREE.TorusGeometry(0.42, 0.17, 7, 16), cols, 'x', 4)]); }
function beachBall() { return mesh([stripes(new THREE.SphereGeometry(0.38, 12, 8), ['#3fb8a8', '#f4f1ea', '#f2c94c', '#f4f1ea', '#8a6fd8', '#f4f1ea'], 'y', 1)]); }
function duck() { const L = []; part(L, new THREE.SphereGeometry(0.34, 9, 6), '#f2c94c', M4(0, 0, 0, 0, 0, 0, 1.25, 0.85, 1)); part(L, new THREE.SphereGeometry(0.22, 8, 6), '#f2c94c', M4(0.3, 0.3, 0));
  part(L, new THREE.ConeGeometry(0.08, 0.2, 6), '#e8806a', M4(0.52, 0.27, 0, 0, 0, -Math.PI / 2)); for (const s of [-1, 1]) part(L, new THREE.SphereGeometry(0.04, 5, 4), '#2b1e3c', M4(0.43, 0.37, s * 0.11));
  part(L, new THREE.ConeGeometry(0.12, 0.18, 5), '#f2c94c', M4(-0.42, 0.12, 0, 0, 0, 1.0)); return mesh(L); }
function teaSet() { const L = []; part(L, new THREE.SphereGeometry(0.12, 9, 6), '#e8d6b0', M4(0, 0.1, 0, 0, 0, 0, 1, 0.8, 1)); part(L, new THREE.CylinderGeometry(0.02, 0.03, 0.14, 5), '#e8d6b0', M4(0.14, 0.12, 0, 0, 0, -0.9));
  part(L, new THREE.SphereGeometry(0.03, 5, 4), '#7a4e2e', M4(0, 0.2, 0)); part(L, new THREE.TorusGeometry(0.06, 0.015, 4, 8), '#e8d6b0', M4(-0.13, 0.11, 0));
  for (const [x, z] of [[0.28, 0.12], [-0.25, 0.2]]) { part(L, new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), '#fff3dc', M4(x, 0.035, z)); part(L, new THREE.CylinderGeometry(0.085, 0.085, 0.01, 10), '#fff3dc', M4(x, 0.003, z)); }
  part(L, new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14), '#7a4e2e', M4(0, -0.02, 0.05)); return mesh(L); }
const PROPS = { chair: lawnChair, donut: () => donut(), ring2: () => donut(['#8a6fd8', '#f4f1ea']), ball: beachBall, duck };
const PROP_R = { chair: 0.85, donut: 0.62, ring2: 0.62, ball: 0.5, duck: 0.55 };

// ------------------------------------------------------------------ glow shaders (additive, no fog: they carry their own fade)
const NOISE = `float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1.,0.)),f.x),mix(hh(i+vec2(0.,1.)),hh(i+vec2(1.,1.)),f.x),f.y);}`;
function ringMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uCol2: { value: new THREE.Color() }, uA: { value: 1 }, uFlash: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vAng; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; vAng=atan(position.y,position.x); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uTime,uA,uFlash; uniform vec3 uCol,uCol2; varying vec3 vN; varying vec3 vV; varying float vAng;
    void main(){ float f=1.-abs(dot(normalize(vN),normalize(vV))); float sh=0.72+0.28*sin(vAng*5.+uTime*2.3)*sin(vAng*2.-uTime*1.3);
      vec3 c=mix(uCol,uCol2,0.5+0.5*sin(vAng*3.+uTime*0.8))*(0.45+1.25*pow(f,1.4))*sh; c+=vec3(1.,0.95,0.85)*uFlash*0.8; gl_FragColor=vec4(c*uA,1.); }` }); }
function haloMat() { return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uCol2: { value: new THREE.Color() }, uA: { value: 1 }, uFlash: { value: 0 }, uSeed: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float uTime,uA,uFlash,uSeed; uniform vec3 uCol,uCol2; varying vec2 vP; ${NOISE}
    void main(){ float r=length(vP); float a=atan(vP.y,vP.x);
      float band=exp(-pow((r-1.)/0.16,2.)); float haze=exp(-pow((r-1.)/0.55,2.))*0.38;
      vec2 q=vP*1.7+vec2(uSeed); float m=vn(q+vec2(uTime*0.25,-uTime*0.18))*0.6+vn(q*2.3-vec2(uTime*0.31,uTime*0.12))*0.4;
      float mist=m*smoothstep(1.05,0.15,r)*0.2; float wisp=vn(vec2(a*2.5+uSeed,r*3.-uTime*0.6))*haze;
      vec3 c=uCol*(band*0.85+haze*0.6+wisp*0.9)+uCol2*mist*(1.+uFlash*2.); c*=smoothstep(1.9,1.5,r);
      gl_FragColor=vec4(c*uA,1.); }` }); }

export function createSwimLesson(T) {
  const M = T.M; const S = T.state;
  const AUTO = Q.has('swimauto'), LOW = sunspotsLowEnd();
  // ---------------------------------------------------------------- mission table (shared errand system, town.js T.M)
  if (M) { M.OBJ.swim = ['', 'Finish the swim lesson (Ram\'s house, after dark)', '']; M.TITLE.swim = 'LATE NIGHT SWIM LESSON'; M.DONE.swim = 2; M.DONE_MSG.swim = '. The Boss will never know. He never knows.';
    M.TGT.swim = [0, 'm_route0'];   // Ram's door (missions13 spot)
    if (!M.MLIST.includes('swim')) M.MLIST.push('swim'); S.swim = S.swim || 0; }

  // ---------------------------------------------------------------- scene, sky, fog, lights
  const scene = new THREE.Scene(); scene.name = 'swim lesson';
  const FOG0 = new THREE.Color('#141634'), FOG1 = new THREE.Color('#1c1440');
  scene.fog = new THREE.FogExp2(FOG0.clone(), 0.012); scene.background = FOG0.clone();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);
  const U = { uTime: { value: 0 }, uMelt: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: `uniform float uTime,uMelt; varying vec3 vD; ${NOISE}
      void main(){ float y=vD.y; vec3 top=vec3(0.035,0.04,0.13), hor=vec3(0.13,0.09,0.24), low=vec3(0.06,0.05,0.12);
        vec3 c=mix(hor,top,smoothstep(0.02,0.6,y)); c=mix(c,low,smoothstep(0.0,-0.25,y));
        float a=atan(vD.z,vD.x); float veil=vn(vec2(a*3.,y*6.-uTime*0.05))*smoothstep(0.05,0.35,y)*smoothstep(0.75,0.35,y);
        c+=mix(vec3(0.09,0.3,0.32),vec3(0.24,0.17,0.42),0.5+0.5*sin(a*2.+uTime*0.1))*veil*(0.18+0.5*uMelt);
        gl_FragColor=vec4(c,1.); }` }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  { const n = 420, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, y = 0.08 + rnd() * 0.9, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 820, y * 820, Math.sin(a) * r * 820], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff1d0', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75, depthWrite: false })); st.frustumCulled = false; scene.add(st); }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(30, 20), new THREE.MeshBasicMaterial({ color: '#fff0c8', fog: false })); moon.position.set(-300, 420, -560); moon.lookAt(0, 0, 0); scene.add(moon);
  const hemi = new THREE.HemisphereLight('#8b93d8', '#1d2a2a', 1.1); scene.add(hemi);
  const moonL = new THREE.DirectionalLight('#c8d4ff', 1.3); moonL.position.set(-30, 50, -40); scene.add(moonL);
  const poolL = new THREE.PointLight('#5fe3d2', 18, 16, 1.6); poolL.position.set(0, 0.6, 0); scene.add(poolL);
  const houseL = new THREE.PointLight('#ffcf86', 14, 22, 1.6); houseL.position.set(-1, 3, -9); scene.add(houseL);

  // ---------------------------------------------------------------- the Boss's pool: 2024 glass house, terrazzo deck, bougainvillea, lawn chairs
  const world = new THREE.Group(); scene.add(world);
  const PW = 10, PD = 5;   // pool size
  { const L = [];
    part(L, new THREE.PlaneGeometry(700, 700, 1, 1), '#1d3a2e', M4(0, -0.31, 0, -Math.PI / 2));   // the lawn (below the waterline, so it never covers the pool)
    const dk = '#e9dccb'; const deck = (w, d, x, z) => part(L, new THREE.BoxGeometry(w, 0.3, d), dk, M4(x, -0.15, z));
    deck(26, 6, 0, -PD / 2 - 3); deck(26, 7, 0, PD / 2 + 3.5); deck(8, PD, -PW / 2 - 4, 0); deck(8, PD, PW / 2 + 4, 0);
    for (const [w, d, x, z] of [[PW + 0.6, 0.3, 0, -PD / 2 - 0.15], [PW + 0.6, 0.3, 0, PD / 2 + 0.15], [0.3, PD, -PW / 2 - 0.15, 0], [0.3, PD, PW / 2 + 0.15, 0]]) part(L, new THREE.BoxGeometry(w, 0.1, d), '#f8f4ec', M4(x, 0.03, z));
    const tl = '#1f8f97'; part(L, new THREE.BoxGeometry(PW, 0.05, PD), '#167680', M4(0, -1.6, 0));
    for (const [w, d, x, z] of [[PW, 0.05, 0, -PD / 2], [PW, 0.05, 0, PD / 2], [0.05, PD, -PW / 2, 0], [0.05, PD, PW / 2, 0]]) part(L, new THREE.BoxGeometry(w, 1.6, d), tl, M4(x, -0.8, z));
    part(L, new THREE.BoxGeometry(0.6, 0.08, 2.4), '#f4f1ea', M4(PW / 2 - 1.2, 0.45, -PD / 2 - 0.8)); part(L, new THREE.BoxGeometry(0.5, 0.45, 0.5), '#3a3f6a', M4(PW / 2 - 1.2, 0.22, -PD / 2 - 1.8));
    for (let i = 0; i < 3; i++) part(L, new THREE.BoxGeometry(1.2, 0.05, 0.3), '#f8f4ec', M4(-PW / 2 + 1, -0.3 - i * 0.35, PD / 2 - 0.2 - i * 0.3));
    const HZ = -PD / 2 - 7.5;   // the glass house (white planes, charcoal mullions, gold LED coves)
    part(L, new THREE.BoxGeometry(18, 0.35, 7), '#f4f1ea', M4(-1, 3.4, HZ)); part(L, new THREE.BoxGeometry(11, 0.3, 6), '#f4f1ea', M4(2.5, 6.6, HZ - 0.6));
    part(L, new THREE.BoxGeometry(18.4, 0.12, 0.25), '#ffcf86', M4(-1, 3.18, HZ + 3.4)); part(L, new THREE.BoxGeometry(11.4, 0.1, 0.25), '#ffcf86', M4(2.5, 6.4, HZ + 2.3));
    part(L, new THREE.BoxGeometry(0.5, 6.8, 7), '#f4f1ea', M4(-9.8, 3.4, HZ)); part(L, new THREE.BoxGeometry(3, 3.2, 5.5), '#3b3a44', M4(6.5, 1.6, HZ - 0.5));
    for (let i = 0; i < 7; i++) part(L, new THREE.BoxGeometry(0.1, 3.2, 0.1), '#2b2a33', M4(-9 + i * 2.2, 1.6, HZ + 3.2));
    for (let i = 0; i < 5; i++) part(L, new THREE.BoxGeometry(0.1, 2.9, 0.1), '#2b2a33', M4(-2.5 + i * 2.5, 5.05, HZ + 2.2));
    part(L, new THREE.BoxGeometry(12, 1.0, 2), '#c8b8a2', M4(-2, 0.5, HZ - 1));   // the long sofa inside
    for (let i = 0; i < 16; i++) { const x = -12 + rnd() * 24, z = HZ + 3.7 + rnd() * 0.6; part(L, new THREE.IcosahedronGeometry(0.5 + rnd() * 0.5, 1), rnd() < 0.7 ? '#d63a8a' : '#2f6b3a', M4(x, 0.4 + rnd() * 0.6, z)); }   // bougainvillea
    for (const [x, z] of [[-13, 4], [13, 4], [-13, -3], [13.5, -2.5]]) { part(L, new THREE.CylinderGeometry(0.15, 0.22, 6, 6), '#8a6a4a', M4(x, 3, z)); for (let k = 0; k < 6; k++) part(L, new THREE.ConeGeometry(0.35, 2.6, 4), '#2f8a5a', M4(x + Math.cos(k) * 1.1, 6, z + Math.sin(k) * 1.1, Math.sin(k) * 1.2, 0, Math.cos(k) * 1.2)); }
    for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) part(L, new THREE.SphereGeometry(0.8, 6, 4), '#24513a', M4(sx * 14.5, 0.5, -5 + i * 2.2, 0, 0, 0, 1, 0.8, 1.3));
    for (const [x, z] of [[-11, -1.5], [-11, 3], [11, -1.5], [11, 3]]) { part(L, new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), '#2b2a33', M4(x, 0.5, z)); part(L, new THREE.SphereGeometry(0.16, 7, 5), '#ffe3a1', M4(x, 1.05, z)); }
    world.add(mesh(L));
    const glassM = new THREE.MeshBasicMaterial({ color: '#ffb866', transparent: true, opacity: 0.35 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(17.6, 3.0), glassM); glass.position.set(-1, 1.6, HZ + 3.15); world.add(glass);
    const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 2.8), glassM); glass2.position.set(2.5, 5.0, HZ + 2.15); world.add(glass2);
    const L2 = []; part(L2, new THREE.ConeGeometry(1.6, 4.5, 6), '#1f4a38', M4(0, 3.2, 0)); part(L2, new THREE.CylinderGeometry(0.2, 0.25, 1.2, 5), '#5a4030', M4(0, 0.6, 0));
    const trees = new THREE.InstancedMesh(mergeGeometries(L2, false), felt(), 70); const m = new THREE.Matrix4();   // the felt trees of the hills: one draw
    for (let i = 0; i < 70; i++) { const a = rnd() * 6.283, r = 30 + rnd() * 230, s = 0.8 + rnd() * 1.8; m.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Quaternion(), new THREE.Vector3(s, s * (0.8 + rnd() * 0.6), s)); trees.setMatrixAt(i, m); }
    world.add(trees); }
  // water: glowing teal felt-water (ripples + soft caustic lines); it lifts off at the melt
  const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD, 1, 1), new THREE.ShaderMaterial({ transparent: true, fog: false, uniforms: U,
    vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime,uMelt; varying vec2 vU; ${NOISE}
      void main(){ vec2 p=vU*vec2(10.,5.); float n=vn(p*1.3+vec2(uTime*0.3,uTime*0.2))+vn(p*2.7-vec2(uTime*0.25,-uTime*0.35))*0.5;
        float ca=smoothstep(0.62,0.7,fract(n*1.6)); vec3 c=mix(vec3(0.16,0.62,0.66),vec3(0.45,0.95,0.9),n*0.55)+ca*vec3(0.3,0.45,0.42);
        float e=min(min(vU.x,1.-vU.x)*10.,min(vU.y,1.-vU.y)*5.); c*=0.75+0.25*smoothstep(0.,0.6,e);
        gl_FragColor=vec4(c,0.88*(1.-uMelt*0.75)); }` }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.22; world.add(water);
  const NB = 34, blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#4fd0c8', emissive: '#1a6a70', transparent: true, opacity: 0.72 }), NB);   // water blobs (zero-G): one draw
  const BL = []; for (let i = 0; i < NB; i++) BL.push({ x: (rnd() - 0.5) * PW * 0.9, z: (rnd() - 0.5) * PD * 0.9, r: 0.1 + rnd() * 0.22, h: 1 + rnd() * 6, ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.8 });
  blobs.visible = false; blobs.frustumCulled = false; world.add(blobs);
  const deckProps = []; for (const [k, x, z, ry] of [['chair', -7, 4.2, Math.PI], ['chair', -5.4, 4.4, Math.PI], ['chair', 6, 4.3, Math.PI + 0.2], ['donut', -2, 0.8, 0], ['ball', 2.6, -1.2, 0], ['duck', 3.8, 1.2, 0.5], ['ring2', -3.6, -1.4, 0]]) {
    const o = PROPS[k](); o.position.set(x, k !== 'chair' ? -0.1 : 0, z); o.rotation.y = ry; if (k === 'donut' || k === 'ring2') o.rotation.x = -Math.PI / 2; world.add(o);
    deckProps.push({ o, p0: o.position.clone(), r0: o.rotation.clone(), lift: 1.5 + rnd() * 4, ph: rnd() * 6.28, spin: (rnd() - 0.5) * 0.8 }); }
  const tea = teaSet();

  // ---------------------------------------------------------------- the crew (lo models, felt look, procedural swim; 0 extra rigs)
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const loadGlb = (f) => new Promise((res, rej) => loader.load(new URL('../models/' + f, import.meta.url).href, res, undefined, rej));
  function swimmer(inner, h) { const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt); tilt.add(inner); inner.position.y = -h * 0.5; tilt.position.y = h * 0.5; g.userData = { tilt, inner, h }; return g; }
  const CREW = [{ k: 'ram', f: 'town2/ram_lo.glb', h: 1.7, pool: [-3.4, 0, 3.1, Math.PI * 0.85], fly: [-1, -0.2, 7], land: [-2.6, 1.0] },
    { k: 'bear', f: 'town2/bear_lo.glb', h: 1.85, pool: [3.6, 0, 3.2, -Math.PI * 0.85], fly: [1, -0.55, 10], land: [2.8, -0.6] },
    { k: 'heron', f: 'town2/heron_lo.glb', h: 1.9, pool: [6.0, 0, -0.6, -Math.PI / 2], fly: [0.55, 1, 14], land: [0.8, 1.6] }];
  let crewReady = null;
  function loadCrew() { return crewReady ||= Promise.all(CREW.map(async (c) => { try { const g = await loadGlb(c.f); const root = g.scene;
      root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; if (o.isSkinnedMesh) { o.skeleton.pose(); o.frustumCulled = false; } } }); root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(root), s = c.h / (b.max.y - b.min.y); root.scale.multiplyScalar(s); root.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(root);
      root.position.x -= (b2.min.x + b2.max.x) / 2; root.position.z -= (b2.min.z + b2.max.z) / 2; root.position.y -= b2.min.y; sunspotsApply(root, c.k, c.h);
      const w = new THREE.Group(); w.add(root); c.o = swimmer(w, c.h); c.ph = rnd() * 6.28; scene.add(c.o); } catch (e) { console.warn('swim: crew model failed', c.k, e); } })); }

  // ---------------------------------------------------------------- the rail: one big night loop out over the hills and back to the pool
  const CP = [[0, 3.4, -3], [0, 4.6, -26], [-10, 8, -70], [-48, 13, -118], [-108, 18, -138], [-160, 13, -110], [-186, 17, -52], [-176, 23, 10], [-136, 17, 62], [-80, 12, 94], [-30, 10, 92], [-4, 9, 60], [0, 7.5, 30], [0, 6, 10]];
  const curve = new THREE.CatmullRomCurve3(CP.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const RL = curve.getLength(), NS = 1600, RP = [], RT = [];
  for (let i = 0; i <= NS; i++) { const u = i / NS; RP.push(curve.getPointAt(u)); RT.push(curve.getTangentAt(u)); }
  const UPW = new THREE.Vector3(0, 1, 0);
  function frameAt(s, out) { const f = clamp(s / RL, 0, 1) * NS, i = Math.min(NS - 1, Math.floor(f)), k = f - i;
    out.p.lerpVectors(RP[i], RP[i + 1], k); out.t.lerpVectors(RT[i], RT[i + 1], k).normalize();
    out.r.crossVectors(out.t, UPW).normalize(); out.u.crossVectors(out.r, out.t).normalize(); return out; }
  const mkF = () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }); const F = mkF(), F2 = mkF();
  const placeOn = (fr, x, y, out) => out.copy(fr.p).addScaledVector(fr.r, x).addScaledVector(fr.u, y);
  const _m = new THREE.Matrix4(), _x = new THREE.Vector3();
  const orient = (o, fr) => { _x.crossVectors(fr.u, fr.t); _m.makeBasis(_x, fr.u, fr.t); o.quaternion.setFromRotationMatrix(_m); };

  // course: ring patterns (normalised offsets, scaled by the play box so portrait and landscape both fit), obstacles in the gaps
  const RINGS = [], OBS = []; const S0 = 34, S1 = RL - 48, FINAL_S = RL - 30;
  { let s = S0, pat = 0; seed = 4242; const kinds = ['line', 'slalom', 'spiral', 'climb', 'dive', 'arc'];
    while (s < S1) { const kind = kinds[pat++ % kinds.length], n = kind === 'spiral' ? 6 : 5, gap = 9, ox = (rnd() - 0.5) * 1.1, oy = (rnd() - 0.5) * 0.9;
      for (let i = 0; i < n && s < S1; i++, s += gap) { let x = ox, y = oy; const q = i / (n - 1);
        if (kind === 'slalom') x = (i % 2 ? 0.65 : -0.65); else if (kind === 'spiral') { x = Math.cos(q * 5.2) * 0.62; y = Math.sin(q * 5.2) * 0.62; }
        else if (kind === 'climb') y = lerp(-0.7, 0.7, q); else if (kind === 'dive') y = lerp(0.7, -0.7, q); else if (kind === 'arc') { x = lerp(-0.7, 0.7, q); y = Math.sin(q * Math.PI) * 0.6 - 0.2; }
        const gold = (i === n - 1) && pat % 2 === 0; RINGS.push({ s, nx: clamp(x, -0.85, 0.85), ny: clamp(y, -0.85, 0.85), r: gold ? 1.05 : 1.3, gold, state: 0, vis: null, t: 0 }); }
      const kk = ['chair', 'donut', 'ball', 'duck', 'ring2', 'chair'][pat % 6]; const last = RINGS[RINGS.length - 1];
      OBS.push({ s: s + 4, nx: clamp(-last.nx * 0.9 + (rnd() - 0.5) * 0.3, -0.8, 0.8), ny: clamp((rnd() - 0.5) * 1.2, -0.8, 0.8), k: kk, ph: rnd() * 6.28, spin: (rnd() - 0.5) * 1.6, vis: null, hit: false });
      if (pat % 3 === 0) OBS.push({ s: s + 9, nx: (rnd() - 0.5) * 1.5, ny: (rnd() - 0.5) * 1.5, k: ['duck', 'ball', 'donut'][pat % 3], ph: rnd() * 6.28, spin: (rnd() - 0.5) * 2, vis: null, hit: false });
      s += 16; } }
  // ring visuals (pooled), the final ring, mist sprites, motes
  const ringGeo = new THREE.TorusGeometry(1, 0.07, 6, 28), haloGeo = new THREE.PlaneGeometry(3.8, 3.8);
  const ringPool = []; for (let i = 0; i < 14; i++) { const g = new THREE.Group(), rm = new THREE.Mesh(ringGeo, ringMat()), hm = new THREE.Mesh(haloGeo, haloMat()); hm.material.uniforms.uSeed.value = i * 3.7;
    rm.renderOrder = 2; hm.renderOrder = 1; g.add(hm, rm); g.visible = false; g.userData = { rm, hm, def: null }; scene.add(g); ringPool.push(g); }
  const finalRing = (() => { const g = new THREE.Group(), rm = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), ringMat()), hm = new THREE.Mesh(haloGeo, haloMat()), rm2 = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.03, 4, 48), ringMat());
    for (const m of [rm, rm2, hm]) { m.material.uniforms.uCol.value.copy(PAL.gold); m.material.uniforms.uCol2.value.copy(PAL.violet); } rm2.material.uniforms.uCol.value.copy(PAL.teal);
    g.add(hm, rm, rm2); g.userData = { rm, rm2, hm, state: 0, t: 0 }; g.scale.setScalar(5.2); g.visible = false; scene.add(g); return g; })();
  const mistTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 40; i++) { const x = 20 + r() * 88, y = 20 + r() * 88, rr = 6 + r() * 18; const g2 = g.createRadialGradient(x, y, 0, x, y, rr); g2.addColorStop(0, 'rgba(255,255,255,0.12)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = g2; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mists = []; for (let i = 0; i < (LOW ? 6 : 12); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: [PAL.teal, PAL.violet, PAL.mist][i % 3], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.userData = { s: 0, x: 0, y: 0, sc: 14 + rnd() * 18 }; sp.material.rotation = rnd() * 6; sp.visible = false; scene.add(sp); mists.push(sp); }
  const motes = (() => { const n = LOW ? 180 : 360, p = new Float32Array(n * 3), c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p.set([(rnd() - 0.5) * 40, (rnd() - 0.5) * 26, (rnd() - 0.5) * 80], i * 3); const cc = [PAL.gold, PAL.teal, PAL.violet][i % 3]; c.set([cc.r, cc.g, cc.b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uCam: { value: new THREE.Vector3() }, uA: { value: 0 }, uTime: U.uTime },
      vertexShader: `uniform vec3 uCam; uniform float uTime; attribute vec3 color; varying vec3 vC; void main(){ vec3 b=vec3(40.,26.,80.); vec3 p=mod(position-uCam+b*0.5,b)-b*0.5+uCam; p.y+=sin(uTime*0.7+position.x)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.); vC=color; gl_PointSize=clamp(90./-mv.z,1.,9.); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uA; varying vec3 vC; void main(){ vec2 d=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(d)); gl_FragColor=vec4(vC*a*uA*0.8,1.); }` });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; })();
  const obsFree = {}; const getObs = (k) => { const L = obsFree[k] ||= []; const o = L.pop() || (() => { const m = PROPS[k](); scene.add(m); return m; })(); o.visible = true; return o; };
  const putObs = (k, o) => { o.visible = false; obsFree[k].push(o); };
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 28), new THREE.MeshBasicMaterial({ color: '#c8fff4', transparent: true, opacity: 0, depthWrite: false, fog: false })); splash.rotation.x = -Math.PI / 2; splash.position.y = -0.15; scene.add(splash);

  // ---------------------------------------------------------------- HUD (own overlay; the town/room HUD is hidden while you swim)
  const css = document.createElement('style'); css.textContent = `
  body.swimon > *:not(canvas):not(#grain):not(#vig):not(#swimUI):not(#cine):not(#err):not(script):not(style){visibility:hidden!important}
  #swimUI{position:fixed;inset:0;z-index:40;pointer-events:none;font:800 13px system-ui,sans-serif;color:#ffe9c2;letter-spacing:.06em;display:none;-webkit-user-select:none;user-select:none}
  body.swimon #swimUI{display:block} #swimUI .touch{position:absolute;inset:0;pointer-events:auto;touch-action:none}
  #swimUI .top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 10px);display:flex;justify-content:space-between;align-items:flex-start;padding:0 14px;gap:8px}
  #swimUI .pill{background:#1d1638c0;border-radius:18px;padding:8px 14px} #swimUI .pill small{opacity:.7;font-size:10px;letter-spacing:.2em} #swimUI .pill b{font-size:18px;color:#fff3dc;display:block;letter-spacing:.04em}
  #swimUI .combo{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 60px);transform:translateX(-50%);text-align:center;font-size:13px;color:#bff6ec;text-shadow:0 0 12px #5fe3d2aa;opacity:0;transition:opacity .25s}
  #swimUI .combo.on{opacity:1} #swimUI .combo b{font-size:26px;color:#ffe3a1;display:block}
  #swimUI .bar{position:absolute;left:24%;right:24%;top:calc(env(safe-area-inset-top) + 24px);height:6px;border-radius:3px;background:#ffffff22;overflow:hidden} #swimUI .bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#5fe3d2,#a98cff,#ffe3a1)}
  #swimUI button{pointer-events:auto;border:0;border-radius:24px;min-height:48px;min-width:48px;padding:0 18px;background:#2b1e3cdd;color:#ffe1a8;font:800 13px system-ui,sans-serif;letter-spacing:.14em}
  #swimUI .tilt{position:absolute;left:calc(env(safe-area-inset-left) + 14px);bottom:calc(env(safe-area-inset-bottom) + 16px);display:none}
  #swimUI .big{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18%);transform:translateX(-50%);min-height:64px;font-size:18px;padding:0 34px;background:#5fe3d2;color:#1d1638;box-shadow:0 0 30px #5fe3d288;display:none;white-space:nowrap}
  #swimUI .sub{position:absolute;left:6%;right:6%;bottom:calc(env(safe-area-inset-bottom) + 7%);text-align:center;font:700 16px system-ui,sans-serif;letter-spacing:.02em;color:#fff3dc;text-shadow:0 2px 6px #000c;opacity:0;transition:opacity .2s}
  #swimUI .sub.on{opacity:1} #swimUI .sub b{color:#ffe3a1;margin-right:.4em;letter-spacing:.1em}
  #swimUI .card{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);text-align:center;font-size:min(30px,7vw);letter-spacing:.3em;color:#fff3dc;text-shadow:0 0 24px #a98cffcc,0 0 6px #5fe3d2;opacity:0;transition:opacity .6s;white-space:nowrap}
  #swimUI .card.on{opacity:1} #swimUI .card small{display:block;font-size:11px;letter-spacing:.25em;opacity:.8;margin-top:8px}
  #swimUI .hint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 30%);text-align:center;font-size:12px;letter-spacing:.3em;opacity:0;transition:opacity .4s}
  #swimUI .hint.on{opacity:.85} #swimUI .pop{position:absolute;font-size:16px;color:#ffe3a1;text-shadow:0 0 10px #ffe3a1aa;transform:translate(-50%,-50%);transition:transform .7s ease-out,opacity .7s;pointer-events:none}
  #swimUI .res{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88vw,380px);background:#1d1638ee;border-radius:26px;padding:22px 20px 18px;text-align:center;display:none;pointer-events:auto;box-shadow:0 0 40px #a98cff55}
  #swimUI .res h2{margin:0 0 4px;font-size:15px;letter-spacing:.3em;color:#bff6ec} #swimUI .res .stars{font-size:46px;letter-spacing:.12em;margin:8px 0}
  #swimUI .res .stars span{color:#4a3d5c} #swimUI .res .stars span.on{color:#ffe3a1;text-shadow:0 0 16px #ffe3a1aa}
  #swimUI .res table{margin:6px auto 14px;font-size:13px;border-spacing:14px 4px} #swimUI .res td:first-child{text-align:left;opacity:.7} #swimUI .res td:last-child{text-align:right}
  #swimUI .res .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap} #swimUI .res .again{background:#5fe3d2;color:#1d1638}
  #swimUI .fade{position:absolute;inset:0;background:#0b0a1a;opacity:0;transition:opacity .5s;pointer-events:none} #swimUI .fade.on{opacity:1}`;
  document.head.appendChild(css);
  const ui = document.createElement('div'); ui.id = 'swimUI';
  ui.innerHTML = `<div class="touch"></div><div class="bar"><i></i></div><div class="top"><div class="pill score"><small>SCORE</small><b>0</b></div><div class="pill rings"><small>RINGS</small><b>0/0</b></div><button class="quit" aria-label="Quit">✕</button></div>
    <div class="combo"><b>x1</b><span>COMBO 0</span></div><div class="card"></div><div class="hint"></div><div class="sub"></div>
    <button class="tilt">TILT: OFF</button><button class="big">DIVE IN</button>
    <div class="res"><h2>SWIM LESSON</h2><div class="stars"><span>★</span><span>★</span><span>★</span></div><div class="grade" style="font-size:13px;letter-spacing:.12em;color:#fff3dc"></div><table></table><div class="row"><button class="again">FLY AGAIN</button><button class="home">BACK TO RAM'S</button></div></div><div class="fade"></div>`;
  document.body.appendChild(ui);
  const $ = (s) => ui.querySelector(s);
  const H = { touch: $('.touch'), bar: $('.bar i'), score: $('.score b'), rings: $('.rings b'), combo: $('.combo'), comboB: $('.combo b'), comboS: $('.combo span'), card: $('.card'), hint: $('.hint'), sub: $('.sub'), tilt: $('.tilt'), big: $('.big'), res: $('.res'), fade: $('.fade') };
  const card = (t, small = '', ms = 2200) => { H.card.innerHTML = t + (small ? `<small>${small}</small>` : ''); H.card.classList.add('on'); clearTimeout(card.t); if (ms) card.t = setTimeout(() => H.card.classList.remove('on'), ms); };
  const hint = (t) => { H.hint.textContent = t || ''; H.hint.classList.toggle('on', !!t); };
  let subQ = [], subT = 0;
  const say = (L) => { subQ = L.slice(); subT = 0; nextSub(); };
  function nextSub() { const l = subQ.shift(); if (!l) { H.sub.classList.remove('on'); return false; } H.sub.innerHTML = (l[0] ? `<b>${l[0]}</b>` : '') + l[1]; H.sub.classList.add('on'); subT = 1.6 + l[1].length * 0.05; return true; }
  const fade = async (on, ms = 500) => { H.fade.classList.toggle('on', on); await wait(ms); };
  function pop(txt, x, y) { const d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; ui.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'translate(-50%,-160%)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 800); }

  // ---------------------------------------------------------------- sound: soft glassy chimes + a breathing pad (Web Audio on the game's context; off in sound mode Off)
  const SND = { pad: null };
  const ac = () => (audio?.ctx && audio.mode !== 'off' && audio.ctx.state === 'running') ? audio.ctx : null;
  const vol = () => (audio?.sfxVol ?? 1) * 0.5;
  function chime(n, gold) { const c = ac(); if (!c) return; const t = c.currentTime, f = 392 * Math.pow(2, ([0, 2, 4, 7, 9, 12, 14, 16, 19, 21][Math.min(9, n)]) / 12) * (gold ? 1.5 : 1);
    for (const [m, g] of [[1, 0.22], [2.01, 0.07], [3.0, 0.03]]) { const o = c.createOscillator(), a = c.createGain(); o.type = 'sine'; o.frequency.value = f * m; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g * vol(), t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); o.connect(a).connect(c.destination); o.start(t); o.stop(t + 1.5); } }
  function bonk() { const c = ac(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), a = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.25); a.gain.setValueAtTime(0.25 * vol(), t); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(a).connect(c.destination); o.start(t); o.stop(t + 0.35); }
  function padOn(on) { const c = ac(); if (on && !c) return; if (on && !SND.pad) { const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; g.gain.value = 0; g.connect(c.destination); lp.connect(g);
      const os = [146.8, 220, 293.7, 329.6].map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; o.connect(lp); o.start(); return o; });
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 260; lfo.connect(lg).connect(lp.frequency); lfo.start(); os.push(lfo);
      g.gain.linearRampToValueAtTime(0.05 * vol(), c.currentTime + 2.5); SND.pad = { g, os, c }; }
    if (!on && SND.pad) { const p = SND.pad; SND.pad = null; p.g.gain.cancelScheduledValues(p.c.currentTime); p.g.gain.setTargetAtTime(0, p.c.currentTime, 0.5); setTimeout(() => p.os.forEach(o => { try { o.stop(); } catch (_) { } }), 2500); } }

  // ---------------------------------------------------------------- input: drag (relative, anywhere), keys (WASD / arrows), tilt (opt-in button)
  const G = { on: false, phase: 'off', t: 0, s: 0, v: 0, score: 0, combo: 0, best: 0, hits: 0, total: RINGS.length + 1, bonks: 0, px: 0, py: 0, vx: 0, vy: 0, bx: 3.4, by: 2.2, onTalkDone: null, room: null, saved: null, result: null, shake: 0, l0: null };
  const IN = { tx: 0, ty: 0, drag: null, keys: {}, tilt: false, b0: null };
  const talkTap = () => { if (G.phase !== 'talk' && G.phase !== 'night') return; if (!nextSub() && G.onTalkDone) { const f = G.onTalkDone; G.onTalkDone = null; f(); } };
  H.touch.addEventListener('pointerdown', (e) => { e.preventDefault(); IN.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { H.touch.setPointerCapture(e.pointerId); } catch (_) { } talkTap(); });
  H.touch.addEventListener('pointermove', (e) => { const d = IN.drag; if (!d || d.id !== e.pointerId) return; const k = 3.0 / Math.min(innerWidth, innerHeight);
    IN.tx = clamp(IN.tx + (e.clientX - d.x) * k * G.bx, -G.bx, G.bx); IN.ty = clamp(IN.ty - (e.clientY - d.y) * k * G.by, -G.by, G.by); d.x = e.clientX; d.y = e.clientY; });
  const up = (e) => { if (IN.drag?.id === e.pointerId) IN.drag = null; }; H.touch.addEventListener('pointerup', up); H.touch.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => { if (!G.on) return; const k = e.key.toLowerCase(); IN.keys[k] = true; if ((k === ' ' || k === 'enter') && H.big.style.display === 'block') H.big.click(); else if (k === ' ' || k === 'enter') talkTap(); });
  addEventListener('keyup', (e) => { IN.keys[e.key.toLowerCase()] = false; });
  addEventListener('deviceorientation', (e) => { if (!IN.tilt || e.gamma == null) return; const o = (screen.orientation?.angle ?? window.orientation ?? 0), land = Math.abs(o) === 90 || o === 270, sg = (o === 90 ? 1 : -1);
    const gx = land ? e.beta * sg : e.gamma, by = land ? -e.gamma * sg : e.beta; if (IN.b0 == null) IN.b0 = by;
    IN.tx = clamp(gx / 22, -1, 1) * G.bx; IN.ty = clamp(-(by - IN.b0) / 18, -1, 1) * G.by; });
  if (window.DeviceOrientationEvent && ('ontouchstart' in window)) H.tilt.style.display = 'block';
  H.tilt.addEventListener('click', async (e) => { e.stopPropagation(); if (!IN.tilt && typeof DeviceOrientationEvent.requestPermission === 'function') { try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return; } catch (_) { return; } }
    IN.tilt = !IN.tilt; IN.b0 = null; H.tilt.textContent = 'TILT: ' + (IN.tilt ? 'ON' : 'OFF'); });

  // ---------------------------------------------------------------- game state
  const api = {};
  const P = { o: null, wolf: null, mixer: null };   // the player's swimmer = the room's own Wolf (his one rig keeps playing)
  const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _l = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _sv = new THREE.Vector3();
  const _mm = new THREE.Matrix4(), _qi = new THREE.Quaternion(), _sc = new THREE.Vector3(), _qq = new THREE.Quaternion(), _up = new THREE.Quaternion();
  function layout() { const a = innerWidth / innerHeight; camera.aspect = a; camera.fov = a < 1 ? 66 : 55; camera.updateProjectionMatrix(); G.bx = a < 1 ? 2.1 : 3.4; G.by = a < 1 ? 2.7 : 2.0; }
  addEventListener('resize', () => G.on && layout());
  function setPhase(p) { G.phase = p; G.t = 0; api.phase = p; }
  function resetCourse() { G.s = 0; G.v = 0; G.score = 0; G.combo = 0; G.best = 0; G.hits = 0; G.bonks = 0; G.px = G.py = G.vx = G.vy = 0; IN.tx = IN.ty = 0; G.result = null; G.splashed = false;
    for (const r of RINGS) { r.state = 0; r.t = 0; if (r.vis) { r.vis.visible = false; r.vis.userData.def = null; r.vis = null; } } for (const o of OBS) { o.hit = false; if (o.vis) { putObs(o.k, o.vis); o.vis = null; } }
    for (const r of ringPool) { r.visible = false; r.userData.def = null; } for (const m of mists) { m.visible = false; m.userData.s = 0; }
    world.visible = true; finalRing.visible = false; finalRing.userData.state = 0; finalRing.userData.t = 0; finalRing.scale.setScalar(5.2); motes.material.uniforms.uA.value = 0; hud(); }
  const HC = {}; const setT = (el, k, v) => { if (HC[k] !== v) { HC[k] = v; el.textContent = v; } };   // touch the DOM only when something changed
  function hud() { setT(H.score, 's', G.score.toLocaleString()); setT(H.rings, 'r', `${G.hits}/${G.total}`); const w = (clamp(G.s / RL, 0, 1) * 100).toFixed(0) + '%'; if (HC.w !== w) { HC.w = w; H.bar.style.width = w; }
    const mult = Math.min(5, 1 + Math.floor(G.combo / 4)); setT(H.comboB, 'm', 'x' + mult); setT(H.comboS, 'c', 'COMBO ' + G.combo); const on = G.combo >= 2; if (HC.on !== on) { HC.on = on; H.combo.classList.toggle('on', on); } }
  const showRail = (on) => { for (const el of [$('.bar'), $('.top .score'), $('.top .rings')]) el.style.visibility = on ? 'visible' : 'hidden'; H.combo.style.display = on ? '' : 'none'; };

  const CREW_LINES = { 4: [['RAM', 'Elbows up. Good elbows.']], 8: [['BEAR', 'Look at us. We\'re weather.']], 12: [['HERON', 'This is the most anyone has ever swum.']], 16: [['RAM', 'Lesson two is this. Lesson three is also this.']], 22: [['BEAR', 'I can see my house. It\'s dark. Good.']], 30: [['HERON', 'I\'m not flapping. I want that on the record.']] };
  const BONK_LINES = [['RAM', 'Lawn chair. Classic beginner mistake.'], ['BEAR', 'You okay? The duck\'s okay.'], ['HERON', 'Go around things. That\'s most of swimming.'], ['RAM', 'That\'s the Boss\'s float. He counts them.']];

  // ---------------------------------------------------------------- start / the night at Ram's / the clip / the pool
  async function start(opts = {}) {
    const A = T.rooms?.ram; if (G.on || T.active !== 'ram' || !A || T.busy || T.lane) return false;
    G.on = true; G.room = A; layout(); api.done = false; api.result = null;
    const wolf = A.wolf; P.wolf = wolf; P.mixer = wolf.mixer; G.saved = { camera: T.camera, lights: [], lamp: null };
    document.body.classList.add('swimon'); showRail(false); H.res.style.display = 'none'; H.big.style.display = 'none';
    if ((S.swim || 0) === 0 && M) M.step('swim', 1);
    const crew = loadCrew();
    if (opts.fly) { await crew; await enterPool(true); return true; }
    // night at Ram's: the room goes blue-dark, one warm lamp, tea on the table
    A.scene.traverse(o => { if (o.isLight) { G.saved.lights.push([o, o.intensity, o.color.clone()]); o.intensity *= o.isHemisphereLight ? 0.35 : 0.3; o.color.lerp(new THREE.Color('#7d8cff'), 0.55); } });
    const lamp = new THREE.PointLight('#ffb870', 6, 6, 1.5); lamp.position.set(1.2, 1.7, -0.8); A.scene.add(lamp); G.saved.lamp = lamp;
    tea.position.set(1.0, 0.02, -0.45); A.scene.add(tea);
    setPhase('night'); card('1:12 AM', 'RAM\'S HOUSE · 1924 CRAFTSMAN', 2600);
    say([['RAM', 'Late. Good. The Boss is out of town till Thursday.'], ['RAM', 'Tea first. Chamomile. Then the lesson.'], ['WOLF', 'What lesson?'], ['RAM', 'Swimming. In the Boss\'s pool. He\'ll never know. He never knows.'], ['', 'Bear and Heron are already on the porch. Bear brought floaties.']]);
    G.onTalkDone = () => afterTea(crew);
    if (opts.quick) { subQ = []; nextSub(); G.onTalkDone = null; afterTea(crew); }
    return true;
  }
  async function afterTea(crew) {
    if (G.phase !== 'night') return; setPhase('video'); H.sub.classList.remove('on');
    let played = false;
    if (!Q.has('novideo')) try { const r = await fetch(VIDEO, { method: 'HEAD', cache: 'no-store' }); const ct = r.headers.get('content-type') || ''; if (r.ok && !/html|text/.test(ct)) { padOn(false); played = await playVideo(VIDEO); } } catch (_) { }
    api.video = played; await crew; if (!G.on) return; await enterPool(false);
  }
  function playVideo(src) { return new Promise(async (resolve) => {
    try { const m = await import('../cinematic.js'); if (m?.playCinematic) { if (m.CINE && !m.CINE.ram_swim_intro) m.CINE.ram_swim_intro = { src, title: 'LATE NIGHT SWIM LESSON' }; const r = await m.playCinematic('ram_swim_intro'); resolve(!!r?.played); return; } } catch (_) { }
    const root = document.createElement('div'); root.id = 'cine'; root.style.cssText = 'position:fixed;inset:0;z-index:60;background:#000;display:flex;align-items:center;justify-content:center';
    root.innerHTML = `<video playsinline webkit-playsinline muted preload="auto" style="width:100%;height:100%;object-fit:contain"></video><button style="position:absolute;right:14px;bottom:16px;min-height:48px;min-width:96px;border:0;border-radius:24px;background:#2b1e3ccc;color:#ffe1a8;font:800 12px system-ui;letter-spacing:.14em">SKIP</button>`;
    document.body.appendChild(root); const v = root.querySelector('video'); let done = false; const end = (p) => { if (done) return; done = true; try { v.pause(); } catch (_) { } root.remove(); resolve(p); };
    root.querySelector('button').onclick = (e) => { e.stopPropagation(); end(true); }; root.addEventListener('pointerdown', () => { v.muted = false; v.play().catch(() => { }); });
    v.onended = () => end(true); v.onerror = () => end(false); v.src = src; v.play().catch(() => { if (v.error) end(false); }); setTimeout(() => { if (!done && v.readyState === 0) end(false); }, 5000); }); }
  function restoreRoomNight() { const A = G.room; if (!G.saved || !A) return; for (const [o, i, c] of G.saved.lights) { o.intensity = i; o.color.copy(c); } G.saved.lights = []; if (G.saved.lamp) { A.scene.remove(G.saved.lamp); G.saved.lamp = null; } A.scene.remove(tea); }
  function playAct(k) { const acts = P.wolf?.acts; if (!acts) return; for (const n of ['idle', 'walk']) { const a = acts[n]; if (!a) continue; if (!a.isRunning()) a.play(); a.setEffectiveWeight(n === k ? 1 : 0); } if (acts.walk) acts.walk.timeScale = k === 'walk' ? 0.55 : 1; }
  function poolPose() {
    for (const c of CREW) if (c.o) { c.o.visible = true; c.o.position.set(c.pool[0], c.pool[1], c.pool[2]); c.o.rotation.set(0, c.pool[3], 0); c.o.quaternion.setFromEuler(c.o.rotation); c.o.userData.tilt.rotation.set(0, 0, 0); c.o.userData.tilt.position.y = c.h * 0.5; }
    P.o.position.set(0.8, 0, 3.4); P.o.quaternion.setFromEuler(_e.set(0, Math.PI, 0)); P.o.userData.tilt.rotation.set(0, 0, 0);
    for (const d of deckProps) { d.o.position.copy(d.p0); d.o.rotation.copy(d.r0); } blobs.visible = false; U.uMelt.value = 0; scene.fog.density = 0.012; }
  async function enterPool(fly) {
    await fade(true, 520); restoreRoomNight();
    P.o ||= swimmer(new THREE.Group(), 1.75); P.o.userData.inner.add(P.wolf); P.wolf.position.set(0, 0, 0); P.wolf.rotation.set(0, 0, 0); scene.add(P.o);
    resetCourse(); poolPose(); playAct('idle');
    T.lane = LANE; T.scene = scene; T.camera = camera; api.tris = triCount(scene);
    placePoolCam(0, 0);
    if (fly) { P.o.position.set(0, 1.4, 0.5); P.o.userData.tilt.rotation.x = Math.PI * 0.45; U.uMelt.value = 1; await fade(false, 400); toFloat(); return; }
    setPhase('talk'); await fade(false, 400);
    card('THE BOSS\'S POOL', 'HE\'S OUT OF TOWN TILL THURSDAY', 2600);
    say([['RAM', 'Lesson one. Everybody in.'], ['BEAR', 'It\'s so still. Is it supposed to be that still?'], ['HERON', 'It\'s the melt. It\'s coming. You can feel it in your knees.'], ['BEAR', 'Herons have knees?'], ['RAM', 'Wolf. Off the side. Go.']]);
    G.onTalkDone = () => { setPhase('ready'); H.big.textContent = 'DIVE IN'; H.big.style.display = 'block'; };
  }
  H.big.addEventListener('click', (e) => { e.stopPropagation(); if (G.phase === 'ready') { H.big.style.display = 'none'; audio?.ui?.('confirm'); setPhase('dive'); } else if (G.phase === 'float') { H.big.style.display = 'none'; launch(); } });
  function toFloat() { setPhase('float'); playAct('walk'); hint('DRAG TO SWIM'); say([['RAM', 'Don\'t fight it. Swim.'], ['HERON', 'There. The rings.']]);
    setTimeout(() => { if (G.phase === 'float') { H.big.textContent = 'FOLLOW THE RINGS'; H.big.style.display = 'block'; } }, AUTO ? 100 : 2600);
    setTimeout(() => { if (G.phase === 'float' && G.on) { H.big.style.display = 'none'; launch(); } }, 9000); }   // drifts in on its own if you just keep floating
  function launch() { if (G.phase !== 'float') return; hint(''); H.big.style.display = 'none'; setPhase('launch'); G.l0 = { p: P.o.position.clone(), q: P.o.quaternion.clone(), cp: camera.position.clone(), cl: camLook.clone() }; padOn(true); ringPool[0].visible = false; ringPool[0].userData.def = null; }
  function finish() {
    setPhase('result'); padOn(false); showRail(false);
    const ratio = G.hits / G.total, stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1; G.result = { score: G.score, stars, hits: G.hits, total: G.total, best: G.best, bonks: G.bonks };
    const prev = S.swimBest || { score: 0, stars: 0 }; S.swimBest = { score: Math.max(prev.score, G.score), stars: Math.max(prev.stars, stars) };
    if (M) { if ((S.swim || 0) < 2) M.step('swim', 2); else M.save(); }
    H.res.querySelectorAll('.stars span').forEach((s, i) => s.classList.toggle('on', i < stars));
    $('.grade').textContent = ['', 'YOU SWAM. TECHNICALLY.', 'A REAL SWIMMER. IN THE AIR.', 'RAM SAYS: NO NOTES.'][stars];
    $('.res table').innerHTML = `<tr><td>SCORE</td><td>${G.score.toLocaleString()}</td></tr><tr><td>RINGS</td><td>${G.hits} / ${G.total}</td></tr><tr><td>BEST COMBO</td><td>${G.best}</td></tr><tr><td>BONKS</td><td>${G.bonks}</td></tr><tr><td>YOUR BEST</td><td>${S.swimBest.score.toLocaleString()} · ${'★'.repeat(S.swimBest.stars)}</td></tr>`;
    H.res.style.display = 'block'; api.done = true; api.result = G.result;
  }
  $('.again').addEventListener('click', (e) => { e.stopPropagation(); H.res.style.display = 'none'; resetCourse(); for (const c of CREW) if (c.o) { c.o.userData.tilt.rotation.set(0.5, 0, 0); c.o.position.y = 1.5; } P.o.position.set(0, 1.4, 0.5); U.uMelt.value = 1; toFloat(); });
  $('.home').addEventListener('click', (e) => { e.stopPropagation(); stop(); });
  $('.quit').addEventListener('click', (e) => { e.stopPropagation(); stop(); });
  function detach() { const A = G.room; restoreRoomNight(); if (P.wolf && A) { A.scene.add(P.wolf); P.wolf.position.copy(A.wolfHome); P.wolf.rotation.set(0, -0.6, 0); playAct('idle'); }
    if (T.lane === LANE) { T.lane = null; T.scene = A.scene; T.camera = G.saved.camera; } document.body.classList.remove('swimon'); padOn(false); G.on = false; setPhase('off'); }
  async function stop() {
    if (!G.on || G.stopping) return; G.stopping = true; await fade(true, 450);
    H.res.style.display = 'none'; H.big.style.display = 'none'; hint(''); H.sub.classList.remove('on'); subQ = []; G.onTalkDone = null; H.card.classList.remove('on');
    detach(); G.stopping = false; await fade(false, 350);
  }
  const LANE = { update: (dt, t) => update(dt, t), end: () => { if (G.on) detach(); }, scene, camera };

  // ---------------------------------------------------------------- per-frame (called by town.js while T.lane === LANE)
  function placePoolCam(dt, t = 0) { const a = camera.aspect < 1; camPos.set(a ? 4.6 : 8, a ? 5.4 : 4.6, a ? 11 : 11).applyAxisAngle(UPW, Math.sin(t * 0.08) * 0.12); camLook.set(0, a ? 0.2 : 0.6, a ? -0.6 : 0); camera.position.copy(camPos); camera.lookAt(camLook); }
  function steer(dt) {
    const k = IN.keys; const kx = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0), ky = (k.arrowup || k.w ? 1 : 0) - (k.arrowdown || k.s ? 1 : 0);
    if (kx || ky) { IN.tx += kx * dt * 6; IN.ty += ky * dt * 5; }
    if (AUTO && G.phase === 'rail') { const nx = RINGS.find(r => r.s > G.s - 0.5 && r.state === 0); if (nx && nx.s - G.s < 40) { IN.tx = nx.nx * G.bx; IN.ty = nx.ny * G.by; } else { IN.tx = 0; IN.ty = 0; } }
    IN.tx = clamp(IN.tx, -G.bx, G.bx); IN.ty = clamp(IN.ty, -G.by, G.by);
    const ox = G.px, oy = G.py, f = 1 - Math.exp(-dt * 7); G.px += (IN.tx - G.px) * f; G.py += (IN.ty - G.py) * f; G.vx = dt > 0 ? (G.px - ox) / dt : 0; G.vy = dt > 0 ? (G.py - oy) / dt : 0; }
  function update(dt, t) {
    if (!G.on) return; G.t += dt; U.uTime.value = t; const ph = G.phase;
    P.mixer?.update(dt);
    if (ph === 'night' || ph === 'video' || ph === 'off') return;
    const melt = U.uMelt.value;
    // crew at the pool: breathe; once the melt hits they lift and tumble
    if (ph !== 'rail' && ph !== 'launch' && ph !== 'land') for (const [i, c] of CREW.entries()) { if (!c.o) continue; const tl = c.o.userData.tilt;
      if (ph === 'result') { tl.rotation.x *= 0.95; c.o.position.y = -0.9 + Math.sin(t * 1.3 + c.ph) * 0.06; continue; }
      if (melt < 0.01) { tl.position.y = c.h * 0.5 + Math.sin(t * 1.8 + c.ph) * 0.01; tl.rotation.z = Math.sin(t * 0.6 + c.ph) * 0.03; }
      else { c.o.position.y = c.pool[1] + melt * (1.6 + i * 0.7) + Math.sin(t * 0.9 + c.ph) * 0.25 * melt; tl.rotation.x = melt * (0.5 + Math.sin(t * 0.4 + c.ph) * 0.6); tl.rotation.z = Math.sin(t * 0.5 + c.ph) * 0.4 * melt; c.o.rotateY(dt * 0.15 * melt); } }
    // deck things + water blobs drift with the melt
    if (melt > 0.001) { for (const d of deckProps) { d.o.position.y = d.p0.y + melt * d.lift + Math.sin(t * 0.7 + d.ph) * 0.2 * melt; d.o.rotation.z = d.r0.z + t * d.spin * melt; d.o.rotation.y = d.r0.y + t * d.spin * 0.6 * melt; }
      blobs.visible = true; for (let i = 0; i < NB; i++) { const b = BL[i], y = -0.2 + melt * b.h + Math.sin(t * b.sp + b.ph) * 0.35 * melt, w = 1 + 0.18 * Math.sin(t * 2.2 + b.ph); _sc.set(b.r * w, b.r / w, b.r * w); _mm.compose(_p.set(b.x + Math.sin(t * 0.3 + b.ph) * 0.4 * melt, y, b.z), _qi, _sc); blobs.setMatrixAt(i, _mm); }
      blobs.instanceMatrix.needsUpdate = true; } else if (blobs.visible) { blobs.visible = false; for (const d of deckProps) { d.o.position.copy(d.p0); d.o.rotation.copy(d.r0); } }
    scene.fog.color.lerpColors(FOG0, FOG1, melt); scene.background.copy(scene.fog.color);
    if (splash.material.opacity > 0) { splash.material.opacity = Math.max(0, splash.material.opacity - dt * 0.6); splash.scale.multiplyScalar(1 + dt * 1.6); }
    if (ph === 'talk' || ph === 'ready') { placePoolCam(dt, t); return; }
    if (ph === 'dive') { const u = clamp(G.t / 1.1, 0, 1); P.o.position.set(lerp(0.8, 0, u), Math.sin(u * Math.PI) * 1.4 - u * 0.5, lerp(3.4, 0.6, u)); P.o.userData.tilt.rotation.x = u * Math.PI * 0.5; placePoolCam(dt, t);
      if (u >= 1) { splash.material.opacity = 0.9; splash.scale.setScalar(1); splash.position.set(0, -0.15, 0.6); chime(0); setPhase('melt'); card('THE MELT', 'EVERYTHING LETS GO OF THE GROUND', 2600); } return; }
    if (ph === 'melt') { const u = smooth(G.t / 2.6); U.uMelt.value = u; P.o.position.y = lerp(-0.5, 1.4, u); P.o.userData.tilt.rotation.x = Math.PI * 0.5 - Math.sin(G.t * 1.2) * 0.4;
      camPos.set(7, 4.6 + G.t * 0.4, 10.5); camera.position.lerp(camPos, 1 - Math.exp(-dt * 2)); camera.lookAt(0, 1 + G.t * 0.3, 0); if (G.t > 2.8) toFloat(); return; }
    if (ph === 'float') { steer(dt); const o = P.o; _p.set(G.px * 1.2, 1.4 + G.py * 0.9, 0.5); o.position.lerp(_p, 1 - Math.exp(-dt * 3)); o.quaternion.setFromEuler(_e.set(0, Math.PI + clamp(-G.vx * 0.3, -0.8, 0.8), 0));
      const tl = o.userData.tilt; tl.rotation.x = Math.PI * 0.42 + Math.sin(t * 1.6) * 0.08; tl.rotation.z = clamp(G.vx * 0.15, -0.6, 0.6);
      camPos.set(o.position.x * 0.5, o.position.y + 1.3, o.position.z + 4.6); camera.position.lerp(camPos, 1 - Math.exp(-dt * 2.5)); camLook.set(o.position.x * 0.6, o.position.y, o.position.z - 4); camera.lookAt(camLook);
      firstRing(t); if (AUTO && G.t > 0.6) launch(); return; }
    if (ph === 'launch') { const u = smooth(G.t / 1.8); frameAt(0, F); placeOn(F, 0, 0, _p); P.o.position.lerpVectors(G.l0.p, _p, u); orient(P.o, F); _qq.copy(P.o.quaternion); P.o.quaternion.slerpQuaternions(G.l0.q, _qq, u); P.o.userData.tilt.rotation.set(Math.PI * 0.5, 0, 0);
      railCam(F, 0, 0, _q, _l); camera.position.lerpVectors(G.l0.cp, _q, u); camLook.lerpVectors(G.l0.cl, _l, u); camera.lookAt(camLook); scene.fog.density = lerp(0.012, 0.016, u); motes.material.uniforms.uA.value = u; motes.material.uniforms.uCam.value.copy(camera.position);
      flyCrew(dt, t, u); if (G.t > 1.8) { setPhase('rail'); showRail(true); hud(); card('FOLLOW THE RINGS', '', 1400); } return; }
    if (ph === 'rail') { steer(dt); G.v = Math.min(RL / 64, G.v + dt * 6); const s0 = G.s; G.s = Math.min(RL, G.s + G.v * dt); rail(dt, t, s0); return; }
    if (ph === 'land') { land(dt, t); return; }
    if (ph === 'result') { placePoolCam(dt, t); P.o.position.y = -0.95 + Math.sin(t * 1.5) * 0.05; }
  }
  function firstRing(t) { const r = ringPool[0], u = r.userData; r.visible = true; for (const m of [u.rm, u.hm]) { m.material.uniforms.uCol.value.copy(PAL.teal); m.material.uniforms.uCol2.value.copy(PAL.gold); m.material.uniforms.uA.value = Math.min(1, G.t / 1.5); m.material.uniforms.uTime.value = t; }
    frameAt(0, F); placeOn(F, 0, 0, r.position); orient(r, F); r.scale.setScalar(1.6); }
  function railCam(fr, px, py, outPos, outLook) { const back = camera.aspect < 1 ? 7.4 : 6.4; outPos.copy(fr.p).addScaledVector(fr.t, -back).addScaledVector(fr.u, 1.5 + py * 0.55).addScaledVector(fr.r, px * 0.55);
    outLook.copy(fr.p).addScaledVector(fr.t, 10).addScaledVector(fr.u, py * 0.75).addScaledVector(fr.r, px * 0.75); }
  function flyCrew(dt, t, k = 1) { for (const c of CREW) { if (!c.o) continue; const s = Math.max(0, G.s + c.fly[2] + Math.sin(t * 0.37 + c.ph) * 1.5); frameAt(s, F2);
      const her = c.k === 'heron', x = Math.sign(c.fly[0]) * (G.bx + 1.1) * (her ? 0.55 : 1), y = c.fly[1] * G.by + Math.sin(t * 0.9 + c.ph) * 0.35 + (her ? G.by * 0.55 : 0);
      placeOn(F2, x, y, _p); c.o.position.lerp(_p, 1 - Math.exp(-dt * 3 * Math.max(0.2, k))); orient(c.o, F2); const tl = c.o.userData.tilt; tl.rotation.set(Math.PI * 0.5 + Math.sin(t * 2 + c.ph) * 0.08, Math.sin(t * 1.7 + c.ph) * 0.12, Math.sin(t * 1.1 + c.ph) * 0.25); } }
  function rail(dt, t, s0) {
    const s = G.s; frameAt(s, F); placeOn(F, G.px, G.py, P.o.position); orient(P.o, F);
    P.o.userData.tilt.rotation.set(Math.PI * 0.5 - clamp(G.vy * 0.08, -0.4, 0.4), -clamp(G.vx * 0.12, -0.7, 0.7), Math.sin(t * 3) * 0.04);
    G.shake = Math.max(0, G.shake - dt * 2.5); railCam(F, G.px, G.py, _q, _l); if (G.shake > 0) _q.addScaledVector(F.r, Math.sin(t * 40) * G.shake * 0.25);
    camera.position.lerp(_q, 1 - Math.exp(-dt * 10)); camLook.lerp(_l, 1 - Math.exp(-dt * 10)); camera.lookAt(camLook);
    motes.material.uniforms.uCam.value.copy(camera.position); motes.material.uniforms.uA.value = 1;
    scene.fog.density = lerp(0.016, 0.009, smooth((s - (RL - 90)) / 60));   // the pool comes back out of the mist at the end
    world.visible = !(s > 110 && s < RL - 170);
    flyCrew(dt, t);
    for (const r of RINGS) {
      if (r.s > s - 6 && r.s < s + 130) { if (!r.vis) { const v = ringPool.find(g => !g.userData.def); if (v) { r.vis = v; v.userData.def = r; v.visible = true; const u = v.userData, col = r.gold ? PAL.gold : (RINGS.indexOf(r) % 2 ? PAL.violet : PAL.teal), col2 = r.gold ? PAL.violet : PAL.mist;
            for (const m of [u.rm, u.hm]) { m.material.uniforms.uCol.value.copy(col); m.material.uniforms.uCol2.value.copy(col2); } } } }
      else if (r.vis) { r.vis.visible = false; r.vis.userData.def = null; r.vis = null; }
      if (r.state === 0 && s0 < r.s && s >= r.s) { if (Math.hypot(G.px - r.nx * G.bx, G.py - r.ny * G.by) < r.r) ringHit(r); else ringMiss(r); }
      if (r.vis) { const v = r.vis, u = v.userData; frameAt(r.s, F2); placeOn(F2, r.nx * G.bx, r.ny * G.by, v.position); orient(v, F2); r.t += dt;
        const d = r.s - s; let a = smooth((130 - d) / 50) * (d < 4 ? clamp((d + 2) / 6, 0.15, 1) : 1), sc = r.r, fl = 0;
        if (r.state === 1) { const k = clamp(r.t / 0.45, 0, 1); a = (1 - k) * 1.1; sc = r.r * (1 + k * 0.45); fl = (1 - k) * 0.6; } else if (r.state === 2) a *= 0.35 * (1 - clamp(r.t / 0.6, 0, 1));
        if (d < 0) a *= clamp(1 + d / 3, 0, 1);   // behind the swimmer = between him and the camera: get out of the way
        v.scale.setScalar(sc * (1 + Math.sin(t * 3 + r.s) * 0.04));
        for (const m of [u.rm, u.hm]) { m.material.uniforms.uA.value = a; m.material.uniforms.uTime.value = t; m.material.uniforms.uFlash.value = fl; } } }
    for (const o of OBS) {
      if (o.s > s - 6 && o.s < s + 140) { if (!o.vis) o.vis = getObs(o.k); } else if (o.vis) { putObs(o.k, o.vis); o.vis = null; }
      if (!o.vis) continue; frameAt(o.s, F2); const x = o.nx * G.bx + Math.sin(t * 0.5 + o.ph) * 0.35, y = o.ny * G.by + Math.cos(t * 0.6 + o.ph) * 0.3; placeOn(F2, x, y, o.vis.position); o.vis.rotation.set(t * o.spin * 0.6 + o.ph, t * o.spin + o.ph, t * o.spin * 0.3);
      if (o.hit) o.vis.position.addScaledVector(F2.r, Math.sign(x - G.px || 1) * 2.5).addScaledVector(F2.u, 1.5);
      else if (s0 < o.s && s >= o.s && Math.hypot(G.px - x, G.py - y) < PROP_R[o.k] + 0.45) { o.hit = true; G.bonks++; G.combo = 0; G.score = Math.max(0, G.score - 50); G.shake = 1; bonk(); hud(); say([BONK_LINES[G.bonks % BONK_LINES.length]]); if (!AUTO) try { navigator.vibrate?.(30); } catch (_) { } } }
    for (const m of mists) { const u = m.userData; if (u.s < s - 10 || u.s === 0) { u.s = s + 20 + rnd() * 140; u.x = (rnd() - 0.5) * 30; u.y = (rnd() - 0.5) * 16; } m.visible = true;
      frameAt(u.s, F2); placeOn(F2, u.x, u.y, m.position); m.scale.setScalar(u.sc); const d = u.s - s; m.material.opacity = 0.3 * smooth((160 - d) / 50) * smooth((d + 6) / 16); m.material.rotation += dt * 0.04; }
    const fr = finalRing, fu = fr.userData; if (FINAL_S - s < 170) { fr.visible = true; frameAt(FINAL_S, F2); placeOn(F2, 0, 0, fr.position); orient(fr, F2); fu.t += dt;
      let a = smooth((170 - (FINAL_S - s)) / 70), fl = 0; if (fu.state === 1) { const k = clamp(fu.t / 0.9, 0, 1); a = 1.2 * (1 - k); fl = (1 - k) * 0.7; fr.scale.setScalar(5.2 * (1 + k * 0.6)); }
      for (const m of [fu.rm, fu.rm2, fu.hm]) { m.material.uniforms.uA.value = a; m.material.uniforms.uTime.value = t; m.material.uniforms.uFlash.value = fl; } fu.rm2.rotation.z = t * 0.3; fu.rm.rotation.z = -t * 0.2;
      if (!fu.state && s0 < FINAL_S && s >= FINAL_S) { fu.state = 1; fu.t = 0; G.hits++; G.combo++; G.best = Math.max(G.best, G.combo); const mult = Math.min(5, 1 + Math.floor(G.combo / 4)); G.score += 1000 * mult; hud(); chime(9, true); setTimeout(() => chime(7, true), 120); setTimeout(() => chime(9, true), 260);
        card('BIG RING', '+' + (1000 * mult).toLocaleString(), 1800); } }
    if (s >= RL - 0.01) { setPhase('land'); G.l0 = { p: P.o.position.clone(), q: P.o.quaternion.clone(), cp: camera.position.clone(), cl: camLook.clone(), crew: CREW.map(c => c.o ? [c.o.position.clone(), c.o.quaternion.clone()] : null) }; showRail(false); say([['RAM', 'And down. Gently. Like a tea bag.']]); }
    hud();
  }
  function ringHit(r) { r.state = 1; r.t = 0; G.combo++; G.best = Math.max(G.best, G.combo); G.hits++; const mult = Math.min(5, 1 + Math.floor(G.combo / 4)), pts = (r.gold ? 250 : 100) * mult; G.score += pts; chime(G.combo % 10, r.gold);
    if (r.vis) { _sv.copy(r.vis.position).project(camera); pop('+' + pts, (_sv.x * 0.5 + 0.5) * innerWidth, (-_sv.y * 0.5 + 0.5) * innerHeight); } if (CREW_LINES[G.combo]) say(CREW_LINES[G.combo]); }
  function ringMiss(r) { r.state = 2; r.t = 0; if (G.combo >= 4) say([['', 'Combo lost. The rings don\'t mind.']]); G.combo = 0; }
  function land(dt, t) {
    const u = smooth(G.t / 4.2), L0 = G.l0; world.visible = true;
    _p.set(0, -0.95, 0.4); P.o.position.lerpVectors(L0.p, _p, u); P.o.position.y += Math.sin(u * Math.PI) * 1.2 * (1 - u);
    _up.setFromEuler(_e.set(0, Math.PI, 0)); P.o.quaternion.slerpQuaternions(L0.q, _up, u); P.o.userData.tilt.rotation.set(lerp(Math.PI * 0.5, 0.25, u), 0, 0);
    CREW.forEach((c, i) => { if (!c.o || !L0.crew[i]) return; const k = smooth((G.t - i * 0.25) / 4); _q.set(c.land[0], -0.9, c.land[1]); c.o.position.lerpVectors(L0.crew[i][0], _q, k); _qq.setFromEuler(_e.set(0, Math.PI + (i - 1) * 0.6, 0)); c.o.quaternion.slerpQuaternions(L0.crew[i][1], _qq, k); c.o.userData.tilt.rotation.set(lerp(Math.PI * 0.5, 0.2, k), 0, 0); });
    U.uMelt.value = 1 - smooth((G.t - 1.2) / 2.8); scene.fog.density = lerp(0.009, 0.012, u); motes.material.uniforms.uA.value = 1 - u;
    for (const m of mists) m.material.opacity *= 0.95; for (const r of ringPool) if (r.visible) { r.userData.rm.material.uniforms.uA.value *= 0.92; r.userData.hm.material.uniforms.uA.value *= 0.92; }
    const a = camera.aspect < 1, k2 = smooth(G.t / 3.2); camPos.set(a ? 4.6 : 8, a ? 5.4 : 4.6, 11); camera.position.lerpVectors(L0.cp, camPos, k2); _l.set(0, 0.6, 0); camLook.lerpVectors(L0.cl, _l, k2); camera.lookAt(camLook);
    if (G.t > 3.9 && !G.splashed) { G.splashed = true; splash.material.opacity = 0.95; splash.scale.setScalar(1); splash.position.set(0, -0.15, 0.4); chime(4); }
    if (G.t > 4.6) { G.splashed = false; for (const r of ringPool) r.visible = false; finalRing.visible = false; for (const m of mists) m.visible = false; playAct('idle'); say([['HERON', 'Lesson over. I stood in the air.'], ['BEAR', 'Same time Thursday? No. He\'s back Thursday.']]); finish(); }
  }

  // ---------------------------------------------------------------- subtitles + QA ticker (runs even while the room, not the lane, is on screen)
  let lastT = performance.now();
  (function tick() { const now = performance.now(), dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    if (G.on && H.sub.classList.contains('on')) { subT -= dt; if (subT <= 0 && !nextSub() && G.onTalkDone && (G.phase === 'talk' || G.phase === 'night')) { const f = G.onTalkDone; G.onTalkDone = null; f(); } }
    requestAnimationFrame(tick); })();
  // QA: fast-forward the sim without rendering (the box's swiftshader runs ~1 fps)
  function simulate(sec, step = 1 / 60) { let t = U.uTime.value; const n = Math.ceil(sec / step); for (let i = 0; i < n && G.on; i++) { t += step; update(step, t); if (G.phase === 'result') break; } return api.state; }
  function seek(s) { if (G.phase !== 'rail') return; G.s = clamp(s, 0, RL); for (const r of RINGS) if (r.s < G.s && r.state === 0) { r.state = 2; } }

  // ---------------------------------------------------------------- the chip in Ram's room (added without touching homes16.js)
  const CHIP = { id: 'swimlesson', label: 'LATE NIGHT SWIM LESSON', o: null, talk: () => { setTimeout(() => start(), 0); return [['RAM', 'It\'s late. Good. Sit. Tea.']]; } };
  setInterval(() => { const A = T.rooms?.ram; if (!A || !A.who) return; if (!A.who.includes(CHIP)) { CHIP.o = A.proc?.[0] || A.wolf; A.who.push(CHIP); }
    if (T.active === 'ram' && !T.busy && !G.on) { const ch = document.getElementById('roomChips'); if (ch && ch.children.length && ![...ch.children].some(b => b.textContent === CHIP.label)) { const b = document.createElement('button'); b.textContent = CHIP.label; if (!S.seen?.swimlesson) b.className = 'new'; b.onclick = (e) => { e.stopPropagation(); T.talk('swimlesson'); }; ch.appendChild(b); } } }, 400);

  Object.assign(api, { start, stop, launch, simulate, seek, G, RINGS, OBS, RL, scene, camera, phase: 'off',
    dive: () => { if (G.phase === 'ready') H.big.click(); }, skipTalk: () => { subQ = []; nextSub(); if (G.onTalkDone) { const f = G.onTalkDone; G.onTalkDone = null; f(); } } });
  Object.defineProperty(api, 'state', { get() { return { phase: G.phase, s: +G.s.toFixed(1), RL: +RL.toFixed(1), score: G.score, hits: G.hits, total: G.total, combo: G.combo, best: G.best, bonks: G.bonks, stars: G.result?.stars ?? 0, tris: triCount(scene), video: api.video ?? null, mission: S.swim, crew: CREW.filter(c => c.o).length }; } });
  return api;
}

// ---------------------------------------------------------------- self-install: wait for the town, then hook in
(function boot() {
  const T = window.__town; if (!T || !window.__ready || !T.M) { setTimeout(boot, 300); return; }
  try { const api = createSwimLesson(T); window.__swim = api;
    if (Q.has('swim')) { const q = Q.get('swim'); const go = () => { if (window.__titleUp || T.busy) { setTimeout(go, 300); return; } if (T.active !== 'ram') { if (T.active) T.exit(); else T.enter('ram'); setTimeout(go, 900); return; } api.start({ fly: q === 'fly', quick: q === 'quick' }); }; go(); }
  } catch (e) { console.warn('swimlesson failed', e); }
})();
