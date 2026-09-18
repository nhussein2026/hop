import test from 'node:test';
import assert from 'node:assert/strict';

import { taskService } from './task.service.js';

test('taskService.delete removes a task from storage', () => {
  const task = taskService.create({
    title: 'Draft follow-up email',
    scheduledDate: '2026-09-19',
  });

  const deleted = taskService.delete(task.id);

  assert.ok(deleted);
  assert.equal(taskService.getById(task.id), undefined);
});
