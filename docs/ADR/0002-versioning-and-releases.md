# ADR 0002: Versions and Releases

## Status

Accepted (2026-10-22)

## Context

Until this decision Hop changed one commit at a time. The version fields meant nothing (`0.0.0` in the web app, `0.1.0` elsewhere), there was no changelog and there were no tags. `deploy/update.sh` installed whatever was newest on `master`, so any pushed commit, finished or not, reached the server on the next update. Features were started as ideas came up.

Hop holds real data and runs every day on its own server. What it runs should be a named, finished state, and what gets built should be decided before it is built.

## Decision

- **One version for all of Hop**, `MAJOR.MINOR.PATCH` ([Semantic Versioning](https://semver.org/)), kept in the root `package.json`. Every workspace carries the same number, because they always ship together and none is published on its own.
- **The numbers describe what an update means for the person running Hop**, since Hop has no outside API consumers. MAJOR means updating needs manual work, or Hop stops accepting something it accepted before. MINOR adds something. PATCH fixes or polishes. The full rules are in [Development](../DEVELOPMENT.md#versions-and-releases).
- **Hop starts at 1.0.0.** It is in daily use with real data. Under SemVer, 0.x promises nothing.
- **Work is planned before it is built**, in [ROADMAP.md](../ROADMAP.md). Only items in the Next version are built.
- **`master` holds only finished work.** Each item is built on its own branch and merged when done, so a fix can be released at any time.
- **Every change adds a line to [CHANGELOG.md](../../CHANGELOG.md)**, written for the user. Commit messages stay [Conventional Commits](https://www.conventionalcommits.org/) and suggest the bump.
- **A release is a tag**, made by `yarn release`. `deploy/update.sh` installs the newest release tag and never goes back to an older one.
- **Other version numbers stay independent.** Migrations are named by timestamp, and the backup snapshot has its own `version` ([Database](../DATABASE.md)). A new snapshot version is MINOR while older backups still restore. Dropping an old one is MAJOR.

## Alternatives Considered

- **Calendar versions (`2026.10.1`)** say when, not what. For an app with one user, whether an update needs care matters more than its date.
- **Staying on 0.x** keeps no compatibility promises, which is the opposite of what a daily-use app with real data needs.
- **A version per workspace** would only invite mismatches between parts that always ship together.
- **GitHub Issues and Milestones for planning** look better on GitHub. But planning happens in conversations and in `docs/proposals/`, and a file next to them works offline and in every session. This can be revisited.
- **A changelog generated from commits** would describe code, not what changed for the user.

## Consequences

- Pushing to GitHub no longer changes what the server runs. Pushing a release tag does, on the next `update.sh`.
- The server's checkout sits on the release tag (a detached HEAD), not on `master`.
- Every request goes through a short planning step before code. Ideas that arrive mid-version wait in the Backlog.
- Releasing takes one command and one push.
