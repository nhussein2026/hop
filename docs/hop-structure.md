# Repository Structure

```text
hop/
├── apps/
│   ├── api/                         # Node.js + TypeScript API (@hop/api)
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── auth/                # Password hashing, session cookies
│   │       ├── db/
│   │       │   ├── schema/          # Drizzle table definitions
│   │       │   ├── fixtures/        # SQL fixtures for migration tests
│   │       │   ├── client.ts
│   │       │   └── migrate.ts       # Applies db/migrations on startup
│   │       ├── repositories/        # Persistence-only operations
│   │       ├── services/            # Business logic
│   │       ├── scripts/             # Maintenance scripts (auth:reset)
│   │       ├── config.ts
│   │       ├── errors.ts
│   │       ├── static.ts            # Serves the built web app
│   │       └── server.ts            # HTTP routes
│   │
│   └── web/                         # React + TypeScript + Vite PWA
│       ├── public/                  # Manifest, service worker, icons
│       └── src/
│           ├── components/          # Shared UI pieces
│           ├── editors/             # Create and edit dialogs
│           ├── lib/                 # Dates, routing, rules, API fetch
│           ├── screens/             # One component per screen
│           ├── store/               # Data store and API actions
│           ├── styles/              # CSS
│           ├── App.tsx
│           └── main.tsx
│
├── packages/
│   ├── domain/                      # Shared domain types (@hop/domain)
│   └── validation/                  # Shared Zod schemas (@hop/validation)
│
├── db/
│   └── migrations/                  # Drizzle SQL migrations
│
├── storage/                         # Local database and backups (ignored by Git)
│
├── docs/
│   ├── ADR/                         # Architecture decision records
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── HOP_PRODUCT_SPEC.md
│   ├── SECURITY.md
│   └── hop-structure.md
│
├── .env.example
├── package.json
├── README.md
└── start.sh
```
