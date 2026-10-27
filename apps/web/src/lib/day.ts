// Your day: everything timed on one date as a timeline (classes, events, repeating work, timed
// habits), grouped where they overlap, with the free gaps between them.
import { slotsOn } from './schedule.ts'
import { classesOn } from './uni.ts'
import { eventOccurrences, workBetween } from './rules.ts'
import type { WorkState } from './rules.ts'
import type { Course, Event, Habit, HopData, Task } from './types.ts'

type Times = { key: string; start: string; end: string; title: string }
export type DayBlock =
  | (Times & { kind: 'class'; course: Course; room: string })
  | (Times & { kind: 'event'; event: Event })
  | (Times & { kind: 'work'; task: Task; state: WorkState })
  | (Times & { kind: 'habit'; habit: Habit })

/** Minutes since midnight; "24:00" is the end of the day. */
export const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** A habit linked to the language track: its time is planned on the Türkçe page, not ticked twice. */
export const isTrackHabit = (h: Pick<Habit, 'goalId'>, s: Pick<HopData, 'settings'>) => Boolean(h.goalId && h.goalId === s.settings.languageTrack?.goalId)

/** Everything with a time on a date, by start then end. An event without an end is a point in time. */
export function dayBlocks(s: HopData, ymd: string, today: string): DayBlock[] {
  const blocks: DayBlock[] = []
  for (const { course, slot } of classesOn(s, ymd)) {
    blocks.push({ kind: 'class', key: `class-${course.id}-${slot.start}`, start: slot.start, end: slot.end, title: `${course.code} ${course.name}`, course, room: slot.room })
  }
  for (const e of s.events) {
    for (const o of eventOccurrences(e, ymd, ymd)) {
      if (o.start) blocks.push({ kind: 'event', key: `event-${e.id}-${o.start}`, start: o.start, end: o.end ?? o.start, title: e.title, event: e })
    }
  }
  for (const o of workBetween(s, ymd, ymd, today)) {
    blocks.push({ kind: 'work', key: `work-${o.task.id}-${o.start}`, start: o.start, end: o.end, title: o.task.title, task: o.task, state: o.state })
  }
  for (const h of s.habits) {
    if (!h.active) continue
    for (const slot of slotsOn(h.slots, ymd)) blocks.push({ kind: 'habit', key: `habit-${h.id}-${slot.start}`, start: slot.start, end: slot.end, title: h.name, habit: h })
  }
  return blocks.sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
}

export type DayRow =
  | { kind: 'group'; blocks: DayBlock[]; start: string; end: string }
  | { kind: 'free'; start: string; end: string; minutes: number }

/** A gap at least this long between blocks shows as free time, so the day's shape is readable. */
export const FREE_MINUTES = 30

/**
 * Blocks that overlap share one row ("19:30 Kaleem meeting" inside "19:00–20:45 Türkçe"), and a
 * gap of FREE_MINUTES or more between rows shows as free time.
 */
export function dayRows(blocks: DayBlock[]): DayRow[] {
  const groups: { blocks: DayBlock[]; start: string; end: string }[] = []
  for (const block of blocks) {
    const last = groups.at(-1)
    if (last && block.start < last.end) {
      last.blocks.push(block)
      if (block.end > last.end) last.end = block.end
    } else {
      groups.push({ blocks: [block], start: block.start, end: block.end })
    }
  }
  const rows: DayRow[] = []
  groups.forEach((group, index) => {
    const previous = groups[index - 1]
    const gap = previous ? minutesOf(group.start) - minutesOf(previous.end) : 0
    if (previous && gap >= FREE_MINUTES) rows.push({ kind: 'free', start: previous.end, end: group.start, minutes: gap })
    rows.push({ kind: 'group', ...group })
  })
  return rows
}

const timeOfMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** On a timetable an event with no end still takes this long, so it can be seen and clicked. */
export const POINT_MINUTES = 15

/**
 * Lanes for one day column of a timetable: blocks that overlap sit side by side, each as wide as
 * its cluster of overlapping blocks allows.
 */
export function timetableLanes(blocks: DayBlock[]) {
  const out: { block: DayBlock; lane: number; lanes: number }[] = []
  let cluster: typeof out = []
  let laneEnds: string[] = []
  let clusterEnd = ''
  const flush = () => {
    for (const item of cluster) item.lanes = laneEnds.length
    cluster = []
    laneEnds = []
    clusterEnd = ''
  }
  for (const block of [...blocks].sort((a, b) => a.start.localeCompare(b.start))) {
    const end = block.end > block.start ? block.end : timeOfMinutes(Math.min(24 * 60, minutesOf(block.start) + POINT_MINUTES))
    if (cluster.length && block.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= block.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    const item = { block, lane, lanes: 1 }
    cluster.push(item)
    out.push(item)
    if (end > clusterEnd) clusterEnd = end
  }
  flush()
  return out
}
