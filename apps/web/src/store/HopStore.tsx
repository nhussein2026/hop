// All of Hop's data, loaded once and kept current as changes are saved.
// Every change goes through commit(): it shows "Saving…", applies the server's answer, and on
// failure leaves the data as it was and offers Try again. Offline is read-only with a clear
// message; there is no silent offline queue.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, setTimezone, today as todayIn } from '../lib/dates.ts'
import { useOnlineStatus } from '../lib/pwa.ts'
import type { HopData, Settings } from '../lib/types.ts'
import { useToast } from '../components/ui-context.ts'
import { StoreContext, api } from './store.ts'
import type { Collection, CommitOptions, Sync, UiState } from './store.ts'

const endpoints: Record<Collection, string> = {
  goals: '/api/goals',
  tasks: '/api/tasks',
  habits: '/api/habits',
  completions: '',
  events: '/api/events',
  opportunities: '/api/opportunities',
  projects: '/api/projects',
  skills: '/api/skills',
  evidence: '/api/evidence',
  weeklyReviews: '/api/reviews/weekly',
  monthlyReviews: '/api/reviews/monthly',
  milestones: '/api/milestones',
  contacts: '/api/contacts',
  interactions: '/api/interactions',
  resumes: '/api/resumes',
  reflections: '/api/reflections',
}

/** Habit consistency looks back four weeks, and the monthly review may cover last month until the 7th. */
const completionDays = 42

async function loadAll(): Promise<HopData> {
  const settings = await api.get<Settings>('/api/settings')
  setTimezone(settings.timezone)
  const today = todayIn()
  const keys = Object.keys(endpoints) as Collection[]
  const lists = await Promise.all(keys.map((key) => key === 'completions'
    ? api.get(`/api/habits/completions?from=${addDays(today, -completionDays)}&to=${today}`)
    : api.get(endpoints[key])))
  return Object.fromEntries([['settings', settings], ...keys.map((key, index) => [key, lists[index]])]) as HopData
}

function applyTheme(theme: Settings['theme']) {
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme)
  else document.documentElement.removeAttribute('data-theme')
}

export function HopProvider({ children, loading, failed }: { children: ReactNode; loading: ReactNode; failed: (retry: () => void) => ReactNode }) {
  const [data, setData] = useState<HopData>()
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [sync, setSync] = useState<Sync>('saved')
  const [ui, setUiState] = useState<UiState>({ skipped: [], taskFilter: 'today', agendaFilter: 'all', oppFilter: 'active' })
  const online = useOnlineStatus()
  const toast = useToast()
  const pending = useRef(0)

  useEffect(() => {
    let active = true
    loadAll()
      .then((loaded) => { if (active) { setData(loaded); setLoadError(false) } })
      .catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [attempt])

  if (data) setTimezone(data.settings.timezone)
  useEffect(() => { if (data) applyTheme(data.settings.theme) }, [data])

  const update = useCallback((change: (current: HopData) => HopData) => setData((current) => current && change(current)), [])
  const setUi = useCallback((patch: Partial<UiState>) => setUiState((current) => ({ ...current, ...patch })), [])

  const commit = useCallback(async function commit<T>(label: string, run: () => Promise<T>, apply?: (result: T, data: HopData) => HopData, options: CommitOptions = {}): Promise<T | undefined> {
    if (!navigator.onLine) {
      toast("You're offline. This change wasn't saved. Hop will be editable again when you reconnect.", { type: 'error' })
      return undefined
    }
    pending.current++
    setSync('saving')
    try {
      const result = await run()
      if (apply) setData((current) => current && apply(result, current))
      pending.current--
      if (!pending.current) setSync('saved')
      if (!options.quiet) toast(options.toast ?? label, { action: options.undo ? { label: 'Undo', run: options.undo } : undefined })
      return result
    } catch (cause) {
      pending.current--
      setSync('error')
      const reason = cause instanceof Error && cause.message && !cause.message.startsWith('Request failed') ? ` ${cause.message}` : ''
      toast(`Couldn't save.${reason || ' Your previous data is still safe.'}`, {
        type: 'error',
        action: { label: 'Try again', run: () => void commit(label, run, apply, options) },
        timeout: 8000,
      })
      return undefined
    }
  }, [toast])

  const store = useMemo(() => data && { data, sync, online, ui, setUi, update, commit }, [data, sync, online, ui, setUi, update, commit])

  if (!store) return <>{loadError ? failed(() => { setLoadError(false); setAttempt((count) => count + 1) }) : loading}</>
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
