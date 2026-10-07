import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

export function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL ?? './storage/hop.db') {
  const value = databaseUrl.trim();

  if (!value || value === ':memory:') {
    return value;
  }

  if (value.startsWith('file:') || value.startsWith('sqlite:') || value.startsWith('/')) {
    return value;
  }

  if (value.startsWith('./') || value.startsWith('../') || !value.includes(':')) {
    return resolve(repoRoot, value);
  }

  return value;
}

export function resolvePort(port = process.env.PORT ?? '4321') {
  const parsed = Number.parseInt(port, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4321;
}

export function resolveBackupDirectory(backupDir = process.env.BACKUP_DIR ?? './storage/backups') {
  const value = backupDir.trim() || './storage/backups';
  return value.startsWith('/') ? value : resolve(repoRoot, value);
}

/**
 * Hop has no authentication yet, so it only listens on the local machine unless HOST is set explicitly.
 */
export function resolveHost(host = process.env.HOST ?? '127.0.0.1') {
  return host.trim() || '127.0.0.1';
}

export function resolveMigrationsFolder() {
  return resolve(repoRoot, 'db/migrations');
}

/** The built web app (`yarn workspace web build`). The API serves it when the directory exists. */
export function resolveWebDistDirectory(webDistDir = process.env.WEB_DIST_DIR ?? './apps/web/dist') {
  const value = webDistDir.trim() || './apps/web/dist';
  return value.startsWith('/') ? value : resolve(repoRoot, value);
}
