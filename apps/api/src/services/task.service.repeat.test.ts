import test from 'node:test';
import assert from 'node:assert/strict';

import { createTaskSchema, timeSlotSchema, updateTaskSchema } from '@hop/validation';

import { InvalidInputError } from '../errors.js';
import { taskService } from './task.service.js';

// 2026-11-02 is a Monday, 2026-11-04 a Wednesday.
const veribir = [
  { day: 1, start: '13:30', end: '16:00' },
  { day: 3, start: '13:30', end: '15:50' },
];

test('a repeating task keeps its times and has no single date', () => {
  const task = taskService.create({ title: 'Veribir', repeat: veribir });
  assert.deepEqual([task.repeat, task.scheduledDate, task.dueDate, task.status], [veribir, null, null, 'todo']);

  assert.equal(createTaskSchema.safeParse({ title: 'x', repeat: veribir, scheduledDate: '2026-11-02' }).success, false);
  assert.equal(createTaskSchema.safeParse({ title: 'x', repeat: [] }).success, false);
  assert.throws(() => taskService.update(task.id, { scheduledDate: '2026-11-03' }), InvalidInputError);

  // Turning a dated task into a repeating one drops its date.
  const dated = taskService.create({ title: 'Garanti', scheduledDate: '2026-11-02' });
  assert.deepEqual([taskService.update(dated.id, { repeat: veribir })?.scheduledDate], [null]);
  assert.equal(updateTaskSchema.safeParse({ repeat: null }).success, true);
});

test('each occurrence is ticked on its own, can be skipped, and only on the days it happens', () => {
  const task = taskService.create({ title: 'Veribir', repeat: veribir });

  const monday = taskService.tickOccurrence(task.id, '2026-11-02')!;
  assert.deepEqual([monday.date, monday.skipped], ['2026-11-02', false]);
  assert.equal(taskService.tickOccurrence(task.id, '2026-11-04', true)?.skipped, true);
  // A skip can become done; ticking again replaces it.
  assert.equal(taskService.tickOccurrence(task.id, '2026-11-04')?.skipped, false);
  assert.throws(() => taskService.tickOccurrence(task.id, '2026-11-03'), InvalidInputError);
  assert.equal(taskService.tickOccurrence('missing', '2026-11-02'), undefined);

  const ordinary = taskService.create({ title: 'One-off' });
  assert.throws(() => taskService.tickOccurrence(ordinary.id, '2026-11-02'), InvalidInputError);

  assert.deepEqual(taskService.getOccurrences('2026-11-02', '2026-11-08').filter((o) => o.taskId === task.id).map((o) => o.date).sort(), ['2026-11-02', '2026-11-04']);
  assert.equal(taskService.untickOccurrence(task.id, '2026-11-02'), true);
  assert.equal(taskService.untickOccurrence(task.id, '2026-11-02'), false);

  // Deleting the series removes its record of occurrences.
  taskService.delete(task.id);
  assert.equal(taskService.getOccurrences('2026-11-01', '2026-11-30').filter((o) => o.taskId === task.id).length, 0);
});

test('a weekly time ends after it starts, may run to midnight, and dates come in order', () => {
  assert.equal(timeSlotSchema.safeParse({ day: 1, start: '22:30', end: '24:00' }).success, true);
  assert.equal(timeSlotSchema.safeParse({ day: 1, start: '16:00', end: '13:30' }).success, false);
  assert.equal(timeSlotSchema.safeParse({ day: 7, start: '09:00', end: '10:00' }).success, false);
  assert.equal(timeSlotSchema.safeParse({ day: 1, start: '09:00', end: '10:00', from: '2026-12-01', until: '2026-11-30' }).success, false);
  assert.equal(timeSlotSchema.safeParse({ day: 1, start: '09:00', end: '10:00', until: '2026-11-29' }).success, true);
});
