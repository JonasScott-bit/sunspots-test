// Sunspots ship pass, part 3 (Nov 16 2026): the full-game shell around the town.
//  * Title menu (title.js keeps the EES intro + trippy menu): CONTINUE (when a save exists, with Night + Sunspots),
//    NEW GAME (confirm, wipes the save, restarts straight into play), SETTINGS, CREDITS.
//  * Settings (title + pause): sound mode + volumes, QUALITY (auto by device / high / medium / low, live), TEXT SIZE,
//    INVERT LOOK. Stored by quality.js ('sunspots.settings').
//  * Pause (II button, Esc/P, or the app going to the background): RESUME, NIGHTS, SETTINGS, CREDITS, MANUAL, MAIN MENU.
//  * MANUAL (title + pause): the instruction booklet, manualview.js + manual/pages/*.webp, fetched only when opened.
//    Freezes the town loop (main.js checks window.__paused) and the audio clock.
//  * Seven Nights: Sunspots open each Night (window.__msnNights from missions/kit.js, same table here as a fallback).
//    A felt card announces each new Night; the GO sheet fast-travels only to districts that Night has opened (walking
//    is never blocked: a nudge, not a leash).
//  * Free demo: window.SUNSPOTS_BUILD.demo (index.html) or ?demo=1. Night 1 only; an end-of-demo card with the price
//    ($7.99 CAD phone, $13.99 CAD desktop, no ads, no loot boxes). No payments are built here.
//  * PWA: registers sw.js (scope /next/) so it installs to a home screen and starts offline.
// QA: ?unlock opens every Night · ?demo=1 · ?pause=1 opens the pause menu · window.__shell
import { quality, getSettings, setSetting, onSettings, TIERS } from './quality.js';
import './saveguard.js';   // save backup / restore (runs before the town reads its save)
import './perfhud.js';   // PERF overlay (?perf or Settings > PERF)
import { creditsHTML } from './credits.js';
import { maybeFinale, playFinale, checkPerfect } from './finale.js';

const Q = new URLSearchParams(location.search);
const BUILD = window.SUNSPOTS_BUILD || {};
const DEMO = Q.has('demo') ? Q.get('demo') !== '0' : !!BUILD.demo;
const PRICE = BUILD.price || { phone: '$7.99 CAD', desktop: '$13.99 CAD' };
const FALLBACK_NIGHTS = [
  { n: 1, need: 0, name: 'NIGHT 1 · LAST MINUTE SNACKS', opens: 'Main St' },
  { n: 2, need: 2, name: "NIGHT 2 · TACO TUESDAY'S", opens: 'the Neon Strip' },
  { n: 3, need: 5, name: 'NIGHT 3 · THE SWIM LESSON', opens: 'the Mansion' },
  { n: 4, need: 8, name: "NIGHT 4 · GRANDMA'S CAT", opens: "Grandma's side of town" },
  { n: 5, need: 12, name: 'NIGHT 5 · ONE HORSE FAIR', opens: 'the Fair after dark' },
  { n: 6, need: 17, name: 'NIGHT 6 · TWO HORSES', opens: 'the farm road' },
  { n: 7, need: 21, name: 'NIGHT 7 · SAME OLD ONE HORSE TOWN', opens: 'sunrise in Horse Plaza' },
];
const NIGHTS = () => window.__msnNights || FALLBACK_NIGHTS;
const PKEY = 'sunspots.progress';
const loadP = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (_) { return {}; } };
const saveP = (p) => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (_) {} };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sfx = (n = 'sfx_ui_tick') => { try { window.__audio?.play?.(n, { bus: 'ui', gain: 1 }); } catch (_) {} };

// ------------------------------------------------------------------ save + progress
function savedTown() { if (Q.has('fresh')) return null; try { const j = localStorage.getItem('ss_town_v1'); const s = j && JSON.parse(j); return s && Object.keys(s).length ? s : null; } catch (_) { return null; } }
function count() { const J = window.__journal; if (J) return J.found().length; const s = savedTown(); return s?.sun ? Object.keys(s.sun).length : 0; }
function total() { return window.__journal?.SUNS?.length || 0; }
function nightOpen(n) { if (Q.has('unlock')) return true; if (DEMO && n > 1) return false; const N = NIGHTS()[n - 1]; return !!N && count() >= N.need; }
// one sentence for a locked Night (mission cards in missions/kit.js use it, so the demo says "full game", not a count)
function lockLine(n) { const N = NIGHTS()[n - 1]; if (!N) return ''; const nm = `Night ${n}`; if (DEMO && n > 1) return `${nm} is in the full game. The free demo is Night 1.`; return `Opens on ${nm} at ${N.need} ☀ Sunspots. You have ${count()}.`; }
function night() { let n = 1; for (const N of NIGHTS()) if (nightOpen(N.n)) n = N.n; return n; }
const nightName = (n) => (NIGHTS()[n - 1]?.name || `NIGHT ${n}`);
// GO sheet districts -> the Night that opens them
const KEY_NIGHT = (k) => /^(bowl|motel|pool|drivein|poolhall|court|taco)$/.test(k) ? 2 : k === 'mansion' ? 3 : k === 'farm' ? 6 : /^(carnival|c_)/.test(k) ? 5 : 1;
function wipeSave() {
  window.__wiping = true; try { if (window.__town?.M) window.__town.M.save = () => {}; } catch (_) {}   // nothing may write the old game back on the way out
  const keep = /^sunspots\.(audio|settings)$/;
  for (const st of [localStorage, sessionStorage]) { try { for (const k of Object.keys(st)) if ((/^ss_/.test(k) || /^sunspots\./.test(k)) && !keep.test(k)) st.removeItem(k); } catch (_) {} }
  try { localStorage.setItem('sunspots.wiped', String(Date.now())); } catch (_) {}   // saveguard.js: never restore a mirror older than this
  window.__saveguard?.clearMirror?.();
}
// Settings > SAVE > RESET SAVE (confirmed) and the journal's erase button: wipe everything, back to the title
function resetSave() { wipeSave(); const go = () => { const q = new URLSearchParams(location.search); for (const k of ['fresh', 'unlock', 'finale', 'pause']) q.delete(k); location.href = location.pathname + (q.toString() ? '?' + q : ''); };
  Promise.resolve(window.__saveguard?.clearMirror?.()).finally(() => setTimeout(go, 60)); }

// NEW GAME restarts the page straight into play (skip the company intro the second time)
const AUTOPLAY = (() => { try { return sessionStorage.getItem('sunspots.autoplay') === '1'; } catch (_) { return false; } })();
if (AUTOPLAY) { try { sessionStorage.removeItem('sunspots.autoplay'); } catch (_) {} if (!Q.has('intro')) { Q.set('intro', '0'); history.replaceState(null, '', location.pathname + '?' + Q.toString() + location.hash); } }

// ------------------------------------------------------------------ styles
const css = document.createElement('style');
css.textContent = `
#titleScr .menu .saveInfo{align-self:stretch;text-align:center;font:800 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.16em;color:#fbf0d9;background:rgba(32,30,70,.55);border-radius:999px;padding:8px 12px;text-shadow:0 1px 0 rgba(0,0,0,.4)}
#titleScr .menu .bNew{width:100%;height:52px;font-size:15px}
#titleScr.land .menu .bNew{height:48px}
#titleScr.land .menu.shTall{gap:8px;transform:translateY(-50%)}
#titleScr.land.melting .menu.shTall{transform:translateY(-40%)}
#titleScr.land .menu.shTall .saveInfo{white-space:nowrap;letter-spacing:.06em;padding:7px 10px}
#titleScr.land .menu.shTall .bPlay{height:60px;font-size:22px}
#titleScr.land .menu.shTall .bNew,#titleScr.land .menu.shTall .bSet,#titleScr.land .menu.shTall .bCred{height:44px}
#titleScr.land .menu.shTall .row{gap:8px}
#titleScr .menu .bMan{width:100%;height:50px;font-size:15px;flex:none}
#titleScr.land .menu.shTall .bMan{height:44px}
#shOv .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
#shOv .row3 .felt{font-size:12px;letter-spacing:.1em;padding:0 4px}
@media (orientation:portrait),(max-width:400px){#shOv .row3 .felt{font-size:11px;letter-spacing:.05em}}
#titleScr .panel{overflow-y:auto!important;-webkit-overflow-scrolling:touch}
#titleScr .panel .shRows{display:flex;flex-direction:column;gap:10px}
#titleScr .panel[data-p=newgame] p{margin:0;font-size:15px;line-height:1.45;text-align:center}
#titleScr .panel[data-p=newgame] .felt{height:54px;width:100%;flex:none}
.shSeg{display:grid;grid-template-columns:78px repeat(var(--n,4),1fr);gap:6px;align-items:center;font:700 13px Futura,"Avenir Next",Avenir,system-ui,sans-serif;letter-spacing:.14em}
.shSeg button{height:46px;border:0;border-radius:12px;background:rgba(32,48,122,.12);color:#20307a;font:800 13px Futura,"Avenir Next",Avenir,system-ui,sans-serif;letter-spacing:.06em;touch-action:manipulation;cursor:pointer;padding:0 4px}
.shSeg button.shDanger{background:#c9302a;color:#fbf0d9;box-shadow:0 3px 0 #7a1a16}
.shSeg button.on{background:#2c53c4;color:#fbf0d9;box-shadow:0 3px 0 #162a73}
.shNote{font:600 13px/1.4 Futura,Avenir,system-ui,sans-serif;color:#4a4f8a;margin:-2px 0 2px}
.shSlider{display:grid;grid-template-columns:78px 1fr 3.4em;align-items:center;gap:6px;font:700 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.14em;color:#20307a}
.shSlider input{-webkit-appearance:none;appearance:none;width:100%;height:14px;border-radius:8px;background:linear-gradient(90deg,#e9a62c var(--v,100%),rgba(32,48,122,.18) var(--v,100%));outline:none;margin:12px 0}
.shSlider input::-webkit-slider-thumb{-webkit-appearance:none;width:34px;height:34px;border-radius:50%;background:#2c53c4;box-shadow:0 3px 0 #162a73,inset 0 0 0 3px rgba(255,246,225,.5)}
.shSlider input::-moz-range-thumb{width:34px;height:34px;border:0;border-radius:50%;background:#2c53c4}
#shPauseBtn{position:fixed;z-index:13;top:calc(env(safe-area-inset-top) + 8px);left:calc(env(safe-area-inset-left) + 64px);width:44px;height:44px;border:0;padding:0;border-radius:50%;background:rgba(43,30,60,.45);color:#fff3dc;display:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
#shPauseBtn:before,#shPauseBtn:after{content:"";position:absolute;top:13px;width:5px;height:18px;border-radius:3px;background:#fff3dc}
#shPauseBtn:before{left:15px} #shPauseBtn:after{right:15px}
body.shell-play #shPauseBtn{display:block}
body.scene #shPauseBtn,body.map #shPauseBtn,body.intro #shPauseBtn,body.ended #shPauseBtn,body.shell-paused #shPauseBtn{display:none!important}
html body #title{left:calc(env(safe-area-inset-left) + 120px)!important}
@media (orientation:portrait){html body #title{display:none!important}}
#shOv{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(27,19,36,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);touch-action:manipulation;
  font-family:Futura,"Avenir Next",Avenir,system-ui,sans-serif}
#shOv.on{display:flex}
#shOv .card{position:relative;width:min(88vw,400px);max-height:calc(100% - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px);overflow-y:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:20px 20px 18px;border-radius:26px;color:#20307a;display:flex;flex-direction:column;gap:12px;
  background:#f6e7c8 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .35  0 0 0 0 .2  0 0 0 .18 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>");
  box-shadow:0 7px 0 #b69a6a,0 16px 40px rgba(20,10,40,.45);outline:2px dashed rgba(32,48,122,.28);outline-offset:-9px}
#shOv h2{margin:0;font-size:20px;letter-spacing:.28em;text-align:center;color:#ec6f55}
#shOv h3{margin:0;font-size:13px;letter-spacing:.24em;text-align:center;color:#8a5a12}
#shOv p{margin:0;font-size:15px;line-height:1.45;text-align:center}
#shOv .felt{height:54px;width:100%;flex:none;font-size:16px}
#shOv .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#shOv .row2 .felt{font-size:14px}
#shOv .nt{display:flex;gap:12px;align-items:center;background:rgba(255,250,240,.75);border-radius:16px;padding:10px 12px;box-shadow:0 2px 0 #d9c8a2}
#shOv .nt i{flex:0 0 34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 15px system-ui,sans-serif;font-style:normal;background:#e3d4b2;color:#6a5a72}
#shOv .nt.open i{background:radial-gradient(circle at 40% 38%,#ffd36a,#e0a224 60%,#9a5a12);color:#2b1e3c}
#shOv .nt.now{outline:3px solid #2c53c4}
#shOv .nt b{display:block;font-size:14px;letter-spacing:.08em} #shOv .nt small{display:block;font-size:13px;color:#5a4f6a;margin-top:2px}
#shOv .bar{height:12px;border-radius:8px;background:#e3d4b2;overflow:hidden} #shOv .bar u{display:block;height:100%;background:#e0a224;border-radius:8px}
#shOv .scroll{position:relative;height:min(50vh,320px);overflow:hidden;-webkit-mask-image:linear-gradient(#0000,#000 15%,#000 85%,#0000);mask-image:linear-gradient(#0000,#000 15%,#000 85%,#0000)}
#shOv .roll{position:absolute;left:0;right:0;top:0;text-align:center;animation:shRoll 26s linear infinite}
#shOv .roll p{margin:0 0 22px;font-size:15px;letter-spacing:.12em;line-height:1.5} #shOv .roll small{display:block;font-size:12px;letter-spacing:.28em;opacity:.7}
#shOv .roll .big{font-size:28px;letter-spacing:.3em;color:#e9a62c;text-shadow:0 2px 0 #9b5c16;font-weight:700}
@keyframes shRoll{from{transform:translateY(min(50vh,320px))}to{transform:translateY(-100%)}}
#shOv .night{text-align:center} #shOv .night .big{font-size:30px;letter-spacing:.18em;color:#2c53c4;font-weight:800;line-height:1.15}
#shOv .sunrow{display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
#shOv .sunrow i{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#ffd36a,#e0a224 60%,#9a5a12)}
#shOv .price{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#shOv .price div{background:#2b1e3c;color:#ffe1a8;border-radius:16px;padding:10px;text-align:center;font:800 13px system-ui,sans-serif;letter-spacing:.12em}
#shOv .price b{display:block;font-size:20px;letter-spacing:.04em;color:#fff3dc;margin-top:3px}
#qtSheet button.shLock{opacity:.55;background:#3a2c4c!important;position:relative}
#qtSheet button.shLock small.shL{opacity:1!important;color:#f6b23a}
/* title settings: one label column for every row, BACK always on screen, two columns on short landscape */
#titleScr .panel .modes{grid-template-columns:78px repeat(4,1fr)!important}
#titleScr .panel .modes span{margin-right:0}
#titleScr .panel[data-p=settings] label{grid-template-columns:78px 1fr 3.4em!important;gap:6px}
#titleScr .panel[data-p=settings]{scroll-padding-bottom:70px}
#titleScr .panel[data-p=settings] .bBack{position:sticky;bottom:0;z-index:2;flex:none}
@media (orientation:landscape) and (max-height:500px){
  #titleScr .panel[data-p=settings]{display:grid!important;grid-template-columns:1fr 1fr;column-gap:24px;row-gap:8px;padding-top:20px!important;align-content:start;width:min(94vw,800px)!important;max-height:calc(100% - 20px)!important}
  #titleScr .panel[data-p=settings]>h2,#titleScr .panel[data-p=settings]>.bBack{grid-column:1/-1}
  #titleScr .panel[data-p=settings]>.modes,#titleScr .panel[data-p=settings]>label,#titleScr .panel[data-p=settings]>.note{grid-column:1}
  #titleScr .panel[data-p=settings]>.shBox{grid-column:2;grid-row:2/span 4;align-self:start}
  #titleScr .panel[data-p=settings]>.note{padding:8px 10px;line-height:1.35}
}
#shOv .nts{display:flex;flex-direction:column;gap:8px}
/* Nights: the list scrolls inside the card; the buttons sit in a footer under it (never stacked over WATCH THE ENDING) */
#shOv .card[data-v=nights]{overflow:hidden}
#shOv .card[data-v=nights]>*{flex:none}
#shOv .card[data-v=nights]>.nts{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:3px;margin:-3px}
#shOv .ntFoot{display:flex;flex-direction:column;gap:10px}
#shOv .nts.more{-webkit-mask-image:linear-gradient(#000 calc(100% - 30px),#0000);mask-image:linear-gradient(#000 calc(100% - 30px),#0000)}
#shOv .ntBtns{display:flex;flex-direction:column;gap:10px}
#shOv .card>.felt[data-a=back],#shOv .card>.felt[data-a=close]{position:sticky;bottom:0;z-index:2}
@media (orientation:landscape) and (max-height:500px){
  #shOv .card[data-v=settings],#shOv .card[data-v=nights]{width:min(94vw,800px)}
  #shOv .card[data-v=settings] .shRows{display:grid;grid-template-columns:1fr 1fr;column-gap:24px;row-gap:8px;align-items:center}
  #shOv .card[data-v=settings] .shRows>:nth-child(-n+3){grid-column:1}
  #shOv .card[data-v=settings] .shRows>:nth-child(1){grid-row:1} #shOv .card[data-v=settings] .shRows>:nth-child(2){grid-row:2} #shOv .card[data-v=settings] .shRows>:nth-child(3){grid-row:3}
  #shOv .card[data-v=settings] .shRows>:nth-child(n+4){grid-column:2}
  #shOv .card[data-v=settings] .shRows>:nth-child(8){grid-column:1;grid-row:4}
  #shOv .card[data-v=settings] .shRows>:nth-child(9){grid-column:1;grid-row:5} #shOv .card[data-v=settings] .shRows>:nth-child(10){grid-column:2;grid-row:5}
  #shOv .card[data-v=settings] .shNote{margin:0}
  #shOv .nts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px} #shOv .nts>.nt:last-child:nth-child(3n+1){grid-column:1/-1}
  #shOv .card[data-v=nights]{padding:14px 18px 12px;gap:8px}
  #shOv .card[data-v=nights] h2{font-size:18px} #shOv .card[data-v=nights]>p{font-size:13px;line-height:1.3}
  #shOv .card[data-v=nights] .nts{align-content:start}
  #shOv .card[data-v=nights] .nt{padding:7px 10px;gap:10px} #shOv .card[data-v=nights] .nt i{flex-basis:28px;height:28px;font-size:13px}
  #shOv .card[data-v=nights] .nt b{font-size:13px} #shOv .card[data-v=nights] .nt small{font-size:12px;line-height:1.25}
  #shOv .ntBtns.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #shOv .card[data-v=nights] .ntBtns .felt{height:46px;font-size:14px}
  #shOv .card[data-v=nights] .nt{padding:7px 10px} #shOv .card[data-v=nights] .nt i{flex-basis:30px;height:30px;font-size:14px}
}
@media (orientation:landscape) and (max-height:500px){#shOv .card{width:min(76vw,560px);padding:14px 18px 12px;gap:8px} #shOv .felt{height:48px} #shOv .scroll{height:52vh}}
`;
document.head.appendChild(css);

// ------------------------------------------------------------------ settings UI (shared by title + pause)
function seg(label, key, opts, cur) {
  return `<div class="shSeg" style="--n:${opts.length}" data-set="${key}"><span>${label}</span>${opts.map(([v, t]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
}
function qualityNote() { const d = quality.detected; return quality.auto ? `Auto picked ${TIERS[quality.tier].label} for this ${d.phone ? 'phone' : 'computer'}.` : `Set to ${TIERS[quality.tier].label}. Auto would pick ${TIERS[d.tier].label}.`; }
function settingsHTML(withAudio) {
  const S = getSettings(), A = window.__audio || {};
  let h = '<div class="shRows">';
  if (withAudio) {
    h += seg('SOUND', 'snd', [['off', 'OFF'], ['sound', 'SFX'], ['music', 'MUSIC'], ['all', 'ALL']], A.mode || 'all');
    const mv = Math.round((Number.isFinite(A.musicVol) ? A.musicVol : 1) * 100), sv = Math.round((Number.isFinite(A.sfxVol) ? A.sfxVol : 1) * 100);
    h += `<label class="shSlider">MUSIC<input type="range" min="0" max="100" value="${mv}" data-vol="music" style="--v:${mv}%"><output>${mv}%</output></label>`;
    h += `<label class="shSlider">SFX<input type="range" min="0" max="100" value="${sv}" data-vol="sfx" style="--v:${sv}%"><output>${sv}%</output></label>`;
  }
  h += seg('QUALITY', 'quality', [['auto', 'AUTO'], ['high', 'HIGH'], ['medium', 'MED'], ['low', 'LOW']], S.quality);
  h += `<div class="shNote" data-qn>${qualityNote()}</div>`;
  h += seg('TEXT', 'textSize', [['m', 'A'], ['l', 'A+'], ['xl', 'A++']], S.textSize);
  h += seg('INVERT', 'invert', [['off', 'OFF'], ['x', 'X'], ['y', 'Y'], ['both', 'BOTH']], S.invert === true ? 'y' : (S.invert || 'off'));
  h += seg('PERF', 'fps', [['off', 'OFF'], ['on', 'ON']], S.fps || 'off');
  h += `<div class="shSeg shSave" style="--n:1" data-set="save"><span>SAVE</span><button data-v="reset">RESET SAVE…</button></div>`;
  return h + '</div>';
}
function wireSettings(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.shSeg button'); if (!b) return; const row = b.closest('.shSeg'), k = row.dataset.set, v = b.dataset.v;
    if (k === 'save') {   // two-step: RESET SAVE… -> ERASE? YES / NO
      if (v === 'reset') { row.style.setProperty('--n', 2); row.innerHTML = '<span>ERASE?</span><button data-v="yes" class="shDanger">YES, ERASE</button><button data-v="no">KEEP</button>'; row.insertAdjacentHTML('afterend', '<div class="shNote shSaveNote">Erases every Sunspot, Night and mission. Settings stay. This cannot be undone.</div>'); sfx(); return; }
      if (v === 'yes') { sfx('sfx_ui_confirm'); resetSave(); return; }
      row.style.setProperty('--n', 1); row.innerHTML = '<span>SAVE</span><button data-v="reset">RESET SAVE…</button>'; row.nextElementSibling?.classList.contains('shSaveNote') && row.nextElementSibling.remove(); return; }
    if (k === 'snd') window.__audio?.setMode?.(v); else setSetting(k, v);
    for (const o of row.querySelectorAll('button')) { o.classList.toggle('on', o === b); o.setAttribute('aria-pressed', o === b); }
    const qn = root.querySelector('[data-qn]'); if (qn) qn.textContent = qualityNote();
    if (v !== 'off') sfx();
  });
  root.addEventListener('input', (e) => { const i = e.target.closest('input[data-vol]'); if (!i) return; i.style.setProperty('--v', i.value + '%'); i.nextElementSibling.textContent = i.value + '%'; window.__audio?.setVolumes?.({ [i.dataset.vol]: i.value / 100 }); });
}

// ------------------------------------------------------------------ the manual (manualview.js, loaded on the first tap only)
function openManual(onClose) { import('./manualview.js').then((m) => m.openManual({ onClose })).catch((e) => console.warn('manual', e)); }

// ------------------------------------------------------------------ title menu: CONTINUE / NEW GAME / SETTINGS / CREDITS
const T = document.getElementById('titleScr');
const CREDITS_HTML = creditsHTML();   // credits.js (CREATOR_NAME lives there)
if (T) {
  const roll = T.querySelector('.roll'); if (roll) roll.innerHTML = CREDITS_HTML;
  const menu = T.querySelector('.menu'), play = T.querySelector('.bPlay'), row = T.querySelector('.menu .row');
  const save = savedTown();
  if (save && play && menu) {
    const n = (() => { const c = save.sun ? Object.keys(save.sun).length : 0; let k = 1; for (const N of FALLBACK_NIGHTS) if (c >= N.need && !(DEMO && N.n > 1)) k = N.n; return [k, c]; })();
    play.firstChild.textContent = 'CONTINUE';
    const info = document.createElement('div'); info.className = 'saveInfo'; info.textContent = `NIGHT ${n[0]} · ${n[1]} ☀ SUNSPOTS`; menu.insertBefore(info, play); menu.classList.add('shTall');
    const nb = document.createElement('button'); nb.className = 'felt cream bNew'; nb.textContent = 'NEW GAME'; menu.insertBefore(nb, row);
    const panel = document.createElement('div'); panel.className = 'panel'; panel.dataset.p = 'newgame';
    panel.innerHTML = `<h2>NEW GAME</h2><p>Start over from 1:57 AM?<br>Your Sunspots, errands and records on this device will be erased.</p><button class="felt coral bWipe">ERASE AND START</button><button class="felt cream bBack">KEEP MY SAVE</button>`;
    T.appendChild(panel);
    nb.addEventListener('click', () => { sfx(); for (const p of T.querySelectorAll('.panel')) p.classList.toggle('open', p === panel); T.classList.add('paneled'); });
    panel.querySelector('.bWipe').addEventListener('click', () => { sfx('sfx_ui_confirm'); wipeSave(); try { sessionStorage.setItem('sunspots.autoplay', '1'); } catch (_) {} const q = new URLSearchParams(location.search); q.delete('fresh'); location.search = q.toString(); });
  } else if (play) play.firstChild.textContent = 'NEW GAME';
  if (menu && row) { const mb = document.createElement('button'); mb.className = 'felt cream bMan'; mb.textContent = 'MANUAL'; menu.insertBefore(mb, row.nextSibling); mb.addEventListener('click', () => { sfx(); openManual(); }); }
  if (DEMO && menu) { const d = document.createElement('div'); d.className = 'saveInfo'; d.textContent = 'FREE DEMO · NIGHT 1'; menu.appendChild(d); menu.classList.add('shTall'); }
  // extra settings rows in the title's settings panel (its own sound rows stay)
  const sp = T.querySelector('.panel[data-p=settings]');
  if (sp) { const note = sp.querySelector('.note'); const box = document.createElement('div'); box.className = 'shBox'; box.innerHTML = settingsHTML(false); sp.insertBefore(box, note || sp.querySelector('.bBack')); wireSettings(box);
    if (note) note.innerHTML = '<b>CAMERA</b> &middot; Drag the sky to look. Hold the eye button for the Wolf&#8217;s eyes; in the car, tap it for the chase view.'; }
  if (AUTOPLAY && play) setTimeout(() => play.click(), 50);
}

// ------------------------------------------------------------------ overlay (pause, nights, settings, credits, night card, demo end)
const ov = document.createElement('div'); ov.id = 'shOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.innerHTML = '<div class="card"></div>'; document.body.appendChild(ov);
for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend']) ov.addEventListener(ev, (e) => e.stopPropagation());
const card = ov.querySelector('.card');
wireSettings(card);
let view = null, onClose = null;
function show(v, html) { view = v; card.dataset.v = v; card.innerHTML = html; ov.classList.add('on'); card.scrollTop = 0; }
function hide() { ov.classList.remove('on'); view = null; const f = onClose; onClose = null; f?.(); }
card.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]'); if (!b) return; const a = b.dataset.a; sfx();
  if (a === 'resume') resume(); else if (a === 'nights') nightsView(); else if (a === 'settings') settingsView(); else if (a === 'credits') creditsView(); else if (a === 'manual') openManual();
  else if (a === 'back') pauseView(); else if (a === 'menu') { show('quit', `<h2>MAIN MENU</h2><p>Your game saves as you play. Head back to the title?</p><button class="felt coral" data-a="quit">YES, MAIN MENU</button><button class="felt cream" data-a="back">KEEP PLAYING</button>`); }
  else if (a === 'quit') { try { window.__journal && window.__town?.M?.save?.(); } catch (_) {} const q = new URLSearchParams(location.search); for (const k of ['fresh', 'menu', 'intro', 'pause', 'room']) q.delete(k); q.set('intro', '0'); location.search = q.toString(); }
  else if (a === 'close') hide();
  else if (a === 'ending') { resume(); setTimeout(() => playFinale(), 250); }   // NIGHTS > WATCH THE ENDING (after you've seen it once)
});
const paused = () => !!window.__paused;
function pause(v = 'pause') {
  if (!paused()) { window.__paused = true; document.body.classList.add('shell-paused'); try { window.__audio?.ctx?.suspend?.(); } catch (_) {} for (const vd of document.querySelectorAll('video')) if (!vd.paused && !vd.closest('#intro')) { vd.dataset.shPaused = '1'; vd.pause(); } }
  onClose = resumeNow; if (v === 'pause') pauseView(); else if (v === 'nights') nightsView();
}
function resumeNow() { if (!paused()) return; window.__paused = false; document.body.classList.remove('shell-paused'); try { window.__audio?.ctx?.resume?.(); } catch (_) {} for (const vd of document.querySelectorAll('video[data-sh-paused]')) { delete vd.dataset.shPaused; vd.play().catch(() => {}); } }
function resume() { hide(); }
function pauseView() {
  const n = night(), c = count(), tt = total(), N = NIGHTS()[n], nx = N && !(DEMO && N.n > 1) ? `${Math.max(0, N.need - c)} more ☀ opens Night ${N.n}` : (DEMO ? 'Free demo: Night 1' : 'Every Night is open');
  show('pause', `<h2>PAUSED</h2><h3>${esc(nightName(n))}</h3><p>${c}${tt ? ' of ' + tt : ''} ☀ Sunspots · ${esc(nx)}</p>
    <button class="felt mustard" data-a="resume">RESUME</button><div class="row2"><button class="felt cobalt" data-a="nights">NIGHTS</button><button class="felt coral" data-a="settings">SETTINGS</button></div>
    <div class="row3"><button class="felt cream" data-a="credits">CREDITS</button><button class="felt cream" data-a="manual">MANUAL</button><button class="felt cream" data-a="menu">MAIN MENU</button></div>
    <small class="build" style="display:block;margin-top:10px;opacity:.55;font-size:11px;letter-spacing:.06em">build ${esc(window.__build || '?')} · ${esc(window.__quality?.t?.label || '')} · ${(window.__sunspots?.renderer?.getPixelRatio?.() || 0).toFixed(2)}x</small>`);
}
function nightsView() {
  const c = count(), cur = night();
  const rows = NIGHTS().map((N) => { const open = nightOpen(N.n), lockDemo = DEMO && N.n > 1; const [num, ...rest] = N.name.split(' · ');
    return `<div class="nt${open ? ' open' : ''}${N.n === cur ? ' now' : ''}"><i>${open ? N.n : '🔒'}</i><div><b>${esc(rest.join(' · ') || num)}</b><small>${lockDemo ? 'Full game' : open ? 'Open · ' + esc(N.opens) : `${N.need} ☀ to open · ${esc(N.opens)}`}</small></div></div>`; }).join('');
  const nx = NIGHTS()[cur]; const pct = nx && !(DEMO) ? Math.min(100, Math.round(100 * (c - NIGHTS()[cur - 1].need) / Math.max(1, nx.need - NIGHTS()[cur - 1].need))) : 100;
  show('nights', `<h2>NIGHTS</h2><p>${c} ☀ Sunspots found. Every errand, game and secret leaves one.</p><div class="bar"><u style="width:${pct}%"></u></div><div class="nts">${rows}</div>
    <div class="ntFoot">${DEMO ? `<p>Seven Nights in the full game. Your save carries over.</p>` : ''}<div class="ntBtns${loadP().finaleSeen ? ' two' : ''}">${loadP().finaleSeen ? '<button class="felt mustard" data-a="ending">WATCH THE ENDING</button>' : ''}<button class="felt cream" data-a="${paused() ? 'back' : 'close'}">BACK</button></div></div>`);
  const L = card.querySelector('.nts'), more = () => L.isConnected && L.classList.toggle('more', L.scrollTop + L.clientHeight < L.scrollHeight - 2);   // fade the last row when the list scrolls
  L.addEventListener('scroll', more, { passive: true }); requestAnimationFrame(more); if (!nightsView.rs) { nightsView.rs = 1; addEventListener('resize', () => { if (view === 'nights') { const l = card.querySelector('.nts'); l?.dispatchEvent(new Event('scroll')); } }); }
}
function settingsView() { show('settings', `<h2>SETTINGS</h2>${settingsHTML(true)}<button class="felt cream" data-a="back">BACK</button>`); }
function creditsView() { show('credits', `<h2>CREDITS</h2><div class="scroll"><div class="roll">${CREDITS_HTML}</div></div><button class="felt cream" data-a="back">BACK</button>`); }
function nightCard(n) {
  const N = NIGHTS()[n - 1]; const [num, ...rest] = N.name.split(' · ');
  try { window.__audio?.ui?.('confirm'); } catch (_) {}
  pause('card');
  show('night', `<div class="night"><h3>A NEW NIGHT</h3><div class="big">${esc(num)}</div><p style="margin-top:6px"><b>${esc(rest.join(' · '))}</b></p></div>
    <div class="sunrow">${'<i></i>'.repeat(Math.min(12, Math.max(1, N.need)))}</div><p>Now open: ${esc(N.opens)}. Check the journal for what&#8217;s new tonight.</p>
    <button class="felt mustard" data-a="resume">LET&#8217;S GO</button>`);
}
function demoCard() {
  pause('card');
  show('demo', `<h2>END OF THE DEMO</h2><p>That&#8217;s Night 1. Six more Nights, the Neon Strip, the Mansion, the Fair after dark and Grandma&#8217;s cat are in the full game.</p>
    <div class="price"><div>PHONE<b>${esc(PRICE.phone)}</b></div><div>DESKTOP<b>${esc(PRICE.desktop)}</b></div></div>
    <p>One price. No ads. No loot boxes. Your save carries into the full game.</p>
    <button class="felt mustard" data-a="resume">KEEP EXPLORING NIGHT 1</button><button class="felt cream" data-a="menu">MAIN MENU</button>`);
}

// pause button + keys + background
const pb = document.createElement('button'); pb.id = 'shPauseBtn'; pb.setAttribute('aria-label', 'Pause'); document.body.appendChild(pb);
pb.addEventListener('pointerdown', (e) => e.stopPropagation());
pb.addEventListener('click', (e) => { e.stopPropagation(); sfx(); pause(); });
addEventListener('keydown', (e) => { if (!playing()) return; if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !document.querySelector('#qtSheet.on,#jnSheet.on')) { e.preventDefault(); if (ov.classList.contains('on')) { if (view === 'pause' || view === 'night' || view === 'demo') resume(); else if (paused()) pauseView(); else hide(); } else pause(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing() && !paused() && !Q.has('nobgpause') && !document.body.classList.contains('finale')) pause(); });
const playing = () => !!window.__ready && !window.__titleUp && !document.body.classList.contains('intro');

// GO sheet: districts open with their Night
function lockGo() {
  const sh = document.getElementById('qtSheet'); if (!sh || sh.dataset.shWired) return; sh.dataset.shWired = '1';
  sh.addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (!b) return; const n = KEY_NIGHT(b.dataset.k); if (nightOpen(n)) return;
    e.stopImmediatePropagation(); e.preventDefault(); const N = NIGHTS()[n - 1];
    window.__sunspots?.level?.toast?.(DEMO ? `Night ${n} is in the full game.` : `Opens on Night ${n} at ${N.need} ☀ Sunspots. You can still walk there.`, 3.5); }, true);
  const mark = () => { for (const b of sh.querySelectorAll('button[data-k]')) { const n = KEY_NIGHT(b.dataset.k), open = nightOpen(n); b.classList.toggle('shLock', !open);
    let l = b.querySelector('small.shL'); if (!open) { if (!l) { l = document.createElement('small'); l.className = 'shL'; b.appendChild(l); } l.textContent = DEMO && n > 1 ? '🔒 FULL GAME' : `🔒 NIGHT ${n} · ${NIGHTS()[n - 1].need} ☀`; } else l?.remove(); } };
  new MutationObserver(() => { if (sh.classList.contains('on')) mark(); }).observe(sh, { attributes: true, attributeFilter: ['class'] }); mark();
}

// Night gates for the missions that are not on missions/kit.js (kit missions ask nightOpen() themselves): wrap the
// "play" entry in their room so every way in (chip, tapping the character, T.talk) gets a polite "not tonight" instead.
const ROOM_GATES = [['ram', 'swimlesson', 3, 'RAM'], ['taco', 'brawl', 2, 'BEAR']];
setInterval(() => { const T = window.__town; if (!T?.rooms) return;
  for (const [room, id, n, who] of ROOM_GATES) { const w = T.rooms[room]?.who?.find?.((o) => o.id === id); if (!w || w._shGate) continue; const orig = w.talk; w._shGate = true;
    w.talk = (...a) => nightOpen(n) ? orig.apply(w, a) : [[who, 'Not tonight.'], ['', lockLine(n)]]; }
}, 400);

// progress loop: Night cards, demo end, pause button visibility
let lastNight = 0;
const CARDS = !navigator.webdriver || new URLSearchParams(location.search).has('cards');
setInterval(() => { document.body.classList.toggle('shell-play', playing());
  // portrait: keep the errand list (town.js #townObj) just under the HUD as the HUD's lines wrap and change
  const to = document.getElementById('townObj'), hd = document.getElementById('hud');
  if (to && hd && innerHeight > innerWidth && !document.body.classList.contains('room') && to.textContent) { const r = hd.getBoundingClientRect(); if (r.height) { const t = Math.round(r.bottom + 8) + 'px'; if (to.style.top !== t) to.style.top = t; } }
}, 250);
setInterval(() => {
  if (!playing()) return;
  lockGo();
  if (!window.__journal) return;
  const P = loadP(), n = night();
  if (!P.night) { P.night = n; saveP(P); lastNight = n; return; }   // first look at this save: no fanfare for Nights it already had
  const busy = paused() || ov.classList.contains('on') || /\b(scene|ended|map|room|driving)\b/.test(document.body.className) || document.querySelector('#jnSheet.on,#qtSheet.on,#cine');
  if (!CARDS) { if (n > P.night) { P.night = n; saveP(P); } return; }   // automated test runs (navigator.webdriver) skip the pausing cards; ?cards=1 brings them back
  if (n > P.night && !busy) { P.night = n; saveP(P); nightCard(n); return; }
  if (!DEMO && !busy && !document.body.classList.contains('msn') && maybeFinale()) return;   // finale.js: Night 7 done -> the ending
  if (!DEMO && !busy && P.finaleSeen && checkPerfect()) return;   // free roam: 100% card, once
  if (DEMO && !P.demoEnd && !busy && (count() >= (NIGHTS()[1]?.need || 2) || window.__town?.M?.S?.snacks)) { P.demoEnd = 1; saveP(P); demoCard(); }
  lastNight = n;
}, 1000);
if (Q.get('pause')) { const go = () => playing() ? pause(Q.get('pause') === 'nights' ? 'nights' : 'pause') : setTimeout(go, 300); go(); }

// ------------------------------------------------------------------ PWA: installable, starts offline (scope /next/)
if ('serviceWorker' in navigator && !Q.has('nosw') && location.protocol !== 'file:') addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((e) => console.info('sw', e?.message)); });

window.__shell = { NIGHTS, night, count, nightOpen, lockLine, nightName, demo: DEMO, price: PRICE, pause, resume, nightsView: () => pause('nights'), settings: () => { pause(); settingsView(); }, credits: () => { pause(); creditsView(); }, nightCard, demoCard, wipeSave, resetSave, finale: () => playFinale(), keyNight: KEY_NIGHT };
