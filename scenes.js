// scenes.js — Sunspots in-world MOTION SCENES ("cutscenes"), GTA-style: drive or walk into a zone and a little
// scene plays out with the cast, then control hands back (or an ending card comes up).
//
// ─── HOW IT FITS ──────────────────────────────────────────────────────────────────────────────────────────────
//   main.js creates the director after loading:  const director = createDirector(ctx)
//     director.update(dt, t)      every frame, BEFORE level.update   (triggers, timeline, actors, props)
//     director.camera(camera, dt) every frame, AFTER the player camera is computed (scene camera / hand-back blend,
//                                  world-anchored speech bubbles)
//     director.reset()            on retry (flags cleared, cast/props back to their start state)
//     director.play(name)         debug / scripted start (?scene=store_win|store_lose|roadside|handoff_test)
//   The SCENES table below is plain data (plus a few small callbacks). Add a scene = add an entry.
//
// ─── SCENE FIELDS ─────────────────────────────────────────────────────────────────────────────────────────────
//   anchor     name in ANCHORS: a local frame (origin + yaw). Every [x,z] / [x,y,z] in the beats is in this frame:
//              +z = anchor forward, +x = anchor left (store: +z = out of the door toward the lot, x = world x).
//   trigger    { at:[x,z], r, when:'car'|'foot'|'any', if:(S)=>bool }   (S.local = player pos in anchor frame)
//              no trigger = only starts via director.play()
//   blocking   true  -> player input frozen, scene camera, letterbox bars, bottom subtitles, hold-to-skip
//              false -> plays in the world while you keep driving: speech bubbles over the speakers, your camera
//   once       default true: a played flag (director.played), cleared on retry
//   endCamera  'blend' (default: ~0.9 s ease back into the player camera, control returns)
//              'hold'  (stay on the last shot: used by the ending scenes, the WIN/LOSE card goes on top)
//   stage(S)   optional: dress the set at load / retry (props + actors in their idle spots)
//   beats      the timeline, run in order. A beat with wait:true holds the timeline until it is done; wait:false
//              runs it in the background. { par:[...] } runs a group together and waits for all of it.
//
// ─── BEAT TYPES ───────────────────────────────────────────────── default wait ── blocking? ── non-blocking? ─────
//   cam      cut or eased dolly: {pos, look, fov, to:{pos,look,fov}, dur, ease, blend}     no      yes        ignored
//            pos/look: [x,y,z] anchor-local | 'actor' (its head) | {who, y} | {who, off:[x,y,z]} (actor-local)
//   say      subtitle line {who, text, dur}  (dur default ≈ 0.9 s + 55 ms/char, ≥ 1.6 s)        yes     subtitle   bubble
//   move     {who, path:[[x,z]..] | (S)=>path, speed | dur, ease, endYaw}  walk/drive a path  yes     yes        yes
//   exitCar  {who}  climb out of the boot car to its door (wolf, moth, squid, farm)           yes     yes        (yes)
//   place    {who, at:[x,z], yaw, show}  teleport;  hide {who}                                  no      yes        yes
//   anim     {who, clip}  moth: idle|walk|seated   all: nod                                    no      yes        yes
//   look     {who, at:'car'|'camera'|actor|[x,z], body, track:sec}  turn body / head           no      yes        yes
//   mill     {who, around:[x,z], r}  wander about until the scene is over (background)          no      yes        yes
//   wait     {wait: seconds}  (shorthand)                                                       yes     yes        yes
//   prop     {id, act, dur}  door open|close, sign flip, bolt lock, snacks show|hide, wheel spin   no      yes        yes
//   audio    {cue, radio}  fires window 'sunspots:audio' {cue} + window.__sceneAudio log; radio: duck the
//            moth's radio to a level (null = back to normal). No sound files yet: see CUES.     no      yes        yes
//   call     {fn:'win'|'lose'|(S)=>void}  game hooks                                           no      yes        yes
//   Skip (hold 0.6 s): running beats jump to their end state, the rest of the timeline runs instantly (lines and
//   audio are dropped, 'call' beats still fire), then the normal end/hand-back happens.
import * as THREE from 'three';

// ─── AUDIO CUES the scenes fire (placeholder names; nothing plays until a file is wired to the name) ───────────
export const CUES = {
  mus_store_arrive:     'Store arrival sting, 2–3 s. Dry, a little lounge-y; sits under the moth\'s radio.',
  sfx_boots_stop:       'Boot car waddling to a stop: 4–5 slowing felt boot steps + a soft "flump" as it settles.',
  sfx_car_door_open:    'Felt-muffled car door opening (used for each rider who gets out).',
  sfx_car_door_close:   'Same door closing, soft thump.',
  amb_radio_outside:    'The moth\'s "wild foreign music" heard from OUTSIDE the car (muffled, thin). Ducks under dialogue.',
  sfx_store_door_bell:  'Shop door opening with a small bell.',
  sfx_store_door_shut:  'Shop door shutting firmly (lose scene, in the Wolf\'s face).',
  sfx_sign_flip:        'Cardboard OPEN/CLOSED sign flipping on its string.',
  sfx_lock_clunk:       'Deadbolt turning. One clunk.',
  sfx_clock_tock:       'One big tower-clock tock (the 2:00 clock insert).',
  sfx_chip_bag:         'Crinkle of a chip bag being carried.',
  mus_win_tag:          'Tiny deadpan win tag (1–2 s) under the SNACKS ACQUIRED card.',
  mus_lose_tag:         'Deadpan lose tag: a single low felt note (1–2 s) under the CLOSED card.',
  sfx_wheel_spin:       'Roadside art: a bicycle wheel spinning on a stool, ticking spokes, slowing down.',
  amb_gallery_hush:     'Roadside art: faint gallery room-tone out in the desert (polite murmur, one cough).',
  // optional VO (one line each; the cast is deadpan): vo_<speaker>_<n> fired with every say beat
  // v8 (audio.js playCue): mus_store_arrive -> cue_store_arrival; sfx_boots_stop -> five slowing boot thuds + a bump;
  // sfx_car_door_open/close -> car door; sfx_store_door_shut -> car door shut pitched down (stand-in);
  // mus_win_tag / mus_lose_tag -> sting_win / sting_lose; amb_radio_outside -> the radio's outside muffle.
  // v10: mus_store_arrive -> cue_pro_readymade_last_snack (runs through the win); mus_win_tag -> Sting Suite A twang;
  // mus_lose_tag -> cue_pro_closed_in_my_face; mus_roadside -> cue_pro_wheel_on_a_stool; sting_roadside -> Sting Suite A rimshot chord;
  // radio_restore -> no sound (the beat's radio: null hands the radio back). say beats with vo: play that vo_* line (9 dB music duck).
  // Every other name is a logged silent no-op. Say beats get a non-verbal bark via ctx.onSay (moth barks, wolf grunts, cast mumbles).
};

// speaker label + subtitle colour (deadpan cast; colours from their costumes)
const SPEAKERS = {
  wolf:  ['WOLF', '#f6b23a'], moth: ['MOTH', '#ffb08a'], clerk: ['CLERK', '#c9a2ff'],
  squid: ['BANANA SQUID', '#f2d04a'], farm: ['FARMHAND', '#9fc0ff'], crow: ['CROW', '#cfd2e6'], ram: ['RAM', '#ead9b4'],
};

// ─── SCENES ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Store frame: origin at the store door on the ground, +z out across the parking lot. The boot car parks at
// PARK (nose to the store); its doors: driver (moth) on the -x side, the Wolf's on the +x side.
const PARK = [-1.6, 5.4], PARK_YAW = Math.PI;
const arrivePath = (S) => {               // from wherever the car entered the zone, curve in and stop at PARK
  const p = S.local;                      // car position in the store frame at the start of the scene
  return p.z > 9 ? [[PARK[0] + (p.x - PARK[0]) * 0.25, 9.6], PARK] : [[PARK[0], 8.2], PARK];
};
export const SCENES = {
  // WIN: made it before 2:00. ~18 s.
  store_win: {
    anchor: 'store', blocking: true, endCamera: 'hold',
    trigger: { at: [0, 11.5], r: 13, when: 'car', if: S => S.L.left > 0 },
    beats: [
      { do: 'audio', cue: 'mus_store_arrive' },
      { do: 'cam', pos: [8.5, 1.4, 17.5], look: { who: 'car', y: 1.0 }, fov: 40, blend: 0.8 },
      { do: 'move', who: 'car', path: arrivePath, ease: 'out', fit: 'arrive', endYaw: PARK_YAW },
      { do: 'audio', cue: 'sfx_boots_stop' },
      { wait: 0.5 },
      { do: 'cam', pos: { who: 'car', off: [2.9, 1.45, 1.3] }, look: { who: 'moth', head: true, dy: -0.05 }, fov: 34 },
      { wait: 0.35 },
      { do: 'say', who: 'moth', text: 'Destination.', vo: 'vo_moth_01' },
      { do: 'audio', cue: 'amb_radio_outside', radio: 0.45 },
      { do: 'cam', pos: [3.4, 1.55, 1.4], look: [-1.4, 1.0, 6.2], fov: 46 },
      { par: [
        { do: 'audio', cue: 'sfx_car_door_open' },
        { do: 'exitCar', who: 'wolf' },
        { do: 'exitCar', who: 'squid', delay: 0.25 },
        { do: 'exitCar', who: 'farm', delay: 0.45 },
        { do: 'exitCar', who: 'moth', delay: 0.6 },
      ] },
      { do: 'audio', cue: 'sfx_car_door_close' },
      { do: 'mill', who: 'squid', around: [-4.6, 8.0], r: 2.2 },
      { do: 'mill', who: 'farm', around: [3.4, 7.6], r: 2.0 },
      { do: 'look', who: 'moth', at: [0, 0], body: true },
      { do: 'cam', pos: [4.2, 1.35, 5.6], look: { who: 'wolf', y: 1.05 }, fov: 42 },   // side-on: the car sits left of frame, the door clear
      { do: 'move', who: 'wolf', path: [[0.1, 3.0], [0, 1.0]], speed: 1.5 },
      { do: 'prop', id: 'door', act: 'open' }, { do: 'audio', cue: 'sfx_store_door_bell' },
      { do: 'move', who: 'wolf', path: [[0, -0.2]], speed: 1.2 },
      { do: 'hide', who: 'wolf' },
      { do: 'prop', id: 'door', act: 'close', wait: true },
      { do: 'cam', pos: [6.6, 1.45, 10.8], look: [-1.2, 1.0, 5.2], fov: 46 },
      { wait: 0.6 },
      { do: 'say', who: 'squid', text: "He's been in there a while.", vo: 'vo_squid_01' },
      { do: 'say', who: 'farm', text: 'Eleven seconds.', vo: 'vo_farmhand_01' },
      { wait: 0.4 },
      { do: 'cam', pos: [1.7, 1.3, 4.9], look: [0, 1.15, 0.6], fov: 40 },
      { do: 'prop', id: 'door', act: 'open', wait: true }, { do: 'audio', cue: 'sfx_store_door_bell' },
      { do: 'prop', snacks: true, id: 'snacks', act: 'show' },             // after the door is open, or the bag pokes through it
      { do: 'place', who: 'wolf', at: [0, -0.2], yaw: 0, show: true },
      { do: 'audio', cue: 'sfx_chip_bag' },
      { do: 'say', who: 'clerk', text: 'Enjoy your snacks. Responsibly. Slowly. Elsewhere.', vo: 'vo_clerk_14', wait: false },   // v10: offscreen, from inside the store
      { do: 'move', who: 'wolf', path: [[0.15, 1.2], [0.3, 2.3]], speed: 1.25 },
      { do: 'prop', id: 'door', act: 'close' },
      { do: 'look', who: 'wolf', at: 'camera', body: true, dur: 0.5 },
      { wait: 1.3 },                                                     // lets the clerk finish (v9: 0.3)
      { do: 'say', who: 'wolf', text: 'They had exactly one kind of snack. One.', vo: 'vo_wolf_01' },
      { do: 'cam', pos: [2.6, 1.5, 0.7], look: [-1.0, 1.1, 3.6], fov: 44, to: { pos: [3.4, 1.9, -0.1], look: [-1.0, 1.05, 3.8], fov: 48 }, dur: 5, ease: 'inout' },   // two-shot from the doorway: Wolf + moth, car behind
      { do: 'look', who: 'moth', at: 'wolf', body: true },
      { do: 'say', who: 'moth', text: 'Five stars is customary.', vo: 'vo_moth_02' },
      { do: 'audio', cue: 'mus_win_tag' },
      { do: 'call', fn: 'win' },
    ],
  },

  // LOSE: got there after 2:00. The clerk (heron) flips the sign and locks the door in the Wolf's face. ~13 s.
  store_lose: {
    anchor: 'store', blocking: true, endCamera: 'hold',
    trigger: { at: [0, 11.5], r: 13, when: 'car', if: S => S.L.left <= 0 },
    beats: [
      { do: 'prop', id: 'door', act: 'open', dur: 0 },
      { do: 'place', who: 'clerk', at: [0.25, 0.5], yaw: 0, show: true },
      { do: 'cam', pos: [8.5, 1.4, 17.5], look: { who: 'car', y: 1.0 }, fov: 40, blend: 0.8 },
      { do: 'move', who: 'car', path: arrivePath, ease: 'out', fit: 'arrive', endYaw: PARK_YAW },
      { do: 'audio', cue: 'sfx_boots_stop' },
      { do: 'cam', pos: [8.2, 5.6, 5.4], look: [11.1, 7.1, -2.3], fov: 30 },       // insert: the 2:00 clock
      { do: 'audio', cue: 'sfx_clock_tock' },
      { wait: 1.3 },
      { do: 'audio', cue: 'amb_radio_outside', radio: 0.45 },
      { do: 'cam', pos: [-4.4, 1.6, 10.6], look: [0, 1.25, 1.2], fov: 40 },
      { do: 'audio', cue: 'sfx_car_door_open' },
      { do: 'exitCar', who: 'wolf' },
      { do: 'look', who: 'clerk', at: 'wolf', track: 6 },
      { do: 'move', who: 'wolf', path: [[0.05, 3.4], [0, 1.95]], speed: 1.45 },
      { do: 'cam', pos: [2.7, 1.5, 2.7], look: [-0.25, 1.35, 1.0], fov: 40 },
      { wait: 0.35 },
      { do: 'say', who: 'clerk', text: 'Closed.', vo: 'vo_clerk_01' },
      { do: 'hide', who: 'clerk' },
      { do: 'prop', id: 'door', act: 'close', dur: 0.35, wait: true }, { do: 'audio', cue: 'sfx_store_door_shut' },
      { do: 'prop', id: 'sign', act: 'flip', wait: true }, { do: 'audio', cue: 'sfx_sign_flip' },
      { do: 'prop', id: 'bolt', act: 'lock' }, { do: 'audio', cue: 'sfx_lock_clunk' },
      { do: 'cam', pos: [0.3, 1.52, 0.62], look: { who: 'wolf', head: true, dy: -0.05 }, fov: 34 },   // the Wolf's face
      { wait: 0.5 },
      { do: 'say', who: 'wolf', text: 'Locked. They actually locked it.', vo: 'vo_wolf_20' },   // v10: was a 1.7 s silent beat
      { do: 'say', who: 'clerk', text: 'Two o\'clock is two o\'clock.', vo: 'vo_clerk_02' },
      { do: 'cam', pos: [3.0, 1.6, 8.8], look: [-0.2, 1.3, 1.2], fov: 40, to: { pos: [3.6, 2.0, 11.0] }, dur: 4, ease: 'inout' },
      { wait: 0.4 },
      { do: 'say', who: 'moth', text: 'The meter is still running.', vo: 'vo_moth_03' },
      { do: 'say', who: 'wolf', text: 'Tomorrow. We leave at noon.', vo: 'vo_wolf_22' },
      { do: 'audio', cue: 'mus_lose_tag' },
      { do: 'call', fn: 'lose' },
    ],
  },

  // ROADSIDE (non-blocking): a Duchamp bicycle wheel on a felt stool, out in the desert, with two gallery-goers.
  // You keep driving; they talk in bubbles and turn their heads to watch the boot car go by.
  roadside: {
    anchor: 'roadside', blocking: false,
    trigger: { at: [0, -34], r: 26, when: 'car', if: S => S.local.z < -8 },   // ~60 m before the art: the 4 lines land as you pass it at cruising speed
    stage: S => S.stageRoadside(),
    beats: [
      { do: 'audio', cue: 'amb_gallery_hush' },
      { do: 'audio', cue: 'mus_roadside', radio: 0.25 },                 // v10: Wheel on a Stool (25 s cut) over the art; the radio sinks
      { do: 'prop', id: 'wheel', act: 'spin' }, { do: 'audio', cue: 'sfx_wheel_spin' },
      { do: 'say', who: 'crow', text: 'Is it art?', dur: 1.5, vo: 'vo_crow_01' },
      { do: 'say', who: 'ram', text: "It's on a stool.", dur: 1.6, vo: 'vo_ram_01' },
      { do: 'look', who: 'crow', at: 'car', track: 6 },
      { do: 'look', who: 'ram', at: 'car', track: 6 },
      { do: 'say', who: 'crow', text: 'That car has boots.', dur: 1.7, vo: 'vo_crow_02' },
      { do: 'say', who: 'ram', text: 'So does everyone.', dur: 1.8, vo: 'vo_ram_02' },
      { do: 'audio', cue: 'sting_roadside' },                            // Sting Suite A, the rimshot chord: the punchline
      { wait: 0.6 },
      { do: 'say', who: 'crow', text: 'Five stars. For the composition.', vo: 'vo_crow_12' },
      { do: 'say', who: 'ram', text: 'Fine. One star. For the wheel.', vo: 'vo_ram_11' },
      { do: 'audio', cue: 'radio_restore', radio: null },
    ],
  },

  // debug only (?scene=handoff_test): a blocking scene that ends with the normal blend back to the player camera
  handoff_test: {
    anchor: 'car', blocking: true,
    beats: [
      { do: 'cam', pos: { who: 'car', off: [5, 2.2, 4] }, look: { who: 'car', y: 1.1 }, fov: 42, blend: 0.8,
        to: { pos: { who: 'car', off: [-5, 2.2, 4] } }, dur: 3.2, ease: 'inout' },
      { wait: 0.6 },
      { do: 'say', who: 'moth', text: 'This is a test of the scene system.' },
      { do: 'say', who: 'moth', text: 'It went fine.' },
    ],
  },
};

// ─── DIRECTOR ────────────────────────────────────────────────────────────────────────────────────────────────────
export function createDirector(ctx) {
  const { scene, L, CK, load, normalize, feltMat, rbox, puppet, getWolf, getMoth } = ctx;
  const V = () => new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const EASE = { linear: k => k, in: k => k * k, out: k => 1 - (1 - k) * (1 - k), inout: smooth, walk: k => 0.6 * k + 0.4 * smooth(k) };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const $ = id => document.getElementById(id);
  const ui = { sub: $('sceneSub'), subName: $('sceneSubName'), subText: $('sceneSubText'), skip: $('skipBtn'), ring: $('skipBtn')?.querySelector('.ring'), bubbles: $('bubbles') };
  const D = { played: new Set(), run: null, bg: [], ready: false, actors: {}, props: {}, cam: null, out: null, hold: null, t: 0 };
  window.__sceneAudio = window.__sceneAudio || [];

  // ── anchors: local frames for scene coordinates
  const ANCHORS = {
    store: () => ({ x: 90, z: -1011.5, yaw: 0 }),
    roadside: (() => { let a = null; return () => { if (a) return a; const s = L.MAIN.s; let bi = 0, bd = 1e9;
      s.forEach((v, i) => { const d = (v.x - 74) ** 2 + (v.z + 605) ** 2; if (d < bd) { bd = d; bi = i; } });
      const r = L.atDist(L.MAIN, L.MAIN.cum[bi]); a = { x: r.x, z: r.z, yaw: r.yaw, d: L.MAIN.cum[bi] }; return a; }; })(),
    car: () => ({ x: L.car.pos.x, z: L.car.pos.z, yaw: L.car.yaw }),
  };
  const toWorld = (A, x, y, z, out = V()) => { const c = Math.cos(A.yaw), s = Math.sin(A.yaw); return out.set(A.x + x * c + z * s, y, A.z - x * s + z * c); };
  const toLocal = (A, p, out = V()) => { const dx = p.x - A.x, dz = p.z - A.z, c = Math.cos(A.yaw), s = Math.sin(A.yaw); return out.set(dx * c - dz * s, p.y || 0, dx * s + dz * c); };

  // ── actors: a common little interface over the Wolf (puppet in main.js), the moth (moth.js), the boot car and
  //    scene-loaded GLB cast. pos/yaw are world space.
  function baseActor(name, obj) {
    const [label, color] = SPEAKERS[name] || [name.toUpperCase(), '#fff3dc'];
    return { name, label, color, obj, speed: 0, look: null, nod: -1, headYaw: 0, h: 1.7,
      getPos(out) { return out.copy(this.obj.position); }, setPos(x, z, y) { this.obj.position.x = x; this.obj.position.z = z; if (y !== undefined) this.obj.position.y = y; },
      getYaw() { return this.obj.rotation.y; }, setYaw(y) { this.obj.rotation.set(0, y, 0); },
      setSpeed(v) { this.speed = v; }, show(v) { this.obj.visible = v; },
      headWorld(out) { if (this.head) return this.head.getWorldPosition(out); return this.getPos(out).setY(this.h * 0.9); } };
  }
  function glbActor(name, g, h) {
    const holder = new THREE.Group(), m = normalize(g.scene, h);
    m.traverse(k => { if (k.isMesh) { k.castShadow = k.receiveShadow = true; k.frustumCulled = false; for (const mt of [].concat(k.material)) { mt.roughness = 1; mt.metalness = 0; } } });
    holder.add(m); holder.visible = false; scene.add(holder);
    const a = baseActor(name, holder); a.h = h; a.body = m; a.sy = m.scale.y; a.ph = Math.random() * 6.28; a.w = 0;
    // v10 arms-down rigs carry named idle/walk/run clips (A-pose bind, so idle always fills what walk leaves); older files: one walk clip over the bind pose
    const clip = n => g.animations.find(c => c.name === n);
    a.mixer = new THREE.AnimationMixer(m); const wc = clip('walk') || g.animations[0], ic = clip('idle');
    if (wc) { a.act = a.mixer.clipAction(wc); a.act.play(); a.act.setEffectiveWeight(ic ? 0.001 : 0); }
    if (ic) { a.idle = a.mixer.clipAction(ic); a.idle.play(); a.idle.time = Math.random() * ic.duration; }
    m.traverse(k => { if (k.isBone && !a.head && /^head$/i.test(k.name)) a.head = k; });
    a.tick = (dt, t) => {
      a.w = lerp(a.w, clamp(a.speed / 0.7, 0, 1), 1 - Math.exp(-dt * 7));
      if (a.act) { a.act.setEffectiveWeight(a.idle ? Math.max(a.w, 0.001) : a.w); a.act.timeScale = clamp(a.speed / 1.0, 0.7, 1.4); }
      const idle = 1 - a.w; if (a.idle) a.idle.setEffectiveWeight(idle);
      else { m.scale.y = a.sy * (1 + idle * 0.014 * Math.sin(t * 1.9 + a.ph)); m.rotation.z = idle * 0.025 * Math.sin(t * 0.5 + a.ph); }
      a.mixer.update(dt); if (a.head && holder.visible) applyHead(a, dt);
    };
    return a;
  }
  const _pq = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qx = new THREE.Quaternion(), _hv = V();
  function applyHead(a, dt) { // head look/nod on top of the animation, in world axes (rig-agnostic)
    let want = 0;
    if (a.look && a.look.head) { const tp = resolvePoint(a.look.at, _hv); if (tp) want = clamp(wrap(Math.atan2(tp.x - a.obj.position.x, tp.z - a.obj.position.z) - a.getYaw()), -1.1, 1.1); }
    a.headYaw = lerp(a.headYaw, want, 1 - Math.exp(-dt * 5));
    const nod = a.nod >= 0 ? Math.sin(clamp(a.nod / 0.9, 0, 1) * Math.PI) * 0.32 : 0; if (a.nod >= 0) { a.nod += dt; if (a.nod > 0.9) a.nod = -1; }
    if (Math.abs(a.headYaw) < 1e-3 && !nod) return;
    a.obj.updateMatrixWorld(true); a.head.parent.getWorldQuaternion(_pq);
    _qw.setFromAxisAngle(UP, a.headYaw); const yaw = a.getYaw(); _qx.setFromAxisAngle(_hv.set(Math.cos(yaw), 0, -Math.sin(yaw)), nod); _qw.multiply(_qx);
    const pqi = _pq.clone().invert(); a.head.quaternion.premultiply(pqi.multiply(_qw).multiply(_pq));
  }
  // the Wolf: main.js poses the gait from puppet.speed / puppet.headYaw while puppet.on
  function wolfActor() {
    const w = getWolf(); const a = baseActor('wolf', w); a.h = 1.75;
    a.setSpeed = v => { a.speed = v; puppet.speed = v; };
    a.headWorld = out => { const hb = w.userData.head?.bone; if (hb) { w.updateMatrixWorld(true); return hb.getWorldPosition(out); } return out.copy(w.position).setY(1.6); };
    a.tick = (dt) => { let want = 0; if (a.look && a.look.head) { const tp = resolvePoint(a.look.at, _hv); if (tp) want = clamp(wrap(Math.atan2(tp.x - w.position.x, tp.z - w.position.z) - w.rotation.y), -0.9, 0.9); }
      puppet.headYaw = lerp(puppet.headYaw || 0, want, 1 - Math.exp(-dt * 5)); puppet.headTilt = a.nod >= 0 ? Math.sin(clamp(a.nod / 0.9, 0, 1) * Math.PI) * 0.3 : 0; if (a.nod >= 0) { a.nod += dt; if (a.nod > 0.9) a.nod = -1; } };
    return a;
  }
  function mothActor() {
    const a = baseActor('moth', null); a.h = 1.7;
    Object.defineProperty(a, 'obj', { get: () => getMoth()?.holder || L.car.driver });
    a.getPos = out => a.obj.getWorldPosition(out);
    a.getYaw = () => { const M = getMoth(); return M && M.state === 'scene' ? M.holder.rotation.y : L.car.yaw; };
    a.setYaw = y => { const M = getMoth(); if (M && M.state === 'scene') M.holder.rotation.set(0, y, 0); };
    a.setPos = (x, z, y) => { const M = getMoth(); if (M && M.state === 'scene') { M.holder.position.x = x; M.holder.position.z = z; if (y !== undefined) M.holder.position.y = y; } };
    a.setSpeed = v => { a.speed = v; const M = getMoth(); if (M && M.state === 'scene') M.play(v > 0.25 ? 'walk' : 'idle'); };
    a.headWorld = out => { const M = getMoth(); if (M?.B?.Head) return M.B.Head.getWorldPosition(out); return a.getPos(out).setY(1.5); };
    a.show = v => { const M = getMoth(); if (M) M.holder.visible = v; };
    a.tick = () => {};
    return a;
  }
  function carActor() {
    const c = L.car, a = baseActor('car', c.root); a.h = 1.2;
    a.getPos = out => out.set(c.pos.x, 0, c.pos.z); a.setPos = (x, z) => { c.pos.x = x; c.pos.z = z; };
    a.getYaw = () => c.yaw; a.setYaw = y => { c.yaw = y; }; a.setSpeed = v => { a.speed = v; c.v = v; };
    a.headWorld = out => out.set(c.pos.x, 1.3, c.pos.z); a.tick = () => {};
    return a;
  }

  // ── props for the store ending + the roadside art piece (built once; stage() resets their state)
  function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  const label = (txt, bg, fg, w = 512, h = 200, font = 'bold 120px Futura, Avenir, sans-serif', sub) => canvasTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font; c.fillText(txt, w / 2, sub ? h * 0.38 : h / 2); if (sub) { c.font = 'italic 44px Futura, Avenir, sans-serif'; c.fillText(sub, w / 2, h * 0.75); } });
  function buildStoreProps() {
    const A = ANCHORS.store(), g = new THREE.Group(); g.position.set(A.x, 0, A.z); scene.add(g);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.6), new THREE.MeshBasicMaterial({ color: '#1e1626' })); dark.position.set(0, 1.3, 0.09); g.add(dark);
    const hinge = new THREE.Group(); hinge.position.set(-1.0, 0, 0.14); g.add(hinge);
    const panel = rbox(2.0, 2.5, 0.1, 0.05, '#6a4430'); panel.position.set(1.0, 0, 0); hinge.add(panel);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.05), feltMat('#2c3b52')); glass.position.set(1.0, 1.72, 0.056); hinge.add(glass);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10), feltMat('#d9a441')); handle.position.set(1.78, 1.12, 0.1); hinge.add(handle);
    const bolt = rbox(0.16, 0.06, 0.05, 0.02, '#d9a441'); bolt.position.set(1.72, 1.32, 0.09); hinge.add(bolt);
    const sign = new THREE.Group(); sign.position.set(1.0, 1.66, 0.075); hinge.add(sign);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.32), new THREE.MeshStandardMaterial({ map: label('OPEN', '#9fd6b8', '#24331f'), roughness: 1 }));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.32), new THREE.MeshStandardMaterial({ map: label('CLOSED', '#e2574c', '#fff3dc'), roughness: 1 })); back.rotation.y = Math.PI; back.position.z = -0.004;
    sign.add(front, back);
    for (const m of [panel, glass, handle, bolt, front, back]) m.castShadow = true;
    D.props.door = { ang: 0, set(v) { this.ang = v; hinge.rotation.y = v; }, act(a, b) { const to = a === 'open' ? -1.75 : 0, from = this.ang; return tween(b.dur ?? 0.45, k => this.set(lerp(from, to, k)), 'inout'); } };
    D.props.sign = { ang: 0, set(v) { this.ang = v; sign.rotation.y = v; }, act(a, b) { const from = this.ang, to = b.to === 'open' ? 0 : Math.PI; return tween(b.dur ?? 0.4, k => this.set(lerp(from, to, k)), 'inout'); } };
    D.props.bolt = { set(v) { bolt.position.x = 1.72 + v * 0.17; }, act(a, b) { return tween(b.dur ?? 0.2, k => this.set(a === 'unlock' ? 1 - k : k), 'in'); } };
    // the snacks: one felt bag of chips, hanging from the Wolf's right paw (v10 arms-down rig); falls back to the chest tuck if the rig has no hand bone
    const snacks = new THREE.Group();
    const bag = rbox(0.4, 0.5, 0.13, 0.06, '#e2574c'); bag.position.y = -0.25; snacks.add(bag);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16), new THREE.MeshStandardMaterial({ map: label('CHIPS', '#ffe7a8', '#a2302a', 256, 128, 'bold 74px Futura, Avenir, sans-serif'), roughness: 1 })); lab.position.set(0, 0.0, 0.07); snacks.add(lab);
    const crimp = rbox(0.42, 0.06, 0.09, 0.02, '#c9463d'); crimp.position.y = 0.24; snacks.add(crimp);
    snacks.rotation.set(-0.15, 0, 0.35); snacks.visible = false; snacks.traverse(o => { if (o.isMesh) o.castShadow = true; });
    D.props.snacks = { act(a) { const w = getWolf(); if (a === 'show') { const hb = w.getObjectByName('RightHand');
          if (hb) { w.updateMatrixWorld(true); const ws = new THREE.Vector3(), wq = new THREE.Quaternion(), hp = new THREE.Vector3(); hb.getWorldScale(ws); hb.getWorldPosition(hp);
            hb.add(snacks); snacks.scale.setScalar(1 / ws.x); w.getWorldQuaternion(wq); snacks.quaternion.copy(hb.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(wq)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0.2)));
            hp.y -= 0.17; snacks.position.copy(hb.worldToLocal(hp)); }
          else { w.add(snacks); const s = 1 / (w.scale.x || 1); snacks.scale.setScalar(s); snacks.position.set(0.12 * s, 1.12 * s, 0.3 * s); snacks.rotation.set(-0.15, 0, 0.35); } snacks.visible = true; } else snacks.visible = false; return null; }, hide() { snacks.visible = false; } };
    D.props.store = { reset() { D.props.door.set(0); D.props.sign.set(0); D.props.bolt.set(0); D.props.snacks.hide(); } };
  }
  function buildRoadside() {
    const A = ANCHORS.roadside(), g = new THREE.Group(); scene.add(g);
    const at = toWorld(A, -9.5, 0, 0); g.position.copy(at); g.rotation.y = A.yaw;
    ctx.colliders?.push({ x: at.x, z: at.z, r: 0.7 });
    // Duchamp, Bicycle Wheel (1913): a fork + wheel mounted upside down on a kitchen stool. All felt, no faces.
    const STOOL = '#f3e6cc', FORK = '#3a3440';
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 28), feltMat(STOOL)); seat.position.y = 0.66; g.add(seat);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.66, 8), feltMat(STOOL)); l.position.set(Math.cos(a) * 0.24, 0.33, Math.sin(a) * 0.24); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(l); }
    const fork = new THREE.Group(); fork.position.y = 0.7; g.add(fork);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8), feltMat(FORK)); stem.position.y = 0.21; fork.add(stem);
    for (const sx of [-0.05, 0.05]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 8), feltMat(FORK)); b.position.set(sx, 0.72, 0); fork.add(b); }
    const wheel = new THREE.Group(); wheel.position.y = 1.05; fork.add(wheel);              // axle along x: seen face-on from the road
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 40), feltMat('#2a2630')); rim.rotation.y = Math.PI / 2; wheel.add(rim);
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.66, 4), feltMat('#d8d0c0')); s.rotation.x = i / 12 * Math.PI; wheel.add(s); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), feltMat('#d9a441')); hub.rotation.z = Math.PI / 2; wheel.add(hub);
    // museum placard on a little post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), feltMat('#8a5a34')); post.position.set(0.2, 0.45, 1.1); g.add(post);
    const plac = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshStandardMaterial({ map: label('UNTITLED (WHEEL)', '#f6efe0', '#3a2418', 512, 240, 'bold 54px Futura, Avenir, sans-serif', 'felt, stool, 1913'), roughness: 1 }));
    plac.position.set(0.2, 0.95, 1.12); plac.rotation.set(-0.35, Math.PI / 2, 0, 'YXZ'); g.add(plac);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    D.props.wheel = { w: 0, act(a, b) { this.w = b.speed ?? 8; return null; }, tick(dt) { if (this.w > 0.01) { wheel.rotation.x += this.w * dt; this.w *= Math.exp(-dt * 0.3); } } };
    D.roadsideAt = (x, z) => [x, z];
  }
  const S = { L, CK, local: V(), stageRoadside() { // the two gallery-goers stand in front of the wheel
    place(D.actors.crow, [-8.4, -1.7], 0.0 - 2.3, true); place(D.actors.ram, [-10.6, -1.2], 2.2, true);
    for (const n of ['crow', 'ram']) if (D.actors[n]) { D.actors[n].look = null; D.actors[n].headYaw = 0; }
  } };

  // ── small task helpers
  function tween(dur, fn, ease = 'inout') { const e = EASE[ease] || EASE.inout; let t = 0; if (dur <= 0) { fn(1); return null; }
    return { update(dt) { t += dt; fn(e(clamp(t / dur, 0, 1))); return t >= dur; }, finish() { fn(1); } }; }
  function place(a, at, yaw, show) { if (!a) return; const A = D.curA || ANCHORS.store(); if (at) { const p = toWorld(D.placeA || A, at[0], 0, at[1]); a.setPos(p.x, p.z, a.name === 'car' ? undefined : 0); }
    if (yaw !== undefined) a.setYaw((D.placeA || A).yaw + yaw); if (show !== undefined) a.show(show); }
  const ACTOR_CAR_DOOR = { wolf: [-1.65, -0.1], moth: [1.65, -0.1], squid: [1.65, -1.05], farm: [-1.65, -1.05] };

  // resolve a camera / look target to a world point
  const _cam = new THREE.PerspectiveCamera();
  function resolvePoint(spec, out) {
    const A = D.curA;
    if (spec == null) return null;
    if (typeof spec === 'function') return out.copy(spec(S));
    if (Array.isArray(spec)) return spec.length === 2 ? toWorld(A, spec[0], 1.2, spec[1], out) : toWorld(A, spec[0], spec[1], spec[2], out);
    if (spec === 'camera') return out.copy(ctx.camera.position);
    if (typeof spec === 'string') { const a = D.actors[spec]; return a ? a.headWorld(out) : null; }
    const a = D.actors[spec.who]; if (!a) return null;
    if (spec.off) { a.getPos(out); const y = a.getYaw(), c = Math.cos(y), s = Math.sin(y), [ox, oy, oz] = spec.off; return out.set(out.x + ox * c + oz * s, oy, out.z - ox * s + oz * c); }
    if (spec.head) { a.headWorld(out); out.y += spec.dy || 0; return out; }
    a.getPos(out); out.y = spec.y ?? 1.2; return out;
  }

  // ── beats
  // v10: a beat with a voice line (b.vo) lasts at least the clip + 0.35 s
  function sayDur(b) { const d = b.dur ?? Math.max(1.6, 0.9 + b.text.length * 0.055), v = b.vo ? (ctx.voDur?.(b.vo) || 0) : 0; return v ? Math.max(d, v + 0.35) : d; }
  function startBeat(b, run, instant) {
    if (typeof b.wait === 'number' && !b.do) return instant ? null : tween(b.wait, () => {});
    if (b.par) { const kids = b.par.map(k => { const tk = startBeat(k, run, instant); return tk; }).filter(Boolean); if (!kids.length) return null;
      return { update(dt) { for (let i = kids.length - 1; i >= 0; i--) if (kids[i].update(dt)) kids.splice(i, 1); return !kids.length; }, finish() { for (const k of kids) k.finish?.(); kids.length = 0; } }; }
    const a = b.who ? D.actors[b.who] : null;
    if (b.delay && !instant) { let t = 0, inner = null; return { update(dt) { if (!inner) { t += dt; if (t < b.delay) return false; inner = startBeat({ ...b, delay: 0 }, run, false); if (!inner) return true; } return inner.update(dt); }, finish() { if (!inner) inner = startBeat({ ...b, delay: 0 }, run, false); inner?.finish?.(); } }; }
    let task = null;
    switch (b.do) {
      case 'cam': if (run.sc.blocking) { D.cam = { b, t: 0, from: instant ? null : (b.blend ? currentPose() : null) }; if (instant) D.cam.t = b.dur || 0; } if (b.wait) task = tween(b.dur || 0, () => {}); break;
      case 'say': if (instant) break; task = sayTask(b, a); break;
      case 'move': if (a) task = moveTask(a, b, run); break;
      case 'exitCar': if (a) task = exitTask(a, b); break;
      case 'place': D.placeA = run.A; place(a, b.at, b.yaw, b.show); D.placeA = null; break;
      case 'hide': a?.show(false); break;
      case 'anim': if (b.clip === 'nod') { if (a) a.nod = 0; } else if (a?.name === 'moth') getMoth()?.play(b.clip); break;
      case 'look': if (a) task = lookTask(a, b); break;
      case 'mill': if (a) { const m = millTask(a, b, run); run.bg.push(m); a.moveTask = m; } break;
      case 'prop': { const p = D.props[b.id]; task = p?.act?.(b.act, b) || null; break; }
      case 'audio': if ('radio' in b) L.radioOverride = b.radio; if (!instant) cue(b.cue, run); break;
      case 'call': if (typeof b.fn === 'function') b.fn(S); else if (b.fn === 'win') L.finish(true); else if (b.fn === 'lose') L.finish(false); break;
      default: console.warn('scene: unknown beat', b);
    }
    if (task && instant) { task.finish?.(); return null; }
    const waits = b.wait ?? (b.do === 'say' || b.do === 'move' || b.do === 'exitCar');
    if (task && !waits) { run.side.push(task); return null; }
    return task;
  }
  function cue(name, run) {
    const e = { cue: name, scene: run.name, t: +performance.now().toFixed(0) }; window.__sceneAudio.push(e);
    try { window.dispatchEvent(new CustomEvent('sunspots:audio', { detail: e })); } catch (_) {}
    ctx.playCue?.(name);
  }
  function sayTask(b, a) {
    const dur = sayDur(b) * (D.run && !D.run.sc.blocking ? 0.95 : 1); let t = 0;
    const [label, color] = SPEAKERS[b.who] || [String(b.who).toUpperCase(), '#fff3dc'];
    const blocking = D.run?.sc.blocking;
    let bub = null;
    ctx.onSay?.(b.who, !!blocking, dur, b.vo);                       // audio: the voice line (b.vo), else a non-verbal bark
    if (blocking) { ui.subName.textContent = label; ui.subName.style.color = color; ui.subText.textContent = b.text; ui.sub.classList.add('on'); }
    else { bub = document.createElement('div'); bub.className = 'sbub'; bub.innerHTML = `<b style="color:${color}">${label}</b><span></span>`; bub.querySelector('span').textContent = b.text; ui.bubbles.appendChild(bub); D.bubbles.push({ el: bub, who: a, t: 0 }); requestAnimationFrame(() => bub.classList.add('on')); }
    if (a && b.who !== 'wolf') a.nod = 0;                            // a tiny deadpan nod on the line
    const done = () => { if (blocking) ui.sub.classList.remove('on'); if (bub) { bub.classList.remove('on'); setTimeout(() => bub.remove(), 300); D.bubbles = D.bubbles.filter(x => x.el !== bub); } };
    return { update(dt) { t += dt; if (t >= dur) { done(); return true; } return false; }, finish: done };
  }
  function moveTask(a, b, run) {
    a.moveTask?.cancel?.(); const me = {}; a.moveTask = me;
    const pts = (typeof b.path === 'function' ? b.path(S) : b.path).map(q => toWorld(run.A, q[0], 0, q[1]));
    const start = a.getPos(V()).setY(0);
    const curve = new THREE.CatmullRomCurve3([start, ...pts], false, 'centripetal');
    const len = Math.max(0.01, curve.getLength());
    let dur = b.dur ?? len / (b.speed || 1.3);
    if (b.fit === 'arrive') dur = clamp(2 * len / Math.max(Math.abs(L.car.v), 1), 1.6, 3.2);    // decelerate from the arrival speed
    const ease = EASE[b.ease || 'walk'] || EASE.walk, isCar = a.name === 'car';
    if (isCar) L.car.sceneDriven = true;
    let t = 0, lastS = 0, done = false; const p = V(), tg = V();
    const endYaw = b.endYaw !== undefined ? run.A.yaw + b.endYaw : null;
    const step = (k, dt) => { const s = ease(k); curve.getPointAt(s, p); a.setPos(p.x, p.z);
      curve.getTangentAt(Math.min(s, 0.999), tg); let want = Math.atan2(tg.x, tg.z);
      if (endYaw !== null && k > 0.6) want = want + wrap(endYaw - want) * smooth((k - 0.6) / 0.4);
      const cur = a.getYaw(); a.setYaw(cur + wrap(want - cur) * (dt ? 1 - Math.exp(-dt * (isCar ? 7 : 9)) : 1));
      if (dt) a.setSpeed(((s - lastS) * len) / dt); lastS = s; };
    Object.assign(me, {
      update(dt) { if (done) return true; t += dt; const k = clamp(t / dur, 0, 1); step(k, dt); if (k >= 1) { me.finish(); return true; } return false; },
      finish() { if (done) return; done = true; step(1, 0); if (endYaw !== null) a.setYaw(endYaw); else { curve.getTangentAt(0.999, tg); a.setYaw(Math.atan2(tg.x, tg.z)); } a.setSpeed(0); },
      cancel() { done = true; a.setSpeed(0); } });
    return me;
  }
  function exitTask(a, b) {
    const c = L.car, off = b.to || ACTOR_CAR_DOOR[a.name] || [1.65, 0]; c.root.updateMatrixWorld(true);
    const from = V(), to = c.body.localToWorld(new THREE.Vector3(off[0], 0, off[1])); to.y = 0;
    let s0 = 1, s1 = 1;
    if (a.name === 'wolf') { const w = getWolf(); from.copy(w.position); s0 = w.scale.x; s1 = puppet.base; puppet.on = true; puppet.speed = 0; }
    else if (a.name === 'moth') { const M = getMoth(); if (!M) return null; M.toScene(); from.copy(M.holder.position); s0 = s1 = M.holder.scale.x; M.play('walk', 0.25); }
    else { const bl = CK.cast?.find(m => m.name === (a.name === 'squid' ? 'banana squid' : 'farmhand')); if (bl) { bl.root.getWorldPosition(from); bl.root.visible = false; } else from.copy(to); from.y = Math.max(0, from.y - 0.35); s0 = 0.55; s1 = 1; a.obj.visible = true; }
    const yawOut = Math.atan2(to.x - c.pos.x, to.z - c.pos.z);
    a.setYaw(yawOut); const dur = b.dur ?? 0.8; let t = 0;
    const apply = (k) => { const e = smooth(k); a.setPos(lerp(from.x, to.x, e), lerp(from.z, to.z, e), lerp(from.y, 0, Math.min(1, e * 1.4)));
      const sc = lerp(s0, s1, e); if (a.name !== 'moth') a.obj.scale.setScalar(sc); if (a.name === 'moth') getMoth()?.setFold(1 - e); };
    return { update(dt) { t += dt; const k = clamp(t / dur, 0, 1); apply(k); a.setSpeed(k < 1 ? 1.1 : 0); if (k >= 1) { this.finish(); return true; } return false; },
      finish() { apply(1); a.setSpeed(0); if (a.name === 'moth') getMoth()?.play('idle'); } };
  }
  function lookTask(a, b) {
    const target = b.at, body = b.body ?? !b.track, dur = b.dur ?? 0.6;
    if (b.track) { a.look = { at: target, head: true, until: D.t + b.track }; }
    if (!body) return null;
    const tp = V(); let t = 0;
    const want = () => { const p = resolvePoint(target, tp); if (!p) return a.getYaw(); const me = a.getPos(V()); return Math.atan2(p.x - me.x, p.z - me.z); };
    return { update(dt) { t += dt; const cur = a.getYaw(); a.setYaw(cur + wrap(want() - cur) * (1 - Math.exp(-dt * 7))); return t >= dur; }, finish() { a.setYaw(want()); } };
  }
  function millTask(a, b, run) {
    const c = toWorld(run.A, b.around[0], 0, b.around[1]), r = b.r || 2; let wait = 0.3 + Math.random() * 0.8, goal = null; const p = V();
    const m = { bg: true, update(dt) {
      if (m.dead) return true;
      if (wait > 0) { wait -= dt; a.setSpeed(0); if (wait <= 0) { const ang = Math.random() * 6.28, rr = r * Math.sqrt(Math.random()); goal = new THREE.Vector3(c.x + Math.cos(ang) * rr, 0, c.z + Math.sin(ang) * rr); } return false; }
      a.getPos(p); const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { wait = 1.2 + Math.random() * 2.8; a.setSpeed(0); return false; }
      const cur = a.getYaw(), want = Math.atan2(dx, dz); a.setYaw(cur + wrap(want - cur) * (1 - Math.exp(-dt * 4)));
      const sp = 0.75 * clamp(1 - Math.abs(wrap(want - cur)) / 1.6, 0.2, 1); a.setPos(p.x + Math.sin(a.getYaw()) * sp * dt, p.z + Math.cos(a.getYaw()) * sp * dt); a.setSpeed(sp); return false; },
      cancel() { m.dead = true; a.setSpeed(0); }, finish() {} };
    return m;
  }

  // ── camera
  const pose = { pos: V(), q: new THREE.Quaternion(), fov: 50 }, _p0 = V(), _p1 = V(), _l0 = V(), _l1 = V();
  function currentPose() { return { pos: ctx.camera.position.clone(), q: ctx.camera.quaternion.clone(), fov: ctx.camera.fov }; }
  function portraitFov(fov) { const a = innerWidth / innerHeight; if (a >= 1) return fov;
    const hf = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 1.6); return clamp(2 * Math.atan(Math.tan(hf * 0.64 / 2) / a) * 180 / Math.PI, fov, 84); }
  function shotPose(sc, out) {
    const b = sc.b, k = (EASE[b.ease || 'inout'] || EASE.inout)(b.to ? clamp(sc.t / (b.dur || 1), 0, 1) : 0);
    if (!resolvePoint(b.pos, _p0) || !resolvePoint(b.look, _l0)) return false;
    if (b.to) { resolvePoint(b.to.pos ?? b.pos, _p1); resolvePoint(b.to.look ?? b.look, _l1); _p0.lerp(_p1, k); _l0.lerp(_l1, k); }
    const fov = b.to?.fov !== undefined ? lerp(b.fov ?? 45, b.to.fov, k) : (b.fov ?? 45);
    _cam.position.copy(_p0); _cam.lookAt(_l0); out.pos.copy(_p0); out.q.copy(_cam.quaternion); out.fov = portraitFov(fov);
    return true;
  }
  const _sp = { pos: V(), q: new THREE.Quaternion(), fov: 45 };
  function applyCam(camera, p) { camera.position.copy(p.pos); camera.quaternion.copy(p.q); if (Math.abs(camera.fov - p.fov) > 1e-3 || camera.near !== 0.1) { camera.fov = p.fov; camera.near = 0.1; camera.updateProjectionMatrix(); } camera.updateMatrixWorld(); }

  // ── UI: letterbox, skip (hold 0.6 s, ring fill like the eye button), keyboard Esc/Enter hold
  const RING = 163.4; let holdT = null, holdRaf = 0;
  const fill = x => { if (ui.ring) ui.ring.style.strokeDashoffset = RING * (1 - x); };
  const holdStep = () => { if (holdT === null) return; const x = Math.min(1, (performance.now() - holdT) / 600); fill(x); if (x >= 1) { holdT = null; skip(); setTimeout(() => fill(0), 160); return; } holdRaf = requestAnimationFrame(holdStep); };
  const holdStart = () => { if (!D.run?.sc.blocking || holdT !== null) return; holdT = performance.now(); cancelAnimationFrame(holdRaf); holdRaf = requestAnimationFrame(holdStep); };
  const holdEnd = () => { if (holdT !== null) { holdT = null; cancelAnimationFrame(holdRaf); fill(0); } };
  if (ui.skip) { ui.skip.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { ui.skip.setPointerCapture(e.pointerId); } catch (_) {} holdStart(); });
    for (const ev of ['pointerup', 'pointercancel']) ui.skip.addEventListener(ev, e => { e.preventDefault(); holdEnd(); }); ui.skip.addEventListener('contextmenu', e => e.preventDefault()); }
  addEventListener('keydown', e => { if ((e.code === 'Escape' || e.code === 'Enter') && !e.repeat && D.run?.sc.blocking) holdStart(); });
  addEventListener('keyup', e => { if (e.code === 'Escape' || e.code === 'Enter') holdEnd(); });

  // ── run control
  function play(name) {
    const sc = SCENES[name]; if (!sc || !D.ready) return false;
    if (sc.blocking && D.run?.sc.blocking) return false;
    const A = ANCHORS[sc.anchor](); const run = { name, sc, A: { ...A }, i: 0, blocker: null, side: [], bg: [], t: 0 };
    D.played.add(name);
    if (sc.blocking) {
      if (D.run && !D.run.sc.blocking) D.bgRuns.push(D.run);
      D.run = run; D.curA = run.A; D.out = null; D.hold = null;
      L.frozen = true; L.sceneCar = true; CK.sceneView = true; ctx.onFreeze?.();
      document.body.classList.add('scene', 'lbox');
      D.cam = null; D.lastPose = currentPose();
    } else { D.bgRuns.push(run); }
    return true;
  }
  function advance(run, dt) {
    D.curA = run.A; D.run_ = run;
    for (let i = run.side.length - 1; i >= 0; i--) if (run.side[i].update(dt)) run.side.splice(i, 1);
    for (let i = run.bg.length - 1; i >= 0; i--) if (run.bg[i].update(dt)) run.bg.splice(i, 1);
    let guard = 0;
    while (guard++ < 200) {
      if (run.blocker) { if (!run.blocker.update(guard === 1 ? dt : 0)) break; run.blocker = null; }
      if (run.i >= run.sc.beats.length) break;
      const b = run.sc.beats[run.i++]; const tk = startBeat(b, run, false); if (tk) run.blocker = tk;
    }
    return run.i >= run.sc.beats.length && !run.blocker && !run.side.length;
  }
  function skip() {
    const run = D.run; if (!run || !run.sc.blocking) return;
    ctx.onSkip?.();
    run.blocker?.finish?.(); run.blocker = null; for (const t of run.side) t.finish?.(); run.side.length = 0;
    while (run.i < run.sc.beats.length) startBeat(run.sc.beats[run.i++], run, true);
    ui.sub.classList.remove('on');
    end(run, true);
  }
  function end(run, skipped) {
    const sc = run.sc;
    if (sc.blocking) {
      D.run = null; ui.sub.classList.remove('on'); document.body.classList.remove('scene', 'lbox');
      if (sc.endCamera === 'hold') { D.hold = { cam: D.cam, run }; }
      else { D.out = { from: { pos: pose.pos.clone(), q: pose.q.clone(), fov: pose.fov }, t: 0, dur: skipped ? 0.6 : 0.9 }; D.cam = null; L.frozen = false; L.sceneCar = false; L.car.sceneDriven = false; L.radioOverride = null; }
      D.bgKeep = run.bg;
    }
  }

  // ── per frame (before level.update)
  D.bubbles = []; D.bgRuns = []; D.bgKeep = [];
  function update(dt, t, { wolfPos, titleUp }) {
    D.t += dt;
    if (!D.ready) return;
    // triggers
    if (!titleUp && !L.ended && !D.run) {
      for (const [name, sc] of Object.entries(SCENES)) {
        const tr = sc.trigger; if (!tr || (sc.once !== false && D.played.has(name))) continue;
        const okWhen = tr.when === 'car' ? (L.inCar && L.mode === 'drive') : tr.when === 'foot' ? L.mode === 'walk' : true; if (!okWhen) continue;
        const A = ANCHORS[sc.anchor](), p = tr.when === 'foot' ? wolfPos : L.car.pos; toLocal(A, p, S.local);
        if (Math.hypot(S.local.x - tr.at[0], S.local.z - tr.at[1]) > tr.r) continue;
        if (tr.if && !tr.if(S)) continue;
        play(name); if (sc.blocking) break;
      }
    }
    if (D.run) { const r = D.run; r.t += dt; if (advance(r, dt)) end(r, false); }
    for (let i = D.bgRuns.length - 1; i >= 0; i--) { D.bgRuns[i].t += dt; if (advance(D.bgRuns[i], dt)) { D.bgKeep.push(...D.bgRuns[i].bg); D.bgRuns.splice(i, 1); } }
    for (let i = D.bgKeep.length - 1; i >= 0; i--) if (D.bgKeep[i].update(dt)) D.bgKeep.splice(i, 1);
    for (const a of Object.values(D.actors)) { if (a.look && a.look.until < D.t) a.look = null; a.tick?.(dt, t); }
    D.props.wheel?.tick(dt);
  }

  // ── camera + bubbles (after the player camera is computed)
  const _bp = V();
  function camera(cam, dt) {
    const sc = D.run ? D.cam : D.hold?.cam;
    if (sc) {
      sc.t += dt;
      if (shotPose(sc, _sp)) {
        if (sc.from && sc.b.blend) { const k = smooth(clamp(sc.t / sc.b.blend, 0, 1)); pose.pos.lerpVectors(sc.from.pos, _sp.pos, k); pose.q.slerpQuaternions(sc.from.q, _sp.q, k); pose.fov = lerp(sc.from.fov, _sp.fov, k); }
        else { pose.pos.copy(_sp.pos); pose.q.copy(_sp.q); pose.fov = _sp.fov; }
        applyCam(cam, pose);
      }
    } else if (D.run?.sc.blocking) { applyCam(cam, D.lastPose); pose.pos.copy(D.lastPose.pos); pose.q.copy(D.lastPose.q); pose.fov = D.lastPose.fov; }
    else if (D.out) { // hand back: ease from the last scene shot into the live player camera
      D.out.t += dt; const k = smooth(clamp(D.out.t / D.out.dur, 0, 1));
      cam.position.lerpVectors(D.out.from.pos, cam.position, k); cam.quaternion.slerpQuaternions(D.out.from.q, cam.quaternion, k);
      const f = lerp(D.out.from.fov, cam.fov, k); if (Math.abs(f - cam.fov) > 1e-3) { cam.fov = f; cam.updateProjectionMatrix(); } cam.updateMatrixWorld();
      if (k >= 1) { D.out = null; CK.sceneView = false; }
    }
    // world-anchored bubbles (non-blocking scenes): above the speaker, clamped into a safe band away from the controls
    if (D.bubbles.length) {
      const W = innerWidth, H = innerHeight, por = H > W;
      const x0 = W * 0.16, x1 = W * 0.84, y0 = H * (por ? 0.2 : 0.22), y1 = H * (por ? 0.6 : 0.56);
      D.bubbles.forEach((bb, i) => {
        let x, y; if (bb.who) { bb.who.headWorld(_bp); _bp.y += 0.45; _bp.project(cam); }
        if (!bb.who || _bp.z > 1 || Math.abs(_bp.x) > 1.1 || Math.abs(_bp.y) > 1.1) { x = W / 2; y = y0 + i * 46; bb.el.classList.add('pin'); }
        else { x = (_bp.x + 1) / 2 * W; y = (1 - _bp.y) / 2 * H; bb.el.classList.remove('pin'); }
        x = clamp(x, x0, x1); y = clamp(y, y0 + i * 4, y1);
        bb.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      });
    }
  }

  // ── reset (retry)
  function reset() {
    for (const r of [D.run, ...D.bgRuns]) if (r) { r.blocker?.cancel?.(); for (const t of [...r.side, ...r.bg]) t.cancel?.(); }
    for (const t of D.bgKeep) t.cancel?.();
    D.run = null; D.bgRuns = []; D.bgKeep = []; D.cam = null; D.hold = null; D.out = null; D.played.clear();
    for (const bb of D.bubbles) bb.el.remove(); D.bubbles = []; ui.sub.classList.remove('on');
    document.body.classList.remove('scene', 'lbox'); holdEnd();
    L.frozen = false; L.sceneCar = false; L.car.sceneDriven = false; L.radioOverride = null; CK.sceneView = false;
    puppet.on = false; puppet.speed = 0; puppet.headYaw = 0; puppet.headTilt = 0;
    const w = getWolf(); if (w) w.visible = true;
    for (const n of ['squid', 'farm', 'clerk']) { const a = D.actors[n]; if (a) { a.obj.visible = false; a.look = null; a.setSpeed(0); a.moveTask = null; } }
    for (const m of CK.cast || []) if (m.root) m.root.visible = true;
    D.props.store?.reset();
    for (const sc of Object.values(SCENES)) if (sc.stage && D.ready) { D.curA = ANCHORS[sc.anchor](); D.placeA = D.curA; sc.stage(S); D.placeA = null; }
  }

  // ── init: build props, load the scene cast (heron clerk, crow + ram, out-of-car squid + farmhand)
  async function init() {
    buildStoreProps(); buildRoadside();
    D.actors.wolf = wolfActor(); D.actors.moth = mothActor(); D.actors.car = carActor();
    const spec = [['clerk', './models/scene/heron_armsdown.glb', 2.05], ['crow', './models/scene/crow_armsdown.glb', 1.6], ['ram', './models/scene/ram.glb', 1.75],
      ['squid', './models/cast/wanderer_banana_squid_walking.glb', 1.7], ['farm', './models/cast/wanderer_shovel_farmhand_walking.glb', 1.8]];
    const gl = await Promise.all(spec.map(([, u]) => load(u).catch(e => { console.warn('scene cast', u, e); return null; })));
    spec.forEach(([n, , h], i) => { if (gl[i]) D.actors[n] = glbActor(n, gl[i], h); });
    D.ready = true; L.scenesOwnArrival = true;
    reset();
  }
  const director = { init, update, camera, reset, play, skip, SCENES, CUES, D, get active() { return D.run?.name || null; }, anchors: ANCHORS, toWorld };
  return director;
}
