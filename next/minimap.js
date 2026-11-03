// run 12: the corner map. A round felt patch (north up) drawn from the real townscape grid + collision boxes:
// the Wolf (arrow) or the car he's in, every door, the games, errand targets (pulsing !), his own car, the ride, the bus.
// Tap it -> full map (pan / pinch / +-). Tap a place on the full map -> GO quick travel (on foot). BRING MY CAR parks it nearby.
import { PAL } from './townscape.js';

const ROOMS = ['bowl', 'court', 'crow', 'diner', 'dmv', 'drivein', 'gecko', 'heron', 'ksun', 'laundromat', 'living90', 'lynx', 'motel', 'pool', 'poolhall', 'post', 'thrift', 'wolf', 'yard'];
const GAMES = { bowl: 1, poolhall: 1, court: 1, living90: 1 };
const HOMES = { wolf: 1, living90: 1, lynx: 1, crow: 1, heron: 1, gecko: 1, ram: 1, anteater: 1, mansion: 1, farm: 1, moth: 1, apt_vict: 1, apt_pink: 1 };
const FELT = ['#ead8c7', '#e6ddce', '#ecddc8', '#f8f1e7', '#d8d2c6', '#e9dcd3', '#f0c887', '#e2cdb3'];
const NAME_OF = { wolf: 'Home', apt_vict: 'Victorian apts', apt_pink: 'Pink apts', moth: "Moth's place" };

export function createMinimap({ TS, level, wolfState, QT, town, audio }) {
  const S = PAL.street, G = TS.GRID;
  const X0 = -245, X1 = 65, Z0 = -145, Z1 = 145, PPM = 3;
  const css = document.createElement('style');
  css.textContent = `
  #mmap{position:fixed;z-index:5;right:calc(env(safe-area-inset-right) + 14px);top:calc(env(safe-area-inset-top) + 108px);width:104px;height:104px;border-radius:50%;
    box-shadow:0 4px 0 #b78f62,0 8px 18px rgba(40,20,10,.3);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;display:none}
  #mmap canvas{width:100%;height:100%;display:block;border-radius:50%}
  #mmap .n{position:absolute;left:50%;top:-7px;transform:translateX(-50%);font:800 9px Futura,Avenir,sans-serif;color:#3a2418;background:#f6b23a;border-radius:7px;padding:1px 4px;pointer-events:none}
  body.driving #mmap{top:calc(env(safe-area-inset-top) + 132px);right:calc(env(safe-area-inset-right) + 12px)}
  @media (orientation:landscape){#mmap{width:96px;height:96px} body.driving #mmap{top:calc(env(safe-area-inset-top) + 66px);right:calc(env(safe-area-inset-right) + 14px)}}
  @media (orientation:portrait) and (max-height:720px){#mmap{width:76px;height:76px;top:calc(env(safe-area-inset-top) + 102px)}}
  body.room #mmap,body.scene #mmap,body.map #mmap,body.ended #mmap,body.intro #mmap{display:none!important}
  #fmap{position:fixed;inset:0;z-index:41;background:#2b1e3c;display:none;touch-action:none;color:#fff3dc;font:700 13px Futura,Avenir,system-ui,sans-serif}
  #fmap.on{display:block} #fmap canvas{position:absolute;inset:0;width:100%;height:100%}
  #fmap .bar{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 10px) 8px calc(env(safe-area-inset-left) + 10px);display:flex;gap:8px;align-items:center;
    background:linear-gradient(#2b1e3cee,#2b1e3c00);pointer-events:none}
  #fmap .bar>*{pointer-events:auto} #fmap h2{margin:0 auto 0 4px;font-size:13px;letter-spacing:.24em;color:#f6b23a}
  #fmap button{border:0;border-radius:14px;min-width:44px;height:40px;padding:0 12px;font:800 13px Futura,Avenir,system-ui,sans-serif;letter-spacing:.08em;background:#4a3560;color:#fff3dc;box-shadow:0 3px 0 #120a1c}
  #fmap button:active{transform:translateY(2px);box-shadow:0 1px 0 #120a1c} #fmap button.car{background:#e8806a;color:#3a1418;box-shadow:0 3px 0 #a5483c} #fmap button.x{background:#6a2c3c}
  #fmap .msg{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);max-width:86vw;text-align:center;background:#2b1e3ce6;border-radius:14px;padding:8px 14px;
    font-size:12px;letter-spacing:.06em;line-height:1.35;pointer-events:none;transition:opacity .3s}
  `;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- base: the town, drawn once (felt patches with stitches)
  const base = document.createElement('canvas'); base.width = (X1 - X0) * PPM; base.height = (Z1 - Z0) * PPM;
  { const g = base.getContext('2d'), P = (x, z) => [(x - X0) * PPM, (z - Z0) * PPM];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#e3c79b'; g.fillRect(0, 0, base.width, base.height);
    const [wx0, wz0, wx1, wz1] = G.walkRect; { const [a, b] = P(wx0, wz0), [c, d] = P(wx1, wz1); g.fillStyle = '#e9d1a8'; g.fillRect(a, b, c - a, d - b); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(170,120,70,.13)' : 'rgba(255,245,225,.22)'; g.fillRect(rnd() * base.width, rnd() * base.height, 1 + rnd() * 2, 1 + rnd() * 2); }
    const rect = (x0, z0, x1, z1, col) => { const [a, b] = P(Math.min(x0, x1), Math.min(z0, z1)), [c, d] = P(Math.max(x0, x1), Math.max(z0, z1)); g.fillStyle = col; g.fillRect(a, b, c - a, d - b); };
    const W = 3.5;
    for (const s of G.ew) rect(s.x0, s.z - s.hw - W, s.x1, s.z + s.hw + W, S.walk);
    for (const s of G.ns) rect(s.x - s.hw - W, s.z0, s.x + s.hw + W, s.z1, S.walk);
    for (const s of G.ew) rect(s.x0, s.z - s.hw, s.x1, s.z + s.hw, S.asphalt);
    for (const s of G.ns) rect(s.x - s.hw, s.z0, s.x + s.hw, s.z1, S.asphalt);
    g.fillStyle = S.dash;
    for (const s of G.ew) for (let x = s.x0 + 2; x < s.x1 - 3; x += 6) { if (G.ns.some(n => Math.abs(x + 1.5 - n.x) < n.hw + 3 && s.z >= n.z0 && s.z <= n.z1)) continue; rect(x, s.z - 0.3, x + 3, s.z + 0.3, S.dash); }
    for (const s of G.ns) for (let z = s.z0 + 2; z < s.z1 - 3; z += 6) { if (G.ew.some(e => Math.abs(z + 1.5 - e.z) < e.hw + 3 && s.x >= e.x0 && s.x <= e.x1)) continue; rect(s.x - 0.3, z, s.x + 0.3, z + 3, S.dash); }
    // buildings: felt patches in their own wall colour, drop shadow + a stitched edge
    const boxes = (TS.boxes || []).filter(b => (b.x1 - b.x0) * (b.z1 - b.z0) > 0.8).sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0));
    for (const b of boxes) { const [a, c] = P(b.x0, b.z0), [d, e] = P(b.x1, b.z1); g.fillStyle = 'rgba(80,45,25,.22)'; g.fillRect(a + 3, c + 3, d - a, e - c); }
    for (const b of boxes) {
      const [a, c] = P(b.x0, b.z0), [d, e] = P(b.x1, b.z1), pal = PAL[b.name], small = (b.x1 - b.x0) * (b.z1 - b.z0) < 6;
      let h = 0; for (const ch of String(b.name)) h = (h * 31 + ch.charCodeAt(0)) | 0;
      g.fillStyle = small ? '#9a7a5c' : (pal?.wall || pal?.siding || pal?.house || FELT[Math.abs(h) % FELT.length]); g.fillRect(a, c, d - a, e - c);
      if (!small && d - a > 8 && e - c > 8) { g.save(); g.strokeStyle = 'rgba(90,55,35,.55)'; g.lineWidth = 1.2; g.setLineDash([3, 2.5]); g.strokeRect(a + 2.5, c + 2.5, d - a - 5, e - c - 5); g.restore(); }
    }
  }

  // ---------------------------------------------------------------- places
  const doorPos = (k) => { if (k === 'fence') return { x: -86.5, z: 18.5 }; if (k === 'bus') { const s = TS.busStops?.[0]; return s && { x: s.x, z: s.z }; } const d = TS.doors?.[k] || (TS.spots?.[k]?.map && TS.spots[k]); return d && { x: d.x, z: d.z }; };
  const names = {}; for (const [, l] of QT.PLACES || []) for (const [k, n] of l) names[k] = n;
  Object.assign(names, NAME_OF, { fence: "Crow's collection" }); for (const [k, v] of Object.entries(TS.spots || {})) if (v.map && !names[k]) names[k] = v.map;
  const places = [...Object.keys(TS.doors || {}), ...Object.keys(TS.spots || {}).filter(k => TS.spots[k].map && !TS.doors[k])].map(k => ({ k, ...doorPos(k), name: names[k] || k, room: ROOMS.includes(k), game: !!GAMES[k], home: !!HOMES[k], spot: !TS.doors?.[k] && !!TS.spots?.[k]?.map }));
  const targets = () => { const o = []; try { for (const t of town?.targets?.() || []) { const p = doorPos(t.k); if (p) o.push({ ...p, k: t.k, title: t.title }); } } catch (_) {}
    if (level.mode === 'drive' && !level.ended && level.MAIN) { const s = level.MAIN.s, e = s[s.length - 1]; o.push({ x: e.x, z: e.z, k: 'store', title: 'SNACKS' }); }
    return o; };

  // ---------------------------------------------------------------- shared drawing
  const roadPts = (p) => p?.s || [];
  function drawWorld(g, cx, cz, k, w, h, opts = {}) {   // k = screen px per metre; (cx,cz) at the screen centre
    const sx = (x) => w / 2 + (x - cx) * k, sy = (z) => h / 2 + (z - cz) * k;
    g.fillStyle = '#e3c79b'; g.fillRect(0, 0, w, h);
    // the long road to the store (outside the base image), drawn as felt ribbons
    for (const [p, col, wd] of [[level.SHORT, '#7a706a', 6], [level.MAIN, S.asphalt, 8]]) { const s = roadPts(p); if (!s.length) continue;
      g.strokeStyle = col; g.lineWidth = Math.max(2, wd * k); g.lineCap = g.lineJoin = 'round'; g.beginPath(); s.forEach((q, i) => i ? g.lineTo(sx(q.x), sy(q.z)) : g.moveTo(sx(q.x), sy(q.z))); g.stroke(); }
    const r = k / PPM; g.save(); g.imageSmoothingEnabled = true; g.drawImage(base, sx(X0), sy(Z0), base.width * r, base.height * r); g.restore();
    return { sx, sy };
  }
  function glyph(g, x, y, s, kind, col) {
    g.save(); g.translate(x, y);
    if (kind === 'home') { g.fillStyle = col || '#8a6a4a'; g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s); g.lineTo(s, 0); g.lineTo(s * 0.7, 0); g.lineTo(s * 0.7, s * 0.8); g.lineTo(-s * 0.7, s * 0.8); g.lineTo(-s * 0.7, 0); g.closePath(); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = Math.max(1, s * 0.22); g.stroke(); }
    else if (kind === 'game') { g.fillStyle = col || '#d83f47'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.45 : s; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = Math.max(1, s * 0.2); g.stroke(); }
    else if (kind === 'car' || kind === 'ride') { g.fillStyle = kind === 'car' ? '#e8806a' : '#f6b23a'; g.strokeStyle = '#3a2418'; g.lineWidth = Math.max(1, s * 0.2);
      g.beginPath(); g.roundRect ? g.roundRect(-s, -s * 0.62, s * 2, s * 1.24, s * 0.5) : g.rect(-s, -s * 0.62, s * 2, s * 1.24); g.fill(); g.stroke();
      g.fillStyle = '#3a2418'; for (const ox of [-0.55, 0.55]) { g.beginPath(); g.arc(ox * s, s * 0.7, s * 0.28, 0, 7); g.fill(); } }
    else if (kind === 'bus') { g.fillStyle = '#2f7a58'; g.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6); g.fillStyle = '#fff3dc'; g.font = `800 ${Math.round(s * 1.2)}px Futura,Avenir,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', 0, s * 0.08); }
    else { g.fillStyle = col || '#4a3560'; g.beginPath(); g.arc(0, 0, s * 0.72, 0, 7); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = Math.max(1, s * 0.22); g.stroke(); }
    g.restore();
  }
  function arrow(g, x, y, s, yaw, col = '#e8806a') {   // the Wolf: a felt arrow-head (north up, -z up): screen angle = PI - yaw
    g.save(); g.translate(x, y); g.rotate(Math.PI - yaw); g.fillStyle = 'rgba(40,20,10,.3)'; g.beginPath(); g.arc(1, 2, s * 1.05, 0, 7); g.fill();
    g.fillStyle = '#fff3dc'; g.beginPath(); g.arc(0, 0, s * 1.02, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(0, -s * 0.95); g.lineTo(s * 0.68, s * 0.6); g.lineTo(0, s * 0.28); g.lineTo(-s * 0.68, s * 0.6); g.closePath(); g.fill(); g.restore();
  }
  const player = () => {
    if (level.solo) return { x: level.free.pos.x, z: level.free.pos.z, yaw: level.free.yaw, car: 'car' };
    if (level.inCar || level.mode === 'drive') return { x: level.car.pos.x, z: level.car.pos.z, yaw: level.car.yaw, car: 'ride' };
    return { x: wolfState.pos.x, z: wolfState.pos.z, yaw: wolfState.yaw };
  };
  const freeOn = () => !!level.free?.root?.visible && !level.solo;
  const rideOn = () => level.mode === 'walk' && !level.ended && !!level.car;

  // ---------------------------------------------------------------- the corner patch
  const wrap = document.createElement('div'); wrap.id = 'mmap'; wrap.innerHTML = '<canvas></canvas><span class="n">N</span>'; document.body.appendChild(wrap);
  const mc = wrap.querySelector('canvas'), mg = mc.getContext('2d');
  let acc = 1, pulse = 0, zoomK = 1.6, shown = false;
  function drawMini() {
    const css = wrap.clientWidth || 104, dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(css * dpr);
    if (mc.width !== W) { mc.width = mc.height = W; }
    const p = player(), sp = level.solo ? Math.abs(level.free.v) : level.inCar ? Math.abs(level.car.v || 0) : 0;
    const want = (level.solo || level.inCar ? 1.15 - Math.min(0.45, sp * 0.025) : 1.7) * dpr * css / 104; zoomK += (want - zoomK) * 0.25;
    const g = mg; g.save(); g.clearRect(0, 0, W, W); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip();
    const { sx, sy } = drawWorld(g, p.x, p.z, zoomK, W, W), R = W / 2 - 9 * dpr, s = 5.2 * dpr;
    const inView = (x, y) => Math.hypot(x - W / 2, y - W / 2) < R;
    for (const pl of places) { const x = sx(pl.x), y = sy(pl.z); if (!inView(x, y)) continue; glyph(g, x, y, s * (pl.room || pl.spot ? 0.9 : 0.7), pl.game ? 'game' : pl.home ? 'home' : 'room', pl.spot ? '#c9a24a' : pl.room ? null : '#a08c7a'); }
    const bus = TS.busStops?.[0]; if (bus && inView(sx(bus.x), sy(bus.z))) glyph(g, sx(bus.x), sy(bus.z), s * 0.75, 'bus');
    const edge = (x, y, col, kind) => { if (inView(x, y)) { glyph(g, x, y, s, kind); return; } const a = Math.atan2(y - W / 2, x - W / 2), ex = W / 2 + Math.cos(a) * R, ey = W / 2 + Math.sin(a) * R;
      g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(s * 1.1, 0); g.lineTo(-s * 0.6, -s * 0.8); g.lineTo(-s * 0.6, s * 0.8); g.closePath(); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = dpr; g.stroke(); g.restore(); };
    if (rideOn()) edge(sx(level.car.pos.x), sy(level.car.pos.z), '#f6b23a', 'ride');
    if (freeOn()) edge(sx(level.free.pos.x), sy(level.free.pos.z), '#e8806a', 'car');
    for (const t of targets()) { const x = sx(t.x), y = sy(t.z), pr = 1 + 0.25 * Math.sin(pulse * 5);
      if (inView(x, y)) { g.strokeStyle = '#d83f47'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(x, y, s * 1.6 * pr, 0, 7); g.stroke(); g.fillStyle = '#d83f47'; g.font = `900 ${Math.round(s * 2)}px Futura,Avenir,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', x, y + dpr); }
      else { const a = Math.atan2(y - W / 2, x - W / 2), ex = W / 2 + Math.cos(a) * R, ey = W / 2 + Math.sin(a) * R; g.fillStyle = '#d83f47'; g.beginPath(); g.arc(ex, ey, s * 1.05 * pr, 0, 7); g.fill(); g.fillStyle = '#fff3dc'; g.font = `900 ${Math.round(s * 1.5)}px Futura,Avenir,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', ex, ey + dpr); } }
    if (p.car) { g.save(); g.translate(W / 2, W / 2); g.rotate(Math.PI - p.yaw); glyph(g, 0, 0, s * 1.15, p.car); g.fillStyle = '#3a2418'; g.beginPath(); g.moveTo(0, -s * 1.9); g.lineTo(s * 0.55, -s * 1.15); g.lineTo(-s * 0.55, -s * 1.15); g.closePath(); g.fill(); g.restore(); }
    else arrow(g, W / 2, W / 2, s * 1.25, p.yaw);
    g.restore();
    // felt rim: a stitched ring
    g.save(); g.lineWidth = 6 * dpr; g.strokeStyle = '#c99a63'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 3 * dpr, 0, 7); g.stroke();
    g.lineWidth = 1.2 * dpr; g.setLineDash([3 * dpr, 2.5 * dpr]); g.strokeStyle = '#fff3dc'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 3 * dpr, 0, 7); g.stroke(); g.restore();
    MM.last = { x: p.x, z: p.z, yaw: p.yaw, car: p.car || null, t: performance.now() };
  }
  wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  wrap.addEventListener('click', (e) => { e.stopPropagation(); open(); });

  // ---------------------------------------------------------------- the full map
  const fm = document.createElement('div'); fm.id = 'fmap';
  fm.innerHTML = '<canvas></canvas><div class="bar"><h2>SUNSPOTS · MAP</h2><button class="car" data-a="car">BRING MY CAR</button><button data-a="zo">−</button><button data-a="zi">+</button><button class="x" data-a="x">✕</button></div><div class="msg"></div>';
  document.body.appendChild(fm);
  if (!level.summonFree) fm.querySelector('button.car').style.display = 'none';   // older builds without the free car
  const fc = fm.querySelector('canvas'), fg = fc.getContext('2d'), msgEl = fm.querySelector('.msg');
  const V = { cx: -90, cz: 0, k: 2, hits: [] };
  let msgT = 0; const say = (t, sec = 3) => { msgEl.textContent = t; msgEl.style.opacity = 1; msgT = sec; };
  function fit() { const w = fm.clientWidth || innerWidth, h = fm.clientHeight || innerHeight; const [x0, z0, x1, z1] = G.walkRect;
    V.k = Math.min(w / (x1 - x0 + 10), (h - 70) / (z1 - z0 + 10)); V.cx = (x0 + x1) / 2; V.cz = (z0 + z1) / 2 - 22 / V.k; }
  function drawFull() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = fm.clientWidth, h = fm.clientHeight; if (!w) return;
    if (fc.width !== Math.round(w * dpr) || fc.height !== Math.round(h * dpr)) { fc.width = Math.round(w * dpr); fc.height = Math.round(h * dpr); }
    const g = fg; g.setTransform(dpr, 0, 0, dpr, 0, 0); const { sx, sy } = drawWorld(g, V.cx, V.cz, V.k, w, h);
    const hits = V.hits = [], taken = [];
    const label = (x, y, t, pri, col = '#2b1e3c') => { g.font = `${pri ? 800 : 700} ${pri ? 12 : 11}px Futura,Avenir,sans-serif`; const tw = g.measureText(t).width + 10, r = [x - tw / 2, y + 9, tw, 17];
      if (taken.some(q => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3])) return; taken.push(r);
      g.fillStyle = col === '#2b1e3c' ? 'rgba(255,243,220,.92)' : col; g.beginPath(); g.roundRect ? g.roundRect(r[0], r[1], r[2], r[3], 8) : g.rect(...r); g.fill();
      g.fillStyle = col === '#2b1e3c' ? col : '#fff3dc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 18); };
    const s = Math.max(6, Math.min(11, V.k * 3));
    const P = player(), T = targets();
    // priority labels first: targets, cars, then rooms, then homes
    for (const t of T) { const x = sx(t.x), y = sy(t.z); g.strokeStyle = '#d83f47'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * 1.7 * (1 + 0.2 * Math.sin(pulse * 5)), 0, 7); g.stroke(); label(x, y + 6, '! ' + t.title, 1, '#d83f47'); hits.push({ x, y, k: t.k === 'store' ? null : t.k }); }
    if (freeOn()) { const x = sx(level.free.pos.x), y = sy(level.free.pos.z); glyph(g, x, y, s * 1.2, 'car'); label(x, y, 'YOUR CAR', 1, '#c45a48'); hits.push({ x, y, car: 1 }); }
    if (rideOn()) { const x = sx(level.car.pos.x), y = sy(level.car.pos.z); glyph(g, x, y, s * 1.1, 'ride'); label(x, y, 'THE RIDE', 1, '#b87420'); hits.push({ x, y, k: 'bus' }); }
    for (const pl of [...places].sort((a, b) => (b.room - a.room) || (b.game - a.game))) { const x = sx(pl.x), y = sy(pl.z); if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      glyph(g, x, y, s * (pl.room || pl.spot ? 1 : 0.8), pl.game ? 'game' : pl.home ? 'home' : 'room', pl.spot ? '#c9a24a' : pl.room ? null : '#a08c7a'); label(x, y, pl.name, 0); hits.push({ x, y, k: pl.k }); }
    const bus = TS.busStops?.[0]; if (bus) { const x = sx(bus.x), y = sy(bus.z); glyph(g, x, y, s, 'bus'); hits.push({ x, y, k: 'bus' }); }
    const px = sx(P.x), py = sy(P.z);
    if (P.car) { g.save(); g.translate(px, py); g.rotate(Math.PI - P.yaw); glyph(g, 0, 0, s * 1.4, P.car); g.restore(); } else arrow(g, px, py, s * 1.5, P.yaw);
    g.font = '800 11px Futura,Avenir,sans-serif'; g.fillStyle = '#d83f47'; g.textAlign = 'center'; g.fillText('YOU', px, py - s * 2.1);
    // the felt edge
    g.strokeStyle = 'rgba(255,243,220,.5)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.strokeRect(8, 8, w - 16, h - 16); g.setLineDash([]);
  }
  function open() { if (fm.classList.contains('on')) return; fm.classList.add('on'); document.body.classList.add('fullmap'); fit(); const p = player(); if (!G.walkRect || !TS.inTown(p.x, p.z, 0)) { V.cx = p.x; V.cz = p.z; }
    msgEl.style.opacity = 1; msgEl.textContent = level.mode === 'walk' ? 'Tap a place to GO there.' : level.solo ? 'Driving: GET OUT to use GO. Or just drive there.' : 'Riding with the moth.'; msgT = 3; audio?.ui?.('confirm'); drawFull(); }
  function close() { fm.classList.remove('on'); document.body.classList.remove('fullmap'); }
  function tap(x, y) {
    let best = null, bd = 26; for (const h of V.hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
    if (!best) return;
    if (level.mode !== 'walk' || level.frozen || town?.active) { say(level.solo ? 'Park first: GET OUT, then tap a place.' : 'Not now. Finish the ride first.'); return; }
    if (best.car) { const c = level.free, lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw), x2 = c.pos.x + lx * 2.6, z2 = c.pos.z + lz * 2.6; close(); QT.jump({ x: x2, z: z2, yaw: Math.atan2(-lx, -lz) }); return; }
    if (best.k && QT.where(best.k)) { close(); QT.go(best.k); }
  }
  fm.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const a = b.dataset.a;
    if (a === 'x') close();
    else if (a === 'zi' || a === 'zo') { V.k = Math.max(0.35, Math.min(9, V.k * (a === 'zi' ? 1.4 : 1 / 1.4))); }
    else if (a === 'car') { if (level.solo) say("You're in it."); else if (level.mode !== 'walk' || level.frozen) say('Not now.'); else if (level.summonFree(wolfState.pos.x, wolfState.pos.z)) { say('Your car is parked on the nearest street.'); audio?.ui?.('confirm'); } } });
  const ptrs = new Map(); let downAt = null, pinch0 = null;
  fc.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { fc.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) downAt = { x: e.clientX, y: e.clientY, moved: 0 }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), k: V.k }; downAt = null; } });
  fc.addEventListener('pointermove', (e) => { const q = ptrs.get(e.pointerId); if (!q) return; const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY;
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; V.k = Math.max(0.35, Math.min(9, pinch0.k * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(10, pinch0.d))); return; }
    V.cx -= dx / V.k; V.cz -= dy / V.k; if (downAt) downAt.moved += Math.abs(dx) + Math.abs(dy); });
  const up = (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
    if (e.type === 'pointerup' && downAt && downAt.moved < 10 && ptrs.size === 0) { const r = fc.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); } if (!ptrs.size) downAt = null; };
  fc.addEventListener('pointerup', up); fc.addEventListener('pointercancel', up);
  fc.addEventListener('wheel', (e) => { e.preventDefault(); V.k = Math.max(0.35, Math.min(9, V.k * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (fm.classList.contains('on')) drawFull(); });

  // ---------------------------------------------------------------- per frame
  const MM = {
    open, close, toggle() { if (fm.classList.contains('on')) close(); else if (shown) open(); },
    get isOpen() { return fm.classList.contains('on'); }, get shown() { return shown; }, view: V, places, targets, player, tap, last: null,
    update(dt, tw) {
      pulse += dt; const b = document.body.classList;
      const ok = !window.__titleUp && !(tw || town)?.active && !b.contains('scene') && !b.contains('ended') && !b.contains('map') && !b.contains('intro') && ['walk', 'solo', 'drive'].includes(level.mode);
      if (ok !== shown) { shown = ok; wrap.style.display = ok ? 'block' : 'none'; if (!ok) close(); }
      if (fm.classList.contains('on')) { drawFull(); if (msgT > 0 && (msgT -= dt) <= 0) msgEl.style.opacity = 0; return; }
      if (!shown) return;
      acc += dt; if (acc < 1 / 15) return; acc = 0; drawMini();
    },
  };
  return MM;
}
