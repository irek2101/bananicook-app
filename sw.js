const CACHE_NAME = 'bananicook-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Tylko GET
  if (request.method !== 'GET') {
    return;
  }

  // Dla nawigacji próbujemy najpierw sieć, potem cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('./index.html', responseClone);
          });
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Dla naszych statycznych plików: cache first
  if (
    url.origin === self.location.origin &&
    (
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/manifest.json') ||
      url.pathname.endsWith('/icon-192.png') ||
      url.pathname.endsWith('/icon-512.png') ||
      url.pathname === '/' ||
      url.pathname.endsWith('/bananicook-app/')
    )
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // Domyślnie: sieć, a jak padnie to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
