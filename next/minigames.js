// minigames.js — Sunspots · run 11 (M4): two phone-first mini games that plug into town.js the same way the bowling lane does
// (an object with .scene/.camera/.update/.end that town.js swaps in as T.lane).
//   createPool  — Rack 'Em Lanes / pool hall: felt nine-ball, top-down. Drag back from the white ball (slingshot), let go to shoot.
//   createHoops — the chain-link court: AROUND THE WORLD vs Larry Byrd. Drag up from the ball; release in the green band.
// Pure-JS 2D/3D physics, no libraries; everything procedural felt/clay (no GLBs). ~4k tris (pool) / ~9k tris (hoops).
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ------------------------------------------------------------------ shared DOM (one overlay, styled like the lane UI)
let UI = null;
function ui() {
  if (UI) return UI;
  const css = document.createElement('style');
  css.textContent = `
  #mgUI{position:fixed;inset:0;z-index:9;display:none;font-family:Futura,Avenir,sans-serif;color:#fff3dc;-webkit-user-select:none;user-select:none}
  body.mg #mgUI{display:block} body.mg #roomUI,body.mg #townObj{display:none!important}
  body.mg #sceneSub{bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:10}
  #mgPad{position:absolute;inset:0;touch-action:none}
  #mgTop{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 52px);text-align:center;font:700 13px Futura,Avenir,sans-serif;letter-spacing:.16em;text-shadow:0 1px 5px rgba(0,0,0,.8);pointer-events:none}
  #mgTop b{display:block;font:700 clamp(26px,7vw,40px) "Brush Script MT","Snell Roundhand",cursive;letter-spacing:0;color:#ffd9c0;text-shadow:0 0 12px #e0705a,0 2px 4px rgba(0,0,0,.6)}
  #mgTray{margin-top:4px;display:flex;justify-content:center;gap:4px;min-height:16px} #mgTray i{width:14px;height:14px;border-radius:50%;box-shadow:inset -2px -2px 0 rgba(0,0,0,.28)}
  #mgExit{position:absolute;right:10px;top:calc(env(safe-area-inset-top) + 10px);border:0;border-radius:999px;padding:9px 14px;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.14em;color:#3a1f2a;background:#fff3dc;box-shadow:0 3px 0 #b9a58a}
  #mgHint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 22px);text-align:center;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.14em;text-shadow:0 1px 5px rgba(0,0,0,.85);pointer-events:none;transition:opacity .3s}
  #mgMeter{position:absolute;right:16px;top:30%;width:18px;height:40%;border-radius:9px;background:rgba(20,12,10,.55);box-shadow:0 0 0 2px #fff3dc;display:none;overflow:hidden}
  #mgMeter u{position:absolute;left:0;right:0;background:rgba(126,201,122,.55)} #mgMeter s{position:absolute;left:0;right:0;bottom:0;background:#ffc98a}
  #mgBig{position:absolute;left:0;right:0;top:40%;text-align:center;font:700 clamp(38px,11vw,80px) "Brush Script MT","Snell Roundhand",cursive;color:#ffd04a;text-shadow:0 4px 0 #b8332e,0 8px 20px rgba(0,0,0,.5);opacity:0;transform:scale(.6) rotate(-6deg);transition:opacity .2s,transform .35s;pointer-events:none}
  #mgBig.on{opacity:1;transform:scale(1) rotate(-6deg)}
  #mgPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(84vw,360px);padding:18px 16px 16px;border-radius:14px;background:#3a2418;box-shadow:0 0 0 4px #e0705a,0 12px 30px rgba(0,0,0,.5);text-align:center;display:none}
  #mgPanel.on{display:block} #mgPanel h3{margin:0 0 4px;font:700 34px "Brush Script MT","Snell Roundhand",cursive;color:#ffd9c0} #mgPanel p{margin:0 0 12px;font-size:12px;letter-spacing:.12em;line-height:1.5;color:#efe2c4}
  #mgPanel button{display:block;width:100%;margin:8px 0 0;border:0;border-radius:999px;padding:13px;font:700 14px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:#ffc98a;box-shadow:0 4px 0 #c27b45}
  #mgPanel button.alt{background:#efe2c4;box-shadow:0 4px 0 #b9a58a}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'mgUI';
  el.innerHTML = '<div id="mgPad"></div><div id="mgTop"></div><button id="mgExit">DONE</button><div id="mgMeter"><u></u><s></s></div><div id="mgHint"></div><div id="mgBig"></div><div id="mgPanel"></div>';
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  let owner = null, bigT = 0;
  UI = { el, pad: $('#mgPad'), top: $('#mgTop'), exit: $('#mgExit'), hint: $('#mgHint'), meter: $('#mgMeter'), big: $('#mgBig'), panel: $('#mgPanel'),
    claim(o) { owner = o; document.body.classList.add('mg'); UI.panel.classList.remove('on'); UI.meter.style.display = 'none'; },
    release(o) { if (owner === o) { owner = null; document.body.classList.remove('mg'); } },
    owner: () => owner,
    flash(txt, small = '') { UI.big.innerHTML = txt + (small ? `<small style="display:block;font:700 15px Futura,Avenir,sans-serif;letter-spacing:.2em;color:#fff3dc">${small}</small>` : ''); UI.big.classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => UI.big.classList.remove('on'), 1100); },
    showPanel(h, p, btns) { UI.panel.innerHTML = `<h3>${h}</h3><p>${p}</p>` + btns.map((b, i) => `<button data-i="${i}" class="${b.alt ? 'alt' : ''}">${b.t}</button>`).join('');
      UI.panel.querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); UI.panel.classList.remove('on'); btns[+b.dataset.i].f(); }); UI.panel.classList.add('on'); },
  };
  UI.exit.addEventListener('click', (e) => { e.stopPropagation(); owner?.leave(); });
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) UI.pad.addEventListener(ev, (e) => owner?.pointer(ev, e));
  return UI;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function speckle(g, w, h, base, n = 1600, a = 0.07) { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
function tris(o) { let n = 0; o.traverse(m => { if (m.isMesh && m.geometry) { const g = m.geometry, c = g.index ? g.index.count : g.attributes.position.count; n += c / 3 * (m.isInstancedMesh ? m.count : 1); } }); return Math.round(n); }

// ================================================================== POOL — felt nine-ball
export const POOL = { L: 2.24, W: 1.12, R: 0.034 };
const BALLC = ['#f3efe2', '#f2c230', '#2f55a8', '#c9382e', '#6a3f8a', '#e07a2e', '#2f7a4a', '#7a2a2a', '#231f22', '#f2c230'];

export function poolSim() {   // pure: balls [{x,z,vx,vz,in}], step(dt) -> events
  const { L, W, R } = POOL, hx = L / 2, hz = W / 2;
  const pockets = [[-hx - 0.012, -hz - 0.012, 0.072], [hx + 0.012, -hz - 0.012, 0.072], [-hx - 0.012, hz + 0.012, 0.072], [hx + 0.012, hz + 0.012, 0.072], [0, -hz - 0.03, 0.066], [0, hz + 0.03, 0.066]];
  const S = { balls: [], pockets, ev: [] };
  S.rack = () => { S.balls = [{ n: 0, x: -L / 4, z: 0, vx: 0, vz: 0, in: false }]; const fx = L / 4, d = R * 2.02, rows = [1, 2, 3, 2, 1]; let n = 1;
    const order = [1, 2, 3, 9, 4, 5, 6, 7, 8]; let k = 0;
    rows.forEach((c, r) => { for (let i = 0; i < c; i++) { const nn = order[k++]; S.balls.push({ n: nn, x: fx + r * d * 0.866, z: (i - (c - 1) / 2) * d + (Math.random() - 0.5) * 0.001, vx: 0, vz: 0, in: false }); n++; } }); };
  S.moving = () => S.balls.some(b => !b.in && (b.vx * b.vx + b.vz * b.vz) > 1e-6);
  S.cue = () => S.balls[0];
  S.respot = () => { const c = S.cue(); c.in = false; c.vx = c.vz = 0; c.x = -L / 4; c.z = 0;
    for (let tries = 0; tries < 40 && S.balls.some(b => b !== c && !b.in && Math.hypot(b.x - c.x, b.z - c.z) < 2.2 * R); tries++) c.x -= R * 1.2; };
  S.shoot = (ang, pow) => { const c = S.cue(), v = 0.35 + pow * 3.6; c.vx = Math.cos(ang) * v; c.vz = Math.sin(ang) * v; S.first = null; };
  S.step = (dt) => {
    const n = 8, h = dt / n;
    for (let s = 0; s < n; s++) {
      for (const b of S.balls) { if (b.in) continue; const sp = Math.hypot(b.vx, b.vz); if (sp < 1e-4) { b.vx = b.vz = 0; continue; }
        const ns = Math.max(0, sp - (0.55 + sp * 0.18) * h); b.vx *= ns / sp; b.vz *= ns / sp; b.x += b.vx * h; b.z += b.vz * h;
        let nearP = false; for (const [px, pz, pr] of pockets) { const d = Math.hypot(b.x - px, b.z - pz); if (d < pr) { b.in = true; b.vx = b.vz = 0; S.ev.push({ t: 'sink', n: b.n }); break; } if (d < pr + 0.07) nearP = true; }
        if (b.in || nearP) continue;
        if (b.x > hx - R) { b.x = hx - R; b.vx = -Math.abs(b.vx) * 0.78; S.ev.push({ t: 'rail' }); } if (b.x < -hx + R) { b.x = -hx + R; b.vx = Math.abs(b.vx) * 0.78; S.ev.push({ t: 'rail' }); }
        if (b.z > hz - R) { b.z = hz - R; b.vz = -Math.abs(b.vz) * 0.78; S.ev.push({ t: 'rail' }); } if (b.z < -hz + R) { b.z = -hz + R; b.vz = Math.abs(b.vz) * 0.78; S.ev.push({ t: 'rail' }); } }
      for (let i = 0; i < S.balls.length; i++) { const a = S.balls[i]; if (a.in) continue;
        for (let j = i + 1; j < S.balls.length; j++) { const b = S.balls[j]; if (b.in) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 >= 4 * R * R || d2 < 1e-12) continue;
          const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = 2 * R - d; a.x -= nx * ov / 2; a.z -= nz * ov / 2; b.x += nx * ov / 2; b.z += nz * ov / 2;
          const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; if (rel <= 0) continue; const im = rel * 0.975;
          a.vx -= im * nx; a.vz -= im * nz; b.vx += im * nx; b.vz += im * nz;
          if (S.first == null && (a.n === 0 || b.n === 0)) S.first = a.n === 0 ? b.n : a.n; S.ev.push({ t: 'click', v: rel }); } }
    }
    const e = S.ev; S.ev = []; return e;
  };
  S.rack(); return S;
}

export function createPool(ctx) {
  const { feltMat, audio = {}, say, onDone, onLeave } = ctx;
  const { L, W, R } = POOL;
  const P = { active: false, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 30), sim: poolSim(), shots: 0, scratches: 0, best: +(localStorage.getItem('ss_pool_best') || 0) || null };
  const sc = P.scene; sc.background = new THREE.Color('#1c1412'); sc.fog = new THREE.Fog('#1c1412', 4, 9);
  sc.add(new THREE.HemisphereLight('#ffe9c8', '#2a1a14', 0.75));
  const lamp = new THREE.SpotLight('#ffe2b0', 22, 6, 0.95, 0.55, 1.4); lamp.position.set(0, 2.2, 0); lamp.target.position.set(0, 0, 0); sc.add(lamp, lamp.target);
  // table: felt bed (canvas: worn nap + head string + spots), rails, diamonds, pockets, legs, the hanging green lamp
  const bedTex = canvasTex(512, 256, (g, w, h) => { speckle(g, w, h, '#2f7d5a', 2600, 0.06); const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, 'rgba(255,240,200,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 4, 0); g.lineTo(w / 4, h); g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; [[w / 4, h / 2], [w * 3 / 4, h / 2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(w * 0.3, h * 0.6, 40, 22, 0.4, 0, 7); g.fill(); });   // a spilled-something stain
  const bed = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.05, W + 0.06), new THREE.MeshStandardMaterial({ map: bedTex, roughness: 1 })); bed.position.y = -0.025; bed.receiveShadow = true; sc.add(bed);
  const wood = feltMat('#6b3a22'), cush = feltMat('#256a4b'), blk = new THREE.MeshStandardMaterial({ color: '#0c0908', roughness: 1 });
  const rail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), wood); m.position.set(x, 0.01, z); sc.add(m); };
  rail(L + 0.36, 0.14, 0, -W / 2 - 0.1); rail(L + 0.36, 0.14, 0, W / 2 + 0.1); rail(0.14, W + 0.06, -L / 2 - 0.1, 0); rail(0.14, W + 0.06, L / 2 + 0.1, 0);
  const cu = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), cush); m.position.set(x, 0.012, z); sc.add(m); };
  const seg = L / 2 - 0.13; cu(seg, 0.04, -L / 4 - 0.005, -W / 2 - 0.015); cu(seg, 0.04, L / 4 + 0.005, -W / 2 - 0.015); cu(seg, 0.04, -L / 4 - 0.005, W / 2 + 0.015); cu(seg, 0.04, L / 4 + 0.005, W / 2 + 0.015);
  cu(0.04, W - 0.14, -L / 2 - 0.015, 0); cu(0.04, W - 0.14, L / 2 + 0.015, 0);
  const dia = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), new THREE.MeshStandardMaterial({ color: '#efe2c4', roughness: 0.8 }), 18); { const m4 = new THREE.Matrix4(); let i = 0;
    for (const s of [-1, 1]) { for (const f of [-3, -2, -1, 1, 2, 3]) { m4.setPosition(f * L / 8, 0.05, s * (W / 2 + 0.1)); dia.setMatrixAt(i++, m4); } for (const f of [-1, 0, 1]) { m4.setPosition(s * (L / 2 + 0.1), 0.05, f * W / 4); dia.setMatrixAt(i++, m4); } } } sc.add(dia);
  for (const [px, pz] of P.sim.pockets) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 14), blk); m.position.set(px, 0.035, pz); sc.add(m); }
  const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.8, 0.16), wood, 4); { const m4 = new THREE.Matrix4(); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => { m4.setPosition(a * (L / 2 - 0.05), -0.45, b * (W / 2 - 0.05)); legs.setMatrixAt(i, m4); }); } sc.add(legs);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#7a2a2a' : '#d9c9a4'; g.fillRect(x * 32, y * 32, 32, 32); } speckle(g, w, h, 'rgba(0,0,0,0)', 900, 0.05); }), roughness: 1 }));
  floor.material.map.wrapS = floor.material.map.wrapT = THREE.RepeatWrapping; floor.material.map.repeat.set(5, 5); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.85; sc.add(floor);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 0.22, 16, 1, true), feltMat('#2f6a4a', { side: THREE.DoubleSide })); shade.position.set(0, 1.55, 0); shade.visible = false; sc.add(shade);   // the top-down camera sits above the shade; it read as a big green disc over the table, so it's hidden in-game
  // balls: matte clay; the 9 is a stripe (canvas band)
  const geo = new THREE.SphereGeometry(R, 16, 12), meshes = [];
  for (let n = 0; n <= 9; n++) { let mat;
    if (n === 9) mat = new THREE.MeshStandardMaterial({ roughness: 0.55, map: canvasTex(64, 32, (g, w, h) => { g.fillStyle = '#f3efe2'; g.fillRect(0, 0, w, h); g.fillStyle = BALLC[9]; g.fillRect(0, h * 0.3, w, h * 0.4); g.fillStyle = '#f3efe2'; g.beginPath(); g.arc(w * 0.25, h / 2, 4, 0, 7); g.fill(); }) });
    else mat = new THREE.MeshStandardMaterial({ color: BALLC[n], roughness: 0.55 });
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; sc.add(m); meshes[n] = m; }
  // cue stick + aim guide
  const cue = new THREE.Group(); { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.013, 1.3, 8), feltMat('#d9b47a')); sh.rotation.z = Math.PI / 2; sh.position.x = -0.65; cue.add(sh);
    const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.015, 0.36, 8), feltMat('#3a1f2a')); bt.rotation.z = Math.PI / 2; bt.position.x = -1.12; cue.add(bt);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), feltMat('#5a8fd0')); tip.rotation.z = Math.PI / 2; tip.position.x = -0.01; cue.add(tip); } cue.visible = false; sc.add(cue);
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.008), new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0.55 })); guide.rotation.x = -Math.PI / 2; guide.visible = false; sc.add(guide);
  const ghost = new THREE.Mesh(new THREE.RingGeometry(R * 0.85, R, 20), new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0.7 })); ghost.rotation.x = -Math.PI / 2; ghost.visible = false; sc.add(ghost);
  P.tris = tris(sc);

  const U = ui(); let aim = null, phase = 'idle', leaveCb = null;
  const sync = () => { for (const b of P.sim.balls) { const m = meshes[b.n]; m.visible = !b.in; m.position.set(b.x, R, b.z); } };
  const left = () => P.sim.balls.filter(b => b.n > 0 && !b.in).length;
  const hud = () => { U.top.innerHTML = `<b>Nine-Ball</b>SHOTS ${P.shots} · LEFT ${left()}${P.best ? ' · BEST ' + P.best : ''}<div id="mgTray">${P.sim.balls.filter(b => b.n > 0 && b.in).map(b => `<i style="background:${b.n === 9 ? 'linear-gradient(#f3efe2 30%,#f2c230 30% 70%,#f3efe2 70%)' : BALLC[b.n]}"></i>`).join('')}</div>`; };
  function fit() {
    const a = innerWidth / innerHeight, port = a < 1, cam = P.camera; cam.aspect = a; const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const longS = (L / 2 + 0.3) * 1.0, shortS = (W / 2 + 0.3);
    // portrait: long axis runs up the screen; leave room for the HUD (top) and hint (bottom)
    const needV = (port ? longS : shortS) * 1.32, needH = port ? shortS : longS;
    const h = Math.max(needV / t, needH / (t * a)); cam.up.set(port ? 1 : 0, 0, port ? 0 : -1); cam.position.set(0, h, port ? 0 : 0.0001 + h * 0.06); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -R), v2 = new THREE.Vector2(), hit = new THREE.Vector3();
  const toTable = (e) => { v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, P.camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; };
  function aimFrom(p) { const c = P.sim.cue(); const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz); if (d < 1e-3) return null; return { ang: Math.atan2(dz, dx), pow: clamp((d - 0.04) / 0.62, 0, 1) }; }
  function drawAim() { const c = P.sim.cue(); if (!aim) { cue.visible = guide.visible = ghost.visible = false; U.meter.style.display = 'none'; return; }
    const ca = Math.cos(aim.ang), sa = Math.sin(aim.ang); cue.visible = true; cue.position.set(c.x - ca * (R + 0.02 + aim.pow * 0.22), R + 0.01, c.z - sa * (R + 0.02 + aim.pow * 0.22)); cue.rotation.set(0, -aim.ang, 0.02);
    // first contact along the line (ball or cushion)
    let tMin = 3; for (const b of P.sim.balls) { if (b.n === 0 || b.in) continue; const ox = b.x - c.x, oz = b.z - c.z, proj = ox * ca + oz * sa; if (proj <= 0) continue; const perp2 = ox * ox + oz * oz - proj * proj, rr = 4 * R * R; if (perp2 > rr) continue; const t = proj - Math.sqrt(rr - perp2); if (t < tMin) tMin = t; }
    let ghostOn = tMin < 3; const hx = L / 2 - R, hz = W / 2 - R; const tx = ca > 0 ? (hx - c.x) / ca : ca < 0 ? (-hx - c.x) / ca : 9, tz = sa > 0 ? (hz - c.z) / sa : sa < 0 ? (-hz - c.z) / sa : 9; const tc = Math.min(tx, tz); if (tc < tMin) { tMin = tc; ghostOn = false; }
    guide.visible = true; guide.scale.x = Math.max(0.01, tMin); guide.position.set(c.x + ca * tMin / 2, R * 0.2, c.z + sa * tMin / 2); guide.rotation.z = -aim.ang;
    ghost.visible = ghostOn; ghost.position.set(c.x + ca * tMin, R * 0.3, c.z + sa * tMin);
    U.meter.style.display = 'block'; U.meter.querySelector('s').style.height = (aim.pow * 100) + '%'; U.meter.querySelector('u').style.cssText = 'display:none'; }
  P.pointer = (ev, e) => {
    if (phase !== 'aim') return; const p = toTable(e); if (!p) return;
    if (ev === 'pointerdown') { P._down = true; U.pad.setPointerCapture?.(e.pointerId); aim = aimFrom(p); drawAim(); }
    else if (ev === 'pointermove' && P._down) { aim = aimFrom(p); drawAim(); }
    else if (ev === 'pointerup' && P._down) { P._down = false; const a = aim; aim = null; drawAim(); if (a && a.pow > 0.04) shoot(a.ang, a.pow); }
    else if (ev === 'pointercancel') { P._down = false; aim = null; drawAim(); } };
  let sunkThis = [], scratch = false, settle = 0;
  function shoot(ang, pow) { P.sim.shoot(ang, pow); P.shots++; phase = 'roll'; sunkThis = []; scratch = false; settle = 0; U.hint.style.opacity = 0; audio.thud?.(0.4 + pow * 0.5); hud(); }
  function endShot() {
    if (scratch) { P.scratches++; P.shots++; P.sim.respot(); U.flash('Scratch', '+1 SHOT · WHITE BALL BACK ON THE SPOT'); if (Math.random() < 0.6) say([[pick(['FUZZY PEACH', 'MILKSHAKE']), pick(['The white one goes on the table. Ideally.', 'It\'s shy. Give it a minute.', 'Classic.'])]]); }
    else if (sunkThis.length > 1) U.flash('Combo!', sunkThis.length + ' DOWN');
    else if (sunkThis.length === 1) { if (Math.random() < 0.35) say([[pick(['FUZZY PEACH', 'FUZZY PEACH']), pick(['Clean.', 'Okay. Okay.', 'I saw it. I\'ll deny it.', 'That one wanted to go.'])]]); }
    else if (P.sim.first == null && Math.random() < 0.5) say([['FUZZY PEACH', pick(['You missed everything. Impressive.', 'The balls didn\'t even notice.', 'Felt is very forgiving.'])]]);
    hud(); sync();
    if (left() === 0) { phase = 'over'; const sh = P.shots; const nb = !P.best || sh < P.best; if (nb) { P.best = sh; localStorage.setItem('ss_pool_best', sh); }
      const r = { shots: sh, scratches: P.scratches, newBest: nb }; P.last = r; const extra = onDone?.(r);
      setTimeout(() => { U.showPanel('Table cleared', `${sh} SHOTS · ${P.scratches} SCRATCH${P.scratches === 1 ? '' : 'ES'}${nb ? '<br>NEW HOUSE BEST' : ''}`, [{ t: 'RACK \'EM AGAIN', f: () => rack() }, { t: 'PUT THE CUE BACK', alt: true, f: () => P.leave() }]); if (extra) say(extra); }, 700); return; }
    phase = 'aim'; U.hint.style.opacity = 1; U.hint.textContent = 'DRAG BACK FROM THE WHITE BALL · LET GO TO SHOOT'; }
  function rack() { P.sim.rack(); P.shots = 0; P.scratches = 0; sync(); hud(); phase = 'aim'; U.hint.style.opacity = 1; U.hint.textContent = 'DRAG BACK FROM THE WHITE BALL · LET GO TO SHOOT'; }
  P.begin = (o = {}) => { P.active = true; U.claim(P); fit(); rack(); leaveCb = o.onLeave || onLeave; U.top.style.display = 'block'; };
  P.update = (dt) => { if (!P.active) return; fit();
    if (phase === 'roll') { const ev = P.sim.step(Math.min(dt, 1 / 30)); for (const e of ev) { if (e.t === 'sink') { if (e.n === 0) scratch = true; else sunkThis.push(e.n); audio.drop?.(); hud(); } else if (e.t === 'click' && e.v > 0.3) audio.tick?.(); }
      sync(); if (!P.sim.moving()) { settle += dt; if (settle > 0.25) endShot(); } } };
  P.leave = () => { if (!P.active) return; const cb = leaveCb; P.end(); cb?.({ mid: phase === 'roll' || (P.shots > 0 && left() > 0) }); };
  P.end = () => { P.active = false; phase = 'idle'; aim = null; drawAim(); U.release(P); U.panel.classList.remove('on'); };
  P.test = { get phase() { return phase; }, get left() { return left(); }, get shots() { return P.shots; }, shoot: (a, p) => phase === 'aim' && shoot(a, p),
    aimAt: (n) => { const c = P.sim.cue(), b = P.sim.balls.find(x => x.n === n && !x.in); return b ? Math.atan2(b.z - c.z, b.x - c.x) : 0; }, sim: P.sim, fast: (k = 600) => { for (let i = 0; i < k && phase === 'roll'; i++) P.update(1 / 30); } };
  sync(); return P;
}

// ================================================================== HOOPS — the chain-link court, Around the World vs Larry Byrd
export function larryByrd(feltMat) {   // procedural felt turkey vulture in a tank top: black body, bare red head, ivory hooked beak, gangly legs
  const g = new THREE.Group(), blk = feltMat('#2a2422'), red = feltMat('#c4473a'), ivory = feltMat('#efe2c4'), tank = feltMat('#2f55a8'), leg = feltMat('#d9b4a0');
  const S = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), c); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
  S(0.36, blk, 0, 1.05, 0, 1, 1.35, 0.85); const shirt = S(0.37, tank, 0, 1.0, 0.02, 0.98, 1.0, 0.84); shirt.scale.y = 0.95;
  S(0.18, ivory, 0, 1.55, 0, 1.5, 0.6, 1.3);   // the neck ruff
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), red); neck.position.set(0, 1.72, 0.04); g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.9, 0.08); g.add(head); g.userData.head = head;
  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), red); hs.scale.set(0.9, 0.85, 1.15); head.add(hs);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 8), ivory); beak.rotation.x = Math.PI / 2 + 0.5; beak.position.set(0, -0.03, 0.17); head.add(beak);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })); e.position.set(s * 0.065, 0.03, 0.1); head.add(e);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), blk); wing.scale.set(0.35, 1.1, 0.7); wing.position.set(s * 0.37, 1.05, -0.02); wing.rotation.z = s * 0.2; g.add(wing);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.6, 6), leg); l.position.set(s * 0.13, 0.32, 0); g.add(l);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.2), leg); ft.position.set(s * 0.13, 0.03, 0.06); g.add(ft);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), feltMat('#f3efe2')); sock.position.set(s * 0.13, 0.12, 0); g.add(sock); }
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.22), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(128, 100, (c, w, h) => { c.font = '700 80px Futura,Avenir,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff3dc'; c.fillText('33', w / 2, 82); }) }));
  num.position.set(0, 1.1, 0.33); g.add(num);
  return g;
}
const SPOTS = [[-4.2, 1.2], [-2.9, 3.4], [0, 4.6], [2.9, 3.4], [4.2, 1.2]];   // around the world (x, distance out from the rim on the court plane)
export function hoopShot(from, v, ang, yaw) {   // pure: returns { made, swish, path:[...] } — rim at (0,3.05,0), board face z=-0.38
  const g = 9.8, BR = 0.12, RR = 0.229, RIM = [0, 3.05, 0]; let [x, y, z] = from;
  const hd = Math.hypot(-x, -z); const dx = -x / hd, dz = -z / hd; const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const hx = dx * cy - dz * sy, hz = dx * sy + dz * cy; let vx = hx * v * Math.cos(ang), vz = hz * v * Math.cos(ang), vy = v * Math.sin(ang);
  const path = []; let made = false, touched = false, t = 0; const h = 1 / 240;
  while (t < 3.2) { t += h; vy -= g * h; const px = x, py = y, pz = z; x += vx * h; y += vy * h; z += vz * h;
    if (z - BR < -0.38 && pz - BR >= -0.38 && y > 2.9 && y < 3.95 && Math.abs(x) < 0.9) { z = -0.38 + BR; vz = -vz * 0.6; vx *= 0.8; touched = true; }
    const rx = x - RIM[0], rz = z - RIM[2], rd = Math.hypot(rx, rz) || 1e-6, cx = RIM[0] + rx / rd * RR, cz = RIM[2] + rz / rd * RR;
    const ox = x - cx, oy = y - RIM[1], oz = z - cz, od = Math.hypot(ox, oy, oz);
    if (od < BR + 0.01) { const nx = ox / od, ny = oy / od, nz = oz / od, vn = vx * nx + vy * ny + vz * nz; if (vn < 0) { vx -= 1.55 * vn * nx; vy -= 1.55 * vn * ny; vz -= 1.55 * vn * nz; vx *= 0.85; vz *= 0.85; } const push = BR + 0.01 - od; x += nx * push; y += ny * push; z += nz * push; touched = true; }
    if (!made && py >= RIM[1] && y < RIM[1] && Math.hypot(x - RIM[0], z - RIM[2]) < RR - 0.02) { made = true; vx *= 0.25; vz *= 0.25; vy *= 0.5; }
    if (y < BR) { y = BR; vy = -vy * 0.55; vx *= 0.8; vz *= 0.8; }
    if (path.length < 2000 && Math.round(t / h) % 2 === 0) path.push([x, y, z]); if (made && y < 1.2) break; }
  return { made, swish: made && !touched, path };
}
export function hoopIdeal(from) { const g = 9.8, ang = THREE.MathUtils.degToRad(52), D = Math.hypot(from[0], from[2]), hd = 3.05 - from[1]; return Math.sqrt(g * D * D / (2 * Math.cos(ang) ** 2 * (D * Math.tan(ang) - hd))); }

export function createHoops(ctx) {
  const { feltMat, audio = {}, say, onDone, onLeave } = ctx;
  const H = { active: false, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 120), wolf: 0, larry: 0, shot: 0 };
  const sc = H.scene; sc.background = new THREE.Color('#e9a46a'); sc.fog = new THREE.Fog('#e9a46a', 18, 60);
  sc.add(new THREE.HemisphereLight('#ffe0b8', '#7a5a4a', 1.0)); const sun = new THREE.DirectionalLight('#ffd7a0', 1.6); sun.position.set(-8, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); sc.add(sun);
  // court: cracked asphalt half court (canvas), faded key + arc lines, weeds in the cracks
  const ct = canvasTex(512, 512, (g, w, h) => { speckle(g, w, h, '#5d5a5e', 5000, 0.08);
    g.strokeStyle = 'rgba(20,18,20,.55)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
    const s = w / 16, ox = w / 2, oy = s * 1.0; g.strokeStyle = 'rgba(243,239,226,.7)'; g.lineWidth = 5;   // 1 px = 1/32 m; rim at (ox, oy+1.2s)
    g.strokeRect(ox - 2.44 * s, 0, 4.88 * s, 5.8 * s); g.beginPath(); g.arc(ox, 5.8 * s, 1.8 * s, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(ox, 1.2 * s + oy * 0, 6.75 * s, 0.08, Math.PI - 0.08); g.stroke();
    g.fillStyle = 'rgba(201,88,74,.35)'; g.fillRect(ox - 2.44 * s + 3, 3, 4.88 * s - 6, 5.8 * s - 6);
    g.fillStyle = '#7a8a4a'; for (let i = 0; i < 40; i++) { g.fillRect(Math.random() * w, Math.random() * h, 3, 5); } });
  const court = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: ct, roughness: 1 })); court.rotation.x = -Math.PI / 2; court.position.set(0, 0, 8 - 1.2); court.receiveShadow = true; sc.add(court);
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), feltMat('#c9925f')); dirt.rotation.x = -Math.PI / 2; dirt.position.y = -0.01; sc.add(dirt);
  // pole + backboard (sun-bleached plywood, painted square) + orange rim + chain net
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.6, 10), feltMat('#3f5f6e')); pole.position.set(0, 1.8, -1.35); pole.castShadow = true; sc.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.0), feltMat('#3f5f6e')); arm.position.set(0, 3.35, -0.9); sc.add(arm);
  const bbT = canvasTex(256, 150, (g, w, h) => { speckle(g, w, h, '#efe2c4', 1500, 0.06); g.strokeStyle = '#c9584a'; g.lineWidth = 7; g.strokeRect(5, 5, w - 10, h - 10); g.strokeRect(w * 0.33, h * 0.42, w * 0.34, h * 0.44); g.fillStyle = 'rgba(58,31,42,.6)'; g.font = '700 16px Futura,Avenir,sans-serif'; g.fillText('NO DUNKING (ON LARRY)', 22, 34); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.05), [feltMat('#d9c9a4'), feltMat('#d9c9a4'), feltMat('#d9c9a4'), feltMat('#d9c9a4'), new THREE.MeshStandardMaterial({ map: bbT, roughness: 1 }), feltMat('#d9c9a4')]); board.position.set(0, 3.42, -0.405); board.castShadow = true; sc.add(board);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.229, 0.014, 6, 24), feltMat('#e06a2a')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 3.05, 0); sc.add(rim);
  const netT = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#c9c9c4'; g.lineWidth = 3; for (let i = -64; i < 128; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 40, h); g.stroke(); g.beginPath(); g.moveTo(i + 40, 0); g.lineTo(i, h); g.stroke(); } });
  netT.wrapS = THREE.RepeatWrapping; netT.repeat.set(4, 1);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.42, 16, 1, true), new THREE.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 })); net.position.set(0, 2.83, 0); sc.add(net);
  // chain-link around the court + a couple of desert props behind
  const fT = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#a8aaa4'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }); fT.wrapS = fT.wrapT = THREE.RepeatWrapping;
  const fMat = (len) => { const t = fT.clone(); t.needsUpdate = true; t.repeat.set(len * 6, 3 * 6 / 1.0 * 0.5); return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.3 }); };
  const fence = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), fMat(len)); m.position.set((x0 + x1) / 2, 1.5, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); sc.add(m);
    for (let i = 0; i <= Math.ceil(len / 3); i++) { const f = i / Math.ceil(len / 3), p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.05, 6), feltMat('#8a8c88')); p.position.set(lerp(x0, x1, f), 1.52, lerp(z0, z1, f)); sc.add(p); } };
  fence(-8, -2.5, 8, -2.5); fence(-8, -2.5, -8, 13); fence(8, -2.5, 8, 13);
  for (const [x, z, s] of [[-12, -9, 1.4], [6, -14, 1.0], [14, 4, 1.2], [-15, 6, 0.9]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.3 * s, 2.6 * s, 8), feltMat('#5f7a4a')); c.position.set(x, 1.3 * s, z); sc.add(c); }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.45), feltMat('#8a5a3a')); bench.position.set(-6.6, 0.22, 5); bench.rotation.y = Math.PI / 2; sc.add(bench);
  const larry = larryByrd(feltMat); larry.position.set(-6.4, 0, 4.2); larry.rotation.y = 1.2; sc.add(larry);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(128, 64, (g, w, h) => { speckle(g, w, h, '#d96a2a', 900, 0.08); g.strokeStyle = '#3a1f1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 4, 0); g.lineTo(w / 4, h); g.moveTo(w * 3 / 4, 0); g.lineTo(w * 3 / 4, h); g.stroke(); }) }));
  ball.castShadow = true; sc.add(ball); H.tris = tris(sc);

  const U = ui(); let phase = 'idle', fly = null, down = null, leaveCb = null, larryQ = [];
  const spotPos = (i) => { const [sx, sz] = SPOTS[Math.floor(i / 2) % 5]; return [sx, sz]; };
  const hud = () => { U.top.innerHTML = `<b>Around the World</b>WOLF ${H.wolf} · LARRY BYRD ${H.larry}<br><span style="font-size:11px;opacity:.85">${phase === 'larry' ? 'LARRY\'S TURN' : 'SHOT ' + Math.min(H.shot + 1, 10) + ' OF 10'}</span>`; };
  function setView(i) { const [sx, sz] = spotPos(i), c = H.camera; const d = Math.hypot(sx, sz), ux = sx / d, uz = sz / d;
    c.position.set(sx + ux * 1.6, 1.75, sz + uz * 1.6); c.lookAt(0, 2.65, 0); c.aspect = innerWidth / innerHeight; c.fov = c.aspect < 1 ? 68 : 52; c.updateProjectionMatrix();
    ball.position.set(sx + ux * 0.45, 1.25, sz + uz * 0.45); ball.visible = true; }
  const PSW = () => 0.36 * innerHeight;
  function meter(p) { U.meter.style.display = 'block'; U.meter.querySelector('s').style.height = clamp(p / 1.6, 0, 1) * 100 + '%'; const u = U.meter.querySelector('u'); u.style.cssText = `display:block;bottom:${(0.82 / 1.6) * 100}%;height:${(0.36 / 1.6) * 100}%`; }
  H.pointer = (ev, e) => { if (phase !== 'aim') return;
    if (ev === 'pointerdown') { down = { x: e.clientX, y: e.clientY }; U.pad.setPointerCapture?.(e.pointerId); meter(0); }
    else if (ev === 'pointermove' && down) meter(Math.max(0, down.y - e.clientY) / PSW());
    else if (ev === 'pointerup' && down) { const p = Math.max(0, down.y - e.clientY) / PSW(), lat = (e.clientX - down.x) / Math.max(40, down.y - e.clientY); down = null; U.meter.style.display = 'none'; if (p > 0.15) shoot(p, lat); }
    else if (ev === 'pointercancel') { down = null; U.meter.style.display = 'none'; } };
  function launch(who, i, p, lat) {   // p = swipe / sweet length (1.0 = perfect), lat = sideways drift ratio
    const [sx, sz] = spotPos(i), d = Math.hypot(sx, sz); const from = [sx - sx / d * 0.15, 2.05, sz - sz / d * 0.15];
    const e = p - 1, eff = Math.sign(e) * Math.max(0, Math.abs(e) - 0.18) * 0.22, v = hoopIdeal(from) * (1 + eff);
    const yaw = Math.sign(lat) * Math.max(0, Math.abs(lat) - 0.12) * 0.12;
    const r = hoopShot(from, v, THREE.MathUtils.degToRad(52), yaw); fly = { r, k: 0, who, i }; phase = who === 'wolf' ? 'fly' : 'lfly'; audio.thud?.(0.3); }
  function shoot(p, lat) { H.lastIn = { p, lat }; launch('wolf', H.shot, p, lat); U.hint.style.opacity = 0; }
  function after() { const { r, who, i } = fly; fly = null;
    if (who === 'wolf') { if (r.made) { H.wolf++; U.flash(r.swish ? 'Swish!' : 'Bucket', r.swish ? 'NOTHING BUT CHAIN' : ''); audio.ding?.(); } else { U.flash('Brick', ''); if (Math.random() < 0.45) say([['LARRY BYRD', pick(['Ooh. The rim felt that.', 'Use your legs. You have legs.', 'That\'s a pass. To nobody.', 'I\'d have made that. In my prime. Which is now.'])]]); }
      H.shot++; hud(); if (H.shot >= 10) { phase = 'larry'; larryQ = Array.from({ length: 10 }, (_, k) => k); H.lshot = 0; setTimeout(larryNext, 900); hud(); return; }
      setTimeout(() => { setView(H.shot); phase = 'aim'; U.hint.style.opacity = 1; }, 600); }
    else { if (r.made) { H.larry++; } hud(); setTimeout(larryNext, 350); } }
  function larryNext() { if (!H.active) return; if (H.lshot >= 10) return finish(); const i = H.lshot++; setView(i); larry.position.set(...(() => { const [sx, sz] = spotPos(i), d = Math.hypot(sx, sz); return [sx + sx / d * 0.35, 0, sz + sz / d * 0.35]; })()); larry.lookAt(0, 0, 0);
    const c = H.camera, [sx, sz] = spotPos(i); c.position.set(sx * 0.4 + 3.4, 2.6, sz + 4.2); c.lookAt(sx * 0.4, 2.0, sz * 0.45); larry.visible = true;
    const make = Math.random() < 0.55; launch('larry', i, make ? 1 + (Math.random() - 0.5) * 0.3 : (Math.random() < 0.5 ? 0.5 : 1.55) + Math.random() * 0.1, make ? 0 : (Math.random() - 0.5) * 0.3); }
  function finish() { phase = 'over'; larry.position.set(-6.4, 0, 4.2); larry.rotation.set(0, 1.2, 0); const r = { wolf: H.wolf, larry: H.larry, win: H.wolf > H.larry, tie: H.wolf === H.larry }; H.last = r; const extra = onDone?.(r);
    setTimeout(() => { U.showPanel(r.win ? 'You beat Larry' : r.tie ? 'A tie' : 'Larry wins', `WOLF ${r.wolf} · LARRY BYRD ${r.larry}`, [{ t: 'RUN IT BACK', f: () => start() }, { t: 'HAND HIM THE BALL', alt: true, f: () => H.leave() }]);
      say(extra || (r.win ? [['LARRY BYRD', 'The sun was in my eyes.'], ['WOLF', 'It\'s always in your eyes.'], ['LARRY BYRD', 'That\'s why I\'m so good.']] : r.tie ? [['LARRY BYRD', 'Ties go to the bird.'], ['WOLF', 'Since when?'], ['LARRY BYRD', 'Since birds.']] : [['LARRY BYRD', 'Thirty-three. Like the jersey.'], ['LARRY BYRD', 'Come back when you have hops.']])); }, 600); }
  function start() { H.wolf = H.larry = H.shot = 0; phase = 'aim'; larry.position.set(-6.4, 0, 4.2); larry.rotation.set(0, 1.2, 0); setView(0); hud(); U.hint.style.opacity = 1; U.hint.textContent = 'DRAG UP FROM THE BALL · LET GO IN THE GREEN'; }
  H.begin = (o = {}) => { H.active = true; leaveCb = o.onLeave || onLeave; U.claim(H); start(); };
  H.update = (dt, t) => { if (!H.active) return; const c = H.camera; if (Math.abs(c.aspect - innerWidth / innerHeight) > 1e-3) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
    const hd = larry.userData.head; if (hd) hd.rotation.x = Math.sin(t * 2.2) * 0.12;
    if (fly) { fly.k += dt * 120; const P = fly.r.path, k = Math.min(P.length - 1, Math.floor(fly.k)); ball.position.set(...P[k]); ball.rotation.x += dt * 9;
      if (fly.r.made && k > 0) net.scale.y = 1 + Math.max(0, 0.3 - Math.abs(P[k][1] - 2.8)) * 0.8; if (k >= P.length - 1) after(); } };
  H.leave = () => { if (!H.active) return; const cb = leaveCb; H.end(); cb?.({ mid: phase !== 'over' && H.shot > 0 }); };
  H.end = () => { H.active = false; phase = 'idle'; fly = null; U.release(H); U.panel.classList.remove('on'); U.meter.style.display = 'none'; };
  H.test = { get phase() { return phase; }, get score() { return [H.wolf, H.larry, H.shot]; }, shoot: (p, lat = 0) => phase === 'aim' && shoot(p, lat), fast: (k = 1200) => { for (let i = 0; i < k && (phase === 'fly' || phase === 'lfly' || phase === 'larry'); i++) H.update(1 / 30, i / 30); } };
  return H;
}
