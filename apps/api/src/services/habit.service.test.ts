import test from 'node:test';
import assert from 'node:assert/strict';

import { createHabitSchema, habitCompletionSchema } from '@hop/validation';

import { InvalidInputError } from '../errors.js';
import { bookService } from './book.service.js';
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

test('a habit is counted in a unit, with a target and an optional minimum', () => {
  const reading = habitService.create({ name: 'Read the Arabic book', unit: 'pages', target: 10, minimum: 2, minutes: 20 });
  assert.deepEqual([reading.unit, reading.target, reading.minimum, reading.minutes], ['pages', 10, 2, 20]);

  // Counted in minutes, the target and the minutes are one number.
  const study = habitService.create({ name: 'Fundamentals', minutes: 30 });
  assert.deepEqual([study.unit, study.target, study.minutes, study.minimum], ['minutes', 30, 30, null]);
  assert.deepEqual([habitService.update(study.id, { target: 45 })?.minutes, habitService.update(study.id, { minutes: 20 })?.target], [45, 20]);

  assert.equal(createHabitSchema.safeParse({ name: 'x', unit: 'pages', target: 5, minimum: 6 }).success, false);
  assert.throws(() => habitService.update(reading.id, { target: 1 }), InvalidInputError);
});

test('logging an amount records it, and logging the same day again replaces it', () => {
  const habit = habitService.create({ name: 'Read', unit: 'pages', target: 10, minimum: 2 });

  assert.equal(habitService.complete(habit.id, '2026-10-20', 5)?.amount, 5);
  assert.equal(habitService.complete(habit.id, '2026-10-20', 12)?.amount, 12);
  assert.equal(habitService.complete(habit.id, '2026-10-21')?.amount, null);
  assert.equal(habitService.getCompletions('2026-10-20', '2026-10-21').filter((item) => item.habitId === habit.id).length, 2);
  assert.equal(habitCompletionSchema.safeParse({ date: '2026-10-20', amount: 0 }).success, false);
});

test('a habit counted in pages takes the pages read from its book', () => {
  const habit = habitService.create({ name: 'Read 10 pages', unit: 'pages', target: 10, minimum: 2 });
  const book = bookService.create({ title: 'Kitab', habitId: habit.id });
  bookService.log(book.id, { date: '2026-10-19', page: 30 });

  const first = bookService.log(book.id, { date: '2026-10-20', page: 35 })!;
  assert.deepEqual([first.completion?.amount, first.tick?.amount], [5, 5]);

  // Reading on later the same day updates the amount; there is no new tick to undo.
  const later = bookService.log(book.id, { date: '2026-10-20', page: 42 })!;
  assert.deepEqual([later.completion, later.tick?.amount], [null, 12]);
});

test('a timed habit happens on the days of its times', () => {
  const habit = habitService.create({
    name: 'Mawaheb',
    days: [1, 2, 3, 4, 5],
    slots: [{ day: 1, start: '19:00', end: '20:45' }, { day: 6, start: '14:00', end: '17:00' }, { day: 1, start: '21:30', end: '22:20' }],
  });
  assert.deepEqual([habit.days, habit.targetPerWeek, habit.slots.length], [[1, 6], 2, 3]);

  // Days sent alongside times give way to the times; removing the times brings days back.
  assert.deepEqual(habitService.update(habit.id, { days: [0] })?.days, [1, 6]);
  assert.deepEqual(habitService.update(habit.id, { slots: [], days: [2, 4] })?.days, [2, 4]);
  assert.deepEqual(habitService.create({ name: 'Untimed' }).slots, []);
});
