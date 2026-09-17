import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanGroups } from './plan.js';

test('buildPlanGroups groups upcoming tasks by their working date and sorts chronologically', () => {
  const groups = buildPlanGroups([
    { id: '1', title: 'Ship portfolio update', status: 'todo', priority: 'high', scheduledDate: '2026-09-19', dueDate: null, goalId: 'goal-1' },
    { id: '2', title: 'Read system design notes', status: 'todo', priority: 'medium', scheduledDate: null, dueDate: '2026-09-18', goalId: null },
    { id: '3', title: 'Review applications', status: 'completed', priority: 'low', scheduledDate: '2026-09-18', dueDate: null, goalId: 'goal-2' },
    { id: '4', title: 'Practice interview drills', status: 'todo', priority: 'high', scheduledDate: '2026-09-18', dueDate: '2026-09-20', goalId: 'goal-1' },
  ]);

  assert.deepEqual(groups.map((group) => group.date), ['2026-09-18', '2026-09-19']);
  assert.equal(groups[0]?.items.length, 2);
  assert.equal(groups[0]?.items[0]?.title, 'Practice interview drills');
  assert.equal(groups[1]?.items[0]?.title, 'Ship portfolio update');
});

test('buildPlanGroups keeps unscheduled tasks in a final bucket', () => {
  const groups = buildPlanGroups([
    { id: '1', title: 'Clean inbox', status: 'todo', priority: 'low', scheduledDate: null, dueDate: null, goalId: null },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.date, 'unscheduled');
  assert.equal(groups[0]?.items[0]?.title, 'Clean inbox');
});
