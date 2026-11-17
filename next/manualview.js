// The Sunspots instruction manual, inside the game (title menu + pause menu: MANUAL, and the standalone manual/ page).
// 28 pages rendered from the print booklet: manual/pages/sm_NN.webp (760 px, ~60 KB) to read, lg_NN.webp (1700 px)
// swapped in when you zoom. Nothing is fetched until the manual is opened (shell.js imports this file on the first tap).
// Phone landscape shows the booklet open (a two-page spread), portrait one page. Swipe or the arrows turn pages,
// tap to look closer (tap again to step back), pinch to zoom, drag to move around a zoomed page, tap the page
// counter for every page at once. Esc / arrow keys on a keyboard.
const N = 28;
const BASE = new URL('./manual/pages/', import.meta.url).href;
const pad2 = (n) => String(n).padStart(2, '0');
const src = (n, big) => `${BASE}${big ? 'lg' : 'sm'}_${pad2(n)}.webp`;
const KEY = 'sunspots.manualPage';

const CSS = `
#manOv{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;touch-action:none;-webkit-user-select:none;user-select:none;color:#fbf0d9;
  font-family:Futura,"Avenir Next",Avenir,"Trebuchet MS",system-ui,sans-serif;overscroll-behavior:none;
  background:radial-gradient(rgba(255,255,255,.07) 1.2px,transparent 1.6px) 0 0/9px 9px,radial-gradient(ellipse at 50% 45%,#2c53c4 0%,#1c3c99 60%,#14296e 100%)}
#manOv.on{display:flex}
#manOv .mTop{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 12px) 6px calc(env(safe-area-inset-left) + 12px);position:relative;z-index:3}
#manOv .mTop:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:4px;background:linear-gradient(90deg,#3cb8a8 0 25%,#ec6f55 25% 50%,#ef78b4 50% 75%,#f29a3a 75%);opacity:.9}
#manOv .mName{font-weight:800;font-size:13px;letter-spacing:.22em;color:#ffd36a;text-shadow:0 2px 0 #9b5c16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#manOv .mName small{display:block;font-size:10px;letter-spacing:.24em;color:#fbf0d9;opacity:.75;text-shadow:none;margin-top:1px}
#manOv .mCnt{flex:none;border:0;border-radius:999px;padding:8px 14px;min-height:36px;background:rgba(20,16,44,.55);color:#fbf0d9;font:800 13px Futura,"Avenir Next",Avenir,system-ui,sans-serif;letter-spacing:.14em;box-shadow:inset 0 0 0 1.5px rgba(255,246,225,.25);cursor:pointer;touch-action:manipulation}
#manOv .mCnt i{font-style:normal;opacity:.6;margin-left:6px;font-size:11px}
#manOv .mLinks{flex:none;display:flex;gap:8px} #manOv .mLk{display:flex;align-items:center;justify-content:center;height:40px;padding:0 14px;font-size:13px;letter-spacing:.14em;text-decoration:none;border-radius:18px} #manOv .mLk:before{inset:4px;border-radius:14px}
#manOv .mX{flex:none;width:44px;height:44px;border-radius:50%;padding:0;font-size:0}
#manOv .mX:before{inset:5px;border-radius:50%}
#manOv .mX svg{width:18px;height:18px;display:block;margin:auto;position:relative}
#manOv .mStage{position:relative;flex:1;--foot:0px;min-height:0;overflow:hidden;touch-action:none}
#manOv .mZoom{position:absolute;inset:0;padding-bottom:var(--foot,0px);box-sizing:border-box;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;will-change:transform}
#manOv .mBook{display:flex;position:relative;perspective:1600px}
#manOv .mPg{position:relative;background:#efe2c4;box-shadow:0 10px 26px rgba(8,6,30,.5),0 2px 0 rgba(0,0,0,.25);overflow:hidden}
#manOv .mPg img{display:block;width:100%;height:100%;-webkit-user-drag:none;pointer-events:none}
#manOv .mBook.two .mPg:first-child{border-radius:6px 0 0 6px} #manOv .mBook.two .mPg:last-child{border-radius:0 6px 6px 0}
#manOv .mBook.one .mPg{border-radius:6px}
#manOv .mBook.two .mPg:first-child:after,#manOv .mBook.two .mPg:last-child:after{content:"";position:absolute;top:0;bottom:0;width:9%;pointer-events:none}
#manOv .mBook.two .mPg:first-child:after{right:0;background:linear-gradient(90deg,transparent,rgba(30,20,40,.22))}
#manOv .mBook.two .mPg:last-child:after{left:0;background:linear-gradient(270deg,transparent,rgba(30,20,40,.28))}
#manOv .mBook.in-n{animation:mInN .32s cubic-bezier(.2,.7,.25,1)} #manOv .mBook.in-p{animation:mInP .32s cubic-bezier(.2,.7,.25,1)}
@keyframes mInN{from{transform:translateX(26%) rotateY(-18deg);opacity:0}to{transform:none;opacity:1}}
@keyframes mInP{from{transform:translateX(-26%) rotateY(18deg);opacity:0}to{transform:none;opacity:1}}
#manOv .mArr{position:absolute;top:50%;z-index:2;width:46px;height:46px;margin-top:-23px;border-radius:50%;padding:0;font-size:0;transition:opacity .2s}
#manOv .mArr:before{inset:5px;border-radius:50%}
#manOv .mArr svg{width:16px;height:16px;display:block;margin:auto;position:relative}
#manOv .mPrev{left:calc(env(safe-area-inset-left) + 8px)} #manOv .mNext{right:calc(env(safe-area-inset-right) + 8px)}
#manOv .mArr[disabled]{opacity:0;pointer-events:none} #manOv.zoomed .mArr{opacity:0;pointer-events:none}
#manOv .mHint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 10px);transform:translateX(-50%);z-index:2;white-space:nowrap;padding:7px 14px;border-radius:999px;background:rgba(20,16,44,.62);font-size:12px;letter-spacing:.1em;pointer-events:none;transition:opacity .6s}
#manOv .mHint.off{opacity:0}
#manOv .mGrid{position:absolute;inset:0;z-index:4;display:none;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:rgba(14,22,66,.94);
  padding:14px calc(env(safe-area-inset-right) + 14px) calc(env(safe-area-inset-bottom) + 18px) calc(env(safe-area-inset-left) + 14px)}
#manOv .mGrid.on{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:12px;align-content:start}
#manOv .mGrid button{border:0;padding:0;background:none;color:#fbf0d9;font:700 11px Futura,Avenir,system-ui,sans-serif;letter-spacing:.12em;cursor:pointer;touch-action:manipulation}
#manOv .mGrid img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;background:#efe2c4;box-shadow:0 4px 10px rgba(0,0,0,.4);margin-bottom:5px}
#manOv .mGrid button.now img{outline:3px solid #ffd36a;outline-offset:2px}
@media (orientation:portrait){#manOv .mStage{--foot:100px} #manOv .mArr{top:auto;margin-top:0;bottom:calc(env(safe-area-inset-bottom) + 12px)} #manOv .mHint{bottom:calc(env(safe-area-inset-bottom) + 66px)}}
@media (orientation:landscape) and (max-height:500px){#manOv .mTop{padding-top:calc(env(safe-area-inset-top) + 5px);padding-bottom:4px} #manOv .mX{width:40px;height:40px} #manOv .mName small{display:none}}
`;

const X_SVG = '<svg viewBox="0 0 20 20"><path d="M4 4L16 16M16 4L4 16" stroke="#fbf0d9" stroke-width="3.2" stroke-linecap="round"/></svg>';
const ARR = (d) => `<svg viewBox="0 0 16 16"><path d="${d ? 'M5 2l7 6-7 6' : 'M11 2L4 8l7 6'}" fill="none" stroke="#20307a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let root, stage, zoomEl, book, cnt, grid, prevB, nextB, hint, cur = 1, opened = false, closeCb = null, standalone = false;
let z = 1, tx = 0, ty = 0;
const two = () => innerWidth > innerHeight * 1.2 && innerWidth >= 560;
function spread(p) { p = Math.max(1, Math.min(N, p)); if (!two() || p === 1) return [p]; const a = p % 2 ? p - 1 : p; return a + 1 <= N ? [a, a + 1] : [a]; }

function build() {
  const st = document.createElement('style'); st.id = 'manCss'; st.textContent = CSS; document.head.appendChild(st);
  root = document.createElement('div'); root.id = 'manOv'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Sunspots instruction manual');
  root.innerHTML = `<div class="mTop"><div class="mName">SUNSPOTS<small>INSTRUCTION MANUAL</small></div><button class="mCnt" aria-label="All pages"></button>${standalone ? '<div class="mLinks"><a class="felt cream mLk" href="./Sunspots_Manual.pdf" target="_blank" rel="noopener">PDF</a><a class="felt mustard mLk" href="../">PLAY</a></div>' : `<button class="felt coral mX" aria-label="Close the manual">${X_SVG}</button>`}</div>
<div class="mStage"><div class="mZoom"><div class="mBook"></div></div><button class="felt cream mArr mPrev" aria-label="Previous page">${ARR(0)}</button><button class="felt cream mArr mNext" aria-label="Next page">${ARR(1)}</button><div class="mHint">Swipe to turn the page · tap to look closer</div><div class="mGrid"></div></div>`;
  document.body.appendChild(root);
  stage = root.querySelector('.mStage'); zoomEl = root.querySelector('.mZoom'); book = root.querySelector('.mBook'); cnt = root.querySelector('.mCnt'); grid = root.querySelector('.mGrid');
  prevB = root.querySelector('.mPrev'); nextB = root.querySelector('.mNext'); hint = root.querySelector('.mHint');
  // the town never sees a touch that lands on the manual
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'click', 'wheel']) root.addEventListener(ev, (e) => e.stopPropagation());
  for (const ev of ['gesturestart', 'gesturechange']) root.addEventListener(ev, (e) => e.preventDefault());
  root.querySelector('.mX')?.addEventListener('click', () => { tick(); close(); });
  prevB.addEventListener('click', () => { tick(); turn(-1); });
  nextB.addEventListener('click', () => { tick(); turn(1); });
  cnt.addEventListener('click', () => { tick(); toggleGrid(); });
  grid.addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (!b) return; tick(); toggleGrid(false); go(+b.dataset.p, 0); });
  wireGestures();
  addEventListener('resize', () => { if (opened) { resetZoom(); go(cur, 0); } });
  addEventListener('keydown', (e) => {
    if (!opened) return;
    if (e.key === 'Escape') { if (grid.classList.contains('on')) toggleGrid(false); else if (z > 1) resetZoom(); else if (!standalone) close(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') turn(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1);
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
}
const tick = () => { try { window.__audio?.play?.('sfx_ui_tick', { bus: 'ui', gain: 1 }); } catch (_) {} };

function sizePages(k) {
  const r = stage.getBoundingClientRect(); const side = two() ? 64 : 12, vpad = two() ? 14 : 20, foot = innerHeight > innerWidth ? 100 : 0;
  return Math.max(120, Math.floor(Math.min(r.height - vpad * 2 - foot, (r.width - side * 2) / k)));
}
function go(p, dir) {
  const s = spread(p); cur = s[0];
  const px = sizePages(s.length);
  book.className = 'mBook ' + (s.length === 2 ? 'two' : 'one');
  book.innerHTML = s.map((n) => `<div class="mPg" style="width:${px}px;height:${px}px"><img alt="Page ${n}" src="${src(n)}" decoding="async"></div>`).join('');
  if (dir) { void book.offsetWidth; book.classList.add(dir > 0 ? 'in-n' : 'in-p'); }
  cnt.innerHTML = (s.length === 2 ? `${s[0]}–${s[1]}` : `${s[0]}`) + `<i>/ ${N}</i>`;
  prevB.disabled = s[0] <= 1; nextB.disabled = s[s.length - 1] >= N;
  try { localStorage.setItem(KEY, String(cur)); } catch (_) {}
  // warm the next and previous pages so turning is instant
  for (const n of [s[s.length - 1] + 1, s[s.length - 1] + 2, s[0] - 1, s[0] - 2]) if (n >= 1 && n <= N) { const im = new Image(); im.decoding = 'async'; im.src = src(n); }
  if (z > 1) hiRes();
}
function turn(d) { if (z > 1) return; const s = spread(cur); const p = d > 0 ? s[s.length - 1] + 1 : s[0] - 1; if (p < 1 || p > N) return; go(p, d); hint.classList.add('off'); }

function apply() { zoomEl.style.transform = z > 1.001 ? `translate(${tx}px,${ty}px) scale(${z})` : ''; root.classList.toggle('zoomed', z > 1.001); }
function clampPan() {
  const r = stage.getBoundingClientRect(), b = book.getBoundingClientRect();
  const bw = b.width / (z || 1) * z, bh = b.height / (z || 1) * z;   // book rect is already scaled
  const lx = Math.max(0, (bw - r.width) / 2 + 16), ly = Math.max(0, (bh - r.height) / 2 + 16);
  tx = Math.max(-lx, Math.min(lx, tx)); ty = Math.max(-ly, Math.min(ly, ty));
}
function zoomAt(nz, cx, cy) {   // cx, cy: point in stage coords to keep still
  const r = stage.getBoundingClientRect(); const px = cx - r.width / 2, py = cy - r.height / 2;
  nz = Math.max(1, Math.min(4, nz)); tx = px - (px - tx) * (nz / z); ty = py - (py - ty) * (nz / z); z = nz;
  if (z <= 1.001) { z = 1; tx = ty = 0; } apply(); clampPan(); apply(); if (z > 1.3) hiRes();
}
function resetZoom() { z = 1; tx = ty = 0; zoomEl.style.transition = 'transform .22s ease-out'; apply(); setTimeout(() => (zoomEl.style.transition = ''), 240); }
function hiRes() { for (const im of book.querySelectorAll('img')) { if (im.dataset.hi) continue; im.dataset.hi = '1'; const n = +im.alt.replace(/\D/g, ''); const big = new Image(); big.decoding = 'async'; big.onload = () => { if (im.isConnected) im.src = big.src; }; big.src = src(n, true); } }

function wireGestures() {
  const pts = new Map(); let g = null;
  const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button,.mGrid')) return;
    stage.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, local(e));
    if (pts.size === 1) { const [x, y] = local(e); g = { kind: 'one', x0: x, y0: y, tx0: tx, ty0: ty, t0: performance.now(), moved: 0 }; }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; g = { kind: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: z, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, tx0: tx, ty0: ty }; book.style.transform = ''; }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !g) return; pts.set(e.pointerId, local(e));
    if (g.kind === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      z = g.z0; tx = g.tx0; ty = g.ty0; zoomAt(g.z0 * d / g.d0, g.cx, g.cy); g.moved = 99;
    } else if (g.kind === 'one') {
      const [x, y] = local(e); const dx = x - g.x0, dy = y - g.y0; g.moved = Math.max(g.moved, Math.hypot(dx, dy));
      if (z > 1) { tx = g.tx0 + dx; ty = g.ty0 + dy; clampPan(); apply(); }
      else if (g.moved > 8) book.style.transform = `translateX(${dx * 0.6}px) rotateY(${-dx * 0.03}deg)`;
    }
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return; const [x, y] = local(e); pts.delete(e.pointerId);
    if (!g) return;
    if (g.kind === 'pinch') { if (pts.size === 0) { g = null; if (z < 1.05) resetZoom(); } return; }
    const dx = x - g.x0, dt = performance.now() - g.t0; book.style.transition = 'transform .2s'; book.style.transform = ''; setTimeout(() => (book.style.transition = ''), 210);
    if (e.type === 'pointerup' && g.moved < 10 && dt < 450) { if (z > 1) resetZoom(); else zoomAt(two() ? 2.2 : 2.6, x, y); hint.classList.add('off'); }
    else if (z <= 1 && Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(y - g.y0)) turn(dx < 0 ? 1 : -1);
    g = null;
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = local(e); if (e.ctrlKey || z > 1) zoomAt(z * Math.exp(-e.deltaY * 0.004), x, y); else if (Math.abs(e.deltaX) > 20 || Math.abs(e.deltaY) > 20) { if (!g) { g = { kind: 'wheel' }; turn((e.deltaX || e.deltaY) > 0 ? 1 : -1); setTimeout(() => (g = null), 350); } } }, { passive: false });
}
function toggleGrid(on = !grid.classList.contains('on')) {
  if (on && !grid.childElementCount) grid.innerHTML = Array.from({ length: N }, (_, i) => `<button data-p="${i + 1}"><img loading="lazy" decoding="async" alt="" src="${src(i + 1)}">${i + 1}</button>`).join('');
  for (const b of grid.querySelectorAll('button')) b.classList.toggle('now', spread(cur).includes(+b.dataset.p));
  grid.classList.toggle('on', on); if (on) { resetZoom(); grid.querySelector('.now')?.scrollIntoView({ block: 'center' }); }
}

export function openManual(opts = {}) {
  standalone = !!opts.standalone; closeCb = opts.onClose || null;
  if (!root) build();
  let p = opts.page; if (!p) { try { p = +localStorage.getItem(KEY) || 1; } catch (_) { p = 1; } }
  opened = true; root.classList.add('on'); z = 1; tx = ty = 0; apply(); toggleGrid(false);
  hint.classList.remove('off'); clearTimeout(openManual._h); openManual._h = setTimeout(() => hint.classList.add('off'), 3800);
  go(p, 0); window.__manualOpen = true;
}
export function close() { if (!opened) return; opened = false; root.classList.remove('on'); window.__manualOpen = false; const f = closeCb; closeCb = null; f?.(); }
export const manual = { open: openManual, close, get page() { return cur; }, get zoom() { return z; }, turn, go: (p) => go(p, 0) };
window.__manual = manual;
