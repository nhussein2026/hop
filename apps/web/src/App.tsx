// App shell: sidebar (≥1100px) → icon rail (700–1099px) → top bar and bottom tabs (<700px).
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import * as D from './lib/dates.ts'
import { isOverdue, oppHealth, orgOf } from './lib/rules.ts'
import { unsubmitted, upcoming } from './lib/uni.ts'
import { navigate, useRoute } from './lib/router.ts'
import type { Route } from './lib/router.ts'
import { useEditors } from './editors/editors.tsx'
import { Icon, Pad } from './components/Icon.tsx'
import { Banner } from './components/ui.tsx'
import { Calendar } from './screens/Calendar.tsx'
import { Career } from './screens/Career.tsx'
import { Goals } from './screens/Goals.tsx'
import { Growth } from './screens/Growth.tsx'
import { Itu } from './screens/Itu.tsx'
import { Onboarding } from './screens/Onboarding.tsx'
import { Plan } from './screens/Plan.tsx'
import { Review } from './screens/Review.tsx'
import { Settings } from './screens/Settings.tsx'
import { Today } from './screens/Today.tsx'
import { useHop } from './store/store.ts'
import type { Sync } from './store/store.ts'
import { unreadCount } from './lib/notifications.ts'
import { settingsTitle, useIsPhone } from './lib/layout.ts'

const NAV: [string, string][] = [['today', 'Today'], ['plan', 'Plan'], ['calendar', 'Calendar'], ['itu', 'İTÜ'], ['goals', 'Goals'], ['career', 'Career'], ['growth', 'Growth'], ['review', 'Review']]
const SCREENS = new Set([...NAV.map(([key]) => key), 'settings'])
const SYNC_TEXT: Record<Sync | 'offline', string> = { saved: 'All changes saved', saving: 'Saving…', offline: 'Offline: read only', error: 'Last change not saved' }

type Crumb = { label: string; href: string }

/** The page title and breadcrumbs for a route. */
function useHeading(route: Route, phone: boolean): { title: string; crumbs: Crumb[] } {
  const { data } = useHop()
  const [first] = route.params
  if (route.screen === 'goals' && first) return { title: data.goals.find((g) => g.id === first)?.name ?? 'Not found', crumbs: [{ label: 'Goals', href: '#/goals' }] }
  if (route.screen === 'career' && first) {
    const named: Record<string, string> = { people: 'People', resumes: 'Resumes', analytics: 'Analytics' }
    const o = data.opportunities.find((x) => x.id === first)
    return { title: named[first] ?? (o ? `${orgOf(o)}: ${o.title}` : 'Not found'), crumbs: [{ label: 'Career', href: '#/career' }] }
  }
  if (route.screen === 'itu' && first === 'courses' && route.params[1]) {
    const c = data.courses.find((x) => x.id === route.params[1])
    return { title: c ? `${c.code} ${c.name}` : 'Not found', crumbs: [{ label: 'İTÜ', href: '#/itu/courses' }] }
  }
  if (route.screen === 'settings') {
    return phone && !first ? { title: 'Settings', crumbs: [] } : { title: settingsTitle(first, phone), crumbs: [{ label: 'Settings', href: '#/settings' }] }
  }
  return { title: NAV.find(([key]) => key === route.screen)?.[1] ?? 'Today', crumbs: [] }
}

export default function App({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { data, sync, online } = useHop()
  const editors = useEditors()
  const route = useRoute()
  const phone = useIsPhone()
  const screen = SCREENS.has(route.screen) ? route.screen : 'today'
  const { title, crumbs } = useHeading({ ...route, screen }, phone)
  // Moving between days or months is one calendar page, so it keeps its scroll position and focus.
  const routeKey = screen === 'calendar' ? screen : `${screen}/${route.params.join('/')}`
  const lastRoute = useRef<string>(undefined)
  const today = D.today()
  const counts: Record<string, number> = {
    plan: data.tasks.filter((t) => isOverdue(t, today)).length,
    career: data.opportunities.filter((o) => oppHealth(o, today, data.settings.followUpDays).key === 'attention').length,
    itu: upcoming(data.courses, today, 2).length + unsubmitted(data.courses, today).length,
    // An inbox count, not an alert.
    growth: data.finds.filter((f) => f.status === 'inbox').length,
  }
  const unread = unreadCount(data)
  const status = online ? sync : 'offline'
  const syncText = SYNC_TEXT[status]

  useEffect(() => { document.title = `${title} · Hop` }, [title])

  // Start each screen at the top and move focus to its heading, so screen readers announce it.
  useEffect(() => {
    const changed = lastRoute.current !== undefined && lastRoute.current !== routeKey
    lastRoute.current = routeKey
    if (!changed) return
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [routeKey])

  useShortcuts(editors, data.settings.onboarded)

  if (!data.settings.onboarded) return <Onboarding />

  let body: ReactNode
  if (screen === 'plan') body = <Plan route={route} />
  else if (screen === 'calendar') body = <Calendar route={route} />
  else if (screen === 'goals') body = <Goals id={route.params[0]} />
  else if (screen === 'career') body = <Career route={route} />
  else if (screen === 'growth') body = <Growth route={route} />
  else if (screen === 'itu') body = <Itu route={route} />
  else if (screen === 'review') body = <Review route={route} />
  else if (screen === 'settings') body = <Settings onSignOut={onSignOut} section={route.params[0]} />
  else body = <Today />

  const phoneMore = ['calendar', 'goals', 'career', 'growth', 'review', 'settings'].includes(screen)
  const tab = (key: string, label: string) => (
    <a aria-current={screen === key ? 'page' : undefined} className="tab-link" href={`#/${key}`}><Icon name={key} /><span>{label}</span>{counts[key] ? <span className="count count-attention">{counts[key]}</span> : null}</a>
  )

  return (
    <>
      <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <div className="app">
        <aside aria-label="Primary" className="sidebar">
          <a aria-label="Hop, go to Today" className="brand" href="#/today"><Pad size={30} /><span className="brand-name">Hop</span></a>
          <div className="sidebar-add"><button aria-label="Add" className="btn btn-primary btn-block" data-tip="Add (N)" onClick={() => editors.add()} type="button"><Icon name="plus" /><span className="btn-label">Add</span></button></div>
          <nav aria-label="Main" className="nav">
            {NAV.map(([key, label]) => (
              <a aria-current={screen === key ? 'page' : undefined} className="nav-item" data-tip={label} href={`#/${key}`} key={key}>
                <Icon name={key} /><span className="nav-label">{label}</span>
                {counts[key] ? <span aria-label={key === 'growth' ? `${counts[key]} finds to triage` : `${counts[key]} need attention`} className={`count${key === 'growth' ? '' : ' count-attention'}`}>{counts[key]}</span> : null}
              </a>
            ))}
          </nav>
          <div className="sidebar-foot">
            <a aria-current={screen === 'settings' ? 'page' : undefined} className="nav-item" data-tip="Settings" href="#/settings"><Icon name="settings" /><span className="nav-label">Settings</span></a>
            <div aria-live="polite" className={`sync${status === 'offline' ? ' is-offline' : status === 'saving' ? ' is-saving' : ''}`} role="status" title={syncText}>
              <span aria-hidden="true" className="sync-dot" /><span className="sync-label">{syncText}</span><span className="visually-hidden">{syncText}</span>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-title">
              {crumbs.length
                ? <a aria-label={`Back to ${crumbs.at(-1)!.label}`} className="mobile-only icon-btn" href={crumbs.at(-1)!.href}><Icon name="back" /></a>
                : <span className="mobile-only" style={{ color: 'var(--primary)' }}><Pad size={26} /></span>}
              {crumbs.map((crumb) => <span key={crumb.href} style={{ display: 'contents' }}><a className="hide-phone" href={crumb.href}>{crumb.label}</a><span aria-hidden="true" className="crumb-sep hide-phone">/</span></span>)}
              <span className="current">{title}</span>
            </div>
            <button className="search-trigger" onClick={() => editors.search()} type="button"><Icon className="icon-sm" name="search" /><span>Search</span><kbd>/</kbd></button>
            <div className="topbar-actions">
              <button aria-label="Search" className="icon-btn mobile-only" onClick={() => editors.search()} type="button"><Icon name="search" /></button>
              {status === 'offline' && <span aria-label={syncText} className="sync-mini mobile-only" role="status"><Icon name="wifiOff" /></span>}
              <button aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="icon-btn" data-tip="Notifications" onClick={() => editors.notifications()} type="button"><Icon name="bell" />{unread > 0 && <span className="dot-count">{unread}</span>}</button>
            </div>
          </header>

          <div className="global-banners">
            {!online && <Banner icon="wifiOff" title="You’re offline." tone="warning">Everything you’ve loaded stays readable. Changes are paused until Hop can reach your server.</Banner>}
            {online && sync === 'error' && <Banner icon="alertCircle" title="Your last change wasn’t saved." tone="danger">Your data is unchanged on the server. Use Try again in the message below, or redo the change.</Banner>}
          </div>
          <main id="main" key={routeKey} tabIndex={-1}>{body}</main>
        </div>
      </div>

      <nav aria-label="Main" className="tabbar">
        {tab('today', 'Today')}
        {tab('plan', 'Plan')}
        <button aria-label="Add" className="tab-add" onClick={() => editors.add()} type="button"><Icon name="plus" /></button>
        {tab('itu', 'İTÜ')}
        <button aria-current={phoneMore ? 'page' : undefined} aria-label={`More${counts.career ? `, ${counts.career} career items need attention` : ''}`} className="tab-link" onClick={() => editors.more(counts)} type="button"><Icon name="menu" /><span>More</span>{counts.career ? <span className="count count-attention">{counts.career}</span> : null}</button>
      </nav>
    </>
  )
}

/** N add · / or Ctrl/⌘ K search · G then T/P/L/U/G/C/R/W/S to jump (L for calendar, U for İTÜ). */
function useShortcuts(editors: ReturnType<typeof useEditors>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let pending = false
    let timer = 0
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = target.matches?.('input, textarea, select, [contenteditable]')
      const dialogOpen = Boolean(document.querySelector('dialog[open]'))
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (!dialogOpen) editors.search()
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey || dialogOpen) return
      if (pending) {
        pending = false
        const map: Record<string, string> = { t: 'today', p: 'plan', l: 'calendar', u: 'itu', g: 'goals', c: 'career', r: 'review', w: 'growth', s: 'settings' }
        if (map[event.key]) navigate(`#/${map[event.key]}`)
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        editors.search()
      } else if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        editors.add()
      } else if (event.key === 'g') {
        pending = true
        window.clearTimeout(timer)
        timer = window.setTimeout(() => { pending = false }, 1200)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editors, enabled])
}
