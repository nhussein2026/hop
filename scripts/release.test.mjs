import test from 'node:test';
import assert from 'node:assert/strict';

import { nextVersion, releaseChangelog, withVersion } from './release.mjs';

const changelog = `# Changelog

Intro.

## [Unreleased]

### Added

- Proven skills.

### Fixed

- A dropdown that opened off screen.

## [1.0.0] - 2026-10-22

### Added

- The first release.

[Unreleased]: https://github.com/nhussein2026/hop/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nhussein2026/hop/releases/tag/v1.0.0
`;

test('nextVersion bumps one part and resets the smaller ones', () => {
  assert.equal(nextVersion('1.4.2', 'major'), '2.0.0');
  assert.equal(nextVersion('1.4.2', 'minor'), '1.5.0');
  assert.equal(nextVersion('1.4.2', 'patch'), '1.4.3');
  assert.equal(nextVersion('0.1.0', 'major'), '1.0.0');
});

test('nextVersion rejects versions that are not MAJOR.MINOR.PATCH', () => {
  assert.throws(() => nextVersion('1.0', 'patch'), /isn't MAJOR\.MINOR\.PATCH/);
  assert.throws(() => nextVersion('1.0.0-rc.1', 'patch'), /isn't MAJOR\.MINOR\.PATCH/);
});

test('releaseChangelog moves Unreleased entries under the new version and leaves Unreleased empty', () => {
  const { changelog: released, entries } = releaseChangelog(changelog, '1.1.0', 'v1.0.0', '2026-11-02');

  assert.equal(entries, '### Added\n\n- Proven skills.\n\n### Fixed\n\n- A dropdown that opened off screen.');
  assert.match(released, /## \[Unreleased\]\n\n## \[1\.1\.0\] - 2026-11-02\n\n### Added\n\n- Proven skills\.\n\n### Fixed\n\n- A dropdown that opened off screen\.\n\n## \[1\.0\.0\] - 2026-10-22\n/);
  assert.match(released, /^\[Unreleased\]: https:\/\/github\.com\/nhussein2026\/hop\/compare\/v1\.1\.0\.\.\.HEAD$/m);
  assert.match(released, /^\[1\.1\.0\]: https:\/\/github\.com\/nhussein2026\/hop\/compare\/v1\.0\.0\.\.\.v1\.1\.0$/m);
  assert.match(released, /^\[1\.0\.0\]: https:\/\/github\.com\/nhussein2026\/hop\/releases\/tag\/v1\.0\.0\n$/m);
});

test('releaseChangelog links the first release to its tag, since there is nothing to compare with', () => {
  const first = '# Changelog\n\n## [Unreleased]\n\n- Everything.\n\n[Unreleased]: https://github.com/nhussein2026/hop/commits/HEAD\n';
  const { changelog: released } = releaseChangelog(first, '1.0.0', undefined, '2026-10-22');

  assert.equal(released, '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-10-22\n\n- Everything.\n\n[Unreleased]: https://github.com/nhussein2026/hop/compare/v1.0.0...HEAD\n[1.0.0]: https://github.com/nhussein2026/hop/releases/tag/v1.0.0\n');
});

test('releaseChangelog refuses to release when nothing is listed under Unreleased', () => {
  const empty = changelog.replace(/## \[Unreleased\][\s\S]*?(?=## \[1\.0\.0\])/, '## [Unreleased]\n\n### Added\n\n');
  assert.throws(() => releaseChangelog(empty, '1.1.0', 'v1.0.0', '2026-11-02'), /Nothing is listed under Unreleased/);
});

test('withVersion changes only the top-level version and keeps the formatting', () => {
  const json = '{\n  "name": "@hop/api",\n  "version": "1.0.0",\n  "dependencies": {\n    "x": { "version": "9.9.9" }\n  }\n}\n';
  assert.equal(withVersion(json, '1.1.0'), json.replace('"version": "1.0.0"', '"version": "1.1.0"'));
  assert.throws(() => withVersion('{\n  "name": "x"\n}\n', '1.1.0'), /no version field/);
});
