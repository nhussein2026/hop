import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGoalHealth, buildGoalTaskSummary, buildPlanGroups, sortTasksForToday } from './plan.js';

test('sortTasksForToday prioritizes earlier dates, then urgency, then alphabetical tie-breaks', () => {
  const ordered = sortTasksForToday([
    { id: '1', title: 'Follow up with recruiter', status: 'todo', priority: 'medium', scheduledDate: '2026-09-20', dueDate: null, goalId: 'goal-1' },
    { id: '2', title: 'Ship onboarding fix', status: 'todo', priority: 'high', scheduledDate: '2026-09-18', dueDate: null, goalId: 'goal-2' },
    { id: '3', title: 'Study system design', status: 'todo', priority: 'low', scheduledDate: '2026-09-18', dueDate: null, goalId: null },
    { id: '4', title: 'Draft resume bullet list', status: 'todo', priority: 'high', scheduledDate: null, dueDate: '2026-09-18', goalId: 'goal-3' },
  ]);

  assert.deepEqual(ordered.map((task) => task.title), [
    'Draft resume bullet list',
    'Ship onboarding fix',
    'Study system design',
    'Follow up with recruiter',
  ]);
});

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

test('buildGoalTaskSummary counts linked actions and surfaces the next task for each goal', () => {
  const summary = buildGoalTaskSummary([
    { id: '1', title: 'Sketch product outline', status: 'todo', priority: 'high', scheduledDate: '2026-09-18', dueDate: null, goalId: 'goal-1' },
    { id: '2', title: 'Review portfolio copy', status: 'todo', priority: 'medium', scheduledDate: '2026-09-20', dueDate: null, goalId: 'goal-1' },
    { id: '3', title: 'Apply to role', status: 'completed', priority: 'high', scheduledDate: '2026-09-17', dueDate: null, goalId: 'goal-1' },
    { id: '4', title: 'Plan interview prep', status: 'todo', priority: 'low', scheduledDate: '2026-09-19', dueDate: null, goalId: 'goal-2' },
    { id: '5', title: 'Inbox cleanup', status: 'todo', priority: 'low', scheduledDate: null, dueDate: null, goalId: null },
  ]);

  assert.deepEqual(summary, [
    { goalId: 'goal-1', taskCount: 2, nextTask: 'Sketch product outline' },
    { goalId: 'goal-2', taskCount: 1, nextTask: 'Plan interview prep' },
  ]);
});

test('buildGoalHealth explains whether a goal is on track, paused, or needs attention', () => {
  const noTasks = buildGoalHealth({
    id: 'goal-3',
    status: 'active',
    progress: 0,
  }, []);

  const partialProgress = buildGoalHealth({
    id: 'goal-1',
    status: 'active',
    progress: 0,
  }, [
    { id: '1', title: 'Draft outline', status: 'completed', priority: 'high', scheduledDate: '2026-09-18', dueDate: null, goalId: 'goal-1' },
    { id: '2', title: 'Write post', status: 'todo', priority: 'medium', scheduledDate: '2026-09-20', dueDate: null, goalId: 'goal-1' },
  ]);

  const paused = buildGoalHealth({
    id: 'goal-2',
    status: 'paused',
    progress: 25,
  }, [
    { id: '3', title: 'Review notes', status: 'todo', priority: 'low', scheduledDate: null, dueDate: null, goalId: 'goal-2' },
  ]);

  assert.deepEqual(noTasks, {
    label: 'Needs attention',
    detail: 'No linked tasks yet. Add the next action that moves this goal forward.',
  });

  assert.deepEqual(partialProgress, {
    label: 'On track',
    detail: '1 of 2 linked actions are complete.',
  });

  assert.deepEqual(paused, {
    label: 'Paused',
    detail: 'This goal is paused. Resume it when the next action is ready.',
  });
});
