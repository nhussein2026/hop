# Changelog

Every release of Hop, newest first. Entries say what changed for you, not how the code changed.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), with MAJOR, MINOR and PATCH defined for Hop in [Development](docs/DEVELOPMENT.md#versions-and-releases).

## [Unreleased]

## [1.0.0] - 2026-10-22

### Added

- The first numbered release. It covers everything built so far: Today, Plan, Calendar, Türkçe, İTÜ, Goals, Career, Growth (with Reading and Radar), Notes (with Accounts), Review and Settings, plus quick add, search, undo, notifications, daily backups with tested restores, password sign-in, and an installable app that opens offline.
- Settings shows which version of Hop this device runs. When the server has a different version, it offers a reload.
- `/api/health` reports the server's version.

### Changed

- `deploy/update.sh` installs the newest release (the highest `vX.Y.Z` tag) instead of the newest commit on `master`. It refuses to take Hop back to an older release, and after the restart it checks that the new version is the one answering.

[Unreleased]: https://github.com/nhussein2026/hop/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nhussein2026/hop/releases/tag/v1.0.0
