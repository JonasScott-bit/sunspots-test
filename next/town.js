// town.js — Sunspots town slice: diorama interiors (Main St, Civic, Adobe Row, The Neon Strip) + four errands.
// Each room is its own small THREE.Scene seen through a fixed dollhouse camera (3 walls, open front, ~8x6 m).
// While a room is open the town is hidden and paused (main.js skips its update and renders only the room).
// Mobile budget per room: ~60k tris, <=3 rigged characters animating (the Wolf + 2), 512px webp textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sunspotsApply, sunspotsLowEnd } from './sunspots_material.js';
import { createBowling } from './bowling.js';   // run 8: playable lane at Gutter Bowl
import { createLivingTV } from './livingtv.js'; // run 9: TV night on Bear's couch (living90)
import { framedPainting } from './bearwall.js';   // run 9b: Scott's paintings on Bear's walls
import { gesturer, castOffsets, CAST_POOL, PROP_POOL } from './idles.js';   // run 15: idle variety
import { createDiner } from './diner.js';   // run 10: the Diner trio, ORDER, mission Table For Four, party followers
import { createPool, createHoops, larryByrd } from './minigames.js';   // run 11 (M4): playable pool (Pool Hall) + shoot-around vs Larry Byrd (the court)

import { homes16 } from './homes16.js';   // run 16: interiors for ram, anteater, apt_vict, moth, apt_pink, mansion, farm
const M = './models/';
const ROOMS = {
  diner:      { name: 'THE DINER',       wall: '#f3dcb8', trim: '#e0705a', floor: '#d9c6a4', floor2: '#7a5a4a', light: '#fff4e0', real: true },   // real place: 1950s stainless dining car
  laundromat: { name: 'THE LAUNDROMAT',  wall: '#bfe0e2', trim: '#6aa4b8', floor: '#e8e2cf', floor2: '#c9b9a0', light: '#eaf6ff' },
  post:       { name: 'THE POST OFFICE', wall: '#d9d0a8', trim: '#5f6f3c', floor: '#b89a74', floor2: '#a3855f', light: '#fff0c8' },
  dmv:        { name: 'THE DMV',         wall: '#c6d6a6', trim: '#7d8a6a', floor: '#b8b8a8', floor2: '#a4a494', light: '#f0ffe6' },
  // slice 2 (Town Plan: KSUN, Crow's Yard, Gutter Bowl + Second Sun Thrift) — mission Dead Air
  ksun:       { name: 'KSUN RADIO & CH. 2', wall: '#d8c7e6', trim: '#5a4a8a', floor: '#5a5468', floor2: '#4a4458', light: '#fff0e0' },
  yard:       { name: 'CROW\'S YARD',       wall: '#c9a77a', trim: '#7a5a3a', floor: '#c9a06a', floor2: '#b88f5a', light: '#ffe6b8' },
  bowl:       { name: 'GUTTER BOWL',        wall: '#6b4c8a', trim: '#ff6fae', floor: '#e3b878', floor2: '#d6a868', light: '#fff0d8', real: true, W: 14, D: 7.6 },   // run 8: 8 lanes, 14 x 7.6 m   // real place: untouched 1960 alley
  thrift:     { name: 'SECOND SUN THRIFT',  wall: '#f2d27a', trim: '#c98a3a', floor: '#c9785a', floor2: '#b86a4f', light: '#fff0d0' },
  // slice 3 (Town Plan: The Neon Strip, next to Gutter Bowl) — mission Leave The Light On
  motel:      { name: 'LEAVE-THE-LIGHT-ON MOTEL', wall: '#f6c6d6', trim: '#2a9d9a', floor: '#e8d6b0', floor2: '#d6c098', light: '#ffe0f0',
                pw: { back: ['swirl', '#ff6fae', '#22a89a', '#f2b632'], side: ['zig', '#8a4fc0', '#f2b632', '#7d93c4'], floor: ['checker', '#f07a5e', '#fff3dc', '#22a89a'], ceil: ['stripes', '#22a89a', '#ff6fae', '#fff3dc'] } },
  pool:       { name: 'THE MOTEL POOL',     wall: '#3a3f6a', trim: '#ff6fae', floor: '#f0e2c0', floor2: '#e2d2ae', light: '#e6f0ff' },
  // run 7 (room bible): new home rooms
  living90:   { name: 'BEAR\'S LIVING ROOM', wall: '#e6d8bc', trim: '#2f5a3e', floor: '#d8c7a6', floor2: '#c8b796', light: '#fff0d8', real: true },   // real place: mid-90s family room
  drivein:    { name: 'EYE-MAX DRIVE-IN',   wall: '#2a2440', trim: '#ff6fae', floor: '#6a5a5a', floor2: '#5e4f4f', light: '#ffe6c8' },
  // run 11 (M4): the Neon Strip pool hall + the chain-link court; five home rooms (object characters at home)
  poolhall:   { name: 'POOL · BILLIARDS',     wall: '#2f4a3e', trim: '#c9a24a', floor: '#7a2a2a', floor2: '#5e1f22', light: '#ffe8c0', W: 10, D: 6.5 },
  court:      { name: 'THE CHAIN-LINK COURT', wall: '#c9925f', trim: '#8a8c88', floor: '#5d5a5e', floor2: '#55525a', light: '#ffe2b8', real: true, W: 9, D: 7 },
  wolf:       { name: 'THE WOLF\'S KITCHEN',   wall: '#f2e6c0', trim: '#e0705a', floor: '#f6efe0', floor2: '#e0705a', light: '#fff2dc' },
  heron:      { name: 'HERON\'S BATHROOM',     wall: '#f6c6d6', trim: '#2a2440', floor: '#f6efe0', floor2: '#2a2440', light: '#f0f6ff' },
  lynx:       { name: 'LYNX\'S BEDROOM',       wall: '#c6d6f0', trim: '#6b3a22', floor: '#9a6a4a', floor2: '#8a5a3e', light: '#ffeccc' },
  gecko:      { name: 'GECKO\'S LAUNDRY ROOM', wall: '#d6e8c0', trim: '#6aa4b8', floor: '#e8e2cf', floor2: '#c9b9a0', light: '#f2fff0' },
  crow:       { name: 'CROW\'S GARAGE',        wall: '#b8a888', trim: '#7a5a3a', floor: '#8a8a84', floor2: '#7a7a74', light: '#fff0d0' },
  // run 16: the last seven houses (homes16.js)
  ram:        { name: 'RAM\'S FRONT ROOM',          wall: '#e9c27e', trim: '#7a4e2e', floor: '#a8743f', floor2: '#9c6a38', light: '#ffe6c0', real: true },   // 1924 Craftsman bungalow, kept as of 1958
  anteater:   { name: 'ANTEATER\'S BREAKFAST NOOK', wall: '#c2e6cd', trim: '#3f8a86', floor: '#dc6065', floor2: '#c85a54', light: '#f4fff0', real: true },   // 1931 Storybook Tudor
  apt_vict:   { name: 'THE VICTORIAN PARLOR',       wall: '#6a1f24', trim: '#4a2a1a', floor: '#6a3a22', floor2: '#5e321e', light: '#ffe0b0', real: true },   // 1889 Queen Anne
  moth:       { name: 'MOTH\'S PAD',                wall: '#d9a62a', trim: '#5a3a1e', floor: '#7a8a3a', floor2: '#6a7a2e', light: '#ffe2b0', real: true },   // 1974 rental den
  apt_pink:   { name: 'THE PINK APARTMENT',         wall: '#f2a6b8', trim: '#4ab8b0', floor: '#f2e2dc', floor2: '#e8d4cc', light: '#fff0f0', real: true },   // 1956 Miami Modern
  mansion:    { name: 'THE MANSION',                wall: '#f2efe8', trim: '#2f3236', floor: '#c9a47a', floor2: '#bf9a70', light: '#fff0d8', real: true, W: 9, D: 6.4 },   // 2024 hillside glass house
};
// outside: which building is which (diner door is LAYOUT.spots.diner_door; the three adobes face the square)
const DOORS = [
  { room: 'diner', x: 1.5, z: -7.3, sign: null },
  { room: 'living90', x: 3.0, z: 20.9, sign: null },   // Bear's house (felt ranch, built in placeOutside)
  { room: 'laundromat', x: 11.0, z: -10.6, sign: 'LAUNDROMAT' },
  { room: 'post', x: 16.3, z: -1.9, sign: 'POST OFFICE' },
  { room: 'dmv', x: -4.4, z: -15.8, sign: 'DMV' },
  { room: 'thrift', x: -10.9, z: -9.3, sign: 'THRIFT $2' },       // adobe_a (-14,-11)
  { room: 'ksun', x: -15.5, z: 0.3, sign: 'KSUN · CH. 2' },       // adobe_a (-19,1)
  { room: 'yard', x: -20.6, z: -8.2, sign: 'CROW\'S YARD' },      // adobe_b (-24,-9)
  { room: 'bowl', x: 20.4, z: -13.6, sign: 'GUTTER BOWL' },       // adobe_small (23,-15)
  { room: 'motel', x: 28.8, z: -2.8, sign: 'MOTEL · NO VACANCY' }, // adobe_b (30,-6), front
  { room: 'pool', x: 32.9, z: -4.2, sign: 'MOTEL POOL' },         // adobe_b (30,-6), side
  { room: 'drivein', x: 24.0, z: 15.5, sign: 'EYE-MAX DRIVE-IN' }, // felt screen south of the east road
  // run 11 (M4): positions come from townscape.js door marks (door_poolhall, door_court, door_<house>); these x/z are only fallbacks
  { room: 'poolhall', x: -12.0, z: -53.1, sign: null },
  { room: 'court', x: -107.0, z: -26.0, sign: null },
  { room: 'wolf', x: 22.9, z: 50.6, sign: null },
  { room: 'lynx', x: -21.6, z: 48.4, sign: null },
  { room: 'crow', x: -62.0, z: 51.4, sign: null },
  { room: 'heron', x: -86.1, z: 51.6, sign: null },
  { room: 'gecko', x: -122.0, z: 50.9, sign: null },
  // run 16 (homes16.js): positions from townscape door marks; fallbacks only
  { room: 'ram', x: 0, z: 0, sign: null },
  { room: 'anteater', x: 0, z: 0, sign: null },
  { room: 'apt_vict', x: 0, z: 0, sign: null },
  { room: 'moth', x: 0, z: 0, sign: null },
  { room: 'apt_pink', x: 0, z: 0, sign: null },
  { room: 'mansion', x: 0, z: 0, sign: null },
];
let DRIVEIN = { x: 24.0, z: 19.0 }; // the outdoor Eye-Max screen (felt placeholder)
let FENCE = { x: -15, z: 10.8 }; // the Crow's roadside collection (fence-stool), south of the town street

export function createTown(ctx) {
  // run 11: the real-scale town moves every door / outdoor spot onto its building (townscape.js marks)
  const TSC = ctx.townscape;
  if (TSC) { for (const d of DOORS) { const m = TSC.doors[d.room]; if (m) { d.x = m.x; d.z = m.z; d.ry = m.ry; if (m.built) d.sign = null; else if (!d.sign) d.sign = ROOMS[d.room].name.replace('THE ', ''); } }
    if (TSC.spots.fence) Object.assign(FENCE, TSC.spots.fence); if (TSC.spots.drivein) Object.assign(DRIVEIN, TSC.spots.drivein); }
  const { renderer, mainScene, load, normalize, feltMat, level, wolfState, audio = {} } = ctx;
  const LOW = sunspotsLowEnd();
  const T = { active: null, scene: null, camera: new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80), rooms: {}, busy: false };
  const S = { bulb: 0, swam: false, rooms: 0, air: 0, skates: 0, dig: 0, sock: 0, num: 0, hubcap: false, sock2: false, letter: false, ticket: 0, waitT: 0, coffee: 0, held: null, seen: {} };
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
  btn.addEventListener('click', () => { if (!near) return; if (near.room) enter(near.room); else if (near.act) { audio.ui?.('tick'); const L = near.act(); if (L) outSay(L); } else talkOutside(); });
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
  function restMotion(root, kind, h) { // 'breathe' (standing characters) or 'bob' (legless props); runs on the inner root so room code can still move/rotate the wrap
    const y0 = root.position.y, sy = root.scale.y, sx0 = root.scale.x, sz0 = root.scale.z, rx0 = root.rotation.x, ry0 = root.rotation.y, ph = Math.random() * 6.28;
    const G = gesturer(kind === 'bob' ? PROP_POOL : CAST_POOL, kind === 'bob' ? 'prop' : 'cast'); let lt = null;   // run 15: a random gesture every 4-12 s
    return (t) => { const dt = lt == null ? 0 : Math.min(0.1, Math.max(0, t - lt)); lt = t; G.update(dt, 1); const o = castOffsets(G, t);
      root.rotation.x = rx0 + o.rx; root.rotation.y = ry0 + o.ry; root.scale.x = sx0 * o.sx; root.scale.z = sz0 * o.sx;
      if (kind === 'bob') { root.position.y = y0 + h * (0.012 * (0.5 + 0.5 * Math.sin(t * 1.6 + ph)) + o.y); root.rotation.z = 0.03 * Math.sin(t * 0.9 + ph) + o.rz; root.scale.y = sy * o.sy; }
      else { root.position.y = y0 + h * o.y; root.scale.y = sy * (1 + 0.012 * Math.sin(t * 1.9 + ph)) * o.sy; root.rotation.z = 0.02 * Math.sin(t * 0.5 + ph) + o.rz; } };
  }
  async function glb(file, h, look = 'object', opt = {}) {
    const g = await load(M + file); const root = g.scene; root.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.receiveShadow = !LOW; if (o.isSkinnedMesh) o.frustumCulled = false; } });
    if (opt.rest) { root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); root.updateMatrixWorld(true); }   // bind pose before sizing
    normalize(root, h); sunspotsApply(root, look, h);
    const wrap = new THREE.Group(); wrap.add(root); wrap.userData.h = h;
    // opt.rest: rest (bind) pose + a subtle procedural breathe/bob instead of the Meshy clip (those clips twist legs, flare pants, squash and topple props)
    if (opt.rest) { wrap.proc = restMotion(root, opt.rest, h); return wrap; }
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

  // ------------------------------------------------------------------ PLAYHOUSE kit: trippy, wonky felt rooms (procedural geometry + canvas textures only, matte felt, no new models)
  const PW = { mustard: '#f2b632', cobalt: '#3f5fb8', sky: '#7d93c4', coral: '#f07a5e', purple: '#8a4fc0', teal: '#22a89a', pink: '#ff6fae', cream: '#fff3dc', ink: '#2a1a24' };
  function patTex(kind, a, b, c = PW.cream, rep = 0.6) {   // loud clashing felt patterns, tile-seamless 256px canvases
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = a; g.fillRect(0, 0, 256, 256); g.lineCap = g.lineJoin = 'round';
    if (kind === 'dots') for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { g.fillStyle = (i + j) % 2 ? b : c; g.beginPath(); g.arc(i * 64 + (j % 2) * 32, j * 64 + 32, 15, 0, 7); g.fill(); }
    if (kind === 'squig') { g.lineWidth = 10; for (let j = 0; j < 4; j++) { g.strokeStyle = j % 2 ? c : b; g.beginPath(); for (let x = -8; x <= 264; x += 4) { const y = j * 64 + 32 + Math.sin((x / 256) * Math.PI * 4 + j) * 13; x > -8 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
    if (kind === 'swirl') { g.lineWidth = 9; [[64, 64, b], [192, 192, b], [192, 64, c], [64, 192, c]].forEach(([cx, cy, col], q) => { g.strokeStyle = col; g.beginPath();
      for (let k = 0; k < 56; k++) { const an = k * 0.36 * (q % 2 ? -1 : 1), r = k * 0.95; const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }); }
    if (kind === 'zig') for (let j = 0; j < 8; j++) { g.fillStyle = j % 2 ? b : (j % 4 === 0 ? a : c); g.beginPath();
      for (let k = 0; k <= 8; k++) g.lineTo(k * 32, j * 32 + (k % 2 ? 16 : 0)); for (let k = 8; k >= 0; k--) g.lineTo(k * 32, j * 32 + 32 + (k % 2 ? 16 : 0)); g.fill(); }
    if (kind === 'checker') for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? b : a; g.fillRect(i * 32, j * 32, 32, 32); if ((i + j) % 4 === 0) { g.fillStyle = c; g.beginPath(); g.arc(i * 32 + 16, j * 32 + 16, 5, 0, 7); g.fill(); } }
    if (kind === 'stripes') for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = c; g.fillRect(i * 32 + 14, 0, 4, 256); }
    for (let i = 0; i < 2200; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6); }   // felt fibres
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rep, rep); tx.anisotropy = 4; return tx;
  }
  const patMat = (kind, a, b, c, rep) => feltMat('#ffffff', { map: patTex(kind, a, b, c, rep) });
  function pwShell(R, g) {   // wonky walls (leaning, crooked tops), a lumpy tilted felt ceiling, loud patterns
    const P = R.pw, W = 8, D = 6;
    const flat = (pts, mat, trim) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false, curveSegments: 1 }), [mat, feltMat(trim)]); m.receiveShadow = !LOW; m.castShadow = false; return m; };
    const back = flat([[-W / 2 - 0.3, -0.1], [W / 2 + 0.3, -0.1], [W / 2 + 0.3, 3.85], [1.6, 3.95], [-1.2, 3.8], [-W / 2 - 0.3, 4.0]], patMat(...P.back), R.trim);
    back.position.set(0, 0, -D / 2 - 0.2); back.rotation.set(-0.035, 0, 0.014); g.add(back);
    const zs = [-3.25, -2.0, -0.8, 0.4, 1.1, 2.0, 3.1];
    for (const sd of [-1, 1]) { const tops = sd < 0 ? [3.85, 4.0, 4.2, 4.4, 4.5, 3.7, 3.05] : [3.9, 4.05, 4.15, 4.45, 4.4, 3.45, 3.2];
      const pts = [[3.25, -0.1], [-3.1, -0.1], ...zs.slice().reverse().map((z, i) => [-z, tops[zs.length - 1 - i]])];
      const w = flat(pts, patMat(...P.side), R.trim); w.rotation.y = Math.PI / 2; w.position.set(sd < 0 ? -0.2 : 0, 0, 0);
      const lean = new THREE.Group(); lean.add(w); lean.position.x = sd * W / 2; /* pivot on the wall's foot */ lean.rotation.z = sd < 0 ? 0.045 : -0.03; g.add(lean); }
    const cg = new THREE.PlaneGeometry(W + 0.6, 4.4, 20, 8); cg.rotateX(Math.PI / 2); const pa = cg.attributes.position;   // lumpy ceiling, tipping up toward the viewer
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i) - 1.1; pa.setZ(i, z); pa.setY(i, 3.62 + (z + 3.3) / 4.4 * 0.55 + 0.13 * Math.sin(x * 1.4 + z * 0.9) + 0.07 * Math.cos(x * 3.1 - z * 1.7)); }
    cg.computeVertexNormals(); const ceil = new THREE.Mesh(cg, patMat(...P.ceil)); ceil.material.map.repeat.set(5, 2.6); ceil.material.emissive.set('#ffffff'); ceil.material.emissiveMap = ceil.material.map; ceil.material.emissiveIntensity = 0.45; ceil.material.side = THREE.DoubleSide; ceil.castShadow = false; g.add(ceil);
  }
  function eyes(A, parent, spots, r = 0.07) {   // flat felt googly eyes [[x,y,z,ry,rx,size]]: pupils follow the Wolf, each set blinks together
    const set = { list: [], next: 0.8 + Math.random() * 3, blink: 0 };
    for (const [x, y, z, ry = 0, rx = 0, s = 1] of spots) { const e = new THREE.Group(); e.position.set(x, y, z); e.rotation.set(rx, ry, 0);
      const w = new THREE.Mesh(new THREE.CircleGeometry(r * s, 14), feltMat(PW.cream)); w.position.z = 0.003;
      const p = new THREE.Mesh(new THREE.CircleGeometry(r * s * 0.46, 10), feltMat(PW.ink)); p.position.z = 0.007; e.add(w, p); e.userData.p = p; e.userData.r = r * s; parent.add(e); set.list.push(e); }
    (A.eyeSets ||= []).push(set); return set;
  }
  const smile = (r, color = PW.ink) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 4, 10, Math.PI), feltMat(color)); m.rotation.z = Math.PI; return m; };
  function picTex(kind, w, h) {   // the "wrong" window views
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w); const g = c.getContext('2d'), H = c.height;
    if (kind === 'sea') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, PW.teal); gr.addColorStop(1, '#1d3f7a'); g.fillStyle = gr; g.fillRect(0, 0, 256, H);
      g.fillStyle = PW.coral; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= 256; x += 16) g.lineTo(x, H * 0.84 + Math.sin(x / 30) * 6); g.lineTo(256, H); g.fill();
      g.strokeStyle = PW.purple; g.lineWidth = 7; for (const x0 of [30, 200]) { g.beginPath(); for (let y = H; y > H * 0.35; y -= 6) g.lineTo(x0 + Math.sin(y / 14) * 9, y); g.stroke(); }
      for (const [x, y, s, col] of [[90, H * 0.35, 1, PW.mustard], [170, H * 0.6, 0.8, PW.pink], [60, H * 0.68, 0.6, PW.mustard]]) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 30 * s, 17 * s, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x + 26 * s, y); g.lineTo(x + 46 * s, y - 14 * s); g.lineTo(x + 46 * s, y + 14 * s); g.fill(); g.fillStyle = PW.cream; g.beginPath(); g.arc(x - 14 * s, y - 3 * s, 7 * s, 0, 7); g.fill(); g.fillStyle = PW.ink; g.beginPath(); g.arc(x - 16 * s, y - 3 * s, 3.5 * s, 0, 7); g.fill(); }
      g.strokeStyle = PW.cream; g.lineWidth = 3; for (const [x, y, r] of [[120, H * 0.2, 6], [128, H * 0.12, 4], [215, H * 0.3, 5]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); } }
    if (kind === 'night') { g.fillStyle = '#1c1a3a'; g.fillRect(0, 0, 256, H); g.fillStyle = PW.cream; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % 256, (i * 53) % H, 3, 3);
      g.fillStyle = PW.mustard; g.beginPath(); g.arc(170, H * 0.35, 34, 0, 7); g.fill(); g.fillStyle = '#1c1a3a'; g.beginPath(); g.arc(186, H * 0.3, 30, 0, 7); g.fill();
      g.fillStyle = PW.cream; g.font = '700 22px Futura, Avenir, sans-serif'; g.textAlign = 'center'; g.fillText('MIDNIGHT', 128, H * 0.88); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 1, metalness: 0 }));
  }
  const bar = (w, h, d, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), feltMat(col)); m.castShadow = !LOW; return m; };
  function crookedWindow(pic, w, h, frame) {   // a window frame that is not quite square
    const g = new THREE.Group(); pic.position.z = 0.01; g.add(pic); const t = 0.08;
    for (const [x, y, ww, hh] of [[0, h / 2 + t / 2, w + 2 * t + 0.06, t], [0.03, -h / 2 - t / 2, w + 2 * t, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0.02, t, h + 0.05]]) { const b = bar(ww, hh, 0.07, frame); b.position.set(x, y, 0.03); g.add(b); }
    const sill = bar(w + 0.3, 0.06, 0.16, frame); sill.position.set(0.05, -h / 2 - t - 0.02, 0.08); sill.rotation.z = 0.04; g.add(sill); return g;
  }
  function crookedDoor(A, color, frame, label) {   // a leaning doorway with a watching peephole
    const g = new THREE.Group(); const panel = bar(0.9, 2.0, 0.05, color); panel.position.y = 1.0; g.add(panel);
    for (const [x, y, ww, hh] of [[0, 2.05, 1.16, 0.12], [-0.52, 1.0, 0.12, 2.1], [0.52, 1.02, 0.12, 2.14]]) { const b = bar(ww, hh, 0.09, frame); b.position.set(x, y, 0.02); g.add(b); }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), feltMat(PW.mustard)); knob.position.set(0.3, 0.95, 0.06); g.add(knob);
    if (label) { const s = sign(label, 0.5, 0.2, PW.cream, PW.ink, 0.7); s.position.set(0, 1.72, 0.035); s.rotation.z = -0.08; g.add(s); }
    eyes(A, g, [[-0.09, 1.45, 0.03], [0.1, 1.47, 0.03, 0, 0, 0.8]], 0.075); return g;
  }
  function backClock(A, r, ring = PW.mustard, eyed = true) {   // a wall clock that runs backwards (numbers go anticlockwise too)
    const g = new THREE.Group(); const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = PW.cream; x.fillRect(0, 0, 256, 256); x.fillStyle = PW.ink; x.font = '700 30px Futura, Avenir, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; x.fillText(String(n), 128 - Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CircleGeometry(r, 22), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 4, 22), feltMat(ring)); g.add(rim);
    const hand = (len, wid, col) => { const p = new THREE.Group(); const m = bar(wid, len, 0.012, col); m.position.y = len / 2; p.add(m); p.position.z = 0.02; g.add(p); return p; };
    const hr = hand(r * 0.5, 0.04, PW.ink), mn = hand(r * 0.78, 0.028, PW.coral);
    if (eyed) eyes(A, g, [[-0.32 * r, 0.42 * r, 0.03], [0.3 * r, 0.44 * r, 0.03, 0, 0, 0.85]], r * 0.17);
    (A.clocks ||= []).push({ hr, mn }); return g;
  }
  function popper(A, base, head, y0, dy, lid) { const p = { head, y0, dy, t: 0, lid }; head.position.y = y0; (A.pops ||= []).push(p); return p; }
  function mobile(A, shape, color, x, y, z, len = 0.55) {   // felt shapes on strings from the lumpy ceiling, turning slowly
    const g = new THREE.Group(); const str = cyl(0.006, 0.006, len, PW.ink, 4); str.position.y = -len; g.add(str);
    const s = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 6 }), feltMat(color)); s.position.y = -len - 0.05; g.add(s);
    g.position.set(x, y, z); (A.spin ||= []).push(s); (A.wob ||= []).push({ o: g, y: y, rz: 0, a: 0.06, f: 0.9, p: x }); return [g, s];
  }
  function starShape(r1 = 0.22, r2 = 0.1, n = 5) { const s = new THREE.Shape(); for (let i = 0; i <= n * 2; i++) { const a = i * Math.PI / n + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; }
  function moonShape(r = 0.2) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0.833, Math.PI * 2 - 0.833, false); s.absarc(r * 0.55, 0, r * 0.75, Math.PI * 2 - 1.407, 1.407, true); return s; }
  function discShape(r = 0.2) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; }
  const wob = (A, o, a = 0.05, f = 1.2) => (A.wob ||= []).push({ o, y: o.position.y, rz: o.rotation.z, a, f, p: Math.random() * 6.28 });
  const watch = (A, o, range = 0.7) => (A.watch ||= []).push({ o, ry: o.rotation.y, range });
  function playhouse(A) {   // chain the kit's per-frame motion onto the room's own tick
    const prev = A.tick, head = new THREE.Vector3(), v = new THREE.Vector3();
    A.tick = (dt, t) => { prev?.(dt, t); if (!A.wolf) return; A.wolf.getWorldPosition(head); head.y += 1.45;
      for (const s of A.eyeSets || []) { s.next -= dt; if (s.next <= 0) { s.blink = 0.13; s.next = 1.8 + Math.random() * 4; } if (s.blink > 0) s.blink -= dt;
        for (const e of s.list) { e.scale.y = s.blink > 0 ? 0.1 : 1; v.copy(head); e.worldToLocal(v); const L = v.length() || 1; let px = v.x / L * 1.8, py = v.y / L * 1.8; const q = Math.hypot(px, py); if (q > 1) { px /= q; py /= q; }
          e.userData.p.position.x = px * e.userData.r * 0.5; e.userData.p.position.y = py * e.userData.r * 0.5; } }
      for (const w of A.watch || []) { const want = THREE.MathUtils.clamp(Math.atan2(head.x - w.o.position.x, head.z - w.o.position.z) - w.ry, -w.range, w.range) + w.ry; w.o.rotation.y += (want - w.o.rotation.y) * Math.min(1, dt * 3); }
      for (const w of A.wob || []) { w.o.rotation.z = w.rz + w.a * Math.sin(t * w.f + w.p); w.o.position.y = w.y + w.a * 0.3 * (0.5 + 0.5 * Math.sin(t * w.f * 1.3 + w.p)); }
      for (const s of A.spin || []) s.rotation.y += dt * 0.5;
      for (const c of A.clocks || []) { c.mn.rotation.z = t * 0.6; c.hr.rotation.z = t * 0.05; }   // positive = anticlockwise: backwards
      for (const p of A.pops || []) if (p.t > 0) { p.t = Math.max(0, p.t - dt); const e = 3 - p.t;
        const up = p.t <= 0 ? 0 : e < 0.16 ? e / 0.16 * 1.15 : e < 2.4 ? 1 + 0.15 * Math.sin((e - 0.16) * 22) * Math.exp(-(e - 0.16) * 4) : Math.max(0, 1 - (e - 2.4) / 0.6);
        p.head.position.y = p.y0 + p.dy * up; if (p.lid) p.lid.rotation.x = -1.3 * Math.min(1, up); } };
  }
  function quips(list) { let i = 0; return () => list[i++ % list.length]; }

  // ------------------------------------------------------------------ REAL-PLACE kit (run 7, Scott: "unique rooms… study actual places and replicate them")
  // Each real room copies ONE real place (see room_bible.md). Canvas felt textures (matte, felt fibres), its own floor / walls / ceiling, no shared patterns.
  function cvTex(w, h, draw, rx = 1, ry = 1, fib = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    for (let i = 0; i < w * h / 28 * fib; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }   // felt fibres
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
  }
  const texMat = (t, glow = 0) => { const m = feltMat('#ffffff', { map: t }); if (glow) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = t; m.emissiveIntensity = glow; } return m; };
  const skin = (o, t, glow) => { o.material = texMat(t, glow); return o; };
  const pane = (w, h, t, glow = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(t, glow)); m.receiveShadow = !LOW; return m; };
  function txt(g, s, x, y, px, col, font = 'Futura, Avenir, sans-serif', wt = 700, align = 'center') { g.fillStyle = col; g.font = `${wt} ${px}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function realRoom(G, o) {   // floor + back/left/right walls (planes, own textures) + optional ceiling rising toward the open front (o.cy=[backY, frontY], o.curve = barrel vault)
    const W = o.W || 8, D = o.D || 6, H = o.H || 4.0;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.2, D + 0.2), texMat(o.floor)); fl.position.y = -0.1; fl.receiveShadow = true; G.add(fl);
    const wall = (t, w, x, z, ry) => { const m = pane(w, H, t, o.wallGlow || 0); m.position.set(x, H / 2 - 0.02, z); m.rotation.y = ry; G.add(m); return m; };
    wall(o.back, W + 0.4, 0, -D / 2, 0); wall(o.left, D + 0.2, -W / 2, 0, Math.PI / 2); wall(o.right, D + 0.2, W / 2, 0, -Math.PI / 2);
    if (o.ceil) { const [y0, y1] = o.cy, L = o.cz || 4.6, cg = new THREE.PlaneGeometry(W + 0.4, 1, 1, o.curve ? 14 : 1), pa = cg.attributes.position;
      for (let i = 0; i < pa.count; i++) { const u = pa.getY(i) + 0.5; pa.setXYZ(i, pa.getX(i), y0 + (y1 - y0) * (o.curve ? Math.sin(u * Math.PI / 2) : u), -D / 2 - 0.02 + u * L); }
      cg.computeVertexNormals(); const c = new THREE.Mesh(cg, texMat(o.ceil, o.ceilGlow ?? 0.5)); c.material.side = THREE.DoubleSide; c.castShadow = false; G.add(c); }
  }
  const STEEL = ['#c4c9cd', '#d8dcdf', '#aab1b7'];   // "stainless" = pale grey felt with stitched brushed lines (never shiny)
  function steelTex(g, x0, y0, w, h, step = 6, horiz = true) { g.fillStyle = STEEL[0]; g.fillRect(x0, y0, w, h);
    for (let k = 0, p = 0; p < (horiz ? h : w); k++, p += step) { g.fillStyle = k % 2 ? STEEL[2] : STEEL[1]; horiz ? g.fillRect(x0, y0 + p, w, step * 0.4) : g.fillRect(x0 + p, y0, step * 0.4, h); } }

  // ------------------------------------------------------------------ room shell (floor + 3 walls + soffit, open front)
  function shell(R) {
    const g = new THREE.Group(), W = R.W || 8, D = R.D || 6, H = 3.2;
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const f = fc.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { f.fillStyle = (i + j) % 2 ? R.floor : R.floor2; f.fillRect(i * 32, j * 32, 32, 32); }
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(2, 1.5);
    if (R.real) { const lip = box(W + 0.8, 0.28, 0.3, '#3a1f2a', 0.06); at(lip, 0, -0.28, D / 2 + 0.05); g.add(lip); return g; }   // REAL-PLACE rooms build their own floor/walls/ceiling (realRoom)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.2, D + 0.2), R.pw ? patMat(...R.pw.floor) : new THREE.MeshStandardMaterial({ map: ft, roughness: 1 })); floor.position.set(0, -0.1, 0); floor.receiveShadow = true; g.add(floor);
    if (R.pw) { floor.material.map.repeat.set(4, 3); pwShell(R, g); const lip = box(W + 0.8, 0.28, 0.3, '#3a1f2a', 0.06); at(lip, 0, -0.28, D / 2 + 0.05); g.add(lip); return g; }   // PLAYHOUSE rooms
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
    async diner(G, A) {   // REAL PLACE: a 1950s factory-built stainless dining car (refs: Doyle's, Exmore, Salem Oak, Modern Diner; Mountain View / O'Mahony cars)
      const H = 4.0, TQ = '#4fb3b5', CREAM = '#f3e9d2', RED = '#c23a35';
      const yy = (h, y) => h * (1 - y / H);
      const winBand = (g, w, h, n, y0, y1, sunAt = -1) => { for (let i = 0; i < n; i++) { const x = w * (0.08 + i * 0.84 / n), ww = w * 0.84 / n * 0.86, a = yy(h, y1), b = yy(h, y0);   // ribbon windows: the desert outside
        g.fillStyle = STEEL[2]; g.fillRect(x - 4, a - 4, ww + 8, b - a + 8); const gr = g.createLinearGradient(0, a, 0, b); gr.addColorStop(0, '#9fd2e6'); gr.addColorStop(0.62, '#f6d7a8'); gr.addColorStop(0.63, '#d98a52'); gr.addColorStop(1, '#c9783f');
        g.fillStyle = gr; g.fillRect(x, a, ww, b - a); g.fillStyle = '#b8653a'; g.fillRect(x + ww * 0.15, a + (b - a) * 0.5, ww * 0.3, (b - a) * 0.13);
        if (i === sunAt) { g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(x + ww * 0.7, a + (b - a) * 0.3, (b - a) * 0.17, 0, 7); g.fill(); g.fillStyle = '#3a1f2a'; g.beginPath(); g.arc(x + ww * 0.7, a + (b - a) * 0.3, (b - a) * 0.05, 0, 7); g.fill(); } } };
      const sideWall = (sunAt) => cvTex(512, 330, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); steelTex(g, 0, yy(h, 1.0), w, h - yy(h, 1.0), 5);   // stainless wainscot, turquoise bands, enamel above
        g.fillStyle = TQ; g.fillRect(0, yy(h, 1.08), w, yy(h, 1.0) - yy(h, 1.08)); g.fillRect(0, yy(h, 2.62), w, yy(h, 2.52) - yy(h, 2.62)); winBand(g, w, h, 4, 1.42, 2.3, sunAt); });
      realRoom(G, { H,
        floor: cvTex(128, 128, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e9dfc6' : RED; g.fillRect(i * 32, j * 32, 32, 32); } }, 13, 10),   // small red + cream tile
        back: cvTex(512, 256, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); steelTex(g, 0, yy(h, 2.15), w, h - yy(h, 2.15), 4);   // fluted stainless back bar wall
          g.fillStyle = TQ; g.fillRect(0, yy(h, 2.25), w, yy(h, 2.15) - yy(h, 2.25)); for (let x = 16; x < w; x += 64) { g.fillStyle = STEEL[2]; g.fillRect(x, yy(h, 2.15), 3, h); } }),
        left: sideWall(-1), right: sideWall(2),
        ceil: cvTex(512, 256, (g, w, h) => { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fffbe8'; g.fillRect(0, h * 0.42, w, h * 0.16);   // barrel vault: cream enamel, stainless ribs, centre light trough
          for (let x = 30; x < w; x += 62) { g.fillStyle = STEEL[2]; g.fillRect(x, 0, 5, h); } g.fillStyle = '#fff6c8'; g.fillRect(0, h - 10, w, 10); }),
        cy: [3.05, 3.95], curve: true, ceilGlow: 0.55 });
      const cove = box(8.2, 0.08, 0.14, '#fff6d0', 0.02); cove.material.emissive.set('#fff2c0'); cove.material.emissiveIntensity = 0.6; at(cove, 0, 2.98, -2.93); G.add(cove);   // hidden cove light
      // the counter: diamond-tile front on a stainless kick, turquoise Formica top with a stainless edge
      const counter = ph('diner counter (diamond tile)', skin(box(4.8, 1.0, 0.62, '#ffffff', 0.03), cvTex(512, 128, (g, w, h) => { steelTex(g, 0, 0, w, h, 4);
        g.fillStyle = '#f4f1ea'; g.fillRect(0, h * 0.2, w, h * 0.62); g.fillStyle = '#1e1c22'; const s = h * 0.31;
        for (let x = 0; x < w + s; x += s * 1.0) { g.beginPath(); g.moveTo(x, h * 0.2); g.lineTo(x + s / 2, h * 0.51); g.lineTo(x, h * 0.82); g.lineTo(x - s / 2, h * 0.51); g.fill(); } })));
      at(counter, -1.0, 0, -0.9); G.add(counter);
      const ctop = skin(box(5.0, 0.08, 0.85, '#ffffff', 0.03), cvTex(256, 64, (g, w, h) => { g.fillStyle = '#7fc8c6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f3e9d2'; g.lineWidth = 2;   // boomerang Formica
        for (let i = 0; i < 14; i++) { const x = (i * 37) % w, y = (i * 23) % h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 16, y + 2); g.stroke(); } }, 3, 1)); at(ctop, -1.0, 1.0, -0.9); G.add(ctop);
      const edge = box(5.02, 0.035, 0.87, STEEL[0], 0.01); at(edge, -1.0, 1.0, -0.9); G.add(edge);
      // floor-bolted chrome stools, red vinyl tops
      const stools = []; for (let i = 0; i < 5; i++) { const s = new THREE.Group(); s.add(cyl(0.15, 0.17, 0.03, STEEL[2], 12)); const p = cyl(0.035, 0.035, 0.62, STEEL[0], 8); s.add(p);
        const ring = cyl(0.205, 0.2, 0.05, STEEL[0], 16); ring.position.y = 0.62; s.add(ring); const seat = cyl(0.19, 0.2, 0.1, RED, 16); seat.position.y = 0.66; s.add(seat);
        at(s, -3.05 + i * 0.85, 0, -0.3); G.add(s); stools.push(s); }
      ph('stools (felt)', stools[0]); eyes(A, stools[2], [[-0.06, 0.71, 0.2], [0.06, 0.71, 0.2]], 0.035);   // one stool has been watching
      // back bar: fluted stainless, Formica top; grill + hood; urns, mixer, cups, register
      const bb = skin(box(5.4, 0.95, 0.5, '#ffffff', 0.02), cvTex(256, 64, (g, w, h) => steelTex(g, 0, 0, w, h, 4, false))); at(bb, -1.3, 0, -2.72); G.add(bb);
      const bbt = box(5.5, 0.05, 0.56, '#7fc8c6', 0.02); at(bbt, -1.3, 0.95, -2.72); G.add(bbt);
      // run 10: the Diner trio (diner.js) took the counter. To stay under 60k tris, Bear + Gecko moved out (Bear's booth is still "saved") and the
      // booth GLB became a code-built red-vinyl booth.
      const [stove] = await Promise.all([glb('town2/stove.glb', 1.6)]);
      at(stove, -1.6, 0, -2.35, 0.25); G.add(stove);
      const hood = box(1.5, 0.32, 0.62, STEEL[0], 0.03); at(hood, -1.6, 2.15, -2.68); G.add(hood); const flue = box(0.4, 0.62, 0.3, STEEL[2], 0.02); at(flue, -1.6, 2.45, -2.82); G.add(flue);
      for (const x of [-0.5, -0.12]) { const u = new THREE.Group(); u.add(cyl(0.13, 0.14, 0.55, STEEL[0], 12)); const lid = cyl(0.04, 0.13, 0.08, STEEL[2], 12); lid.position.y = 0.55; u.add(lid);
        const sp = box(0.05, 0.05, 0.08, '#2a2220', 0.01); sp.position.set(0, 0.1, 0.15); u.add(sp); const gauge = cyl(0.012, 0.012, 0.32, '#7a4a2a', 5); gauge.position.set(0.1, 0.12, 0.1); u.add(gauge);
        at(u, x, 0.98, -2.72); G.add(u); }
      const mixer = ph('milkshake mixer', new THREE.Group()); mixer.add(box(0.16, 0.06, 0.24, '#8cc4a4', 0.02)); const col = cyl(0.03, 0.035, 0.42, '#8cc4a4', 8); col.position.z = -0.08; mixer.add(col);
      const head = box(0.12, 0.1, 0.22, '#8cc4a4', 0.03); head.position.set(0, 0.36, -0.02); mixer.add(head); const mcup = cyl(0.05, 0.04, 0.18, STEEL[0], 10); mcup.position.set(0, 0.07, 0.03); mixer.add(mcup);
      at(mixer, 0.38, 0.98, -2.72); G.add(mixer);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 4 - i; k++) { const c = cyl(0.045, 0.035, 0.07, '#f6efe0', 8); at(c, 0.78 + i * 0.12, 0.98 + k * 0.06, -2.72); G.add(c); }
      const reg = new THREE.Group(); reg.add(box(0.36, 0.22, 0.34, STEEL[2], 0.03)); const keys = box(0.34, 0.06, 0.2, '#2a2220', 0.02); keys.position.set(0, 0.22, 0.04); keys.rotation.x = 0.4; reg.add(keys);
      const tag = sign('THANK YOU', 0.3, 0.1, '#fff3dc', RED, 0.7); tag.position.set(0, 0.42, 0.0); reg.add(tag); at(reg, 1.15, 0.98, -2.72); G.add(reg);
      // counter top things
      const pieCase = ph('pie case', new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#e8f6fa', transparent: true, opacity: 0.28, roughness: 1 })));
      at(pieCase, 0.6, 1.31, -0.95); G.add(pieCase); const pcb = box(0.74, 0.04, 0.54, STEEL[0], 0.01); at(pcb, 0.6, 1.08, -0.95); G.add(pcb); const pct = box(0.74, 0.03, 0.54, STEEL[0], 0.01); at(pct, 0.6, 1.53, -0.95); G.add(pct);
      const pie = ph('pie', cyl(0.2, 0.22, 0.09, '#d98a3a', 16)); at(pie, 0.6, 1.12, -0.95); G.add(pie);
      const cup = ph('coffee cup', cyl(0.07, 0.06, 0.12, '#fff3dc', 10)); at(cup, -1.1, 1.08, -0.65); G.add(cup);
      const coffee = cyl(0.062, 0.062, 0.005, '#3a1f12', 10); at(coffee, -1.1, 1.19, -0.65); G.add(coffee);
      const menu = ph('menu', sign('MENU\n1. The Menu', 0.34, 0.46, '#fff3dc', RED, 0.6)); at(menu, -2.3, 1.32, -0.75, 0.2); G.add(menu);
      const nap = box(0.1, 0.15, 0.09, STEEL[0], 0.02); at(nap, -1.95, 1.08, -0.85); G.add(nap); const sug = cyl(0.045, 0.045, 0.12, '#f6f2ea', 8); at(sug, -1.78, 1.08, -0.85); G.add(sug); const sc = cyl(0.02, 0.048, 0.05, STEEL[0], 8); at(sc, -1.78, 1.2, -0.85); G.add(sc);
      const bottle = (col, cap, x, z) => { const b = new THREE.Group(); b.add(cyl(0.065, 0.075, 0.28, col, 10)); const c = cyl(0.02, 0.045, 0.09, cap, 8); c.position.y = 0.28; b.add(c);
        eyes(A, b, [[-0.03, 0.2, 0.072], [0.03, 0.2, 0.072]], 0.025); at(b, x, 1.08, z, 0); G.add(b); watch(A, b); return b; };
      bottle('#d0352a', '#f6efe0', -2.85, -0.95); bottle('#e8b52a', '#f6efe0', -2.62, -1.12);   // squeeze bottles (they watch the Wolf: garnish)
      const toaster = ph('toaster (pops up a quip)', new THREE.Group()); toaster.add(box(0.44, 0.26, 0.26, STEEL[0], 0.07)); const tsl = box(0.3, 0.012, 0.06, '#2a1a24', 0.004); tsl.position.y = 0.26; toaster.add(tsl);
      const lever = box(0.04, 0.06, 0.05, '#2a2220', 0.01); lever.position.set(0.24, 0.12, 0); toaster.add(lever);
      const toast = new THREE.Group(); toast.add(box(0.24, 0.22, 0.05, '#e8b36a', 0.04)); eyes(A, toast, [[-0.05, 0.15, 0.027], [0.05, 0.15, 0.027]], 0.025); toaster.add(toast);
      at(toaster, -3.05, 0.98, -2.7, 0.1); G.add(toaster); const pt = popper(A, toaster, toast, 0.08, 0.3);
      const toastQ = quips(['Toast.', 'I\'m done. You\'re not.', 'Lightly. Like you.', 'It\'s always breakfast somewhere. Here.', 'Don\'t look at me. Okay, look.']);
      // letter-board menu over the back bar (white push-in letters on black felt), the backwards diner clock
      const lb = pane(2.3, 0.78, cvTex(512, 170, (g, w, h) => { g.fillStyle = '#1e1c22'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2a30'; for (let y = 6; y < h; y += 9) g.fillRect(0, y, w, 2);
        txt(g, 'THINK ABOUT SOUP', w / 2, 20, 26, '#f4f1ea'); const L = [['SOUP', '25¢'], ['SOUP (HOT)', '30¢'], ['PIE', 'DISPLAY'], ['COFFEE', 'REFILL']];
        L.forEach(([a, b], i) => { const x = i % 2 ? w * 0.53 : w * 0.05, y = 62 + Math.floor(i / 2) * 36; txt(g, a, x, y, 22, '#f4f1ea', 'Futura, Avenir, sans-serif', 700, 'left'); txt(g, b, x + w * 0.42, y, 22, '#f4f1ea', 'Futura, Avenir, sans-serif', 700, 'right'); }); }, 1, 1, 0.3), 0.15);
      at(lb, 0.25, 2.62, -2.97); G.add(lb); const lbf = box(2.4, 0.88, 0.04, STEEL[0], 0.02); at(lbf, 0.25, 2.18, -2.995); G.add(lbf);
      const clock = backClock(A, 0.27, STEEL[0], false); clock.position.set(2.05, 2.6, -2.95); G.add(clock);
      // swinging kitchen door with a porthole (left wall)
      const door = new THREE.Group(); const dp = box(0.86, 2.0, 0.05, STEEL[0], 0.02); door.add(dp);
      const port = pane(0.36, 0.36, cvTex(128, 128, (g) => { g.fillStyle = '#f2d27a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#5a4a5a'; g.beginPath(); g.arc(64, 84, 30, 0, 7); g.fill();
        g.beginPath(); g.moveTo(38, 70); g.lineTo(44, 34); g.lineTo(58, 60); g.fill(); g.beginPath(); g.moveTo(90, 70); g.lineTo(84, 34); g.lineTo(70, 60); g.fill(); g.fillStyle = '#fff3dc'; g.fillRect(50, 78, 8, 6); g.fillRect(70, 78, 8, 6); }, 1, 1, 0.3));
      port.position.set(0, 1.45, 0.03); door.add(port); const pr = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 5, 18), feltMat(STEEL[2])); pr.position.set(0, 1.45, 0.035); door.add(pr);
      const eo = sign('EMPLOYEES ONLY', 0.5, 0.1, '#1e1c22', '#f4f1ea', 0.7); eo.position.set(0, 1.1, 0.035); door.add(eo);
      door.position.set(-3.96, 0, -1.9); door.rotation.y = Math.PI / 2; G.add(door);
      // booths along the window wall + a tableside jukebox wallbox
      const booth = new THREE.Group(); { const t = box(1.05, 0.05, 0.75, '#f2efe6', 0.02); t.position.y = 0.74; booth.add(t); const tr = box(1.07, 0.03, 0.77, STEEL[0], 0.01); tr.position.y = 0.72; booth.add(tr);
        const leg = cyl(0.05, 0.12, 0.72, STEEL[0], 8); booth.add(leg);
        for (const sx of [-1, 1]) { const seat = box(0.5, 0.16, 1.15, RED, 0.05); seat.position.set(sx * 0.78, 0.3, 0); booth.add(seat); const base = box(0.5, 0.3, 1.1, '#6b1c30', 0.03); base.position.set(sx * 0.78, 0, 0); booth.add(base);
          const back = box(0.18, 0.75, 1.15, RED, 0.06); back.position.set(sx * 1.05, 0.42, 0); booth.add(back); const pip = box(0.2, 0.03, 1.17, '#f6efe0', 0.01); pip.position.set(sx * 1.05, 1.16, 0); booth.add(pip); }
        const res = sign('RESERVED', 0.3, 0.12, '#fff3dc', RED, 0.6); res.position.set(0, 0.86, 0); res.rotation.x = -0.3; booth.add(res); }
      at(booth, 3.1, 0, -1.35, 0); G.add(booth); ph('diner booth (felt, code-built)', booth);
      const juke = new THREE.Group(); juke.add(box(0.14, 0.24, 0.3, STEEL[0], 0.04)); const jf = pane(0.26, 0.15, cvTex(128, 80, (g, w, h) => { g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h); g.fillStyle = RED; for (let i = 0; i < 5; i++) g.fillRect(8, 8 + i * 14, w - 16, 6); }, 1, 1, 0.3));
      jf.rotation.y = -Math.PI / 2; jf.position.set(-0.075, 0.13, 0); juke.add(jf); at(juke, 3.9, 1.05, -1.2); G.add(juke); ph('jukebox wallbox', juke);
      A.wolfSpot = [-0.2, 1.6];
      A.anim = []; A.proc = [];
      A.who = [
        { id: 'stove', label: 'STOVE', o: stove, talk: () => S.coffee % 2 ? [['STOVE', 'Soup\'s on.'], ['WOLF', 'On what?'], ['STOVE', 'On.']] : [['STOVE', 'Think about soup.'], ['WOLF', 'I\'ll have the—'], ['STOVE', 'Think about it.']] },
        { id: 'coffee', label: 'COFFEE', o: cup, talk: () => { S.coffee++; return [['STOVE', 'Refill.'], ['', `Refill number ${S.coffee}. You haven't had any.`]]; } },
        { id: 'menu', label: 'MENU', o: menu, talk: () => [['MENU', '1. The Menu.'], ['WOLF', 'What\'s on the menu?'], ['STOVE', 'The menu.']] },
        { id: 'booth', label: 'BOOTH', o: booth, talk: () => [['', 'A little card on the table: RESERVED.'], ['WOLF', 'For who?'], ['CAKE', 'For the booth.'], ['SHAKE', 'Bear saved it. Bear\'s at home.']] },
        { id: 'chair', label: 'STOOL', o: stools[2], talk: () => [['', 'The stool blinks.'], ['WOLF', '...'], ['', 'You blink first.']] },
        { id: 'pie', label: 'PIE', o: pie, talk: () => [['STOVE', 'That pie is for display.'], ['WOLF', 'Can I have a slice?'], ['STOVE', 'Of the display?']] },
        { id: 'toaster', label: 'TOASTER', o: toaster, talk: () => { pt.t = 3; audio.ui?.('confirm'); return [['TOAST', toastQ()]]; } },
        { id: 'board', label: 'LETTER BOARD', o: lb, chip: false, talk: () => [['', 'THINK ABOUT SOUP.'], ['', 'Somebody pushed every letter in by hand.'], ['STOVE', 'Me. I don\'t have hands.']] },
        { id: 'clock', label: 'CLOCK', o: clock, chip: false, talk: () => [['', 'The diner clock runs backwards.'], ['STOVE', 'Breakfast is getting closer.'], ['WOLF', 'It was already breakfast.'], ['STOVE', 'Closer.']] },
        { id: 'door', label: 'KITCHEN DOOR', o: door, chip: false, talk: () => [['', 'EMPLOYEES ONLY.'], ['', 'Through the porthole: a kitchen. A wolf in it looks back at you.'], ['STOVE', 'That\'s the other shift.']] },
        { id: 'juke', label: 'JUKEBOX', o: juke, chip: false, talk: () => [['', 'B-7: "Think About Soup" (instrumental).'], ['', 'Every button is B-7.']] },
      ];
      await diner().build(G, A, { stove, cup, coffee });   // run 10 (diner.js): Cake, Shake + Fuzzy Peach, the ORDER bell + menu sheet, the opening mission
      playhouse(A);
    },
    async laundromat(G, A) {
      const [washer, sock, glove, ant] = await Promise.all([glb('town2/washing_machine.glb', 1.3), glb('town2/argyle_sock.glb', 0.95, 'feltobj'),
        glb('town2/rubber_glove.glb', 0.55), glb('town2/anteater_lo.glb', 1.55, 'anteater')]);
      at(washer, -2.7, 0, -2.3, 0.15); G.add(washer); washer.userData.x0 = -2.7;
      // run 11 (M4) refresh: real front-loaders (control strip, coin slot, chrome-ringed porthole with a felt load inside), stacked dryers above, tiled wall + COIN-OP price board
      const LOADS = ['#e98a8a', '#9fd6b8', '#f2d27a', '#8a9fd6'];
      const loader = (x, y, z, k, dry) => { const m = new THREE.Group(); m.add(box(1.0, 1.0, 0.9, dry ? '#e8e4d8' : '#f4f0e6', 0.1)); const cp = box(0.96, 0.18, 0.06, '#c9c4b4', 0.02); cp.position.set(0, 0.8, 0.43); m.add(cp);
        for (const dx of [-0.3, -0.18]) { const kn = cyl(0.035, 0.035, 0.03, '#3a3a3a', 8); kn.rotation.x = Math.PI / 2; kn.position.set(dx, 0.89, 0.47); m.add(kn); } const coin = box(0.12, 0.08, 0.03, '#8a8c88', 0.01); coin.position.set(0.3, 0.85, 0.47); m.add(coin);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 20), feltMat('#c9ccc8')); ring.position.set(0, 0.42, 0.46); m.add(ring); const glass = cyl(0.25, 0.25, 0.02, '#9ccbd8', 18); glass.rotation.x = Math.PI / 2; glass.position.set(0, 0.42, 0.45); m.add(glass);
        const load = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), feltMat(LOADS[k % 4])); load.scale.z = 0.4; load.position.set(0, 0.36, 0.4); m.add(load); at(m, x, y, z); G.add(m); return m; };
      const loaders = [loader(-1.2, 0, -2.4, 0), loader(0.05, 0, -2.4, 1)]; ph('washers (extra)', loaders[0]);
      for (let i = 0; i < 3; i++) loader(-2.6 + i * 1.25, 1.62, -2.45, i + 2, true);
      const tw = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 1.4), texMat(cvTex(256, 44, (g, w, h) => { for (let y = 0; y < h; y += 11) for (let x = 0; x < w; x += 11) { g.fillStyle = (x / 11 + y / 11) % 2 ? '#f6efe0' : '#bfe0e2'; g.fillRect(x + 0.5, y + 0.5, 10, 10); } }, 1, 1))); tw.position.set(0, 0.7, -2.97); G.add(tw);
      const prices = sign('COIN-OP\nWASH 25¢ · DRY 10¢\nFOLD: FREE (BUT JUDGED)', 1.5, 0.75, '#2a4a5a', '#fff3dc', 0.62); at(prices, 0.6, 2.75, -2.96); G.add(prices);
      for (const x of [-2.0, 1.4]) { const fl = box(1.6, 0.06, 0.18, '#fffbe8', 0.02); fl.material.emissive = new THREE.Color('#fffbe8'); fl.material.emissiveIntensity = 0.6; at(fl, x, 3.05, -0.6); G.add(fl); }
      const cart = new THREE.Group(); cart.add(box(0.6, 0.5, 0.45, '#c9ccc8', 0.03)); const pole = cyl(0.015, 0.015, 0.7, '#8a8c88', 6); pole.position.set(0.25, 0.5, -0.2); cart.add(pole); const rod = cyl(0.015, 0.015, 0.5, '#8a8c88', 6); rod.rotation.z = Math.PI / 2; rod.position.set(0.25, 1.2, -0.2); cart.add(rod);
      const hang = box(0.35, 0.4, 0.02, '#e98a8a', 0.02); hang.position.set(0.25, 0.8, -0.2); cart.add(hang); const pile = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), feltMat('#d9c9e0')); pile.scale.y = 0.4; pile.position.y = 0.5; cart.add(pile);
      for (const [a, b] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]]) { const w = cyl(0.04, 0.04, 0.03, '#2a2a2a', 8); w.rotation.z = Math.PI / 2; w.position.set(a, -0.04, b); cart.add(w); } cart.position.y = 0.05; at(cart, 1.1, 0.05, 0.9, -0.3); G.add(cart);
      const chairs = new THREE.Group(); for (let i = 0; i < 3; i++) { const c = new THREE.Group(); const st = box(0.42, 0.06, 0.42, ['#f2a03a', '#3a9a8a', '#f2a03a'][i], 0.05); st.position.y = 0.42; c.add(st); const bk = box(0.42, 0.42, 0.06, ['#f2a03a', '#3a9a8a', '#f2a03a'][i], 0.05); bk.position.set(0, 0.46, -0.2); c.add(bk); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = cyl(0.015, 0.015, 0.42, '#8a8c88', 5); l.position.set(a, 0, b); c.add(l); } c.position.x = i * 0.5; chairs.add(c); }
      at(chairs, 3.0, 0, -1.6, -Math.PI / 2); G.add(chairs);
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
        { id: 'glove', label: 'FOLD (RUBBER GLOVE)', o: glove, talk: () => { A.folds = (A.folds || 0) + 1; const sc = [1, 1, 3, 1, 4, 1][(A.folds - 1) % 6];   // run 11 (M4): folding gets graded, every time
          return A.folds === 1 ? [['', 'You fold a shirt. The Rubber Glove grades your folding.'], ['', 'It holds up one finger.'], ['WOLF', 'Out of what?'], ['RUBBER GLOVE', 'One.']]
            : [['', `You fold shirt number ${A.folds}.`], ['RUBBER GLOVE', sc > 1 ? `${sc} fingers. Don't let it go to your head.` : 'One finger.'], ...(sc === 4 ? [['RUBBER GLOVE', 'That\'s my best grade. I don\'t have a thumb.']] : [])]; } },
        { id: 'chairs', label: 'CHAIRS', o: chairs, talk: () => [['', 'Three plastic chairs bolted together.'], ['', 'You sit in the middle one.'], ['', 'The dryers above you go round. You watch for a while.']] },
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
      const [mail, corded, bear] = await Promise.all([glb('town2/mailbox.glb', 1.35, 'object', { rest: 'breathe' }), glb('town2/corded_box.glb', 0.8), glb('town2/bear_lo.glb', 1.85, 'bear', { rest: 'breathe' })]);
      at(corded, -1.2, 1.1, -1.35, 0.1); G.add(corded); at(mail, 3.0, 0, 0.3, -0.6); G.add(mail);
      const scale = ph('parcel scale (floor)', box(0.9, 0.12, 0.8, '#b8b4a8', 0.04)); at(scale, 1.2, 0, 0.6); G.add(scale);
      const read = ph('scale readout', sign('2 BEARS', 0.5, 0.2, '#2a2a2a', '#9fd6b8', 0.6)); at(read, 1.2, 0.6, 1.05); const post = cyl(0.03, 0.03, 0.5, '#7a7a70', 6); at(post, 1.2, 0, 1.0); G.add(post, read);
      at(bear, 1.2, 0.12, 0.55, 0.3); G.add(bear);
      const stamp = ph('stamp machine', box(0.7, 1.5, 0.5, '#c9584a', 0.06)); at(stamp, -3.5, 0, 0.6, Math.PI / 2); G.add(stamp);
      const ss = sign('STAMPS', 0.5, 0.16, '#fff3dc', '#c9584a'); at(ss, -3.24, 1.2, 0.6, Math.PI / 2); G.add(ss);
      const parcels = ph('FRAGILE parcels', new THREE.Group()); [[0, 0, 0.6, '#c9a36a'], [0.1, 0.45, 0.45, '#d8b47a'], [-0.05, 0.8, 0.32, '#c08f5a']].forEach(([x, y, s, c]) => { const b = box(s, s * 0.75, s, c, 0.03); b.position.set(x, y, 0); parcels.add(b); });
      const fr = sign('FRAGILE', 0.5, 0.14, '#c9584a', '#fff3dc'); fr.position.set(0, 0.24, 0.31); parcels.add(fr); at(parcels, -2.6, 0, 1.0, 0.2); G.add(parcels);
      const s1 = sign('PLEASE TAKE A NUMBER\nThe numbers are at the DMV', 2.4, 0.55, '#fff3dc', '#5f6f3c', 0.5); at(s1, 1.8, 2.55, -2.97); G.add(s1);
      A.wolfSpot = [-0.4, 1.4]; A.anim = []; A.proc = [mail, bear];
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
      const [watch, win, moth, heron, chair] = await Promise.all([glb('town2/pocket_watch.glb', 1.0), glb('town2/window_box.glb', 1.1), glb('town2/moth_lo.glb', 1.5, 'moth', { rest: 'breathe' }),
        glb('town2/heron_lo.glb', 1.9, 'heron', { clip: 'idle', t: 0.3, speed: 0 }), glb('town2/eye_chair.glb', 0.95)]);
      const ledge = ph('service window counter', box(2.2, 1.05, 0.6, '#7d8a6a', 0.05)); at(ledge, 1.9, 0, -2.6); G.add(ledge);
      at(win, 1.9, 1.05, -2.65); G.add(win); win.userData.sy = win.scale.y;
      const w1 = sign('WINDOW 1 (of 1)', 1.3, 0.26, '#fff3dc', '#3a1f2a'); at(w1, 1.9, 2.55, -2.97); G.add(w1);
      const shelf = box(1.0, 0.08, 0.5, '#7d8a6a', 0.02); at(shelf, -0.6, 1.9, -2.75); G.add(shelf);
      at(watch, -0.6, 1.98, -2.7, 0.1); G.add(watch);
      const now = ph('NOW SERVING display', sign('NOW SERVING\n2', 0.9, 0.5, '#2a2a2a', '#ff6a4a', 0.55)); at(now, -2.0, 2.4, -2.97); G.add(now); A.now = now;
      const c2 = chair; at(c2, -1.6, 0, 0.3); G.add(c2);   // one eye chair (was 2: trimmed to stay under 60k tris)
      at(moth, -3.25, 0, 0.55, 0.45); G.add(moth);   // stands by the chairs (rest pose; the seated clip folded the Moth into the chair)
      at(heron, 0.9, 0, -1.4, Math.PI * 0.85); G.add(heron);
      const post = ph('take-a-number post', new THREE.Group()); const pole = cyl(0.04, 0.05, 1.2, '#9a9a90', 8); const disp = box(0.3, 0.24, 0.2, '#e0453a', 0.05); disp.position.y = 1.2; post.add(pole, disp); at(post, -3.1, 0, 1.9); G.add(post);
      const plant = ph('plant (waiting longest)', new THREE.Group()); const pot = cyl(0.22, 0.17, 0.35, '#c9785a', 12); plant.add(pot);
      for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), feltMat('#5f8a4a')); l.scale.set(0.6, 1.4, 0.3); l.position.set(Math.sin(i * 1.3) * 0.12, 0.55 + (i % 2) * 0.12, Math.cos(i * 1.3) * 0.12); l.rotation.z = Math.sin(i * 2) * 0.5; plant.add(l); }
      const tk = sign('3', 0.12, 0.09, '#fff3dc', '#e0453a', 0.8); tk.position.set(0, 0.42, 0.24); plant.add(tk); at(plant, -3.4, 0, -2.4); G.add(plant);
      const chart = ph('eye chart', sign('E\nF P\nT O Z\nfish', 0.6, 0.85, '#fff3dc', '#2a2a2a', 0.75)); at(chart, -3.88, 1.6, -1.0, Math.PI / 2); G.add(chart);
      A.wolfSpot = [0.2, 1.7]; A.anim = [watch]; A.proc = [moth];
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
        glb('hf2/phone.glb', 0.5, 'object', { rest: 'bob' }), glb('town2/lynx_lo.glb', 1.7, 'lynx', { clip: 'idle', t: 0.5 })]);
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
      A.wolfSpot = [0.6, 1.9]; A.anim = [tvh, lynx]; A.proc = [phone]; A.ring = 0; A.fz = 0;
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
    async bowl(G, A) {   // REAL PLACE: an untouched 1960 Brunswick-era alley (refs: Kona Lanes 1960, Western Lanes Raleigh 1960, restored lanes at the Int'l Bowling Museum)
      // run 8: twice the house (8 lanes, a real concourse) + a playable lane: pay at the control counter, rental shoes, walk to your lit lane, bowl (bowling.js)
      const [skate, ram, bear] = await Promise.all([glb('hf2/roller_skate.glb', 0.5, 'object', { rest: 'bob' }), glb('town2/ram_lo.glb', 1.75, 'ram', { clip: 'idle', t: 0.2 }),
        glb('town2/bear_lo.glb', 1.85, 'bear', { rest: 'breathe' })]);
      const RW = 14, RD = 7.6, H = 4.0, WAL = '#6b4528', WAL2 = '#5a3920', CREAM = '#efe2c4', TQ = '#3f9c9a', CORAL = '#e0705a', MUST = '#e2b23a', PEN = 'Marker Felt, "Comic Sans MS", sans-serif';
      const yy = (h, y) => h * (1 - y / H);
      const panels = (g, w, h, top, step = 34) => { g.fillStyle = WAL; g.fillRect(0, yy(h, top), w, h); for (let x = 0; x < w; x += step) { g.fillStyle = WAL2; g.fillRect(x, yy(h, top), 3, h); g.fillStyle = 'rgba(255,220,170,0.08)'; g.fillRect(x + 6, yy(h, top), 8, h); } };
      const LANES = 8, LW = 1.05, LX0 = -6.95, LX1 = LX0 + LW * LANES, LZ0 = -3.55, LZ1 = 1.95, FOUL = 0.6, PZ = -3.0;   // 8 lanes (pitch 1.05 m), pin decks at the back, foul line, approaches
      const lc = (i) => LX0 + LW * (i + 0.5);
      realRoom(G, { H, W: RW, D: RD,
        floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#2f6a6e'; g.fillRect(0, 0, w, h);   // atomic-starburst concourse carpet
          for (const [x, y, c] of [[50, 60, MUST], [180, 40, CORAL], [120, 160, CREAM], [220, 210, MUST], [30, 220, CORAL]]) { g.strokeStyle = c; g.lineWidth = 3; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); } }
          g.strokeStyle = '#1e4a4e'; g.lineWidth = 5; for (const [x, y] of [[110, 70], [40, 140], [200, 120]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 18, x + 44, y + 6); g.stroke(); } }, 6, 3.4),
        back: cvTex(1024, 256, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); panels(g, w, h, 2.95); g.fillStyle = CORAL; g.fillRect(0, yy(h, 3.02), w, yy(h, 2.95) - yy(h, 3.02)); }),
        left: cvTex(512, 256, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); panels(g, w, h, 1.3, 28); g.fillStyle = CORAL; g.fillRect(0, yy(h, 1.38), w, yy(h, 1.3) - yy(h, 1.38)); }),
        right: cvTex(512, 256, (g, w, h) => { g.fillStyle = CREAM; g.fillRect(0, 0, w, h); panels(g, w, h, 1.3, 28); g.fillStyle = TQ; g.fillRect(0, yy(h, 1.38), w, yy(h, 1.3) - yy(h, 1.38)); }),
        ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,70,50,0.25)'; for (let i = 0; i < 900; i++) g.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);   // acoustic tile + lane light troughs
          g.fillStyle = '#b8ad96'; for (let p = 0; p <= w; p += 32) { g.fillRect(p, 0, 2, h); g.fillRect(0, p, w, 2); } g.fillStyle = '#fff7d8'; g.fillRect(40, 0, 18, h); g.fillRect(168, 0, 18, h); }, 7, 2.6),
        cy: [3.1, 3.85], cz: 5.4, ceilGlow: 0.4 });
      // maple lanes: boards, gutters, target arrows, approach dots, foul line, darker pin decks
      const laneTex = cvTex(1024, 512, (g, w, h) => { const px = (x) => (x - LX0) / (LX1 - LX0) * w, pz = (z) => (z - LZ0) / (LZ1 - LZ0) * h;
        for (let x = 0; x < w; x += 3) { g.fillStyle = (x / 3) % 3 === 0 ? '#e2b97e' : (x / 3) % 3 === 1 ? '#ebc78f' : '#e6c086'; g.fillRect(x, 0, 3, h); }
        g.fillStyle = 'rgba(150,90,40,0.18)'; g.fillRect(0, 0, w, pz(-2.75));   // pin decks
        for (let i = 0; i < LANES; i++) { const c = lc(i); for (const s of [-1, 1]) { g.fillStyle = '#2e2420'; g.fillRect(px(c + s * 0.47) - 6, 0, 12, pz(FOUL)); }
          g.fillStyle = '#5a3a22'; for (let k = -3; k <= 3; k++) { const x = px(c + k * 0.1), z = pz(-0.6 + Math.abs(k) * 0.07); g.beginPath(); g.moveTo(x, z - 9); g.lineTo(x - 4, z + 5); g.lineTo(x + 4, z + 5); g.fill(); }
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(px(c + k * 0.13), pz(1.65), 2.5, 0, 7); g.fill(); g.beginPath(); g.arc(px(c + k * 0.13), pz(1.25), 2.5, 0, 7); g.fill(); } }
        g.fillStyle = '#1e1a1a'; g.fillRect(0, pz(FOUL) - 3, w, 6); }, 1, 1, 0.5);
      const lanes = ph('bowling lanes (maple)', pane(LX1 - LX0, LZ1 - LZ0, laneTex)); lanes.rotation.x = -Math.PI / 2; lanes.position.set((LX0 + LX1) / 2, 0.012, (LZ0 + LZ1) / 2); G.add(lanes);
      const pinG = new THREE.LatheGeometry([[0.035, 0], [0.05, 0.09], [0.024, 0.24], [0.034, 0.31], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 5);   // far pins: 40 tris each
      const pins = ph('bowling pins', new THREE.InstancedMesh(pinG, feltMat('#fff3dc'), 80)); let n = 0;
      for (let l = 0; l < LANES; l++) for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) { mx4.makeTranslation(lc(l) + (k - r / 2) * 0.14, 0.012, PZ - r * 0.13); pins.setMatrixAt(n++, mx4); }
      pins.castShadow = !LOW; G.add(pins);
      const pit = new THREE.Mesh(new THREE.BoxGeometry(LX1 - LX0, 0.62, 0.12), feltMat('#141014')); pit.position.set((LX0 + LX1) / 2, 0.31, -3.74); G.add(pit);   // the dark pinsetter opening
      const kbG = new THREE.BoxGeometry(0.06, 0.62, 0.9), kbM = feltMat(WAL2); for (let i = 0; i <= LANES; i++) { const kb = new THREE.Mesh(kbG, kbM); kb.position.set(LX0 + i * LW, 0.31, -3.25); G.add(kb); }   // kickbacks
      // masking units: back-lit panels with lane numbers + crown (Brunswick-style); yours glows when it's assigned
      const mask = pane(LX1 - LX0, 0.6, cvTex(1024, 70, (g, w, h) => { g.fillStyle = '#3a2418'; g.fillRect(0, 0, w, h); for (let i = 0; i < LANES; i++) { const x = i * w / LANES; g.fillStyle = '#f6ead0'; g.fillRect(x + 6, 6, w / LANES - 12, h - 12);
        g.fillStyle = MUST; g.beginPath(); const cx = x + w / LANES * 0.3, cy = h * 0.55; g.moveTo(cx - 16, cy + 10); g.lineTo(cx - 16, cy - 8); g.lineTo(cx - 8, cy); g.lineTo(cx, cy - 12); g.lineTo(cx + 8, cy); g.lineTo(cx + 16, cy - 8); g.lineTo(cx + 16, cy + 10); g.fill();
        txt(g, String(i + 1), x + w / LANES * 0.68, h * 0.53, 44, '#b8332e'); } }, 1, 1, 0.2), 0.75);
      at(mask, (LX0 + LX1) / 2, 0.93, -3.66); G.add(mask); const mf = box(LX1 - LX0 + 0.1, 0.08, 0.2, WAL2, 0.02); at(mf, (LX0 + LX1) / 2, 1.22, -3.66); G.add(mf);
      const lit = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.06, 0.62), new THREE.MeshBasicMaterial({ color: '#ffb36a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); lit.position.set(0, 1.23, -3.64); G.add(lit);
      const litBar = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.1, 0.07), new THREE.MeshBasicMaterial({ color: '#ff8a5a' })); litBar.position.set(0, 1.58, -3.63); G.add(litBar);
      const houseSign = pane(3.6, 0.9, cvTex(512, 128, (g, w, h) => { g.fillStyle = '#2a1a16'; g.fillRect(0, 0, w, h); g.strokeStyle = CORAL; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
        g.save(); g.translate(w / 2, h * 0.5); g.rotate(-0.06); txt(g, 'Gutter Bowl', 0, 0, 74, '#ffd9c0', '"Brush Script MT", "Snell Roundhand", cursive', 700); g.restore(); txt(g, '8 LANES · SINCE 1960', w / 2, h - 20, 14, MUST);
        g.fillStyle = MUST; for (const x of [40, w - 40]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 7 : 17; g.lineTo(x + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.fill(); } }, 1, 1, 0.2), 0.85);
      at(houseSign, (LX0 + LX1) / 2, 2.35, -3.77); G.add(houseSign);
      // Telescore overhead screens (one per lane pair): grease pencil; the one over your lane shows your last game
      const scoreDraw = (g, w, h) => { g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8e0c8'; g.lineWidth = 2; const fx = (i) => 70 + i * 44;
        for (let r = 0; r < 3; r++) { g.strokeRect(10, 20 + r * 58, w - 20, 50); for (let i = 0; i < 10; i++) g.strokeRect(fx(i), 20 + r * 58, 44, 50); }
        txt(g, 'RAM', 40, 45, 20, '#f2e070', PEN); txt(g, 'SUN', 40, 103, 20, '#f2e070', PEN); txt(g, 'HUMM', 40, 161, 16, '#f2e070', PEN);
        for (let i = 0; i < 10; i++) { txt(g, '0', fx(i) + 22, 50, 22, '#f2e070', PEN); g.strokeStyle = '#f2e070'; g.lineWidth = 2; g.beginPath(); g.arc(fx(i) + 22, 103, 10, 0, 7); g.stroke();
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(fx(i) + 22 + Math.cos(a) * 13, 103 + Math.sin(a) * 13); g.lineTo(fx(i) + 22 + Math.cos(a) * 18, 103 + Math.sin(a) * 18); g.stroke(); } txt(g, 'X', fx(i) + 22, 161, 22, '#f2e070', PEN); } };
      const scoreTex = cvTex(512, 200, scoreDraw, 1, 1, 0.2);
      const screens = [], rodG = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4); for (let p = 0; p < LANES / 2; p++) { const s = new THREE.Group(); const fr = box(1.5, 0.58, 0.06, WAL2, 0.02); fr.position.y = -0.58; s.add(fr); const sp = pane(1.4, 0.5, scoreTex, 0.7); sp.position.set(0, -0.29, 0.035); s.add(sp); s.userData.sp = sp;
        for (const sx of [-0.6, 0.6]) { const rod = new THREE.Mesh(rodG, feltMat(STEEL[2])); rod.position.set(sx, 0.35, 0); s.add(rod); } s.position.set(lc(2 * p) + LW / 2, 3.3, 0.7); s.rotation.x = 0.22; G.add(s); screens.push(s); }
      ph('Telescore overhead screens', screens[0]);
      A.setLaneScore = (draw) => { const s = screens[Math.floor((S.lane - 1) / 2)]; if (!s) return; const t = cvTex(512, 200, (g, w, h) => { g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h); draw(g, w, h); }, 1, 1, 0); s.userData.sp.material = texMat(t, 0.7); };
      // scorer's desks (lamp-head projector) + settee chairs, one set per lane pair
      const deskG = new THREE.Group(); deskG.add(box(0.75, 0.66, 0.45, WAL, 0.03)); const dtop = box(0.8, 0.05, 0.5, CREAM, 0.02); dtop.position.y = 0.66; dtop.rotation.x = 0.18; deskG.add(dtop);
      const pc = cyl(0.03, 0.03, 0.5, STEEL[2], 5); pc.position.set(0, 0.68, -0.18); deskG.add(pc); const proj = box(0.26, 0.2, 0.3, '#2a2a2e', 0.04); proj.position.set(0, 1.12, -0.18); deskG.add(proj);
      const chairG = new THREE.Group(); { const st = box(0.46, 0.08, 0.44, TQ, 0.03); st.position.y = 0.4; chairG.add(st); chairG.add(cyl(0.03, 0.05, 0.4, STEEL[2], 5)); const bk = box(0.46, 0.42, 0.06, TQ, 0.03); bk.position.set(0, 0.46, 0.2); bk.rotation.x = 0.18; chairG.add(bk); }
      const chairC = chairG.clone(true); chairC.traverse(o => { if (o.isMesh && o.material.color.getHexString() === TQ.slice(1)) { o.material = o.material.clone(); o.material.color.set(CORAL); } });
      const desks = []; for (let p = 0; p < LANES / 2; p++) { const x = lc(2 * p) + LW / 2, d = deskG.clone(); at(d, x, 0, 2.35, Math.PI); G.add(d); desks.push(d);
        for (const s of [-1, 1]) { const c = (s < 0 ? chairG : chairC).clone(); at(c, x + s * 0.62, 0, 2.75, Math.PI); G.add(c); } }
      const step = box(LX1 - LX0, 0.06, 0.12, WAL2, 0.02); at(step, (LX0 + LX1) / 2, 0, 2.0); G.add(step);   // the step up from the approaches to the settees
      // Gold-Crown-style ball returns between lane pairs
      const sh = new THREE.Shape([[0, 0], [1.4, 0], [1.4, 0.36], [0.85, 0.36], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y)));
      const hoodG = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: false }), hoodM = feltMat('#efe6d2');
      const ballG = new THREE.SphereGeometry(0.11, 10, 7), BCOL = ['#1e1a1e', '#7a2a2e', '#2a3a6a'].map(c => feltMat(c));
      for (let p = 0; p < LANES / 2; p++) { const r = new THREE.Group(); const hm = new THREE.Mesh(hoodG, hoodM); hm.castShadow = !LOW; hm.rotation.y = -Math.PI / 2; hm.position.x = 0.17; r.add(hm);
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.8), feltMat(CORAL)); st.position.set(0, 0.22, 0.5); st.rotation.x = -0.26; r.add(st);
        BCOL.forEach((m, k) => { const b = new THREE.Mesh(ballG, m); b.position.set(0, 0.47, 0.95 + k * 0.17); r.add(b); }); at(r, lc(2 * p) + LW / 2, 0, 0.35); G.add(r); if (!p) ph('ball returns (Gold Crown style)', r); }
      // the house ball that marks your lane (sits on the approach of the lit lane)
      const ball = ph('bowling ball', new THREE.Mesh(ballG, feltMat('#2a3f7a'))); ball.castShadow = !LOW; G.add(ball);
      // CONTROL COUNTER (right of the lanes): cash register, the Roller Skate clerk, shoe cubbies + price board
      const CX = 3.6, CZ = -2.95;
      const ctr = ph('control counter', box(2.6, 1.0, 0.62, WAL, 0.03)); at(ctr, CX, 0, CZ); G.add(ctr);
      const cband = box(2.62, 0.06, 0.64, STEEL[0], 0.01); at(cband, CX, 0.8, CZ); G.add(cband); const ctop = box(2.7, 0.06, 0.74, CREAM, 0.02); at(ctop, CX, 1.0, CZ); G.add(ctop);
      at(skate, CX - 0.35, 1.06, CZ + 0.05, 0.4); G.add(skate);
      const reg = ph('cash register', new THREE.Group()); reg.add(box(0.42, 0.24, 0.36, STEEL[0], 0.03)); const keys = box(0.38, 0.06, 0.2, '#2a2a2e', 0.02); keys.position.set(0, 0.25, 0.06); keys.rotation.x = -0.4; reg.add(keys);
      const flagT = cvTex(64, 32, (g, w, h) => { g.fillStyle = '#f6ead0'; g.fillRect(0, 0, w, h); txt(g, 'NO SALE', w / 2, h / 2, 13, '#b8332e'); }, 1, 1, 0);
      const flag = pane(0.24, 0.12, flagT, 0.5); flag.position.set(0, 0.42, -0.05); reg.add(flag); const top2 = box(0.3, 0.1, 0.12, STEEL[1], 0.02); top2.position.set(0, 0.24, -0.1); reg.add(top2);
      const drawer = box(0.38, 0.08, 0.3, STEEL[2], 0.02); drawer.position.set(0, -0.08, 0.04); reg.add(drawer); at(reg, CX + 0.6, 1.06, CZ - 0.02, -0.15); G.add(reg);
      const cub = pane(2.6, 1.0, cvTex(320, 124, (g, w, h) => { g.fillStyle = WAL2; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const x = 6 + i * 34.5, y = 5 + j * 29.5; g.fillStyle = '#2a1a12'; g.fillRect(x, y, 31, 25);
        const c2 = ['#b8332e', '#2f6a3e', '#2a3a6a'][(i + j) % 3]; g.fillStyle = c2; g.fillRect(x + 3, y + 8, 8, 10); g.fillStyle = '#f6efe0'; g.fillRect(x + 11, y + 8, 9, 10); g.fillStyle = c2; g.fillRect(x + 20, y + 8, 8, 10); g.fillStyle = '#1e1a1a'; g.fillRect(x + 3, y + 18, 25, 3); } }, 1, 1, 0.3));
      at(cub, CX, 1.75, -3.77); G.add(cub);
      const rs = pane(2.3, 0.5, cvTex(320, 70, (g, w, h) => { g.fillStyle = '#f6ead0'; g.fillRect(0, 0, w, h); g.strokeStyle = CORAL; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); txt(g, 'CONTROL DESK', w / 2, 24, 22, '#b8332e'); txt(g, 'SHOES 15¢  ·  GAMES 35¢', w / 2, 50, 18, WAL2); }, 1, 1, 0.2), 0.6);
      at(rs, CX, 2.62, -3.77); G.add(rs);
      // spray puff (the Skate sprays the shoes) — a few felt cotton balls that grow and fade
      const puffM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }), puff = new THREE.Group(), pG = new THREE.IcosahedronGeometry(0.09, 0);
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(pG, puffM); m.userData.d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.2, Math.random() - 0.3); puff.add(m); } puff.visible = false; G.add(puff);
      // crane "digger" full of socks, house ball rack on the right wall, ball cleaner
      const claw = ph('crane "digger" (socks)', new THREE.Group());
      claw.add(box(0.8, 0.95, 0.75, WAL, 0.04)); const cg = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.7, 0.72), new THREE.MeshStandardMaterial({ color: '#e8f6fa', transparent: true, opacity: 0.25, roughness: 1 })); cg.position.y = 1.3; claw.add(cg);
      const ct = box(0.84, 0.2, 0.8, STEEL[0], 0.04); ct.position.y = 1.65; claw.add(ct); const mq = sign('DIGGER 5¢', 0.78, 0.17, '#b8332e', '#f6ead0', 0.7); mq.position.set(0, 1.75, 0.405); claw.add(mq);
      for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.08), feltMat(['#d9a43a', '#e98a8a', '#9fd6b8', '#6aa4b8', '#c9384a', '#f2d27a', '#8a6ab8'][i])); s.position.set(-0.24 + (i % 4) * 0.16, 1.07 + Math.floor(i / 4) * 0.12, -0.2 + (i % 3) * 0.17); s.rotation.z = i; claw.add(s); }
      at(claw, 5.8, 0, -3.1); G.add(claw);
      const rack = ph('house ball rack', new THREE.Group()); for (const y of [0.35, 0.75]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 2.2), feltMat(STEEL[2])); rl.position.y = y; rack.add(rl); }
      for (const z of [-1.05, 1.05]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.05), feltMat(WAL2)); lg.position.set(0, 0.4, z); rack.add(lg); }
      const hb10 = new THREE.InstancedMesh(ballG, feltMat('#ffffff'), 10), cA = ['#1e1a1e', '#7a2a2e', '#2a3a6a', '#2f6a3e', '#c9a24a'];
      for (let i = 0; i < 10; i++) { mx4.makeTranslation(0, i < 5 ? 0.48 : 0.88, -0.8 + (i % 5) * 0.4); hb10.setMatrixAt(i, mx4); hb10.setColorAt(i, new THREE.Color(cA[i % 5])); } rack.add(hb10);
      at(rack, 6.65, 0, -1.4); G.add(rack);
      const cleaner = ph('ball cleaner 10¢', new THREE.Group()); cleaner.add(cyl(0.03, 0.05, 0.85, STEEL[2], 6)); const cbx = box(0.3, 0.26, 0.24, TQ, 0.04); cbx.position.y = 0.85; cleaner.add(cbx);
      const bcl = sign('BALL CLEANER 10¢', 0.3, 0.08, '#f6ead0', WAL2, 0.8); bcl.position.set(0, 0.98, 0.125); cleaner.add(bcl); at(cleaner, 2.0, 0, 0.6); G.add(cleaner);
      // SNACK BAR along the right wall: counter, stools, back-lit menu, pop cooler
      const snack = ph('snack bar (procedural)', new THREE.Group()); const sc0 = box(0.6, 1.0, 2.4, CREAM, 0.03); snack.add(sc0); const scb = box(0.62, 0.12, 2.42, CORAL, 0.02); scb.position.y = 0.2; snack.add(scb);
      const sct = box(0.75, 0.06, 2.55, WAL, 0.02); sct.position.y = 1.0; snack.add(sct); const urn = cyl(0.12, 0.12, 0.4, STEEL[1], 8); urn.position.set(0.05, 1.06, 0.8); snack.add(urn);
      const pie = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e8f6fa', transparent: true, opacity: 0.35 })); pie.position.set(0.05, 1.06, -0.6); snack.add(pie);
      const pz2 = cyl(0.13, 0.13, 0.05, '#d9a43a', 8); pz2.position.set(0.05, 1.06, -0.6); snack.add(pz2);
      for (const z of [-0.8, 0, 0.8]) { const stl = new THREE.Group(); stl.add(cyl(0.03, 0.12, 0.7, STEEL[2], 6)); const seat = cyl(0.19, 0.19, 0.09, CORAL, 10); seat.position.y = 0.7; stl.add(seat); at(stl, -0.7, 0, z); snack.add(stl); }
      at(snack, 6.25, 0, 1.6); G.add(snack);
      const menu = pane(2.2, 1.0, cvTex(256, 128, (g, w, h) => { g.fillStyle = '#f6ead0'; g.fillRect(0, 0, w, h); g.fillStyle = CORAL; g.fillRect(0, 0, w, 30); txt(g, 'SNACK BAR', w / 2, 16, 22, '#f6ead0');
        [['HOT DOG', '25¢'], ['COFFEE', '10¢'], ['PIE', '20¢'], ['SOCK (ONE)', 'FREE']].forEach(([a, b], i) => { txt(g, a, 14, 44 + i * 21, 16, WAL2, 'Futura, Avenir, sans-serif', 700, 'left'); txt(g, b, w - 14, 44 + i * 21, 16, '#b8332e', 'Futura, Avenir, sans-serif', 700, 'right'); }); }, 1, 1, 0.2), 0.6);
      menu.position.set(6.97, 2.1, 1.6); menu.rotation.y = -Math.PI / 2; G.add(menu);
      const cooler = ph('pop cooler', new THREE.Group()); cooler.add(box(0.5, 0.85, 0.85, '#b8332e', 0.05)); const cl2 = box(0.52, 0.06, 0.87, STEEL[0], 0.02); cl2.position.y = 0.85; cooler.add(cl2);
      const ice = sign('ICE COLD\nPOP 10¢', 0.6, 0.3, '#f6ead0', '#b8332e', 0.6); ice.rotation.y = -Math.PI / 2; ice.position.set(-0.26, 0.5, 0); cooler.add(ice); at(cooler, 6.6, 0, -0.05); G.add(cooler);
      at(bear, 4.9, 0, 1.75, -1.1); G.add(bear);
      at(ram, 2.35, 0, 1.35, -0.9); G.add(ram);
      // the Hummingbird (felt placeholder): small, leather jacket, hovering
      const hb = ph('Hummingbird (league bully)', new THREE.Group());
      const hbody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), feltMat('#3fae7a')); hbody.scale.set(1, 1.2, 1); hb.add(hbody);
      const jk = box(0.17, 0.12, 0.15, '#2a2220', 0.04); jk.position.y = -0.07; hb.add(jk);
      const hh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), feltMat('#3fae7a')); hh.position.y = 0.12; hb.add(hh);
      const bk = cyl(0.004, 0.01, 0.13, '#2a2a2a', 5); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.12, 0.04); hb.add(bk);
      const wings = []; for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 4), feltMat('#9fd6b8')); w.scale.set(1.4, 0.2, 0.6); w.position.set(s * 0.1, 0.03, -0.02); hb.add(w); wings.push(w); }
      hb.position.set(1.85, 1.6, 0.9); G.add(hb);

      // ---------------- state: your lane, the shoes on the Wolf's feet
      const laneSpot = () => new THREE.Vector3(lc((S.lane || 4) - 1), 0, 1.45);
      const setLane = () => { const on = !!(S.shoes && S.lane); lit.visible = litBar.visible = on; const i = (S.lane || 4) - 1; lit.position.x = litBar.position.x = lc(i); ball.position.set(lc(i) + 0.25, 0.12, 1.75); };
      let shoes = [];
      const shoeMats = { sole: feltMat('#2a1e1a'), a: feltMat('#b8332e'), b: feltMat('#f6efe0'), lace: feltMat('#3a1f2a') };
      const findBone = (n) => { let b = null; A.wolf.traverse(o => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
      function putShoes(on) {
        for (const s of shoes) s.parent?.remove(s); shoes = []; if (!on || !A.wolf) return;
        A.wolf.updateMatrixWorld(true); const fp = new THREE.Vector3(), tp = new THREE.Vector3();
        for (const side of ['Left', 'Right']) { const foot = findBone(side + 'Foot'), toe = findBone(side + 'ToeBase'); if (!foot || !toe) continue;
          foot.getWorldPosition(fp); toe.getWorldPosition(tp); const dir = tp.clone().sub(fp); dir.y = 0; const l = Math.max(0.06, dir.length()); dir.normalize();
          const s = new THREE.Group(), len = l * 2.3, wd = l * 1.05, ht = l * 0.75;   // two-tone rental: coloured heel + toe, cream saddle, dark sole, lace stripe, size on the heel
          const sole = new THREE.Mesh(new THREE.BoxGeometry(wd, ht * 0.22, len), shoeMats.sole); sole.position.y = ht * 0.11; s.add(sole);
          const mid = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.94, ht * 0.7, len * 0.42), shoeMats.b); mid.position.set(0, ht * 0.55, -len * 0.02); s.add(mid);
          const heel = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.96, ht * 0.75, len * 0.32), shoeMats.a); heel.position.set(0, ht * 0.56, -len * 0.33); s.add(heel);
          const toeC = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), shoeMats.a); toeC.scale.set(wd * 0.94, ht * 0.75, len * 0.36); toeC.position.set(0, ht * 0.2, len * 0.22); s.add(toeC);
          const lace = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.3, 0.012, len * 0.38), shoeMats.lace); lace.position.set(0, ht * 0.91, 0); s.add(lace);
          s.position.set(fp.x + dir.x * l * 0.45, 0.002, fp.z + dir.z * l * 0.45); s.rotation.y = Math.atan2(dir.x, dir.z); s.updateMatrixWorld(true); foot.attach(s); shoes.push(s); }
      }
      A.putShoes = putShoes;
      // little timed effects: register drawer, spray puff
      let drawerT = 0, puffT = 0;
      const chaChing = () => { drawerT = 1.6; bowling().sfx('chaching'); };
      const spray = () => { puffT = 1.0; puff.visible = true; puff.position.set(CX - 0.35, 1.25, CZ + 0.3); bowling().sfx('spray'); };
      A.wolfSpot = [2.6, 2.6]; A.anim = [ram]; A.proc = [bear, skate]; A.view = { pw: 3.9, lw: 5.4, h: 2.3, look: -0.7, pan: 3.4 }; A.bounds = [-6.6, 6.6, -2.4, 3.3]; A.speed = 2.6;
      A.setAir = () => { setLane(); if (S.shoes) putShoes(true); };
      A.tick = (dt, t) => { hb.position.y = 1.6 + Math.sin(t * 2.3) * 0.08; hb.rotation.y = Math.sin(t * 0.7) * 0.6; for (const w of wings) w.rotation.z = Math.sin(t * 70) * 0.5;
        if (lit.visible) lit.material.opacity = 0.35 + 0.3 * Math.sin(t * 5);
        if (drawerT > 0) { drawerT -= dt; const k = Math.min(1, (1.6 - drawerT) * 8) * Math.min(1, drawerT * 3); drawer.position.z = 0.04 + 0.22 * k; flag.position.y = 0.42 + 0.1 * k; }
        if (puffT > 0) { puffT -= dt; const u = 1 - puffT; puff.children.forEach(m => { m.position.copy(m.userData.d).multiplyScalar(u * 0.6); m.scale.setScalar(0.4 + u * 1.6); }); puffM.opacity = Math.max(0, 0.8 * Math.sin(Math.min(1, u) * Math.PI)); if (puffT <= 0) puff.visible = false; }
        if (A.toLane && T.goal && A.wolf.position.distanceTo(T.goal) < 0.08) { A.toLane = false; startLane(A); } };
      const goLane = () => { A.toLane = true; T.focus = null; T.goal = laneSpot(); T.look = new THREE.Vector3(T.goal.x, 0, -3.5); };
      A.who = [
        { id: 'skate', label: 'CONTROL DESK', o: skate, talk: () => {
          if (!S.shoes) return [['ROLLER SKATE', 'One game, one pair of shoes. Fifty cents.'], ['WOLF', 'Put it on my tab.'], ['ROLLER SKATE', 'You don\'t have a tab.', chaChing], ['ROLLER SKATE', 'You do now.'],
            ['ROLLER SKATE', 'Size?'], ['WOLF', 'Paws.'], ['ROLLER SKATE', 'We have one size. It\'s this one.'], ['', 'The Skate sprays the shoes. For your protection.', spray], ['WOLF', 'Whose protection?'], ['ROLLER SKATE', 'Ours.'],
            ['', 'Got: two-tone rental shoes.', () => { S.shoes = 1; S.skates = 1; S.lane = 3 + Math.floor(Math.random() * 4); save(); putShoes(true); setLane(); chipsFor(A); bowling().sfx('tock'); }],
            ['ROLLER SKATE', () => `Lane ${S.lane}. It's the one that's lit.`]];
          S.shoes = 0; save(); return [['', 'You put the shoes on the counter.'], ['ROLLER SKATE', 'They\'re warm.'], ['ROLLER SKATE', 'We\'ll spray them twice.', () => { spray(); putShoes(false); setLane(); chipsFor(A); }], ['', 'Got: your paws back.']]; } },
        { id: 'lane', get label() { return S.shoes && S.lane ? 'BOWL · LANE ' + S.lane : 'LANES'; }, o: ball, talk: () => {
          if (!S.shoes) return [['ROLLER SKATE', 'No bowling in paws.'], ['ROLLER SKATE', 'Shoes at the control desk.']];
          goLane(); return [['', `You walk to lane ${S.lane}. The shoes squeak.`]]; } },
        { id: 'ram', label: 'RAM', o: ram, talk: () => S.air === 4 ? [['RAM', 'You need two dollars?'], ['RAM', 'Knock a pin down. Any pin. League prize.'], ['RAM', 'Shoes first.']]
          : [['RAM', 'I own the place. Opened it in 1960. Changed nothing.'], ['RAM', 'Eight lanes. I play the one in the middle.'], ['RAM', 'My high score is my low score.'], ['WOLF', 'What is it?'], ['RAM', 'Consistent.']] },
        { id: 'humm', label: 'HUMMINGBIRD', o: hb, talk: () => [['HUMMINGBIRD', 'League night. You\'re not in the league.'], ['WOLF', 'You\'re very small.'], ['HUMMINGBIRD', 'I\'m small, but I\'m a lotta small.']] },
        { id: 'bear', label: 'BEAR', o: bear, talk: () => [['BEAR', 'I\'m on the team.'], ['WOLF', 'Do you bowl?'], ['BEAR', 'I\'m the comfortable one.'], ['BEAR', 'Every team needs one.']] },
        { id: 'claw', label: 'DIGGER', o: claw, talk: () => [['', 'Five cents. You win a sock.'], ['', 'It isn\'t the one.'], ['', 'It never is.']] },
        { id: 'score', label: 'SCORE PROJECTOR', o: desks[1], talk: () => [['', 'The overhead projector throws the score on the screen.'], ['', 'Someone wrote it in grease pencil: SUN, SUN, SUN.'], ['', 'The sun is winning.']] },
      ];
      setLane();
    },
    async living90(G, A) {   // REAL PLACE: a 1990s suburban family room (refs: "Living Room 1998 NOLA", Palmer Ave New Orleans 2000; 90s decor surveys)
      const H = 4.0, OAK = '#c8914e', OAK2 = '#a8733a', HUNTER = '#2f5a3e', BURG = '#7a2634', BEIGE = '#e6d8bc', BRASS = '#c9a24a';
      const yy = (h, y) => h * (1 - y / H);
      const vine = (g, w, y0, y1) => { g.fillStyle = '#f2ead6'; g.fillRect(0, y0, w, y1 - y0); g.fillStyle = HUNTER; g.fillRect(0, y0, w, 3); g.fillRect(0, y1 - 3, w, 3);   // ivy + rose wallpaper border
        for (let x = 0; x < w; x += 22) { const m = (y0 + y1) / 2; g.fillStyle = '#4f7a52'; g.beginPath(); g.ellipse(x + 6, m - 3, 6, 3, 0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 15, m + 3, 6, 3, -0.6, 0, 7); g.fill();
          if ((x / 22) % 3 === 0) { g.fillStyle = BURG; g.beginPath(); g.arc(x + 11, m, 4, 0, 7); g.fill(); } } };
      const wallTex = (extra) => cvTex(512, 256, (g, w, h) => { g.fillStyle = BEIGE; g.fillRect(0, 0, w, h);   // builder beige over hunter-green stripe wallpaper, oak chair rail, border at the top
        g.fillStyle = HUNTER; g.fillRect(0, yy(h, 0.9), w, h); g.fillStyle = '#3a6a4a'; for (let x = 0; x < w; x += 10) g.fillRect(x, yy(h, 0.9), 4, h);
        g.fillStyle = OAK; g.fillRect(0, yy(h, 0.96), w, yy(h, 0.88) - yy(h, 0.96)); vine(g, w, yy(h, 3.05), yy(h, 2.82)); extra?.(g, w, h); });
      realRoom(G, { H,
        floor: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#d8c7a6'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, 0, 14, h); }   // beige carpet + vacuum lines
          g.fillStyle = 'rgba(120,90,60,0.12)'; for (let i = 0; i < 1500; i++) g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4); }, 4, 3, 1.4),
        back: wallTex(), right: wallTex(),
        left: wallTex((g, w, h) => { const x0 = w * 0.42, x1 = w * 0.86, a = yy(h, 2.35), b = yy(h, 0.02);   // sliding patio door behind vertical blinds
          g.fillStyle = '#f6f2e6'; g.fillRect(x0 - 6, a - 6, x1 - x0 + 12, b - a + 6); for (let x = x0; x < x1; x += 9) { g.fillStyle = '#efe7d2'; g.fillRect(x, a, 7, b - a); g.fillStyle = '#cfc4a8'; g.fillRect(x + 7, a, 2, b - a); }
          g.fillStyle = '#d8ccb0'; g.fillRect(x0 - 8, a - 10, x1 - x0 + 16, 8); }),
        ceil: cvTex(256, 256, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(150,140,120,0.22)' : 'rgba(255,255,255,0.6)'; const r = 0.8 + Math.random() * 1.6; g.fillRect(Math.random() * w, Math.random() * h, r, r); } }, 3, 2, 0.4),   // popcorn ceiling
        cy: [3.08, 3.8], ceilGlow: 0.45 });
      const base = box(8.0, 0.12, 0.04, '#f3ecdc', 0.01); at(base, 0, 0, -2.98); G.add(base);
      // oak entertainment centre: 27" CRT (stuck on KSUN CH. 2), VCR blinking 1:59, VHS tapes, glass-door side cabinets, photos on top
      const ec = ph('oak entertainment centre', new THREE.Group()); const EX = -0.7;
      for (const sx of [-1.25, 1.25]) { const s = box(0.08, 2.1, 0.55, OAK, 0.01); s.position.x = sx; ec.add(s); }
      for (const sx of [-0.42, 0.42]) { const s = box(0.06, 2.1, 0.55, OAK, 0.01); s.position.x = sx; ec.add(s); }
      const etop = box(2.66, 0.08, 0.6, OAK2, 0.02); etop.position.y = 2.08; ec.add(etop); const ebase = box(2.58, 0.22, 0.55, OAK2, 0.02); ec.add(ebase);
      const eback = box(2.5, 2.1, 0.04, '#7a5230', 0.005); eback.position.z = -0.26; ec.add(eback);
      { const sh = box(0.8, 0.04, 0.52, OAK, 0.01); sh.position.y = 0.7; ec.add(sh); }
      for (const sx of [-0.84, 0.84]) for (const y of [0.62, 1.2, 1.7]) { const sh = box(0.8, 0.035, 0.5, OAK, 0.01); sh.position.set(sx, y, 0); ec.add(sh); }
      const vhsG = new THREE.BoxGeometry(0.035, 0.2, 0.12), vhs = new THREE.InstancedMesh(vhsG, feltMat('#ffffff'), 36); let k = 0; const cc = new THREE.Color();
      for (const sx of [-0.84, 0.84]) for (const y of [0.66, 1.24]) for (let i = 0; i < 9; i++) { mx4.makeTranslation(sx - 0.32 + i * 0.075, y + 0.1, 0.05); vhs.setMatrixAt(k, mx4); vhs.setColorAt(k++, cc.set(['#1e1e22', '#e8e2d2', '#2a3a6a', '#1e1e22', '#c23a35'][i % 5])); }
      ec.add(vhs);
      const tv = ph('27" CRT', new THREE.Group()); tv.add(box(0.78, 0.62, 0.55, '#2c2c30', 0.06)); const scr = sunPic(0.6, 0.45, 'CH. 2', '#3a5a7a'); scr.position.set(-0.04, 0.32, 0.28); tv.add(scr);
      // run 9b: a real moulded bezel in FRONT of the tube -- the picture (painted scr + the CRT quad at z 0.284) shows only through its opening,
      // which is 12 mm inside the screen rect on every side, so the quad's edges/corners can never draw past the bezel in any view
      { const bz = new THREE.Shape(); bz.moveTo(-0.38, 0.016); bz.lineTo(0.38, 0.016); bz.lineTo(0.38, 0.604); bz.lineTo(-0.38, 0.604); bz.closePath();
        const ho = new THREE.Path(); ho.moveTo(-0.322, 0.103); ho.lineTo(-0.322, 0.537); ho.lineTo(0.242, 0.537); ho.lineTo(0.242, 0.103); ho.closePath(); bz.holes.push(ho);
        const bzg = new THREE.ExtrudeGeometry(bz, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 1 }); bzg.translate(0, 0, 0.282);
        const bezel = new THREE.Mesh(bzg, feltMat('#2c2c30')); bezel.name = 'tv_bezel'; tv.add(bezel); }   // bezel front face at z 0.294
      const tvb = box(0.1, 0.4, 0.02, '#3a3a3e', 0.005); tvb.position.set(0.31, 0.12, 0.288); tv.add(tvb); tv.position.set(0, 0.76, 0.0); ec.add(tv);   // control panel sits proud of the bezel (front 0.308)
      // run 9 hint: a yellow sticky note on the bezel with a TV Guide doodle (a little sun on the cover) and four numbers
      const note = pane(0.1, 0.1, cvTex(128, 128, (g, w, h) => { g.fillStyle = '#f7e36a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, 16);
        g.strokeStyle = '#2a3a8a'; g.lineWidth = 3; g.lineCap = 'round'; g.strokeRect(22, 22, 50, 64); g.font = '700 16px "Comic Sans MS", "Marker Felt", cursive'; g.fillStyle = '#c23a35'; g.fillText('TV', 30, 42);
        g.beginPath(); g.arc(47, 64, 10, 0, 7); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * 0.785; g.beginPath(); g.moveTo(47 + Math.cos(a) * 13, 64 + Math.sin(a) * 13); g.lineTo(47 + Math.cos(a) * 18, 64 + Math.sin(a) * 18); g.stroke(); }
        g.fillStyle = '#2a3a8a'; g.font = '700 21px "Comic Sans MS", "Marker Felt", cursive'; g.save(); g.translate(64, 108); g.rotate(-0.06); g.textAlign = 'center'; g.fillText('19 · 90 ?', 0, 0); g.restore();
        g.beginPath(); g.moveTo(80, 30); g.lineTo(104, 50); g.moveTo(104, 30); g.lineTo(80, 50); g.stroke(); }, 1, 1, 0));
      note.scale.setScalar(0.9); note.position.set(0.322, 0.066, 0.2965); note.rotation.z = -0.1; tv.add(note);   // stuck on the bezel's bottom-right corner, under the control panel, fully clear of the screen opening (x>=0.272 vs opening edge 0.242)
      const vcr = new THREE.Group(); vcr.add(box(0.7, 0.1, 0.4, '#1e1e22', 0.01)); const clockC = document.createElement('canvas'); clockC.width = 64; clockC.height = 24;
      const cgx = clockC.getContext('2d'); const vt = new THREE.CanvasTexture(clockC); vt.colorSpace = THREE.SRGBColorSpace;
      const drawV = (on) => { cgx.fillStyle = '#0e1a14'; cgx.fillRect(0, 0, 64, 24); if (on) { cgx.fillStyle = '#5aff9a'; cgx.font = '700 18px monospace'; cgx.textAlign = 'center'; cgx.textBaseline = 'middle'; cgx.fillText('1:59', 32, 13); } vt.needsUpdate = true; };
      drawV(true); const vf = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ map: vt })); vf.position.set(0.18, 0.05, 0.205); vcr.add(vf);
      const slot = box(0.3, 0.025, 0.01, '#3a3a3e', 0.004); slot.position.set(-0.12, 0.04, 0.2); vcr.add(slot); vcr.position.set(0, 0.26, 0.02); ec.add(vcr);
      const cons = box(0.32, 0.07, 0.24, '#b8b4bc', 0.02); cons.position.set(-0.84, 0.26, 0.05); ec.add(cons); const pad = box(0.14, 0.03, 0.07, '#8a8690', 0.01); pad.position.set(-0.84, 0.03, 0.42); ec.add(pad);
      for (const [x, c] of [[-1.0, BRASS], [-0.75, BRASS], [0.85, '#3a2a1a']]) { const f = box(0.16, 0.2, 0.03, c, 0.01); f.position.set(x, 2.16, 0.05); f.rotation.x = -0.15; ec.add(f); }
      for (const sx of [-0.84, 0.84]) { const gd = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.25, 0.02), new THREE.MeshStandardMaterial({ color: '#e8f2f0', transparent: true, opacity: 0.16, roughness: 1 })); gd.position.set(sx, 1.33, 0.28); ec.add(gd); }
      at(ec, EX, 0, -2.66); G.add(ec);
      // dried flowers + ficus
      const ficus = ph('ficus (silk)', new THREE.Group()); ficus.add(cyl(0.2, 0.16, 0.36, '#b89a6a', 12)); const trunk = cyl(0.025, 0.03, 1.2, '#6a4a2a', 5); trunk.position.y = 0.3; ficus.add(trunk);
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), feltMat(i % 2 ? '#4f7a3e' : '#3e6a34')); l.position.set(Math.sin(i * 2.1) * 0.2, 1.25 + (i % 3) * 0.18, Math.cos(i * 2.1) * 0.16); ficus.add(l); }
      at(ficus, 1.35, 0, -2.5); G.add(ficus);
      // overstuffed floral sofa (hunter green / burgundy / cream), crocheted afghan, along the right wall facing the TV
      const floral = cvTex(256, 256, (g, w, h) => { g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) { const x = (i * 71) % w, y = (i * 113) % h; g.fillStyle = HUNTER; g.beginPath(); g.ellipse(x + 14, y + 6, 13, 6, 0.7, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - 12, y + 10, 12, 5, -0.6, 0, 7); g.fill();
          g.fillStyle = i % 3 ? BURG : '#c8606a'; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.fillStyle = '#5a1a24'; g.beginPath(); g.arc(x + 2, y - 1, 5, 0, 7); g.fill(); } }, 1.5, 1.5);
      const sofa = ph('floral sofa', new THREE.Group()); const fm = texMat(floral);
      const part = (w, h, d, x, y, z, r = 0.1) => { const m = box(w, h, d, '#ffffff', r); m.material = fm; m.position.set(x, y, z); sofa.add(m); return m; };
      part(2.3, 0.42, 0.95, 0, 0.0, 0, 0.08); part(2.3, 0.62, 0.32, 0, 0.35, -0.38, 0.14);
      for (const sx of [-1, 1]) { const arm = part(0.3, 0.68, 0.98, sx * 1.2, 0, 0.0, 0.14); arm.scale.set(1, 1, 1); }
      for (let i = 0; i < 3; i++) { part(0.72, 0.17, 0.66, -0.74 + i * 0.74, 0.42, 0.1, 0.07); part(0.7, 0.5, 0.2, -0.74 + i * 0.74, 0.55, -0.22, 0.09); }
      const afg = skin(box(1.1, 0.06, 0.5, '#ffffff', 0.02), cvTex(128, 64, (g, w, h) => { const cs = ['#7a4a2a', '#e2a23a', '#efe2c4', '#c9583a', '#5a6a3a']; for (let y = 0; y < h; y += 8) { g.fillStyle = cs[(y / 8) % 5]; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + ((x / 8) % 2 ? 6 : 0)); for (let x = w; x >= 0; x -= 8) g.lineTo(x, y + 8 + ((x / 8) % 2 ? 6 : 0)); g.fill(); } }));
      afg.position.set(0.45, 0.95, -0.4); afg.rotation.x = -0.9; sofa.add(afg);
      const pil = box(0.4, 0.36, 0.14, BURG, 0.07); pil.position.set(-0.85, 0.6, -0.05); pil.rotation.set(-0.2, 0.3, 0.2); sofa.add(pil);
      // run 9 re-layout: the sofa now faces the TV head-on across the coffee table (the classic mid-'90s family-room square)
      at(sofa, EX, 0, 1.45, Math.PI); G.add(sofa);
      const remote = box(0.06, 0.03, 0.2, '#1e1e22', 0.01); at(remote, EX + 1.2, 0.68, 1.32, 0.25); G.add(remote);   // the REAL remote, on the arm
      const held = box(0.05, 0.03, 0.19, '#1e1e22', 0.01); held.geometry.translate(0, -0.015, 0.06); held.visible = false; G.add(held);   // the one in the Wolf's paw (third person / feeds)
      const sunspot = new THREE.Group(); { const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), feltMat('#e0b52a')); sunspot.add(c);   // the hidden collectible (CH. 1990)
        c.material.emissive = new THREE.Color('#7a5208'); c.material.emissiveIntensity = 0.6;
        for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), feltMat('#c98f16')); const a = i / 10 * Math.PI * 2; r.position.set(Math.cos(a) * 0.088, Math.sin(a) * 0.088, 0); r.rotation.z = a - Math.PI / 2; sunspot.add(r); }
        for (const sx of [-0.022, 0.022]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), feltMat('#3a2410')); e.position.set(sx, 0.012, 0.064); sunspot.add(e); } }
      // the 4th wall (behind the couch): only shown while you're ON the couch (first person + the TV feeds); the room view stays a cutaway
      const front = pane(8, 4.0, cvTex(512, 256, (g, w, h) => { g.fillStyle = '#e6d8bc'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(150,110,70,0.12)'; for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 4, h * 0.7);
        g.fillStyle = '#2f5a3e'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < w; x += 9) g.fillRect(x, h * 0.72, 3, h * 0.28); g.fillStyle = '#7a5230'; g.fillRect(0, h * 0.70, w, 5); g.fillRect(0, h - 6, w, 6);
        g.fillStyle = '#6b4526'; g.fillRect(70, 24, 66, 112); g.fillStyle = '#8a5d36'; g.fillRect(74, 28, 58, 104); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(126, 84, 3, 0, 7); g.fill();   // the hall door
      }, 1, 1, 0));   // (the painted sun picture that hung here is replaced by Scott's centrepiece, see bearwall.js below)
      front.position.set(0, 2.0, 2.98); front.rotation.y = Math.PI; front.visible = false; G.add(front);
      const sofaT = box(1.7, 0.92, 0.34, OAK, 0.02); at(sofaT, EX - 0.1, 0, 2.2); G.add(sofaT);   // the console table behind the couch (every '90s family room had one)
      const pot = cyl(0.09, 0.07, 0.2, '#b65a3a', 10); at(pot, EX + 0.55, 0.92, 2.2); G.add(pot); const fern = cyl(0.14, 0.05, 0.22, '#3f7a3a', 7); at(fern, EX + 0.55, 1.08, 2.2); G.add(fern);
      at(sunspot, EX - 0.45, 1.04, 2.2, Math.PI * 0.8); sunspot.rotation.x = -0.15; sunspot.visible = !!S.sunspot1990; G.add(sunspot);
      // burgundy recliner angled at the TV
      const rec = ph('burgundy recliner', new THREE.Group()); const rb = (w, h, d, x, y, z, rx = 0) => { const m = box(w, h, d, BURG, 0.1); m.position.set(x, y, z); m.rotation.x = rx; rec.add(m); return m; };
      rb(0.85, 0.45, 0.85, 0, 0, 0); rb(0.85, 0.85, 0.3, 0, 0.35, -0.36, -0.15); rb(0.18, 0.62, 0.85, -0.45, 0, 0); rb(0.18, 0.62, 0.85, 0.45, 0, 0); rb(0.7, 0.15, 0.3, 0, 0.3, 0.42);
      const lev = box(0.03, 0.18, 0.05, '#2a2220', 0.01); lev.position.set(0.55, 0.3, 0.2); rec.add(lev);
      at(rec, -2.75, 0, 0.25, 2.3); G.add(rec);
      // oak coffee table: remotes, TV Guide, potpourri; end table + brass lamp (pleated shade) + cordless phone
      const ct = ph('oak coffee table', new THREE.Group()); const top = box(1.2, 0.07, 0.62, OAK, 0.03); top.position.y = 0.38; ct.add(top);
      for (const [x, z] of [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]]) { const l = cyl(0.035, 0.03, 0.38, OAK2, 6); l.position.set(x, 0, z); ct.add(l); }
      const tvg = sign('TV GUIDE', 0.2, 0.27, '#c23a35', '#fff3dc', 0.4); tvg.rotation.x = -Math.PI / 2; tvg.rotation.z = 0.3; tvg.position.set(-0.25, 0.455, 0.05); ct.add(tvg);
      const rem = box(0.06, 0.03, 0.2, '#1e1e22', 0.01); rem.position.set(0.15, 0.45, -0.1); rem.rotation.y = 0.5; rem.visible = !S.decoyGone; ct.add(rem);
      const bowl = cyl(0.14, 0.08, 0.08, '#c9a27a', 12); bowl.position.set(0.35, 0.45, 0.1); ct.add(bowl); const pp = cyl(0.12, 0.12, 0.02, '#b85a6a', 10); pp.position.set(0.35, 0.52, 0.1); ct.add(pp);
      at(ct, EX, 0, 0.15, 0); G.add(ct);
      const et = box(0.55, 0.6, 0.55, OAK, 0.03); at(et, EX + 1.72, 0, 1.55); G.add(et);
      const lamp = ph('brass lamp', new THREE.Group()); lamp.add(cyl(0.1, 0.13, 0.05, BRASS, 12)); const lst = cyl(0.025, 0.025, 0.5, BRASS, 6); lamp.add(lst); const urn = cyl(0.08, 0.1, 0.22, BRASS, 10); urn.position.y = 0.06; lamp.add(urn);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.3, 16, 1, true), feltMat('#f6efdc')); shade.material.side = THREE.DoubleSide; shade.material.emissive.set('#ffe8b0'); shade.material.emissiveIntensity = 0.5; shade.position.y = 0.6; lamp.add(shade);
      at(lamp, EX + 1.78, 0.6, 1.66); G.add(lamp);
      const phone = ph('cordless phone', new THREE.Group()); phone.add(box(0.14, 0.05, 0.18, '#ece6da', 0.02)); const hs = box(0.06, 0.04, 0.2, '#ece6da', 0.02); hs.position.set(0, 0.05, 0); hs.rotation.x = 0.2; phone.add(hs);
      const ant = cyl(0.006, 0.006, 0.12, '#2a2a2a', 4); ant.position.set(0.02, 0.07, -0.08); phone.add(ant); at(phone, EX + 1.6, 0.6, 1.42, 0.5); G.add(phone);
      // ceiling fan: oak blades, brass housing, light kit
      const fan = ph('ceiling fan', new THREE.Group()); const rod = cyl(0.02, 0.02, 0.35, BRASS, 6); rod.position.y = -0.35; fan.add(rod); const hub = cyl(0.12, 0.1, 0.14, BRASS, 12); hub.position.y = -0.45; fan.add(hub);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), feltMat('#fff3d8')); glass.material.emissive.set('#ffe8b0'); glass.material.emissiveIntensity = 0.6; glass.position.y = -0.45; fan.add(glass);
      const blades = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = box(0.62, 0.02, 0.15, OAK2, 0.01); b.position.set(Math.cos(i * 1.2566) * 0.42, 0, Math.sin(i * 1.2566) * 0.42); b.rotation.y = -i * 1.2566; blades.add(b); }
      blades.position.y = -0.4; fan.add(blades); fan.position.set(0.6, 3.62, 0.4); G.add(fan);
      // Scott's paintings in gilded antique frames (bearwall.js): centrepiece over the sofa (on the 4th wall, seen from the couch / the TV feeds),
      // a pair on the right wall, a pair on the left wall beside the patio-door blinds -- all at eye height, clear of the TV, blinds and windows
      const art = [['lady', 0.95, front, [0.7, -0.2, 0.004], 0], ['suit', 0.64, G, [3.975, 1.66, -0.62], -Math.PI / 2], ['painter', 0.64, G, [3.975, 1.66, 0.62], -Math.PI / 2],
        ['cowboy', 0.62, G, [-3.975, 1.62, 1.22], Math.PI / 2], ['guitar', 0.74, G, [-3.975, 1.62, 2.22], Math.PI / 2],
        // run 9c: the big square sunflower-face statement piece on the blank back wall right of the entertainment centre (unit ends x 0.63, ficus to ~x 1.8; frame x 1.86..3.54)
        ['sunflower', 1.4, G, [2.7, 1.9, -2.975], 0, 0.14]].map(([k, h, par, p, ry, B]) => {
        const f = framedPainting(k, h, { px: LOW ? 256 : 512, B }); f.position.set(...p); f.rotation.y = ry; par.add(f); return f; });
      await Promise.all(art.map((f) => f.userData.ready));
      const [bear] = await Promise.all([glb('town2/bear_lo.glb', 1.85, 'bear', { rest: 'breathe' })]);
      at(bear, 2.05, 0, 1.25, -1.1); G.add(bear);
      A.wolfSpot = [1.75, 2.15]; A.anim = []; A.proc = [bear]; A.vcrT = 0;
      A.tvRig = { scr, scrW: 0.6, scrH: 0.45, bear, remote, held, sunspot, decoy: rem, seatW: new THREE.Vector3(EX, 0.72, 1.47), seatB: new THREE.Vector3(EX + 0.76, 0.74, 1.47), frontWall: front,
        lampFlicker: (k) => { shade.material.emissiveIntensity = 0.5 * k; }, fanStop: false };
      A.tick = (dt, t) => { if (!A.tvRig.fanStop) blades.rotation.y += dt * 1.6; const on = (t % 1.2) < 0.7; if (on !== A.vcrOn) { A.vcrOn = on; drawV(on); } livingTVIdle(dt, t); };
      A.who = [
        { id: 'bear', label: 'BEAR', o: bear, talk: () => [['BEAR', 'Welcome to my home.'], ['BEAR', 'That\'s the couch. I\'m the comfortable one, but it\'s close.'], ['WOLF', 'Can I sit?'], ['BEAR', 'It\'s been sat in.']] },
        { id: 'tv', label: 'TV', o: tv, talk: () => [['', 'Twenty-seven inches. Channel 2.'], ['TV', 'KSUN. Today: the sun. Tonight: the sun, but later.'], ['BEAR', 'The remote is on the arm of the couch. Grab it. Sit.']] },
        { id: 'vcr', label: 'VCR', o: vcr, talk: () => [['', 'The VCR blinks 1:59.'], ['BEAR', 'It\'s the only clock in town that agrees with the DMV.'], ['WOLF', 'Did you set it?'], ['BEAR', 'Nobody sets a VCR.']] },
        { id: 'couch', label: 'COUCH', o: sofa, talk: () => [['', 'Floral. Overstuffed. It exhales when you look at it.'], ['', 'Somewhere inside: the remote, eleven dollars, a sock.'], ['', 'Not THE sock.']] },
        { id: 'remote', label: 'REMOTE', o: remote, talk: () => [['', 'The real remote. On the arm of the couch, where it lives.'], ['BEAR', 'Oh. TV night.'], ['', 'Got: the remote.', () => startTV(A)]] },
        { id: 'decoy', label: 'DECOY', o: rem, chip: false, talk: () => S.decoyGone ? [['', 'Where the decoy remote was: a small, warm dent.']] : [['BEAR', 'That\'s the decoy remote.'], ['BEAR', 'The real one is on the arm of the couch.'], ['BEAR', 'Someone has been after the decoy for years.']] },
        { id: 'note', label: 'STICKY NOTE', o: note, chip: false, talk: () => [['', 'A sticky note on the TV. A doodle of a TV Guide with a little sun on the cover.'], ['', 'Under it, in Bear handwriting: "19 · 90 ?" and an X.'], ['BEAR', 'Don\'t.']] },
        { id: 'guide', label: 'TV GUIDE', o: tvg, chip: false, talk: () => [['', 'This week\'s TV GUIDE. Every listing says "The Sun."'], ['', 'Channel 4 is all commercials. Channel 7 is the Crow. Channel 9 is this room.'], ['', 'One page has been torn out.']] },
        { id: 'lamp', label: 'LAMP', o: lamp, chip: false, talk: () => [['', 'Brass. Pleated shade. Three-way bulb.'], ['', 'It only does the first way.']] },
        { id: 'recliner', label: 'RECLINER', o: rec, chip: false, talk: () => [['BEAR', 'Don\'t pull the lever.'], ['WOLF', 'What happens?'], ['BEAR', 'You live there now.']] },
        { id: 'phone', label: 'CORDLESS', o: phone, chip: false, talk: () => [['', 'A cordless phone. Its antenna is extended for no reason.'], ['BEAR', 'In case the sun calls.']] },
      ];
    },
    async thrift(G, A) {
      const [plaid, lamp, gecko] = await Promise.all([glb('hf2/plaid_box.glb', 0.7, 'object', { rest: 'bob' }), glb('hf2/lamp_bulb.glb', 1.15, 'object', { rest: 'bob' }),
        glb('town2/gecko_lo.glb', 1.05, 'gecko', { rest: 'breathe' })]);
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
      A.wolfSpot = [0.4, 1.7]; A.anim = []; A.proc = [plaid, lamp, gecko];
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
    // ================================================================ slice 3 — THE NEON STRIP: Leave-The-Light-On Motel, Motel Pool, Eye-Max Drive-In (mission: LEAVE THE LIGHT ON)
    async motel(G, A) {
      const [house, lamp, chair] = await Promise.all([glb('hf2/house_head.glb', 1.75, 'object', { rest: 'bob' }), glb('hf2/lamp_bulb.glb', 1.15, 'object', { rest: 'bob' }), glb('town2/eye_chair.glb', 0.95)]);
      const desk = ph('front desk', box(3.0, 1.0, 0.7, '#2a9d9a', 0.06)); at(desk, 1.1, 0, -1.55); G.add(desk);
      const dtop = box(3.2, 0.07, 0.85, '#f6efe0', 0.03); at(dtop, 1.1, 1.0, -1.55); G.add(dtop);
      const ds = sign('FRONT DESK · CHECK-OUT 11', 2.4, 0.26, '#3a1f2a', '#ff6fae', 0.6); at(ds, 1.1, 0.55, -1.19); G.add(ds);
      at(house, -1.15, 0, -2.0, 0.25); G.add(house);   // stands beside the desk (it is the building)
      // the desk bell
      const bell = ph('desk bell', new THREE.Group()); const bb = cyl(0.09, 0.1, 0.03, '#7a5a4a', 12); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), feltMat('#d9c9a0')); dome.position.y = 0.03; bell.add(bb, dome);
      at(bell, 0.4, 1.07, -1.35); G.add(bell);
      // key board: every key is room 11
      const kb = ph('key board (every key is 11)', new THREE.Group()); const kbb = box(1.2, 0.9, 0.06, '#7a5a4a', 0.03); kb.add(kbb);
      const kt = sign('11   11   11\n11   11   11\n11   11   11', 1.05, 0.72, '#7a5a4a', '#ffd04a', 0.55); kt.position.set(0, 0.45, 0.035); kb.add(kt);
      at(kb, 2.6, 1.55, -2.95); G.add(kb);
      // NO VACANCY neon: every room is free
      const nv = sign('NO', 0.55, 0.36, '#2a1f2a', '#ff6fae', 0.8); at(nv, -1.55, 2.5, -2.95); G.add(nv);
      const vac = sign('VACANCY', 1.5, 0.36, '#2a1f2a', '#ff6fae', 0.8); at(vac, -0.5, 2.5, -2.95); G.add(vac);
      const sl = sign('LEAVE-THE-LIGHT-ON MOTEL', 2.4, 0.3, '#ff6fae', '#2a1f2a', 0.6); at(sl, -1.0, 2.88, -2.95); G.add(sl);
      // the window lamp (the light that's left on): Lamp-Bulb works nights in it
      const win = ph('motel window + lamp stand', new THREE.Group()); const frame = box(1.3, 1.3, 0.08, '#2a9d9a', 0.03); frame.position.y = 0.9; win.add(frame);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshStandardMaterial({ color: '#2a2440', roughness: 1 })); pane.position.set(0, 1.55, 0.045); win.add(pane);
      const stand = cyl(0.05, 0.16, 0.9, '#7a5a4a', 10); stand.position.set(0, 0, 0.35); win.add(stand);
      at(win, -2.8, 0, -2.95); G.add(win);
      at(lamp, -2.8, 0.9, -2.6, 0.4); G.add(lamp);
      const poolLight = ph('pool light (felt)', new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#9ff0e8' }))); poolLight.position.set(-2.8, 1.06, -2.6); G.add(poolLight);
      // ice machine: makes one cube
      const ice = ph('ice machine (one cube)', new THREE.Group()); const ib = box(0.8, 1.4, 0.6, '#c9e6ee', 0.05); ice.add(ib);
      const is = sign('ICE', 0.5, 0.2, '#2a9d9a', '#fff3dc', 0.7); is.position.set(0, 1.15, 0.31); ice.add(is);
      const slot = box(0.4, 0.3, 0.05, '#3a3f4a', 0.02); slot.position.set(0, 0.55, 0.3); ice.add(slot);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), feltMat('#f4fbff')); cube.position.set(0.05, 0.6, 0.33); ice.add(cube);
      at(ice, -3.35, 0, 0.6, Math.PI / 2); G.add(ice);
      at(chair, 2.9, 0, 0.7, -0.6); G.add(chair);
      const rug = box(2.0, 0.02, 1.3, '#ff6fae', 0.01); at(rug, 0.2, 0, 0.6); G.add(rug);
      // --- PLAYHOUSE: the motel is a face (several), the windows disagree, the clock runs back to 11
      const dface = new THREE.Group(); eyes(A, dface, [[0.6, 0.86, 0], [1.55, 0.86, 0, 0, 0, 0.9]], 0.1); dface.position.z = -1.185; G.add(dface);   // the front desk looks up
      eyes(A, ice, [[-0.14, 0.97, 0.31], [0.14, 0.97, 0.31]], 0.065);   // the ice machine, waiting on its cube
      const rface = new THREE.Group(); eyes(A, rface, [[-0.35, 0, 0], [0.55, 0, 0, 0, 0, 0.9]], 0.15); const rsm = smile(0.32); rsm.position.set(0.1, -0.4, 0.004); rface.add(rsm); rface.rotation.x = -Math.PI / 2; rface.position.set(0, 0.026, 0.35); G.add(rface);   // the rug is a face (wipe your feet)
      pane.material = picTex('night', 1.1, 1.1).material;   // the lamp window: midnight
      const noon = crookedWindow(sunPic(0.95, 0.8, 'NOON', '#7d93c4'), 0.95, 0.8, '#f2b632'); noon.position.set(1.05, 2.4, -2.94); noon.rotation.z = -0.1; G.add(noon);   // the other window: noon
      const clock = backClock(A, 0.26, '#ff6fae'); clock.position.set(2.6, 2.85, -2.94); G.add(clock); wob(A, clock, 0.08, 0.6);
      const door = crookedDoor(A, '#8a4fc0', '#f2b632', 'ROOM 11'); door.position.set(-3.95, 0, -1.7); door.rotation.set(0, Math.PI / 2, 0.08); G.add(door);
      const sbox = ph('suggestion box (pops up a quip)', new THREE.Group()); sbox.add(box(0.36, 0.3, 0.3, '#f2b632', 0.04)); const sbs = sign('SUGGESTIONS', 0.32, 0.08, '#f2b632', '#2a1a24', 0.75); sbs.position.set(0, 0.15, 0.152); sbox.add(sbs);
      const lid = new THREE.Group(); const lb = box(0.38, 0.04, 0.32, '#8a4fc0', 0.015); lb.position.z = 0.16; lid.add(lb); lid.position.set(0, 0.3, -0.16); sbox.add(lid);
      const shead = new THREE.Group(); const sh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), feltMat('#ff6fae')); sh.position.y = 0.11; shead.add(sh); eyes(A, shead, [[-0.04, 0.14, 0.1], [0.04, 0.14, 0.1]], 0.026); sbox.add(shead);
      at(sbox, 2.15, 1.07, -1.5, -0.15); G.add(sbox); const sp = popper(A, sbox, shead, 0.05, 0.3, lid);
      const sugQ = quips(['Suggestion: leave.', 'We read every one. Out loud. To nobody.', 'Check-out is 11. Check-in is also 11.', 'Suggestion: more suggestions.', 'I suggest you put that down.']);
      for (const [shp, col, x] of [[moonShape(0.2), '#f2b632', -3.0], [starShape(0.2, 0.09), '#ff6fae', 3.0]]) { const [m] = mobile(A, shp, col, x, 3.95, 0.3, 0.6); G.add(m); }
      wob(A, kb, 0.03, 0.9); wob(A, bell, 0.06, 1.7);
      A.wolfSpot = [0.3, 1.7]; A.anim = []; A.proc = [house, lamp]; A.flick = 0; A.ding = 0;
      A.setAir = () => { lamp.visible = S.bulb < 4; poolLight.visible = S.bulb >= 4; };
      A.tick = (dt, t) => { nv.visible = Math.sin(t * 2.1) + Math.sin(t * 5.3) > -0.6; vac.material.color.setScalar(Math.sin(t * 1.3) > -0.85 ? 1 : 0.4);
        if (A.ding > 0) { A.ding -= dt; dome.position.y = 0.03 + (A.ding > 0.25 ? 0.012 : 0); } };
      A.who = [
        { id: 'house', label: 'HOUSE-HEAD', o: house, talk: () => {
          if (S.bulb === 1) { step('bulb', 2); return [['HOUSE-HEAD', 'A bulb? No.'], ['HOUSE-HEAD', 'The sign says we leave the light on.'], ['HOUSE-HEAD', 'Take the light, and the sign is a liar. I\'m the building. I\'d know.'], ['LAMP-BULB', 'I\'d go. But someone has to be the light that\'s left on.'], ['LAMP-BULB', 'Find me a replacement. Something that\'s on and stays on.'], ['WOLF', 'Like what?'], ['LAMP-BULB', 'The pool has a light in it. Nobody swims at night.']]; }
          if (S.bulb === 3) { step('bulb', 4); A.setAir(); return [['', 'You put the pool light in the window lamp.'], ['HOUSE-HEAD', 'It\'s a light.'], ['HOUSE-HEAD', 'It\'s on.'], ['HOUSE-HEAD', 'I\'ll allow it.'], ['LAMP-BULB', 'My first night off since 1979.'], ['LAMP-BULB', 'Is the Drive-In still showing the same thing?'], ['WOLF', 'It\'s not showing anything.'], ['LAMP-BULB', 'Then I\'m the feature.'], ['', 'Lamp-Bulb comes with you. Take it to the projector.']]; }
          if (S.bulb === 2) return [['HOUSE-HEAD', 'Pool\'s out back.'], ['HOUSE-HEAD', 'The lifeguard is always on duty. Nobody is ever in the pool.']];
          if (S.bulb >= 4) return [['HOUSE-HEAD', 'The light is on. The sign is honest.'], ['HOUSE-HEAD', 'Mostly. We have no vacancy.'], ['WOLF', 'Every room is empty.'], ['HOUSE-HEAD', 'They\'re resting.']];
          return [['HOUSE-HEAD', 'Welcome to the Leave-The-Light-On.'], ['WOLF', 'Do you have a room?'], ['HOUSE-HEAD', 'I am the rooms.'], ['HOUSE-HEAD', 'Wipe your feet. That\'s my face.']]; } },
        { id: 'lamp', label: 'LAMP-BULB', o: lamp, talk: () => S.bulb >= 4 ? null : S.bulb >= 1 ? [['LAMP-BULB', 'I work nights. In the window.'], ['LAMP-BULB', 'Find something to be on instead of me.'], ['LAMP-BULB', 'The pool light is on all night. For nobody.']]
          : [['LAMP-BULB', 'Night clerk.'], ['WOLF', 'You\'re sitting in a lamp.'], ['LAMP-BULB', 'I\'m being left on.'], ['LAMP-BULB', 'It\'s a whole job.']] },
        { id: 'keys', label: 'RENT A ROOM', o: kb, talk: () => { S.rooms = (S.rooms || 0) + 1; save(); return [['HOUSE-HEAD', 'Room 11.'], ['WOLF', 'Every key says 11.'], ['HOUSE-HEAD', 'Every room is 11. Check-out is at 11.'], ['WOLF', 'What time is it?'], ['HOUSE-HEAD', '11.'], ['', `You check in and check out. Stays: ${S.rooms}.`]]; } },
        { id: 'bell', label: 'BELL', o: bell, talk: () => { A.ding = 0.5; audio.ui?.('confirm'); return [['', 'Ding.'], ['HOUSE-HEAD', 'I heard.'], ['HOUSE-HEAD', 'I\'m the building. I hear everything.'], ['HOUSE-HEAD', 'Ring it again and I\'ll hear that too.']]; } },
        { id: 'ice', label: 'ICE MACHINE', o: ice, talk: () => [['', 'The ice machine rumbles.'], ['', 'It makes one cube.'], ['', 'It has been making it since 1979.'], ['', 'It\'s almost done.']] },
        { id: 'sign', label: 'NO VACANCY', o: vac, talk: () => [['', 'NO VACANCY. Every room is empty.'], ['HOUSE-HEAD', 'The sign is aspirational.'], ['', 'The NO flickers. It isn\'t sure either.']] },
        { id: 'chair', label: 'LOBBY CHAIR', o: chair, talk: () => [['', 'Lobby seating. It watches you wait.'], ['', 'You aren\'t waiting.'], ['', 'It waits anyway.']] },
        { id: 'suggest', label: 'SUGGESTION BOX', o: sbox, talk: () => { sp.t = 3; audio.ui?.('confirm'); return [['SUGGESTION BOX', sugQ()]]; } },
        { id: 'noon', label: 'WINDOW', o: noon, chip: false, talk: () => [['', 'This window says it is noon.'], ['', 'The one by the lamp says midnight.'], ['HOUSE-HEAD', 'I have a lot of sides.']] },
        { id: 'clock', label: 'CLOCK', o: clock, chip: false, talk: () => [['', 'The clock runs backwards.'], ['HOUSE-HEAD', 'It\'s heading for 11.'], ['HOUSE-HEAD', 'Everything here is heading for 11.']] },
        { id: 'door', label: 'ROOM 11', o: door, chip: false, talk: () => [['', 'ROOM 11.'], ['', 'The peephole looks at you.'], ['HOUSE-HEAD', 'Occupied. By the door.']] },
        { id: 'rug', label: 'RUG', o: rface, chip: false, talk: () => [['RUG', 'Wipe your feet.'], ['RUG', 'That\'s my face.']] },
      ];
      playhouse(A);
    },
    async pool(G, A) {
      const [squid, heron, glove] = await Promise.all([glb('cast/wanderer_banana_squid_walking.glb', 1.55, 'object', { rest: 'breathe' }), glb('town2/heron_lo.glb', 1.9, 'heron', { rest: 'breathe' }),
        glb('town2/rubber_glove.glb', 0.45, 'object', { rest: 'bob' })]);
      // the pool: felt rim + felt water (3 inches deep, all the way down)
      const pool = ph('motel pool (felt)', new THREE.Group());
      for (const [x, z, w, d] of [[0, -1.3, 4.6, 0.2], [0, 1.3, 4.6, 0.2], [-2.2, 0, 0.2, 2.8], [2.2, 0, 0.2, 2.8]]) { const r = box(w, 0.25, d, '#f6efe0', 0.04); r.position.set(x, 0, z); pool.add(r); }
      const water = box(4.2, 0.16, 2.4, '#4ac0c9', 0.02); pool.add(water);
      const tiles = sign('3 IN.   DEEP END   3 IN.', 2.4, 0.14, '#f6efe0', '#2a7a8a', 0.7); tiles.rotation.x = -Math.PI / 2; tiles.position.set(0, 0.255, 1.3); pool.add(tiles);
      const plight = ph('underwater pool light', new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshBasicMaterial({ color: '#9ff0e8' }))); plight.scale.y = 0.45; plight.position.set(0.4, 0.17, -0.3); pool.add(plight);
      const glow = new THREE.PointLight('#7fe8e0', 6, 4, 1.6); glow.position.set(0.4, 0.5, -0.3); pool.add(glow);
      at(pool, -0.9, 0, -1.4); G.add(pool);
      at(glove, -0.4, 0.16, -1.1, 0.6); G.add(glove);
      at(heron, -2.3, 0.16, -1.9, 0.5); G.add(heron);   // off duty, in the shallow end (both ends)
      // diving board
      const board = ph('diving board', new THREE.Group()); const bs = box(0.4, 0.4, 0.4, '#7a7a70', 0.04); board.add(bs); const bp = box(1.3, 0.06, 0.36, '#ff6fae', 0.02); bp.position.set(-0.55, 0.4, 0); board.add(bp);
      at(board, 2.0, 0, -1.6); G.add(board);
      // lifeguard chair (the Banana Squid is always on duty)
      const lg = ph('lifeguard chair', new THREE.Group());
      for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) { const l = cyl(0.035, 0.035, 0.95, '#f6efe0', 6); l.position.set(x, 0, z); lg.add(l); }
      const seat = box(0.9, 0.08, 0.8, '#f6efe0', 0.02); seat.position.y = 0.95; lg.add(seat);
      const lgs = sign('LIFEGUARD\nON DUTY', 0.7, 0.32, '#c9384a', '#fff3dc', 0.55); lgs.position.set(0, 0.6, 0.31); lg.add(lgs);
      at(lg, 3.0, 0, -0.3, -0.3); G.add(lg);
      at(squid, 3.0, 1.03, -0.4, -0.5); G.add(squid);
      const whistle = ph('felt whistle', cyl(0.025, 0.03, 0.08, '#ffd04a', 8)); whistle.rotation.z = Math.PI / 2; whistle.position.set(2.62, 1.06, 0.02); G.add(whistle);
      // two lounge chairs + one shared towel
      const loungers = ph('lounge chairs', new THREE.Group());
      for (const x of [0, 1.1]) { const b = box(0.7, 0.3, 1.7, '#2a9d9a', 0.04); b.position.set(x, 0, 0); loungers.add(b); const back = box(0.7, 0.08, 0.7, '#2a9d9a', 0.03); back.position.set(x, 0.42, -0.6); back.rotation.x = 0.7; loungers.add(back); }
      const towel = box(0.6, 0.03, 0.9, '#ffd04a', 0.01); towel.position.set(0, 0.3, 0.2); loungers.add(towel);
      at(loungers, -3.0, 0, 1.2, 0.15); G.add(loungers);
      const rules = sign('POOL RULES\n1. NO RUNNING  2. NO WALKING\n3. LIFEGUARD ALWAYS ON DUTY', 1.9, 0.75, '#fff3dc', '#2a7a8a', 0.55); at(rules, 2.4, 2.1, -2.95); G.add(rules);
      const neon = sign('POOL', 1.0, 0.36, '#2a1f2a', '#7fe8e0', 0.8); at(neon, -1.0, 2.55, -2.95); G.add(neon);
      const moon = sign('the sun has its eye shut', 1.4, 0.2, '#3a3f6a', '#f6efe0', 0.6); at(moon, -2.9, 2.2, -2.95); G.add(moon);
      A.wolfSpot = [0.9, 1.8]; A.anim = []; A.proc = [squid, heron, glove]; A.tweet = 0;
      A.setAir = () => { plight.visible = S.bulb < 3; glow.intensity = S.bulb < 3 ? 6 : 0; };
      A.tick = (dt, t) => { water.position.y = Math.sin(t * 0.8) * 0.004; if (A.tweet > 0) { A.tweet -= dt; whistle.scale.setScalar(A.tweet > 0 ? 1 + Math.abs(Math.sin(t * 30)) * 0.4 : 1); } };
      const tweet = () => { A.tweet = 0.8; audio.ui?.('tick'); };
      A.who = [
        { id: 'squid', label: 'LIFEGUARD', o: squid, talk: () => { tweet();
          if (S.bulb === 2 && S.swam) { step('bulb', 3); A.setAir(); return [['BANANA SQUID', 'You swam. You\'re a swimmer now.'], ['BANANA SQUID', 'Swimmers may touch the pool light.'], ['', 'You unscrew the pool light. The pool goes dark.'], ['BANANA SQUID', 'Pool\'s closed.'], ['WOLF', 'Was it ever open?'], ['BANANA SQUID', 'It was lit.'], ['', 'Got: one pool light, still on. Take it to the Motel.']]; }
          if (S.bulb === 2) return [['', 'Tweet.'], ['BANANA SQUID', 'The pool light is for swimmers.'], ['WOLF', 'Nobody swims here.'], ['BANANA SQUID', 'Then nobody touches the light.'], ['BANANA SQUID', 'Swim first.']];
          if (S.bulb >= 3) return [['', 'Tweet.'], ['BANANA SQUID', 'Pool\'s dark. Still on duty.'], ['BANANA SQUID', 'Dark is when they need me most.']];
          return [['', 'Tweet.'], ['BANANA SQUID', 'No running.'], ['WOLF', 'I\'m standing still.'], ['BANANA SQUID', 'That\'s how it starts.']]; } },
        { id: 'swim', label: 'SWIM', o: water, talk: () => { tweet(); if (S.bulb === 2) { S.swam = true; save(); }
          return [['', 'You get in. The water is felt.'], ['', 'Three inches deep. All the way down.'], ['', 'Tweet.'], ['BANANA SQUID', 'No running!'], ['WOLF', 'I\'m swimming.'], ['BANANA SQUID', 'Swim slower.'], ['', 'You are now a swimmer.']]; } },
        { id: 'heron', label: 'HERON', o: heron, talk: () => [['HERON', 'Off duty.'], ['WOLF', 'What do you do on duty?'], ['HERON', 'Stand in water.'], ['HERON', 'This is different. It\'s a pool.']] },
        { id: 'glove', label: 'POOL FLOAT', o: glove, talk: () => [['', 'An inflatable rubber glove.'], ['', 'It waves at you.'], ['', 'It is not waving. It is drowning, very slowly, in three inches.'], ['BANANA SQUID', 'It does that.']] },
        { id: 'board', label: 'DIVING BOARD', o: board, talk: () => { tweet(); return [['', 'You dive.'], ['', 'Three inches.'], ['BANANA SQUID', 'Ten.'], ['WOLF', 'Out of ten?'], ['BANANA SQUID', 'Inches. You made it deeper.']]; } },
        { id: 'towel', label: 'TOWEL', o: loungers, talk: () => [['', 'One towel. Shared by the whole motel.'], ['', 'It\'s dry. Nobody\'s been wet since 1979.']] },
        { id: 'rules', label: 'POOL RULES', o: rules, talk: () => [['', '1. No running. 2. No walking.'], ['', '3. Lifeguard always on duty.'], ['WOLF', 'How do I get to the pool?'], ['BANANA SQUID', 'You don\'t. That\'s the rules working.']] },
      ];
    },
    async drivein(G, A) {
      const [farm, moth, lamp] = await Promise.all([glb('cast/wanderer_shovel_farmhand_walking.glb', 1.7, 'object', { rest: 'breathe' }), glb('town2/moth_lo.glb', 1.5, 'moth', { rest: 'breathe' }),
        glb('hf2/lamp_bulb.glb', 0.55, 'object', { rest: 'bob' })]);
      // the screen: intermission (since the bulb) -> the feature: the sun, up close
      const scr = ph('drive-in screen', box(4.6, 2.1, 0.12, '#f6efe0', 0.04)); at(scr, 0, 0.85, -2.92); G.add(scr);
      for (const x of [-2.0, 2.0]) { const p = cyl(0.06, 0.06, 0.9, '#7a5a4a', 6); at(p, x, 0, -2.9); G.add(p); }
      const blank = sign('INTERMISSION\n(since the bulb)', 4.4, 1.9, '#5a5468', '#c9c9c0', 0.4); at(blank, 0, 1.9, -2.85); G.add(blank);
      const feat = sunPic(4.4, 1.9, 'NOW SHOWING: THE SUN', '#3a1f2a'); at(feat, 0, 1.9, -2.845); G.add(feat);
      const marq = sign('EYE-MAX DRIVE-IN', 2.4, 0.3, '#2a1f2a', '#ff6fae', 0.7); at(marq, 0, 3.05, -2.9); G.add(marq);
      // snack bar: popcorn, by the shovel
      const ctr = ph('snack bar counter', box(0.7, 1.0, 2.0, '#ff6fae', 0.05)); at(ctr, -2.5, 0, 0.2); G.add(ctr);
      const ctop = box(0.85, 0.07, 2.2, '#f6efe0', 0.03); at(ctop, -2.5, 1.0, 0.2); G.add(ctop);
      const pop = ph('popcorn machine', new THREE.Group()); const pb = box(0.5, 0.12, 0.45, '#c9384a', 0.03); pop.add(pb);
      const pg = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.42), new THREE.MeshStandardMaterial({ color: '#fff3dc', transparent: true, opacity: 0.25, roughness: 1 })); pg.position.y = 0.37; pop.add(pg);
      const pt = box(0.52, 0.1, 0.47, '#c9384a', 0.03); pt.position.y = 0.62; pop.add(pt);
      const kern = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), feltMat('#fff0b8'), 40); for (let i = 0; i < 40; i++) { mx4.makeTranslation(-0.18 + (i % 8) * 0.05, 0.15 + Math.floor(i / 8) * 0.035, -0.15 + ((i * 7) % 6) * 0.055); kern.setMatrixAt(i, mx4); } pop.add(kern);
      at(pop, -2.5, 1.07, -0.35); G.add(pop);
      const menu = sign('SNACKS\npopcorn (by the shovel)\nsoda (flat, felt)', 1.2, 0.6, '#fff3dc', '#c9384a', 0.5); at(menu, -3.88, 2.1, 0.2, Math.PI / 2); G.add(menu);
      at(farm, -3.3, 0, 0.75, Math.PI / 2 - 0.35); G.add(farm);
      // the Moth's taxi: parked facing the screen, meter running
      const taxi = ph('Moth\'s taxi (felt)', new THREE.Group()); const tb = box(1.1, 0.5, 2.0, '#ffd04a', 0.12); tb.position.y = 0.22; taxi.add(tb);
      const cab = box(0.95, 0.42, 1.0, '#ffd04a', 0.1); cab.position.set(0, 0.72, 0.15); taxi.add(cab);
      const ws = box(0.85, 0.32, 0.02, '#2a2440', 0.01); ws.position.set(0, 0.76, -0.36); ws.rotation.x = -0.25; taxi.add(ws);
      for (const [x, z] of [[-0.56, -0.62], [0.56, -0.62], [-0.56, 0.62], [0.56, 0.62]]) { const w = cyl(0.2, 0.2, 0.12, '#2e2a2a', 12); w.rotation.z = Math.PI / 2; w.position.set(x, 0.2, z); taxi.add(w); }
      const meter = sign('METER $11.11', 0.5, 0.14, '#2a1f2a', '#ff6a4a', 0.7); meter.position.set(0, 1.2, 0.15); taxi.add(meter);
      at(taxi, 0.1, 0, -0.5); G.add(taxi);
      at(moth, -1.2, 0, -0.2, 0.4); G.add(moth);
      // speaker post
      const spk = ph('speaker post', new THREE.Group()); const sp = cyl(0.03, 0.04, 1.1, '#7a7a70', 6); spk.add(sp); const sb = box(0.28, 0.2, 0.12, '#3a3a3a', 0.03); sb.position.y = 1.05; spk.add(sb);
      at(spk, 1.6, 0, -1.5); G.add(spk);
      // projection booth: projector with a dead bulb (Lamp-Bulb goes in the top)
      const booth = ph('projection booth', new THREE.Group()); const bx = box(1.1, 1.1, 1.0, '#5a4a8a', 0.05); booth.add(bx);
      const proj = box(0.5, 0.36, 0.6, '#3a3a3a', 0.06); proj.position.y = 1.1; booth.add(proj);
      const lens = cyl(0.1, 0.12, 0.16, '#2a2a2a', 10); lens.rotation.x = -Math.PI / 2; lens.position.set(0, 1.28, -0.36); booth.add(lens);
      const reel = cyl(0.2, 0.2, 0.05, '#7a7a70', 14); reel.rotation.z = Math.PI / 2; reel.position.set(0, 1.62, 0.08); booth.add(reel);
      const bs = sign('PROJECTION', 0.9, 0.2, '#fff3dc', '#5a4a8a', 0.6); bs.position.set(0, 0.75, 0.51); booth.add(bs);
      at(booth, 2.9, 0, 0.6, 0.35); G.add(booth);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(1.5, 1.6, -1.2); beam.lookAt(2.9, 1.3, 0.6); beam.rotateX(-Math.PI / 2); G.add(beam);
      at(lamp, 2.84, 1.28, 0.62, 0.3); G.add(lamp);
      A.wolfSpot = [0.9, 1.8]; A.anim = []; A.proc = [farm, moth, lamp]; A.m = 11.11;
      A.setAir = () => { lamp.visible = S.bulb >= 4; feat.visible = beam.visible = S.bulb >= 5; blank.visible = S.bulb < 5; };
      A.tick = (dt, t) => { if (reel.visible && S.bulb >= 5) reel.rotation.x += dt * 2; if (beam.visible) beam.material.opacity = 0.07 + Math.sin(t * 9) * 0.01; };
      A.who = [
        { id: 'farm', label: 'FARMHAND', o: farm, talk: () => {
          if (S.bulb === 0) { step('bulb', 1); return [['FARMHAND', 'Projector bulb blew.'], ['FARMHAND', 'Feature can\'t start.'], ['WOLF', 'How long ago?'], ['FARMHAND', 'Since the bulb.'], ['FARMHAND', 'One car\'s waiting. The Moth\'s. Meter running.'], ['FARMHAND', 'Motel says it leaves the light on. Ask them for it.']]; }
          if (S.bulb >= 5) return [['FARMHAND', 'Popcorn?'], ['', 'He scoops it with the shovel.'], ['FARMHAND', 'Only way I know how to serve.']];
          return [['FARMHAND', 'Popcorn?'], ['WOLF', 'Is that a shovel?'], ['FARMHAND', 'It\'s a large.'], ['FARMHAND', 'Bulb first. Then the feature. Then the large.']]; } },
        { id: 'moth', label: 'MOTH', o: moth, talk: () => S.bulb >= 5 ? [['MOTH', 'Beautiful.'], ['MOTH', 'The sun, up close.'], ['MOTH', 'Meter\'s still running.'], ['WOLF', 'Who\'s paying?'], ['MOTH', 'The sun. It\'s watching. It\'s good for it.']]
          : [['MOTH', 'Meter\'s running.'], ['WOLF', 'You\'re not driving.'], ['MOTH', 'I\'m waiting. Waiting is driving, slower.'], ['MOTH', '$11.11.'], ['MOTH', 'It was $11.11 in 1979 too.']] },
        { id: 'proj', label: 'PROJECTOR', o: booth, talk: () => {
          if (S.bulb === 4) { step('bulb', 5); A.setAir(); return [['', 'Lamp-Bulb climbs into the projector.'], ['LAMP-BULB', 'I\'ve been left on my whole life.'], ['LAMP-BULB', 'Tonight I\'m turned up.'], ['', 'The feature starts: THE SUN.'], ['', 'Just the sun. Up close.'], ['', 'The sun watches back.'], ['MOTH', '(honks, once)'], ['FARMHAND', 'Standing ovation.'], ['WOLF', 'From one car.'], ['FARMHAND', 'All of them.']]; }
          if (S.bulb >= 5) return [['LAMP-BULB', 'Shh. I\'m working.'], ['', 'The sun is still on screen. It hasn\'t blinked.']];
          return [['', 'The projector bulb is a black felt pebble.'], ['', 'It is very dead.'], ['FARMHAND', 'Need a light that\'s used to staying on.']]; } },
        { id: 'screen', label: 'SCREEN', o: scr, talk: () => S.bulb >= 5 ? [['', 'NOW SHOWING: THE SUN.'], ['', 'Runtime: until it sets.'], ['', 'It doesn\'t set.']] : [['', 'INTERMISSION (since the bulb).'], ['', 'The intermission is the longest-running show in town.']] },
        { id: 'popcorn', label: 'POPCORN', o: pop, talk: () => [['', 'You order a small.'], ['FARMHAND', 'One shovel.'], ['WOLF', 'And a large?'], ['FARMHAND', 'One shovel. Fuller.']] },
        { id: 'speaker', label: 'SPEAKER', o: spk, talk: () => [['', 'You hang the speaker on the window.'], ['', 'It plays the sound of someone eating popcorn.'], ['', 'Close to your ear.'], ['', 'Very close.']] },
        { id: 'taxi', label: 'TAXI', o: taxi, talk: () => [['', 'The meter says $11.11.'], ['', 'It has said $11.11 for a long time.'], ['MOTH', 'Don\'t touch the meter. It\'s concentrating.']] },
      ];
    },
    // ================================================================== run 11 (M4): pool hall, the chain-link court, five home rooms
    async poolhall(G, A) {   // POOL · BILLIARDS (Neon Strip): three felt tables under green shades, cue rack, jukebox, a bar. Table 2 is playable (minigames.js createPool)
      const W = 10, [peach, shake] = await Promise.all([glb('town2/fuzzy_peach_lo.glb', 1.45, 'object', { rest: 'breathe' }), glb('town2/shake_lo.glb', 1.5, 'object', { rest: 'breathe' })]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, 3.2), texMat(cvTex(512, 160, (g, w, h) => { g.fillStyle = '#2f4a3e'; g.fillRect(0, 0, w, h); g.fillStyle = '#284034'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 7, h * 0.62);
        g.fillStyle = '#6b3a22'; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = '#c9a24a'; g.fillRect(0, h * 0.6, w, 4); g.fillStyle = '#5a3020'; for (let x = 0; x < w; x += 64) g.fillRect(x, h * 0.66, 3, h * 0.34); }, 1, 1))); wp.position.set(0, 1.6, -A.D / 2 + 0.02); G.add(wp);
      const table = (x, z, ry, play) => { const t = new THREE.Group(); const top = box(2.5, 0.14, 1.4, '#6b3a22', 0.05); top.position.y = 0.66; t.add(top); const bed = box(2.24, 0.04, 1.12, play ? '#2f7d5a' : '#2a6e50', 0.01); bed.position.y = 0.79; t.add(bed);
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(0.16, 0.68, 0.16, '#5a3020', 0.03); l.position.set(a * 1.05, 0, b * 0.55); t.add(l); }
        for (const [a, b] of [[-1.12, -0.56], [1.12, -0.56], [-1.12, 0.56], [1.12, 0.56], [0, -0.58], [0, 0.58]]) { const p = cyl(0.06, 0.06, 0.02, '#120c0a', 10); p.position.set(a, 0.8, b); t.add(p); }
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.38, 0.22, 14, 1, true), feltMat('#2f6a4a', { side: THREE.DoubleSide, emissive: new THREE.Color('#2f4a2a'), emissiveIntensity: 0.3 })); shade.position.set(0, 2.15, 0); t.add(shade);
        const cord = cyl(0.01, 0.01, 1.1, '#2a2a2a', 4); cord.position.y = 2.25; t.add(cord); const glow = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshBasicMaterial({ color: '#fff2c8' })); glow.rotation.x = Math.PI / 2; glow.position.y = 2.05; t.add(glow);
        if (!play) { [[0.4, 0.1, '#f2c230'], [0.6, -0.2, '#c9382e'], [-0.3, 0.3, '#2f55a8'], [-0.7, -0.1, '#f3efe2']].forEach(([bx, bz, c]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), feltMat(c)); b.position.set(bx, 0.845, bz); t.add(b); }); }
        else { const rack = new THREE.Group(); [[0, 0], [0.06, -0.035], [0.06, 0.035], [0.12, -0.07], [0.12, 0], [0.12, 0.07], [0.18, -0.035], [0.18, 0.035], [0.24, 0]].forEach(([bx, bz], i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), feltMat(['#f2c230', '#2f55a8', '#c9382e', '#f2c230', '#6a3f8a', '#e07a2e', '#2f7a4a', '#7a2a2a', '#231f22'][i])); b.position.set(0.45 + bx, 0.845, bz); rack.add(b); }); t.add(rack);
          const cb = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), feltMat('#f3efe2')); cb.position.set(-0.56, 0.845, 0); t.add(cb); const cue = cyl(0.012, 0.02, 1.45, '#d9b47a', 6); cue.rotation.z = Math.PI / 2 - 0.05; cue.position.set(-0.62, 0.9, 0.05); t.add(cue); }
        at(t, x, 0, z, ry); G.add(t); return t; };
      table(-3.2, -1.3, 0, false); const play = table(0.6, -0.2, 0, true); table(3.8, -1.4, 0.1, false);
      const rack = new THREE.Group(); const rb = box(1.6, 0.14, 0.12, '#5a3020', 0.02); rb.position.y = 0.9; rack.add(rb); const rt = rb.clone(); rt.position.y = 2.3; rack.add(rt);
      for (let i = 0; i < 8; i++) { const c = cyl(0.012, 0.02, 1.45, ['#d9b47a', '#c9a06a', '#e0c08a'][i % 3], 6); c.position.set(-0.7 + i * 0.2, 0.9, 0.02); c.rotation.z = (i % 2 ? 1 : -1) * 0.02; rack.add(c); } at(rack, -2.6, 0, -A.D / 2 + 0.12); G.add(rack);
      const chalk = new THREE.Group(); chalk.add(box(1.3, 0.9, 0.05, '#2a2a28', 0.02)); const cfr = box(1.42, 0.06, 0.08, '#6b3a22', 0.02); cfr.position.y = -0.03; chalk.add(cfr);
      const ct = cvTex(256, 180, (g, w, h) => { g.fillStyle = '#2a2a28'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(243,239,226,.85)'; g.font = '700 26px "Comic Sans MS",cursive'; g.textAlign = 'center'; g.fillText('WINNER STAYS', w / 2, 40); g.font = '22px "Comic Sans MS",cursive'; g.fillText('9-BALL · FELT RULES', w / 2, 78); g.fillText('HOUSE BEST: ' + (S.poolBest || '—'), w / 2, 118); g.fillText('NO MASSÉ (PLEASE)', w / 2, 156); }, 1, 1);
      const cboard = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.82), texMat(ct)); cboard.position.set(0, 0.45, 0.03); chalk.add(cboard); at(chalk, 1.2, 1.35, -A.D / 2 + 0.06); G.add(chalk); 
      const juke = new THREE.Group(); juke.add(box(0.9, 1.3, 0.6, '#c9382e', 0.12)); const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 16, 1, false, 0, Math.PI), feltMat('#f2c230', { emissive: new THREE.Color('#f2a030'), emissiveIntensity: 0.35 })); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(0, 1.3, 0); juke.add(arch);
      const jg = sign('SELECT', 0.6, 0.3, '#fff3dc', '#c9382e', 0.5); jg.position.set(0, 0.85, 0.31); juke.add(jg); at(juke, 4.4, 0, 0.9, -1.2); G.add(juke);
      const bar = new THREE.Group(); bar.add(box(0.7, 1.05, 2.6, '#6b3a22', 0.05)); const btop = box(0.85, 0.07, 2.8, '#c9a24a', 0.02); btop.position.y = 1.05; bar.add(btop);
      for (let i = 0; i < 3; i++) { const st = new THREE.Group(); st.add(cyl(0.03, 0.05, 0.7, '#8a8c88', 6)); const seat = cyl(0.2, 0.2, 0.1, '#c9382e', 12); seat.position.y = 0.7; st.add(seat); at(st, 0.65, 0, -0.9 + i * 0.9); bar.add(st); }
      at(bar, -4.4, 0, 0.9); G.add(bar); at(shake, -4.55, 1.12, 0.3, 0.9); G.add(shake);
      const neon = sign('POOL', 1.1, 0.42, '#1c1412', '#ff6fae', 0.75); neon.material.emissive = new THREE.Color('#ff6fae'); neon.material.emissiveMap = neon.material.map; neon.material.emissiveIntensity = 0.9; at(neon, 3.6, 2.45, -A.D / 2 + 0.05); G.add(neon);
      const rules = sign('NO GAMBLING\n(MUCH)', 0.9, 0.42, '#efe2c4', '#3a1f2a', 0.5); at(rules, -0.9, 2.3, -A.D / 2 + 0.05); G.add(rules);
      at(peach, 2.6, 0, 0.6, -0.7); G.add(peach);
      A.wolfSpot = [-1.2, 1.6]; A.anim = []; A.proc = [peach, shake]; A.view = { lw: 5.4, pw: 4.4, h: 2.3 }; A.bounds = [-4.4, 4.4, -1.0, 2.4];
      A.who = [
        { id: 'table', label: 'RACK \'EM (PLAY)', o: play, talk: () => [['FUZZY PEACH', 'Table two. The level one.'], ['FUZZY PEACH', 'Nine balls. Sink them all. Fewer shots, better.'], ['', 'You chalk the cue.', () => startGame(A, poolGame())]] },
        { id: 'peach', label: 'FUZZY PEACH', o: peach, talk: () => S.poolBest ? [['FUZZY PEACH', `${S.poolBest} shots. I\'ve seen worse.`], ['FUZZY PEACH', 'Mostly mine.']] : [['FUZZY PEACH', 'I don\'t hustle.'], ['FUZZY PEACH', 'I\'m just soft and I wait.'], ['WOLF', 'That\'s hustling.'], ['FUZZY PEACH', 'That\'s ripening.']] },
        { id: 'shake', label: 'MILKSHAKE', o: shake, talk: () => [['MILKSHAKE', 'We only serve one drink.'], ['WOLF', 'Which?'], ['MILKSHAKE', 'Me. Don\'t.']] },
        { id: 'juke', label: 'JUKEBOX', o: juke, talk: () => [['', 'You pick B-7.'], ['', 'It plays the sound of a pool break.'], ['', 'Then applause. For nobody.']] },
        { id: 'chalk', label: 'CHALKBOARD', o: chalk, talk: () => [['', 'WINNER STAYS.'], ['', S.poolBest ? 'HOUSE BEST: ' + S.poolBest + ' shots. It\'s in your handwriting.' : 'HOUSE BEST: — (nobody\'s cleared it)']] },
        { id: 'cues', label: 'CUE RACK', o: rack, talk: () => [['', 'Eight house cues. All a little bent.'], ['', 'Bent the same way. It\'s the house style.']] },
      ];
    },
    async court(G, A) {   // THE CHAIN-LINK COURT (Palm St, west side): one hoop, cracked asphalt, Larry Byrd. Shoot-around = minigames.js createHoops
      const sc = G.parent; if (sc) { sc.background = new THREE.Color('#e9a46a'); }
      const fl = new THREE.Mesh(new THREE.BoxGeometry(A.W + 0.4, 0.2, A.D + 0.2), texMat(cvTex(512, 384, (g, w, h) => { g.fillStyle = '#5d5a5e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        g.strokeStyle = 'rgba(243,239,226,.7)'; g.lineWidth = 5; g.strokeRect(w / 2 - 70, 0, 140, 170); g.beginPath(); g.arc(w / 2, 170, 56, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(w / 2, 20, 210, 0.15, Math.PI - 0.15); g.stroke();
        g.strokeStyle = 'rgba(20,18,20,.55)'; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } }, 1, 1)));
      fl.position.y = -0.1; fl.receiveShadow = true; G.add(fl);
      const fT = cvTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#b8bab4'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, 30, 9);
      const fm = new THREE.MeshStandardMaterial({ map: fT, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 });
      const fence = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), fm); m.position.set(x, 1.5, z); m.rotation.y = ry; G.add(m); for (let i = 0; i <= Math.round(w / 2.5); i++) { const p = cyl(0.035, 0.035, 3.05, '#8a8c88', 6); const f = i / Math.round(w / 2.5) - 0.5; p.position.set(x + Math.cos(ry) * f * w, 0, z - Math.sin(ry) * f * w); G.add(p); } };
      fence(A.W, 0, -A.D / 2, 0); fence(A.D, -A.W / 2, 0, Math.PI / 2); fence(A.D, A.W / 2, 0, -Math.PI / 2);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), texMat(cvTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2b27a'); gr.addColorStop(0.7, '#f6d2a0'); gr.addColorStop(0.71, '#c9925f'); gr.addColorStop(1, '#b8804f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#9a6a5a'; g.beginPath(); g.moveTo(0, h * 0.71); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.6 + Math.sin(x * 0.05) * 0.05)); g.lineTo(w, h * 0.71); g.fill(); }, 1, 1), 0.4)); sky.position.set(0, 5, -A.D / 2 - 6); G.add(sky);
      const hoop = new THREE.Group(); hoop.add(cyl(0.08, 0.09, 3.5, '#3f5f6e', 10)); const armh = box(0.12, 0.12, 0.9, '#3f5f6e', 0.02); armh.position.set(0, 3.25, 0.45); hoop.add(armh);
      const bb = sign('NO DUNKING\n(ON LARRY)', 1.8, 1.05, '#efe2c4', '#c9584a', 0.3); bb.position.set(0, 3.42, 0.95); hoop.add(bb); const bbk = box(1.84, 1.09, 0.05, '#d9c9a4', 0.01); bbk.position.set(0, 2.895, 0.91); hoop.add(bbk);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.229, 0.014, 6, 24), feltMat('#e06a2a')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 3.05, 1.33); hoop.add(rim);
      const net = cyl(0.15, 0.22, 0.42, '#d8d8d2', 12); net.material.transparent = true; net.material.opacity = 0.6; net.position.set(0, 2.62, 1.33); hoop.add(net);
      at(hoop, 0, 0, -A.D / 2 + 0.4); G.add(hoop);
      const larry = larryByrd(feltMat); at(larry, 2.6, 0, 0.2, -0.6); G.add(larry);
      const ballR = new THREE.Group(); ballR.add(box(0.9, 0.5, 0.4, '#8a8c88', 0.03)); [[-0.25, '#d96a2a'], [0.05, '#d96a2a'], [0.3, '#c95a2a']].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), feltMat(c)); b.position.set(x, 0.62, 0); ballR.add(b); }); at(ballR, -3.2, 0, -1.4, 0.3); G.add(ballR);
      const bench = box(2.0, 0.45, 0.45, '#8a5a3a', 0.04); at(bench, -3.0, 0, 1.0, Math.PI / 2); G.add(bench);
      const cooler = box(0.6, 0.45, 0.4, '#2f7ab8', 0.08); at(cooler, -2.9, 0.45, 0.3); G.add(cooler);
      const hours = sign('COURT CLOSES AT DARK\nit\'s always dark somewhere', 1.6, 0.5, '#fff3dc', '#3a1f2a', 0.45); at(hours, -2.4, 1.9, -A.D / 2 + 0.06); G.add(hours);
      A.wolfSpot = [-0.6, 1.5]; A.anim = []; A.view = { lw: 4.8, pw: 4.0, h: 2.6, look: -0.6 };
      A.tick = (dt, t) => { const hd = larry.userData.head; if (hd) hd.rotation.x = Math.sin(t * 2.2) * 0.12; larry.position.y = Math.abs(Math.sin(t * 3.1)) * 0.03; };
      A.who = [
        { id: 'hoop', label: 'SHOOT AROUND (PLAY)', o: hoop, talk: () => [['LARRY BYRD', 'Around the world. Five spots, two shots each.'], ['LARRY BYRD', 'Then me. Most buckets wins.'], ['', 'Larry tosses you the ball.', () => startGame(A, hoopsGame())]] },
        { id: 'larry', label: 'LARRY BYRD', o: larry, talk: () => S.hoops ? [['LARRY BYRD', `Last time: you ${S.hoops.w}, me ${S.hoops.l}.`], ['LARRY BYRD', S.hoops.w > S.hoops.l ? 'I was injured. Emotionally.' : 'Classic Larry.']] : [['LARRY BYRD', 'Larry Byrd. Two Rs, one Y.'], ['WOLF', 'Like the—'], ['LARRY BYRD', 'Like the bird. I am a bird.'], ['LARRY BYRD', 'Vulture. Shooting guard.']] },
        { id: 'cooler', label: 'COOLER', o: cooler, talk: () => [['', 'The cooler has one orange slice in it.'], ['LARRY BYRD', 'Halftime. From 1987.']] },
        { id: 'rack', label: 'BALL RACK', o: ballR, talk: () => [['', 'Three basketballs. Two are flat.'], ['', 'The third is just shy.']] },
        { id: 'hours', label: 'SIGN', o: hours, talk: () => [['', 'COURT CLOSES AT DARK.'], ['', 'It\'s always dark somewhere.']] },
      ];
    },
    // ---- the five home rooms (object characters at home). Each has a small chore with its own little state.
    async wolf(G, A) {   // WOLF'S KITCHEN: fridge, stove, phone, plaid box — chore: MAKE BREAKFAST
      const [fridge, stove, phone, plaid] = await Promise.all([glb('cast/house_fridge_walking.glb', 1.95, 'object', { rest: 'breathe' }), glb('town2/stove.glb', 1.05), glb('hf2/phone.glb', 0.5, 'object', { rest: 'bob' }), glb('hf2/plaid_box.glb', 0.7, 'object', { rest: 'bob' })]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 3.2), texMat(cvTex(256, 128, (g, w, h) => { g.fillStyle = '#f2e6c0'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0705a'; for (let y = 6; y < h * 0.55; y += 22) for (let x = (y / 22 % 2) * 11; x < w; x += 22) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
        for (let y = h * 0.55; y < h; y += 10) for (let x = 0; x < w; x += 10) { g.fillStyle = ((x + y) / 10) % 2 ? '#f6efe0' : '#bfe0d0'; g.fillRect(x, y, 10, 10); } }, 1, 1))); wp.position.set(0, 1.6, -2.98); G.add(wp);
      const counter = box(2.6, 0.9, 0.62, '#9fd6c0', 0.04); at(counter, -1.0, 0, -2.6); G.add(counter); const ctop = box(2.7, 0.06, 0.68, '#f6efe0', 0.02); at(ctop, -1.0, 0.9, -2.6); G.add(ctop);
      const upper = box(2.6, 0.7, 0.36, '#9fd6c0', 0.04); at(upper, -1.0, 1.75, -2.78); G.add(upper);
      const win = new THREE.Group(); win.add(box(1.0, 0.8, 0.06, '#f6efe0', 0.02)); const gl = box(0.86, 0.66, 0.04, '#a8d0e0', 0.01); gl.position.set(0, 0.07, 0.02); win.add(gl); at(win, 2.4, 1.3, -2.95); G.add(win);
      const tbl = new THREE.Group(); const tt = cyl(0.55, 0.55, 0.05, '#e0705a', 18); tt.position.y = 0.74; tbl.add(tt); tbl.add(cyl(0.05, 0.08, 0.74, '#c9c9c0', 8)); at(tbl, 1.4, 0, 0.3); G.add(tbl);
      for (const [x, z] of [[0.7, 0.5], [2.1, 0.2]]) { const ch = new THREE.Group(); const s = cyl(0.2, 0.2, 0.08, '#f2c230', 12); s.position.y = 0.45; ch.add(s, cyl(0.02, 0.02, 0.45, '#c9c9c0', 6)); at(ch, x, 0, z); G.add(ch); }
      const plate = cyl(0.16, 0.14, 0.02, '#f6efe0', 14); at(plate, 1.4, 0.79, 0.3); G.add(plate);
      const eggs = new THREE.Group(); const w1 = cyl(0.07, 0.07, 0.012, '#fff8ea', 10), y1 = cyl(0.03, 0.03, 0.02, '#f2b632', 8); eggs.add(w1, y1); const ba = box(0.18, 0.02, 0.05, '#c9584a', 0.01); ba.position.set(0.02, 0.01, 0.07); eggs.add(ba); at(eggs, 1.4, 0.81, 0.3); eggs.visible = false; G.add(eggs);
      const pan = new THREE.Group(); pan.add(cyl(0.16, 0.14, 0.05, '#2a2a2a', 12)); const hdl = box(0.3, 0.03, 0.04, '#2a2a2a', 0.01); hdl.position.set(0.3, 0.02, 0); pan.add(hdl);
      at(fridge, -3.2, 0, -2.3, 0.3); at(stove, 0.9, 0, -2.55, 0); G.add(fridge, stove); at(pan, 0.82, 1.06, -2.5); G.add(pan);
      at(phone, -0.4, 0.96, -2.6, 0.2); at(plaid, -1.9, 0.96, -2.55, 0.4); G.add(phone, plaid);
      const note = sign('TO DO:\n1 EGGS (FRIDGE)\n2 PAN (STOVE)\n3 PLATE IT', 0.7, 0.62, '#fff3dc', '#3a1f2a', 0.62); at(note, -2.9, 1.5, -2.0, 0.35); note.position.z = -1.88; G.add(note);
      A.cook = 0; A.wolfSpot = [0.4, 1.6]; A.anim = []; A.proc = [fridge, phone, plaid];
      A.tick = (dt, t) => { if (A.sizzle > 0) { A.sizzle -= dt; pan.position.y = 1.06 + Math.abs(Math.sin(t * 30)) * 0.01; } };
      A.who = [
        { id: 'fridge', label: 'FRIDGE', o: fridge, talk: () => { if (A.cook === 0) { A.cook = 1; return [['FRIDGE', 'Close the door, you\'re letting the cold out.'], ['WOLF', 'I haven\'t opened it.'], ['FRIDGE', 'Pre-emptively.'], ['', 'Got: two eggs. (TO DO 1/3)']]; }
          return Math.random() < 0.5 ? [['FRIDGE', 'I\'m running.'], ['WOLF', 'Then go catch yourself.'], ['FRIDGE', 'I\'ve heard it.']] : [['FRIDGE', 'My brother\'s out on the lawn.'], ['WOLF', 'Why?'], ['FRIDGE', 'He walks. I don\'t ask.']]; } },
        { id: 'stove', label: 'STOVE', o: stove, talk: () => { if (A.cook === 1) { A.cook = 2; A.sizzle = 2.2; return [['', 'You crack the eggs into the pan.'], ['STOVE', 'Sssss.'], ['STOVE', 'That\'s me. Not the eggs.'], ['', 'Breakfast is cooking. (TO DO 2/3)']]; }
          return A.cook === 0 ? [['STOVE', 'I\'m hot.'], ['WOLF', 'You\'re off.'], ['STOVE', 'I\'m hot in general.']] : [['STOVE', 'Done. Like a dinner. But breakfast.']]; } },
        { id: 'plate', label: 'PLATE', o: plate, talk: () => { if (A.cook === 2) { A.cook = 3; eggs.visible = true; return [['', 'Two eggs, sunny side up. One strip of felt bacon.'], ['PLAID BOX', 'Plated. Very professional.'], ['', 'Breakfast: done. (TO DO 3/3)']]; }
          return A.cook >= 3 ? [['', 'The eggs look at you.'], ['', 'Sunny side up. Always.']] : [['', 'An empty plate.'], ['', 'Check the TO DO list on the fridge.']]; } },
        { id: 'phone', label: 'PHONE', o: phone, talk: () => A.cook >= 3 ? [['PHONE', 'Ring ring.'], ['WOLF', 'Hello?'], ['PHONE', 'It\'s me. The phone. Your eggs are getting cold.']] : [['PHONE', 'Ring.'], ['WOLF', 'You\'re ringing yourself.'], ['PHONE', 'Somebody has to.']] },
        { id: 'plaid', label: 'PLAID BOX', o: plaid, talk: () => [['PLAID BOX', 'I hold the cereal.'], ['WOLF', 'There\'s no cereal.'], ['PLAID BOX', 'I hold the idea of cereal.']] },
      ];
    },
    async heron(G, A) {   // HERON'S BATHROOM: toilet, sink, plunger-glasses — chore: THE CLOG
      const [toilet, sink, plunger] = await Promise.all([glb('hf2/toilet.glb', 0.85), glb('hf2/sink.glb', 1.0), glb('hf2/plunger_glasses.glb', 0.95, 'object', { rest: 'bob' })]);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 3.2), texMat(cvTex(256, 128, (g, w, h) => { for (let y = 0; y < h; y += 12) for (let x = 0; x < w; x += 12) { g.fillStyle = y < h * 0.5 ? '#f6c6d6' : ((x + y) / 12 % 2 ? '#2a2440' : '#f6efe0'); g.fillRect(x + 0.5, y + 0.5, 11, 11); } g.fillStyle = '#2a2440'; g.fillRect(0, h * 0.5 - 3, w, 4); }, 1, 1))); tile.position.set(0, 1.6, -2.98); G.add(tile);
      const tub = new THREE.Group(); tub.add(box(1.8, 0.6, 0.85, '#f6efe0', 0.2)); const water = box(1.6, 0.05, 0.65, '#9fd6e8', 0.02); water.position.y = 0.52; tub.add(water); for (const x of [-0.75, 0.75]) { const f = cyl(0.06, 0.04, 0.12, '#c9a24a', 6); f.position.set(x, -0.08, 0.3); tub.add(f); }
      const curtain = box(0.04, 1.8, 0.9, '#f2c230', 0.02); curtain.position.set(0.95, 0.6, 0); tub.add(curtain); at(tub, -2.8, 0.08, -2.4); G.add(tub);
      at(toilet, 0.3, 0, -2.55, 0); at(sink, 2.3, 0, -2.6, 0); at(plunger, -0.9, 0, -1.0, 0.4); G.add(toilet, sink, plunger);
      const mirror = box(0.8, 1.0, 0.04, '#cfe6ec', 0.04); at(mirror, 2.3, 1.35, -2.96); G.add(mirror); const mf = box(0.9, 1.1, 0.03, '#c9a24a', 0.04); at(mf, 2.3, 1.3, -2.98); G.add(mf);
      const mat = cyl(0.55, 0.55, 0.02, '#2a9d9a', 20); mat.scale.z = 0.6; at(mat, 0.3, 0.005, -1.6); G.add(mat);
      const duck = new THREE.Group(); const db = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), feltMat('#f2c230')); db.scale.set(1.3, 0.8, 1); duck.add(db); const dh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), feltMat('#f2c230')); dh.position.set(0.08, 0.08, 0); duck.add(dh); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), feltMat('#e07a2e')); bk.rotation.z = -Math.PI / 2; bk.position.set(0.15, 0.07, 0); duck.add(bk); at(duck, -2.6, 0.72, -2.4); G.add(duck);
      A.clog = 0; A.wolfSpot = [-0.8, 1.6]; A.anim = []; A.proc = [plunger];
      A.tick = (dt, t) => { if (A.plunge > 0) { A.plunge -= dt; toilet.rotation.z = Math.sin(t * 28) * 0.03; toilet.position.y = Math.abs(Math.sin(t * 14)) * 0.02; if (A.plunge <= 0) { toilet.rotation.z = 0; toilet.position.y = 0; } } duck.position.y = 0.72 + Math.sin(t * 1.4) * 0.01; };
      A.who = [
        { id: 'toilet', label: 'TOILET', o: toilet, talk: () => { if (A.clog === 0) { A.clog = 1; return [['TOILET', 'I\'m not clogged.'], ['TOILET', 'I\'m thinking.'], ['WOLF', 'About what?'], ['TOILET', 'A sock. Possibly argyle.'], ['', 'Chore: fix the clog. Ask the Plunger.']]; }
          if (A.clog === 2) { A.clog = 3; A.plunge = 2.0; return [['', 'Plunger-Glasses gets to work. Glasses first.'], ['TOILET', 'Oh. OH.'], ['', 'Something felt goes back the way it came.'], ['TOILET', 'Much clearer.'], ['', 'Chore done: the clog.']]; }
          return A.clog >= 3 ? [['TOILET', 'Thank you for your service.'], ['TOILET', 'Please flush on your way out. Of my life.']] : [['TOILET', 'Still thinking.']]; } },
        { id: 'plunger', label: 'PLUNGER-GLASSES', o: plunger, talk: () => { if (A.clog === 1) { A.clog = 2; return [['PLUNGER-GLASSES', 'I need to see the problem.'], ['', 'It adjusts its glasses.'], ['PLUNGER-GLASSES', 'I see the problem. Take me to the toilet.']]; }
          return A.clog >= 3 ? [['PLUNGER-GLASSES', 'I\'m a professional.'], ['PLUNGER-GLASSES', 'Professionals don\'t talk about the work.']] : [['PLUNGER-GLASSES', 'I\'m short-sighted.'], ['PLUNGER-GLASSES', 'And long-handled.']]; } },
        { id: 'sink', label: 'SINK', o: sink, talk: () => [['SINK', 'Drip.'], ['WOLF', 'You should get that looked at.'], ['SINK', 'Drip. (It\'s how I talk.)']] },
        { id: 'duck', label: 'RUBBER DUCK', o: duck, talk: () => [['', 'The rubber duck is felt.'], ['', 'It does not float. It has made peace with that.']] },
      ];
    },
    async lynx(G, A) {   // LYNX'S BEDROOM: lamp-bulb, lantern, eye chair — chore: LIGHTS OUT
      const [lamp, lantern, chair] = await Promise.all([glb('hf2/lamp_bulb.glb', 1.15, 'object', { rest: 'bob' }), glb('hf2/lantern.glb', 0.6, 'object', { rest: 'bob' }), glb('town2/eye_chair.glb', 1.1)]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 3.2), texMat(cvTex(256, 128, (g, w, h) => { g.fillStyle = '#c6d6f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2d27a'; for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h * 0.9; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 2.513 - 1.57; g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); const b = a + 1.256; g.lineTo(x + Math.cos(b) * 1.8, y + Math.sin(b) * 1.8); } g.fill(); } }, 1, 1))); wp.position.set(0, 1.6, -2.98); G.add(wp);
      const bed = new THREE.Group(); bed.add(box(1.6, 0.45, 2.1, '#8a5a3a', 0.05)); const mat = box(1.5, 0.2, 2.0, '#f6efe0', 0.08); mat.position.y = 0.45; bed.add(mat);
      const quilt = box(1.56, 0.08, 1.4, '#e0705a', 0.04); quilt.position.set(0, 0.63, 0.3); bed.add(quilt); for (let i = 0; i < 4; i++) { const q = box(1.58, 0.085, 0.08, '#f2c230', 0.02); q.position.set(0, 0.63, -0.2 + i * 0.34); bed.add(q); }
      const pil = box(1.1, 0.16, 0.4, '#fff8ea', 0.08); pil.position.set(0, 0.65, -0.75); bed.add(pil); const hb = box(1.7, 1.1, 0.1, '#6b3a22', 0.05); hb.position.set(0, 0, -1.05); bed.add(hb); at(bed, -1.2, 0, -1.7); G.add(bed);
      const ns = box(0.55, 0.6, 0.45, '#6b3a22', 0.04); at(ns, 0.4, 0, -2.5); G.add(ns); at(lamp, 0.4, 0.6, -2.5, -0.3); G.add(lamp);
      const dresser = box(1.3, 0.95, 0.5, '#9a6a4a', 0.04); at(dresser, 2.6, 0, -2.6); G.add(dresser); at(lantern, 2.4, 0.95, -2.6, -0.4); G.add(lantern);
      const rug = cyl(0.9, 0.9, 0.02, '#5a4a8a', 22); rug.scale.z = 0.65; at(rug, 1.4, 0.005, 0.1); G.add(rug); at(chair, 2.2, 0, 0.0, -0.9); G.add(chair);
      const win = new THREE.Group(); win.add(box(1.0, 1.0, 0.06, '#f6efe0', 0.02)); const gl = box(0.86, 0.86, 0.04, '#2a2a5a', 0.01); gl.position.set(0, 0.07, 0.02); win.add(gl); const moon = cyl(0.12, 0.12, 0.01, '#fff3c0', 14); moon.rotation.x = Math.PI / 2; moon.position.set(0.2, 0.7, 0.06); win.add(moon); at(win, -3.0, 1.2, -2.95); G.add(win);
      const sc = G.parent, hemi = sc?.children.find(o => o.isHemisphereLight), key = sc?.children.find(o => o.isDirectionalLight); const base = [hemi?.intensity ?? 1, key?.intensity ?? 1];
      const glowL = new THREE.PointLight('#ffe0a0', 0, 3.5); glowL.position.set(0.4, 1.6, -2.3); G.add(glowL);
      A.off = { lamp: false, lantern: false, chair: false }; A.wolfSpot = [0.6, 1.5]; A.anim = []; A.proc = [lamp, lantern];
      const dark = () => { const n = Object.values(A.off).filter(Boolean).length; if (hemi) hemi.intensity = base[0] * (1 - n * 0.22); if (key) key.intensity = base[1] * (1 - n * 0.25); glowL.intensity = n === 3 ? 0 : 0.6; return n; };
      A.setAir = () => { A.off = { lamp: false, lantern: false, chair: false }; dark(); chair.scale.y = 1; };
      const done = () => dark() === 3 ? [['', 'Lights out. (3/3)'], ['LYNX (from the hall)', 'Finally. Goodnight, room.'], ['EYE CHAIR', '(one eye still open)']] : [['', `Lights out: ${dark()}/3.`]];
      A.who = [
        { id: 'lamp', label: 'LAMP-BULB', o: lamp, talk: () => { if (!A.off.lamp) { A.off.lamp = true; return [['LAMP-BULB', 'I\'ve been left on my whole life.'], ['WOLF', 'Bedtime.'], ['LAMP-BULB', '...okay. Just a little dim.'], ...done()]; } return [['LAMP-BULB', '(dimly) I\'m resting my filament.']]; } },
        { id: 'lantern', label: 'LANTERN', o: lantern, talk: () => { if (!A.off.lantern) { A.off.lantern = true; return [['LANTERN', 'I\'m for camping.'], ['WOLF', 'You\'re on a dresser.'], ['LANTERN', 'I\'m camping on a dresser.'], ['', 'It turns itself down anyway.'], ...done()]; } return [['LANTERN', '(low) Ghost stories later.']]; } },
        { id: 'chair', label: 'EYE CHAIR', o: chair, talk: () => { if (!A.off.chair) { A.off.chair = true; chair.scale.y = 0.97; return [['EYE CHAIR', 'I don\'t sleep. I watch.'], ['WOLF', 'Watch with your eye closed.'], ['EYE CHAIR', 'That\'s called sleeping.'], ['EYE CHAIR', 'Fine.'], ...done()]; } return [['EYE CHAIR', '(watching, with the eye closed)']]; } },
        { id: 'bed', label: 'BED', o: bed, talk: () => dark() === 3 ? [['', 'You lie down on the felt quilt.'], ['', 'It\'s very quiet.'], ['EYE CHAIR', '(watching)']] : [['', 'You can\'t sleep with the lights on.'], ['', 'Everyone in this room is a light.']] },
      ];
    },
    async gecko(G, A) {   // GECKO'S LAUNDRY ROOM: washer, argyle sock (the cousin) — chore: DO A LOAD
      const [washer, sock] = await Promise.all([glb('town2/washing_machine.glb', 1.25, 'object', { rest: 'bob' }), glb('town2/argyle_sock.glb', 0.8, 'feltobj')]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 3.2), texMat(cvTex(256, 128, (g, w, h) => { g.fillStyle = '#d6e8c0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c0d6a8'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); g.fillStyle = '#f6efe0'; g.fillRect(0, h * 0.6, w, h * 0.4); for (let y = h * 0.6; y < h; y += 8) { g.fillStyle = '#e8dcc0'; g.fillRect(0, y, w, 1); } }, 1, 1))); wp.position.set(0, 1.6, -2.98); G.add(wp);
      at(washer, -1.4, 0, -2.4, 0); G.add(washer); washer.userData.x0 = -1.4; const dryer = box(0.95, 1.1, 0.85, '#f6efe0', 0.1); at(dryer, -0.2, 0, -2.45); G.add(dryer); const dd = cyl(0.3, 0.3, 0.04, '#9a9a90', 16); dd.rotation.x = Math.PI / 2; dd.position.set(-0.2, 0.6, -2.0); G.add(dd);
      const shelf = box(2.4, 0.06, 0.35, '#9a6a4a', 0.02); at(shelf, -0.8, 1.9, -2.8); G.add(shelf); [['#2f7ab8', 0.6, -1.8], ['#f2c230', 0.45, -1.2], ['#e0705a', 0.5, -0.5]].forEach(([c, h, x]) => { const b = box(0.32, h, 0.24, c, 0.05); at(b, x, 1.96, -2.8); G.add(b); });
      const line = cyl(0.008, 0.008, 3.2, '#efe2c4', 4); line.rotation.z = Math.PI / 2; line.position.set(1.8, 2.2, -1.6); G.add(line);
      const hung = []; [['#e0705a', 0.6], ['#6aa4b8', 1.3], ['#f2c230', 2.0], ['#8a4fc0', 2.7]].forEach(([c, x]) => { const t = box(0.4, 0.45, 0.02, c, 0.02); at(t, x, 1.75, -1.6); t.visible = false; G.add(t); hung.push(t); });
      const basket = new THREE.Group(); basket.add(cyl(0.32, 0.26, 0.42, '#c9a06a', 12)); const pile = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), feltMat('#d9c9e0')); pile.scale.y = 0.45; pile.position.y = 0.42; basket.add(pile); at(basket, 1.0, 0, -0.4); G.add(basket);
      at(sock, 2.2, 0, 0.3, -0.5); G.add(sock);
      A.load = 0; A.wolfSpot = [0.2, 1.5]; A.anim = []; A.spin = 0;
      A.tick = (dt, t) => { if (A.spin > 0) { A.spin -= dt; washer.position.x = washer.userData.x0 + Math.sin(t * 60) * 0.025; washer.rotation.z = Math.sin(t * 47) * 0.02; if (A.spin <= 0) { washer.position.x = washer.userData.x0; washer.rotation.z = 0; } } };
      A.who = [
        { id: 'basket', label: 'LAUNDRY BASKET', o: basket, talk: () => { if (A.load === 0) { A.load = 1; return [['', 'One basket. Four shirts and one opinion.'], ['', 'Chore: do a load. Into the washer.']]; } return A.load >= 3 ? [['', 'Empty. For now.']] : [['', 'The basket is waiting.']]; } },
        { id: 'washer', label: 'WASHER', o: washer, talk: () => { if (A.load === 1) { A.load = 2; A.spin = 2.4; pile.visible = false; return [['WASHER', 'Spin.'], ['WASHER', 'My cousin at the laundromat says hi.'], ['WASHER', 'He only says one word. "East."'], ['', 'Wash done. Hang it on the line.']]; }
          return A.load >= 2 ? [['WASHER', 'Rinse.'], ['WASHER', 'That\'s a whole conversation for me.']] : [['WASHER', 'Empty. Load me.']]; } },
        { id: 'line', label: 'CLOTHESLINE', o: line, talk: () => { if (A.load === 2) { A.load = 3; hung.forEach(h => h.visible = true); pile.visible = true; pile.scale.setScalar(0.4); return [['', 'You hang four shirts.'], ['', 'They dry instantly. It\'s the desert.'], ['', 'Chore done: one load.']]; } return A.load >= 3 ? [['', 'Four dry shirts. Crispy.']] : [['', 'An empty clothesline.']]; } },
        { id: 'sock', label: 'ARGYLE SOCK (COUSIN)', o: sock, talk: () => [['ARGYLE SOCK', 'Different sock. Same pattern.'], ['ARGYLE SOCK', 'Argyle runs in the family.'], ['WOLF', 'Your cousin is at the laundromat.'], ['ARGYLE SOCK', 'We don\'t talk. We\'re a pair of singles.']] },
      ];
    },
    async crow(G, A) {   // CROW'S GARAGE: wheelbarrow, pliers — chore: FIX THE BIKE
      const [barrow, pliers] = await Promise.all([glb('hf2/wheelbarrow.glb', 0.8), glb('hf2/pliers.glb', 0.6, 'object', { rest: 'bob' })]);
      const wp = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 3.2), texMat(cvTex(256, 128, (g, w, h) => { g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h); g.fillStyle = '#a89878'; for (let y = 0; y < h; y += 9) g.fillRect(0, y, w, 2); g.fillStyle = '#c9a06a'; g.fillRect(w * 0.35, h * 0.2, w * 0.3, h * 0.45);
        g.fillStyle = '#3a2a1a'; for (let i = 0; i < 40; i++) g.fillRect(w * 0.35 + 6 + (i % 10) * 7.4, h * 0.2 + 6 + Math.floor(i / 10) * 13, 2, 2); }, 1, 1))); wp.position.set(0, 1.6, -2.98); G.add(wp);
      const bench = box(2.4, 0.9, 0.7, '#7a5a3a', 0.03); at(bench, 0, 0, -2.6); G.add(bench); const vise = box(0.25, 0.2, 0.2, '#3f5f6e', 0.03); at(vise, -0.9, 0.9, -2.5); G.add(vise);
      at(pliers, 0.6, 0.9, -2.5, 0.3); G.add(pliers);
      const tools = new THREE.Group(); [[-0.3, '#8a8c88', 0.4], [-0.1, '#c9382e', 0.3], [0.1, '#8a8c88', 0.5], [0.3, '#2f55a8', 0.35]].forEach(([x, c, h]) => { const t = box(0.06, h, 0.03, c, 0.01); t.position.set(x, -h, 0); tools.add(t); }); at(tools, 0, 2.2, -2.94); G.add(tools);
      const bike = new THREE.Group(); const wheel = (x) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 20), feltMat('#2a2a2a')); w.position.set(x, 0.36, 0); bike.add(w); const hub = cyl(0.04, 0.04, 0.06, '#c9c9c0', 6); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.36, -0.03); bike.add(hub); return w; };
      const wf = wheel(0.55), wr = wheel(-0.55); const fr = (a, b) => { const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)); const m = cyl(0.025, 0.025, v.length(), '#c9382e', 6); m.position.set(...a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); bike.add(m); };
      fr([-0.55, 0.36, 0], [0, 0.7, 0]); fr([0, 0.7, 0], [0.5, 0.75, 0]); fr([0.55, 0.36, 0], [0.5, 0.85, 0]); fr([-0.55, 0.36, 0], [0, 0.36, 0]); fr([0, 0.36, 0], [0, 0.75, 0]);
      const seat = box(0.22, 0.05, 0.1, '#2a2a2a', 0.02); seat.position.set(0, 0.78, 0); bike.add(seat); const bar = cyl(0.02, 0.02, 0.45, '#c9c9c0', 6); bar.rotation.x = Math.PI / 2; bar.position.set(0.5, 0.88, 0); bike.add(bar);
      wf.rotation.z = 0.0; bike.rotation.z = 0; at(bike, -1.6, 0, 0.2, 0.3); G.add(bike); wf.scale.set(1, 0.7, 1);   // the front wheel is taco'd
      at(barrow, 1.9, 0, 0.1, -0.7); G.add(barrow);
      const car = box(2.0, 0.7, 1.2, '#2f7a6a', 0.25); at(car, 2.6, 0, -1.4, 0.1); G.add(car); const cover = box(2.1, 0.12, 1.3, '#c9b9a0', 0.05); at(cover, 2.6, 0.7, -1.4, 0.1); G.add(cover);
      A.fix = 0; A.wolfSpot = [-0.2, 1.6]; A.anim = []; A.proc = [pliers]; A.view = { look: -0.4 };
      A.tick = (dt) => { if (A.fix >= 2) { wf.rotation.z -= dt * 3; wr.rotation.z -= dt * 3; } };
      A.who = [
        { id: 'bike', label: 'BIKE', o: bike, talk: () => { if (A.fix === 0) { A.fix = 1; return [['', 'The front wheel is bent like a taco.'], ['', 'Chore: fix the bike. Something here grips.']]; } if (A.fix === 1) return [['', 'Still a taco. Find a grip.']]; return [['', 'The wheels spin. Not toward anywhere. Just spin.']]; } },
        { id: 'pliers', label: 'PLIERS', o: pliers, talk: () => { if (A.fix === 1) { A.fix = 2; wf.scale.set(1, 1, 1); return [['PLIERS', 'I\'m a pair.'], ['WOLF', 'You\'re one pliers.'], ['PLIERS', 'Pliers is plural. I\'m a pair of one.'], ['', 'Pliers bends the wheel round.'], ['', 'Chore done: the bike.']]; }
          return [['PLIERS', 'I grip.'], ['PLIERS', 'It\'s a lifestyle.']]; } },
        { id: 'barrow', label: 'WHEELBARROW', o: barrow, talk: () => [['WHEELBARROW', 'One wheel. Two handles.'], ['WHEELBARROW', 'I\'ve never been anywhere on my own.'], ['WOLF', 'Crow pushes you?'], ['WHEELBARROW', 'Crow fills me. Then sits in me.']] },
        { id: 'car', label: 'COVERED CAR', o: car, talk: () => [['', 'A car under a tarp. Teal, probably.'], ['', 'A tag on the tarp: "THE COLLECTION. DO NOT."']] },
      ];
    },
  };

  // ------------------------------------------------------------------ missions
  const OBJ = {
    sock: ['', 'Ask the Washing Machine (it only talks during spin)', 'Ask around about "East"', 'Look for the sock at the Post Office',
      'Find the Crow\'s collection by the road', 'Bring the sock back to the Laundromat', ''],
    num: ['', 'Take a number', 'Wait. Or try Window 1', 'Mail yourself a letter (Post Office)', 'Back to the DMV: vision test', 'Wait for 99', 'Go to Window 1', ''],
    bulb: ['', 'Find a new projector bulb (the Motel leaves the light on)', 'Find a light to leave on instead (the Motel Pool; the lifeguard says swim first)', 'Bring the pool light to the Motel', 'Take Lamp-Bulb to the Drive-In projector', ''],
    adv: ['', 'Order something at the Diner counter (tap ORDER)', 'Turn the menu over. Order the back.', 'Leave the Diner (your party follows)', 'Show the Crow the napkin map (by the road, west fence)', ''],
    air: ['', 'Find rabbit ears at Crow\'s Yard (dig the junk)', 'Put the antenna on the Fence-Stool (Crow insists)', 'Buy it back at Second Sun Thrift',
      'Win $2 at Gutter Bowl (rent shoes at the control desk, bowl a frame)', 'Pay the Thrift two dollars', 'Bring the rabbit ears to TV-Head (KSUN)', ''],
  };
  const TITLE = { sock: 'ODD SOCK OUT', num: 'TAKE A NUMBER', air: 'DEAD AIR', bulb: 'LEAVE THE LIGHT ON', adv: 'TABLE FOR FOUR' };
  const DONE = { sock: 6, num: 7, air: 7, bulb: 5, adv: 5 };
  const DONE_MSG = { sock: '. Lost Socks board unlocked.', num: '. Plate 11W.', air: '. Ratings doubled (both the Bear).', bulb: '. Lamp-Bulb got a standing ovation from one car.', adv: '. Party of four. The adventure is ongoing.' };
  function step(m, n) { S[m] = n; save(); if (n === 1) toast(TITLE[m] + ' — new errand'); if (n === DONE[m]) setTimeout(() => toast(TITLE[m] + ' — done' + DONE_MSG[m]), 600); hud(); }
  const MLIST = ['adv', 'sock', 'num', 'air', 'bulb'];   // run 13: extendable (missions13.js pushes horse/call/route)
  const errands = () => MLIST.filter(m => S[m] > 0 && S[m] < DONE[m]);
  // run 12: where each errand step sends the Wolf (for the minimap / full map)
  const TGT = { sock: [0, 'laundromat', 'laundromat', 'post', 'fence', 'laundromat'], num: [0, 'dmv', 'dmv', 'post', 'dmv', 'dmv', 'dmv'],
    bulb: [0, 'motel', 'pool', 'motel', 'drivein'], adv: [0, 'diner', 'diner', 'diner', 'fence'], air: [0, 'yard', 'yard', 'thrift', 'bowl', 'thrift', 'ksun'] };
  T.targets = () => errands().map(m => ({ k: TGT[m][S[m]], title: TITLE[m], obj: OBJ[m][S[m]] })).filter(o => o.k);
  function hud() {
    let s = errands().map(m => { let o = OBJ[m][S[m]]; if (m === 'sock' && S[m] === 4 && !S.hubcap) o += '\n   (the Crow trades — check the Post Office parcels)'; return TITLE[m] + ' · ' + o; }).join('\n');
    if (errands().length) s += '\n(clock on hold while you run errands)'; $('townObj').textContent = s; const to = $('townObj'), hd = $('hud'); to.style.top = (!document.body.classList.contains('room') && hd) ? (hd.getBoundingClientRect().bottom + 8) + 'px' : '';
  }
  Object.assign(BUILD, homes16({ glb, box, cyl, at, sign, cvTex, texMat, pane, realRoom, feltMat, eyes, playhouse, wob, txt, say: (L) => say(L), S, save: () => save() }));   // run 16
  function save() { try { sessionStorage.setItem('ss_town1', JSON.stringify(S)); } catch (e) { } }
  try { if (new URLSearchParams(location.search).has('fresh')) sessionStorage.removeItem('ss_town1'); Object.assign(S, JSON.parse(sessionStorage.getItem('ss_town1') || '{}')); } catch (e) { }
  { const q = new URLSearchParams(location.search).get('mstep'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (k in DONE) S[k] = +v; if (S.adv >= 3) S.party = 1; } } // QA: ?mstep=sock:3,num:4 (adv:3+ also gives you the party)
  const toast = (m, sec = 3.5) => level?.toast ? level.toast(m, sec) : null;

  // ------------------------------------------------------------------ dialogue (reuses the scene subtitle UI)
  let lines = [], lineT = 0;
  function say(L, keep = false) { for (const l of lines) try { l[2]?.(); } catch (e) { console.warn(e); } lines = L.slice(); lineT = 0; if (keep) lines.keep = true; nextLine(); }
  function nextLine() { const l = lines.shift(); if (!l) { sub.classList.remove('on'); return; } const tx = typeof l[1] === 'function' ? l[1]() : l[1]; try { l[2]?.(); } catch (e) { console.warn(e); }
    subName.textContent = l[0] ? l[0] + ' ' : ''; subText.textContent = tx; sub.classList.add('on'); lineT = 1.4 + tx.length * 0.045; }
  function talk(who) {
    if (!who) return; T.focus = who; audio.ui?.('tick'); const r = who.talk(); S.seen[who.id] = 1;
    if (r && r !== 'async') say(r); chipsFor(T.rooms[T.active]); }
  function chipsFor(A) { chips.innerHTML = ''; for (const w of A.who) { if (w.chip === false) continue; const b = document.createElement('button'); b.textContent = w.label; if (!S.seen[w.id]) b.className = 'new'; b.onclick = (e) => { e.stopPropagation(); talk(w); }; chips.appendChild(b); } }

  // ------------------------------------------------------------------ build / enter / exit
  async function build(key) {
    if (T.rooms[key]) return T.rooms[key];
    const R = ROOMS[key], sc = new THREE.Scene(), A = { key, scene: sc, who: [], anim: [], W: R.W || 8, D: R.D || 6 };
    sc.background = new THREE.Color('#24161f');
    const hemi = new THREE.HemisphereLight(R.light, '#5a3a3a', 1.35); sc.add(hemi);
    const k = new THREE.DirectionalLight(R.light, 2.0); k.position.set(3.5, 7, 6); k.target.position.set(0, 0.8, -0.5); sc.add(k, k.target);
    if (!LOW) { k.castShadow = true; k.shadow.mapSize.set(1024, 1024); const c = k.shadow.camera; const e = Math.max(6, (R.W || 8) / 2 + 1.5); c.left = c.bottom = -e; c.right = c.top = e; c.near = 1; c.far = 20; k.shadow.bias = -0.0008; k.shadow.normalBias = 0.03; }
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
    window.__town.lastEnter = { room: key, tris: A.tris, animating: 1 + A.anim.length + (A.extraRigs || 0), rigEvals: 1 + A.anim.length + (A.extraRigs ? 2 : 0) };
    A.onEnter?.();
  }
  async function exit() {
    if (T.busy || !T.active) return; T.busy = true; audio.ui?.('tick'); T.rooms[T.active]?.onExit?.();
    curtain.querySelector('b').textContent = 'MAIN STREET'; curtain.classList.add('shut'); await wait(560);
    if (T.lane) { T.lane.end(); T.lane = null; T.camera = roomCam; }
    if (T.tv) { T.tv.end(); T.tv = null; T.focus = null; T.goal = null; }
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
      at(g, FENCE.x, 0, FENCE.z, FENCE.ry ?? Math.PI); mainScene.add(g); crowSpot = { x: FENCE.x, z: FENCE.z, label: 'TALK TO CROW' };
      ctx.colliders?.push({ x: FENCE.x, z: FENCE.z, r: 0.8 });
      if (!DRIVEIN.hide) { const di = new THREE.Group(); const sc = ph('Eye-Max screen (outside, felt)', box(6.0, 3.2, 0.25, '#f6efe0', 0.06)); sc.position.y = 1.4; di.add(sc);   // the outdoor Eye-Max screen (south of the east road)
        for (const x of [-2.6, 2.6]) { const p = cyl(0.12, 0.14, 1.5, '#7a5a4a', 6); p.position.x = x; di.add(p); }
        const face = sunPic(5.6, 2.8, 'EYE-MAX · INTERMISSION', '#3a1f2a'); face.position.set(0, 3.0, -0.14); face.rotation.y = Math.PI; di.add(face);
        const mq = sign('EYE-MAX DRIVE-IN', 3.4, 0.5, '#2a1f2a', '#ff6fae', 0.7); mq.position.set(0, 4.85, -0.14); mq.rotation.y = Math.PI; di.add(mq);
        di.position.set(DRIVEIN.x, 0, DRIVEIN.z); if (DRIVEIN.ry != null) di.rotation.y = DRIVEIN.ry; if (DRIVEIN.scale) di.scale.setScalar(DRIVEIN.scale); mainScene.add(di); ctx.colliders?.push({ x: DRIVEIN.x - 2.6, z: DRIVEIN.z, r: 0.4 }, { x: DRIVEIN.x + 2.6, z: DRIVEIN.z, r: 0.4 }); }
      if (!TSC) { const hs = new THREE.Group(), HX = 3.0, HZ = 23.2;   // Bear's house: a felt 1990s ranch (beige siding, brown gable roof, burgundy door, green shutters, satellite dish, mailbox)
        const sid = box(5.2, 2.5, 3.6, '#e2d2b0', 0.05); hs.add(sid); for (let i = 1; i < 9; i++) { const l = box(5.24, 0.03, 3.64, '#cdbb96', 0.01); l.position.y = i * 0.27; hs.add(l); }
        const rs = new THREE.Shape([[-2.1, 0], [2.1, 0], [0, 1.2]].map(([x, y]) => new THREE.Vector2(x, y))); const rg = new THREE.ExtrudeGeometry(rs, { depth: 5.7, bevelEnabled: false }); rg.translate(0, 0, -2.85);
        const roof = new THREE.Mesh(rg, feltMat('#6a4a3a')); roof.rotation.y = Math.PI / 2; roof.position.y = 2.5; roof.castShadow = !LOW; hs.add(roof);
        const dr = box(0.95, 2.0, 0.1, '#7a2634', 0.04); dr.position.z = -1.82; hs.add(dr); const kn = cyl(0.04, 0.04, 0.06, '#c9a24a', 6); kn.rotation.x = Math.PI / 2; kn.position.set(0.32, 1.0, -1.9); hs.add(kn);
        const stp = box(1.6, 0.14, 0.7, '#b8a888', 0.03); stp.position.z = -2.1; hs.add(stp);
        for (const x of [-1.6, 1.6]) { const w = box(1.0, 0.85, 0.06, '#a8c8d8', 0.02); w.position.set(x, 1.05, -1.82); hs.add(w); const fr = box(1.1, 0.06, 0.08, '#f6efe0', 0.02); fr.position.set(x, 1.47, -1.83); hs.add(fr);
          for (const sx of [-0.62, 0.62]) { const sh = box(0.26, 0.95, 0.07, '#2f5a3e', 0.02); sh.position.set(x + sx, 1.0, -1.84); hs.add(sh); } }
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, 0.9), feltMat('#e8e4dc')); dish.material.side = THREE.DoubleSide; dish.rotation.x = -1.9; dish.position.set(1.9, 3.15, -0.6); hs.add(dish);
        const mb = new THREE.Group(); mb.add(cyl(0.04, 0.04, 1.0, '#6a4a3a', 6)); const mbx = box(0.24, 0.24, 0.45, '#2a3a5a', 0.1); mbx.position.y = 1.0; mb.add(mbx); const nm = sign('BEAR', 0.4, 0.12, '#f6efe0', '#2a3a5a', 0.7); nm.rotation.y = -Math.PI / 2; nm.position.set(-0.13, 1.12, 0); mb.add(nm);
        mb.position.set(-2.1, 0, -3.4); hs.add(mb);
        ph('Bear\'s house (felt 1990s ranch)', hs); hs.position.set(HX, 0, HZ); mainScene.add(hs); ctx.colliders?.push({ x: HX - 1.3, z: HZ, r: 1.9 }, { x: HX + 1.3, z: HZ, r: 1.9 }); }
      for (const d of DOORS) if (d.sign) { const sg = new THREE.Group(); const p = cyl(0.04, 0.04, 1.9, '#5a3a3a', 6); const b = sign(d.sign, 1.3, 0.34, '#fff3dc', '#3a1f2a'); b.position.y = 1.85; sg.add(p, b);
        const bk = b.clone(); bk.rotation.y = Math.PI; bk.position.z = -0.01; sg.add(bk);
        if (d.ry != null) { sg.position.set(d.x + Math.cos(d.ry) * 1.4, 0, d.z - Math.sin(d.ry) * 1.4); sg.rotation.y = d.ry; } else { sg.position.set(d.x + 1.0, 0, d.z); sg.lookAt(2, 0, 4); } mainScene.add(sg); }
    } catch (e) { console.warn('town: outside props failed', e); }
  }
  function talkOutside() {
    audio.ui?.('tick'); let L;
    if (S.adv === 4) L = diner().crow();
    else if (S.sock === 4 && S.hubcap) { step('sock', 5); S.hubcap = false; S.sock2 = true; save(); L = [['CROW', 'It\'s in the collection.'], ['CROW', 'One sock. Mustard. Undeliverable.'], ['', 'You trade the felt hubcap.'], ['CROW', 'A fine hubcap. Soft.'], ['', 'Got: one sock.']]; }
    else if (S.sock === 4) L = [['CROW', 'It\'s in the collection.'], ['CROW', 'Trades only. I collect hubcaps.'], ['WOLF', 'The car has boots.'], ['CROW', 'Then you have a problem.']];
    else L = [['CROW', 'Everything here is in the collection.'], ['CROW', 'Including you, if you stand there long enough.']];
    outLines = L.slice(); nextOut();
  }
  let outLines = [], outT = 0;
  function outSay(L) { outLines = L.slice(); nextOut(); }
  // run 13: generic outdoor walk-up spots {x, z, r, label (string|fn), act() -> lines, on()?}
  T.tick = []; const OUT = []; T.addSpot = (sp) => { OUT.push(sp); return sp; }; T.outSay = outSay; T.spots = OUT;
  const HZ = ctx.horse, wildNow = () => (window.__sunspots?.wild || 0) > 0.5;
  const STATUE = [[['PLAQUE', 'SUNSPOTS. SAME OLD ONE HORSE TOWN.'], ['PLAQUE', 'This was the town\'s only horse. It still is.']],
    [['PLAQUE', 'Erected 1951. Melted 1951.'], ['PLAQUE', 'Same afternoon.']],
    [['PLAQUE', 'The horse did nothing of note.'], ['PLAQUE', 'We felt it deserved a statue anyway. Nobody else was available.']],
    [['PLAQUE', 'Do not climb the horse.'], ['PLAQUE', 'The horse is soft. The ground is not.']],
    [['WOLF', 'Hi, horse.'], ['', 'The horse says nothing. It has said nothing since 1951.']]];
  const STATUE_W = [[['PLAQUE', 'ITS EYES ARE NORMAL.'], ['PLAQUE', 'STOP LOOKING AT ITS EYES.']], [['', 'The horse is looking at you. It has always been looking at you.'], ['WOLF', 'Same old horse.']],
    [['PLAQUE', 'SAME OLD ONE HORSE TOWN.'], ['PLAQUE', 'SAME OLD ONE HORSE. NEW EYES.']]];
  let statueN = 0;
  const STAT = TSC?.spots?.statue;
  if (STAT && HZ) T.addSpot({ id: 'statue', x: STAT.x, z: STAT.z, r: 3.2, label: () => T.statueLabel?.() || 'READ THE PLAQUE', act: () => T.statueAct?.() || (wildNow() ? STATUE_W[statueN++ % STATUE_W.length] : STATUE[statueN++ % STATUE.length]) });
  function nextOut() { const l = outLines.shift(); if (!l) { sub.classList.remove('on'); return; } try { l[2]?.(); } catch (e) { console.warn(e); } subName.textContent = l[0] ? l[0] + ' ' : ''; subText.textContent = l[1]; sub.classList.add('on'); outT = 1.4 + l[1].length * 0.045; }

  // ------------------------------------------------------------------ per-frame
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const roomCam = T.camera, VIEW = { x: 0 };
  function resize() { const c = roomCam, a = innerWidth / innerHeight, A = T.rooms[T.active], V = A?.view || {}, D = ROOMS[T.active]?.D || 6; c.aspect = a; c.fov = a < 1 ? 50 : 40;
    const halfW = a < 1 ? (V.pw || 3.6) : (V.lw || 4.6), halfH = V.h || 2.1; const tv = Math.tan(THREE.MathUtils.degToRad(c.fov / 2));
    const d = Math.max(halfH / tv, halfW / (tv * a)); VIEW.y = 1.55 + d * 0.16; VIEW.z = D / 2 + d * 0.98; VIEW.look = V.look ?? -0.3;
    VIEW.pan = V.pan ? Math.max(0, V.pan * (a < 1 ? 1 : 0.45)) : 0; VIEW.x = VIEW.pan ? THREE.MathUtils.clamp(A.wolf?.position.x || 0, -VIEW.pan, VIEW.pan) : 0; placeCam(); c.updateProjectionMatrix(); }
  function placeCam() { roomCam.position.set(VIEW.x, VIEW.y, VIEW.z); roomCam.lookAt(VIEW.x, 1.35, VIEW.look); }
  addEventListener('resize', () => T.active && !T.lane && resize());
  T.update = (dt, t) => {
    const A = T.rooms[T.active]; if (!A) return;
    if (T.lane) { T.lane.update(dt, t); if (lines.length || sub.classList.contains('on')) { lineT -= dt; if (lineT <= 0) nextLine(); } common(dt); return; }
    if (T.tv) { A.tick?.(dt, t); for (const o of A.proc || []) o.proc?.(t); T.tv.update(dt, t); if (lines.length || sub.classList.contains('on')) { lineT -= dt; if (lineT <= 0) nextLine(); } common(dt); return; }
    A.tick?.(dt, t);
    for (const o of A.anim) o.mixer?.update(dt);
    for (const o of A.proc || []) o.proc?.(t);
    // the Wolf walks over to whoever you talk to, then idles facing them
    const w = A.wolf, ac = w.acts;
    if (T.focus) { T.focus.o.getWorldPosition(tmp); tmp.y = 0; tmp2.copy(tmp).sub(A.wolfHome).setY(0); const L = tmp2.length(); T.goal = L > 1.4 ? A.wolfHome.clone().addScaledVector(tmp2.normalize(), L - 1.2) : A.wolfHome.clone();
      const bd = A.bounds || [-3.3, 3.3, -1.9, 2.4]; T.goal.x = THREE.MathUtils.clamp(T.goal.x, bd[0], bd[1]); T.goal.z = THREE.MathUtils.clamp(T.goal.z, bd[2], bd[3]); T.look = tmp.clone(); }
    let moving = false;
    if (T.goal) { tmp2.copy(T.goal).sub(w.position); tmp2.y = 0; const d = tmp2.length(); if (d > 0.05) { moving = true; const s = Math.min(d, dt * (A.speed || 1.6)); w.position.addScaledVector(tmp2.normalize(), s); const y = Math.atan2(tmp2.x, tmp2.z); w.rotation.y += Math.atan2(Math.sin(y - w.rotation.y), Math.cos(y - w.rotation.y)) * Math.min(1, dt * 8); } }
    if (!moving && T.look) { const y = Math.atan2(T.look.x - w.position.x, T.look.z - w.position.z); w.rotation.y += Math.atan2(Math.sin(y - w.rotation.y), Math.cos(y - w.rotation.y)) * Math.min(1, dt * 5); }
    if (ac) { const k = Math.min(1, dt * 6); ac.walk.setEffectiveWeight(THREE.MathUtils.lerp(ac.walk.getEffectiveWeight(), moving ? 1 : 0, k)); ac.idle.setEffectiveWeight(THREE.MathUtils.lerp(ac.idle.getEffectiveWeight(), moving ? 0 : 1, k)); if (!ac.walk.isRunning()) ac.walk.play(); w.mixer.update(dt); }
    if (lines.length || sub.classList.contains('on')) { lineT -= dt; if (lineT <= 0) nextLine(); }
    if (T.swoop) { const sw = T.swoop; sw.t += dt; const u = Math.min(1, sw.t / sw.dur), e = u * u * (3 - 2 * u); roomCam.position.lerpVectors(sw.p0, sw.p1, e); tmp.lerpVectors(sw.l0, sw.l1, e); roomCam.lookAt(tmp); roomCam.fov = THREE.MathUtils.lerp(sw.f0, 55, e); roomCam.updateProjectionMatrix(); }
    else if (VIEW.pan) { VIEW.x += (THREE.MathUtils.clamp(w.position.x, -VIEW.pan, VIEW.pan) - VIEW.x) * Math.min(1, dt * 2.5); placeCam(); }
    common(dt);
  };
  // ------------------------------------------------------------------ run 10: the Diner adventure (diner.js)
  let DN = null;
  function diner() { if (DN) return DN; DN = createDiner({ glb, at, box, cyl, sign, feltMat, audio, LOW, S, save, step, mainScene, wolfState, level, sub, say: (L) => say(L),
    clearChips: () => { chips.innerHTML = ''; }, refreshChips: () => T.active && chipsFor(T.rooms[T.active]) }); return DN; }
  // ------------------------------------------------------------------ run 8: the playable lane (bowling.js). Walk up -> swoop + LANE n title card -> behind-the-Wolf lane view
  let BW = null;
  function bowling() { if (BW) return BW;
    BW = createBowling({ renderer, feltMat, audio, LOW, say: (L) => say(L),
      onRoll: (r) => { const A = T.rooms.bowl;
        if (r.over) { A?.setLaneScore?.((g, w, h) => BW.drawCard(g, w, h, r.rolls, r.frames, -1)); S.bowled = (S.bowled || 0) + 1; save(); return null; }
        if (S.air === 4) { step('air', 5); return r.down === 0 ? [['RAM', 'Zero. That ties my high score.'], ['RAM', 'Ties go to the challenger. Two-dollar league prize.'], ['', 'Got: two dollars.']]
          : [['RAM', `${r.down}. That beats my high score.`], ['RAM', 'My high score is zero.'], ['RAM', 'Two-dollar league prize.'], ['', 'Got: two dollars.']]; }
        return null; },
      onLeave: async ({ mid }) => { const A = T.rooms.bowl; if (!A) return; T.busy = true; await BW.cover('Gutter Bowl', `LANE ${S.lane} · SHOES STILL ON`);
        BW.end(); T.lane = null; A.scene.add(A.wolf); const sp = new THREE.Vector3(BW.laneX || 0, 0, 2.15); A.wolf.position.copy(sp); A.wolf.rotation.y = 0.3; A.wolf.updateMatrixWorld(true);
        T.scene = A.scene; T.camera = roomCam; T.focus = null; T.goal = null; T.look = null; T.swoop = null; resize(); chipsFor(A); await wait(150); await BW.uncover(); T.busy = false;
        say(mid ? [['RAM', 'You left in the middle of a frame.'], ['RAM', 'Bold.']] : [['ROLLER SKATE (from the desk)', 'Shoes come back to the desk.'], ['ROLLER SKATE (from the desk)', 'Eventually.']]); } });
    return BW; }
  // ------------------------------------------------------------------ run 9: TV night in living90 (livingtv.js). Grab the remote -> cast sits on the couch -> first-person remote
  let LTV = null;
  function livingTV() { if (LTV) return LTV;
    LTV = createLivingTV({ renderer, feltMat, audio, LOW, say: (L) => say(L), glb, S, save, camera: roomCam,
      onLeave: () => { const A = T.rooms.living90; T.tv = null; T.focus = null; T.goal = null; T.look = null; if (A && T.active === 'living90') { resize(); chipsFor(A); say([['BEAR', 'Leave it on Channel 2 for the next guy.'], ['WOLF', 'There is no next guy.'], ['BEAR', 'There\'s always a next guy.']]); } } });
    return LTV; }
  function livingTVIdle(dt, t) { if (LTV && !T.tv) LTV.idle(dt, t); }
  async function startTV(A) {
    if (T.busy || T.tv || T.lane) return; T.busy = true; await wait(700); chips.innerHTML = ''; const L = livingTV(); T.focus = null; T.goal = null; T.look = null; T.tv = L; await L.begin(A); T.busy = false; }
  // run 11 (M4): the two minigames (minigames.js) plug in like the bowling lane: own scene + camera as T.lane, DONE button returns to the room
  let PG = null, HG = null;
  function poolGame() { if (PG) return PG;
    PG = createPool({ feltMat, audio, say: (L) => say(L), onLeave: () => leaveGame(),
      onDone: (r) => { const nb = !S.poolBest || r.shots < S.poolBest; if (nb) S.poolBest = r.shots; save();
        return nb ? [['FUZZY PEACH', `${r.shots} shots. That\'s the house best now.`], ['FUZZY PEACH', 'I\'ll put it on the chalkboard. In your handwriting.']] : [['FUZZY PEACH', `${r.shots}. House best is still ${S.poolBest}.`]]; } });
    return PG; }
  function hoopsGame() { if (HG) return HG;
    HG = createHoops({ feltMat, audio, say: (L) => say(L), onLeave: () => leaveGame(), onDone: (r) => { S.hoops = { w: r.wolf, l: r.larry }; save(); return null; } });
    return HG; }
  async function startGame(A, G) {
    if (T.busy || T.lane || T.active !== A.key) return; T.busy = true; chips.innerHTML = ''; curtain.querySelector('b').textContent = ROOMS[A.key].name; curtain.classList.add('shut'); await wait(560);
    T.focus = null; T.goal = null; G.begin(); T.lane = G; T.scene = G.scene; T.camera = G.camera; G.update?.(0, 0); renderer.compile(G.scene, G.camera); await wait(120); curtain.classList.remove('shut'); T.busy = false; }
  async function leaveGame() {
    const A = T.rooms[T.active]; if (!A) { T.lane = null; T.camera = roomCam; return; } T.busy = true; curtain.querySelector('b').textContent = ROOMS[A.key].name; curtain.classList.add('shut'); await wait(560);
    T.lane = null; T.scene = A.scene; T.camera = roomCam; T.focus = null; T.goal = null; T.look = null; resize(); chipsFor(A); await wait(120); curtain.classList.remove('shut'); T.busy = false; }
  Object.defineProperty(T, 'games', { get: () => ({ pool: PG && Object.assign(PG.test, { active: T.lane === PG }), hoops: HG && Object.assign(HG.test, { active: T.lane === HG }), start: (k) => { const A = T.rooms[T.active]; if (A) return startGame(A, k === 'pool' ? poolGame() : hoopsGame()); } }) });
  async function startLane(A) {
    if (T.busy || T.lane) return; T.busy = true; const B = bowling(), w = A.wolf; chips.innerHTML = '';
    const lx = w.position.x; B.laneX = lx; tmp.set(VIEW.x, 1.35, VIEW.look);
    T.swoop = { t: 0, dur: 0.75, p0: roomCam.position.clone(), l0: tmp.clone(), p1: new THREE.Vector3(lx + 0.15, 1.55, w.position.z + 2.0), l1: new THREE.Vector3(lx, 0.45, -3.6), f0: roomCam.fov };
    await wait(780); await B.cover('Lane ' + S.lane, 'GUTTER BOWL · SHOES ON · NO TAB');
    T.swoop = null; B.begin(w, S.lane); T.lane = B; T.scene = B.scene; T.camera = B.camera; await wait(260); await B.uncover(); T.busy = false; }
  let outT0 = 0;
  T.outside = (dt) => {   // called every town frame (walk mode): door prompts, the Crow, held clock, errand timers
    for (const f of T.tick) try { f(dt); } catch (e) { console.warn('tick', e); }   // run 13: chatter bubbles, mission watchers (walk + car)
    outT0 += dt; if (S.party) diner().outside(dt, outT0, !T.active && level?.mode === 'walk' && !document.body.classList.contains('scene'));   // run 10: the party follows the Wolf
    if (level?.mode === 'solo') { btn.style.display = 'none'; near = null; if (errands().length) { if (S.held == null) S.held = level.left; level.left = S.held; } else S.held = null; common(dt); return; }   // run 12: errands hold the clock in his own car too
    if (!level || level.mode !== 'walk' || level.frozen || document.body.classList.contains('scene')) { btn.style.display = 'none'; near = null; return; }
    const p = wolfState.pos; near = null; let best = 2.4; const riding = !!T.riding?.();   // run 14: on Bear's horse, only ride-aware spots
    if (!riding) for (const d of DOORS) { const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < best) { best = dd; near = d; } }
    if (crowSpot && !riding) { const dd = Math.hypot(p.x - crowSpot.x, p.z - crowSpot.z); if (dd < 2.6 && dd < best + 0.3) near = crowSpot; }
    for (const sp of OUT) { if ((sp.on && !sp.on()) || (riding && !sp.ride)) continue; const dd = Math.hypot(p.x - sp.x, p.z - sp.z); if (dd < (sp.r || 2.6) && dd < best + 0.3) { best = dd; near = sp; } }   // run 13: statue, chatter, mission spots
    if (near && near.act && typeof near.label === 'function') near._l = near.label();
    btn.style.display = near ? 'block' : 'none'; if (near) btn.textContent = near.room ? 'ENTER ' + ROOMS[near.room].name.replace('THE ', '') : (near._l || near.label);
    if (errands().length) { if (S.held == null) S.held = level.left; level.left = S.held; } else S.held = null;
    if (outLines.length || (!T.active && sub.classList.contains('on') && outT > 0)) { outT -= dt; if (outT <= 0) nextOut(); }
    common(dt);
  };
  function common(dt) {   // errand timer runs anywhere (rooms or town): Pocket Watch calls 99 at 1:59
    if (S.num === 5 && S.waitT > 0) { S.waitT -= dt; if (S.waitT <= 0) { step('num', 6); toast('POCKET WATCH (from somewhere): "Now serving 99." It\'s 1:59.', 4); T.rooms.dmv?.setNow?.(99); } }
  }
  T.stats = () => Object.fromEntries(Object.entries(T.rooms).map(([k, A]) => [k, { tris: A.tris, animating: 1 + A.anim.length + (A.extraRigs || 0), rigEvals: 1 + A.anim.length + (A.extraRigs ? 2 : 0) }]));
  Object.defineProperty(T, 'diner', { get: () => DN && Object.assign(DN.test, { S: { adv: S.adv, party: S.party, ord: S.ord }, D: DN }) });
  T.M = { OBJ, TITLE, DONE, DONE_MSG, TGT, S, MLIST, step, save, toast, hud, errands, outSay: (L) => outSay(L) };   // run 13: mission API for missions13.js
  T.state = S; T.enter = enter; T.exit = exit; T.talk = (id) => { const A = T.rooms[T.active]; talk(A?.who.find(w => w.id === id)); }; T.talkOutside = talkOutside;
  T.placeholders = () => [...placeholders]; Object.defineProperty(T, 'tvQA', { get: () => LTV && Object.assign(LTV.test, { active: !!T.tv, phase: LTV.phase }) }); Object.defineProperty(T, 'bowl', { get: () => BW && Object.assign(BW.test, { active: !!T.lane, last: BW.last, tris: BW.tris, B: BW }) }); T.next = () => { if (T.active) nextLine(); else nextOut(); };
  const _p = new THREE.Vector3(), _b = new THREE.Box3();
  renderer.domElement.addEventListener('pointerdown', (e) => {   // tap a character / prop in the room (or tap to advance the line)
    if (!T.active || T.busy || T.lane || T.tv) return; const A = T.rooms[T.active];
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
