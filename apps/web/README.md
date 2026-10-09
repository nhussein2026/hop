# Hop Web

Hop's React 19 + TypeScript + Vite progressive web app.

Run it from the repository root:

```bash
yarn dev                  # API and web together
yarn workspace web dev    # web only, at http://localhost:5173
```

During development, Vite proxies `/api` to the API on the `PORT` from the root `.env` (default `4321`). The service worker only runs in production builds (`yarn build && yarn start`).

| Directory | Contents |
| --- | --- |
| `src/screens/` | One component per screen |
| `src/editors/` | Create and edit dialogs, quick add, search |
| `src/components/` | Shared UI: rows, menus, dialogs, icons |
| `src/store/` | Data store (`HopStore.tsx`) and API actions |
| `src/lib/` | Dates, routing, and pure product rules (tested) |
| `src/styles/` | Design tokens and CSS |
| `public/` | Manifest, service worker, icons |

See the root [README](../../README.md), [Architecture](../../docs/ARCHITECTURE.md), and [Development](../../docs/DEVELOPMENT.md).
