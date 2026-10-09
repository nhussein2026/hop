# Developing Hop

## Setup

```bash
corepack enable          # once, if yarn is missing
yarn install
cp .env.example .env
yarn dev                 # API on :4321 (tsx watch), web on :5173 (Vite)
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the API on the `PORT` from the root `.env`, keeping the browser's `Host` header so the API's same-origin check passes. The service worker is disabled in development; run `yarn build && yarn start` to test PWA and offline behavior.

## Workspaces

| Workspace | Name for `yarn workspace` |
| --- | --- |
| `apps/api` | `@hop/api` |
| `apps/web` | `web` (not `@hop/web`) |
| `packages/domain` | `@hop/domain` |
| `packages/validation` | `@hop/validation` |

## Commands

| Command | What it does |
| --- | --- |
| `yarn dev` | API and web in watch mode |
| `yarn build` | Typecheck everything and build the web app into `apps/web/dist` |
| `yarn start` | Serve the API and built web app on one port |
| `yarn test` | Run every workspace's tests |
| `yarn typecheck` | Typecheck every workspace |
| `yarn workspace web lint` | ESLint for the web app |
| `yarn workspace @hop/api db:generate --name <name>` | Generate a migration from schema changes |
| `yarn workspace @hop/api db:studio` | Browse the database |
| `yarn workspace @hop/api auth:reset` | Remove the password and sessions |

## Where Code Goes

A new feature usually touches every layer, in this order:

1. **Domain type** in `packages/domain/src/<area>.ts`, exported from `index.ts`.
2. **Request schemas** in `packages/validation/src/<area>.ts` (`create…Schema`, `update…Schema`, both `.strict()`).
3. **Table** in `apps/api/src/db/schema/<area>.ts`, then a migration (see [DATABASE.md](DATABASE.md#changing-the-schema)).
4. **Repository** in `apps/api/src/repositories/`: queries only.
5. **Service** in `apps/api/src/services/`: rules and validation of state, throwing `InvalidInputError` or `ConflictError` from `errors.ts`.
6. **Routes** in `apps/api/src/server.ts`. Simple collections can use `crudRoutes`.
7. **Backups**: add the table to the snapshot schema and the backup repository.
8. **Web**: an endpoint in `store/HopStore.tsx`, actions in `store/actions.ts` (through `commit()`), derived logic in `lib/`, UI in `screens/` and `editors/`.

Conventions:

- Keep repositories free of business rules, and keep services free of HTTP.
- Derive values in `lib/` rather than storing them. Keep those functions pure and tested.
- Use `lib/dates.ts` for anything date-related. Never use `toISOString().slice(0, 10)` for "today".
- Comments explain *why*, not *what*. Match the surrounding style: the web app uses no semicolons and the API does.

## Tests

Tests use Node's built-in test runner through `tsx`, next to the code they test (`*.test.ts`).

- **API** (`apps/api`): services, migrations, auth, backups, and restores. `src/test-setup.ts` points every run at an in-memory database and a temporary backup directory, so tests never touch your data.
- **Web** (`apps/web/src/lib`): pure rules for dates, health signals, habits, agenda, and university logic.
- **Validation** (`packages/validation`): schema edge cases.

Run one file with:

```bash
cd apps/api && yarn tsx --import ./src/test-setup.ts --test src/services/task.service.test.ts
```

Before committing: `yarn typecheck && yarn test && yarn workspace web lint`.

## Troubleshooting

**`Cannot find module '@hop/domain'` (or `@hop/validation`).** Yarn sometimes believes the workspace links exist when they don't. Force a relink:

```bash
rm node_modules/.yarn-state.yml && yarn install
```

**Port 4321 is busy.** Another Hop, often `yarn dev` in another terminal, is running. Stop it, or change `PORT` in `.env` (the Vite proxy follows).

**The web app says the API is unavailable.** Start the API (`yarn workspace @hop/api dev`) and refresh.

**Startup says it cannot baseline the database.** The file has only some of Hop's tables. Restore a backup from `storage/backups`, or move the file aside to start fresh.

**`Refusing to listen on <host>`.** A non-local `HOST` was set before a password exists. Start with `HOST=127.0.0.1`, set the password locally, then change `HOST`.
