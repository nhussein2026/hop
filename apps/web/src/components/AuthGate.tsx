import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { apiFetch, postJson, readErrorMessage, UNAUTHORIZED_EVENT } from '../lib/api.ts'
import { clearOfflineData, useOnlineStatus } from '../lib/pwa.ts'
import { Icon, Pad } from './Icon.tsx'

type AuthState = 'loading' | 'setup' | 'login' | 'ready' | 'unavailable'
type AuthGateProps = { children: (signOut: () => Promise<void>) => ReactNode }

/** Single user, private network: there is no sign-up and no "forgot password" email flow. */
export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthState>('loading')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
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

  useEffect(() => {
    if (state !== 'ready') document.title = state === 'setup' ? 'Create password · Hop' : 'Sign in · Hop'
  }, [state])

  const signOut = useCallback(async () => {
    await postJson('/api/auth/logout', {}).catch(() => undefined)
    await clearOfflineData()
    setMessage('')
    setState('login')
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const isSetup = state === 'setup'
    if (!password) { setMessage('Enter your password.'); return }
    if (isSetup && password.length < 12) { setMessage('Use at least 12 characters.'); return }
    if (isSetup && password !== confirmation) { setMessage('The passwords do not match.'); return }
    setIsSubmitting(true)
    try {
      const response = await postJson(isSetup ? '/api/auth/setup' : '/api/auth/login', isSetup ? { password } : { password, remember })
      if (!response.ok) {
        const reason = await readErrorMessage(response, 'Hop could not sign you in. Try again.')
        setMessage(response.status === 401 ? 'That password isn’t right. After 5 wrong tries Hop pauses sign-in for a few minutes.' : reason)
        if (response.status === 401) setPassword('')
        return
      }
      setPassword(''); setConfirmation(''); setMessage(''); setState('ready')
    } catch {
      setMessage(online ? 'Hop could not reach your server. Check that it is running.' : "You're offline. Reconnect to sign in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state === 'ready') return children(signOut)

  if (state === 'loading' || state === 'unavailable') {
    return (
      <main className="auth" id="main">
        <div className="auth-card">
          <div className="auth-brand"><Pad size={40} /><span className="brand-name">Hop</span></div>
          {state === 'loading'
            ? <p className="muted">Opening your workspace…</p>
            : <>
                <div className="banner banner-danger" role="alert"><Icon name={online ? 'alertCircle' : 'wifiOff'} /><div className="banner-body"><strong>Can’t reach your Hop server.</strong><span>{online ? 'Check that Hop is running, then try again.' : 'You’re offline, and this device has no saved copy of your workspace yet.'}</span></div></div>
                <button className="btn btn-primary btn-lg btn-block" onClick={() => { setState('loading'); setSessionCheck((count) => count + 1) }} type="button">Try again</button>
              </>}
        </div>
      </main>
    )
  }

  const isSetup = state === 'setup'
  return (
    <main className="auth" id="main">
      <div className="auth-card">
        <div className="auth-brand"><Pad size={40} /><span className="brand-name">Hop</span></div>
        <h1 tabIndex={-1}>{isSetup ? 'Create your password' : 'Sign in'}</h1>
        <p className="muted">{isSetup ? 'Hop is private. This password protects your workspace on every device. Use at least 12 characters.' : 'Your private workspace.'}</p>
        {!online && <div className="banner banner-danger" role="alert"><Icon name="wifiOff" /><div className="banner-body"><strong>You’re offline.</strong><span>Reconnect to sign in.</span></div></div>}
        <form className="form-grid" noValidate onSubmit={(event) => void submit(event)}>
          {message && <div className="banner banner-danger" role="alert"><Icon name="alertCircle" /><div className="banner-body">{message}</div></div>}
          <div className="field">
            <label htmlFor="pw">{isSetup ? 'New password' : 'Password'}</label>
            <div className="pw-wrap">
              <input aria-invalid={message ? true : undefined} autoComplete={isSetup ? 'new-password' : 'current-password'} autoFocus className="input" id="pw" onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} value={password} />
              <button aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="icon-btn" onClick={() => setShowPassword(!showPassword)} type="button"><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button>
            </div>
          </div>
          {isSetup
            ? <div className="field"><label htmlFor="pw2">Repeat password</label><input autoComplete="new-password" className="input" id="pw2" onChange={(event) => setConfirmation(event.target.value)} type={showPassword ? 'text' : 'password'} value={confirmation} /></div>
            : <label className="check-line"><input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" /> Keep me signed in on this device for 30 days</label>}
          <button aria-busy={isSubmitting || undefined} className="btn btn-primary btn-lg btn-block" disabled={!online} type="submit">{isSetup ? 'Create password' : 'Sign in'}</button>
        </form>
        <p className="auth-foot xs muted"><Icon className="icon-sm" name="lock" /> {isSetup ? 'Hop stores only a salted hash of this password, on your own server.' : <>Forgot the password? Reset it on the server with <code>yarn workspace @hop/api auth:reset</code>.</>}</p>
      </div>
    </main>
  )
}
