// Sunspots title screen: Scott's hand-made loop video (sun sinks while the blue 'sunspots' building melts
// into a puddle and reforms). Muted + autoplay + loop + playsinline so it autoplays on iOS Safari.
// Shown on load (doubles as the loading screen) until tapped.
// Fallback: if the video can't be decoded at all, the old 2D layered three.js title (title2d.js) takes over.
// If autoplay is merely refused (e.g. iOS Low Power Mode), the first-frame poster stays up instead.
const Q = new URLSearchParams(location.search);
const ON = !Q.has('shot') || Q.has('title');
const root = document.getElementById('titleScr');
window.__titleUp = ON;
const state = window.__titleState = { p: 0, ready: false };
if (!ON) { root && root.remove(); window.__title = { progress() {}, ready() {} }; }
else if (Q.has('title2d')) fallback('forced');
else start();

function fallback(why) {
  if (state.fell) return; state.fell = true;
  console.warn('[title] video unavailable (' + why + '), using 2D title');
  root.querySelector('video')?.remove();
  root.classList.remove('video');
  if (root._go) root.removeEventListener('pointerup', root._go);
  import('./title2d.js');
}

function start() {
  document.getElementById('load')?.style.setProperty('display', 'none');
  root.classList.add('video');
  const v = document.createElement('video');
  v.className = 'tvid';
  v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
  for (const a of ['muted', 'autoplay', 'loop', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture', 'disableremoteplayback']) v.setAttribute(a, '');
  v.setAttribute('preload', 'auto');
  v.poster = './title/title_poster.jpg';
  for (const [src, type] of [['./title/title_loop.mp4', 'video/mp4; codecs="avc1.640028"'], ['./title/title_loop.webm', 'video/webm; codecs="vp9"']]) {
    const s = document.createElement('source'); s.src = src; s.type = type; v.appendChild(s);
  }
  // the last <source> failing (or no playable type) means no video at all
  v.lastElementChild.addEventListener('error', () => fallback('source error'));
  v.addEventListener('error', () => fallback('media error'));
  if (!v.canPlayType('video/mp4; codecs="avc1.640028"') && !v.canPlayType('video/webm; codecs="vp9"')) { fallback('no codec'); return; }
  root.insertBefore(v, root.firstChild);
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };   // refusal: poster stays
  tryPlay();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && root.isConnected) tryPlay(); });
  if (Q.has('tphase')) { v.pause(); v.addEventListener('loadeddata', () => { v.currentTime = parseFloat(Q.get('tphase')) * (v.duration || 5); }, { once: true }); }

  // Frame the video (object-fit: cover) so the sun + building stay centred; place the wordmark in
  // video-space so it never covers the building's own 'sunspots' lettering (video y ~0.70-0.76).
  const VW = 1080, VH = 720, word = root.querySelector('.tw');
  const WORD = Q.get('tword') || 'auto';   // QA: auto | off | top | ptop | low
  function layout() {
    const W = innerWidth, H = innerHeight, portrait = W / H < 1;
    // cover-scale, centred horizontally; vertically keep the building's lettering + base (video y <= 0.78)
    // clear of the TAP TO START footer, cropping sky first (the sun top only clips on very wide screens)
    const s = Math.max(W / VW, H / VH), dw = VW * s, dh = VH * s, ox = (W - dw) * 0.5;
    const footH = H * (portrait ? 0.06 : 0.03) + 58;
    const oy = portrait ? (H - dh) * 0.5 : Math.min(0, Math.max(H - dh, (H - footH) - 0.78 * dh));
    const pos = '50% ' + (dh > H + 0.5 ? (oy / (H - dh) * 100).toFixed(2) : 50) + '%';
    v.style.objectPosition = root.style.backgroundPosition = pos;
    const X = (u) => ox + u * dw, Y = (t) => oy + t * dh;
    let mode = WORD === 'auto' ? (portrait ? 'ptop' : 'top') : WORD;
    word.style.display = mode === 'off' ? 'none' : '';
    const aspect = 246 / 862;
    if (mode === 'ptop') {
      // portrait: small, centred in the strip of sky above the sun (sun peaks at video y ~0.10)
      const ww = Math.min(W * 0.5, 260, Math.max(40, Y(0.10) - 10) / aspect);
      Object.assign(word.style, { width: ww + 'px', left: (W / 2 - ww / 2) + 'px', top: 'calc(env(safe-area-inset-top) + 8px)', transform: 'none' });
    } else if (mode === 'top') {
      // landscape: open sky in the upper-left, left of the sun and above the left cloud
      const ww = Math.min(W * 0.27, dw * 0.27, 420), x0 = Math.max(X(0.035), 16), y0 = Math.max(Y(0.06), 14);
      Object.assign(word.style, { width: ww + 'px', left: x0 + 'px', top: y0 + 'px', transform: 'none' });
    } else if (mode === 'low') {
      // portrait: in the flower field between the building's lettering and TAP TO START
      const foot = H - (H * 0.06 + 64), top = Math.max(Y(0.79), Y(0.76) + 6);
      const ww = Math.min(W * 0.62, (foot - top) / aspect, 360), cy = (top + foot) / 2;
      Object.assign(word.style, { width: ww + 'px', left: (W / 2 - ww / 2) + 'px', top: cy + 'px', transform: 'translateY(-50%)' });
    }
  }
  layout(); addEventListener('resize', layout);

  const bar = root.querySelector('.tbar i');
  window.__title = {
    progress(f) { state.p = f; bar.style.width = (Math.max(0, Math.min(1, f)) * 100) + '%'; },
    ready() { state.ready = true; root.classList.add('ready'); },
  };
  const go = root._go = (e) => {
    if (!state.ready || state.fell) return; e.preventDefault(); e.stopPropagation();
    root.removeEventListener('pointerup', go);
    window.__titleUp = false; root.classList.add('out');
    setTimeout(() => { v.pause(); v.removeAttribute('src'); while (v.firstChild) v.firstChild.remove(); v.load(); root.remove(); }, 750);
  };
  root.addEventListener('pointerup', go);
}
