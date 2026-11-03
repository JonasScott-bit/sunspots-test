// paw_fur.js — Sunspots run 9c: fur shading for the first-person Wolf paw (geometry from paw_mesh.js).
// Same look as the Wolf v4 fur: short strands combed along each vertex's 'aDir', a soft fuzzy rim, lighter tips ('aTip'), darker pads ('aPad').
// MeshStandardMaterial + onBeforeCompile (keeps the room's lights/tone mapping). One 3D value-noise fetch pair per fragment; fades with distance (fwidth).
import * as THREE from 'three';
export const FUR_COLORS = { base: '#4b4f5a', tip: '#808594', pad: '#2a282f', rim: '#a9adbb' };
export function pawFurMaterial(opts = {}) {
  const C = { ...FUR_COLORS, ...opts };
  const m = new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
  const U = { uTip: { value: new THREE.Color(C.tip) }, uPad: { value: new THREE.Color(C.pad) }, uRim: { value: new THREE.Color(C.rim) }, uFreq: { value: opts.freq ?? 520 }, uBump: { value: opts.bump ?? 0.00035 } };
  m.userData.u = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aDir; attribute float aTip; attribute float aPad; varying vec3 vFP; varying vec3 vFD; varying float vTip; varying float vPad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFP = position; vFD = aDir; vTip = aTip; vPad = aPad;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', /* glsl */`#include <common>
uniform vec3 uTip; uniform vec3 uPad; uniform vec3 uRim; uniform float uFreq; uniform float uBump;
varying vec3 vFP; varying vec3 vFD; varying float vTip; varying float vPad;
float fh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fh(i), fh(i + vec3(1, 0, 0)), f.x), mix(fh(i + vec3(0, 1, 0)), fh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(fh(i + vec3(0, 0, 1)), fh(i + vec3(1, 0, 1)), f.x), mix(fh(i + vec3(0, 1, 1)), fh(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float strands(vec3 p, vec3 d) { vec3 q = p - d * dot(p, d) * 0.88; return fn(q * uFreq) * 0.65 + fn(q * uFreq * 2.3 + 7.1) * 0.35; }`)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
  vec3 fd = normalize(vFD + 1e-5);
  float sLod = 1.0 - smoothstep(0.35, 0.9, length(fwidth(vFP)) * uFreq);   // strands fade out before they would alias
  float st = mix(0.5, strands(vFP, fd), sLod);
  float tipK = clamp(vTip, 0.0, 1.0);
  vec3 furC = mix(diffuseColor.rgb, uTip, tipK * (0.55 + 0.45 * st));
  furC *= mix(0.6, 1.24, st);                                   // directional strand light/dark streaks
  diffuseColor.rgb = mix(furC, uPad * mix(0.9, 1.05, st), clamp(vPad, 0.0, 1.0));`)
      .replace('#include <normal_fragment_maps>', /* glsl */`#include <normal_fragment_maps>
  { float hh = st * (1.0 - vPad) * uBump; vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float hx = dFdx(hh), hy = dFdy(hh);
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1); vec3 g = sign(det) * (hx * r1 + hy * r2);
    normal = normalize(abs(det) * normal - g); }`)
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
  { float fr = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));   // soft fuzzy rim (back-lit fur halo)
    totalEmissiveRadiance += uRim * pow(fr, 2.6) * (0.3 + 0.2 * st) * (1.0 - vPad); }`);
  };
  m.customProgramCacheKey = () => 'sunspots-pawfur-v1';
  return m;
}
// BufferGeometry from a paw_mesh builder ({pos,nrm,dir,tip,pad}); idx optional (thumb shares a fixed topology)
export function pawGeometry(o, idx, dynamic = false) {
  const g = new THREE.BufferGeometry(), A = (a, n) => { const b = new THREE.BufferAttribute(new Float32Array(a), n); if (dynamic) b.setUsage(THREE.DynamicDrawUsage); return b; };
  g.setAttribute('position', A(o.pos, 3)); g.setAttribute('normal', A(o.nrm, 3)); g.setAttribute('aDir', A(o.dir, 3)); g.setAttribute('aTip', A(o.tip, 1)); g.setAttribute('aPad', A(o.pad, 1));
  const I = idx || o.idx; g.setIndex(I.length > 65535 ? I : new THREE.BufferAttribute(new Uint16Array(I), 1)); g.computeBoundingSphere(); return g;
}
export function refillPaw(g, o) { for (const [k, a] of [['position', o.pos], ['normal', o.nrm], ['aDir', o.dir], ['aTip', o.tip], ['aPad', o.pad]]) { const b = g.attributes[k]; b.array.set(a); b.needsUpdate = true; } }
