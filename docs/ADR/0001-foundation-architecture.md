# ADR 0001: Foundation Architecture

## Status

Accepted

## Context

Hop is a private personal growth and career application intended for daily use
across trusted devices such as a phone, laptop, and lab computer.

The application must remain simple, maintainable, private, and portable while
supporting future features such as goals, tasks, habits, career opportunities,
projects, skills, reviews, notifications, and PWA access.

## Decision

Hop will use:

- React + TypeScript + Vite for the web application
- Node.js + TypeScript for the API
- SQLite for persistence
- Zod for runtime validation
- shared TypeScript domain packages
- a feature-oriented frontend architecture
- a layered backend architecture
- Docker for reproducible deployment
- private network access for trusted devices

## Consequences

### Positive

- Strong type safety
- Clear separation of concerns
- Simple local persistence
- Easy backups
- Good multi-device architecture
- Suitable for incremental development
- Avoids unnecessary cloud infrastructure

### Negative

- More structure than the original single-file application
- Requires an explicit database migration strategy
- Requires authentication for remote/private access

## Rejected Alternatives

### Plain JSON as the permanent datastore

Useful for the prototype, but increasingly difficult once Hop has relationships,
history, tasks, habits, events, and multi-device usage.

### Client-side-only application

Would make multi-device synchronization and centralized persistence difficult.

### Public SaaS architecture

Unnecessary for a private personal application and contrary to the project's
privacy-first requirements.