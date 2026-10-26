# Roadmap

What gets built next, and in which version. The long-term vision is in the [product specification](HOP_PRODUCT_SPEC.md); this file is the short list of what is actually planned. What has shipped is in the [changelog](../CHANGELOG.md).

How it works (details in [Development](DEVELOPMENT.md#versions-and-releases)):

- **Only items under Next get built.**
- A request is discussed first. It gets a type, a scope, acceptance criteria and a version, and only then lands here.
- Ideas that come up while a version is being built go to the Backlog, unless we agree to pull them into Next.
- After a release, its items leave this file and the first version under Later becomes Next.

## Next: v1.3.0 (built, in review)

| Item | Type | Spec | Status |
| --- | --- | --- | --- |
| Radar: edit a find, a "To explore" shelf, a Website kind | feat | [Hop proposal B](proposals/2026-10-hop-improvements.md#b-radar-edit-to-explore-website) | Built 2026-10-26 on `feat/radar-edit-explore` |
| Classes on Calendar and Today; any course, not only İTÜ. Live before TÖMER starts on 30 Nov | feat | [Hop proposal C](proposals/2026-10-hop-improvements.md#c-classes-on-the-calendar) | Built 2026-10-26 on `feat/classes-on-calendar` |
| Habit amounts and minimums: log 5 of 10 pages, a minimum per habit, a "never zero twice" warning, a clearer done state | feat | [Hop proposal A](proposals/2026-10-hop-improvements.md#a-habit-amounts-and-minimums) | Built 2026-10-26 on `feat/habit-amounts` |
| Minimum day: a tier on each plan activity, built together with the habit minimums | feat | [Türkçe proposal C](proposals/2026-10-turkish-c1-measurement.md#c-minimum-day) | Built 2026-10-26 on `feat/habit-amounts` |

The three branches are stacked in that order, because two of them add migrations: merge them in that order. Released as soon as they're reviewed (decided 2026-10-26), not at the end of November.

## Later

| Version | Item | Type | Spec |
| --- | --- | --- | --- |
| v1.4.0 (before 30 Nov, when the week changes phase) | Week plan: timed habits, repeating work tasks with a tick per day, repeating events, Today → Your day, Calendar → Timetable | feat | [Week plan proposal](proposals/2026-10-week-plan.md) |
| v1.5.0 (by mid-Dec, before the B1 gate on 4 Jan) | Gates: each checkpoint's targets with ✓/✗, and a confirmation before passing with unmet targets | feat | [Türkçe proposal A](proposals/2026-10-turkish-c1-measurement.md#gates) |
| v1.5.0 | Score targets for mock exams | feat | [Türkçe proposal D](proposals/2026-10-turkish-c1-measurement.md#d-score-targets) |
| v1.5.0 | Error log: mistakes by category, recurring ones on Today, Anki export (moved from v1.3.0 on 2026-10-24) | feat | [Türkçe proposal B](proposals/2026-10-turkish-c1-measurement.md#b-error-log) |
| v1.6.0 (January) | Ventures and project editing: Career or Venture, a progress log, a drawer that edits every field | feat | [Hop proposal D](proposals/2026-10-hop-improvements.md#d-ventures-and-project-editing) |
| v1.6.0 | Job sources in Career: career sites to check every few weeks | feat | [Hop proposal E](proposals/2026-10-hop-improvements.md#e-job-sources) |

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
