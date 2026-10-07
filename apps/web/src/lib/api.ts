export const UNAUTHORIZED_EVENT = 'hop:unauthorized'

/** fetch for Hop's API. A 401 means the session ended, so the sign-in screen is shown again. */
export async function apiFetch(input: string, init?: RequestInit) {
  const response = await fetch(input, init)
  if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  return response
}

export async function postJson(path: string, body: unknown) {
  return apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
