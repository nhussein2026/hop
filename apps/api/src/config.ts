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
