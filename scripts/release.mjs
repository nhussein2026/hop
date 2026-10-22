// Releases a new version of Hop: `yarn release <major|minor|patch>`.
// How to pick the bump is in docs/DEVELOPMENT.md, "Versions and Releases".
//
// It refuses to run unless master is clean, up to date and passes every check. Then it sets the
// version in every package.json, moves the changelog's Unreleased entries under the new version,
// commits and tags. Pushing is left to you, so nothing leaves this machine until you decide.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const repository = 'https://github.com/nhussein2026/hop';
const bumps = ['major', 'minor', 'patch'];

export function nextVersion(current, bump) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`package.json has version "${current}", which isn't MAJOR.MINOR.PATCH.`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * The changelog with its Unreleased entries moved under the new version, and those entries alone.
 * `previousTag` is undefined for the first release, which has nothing to compare with.
 */
export function releaseChangelog(text, version, previousTag, date) {
  const heading = '## [Unreleased]\n';
  const start = text.indexOf(heading);
  if (start === -1) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading.');
  const bodyStart = start + heading.length;
  const rest = text.slice(bodyStart).search(/^## \[|^\[Unreleased\]:/m);
  const bodyEnd = rest === -1 ? text.length : bodyStart + rest;
  const entries = text.slice(bodyStart, bodyEnd).trim();
  if (!/^- /m.test(entries)) throw new Error('Nothing is listed under Unreleased in CHANGELOG.md, so there is nothing to release.');

  const released = `${text.slice(0, bodyStart)}\n## [${version}] - ${date}\n\n${entries}\n\n${text.slice(bodyEnd)}`;
  const versionLink = previousTag ? `${repository}/compare/${previousTag}...v${version}` : `${repository}/releases/tag/v${version}`;
  const links = `[Unreleased]: ${repository}/compare/v${version}...HEAD\n[${version}]: ${versionLink}`;
  const linked = released.replace(/^\[Unreleased\]: .*$/m, links);
  if (linked === released) throw new Error('CHANGELOG.md has no "[Unreleased]: …" link at the bottom.');
  return { changelog: linked, entries };
}

/** A package.json's text with its top-level version replaced, keeping its formatting. */
export function withVersion(packageJson, version) {
  const updated = packageJson.replace(/^( {2}"version":\s*)"[^"]*"/m, `$1"${version}"`);
  if (updated === packageJson && !packageJson.includes(`  "version": "${version}"`)) throw new Error('has no version field');
  return updated;
}

/** Today on this machine's calendar; toISOString() would give the UTC date. */
function today() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function check(command, args) {
  console.log(`\n==> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`\n${command} ${args.join(' ')} failed, so nothing was released.`);
}

/** The root package.json and one per workspace, so every part of Hop carries the same version. */
function packageFiles() {
  const { workspaces } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const files = [join(root, 'package.json')];
  for (const pattern of workspaces) {
    const parent = join(root, pattern.replace(/\/\*$/, ''));
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const file = join(parent, entry.name, 'package.json');
      if (entry.isDirectory() && existsSync(file)) files.push(file);
    }
  }
  return files;
}

function release(bump) {
  if (!bumps.includes(bump)) throw new Error('Usage: yarn release <major|minor|patch>');
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'master') throw new Error('Releases are made from master. Merge your branch first.');
  if (git('status', '--porcelain')) throw new Error('There are uncommitted changes. Commit or remove them first.');
  try {
    git('fetch', '--quiet', 'origin', 'master');
  } catch {
    console.warn('GitHub could not be reached, so master is compared with the last fetched copy.');
  }
  if (Number(git('rev-list', '--count', 'HEAD..origin/master')) > 0) throw new Error('GitHub has commits that this master lacks. Pull first.');

  const previous = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  const version = nextVersion(previous, bump);
  const tag = `v${version}`;
  if (git('tag', '--list', tag)) throw new Error(`The tag ${tag} already exists.`);
  const previousTag = git('tag', '--list', `v${previous}`) || undefined;
  const { changelog, entries } = releaseChangelog(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), version, previousTag, today());

  console.log(`Releasing ${tag} (was v${previous}).`);
  check('yarn', ['build']);
  check('yarn', ['test']);
  check('yarn', ['workspace', 'web', 'lint']);

  const files = packageFiles();
  for (const file of files) {
    try {
      writeFileSync(file, withVersion(readFileSync(file, 'utf8'), version));
    } catch (error) {
      throw new Error(`${relative(root, file)} ${error.message}.`);
    }
  }
  writeFileSync(join(root, 'CHANGELOG.md'), changelog);

  git('add', 'CHANGELOG.md', ...files.map((file) => relative(root, file)));
  git('commit', '--quiet', '-m', `chore(release): ${tag}`);
  git('tag', '--annotate', tag, '-m', `Hop ${tag}\n\n${entries}`);

  console.log(`\nReleased ${tag} on this machine. Nothing has been pushed yet.`);
  console.log(`Publish it:            git push origin master ${tag}`);
  console.log('Then on the server:    sudo /opt/hop/deploy/update.sh');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    release(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
