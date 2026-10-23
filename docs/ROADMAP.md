# Roadmap

What gets built next, and in which version. The long-term vision is in the [product specification](HOP_PRODUCT_SPEC.md); this file is the short list of what is actually planned. What has shipped is in the [changelog](../CHANGELOG.md).

How it works (details in [Development](DEVELOPMENT.md#versions-and-releases)):

- **Only items under Next get built.**
- A request is discussed first. It gets a type, a scope, acceptance criteria and a version, and only then lands here.
- Ideas that come up while a version is being built go to the Backlog, unless we agree to pull them into Next.
- After a release, its items leave this file and the first version under Later becomes Next.

## Next: v1.3.0 (by end of November)

| Item | Type | Spec | Status |
| --- | --- | --- | --- |
| Error log: mistakes by category, recurring ones on Today, Anki export | feat | [Proposal B](proposals/2026-10-turkish-c1-measurement.md#b-error-log) | Scope to agree |
| Minimum day: a tier on each plan activity | feat | [Proposal C](proposals/2026-10-turkish-c1-measurement.md#c-minimum-day) | Scope to agree |

## Later

| Version | Item | Type | Spec |
| --- | --- | --- | --- |
| v1.4.0 (by mid-Dec) | Gates: each checkpoint's targets with ✓/✗, and a confirmation before passing with unmet targets | feat | [Proposal A](proposals/2026-10-turkish-c1-measurement.md#gates) |
| v1.4.0 | Score targets for mock exams | feat | [Proposal D](proposals/2026-10-turkish-c1-measurement.md#d-score-targets) |

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
| The new-course form saves a pre-filled Mon 09:30–12:30 class unless you delete it | fix | |
| A brand-new habit shows "0% of the last 4 weeks" | fix | Count only the days since it was created. |
| Weekly Türkçe review in Hop | feat | [Proposal E](proposals/2026-10-turkish-c1-measurement.md#e-weekly-türkçe-review). Done in chat on Sundays for now. |
| Skill checks on a phone: each area takes four lines; a compact layout | fix | Found while testing v1.2.0. |
| Offline write queue: tick habits, complete tasks and quick-add while the server is off, and sync later | feat | About two days of work. Full offline sync was advised against. |
