// Calendar → Timetable: the week as an hour grid. Every timed block (classes, events, repeating
// work, timed habits) sits at its time, coloured by kind; untimed items sit in a strip above. On a
// phone it shows one day at a time.
import * as D from '../lib/dates.ts'
import { dayBlocks, minutesOf, timetableLanes } from '../lib/day.ts'
import type { DayBlock } from '../lib/day.ts'
import type { AgendaItem } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import { useEditors } from '../editors/editors.tsx'
import { useHop } from '../store/store.ts'

/** Pixels per hour. A 15-minute block is still tall enough to see and click. */
const HOUR = 48
const MIN_HEIGHT = 18

const KINDS: [DayBlock['kind'], string][] = [['class', 'Class'], ['event', 'Event'], ['work', 'Work'], ['habit', 'Habit']]

export function Timetable({ days, untimed, selected, onSelect }: { days: string[]; untimed: Map<string, AgendaItem[]>; selected: string; onSelect: (date: string) => void }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const columns = days.map((ymd) => ({ ymd, blocks: dayBlocks(data, ymd, today) }))
  // At least 06:00 to midnight; earlier if something starts earlier.
  const earliest = Math.min(6, ...columns.flatMap((c) => c.blocks.map((b) => Math.floor(minutesOf(b.start) / 60))))
  const hours = Array.from({ length: 24 - earliest }, (_, i) => earliest + i)
  const top = (time: string) => ((minutesOf(time) - earliest * 60) / 60) * HOUR

  function open(block: DayBlock, ymd: string) {
    if (block.kind === 'class') navigate(`#/itu/courses/${block.course.id}`)
    else if (block.kind === 'event' && block.event.opportunityId) navigate(`#/career/${block.event.opportunityId}`)
    else if (block.kind === 'event') editors.editEvent(block.event, ymd)
    else if (block.kind === 'work') editors.task(block.task)
    else editors.habit(block.habit)
  }

  return (
    <div className="tt">
      <div aria-label="Colours" className="tt-legend xs">
        {KINDS.map(([kind, label]) => <span className="tt-key" key={kind}><i className={`tt-swatch kind-${kind}`} />{label}</span>)}
      </div>
      {/* On a phone the timetable shows one day; these pick which. */}
      <div aria-label="Day" className="chips tt-daychips" role="group">
        {days.map((ymd) => <button aria-pressed={ymd === selected} className="chip" key={ymd} onClick={() => onSelect(ymd)} type="button">{D.DAYS[D.weekday(ymd)]} {D.dayOfMonth(ymd)}</button>)}
      </div>
      <div className="tt-grid">
        <div className="tt-row tt-head">
          <span className="tt-gutter" />
          {days.map((ymd) => (
            <button className={`tt-cell tt-day${ymd === selected ? ' is-selected' : ''}${ymd === today ? ' is-today' : ''}`} key={ymd} onClick={() => onSelect(ymd)} type="button">
              <span className="xs muted">{D.DAYS[D.weekday(ymd)]}</span> <span className="num">{D.dayOfMonth(ymd)}</span>
            </button>
          ))}
        </div>
        <div className="tt-row tt-untimed">
          <span className="tt-gutter xs muted">All day</span>
          {days.map((ymd) => (
            <div className={`tt-cell${ymd === selected ? ' is-selected' : ''}`} key={ymd}>
              {(untimed.get(ymd) ?? []).map((item, index) => <span className="tt-chip xs" key={index} title={item.title}>{item.title}</span>)}
            </div>
          ))}
        </div>
        <div className="tt-row tt-body" style={{ height: hours.length * HOUR }}>
          <div aria-hidden="true" className="tt-gutter tt-hours">
            {hours.map((hour) => <span key={hour} style={{ top: (hour - earliest) * HOUR }}>{String(hour).padStart(2, '0')}:00</span>)}
          </div>
          {columns.map(({ ymd, blocks }) => (
            <div className={`tt-cell tt-col${ymd === selected ? ' is-selected' : ''}${ymd === today ? ' is-today' : ''}`} key={ymd} style={{ backgroundSize: `100% ${HOUR}px` }}>
              {timetableLanes(blocks).map(({ block, lane, lanes }) => {
                const height = Math.max(MIN_HEIGHT, top(block.end > block.start ? block.end : block.start) - top(block.start))
                const label = `${block.start}${block.end > block.start ? `–${block.end === '24:00' ? '00:00' : block.end}` : ''} ${block.title}`
                const done = (block.kind === 'work' && (block.state === 'done' || block.state === 'skipped'))
                return (
                  <button
                    className={`tt-block kind-${block.kind}${done ? ' is-done' : ''}${height < 32 ? ' is-short' : ''}`}
                    key={block.key}
                    onClick={() => open(block, ymd)}
                    style={{ top: top(block.start), height, left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%` }}
                    title={label}
                    type="button"
                  >
                    <span className="tt-time num">{block.start}</span> {block.title}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
