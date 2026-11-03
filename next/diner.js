// diner.js — run 10: "The Diner is where an adventure can start!"
// The Diner trio (Cake, Shake, Fuzzy Peach) at the counter, the ORDER activity (phone-friendly menu sheet, Stove cooks, plate is served),
// the opening mission TABLE FOR FOUR (recruit the Wolf -> leave as a party -> the napkin map's X in town) and the outdoor party followers.
// Rig budget: the Wolf + 3 trio rigs are on screen, but the trio mixers are time-sliced round-robin (2 of 3 evaluated per frame, each with its
// accumulated dt), so the room never evaluates more than 3 rigs per frame (Wolf + 2). Outside, the followers use the same 2-of-3 slicing.
// Models are referenced by their existing paths (town2/cake_lo.glb, shake_lo.glb, fuzzy_peach_lo.glb) so updated GLBs drop in.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gesturer, castOffsets, CAST_POOL } from './idles.js';   // run 15

const TRIO = [
  { id: 'cake', file: 'town2/cake_lo.glb', look: 'cake', h: 1.15, name: 'CAKE' },
  { id: 'shake', file: 'town2/shake_lo.glb', look: 'shake', h: 0.98, name: 'SHAKE' },
  { id: 'peach', file: 'town2/fuzzy_peach_lo.glb', look: 'peach', h: 0.86, name: 'FUZZY PEACH' },
];
const PROP = 'town2/adventure_plate.glb';   // run 10 Meshy prop (meshy-6-lite image-to-3D); procedural fallback if missing
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ease = (u) => u * u * (3 - 2 * u);
const angTo = (cur, want, k) => cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * k;

export function createDiner(K) {
  const { glb, at, box, cyl, sign, feltMat, audio = {}, LOW, say, S, save, step, mainScene, wolfState, level } = K;
  const STEEL = '#c9ccd0';
  const D = { test: {} };
  let A = null, room = null;   // the diner room record + our parts in it

  // ---------------------------------------------------------------- shared rig helpers
  function prep(wrap, def) {   // squash group between the wrap and the model root (scales about the feet), idle+walk blend, peach stem fix
    const root = wrap.children[0], sq = new THREE.Group(); wrap.remove(root); sq.add(root); wrap.add(sq);
    const c = { id: def.id, def, o: wrap, sq, mixer: wrap.mixer, acts: wrap.acts, acc: 0, pop: 0, hop: null, yaw: 0, moving: 0 };
    if (c.acts?.walk) { c.acts.walk.play(); c.acts.walk.setEffectiveWeight(0); }
    if (c.acts?.idle) c.acts.idle.time = Math.random() * c.acts.idle.getClip().duration;
    if (def.id === 'peach' && !/[?&]nostem/.test(location.search)) fixStem(wrap);   // ?nostem = QA before/after
    return c;
  }
  // Fuzzy Peach stem: the baked albedo gives the stem the peach-skin orange, so the felt pass reads it as fuzz. Re-tint just the stem texels
  // (found by geometry: the thin vertical part above the ice-cream hat, beside the leaf) to the concept's warm wood-brown, on a canvas copy
  // of the texture at runtime (the GLB stays untouched).
  function fixStem(wrap) {
    wrap.updateMatrixWorld(true);
    wrap.traverse(o => { if (!o.isMesh || !o.material?.map?.image || o.userData.stemFixed) return; o.userData.stemFixed = true;
      const g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv, idx = g.index; if (!uv) return;
      const bb = new THREE.Box3().setFromBufferAttribute(pos), H = bb.max.y - bb.min.y, v = new THREE.Vector3();
      // stem = vertices in the top 9% of the model whose texel is orange-brown and that sit off the hat's centre line toward the leaf side
      const img = o.material.map.image, W = img.width, Hh = img.height; const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0); const data = cx.getImageData(0, 0, W, Hh);
      const tris = []; const n = idx ? idx.count : pos.count; const top = bb.max.y - H * D.stemTop;   // stem sits in the top ~22% of the model
      for (let i = 0; i < n; i += 3) { const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
        if (Math.min(pos.getY(a), pos.getY(b), pos.getY(c)) < top) continue;
        const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, w = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
        const px = Math.min(W - 1, Math.max(0, Math.floor(u * W))), py = Math.min(Hh - 1, Math.max(0, Math.floor((o.material.map.flipY ? 1 - w : w) * Hh))), k = (py * W + px) * 4;
        const r = data.data[k], gg = data.data[k + 1], bl = data.data[k + 2], mx = Math.max(r, gg, bl), mn = Math.min(r, gg, bl);
        // the stem's baked texels are a rust orange (~#a0502c); the felt fuzz pass turns that into more peach skin. Skin is brighter, the scoop is cream, the leaf is olive.
        if (r > 120 && r < 195 && gg < 108 && bl < 68 && r > gg * 1.55 && r > bl * 2.4) tris.push([a, b, c]); }
      if (!tris.length) return; D.test.stemTris = tris.length;
      cx.fillStyle = '#5e3b24'; cx.strokeStyle = '#5e3b24'; cx.lineWidth = 3; cx.lineJoin = 'round';
      for (const t of tris) { cx.beginPath(); t.forEach((q, j) => { const x = uv.getX(q) * W, y = (o.material.map.flipY ? 1 - uv.getY(q) : uv.getY(q)) * Hh; j ? cx.lineTo(x, y) : cx.moveTo(x, y); }); cx.closePath(); cx.fill(); cx.stroke(); }
      const tx = new THREE.CanvasTexture(cv); tx.flipY = o.material.map.flipY; tx.colorSpace = o.material.map.colorSpace; tx.wrapS = o.material.map.wrapS; tx.wrapT = o.material.map.wrapT; tx.anisotropy = 4;
      const old = o.material.map; for (const m of new Set([o.material, ...(o.userData.ssPair || [])])) if (m.map === old) { m.map = tx; m.needsUpdate = true; } });
  }
  D.stemTop = 0.22; D.lowBox = 0.8;
  function rr(list, dt, per = 2) {   // time-sliced mixers: every rig accumulates dt, only `per` of them evaluate this frame
    for (const c of list) c.acc += dt; if (!list.length) return;
    for (let i = 0; i < Math.min(per, list.length); i++) { const c = list[(rr.i + i) % list.length]; c.mixer?.update(c.acc); c.acc = 0; }
    rr.i = (rr.i + per) % list.length; D.test.evals = Math.min(per, list.length);
  }
  rr.i = 0;
  function blend(c, moving, dt) { c.moving += ((moving ? 1 : 0) - c.moving) * Math.min(1, dt * 6); const a = c.acts; if (!a?.walk || !a.idle) return;
    a.walk.setEffectiveWeight(c.moving); a.idle.setEffectiveWeight(1 - c.moving); }
  function squish(c, t, dt) {   // Fuzzy Peach: soft squash & stretch synced to the walk clip (2 footfalls per cycle) + a jelly pop when tapped
    let sy = 1; const w = c.acts?.walk;
    if (c.id === 'peach') { const ph = w ? w.time / w.getClip().duration * Math.PI * 4 : 0; sy += 0.075 * c.moving * Math.cos(ph) + 0.014 * (1 - c.moving) * Math.sin(t * 1.7); }
    else sy += 0.008 * Math.sin(t * 1.5 + c.def.h * 9);
    if (c.pop > 0) { c.pop = Math.max(0, c.pop - dt); const e = 0.9 - c.pop; sy += -0.22 * Math.cos(e * 20) * Math.exp(-e * 5) * (c.id === 'peach' ? 1 : 0.5); }
    c.G ||= gesturer(CAST_POOL, 'diner'); c.G.update(dt, c.hop ? 0 : 1 - c.moving); const go = castOffsets(c.G, t);   // run 15: random idle gestures over the idle clip
    sy *= go.sy; c.sq.rotation.set(go.rx, go.ry, go.rz); c.sq.position.y = go.y * (c.def.h || 1);
    const sx = 1 / Math.sqrt(Math.max(0.5, sy)); c.sq.scale.set(sx, sy, sx);
  }
  function hopTick(c, dt) {   // scripted arcs (hop off a stool, slide down the counter)
    const h = c.hop; if (!h) return false; h.t += dt; const u = Math.min(1, h.t / h.dur), e = h.slide ? u : ease(u);
    c.o.position.lerpVectors(h.a, h.b, e); c.o.position.y += Math.sin(Math.PI * u) * h.arc; if (u >= 1) { c.hop = null; h.done?.(); } return true;
  }
  const hop = (c, b, dur = 0.55, arc = 0.35, slide = false) => new Promise(done => { c.hop = { a: c.o.position.clone(), b: b.clone(), t: 0, dur, arc, slide, done }; });

  // ---------------------------------------------------------------- the menu sheet (DOM, phone-first)
  const css = document.createElement('style');
  css.textContent = `
  #dnMenu{position:fixed;inset:0;z-index:9;display:none;align-items:flex-end;justify-content:center;background:rgba(36,22,31,.35);font-family:Futura,Avenir,sans-serif}
  #dnMenu.on{display:flex}
  #dnMenu .card{width:min(440px,100%);max-height:78vh;overflow:auto;margin:0 0 env(safe-area-inset-bottom);background:#fff3dc;border-radius:18px 18px 0 0;border-top:6px solid #c23a35;box-shadow:0 -8px 30px rgba(0,0,0,.3);padding:14px 14px 12px;color:#3a1f2a;
    background-image:repeating-linear-gradient(45deg,rgba(194,58,53,.05) 0 8px,transparent 8px 16px)}
  #dnMenu .hd{display:flex;justify-content:space-between;align-items:baseline;margin:0 4px 10px}
  #dnMenu .hd b{font-size:18px;letter-spacing:.24em} #dnMenu .hd span{font-size:11px;letter-spacing:.18em;color:#a2524a}
  #dnMenu .it{display:flex;width:100%;min-height:56px;align-items:center;gap:10px;border:0;border-radius:12px;margin:0 0 8px;padding:10px 14px;background:#ffe6c4;box-shadow:0 3px 0 #c9a37a;text-align:left;color:#3a1f2a;font:inherit;cursor:pointer}
  #dnMenu .it:active{transform:translateY(2px);box-shadow:0 1px 0 #c9a37a}
  #dnMenu .it .n{flex:1;font-weight:700;font-size:15px;letter-spacing:.12em} #dnMenu .it .n i{display:block;font-style:normal;font-weight:500;font-size:11px;letter-spacing:.06em;color:#8a5a4a;margin-top:3px}
  #dnMenu .it .p{font-weight:700;font-size:13px;letter-spacing:.1em;color:#c23a35}
  #dnMenu .it.adv{background:#ffc98a;box-shadow:0 3px 0 #c27b45}
  #dnMenu .blank{padding:26px 10px;text-align:center;font-size:13px;letter-spacing:.12em;color:#8a5a4a;line-height:1.8}
  #dnMenu .ft{display:flex;gap:8px;margin-top:4px} #dnMenu .ft button{flex:1;min-height:48px;border:0;border-radius:999px;font:700 12px Futura,Avenir,sans-serif;letter-spacing:.16em;color:#3a1f2a;background:#fff;box-shadow:0 3px 0 #b9a58a}`;
  document.head.appendChild(css);
  const sheet = document.createElement('div'); sheet.id = 'dnMenu';
  sheet.innerHTML = `<div class="card"><div class="hd"><b>THE DINER</b><span id="dnSide">MENU · SIDE A</span></div><div id="dnItems"></div>
    <div class="ft"><button id="dnFlip">TURN OVER ↻</button><button id="dnX">NEVER MIND</button></div></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === sheet) closeMenu(); });
  let side = 'A';
  const MENU = [
    { id: 'soup', name: 'SOUP', price: '25¢', note: 'Think about it.' },
    { id: 'hot', name: 'SOUP (HOT)', price: '30¢', note: 'Same soup. Five cents hotter.' },
    { id: 'pie', name: 'PIE', price: 'DISPLAY', note: 'Look. Don\'t.' },
    { id: 'coffee', name: 'COFFEE', price: 'REFILL', note: 'Nobody has ever had the first cup.' },
    { id: 'shake', name: 'MILKSHAKE', price: 'ASK SHAKE', note: 'Please don\'t.' },
  ];
  function renderMenu() {
    const box = document.getElementById('dnItems'); box.innerHTML = ''; document.getElementById('dnSide').textContent = 'MENU · SIDE ' + side;
    if (side === 'A') for (const m of MENU) box.appendChild(item(m));
    else if ((S.adv || 0) >= 2) { box.appendChild(item({ id: 'adv', name: 'THE ADVENTURE', price: 'SERVES 4', note: 'Comes with the meal. The meal comes with it.', cls: 'adv' }));
      const p = document.createElement('div'); p.className = 'blank'; p.textContent = (S.adv || 0) >= 3 ? '(already ordered — it\'s ongoing)' : 'Somebody wrote this in pencil. Recently.'; box.appendChild(p); }
    else { const p = document.createElement('div'); p.className = 'blank'; p.textContent = 'THIS SIDE INTENTIONALLY LEFT BLANK.\n'; p.innerHTML += '<br>(It is not intentionally left blank.<br>It just is.)'; box.appendChild(p); }
  }
  function item(m) { const b = document.createElement('button'); b.className = 'it' + (m.cls ? ' ' + m.cls : ''); b.dataset.id = m.id;
    b.innerHTML = `<span class="n">${m.name}<i>${m.note}</i></span><span class="p">${m.price}</span>`; b.onclick = (e) => { e.stopPropagation(); order(m.id); }; return b; }
  document.getElementById('dnFlip').onclick = (e) => { e.stopPropagation(); side = side === 'A' ? 'B' : 'A'; audio.ui?.('tick'); renderMenu(); };
  document.getElementById('dnX').onclick = (e) => { e.stopPropagation(); closeMenu(); say([['STOVE', 'Take your time.'], ['STOVE', 'It goes backwards here anyway.']]); };
  function openMenu() { if (!room || room.cooking) return; side = 'A'; renderMenu(); sheet.classList.add('on'); audio.ui?.('confirm'); D.test.menu = true; K.sub?.classList.remove('on'); }
  function closeMenu() { sheet.classList.remove('on'); D.test.menu = false; }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('on')) closeMenu(); });

  // ---------------------------------------------------------------- cooking + serving
  function food(kind) {   // what lands on the plate
    const g = new THREE.Group();
    if (kind === 'soup' || kind === 'hot') { g.add(cyl(0.11, 0.075, 0.07, '#f6efe0', 12)); const s = cyl(0.1, 0.1, 0.005, kind === 'hot' ? '#d0602a' : '#d9963a', 12); s.position.y = 0.065; g.add(s);
      if (kind === 'hot') for (let i = 0; i < 2; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 10, Math.PI), feltMat('#fff8ec')); w.position.set(-0.03 + i * 0.06, 0.15, 0); g.add(w); (room.wisps ||= []).push(w); } }
    else if (kind === 'pie') { const card = sign('PIE', 0.14, 0.08, '#fff3dc', '#c23a35', 0.7); card.position.set(0, 0.06, 0); card.rotation.x = -0.25; g.add(card); const st = box(0.02, 0.05, 0.02, '#c9a24a', 0.005); g.add(st); }
    else if (kind === 'shake') { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 12).translate(0, 0.08, 0), new THREE.MeshStandardMaterial({ color: '#dff2f6', transparent: true, opacity: 0.55, roughness: 0.4 })); g.add(gl); }
    else if (kind === 'adv') { if (room.prop) { g.add(room.prop); room.prop.visible = true; } else { const nap = sign('MAP\n   ✕', 0.2, 0.14, '#fff3dc', '#c23a35', 0.5); nap.rotation.x = -0.6; nap.position.y = 0.06; g.add(nap); } }
    return g;
  }
  function serveTo(kind) {   // plate arcs from the grill pass, over the counter, to the Wolf's spot
    const P = room.plate; P.visible = true; if (room.food) P.remove(room.food); room.food = food(kind); if (kind !== 'adv') P.add(room.food); else { P.add(room.food); }
    room.plateBase.visible = kind !== 'adv' || !room.prop;
    room.fly = { t: 0, dur: 0.95, a: new THREE.Vector3(-1.6, 1.0, -2.3), b: room.plateSpot.clone() }; P.position.copy(room.fly.a);
  }
  const LINES = {
    soup: () => [['STOVE', 'Soup.'], ['WOLF', 'What kind?'], ['STOVE', 'The twenty-five cent kind.']],
    hot: () => [['STOVE', 'Hot soup.'], ['WOLF', 'Is it different from the soup?'], ['STOVE', 'By five cents.']],
    pie: () => [['STOVE', 'One pie. For display.'], ['', 'The plate holds a small card that says PIE.'], ['WOLF', '...'], ['CAKE', 'Display it proudly.']],
    coffee: () => { S.coffee = (S.coffee || 0) + 1; save(); return [['STOVE', 'Refill.'], ['', `Refill number ${S.coffee}. The cup was already full. It's fuller.`]]; },
    shake: () => [['SHAKE', 'No.'], ['STOVE', 'One glass of water.'], ['SHAKE', 'Thank you.']],
    adv: () => [['STOVE', 'One adventure. Serves four.'], ['', 'It\'s a napkin. There\'s a map on it. There\'s an X on the map.'], ['CAKE', 'We\'re the other three.'], ['SHAKE', 'I\'ll get my straw.'], ['FUZZY PEACH', 'I\'m already wearing my hat.']],
  };
  const COOK = { soup: 'Thinking about soup.', hot: 'Thinking harder.', pie: 'Getting the display.', coffee: 'Refilling.', shake: 'Not making that.', adv: 'Plating the adventure.' };
  async function order(id) {
    if (!room || room.cooking) return; closeMenu(); room.cooking = true; S.ord = (S.ord || 0) + 1; save(); D.test.lastOrder = id;
    K.clearChips?.(); say([['STOVE', COOK[id]]]);
    if (id === 'coffee') { room.coffeeFill = 1.2; } else { room.cookT = 1.4; for (const s of room.steam) { s.userData.t = Math.random() * 0.5; s.visible = true; } }
    audio.ui?.('tick'); await wait(1500); audio.ui?.('confirm'); room.bellT = 0.5;   // ding: ORDER UP
    if (id !== 'coffee') serveTo(id); await wait(id === 'coffee' ? 200 : 1000);
    room.cooking = false; let L = LINES[id]();
    if (id === 'adv' && (S.adv || 0) === 2) { const last = L[L.length - 1]; L[L.length - 1] = [last[0], last[1], () => { step('adv', 3); S.party = 1; save(); setTimeout(joinParty, 50); }];
      L.push(['', 'CAKE, SHAKE and FUZZY PEACH joined. (Party of four.)'], ['CAKE', 'Lead. We follow. That\'s the deal.']); }
    else if ((S.adv || 0) === 1 && id !== 'adv') L = L.concat([['CAKE', 'That comes with an adventure.'], ['WOLF', 'I didn\'t order an adventure.'], ['SHAKE', 'Nobody orders the adventure.'],
      ['FUZZY PEACH', 'It\'s on the back.', () => { room.trio.forEach(c => c.pop = 0.9); }], ['CAKE', 'Of the menu.', () => step('adv', 2)]]);
    say(L); K.refreshChips?.();
  }

  // ---------------------------------------------------------------- the party (in the room)
  async function joinParty() {   // Shake slides down the counter (classic diner move), Peach hops off the stool, Cake turns around. Then they follow.
    if (!room) return; const [cake, shake, peach] = room.trio; room.joining = true;
    const hp = hop(peach, new THREE.Vector3(-2.0, 0, 0.4), 0.6, 0.35);
    await hop(shake, new THREE.Vector3(1.3, 1.08, -0.85), 1.0, 0.0, true); await hop(shake, new THREE.Vector3(1.75, 0, -0.1), 0.6, 0.45);
    await hp; room.joining = false; room.follow = true;
  }
  const SLOTS = [[-0.75, -0.55], [0.75, -0.55], [0, -1.15]];   // wolf-local (x right, z forward): Cake left, Shake right, Peach behind
  const _v = new THREE.Vector3();
  function roomFollow(dt) {
    const w = A.wolf; const ry = w.rotation.y, s = Math.sin(ry), c0 = Math.cos(ry);
    room.trio.forEach((c, i) => { const [lx, lz] = SLOTS[i];
      _v.set(w.position.x + lx * c0 + lz * s, 0, w.position.z - lx * s + lz * c0); _v.x = THREE.MathUtils.clamp(_v.x, -3.4, 3.4); _v.z = THREE.MathUtils.clamp(_v.z, 0.15, 2.5);
      const dx = _v.x - c.o.position.x, dz = _v.z - c.o.position.z, d = Math.hypot(dx, dz), mv = d > 0.12;
      if (mv) { const sp = Math.min(d, dt * (1.2 + d * 1.5)); c.o.position.x += dx / d * sp; c.o.position.z += dz / d * sp; c.o.rotation.y = angTo(c.o.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8)); }
      else c.o.rotation.y = angTo(c.o.rotation.y, Math.atan2(w.position.x - c.o.position.x, w.position.z - c.o.position.z), Math.min(1, dt * 3));
      c.o.position.y = 0; blend(c, mv, dt); });
  }

  // ---------------------------------------------------------------- build (called from BUILD.diner)
  D.build = async (G, Aroom, { stove, cup, coffee }) => {
    A = Aroom; room = { trio: [], steam: [], wisps: [] };
    const loads = TRIO.map(d => glb(d.file, d.h, d.look)); const pp = glb(PROP, 0.36, 'object').catch(() => null);
    const wraps = await Promise.all(loads); room.trio = wraps.map((w, i) => prep(w, TRIO[i]));
    const [cake, shake, peach] = room.trio;
    // deadpan positions: Cake on the floor at the counter's end (by the pie), Shake standing ON the counter by the cup, Peach perched on a stool
    at(cake.o, 1.05, 0, -0.22, -0.35); at(shake.o, -1.45, 1.08, -0.85, 0.12); at(peach.o, -2.2, 0.71, -0.3, 0.3);
    if (S.party) { at(cake.o, -0.95, 0, 1.1, 0); at(shake.o, 0.55, 0, 1.1, 0); at(peach.o, -0.2, 0, 0.45, 0); room.follow = true; }
    for (const c of room.trio) G.add(c.o);
    // the call bell (ORDER), the plate, grill steam
    const bell = new THREE.Group(); bell.add(cyl(0.07, 0.075, 0.02, '#2a2220', 12)); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), feltMat(STEEL)); dome.position.y = 0.02; bell.add(dome);
    const nub = cyl(0.008, 0.012, 0.03, STEEL, 6); nub.position.y = 0.075; bell.add(nub); at(bell, -0.72, 1.08, -0.7); G.add(bell); room.bell = bell; room.dome = dome;
    const tent = sign('ORDER\nHERE', 0.16, 0.12, '#fff3dc', '#c23a35', 0.6); tent.position.set(-0.72, 1.17, -0.84); tent.rotation.x = -0.2; G.add(tent);
    const P = new THREE.Group(); room.plateBase = cyl(0.16, 0.13, 0.025, '#f6efe0', 16); P.add(room.plateBase); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 18), feltMat('#c23a35')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.026; room.plateBase.add(rim);
    P.visible = false; G.add(P); room.plate = P; room.plateSpot = new THREE.Vector3(-0.98, 1.085, -0.62);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: '#fffaf0', transparent: true, opacity: 0.8, roughness: 1 })); s.visible = false; s.userData.x = -1.75 + i * 0.12; G.add(s); room.steam.push(s); }
    room.stove = stove; room.stoveY = stove.scale.y; room.coffee = coffee;
    room.prop = await pp; if (room.prop) { room.prop.visible = false; D.test.prop = true; }
    // chips (talk targets). Taps do something: the trio hops/squishes, the bell opens the menu, the plate gets eaten
    const q = (list) => { let i = 0; return () => list[i++ % list.length]; };
    const cq = q([['I\'m a slice. The rest of me is in the case.'], ['Happy birthday.', 'Not yours. Not mine. Somebody\'s.'], ['The candle\'s been lit since 1957.', 'I don\'t make wishes. I make do.']]);
    const sq = q([['I\'m not on the menu.'], ['The cherry is load-bearing.'], ['Don\'t shake me.', 'I\'m already Shake.']]);
    const pq = q([['Mm.'], ['I\'m fuzzy.', 'It\'s fine.'], ['The hat is ice cream.', 'It isn\'t melting. I asked it not to.']]);
    const tap = (c, who, lines, party) => () => { c.pop = 0.9; audio.ui?.('tick', true);
      if (!S.party && (S.adv || 0) <= 1 && !room.greeted) return greet();
      if (S.party) return party(); return lines().map(l => [who, l]); };
    A.who.push(
      { id: 'order', label: 'ORDER', o: bell, talk: () => { room.bellT = 0.5; openMenu(); return null; } },
      { id: 'cake', label: 'CAKE', o: cake.o, talk: tap(cake, 'CAKE', cq, () => [['CAKE', 'Lead the way.'], ['CAKE', 'I\'ll be right behind you. Or left. It depends where you turn.']]) },
      { id: 'shake', label: 'SHAKE', o: shake.o, talk: tap(shake, 'SHAKE', sq, () => [['SHAKE', 'Are we there?'], ['WOLF', 'We just left.'], ['SHAKE', 'Pace yourself.']]) },
      { id: 'peach', label: 'PEACH', o: peach.o, talk: tap(peach, 'FUZZY PEACH', pq, () => [['FUZZY PEACH', 'Mm.'], ['', 'Fuzzy Peach squishes. It means yes.']]) },
      { id: 'plate', label: 'PLATE', o: P, chip: false, talk: () => eat() },
    );
    for (const w of A.who) if (w.id === 'menu') w.talk = () => { openMenu(); return null; };   // the counter menu card opens the real menu now
    // the per-frame bits, chained onto the room tick
    const prev = A.tick; A.tick = (dt, t) => { prev?.(dt, t); tick(dt, t); };
    A.extraRigs = 3; A.rigEvals = () => D.test.evals;
    // tri budget: the trio costs ~33k, so small rounded felt boxes (108 tris each) in this room become plain boxes (12). Under ~0.5 m the bevel doesn't read.
    let saved = 0; const bb = new THREE.Box3(), sz = new THREE.Vector3(), c = new THREE.Vector3();
    G.traverse(o => { const g = o.geometry; if (!o.isMesh || o.isSkinnedMesh || !(g instanceof RoundedBoxGeometry)) return; g.computeBoundingBox(); bb.copy(g.boundingBox); bb.getSize(sz);
      if (Math.max(sz.x, sz.y, sz.z) > D.lowBox) return; bb.getCenter(c); const n = new THREE.BoxGeometry(sz.x, sz.y, sz.z); n.translate(c.x, c.y, c.z);
      saved += (g.index ? g.index.count : g.attributes.position.count) / 3 - 12; g.dispose(); o.geometry = n; });
    D.test.boxSaved = saved;
    A.onEnter = () => { if (!(S.adv > 0)) { step('adv', 1); greet(); } };
    A.onExit = () => { closeMenu(); if (S.adv === 3) step('adv', 4); if (S.party) D.party.place = true; };
  };
  function greet() { room.greeted = true; return say([['CAKE', 'You look like you\'re about to order.'], ['SHAKE', 'He\'s going to order.'], ['FUZZY PEACH', 'Mm.'], ['STOVE', 'Ring the bell. It\'s by the coffee.']]), null; }
  function eat() {
    if (!room.plate.visible) return [['', 'There is no plate. There is a plate-shaped space on the counter.']];
    const k = D.test.lastOrder; room.plate.visible = false; if (room.prop) room.prop.visible = false; audio.ui?.('tick');
    return k === 'adv' ? [['', 'You fold the napkin map into your pocket.'], ['FUZZY PEACH', 'Don\'t eat it.'], ['WOLF', 'I wasn\'t going to.'], ['FUZZY PEACH', 'Mm.']]
      : k === 'pie' ? [['', 'You eat the card that says PIE.'], ['STOVE', 'That was the display.']]
      : k === 'shake' ? [['', 'You drink the water.'], ['SHAKE', 'Good. Hydrate.']]
      : [['', 'You eat the soup. It was soup.'], ['STOVE', 'Think about it.']];
  }
  function tick(dt, t) {
    if (!room) return; const R = room;
    for (const c of R.trio) { if (!hopTick(c, dt) && R.follow && !R.joining) { /* follow below */ } }
    if (R.follow && !R.joining) roomFollow(dt); else for (const c of R.trio) blend(c, !!c.hop && !c.hop.slide, dt);
    rr(R.trio, dt); for (const c of R.trio) squish(c, t, dt);
    if (R.cookT > 0) { R.cookT -= dt; R.stove.scale.y = R.stoveY * (1 + 0.05 * Math.sin(t * 26) * Math.min(1, R.cookT)); }
    else if (R.stove.scale.y !== R.stoveY) R.stove.scale.y = R.stoveY;
    for (const s of R.steam) if (s.visible) { s.userData.t += dt; const u = s.userData.t / 1.4; if (u >= 1) { s.visible = R.cookT > 0; s.userData.t = 0; }
      s.position.set(s.userData.x + Math.sin(u * 6 + s.userData.x * 9) * 0.05, 1.7 + u * 0.9, -2.3); s.scale.setScalar(0.6 + u); s.material.opacity = 0.8 * (1 - u); }
    if (R.bellT > 0) { R.bellT -= dt; R.dome.position.y = 0.02 - 0.012 * Math.max(0, Math.sin(R.bellT * 30)); }
    if (R.coffeeFill > 0) { R.coffeeFill -= dt; if (R.coffee) R.coffee.position.y = 1.19 + 0.012 * Math.sin(t * 20) * Math.min(1, R.coffeeFill); }
    if (R.fly) { const f = R.fly; f.t += dt; const u = Math.min(1, f.t / f.dur), e = ease(u); R.plate.position.lerpVectors(f.a, f.b, e); R.plate.position.y += Math.sin(Math.PI * u) * 0.75; R.plate.rotation.y = e * Math.PI * 2; if (u >= 1) R.fly = null; }
    for (const w of R.wisps) { w.position.y = 0.15 + ((t * 0.3 + w.position.x * 5) % 0.12); }
  }

  // ---------------------------------------------------------------- the party outside (town scene)
  const P = { rigs: null, loading: false, trail: [], place: true, shown: false };
  D.party = P;
  async function loadOutside() {
    P.loading = true; const ws = await Promise.all(TRIO.map(d => glb(d.file, d.h, d.look)));
    P.rigs = ws.map((w, i) => prep(w, TRIO[i])); for (const c of P.rigs) { c.o.visible = false; mainScene.add(c.o); } P.loading = false;
  }
  function placeBehind() { const p = wolfState.pos, y = wolfState.yaw; P.trail = [];
    P.rigs.forEach((c, i) => { const d = 1.3 * (i + 1); c.o.position.set(p.x - Math.sin(y) * d + (i - 1) * 0.5, 0, p.z - Math.cos(y) * d); c.o.rotation.y = y; c.o.visible = true; });
    for (let i = 0; i < 12; i++) P.trail.push(new THREE.Vector3(p.x - Math.sin(y) * i * 0.4, 0, p.z - Math.cos(y) * i * 0.4)); P.place = false; }
  function trailAt(dist) {   // a point `dist` metres back along the Wolf's path
    let acc = 0, prev = wolfState.pos; for (const q of P.trail) { const L = Math.hypot(q.x - prev.x, q.z - prev.z); if (acc + L >= dist) { const k = (dist - acc) / Math.max(1e-4, L); return _v.set(prev.x + (q.x - prev.x) * k, 0, prev.z + (q.z - prev.z) * k); } acc += L; prev = q; }
    return _v.copy(prev); }
  D.outside = (dt, t, walking) => {
    if (!S.party) return; if (!P.rigs) { if (!P.loading) loadOutside(); return; }
    if (!walking) { for (const c of P.rigs) c.o.visible = false; P.place = true; return; }
    if (P.place) placeBehind();
    const p = wolfState.pos, h = P.trail[0]; if (!h || Math.hypot(p.x - h.x, p.z - h.z) > 0.3) { P.trail.unshift(p.clone()); if (P.trail.length > 60) P.trail.pop(); }
    P.rigs.forEach((c, i) => { const tg = trailAt(1.35 * (i + 1)); const dx = tg.x - c.o.position.x, dz = tg.z - c.o.position.z, d = Math.hypot(dx, dz);
      if (d > 9) { c.o.position.set(tg.x, 0, tg.z); return; }
      const mv = d > 0.25; if (mv) { const sp = Math.min(d, dt * Math.max(1.4, Math.abs(wolfState.speed) * 1.05 + d * 0.8)); c.o.position.x += dx / d * sp; c.o.position.z += dz / d * sp; c.o.rotation.y = angTo(c.o.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8)); }
      else c.o.rotation.y = angTo(c.o.rotation.y, Math.atan2(p.x - c.o.position.x, p.z - c.o.position.z), Math.min(1, dt * 2));
      blend(c, mv, dt); if (c.acts?.walk) c.acts.walk.timeScale = mv ? THREE.MathUtils.clamp(Math.abs(wolfState.speed) / 1.6, 0.8, 1.6) : 1; });
    rr(P.rigs, dt); for (const c of P.rigs) squish(c, t, dt);
    D.test.outside = P.rigs.map(c => [c.o.position.x.toFixed(2), c.o.position.z.toFixed(2), c.moving.toFixed(2)]);
  };
  D.crow = () => [['CROW', 'That\'s a napkin.'], ['CAKE', 'It\'s a map.'], ['CROW', 'It\'s a map of the Diner.'], ['SHAKE', 'We were just in the Diner.'],
    ['CROW', 'Then you\'ve already been on the adventure.'], ['FUZZY PEACH', 'Again, then.'], ['CROW', 'X marks the spot.'], ['WOLF', 'This is the spot?'],
    ['CROW', 'Every spot is the spot. That\'s why they call it Sunspots.'], ['', 'The Crow adds the X to the collection.', () => step('adv', 5)], ['CAKE', 'Good adventure.'], ['SHAKE', 'Same time tomorrow.']];
  D.openMenu = openMenu; D.closeMenu = closeMenu; D.order = order; D.room = () => room;
  return D;
}
