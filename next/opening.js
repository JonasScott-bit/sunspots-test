// opening.js — Nov 16 2026: the cold open of a new game + Moth's cab waiting at spawn.
// Scott: "it doesn't lead in at all, just jumps right in", and the Wolf's own car parked at spawn with a big IN THE CAR
// button pulled him off the mission. Now, once per new game, before control:
//   1. Sunspots at 1:57 AM: a slow crane down Main St            } ~25 s, 2.39 letterbox, muted night, slow weighty moves,
//   2. the crew in the Wolf's front yard by the couch: out of snacks } a location / time super in the bottom bar,
//      (RAM "We're out." BEAR "Of what." RAM "All of it." ...)      } skippable (hold SKIP, or Esc / Enter)
//   3. the Wolf: "Two minutes. I can do two minutes."
//   4. Moth's cab walks up Mesa Rd on its boots, lights on, stops at the curb
//   5. Moth leans out of his window: "I am aware of the time."
// ONE opening (Nov 16 merge): the crew from the snack-run rework now waits in the yard for the Night 1 run (real cast
// models, not the toy figures), the ride is Moth's cab, the store is Paradise Bliss (dreamstore.js). The LATE NIGHT
// SNACK RUN replay and his own car only appear after Night 1. The clock starts when the cab pulls away (level.js).
// Control comes back on the Wolf's front walk, facing the waiting cab; the pulsing ring by the cab + GET IN do the rest.
// The Wolf's own car is not in the world until the snacks are delivered (level.js freeUnlocked).
// Runs on the scene director (scenes.js) through its public API only: anchors + SCENES + play. Clock frozen while it runs.
// ?noopening skips it; ?opening forces it again (QA).
import { Vector3 as THREE_V } from 'three';
import { crewGLB, breathe } from './missions/kit.js';
import { Mesh } from 'three';
// the town2 *_lo crew GLBs render as giant sheets when skinned outside their rooms (the clone's skin scale goes wrong);
// they only need to stand and breathe here, so swap each SkinnedMesh for a plain Mesh in its bind (rest) pose
function unskin(o) { const sk = []; o.traverse(m => { if (m.isSkinnedMesh) sk.push(m); }); if (!sk.length) return; if (o.userData) o.userData.rig = null;
  for (const m of sk) { const p = new Mesh(m.geometry, m.material); p.name = m.name; p.position.copy(m.position); p.quaternion.copy(m.quaternion); p.scale.copy(m.scale); m.parent.add(p); m.parent.remove(m); } }

// the crew waits in the Wolf's front yard by the couch until the snacks are home (real cast GLBs, breathing; no rigs)
const COUCH = [29.4, 51.6];
const CREW = [['bear', 1.9, COUCH[0] - 1.9, COUCH[1] + 1.6], ['heron', 2.0, COUCH[0] + 0.1, COUCH[1] + 2.0], ['ram', 1.75, COUCH[0] + 1.9, COUCH[1] + 1.6]];
export function installOpening(L, { toast } = {}) {
  const Q = new URLSearchParams(location.search), KEY = 'sunspots.opening';
  // ---- the DRAG TO WALK line: once per save, gone for good after the first walk
  { const h = document.getElementById('hint'); let done = false; try { done = !!localStorage.getItem('sunspots.hint'); } catch (_) {}
    if (h && done) h.style.display = 'none';
    else if (h) { const iv = setInterval(() => { if (getComputedStyle(h).opacity === '0' || (window.__sunspots?.wolfState?.speed || 0) > 0.5) { clearInterval(iv); try { localStorage.setItem('sunspots.hint', '1'); } catch (_) {} setTimeout(() => { h.style.display = 'none'; }, 1200); } }, 500); } }
  // ---- Night 1 on foot: one thing to do (get in the cab). Hide the HUD a first-timer doesn't need yet: the journal / sunspot
  // counter, GO (quick travel), WILD, the first-person eye and the minimap + compass. They all come back once he's in the cab
  // (the minimap helps on the drive) and for good after the snacks are home.
  if (!Q.has('oldtown')) {
    const st = document.createElement('style'); st.id = 'n1Css';
    st.textContent = 'body.n1 #jnBtn,body.n1 #qtBtn,body.n1 #wildBtn,body.n1 #eyeBtn,body.n1 #mmap{display:none!important}';
    document.head.appendChild(st);
    setInterval(() => { const on = L.mode === 'walk' && !L.ended && !!L.snacksDone && !L.snacksDone() && !window.__town?.active; if (on !== document.body.classList.contains('n1')) document.body.classList.toggle('n1', on); }, 250);
  }
  // ---- the crew in the yard (Night 1 only)
  const crew = {}; let crewOn = false;
  const S0w = () => window.__sunspots;
  (async () => { if (Q.has('oldtown')) return; for (const [k, h, x, z] of CREW) { try { const o = await crewGLB(k, h); unskin(o); o.position.set(x, 0, z); o.rotation.y = Math.atan2(25.4 - x, 54.4 - z); o.visible = false; o.userData.noAudit = false; crew[k] = o;
      const sc = (await new Promise(r => { const f = () => S0w()?.scene ? r(S0w().scene) : setTimeout(f, 200); f(); })); sc.add(o); L.colliders?.push({ x, z, r: 0.45, crew: k }); } catch (e) { console.warn('opening crew', k, e); } }
    let last = performance.now(); const tick2 = () => { const n = performance.now(), t = n / 1000; last = n;
      const on = !L.snacksDone?.() && !window.__snackrun?.S?.on && !window.__town?.active; if (on !== crewOn) { crewOn = on; for (const o of Object.values(crew)) o.visible = on; }
      if (on) for (const o of Object.values(crew)) breathe(o, t, {}); requestAnimationFrame(tick2); }; tick2(); })();
  L.openingCrew = crew;
  // the cold open: nobody looks at anybody, then ("It's his fridge.") all three look at the Wolf
  const turnCrew = (atWolf) => { for (const [k, , x, z] of CREW) { const o = crew[k]; if (o) o.rotation.y = atWolf ? Math.atan2(25.4 - x, 54.4 - z) : Math.atan2(x - 25.4, 62 - z) * 0.4 + (k === 'heron' ? 0.5 : k === 'bear' ? -0.6 : 0.3); } };
  if (Q.has('noopening') || Q.has('shot') || Q.get('scene') || Q.has('unlock') || Q.has('finale') || Q.get('room') || Q.get('m') || Q.has('oldtown')) return;
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (_) { return false; } };
  const CAB0 = [-6, 59.8], CAB = [27, 59.8], WOLF_AT = [25.9, 55.8], LEFT0 = L.left;
  let sup = null;
  function css() {
    if (document.getElementById('openingCss')) return;
    const st = document.createElement('style'); st.id = 'openingCss';
    st.textContent = `body.cine239 .lb{height:max(0px,calc((100vh - 100vw / 2.39) / 2))!important;transition:height .6s ease!important}
      @media (orientation:portrait){body.cine239 .lb{height:25vh!important}}
      #openSuper{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:9;pointer-events:none;color:#efe3cc;opacity:0;transition:opacity .9s;
        font:600 11px/1 Futura,Avenir,"Helvetica Neue",Arial,sans-serif;letter-spacing:.42em;text-transform:uppercase;white-space:nowrap;padding-bottom:max(10px,calc((100vh - 100vw / 2.39) / 4 - 5px))}
      @media (orientation:portrait){#openSuper{padding-bottom:calc(4vh + env(safe-area-inset-bottom))}}
      #openSuper b{font-weight:700;color:#fff6e2}#openSuper.on{opacity:.92}`;
    document.head.appendChild(st);
    sup = document.createElement('div'); sup.id = 'openSuper'; document.body.appendChild(sup);
  }
  let clockT = 0, clockRaf = 0;
  let place = 'SUNSPOTS';
  function superOn(on) { if (!sup) return; sup.classList.toggle('on', on); cancelAnimationFrame(clockRaf);
    if (on) { const t0 = performance.now(); const f = () => { const s = 18 + Math.floor((performance.now() - t0) / 1000); sup.innerHTML = `${place} &nbsp;·&nbsp; <b>1:57:${String(Math.min(29, s)).padStart(2, '0')} AM</b>`; clockRaf = requestAnimationFrame(f); }; f(); } }
  void clockT;

  function define(S0) {
    const D = S0.director, puppet = S0.puppet;
    D.anchors.home = () => ({ x: 0, z: 0, yaw: 0 });   // world frame: scene coordinates below are world metres
    const wolf = () => D.D.actors.wolf, cab = L.car;
    const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
    const setup = () => {
      try { localStorage.setItem(KEY, '1'); } catch (_) {}
      document.body.classList.add('cine239'); css(); place = 'SUNSPOTS'; superOn(true); turnCrew(false);
      cab.pos.set(CAB0[0], 0, CAB0[1]); cab.yaw = Math.PI / 2; cab.v = 0; cab.root.position.copy(cab.pos); cab.root.rotation.y = cab.yaw; cab.root.visible = true;
      const w = wolf(); puppet.on = true; puppet.speed = 0; w.setPos(WOLF_AT[0], WOLF_AT[1], 0); pose(); w.obj.scale.setScalar(puppet.base || w.obj.scale.x);
    };
    // (re)place the Wolf facing the crew. Called at the top and again right before his line: NEW GAME's reset can land
    // after the cold open has started and put him back on wolfStart (we were shooting the back of his head)
    const pose = () => { const w = wolf(), ws = S0.wolfState, y = yawTo(WOLF_AT, COUCH); puppet.on = true; puppet.speed = 0;
      w.setPos(WOLF_AT[0], WOLF_AT[1], 0); w.setYaw(y); ws.pos.set(WOLF_AT[0], 0, WOLF_AT[1]); ws.yaw = y; ws.speed = 0; };
    const finish = () => {
      superOn(false); document.body.classList.remove('cine239');
      cab.pos.set(CAB[0], 0, CAB[1]); cab.yaw = Math.PI / 2; cab.v = 0;
      const ws = S0.wolfState, w = wolf(); const y = yawTo(WOLF_AT, CAB);
      w.setPos(WOLF_AT[0], WOLF_AT[1], 0); w.setYaw(y); ws.pos.set(WOLF_AT[0], 0, WOLF_AT[1]); ws.yaw = y; ws.speed = 0;
      puppet.on = false; puppet.speed = 0; puppet.headYaw = 0; puppet.headTilt = 0;
      L.left = LEFT0;   // the cold open doesn't cost clock time
    };
    const C = (k, y = 1.45) => { const o = crew[k]; return o ? [o.position.x, y * (o.userData.h || 1.8) / 1.8, o.position.z] : [COUCH[0], y, COUCH[1] + 1.8]; };
    const PORTRAIT = innerHeight > innerWidth;   // the 2.39 frame is narrow on a phone held upright: wider lenses
    D.SCENES.opening = {
      anchor: 'home', blocking: true,
      beats: [
        { do: 'call', fn: setup },
        { do: 'audio', cue: 'amb_radio_outside', radio: 0 },
        // 1. Sunspots, 1:57 AM: a slow descending crane straight down Main St, lamps and neon, nobody about
        { do: 'cam', pos: [30, 15, 7.5], look: [-70, 1, 7], fov: 36, to: { pos: [20, 8.5, 7.2], look: [-70, 2, 7] }, dur: 4.6, ease: 'inout' },
        { wait: 0.4 },
        { do: 'say', who: 'ksun dj', text: 'KSUN 1490. One fifty-seven. Last Minute Snacks closes at two.', dur: 2.6 },
        { do: 'say', who: 'ksun dj', text: "If you're out of something, you're out of time.", dur: 2.0 },
        { do: 'call', fn: () => { place = 'MESA LANE'; } },
        // 2. Mesa Lane: the crew in the Wolf's front yard, by the couch. Slow push in from the street.
        { do: 'cam', pos: [29.0, 1.6, 58.4], look: [29.3, 1.15, 52.6], fov: PORTRAIT ? 64 : 40, to: { pos: [29.1, 1.5, 57.0], look: [29.3, 1.2, 52.8] }, dur: 9.5, ease: 'out' },
        { wait: 1.0 },
        { do: 'say', who: 'ram', text: "We're out.", dur: 1.4 },
        { do: 'say', who: 'bear', text: 'Of what.', dur: 1.2 },
        { do: 'say', who: 'ram', text: 'All of it.', dur: 1.5 },
        { do: 'say', who: 'heron', text: 'Store closes at two.', dur: 1.5 },
        { do: 'say', who: 'bear', text: "Two o'clock? I usually get there around three.", vo: 'vo_bear_10' },
        { do: 'call', fn: () => turnCrew(true) },
        { do: 'say', who: 'ram', text: "It's his fridge.", dur: 1.5 },
        // 3. the Wolf
        { do: 'call', fn: pose },
        { do: 'cam', pos: () => new THREE_V(27.7, 2.25, 53.6), look: () => { const h = wolf().headWorld(new THREE_V()); h.y -= 0.12; return h; }, fov: PORTRAIT ? 42 : 30 },   // high enough to clear his mailbox
        { do: 'say', who: 'wolf', text: 'Two minutes. I can do two minutes.', vo: 'vo_wolf_15' },
        // 4. headlights: Moth's cab walks up Mesa Rd on its boots and stops outside the house
        { do: 'cam', pos: [35.0, 0.75, 57.2], look: { who: 'car', y: 0.9 }, fov: 34 },
        { do: 'move', who: 'car', path: [[12, 59.8], [CAB[0], CAB[1]]], dur: 3.6, ease: 'out', endYaw: Math.PI / 2 },
        { do: 'audio', cue: 'sfx_boots_stop' },
        // 5. Moth leans out of his window at the Wolf (moth.js lean); one line
        { do: 'cam', pos: [25.1, 1.95, 54.9], look: { who: 'moth', head: true, dy: -0.1 }, fov: 32 },   // over the Wolf's shoulder
        { wait: 0.5 },
        { do: 'say', who: 'moth', text: 'I am aware of the time.', vo: 'vo_moth_16' },
        { do: 'audio', cue: 'radio_restore', radio: null },
        { do: 'call', fn: finish },
      ],
    };
  }

  let crewWait = 0;
  const tick = () => {
    const S0 = window.__sunspots, D = S0?.director;
    if (!S0 || !D || !D.D?.ready || !D.D.actors?.wolf?.obj || window.__titleUp || window.__paused || window.__town?.active) { setTimeout(tick, 200); return; }
    if ((seen() && !Q.has('opening')) || L.snacksDone?.() || L.mode !== 'walk' || L.ended || D.D.run) return;
    if (Object.keys(crew).length < CREW.length && crewWait++ < 60) { setTimeout(tick, 250); return; }   // the crew GLBs (up to ~15 s on a slow phone)
    if (!D.SCENES.opening) define(S0);
    if (!D.play('opening')) setTimeout(tick, 400);
  };
  setTimeout(tick, 0);
  void toast;
}
