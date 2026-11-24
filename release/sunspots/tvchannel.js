// tvchannel.js — Sunspots in-world TV playback system (standalone, room-agnostic).
//
// Pattern borrowed from shipped console games: the TV is a render target fed by ONE
// decoder, channels are data (a lineup of manifests), and a global broadcast clock keeps
// every channel "on air" even when nobody is watching, so flipping back resumes mid-show.
//
//   import { TVSet } from './tvchannel.js';
//   const tv = new TVSet({ lineup: [
//     { number: 2, type: 'static', name: 'SNOW' },
//     { number: 3, type: 'playlist', manifest: './media/aetv/channel_aetv.json' },
//     { number: 13, type: 'bars', name: 'TEST' },
//     { number: 99, type: 'playlist', manifest: '...', hidden: true },   // secret channel
//   ]});
//   await tv.ready;  screenMesh.material = tv.material;
//   each frame: tv.update(dt, camera?, screenMesh?)   // auto pauses when off-screen
//   tv.channelUp() / channelDown() / setChannel(n) / power(on) / unlock() (call from a tap)
//   tv.glitch('roll'|'bend'|'snow')   tv.setVisible(bool)   tv.dispose()
//
// Channel types are a registry, so future fake-commercial / weird-station channels plug in:
//   registerChannelType('commercials', (def, tv) => new PlaylistChannel({...def, shuffle:true}, tv));
import * as THREE from 'three';

// ---------------------------------------------------------------- broadcast clock
// Seconds since an arbitrary epoch shared by all TVs on the page (wall-clock based so it
// also keeps running while the tab is hidden).
const EPOCH = Date.UTC(2026, 0, 1) / 1000;
export function broadcastTime() { return Date.now() / 1000 - EPOCH; }

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const manifestCache = new Map();
export function loadManifest(url) {
  if (!manifestCache.has(url)) {
    manifestCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); })
      .then(m => { const base = new URL(m.baseUrl || './', new URL(url, location.href)).href; m.clips.forEach(c => { c.url = new URL(c.file, base).href; c.posterUrl = c.poster ? new URL(c.poster, base).href : null; }); return m; }));
  }
  return manifestCache.get(url);
}

// ---------------------------------------------------------------- channel types
const channelTypes = new Map();
export function registerChannelType(type, factory) { channelTypes.set(type, factory); }

class ProceduralChannel {               // no video: the shader draws it (static, colour bars...)
  constructor(def, mode) { this.def = def; this.mode = mode; this.name = def.name || def.type.toUpperCase(); }
  async init() {}
  get isVideo() { return false; }
}
registerChannelType('static', def => new ProceduralChannel(def, 1));
registerChannelType('bars', def => new ProceduralChannel(def, 2));

export class PlaylistChannel {
  constructor(def) { this.def = def; this.name = def.name; this.clips = []; this.total = 0; }
  get isVideo() { return true; }
  async init() {
    const m = await loadManifest(this.def.manifest);
    this.name = this.def.name || m.name;
    let clips = m.clips.slice();
    if (this.def.include) clips = clips.filter(c => this.def.include.includes(c.program || c.id) || this.def.include.includes(c.id));
    if (this.def.shuffle) {                       // deterministic shuffle, keeps multi-part programs together
      const rnd = mulberry(hashStr(this.def.seed || String(this.def.number)));
      const groups = []; clips.forEach(c => { const g = groups.find(g => g.key === (c.program || c.id)); g ? g.items.push(c) : groups.push({ key: c.program || c.id, items: [c] }); });
      for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
      clips = groups.flatMap(g => g.items);
    }
    this.clips = clips;
    this.total = clips.reduce((s, c) => s + c.duration, 0);
    this.offset = (hashStr('ch' + this.def.number) % 10000) / 10000 * this.total;   // channels are not in lock-step
  }
  // What is on air right now: { index, clip, t }
  onAir(now = broadcastTime()) {
    let t = ((now + this.offset) % this.total + this.total) % this.total;
    for (let i = 0; i < this.clips.length; i++) { const c = this.clips[i]; if (t < c.duration) return { index: i, clip: c, t }; t -= c.duration; }
    return { index: 0, clip: this.clips[0], t: 0 };
  }
  next(index) { return this.clips[(index + 1) % this.clips.length]; }
}
registerChannelType('playlist', def => new PlaylistChannel(def));
registerChannelType('commercials', def => new PlaylistChannel({ shuffle: true, ...def }));  // future fake-ad channels

// ---------------------------------------------------------------- CRT shader (the hook the living room uses)
export const CRT = {
  vertex: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragment: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D map; uniform float uHasMap; uniform vec2 uMapSize; uniform float uFit;
    uniform float uScreenAspect; uniform float uTime; uniform float uStatic; uniform float uMode;
    uniform float uRoll; uniform float uBend; uniform float uScan; uniform float uCurve;
    uniform float uPower; uniform float uBright; uniform float uChroma;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    vec3 bars(vec2 uv){
      float i = floor(uv.x * 7.0);
      vec3 c = vec3(0.0);
      // classic SMPTE-ish order: white yellow cyan green magenta red blue
      vec3 cols[7]; cols[0]=vec3(.75); cols[1]=vec3(.75,.75,0.); cols[2]=vec3(0.,.75,.75); cols[3]=vec3(0.,.75,0.);
      cols[4]=vec3(.75,0.,.75); cols[5]=vec3(.75,0.,0.); cols[6]=vec3(0.,0.,.75);
      for(int k=0;k<7;k++){ if(float(k)==i) c = cols[k]; }
      if (uv.y < 0.25) c = vec3(step(0.5, fract(uv.x*4.0))*0.9);
      return c;
    }
    void main(){
      // barrel curvature
      vec2 uv = vUv; vec2 cc = uv - 0.5; uv = 0.5 + cc * (1.0 + uCurve * dot(cc,cc));
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
      vec2 suv = uv;
      // horizontal tracking bend (wobbly lines) + vertical roll
      suv.x += uBend * 0.03 * sin(suv.y * 40.0 + uTime * 9.0) * smoothstep(0.0, 1.0, sin(suv.y*3.0 + uTime*2.0));
      suv.x += uBend * 0.06 * step(0.985, fract(suv.y * 3.0 - uTime * 0.7));
      suv.y = fract(suv.y + uRoll);
      float bar = smoothstep(0.0, 0.02, fract(vUv.y + uRoll)) * smoothstep(0.0, 0.04, 1.0 - fract(vUv.y + uRoll));  // the black frame bar during a roll
      // aspect fit: uFit 0 = cover (crop), 1 = contain (letter/pillar box)
      vec3 col = vec3(0.0);
      if (uMode > 1.5) col = bars(suv);
      else if (uHasMap > 0.5) {
        float va = uMapSize.x / max(uMapSize.y, 1.0); float r = va / uScreenAspect;
        vec2 t = suv - 0.5;
        if (uFit < 0.5) { if (r > 1.0) t.x /= r; else t.y *= r; }
        else { if (r > 1.0) t.y *= r; else t.x /= r; }
        t += 0.5;
        if (t.x >= 0.0 && t.x <= 1.0 && t.y >= 0.0 && t.y <= 1.0) {
          float ca = uChroma * 0.004;
          col = vec3(texture2D(map, t + vec2(ca,0.0)).r, texture2D(map, t).g, texture2D(map, t - vec2(ca,0.0)).b);
        }
      }
      // snow
      float n = h(floor(uv * vec2(320.0, 240.0)) + fract(uTime * 61.0) * 100.0);
      float snowLine = h(vec2(floor(uv.y*240.0), floor(uTime*30.0)));
      vec3 snow = vec3(n * (0.75 + 0.25*snowLine));
      float st = clamp(uStatic, 0.0, 1.0);
      col = mix(col, snow, st);
      col += (n - 0.5) * 0.06;                       // always a little grain
      col *= mix(1.0, 0.82 + 0.18 * sin(uv.y * 480.0 * 3.14159), uScan);   // scanlines
      col *= bar * (0.95 + 0.05 * sin(uTime * 120.0));                     // flicker
      col *= 1.0 - 0.55 * dot(cc, cc) * 2.0;                               // vignette
      // power on/off: collapse to a bright horizontal line then dot
      float p = clamp(uPower, 0.0, 1.0);
      float vy = abs(vUv.y - 0.5) * 2.0, vx = abs(vUv.x - 0.5) * 2.0;
      float sy = mix(0.004, 1.0, smoothstep(0.0, 0.6, p)), sx = mix(0.02, 1.0, smoothstep(0.0, 0.25, p));
      float mask = step(vy, sy) * step(vx, sx);
      col = mix(vec3(1.2) * mask, col, smoothstep(0.35, 0.9, p)) * mask;
      gl_FragColor = vec4(col * uBright, 1.0);
    }`,
  createMaterial(opts = {}) {
    return new THREE.ShaderMaterial({
      vertexShader: CRT.vertex, fragmentShader: CRT.fragment, toneMapped: false,
      uniforms: {
        map: { value: null }, uHasMap: { value: 0 }, uMapSize: { value: new THREE.Vector2(4, 3) }, uFit: { value: 0 },
        uScreenAspect: { value: opts.screenAspect || 4 / 3 }, uTime: { value: 0 }, uStatic: { value: 1 }, uMode: { value: 1 },
        uRoll: { value: 0 }, uBend: { value: 0 }, uScan: { value: opts.scanlines ?? 0.6 }, uCurve: { value: opts.curvature ?? 0.18 },
        uPower: { value: 1 }, uBright: { value: opts.brightness ?? 1.15 }, uChroma: { value: opts.chroma ?? 1 },
      },
    });
  },
};

// ---------------------------------------------------------------- the TV
const _frustum = new THREE.Frustum(), _m = new THREE.Matrix4(), _box = new THREE.Box3();

export class TVSet extends EventTarget {
  constructor({ lineup, screenAspect = 4 / 3, startChannel, autoGlitch = true, video } = {}) {
    super();
    this.material = CRT.createMaterial({ screenAspect });
    this.u = this.material.uniforms;
    this.autoGlitch = autoGlitch;
    this.on = true; this.visible = true; this.unlocked = false; this.volume = 1;
    this.staticHold = 0; this.roll = null; this.bendT = 0; this.nextGlitch = 6 + Math.random() * 10;
    this.posterTex = null; this.state = 'idle'; this.cur = null; this.loadToken = 0;

    // ONE shared decoder for the whole TV. Never create one per channel.
    const v = this.video = video || document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('muted', '');
    v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.disableRemotePlayback = true;
    // iOS only decodes for elements in the DOM; keep it a 1px invisible node.
    Object.assign(v.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
    if (!v.parentNode) document.body.appendChild(v);
    this.tex = new THREE.VideoTexture(v);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.magFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;

    const reveal = () => { if ((this.state === 'loading' || this.state === 'poster') && !v.paused && !v.seeking && this.pendingSeek == null) this._showVideo(); };
    v.addEventListener('playing', reveal);
    v.addEventListener('seeked', () => { this.pendingSeek = null; reveal(); });
    v.addEventListener('timeupdate', reveal);
    v.addEventListener('ended', () => this._advance());
    v.addEventListener('error', () => { if (v.getAttribute('src')) this._fail('error'); });
    v.addEventListener('waiting', () => { this.bufferingSince = performance.now(); });
    v.addEventListener('playing', () => { this.bufferingSince = 0; });
    this._onVis = () => this._applyPlayState();
    document.addEventListener('visibilitychange', this._onVis);

    this.channels = [];
    this.ready = Promise.all(lineup.map(async def => {
      const f = channelTypes.get(def.type); if (!f) throw new Error('unknown channel type ' + def.type);
      const ch = f(def, this); ch.number = def.number; ch.hidden = !!def.hidden;
      try { await ch.init(); } catch (e) { console.warn('[tv] channel', def.number, 'failed', e); ch.broken = true; }
      return ch;
    })).then(chs => {
      this.channels = chs.sort((a, b) => a.number - b.number);
      const first = this.channels.find(c => c.number === startChannel) || this.channels.find(c => !c.hidden && c.isVideo && !c.broken) || this.channels[0];
      this.setChannel(first.number);
      return this;
    });
  }

  get channel() { return this.cur; }
  _surfable() { return this.channels.filter(c => !c.hidden || c === this.cur); }
  channelUp() { const s = this._surfable(); this.setChannel(s[(s.indexOf(this.cur) + 1) % s.length].number); }
  channelDown() { const s = this._surfable(); this.setChannel(s[(s.indexOf(this.cur) - 1 + s.length) % s.length].number); }

  setChannel(number) {
    const ch = this.channels.find(c => c.number === number);
    if (!ch) { this.cur = { number, name: '', isVideo: false, dead: true }; this._toStatic(0.0, 1); this._emit(); return; }  // dead air
    this.cur = ch; this.staticHold = 0.35 + Math.random() * 0.25;    // real tuners show snow while the PLL locks
    this.u.uStatic.value = 1; this._noiseBurst(this.staticHold);
    if (Math.random() < 0.35) this.glitch('roll');
    if (!ch.isVideo || ch.broken) { this._releaseVideo(); this.u.uHasMap.value = 0; this.u.uMode.value = ch.isVideo ? 1 : ch.mode; this.state = 'procedural'; }
    else { this.u.uMode.value = 0; this._tuneLive(); }
    this._emit();
  }

  // Seek to whatever is "on air" for this channel at the broadcast clock.
  _tuneLive() {
    if (!this.on || !this.cur?.isVideo) return;
    const air = this.cur.onAir();
    this._load(air.clip, air.t, air.index);
  }

  _load(clip, t, index) {
    const v = this.video, token = ++this.loadToken;
    this.clip = clip; this.clipIndex = index; this.state = 'loading'; this.loadStarted = performance.now();
    this._setPoster(clip);
    // play() right away (iOS will not fetch until play() is called), seek once metadata is in,
    // and only reveal the texture after the seek lands so we never flash frame 0.
    this.pendingSeek = (t > 0.25 && t < clip.duration - 0.25) ? t : null;
    const seek = () => { if (token !== this.loadToken || this.pendingSeek == null) return; try { v.currentTime = this.pendingSeek; } catch (e) { this.pendingSeek = null; } };
    if (v.src !== clip.url) { v.src = clip.url; v.addEventListener('loadedmetadata', seek, { once: true }); }
    else seek();
    this._applyPlayState();
    this._prefetch(this.cur.next(index));
  }

  _advance() {   // clip ended → next clip on the same channel, still in broadcast sync
    if (!this.cur?.isVideo) return;
    const air = this.cur.onAir();
    const nextIdx = air.index === this.clipIndex ? (this.clipIndex + 1) % this.cur.clips.length : air.index;
    const t = air.index === nextIdx ? air.t : 0;
    this._load(this.cur.clips[nextIdx], t, nextIdx);
  }

  // Warm ONLY the next clip: poster image + the first bytes (moov atom + first GOPs, faststart).
  _prefetch(clip) {
    if (!clip || this._prefetched === clip.url) return; this._prefetched = clip.url;
    if (clip.posterUrl) { const i = new Image(); i.src = clip.posterUrl; }
    if (navigator.connection?.saveData) return;
    fetch(clip.url, { headers: { Range: 'bytes=0-524287' }, priority: 'low' }).catch(() => {});
  }

  _setPoster(clip) {
    if (!clip.posterUrl) return;
    new THREE.TextureLoader().load(clip.posterUrl, tex => {
      if (this.clip !== clip) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.posterTex) this.posterTex.dispose();
      this.posterTex = tex; this.posterFor = clip;
      if (this.state === 'loading' || this.state === 'poster') this._bind(tex, clip);
    });
  }

  _bind(tex, clip) { this.u.map.value = tex; this.u.uHasMap.value = 1; this.u.uMapSize.value.set(clip.width, clip.height); this.u.uFit.value = clip.fit === 'contain' ? 1 : 0; }
  _showVideo() { this.state = 'video'; this._bind(this.tex, this.clip); }
  _fail(why) {   // poster fallback, then try the next clip a few seconds later
    if (!this.cur?.isVideo || this.state === 'off') return;
    console.warn('[tv] playback', why, this.clip?.file);
    this.state = 'poster'; if (this.posterTex && this.posterFor === this.clip) this._bind(this.posterTex, this.clip);
    this.u.uStatic.value = 0.25;
    clearTimeout(this._retry); const token = this.loadToken;
    this._retry = setTimeout(() => { if (token === this.loadToken) this._advance(); }, 4000);
  }

  _applyPlayState() {
    const v = this.video;
    const want = this.on && this.visible && !document.hidden && this.cur?.isVideo && !this.cur.broken;
    if (!want) { if (!v.paused) v.pause(); return; }
    if (!v.getAttribute('src')) { this._tuneLive(); return; }
    v.muted = !this.unlocked; v.volume = this.volume;
    const p = v.play(); if (p) p.catch(err => {
      if (err.name === 'NotAllowedError' && !v.muted) { v.muted = true; v.play().catch(() => this._fail('autoplay')); this.dispatchEvent(new Event('needsunlock')); }
      else if (err.name !== 'AbortError') this._fail(err.name);
    });
  }

  _releaseVideo() {   // frees the hardware decoder + buffers (important on iOS, ~ a few decoders max)
    const v = this.video; this.loadToken++;
    if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); }
    this.clip = null; this._prefetched = null; this.pendingSeek = null;
  }
  _toStatic(hold, amount) { this._releaseVideo(); this.u.uHasMap.value = 0; this.u.uMode.value = 1; this.u.uStatic.value = amount; this.state = 'procedural'; }

  // Call from a user gesture (tap) to enable sound. Also unlocks WebAudio for the static hiss.
  unlock() {
    this.unlocked = true; this.video.muted = false;
    try { this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)(); this.audio.resume(); } catch (e) {}
    this._applyPlayState();
  }
  mute(m = true) { this.unlocked = !m; this.video.muted = m; }

  power(on) {
    if (on === this.on) return; this.on = on; this.powerAnim = on ? 0 : 1; this.powerDir = on ? 1 : -1;
    if (on) this.setChannel(this.cur?.number ?? this.channels[0].number);
    else { setTimeout(() => { if (!this.on) { this._releaseVideo(); this.state = 'off'; this.u.uHasMap.value = 0; } }, 450); }
    this._emit();
  }

  // Off-screen / far away → pause (the clock keeps running, so it resumes "live").
  // Release after a while so the decoder memory is returned.
  setVisible(vis) {
    if (vis === this.visible) return; this.visible = vis;
    clearTimeout(this._relT);
    if (!vis) this._relT = setTimeout(() => { if (!this.visible) { this._releaseVideo(); this.state = 'released'; } }, 8000);
    else if (this.cur?.isVideo && (this.state === 'released' || !this.video.getAttribute('src'))) { this.staticHold = 0.2; this._tuneLive(); }
    else if (this.cur?.isVideo) { this.video.addEventListener('playing', () => this._resync(), { once: true }); }
    this._applyPlayState();
  }
  _resync() {  // after a pause, jump to where the broadcast is now (keeps the live illusion)
    const air = this.cur.onAir();
    if (air.index !== this.clipIndex) this._load(air.clip, air.t, air.index);
    else if (Math.abs(this.video.currentTime - air.t) > 1.0) this.video.currentTime = air.t;
  }

  glitch(kind = 'roll') {
    if (kind === 'roll') this.roll = { t: 0, dur: 0.5 + Math.random() * 0.7, turns: 1 + (Math.random() < 0.3 ? 1 : 0) };
    else if (kind === 'bend') this.bendT = 0.6 + Math.random() * 0.8;
    else if (kind === 'snow') { this.staticHold = Math.max(this.staticHold, 0.25); this.u.uStatic.value = 0.8; }
  }

  update(dt, camera, mesh) {
    const u = this.u; u.uTime.value += dt;
    if (camera && mesh) {                      // frustum test → pause when not on screen
      camera.updateMatrixWorld(); _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frustum.setFromProjectionMatrix(_m);
      _box.setFromObject(mesh); this.setVisible(_frustum.intersectsBox(_box));
    }
    // power animation
    if (this.powerDir) { this.powerAnim = THREE.MathUtils.clamp(this.powerAnim + this.powerDir * dt / (this.powerDir > 0 ? 0.6 : 0.4), 0, 1); u.uPower.value = this.powerAnim; if (this.powerAnim === 0 || this.powerAnim === 1) this.powerDir = 0; }
    if (!this.on) return;
    // static: hold while tuning/loading, then fade out once a frame is up
    const proc = this.state === 'procedural';
    if (this.staticHold > 0) this.staticHold -= dt;
    else if (proc) u.uStatic.value = this.cur?.mode === 1 || this.cur?.dead ? 1 : Math.max(0, u.uStatic.value - dt * 3);
    else if (this.state === 'video') u.uStatic.value = Math.max(0.0, u.uStatic.value - dt * 4);
    else if (this.state === 'loading') { u.uStatic.value = Math.max(u.uStatic.value, 0.85); if (performance.now() - this.loadStarted > 6000) this._fail('timeout'); }
    if (this.state === 'video' && this.bufferingSince && performance.now() - this.bufferingSince > 700) u.uStatic.value = Math.max(u.uStatic.value, 0.35);
    // roll / bend glitches
    if (this.roll) { this.roll.t += dt; const k = Math.min(1, this.roll.t / this.roll.dur); u.uRoll.value = (1 - Math.pow(1 - k, 2.2)) * this.roll.turns; if (k >= 1) { this.roll = null; u.uRoll.value = 0; } }
    if (this.bendT > 0) { this.bendT -= dt; u.uBend.value = Math.min(1, this.bendT * 2); } else u.uBend.value *= 0.9;
    if (this.autoGlitch && (this.nextGlitch -= dt) <= 0) { this.nextGlitch = 8 + Math.random() * 18; this.glitch(Math.random() < 0.55 ? 'roll' : 'bend'); }
  }

  _noiseBurst(sec) {   // tuner hiss, only after unlock (WebAudio, no file needed)
    const a = this.audio; if (!a || !this.unlocked || a.state !== 'running') return;
    const len = Math.floor(a.sampleRate * sec), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.18 * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    s.buffer = b; s.connect(f).connect(a.destination); s.start();
  }

  _emit() { this.dispatchEvent(new CustomEvent('channel', { detail: { number: this.cur?.number, name: this.cur?.name, on: this.on } })); }
  info() { return { channel: this.cur?.number, name: this.cur?.name, state: this.state, clip: this.clip?.id, t: this.video.currentTime, muted: this.video.muted }; }

  dispose() {
    this._releaseVideo(); this.tex.dispose(); this.posterTex?.dispose(); this.material.dispose();
    document.removeEventListener('visibilitychange', this._onVis);
    if (this.video.parentNode && !this._externalVideo) this.video.remove();
    this.audio?.close?.();
  }
}
