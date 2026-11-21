const CACHE = 'life-v43';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'features.js', 'wayne.js', 'mist.js', 'pronote.js', 'manifest.webmanifest', 'icons/icon2-192.png', 'icons/icon2-180.png', 'fonts/rajdhani-500.woff2', 'fonts/rajdhani-600.woff2', 'fonts/rajdhani-700.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('data.enc.json')) {
    // network first, but never hang: fall back to the cached copy after 2.5 s
    e.respondWith(Promise.race([
      fetch(e.request, { cache: 'no-store' }).then(r => put(new Request(url.pathname), r)),
      new Promise(res => setTimeout(() => caches.match(url.pathname).then(m => m && res(m)), 2500)),
    ]).catch(() => caches.match(url.pathname)));
    return;
  }
  if (e.request.mode === 'navigate') {
    // app shell: network first so new versions land, cached fallback instantly when offline/slow
    e.respondWith(Promise.race([fetch(e.request, { cache: 'no-cache' }).then(r => put(e.request, r)), new Promise(res => setTimeout(() => caches.match(e.request, { ignoreSearch: true }).then(m => m && res(m)), 1500))]).catch(() => caches.match('index.html')));
    return;
  }
  // versioned static files: cache first, refresh in background
  e.respondWith(caches.match(e.request).then(hit => { const net = fetch(e.request).then(r => put(e.request, r)).catch(() => hit); return hit || net; }));
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'J.A.R.V.I.S.', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'J.A.R.V.I.S.', { body: d.body || '', tag: d.tag || undefined, icon: 'icons/icon2-192.png', badge: 'icons/icon2-192.png', data: { url: d.url || './#home' }, renotify: !!d.tag }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './#home', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } } return self.clients.openWindow(url); }));
});
