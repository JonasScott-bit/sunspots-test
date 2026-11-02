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
};
// outside: which building is which (diner door is LAYOUT.spots.diner_door; the three adobes face the square)
const DOORS = [
  { room: 'diner', x: 1.5, z: -7.3, sign: null },
  { room: 'laundromat', x: 11.0, z: -10.6, sign: 'LAUNDROMAT' },
  { room: 'post', x: 16.3, z: -1.9, sign: 'POST OFFICE' },
  { room: 'dmv', x: -4.4, z: -15.8, sign: 'DMV' },
];
const FENCE = { x: -15, z: 10.8 }; // the Crow's roadside collection (fence-stool), south of the town street

export function createTown(ctx) {
  const { renderer, mainScene, load, normalize, feltMat, level, wolfState, audio = {} } = ctx;
  const LOW = sunspotsLowEnd();
  const T = { active: null, scene: null, camera: new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80), rooms: {}, busy: false };
  const S = { sock: 0, num: 0, hubcap: false, sock2: false, letter: false, ticket: 0, waitT: 0, coffee: 0, held: null, seen: {} };
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
      const [stove, bear, gecko, booth, chair] = await Promise.all([glb('town2/stove.glb', 1.6), glb('town2/bear_lo.glb', 1.85, 'bear', { clip: 'walk', t: 0.25, speed: 0 }),
        glb('town2/gecko_lo.glb', 1.05, 'gecko', { clip: 'walk', speed: 0.35 }), glb('town2/booth_prop.glb', 1.25, 'feltobj'), glb('town2/eye_chair.glb', 0.95)]);
      at(stove, -1.6, 0, -2.35, 0.25); G.add(stove);
      const chairs = [chair, chair.clone(true), chair.clone(true)]; chairs.forEach((c, i) => { at(c, -2.4 + i * 1.3, 0, 0.15, 0); G.add(c); });
      at(booth, 3.1, 0, -2.0, -Math.PI / 2); G.add(booth); at(bear, 2.6, 0, -0.6, -0.5); G.add(bear);
      gecko.rotation.x = Math.PI; at(gecko, 0, 3.1, -2.75); gecko.rotation.x = Math.PI; G.add(gecko);   // upside down, under the soffit
      const pieCase = ph('pie case', new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.35, roughness: 0.2 })));
      at(pieCase, 0.6, 1.31, -0.95); G.add(pieCase);
      const pie = ph('pie', cyl(0.2, 0.22, 0.09, '#d98a3a', 16)); at(pie, 0.6, 1.09, -0.95); G.add(pie);
      const cup = ph('coffee cup', cyl(0.07, 0.06, 0.12, '#fff3dc', 10)); at(cup, -1.1, 1.08, -0.65); G.add(cup);
      const coffee = cyl(0.062, 0.062, 0.005, '#3a1f12', 10); at(coffee, -1.1, 1.19, -0.65); G.add(coffee);
      const menu = ph('menu', sign('MENU\n1. The Menu', 0.34, 0.46, '#fff3dc', '#e0705a', 0.6)); at(menu, -2.3, 1.32, -0.75, 0.2); G.add(menu);
      const s1 = sign('THINK ABOUT SOUP', 2.4, 0.42, '#e0705a', '#fff3dc'); at(s1, -1.2, 2.45, -2.98); G.add(s1);
      const win = sign('OPEN', 0.9, 0.36, '#9fd6b8', '#24331f'); at(win, 2.4, 2.2, -2.98); G.add(win);
      A.wolfSpot = [-0.2, 1.6];
      A.anim = [gecko]; A.blink = chairs;
      A.tick = (dt, t) => { gecko.position.x = Math.sin(t * 0.18) * 2.4; gecko.rotation.y = Math.cos(t * 0.18) > 0 ? -Math.PI / 2 : Math.PI / 2;
        for (let i = 0; i < chairs.length; i++) { const p = ((t * 0.37 + i * 0.29) % 3.1); chairs[i].scale.y = p < 0.12 ? 0.86 : 1; } };
      A.who = [
        { id: 'stove', label: 'STOVE', o: stove, talk: () => S.coffee % 2 ? [['STOVE', 'Soup\'s on.'], ['WOLF', 'On what?'], ['STOVE', 'On.']] : [['STOVE', 'Think about soup.'], ['WOLF', 'I\'ll have the—'], ['STOVE', 'Think about it.']] },
        { id: 'coffee', label: 'COFFEE', o: cup, talk: () => { S.coffee++; return [['STOVE', 'Refill.'], ['', `Refill number ${S.coffee}. You haven't had any.`]]; } },
        { id: 'gecko', label: 'GECKO', o: gecko, talk: () => [['GECKO', 'I stuck to the ceiling.'], ['GECKO', '...'], ['GECKO', 'Nobody noticed.']] },
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
      const [mail, corded, bear] = await Promise.all([glb('town2/mailbox.glb', 1.35), glb('town2/corded_box.glb', 0.8), glb('town2/bear_lo.glb', 1.85, 'bear', { clip: 'walk', t: 0.25, speed: 0 })]);
      at(corded, -1.2, 1.1, -1.35, 0.1); G.add(corded); at(mail, 3.0, 0, 0.3, -0.6); G.add(mail);
      const scale = ph('parcel scale (floor)', box(0.9, 0.12, 0.8, '#b8b4a8', 0.04)); at(scale, 1.2, 0, 0.6); G.add(scale);
      const read = ph('scale readout', sign('2 BEARS', 0.5, 0.2, '#2a2a2a', '#9fd6b8', 0.6)); at(read, 1.2, 0.6, 1.05); const post = cyl(0.03, 0.03, 0.5, '#7a7a70', 6); at(post, 1.2, 0, 1.0); G.add(post, read);
      at(bear, 1.2, 0.12, 0.55, 0.3); G.add(bear);
      const stamp = ph('stamp machine', box(0.7, 1.5, 0.5, '#c9584a', 0.06)); at(stamp, -3.5, 0, 0.6, Math.PI / 2); G.add(stamp);
      const ss = sign('STAMPS', 0.5, 0.16, '#fff3dc', '#c9584a'); at(ss, -3.24, 1.2, 0.6, Math.PI / 2); G.add(ss);
      const parcels = ph('FRAGILE parcels', new THREE.Group()); [[0, 0, 0.6, '#c9a36a'], [0.1, 0.45, 0.45, '#d8b47a'], [-0.05, 0.8, 0.32, '#c08f5a']].forEach(([x, y, s, c]) => { const b = box(s, s * 0.75, s, c, 0.03); b.position.set(x, y, 0); parcels.add(b); });
      const fr = sign('FRAGILE', 0.5, 0.14, '#c9584a', '#fff3dc'); fr.position.set(0, 0.24, 0.31); parcels.add(fr); at(parcels, -2.6, 0, 1.0, 0.2); G.add(parcels);
      const s1 = sign('PLEASE TAKE A NUMBER\nThe numbers are at the DMV', 2.4, 0.55, '#fff3dc', '#5f6f3c', 0.5); at(s1, 1.8, 2.55, -2.97); G.add(s1);
      A.wolfSpot = [-0.4, 1.4]; A.anim = [mail, corded];
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
  };

  // ------------------------------------------------------------------ missions
  const OBJ = {
    sock: ['', 'Ask the Washing Machine (it only talks during spin)', 'Ask around about "East"', 'Look for the sock at the Post Office',
      'Find the Crow\'s collection by the road', 'Bring the sock back to the Laundromat', ''],
    num: ['', 'Take a number', 'Wait. Or try Window 1', 'Mail yourself a letter (Post Office)', 'Back to the DMV: vision test', 'Wait for 99', 'Go to Window 1', ''],
  };
  const TITLE = { sock: 'ODD SOCK OUT', num: 'TAKE A NUMBER' };
  const DONE = { sock: 6, num: 7 };
  function step(m, n) { S[m] = n; save(); if (n === 1) toast(TITLE[m] + ' — new errand'); if (n === DONE[m]) setTimeout(() => toast(TITLE[m] + ' — done' + (m === 'sock' ? '. Lost Socks board unlocked.' : '. Plate 11W.')), 600); hud(); }
  const errands = () => ['sock', 'num'].filter(m => S[m] > 0 && S[m] < DONE[m]);
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
    A.wolf.position.copy(A.wolfHome); A.wolf.rotation.y = -0.6; T.focus = null; T.goal = null; chipsFor(A); hud(); resize();
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
