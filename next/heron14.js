// heron14.js — run 14c: SAVE HERON. Heron is up on top of the Sky Wheel. The wheel is stuck. Nobody asks why.
//   1 the operator is on break at CORNY DOG CO. · 2 fryer grease from FRY-O-RAMA · 3 grease the lever · 4 Heron wants a fish:
//   win the big felt fish at BALLOON BLASTER (8 pops) · 5 ride the Sky Wheel to the top and hand it over.
//   (Heron was waiting to be asked. Heron eats the felt fish.)  Uses the shared errand system (town.js T.M) + carnrides.js hooks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _v = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
const FISH = 'the big felt fish';

export function installHeron({ CR, CARN, T, TS, scene, feltMat }) {
  const M = T.M; if (!M || !CR || !CARN) return null; const { S, OBJ, TITLE, DONE, DONE_MSG, TGT } = M; const C = CARN, R = C.rides.wheel, B = C.booths;
  const step = (n) => M.step('heron', n), say = (L) => M.outSay(L);
  const VC = feltMat('#ffffff', { vertexColors: true });
  function part(list, geo, col, m) { geo = geo.index ? geo.toNonIndexed() : geo; if (m) geo.applyMatrix4(m); const n = geo.attributes.position.count, a = new Float32Array(n * 3); _c.set(col); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (geo.attributes.uv) geo.deleteAttribute('uv'); list.push(geo); }
  const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const mesh = (L) => { const m = new THREE.Mesh(mergeGeometries(L, false), VC); m.castShadow = true; return m; };

  // ---- Heron (felt, procedural): grey-blue body, white neck, black crest, yellow beak, stilt legs
  const heron = new THREE.Group(); heron.name = 'heron (wheel)';
  { const L = [];
    part(L, new THREE.SphereGeometry(0.32, 9, 6), '#9fb4c8', M4(0, 1.0, -0.05, 0.35, 0, 0, 1, 0.85, 1.45));
    part(L, new THREE.ConeGeometry(0.22, 0.5, 5), '#7f93a8', M4(0, 0.92, -0.55, -2.1));                                        // tail feathers
    for (const s of [-1, 1]) part(L, new THREE.SphereGeometry(0.2, 6, 4), '#8aa0b6', M4(s * 0.26, 1.05, -0.08, 0.3, 0, 0, 0.45, 0.8, 1.5));   // wings
    part(L, new THREE.CapsuleGeometry(0.075, 0.42, 2, 6), '#eef2f4', M4(0, 1.45, 0.22, 0.35));
    part(L, new THREE.CapsuleGeometry(0.07, 0.3, 2, 6), '#eef2f4', M4(0, 1.78, 0.25, -0.35));
    part(L, new THREE.SphereGeometry(0.12, 7, 5), '#eef2f4', M4(0, 1.98, 0.2));
    part(L, new THREE.ConeGeometry(0.045, 0.42, 6), '#e8b23a', M4(0, 1.96, 0.5, Math.PI / 2));
    part(L, new THREE.BoxGeometry(0.05, 0.03, 0.35), '#2b2628', M4(0, 2.06, 0.02, 0.5));                                      // crest plume
    part(L, new THREE.BoxGeometry(0.04, 0.025, 0.3), '#2b2628', M4(0, 2.03, -0.05, 0.75));
    for (const s of [-1, 1]) { part(L, new THREE.SphereGeometry(0.025, 4, 3), '#2b2628', M4(s * 0.09, 2.0, 0.28)); part(L, new THREE.CylinderGeometry(0.022, 0.022, 0.8, 4), '#d9a34a', M4(s * 0.1, 0.42, 0)); part(L, new THREE.BoxGeometry(0.06, 0.02, 0.22), '#d9a34a', M4(s * 0.1, 0.02, 0.06)); }
    heron.add(mesh(L)); }
  const fish = (() => { const L = []; part(L, new THREE.SphereGeometry(0.16, 7, 5), '#e88a3a', M4(0, 0, 0, 0, 0, 0, 1, 0.75, 1.9)); part(L, new THREE.ConeGeometry(0.14, 0.2, 6), '#e8806a', M4(0, 0, -0.36, -Math.PI / 2, 0, 0, 1, 1, 0.4));
    part(L, new THREE.SphereGeometry(0.035, 4, 3), '#2b1e3c', M4(0.1, 0.04, 0.2)); part(L, new THREE.SphereGeometry(0.035, 4, 3), '#2b1e3c', M4(-0.1, 0.04, 0.2)); return mesh(L); })();
  fish.visible = false; heron.add(fish); fish.position.set(0, 1.94, 0.62); fish.rotation.y = Math.PI / 2;
  const TOP = 3;   // the pod that is on top when the wheel's phase is 0
  R.pods[TOP].add(heron); heron.position.set(0, 0.03, 0.15);
  // the wheel operator (a possum in overalls, on break, with a corn dog)
  const op = new THREE.Group(); op.name = 'wheel operator';
  { const L = []; part(L, new THREE.CapsuleGeometry(0.26, 0.5, 2, 7), '#4a6f9a', M4(0, 0.62, 0)); part(L, new THREE.SphereGeometry(0.24, 8, 6), '#c9c0b8', M4(0, 1.28, 0.02));
    part(L, new THREE.ConeGeometry(0.1, 0.22, 6), '#f2d4d8', M4(0, 1.2, 0.3, Math.PI / 2)); part(L, new THREE.SphereGeometry(0.04, 6, 4), '#e8a0c0', M4(0, 1.2, 0.42));
    for (const s of [-1, 1]) { part(L, new THREE.SphereGeometry(0.08, 5, 3), '#e8a0c0', M4(s * 0.17, 1.5, 0, 0, 0, 0, 1, 1, 0.4)); part(L, new THREE.SphereGeometry(0.03, 4, 3), '#2b1e3c', M4(s * 0.09, 1.33, 0.2)); part(L, new THREE.CylinderGeometry(0.07, 0.07, 0.4, 5), '#3a5070', M4(s * 0.12, 0.2, 0)); }
    part(L, new THREE.CylinderGeometry(0.27, 0.27, 0.08, 8), '#e8806a', M4(0, 1.47, 0.02)); part(L, new THREE.BoxGeometry(0.3, 0.04, 0.2), '#e8806a', M4(0, 1.45, 0.2));
    part(L, new THREE.TorusGeometry(0.22, 0.04, 4, 7, Math.PI), '#c9c0b8', M4(0, 0.25, -0.35, 0, Math.PI / 2, 0));     // tail
    part(L, new THREE.CapsuleGeometry(0.06, 0.24, 2, 5), '#c98a3c', M4(0.3, 0.95, 0.2, 0.4)); part(L, new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), '#e6d2a8', M4(0.3, 0.75, 0.13, 0.4));
    op.add(mesh(L)); }
  const cd = B.corndog; op.position.set(cd.front.x + 1.8, 0, cd.front.z + 0.4); op.rotation.y = Math.PI; (C.near || scene).add(op);
  let tris = 0; for (const o of [heron, op]) o.traverse(x => { if (x.isMesh) tris += x.geometry.attributes.position.count / 3; });

  // ---- tables + targets
  const at = (k, d = 0) => ({ x: B[k].front.x + d, z: B[k].front.z });
  TS.spots.c_corndog = { x: op.position.x - 0.2, z: op.position.z - 1.2 * Math.sign(cd.side) * -1 }; TS.spots.c_fry = at('fry');
  R.root.updateMatrixWorld(true); const LEVER = { x: R.x + 7.4, z: R.z + 6.0 }; TS.spots.c_lever = LEVER;
  OBJ.heron = ['', 'Find the wheel operator (on break at Corny Dog Co.)', 'Get fryer grease (Fry-O-Rama)', 'Grease the Sky Wheel lever', 'Heron wants a fish. Win the big felt fish (Balloon Blaster, 8 pops)', 'Ride the Sky Wheel up to Heron', ''];
  TITLE.heron = 'SAVE HERON'; DONE.heron = 6; DONE_MSG.heron = '. Heron got down. The fish did not.';
  TGT.heron = [0, 'c_corndog', 'c_fry', 'c_lever', 'c_game_gallery', 'c_ride_wheel'];
  M.MLIST.push('heron'); S.heron = S.heron || 0;
  { const q = new URLSearchParams(location.search).get('mstep'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (k === 'heron') S.heron = +v; } }
  const hasFish = () => CR.prizes.includes(FISH);
  const stuck = () => S.heron < 4;

  // ---- the wheel: stuck (Heron on top) until greased; at step 5 it stops with your pod beside Heron's
  let topHeld = false, down = S.heron >= 6 ? 9 : 0, eat = 0;
  const N = R.pods.length, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const podAng = (i) => i / N * Math.PI * 2 + R.phase;
  CR.canBoard = (k) => k !== 'wheel' || !stuck();
  CR.blocked = (k) => [['', 'The Sky Wheel isn\'t moving. Somebody is sitting on top of it.']];
  CR.label = (k) => k !== 'wheel' ? null : S.heron === 0 ? 'WHO\'S UP THERE?' : stuck() ? 'SKY WHEEL (STUCK)' : S.heron === 5 ? 'RIDE UP TO HERON' : null;
  CR.act = (k) => {
    if (k !== 'wheel') return null;
    if (S.heron === 0) { step(1); return [['WOLF', 'Hey. Is that Heron? On top of the wheel?'], ['HERON (very far up)', 'Yes.'], ['WOLF', 'Are you stuck?'], ['HERON', 'The wheel is stuck. I\'m just up here.'], ['SIGN', 'RIDE CLOSED. OPERATOR ON BREAK. (CORNY DOG CO.)']]; }
    if (stuck()) return [['HERON (very far up)', ['Still up here.', 'The view is fine. Thank you for asking. Nobody asked.', 'I can see the whole town. It\'s the same town.'][(Math.random() * 3) | 0]]];
    if (S.heron === 5) { const L = CR.board('wheel', true); return L ? [['RIDE OPERATOR', 'On the house. Go get Heron down. Or up. Whatever Heron wants.'], ['', 'The wheel creaks. Up you go, with the fish.']] : null; }
    return null;
  };
  const _hp = new THREE.Vector3(); CR.podLook = () => { if (CR.ride !== 'wheel' || S.heron < 4 || (S.heron >= 6 && down >= 9) || !(topHeld || (down > 0 && down < 9))) return null; heron.getWorldPosition(_hp); _hp.y += 1.2; return _hp; };
  CR.holdOn = () => CR.ride === 'wheel' && S.heron === 5;
  CR.hold = (k, dt) => { if (k !== 'wheel' || S.heron !== 5) return false; if (topHeld) return true; const a = wrap(podAng(2) - Math.PI / 2); if (a > -0.32 && a < 0.05) { topHeld = true; } return topHeld; };
  CR.onUnboard = (k) => { if (k === 'wheel') topHeld = false; };
  CR.onGame = (k, ev, g) => { if (k === 'gallery' && ev === 'end' && g.prize === FISH && S.heron === 4) { step(5); g.extra = [['', 'A big felt fish. Heron wanted a fish. This is, technically, a fish.']]; } };

  // ---- walk-up spots
  T.addSpot({ id: 'h_op', x: TS.spots.c_corndog.x, z: TS.spots.c_corndog.z, r: 2.6, on: () => S.heron === 1, label: 'TALK TO THE WHEEL OPERATOR',
    act: () => { step(2); return [['WHEEL OPERATOR', 'I know. I know. The wheel.'], ['WHEEL OPERATOR', 'The lever sticks. Needs grease. Fry-O-Rama has the good grease. The best grease.'], ['WOLF', 'And Heron?'], ['WHEEL OPERATOR', 'Heron got on at noon. Then the lever stuck. I came here. For a corn dog. For three hours.']]; } });
  T.addSpot({ id: 'h_fry', x: TS.spots.c_fry.x, z: TS.spots.c_fry.z, r: 2.6, on: () => S.heron === 2, label: 'ASK FOR FRYER GREASE',
    act: () => { step(3); return [['FRY-O-RAMA', 'Fryer grease? For a lever?'], ['FRY-O-RAMA', '...Fine. This is Tuesday\'s. Tuesday was a good day.'], ['', 'You get a paper cup of fryer grease. It is warm. It smells like a fair.']]; } });
  T.addSpot({ id: 'h_lever', x: LEVER.x, z: LEVER.z, r: 2.8, on: () => S.heron === 3, label: 'GREASE THE LEVER',
    act: () => { R.held = false; R.cycle = 0; const fishAlready = hasFish(); step(fishAlready ? 5 : 4);
      return [['', 'Grease. Lever. A long, happy squeak.'], ['', 'The Sky Wheel starts to turn. Heron rides it all the way round. And stays on.'], ['HERON (going past)', 'I\'d come down for a fish.'], fishAlready ? ['WOLF', 'Funny you should say that. I have a big felt fish.'] : ['WOLF', 'Where do I get a fish at a fair?'], fishAlready ? ['HERON (going past)', 'Then come up.'] : ['RING-A-DING (shouting over)', 'BALLOON BLASTER has the big felt fish! Eight pops!']]; } });
  T.addSpot({ id: 'h_give', x: R.board.x, z: R.board.z, r: 3.5, ride: true, on: () => S.heron === 5 && CR.ride === 'wheel' && topHeld && R.speed < 0.2, label: 'HAND OVER THE FISH',
    act: () => { const i = CR.prizes.indexOf(FISH); if (i >= 0) CR.prizes.splice(i, 1); CR.addTix(0); step(6); topHeld = false; down = 0.001; R.held = true; R.want = 0;
      return [['HERON', 'Oh. A fish. For me?'], ['WOLF', 'You said you\'d come down for a fish.'], ['HERON', 'I would have come down if anyone asked.'], ['WOLF', '...You weren\'t stuck?'], ['HERON', 'I was waiting to be asked. Nobody asks Heron anything.'], ['WOLF', 'Do you want to come down?'], ['HERON', 'Yes. Thank you for asking.'], ['', 'Heron eats the big felt fish. All of it. Felt and all.']]; } });
  // after the ending, Heron hangs about by the wheel and is asked things
  T.addSpot({ id: 'h_after', x: R.board.x + 2.6, z: R.board.z + 1.0, r: 2.2, on: () => S.heron >= 6 && down > 2, label: 'ASK HERON SOMETHING',
    act: () => [['HERON', ['Yes, I\'m fine. Thank you for asking.', 'The fish was a little dry. It was felt.', 'Ask me something else. Anything. I\'ll wait.', 'I\'ll ride again tomorrow. Someone may ask.'][(Math.random() * 4) | 0]]] });

  // ---- per frame
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  const update = (dt) => {
    if (stuck() && CR.ride !== 'wheel') { R.held = true; R.want = 0; R.phase += (0 - wrap(R.phase)) * Math.min(1, dt * 2); }
    if (S.heron === 4 && R.held && CR.ride !== 'wheel' && !topHeld) R.held = false;
    const tt = performance.now() / 1000;
    if (S.heron < 6) { heron.rotation.y = Math.sin(tt * 0.4) * 0.6; heron.position.y = 0.03; }
    // the hop down (2.4 s), then the snack
    if (down > 0 && down < 9) {
      if (down === 0.001) { heron.updateMatrixWorld(true); heron.getWorldPosition(from); scene.attach(heron); to.set(R.board.x + 2.6, 0, R.board.z - 0.6); fish.visible = true; }
      down += dt; const k = Math.min(1, down / 2.4); heron.position.lerpVectors(from, to, k); heron.position.y = from.y * (1 - k) + Math.sin(k * Math.PI) * 3; heron.rotation.y = Math.PI * 0.2;
      if (k >= 1) { const e = Math.min(1, (down - 2.4) / 3); fish.scale.setScalar(Math.max(0.001, 1 - e)); heron.rotation.x = Math.sin(e * Math.PI * 6) * 0.08; if (e >= 1) { fish.visible = false; heron.rotation.x = 0; down = 9; if (CR.ride !== 'wheel') R.held = false; } }
    }
  };
  if (S.heron >= 6) { scene.attach(heron); heron.position.set(R.board.x + 2.6, 0, R.board.z - 0.6); heron.rotation.set(0, Math.PI * 0.2, 0); down = 9; }
  if (stuck()) { R.phase = 0; R.wheel.rotation.z = 0; R.held = true; R.want = 0; R.speed = 0; }
  const H = { heron, op, tris, fish, update, get step() { return S.heron; }, get topHeld() { return topHeld; } }; return H;
}
