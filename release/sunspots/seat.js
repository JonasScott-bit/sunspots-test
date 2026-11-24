// Nov 16 (believability B1-B3): sit any Meshy-rigged character (Wolf, Squid, Farmhand: same bone names) in a seat.
// No seated clip exists for these rigs, so the pose is solved in world space on top of whatever the mixer left:
//   hips pinned to the cushion, thighs forward along the seat, shins down to the floor, feet flat,
//   hands IK'd onto two world targets (wheel grips) or resting on the thighs.
// frame = Matrix4 of the seat (x = his left, y = up, z = forward), all targets in that frame (metres).
import * as THREE from 'three';
const NAMES = ['Hips', 'Spine', 'Spine01', 'Spine02', 'neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3(), _e = new THREE.Vector3();
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _fq = new THREE.Quaternion(), _s = new THREE.Vector3();
const _fx = new THREE.Vector3(), _fy = new THREE.Vector3(), _fz = new THREE.Vector3(), _fo = new THREE.Vector3(), _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3();
const wp = (o, v) => o.getWorldPosition(v);
function aim(bone, from, to) {           // rotate bone (world) so bone->from points along bone->to
  wp(bone, _e); _v0.copy(from).sub(_e); _v1.copy(to).sub(_e); if (_v0.lengthSq() < 1e-10 || _v1.lengthSq() < 1e-10) return;
  _q.setFromUnitVectors(_v0.normalize(), _v1.normalize());
  bone.parent.getWorldQuaternion(_pq); const pqi = _pq.clone().invert();
  bone.quaternion.premultiply(_pq).premultiply(_q).premultiply(pqi); bone.updateMatrixWorld(true);
}
function twoBone(up, lo, end, target, pole) {
  wp(up, _a); wp(lo, _b); wp(end, _c);
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
  _d.subVectors(target, _a); let dist = _d.length(); _d.normalize();
  dist = THREE.MathUtils.clamp(dist, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _n.subVectors(pole, _a); _n.addScaledVector(_d, -_n.dot(_d)); if (_n.lengthSq() < 1e-8) _n.set(0, -1, 0); _n.normalize();
  const elbow = _a.clone().addScaledVector(_d, l1 * cosA).addScaledVector(_n, l1 * sinA);
  aim(up, _b.clone(), elbow); wp(end, _c); aim(lo, _c.clone(), target);
}
export function createSitter(root, model = root) {
  const B = {}; for (const n of NAMES) B[n] = model.getObjectByName(n);
  const ok = !!(B.Hips && B.LeftUpLeg && B.LeftLeg && B.LeftFoot && B.RightUpLeg && B.RightLeg && B.RightFoot);
  const rest = new Map(); model.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const S = { B, ok };
  S.reset = () => { for (const [b, q] of rest) b.quaternion.copy(q); };   // for rigs without a mixer (back-seat riders)
  const F = (x, y, z, out) => out.copy(_fo).addScaledVector(_fx, x).addScaledVector(_fy, y).addScaledVector(_fz, z);
  // P: { hip:[x,y,z], knee: thigh drop (rad), spread, shin: shin forward lean (rad), lean: torso forward (rad),
  //      grips: [Vector3 left, Vector3 right] (world) | null, handUp, legsOnly: fold the legs only (hips/torso/arms untouched) }
  S.pose = (frame, P) => {
    if (!ok) return;
    frame.decompose(_fo, _fq, _s); _fx.set(1, 0, 0).applyQuaternion(_fq); _fy.set(0, 1, 0).applyQuaternion(_fq); _fz.set(0, 0, 1).applyQuaternion(_fq);
    root.updateMatrixWorld(true);
    if (!P.legsOnly) {
    // 1) pin the hips to the cushion (move the whole character)
    wp(B.Hips, _a); F(P.hip[0], P.hip[1], P.hip[2], _t); _t.sub(_a);
    if (root.parent) { root.parent.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.parent.matrixWorld).invert(); const p0 = root.getWorldPosition(new THREE.Vector3()).add(_t).applyMatrix4(inv); root.position.copy(p0); } else root.position.add(_t);
    root.updateMatrixWorld(true);
    // 2) torso: sit upright in the seat frame, then a little forward lean (toward the wheel)
    const sp = B.Spine || B.Spine01; if (sp && B.neck) { wp(B.neck, _b); wp(sp, _a); const L = _a.distanceTo(_b); F(0, 0, 0, _c).sub(_fo); _c.copy(_a).addScaledVector(_fy, L * Math.cos(P.lean || 0)).addScaledVector(_fz, L * Math.sin(P.lean || 0)); aim(sp, _b.clone(), _c); }
    }
    // 3) legs: thigh forward along the seat, shin down to the floor, foot flat
    for (const [u, l, f, t] of [[B.LeftUpLeg, B.LeftLeg, B.LeftFoot, B.LeftToeBase], [B.RightUpLeg, B.RightLeg, B.RightFoot, B.RightToeBase]]) {
      wp(u, _a); wp(l, _b); wp(f, _c); const th = _a.distanceTo(_b), sh = _b.distanceTo(_c);
      const side = Math.sign(_v0.copy(_a).sub(_fo).dot(_fx)) || 1, dr = P.knee ?? 0.12, spr = P.spread ?? 0.06;
      const knee = _a.clone().addScaledVector(_fz, th * Math.cos(dr)).addScaledVector(_fy, -th * Math.sin(dr)).addScaledVector(_fx, side * spr);
      aim(u, _b.clone(), knee);
      const sl = P.shin ?? 0.15; const foot = knee.clone().addScaledVector(_fy, -sh * Math.cos(sl)).addScaledVector(_fz, sh * Math.sin(sl));
      wp(f, _c); aim(l, _c.clone(), foot);
      if (t) { wp(t, _d); const fl = _d.distanceTo(foot) || 0.1; aim(f, _d.clone(), foot.clone().addScaledVector(_fz, fl * 0.97).addScaledVector(_fy, -fl * 0.25)); }
    }
    // 4) arms: wheel grips, or hands resting on the thighs
    if (!P.legsOnly) for (const [k, up, lo, en] of [[0, B.LeftArm, B.LeftForeArm, B.LeftHand], [1, B.RightArm, B.RightForeArm, B.RightHand]]) {
      if (!up || !lo || !en) continue;
      let tg; const sx = k ? -1 : 1;
      if (P.grips) tg = P.grips[k];
      else { const knee = (k ? B.RightLeg : B.LeftLeg), hip = (k ? B.RightUpLeg : B.LeftUpLeg); tg = wp(knee, new THREE.Vector3()).lerp(wp(hip, _e), 0.35).addScaledVector(_fy, 0.07 * (P.handUp ?? 1)); }
      wp(up, _a); const pole = _a.clone().addScaledVector(_fy, -1).addScaledVector(_fx, sx * 0.8).addScaledVector(_fz, -0.3);
      twoBone(up, lo, en, tg, pole);
    }
    root.updateMatrixWorld(true);
  };
  return S;
}
