// First-person cockpit for the boot car: the player IS the moth driver.
// Gloved felt hands on a 70s wheel, mustard dash, pine air freshener on the mirror, a live rear-view mirror,
// head look (drag the upper screen, snaps back to the road on release), and the cast in the car pranking him
// behind his back. They snap to an innocent deadpan pose a split second after his gaze turns their way.
// The mirror does not count as being watched, so it can catch them mid-act.
// Car-local axes (body group): +z forward, +x = car's LEFT (driver side), y up.
import * as THREE from 'three';

export function createCockpit(L, H) {
  const { feltMat, rbox, clamp, lerp, rnd } = H;
  const c = L.car, body = c.body, driver = c.driver;
  const add = (g, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  const sph = (r, col, ws = 18, hs = 12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), feltMat(col)); m.castShadow = true; return m; };
  const cyl = (r0, r1, h, col, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), feltMat(col)); m.castShadow = true; return m; };
  const box = (w, h, d, r, col) => { const m = rbox(w, h, d, r, col); m.castShadow = m.receiveShadow = true; return m; };
  const CK = { look: { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, held: false }, cast: [], chase: false };
  const TAN = '#cfae84', TAN_D = '#b48f63', GLOVE = '#5b3826', MUSTARD = '#d8a23a';

  // ---------------------------------------------------------------- the moth's head parts (hidden in first person)
  const headParts = [];
  driver.traverse(o => { if (o.isMesh && o.position.y > 1.3 && o.parent === driver) headParts.push(o); });
  for (const a of L.antennae || []) headParts.push(a);
  // old stub arms + wheel replaced by the cockpit set below
  driver.children.filter(o => o.isMesh && Math.abs(o.position.y - 1.12) < 0.01).forEach(o => o.visible = false);
  c.wheel.visible = false;

  // ---------------------------------------------------------------- 70s steering wheel (thin cream rim, three brushed spokes, horn pad)
  const EYE = new THREE.Vector3(0, 1.6, 0.12);                   // driver space
  const wheelTilt = new THREE.Group(); wheelTilt.position.set(0, 1.2, 0.6); wheelTilt.rotation.x = 0.42; driver.add(wheelTilt);
  const column = cyl(0.035, 0.045, 0.5, '#3a2a26'); column.rotation.x = Math.PI / 2; column.position.z = 0.25; wheelTilt.add(column);
  const wheelSpin = new THREE.Group(); wheelTilt.add(wheelSpin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.019, 10, 40), feltMat('#efe0c0')); rim.castShadow = true; wheelSpin.add(rim);
  for (const a of [Math.PI / 2, Math.PI / 2 + 2.15, Math.PI / 2 - 2.15]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.026, 0.01), new THREE.MeshStandardMaterial({ color: '#b9b2a6', metalness: 0.7, roughness: 0.35 }));
    sp.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.005); sp.rotation.z = a; wheelSpin.add(sp);
  }
  const hub = add(wheelSpin, cyl(0.055, 0.055, 0.03, '#7a3b26'), 0, 0, -0.012); hub.rotation.x = Math.PI / 2;
  // gloved felt hands at ten and two, riding the rim
  const hands = [];
  for (const sx of [1, -1]) {
    const a = Math.PI / 2 + sx * 1.0, h = new THREE.Group(); h.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, -0.015); wheelSpin.add(h);
    const mit = sph(0.058, GLOVE); mit.scale.set(1.05, 1.25, 0.8); h.add(mit);
    const thumb = sph(0.025, GLOVE); thumb.position.set(-sx * 0.035, 0.03, 0.035); h.add(thumb);
    const cuff = cyl(0.055, 0.05, 0.06, '#8a5a3c'); cuff.position.set(0, -0.07, -0.03); cuff.rotation.x = 0.6; h.add(cuff);
    hands.push(h);
  }
  // felt arms: shoulder -> glove, re-aimed every frame
  const arms = [1, -1].map(sx => { const m = cyl(0.055, 0.065, 1, TAN, 10); m.castShadow = true; driver.add(m); return { m, sh: new THREE.Vector3(sx * 0.21, 1.3, 0.02) }; });
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function aimArms() {
    driver.updateMatrixWorld(true);
    arms.forEach((A, i) => {
      hands[i].getWorldPosition(_a); driver.worldToLocal(_a); _a.y -= 0.03; _a.z -= 0.04;
      _b.subVectors(_a, A.sh); const len = _b.length();
      A.m.position.copy(A.sh).addScaledVector(_b, 0.5); A.m.scale.set(1, len, 1); A.m.quaternion.setFromUnitVectors(_up, _b.normalize());
    });
  }

  // ---------------------------------------------------------------- mustard dash + gauges
  const dash = new THREE.Group(); body.add(dash);
  add(dash, box(1.5, 0.2, 0.44, 0.08, MUSTARD), 0, 1.06, 0.86);
  add(dash, box(1.48, 0.36, 0.06, 0.03, '#b98428'), 0, 0.86, 0.64);
  // gauges: a raised binnacle straight ahead of the driver, tilted up at his eyes, so the dials sit just above the
  // wheel rim between his hands (stays readable in portrait too)
  const binn = new THREE.Group(); binn.position.set(0.48, 1.33, 0.8); binn.rotation.x = 0.38; dash.add(binn);
  const hood = add(binn, box(0.4, 0.17, 0.14, 0.05, '#c28d2c'), 0, -0.085, 0.02);
  add(binn, box(0.42, 0.04, 0.2, 0.02, '#a8741f'), 0, 0.075, -0.02);                               // little visor
  add(dash, box(0.3, 0.2, 0.12, 0.04, '#b98428'), 0.48, 1.08, 0.8);                                 // pedestal
  const needles = [];
  for (const x of [-0.085, 0.085]) {
    const g = add(binn, cyl(0.066, 0.066, 0.02, '#f3e6c8', 24), x, 0, -0.06); g.rotation.x = Math.PI / 2;
    const bz = add(binn, new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.009, 8, 28), feltMat('#3a2a26')), x, 0, -0.071); void bz;
    for (let k = 0; k < 7; k++) { const a = -2.2 + k * 4.4 / 6; const tk = add(binn, box(0.005, 0.016, 0.004, 0.001, '#3a2a26'), x + Math.sin(a) * 0.05, Math.cos(a) * 0.05, -0.072); tk.rotation.z = -a; }
    const n = new THREE.Group(); n.position.set(x, 0, -0.074); binn.add(n); add(n, box(0.009, 0.05, 0.004, 0.002, '#c0392b'), 0, 0, 0); n.rotation.z = x > 0 ? -0.7 : 0.4; needles.push(n);
  }
  // radio in the centre stack (the knob is the 'nope.' button's cousin)
  const radioBox = add(dash, box(0.34, 0.1, 0.05, 0.02, '#6b4a2e'), 0, 0.94, 0.6);
  const radioLed = add(dash, new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.035), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })), 0, 0.99, 0.572); radioLed.rotation.y = Math.PI;
  void hood; void radioBox;

  // ---------------------------------------------------------------- rear-view mirror (live) + pine air freshener
  const mirrorG = new THREE.Group(); mirrorG.position.set(0.26, 1.69, 0.4); mirrorG.scale.setScalar(0.62); body.add(mirrorG);
  add(mirrorG, box(0.33, 0.1, 0.03, 0.02, '#2e2422'), 0, 0, 0.012);
  add(mirrorG, cyl(0.012, 0.012, 0.16, '#2e2422'), 0, 0.1, 0.02);
  const rt = new THREE.WebGLRenderTarget(330, 100, { samples: 0 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const mirrorMat = new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }); mirrorMat.color.setScalar(1.45); rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1;
  const mirror = add(mirrorG, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.085), mirrorMat), 0, 0, -0.005); mirror.rotation.y = Math.PI;
  mirrorG.rotation.y = -0.25; mirrorG.rotation.x = -0.06;                                         // angled toward the driver's eye
  const mirrorCam = new THREE.PerspectiveCamera(24, 0.3 / 0.085, 0.05, 400);
  const fresh = new THREE.Group(); fresh.position.set(0.0, -0.05, -0.01); fresh.scale.setScalar(0.6); mirrorG.add(fresh);
  add(fresh, cyl(0.002, 0.002, 0.12, '#f4efe4', 4), 0, -0.06, 0);
  { const s = new THREE.Shape(); s.moveTo(0, 0); for (const [x, y] of [[0.045, -0.045], [0.022, -0.045], [0.06, -0.095], [0.03, -0.095], [0.07, -0.15], [0.008, -0.15], [0.008, -0.17], [-0.008, -0.17], [-0.008, -0.15], [-0.07, -0.15], [-0.03, -0.095], [-0.06, -0.095], [-0.022, -0.045], [-0.045, -0.045]]) s.lineTo(x, y); s.closePath();
    const tree = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }), feltMat('#2f7d4a')); tree.position.set(0, -0.115, -0.003); tree.castShadow = true; fresh.add(tree); }
  const fr = { ax: 0, vx: 0, az: 0, vz: 0, lastYaw: c.yaw, lastV: 0 };

  // ---------------------------------------------------------------- open windshield in first person
  // The boot car's windshield is a solid felt face panel (with eyes). From the driver's seat we cut it away with two
  // intersecting clip planes (in front of z 0.3 AND above y 1.25, car space) so he can see the road; shadows unaffected.
  const clipA = new THREE.Plane(), clipB = new THREE.Plane(), clipPlanes = [clipA, clipB]; let clipSet = false;
  const _n = new THREE.Vector3(), _o = new THREE.Vector3(), _bq = new THREE.Quaternion();
  function updateClip(on) {
    if (!clipSet && c.model) { clipSet = true; c.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; m.needsUpdate = true; } }); }
    if (!on) { clipA.set(_n.set(0, 1, 0), 1e5); clipB.set(_n, 1e5); return; }
    body.updateMatrixWorld(true); body.getWorldQuaternion(_bq);
    _n.set(0, 0, -1).applyQuaternion(_bq); body.localToWorld(_o.set(0, 0, 0.42)); clipA.setFromNormalAndCoplanarPoint(_n, _o);
    _n.set(0, -1, 0).applyQuaternion(_bq); body.localToWorld(_o.set(0, 1.25, 0)); clipB.setFromNormalAndCoplanarPoint(_n, _o);
  }

  // ---------------------------------------------------------------- the cast in the car
  // Wolf rides shotgun (rig drives the skinned wolf from main.js). Two felt blockouts in the back seat.
  const wolfRig = new THREE.Group(); wolfRig.position.copy(L.seat); body.add(wolfRig);
  const wolfFingers = new THREE.Group(); wolfRig.add(wolfFingers); wolfFingers.visible = false;
  for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 0.13, 0, 0.02); wolfFingers.add(p);
    add(p, sph(0.06, '#8d8a86'), 0, 0, 0); const f = add(p, cyl(0.016, 0.02, 0.16, '#8d8a86', 8), 0, 0.1, 0); f.rotation.z = sx * -0.25; p.userData.f = f; }
  CK.wolfRig = wolfRig; CK.wolfHeadYaw = 0;
  function blockout(name, x, z, col, extra) {
    const root = new THREE.Group(); root.position.set(x, 0.42, z); body.add(root);
    const torso = add(root, box(0.42, 0.55, 0.34, 0.16, col), 0, 0.55, 0);
    const headG = new THREE.Group(); headG.position.set(0, 0.98, 0.02); root.add(headG);
    const head = add(headG, sph(0.17, col), 0, 0, 0);
    const eyes = [-0.06, 0.06].map(ex => { const e = add(headG, sph(0.03, '#2a1c1a', 10, 8), ex, 0.03, 0.15); e.scale.set(1, 1.2, 0.6); return e; });
    const mouth = add(headG, sph(0.04, '#3a1a1a', 12, 8), 0, -0.06, 0.15); mouth.scale.set(1.3, 0.3, 0.5);
    const tongue = add(headG, sph(0.03, '#e86a7a', 10, 8), 0, -0.1, 0.16); tongue.scale.set(1, 1.4, 0.5); tongue.visible = false;
    const armsB = [1, -1].map(sx => { const sh = new THREE.Group(); sh.position.set(sx * 0.24, 0.76, 0); root.add(sh);
      const up = add(sh, cyl(0.045, 0.05, 0.36, col, 8), 0, -0.18, 0); void up;
      const hand = add(sh, sph(0.055, extra.hand || col), 0, -0.38, 0);
      const fing = new THREE.Group(); fing.position.set(0, -0.44, 0); sh.add(fing); fing.visible = false;
      for (const k of [-1, 1]) { const f = add(fing, cyl(0.012, 0.014, 0.12, extra.hand || col, 6), k * 0.018, -0.05, 0); f.rotation.z = k * 0.12; }
      return { sh, hand, fing, sx }; });
    const note = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex(), transparent: true, depthWrite: false, opacity: 0 })); note.scale.setScalar(0.12); note.position.set(0.12, 1.12, 0.2); root.add(note);
    if (extra.build) extra.build(root, headG, add, sph, cyl, box);
    const m = { name, root, torso, headG, head, eyes, mouth, tongue, arms: armsB, note, side: Math.sign(x) || 1, isBlock: true };
    void head; return m;
  }
  let _nt = null; function noteTex() { if (_nt) return _nt; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = '#fff3dc'; g.font = 'bold 54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 32, 34); _nt = new THREE.CanvasTexture(cv); _nt.colorSpace = THREE.SRGBColorSpace; return _nt; }
  // back-left (directly behind the driver): banana squid. back-right: shovel farmhand.
  const squid = blockout('banana squid', 0.42, -1.02, '#f2d04a', { hand: '#f2d04a', build(root, hg, add2, sph2) {
    const tip = add2(hg, sph2(0.09, '#6b4a2a'), 0, 0.17, -0.02); tip.scale.set(0.6, 0.8, 0.6);                 // banana stem cap
    for (let k = 0; k < 4; k++) { const t2 = add2(root, cyl(0.03, 0.015, 0.22, '#f2c43a', 6), -0.15 + k * 0.1, 0.26, 0.17); t2.rotation.x = 0.9; } } });
  const farm = blockout('farmhand', -0.44, -1.02, '#5a7ab0', { hand: '#d8a77a', build(root, hg, add2, sph2, cyl2) {
    hg.children[0].material = feltMat('#d8a77a');
    const brim = add2(hg, cyl2(0.27, 0.27, 0.02, '#e7cf7c', 20), 0, 0.12, 0); void brim;
    add2(hg, cyl2(0.13, 0.15, 0.12, '#e7cf7c', 16), 0, 0.19, 0); } });
  CK.cast = [squid, farm];
  const wolfM = { name: 'wolf', isWolf: true, side: -1 };
  CK.cast.push(wolfM);
  for (const m of CK.cast) Object.assign(m, { act: 'innocent', p: { lean: 0, yaw: 0, tilt: 0, mouth: 0.3, tongue: 0, shake: 0, armL: [0, 0], armR: [0, 0], fing: 0, note: 0, look: 0 }, watchedT: 0, unwatchedT: 0, snapDelay: 0, actT: rnd() * 2, nextAct: 1 + rnd() * 2 });

  // poses: lean (+ = toward the car's left/driver side), yaw (head/body turn, + = toward the car's left), arms [shoulder pitch, roll]
  const POSE = {
    innocent: { lean: 0, yaw: -0.9, tilt: 0.05, mouth: 0.25, tongue: 0, shake: 0, armL: [0.1, 0.05], armR: [0.1, -0.05], fing: 0, note: 1, look: -1 },
    face:     { lean: 0.22, yaw: 0.55, tilt: -0.2, mouth: 1.0, tongue: 1, shake: 0.15, armL: [-2.6, 0.9], armR: [-2.6, -0.9], fing: 0, note: 0, look: 1 },
    laugh:    { lean: 0.05, yaw: 0.3, tilt: -0.45, mouth: 0.8, tongue: 0, shake: 1, armL: [-1.7, 0.6], armR: [0.2, -0.2], fing: 0, note: 0, look: 1 },
    whisper:  { lean: -0.3, yaw: -0.5, tilt: 0.15, mouth: 0.5, tongue: 0, shake: 0.2, armL: [-1.9, -0.5], armR: [0.1, 0], fing: 0, note: 0, look: 0 },
    antennae: { lean: 0.15, yaw: 0.4, tilt: 0.1, mouth: 0.6, tongue: 0, shake: 0.35, armL: [-2.9, 0.25], armR: [-2.9, -0.25], fing: 1, note: 0, look: 1 },
  };
  const ACTS = ['face', 'laugh', 'whisper', 'antennae'];

  // ---------------------------------------------------------------- gaze: which way is the moth looking (car-local yaw, + = left)
  const eyeBody = () => _a.copy(EYE).add(driver.position);
  function angleTo(m) {
    const e = eyeBody(), p = m.isWolf ? wolfRig.position : m.root.position;
    let ang = Math.atan2(p.x - e.x, p.z - e.z);               // 0 = straight ahead, + = toward the car's left
    return clamp(ang, -2.55, 2.55);                            // he can't see straight behind; turning fully round counts
  }
  function updateCast(dt, t) {
    const gaze = CK.look.yaw;
    for (const m of CK.cast) {
      const watched = Math.abs(gaze - angleTo(m)) < 0.85;
      if (watched) { m.watchedT += dt; m.unwatchedT = 0; } else { m.unwatchedT += dt; m.watchedT = 0; }
      if (watched && m.act !== 'innocent') { if (m.snapDelay <= 0) m.snapDelay = 0.2 + rnd() * 0.25; m.snapDelay -= dt; if (m.snapDelay <= 0) { m.act = 'innocent'; m.fast = 1; } }
      else if (!watched) {
        m.snapDelay = 0;
        m.actT += dt;
        if (m.act === 'innocent' && m.unwatchedT > 0.9 + (m.isWolf ? 0.5 : 0)) { m.act = pickAct(m); m.actT = 0; m.nextAct = 2 + rnd() * 2.5; m.fast = 0; }
        else if (m.act !== 'innocent' && m.actT > m.nextAct) { m.act = pickAct(m); m.actT = 0; m.nextAct = 2 + rnd() * 2.5; }
      }
      if (CK.forceAct && !watched) m.act = CK.forceAct;
      const P = POSE[m.act], k = 1 - Math.exp(-dt * (m.fast ? 22 : 6)), p = m.p;
      for (const key of ['lean', 'yaw', 'tilt', 'mouth', 'tongue', 'shake', 'fing', 'note', 'look']) p[key] = lerp(p[key], P[key], k);
      for (const key of ['armL', 'armR']) { p[key][0] = lerp(p[key][0], P[key][0], k); p[key][1] = lerp(p[key][1], P[key][1], k); }
      if (m.fast && Math.abs(p.yaw - P.yaw) < 0.05) m.fast = 0;
      applyPose(m, t);
    }
  }
  function pickAct(m) {
    const a = ACTS.filter(x => !(m.isWolf && x === 'whisper')); let n; do { n = a[Math.floor(rnd() * a.length)]; } while (n === m.act && a.length > 1); return n;
  }
  function applyPose(m, t) {
    const p = m.p, shake = Math.sin(t * 38) * 0.03 * p.shake, bob = Math.abs(Math.sin(t * 9)) * 0.03 * p.shake;
    if (m.isWolf) {
      // the skinned wolf: whole-body lean/turn on the rig, head turn via the head bone in main.js, finger antennae prop
      wolfRig.rotation.set(0, p.yaw * 0.45, p.lean * 0.5 + shake);
      wolfRig.position.set(L.seat.x, L.seat.y + bob, L.seat.z);
      CK.wolfHeadYaw = p.yaw * 0.6; CK.wolfHeadTilt = p.tilt * 0.5;
      wolfFingers.visible = p.fing > 0.3; wolfFingers.position.set(0, (CK.wolfH || 1.6) * 0.98, 0.05);
      wolfFingers.scale.setScalar(Math.max(0.01, p.fing));
      wolfFingers.children.forEach((q, i) => { q.userData.f.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 9 + i) * 0.35); });
      return;
    }
    const s = m.side;   // + = left side of the car
    m.root.rotation.set(0, p.yaw * s * (p.yaw > 0 ? 1 : 1) * 0.5, p.lean * s + shake);
    m.root.position.y = 0.42 + bob;
    // whisper leans toward the other back-seat passenger; others turn toward the driver (front-left = +x, +z)
    if (m.act === 'whisper' || p.look === 0) m.root.rotation.y = -s * 0.5 * Math.abs(p.yaw);
    else if (p.look > 0) m.root.rotation.y = (s > 0 ? 0.2 : 0.75) * p.yaw;
    else m.root.rotation.y = s * Math.abs(p.yaw) * 0.9;        // innocent: turned away to his own window
    m.headG.rotation.set(p.tilt, 0, 0);
    m.mouth.scale.set(1.3 - p.mouth * 0.2, 0.3 + p.mouth * 0.9, 0.5);
    m.tongue.visible = p.tongue > 0.4; m.tongue.position.y = -0.1 - p.tongue * 0.03;
    m.arms.forEach((A, i) => { const v = i === 0 ? p.armL : p.armR; A.sh.rotation.set(v[0], 0, v[1] * A.sx * (i === 0 ? 1 : -1));
      A.fing.visible = p.fing > 0.4; A.fing.rotation.y = Math.sin(t * 10 + i) * 0.5; });
    m.note.material.opacity = p.note * (0.5 + 0.5 * Math.sin(t * 3 + s));
    m.note.position.set(0.15 * s, 1.15 + ((t * 0.4 + (s > 0 ? 0.5 : 0)) % 1) * 0.25, 0.25);
  }

  // ---------------------------------------------------------------- head look (drag the upper screen, snap back on release)
  const ptr = { id: null, x: 0, y: 0 };
  const canvas = document.querySelector('canvas#c') || document.querySelector('canvas');
  const fpOn = () => L.mode === 'drive' && !L.frozen; // head look in first person, orbit the chase cam in the chase view
  addEventListener('pointerdown', e => {
    if (!fpOn() || ptr.id !== null || e.target.tagName !== 'CANVAS') return;
    const portrait = innerHeight > innerWidth; if (e.clientY > innerHeight * (portrait ? 0.6 : 0.62)) return;
    ptr.id = e.pointerId; ptr.x = e.clientX; ptr.y = e.clientY; CK.look.held = true; try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
  });
  addEventListener('pointermove', e => {
    if (e.pointerId !== ptr.id) return;
    const s = 2.6 / Math.max(innerWidth, 500);
    CK.look.tyaw = clamp(CK.look.tyaw + (e.clientX - ptr.x) * s, -2.1, 2.1); CK.look.tpitch = clamp(CK.look.tpitch - (e.clientY - ptr.y) * s * 0.8, CK.pitchMin, 0.3);
    ptr.x = e.clientX; ptr.y = e.clientY;
  });
  const end = e => { if (e.pointerId === ptr.id) { ptr.id = null; CK.look.held = false; } };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  addEventListener('keydown', e => { if (e.code === 'KeyC' && L.mode === 'drive' && !L.frozen) CK.setChase(!CK.chase); if (e.code === 'KeyQ') CK.keyLook = 1; if (e.code === 'KeyE' && L.mode === 'drive') CK.keyLook = -1; });
  addEventListener('keyup', e => { if (e.code === 'KeyQ' || e.code === 'KeyE') CK.keyLook = 0; });
  void canvas;

  // in-car view choice, remembered for the session (first person by default)
  L.look = CK.look; // level.chaseCam reads it
  CK.setChase = v => { CK.chase = !!v; try { sessionStorage.setItem('sunspots.chase', CK.chase ? '1' : '0'); } catch (_) {} };
  CK.savedChase = () => { try { return sessionStorage.getItem('sunspots.chase') === '1'; } catch (_) { return false; } };

  // ---------------------------------------------------------------- per frame
  CK.update = (dt, t) => {
    const lk = CK.look;
    if (CK.keyLook) { lk.tyaw = clamp(lk.tyaw + CK.keyLook * dt * 2.4, -2.1, 2.1); }
    else if (!lk.held && CK.holdLook == null) { lk.tyaw *= Math.exp(-dt * 5); lk.tpitch *= Math.exp(-dt * 5); }   // snap back to the road
    if (CK.holdLook != null) { lk.tyaw = CK.holdLook[0]; lk.tpitch = CK.holdLook[1]; }
    const kk = 1 - Math.exp(-dt * 14); lk.yaw = lerp(lk.yaw, lk.tyaw, kk); lk.pitch = lerp(lk.pitch, lk.tpitch, kk);
    // wheel turns with steering (a 70s wheel needs a lot of arm)
    wheelSpin.rotation.z = -c.steer * 1.05; // hands stay on their own sides of the rim (no arm crossing through the camera)
    if (!CK.moth) aimArms();
    const fp = L.mode === 'drive' && !CK.chase && !CK.sceneView;
    for (const o of headParts) o.visible = !fp && !CK.moth;
    updateClip(fp);
    binn.visible = mirrorG.visible = fp || L.mode !== 'drive'; // cockpit-only bits off in the chase view (windshield panel comes back via updateClip)
    { const por = innerHeight > innerWidth; mirrorG.position.set(por ? 0.43 : 0.26, por ? 1.71 : 1.69, por ? 0.5 : 0.4); mirrorG.scale.setScalar(por ? 0.3 : 0.62); mirrorG.rotation.y = por ? 0 : -0.25; }
    // needles: speedo follows speed, the other one (fuel? nerves?) twitches
    needles[1].rotation.z = 2.0 - clamp(Math.abs(c.v) / 22, 0, 1) * 4.0; needles[0].rotation.z = 0.4 + Math.sin(t * 0.7) * 0.05 + Math.sin(t * 9) * 0.01;
    // freshener: pendulum pushed by the waddle and by turning
    const yawRate = (c.yaw - fr.lastYaw) / Math.max(dt, 1e-3); fr.lastYaw = c.yaw; const acc = (c.v - fr.lastV) / Math.max(dt, 1e-3); fr.lastV = c.v;
    const latF = -yawRate * c.v * 0.06 + (c.bodyRoll || 0) * 6, lonF = acc * 0.03 + (c.bodyPitch || 0) * 4;
    fr.vz += (-fr.az * 30 - fr.vz * 1.6 + latF) * dt; fr.az += fr.vz * dt; fr.vx += (-fr.ax * 30 - fr.vx * 1.6 + lonF) * dt; fr.ax += fr.vx * dt;
    fr.az = clamp(fr.az, -0.9, 0.9); fr.ax = clamp(fr.ax, -0.7, 0.7);
    fresh.rotation.set(fr.ax, Math.sin(t * 0.7) * 0.6, fr.az);
    radioLed.material.color.setHSL(0.08, 1, 0.55 + 0.1 * Math.sin(t * 13));
    updateCast(dt, t);
  };

  // first-person camera: the moth's eyes. Waddle bob is kept gentle (half the bounce, a third of the roll).
  const _m = new THREE.Matrix4(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
  CK.camera = (camera) => {
    c.root.updateMatrixWorld(true);
    const lk0 = CK.look; _p.copy(EYE);
    if (CK.moth) { const kd = clamp((-lk0.pitch - 0.3) / 0.8, 0, 1); _p.z -= 0.18 * kd; _p.y += 0.04 * kd; } // looking down: lean the head over his chest
    _p.add(driver.position); _p.y += c.body.position.y * 0.5;
    _p.applyMatrix4(c.root.matrixWorld);
    camera.position.copy(_p);
    const lk = CK.look;
    _e.set(-0.07 + lk.pitch + (c.bodyPitch || 0) * 0.4 + (c.pitch || 0) * 0.5, c.yaw + Math.PI + lk.yaw, (c.bodyRoll || 0) * -0.33 + (c.lean || 0) * -0.3);
    camera.quaternion.setFromEuler(_e);
  };
  // rear-view mirror: render the back seat (and the road behind) into the mirror every other frame
  let mf = 0;
  CK.renderMirror = (renderer, scene) => {
    if (L.mode !== 'drive' || CK.chase || CK.sceneView || (mf++ & 1)) return;
    mirrorG.updateMatrixWorld(true); mirrorG.getWorldPosition(_p); mirrorCam.position.copy(_p);
    _a.set(0.0, 1.05, -1.6); body.localToWorld(_a); mirrorCam.lookAt(_a);
    mirrorCam.layers.enableAll();
    const vis = headParts.map(o => o.visible); headParts.forEach(o => o.visible = false); mirror.visible = false;
    const prevRT = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, mirrorCam); renderer.setRenderTarget(prevRT);
    headParts.forEach((o, i) => o.visible = vis[i]); mirror.visible = true;
  };
  CK.mirrorCam = mirrorCam;
  // the real moth model takes over: his own gloved hands/arms on the wheel (IK in moth.js), stand-in parts hidden
  CK.hands = hands; CK.EYE = EYE; CK.pitchMin = -0.35;
  CK.useMoth = (m) => {
    CK.moth = m; CK.pitchMin = -1.2; EYE.set(0, 1.55, 0.1);                                     // look down far enough to see his air-freshener necklace
    for (const h of hands) h.children.forEach(o => o.visible = false);
    for (const A of arms) A.m.visible = false;
    for (const o of headParts) o.visible = false;
    driver.children.forEach(o => { if (o.isMesh && o !== m.holder) o.visible = false; });
  };
  // wild mode: the back-seat blockouts get the rider fuzzy-melt too
  if (H.patchRider) { CK.rm = { value: 0 }; let sd = 2; for (const b of [squid, farm]) { sd += 1.7; b.root.traverse(o => { if (o.isMesh && !o.isSprite) H.patchRider(o.material, sd, CK.rm); }); } }
  // cabin fill: the roof shades the cockpit, so give the props a soft warm self-light (cheaper than another light)
  for (const g of [dash, wheelTilt, mirrorG]) g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !o.material.map?.isRenderTargetTexture) { o.material.emissive.copy(o.material.color).multiplyScalar(0.28); } });
  return CK;
}
