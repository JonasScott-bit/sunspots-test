// Sunspots ship pass (Nov 16 2026): in-game PERF overlay, so real-phone numbers can be reported.
// On with ?perf (or ?perf=1 / ?fps), or Settings > PERF > ON (saved). ?perf=0 still means "culling off" (perf.js) and
// does not show it. Reads the page's own frame clock (requestAnimationFrame), so it measures what the player sees,
// including the title and pause screens. Numbers:
//   Per-screen samples (title / town / driving / rooms) and the last long frames (> 50 ms) with what happened in them
//   (perf.js hitch(): JS vs render time, new shaders / textures / meshes, LOD builds, loads, room changes) go in the COPY report.
//   FPS (last second) · 1% low (slowest frames, last 10 s) · frame ms avg / p95 · triangles + draw calls of the last frame
//   (main view; the shadow pass is not included) · pixel ratio · quality tier · LODs built · what the screen is.
// COPY puts a one-paragraph report (with the device: GPU, cores, memory, screen, browser) on the clipboard.
import { quality, getSettings, onSettings } from './quality.js';
const Q = new URLSearchParams(location.search);
const urlOn = (Q.has('perf') && Q.get('perf') !== '0') || Q.has('fps');
let el = null, raf = 0, last = 0, acc = [], win = [], tSec = 0, nSec = 0, fps = 0, t0 = 0;
// perf pass 2: every screen keeps its own sample (the report covers play, not just the title) + a log of long frames
const B = {}, HITCH = [], HMAX = 14; let hitchN = 0, lastWhere = '';
const bucket = (w) => w.startsWith('room') ? 'rooms' : w;
const css = `#pfHud{position:fixed;z-index:60;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 6px);display:flex;align-items:center;gap:8px;
  background:rgba(20,14,30,.78);color:#fff3dc;border-radius:14px;padding:6px 6px 6px 12px;font:700 13px/1.25 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.02em;
  pointer-events:none;-webkit-user-select:none;user-select:none;max-width:calc(100vw - 24px);box-shadow:0 3px 10px rgba(0,0,0,.35)}
#pfHud b{color:#ffd36a;font-size:16px} #pfHud b.warn{color:#ff9a6a} #pfHud b.bad{color:#ff6a6a}
#pfHud .l{white-space:nowrap} #pfHud small{display:block;font-size:12px;opacity:.85;white-space:nowrap}
#pfHud button{pointer-events:auto;min-width:64px;height:44px;border:0;border-radius:11px;background:#e9a62c;color:#2b1e3c;font:800 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.08em;touch-action:manipulation;cursor:pointer}
body.pf-on #title{visibility:hidden!important}
@media (max-width:520px){#pfHud{left:calc(env(safe-area-inset-left) + 114px);transform:none;max-width:calc(100vw - 114px - 106px);padding:4px 4px 4px 8px;gap:4px;font-size:12px} #pfHud b{font-size:14px} #pfHud small{font-size:11px} #pfHud button{min-width:50px;height:44px;font-size:11px;letter-spacing:.02em}}`;
const k = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
function where() { const T = window.__town; if (window.__titleUp) return 'title'; if (window.__paused) return 'paused'; if (T?.active) return 'room ' + T.active; if (document.body.classList.contains('driving')) return 'driving'; return 'town'; }
function stats() {
  const s = win.slice().sort((a, b) => b - a), n = s.length || 1;
  const low1 = s.length ? 1000 / (s.slice(0, Math.max(1, Math.floor(n / 100))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(n / 100))) : 0;
  const avg = s.reduce((a, b) => a + b, 0) / n, p95 = s[Math.floor(n * 0.05)] || 0;
  const r = window.__sunspots?.renderer, P = window.__perf?.stats?.() || {};
  return { fps, low1, avg, p95, tris: r?.info.render.triangles || 0, calls: r?.info.render.calls || 0, dpr: r ? r.getPixelRatio() : devicePixelRatio, tier: quality.tier, auto: quality.auto, lods: P.lods || 0, where: where() };
}
function sumB(a) { const s = a.slice().sort((x, y) => y - x), n = s.length, m = Math.max(1, Math.floor(n / 100)); return { n, avg: s.reduce((x, y) => x + y, 0) / n, p95: s[Math.floor(n * 0.05)], low1: 1000 / (s.slice(0, m).reduce((x, y) => x + y, 0) / m), long: s.filter((x) => x > 50).length, worst: s[0] }; }
function report() {
  const s = stats(), d = quality.detected, P = window.__perf?.stats?.() || {}, Lr = quality.learned || {};
  const per = Object.entries(B).filter(([, a]) => a.length > 30).map(([w, a]) => { const r = sumB(a); return `${w}: ${Math.round(1000 / r.avg)} fps avg, 1% low ${r.low1.toFixed(0)}, ${r.avg.toFixed(1)}/${r.p95.toFixed(1)} ms avg/p95, ${r.long} frames > 50 ms (worst ${r.worst.toFixed(0)} ms), ${r.n} frames`; }).join(' | ');
  const hl = HITCH.map((h) => `[${h.at}s ${h.where} ${h.ms} ms: js ${h.js} · render ${h.render}${h.programs ? ` · ${h.programs} new shaders` : ''}${h.tex ? ` · ${h.tex} new textures` : ''}${h.geo ? ` · ${h.geo} new meshes` : ''}${h.notes.length ? ' · ' + h.notes.join(', ') : ''}${!h.programs && !h.notes.length && h.js + h.render < h.ms * 0.4 ? ' · not in JS: GPU, GC or the browser' : ''}]`).join(' ');
  const extra = ` PER SCREEN: ${per || 'n/a'}. LONG FRAMES (${hitchN} total, last ${HITCH.length}): ${hl || 'none'}. Auto: started ${Lr.start || '?'}${P.ups?.length ? ', stepped up to ' + P.ups.join('>') : ''}${P.steps?.length ? ', stepped down to ' + P.steps.join('>') : ''}${Lr.failed != null ? ', too slow at tier #' + Lr.failed : ''}. LODs ${P.lods || 0} (${P.worker ? 'worker' : 'main thread'}, pending ${P.lodPending || 0}, main ${(P.lodMainMs || 0).toFixed(0)} ms), shader warm-ups ${P.warmed || 0} (${(P.warmMs || 0).toFixed(0)} ms blocking).`;
  return `Sunspots perf report (${new Date().toLocaleString()}): ${s.fps} fps, 1% low ${s.low1.toFixed(0)} fps, frame ${s.avg.toFixed(1)} ms avg / ${s.p95.toFixed(1)} ms p95, ` +
    `${s.tris} tris / ${s.calls} draw calls (view), pixel ratio ${s.dpr}, quality ${s.tier.toUpperCase()}${s.auto ? ' (auto)' : ''}, ${s.lods} LODs, screen: ${s.where}. ` +
    `Device: GPU ${d.gpu || '?'}, ${d.cores} cores, ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'memory n/a'}, ${screen.width}x${screen.height} @${devicePixelRatio}x, viewport ${innerWidth}x${innerHeight}. ${navigator.userAgent}.` + extra;
}
function tick(now) {
  raf = requestAnimationFrame(tick);
  const h = window.__perf?.hitch?.(), w = where(), bk = bucket(w);
  if (last && !document.hidden) { const ft = Math.min(1000, now - last); win.push(ft); if (win.length > 600) win.shift(); tSec += ft; nSec++;
    if (bk === lastWhere) { (B[bk] ||= []).push(ft); if (B[bk].length > 7200) B[bk].shift();
      if (ft > 50 && bk !== 'paused') { hitchN++; HITCH.push({ at: ((now - t0) / 1000).toFixed(1), where: w, ms: Math.round(ft), ...(h || { js: 0, render: 0, programs: 0, tex: 0, geo: 0, notes: [] }) }); if (HITCH.length > HMAX) HITCH.shift(); } } }
  last = now; if (!t0) t0 = now; lastWhere = bk;
  if (tSec >= 1000) { fps = Math.round(nSec * 1000 / tSec); tSec = 0; nSec = 0; draw(); }
}
function draw() {
  if (!el) return; const s = stats();
  if (innerWidth <= 520) { el.querySelector('.l').innerHTML = `<b class="${s.fps < 30 ? 'bad' : s.fps < 50 ? 'warn' : ''}">${s.fps} FPS</b> ${s.avg.toFixed(0)}ms<small>${k(s.tris)} · ${s.tier.slice(0, 3).toUpperCase()} · 1% ${s.low1.toFixed(0)}</small>`; return; }
  el.querySelector('.l').innerHTML = `<b class="${s.fps < 30 ? 'bad' : s.fps < 50 ? 'warn' : ''}">${s.fps} FPS</b> · 1% ${s.low1.toFixed(0)} · ${s.avg.toFixed(1)}/${s.p95.toFixed(0)} ms` +
    `<small>${k(s.tris)} tris · ${s.calls} calls · ${s.tier.toUpperCase()}${s.auto ? ' auto' : ''} · DPR ${(+s.dpr).toFixed(2).replace(/\.?0+$/, '')} · ${s.where}</small>`;
}
function on() {
  if (el) return;
  if (!document.getElementById('pfHudCss')) { const c = document.createElement('style'); c.id = 'pfHudCss'; c.textContent = css; document.head.appendChild(c); }
  el = document.createElement('div'); el.id = 'pfHud'; el.innerHTML = '<div class="l">measuring…</div><button type="button">COPY</button>';
  const btn = el.querySelector('button');
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  btn.addEventListener('click', async (e) => { e.stopPropagation(); const t = report(); let okc = false;
    try { await navigator.clipboard.writeText(t); okc = true; } catch (_) { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); okc = document.execCommand('copy'); ta.remove(); } catch (_) {} }
    btn.textContent = okc ? 'COPIED' : 'FAILED'; setTimeout(() => (btn.textContent = 'COPY'), 1600); });
  document.body.appendChild(el); document.body.classList.add('pf-on'); last = 0; win = []; tSec = 0; nSec = 0; raf = requestAnimationFrame(tick);
}
function off() { if (!el) return; cancelAnimationFrame(raf); el.remove(); el = null; document.body.classList.remove('pf-on'); }
const want = () => urlOn || getSettings().fps === 'on';
const sync = () => (want() ? on() : off());
onSettings((key) => { if (key === 'fps') sync(); });
if (document.body) sync(); else addEventListener('DOMContentLoaded', sync);
window.__perfHud = { report, stats, on, off, hitches: () => HITCH.slice(), buckets: () => Object.fromEntries(Object.entries(B).map(([k, a]) => [k, sumB(a)])) };
