# Proposal: Week Plan (Timed Habits, Repeating Work, Your Day, Timetable)

Written 2026-10-26 in a planning chat. This is the hand-off to an implementation chat: context, the decisions already made, the design, acceptance criteria, what is deliberately not built, and the data to enter after the release. Read it whole before changing code. **Version: v1.4.0**, before 30 Nov (agreed 2026-10-26). It builds on [Hop proposal A](2026-10-hop-improvements.md#a-habit-amounts-and-minimums) (habit amounts and minimums) and [Hop proposal C](2026-10-hop-improvements.md#c-classes-on-the-calendar) (classes on the Calendar), and it **absorbs [Hop proposal F](2026-10-hop-improvements.md#f-repeating-events)** (repeating events).

| # | Part | Size |
| --- | --- | --- |
| W1 | [Weekly time slots](#w1-weekly-time-slots-the-shared-piece): one shape and one helper for "every Monday 13:30–16:00 from date X to date Y" | Small |
| W2 | [Timed habits](#w2-timed-habits) | Small to medium |
| W3 | [Repeating work tasks](#w3-repeating-work-tasks) with a tick per day | Medium |
| W4 | [Repeating events](#w4-repeating-events) (proposal F, moved here) | Small |
| W5 | [Today → Your day](#w5-today--your-day): the day as a timeline | Medium |
| W6 | [Calendar → Timetable](#w6-calendar--timetable): the week as an hour grid | Medium |

## Context

On 2026-10-24 the user approved a full week: every hour from Fajr (06:30) to the ride home (22:30–00:00), with two phases (until 29 Nov no Turkish class; from 30 Nov TÖMER Mon–Thu 09:15–12:45). It lives only as text in the pinned note **"My week"**, because Hop can't hold a timed week:

- Habits have days and minutes, but no time of day, and one length for every day (Mawaheb is 50 min on weekdays and 3 h on Saturday).
- Tasks have a date but no time, and don't repeat. Work that happens every weekday at a fixed time (Veribir, Garanti) can only be entered as one task per day.
- Events have a time but don't repeat (proposal F).
- Today lists habits newest first, with no times; Calendar's week view is a list per day, not a timetable.

On 2026-10-26 the user said the schedule in Hop "is not full with all of the week works" and decided:

| Question | Decision |
| --- | --- |
| How should paid and volunteer work appear? | **Not as habits.** "They are works with specific time each week": Veribir, Garanti ERP and the weekly Kaleem task are **tasks with their times**, ticked done each day. |
| Meetings? | **Events** at their real time (Kaleem: Wed and Sun evenings). |
| Meals, nap, rides, free time? | **Habits**, so the whole day is visible, free time included. |
| The "Kaleem task" and "BrewHaus session" habits? | Replaced by the timed entries above. |
| Build where and when? | In a separate implementation chat. The planning chat enters the week **after** the release, not 60 dated copies before it. |

Hop's own model is kept: a **task** is work you tick done, an **event** is an appointment, a **habit** is a repeated behaviour, a **class** belongs to a course. They stay separate entities; they only share the way their times are described (W1).

---

## W1. Weekly Time Slots (the Shared Piece)

### Shape

```ts
/** "Every <day> from <start> to <end>", optionally only between two dates. */
export interface TimeSlot {
  day: number;          // 0 Sunday … 6 Saturday
  start: string;        // "HH:MM"
  end: string;          // "HH:MM", after start; "24:00" allowed for the ride home
  from?: ISODate | null;  // first date this slot applies (inclusive)
  until?: ISODate | null; // last date this slot applies (inclusive)
}
```

- Put it in `packages/domain/src/common.ts` (or a new `schedule.ts`). Course `ClassSlot` (`day`, `start`, `end`, `room`) keeps its shape; if convenient, define `ClassSlot extends TimeSlot { room }` so C and W share the helper.
- **`from` / `until` on each slot is what handles phases.** One habit can have "Mon 19:00–20:45 until 29 Nov" and "Mon 21:30–22:20 from 30 Nov" without being split in two, so its history and consistency stay in one place.
- Several slots on the same day are allowed (Mawaheb Mon 19:00–20:45 and 21:30–22:20).
- Validation (`packages/validation`): `HH:MM`, end after start, `from` ≤ `until`, at most 21 slots per item.

### Helper

A pure function in `apps/web/src/lib/schedule.ts`, tested in `schedule.test.ts`:

```ts
occurrences(slots: TimeSlot[], from: ISODate, to: ISODate, skips: ISODate[] = []): { date: ISODate; start: string; end: string }[]
```

Sorted by date then start. Uses `lib/dates.ts` only (weekday of a date in the user's timezone). Shared by W2–W6 and by classes (C).

---

## W2. Timed Habits

### Data model

- `habits.slots`: `TimeSlot[]`, JSON, default `[]`. Empty = an untimed habit, exactly as today.
- When `slots` is not empty, `days` is derived from it on save (the set of slot days, ignoring slots whose `until` has passed) so every existing rule that reads `days` keeps working.
- **A day's length:** for a habit with slots, that day's minutes are the sum of its slots that day. With proposal A's `target` in minutes, a timed habit's target on a day defaults to that day's length unless the user set an explicit target. This removes the backlog row "Different minutes per day on one habit".
- `habitDue` must respect `from` / `until`: a habit is due on a date only if some slot applies to that date.

### Screens

- **Habit form:** a "Times" section under Days: add a row per slot (day chips, start, end, optional "from / until"). A shortcut "Same time on all chosen days" fills one row per ticked day. Keep the form short for untimed habits: the section is collapsed until "Add a time" is pressed.
- **Habit rows** (Today, Plan → Habits) show the time when there is one: "13:30–16:00 · Mawaheb".

### Acceptance

- A habit with Mon 19:00–20:45 (until 29 Nov) and Mon 21:30–22:20 (from 30 Nov) is due on Monday 23 Nov from 19:00 and on Monday 30 Nov from 21:30, and its 4-week consistency runs across both.
- An untimed habit behaves exactly as before.
- Mawaheb on Saturday 14:00–17:00 has a 3 h target that day and 50 min on Monday after 30 Nov.

---

## W3. Repeating Work Tasks

### Problem

Veribir, Garanti and the Kaleem task happen at fixed times every week and must be **ticked per day**, not once. A single task can't do that, and a task per day means hundreds of rows.

### Data model

- `tasks.repeat`: `TimeSlot[] | null`. Null = an ordinary task, unchanged.
- A repeating task is a **series**. Its `status` stays `todo` while the series runs; `scheduledDate` / `dueDate` are not used (validation rejects them together with `repeat`).
- New table `task_completions (task_id, date, completed_at, skipped)`: one row per occurrence that was ticked done or skipped.
- `estimatedMinutes` for an occurrence = its slot length (the stored value is ignored for repeating tasks).
- The series ends when every slot's `until` has passed; it can also be marked completed or cancelled as a whole, which stops future occurrences and keeps the history.

### Rules

- **No pile-up.** An unticked past occurrence is history ("Missed: Mon 26 Oct"). It never shows as overdue, and it never appears on another day's Today. Repeating work that wasn't done yesterday is not today's job; the user's "never zero twice" rule is about the next scheduled time.
- **Skip** one occurrence: stored as `skipped = true` ("Veribir had no tasks today"); it counts neither as done nor as missed.
- Goal and project links apply to every occurrence.
- **Next up ignores timed occurrences.** Timed work belongs to the timeline (W5), where the "Now" row plays that role; otherwise Veribir becomes "Next up" at 07:00 on the train.
- Plan → Tasks: a **Repeating** filter chip lists the series with their times ("Mon–Thu 13:30–16:00, Fri 14:30–17:00"). Repeating tasks don't appear under "No date".
- Calendar and agenda: one item per occurrence (via `occurrences`), with time, ticked or not.
- Reviews (weekly and monthly facts): count occurrences done, skipped and missed per series ("Veribir: 4 of 5 done, 1 skipped").

### API

- `POST /api/tasks` and `PATCH /api/tasks/:id` accept `repeat`.
- `POST /api/tasks/:id/occurrences` `{ date, skipped? }` ticks or skips one; `DELETE /api/tasks/:id/occurrences/:date` undoes it.
- `GET` returns the completions for the last 4 weeks with the tasks, like habit completions.

### Acceptance

- "Veribir" with Mon/Tue/Thu 13:30–16:00, Wed 13:30–15:50 and Fri 14:30–17:00 shows one occurrence on each weekday at those times, none at weekends.
- Ticking Monday's occurrence doesn't tick Tuesday's. An unticked Monday doesn't appear on Tuesday's Today.
- Skipping Wednesday shows "Skipped" there and counts as neither done nor missed.
- "Garanti ERP" with slots until 31 Dec stops showing on 1 Jan.
- An ordinary task (no `repeat`) behaves exactly as before.

---

## W4. Repeating Events

[Proposal F](2026-10-hop-improvements.md#f-repeating-events), moved here and built on W1 so one event can have **different times on different days** (Kaleem: Wed 19:30, Sun 21:15).

- `events.repeat`: `TimeSlot[] | null`, plus `skips: ISODate[]` for "skip this one". `date` / `startTime` / `endTime` stay for one-off events.
- Occurrences are worked out on the fly; no row per occurrence. Editing applies to the whole series; "Skip this one" is the only per-occurrence action (no "this one or all" dialog).
- Deleting the event removes every occurrence.
- New event dialog: a "Repeats every week" switch that turns the date and time fields into slot rows. Keep C's line "A class that repeats every week? Add it as a course".

### Acceptance

F's criteria, plus: one event with Wed 19:30–20:30 and Sun 21:15–22:15 shows on both days at its own time.

---

## W5. Today → Your Day

### Design

A new section **Your day**, right under **Next up**, open by default:

- A chronological list of everything timed today: classes (C), events (one-off and repeating), repeating task occurrences, timed habits. Each row: `start–end`, title, a small kind icon, and the tick for tasks and habits (habits use proposal A's control).
- **Now:** the block running at the current time is highlighted ("Now · until 16:00"). Blocks that ended are dimmed and collapsed behind "Show earlier (6)". The list starts at the current block, so on a phone the first screen shows now and next.
- Overlaps are shown side by side as one row ("19:30 Kaleem meeting" inside "19:00–20:45 Türkçe"), not as an error. They happen on real days.
- A gap of 30 minutes or more between blocks shows as a thin "Free · 30 min" line, so the day's shape is readable.
- Untimed habits and dated tasks stay in their existing sections below, unchanged.
- **Türkçe:** the Türkçe plan section stays as it is. A timed habit can link to the Türkçe track (`habit.languageTrack: boolean`, or reuse `goalId` = the track's goal) so its row shows "Türkçe · 1 h 05 left today" and opens the plan, instead of a second tick for the same minutes. Such a habit must not add to learning totals (the plan's sessions already do).
- Header line: "Friday 30 Oct. 14 blocks, 9 to go."

### Acceptance

- At 14:00 on a Monday, Your day starts with "Now · Veribir 13:30–16:00", then Garanti 16:15, then the rest; Fajr to lunch is behind "Show earlier".
- Ticking a task occurrence or a habit in Your day is the same action as ticking it elsewhere.
- A day with nothing timed shows no Your day section at all.
- 375 px: no horizontal scroll; long titles wrap under the time.

---

## W6. Calendar → Timetable

### Design

- Week view gets a **List / Timetable** switch (remembered per device). List is today's view; Timetable is an hour grid.
- Timetable: one column per day of the week (week start from Settings), rows from the earliest to the latest timed item of the week, at least 06:00–24:00. Blocks are placed by time and height, coloured by entity: class, event, task, habit. A legend sits above the grid.
- Untimed items (dated tasks, deadlines, milestones) sit in a strip above the grid in each day's column.
- Clicking a block opens the item (the task, habit or event drawer).
- Phone: one day at a time with the day chips above (Mon … Sun), swiping or tapping to change day; the same hour grid in a single column.
- Month view is unchanged except that timed occurrences show with their time prefix, like events today.

### Acceptance

- The week of 2 Nov 2026 entered from the set-up list below shows every block at its time, with Garanti at 16:15 on Monday and 17:15 on Tuesday.
- A block of 15 minutes is still visible (minimum height, title in its tooltip).
- Switching weeks keeps the Timetable mode.

---

## Data, Backups, Docs

- Migration: `habits.slots` (JSON, default `[]`), `tasks.repeat` (JSON, nullable), `events.repeat` (JSON, nullable), `events.skips` (JSON, default `[]`), new table `task_completions`. Only `ADD COLUMN` and `CREATE TABLE`.
- Backups: add the columns and table to the snapshot schema with defaults, so **older backups still restore**; a MINOR snapshot version.
- Docs: `HOP_PRODUCT_SPEC.md` (§13 Habits, §15 Tasks, §4.7 Event, §9 Today: the "Your day" section), `DATABASE.md`, `API.md`, `README.md` (Today and Calendar rows).
- Tests: `schedule.test.ts` (from/until edges, two slots a day, weekday in the user's timezone, skips), API tests for occurrences, a restore test with a pre-week-plan backup.

## Not Building

| Idea | Why not |
| --- | --- |
| A new "block" entity for everything timed | Breaks Hop's separation of task, habit, event and class; the user thinks of work as tasks and meetings as events. |
| Dated copies of every occurrence | Hundreds of rows to enter, edit and delete; occurrences are worked out on the fly instead. |
| "This one or all of them" editing, moving one occurrence | Skip covers the real cases (no Veribir tasks today, visitors). Revisit if it hurts. |
| Drag and drop on the timetable | Later, if editing through the drawer proves slow. |
| Push or sound reminders | Hop's notifications are in-app only; out of scope here. |

---

## Set-Up After the Release (the Planning Chat Does This)

The user will say when it's live. Then, in their signed-in Hop, enter the approved week from the pinned note "My week". Phase A = until 29 Nov, Phase B = from 30 Nov. Times are the agreed ones; check them against "My week" first in case the user changed something.

**Repeating tasks (work):**

| Task | Slots |
| --- | --- |
| Veribir (max 2.5 h) | Mon, Tue, Thu 13:30–16:00 · Wed 13:30–15:50 · Fri 14:30–17:00 |
| Garanti ERP (2 h, hard stop) | Mon, Thu 16:15–18:15 · Tue, Wed, Fri 17:15–19:15 · until 31 Dec (the decision task is on 27 Dec) |
| Kaleem task (max 2 h) | Sun 10:45–12:45 |
| BrewHaus assignment | Sun 15:00–15:30 · until 31 Dec |

**Repeating event:** Kaleem meeting · Wed 19:30–20:30 · Sun 21:15–22:15.

**Courses (proposal C):** TÖMER Mon–Thu 09:15–12:45 from 30 Nov · BrewHaus session Sun 13:00–15:00 until 31 Dec.

**Habits with times** (existing ones edited, new ones added):

| Habit | Slots |
| --- | --- |
| Read Hizp of Quran (existing) | every day 06:30–07:15 |
| Morning ride: Türkçe (new, linked to the Türkçe track) | Mon–Fri 07:30–09:00 |
| Türkçe study block (new, linked to the Türkçe track) | Mon–Thu 09:15–12:45 until 29 Nov · Fri 09:15–11:45 · Mon, Thu 19:00–20:45 from 30 Nov · Tue 19:45–21:30 from 30 Nov · Wed 20:30–22:15 from 30 Nov · Sat 09:00–12:30 · Sun 09:00–10:35 |
| Lunch, Dhuhr, 20-min nap (new) | Mon–Thu 12:45–13:30 · Fri 12:15–13:30 (Jumuah) · Sat, Sun 12:30–14:00 |
| Dinner (new) | Mon, Thu 18:15–19:00 · Tue, Wed 19:15–19:45 · Fri 19:15–20:00 |
| Fundamentals (existing) | Mon, Thu 21:00–21:30 · Tue 21:30–22:00 · Fri 11:45–12:15 |
| Mawaheb (existing) | until 29 Nov: Mon, Thu 19:00–20:45 and 21:30–22:20 · Tue 19:45–21:30 · Wed 20:30–22:15 · Fri 21:00–22:20 · Sat 14:00–17:00. From 30 Nov: Mon, Thu 21:30–22:20 · Fri 21:00–22:20 · Sat 14:00–17:00 |
| Gym (existing) | Tue 16:00–17:00 |
| Football (existing) | Wed 16:00–17:00 |
| Family and relatives (existing) | Fri 13:30–14:30 |
| Profile & skills block (existing) | Fri 20:00–21:00 · Sun 16:00–17:30 |
| Night ride: Turkish audio, Arabic (new) | Mon–Fri 22:30–24:00 |
| Read 10 pages from Arabic book (existing) | Mon–Fri 22:30–23:00 (on the ride) · Sat, Sun 22:00–22:20 |
| Arabic poetry: one bayt (existing) | Sat 17:00–17:10 |
| Free time (new) | Tue 22:00–22:30 · Sat 17:00–23:00 · Sun 17:30–20:00 (free, family, buffer) |
| Rest and breakfast (new) | Sat, Sun 07:30–09:00 |
| Weekly review (existing) | Sun 20:00–20:45 |

**Pause** the habits "Kaleem task" and "BrewHaus session (until 31 Dec)" (replaced above). Delete the task "Switch my week to class mode" or keep it as a check that the 30 Nov slots took over. Update the note "My week" to say the timetable now lives in Calendar → Timetable.
