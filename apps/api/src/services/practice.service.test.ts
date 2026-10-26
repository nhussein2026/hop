import test from 'node:test';
import assert from 'node:assert/strict';

import { ConflictError, InvalidInputError } from '../errors.js';
import { goalService } from './goal.service.js';
import { levelCheckpoints, practiceService } from './practice.service.js';
import { settingsService } from './settings.service.js';

test('level checkpoints follow İTÜ TÖMER’s course lengths and end at the exam', () => {
  const steps = levelCheckpoints('A2', 'C1', '2026-10-19', '2027-07-01', 'İTÜ TÖMER certificate exam');

  // 255 days shared as A2 8, B1 9, B2 9, C1 10 weeks.
  assert.deepEqual(steps, [
    { level: 'A2', title: 'Finish A2', date: '2026-12-15' },
    { level: 'B1', title: 'Finish B1', date: '2027-02-16' },
    { level: 'B2', title: 'Finish B2', date: '2027-04-21' },
    { level: 'C1', title: 'C1: İTÜ TÖMER certificate exam', date: '2027-07-01' },
  ]);
});

test('settings refuse track changes before a track exists', () => {
  assert.equal(settingsService.get().languageTrack, null);
  assert.throws(() => settingsService.update({ languageTrack: { level: 'B1' } }), InvalidInputError);
});

test('setup creates the goal, its checkpoints and the starter plan, once', () => {
  assert.throws(() => practiceService.setup({ level: 'A2', target: 'C1', examDate: '2020-01-01' }), InvalidInputError);

  const result = practiceService.setup({ level: 'A2', target: 'C1', examDate: '2030-07-01' });

  assert.equal(result.goal.name, 'Reach C1 in Turkish');
  assert.deepEqual(result.goal.criteria.map((c) => c.text), ['Finish A2', 'Finish B1', 'Finish B2', 'Score 70 or more on a full practice test', 'Pass the İTÜ TÖMER certificate exam']);
  assert.deepEqual(result.milestones.map((m) => m.title), ['Finish A2', 'Finish B1', 'Finish B2', 'C1: İTÜ TÖMER certificate exam']);
  assert.equal(result.milestones.at(-1)?.date, '2030-07-01');
  assert.equal(result.settings.languageTrack?.goalId, result.goal.id);
  assert.deepEqual(result.settings.languageTrack?.exam.sections, { listening: 20, reading: 30, writing: 25, speaking: 25 });

  // The starter plan: 180 minutes from Monday to Saturday, a lighter Sunday.
  const minutesOn = (day: number) => result.activities.filter((a) => a.days.includes(day)).reduce((sum, a) => sum + a.minutes, 0);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(minutesOn), [85, 180, 180, 180, 180, 180, 180]);

  assert.deepEqual([result.note?.title, result.note?.pinned, result.note?.topics], ['Türkçe: mistakes I keep making', true, ['Türkçe']]);

  assert.throws(() => practiceService.setup({ level: 'A2', target: 'C1', examDate: '2030-07-01' }), ConflictError);
  assert.equal(goalService.getAll().filter((g) => g.name === 'Reach C1 in Turkish').length, 1);

  // Moving up a level changes only that field.
  const updated = settingsService.update({ languageTrack: { level: 'B1' } }).languageTrack;
  assert.deepEqual([updated?.level, updated?.target, updated?.goalId], ['B1', 'C1', result.goal.id]);
});

test('a planned activity is logged once a day; other practice adds up', () => {
  const activity = practiceService.createActivity({ area: 'speaking', title: 'Shadowing', minutes: 15, days: [3, 1] });
  assert.deepEqual([activity.days, activity.tier], [[1, 3], 'standard']);
  assert.equal(practiceService.createActivity({ area: 'words', title: 'Anki reviews', minutes: 20, tier: 'minimum' }).tier, 'minimum');

  const first = practiceService.logSession({ date: '2026-10-19', minutes: 15, activityId: activity.id });
  const again = practiceService.logSession({ date: '2026-10-19', minutes: 25, activityId: activity.id, note: 'Did extra' });
  assert.equal(again.id, first.id);
  assert.deepEqual([again.area, again.minutes, again.note], ['speaking', 25, 'Did extra']);

  practiceService.logSession({ date: '2026-10-19', minutes: 40, area: 'reading', note: 'Class homework' });
  practiceService.logSession({ date: '2026-10-19', minutes: 10, area: 'reading' });
  assert.equal(practiceService.getSessions('2026-10-19', '2026-10-19').length, 3);

  assert.throws(() => practiceService.updateSession(first.id, { area: 'writing' }), InvalidInputError);
  assert.throws(() => practiceService.logSession({ date: '2026-10-19', minutes: 5, activityId: 'missing' }), InvalidInputError);

  const totals = practiceService.totals();
  assert.equal(totals.minutes.speaking, 25);
  assert.equal(totals.minutes.reading, 50);
  assert.equal(totals.days, 1);

  // Removing the activity keeps what was practised.
  assert.equal(practiceService.deleteActivity(activity.id), true);
  assert.equal(practiceService.getSessions('2026-10-19', '2026-10-19').find((s) => s.id === first.id)?.activityId, null);
});

test('practice test scores stay within each section’s points', () => {
  const result = practiceService.createTest({ date: '2026-11-01', title: 'Sample B1 paper', scores: { reading: 21, listening: 14 } });
  assert.deepEqual(result.max, { listening: 20, reading: 30, writing: 25, speaking: 25 });

  assert.throws(() => practiceService.createTest({ date: '2026-11-02', scores: { listening: 21 } }), InvalidInputError);
  assert.throws(() => practiceService.updateTest(result.id, { scores: { reading: 31 } }), InvalidInputError);
  assert.deepEqual(practiceService.updateTest(result.id, { scores: { reading: 24, listening: 15, writing: 17, speaking: 18 } })?.scores, { reading: 24, listening: 15, writing: 17, speaking: 18 });
});

test('a skill check keeps its counts and can be changed and deleted', () => {
  const check = practiceService.createCheck({ date: '2026-10-24', area: 'listening', metrics: { mode: 'dictation', correct: 41, total: 52 } });
  assert.equal(check.task, '');
  assert.equal(check.level, null);

  const judged = practiceService.updateCheck(check.id, { level: 'A2', judgedBy: 'teacher', note: 'Missed most suffixes' });
  assert.equal(judged?.judgedBy, 'teacher');
  assert.deepEqual(judged?.metrics, { mode: 'dictation', correct: 41, total: 52 });

  assert.equal(practiceService.updateCheck('missing', { note: 'x' }), undefined);
  assert.equal(practiceService.deleteCheck(check.id), true);
  assert.equal(practiceService.getChecks().some((c) => c.id === check.id), false);
});
