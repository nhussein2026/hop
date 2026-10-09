// Radar: things you find in your field (repos, models, papers, tools, chances, department events)
// and a triage step that turns each one into something: a task, a reading item, an idea, an
// opportunity, a library entry, or nothing. Lives in Growth → Radar.
import { useState } from 'react'
import type { ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { plural } from '../lib/rules.ts'
import { findAgeDays, staleFinds } from '../lib/uni.ts'
import type { Find, FindStatus } from '../lib/types.ts'
import { FIND_KINDS, FIND_STATUS_LABEL } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Banner, Empty, Menu } from '../components/ui.tsx'
import type { MenuItem } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { useUniActions } from '../store/uni-actions.ts'

const STATUSES: FindStatus[] = ['inbox', 'try', 'read', 'kept', 'converted', 'dismissed']
const READING = (f: Find) => f.kind === 'paper' || f.kind === 'article'

export function Radar({ status: initialStatus }: { status?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const [status, setStatus] = useState<FindStatus>(STATUSES.includes(initialStatus as FindStatus) ? initialStatus as FindStatus : 'inbox')
  const [topic, setTopic] = useState('')
  const today = D.today()

  if (!data.finds.length) return <Empty action={() => editors.find()} actionLabel="Save a find" body="Save repos, models, papers, tools and chances you come across. Add one line on why it matters; decide what to do with it later." title="Your radar is empty" />

  const topics = [...new Set(data.finds.flatMap((f) => f.topics))].sort()
  const list = data.finds.filter((f) => f.status === status && (!topic || f.topics.includes(topic))).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const stale = staleFinds(data.finds, today)
  const count = (s: FindStatus) => data.finds.filter((f) => f.status === s).length

  return (
    <>
      <p className="small muted">Save it in seconds, decide later. Everything in the inbox gets one decision: try it, read it, keep it, turn it into an idea or opportunity, or let it go.</p>
      <div className="toolbar">
        <div aria-label="Status" className="chips" role="group">
          {STATUSES.map((s) => <button aria-pressed={status === s} className="chip" key={s} onClick={() => setStatus(s)} type="button">{FIND_STATUS_LABEL[s]} <span className={`count${s === 'inbox' && count(s) ? ' count-attention' : ''}`}>{count(s)}</span></button>)}
        </div>
      </div>
      {topics.length > 0 && (
        <div aria-label="Topic" className="chips topic-chips" role="group">
          <button aria-pressed={!topic} className="chip chip-sm" onClick={() => setTopic('')} type="button">All topics</button>
          {topics.map((t) => <button aria-pressed={topic === t} className="chip chip-sm" key={t} onClick={() => setTopic(t)} type="button">{t}</button>)}
        </div>
      )}
      {status === 'inbox' && stale.length > 0 && (
        <Banner action={<button className="btn btn-sm" onClick={() => void actions.radar.archive(stale)} type="button">Archive {stale.length}</button>} icon="inbox" title={`${plural(stale.length, 'find')} waiting more than 30 days.`} tone="warning">
          If they still matter, decide now. Otherwise archive them so the inbox stays useful.
        </Banner>
      )}
      {list.length
        ? <div className="find-list">{list.map((f) => <FindCard find={f} key={f.id} />)}</div>
        : <p className="small muted">{status === 'inbox' ? 'Inbox zero. New finds land here.' : `Nothing here${topic ? ' for this topic' : ''}.`}</p>}
    </>
  )
}

function FindCard({ find: f }: { find: Find }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const today = D.today()
  const [icon, label] = FIND_KINDS[f.kind]
  const age = findAgeDays(f, today)
  const stale = f.status === 'inbox' && age > 30
  const task = f.taskId ? data.tasks.find((t) => t.id === f.taskId) : undefined
  const idea = () => editors.idea({ kind: 'project', why: f.why, findIds: [f.id], resourceIds: f.resourceId ? [f.resourceId] : [] })

  let outcome: ReactNode = null
  if (f.status === 'kept' && f.resourceId) outcome = <a className="small" href={`#/itu/library?item=${f.resourceId}`}><Icon className="icon-sm" name="library" /> In your library</a>
  else if (f.ideaId) outcome = <a className="small" href={`#/itu/research?idea=${f.ideaId}`}><Icon className="icon-sm" name="bulb" /> Became an idea</a>
  else if (f.opportunityId) outcome = <a className="small" href={`#/career/${f.opportunityId}`}><Icon className="icon-sm" name="career" /> Tracked in Career</a>
  else if (f.eventId) outcome = <a className="small" href="#/calendar"><Icon className="icon-sm" name="calendar" /> On your calendar</a>
  else if (task) outcome = <span className="small"><Icon className="icon-sm" name={task.status === 'completed' ? 'check' : 'calendar'} /> Task: {task.title}{task.status === 'completed' ? ' (done)' : task.scheduledDate ? `, ${D.relative(task.scheduledDate, today).toLowerCase()}` : ''}</span>

  let buttons: ReactNode = null
  if (f.status === 'inbox') {
    const primary = f.kind === 'opportunity'
      ? <button className="btn btn-sm btn-primary" onClick={() => void actions.radar.trackAsOpportunity(f)} type="button"><Icon className="icon-sm" name="career" />Track as opportunity</button>
      : f.kind === 'event'
        ? <button className="btn btn-sm btn-primary" onClick={() => void actions.radar.addToCalendar(f)} type="button"><Icon className="icon-sm" name="calendar" />Add to calendar</button>
        : READING(f)
          ? <button className="btn btn-sm btn-primary" onClick={() => void actions.radar.update(f, { status: 'read' }, 'Added to “To read”')} type="button"><Icon className="icon-sm" name="book" />Read later</button>
          : <button className="btn btn-sm btn-primary" onClick={() => void actions.radar.tryIt(f)} type="button"><Icon className="icon-sm" name="play" />Try it</button>
    const more: MenuItem[] = [
      ...(!READING(f) ? [{ label: 'Read later', icon: 'book', onSelect: () => void actions.radar.update(f, { status: 'read' }, 'Added to “To read”') }] : []),
      ...(['opportunity', 'event', 'paper', 'article'].includes(f.kind) ? [{ label: 'Try it (as a task)', icon: 'play', onSelect: () => void actions.radar.tryIt(f) }] : []),
      ...(f.kind !== 'opportunity' ? [{ label: 'Track as opportunity', icon: 'career', onSelect: () => void actions.radar.trackAsOpportunity(f) }] : []),
      ...(f.kind !== 'event' ? [{ label: 'Add to calendar', icon: 'calendar', onSelect: () => void actions.radar.addToCalendar(f) }] : []),
      '-',
      { label: 'Dismiss', icon: 'x', onSelect: () => void actions.radar.update(f, { status: 'dismissed' }, 'Dismissed. It’s in Dismissed if you change your mind.') },
    ]
    buttons = (
      <>
        {primary}
        <button className="btn btn-sm" onClick={() => void actions.radar.keep(f)} type="button"><Icon className="icon-sm" name="library" />Keep in library</button>
        <button className="btn btn-sm" onClick={idea} type="button"><Icon className="icon-sm" name="bulb" />Idea</button>
        <Menu items={more} label={`More for ${f.title}`} />
      </>
    )
  } else if (f.status === 'try' || f.status === 'read') {
    buttons = (
      <>
        <button className="btn btn-sm btn-primary" onClick={() => void actions.radar.keep(f)} type="button"><Icon className="icon-sm" name="check" />{f.status === 'try' ? 'Tried it: keep' : 'Read it: keep'}</button>
        <button className="btn btn-sm" onClick={idea} type="button"><Icon className="icon-sm" name="bulb" />It sparked an idea</button>
        <button className="btn btn-sm btn-ghost" onClick={() => void actions.radar.update(f, { status: 'dismissed' }, 'Dismissed. It’s in Dismissed if you change your mind.')} type="button">Not useful</button>
      </>
    )
  } else if (f.status === 'dismissed') {
    buttons = (
      <>
        <button className="btn btn-sm" onClick={() => void actions.radar.update(f, { status: 'inbox' }, 'Back in the inbox')} type="button"><Icon className="icon-sm" name="refresh" />Back to inbox</button>
        <button className="btn btn-sm btn-ghost" onClick={() => void actions.radar.remove(f)} type="button">Delete for good</button>
      </>
    )
  }

  return (
    <article className={`find${stale ? ' is-stale' : ''}`}>
      <span aria-hidden="true" className={`type-tile type-find-${f.kind}`}><Icon name={icon} /></span>
      <div className="find-body">
        <div className="find-top">{f.url ? <a className="find-title" href={f.url} rel="noopener noreferrer" target="_blank">{f.title}<span className="visually-hidden"> (opens in a new tab)</span></a> : <span className="find-title">{f.title}</span>}</div>
        <p className="find-why">{f.why}</p>
        <div className="row-meta">
          <span>{label}</span><span>{f.source}</span>
          {f.eventDate && <span><Icon name="calendar" />{D.withDay(f.eventDate)}</span>}
          <span style={stale ? { color: 'var(--warning)', fontWeight: 700 } : undefined}>Saved {age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`}</span>
          {f.topics.map((t) => <span className="tag tag-sm" key={t}>{t}</span>)}
        </div>
        {outcome && <div className="find-outcome">{outcome}</div>}
        {buttons && <div className="find-actions">{buttons}</div>}
      </div>
    </article>
  )
}
