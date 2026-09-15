hop/
│
├── apps/
│   │
│   ├── web/                         # React + TypeScript + Vite + PWA
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   ├── manifest.webmanifest
│   │   │   └── ...
│   │   │
│   │   └── src/
│   │       ├── app/
│   │       │   ├── router/
│   │       │   ├── providers/
│   │       │   ├── layouts/
│   │       │   └── app.tsx
│   │       │
│   │       ├── components/
│   │       │   ├── ui/
│   │       │   ├── layout/
│   │       │   ├── feedback/
│   │       │   └── shared/
│   │       │
│   │       ├── features/
│   │       │   ├── today/
│   │       │   ├── tasks/
│   │       │   ├── goals/
│   │       │   ├── career/
│   │       │   ├── growth/
│   │       │   ├── planning/
│   │       │   └── reviews/
│   │       │
│   │       ├── hooks/
│   │       ├── lib/
│   │       ├── services/
│   │       ├── stores/
│   │       ├── types/
│   │       └── main.tsx
│   │
│   └── api/                         # Node.js + TypeScript API
│       └── src/
│           ├── app/
│           ├── config/
│           ├── middleware/
│           ├── routes/
│           ├── controllers/
│           ├── services/
│           ├── repositories/
│           ├── db/
│           ├── validation/
│           ├── auth/
│           ├── utils/
│           └── server.ts
│
├── packages/
│   ├── domain/                      # Shared domain types
│   ├── validation/                  # Shared schemas
│   └── config/                      # Shared constants/config
│
├── db/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
│
├── storage/
│   ├── attachments/
│   └── backups/
│
├── docs/
│   ├── HOP_PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DOMAIN.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── UX.md
│   └── ADR/
│
├── scripts/
│
├── docker/
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── docker-compose.yml
└── ...