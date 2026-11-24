// Save robustness (Nov 16 2026). The game saves to localStorage as you play (town.js 'ss_town_v1', carnival 'ss_carn',
// shell 'sunspots.progress', snack run, pool best). This adds:
//  * a save on every way the page can go away (app switch, iOS PWA swipe-away = pagehide/visibility hidden), not just on events;
//  * a mirror of every save key in IndexedDB ('sunspots-save'), refreshed every 20 s and on hide. If localStorage comes
//    back empty or broken (iOS storage eviction, a WebView that dropped it, a half-written value), the mirror is put back
//    and the page reloads once so the title shows CONTINUE;
//  * navigator.storage.persist() so the browser is asked not to evict the save.
// wipeSave() in shell.js (NEW GAME / Settings > RESET SAVE) calls clearMirror() too. ?fresh never restores.
const Q = new URLSearchParams(location.search);
const IS_SAVE = (k) => /^ss_/.test(k) || (/^sunspots\./.test(k) && !/^sunspots\.(autoplay|restored|wiped)$/.test(k));
const DB = 'sunspots-save', ST = 'kv';
const idb = () => new Promise((res, rej) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
async function idbPut(v) { const d = await idb(); return new Promise((res) => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, 'snap'); t.oncomplete = () => { d.close(); res(true); }; t.onerror = () => { d.close(); res(false); }; }); }
async function idbGet() { const d = await idb(); return new Promise((res) => { const t = d.transaction(ST, 'readonly'), r = t.objectStore(ST).get('snap'); r.onsuccess = () => { d.close(); res(r.result || null); }; r.onerror = () => { d.close(); res(null); }; }); }
export async function clearMirror() { try { const d = await idb(); await new Promise((res) => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).delete('snap'); t.oncomplete = t.onerror = () => { d.close(); res(); }; }); } catch (_) {} }
const okJSON = (v) => { try { JSON.parse(v); return true; } catch (_) { return false; } };
function snapshot() { const o = {}; try { for (const k of Object.keys(localStorage)) if (IS_SAVE(k)) { const v = localStorage.getItem(k); if (v != null && okJSON(v)) o[k] = v; } } catch (_) {} return o; }
const hasGame = (o) => !!o && typeof o === 'object' && !!o.ss_town_v1 && o.ss_town_v1.length > 2;
let lastMirror = '';
export async function mirror() {
  if (window.__wiping) return;
  if (Q.has('fresh') && !window.__ready) return;
  try { window.__town?.M?.save?.(); } catch (_) {}
  const o = snapshot(); if (!hasGame(o)) return; const j = JSON.stringify(o); if (j === lastMirror) return;
  try { if (await idbPut({ at: Date.now(), keys: o })) lastMirror = j; } catch (_) {}
}
// boot: repair broken values, restore from the mirror if the game save is gone
(async () => {
  try { for (const k of Object.keys(localStorage)) if (IS_SAVE(k) && !okJSON(localStorage.getItem(k))) { console.warn('save: dropping a broken value', k); localStorage.removeItem(k); } } catch (_) {}
  if (Q.has('fresh')) return;
  let have = false; try { have = hasGame(snapshot()); } catch (_) {}
  if (have) return;
  try { const m = await idbGet(); if (!m || !hasGame(m.keys)) return;
    const wiped = +localStorage.getItem('sunspots.wiped') || 0; if (wiped && m.at <= wiped) { clearMirror(); return; }   // NEW GAME / RESET SAVE: the old mirror is not a backup any more
    if (sessionStorage.getItem('sunspots.restored')) return;   // once per tab: never a reload loop
    for (const [k, v] of Object.entries(m.keys)) localStorage.setItem(k, v);
    sessionStorage.setItem('sunspots.restored', '1'); console.info('save: restored from the IndexedDB mirror', new Date(m.at).toISOString());
    if (!window.__ready) location.reload();
  } catch (_) {}
})();
try { navigator.storage?.persist?.().catch(() => {}); } catch (_) {}
document.addEventListener('visibilitychange', () => { if (document.hidden) mirror(); });
addEventListener('pagehide', () => { mirror(); });
setInterval(() => { if (window.__ready && !window.__titleUp) mirror(); }, 20000);
window.__saveguard = { mirror, clearMirror, snapshot, idbGet };
