# Roadmap

What gets built next, and in which version. The long-term vision is in the [product specification](HOP_PRODUCT_SPEC.md); this file is the short list of what is actually planned. What has shipped is in the [changelog](../CHANGELOG.md).

How it works (details in [Development](DEVELOPMENT.md#versions-and-releases)):

- **Only items under Next get built.**
- A request is discussed first. It gets a type, a scope, acceptance criteria and a version, and only then lands here.
- Ideas that come up while a version is being built go to the Backlog, unless we agree to pull them into Next.
- After a release, its items leave this file and the first version under Later becomes Next.

## Next: v1.6.0 (by mid-Dec, before the B1 gate on 4 Jan)

| Item | Type | Spec | Status |
| --- | --- | --- | --- |
| Gates: each checkpoint's targets with ✓/✗, and a confirmation before passing with unmet targets | feat | [Türkçe proposal A](proposals/2026-10-turkish-c1-measurement.md#gates) | Scope to agree |
| Score targets for mock exams | feat | [Türkçe proposal D](proposals/2026-10-turkish-c1-measurement.md#d-score-targets) | Scope to agree |
| Error log: mistakes by category, recurring ones on Today, Anki export (moved from v1.3.0 on 2026-10-24) | feat | [Türkçe proposal B](proposals/2026-10-turkish-c1-measurement.md#b-error-log) | Scope to agree |

## Later

| Version | Item | Type | Spec |
| --- | --- | --- | --- |
| v1.7.0 (January) | Ventures and project editing: Career or Venture, a progress log, a drawer that edits every field | feat | [Hop proposal D](proposals/2026-10-hop-improvements.md#d-ventures-and-project-editing) |
| v1.7.0 | Job sources in Career: career sites to check every few weeks | feat | [Hop proposal E](proposals/2026-10-hop-improvements.md#e-job-sources) |

## Backlog

Not assigned to a version. Each one needs a conversation before it moves up.

| Item | Type | Notes |
| --- | --- | --- |
| Update notice: when the server has a newer version than this device, say so on every screen, not only in Settings | feat | Settings already shows both versions and a Reload. |
| Market check: sample job postings and compare them with your skills | feat | [Proposal C](proposals/2026-10-skills-and-branding.md#c-market-check). Waits until you've done one sample by hand. |
| Portfolio export for nhussein.io | feat | [Proposal D](proposals/2026-10-skills-and-branding.md#d-portfolio-export). Maybe 2027. |
| Calendar feed (ICS) to subscribe to from a phone's calendar app | feat | |
| The root `.env` is ignored by `yarn dev` and `yarn start` | fix | `dotenv` reads `.env` from `apps/api`, the API's working directory. Fixing it changes which database development uses. |
| Skills polish: edit a skill's name and layer; line up the parked table with the main one; make a skill and the six evidence kinds fit a phone | fix | Found while testing proven skills. |
| Decide: should finishing a block-day step's task also tick its habit? | feat | Today, block-day step. Today they're separate. |
| Evidence editor: stay in the skill drawer after saving, add a search to the skill picker, and use one scrollbar | fix | Found while testing v1.1.0. |
| Block-day step: a long task title wraps onto two lines on a wide screen | fix | Found while testing v1.1.0. |
| "Add a habit" on a goal's page should pre-select that goal | fix | |
| A brand-new habit shows "0% of the last 4 weeks" | fix | Count only the days since it was created. |
| Weekly Türkçe review in Hop | feat | [Proposal E](proposals/2026-10-turkish-c1-measurement.md#e-weekly-türkçe-review). Done in chat on Sundays for now. |
| Skill checks on a phone: each area takes four lines; a compact layout | fix | Found while testing v1.2.0. |
| Offline write queue: tick habits, complete tasks and quick-add while the server is off, and sync later | feat | About two days of work. Full offline sync was advised against. |
| Goals without a target date: the goal form requires one, though the model allows none | fix | Found 2026-10-23 entering the profile goals, which are long-term on purpose. Both got 31 Dec 2027 as a placeholder. |
| Goal priority can't be set or changed anywhere in the UI | fix | Every goal shows Medium. The profile goal was meant to be High. |
| Decide: should "New task" pre-fill "Do on" with today? | fix | It does on every Plan filter, "No date" included. 13 tasks meant to be undated were scheduled for today without anyone noticing. Either leave it empty, or make the pre-fill obvious. |
| Decide: should a Must due tomorrow come before a High task for today in "Next up"? | fix | Today put a 20-minute GitHub cleanup ahead of a practicum assignment due the next day. |
| Citations and references, in your own method (not Zotero) | feat | [Hop proposal G](proposals/2026-10-hop-improvements.md#g-citations-and-references). Needs a conversation about your method first; the questions are in the proposal. |
| Long dialogs scroll in two places, so buttons move under the pointer | fix | Seen in Save a find and Add course while testing v1.3.0; the evidence editor item above is the same problem. One scrollbar for every dialog. |
| "Next: Practicum sunday at 13:00" on Today's Classes today | fix | Should read "on Sunday at 13:00". Found testing v1.3.0. |
| Course form: hide İTÜ-only parts (final eligibility, VF) for other providers | fix | Found testing v1.3.0. The clock icon overlapping the end time is fixed in v1.4.0. |
| Courses from TÖMER or a practicum live under İTÜ → Courses, labelled "This term" | fix | Decide where non-İTÜ courses belong. Found testing v1.3.0. |
| Course class days stop at Saturday: no Sunday in the day picker, though the API accepts it | fix | The BrewHaus session (Sundays 13:00–15:00) can't be added as a course from the form. Found 2026-10-27 entering the week. |
| A course you're taking with no dates and no term shows its classes every week, forever | fix | "Digital Circuits" (no term, no dates) puts a Mon 09:30–12:30 class on every Monday and on Today's "Next". Proposal C expects a hint, not endless classes. Both İTÜ courses also still carry that fake slot from the old form bug; removing it is the user's call. |
| Habit form: changing "Counted in" keeps the old number | fix | Minutes → pages turned "30 min" into "30 pages"; minutes → times into "30 times". Suggest resetting to the unit's usual default, or asking. |
| Plan → Habits shows a habit's minimum only on days it's scheduled | fix | Profile, Football and Family have minimums saved, but their rows show only the target on other days. |
| "Timeline only" habits: meals, rides and free time show in Your day and the Timetable but don't count as habits or trigger "missed last time" | feat | Found testing v1.4.0: entered as ordinary habits they count in Today's Habits total and warn when not ticked. Until then, leave them out of Hop's habits. |
| Your day's "to go" counts done and skipped blocks | fix | Found testing v1.4.0: "12 blocks, 12 to go" after ticking the first. |
| Today's "Coming up" lists every routine occurrence (rides, meals, study blocks), pushing real deadlines and meetings out | fix | Found 2026-10-27 entering the week: routine blocks are repeating "personal" events (no timeline-only habits yet). Show meetings, interviews and deadlines there, not daily routine. Ties in with the "Timeline only" habits row. |
