import test from 'node:test';
import assert from 'node:assert/strict';

import { habitService } from './habit.service.js';

test('habitService.create assigns frequency defaults', () => {
  const habit = habitService.create({ name: 'Study AI for 45 minutes' });

  assert.equal(habit.frequency, 'daily');
  assert.equal(habit.targetPerWeek, 7);
  assert.equal(habit.active, true);
});

test('habitService.complete prevents duplicate completion for a local date', () => {
  const habit = habitService.create({ name: 'Review goals' });
  const first = habitService.complete(habit.id, '2026-09-17');
  const second = habitService.complete(habit.id, '2026-09-17');

  assert.ok(first);
  assert.equal(second?.id, first.id);
  assert.equal(habitService.getCompletions('2026-09-17').filter((item) => item.habitId === habit.id).length, 1);
});

test('habitService.complete ignores habits that do not exist', () => {
  assert.equal(habitService.complete('missing-habit', '2026-09-17'), undefined);
});

test('habitService.getCompletions returns completions within an inclusive date range', () => {
  const habit = habitService.create({ name: 'Walk' });
  habitService.complete(habit.id, '2026-09-10');
  habitService.complete(habit.id, '2026-09-14');
  habitService.complete(habit.id, '2026-09-20');

  const dates = habitService.getCompletions('2026-09-10', '2026-09-14').filter((item) => item.habitId === habit.id).map((item) => item.date).sort();

  assert.deepEqual(dates, ['2026-09-10', '2026-09-14']);
});
