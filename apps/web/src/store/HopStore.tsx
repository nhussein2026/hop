// All of Hop's data, loaded at start and kept current as changes are saved.
// Every change goes through commit(): it shows "Saving…", applies the server's answer, and on
// failure leaves the data as it was and offers Try again. Offline, or while the server is off,
// Hop is read-only with a clear message; there is no silent offline queue.
// Other devices change the same data, so it's loaded again when Hop comes back into view and as
// soon as the server answers again after being unreachable.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, setTimezone, today as todayIn } from '../lib/dates.ts'
import { ServerUnreachableError, pingServer } from '../lib/api.ts'
import { useOnlineStatus } from '../lib/pwa.ts'
import { isServerReachable, offlineAnswerCount, useServerReachable } from '../lib/server.ts'
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
  terms: '/api/terms',
  courses: '/api/courses',
  keyDates: '/api/key-dates',
  pins: '/api/pins',
  uniLinks: '/api/uni-links',
  resources: '/api/resources',
  ideas: '/api/ideas',
  finds: '/api/finds',
  books: '/api/books',
}

/** Habit consistency looks back four weeks, and the monthly review may cover last month until the 7th. */
const completionDays = 42

/** Coming back to Hop within this long after the last load doesn't load everything again. */
const REFRESH_AFTER_MS = 30_000

/** How often to check whether an unreachable server is back, while Hop is on screen. */
const RECHECK_MS = 15_000

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
  const reachable = useServerReachable()
  const toast = useToast()
  const pending = useRef(0)
  // Counts saves, so a refresh that raced one can be dropped instead of showing older data.
  const saves = useRef(0)
  const refreshing = useRef(false)
  const loadedAt = useRef(0)
  const hasData = data !== undefined

  const refresh = useCallback(async () => {
    if (refreshing.current || pending.current) return
    refreshing.current = true
    const savesBefore = saves.current
    const offlineBefore = offlineAnswerCount()
    try {
      const loaded = await loadAll()
      // Keep what's on screen if a change was saved meanwhile, or if any answer came from the offline copy.
      if (saves.current === savesBefore && !pending.current && offlineAnswerCount() === offlineBefore) {
        setData(loaded)
        loadedAt.current = Date.now()
        // The screen now shows exactly what the server has, so an earlier failed save no longer needs a warning.
        setSync((current) => current === 'error' ? 'saved' : current)
      }
    } catch {
      // The banner already says the server can't be reached; the data on screen stays as it was.
    } finally {
      refreshing.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const offlineBefore = offlineAnswerCount()
    loadAll()
      .then((loaded) => {
        if (!active) return
        setData(loaded)
        setLoadError(false)
        loadedAt.current = Date.now()
        // Some answers came from the offline copy although the server is up (it was slow): load again.
        if (offlineAnswerCount() !== offlineBefore && isServerReachable()) void refresh()
      })
      .catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [attempt, refresh])

  // With nothing loaded to show, keep checking for the server instead of waiting for Try again.
  useEffect(() => {
    if (!loadError) return
    const timer = window.setInterval(() => {
      void pingServer().then((up) => { if (up) { setLoadError(false); setAttempt((count) => count + 1) } })
    }, RECHECK_MS)
    return () => window.clearInterval(timer)
  }, [loadError])

  useEffect(() => {
    if (!hasData) return
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return
      if (!isServerReachable()) void pingServer()
      else if (Date.now() - loadedAt.current > REFRESH_AFTER_MS) void refresh()
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    window.addEventListener('online', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('online', onReturn)
    }
  }, [hasData, refresh])

  const wasReachable = useRef(reachable)
  useEffect(() => {
    if (hasData && reachable && !wasReachable.current) void refresh()
    wasReachable.current = reachable
  }, [hasData, reachable, refresh])

  useEffect(() => {
    if (!hasData || reachable) return
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void pingServer() }, RECHECK_MS)
    return () => window.clearInterval(timer)
  }, [hasData, reachable])

  if (data) setTimezone(data.settings.timezone)
  useEffect(() => { if (data) applyTheme(data.settings.theme) }, [data])

  const update = useCallback((change: (current: HopData) => HopData) => setData((current) => current && change(current)), [])
  const setUi = useCallback((patch: Partial<UiState>) => setUiState((current) => ({ ...current, ...patch })), [])

  const commit = useCallback(async function commit<T>(label: string, run: () => Promise<T>, apply?: (result: T, data: HopData) => HopData, options: CommitOptions = {}): Promise<T | undefined> {
    if (!navigator.onLine) {
      toast("You're offline. This change wasn't saved. Hop will be editable again when you reconnect.", { type: 'error' })
      return undefined
    }
    // The server may have come back since it last failed to answer, so check before giving up.
    if (!isServerReachable() && !await pingServer()) {
      toast("Hop's server isn't reachable, so this change wasn't saved. Hop will be editable again when the server is back.", { type: 'error' })
      return undefined
    }
    pending.current++
    saves.current++
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
      // A request that never got an answer may still have reached the server; the next refresh shows which.
      const reason = cause instanceof ServerUnreachableError
        ? " Hop's server didn't answer, so the change may not have been saved. Hop shows what was saved once it reconnects."
        : cause instanceof Error && cause.message && !cause.message.startsWith('Request failed') ? ` ${cause.message}` : ''
      toast(`Couldn't save.${reason || ' Your previous data is still safe.'}`, {
        type: 'error',
        action: { label: 'Try again', run: () => void commit(label, run, apply, options) },
        timeout: 8000,
      })
      return undefined
    }
  }, [toast])

  const store = useMemo(() => data && { data, sync, online, reachable, ui, setUi, update, commit }, [data, sync, online, reachable, ui, setUi, update, commit])

  if (!store) return <>{loadError ? failed(() => { setLoadError(false); setAttempt((count) => count + 1) }) : loading}</>
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
