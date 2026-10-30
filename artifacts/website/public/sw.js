// SyncBeat Service Worker — Offline Support + Web Share Target
const CACHE_NAME = 'syncbeat-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/favicon.svg',
  '/brand-icon-192.png',
  '/brand-icon-512.png',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 🎵 Web Share Target: handle audio file shared from Music app
  if (event.request.method === 'POST' && url.pathname === '/share-audio') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const audioFiles = formData.getAll('audio');
        const title = formData.get('title') || '';

        // Store shared files in cache for the app to pick up
        const sharedFiles = [];
        for (const file of audioFiles) {
          if (file instanceof File) {
            sharedFiles.push({
              name: file.name || title || 'Shared Song',
              size: file.size,
              type: file.type,
              // Store blob URL - app will read from IDB
            });
            // Post message to all open clients
            const clients = await self.clients.matchAll({ type: 'window' });
            for (const client of clients) {
              // Read file as ArrayBuffer to send to client
              const buffer = await file.arrayBuffer();
              client.postMessage({
                type: 'SHARED_AUDIO_FILE',
                name: file.name || title || 'Shared Song',
                mimeType: file.type || 'audio/mpeg',
                buffer: buffer,
              }, [buffer]);
            }
          }
        }

        // Redirect to app (lobby or last room)
        return Response.redirect('/', 303);
      })()
    );
    return;
  }

  // Skip non-GET and API/WS requests
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && !url.pathname.startsWith('/api')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || 'SyncBeat', {
    body: data.body || 'Something happened in your room!',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.tag || 'syncbeat',
    data: data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/lobby'));
});
