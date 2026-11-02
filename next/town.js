// town.js — Sunspots town slice: four diorama interiors (Diner, Laundromat, Post Office, DMV) + two errands.
// Each room is its own small THREE.Scene seen through a fixed dollhouse camera (3 walls, open front, ~8x6 m).
// While a room is open the town is hidden and paused (main.js skips its update and renders only the room).
// Mobile budget per room: ~60k tris, <=3 rigged characters animating (the Wolf + 2), 512px webp textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sunspotsApply, sunspotsLowEnd } from './sunspots_material.js';

const M = './models/';
const ROOMS = {
  diner:      { name: 'THE DINER',       wall: '#f3dcb8', trim: '#e0705a', floor: '#d9c6a4', floor2: '#7a5a4a', light: '#ffe2b8' },
  laundromat: { name: 'THE LAUNDROMAT',  wall: '#bfe0e2', trim: '#6aa4b8', floor: '#e8e2cf', floor2: '#c9b9a0', light: '#eaf6ff' },
  post:       { name: 'THE POST OFFICE', wall: '#d9d0a8', trim: '#5f6f3c', floor: '#b89a74', floor2: '#a3855f', light: '#fff0c8' },
  dmv:        { name: 'THE DMV',         wall: '#c6d6a6', trim: '#7d8a6a', floor: '#b8b8a8', floor2: '#a4a494', light: '#f0ffe6' },
  // slice 2 (Town Plan: KSUN, Crow's Yard, Gutter Bowl + Second Sun Thrift) — mission Dead Air
  ksun:       { name: 'KSUN RADIO & CH. 2', wall: '#d8c7e6', trim: '#5a4a8a', floor: '#5a5468', floor2: '#4a4458', light: '#fff0e0' },
  yard:       { name: 'CROW\'S YARD',       wall: '#c9a77a', trim: '#7a5a3a', floor: '#c9a06a', floor2: '#b88f5a', light: '#ffe6b8' },
  bowl:       { name: 'GUTTER BOWL',        wall: '#6b4c8a', trim: '#ff6fae', floor: '#e3b878', floor2: '#d6a868', light: '#ffe0f0' },
  thrift:     { name: 'SECOND SUN THRIFT',  wall: '#f2d27a', trim: '#c98a3a', floor: '#c9785a', floor2: '#b86a4f', light: '#fff0d0' },
};
// outside: which building is which (diner door is LAYOUT.spots.diner_door; the three adobes face the square)
const DOORS = [
  { room: 'diner', x: 1.5, z: -7.3, sign: null },
  { room: 'laundromat', x: 11.0, z: -10.6, sign: 'LAUNDROMAT' },
  { room: 'post', x: 16.3, z: -1.9, sign: 'POST OFFICE' },
  { room: 'dmv', x: -4.4, z: -15.8, sign: 'DMV' },
  { room: 'thrift', x: -10.9, z: -9.3, sign: 'THRIFT $2' },       // adobe_a (-14,-11)
  { room: 'ksun', x: -15.5, z: 0.3, sign: 'KSUN · CH. 2' },       // adobe_a (-19,1)
  { room: 'yard', x: -20.6, z: -8.2, sign: 'CROW\'S YARD' },      // adobe_b (-24,-9)
  { room: 'bowl', x: 20.4, z: -13.6, sign: 'GUTTER BOWL' },       // adobe_small (23,-15)
];
const FENCE = { x: -15, z: 10.8 }; // the Crow's roadside collection (fence-stool), south of the town street

export function createTown(ctx) {
  const { renderer, mainScene, load, normalize, feltMat, level, wolfState, audio = {} } = ctx;
  const LOW = sunspotsLowEnd();
  const T = { active: null, scene: null, camera: new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80), rooms: {}, busy: false };
  const S = { air: 0, skates: 0, dig: 0, sock: 0, num: 0, hubcap: false, sock2: false, letter: false, ticket: 0, waitT: 0, coffee: 0, held: null, seen: {} };
  const placeholders = new Set();
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ DOM (injected, so index.html stays untouched)
  const css = document.createElement('style');
  css.textContent = `
  #roomBtn{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 64px);transform:translateX(-50%);z-index:7;display:none;border:0;border-radius:999px;padding:15px 26px;font:700 16px Futura,Avenir,sans-serif;letter-spacing:.18em;color:#3a1f2a;background:#ffc98a;box-shadow:0 5px 0 #c27b45,0 10px 24px rgba(0,0,0,.25)}
  body.scene #roomBtn,body.driving #roomBtn,body.ended #roomBtn,body.room #roomBtn{display:none!important}
  #townObj{position:fixed;left:12px;top:calc(env(safe-area-inset-top) + 92px);z-index:6;max-width:62vw;color:#fff3dc;font:600 12px Futura,Avenir,sans-serif;letter-spacing:.1em;text-shadow:0 1px 4px rgba(40,10,30,.7);pointer-events:none;white-space:pre-line}
  body.scene #townObj,body.driving #townObj{display:none}
  body.room #hud,body.room #drive,body.room #eyeBtn,body.room #wildBtn,body.room #title,body.room #getIn,body.room #hint,body.room #joy,body.room #bubbles,body.room #grain{display:none!important}
  body.room #townObj{top:calc(env(safe-area-inset-top) + 54px)}
  #roomUI{position:fixed;inset:0;z-index:7;display:none;pointer-events:none;font-family:Futura,Avenir,sans-serif}
  body.room #roomUI{display:block}
  #roomName{position:absolute;left:0;right:0;text-align:center;top:calc(env(safe-area-inset-top) + 16px);color:#fff3dc;font-weight:700;font-size:15px;letter-spacing:.24em}
  #roomExit{position:absolute;right:12px;top:calc(env(safe-area-inset-top) + 10px);pointer-events:auto;border:0;border-radius:999px;padding:10px 18px;font:700 13px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:#fff3dc;box-shadow:0 3px 0 #b9a58a}
  #roomChips{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 12px);display:flex;flex-wrap:wrap;gap:7px;justify-content:center;padding:0 10px;pointer-events:auto}
  #roomChips button{border:0;border-radius:999px;padding:9px 13px;font:700 11px Futura,Avenir,sans-serif;letter-spacing:.12em;color:#3a1f2a;background:#ffe6c4;box-shadow:0 3px 0 #c9a37a}
  #roomChips button.new{background:#ffc98a}
  body.room #sceneSub{bottom:calc(env(safe-area-inset-bottom) + 118px)}
  #roomCurtain{position:fixed;inset:0;z-index:20;pointer-events:none;overflow:hidden}
  #roomCurtain i{position:absolute;top:0;bottom:0;width:51%;transition:transform .5s cubic-bezier(.6,0,.3,1);
    background:radial-gradient(ellipse at 50% 120%,rgba(0,0,0,.35),transparent 60%),repeating-linear-gradient(90deg,#6b1c30 0 10px,#8d2a41 10px 26px,#9c3149 26px 32px,#7a2236 32px 44px);box-shadow:inset 0 -30px 40px rgba(0,0,0,.35)}
  #roomCurtain i.l{left:0;transform:translateX(-102%)} #roomCurtain i.r{right:0;transform:translateX(102%)}
  #roomCurtain.shut i{transform:none} #roomCurtain b{position:absolute;left:0;right:0;top:46%;text-align:center;color:#fff3dc;font:700 20px Futura,Avenir,sans-serif;letter-spacing:.3em;opacity:0;transition:opacity .3s;text-shadow:0 2px 8px rgba(0,0,0,.5)}
  #roomCurtain.shut b{opacity:1}`;
  document.head.appendChild(css);
  const ui = document.createElement('div');
  ui.innerHTML = `<button id="roomBtn"></button><div id="townObj"></div>
    <div id="roomUI"><div id="roomName"></div><button id="roomExit">EXIT</button><div id="roomChips"></div></div>
    <div id="roomCurtain"><i class="l"></i><i class="r"></i><b></b></div>`;
  while (ui.firstChild) document.body.appendChild(ui.firstChild);
  const btn = $('roomBtn'), chips = $('roomChips'), curtain = $('roomCurtain'), sub = $('sceneSub'), subName = $('sceneSubName'), subText = $('sceneSubText');
  let near = null;
  btn.addEventListener('click', () => { if (near) near.room ? enter(near.room) : talkOutside(); });
  $('roomExit').addEventListener('click', () => exit());

  // ------------------------------------------------------------------ helpers
  const box = (w, h, d, color, r = 0.04) => { const g = new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2, h / 2, d / 2) * 0.99); g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, feltMat(color)); m.castShadow = m.receiveShadow = !LOW; return m; };
  const cyl = (rt, rb, h, color, seg = 14) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); const m = new THREE.Mesh(g, feltMat(color)); m.castShadow = m.receiveShadow = !LOW; return m; };
  const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  function sign(text, w = 1.6, h = 0.4, bg = '#fff3dc', fg = '#3a1f2a', size = 0.5) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'); let fs = Math.round(c.height * size / lines.length); g.font = `700 ${fs}px Futura, Avenir, sans-serif`;
    for (const L of lines) while (g.measureText(L).width > c.width * 0.92 && fs > 10) { fs -= 2; g.font = `700 ${fs}px Futura, Avenir, sans-serif`; }
    lines.forEach((L, i) => g.fillText(L, c.width / 2, c.height * (i + 0.5) / lines.length));
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); return m;
  }
  const ph = (name, o) => { placeholders.add(name); o.userData.placeholder = name; return o; };
  async function glb(file, h, look = 'object', opt = {}) {
    const g = await load(M + file); const root = g.scene; root.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.receiveShadow = !LOW; if (o.isSkinnedMesh) o.frustumCulled = false; } });
    normalize(root, h); sunspotsApply(root, look, h);
    const wrap = new THREE.Group(); wrap.add(root); wrap.userData.h = h;
    if (g.animations.length) { const mx = new THREE.AnimationMixer(root); wrap.mixer = mx; wrap.acts = {};
      for (const c of g.animations) { const k = /idle/i.test(c.name) ? 'idle' : /walk/i.test(c.name) ? 'walk' : /seat/i.test(c.name) ? 'seated' : c.name; wrap.acts[k] = mx.clipAction(c); }
      const a = wrap.acts[opt.clip || 'idle'] || Object.values(wrap.acts)[0]; a.play(); if (opt.t != null) a.time = opt.t * a.getClip().duration; a.timeScale = opt.speed ?? 1; mx.update(0); }
    return wrap;
  }

  // ------------------------------------------------------------------ slice-2 helpers (code shapes + canvas, felt / matte only)
  const mx4 = new THREE.Matrix4();
  function sunPic(w, h, caption = '', bg = '#9fd6e8') { // a picture of the sun (weather wall, scoreboard, CH. 2)
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    const cy = c.height * (caption ? 0.4 : 0.5), r = Math.min(c.width, c.height) * (caption ? 0.24 : 0.3), cx = caption && c.width > 2.5 * c.height ? c.width * 0.22 : c.width / 2;
    g.strokeStyle = g.fillStyle = '#ffd04a'; g.lineWidth = r * 0.12; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15); g.lineTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45); g.stroke(); }
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = '#fff3dc'; g.beginPath(); g.ellipse(cx, cy, r * 0.62, r * 0.34, 0, 0, 7); g.fill();
    g.fillStyle = '#3a1f2a'; g.beginPath(); g.arc(cx, cy, r * 0.22, 0, 7); g.fill();
    g.strokeStyle = '#c9583a'; g.lineWidth = r * 0.08; g.beginPath(); g.ellipse(cx, cy, r * 0.66, r * 0.42, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    if (caption) { const side = cx !== c.width / 2; g.fillStyle = bg === '#9fd6e8' ? '#3a1f2a' : '#fff3dc'; let fs = Math.round(c.height * (side ? 0.3 : 0.13)); const font = () => `700 ${fs}px Futura, Avenir, sans-serif`; g.font = font();
      const maxW = side ? c.width * 0.6 : c.width * 0.92; while (g.measureText(caption).width > maxW && fs > 10) { fs -= 2; g.font = font(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(caption, side ? c.width * 0.64 : c.width / 2, side ? c.height / 2 : c.height * 0.85); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 }));
  }
  function staticScreen(w, h) { // CH. 2 monitor: TV static (64px canvas, nearest filter, refreshed ~11x/s)
    const c = document.createElement('canvas'); c.width = 64; c.height = Math.round(64 * h / w); const g = c.getContext('2d'); const img = g.createImageData(c.width, c.height);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx }));
    m.userData.fuzz = () => { const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = 70 + Math.random() * 170 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } g.putImageData(img, 0, 0); tx.needsUpdate = true; };
    m.userData.fuzz(); return m;
  }
  function rabbitEars(s = 1) { // felt placeholder: rabbit-ear antenna
    const g = ph('rabbit-ear antenna', new THREE.Group()); const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), feltMat('#3a3a3a')); g.add(b);
    for (const sx of [-1, 1]) { const r = cyl(0.008 * s, 0.012 * s, 0.5 * s, '#c9c9c0', 5); r.position.y = 0.05 * s; r.rotation.z = sx * 0.45; g.add(r);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02 * s, 6, 4), feltMat('#c9c9c0')); tip.position.set(-sx * Math.sin(0.45) * 0.5 * s, 0.05 * s + Math.cos(0.45) * 0.5 * s, 0); g.add(tip); }
    return g;
  }

  // ------------------------------------------------------------------ room shell (floor + 3 walls + soffit, open front)
  function shell(R) {
    const g = new THREE.Group(), W = 8, D = 6, H = 3.2;
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const f = fc.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { f.fillStyle = (i + j) % 2 ? R.floor : R.floor2; f.fillRect(i * 32, j * 32, 32, 32); }
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(2, 1.5);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.2, D + 0.2), new THREE.MeshStandardMaterial({ map: ft, roughness: 1 })); floor.position.set(0, -0.1, 0); floor.receiveShadow = true; g.add(floor);
    const back = box(W + 0.4, H, 0.2, R.wall, 0.02); at(back, 0, 0, -D / 2 - 0.1); g.add(back);
    for (const s of [-1, 1]) { const w = box(0.2, H, D + 0.2, R.wall, 0.02); at(w, s * (W / 2 + 0.1), 0, 0); g.add(w); }
    const base = box(W, 0.18, 0.06, R.trim, 0.02); at(base, 0, 0, -D / 2 + 0.02); g.add(base);
    const top = box(W + 0.6, 0.22, 0.4, R.trim, 0.04); at(top, 0, H, -D / 2 + 0.05); g.add(top);           // soffit lip along the back
    for (const s of [-1, 1]) { const t2 = box(0.4, 0.22, D + 0.4, R.trim, 0.04); at(t2, s * (W / 2 + 0.1), H, 0); g.add(t2); }
    const lip = box(W + 0.8, 0.28, 0.3, '#3a1f2a', 0.06); at(lip, 0, -0.28, D / 2 + 0.05); g.add(lip);      // stage lip
    return g;
  }

  // ------------------------------------------------------------------ the four rooms
  const BUILD = {
    async diner(G, A) {
      const counter = ph('diner counter', box(4.2, 1.0, 0.7, '#e0705a', 0.06)); at(counter, -1.0, 0, -0.9); G.add(counter);
      const ctop = box(4.4, 0.08, 0.85, '#f6efe0', 0.03); at(ctop, -1.0, 1.0, -0.9); G.add(ctop);
      const [stove, bear, gecko, booth, chair] = await Promise.all([glb('town2/stove.glb', 1.6), glb('town2/bear_lo.glb', 1.85, 'bear', { clip: 'idle', t: 0.2 }),
        glb('town2/gecko_lo.glb', 1.05, 'gecko', { clip: 'idle', t: 0.6 }), glb('town2/booth_prop.glb', 1.25, 'feltobj'), glb('town2/eye_chair.glb', 0.95)]);
      at(stove, -1.6, 0, -2.35, 0.25); G.add(stove);
      const chairs = [chair, chair.clone(true), chair.clone(true)]; chairs.forEach((c, i) => { at(c, -2.4 + i * 1.3, 0, 0.15, 0); G.add(c); });
      at(booth, 3.1, 0, -2.0, -Math.PI / 2); G.add(booth); at(bear, 2.6, 0, -0.6, -0.5); G.add(bear);
      at(gecko, -0.25, 1.08, -0.95, 0.15); G.add(gecko);   // upright, standing on the counter next to the pie (always upright: never on all fours)
      const pieCase = ph('pie case', new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.35, roughness: 0.2 })));
      at(pieCase, 0.6, 1.31, -0.95); G.add(pieCase);
      const pie = ph('pie', cyl(0.2, 0.22, 0.09, '#d98a3a', 16)); at(pie, 0.6, 1.09, -0.95); G.add(pie);
      const cup = ph('coffee cup', cyl(0.07, 0.06, 0.12, '#fff3dc', 10)); at(cup, -1.1, 1.08, -0.65); G.add(cup);
      const coffee = cyl(0.062, 0.062, 0.005, '#3a1f12', 10); at(coffee, -1.1, 1.19, -0.65); G.add(coffee);
      const menu = ph('menu', sign('MENU\n1. The Menu', 0.34, 0.46, '#fff3dc', '#e0705a', 0.6)); at(menu, -2.3, 1.32, -0.75, 0.2); G.add(menu);
      const s1 = sign('THINK ABOUT SOUP', 2.4, 0.42, '#e0705a', '#fff3dc'); at(s1, -1.2, 2.45, -2.98); G.add(s1);
      const win = sign('OPEN', 0.9, 0.36, '#9fd6b8', '#24331f'); at(win, 2.4, 2.2, -2.98); G.add(win);
      A.wolfSpot = [-0.2, 1.6];
      A.anim = [gecko, bear]; A.blink = chairs;
      A.tick = (dt, t) => {
        for (let i = 0; i < chairs.length; i++) { const p = ((t * 0.37 + i * 0.29) % 3.1); chairs[i].scale.y = p < 0.12 ? 0.86 : 1; } };
      A.who = [
        { id: 'stove', label: 'STOVE', o: stove, talk: () => S.coffee % 2 ? [['STOVE', 'Soup\'s on.'], ['WOLF', 'On what?'], ['STOVE', 'On.']] : [['STOVE', 'Think about soup.'], ['WOLF', 'I\'ll have the—'], ['STOVE', 'Think about it.']] },
        { id: 'coffee', label: 'COFFEE', o: cup, talk: () => { S.coffee++; return [['STOVE', 'Refill.'], ['', `Refill number ${S.coffee}. You haven't had any.`]]; } },
        { id: 'gecko', label: 'GECKO', o: gecko, talk: () => [['GECKO', 'I was on the ceiling since 7 AM.'], ['GECKO', 'Came down for the pie.'], ['WOLF', 'It\'s for display.'], ['GECKO', 'So am I, man.']] },
        { id: 'menu', label: 'MENU', o: menu, talk: () => [['MENU', '1. The Menu.'], ['WOLF', 'What\'s on the menu?'], ['STOVE', 'The menu.']] },
        { id: 'bear', label: 'BEAR', o: bear, talk: () => [['BEAR', 'This booth is saved.'], ['WOLF', 'For who?'], ['BEAR', 'For the booth.']] },
        { id: 'chair', label: 'STOOL', o: chairs[1], talk: () => [['', 'The stool blinks.'], ['WOLF', '...'], ['', 'You blink first.']] },
        { id: 'pie', label: 'PIE', o: pie, talk: () => [['STOVE', 'That pie is for display.'], ['WOLF', 'Can I have a slice?'], ['STOVE', 'Of the display?']] },
      ];
    },
    async laundromat(G, A) {
      const [washer, sock, glove, ant] = await Promise.all([glb('town2/washing_machine.glb', 1.3), glb('town2/argyle_sock.glb', 0.95, 'feltobj'),
        glb('town2/rubber_glove.glb', 0.55), glb('town2/anteater_lo.glb', 1.55, 'anteater')]);
      at(washer, -2.7, 0, -2.3, 0.15); G.add(washer); washer.userData.x0 = -2.7;
      for (let i = 0; i < 2; i++) { const m = ph('washers (extra)', box(1.0, 1.15, 0.95, '#f4f0e6', 0.12)); at(m, -1.2 + i * 1.25, 0, -2.4); G.add(m);
        const door = cyl(0.3, 0.3, 0.04, '#9ccbd8', 18); door.rotation.x = Math.PI / 2; door.position.set(-1.2 + i * 1.25, 0.62, -1.9); G.add(door); }
      const table = ph('folding table', box(1.6, 0.85, 0.8, '#e8c48a', 0.04)); at(table, 1.7, 0, -0.6); G.add(table);
      for (let i = 0; i < 3; i++) { const t = box(0.38, 0.06, 0.3, ['#e98a8a', '#9fd6b8', '#f2d27a'][i], 0.02); at(t, 1.2 + i * 0.32, 0.85 + i * 0.06, -0.55); G.add(t); }
      at(glove, 2.15, 0.85, -0.5, -0.5); G.add(glove);
      const board = ph('LOST SOCKS board', sign('LOST SOCKS\nif found, don\'t tell them', 1.7, 1.0, '#c99a62', '#3a1f2a', 0.42)); at(board, 2.6, 1.9, -2.97); G.add(board);
      const vend = ph('vending machine', box(0.9, 1.9, 0.75, '#6aa4b8', 0.06)); at(vend, -3.45, 0, 0.6, Math.PI / 2); G.add(vend);
      const vs = sign('SMALLER\nDETERGENT', 0.6, 0.5, '#fff3dc', '#3a5f6e', 0.5); at(vs, -3.06, 1.25, 0.6, Math.PI / 2); G.add(vs);
      const change = ph('change machine', box(0.5, 1.2, 0.4, '#b8b4a8', 0.04)); at(change, -3.6, 0, -0.9, Math.PI / 2); G.add(change);
      const cs = sign('CHANGE', 0.36, 0.14, '#3a1f2a', '#fff3dc'); at(cs, -3.38, 1.0, -0.9, Math.PI / 2); G.add(cs);
      at(sock, -0.5, 0, 0.7, 0.3); G.add(sock); at(ant, 2.9, 0, 1.0, -0.7); G.add(ant);
      const mate = ph('second sock (mustard)', box(0.28, 0.6, 0.16, '#d9a43a', 0.12)); const toe = box(0.45, 0.2, 0.18, '#d9a43a', 0.09); toe.position.set(0.1, 0, 0); mate.add(toe);
      at(mate, 0.1, 0, 0.75, -0.3); mate.visible = S.sock >= 6; G.add(mate); A.mate = mate;
      const reunited = sign('REUNITED: ARGYLE + MUSTARD\nStill don\'t match.', 1.5, 0.4, '#fff3dc', '#3a1f2a', 0.5); at(reunited, 2.6, 1.2, -2.95); reunited.visible = S.sock >= 6; G.add(reunited); A.reunited = reunited;
      A.wolfSpot = [0.6, 1.8]; A.anim = [washer, ant]; A.spin = 0;
      A.tick = (dt, t) => { if (A.spin > 0) { A.spin -= dt; washer.position.x = washer.userData.x0 + Math.sin(t * 60) * 0.025; washer.rotation.z = Math.sin(t * 47) * 0.02; if (A.spin <= 0) { washer.position.x = washer.userData.x0; washer.rotation.z = 0; A.afterSpin?.(); } } };
      const spin = (then) => { A.spin = 2.2; A.afterSpin = () => { A.afterSpin = null; say(then); }; say([['', 'The machine starts its spin cycle.']], true); };
      A.who = [
        { id: 'washer', label: 'WASHING MACHINE', o: washer, talk: () => { if (A.spin > 0) return null;
          if (S.sock === 1) { spin([['WASHING MACHINE', 'East.']]); step('sock', 2); return 'async'; }
          spin([['WASHING MACHINE', S.sock >= 2 ? 'Rinse.' : 'Spin.'], ['', 'It only talks during the spin.']]); return 'async'; } },
        { id: 'sock', label: 'ARGYLE SOCK', o: sock, talk: () => {
          if (S.sock === 0) { step('sock', 1); return [['ARGYLE SOCK', 'I came in a pair.'], ['ARGYLE SOCK', 'I\'m leaving as a single.'], ['ARGYLE SOCK', 'Ask the machine. It only talks during spin.']]; }
          if (S.sock === 5) { step('sock', 6); A.mate.visible = A.reunited.visible = true; return [['', 'The socks are reunited.'], ['WOLF', 'You don\'t match.'], ['ARGYLE SOCK', 'We never did.']]; }
          if (S.sock >= 6) return [['ARGYLE SOCK', 'We\'re back together.'], ['ARGYLE SOCK', 'It\'s fine.']];
          return [['ARGYLE SOCK', 'Any luck?'], ['WOLF', 'Some.']]; } },
        { id: 'ant', label: 'ANTEATER', o: ant, talk: () => {
          const a = [['ANTEATER', 'I smell something.'], ['ANTEATER', 'It\'s gossip.'], ['WOLF', 'It\'s fabric softener.']];
          if (S.sock === 2) { step('sock', 3); return [...a, ['ANTEATER', 'Wool went east. To the Post Office.'], ['ANTEATER', 'It smelled nervous.']]; }
          return a; } },
        { id: 'glove', label: 'RUBBER GLOVE', o: glove, talk: () => [['', 'The Rubber Glove grades your folding.'], ['', 'It holds up one finger.'], ['WOLF', 'Out of what?'], ['RUBBER GLOVE', 'One.']] },
        { id: 'vend', label: 'VENDING', o: vend, talk: () => [['', 'SMALLER DETERGENT — $1.'], ['', 'It\'s the same box. It\'s just further away.']] },
        { id: 'change', label: 'CHANGE MACHINE', o: change, talk: () => [['', 'You put in a dollar.'], ['', 'It gives you smaller change.'], ['', 'A dollar. Smaller.']] },
        { id: 'board', label: 'LOST SOCKS', o: board, talk: () => S.sock >= 6 ? [['', 'LOST SOCKS board: one reunion pinned up.'], ['', 'Everyone else is still missing. Nobody is looking.']] : [['', 'LOST SOCKS. If found, don\'t tell them.']] },
      ];
    },
    async post(G, A) {
      const counter = ph('post office counter', box(5.0, 1.05, 0.7, '#5f6f3c', 0.05)); at(counter, -0.6, 0, -1.3); G.add(counter);
      const ctop = box(5.2, 0.07, 0.85, '#e9dfc0', 0.03); at(ctop, -0.6, 1.05, -1.3); G.add(ctop);
      const boxes = ph('P.O. boxes', new THREE.Group()); const pb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.26, 0.06), feltMat('#c9a35a'), 36);
      const mtx = new THREE.Matrix4(); for (let i = 0; i < 36; i++) { mtx.setPosition(-3.3 + (i % 9) * 0.38, 1.3 + Math.floor(i / 9) * 0.3, -2.95); pb.setMatrixAt(i, mtx); } boxes.add(pb); G.add(boxes);
      const [mail, corded, bear] = await Promise.all([glb('town2/mailbox.glb', 1.35), glb('town2/corded_box.glb', 0.8), glb('town2/bear_lo.glb', 1.85, 'bear', { clip: 'idle', t: 0.4, speed: 0.7 })]);
      at(corded, -1.2, 1.1, -1.35, 0.1); G.add(corded); at(mail, 3.0, 0, 0.3, -0.6); G.add(mail);
      const scale = ph('parcel scale (floor)', box(0.9, 0.12, 0.8, '#b8b4a8', 0.04)); at(scale, 1.2, 0, 0.6); G.add(scale);
      const read = ph('scale readout', sign('2 BEARS', 0.5, 0.2, '#2a2a2a', '#9fd6b8', 0.6)); at(read, 1.2, 0.6, 1.05); const post = cyl(0.03, 0.03, 0.5, '#7a7a70', 6); at(post, 1.2, 0, 1.0); G.add(post, read);
      at(bear, 1.2, 0.12, 0.55, 0.3); G.add(bear);
      const stamp = ph('stamp machine', box(0.7, 1.5, 0.5, '#c9584a', 0.06)); at(stamp, -3.5, 0, 0.6, Math.PI / 2); G.add(stamp);
      const ss = sign('STAMPS', 0.5, 0.16, '#fff3dc', '#c9584a'); at(ss, -3.24, 1.2, 0.6, Math.PI / 2); G.add(ss);
      const parcels = ph('FRAGILE parcels', new THREE.Group()); [[0, 0, 0.6, '#c9a36a'], [0.1, 0.45, 0.45, '#d8b47a'], [-0.05, 0.8, 0.32, '#c08f5a']].forEach(([x, y, s, c]) => { const b = box(s, s * 0.75, s, c, 0.03); b.position.set(x, y, 0); parcels.add(b); });
      const fr = sign('FRAGILE', 0.5, 0.14, '#c9584a', '#fff3dc'); fr.position.set(0, 0.24, 0.31); parcels.add(fr); at(parcels, -2.6, 0, 1.0, 0.2); G.add(parcels);
      const s1 = sign('PLEASE TAKE A NUMBER\nThe numbers are at the DMV', 2.4, 0.55, '#fff3dc', '#5f6f3c', 0.5); at(s1, 1.8, 2.55, -2.97); G.add(s1);
      A.wolfSpot = [-0.4, 1.4]; A.anim = [mail, bear];
      A.who = [
        { id: 'corded', label: 'CORDED BOX', o: corded, talk: () => {
          if (S.sock === 3) { step('sock', 4); return [['CORDED BOX', 'Next.'], ['WOLF', 'I\'m looking for a sock.'], ['CORDED BOX', 'A sock came in. Tried to mail itself.'], ['CORDED BOX', 'To "Elsewhere".'], ['CORDED BOX', 'Undeliverables go to the Collection. By the road. The Crow runs it.'], ['CORDED BOX', 'Also there\'s a parcel for you.']]; }
          return [['CORDED BOX', 'Next.'], ['WOLF', 'There\'s no line.'], ['CORDED BOX', 'Next anyway.']]; } },
        { id: 'mail', label: 'MAILBOX', o: mail, talk: () => {
          if (S.num === 3) { step('num', 4); S.letter = true; return [['', 'You mail yourself a letter.'], ['MAILBOX', '(chewing) It\'s addressed to you.'], ['MAILBOX', 'From you.'], ['MAILBOX', 'You are real.'], ['', 'Got: proof you exist.']]; }
          if (S.sock === 3 || S.sock === 4) return [['MAILBOX', '(chewing)'], ['MAILBOX', 'I ate the sock\'s address.'], ['MAILBOX', 'It was mostly "Else".']];
          return [['MAILBOX', '(chewing)'], ['MAILBOX', 'Postcards.'], ['MAILBOX', 'Wish you were here.']]; } },
        { id: 'bear', label: 'BEAR', o: bear, talk: () => [['', 'Bear steps on the scale.'], ['', 'TWO BEARS.'], ['BEAR', 'It\'s the sweater.']] },
        { id: 'parcels', label: 'PARCELS', o: parcels, talk: () => {
          if (S.sock >= 3 && !S.hubcap) { S.hubcap = true; save(); return [['CORDED BOX', 'Parcel for Wolf. FRAGILE.'], ['', 'It\'s a hubcap.'], ['', 'It\'s felt.'], ['', 'Got: one hubcap.']]; }
          return [['', 'FRAGILE.'], ['', 'It\'s just felt. All of it.']]; } },
        { id: 'stamp', label: 'STAMPS', o: stamp, talk: () => [['', 'STAMPS. Lick at your own risk.'], ['', 'The machine licks you first.']] },
        { id: 'sign', label: 'SIGN', o: s1, talk: () => [['', 'PLEASE TAKE A NUMBER.'], ['', 'The numbers are at the DMV.']] },
      ];
    },
    async dmv(G, A) {
      const [watch, win, moth, heron, chair] = await Promise.all([glb('town2/pocket_watch.glb', 1.0), glb('town2/window_box.glb', 1.1), glb('town2/moth_lo.glb', 1.5, 'moth', { clip: 'seated' }),
        glb('town2/heron_lo.glb', 1.9, 'heron', { clip: 'idle', t: 0.3, speed: 0 }), glb('town2/eye_chair.glb', 0.95)]);
      const ledge = ph('service window counter', box(2.2, 1.05, 0.6, '#7d8a6a', 0.05)); at(ledge, 1.9, 0, -2.6); G.add(ledge);
      at(win, 1.9, 1.05, -2.65); G.add(win); win.userData.sy = win.scale.y;
      const w1 = sign('WINDOW 1 (of 1)', 1.3, 0.26, '#fff3dc', '#3a1f2a'); at(w1, 1.9, 2.55, -2.97); G.add(w1);
      const shelf = box(1.0, 0.08, 0.5, '#7d8a6a', 0.02); at(shelf, -0.6, 1.9, -2.75); G.add(shelf);
      at(watch, -0.6, 1.98, -2.7, 0.1); G.add(watch);
      const now = ph('NOW SERVING display', sign('NOW SERVING\n2', 0.9, 0.5, '#2a2a2a', '#ff6a4a', 0.55)); at(now, -2.0, 2.4, -2.97); G.add(now); A.now = now;
      const c2 = chair.clone(true); at(chair, -2.4, 0, 0.3); at(c2, -1.1, 0, 0.3); G.add(chair, c2);
      at(moth, -2.4, 0.42, 0.42); G.add(moth);
      at(heron, 0.9, 0, -1.4, Math.PI * 0.85); G.add(heron);
      const post = ph('take-a-number post', new THREE.Group()); const pole = cyl(0.04, 0.05, 1.2, '#9a9a90', 8); const disp = box(0.3, 0.24, 0.2, '#e0453a', 0.05); disp.position.y = 1.2; post.add(pole, disp); at(post, -3.1, 0, 1.9); G.add(post);
      const plant = ph('plant (waiting longest)', new THREE.Group()); const pot = cyl(0.22, 0.17, 0.35, '#c9785a', 12); plant.add(pot);
      for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), feltMat('#5f8a4a')); l.scale.set(0.6, 1.4, 0.3); l.position.set(Math.sin(i * 1.3) * 0.12, 0.55 + (i % 2) * 0.12, Math.cos(i * 1.3) * 0.12); l.rotation.z = Math.sin(i * 2) * 0.5; plant.add(l); }
      const tk = sign('3', 0.12, 0.09, '#fff3dc', '#e0453a', 0.8); tk.position.set(0, 0.42, 0.24); plant.add(tk); at(plant, -3.4, 0, -2.4); G.add(plant);
      const chart = ph('eye chart', sign('E\nF P\nT O Z\nfish', 0.6, 0.85, '#fff3dc', '#2a2a2a', 0.75)); at(chart, -3.88, 1.6, -1.0, Math.PI / 2); G.add(chart);
      A.wolfSpot = [0.2, 1.7]; A.anim = [watch, moth];
      A.tick = (dt) => { if (A.shut > 0) { A.shut -= dt; win.scale.y = win.userData.sy * (A.shut > 0.2 ? 0.55 : 1); } };
      const shut = () => { A.shut = 1.4; };
      A.setNow = (n) => { A.now.material.map.dispose(); const s = sign('NOW SERVING\n' + n, 0.9, 0.5, '#2a2a2a', '#ff6a4a', 0.55); A.now.material.map = s.material.map; A.now.material.needsUpdate = true; };
      if (S.num >= 6) A.setNow(99);
      A.who = [
        { id: 'moth', label: 'MOTH', o: moth, talk: () => {
          if (S.num === 0) { step('num', 1); return [['MOTH', 'I\'m not driving you anywhere else.'], ['MOTH', 'Registration expired.'], ['WOLF', 'When?'], ['MOTH', '1979.'], ['MOTH', 'I\'ve been renewing since. Take a number.']]; }
          if (S.num >= 7) return [['MOTH', 'Destination.']];
          return [['MOTH', 'Still renewing.'], ['MOTH', 'It\'s going well.']]; } },
        { id: 'post', label: 'TAKE A NUMBER', o: post, talk: () => {
          if (S.num === 1) { step('num', 2); S.ticket = 99; save(); return [['', 'You take a number. 99.'], ['POCKET WATCH', 'Now serving: 2.']]; }
          return S.ticket ? [['', 'You already have 99.'], ['', 'The plant has 3.']] : [['', 'The numbers are for people with errands.']]; } },
        { id: 'watch', label: 'POCKET WATCH', o: watch, talk: () => S.num >= 6 ? [['POCKET WATCH', 'Now serving: 99.'], ['POCKET WATCH', 'It\'s 1:59. It\'s always 1:59.']] : [['POCKET WATCH', 'Now serving: 2.'], ['WOLF', 'How long has it been 2?'], ['POCKET WATCH', 'Since 1:59.']] },
        { id: 'win', label: 'WINDOW 1', o: win, talk: () => {
          if (S.num === 2) { step('num', 3); shut(); return [['WINDOW BOX', 'Next.'], ['WINDOW BOX', 'Proof you exist?'], ['WOLF', 'I\'m right here.'], ['WINDOW BOX', 'Proof.'], ['', 'The window shuts. Try the Post Office.']]; }
          if (S.num === 6) { step('num', 7); A.setNow('—'); return [['WINDOW BOX', '99.'], ['WINDOW BOX', 'Your car is registered.'], ['WINDOW BOX', 'As footwear.'], ['WINDOW BOX', 'Plate: 11W.'], ['MOTH', 'Destination.']]; }
          shut(); return [['WINDOW BOX', 'Next.'], ['', 'The window shuts on you.']]; } },
        { id: 'chair', label: 'EYE CHAIR', o: c2, talk: () => {
          if (S.num === 4) { step('num', 5); S.waitT = 22; save(); return [['EYE CHAIR', 'Read the bottom line.'], ['WOLF', 'Fish.'], ['EYE CHAIR', 'I read it as an E.'], ['EYE CHAIR', 'One of us passes. It\'s you.'], ['', 'Photo. Flash.'], ['EYE CHAIR', 'Your eyes are closed. It\'s perfect.'], ['', 'Wait for 99.']]; }
          return [['EYE CHAIR', 'Look at me.'], ['', 'It is looking at you.']]; } },
        { id: 'heron', label: 'HERON', o: heron, talk: () => [['HERON', 'I\'m in line.'], ['WOLF', 'For what?'], ['HERON', 'I\'ll know when I get there.']] },
        { id: 'plant', label: 'PLANT', o: plant, talk: () => [['', 'The plant holds ticket 3.'], ['', 'It has been waiting the longest.'], ['', 'It has grown.']] },
      ];
    },
    // ================================================================ slice 2 — KSUN, Crow's Yard, Gutter Bowl, Second Sun Thrift (mission: DEAD AIR)
    async ksun(G, A) {
      const [tvh, otv, phone, lynx] = await Promise.all([glb('hf2/tv_head.glb', 1.75, 'object', { clip: 'idle' }), glb('hf2/old_tv.glb', 0.8),
        glb('hf2/phone.glb', 0.5, 'object', { clip: 'idle', t: 0.4, speed: 0 }), glb('town2/lynx_lo.glb', 1.7, 'lynx', { clip: 'idle', t: 0.5 })]);
      // news desk: "Nothing New Tonight"
      const desk = ph('news desk', box(2.6, 0.95, 0.8, '#5a4a8a', 0.06)); at(desk, 0.4, 0, -1.3); G.add(desk);
      const dtop = box(2.8, 0.07, 0.95, '#f6efe0', 0.03); at(dtop, 0.4, 0.95, -1.3); G.add(dtop);
      const dsign = sign('NOTHING NEW TONIGHT', 2.2, 0.3, '#3a1f2a', '#ffd04a'); at(dsign, 0.4, 0.5, -0.89); G.add(dsign);
      at(tvh, 0.4, 0, -2.15); G.add(tvh);
      at(phone, -0.55, 1.02, -1.3, 0.5); G.add(phone);
      const ears = rabbitEars(1.1); ears.position.set(0.4, 1.7, -2.15); G.add(ears);
      // CH. 2 monitor over the desk: static until the rabbit ears go on
      const mon = box(1.4, 0.9, 0.1, '#2a2a2a', 0.05); at(mon, 0.4, 1.95, -2.95); G.add(mon);
      const scr = staticScreen(1.22, 0.72); at(scr, 0.4, 2.4, -2.89); G.add(scr);
      const fixed = sunPic(1.22, 0.72, 'NOTHING HAPPENED. MORE AT 11.', '#5a4a8a'); at(fixed, 0.4, 2.4, -2.885); G.add(fixed);
      const live = sign('CH. 2  LIVE', 0.8, 0.16, '#c9384a', '#fff3dc'); at(live, 0.4, 2.98, -2.93); G.add(live);
      // weather wall (a picture of the sun) + Old TV the weatherman on a stand
      const wx = ph('weather wall', sunPic(2.0, 1.6, 'TODAY: SUN. WATCHING.')); at(wx, -2.6, 1.75, -2.97); G.add(wx);
      const stand = ph('weather stand', box(0.7, 0.62, 0.55, '#7a5a8a', 0.05)); at(stand, -2.6, 0, -1.9); G.add(stand);
      at(otv, -2.6, 0.62, -1.9, 0.35); G.add(otv);
      // ON AIR booth (Lynx's call-in show "Ears")
      const booth = ph('ON AIR booth', new THREE.Group());
      const bfl = box(1.9, 0.1, 1.8, '#3a3355', 0.03); bfl.position.set(0, 0, 0); booth.add(bfl);
      const bb = box(1.9, 2.3, 0.1, '#4a3f6a', 0.03); bb.position.set(0, 0, -0.9); booth.add(bb);
      const bl = box(0.1, 1.0, 1.8, '#4a3f6a', 0.03); bl.position.set(-0.95, 0, 0); booth.add(bl);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.8), new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.25, roughness: 1 })); glass.position.set(-0.95, 1.6, 0); booth.add(glass);
      const roof = box(2.0, 0.1, 1.9, '#4a3f6a', 0.03); roof.position.set(0, 2.3, 0); booth.add(roof);
      const onair = sign('ON AIR', 0.9, 0.26, '#c9384a', '#fff3dc', 0.7); onair.position.set(0, 2.6, 0.9); booth.add(onair);
      const ep = sign('"EARS"\nlate-night call-in', 1.1, 0.45, '#fff3dc', '#4a3f6a', 0.5); ep.position.set(0, 1.75, -0.84); booth.add(ep);
      const mic = cyl(0.015, 0.03, 1.35, '#2a2a2a', 6); mic.position.set(-0.4, 0, 0.35); booth.add(mic);
      const mh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), feltMat('#3a3a3a')); mh.position.set(-0.4, 1.42, 0.35); booth.add(mh);
      at(booth, 2.95, 0, -1.0); G.add(booth);
      at(lynx, 3.05, 0.1, -1.0, -0.45); G.add(lynx);
      // studio camera + teleprompter (pointed at the anchor)
      const cam = ph('studio camera + teleprompter', new THREE.Group());
      for (let i = 0; i < 3; i++) { const l = cyl(0.02, 0.025, 1.15, '#2a2a2a', 5); l.rotation.set(0.25 * Math.cos(i * 2.1), 0, 0.25 * Math.sin(i * 2.1)); cam.add(l); }
      const body = box(0.45, 0.35, 0.65, '#3a3a3a', 0.05); body.position.y = 1.1; cam.add(body);
      const lens = cyl(0.11, 0.13, 0.2, '#2a2a2a', 10); lens.rotation.x = -Math.PI / 2; lens.position.set(0, 1.27, -0.33); cam.add(lens);
      const tp = sign('NOTHING\nHAPPENED.', 0.42, 0.3, '#2a2a2a', '#9fd6b8', 0.6); tp.position.set(0, 1.62, 0.02); tp.rotation.x = -0.35; cam.add(tp);
      at(cam, -1.1, 0, 1.5, 0.3); G.add(cam);
      A.wolfSpot = [0.6, 1.9]; A.anim = [tvh, lynx]; A.ring = 0; A.fz = 0;
      A.setAir = () => { scr.visible = S.air < 7; fixed.visible = ears.visible = S.air >= 7; }; A.setAir();
      A.tick = (dt, t) => { onair.material.color.setScalar(Math.sin(t * 3) > -0.3 ? 1 : 0.35);
        if (scr.visible && (A.fz += dt) > 0.09) { A.fz = 0; scr.userData.fuzz(); }
        if (A.ring > 0) { A.ring -= dt; phone.rotation.z = A.ring > 0 ? Math.sin(t * 50) * 0.08 : 0; } };
      A.who = [
        { id: 'tvh', label: 'TV-HEAD', o: tvh, talk: () => {
          if (S.air === 0) { step('air', 1); return [['TV-HEAD', 'Good evening. Nothing new—'], ['', 'TV-Head goes to static. Mid-sentence.'], ['LYNX', 'He went out on "new".'], ['LYNX', 'So technically he finished.'], ['LYNX', 'He needs rabbit ears. Crow\'s Yard has everything nobody wants.']]; }
          if (S.air === 6) { step('air', 7); A.setAir(); return [['', 'You put the rabbit ears on TV-Head.'], ['TV-HEAD', '—tonight.'], ['', 'He reads the teleprompter.'], ['TV-HEAD', 'Nothing happened.'], ['TV-HEAD', 'More at eleven.'], ['LYNX', 'Ratings doubled.'], ['WOLF', 'From what?'], ['LYNX', 'One viewer to two. Both the Bear.']]; }
          if (S.air >= 7) return [['TV-HEAD', 'Nothing new tonight.'], ['TV-HEAD', 'Stay tuned. It won\'t change.']];
          return [['TV-HEAD', '(static)'], ['LYNX', 'Still dead air. Best show we\'ve had.']]; } },
        { id: 'lynx', label: 'LYNX', o: lynx, talk: () => S.air >= 7 ? [['LYNX', 'We\'re back on air.'], ['LYNX', 'Shame. It was very quiet.']]
          : S.air > 0 ? [['LYNX', 'Rabbit ears. Crow\'s Yard. Go.'], ['LYNX', 'I\'ll keep the dead air warm.']]
          : [['LYNX', 'This is "Ears". I listen.'], ['LYNX', 'I heard everything. I\'ll say nothing.'], ['LYNX', 'For now.']] },
        { id: 'phone', label: 'CALL-IN LINE', o: phone, talk: () => { A.ring = 1.4; return [['', 'The call-in line rings.'], ['PHONE', 'KSUN request line.'], ['WOLF', 'Can I request a song?'], ['PHONE', 'Requests are closed.'], ['PHONE', 'The Moth called ahead.']]; } },
        { id: 'otv', label: 'WEATHERMAN', o: otv, talk: () => S.air > 0 && S.air < 7 ? [['OLD TV', 'These rabbit ears are mine.'], ['OLD TV', 'I need them for the weather.'], ['WOLF', 'The weather is sun.'], ['OLD TV', 'I need them to be sure.']] : [['OLD TV', 'Today: Sun.'], ['OLD TV', 'Watching.'], ['WOLF', 'And tomorrow?'], ['OLD TV', 'Sun. Still watching.']] },
        { id: 'wx', label: 'WEATHER WALL', o: wx, talk: () => [['', 'The weather wall is a picture of the sun.'], ['', 'The sun is looking at it.'], ['', 'It approves.']] },
        { id: 'cam', label: 'CAMERA', o: cam, talk: () => [['', 'The teleprompter says: NOTHING HAPPENED.'], ['', 'It has said that since 1979.'], ['', 'It has always been accurate.']] },
      ];
    },
    async yard(G, A) {
      const [crow, ram, stool, barrow] = await Promise.all([glb('town2/crow_lo.glb', 1.5, 'crow', { clip: 'idle', t: 0.1 }), glb('town2/ram_lo.glb', 1.75, 'ram', { clip: 'idle', t: 0.6 }),
        glb('town2/fence_stool.glb', 1.0), glb('hf2/wheelbarrow.glb', 0.8)]);
      const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 2.9, 0.05), feltMat('#a8845a'), 22); const mx = new THREE.Matrix4();
      for (let i = 0; i < 22; i++) { mx.makeTranslation(-3.85 + i * 0.367, 1.45 + (i % 3) * 0.05, -2.95); planks.setMatrixAt(i, mx); } planks.receiveShadow = !LOW; G.add(planks);
      const s1 = sign('CROW\'S YARD\neverything nobody wanted', 2.2, 0.6, '#fff3dc', '#3a1f2a', 0.5); at(s1, -1.6, 2.45, -2.9); G.add(s1);
      // junk pile (tyres, crates, hubcaps)
      const junk = ph('junk pile', new THREE.Group());
      [[-0.3, 0, 0, 1.1, 0.5, 0.9, '#8a7a6a'], [0.45, 0, 0.15, 0.8, 0.7, 0.7, '#6a7a8a'], [-0.1, 0.5, 0.1, 0.7, 0.4, 0.6, '#9a6a4a'], [0.5, 0.7, 0.1, 0.5, 0.3, 0.5, '#c9a35a']].forEach(([x, y, z, w, h, d, c]) => { const b = box(w, h, d, c, 0.06); b.position.set(x, y, z); b.rotation.y = x * 0.6; junk.add(b); });
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 6, 14), feltMat('#2e2a2a')); t.rotation.x = Math.PI / 2; t.position.set(-1.0 + i * 0.05, 0.11 + i * 0.22, 0.55); t.castShadow = !LOW; junk.add(t); }
      for (let i = 0; i < 4; i++) { const h = cyl(0.22, 0.22, 0.04, ['#c9c9c0', '#a8b0b8', '#d9c9a0', '#b8b8b0'][i], 14); h.rotation.x = Math.PI / 2 - 0.2 * i; h.position.set(0.95, 0.03 + i * 0.05, 0.75 - i * 0.12); junk.add(h); }
      at(junk, -2.3, 0, -1.7); G.add(junk);
      // gallery corner: one stool, good lighting
      const rug = box(2.3, 0.02, 2.0, '#f6efe0', 0.01); at(rug, 2.55, 0, -1.6); G.add(rug);
      const gs = sign('GALLERY\n(good lighting)', 1.3, 0.45, '#3a1f2a', '#fff3dc', 0.5); at(gs, 2.55, 2.45, -2.9); G.add(gs);
      at(stool, 2.55, 0.02, -1.7, -0.3); G.add(stool);
      const spot = new THREE.SpotLight('#fff3dc', 22, 7, 0.42, 0.6); spot.position.set(2.2, 3.1, 0.3); spot.target.position.set(2.55, 0.8, -1.7); G.add(spot, spot.target);
      const stoolEars = rabbitEars(1.0); stoolEars.position.set(2.55, 1.02, -1.7); stoolEars.visible = false; G.add(stoolEars);
      at(crow, 1.25, 0, -0.9, 0.7); G.add(crow); at(ram, 3.3, 0, 0.4, -0.8); G.add(ram); at(barrow, -0.5, 0, 0.8, 0.6); G.add(barrow);
      A.wolfSpot = [0.3, 1.7]; A.anim = [crow, ram]; A.show = 0; A.squeak = 0;
      A.tick = (dt, t) => { if (A.show > 0 && (A.show -= dt) <= 0) { stoolEars.visible = false; A.squeak = 2.5; }
        if (A.squeak > 0) { A.squeak -= dt; barrow.rotation.z = A.squeak > 0 ? Math.sin(t * 34) * 0.035 : 0; } };
      A.who = [
        { id: 'junk', label: 'JUNK PILE', o: junk, talk: () => {
          if (S.air === 1) { step('air', 2); return [['', 'You dig.'], ['', 'A hubcap. A felt spring. One rabbit-ear antenna.'], ['CROW', 'Put it on the stool first.'], ['WOLF', 'Why?'], ['CROW', 'Everything goes on the stool first.']]; }
          S.dig++; save(); return [['', 'You dig.'], ['', ['A felt spring.', 'A hubcap. Soft.', 'Half a tumbleweed. It\'s taking its time.', 'A sock. Not that one.'][S.dig % 4]]]; } },
        { id: 'stool', label: 'FENCE-STOOL', o: stool, talk: () => {
          if (S.air === 2) { step('air', 3); stoolEars.visible = true; A.show = 9; return [['', 'You put the rabbit ears on the Fence-Stool.'], ['CROW', 'Oh.'], ['RAM', 'It\'s on a stool.'], ['CROW', 'That\'s the point.'], ['CROW', 'It\'s art now. Art can\'t be taken. Only bought.'], ['CROW', 'I\'ve consigned it to Second Sun Thrift.'], ['', 'The Wheelbarrow hauls it off. It complains with its wheel.']]; }
          return [['', 'The Fence-Stool. Anything on it is art.'], ['', 'Right now it\'s an empty stool.'], ['CROW', 'Also art.']]; } },
        { id: 'crow', label: 'CROW', o: crow, talk: () => S.air === 1 ? [['CROW', 'Rabbit ears? Dig.'], ['CROW', 'Gently. It\'s a gallery.']] : S.air === 2 ? [['CROW', 'The stool. First.']]
          : S.air >= 3 && S.air < 7 ? [['CROW', 'Is it art?'], ['CROW', 'At two dollars, it\'s a steal.'], ['CROW', 'Don\'t steal it.']] : [['CROW', 'Welcome to the Yard.'], ['CROW', 'Everything here was thrown away.'], ['CROW', 'Curated.']] },
        { id: 'ram', label: 'RAM', o: ram, talk: () => [['RAM', 'I\'m a critic.'], ['WOLF', 'Of what?'], ['RAM', 'Stools.'], ['RAM', 'This one is on the floor. Derivative.']] },
        { id: 'barrow', label: 'WHEELBARROW', o: barrow, talk: () => { A.squeak = 1.6; return [['', 'The Wheelbarrow complains with its wheel.'], ['', 'Squeak.'], ['', 'It has a point.']]; } },
      ];
    },
    async bowl(G, A) {
      const [skate, ram, bear, booth] = await Promise.all([glb('hf2/roller_skate.glb', 0.5, 'object', { clip: 'idle', t: 0.3, speed: 0 }), glb('town2/ram_lo.glb', 1.75, 'ram', { clip: 'idle', t: 0.2 }),
        glb('town2/bear_lo.glb', 1.85, 'bear', { clip: 'idle', t: 0.5 }), glb('town2/booth_prop.glb', 1.25, 'feltobj')]);
      // four felt lanes + gutters + pins (instanced)
      const lanes = ph('bowling lanes (felt)', new THREE.Group());
      for (let i = 0; i < 4; i++) { const l = box(0.82, 0.05, 5.0, '#e8c088', 0.01); l.position.set(-3.2 + i, 0, -0.45); lanes.add(l); }
      for (let i = 0; i < 5; i++) { const g = box(0.17, 0.02, 5.0, '#4a3460', 0.01); g.position.set(-3.7 + i, 0, -0.45); lanes.add(g); }
      G.add(lanes);
      const pinG = new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.05, 0.08], [0.045, 0.16], [0.024, 0.24], [0.034, 0.3], [0.024, 0.37], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 8);
      const pins = ph('bowling pins', new THREE.InstancedMesh(pinG, feltMat('#fff3dc'), 40)); let n = 0;
      for (let l = 0; l < 4; l++) for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) { mx4.makeTranslation(-3.2 + l + (k - r / 2) * 0.14, 0.05, -2.2 - r * 0.13); pins.setMatrixAt(n++, mx4); }
      pins.castShadow = !LOW; G.add(pins);
      const pit = box(4.2, 0.5, 0.2, '#2a1f2a', 0.02); at(pit, -1.7, 0, -2.88); G.add(pit);
      const ball = ph('bowling ball', new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), feltMat('#c9384a'))); ball.position.set(-2.2, 0.16, 1.6); ball.castShadow = !LOW; G.add(ball);
      // scoreboard: a TV that only shows the sun
      const sbf = ph('scoreboard TV', box(3.4, 0.95, 0.1, '#2a2a2a', 0.05)); at(sbf, -1.7, 1.95, -2.95); G.add(sbf);
      const sb = sunPic(3.2, 0.78, 'SCORE: SUN', '#3a1f2a'); at(sb, -1.7, 2.42, -2.89); G.add(sb);
      // shoe rental counter (skates only) + neon
      const ctr = ph('shoe rental counter', box(2.0, 1.0, 0.7, '#ff6fae', 0.05)); at(ctr, 2.7, 0, -2.3); G.add(ctr);
      const ctop = box(2.2, 0.07, 0.85, '#f6efe0', 0.03); at(ctop, 2.7, 1.0, -2.3); G.add(ctop);
      at(skate, 2.5, 1.07, -2.25, 0.5); G.add(skate);
      const rs = sign('SHOE RENTAL\n(skates only)', 1.4, 0.5, '#fff3dc', '#6b4c8a', 0.5); at(rs, 2.7, 1.85, -2.93); G.add(rs);
      const neon = sign('GUTTER BOWL', 1.9, 0.38, '#2a1f2a', '#ff6fae', 0.7); at(neon, 2.7, 2.6, -2.93); G.add(neon);
      // claw machine full of socks
      const claw = ph('claw machine (socks)', new THREE.Group());
      const cb = box(0.8, 0.95, 0.8, '#ff6fae', 0.05); claw.add(cb);
      const cg = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.75, 0.76), new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.25, roughness: 1 })); cg.position.y = 1.33; claw.add(cg);
      const ct = box(0.84, 0.18, 0.84, '#ff6fae', 0.05); ct.position.y = 1.7; claw.add(ct);
      for (let i = 0; i < 7; i++) { const s = box(0.12, 0.2, 0.08, ['#d9a43a', '#e98a8a', '#9fd6b8', '#6aa4b8', '#c9384a', '#f2d27a', '#8a6ab8'][i], 0.04); s.position.set(-0.24 + (i % 4) * 0.16, 0.97 + Math.floor(i / 4) * 0.12, -0.2 + (i % 3) * 0.17); s.rotation.z = i; claw.add(s); }
      const cl = cyl(0.01, 0.01, 0.3, '#c9c9c0', 4); cl.position.set(0.1, 1.4, 0); claw.add(cl);
      at(claw, 1.15, 0, -2.3); G.add(claw);
      at(booth, 3.15, 0, 1.6, -Math.PI / 2); G.add(booth); at(bear, 2.2, 0, 1.3, -0.7); G.add(bear);
      at(ram, -0.5, 0, 1.2, 0.3); G.add(ram);
      // the Hummingbird (felt placeholder): small, leather jacket, hovering
      const hb = ph('Hummingbird (league bully)', new THREE.Group());
      const hbody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), feltMat('#3fae7a')); hbody.scale.set(1, 1.2, 1); hb.add(hbody);
      const jk = box(0.17, 0.12, 0.15, '#2a2220', 0.04); jk.position.y = -0.07; hb.add(jk);
      const hh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), feltMat('#3fae7a')); hh.position.y = 0.12; hb.add(hh);
      const bk = cyl(0.004, 0.01, 0.13, '#2a2a2a', 5); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.12, 0.04); hb.add(bk);
      const wings = []; for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 4), feltMat('#9fd6b8')); w.scale.set(1.4, 0.2, 0.6); w.position.set(s * 0.1, 0.03, -0.02); hb.add(w); wings.push(w); }
      hb.position.set(0.7, 1.45, 0.3); G.add(hb);
      A.wolfSpot = [0.5, 1.9]; A.anim = [ram, bear]; A.roll = 0;
      A.tick = (dt, t) => { hb.position.y = 1.45 + Math.sin(t * 2.3) * 0.08; hb.rotation.y = Math.sin(t * 0.7) * 0.6; for (const w of wings) w.rotation.z = Math.sin(t * 70) * 0.5;
        if (A.roll > 0) { A.roll -= dt; const p = Math.min(1, 1 - A.roll / 2.2); ball.position.set(-2.2 - Math.max(0, p - 0.35) * 0.82, 0.16 - (p > 0.75 ? 0.05 : 0), 1.6 - p * 3.4); ball.rotation.x -= dt * 9;
          if (A.roll <= 0) { ball.position.set(-2.2, 0.16, 1.6); A.after?.(); } } };
      const roll = (then) => { A.roll = 2.2; A.after = () => { A.after = null; say(then); }; say([['', 'You bowl on skates. The ball also rolls.']], true); };
      A.who = [
        { id: 'skate', label: 'SHOE RENTAL', o: skate, talk: () => { if (!S.skates) { S.skates = 1; save(); return [['ROLLER SKATE', 'Size?'], ['WOLF', 'Paws.'], ['ROLLER SKATE', 'We only rent skates.'], ['', 'Got: rental skates.']]; }
          return [['ROLLER SKATE', 'Bring them back when you\'re done.'], ['ROLLER SKATE', 'Nobody is ever done.']]; } },
        { id: 'lane', label: 'LANE 2', o: ball, talk: () => { if (A.roll > 0) return null;
          if (!S.skates) return [['ROLLER SKATE', 'No bowling in shoes.'], ['WOLF', 'I\'m in paws.'], ['ROLLER SKATE', 'No bowling in paws.']];
          if (S.air === 4) { roll([['', 'Gutter.'], ['RAM', 'Zero.'], ['RAM', 'That ties my high score.'], ['RAM', 'And my low score.'], ['RAM', 'Ties go to the challenger. Two-dollar league prize.'], ['', 'Got: two dollars.']]); step('air', 5); return 'async'; }
          roll([['', 'Gutter.'], ['RAM', 'Consistent.']]); return 'async'; } },
        { id: 'ram', label: 'RAM', o: ram, talk: () => S.air === 4 ? [['RAM', 'You need two dollars?'], ['RAM', 'Beat my score. Rent skates first.']]
          : [['RAM', 'I own the place. I play alone at 4 PM.'], ['RAM', 'My high score is my low score.'], ['WOLF', 'What is it?'], ['RAM', 'Consistent.']] },
        { id: 'humm', label: 'HUMMINGBIRD', o: hb, talk: () => [['HUMMINGBIRD', 'League night. You\'re not in the league.'], ['WOLF', 'You\'re very small.'], ['HUMMINGBIRD', 'I\'m small, but I\'m a lotta small.']] },
        { id: 'bear', label: 'BEAR', o: bear, talk: () => [['BEAR', 'I\'m on the team.'], ['WOLF', 'Do you bowl?'], ['BEAR', 'I\'m the comfortable one.'], ['BEAR', 'Every team needs one.']] },
        { id: 'claw', label: 'CLAW MACHINE', o: claw, talk: () => [['', 'You win a sock.'], ['', 'It isn\'t the one.'], ['', 'It never is.']] },
        { id: 'score', label: 'SCOREBOARD', o: sbf, talk: () => [['', 'The scoreboard is a TV. It only shows the sun.'], ['', 'SCORE: SUN.'], ['', 'The sun is winning.']] },
      ];
    },
    async thrift(G, A) {
      const [plaid, lamp, gecko] = await Promise.all([glb('hf2/plaid_box.glb', 0.7, 'object', { clip: 'idle' }), glb('hf2/lamp_bulb.glb', 1.15, 'object', { clip: 'idle', t: 0.5, speed: 0 }),
        glb('town2/gecko_lo.glb', 1.05, 'gecko', { clip: 'idle', t: 0.2 })]);
      const ctr = ph('thrift counter', box(2.2, 1.0, 0.7, '#c98a3a', 0.05)); at(ctr, 1.0, 0, -2.2); G.add(ctr);
      const ctop = box(2.4, 0.07, 0.85, '#f6efe0', 0.03); at(ctop, 1.0, 1.0, -2.2); G.add(ctop);
      at(plaid, 0.7, 1.07, -2.2); G.add(plaid);
      const reg = ph('cash register', box(0.45, 0.3, 0.4, '#7a5a4a', 0.05)); at(reg, 1.75, 1.07, -2.3, -0.2); G.add(reg);
      const s1 = sign('EVERYTHING $2', 2.0, 0.42, '#c98a3a', '#fff3dc', 0.6); at(s1, 1.0, 2.5, -2.97); G.add(s1);
      const ears = rabbitEars(1.0); ears.position.set(1.3, 1.07, -1.95); G.add(ears);
      const tag = sign('$2\nprovenance: a stool', 0.36, 0.2, '#fff3dc', '#c9384a', 0.5); tag.position.set(1.3, 1.12, -1.72); tag.rotation.x = -0.6; G.add(tag);
      A.setAir = () => { ears.visible = tag.visible = S.air >= 3 && S.air <= 5; }; A.setAir();
      // mystery appliance shelf
      const shelf = ph('mystery appliances shelf', new THREE.Group());
      for (const y of [1.1, 1.85]) { const b = box(2.0, 0.06, 0.45, '#9a6a4a', 0.02); b.position.y = y; shelf.add(b); }
      [[-0.7, 1.16, '#e98a8a', 0.4, 0.28], [-0.1, 1.16, '#9fd6b8', 0.3, 0.42], [0.55, 1.16, '#f6efe0', 0.5, 0.3], [-0.5, 1.91, '#6aa4b8', 0.35, 0.35], [0.3, 1.91, '#d9a43a', 0.45, 0.22]].forEach(([x, y, c, w, h]) => { const b = box(w, h, 0.3, c, 0.06); b.position.set(x, y, 0); shelf.add(b); });
      const fan = cyl(0.16, 0.16, 0.05, '#c9c9c0', 12); fan.rotation.x = Math.PI / 2; fan.position.set(0.8, 2.15, 0); shelf.add(fan);
      at(shelf, -2.2, 0, -2.75); G.add(shelf);
      // sweater rack (all mustard)
      const rack = ph('sweater rack', new THREE.Group());
      for (const x of [-1.2, 1.2]) { const p = cyl(0.025, 0.03, 1.55, '#7a7a70', 6); p.position.x = x; rack.add(p); }
      const bar = cyl(0.02, 0.02, 2.4, '#7a7a70', 6); bar.rotation.z = Math.PI / 2; bar.position.set(1.2, 1.5, 0); rack.add(bar);
      ['#d9a43a', '#c9942a', '#e8b84a'].forEach((c, j) => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.62, 0.5), feltMat(c), 4);
        for (let i = 0; i < 4; i++) { mx4.makeTranslation(-1.05 + (i * 3 + j) * 0.19, 1.15, 0); im.setMatrixAt(i, mx4); } im.castShadow = !LOW; rack.add(im); });
      at(rack, -2.3, 0, -0.6, 0.15); G.add(rack);
      at(gecko, -2.1, 0, 0.7, 0.5); G.add(gecko);
      const td = ph('tie-dye table', box(0.8, 0.7, 0.5, '#7a5a4a', 0.04)); at(td, -3.2, 0, 0.8, 0.4); G.add(td);
      const tds = sign('TIE-DYE\n$2', 0.5, 0.3, '#ff6fae', '#2a7a6a', 0.5); tds.position.set(-3.1, 0.72, 0.85); tds.rotation.x = -Math.PI / 2 + 0.2; G.add(tds);
      // Lamp-Bulb on a low plinth with a NOT FOR SALE tag in its own handwriting
      const pl = box(0.6, 0.25, 0.6, '#b86a4f', 0.04); at(pl, -0.5, 0, -1.4); G.add(pl);
      at(lamp, -0.5, 0.25, -1.4, 0.3); G.add(lamp);
      const nfs = sign('NOT FOR SALE', 0.42, 0.13, '#fff3dc', '#3a1f2a', 0.6); at(nfs, -0.5, 0.13, -1.09); nfs.rotation.z = 0.08; G.add(nfs);
      // changing room (the curtain doesn't close) + mirror
      const cr = ph('changing room (curtain won\'t close)', new THREE.Group());
      for (const [x, z] of [[-0.6, 0.6], [0.6, 0.6]]) { const p = cyl(0.03, 0.03, 2.3, '#7a7a70', 6); p.position.set(x, 0, z); cr.add(p); }
      const rod = cyl(0.02, 0.02, 1.2, '#7a7a70', 6); rod.rotation.z = Math.PI / 2; rod.position.set(0.6, 2.25, 0.6); cr.add(rod);
      const cur = box(0.5, 2.0, 0.05, '#9c3149', 0.02); cur.position.set(-0.33, 0.2, 0.6); cr.add(cur);
      const cs = sign('CHANGING ROOM', 1.0, 0.2, '#fff3dc', '#9c3149', 0.6); cs.position.set(0, 2.45, 0.6); cr.add(cs);
      at(cr, 3.2, 0, -0.3); G.add(cr);
      const mir = ph('mirror (gives star ratings)', new THREE.Group()); const mf = box(0.62, 1.7, 0.08, '#7a5a4a', 0.04); mir.add(mf);
      const glassM = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.5), new THREE.MeshStandardMaterial({ color: '#cfe3ea', roughness: 1 })); glassM.position.set(0, 0.87, 0.045); mir.add(glassM);
      const stars = sign('★★☆☆☆', 0.5, 0.14, '#3a1f2a', '#ffd04a', 0.7); stars.position.set(0, 1.85, 0.05); mir.add(stars);
      at(mir, 2.1, 0, 1.2, -0.7); G.add(mir);
      A.wolfSpot = [0.4, 1.7]; A.anim = [plaid, gecko];
      A.who = [
        { id: 'plaid', label: 'PLAID BOX', o: plaid, talk: () => {
          if (S.air === 3) { step('air', 4); return [['PLAID BOX', 'Rabbit ears. Two dollars.'], ['WOLF', 'They were free an hour ago.'], ['PLAID BOX', 'They were on a stool an hour ago.'], ['WOLF', 'I don\'t have two dollars.'], ['PLAID BOX', 'Gutter Bowl has a two-dollar league prize.']]; }
          if (S.air === 4) return [['PLAID BOX', 'Two dollars.'], ['PLAID BOX', 'Still.']];
          if (S.air === 5) { step('air', 6); A.setAir(); return [['', 'You pay two dollars.'], ['PLAID BOX', 'Everything is two dollars.'], ['PLAID BOX', 'Including the two dollars.'], ['', 'Got: rabbit ears. No longer art.'], ['', 'Take them to KSUN.']]; }
          return [['PLAID BOX', 'Everything is two dollars.'], ['WOLF', 'Even you?'], ['PLAID BOX', 'Make an offer. Two dollars.']]; } },
        { id: 'lamp', label: 'LAMP-BULB', o: lamp, talk: () => [['', 'The tag says NOT FOR SALE.'], ['', 'In its own handwriting.'], ['LAMP-BULB', 'I\'m just browsing.'], ['LAMP-BULB', 'Since 1979.']] },
        { id: 'gecko', label: 'GECKO', o: gecko, talk: () => [['GECKO', 'Tie-dye, man. One colour.'], ['WOLF', 'That\'s every colour.'], ['GECKO', 'It\'s one colour. It\'s called "all of them".']] },
        { id: 'rack', label: 'SWEATERS', o: rack, talk: () => [['', 'Every sweater is mustard.'], ['', 'Some are more mustard.'], ['', 'Two dollars. Mustard included.']] },
        { id: 'shelf', label: 'APPLIANCES', o: shelf, talk: () => [['', 'A shelf of mystery appliances.'], ['', 'One is plugged in. Nothing is on.'], ['', 'It\'s humming anyway.']] },
        { id: 'curtain', label: 'CHANGING ROOM', o: cr, talk: () => [['', 'The curtain doesn\'t close.'], ['', 'You change anyway.'], ['', 'Now you\'re wearing mustard.']] },
        { id: 'mirror', label: 'MIRROR', o: mir, talk: () => [['MIRROR', 'Two stars.'], ['WOLF', 'For the outfit?'], ['MIRROR', 'For you.']] },
        { id: 'price', label: 'PRICE CHECK', o: ctr, talk: () => [['', 'Price check: the Fence-Stool.'], ['PLAID BOX', 'On a stool? Priceless.'], ['PLAID BOX', 'Off a stool? Two dollars.']] },
      ];
    },
  };

  // ------------------------------------------------------------------ missions
  const OBJ = {
    sock: ['', 'Ask the Washing Machine (it only talks during spin)', 'Ask around about "East"', 'Look for the sock at the Post Office',
      'Find the Crow\'s collection by the road', 'Bring the sock back to the Laundromat', ''],
    num: ['', 'Take a number', 'Wait. Or try Window 1', 'Mail yourself a letter (Post Office)', 'Back to the DMV: vision test', 'Wait for 99', 'Go to Window 1', ''],
    air: ['', 'Find rabbit ears at Crow\'s Yard (dig the junk)', 'Put the antenna on the Fence-Stool (Crow insists)', 'Buy it back at Second Sun Thrift',
      'Win $2 at Gutter Bowl (rent skates, bowl lane 2)', 'Pay the Thrift two dollars', 'Bring the rabbit ears to TV-Head (KSUN)', ''],
  };
  const TITLE = { sock: 'ODD SOCK OUT', num: 'TAKE A NUMBER', air: 'DEAD AIR' };
  const DONE = { sock: 6, num: 7, air: 7 };
  const DONE_MSG = { sock: '. Lost Socks board unlocked.', num: '. Plate 11W.', air: '. Ratings doubled (both the Bear).' };
  function step(m, n) { S[m] = n; save(); if (n === 1) toast(TITLE[m] + ' — new errand'); if (n === DONE[m]) setTimeout(() => toast(TITLE[m] + ' — done' + DONE_MSG[m]), 600); hud(); }
  const errands = () => ['sock', 'num', 'air'].filter(m => S[m] > 0 && S[m] < DONE[m]);
  function hud() {
    let s = errands().map(m => { let o = OBJ[m][S[m]]; if (m === 'sock' && S[m] === 4 && !S.hubcap) o += '\n   (the Crow trades — check the Post Office parcels)'; return TITLE[m] + ' · ' + o; }).join('\n');
    if (errands().length) s += '\n(clock on hold while you run errands)'; $('townObj').textContent = s; const to = $('townObj'), hd = $('hud'); to.style.top = (!document.body.classList.contains('room') && hd) ? (hd.getBoundingClientRect().bottom + 8) + 'px' : '';
  }
  function save() { try { sessionStorage.setItem('ss_town1', JSON.stringify(S)); } catch (e) { } }
  try { if (new URLSearchParams(location.search).has('fresh')) sessionStorage.removeItem('ss_town1'); Object.assign(S, JSON.parse(sessionStorage.getItem('ss_town1') || '{}')); } catch (e) { }
  { const q = new URLSearchParams(location.search).get('mstep'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (k in DONE) S[k] = +v; } } // QA: ?mstep=sock:3,num:4
  const toast = (m, sec = 3.5) => level?.toast ? level.toast(m, sec) : null;

  // ------------------------------------------------------------------ dialogue (reuses the scene subtitle UI)
  let lines = [], lineT = 0;
  function say(L, keep = false) { lines = L.slice(); lineT = 0; if (keep) lines.keep = true; nextLine(); }
  function nextLine() { const l = lines.shift(); if (!l) { sub.classList.remove('on'); return; } subName.textContent = l[0] ? l[0] + ' ' : ''; subText.textContent = l[1]; sub.classList.add('on'); lineT = 1.4 + l[1].length * 0.045; }
  function talk(who) {
    if (!who) return; T.focus = who; audio.ui?.('tick'); const r = who.talk(); S.seen[who.id] = 1;
    if (r && r !== 'async') say(r); chipsFor(T.rooms[T.active]); }
  function chipsFor(A) { chips.innerHTML = ''; for (const w of A.who) { const b = document.createElement('button'); b.textContent = w.label; if (!S.seen[w.id]) b.className = 'new'; b.onclick = (e) => { e.stopPropagation(); talk(w); }; chips.appendChild(b); } }

  // ------------------------------------------------------------------ build / enter / exit
  async function build(key) {
    if (T.rooms[key]) return T.rooms[key];
    const R = ROOMS[key], sc = new THREE.Scene(), A = { key, scene: sc, who: [], anim: [] };
    sc.background = new THREE.Color('#24161f');
    const hemi = new THREE.HemisphereLight(R.light, '#5a3a3a', 1.35); sc.add(hemi);
    const k = new THREE.DirectionalLight(R.light, 2.0); k.position.set(3.5, 7, 6); k.target.position.set(0, 0.8, -0.5); sc.add(k, k.target);
    if (!LOW) { k.castShadow = true; k.shadow.mapSize.set(1024, 1024); const c = k.shadow.camera; c.left = c.bottom = -6; c.right = c.top = 6; c.near = 1; c.far = 20; k.shadow.bias = -0.0008; k.shadow.normalBias = 0.03; }
    const G = new THREE.Group(); G.add(shell(R)); sc.add(G);
    const [wolf] = await Promise.all([glb('town2/wolf_lo.glb', 1.75, 'wolf'), BUILD[key](G, A)]);
    A.wolf = wolf; at(wolf, A.wolfSpot[0], 0, A.wolfSpot[1], -0.6); sc.add(wolf);
    A.wolfHome = new THREE.Vector3(A.wolfSpot[0], 0, A.wolfSpot[1]);
    if (A.anim.length > 2) console.warn('town: more than 3 animating rigs in', key);
    sc.updateMatrixWorld(true); A.tris = countTris(sc); T.rooms[key] = A; return A;
  }
  function countTris(root) { let n = 0; root.traverse(o => { if (o.isMesh && o.visible) { const g = o.geometry; const c = (g.index ? g.index.count : g.attributes.position.count) / 3; n += c * (o.isInstancedMesh ? o.count : 1); } }); return Math.round(n); }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  async function enter(key) {
    if (T.busy || T.active) return; T.busy = true; audio.ui?.('confirm');
    curtain.querySelector('b').textContent = ROOMS[key].name; curtain.classList.add('shut');
    const [A] = await Promise.all([build(key), wait(560)]);
    ctx.onEnter?.(); T.active = key; T.scene = A.scene; document.body.classList.add('room'); $('roomName').textContent = ROOMS[key].name;
    A.setAir?.(); A.wolf.position.copy(A.wolfHome); A.wolf.rotation.y = -0.6; T.focus = null; T.goal = null; chipsFor(A); hud(); resize();
    renderer.compile(A.scene, T.camera); await wait(120); curtain.classList.remove('shut'); T.busy = false;
    window.__town.lastEnter = { room: key, tris: A.tris, animating: 1 + A.anim.length };
  }
  async function exit() {
    if (T.busy || !T.active) return; T.busy = true; audio.ui?.('tick');
    curtain.querySelector('b').textContent = 'MAIN STREET'; curtain.classList.add('shut'); await wait(560);
    sub.classList.remove('on'); lines = []; document.body.classList.remove('room'); T.active = null; T.scene = null; ctx.onExit?.(); hud();
    await wait(120); curtain.classList.remove('shut'); T.busy = false;
  }

  // ------------------------------------------------------------------ the Crow's roadside collection (outside, in the town scene)
  let crowSpot = null;
  async function placeOutside() {
    try {
      const [stool, crow] = await Promise.all([glb('town2/fence_stool.glb', 1.1), glb('town2/crow_lo.glb', 1.5, 'crow', { clip: 'idle', t: 0.2, speed: 0 })]);
      const g = new THREE.Group(); at(stool, 0, 0, 0, 0.4); at(crow, 0.9, 0, 0.3, -0.5); g.add(stool, crow);
      for (let i = 0; i < 4; i++) { const h = ph('hubcaps (collection)', cyl(0.24, 0.24, 0.04, ['#c9c9c0', '#a8b0b8', '#d9c9a0', '#b8b8b0'][i], 14)); h.rotation.x = Math.PI / 2 - 0.3; h.position.set(-0.8 + i * 0.12, 0.26 + i * 0.02, -0.4 - i * 0.05); g.add(h); }
      const s = sign('THE COLLECTION\ntrades only', 1.1, 0.42, '#fff3dc', '#3a1f2a', 0.5); s.position.set(-0.4, 1.35, -0.55); g.add(s);
      const pole = cyl(0.03, 0.03, 1.2, '#7a5a4a', 6); pole.position.set(-0.4, 0, -0.6); g.add(pole);
      at(g, FENCE.x, 0, FENCE.z, Math.PI); mainScene.add(g); crowSpot = { x: FENCE.x, z: FENCE.z, label: 'TALK TO CROW' };
      ctx.colliders?.push({ x: FENCE.x, z: FENCE.z, r: 0.8 });
      for (const d of DOORS) if (d.sign) { const sg = new THREE.Group(); const p = cyl(0.04, 0.04, 1.9, '#5a3a3a', 6); const b = sign(d.sign, 1.3, 0.34, '#fff3dc', '#3a1f2a'); b.position.y = 1.85; sg.add(p, b);
        const bk = b.clone(); bk.rotation.y = Math.PI; bk.position.z = -0.01; sg.add(bk);
        sg.position.set(d.x + 1.0, 0, d.z); sg.lookAt(2, 0, 4); mainScene.add(sg); }
    } catch (e) { console.warn('town: outside props failed', e); }
  }
  function talkOutside() {
    audio.ui?.('tick'); let L;
    if (S.sock === 4 && S.hubcap) { step('sock', 5); S.hubcap = false; S.sock2 = true; save(); L = [['CROW', 'It\'s in the collection.'], ['CROW', 'One sock. Mustard. Undeliverable.'], ['', 'You trade the felt hubcap.'], ['CROW', 'A fine hubcap. Soft.'], ['', 'Got: one sock.']]; }
    else if (S.sock === 4) L = [['CROW', 'It\'s in the collection.'], ['CROW', 'Trades only. I collect hubcaps.'], ['WOLF', 'The car has boots.'], ['CROW', 'Then you have a problem.']];
    else L = [['CROW', 'Everything here is in the collection.'], ['CROW', 'Including you, if you stand there long enough.']];
    outLines = L.slice(); nextOut();
  }
  let outLines = [], outT = 0;
  function nextOut() { const l = outLines.shift(); if (!l) { sub.classList.remove('on'); return; } subName.textContent = l[0] ? l[0] + ' ' : ''; subText.textContent = l[1]; sub.classList.add('on'); outT = 1.4 + l[1].length * 0.045; }

  // ------------------------------------------------------------------ per-frame
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function resize() { const a = innerWidth / innerHeight; T.camera.aspect = a; T.camera.fov = a < 1 ? 50 : 40;
    const halfW = a < 1 ? 3.6 : 4.6, halfH = 2.1; const tv = Math.tan(THREE.MathUtils.degToRad(T.camera.fov / 2));
    const d = Math.max(halfH / tv, halfW / (tv * a)); T.camera.position.set(0, 1.55 + d * 0.16, 3 + d * 0.98); T.camera.lookAt(0, 1.35, -0.3); T.camera.updateProjectionMatrix(); }
  addEventListener('resize', () => T.active && resize());
  T.update = (dt, t) => {
    const A = T.rooms[T.active]; if (!A) return;
    A.tick?.(dt, t);
    for (const o of A.anim) o.mixer?.update(dt);
    // the Wolf walks over to whoever you talk to, then idles facing them
    const w = A.wolf, ac = w.acts;
    if (T.focus) { T.focus.o.getWorldPosition(tmp); tmp.y = 0; tmp2.copy(tmp).sub(A.wolfHome).setY(0); const L = tmp2.length(); T.goal = L > 1.4 ? A.wolfHome.clone().addScaledVector(tmp2.normalize(), L - 1.2) : A.wolfHome.clone();
      T.goal.x = THREE.MathUtils.clamp(T.goal.x, -3.3, 3.3); T.goal.z = THREE.MathUtils.clamp(T.goal.z, -1.9, 2.4); T.look = tmp.clone(); }
    let moving = false;
    if (T.goal) { tmp2.copy(T.goal).sub(w.position); tmp2.y = 0; const d = tmp2.length(); if (d > 0.05) { moving = true; const s = Math.min(d, dt * 1.6); w.position.addScaledVector(tmp2.normalize(), s); const y = Math.atan2(tmp2.x, tmp2.z); w.rotation.y += Math.atan2(Math.sin(y - w.rotation.y), Math.cos(y - w.rotation.y)) * Math.min(1, dt * 8); } }
    if (!moving && T.look) { const y = Math.atan2(T.look.x - w.position.x, T.look.z - w.position.z); w.rotation.y += Math.atan2(Math.sin(y - w.rotation.y), Math.cos(y - w.rotation.y)) * Math.min(1, dt * 5); }
    if (ac) { const k = Math.min(1, dt * 6); ac.walk.setEffectiveWeight(THREE.MathUtils.lerp(ac.walk.getEffectiveWeight(), moving ? 1 : 0, k)); ac.idle.setEffectiveWeight(THREE.MathUtils.lerp(ac.idle.getEffectiveWeight(), moving ? 0 : 1, k)); if (!ac.walk.isRunning()) ac.walk.play(); w.mixer.update(dt); }
    if (lines.length || sub.classList.contains('on')) { lineT -= dt; if (lineT <= 0) nextLine(); }
    common(dt);
  };
  T.outside = (dt) => {   // called every town frame (walk mode): door prompts, the Crow, held clock, errand timers
    if (!level || level.mode !== 'walk' || level.frozen || document.body.classList.contains('scene')) { btn.style.display = 'none'; near = null; return; }
    const p = wolfState.pos; near = null; let best = 2.4;
    for (const d of DOORS) { const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < best) { best = dd; near = d; } }
    if (crowSpot) { const dd = Math.hypot(p.x - crowSpot.x, p.z - crowSpot.z); if (dd < 2.6 && dd < best + 0.3) near = crowSpot; }
    btn.style.display = near ? 'block' : 'none'; if (near) btn.textContent = near.room ? 'ENTER ' + ROOMS[near.room].name.replace('THE ', '') : near.label;
    if (errands().length) { if (S.held == null) S.held = level.left; level.left = S.held; } else S.held = null;
    if (outLines.length || (!T.active && sub.classList.contains('on') && outT > 0)) { outT -= dt; if (outT <= 0) nextOut(); }
    common(dt);
  };
  function common(dt) {   // errand timer runs anywhere (rooms or town): Pocket Watch calls 99 at 1:59
    if (S.num === 5 && S.waitT > 0) { S.waitT -= dt; if (S.waitT <= 0) { step('num', 6); toast('POCKET WATCH (from somewhere): "Now serving 99." It\'s 1:59.', 4); T.rooms.dmv?.setNow?.(99); } }
  }
  T.stats = () => Object.fromEntries(Object.entries(T.rooms).map(([k, A]) => [k, { tris: A.tris, animating: 1 + A.anim.length }]));
  T.state = S; T.enter = enter; T.exit = exit; T.talk = (id) => { const A = T.rooms[T.active]; talk(A?.who.find(w => w.id === id)); }; T.talkOutside = talkOutside;
  T.placeholders = () => [...placeholders]; T.next = () => { if (T.active) nextLine(); else nextOut(); };
  const _p = new THREE.Vector3(), _b = new THREE.Box3();
  renderer.domElement.addEventListener('pointerdown', (e) => {   // tap a character / prop in the room (or tap to advance the line)
    if (!T.active || T.busy) return; const A = T.rooms[T.active];
    if (sub.classList.contains('on') && lines.length) { nextLine(); return; }
    let best = null, bd = 90;
    for (const w of A.who) { _b.setFromObject(w.o); _b.getCenter(_p).project(T.camera); const x = (_p.x + 1) / 2 * innerWidth, y = (1 - _p.y) / 2 * innerHeight; const d = Math.hypot(x - e.clientX, y - e.clientY); if (d < bd) { bd = d; best = w; } }
    if (best) talk(best); else if (sub.classList.contains('on')) nextLine();
  });
  T.camera.position.set(0, 3, 12);
  placeOutside(); hud();
  window.__town = T;
  return T;
}
