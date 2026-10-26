import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { InvalidInputError } from '../errors.js';
import { backupRepository } from '../repositories/backup.repository.js';
import { backupService } from './backup.service.js';
import { accountService } from './account.service.js';
import { bookService } from './book.service.js';
import { practiceService } from './practice.service.js';
import { courseService } from './course.service.js';
import { evidenceService } from './evidence.service.js';
import { skillService } from './skill.service.js';
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
    { id: 'c1', habitId: 'h1', date: '2026-10-01', amount: null, completedAt: '2026-10-01T08:00:00.000Z' },
    { id: 'c2', habitId: 'h1', date: '2026-10-01', amount: null, completedAt: '2026-10-01T09:00:00.000Z' },
  ];

  assert.throws(() => backupRepository.replaceAllTables(invalid));

  assert.deepEqual(exportSnapshot().goals, before.goals);
  assert.deepEqual(exportSnapshot().habitCompletions, before.habitCompletions);
});

test('restore accepts a version 1 backup and fills the newer tables and columns with defaults', () => {
  const current = exportSnapshot();
  const habit = { id: 'h-v1', name: 'Read', frequency: 'daily', targetPerWeek: 7, goalId: null, active: true, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' };
  const tick = { id: 'c-v1', habitId: 'h-v1', date: '2026-09-02', completedAt: '2026-09-02T20:00:00.000Z' };
  const v1 = {
    version: 1,
    exportedAt: current.exportedAt,
    goals: [], tasks: [], habits: [habit], habitCompletions: [tick], events: [], opportunities: [], projects: [], skills: [], evidence: [], weeklyReviews: [],
  };

  restoreService.restore(v1);

  assert.deepEqual(habitService.getAll().map((item) => [item.id, item.days, item.minutes, item.unit, item.target, item.minimum]), [['h-v1', [0, 1, 2, 3, 4, 5, 6], 30, 'minutes', 30, null]]);
  // A tick from before amounts means the whole target.
  assert.deepEqual(habitService.getCompletions('2026-09-02').map((item) => item.amount), [null]);
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

test('books, their loans and their reading log survive a backup and restore', () => {
  const book = bookService.create({ title: 'Yapay Zekâ', language: 'tr', topics: ['AI'], takeaways: ['Search is everywhere'] });
  const loan = bookService.addLoan(book.id, { borrowedOn: '2026-10-01', dueOn: '2026-10-15', maxRenewals: 3 })!.loans[0]!;
  bookService.renewLoan(book.id, loan.id, { date: '2026-10-14', dueOn: '2026-10-29' });
  bookService.log(book.id, { date: '2026-10-02', page: 24 });
  const snapshot = exportSnapshot();

  bookService.delete(book.id);
  restoreService.restore(snapshot);

  const restored = bookService.getAll().find((b) => b.id === book.id);
  assert.deepEqual(restored?.takeaways, ['Search is everywhere']);
  assert.deepEqual(restored?.loans.map((l) => [l.dueOn, l.renewedOn]), [['2026-10-29', ['2026-10-14']]]);
  assert.deepEqual(restored?.log.map((entry) => entry.page), [24]);
});

test('the language track’s plan, practice, tests and checks survive a backup and restore', () => {
  const activity = practiceService.createActivity({ area: 'listening', title: 'Podcast', minutes: 25, days: [1, 2, 3] });
  const session = practiceService.logSession({ date: '2026-10-19', minutes: 25, activityId: activity.id });
  const result = practiceService.createTest({ date: '2026-10-20', scores: { reading: 22 }, max: { listening: 25, reading: 25, writing: 25, speaking: 25 } });
  const check = practiceService.createCheck({ date: '2026-10-23', area: 'speaking', task: 'Monologue: my neighbourhood', metrics: { seconds: 120, words: 150, errors: 9 } });
  const snapshot = exportSnapshot();

  practiceService.deleteActivity(activity.id);
  practiceService.deleteTest(result.id);
  practiceService.deleteCheck(check.id);
  restoreService.restore(snapshot);

  assert.deepEqual(practiceService.getActivities().find((a) => a.id === activity.id)?.days, [1, 2, 3]);
  assert.equal(practiceService.getSessions('2026-10-19', '2026-10-19').find((s) => s.id === session.id)?.activityId, activity.id);
  assert.deepEqual(practiceService.getTests().find((t) => t.id === result.id)?.max.reading, 25);
  assert.deepEqual(practiceService.getChecks().find((c) => c.id === check.id)?.metrics, { seconds: 120, words: 150, errors: 9 });
});

test('accounts and pinned notes survive a backup and restore', () => {
  const account = accountService.create({ name: 'Spotify', cost: 59.99, cycle: 'monthly', renewsOn: '2026-11-03', payment: 'Ziraat card' });
  const note = libraryService.create({ kind: 'note', title: 'Bus times', body: '500T at 07:40', pinned: true });
  const snapshot = exportSnapshot();

  accountService.delete(account.id);
  libraryService.delete(note.id);
  restoreService.restore(snapshot);

  assert.equal(accountService.getAll().find((a) => a.id === account.id)?.cost, 59.99);
  assert.equal(libraryService.getAll().find((r) => r.id === note.id)?.pinned, true);
});

test('a backup from before proof levels restores, with defaults for the new skill and evidence fields', () => {
  const current = exportSnapshot();
  const stamp = '2026-10-01T00:00:00.000Z';
  const snapshot = {
    ...current,
    skills: [{ id: 'skill-old', name: 'React', category: 'Frontend', level: 'confident', confidence: 7, lastPracticedAt: '2026-09-30', yearsExperience: 2, notes: null, createdAt: stamp, updatedAt: stamp }],
    evidence: [{ id: 'ev-old', title: 'Shipped the dashboard', description: null, skillId: 'skill-old', skillIds: ['skill-old'], projectId: null, opportunityId: null, goalId: null, url: null, date: '2026-09-30', createdAt: stamp, updatedAt: stamp }],
  };

  restoreService.restore(snapshot);

  const skill = skillService.getById('skill-old');
  assert.deepEqual([skill?.level, skill?.type, skill?.focus, skill?.listed, skill?.bar], ['confident', 'tool', 'keep', false, null]);
  const item = evidenceService.getById('ev-old');
  assert.deepEqual([item?.kind, item?.by, item?.result, item?.courseId], [null, null, null, null]);
});

test('proof fields survive a backup and restore', () => {
  const skill = skillService.create({ name: 'Machine learning', type: 'fundamental', focus: 'standout', listed: true, bar: 'An A from İTÜ and a reviewed project.' });
  const item = evidenceService.create({ title: 'Completed BLG 527E', kind: 'test', by: 'İTÜ, BLG 527E', result: 'AA', date: '2027-01-20', courseId: 'course-1', skillIds: [skill.id] });
  const snapshot = exportSnapshot();

  restoreService.restore(snapshot);

  assert.deepEqual(skillService.getById(skill.id), skill);
  assert.deepEqual(evidenceService.getById(item.id), item);
});
