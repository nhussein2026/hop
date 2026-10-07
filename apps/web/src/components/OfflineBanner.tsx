import { useOnlineStatus } from '../lib/pwa.js'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return <p className="offline-banner" role="status">You're offline. Hop is showing the data it saved last time. Changes can't be saved until you reconnect.</p>
}
