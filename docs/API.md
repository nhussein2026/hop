# Hop API

All routes live in `apps/api/src/server.ts`. Request bodies are validated by the schemas in `packages/validation`, which are the precise reference for field names and rules.

## Conventions

- **JSON in, JSON out.** Send `Content-Type: application/json`. Bodies over 1 MB return `413` (200 MB for restore routes).
- **Authentication.** Every route except `/api/health` and `/api/auth/*` needs the `hop_session` cookie, or it returns `401`.
- **Same origin.** Non-`GET` requests with an `Origin` header from another host return `403`.
- **Updates are partial.** `PATCH` bodies contain only the fields to change. Unknown fields are rejected.
- **Dates** are `YYYY-MM-DD` in the user's timezone. Timestamps are ISO 8601 UTC strings.
- **Errors** are `{ "error": "message" }` or `{ "error": { "formErrors": [], "fieldErrors": {} } }`.

| Status | Meaning |
| --- | --- |
| `400` | Invalid body, malformed JSON, or an impossible date such as `2026-02-31` |
| `401` | Not signed in, or wrong password |
| `403` | Cross-origin write |
| `404` | Unknown route or record |
| `409` | Conflict, such as a second review for the same week or an existing password |
| `413` | Body too large |
| `429` | Too many failed password attempts (with `Retry-After`) |

## System and Authentication

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | `{ "name": "Hop API", "status": "ok", "version": "1.0.0" }`. No session needed. |
| `GET` | `/api/auth/session` | `{ setupRequired, authenticated }` |
| `POST` | `/api/auth/setup` | `{ password }`: creates the password (12+ characters). `409` if one exists. |
| `POST` | `/api/auth/login` | `{ password }`: starts a 30-day session. |
| `POST` | `/api/auth/logout` | Ends the current session. |
| `POST` | `/api/auth/password` | `{ currentPassword, newPassword }`: changes the password and signs out other devices. |
| `GET` | `/api/auth/sessions` | Signed-in devices. |
| `DELETE` | `/api/auth/sessions/:id` | Signs one device out. |
| `GET` / `PATCH` | `/api/settings` | Profile, timezone, week start, theme, notifications, career rules, and university settings. |
| `GET` | `/api/system` | Database path and backup directory. |

## Planning

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/tasks` | List or create tasks. A task with `repeat` (weekly time slots, see below) is repeating work: it has no `scheduledDate` or `dueDate` and is ticked per occurrence. |
| `PATCH` / `DELETE` | `/api/tasks/:id` | Update or delete a task. Setting `status` to `completed` records `completedAt` (for repeating work, that ends the series). Setting `repeat` clears the dates; a date on a repeating task is refused with `400`. Deleting repeating work removes its occurrences. |
| `GET` | `/api/tasks/occurrences?from=&to=` | Occurrences of repeating tasks ticked or skipped in a date range. |
| `POST` | `/api/tasks/:id/occurrences` | Tick one occurrence done, or skip it: `{ date, skipped? }`. Only a date the task's times fall on (`400` otherwise); the same date again replaces it. |
| `DELETE` | `/api/tasks/:id/occurrences/:date` | Undo a tick or a skip. |
| `GET` / `POST` | `/api/habits` | List or create habits. A habit has a `unit` (`minutes`, `pages` or `times`), a `target` and an optional `minimum` (not above the target). For `minutes`, `minutes` and `target` are kept equal. Optional `slots` (weekly time slots) make it a timed habit; its `days` then follow from them. |
| `PATCH` | `/api/habits/:id` | Update a habit. |
| `GET` | `/api/habits/completions?from=&to=` | Completions in a date range, or `?date=` for one day. |
| `POST` | `/api/habits/:id/completions` | Log a habit for a date: `{ date, amount? }`. No amount means the whole target. Logging the same date again replaces the amount. |
| `DELETE` | `/api/habits/:id/completions/:date` | Undo a completion. |
| `GET` / `POST` | `/api/events` | List or create calendar events. With `repeat` (weekly time slots) an event repeats from its `date`, at its own time on each weekday; `skips` lists dates left out. |
| `PATCH` / `DELETE` | `/api/events/:id` | Update an event (skip one date by adding it to `skips`), or delete it with all its dates. |

A **weekly time slot** is `{ day, start, end, from?, until? }`: `day` 0 (Sunday) to 6, times `HH:MM` with `end` after `start` (`24:00` allowed), and optional first and last dates. At most 21 per habit, task or event.

## Goals

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/goals` | List (with criteria and progress history) or create goals. |
| `PATCH` | `/api/goals/:id` | Update a goal. |
| `POST` | `/api/goals/:id/criteria` | Add a success criterion. |
| `PATCH` | `/api/goals/:id/criteria/:criterionId` | Update or tick a criterion; goal progress is recalculated. |
| `GET` / `POST` | `/api/milestones` | List or create milestones. |
| `PATCH` / `DELETE` | `/api/milestones/:id` | Update or delete a milestone. |

## Career

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/opportunities` | List or create opportunities. |
| `PATCH` | `/api/opportunities/:id` | Update an opportunity; stage changes are logged on its timeline. |
| `POST` | `/api/opportunities/:id/close` | Close with an outcome. |
| `POST` | `/api/opportunities/:id/reopen` | Reopen a closed opportunity. |
| `POST` | `/api/opportunities/:id/activities` | Log an activity. |
| `DELETE` | `/api/opportunities/:id/activities/:activityId` | Remove an activity. |
| `POST` | `/api/opportunities/:id/prep` | Add a preparation item. |
| `PATCH` | `/api/opportunities/:id/prep/:prepId` | Update a preparation item. |
| `GET` / `POST` | `/api/contacts` | List or create people. |
| `PATCH` | `/api/contacts/:id` | Update a person. |
| `GET` | `/api/interactions` | All interactions. |
| `POST` | `/api/contacts/:id/interactions` | Log an interaction with a person. |
| `GET` / `POST` | `/api/resumes` | List or create resume versions. |
| `PATCH` | `/api/resumes/:id` | Update a resume. |
| `GET` / `PUT` / `DELETE` | `/api/resumes/:id/file` | Download, upload, or remove the resume file (max 10 MB). |

## Growth

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/skills` | List or create skills. A skill's proof level isn't stored; the web app derives it from the evidence. The old self-assessed `level` is read-only. |
| `PATCH` | `/api/skills/:id` | Update a skill. |
| `GET` / `POST` | `/api/projects` | List or create projects. |
| `PATCH` | `/api/projects/:id` | Update a project. |
| `GET` / `POST` | `/api/evidence` | List or create evidence. New evidence needs a `kind`. Kinds `test`, `review`, `used` and `top` also need `by` and a `date`, or the request is refused with 400. |
| `PATCH` | `/api/evidence/:id` | Update evidence. The same rule applies to the result of the change. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/finds[/:id]` | Radar finds. `POST` takes `status: "inbox"` (the default) or `"explore"`. A link already on the radar is refused with `409`, also when a `PATCH` changes a find's link. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/books[/:id]` | Reading list. Each book comes with its `loans` and reading `log`. |
| `POST` | `/api/books/:id/log` | Record the page reached on a day (`{ date, page }`); the same day again replaces it. Returns `{ book, completion, tick }`: `completion` is the linked habit's tick if this call made it (so it can be undone), and `tick` is that day's completion after the log. A habit counted in pages gets the pages read that day as its amount. |
| `DELETE` | `/api/books/:id/log/:date` | Remove that day's entry. |
| `POST` | `/api/books/:id/loans` | Borrow the book (`{ library?, borrowedOn, dueOn, maxRenewals? }`). Refused with 409 while another loan is open. |
| `PATCH` / `DELETE` | `/api/books/:id/loans/:loanId` | Edit a loan (including `returnedOn`) or remove it. |
| `POST` | `/api/books/:id/loans/:loanId/renew` | Renew (`{ date, dueOn }`). 409 when no renewals are left. |

## Notes and accounts

Notes are library items of kind `note` (see University); `pinned: true` keeps one at the top of Notes.

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/accounts[/:id]` | Accounts and subscriptions: login, purpose, cost and billing cycle, a known renewal day, how it's paid, where its password is kept. There is no password field, and text shaped like a card number is refused with 400. |

## Finances

Amounts are numbers in the currency of their wallet (`TRY`, `USD` or `EUR`); totals in lira use the month's rate the user typed in. Names and notes holding 13 or more digits in a row (a card number or an IBAN) are refused with 400.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/money/setup` | First visit: adds the starter categories and a Cash wallet in lira, each only if none exist. Returns `{ categories, wallets }`. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/wallets[/:id]` | Wallets: name, kind (`cash`, `bank`, `card`, `app`), currency, opening balance and the day it was true. The currency can't change. A wallet with entries can't be deleted (409): archive it. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/entries[/:id]` | Money moving: `income`, `expense`, `transfer` or `adjust`. The amount is positive, except an `adjust`, which is signed. An entry takes its wallet's currency. An expense can link a category, a fixed cost (`billId`), a subscription (`accountId`) or a wish (`potId`); income can link its source (`incomeId`); a transfer needs `toWalletId`, and `toAmount` when the two wallets' currencies differ. Links that don't belong to the kind are dropped. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/rates[/:id]` | Lira for one `USD` or `EUR` in a month (`{ month: "2026-10", currency, rate }`). Posting the same month and currency again replaces the rate. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/income[/:id]` | Regular income: amount, currency, usual pay day and wallet. One that was received before can't be deleted (409): pause it with `active: false`. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/bills[/:id]` | Fixed monthly costs: amount, currency, due day (past the month's end means its last day), category and usual wallet. One that was paid before can't be deleted (409): pause it. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/categories[/:id]` | Everyday spending categories with an optional monthly budget in lira. One with spending logged can't be deleted (409): archive it. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/pots[/:id]` | Wishes (`kind: wish`) and savings (`kind: saving`): target, monthly amount, priority, why and a link. A new wish waits 30 days (`waitUntil`) unless a date is given. Setting `status` to `done`, `bought` or `dropped` closes it; deleting removes its money moves. |
| `POST` | `/api/money/pots/:id/buy` | Buy a wish (`{ date, amount, walletId, categoryId?, note? }`): records the expense and closes it. Refused with 409 before `waitUntil` or when it's closed. Returns `{ pot, entry }`. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/money/pot-moves[/:id]` | Money put aside for a pot (positive) or taken back (negative), in the pot's currency. It earmarks money; nothing leaves a wallet. Refused with 409 on a closed pot. |

## Language track (Türkçe)

The track itself (level, target, exam date, exam sections and pass mark) is `languageTrack` in the settings. Changes to it go through `PATCH /api/settings` and merge into the track.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/practice/setup` | Start the track (`{ level, target, examDate, exam? }`): creates the goal with a checkpoint per level and, if the plan is empty, the starter daily plan. 409 if a track exists. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/practice/activities[/:id]` | The daily plan. `tier` is `minimum`, `standard` (the default) or `extended`. Deleting an activity keeps the practice it recorded. |
| `GET` | `/api/practice/sessions?from=&to=` | Practice logged between two dates. |
| `POST` | `/api/practice/sessions` | Log practice (`{ date, minutes, activityId? , area?, note? }`). A planned activity is logged once a day; logging it again changes the minutes. |
| `PATCH` / `DELETE` | `/api/practice/sessions/:id` | Change or remove logged practice. |
| `GET` | `/api/practice/totals` | Minutes per area and days practised, over everything logged. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/practice/tests[/:id]` | Practice test results. Section maximums default to the track's exam; a score above its section's maximum is refused. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/practice/checks[/:id]` | Skill checks: measured results per area (`speaking`, `writing`, `listening`, `reading`, `words`, `grammar`). `metrics` holds only counts, in the shape of its area (for example `{ seconds, words, errors }` for speaking), and is sent together with `area`. Rates such as words per minute are worked out in the app. |

## University (İTÜ)

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/courses` | List (with grading items) or create courses. `provider` defaults to `"İTÜ"`, whose courses need a SIS code (`BLG 527E`); any other provider takes a free short code. Optional `startDate` / `endDate` bound the weekly classes; without them the term's dates are used. |
| `PATCH` / `DELETE` | `/api/courses/:id` | Update or delete a course. |
| `POST` | `/api/courses/:id/complete` | Mark a course completed. |
| `POST` | `/api/courses/:id/assessments` | Add a graded item. Weights may not exceed 100%. |
| `PATCH` / `DELETE` | `/api/courses/:id/assessments/:assessmentId` | Update (for example, enter a score) or delete a graded item. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/terms[/:id]` | Academic terms. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/key-dates[/:id]` | Academic calendar dates. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/pins[/:id]` | Pinned handbook notes. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/uni-links[/:id]` | Handbook links. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/ideas[/:id]` | Research ideas. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/resources[/:id]` | Library items (notes, links, files). |
| `GET` / `PUT` / `DELETE` | `/api/resources/:id/file` | Download, upload, or remove a library file (max 20 MB). |

File uploads (`PUT …/file`) send the raw file as the body, with its name URI-encoded in the `X-File-Name` header. Downloads open PDFs inline (and images, for library files); add `?download=1` to force a download.

## Reviews

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/api/reviews/weekly` | List or create weekly reviews (one per week). |
| `PATCH` | `/api/reviews/weekly/:id` | Update a weekly review. |
| `GET` / `POST` | `/api/reviews/monthly` | List or create monthly reviews (one per month). |
| `PATCH` | `/api/reviews/monthly/:id` | Update a monthly review. |
| `GET` / `POST` | `/api/reflections` | List or add reflections. |

## Data

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/export` | Downloads a full snapshot (`hop-export-YYYY-MM-DD.json`). |
| `GET` / `POST` | `/api/backups` | List server backups, or create one now. |
| `GET` | `/api/backups/:fileName` | Download one backup. |
| `POST` | `/api/backups/test` | Restore the latest backup into an in-memory database and report the record count. |
| `POST` | `/api/restore/preview` | Body: a snapshot. Returns per-table counts now and after the restore. Changes nothing. |
| `POST` | `/api/restore` | `{ snapshot, confirmed: true }`. Saves a safety backup, then replaces all data in one transaction. |

Snapshot versions 1 and 2 are accepted; version 1 backups are filled with defaults for newer tables and columns.

## Trying It With curl

```bash
curl -c cookies.txt -X POST http://localhost:4321/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"<your password>"}'

curl -b cookies.txt http://localhost:4321/api/tasks

curl -b cookies.txt -X POST http://localhost:4321/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Read the Hop product spec","scheduledDate":"2026-10-09"}'
```

`cookies.txt` is ignored by Git. Delete it when you're done.
