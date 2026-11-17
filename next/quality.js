// Sunspots ship pass (Nov 16 2026): settings store + device quality tiers.
// - One saved settings object (localStorage 'sunspots.settings'): quality (auto|high|medium|low), invert (off|x|y|both),
//   textSize (m|l|xl). Audio volumes stay in audio.js ('sunspots.audio').
// - Quality AUTO picks a tier from the device (phone/desktop, memory, cores, GPU string). perf.js applies it and steps
//   AUTO up/down at runtime on steady frame times (remembered per GPU, see 'sunspots.autoTier' below).
// - ?quality=high|medium|low forces a tier for QA. 0 tris, 0 rigs.
// - ?phone (mud fix, Nov 16 2026): QA renders exactly what Scott's iPhone starts at: MEDIUM tier, phone rules (top tier
//   MEDIUM, phone culling), device pixel ratio 3 -> capped to 1.5 by the tier, no auto stepping. ?phone=low = the tier the
//   phone steps down to (pixel ratio 1). Use it for every review shot (see QA_PHONE.md). ?shot (still captures) now also
//   defaults to MEDIUM unless ?quality= says otherwise, so no QA path silently renders at HIGH again.
const KEY = 'sunspots.settings';
const Q = new URLSearchParams(location.search);
export const PHONE = Q.has('phone') ? (Q.get('phone') === 'low' ? 'low' : 'medium') : null;
if (PHONE) { try { Object.defineProperty(window, 'devicePixelRatio', { get: () => 3, configurable: true }); } catch (_) {} }
// build stamp (shown in the pause menu with the tier + pixel ratio, so a phone report says exactly what it ran)
export const BUILD = '2026-11-16 doors+cam';
window.__build = BUILD;
export const TIERS = {
  //            pixel ratio cap, shadow map, soft shadows, characters hidden past (m), character shadows past (m), props hidden past (m), far cacti, simplified mesh past (m)
  // mud fix: LODs are seam-preserving now and swap in much further out (MEDIUM was 6 m -> almost every character on the
  // phone was a 12% mesh); simplified mesh distance = lodDist x max(0.6, 20k / tris), L2 past 3x that
  high:   { id: 'high',   label: 'HIGH',   dprMax: 2,   shadowMap: 1024, soft: true,  charCull: 95, charShadow: 30, propCull: 240, cacti: 300, lodDist: 24 },
  medium: { id: 'medium', label: 'MEDIUM', dprMax: 1.5, shadowMap: 1024, soft: false, charCull: 42, charShadow: 14, propCull: 175, cacti: 150, lodDist: 16 },
  low:    { id: 'low',    label: 'LOW',    dprMax: 1,   shadowMap: 512,  soft: false, charCull: 32, charShadow: 8, propCull: 125, cacti: 60, lodDist: 10 },
};
const ORDER = ['low', 'medium', 'high'];
const DEF = { quality: 'auto', invert: 'off', textSize: 'm', fps: 'off' };   // fps: the PERF overlay (perfhud.js)
let S = { ...DEF };
try { S = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (_) {}
const subs = new Set();

let gpu = '';
function gpuString() {
  if (gpu) return gpu;
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return (gpu = 'none');
    const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (_) { gpu = 'unknown'; }
  return gpu;
}
export function isPhone() {
  if (PHONE) return true;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPod|Mobile/i.test(ua) || (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (matchMedia?.('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820);
}
export function detectTier() {
  const g = gpuString().toLowerCase(), phone = isPhone();
  const mem = navigator.deviceMemory || (phone ? 4 : 8), cores = navigator.hardwareConcurrency || 4;
  let t, why;
  if (/mali-4|mali-t[0-9]|adreno \(tm\) [3-5]\d\d|powervr sgx|powervr rogue g6|intel\(r\) hd graphics [2-5]\d\d\b|llvmpipe|software/.test(g)) { t = 'low'; why = 'older GPU'; }
  // iOS/iPadOS: WebKit always reports 4 cores and no memory, and every Apple GPU since the A12 holds 60 fps here -> MEDIUM
  else if (phone && /apple/.test(g) && /iPhone|iPad|Macintosh/.test(navigator.userAgent)) { t = 'medium'; why = 'iPhone/iPad (Apple GPU)'; }
  else if (mem <= 3 || (phone && cores <= 4)) { t = 'low'; why = `memory ${mem} GB, ${cores} cores`; }
  else if (phone) { t = 'medium'; why = 'phone'; }
  else if (mem >= 8 && cores >= 8) { t = 'high'; why = 'desktop'; }
  else { t = 'medium'; why = 'small desktop'; }
  return { tier: t, why, gpu: g, phone, mem, cores };
}
const DET = detectTier();
// AUTO learns: perf.js steps the tier up after ~20 s of steady 60 fps in town and down after ~6 s of steady < 35 fps
// (per-second medians, so one-off hitches never count). The result is remembered per GPU ('sunspots.autoTier'), and a tier
// that had to be stepped down from is never tried again on that device. Phones top out at MEDIUM, desktops at HIGH.
const LKEY = 'sunspots.autoTier', CAP = DET.phone ? 1 : 2;
let L = {}; try { const j = JSON.parse(localStorage.getItem(LKEY)); if (j && j.gpu === DET.gpu) L = j; } catch (_) {}
let cur = TIERS[L.tier] ? ORDER.indexOf(L.tier) : ORDER.indexOf(DET.tier);
const failed = () => (L.failed ?? 9);   // lowest tier index that was too slow here
function learn() { L.tier = ORDER[cur]; L.gpu = DET.gpu; try { localStorage.setItem(LKEY, JSON.stringify(L)); } catch (_) {} }
export function tierId() {
  const f = Q.get('quality'); if (TIERS[f]) return f;
  if (PHONE) return PHONE;
  if (Q.has('shot')) return 'medium';
  if (S.quality !== 'auto' && TIERS[S.quality]) return S.quality;
  return ORDER[cur];
}
export const quality = {
  get tier() { return tierId(); }, get t() { return TIERS[tierId()]; }, get auto() { return !TIERS[Q.get('quality')] && !PHONE && !Q.has('shot') && S.quality === 'auto'; }, phone: PHONE,
  detected: DET,
  get learned() { return { ...L, start: DET.tier }; },
  stepDown() { if (!this.auto || cur === 0) return false; L.failed = Math.min(failed(), cur); cur--; learn(); emit('quality'); return true; },
  stepUp() { if (!this.auto || cur >= CAP || cur + 1 >= failed()) return false; cur++; learn(); emit('quality'); return true; },
  canStepUp() { return this.auto && cur < CAP && cur + 1 < failed(); },
};
export function getSettings() { return S; }
export function setSetting(k, v) { if (S[k] === v) return; S[k] = v;  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} emit(k); }
export function onSettings(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit(k) { applyTextSize(); for (const f of subs) try { f(k, S); } catch (e) { console.warn('settings listener', e); } }
function applyTextSize() { const h = document.documentElement; h.classList.toggle('ts-l', S.textSize === 'l'); h.classList.toggle('ts-xl', S.textSize === 'xl'); }
applyTextSize();
window.__quality = quality; window.__settings = { get: getSettings, set: setSetting, on: onSettings, TIERS };
