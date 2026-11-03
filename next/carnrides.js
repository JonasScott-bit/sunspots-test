// carnrides.js — run 14b: the carnival you can actually use.
//   Tickets (the booth by the arch; STAY TILL DARK there too), every ride rideable (seat, orbit or gondola camera, GET OFF),
//   BUMP CITY you drive yourself, five midway games (POP-A-DART, BALLOON BLASTER — the felt balloon-animal Tommy gun, it only
//   pops balloons — RING-A-DING, TEST YOUR METTLE, WHACK-A-GOPHER), the PRIZE SHACK, and the SAVE HERON errand (piece C).
//   Games use a fixed third-person camera behind the Wolf. Never first person. Tap the targets (or Space at the middle).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color(), _e = new THREE.Euler();
const RIDE_CFG = {   // seat: an empty seat in carnival.js; ry: turn the Wolf in it; dur: seconds of ride
  bustler: { seat: 1, ry: 0, dur: 24, pose: 'sit' }, wheel: { seat: 2, ry: Math.PI / 2, dur: 34, pose: 'sit' }, twirl: { seat: 1, ry: 0, dur: 24, pose: 'sit' },
  rhumba: { seat: 1, ry: 0, dur: 24, pose: 'sit' }, carousel: { seat: 0, ry: 0, dur: 28, pose: 'straddle', rad: 13 }, cups: { seat: 0, ry: 0, dur: 24, pose: 'sit', rad: 12.5 }, bump: { seat: 0, ry: 0, dur: 45, pose: 'sit', up: 0.32 },
};
const POSES = { sit: { hip: -1.45, out: 0.14, knee: 1.55, arm: 0.6, fore: -0.4, drop: 1.0 }, straddle: { hip: -1.25, out: 0.42, knee: 1.35, arm: 0.9, fore: -0.5, drop: 1.0 } };
const PLUSH = ['a felt cactus', 'a tiny felt Gravy', 'a felt crow', 'a felt moon', 'a felt corn dog', 'a felt cassette', 'a felt flamingo', 'a felt eyeball'];
const COST = { ride: 2, game: 2, shack: 10 };

export function installCarnRides({ CARN, T, TS, level, wolfState, scene, camera, feltMat, audio, fpOff, onSeat, isBusyElse }) {
  const C = CARN; if (!C) return null;
  const CR = { tix: 0, prizes: [], ride: null, seatM: null, pose: null, bump: false, game: null, rideT: 0, frozenStand: false };
  const VC = feltMat('#ffffff', { vertexColors: true });
  try { Object.assign(CR, JSON.parse(localStorage.getItem('ss_carn') || '{}')); } catch (e) { }
  if (new URLSearchParams(location.search).has('fresh')) { CR.tix = 0; CR.prizes = []; }
  { const q = new URLSearchParams(location.search).get('tix'); if (q) CR.tix = +q; }
  const save = () => { try { localStorage.setItem('ss_carn', JSON.stringify({ tix: CR.tix, prizes: CR.prizes })); } catch (e) { } };
  const toast = (m, s = 2.6) => level.toast?.(m, s);
  const say = (L) => T.outSay?.(L);
  Object.defineProperty(CR, 'busy', { get: () => !!(CR.ride || CR.game) });
  Object.defineProperty(CR, 'frozen', { get: () => !!((CR.ride && !CR.bump) || CR.game) });

  // ---- little synth sfx (pop, bonk, ding, honk) on the sfx bus
  function sfx(kind) { const ctx = audio?.ctx, bus = audio?.BUS?.sfx; if (!ctx || !bus || ctx.state !== 'running') return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(bus);
    if (kind === 'pop') { o.type = 'square'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.start(t); o.stop(t + 0.12); }
    else if (kind === 'pap') { o.type = 'triangle'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.06); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.start(t); o.stop(t + 0.08); }
    else if (kind === 'bonk') { o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.18); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.start(t); o.stop(t + 0.24); }
    else if (kind === 'ding') { o.type = 'sine'; o.frequency.setValueAtTime(1320, t); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4); o.start(t); o.stop(t + 1.5); }
    else if (kind === 'honk') { o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); g.gain.setValueAtTime(0.12, t); g.gain.setValueAtTime(0.12, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32); o.start(t); o.stop(t + 0.34); }
    else { o.type = 'sine'; o.frequency.setValueAtTime(660, t); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.start(t); o.stop(t + 0.16); } }
  CR.sfx = sfx;

  // ---- felt parts helper (vertex colours, merged)
  function part(list, geo, col, m) { geo = geo.index ? geo.toNonIndexed() : geo; if (m) geo.applyMatrix4(m); const n = geo.attributes.position.count, a = new Float32Array(n * 3); _c.set(col); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (geo.attributes.uv) geo.deleteAttribute('uv'); list.push(geo); }
  const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const mesh = (list, mat = VC) => { const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.castShadow = true; return m; };
  CR.tris = 0; const count = (o) => o.traverse(x => { if (x.isMesh) CR.tris += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3 * (x.isInstancedMesh ? x.count : 1); });

  // ---- HUD: ticket chip, GET OFF button, the game overlay
  const st = document.createElement('style');
  st.textContent = `#ctix{display:none;position:fixed;left:calc(env(safe-area-inset-left) + 14px);bottom:calc(env(safe-area-inset-bottom) + 254px);padding:7px 11px;border-radius:12px;background:#f4f1ea;color:#2b1e3c;font:800 12px/1 system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 3px 0 #c9b9a0;z-index:30;pointer-events:none}
body.atfair #ctix,body.ingame #ctix{display:block}
#bGetOff{display:none;position:fixed;left:calc(env(safe-area-inset-left) + 16px);bottom:calc(env(safe-area-inset-bottom) + 202px);width:112px;height:42px;border-radius:14px;border:0;font:800 12px/1 system-ui,sans-serif;letter-spacing:.14em;background:#e8806a;color:#fff;box-shadow:0 4px 0 #a5483c;z-index:31}
body.onride #bGetOff{display:block} body.onride.scene #bGetOff{display:none} #bGetOff:active{transform:translateY(3px);box-shadow:0 1px 0 #a5483c}
body.onride #joy,body.onride #joyBase,body.ingame #joy,body.ingame #joyBase{opacity:.0;pointer-events:none} body.onride.bumping #joy,body.onride.bumping #joyBase{opacity:1;pointer-events:auto}
#cgame{display:none;position:fixed;inset:0;z-index:40;touch-action:none;user-select:none;-webkit-user-select:none}
body.ingame #cgame{display:block}
#cgame .top{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 12px);padding:9px 16px;border-radius:14px;background:#f4f1ea;color:#2b1e3c;font:800 14px/1.25 system-ui,sans-serif;letter-spacing:.06em;text-align:center;box-shadow:0 4px 0 #c9b9a0;white-space:nowrap}
#cgame .top small{display:block;font-weight:600;font-size:11px;letter-spacing:.04em;opacity:.75}
#cgame .ret{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #2b1e3c;display:none;pointer-events:none}
#cgame .meter{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 92px);width:min(70vw,320px);height:20px;border-radius:10px;background:#2b1e3c;display:none;overflow:hidden}
#cgame .meter i{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,#7fb36a,#e8c95a,#e8806a)} #cgame .meter b{position:absolute;top:-3px;bottom:-3px;width:5px;background:#fff;border-radius:3px}
#cgame .meter u{position:absolute;top:0;bottom:0;background:rgba(127,179,106,.55)}
#cgame button{position:absolute;bottom:calc(env(safe-area-inset-bottom) + 24px);height:50px;border-radius:16px;border:0;font:800 14px/1 system-ui,sans-serif;letter-spacing:.14em;color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.3)}
#cgame .act{left:50%;transform:translateX(-50%);width:160px;background:#4a7fc1;display:none} #cgame .quit{right:calc(env(safe-area-inset-right) + 14px);width:96px;background:#8a7a6a}
#cgame .fly{position:absolute;font:900 22px/1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 0 #2b1e3c;pointer-events:none;transition:transform .7s ease-out,opacity .7s;white-space:nowrap}`;
  document.head.appendChild(st);
  const chip = document.createElement('div'); chip.id = 'ctix'; document.body.appendChild(chip);
  const off = document.createElement('button'); off.id = 'bGetOff'; off.className = 'dbtn'; off.textContent = 'GET OFF'; document.body.appendChild(off);
  off.addEventListener('pointerdown', (e) => e.stopPropagation()); off.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); CR.getOff(); });
  const ov = document.createElement('div'); ov.id = 'cgame'; ov.innerHTML = '<div class="top"></div><div class="ret"></div><div class="meter"><u></u><i></i><b></b></div><button class="act">THROW</button><button class="quit">QUIT</button>'; document.body.appendChild(ov);
  const ovTop = ov.querySelector('.top'), ovRet = ov.querySelector('.ret'), ovMeter = ov.querySelector('.meter'), ovFill = ovMeter.querySelector('i'), ovMark = ovMeter.querySelector('b'), ovZone = ovMeter.querySelector('u'), ovAct = ov.querySelector('.act'), ovQuit = ov.querySelector('.quit');
  const syncChip = () => { chip.textContent = '🎟 ' + CR.tix + (CR.prizes.length ? '  ·  PRIZES ' + CR.prizes.length : ''); };
  syncChip();
  const addTix = (n) => { CR.tix = Math.max(0, CR.tix + n); save(); syncChip(); };
  const flyText = (txt, x, y) => { const d = document.createElement('div'); d.className = 'fly'; d.textContent = txt; d.style.left = (x - 20) + 'px'; d.style.top = (y - 20) + 'px'; ov.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'translateY(-60px)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 800); };
  const givePrize = (name) => { CR.prizes.push(name); save(); syncChip(); };
  CR.addTix = addTix; CR.givePrize = givePrize;

  // ---- pop puffs (pooled felt discs that grow and fade)
  const puffMat = new THREE.MeshBasicMaterial({ color: '#fff7ea', transparent: true, depthWrite: false });
  const puffs = []; const puffGeo = new THREE.IcosahedronGeometry(0.22, 0);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(puffGeo, puffMat.clone()); m.visible = false; scene.add(m); puffs.push({ m, t: 9 }); }
  const puff = (p, col = '#fff7ea') => { const P = puffs.find(x => x.t > 0.5) || puffs[0]; P.t = 0; P.m.position.copy(p); P.m.material.color.set(col); P.m.visible = true; };

  // ---- ticket booth + STAY TILL DARK
  const TK = C.ticket || { x: 80, z: 46 };
  TS.spots.c_tickets = { x: TK.x, z: TK.z };
  T.addSpot({ id: 'c_tix', x: TK.x - 0.5, z: TK.z, r: 1.9, label: 'GET TICKETS',
    act: () => { const first = !CR.gotAny; CR.gotAny = true; addTix(12); sfx('tick'); return [['TICKET BOOTH', first ? 'Twelve tickets. Free today. Don\'t ask why.' : 'Twelve more. We print them out back.'], ['', 'Rides 2, games 2. Win tickets back at the games. Ten get a prize at the Prize Shack.']]; } });
  T.addSpot({ id: 'c_dark', x: TK.x + 2.6, z: TK.z + 0.6, r: 1.6, label: () => C.nightT > 0.5 ? 'CALL IT A NIGHT' : 'STAY TILL DARK',
    act: () => { const on = !(C.nightT > 0.5); C.setNight?.(on); return on ? [['TICKET BOOTH', 'Staying till dark. The bulbs come on. The rides get braver.']] : [['TICKET BOOTH', 'Lights down. The sun comes back like nothing happened.']]; } });

  // ================================================================= RIDES
  const pay = (n, what) => { if (CR.tix >= n) { addTix(-n); return true; } toast('Need ' + n + ' tickets for ' + what + '. The ticket booth is by the arch.', 3.2); return false; };
  let orbitA = 0;
  CR.board = (key, free) => {
    const R = C.rides[key], cfg = RIDE_CFG[key]; if (!R || !cfg || CR.busy || isBusyElse?.()) return null;
    if (CR.canBoard && !CR.canBoard(key)) return CR.blocked?.(key) || null;
    if (!free && !pay(COST.ride, R.name)) return null;
    CR.ride = key; CR.rideT = 0; R.held = true; R.want = 1; fpOff?.();
    if (key === 'wheel') { const N = R.pods.length; R.phase = -Math.PI / 2 - cfg.seat * Math.PI * 2 / N; R.wheel.rotation.z = R.phase; }
    if (key === 'bump') { const car = R.cars[0]; car.player = true; R.root.updateMatrixWorld(true); car.g.getWorldPosition(_v); wolfState.pos.set(_v.x, 0, _v.z); wolfState.yaw = 0; wolfState.speed = 0; CR.bump = true; document.body.classList.add('bumping'); }
    orbitA = Math.atan2(R.board.x - R.x, R.board.z - R.z) + 0.5; CR.pose = POSES[cfg.pose]; CR.seatM = new THREE.Matrix4(); seatMatrix(); onSeat?.();
    document.body.classList.add('onride'); sfx('tick'); audio?.ui?.('confirm');
    const line = { bustler: 'Keep your paws inside the felt.', wheel: 'It goes round. That\'s the whole ride. Enjoy.', twirl: 'Hold on to your lunch. Or don\'t, it\'s yours.', rhumba: 'Spins one way, then the other way. Like a dance. Like a bad dance.',
      carousel: 'Twelve horses. It\'s the same horse. Pick one.', cups: 'Spin the wheel in the middle if you want to regret it.', bump: 'Steer with the stick. Bump everybody. It\'s legal in here.' }[key];
    CR.onBoard?.(key); return [['RIDE OPERATOR', line]];
  };
  function seatMatrix() { const R = C.rides[CR.ride], cfg = RIDE_CFG[CR.ride]; R.root.updateMatrixWorld(true); const s = R.seats[cfg.seat]; s.updateMatrixWorld(true); CR.seatM.copy(s.matrixWorld).multiply(_m.makeRotationY(cfg.ry)); if (cfg.up) CR.seatM.elements[13] += cfg.up; }
  function unboard() { const key = CR.ride, R = C.rides[key]; if (!R) return; R.held = false; R.want = 0; R.cycle = 20; CR.ride = null; CR.seatM = null; CR.pose = null;
    if (key === 'bump') { const car = R.cars[0]; car.player = false; car.vx = (Math.random() - 0.5) * 3; car.vz = (Math.random() - 0.5) * 3; CR.bump = false; document.body.classList.remove('bumping'); }
    wolfState.pos.set(R.board.x, 0, R.board.z); wolfState.speed = 0; wolfState.yaw = Math.atan2(R.board.x - R.x, R.board.z - R.z); document.body.classList.remove('onride'); CR.onUnboard?.(key); }
  CR.getOff = () => { if (!CR.ride) return; const R = C.rides[CR.ride]; if (CR.holdOn?.()) { toast('Not yet. You\'re up here for a reason.', 2); return; }
    if (CR.ride === 'bump' || R.speed < 0.12) { unboard(); return; } if (R.want) { R.want = 0; CR.stopping = true; toast('The operator pulls the lever. Slowly.', 2); } };
  // walk-up spots for every ride
  for (const [key, R] of Object.entries(C.rides)) {
    if (!R.board || !RIDE_CFG[key]) continue; const id = 'c_ride_' + key; TS.spots[id] = { x: R.board.x, z: R.board.z };
    T.addSpot({ id, x: R.board.x, z: R.board.z, r: 2.3, label: () => CR.label?.(key) || ('RIDE ' + R.name.replace(/^THE /, '')), act: () => CR.act?.(key) || CR.board(key) });
  }

  // ================================================================= GAMES
  const games = {};
  const B = C.booths;
  const G = new THREE.Group(); G.name = 'carnival games'; (C.near || scene).add(G);
  const bw = (k, x, y, z, out = new THREE.Vector3()) => { const g = B[k].g; g.updateMatrixWorld(true); return out.set(x, y, z).applyMatrix4(g.matrixWorld); };
  const balloonGeo = (() => { const L = []; part(L, new THREE.SphereGeometry(0.2, 7, 5), '#ffffff', M4(0, 0, 0, 0, 0, 0, 1, 1.18, 1)); part(L, new THREE.ConeGeometry(0.05, 0.08, 4), '#ffffff', M4(0, -0.25, 0, Math.PI)); return mergeGeometries(L, false); })();
  const BCOL = ['#e8806a', '#f2c94c', '#6fb7c9', '#e8a0c0', '#9fd3a0', '#b9a3d6', '#f4f1ea'];
  function balloonSet(n) { const im = new THREE.InstancedMesh(balloonGeo, VC, n); im.castShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < n; i++) im.setColorAt(i, _c.set(BCOL[i % BCOL.length])); G.add(im); return im; }
  const setInst = (im, i, p, s = 1) => { im.setMatrixAt(i, _m.compose(p, _q.identity(), _s.setScalar(s))); };

  // darts: 15 balloons on the cork board
  { const im = balloonSet(15), pts = []; for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) pts.push(bw('darts', -1.8 + i * 0.9, 1.5 + r * 0.6, -1.16));
    pts.forEach((p, i) => setInst(im, i, p)); im.instanceMatrix.needsUpdate = true; games.darts = { im, pts, up: pts.map(() => true) }; }
  // gallery: two moving rows of balloon animals (well, balloons)
  { const im = balloonSet(14); games.gallery = { im, rows: [[], []] }; for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) games.gallery.rows[r].push({ u: i / 7, up: true, t: 0 }); }
  // rings: bottle tops (same formula as carnival.js), a pool of thrown rings
  { const tops = []; for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) for (let j = 0; j < 3; j++) tops.push(bw('rings', -1.6 + j * 1.6 + (i - (3 - r) / 2) * 0.32, 1.15 + r * 0.34 + 0.17, -0.6 + r * 0.05));
    const rg = new THREE.TorusGeometry(0.13, 0.03, 5, 14); rg.rotateX(Math.PI / 2); const im = new THREE.InstancedMesh(rg, feltMat('#e8806a'), 9); im.count = 0; G.add(im); games.rings = { tops, im, landed: [] }; }
  // striker: the puck on the tower
  { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), feltMat('#e8806a')); p.position.set(C.striker.x, 0.4, C.striker.z); G.add(p);
    const sideZ = B.striker.side; const mallet = []; part(mallet, new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), '#c9a26e', M4(0, 0.5, 0)); part(mallet, new THREE.CylinderGeometry(0.16, 0.16, 0.45, 10), '#8a5a3c', M4(0, 1.0, 0, 0, 0, Math.PI / 2));
    const ml = mesh(mallet); ml.visible = false; G.add(ml); games.striker = { puck: p, mallet: ml, y: 0.4, side: sideZ }; }
  // moles: five felt gophers in the table
  { const L = []; part(L, new THREE.CapsuleGeometry(0.17, 0.3, 2, 7), '#9a7a58', M4(0, 0.25, 0)); part(L, new THREE.SphereGeometry(0.045, 4, 3), '#2b1e3c', M4(-0.07, 0.48, 0.15)); part(L, new THREE.SphereGeometry(0.045, 4, 3), '#2b1e3c', M4(0.07, 0.48, 0.15));
    part(L, new THREE.SphereGeometry(0.06, 5, 3), '#e8a0c0', M4(0, 0.41, 0.18)); part(L, new THREE.BoxGeometry(0.1, 0.07, 0.03), '#f4f1ea', M4(0, 0.33, 0.17));
    const g = mergeGeometries(L, false); const im = new THREE.InstancedMesh(g, VC, 5); im.castShadow = true; G.add(im); const holes = []; for (let i = 0; i < 5; i++) holes.push(bw('moles', -1.6 + i * 0.8, 0.62, 0.3));
    games.moles = { im, holes, h: holes.map(() => 0), want: holes.map(() => 0), t: holes.map(() => 0) }; const ry = B.moles.g.rotation.y;
    games.moles.place = () => { holes.forEach((p, i) => { _v.copy(p); _v.y += games.moles.h[i] * 0.48; im.setMatrixAt(i, _m.compose(_v, _q.setFromEuler(_e.set(0, ry, 0)), _s.setScalar(1))); }); im.instanceMatrix.needsUpdate = true; }; games.moles.place(); }
  // the balloon-animal Tommy gun (felt, twisted balloon segments, a drum magazine; it shoots balloon pellets, it only pops balloons)
  const tommy = (() => { const L = [], seg = (x, y, z, sx, col) => part(L, new THREE.SphereGeometry(0.075, 6, 4), col, M4(x, y, z, 0, 0, 0, 1, 1, sx));
    for (let i = 0; i < 5; i++) seg(0, 0, 0.16 + i * 0.13, 1.0, '#e8a0c0');                          // barrel (pink, five twists)
    seg(0, 0, -0.02, 1.4, '#6fb7c9'); seg(0, -0.02, -0.22, 1.5, '#6fb7c9'); seg(0, -0.06, -0.42, 1.4, '#6fb7c9');   // body + stock (teal)
    part(L, new THREE.TorusGeometry(0.11, 0.06, 4, 9), '#f2c94c', M4(0, -0.17, 0.12, 0, Math.PI / 2, 0));      // drum magazine (yellow)
    seg(0, -0.15, -0.1, 1.0, '#9fd3a0'); seg(0, -0.15, 0.36, 1.0, '#9fd3a0');                                // grips
    part(L, new THREE.SphereGeometry(0.03, 6, 4), '#e8806a', M4(0, 0, 0.82));                                   // the knot at the muzzle
    const m = mesh(L); m.visible = false; m.scale.setScalar(1.7); scene.add(m); return m; })();
  const pellet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), feltMat('#e8a0c0')); pellet.visible = false; scene.add(pellet); let pelT = 9; const pelA = new THREE.Vector3(), pelB = new THREE.Vector3();
  const dart = (() => { const L = []; part(L, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), '#c9c4bb', M4(0, 0, 0, Math.PI / 2)); part(L, new THREE.ConeGeometry(0.06, 0.12, 4), '#e8806a', M4(0, 0, -0.17, -Math.PI / 2)); const m = mesh(L); m.visible = false; scene.add(m); return m; })();
  count(G); count(tommy); count(dart);

  const GAME_INFO = {
    darts: { title: 'POP-A-DART', help: '3 darts · tap a balloon', act: null }, gallery: { title: 'BALLOON BLASTER', help: '20 s · tap balloons · 8 pops wins the plush fish', act: null },
    rings: { title: 'RING-A-DING', help: '3 rings · tap TOSS when the needle is green', act: 'TOSS' }, striker: { title: 'TEST YOUR METTLE', help: '3 swings · tap SWING at full power', act: 'SWING' },
    moles: { title: 'WHACK-A-GOPHER', help: '15 s · tap a gopher', act: null },
  };
  // wolf stand + camera for each booth (local coords)
  const STAND = { darts: [0, 3.0], gallery: [0.35, 3.0], rings: [0, 3.0], moles: [0, 2.7], striker: [1.0, 3.3] };
  CR.startGame = (key) => {
    if (CR.busy || isBusyElse?.() || !GAME_INFO[key]) return null; if (!pay(COST.game, GAME_INFO[key].title)) return null;
    const b = B[key], [sx, sz] = STAND[key]; bw(key, sx, 0, sz, _v); wolfState.pos.set(_v.x, 0, _v.z); wolfState.speed = 0;
    bw(key, 0, 0, -1, _v2); wolfState.yaw = key === 'striker' ? Math.atan2(C.striker.x - _v.x, C.striker.z - _v.z) : Math.atan2(_v2.x - _v.x, _v2.z - _v.z); fpOff?.();
    const cam = key === 'striker' ? bw(key, 3.6, 3.0, 7.6, new THREE.Vector3()) : bw(key, 0.9, 2.55, 6.4, new THREE.Vector3()), look = key === 'striker' ? new THREE.Vector3(C.striker.x, 2.9, C.striker.z) : bw(key, 0, 1.85, -0.9, new THREE.Vector3());
    const g = CR.game = { key, t: 0, score: 0, shots: key === 'darts' || key === 'rings' || key === 'striker' ? 3 : Infinity, dur: key === 'gallery' ? 20 : key === 'moles' ? 15 : 0, cam, look, done: false, meter: 0, best: 0, anim: 0 };
    if (key === 'darts') { games.darts.up.fill(true); games.darts.pts.forEach((p, i) => setInst(games.darts.im, i, p)); games.darts.im.instanceMatrix.needsUpdate = true; }
    if (key === 'gallery') { for (const row of games.gallery.rows) for (const b2 of row) { b2.up = true; b2.t = 0; } tommy.visible = true; }
    if (key === 'rings') { games.rings.landed.length = 0; games.rings.im.count = 0; }
    if (key === 'striker') games.striker.mallet.visible = true;
    if (key === 'moles') { games.moles.h.fill(0); games.moles.want.fill(0); games.moles.t.fill(0); g.next = 0.6; }
    document.body.classList.add('ingame'); ovAct.style.display = GAME_INFO[key].act ? 'block' : 'none'; ovAct.textContent = GAME_INFO[key].act || ''; ovMeter.style.display = GAME_INFO[key].act ? 'block' : 'none';
    ovRet.style.display = key === 'gallery' || key === 'darts' ? 'block' : 'none'; if (key === 'rings') { ovZone.style.left = '38%'; ovZone.style.width = '24%'; } else { ovZone.style.left = '88%'; ovZone.style.width = '12%'; }
    hudGame(); sfx('tick'); audio?.ui?.('confirm'); CR.onGame?.(key, 'start'); return [['BOOTH', { darts: 'Three darts. Pop three, win a prize. Pop none, win my respect.', gallery: 'Balloon Blaster. It\'s a balloon. It shoots balloons. Eight pops gets you the big felt fish.', rings: 'Ring a bottle. The bottles are wider than they look. That\'s the trick. There\'s no trick.', striker: 'Ring the bell. The bell has been rung twice. Once by a bear.', moles: 'They\'re gophers. Don\'t call them moles. They hate that.' }[key]]];
  };
  function hudGame() { const g = CR.game; if (!g) return; const info = GAME_INFO[g.key]; let s = info.title + '  ·  ';
    if (g.key === 'gallery' || g.key === 'moles') s += 'POPS ' + g.score + '  ·  ' + Math.max(0, Math.ceil(g.dur - g.t)) + 's'; else if (g.key === 'striker') s += 'BEST ' + Math.round(g.best * 100) + '  ·  SWINGS ' + g.shots; else s += 'HITS ' + g.score + '  ·  LEFT ' + g.shots;
    ovTop.innerHTML = s + '<small>' + info.help + '</small>'; }
  function endGame(quit) { const g = CR.game; if (!g) return; CR.game = null; document.body.classList.remove('ingame'); tommy.visible = false; games.striker.mallet.visible = false; dart.visible = false; pellet.visible = false;
    if (g.key === 'moles') { games.moles.h.fill(0); games.moles.place(); }
    if (quit) { CR.onGame?.(g.key, 'quit', g); return; }
    let won = 0, prize = null, lines;
    if (g.key === 'darts') { won = g.score; if (g.score >= 3) prize = PLUSH[(CR.prizes.length + 2) % PLUSH.length]; lines = g.score >= 3 ? 'Three for three. Pick a plush. Not that one. That one.' : g.score ? 'Some pops. Some tickets.' : 'The balloons thank you for your service.'; }
    if (g.key === 'gallery') { won = Math.floor(g.score / 2); if (g.score >= 8) prize = 'the big felt fish'; lines = g.score >= 8 ? 'Eight! The big felt fish is yours. It\'s not a real fish. Don\'t tell it.' : 'Not eight. ' + g.score + '. That\'s fewer than eight.'; }
    if (g.key === 'rings') { won = g.score * 3; if (g.score >= 2) prize = PLUSH[(CR.prizes.length + 5) % PLUSH.length]; lines = g.score ? 'Ringer! The bottle\'s embarrassed.' : 'Bounced. They all bounce. That\'s physics.'; }
    if (g.key === 'striker') { won = Math.round(g.best * 5); if (g.best >= 0.93) prize = PLUSH[(CR.prizes.length + 1) % PLUSH.length]; lines = g.best >= 0.93 ? 'DING. Third time ever. The bear will hear about this.' : 'Strong. Medium strong. ' + Math.round(g.best * 100) + ' out of a hundred.'; }
    if (g.key === 'moles') { won = Math.ceil(g.score / 2); if (g.score >= 10) prize = PLUSH[(CR.prizes.length + 3) % PLUSH.length]; lines = g.score >= 10 ? 'The gophers have unionised. Here\'s a prize.' : g.score + ' bonks. The gophers will remember.'; }
    if (won) addTix(won); if (prize) givePrize(prize); g.won = won; g.prize = prize;
    CR.onGame?.(g.key, 'end', g);
    const out = [['BOOTH', lines], ['', (won ? '+' + won + ' tickets' : 'No tickets') + (prize ? ' · you win ' + prize : '') + '.']];
    if (g.extra) out.push(...g.extra); say(out); }
  ovQuit.addEventListener('pointerdown', (e) => { e.stopPropagation(); }); ovQuit.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); endGame(true); });
  ovAct.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); action(); });
  ov.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(e.clientX, e.clientY); });
  addEventListener('keydown', (e) => { if (!CR.game || e.repeat) return; if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (GAME_INFO[CR.game.key].act) action(); else tap(innerWidth / 2, innerHeight / 2); } if (e.code === 'Escape') endGame(true); }, true);
  // screen projection of targets
  const toScr = (p, out = {}) => { _v.copy(p).project(camera); out.x = (_v.x + 1) / 2 * innerWidth; out.y = (1 - _v.y) / 2 * innerHeight; out.ok = _v.z < 1; return out; };
  const radPx = (p, r) => { const a = toScr(p, {}); _v2.copy(p); _v2.y += r; const b = toScr(_v2, {}); return Math.max(26, Math.hypot(a.x - b.x, a.y - b.y) * 1.5 + 12); };
  function targets() { const g = CR.game; if (!g) return []; const L = [];
    if (g.key === 'darts') games.darts.pts.forEach((p, i) => { if (games.darts.up[i]) L.push({ i, p }); });
    if (g.key === 'gallery') games.gallery.rows.forEach((row, r) => row.forEach((b2, i) => { if (b2.up) L.push({ i: r * 7 + i, p: galleryPos(r, b2.u, new THREE.Vector3()) }); }));
    if (g.key === 'moles') games.moles.holes.forEach((p, i) => { if (games.moles.h[i] > 0.5) L.push({ i, p: _v2.copy(p).setY(p.y + 0.6).clone() }); });
    return L; }
  CR.targets = () => targets().map(o => ({ i: o.i, ...toScr(o.p, {}) }));
  function tap(x, y) { const g = CR.game; if (!g || g.done) return; if (GAME_INFO[g.key].act) { action(); return; }
    let best = null, bd = 1e9; for (const o of targets()) { const s = toScr(o.p, {}); const d = Math.hypot(s.x - x, s.y - y); if (d < radPx(o.p, 0.24) && d < bd) { bd = d; best = o; } }
    if (g.key === 'darts') { if (g.shots <= 0 || g.anim > 0) return; g.shots--; throwTo(best ? best.p : aimPoint(x, y, -1.16), best); }
    else if (g.key === 'gallery') { shoot(best ? best.p : aimPoint(x, y, -1.15), best); }
    else if (g.key === 'moles') { if (best) { games.moles.h[best.i] = 0; games.moles.want[best.i] = 0; g.score++; sfx('bonk'); const s = toScr(best.p, {}); flyText('BONK', s.x, s.y); } else sfx('pap'); }
    hudGame(); }
  CR.tapTarget = (i) => { const o = targets().find(t => t.i === i) || targets()[0]; if (!o) return false; const s = toScr(o.p, {}); tap(s.x, s.y); return true; };
  CR.tapMiss = () => tap(6, innerHeight - 6);
  const _ray = new THREE.Raycaster(), _pl = new THREE.Plane();
  function aimPoint(x, y, lz) { const g = CR.game; bw(g.key, 0, 0, lz, _v); bw(g.key, 0, 0, lz + 1, _v2); _v2.sub(_v).normalize(); _pl.setFromNormalAndCoplanarPoint(_v2, _v); _ray.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, camera); const out = new THREE.Vector3(); return _ray.ray.intersectPlane(_pl, out) || _v.clone(); }
  const handPos = (out) => { const fx = Math.sin(wolfState.yaw), fz = Math.cos(wolfState.yaw); return out.set(wolfState.pos.x + fx * 0.45 + fz * 0.28, 1.25, wolfState.pos.z + fz * 0.45 - fx * 0.28); };
  function throwTo(p, hit) { const g = CR.game; g.anim = 0.35; dart.visible = true; handPos(pelA); pelB.copy(p); g.hit = hit; g.fly = 'dart'; }
  function shoot(p, hit) { const g = CR.game; if (pelT < 0.08) return; pelT = 0; handPos(pelA); pelA.y = 1.18; pelB.copy(p); pellet.visible = true; sfx('pap'); if (hit) { const r = Math.floor(hit.i / 7), b2 = games.gallery.rows[r][hit.i % 7]; b2.up = false; b2.t = 0; g.score++; puff(hit.p, BCOL[hit.i % BCOL.length]); sfx('pop'); const s = toScr(hit.p, {}); flyText('POP', s.x, s.y); } }
  function galleryPos(r, u, out) { return bw('gallery', -2.6 + ((u % 1 + 1) % 1) * 5.2, r ? 2.95 : 2.05, -1.12, out); }
  function action() { const g = CR.game; if (!g || g.done || g.shots <= 0 || g.anim > 0) return; const m = g.meter;
    if (g.key === 'rings') { g.shots--; g.anim = 0.6; const good = Math.abs(m - 0.5) < 0.12; const tops = games.rings.tops; const tgt = tops[Math.floor(Math.random() * tops.length)]; g.fly = 'ring'; handPos(pelA); pelB.copy(tgt); g.ringGood = good; if (!good) pelB.add(_v.set((Math.random() - 0.5) * 0.6, -0.9, 0.5)); }
    if (g.key === 'striker') { g.shots--; g.anim = 1.6; g.pow = m; g.best = Math.max(g.best, m); sfx('bonk'); }
    hudGame(); }

  CR.updateGame = (dt, t) => {
    const g = CR.game; if (!g) return; g.t += dt;
    // the needle / power meter
    if (g.key === 'rings' || g.key === 'striker') { g.meter = g.key === 'rings' ? 0.5 + 0.5 * Math.sin(g.t * 3.1) : 0.5 - 0.5 * Math.cos(g.t * 4.4); ovFill.style.width = (g.meter * 100) + '%'; ovMark.style.left = 'calc(' + (g.meter * 100) + '% - 2px)'; }
    if (g.key === 'gallery') { const rows = games.gallery.rows; rows.forEach((row, r) => row.forEach((b2, i) => { b2.u += dt * (r ? -0.16 : 0.12) * (1 + (C.wildK || 0)); if (!b2.up && (b2.t += dt) > 1.4) b2.up = true; setInst(games.gallery.im, r * 7 + i, galleryPos(r, b2.u, _v), b2.up ? 1 : 0.001); }));
      games.gallery.im.instanceMatrix.needsUpdate = true;
      // the Tommy gun: in the Wolf's paws, aimed at the reticle
      handPos(tommy.position); { const fx = Math.sin(wolfState.yaw), fz = Math.cos(wolfState.yaw); tommy.position.x += fz * 0.16; tommy.position.z -= fx * 0.16; tommy.position.y = 1.42; } const aim = aimPoint(innerWidth / 2, innerHeight / 2, -1.15); tommy.lookAt(aim); tommy.position.y += Math.sin(t * 30) * 0.004 * (pelT < 0.1 ? 1 : 0); }
    if (g.key === 'moles') { const M = games.moles; g.next -= dt; if (g.next <= 0 && g.t < g.dur - 0.6) { const i = Math.floor(Math.random() * 5); if (!M.want[i]) { M.want[i] = 1; M.t[i] = 1.1 - Math.min(0.4, g.t * 0.02); } g.next = 0.45 + Math.random() * 0.5; }
      for (let i = 0; i < 5; i++) { if (M.want[i] && (M.t[i] -= dt) <= 0) M.want[i] = 0; M.h[i] += (M.want[i] - M.h[i]) * Math.min(1, dt * 14); } M.place(); }
    if (g.key === 'striker') { const S = games.striker; bw('striker', 0.45, 0, 2.9, S.mallet.position); S.mallet.rotation.set(0, B.striker.g.rotation.y, 0);
      if (g.anim > 0) { const k = 1.6 - g.anim, top = 0.4 + g.pow * (C.striker.top - 0.4); S.mallet.rotation.x = k < 0.15 ? -1.3 + k * 8 : 0;
        S.puck.position.y = k < 0.15 ? 0.4 : k < 0.75 ? 0.4 + (top - 0.4) * Math.sin((k - 0.15) / 0.6 * Math.PI / 2) : top - (top - 0.4) * Math.min(1, (k - 0.75) / 0.6);
        if (k >= 0.74 && !g.dinged) { g.dinged = true; if (g.pow >= 0.93) { sfx('ding'); const s = toScr(_v.set(C.striker.x, C.striker.top, C.striker.z), {}); flyText('DING!', s.x, s.y); } else { const s = toScr(_v.set(C.striker.x, top, C.striker.z), {}); flyText(String(Math.round(g.pow * 100)), s.x, s.y); } } }
      else { S.puck.position.y = 0.4; g.dinged = false; } }
    // thrown things
    if (g.anim > 0) { const was = g.anim; g.anim -= dt;
      if (g.fly === 'dart') { const k = 1 - Math.max(0, g.anim) / 0.35; dart.position.lerpVectors(pelA, pelB, k); dart.position.y += Math.sin(k * Math.PI) * 0.3; dart.lookAt(pelB); dart.rotateY(Math.PI);
        if (g.anim <= 0 && was > 0) { if (g.hit) { games.darts.up[g.hit.i] = false; setInst(games.darts.im, g.hit.i, g.hit.p, 0.001); games.darts.im.instanceMatrix.needsUpdate = true; g.score++; puff(g.hit.p, BCOL[g.hit.i % BCOL.length]); sfx('pop'); const s = toScr(g.hit.p, {}); flyText('POP', s.x, s.y); } else sfx('pap'); g.fly = null; hudGame(); } }
      if (g.fly === 'ring') { const k = 1 - Math.max(0, g.anim) / 0.6, R = games.rings; const n = R.im.count = Math.min(9, R.landed.length + 1); _v.lerpVectors(pelA, pelB, k); _v.y += Math.sin(k * Math.PI) * 0.8; R.im.setMatrixAt(n - 1, _m.compose(_v, _q.identity(), _s.setScalar(1))); R.im.instanceMatrix.needsUpdate = true;
        if (g.anim <= 0 && was > 0) { R.landed.push(pelB.clone()); if (g.ringGood) { g.score++; sfx('ding'); const s = toScr(pelB, {}); flyText('RINGER', s.x, s.y); } else { sfx('pap'); const s = toScr(pelB, {}); flyText('BOINK', s.x, s.y); } g.fly = null; hudGame(); } }
    }
    if (pelT < 1) { pelT += dt; const k = Math.min(1, pelT / 0.12); pellet.position.lerpVectors(pelA, pelB, k); if (k >= 1) pellet.visible = false; }
    // finished?
    if (g.dur && g.t >= g.dur && !g.done) { g.done = true; setTimeout(() => endGame(false), 350); }
    if (g.shots <= 0 && g.anim <= 0 && !g.done) { g.done = true; setTimeout(() => endGame(false), 700); }
    if (g.dur && Math.floor(g.t * 4) !== g.lastQ) { g.lastQ = Math.floor(g.t * 4); hudGame(); }
  };
  // walk-up spots for the games and the shack
  for (const k of ['darts', 'gallery', 'rings', 'striker', 'moles']) { const [sx, sz] = STAND[k]; const p = bw(k, sx, 0, sz + 0.2, new THREE.Vector3()); TS.spots['c_game_' + k] = { x: p.x, z: p.z };
    T.addSpot({ id: 'c_game_' + k, x: p.x, z: p.z, r: 2.0, label: () => 'PLAY ' + GAME_INFO[k].title + ' (2 🎟)', act: () => CR.startGame(k) }); }
  { const p = bw('prizes', 0, 0, 3.0, new THREE.Vector3()); TS.spots.c_shack = { x: p.x, z: p.z };
    T.addSpot({ id: 'c_shack', x: p.x, z: p.z, r: 2.0, label: () => 'TRADE 10 🎟 FOR A PRIZE',
      act: () => { if (CR.tix < COST.shack) return [['PRIZE SHACK', 'Ten tickets. You have ' + CR.tix + '. I can count. It\'s my whole job.']]; addTix(-COST.shack); const pz = PLUSH[CR.prizes.length % PLUSH.length]; givePrize(pz); sfx('ding');
        return [['PRIZE SHACK', 'Ten tickets for ' + pz + '. Fair trade. Felt trade.'], ['', 'Prizes: ' + CR.prizes.join(', ') + '.']]; } }); }

  // ================================================================= per frame
  const FAIR = { x0: 72, x1: 154, z0: -8, z1: 100 };
  let atFair = false;
  CR.update = (dt, t) => {
    const p = wolfState.pos, inF = p.x > FAIR.x0 && p.x < FAIR.x1 && p.z > FAIR.z0 && p.z < FAIR.z1; if (inF !== atFair) { atFair = inF; document.body.classList.toggle('atfair', inF); }
    for (const P of puffs) if (P.t < 0.5) { P.t += dt; const k = P.t / 0.5; P.m.scale.setScalar(1 + k * 3); P.m.material.opacity = 1 - k; if (P.t >= 0.5) P.m.visible = false; }
    if (CR.busy) fpOff?.();
    if (CR.game) CR.updateGame(dt, t);
    if (!CR.ride) return;
    const key = CR.ride, R = C.rides[key], cfg = RIDE_CFG[key]; CR.rideT += dt;
    if (CR.hold?.(key, dt)) { R.want = 0; } else if (!CR.stopping && R.want === 0 && !(CR.holdOn?.())) R.want = 1;
    if (CR.rideT > cfg.dur && !CR.stopping && !(CR.holdOn?.())) { if (key === 'bump') { toast('Time\'s up. Everybody out. Slowly. SLOWLY.', 2.4); unboard(); return; } R.want = 0; CR.stopping = true; }
    if (CR.stopping) R.speed *= Math.exp(-dt * 1.2);   // the operator leans on the brake
    if (CR.stopping && R.speed < 0.08) { CR.stopping = false; unboard(); toast('Ride\'s over. Thanks for riding ' + R.name.replace(/^THE /, '') + '.', 2.4); return; }
    if (key === 'bump') { const car = R.cars[0], W = R.W / 2 - 1, D = R.D / 2 - 1; const lx = Math.max(-W, Math.min(W, p.x - R.x)), lz = Math.max(-D, Math.min(D, p.z - R.z)); if (lx !== p.x - R.x || lz !== p.z - R.z) { wolfState.speed *= -0.3; } p.x = R.x + lx; p.z = R.z + lz;
      car.g.position.set(lx, 0.3, lz); car.g.rotation.y = wolfState.yaw;
      for (const o of R.cars) { if (o === car) continue; const dx = o.g.position.x - lx, dz = o.g.position.z - lz, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) { const nx = dx / d, nz = dz / d; o.g.position.x = lx + nx * 2.2; o.g.position.z = lz + nz * 2.2;
        const sp = Math.max(2.5, Math.abs(wolfState.speed)); o.vx = nx * sp; o.vz = nz * sp; if (performance.now() - (CR.lastBonk || 0) > 450) { CR.lastBonk = performance.now(); CR.bonks = (CR.bonks || 0) + 1; sfx('bonk'); toast(['BONK!', 'BONK.', 'Bonk (polite).', 'BONK BONK', 'Sorry! (not sorry)'][CR.bonks % 5], 0.9); } wolfState.speed *= 0.4; } } }
    seatMatrix();
  };
  // camera: orbit around the ride, the gondola view on the wheel, a fixed booth view for games. Bumper cars use the normal follow cam.
  const _look = new THREE.Vector3(), _cp = new THREE.Vector3();
  CR.cam = (cam, dt, portrait) => {
    if (CR.game) { cam.position.copy(CR.game.cam); if (portrait) { _v.subVectors(CR.game.cam, CR.game.look).multiplyScalar(0.35); cam.position.add(_v); } cam.lookAt(CR.game.look); return true; }
    if (!CR.ride || CR.bump || !CR.seatM) return false; const R = C.rides[CR.ride]; _cp.setFromMatrixPosition(CR.seatM);
    if (R.cam === 'pod') { // over the shoulder out of the gondola, toward town
      cam.position.set(_cp.x + 1.7, _cp.y + 1.9, _cp.z + 2.6); _look.set(_cp.x - 9, _cp.y - 1.5, _cp.z + 9); cam.lookAt(_look); return true; }
    orbitA += dt * 0.14; const rad = (RIDE_CFG[CR.ride].rad || 17) * (portrait ? 1.25 : 1); cam.position.set(R.x + Math.sin(orbitA) * rad, 7.5, R.z + Math.cos(orbitA) * rad); _look.set(_cp.x, _cp.y + 0.8, _cp.z); cam.lookAt(_look); return true;
  };
  CR.exit = () => { if (CR.game) endGame(true); if (CR.ride) { CR.stopping = false; unboard(); } };
  CR.RIDE_CFG = RIDE_CFG; CR.games = games; CR.tommy = tommy; CR.endGame = endGame;
  return CR;
}
