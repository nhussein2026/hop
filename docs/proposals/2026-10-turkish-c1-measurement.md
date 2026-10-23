# Proposal: Türkçe Measurement for the C1 Plan

Written 2026-10-23 in a planning chat. This file is the hand-off to an implementation chat: it holds the context, the design, and what is deliberately **not** being built. Read it whole before changing code. Nothing here is in [ROADMAP](../ROADMAP.md) Next yet; each item needs the usual conversation (type, scope, acceptance criteria, version) before it moves up.

| # | Change | Priority | Size |
| --- | --- | --- | --- |
| A | [Skill checks](#a-skill-checks): measured results over time, and gates that need them | **Must**, before the B1 gate (week of 2027-01-04) | Medium (all layers, migration, backups) |
| B | [Error log](#b-error-log): mistakes by category, with recurring ones flagged | **Must**, by end of November 2026 | Small to medium |
| C | [Minimum day](#c-minimum-day): a tier on each plan activity | **Should**, November 2026 | Small |
| D | [Score targets](#d-score-targets): the mock-exam trajectory on Progress | **Should**, before the first full mock (late January 2027) | Small |
| E | [Weekly Türkçe review](#e-weekly-türkçe-review): planned vs done, checks, status | **Could**. Done in chat until then | Medium |
| — | [Not building](#not-building) | Decided against | — |

**Time cap.** These are built in the existing dev/branding block, never in Turkish time. If a build runs past two sessions, stop and use the no-code workaround below instead.

## Context

The user must hold a C1 Turkish certificate from İTÜ TÖMER or Yunus Emre Enstitüsü by **1 July 2027**, starting from about A2 on 2026-10-23. The plan (made in chat on 2026-10-23) judges progress by **what the user can do**, not by minutes or ticked activities:

| Phase | Dates | Gate (what must be shown) |
| --- | --- | --- |
| 0. Baseline | 2026-10-23 → 11-01 | Baseline checks in all six areas |
| 1. A2 → B1 | 11-02 → 2027-01-10 | **B1 gate**, week of 01-04 |
| 2. B1 → B2 | 01-11 → 03-21 | **B2 gate**, week of 03-15: first full mock ≥ 55 |
| 3. B2 → C1 | 03-22 → 05-16 | Mock ≥ 65 by 05-16 |
| 4. Exam mode | 05-17 → exam (late June, date to confirm) | Two mocks in a row ≥ 75, each section ≥ 60 % |

The checks behind each gate:

| Area | Check | Metrics |
| --- | --- | --- |
| Speaking | 2-minute monologue, recorded, auto-transcribed, corrected | words per minute, errors per minute |
| Writing | Timed text, corrected | words, minutes, errors per 100 words, rubric /25 (exam rubric) |
| Listening | 1-minute dictation, or exam-style questions | % words right, or % questions right |
| Reading | Timed exam-style questions | % right, minutes |
| Vocabulary | Anki stats, frequency-band sample | true retention %, mature cards, % of sample known |
| Grammar | Phase structure test | % right |

The exam: İTÜ TÖMER certificate exam, Writing 25 · Listening 20 · Reading 30 · Speaking 25, pass 70 (already `ITU_TOMER_EXAM` in `packages/domain/src/language.ts`).

### What Hop already does (no code needed)

- **Türkçe track**: goal, level checkpoints as milestones, the starter plan, the mistakes note, minutes per area, week balance, practice tests with section scores and weakest section, Reading shelf with library loans, notes tagged Türkçe.
- The plan's day maps onto the starter plan with edits made in the app (Plan tab). Gate thresholds can live as **goal criteria** on the track goal (free text).

### Limits found while planning

1. **Everything measured is minutes.** `weekBalance` flags a skill "behind" by minutes against the plan. Doing the minutes says nothing about ability, which is the thing the plan judges.
2. **Checkpoints are ticked with one click.** "Finished it" / "Passed" on Progress marks the milestone done, ticks its criterion and moves the level, with no evidence. That makes it easy to advance because the calendar says so.
3. **Renaming a checkpoint breaks it.** `finishLevel` finds the goal criterion by `criterion.text === checkpoint.title`. Change dates freely, never titles.
4. **The mistakes note is free text.** Recurring errors can't be counted.
5. **No minimum day.** Today shows the whole plan; on a bad day there's no smaller target that still counts.
6. **Practice tests aren't suggested before B1** (`TEST_EVERY_DAYS.A2 = null`). Fine for full mocks, but the plan needs monthly checks from now, which is what A covers.

---

## A. Skill Checks

### Problem

The plan's weekly and monthly judgments use measured results (above). Today they have nowhere to go but free-text notes, so trends can't be seen and gates can't be checked against anything.

### Data model

New table `language_checks` (`packages/domain/src/language.ts`, schema, migration, repository, service, routes):

| Field | Type | Notes |
| --- | --- | --- |
| id | text | |
| date | ISO date | |
| area | `LanguageSkill \| 'words' \| 'grammar'` | `words` = vocabulary |
| task | text | "2-min monologue: my neighbourhood", "Dictation: Easy Turkish #120 00:30–01:30" |
| metrics | JSON | Shape per area, below |
| level | `CefrLevel \| null` | A judgment, optional |
| judgedBy | `'self' \| 'claude' \| 'teacher' \| 'tutor' \| 'exam' \| null` | Who gave `level` or counted errors |
| link | text | Recording or text location (file name, URL). Hop does not store audio |
| note | text | |
| createdAt, updatedAt | | |

Metrics by area (all integers or one-decimal numbers; derived values are computed, not stored):

- speaking: `seconds`, `words`, `errors` → wpm, errors/min
- writing: `minutes`, `words`, `errors`, `rubric?` (0–25) → errors per 100 words
- listening: `mode: 'dictation' | 'questions'`, `correct`, `total` → %
- reading: `correct`, `total`, `minutes?` → %
- words: `retention?` (%), `mature?` (cards), `known?`, `sampled?` → %
- grammar: `correct`, `total` → %

### Gates

Add `gates` to the track: `{ milestoneId, targets: Partial<Record<MetricKey, number>> }[]`, where `MetricKey` is e.g. `speaking.wpm`, `speaking.errorsPerMin` (at most), `writing.errorsPer100` (at most), `listening.pct`, `reading.pct`, `words.retention`, `grammar.pct`, `test.total`, `test.minSectionPct`.

- A gate passes when, for each target, the **latest check of that kind within 21 days before the gate date or after it** meets the target.
- On Progress, the next checkpoint shows its targets with ✓ / ✗ and the value behind each.
- **"Passed" stays available but asks for confirmation when a target is unmet** ("2 of 6 targets not met. Pass anyway?"). Advancing is the user's call; it is never silent.

Default targets (the plan's; editable):

| Gate | Targets |
| --- | --- |
| B1 (Finish B1) | speaking.wpm ≥ 60, speaking.errorsPerMin ≤ 4, writing.errorsPer100 ≤ 8, listening.pct ≥ 70, reading.pct ≥ 75, grammar.pct ≥ 80, words.retention ≥ 85 |
| B2 (Finish B2) | test.total ≥ 55, test.minSectionPct ≥ 45, speaking.wpm ≥ 80, speaking.errorsPerMin ≤ 3, writing.errorsPer100 ≤ 6, listening.pct ≥ 80 (dictation) |
| C1 exam | test.total ≥ 75 on two tests in a row, test.minSectionPct ≥ 60 |

### Screens

- **Progress → Skill checks** section: one row per area with the latest value, a small trend of the last 8 checks, and the next gate's target.
- **Add check** editor: area first, then only that area's fields. Opened from Progress and from a "Log check" item in Today's "Also today".

### API, validation, backups

CRUD under `/api/language-checks`; Zod schemas in `packages/validation/src/language.ts`; include the table in the backup JSON and restore (`packages/validation/src/backup.ts`, `restore.service.ts`) with an older-backup default of `[]`. Update `docs/API.md` and `docs/DATABASE.md`.

### Acceptance

- A check of each area can be added, edited and deleted; derived values show correctly (e.g. 150 words in 120 s = 75 wpm). Default speaking targets are provisional until the baseline recording calibrates them.
- With targets set, the B1 checkpoint shows ✓/✗ per target from the right checks; a check older than the window doesn't count.
- Passing a checkpoint with unmet targets asks first; with all met, it doesn't.
- Backup → restore round-trips checks and gates; an old backup restores with none.

---

## B. Error Log

### Problem

The plan turns recurring mistakes into targeted practice and Anki cards. The free-text note can't say which kinds of mistakes keep coming back.

### Data model

New table `language_errors`: `id`, `date`, `category`, `wrong`, `right`, `rule` (short explanation, optional), `source` (`writing | speaking | class | test | conversation`), `status` (`active | fixed`), `exportedAt` (null until exported), timestamps.

Categories (fixed list, chosen for Turkish): `case` (case suffixes), `harmony` (vowel/consonant harmony, buffer letters), `tense` (tense/aspect/mood), `agreement` (person/number), `order` (word order), `subordinate` (participles, -dık/-acak, verbal nouns, -ken, -ince …), `postposition`, `word-choice`, `spelling`, `register`, `pronunciation`.

### Rules

- A category is **recurring** when it has 3 or more entries in the last 14 days.
- An entry is `fixed` only by the user, after it has not come back for 4 weeks (Hop suggests it, the user confirms).

### Screens

- **Türkçe → Mistakes** (new tab, or a section on Progress): add quickly (wrong, right, category), filter by category, counts for the last 14 days.
- Today's aside shows the top recurring categories (at most 3) above the notes.
- **Export to Anki**: a CSV download of entries not yet exported (front: `wrong` with a blank to fill; back: `right` + `rule`), then sets `exportedAt`.

### Acceptance

- Adding an entry takes one dialog with three required fields.
- Three `case` entries in 14 days put "Case suffixes" in Today's recurring list; a fourth week without one drops it.
- The CSV opens in Anki's import with two fields per line, UTF-8, Turkish characters intact.
- Backups include the table.

---

## C. Minimum Day

### Problem

The plan defines a **minimum day** (about 50 minutes: Anki reviews, 20 min listening, a 2-minute recording with 5 written sentences) that must happen every day, even a bad one. Today shows only the full plan, so a short day looks like failure and there's nothing smaller to aim for.

### Design

- Add `tier: 'minimum' | 'standard' | 'extended'` to practice activities (default `standard`; migration sets the three minimum activities by hand in the app, not by code).
- Today lists **Minimum** first, with its own "Minimum done" state; **Extended** is collapsed under "If you have time".
- The week strip marks a day as kept when all minimum activities were done, whatever the minutes.
- Progress shows "Minimum kept: 6 of 7 days" for the week.

### Acceptance

- With the three minimum activities done and nothing else, the day shows as kept and the minutes bar shows the true share.
- Extended activities never count against the week's balance.

---

## D. Score Targets

### Design

- Add `scoreTargets: { date, total }[]` to the track. Defaults from the plan: 2027-03-21 → 55, 2027-05-16 → 65, 2027-06-13 → 75.
- Practice tests table: a column with the target that applied on the test's date (straight line between targets); the total badge turns warning when below it.
- The test-due banner text stops saying tests "start from B1" when targets exist.

### Acceptance

- A test on 2027-04-18 shows target 60 (halfway between 55 and 65).
- A full test below target shows the warning badge.

---

## E. Weekly Türkçe Review

Lower priority: the weekly review happens in chat on Sundays with the template from the plan, and that's enough until A–D exist. If built later:

- A Türkçe section in the weekly review: hours vs target (21 h) and floor (15 h), minimum days kept, output counts (texts written, recordings, conversations), checks this week vs the next gate, recurring error categories.
- Status: **green** (≥ 21 h or ≥ 18 h with all output quotas, minimum kept ≥ 6 days, checks on track), **amber** (15–18 h, or minimum kept 5 days, or one check under the next gate's line), **red** (< 15 h, or a second amber week in a row, or a gate missed by more than 2 weeks).
- Two prompts when not green: the cause (time / method / foundation / target too high) and the one change for next week.

---

## Not Building

- **Lessons or course content in Hop.** Content comes from the class, the books and the media in the plan; Hop records and measures.
- **A spaced-repetition engine.** Anki does it; Hop only exports errors to it.
- **Audio recording or storage.** The phone's recorder does it; a check stores a link or file name.
- **Automatic grading or AI inside Hop.** Corrections come from the teacher, a tutor or chat; Hop stores the counts.
- **Streaks, badges or points.** The plan judges ability, not streaks.
- **A plan generator.** Phases and gates are set once, in chat, and adjusted weekly by hand.

## Implementation Notes (2026-10-23, v1.2.0)

What was agreed or decided when skill checks were built.

| Topic | Decision | Why |
| --- | --- | --- |
| Scope | v1.2.0 has checks only: no gates, no "Log check" on Today. Gates and score targets are planned for v1.4.0, the error log and minimum day for v1.3.0. | Baseline checks are needed this week; gates aren't used until the B1 gate in January, and the time cap is two sessions per build. |
| Route | `/api/practice/checks`, not `/api/language-checks`. | It sits beside `/api/practice/tests` and the rest of the track. |
| Deleting | Allowed, with Undo, and no confirmation. | The user chose it: checks are their own records, so a mistyped one should be easy to remove. |
| Metrics | Only counts are stored and sent with their `area`; the server checks the shape per area (for example, correct ≤ total, and known needs sampled). | The figures stay comparable if a formula changes. |
| `words` | Shown as **Vocabulary**. Its headline is retention when given, otherwise the share of the sample known, otherwise mature cards; the trend follows the latest check's headline. | A check may record only some of the three. |
| Trend | The last 8 checks of the headline figure, as a line with "60 → 75 wpm since 20 Oct, better". | A line with no scale doesn't say how much. |
| Limit 3 | A checkpoint finds its goal criterion by title, or else by level, so renaming either still works. | |
