import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Loaded before every test file so tests never touch the real database or backup directory.
process.env.DATABASE_URL = ':memory:';
process.env.BACKUP_DIR = mkdtempSync(join(tmpdir(), 'hop-test-backups-'));
