// livingtv.js — Sunspots run 9: TV night in Bear's '90s living room (?room=living90).
// Grab the remote -> the cast sits on the couch -> first-person view with the Wolf's felt arm holding a chunky remote.
// Reuses the shared ÆTV module (tvchannel.js + media/aetv/channel_aetv.json) — this file only ADDS channel types
// ('canvas' = procedural 2D stations, 'feed' = live render-target cameras) through registerChannelType; nothing is forked.
// Mobile: one <video> (inside TVSet, released when off / off-channel), canvases redraw at 6-15 fps only while tuned,
// the 256x192 feed renders every other frame only while a feed channel is on.
import * as THREE from 'three';
import { TVSet, registerChannelType } from './tvchannel.js';

// ------------------------------------------------------------------ channel types (registered once, globally)
class CanvasChannel {
  constructor(def) { this.def = def; this.name = def.name; this.mode = 0; this.fps = def.fps || 12; this.acc = 1;
    this.cv = document.createElement('canvas'); this.cv.width = def.w || 320; this.cv.height = def.h || 240; this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false; }
  get isVideo() { return false; } async init() {}
  tick(dt, t) { this.acc += dt; if (this.acc < 1 / this.fps) return; this.acc = 0; this.def.draw(this.g, this.cv.width, this.cv.height, t, this); this.tex.needsUpdate = true; }
}
class FeedChannel { constructor(def) { this.def = def; this.name = def.name; this.mode = 0; this.feed = def.cam || 'behind'; } get isVideo() { return false; } async init() {} }
registerChannelType('canvas', (def) => new CanvasChannel(def));
registerChannelType('feed', (def) => new FeedChannel(def));

// ------------------------------------------------------------------ 2D drawing kit for the procedural stations
const MUST = '#e0b52a', FUT = 'Futura, Avenir, "Trebuchet MS", sans-serif';
function txt(g, s, x, y, size, color = '#fff', { align = 'center', font = FUT, weight = 700, stroke = 0, sc = '#000', maxW = 0 } = {}) {
  g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
  if (maxW) { let f = size; while (g.measureText(s).width > maxW && f > 8) { f -= 1; g.font = `${weight} ${f}px ${font}`; } }
  if (stroke) { g.lineWidth = stroke; g.strokeStyle = sc; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = color; g.fillText(s, x, y); }
function sun(g, x, y, r, t, { face = true, shades = false } = {}) {   // the Sunspots mustard sun (deadpan)
  g.save(); g.translate(x, y); g.rotate(t * 0.15); g.fillStyle = '#c98f16';
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(r * 0.8, -r * 0.16); g.lineTo(r * 1.45, 0); g.lineTo(r * 0.8, r * 0.16); g.fill(); }
  g.restore(); g.fillStyle = MUST; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,180,.35)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.4, 0, 7); g.fill();
  if (!face) return; g.strokeStyle = '#5a3a10'; g.lineWidth = Math.max(1.5, r * 0.07); g.lineCap = 'round';
  if (shades) { g.fillStyle = '#1a1a1a'; g.fillRect(x - r * 0.62, y - r * 0.28, r * 0.52, r * 0.26); g.fillRect(x + r * 0.1, y - r * 0.28, r * 0.52, r * 0.26); g.beginPath(); g.moveTo(x - r * 0.1, y - r * 0.2); g.lineTo(x + r * 0.1, y - r * 0.2); g.stroke(); }
  else { const bl = (Math.sin(t * 0.7) > 0.985) ? 0.02 : 0.12; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * 0.48, y - r * 0.15); g.lineTo(x + s * r * 0.18, y - r * 0.15); g.stroke(); g.fillStyle = '#5a3a10'; g.fillRect(x + s * r * 0.33 - r * 0.07, y - r * 0.15, r * 0.14, r * bl); } }
  g.beginPath(); g.moveTo(x - r * 0.22, y + r * 0.38); g.lineTo(x + r * 0.22, y + r * 0.38); g.stroke(); }
function ticker(g, w, h, s, t, bg = '#0d2050', fg = '#ffe27a', speed = 40) {
  g.fillStyle = bg; g.fillRect(0, h - 26, w, 26); g.font = `700 15px ${FUT}`; const tw = g.measureText(s).width; const x = w - ((t * speed) % (tw + w));
  g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, x, h - 13); }
function clock(g, w, s = '1:59', color = '#fff') { txt(g, s, w - 10, 16, 15, color, { align: 'right', font: '"Courier New", monospace' }); }
function shake(t, k) { return (Math.random() - 0.5) * k; }

// CH 2 · KSUN WEATHER — the mustard sun forecast that is always the sun
function drawWeather(g, w, h, t) {
  const ph = Math.floor(t / 9) % 2, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16357e'); gr.addColorStop(1, '#3d6cc0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0d2050'; g.fillRect(0, 0, w, 30); txt(g, 'KSUN', 34, 15, 15, MUST); txt(g, ph ? 'THE 5-DAY OUTLOOK' : 'SUNSPOTS · LOCAL FORECAST', w / 2 + 12, 15, 13, '#fff'); clock(g, w);
  if (!ph) {
    g.fillStyle = '#5f8f4a'; g.beginPath(); g.moveTo(28, 150); g.bezierCurveTo(40, 70, 150, 56, 205, 92); g.bezierCurveTo(250, 120, 240, 196, 170, 200); g.bezierCurveTo(100, 210, 20, 205, 28, 150); g.fill();
    g.strokeStyle = '#c9b48a'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 160); g.lineTo(220, 120); g.moveTo(120, 80); g.lineTo(140, 200); g.stroke();
    const towns = [['MAIN ST', 72, 120], ['DRIVE-IN', 170, 168], ['THE POOL', 160, 96], ['K-SUN', 78, 182]];
    for (const [n, x, y] of towns) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); txt(g, n, x, y - 11, 10, '#fff', { stroke: 3, sc: '#0d2050' }); txt(g, '71°', x + 22, y + 4, 14, MUST, { stroke: 3, sc: '#0d2050' }); }
    sun(g, 262, 92 + Math.sin(t * 1.3) * 5, 30, t); txt(g, 'TODAY: SUN', 262, 150, 15, '#fff', { stroke: 3, sc: '#0d2050' }); txt(g, 'TONIGHT: SUN (LATER)', 262, 170, 11, '#ffe27a', { stroke: 3, sc: '#0d2050' });
  } else {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    days.forEach((d, i) => { const x = 14 + i * 60; g.fillStyle = 'rgba(10,25,70,.7)'; g.fillRect(x, 44, 54, 150); g.strokeStyle = '#7fa6e8'; g.lineWidth = 2; g.strokeRect(x, 44, 54, 150);
      txt(g, d, x + 27, 58, 13, '#fff'); sun(g, x + 27, 100, 15, t + i, { face: i !== 4, shades: i === 4 }); txt(g, i === 4 ? 'MORE' : 'SUN', x + 27, 140, 13, MUST); txt(g, '71°', x + 27, 165, 16, '#fff'); txt(g, i === 2 ? 'BREEZY*' : '', x + 27, 184, 9, '#bcd'); });
  }
  ticker(g, w, h, 'TODAY: SUN.   TONIGHT: SUN, BUT LATER.   TOMORROW: SEE TODAY.   UV INDEX: YES.   POLLEN: FELT.   *BREEZY MEANS THE CEILING FAN.   ', t);
}

// CH 4 · THE AD CHANNEL — four deadpan '90s commercials on a loop (all invented; no real brands, no real people)
const ADS = [
  { name: 'BEIGE FLAKES', dur: 8, draw(g, w, h, t) {
    g.fillStyle = '#f6d36b'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h * 0.62); g.rotate(t * 0.4); g.fillStyle = '#fbe39a'; for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(300, -50); g.lineTo(300, 50); g.fill(); } g.restore();
    g.fillStyle = '#2f6fb0'; g.beginPath(); g.ellipse(w / 2, 168, 82, 22, 0, 0, Math.PI); g.lineTo(w / 2 - 82, 168); g.fill(); g.beginPath(); g.ellipse(w / 2, 168, 82, 46, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#efe6cf'; g.beginPath(); g.ellipse(w / 2, 168, 78, 16, 0, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { const a = i * 2.4, rr = (i % 7) * 10; g.fillStyle = i % 3 ? '#cdb58a' : '#d9c39a'; g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * rr, 164 + Math.sin(a) * rr * 0.18, 9, 5, a, 0, 7); g.fill(); }
    const sp = Math.max(0, Math.sin(t * 2.2)); g.strokeStyle = '#bfc4cc'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(w / 2 + 90, 70 + sp * 40); g.lineTo(w / 2 + 30, 150 + sp * 10); g.stroke();
    txt(g, 'BEIGE FLAKES!', w / 2 + Math.sin(t * 6) * 2, 44, 36, '#c0392b', { stroke: 6, sc: '#fff' });
    if (t > 2.5) txt(g, 'ALREADY SOGGY.', w / 2, 84, 20, '#3a1f2a', { stroke: 4, sc: '#fff' });
    if (t > 5) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, h - 30, w, 30); txt(g, 'Part of a balanced breakfast. Mostly the balance.', w / 2, h - 15, 12, '#333', { weight: 500 }); }
    g.save(); g.translate(52, 112); g.rotate(-0.3 + Math.sin(t * 5) * 0.05); g.fillStyle = '#e8402a'; g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 22 : 34, a = i / 16 * 6.283; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); txt(g, 'NOW 0%', 0, -6, 11, '#fff'); txt(g, 'NEW!', 0, 8, 12, '#fff'); g.restore(); } },
  { name: '1-900-DIAL-TONE', dur: 8, draw(g, w, h, t) {
    g.fillStyle = '#1a0b2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(255,60,200,${0.08 + 0.04 * (i % 2)})`; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, 108, 30 + i * 16 + (t * 30) % 16, 0, 7); g.stroke(); }
    const ring = (Math.floor(t * 3) % 4) < 2; g.save(); g.translate(w / 2 + (ring ? shake(t, 6) : 0), 108); g.rotate(ring ? shake(t, 0.2) : 0); g.strokeStyle = '#ff4fd8'; g.shadowColor = '#ff4fd8'; g.shadowBlur = 14; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-46, -8); g.quadraticCurveTo(0, -40, 46, -8); g.lineTo(36, 4); g.lineTo(18, -6); g.lineTo(-18, -6); g.lineTo(-36, 4); g.closePath(); g.stroke(); g.strokeRect(-30, 6, 60, 32); g.restore(); g.shadowBlur = 0;
    txt(g, 'TALK TO A REAL', w / 2, 24, 17, '#7ff', { stroke: 4, sc: '#002' }); txt(g, 'DIAL TONE!', w / 2, 50, 26, '#fff', { stroke: 5, sc: '#f0c' });
    if (Math.floor(t * 2) % 2 || t > 6) txt(g, '1-900-DIAL-TONE', w / 2, 170, 28, MUST, { stroke: 5, sc: '#300', font: '"Courier New", monospace' });
    txt(g, '$2.99/MIN · CALLERS MUST BE 18 OR A LAMP', w / 2, 198, 11, '#fff', { weight: 500 });
    ticker(g, w, h, 'THE DIAL TONE IS NOT A LICENSED PSYCHIC. IT IS A TONE. IT WILL NOT TALK BACK. THAT IS THE APPEAL. ASK YOUR PARENTS (DO NOT ASK YOUR PARENTS).   ', t, '#000', '#ccc', 70); } },
  { name: 'PIN PAL', dur: 8, draw(g, w, h, t) {
    for (let y = 0; y < h; y += 30) for (let x = 0; x < w; x += 30) { g.fillStyle = ((x + y) / 30) % 2 ? '#ff7a3a' : '#ffb03a'; g.fillRect(x, y, 30, 30); }
    const by = 128 - Math.abs(Math.sin(t * 3)) * 34, sq = 1 + Math.max(0, 0.12 - Math.abs(Math.sin(t * 3))) * 2; g.save(); g.translate(w / 2 - 40, by); g.scale(1 + (sq - 1), 2 - sq);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 30, 26, 34, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(0, -14, 13, 18, 0, 0, 7); g.fill(); g.fillRect(-9, -4, 18, 14); g.fillStyle = '#d6302a'; g.fillRect(-11, 2, 22, 5); g.fillRect(-12, 10, 24, 4);
    const lk = Math.sin(t * 1.3) * 3; for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 7, -18, 7, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#000'; g.beginPath(); g.arc(s * 7 + lk, -16 + Math.sin(t * 9 + s) * 1.5, 3, 0, 7); g.fill(); }
    g.restore(); txt(g, 'PIN PAL!', w / 2 + 70, 60, 34, '#fff', { stroke: 6, sc: '#6a1fb0' }); txt(g, 'HE WATCHES', w / 2 + 70, 100, 16, '#6a1fb0', { stroke: 4, sc: '#fff' }); txt(g, 'YOU BOWL.', w / 2 + 70, 120, 16, '#6a1fb0', { stroke: 4, sc: '#fff' });
    if (t > 4) { txt(g, 'HE DOES NOT', w / 2 + 70, 150, 13, '#fff', { stroke: 3, sc: '#000' }); txt(g, 'STOP.', w / 2 + 70, 166, 13, '#fff', { stroke: 3, sc: '#000' }); }
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, h - 26, w, 26); txt(g, 'BATTERIES NOT INCLUDED · EYES SOLD SEPARATELY · AGES 4 TO 4', w / 2, h - 13, 10, '#fff', { weight: 500 }); } },
  { name: 'MATTRESS MARTY', dur: 9, draw(g, w, h, t) {
    const fl = Math.floor(t * 4) % 2; g.fillStyle = fl ? '#d6202a' : '#f7d21a'; g.fillRect(0, 0, w, h); g.fillStyle = fl ? '#f7d21a' : '#d6202a'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 34 + (t * 40) % 34, w, 8);
    g.fillStyle = '#7b5bb0'; g.fillRect(30, 150, 120, 60); g.fillStyle = '#9f83cf'; g.fillRect(30, 150, 120, 12); for (let i = 0; i < 5; i++) { g.fillStyle = '#5c418a'; g.beginPath(); g.arc(46 + i * 22, 182, 3, 0, 7); g.fill(); }
    const jx = 230 + shake(t, 4), jy = 120 + Math.abs(Math.sin(t * 8)) * -6; g.fillStyle = '#2f5a3e'; g.beginPath(); g.ellipse(jx, jy + 58, 34, 40, 0, 0, 7); g.fill();   // sweater
    const arm = Math.sin(t * 9) * 0.8; g.strokeStyle = '#2f5a3e'; g.lineWidth = 12; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(jx + s * 26, jy + 40); g.lineTo(jx + s * 52, jy + 10 - (s > 0 ? arm : -arm) * 22); g.stroke(); }
    g.fillStyle = '#e8b48a'; g.beginPath(); g.arc(jx, jy, 26, 0, 7); g.fill(); g.fillStyle = '#5a3420'; g.beginPath(); g.ellipse(jx, jy + 8, 14, 5, 0, 0, 7); g.fill();   // mustache
    g.fillStyle = '#5a3420'; g.beginPath(); g.arc(jx, jy - 16, 22, Math.PI, 0); g.fill(); g.fillStyle = '#000'; g.fillRect(jx - 10, jy - 5, 5, 4); g.fillRect(jx + 5, jy - 5, 5, 4); g.beginPath(); g.ellipse(jx, jy + 16, 7, 5 + Math.abs(Math.sin(t * 14)) * 4, 0, 0, 7); g.fill();
    const lines = ['EVERYTHING MUST GO!', 'INCLUDING ME!', "PRICES SO LOW WE'RE LYING DOWN"]; const L = lines[Math.min(2, Math.floor(t / 3))];
    txt(g, 'MATTRESS MARTY\'S', 112 + shake(t, 3), 30 + shake(t, 3), 22, '#fff', { stroke: 5, sc: '#000' }); txt(g, L, w / 2 + shake(t, 5), 80 + shake(t, 4), 22, fl ? '#fff' : '#d6202a', { stroke: 5, sc: '#000', maxW: w - 20 });
    g.fillStyle = '#000'; g.fillRect(0, h - 22, w, 22); txt(g, 'OPEN 1:59 TO 1:59 · NOT A REAL PERSON · NEITHER IS THE SALE', w / 2, h - 11, 10, MUST, { weight: 500 }); } },
];
const ADS_T = ADS.reduce((s, a) => s + a.dur, 0) + 2.5;
function drawAds(g, w, h, t) {
  let k = t % ADS_T; for (const a of ADS) { if (k < a.dur) { a.draw(g, w, h, k); return; } k -= a.dur; }
  g.fillStyle = '#103'; g.fillRect(0, 0, w, h); sun(g, w / 2, h / 2 - 20, 30, t); txt(g, 'CH 4 · ALL ADS', w / 2, h / 2 + 40, 22, '#fff'); txt(g, 'NO SHOW. JUST THE GOOD PART.', w / 2, h / 2 + 66, 12, MUST); }

// CH 5 · SUNSPOTS SHOPPING CLUB — home shopping for props nobody needs
const ITEMS = [
  { n: 'ONE (1) SOCK', s: 'mustard · left foot only', p: '19.99', host: '"Look at it. Just look at it."', d(g, t) { g.fillStyle = MUST; g.beginPath(); g.moveTo(-14, -40); g.lineTo(14, -40); g.lineTo(14, 14); g.quadraticCurveTo(14, 34, 40, 32); g.quadraticCurveTo(52, 34, 50, 46); g.lineTo(-6, 48); g.quadraticCurveTo(-16, 46, -14, 30); g.fill(); g.fillStyle = '#c98f16'; g.fillRect(-14, -40, 28, 9); } },
  { n: 'RABBIT EARS', s: 'receives nothing · stylish', p: '39.95', host: '"I have had these for six years. Nothing."', d(g, t) { g.strokeStyle = '#ccc'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 20); g.lineTo(-30, -50); g.moveTo(0, 20); g.lineTo(32, -46); g.stroke(); g.fillStyle = '#333'; g.beginPath(); g.ellipse(0, 28, 30, 12, 0, 0, 7); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(-30, -50, 3, 0, 7); g.arc(32, -46, 3, 0, 7); g.fill(); } },
  { n: 'A JAR OF FOG', s: 'from the drive-in · do not open', p: '24.99', host: '"Do not open it. I opened one. It was fine."', d(g, t) { g.fillStyle = 'rgba(210,225,235,.55)'; g.fillRect(-26, -36, 52, 76); g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-12 + i * 6 + Math.sin(t + i) * 4, 10 - i * 9, 12, 0, 7); g.fill(); } g.fillStyle = '#9a8a6a'; g.fillRect(-28, -44, 56, 10); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(-26, -36, 52, 76); } },
  { n: 'SOFT HUBCAP', s: 'felt · for a car you love', p: '49.00', host: '"It will not stay on. That is the point."', d(g, t) { g.fillStyle = '#b8bcc4'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); g.fillStyle = '#9aa0aa'; for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * 0.785); g.fillRect(-4, 10, 8, 30); g.restore(); } g.fillStyle = '#d7dae0'; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill(); } },
];
function drawShop(g, w, h, t) {
  const it = ITEMS[Math.floor(t / 9) % ITEMS.length], k = t % 9, gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0f6a6a'); gr.addColorStop(1, '#2a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8c86a'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 40); g.fillStyle = '#e8c86a'; g.fillRect(6, 6, w - 12, 22); txt(g, 'SUNSPOTS SHOPPING CLUB', w / 2, 17, 13, '#2a2a6a');
  g.fillStyle = '#d8cfc0'; g.beginPath(); g.ellipse(88, 176, 62, 14, 0, 0, 7); g.fill(); g.fillStyle = '#b8ab98'; g.fillRect(26, 176, 124, 12); g.beginPath(); g.ellipse(88, 188, 62, 14, 0, 0, Math.PI); g.fill();
  g.save(); g.translate(88, 116); g.scale(Math.cos(t * 1.2) * 0.25 + 0.95, 1); it.d(g, t); g.restore();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(166, 40, 140, 150); txt(g, it.n, 236, 58, 15, '#fff', { maxW: 132 }); txt(g, it.s, 236, 78, 10, '#cde', { weight: 500, maxW: 132 });
  txt(g, '$' + it.p, 236, 110, 30, MUST, { stroke: 4, sc: '#300' }); g.strokeStyle = '#f55'; g.lineWidth = 2; txt(g, '$20.00', 236, 136, 13, '#faa'); g.beginPath(); g.moveTo(208, 136); g.lineTo(264, 136); g.stroke();
  txt(g, 'SOLD: 0', 236, 158, 12, '#fff'); txt(g, 'LEFT: ALL OF THEM', 236, 174, 10, '#fff', { weight: 500 });
  if (Math.floor(t * 2) % 2) txt(g, 'CALL NOW!', 236, 202, 14, '#ff6', { stroke: 3, sc: '#300' });
  g.fillStyle = '#000'; g.fillRect(0, h - 28, w, 28); txt(g, k < 5 ? 'HOST: ' + it.host : 'OFFER ENDS WHEN WE GET BORED', w / 2, h - 14, 11, '#fff', { weight: 500, maxW: w - 12 }); }

// CH 7 · CROW CAM — the slow channel. The Crow, live, staring. (it blinks about twice a minute)
function drawCrow(g, w, h, t) {
  g.fillStyle = '#6f6a5e'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d776a'; for (let i = 0; i < 6; i++) g.fillRect(0, i * 44, w, 2);
  const s = 1 + 0.06 * Math.sin(t * 0.05), x = w / 2 - 10 + Math.sin(t * 0.11) * 3, y = h / 2 + 6; g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#16141a'; g.beginPath(); g.ellipse(-10, 70, 90, 60, 0, 0, 7); g.fill(); g.beginPath(); g.arc(0, 0, 66, 0, 7); g.fill();
  g.fillStyle = '#2a2730'; g.beginPath(); g.arc(-18, -18, 30, 0, 7); g.fill();
  g.fillStyle = '#e0a020'; g.beginPath(); g.moveTo(48, -6); g.lineTo(122, 8); g.lineTo(48, 24); g.fill(); g.fillStyle = '#b27a10'; g.beginPath(); g.moveTo(48, 10); g.lineTo(122, 8); g.lineTo(48, 24); g.fill();
  const bl = (t % 31) > 30.6 || (t % 31) < 0.15; g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(14, -14, 17, 0, 7); g.fill();
  if (bl) { g.fillStyle = '#16141a'; g.fillRect(-4, -32, 36, 36); } else { g.fillStyle = '#000'; g.beginPath(); g.arc(17 + Math.sin(t * 0.03) * 2, -12, 8, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(20, -16, 2.5, 0, 7); g.fill(); }
  g.restore(); txt(g, 'CROW CAM', 12, 18, 13, '#fff', { align: 'left' }); txt(g, '● LIVE · HOUR 3,011', 12, h - 14, 11, '#f66', { align: 'left', weight: 500 }); clock(g, w);
  if ((t % 47) > 40) txt(g, '(nothing has happened)', w / 2, h - 34, 11, '#ddd', { weight: 500 }); }

// ------------------------------------------------------------------ the lineup (ÆTV channels come straight from the shared manifest)
const AETV = './media/aetv/channel_aetv.json';
const LINEUP = [
  { number: 2, name: 'KSUN WEATHER', type: 'canvas', draw: drawWeather, fps: 12 },
  { number: 3, name: 'ÆTV', type: 'playlist', manifest: AETV, fill: 'auto' },
  { number: 4, name: 'ALL ADS', type: 'canvas', draw: drawAds, fps: 15 },
  { number: 5, name: 'SHOPPING CLUB', type: 'canvas', draw: drawShop, fps: 12 },
  { number: 6, name: '', type: 'static' },
  { number: 7, name: 'CROW CAM', type: 'canvas', draw: drawCrow, fps: 6 },
  { number: 8, name: '', type: 'static' },
  { number: 9, name: 'LIVING ROOM LIVE', type: 'feed', cam: 'behind' },
  { number: 11, name: 'ÆTV ENCORE', type: 'playlist', manifest: AETV, shuffle: true, fill: 'auto' },
  { number: 12, name: '', type: 'static' },
  { number: 13, name: 'TEST PATTERN', type: 'bars' },
  { number: 1990, name: '', type: 'feed', cam: 'you', hidden: true },
];
export const SECRET = '1990';

// ------------------------------------------------------------------ the module
export function createLivingTV({ renderer, feltMat, audio, LOW, say, glb, S, save, onLeave, camera: cam }) {
  const $ = (id) => document.getElementById(id), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const css = document.createElement('style'); css.textContent = `
  #tvUI{position:fixed;inset:0;z-index:9;display:none;pointer-events:none;font-family:${FUT};color:#fff3dc}
  body.tvon #tvUI{display:block} body.tvgo #roomUI,body.tvon #roomUI,body.tvgo #townObj,body.tvon #townObj{display:none!important}
  body.tvon #sceneSub{top:calc(env(safe-area-inset-top) + 58px);bottom:auto}
  #tvExit{position:absolute;right:10px;top:calc(env(safe-area-inset-top) + 10px);pointer-events:auto;border:0;border-radius:999px;padding:10px 16px;font:700 12px ${FUT};letter-spacing:.16em;color:#3a1f2a;background:#fff3dc;box-shadow:0 3px 0 #b9a58a}
  #tvName{position:absolute;left:60px;top:calc(env(safe-area-inset-top) + 18px);font-weight:700;font-size:12px;letter-spacing:.24em;opacity:.85;text-shadow:0 1px 4px rgba(0,0,0,.6)}
  #tvOSD{position:absolute;left:0;top:0;font:700 16px "Courier New",Courier,monospace;color:#7dff6a;text-shadow:0 0 5px #2f8,2px 2px 0 #031;white-space:pre;text-align:right;opacity:0;transition:opacity .25s;line-height:1.15}
  #tvOSD.on{opacity:1}
  #tvHint{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 40px);text-align:center;font-weight:700;font-size:11px;letter-spacing:.2em;opacity:0;transition:opacity .6s;text-shadow:0 1px 4px rgba(0,0,0,.7)}
  #tvHint.on{opacity:.9}
  #tvFade{position:fixed;inset:0;z-index:21;background:#120c14;opacity:0;pointer-events:none;transition:opacity .35s;display:flex;align-items:center;justify-content:center}
  #tvFade.on{opacity:1} #tvFade b{font:700 clamp(40px,13vw,90px) "Brush Script MT","Snell Roundhand",cursive;color:#ffe9a8;text-shadow:0 0 18px ${MUST};transform:scale(.8);transition:transform 1.2s ease-out}
  #tvFade.on b{transform:scale(1.05)} #tvFade small{position:absolute;left:0;right:0;top:calc(50% + 54px);text-align:center;font:700 12px ${FUT};letter-spacing:.3em;color:#efe2c4}
  #tvCard{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.6);z-index:22;opacity:0;pointer-events:none;transition:opacity .4s,transform .5s cubic-bezier(.2,1.6,.4,1);background:#fff3dc;color:#3a1f2a;border-radius:18px;padding:16px 22px;text-align:center;box-shadow:0 6px 0 #c9a37a,0 10px 30px rgba(0,0,0,.5);font-family:${FUT}}
  #tvCard.on{opacity:1;transform:translate(-50%,-50%) scale(1)} #tvCard b{display:block;font-size:20px;letter-spacing:.12em} #tvCard small{display:block;font-size:11px;letter-spacing:.2em;margin-top:4px;color:#7a2634}
  #tvCard i{display:block;margin:0 auto 6px;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe9a0,${MUST} 55%,#b8860b);box-shadow:0 0 0 6px #fff3dc,0 0 0 9px ${MUST}}`;
  document.head.appendChild(css);
  const ui = document.createElement('div'); ui.id = 'tvUI'; ui.innerHTML = '<div id="tvName">BEAR\'S COUCH</div><div id="tvHint"></div><div id="tvOSD"></div><button id="tvExit">STAND UP</button>'; document.body.appendChild(ui);
  const fade = document.createElement('div'); fade.id = 'tvFade'; fade.innerHTML = '<b></b><small></small>'; document.body.appendChild(fade);
  const card = document.createElement('div'); card.id = 'tvCard'; card.innerHTML = '<i></i><b>THE 1990 SUNSPOT</b><small>FOUND ON CH. 1990 · 1 OF 1</small>'; document.body.appendChild(card);
  const osd = $('tvOSD'), hint = $('tvHint'), wait = (ms) => new Promise(r => setTimeout(r, ms));
  $('tvExit').addEventListener('click', (e) => { e.stopPropagation(); if (M.phase === 'fp' && !M.secret) leave(); });

  // ------------------------------------------------------------------ sound: tiny synth (button clicks, CRT hum + whine, chimes). Respects the game's sound mode + SFX slider.
  let AC = null, out = null, humG = null;
  const sfxOn = () => (audio.mode ? (audio.mode === 'all' || audio.mode === 'sound') : !audio.muted) ? (audio.sfxVol ?? 1) : 0;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); out = AC.createGain(); out.connect(AC.destination);
        humG = AC.createGain(); humG.gain.value = 0; humG.connect(out); for (const [f, g, ty] of [[60, 1, 'sine'], [120, 0.5, 'sine'], [180, 0.18, 'triangle'], [15734, 0.05, 'sine']]) { const o = AC.createOscillator(), gg = AC.createGain(); o.type = ty; o.frequency.value = f; gg.gain.value = g; o.connect(gg).connect(humG); o.start(); } } catch (e) { AC = null; } }
    if (AC?.state === 'suspended') AC.resume(); if (out) out.gain.value = 0.7 * sfxOn(); return AC; }
  function tone(f, dur, { type = 'sine', g = 0.3, at = 0, slide = 0 } = {}) { if (!ac() || !sfxOn()) return; const t = AC.currentTime + at, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(out); o.start(t); o.stop(t + dur + 0.05); }
  const click = () => { tone(2400, 0.025, { type: 'square', g: 0.05 }); tone(180, 0.05, { type: 'triangle', g: 0.12 }); };
  const chime = () => [660, 880, 990, 1320].forEach((f, i) => tone(f, 0.5, { type: 'triangle', g: 0.14, at: i * 0.11 }));

  // ------------------------------------------------------------------ state
  const M = { phase: 'off', ch: 2, vol: 0.6, muted: false, digits: '', digitT: 0, lean: 0, leanT: 0, secret: null, t: 0, osdT: 0, A: null, actors: [] };
  let tv = null, crt = null, vm = null, btns = [], led = null, ledGlow = null, rts = null, rti = 0, feedCam = null, feedFrame = 0, crow = null, crowP = null;

  // ------------------------------------------------------------------ the CRT (TVSet material on a 4:3 plane in place of the room's painted screen)
  function ensureTV(R) {
    if (tv) return; tv = new TVSet({ lineup: LINEUP, startChannel: 2, autoGlitch: true }); tv.volume = M.vol;
    crt = new THREE.Mesh(new THREE.PlaneGeometry(R.scrW, R.scrH), tv.material); crt.name = 'crt'; R.scr.parent.add(crt); crt.position.copy(R.scr.position); crt.position.z += 0.004; crt.rotation.copy(R.scr.rotation);
    crt.visible = false; tv.power(false); tv.u.uPower.value = 0;
    tv.addEventListener('channel', (e) => { const c = tv.cur; if (c && c.tex) bind(c.tex, c.cv.width, c.cv.height); if (c && c.feed) bindFeed(); osdShow(); });
    rts = [0, 1].map(() => { const r = new THREE.WebGLRenderTarget(256, 192, { depthBuffer: true }); r.texture.colorSpace = THREE.SRGBColorSpace; return r; }); feedCam = new THREE.PerspectiveCamera(50, 4 / 3, 0.05, 60); }
  function bind(tex, w, h) { const u = tv.u; u.map.value = tex; u.uHasMap.value = 1; u.uMapSize.value.set(w, h); u.uFit.value = 0; u.uMode.value = 0; }
  function bindFeed() { bind(rts[rti ^ 1].texture, 256, 192); tv.u.uFlipY && (tv.u.uFlipY.value = 0); }

  // ------------------------------------------------------------------ the viewmodel: the Wolf's felt arm + paw holding a chunky '90s remote
  const LBL = (s, bg, fg) => { const c = document.createElement('canvas'); c.width = 96; c.height = 80; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 96, 80);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let f = s.length > 2 ? 30 : 50; g.font = `700 ${f}px ${FUT}`; while (g.measureText(s).width > 84) { f -= 2; g.font = `700 ${f}px ${FUT}`; } g.fillText(s, 48, 42);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const BTN = [
    ['power', -0.018, 0.081, 0.017, 0.012, '#c8342e', '#fff', 'I/O'], ['mute', 0.018, 0.081, 0.017, 0.012, '#4c4c56', '#fff', 'MUTE'],
    ['chup', 0, 0.059, 0.019, 0.012, '#6a6a78', '#fff', 'CH▲'], ['vold', -0.022, 0.045, 0.016, 0.013, '#6a6a78', '#fff', 'VOL−'], ['volu', 0.022, 0.045, 0.016, 0.013, '#6a6a78', '#fff', 'VOL+'], ['chdn', 0, 0.031, 0.019, 0.012, '#6a6a78', '#fff', 'CH▼'],
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['' + n, -0.019 + ((n - 1) % 3) * 0.019, 0.009 - Math.floor((n - 1) / 3) * 0.02, 0.015, 0.014, '#e4dccb', '#2a2430', '' + n]),
    ['ent', -0.019, -0.051, 0.015, 0.014, '#b9b2a2', '#2a2430', 'ENT'], ['0', 0, -0.051, 0.015, 0.014, '#e4dccb', '#2a2430', '0'], ['vcr', 0.019, -0.051, 0.015, 0.014, '#b9b2a2', '#2a2430', 'VCR'],
  ];
  function buildVM() {
    vm = new THREE.Group(); vm.name = 'viewmodel'; const rem = new THREE.Group(); vm.add(rem); vm.userData.rem = rem;
    const plastic = feltMat('#2c2b31'), face = feltMat('#3a3942');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.215, 0.024), plastic); rem.add(body);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.002), face); rim.position.z = 0.0125; rem.add(rim);
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#3a3942'; g.fillRect(0, 0, 128, 64); g.fillStyle = MUST; g.font = `700 30px ${FUT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ÆVISION', 64, 34);
    const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace; const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 0.022), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.9 })); logo.position.set(0, -0.078, 0.0137); rem.add(logo);
    const ir = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.02), new THREE.MeshStandardMaterial({ color: '#3a0810', roughness: 0.3, emissive: '#200008' })); ir.position.set(0, 0.11, 0); rem.add(ir);
    led = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: '#3a0a14' })); led.position.set(0, 0.112, 0.004); rem.add(led);
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gg = gc.getContext('2d'), rg = gg.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,120,170,1)'); rg.addColorStop(0.35, 'rgba(255,60,120,.45)'); rg.addColorStop(1, 'rgba(255,40,100,0)'); gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
    ledGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); ledGlow.scale.setScalar(0.05); ledGlow.position.set(0, 0.116, 0.006); rem.add(ledGlow);
    btns = [];
    for (const [id, x, y, w, h, bg, fg, lab] of BTN) { const side = feltMat(bg), top = new THREE.MeshStandardMaterial({ map: LBL(lab, bg, fg), roughness: 0.85, emissive: '#000000' });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), [side, side, side, side, top, side]); m.position.set(x, y, 0.015); m.userData = { id, z0: 0.015, top, pressT: 0 }; rem.add(m); btns.push(m); }
    // the paw: palm behind the bottom of the remote, curled fingers on the left edge, thumb on the right edge; orange felt sleeve going off-screen
    const fur = feltMat('#8e8a96'), fur2 = feltMat('#77737f'), sleeve = feltMat('#e07b28'), cuff = feltMat('#b85a1c');
    const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); rem.add(m); return m; };
    sph(0.04, fur, 0.004, -0.083, -0.02, 1.05, 1.15, 0.75);
    for (let i = 0; i < 4; i++) sph(0.0125, i % 2 ? fur : fur2, -0.036, -0.06 - i * 0.017, 0.004, 0.9, 0.75, 1.1);
    for (let i = 0; i < 3; i++) sph(0.011, fur2, -0.02 + i * 0.002, -0.066 - i * 0.017, 0.014, 0.9, 0.7, 0.5);
    const th = sph(0.012, fur, 0.033, -0.07, 0.01, 0.85, 1.9, 0.85); th.rotation.z = -0.25;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.34, 14), sleeve); arm.position.set(0.05, -0.24, -0.085); arm.rotation.set(-0.55, 0, 0.32); rem.add(arm);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 14), cuff); cf.position.set(0.016, -0.11, -0.03); cf.rotation.copy(arm.rotation); rem.add(cf);
    sph(0.03, fur, 0.012, -0.112, -0.032, 1, 1, 0.9);   // wrist
    vm.traverse((o) => { o.frustumCulled = false; o.castShadow = o.receiveShadow = false; o.renderOrder = 5; }); vm.visible = false; }

  // ------------------------------------------------------------------ helpers: bone aiming (procedural sit pose), walking, camera
  const _a = V(), _b = V(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  const bone = (o, n) => { let f = null; o.traverse((c) => { if (!f && c.isBone && (c.name === n || c.name.endsWith(n) && c.name.replace(n, '').match(/^(mixamorig:?|)$/))) f = c; }); return f; };
  function aim(b, child, dir) { if (!b || !child) return; b.updateWorldMatrix(true, true); b.getWorldPosition(_a); child.getWorldPosition(_b); const cur = _b.sub(_a).normalize();
    _q.setFromUnitVectors(cur, dir.clone().normalize()); b.parent.getWorldQuaternion(_qp); b.getWorldQuaternion(_qb); _qb.premultiply(_q); b.quaternion.copy(_qp.invert().multiply(_qb)); b.updateWorldMatrix(false, true); }
  function actor(o, seat, kind) {   // snapshot bones, compute the seated pose for facing -z (toward the TV)
    const bones = []; o.traverse((c) => { if (c.isBone) bones.push(c); });
    return { o, seat, kind, bones, q0: bones.map((b) => b.quaternion.clone()), p0: o.position.clone(), r0: o.rotation.y, path: [], sitK: 0, q1: null, P1: null }; }
  function seatPose(A) {
    const o = A.o, f = V(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y)), d = V(0, -1, 0), up = V(0, 1, 0), r = V().crossVectors(f, up);
    const Q0 = A.bones.map((b) => b.quaternion.clone()); o.updateMatrixWorld(true);
    for (const s of ['Left', 'Right']) { const sg = s === 'Left' ? -1 : 1, out = r.clone().multiplyScalar(sg * 0.12);
      aim(bone(o, s + 'UpLeg'), bone(o, s + 'Leg'), f.clone().multiplyScalar(0.96).addScaledVector(d, 0.2).add(out));
      aim(bone(o, s + 'Leg'), bone(o, s + 'Foot'), d.clone().addScaledVector(f, 0.12));
      aim(bone(o, s + 'Foot'), bone(o, s + 'ToeBase'), f.clone().addScaledVector(d, 0.1)); }
    if (A.kind === 'wolf') { aim(bone(o, 'RightArm'), bone(o, 'RightForeArm'), f.clone().multiplyScalar(0.75).addScaledVector(d, 0.55).addScaledVector(r, 0.25)); aim(bone(o, 'RightForeArm'), bone(o, 'RightHand'), f.clone().addScaledVector(up, 0.12));
      aim(bone(o, 'LeftArm'), bone(o, 'LeftForeArm'), d.clone().addScaledVector(f, 0.35).addScaledVector(r, -0.2)); aim(bone(o, 'LeftForeArm'), bone(o, 'LeftHand'), f.clone().addScaledVector(d, 0.3).addScaledVector(r, 0.3)); }
    else { for (const s of ['Left', 'Right']) { const sg = s === 'Left' ? -1 : 1; aim(bone(o, s + 'Arm'), bone(o, s + 'ForeArm'), d.clone().addScaledVector(f, 0.3).addScaledVector(r, sg * 0.25)); aim(bone(o, s + 'ForeArm'), bone(o, s + 'Hand'), f.clone().addScaledVector(d, 0.4).addScaledVector(r, -sg * 0.35)); } }
    const sp = bone(o, 'Spine'); if (sp) { sp.rotateX(-0.12); }
    const hips = bone(o, 'Hips'); o.updateMatrixWorld(true); hips.getWorldPosition(_a);
    A.P1 = o.position.clone().add(V(A.seat.x - _a.x, A.seat.y - _a.y, A.seat.z - _a.z));
    A.q1 = A.bones.map((b) => b.quaternion.clone()); A.bones.forEach((b, i) => b.quaternion.copy(Q0[i])); A.qs = Q0; }
  function walkStep(A, dt) {   // walk along A.path; the Wolf blends its walk clip, the Bear waddles
    const o = A.o; if (!A.path.length) return true; const p = A.path[0], dx = p.x - o.position.x, dz = p.z - o.position.z, L = Math.hypot(dx, dz), sp = A.kind === 'wolf' ? 1.5 : 1.1;
    if (L < 0.05) { A.path.shift(); return !A.path.length; }
    const st = Math.min(L, sp * dt); o.position.x += dx / L * st; o.position.z += dz / L * st; const ty = Math.atan2(dx, dz); let dy = ty - o.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.rotation.y += dy * Math.min(1, dt * 9);
    if (A.kind !== 'wolf') o.rotation.z = Math.sin(M.t * 9) * 0.06; return false; }
  function turnTo(A, ry, dt) { let dy = ry - A.o.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); A.o.rotation.y += dy * Math.min(1, dt * 7); A.o.rotation.z *= 0.8; return Math.abs(dy) < 0.04; }
  function wolfAnim(w, dt, walking) { if (!w.mixer) return; const ac = w.acts || {}; if (ac.walk && ac.idle) { const k = Math.min(1, dt * 8), cw = ac.walk.getEffectiveWeight(); ac.walk.setEffectiveWeight(cw + ((walking ? 1 : 0) - cw) * k); ac.idle.setEffectiveWeight(1 - ac.walk.getEffectiveWeight()); if (!ac.walk.isRunning()) ac.walk.play(); } w.mixer.update(dt); }
  function applySit(A, k) { A.sitK = k; const e = k * k * (3 - 2 * k); A.bones.forEach((b, i) => b.quaternion.copy(A.qs[i]).slerp(A.q1[i], e)); A.o.position.lerpVectors(A.standAt, A.P1, e); }

  // ------------------------------------------------------------------ the flow
  const cover = (t, s) => new Promise(r => { fade.querySelector('b').textContent = t; fade.querySelector('small').textContent = s || ''; fade.classList.add('on'); setTimeout(r, 420); });
  const uncover = () => new Promise(r => { fade.classList.remove('on'); setTimeout(r, 380); });
  const camLerp = { on: false };
  function camTo(p1, l1, dur, fov) { camLerp.p0 = cam.position.clone(); const d = V(0, 0, -1).applyQuaternion(cam.quaternion); camLerp.l0 = cam.position.clone().addScaledVector(d, 4);
    camLerp.p1 = p1; camLerp.l1 = l1; camLerp.f0 = cam.fov; camLerp.f1 = fov || cam.fov; camLerp.t = 0; camLerp.dur = dur; camLerp.on = true; }
  const _l = V();
  function camStep(dt) { if (!camLerp.on) return; camLerp.t = Math.min(1, camLerp.t + dt / camLerp.dur); const e = camLerp.t * camLerp.t * (3 - 2 * camLerp.t);
    cam.position.lerpVectors(camLerp.p0, camLerp.p1, e); _l.lerpVectors(camLerp.l0, camLerp.l1, e); cam.fov = camLerp.f0 + (camLerp.f1 - camLerp.f0) * e; cam.updateProjectionMatrix(); cam.lookAt(_l); }

  async function begin(A) {   // called by town.js after the "Got: the remote" line
    const R = A.tvRig; R.wolf = A.wolf; R.scene = A.scene; M.A = A; M.R = R; ensureTV(R); if (!vm) { buildVM(); } if (!vm.parent) R.scene.add(vm);
    document.body.classList.add('tvgo'); M.phase = 'sit'; M.t = 0; R.hold = true;
    const w = A.wolf, b = R.bear; const fy = Math.PI;
    const W = actor(w, R.seatW, 'wolf'), B = actor(b, R.seatB, 'bear'); M.actors = [W, B];
    W.path = [V(Math.max(w.position.x, 1.45), 0, 0.72), V(R.seatW.x, 0, 0.72)]; if (w.position.z < 1.0) W.path.shift();
    B.path = [V(1.55, 0, 0.72), V(R.seatB.x, 0, 0.72)]; B.delay = 0.35;
    { const a = cam.aspect, f = a < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(1.3 / (3.7 * a))) : 46; camTo(V(R.seatW.x + 1.7, 1.95, -1.75), V(R.seatW.x + 0.3, 0.78, 1.45), 1.0, Math.min(f, 80)); }
    if (!crow) loadCrow();
  }
  function sitStep(dt) {   // per-frame couch transition: walk -> turn -> sit (both), then the FP cut
    let done = 0;
    for (const A of M.actors) {
      if (A.delay > 0) { A.delay -= dt; continue; }
      if (A.path.length) { walkStep(A, dt); if (A.kind === 'wolf') wolfAnim(A.o, dt, true); continue; }
      if (A.sitK === 0 && !A.q1) { if (A.kind === 'wolf') wolfAnim(A.o, dt, false); if (turnTo(A, Math.PI, dt)) { A.o.rotation.y = Math.PI; A.o.rotation.z = 0; A.qs = null; A.o.updateMatrixWorld(true); seatPose(A); A.standAt = A.o.position.clone(); } continue; }
      if (A.sitK < 1) { applySit(A, Math.min(1, A.sitK + dt / 0.7)); continue; }
      done++; }
    if (done === M.actors.length && M.phase === 'sit') { M.phase = 'sat'; toFP(); }
  }
  async function toFP() {
    say([['BEAR', 'Scoot.'], ['WOLF', "I'm scooted."]]); await wait(1500);
    await cover('TV Night', "BEAR'S COUCH · 27 INCHES · NOTHING ON"); camLerp.on = false;
    M.phase = 'fp'; document.body.classList.remove('tvgo'); document.body.classList.add('tvon'); M.R.wolf.visible = false; M.R.remote.visible = false; if (M.R.frontWall) M.R.frontWall.visible = true;
    M.R.scr.visible = false; crt.visible = true; vm.visible = true; fpCam(0, true); await wait(200); await uncover();
    await tv.ready; if (tv.cur?.number !== M.ch) tv.setChannel(M.ch); tv.power(true); hum(true); M.osdT = 3; hint.textContent = 'TAP THE REMOTE · TAP THE TV TO LEAN IN'; hint.classList.add('on'); setTimeout(() => hint.classList.remove('on'), 4200);
    T.onTV?.('fp'); }
  const T = {};
  function hum(on) { if (!ac() || !humG) return; humG.gain.setTargetAtTime(on && M.phase === 'fp' ? 0.012 * (M.muted ? 0.3 : 1) * (0.4 + M.vol) : 0, AC.currentTime, 0.25); }

  // first-person camera: from the Wolf's head on the couch, TV centred in the upper half, sized per aspect
  const fp = { yaw: 0, pitch: 0, tan: 0.36, look: null };
  const _sc = V(), _hp = V();
  function fpCam(dt, snap) {
    const R = M.R, aspect = cam.aspect; const hd = bone(R.wolf, 'Head'); R.wolf.updateMatrixWorld(true); if (hd) hd.getWorldPosition(_hp); else _hp.set(R.seatW.x, 1.3, R.seatW.z);
    _hp.y += 0.06; _hp.z -= 0.06; cam.position.copy(_hp); crt.getWorldPosition(_sc);
    const dx = _sc.x - _hp.x, dy = _sc.y - _hp.y, dz = _sc.z - _hp.z, dist = Math.hypot(dx, dy, dz);
    const lean = M.lean, tanT = (aspect < 1 ? (0.56 / dist) / aspect : 0.62 / dist) * (1 - 0.42 * lean);
    fp.tan = snap ? tanT : fp.tan + (tanT - fp.tan) * Math.min(1, dt * 5);
    const ny = aspect < 1 ? 0.34 : 0.18;
    let yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz)) - Math.atan(ny * fp.tan) * (1 - 0.6 * lean);
    if (M.secret?.look) { const k = M.secret.look, e = k * k * (3 - 2 * k); R.sunspot.getWorldPosition(_a); const sx = _a.x - _hp.x, sy = _a.y - _hp.y, sz = _a.z - _hp.z;   // turn around (to the left) and look down at the couch back
      let ys = Math.atan2(-sx, -sz), dy = ys - yaw; while (dy < 0) dy += Math.PI * 2; yaw += dy * e; pitch += (Math.atan2(sy, Math.hypot(sx, sz)) - pitch) * e; }
    fp.yaw = yaw; fp.pitch = pitch; cam.rotation.set(pitch, yaw, 0, 'YXZ'); cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(fp.tan)); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    placeVM(); }
  const T20 = Math.tan(THREE.MathUtils.degToRad(20)), _vp = V();
  function placeVM() {
    const aspect = cam.aspect, port = aspect < 1, D = 0.4;   // constant on-screen size: the remote is ~27% of the screen width in portrait, ~11% in landscape
    const nx = port ? 0.1 : 0.55, ny = port ? -0.58 : -0.5, f = port ? 0.27 : 0.11, s = f * 2 * D * fp.tan * aspect / 0.066;
    _vp.set(nx * aspect * fp.tan * D, ny * fp.tan * D, -D).applyQuaternion(cam.quaternion); vm.position.copy(cam.position).add(_vp);
    vm.quaternion.copy(cam.quaternion); vm.scale.setScalar(s); const rem = vm.userData.rem; rem.rotation.set(-0.8, port ? -0.06 : -0.16, port ? -0.1 : -0.2); vm.updateMatrixWorld(true); }

  // ------------------------------------------------------------------ remote buttons
  function blink() { M.ledT = 0.14; }
  function press(id) {
    if (M.phase !== 'fp') return; const b = btns.find((m) => m.userData.id === id); if (b) b.userData.pressT = 0.14; blink(); click();
    if (!M.muted && sfxOn() && !tv.unlocked) tv.unlock(); if (!sfxOn()) tv.mute(true);
    if (M.secret && id !== 'power') return;
    if (id === 'power') { if (M.secret) return; const on = !tv.on; tv.power(on); hum(on); M.osdT = on ? 2.5 : 0; osdShow(); return; }
    if (!tv.on) return;
    if (id === 'mute') { M.muted = !M.muted; tv.mute(M.muted || !sfxOn()); hum(true); M.osdT = 2.5; osdShow(); return; }
    if (id === 'volu' || id === 'vold') { M.vol = Math.max(0, Math.min(1, M.vol + (id === 'volu' ? 0.1 : -0.1))); tv.volume = M.vol; if (tv.video) tv.video.volume = M.vol; if (M.muted) { M.muted = false; tv.mute(!sfxOn()); } hum(true); M.osdT = 2.5; M.osdVol = 2.5; osdShow(); return; }
    if (id === 'chup' || id === 'chdn') { M.digits = ''; id === 'chup' ? tv.channelUp() : tv.channelDown(); M.ch = tv.cur?.number ?? M.ch; M.osdT = 2.5; osdShow(); return; }
    if (id === 'vcr') { M.osdT = 2.5; M.osdMsg = 'VCR  1:59'; osdShow(); setTimeout(() => { M.osdMsg = ''; }, 2000); return; }
    if (id === 'ent') { if (M.digits) tune(); return; }
    if (/^\d$/.test(id)) { M.digits = (M.digits + id).endsWith(SECRET) ? SECRET : (M.digits + id).slice(-4); M.digitT = 1.4; M.osdT = 2.5; osdShow(); if (M.digits.length >= 4) tune(); }
  }
  function tune() { const n = parseInt(M.digits, 10); M.digits = ''; if (!n && n !== 0) return; M.ch = n; tv.setChannel(n); M.osdT = 2.5; osdShow(); if (String(n) === SECRET) secretStart(); }
  function osdShow() { if (!tv) return; const c = tv.cur, num = M.digits ? (M.digits + '--').slice(0, Math.max(2, M.digits.length)) : String(tv.cur?.number ?? M.ch).padStart(2, '0');
    let s = M.osdMsg || (tv.on ? `CH ${num}` + (c && c.name && !M.digits ? `\n${c.name}` : '') : '');
    if (tv.on && M.muted) s += '\nMUTE'; else if (tv.on && M.osdVol > 0) s += '\nVOL ' + '▮'.repeat(Math.round(M.vol * 10)) + '▯'.repeat(10 - Math.round(M.vol * 10));
    osd.textContent = s; osd.classList.toggle('on', !!s && (M.osdT > 0 || M.muted)); }
  const _ndc = V();
  function screenRect() { const r = renderer.domElement.getBoundingClientRect(), pts = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, y]) => { _ndc.set(x * M.R.scrW / 2, y * M.R.scrH / 2, 0); crt.localToWorld(_ndc); _ndc.project(cam); return [(_ndc.x + 1) / 2 * r.width, (1 - _ndc.y) / 2 * r.height]; });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; }
  function placeOSD() { const s = screenRect(), hgt = s.y1 - s.y0; osd.style.fontSize = Math.max(11, hgt * 0.1) + 'px'; osd.style.transform = `translate(${s.x1 - hgt * 0.08}px, ${s.y0 + hgt * 0.07}px) translateX(-100%)`; }
  function pick(cx, cy) {   // nearest button in screen space (generous hit radius for thumbs)
    const r = renderer.domElement.getBoundingClientRect(), x = cx - r.left, y = cy - r.top; let best = null, bd = 1e9; const P = (m) => { m.getWorldPosition(_ndc); _ndc.project(cam); return [(_ndc.x + 1) / 2 * r.width, (1 - _ndc.y) / 2 * r.height]; };
    const p1 = P(btns.find(b => b.userData.id === '1')), p2 = P(btns.find(b => b.userData.id === '2')), sp = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    for (const m of btns) { const [px, py] = P(m), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = m; } }
    return bd < Math.max(26, sp * 0.8) ? best.userData.id : null; }
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (M.phase !== 'fp') return; const id = pick(e.clientX, e.clientY); if (id) { press(id); return; }
    const s = screenRect(), r = renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!M.secret && x > s.x0 - 30 && x < s.x1 + 30 && y > s.y0 - 30 && y < s.y1 + 30) M.lean = M.lean ? 0 : 1; });

  // ------------------------------------------------------------------ the secret: CH 1990
  function loadCrow() { if (crowP) return crowP; crowP = Promise.resolve(glb('town2/crow_lo.glb', 1.55, 'crow', { rest: 'breathe' })).then((c) => { crow = c; crow.visible = false; crow.rotation.y = Math.PI; const pl = new THREE.PointLight('#ffd9a0', 2.2, 2.4, 1.6); pl.position.set(0, 1.75, 0.3); crow.add(pl); M.R.scene.add(crow); return c; }).catch(() => null); return crowP; }
  function secretStart() {
    const R = M.R; M.lean = 0; if (S.sunspot1990) { M.secret = null; say([['BEAR', "Huh. That's us."], ['WOLF', "We're always on TV."], ['BEAR', "Nothing's behind us. I checked."]]); return; }
    M.secret = { t: 0, look: 0, stage: 0 }; hint.classList.remove('on'); }
  function secretStep(dt) {
    const s = M.secret, R = M.R; if (!s) return; s.t += dt; const t = s.t;
    if (s.stage === 0 && t > 1.0) { s.stage = 1; say([['BEAR', "Huh. That's us."]]); }
    if (s.stage === 1 && t > 2.6) { s.stage = 2; if (crow) { crow.visible = true; crow.position.set(R.seatW.x + 0.36, -1.3, R.seatW.z + 1.1); } }
    if (s.stage >= 2 && s.stage < 5 && crow) { const k = Math.min(1, (t - 2.6) / 2.2); crow.position.y = -1.3 + 1.6 * (k * k * (3 - 2 * k)); crow.proc?.(M.t); }
    if (s.stage >= 2 && s.stage < 6) R.lampFlicker?.(Math.random() < 0.25 ? 0.15 : 1);
    if (s.stage === 2 && t > 4.4) { s.stage = 3; say([['WOLF', "Who's filming?"]]); tv.glitch('bend'); }
    if (s.stage === 3 && t > 5.8) { s.stage = 4; say([['BEAR', "Don't turn around."]]); }
    if (s.stage === 4 && t > 7.4) { s.stage = 5; if (crow) crow.visible = false; R.sunspot.visible = true; R.decoy && (R.decoy.visible = false); R.fanStop = true; tv.glitch('snow'); }
    if (s.stage >= 5 && s.stage < 7) s.look = Math.min(1, s.look + dt / 0.7);
    if (s.stage === 5 && t > 8.4) { s.stage = 6; say([['', 'Nobody. Just a sunspot on the table behind the couch. Still warm.']]); R.lampFlicker?.(1); }
    if (s.stage === 6 && t > 10.4) { s.stage = 7; card.classList.add('on'); chime(); S.sunspot1990 = 1; S.decoyGone = 1; save?.(); }
    if (s.stage === 7 && t > 12.6) { s.stage = 8; card.classList.remove('on'); }
    if (s.stage >= 8) s.look = Math.max(0, s.look - dt / 0.8);
    if (s.stage === 8 && t > 13.6) { s.stage = 9; R.fanStop = false; tv.glitch('roll'); say([['BEAR', 'The Crow does trades.'], ['WOLF', 'What did he take?'], ['BEAR', 'The decoy remote. He has wanted it for years.']]); }
    if (s.stage === 9 && t > 14.5) { M.secret = null; }
  }

  // ------------------------------------------------------------------ live feeds (CH 9 behind the couch, CH 1990 from inside the TV)
  function renderFeed() {
    const c = tv.cur; if (!c || !c.feed || !tv.on) return; if (feedFrame++ & 1) return;
    const R = M.R; if (c.feed === 'behind') { feedCam.position.set(R.seatW.x + 0.25, 2.05, R.seatW.z + 1.9); feedCam.fov = 50; feedCam.lookAt(R.seatW.x, 0.95, -2.3); }
    else { crt.getWorldPosition(_sc); feedCam.position.copy(_sc).add(V(0, 0.02, 0.12)); feedCam.fov = 40; feedCam.lookAt(R.seatW.x + 0.38, 0.8, R.seatW.z); }
    feedCam.updateProjectionMatrix(); feedCam.updateMatrixWorld(true);
    const wv = R.wolf.visible, vv = vm.visible; R.wolf.visible = true; vm.visible = false; R.remote.visible = false; R.held.visible = true;
    if (!R.lights) { R.lights = []; R.scene.traverse((o) => { if (o.isLight) R.lights.push([o, o.intensity]); }); }
    for (const [l, i] of R.lights) l.intensity = i * 1.7;   // render targets skip the screen tone-mapping, so the feed would read murky without a little push
    tv.u.map.value = rts[rti ^ 1].texture; const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rts[rti]); renderer.render(R.scene, feedCam); renderer.setRenderTarget(prev);
    for (const [l, i] of R.lights) l.intensity = i;
    R.wolf.visible = wv; vm.visible = vv; R.held.visible = false; tv.u.map.value = rts[rti].texture; tv.u.uHasMap.value = 1; rti ^= 1; }

  // ------------------------------------------------------------------ per-frame (town.js calls this instead of its own wolf/camera logic while T.tv is set)
  function update(dt, t) {
    M.t += dt; const R = M.R; if (!R) return; camStep(dt);
    if (M.phase === 'sit') sitStep(dt);
    // the held remote follows the Wolf's right hand during the walk/sit (third person + feeds)
    const hand = bone(R.wolf, 'RightHand'); if (hand && R.held) { hand.getWorldPosition(_a); hand.getWorldQuaternion(_q); R.held.position.copy(_a); R.held.quaternion.copy(_q); R.held.visible = M.phase === 'sit' || M.phase === 'sat'; }
    if (M.phase === 'fp') {
      if (M.digits && (M.digitT -= dt) <= 0) tune();
      fpCam(dt); secretStep(dt);
      for (const b of btns) { const u = b.userData; if (u.pressT > 0) { u.pressT -= dt; b.position.z = u.z0 - 0.004; u.top.emissive.set('#553a10'); } else { b.position.z = u.z0; u.top.emissive.set('#000000'); } }
      const lt = M.ledT > 0 ? (M.ledT -= dt, 1) : 0; led.material.color.set(lt ? '#ff6a9a' : '#3a0a14'); ledGlow.material.opacity = lt ? 0.55 + Math.random() * 0.3 : 0;
      if (M.osdT > 0) M.osdT -= dt; if (M.osdVol > 0) M.osdVol -= dt; osdShow(); placeOSD();
      if (tv.cur?.tick && tv.on) tv.cur.tick(dt, t);
      renderFeed(); }
    tv?.update(dt);
  }
  function idle(dt, t) { if (tv && M.phase === 'off') { tv.update(dt); } }   // finish the power-off collapse after standing up

  async function leave() {
    if (M.phase !== 'fp') return; M.phase = 'leaving'; tv.power(false); hum(false); osd.classList.remove('on'); await wait(650);
    await cover('Stand Up', 'THE COUCH KEEPS YOUR SHAPE'); end(); await wait(120); await uncover(); onLeave?.();
  }
  function end() {   // restore everything (also used when the room is exited mid-TV)
    const R = M.R; if (!R) return; if (tv && tv.on) tv.power(false); hum(false); M.secret = null; M.lean = 0; M.digits = ''; card.classList.remove('on');
    for (const A of M.actors) { A.bones.forEach((b, i) => b.quaternion.copy(A.q0[i])); A.o.position.copy(A.p0); A.o.rotation.y = A.r0; A.o.rotation.z = 0; }
    if (M.actors[0]) { const w = M.actors[0].o; w.position.set(R.seatW.x + 1.65, 0, 0.75); w.rotation.y = -2.2; }
    R.wolf.visible = true; R.remote.visible = true; R.held.visible = false; if (R.frontWall) R.frontWall.visible = false; vm && (vm.visible = false); camLerp.on = false; if (crow) crow.visible = false; R.fanStop = false; R.lampFlicker?.(1);
    document.body.classList.remove('tvon', 'tvgo'); osd.classList.remove('on'); hint.classList.remove('on'); M.actors = []; M.phase = 'off'; R.hold = false; if (R.held) R.held.visible = false; }

  // QA hook for headless screenshots
  const test = { crow: () => crow && { v: crow.visible, p: crow.position.toArray().map(v => +v.toFixed(2)), inScene: !!crow.parent }, press, tune: (s) => { M.digits = String(s); tune(); }, state: () => ({ phase: M.phase, ch: tv?.cur?.number ?? null, on: !!tv?.on, name: tv?.cur?.name || '', secret: M.secret ? M.secret.stage : -1, found: !!S.sunspot1990, info: tv?.info?.() }),
    glitch: (k) => tv?.glitch(k), lean: (k) => { M.lean = k; }, tv: () => tv };
  Object.assign(T, { begin, update, idle, end, leave, test }); Object.defineProperty(T, 'phase', { get: () => M.phase }); Object.defineProperty(T, 'active', { get: () => M.phase !== 'off' }); return T;
}
