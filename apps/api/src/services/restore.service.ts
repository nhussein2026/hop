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

export const restoreService = {
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
