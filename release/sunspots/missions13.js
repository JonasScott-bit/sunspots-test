// missions13.js — run 13: three new town errands on the shared mission system (town.js T.M):
//   THE ONE HORSE (horse) · KSUN CALL-IN (call, timed) · PAPER ROUTE (route, works on foot or from his own car).
// Every step is a walk-up button (phone friendly) with a minimap target (TS.spots key in TGT).
import * as THREE from 'three';
import { PLAZA } from './horse.js';

export function installMissions({ T, TS, level, wolfState, horse, scene, feltMat }) {
  const M = T.M; if (!M) return null; const { S, OBJ, TITLE, DONE, DONE_MSG, TGT } = M;
  const W = () => (window.__sunspots?.wild || 0) > 0.5;
  const spot = (k, x, z) => (TS.spots[k] = { x, z });
  // ---- spots (targets)
  const D = TS.doors || {};
  const off = (k, d = 3) => { const o = D[k]; return o ? [o.x + Math.sin(o.ry || 0) * d, o.z + Math.cos(o.ry || 0) * d] : [0, 0]; };
  spot('m_bowl_hoof', off('bowl')[0] - 3, off('bowl')[1]); spot('m_drivein', off('drivein')[0] + 3, off('drivein')[1]); spot('m_farmhorse', -207.5, 98.5);
  spot('m_plaza', PLAZA.x, PLAZA.z0 - 1.5);
  spot('m_pin', off('bowl')[0] + 3, off('bowl')[1]); spot('m_board', TS.spots.board?.x ?? -74, TS.spots.board?.z ?? 19); spot('m_cone', -77, -57.5); spot('m_phone', 8.6, 12.9);
  spot('m_post', off('post', 2.6)[0] + 3, off('post', 2.6)[1]);
  const ROUTE = [['ram', 'RAM (through the door)', 'If this is the paper, I already know what happened. Nothing.'], ['lynx', 'LYNX (inside)', 'Leave it on the mat. The mat reads it first.'],
    ['heron', 'HERON (inside)', 'Thank you. I\'ll stand on it.'], ['mansion', 'VULTURE (intercom)', 'We cancelled the paper in 1979.']];
  ROUTE.forEach(([k], i) => spot('m_route' + i, ...off(k, 3.2)));

  // ---- tables
  Object.assign(OBJ, {
    horse: ['', 'Follow the hoofprints (they head for Gutter Bowl)', 'Follow the popcorn to the Eye-Max Drive-In', 'Check the farm (far west, past the mansion)', 'Go back to the Horse Plaza', ''],
    call: ['', 'KSUN wants a bowling pin (Gutter Bowl)', 'Now a flyer (the notice board, Horse Plaza)', 'Now a traffic cone (Big Al\'s Auto Body)', 'Call KSUN from the payphone', ''],
    route: ['', 'Paper for the Ram (Mesa Rd, east end)', 'Paper for the Lynx', 'Paper for the Heron', 'Paper for the Mansion (Vulture & Larry)', ''],
  });
  const BASE = { call: OBJ.call.slice() };
  Object.assign(TITLE, { horse: 'THE ONE HORSE', call: 'KSUN CALL-IN', route: 'PAPER ROUTE' });
  Object.assign(DONE, { horse: 5, call: 5, route: 5 });
  Object.assign(DONE_MSG, { horse: '. It was here first.', call: '. Caller four. Prize: being caller four.', route: '. Tip: never play pool with Larry.' });
  Object.assign(TGT, { horse: [0, 'm_bowl_hoof', 'm_drivein', 'm_farmhorse', 'm_plaza'], call: [0, 'm_pin', 'm_board', 'm_cone', 'm_phone'], route: [0, 'm_route0', 'm_route1', 'm_route2', 'm_route3'] });
  M.MLIST.push('horse', 'call', 'route');
  for (const m of ['horse', 'call', 'route']) S[m] = S[m] || 0;
  { const q = new URLSearchParams(location.search).get('mstep'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (k === 'horse' || k === 'call' || k === 'route') S[k] = +v; } }
  if (S.call > 0 && S.call < 5 && !(S.callT > 0)) S.callT = 180;
  const step = (m, n) => M.step(m, n), say = (L) => M.outSay(L);

  // ---- props: hoofprints (plaza -> bowl), popcorn trail (bowl -> drive-in), Big Al's cones, the paper bundle, a flying paper
  const path = (pts, every) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / every);
    for (let j = 0; j < n; j++) o.push([ax + (bx - ax) * j / n, az + (bz - az) * j / n, Math.atan2(bx - ax, bz - az)]); } return o; };
  const hoofP = path([[PLAZA.x + 5, PLAZA.z0 - 0.5], [-40.5, 9.5], [-41.5, -4], [-41.5, -58], [-29, -64]], 2.6);
  const shoeG = new THREE.TorusGeometry(0.17, 0.05, 4, 10, Math.PI * 1.5); shoeG.rotateX(-Math.PI / 2); shoeG.rotateY(Math.PI * 0.25); shoeG.scale(1, 0.4, 1.15);
  const hoof = new THREE.InstancedMesh(shoeG, feltMat('#5a3a26'), hoofP.length); const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3();
  hoofP.forEach(([x, z, a], i) => { const sd = (i % 2 ? 0.28 : -0.28); _v.set(x + Math.cos(a) * sd, 0.04, z - Math.sin(a) * sd); _q.setFromEuler(_e.set(0, a, 0)); hoof.setMatrixAt(i, _m.compose(_v, _q, _s)); });
  hoof.name = 'hoofprints'; scene.add(hoof);
  const popP = path([[-23, -66.5], [-5, -65.5], [14, -66.5]], 0.9);
  const popG = new THREE.IcosahedronGeometry(0.09, 0); const pop = new THREE.InstancedMesh(popG, feltMat('#fff4cc'), popP.length * 2);
  popP.forEach(([x, z], i) => { for (let j = 0; j < 2; j++) { const r = Math.sin(i * 12.9 + j * 78.2) * 43758.5 % 1; _v.set(x + r * 0.6, 0.07, z + ((r * 7) % 1 - 0.5) * 0.8); _q.setFromEuler(_e.set(r * 3, r * 5, 0)); _s.setScalar(0.8 + Math.abs(r) * 0.6); pop.setMatrixAt(i * 2 + j, _m.compose(_v, _q, _s)); } });
  _s.set(1, 1, 1); pop.name = 'popcorn trail'; scene.add(pop);
  const coneG = new THREE.Group(); for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 10), feltMat('#f06a2a')); c.position.set(-76 + i * 0.7, 0.33, -57.2 + (i % 2) * 0.5);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), feltMat('#f06a2a')); b.position.set(c.position.x, 0.025, c.position.z); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.1, 10, 1, true), feltMat('#f6efe0')); st.position.set(c.position.x, 0.38, c.position.z); coneG.add(c, b, st); }
  coneG.name = 'Big Al cones'; scene.add(coneG);
  const bundle = new THREE.Group(); for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8), feltMat(i % 2 ? '#e8e2d2' : '#f2ece0')); r.rotation.z = Math.PI / 2; r.position.set(0, 0.12 + (i > 1 ? 0.19 : 0), (i % 2) * 0.2 - 0.1); bundle.add(r); }
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.46), feltMat('#c8463f')); strap.position.y = 0.2; bundle.add(strap);
  bundle.position.set(TS.spots.m_post.x + 1.6, 0, TS.spots.m_post.z - 1.0); bundle.name = 'paper bundle'; scene.add(bundle);
  const fly = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), feltMat('#f2ece0')); fly.visible = false; scene.add(fly); let flyT = -1, flyA = null, flyB = null;
  function toss(to) { const p = pos(); flyA = new THREE.Vector3(p.x, 1.2, p.z); flyB = new THREE.Vector3(to.x, 0.15, to.z); flyT = 0; fly.visible = true; }

  // ---- state -> world
  function sync() {
    hoof.visible = S.horse === 1; pop.visible = S.horse === 2; bundle.visible = !(S.route > 0 && S.route < 5);
    const want = S.horse >= 1 && S.horse <= 2 ? 'gone' : S.horse === 3 ? 'farm' : S.horse === 4 ? 'gone' : 'plinth';
    if (horse && horse.state !== want) horse.setAt(want);
    if (S.call > 0 && S.call < 5) { const t = Math.max(0, Math.ceil(S.callT)); OBJ.call[S.call] = BASE.call[S.call] + ` · song ends in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
  }
  const pos = () => (level.solo && level.free?.pos ? level.free.pos : wolfState.pos);

  // ---- THE ONE HORSE
  let wildRead = false;   // the first WILD read is the plaque; after that the eyes invite you in
  T.statueLabel = () => (S.horse === 0 && W() && wildRead ? 'LOOK IT IN THE EYE' : S.horse === 4 ? 'CHECK THE PLINTH' : S.horse >= 1 && S.horse < 4 ? 'LOOK AT THE EMPTY PLINTH' : null);
  T.statueAct = () => {
    if (S.horse === 0 && W() && !wildRead) { wildRead = true; return null; }
    if (S.horse === 0 && W()) { step('horse', 1); sync(); return [['', 'The red eyes blink. Once.'], ['', 'You blink too. The plinth is empty.'], ['WOLF', 'The one horse.'], ['WOLF', 'It\'s gone. There are hoofprints.']]; }
    if (S.horse >= 1 && S.horse < 4) return [['', 'An empty plinth. A felt dent in the shape of a horse.'], ['PLAQUE', 'SAME OLD ONE HORSE TOWN.'], ['WOLF', 'Zero horse town, currently.']];
    if (S.horse === 4) { step('horse', 5); horse?.setAt('plinth'); sync(); return [['', 'The horse is back on the plinth. It is not out of breath.'], ['WOLF', 'You beat me here.'], ['PLAQUE', '"IT WAS HERE FIRST."'], ['', 'Somewhere, the Farmhand sets down a shovel.']]; }
    return null;
  };
  T.addSpot({ id: 'm_hoof', x: TS.spots.m_bowl_hoof.x, z: TS.spots.m_bowl_hoof.z, r: 2.6, on: () => S.horse === 1, label: 'PICK UP THE HORSESHOE',
    act: () => { step('horse', 2); sync(); return [['', 'A felt horseshoe in the gutter outside the Bowl.'], ['BOWLING PIN (from inside)', 'It bowled a 300. With its face.'], ['', 'Popcorn. A trail of popcorn, heading east.']]; } });
  T.addSpot({ id: 'm_drivein', x: TS.spots.m_drivein.x, z: TS.spots.m_drivein.z, r: 2.8, on: () => S.horse === 2, label: 'ASK ABOUT THE POPCORN',
    act: () => { step('horse', 3); sync(); return [['', 'The popcorn ends at the Drive-In. A note on the snack window:'], ['NOTE', '"1 LARGE POPCORN. PAID IN HAY. WENT HOME."'], ['WOLF', 'Home. The farm.']]; } });
  T.addSpot({ id: 'm_farm', x: TS.spots.m_farmhorse.x, z: TS.spots.m_farmhorse.z, r: 3.2, on: () => S.horse === 3, label: 'TALK TO THE HORSE',
    act: () => { step('horse', 4); setTimeout(() => sync(), 4200); return [['', 'The horse stands in the field like it never left.'], ['FARMHAND', 'It does this. Comes home, eats, goes back to work.'], ['WOLF', 'It\'s a statue.'], ['FARMHAND', 'It\'s the only horse. It can stand wherever it wants.'], ['', 'You look away for one second. The field is empty.']]; } });

  // ---- KSUN CALL-IN (timed: the song is 3:00)
  T.addSpot({ id: 'm_phone', x: 8.6, z: 13.0, r: 2.0, on: () => (S.call === 0 && (T.talkN?.payphone || 0) >= 1) || S.call === 4, label: () => S.call === 4 ? 'CALL KSUN' : 'DIAL KSUN (CONTEST LINE)',
    act: () => {
      if (S.call === 0) { S.callT = 180; step('call', 1); sync(); return [['KSUN DJ (on the line)', 'KSUN 1490, you\'re caller... three. Close.'], ['KSUN DJ', 'Today\'s contest: bring a bowling pin, a flyer and a traffic cone to a phone.'], ['KSUN DJ', 'Before this song ends. It\'s the same song. You know how long it is.']]; }
      step('call', 5); S.callT = 0; sync(); return [['KSUN DJ', 'Pin? Flyer? Cone? On a payphone? I can hear the cone.'], ['KSUN DJ', 'Folks... we have a CALLER FOUR.'], ['KSUN DJ', 'We\'ve never had a caller four. We don\'t have a prize.'], ['KSUN DJ', 'Here\'s the song again.'], ['WOLF', 'Same old song.']];
    } });
  T.addSpot({ id: 'm_pin', x: TS.spots.m_pin.x, z: TS.spots.m_pin.z, r: 2.6, on: () => S.call === 1, label: 'BORROW A SPARE PIN', act: () => { step('call', 2); sync(); return [['BOWLING PIN', 'Take me. Nobody\'s knocked me down in years.']]; } });
  T.addSpot({ id: 'm_board', x: TS.spots.m_board.x, z: TS.spots.m_board.z, r: 2.6, on: () => S.call === 2, label: 'TAKE A FLYER', act: () => { step('call', 3); sync(); return [['', 'You take the KSUN flyer. "BE CALLER 4!" Ironic.']]; } });
  T.addSpot({ id: 'm_cone', x: TS.spots.m_cone.x, z: TS.spots.m_cone.z, r: 2.6, on: () => S.call === 3, label: 'TAKE A CONE', act: () => { step('call', 4); sync(); return [['BIG AL (from under a car)', 'Bring it back. That cone has seen worse.']]; } });
  T.tick.push((dt) => { if (S.call > 0 && S.call < 5) { S.callT -= dt; if (S.callT <= 0) { S.call = 0; S.callT = 0; M.save(); M.hud(); M.toast('KSUN CALL-IN — failed. The song ended.', 4);
    say([['KSUN DJ (on every radio)', 'Song ended. Caller four won.'], ['KSUN DJ', 'There\'s never a caller four.']]); } else if ((S.callT | 0) !== (S._ct | 0)) { S._ct = S.callT; sync(); M.hud(); } } });

  // ---- PAPER ROUTE (walk up or drive by in his own car — within 7 m the paper flies itself)
  T.addSpot({ id: 'm_post', x: TS.spots.m_post.x, z: TS.spots.m_post.z, r: 2.6, on: () => S.route === 0 || S.route === 5, label: () => S.route === 5 ? 'PAPER ROUTE (DONE)' : 'TAKE THE PAPER ROUTE',
    act: () => { if (S.route === 5) return [['POST OFFICE', 'Same route tomorrow. Same news.']]; step('route', 1); sync(); return [['POST OFFICE (window)', 'Paper boy quit. Paper boy was also a wolf.'], ['POST OFFICE', 'Four houses. Throw it, don\'t knock. Driving\'s fine.']]; } });
  function deliver(i) {
    const [k, who, line] = ROUTE[i]; toss(TS.spots['m_route' + i]); step('route', i + 2);
    if (i < 3) say([[who, line]]); else say([[who, line], ['LARRY BYRD (upstairs)', 'Keep it coming. I like knowing what I\'m not reading.'], ['LARRY BYRD', 'Here\'s your tip, kid: never play pool with me.']]); sync();
  }
  ROUTE.forEach((r, i) => T.addSpot({ id: 'm_route' + i, x: TS.spots['m_route' + i].x, z: TS.spots['m_route' + i].z, r: 3.0, on: () => S.route === i + 1, label: 'TOSS THE PAPER', act: () => { deliver(i); return null; } }));
  let fx = 0;
  T.tick.push((dt) => {
    if (S.route >= 1 && S.route <= 4 && level.solo) { const i = S.route - 1, sp = TS.spots['m_route' + i], p = pos(); if (Math.hypot(p.x - sp.x, p.z - sp.z) < 7) deliver(i); }
    if (flyT >= 0) { flyT += dt / 0.7; const t = Math.min(1, flyT); fly.position.lerpVectors(flyA, flyB, t); fly.position.y += Math.sin(t * Math.PI) * 2.2; fly.rotation.set(flyT * 9, 0, flyT * 5); if (t >= 1) { flyT = -1; fx = 3; } }
    if (fx > 0) { fx -= dt; if (fx <= 0) fly.visible = false; }
  });
  sync(); M.hud();
  const api = { sync, deliver, S, spots: () => Object.fromEntries(Object.keys(TS.spots).filter(k => k.startsWith('m_')).map(k => [k, TS.spots[k]])) };
  window.__m13 = api; return api;
}
