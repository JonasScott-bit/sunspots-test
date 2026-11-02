// bowling.js — Sunspots · Gutter Bowl lane play (run 8). Its own small THREE.Scene: one full-length felt maple lane seen from behind the Wolf.
// Phone-first: drag left/right to line up, swipe up to throw (swipe speed = power, curve the end of the swipe = hook).
// Physics / scoring / swipe reading live in bowl_core.js (pure, unit-tested). town.js owns the room, the counter, the shoes and the walk to the lane.
import * as THREE from 'three';
import { scoreGame, rollState, readSwipe, BowlSim, LANE, PIN_NUM, isSplit } from './bowl_core.js';

const BALLS = [   // ball pick: colour + weight (heavier = carries more pins, a touch slower; lighter = faster, deflects)
  { id: 'house', name: 'HOUSE 10', col: '#2a2a30', sw: '#5a5a66', mass: 4.5, sp: 1.06 },
  { id: 'cherry', name: 'CHERRY 12', col: '#9a2a32', sw: '#e0705a', mass: 5.4, sp: 1.0 },
  { id: 'swirl', name: 'BLUE SWIRL 15', col: '#2a3f7a', sw: '#8fb8e8', mass: 6.8, sp: 0.93 },
];
const QUIP = {
  strike: [['RAM', 'Lucky.'], ['HUMMINGBIRD', 'I\'ve seen better. In a dream I had.'], ['ROLLER SKATE (from the counter)', 'The pins will be talking about this. They don\'t talk.'], ['RAM', 'Strike. I\'ll allow it.'], ['HUMMINGBIRD', 'Okay. Okay. That was a lotta small.']],
  spare: [['RAM', 'You fixed it. Like a plumber.'], ['HUMMINGBIRD', 'Spare. Like a tire. Nobody wants it.'], ['RAM', 'Clean-up crew.']],
  gutter: [['RAM', 'Consistent.'], ['ROLLER SKATE (from the counter)', 'The gutter is also part of the lane. Legally.'], ['HUMMINGBIRD', 'Ha. Ha. One more: ha.'], ['RAM', 'That\'s my move.']],
  split: [['HUMMINGBIRD', 'Split! Like my parents.'], ['RAM', 'Those two aren\'t speaking.'], ['', 'The pins stand far apart, not looking at each other.']],
  open: [['RAM', 'Some of them fell.'], ['HUMMINGBIRD', 'Pins: one. Wolf: also one.'], ['', 'A pin wobbles, thinks about it, and stays up.']],
  miss: [['RAM', 'You missed the pins. They were right there.'], ['HUMMINGBIRD', 'The pins didn\'t even notice.']],
  turkey: [['RAM', 'Three in a row. That\'s a turkey.'], ['WOLF', 'Where?'], ['RAM', 'On the screen.']],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

export function createBowling(ctx) {
  const { renderer, feltMat, audio = {}, say, LOW, onRoll, onLeave } = ctx;
  const B = { active: false, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 60), built: false };
  const $ = (id) => document.getElementById(id);
  const L = LANE.L, PITCH = 1.62;

  // ------------------------------------------------------------------ DOM (injected)
  const css = document.createElement('style');
  css.textContent = `
  #bwUI{position:fixed;inset:0;z-index:9;display:none;font-family:Futura,Avenir,sans-serif;color:#fff3dc;-webkit-user-select:none;user-select:none}
  body.lane #bwUI{display:block} body.lane #roomUI,body.lane #townObj{display:none!important}
  body.lane #sceneSub{bottom:calc(env(safe-area-inset-bottom) + 132px);z-index:10}
  #bwPad{position:absolute;inset:0;touch-action:none}
  #bwTrail{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  #bwCard{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 50px);width:min(96vw,620px);border-radius:8px;box-shadow:0 0 0 3px #5a3920,0 4px 14px rgba(0,0,0,.45);pointer-events:none;background:#26323a}
  #bwExit{position:absolute;right:10px;top:calc(env(safe-area-inset-top) + 50px + min(96vw,620px)*.2 + 12px);border:0;border-radius:999px;padding:9px 14px;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.14em;color:#3a1f2a;background:#fff3dc;box-shadow:0 3px 0 #b9a58a}
  #bwInfo{position:absolute;left:12px;top:calc(env(safe-area-inset-top) + 50px + min(96vw,620px)*.2 + 16px);font:700 12px Futura,Avenir,sans-serif;letter-spacing:.16em;text-shadow:0 1px 4px rgba(0,0,0,.7);pointer-events:none}
  #bwBalls{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 12px);display:flex;gap:8px;justify-content:center;transition:opacity .2s}
  #bwBalls button{border:0;border-radius:999px;padding:8px 12px 8px 8px;font:700 11px Futura,Avenir,sans-serif;letter-spacing:.1em;color:#3a1f2a;background:#ffe6c4;box-shadow:0 3px 0 #c9a37a;display:flex;align-items:center;gap:6px}
  #bwBalls button i{width:18px;height:18px;border-radius:50%;display:inline-block;box-shadow:inset -3px -3px 0 rgba(0,0,0,.25)}
  #bwBalls button.on{background:#ffc98a;outline:3px solid #fff3dc}
  #bwHint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 62px);text-align:center;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.14em;text-shadow:0 1px 5px rgba(0,0,0,.8);pointer-events:none;transition:opacity .3s}
  #bwBig{position:absolute;left:0;right:0;top:38%;text-align:center;font:700 clamp(40px,12vw,84px) "Brush Script MT","Snell Roundhand",cursive;color:#ffd04a;text-shadow:0 4px 0 #b8332e,0 8px 20px rgba(0,0,0,.5);opacity:0;transform:scale(.6) rotate(-6deg);transition:opacity .2s,transform .35s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
  #bwBig.on{opacity:1;transform:scale(1) rotate(-6deg)}
  #bwBig small{display:block;font:700 15px Futura,Avenir,sans-serif;letter-spacing:.2em;color:#fff3dc;text-shadow:0 2px 6px rgba(0,0,0,.7)}
  #bwPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(84vw,360px);padding:18px 16px 16px;border-radius:14px;background:#3a2418;box-shadow:0 0 0 4px #e0705a,0 12px 30px rgba(0,0,0,.5);text-align:center;display:none}
  #bwPanel.on{display:block} #bwPanel h3{margin:0 0 4px;font:700 34px "Brush Script MT","Snell Roundhand",cursive;color:#ffd9c0} #bwPanel p{margin:0 0 12px;font-size:12px;letter-spacing:.12em;line-height:1.5;color:#efe2c4}
  #bwPanel button{display:block;width:100%;margin:8px 0 0;border:0;border-radius:999px;padding:13px;font:700 14px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:#ffc98a;box-shadow:0 4px 0 #c27b45}
  #bwPanel button.alt{background:#efe2c4;box-shadow:0 4px 0 #b9a58a}
  #bwFade{position:fixed;inset:0;z-index:21;background:#140c0a;opacity:0;pointer-events:none;transition:opacity .35s;display:flex;align-items:center;justify-content:center}
  #bwFade.on{opacity:1} #bwFade b{font:700 clamp(44px,14vw,96px) "Brush Script MT","Snell Roundhand",cursive;color:#ffd9c0;text-shadow:0 0 18px #e0705a;transform:scale(.8);transition:transform 1.2s ease-out}
  #bwFade.on b{transform:scale(1.05)} #bwFade small{position:absolute;left:0;right:0;top:calc(50% + 56px);text-align:center;font:700 13px Futura,Avenir,sans-serif;letter-spacing:.3em;color:#efe2c4}`;
  document.head.appendChild(css);
  const ui = document.createElement('div'); ui.id = 'bwUI';
  ui.innerHTML = `<div id="bwPad"><canvas id="bwTrail"></canvas></div><canvas id="bwCard" width="1240" height="250"></canvas><div id="bwInfo"></div><button id="bwExit">EXIT LANE</button>
    <div id="bwHint"></div><div id="bwBalls"></div><div id="bwBig"></div><div id="bwPanel"></div>`;
  document.body.appendChild(ui);
  const fade = document.createElement('div'); fade.id = 'bwFade'; fade.innerHTML = '<b></b><small></small>'; document.body.appendChild(fade);
  const pad = $('bwPad'), trail = $('bwTrail'), tg = trail.getContext('2d'), card = $('bwCard'), cg = card.getContext('2d'), big = $('bwBig'), panel = $('bwPanel'), hint = $('bwHint'), info = $('bwInfo'), ballsUI = $('bwBalls');
  $('bwExit').addEventListener('click', (e) => { e.stopPropagation(); leave(); });

  // ------------------------------------------------------------------ sound (tiny WebAudio synth; respects the game's sound mode + SFX slider)
  let AC = null, out = null, rollG = null, rollF = null;
  const sfxOn = () => (audio.mode ? (audio.mode === 'all' || audio.mode === 'sound') : !audio.muted) ? (audio.sfxVol ?? 1) : 0;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); out = AC.createGain(); out.connect(AC.destination);
        const n = AC.createBufferSource(); n.buffer = noise(2); n.loop = true; rollF = AC.createBiquadFilter(); rollF.type = 'lowpass'; rollF.frequency.value = 260; rollG = AC.createGain(); rollG.gain.value = 0; n.connect(rollF).connect(rollG).connect(out); n.start(); } catch (e) { AC = null; } }
    if (AC?.state === 'suspended') AC.resume(); if (out) out.gain.value = 0.7 * sfxOn(); return AC; }
  let NB = null; function noise(sec) { if (NB && sec <= 2) return NB; const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.5 + (Math.random() * 2 - 1) * 0.12; } if (sec <= 2) NB = b; return b; }
  function tone(f, dur, { type = 'sine', g = 0.3, at = 0, slide = 0 } = {}) { if (!ac() || !sfxOn()) return; const t = AC.currentTime + at, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(out); o.start(t); o.stop(t + dur + 0.05); }
  function hiss(dur, { f = 3000, q = 0.7, g = 0.3, at = 0, type = 'bandpass' } = {}) { if (!ac() || !sfxOn()) return; const t = AC.currentTime + at, s = AC.createBufferSource(); s.buffer = noise(2); const bf = AC.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const gn = AC.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bf).connect(gn).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
  const SND = {
    tock: (k = 1) => { tone(620 + Math.random() * 500, 0.09, { type: 'triangle', g: 0.18 * k }); hiss(0.06, { f: 2600, q: 2, g: 0.12 * k }); },
    crash: (k = 1) => { hiss(0.5, { f: 2200, q: 0.6, g: 0.5 * k }); for (let i = 0; i < 6; i++) tone(500 + Math.random() * 900, 0.12, { type: 'triangle', g: 0.2 * k, at: i * 0.03 + Math.random() * 0.03 }); tone(110, 0.3, { g: 0.35 * k, slide: 0.6 }); },
    clunk: (k = 1) => tone(170 + Math.random() * 40, 0.14, { type: 'triangle', g: 0.16 * k, slide: 0.7 }),
    thud: () => { tone(80, 0.25, { g: 0.5, slide: 0.5 }); hiss(0.08, { f: 400, g: 0.2 }); },
    gutter: () => { tone(95, 0.5, { type: 'triangle', g: 0.2, slide: 0.8 }); },
    pit: () => { tone(60, 0.4, { g: 0.4, slide: 0.6 }); hiss(0.25, { f: 300, g: 0.25 }); },
    whir: () => { tone(55, 1.3, { type: 'sawtooth', g: 0.05, slide: 1.3 }); hiss(1.2, { f: 700, q: 3, g: 0.06 }); tone(140, 0.12, { type: 'square', g: 0.06, at: 1.2 }); },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => { tone(f, 0.32, { type: 'square', g: 0.06, at: i * 0.11 }); tone(f / 2, 0.32, { type: 'triangle', g: 0.08, at: i * 0.11 }); }),
    sad: () => [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.7 : 0.26, { type: 'square', g: 0.05, at: i * 0.28, slide: i === 3 ? 0.9 : 1 })),
    chaching: () => { hiss(0.05, { f: 1500, q: 1, g: 0.25 }); tone(140, 0.1, { type: 'square', g: 0.08, at: 0.02 }); tone(2637, 0.7, { g: 0.16, at: 0.16 }); tone(3951, 0.6, { g: 0.1, at: 0.16 }); tone(2637, 0.5, { g: 0.1, at: 0.3 }); hiss(0.2, { f: 6000, q: 1, g: 0.06, at: 0.16 }); },
    spray: () => { hiss(0.12, { f: 5200, q: 0.5, g: 0.2 }); hiss(0.7, { f: 6500, q: 0.4, g: 0.24, at: 0.14, type: 'highpass' }); },
  };
  B.sfx = (k) => SND[k]?.();

  // ------------------------------------------------------------------ the lane scene
  const LANES_X = [-2, -1, 0, 1, 2].map(i => i * PITCH);
  let laneNo = 5, ballMesh = null, guide = null, pinMeshes = [], blobs = [], rake = null, deck = null, screen = null, hb = null, hbWings = [], maskTex = null, maskG = null, sweepPins = [];
  const R = { scr: null, sg: null };
  function canvasTex(w, h, draw, aniso = 4) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.userData.g = g; t.userData.c = c; return t; }
  const flat = (w, d, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; return m; };
  const bx = (w, h, d, col, y0 = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2 + y0, 0); return new THREE.Mesh(g, typeof col === 'string' ? feltMat(col) : col); };
  function build() {
    const sc = B.scene; sc.background = new THREE.Color('#1e1310'); sc.fog = new THREE.Fog('#1e1310', 12, 34);
    sc.add(new THREE.HemisphereLight('#fff0d8', '#4a2a22', 1.5)); const k = new THREE.DirectionalLight('#fff4e0', 1.4); k.position.set(2, 8, 4); sc.add(k);
    const pinLight = new THREE.PointLight('#fff2d0', 6, 9, 1.6); pinLight.position.set(0, 2.2, -L - 0.6); sc.add(pinLight);
    // maple boards: arrows 4.6 m past the foul line, dots at 2.1 m, range finders, pin spots
    const LEN = L + 1.15, PX = 128, pm = 2048 / LEN;
    const laneTex = canvasTex(PX, 2048, (g, w, h) => { for (let x = 0; x < w; x += 3) { const k = (x / 3) % 4; g.fillStyle = ['#e5bb80', '#ecc791', '#e2b57a', '#e9c289'][k]; g.fillRect(x, 0, 3, h); }
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(120,70,20,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 1.2, 3 + Math.random() * 6); }
      for (let y = 0; y < h; y += 90 + Math.random() * 60) { g.fillStyle = 'rgba(120,70,30,0.18)'; g.fillRect(Math.floor(Math.random() * 43) * 3, y, 3, 1.5); }
      const zy = (z) => h - z * pm; g.fillStyle = 'rgba(150,90,40,0.16)'; g.fillRect(0, 0, w, zy(L - 0.35));
      g.fillStyle = '#6a3a22'; for (let k2 = -3; k2 <= 3; k2++) { const x = w / 2 + k2 * w / 7.5, z = zy(4.6 + Math.abs(k2) * 0.3); g.beginPath(); g.moveTo(x, z - 34); g.lineTo(x - 6, z + 6); g.lineTo(x + 6, z + 6); g.fill(); }
      for (let k2 = -4; k2 <= 4; k2++) if (k2) { g.beginPath(); g.arc(w / 2 + k2 * w / 10, zy(2.1), 2.5, 0, 7); g.fill(); }
      for (const s of [-1, 1]) g.fillRect(w / 2 + s * w * 0.3 - 2, zy(12.2), 4, 40);
      g.fillStyle = 'rgba(90,50,30,0.5)'; for (const [x, z] of [[0, 0], [-0.152, 0.264], [0.152, 0.264], [-0.305, 0.528], [0, 0.528], [0.305, 0.528], [-0.457, 0.792], [-0.152, 0.792], [0.152, 0.792], [0.457, 0.792]]) { g.beginPath(); g.arc(w / 2 + x / (LANE.half * 2) * w, zy(L + z), 3.5, 0, 7); g.fill(); }
      g.fillStyle = '#1e1a1a'; g.fillRect(0, h - 5, w, 5); }, 16);
    const appTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#efd1a0'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 3) { g.fillStyle = (x / 3) % 2 ? 'rgba(160,100,50,0.08)' : 'rgba(255,255,255,0.08)'; g.fillRect(x, 0, 2, h); }
      g.fillStyle = '#6a3a22'; for (const yy of [h * 0.2, h * 0.55]) for (let k2 = -2; k2 <= 2; k2++) { g.beginPath(); g.arc(w / 2 + k2 * w / 6, yy, 2, 0, 7); g.fill(); } g.fillStyle = '#1e1a1a'; g.fillRect(0, h - 4, w, 4); }, 8);
    const laneMat = feltMat('#ffffff', { map: laneTex, bumpScale: 0.15 }), appMat = feltMat('#ffffff', { map: appTex, bumpScale: 0.15 }), gutMat = feltMat('#3a2a22'), capMat = feltMat('#5a3920'), wal = feltMat('#6b4528');
    const gutG = new THREE.CylinderGeometry(LANE.gutter / 2, LANE.gutter / 2, LEN, 10, 1, true, Math.PI / 2, Math.PI); gutG.rotateX(Math.PI / 2); gutG.rotateZ(0);
    for (const cx of LANES_X) {
      const ln = flat(LANE.half * 2, LEN, laneMat); ln.position.set(cx, 0, -LEN / 2); sc.add(ln);
      const ap = flat(LANE.half * 2 + LANE.gutter * 2 + 0.1, 4.8, appMat); ap.position.set(cx, 0.001, 2.4); sc.add(ap);
      for (const s of [-1, 1]) { const gt = new THREE.Mesh(gutG, gutMat); gt.rotation.z = Math.PI; gt.position.set(cx + s * (LANE.half + LANE.gutter / 2), LANE.gutter / 2 - 0.005, -LEN / 2); gt.scale.y = 0.7; sc.add(gt); }
      const kb = bx(0.12, 0.8, 2.6, wal); kb.position.set(cx + LANE.half + LANE.gutter + 0.06, 0, -L - 0.5); sc.add(kb); const kb2 = kb.clone(); kb2.position.x = cx - LANE.half - LANE.gutter - 0.06; sc.add(kb2);
      const cap = bx(PITCH - LANE.half * 2 - LANE.gutter * 2, 0.06, LEN, capMat); cap.position.set(cx + PITCH / 2, 0, -LEN / 2); sc.add(cap);
    }
    const pitM = bx(PITCH * 5 + 1, 1.0, 0.5, '#0d0a0a'); pitM.position.set(0, -0.1, -L - 1.55); sc.add(pitM);
    const backW = new THREE.Mesh(new THREE.PlaneGeometry(PITCH * 5 + 8, 4), feltMat('#2a1a14')); backW.position.set(0, 2, -L - 1.8); sc.add(backW);
    // masking unit: back-lit lane numbers + Brunswick crown, ours lit
    maskTex = canvasTex(1024, 128, (g) => drawMask(g, 1024, 128)); maskG = maskTex.userData.g;
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(PITCH * 5, PITCH * 5 / 8), feltMat('#ffffff', { map: maskTex, emissive: new THREE.Color('#ffffff'), emissiveMap: maskTex, emissiveIntensity: 0.8 })); mask.position.set(0, 1.45, -L - 1.3); sc.add(mask);
    const mtop = bx(PITCH * 5 + 0.2, 0.25, 0.4, '#5a3920'); mtop.position.set(0, 1.95, -L - 1.3); sc.add(mtop);
    // ceiling with light troughs, side walls (walnut panelling)
    const ceilTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8ad96'; for (let p = 0; p <= w; p += 32) { g.fillRect(p, 0, 2, h); g.fillRect(0, p, w, 2); } for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(90,70,50,0.25)'; g.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2); } });
    ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping; ceilTex.repeat.set(5, 9); const ceil = flat(PITCH * 5 + 8, L + 8, feltMat('#ffffff', { map: ceilTex, emissive: new THREE.Color('#40382c') })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.4, -L / 2 + 1); sc.add(ceil);
    for (const cx of LANES_X) { const tr = flat(0.28, L - 1, new THREE.MeshBasicMaterial({ color: '#fff4d8' })); tr.rotation.x = Math.PI / 2; tr.position.set(cx + PITCH / 2, 3.39, -L / 2 + 1); sc.add(tr); }
    const panTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#6b4528'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 24) { g.fillStyle = '#5a3920'; g.fillRect(x, 0, 3, h); } g.fillStyle = '#e0705a'; g.fillRect(0, h * 0.62, w, 6); g.fillStyle = '#efe2c4'; g.fillRect(0, 0, w, h * 0.3); });
    panTex.wrapS = THREE.RepeatWrapping; panTex.repeat.set(6, 1); for (const s of [-1, 1]) { const wl = new THREE.Mesh(new THREE.PlaneGeometry(L + 8, 3.4), feltMat('#ffffff', { map: panTex })); wl.rotation.y = -s * Math.PI / 2; wl.position.set(s * (PITCH * 2.5 + 3), 1.7, -L / 2 + 1); sc.add(wl); }
    const floor = flat(PITCH * 5 + 8, 6, feltMat('#2f6a6e')); floor.position.set(0, -0.005, 4.0); sc.add(floor);
    // neighbouring racks (static), our ten pins (simulated)
    const pinProf = [[0, 0], [0.032, 0], [0.05, 0.06], [0.06, 0.12], [0.052, 0.18], [0.03, 0.25], [0.022, 0.28], [0.03, 0.33], [0.032, 0.36], [0.02, 0.378], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x, y));
    const pinG = new THREE.LatheGeometry(pinProf, 12), pinT = canvasTex(8, 128, (g, w, h) => { g.fillStyle = '#fbf1de'; g.fillRect(0, 0, w, h); g.fillStyle = '#c23a35'; g.fillRect(0, h * 0.64, w, 6); g.fillRect(0, h * 0.72, w, 6); });
    const pinMat = feltMat('#ffffff', { map: pinT, bumpScale: 0.25 }), goldMat = feltMat('#f2c24a', { emissive: new THREE.Color('#5a3a00'), bumpScale: 0.25 });
    B.pinMat = pinMat; B.goldMat = goldMat;
    const nb = new THREE.InstancedMesh(new THREE.LatheGeometry(pinProf.filter((_, i) => i % 2 === 0 || i === 10), 7), pinMat, 40); let n = 0; const m4 = new THREE.Matrix4();
    for (const cx of LANES_X) if (cx !== 0) for (let r = 0; r < 4; r++) for (let k2 = 0; k2 <= r; k2++) { m4.makeTranslation(cx + (k2 - r / 2) * LANE.pinGap, 0, -L - r * LANE.rowGap); nb.setMatrixAt(n++, m4); } sc.add(nb);
    const blobT = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(30,15,10,0.55)'); gr.addColorStop(1, 'rgba(30,15,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), blobM = new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false });
    for (let i = 0; i < 10; i++) { const p = new THREE.Group(); const body = new THREE.Mesh(pinG, pinMat); p.add(body); p.userData.body = body; sc.add(p); pinMeshes.push(p); const bl = flat(0.2, 0.2, blobM); bl.position.y = 0.003; sc.add(bl); blobs.push(bl); }
    // googly eyes for the dodger pin (attached when chosen)
    B.eyes = new THREE.Group(); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), feltMat('#ffffff')); w.position.set(s * 0.019, 0.3, 0.027); w.scale.z = 0.5; const pu = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), feltMat('#111111')); pu.position.set(0, 0, 0.012); w.add(pu); w.userData.pu = pu; B.eyes.add(w); }
    // the ball (finger holes so you can see it roll) + its shadow + the aim guide
    ballMesh = new THREE.Group(); const bm = new THREE.Mesh(new THREE.SphereGeometry(LANE.ballR, 20, 14), feltMat('#2a3f7a', { bumpScale: 0.2 })); ballMesh.add(bm); ballMesh.userData.m = bm;
    const swirl = new THREE.Mesh(new THREE.TorusGeometry(LANE.ballR * 0.92, 0.012, 4, 24), feltMat('#8fb8e8')); swirl.rotation.y = 0.5; ballMesh.add(swirl); ballMesh.userData.sw = swirl;
    for (const [a, b] of [[0.25, 0.1], [0.25, -0.1], [-0.05, 0]]) { const hole = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), new THREE.MeshBasicMaterial({ color: '#0a0a0a' })); const v = new THREE.Vector3(Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)).normalize(); hole.position.copy(v).multiplyScalar(LANE.ballR + 0.001); hole.lookAt(v.clone().multiplyScalar(2)); bm.add(hole); }
    sc.add(ballMesh); B.ballBlob = flat(0.32, 0.32, blobM); B.ballBlob.position.y = 0.004; sc.add(B.ballBlob);
    guide = new THREE.Group(); const gm = new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0.55, depthWrite: false }); for (let i = 0; i < 14; i++) { const d = flat(0.05, 0.12, gm); d.position.set(0, 0.006, -0.6 - i * 0.55); guide.add(d); } sc.add(guide);
    // pinsetter: the rake (sweep bar) + the deck that lifts / sets pins
    rake = new THREE.Group(); const rb = bx(LANE.half * 2 + LANE.gutter * 2, 0.24, 0.05, '#3a2a22'); rake.add(rb); const rs = bx(LANE.half * 2 + LANE.gutter * 2, 0.04, 0.06, '#e0705a', 0.2); rake.add(rs); rake.position.set(0, 1.1, -L + 0.4); sc.add(rake);
    deck = bx(1.2, 0.08, 1.2, '#2a2420'); deck.position.set(0, 1.3, -L - 0.4); sc.add(deck);
    // ball return hood beside our approach with the three balls on it
    const hood = new THREE.Group(); const hm = bx(0.36, 0.42, 1.5, '#efe6d2'); hood.add(hm); const st = bx(0.38, 0.05, 1.5, '#e0705a', 0.3); hood.add(st);
    B.rackBalls = BALLS.map((bb, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), feltMat(bb.col)); s.position.set(0, 0.53, -0.45 + i * 0.3); hood.add(s); return s; });
    hood.position.set(-PITCH / 2, 0, 2.6); sc.add(hood);
    // overhead Telescore screen (the period animation plays here) + its frame
    R.scr = canvasTex(512, 220, (g, w, h) => { g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h); }); R.sg = R.scr.userData.g;
    screen = new THREE.Group(); const sfr = bx(1.75, 0.8, 0.06, '#5a3920'); sfr.position.y = -0.4; screen.add(sfr);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.7), new THREE.MeshBasicMaterial({ map: R.scr })); sp.position.set(0, 0, 0.035); screen.add(sp);
    for (const sx of [-0.7, 0.7]) { const rod = bx(0.02, 0.9, 0.02, '#aab1b7'); rod.position.set(sx, 0.35, 0); screen.add(rod); } screen.position.set(0, 2.95, -1.9); screen.rotation.x = 0.22; screen.scale.setScalar(0.85); sc.add(screen);
    // the Hummingbird hovers by the ball return (felt placeholder)
    hb = new THREE.Group(); const hbody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), feltMat('#3fae7a')); hbody.scale.set(1, 1.2, 1); hb.add(hbody); const jk = bx(0.17, 0.12, 0.15, '#2a2220', -0.13); hb.add(jk);
    const hh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), feltMat('#3fae7a')); hh.position.y = 0.12; hb.add(hh); const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.01, 0.13, 5), feltMat('#2a2a2a')); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.12, 0.07); hb.add(bk);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 4), feltMat('#9fd6b8')); w.scale.set(1.4, 0.2, 0.6); w.position.set(s * 0.1, 0.03, -0.02); hb.add(w); hbWings.push(w); }
    hb.position.set(-0.95, 1.45, 1.6); sc.add(hb);
    B.built = true; sc.updateMatrixWorld(true); B.tris = countTris(sc);
  }
  function countTris(root) { let n = 0; root.traverse(o => { if (o.isMesh && o.visible) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } }); return Math.round(n); }
  function drawMask(g, w, h) { g.fillStyle = '#3a2418'; g.fillRect(0, 0, w, h); const pw = w / 5;
    for (let i = 0; i < 5; i++) { const no = laneNo - 2 + i, x = i * pw, lit = i === 2; if (no < 1 || no > 8) continue;
      g.fillStyle = lit ? '#fff6dc' : '#bfae8c'; g.fillRect(x + 10, 10, pw - 20, h - 20); if (lit) { g.strokeStyle = '#e0705a'; g.lineWidth = 8; g.strokeRect(x + 14, 14, pw - 28, h - 28); }
      g.fillStyle = '#e2b23a'; const cx = x + pw * 0.3, cy = h * 0.55; g.beginPath(); g.moveTo(cx - 22, cy + 16); g.lineTo(cx - 22, cy - 12); g.lineTo(cx - 11, cy); g.lineTo(cx, cy - 18); g.lineTo(cx + 11, cy); g.lineTo(cx + 22, cy - 12); g.lineTo(cx + 22, cy + 16); g.fill();
      g.fillStyle = '#b8332e'; g.font = '700 64px Futura, Avenir, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(no), x + pw * 0.66, h * 0.54); } }

  // ------------------------------------------------------------------ scorecard (DOM card + the overhead screen share the drawing)
  const PEN = 'Marker Felt, "Comic Sans MS", "Chalkboard SE", sans-serif';
  function drawCard(g, w, h, rolls, frames, cur, name = 'WOLF') {
    const sg = scoreGame(rolls, frames); g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h);
    const nameW = w * 0.11, unit = (w - nameW - 8) / (frames - 1 + 1.45), y0 = 6, fh = h - 12;
    g.strokeStyle = '#d8e0c8'; g.lineWidth = Math.max(1.5, w / 500);
    g.fillStyle = '#f2e070'; g.font = `700 ${Math.min(fh * 0.3, nameW * 0.3)}px ${PEN}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, nameW / 2 + 2, h / 2);
    for (let f = 0; f < frames; f++) { const last = f === frames - 1, x = nameW + 4 + f * unit, fw = last ? unit * 1.45 : unit, fr = sg.frames[f];
      if (f === cur) { g.fillStyle = 'rgba(242,224,112,0.16)'; g.fillRect(x, y0, fw, fh); }
      g.strokeRect(x, y0, fw, fh); const bw = fw / (last ? 3 : 2) * (last ? 1 : 0.9), box = last ? 3 : 2;
      for (let k = 1; k <= box - (last ? 0 : 1); k++) { const bx0 = x + fw - bw * k; g.strokeRect(bx0, y0, bw, fh * 0.42); }
      g.fillStyle = 'rgba(216,224,200,0.55)'; g.font = `700 ${fh * 0.16}px Futura, Avenir, sans-serif`; g.fillText(String(f + 1), x + fw * 0.2, y0 + fh * 0.2);
      g.fillStyle = '#f2e070'; g.font = `700 ${fh * 0.3}px ${PEN}`;
      fr.marks.forEach((mk, k) => { const slot = last ? k : (fr.marks.length === 1 && mk === 'X' ? 1 : k), cx = last ? x + fw - bw * (3 - slot) + bw / 2 : x + fw - bw * (2 - slot) + bw / 2; g.fillText(mk, cx, y0 + fh * 0.22); });
      if (fr.total != null) { g.font = `700 ${fh * 0.38}px ${PEN}`; g.fillText(String(fr.total), x + fw / 2, y0 + fh * 0.72); } }
    return sg;
  }
  function paintCard() { const st = rollState(G.rolls, G.frames); drawCard(cg, card.width, card.height, G.rolls, G.frames, st.done ? -1 : st.frame); }
  // overhead screen: frame / ball / running score, or a short grease-pencil cartoon after a roll
  let anim = null;
  function paintScreen(t) { const g = R.sg, w = 512, h = 220; g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8e0c8'; g.lineWidth = 2; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f2e070';
    if (anim) { const e = (t - anim.t0) / anim.dur; if (e >= 1) anim = null; else { cartoon(g, w, h, anim.kind, e, t); R.scr.needsUpdate = true; return; } }
    const sg = scoreGame(G.rolls, G.frames), st = sg.state; g.font = `700 30px ${PEN}`; g.fillText(`LANE ${laneNo}  ·  WOLF`, w / 2, 44);
    g.font = `700 74px ${PEN}`; g.fillText(String(sg.total), w / 2, 118); g.font = `700 24px ${PEN}`;
    g.fillText(st.done ? 'GAME OVER' : `FRAME ${st.frame + 1} of ${G.frames}  ·  BALL ${st.ball + 1}`, w / 2, 178); R.scr.needsUpdate = true; }
  function cartoon(g, w, h, kind, e, t) {   // drawn like a 1960 Telescore gag: wobbly grease-pencil lines
    const j = (a = 2) => (Math.sin(t * 40 + a) * 1.2); g.lineWidth = 4; g.strokeStyle = '#f2e070'; g.fillStyle = '#f2e070';
    const pin = (x, y, s = 1, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.ellipse(0, 0, 10 * s, 22 * s, 0, 0, 7); g.moveTo(5 * s, -22 * s); g.ellipse(0, -30 * s, 7 * s, 9 * s, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-7 * s, -15 * s); g.lineTo(7 * s, -15 * s); g.stroke(); g.restore(); };
    const word = (s, y = 190, px = 48) => { g.font = `700 ${px}px ${PEN}`; g.save(); g.translate(w / 2 + j(), y); g.rotate(-0.05); g.fillText(s, 0, 0); g.restore(); };
    if (kind === 'strike' || kind === 'turkey') { const bx0 = 40 + Math.min(1, e * 2.2) * 250; g.beginPath(); g.arc(bx0, 120, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(bx0 - 6, 110, 4, 0, 7); g.arc(bx0 + 6, 112, 4, 0, 7); g.fill();
      for (let i = 0; i < 6; i++) { const k = Math.max(0, e * 2.2 - 0.9) * 1.6, a = -1.2 + i * 0.45; pin(330 + i * 18 + Math.cos(a) * 200 * k, 120 + Math.sin(a) * 120 * k + k * k * 60, 1, k * (3 + i)); }
      if (e > 0.45) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 60, 70 + Math.sin(a) * 30); g.lineTo(w / 2 + Math.cos(a) * 80, 70 + Math.sin(a) * 40); g.stroke(); } }
      if (kind === 'turkey') { g.beginPath(); g.ellipse(120, 70, 26, 20, 0, 0, 7); g.stroke(); for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(100 - i * 4, 50 - i * 2, 6, 22, -0.8 + i * 0.4, 0, 7); g.stroke(); } }
      word(kind === 'turkey' ? 'TURKEY!' : 'STRIKE!'); }
    else if (kind === 'spare') { pin(w / 2 - 40, 120, 1.5, Math.sin(t * 6) * 0.1); g.beginPath(); g.moveTo(w / 2 - 20, 80); g.lineTo(w / 2 + 40, 40); g.stroke(); g.save(); g.translate(w / 2 + 40, 40); g.rotate(Math.sin(t * 8) * 0.2); g.strokeRect(0, 0, 60, 34); g.restore(); word('SPARE'); }
    else if (kind === 'gutter') { const x = 60 + e * 380; g.beginPath(); g.moveTo(30, 150); g.lineTo(w - 30, 150); g.moveTo(30, 175); g.lineTo(w - 30, 175); g.stroke(); g.beginPath(); g.arc(x, 150, 18, 0, 7); g.stroke(); g.beginPath(); g.arc(x, 156, 7, 3.6, 5.8); g.stroke(); g.fillRect(x - 7, 142, 3, 3); g.fillRect(x + 4, 142, 3, 3);
      for (let i = 0; i < 4; i++) pin(330 + i * 30, 70, 0.8, 0); g.font = `700 22px ${PEN}`; g.fillText('ha', 300 + Math.sin(t * 9) * 4, 26); g.fillText('ha', 420, 30 + Math.sin(t * 7) * 4); word('GUTTER', 108, 52); }
    else if (kind === 'split') { const k = Math.min(1, e * 2); pin(w / 2 - 40 - k * 120, 110, 1.3, -0.1); pin(w / 2 + 40 + k * 120, 110, 1.3, 0.1); g.font = `700 22px ${PEN}`; if (e > 0.5) { g.fillText('hmph', w / 2 - 170, 40); g.fillText('hmph', w / 2 + 170, 40); } word('SPLIT'); }
    else { const n = anim.n; for (let i = 0; i < 10; i++) { const r = [0, 1, 1, 2, 2, 2, 3, 3, 3, 3][i], k2 = [0, 0, 1, 0, 1, 2, 0, 1, 2, 3][i]; const down = anim.fell?.[i]; pin(w / 2 + (k2 - r / 2) * 44, 150 - r * 34, 0.7, down ? 1.4 : 0); }
      word(n === 0 ? 'MISS' : `${n} PIN${n === 1 ? '' : 'S'}`, 36, 34); }
  }

  // ------------------------------------------------------------------ game state
  const G = { frames: 3, rolls: [], phase: 'idle', x: 0.18, ball: 1, ph: 0, wolf: null, room: null, golden: -1, strikes: 0, auto: null };
  const sim = new BowlSim({ on: (k, v) => {
    if (k === 'ball') SND.crash(Math.max(0.35, v)); else if (k === 'pin') SND.tock(v); else if (k === 'clunk') SND.clunk(v * 0.8); else if (k === 'wall') SND.tock(v * 0.6);
    else if (k === 'gutter') SND.gutter(); else if (k === 'pit') SND.pit(); else if (k === 'dodge') { G.dodgedNow = true; SND.tock(0.3); tone(900, 0.18, { type: 'square', g: 0.05, slide: 1.6 }); } } });
  function newRack(mask = null) {
    sim.rack(mask); if (!mask) { G.golden = Math.random() < 0.09 ? 1 + Math.floor(Math.random() * 9) : -1; sim.dodger = Math.random() < 0.3 ? [6, 9, 3, 5, 1, 2][Math.floor(Math.random() * 6)] : -1; if (G.force) { Object.assign(G, { golden: G.force.golden ?? G.golden }); sim.dodger = G.force.dodger ?? sim.dodger; } }
    pinMeshes.forEach((m, i) => { m.userData.body.material = i === G.golden ? B.goldMat : B.pinMat; if (B.eyes.parent === m) m.remove(B.eyes); });
    if (sim.dodger >= 0 && !sim.pins[sim.dodger].gone) pinMeshes[sim.dodger].add(B.eyes);
    syncPins(); }
  function syncPins() { const q = new THREE.Quaternion(), ax = new THREE.Vector3();
    sim.pins.forEach((p, i) => { const m = pinMeshes[i], bl = blobs[i]; m.visible = !p.gone && !p.pit; bl.visible = m.visible && p.y < 0.4; if (!m.visible) return;
      m.position.set(p.x, p.y + Math.sin(p.tilt) * 0.052 + (p.lift || 0), p.z);
      if (p.up) { const a = p.wob * 0.9; ax.set(Math.cos(p.wobDir), 0, -Math.sin(p.wobDir)); m.quaternion.setFromAxisAngle(ax, a); }
      else { ax.set(Math.cos(p.dir), 0, -Math.sin(p.dir)); m.quaternion.setFromAxisAngle(ax, p.tilt); }
      bl.position.x = p.x + (p.up ? 0 : Math.sin(p.dir) * 0.15 * Math.sin(p.tilt)); bl.position.z = p.z + (p.up ? 0 : Math.cos(p.dir) * 0.15 * Math.sin(p.tilt)); bl.scale.setScalar(p.up ? 0.8 : 1.6); }); }

  // the Wolf: walk-up approach, arm swing (added on top of the clip), ball in the right paw
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _X = new THREE.Vector3(1, 0, 0);
  function bone(name) { let b = null; G.wolf.traverse(o => { if (!b && o.isBone && o.name === name) b = o; }); return b; }
  function swing(angle) { const b = G.bones?.arm; if (!b || !angle) return; b.parent.getWorldQuaternion(_q); _q2.setFromAxisAngle(_X, angle); const inv = _q.clone().invert(); b.quaternion.premultiply(inv.multiply(_q2).multiply(_q)); }
  function holdBall() { const h = G.bones?.hand; if (!h) return; G.wolf.updateMatrixWorld(true); h.getWorldPosition(_v); ballMesh.position.set(G.x + (_v.x - G.wolf.position.x - HAND) * 0.3, Math.max(LANE.ballR, _v.y - 0.06), _v.z - 0.05); }
  const WZ0 = 2.5, WZ1 = 0.75, HAND = 0.32;   // the Wolf starts 2.5 m behind the foul line and walks up to 0.75 m; the ball is in the right paw (0.2 m to the right)

  function setBall(i) { G.ball = i; const b = BALLS[i]; ballMesh.userData.m.material.color.set(b.col); ballMesh.userData.sw.material.color.set(b.sw);
    [...ballsUI.children].forEach((el, k) => el.classList.toggle('on', k === i)); B.rackBalls?.forEach((s, k) => s.visible = k !== i); }
  ballsUI.innerHTML = BALLS.map((b, i) => `<button data-i="${i}"><i style="background:radial-gradient(circle at 35% 35%,${b.sw},${b.col} 60%)"></i>${b.name}</button>`).join('');
  [...ballsUI.children].forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); if (G.phase === 'aim') { setBall(+el.dataset.i); audio.ui?.('tick'); SND.tock(0.4); } }));

  function showPanel(kind) { const sg = scoreGame(G.rolls, G.frames);
    if (kind === 'mode') panel.innerHTML = `<h3>Lane ${laneNo}</h3><p>DRAG LEFT / RIGHT TO LINE UP<br>SWIPE UP TO THROW · FASTER = HARDER<br>CURVE THE END OF THE SWIPE TO HOOK</p><button data-f="3">QUICK GAME · 3 FRAMES</button><button data-f="10" class="alt">FULL GAME · 10 FRAMES</button>`;
    else panel.innerHTML = `<h3>${sg.total}</h3><p>${G.frames} FRAMES · ${sg.total >= G.frames * 20 ? 'RAM SAYS: "SUSPICIOUS."' : sg.total >= G.frames * 10 ? 'RAM SAYS: "THAT\'S A SCORE."' : 'RAM SAYS: "I\'VE SEEN WORSE. I BOWLED IT."'}</p><button data-f="3">AGAIN · 3 FRAMES</button><button data-f="10" class="alt">AGAIN · 10 FRAMES</button><button data-x="1" class="alt">EXIT LANE</button>`;
    panel.classList.add('on'); G.phase = kind === 'mode' ? 'mode' : 'over'; ballsUI.style.opacity = 0; hint.style.opacity = 0;
    panel.querySelectorAll('button').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); audio.ui?.('confirm'); ac(); if (b.dataset.x) return leave(); startGame(+b.dataset.f); })); }
  function startGame(frames) { G.frames = frames; G.rolls = []; G.strikes = 0; G.first = true; panel.classList.remove('on'); newRack(); paintCard(); toAim(true); }
  function toAim(snap) { G.phase = 'aim'; G.ph = 0; const st = rollState(G.rolls, G.frames); info.textContent = `LANE ${laneNo} · FRAME ${st.frame + 1}/${G.frames} · BALL ${st.ball + 1}`;
    ballsUI.style.opacity = 1; hint.style.opacity = 1; hint.textContent = G.first ? '↔ DRAG TO LINE UP   ·   ↑ SWIPE TO THROW (CURVE IT TO HOOK)' : '↔ LINE UP   ·   ↑ SWIPE';
    G.wolf.position.set(G.x - HAND, 0, WZ0); G.wolf.rotation.y = Math.PI; ballMesh.visible = true; guide.visible = true; if (snap) camAim(true); }

  // ------------------------------------------------------------------ input: drag = line up, swipe up = throw
  let pts = null, mode = null;
  pad.addEventListener('pointerdown', (e) => { ac(); if (G.phase === 'result' || G.phase === 'sweep') { G.skip = true; return; } if (G.phase !== 'aim') return;
    pad.setPointerCapture?.(e.pointerId); pts = [{ x: e.clientX, y: e.clientY, t: performance.now() }]; mode = null; G.x0 = G.x; });
  pad.addEventListener('pointermove', (e) => { if (!pts) return; const p = { x: e.clientX, y: e.clientY, t: performance.now() }; pts.push(p); if (pts.length > 80) pts.splice(1, 1);
    const dx = p.x - pts[0].x, dy = pts[0].y - p.y;
    if (!mode) { if (dy > 22 && dy > Math.abs(dx) * 0.8) mode = 'throw'; else if (Math.abs(dx) > 12) mode = 'drag'; }
    if (mode === 'drag') { G.x = clamp(G.x0 + dx / innerWidth * 1.6, -0.42, 0.42); G.wolf.position.x = G.x - HAND; }
    drawTrail(); });
  const endPtr = (e) => { if (!pts) return; const p = pts; pts = null; clearTrailSoon();
    if (mode === 'throw') { const s = readSwipe(p, innerWidth, innerHeight); if (s) throwBall(s); } mode = null; };
  pad.addEventListener('pointerup', endPtr); pad.addEventListener('pointercancel', endPtr);
  function sizeTrail() { trail.width = innerWidth * Math.min(2, devicePixelRatio || 1); trail.height = innerHeight * Math.min(2, devicePixelRatio || 1); }
  function drawTrail() { const k = trail.width / innerWidth; tg.clearRect(0, 0, trail.width, trail.height); if (!pts || pts.length < 2 || mode !== 'throw') return;
    tg.lineCap = 'round'; tg.lineJoin = 'round'; for (let i = 1; i < pts.length; i++) { const u = i / pts.length; tg.strokeStyle = `rgba(255,208,74,${0.15 + u * 0.7})`; tg.lineWidth = (4 + u * 12) * k; tg.beginPath(); tg.moveTo(pts[i - 1].x * k, pts[i - 1].y * k); tg.lineTo(pts[i].x * k, pts[i].y * k); tg.stroke(); } }
  let trailT = 0; function clearTrailSoon() { trailT = 0.35; }

  function throwBall(s) { const b = BALLS[G.ball];
    G.shot = { x: G.x, speed: (4.6 + s.power * 5.0) * b.sp, aim: s.aim * 0.55, hook: s.hook, mass: b.mass, power: s.power };
    G.phase = 'approach'; G.ph = 0; G.first = false; ballsUI.style.opacity = 0; hint.style.opacity = 0; guide.visible = false; navigator.vibrate?.(12); }
  B.parseSwipe = readSwipe;

  // ------------------------------------------------------------------ camera
  const cam = B.camera, cpos = new THREE.Vector3(), clook = new THREE.Vector3(), tpos = new THREE.Vector3(), tlook = new THREE.Vector3();
  function camAim(snap) { const w = G.wolf.position; tpos.set(w.x * 0.45 + 0.1, 2.2, w.z + 3.3); tlook.set(w.x * 0.2 + 0.03, 0.15, -L * 0.6); if (snap) { cpos.copy(tpos); clook.copy(tlook); } }
  function resize() { const a = innerWidth / innerHeight; cam.aspect = a; cam.fov = a < 1 ? 56 : 42; cam.updateProjectionMatrix(); sizeTrail(); }
  addEventListener('resize', () => B.active && resize());

  // ------------------------------------------------------------------ per frame
  let resT = 0;
  B.update = (dt, t) => {
    if (!B.active) return; dt = Math.min(dt, 0.05); const w = G.wolf, ac2 = w.acts;
    let walking = false, armA = 0;
    if (G.phase === 'aim' || G.phase === 'mode' || G.phase === 'over') { camAim(false); if (G.phase === 'aim') holdBall(); }
    if (G.phase === 'approach') { G.ph += dt; const u = Math.min(1, G.ph / 1.0); walking = u < 0.92; w.position.z = lerp(WZ0, WZ1, 1 - (1 - u) * (1 - u));
      armA = u < 0.5 ? -1.15 * Math.sin(u / 0.5 * Math.PI / 2) : -1.15 + 2.0 * Math.sin((u - 0.5) / 0.5 * Math.PI / 2); camAim(false);
      if (u >= 1) { G.phase = 'rolling'; G.ph = 0; holdBall(); sim.launch({ ...G.shot, x: clamp(G.x, -LANE.half + 0.05, LANE.half - 0.05), z: Math.min(ballMesh.position.z, 0.2) }); sim.ball.y = ballMesh.position.y; SND.thud(); G.dodgedNow = false; } }
    if (G.phase === 'rolling') { G.ph += dt; sim.step(dt); const b = sim.ball; b.y = Math.max(LANE.ballR - (b.gutter ? 0.06 : 0), (b.y || 0) - dt * 3); ballMesh.position.set(b.x, b.pit ? -1 : b.y, b.z);
      const sp = Math.hypot(b.vx, b.vz); _v.set(-b.vz, 0, b.vx).normalize(); ballMesh.userData.m.rotateOnWorldAxis(_v.set(b.vz, 0, -b.vx).normalize(), -sp * dt / LANE.ballR); ballMesh.userData.sw.rotation.z += b.hook * dt * 6;
      if (rollG && AC) rollG.gain.setTargetAtTime(b.pit ? 0 : 0.42 * sfxOn() * Math.min(1, sp / 7), AC.currentTime, 0.05), rollF.frequency.setTargetAtTime(b.gutter ? 160 : 230 + sp * 12, AC.currentTime, 0.1);
      const near = b.z < -L + 2.2 || b.pit; if (!near) { tpos.set(b.x * 0.55, Math.max(0.8, 2.1 - G.ph * 0.6), b.z + 2.9); tlook.set(b.x * 0.4, 0.15, Math.max(b.z - 6, -L - 0.5)); }
      else { tpos.set(0, 0.95, -L + 3.0); tlook.set(0, 0.22, -L - 0.4); }
      walking = G.ph < 0.4; w.position.z = WZ1 - Math.min(0.12, G.ph * 0.3);
      if (sim.settled() || G.skipRoll) { G.skipRoll = false; if (rollG && AC) rollG.gain.setTargetAtTime(0, AC.currentTime, 0.05); result(); } }
    if (G.phase === 'result') { resT -= dt; tpos.set(0, 0.95, -L + 3.0); tlook.set(0, 0.22, -L - 0.4); if (resT <= 0 || G.skip) { G.skip = false; big.classList.remove('on'); sweep(); } }
    if (G.phase === 'sweep') { G.ph += dt; sweepAnim(G.ph); tpos.set(0, 0.95, -L + 3.0); tlook.set(0, 0.22, -L - 0.4); if (G.ph > 2.0 || G.skip) { G.skip = false; sweepAnim(9); afterSweep(); } }
    if (G.phase !== 'rolling' && G.phase !== 'result' && G.phase !== 'sweep') syncPinsIdle();
    else syncPins();
    if (sim.dodger >= 0) for (const e of B.eyes.children) { const pu = e.userData.pu, k = G.phase === 'rolling' ? 0.006 : 0.003; pu.position.x = Math.sin(t * 13 + e.position.x * 99) * k; pu.position.y = Math.cos(t * 11 + e.position.x * 50) * k - (sim.dodged ? 0.003 : 0); }
    // wolf: blend walk/idle, add the arm swing after the clip
    if (ac2) { const k = Math.min(1, dt * 8); ac2.walk.setEffectiveWeight(lerp(ac2.walk.getEffectiveWeight(), walking ? 1 : 0, k)); ac2.idle.setEffectiveWeight(lerp(ac2.idle.getEffectiveWeight(), walking ? 0 : 1, k)); if (!ac2.walk.isRunning()) ac2.walk.play(); w.mixer.update(dt); }
    if (G.phase === 'aim') armA = 0.25 + Math.sin(t * 2) * 0.04; if (G.phase === 'rolling') armA = Math.max(0, 0.85 - G.ph * 0.8);
    swing(armA); if (G.phase === 'approach' || G.phase === 'aim') holdBall();
    // the guide: a dotted line straight out from the ball (no hook) so you can line up on the arrows
    if (guide.visible) { guide.position.x = ballMesh.position.x; guide.position.z = 0; }
    hb.position.y = 1.45 + Math.sin(t * 2.3) * 0.08 + (G.hbHop || 0); hb.rotation.y = Math.sin(t * 0.7) * 0.5 + (G.hbSpin || 0); if (G.hbSpin) G.hbSpin = Math.max(0, G.hbSpin - dt * 6); if (G.hbHop) G.hbHop = Math.max(0, G.hbHop - dt * 0.8); for (const wg of hbWings) wg.rotation.z = Math.sin(t * 70) * 0.5;
    B.ballBlob.position.set(ballMesh.position.x, 0.004, ballMesh.position.z); B.ballBlob.visible = ballMesh.visible && ballMesh.position.y > 0 && ballMesh.position.y < 0.5;
    const k = 1 - Math.exp(-dt * (G.phase === 'rolling' ? 4.5 : 3.2)); cpos.lerp(tpos, k); clook.lerp(tlook, k); cam.position.copy(cpos); cam.lookAt(clook);
    if (trailT > 0) { trailT -= dt; if (trailT <= 0) tg.clearRect(0, 0, trail.width, trail.height); }
    paintScreen(t);
    if (G.auto && G.phase === 'aim' && (G.autoWait = (G.autoWait || 0) + dt) > 0.4) { G.autoWait = 0; const a = G.auto.shift(); if (!G.auto.length) G.auto = null; if (a) { G.x = a.x ?? G.x; G.wolf.position.x = G.x - HAND; if (a.ball != null) setBall(a.ball); throwBall({ power: a.power ?? 0.7, aim: a.aim ?? 0, hook: a.hook ?? 0 }); } }
  };
  function syncPinsIdle() { syncPins(); }

  // ------------------------------------------------------------------ after the roll: count, react, pinsetter
  function result() {
    const st0 = rollState(G.rolls, G.frames), pinsUp = st0.pinsUp, down = Math.min(pinsUp, sim.downCount()), fell = sim.pins.map(p => !p.gone && !p.up);
    G.rolls.push(down); const st = rollState(G.rolls, G.frames), sg = scoreGame(G.rolls, G.frames), standing = sim.standing();
    let kind = 'open', label = String(down), sub = '';
    const fresh = st0.fresh, isStrike = fresh && down === 10, isSpare = !fresh && down === pinsUp && pinsUp > 0;
    if (isStrike) { G.strikes++; kind = G.strikes >= 3 && G.strikes % 3 === 0 ? 'turkey' : 'strike'; label = kind === 'turkey' ? 'Turkey!' : 'Strike!'; }
    else { if (fresh || st0.frame !== st.frame || true) { /* streak only counts strikes */ } G.strikes = 0;
      if (isSpare) { kind = 'spare'; label = 'Spare!'; }
      else if (sim.ball?.gutter && down === 0) { kind = 'gutter'; label = 'Gutter'; }
      else if (down === 0) { kind = 'miss'; label = 'Miss'; }
      else if (fresh && isSplit(standing)) { kind = 'split'; label = 'Split'; sub = standing.map((s, i) => s ? PIN_NUM[i] : 0).filter(Boolean).join('–'); }
      else { label = down + (down === 1 ? ' pin' : ' pins'); } }
    big.innerHTML = label + (sub ? `<small>${sub} SPLIT</small>` : `<small>FRAME ${st0.frame + 1} · TOTAL ${sg.frames.slice(0, st0.frame + 1).reduce((a, f) => f.total ?? a, 0) || ''}</small>`);
    big.classList.add('on'); anim = { kind: kind === 'miss' ? 'open' : kind, t0: performance.now() / 1000, dur: 2.6, n: down, fell }; if (anim.kind === 'open' && kind !== 'open') anim.kind = 'open';
    if (kind === 'strike' || kind === 'turkey') { SND.fanfare(); navigator.vibrate?.([30, 40, 70]); G.hbSpin = 12; } else if (kind === 'spare') { SND.fanfare(); G.hbHop = 0.3; } else if (kind === 'gutter' || kind === 'miss') SND.sad();
    let L2 = [];
    if (G.dodgedNow && sim.dodger >= 0) { const p = sim.pins[sim.dodger]; L2.push(p.up ? ['', `The ${PIN_NUM[sim.dodger]} pin saw it coming. It stepped aside.`] : ['', `The ${PIN_NUM[sim.dodger]} pin tried to step aside. Not far enough.`]); if (p.up) L2.push(['RAM', 'It does that.']); }
    if (G.golden >= 0 && fell[G.golden] && !sim.pins[G.golden].counted) { sim.pins[G.golden].counted = true; L2.push(['', 'You knocked down the golden pin.'], ['ROLLER SKATE (from the counter)', 'It\'s worth the same as the others.'], ['ROLLER SKATE (from the counter)', 'That\'s the gag.']); }
    const q = QUIP[kind] || QUIP.open; if (kind !== 'open' || Math.random() < 0.45) L2.push(pick(q));
    const extra = onRoll?.({ down, kind, rolls: G.rolls.slice(), frames: G.frames }); if (extra) L2 = extra.concat(L2);
    if (st.done) { const tot = sg.total; L2.push(['', `Game over. ${tot}.`]); }
    if (L2.length) say(L2);
    paintCard(); resT = kind === 'open' ? 1.3 : 1.8; G.phase = 'result'; G.skip = false; G.lastKind = kind; G.next = st;
    B.last = { down, kind, total: sg.total, rolls: G.rolls.slice(), frames: G.frames, done: st.done };
  }
  function sweep() { G.phase = 'sweep'; G.ph = 0; SND.whir(); const st = G.next; G.sweepFresh = st.done || st.fresh;
    sweepPins = sim.pins.map(p => ({ keep: !G.sweepFresh && !p.gone && p.up && !p.pit })); }
  function sweepAnim(t) {   // 0-0.4 deck lifts standing pins, 0.4-1.2 rake drops + sweeps fallen into the pit, 1.2-2 deck sets pins (or a fresh rack)
    const u = (a, b) => clamp((t - a) / (b - a), 0, 1);
    rake.position.y = lerp(1.1, 0.0, u(0.25, 0.45)) + lerp(0, 1.1, u(1.25, 1.5)); rake.position.z = lerp(-L + 0.4, -L - 1.2, u(0.5, 1.15)) + lerp(0, 1.6, u(1.5, 1.6));
    sim.pins.forEach((p, i) => { if (p.gone) return; const keep = sweepPins[i]?.keep;
      if (keep) { p.lift = Math.sin(Math.PI * u(0.0, 1.9)) * 0.45; }
      else if (!p.pit && rake.position.y < 0.3 && p.z > rake.position.z - 0.08) { p.z = rake.position.z - 0.08; p.y = 0; if (p.z < -L - 1.0) p.pit = true; } });
    deck.position.y = 1.3 - Math.sin(Math.PI * u(0.0, 1.9)) * 0.9 + (G.sweepFresh ? 0 : 0);
    if (G.sweepFresh && t > 1.3 && !G.racked && !G.next.done) { G.racked = true; newRack(); sim.pins.forEach(p => p.lift = 0.6); }
    if (G.racked) { const k = 1 - u(1.4, 1.95); sim.pins.forEach(p => p.lift = 0.6 * k); deck.position.y = 1.3 - 0.95 * (1 - Math.abs(u(1.3, 1.95) * 2 - 1)); } }
  function afterSweep() { const st = G.next; rake.position.set(0, 1.1, -L + 0.4); deck.position.y = 1.3;
    if (!G.sweepFresh) { const dg = sim.dodger; const mask = sim.pins.map((p, i) => sweepPins[i]?.keep); const keepXZ = sim.pins.map(p => [p.x, p.z]); sim.rack(mask); sim.pins.forEach((p, i) => { if (mask[i]) { p.x = keepXZ[i][0]; p.z = keepXZ[i][1]; } }); sim.dodger = dg >= 0 && mask[dg] ? dg : -1; if (sim.dodger < 0 && B.eyes.parent) B.eyes.parent.remove(B.eyes); }
    G.racked = false; sim.pins.forEach(p => p.lift = 0); syncPins();
    if (st.done) { paintCard(); showPanel('over'); G.phase = 'over'; onRoll?.({ over: true, total: scoreGame(G.rolls, G.frames).total, rolls: G.rolls.slice(), frames: G.frames }); return; }
    toAim(true); }

  // ------------------------------------------------------------------ enter / leave (town.js does the room-side walk + swoop)
  B.cover = (title, subt) => new Promise(r => { fade.querySelector('b').textContent = title || ''; fade.querySelector('small').textContent = subt || ''; fade.classList.add('on'); setTimeout(r, 380); });
  B.uncover = () => new Promise(r => { fade.classList.remove('on'); setTimeout(r, 380); });
  B.begin = (wolf, lane) => { if (!B.built) build(); laneNo = lane; drawMask(maskG, 1024, 128); maskTex.needsUpdate = true;
    G.wolf = wolf; G.room = wolf.parent; B.scene.add(wolf); wolf.position.set(G.x - HAND, 0, WZ0); wolf.rotation.y = Math.PI;
    G.bones = { arm: bone('RightArm'), hand: bone('RightHand') }; setBall(G.ball); resize(); B.active = true; document.body.classList.add('lane');
    if (!G.rolls.length || rollState(G.rolls, G.frames).done) { newRack(); G.rolls = []; paintCard(); showPanel('mode'); camAim(true); } else { paintCard(); toAim(true); }
    renderer.compile(B.scene, cam); };
  function leave() { if (!B.active || G.leaving) return; G.leaving = true; const mid = G.rolls.length > 0 && !rollState(G.rolls, G.frames).done; panel.classList.remove('on'); big.classList.remove('on');
    if (rollG && AC) rollG.gain.setTargetAtTime(0, AC.currentTime, 0.05);
    Promise.resolve(onLeave?.({ mid, rolls: G.rolls.slice(), frames: G.frames })).finally(() => { G.leaving = false; }); }
  B.end = () => { B.active = false; document.body.classList.remove('lane'); G.phase = 'idle'; if (rollState(G.rolls, G.frames).done) G.rolls = []; G.rolls = []; };
  B.leave = leave; B.drawCard = drawCard; B.state = G; B.sim = sim;
  // QA / headless hooks: queue throws (x -0.42..0.42, power 0..1, aim -1..1, hook -1..1, ball 0..2); force the twist
  B.test = { mode: (f) => startGame(f), throw: (...a) => { G.auto = a; }, force: (o) => { G.force = o; }, phase: () => G.phase, skip: () => { G.skip = true; } };
  return B;
}
