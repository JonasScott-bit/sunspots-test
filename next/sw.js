// Sunspots /next/ service worker (ship pass, Nov 16 2026): makes the game installable and lets it start offline.
// Network first for everything (testers always get the newest build), falling back to the cache when offline.
// Big static assets (models, vendor, audio, title art, icons) are stale-while-revalidate: instant from the cache, refreshed
// in the background so an updated model shows up on the next launch. Videos and range requests
// are never cached. Scope is /next/ only; the live root is untouched.
const CACHE = 'sunspots-next-v2'; // v2: mud-fix cleaned Meshy textures
const SHELL = ['./', './index.html', './mobile.css', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('sunspots-next-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const STATIC = /\/(models|vendor|audio|title|icons|intro|media)\//;
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url); if (u.origin !== location.origin || /\/video\//.test(u.pathname) || /\.(mp4|webm)$/.test(u.pathname)) return;
  if (STATIC.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => { const hit = await c.match(r);
      const net = fetch(r).then((res) => { if (res.ok && res.type === 'basic') c.put(r, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; } return net; }));
    return;
  }
  e.respondWith(fetch(r).then((res) => { if (res.ok && res.type === 'basic') { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(r, cl)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))));
});
