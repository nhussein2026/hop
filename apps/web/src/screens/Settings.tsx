// Settings, grouped by what people come here to do. Data safety is a first-class section.
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { followUp, orgOf } from '../lib/rules.ts'
import { postJson, readErrorMessage } from '../lib/api.ts'
import type { Settings as SettingsType } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, Dialog, Field, Segmented, SubmitButton } from '../components/ui.tsx'
import { api, useHop } from '../store/store.ts'
import { focusFirstInvalid, formText, useDialogs, useToast, closeDialog } from '../components/ui-context.ts'
import { useConfirm } from '../components/confirm.tsx'
import { SETTINGS_SECTIONS, settingsTitle, timezoneOptions, useIsPhone } from '../lib/layout.ts'
import { sizeLabel } from '../lib/labels.ts'


export function Settings({ section, onSignOut }: { section?: string; onSignOut: () => Promise<void> }) {
  const phone = useIsPhone()
  if (phone && !section) {
    return (
      <div className="page page-narrow">
        <header className="page-head"><div className="page-head-text"><h1 tabIndex={-1}>Settings</h1></div></header>
        <nav aria-label="Settings sections" className="rows">{SETTINGS_SECTIONS.map(([key, label, icon]) => <a className="row settings-link" href={`#/settings/${key}`} key={key}><Icon name={icon} /><span className="row-main row-title">{label}</span><Icon className="icon-sm" name="chevron" /></a>)}</nav>
      </div>
    )
  }
  const active = SETTINGS_SECTIONS.some(([key]) => key === section) ? section! : 'profile'
  const body: Record<string, ReactNode> = {
    profile: <Profile />,
    appearance: <Appearance />,
    notifications: <NotificationSettings />,
    career: <CareerRules />,
    data: <DataSafety />,
    security: <Security onSignOut={onSignOut} />,
  }
  return (
    <div className="page">
      <header className="page-head"><div className="page-head-text"><h1 tabIndex={-1}>{phone ? settingsTitle(active, phone) : 'Settings'}</h1></div></header>
      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav hide-phone">{SETTINGS_SECTIONS.map(([key, label, icon]) => <a aria-current={key === active ? 'page' : undefined} className="nav-item" href={`#/settings/${key}`} key={key}><Icon name={icon} /><span>{label}</span></a>)}</nav>
        <div className="settings-body">{body[active]}</div>
      </div>
    </div>
  )
}

function Card({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return <section className="panel panel-pad settings-card"><div className="settings-card-head"><h2>{title}</h2>{desc && <p className="small muted">{desc}</p>}</div>{children}</section>
}

function Profile() {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const settings = data.settings

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fd = new FormData(form)
    const name = formText(form, 'name')
    setError(name ? '' : 'Add the name Hop should use.')
    if (!name) return focusFirstInvalid(form)
    void actions.settings.update({ name, timezone: String(fd.get('timezone')), weekStart: Number(fd.get('weekStart')) as SettingsType['weekStart'], workHours: formText(form, 'workHours') }, 'Profile saved')
  }

  return (
    <Card desc="Used for greetings, dates and when your day starts and ends." title="Profile">
      <form className="form-grid" noValidate onSubmit={submit}>
        <Field autoComplete="given-name" defaultValue={settings.name} error={error} id="set-name" label="Name" name="name" />
        <div className="form-row">
          <Field defaultValue={settings.timezone} hint="Habits, deadlines and “today” follow this, not the server clock." id="set-tz" label="Timezone" name="timezone" options={timezoneOptions(settings.timezone)} type="select" />
          <Field defaultValue={String(settings.weekStart)} id="set-week" label="Week starts on" name="weekStart" options={[['1', 'Monday'], ['0', 'Sunday'], ['6', 'Saturday']]} type="select" />
        </div>
        <Field defaultValue={settings.workHours} hint="Reminders stay quiet outside these hours." id="set-hours" label="Usual work hours" name="workHours" optional />
        <div><button className="btn btn-primary" type="submit">Save profile</button></div>
      </form>
    </Card>
  )
}

function Appearance() {
  const { data } = useHop()
  const actions = useActions()
  return (
    <Card title="Appearance">
      <Segmented label="Theme" name="theme" onChange={(theme) => void actions.settings.update({ theme: theme as SettingsType['theme'] }, 'Theme updated', true)} options={[['system', <><Icon className="icon-sm" name="monitor" />Match device</>], ['light', <><Icon className="icon-sm" name="sun" />Light</>], ['dark', <><Icon className="icon-sm" name="moon" />Dark</>]]} value={data.settings.theme} />
      <p className="small muted" style={{ marginTop: 'var(--s-4)' }}>Motion follows your device’s reduced-motion setting. Celebrations are small and only appear for real milestones: an offer, an achieved goal, a completed review.</p>
    </Card>
  )
}

function NotificationSettings() {
  const { data } = useHop()
  const actions = useActions()
  const notify = data.settings.notify
  const names = { critical: 'urgent', important: 'important', optional: 'gentle nudges' }
  const row = (key: keyof typeof notify, title: string, examples: string) => (
    <label className="switch" key={key}>
      <span><strong>{title}</strong><span className="xs muted" style={{ display: 'block' }}>{examples}</span></span>
      <input checked={notify[key]} onChange={(event) => void actions.settings.update({ notify: { ...notify, [key]: event.target.checked } }, `${event.target.checked ? 'On' : 'Off'}: ${names[key]} notifications`)} role="switch" type="checkbox" />
    </label>
  )
  return (
    <Card desc="Hop only notifies you when there’s something to act on. It never sends streak or guilt reminders." title="Notifications">
      <div className="switch-list">
        {row('critical', 'Urgent', 'Interview within 24 hours, deadline today, offer awaiting a response')}
        {row('important', 'Important', 'Deadline in 2 days, overdue follow-up, weekly or monthly review due')}
        {row('optional', 'Gentle nudges', 'A goal with no next action or no activity for 2 weeks')}
      </div>
    </Card>
  )
}

function CareerRules() {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const days = data.settings.followUpDays
  const today = D.today()
  const due = data.opportunities.filter((o) => followUp(o, today, days))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(new FormData(event.currentTarget).get('days'))
    const valid = value >= 3 && value <= 60
    setError(valid ? '' : 'Use a number from 3 to 60.')
    if (valid) void actions.settings.update({ followUpDays: value }, `Follow-up rule set to ${value} days`)
  }

  return (
    <Card desc="When an application goes quiet, Hop suggests a follow-up." title="Follow-up rule">
      <form className="form-grid" noValidate onSubmit={submit}>
        <Field defaultValue={days} error={error} label="Suggest a follow-up after this many quiet days" max={60} min={3} name="days" type="number" />
        <p className="small muted">Applies to applied, screening, assessment and final-round stages. Never while an interview or deadline is scheduled, and never for closed opportunities.</p>
        <Banner icon="info" tone="info">With {days} days: {due.length ? <>{due.map((o, index) => <span key={o.id}>{index > 0 && ', '}<strong>{orgOf(o)}</strong></span>)}{due.length === 1 ? ' needs' : ' need'} a follow-up now.</> : 'nothing needs a follow-up right now.'}</Banner>
        <div><button className="btn btn-primary" type="submit">Save rule</button></div>
      </form>
    </Card>
  )
}

/* ---- Backup and export ------------------------------------------------------------------- */
type BackupSummary = { fileName: string; date: string; sizeBytes: number }
type RestorePreview = { exportedAt: string; tables: { table: string; current: number; incoming: number }[] }

const TABLE_LABELS: Record<string, string> = {
  goals: 'Goals', tasks: 'Tasks', habits: 'Habits', habitCompletions: 'Habit check-ins', events: 'Events', opportunities: 'Opportunities',
  projects: 'Projects', skills: 'Skills', evidence: 'Evidence', weeklyReviews: 'Weekly reviews', goalCriteria: 'Success criteria',
  goalProgress: 'Progress history', resumeFiles: 'Resume files', milestones: 'Milestones', opportunityPrep: 'Preparation items', opportunityActivities: 'Timeline entries',
  contacts: 'People', interactions: 'Interactions', resumes: 'Resume versions', reflections: 'Reflections', monthlyReviews: 'Monthly reviews', settings: 'Settings',
}

/** hop-backup-2026-10-07T07-47-09-728Z.json → the moment it was taken, as an ISO timestamp. */
function backupTakenAt(fileName: string) {
  const match = fileName.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/)
  return match ? `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z` : null
}

function DataSafety() {
  const toast = useToast()
  const { open } = useDialogs()
  const [backups, setBackups] = useState<BackupSummary[]>()
  const [system, setSystem] = useState<{ databasePath: string; backupDirectory: string }>()
  const [busy, setBusy] = useState<string>()
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    api.get<BackupSummary[]>('/api/backups').then(setBackups, () => setLoadFailed(true))
    api.get<{ databasePath: string; backupDirectory: string }>('/api/system').then(setSystem, () => undefined)
  }, [])

  async function backUpNow() {
    setBusy('backup')
    try {
      const backup = await api.post<BackupSummary>('/api/backups')
      setBackups((current) => [backup, ...(current ?? [])])
      toast(`Backup created: ${backup.fileName} (${sizeLabel(backup.sizeBytes)})`)
    } catch {
      toast('The backup could not be created. Try again in a moment.', { type: 'error' })
    } finally {
      setBusy(undefined)
    }
  }

  async function testRestore() {
    setBusy('test')
    try {
      const result = await api.post<{ fileName: string; records: number }>('/api/backups/test')
      toast(`Restore test passed: ${result.records} records restored from the latest backup.`)
    } catch (cause) {
      toast(cause instanceof Error && cause.message ? cause.message : 'The restore test could not run. Try again in a moment.', { type: 'error', timeout: 8000 })
    } finally {
      setBusy(undefined)
    }
  }

  async function prepareRestore(source: string, snapshot: unknown) {
    try {
      const response = await postJson('/api/restore/preview', snapshot)
      if (!response.ok) { toast(await readErrorMessage(response, 'This backup cannot be restored.'), { type: 'error', timeout: 8000 }); return }
      const preview = await response.json() as RestorePreview
      open((close) => <RestoreDialog close={close} preview={preview} snapshot={snapshot} source={source} />)
    } catch {
      toast('The backup could not be checked. Try again in a moment.', { type: 'error' })
    }
  }

  async function chooseServerBackup(backup: BackupSummary) {
    try {
      const taken = backupTakenAt(backup.fileName)
      await prepareRestore(`Server backup from ${taken ? `${D.withDay(D.ymdOf(taken))}, ${D.timeOf(taken)}` : backup.fileName}`, await api.get(`/api/backups/${encodeURIComponent(backup.fileName)}`))
    } catch {
      toast('The backup could not be loaded. Try again in a moment.', { type: 'error' })
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
      toast('That isn’t a Hop export. Choose a .json file downloaded from Hop.', { type: 'error' })
      return
    }
    await prepareRestore(file.name, snapshot)
  }

  const latest = backups?.[0]
  const latestAt = latest ? backupTakenAt(latest.fileName) : null

  return (
    <>
      <Card title="Where your data lives">
        <dl className="facts">
          <div><dt>Database</dt><dd>{system ? <code>{system.databasePath}</code> : '…'} (SQLite)</dd></div>
          <div><dt>Backups</dt><dd>{system ? <code>{system.backupDirectory}</code> : '…'}</dd></div>
          <div><dt>Leaves the server</dt><dd>Nothing. No analytics, no third-party services; fonts are served by Hop itself.</dd></div>
        </dl>
      </Card>
      <Card desc="Automatic once a day while Hop is running. Keeps 7 daily and 4 weekly copies." title="Backups">
        {loadFailed
          ? <Banner icon="alertCircle" tone="danger">Backups could not be loaded.</Banner>
          : latestAt
            ? <div className="backup-status"><Icon name="check" /><div><strong>Last backup {D.timeAgo(latestAt)}</strong><span className="xs muted">{D.withDay(D.ymdOf(latestAt))}, {D.timeOf(latestAt)}. {latest!.fileName}, {sizeLabel(latest!.sizeBytes)}.</span></div></div>
            : backups && <Banner icon="alert" tone="warning">No backups yet. Create one now; Hop also backs up automatically each day.</Banner>}
        <div className="btn-row">
          <button aria-busy={busy === 'backup' || undefined} className="btn" disabled={Boolean(busy)} onClick={() => void backUpNow()} type="button"><Icon className="icon-sm" name="database" />Back up now</button>
          <button aria-busy={busy === 'test' || undefined} className="btn" disabled={Boolean(busy) || !latest} onClick={() => void testRestore()} type="button"><Icon className="icon-sm" name="refresh" />Test a restore</button>
        </div>
        <p className="xs muted">A backup you’ve never restored isn’t fully trusted. Hop restores the latest copy into a scratch database and checks every record arrived.</p>
        {backups && backups.length > 0 && (
          <details className="disclosure">
            <summary>Restore from a backup on the server</summary>
            <div className="rows rows-flat">
              {backups.slice(0, 5).map((backup) => {
                const taken = backupTakenAt(backup.fileName)
                return <div className="row" key={backup.fileName}><Icon name="database" /><div className="row-main"><span className="row-title">{taken ? `${D.withDay(D.ymdOf(taken))}, ${D.timeOf(taken)}` : backup.fileName}</span><span className="row-meta"><span>{sizeLabel(backup.sizeBytes)}</span></span></div><button className="btn btn-sm" onClick={() => void chooseServerBackup(backup)} type="button">Restore…</button></div>
              })}
            </div>
          </details>
        )}
      </Card>
      <Card desc="A portable copy of everything as one JSON file." title="Export">
        <div className="btn-row"><a className="btn" download href="/api/export"><Icon className="icon-sm" name="download" />Download export</a></div>
      </Card>
      <Card desc="Replace your data with an export from Hop." title="Import">
        <div className="field">
          <label htmlFor="import-file">Export file</label>
          <input accept=".json,application/json" className="input" id="import-file" onChange={(event) => void chooseFile(event)} type="file" />
          <span className="field-hint">You’ll see what changes before anything is replaced. A safety backup is made first.</span>
        </div>
      </Card>
    </>
  )
}

function RestoreDialog({ source, snapshot, preview, close }: { source: string; snapshot: unknown; preview: RestorePreview; close: () => void }) {
  async function submit() {
    const response = await postJson('/api/restore', { snapshot, confirmed: true }).catch(() => undefined)
    if (!response) return 'The restore could not be completed. Your data was not changed.'
    if (!response.ok) return readErrorMessage(response, 'The backup could not be restored. Your data was not changed.')
    // Every screen reads from the loaded data, so reload to show the restored records everywhere.
    window.location.reload()
  }
  const changed = preview.tables.filter((row) => row.current || row.incoming)
  return (
    <Dialog desc={source} foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton className="btn btn-danger">Back up, then import</SubmitButton></>} initialFocus=".dialog-foot [data-close]" onClose={close} onSubmit={submit} title="Review import">
      <div className="stack stack-sm">
        <Banner icon="alert" title="This replaces all data on this Hop server." tone="warning">A safety backup of your current data is created first, so you can roll back.</Banner>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Data</th><th className="num">Now</th><th className="num">After import</th></tr></thead>
          <tbody>{changed.map((row) => <tr key={row.table}><td>{TABLE_LABELS[row.table] ?? row.table}</td><td className="num">{row.current}</td><td className="num">{row.incoming}</td></tr>)}</tbody>
        </table></div>
        <p className="small muted">Exported {D.withDay(D.ymdOf(preview.exportedAt))}, {D.timeOf(preview.exportedAt)}.</p>
      </div>
    </Dialog>
  )
}

/* ---- Privacy and security ------------------------------------------------------------------ */
type DeviceSession = { id: string; userAgent: string | null; createdAt: string; lastSeenAt: string; current: boolean }

function describeDevice(userAgent: string | null): [string, string, string] {
  const ua = userAgent ?? ''
  const phone = /iPhone|Android.+Mobile|Mobile Safari/i.test(ua)
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Mac OS X/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Unknown system'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ua ? 'Browser' : 'Unknown browser'
  return [phone ? 'phone' : 'laptop', phone ? `${os} phone` : `${os} computer`, `${browser} on ${os}`]
}

function Security({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { open } = useDialogs()
  const [sessions, setSessions] = useState<DeviceSession[]>()

  useEffect(() => { api.get<DeviceSession[]>('/api/auth/sessions').then(setSessions, () => setSessions([])) }, [])

  async function signOutDevice(session: DeviceSession, name: string) {
    if (!await confirm({ title: `Sign out ${name}?`, body: 'That device will need your password next time it opens Hop.', confirmLabel: 'Sign out device', tone: 'danger' })) return
    try {
      await api.delete(`/api/auth/sessions/${session.id}`)
      setSessions((current) => current?.filter((item) => item.id !== session.id))
      toast(`${name} signed out`)
    } catch {
      toast('That device could not be signed out. Try again in a moment.', { type: 'error' })
    }
  }

  async function signOut() {
    if (await confirm({ title: 'Sign out of this device?', body: 'Your data stays on the server. You’ll need your password to come back.', confirmLabel: 'Sign out' })) await onSignOut()
  }

  return (
    <>
      <Card desc="Each device needs your password. Sign out any you don’t recognise." title="Signed-in devices">
        <div className="rows rows-flat">
          {sessions === undefined && <p className="small muted">Loading…</p>}
          {sessions?.map((session) => {
            const [icon, name, detail] = describeDevice(session.userAgent)
            return (
              <div className="row" key={session.id}>
                <Icon name={icon} />
                <div className="row-main"><span className="row-title">{name}{session.current && <> <Badge tone="primary">This device</Badge></>}</span><span className="row-meta"><span>{detail}</span><span>{session.current ? 'Active now' : `Active ${D.timeAgo(session.lastSeenAt)}`}</span></span></div>
                {!session.current && <button className="btn btn-sm" onClick={() => void signOutDevice(session, name)} type="button">Sign out</button>}
              </div>
            )
          })}
        </div>
      </Card>
      <Card title="Password"><div><button className="btn" onClick={() => open((close) => <ChangePassword close={close} />)} type="button"><Icon className="icon-sm" name="lock" />Change password</button></div></Card>
      <Card title="Session"><div><button className="btn" onClick={() => void signOut()} type="button"><Icon className="icon-sm" name="logout" />Sign out of this device</button></div></Card>
    </>
  )
}

function ChangePassword({ close }: { close: () => void }) {
  const toast = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const current = String(fd.get('current') ?? '')
    const next = String(fd.get('next') ?? '')
    const problems: Record<string, string> = {}
    if (!current) problems.current = 'Enter your current password.'
    if (next.length < 12) problems.next = 'Use at least 12 characters.'
    if (fd.get('again') !== next) problems.again = 'The two new passwords don’t match.'
    setErrors(problems)
    if (Object.keys(problems).length) return focusFirstInvalid(form)
    const response = await postJson('/api/auth/password', { currentPassword: current, newPassword: next }).catch(() => undefined)
    if (!response) return 'The password could not be changed. Try again in a moment.'
    if (!response.ok) return readErrorMessage(response, 'The password could not be changed.')
    closeDialog(form)
    toast('Password changed. Other devices will need the new password.')
  }

  return (
    <Dialog className="dialog-sm" foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Change password</SubmitButton></>} onClose={close} onSubmit={submit} title="Change password">
      <div className="form-grid">
        <Field autoComplete="current-password" error={errors.current} label="Current password" name="current" type="password" />
        <Field autoComplete="new-password" error={errors.next} hint="At least 12 characters. A passphrase is easiest to remember." label="New password" name="next" type="password" />
        <Field autoComplete="new-password" error={errors.again} label="Repeat new password" name="again" type="password" />
      </div>
    </Dialog>
  )
}
