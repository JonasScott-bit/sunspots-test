// THE END (Night 7 complete): the crew on Moth's couch on the mesa, the sun comes up over Same Old One Horse Town,
// the credits roll to The Eye Sets Over the Coral, then the Sunspot tally and free roam to finish 100%.
// Self-contained: its own scene, drawn with the game's renderer while the main loop sleeps (window.__paused).
// shell.js calls maybeFinale() from its progress loop; ?finale plays it on load (QA), ?finale=credits jumps to the roll.
import * as THREE from 'three';
let glowSprite, blobShadow;   // missions/kit.js, loaded on first play (keeps shell.js's import order as it was)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { sunspotsApply } from './sunspots_material.js';
import { wolfIdle, gesturer, castOffsets, CAST_POOL } from './idles.js';
// [file, height m, look] : the in-game models (town.js / kit.js crewGLB use the same files, heights and looks)
const CREW = { wolf: ['wolf_armsdown_felt.glb', 1.75, 'wolf'], moth: ['town2/moth_lo.glb', 1.95, 'moth'], bear: ['town2/bear_lo.glb', 1.95, 'bear'], ram: ['town2/ram_lo.glb', 1.8, 'ram'],
  heron: ['town2/heron_lo.glb', 1.95, 'heron'], crow: ['town2/crow_lo.glb', 1.6, 'crow'], lynx: ['town2/lynx_lo.glb', 1.75, 'lynx'], gecko: ['town2/gecko_lo.glb', 1.45, 'gecko'],
  anteater: ['town2/anteater_lo.glb', 1.7, 'anteater'], squid: ['cast/wanderer_banana_squid_walking.glb', 1.6, 'object'] };
let loader = null; const glbP = {};
async function crewModel(k) {
  const [f, h, look] = CREW[k]; loader ||= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gl = await (glbP[f] ||= new Promise((res, rej) => loader.load('./models/' + f, res, undefined, rej)));
  const root = skClone(gl.scene), idle = (gl.animations || []).find((a) => /idle/i.test(a.name));   // SkeletonUtils: the bones come along
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; if (o.isSkinnedMesh) { if (!idle) o.skeleton.pose(); o.frustumCulled = false; } } });
  let mixer = null; if (idle) { mixer = new THREE.AnimationMixer(root); const a = mixer.clipAction(idle); a.play(); a.time = Math.random() * idle.duration; a.timeScale = 0.75 + Math.random() * 0.4; mixer.update(0); }   // size it in its idle pose (the clip's own units)
  root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root); root.scale.multiplyScalar(h / Math.max(0.01, b.max.y - b.min.y)); root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root); root.position.x -= (b2.min.x + b2.max.x) / 2; root.position.z -= (b2.min.z + b2.max.z) / 2; root.position.y -= b2.min.y;
  try { sunspotsApply(root, look, h); } catch (_) {}
  const bones = {}; root.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const w = new THREE.Group(), inner = new THREE.Group(); inner.add(root); w.add(inner); if (blobShadow) { const sh = blobShadow(0.42 * h / 1.8, 0.4); w.add(sh); w.userData.shadow = sh; }
  Object.assign(w.userData, { inner, h, ph: Math.random() * 6, root, bones, mixer }); return w;
}
async function loadCrew() { const out = {}; await Promise.all(Object.keys(CREW).map(async (k) => { try { out[k] = await crewModel(k); } catch (e) { console.warn('finale: model', k, e?.message || e); } })); return out; }
import { creditsHTML, CREATOR_NAME, STUDIO } from './credits.js';

const Q = new URLSearchParams(location.search);
const PKEY = 'sunspots.progress';
const loadP = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (_) { return {}; } };
const saveP = (P) => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (_) {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const totals = () => { const J = window.__journal; if (!J) return [0, 0]; const all = new Map();   // the journal's list + kit missions that registered after it last synced
  for (const s of [...J.SUNS, ...(window.__jnX?.suns || [])]) if (!all.has(s.id)) all.set(s.id, s);
  let f = 0; for (const s of all.values()) { try { if (s.got()) f++; } catch (_) {} } return [f, all.size]; };

// ------------------------------------------------------------------ when
export function finaleReady() {
  const T = window.__town, S = T?.state; if (!S) return false;
  const P = loadP(); if (P.finaleSeen) return false;
  if (!(S.msn || {}).mp_done) return false;                       // Moth's Porch Light (missions/moth_porch.js) is the Night 7 finish
  if (window.__shell && !window.__shell.nightOpen(7)) return false;
  if (T.busy || T.lane || T.active) return false;                  // not mid-mission, not in a room
  return true;
}
export function maybeFinale() { if (playing || !finaleReady()) return false; playFinale(); return true; }

// 100%: one card, once, in free roam
export function checkPerfect() {
  const P = loadP(); if (!P.finaleSeen || P.perfect) return false; const [f, t] = totals(); if (!t || f < t) return false;
  P.perfect = 1; saveP(P); card(`<p class="fk">SAME OLD ONE HORSE TOWN</p><h2>EVERY SUNSPOT</h2><p class="fbig">☀ ${f} / ${t}</p><p>100%. Every errand, every game, every secret. The town is yours.</p>`, [['KEEP PLAYING', () => end('roam', true)]], true); return true;
}

// ------------------------------------------------------------------ DOM
const css = document.createElement('style');
css.textContent = `
#fin{position:fixed;inset:0;z-index:77;pointer-events:auto;font-family:Futura,Avenir,system-ui,sans-serif;color:#fff3dc;-webkit-user-select:none;user-select:none;touch-action:none;overflow:hidden}
#fin .fade{position:absolute;inset:0;background:#000;opacity:1;transition:opacity 1.2s ease;pointer-events:none}
#fin .cap{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 9vh);transform:translateX(-50%);width:min(86vw,720px);text-align:center;opacity:0;transition:opacity .45s ease;pointer-events:none}
#fin .cap.on{opacity:1}
#fin .cap b{display:block;font:800 13px/1.2 system-ui,sans-serif;letter-spacing:.18em;color:#ffcf6a;margin-bottom:6px;text-shadow:0 2px 0 #2a1424}
#fin .cap span{font:600 clamp(17px,4.6vw,24px)/1.32 system-ui,sans-serif;text-shadow:0 2px 0 #2a1424,0 0 14px #2a1424cc}
#fin .kick{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 9vh);text-align:center;font:800 clamp(12px,3.4vw,15px)/1.2 system-ui,sans-serif;letter-spacing:.32em;color:#ffe1a8;opacity:0;transition:opacity 1s;text-shadow:0 2px 0 #2a1424;pointer-events:none}
#fin .kick.on{opacity:.92}
#fin .ttl{position:absolute;left:50%;top:27%;transform:translate(-50%,-50%);width:min(90vw,760px);text-align:center;opacity:0;transition:opacity 1.4s;pointer-events:none}
#fin .ttl.on{opacity:1}
#fin .ttl small{display:block;font:800 clamp(11px,3vw,14px)/1.3 system-ui,sans-serif;letter-spacing:.32em;color:#ffe1a8;text-shadow:0 2px 0 #2a1424}
#fin .ttl strong{display:block;margin:10px 0 8px;font:900 clamp(28px,min(9vw,11vh),64px)/1.02 Futura,Avenir,system-ui,sans-serif;letter-spacing:.04em;color:#ffd36a;text-shadow:0 4px 0 #8a3a1a,0 8px 0 #2a1424,0 0 30px #ff9a3a88}
#fin .roll{position:absolute;left:50%;top:0;width:min(84vw,560px);transform:translate(-50%,100vh);text-align:center;will-change:transform;pointer-events:none}
#fin .rollDim{position:absolute;inset:0;background:linear-gradient(#000a,#0005 30%,#0005 70%,#000a);opacity:0;transition:opacity 2s;pointer-events:none}
#fin .rollDim.on{opacity:1}
#fin .roll p{margin:0 0 30px;font:600 clamp(16px,4.4vw,21px)/1.45 system-ui,sans-serif;text-shadow:0 2px 0 #2a1424,0 0 12px #2a1424}
#fin .roll p small{display:block;margin-bottom:6px;font:800 clamp(11px,3vw,13px)/1.2 system-ui,sans-serif;letter-spacing:.24em;color:#ffcf6a}
#fin .roll p.big{font:900 clamp(34px,10vw,58px)/1 Futura,Avenir,system-ui,sans-serif;color:#ffd36a;text-shadow:0 4px 0 #8a3a1a,0 7px 0 #2a1424;margin-bottom:44px}
#fin .skip{position:absolute;right:calc(env(safe-area-inset-right) + 16px);bottom:calc(env(safe-area-inset-bottom) + 16px);border:0;border-radius:22px;padding:10px 16px;min-height:40px;
  font:800 12px/1 system-ui,sans-serif;letter-spacing:.14em;color:#ffe1a8;background:#2b1e3ccc;box-shadow:0 4px 0 #120a1c;overflow:hidden;-webkit-tap-highlight-color:transparent}
#fin .skip i{position:absolute;left:0;bottom:0;height:4px;width:0;background:#ffcf6a}
#fin .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.94);width:min(86vw,430px);max-height:calc(100% - 40px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:visible;box-sizing:border-box;
  padding:44px 22px 20px;border-radius:26px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .8  0 0 0 .16 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"),radial-gradient(120% 90% at 50% 0%,#5a3a6e 0%,#3a2550 55%,#2b1b3e 100%);
  box-shadow:0 8px 0 #160c22,0 0 0 3px #ffcf6a55,0 0 90px 10px #ffb04a55;text-align:center;opacity:0;transition:opacity .6s,transform .6s cubic-bezier(.2,1.4,.4,1)}
#fin .card::before{content:'';position:absolute;inset:8px;border-radius:20px;border:2px dashed #ffcf6a66;pointer-events:none}
#fin .card::after{content:'';position:absolute;left:50%;top:0;width:360px;height:360px;transform:translate(-50%,-50%);background:radial-gradient(closest-side,#ffd36a55,#ffb04a22 55%,transparent);pointer-events:none;z-index:-1}
#fin .card.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
#fin .card .sunB{position:absolute;left:50%;top:0;width:76px;height:76px;transform:translate(-50%,-55%)}
#fin .card .sunB::before{content:'';position:absolute;inset:-14px;border-radius:50%;background:repeating-conic-gradient(#ffcf4a 0 9deg,transparent 9deg 30deg);-webkit-mask:radial-gradient(closest-side,transparent 62%,#000 64%);mask:radial-gradient(closest-side,transparent 62%,#000 64%);animation:finSpin 14s linear infinite}
#fin .card .sunB i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 40% 36%,#ffe48a,#ffc23a 55%,#e8962a);box-shadow:0 4px 0 #a8601a,0 0 28px #ffcf6a}
#fin .card .sunB i::before{content:'';position:absolute;left:22%;right:22%;top:30%;height:34%;border-radius:50%;background:#fff8ea}
#fin .card .sunB i::after{content:'';position:absolute;left:39%;top:34%;width:22%;height:26%;border-radius:50%;background:radial-gradient(circle at 60% 35%,#fff 0 18%,#1d1416 22% 48%,#3a7ab8 52%)}
@keyframes finSpin{to{transform:rotate(360deg)}}
#fin .card .bar{box-shadow:inset 0 2px 0 #0006}
#fin .card h2{margin:4px 0 6px;font:900 clamp(26px,7vw,34px)/1.05 Futura,Avenir,system-ui,sans-serif;color:#ffd36a;letter-spacing:.03em}
#fin .card .fk{margin:0;font:800 11px/1.3 system-ui,sans-serif;letter-spacing:.26em;color:#ffe1a8aa}
#fin .card .fbig b{font:inherit;color:#ffd36a} #fin .card .fbig{margin:8px 0 4px;font:900 clamp(34px,10vw,46px)/1 Futura,Avenir,system-ui,sans-serif;color:#fff3dc}
#fin .card p{margin:8px 0;font:500 15px/1.4 system-ui,sans-serif;color:#f2e2c8}
#fin .card .bar{height:12px;border-radius:8px;background:#120a1c;margin:12px 4px 6px;overflow:hidden}
#fin .card .bar u{display:block;height:100%;background:linear-gradient(90deg,#e0a224,#ffd36a);border-radius:8px}
#fin .card .btns{display:flex;flex-direction:column;gap:10px;margin-top:16px}
#fin .card button{border:0;border-radius:16px;padding:13px 16px;font:800 15px/1 system-ui,sans-serif;letter-spacing:.1em;background:#ffcf6a;color:#2b1e3c;box-shadow:0 4px 0 #8a5a12;-webkit-tap-highlight-color:transparent}
#fin .card button.alt{background:#4a3a5e;color:#ffe1a8;box-shadow:0 4px 0 #120a1c}
#fin .card button:active{transform:translateY(3px);box-shadow:0 1px 0 #120a1c}
@media (orientation:landscape) and (max-height:500px){#fin .card{padding:34px 20px 14px;width:min(70vw,520px)} #fin .card .sunB{width:60px;height:60px} #fin .card .btns{flex-direction:row} #fin .card .btns button{flex:1} #fin .card p{margin:5px 0} #fin .cap{bottom:calc(env(safe-area-inset-bottom) + 5vh)} #fin .ttl{top:30%} #fin .cap{width:calc(100vw - 2 * (env(safe-area-inset-right) + 170px))} #fin .kick{top:calc(env(safe-area-inset-top) + 6vh)}}
body.finale #pfHud{z-index:80}
`;
document.head.appendChild(css);

let root = null, playing = false, raf = 0, scene = null, cam = null, own = [], st = null;

// ------------------------------------------------------------------ scene
// ------------------------------------------------------------------ the cast: idle clips with staggered timing, the game's own
// gesture layer (idles.js wolfIdle: look, scratch, stretch, shrug, sun, ...), a seated pose for the couch, scripted head turns
const _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _wi = new THREE.Quaternion(), _p = new THREE.Quaternion(), _pi = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
const BORDER = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
function modelRot(u, list, k = 1) {   // [bone, rx, ry, rz] in model space (+X the character's left, +Z forward), parents first
  u.root.getWorldQuaternion(_w); _wi.copy(_w).invert();
  for (const [n, x, y, z] of list.sort((a, b) => BORDER.indexOf(a[0]) - BORDER.indexOf(b[0]))) { const b = u.bones[n]; if (!b) continue;
    _q.setFromEuler(_e.set(x * k, y * k, z * k, 'YXZ')).premultiply(_w).multiply(_wi); b.parent.getWorldQuaternion(_p); _pi.copy(_p).invert(); _q.premultiply(_pi).multiply(_p); b.quaternion.premultiply(_q); b.updateMatrixWorld(true); }
}
const SIT = [['LeftUpLeg', -1.5, 0, 0.08], ['RightUpLeg', -1.5, 0, -0.08], ['LeftLeg', 1.45, 0, 0], ['RightLeg', 1.45, 0, 0], ['LeftFoot', 0.1, 0, 0], ['RightFoot', 0.1, 0, 0]];
function rig(k, g, sit) {
  const u = g.userData, c = { g, k, sit, yaw: 0, pitch: 0 };
  if (u.mixer && u.bones.Hips) { c.mixer = u.mixer;
    c.gest = wolfIdle({ root: u.root, bones: u.bones }, 'fin_' + k); c.gest.g.wait = 1 + Math.random() * 7; c.gest.g.min = 5; c.gest.g.max = 13; }
  else c.gest = gesturer(CAST_POOL, 'fin_' + k, { first: 2 + Math.random() * 6, min: 5, max: 12 });
  if (sit && c.mixer) { modelRot(u, SIT); u.root.updateMatrixWorld(true); g.updateMatrixWorld(true);   // drop the hips onto the cushion
    const hp = u.bones.Hips.getWorldPosition(_v); u.inner.position.y = 0.66 - hp.y; c.baseY = u.inner.position.y; if (u.shadow) u.shadow.visible = false; }
  return c;
}
// who looks where (radians, model space: +yaw = toward the character's own left). The sun is straight ahead for everyone.
function heads(k, t) {
  const at = (a, b) => ease((t - a) / 0.8) * (1 - ease((t - b) / 0.8));
  switch (k) {
    case 'wolf': return [0.55 * at(7.2, 10.2) - 0.5 * at(3.0, 6.4) - 0.45 * at(21.4, 24.5), -0.08];   // to Moth, to Bear, to Squid
    case 'moth': return [0.5 * at(10.4, 14.2) + 0.25 * at(1, 2.8), -0.04];                      // to Wolf on his line
    case 'bear': return [-0.45 * at(10.4, 14.3) - 0.3 * at(3.0, 6.4), 0];                    // to Wolf
    case 'heron': return [0.35 * at(5, 13.5), -0.12 * at(14.4, 30)];
    case 'lynx': return [-0.35 * at(6, 12), 0]; case 'gecko': return [-0.4 * at(4, 11), 0]; case 'squid': return [0.3 * at(8, 13), 0];
    case 'ram': return [-0.3 * at(2, 12) + 0.25 * at(19.2, 21.5), 0]; default: return [0, 0];
  }
}
function animCrew(s, dt, t, tally) {
  for (const c of Object.values(s.crew)) { const u = c.g.userData, i = u.inner;
    const cheer = (t > 23.2 && t < D.scene + 3) || tally;
    if (c.mixer) { c.mixer.update(dt);
      if (c.sit) modelRot(u, SIT);
      const [y, p] = heads(c.k, t); if (y || p) modelRot(u, [['neck', p * 0.4, y * 0.35, 0], ['Head', p * 0.6, y * 0.65, 0]]);
      c.gest.apply(dt, t, 1);
      if (cheer) { const b = Math.abs(Math.sin(t * 6.5 + u.ph * 3)); if (c.sit) i.position.y = c.baseY + b * 0.05; else i.position.y = b * 0.1; modelRot(u, [['LeftArm', 0, 0, 2.3 * b * 0.6 + 0.6], ['RightArm', 0, 0, -(2.3 * b * 0.6 + 0.6)]]); }
      else if (c.sit) i.position.y = c.baseY; else i.position.y = 0;
    } else { c.gest.update(dt, 1); const o = castOffsets(c.gest, t);   // no usable clip (banana squid): the transform gesture layer
      i.rotation.set(o.rx, o.ry, o.rz + Math.sin(t * 1.3 + u.ph) * 0.025); i.scale.set(o.sx, o.sy * (1 + Math.sin(t * 2 + u.ph) * 0.012), o.sx);
      i.position.y = (cheer ? Math.abs(Math.sin(t * 7 + u.ph)) * 0.12 : 0) + o.y * u.h; }
  }
}

function build(MODELS) {
  scene = new THREE.Scene(); own = [];
  const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, ...o }); own.push(m); return m; };
  const B = (m) => { own.push(m); return m; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, p = scene) => { own.push(geo); const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); p.add(o); return o; };
  // sky: night -> dawn gradient, sun glow on the horizon
  const skyU = { k: { value: 0 }, sunDir: { value: new THREE.Vector3(0, -0.1, -1) } };
  const sky = new THREE.Mesh(B(new THREE.SphereGeometry(520, 32, 16)), B(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float k; uniform vec3 sunDir; varying vec3 vD;
      void main(){ float h = clamp(vD.y, -0.2, 1.0);
        vec3 nTop = vec3(0.05,0.06,0.18), nMid = vec3(0.16,0.12,0.35), nLow = vec3(0.35,0.23,0.42);
        vec3 dTop = vec3(0.36,0.56,0.82), dMid = vec3(0.98,0.70,0.55), dLow = vec3(1.0,0.83,0.50);
        vec3 top = mix(nTop, dTop, smoothstep(0.25,1.0,k)), mid = mix(nMid, dMid, smoothstep(0.0,0.8,k)), low = mix(nLow, dLow, smoothstep(0.0,0.7,k));
        vec3 c = h < 0.12 ? mix(low, mid, smoothstep(-0.05,0.12,h)) : mix(mid, top, smoothstep(0.12,0.6,h));
        float s = max(dot(normalize(vD), normalize(sunDir)), 0.0); c += vec3(1.0,0.55,0.25) * pow(s, 8.0) * (0.25 + 0.5*k) + vec3(1.0,0.8,0.5) * pow(s, 60.0) * 0.5;
        gl_FragColor = vec4(c, 1.0); }` })));
  sky.renderOrder = -10; own.push(sky.geometry); scene.add(sky);
  // stars
  const sp = []; for (let i = 0; i < 420; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 480, Math.sin(e) * 480, Math.sin(a) * Math.cos(e) * 480); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); own.push(sg);
  const starMat = B(new THREE.PointsMaterial({ color: '#fff3dc', size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false }));
  scene.add(new THREE.Points(sg, starMat));
  scene.fog = new THREE.Fog('#3a2a52', 60, 330);
  const hemi = new THREE.HemisphereLight('#6a6ab8', '#2a1a2a', 0.9); scene.add(hemi);
  const sunL = new THREE.DirectionalLight('#ffb070', 0); sunL.position.set(0, 10, -100); scene.add(sunL);
  const fill = new THREE.DirectionalLight('#8a9aff', 0.55); fill.position.set(-4, 6, 9);   // night: cool moon fill; dawn: the warm rim light behind the crew scene.add(fill);

  // the mesa (couch on top), the town below, the far mesas
  const mesaTop = M('#c98552'), mesaSide = M('#a8603a');
  mesh(new THREE.CylinderGeometry(9, 11.5, 18, 10, 1), mesaSide, 0, -9.05, 0);
  mesh(new THREE.CylinderGeometry(9.02, 9.02, 0.1, 10), mesaTop, 0, -0.05, 0);
  for (const [x, z, s] of [[-6.2, 2.5, 1], [6.6, 1.2, 0.8], [5.4, 4.6, 0.6]]) { const r = mesh(new THREE.DodecahedronGeometry(0.7 * s, 0), M('#b06a40'), x, 0.3 * s, z); r.rotation.set(0.4, x, 0.2); }
  const cactus = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const m = M('#5a8a4a');
    mesh(new THREE.CapsuleGeometry(0.28, h, 3, 8), m, 0, h / 2 + 0.28, 0, g); const a = mesh(new THREE.CapsuleGeometry(0.18, h * 0.35, 3, 8), m, 0.45, h * 0.62, 0, g); a.rotation.z = -0.25;
    const a2 = mesh(new THREE.CapsuleGeometry(0.16, h * 0.28, 3, 8), m, -0.42, h * 0.5, 0, g); a2.rotation.z = 0.3; };
  cactus(-5.6, 0.2, 1.9); cactus(6.4, -2.4, 1.4);
  const ground = mesh(new THREE.PlaneGeometry(1200, 1200), M('#9a5e42'), 0, -18, 0); ground.rotation.x = -Math.PI / 2;
  // town: felt blocks along Main Street, windows that go dark as the sun comes up
  const pals = ['#e0705a', '#f2c230', '#2fae8a', '#8a7ab8', '#f6efe0', '#ff8fae', '#4a8ac8', '#e8a24a', '#c9d86a', '#c96a8a'];
  const town = new THREE.Group(); town.position.set(0, -18, -46); scene.add(town);
  const win = []; let rnd = 7; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  const box = (x, z, w, h, d, c, roof) => { const b = mesh(new THREE.BoxGeometry(w, h, d), M(c), x, h / 2, z, town);
    if (roof) { const r = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.74, h * 0.38, 4), M(roof), x, h + h * 0.19, z, town); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); }
    const rows = Math.max(1, Math.floor(h / 2.4)), cols = Math.max(1, Math.floor(w / 1.9));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (R() < 0.62) win.push([x - w / 2 + (c + 0.5) * w / cols, 1.3 + r * 2.4, z + d / 2 + 0.02, R()]); return b; };
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) { const x = -44 + i * 11 + (R() - 0.5) * 2, w = 6 + R() * 4, h = 3.5 + R() * 6, d = 6 + R() * 3;
    box(x, side * 9 - (side > 0 ? 0 : 0), w, h, d, pals[Math.floor(R() * pals.length)], R() < 0.4 ? pals[Math.floor(R() * pals.length)] : null); }
  for (let i = 0; i < 16; i++) { const x = -70 + R() * 140, z = -22 - R() * 40; box(x, z, 5 + R() * 6, 3 + R() * 9, 5 + R() * 5, pals[Math.floor(R() * pals.length)], R() < 0.5 ? '#8a3a2a' : null); }
  for (let i = 0; i < 10; i++) { const x = (R() < 0.5 ? -1 : 1) * (52 + R() * 30), z = 4 + R() * 14; box(x, z, 4 + R() * 3, 2.5 + R() * 2, 4 + R() * 3, pals[Math.floor(R() * pals.length)], '#7a3a2a'); }
  const road = mesh(new THREE.PlaneGeometry(130, 6), M('#4a3a40'), 0, 0.03, 0, town); road.rotation.x = -Math.PI / 2;
  const winGeo = new THREE.PlaneGeometry(0.9, 1.1); own.push(winGeo);
  const winMat = B(new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: true }));
  const wins = new THREE.InstancedMesh(winGeo, winMat, win.length); const m4 = new THREE.Matrix4();
  win.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); wins.setMatrixAt(i, m4); }); town.add(wins);
  // the one horse: on its plinth in the square
  const horse = new THREE.Group(); horse.position.set(0, 0, 3.5); horse.scale.setScalar(1.6); town.add(horse);
  const hm = M('#8a5a3a'); mesh(new THREE.BoxGeometry(1.8, 1.0, 1.8), M('#d8ccb4'), 0, 0.5, 0, horse);
  const hb = mesh(new THREE.CapsuleGeometry(0.42, 1.1, 3, 8), hm, 0, 2.1, 0, horse); hb.rotation.z = Math.PI / 2;
  const hn = mesh(new THREE.CapsuleGeometry(0.22, 0.7, 3, 8), hm, 0.85, 2.7, 0, horse); hn.rotation.z = -0.6; mesh(new THREE.CapsuleGeometry(0.2, 0.45, 3, 8), hm, 1.18, 3.05, 0, horse).rotation.z = 1.2;
  for (const [x, z] of [[-0.5, -0.25], [-0.5, 0.25], [0.5, -0.25], [0.5, 0.25]]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), hm, x, 1.45, z, horse);
  // water tower + the midway wheel
  const wt = new THREE.Group(); wt.position.set(-30, 0, -16); town.add(wt); const wm = M('#b8c0c8');
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 6), wm, x, 6, z, wt);
  mesh(new THREE.CylinderGeometry(3.4, 3.4, 4.2, 14), M('#9ab8c8'), 0, 14, 0, wt); mesh(new THREE.ConeGeometry(3.6, 1.6, 14), M('#e0705a'), 0, 16.9, 0, wt);
  const wheel = new THREE.Group(); wheel.position.set(34, 13, -20); town.add(wheel);
  mesh(new THREE.TorusGeometry(10, 0.35, 6, 32), M('#f6efe0'), 0, 0, 0, wheel);
  for (let i = 0; i < 8; i++) { const s = mesh(new THREE.CylinderGeometry(0.15, 0.15, 20, 5), M('#f6efe0'), 0, 0, 0, wheel); s.rotation.z = i * Math.PI / 8; }
  const cars = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), M(pals[i % pals.length]), Math.cos(a) * 10, Math.sin(a) * 10, 0, wheel); cars.push(c); }
  for (const sx of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.3, 0.3, 15, 6), M('#d8ccb4'), sx * 3, -6.5, -0.6, wheel); l.rotation.z = sx * 0.22; }
  // far mesas on the horizon (the sun comes up between them)
  const farM = M('#6a3a52');
  for (const [x, z, r, h] of [[-150, -250, 34, 26], [-80, -270, 22, 18], [110, -260, 40, 30], [190, -230, 26, 20], [-230, -200, 30, 22], [30, -300, 18, 12]]) mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 9), farM, x, -18 + h / 2, z);

  // the sun: a felt sun with one big eye (the studio's Eye Sets), it rises and opens its eye
  const sun = new THREE.Group(); sun.position.set(-10, -60, -280); scene.add(sun);
  const SB = (c) => B(new THREE.MeshBasicMaterial({ color: c, fog: false }));
  mesh(new THREE.CircleGeometry(22, 48), SB('#ffc23a'), 0, 0, 0, sun);
  const rays = new THREE.Group(); sun.add(rays);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = mesh(new THREE.ConeGeometry(3.6, 9, 3), SB(i % 2 ? '#ffa53a' : '#ffd25a'), Math.cos(a) * 27, Math.sin(a) * 27, -0.5, rays); r.rotation.z = a - Math.PI / 2; }
  const eye = new THREE.Group(); eye.position.set(0, 2, 0.2); sun.add(eye);
  mesh(new THREE.CircleGeometry(9, 40), SB('#fff8ea'), 0, 0, 0, eye); const iris = mesh(new THREE.CircleGeometry(4.6, 32), SB('#3a7ab8'), 0, -0.6, 0.1, eye);
  mesh(new THREE.CircleGeometry(2.4, 24), SB('#1d1416'), 0, 0, 0.1, iris); mesh(new THREE.CircleGeometry(0.9, 12), SB('#ffffff'), 1.3, 1.3, 0.2, iris);
  const cheeks = []; for (const sx of [-1, 1]) cheeks.push(mesh(new THREE.CircleGeometry(3, 20), SB('#ff8a5a'), sx * 12, -8, 0.15, sun));
  const smile = mesh(new THREE.TorusGeometry(5.5, 0.9, 6, 24, Math.PI), SB('#c9542a'), 0, -10, 0.2, sun); smile.rotation.z = Math.PI;
  const halo = glowSprite('#ffb05a', 150, 150, 0.0); sun.add(halo); halo.position.z = -2;

  // Moth's couch, the porch light he fixed
  const couch = new THREE.Group(); couch.position.set(0, 0, 0); scene.add(couch);
  const cm = M('#b8443a'), cc = M('#d06a52');
  mesh(new THREE.BoxGeometry(4.6, 0.42, 1.15), cm, 0, 0.21, 0, couch); mesh(new THREE.BoxGeometry(4.1, 0.16, 1.0), cc, 0, 0.5, -0.02, couch);
  mesh(new THREE.BoxGeometry(4.6, 0.95, 0.32), cm, 0, 0.78, 0.46, couch); for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.32, 0.72, 1.15), cm, sx * 2.3, 0.6, 0, couch);
  const lamp = new THREE.Group(); lamp.position.set(0.95, 0, 1.3); scene.add(lamp);   // Moth's porch light, framed between the leads in the front shot
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), M('#3a2a2a'), 0, 1.1, 0, lamp); mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.36, 10), M('#3a2a2a'), 0, 2.32, 0, lamp);
  const bulbMat = B(new THREE.MeshBasicMaterial({ color: '#ffe6a0' })); mesh(new THREE.SphereGeometry(0.18, 10, 8), bulbMat, 0, 2.08, 0, lamp);
  const lampGlow = glowSprite('#ffd27a', 3.2, 3.2, 0.75); lampGlow.position.y = 2.1; lamp.add(lampGlow);
  const lampL = new THREE.PointLight('#ffcf7a', 6, 7, 1.6); lampL.position.set(0, 2.0, 0); lamp.add(lampL);
  // (no cooler: the couch shot stays clean)

  // the crew: the game's own models (the same lo GLBs + Sunspots felt look the town and missions use; the Wolf is the
  // player's own wolf_armsdown_felt.glb). Staged like an art-book frame: Wolf + Moth up front as the leads, a clear gap
  // behind them, everyone else in a loose arc around Moth's couch. Everyone faces the town and the sun (-z).
  const crew = {}; const put = (k, x, z, ry = 0, sit = false) => { const g = MODELS[k]; if (!g) return; g.position.set(x, 0, z); g.rotation.y = Math.PI + ry; scene.add(g); crew[k] = rig(k, g, sit); };
  put('bear', -1.38, -0.22, 0.1, true); put('wolf', 0.0, -0.2, 0, true); put('moth', 1.38, -0.22, -0.08, true);   // on Moth's couch (hips at the front of the cushion, feet on the ground)
  put('lynx', -0.72, 1.18, -0.1); put('ram', -2.6, 1.08, -0.3); put('heron', 2.55, 1.1, 0.22);   // leaning on the back of it
  put('gecko', 1.82, 1.18, 0.15); put('anteater', -4.25, 0.55, -0.55);
  put('squid', 2.65, -1.05, 0.55); put('crow', 3.55, -0.15, 0.7);
  if (Q.get('finale') === 'lineup') { const order = ['wolf', 'moth', 'bear', 'ram', 'heron', 'crow', 'lynx', 'gecko', 'anteater', 'squid']; order.forEach((k, i) => { const c = crew[k]; if (c) { c.g.position.set((i - 4.5) * 1.3, 0, 4); c.g.rotation.y = 0; c.sit = false; c.g.userData.inner.position.y = 0; } }); }

  cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
  return { skyU, starMat, hemi, sunL, fill, sun, eye, rays, halo, wins, win, wheel, cars, crew, lampGlow, lampL, bulbMat, scene };
}

// ------------------------------------------------------------------ the script
const LINES = [   // [t, who, line]
  [3.0, 'MOTH', "Porch light's fixed. Nobody has to sit in the dark anymore."],
  [7.4, 'BEAR', 'Seven nights. Same old town.'],
  [10.6, 'WOLF', 'Same old town. Best one there is.'],
  [14.6, 'HERON', 'Is the sun... looking at us?'],
  [17.8, 'RAM', 'It does that. Be polite. Wave.'],
  [21.4, 'SQUID', 'Somebody else is driving tomorrow.'],
];
const D = { scene: 26, title: 6.5, roll: 52 };
const SHOT = [   // camera keys: [t, camPos, lookAt, lookAt in portrait (optional)]
  [0, [1.4, 4.6, 7.6], [-4, -6, -60]],
  [7, [0.5, 4.0, 6.2], [-4, -5, -60]],
  [7.01, [-1.7, 1.2, -4.9], [0.15, 1.0, -0.3]],      // the crew from the front, low 3/4: Wolf + Moth lead, dawn on their faces, rim light behind
  [14, [-1.0, 1.15, -4.4], [0.25, 1.0, -0.3]],
  [14.01, [-1.5, 1.6, 6.5], [-7, 4, -200]],     // from behind: the sun comes up over their shoulders (the porch lamp off to the right)
  [20, [-2.1, 2.6, 8.5], [-9, 8, -200]],
  [20.01, [2.4, 1.3, -5.8], [0.1, 1.05, -0.3]],
  [26, [3.3, 1.8, -7.2], [0.1, 1.1, -0.3]],
  [26.01, [7, 5, 10], [-24, 22, -60], [-6, 27, -60]],     // title: clear sky for the words, the sun low and to the right (centred, under them, in portrait)
  [33, [4, 7, 14], [-26, 24, -70], [-8, 29, -70]],
  [40, [3, 7.5, 14.5], [60, 14, -70]],     // the roll: the sun off to the left, clear sky behind the names
  [200, [-4, 9, 16], [66, 14, -80]],
];
function camAt(t, out, look, portrait) {
  let i = 0; while (i < SHOT.length - 2 && SHOT[i + 1][0] <= t) i++;
  const a = SHOT[i], b = SHOT[i + 1], k = ease((t - a[0]) / Math.max(0.001, b[0] - a[0]));
  out.set(lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k));
  const la = portrait && a[3] || a[2], lb = portrait && b[3] || b[2];
  look.set(lerp(la[0], lb[0], k), lerp(la[1], lb[1], k), lerp(la[2], lb[2], k));
  if (portrait) { const back = out.clone().sub(look).normalize(); out.addScaledVector(back, 1.8 + 0.06 * out.distanceTo(look) * 0); out.y += 0.3; }
}

export async function playFinale({ from = 0 } = {}) {
  if (playing) return; playing = true;
  const R = window.__sunspots?.renderer; if (!R) { playing = false; return; }
  let MODELS; try { if (!glowSprite) ({ glowSprite, blobShadow } = await import('./missions/kit.js')); MODELS = await loadCrew(); } catch (e) { console.warn('finale: kit', e); playing = false; return; }
  try { window.__town?.M?.save?.(); } catch (_) {}
  if (st) return; const P0 = loadP(); P0.finaleSeen = 1; P0.finaleAt = Date.now(); saveP(P0);   // the SAME OLD SUNRISE Sunspot + never auto-plays twice
  window.__saveguard?.mirror?.();
  window.__paused = true; document.body.classList.add('finale');
  const canvas = R.domElement, oldZ = canvas.style.zIndex; canvas.style.zIndex = '76';
  st = build(MODELS); st.oldZ = oldZ; st.canvas = canvas; st.R = R; st.t = from; st.speed = 1; st.phase = 'scene'; st.lineI = -1;
  st.toneExp = R.toneMappingExposure;
  root = document.createElement('div'); root.id = 'fin';
  root.innerHTML = `<div class="kick">SUNDAY · 6:04 AM</div><div class="cap"><b></b><span></span></div>
    <div class="ttl"><small>THE END OF THE WEEK</small><strong>SAME OLD<br>ONE HORSE TOWN</strong><small>THANKS FOR DRIVING</small></div>
    <div class="rollDim"></div><div class="roll">${creditsHTML('&#9728;')}</div><button class="skip">HOLD TO SKIP<i></i></button><div class="fade"></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s); st.el = { kick: $('.kick'), cap: $('.cap'), who: $('.cap b'), say: $('.cap span'), ttl: $('.ttl'), roll: $('.roll'), dim: $('.rollDim'), skip: $('.skip'), bar: $('.skip i'), fade: $('.fade') };
  // hold to skip (1 s); holding anywhere during the roll runs it fast
  let hold = 0, holdT = 0; const sk = st.el.skip;
  const down = (e) => { e.preventDefault(); e.stopPropagation(); hold = 1; holdT = performance.now(); }, up = () => { hold = 0; st.el.bar.style.width = '0'; };
  sk.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('.card,.skip')) return; if (st?.phase === 'roll') st.speed = 5; });
  root.addEventListener('pointerup', () => { if (st) st.speed = 1; });
  st.cleanupIn = () => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  st.holdTick = () => { if (!hold) return; const k = (performance.now() - holdT) / 1000; st.el.bar.style.width = Math.min(100, k * 100) + '%'; if (k >= 1) { hold = 0; toTally(); } };
  st.resize = () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); R.setSize(innerWidth, innerHeight, false); }; st.resize(); addEventListener('resize', st.resize);
  try { window.__audio?.finale?.(true); } catch (_) {}
  // warm the shaders off-screen, then fade in
  try { R.compile(scene, cam); } catch (_) {}
  requestAnimationFrame(() => { st.el.fade.style.opacity = '0'; st.el.kick.classList.add('on'); setTimeout(() => st?.el.kick.classList.remove('on'), 4200); });
  if (from >= D.scene + D.title) { st.el.kick.classList.remove('on'); }
  let last = performance.now();
  const tick = (now) => { if (!st) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; st.holdTick(); step(dt); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  window.__finale = { st, cam, skip: toTally, get t() { return st?.t; }, get phase() { return st?.phase; } };
}

const V = new THREE.Vector3(), L = new THREE.Vector3(), CA = new THREE.Color(), CB = new THREE.Color();
function step(dt) {
  const s = st, el = s.el; if (s.phase === 'tally') { render(dt, true); return; }
  s.t += dt * (s.phase === 'roll' ? s.speed : 1);
  const t = s.t, portrait = innerHeight > innerWidth;
  // captions
  let li = -1; for (let i = 0; i < LINES.length; i++) if (t >= LINES[i][0] && t < LINES[i][0] + 3.3) li = i;
  if (li !== s.lineI) { s.lineI = li; if (li >= 0) { el.who.textContent = LINES[li][1]; el.say.textContent = LINES[li][2]; el.cap.classList.add('on'); } else el.cap.classList.remove('on'); }
  // title card, then the roll
  el.ttl.classList.toggle('on', t >= D.scene - 0.5 && t < D.scene + D.title - 0.8);
  if (t >= D.scene + D.title && s.phase === 'scene') { s.phase = 'roll'; el.dim.classList.add('on'); s.rollH = el.roll.offsetHeight; }
  if (s.phase === 'roll') { const k = (t - D.scene - D.title) / D.roll, vh = innerHeight; el.roll.style.transform = `translate(-50%, ${lerp(vh, -s.rollH - 20, clamp(k, 0, 1))}px)`; if (k >= 1) toTally(); }
  render(dt, false);
}
function render(dt, tally) {
  const s = st, t = Math.min(s.t, 400), portrait = innerHeight > innerWidth;
  // sunrise: k 0 -> 1 over the scene
  const k = ease((t - 2) / 19);
  s.skyU.k.value = k; s.starMat.opacity = 1 - ease(k * 1.6);
  s.sun.position.y = lerp(-46, 34, ease((t - 1) / 26)); s.sun.position.x = lerp(-14, -6, ease(t / 30));
  s.skyU.sunDir.value.copy(s.sun.position).normalize();
  s.rays.rotation.z = t * 0.08; s.halo.material.opacity = 0.15 + 0.5 * k;
  const open = ease((t - 12.5) / 1.6), blink = (t > 18 && ((t * 0.7) % 4.3) < 0.14) ? 0.1 : 1; s.eye.scale.set(1, Math.max(0.06, open * blink), 1);
  s.eye.children[1].position.x = Math.sin(t * 0.4) * 0.9;
  CA.set('#3a2a52'); CB.set('#f2b48a'); s.scene.fog.color.copy(CA).lerp(CB, k);
  s.hemi.color.set('#6a6ab8').lerp(CB.set('#ffe2c0'), k); s.hemi.groundColor.set('#2a1a2a').lerp(CB.set('#8a5a4a'), k); s.hemi.intensity = lerp(0.85, 1.25, k);
  s.sunL.intensity = 2.4 * k; s.sunL.position.set(s.sun.position.x * 0.3, Math.max(4, s.sun.position.y * 0.5), -100);
  s.fill.color.set('#8a9aff').lerp(CB.set('#ff9a50'), k); s.fill.intensity = lerp(0.6, 1.9, k);
  // porch light clicks off once the sun is up; windows go dark one by one
  const lampOn = t < 19.2 ? 1 : 0; s.lampGlow.material.opacity = 0.75 * lampOn; s.lampL.intensity = 6 * lampOn; s.bulbMat.color.set(lampOn ? '#ffe6a0' : '#d8ccb4');
  const m4 = new THREE.Matrix4(); s.win.forEach(([x, y, z, r], i) => { const on = r > k * 1.15; m4.makeScale(on ? 1 : 0.0001, on ? 1 : 0.0001, 1).setPosition(x, y, z); s.wins.setMatrixAt(i, m4); }); s.wins.instanceMatrix.needsUpdate = true;
  s.wheel.rotation.z = t * 0.06; for (const c of s.cars) c.rotation.z = -s.wheel.rotation.z;
  // the crew: everyone waves at the sun on Ram's line, everyone cheers at the title
  animCrew(s, dt, t, tally);
  camAt(t, V, L, portrait); cam.position.copy(V); cam.lookAt(L);
  cam.fov = portrait ? 66 : 48; cam.updateProjectionMatrix();
  if (Q.get('finale') === 'lineup') { cam.position.set(0, 1.0, 15); cam.lookAt(0, 0.95, 4); cam.fov = 30; cam.updateProjectionMatrix(); }   // QA: refcheck lineup
  s.R.setRenderTarget(null); s.R.render(s.scene, cam);
}

// ------------------------------------------------------------------ tally, end
function card(html, buttons, standalone = false) {
  if (standalone && !root) { root = document.createElement('div'); root.id = 'fin'; root.style.background = '#0008'; document.body.appendChild(root); window.__paused = true; document.body.classList.add('finale'); }
  root.querySelector('.card')?.remove();
  const c = document.createElement('div'); c.className = 'card'; c.innerHTML = html + '<div class="btns">' + buttons.map(([l], i) => `<button data-i="${i}"${i ? ' class="alt"' : ''}>${esc(l)}</button>`).join('') + '</div>';
  c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; buttons[+b.dataset.i][1](); });
  c.insertAdjacentHTML('afterbegin', '<div class="sunB"><i></i></div>');
  root.appendChild(c); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('on')));
  const n = c.querySelector('[data-count]'); if (n) { const to = +n.dataset.count, t0 = performance.now(); const up = (now) => { const k = Math.min(1, (now - t0) / 1200); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && n.isConnected) requestAnimationFrame(up); }; requestAnimationFrame(up); }
}
function toTally() {
  const s = st; if (!s || s.phase === 'tally') return; s.phase = 'tally';
  if (s.t < D.scene) s.t = D.scene + 1;   // skipped: show the morning
  for (const k of ['cap', 'ttl', 'roll', 'skip', 'kick']) s.el[k].style.display = 'none'; s.el.dim.classList.add('on');
  window.__journal?.render?.(); const [f, t] = totals(), left = Math.max(0, t - f), pct = t ? Math.round(100 * f / t) : 0;
  card(`<p class="fk">THE END · A GAME BY ${esc(STUDIO.toUpperCase())}</p><h2>SUNSPOTS FOUND</h2><p class="fbig"><b data-count="${f}">0</b> / ${t}</p><div class="bar"><u style="width:${pct}%"></u></div>
    <p>${left ? `${pct}% complete. ${left} Sunspot${left > 1 ? 's are' : ' is'} still out there. The town keeps going: the JOURNAL has rumours.` : '100%. Every errand, every game, every secret.'}</p>`,
    [['KEEP PLAYING', () => end('roam')], ['MAIN MENU', () => end('menu')]]);
}
function end(how, standalone = false) {
  const P = loadP(); if (how === 'roam' && !standalone) { P.postgame = 1; saveP(P); }
  try { window.__town?.M?.save?.(); } catch (_) {}
  window.__saveguard?.mirror?.();
  if (how === 'menu') { location.href = location.pathname + (location.search.includes('nosw') ? '?nosw' : ''); return; }
  cancelAnimationFrame(raf);
  if (st) { removeEventListener('resize', st.resize); st.cleanupIn(); st.canvas.style.zIndex = st.oldZ; try { st.R.toneMappingExposure = st.toneExp; } catch (_) {} for (const o of own) try { o.dispose?.(); } catch (_) {} own = []; scene = null; st = null;
    try { window.__audio?.finale?.(false); } catch (_) {} }
  root?.remove(); root = null; playing = false; window.__paused = false; document.body.classList.remove('finale');
  window.__finale = null;
  // (no toast here: the tally card already said what's left, and the town's own SUNSPOT FOUND toast is on screen)
}

export const finaleCredits = { CREATOR_NAME, STUDIO };
// QA: ?finale (whole ending) / ?finale=credits (start at the roll) / ?finale=tally
if (Q.has('finale')) { const go = () => { if (window.__ready && !window.__titleUp && window.__journal && window.__sunspots?.renderer) { const v = Q.get('finale'); playFinale({ from: v === 'credits' ? D.scene + D.title : 0 }).then(() => { if (v === 'tally') setTimeout(toTally, 400); }); } else setTimeout(go, 400); }; setTimeout(go, 1500); }
