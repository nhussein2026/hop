// Hop service worker.
//
// - The app shell and built assets are cached so Hop opens without a network.
// - API reads are network-first. The last successful response is kept so previously loaded
//   data stays readable offline. Writes are never queued: the server stays authoritative and
//   offline changes fail visibly instead of being replayed later without conflict checks.
// - Cached API data is private. It is deleted when the session ends (any 401) and when the
//   page signs out.

const SHELL_CACHE = 'hop-shell-v1';
const ASSET_CACHE = 'hop-assets';
const API_CACHE = 'hop-api';
const MAX_ASSET_ENTRIES = 80;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
// Downloads and server-side backup listings are not useful offline.
const UNCACHED_API_PATHS = new Set(['/api/export', '/api/backups', '/api/health']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('hop-shell-') && name !== SHELL_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (!UNCACHED_API_PATHS.has(url.pathname)) event.respondWith(apiNetworkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(shellNetworkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(assetCacheFirst(request));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});

async function apiNetworkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.status === 401) {
      await caches.delete(API_CACHE);
    } else if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: API_CACHE });

    if (cached) {
      return cached;
    }

    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

async function shellNetworkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/', response.clone());
    }

    return response;
  } catch {
    return (await caches.match('/', { cacheName: SHELL_CACHE })) ?? Response.error();
  }
}

// Files under /assets/ have content hashes in their names, so a cached copy never goes stale.
async function assetCacheFirst(request) {
  const cached = await caches.match(request, { cacheName: ASSET_CACHE });

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
    await trimCache(cache, MAX_ASSET_ENTRIES);
  }

  return response;
}

// Old builds' assets accumulate across deploys; drop the oldest entries beyond the limit.
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}
