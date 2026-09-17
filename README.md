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

If port `4321` is already in use, change `PORT` in `.env` and update the proxy target in `apps/web/vite.config.ts` to match.

## Verify The Environment

Check the API health endpoint:

```bash
curl http://localhost:4321/api/health
```

Expected response:

```json
{"name":"Hop API","status":"ok"}
```

List persisted tasks:

```bash
curl http://localhost:4321/api/tasks
```

Create a task:

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Read the Hop product spec","scheduledDate":"2026-09-16"}'
```

Complete a task by replacing `<task-id>` with the returned ID:

```bash
curl -X PATCH http://localhost:4321/api/tasks/<task-id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"completed"}'
```

A completed task receives a server-generated `completedAt` timestamp.

## Available Commands

From the repository root:

```bash
yarn dev                              # Start all workspaces with a dev script
yarn build                            # Build all workspaces with a build script
yarn typecheck                        # Typecheck all workspaces with a typecheck script
yarn test                             # Run all workspaces with a test script
yarn workspace web build              # Build the frontend
yarn workspace web lint               # Lint the frontend
yarn workspace @hop/api typecheck     # Typecheck the API
yarn workspace @hop/api test:task      # Exercise task persistence directly
```

The API also exposes these database commands:

```bash
yarn workspace @hop/api db:generate
yarn workspace @hop/api db:migrate
yarn workspace @hop/api db:studio
```

The current first-start initialization creates the `tasks` table automatically. As more entities are added, use explicit Drizzle migrations before changing persisted production data.

## Repository Layout

```text
apps/
  api/                 Node.js + TypeScript API
    src/db/             SQLite and Drizzle schema
    src/repositories/   Persistence-only operations
    src/services/       Application and business logic
    src/server.ts       HTTP API
  web/                 React + TypeScript + Vite frontend
    src/App.tsx         Today experience and task workflow
    src/App.css         Product UI styles
packages/
  domain/              Shared domain types
  validation/          Shared Zod request schemas
docs/                  Architecture and repository notes
db/                    Future migration and seed location
storage/               Local database, backups, and attachments
```

The backend boundary is:

```text
HTTP route -> validation -> service -> repository -> SQLite
```

The web app talks to the API through `/api`. It does not write directly to SQLite.

## Current API

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

Invalid request bodies return HTTP `400`. Missing tasks return HTTP `404`.

## Data And Privacy

Hop is designed for private, self-hosted use. Local data stays in the server's SQLite database and is not sent to an external application service by the current implementation.

- Do not commit `.env` or database files.
- Do not expose `storage/` as public static files.
- Back up `storage/hop.db` before migrations or experiments.
- Authentication, secure sessions, backups, attachments, and private-network deployment are planned requirements, not complete features yet.

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

### The API cannot find the tasks table

Restart the API. The SQLite client initializes the current `tasks` table on startup. For future schema changes, generate and apply a Drizzle migration.

### A port is busy

Change `PORT` in `.env`. Update the target in `apps/web/vite.config.ts` if the API port changes.

## Documentation

- [Product specification](HOP_PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Repository structure](docs/hop-structure.md)
- [Web app README](apps/web/README.md)
