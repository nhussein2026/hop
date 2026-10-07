import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { apiFetch, postJson, readErrorMessage, UNAUTHORIZED_EVENT } from '../lib/api.js'
import { clearOfflineData, useOnlineStatus } from '../lib/pwa.js'

type AuthState = 'loading' | 'setup' | 'login' | 'ready' | 'unavailable'
type AuthGateProps = { children: (signOut: () => Promise<void>) => ReactNode }

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthState>('loading')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const online = useOnlineStatus()

  const [sessionCheck, setSessionCheck] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch('/api/auth/session')
      .then((response) => response.ok ? response.json() as Promise<{ setupRequired: boolean; authenticated: boolean }> : Promise.reject(new Error(`Request failed with ${response.status}`)))
      .then((session) => { if (active) setState(session.setupRequired ? 'setup' : session.authenticated ? 'ready' : 'login') })
      .catch(() => { if (active) setState('unavailable') })
    return () => { active = false }
  }, [sessionCheck])

  useEffect(() => {
    const showLogin = () => { void clearOfflineData(); setMessage('Your session ended. Sign in to continue.'); setState('login') }
    window.addEventListener(UNAUTHORIZED_EVENT, showLogin)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, showLogin)
  }, [])

  const signOut = useCallback(async () => {
    await postJson('/api/auth/logout', {}).catch(() => undefined)
    await clearOfflineData()
    setMessage('')
    setState('login')
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'setup' && password !== confirmation) { setMessage('The passwords do not match.'); return }
    setIsSubmitting(true)
    try {
      const response = await postJson(state === 'setup' ? '/api/auth/setup' : '/api/auth/login', { password })
      if (!response.ok) { setMessage(await readErrorMessage(response, 'Hop could not sign you in. Try again.')); return }
      setPassword(''); setConfirmation(''); setMessage(''); setState('ready')
    } catch {
      setMessage(online ? 'Hop could not reach the API. Check that it is running.' : "You're offline. Reconnect to sign in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state === 'ready') return children(signOut)

  if (state === 'loading' || state === 'unavailable') {
    return <main className="auth-screen"><section className="auth-card"><div className="brand-mark"><span>H</span> Hop</div>{state === 'loading' ? <p className="muted">Opening your workspace...</p> : <><p className="error-banner auth-message" role="alert">{online ? 'Hop could not reach the API. Check that it is running, then try again.' : "You're offline, and this device has no saved copy of your workspace yet. Reconnect to open Hop."}</p><button className="auth-submit" onClick={() => { setState('loading'); setSessionCheck((count) => count + 1) }} type="button">Try again</button></>}</section></main>
  }

  const isSetup = state === 'setup'
  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <div className="brand-mark"><span>H</span> Hop</div>
        <div>
          <h1>{isSetup ? 'Create your password' : 'Welcome back'}</h1>
          <p className="muted">{isSetup ? 'Hop is private. This password protects your workspace on every device. Use at least 12 characters.' : 'Sign in to open your private workspace.'}</p>
        </div>
        <label>Password<input autoComplete={isSetup ? 'new-password' : 'current-password'} autoFocus minLength={isSetup ? 12 : 1} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {isSetup && <label>Confirm password<input autoComplete="new-password" minLength={12} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>}
        {message && <p className="error-banner auth-message" role="alert">{message}</p>}
        <button className="auth-submit" disabled={isSubmitting || !password} type="submit">{isSubmitting ? 'Please wait...' : isSetup ? 'Create password' : 'Sign in'}</button>
      </form>
    </main>
  )
}
