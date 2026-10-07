import { useSyncExternalStore } from 'react'

/** Must match API_CACHE in public/sw.js. */
const API_CACHE = 'hop-api'

export function registerServiceWorker() {
  // Only production builds: in development a service worker would serve stale Vite modules.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => console.error('Service worker registration failed', error))
  })
}

/** Remove private API responses saved for offline reading, such as after signing out. */
export async function clearOfflineData() {
  if ('caches' in window) await caches.delete(API_CACHE)
}

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
