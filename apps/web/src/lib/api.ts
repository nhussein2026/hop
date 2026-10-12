import { reportServer } from './server.ts'

export const UNAUTHORIZED_EVENT = 'hop:unauthorized'

/** Set by the service worker on answers that didn't come from the server. Must match public/sw.js. */
export const OFFLINE_HEADER = 'X-Hop-Offline'

// `tailscale serve` answers with these when the machine is up but Hop isn't running. Hop never does.
const GATEWAY_ERRORS = new Set([502, 503, 504])

/** Long enough for a slow mobile connection, short enough that a switched-off server doesn't leave a request hanging. */
const REQUEST_TIMEOUT_MS = 30_000

/** For large uploads and restores, where giving up early could report a change as failed after the server made it. */
export const LONG_REQUEST_TIMEOUT_MS = 5 * 60_000

/** The server couldn't be reached at all, as opposed to the server refusing a request. */
export class ServerUnreachableError extends Error {
  constructor() {
    super('Hop’s server isn’t reachable.')
    this.name = 'ServerUnreachableError'
  }
}

/** fetch for Hop's API. A 401 means the session ended, so the sign-in screen is shown again. */
export async function apiFetch(input: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...options } = init
  let response: Response
  try {
    response = await fetch(input, { ...options, signal: options.signal ?? AbortSignal.timeout(timeoutMs) })
  } catch {
    reportServer(false)
    throw new ServerUnreachableError()
  }
  if (GATEWAY_ERRORS.has(response.status) || (response.headers.has(OFFLINE_HEADER) && !response.ok)) {
    reportServer(false)
    throw new ServerUnreachableError()
  }
  // An answer from this device's offline copy is still usable, but the server wasn't reached.
  reportServer(!response.headers.has(OFFLINE_HEADER))
  if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  return response
}

/** Ask the server whether it's up. /api/health is never answered from the offline copy. */
export async function pingServer() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    reportServer(response.ok)
    return response.ok
  } catch {
    reportServer(false)
    return false
  }
}

export async function postJson(path: string, body: unknown, timeoutMs?: number) {
  return apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs })
}

/** The first human-readable message in an API error response. */
export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> } }
    if (typeof body.error === 'string') return body.error
    const fieldMessage = Object.values(body.error?.fieldErrors ?? {}).flat().find(Boolean)
    return body.error?.formErrors?.[0] ?? fieldMessage ?? fallback
  } catch {
    return fallback
  }
}
