// Whether Hop's server answered the latest request. The device can be online while the server is
// not, for example when the laptop running Hop is switched off.
import { useSyncExternalStore } from 'react'

let reachable = true
let offlineAnswers = 0
const listeners = new Set<() => void>()

export function reportServer(answered: boolean) {
  if (!answered) offlineAnswers++
  if (answered === reachable) return
  reachable = answered
  for (const listener of listeners) listener()
}

export const isServerReachable = () => reachable

/** How many requests so far were answered without the server, so a refresh can tell it got old data. */
export const offlineAnswerCount = () => offlineAnswers

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => { listeners.delete(onChange) }
}

export function useServerReachable() {
  return useSyncExternalStore(subscribe, isServerReachable, () => true)
}
