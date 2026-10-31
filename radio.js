// Placeholder "wild foreign music" car radio. 100% procedurally generated with the Web Audio API at runtime:
// no samples, no recordings, no third-party audio. An upbeat 6/8-ish groove in a Hijaz-flavoured scale
// (darbuka-style noise hits, a bouncing bass, a plucked oud-ish lead, a reedy drone), heard through a
// heavy low-pass so it sounds muffled, like a tinny car radio with the windows open.
let ctx = null, master = null, lp = null, timer = null, nextT = 0, step = 0, target = 0;
const BPM = 132, SIXTEENTH = 60 / BPM / 4;
const ROOT = 146.83; // D3
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12]; // D Eb F# G A Bb C D
const hz = (deg, oct = 0) => ROOT * Math.pow(2, (HIJAZ[((deg % 8) + 8) % 8] + 12 * (oct + Math.floor(deg / 8))) / 12);
// 32-step phrase (two bars): melody degrees (null = rest), bass degrees, drum pattern D=doum T=tek k=ka
const MEL = [7, null, 6, 5, 4, null, 5, null, 4, 3, 2, null, 1, null, 2, null, 4, null, 5, 6, 7, null, 6, 5, 4, 5, 4, 2, 1, null, 0, null];
const BAS = [0, null, null, 0, null, null, 4, null, 0, null, null, 0, null, 5, 4, null, 0, null, null, 0, null, null, 4, null, 3, null, 2, null, 1, null, 0, null];
const DRM = 'D..T..k.D.kT.k..D..T..k.D.kTkkTk';
function noiseBuf() { const b = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate), d = b.getChannelData(0); let s = 0x1234567; for (let i = 0; i < d.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1; } return b; }
let NOISE = null;
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function pluck(t, f, vol) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.004; o.connect(g); o2.connect(g); g.connect(master); env(g, t, 0.004, vol, 0.22); o.start(t); o2.start(t); o.stop(t + 0.3); o2.stop(t + 0.3); }
function bass(t, f) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f / 2; o.connect(g); g.connect(master); env(g, t, 0.006, 0.55, 0.28); o.start(t); o.stop(t + 0.36); }
function drum(t, kind) {
  if (kind === 'D') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18); o.connect(g); g.connect(master); env(g, t, 0.003, 0.9, 0.22); o.start(t); o.stop(t + 0.3); return; }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = NOISE; f.type = 'bandpass'; f.frequency.value = kind === 'T' ? 2400 : 3800; f.Q.value = 1.2; s.connect(f); f.connect(g); g.connect(master); env(g, t, 0.002, kind === 'T' ? 0.6 : 0.3, kind === 'T' ? 0.08 : 0.05); s.start(t); s.stop(t + 0.15);
}
function schedule() {
  while (nextT < ctx.currentTime + 0.25) {
    const i = step % 32, swing = (step % 2) ? SIXTEENTH * 0.16 : 0, t = nextT + swing;
    if (MEL[i] !== null) pluck(t, hz(MEL[i], 1), 0.26);
    if (BAS[i] !== null) bass(t, hz(BAS[i], 0));
    if (DRM[i] !== '.') drum(t, DRM[i]);
    nextT += SIXTEENTH; step++;
  }
}
function boot() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); NOISE = noiseBuf();
  lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = 0.9;   // muffled
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;                // tinny little speaker
  const shaper = ctx.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.2); } shaper.curve = c; // a bit of radio crunch
  const out = ctx.createGain(); out.gain.value = 0; master = ctx.createGain(); master.gain.value = 0.5;
  // reedy drone underneath (two detuned saws on the root and fifth)
  for (const [f, v] of [[ROOT, 0.05], [ROOT * 1.5, 0.035]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8; g.gain.value = v; o.connect(g); g.connect(master); o.start(); }
  master.connect(shaper); shaper.connect(hp); hp.connect(lp); lp.connect(out); out.connect(ctx.destination);
  radio.out = out; nextT = ctx.currentTime + 0.05;
  timer = setInterval(() => { if (ctx.state === 'running' && radio.level > 0.001) schedule(); else nextT = Math.max(nextT, ctx.currentTime + 0.05); }, 60);
}
export const radio = {
  level: 0, out: null,
  // call from any user gesture (pointerdown/keydown) so the browser lets audio start
  unlock() { boot(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  // vol 0..1 (loud in the car, faint from the street)
  set(vol) { target = vol; if (!radio.out) return; const now = ctx.currentTime; radio.out.gain.setTargetAtTime(vol * 0.9, now, 0.25); radio.level = vol; lp.frequency.setTargetAtTime(500 + vol * 600, now, 0.3); },
};
window.__radio = radio;
