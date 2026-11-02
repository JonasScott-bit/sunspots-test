// Sunspots material treatment — "flocked felt clothing + matte speckled clay" for Meshy character GLBs.
// Drop-in: applySunspotsLook(root, { mode: 'cheap' | 'physical', cloth: CLOTH_PRESETS.wolf })
// One procedural 256² RGBA noise texture (shared), triplanar in bind-pose object space (sticks to the skin while animating).
//   R = felt fibre height  G = clay speck (dark)  B = clay lumps (low freq)  A = light flecks
import * as THREE from 'three';

// ---------------------------------------------------------------- shared noise texture (built once, ~256 KB GPU)
let NOISE = null;
export function sunspotsNoise(size = 256) {
  if (NOISE) return NOISE;
  let s = 1234567; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; };
  const wrapDraw = (g, fn) => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { g.save(); g.translate(ox, oy); fn(g); g.restore(); } };
  // R: felt fibres = thousands of short curly strokes, then a tiny blur
  const [cR, gR] = mk(); gR.fillStyle = '#808080'; gR.fillRect(0, 0, size, size);
  const strokes = []; for (let i = 0; i < 5200; i++) { const x = rnd() * size, y = rnd() * size, a = rnd() * 6.283, l = 2 + rnd() * 6, c = (rnd() - 0.5) * 2.2, v = rnd() < 0.5 ? 255 : 0; strokes.push([x, y, a, l, c, v, 0.10 + rnd() * 0.22]); }
  gR.lineCap = 'round';
  wrapDraw(gR, g => { for (const [x, y, a, l, c, v, al] of strokes) { g.strokeStyle = `rgba(${v},${v},${v},${al})`; g.lineWidth = 0.6 + (al > 0.25 ? 0.6 : 0); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + c) * l * 0.6, y + Math.sin(a + c) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
  // G: clay specks (sparse dark dots of mixed size)
  const [cG, gG] = mk(); gG.fillStyle = '#000'; gG.fillRect(0, 0, size, size);
  const dots = []; for (let i = 0; i < 900; i++) dots.push([rnd() * size, rnd() * size, rnd() < 0.85 ? 0.5 + rnd() * 0.6 : 1.1 + rnd() * 0.9, 0.35 + rnd() * 0.65]);
  wrapDraw(gG, g => { for (const [x, y, r, a] of dots) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } });
  // A: light flecks
  const [cA, gA] = mk(); gA.fillStyle = '#000'; gA.fillRect(0, 0, size, size);
  const fl = []; for (let i = 0; i < 400; i++) fl.push([rnd() * size, rnd() * size, 0.4 + rnd() * 0.5, 0.3 + rnd() * 0.7]);
  wrapDraw(gA, g => { for (const [x, y, r, a] of fl) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } });
  // B: tileable value noise lumps (fingerprint-ish clay), 2 octaves
  const vn = (n) => { const gr = []; for (let i = 0; i < n * n; i++) gr.push(rnd()); return (x, y) => { const fx = x * n / size, fy = y * n / size, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); const g = (a, b) => gr[((b % n + n) % n) * n + ((a % n + n) % n)]; return (g(ix, iy) * (1 - sx) + g(ix + 1, iy) * sx) * (1 - sy) + (g(ix, iy + 1) * (1 - sx) + g(ix + 1, iy + 1) * sx) * sy; }; };
  const n1 = vn(6), n2 = vn(17);
  const dR = gR.getImageData(0, 0, size, size).data, dG = gG.getImageData(0, 0, size, size).data, dA = gA.getImageData(0, 0, size, size).data;
  const data = new Uint8Array(size * size * 4);
  // stretch fibre contrast to the full 0..255 range (1st..99th percentile)
  const rs = []; for (let i = 0; i < size * size; i++) rs.push(dR[i * 4]); rs.sort((a, b) => a - b);
  const lo = rs[Math.floor(rs.length * 0.01)], hi = rs[Math.floor(rs.length * 0.99)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    data[i] = Math.max(0, Math.min(255, Math.round((dR[i] - lo) / Math.max(1, hi - lo) * 255))); data[i + 1] = dG[i]; data[i + 2] = Math.round(255 * (0.65 * n1(x, y) + 0.35 * n2(x, y))); data[i + 3] = dA[i];
  }
  NOISE = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping; NOISE.generateMipmaps = true; NOISE.minFilter = THREE.LinearMipmapLinearFilter; NOISE.magFilter = THREE.LinearFilter; NOISE.needsUpdate = true;
  return NOISE;
}

// ---------------------------------------------------------------- cloth masks (picked from the Meshy albedo, no extra texture)
// hue in 0..1, width = half-range, minSat/minLum gates. Up to 2 ranges per character.
export const CLOTH_PRESETS = {
  wolf:  [[0.055, 0.075, 0.35, 0.18], [0, 0, 9, 9]],              // orange sweater + coral pants (eyes catch it too; tiny)
  heron: [[0.91, 0.12, 0.15, 0.04], [0.10, 0.06, 0.08, 0.55]],   // purple hoodie + cream shorts (beak/legs are more saturated -> excluded by maxSat below)
  crow:  [[0.0, 0.0, 9, 9], [0, 0, 9, 9]],
};
// Per-character look settings for the game (matched against cast/locked/<name>.jpg — in the photos ALL fur/hair/feathers
// are flocked felt like the clothes; only beaks, claws, noses, eyes and slick skin stay clay).
//   cloth: hue bands that are always felt  fur: felt weight for everything else  hard: hue band forced to clay
//   hardLum: anything darker than this is clay (noses, pupils, claws)  ns: Meshy normal-map strength (folds/wrinkles)
const NONE = [0, 0, 9, 9];
export const CHAR_LOOK = {
  wolf:     { cloth: [[0.055, 0.075, 0.35, 0.18], NONE], preflat: true, fur: 0.9, hard: NONE, hardLum: 0.16, ns: 0.4 },          // grey felt head/tail, orange sweater, coral pants; black nose = clay
  bear:     { cloth: [[0.97, 0.06, 0.3, 0.1], [0.48, 0.07, 0.2, 0.1]], fur: 0.85, hard: NONE, hardLum: 0.12, ns: 0.45 }, // maroon sweater, teal pants, brown felt fur
  crow:     { cloth: [[0.30, 0.10, 0.25, 0.1], [0.11, 0.07, 0.3, 0.2]], fur: 0.8, hard: NONE, hardLum: 0.03, ns: 0.45 }, // green sweater, mustard pants, black felt feathers; beak clay
  lynx:     { cloth: [[0.48, 0.08, 0.25, 0.1], [0.09, 0.06, 0.12, 0.45]], fur: 0.85, hard: NONE, hardLum: 0.1, ns: 0.45 },   // teal turtleneck, beige flares
  anteater: { cloth: [[0.12, 0.06, 0.35, 0.25], [0.85, 0.1, 0.2, 0.08]], fur: 0.85, hard: NONE, hardLum: 0.02, ns: 0.45 },  // mustard/black stripes, plum pants, felt fur
  heron:    { cloth: [[0.91, 0.12, 0.15, 0.04], [0.10, 0.06, 0.08, 0.55]], fur: 0.7, hard: [0.13, 0.05, 0.5, 0.4], hardLum: 0.1, ns: 0.45, maxSat2: 0.42 }, // purple hoodie, cream shorts; yellow beak/legs clay
  ram:      { cloth: [[0.07, 0.05, 0.45, 0.3], [0.2, 0.08, 0.2, 0.1]], fur: 0.85, hard: NONE, hardLum: 0.07, ns: 0.45, yClay: [0.86, 1.1] },   // orange puffer, olive pants, cream fleece collar, felt head
  gecko:    { cloth: [[0.1, 0.12, 0.0, 0.3], NONE], fur: 0.0, hard: NONE, hardLum: 0.1, ns: 0.5, clothBySat: 0.4, yFelt: [0.5, 0.72, 1] },          // tie-dye top + cream flares felt; rainbow skin stays clay (sat > clothBySat -> clay)
  moth:     { cloth: [[0.02, 0.05, 0.4, 0.25], NONE], fur: 0.9, hard: NONE, hardLum: 0.08, ns: 0.45 },             // tan felt fuzz, coral overalls
  squid:    { cloth: [[0.02, 0.05, 0.35, 0.12], NONE], fur: 0.0, hard: NONE, hardLum: 0.1, ns: 0.5 },                                          // banana squid: smooth yellow clay
  farmhand: { cloth: [[0.0, 0.5, 0.25, 0.08], NONE], fur: 0.0, hard: [0.085, 0.035, 0.15, 0.4], hardLum: 0.1, ns: 0.5 },    // plaid shirt + pants felt; skin tones clay
  feltobj:  { cloth: NONE2(), fur: 0.9, hard: NONE, hardLum: 0.06, ns: 0.5 },                                       // fabric props (sock, booth upholstery): all felt
  object:   { cloth: NONE2(), fur: 0.0, hard: NONE, hardLum: 0.0, ns: 0.5 },                                         // props / walking objects: matte clay
};
function NONE2() { return [NONE, NONE]; }

const GLSL_COMMON = /* glsl */`
uniform sampler2D uNoise; uniform float uNScale, uFibreFreq, uClayFreq, uFlatten, uBumpCloth, uBumpClay, uRim, uSheen, uSpeck, uClothMaxSat2;
uniform vec4 uCloth0, uCloth1, uHard; uniform vec3 uRimSky; uniform float uFur, uHardLum, uClothBySat, uShell, uShellCut, uYMin, uYH; uniform vec3 uYFelt; uniform vec2 uYClay;
varying vec3 vSsObj; varying vec3 vSsObjN;
vec3 ssRgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1e-6; return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x); }
float ssHueBand(vec3 hsv, vec4 b){ float dh=abs(fract(hsv.x-b.x+0.5)-0.5); return (1.-smoothstep(b.y*0.7,b.y,dh))*smoothstep(b.z,b.z+0.08,hsv.y)*smoothstep(b.w,b.w+0.08,hsv.z); }
vec4 ssTri(vec3 p, vec3 w){ return texture2D(uNoise,p.yz)*w.x + texture2D(uNoise,p.zx)*w.y + texture2D(uNoise,p.xy)*w.z; }
vec3 ssBump(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd){
  vec3 vSigmaX=normalize(dFdx(surf_pos)); vec3 vSigmaY=normalize(dFdy(surf_pos)); vec3 R1=cross(vSigmaY,surf_norm); vec3 R2=cross(surf_norm,vSigmaX);
  float fDet=dot(vSigmaX,R1)*fd; vec3 vGrad=sign(fDet)*(dHdxy.x*R1+dHdxy.y*R2); return normalize(abs(fDet)*surf_norm-vGrad); }
`;

export function applySunspotsLook(root, opts = {}) {
  const mode = opts.mode || 'cheap';
  const cl = (opts.char && CHAR_LOOK[opts.char]) || {};
  const cloth = opts.cloth || cl.cloth || CLOTH_PRESETS.wolf;
  const noise = sunspotsNoise();
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const m0 = o.material; if (!m0 || m0.userData?.ss) return; // already converted
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; const H = Math.max(bb.max.y - bb.min.y, 1e-6);
    const ns = opts.normalScale ?? cl.ns ?? 0.6;
    const P = { color: m0.color.clone(), map: m0.map, normalMap: m0.normalMap, normalScale: new THREE.Vector2(ns, ns), roughness: 0.9, metalness: 0, side: m0.side,
      emissive: m0.emissive ? m0.emissive.clone() : new THREE.Color(0), emissiveMap: m0.emissiveMap || null, emissiveIntensity: m0.emissiveIntensity ?? 1,
      transparent: m0.transparent, opacity: m0.opacity, alphaTest: m0.alphaTest, alphaMap: m0.alphaMap || null, depthWrite: m0.depthWrite, vertexColors: m0.vertexColors };
    const m = mode === 'physical'
      ? new THREE.MeshPhysicalMaterial({ ...P, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(1, 1, 1) })
      : new THREE.MeshStandardMaterial(P);
    m.name = 'sunspots_' + mode;
    const U = {
      uNoise: { value: noise }, uNScale: { value: (opts.height || 1.75) / H }, // geometry units -> metres
      uFibreFreq: { value: opts.fibreFreq ?? 2.6 }, uClayFreq: { value: opts.clayFreq ?? 2.2 }, // tiles per metre (256px tile)
      uFlatten: { value: opts.flatten ?? 0.55 }, uBumpCloth: { value: opts.bumpCloth ?? 1.2 }, uBumpClay: { value: opts.bumpClay ?? 0.5 },
      uRim: { value: opts.rim ?? 0.62 }, uSheen: { value: opts.sheen ?? 1.0 }, uSpeck: { value: opts.speck ?? 0.35 },
      uCloth0: { value: new THREE.Vector4(...cloth[0]) }, uCloth1: { value: new THREE.Vector4(...cloth[1]) }, uClothMaxSat2: { value: opts.maxSat2 ?? 0.42 },
      uRimSky: { value: new THREE.Color(opts.rimSky || '#a9b8d6') },
      uDebug: { value: opts.debug || 0 },
      uFur: { value: opts.fur ?? cl.fur ?? 0 }, uHard: { value: new THREE.Vector4(...(opts.hard || cl.hard || NONE)) }, uHardLum: { value: opts.hardLum ?? cl.hardLum ?? 0 },
      uClothBySat: { value: opts.clothBySat ?? cl.clothBySat ?? 0 }, uShell: { value: 0 }, uShellCut: { value: 0.55 },
      uYMin: { value: bb.min.y }, uYH: { value: H }, uYFelt: { value: new THREE.Vector3(...(cl.yFelt || [0, 0, 0])) }, uYClay: { value: new THREE.Vector2(...(cl.yClay || [2, 2])) },
    };
    m.userData.ss = U;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vSsObj; varying vec3 vSsObjN; uniform float uShell;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vSsObjN = objectNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vSsObj = transformed;\n#ifdef SS_SHELL\n transformed += normalize(objectNormal) * uShell;\n#endif');
      sh.fragmentShader = GLSL_COMMON + 'uniform float uDebug;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', /* glsl */`
  #include <map_fragment>
  // 1) flatten Meshy's baked noise: blend toward a blurred (mip-biased) albedo -> clean, even pigment like the photos
  vec3 ssDbg = vec3(0.0); vec3 ssBase = diffuseColor.rgb; vec3 ssBlur = diffuseColor.rgb;
  #if defined(USE_MAP) && !defined(SS_PREFLAT)
    ssBlur = texture2D(map, vMapUv, 1.5).rgb; ssBase = mix(diffuseColor.rgb, ssBlur * diffuse, uFlatten * (1.0 - smoothstep(0.06, 0.16, distance(diffuseColor.rgb, ssBlur * diffuse))));
  #endif
  // 2) cloth mask from the albedo hue (sRGB-ish space for stable thresholds)
  vec3 ssHsv = ssRgb2hsv(pow(max(ssBlur, 1e-4), vec3(1.0/2.2)));
  // de-speckle: Meshy paints stray red/brown flecks into grey clay; where the blurred colour is grey but the texel is saturated, use the blur
  #ifndef SS_PREFLAT
  { float sSat = ssRgb2hsv(pow(max(diffuseColor.rgb, 1e-4), vec3(1.0/2.2))).y;
    ssBase = mix(ssBase, ssBlur * diffuse, (1.0 - smoothstep(0.14, 0.28, ssHsv.y)) * smoothstep(0.18, 0.38, sSat)); }
  #endif
  float ssCloth = max(ssHueBand(ssHsv, uCloth0), ssHueBand(ssHsv, uCloth1) * (1.0 - smoothstep(uClothMaxSat2, uClothMaxSat2 + 0.1, ssHsv.y)));
  // cloth: even out Meshy's baked dark smudges with a heavier blur (only where the hue agrees, so seams don't bleed)
  #if defined(USE_MAP) && !defined(SS_PREFLAT)
  { vec3 hb = texture2D(map, vMapUv, 4.5).rgb * diffuse; float ok = 1.0 - smoothstep(0.12, 0.3, distance(normalize(hb + 1e-3), normalize(ssBlur * diffuse + 1e-3)));
    float lift = smoothstep(0.0, 0.25, dot(hb - ssBase, vec3(0.333))); // only brighten dark smudges, never darken
    vec3 hbH = ssRgb2hsv(pow(max(hb, 1e-4), vec3(1.0/2.2)));
    float cB = max(ssHueBand(hbH, uCloth0), ssHueBand(hbH, uCloth1) * (1.0 - smoothstep(uClothMaxSat2, uClothMaxSat2 + 0.1, hbH.y)));
    ssCloth = max(ssCloth, cB * ok); // dark smudges fall below the mask's min luminance; the wide blur still knows it's cloth
    ssBase = mix(ssBase, hb, ssCloth * ok * mix(0.45, 0.9, lift)); ssDbg = vec3(ok, ssCloth, lift*4.0); }
  #endif
  // 2b) fur/hair/feathers are felt too (photos), except the 'hard' bits: dark noses/pupils/claws and a beak/skin hue band
  { float hb = ssHueBand(ssHsv, uHard); float hard = max(hb, 1.0 - smoothstep(uHardLum, uHardLum + 0.05, ssHsv.z));
    if (uClothBySat > 0.0) ssCloth *= 1.0 - smoothstep(uClothBySat, uClothBySat + 0.12, ssHsv.y); // gecko: saturated rainbow skin = clay, pale cloth = felt
    float yf = (vSsObj.y - uYMin) / uYH; // 0 = feet, 1 = top of this mesh (bind pose)
    ssCloth = max(ssCloth, uYFelt.z * smoothstep(uYFelt.x - 0.02, uYFelt.x + 0.02, yf) * (1.0 - smoothstep(uYFelt.y - 0.02, uYFelt.y + 0.02, yf)));
    ssCloth = max(ssCloth * (1.0 - hb), uFur * (1.0 - hard));
    ssCloth *= 1.0 - smoothstep(uYClay.x - 0.02, uYClay.x + 0.02, yf) * (1.0 - smoothstep(uYClay.y - 0.02, uYClay.y + 0.02, yf)); // e.g. ram horns
  }
  // 3) triplanar noise in bind-pose object space (metres)
  vec3 ssP = vSsObj * uNScale; vec3 ssW = pow(abs(normalize(vSsObjN)), vec3(4.0)); ssW /= (ssW.x + ssW.y + ssW.z);
  vec4 ssNf = ssTri(ssP * uFibreFreq, ssW);   // fibres
  #ifdef SS_LITE
    vec4 ssNc = ssNf; // lite: one triplanar set shared by felt + clay (3 fetches instead of 6)
  #else
    vec4 ssNc = ssTri(ssP * uClayFreq + 0.37, ssW); // clay
  #endif
  float ssFoot = length(fwidth(ssP * uFibreFreq)) * 256.0; float ssLod = 1.0 - smoothstep(2.5, 7.0, ssFoot); // fade detail when sub-pixel
  // 4) albedo: felt = lighter fibre tips / darker roots; clay = dark specks + light flecks + soft lumps
  float ssFel = mix(0.80, 1.14, ssNf.r);
  float ssCla = (1.0 - uSpeck * ssNc.g * ssLod) * (1.0 + 0.22 * ssNc.a * ssLod) * mix(0.94, 1.05, ssNc.b);
  diffuseColor.rgb = ssBase * mix(ssCla, mix(1.0, ssFel, ssLod), ssCloth);
  #ifdef SS_SHELL
    { vec4 n2 = ssTri(ssP * uFibreFreq * 2.3 + 0.21, ssW); if (ssCloth < 0.5 || n2.r < uShellCut + (1.0 - ssLod) * 0.5) discard; diffuseColor.rgb *= 1.06; }
  #endif
  if (uDebug > 0.5) diffuseColor.rgb = vec3(ssCloth);`)
        .replace('#include <normal_fragment_maps>', /* glsl */`
  #include <normal_fragment_maps>
  { float h = mix(ssNc.b * 0.6 + ssNc.g * 0.4, ssNf.r, ssCloth);
    float bs = mix(uBumpClay, uBumpCloth, ssCloth) * ssLod;
    normal = ssBump(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)) * bs, faceDirection); }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(0.93, 1.0, ssCloth);')
        .replace('#include <lights_physical_fragment>', /* glsl */`
  #include <lights_physical_fragment>
  #ifdef USE_SHEEN
    material.sheenColor = mix(vec3(0.0), min(ssBase * 1.6 + 0.04, vec3(1.0)), ssCloth) * uSheen; material.sheenRoughness = 0.8;
  #endif`)
        .replace('#include <opaque_fragment>', /* glsl */`
  // 5) fuzz halo: soft fresnel rim, cloth strong, clay faint (fakes back-scattered fibres; the 'cheap sheen')
  { float nv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); float fr = pow(1.0 - nv, 2.6);
    vec3 rimC = mix(uRimSky * mix(0.5, 1.0, ssCloth), min(ssBase * 2.2 + 0.05, vec3(1.0)), mix(0.85, 0.6, ssCloth));
    outgoingLight += rimC * fr * uRim * mix(0.10, 1.0, ssCloth) * mix(1.0, ssFel, ssCloth); }
  if (uDebug > 0.5) outgoingLight = vec3(ssCloth); if (uDebug > 1.5) outgoingLight = vec3(ssNf.r); if (uDebug > 2.5) outgoingLight = normal*0.5+0.5; if (uDebug > 3.5) outgoingLight = ssBase; if (uDebug > 4.5) outgoingLight = ssDbg;
  #include <opaque_fragment>`);
    };
    const preflat = opts.preflat ?? cl.preflat ?? !!m0.userData?.handflat; // albedo already hand-flattened (tools/flatten_atlas.py / handflat.py set material extras.handflat): skip the blur passes (they bleed across UV islands)
    if (opts.lite) m.defines = { ...(m.defines || {}), SS_LITE: '' };
    if (preflat) m.defines = { ...(m.defines || {}), SS_PREFLAT: '' };
    m.customProgramCacheKey = () => 'sunspots|' + mode + (opts.lite ? '|lite' : '') + (preflat ? '|flat' : '');
    o.material = m; mats.push(m);
    if (opts.shell) mats.push(addShell(o, m, opts.shell, U));
    o.userData.ssPair = [m0, m]; // [original, sunspots] for the low-end runtime fallback (setSunspotsLook)
  });
  REG.push(root);
  return mats;
}

// ---------------------------------------------------------------- optional single fuzz shell (felt regions only)
// One extra skinned draw per mesh, pushed out along the normal by `thick` metres, alpha-tested by a finer fibre noise.
function addShell(o, base, thick, U) {
  const baseOBC = base.onBeforeCompile; // unpatched (patchRider later chains each material separately)
  const m = base.clone(); m.name = base.name + '_shell'; m.defines = { ...(base.defines || {}), SS_SHELL: '' };
  const key = base.customProgramCacheKey(); m.customProgramCacheKey = () => key + '|shell';
  const U2 = { ...U, uShell: { value: (typeof thick === 'number' ? thick : 0.006) / U.uNScale.value } }; m.userData.ss = U2;
  m.onBeforeCompile = (sh) => { baseOBC(sh); Object.assign(sh.uniforms, U2); };
  const s = o.clone(false); s.material = m; s.castShadow = false; s.receiveShadow = true; s.userData = { ssIsShell: true };
  o.parent.add(s); o.userData.ssShell = s;
  return m;
}

// ---------------------------------------------------------------- runtime fallback: swap every converted mesh back to its original material
const REG = [];
let LOOK_ON = true;
export function sunspotsLookOn() { return LOOK_ON; }
export function setSunspotsLook(on) {
  LOOK_ON = !!on;
  for (const r of REG) r.traverse(o => { const p = o.userData.ssPair; if (p) o.material = p[on ? 1 : 0]; if (o.userData.ssShell) o.userData.ssShell.visible = on; });
}
// low-end probe for the initial choice (?felt=0 forces the original materials, ?felt=1 forces the felt look)
export function sunspotsLowEnd() {
  const q = new URLSearchParams(location.search).get('felt'); // (?look= is taken: cockpit look angle)
  if (q === '0') return true; if (q === '1') return false;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  return mem <= 2 || cores <= 2;
}

// soft contact shadow blob (radial gradient on a quad) — near-free, reads like the photo's soft ground contact
export function contactShadow(radius = 0.55, opacity = 0.55) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(40,10,20,1)'); gr.addColorStop(0.45, 'rgba(40,10,20,0.55)'); gr.addColorStop(1, 'rgba(40,10,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = 1; return m;
}

// ---------------------------------------------------------------- game entry point
// One call per loaded character: sunspotsApply(root, 'wolf', 1.75). Returns the new materials ([] when the look is off).
// The look is skipped entirely on low-end devices (?felt=0 forces off, ?felt=1 forces on); the runtime watchdog in
// main.js can still drop it later with setSunspotsLook(false).
let ENABLED = null;
export function sunspotsEnabled() { if (ENABLED === null) ENABLED = !sunspotsLowEnd(); return ENABLED; }
export function sunspotsApply(root, char, h = 1.75, extra = {}) {
  if (!sunspotsEnabled()) return [];
  return applySunspotsLook(root, { mode: 'cheap', lite: true, char, height: h, ...extra });
}
// every material of a mesh incl. the fallback partner (so per-material patches like patchRider hit both looks)
export function bothMats(o) { return [...new Set([...[].concat(o.material || []), ...(o.userData.ssPair || [])])]; }
