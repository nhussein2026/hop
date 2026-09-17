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

  assert.equal(second.id, first.id);
  assert.equal(habitService.getCompletions('2026-09-17').filter((item) => item.habitId === habit.id).length, 1);
});
