// FALLBACK title (kept for when the video can't play; loaded by title.js on a media error).
// Sunspots title screen: a 2D layered felt diorama rendered with three.js (orthographic, plate-pixel space).
// 4 s seamless loop: the sleepy sun sinks straight down behind the hills while the blue felt building
// FUZZY-MELTS into a flat velvety puddle that holds a soft hazy reflection of the sun; then it all reverses.
// Clouds, flowers and camera never move. Shown on load (doubles as the loading screen) until tapped.
import * as THREE from 'three';

const Q = new URLSearchParams(location.search);
const ON = !Q.has('shot') || Q.has('title');
const FREEZE = Q.has('tphase') ? parseFloat(Q.get('tphase')) : null;
const root = document.getElementById('titleScr');
window.__titleUp = ON;
if (!ON) { root && root.remove(); window.__title = { progress() {}, ready() {} }; }
else start();

function start() {
  document.getElementById('load')?.style.setProperty('display', 'none');
  root.classList.add('mode2d');
  const canvas = root.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.has('shot') ? 1 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const tl = new THREE.TextureLoader();
  const tex = (u) => { const t = tl.load('./title/' + u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // layouts in plate pixels (y down). sunO = face centre inside sun.webp (529x533).
  const L = {
    p: { w: 720, h: 1280, plate: 'plate_p', base: 916, bw: 500, sunW: 380, sunTravel: 245, word: [360, 235, 500] },
    l: { w: 1280, h: 720, plate: 'plate_l', base: 596, bw: 430, sunW: 310, sunTravel: 175, word: [640, 80, 340] },
  };
  const SUN_IMG = [529, 533], SUN_C = [274, 281], BLD_IMG = [969, 365];
  const T = { sun: tex('sun.webp'), bld: tex('building.webp'), plate_p: tex('plate_p.jpg'), plate_l: tex('plate_l.jpg'), plate_p_front: tex('plate_p_front.webp'), plate_l_front: tex('plate_l_front.webp') };

  const NOISE = /* glsl */`
    float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
    // felt fibre fuzz: high-frequency streaky noise
    vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); }
    float fuzz(vec2 p){ return 0.6*vnoise(p*vec2(1.0,2.6)) + 0.4*vnoise(p.yx*vec2(2.3,0.9)+7.1); }
  `;
  const VERT = `varying vec2 vP; uniform vec4 uRect; // x0,y0,w,h in plate px (y down)
    void main(){ vP = vec2(uRect.x + uv.x*uRect.z, uRect.y + (1.0-uv.y)*uRect.w); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
  const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, -0.5, 0); // top-left anchored unit quad
  const layer = (frag, uniforms, order) => {
    const m = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: NOISE + frag, uniforms: { uRect: { value: new THREE.Vector4() }, ...uniforms }, transparent: true, depthTest: false, depthWrite: false }));
    m.renderOrder = order; m.frustumCulled = false; scene.add(m); return m;
  };
  const setRect = (m, x, y, w, h) => { m.position.set(x, -y, 0); m.scale.set(w, h, 1); m.material.uniforms.uRect.value.set(x, y, w, h); };
  const U = (v) => ({ value: v });
  const G = { uK: U(0), uT: U(0), uSun: U(new THREE.Vector4()), uBase: U(0), uBld: U(new THREE.Vector4()), uPlate: U(new THREE.Vector2(720, 1280)) };

  // 1) back plate (sky, clouds, hills, field)
  const back = layer(`varying vec2 vP; uniform sampler2D map; uniform vec2 uPlate;
    void main(){ gl_FragColor = texture2D(map, vec2(vP.x/uPlate.x, 1.0 - vP.y/uPlate.y));
#include <colorspace_fragment>
 }`, { map: U(null), uPlate: G.uPlate }, 0);
  // 2) sun (moves straight down/up only)
  const sun = layer(`varying vec2 vP; uniform sampler2D map; uniform vec4 uRect;
    void main(){ vec2 uv = vec2((vP.x-uRect.x)/uRect.z, 1.0-(vP.y-uRect.y)/uRect.w); vec4 c = texture2D(map, uv);
      gl_FragColor = c;
#include <colorspace_fragment>
 }`, { map: U(T.sun) }, 1);
  // 3) hills + field in front of the sinking sun
  const front = layer(`varying vec2 vP; uniform sampler2D map; uniform vec2 uPlate;
    void main(){ gl_FragColor = texture2D(map, vec2(vP.x/uPlate.x, 1.0 - vP.y/uPlate.y));
#include <colorspace_fragment>
 }`, { map: U(null), uPlate: G.uPlate }, 2);
  // 4) puddle: flat blue felt with a soft, hazy, fuzzy reflection of the sun (never mirror-shiny)
  const puddle = layer(`varying vec2 vP; uniform sampler2D sunMap; uniform float uK,uT,uBase; uniform vec4 uSun,uBld;
    void main(){
      float k = uK, W = uBld.z;
      vec2 r = vec2(W*(0.34 + 0.22*k), W*(0.04 + 0.085*k));
      vec2 c = vec2(uBld.x, uBase - r.y*0.45);
      vec2 d = (vP - c)/r;
      float ang = atan(d.y, d.x);
      float lobes = 0.07*sin(ang*3.0+1.7) + 0.05*sin(ang*5.0-0.4) + 0.03*sin(ang*9.0+uT*0.0);
      float e = length(d) - lobes;
      float edge = 1.0 - smoothstep(0.84, 1.0, e + (fuzz(vP*0.22)-0.5)*0.12 + (fuzz(vP*0.9)-0.5)*0.05);
      float show = smoothstep(0.10, 0.55, k);
      if (edge*show < 0.003) discard;
      // velvet felt base: deeper blue in the middle, lighter fuzzy rim, plus fibre grain
      vec3 deep = srgb(vec3(0.27,0.38,0.63)), rim = srgb(vec3(0.47,0.60,0.84));
      vec3 col = mix(deep, rim, smoothstep(0.35, 1.0, e));
      // soft sheen band toward the back edge (felt nap catching light, not a specular glint)
      col += srgb(vec3(0.30,0.32,0.36)) * smoothstep(0.2, -0.75, d.y) * (1.0 - smoothstep(0.55, 0.95, e)) * 0.8;
      // hazy reflection of the sun: mirrored, squashed, blurred, grainy
      float sunW = uSun.z, sunH = uSun.w;
      float ry = c.y + (uSun.y - (uBase - sunH*0.95)) * 0.10;          // tracks the sun's height a little
      vec2 q = vec2((vP.x - uSun.x)/(sunW*1.05) + 0.5, 0.5 - (vP.y - ry)/(sunH*0.30));
      vec2 wob = vec2((fbm(vP*0.04 + vec2(uT*0.15,0.0)) - 0.5)*0.05, 0.0);
      vec4 s = vec4(0.0);
      for (int i = -2; i <= 2; i++) for (int j = -1; j <= 1; j++) s += texture2D(sunMap, q + wob + vec2(float(i)*0.012, float(j)*0.02));
      s /= 15.0;
      float inside = step(0.0,q.x)*step(q.x,1.0)*step(0.0,q.y)*step(q.y,1.0);
      vec3 refl = mix(s.rgb, srgb(vec3(1.0,0.72,0.42)), 0.25);
      float ra = s.a * inside * 0.75 * (0.75 + 0.25*fuzz(vP*vec2(0.9,2.2)));
      col = mix(col, refl, ra * smoothstep(1.0, 0.6, e));
      col *= 0.90 + 0.18*fuzz(vP*vec2(1.3,0.7));                        // felt fibre texture over everything
      gl_FragColor = vec4(col, edge*show);

#include <colorspace_fragment>

    }`, { sunMap: U(T.sun), uK: G.uK, uT: G.uT, uBase: G.uBase, uSun: G.uSun, uBld: G.uBld }, 3);
  // 5) building: FUZZY MELT - sags, drags in drippy columns, spreads at the base, keeps the felt texture
  const bld = layer(`varying vec2 vP; uniform sampler2D map; uniform float uK,uT,uBase; uniform vec4 uBld;
    void main(){
      float k = uK, W = uBld.z, Hb = uBld.w;
      float X = (vP.x - uBld.x)/W, Y = (uBase - vP.y)/Hb;
      if (Y < -0.02) discard;
      float n = 0.5 + 0.5*sin(X*9.0+1.3)*sin(X*5.3-0.7);
      float drip = pow(max(0.0, sin(X*23.0+2.0)*sin(X*11.0-1.0)), 2.0);
      float hs = 1.0 - k*(0.86 + 0.06*n + 0.04*drip);
      float ys = Y / max(hs, 0.02);
      ys = pow(max(ys, 0.0), 1.0/(1.0 + k*2.2*drip));                    // drippy columns drag the top down
      float spread = 1.0 + k*0.55*pow(max(1.0 - ys, 0.0), 2.0) + k*0.08;   // base slumps outward
      float xs = X / spread + k*0.012*sin(uT*2.1 + Y*7.0);
      vec2 uv = vec2(0.5 + xs, ys);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
      vec4 c = texture2D(map, uv);
      // fuzzy fibrous silhouette (felt, not a hard cut)
      float a = clamp((c.a - 0.5 + (fuzz(vP*0.7) - 0.5)*0.55)*2.6 + 0.5, 0.0, 1.0);
      a *= 1.0 - smoothstep(0.88, 1.0, k);
      if (a < 0.004) discard;
      vec3 col = c.rgb;
      col = mix(col, srgb(vec3(0.30,0.42,0.68)), k*0.30);                        // colours run together as it melts
      col *= 1.0 - 0.12*k*smoothstep(0.4, 0.0, ys);                         // soft shade where it pools
      col *= 0.94 + 0.10*fuzz(vP*vec2(1.6,0.8))*k;                          // fibres stretched by the drips
      gl_FragColor = vec4(col, a);

#include <colorspace_fragment>

    }`, { map: U(T.bld), uK: G.uK, uT: G.uT, uBase: G.uBase, uBld: G.uBld }, 4);
  // 6) near flowers in front of the building base / puddle
  const near = layer(`varying vec2 vP; uniform sampler2D map; uniform vec2 uPlate; uniform float uBase;
    void main(){
      vec4 c = texture2D(map, vec2(vP.x/uPlate.x, 1.0 - vP.y/uPlate.y));
      float below = smoothstep(uBase + 4.0, uBase + 14.0, vP.y);
      float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
      float petal = smoothstep(0.30, 0.45, (mx - mn)/max(mx, 1e-3)) * smoothstep(0.35, 0.55, c.r) * step(c.b, c.g) * step(c.g, c.r*0.95);
      float a = max(below, petal * smoothstep(uBase - 14.0, uBase - 3.0, vP.y));
      if (a < 0.01) discard;
      gl_FragColor = vec4(c.rgb, a);
#include <colorspace_fragment>

    }`, { map: U(null), uPlate: G.uPlate, uBase: G.uBase }, 5);

  const word = root.querySelector('.tw');
  let lay, k = 0;
  function layout() {
    const W = innerWidth, H = innerHeight, sa = W / H;
    lay = sa < 1 ? L.p : L.l;
    const pa = lay.w / lay.h;
    let vw, vh, vx, vy;
    if (sa < pa) { vh = lay.h; vw = vh * sa; vx = (lay.w - vw) / 2; vy = 0; }
    else { vw = lay.w; vh = vw / sa; vx = 0; vy = Math.min(lay.h - vh, Math.max(0, lay.base - vh * 0.74)); }
    cam.left = vx; cam.right = vx + vw; cam.top = -vy; cam.bottom = -(vy + vh); cam.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    G.uPlate.value.set(lay.w, lay.h);
    for (const [m, t] of [[back, T[lay.plate]], [front, T[lay.plate + '_front']], [near, T[lay.plate]]]) { m.material.uniforms.map.value = t; setRect(m, 0, 0, lay.w, lay.h); }
    const bh = lay.bw * BLD_IMG[1] / BLD_IMG[0];
    G.uBase.value = lay.base; G.uBld.value.set(lay.w / 2, lay.base, lay.bw, bh);
    setRect(bld, lay.w / 2 - lay.bw * 0.85, lay.base - bh * 1.05, lay.bw * 1.7, bh * 1.05 + 6);
    setRect(puddle, lay.w / 2 - lay.bw * 0.75, lay.base - lay.bw * 0.25, lay.bw * 1.5, lay.bw * 0.42);
    // wordmark (DOM) positioned in plate space
    const s = W / vw, [wx, wy, ww] = lay.word;
    word.style.width = (ww * s) + 'px'; word.style.left = ((wx - vx) * s - ww * s / 2) + 'px'; word.style.top = Math.max((wy - vy) * s, ww * s * 0.16 + 14) + 'px';
    word.style.transform = 'translateY(-50%)';
  }
  function place(kk, tt) {
    const sw = lay.sunW, sh = sw * SUN_IMG[1] / SUN_IMG[0], sc = sw / SUN_IMG[0];
    const bh = lay.bw * BLD_IMG[1] / BLD_IMG[0];
    const top0 = lay.base - bh + 22 - sh;                                  // rest: bottom rays tucked behind the building
    const top = top0 + lay.sunTravel * kk;
    setRect(sun, lay.w / 2 - SUN_C[0] * sc, top, sw, sh);
    G.uSun.value.set(lay.w / 2, top + SUN_C[1] * sc, sw, sh);
    G.uK.value = kk; G.uT.value = tt;
  }
  layout(); addEventListener('resize', layout);

  const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10);                // smootherstep: holds at both ends
  const t0 = performance.now();
  let running = true;
  function frame() {
    if (!running) return;
    const tt = (performance.now() - t0) / 1000;
    const ph = FREEZE ?? ((tt / 4) % 1);
    k = ph < 0.5 ? ease(ph * 2) : ease(2 - ph * 2);
    place(k, tt);
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const bar = root.querySelector('.tbar i'), tap = root.querySelector('.ttap');
  let loaded = false;
  window.__title = {
    progress(f) { bar.style.width = (Math.max(0, Math.min(1, f)) * 100) + '%'; },
    ready() { loaded = true; root.classList.add('ready'); },
  };
  const prev = window.__titleState || {};                                  // carry over progress/ready from the video title
  if (prev.p) window.__title.progress(prev.p);
  if (prev.ready) window.__title.ready();
  const go = (e) => {
    if (!loaded) return; e.preventDefault(); e.stopPropagation();
    root.removeEventListener('pointerup', go);
    window.__titleUp = false; root.classList.add('out');
    setTimeout(() => { running = false; renderer.dispose(); renderer.forceContextLoss(); root.remove(); }, 750);
  };
  root.addEventListener('pointerup', go);
}
