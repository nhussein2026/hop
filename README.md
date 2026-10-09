# Hop 🐸

> Small actions. Real progress. Bigger leaps.

Hop is a private, self-hosted Growth & Career OS for one person. It turns long-term goals into today's actions, tracks career opportunities and university work, and keeps the evidence of progress, across a laptop, phone, and tablet.

Everything lives in one SQLite database on a server you control. There are no accounts, no third-party services, and no telemetry.

## Features

| Area | What it does |
| --- | --- |
| **Today** | One next action, today's priorities, habits, classes, deadlines that need attention, what's coming up, and a short reflection. |
| **Plan** | Agenda, all tasks, and habits with four-week consistency (missing a day never resets a streak). |
| **Calendar** | Month and week views of events, tasks, deadlines, and classes. |
| **İTÜ** | This term at a glance, courses with grade tracking, target averages and the VF (final eligibility) attendance limit, a file library, thesis and research ideas, and a handbook of key dates and links. |
| **Goals** | Outcomes with success criteria, milestones, progress history, and health signals. |
| **Career** | Opportunity pipeline with follow-ups, interview prep, activity timeline, people and interactions, resumes with files, and analytics. |
| **Growth** | Skills, projects, evidence, milestones, and **Radar**: an inbox for interesting finds (repos, papers, models, events) where each find gets one decision. |
| **Review** | Weekly and monthly reviews built from the period's facts, reflections, and past reviews. |
| **Settings** | Profile, timezone, theme, notification categories, career rules, university terms, backup and export, password, and signed-in devices. |

Across the app: quick add (`N`), search (`/` or `Ctrl/⌘ K`), go-to shortcuts (`G` then `T` Today, `P` Plan, `L` Calendar, `U` İTÜ, `G` Goals, `C` Career, `W` Growth, `R` Review, `S` Settings), undo for most changes, in-app notifications, light and dark themes, and an installable PWA that opens offline.

The product vision and rules are in the [product specification](docs/HOP_PRODUCT_SPEC.md).

## Quick Start

Requirements: **Node.js 22.13 or newer** (Hop uses the built-in `node:sqlite` module) and **Yarn 4** (pinned through `packageManager`; run `corepack enable` once if `yarn` is missing).

```bash
yarn install
cp .env.example .env
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) and create your password (at least 12 characters). The API runs on port `4321`, and Vite proxies `/api` to it. `./start.sh` does the same, creating `.env` if it's missing.

## Daily Use

For everyday use, build once and run a single process. The API serves the built web app and `/api` from one origin:

```bash
yarn build
yarn start          # http://localhost:4321
```

Run `yarn build` again after pulling changes. Database migrations apply automatically on startup.

### Phone and tablet

Browsers only install a PWA over HTTPS, so Hop needs an HTTPS address that your devices can reach. The simplest private option is [Tailscale](https://tailscale.com):

1. On the machine running Hop, open Hop locally once and set your password.
2. Run `tailscale serve` pointing at `http://127.0.0.1:4321`. Hop can keep `HOST=127.0.0.1`, because Tailscale connects to it locally.
3. Set `COOKIE_SECURE=true` in `.env` and restart Hop.
4. On each device, open the `https://…ts.net` address and choose **Install app** (Android/Chrome) or **Share → Add to Home Screen** (iOS/Safari).

See [Deployment](docs/DEPLOYMENT.md) for running Hop on an always-on server.

### Offline

The app opens without a connection and shows the data you loaded most recently, with an offline banner. Changes made offline are **not** queued: they fail with a visible message, and the server stays the only source of truth. Signing out deletes the offline copy from that device.

## Configuration

Settings are read from `.env` in the repository root (see [`.env.example`](.env.example)).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4321` | API port. The Vite dev proxy reads the same value. |
| `HOST` | `127.0.0.1` | Listen address. Hop refuses a non-local address until a password exists. |
| `DATABASE_URL` | `./storage/hop.db` | SQLite file, relative to the repository root. Created on first start. |
| `BACKUP_DIR` | `./storage/backups` | Where automatic and manual backups are written. |
| `COOKIE_SECURE` | `false` | Set to `true` whenever Hop is served over HTTPS. |
| `WEB_DIST_DIR` | `./apps/web/dist` | Built web app served by `yarn start`. |

## Backups

- Hop writes a JSON backup on startup and checks hourly, keeping the last **7 days** plus the newest backup from each of the last **4 weeks**. Uploaded files (resumes, library files) are included, so each backup is complete on its own.
- **Settings → Backup and export** shows the latest backup and has **Back up now**, **Test a restore** (restores the latest backup into a scratch database to prove it works), **Download export**, and restore.
- A restore shows exactly what will change, waits for confirmation, saves a safety backup first, and replaces everything in one transaction. Your password and sessions are unaffected.
- Backups sit on the same disk as the database. Copy `BACKUP_DIR` somewhere else regularly.

## Security

- One password, hashed with scrypt. Sessions last 30 days in an `HttpOnly`, `SameSite=Strict` cookie; only a hash of the token is stored.
- Five wrong passwords block sign-in for 15 minutes. Cross-origin writes are rejected.
- Changing the password signs out every other device. **Settings → Privacy and security** lists signed-in devices and can sign any of them out.
- Forgot the password? Stop Hop, run `yarn workspace @hop/api auth:reset`, then open Hop on the server to set a new one. Your data is kept.

Details in [Security](docs/SECURITY.md).

## Development

```bash
yarn dev            # API (tsx watch) and web (Vite) together
yarn test           # All tests; API tests use an in-memory database
yarn typecheck      # Typecheck every workspace
yarn workspace web lint
```

Code layout, conventions, schema changes, and troubleshooting are in [Development](docs/DEVELOPMENT.md).

## Documentation

| Document | Contents |
| --- | --- |
| [Product specification](docs/HOP_PRODUCT_SPEC.md) | Vision, principles, domain model, UX rules, roadmap. The product source of truth. |
| [Architecture](docs/ARCHITECTURE.md) | How the pieces fit: layers, data flow, PWA, backups, time handling. |
| [Repository structure](docs/hop-structure.md) | Directory map. |
| [Database](docs/DATABASE.md) | Tables, migrations, and the backup format. |
| [API](docs/API.md) | Every HTTP route. |
| [Security](docs/SECURITY.md) | Authentication, sessions, and the threat model. |
| [Deployment](docs/DEPLOYMENT.md) | Running Hop on a server and reaching it from your devices. |
| [Development](docs/DEVELOPMENT.md) | Workspaces, commands, conventions, and troubleshooting. |
| [ADR 0001](docs/ADR/0001-foundation-architecture.md) | The foundation architecture decision. |
