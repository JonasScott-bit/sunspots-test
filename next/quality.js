// Sunspots ship pass (Nov 16 2026): settings store + device quality tiers.
// - One saved settings object (localStorage 'sunspots.settings'): quality (auto|high|medium|low), invert (off|x|y|both),
//   textSize (m|l|xl). Audio volumes stay in audio.js ('sunspots.audio').
// - Quality AUTO picks a tier from the device (phone/desktop, memory, cores, GPU string). perf.js applies it and can
//   step AUTO down one tier at runtime if the frame rate stays low after the resolution is already at its floor.
// - ?quality=high|medium|low forces a tier for QA. 0 tris, 0 rigs.
const KEY = 'sunspots.settings';
const Q = new URLSearchParams(location.search);
export const TIERS = {
  //            pixel ratio cap, shadow map, soft shadows, characters hidden past (m), character shadows past (m), props hidden past (m), far cacti, simplified mesh past (m)
  high:   { id: 'high',   label: 'HIGH',   dprMax: 2,   shadowMap: 1024, soft: true,  charCull: 95, charShadow: 30, propCull: 240, cacti: 300, lodDist: 16 },
  medium: { id: 'medium', label: 'MEDIUM', dprMax: 1.5, shadowMap: 1024, soft: false, charCull: 42, charShadow: 14, propCull: 175, cacti: 150, lodDist: 6 },
  low:    { id: 'low',    label: 'LOW',    dprMax: 1,   shadowMap: 512,  soft: false, charCull: 32, charShadow: 8, propCull: 125, cacti: 60, lodDist: 5 },
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
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPod|Mobile/i.test(ua) || (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (matchMedia?.('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820);
}
export function detectTier() {
  const g = gpuString().toLowerCase(), phone = isPhone();
  const mem = navigator.deviceMemory || (phone ? 4 : 8), cores = navigator.hardwareConcurrency || 4;
  let t, why;
  if (/mali-4|mali-t[0-9]|adreno \(tm\) [3-5]\d\d|powervr sgx|powervr rogue g6|intel\(r\) hd graphics [2-5]\d\d\b|llvmpipe|software/.test(g)) { t = 'low'; why = 'older GPU'; }
  else if (mem <= 3 || (phone && cores <= 4)) { t = 'low'; why = `memory ${mem} GB, ${cores} cores`; }
  else if (phone) { t = 'medium'; why = 'phone'; }
  else if (mem >= 8 && cores >= 8) { t = 'high'; why = 'desktop'; }
  else { t = 'medium'; why = 'small desktop'; }
  return { tier: t, why, gpu: g, phone, mem, cores };
}
const DET = detectTier();
let autoStep = 0;   // runtime step-down for AUTO (perf.js)
export function tierId() {
  const f = Q.get('quality'); if (TIERS[f]) return f;
  if (S.quality !== 'auto' && TIERS[S.quality]) return S.quality;
  return ORDER[Math.max(0, ORDER.indexOf(DET.tier) - autoStep)];
}
export const quality = {
  get tier() { return tierId(); }, get t() { return TIERS[tierId()]; }, get auto() { return !TIERS[Q.get('quality')] && S.quality === 'auto'; },
  detected: DET,
  stepDown() { if (!this.auto || ORDER.indexOf(tierId()) === 0) return false; autoStep++; emit('quality'); return true; },
};
export function getSettings() { return S; }
export function setSetting(k, v) { if (S[k] === v) return; S[k] = v; if (k === 'quality') autoStep = 0; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} emit(k); }
export function onSettings(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit(k) { applyTextSize(); for (const f of subs) try { f(k, S); } catch (e) { console.warn('settings listener', e); } }
function applyTextSize() { const h = document.documentElement; h.classList.toggle('ts-l', S.textSize === 'l'); h.classList.toggle('ts-xl', S.textSize === 'xl'); }
applyTextSize();
window.__quality = quality; window.__settings = { get: getSettings, set: setSetting, on: onSettings, TIERS };
