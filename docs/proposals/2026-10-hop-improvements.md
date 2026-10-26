# Proposal: Hop Improvements from the Notes

Written 2026-10-24 in a planning chat, from the user's note "Features to be add to Hop" (Notes, tag Hop). This file is the hand-off to an implementation chat: it holds the context, the decisions already made, the design, and what is deliberately **not** being built. Read it whole before changing code.

| # | Change | From the note | Version | Size |
| --- | --- | --- | --- | --- |
| A | [Habit amounts and minimums](#a-habit-amounts-and-minimums): log how much you did, a minimum per habit, "never zero twice", a clearer done state | Items 2, 3 | **v1.3.0** | Medium (all layers, migration, backups) |
| B | [Radar: edit, To explore, Website](#b-radar-edit-to-explore-website) | Items 1, 8 | **v1.3.0** | Small |
| C | [Classes on the calendar](#c-classes-on-the-calendar): weekly class times on Calendar and Today, any course | Item 6 | **v1.3.0**, ready before 30 Nov | Small to medium |
| D | [Ventures and project editing](#d-ventures-and-project-editing): a project kind, a progress log, a drawer that edits everything | Item 4 | v1.5.0 | Medium |
| E | [Job sources](#e-job-sources): career sites you check again and again, in Career | Item 7 | v1.5.0 | Small to medium |
| F | [Repeating events](#f-repeating-events): weekly meetings | Backlog | v1.5.0 | Small to medium |
| G | [Citations and references](#g-citations-and-references), in the user's own method | Item 5 | Not set: needs a conversation first | Unknown |
| — | [Not building](#not-building) | | Decided against | — |

v1.3.0 also keeps [Minimum day](2026-10-turkish-c1-measurement.md#c-minimum-day) from the Türkçe proposal. It is built together with A so that "minimum" looks and behaves the same everywhere. The [Error log](2026-10-turkish-c1-measurement.md#b-error-log) moves from v1.3.0 to v1.4.0, next to Gates and Score targets. Until then the note "Türkçe: mistakes I keep making" does its job.

**Time cap.** Hop has no slot in the approved week (note "My week"). Claude builds; the user's own time on Hop (testing, deciding) stays around 1 hour a week, taken from the Sunday buffer, never from Turkish time. If v1.3.0 is not finished by 26 Nov, release what is merged so that C is live before TÖMER starts on 30 Nov.

## Context

The approved week (2026-10-24, pinned note "My week") runs on **minimum rules**: "never zero twice" (nothing misses two scheduled times in a row), a minimum for every habit and job, and "after a minimum day comes a normal day". Hop can't hold any of that yet: a habit is either done or not, and the only minimum Hop knows is the planned Türkçe one (Minimum day, not built yet).

The minimums from "My week", which A must be able to hold:

| Habit or job | Minimum |
| --- | --- |
| Turkish | 50 min (handled by Minimum day on the Türkçe plan) |
| Quran | the full hizb |
| Arabic | 2 pages, or recite the bayt |
| Fundamentals | 10 min |
| Mawaheb | 15 min |
| Profile | 10 min |
| Gym, football | a 15-minute walk |

What the note asked, and what was decided in chat (2026-10-24):

| # | The note | Decision |
| --- | --- | --- |
| 1 | "Add in the radar to explore" | A **To explore** shelf in Radar for things you're curious about but unsure deserve a try (sites you heard of, ideas). → B |
| 2 | A square showing a done habit | The user left the design to Claude: "go with the better UI/UX one". → A, "Done state" |
| 3 | Show a habit's time on Today; log half or more of it (5 of 10 pages, 17 of 30 min) | Built together with the minimums. → A |
| 4 | Personal projects that may become a business, tracked personally | A project kind, Career or Venture, with a progress log. → D |
| 5 | Citations and references for research, reading and writing | The user doesn't want Zotero: "I need my own method". Built in Hop, after a conversation about that method. → G |
| 6 | A "course" option in the calendar | Classes come from Courses, which already hold weekly class times, so they're entered once, not every week. → C |
| 7 | Career platform links, in Career or Radar | In **Career**, not Radar. Radar asks for one decision per find and marks it stale after 30 days; a careers site is visited again and again. → E |
| 8 | Radar finds must be editable | The API can already update a find; the screen can't. "Microsoft Careef Platform" is stuck with its typo. → B |

---

## A. Habit Amounts and Minimums

### Problem

A habit is binary (`habit_completions` has no amount). Today doesn't show the target at all ("Read 10 pages from Arabic book" shows only "Every day"). Reading 5 pages, or 14, looks the same as reading none or exactly 10. With no minimum and no warning, "never zero twice" lives only in the note.

### Data model

- `habits`: add `unit` (`minutes | pages | times`, default `minutes`), `target` (number, default: the habit's current `minutes`), `minimum` (number, nullable).
- Keep `minutes` as the time estimate used for learning totals when the unit isn't minutes.
- `habit_completions`: add `amount` (number, nullable). Old rows stay null and read as "the target was met", so no history changes.
- A migration fills `target` from `minutes` for every existing habit. Backups: a new snapshot version (MINOR; older backups still restore).

### Rules

- A day's state: **Done** (amount ≥ target) · **Minimum** (amount ≥ minimum, below target) · **Some** (more than zero but below the minimum, or below the target when there is no minimum) · **Missed** (scheduled, nothing).
- **Kept** = Done or Minimum. With no minimum set, only Done counts as kept.
- The 4-week rate counts kept days: "Kept 18 of 24 days, 6 at minimum".
- **Never zero twice:** when a habit's last scheduled day was Missed and it is due today with nothing logged, Today's "Needs attention" says so: "Read Hizp of Quran: missed last time. Do at least the minimum today (the full hizb)." It goes away once the minimum is logged. This prevents the second miss rather than reporting it afterwards.
- Learning totals: minute habits count the minutes logged; other units count the habit's `minutes` in proportion to amount ÷ target.
- A habit linked to a book takes its amount from the book: pages read that day = the page reached minus the previous log. `POST /api/books/:id/log` already ticks the linked habit; now it also passes the amount.

### Done state (item 2)

The user's note asked for a visible mark on a done habit. The design:

- **One control, on the left:** the round check, the same shape as tasks and goal criteria everywhere in Hop. Three looks: empty (nothing yet), **half-filled** (Minimum or Some), **filled with ✓** (Done). One tap logs the full target, and tapping again undoes it, as today.
- **The amount next to the name:** "10 pages · min 2" before anything is logged, then "5 of 10 pages · minimum kept" or "Done · 12 of 10 pages". Tapping that text opens a small number field with three quick buttons: **Minimum**, **Target**, and a custom amount.
- **The 7 squares on the right get weekday letters** under them (M T W T F S S), with today's letter in bold, so it is clear which square is which day. Done = filled, Minimum or Some = half-filled, Missed = outlined, not scheduled = dash (as now).
- The whole row dims slightly once Done, so finished habits fall back visually.

### Screens

- **Today → Habits:** as in "Done state". The summary tile "Habits 0/4" counts kept habits.
- **Habit form:** unit, target and minimum (optional), with a hint: "Your minimum on a bad day. Never zero twice."
- **Plan → Habits:** same row, plus the kept rate.

### API

- `POST /api/habits/:id/completions` takes `{ date, amount? }`. No amount = the target. Posting again for the same date replaces the amount, like the book log.
- `DELETE /api/habits/:id/completions/:date` unchanged.
- `PATCH /api/habits/:id` accepts `unit`, `target`, `minimum`.

### Acceptance

- A habit "Read 10 pages, minimum 2": logging 5 shows a half-filled check and "5 of 10 pages · minimum kept", and counts as kept. Logging 12 shows ✓ and "Done · 12 of 10 pages".
- A habit missed on its last scheduled day shows the never-zero-twice line on Today, and the line goes away once its minimum is logged.
- Ticking the circle with one tap still works exactly as before.
- Every existing habit and its history look the same after the migration until the user sets a minimum.
- Logging page 40 on a linked book after page 30 the day before records 10 pages on the habit.
- The weekday letters line up under the squares on a phone (375 px) without wrapping.

---

## B. Radar: Edit, To Explore, Website

### Problem

A find can't be changed after saving: no way to fix a title, a link, the kind or the "why". Things the user is only curious about have nowhere to wait: the Inbox wants a decision and flags anything older than 30 days, so they ended up in a separate note ("To Explore: note.com").

### Design

- **Edit:** every find, in any status, gets **Edit** in its menu. It opens the "Save a find" dialog filled in (title, link, kind, source, why, topics, language, event date). Changing the link re-runs the duplicate check, ignoring the find itself. Status isn't edited here; the existing buttons do that.
- **To explore:** a new status `explore`, shown as the tab **To explore** between Inbox and To try. It holds things you're curious about but aren't sure deserve a try.
  - The Inbox card's menu gets **"Curious: to explore"**, and "Save a find" gets **"Put it in: Inbox / To explore"**.
  - To explore finds are **never flagged stale**. They're reviewed at the January and August review moments the user already keeps (note "Skill standard: principles"). The tab shows how long each has waited.
  - From To explore: Try it, Read later, Keep in library, Idea, Dismiss, the same as from the Inbox.
- **Website:** a new find kind `site` ("Website") for services and sites like note.com, which are neither a tool nor an article.

### Acceptance

- Renaming "Microsoft Careef Platform" to "Microsoft Careers" saves, and the card updates.
- Changing a find's link to one already on the radar is refused with the existing message.
- A find put in To explore 60 days ago shows no stale warning.
- Backups include the new status and kind (no new table).

---

## C. Classes on the Calendar

### Problem

Courses already store weekly class times (`schedule: ClassSlot[]`), but `agendaItems` never adds them, so the Calendar and Today don't show any classes. The course form only accepts İTÜ SIS codes ("BLG 527E"), so TÖMER (Mon–Thu 09:15–12:45 from 30 Nov) and the BrewHaus practicum can't be added at all. The note asked for a "course" option in the calendar.

### Design

- **Any course:** add `provider` (free text, default "İTÜ"). The SIS code format is required only when the provider is İTÜ; otherwise the code is optional free text ("A2", "Practicum"). Add optional `startDate` and `endDate` on a course, for courses outside an İTÜ term.
- **Class dates:** a class slot shows on every matching weekday between the course's dates. Without them, the term's dates are used. A course with neither shows a hint on its page: "Add the dates so classes show on your calendar."
- **Holidays:** no class on a key date of kind `holiday`.
- **Calendar:** classes as their own entry type ("Class", with time and room), and a **Classes** chip next to "Everything / Events and deadlines / Tasks".
- **Today → Coming up:** today's and tomorrow's classes, with time and room.
- **New event dialog:** a line at the bottom, "A class that repeats every week? Add it as a course", linking to the new-course form.
- **Fold in the backlog bug:** the new-course form saves a pre-filled Mon 09:30–12:30 class unless you delete it. With classes on the calendar, that would put phantom classes there. The form starts with no class slots.

### Acceptance

- A course "TÖMER Turkish A2" (provider TÖMER, Mon–Thu 09:15–12:45, 30 Nov 2026 – 15 Jan 2027) shows four classes a week in that range and none outside it.
- A key-date holiday on a Tuesday removes that Tuesday's class.
- Creating a course without touching the schedule saves no class slots.
- Only courses with status `taking` show classes.
- İTÜ courses still require a valid SIS code.

---

## D. Ventures and Project Editing

### Problem

All five projects count as career evidence, but Sefer-Cashier and Wifine are businesses the user may launch, and Mawaheb is built for a foundation. The user needs to track them for themselves, not as portfolio items. The project drawer can only change status (backlog item), and a project's auto blurb is cut mid-word with no ellipsis (backlog item). Both are folded in here.

### Design

- **Kind:** `kind: 'career' | 'venture'` on a project, default `career`. Growth → Projects gets two chips: **Career** and **Ventures**. Ventures are never part of a portfolio export ([Proposal D, skills and branding](2026-10-skills-and-branding.md#d-portfolio-export)) and don't ask for evidence. Evidence can still be linked if the user wants it.
- **Status:** add `validating` (talking to the people it's for, before or during building), usable by both kinds. For ventures, `deployed` is labelled "Launched".
- **Progress log:** dated entries on a project (`date`, `text`, optional `next`: the next step). The drawer shows the log, newest first. The card shows the latest entry and its age. A venture in `validating` or `building` with no entry for 14 days shows "No update in 2 weeks" on its card. This stays in Projects, never on Today.
- **Drawer edits everything:** name, kind, status, blurb, problem, stack, repo and demo links, goals, dates, learned, challenges. It also shows the project's open tasks (tasks already have `projectId`) with **Add a task**.
- **Blurb:** cut at a word boundary with "…".

### Acceptance

- Switching Sefer-Cashier to Venture moves it under the Ventures chip, and it no longer shows "0 evidence entries".
- Adding a log entry with a next step shows it on the card, with its age.
- Every field in the model can be changed from the drawer.
- No blurb ends mid-word.
- Backups include the new column and the log table.

---

## E. Job Sources

### Problem

The user saved four career platforms as Radar finds: Microsoft, Trendyol and Google careers, and a Baykar profile. Those aren't one-time finds; they're places to check regularly, especially with the Garanti decision due on 31 Dec and job-offer thresholds set in "My week". A specific posting is already an **opportunity** in Career; what's missing is the list of places to look.

### Design

- New table `job_sources`: `name`, `url`, `search` (what to look for there, e.g. "Frontend, remote or İstanbul, part-time"), `checkEveryDays` (default 14), `lastCheckedOn`, `accountId` (optional link to Notes → Accounts, e.g. the Baykar profile), `notes`, `active`.
- **Career → Job sources**, a section or tab. Each source shows when it was last checked and has two buttons: **Checked, nothing new** (sets today) and **Found one** (opens a new opportunity with source and link filled in, then sets today).
- **Today:** one bundled line in "Needs attention" when sources are due: "3 job sources to check". Never one line per source.
- **From Radar:** finds of kind `opportunity` get **"Move to job sources"** in their menu: it creates the source and marks the find converted. The user moves the four platforms that way.

### Acceptance

- A source checked 15 days ago with a 14-day interval counts in Today's line; "Checked, nothing new" removes it.
- "Found one" creates an opportunity whose source is the job source's name.
- Moving a Radar find creates the source with its title, link and topics, and the find shows "Became a job source".
- Backups include the table.

---

## F. Repeating Events

> **Moved on 2026-10-26** into the [week plan proposal](2026-10-week-plan.md#w4-repeating-events) (W4), built on shared weekly time slots so one event can have different times on different days. Build it there, not here.

### Problem

Events can't repeat. Kaleem meets on Wednesday and Sunday evenings, and other weekly meetings will come.

### Design

- Add `repeat` on an event: `none | weekly`, with `repeatDays` (weekdays) and an optional `repeatUntil`.
- Occurrences are worked out on the fly for the Calendar and Today, with no row per occurrence. **Skip this one** stores an exception date. Editing asks "This one or all of them?" only when it matters.
- Classes (C) stay in Courses; repeating events are for meetings and appointments.

### Acceptance

- A weekly event on Wed and Sun at 19:30 shows on every Wednesday and Sunday until its end date.
- Skipping one occurrence hides only that date.
- Deleting the event removes every occurrence.

---

## G. Citations and References

### Decision so far

The user wants this **in Hop**, done their own way, and doesn't want Zotero. Claude's earlier advice was to use Zotero, because a full citation manager (styles, word-processor plugins) is large. The user heard that advice and decided otherwise; this section respects that decision. It is **not scheduled** until the method is described in a short conversation.

### What Hop already has to build on

- **Books** (`books`): title, author, pages, language, takeaways (at most 3), a reading log by page.
- **Library** (`resources`): kinds `paper`, `book`, `video`, `link` and more, with title, URL, source, topics and a note body.
- **Research ideas** link finds and resources.

The design should extend these, not add a parallel list of sources.

### Questions for that conversation

1. **What is a reference** for you: the fields you write down (authors, year, title, publisher or journal, pages, DOI or link, edition)? Any you never use?
2. **Quotes and notes:** do you record quotes with page numbers? Your own comment on each? Tags?
3. **Where do you write** (Word, Google Docs, LaTeX/Overleaf, Hop's own notes), and how should a reference get there: copy a formatted citation, a BibTeX export, something else?
4. **Which style:** APA 7, İTÜ thesis style, Chicago, or an Arabic or Turkish convention? One style or several?
5. **Languages:** Arabic and Turkish sources too (right-to-left titles, transliteration)?
6. **The first real use:** which reading or writing project would use it first, and when?

---

## Not Building

- **Habit timers or stopwatches.** Amounts are logged after the fact.
- **Streaks, badges or points** (as in the Türkçe proposal). "Never zero twice" is a warning, not a streak.
- **Push notifications for habits or job sources.** Today's "Needs attention" is the only nudge.
- **Fetching job postings automatically** (scraping, job-board APIs). Hop has no external services (see [Security](../SECURITY.md)); the user checks the sites themselves.
- **Business finances for ventures** (revenue, invoices, customers). The progress log is the tracking; money goes elsewhere until a venture earns.
- **A separate "class" event type.** Classes come from Courses (C), so they're entered once.

## After Each Release: Set-Up in the App

Done by the user (or together in a chat), not by code:

- **v1.3.0:**
  - Set unit, target and minimum on each habit from the "My week" table above.
  - Save note.com in Radar → To explore, and retire the "To Explore" note.
  - Fix the Microsoft find's title.
  - Add TÖMER (from 30 Nov) and BrewHaus (until 31 Dec) as courses with their class times.
- **v1.5.0:**
  - Set Sefer-Cashier and Wifine (and Mawaheb if it fits) to Venture.
  - Move the four career platforms from Radar to job sources.
  - Add Kaleem's Wed and Sun meetings as one repeating event.
