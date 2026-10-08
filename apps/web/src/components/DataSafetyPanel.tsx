import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { apiFetch, postJson, readErrorMessage } from '../lib/api.js'

type BackupSummary = { fileName: string; date: string; sizeBytes: number }
type RestorePreview = { exportedAt: string; tables: { table: string; current: number; incoming: number }[] }
type PendingRestore = { source: string; snapshot: unknown; preview: RestorePreview }

const tableLabels: Record<string, string> = {
  goals: 'Goals',
  tasks: 'Tasks',
  habits: 'Habits',
  habitCompletions: 'Habit check-ins',
  events: 'Events',
  opportunities: 'Opportunities',
  projects: 'Projects',
  skills: 'Skills',
  evidence: 'Evidence',
  weeklyReviews: 'Weekly reviews',
}

const visibleBackups = 5

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

/** hop-backup-2026-10-07T07-47-09-728Z.json → the moment it was taken. */
function backupTakenAt(fileName: string) {
  const match = fileName.match(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/)
  const date = fileName.match(/\d{4}-\d{2}-\d{2}/)?.[0]
  return match && date ? formatDateTime(`${date}T${match[1]}:${match[2]}:${match[3]}.${match[4]}Z`) : fileName
}

export function DataSafetyPanel() {
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState<PendingRestore>()
  const [isRestoring, setIsRestoring] = useState(false)

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

  async function prepareRestore(source: string, snapshot: unknown) {
    setPending(undefined)
    setStatus('Checking the backup...')
    try {
      const response = await postJson('/api/restore/preview', snapshot)
      if (!response.ok) { setStatus(await readErrorMessage(response, 'This backup cannot be restored.')); return }
      setPending({ source, snapshot, preview: await response.json() as RestorePreview })
      setStatus('')
    } catch {
      setStatus('The backup could not be checked. Try again in a moment.')
    }
  }

  async function chooseServerBackup(backup: BackupSummary) {
    setStatus('Loading the backup...')
    try {
      const response = await apiFetch(`/api/backups/${encodeURIComponent(backup.fileName)}`)
      if (!response.ok) { setStatus(await readErrorMessage(response, 'The backup could not be loaded.')); return }
      await prepareRestore(`Server backup from ${backupTakenAt(backup.fileName)}`, await response.json())
    } catch {
      setStatus('The backup could not be loaded. Try again in a moment.')
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let snapshot: unknown
    try {
      snapshot = JSON.parse(await file.text())
    } catch {
      setPending(undefined)
      setStatus(`${file.name} is not a Hop backup. Choose a .json file downloaded from Hop.`)
      return
    }
    await prepareRestore(`File ${file.name}`, snapshot)
  }

  async function confirmRestore() {
    if (!pending) return
    setIsRestoring(true)
    setStatus('Restoring...')
    try {
      const response = await postJson('/api/restore', { snapshot: pending.snapshot, confirmed: true })
      if (!response.ok) { setStatus(await readErrorMessage(response, 'The backup could not be restored. Your data was not changed.')); return }
      // Every view holds its own copy of the data, so reload to show the restored records everywhere.
      window.location.reload()
    } catch {
      setStatus('The restore could not be completed. Your data was not changed.')
    } finally {
      setIsRestoring(false)
    }
  }

  const latest = backups[0]
  return (
    <article className="goal-card data-safety">
      <div className="goal-card-header"><h3>Your data</h3><span className="status-pill recorded">{backups.length} {backups.length === 1 ? 'backup' : 'backups'}</span></div>
      <p className="goal-why">{latest ? `Last backup: ${backupTakenAt(latest.fileName)}. Hop backs up automatically each day and keeps 7 daily and 4 weekly copies.` : 'No backups yet. Hop backs up automatically each day while the API is running.'}</p>
      <div className="data-safety-actions">
        <button className="text-button" onClick={() => void backUpNow()} type="button">Back up now</button>
        <a className="text-button" download href="/api/export">Download export</a>
      </div>

      <div className="restore-section">
        <h4>Restore</h4>
        <p className="muted">Restoring replaces all of your current goals, tasks, habits, career, and growth data. Hop saves a backup of your current data first, so a restore can be undone.</p>
        {backups.length > 0 && <ul className="backup-list">{backups.slice(0, visibleBackups).map((backup) => <li key={backup.fileName}><span>{backupTakenAt(backup.fileName)}</span><button className="text-button small" disabled={isRestoring} onClick={() => void chooseServerBackup(backup)} type="button">Restore…</button></li>)}</ul>}
        <label className="file-picker">Restore from a downloaded file<input accept=".json,application/json" disabled={isRestoring} onChange={(event) => void chooseFile(event)} type="file" /></label>
      </div>

      {pending && (
        <div className="restore-preview" role="region" aria-label="Restore preview">
          <strong>{pending.source}</strong>
          <span className="muted">Exported {formatDateTime(pending.preview.exportedAt)}</span>
          <table>
            <thead><tr><th scope="col">Records</th><th scope="col">Now</th><th scope="col">After restore</th></tr></thead>
            <tbody>{pending.preview.tables.map((row) => <tr key={row.table} className={row.current !== row.incoming ? 'changed' : undefined}><th scope="row">{tableLabels[row.table] ?? row.table}</th><td>{row.current}</td><td>{row.incoming}</td></tr>)}</tbody>
          </table>
          <p className="restore-warning">Your current data will be replaced by this backup.</p>
          <div className="data-safety-actions">
            <button className="text-button danger" disabled={isRestoring} onClick={() => void confirmRestore()} type="button">{isRestoring ? 'Restoring...' : 'Replace my data'}</button>
            <button className="text-button small" disabled={isRestoring} onClick={() => setPending(undefined)} type="button">Cancel</button>
          </div>
        </div>
      )}

      {status && <p className="muted" role="status">{status}</p>}
    </article>
  )
}
