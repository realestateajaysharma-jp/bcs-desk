/* BCS Desk — online-first PWA shell.
   Public internet is unrestricted: cross-origin requests are never intercepted.
   Same-origin app files are network-first; the cache is only an offline fallback.
   Live/public data endpoints are never cached. Client data stays on-device. */
const CACHE = 'bcs-desk-v224';
const ASSETS = [
  './festivals.json',
  './',
  './index.html',
  './yt.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Never touch the open internet: maps, feeds, tiles, CDNs, APIs go direct.
  if (url.origin !== self.location.origin) return;

  // Never cache live/public data or explicit no-store/cache-bust requests.
  const noCache = req.cache === 'no-store' ||
    /[?&](?:_|t|ts|v|cb|nocache|bcs)=/i.test(url.search) ||
    /\/sw\.js$|\/festivals\.json$/i.test(url.pathname);
  if (noCache) return;

  // Network-first for the app shell; cache is only used when offline.
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        if (res && res.ok && res.type !== 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
        }
        return Response.error();
      })
  );
});
