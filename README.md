# Hop

Hop is a private personal Growth & Career OS. It turns long-term goals into daily actions and preserves the evidence of progress.

The first working slice is the **Today** workflow:

- View the current day's focus.
- Load persisted tasks from SQLite.
- Add a task scheduled for today.
- Complete a task and record its completion timestamp.
- Navigate through the planned product areas: Today, Plan, Goals, Career, Growth, and Review.

The product direction is documented in [HOP_PRODUCT_SPEC.md](HOP_PRODUCT_SPEC.md). The technical architecture is described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- Node.js 22 or newer. The API uses Node's built-in `node:sqlite` module.
- Yarn 4.9.4. The repository pins this through `packageManager`.

Check your versions:

```bash
node --version
yarn --version
```

## Install

From the repository root:

```bash
yarn install
```

The repository includes a local `.env` for development. To create one manually:

```bash
cp .env.example .env
```

The current API uses `PORT` from the environment and stores the SQLite database at `storage/hop.db`. The database directory is created automatically and local database files are ignored by Git.

## Run The Whole Environment

Use the root command to start the API and web app together:

```bash
yarn dev
```

Then open the web app at [http://localhost:5173](http://localhost:5173).

The API runs at [http://localhost:4321](http://localhost:4321). Vite proxies `/api` requests to it.

Stop the processes with `Ctrl+C`.

### Run each process separately

Use separate terminals when you want clearer logs:

```bash
yarn workspace @hop/api dev
yarn workspace web dev
```

The web workspace is named `web`, not `@hop/web`.

If port `4321` is already in use, change `PORT` in `.env`. The Vite proxy reads the same value.

The API listens on `127.0.0.1` by default. The web app reaches it through the Vite proxy on the same origin, so the API sends no CORS headers.

## Run Hop For Daily Use

For everyday use, build once and run a single process. The API serves the web app and `/api` from the same origin:

```bash
yarn build
yarn start
```

Then open [http://localhost:4321](http://localhost:4321). Run `yarn build` again after pulling changes.

### Install On Your Phone Or Laptop

Hop is a Progressive Web App. Browsers only allow installing it over HTTPS or on `localhost`. To use it from your phone:

1. Complete password setup on the server machine first.
2. Serve Hop over HTTPS on your private network. With Tailscale, run `tailscale serve` on the server and point it at `http://127.0.0.1:4321` (see `tailscale serve --help` for your version). Hop can keep `HOST=127.0.0.1`, because Tailscale connects to it locally.
3. Set `COOKIE_SECURE=true` and restart Hop.
4. Open the HTTPS address on your phone and choose **Install app** (Chrome/Android) or **Share → Add to Home Screen** (Safari/iOS).

### Offline Behavior

- The app shell is cached, so Hop opens without a connection.
- Data you loaded recently stays readable offline. A banner shows when you are offline.
- Changes made offline are not saved or queued. They fail with a visible error, and the server remains the only source of truth. Queued offline edits need a conflict strategy first (see the product spec, §86–87).
- Signing out, or a session ending, deletes the offline copy of your data from that device.
- The service worker only runs in production builds (`yarn build`), not under `yarn dev`.

## Sign In

The first time you open Hop, it asks you to create a password (at least 12 characters). After that, every API route except `/api/health` and `/api/auth/*` requires a signed-in session.

- Sessions last 30 days. The session cookie is `HttpOnly` and `SameSite=Strict`, and the database stores only a hash of each session token.
- Requests that change data must come from Hop's own origin.
- After 5 failed password attempts, sign-in is blocked for 15 minutes.
- Changing your password (Review → Password) signs out every other device.
- If you forget your password, stop the API and run `yarn workspace @hop/api auth:reset`. Your data is kept. Open Hop on the server machine and create a new password.

To open Hop from other devices, set `HOST` to the server's private-network address (for example its Tailscale IP). Hop refuses to listen on a non-local address until a password exists, so nobody else on the network can claim the setup screen first. When you serve Hop over HTTPS, set `COOKIE_SECURE=true`.

## Verify The Environment

Check the API health endpoint:

```bash
curl http://localhost:4321/api/health
```

Expected response:

```json
{"name":"Hop API","status":"ok"}
```

The other routes require a session. Open the web app once to create your password, then sign in from the terminal:

```bash
curl -c cookies.txt -X POST http://localhost:4321/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"<your password>"}'
```

List persisted tasks:

```bash
curl -b cookies.txt http://localhost:4321/api/tasks
```

Create a task:

```bash
curl -b cookies.txt -X POST http://localhost:4321/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Read the Hop product spec","scheduledDate":"2026-09-16"}'
```

Complete a task by replacing `<task-id>` with the returned ID:

```bash
curl -b cookies.txt -X PATCH http://localhost:4321/api/tasks/<task-id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"completed"}'
```

A completed task receives a server-generated `completedAt` timestamp.

## Available Commands

From the repository root:

```bash
yarn dev                              # Start all workspaces with a dev script
yarn build                            # Build the web app and typecheck the API
yarn start                            # Serve the built web app and API on one port
yarn typecheck                        # Typecheck all workspaces with a typecheck script
yarn test                             # Run all workspaces with a test script (API tests use an in-memory database)
yarn workspace web build              # Build the frontend
yarn workspace web lint               # Lint the frontend
yarn workspace @hop/api typecheck     # Typecheck the API
yarn workspace @hop/api test:task      # Exercise task persistence directly (writes to the configured database)
```

The API also exposes these database commands:

```bash
yarn workspace @hop/api db:generate
yarn workspace @hop/api db:migrate
yarn workspace @hop/api db:studio
```

The schema is managed with Drizzle migrations in `db/migrations`. The API applies pending migrations on startup in a single transaction, so `db:migrate` is only needed when you want to migrate without starting the server. Databases created before migrations existed are detected and baselined automatically.

To change the schema:

1. Edit the tables in `apps/api/src/db/schema/`.
2. Run `yarn workspace @hop/api db:generate --name <short-description>`.
3. Review the generated `migration.sql` and commit it with the schema change.

Back up `storage/hop.db` before applying migrations to real data. The API also creates a daily backup on startup.

## Repository Layout

```text
apps/
  api/                 Node.js + TypeScript API
    src/db/             SQLite and Drizzle schema
    src/repositories/   Persistence-only operations
    src/services/       Application and business logic
    src/static.ts       Serves the built web app in production
    src/server.ts       HTTP API
  web/                 React + TypeScript + Vite frontend
    src/App.tsx         Today experience and task workflow
    src/App.css         Product UI styles
packages/
  domain/              Shared domain types
  validation/          Shared Zod request schemas
docs/                  Architecture and repository notes
db/migrations/         Drizzle SQL migrations, applied on API startup
storage/               Local database, backups, and attachments
```

The backend boundary is:

```text
HTTP route -> validation -> service -> repository -> SQLite
```

The web app talks to the API through `/api`. It does not write directly to SQLite.

## Current API

### Authentication

- `GET /api/auth/session` returns `{ setupRequired, authenticated }`.
- `POST /api/auth/setup` with `{ "password": "..." }` creates the password. Returns `409` if one already exists.
- `POST /api/auth/login` with `{ "password": "..." }` starts a session. Returns `401` for a wrong password, and `429` after too many attempts.
- `POST /api/auth/logout` ends the current session.
- `POST /api/auth/password` with `{ "currentPassword": "...", "newPassword": "..." }` changes the password and signs out other devices.

Every other route below requires the session cookie. The `curl` examples above need it too. Sign in with `curl -c cookies.txt`, then pass `-b cookies.txt` on later requests.

### `GET /api/health`

Returns the service status.

### `GET /api/tasks`

Returns all persisted tasks.

### `POST /api/tasks`

Creates a task. The title is required. Optional fields include `description`, `priority`, `scheduledDate`, `dueDate`, `estimatedMinutes`, and relationship IDs.

Example:

```json
{
  "title": "Prepare interview questions",
  "priority": "high",
  "scheduledDate": "2026-09-16",
  "estimatedMinutes": 45
}
```

### `PATCH /api/tasks/:id`

Updates task fields. Set `status` to `completed` to record completion time, or set it back to another status to clear `completedAt`.

Valid statuses are `todo`, `in_progress`, `completed`, and `cancelled`. Valid priorities are `low`, `medium`, and `high`.

Invalid request bodies, malformed JSON, and impossible dates (such as `2026-02-31`) return HTTP `400`. Bodies over 1 MB return `413`. Missing records return `404`. A second weekly review for the same week returns `409`. Unexpected server failures return `500`.

### `GET /api/export`

Downloads a full JSON snapshot of every table (`hop-export-YYYY-MM-DD.json`).

### `GET /api/backups/:fileName`

Downloads one server-side backup.

### `POST /api/restore/preview` and `POST /api/restore`

`/api/restore/preview` takes a backup snapshot as the request body. It checks the snapshot and returns per-table record counts, now and after the restore. Nothing changes.

`/api/restore` takes `{ "snapshot": <backup>, "confirmed": true }`. It writes a safety backup of the current data, then replaces all data tables in one transaction, so either everything is restored or nothing changes. It returns the preview counts and the safety backup's `fileName`. Your password and sessions are not affected.

Only version 1 snapshots are accepted. Backups from earlier versions of Hop restore as long as they match the current snapshot format. Files over 50 MB are rejected.

### `GET /api/backups` and `POST /api/backups`

Lists server-side backups, or creates one immediately. The API also creates one backup per day on startup and hourly checks, keeping the 7 most recent days plus the newest backup from each of the last 4 weeks. Backups are written to `BACKUP_DIR` (default `storage/backups`). The Review screen shows the latest backup and offers **Back up now** and **Download export**.

To restore, open **Review → Your data**. Choose one of the recent server backups, or a file you downloaded. Hop shows what will change and waits for you to confirm **Replace my data**. A backup of your current data is saved first, so you can undo a restore by restoring that backup.

## Data And Privacy

Hop is designed for private, self-hosted use. Local data stays in the server's SQLite database and is not sent to an external application service by the current implementation.

- Do not commit `.env` or database files.
- Do not expose `storage/` as public static files.
- Back up `storage/hop.db` before migrations or experiments.
- Attachments, merge-style import, and offline editing are planned, not complete features yet.

## Product Roadmap

The implementation order follows the product specification:

1. Reliable task and Today foundation.
2. Goals, habits, and Plan.
3. Opportunities, projects, skills, and evidence.
4. Reviews, calendar, follow-ups, backups, and authentication.
5. PWA/offline behavior, capture automation, and optional AI features.

The product should keep Today calm and actionable. Advanced intelligence comes after the structured data and review loops are reliable.

## Troubleshooting

### `Workspace '@hop/web' not found`

Use:

```bash
yarn workspace web dev
```

Only the API workspace currently uses the `@hop/*` package naming convention.

### The web screen says the API is unavailable

Start the API in another terminal:

```bash
yarn workspace @hop/api dev
```

Then refresh the web page.

### The API cannot find a table

Restart the API. It applies pending migrations from `db/migrations` on startup. If startup reports that it cannot baseline the database, the database has only some of Hop's tables. Restore it from a backup in `storage/backups`, or move it aside to start fresh.

### A port is busy

Change `PORT` in `.env`. Update the target in `apps/web/vite.config.ts` if the API port changes.

## Documentation

- [Product specification](HOP_PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Repository structure](docs/hop-structure.md)
- [Web app README](apps/web/README.md)
