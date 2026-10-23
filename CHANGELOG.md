# Changelog

Every release of Hop, newest first. Entries say what changed for you, not how the code changed.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), with MAJOR, MINOR and PATCH defined for Hop in [Development](docs/DEVELOPMENT.md#versions-and-releases).

## [Unreleased]

### Added

- Skill checks on Türkçe → Progress: log a measured result for speaking, writing, listening, reading, vocabulary or grammar (a 2-minute recording, a timed text, a dictation, a test). You enter the counts; Hop shows words per minute, errors per 100 words or % right as you type.
- Each area shows its latest result, its last eight checks as a small trend, and when it was last checked. Every check can be opened from "All checks" to edit or delete, with Undo.

### Fixed

- Renaming a level checkpoint no longer stops "Finished it" from ticking the goal's matching criterion.

## [1.1.0] - 2026-10-23

### Added

- Proven skills: a skill's level now comes from its evidence instead of a self-rating. Each piece of evidence has a kind (Built, Test, Review, Used, Top or Learned), attested kinds name who vouched for them, and proof of a tool skill stops counting after 18 months. An optional notification says when that happens.
- Learned evidence for books, courses and tutorials. It stays in a skill's history but never raises its level. Finishing a book records it as Learned, and earlier "Read …" entries become Learned.
- A completed İTÜ course offers to add its grade as proof.
- Evidence can be edited from the skill drawer and the Evidence tab.
- On a block day, a habit linked to a goal shows that goal's next task on Today, with Start, Done and Skip.

### Changed

- The old self-rated level is still shown where one was set, but new skills don't get one.

## [1.0.0] - 2026-10-22

### Added

- The first numbered release. It covers everything built so far: Today, Plan, Calendar, Türkçe, İTÜ, Goals, Career, Growth (with Reading and Radar), Notes (with Accounts), Review and Settings, plus quick add, search, undo, notifications, daily backups with tested restores, password sign-in, and an installable app that opens offline.
- Settings shows which version of Hop this device runs. When the server has a different version, it offers a reload.
- `/api/health` reports the server's version.

### Changed

- `deploy/update.sh` installs the newest release (the highest `vX.Y.Z` tag) instead of the newest commit on `master`. It refuses to take Hop back to an older release, and after the restart it checks that the new version is the one answering.

[Unreleased]: https://github.com/nhussein2026/hop/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/nhussein2026/hop/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nhussein2026/hop/releases/tag/v1.0.0
