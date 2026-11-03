// towntalk.js — run 13: town context. Billboards + shop sandwich boards (made-up brands), the plaza notice board,
// the lore, and ambient walk-up chatter for every outdoor object character / wanderer / no-room home (WILD variants),
// shown in a felt speech bubble over the speaker. Data-only + cheap: one DOM bubble, no extra rigs.
import { sign, SERIF, SCRIPT } from './townshops.js';
import { textPlane } from './townkit.js';
import { PLAZA, SLOGAN } from './horse.js';

export const LORE = {
  founding: ['Sunspots was founded in 1951 by a man who stopped for gas and could not get the car to start again.', 'He called it Sunspots because he saw spots for a week. The doctor said "sun". It stuck.'],
  horse: ['There was one horse. Everyone agreed that was plenty.', 'A second horse came through in 1958. It kept going. The town took it personally.', 'The statue was cast in felt because bronze melts. Felt also melts. Nobody checked.'],
  store: ['Last Minute Snacks closes at 2:00 PM. Not 2:01. The owner leaves at 2 to go look at the horse.', 'Nobody knows why 2. The sign has said 2 since the sign.'],
  ksun: ['KSUN 1490 AM has played the same song since 1974. Requests are taken. They are not played.', 'Every hour the DJ asks for caller four. There has never been a caller four.'],
};
export const FLYERS = ['LOST CAT\nANSWERS TO\n"NOTHING"', 'BAND NIGHT\nAT THE BOWL\nFRI · BAND TBD', 'KSUN 1490\nCALL-IN CONTEST\nBE CALLER 4!', 'HAVE YOU SEEN\nTHIS HORSE?\n(THE STATUE)'];

// ---------------------------------------------------------------- dressing: billboards + sandwich boards (all TS.place -> merged, LOD'd)
const BILLBOARDS = [   // x, z, ry (board faces +z rotated by ry), bg, fg, big, small
  [64, -14, -Math.PI / 2 + 0.35, '#f2b632', '#3a2414', 'SUN-O-GAS', 'WE HAVE GAS. ALSO GAS.  NEXT GAS: ALSO US'],
  [-202, -12, Math.PI / 2, '#c8302e', '#f6d24a', 'GOLDEN DRAGON', 'LUNCH AT DINNER PRICES · MAIN & NEON'],
  [56, -44, -0.5, '#2a4a8a', '#f2e6c8', 'KSUN 1490 AM', 'THE SAME SONG SINCE 1974 · BE CALLER FOUR'],
  [-60, 76, Math.PI, '#f2e6c8', '#c8463f', 'LAST MINUTE SNACKS', 'OPEN TILL 2:00 · NOT 2:01 · 40 MI. NORTH'],
  [-142, 47, 0, '#3f8a5a', '#f2ece0', 'SUN STATE INSURANCE', 'WE COVER MELTING*  (*WE DO NOT COVER MELTING)'],
  [48, 40, -Math.PI / 2, '#f6d24a', '#2a2a2e', "BIG AL'S AUTO BODY", "WE'VE SEEN WORSE. WE'VE CAUSED WORSE."],
];
const BOARDS = [   // sandwich boards in front of the filler shops: x, z, ry, text, fg
  [-109.5, 1.0, 0, 'WALK-INS\nWALK OUT\nLOOKING\nSIMILAR', '#3a6a8a'], [-135.5, 1.0, 0, 'WE BUY\nANYTHING\nONCE', '#1e2a3a'], [-169, 1.0, 0, 'WE FIX\nCHANNEL 3\n(ONLY 3)', '#a8302e'],
  [13, 13.4, Math.PI, 'NAILS\nBY THE\nNAIL', '#2a5a3e'], [-49.6, 13.4, Math.PI, 'HEELS\nHEALED', '#5a3a2a'], [-110, 13.4, Math.PI, 'LIMES\nFRESH-ISH', '#c8302e'],
  [-160, 13.4, Math.PI, 'PARTS\nOF AUTOS', '#c8302e'], [-18.5, -55.2, Math.PI, 'MOM\nTATTOOS\n2 FOR 1', '#a83a6a'], [28, -55.2, Math.PI, 'STILL\nROUND', '#d86a3a'],
  [-72.5, -55.2, Math.PI, "WE'VE\nSEEN\nWORSE", '#2a2a2e'], [-52.5, -55.2, Math.PI, 'LUNCH\nAT DINNER\nPRICES', '#c8302e'],
];
export function dressTown(TS) {
  BILLBOARDS.forEach(([x, z, ry, bg, fg, big, small], i) => TS.place('billboard_' + i, x, z, ry, (k) => {
    for (const px of [-3.2, 3.2]) { k.beam([px, 0, -0.2], [px, 7.2, -0.2], 0.32, '#6b5644', { lod: true }); k.beam([px, 0, -1.4], [px, 4.2, -0.3], 0.16, '#6b5644', { lod: true }); }
    k.aab(-5.2, 3.6, -0.4, 5.2, 3.75, 0.5, '#7a6a5a');                                               // catwalk
    for (let x = -5; x <= 5; x += 1.25) k.beam([x, 3.75, 0.48], [x, 4.4, 0.48], 0.04, '#5a4a3a');
    k.aab(-5.1, 4.1, -0.25, 5.1, 8.3, -0.05, bg);                                                    // board
    k.aab(-5.25, 3.95, -0.3, 5.25, 4.15, 0.02, '#f2ece0'); k.aab(-5.25, 8.25, -0.3, 5.25, 8.45, 0.02, '#f2ece0');
    for (const s of [1, -1]) { sign(k, big, s > 0 ? 0 : 0, 6.0, s > 0 ? -0.03 : -0.27, 9.6, 1.9, { fg, family: i === 1 ? SCRIPT : SERIF, fit: 0.86, ry: s > 0 ? 0 : Math.PI });
      sign(k, small, 0, 4.6, s > 0 ? -0.03 : -0.27, 9.4, 0.8, { fg, fit: 0.7, ry: s > 0 ? 0 : Math.PI }); }
    for (const x of [-3.5, 0, 3.5]) { k.beam([x, 3.75, 0.3], [x, 3.75 + 0.6, 1.0], 0.05, '#3a3a3a'); k.box(x, 4.35, 1.05, 0.4, 0.25, 0.3, '#3a3a3a'); }   // gooseneck lamps
    k.solid(-3.6, -0.6, 3.6, 0.2, 8.4);
  }, { lodNear: 160, melt: true, drips: false }));
  BOARDS.forEach(([x, z, ry, t, fg], i) => TS.place('aframe_' + i, x, z, ry, (k) => {
    for (const s of [1, -1]) { k.box(0, 0, s * 0.2, 0.72, 1.05, 0.05, '#2e2622', { rx: -s * 0.19 }); k.put(textPlane(t, 0.6, 0.8, { bg: '#f2ece0', fg, fit: 0.62, family: 'Futura, Avenir, "Helvetica Neue", Arial, sans-serif' }), 0, 0.56, s * 0.125, s > 0 ? 0 : Math.PI, -0.19); }
    k.solid(-0.4, -0.35, 0.4, 0.35, 1.1);
  }, { lodNear: 55, melt: true, drips: false }));
  // the plaza notice board (west side of the Horse Plaza): the four flyers + a KSUN schedule
  TS.place('notice_board', PLAZA.x0 + 1.6, PLAZA.z0 + 3.2, Math.PI / 2, (k) => {
    for (const x of [-1.3, 1.3]) k.beam([x, 0, 0], [x, 2.4, 0], 0.12, '#6b5644');
    k.aab(-1.5, 0.9, -0.08, 1.5, 2.3, 0.06, '#b88a5a', { pat: 'panel' }); k.aab(-1.65, 2.3, -0.25, 1.65, 2.45, 0.25, '#8a3a2e');
    FLYERS.forEach((f, i) => sign(k, f, -1.05 + i * 0.7, 1.55 + (i % 2) * 0.1, 0.08, 0.6, 0.78, { bg: ['#f4eee0', '#f2d8e0', '#e0ecf4', '#f6e8b0'][i], fg: '#3a2a2a', fit: 0.5 }));
    k.mark('spot_board', 0, 1.4);
  }, { lodNear: 60, melt: true, drips: false });
  TS.spots.board = { x: TS.marks.spot_board.x, z: TS.marks.spot_board.z };
}

// ---------------------------------------------------------------- chatter
const R = (a) => a[Math.floor(Math.random() * a.length)];
export const CHATTER = {   // name: [label, [normal lines], [WILD lines]]
  fridge: ['FRIDGE', ['I keep things cold. It\'s not personal.', 'Someone left one grape in me in 1988. I think about it.', 'Close the door when you leave. Any door. I worry.'], ['EVERYTHING IS ROOM TEMPERATURE NOW.', 'I\'m defrosting. Emotionally.']],
  mailbox: ['MAILBOX', ['Nothing for you. There\'s never anything for you.', 'I got a postcard once. "Wish you were here." I was.', 'Flag\'s up. Means nothing. I just like it up.'], ['I\'M FULL OF BILLS AND THEY\'RE ALL MELTING.', 'RETURN TO SENDER. RETURN TO THE SUN.']],
  window: ['WINDOW BOX', ['We\'re petunias. Probably.', 'Water us or don\'t. We\'ll be dramatic either way.', 'The horse gets more visitors than us.'], ['WE ARE GROWING TOWARD THE WRONG SUN.', 'PHOTOSYNTHESIS IS SCREAMING.']],
  payphone: ['PAYPHONE', ['Twenty-five cents for a local call. Everything\'s local.', 'KSUN\'s contest line rings through me. Nobody\'s ever been caller four.', 'I have one number memorised. It\'s mine.'], ['RING RING. THAT\'S ME. I\'M RINGING.', 'COLLECT CALL FROM THE HORSE. DO YOU ACCEPT?']],
  hydrant: ['HYDRANT', ['I\'ve been spinning since the fire of \'62. There was no fire.', 'Dogs don\'t bother me. You\'re a wolf. Different story.', 'Same old corner. Same old me.'], ['I SPIN FASTER WHEN IT\'S HOT. IT\'S ALWAYS HOT.', 'SOMEBODY OPEN ME. I\'M BEGGING.']],
  couch: ['COUCH', ['Sit on me. Everyone does. Nobody asks.', 'I used to be inside. I made choices.'], ['I\'M A PUDDLE WITH CUSHIONS.', 'THE CUSHIONS ARE SLIDING OFF WITHOUT ME.']],
  stove: ['STOVE', ['Back burner\'s been on since Tuesday. Which Tuesday, I couldn\'t say.', 'I\'m outdoors now. It\'s a lifestyle.'], ['FOR ONCE IT\'S NOT ME MELTING THINGS.', 'EVERYTHING\'S A BURNER.']],
  squid: ['BANANA SQUID', ['I walk to the bus stop. I don\'t take the bus. I like stops.', 'Same old town. Same old me. Slightly more yellow.', 'The horse and I have an understanding. I don\'t know what it is.'], ['I\'M RIPENING. DON\'T LOOK.', 'TOO MANY ARMS FOR THIS HEAT.']],
  farmhand: ['FARMHAND', ['The horse used to live on our farm. Then it got promoted.', 'One horse. One town. One shovel. It\'s a system.', 'I dig holes. Then I fill them. It\'s called farming.'], ['THE HORSE\'S EYES. YOU SEE IT TOO, RIGHT?', 'DIG. DIG. DIG. WHY AM I DIGGING.']],
  wrench: ['WRENCH', ['I fix things. Nothing\'s broken. That\'s the problem.', 'Store closes at two. I\'ve never made it. Not once.', 'Big Al owes me a socket. Big Al owes everybody a socket.'], ['EVERYTHING\'S LOOSE. I CAN FEEL IT.', 'RIGHTY TIGHTY. LEFTY MELTY.']],
};
const KNOCK = {
  ram: [['RAM (through the door)', 'Not buying. Not selling. Not home.'], ['RAM', 'Okay, I\'m home. Still not buying.']],
  anteater: [['ANTEATER (inside)', 'I\'m eating. You know what. Come back later.']],
  moth: [['MOTH (inside)', 'Can\'t come out. Porch light\'s on. You understand.'], ['MOTH', 'Need a ride? I\'m the ride. Later. The light.']],
  apt_pink: [['SOMEONE', 'Wrong apartment.'], ['SOMEONE', 'They\'re all the wrong apartment.']],
  apt_vict: [['A VOICE', 'Landlord says no visitors.'], ['A VOICE', 'I\'m the landlord.']],
  mansion: [['VULTURE (intercom)', 'Larry\'s practising free throws in the ballroom. Go away.'], ['LARRY BYRD (far off)', 'Pool hall. Tonight. Bring money. Bring a lot of money.']],
  farm: [['FARMHAND (from the barn)', 'The horse isn\'t here.'], ['FARMHAND', 'The horse is never here. That\'s what makes it the horse.']],
};
const KNOCK_W = { ram: [['RAM', 'I CAN HEAR THE STATUE BREATHING.']], anteater: [['ANTEATER', 'THE ANTS ARE MELTING. THIS IS A CRISIS.']], moth: [['MOTH', 'THE SUN. THE SUN IS A PORCH LIGHT. I HAVE TO GO TO IT.']],
  apt_pink: [['SOMEONE', 'ALL THE APARTMENTS ARE THE RIGHT APARTMENT NOW.']], apt_vict: [['A VOICE', 'RENT IS DUE. RENT IS MELTING.']], mansion: [['VULTURE', 'CIRCLE. MUST CIRCLE. EXCUSE ME.']], farm: [['FARMHAND', 'WHERE IS THE HORSE. WHERE IS THE HORSE.']] };
const FROM_INSIDE = {   // walk-by bubbles from homes with rooms
  living90: [['BEAR (from inside)', 'Is that the Wolf? Tell him the TV\'s on. It\'s always on.'], ['BEAR (from inside)', 'Same old show. Love this one.']],
  lynx: [['LYNX (from inside)', 'If that\'s about the noise, it\'s not me. It\'s the house.']],
  crow: [['CROW (from inside)', 'Everything in here is in the collection. Including the door.']],
  heron: [['HERON (from inside)', 'I\'m standing on one leg. Don\'t ask which.']],
  gecko: [['GECKO (from inside)', 'I\'m practising my jump shot. Indoors. It\'s going fine.']],
  wolf: [['FRIDGE (from the porch)', 'You live here. Come in. Or don\'t. I\'m a fridge.']],
};
export function installTalk({ T, level, TS, wolfState }) {
  const W = () => (window.__sunspots?.wild || 0) > 0.5;
  // bubble UI (one felt speech bubble projected over the speaker)
  const el = document.createElement('div'); el.id = 'chatBubble';
  el.innerHTML = '<b></b><span></span>';
  const st = document.createElement('style'); st.textContent = `#chatBubble{position:fixed;left:0;top:0;z-index:7;max-width:min(64vw,300px);padding:8px 12px 9px;border-radius:16px;background:#fff6e4;color:#3a2418;
    font:600 clamp(12px,3.4vw,15px)/1.25 Futura,Avenir,"Helvetica Neue",Arial,sans-serif;box-shadow:0 3px 0 #c9a27a,0 6px 14px rgba(60,30,10,.25);border:2px solid #3a2418;pointer-events:none;opacity:0;transition:opacity .2s;transform:translate(-50%,-100%)}
    #chatBubble.on{opacity:1}#chatBubble b{display:block;font-size:.7em;letter-spacing:.2em;color:#c8463f;margin-bottom:2px}
    #chatBubble:after{content:"";position:absolute;left:50%;bottom:-11px;margin-left:-8px;border:9px solid transparent;border-top-color:#3a2418;border-bottom:0}
    body.wild #chatBubble,#chatBubble.wild{background:#ffd9e8;color:#5a1030;border-color:#5a1030}`;
  document.head.appendChild(st); document.body.appendChild(el);
  const B = { t: 0, x: 0, y: 0, z: 0, q: [] };
  const v = { x: 0, y: 0, z: 0 };
  function bubble(who, text, at, h = 2.2, dur) {   // at: {x,z} or fn -> {x,z}
    B.who = who; B.text = text; B.at = at; B.h = h; B.t = dur || 2.2 + text.length * 0.05; el.children[0].textContent = who; el.children[1].textContent = text;
    el.classList.toggle('wild', W()); el.classList.add('on'); T.lastBubble = { who, text };
  }
  function say(lines, at, h) { B.q = lines.slice(1); bubble(lines[0][0], lines[0][1], at, h); }
  T.bubble = bubble; T.bubbleSay = say;
  // find the cast holders (loaded async)
  const castBy = (re) => level.cast?.find(c => re.test(c.name));
  const SPEAK = [ // key, regex | fixed pos, height
    ['fridge', /house_fridge/, 2.4], ['mailbox', /mailbox/, 1.6], ['window', /window_box/, 1.0], ['payphone', /payphone/, 2.4], ['hydrant', /hydrant/, 1.5],
    ['couch', /diner_couch/, 1.3, { x: 29.4, z: 51.6 }], ['stove', /diner_stove/, 1.4, { x: 31.4, z: 50.0 }], ['squid', /banana_squid/, 2.1], ['farmhand', /farmhand/, 2.2], ['wrench', /wrench/, 2.0],
  ];
  const n = {};
  for (const [key, re, h, fix] of SPEAK) {
    const pos = () => { const c = castBy(re); return c ? c.holder.position : fix || null; };
    T.addSpot({ id: 'talk_' + key, get x() { return pos()?.x ?? 1e5; }, get z() { return pos()?.z ?? 1e5; }, r: 2.4, label: 'TALK TO ' + CHATTER[key][0],
      act: () => { const [who, A, Wl] = CHATTER[key], list = W() ? Wl : A, i = (n[key] = (n[key] || 0) + 1);
        const c = castBy(re); if (c && c.wander) c.wait = Math.max(c.wait || 0, 4);   // wanderers stop to talk
        bubble(who, list[(i - 1) % list.length], pos, h); return null; } });
  }
  // knock on the homes without rooms
  for (const [k, L] of Object.entries(KNOCK)) { const d = TS.doors?.[k]; if (!d) continue;
    T.addSpot({ id: 'knock_' + k, x: d.x + Math.sin(d.ry || 0) * 0.9, z: d.z + Math.cos(d.ry || 0) * 0.9, r: 2.2, label: 'KNOCK',
      act: () => { say(W() ? KNOCK_W[k] : L, { x: d.x, z: d.z }, 2.6); return null; } }); }
  // the plaza notice board: flyers + the lore
  const BOARD_LINES = [[['NOTICE BOARD', 'LOST CAT. Answers to "Nothing". If you call "Nothing" and nothing comes, that\'s her.']], [['NOTICE BOARD', 'BAND NIGHT AT THE BOWL. Friday. Band to be determined. Bring a band.']],
    [['NOTICE BOARD', 'KSUN 1490 CALL-IN CONTEST. Be caller four. Prize: being caller four.']], [['NOTICE BOARD', 'HAVE YOU SEEN THIS HORSE? (It\'s the statue. It\'s right there. Behind you.)']],
    [['TOWN HISTORY', LORE.founding[0]], ['TOWN HISTORY', LORE.founding[1]]], [['TOWN HISTORY', LORE.horse[0]], ['TOWN HISTORY', LORE.horse[1]]], [['TOWN HISTORY', LORE.store[0]], ['TOWN HISTORY', LORE.store[1]]], [['TOWN HISTORY', LORE.ksun[0]], ['TOWN HISTORY', LORE.ksun[1]]]];
  let bn = 0; if (TS.spots.board) T.addSpot({ id: 'board', x: TS.spots.board.x, z: TS.spots.board.z, r: 2.4, label: 'READ THE BOARD', act: () => BOARD_LINES[bn++ % BOARD_LINES.length] });
  T.boardLines = BOARD_LINES;
  // walk-by: homes talk through the door now and then
  let walkT = 6; const heard = {};
  T.tick.push((dt) => {
    // bubble follow + queue
    if (B.t > 0) { B.t -= dt; const cam = window.__sunspots?.camera, p = typeof B.at === 'function' ? B.at() : B.at;
      if (cam && p && !T.active) { v.x = p.x; v.y = B.h + 0.35; v.z = p.z; const e = cam.matrixWorldInverse.elements, pe = cam.projectionMatrix.elements;
        const cx = e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12], cy = e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13], cz = e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14];
        if (cz < -0.3) { const sx = (pe[0] * cx / -cz) * 0.5 + 0.5, sy = 0.5 - (pe[5] * cy / -cz) * 0.5; el.style.left = Math.max(80, Math.min(innerWidth - 80, sx * innerWidth)) + 'px'; el.style.top = Math.max(70, Math.min(innerHeight - 60, sy * innerHeight)) + 'px'; el.style.visibility = 'visible'; }
        else el.style.visibility = 'hidden'; }
      if (B.t <= 0) { if (B.q.length) { const l = B.q.shift(); bubble(l[0], l[1], B.at, B.h); } else el.classList.remove('on'); } }
    if (T.active) { el.classList.remove('on'); B.t = 0; return; }
    if (level.mode !== 'walk' || B.t > 0) return;
    if ((walkT -= dt) > 0) return; walkT = 2;
    const p = wolfState.pos;
    for (const [k, L] of Object.entries(FROM_INSIDE)) { const d = TS.doors?.[k]; if (!d) continue; const dd = Math.hypot(p.x - d.x, p.z - d.z);
      if (dd < 7 && dd > 2.6 && (heard[k] || 0) < performance.now() - 60000) { heard[k] = performance.now(); const l = R(L); bubble(l[0], W() ? l[1].toUpperCase() : l[1], { x: d.x, z: d.z }, 2.8); walkT = 20; break; } }
  });
  return { bubble, say };
}
