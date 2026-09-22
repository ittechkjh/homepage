// CrytoPnL Service Worker (PWA)
const CACHE_NAME = 'crytopnl-cache-20260923_01';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/styles.css',
  '/css/analyzer.css'
];

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache asset warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clear obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first with cache fallback (APIs strictly bypass cache)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Always bypass cache for non-GET requests or dynamic APIs / Analytics / AdSense
  if (req.method !== 'GET' ||
      url.hostname.includes('upbit.com') ||
      url.hostname.includes('bithumb.com') ||
      url.hostname.includes('coingecko.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googletagmanager.com') ||
      url.hostname.includes('google-analytics.com') ||
      url.hostname.includes('doubleclick.net') ||
      url.hostname.includes('googlesyndication.com')) {
    return;
  }

  // 2. HTML and scripts: Network-first for fresh updates, fallback to cache
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
