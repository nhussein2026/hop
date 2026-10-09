# Hop 🐸 — Personal Growth & Career OS

> **Small actions. Real progress. Bigger leaps.**

**Product specification, product vision, UX blueprint, architecture guide, and development source of truth**

Version: 2.0 Concept / Development Blueprint  
Audience: Single primary user (private personal use)  
Status: Product direction approved for implementation

---

## 1. What Hop Is

Hop is a **private personal operating system for growth and career management**.

It helps one person turn long-term ambitions into concrete daily actions, while keeping a connected history of:

- goals
- habits
- tasks
- projects
- skills
- career opportunities
- contacts
- resumes
- evidence of achievement
- events and deadlines
- reflections and reviews

The product is intentionally personal rather than social. It should help the user answer five questions quickly:

1. **What matters today?**
2. **What am I trying to become?**
3. **What am I actively pursuing?**
4. **Am I actually making progress?**
5. **What should I change next?**

Hop should not become another general-purpose notes application, project-management suite, or social platform. Its purpose is to make personal progress easier to understand and easier to execute.

---

## 2. Product Positioning

### Primary positioning

> **Hop is a private personal Growth & Career OS that connects goals, daily actions, learning, projects, and career opportunities into one simple system.**

### Secondary positioning

> A calm, focused place to plan today, build your future, manage your career, and review your progress.

### The product is NOT primarily

- a job board
- a CRM for sales teams
- a public portfolio platform
- a social network
- a generic notes application
- a full project-management replacement
- a habit-streak game
- an AI chatbot with a few productivity screens around it

---

## 3. Product Philosophy

Hop should be built around six principles.

### 3.1 Clarity over complexity

The system should make priorities obvious instead of displaying everything at once.

### 3.2 Action over documentation

Tracking exists to help the user act. Data collection is not the goal.

### 3.3 Progress over streaks

Consistency matters, but opening the app is not the same as improving. Meaningful work should matter more than a visit counter.

### 3.4 Private by default

Career information, contacts, notes, reflections, goals, and personal planning are private data. The architecture should minimize external services and unnecessary data transmission.

### 3.5 One source of truth

All devices should interact with one authoritative dataset rather than maintaining independent local copies that need manual merging.

### 3.6 Small enough to maintain

Hop is a personal tool. It should remain understandable to its owner. Avoid architecture that requires a large team merely to maintain the application.

---

# 4. The Core Mental Model

Hop should use a small set of clearly separated concepts.

## 4.1 Area

A broad part of life that requires ongoing attention.

Examples:

- Career
- Learning
- Projects
- Personal
- Health
- Finances
- Relationships
- Administration

Areas are continuous. They normally do not get “completed.”

---

## 4.2 Goal

A meaningful destination the user wants to reach.

Examples:

- Become an AI engineer
- Master system design
- Get a software engineering role
- Build a production-ready product

A goal should answer **where am I going and why?**

---

## 4.3 Project

A finite body of work that produces an outcome.

Examples:

- Build Hop
- Create an NLP application
- Build a SaaS MVP
- Complete a portfolio website

A project should answer **what am I building or completing?**

---

## 4.4 Skill

A capability the user is developing or maintaining.

Examples:

- TypeScript
- React
- Python
- System Design
- Machine Learning
- Communication

A skill should ideally have evidence behind it instead of being just a self-declared label.

---

## 4.5 Habit

A repeated behavior that supports a goal or area.

Examples:

- Study AI for 45 minutes
- Solve 2 DSA problems
- Read 20 pages
- Review goals each Sunday

A habit answers **what should I repeatedly do?**

---

## 4.6 Task

A concrete action that can be completed.

Examples:

- Practice binary search
- Apply to Company X
- Update resume version 3
- Write authentication tests

A task answers **what exactly do I need to do?**

---

## 4.7 Event

Something that happens at a particular time.

Examples:

- Technical interview
- Application deadline
- Conference
- Weekly review

An event answers **when does something happen?**

---

## 4.8 Opportunity

Something the user is pursuing or considering.

Examples:

- Job
- Internship
- Scholarship
- Fellowship
- Hackathon
- Conference
- Open-source program

Opportunity is broader than “application.” The item can exist before applying.

---

## 4.9 Evidence

Proof that progress or capability exists.

Examples:

- Shipped a production feature
- Built and deployed a project
- Completed a certification
- Solved 200 DSA problems
- Received positive interview feedback
- Contributed to an open-source project

Evidence should be linkable to goals, projects, skills, opportunities, and resumes.

---

## 4.10 Milestone

A meaningful checkpoint in a goal, project, or career journey.

Examples:

- Completed ML fundamentals
- Finished internship
- First production deployment
- Received an interview invitation

---

## 4.11 Reflection / Review

A deliberate record of what happened, what was learned, and what should change.

Daily reflection is lightweight. Weekly and monthly reviews are more structured.

---

# 5. The Most Important Product Loop

Hop is built around this loop:

```text
OPEN
  ↓
SEE WHAT MATTERS
  ↓
ACT
  ↓
RECORD PROGRESS / EVIDENCE
  ↓
REFLECT
  ↓
ADJUST
  ↓
ACT AGAIN
```

The system should reduce the gap between intention and action.

A second loop operates over longer periods:

```text
GOAL
  ↓
PROJECTS / SKILLS / HABITS
  ↓
TASKS
  ↓
DAILY ACTION
  ↓
EVIDENCE
  ↓
REVIEW
  ↓
BETTER DECISIONS
```

This is more important than any individual feature.

---

# 6. North-Star User Experience

The primary experience is the **Today** view.

Example:

```text
Good morning
Sunday · September 13

TODAY'S PRIORITIES

1. Prepare for Tuesday's technical interview
2. Study machine learning — 45 min
3. Finish authentication feature

NEEDS ATTENTION

• Application deadline tomorrow
• Follow-up overdue by 2 days
• Interview Tuesday at 14:00

GOALS

AI Engineer          ████████░░ 78%
System Design        ██████░░░░ 61%

TODAY'S PROGRESS

✓ 2 habits completed
✓ 1 application submitted
✓ 45 min learning

EVENING REFLECTION

What did you accomplish today?
[ Add reflection ]
```

The Today screen should feel calm and actionable, not like an analytics dashboard.

---

# 7. Navigation

Recommended top-level navigation:

```text
Today
Plan
Goals
Career
Growth
Review
```

### Today

The current operating screen.

Contains:

- today's priorities
- relevant habits
- important deadlines
- upcoming events
- overdue follow-ups
- lightweight progress summary
- quick capture

### Plan

Everything related to scheduling and execution.

Contains:

- tasks
- calendar
- recurring habits
- events

### Goals

Long-term direction.

Contains:

- active goals
- goal progress
- milestones
- linked projects
- linked habits
- linked skills

### Career

Career pipeline and professional relationships.

Contains:

- opportunities
- people
- resumes
- follow-ups
- career analytics

### Growth

Development and evidence.

Contains:

- skills
- projects
- evidence
- milestones

### Review

Reflection and decision support.

Contains:

- daily reflections
- weekly reviews
- monthly reviews
- trends
- insights

---

# 8. Why Some Existing Screens Move

The original application exposes Today, Goals, Hops, Growth, Calendar, Leaps, and People as separate primary views.

That is a reasonable first version, but the concepts can be grouped more naturally.

| Existing concept | New location |
|---|---|
| Today | Today |
| Goals | Goals |
| Hops | Career → Opportunities |
| Growth | Growth |
| Calendar | Plan → Calendar |
| Leaps | Career → Analytics |
| People | Career → People |

The purpose is to reduce top-level cognitive load.

---

# 9. Today's Screen — Detailed Specification

Today should answer: **“What deserves my attention right now?”**

## 9.1 Header

Display:

- date
- personalized greeting
- optional small momentum/consistency indicator
- notifications indicator
- quick-add button

Do not make an app-open streak the central metric.

---

## 9.2 Today's Priorities

A small, intentional set of high-value items.

Target:

- 1–3 top priorities
- optionally a few supporting tasks

Priority items can originate from:

- goals
- projects
- career opportunities
- manually scheduled tasks

The system should not automatically fill the day with dozens of items.

---

## 9.3 Today's Habits

Show only habits scheduled for today.

A habit can be marked complete quickly.

A completion should record an actual completion date/time rather than simply toggling a boolean forever.

---

## 9.4 Needs Attention

Surface only things that actually require action:

- deadline approaching
- interview soon
- assessment soon
- offer awaiting response
- overdue follow-up
- task overdue
- goal falling behind

Avoid notification noise.

---

## 9.5 Upcoming

Show a compact horizon such as the next 7–14 days.

Use clear labels:

- deadline
- interview
- event
- review
- important task

---

## 9.6 Progress

Optional lightweight metrics:

- tasks completed today
- habits completed
- learning time
- meaningful actions

Avoid turning Today into a statistics page.

---

## 9.7 Reflection

At the end of the day offer a lightweight reflection:

- What did you accomplish?
- What did you learn?
- What should happen tomorrow?

Keep it optional and fast.

---

# 10. Quick Add

A persistent `+` action should allow creation of:

```text
Task
Goal
Opportunity
Event
Note / Reflection
Milestone
Project
Evidence
```

The user should be able to capture something in seconds without navigating through multiple pages first.

---

# 11. Goals

Goals are one of the central concepts in Hop.

## Goal fields

Recommended model:

```text
id
name
why
areaId
status
priority
startDate
targetDate
successCriteria
progress
createdAt
updatedAt
archivedAt
```

### Goal status

```text
active
paused
achieved
abandoned
archived
```

---

## 11.1 Goal Detail

A goal page should show:

### Outcome

What success looks like.

### Why

Why the goal matters.

### Progress

A meaningful progress indicator.

### Success Criteria

Concrete conditions for completion.

### Milestones

Major checkpoints.

### Habits

Repeated behaviors supporting the goal.

### Tasks

Current actions.

### Projects

Projects contributing to the goal.

### Skills

Capabilities needed for the goal.

### Evidence

Proof of progress.

### Review history

How progress has changed over time.

---

# 12. Goal Example

```text
Goal: Become a strong AI engineer

Why:
I want to build useful AI systems professionally.

Target:
June 2027

Success criteria:
- Strong Python
- ML fundamentals
- Deep learning fundamentals
- NLP
- LLM application development
- 3 serious AI projects
- Deployable portfolio
- Relevant professional experience

Habits:
- Study AI 60 minutes/day
- Solve 2 algorithm problems 3x/week

Milestones:
- Python fundamentals
- Mathematics
- ML fundamentals
- Deep learning
- NLP
- LLM applications

Projects:
- NLP application
- AI research tool

Skills:
- Python
- PyTorch
- NLP
- Machine Learning
```

---

# 13. Habits

Habits should be supporting structures, not the whole product.

Each habit should include:

```text
id
title
goalId
areaId
frequency
startDate
endDate
estimatedDuration
active
createdAt
```

Completion data should be separate:

```text
habitId
date
completedAt
note
```

This gives better analytics than storing a simple array of dates.

---

# 14. Streaks and Consistency

The original app has two streak types:

1. Header “showing up” streak.
2. Per-goal habit streak.

The second remains useful. The first should be reduced or removed as a primary concept.

## Why

Opening the app is not meaningful progress.

A user can have a 100-day app-opening streak and accomplish nothing.

Instead, emphasize:

- meaningful days
- completed habits
- tasks completed
- learning time
- milestones
- goal movement

Streaks may still exist as optional motivational signals, but they should never dominate the product.

---

# 15. Tasks

Tasks unify the execution layer.

A task can belong to:

- an area
- a goal
- a project
- an opportunity
- a review

Recommended fields:

```text
id
title
description
status
priority
areaId
goalId
projectId
opportunityId
scheduledDate
dueDate
estimatedMinutes
actualMinutes
recurrenceId
completedAt
createdAt
updatedAt
```

## Task status

```text
inbox
scheduled
in_progress
completed
cancelled
```

The user should be able to see tasks by:

- today
- upcoming
- overdue
- project
- goal
- area

---

# 16. Tasks vs Goals vs Habits vs Events

Do not merge these concepts.

| Concept | Meaning | Example |
|---|---|---|
| Goal | Destination | Become an AI engineer |
| Project | Finite outcome | Build NLP app |
| Task | Concrete action | Implement tokenizer |
| Habit | Repeated behavior | Study 45 min daily |
| Event | Time-specific occurrence | Interview Tuesday |
| Opportunity | Thing being pursued | AI internship |
| Milestone | Meaningful checkpoint | Finished ML fundamentals |
| Evidence | Proof | Deployed AI project |

This separation is fundamental to maintaining a clean domain model.

---

# 17. Career / Opportunities

The original “Hops” concept remains valuable, but it should become a professional opportunity pipeline inside Career.

## Opportunity types

Examples:

- job
- internship
- program
- scholarship
- fellowship
- hackathon
- conference
- open-source program
- other

The model should allow future custom types without forcing them into the database schema.

---

# 18. Opportunity Pipeline

Recommended lifecycle:

```text
Saved
  ↓
Interested
  ↓
Preparing
  ↓
Applied
  ↓
Screening
  ↓
Interview
  ↓
Assessment
  ↓
Final
  ↓
Offer
```

Terminal states:

```text
Rejected
Withdrawn
Expired
Accepted
Declined
```

The system should support moving backwards or manually correcting a stage because real processes are not always linear.

---

# 19. Opportunity Data Model

Recommended fields:

```text
id
title
organization
url
type
stage
priority
location
remote
source
openDate
deadline
appliedDate
decisionDate
nextEventDate
nextEventLabel
compensation
technologyTags
resumeId
coverLetterId
notes
createdAt
updatedAt
closedAt
```

Do not force every opportunity to use every field.

---

# 20. Opportunity Timeline

Every opportunity should have an activity timeline.

Example:

```text
Sep 13
Updated resume

Sep 12
Applied

Sep 10
Recruiter replied

Sep 08
Opportunity created
```

Potential event types:

- created
- stage_changed
- note_added
- email_received
- call
- interview_scheduled
- assessment_received
- application_submitted
- follow_up_sent
- offer_received
- rejection_received
- resume_changed
- custom

This timeline is more important than a single large notes field.

---

# 21. Opportunity Detail Page

Recommended sections:

```text
Role / Company
Status
Next Action
Timeline
People
Preparation
Documents
Notes
Skills
Tasks
Events
```

Example:

```text
Company X
Software Engineer
Remote
Priority: High

STATUS
Interview

NEXT ACTION
Prepare system-design topics
Due tomorrow

TIMELINE
Application submitted
Recruiter response
Interview scheduled

PEOPLE
Jane — Technical Recruiter

PREPARATION
✓ Company research
✓ Resume review
□ System design
□ Coding practice

DOCUMENTS
Resume v3
Cover Letter v2

NOTES
...
```

---

# 22. Follow-Ups

Follow-ups should be based on meaningful inactivity, not just a fixed timer.

Initial simple rule:

```text
Active opportunity
+ no meaningful activity for N days
+ not in a terminal state
= follow-up reminder
```

Default could begin at 10 days, but the value must be configurable.

Later, different opportunity types or stages can use different thresholds.

Example:

```text
Recruiter conversation → shorter follow-up window
Application awaiting response → longer window
Scheduled interview → no follow-up warning
Offer → urgent response task
```

---

# 23. Career Analytics

The existing funnel analytics concept should remain, but it belongs under Career rather than as a top-level tab.

Basic metrics:

```text
Applications
Response rate
Interview rate
Assessment rate
Offer rate
Acceptance rate
```

Breakdowns:

- month
- role type
- opportunity source
- company type
- location/remote
- resume version
- technology

Avoid vanity metrics that do not influence decisions.

---

# 24. Resumes

Resume management should become first-class.

## Resume model

```text
id
name
version
filePath
focus
notes
createdAt
archivedAt
```

Example:

```text
v1 — General Software Engineer
v2 — Frontend Focused
v3 — AI / ML Focused
v4 — Full Stack Focused
```

Each opportunity should record which resume version was used.

This makes later analysis possible:

```text
Resume v3
Applications: 22
Responses: 8
Interviews: 4
Offers: 1
```

These statistics should be treated as decision-support data, not as guaranteed causal evidence.

---

# 25. People / Career Relationships

People should be simple but useful.

A contact may be:

- recruiter
- hiring manager
- colleague
- referral
- mentor
- interviewer
- community contact
- other

Recommended fields:

```text
id
name
role
organization
email
phone
linkedin
website
notes
createdAt
updatedAt
```

---

# 26. Contact Interactions

Do not stop at contact information.

Add interaction history:

```text
contactId
date
type
summary
opportunityId
nextAction
```

Interaction types:

- email
- message
- call
- meeting
- interview
- referral
- other

This turns People into a lightweight personal career CRM without becoming a sales CRM.

---

# 27. Growth

Growth contains:

- skills
- projects
- evidence
- milestones

The purpose is to make professional development visible and reusable for future opportunities.

---

# 28. Skills

The original levels were:

```text
Learning
Practicing
Confident
```

Keep a simple proficiency model, but add evidence.

Recommended fields:

```text
id
name
category
level
confidence
lastPracticedAt
yearsExperience
notes
createdAt
updatedAt
```

Example:

```text
TypeScript
Level: Practicing
Confidence: 7/10

Evidence:
- Production web project
- Hop
- Veribir work
```

Confidence is optional and should not be mistaken for objective proficiency.

---

# 29. Skill Evidence

Evidence connects skills to reality.

Example:

```text
Skill: TypeScript

Evidence:
- Built API in TypeScript
- Implemented typed state layer
- Reviewed production code
- Built reusable generic components
```

Recommended model:

```text
id
skillId
title
description
projectId
opportunityId
goalId
url
date
```

---

# 30. Projects

Projects should capture both output and learning.

Recommended fields:

```text
id
name
problem
blurb
status
startDate
endDate
stack
repositoryUrl
demoUrl
learned
challenges
architectureNotes
goalIds
skillIds
createdAt
updatedAt
```

Project status:

```text
planned
building
deployed
paused
archived
```

---

# 31. Project Page

Recommended sections:

```text
Problem
Outcome
Status
Tech stack
Timeline
Repository
Demo
Skills developed
What I learned
Challenges
Architecture notes
Evidence
Related goals
```

Projects should become career evidence, not merely a list of links.

---

# 32. Evidence

Evidence is one of the most important additions to the system.

Examples:

- shipped a production feature
- completed a certification
- built and deployed a project
- passed a technical interview
- solved 200 DSA problems
- completed an internship
- received positive feedback
- contributed to open source

Evidence can connect to:

- goal
- skill
- project
- opportunity
- resume

This creates a reusable career history.

---

# 33. Milestones

Milestones are dated accomplishments or checkpoints.

Examples:

```text
Aug 15 — Completed React certification
Aug 28 — Deployed project
Sep 02 — First technical interview
Sep 10 — Finished ML fundamentals
```

Milestones should be lightweight.

They should not become a second task system.

---

# 34. Plan / Calendar

Calendar should combine important dates from the rest of Hop.

Display:

- tasks
- deadlines
- interviews
- assessments
- application events
- milestones
- habits
- reviews
- custom events

Views can include:

- agenda
- week
- month

The first implementation can start with a strong agenda/timeline rather than a complex calendar UI.

---

# 35. External Calendar Integration

Implement **ICS export/feed first**.

This keeps the architecture simple and makes Hop useful with existing calendars.

Later, optional integrations may support:

- Google Calendar
- Outlook Calendar

Do not require OAuth integrations for the core product.

---

# 36. Reflection and Journal

Hop should contain lightweight journaling, not a full note-taking system.

## Daily reflection

```text
What did I accomplish?

What did I learn?

What went badly?

What should I do tomorrow?

Optional:
Energy 1–5
Focus 1–5
```

Do not require long entries.

The system should encourage honesty and usefulness rather than quantity.

---

# 37. Weekly Review

Weekly review should be one of the most important long-term features.

Suggested template:

```text
WEEKLY REVIEW

Wins

What went well?

Progress

Which goals moved?

Career

Applications
Responses
Interviews
Offers

Learning

Time invested
Skills practiced

Projects

What shipped?

Problems

What blocked me?

Next week

Top 3 priorities
```

Target completion time: approximately 10 minutes.

---

# 38. Monthly Review

A monthly review can summarize:

- goal movement
- meaningful work days
- learning time
- projects completed
- opportunities pursued
- career conversion trends
- important milestones
- neglected areas

The output should support decisions rather than merely provide charts.

---

# 39. Review Philosophy

The review system should help answer:

> What should I continue?
>
> What should I stop?
>
> What should I change?
>
> What matters next?

This is more valuable than simply telling the user how many tasks they completed.

---

# 40. Notifications and Reminders

Notifications are useful only when they lead to a meaningful action.

Good examples:

- Interview tomorrow at 14:00.
- Application deadline tomorrow.
- Follow-up overdue by 3 days.
- Weekly review is due.
- Offer requires a response.

Avoid guilt-based notifications:

- You did not open Hop today.
- Your streak is dying.
- You failed your goal.

The product should support the user, not pressure them.

---

# 41. Browser Extension / Web Clipper

A browser extension is a high-value later feature.

Core interaction:

```text
Job page
  ↓
Save to Hop
  ↓
Extract basic fields
  ↓
Review
  ↓
Create Opportunity
```

Capture initially:

- title
- organization
- location
- URL
- remote status when detectable
- visible job description
- detected technology terms

This feature should not be part of the first core rebuild.

---

# 42. Job Description Intelligence

Later, allow a user to paste a job description.

Hop can extract:

### Required skills

### Nice-to-have skills

### Keywords

### Potential responsibilities

Then compare with the user's skills/evidence.

Example:

```text
JOB MATCH

Strong match
TypeScript
Node.js
Docker

Needs development
PostgreSQL
Redis

Estimated alignment
78%
```

This number should be presented as an estimate, not a hiring prediction.

---

# 43. AI Layer

AI should be a **later layer**, not the foundation.

Possible capabilities:

- analyze a job description
- identify skill gaps
- suggest a learning plan
- suggest next action
- draft follow-up messages
- summarize weekly reviews
- summarize career history
- identify recurring bottlenecks
- answer questions about the user's own data

Examples:

> What should I focus on today?

> Which goals are currently falling behind?

> What skills appear most often in the jobs I'm targeting?

> Draft a polite follow-up for this recruiter.

> Summarize my progress this month.

The AI layer should query structured application data rather than replace the application's domain model.

---

# 44. Mobile / PWA Requirements

Mobile use is a first-class requirement, not an afterthought.

Target experiences:

- phone
- laptop
- lab/workstation
- desktop

The app should be responsive at minimum around:

```text
390px
768px
1280px+
```

## Mobile priorities

- large touch targets
- simple forms
- bottom navigation
- sticky primary actions where useful
- fast quick-add
- compact cards
- readable typography
- minimal modal complexity
- no hover-dependent functionality

---

# 45. PWA Requirements

Hop should eventually be installable as a Progressive Web App.

Required capabilities:

- web manifest
- application icon
- standalone mode
- service worker
- cached application shell
- offline-friendly read experience
- clear online/offline state
- installable on supported devices

Offline data mutation must be designed explicitly. Do not claim full offline synchronization until a reliable conflict strategy exists.

---

# 46. Multi-Device Architecture

The original application stores JSON locally and can be manually copied or synced. That is excellent for a prototype, but it is not the right long-term multi-device model.

The target model is:

```text
Phone
   │
Laptop ───┐
          │
Lab PC ───┼── Private Network ── Hop Server ── SQLite
          │
Desktop ──┘
```

One authoritative server/database should handle synchronization.

Do **not** use a cloud-synced folder as the primary database synchronization mechanism.

---

# 47. Private Access

The first deployment target should be a private network rather than a public internet service.

A suitable model is:

```text
Trusted Device
      ↓
Private Network
      ↓
Hop Server
      ↓
SQLite
```

Tailscale or another private-network layer can be used as the access mechanism.

The product should not require public hosting.

---

# 48. Authentication and Security

Even for a single-user application, the server should have authentication when accessed over a network.

Requirements:

- password authentication or another strong local identity mechanism
- secure sessions
- secure cookies where applicable
- HTTPS when required by the deployment environment
- input validation
- authorization checks
- safe error handling
- rate limiting where applicable
- no secrets in source control
- no sensitive information in logs
- protected database path
- protected backup files
- safe attachment handling

Never expose the SQLite database or application data directory as public static files.

---

# 49. Privacy Model

The default philosophy is:

```text
Private
Self-hosted
Minimal external services
No tracking
No advertising
No public profile
No unnecessary analytics collection
```

External integrations must be opt-in.

The user should be able to understand where their data is stored and how it moves.

---

# 50. Database Direction

The current prototype uses several JSON files as its source of truth.

That is a good prototype decision because the data is transparent and portable, and the current system already uses atomic file writes. The original project also supports export/import and manual data management.

For Hop 2.0, migrate toward **SQLite** because relationships and multi-device access become more important.

Recommended database structure:

```text
areas
goals
goal_milestones
goal_habits
habit_completions

tasks
recurrences

events

opportunities
opportunity_events
opportunity_tasks

contacts
contact_interactions

resumes
documents

skills
skill_evidence
projects
milestones
evidence

journal_entries
weekly_reviews
monthly_reviews

notifications
settings
activity_log
```

The exact schema can evolve during implementation, but the domain separation should remain.

---

# 51. Recommended Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide icons
- PWA support

## Backend

- Node.js
- TypeScript
- small REST API

The backend does not need to become a large enterprise framework.

## Database

- SQLite

## Database layer

- Drizzle or another lightweight strongly typed option

## Validation

- Zod or equivalent schema validation

## Deployment

- Docker
- private server / trusted machine
- private network access

The stack should remain small enough for one developer to understand and maintain.

---

# 52. Recommended Repository Structure

```text
hop/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── public/
│   │
│   └── api/
│       └── src/
│           ├── routes/
│           ├── services/
│           ├── db/
│           ├── middleware/
│           └── lib/
│
├── packages/
│   ├── types/
│   └── validation/
│
├── migrations/
├── backups/
├── docs/
├── docker/
├── scripts/
└── README.md
```

Do not split into a huge number of packages prematurely. The structure should support maintainability without creating artificial complexity.

---

# 53. Frontend Architecture Principles

Use feature-oriented organization rather than placing everything into generic folders.

Examples:

```text
features/
├── today/
├── tasks/
├── goals/
├── career/
├── growth/
├── calendar/
└── reviews/
```

Shared components belong in `components/` only when genuinely shared.

Avoid creating a generic abstraction for every small UI element.

Prefer explicit, strongly typed code.

Avoid `any` when a real domain type exists.

---

# 54. Backend Architecture Principles

Keep responsibilities separated:

```text
HTTP route
   ↓
Validation
   ↓
Service / domain logic
   ↓
Database access
```

Do not put business rules directly into route handlers.

Examples of domain rules:

- when a follow-up becomes overdue
- how an opportunity stage changes
- what counts as a goal completion
- how task recurrence generates occurrences
- what happens when an opportunity is archived

These rules should be testable independently.

---

# 55. Validation and Migrations

Every persisted entity should be validated.

Requirements:

- validate API input
- validate data before writing
- provide useful error messages
- use database constraints where appropriate
- maintain explicit migrations
- safely evolve existing user data

Never assume existing production data will always have the latest schema.

A migration system should exist before making major database changes.

---

# 56. Data Safety

Backups are a first-class product feature.

Recommended strategy:

```text
SQLite database
      │
      ├── automatic daily backup
      ├── retained weekly backups
      └── manual export
```

Manual export should remain available.

Export should create a portable snapshot suitable for migration or disaster recovery.

---

# 57. Export / Import

The current application already provides export/import as a basic portability mechanism. Hop 2.0 should retain this capability.

Export should ideally produce a package like:

```text
hop-export-YYYY-MM-DD.zip
├── database.sqlite
├── attachments/
└── README.txt
```

Import must:

1. validate the archive
2. validate schema/version
3. create a safety backup
4. preview what will change
5. require explicit confirmation
6. apply the import transactionally where possible

Never silently overwrite important data.

---

# 58. Attachments / Documents

Eventually support files such as:

- resumes
- cover letters
- certificates
- interview notes
- project documents

Store files outside the relational tables and keep metadata in the database.

Example metadata:

```text
id
filename
mimeType
size
storagePath
entityType
entityId
createdAt
```

The actual storage mechanism can remain local to the server.

---

# 59. Accessibility Requirements

Accessibility is a product requirement.

Use:

- semantic HTML
- real labels
- keyboard navigation
- visible focus styles
- sufficient contrast
- accessible dialogs
- meaningful headings
- screen-reader-friendly buttons
- reduced motion support
- touch-friendly targets
- clear validation and errors

Do not rely on color alone to communicate status.

For example:

```text
🔴 Urgent
High priority
```

rather than only making a badge red.

---

# 60. Visual Design Direction

The visual style should be:

**clean, calm, professional, slightly warm, lightly playful.**

Reference direction:

- modern productivity tools
- developer tools
- minimalist personal software

Avoid:

- excessive cards
- excessive gradients
- cartoon-heavy UI
- constant animations
- giant dashboards
- too many accent colors
- gamification everywhere

The frog / pond identity should remain a subtle signature.

Use it for:

- logo
- empty states
- occasional illustrations
- celebrations
- small brand details

Not for every screen and every interaction.

---

# 61. Design Tokens

Use semantic tokens rather than hard-coding meaning into specific colors.

```css
--background
--surface
--surface-raised
--border
--text
--text-muted

--primary
--primary-hover

--success
--warning
--danger
--info

--focus
```

Support:

- light mode
- dark mode
- system preference

Typography should prioritize readability over branding.

---

# 62. Interaction Principles

The UI should prefer:

- one-tap completion
- inline editing where appropriate
- sensible keyboard shortcuts on desktop
- short forms
- progressive disclosure
- confirmation only for destructive actions
- undo where practical
- immediate visual feedback

Do not force the user through multi-step dialogs for simple actions.

---

# 63. Search

Search should eventually cover:

- opportunities
- people
- projects
- skills
- goals
- evidence
- notes

A global search command can become a high-value later feature.

Example:

```text
Search Hop...

> TypeScript
```

Results:

- TypeScript skill
- 8 opportunities
- 4 projects
- 3 evidence entries
- 2 notes

---

# 64. Dashboard Metrics

Metrics should be decision-oriented.

Useful examples:

```text
Active opportunities
Upcoming interviews
Overdue follow-ups
Learning time
Goals progressing
Projects active
Meaningful work days
```

Avoid vanity metrics such as:

- number of times app opened
- total notes
- number of cards created
- arbitrary “productivity score”

Never invent a score unless its calculation is meaningful and transparent.

---

# 65. “Momentum” Instead of “Productivity Score”

Hop may eventually show a lightweight momentum indicator based on recent meaningful activity.

Possible inputs:

- completed important tasks
- habit consistency
- goal movement
- learning time
- milestones
- career activity

It should be explainable.

Do not produce an opaque “82/100 productivity” score.

---

# 66. Multiple Goals

The system must technically support multiple goals.

However, the UX should encourage focus.

Recommended guidance:

> Keep 1–3 major goals active at a time unless there is a strong reason to have more.

The application should not prevent additional goals, but it should make overload visible.

For example:

```text
You currently have 8 active major goals.
Consider reviewing your priorities.
```

This is advisory, not punitive.

---

# 67. Goal Health

Eventually each goal can show:

```text
On track
Needs attention
Paused
Completed
```

Signals may include:

- no activity for a long period
- overdue milestones
- missed repeated actions
- no linked tasks

These are prompts for review, not judgments.

---

# 68. Opportunity Health

Similarly, opportunities can show:

```text
Active
Needs attention
Waiting
Upcoming
Closed
```

Based on:

- stage
- next event
- deadline
- inactivity
- outstanding action

---

# 69. Daily Planning Rules

Hop should not automatically schedule the entire user's life.

Use a simple model:

### Must
Important and time-sensitive.

### Should
Meaningful but flexible.

### Could
Optional.

The Today screen should normally emphasize a small number of “Must” and “Should” items.

---

# 70. Recovery / Bad Days

A good personal system must handle failure gracefully.

If a user misses several days, do not show:

> Streak broken.

Instead:

> Welcome back.
>
> Here is what matters now.

Then surface:

- current deadlines
- most important goal
- overdue tasks
- next useful action

The user should always have a path back into the system.

---

# 71. Home Screen Philosophy

When the app opens, it should not ask:

> “Which database do you want to browse?”

It should answer:

> **“Here is what matters.”**

This is one of the most important UX rules in the entire project.

---

# 72. What Should NOT Be Built

Explicit boundaries are necessary to prevent scope explosion.

Do not build these into the core product:

- social feeds
- followers
- public profiles
- public leaderboards
- collaboration for teams
- full team project management
- public marketplace
- public job board
- complicated CRM automation
- excessive chart libraries
- dozens of dashboard widgets
- aggressive gamification
- crypto / token systems
- native mobile applications initially
- large AI agent systems before the data model is stable

A feature should be rejected or postponed when it makes the product harder to use every day without producing enough personal value.

---

# 73. Scope Control Rule

Before adding a feature, ask:

1. Does it help me make better decisions?
2. Does it help me take meaningful action?
3. Does it preserve simplicity?
4. Does it fit the domain model?
5. Will I actually use it regularly?
6. Is the maintenance cost justified?

If the answer is mostly “no,” do not build it.

---

# 74. Product Roadmap

## Phase 0 — Stabilize the Prototype

Before expanding functionality:

- clean the existing UI
- split the monolithic frontend
- introduce TypeScript
- define domain models
- validate existing data
- add migration strategy
- improve error handling
- improve accessibility
- consolidate navigation
- define design tokens

The original project specifically identified the single-page frontend as a maintainability concern and suggested modularization.

---

## Phase 1 — Hop 2.0 Core

Build:

- Today
- Tasks
- Goals
- Habits
- Calendar / Plan
- Opportunities
- Projects
- Skills
- basic Evidence
- SQLite
- REST API
- authentication
- PWA
- backup/export
- private network access

This is the first release that should become the user's daily system.

---

## Phase 2 — Career System

Add:

- resume library
- opportunity timeline
- people interactions
- follow-up engine
- preparation checklists
- richer career analytics
- ICS export
- notifications
- attachments

---

## Phase 3 — Growth & Review

Add:

- skill evidence
- weekly review
- monthly review
- deeper goal health
- progress trends
- learning plans
- project-to-goal connections
- evidence history

---

## Phase 4 — Capture Automation

Add:

- browser extension
- job clipping
- job-description extraction
- optional email parsing
- suggested updates from emails

---

## Phase 5 — Intelligence

Add:

- job match analysis
- skill gap analysis
- next-action suggestions
- follow-up drafting
- weekly summary generation
- career insights
- natural-language querying over personal data

AI should arrive after the system is reliable without AI.

---

# 75. MVP Definition

The first serious version is complete when the user can:

1. Open Hop from a phone.
2. See what matters today.
3. Complete tasks and habits quickly.
4. Manage long-term goals.
5. Track career opportunities.
6. Track projects and skills.
7. View important calendar events.
8. Keep data synchronized across trusted devices.
9. Back up the data.
10. Review progress weekly.

Anything beyond this should be judged against the product's real daily utility.

---

# 76. A Typical Daily Workflow

## Morning

```text
Open Hop
↓
Review Today
↓
See 1–3 priorities
↓
Check urgent deadlines/events
↓
Start first important task
```

## During the day

```text
Complete work
↓
Capture task/progress
↓
Update opportunities when needed
↓
Add evidence when something meaningful is achieved
```

## Evening

```text
Review progress
↓
Optional reflection
↓
Prepare tomorrow's priorities
```

## Weekly

```text
Weekly review
↓
Review goals
↓
Review career funnel
↓
Review learning
↓
Identify problems
↓
Choose next week's priorities
```

---

# 77. Example End-to-End Growth Flow

```text
GOAL
Become an AI engineer
        ↓
HABIT
Study AI 60 min/day
        ↓
TASK
Study gradient descent
        ↓
PROJECT
Build NLP classifier
        ↓
SKILL
Machine Learning
        ↓
EVIDENCE
Built and deployed classifier
        ↓
MILESTONE
Completed ML fundamentals
        ↓
RESUME
AI-focused resume v3
        ↓
OPPORTUNITY
AI Engineer Internship
        ↓
INTERVIEW
Technical interview
        ↓
FEEDBACK
Needs stronger system design
        ↓
NEW GOAL / TASK
Study system design
```

This connected loop is the long-term differentiator of Hop.

---

# 78. Example Career Flow

```text
Save opportunity
↓
Review job description
↓
Identify skills
↓
Select resume
↓
Prepare
↓
Apply
↓
Track response
↓
Schedule interview
↓
Prepare checklist
↓
Interview
↓
Record feedback
↓
Create learning actions
↓
Continue / Offer / Close
```

Hop should make this chain visible.

---

# 79. Example Weekly Review

```text
WEEK OF SEPTEMBER 7

Wins
- Completed project authentication
- Submitted 5 applications
- Finished ML chapter

Goals
AI Engineer: +5%
System Design: unchanged

Career
5 applications
2 responses
1 interview

Learning
6h 40m

Projects
Authentication module shipped

Problems
System design practice neglected

Next Week
1. Prepare for interview
2. Practice system design 3x
3. Finish NLP project milestone
```

The review should lead directly to the next week's actions.

---

# 80. Notifications Priority

Not all reminders are equal.

Suggested priority:

### Critical

- offer response deadline
- interview imminent
- deadline today

### Important

- deadline soon
- overdue follow-up
- review due

### Optional

- habit reminder
- goal inactivity

The user must be able to disable categories.

---

# 81. Settings

Recommended settings sections:

```text
Profile
Appearance
Notifications
Privacy & Security
Backup
Import / Export
Calendar
Integrations
System
```

Profile may include:

- name
- timezone
- week start day
- preferred work hours

Do not require unnecessary personal information.

---

# 82. Time and Date Handling

Time must be treated as a first-class concern.

Store timestamps consistently.

Distinguish between:

- date-only values, such as a deadline date
- timestamped events, such as a completed task or interaction

User-facing times should use the configured timezone.

Recurring habits and tasks must respect local dates.

---

# 83. Timezone

The application should have an explicit timezone setting, defaulting to the host/user environment when appropriate.

This matters especially for:

- streak calculation
- daily habits
- deadlines
- notifications
- calendar events
- weekly reviews

Avoid assumptions based solely on server timezone.

---

# 84. Data Model Relationships

Conceptually:

```text
AREA
 │
 ├── GOALS
 │    │
 │    ├── HABITS
 │    ├── MILESTONES
 │    ├── TASKS
 │    ├── PROJECTS
 │    ├── SKILLS
 │    └── EVIDENCE
 │
 ├── PROJECTS
 ├── SKILLS
 └── TASKS
```

Career is connected separately:

```text
GOAL
 │
 ├── OPPORTUNITIES
 │     ├── PEOPLE
 │     ├── RESUMES
 │     ├── EVENTS
 │     ├── TASKS
 │     └── TIMELINE
 │
 └── PROJECTS
```

This gives Hop a connected personal knowledge graph without needing to expose it as a complicated graph UI.

---

# 85. Activity History

A lightweight activity log is useful for auditing and timeline generation.

Example:

```text
actor
entityType
entityId
action
metadata
createdAt
```

Examples:

```text
Goal marked achieved
Opportunity moved to interview
Task completed
Resume selected for opportunity
Milestone created
```

The UI does not need to expose every internal event.

---

# 86. Offline Strategy

The PWA should support graceful operation during temporary network interruptions.

At minimum:

- application shell loads
- cached previously loaded data may remain readable
- network state is visible

For true offline writes, implement an explicit queue/conflict strategy.

Do not silently overwrite server data after reconnection.

---

# 87. Synchronization Strategy

The server/database is authoritative.

For online changes:

```text
Client
 ↓
API
 ↓
Validate
 ↓
Transaction
 ↓
SQLite
 ↓
Response
 ↓
Client state updated
```

For future offline mutation support:

```text
Local action
 ↓
Pending queue
 ↓
Sync
 ↓
Conflict detection
 ↓
Resolve
 ↓
Commit
```

Conflict behavior must be designed before claiming full offline editing.

---

# 88. Performance Goals

Hop is a personal productivity tool, so speed matters.

Desired experience:

- fast first screen
- quick navigation
- minimal layout shifts
- instant local interaction feedback
- small JavaScript bundles where practical
- lazy-load non-critical sections

Today should feel nearly immediate on a normal connection and reasonable hardware.

---

# 89. Error Handling UX

Errors should be understandable.

Bad:

> Error 500.

Better:

> We couldn't save this change. Your previous data is still safe. Try again.

For validation:

> Deadline must be a valid date.

For offline:

> You're offline. This change has not been synchronized yet.

The user should always know whether their data was saved.

---

# 90. Destructive Actions

Actions such as:

- delete goal
- delete opportunity
- overwrite import
- remove resume
- delete backup

should require appropriate confirmation.

Prefer archive over destructive deletion when history may be useful.

Where possible, support undo or recovery through backups.

---

# 91. Data Retention

Do not automatically delete useful history.

Instead prefer lifecycle states:

```text
active
completed
archived
```

History is valuable because Hop is intended to become a long-term record of career and personal growth.

---

# 92. Long-Term Career History

One of the biggest strategic goals is to build a durable personal career record.

Over years, Hop should be able to answer:

> What have I learned?
>
> What have I built?
>
> Which skills do I actually have evidence for?
>
> Which opportunities have I pursued?
>
> Where have I improved?
>
> What mistakes keep repeating?
>
> What kind of roles respond to my profile?
>
> What should I work on next?

This makes the application valuable even when no job search is active.

---

# 93. Personal-Life Expansion

Hop may eventually support broader life areas, but expansion should be controlled.

Appropriate future areas may include:

- personal development
- health routines
- financial planning
- reading
- language learning
- travel planning
- administrative responsibilities

The data model should allow areas beyond Career without turning every life category into a new feature module immediately.

Start with the smallest useful subset.

---

# 94. Domain Design Rule

When considering a new feature, first identify its domain concept.

Example:

A reminder is not necessarily a new domain object. It may be a presentation of a task or event.

A deadline is a date/property on an opportunity or task, depending on what the deadline belongs to.

A technical interview is an event linked to an opportunity.

A coding practice session is a task, possibly generated by a habit.

A completed course may become evidence or a milestone, rather than requiring a new “course” entity unless course-specific workflows justify it.

Avoid inventing entities merely because the UI needs another screen.

---

# 95. Product Decision Hierarchy

When there is a disagreement between features or implementation approaches, prefer:

```text
User usefulness
    ↓
Simplicity
    ↓
Reliability
    ↓
Privacy
    ↓
Maintainability
    ↓
Performance
    ↓
Convenience / novelty
```

A flashy feature should not beat a reliable core workflow.

---

# 96. Definition of “Done” for a Feature

A feature is not finished merely because the UI exists.

A feature should have:

- domain model
- validation
- persistence
- loading state
- empty state
- error state
- mobile behavior
- accessibility behavior
- relevant tests
- backup compatibility
- migration consideration
- clear success feedback

For critical features, include recovery behavior as well.

---

# 97. Testing Strategy

At minimum:

## Unit tests

For:

- streak/consistency calculations
- follow-up rules
- stage transitions
- recurring task generation
- date/time handling
- goal progress calculations
- validation

## Integration tests

For:

- API + database
- authentication
- import/export
- migrations

## UI tests

For critical flows:

- create task
- complete task
- create goal
- complete habit
- create opportunity
- change opportunity stage
- backup/export
- restore/import

---

# 98. Important Business Rules

These rules should be explicit and tested.

### Opportunity

- terminal opportunities should not trigger ordinary follow-up reminders
- stage changes should be recorded
- deadlines should use date-safe logic
- history should remain available after closure

### Goals

- achieved goals should preserve history
- archived goals should not appear as active work
- progress should be explainable

### Habits

- completion belongs to a specific local date
- duplicate completion should be prevented or handled intentionally
- skipped days should not corrupt historical records

### Tasks

- completed tasks retain completion time
- overdue is derived from date/status, not permanently stored as a random flag

### Reviews

- review dates must respect user timezone/week settings

---

# 99. Derived Data vs Stored Data

Prefer storing raw facts and deriving views.

Example:

Store:

```text
appliedAt
stage
activityEvents
```

Derive:

```text
daysSinceActivity
followUpDue
currentStageLabel
```

Likewise, store:

```text
habit completions
```

Derive:

```text
current streak
weekly consistency
```

This reduces inconsistency.

---

# 100. Avoid Data Duplication

For example, if a contact's company is stored on their profile, do not copy the same company string into every historical record unless there is a deliberate snapshot requirement.

Likewise, do not maintain multiple competing “current status” values without a clear source of truth.

The database should have a clear authoritative field for each fact.

---

# 101. AI Development Instructions

When using an AI coding assistant to implement Hop, always provide this document as the product specification.

The assistant should:

1. Preserve the domain model.
2. Prefer existing primitives over adding duplicate concepts.
3. Follow the navigation hierarchy.
4. Keep Today focused.
5. Use typed domain models.
6. Avoid unnecessary dependencies.
7. Protect user data.
8. Consider mobile behavior.
9. Consider accessibility.
10. Add tests for meaningful business rules.

AI-generated code should not be allowed to redefine product requirements casually.

---

# 102. AI Coding Prompt Template

Use this template when asking another coding agent to implement work:

```text
You are working on Hop — Personal Growth & Career OS.

Read HOP_PRODUCT_SPEC.md before making changes.

Goal:
[describe the feature]

Relevant domain:
[goal / task / career / growth / review / etc.]

Requirements:
- [requirement]
- [requirement]
- [requirement]

Constraints:
- Keep the current architecture unless there is a strong reason to change it.
- Use TypeScript types instead of any.
- Preserve responsive/mobile behavior.
- Preserve accessibility.
- Preserve existing data semantics.
- Do not add unrelated features.
- Add or update tests for business logic.

Before coding:
1. Identify relevant existing components/modules.
2. Identify affected domain models.
3. Identify migrations if persistence changes.
4. Explain any architectural impact.

After coding:
1. Run tests.
2. Run lint/type checks.
3. Verify mobile behavior.
4. Summarize files changed and why.
5. Mention any follow-up risks.
```

---

# 103. Repository Documentation

The repository should eventually contain:

```text
README.md
HOP_PRODUCT_SPEC.md
docs/
├── architecture.md
├── domain-model.md
├── database.md
├── api.md
├── ui.md
├── accessibility.md
├── security.md
└── deployment.md
```

The product specification should remain the highest-level product source of truth.

Technical documents can explain implementation details without silently changing the product concept.

---

# 104. README vs Product Specification

### README.md

Should explain quickly:

- what Hop is
- why it exists
- core features
- how to run it
- basic deployment/access
- backup
- links to deeper documentation

### HOP_PRODUCT_SPEC.md

Contains:

- vision
- product principles
- domain model
- UX rules
- feature requirements
- architecture direction
- boundaries
- roadmap
- AI development instructions

### PROJECT_REPORT.md

Can explain implementation history or academic/project-report details when useful, but it should not become the only product specification.

---

# 105. Migration From the Existing Prototype

The current prototype has these JSON stores:

```text
opportunities.json
goals.json
growth.json
contacts.json
hop.json
```

The migration plan should preserve the data.

Approximate mapping:

```text
opportunities.json → opportunities + opportunity_events

goals.json → goals + goal_milestones + goal_habits + habit_completions

growth.json → skills + projects + milestones + evidence

contacts.json → contacts

hop.json → activity / historical check-ins
```

Do not delete the old files until:

1. migration succeeds
2. data is validated
3. an export/backup exists
4. the new database has been checked

---

# 106. Prototype Features to Preserve

The existing prototype has several strong ideas that should remain conceptually:

- career pipeline
- application stages
- deadlines
- interview/assessment tracking
- follow-up detection
- goal habits
- roadmap-style goal steps
- skills
- projects
- milestones
- people
- calendar timeline
- funnel analytics
- export/import
- saved-state indicators
- atomic persistence

These form the foundation of Hop rather than being discarded.

---

# 107. Improvements to Existing Ideas

## Existing “daily hop streak”

Replace the central role with meaningful consistency.

## Existing “pond wisdom” quotes

Keep optional and subtle. Never let inspirational text consume important screen space.

## Existing confetti on offers

Keep as an optional celebration.

## Existing lily-pad pipeline

Keep a simplified visual representation if it remains readable and professional on mobile.

## Existing “Leaps” analytics

Keep, but move under Career → Analytics.

---

# 108. Gamification Policy

Gamification is optional seasoning.

Allowed:

- subtle progress indicators
- celebrations for major achievements
- tasteful streaks
- small milestone animations

Not allowed as a design direction:

- points everywhere
- artificial currencies
- competitive leaderboards
- guilt messages
- addictive notification loops
- constant rewards

Hop should help the user build a life, not optimize for app engagement.

---

# 109. Content Philosophy

The app should favor concrete language.

Prefer:

> Follow up with recruiter

over:

> Continue your professional journey!

Prefer:

> Interview tomorrow at 14:00

over:

> Big opportunity incoming!

Prefer:

> You have not worked on this goal in 12 days.

over:

> Your dream is waiting for you!

The tone can remain warm, but the information must stay useful.

---

# 110. Empty States

Empty states should guide action.

Example for Opportunities:

> No active opportunities.
> Save a role when you find one.
> [ Add opportunity ]

Example for Projects:

> No projects yet.
> Add something you are building or learning through.

Avoid decorative empty screens that do not tell the user what to do.

---

# 111. Loading States

Use appropriate skeletons or compact loading indicators.

Never block the entire application unnecessarily while one secondary module loads.

The Today shell should become useful as quickly as possible.

---

# 112. Accessibility and Reduced Motion

Support `prefers-reduced-motion`.

Animations such as confetti should be disabled or simplified for users who request reduced motion.

Motion should communicate state or provide feedback, not be decorative by default.

---

# 113. Internationalization Direction

The app can begin in English if that is the most useful implementation language, but text and layout should not make future localization difficult.

Avoid hard-coding UI strings deep inside logic.

RTL support can be considered later if needed.

---

# 114. Local-First vs Local-Only

Important terminology distinction:

### Local-only

Data lives only on one machine.

### Local-first / private self-hosted

The user controls the server and data, while trusted devices connect to the same private system.

Hop 2.0 should aim for **private self-hosted / local-first behavior**, not strict single-machine local-only behavior.

---

# 115. Deployment Goal

A practical personal deployment should look like:

```text
Hop Server
├── Node.js API
├── Web app
├── SQLite database
├── Local attachment storage
└── Backup job
```

Access:

```text
Phone ──┐
Laptop ─┼── Private network ── Hop
Lab ────┘
```

This avoids the need to publish Hop publicly.

---

# 116. Disaster Recovery

The minimum disaster-recovery plan should be:

```text
1. Automatic backup
2. Manual export
3. Backup retention
4. Restore procedure
5. Periodic restore test
```

A backup that has never been tested is not a fully trusted backup.

---

# 117. Success Criteria for the Product

Hop is successful when:

- the user actually opens it voluntarily
- Today quickly clarifies priorities
- recording progress is faster than using a generic notes app
- career opportunities stay organized
- goals remain visible without becoming overwhelming
- project/skill history becomes useful during job preparation
- weekly reviews influence the next week's actions
- data remains safe and portable
- the product works well across trusted devices
- maintenance remains manageable for one developer

The objective is **real-life utility**, not feature count.

---

# 118. Final Product Definition

> **Hop is a private personal Growth & Career OS that turns long-term goals into daily actions and preserves the evidence of progress. It connects planning, habits, goals, projects, skills, opportunities, relationships, and reflection into one calm, accessible system that the user controls.**

The core experience is:

```text
TODAY
  ↓
ACTION
  ↓
PROGRESS
  ↓
EVIDENCE
  ↓
REVIEW
  ↓
BETTER DIRECTION
```

The product should always return to this loop.

---

# 119. Final Architecture at a Glance

```text
                         HOP
                          │
               Personal Growth & Career OS
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
      TODAY              PLAN             REVIEW
        │                 │                 │
   Priorities          Tasks            Daily
   Habits              Calendar         Weekly
   Attention            Events           Monthly
        │
        ├──────────────┐
        │              │
      GOALS          CAREER
        │              │
   Habits          Opportunities
   Projects        People
   Skills          Resumes
   Milestones      Analytics
   Evidence
        │
        └──────────────┐
                       │
                     GROWTH
                       │
              Projects / Skills
                 Evidence
                  Milestones
```

Technical layer:

```text
React + TypeScript + Vite + PWA
                │
         Node.js + TypeScript
                │
            REST API
                │
             SQLite
                │
        Docker / Private Host
                │
          Private Network
```

---

# 120. Final Development Rule

**Build the boring, reliable core first.**

The sequence is:

```text
Reliable data
     ↓
Clean domain model
     ↓
Excellent Today experience
     ↓
Simple daily execution
     ↓
Career + growth connections
     ↓
Reviews and insights
     ↓
Automation
     ↓
AI
```

Never reverse this order merely because an advanced feature is exciting.

Hop should become a tool that the user trusts with years of personal and career history.

That trust is more important than novelty.

---

# Appendix A — Suggested Initial Database Entities

```text
Area
Goal
GoalMilestone
GoalHabit
HabitCompletion
Task
TaskRecurrence
Event
Opportunity
OpportunityEvent
OpportunityTask
Contact
ContactInteraction
Resume
Document
Skill
SkillEvidence
Project
Milestone
Evidence
JournalEntry
WeeklyReview
MonthlyReview
Notification
Setting
ActivityLog
```

---

# Appendix B — Suggested Initial Feature Priority

## P0 — Core

```text
Today
Tasks
Goals
Habits
Opportunities
Projects
Skills
SQLite
Authentication
PWA
Backup
```

## P1 — High value

```text
Calendar
Weekly Review
Evidence
Resume versions
People interactions
Follow-ups
Notifications
ICS export
Attachments
Career analytics
```

## P2 — Automation

```text
Browser extension
Job clipping
Job description extraction
Email parsing
```

## P3 — Intelligence

```text
AI assistant
Skill gap analysis
Career insights
Natural-language data queries
```

---

# Appendix C — Questions Hop Should Always Help Answer

### Today

> What matters now?

### Goals

> Where am I going?

### Tasks

> What exactly should I do?

### Career

> What opportunities am I pursuing?

### Growth

> What am I learning and building?

### Evidence

> What proof do I have?

### Review

> What is working?

### Planning

> What should I do next?

If a feature does not help answer one of these questions, it should be carefully justified before entering the core product.

---

# Appendix D — Product Mantra

> **Don't optimize Hop for how much data it stores. Optimize it for how much clarity and useful action it creates.**

