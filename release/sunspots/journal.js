// Next Level run 1 (Nov 15 2026): the Sunspot Journal + a save that survives closing the app.
// - town progress (T.M.S) now also lives in localStorage (town.js save()); this module reads it, never forks it.
// - JOURNAL pill (walk mode, beside GO): TO DO (active errands, GO THERE), RUMOURS (errands not started, where to start),
//   DONE (punchlines), SUNSPOTS (the long goal: every errand, game and secret earns one), RECORDS, PLACES (rooms walked into).
// - "Welcome back" card when a saved game loads (easy in: what you were doing, one tap to carry on).
// - Sunspot found -> toast + pill pulse. ?nojournal turns the module off. 0 tris, 0 rigs.
export function installJournal({ T, QT, level, audio }) {
  const Q = new URLSearchParams(location.search); if (Q.has('nojournal') || !T?.M) return null;
  const M = T.M, S = M.S; S.visited = S.visited || {}; S.sun = S.sun || {};
  const ROOMS = T.ROOMS || {};
  const carn = () => { if (window.__cr) return window.__cr; try { return JSON.parse(localStorage.getItem('ss_carn') || '{}'); } catch (_) { return {}; } };
  const doneM = (m) => (S[m] || 0) >= (M.DONE[m] || 99);
  // where each errand starts (rumours) — [place key for GO, the line]
  const START = {
    adv: ['diner', 'The Diner menu has a back. Nobody has ever ordered the back.'],
    sock: ['laundromat', 'Something at the Laundromat came in a pair. It is leaving as a single.'],
    num: ['dmv', 'Moth is at the DMV. He has been renewing since 1979.'],
    air: ['ksun', 'KSUN keeps going to static. Mid-sentence.'],
    bulb: ['drivein', 'The Drive-In has not shown anything since the bulb.'],
    horse: ['statue', 'Read the Horse Statue plaque in WILD. Blink and see.'],
    call: ['m_phone', 'The Main St payphone talks if you talk to it first. KSUN runs a contest line.'],
    route: ['m_post', 'The Post Office needs a paper boy. The last one was also a wolf.'],
    heron: ['c_wheel', 'Somebody is at the top of the Sky Wheel. Has been for a while.'],
  };
  const PLAIN = { adv: 'Diner', sock: 'Laundromat', num: 'DMV', air: 'KSUN', bulb: 'Drive-In', horse: 'Horse Statue', call: 'Payphone, Main St', route: 'Post Office', heron: 'One Horse Fair' };
  // the long goal: Sunspots. Each one is earned by doing something, never bought.
  const SUNS = [
    ...M.MLIST.map((m) => ({ id: 'm_' + m, name: M.TITLE[m], how: 'An errand. Starts at the ' + (PLAIN[m] || 'edge of town'), got: () => doneM(m) })),
    { id: 'snacks', name: 'LAST MINUTE SNACKS', how: 'Get to the store before it closes at 2:00', got: () => !!S.snacks },
    { id: 'tv1990', name: 'THE 1990 SUNSPOT', how: "Something on Bear's TV. Check the TV Guide doodle", got: () => !!S.sunspot1990 },
    { id: 'pool', name: 'EIGHT-BALL', how: 'Clear a rack at the Pool Hall', got: () => !!S.poolBest },
    { id: 'hoops', name: 'BEAT LARRY BYRD', how: 'Win Around-the-World at the Court', got: () => !!(S.hoops && S.hoops.w > S.hoops.l) },
    { id: 'bowl', name: 'FULL GAME', how: 'Bowl a whole game at Gutter Bowl', got: () => (S.bowled || 0) > 0 },
    { id: 'prize', name: 'MIDWAY PLUSH', how: 'Win a prize on the midway', got: () => (carn().prizes || []).length > 0 },
    { id: 'gravy', name: 'GRAVY', how: "Ride Bear's horse", got: () => !!S.rodeGravy },
    { id: 'motel', name: 'ROOM 11', how: 'Rent a room at the Motel', got: () => (S.rooms || 0) > 0 },
    { id: 'homes', name: 'GOOD NEIGHBOUR', how: 'Walk into every home on Mesa', got: () => HOMES.every((k) => S.visited[k]) },
    { id: 'tourist', name: 'TOURIST', how: 'Walk into every building in town', got: () => roomKeys().every((k) => S.visited[k]) },
    // the two headline Nights that are not on missions/kit.js (brawler.js, swimlesson.js): done + three stars, like the kit missions
    { id: 'brawl', name: 'BACK-LANE CHAMP', how: "Win the brawl behind Taco Tuesday's (Night 2)", got: () => (S.brawl?.wins || 0) > 0 },
    { id: 'brawl3', name: 'NOT A SCRATCH', how: 'Three stars in the back lane', got: () => (S.brawl?.best || 0) >= 3 },
    { id: 'swim', name: 'LATE NIGHT SWIM LESSON', how: "Finish Ram's swim lesson (Night 3)", got: () => (S.swimBest?.stars || 0) > 0 },
    { id: 'swim3', name: 'GOLD STAR SWIMMER', how: 'Three stars at the swim lesson', got: () => (S.swimBest?.stars || 0) >= 3 },
    // the ending (finale.js): Night 7 done, the sun comes up
    { id: 'finale', name: 'SAME OLD SUNRISE', how: "Finish Night 7 (fix Moth's porch light) and watch the sun come up", got: () => { try { return !!JSON.parse(localStorage.getItem('sunspots.progress') || '{}').finaleSeen; } catch (_) { return false; } } },
  ];
  const HOMES = ['wolf', 'living90', 'lynx', 'crow', 'heron', 'gecko', 'ram', 'anteater', 'apt_vict', 'moth', 'apt_pink', 'mansion', 'farm'].filter((k) => !Object.keys(ROOMS).length || ROOMS[k]);
  const roomKeys = () => Object.keys(ROOMS);
  // Next Level cast missions (missions/kit.js) register rumours, Night gates and their Sunspots here
  const X = (window.__jnX ||= { start: {}, plain: {}, suns: [], night: {} });
  const syncX = () => { for (const s of X.suns) if (!SUNS.some((o) => o.id === s.id)) SUNS.push(s); };
  const startOf = (m) => START[m] || X.start[m], plainOf = (m) => PLAIN[m] || X.plain[m] || '';
  const gateOf = (m) => { const n = X.night[m]; const N = n && window.__msnNights?.[n - 1]; return N && found().length < N.need && !Q.has('unlock') ? ` · opens at ${N.need} ☀ (${N.name.split(' · ')[0]})` : ''; };
  const found = () => SUNS.filter((s) => { try { return s.got(); } catch (_) { return false; } });

  // ---------------------------------------------------------------- UI
  const css = document.createElement('style');
  css.textContent = `#jnBtn{position:fixed;top:calc(env(safe-area-inset-top) + 64px);right:calc(env(safe-area-inset-right) + 90px);z-index:5;border:0;border-radius:22px;padding:7px 13px 7px 9px;min-height:31px;
    font:800 13px/1 system-ui,sans-serif;letter-spacing:.08em;background:#2b1e3c;color:#ffe1a8;box-shadow:0 4px 0 #120a1c;-webkit-tap-highlight-color:transparent;display:none;align-items:center;gap:7px}
  #jnBtn:active{transform:translateY(3px);box-shadow:0 1px 0 #120a1c} #jnBtn i{width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#ffd36a,#e0a224 60%,#9a5a12);box-shadow:0 0 0 2px #f6b23a55}
  #jnBtn.pulse{animation:jnP 1.1s ease 3} @keyframes jnP{50%{transform:scale(1.16);box-shadow:0 4px 0 #120a1c,0 0 18px #ffd36a}}
  body.scene #jnBtn,body.map #jnBtn,body.fullmap #jnBtn,body.room #jnBtn,body.driving #jnBtn{display:none!important}
  #jnSheet{position:fixed;left:0;right:0;bottom:0;z-index:41;max-height:80vh;display:flex;flex-direction:column;background:#f4ead2;color:#2b1e3c;border-radius:18px 18px 0 0;
    box-shadow:0 -6px 30px #0009;transform:translateY(105%);transition:transform .24s ease;font:600 14px/1.35 Futura,Avenir,system-ui,sans-serif}
  #jnSheet.on{transform:none} #jnSheet header{display:flex;align-items:center;gap:10px;padding:14px 16px 6px}
  #jnSheet header b{font:800 15px system-ui,sans-serif;letter-spacing:.2em;flex:1} #jnSheet header span{font:800 13px system-ui,sans-serif;color:#8a5a12}
  #jnSheet header button{border:0;background:#2b1e3c;color:#ffe1a8;border-radius:12px;min-width:48px;min-height:40px;font:800 13px system-ui,sans-serif}
  #jnTabs{display:flex;gap:6px;overflow-x:auto;padding:4px 14px 10px;scrollbar-width:none} #jnTabs::-webkit-scrollbar{display:none}
  #jnTabs button{flex:0 0 auto;border:0;border-radius:16px;min-height:40px;padding:0 14px;background:#e3d4b2;color:#4a3560;font:800 12px system-ui,sans-serif;letter-spacing:.12em}
  #jnTabs button.on{background:#2b1e3c;color:#ffe1a8}
  #jnBody{overflow:auto;padding:0 14px calc(env(safe-area-inset-bottom) + 16px)} #jnBody .it{background:#fffaf0;border-radius:14px;padding:11px 13px;margin:0 0 8px;box-shadow:0 2px 0 #d9c8a2}
  #jnBody .it h4{margin:0 0 3px;font:800 13px system-ui,sans-serif;letter-spacing:.12em} #jnBody .it p{margin:0;color:#4a3d52} #jnBody .it small{display:block;color:#8a7a6a;margin-top:3px;font-size:12px}
  #jnBody .it button{margin-top:9px;border:0;border-radius:12px;min-height:44px;padding:0 16px;background:#f6b23a;color:#2b1e3c;font:800 13px system-ui,sans-serif;letter-spacing:.1em}
  #jnBody .done h4{text-decoration:line-through;text-decoration-thickness:2px;color:#6a5a72} #jnBody .em{color:#8a7a6a;padding:6px 2px 12px}
  #jnBody .sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px} #jnBody .sg .it{margin:0;display:flex;gap:10px;align-items:flex-start}
  #jnBody .sg .it i{flex:0 0 26px;height:26px;border-radius:50%;background:#e3d4b2;box-shadow:inset 0 2px 4px #0002}
  #jnBody .sg .it.got i{background:radial-gradient(circle at 40% 38%,#ffd36a,#e0a224 60%,#9a5a12);box-shadow:0 0 0 3px #f6b23a44}
  #jnBody .bar{height:12px;border-radius:8px;background:#e3d4b2;overflow:hidden;margin:2px 0 12px} #jnBody .bar u{display:block;height:100%;background:#e0a224;border-radius:8px}
  #jnBody .reset{background:#e3d4b2!important;color:#6a2c3c!important}
  #jnWb{position:fixed;left:50%;top:50%;z-index:42;width:min(86vw,360px);transform:translate(-50%,-50%) scale(.96);opacity:0;pointer-events:none;transition:.22s;background:#f4ead2;color:#2b1e3c;border-radius:20px;
    padding:18px 18px 16px;box-shadow:0 12px 40px #000a;font:600 14px/1.4 Futura,Avenir,system-ui,sans-serif;text-align:center}
  #jnWb.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%)} #jnWb b{display:block;font:800 13px system-ui,sans-serif;letter-spacing:.24em;color:#8a5a12;margin-bottom:6px}
  #jnWb h3{margin:0 0 8px;font:800 18px system-ui,sans-serif} #jnWb p{margin:0 0 14px;color:#4a3d52}
  #jnWb div{display:flex;gap:8px} #jnWb button{flex:1;border:0;border-radius:14px;min-height:48px;font:800 13px system-ui,sans-serif;letter-spacing:.1em;background:#2b1e3c;color:#ffe1a8}
  #jnWb button.alt{background:#e3d4b2;color:#2b1e3c}`;
  document.head.appendChild(css);
  const $c = (t, id, html) => { const e = document.createElement(t); if (id) e.id = id; if (html) e.innerHTML = html; document.body.appendChild(e); return e; };
  const btn = $c('button', 'jnBtn', '<i></i><span>0</span>'); btn.setAttribute('aria-label', 'Open the journal');
  const sheet = $c('div', 'jnSheet', '<header><b>JOURNAL</b><span id="jnCount"></span><button id="jnX" aria-label="Close the journal">✕</button></header><div id="jnTabs"></div><div id="jnBody"></div>');
  const wb = $c('div', 'jnWb');
  const tabs = sheet.querySelector('#jnTabs'), body = sheet.querySelector('#jnBody');
  const TABS = [['todo', 'TO DO'], ['rumour', 'RUMOURS'], ['sun', 'SUNSPOTS'], ['done', 'DONE'], ['rec', 'RECORDS'], ['places', 'PLACES']];
  let tab = 'todo';
  tabs.innerHTML = TABS.map(([k, n]) => `<button data-t="${k}">${n}</button>`).join('');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const canGo = () => level.mode === 'walk' && !level.frozen && !T.active && !window.__titleUp;
  const goBtn = (k) => k && canGo() && (QT?.where?.(k) || window.__town?.spots?.[k] || (window.__TS?.spots?.[k])) ? `<button data-go="${k}">GO THERE ▸</button>` : '';
  const active = () => M.MLIST.filter((m) => S[m] > 0 && !doneM(m));
  const tgtOf = (m) => (M.TGT[m] || [])[S[m]];
  function render() {
    const f = found(); sheet.querySelector('#jnCount').textContent = `☀ ${f.length} / ${SUNS.length}`;
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    let h = '';
    if (tab === 'todo') {
      const a = active();
      if (!S.snacks) h += `<div class="it"><h4>LAST MINUTE SNACKS</h4><p>The store closes at 2:00. Moth's cab is waiting outside the Wolf's house on Mesa Rd.</p><small>The clock waits while you run errands.</small>${goBtn('ride')}</div>`;
      for (const m of a) h += `<div class="it"><h4>${esc(M.TITLE[m])}</h4><p>${esc(M.OBJ[m][S[m]] || '')}</p><small>Step ${S[m]} of ${M.DONE[m] - 1}</small>${goBtn(tgtOf(m))}</div>`;
      if (!a.length && S.snacks) h += '<div class="em">Nothing on the list. Check RUMOURS, or just walk around.</div>';
      else if (!a.length) h += '<div class="em">No errands yet. Check RUMOURS for where they start.</div>';
    } else if (tab === 'rumour') {
      const r = M.MLIST.filter((m) => !(S[m] > 0) && startOf(m));
      h += r.length ? r.map((m) => `<div class="it"><h4>${esc(plainOf(m))}</h4><p>${esc(startOf(m)[1])}</p>${gateOf(m) ? `<small>${esc(gateOf(m).slice(3))}</small>` : ''}${goBtn(startOf(m)[0])}</div>`).join('') : '<div class="em">You have heard every rumour in town. For now.</div>';
    } else if (tab === 'sun') {
      h += `<div class="em">Every errand, game and secret leaves a Sunspot. Found ${f.length} of ${SUNS.length}.</div><div class="bar"><u style="width:${Math.round(100 * f.length / SUNS.length)}%"></u></div><div class="sg">`;
      h += SUNS.map((s) => { const g = f.includes(s); return `<div class="it${g ? ' got' : ''}"><i></i><div><h4>${g ? esc(s.name) : '???'}</h4><small>${esc(s.how)}</small></div></div>`; }).join('') + '</div>';
    } else if (tab === 'done') {
      const d = M.MLIST.filter(doneM);
      if (S.snacks) h += '<div class="it done"><h4>LAST MINUTE SNACKS</h4><p>Snacks acquired. Nobody said anything.</p></div>';
      h += d.map((m) => `<div class="it done"><h4>${esc(M.TITLE[m])}</h4><p>Done${esc(M.DONE_MSG[m] || '.')}</p></div>`).join('');
      if (!d.length && !S.snacks) h += '<div class="em">Nothing finished yet. Everything is still possible.</div>';
    } else if (tab === 'rec') {
      const c = carn(), hp = S.hoops;
      const rows = [['Pool Hall', S.poolBest ? `best clear: ${S.poolBest} shots` : 'no clear yet'], ['The Court vs Larry Byrd', hp ? `last game: you ${hp.w}, Larry ${hp.l}` : 'not played'],
        ['Gutter Bowl', S.bowled ? `${S.bowled} game${S.bowled > 1 ? 's' : ''} bowled` : 'no games yet'], ['One Horse Fair', `${c.tix || 0} tickets · ${(c.prizes || []).length} prize${(c.prizes || []).length === 1 ? '' : 's'}`],
        ['Motel', S.rooms ? `${S.rooms} stay${S.rooms > 1 ? 's' : ''} in Room 11` : 'never stayed'], ['Gravy', S.rodeGravy ? `ridden ${S.rodeGravy} time${S.rodeGravy > 1 ? 's' : ''}` : 'not ridden']];
      h += rows.map(([a, b]) => `<div class="it"><h4>${esc(a.toUpperCase())}</h4><p>${esc(b)}</p></div>`).join('');
      h += '<div class="it"><h4>SAVED GAME</h4><p>Your progress saves on this device by itself.</p><button class="reset" data-reset="1">START OVER…</button></div>';
    } else if (tab === 'places') {
      const k = roomKeys(), v = k.filter((x) => S.visited[x]);
      h += `<div class="em">Walked into ${v.length} of ${k.length} places.</div><div class="bar"><u style="width:${k.length ? Math.round(100 * v.length / k.length) : 0}%"></u></div><div class="sg">`;
      h += k.map((x) => `<div class="it${S.visited[x] ? ' got' : ''}"><i></i><div><h4>${S.visited[x] ? esc(ROOMS[x].name) : '???'}</h4></div></div>`).join('') + '</div>';
    }
    body.innerHTML = h;
  }
  let resetArm = 0;
  function open(t) { if (t) tab = t; render(); sheet.classList.add('on'); QT?.close?.(); audio?.ui?.('tick'); }
  function close() { sheet.classList.remove('on'); resetArm = 0; }
  btn.addEventListener('click', (e) => { e.stopPropagation(); sheet.classList.contains('on') ? close() : open('todo'); });
  sheet.addEventListener('pointerdown', (e) => e.stopPropagation()); wb.addEventListener('pointerdown', (e) => e.stopPropagation());
  sheet.querySelector('#jnX').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); tab = b.dataset.t; resetArm = 0; render(); audio?.ui?.('tick'); });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    if (b.dataset.go) { goTo(b.dataset.go); return; }
    if (b.dataset.reset) { if (!resetArm) { resetArm = 1; b.textContent = 'TAP AGAIN TO ERASE THIS SAVE'; return; }
      if (window.__shell?.resetSave) { window.__shell.resetSave(); return; }   // shell.js: every save key + the IndexedDB mirror
      try { localStorage.removeItem('ss_town_v1'); sessionStorage.removeItem('ss_town1'); localStorage.removeItem('ss_carn'); localStorage.removeItem('ss_pool_best'); } catch (_) { }
      location.href = location.pathname + '?fresh'; }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); hideWb(); } if ((e.key === 'j' || e.key === 'J') && !e.repeat && document.activeElement?.tagName !== 'INPUT' && btn.style.display !== 'none') sheet.classList.contains('on') ? close() : open(); });
  function goTo(k) {
    close(); if (!canGo()) return;
    if (QT?.where?.(k)) { QT.go(k); return; }
    const s = window.__TS?.spots?.[k] || T.spots?.[k]; if (s) QT?.jump?.({ x: s.x + 1.6, z: s.z + 1.6, yaw: Math.atan2(-1.6, -1.6) + Math.PI });
  }

  // ---------------------------------------------------------------- welcome back (easy in)
  function hideWb() { wb.classList.remove('on'); }
  const hadSave = !!M.loadedFromSave && !Q.has('fresh') && !Q.has('room') && !Q.has('scene') && !Q.has('nowb');
  let wbShown = false;
  function showWb() {
    wbShown = true; syncX();   // release pass: the cast missions' Sunspots first, so the count matches the HUD (was "1 of 24" beside 1/74)
    const a = active(), f = found();
    const m = a[0]; const line = m ? `${M.TITLE[m]}: ${M.OBJ[m][S[m]]}` : !S.snacks ? 'The store still closes at 2:00 AM.' : 'Nothing started yet. The JOURNAL has RUMOURS: the town always wants something.';
    wb.innerHTML = `<b>WELCOME BACK</b><h3>☀ ${f.length} of ${SUNS.length} Sunspots</h3><p>${esc(line)}</p><div><button class="alt" data-j="1">JOURNAL</button><button data-c="1">CARRY ON</button></div>`;
    wb.classList.add('on');
  }
  wb.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); hideWb(); if (b.dataset.j) open('todo'); });

  // ---------------------------------------------------------------- tick: show/hide, track visits, Gravy, the store, new Sunspots
  let have = new Set(Object.keys(S.sun)), acc = 0, tick = 0, lastActive = null, wasMounted = false;
  for (const s of found()) if (!have.has(s.id)) { have.add(s.id); S.sun[s.id] = 1; }   // anything already earned before the journal existed
  btn.querySelector('span').textContent = `${have.size}/${SUNS.length}`;
  function update() {
    const show = level.mode === 'walk' && !level.frozen && !T.active && !window.__titleUp;
    btn.style.display = show ? 'flex' : 'none'; if (!show && sheet.classList.contains('on') && (T.active || level.frozen)) close();
    if (hadSave && !wbShown && window.__ready && !window.__titleUp && show) { if (have.size || Object.keys(S.visited).length || M.MLIST.some((m) => S[m] > 0)) showWb(); else wbShown = true; }
    const le = window.__town?.lastEnter; if (le && le !== lastActive) { lastActive = le; if (!S.visited[le.room]) { S.visited[le.room] = 1; M.save(); } }   // rooms pause the outside loop, so read the last entry
    const mt = !!window.__pet?.mounted; if (mt && !wasMounted) { S.rodeGravy = (S.rodeGravy || 0) + 1; M.save(); } wasMounted = mt;
    if (level.mode === 'won' && !S.snacks) { S.snacks = 1; M.save(); }
    const now = performance.now(); if (now - acc < 500) return; acc = now;   // twice a second
    syncX();
    for (const s of found()) if (!have.has(s.id)) {
      have.add(s.id); S.sun[s.id] = 1; M.save();
      M.toast(`☀ SUNSPOT FOUND: ${s.name}  (${have.size}/${SUNS.length})`, 4); audio?.ui?.('confirm');
      btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
    }
    btn.querySelector('span').textContent = `${have.size}/${SUNS.length}`;
    if (sheet.classList.contains('on') && (++tick % 4 === 0)) { const sc = body.scrollTop; if (!resetArm) { render(); body.scrollTop = sc; } }
  }
  const api = { open, close, update, SUNS, found: () => found().map((s) => s.id), render, showWb, get tab() { return tab; } };
  window.__journal = api; return api;
}
