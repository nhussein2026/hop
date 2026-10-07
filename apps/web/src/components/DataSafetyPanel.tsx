import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'

type BackupSummary = { fileName: string; date: string; sizeBytes: number }

export function DataSafetyPanel() {
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    apiFetch('/api/backups', { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<BackupSummary[]> : Promise.reject(new Error(`Request failed with ${response.status}`)))
      .then(setBackups)
      .catch((cause: unknown) => { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setStatus('Backups could not be loaded.') })
    return () => controller.abort()
  }, [])

  async function backUpNow() {
    setStatus('Creating backup...')
    try {
      const response = await apiFetch('/api/backups', { method: 'POST' })
      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      const backup = await response.json() as BackupSummary
      setBackups((current) => [backup, ...current])
      setStatus('Backup saved on the server.')
    } catch {
      setStatus('The backup could not be created. Try again in a moment.')
    }
  }

  const latest = backups[0]
  return <article className="goal-card data-safety"><div className="goal-card-header"><h3>Your data</h3><span className="status-pill recorded">{backups.length} backups</span></div><p className="goal-why">{latest ? `Last backup: ${latest.date}. Hop backs up automatically each day and keeps 7 daily and 4 weekly copies.` : 'No backups yet. Hop backs up automatically each day while the API is running.'}</p><div className="data-safety-actions"><button className="text-button" onClick={() => void backUpNow()} type="button">Back up now</button><a className="text-button" download href="/api/export">Download export</a></div>{status && <p className="muted" role="status">{status}</p>}</article>
}
