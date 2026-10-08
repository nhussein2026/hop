import { useSyncExternalStore } from 'react'

// Hash routes, as in the prototype: #/today, #/goals/<id>, #/career/people?contact=<id> …
// They need no server support and survive reloads.

export type Route = { screen: string; params: string[]; query: Record<string, string> }

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function parseHash(hash: string): Route {
  const raw = (hash || '#/today').replace(/^#\/?/, '')
  const [path = '', queryString] = raw.split('?')
  const parts = path.split('/').filter(Boolean)
  return { screen: parts[0] || 'today', params: parts.slice(1), query: Object.fromEntries(new URLSearchParams(queryString ?? '')) }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '')
  return parseHash(hash)
}

export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, '')
}
