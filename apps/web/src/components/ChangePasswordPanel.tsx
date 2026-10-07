import { useState } from 'react'
import type { FormEvent } from 'react'
import { postJson, readErrorMessage } from '../lib/api.js'

export function ChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('Saving...')
    try {
      const response = await postJson('/api/auth/password', { currentPassword, newPassword })
      if (!response.ok) { setStatus(await readErrorMessage(response, 'The password could not be changed.')); return }
      setCurrentPassword(''); setNewPassword('')
      setStatus('Password changed. Other devices have been signed out.')
    } catch {
      setStatus('The password could not be changed. Try again in a moment.')
    }
  }

  return <form className="goal-card account-form" onSubmit={(event) => void submit(event)}><div className="goal-card-header"><h3>Password</h3></div><label>Current password<input autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></label><label>New password<input autoComplete="new-password" minLength={12} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} /></label><div className="data-safety-actions"><button className="text-button" disabled={!currentPassword || newPassword.length < 12} type="submit">Change password</button></div>{status && <p className="muted" role="status">{status}</p>}</form>
}
