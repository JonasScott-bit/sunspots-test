// Sunspots audio (v10): Scott's Pro music, car radio, SFX and the cast's voice lines on one Web Audio graph.
// The music follows the level: see /workspace/sunspots/audio/music_flow_map.md (one main piece per stretch, stings between).
//
//  master (mute, remembered) -> limiter -> out          analyser taps the limiter (probes read RMS)
//    music  : title (Mind Meld) | credits (The Eye Sets Over the Coral, streamed) | town (Coral Ground + Fuzzy Melt wild, equal-power)
//             | tension (Closing at Two) | Sting Suite A chops + scene cues (Readymade Last Snack, Closed in My Face, Wheel on a Stool)
//    radio  : one-shot tracks in sequence -> highpass -> bandpass -> drive -> saturator -> muffle lowpass -> level
//    sfx    : car idle/rev loops, boot thuds, bumps, horn, doors, wolf steps/huff/howl
//    amb    : town ambience (low: the file is hot)
//    vox    : non-verbal moth barks, wolf grunts, cast mumbles (fallbacks + the prank snickers/whispers) via a lowpass for the chase view
//    voice  : vo_* character lines (every mode but Off), ducking the music group ~9 dB
//    ui     : tick / confirm
//
// Formats: .ogg where the browser decodes Vorbis, .m4a on iOS (and as the fallback if an .ogg decode fails).
// Loops use loopStart/loopEnd from the manifest (sample-accurate; .m4a decodes with padding at the end).
// Loading is lazy and never blocks the game: title music first, then the town set when play starts,
// tension near its time, stings/cue/radio when you get in the car. Nothing plays until the first tap (iOS rule).
import { SOUNDS } from './audio/manifest.js';

const BASE = new URL('./audio/', import.meta.url).href;
const Q = new URLSearchParams(location.search);
const LS = 'sunspots.audio';
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canOgg = (() => { try { return !IOS && document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') !== ''; } catch (_) { return false; } })();
// v10: the Pro tracks have their own tempos/keys, so nothing is beat-locked any more; changes are crossfades.
const RADIO = ['radio_pro_four_coral_boots', 'radio_pro_wrong_station_forever', 'radio_pro_motorik_mirage'];   // the moth's 3 stations
const TENS_AT = 105;                                           // Closing at Two starts at 1:58:15 PM (105 s before 2:00)
const RADIO_LV = [1.0, 0.86, 0.74];                             // the knob: loud, still loud, "lowest"
const RADIO_TXT = ['He turns it back up.', 'He turns it down. A hair.', 'That is the lowest it goes.'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rnd = Math.random;
const pick = (arr, avoid) => { let n, g = 0; do { n = arr[Math.floor(rnd() * arr.length)]; } while (avoid && avoid.includes(n) && ++g < 12); return n; };
const range = (p, n) => Array.from({ length: n }, (_, i) => p + String(i + 1).padStart(2, '0'));
const V = { moth: range('vox_moth_', 15), snicker: range('vox_cast_snicker_', 3), whisper: range('vox_cast_whisper_', 3), mumble: range('vox_cast_mumble_', 3),
  grunt: range('vox_wolf_grunt_', 3), step: range('sfx_wolf_step_', 5), bump: range('sfx_car_bump_', 3) };
const SET = {
  title: ['music_title_loop_pro_mind_meld'],
  town: ['music_town_pro_coral_ground_loop', 'music_town_pro_fuzzy_melt_wild_loop', 'sfx_town_ambience_loop'],
  core: ['sfx_ui_tick', 'sfx_ui_confirm', 'sting_pro_a1_hits', 'sting_pro_a3_run', 'sfx_wolf_howl', 'sfx_wolf_huff', ...V.step, ...V.grunt,
    'sfx_car_idle_loop', 'sfx_car_rev_loop', 'sfx_car_boot_thud_l', 'sfx_car_boot_thud_r', ...V.bump, 'sfx_car_door_open', 'sfx_car_door_shut', 'sfx_car_horn'],
  car: ['cue_pro_readymade_last_snack', 'sting_pro_a2_twang', 'cue_pro_closed_in_my_face', 'cue_pro_wheel_on_a_stool', 'sting_pro_a4_rimshot_chord',
    ...V.moth, ...V.snicker, ...V.whisper, ...V.mumble],
  tension: ['music_tension_pro_closing_at_two'],
  // voice lines the store / roadside scenes need on time (gameplay lines load on demand and are freed after)
  sceneVo: ['vo_moth_01', 'vo_moth_02', 'vo_moth_03', 'vo_squid_01', 'vo_farmhand_01', 'vo_clerk_14', 'vo_wolf_01',
    'vo_clerk_01', 'vo_wolf_20', 'vo_clerk_02', 'vo_wolf_22', 'vo_crow_01', 'vo_ram_01', 'vo_crow_02', 'vo_ram_02', 'vo_crow_12', 'vo_ram_11'],
};

const MODES = ['off', 'sound', 'music', 'all'];
const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (_) { return {}; } })();
const A = {
  fmt: Q.get('afmt') || (canOgg ? 'ogg' : 'm4a'), ios: IOS,
  // v9 sound mode: 'all' (default) | 'music' (music + voice lines) | 'sound' (SFX + voice lines) | 'off' (silence). Old saved mute -> 'off'.
  mode: Q.has('mute') ? 'off' : (MODES.includes(saved.mode) ? saved.mode : (saved.muted ? 'off' : 'all')),
  radioLvl: Number.isInteger(saved.radioLvl) ? clamp(saved.radioLvl, 0, RADIO_LV.length - 1) : 0,
  musicVol: Number.isFinite(saved.musicVol) ? clamp(saved.musicVol, 0, 1) : 1, sfxVol: Number.isFinite(saved.sfxVol) ? clamp(saved.sfxVol, 0, 1) : 1,   // v9 SETTINGS sliders
  ctx: null, state: 'boot', buf: {}, loading: {}, trim: {}, bytes: 0, files: {}, log: [], counts: {}, errors: [],
  lastMoth: [], castT: 0, castVoice: null, barkT: 30, idleT: 0, huffT: 10, howlT: -99, hornT: 0, lastFoot: null, hopPeak: 0,
};
window.__audio = A;
A.muted = A.mode === 'off';   // kept for older callers
A.modes = MODES;
const save = () => { try { localStorage.setItem(LS, JSON.stringify({ mode: A.mode, muted: A.muted, radioLvl: A.radioLvl, musicVol: A.musicVol, sfxVol: A.sfxVol })); } catch (_) {} };
function note(ev, o) { const e = { t: +performance.now().toFixed(0), ev, ...(o || {}) }; A.log.push(e); if (A.log.length > 600) A.log.splice(0, 100); return e; }

// ---------------------------------------------------------------- context + graph
let ctx = null; const BUS = {}, N = {};
function mk() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { A.state = 'none'; return; }
  try { ctx = new AC({ latencyHint: 'interactive', sampleRate: 44100 }); } catch (_) { try { ctx = new AC(); } catch (e) { A.state = 'none'; return; } }
  A.ctx = ctx;
  const g = (v, to) => { const n = ctx.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
  N.lim = ctx.createDynamicsCompressor();
  N.lim.threshold.value = -4; N.lim.knee.value = 2; N.lim.ratio.value = 14; N.lim.attack.value = 0.003; N.lim.release.value = 0.2;
  N.lim.connect(ctx.destination);
  N.an = ctx.createAnalyser(); N.an.fftSize = 2048; N.lim.connect(N.an);
  N.master = g(A.muted ? 0 : 1, N.lim);
  // v9 mode gates: music group (music + radio) runs through the voice ducker; SFX group = sfx / amb / vox (barks, grunts) / ui;
  // the voice bus (vo_* character lines) sits outside both groups so it plays in every mode but Off.
  N.gMusic = g(modeOn('music'), N.master); N.gSfx = g(modeOn('sfx'), N.master);
  N.duck = g(1, N.gMusic);
  BUS.music = g(0.5, N.duck); BUS.radio = g(0.85, N.duck);
  BUS.sfx = g(0.8, N.gSfx); BUS.amb = g(0.13, N.gSfx); BUS.vox = g(0.85, N.gSfx); BUS.ui = g(0.35, N.gSfx);
  BUS.voice = g(0.95, N.master);
  applyVol(true);
  N.title = g(0, BUS.music); N.town = g(0, BUS.music); N.sun = g(1, N.town); N.wild = g(0, N.town);
  N.tens = g(0, BUS.music); N.sting = g(1, BUS.music); N.cred = g(0, BUS.music);
  N.amb = g(0, BUS.amb);
  // car radio: thin + a little crunchy. Outside the car (chase view, on foot, scenes) the muffle closes down.
  N.rIn = g(1); N.rHp = ctx.createBiquadFilter(); N.rHp.type = 'highpass'; N.rHp.frequency.value = 340; N.rHp.Q.value = 0.8;
  N.rBp = ctx.createBiquadFilter(); N.rBp.type = 'bandpass'; N.rBp.frequency.value = 1300; N.rBp.Q.value = 0.85;
  N.rDrive = g(1.5); N.rSat = ctx.createWaveShaper(); N.rSat.curve = satCurve(1.6); N.rSat.oversample = '2x';
  N.rPost = g(0.95); N.rMuf = ctx.createBiquadFilter(); N.rMuf.type = 'lowpass'; N.rMuf.frequency.value = 4200; N.rMuf.Q.value = 0.5;
  N.rLvl = g(0, BUS.radio);
  N.rIn.connect(N.rHp); N.rHp.connect(N.rBp); N.rBp.connect(N.rDrive); N.rDrive.connect(N.rSat); N.rSat.connect(N.rPost); N.rPost.connect(N.rMuf); N.rMuf.connect(N.rLvl);
  // car engine + cabin voices (lowpassed in the chase view: you're outside the car)
  N.eng = g(1, BUS.sfx); N.idle = g(0, N.eng); N.rev = g(0, N.eng);
  N.cabLp = ctx.createBiquadFilter(); N.cabLp.type = 'lowpass'; N.cabLp.frequency.value = 18000; N.cab = g(1); N.cab.connect(N.cabLp); N.cabLp.connect(BUS.vox);
  A.state = 'title';
  ctx.onstatechange = () => { note('ctx', { s: ctx.state }); if (ctx.state === 'running') kick(); };
}
function satCurve(k) { const n = 1024, c = new Float32Array(n), d = Math.tanh(k); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / d; } return c; }
const running = () => ctx && ctx.state === 'running';
const P = (param, v, tc = 0.05) => { if (!ctx) return; if (param._v !== undefined && Math.abs(param._v - v) < 0.002) return; param._v = v; param.setTargetAtTime(v, ctx.currentTime, tc); };

// ---------------------------------------------------------------- loading
function decode(ab) { return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }
function load(name) {
  if (A.buf[name]) return Promise.resolve(A.buf[name]);
  if (A.loading[name]) return A.loading[name];
  if (!ctx || !SOUNDS[name]) return Promise.reject(new Error('no ' + name));
  const p = (async () => {
    let fmt = A.fmt;
    for (;;) {
      try {
        const r = await fetch(BASE + name + '.' + fmt); if (!r.ok) throw new Error('HTTP ' + r.status);
        const ab = await r.arrayBuffer(); A.bytes += ab.byteLength; A.files[name] = { fmt, kb: +(ab.byteLength / 1024).toFixed(1) };
        const b = await decode(ab);
        const tr = SOUNDS[name].trim?.[fmt] || 0; A.trim[name] = Math.pow(10, -tr / 20);
        A.buf[name] = b; A.files[name].len = b.length; A.files[name].sr = b.sampleRate; return b;
      } catch (e) {
        if (fmt === 'ogg') { note('fallback', { name, err: String(e.message || e) }); fmt = 'm4a'; A.fmt = 'm4a'; continue; }
        throw e;
      }
    }
  })();
  A.loading[name] = p;
  p.catch(e => { A.errors.push(name + ': ' + (e.message || e)); delete A.loading[name]; });
  return p;
}
const loadSet = (names) => Promise.all(names.map(n => load(n).catch(() => null)));
function drop(name) { delete A.buf[name]; delete A.loading[name]; }
// ---------------------------------------------------------------- playback helpers
function play(name, o = {}) {
  A.counts[name] = (A.counts[name] || 0) + 1;
  const b = A.buf[name];
  if (!b || !running()) { note(b ? 'skip' : 'miss', { name }); if (!b) load(name).catch(() => {}); return null; }
  const s = ctx.createBufferSource(); s.buffer = b; if (o.rate) s.playbackRate.value = o.rate;
  const gn = ctx.createGain(); gn.gain.value = (o.gain ?? 1) * (A.trim[name] ?? 1); s.connect(gn);
  let out = gn;
  if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); gn.connect(p); out = p; }
  out.connect(o.dest || BUS[o.bus || 'sfx']);
  const t = Math.max(ctx.currentTime, o.when || 0); s.start(t, o.offset || 0);
  s.onended = () => { try { out.disconnect(); } catch (_) {} };
  note('play', { name, bus: o.bus || (o.dest ? o.destName || 'node' : 'sfx'), g: +(gn.gain.value).toFixed(3), at: +(t - ctx.currentTime).toFixed(3) });
  return { src: s, g: gn, t, name, stop(f = 0.06) { try { const n = ctx.currentTime; gn.gain.cancelScheduledValues(n); gn.gain.setValueAtTime(gn.gain.value, n); gn.gain.linearRampToValueAtTime(0, n + f); s.stop(n + f + 0.02); } catch (_) {} } };
}
function loopSrc(name, dest, when, offset = 0) {
  const b = A.buf[name], m = SOUNDS[name]; const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
  s.loopStart = m.loopStart || 0; s.loopEnd = m.loopEnd || b.duration;
  let out = dest; if (A.trim[name] && A.trim[name] !== 1) { out = ctx.createGain(); out.gain.value = A.trim[name]; out.connect(dest); }
  s.connect(out); s.start(when, ((offset % s.loopEnd) + s.loopEnd) % s.loopEnd);
  note('loop', { name, loopEnd: s.loopEnd, bufDur: +b.duration.toFixed(5), off: +offset.toFixed(3) });
  return s;
}

// ---------------------------------------------------------------- unlock (first tap), mute, visibility
let primed = false;
function unlock() {
  if (!ctx) return;
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (_) {}   // iOS 17+: ignore the ringer switch
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!primed) { primed = true; try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (_) {} }
  kick();
}
for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (primed) ctx.resume().catch(() => {}); });
function modeOn(grp) { const m = A.mode; return m === 'all' || (grp === 'music' ? m === 'music' : m === 'sound') ? 1 : 0; }
const ramp = (gp, v, tc = 0.03) => { const n = ctx.currentTime; gp.cancelScheduledValues(n); gp.setTargetAtTime(v, n, tc); };
const modeFns = [];
A.onMode = (fn) => { modeFns.push(fn); fn(A.mode); };
A.setMode = (m) => {
  if (!MODES.includes(m)) return A.mode;
  A.mode = m; A.muted = m === 'off'; save();
  if (N.master) { ramp(N.master.gain, A.muted ? 0 : 1); ramp(N.gMusic.gain, modeOn('music')); ramp(N.gSfx.gain, modeOn('sfx')); }
  syncBtn(); note('mode', { mode: m }); for (const f of modeFns) { try { f(m); } catch (_) {} }
  return m;
};
A.cycleMode = () => A.setMode(MODES[(MODES.indexOf(A.mode) + 1) % MODES.length]);
A.setMuted = (m) => A.setMode(m ? 'off' : 'all');
// v9 voice lines (vo_* files, not wired yet): voice bus + sidechain-style music duck, ~9 dB down over 150 ms, back over 400 ms
const DUCK = Math.pow(10, -9 / 20); let voices = 0;
function duck(on) {
  if (!N.duck) return; const gp = N.duck.gain, n = ctx.currentTime;
  gp.cancelScheduledValues(n); gp.setValueAtTime(gp.value, n); gp.linearRampToValueAtTime(on ? DUCK : 1, n + (on ? 0.15 : 0.4));
}
A.playVoice = (name, o = {}) => {
  if (A.mode === 'off' || !ctx) return Promise.resolve(null);
  const go = () => {
    if (A.mode === 'off') return null;
    const h = play(name, { bus: 'voice', gain: o.gain ?? 1, pan: o.pan, when: o.when });
    if (!h) return null;
    voices++; duck(true); A.voice = h;
    h.src.addEventListener('ended', () => { voices = Math.max(0, voices - 1); if (!voices) duck(false); if (A.voice === h) A.voice = null; });
    return h;
  };
  if (A.buf[name]) return Promise.resolve(go());
  return load(name).then(go, () => { note('miss', { name, voice: true }); return null; });
};
// v9 intro sting ('Ethereal Arrival', 8.6 s) - started by title.js in step with the EES intro video; music group (mode Music/All)
A.startIntro = (videoT = 0) => {
  const b = A.buf.intro_ethereal_arrival;
  if (!running() || !b || A.introH || !modeOn('music')) { if (!b && ctx) load('intro_ethereal_arrival').catch(() => {}); return false; }
  const off = Math.max(0, videoT + 0.03 + (ctx.outputLatency || ctx.baseLatency || 0));
  if (off > b.duration - 0.3) return false;
  A.introH = play('intro_ethereal_arrival', { bus: 'music', gain: 1.0, offset: off, when: ctx.currentTime + 0.03 });
  if (A.introH) { A.introH.src.addEventListener('ended', () => { A.introH = null; }); note('intro_sting', { off: +off.toFixed(3) }); }
  return !!A.introH;
};
A.stopIntro = (f = 0.45) => { if (A.introH) { A.introH.stop(f); A.introH = null; } };
A.whenRunning = () => (!ctx ? Promise.reject(new Error('no audio')) : running() ? Promise.resolve() : ctx.resume());
A.musicAudible = () => !!ctx && modeOn('music') === 1;
A.duckLevel = () => (N.duck ? N.duck.gain.value : 1);
// v9 SETTINGS: MUSIC scales the music + radio buses, SFX scales sfx / ambience / voices / UI (remembered with mute)
const BUS_BASE = { music: 0.5, radio: 0.85, sfx: 0.8, amb: 0.13, vox: 0.85, ui: 0.35 };   // voice bus is not on a slider (plays in every mode but Off)
function applyVol(now) {
  if (!ctx) return; const n = ctx.currentTime;
  for (const k in BUS_BASE) { const v = BUS_BASE[k] * ((k === 'music' || k === 'radio') ? A.musicVol : A.sfxVol); const gp = BUS[k].gain;
    if (now) gp.value = v; else { gp.cancelScheduledValues(n); gp.setTargetAtTime(v, n, 0.04); } }
}
A.setVolumes = (o = {}) => { if (o.music != null) A.musicVol = clamp(+o.music, 0, 1); if (o.sfx != null) A.sfxVol = clamp(+o.sfx, 0, 1); applyVol(false); save(); note('vol', { music: A.musicVol, sfx: A.sfxVol }); };
let btn = null;
const MODE_TXT = { off: 'SOUND OFF', sound: 'SFX ONLY', music: 'MUSIC ONLY', all: 'ALL SOUND' };
A.modeText = (m = A.mode) => MODE_TXT[m];
function syncBtn() { if (!btn) return; btn.dataset.mode = A.mode; btn.classList.toggle('off', A.muted); btn.setAttribute('aria-label', 'Sound: ' + MODE_TXT[A.mode] + ' (tap to change)'); btn.title = MODE_TXT[A.mode]; }

// ---------------------------------------------------------------- title music
function kick() {   // (re)start whatever the current state wants, once the context runs and buffers exist
  if (!running() || window.__introUp) return;   // v9: Mind Meld waits for the menu (the EES intro is silent)
  if (A.state === 'title' && !A.titleSrc && A.buf.music_title_loop_pro_mind_meld) {
    const n = ctx.currentTime + 0.05; A.titleSrc = loopSrc('music_title_loop_pro_mind_meld', N.title, n, 0); A.titleT0 = n;
    N.title.gain.setValueAtTime(0, n); N.title.gain.linearRampToValueAtTime(1, n + 1.2); note('title_music', { on: 1 });
  }
}
function leaveTitle() {
  if (A.state !== 'title') return; A.state = 'game'; note('state', { s: 'game' });
  loadSet(SET.town).then(() => { startTown(); return loadSet(SET.core); }).then(() => { startEngine(); A.coreReady = true; });
}

// ---------------------------------------------------------------- town (Coral Ground + Fuzzy Melt, both F minor), ambience, tension
const TOWN = SET.town;
function startTown() {
  if (A.townSrc || !ctx || !A.buf[TOWN[0]] || !A.buf[TOWN[1]]) return;
  if (!running()) { setTimeout(startTown, 400); return; }
  const n = ctx.currentTime + 0.08; A.t0 = n;
  // two loops started together (40.03 s / 40.02 s); the wild knob is an equal-power crossfade between them, not a beat-locked layer
  A.townSrc = [loopSrc(TOWN[0], N.sun, n, 0), loopSrc(TOWN[1], N.wild, n, 0)];
  if (A.buf.sfx_town_ambience_loop && !A.ambSrc) { A.ambSrc = loopSrc('sfx_town_ambience_loop', N.amb, n, rnd() * 40); }
  // Mind Meld hands over: town fades up under it, Mind Meld fades out, then its buffer is freed
  N.town.gain.setValueAtTime(0, n); N.town.gain.linearRampToValueAtTime(1, n + 3); N.town.gain._v = 1;
  if (A.titleSrc) { const s = A.titleSrc; N.title.gain.cancelScheduledValues(n); N.title.gain.setValueAtTime(N.title.gain.value, n); N.title.gain.linearRampToValueAtTime(0, n + 3.2); s.stop(n + 3.4); A.titleSrc = null; }
  setTimeout(() => { if (A.state === 'game') drop('music_title_loop_pro_mind_meld'); }, 4000);
  note('town', { t0: +n.toFixed(3) });
}
// Closing at Two: plays from its quiet intro, then loops its second half (seam crossfaded in the file). Fades in over ~4 s.
function startTension() {
  const name = SET.tension[0];
  if (A.tensSrc || !A.buf[name] || !running()) return;
  const n = ctx.currentTime + 0.05; A.tensSrc = loopSrc(name, N.tens, n, 0); A.tensT0 = n;
  N.tens.gain.cancelScheduledValues(n); N.tens.gain.setValueAtTime(0, n); N.tens.gain._v = undefined; A.tensUpT = n;
  note('tension_on', { left: +(G?.L?.left ?? 0).toFixed(1) });
}
function stopTension(f = 1.5) {
  if (!A.tensSrc) return; const n = ctx.currentTime; N.tens.gain.cancelScheduledValues(n); N.tens.gain.setValueAtTime(N.tens.gain.value, n); N.tens.gain.linearRampToValueAtTime(0, n + f); N.tens.gain._v = 0;
  try { A.tensSrc.stop(n + f + 0.05); } catch (_) {} A.tensSrc = null; note('tension_off', {});
}

// ---------------------------------------------------------------- radio (one-shots in sequence, hard cuts)
function radioStart() {
  if (A.radio || !running()) return;
  const i = Math.floor(rnd() * RADIO.length); A.radioIdx = i;
  load(RADIO[i]).then(b => { if (A.radio || !running()) return; const off = 3 + rnd() * 30, n = ctx.currentTime + 0.05; radioSched(i, n - off, off); });
}
function radioSched(i, t0, off = 0) {
  const name = RADIO[i], b = A.buf[name]; if (!b) return;
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(N.rIn);
  const when = Math.max(ctx.currentTime + 0.01, t0 + off); s.start(when, off);
  A.radio = { i, t0, end: t0 + SOUNDS[name].dur, src: s, next: false };
  A.counts[name] = (A.counts[name] || 0) + 1; note('radio', { name, off: +off.toFixed(2) });
  const K = RADIO.length; load(RADIO[(i + 1) % K]).catch(() => {});
  const prev = RADIO[(i + K - 1) % K]; if (prev !== name) setTimeout(() => { if (A.radio && RADIO[A.radio.i] !== prev && RADIO[(A.radio.i + 1) % K] !== prev) drop(prev); }, 3000);
}
function radioTick() {
  const r = A.radio; if (!r || r.next) return;
  if (ctx.currentTime > r.end - 1.5) { const j = (r.i + 1) % RADIO.length; if (A.buf[RADIO[j]]) { r.next = true; radioSched(j, r.end, 0); } }   // gapless: next starts on the sample the last one cuts
  if (ctx.currentTime > r.end + 0.5 && !r.next) { r.next = true; A.radio = null; radioStart(); }
}
const KNOB_VO = [['vo_moth_04', 'vo_moth_08'], ['vo_moth_07'], ['vo_moth_05', 'vo_moth_06']];   // the moth answers the knob
A.cycleRadio = () => {
  A.radioLvl = (A.radioLvl + 1) % RADIO_LV.length; save(); note('radio_vol', { lvl: A.radioLvl, v: RADIO_LV[A.radioLvl] });
  let txt = RADIO_TXT[A.radioLvl];
  if (ctx && G?.L?.inCar && ctx.currentTime - (A.knobT || -99) > 5) { const n = pick(KNOB_VO[A.radioLvl]); if (line(n, { toast: false })) { A.knobT = ctx.currentTime; txt += '  MOTH: \u201c' + voText(n) + '\u201d'; } }
  return txt;
};
A.radioLevel = () => RADIO_LV[A.radioLvl];

// ---------------------------------------------------------------- car engine
function startEngine() {
  if (A.engSrc || !running() || !A.buf.sfx_car_idle_loop || !A.buf.sfx_car_rev_loop) return;
  const n = ctx.currentTime + 0.05; A.engSrc = [loopSrc('sfx_car_idle_loop', N.idle, n, 0), loopSrc('sfx_car_rev_loop', N.rev, n, 1.3)];
}

// ---------------------------------------------------------------- game hooks
let G = null;   // { L, CK, getDirector, getWild, wolfState }
A.attach = (g) => { G = g; };
A.ui = (kind, soft) => { if (A.state === 'title' && kind === 'tick') return; play(kind === 'confirm' ? 'sfx_ui_confirm' : 'sfx_ui_tick', { bus: 'ui', gain: soft ? 0.45 : 1 }); };
A.wild = (on) => {
  if (!ctx) return; const at = ctx.currentTime + 0.02;            // Sting Suite A: the run into Wild, the felt hits back to sunshine
  play(on ? 'sting_pro_a3_run' : 'sting_pro_a1_hits', { bus: 'music', dest: N.sting, destName: 'music.sting', gain: 0.85, when: at });
  if (on && ctx.currentTime - A.howlT > 10) { A.howlT = ctx.currentTime; play('sfx_wolf_howl', { gain: 0.42, when: at + 0.9 }); }
  if (on && G?.L?.started && !G.L.ended && ctx.currentTime - (A.wildVoT || -99) > 14) {
    A.wildVoT = ctx.currentTime; const car = G.L.inCar;
    setTimeout(() => line(pickFresh(car ? ['vo_wolf_11', 'vo_squid_12', 'vo_farmhand_11'] : ['vo_wolf_11', 'vo_wolf_13', 'vo_wolf_14', 'vo_wolf_04']), { retry: 3 }), 1700);
  }
};
A.horn = () => {
  if (!ctx || ctx.currentTime - A.hornT < 0.4) return; A.hornT = ctx.currentTime;
  play('sfx_car_horn', { gain: 0.5 * (G?.CK?.chase ? 0.75 : 1) });
  if (rnd() < 0.3 && !A.voice) setTimeout(() => moth(0.85), 700);
};
function moth(gain = 0.9) {
  const n = pick(V.moth, A.lastMoth); A.lastMoth.push(n); if (A.lastMoth.length > 5) A.lastMoth.shift();
  const chase = G?.L?.inCar && G?.CK?.chase;
  return play(n, chase ? { dest: N.cab, destName: 'vox.cab', gain: gain * 0.75 } : { bus: 'vox', gain });
}
A.moth = moth;
// scene say beats (scenes.js): the real line when the beat names one (b.vo), else the old non-verbal bark
A.say = (who, blocking, dur, vo) => {
  if (vo && SOUNDS[vo]) { A.playVoice(vo, { gain: 1 }); note('say_vo', { who, vo }); return; }
  if (who === 'moth') moth(blocking ? 1 : 0.8);
  else if (who === 'wolf') play(pick(V.grunt), { bus: 'vox', gain: 0.7 });
  else { const h = play(pick(V.mumble), { bus: 'vox', gain: blocking ? 0.5 : 0.35, pan: (rnd() - 0.5) * 0.4 }); if (h && dur) setTimeout(() => h.stop(0.25), Math.max(400, dur * 1000)); }
};
// the prank cast in the car: a member starts acting up when the moth looks away -> snicker / whisper;
// when he looks back they snap innocent -> any of their voices stops dead (sometimes a stifled half-snicker)
A.cast = (m, from, to) => {
  if (!ctx) return; const now = ctx.currentTime, pan = clamp(-0.45 * (m.side || 0), -0.6, 0.6);
  if (to === 'innocent') {
    if (A.castVoice && A.castVoice.who === m) { A.castVoice.h?.stop(0.05); A.castVoice = null; note('cast_hush', { who: m.name }); }
    else if (from !== 'innocent' && !m.isWolf && now - (A.mirrorT || -99) > 22 && rnd() < 0.18 && !A.voice) { A.mirrorT = now; line(pick(['vo_moth_17', 'vo_moth_18']), {}); }   // he saw that
    else if (from !== 'innocent' && !m.isWolf && now - A.castT > 1.2 && rnd() < 0.3) { const h = play(pick(V.snicker), { dest: N.cab, destName: 'vox.cab', gain: 0.4, pan }); if (h) setTimeout(() => h.stop(0.04), 230); A.castT = now; }
    return;
  }
  if (!G?.L?.inCar || G.L.ended || now - A.castT < 2.4 || (A.castVoice && now < A.castVoice.end)) return;   // only from inside the moving car
  if (from !== 'innocent' && rnd() > 0.35) return;
  let h;
  if (m.isWolf) { if (rnd() < 0.5) h = play('sfx_wolf_huff', { dest: N.cab, destName: 'vox.cab', gain: 0.45, pan }); }
  else h = play(pick(to === 'whisper' ? V.whisper : V.snicker), { dest: N.cab, destName: 'vox.cab', gain: to === 'whisper' ? 0.65 : 0.55, pan });
  if (h) { A.castT = now; A.castVoice = { who: m, h, end: now + h.src.buffer.duration }; note('cast', { who: m.name, act: to }); }
};
A.step = (speed) => { if (A.state !== 'game') return; play(pick(V.step), { gain: 0.3 + 0.45 * clamp(speed / 7.2, 0, 1), rate: 0.94 + rnd() * 0.12 }); A.idleT = 0; };
A.ev = (kind, o = {}) => {
  if (!ctx) return;
  const L = G?.L;
  switch (kind) {
    case 'enterCar':
      play('sfx_car_door_open', { gain: 0.55 }); play('sfx_car_door_shut', { gain: 1, when: ctx.currentTime + 0.65 });
      play(pick(V.grunt), { bus: 'vox', gain: 0.55, when: ctx.currentTime + 0.3 }); loadSet(SET.car); loadSet(SET.sceneVo); A.barkT = 26 + rnd() * 10;
      setTimeout(() => line('vo_wolf_03', { retry: 4 }), 1500);                                   // "Coral ground, cobalt sky. Let's roll."
      A.radioVoT = 13; break;                                                                      // then the radio remark, once it's on
    case 'bonk': play(pick(V.bump), { gain: 1, rate: 0.9 + rnd() * 0.15 });
      if (rnd() < 0.35 && ctx.currentTime - (A.bonkVoT || -99) > 10 && !A.voice) { A.bonkVoT = ctx.currentTime; setTimeout(() => line(pickFresh(['vo_moth_13', 'vo_moth_14', 'vo_squid_11', 'vo_farmhand_10']), {}), 500); }
      else if (rnd() < 0.25 && !A.voice) setTimeout(() => moth(0.8), 600); break;
    case 'guard': for (let i = 0; i < 4; i++) play(i === 3 ? 'sfx_car_bump_01' : 'sfx_car_bump_03', { gain: i === 3 ? 0.9 : 0.55, rate: 1.1 + rnd() * 0.2, when: ctx.currentTime + i * 0.075 }); break;
    case 'tumble': play('sfx_car_bump_02', { gain: 0.45, rate: 1.3 }); break;
    case 'late': play('sfx_wolf_huff', { gain: 0.6 }); break;
    case 'finish': {
      // win: Readymade Last Snack (started at the store arrival) keeps playing; the Sting Suite twang tags it.
      // lose: Closed in My Face under the CLOSED card.
      stopTension(o.won ? 1.2 : 0.6); pend = null;
      if (!A.stingDone) { A.stingDone = true;
        if (o.won) play('sting_pro_a2_twang', { dest: N.sting, destName: 'music.sting', gain: 0.9, when: ctx.currentTime + 0.25 });
        else { if (A.cue) { A.cue.stop(0.5); A.cue = null; } const h = play('cue_pro_closed_in_my_face', { dest: N.sting, destName: 'music.sting', gain: 1, when: ctx.currentTime + 0.25 }); if (h) { A.cue = h; A.cueEnd = ctx.currentTime + 0.25 + h.src.buffer.duration; } }
      }
      A.endT = ctx.currentTime; break; }
    case 'reset': A.stingDone = false; A.endT = null; if (A.cue) { A.cue.stop(0.3); A.cue = null; } stopTension(0.3); A.tensLoading = false; resetLines(); break;
  }
};
// scene cues (scenes.js CUES): real sounds where one exists, the rest stay silent no-ops
A.cue = null;
A.playCue = (name) => {
  if (!ctx) return; const now = ctx.currentTime;
  switch (name) {
    case 'mus_store_arrive': { stopTension(1.0); const h = play('cue_pro_readymade_last_snack', { dest: N.sting, destName: 'music.sting', gain: 0.95 }); if (h) { A.cue = h; A.cueEnd = now + h.src.buffer.duration; } break; }
    case 'mus_roadside': { if (A.cue && now < A.cueEnd) break; const h = play('cue_pro_wheel_on_a_stool', { dest: N.sting, destName: 'music.sting', gain: 0.75 }); if (h) { A.cue = h; A.cueEnd = now + h.src.buffer.duration; A.cueSoft = true; } break; }
    case 'sting_roadside': play('sting_pro_a4_rimshot_chord', { dest: N.sting, destName: 'music.sting', gain: 0.8 }); break;
    case 'sfx_boots_stop': { let t = now; [0.2, 0.26, 0.33, 0.42, 0.55].forEach((d, i) => { play(i % 2 ? 'sfx_car_boot_thud_r' : 'sfx_car_boot_thud_l', { gain: 0.9 - i * 0.13, when: t, rate: 1 - i * 0.03, pan: i % 2 ? 0.2 : -0.2 }); t += d; }); play('sfx_car_bump_02', { gain: 0.5, rate: 0.75, when: t + 0.05 }); break; }
    case 'sfx_car_door_open': play('sfx_car_door_open', { gain: 0.55 }); break;
    case 'sfx_car_door_close': play('sfx_car_door_shut', { gain: 1 }); break;
    case 'sfx_store_door_shut': play('sfx_car_door_shut', { gain: 1.2, rate: 0.82 }); break;   // stand-in: no store door in the set
    case 'mus_win_tag': A.ev('finish', { won: true }); break;   // (the call beat also finishes; the sting only plays once)
    case 'mus_lose_tag': A.ev('finish', { won: false }); break;
    case 'amb_radio_outside': break;                                                          // handled by the radio duck + outside muffle
    default: note('cue_silent', { name }); return;
  }
  note('cue', { name });
};

// ---------------------------------------------------------------- per frame (main.js, after level.update)
A.update = (dt) => {
  if (!ctx || !G) return;
  if (A.state === 'title' && !window.__titleUp) leaveTitle();
  if (A.state !== 'game' || !running()) return;
  const { L, CK } = G, c = L.car, D = G.getDirector?.()?.D, run = D?.run, blocking = !!run?.sc?.blocking;
  const now = ctx.currentTime;
  if (!A.townSrc) startTown();
  if (A.coreReady && !A.engSrc) startEngine();
  // music levels (v10): one main piece per stretch. On foot = the town loop; in the cabin the moth's radio IS the music
  // (the town all but goes, its key would fight the station); near 2 PM Closing at Two takes over and the radio sinks under it;
  // scene cues and the end cues play alone. Crossfade times: town<->car ~1 s (tc 0.35), tension fade-in ~4 s.
  const cueOn = A.cue && now < A.cueEnd;
  if (A.cue && !cueOn) { A.cue = null; A.cueSoft = false; }
  const tensUp = A.tensSrc ? clamp((now - A.tensUpT) / 4, 0, 1) : 0;
  let town = 1, tens = 0.85 * tensUp;
  if (L.ended) { const e = A.endT != null ? now - A.endT : 99; town = cueOn || e < 5 ? 0 : 0.3; tens = 0; }
  else if (cueOn) { town = 0; tens = 0; }
  else if (blocking) { town = 0.4; tens *= 0.5; }
  else if (L.inCar) { town = CK.chase ? 0.12 : 0; tens = (CK.chase ? 0.8 : 0.7) * tensUp; }
  if (A.tensSrc && !L.ended) town *= 1 - tensUp;
  P(N.town.gain, town, 0.35); P(N.tens.gain, tens, tensUp < 1 ? 0.25 : 0.35);
  const w = clamp(G.getWild?.() || 0, 0, 1);
  P(N.sun.gain, Math.cos(w * Math.PI / 2), 0.03); P(N.wild.gain, Math.sin(w * Math.PI / 2), 0.03);   // equal power: cos² + sin² = 1
  // tension: lazy-load ~25 s ahead, start at 105 s before 2 PM (after 2:00 it keeps going until the store)
  if (L.started && !L.ended && L.left < TENS_AT + 25 && !A.tensLoading) { A.tensLoading = true; loadSet(SET.tension); }
  if (L.started && !L.ended && L.left <= TENS_AT && !A.tensSrc && !A.tensDone && !cueOn) { startTension(); if (A.tensSrc) A.tensDone = true; }
  // ambience: a town bed; thinner in the cabin and out in the desert
  const pos = L.inCar ? c.pos : G.wolfState.pos, dTown = Math.hypot(pos.x - 2, pos.z - 4);
  P(N.amb.gain, (L.inCar ? (CK.chase ? 0.8 : 0.45) : 1) * (dTown > 60 ? 0.45 : 1), 0.6);
  // radio: level from level.js (distance / car / scene ducks) x the knob; muffled when you're not in the cabin
  const want = L.radioVol || 0; if (want > 0 && !A.radio) radioStart(); radioTick();
  const outside = !L.inCar || CK.chase || blocking;
  P(N.rLvl.gain, want * RADIO_LV[A.radioLvl] * (outside ? 0.6 : 1) * (1 - 0.6 * tensUp), 0.15);   // the station sinks under Closing at Two P(N.rMuf.frequency, outside ? 950 : 4200, 0.15);
  P(N.cabLp.frequency, L.inCar && CK.chase ? 2200 : 18000, 0.1); P(N.cab.gain, L.inCar && CK.chase ? 0.7 : 1, 0.1);
  // engine: idle <-> rev by speed (pitch + gain); faint from the street when you're on foot
  const sp = Math.abs(c.v || 0), k = clamp(sp / 19, 0, 1), dCar = Math.hypot(G.wolfState.pos.x - c.pos.x, G.wolfState.pos.z - c.pos.z);
  const prox = L.inCar ? (CK.chase ? 0.8 : 1) : clamp(1 - dCar / 26, 0, 1) * 0.55;
  const endK = L.ended ? 0.4 : 1;
  P(N.idle.gain, prox * endK * 0.3 * (1 - 0.65 * k), 0.08); P(N.rev.gain, prox * endK * 0.42 * k * k * (3 - 2 * k), 0.08);
  if (A.engSrc) { P(A.engSrc[0].playbackRate, 0.92 + 0.5 * k, 0.08); P(A.engSrc[1].playbackRate, 0.72 + 0.6 * k, 0.08); }
  // boot thuds: one per footfall of the waddle (body bounce = |sin(step)| -> a footfall each pi), alternating L/R
  const fi = Math.floor(c.step / Math.PI);
  if (A.lastFoot !== fi) {
    if (A.lastFoot != null && c.stepAmp > 0.12 && !blocking && prox > 0.04) {
      const left = (fi & 1) === 0; A.thuds = (A.thuds || 0) + 1;
      play(left ? 'sfx_car_boot_thud_l' : 'sfx_car_boot_thud_r', { gain: (0.2 + 0.7 * c.stepAmp) * prox, rate: 0.96 + rnd() * 0.08, pan: left ? -0.25 : 0.25 });
    }
    A.lastFoot = fi;
  }
  // landings after a hop (bonk, cattle guard)
  if (c.hop > 0.02) A.hopPeak = Math.max(A.hopPeak, c.hop); else if (A.hopPeak > 0.06) { play(pick(V.bump), { gain: clamp(A.hopPeak * 2.2, 0.3, 0.9) * prox, rate: 0.85 + rnd() * 0.1 }); A.hopPeak = 0; } else A.hopPeak = 0;
  // voice lines (v10): the cast talks now and then while driving (replaces the v9 moth barks), plus the clock beats
  lines(dt, L, CK, blocking, sp);
  // the wolf: an idle huff when standing around on foot
  if (L.mode === 'walk' && !blocking && (G.wolfState.speed || 0) < 0.1) { A.idleT += dt; if (A.idleT > 7) { A.huffT -= dt; if (A.huffT <= 0) { play('sfx_wolf_huff', { gain: 0.5 }); A.huffT = 12 + rnd() * 8; } } } else { A.idleT = 0; A.huffT = 1 + rnd() * 2; }
  if (L.lateSaid && !A.lateDone) { A.lateDone = true; A.ev('late'); } else if (!L.lateSaid) A.lateDone = false;
};

// ---------------------------------------------------------------- Level 1 voice lines (vo_*, via playVoice: ducks the music ~9 dB)
// Gameplay lines show a subtitle toast "WHO: line". One line at a time; a line that can't start waits (retry s) or is dropped.
// Lines load on demand and their buffers are freed after they play (the scene lines are preloaded on enterCar, SET.sceneVo).
const WHO = { moth: 'MOTH', wolf: 'WOLF', squid: 'BANANA SQUID', farmhand: 'FARMHAND', clerk: 'CLERK', crow: 'CROW', ram: 'RAM' };
const voText = (n) => SOUNDS[n]?.text || '';
A.voDur = (n) => SOUNDS[n]?.dur || 0;
const CHAT = ['vo_moth_09', 'vo_moth_10', 'vo_moth_11', 'vo_moth_12', 'vo_moth_15', 'vo_squid_02', 'vo_squid_03', 'vo_squid_04', 'vo_squid_05', 'vo_squid_09', 'vo_squid_10', 'vo_squid_16',
  'vo_farmhand_02', 'vo_farmhand_03', 'vo_farmhand_04', 'vo_farmhand_05', 'vo_farmhand_08', 'vo_farmhand_09', 'vo_wolf_06', 'vo_wolf_10'];
let said = new Set(), pend = null, lastWho = null;
function pickFresh(arr) { const f = arr.filter(n => !said.has(n) && SOUNDS[n]); return f.length ? f[Math.floor(rnd() * f.length)] : null; }
function resetLines() { said = new Set(); pend = null; A.clk = {}; A.footT = 0; A.radioVoT = null; A.tensDone = false; }
A.clk = {}; A.footT = 0;
function line(n, o = {}) {
  if (!n || !SOUNDS[n] || !ctx || A.mode === 'off') return false;
  const L = G?.L, D = G?.getDirector?.()?.D, run = D?.run;
  const busy = A.voice || A.lineLoading || !!run || (D?.bgRuns?.length > 0) ||   // no gameplay lines over any scene, blocking or not (roadside runs in the background)
    L?.ended || window.__titleUp;
  if (busy) { if (o.retry && !(L?.ended)) pend = { n, o: { ...o, retry: 0 }, until: ctx.currentTime + o.retry }; return false; }
  said.add(n); const who = n.split('_')[1]; lastWho = who; A.lineLoading = true;
  A.playVoice(n, { gain: 1, pan: who === 'squid' ? 0.25 : who === 'farmhand' ? -0.25 : 0 }).then(h => {
    A.lineLoading = false; if (!h) return;
    if (o.toast !== false && L?.toast) L.toast(WHO[who] + ': \u201c' + voText(n) + '\u201d', Math.max(2.2, h.src.buffer.duration + 0.6));
    h.src.addEventListener('ended', () => { if (!SET.sceneVo.includes(n)) setTimeout(() => { if (A.voice?.name !== n) drop(n); }, 200); o.then && setTimeout(o.then, 350); });
  });
  note('line', { n, who }); return true;
}
A.line = line;
function lines(dt, L, CK, blocking, sp) {
  const now = ctx.currentTime;
  if (pend) { if (now > pend.until) pend = null; else if (line(pend.n, pend.o)) pend = null; }
  if (!L.started || L.ended || blocking || L.frozen) return;
  // on foot, at the start: the Wolf sets the mission
  if (L.mode === 'walk' && !L.inCar) { A.footT += dt; if (A.footT > 3 && !said.has('vo_wolf_08')) line('vo_wolf_08', { retry: 5 }); }
  // in the car: the radio remark ~13 s in (Wolf, then the moth), then chatter every 25-45 s (no repeats)
  if (L.inCar && L.mode === 'drive') {
    if (A.radioVoT != null) { A.radioVoT -= dt; if (A.radioVoT <= 0) { A.radioVoT = null; if (A.radio) line('vo_wolf_02', { retry: 6, then: () => line('vo_moth_04', { retry: 3 }) }); } }
    A.barkT -= dt;
    if (A.barkT <= 0 && sp > 2 && !A.voice) { const n = pickFresh(CHAT.filter(x => !x.includes('_' + lastWho + '_'))) || pickFresh(CHAT); if (n) line(n, {}); else moth(0.8); A.barkT = 25 + rnd() * 20; }
  }
  // the clock (L.left = seconds to 2 PM)
  const c = A.clk;
  if (L.left <= 120 && !c.two) { c.two = 1; line(L.inCar ? pick(['vo_farmhand_13', 'vo_squid_14']) : 'vo_wolf_15', { retry: 6 }); }
  if (L.left <= 60 && !c.one) { c.one = 1; if (L.inCar) line('vo_wolf_09', { retry: 6, then: () => line('vo_moth_16', { retry: 3 }) }); else line('vo_wolf_05', { retry: 6 }); }
  if (L.left <= 0 && !c.late) { c.late = 1; line(L.inCar ? 'vo_squid_15' : 'vo_wolf_07', { retry: 5 }); }
}
A.stopVoice = () => { pend = null; if (A.voice) { A.voice.stop(0.08); } };

// ---------------------------------------------------------------- credits panel: The Eye Sets Over the Coral, streamed (not decoded: 285 s)
let credEl = null, credSrc = null;
A.credits = (on) => {
  if (!ctx) return; const n = ctx.currentTime, X = 1.5;
  if (on) {
    if (!running()) { unlock(); }
    if (!credEl) {
      credEl = new Audio(); credEl.preload = 'auto'; credEl.loop = true; credEl.src = BASE + 'music_credits_pro_eye_sets_over_the_coral.' + A.fmt;
      credEl.addEventListener('error', () => { if (A.fmt === 'ogg' && !credEl._fb) { credEl._fb = 1; credEl.src = BASE + 'music_credits_pro_eye_sets_over_the_coral.m4a'; credEl.play().catch(() => {}); } else A.errors.push('credits: ' + (credEl.error?.code || '?')); });
      try { credSrc = ctx.createMediaElementSource(credEl); credSrc.connect(N.cred); } catch (e) { A.errors.push('credits: ' + e.message); }
    }
    const tr = SOUNDS.music_credits_pro_eye_sets_over_the_coral?.trim?.[A.fmt] || 0;
    credEl.currentTime = 0; credEl.play().then(() => note('credits', { on: 1 })).catch(e => note('credits_err', { err: String(e.message || e) }));
    ramp2(N.cred.gain, Math.pow(10, -tr / 20), X); ramp2(N.title.gain, 0, X); A.credOn = true;
  } else if (A.credOn) {
    A.credOn = false; ramp2(N.cred.gain, 0, X); ramp2(N.title.gain, A.titleSrc ? 1 : 0, X);
    setTimeout(() => { if (!A.credOn && credEl) credEl.pause(); }, X * 1000 + 100); note('credits', { on: 0 });
  }
};
function ramp2(gp, v, f) { const n = ctx.currentTime; gp.cancelScheduledValues(n); gp.setValueAtTime(gp.value, n); gp.linearRampToValueAtTime(v, n + f); gp._v = undefined; }

// ---------------------------------------------------------------- debug / probes
A.graph = () => ({ ctx: ctx && { state: ctx.state, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency }, fmt: A.fmt, state: A.state, muted: A.muted,
  gains: ctx && { master: N.master.gain.value, music: BUS.music.gain.value, title: N.title.gain.value, town: N.town.gain.value, sun: N.sun.gain.value, wild: N.wild.gain.value,
    tens: N.tens.gain.value, cred: N.cred.gain.value, duck: N.duck.gain.value, radio: N.rLvl.gain.value, radioMuffleHz: N.rMuf.frequency.value,
    amb: N.amb.gain.value * BUS.amb.gain.value, idle: N.idle.gain.value, rev: N.rev.gain.value, cabLpHz: N.cabLp.frequency.value },
  radioChain: ctx && { hp: N.rHp.frequency.value, bp: [N.rBp.frequency.value, N.rBp.Q.value], drive: N.rDrive.gain.value, sat: N.rSat.curve?.length, muffle: N.rMuf.frequency.value, lvl: A.radioLvl, knob: RADIO_LV[A.radioLvl] },
  radio: A.radio && { track: RADIO[A.radio.i], pos: +(ctx.currentTime - A.radio.t0).toFixed(2) },
  t0: A.t0, tensT0: A.tensT0, voice: A.voice?.name || null, said: [...said], loaded: Object.keys(A.buf), kb: +(A.bytes / 1024).toFixed(0), errors: A.errors });
A.rms = () => { if (!N.an) return null; const d = new Float32Array(N.an.fftSize); N.an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return +(10 * Math.log10(s / d.length + 1e-12)).toFixed(1); };
A.kick = () => kick(); A.unlock = unlock; A.running = () => !!running();
A.load = load; A.SOUNDS = SOUNDS; A.BASE = BASE; A.N = N; A.BUS = BUS; A.play = play;

// ---------------------------------------------------------------- boot: graph now, title music fetch in the background
mk();
if (ctx) {
  if (!window.__titleUp) A.state = 'title';   // (title skipped: leaves on the first update)
  if (!/[?&]intro=0/.test(location.search)) load('intro_ethereal_arrival').catch(() => {});   // v9: the intro sting is the first thing we can play
  load('music_title_loop_pro_mind_meld').then(kick).catch(() => {}).then(() => loadSet(['sfx_ui_tick', 'sfx_ui_confirm']));
  if (ctx.state === 'running') primed = true;
}
// sound button (works on the title too; tapping it doesn't start the game)
addEventListener('DOMContentLoaded', initBtn); if (document.readyState !== 'loading') initBtn();
function initBtn() {
  if (btn) return; btn = document.getElementById('sndBtn'); if (!btn) return; syncBtn();
  const stop = e => { e.stopPropagation(); };
  btn.addEventListener('pointerdown', stop); btn.addEventListener('pointerup', stop);
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); unlock(); A.cycleMode(); if (A.mode !== 'off') play('sfx_ui_confirm', { bus: 'ui' });
    const t = document.getElementById('sndToast'); if (t) { t.textContent = MODE_TXT[A.mode]; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); } });
}
export const audio = A;
