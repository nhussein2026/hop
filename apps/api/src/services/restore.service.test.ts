import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { InvalidInputError } from '../errors.js';
import { backupRepository } from '../repositories/backup.repository.js';
import { backupService } from './backup.service.js';
import { courseService } from './course.service.js';
import { libraryService } from './library.service.js';
import { findService, ideaService } from './research.service.js';
import { goalService } from './goal.service.js';
import { habitService } from './habit.service.js';
import { opportunityService } from './opportunity.service.js';
import { projectService } from './project.service.js';
import { restoreService } from './restore.service.js';
import { taskService } from './task.service.js';

// Round-trips through JSON, exactly like a downloaded backup file.
function exportSnapshot() {
  return JSON.parse(JSON.stringify(backupService.createSnapshot())) as ReturnType<typeof backupService.createSnapshot>;
}

test('restore replaces all data with the backup and keeps a safety backup of the previous data', () => {
  const goal = goalService.create({ name: 'Goal in the backup', criteria: ['Done'] });
  taskService.create({ title: 'Task in the backup', goalId: goal.id });
  projectService.create({ name: 'Project in the backup', stack: ['TypeScript'] });
  opportunityService.create({ title: 'Role in the backup', technologyTags: ['SQLite'] });
  const habit = habitService.create({ name: 'Habit in the backup' });
  habitService.complete(habit.id, '2026-10-01');
  const snapshot = exportSnapshot();

  goalService.create({ name: 'Goal added after the backup', criteria: ['Done'] });

  const preview = restoreService.preview(snapshot);
  assert.equal(preview.tables.find((table) => table.table === 'goals')?.incoming, snapshot.goals.length);
  assert.equal(preview.tables.find((table) => table.table === 'goals')?.current, snapshot.goals.length + 1);

  const result = restoreService.restore(snapshot);

  assert.deepEqual(exportSnapshot().goals, snapshot.goals);
  assert.deepEqual(backupRepository.readAllTables(), Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'version' && key !== 'exportedAt')));
  assert.deepEqual(projectService.getAll().find((project) => project.name === 'Project in the backup')?.stack, ['TypeScript']);
  assert.deepEqual(opportunityService.getAll().find((item) => item.title === 'Role in the backup')?.technologyTags, ['SQLite']);

  const safety = backupService.findBackup(result.safetyBackup);
  assert.ok(safety);
  const saved = JSON.parse(readFileSync(safety.filePath, 'utf8')) as { goals: { name: string }[] };
  assert.ok(saved.goals.some((item) => item.name === 'Goal added after the backup'));
});

test('restore rejects a file that is not a valid backup and leaves data unchanged', () => {
  goalService.create({ name: 'Still here', criteria: ['Done'] });
  const before = backupRepository.countRows();

  assert.throws(() => restoreService.restore({ version: 1 }), InvalidInputError);
  assert.throws(() => restoreService.restore({ ...exportSnapshot(), version: 3 }), /Only version 1 and 2/);

  const broken = exportSnapshot();
  broken.goals[0] = { ...broken.goals[0]!, status: 'unknown' as never };
  assert.throws(() => restoreService.preview(broken), /goals\.0\.status/);

  assert.deepEqual(backupRepository.countRows(), before);
});

test('restore accepts backups from older versions that had several reviews in one week', () => {
  const snapshot = exportSnapshot();
  const review = { id: 'r1', weekStart: '2026-09-14', wins: '', progress: '', career: '', learning: '', projects: '', problems: '', nextWeek: '', energy: null, focus: null, change: '', topThree: [], status: 'completed' as const, facts: null, completedAt: null, createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' };
  snapshot.weeklyReviews = [review, { ...review, id: 'r2' }];

  restoreService.restore(snapshot);

  assert.equal(backupRepository.countRows().weeklyReviews, 2);
});

test('replaceAllTables rolls back completely when a row cannot be inserted', () => {
  goalService.create({ name: 'Must survive a failed restore', criteria: ['Done'] });
  const before = exportSnapshot();
  const invalid = exportSnapshot();
  // Two completions for the same habit and date violate the table's unique constraint.
  invalid.habitCompletions = [
    { id: 'c1', habitId: 'h1', date: '2026-10-01', completedAt: '2026-10-01T08:00:00.000Z' },
    { id: 'c2', habitId: 'h1', date: '2026-10-01', completedAt: '2026-10-01T09:00:00.000Z' },
  ];

  assert.throws(() => backupRepository.replaceAllTables(invalid));

  assert.deepEqual(exportSnapshot().goals, before.goals);
  assert.deepEqual(exportSnapshot().habitCompletions, before.habitCompletions);
});

test('restore accepts a version 1 backup and fills the newer tables and columns with defaults', () => {
  const current = exportSnapshot();
  const habit = { id: 'h-v1', name: 'Read', frequency: 'daily', targetPerWeek: 7, goalId: null, active: true, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' };
  const v1 = {
    version: 1,
    exportedAt: current.exportedAt,
    goals: [], tasks: [], habits: [habit], habitCompletions: [], events: [], opportunities: [], projects: [], skills: [], evidence: [], weeklyReviews: [],
  };

  restoreService.restore(v1);

  assert.deepEqual(habitService.getAll().map((item) => [item.id, item.days, item.minutes]), [['h-v1', [0, 1, 2, 3, 4, 5, 6], 30]]);
  assert.equal(backupRepository.countRows().goalCriteria, 0);
});

test('testLatestBackup restores the newest backup into a scratch database without changing data', () => {
  goalService.create({ name: 'Checked by the restore test', criteria: ['One criterion'] });
  const backup = backupService.exportDatabase();
  const before = backupRepository.countRows();

  const result = restoreService.testLatestBackup();

  assert.equal(result.fileName, backup.fileName);
  assert.equal(result.records, Object.values(before).reduce((total, count) => total + count, 0));
  assert.deepEqual(backupRepository.countRows(), before);
});

test('İTÜ and Radar data, including library files, survive a backup and restore', () => {
  const course = courseService.create({ code: 'BLG 527E', name: 'Machine Learning', schedule: [{ day: 1, start: '09:30', end: '12:30', room: 'EEB 5302' }], grading: [{ title: 'Final', type: 'final', weight: 100 }] });
  const exam = libraryService.create({ kind: 'past-exam', title: 'Midterm 2024', courseId: course.id });
  const pdf = Buffer.from('%PDF-1.7\nbackup test\n');
  libraryService.attachFile(exam.id, 'midterm.pdf', pdf);
  const find = findService.create({ kind: 'repo', title: 'nanoGPT', why: 'Small enough to read', url: 'https://github.com/karpathy/nanoGPT' });
  ideaService.create({ title: 'Course planner', courseIds: [course.id], findIds: [find.id] });
  const snapshot = exportSnapshot();

  libraryService.delete(exam.id);
  courseService.delete(course.id);
  restoreService.restore(snapshot);

  assert.deepEqual(courseService.getAll().find((c) => c.id === course.id)?.schedule, course.schedule);
  assert.equal(libraryService.getFile(exam.id)?.data.toString('latin1'), pdf.toString('latin1'));
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.status, 'converted');
});
