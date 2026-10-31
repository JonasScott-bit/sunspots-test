// Sunspots v9 launch sequence:  EES company intro (silent video)  ->  trippy title menu  ->  fuzzy melt into the game.
//
//  * Intro: ./intro/ees_intro.mp4 (H.264, faststart) / .webm (VP9), muted + autoplay + playsinline, object-fit: contain
//    on black so the logo is never cropped. A tap skips it (and that tap unlocks Web Audio). If autoplay is refused the
//    first-frame poster shows with a TAP hint and the first tap plays it. Stalls / missing video fall through to the menu.
//  * Menu: Scott's art (portrait / landscape, picked by orientation, swapped live on rotate), cover-fit around a focal
//    point, drawn by a three.js fullscreen-quad shader: breathing liquid warp, hue waves, chromatic shimmer, vertical
//    parallax sway, masked cloud drift (title/flow_*.png: R = cloud weight, G = sky), a beat pulse (Mind Meld, 161.3 BPM),
//    and in landscape the eye-sun looks around + blinks (masked warp). Felt buttons: PLAY / SETTINGS / CREDITS.
//  * PLAY: the game starts rendering underneath and the menu melts off in felt drips (same shader, uMelt 0..1).
//  * Mind Meld (audio.js) waits for the menu (window.__introUp) and starts once audio is unlocked by any tap.
//
// Flags: ?intro=0 skip the intro · ?menu=0 boot straight into the game · ?shot (no title unless &title)
// QA: ?tt=<s> freeze shader time · ?melt=<0..1> freeze the melt · ?panel=settings|credits · ?introt=<s> freeze the intro
import * as THREE from 'three';
import './audio.js';   // evaluate the audio graph first so window.__audio (mode, volumes) exists for the menu

const Q = new URLSearchParams(location.search);
const ON = (!Q.has('shot') || Q.has('title')) && Q.get('menu') !== '0';
const INTRO = ON && Q.get('intro') !== '0';
const root = document.getElementById('titleScr');
window.__titleUp = ON;
window.__introUp = INTRO;
const state = window.__titleState = { p: 0, ready: false, phase: 'boot', fps: 0 };
const BPM = 161.3, BEAT = 60 / BPM;
const ART = {
  p: { src: './title/menu_portrait.jpg', flow: './title/flow_portrait.png', w: 1200, h: 2142, focal: [0.62, 0.55] },
  l: { src: './title/menu_landscape.jpg', flow: './title/flow_landscape.png', w: 1500, h: 1000, focal: [0.5, 0.46] },
};


function boot() {
  document.getElementById('load')?.style.setProperty('display', 'none');
  const bar = root.querySelector('.playfill');
  window.__title = {
    progress(f) { state.p = Math.max(0, Math.min(1, f)); if (bar) bar.style.width = (state.p * 100) + '%'; },
    ready() { state.ready = true; root.classList.add('ready'); if (state.wantPlay) startMelt(); },
  };
  stopGameInput(root);
  menuInit();
  if (INTRO) intro(); else { document.getElementById('intro')?.remove(); showMenu(true); }
}

// keep taps on the title from reaching the game (audio.js unlocks on window capture, so that still fires)
function stopGameInput(el) { for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'click']) el.addEventListener(ev, e => e.stopPropagation()); }

// ================================================================== 1. EES intro
function intro() {
  state.phase = 'intro'; document.body.classList.add('intro');
  const box = document.getElementById('intro'); stopGameInput(box);
  const v = box.querySelector('video'), hint = box.querySelector('.ihint');
  v.muted = true; v.defaultMuted = true; v.playsInline = true;
  let done = false, started = false, blocked = false, watchdog = 0, askedSound = false;
  const au = () => window.__audio;
  const finish = (why) => {
    if (done) return; done = true; clearTimeout(watchdog); state.introEnd = why;
    window.__introUp = false; showMenu(false);
    if (why !== 'ended') au()?.stopIntro?.(0.45);
    au()?.kick?.();   // Mind Meld can start now
    box.classList.add('out'); document.body.classList.remove('intro');
    setTimeout(() => { try { v.pause(); v.removeAttribute('src'); while (v.firstChild) v.firstChild.remove(); v.load(); } catch (_) {} box.remove(); }, 700);
  };
  const arm = (ms, why) => { clearTimeout(watchdog); watchdog = setTimeout(() => finish(why), ms); };
  const play = () => { const p = v.play(); return p && p.then ? p : Promise.resolve(); };
  if (Q.has('introt')) {   // QA freeze
    v.addEventListener('loadeddata', () => { v.currentTime = +Q.get('introt') || 0; v.pause(); }, { once: true });
    v.load(); return;
  }
  // 'Ethereal Arrival' sting rides along with the video. It needs a running AudioContext: if the browser already allows it
  // (rare on a cold load) it starts with the video; otherwise the FIRST tap unlocks audio and joins the sting at the video's
  // current time ('TAP FOR SOUND'), and the next tap skips. If music is off (sound mode Off / SFX) the first tap just skips.
  let sting = false;
  const tryStart = () => { if (!done && !sting && !v.paused && au()?.startIntro?.(v.currentTime)) { sting = true; setHint(); } return sting; };
  const setHint = () => { hint.textContent = (!sting && au()?.musicAudible?.() && !au()?.running?.()) ? 'TAP FOR SOUND \u00b7 TAP AGAIN TO SKIP' : 'TAP TO SKIP'; };
  const onPlaying = () => { started = true; blocked = false; box.classList.remove('blocked'); arm(((v.duration || 8.6) - v.currentTime) * 1000 + 2500, 'watchdog'); tryStart(); setHint();
    const iv = setInterval(() => { if (done || sting || v.currentTime > (v.duration || 8.6) - 1) clearInterval(iv); else if (au()?.running?.()) tryStart(); }, 200); };
  v.addEventListener('playing', onPlaying);
  v.addEventListener('ended', () => finish('ended'));
  v.addEventListener('error', () => finish('error'));
  v.querySelector('source:last-of-type')?.addEventListener('error', () => finish('source error'));
  if (!v.canPlayType('video/mp4; codecs="avc1.640028"') && !v.canPlayType('video/webm; codecs="vp9"')) { finish('no codec'); return; }
  if (!v.paused && v.currentTime > 0) onPlaying();
  play().catch(() => { if (!started) { blocked = true; box.classList.add('blocked'); clearTimeout(watchdog); } });
  arm(6000, 'stall');   // never sit on black: no 'playing' within 6 s -> menu
  setHint(); setTimeout(() => hint.classList.add('show'), 900);
  box.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (blocked && !started) { blocked = false; box.classList.remove('blocked'); play().catch(() => finish('refused')); arm(6000, 'stall');
      au()?.whenRunning?.().then(() => setTimeout(tryStart, 60)).catch(() => {}); return; }
    const A = au();
    if (!sting && !askedSound && A?.musicAudible?.() && !v.paused && v.currentTime < (v.duration || 8.6) - 1.5) {
      askedSound = true;   // first tap = sound on, joined in sync; next tap skips
      A.whenRunning().then(() => { if (!done) { tryStart(); setHint(); } }).catch(() => finish('skip'));
      return;
    }
    finish('skip');
  });
  addEventListener('keydown', (e) => { if (!done && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) finish('skip'); });
}

// ================================================================== 2. menu (three.js fullscreen quad)
let R = null;   // renderer bits
function menuInit() {
  const canvas = root.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') }); }
  catch (e) { console.warn('[title] no WebGL, static menu', e); root.classList.add('static'); R = null; return; }
  renderer.setClearColor(0x000000, 0);
  const loader = new THREE.TextureLoader();
  const tex = {}, uni = {
    uTex: { value: null }, uFlow: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uVis: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uLand: { value: 0 }, uMelt: { value: 0 },
    uPulse: { value: 0 }, uLook: { value: new THREE.Vector2() }, uBlink: { value: 0 }, uFade: { value: 0 }, uAspect: { value: 1 },
  };
  const loadArt = (k) => tex[k] || (tex[k] = Promise.all([ART[k].src, ART[k].flow].map(u => new Promise((res, rej) => loader.load(u, t => {
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; res(t); }, undefined, rej)))));
  const mat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  R = { renderer, scene, cam, mat, uni, loadArt, cur: null, raf: 0, running: false, t0: performance.now(), dpr: Math.min(devicePixelRatio || 1, 2), ft: 16.7, last: 0 };
  // preload both orientations during the intro (the other one is small enough to keep for live rotation)
  const k0 = orient(); loadArt(k0).catch(e => console.warn('[title] art', e)); setTimeout(() => loadArt(k0 === 'p' ? 'l' : 'p').catch(() => {}), 1500);
  addEventListener('resize', layout); layout();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else if (state.phase === 'menu' || state.phase === 'melt') startLoop(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stopLoop(); root.classList.add('static'); });
}
const orient = () => (innerWidth >= innerHeight ? 'l' : 'p');

function layout() {
  const k = orient(); root.classList.toggle('land', k === 'l'); root.classList.toggle('port', k === 'p');
  const A = ART[k], W = innerWidth, H = innerHeight;
  // static fallback / pre-shader frame: CSS cover with the same focal point
  const s0 = Math.max(W / A.w, H / A.h), vx = W / (A.w * s0), vy = H / (A.h * s0);
  const cx = Math.min(1 - vx / 2, Math.max(vx / 2, A.focal[0])), cy = Math.min(1 - vy / 2, Math.max(vy / 2, A.focal[1]));
  const px = vx < 1 ? (cx - vx / 2) / (1 - vx) * 100 : 50, py = vy < 1 ? (cy - vy / 2) / (1 - vy) * 100 : 50;
  root.style.backgroundImage = `url(${A.src})`; root.style.backgroundPosition = `${px.toFixed(1)}% ${py.toFixed(1)}%`;
  if (!R) return;
  R.renderer.setPixelRatio(R.dpr); R.renderer.setSize(W, H, false);
  R.uni.uRes.value.set(W, H); R.uni.uLand.value = k === 'l' ? 1 : 0;
  // cover-fit with a 5% overscan so the warp never shows an edge; focal point kept as central as the crop allows
  const z = 1.06, s = s0 * z, VX = W / (A.w * s), VY = H / (A.h * s);
  R.uni.uVis.value.set(VX, VY);
  R.uni.uC.value.set(Math.min(1 - VX / 2, Math.max(VX / 2, A.focal[0])), Math.min(1 - VY / 2, Math.max(VY / 2, A.focal[1])));
  R.uni.uAspect.value = A.w / A.h;
  if (R.cur !== k) {
    R.cur = k;
    R.loadArt(k).then(([t, f]) => { if (R.cur !== k) return; R.uni.uTex.value = t; R.uni.uFlow.value = f; root.classList.add('gl'); }).catch(() => root.classList.add('static'));
  }
}

function startLoop() { if (!R || R.running || document.hidden) return; R.running = true; R.last = performance.now(); R.raf = requestAnimationFrame(loop); }
function stopLoop() { if (!R) return; R.running = false; cancelAnimationFrame(R.raf); }

// eye-sun: slow saccades + heavy blinks (landscape only)
const eye = { x: 0, tx: 0, nextLook: 1.5, blinkT: -1, nextBlink: 3.5 };
function eyeUpdate(t, dt) {
  if (t > eye.nextLook) { eye.tx = [-1, -0.6, 0, 0.5, 1][Math.floor(Math.random() * 5)]; eye.nextLook = t + 1.6 + Math.random() * 2.8; }
  eye.x += (eye.tx - eye.x) * (1 - Math.exp(-dt * 5));
  let b = 0;
  if (eye.blinkT < 0 && t > eye.nextBlink) { eye.blinkT = 0; eye.nextBlink = t + 3 + Math.random() * 5; }
  if (eye.blinkT >= 0) {
    eye.blinkT += dt; const k = eye.blinkT;
    b = k < 0.3 ? smooth(k / 0.3) : k < 0.42 ? 1 : k < 0.9 ? 1 - smooth((k - 0.42) / 0.48) : (eye.blinkT = -1, 0);
  }
  return b;
}
const smooth = (x) => x * x * (3 - 2 * x);

function loop(now) {
  if (!R.running) return;
  R.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - R.last) / 1000); R.last = now;
  // adaptive DPR (cap 2): step down if frames run long, back up when there's headroom
  R.ft += (dt * 1000 - R.ft) * 0.05; state.fps = Math.round(1000 / R.ft);
  if (!Q.has('shot') && (R.hold = (R.hold || 0) - 1) < 0) {
    const max = Math.min(devicePixelRatio || 1, 2);
    if (R.ft > 19 && R.dpr > 1) { R.dpr = Math.max(1, R.dpr - 0.25); layout(); R.hold = 90; }
    else if (R.ft < 14 && R.dpr < max) { R.dpr = Math.min(max, R.dpr + 0.25); layout(); R.hold = 90; }
  }
  const t = Q.has('tt') ? +Q.get('tt') : (now - R.t0) / 1000;
  const u = R.uni; u.uTime.value = t;
  // beat pulse locked to the music clock when Mind Meld is playing, else free-running at the same tempo
  const au = window.__audio, src = au && au.titleSrc;
  const bt = src && au.ctx && au.titleT0 != null ? au.ctx.currentTime - au.titleT0 : t;
  const ph = (bt / (BEAT * 2)) % 1; u.uPulse.value = Math.pow(1 - ph, 3);
  if (u.uLand.value) { u.uBlink.value = eyeUpdate(t, dt); u.uLook.value.set(eye.x, 0); }
  u.uFade.value = Math.min(1, u.uFade.value + dt / 0.9);
  if (state.phase === 'melt') {
    if (Q.has('melt')) u.uMelt.value = +Q.get('melt');
    else { state.meltT += dt; u.uMelt.value = Math.min(1, state.meltT / 1.7); if (state.meltT > 1.85) return endTitle(); }
  }
  if (!u.uTex.value) return;
  R.renderer.render(R.scene, R.cam);
}

function showMenu(instant) {
  state.phase = 'menu'; root.classList.add('on'); if (instant && R) R.uni.uFade.value = 1;
  window.__introUp = false; window.__audio?.kick?.();
  startLoop();
  if (Q.get('panel')) setTimeout(() => openPanel(Q.get('panel')), 50);
  if (Q.has('melt')) setTimeout(() => { state.wantPlay = true; startMelt(true); }, 300);
  syncSoundHint();
}
function syncSoundHint() {
  const h = root.querySelector('.snd'); if (!h) return;
  const run = !!window.__audio?.running?.(); h.classList.toggle('show', !run && state.phase === 'menu' && !window.__audio?.muted);
  if (!run && state.phase === 'menu') setTimeout(syncSoundHint, 400);
}
root.addEventListener('pointerup', () => { setTimeout(syncSoundHint, 60); window.__audio?.kick?.(); });

// ---------------------------------------------------------------- buttons + panels
const sfx = (n = 'sfx_ui_confirm', g = 1) => { try { window.__audio?.play?.(n, { bus: 'ui', gain: g }); } catch (_) {} };
function openPanel(which) {
  for (const p of root.querySelectorAll('.panel')) p.classList.toggle('open', p.dataset.p === which);
  root.classList.toggle('paneled', !!which);
  if (which === 'credits') { const r = root.querySelector('.roll'); r.style.animation = 'none'; void r.offsetWidth; r.style.animation = ''; }
}
// v9 sound mode segmented control (Off / SFX / Music / All), kept in step with the HUD button via __audio.onMode
const modeBtns = [...root.querySelectorAll('.modes button')];
const syncModes = (m) => { for (const b of modeBtns) { const on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.setAttribute('role', 'radio'); } syncSoundHint(); };
for (const b of modeBtns) b.addEventListener('click', () => { window.__audio?.setMode?.(b.dataset.m); if (b.dataset.m !== 'off') sfx('sfx_ui_tick'); });
if (window.__audio?.onMode) window.__audio.onMode(syncModes); else syncModes('all');
root.querySelector('.bPlay')?.addEventListener('click', () => { sfx(); state.wantPlay = true; if (state.ready) startMelt(); else root.classList.add('waiting'); });
root.querySelector('.bSet')?.addEventListener('click', () => { sfx('sfx_ui_tick'); openPanel('settings'); });
root.querySelector('.bCred')?.addEventListener('click', () => { sfx('sfx_ui_tick'); openPanel('credits'); });
for (const b of root.querySelectorAll('.bBack')) b.addEventListener('click', () => { sfx('sfx_ui_tick'); openPanel(null); });
{
  const mv = root.querySelector('#volMusic'), sv = root.querySelector('#volSfx'), A0 = (() => { try { return JSON.parse(localStorage.getItem('sunspots.audio')) || {}; } catch (_) { return {}; } })();
  const out = (el) => { el.nextElementSibling.textContent = Math.round(el.value) + '%'; el.style.setProperty('--v', el.value + '%'); };
  if (mv && sv) {
    mv.value = Number.isFinite(A0.musicVol) ? A0.musicVol * 100 : 100; sv.value = Number.isFinite(A0.sfxVol) ? A0.sfxVol * 100 : 100; out(mv); out(sv);
    mv.addEventListener('input', () => { out(mv); window.__audio?.setVolumes?.({ music: mv.value / 100 }); });
    sv.addEventListener('input', () => { out(sv); window.__audio?.setVolumes?.({ sfx: sv.value / 100 }); });
    sv.addEventListener('change', () => sfx());
  }
}

// ================================================================== 3. PLAY -> fuzzy melt -> game
function startMelt(qa) {
  if (state.phase === 'melt' || (!state.ready && !qa)) return;
  state.phase = 'melt'; state.meltT = 0; openPanel(null);
  root.classList.add('melting'); root.classList.remove('waiting');
  if (!qa) window.__titleUp = false;   // the game starts rendering underneath; Mind Meld hands over to the town (audio.js)
  if (!R || root.classList.contains('static')) { root.style.transition = 'opacity .8s'; root.style.opacity = 0; setTimeout(endTitle, 850); return; }
  startLoop();
}
function endTitle() {
  if (state.phase === 'gone') return; state.phase = 'gone'; window.__titleUp = false;
  stopLoop(); root.classList.add('out');
  setTimeout(() => { try { R?.renderer.dispose(); R?.renderer.forceContextLoss(); } catch (_) {} root.remove(); }, 80);
}

// ================================================================== shaders
const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex, uFlow;
uniform float uTime, uLand, uMelt, uPulse, uBlink, uFade, uAspect;
uniform vec2 uRes, uVis, uC, uLook;
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
vec3 tex(vec2 p){ return texture2D(uTex, vec2(p.x, 1.0 - p.y)).rgb; }          // p: image uv, y down
vec4 flow(vec2 p){ return texture2D(uFlow, vec2(p.x, 1.0 - p.y)); }
vec3 hue(vec3 c, float a){ // YIQ hue rotation
  const mat3 toY = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toR = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 y = toY * c; float cs = cos(a), sn = sin(a); y.yz = mat2(cs, sn, -sn, cs) * y.yz; return toR * y; }
void main(){
  float t = uTime;
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);                       // screen, y down
  // ---- fuzzy melt: columns of felt drip down, fibrous edge, game shows through above
  float alpha = 1.0, rim = 0.0;
  if (uMelt > 0.0) {
    float x = s.x * uRes.x / 60.0;
    float lobes = 0.55 * n1(x * 1.3) + 0.3 * n1(x * 3.7 + 7.0) + 0.15 * n1(x * 11.0 + 3.0);
    float m = pow(uMelt, 1.6);
    float D = m * (0.9 + 1.3 * lobes) * 1.25;                // how far this column has slid
    float fib = (n2(s * uRes / vec2(2.5, 9.0)) - 0.5) * 0.022 + (n2(s * uRes / 1.6) - 0.5) * 0.01;
    float edge = D - 0.03 + fib;
    alpha = smoothstep(edge - 0.006, edge + 0.006, s.y) * (1.0 - smoothstep(0.82, 1.0, uMelt));
    rim = exp(-max(0.0, s.y - edge) / 0.035) * step(0.001, uMelt);
    s.y -= D * 0.92;                                          // content slides down with the drip
    s.y += sin(s.x * 40.0 + t * 3.0) * 0.004 * m;             // wax wobble
  }
  if (alpha <= 0.002) { gl_FragColor = vec4(0.0); return; }
  // ---- screen -> image (cover-fit around the focal point), breathing + beat zoom
  float breathe = 0.5 + 0.5 * sin(t * 0.42);
  float zoom = 1.0 - 0.012 * breathe - 0.006 * uPulse;
  vec2 p = uC + (s - 0.5) * uVis * zoom;
  // ---- slow parallax sway: top and bottom drift opposite ways around the focal row (store stays put)
  vec2 drift = vec2(sin(t * 0.13), 0.5 * sin(t * 0.09 + 1.3)) * 0.012;
  p += drift * (uC.y - p.y) * 1.6;
  // ---- liquid warp (gentler around the store / title)
  float keep = 1.0 - 0.6 * exp(-dot((p - uC) * vec2(uAspect, 1.0), (p - uC) * vec2(uAspect, 1.0)) * 18.0);
  vec2 wv = vec2(sin(p.y * 13.0 + t * 0.8 + sin(p.x * 8.0 - t * 0.55) * 1.4), cos(p.x * 11.0 - t * 0.7 + sin(p.y * 6.0 + t * 0.45) * 1.4));
  p += wv * (0.0028 + 0.0022 * breathe) * keep * vec2(1.0, uAspect * 0.6 + 0.4);
  // ---- clouds drift (masked; sky stretches around them)
  vec4 fl = flow(p);
  float ph = n1(p.y * 7.0 + 3.0) * 6.28 + n1(p.x * 4.0) * 2.0;
  p.x -= fl.r * 0.014 * sin(t * 0.11 + ph);
  p.y -= fl.r * 0.004 * sin(t * 0.17 + ph * 1.7);
  // ---- eye-sun (landscape): look around + blink
  if (uLand > 0.5) {
    vec2 ec = vec2(0.454, 0.388), eh = vec2(0.088, 0.069);
    vec2 d = (p - ec) / eh; float e = dot(d, d);
    float em = 1.0 - smoothstep(0.35, 1.0, e);
    p.x -= uLook.x * 0.024 * em;
  }
  // ---- colour: chromatic shimmer
  float ca = 0.0016 * (0.6 + 0.4 * sin(t * 0.7 + p.y * 18.0)) * (0.7 + 0.6 * uPulse);
  vec2 cd = vec2(cos(t * 0.3), sin(t * 0.3)) * ca;
  vec3 col = vec3(tex(p + cd).r, tex(p).g, tex(p - cd).b);
  if (uLand > 0.5 && uBlink > 0.001) {
    vec2 ec = vec2(0.454, 0.388), eh = vec2(0.092, 0.073);
    vec2 d = (p - ec) / eh;
    float inAl = step(abs(d.x), 1.0) * step(abs(d.y), 1.0 - d.x * d.x * 0.65);
    float lid = -1.0 + uBlink * 2.2 - (1.0 - d.x * d.x) * 0.25 * uBlink;  // lid edge (in almond y units)
    if (inAl > 0.5 && d.y < lid) {
      vec3 skin = tex(vec2(p.x, p.y - eh.y * 2.3)) * 0.92;
      col = skin;
      col *= 1.0 - 0.45 * smoothstep(lid - 0.14, lid, d.y);    // dark lash line
    }
  }
  // ---- hue waves through the oranges and blues (gentle), soft saturation lift
  float hw = sin(t * 0.23 + p.x * 3.1 + p.y * 2.3) * 0.5 + sin(t * 0.37 - p.y * 4.7) * 0.5;
  col = hue(col, hw * 0.22 + 0.06 * uPulse * sin(p.y * 9.0 + t));
  float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, 1.08 + 0.05 * uPulse);
  col *= 1.0 + 0.035 * uPulse;
  // felt fibre grain + vignette
  col += (n2(vUv * uRes / 1.3 + floor(t * 12.0) * 17.0) - 0.5) * 0.035;
  vec2 v = vUv - 0.5; col *= 1.0 - 0.32 * smoothstep(0.35, 0.85, length(v * vec2(1.0, 1.15)));
  // melt rim: darker felt edge with a fuzzy cream sheen just under it
  col = mix(col, col * 0.62, rim * 0.75) + vec3(0.18, 0.12, 0.05) * rim * (1.0 - rim) * 0.8;
  col *= uFade;
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

// run last so every const/let above (shaders, renderer state) is initialised
if (!ON) {
  root && root.remove(); document.getElementById('intro')?.remove();
  window.__introUp = false;
  window.__title = { progress() {}, ready() {} };
} else boot();
