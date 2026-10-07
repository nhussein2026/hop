import test from 'node:test';
import assert from 'node:assert/strict';

import { setupPasswordSchema } from './auth.js';
import { dateSchema } from './common.js';
import { createEventSchema } from './event.js';
import { habitCompletionRangeSchema } from './habit.js';
import { updateSkillSchema } from './skill.js';
import { createTaskSchema } from './task.js';

test('dateSchema accepts real calendar dates only', () => {
  assert.equal(dateSchema.safeParse('2028-02-29').success, true);
  assert.equal(dateSchema.safeParse('2026-02-29').success, false);
  assert.equal(dateSchema.safeParse('2026-02-31').success, false);
  assert.equal(dateSchema.safeParse('2026-13-01').success, false);
  assert.equal(dateSchema.safeParse('2026-9-1').success, false);
});

test('createTaskSchema rejects a due date before the scheduled date', () => {
  const result = createTaskSchema.safeParse({ title: 'Ship', scheduledDate: '2026-10-08', dueDate: '2026-10-07' });

  assert.equal(result.success, false);
});

test('createEventSchema rejects an end time before the start time', () => {
  assert.equal(createEventSchema.safeParse({ title: 'Call', date: '2026-10-08', startTime: '10:00', endTime: '09:30' }).success, false);
  assert.equal(createEventSchema.safeParse({ title: 'Call', date: '2026-10-08', startTime: '10:00', endTime: '10:30' }).success, true);
});

test('habitCompletionRangeSchema requires from to be on or before to', () => {
  assert.equal(habitCompletionRangeSchema.safeParse({ from: '2026-10-01', to: '2026-10-07' }).success, true);
  assert.equal(habitCompletionRangeSchema.safeParse({ from: '2026-10-08', to: '2026-10-07' }).success, false);
});

test('updateSkillSchema rejects unknown fields and allows clearing notes', () => {
  assert.equal(updateSkillSchema.safeParse({ notes: null }).success, true);
  assert.equal(updateSkillSchema.safeParse({ unexpected: true }).success, false);
});

test('setupPasswordSchema requires at least 12 characters and keeps surrounding spaces', () => {
  assert.equal(setupPasswordSchema.safeParse({ password: 'short' }).success, false);
  assert.equal(setupPasswordSchema.safeParse({ password: ' twelve chars ' }).data?.password, ' twelve chars ');
});
