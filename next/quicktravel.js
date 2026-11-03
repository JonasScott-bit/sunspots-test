// run 11: quick travel for the real-scale town. A GO pill under WILD opens a phone-friendly sheet of places;
// pick one → short fade → the Wolf stands outside that door, facing it. Walk mode only (hidden in rooms, scenes, driving, map).
export function createQuickTravel({ TS, level, wolfState, LAYOUT, onJump }) {
  const css = document.createElement('style');
  css.textContent = `#qtBtn{position:fixed;top:calc(env(safe-area-inset-top) + 64px);right:calc(env(safe-area-inset-right) + 14px);z-index:5;border:0;border-radius:22px;padding:9px 16px;
    font:800 13px/1 system-ui,sans-serif;letter-spacing:.12em;background:#2b1e3c;color:#ffe1a8;box-shadow:0 4px 0 #120a1c;-webkit-tap-highlight-color:transparent;display:none}
  #qtBtn:active{transform:translateY(3px);box-shadow:0 1px 0 #120a1c}
  #qtSheet{position:fixed;left:0;right:0;bottom:0;z-index:40;max-height:72vh;overflow:auto;background:#2b1e3cf2;color:#fff3dc;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom) + 14px);
    font:700 14px system-ui,sans-serif;transform:translateY(105%);transition:transform .22s ease;box-shadow:0 -6px 30px #0008}
  #qtSheet.on{transform:none} #qtSheet h3{margin:2px 4px 10px;font-size:12px;letter-spacing:.2em;color:#f6b23a}
  #qtSheet .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  #qtSheet button{min-height:52px;border:0;border-radius:12px;background:#4a3560;color:#fff3dc;font:700 14px system-ui,sans-serif;text-align:left;padding:8px 12px}
  #qtSheet button small{display:block;font-weight:500;font-size:11px;opacity:.7;margin-top:2px} #qtSheet button.x{background:#6a2c3c;text-align:center;margin-top:10px;width:100%}
  #qtFade{position:fixed;inset:0;background:#1a1024;opacity:0;pointer-events:none;z-index:39;transition:opacity .25s}
  body.scene #qtBtn,body.map #qtBtn{display:none!important}`;
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'qtBtn'; btn.textContent = 'GO ▸'; document.body.appendChild(btn);
  const fade = document.createElement('div'); fade.id = 'qtFade'; document.body.appendChild(fade);
  const sheet = document.createElement('div'); sheet.id = 'qtSheet'; document.body.appendChild(sheet);
  const PLACES = [
    ['Main St', [['bus', 'Bus stop', 'ride pickup'], ['diner', 'Diner'], ['laundromat', 'Laundromat'], ['post', 'Post Office'], ['dmv', 'DMV'], ['thrift', 'Thrift'], ['ksun', 'KSUN'], ['yard', "Crow's Yard"], ['moth', "Moth's place", 'apartment row']]],
    ['Neon Strip', [['bowl', 'Gutter Bowl'], ['motel', 'Motel'], ['pool', 'Motel Pool'], ['drivein', 'Drive-in'], ['poolhall', 'Pool Hall', 'eight-ball'], ['court', 'The Court', 'hoops']]],
    ['Homes', [['wolf', 'Home', "the Wolf's"], ['living90', "Bear's"], ['lynx', "Lynx's"], ['crow', "Crow's"], ['heron', "Heron's"], ['gecko', "Gecko's"], ['ram', "Ram's"], ['anteater', "Anteater's"], ['mansion', 'The Mansion', 'Vulture + Larry Byrd'], ['farm', 'The Farm']]],
  ];
  const where = (k) => {
    if (k === 'fence') return { x: -86.5, z: 18.5, yaw: 0 };   // run 12: the Crow's collection by the road
    if (k === 'bus') { const s = TS.busStops?.[0]; return s ? { x: s.x - 2.2, z: s.z + 1.6, yaw: Math.PI / 2 } : null; }
    const d = TS.doors[k]; if (!d) return null; const ry = d.ry || 0, out = 2.2;
    return { x: d.x + Math.sin(ry) * out, z: d.z + Math.cos(ry) * out, yaw: ry + Math.PI };
  };
  sheet.innerHTML = PLACES.map(([h, l]) => `<h3>${h.toUpperCase()}</h3><div class="g">` + l.filter(([k]) => where(k)).map(([k, n, s]) => `<button data-k="${k}">${n}${s ? `<small>${s}</small>` : ''}</button>`).join('') + '</div>').join('') + '<button class="x">NEVER MIND</button>';
  const close = () => sheet.classList.remove('on');
  btn.addEventListener('click', (e) => { e.stopPropagation(); sheet.classList.toggle('on'); });
  sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
  sheet.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.classList.contains('x')) { close(); return; } go(b.dataset.k); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  function go(k) {
    const w = where(k); if (!w) return; close(); jump(w);
  }
  function jump(w) {   // run 12: also used by the map (stand by the car, etc.)
    fade.style.opacity = 1;
    setTimeout(() => { wolfState.pos.set(w.x, 0, w.z); wolfState.yaw = w.yaw; wolfState.speed = 0; onJump?.(w.yaw); setTimeout(() => { fade.style.opacity = 0; }, 120); }, 260);
  }
  return {
    go, jump, where, PLACES, close, update(town) { const ok = level.mode === 'walk' && !level.frozen && !town?.active && !window.__titleUp; btn.style.display = ok ? 'block' : 'none'; if (!ok) close(); },
  };
}
