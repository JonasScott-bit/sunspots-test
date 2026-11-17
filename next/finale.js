// THE END (Night 7 complete): the crew on Moth's couch in the real Horse Plaza on Main St, the game's own eye sun comes up
// over the DMV, the credits roll to The Eye Sets Over the Coral, then the Sunspot tally and free roam to finish 100%.
// Shot in the overworld itself: main.js's scene, town, lights, palettes and sun (window.__sunspots.fin), drawn with the
// game's renderer while the main loop sleeps (window.__paused); everything it touches is handed back in end().
// shell.js calls maybeFinale() from its progress loop; ?finale plays it on load (QA), ?finale=credits jumps to the roll.
import * as THREE from 'three';
let kitLoaded = false, blobShadow;   // missions/kit.js, loaded on first play (keeps shell.js's import order as it was)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { sunspotsApply } from './sunspots_material.js';
import { wolfIdle, gesturer, castOffsets, CAST_POOL } from './idles.js';
import { quality } from './quality.js';
const LOWQ = () => quality?.t?.id === 'low';
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
  P.perfect = 1; saveP(P); card(`<p class="fk">SUNSPOTS</p><h2>EVERY SUNSPOT</h2><p class="fbig">☀ ${f} / ${t}</p><p>You know this town now. It knows you back.</p>`, [['KEEP PLAYING', () => end('roam', true)]], true); return true;
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
const BORDER = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
function modelRot(u, list, k = 1) {   // [bone, rx, ry, rz] in model space (+X the character's left, +Z forward), parents first
  u.root.getWorldQuaternion(_w); _wi.copy(_w).invert();
  for (const [n, x, y, z] of list.sort((a, b) => BORDER.indexOf(a[0]) - BORDER.indexOf(b[0]))) { const b = u.bones[n]; if (!b) continue;
    _q.setFromEuler(_e.set(x * k, y * k, z * k, 'YXZ')).premultiply(_w).multiply(_wi); b.parent.getWorldQuaternion(_p); _pi.copy(_p).invert(); _q.premultiply(_pi).multiply(_p); b.quaternion.premultiply(_q); b.updateMatrixWorld(true); }
}
// Seated (Wolf, Moth, Bear): a frozen idle frame as the base, then a real sit: back against the cushions, thighs flat on the
// seat, shins down to the floor (angled only as much as the leg length needs), hands resting on the knees, a gentle breathe.
const SEATY = 0.5, ANKLE = 0.09, SEAT_Z = 0.02;   // hip height on the cushion; hips this far forward of the couch centre
const KEEP = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
const SEAT_POOL = { look: [1, 3.2], nod: [1, 1.8], shrug: [0.7, 1.8], sun: [1, 2.6], lean: [0.8, 2.6] };
function seatPose(c) {   // [bone, rx, ry, rz] model space; c.knee from the leg length
  const kn = c.knee;
  return [['Spine02', -0.06, 0, 0], ['Spine01', -0.05, 0, 0], ['Spine', -0.03, 0, 0],
    ['LeftUpLeg', -1.52, 0, 0.05], ['RightUpLeg', -1.52, 0, -0.05], ['LeftLeg', kn, 0, 0], ['RightLeg', kn, 0, 0], ['LeftFoot', 0.05, 0, 0], ['RightFoot', 0.05, 0, 0],
  ];
}
// turn the head (and a little of the chest) so the face points at a world target, k = how far (1 = all the way)
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function aimHead(u, tx, tz, k, lead = 0, lim = 1.2) {
  const h = u.bones.Head, f = u.bones.headfront; if (!h || !f || k < 0.001) return;
  h.getWorldPosition(_a); f.getWorldPosition(_b); const cur = Math.atan2(_b.x - _a.x, _b.z - _a.z), want = Math.atan2(tx - _a.x, tz - _a.z) + lead;
  let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; d = clamp(d, -lim, lim) * k;
  // world yaw -> the model's own yaw (the character group is turned ~PI; model yaw is about the same world up axis)
  modelRot(u, [['Spine', 0, d * 0.2, 0], ['neck', 0, d * 0.3, 0], ['Head', 0, d * 0.5, 0]]);
}
// in his close-up: the face fully solved to 3/4 -- 60% of the way back from the lens toward where his body points, whatever the idle was doing
function coverAim(u, c) {
  const h = u.bones.Head; if (!h) return; h.getWorldPosition(_a);
  const cam = Math.atan2(c.cover.x - _a.x, c.cover.z - _a.z); let d = c.g.rotation.y - cam; d = Math.atan2(Math.sin(d), Math.cos(d));
  for (let i = 0; i < 3; i++) { aimHead(u, c.cover.x, c.cover.z, 1, 0.6 * d, 1.6); u.root.updateMatrixWorld(true); }   // a few passes: spine and neck move the head as they turn
}
// rotate a bone so the direction bone->child points at a world point
const _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e2 = new THREE.Vector3(), _qa = new THREE.Quaternion();
function aimBone(bone, child, target) {
  bone.updateMatrixWorld(true); bone.getWorldPosition(_c); child.getWorldPosition(_d);
  const from = _d.sub(_c).normalize(), to = _e2.copy(target).sub(_c).normalize(); _qa.setFromUnitVectors(from, to);
  bone.parent.getWorldQuaternion(_p); _pi.copy(_p).invert(); _qa.premultiply(_pi).multiply(_p); bone.quaternion.premultiply(_qa); bone.updateMatrixWorld(true);
}
const _k = new THREE.Vector3(), _s = new THREE.Vector3(), _el = new THREE.Vector3(), _o = new THREE.Vector3();
function handsOnKnees(u, c) {   // two-bone: elbow out and back a little, the hand on top of the knee
  u.root.updateMatrixWorld(true); const B = u.bones;
  for (const side of ['Left', 'Right']) { const arm = B[side + 'Arm'], fore = B[side + 'ForeArm'], hand = B[side + 'Hand'], knee = B[side + 'Leg']; if (!arm || !fore || !hand || !knee) continue;
    knee.getWorldPosition(_k); _k.y += 0.07 * u.h / 1.8; arm.getWorldPosition(_s); const up = arm.getWorldPosition(new THREE.Vector3()).distanceTo(fore.getWorldPosition(new THREE.Vector3()));
    _o.subVectors(_k, c.g.position).setY(0).normalize().multiplyScalar(0.06);   // a touch outward
    _el.subVectors(_k, _s).multiplyScalar(0.5).add(_s); _el.y -= 0.12 * u.h / 1.8; _el.add(_o);   // elbow below the midpoint
    _el.sub(_s).normalize().multiplyScalar(up).add(_s);
    aimBone(arm, fore, _el); aimBone(fore, hand, _k); }
}
function seatGesture(g, t) {
  if (!g.name || g.k < 0.002) return []; const k = g.k, p = g.p, w = Math.sin(p * Math.PI * 2);
  switch (g.name) {
    case 'look': return [['Head', 0, 0.3 * w * k, 0]];
    case 'nod': return [['Head', Math.max(0, Math.sin(p * Math.PI * 4)) * 0.12 * k, 0, 0]];
    case 'shrug': { const u = Math.sin(p * Math.PI) * k; return [['LeftShoulder', 0, 0, 0.22 * u], ['RightShoulder', 0, 0, -0.22 * u], ['Head', 0, 0, 0.08 * u]]; }
    case 'sun': return [['neck', -0.1 * k, 0, 0], ['Head', -0.2 * k, 0, 0]];
    case 'lean': return [['Spine', 0, 0, 0.05 * Math.sin(p * Math.PI) * k], ['Head', 0, 0, -0.05 * Math.sin(p * Math.PI) * k]];
  }
  return [];
}
function rig(k, g, sit) {
  const u = g.userData, c = { g, k, sit, arm: k === 'bear' ? 0.45 : 1 };
  if (u.mixer && u.bones.Hips && !sit) { c.mixer = u.mixer;
    c.gest = wolfIdle({ root: u.root, bones: u.bones }, 'fin_' + k); c.gest.g.wait = 1 + Math.random() * 7; c.gest.g.min = 5; c.gest.g.max = 13; }
  else if (sit && u.bones.Hips) {
    c.snap = KEEP.map((n) => [u.bones[n], u.bones[n]?.quaternion.clone()]).filter((x) => x[0]);
    c.gest = gesturer(SEAT_POOL, 'fin_' + k, { first: 2 + Math.random() * 6, min: 5, max: 11 });
    g.updateMatrixWorld(true); const b = u.bones, P = (n) => b[n].getWorldPosition(new THREE.Vector3());
    const L = P('LeftLeg').distanceTo(P('LeftFoot'));                       // shin length -> how far the shin tilts to reach the floor
    c.knee = 1.52 - Math.acos(clamp((SEATY - ANKLE) / Math.max(0.05, L), 0, 1));
    c.restore = () => { for (const [bn, q] of c.snap) bn.quaternion.copy(q); };
    c.restore(); modelRot(u, seatPose(c)); g.updateMatrixWorld(true);
    const hp = P('Hips'); g.position.y += SEATY - hp.y; g.position.z += O.z + SEAT_Z - hp.z;   // the couch is centred on O c.baseY = 0; if (u.shadow) u.shadow.visible = false;
  }
  else c.gest = gesturer(CAST_POOL, 'fin_' + k, { first: 2 + Math.random() * 6, min: 5, max: 12 });
  return c;
}
// who looks where (radians; + = toward world -x, i.e. screen right in the front shots). The sun is straight ahead for everyone.
function heads(k, t) {
  const at = (a, b) => ease((t - a) / 0.8) * (1 - ease((t - b) / 0.8));
  switch (k) {   // [yaw, pitch, spine yaw]: + = toward world -x (Bear's side of the couch), - = toward +x (Moth's side)
    case 'wolf': return [0.5 * at(7.2, 10.3) - 0.45 * at(21.2, 24.6) - 0.4 * at(2.8, 6.6), -0.1 * at(10.4, 14.4), 0.1 * at(7.2, 10.3)];   // to Bear, to Squid, to Moth (his own line: aimHead)
    case 'moth': return [0.5 * at(10.4, 14.4) + 0.45 * at(2.8, 6.6), -0.04, 0.12 * at(10.4, 14.4)];   // to the Wolf, on the Wolf's line and his own
    case 'bear': return [-0.5 * at(7.0, 14.4), -0.22, -0.1 * at(7.0, 14.4)];   // to the Wolf
    case 'heron': return [0.35 * at(5, 13.5), -0.12 * at(14.4, 30), 0];
    case 'lynx': return [-0.35 * at(6, 12), 0, 0]; case 'gecko': return [0.35 * at(4, 11), 0, 0]; case 'squid': return [0.3 * at(8, 13), 0, 0];
    case 'ram': return [-0.3 * at(2, 12) + 0.25 * at(19.2, 21.5), 0, 0]; default: return [0, 0, 0];
  }
}
function animCrew(s, dt, t, tally) {
  for (const c of Object.values(s.crew)) { const u = c.g.userData, i = u.inner;
    const cheer = (t > 23.2 && t < D.scene + 3) || tally, b = Math.abs(Math.sin(t * 6.5 + u.ph * 3));
    if (!c.live && (c.restore || c.mixer)) { i.position.y = cheer ? (c.restore ? b * 0.035 : b * 0.1) : 0; continue; }   // out of the rig budget: the baked pose, a hop when everyone cheers
    if (c.restore) {   // seated
      c.restore(); modelRot(u, seatPose(c)); c.gest.update(dt, 1);
      const br = Math.sin(t * 1.9 + u.ph) * 0.02, [y0, p, sy0] = c.cover ? [0, -0.06, 0] : heads(c.k, t), y = -y0, sy = -sy0;   // heads() is written as + = toward world -x; the rig's yaw is the other way
      modelRot(u, [['Spine01', br, sy * 0.5, 0], ['Spine', 0, sy * 0.5, 0], ['neck', p * 0.4, y * 0.35, 0], ['Head', p * 0.6, y * 0.65, 0], ...seatGesture(c.gest, t)]);
      if (!cheer) handsOnKnees(u, c);
      if (c.cover) { u.root.updateMatrixWorld(true); coverAim(u, c); }   // in his close-up: face 3/4 to the lens
      else if (c.k === 'wolf') { const kk = ease((t - 10.4) / 0.8) * (1 - ease((t - 14.4) / 0.8)); if (kk > 0.001) { u.root.updateMatrixWorld(true); aimHead(u, cam.position.x, cam.position.z, kk, -0.55); } }   // his line on the wide: 3/4 to camera
      if (cheer) modelRot(u, [['LeftArm', 0.62, 0, 1.2 + b * 0.9], ['RightArm', 0.62, 0, -(1.2 + b * 0.9)], ['LeftForeArm', 0.55, 0, 0], ['RightForeArm', 0.55, 0, 0]]);
      i.position.y = cheer ? b * 0.035 : 0;
    } else if (c.mixer) { c.mixer.update(dt);
      const [y0, p] = c.cover ? [0, 0] : heads(c.k, t), y = -y0; if (y || p) modelRot(u, [['neck', p * 0.4, y * 0.35, 0], ['Head', p * 0.6, y * 0.65, 0]]);
      c.gest.apply(dt, t, 1);
      if (c.cover) { u.root.updateMatrixWorld(true); coverAim(u, c); }
      if (cheer) { i.position.y = b * 0.1; modelRot(u, [['LeftArm', 0, 0, 2.3 * b * 0.6 + 0.6], ['RightArm', 0, 0, -(2.3 * b * 0.6 + 0.6)]]); } else i.position.y = 0;
    } else { c.gest.update(dt, 1); const o = castOffsets(c.gest, t);   // no usable clip (banana squid): the transform gesture layer
      let tw = 0; if (c.cover) { const want = Math.atan2(c.cover.x - c.g.position.x, c.cover.z - c.g.position.z) - c.g.rotation.y; tw = Math.atan2(Math.sin(want), Math.cos(want)) * 0.7; }   // turn 3/4 to the lens
      i.rotation.set(o.rx, o.ry + tw, o.rz + Math.sin(t * 1.3 + u.ph) * 0.025); i.scale.set(o.sx, o.sy * (1 + Math.sin(t * 2 + u.ph) * 0.012), o.sx);
      i.position.y = (cheer ? Math.abs(Math.sin(t * 7 + u.ph)) * 0.12 : 0) + o.y * u.h; }
  }
}

// ------------------------------------------------------------------ where: the real town
// Horse Plaza, at the foot of the One Horse statue (townscape + horse.js), facing north across Main St: the town's own eye sun
// comes up over the Department of Motor Vehicles roof. Front shots have the statue and its SAME OLD ONE HORSE TOWN plaque
// behind the cast. Everything here is the overworld's own scene, camera, lights, ground and sun (main.js exposes them as
// window.__sunspots.fin); the finale only adds Moth's couch and the cast.
const O = new THREE.Vector3(-64.65, 0, 14.8);   // the couch on the plaza's front edge, room behind it for the sunrise shot
const EXTRAS = ['lynx', 'gecko', 'anteater', 'crow'];   // non-speaking: left out on the LOW tier
// Rig budget: at most 3 skinned characters animate at once. Everyone else shows a baked snapshot of their current pose
// (a plain mesh: no bones, no mixer), re-baked whenever they drop out of the live set.
const MAX_RIGS = 3;
const _sv = new THREE.Vector3(), _sn = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _m3 = new THREE.Matrix3(), _bm = new THREE.Matrix4();
function bakeSkinned(sm, into) {
  const g = sm.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, sk = sm.skeleton;
  sk.update(); const bm = sk.boneMatrices, n = P.count;
  let out = into; if (!out) { out = new THREE.BufferGeometry(); for (const k in g.attributes) if (k !== 'skinIndex' && k !== 'skinWeight') out.setAttribute(k, (k === 'position' || k === 'normal') ? new THREE.BufferAttribute(new Float32Array(n * 3), 3) : g.attributes[k].clone()); /* float: the GLBs are quantized (normalized int16), which would clamp skinned positions to +-1 */ out.setIndex(g.index); for (const gr of g.groups) out.addGroup(gr.start, gr.count, gr.materialIndex); }
  const op = out.attributes.position, on = out.attributes.normal;
  for (let i = 0; i < n; i++) {
    _m4.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; _bm.fromArray(bm, SI.getComponent(i, j) * 16); for (let e = 0; e < 16; e++) _m4.elements[e] += _bm.elements[e] * w; }
    _m4.premultiply(sm.bindMatrixInverse).multiply(sm.bindMatrix);
    _sv.fromBufferAttribute(P, i).applyMatrix4(_m4); op.setXYZ(i, _sv.x, _sv.y, _sv.z);
    if (N) { _m3.setFromMatrix4(_m4); _sn.fromBufferAttribute(N, i).applyMatrix3(_m3).normalize(); on.setXYZ(i, _sn.x, _sn.y, _sn.z); }
  }
  op.needsUpdate = true; if (on) on.needsUpdate = true; out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
function setLive(c, on) {
  if (c.live === on) return; c.live = on; const u = c.g.userData;
  if (!c.skins) { c.skins = []; u.root.traverse((o) => { if (o.isSkinnedMesh) c.skins.push(o); }); }
  if (!c.skins.length) { c.live = true; return; }
  for (const sm of c.skins) {
    if (!on) { u.root.updateMatrixWorld(true);
      if (!sm.userData.baked) { const m = new THREE.Mesh(bakeSkinned(sm), sm.material); m.name = sm.name + '_baked'; m.castShadow = sm.castShadow; m.userData.finK = sm.userData.finK; m.userData.noCull = true;  /* perf.js leaves it alone; render() lends it the rig's own LOD index */ sm.parent.add(m); sm.userData.baked = m; own.push(m.geometry); }
      else bakeSkinned(sm, sm.userData.baked.userData.full || sm.userData.baked.geometry);
      const m = sm.userData.baked; m.position.copy(sm.position); m.quaternion.copy(sm.quaternion); m.scale.copy(sm.scale); m.visible = true; sm.visible = false; }
    else { sm.visible = true; if (sm.userData.baked) sm.userData.baked.visible = false; }
  }
}
function liveWanted(s, t, cut) {   // the speaker first, then whoever is on the couch nearest the lens
  const want = []; const push = (k) => { if (s.crew[k] && !want.includes(k) && want.length < MAX_RIGS) want.push(k); };
  if (cut && cut[2] !== 'wide') push(cut[2]);
  const li = LINES.findIndex((l) => t >= l[0] && t < l[0] + 3.3); if (li >= 0) push(LINES[li][1].toLowerCase());
  const cp = cam.position; ['wolf', 'moth', 'bear'].sort((a, b) => (s.crew[a]?.g.position.distanceToSquared(cp) || 0) - (s.crew[b]?.g.position.distanceToSquared(cp) || 0)).forEach(push);
  return want;
}

function build(MODELS) {
  const S = window.__sunspots, F = S.fin; own = []; scene = S.scene; cam = S.camera;
  const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, ...o }); own.push(m); return m; };
  const set = new THREE.Group(); set.name = 'finale_set'; scene.add(set);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, p = set) => { own.push(geo); const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = !LOWQ(); o.receiveShadow = true; p.add(o); return o; };
  // the overworld as it stands, minus the player's own Wolf (he is on the couch) and the frozen traffic / errand markers
  const hid = []; const hide = (o) => { if (o && o.visible) { o.visible = false; hid.push(o); } };
  hide(F.wolf); hide(scene.getObjectByName('snackrun'));   // the snack run's mission props and its night overlay are not part of the town
  // the living town stays (its cab stand, flyer posts, signs); only its walking/driving cast steps out, since their sim is paused and the finale has its own cast
  for (const o of scene.getObjectByName('livingworld')?.children || []) { let n = 0; o.traverse((m) => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); if (n >= 110) hide(o); }
  // Moth's couch, carried out into the middle of Sun St (felt, no brands)
  const couch = new THREE.Group(); couch.position.copy(O); set.add(couch);
  const cm = M('#b8443a'), cc = M('#d06a52');
  mesh(new THREE.BoxGeometry(4.6, 0.32, 0.92), cm, 0, 0.16, 0.06, couch); mesh(new THREE.BoxGeometry(4.0, 0.14, 0.66), cc, 0, 0.39, -0.06, couch);   // seat: cushion top 0.46, front edge z -0.39
  mesh(new THREE.BoxGeometry(4.6, 1.0, 0.3), cm, 0, 0.6, 0.42, couch); for (const x of [-1.34, 0, 1.34]) { const bc = mesh(new THREE.BoxGeometry(1.28, 0.52, 0.16), cc, x, 0.72, 0.21, couch); bc.rotation.x = -0.12; }   // back + three back cushions
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.34, 0.68, 0.92), cm, sx * 2.17, 0.34, 0.06, couch);

  // the crew: the game's own models (the same lo GLBs + Sunspots felt look the town and missions use; the Wolf is the
  // player's own wolf_armsdown_felt.glb). Wolf + Moth + Bear on the couch, everyone else around it, all facing the sun (-z).
  const crew = {}; const put = (k, x, z, ry = 0, sit = false) => { const g = MODELS[k]; if (!g) return; if (LOWQ() && EXTRAS.includes(k)) return; g.position.set(O.x + x, 0, O.z + z); g.rotation.y = Math.PI + ry; set.add(g); crew[k] = rig(k, g, sit); };
  put('bear', -1.36, 0, 0.1, true); put('wolf', 0.0, 0, 0, true); put('moth', 1.36, 0, -0.08, true);   // on the couch (hips at the front of the cushion, feet on the ground)
  put('lynx', 0.62, 1.2, 0.08); put('ram', -2.3, 1.1, -0.3); put('heron', 2.25, 1.15, 0.22);   // leaning on the back of it
  put('gecko', -1.9, 1.2, -0.15); put('anteater', -3.1, 0.8, -0.45);
  put('squid', 2.65, -1.05, 0.55); put('crow', 3.2, -0.1, 0.6);
  if (Q.get('finale') === 'lineup') { const order = ['wolf', 'moth', 'bear', 'ram', 'heron', 'crow', 'lynx', 'gecko', 'anteater', 'squid']; order.forEach((k, i) => { const c = crew[k]; if (c) { c.g.position.set(O.x + (i - 4.5) * 1.3, 0, O.z + 4); c.g.rotation.y = 0; c.sit = false; c.g.userData.inner.position.y = 0; } }); }
  for (const c of Object.values(crew)) setLive(c, true);
  const cam0 = { fov: cam.fov, near: cam.near, pos: cam.position.clone(), q: cam.quaternion.clone() };
  for (const k in crew) crew[k].g.traverse((o) => { o.userData.finK = k; });   // for the LOD pass in render()
  return { F, set, hid, cam0, crew, scene };
}

// ------------------------------------------------------------------ the script
const LINES = [   // [t, who, line]
  [3.0, 'MOTH', "Ma switched her porch light off this morning. First time since '79."],
  [7.4, 'BEAR', 'Eye-Max premiere. Front row.'],
  [10.6, 'WOLF', 'Same old town. Best one there is.'],
  [14.6, 'HERON', 'Is the sun... looking at us?'],
  [17.8, 'RAM', 'It does that. Be polite. Wave.'],
  [21.4, 'SQUID', 'So where do you go now, Moth?'],
];
const D = { scene: 26, title: 6.5, roll: 52 };
// Film coverage: on a spoken line, a hard cut to a medium close-up of the speaker (waist-up, face 3/4 to camera, a sliver of the
// neighbour, the dawn sky + porch-lamp glow behind). [from, to, who, side]  side: +1 = camera on the speaker's world -x side.
// 'wide' = the high establishing wide (portrait). Anything not listed falls back to the SHOT keys.
const CUTS = { land: [[3.0, 7.0, 'moth', 1.0, 0, -1], [10.6, 14.0, 'wolf', 1, 0, 1]], port: [[3.0, 7.0, 'moth', 1.0], [7.0, 8.7, 'wide'], [8.7, 10.6, 'bear', 0.6], [10.6, 14.0, 'wolf', 1], [21.2, 24.8, 'squid', 1], [24.8, 26.0, 'wide']] };   // [from, to, who, lens angle off his nose (sign = side), extra headroom, landscape: which side of frame he sits, zoom out (horns)]
const cutAt = (t, portrait) => (portrait ? CUTS.port : CUTS.land).find((c) => t >= c[0] && t < c[1]) || null;
const _h = new THREE.Vector3();
const _he = new THREE.Vector3();
function headPos(c, out) {   // the middle of the face: halfway from the Head bone to the top of the skull
  const u = c.g.userData, B = u.bones || {};
  if (B.Head) { B.Head.getWorldPosition(out); if (B.head_end) { B.head_end.getWorldPosition(_he); out.lerp(_he, 0.5); } return out; }
  return out.copy(c.g.position).setY(c.g.position.y + u.h * 0.85);
}
function coverCam(cut, t, out, look, portrait) {
  const s = st, who = cut[2];
  if (who === 'wide') { out.set(O.x, 0.85, O.z - 9.8); look.set(O.x + 0.05, 3.55, O.z); cam.fov = 66; return; }   // portrait establishing: low and back, the couch along the bottom, the dawn sky filling the rest
  const c = s.crew[who]; if (!c) return false; headPos(c, _h); c.g.updateMatrixWorld(true);
  const h = c.g.userData.h || 1.7, push = (t - cut[0]) / Math.max(0.5, cut[1] - cut[0]);
  const fov = portrait ? 40 : 30, viewH = h * (portrait ? 0.82 : 0.6) * (cut[6] || 1) * (1 - 0.05 * push);   // waist-up; a slow push-in over the line
  const d = viewH / (2 * Math.tan(fov * Math.PI / 360)), a = c.g.rotation.y + cut[3] * 0.72;   // ~40 degrees off his nose: 3/4
  out.set(_h.x + Math.sin(a) * d, _h.y - 0.06 * h, _h.z + Math.cos(a) * d);
  const off = portrait ? 0 : viewH * 0.32 * (cut[5] ?? -Math.sign(cut[3]));   // landscape: speaker off-centre, looking into the open side, the neighbour sliver behind
  const lx = Math.cos(a) * off, lz = -Math.sin(a) * off;
  look.set(_h.x + lx, _h.y - viewH * ((portrait ? 0.17 : 0.13) - (cut[4] || 0)), _h.z + lz); cam.fov = fov; c.cover = { x: out.x, z: out.z }; c.side = -cut[3];
  return true;
}
const SHOT = [   // camera keys around the couch (O): [t, camPos, lookAt, lookAt in portrait (optional), camPos in portrait (optional)]
  [0, [4.0, 3.4, 3.2], [-5.1, 1.5, -40], [1.0, 2.5, -40], [3.8, 3.6, 4.6]],     // behind the crew, off the statue's east flank: Main St, the DMV, the sun still under the roofline
  [7, [3.3, 2.7, 2.0], [-5.1, 1.8, -40], [1.0, 2.8, -40], [3.4, 3.0, 3.4]],
  [7.01, [-1.7, 1.2, -4.9], [0.15, 1.0, -0.3], [-0.3, 0.2, 0], [-0.2, 3.7, -7.9]],      // the crew from the front, low 3/4, the statue and its plaque behind them
  [14, [-1.0, 1.15, -4.4], [0.25, 1.0, -0.3], [-0.25, 0.2, 0], [0.0, 3.6, -7.6]],
  [14.01, [-0.4, 2.2, 4.4], [-0.4, -0.8, -30], [0.15, -2.4, -30], [0.0, 2.7, 4.4], 80, 52],     // THE sunrise: low behind the couch (between it and the plinth), past their backs and heads to the eye sun over the DMV
  [20, [-0.4, 2.15, 4.1], [-0.4, -0.6, -30], [0.15, -2.2, -30], [0.0, 2.6, 4.1], 80, 52],
  [20.01, [2.4, 1.3, -5.8], [0.1, 1.05, -0.3], [0.2, 0.8, 0], [1.6, 2.4, -7.2]],
  [26, [3.3, 1.8, -7.2], [0.1, 1.1, -0.3], [0.2, 0.85, 0], [2.3, 2.8, -8.2]],
  [26.01, [1.4, 2.6, -6.3], [-14.6, 16, -60], [-4.6, 20, -60], [2.2, 2.6, -7.3]],     // title: Main St's roofline along the bottom, clear sky for the words, the sun low and to the right
  [33, [0.4, 3.4, -8.3], [-15.6, 18, -70], [-5.6, 22, -70], [1.5, 3.4, -9.3]],
  [40, [2, 6, -6], [60, 10, -50], [60, 12, -50], [2, 6.5, -6]],     // the roll: along Main St to the east, the sun off to the left, sky behind the names
  [200, [-4, 8, -9], [66, 11, -60], [66, 13, -60], [-4, 8.5, -9]],
];
let shotFov = 0;
function camAt(t, out, look, portrait) {
  let i = 0; while (i < SHOT.length - 2 && SHOT[i + 1][0] <= t) i++;
  const a = SHOT[i], b = SHOT[i + 1], k = ease((t - a[0]) / Math.max(0.001, b[0] - a[0]));
  const own = portrait && a[4] && b[4], pa = own ? a[4] : a[1], pb = own ? b[4] : b[1];
  out.set(lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k), lerp(pa[2], pb[2], k));
  const la = portrait && a[3] || a[2], lb = portrait && b[3] || b[2];
  look.set(lerp(la[0], lb[0], k), lerp(la[1], lb[1], k), lerp(la[2], lb[2], k));
  shotFov = (portrait ? a[5] && b[5] && a[5] : a[6] && b[6] && a[6]) || 0;   // a shot can ask for a wider portrait lens
  if (portrait && !own) { const back = out.clone().sub(look).normalize(); out.addScaledVector(back, 1.8 + 0.06 * out.distanceTo(look) * 0); out.y += 0.3; }
  out.x += O.x; out.z += O.z; look.x += O.x; look.z += O.z;   // keys are written around the couch
}

export async function playFinale({ from = 0 } = {}) {
  if (playing) return; playing = true;
  const R = window.__sunspots?.renderer; if (!R) { playing = false; return; }
  let MODELS; try { if (!kitLoaded) { ({ blobShadow } = await import('./missions/kit.js')); kitLoaded = true; } MODELS = await loadCrew(); } catch (e) { console.warn('finale: kit', e); playing = false; return; }
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
const DAYFOG = [45, 330], _ss = new THREE.Vector3(), _ts = new THREE.Vector3(), _sd = new THREE.Vector3(), CG = new THREE.Color();
let irisX = 0, irisY = 0;
function render(dt, tally) {
  const s = st, t = Math.min(s.t, 400), portrait = innerHeight > innerWidth, F = s.F;
  // sunrise: the town's own night palette turns into its own daylight palette (cobalt sky, coral ground, mustard sun)
  const k = ease((t - 2) / 19), P = F.PAL, Dp = F.PAL_DAY, NK = F.NK;
  scene.background.lerpColors(P.sky[0], Dp.sky[0], k);
  scene.fog.color.lerpColors(P.fog[0], Dp.fog[0], k); scene.fog.near = lerp(F.FOG[0], DAYFOG[0], k); scene.fog.far = lerp(F.FOG[1], DAYFOG[1], k);
  F.groundMat.color.lerpColors(P.ground[0], Dp.ground[0], k);
  F.hemi.color.lerpColors(P.hemiSky[0], Dp.hemiSky[0], k); F.hemi.groundColor.copy(F.groundMat.color).lerp(CG.set('#e6e2da'), 0.8); F.hemi.intensity = 1.55 * lerp(NK.hemi, 1, k);
  F.key.color.lerpColors(P.key[0], Dp.key[0], k); F.key.intensity = 2.3 * lerp(NK.key, 1, k); F.fill.intensity = 3.2 * lerp(NK.fill, 1, k);
  F.key.position.copy(O).add(F.KEY_OFFSET); F.key.target.position.copy(O); F.key.target.updateMatrixWorld();
  F.discMat.color.lerpColors(P.sun[0], Dp.sun[0], k); F.lidMat.color.copy(F.discMat.color).multiplyScalar(0.9);
  // the camera: a cut to the speaker, or the keyed shots
  for (const c of Object.values(s.crew)) c.cover = null;
  const cut = !tally && cutAt(t, portrait); cam.fov = portrait ? 66 : 48;
  if (!(cut && coverCam(cut, t, V, L, portrait) !== false)) { camAt(t, V, L, portrait); cam.fov = shotFov || (portrait ? 66 : 48); }
  if (Q.get('finale') === 'lineup') { V.set(O.x, 1.0, O.z + 15); L.set(O.x, 0.95, O.z + 4); cam.fov = 30; }   // QA: refcheck lineup
  cam.aspect = innerWidth / innerHeight; cam.near = 0.1; cam.position.copy(V); cam.lookAt(L); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  // the eye sun itself (main.js placeSun, with the elevation rising out of the north end of Sun St); its lid opens on the Heron's line
  const land = cam.aspect > 1, e = lerp(-0.07, land ? 0.165 : 0.25, ease((t - 1) / 19));
  _sd.set(0, e, -1).normalize(); F.sun.position.copy(cam.position).addScaledVector(_sd, F.SUN_DIST); F.sun.quaternion.copy(cam.quaternion); F.sun.scale.setScalar(land ? F.SUN_R * 1.08 : F.SUN_R);
  const open = ease((t - 12.5) / 1.6), blink = (t > 18 && ((t * 0.7) % 4.3) < 0.14) ? 0.85 : 0; F.updateLid(Math.max(1 - open, blink));
  _ss.copy(F.sun.position).project(cam); _ts.set(O.x, 1.2, O.z).project(cam);   // the pupil finds the couch (main.js tracks the Wolf the same way)
  let dx = (_ts.x - _ss.x) * cam.aspect, dy = _ts.y - _ss.y; if (_ts.z > 1) { dx = -dx; dy = -Math.abs(dy); }
  const l = Math.hypot(dx, dy) || 1, reach = clamp(l / 0.9, 0, 1); irisX = lerp(irisX, dx / l * reach * 0.25, 1 - Math.exp(-dt * 6)); irisY = lerp(irisY, dy / l * reach * 0.075, 1 - Math.exp(-dt * 6));
  F.iris.position.set(irisX, F.EY + irisY, 0);
  // the crew: everyone waves at the sun on Ram's line, everyone cheers at the title; at most MAX_RIGS animate, the rest hold a baked pose
  const want = liveWanted(s, t, cut); for (const [kk, c] of Object.entries(s.crew)) setLive(c, want.includes(kk));
  animCrew(s, dt, t, tally);
  // the town's own per-frame upkeep (LOD swaps, distance culling, quality tier), then the overworld render
  try { F.TS?.update(cam); } catch (_) {} try { window.__perf?.update(); } catch (_) {}
  // room budget (<60k tris): perf.js's own LODs (shared with the overworld, built in its worker) for everyone but the face in
  // the current close-up; wides at 4-12 m read the same at L1 (~28%)
  try { const focus = cut && cut[2] !== 'wide' ? cut[2] : null;
    for (const it of window.__perf?.items || []) { const k = it.m.userData.finK; if (!k || !it.lod) continue; const near = k === focus, want = near ? it.g0 : it.lod; if (it.m.geometry !== want) it.m.geometry = want;
      const b = it.m.userData.baked; if (!b) continue; const u = b.userData;   // the baked pose has the rig's vertex order, so the rig's L1 index fits it
      if (!u.lod) { u.full = b.geometry; u.lod = new THREE.BufferGeometry(); for (const a in u.full.attributes) u.lod.setAttribute(a, u.full.attributes[a]); u.lod.setIndex(it.lod.index); u.lod.boundingSphere = u.full.boundingSphere; u.lod.boundingBox = u.full.boundingBox; }
      const w = near ? u.full : u.lod; if (b.geometry !== w) b.geometry = w; } } catch (_) {}
  s.R.setRenderTarget(null); s.R.render(scene, cam);
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
    <p>${left ? `${pct}% complete. ${left} Sunspot${left > 1 ? 's are' : ' is'} still out there. The town keeps going: the JOURNAL has rumours.` : 'You know this town now. It knows you back.'}</p>`,
    [['KEEP PLAYING', () => end('roam')], ['MAIN MENU', () => end('menu')]]);
}
function end(how, standalone = false) {
  const P = loadP(); if (how === 'roam' && !standalone) { P.postgame = 1; saveP(P); }
  try { window.__town?.M?.save?.(); } catch (_) {}
  window.__saveguard?.mirror?.();
  if (how === 'menu') { location.href = location.pathname + (location.search.includes('nosw') ? '?nosw' : ''); return; }
  cancelAnimationFrame(raf);
  if (st) { removeEventListener('resize', st.resize); st.cleanupIn(); st.canvas.style.zIndex = st.oldZ; try { st.R.toneMappingExposure = st.toneExp; } catch (_) {}
    try { const F = st.F, c0 = st.cam0; st.set.removeFromParent(); for (const o of st.hid) o.visible = true;   // hand the overworld back exactly as it was (main.js re-lerps its palette every frame)
      cam.fov = c0.fov; cam.near = c0.near; cam.position.copy(c0.pos); cam.quaternion.copy(c0.q); cam.updateProjectionMatrix(); scene.fog.near = F.FOG[0]; scene.fog.far = F.FOG[1]; F.updateLid(0); } catch (e) { console.warn('finale: restore', e); }
    for (const o of own) try { o.dispose?.(); } catch (_) {} own = []; scene = null; st = null;
    try { window.__audio?.finale?.(false); } catch (_) {} }
  root?.remove(); root = null; playing = false; window.__paused = false; document.body.classList.remove('finale');
  window.__finale = null;
  // (no toast here: the tally card already said what's left, and the town's own SUNSPOT FOUND toast is on screen)
}

export const finaleCredits = { CREATOR_NAME, STUDIO };
// QA: ?finale (whole ending) / ?finale=credits (start at the roll) / ?finale=tally
if (Q.has('finale')) { const go = () => { if (window.__ready && !window.__titleUp && window.__journal && window.__sunspots?.renderer) { const v = Q.get('finale'); playFinale({ from: v === 'credits' ? D.scene + D.title : 0 }).then(() => { if (v === 'tally') setTimeout(toTally, 400); }); } else setTimeout(go, 400); }; setTimeout(go, 1500); }
