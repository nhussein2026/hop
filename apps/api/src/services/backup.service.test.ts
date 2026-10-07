import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { backupService } from './backup.service.js';

test('backupService.export creates a snapshot with all persisted tables', () => {
  const backupDir = mkdtempSync(join(tmpdir(), 'hop-backup-'));

  const result = backupService.exportDatabase({ backupDir });

  assert.ok(result.filePath.endsWith('.json'));
  assert.ok(result.filePath.startsWith(backupDir));

  const snapshot = JSON.parse(readFileSync(result.filePath, 'utf8'));
  assert.equal(snapshot.version, 1);
  assert.ok(Array.isArray(snapshot.goals));
  assert.ok(Array.isArray(snapshot.tasks));
  assert.ok(Array.isArray(snapshot.habits));
  assert.ok(Array.isArray(snapshot.events));
});

test('backupService.runDailyBackup creates at most one backup per day', () => {
  const backupDir = mkdtempSync(join(tmpdir(), 'hop-backup-'));
  const now = new Date('2026-10-07T08:00:00.000Z');

  const first = backupService.runDailyBackup({ backupDir, now });
  const second = backupService.runDailyBackup({ backupDir, now: new Date('2026-10-07T20:00:00.000Z') });

  assert.ok(first);
  assert.equal(second, null);
  assert.equal(backupService.listBackups({ backupDir }).length, 1);
});

test('backupService.pruneBackups keeps recent daily backups and one backup per recent week', () => {
  const backupDir = mkdtempSync(join(tmpdir(), 'hop-backup-'));
  const start = new Date('2026-08-01T12:00:00.000Z');

  for (let day = 0; day < 60; day += 1) {
    backupService.exportDatabase({ backupDir, now: new Date(start.getTime() + day * 24 * 60 * 60 * 1000) });
  }

  const removed = backupService.pruneBackups({ backupDir, keepDays: 7, keepWeeks: 4 });
  const remaining = backupService.listBackups({ backupDir }).map((backup) => backup.date);

  assert.ok(removed.length > 0);
  assert.equal(remaining[0], '2026-09-29');
  assert.ok(remaining.includes('2026-09-23'));
  assert.ok(!remaining.includes('2026-09-22'));
  assert.ok(remaining.includes('2026-09-20'));
  assert.ok(!remaining.includes('2026-08-01'));
  assert.equal(new Set(remaining).size, remaining.length);
});
