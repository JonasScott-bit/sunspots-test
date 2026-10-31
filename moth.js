// The rideshare moth driver (Meshy model, rigged; clips: seated / idle / walk).
// Seated in the boot car's driver seat with his own gloved hands IK'd onto the cockpit wheel grips (they follow the
// steering). In first person his head collapses (we ARE his eyes) and you can look down at his pine air-freshener
// necklace. Before pickup he climbs out, walks over to greet the Wolf, nods, and is back behind the wheel on entry.
import * as THREE from 'three';

export function createMoth(gltf, L, CK, H) {
  const { scene, patchRider } = H;
  const c = L.car, driver = c.driver;
  const model = gltf.scene;
  const B = {}; model.traverse(o => { if (o.isBone) B[o.name] = o; });
  const meshes = []; model.traverse(o => { if (o.isMesh) { meshes.push(o); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    for (const m of [].concat(o.material)) { m.metalness = 0; m.roughness = Math.max(m.roughness ?? 1, 0.85);
      // cabin fill: the roof shades him, so a soft self-light from his own texture (same trick as the dash)
      if (m.map && m.emissive) { m.emissive.setScalar(0.32); m.emissiveMap = m.map; m.emissiveIntensity = 1; } } } });
  const holder = new THREE.Group(); holder.add(model);
  // the boot car's roof is low, so he folds his antennae back while seated: baked as a morph target (influence 1 in
  // the seat, 0 when he climbs out and stands up)
  const skinned = meshes.filter(m => m.isSkinnedMesh);
  function foldAntennae(mesh) {
    const sk = mesh.skeleton, hi = sk.bones.indexOf(B.Head), ei = sk.bones.indexOf(B.head_end); if (hi < 0 || ei < 0) return false;
    const bp = i => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrixInverse);
    const hp = bp(hi), ep = bp(ei), unit = ep.distanceTo(hp), thr = ep.y - unit * 0.12;
    const P = mesh.geometry.attributes.position, v = new THREE.Vector3(), d = new Float32Array(P.count * 3);
    const piv = [[0, 0, 0, 0], [0, 0, 0, 0]];                       // per side: base pivot (avg of the band just above thr)
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y > thr && v.y < thr + unit * 0.1) { const k = v.x > hp.x ? 0 : 1; piv[k][0] += v.x; piv[k][1] += v.y; piv[k][2] += v.z; piv[k][3]++; } }
    const pv = piv.map(a => new THREE.Vector3(a[0], a[1], a[2]).divideScalar(Math.max(1, a[3])));
    const back = -faceZ0, ang = 1.75, q = new THREE.Quaternion(), w = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y <= thr) continue;
      const k = v.x > hp.x ? 0 : 1, f = THREE.MathUtils.smoothstep(v.y - thr, 0, unit * 0.25);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), back * ang * f);
      w.copy(v).sub(pv[k]).applyQuaternion(q).add(pv[k]).sub(v); w.x *= 1; d[i * 3] = w.x; d[i * 3 + 1] = w.y; d[i * 3 + 2] = w.z; n++; }
    mesh.geometry.morphAttributes.position = [new THREE.BufferAttribute(d, 3)]; mesh.geometry.morphTargetsRelative = true;
    mesh.updateMorphTargets(); mesh.morphTargetInfluences[0] = 1; return n;
  }
  // which way does the bind pose face? (headfront ahead of Head)
  model.updateMatrixWorld(true);
  const faceZ0 = Math.sign(B.headfront ? B.headfront.getWorldPosition(new THREE.Vector3()).z - B.Head.getWorldPosition(new THREE.Vector3()).z : 1) || 1;
  const folded = skinned.map(foldAntennae);
  const mixer = new THREE.AnimationMixer(model);
  const clip = n => gltf.animations.find(a => a.name === n) || gltf.animations[0];
  const A = { seated: mixer.clipAction(clip('seated')), idle: mixer.clipAction(clip('idle')), walk: mixer.clipAction(clip('walk')) };
  A.seated.play();

  // ---- measure the seated pose and fit it to the driver seat: head bone lands at the cockpit eye height
  mixer.setTime(1.5); model.updateMatrixWorld(true);
  const wp = (b, v = new THREE.Vector3()) => b.getWorldPosition(v);
  const head0 = wp(B.Head), hips0 = wp(B.Hips), front0 = wp(B.headfront || B.head_end);
  const faceZ = Math.sign(front0.z - head0.z) || 1;                  // which way the model faces in its own space
  model.rotation.y = faceZ > 0 ? 0 : Math.PI;
  const HEAD_AT = new THREE.Vector3(0, 1.45, 0.0);                  // driver space (skull top lands just under the roof)
  const HIPS_Y = 0.8;
  const s = (HEAD_AT.y - HIPS_Y) / Math.max(0.05, head0.y - hips0.y);
  holder.scale.setScalar(s);
  holder.updateMatrixWorld(true); model.updateMatrixWorld(true);
  const headNow = wp(B.Head); // root-relative after rotation+scale (holder at origin)
  const seatPos = new THREE.Vector3().subVectors(HEAD_AT, headNow);
  // stand height (for walking outside): measured from the idle clip
  A.seated.stop(); A.idle.play(); mixer.setTime(0); model.updateMatrixWorld(true);
  const bb = new THREE.Box3(); for (const m of meshes) { m.geometry.computeBoundingBox(); }
  const standHead = wp(B.Head).y; A.idle.stop(); A.seated.play(); mixer.setTime(0);
  const M = { holder, B, folded, scale: s, state: 'seat', greeted: false, nod: 0, seatPos, standHead, faceZ, seated: true };
  void bb;
  function seat() {
    driver.add(holder); holder.position.copy(seatPos); holder.rotation.set(0, 0, 0); holder.scale.setScalar(s);
    for (const k in A) if (k !== 'seated') A[k].stop(); A.seated.reset().setEffectiveWeight(1).play();
    M.state = 'seat'; M.seated = true; setFold(1);
  }
  function setFold(k) { for (const m of skinned) if (m.morphTargetInfluences) m.morphTargetInfluences[0] = k; M.fold = k; }
  seat();
  // wild mode: fuzzy melt (rider shader works on skinned meshes, in car space)
  M.rm = { value: 0 };
  for (const m of meshes) for (const mat of [].concat(m.material)) patchRider(mat, 1.3, M.rm);

  // ---- two-bone IK (shoulder->elbow->wrist) onto a world target, elbow bent toward a pole point
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3(), _e = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _pqi = new THREE.Quaternion();
  function aimBone(bone, from, to) { // rotate bone (world) so the direction bone->from points bone->to
    bone.getWorldPosition(_e);
    const v0 = from.clone().sub(_e).normalize(), v1 = to.clone().sub(_e).normalize();
    _q.setFromUnitVectors(v0, v1);
    bone.parent.getWorldQuaternion(_pq); _pqi.copy(_pq).invert();
    bone.quaternion.premultiply(_pq).premultiply(_q).premultiply(_pqi);
    bone.updateMatrixWorld(true);
  }
  function ik(upper, lower, end, target, pole) {
    upper.updateMatrixWorld(true);
    wp(upper, _a); wp(lower, _b); wp(end, _c);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
    _t.copy(target); _d.subVectors(_t, _a); let dist = _d.length(); _d.normalize();
    dist = THREE.MathUtils.clamp(dist, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    _n.subVectors(pole, _a); _n.addScaledVector(_d, -_n.dot(_d)).normalize();
    const elbow = _a.clone().addScaledVector(_d, l1 * cosA).addScaledVector(_n, l1 * sinA);
    aimBone(upper, _b.clone(), elbow);
    wp(end, _c); aimBone(lower, _c.clone(), _t);
  }
  const _tw = new THREE.Vector3(), _pw = new THREE.Vector3();
  function handsOnWheel() {
    driver.updateWorldMatrix(true, true);                         // parents too: the car moved this frame; a stale body matrix mixed with fresh getWorldQuaternion() made the arms jump
    for (const h of CK.hands) {
      h.updateMatrixWorld(true);
      h.localToWorld(_tw.set(0, -0.045, -0.05));                    // wrist just behind/below the grip, glove wraps the rim
      const side = Math.sign(h.position.x) || 1;                    // fixed arm per grip (rest side). Picking by the grip's live x swapped both grips onto one arm past ~60 deg of wheel, leaving the other arm to pop back to its idle pose: the in/out arm flicker
      const up = side > 0 ? B.LeftArm : B.RightArm, lo = side > 0 ? B.LeftForeArm : B.RightForeArm, en = side > 0 ? B.LeftHand : B.RightHand;
      if (!up || !lo || !en) continue;
      const pole = driver.localToWorld(new THREE.Vector3(side * 0.55, 0.85, 0.15));
      ik(up, lo, en, _tw, pole);
    }
  }

  // ---- update (after cockpit.update so the wheel grips are current)
  const _wolf = new THREE.Vector3(), _door = new THREE.Vector3(), _mp = new THREE.Vector3();
  let fadeT = 0;
  M.update = (dt, t, wolfPos, wild) => {
    const fp = L.mode === 'drive' && !CK.chase;
    // greeting: Wolf approaches the parked car on foot -> moth climbs out and walks over
    if (L.mode === 'walk' && M.state === 'seat' && !M.greeted && wolfPos && !window.__titleUp) {
      c.root.updateMatrixWorld(true); _mp.copy(c.root.position);
      if (Math.hypot(wolfPos.x - _mp.x, wolfPos.z - _mp.z) < 9.5) {
        M.greeted = true; M.state = 'out'; M.seated = false; fadeT = 0;
        driver.updateMatrixWorld(true); scene.attach(holder);
        c.body.localToWorld(_door.set(1.55, 0, -0.1)); _door.y = 0;
        M.from = holder.position.clone(); M.to = _door.clone();
        A.walk.reset().setEffectiveWeight(1).play(); A.seated.crossFadeTo(A.walk, 0.35, false);
      }
    }
    if (M.state === 'out') { // slide out through the driver door (legs hidden by the car body)
      fadeT = Math.min(1, fadeT + dt / 0.7); const k = fadeT * fadeT * (3 - 2 * fadeT);
      holder.position.lerpVectors(M.from, M.to, k); setFold(1 - k);   // antennae spring back up as he stands
      holder.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(wolfPos.x - holder.position.x, wolfPos.z - holder.position.z), 0)), 1 - Math.exp(-dt * 6));
      if (fadeT >= 1) M.state = 'walk';
    } else if (M.state === 'walk' || M.state === 'greet') {
      _wolf.set(wolfPos.x - holder.position.x, 0, wolfPos.z - holder.position.z); const d = _wolf.length();
      const yaw = Math.atan2(_wolf.x, _wolf.z); const cur = new THREE.Euler().setFromQuaternion(holder.quaternion, 'YXZ').y;
      let dy = yaw - cur; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); holder.rotation.set(0, cur + dy * (1 - Math.exp(-dt * 5)), 0);
      if (M.state === 'walk') {
        holder.position.addScaledVector(_wolf.normalize(), Math.min(d - 1.7, 1.15 * dt));
        // don't wander off the curb toward the town: stay within 5 m of the car
        _mp.copy(c.root.position); _mp.y = 0; const off = holder.position.clone().sub(_mp); off.y = 0; if (off.length() > 5) holder.position.copy(_mp).add(off.setLength(5));
        if (d < 1.8 || off.length() >= 5) { M.state = 'greet'; M.nod = 0; A.idle.reset().play(); A.walk.crossFadeTo(A.idle, 0.3, false); }
      } else if (d > 3.2 && !M.waited) { M.state = 'walk'; A.walk.reset().play(); A.idle.crossFadeTo(A.walk, 0.3, false); }
      if (M.state === 'greet') M.nod += dt;
    }
    if (L.mode === 'drive' && M.state !== 'seat') seat();
    mixer.update(dt);
    // greeting nod (one slow nod, then the occasional tiny one)
    if (M.state === 'greet' && B.Head) { const n = M.nod; const a = n < 1.2 ? Math.sin(n / 1.2 * Math.PI) * 0.35 : Math.max(0, Math.sin((n - 1.2) * 1.3)) * 0.04; B.Head.rotateX(a); }
    // seated: hands on the wheel; FP: head gone (we look out of it)
    if (M.state === 'seat') {
      // FP look-down: he sits up and puffs his chest so the air-freshener necklace swings into view
      const kd = fp ? THREE.MathUtils.clamp((-CK.look.pitch - 0.3) / 0.8, 0, 1) : 0;
      if (kd > 0 && B.Spine02) B.Spine02.rotateX(-0.9 * kd);
      handsOnWheel();
      if (B.Head) B.Head.scale.setScalar(fp ? 0.001 : 1);
      if (B.neck) B.neck.scale.setScalar(fp ? 0.001 : 1);
    } else { if (B.Head) B.Head.scale.setScalar(1); if (B.neck) B.neck.scale.setScalar(1); }
    M.rm.value = M.state === 'seat' ? (wild || 0) : 0;
    void t;
  };
  M.reset = () => { M.greeted = false; seat(); };
  M.skipGreet = () => { M.greeted = true; };
  return M;
}
