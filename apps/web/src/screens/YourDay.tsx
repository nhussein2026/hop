// Today → Your day: the day as a timeline. Classes, events, repeating work and timed habits in time
// order; the block running now is highlighted, finished ones wait behind "Show earlier", and free
// gaps show, so the shape of the day is readable at a glance.
import { useEffect, useState } from 'react'
import * as D from '../lib/dates.ts'
import { dayBlocks, dayRows, isTrackHabit } from '../lib/day.ts'
import type { DayBlock, DayRow } from '../lib/day.ts'
import { dayProgress } from '../lib/practice.ts'
import { habitAmount, habitState, habitUnits, plural, targetOn } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { useActions } from '../store/actions.ts'
import { useHop } from '../store/store.ts'

// Work gets a briefcase, not a tick: a tick would read as already done.
const KIND_ICON: Record<DayBlock['kind'], [string, string]> = { class: ['school', 'Class'], event: ['calendar', 'Event'], work: ['career', 'Work'], habit: ['leaf', 'Habit'] }

/** The current time as HH:MM, updated every minute so "Now" moves on its own. */
function useNow() {
  const [now, setNow] = useState(() => D.timeOf(new Date().toISOString()))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(D.timeOf(new Date().toISOString())), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export function YourDay() {
  const { data } = useHop()
  const today = D.today()
  const now = useNow()
  const [showEarlier, setShowEarlier] = useState(false)
  const blocks = dayBlocks(data, today, today)
  if (!blocks.length) return null

  const rows = dayRows(blocks)
  const over = (row: DayRow) => row.end <= now && row.end !== row.start
  // The list starts at the first row that isn't over; earlier ones wait behind a button.
  const firstOpen = rows.findIndex((row) => !over(row))
  const earlier = firstOpen === -1 ? rows : rows.slice(0, firstOpen)
  const shown = firstOpen === -1 ? [] : rows.slice(firstOpen)
  const toGo = blocks.filter((block) => block.end > now || block.end === block.start && block.start >= now).length
  const earlierBlocks = earlier.filter((row) => row.kind === 'group').reduce((sum, row) => sum + (row.kind === 'group' ? row.blocks.length : 0), 0)

  return (
    <section aria-labelledby="yd-h" className="section your-day">
      <div className="section-head">
        <h2 id="yd-h">Your day</h2>
        <span className="small muted">{D.withDay(today)}. {plural(blocks.length, 'block')}, {toGo} to go.</span>
      </div>
      {earlierBlocks > 0 && (
        <button aria-expanded={showEarlier} className="link-btn small day-earlier" onClick={() => setShowEarlier(!showEarlier)} type="button">
          {showEarlier ? 'Hide earlier' : `Show earlier (${earlierBlocks})`}
        </button>
      )}
      <ol className="day-list">
        {(showEarlier ? rows : shown).map((row) => (row.kind === 'free'
          ? <li className={`day-free${over(row) ? ' is-past' : ''}`} key={`free-${row.start}`}><span className="num">{row.start}–{row.end}</span> Free · {D.minutes(row.minutes)}</li>
          : (
            <li className={`day-group${row.blocks.length > 1 ? ' is-overlap' : ''}`} key={row.blocks[0]!.key}>
              {row.blocks.map((block) => <Block block={block} key={block.key} now={now} />)}
            </li>
          )))}
      </ol>
      {!shown.length && !showEarlier && <p className="small muted">That was everything timed today.</p>}
    </section>
  )
}

function Block({ block, now }: { block: DayBlock; now: string }) {
  const point = block.start === block.end
  const phase = !point && block.start <= now && now < block.end ? 'now' : block.end <= now && !point ? 'past' : point && block.start < now ? 'past' : 'next'
  const [icon, label] = KIND_ICON[block.kind]
  return (
    <div className={`day-block kind-${block.kind} is-${phase}`}>
      <span className="day-time num">{block.start}{!point && <span className="faint">{block.end === '24:00' ? '00:00' : block.end}</span>}</span>
      <BlockControl block={block} />
      <div className="day-main">
        <BlockTitle block={block} />
        <div className="row-meta">
          {phase === 'now' && <span className="day-now">Now · until {block.end === '24:00' ? 'midnight' : block.end}</span>}
          <BlockMeta block={block} />
        </div>
      </div>
      <span aria-label={label} className={`type-tile day-kind kind-${block.kind}`} role="img"><Icon name={icon} /></span>
    </div>
  )
}

/** Work and habits are ticked right here; classes and events have nothing to tick. */
function BlockControl({ block }: { block: DayBlock }) {
  const { data } = useHop()
  const actions = useActions()
  const today = D.today()
  if (block.kind === 'work') {
    const done = block.state === 'done'
    return <button aria-checked={done} aria-label={`${done ? 'Mark as not done' : 'Done'}: ${block.title}`} className="check" onClick={() => void (done ? actions.work.untick(block.task, today) : actions.work.tick(block.task, today))} role="checkbox" type="button"><Icon name="check" /></button>
  }
  if (block.kind === 'habit' && !isTrackHabit(block.habit, data)) {
    const state = habitState(block.habit, data.completions, today)
    return <button aria-checked={state === 'done' ? true : state === 'none' ? false : 'mixed'} aria-label={`${state === 'none' ? 'Mark done' : 'Undo'}: ${block.title} today`} className="check" onClick={() => void actions.habits.toggle(block.habit)} role="checkbox" type="button"><Icon name="check" /></button>
  }
  return <span aria-hidden="true" className="check day-no-check" />
}

function BlockTitle({ block }: { block: DayBlock }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const open = block.kind === 'class' ? () => navigate(`#/itu/courses/${block.course.id}`)
    : block.kind === 'event' ? () => (block.event.opportunityId ? navigate(`#/career/${block.event.opportunityId}`) : editors.editEvent(block.event, today))
      : block.kind === 'work' ? () => editors.task(block.task)
        : isTrackHabit(block.habit, data) ? () => navigate('#/turkish') : () => editors.habit(block.habit)
  return <button className="row-open day-title" onClick={open} type="button">{block.title}</button>
}

function BlockMeta({ block }: { block: DayBlock }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const today = D.today()
  if (block.kind === 'class') return block.room ? <span>{block.room}</span> : null
  if (block.kind === 'event') return block.event.repeat ? <span>Every week</span> : null
  if (block.kind === 'work') {
    if (block.state === 'skipped') return <><span>Skipped</span><button className="link-btn" onClick={() => void actions.work.untick(block.task, today)} type="button">Undo</button></>
    return block.state === 'done' ? <span>Done</span> : <button className="link-btn" onClick={() => void actions.work.tick(block.task, today, true)} type="button">Skip today</button>
  }
  if (isTrackHabit(block.habit, data)) {
    const day = dayProgress(data.practiceActivities, data.practiceSessions, today)
    const left = Math.max(0, day.planned - day.done)
    return <a href="#/turkish">Türkçe · {left ? `${D.minutes(left)} left today` : 'today’s plan is done'}</a>
  }
  const state = habitState(block.habit, data.completions, today)
  const amount = habitAmount(block.habit, data.completions, today)
  const target = targetOn(block.habit, today)
  const text = state === 'none' ? habitUnits(block.habit, target) : state === 'done' ? `Done · ${habitUnits(block.habit, amount)}` : `${habitUnits(block.habit, amount)} of ${habitUnits(block.habit, target)}${state === 'minimum' ? ' · minimum kept' : ''}`
  return <button className="habit-amount" onClick={() => editors.logHabit(block.habit)} type="button">{text}</button>
}
