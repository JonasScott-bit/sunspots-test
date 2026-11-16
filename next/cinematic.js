// Next Level run 1: full-screen cinematic clips from next/video/ (first user: LATE NIGHT SWIM LESSON WITH RAM — the intro video is coming).
// playCinematic('swim_lesson_intro') -> plays video/<name>.mp4 (muted autoplay first, tap for sound), letterboxed, HOLD SKIP button.
// Missing / failed file = resolves at once with { played: false }, so a mission can wire this in before the clip exists.
// QA: ?cine=swim_lesson_intro plays it once the title is gone.
export const CINE = { swim_lesson_intro: { src: 'video/swim_lesson_intro.mp4', poster: 'video/swim_lesson_intro.jpg', title: 'LATE NIGHT SWIM LESSON' } };
let busy = null;
export function playCinematic(name, { onStart } = {}) {
  if (busy) return busy;
  const c = CINE[name] || { src: `video/${name}.mp4` };
  busy = new Promise((resolve) => {
    const css = document.getElementById('cineCss') || Object.assign(document.head.appendChild(document.createElement('style')), { id: 'cineCss',
      textContent: `#cine{position:fixed;inset:0;z-index:60;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .4s}
      #cine.on{opacity:1} #cine video{width:100%;height:100%;object-fit:contain;background:#000}
      #cine .t{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 14px);text-align:center;color:#ffe1a8;font:800 12px system-ui,sans-serif;letter-spacing:.3em;opacity:.8}
      #cine .sk{position:absolute;right:calc(env(safe-area-inset-right) + 14px);bottom:calc(env(safe-area-inset-bottom) + 16px);min-width:96px;min-height:48px;border:0;border-radius:24px;background:#2b1e3ccc;color:#ffe1a8;font:800 12px system-ui,sans-serif;letter-spacing:.14em;overflow:hidden}
      #cine .sk i{position:absolute;left:0;top:0;bottom:0;width:0;background:#f6b23a55}
      #cine .snd{position:absolute;left:calc(env(safe-area-inset-left) + 14px);bottom:calc(env(safe-area-inset-bottom) + 16px);min-height:48px;padding:0 16px;border:0;border-radius:24px;background:#2b1e3ccc;color:#ffe1a8;font:800 12px system-ui,sans-serif;letter-spacing:.14em}` });
    void css;
    const root = document.createElement('div'); root.id = 'cine';
    root.innerHTML = `<video playsinline webkit-playsinline muted preload="auto"${c.poster ? ` poster="${c.poster}"` : ''}></video>${c.title ? `<div class="t">${c.title}</div>` : ''}<button class="snd">TAP FOR SOUND</button><button class="sk"><i></i><span>HOLD TO SKIP</span></button>`;
    document.body.appendChild(root); document.body.classList.add('scene');
    const v = root.querySelector('video'), sk = root.querySelector('.sk'), fill = sk.querySelector('i'), snd = root.querySelector('.snd');
    let done = false, hold = 0, holdT = null;
    const end = (played) => { if (done) return; done = true; clearInterval(holdT); root.classList.remove('on'); document.body.classList.remove('scene'); try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) { }
      setTimeout(() => root.remove(), 420); busy = null; resolve({ played }); };
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
    snd.addEventListener('click', (e) => { e.stopPropagation(); v.muted = false; v.play().catch(() => { }); snd.remove(); });
    const startHold = (e) => { e.preventDefault(); e.stopPropagation(); clearInterval(holdT); holdT = setInterval(() => { hold = Math.min(1, hold + 0.05); fill.style.width = hold * 100 + '%'; if (hold >= 1) end(true); }, 40); };
    const stopHold = () => { clearInterval(holdT); hold = 0; fill.style.width = '0'; };
    sk.addEventListener('pointerdown', startHold); sk.addEventListener('pointerup', stopHold); sk.addEventListener('pointerleave', stopHold);
    v.addEventListener('ended', () => end(true)); v.addEventListener('error', () => end(false));
    v.src = c.src; requestAnimationFrame(() => root.classList.add('on'));
    v.play().then(() => onStart?.()).catch(() => { if (v.error) end(false); });   // autoplay may need the tap; a missing file errors -> ends
    setTimeout(() => { if (!done && v.readyState === 0 && v.networkState === 3) end(false); }, 4000);
  });
  return busy;
}
export function installCinematicQA() {
  const n = new URLSearchParams(location.search).get('cine'); if (!n) return;
  const go = () => { if (window.__titleUp || !window.__ready) { setTimeout(go, 300); return; } playCinematic(n).then((r) => { window.__cineResult = r; }); };
  go();
}
window.__cine = { play: playCinematic, CINE };
