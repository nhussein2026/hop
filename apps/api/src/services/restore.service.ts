import { readFileSync } from 'node:fs';

import { BACKUP_TABLES, backupSnapshotSchema } from '@hop/validation';
import type { BackupSnapshot, BackupTable } from '@hop/validation';

import { InvalidInputError } from '../errors.js';
import { backupRepository } from '../repositories/backup.repository.js';
import { backupService } from './backup.service.js';

export type RestorePreview = {
  version: number;
  exportedAt: string;
  tables: { table: BackupTable; current: number; incoming: number }[];
};

export type RestoreResult = RestorePreview & {
  /** Backup of the data as it was just before the restore, for undoing it. */
  safetyBackup: string;
};

/** Check that a backup can be restored, and describe it. Throws InvalidInputError with a readable reason. */
function parseSnapshot(input: unknown): BackupSnapshot {
  const result = backupSnapshotSchema.safeParse(input);

  if (!result.success) {
    const issue = result.error.issues[0];
    const location = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new InvalidInputError(`This file is not a Hop backup that can be restored. ${location}${issue?.message ?? 'Invalid backup'}`);
  }

  return result.data;
}

function describe(snapshot: BackupSnapshot): RestorePreview {
  const current = backupRepository.countRows();

  return {
    version: snapshot.version,
    exportedAt: snapshot.exportedAt,
    tables: BACKUP_TABLES.map((table) => ({ table, current: current[table], incoming: snapshot[table].length })),
  };
}

export type RestoreTestResult = {
  fileName: string;
  exportedAt: string;
  records: number;
};

export const restoreService = {
  /**
   * Prove the latest backup can be restored: load it into a scratch database and check that every
   * row arrived. Throws InvalidInputError when there is no backup or it cannot be restored.
   */
  testLatestBackup(): RestoreTestResult {
    const latest = backupService.listBackups()[0];

    if (!latest) {
      throw new InvalidInputError('There is no backup to test yet. Create one with Back up now.');
    }

    let contents: unknown;

    try {
      contents = JSON.parse(readFileSync(latest.filePath, 'utf8'));
    } catch {
      throw new InvalidInputError(`${latest.fileName} could not be read as a Hop backup.`);
    }

    const snapshot = parseSnapshot(contents);
    const restored = backupRepository.restoreIntoScratch(snapshot);
    const missing = BACKUP_TABLES.find((table) => restored[table] !== snapshot[table].length);

    if (missing) {
      throw new InvalidInputError(`Restore test failed: ${missing} has ${restored[missing]} of ${snapshot[missing].length} records after restoring ${latest.fileName}.`);
    }

    return {
      fileName: latest.fileName,
      exportedAt: snapshot.exportedAt,
      records: BACKUP_TABLES.reduce((total, table) => total + restored[table], 0),
    };
  },

  preview(input: unknown): RestorePreview {
    return describe(parseSnapshot(input));
  },

  /**
   * Replace all data with the backup. A safety backup of the current data is written first, so the
   * restore itself can be undone by restoring that file.
   */
  restore(input: unknown): RestoreResult {
    const snapshot = parseSnapshot(input);
    const preview = describe(snapshot);
    const safetyBackup = backupService.exportDatabase();

    try {
      backupRepository.replaceAllTables(snapshot);
    } catch (error) {
      throw new InvalidInputError(`The backup could not be applied, and your data was not changed. ${error instanceof Error ? error.message : ''}`.trim());
    }

    return { ...preview, safetyBackup: safetyBackup.fileName };
  },
};
