// Weekly times for a timed habit, a repeating task or a repeating event: one row per time, each
// with its weekday, start and end, and optional first and last dates for phases ("until 29 Nov").
import * as D from '../lib/dates.ts'
import type { TimeSlot } from '../lib/types.ts'
import { cleanSlots, nextTimeSlot } from '../lib/schedule.ts'
import { Icon } from './Icon.tsx'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

/** A time input can't show 24:00, so midnight at the end of a block is typed as 00:00. */
const endForInput = (end: string) => (end === '24:00' ? '00:00' : end)
const endFromInput = (end: string, start: string) => (end === '00:00' && start !== '00:00' ? '24:00' : end)

export function TimeSlotRows({ slots, onChange, idPrefix }: { slots: TimeSlot[]; onChange: (slots: TimeSlot[]) => void; idPrefix: string }) {
  const set = (index: number, change: Partial<TimeSlot>) => onChange(slots.map((slot, i) => (i === index ? { ...slot, ...change } : slot)))
  const toggleDates = (index: number) => {
    const slot = slots[index]!
    const dated = slot.from !== undefined || slot.until !== undefined
    onChange(slots.map((s, i) => (i !== index ? s : dated ? cleanSlots([{ ...s, from: null, until: null }])[0]! : { ...s, from: s.from ?? null, until: s.until ?? null })))
  }
  return (
    <div className="slot-list">
      {slots.map((slot, index) => {
        const id = `${idPrefix}-${index}`
        const dated = slot.from !== undefined || slot.until !== undefined
        return (
          <div className="time-slot" key={index}>
            <div className="slot-row">
              <div className="field"><label htmlFor={`${id}-day`}>Day</label><select className="select" id={`${id}-day`} onChange={(event) => set(index, { day: Number(event.target.value) })} value={String(slot.day)}>{WEEK.map((day) => <option key={day} value={day}>{D.DAYS[day]}</option>)}</select></div>
              <div className="field"><label htmlFor={`${id}-start`}>Starts</label><input className="input" id={`${id}-start`} onChange={(event) => set(index, { start: event.target.value })} type="time" value={slot.start} /></div>
              <div className="field"><label htmlFor={`${id}-end`}>Ends</label><input className="input" id={`${id}-end`} onChange={(event) => set(index, { end: endFromInput(event.target.value, slot.start) })} type="time" value={endForInput(slot.end)} /></div>
              <button aria-expanded={dated} aria-label={`Only between dates: ${D.DAYS[slot.day]} ${slot.start}`} className={`btn btn-sm${dated ? ' is-on' : ''}`} onClick={() => toggleDates(index)} type="button"><Icon className="icon-sm" name="calendar" />Dates</button>
              <button aria-label={`Remove ${D.DAYS[slot.day]} ${slot.start}`} className="icon-btn" onClick={() => onChange(slots.filter((_, i) => i !== index))} type="button"><Icon name="trash" /></button>
            </div>
            {dated && (
              <div className="slot-dates">
                <div className="field"><label htmlFor={`${id}-from`}>From <span className="optional">(optional)</span></label><input className="input" id={`${id}-from`} onChange={(event) => set(index, { from: event.target.value || null })} type="date" value={slot.from ?? ''} /></div>
                <div className="field"><label htmlFor={`${id}-until`}>Until <span className="optional">(optional)</span></label><input className="input" id={`${id}-until`} onChange={(event) => set(index, { until: event.target.value || null })} type="date" value={slot.until ?? ''} /></div>
              </div>
            )}
          </div>
        )
      })}
      {slots.length < 21 && <button className="btn btn-sm" onClick={() => onChange([...slots, nextTimeSlot(slots.at(-1))])} style={{ justifySelf: 'start' }} type="button"><Icon className="icon-sm" name="plus" />{slots.length ? 'Add another time' : 'Add a time'}</button>}
    </div>
  )
}
