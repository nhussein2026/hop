# Proposal: Proven Skills, Block-Day Next Steps, Market Check

Written 2026-10-21 in a planning chat. This file is the hand-off to an implementation chat: it holds the context, the decisions already made, the design, and what is deliberately **not** being built. Read it whole before changing code.

| # | Change | Status | Size |
| --- | --- | --- | --- |
| A | [Proven skills](#a-proven-skills): a skill's level comes from its evidence | **Built** 2026-10-22 (v1.1.0), not yet committed | Medium (all layers, migration, backups) |
| B | [Block-day next step](#b-block-day-next-step): a habit linked to a goal shows that goal's next task on Today | **Built** 2026-10-22 alongside A; the roadmap has it in v1.2.0 | Small (web only) |
| C | [Market check](#c-market-check): sample postings, compare with your skills, quarantine trends | **Wait** until the user has done one sample by hand | Medium |
| D | [Portfolio export](#d-portfolio-export): verified skills and featured projects as a file for nhussein.io | **Maybe, 2027** | Small to medium |
| — | [Not building](#not-building) | Decided against | — |

## Context

The user is running a long-term goal to rebuild their public profile (nhussein.io, LinkedIn, ~115 GitHub repos) and to **prove every skill they list** to a standard of their own: informed by the job market, not pushed around by it, and aiming above the market average.

Decisions the user has made:

- **Turkish C1 (İTÜ TÖMER, July 2027) is the root priority.** Everything here is side work. Nothing in these features may add pressure to the Türkçe track or crowd Today.
- **Positioning:** a full-stack TypeScript software engineer moving into AI engineering, while deepening classic software and computer engineering (they are on the İTÜ Computer Engineering MSc path).
- **No fixed timeline.** Profile work is a long-term journey done in weekly blocks (about 6 h/week, a weekly habit) and in short pushes when an application needs a part fixed. Tasks are mostly **undated**.
- **Honest scale now, proof over time.** Skills are published with an honest level today, and the level rises only as evidence arrives.
- **The user reviews their GitHub repos by hand**, without tokens and without Claude. Each repo gets a dated "journey card", including broken ones. Hop tracks the process, not the repos.

### The standard Hop should enforce

The market decides **which** skills matter; the user decides **how high** the bar is and **what counts as proof**.

| Level | Rule |
| --- | --- |
| Claimed | No valid evidence. |
| Practiced | At least one valid piece of evidence of any kind. |
| Verified | Valid evidence of **two different kinds** among Test, Review and Used. |
| Top-tier | Verified, plus at least one valid Top proof. Meant for one or two standout skills. |

Kinds of evidence:

| Kind | Meaning | Examples |
| --- | --- | --- |
| Built | Made something real with it, beyond a tutorial. Self-produced, so never enough alone for Verified. | A deployed app, a non-trivial repo |
| Test | A graded assessment the user does not control. Course-completion certificates that anyone can click through do **not** count. | İTÜ course grade, proctored certification, ranked timed contest |
| Review | Someone stronger reviewed the work and would sign off. | Senior code review, mock interview, maintainer merging a non-trivial PR |
| Used | Real users or a client relied on it. | Client project in production, an app with real users |
| Top | Compared against the best. | Teaching it (guide or talk others use), merged contribution to a well-known project, top-10% ranked result |

Expiry: for **tool** skills (React, FastAPI…), evidence older than **18 months** stops counting. **Fundamental** skills (data structures, OOP, computer architecture…) never expire.

---

## A. Proven Skills

### Problem

Today a skill's level (`learning` / `practicing` / `confident`) is set by hand, and the Skills screen says "Levels are self-assessed. Evidence is what makes them credible." That contradicts the user's standard: a level should be **earned from evidence and always explainable**, the same way goal progress is explained by criteria.

### Data model

**Evidence** (`packages/domain/src/evidence.ts`, `apps/api/src/db/schema/evidence.ts`):

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `'built' \| 'test' \| 'review' \| 'used' \| 'top' \| null` | New `EVIDENCE_KINDS` constant. `null` = recorded before kinds existed; treated as `built` and shown with a "Set the kind" prompt. |
| `by` | `string \| null` | Who graded, reviewed or used it ("İTÜ, BLG 527E", "Senior engineer at X", "Mawaheb, ~200 users"). **Required** when `kind` is test, review, used or top (service throws `InvalidInputError`). This is what stops a Review from being self-declared. |
| `result` | `string \| null` | Optional: grade, score, percentile, user count. |
| `courseId` | `EntityId \| null` | Optional link to an İTÜ course (see A.6). |

`date` stays optional in general but becomes **required** for test, review, used and top, since Verified depends on expiry.

**Skill** (`packages/domain/src/skill.ts`, `apps/api/src/db/schema/skills.ts`):

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `type` | `'tool' \| 'fundamental'` | `'tool'` | Controls expiry. |
| `focus` | `'core' \| 'standout' \| 'keep' \| 'parked'` | `'keep'` | Core = on the current path; standout = aiming for Top-tier (one or two); parked = kept but silenced in warnings. |
| `listed` | `boolean` | `false` | Shown publicly (portfolio, LinkedIn, CV). Drives the honesty warning. |
| `bar` | `string \| null` | `null` | What "Verified" means for this skill, in the user's words, set above what postings ask. |
| `level` | existing | — | **Deprecated, not removed.** Keep the column (no SQLite table rebuild, old backups restore). Stop editing it and stop requiring it on create. Show it read-only in the skill drawer as "Your rating before proof levels: Confident" while it is not null. |

`category` stays free text, with suggestions offered in the form (a `datalist`): **Foundations**, **Software engineering**, **AI engineering**, **Practices**. These are the user's skill layers.

`confidence` stays as the private 1–10 self-rating and is never mixed into the level.

### Derivation

A new pure module `apps/web/src/lib/skills.ts` with tests in `skills.test.ts`, following the "derive in `lib/`, don't store" convention in `docs/DEVELOPMENT.md`. If D is built later and the server needs it, move it to `packages/domain`.

```ts
type ProofLevel = 'claimed' | 'practiced' | 'verified' | 'top'

proofLevel(skill, evidence, today): {
  level: ProofLevel
  basis: Evidence[]      // the evidence that earns the level, for the "why" line
  expiring: Evidence[]   // valid now, expires within 60 days, and losing it lowers the level
  next: string | null    // the one missing step, in plain words
}
```

Rules:

1. Evidence is linked to the skill through `skillIds`.
2. Valid = for a `fundamental` skill, always; for a `tool` skill, `date` within the last 18 months (`EVIDENCE_VALID_MONTHS = 18`). **Undated evidence counts toward Practiced only**, never toward Verified or Top-tier.
3. `kind: null` counts as `built`.
4. Practiced = at least one valid entry. Verified = valid entries of at least two distinct kinds among test, review, used. Top-tier = Verified and at least one valid `top`.
5. `next` examples: Claimed → "Add something you built with it." Practiced → "Needs two of Test, Review, Used. Has: Review." Verified with focus `standout` → "Needs a Top proof." Otherwise `null`.

Use `lib/dates.ts` for all date maths (month arithmetic in the user's timezone).

Tests at minimum: no evidence; built only; test + review → verified; test + test → still practiced; tool evidence 19 months old does not count; fundamental evidence 5 years old counts; undated review does not count toward verified; top without verified stays verified-or-lower; `kind: null` acts as built; `expiring` lists only entries whose loss lowers the level.

### Screens

**Growth → Skills** (`apps/web/src/screens/Growth.tsx`):

- Columns: Skill (with layer), **Proof level** (four-step meter, replacing `LevelMeter`), **Proof** (small kind badges, e.g. `Test · Review`), Focus, Listed.
- Group rows by layer (`category`). Parked skills are collapsed behind "Show parked (n)".
- Sort within a group by proof level, then name.
- Banners, replacing the current "skills without evidence" banner:
  - **Honesty check** (warning tone): "You list 12 skills publicly; 9 are only Claimed: …". Counts `listed` skills at Claimed.
  - **Expiring** (info tone): "Proof for React expires in 40 days." From `expiring`, only for core, standout or listed skills.
- Footer text becomes: "Levels come from evidence. Confidence is your own rating."

**Skill drawer** (`SkillDrawer` in `apps/web/src/editors/growth.tsx`):

- Proof level and the **why** line: "Verified: Test (Mar 2027, İTÜ BLG 527E) + Review (Jan 2027, …)".
- **Next step** line from `next`, with a "Plan it" button that opens the task editor prefilled with a title such as "Get a Review for React". Tasks cannot link to skills; the user picks the goal.
- Editable: Bar (textarea), Type (segmented control), Focus (segmented control), Listed (switch).
- Confidence slider unchanged.
- Evidence list shows a kind badge, `by` and `result` on each entry, and "Set the kind" on entries where it's null.
- Remove the Level segmented control.

**New skill** (`SkillEditor`): name, layer (category with suggestions), type, focus. No level picker. `listed` defaults off.

**Evidence editor** (`EvidenceEditor`):

- Kind as a segmented control, with the one-line meaning under it.
- The `by` label changes with the kind: "Who graded it?" / "Who reviewed it?" / "Who used it?" / "Compared with whom?". Required for every kind except Built.
- `result` optional; date required except for Built.

### Notifications

Add to the `optional` category (`attention()` in `apps/web/src/lib/rules.ts`, `info` level): "Proof for X expires in N days", at 30 days, for core, standout or listed skills only. No other new notifications; the honesty check stays a banner on the page.

### API, validation, backups

- `packages/validation/src/skill.ts` and `evidence.ts`: add the fields, all `.strict()`. Remove `level` from the create and update schemas; the web app is the only client and ships together with the API.
- Evidence service: enforce `by` and `date` for test, review, used and top.
- Migration: `yarn workspace @hop/api db:generate --name proven-skills`. Only `ADD COLUMN`s. Read the SQL before committing.
- Backups (`packages/validation/src/backup.ts`, `apps/api/src/repositories/backup.repository.ts`): add the new columns with defaults (`type: 'tool'`, `focus: 'keep'`, `listed: false`, `bar: null`, `kind: null`, `by: null`, `result: null`, `courseId: null`) so **older backups still restore**. Make `level` optional in `skillRow`. Add a restore test using a backup without the new fields.

### A.6 Course grades as proof (same feature, last step)

The user is deepening computer engineering through the İTÜ MSc. A graded course is a Test that nobody can self-declare.

- On a course in İTÜ (`ItuCourse.tsx`), once `grade` is set, show "Add as proof". It opens the evidence editor prefilled with: kind `test`, `by` "İTÜ, <course code>", `result` = the grade, `date` = the term end, `courseId` set. The user picks the skills.
- Don't hardcode a minimum grade. What grade meets the bar is the user's call, written in the skill's `bar`.

### Docs to update

- `docs/HOP_PRODUCT_SPEC.md` §28–29 (Skills, Skill Evidence): replace the self-assessed level model with this one.
- `docs/DATABASE.md`, `docs/API.md`, and the Growth row in `README.md`.

### Acceptance

- A skill with no evidence shows Claimed, whatever its old level was. The old level is visible read-only in the drawer.
- Adding a Review (dated, with `by`) and a Test (dated, with `by`) to a tool skill makes it Verified, and the why line names both.
- The same Test dated 19 months ago leaves the tool skill at Practiced; on a fundamental skill it still counts.
- Marking 3 Claimed skills as listed shows the honesty banner naming them.
- A Review without `by` is rejected by the API with a clear message.
- A backup made before this change restores without errors.
- `yarn test` and `yarn typecheck` pass.

---

## B. Block-Day Next Step

### Problem

The user's model is "no deadlines, work in weekly blocks." But `todayPlan()` in `apps/web/src/lib/rules.ts` only includes tasks with `scheduledDate` or `dueDate` on or before today. **Undated tasks never appear on Today**, so on a block day Today shows a habit to tick and nothing to do in it. The only workaround is manually scheduling the next task each time.

### Design

- When a habit with a `goalId` is due today (`habitDue`) and not yet done, Today shows under that habit row: **"Next for <goal name>: <task title>"**, with **Start** (sets the task to `in_progress`) and **Skip** (shows the following one).
- The next task is the goal's highest-priority open task, then the earliest `scheduledDate`, then the oldest `createdAt`. Pure function `nextForGoal(goalId, tasks)` in `lib/rules.ts`, with tests.
- It does not enter the Musts or Shoulds and does not change "One next action". It is a suggestion inside the habit, so Turkish stays first on the screen.
- Nothing is shown when the goal has no open tasks. Goal health already flags "No next action" on the Goals screen.

### Acceptance

- Habit "Profile & skills block" linked to goal G, due today, with two undated open tasks under G: Today shows the higher-priority one under the habit; Skip shows the other.
- A habit with no goal, or with its goal's tasks all done, shows nothing extra.
- Today's Musts, Shoulds and next action are unchanged.

---

## C. Market Check

**Do not build until the user has done one sample by hand** (collect ~20 postings for the path and count how often each skill appears). That first run answers the open questions below, and the feature should copy what the user actually did.

### Purpose

This puts the user's rule into practice: **"pick the path from the market at a set moment, set my own bar, then ignore trends until the next moment."** It has two parts: a dated sample of postings that shows the gap against the user's skills, and a fixed **window** (default every 6 months) where trends that piled up in Radar get decided.

### Sketch

- `market_checks`: `id`, `date`, `path` (e.g. "AI engineer, full-stack TypeScript base"), `notes`, timestamps.
- `market_postings`: `id`, `checkId`, `title`, `organization`, `url`, `type` (reuse `OPPORTUNITY_TYPES`), `location`, `skills` (string list), timestamps.
- View (a Growth tab or a section in Skills): one row per skill name, showing **share of postings asking for it**, the user's proof level and focus, and a change since the last check. Flags:
  - Asked in ≥50% of postings and not `core` → "Consider adding it to the path."
  - `core` and asked in <10% → "Still worth it?"
- The window also lists **Radar finds saved since the last check** that are still in the inbox or kept, so trend decisions happen at the window, not day to day. Radar becomes the trend quarantine.
- A posting can be turned into a Career opportunity in one click, if the user wants to apply.
- Setting `marketCheckEveryMonths` (default 6) produces an `important` notification when a check is due. This avoids needing recurring tasks.

### Open questions (answer after the manual run)

- Tag skills per posting, or only keep the counts?
- Match skill names to Hop skills exactly, or through aliases ("TS" = "TypeScript")?
- Does location matter (Istanbul vs remote vs EU)?

---

## D. Portfolio Export

**Maybe, in 2027**, and only if the user keeps nhussein.io updated regularly.

- A manual **Download portfolio.json** in Settings → Backup and export: listed skills with proof level, `by`/`result` of public-safe evidence, and **featured** projects (new `featured` boolean on Project) with blurb, stack, repo, demo, dates and `learned`.
- The portfolio repo (`/mnt/data/code/personal/Nhussein-io`, React) reads the committed file at build time. **No public endpoint**: Hop stays private.
- Journey cards for non-featured repos stay in the repos' own READMEs and GitHub descriptions/topics. The portfolio can read **public** repos from the GitHub API at build time without a token.
- Possible Project fields if this is built: `openSource` (boolean), `context` ("My first React app"), `differentlyNow` ("What I'd do differently now").

---

## Not Building

Decided against in the planning chat. Don't re-propose these without a new reason.

| Idea | Why not |
| --- | --- |
| GitHub sync or a GitHub token in Hop | The user reviews repos by hand. GitHub itself (README, description, topics, visibility, archive) is the record. A token would make GitHub Hop's first outside service, against "no third-party services". |
| A repo inventory inside Hop (115 rows) | A one-time job. Hop tracks it as a few batch tasks under the profile goal; the decisions live on GitHub. |
| A "profile kit" for the bio, headline and About text | A single pinned note does it. |
| Recurring tasks, for this plan | A real gap in Hop, but this plan doesn't need it: blocks are a habit (B) and market checks get their own due rule (C). Revisit when another plan needs it. |
| Numeric skill scores or points | Not explainable. Levels must always be traceable to named evidence. |

---

## Implementation Notes (2026-10-22)

What the implementation chat decided where this proposal was silent or couldn't be followed as written.

| Topic | Decision | Why |
| --- | --- | --- |
| Old `level` | The `skills` table is rebuilt so `level` can be null; skills added from now on have none. | The column was NOT NULL, so "show it while it is not null" was impossible without a rebuild. The user chose the rebuild. Every row is copied; old backups restore. |
| Reading a book | A sixth kind, **Learned** (book, course, tutorial). It is kept in a skill's history but never counts toward a level. Finishing a book records it as Learned, and the migration turns earlier "Read “…”" entries into Learned. | Counting a book as Built would make a skill Practised from reading alone. The user chose the new kind. |
| New evidence | Needs a kind (API and editor). Only entries from before kinds existed lack one. | `null` is reserved for "recorded before kinds existed". |
| Editing evidence | Evidence can be edited from the skill drawer and the Evidence tab. There is still no delete. | "Set the kind" needs an editor. |
| Expiry notification | Added in `notificationsFor()`, not `attention()`. | `attention()` also fills Today's "Needs attention", and this plan must not crowd Today. It stays in the notifications panel, optional category. |
| Expiry boundary | Proof of a tool stops counting on the same day 18 months after its date. Evidence dated in the future doesn't count yet, and the editor refuses future dates. | |
| Course proof | Completing a course offers "Next, add the grade as proof", which opens the evidence editor pre-filled; the course page shows **Add as proof**, then **Edit proof** once it exists. `by` is "İTÜ BLG 527E" (no comma) so the why line reads cleanly. Failed grades (FF, VF) aren't offered. | The old "Add to Evidence" box created a kind-less entry with no skills, which proves nothing. |
| Column name | `by` is stored in the `by_whom` column. | BY is an SQL keyword. |
| Block-day step | **Start** sets the task in progress, which then offers **Done**. **Skip** uses Today's "Not now" list for the session and wraps around after the last task. | The proposal didn't say how a started task gets finished from Today. |

Found while testing, not changed yet: a skill's name and layer can't be edited after it is created (the drawer never had that), the parked table's columns don't line up with the main table, a skill takes five lines on a phone, and the six kinds wrap unevenly on a phone.
