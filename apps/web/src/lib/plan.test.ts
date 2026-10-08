import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGoalFocusGuidance, buildGoalHealth, buildGoalTaskSummary, buildMomentumIndicator, buildOpportunityHealth, buildPlanGroups, isTaskDueBy, isTaskOverdue, sortTasksForToday } from './plan.js';

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

test('buildMomentumIndicator explains whether recent activity is building or stalled', () => {
  const strong = buildMomentumIndicator([
    { status: 'completed', completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
    { status: 'completed', completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString() },
    { status: 'completed', completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString() },
    { status: 'todo', completedAt: null },
  ], 2, 3);

  const low = buildMomentumIndicator([], 0, 0);

  assert.deepEqual(strong.label, 'Strong momentum');
  assert.match(strong.detail, /meaningful actions in the last 7 days/i);
  assert.deepEqual(low.label, 'Needs a reset');
  assert.match(low.detail, /No meaningful actions recorded/i);
});

test('buildGoalFocusGuidance makes active-goal overload visible without blocking extra goals', () => {
  const focused = buildGoalFocusGuidance(3);
  const overloaded = buildGoalFocusGuidance(8);

  assert.deepEqual(focused, {
    overloaded: false,
    detail: '3 active goals is within the recommended focus range.',
  });
  assert.deepEqual(overloaded, {
    overloaded: true,
    detail: 'You currently have 8 active goals. Consider reviewing your priorities.',
  });
});

test('buildOpportunityHealth explains opportunity status from deadlines, events, and stage', () => {
  const daysFromToday = (days: number) => new Date(Date.now() + days * 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  const pastDeadline = daysFromToday(-3);
  const nextEventDate = daysFromToday(3);
  const overdue = buildOpportunityHealth({ stage: 'interested', deadline: pastDeadline });
  const upcoming = buildOpportunityHealth({ stage: 'interested', nextEventDate });
  const waiting = buildOpportunityHealth({ stage: 'applied' });
  const closed = buildOpportunityHealth({ stage: 'rejected' });

  assert.deepEqual(overdue, {
    label: 'Needs attention',
    detail: `Deadline passed on ${pastDeadline}.`,
  });
  assert.deepEqual(upcoming, {
    label: 'Upcoming',
    detail: `Next step is scheduled for ${nextEventDate}.`,
  });
  assert.deepEqual(waiting, {
    label: 'Waiting',
    detail: 'This opportunity is in progress and waiting on the next decision or response.',
  });
  assert.deepEqual(closed, {
    label: 'Closed',
    detail: 'This opportunity is closed.',
  });
});

test('buildGoalHealth flags goals that have gone quiet even when they still have open tasks', () => {
  const stale = buildGoalHealth({
    id: 'goal-8',
    status: 'active',
    progress: 35,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
  }, [
    { id: '6', title: 'Polish case study', status: 'todo', priority: 'medium', scheduledDate: null, dueDate: null, goalId: 'goal-8', completedAt: null },
    { id: '7', title: 'Send outreach', status: 'todo', priority: 'low', scheduledDate: null, dueDate: null, goalId: 'goal-8', completedAt: null },
  ]);

  assert.deepEqual(stale, {
    label: 'Needs attention',
    detail: 'This goal has been quiet for 18 days. Add the next action that moves it forward.',
  });
});

test('isTaskOverdue and isTaskDueBy derive Today membership from dates', () => {
  const today = '2026-10-07';

  assert.equal(isTaskOverdue({ scheduledDate: '2026-10-06', dueDate: null }, today), true);
  assert.equal(isTaskOverdue({ scheduledDate: '2026-10-06', dueDate: '2026-10-09' }, today), false);
  assert.equal(isTaskOverdue({ scheduledDate: null, dueDate: '2026-10-07' }, today), false);
  assert.equal(isTaskOverdue({ scheduledDate: null, dueDate: null }, today), false);

  assert.equal(isTaskDueBy({ scheduledDate: '2026-10-05', dueDate: null }, today), true);
  assert.equal(isTaskDueBy({ scheduledDate: '2026-10-08', dueDate: '2026-10-07' }, today), true);
  assert.equal(isTaskDueBy({ scheduledDate: '2026-10-08', dueDate: null }, today), false);
});

test('buildMomentumIndicator uses the right plural for small scores', () => {
  assert.match(buildMomentumIndicator([], 1, 0).detail, /^1 meaningful action in/);
  assert.match(buildMomentumIndicator([], 2, 0).detail, /^2 meaningful actions in/);
});
