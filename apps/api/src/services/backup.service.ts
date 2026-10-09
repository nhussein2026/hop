import { mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BACKUP_SNAPSHOT_VERSION } from '@hop/validation';
import type { BackupSnapshot } from '@hop/validation';

import { resolveBackupDirectory } from '../config.js';
import { backupRepository } from '../repositories/backup.repository.js';

const backupFilePattern = /^hop-backup-(\d{4}-\d{2}-\d{2})T[\d-]+Z\.json$/;

type BackupFile = {
  fileName: string;
  filePath: string;
  date: string;
  sizeBytes: number;
};

type BackupOptions = {
  backupDir?: string;
  now?: Date;
};

type PruneOptions = {
  backupDir?: string;
  keepDays?: number;
  keepWeeks?: number;
};

function weekStart(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return value.toISOString().slice(0, 10);
}

export const backupService = {
  createSnapshot(now = new Date()): BackupSnapshot {
    return {
      version: BACKUP_SNAPSHOT_VERSION,
      exportedAt: now.toISOString(),
      ...backupRepository.readAllTables(),
    };
  },

  exportDatabase({ backupDir = resolveBackupDirectory(), now = new Date() }: BackupOptions = {}): BackupFile {
    mkdirSync(backupDir, { recursive: true });

    const snapshot = this.createSnapshot(now);
    const fileName = `hop-backup-${snapshot.exportedAt.replace(/[:.]/g, '-')}.json`;
    const filePath = join(backupDir, fileName);
    const temporaryPath = `${filePath}.tmp`;

    // Write then rename so a partially written file is never listed as a backup.
    writeFileSync(temporaryPath, JSON.stringify(snapshot, null, 2));
    renameSync(temporaryPath, filePath);

    return {
      fileName,
      filePath,
      date: snapshot.exportedAt.slice(0, 10),
      sizeBytes: statSync(filePath).size,
    };
  },

  /** Path of a backup in the backup directory, or undefined if the name is not a backup file. */
  findBackup(fileName: string, { backupDir = resolveBackupDirectory() }: BackupOptions = {}): BackupFile | undefined {
    return this.listBackups({ backupDir }).find((backup) => backup.fileName === fileName);
  },

  listBackups({ backupDir = resolveBackupDirectory() }: BackupOptions = {}): BackupFile[] {
    let fileNames: string[];

    try {
      fileNames = readdirSync(backupDir);
    } catch {
      return [];
    }

    return fileNames
      .flatMap((fileName) => {
        const date = fileName.match(backupFilePattern)?.[1];

        if (!date) {
          return [];
        }

        const filePath = join(backupDir, fileName);
        return [{ fileName, filePath, date, sizeBytes: statSync(filePath).size }];
      })
      .sort((a, b) => b.fileName.localeCompare(a.fileName));
  },

  pruneBackups({ backupDir = resolveBackupDirectory(), keepDays = 7, keepWeeks = 4 }: PruneOptions = {}): string[] {
    const backups = this.listBackups({ backupDir });
    const recentDays = [...new Set(backups.map((backup) => backup.date))].slice(0, keepDays);
    const keep = new Set(backups.filter((backup) => recentDays.includes(backup.date)).map((backup) => backup.fileName));
    const keptWeeks = new Set<string>();

    // Backups are sorted newest first, so the first backup seen for a week is the one retained.
    for (const backup of backups) {
      const week = weekStart(backup.date);

      if (keptWeeks.size >= keepWeeks && !keptWeeks.has(week)) {
        break;
      }

      if (!keptWeeks.has(week)) {
        keptWeeks.add(week);
        keep.add(backup.fileName);
      }
    }

    const removed = backups.filter((backup) => !keep.has(backup.fileName));

    for (const backup of removed) {
      unlinkSync(backup.filePath);
    }

    return removed.map((backup) => backup.fileName);
  },

  runDailyBackup({ backupDir = resolveBackupDirectory(), now = new Date() }: BackupOptions = {}): BackupFile | null {
    const today = now.toISOString().slice(0, 10);
    const alreadyBackedUp = this.listBackups({ backupDir }).some((backup) => backup.date === today);
    const created = alreadyBackedUp ? null : this.exportDatabase({ backupDir, now });

    this.pruneBackups({ backupDir });
    return created;
  },
};
