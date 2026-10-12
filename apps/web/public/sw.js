// Hop service worker.
//
// - The app shell and built assets are cached so Hop opens without a network.
// - API reads are network-first. The last successful response is kept so previously loaded
//   data stays readable offline. Writes are never queued: the server stays authoritative and
//   offline changes fail visibly instead of being replayed later without conflict checks.
// - The server can be off while this device is online (Hop may run on a laptop). A request that
//   hasn't answered after NETWORK_TIMEOUT_MS is answered from the offline copy instead, and the
//   server keeps updating that copy in the background if it answers later.
// - Cached API data is private. It is deleted when the session ends (any 401) and when the
//   page signs out.

const SHELL_CACHE = 'hop-shell-v1';
const ASSET_CACHE = 'hop-assets';
const API_CACHE = 'hop-api';
const MAX_ASSET_ENTRIES = 80;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
// Downloads and server-side backups are not useful offline, and backup files are large.
const UNCACHED_API_PATHS = new Set(['/api/export', '/api/health']);
const UNCACHED_API_PREFIX = '/api/backups';
const NETWORK_TIMEOUT_MS = 4000;
// Marks answers that didn't come from the server, so the page can tell it wasn't reached.
// Must match OFFLINE_HEADER in src/lib/api.ts.
const OFFLINE_HEADER = 'X-Hop-Offline';
// `tailscale serve` answers with these when the machine is up but Hop isn't running. Hop never does.
const GATEWAY_ERRORS = new Set([502, 503, 504]);

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
    if (!UNCACHED_API_PATHS.has(url.pathname) && !url.pathname.startsWith(UNCACHED_API_PREFIX)) event.respondWith(apiNetworkFirst(event));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(shellNetworkFirst(event));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(assetCacheFirst(request));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});

async function apiNetworkFirst(event) {
  const { request } = event;
  const network = fetch(request).then(async (response) => {
    if (GATEWAY_ERRORS.has(response.status)) {
      throw new Error('Hop is not running');
    }

    if (response.status === 401) {
      await caches.delete(API_CACHE);
    } else if (response.ok) {
      await saveApiCopy(request, response);
    }

    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const copy = await findApiCopy(request);

  try {
    return await (copy ? withTimeout(network, NETWORK_TIMEOUT_MS) : network);
  } catch {
    return copy ? markOffline(copy) : offlineError();
  }
}

// A request with a query, such as habit completions for a date range, is also saved under its bare
// path: the first request on a new day asks for a new range, which has no copy of its own yet.
async function saveApiCopy(request, response) {
  const url = new URL(request.url);
  const copies = [[request, response.clone()]];

  if (url.search) {
    copies.push([url.pathname, response.clone()]);
  }

  const cache = await caches.open(API_CACHE);
  await Promise.all(copies.map(([key, copy]) => cache.put(key, copy)));

  // Only the latest range per path is worth keeping; older ones would pile up day by day.
  if (url.search) {
    const older = await cache.keys(url.pathname, { ignoreSearch: true });
    await Promise.all(older.filter((key) => new URL(key.url).search && key.url !== request.url).map((key) => cache.delete(key)));
  }
}

async function findApiCopy(request) {
  const cache = await caches.open(API_CACHE);
  return (await cache.match(request)) ?? (await cache.match(new URL(request.url).pathname));
}

function markOffline(response) {
  const headers = new Headers(response.headers);
  headers.set(OFFLINE_HEADER, '1');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function offlineError() {
  return new Response(JSON.stringify({ error: 'You are offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', [OFFLINE_HEADER]: '1' },
  });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function shellNetworkFirst(event) {
  const network = fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/', response.clone());
    }

    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const copy = await caches.match('/', { cacheName: SHELL_CACHE });

  try {
    const response = await (copy ? withTimeout(network, NETWORK_TIMEOUT_MS) : network);
    // A gateway error page is worse than the app opening on its offline copy.
    return copy && GATEWAY_ERRORS.has(response.status) ? copy : response;
  } catch {
    return copy ?? Response.error();
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
