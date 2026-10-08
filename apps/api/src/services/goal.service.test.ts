import test from 'node:test';
import assert from 'node:assert/strict';

import { goalService } from './goal.service.js';
import { taskService } from './task.service.js';

test('goalService.create assigns default values and persisted timestamps', () => {
  const goal = goalService.create({
    name: 'Become a stronger engineer',
    why: 'I want to build more trustworthy systems.',
    status: 'active',
    areaId: 'career',
    criteria: ['Lead one design review'],
  });

  assert.equal(goal.name, 'Become a stronger engineer');
  assert.equal(goal.status, 'active');
  assert.equal(goal.progress, 0);
  assert.ok(goal.id.length > 0);
  assert.ok(goal.createdAt.length > 0);
  assert.ok(goal.updatedAt.length > 0);
});

test('goalService.update preserves progress and supports completion', () => {
  const goal = goalService.create({
    name: 'Ship a portfolio project',
    why: 'I want visible proof of execution.',
    criteria: ['Deployed', 'Written up'],
  });
  goalService.updateCriterion(goal.id, goal.criteria[0]!.id, { done: true });

  const updated = goalService.update(goal.id, {
    status: 'achieved',
  });

  assert.ok(updated);
  assert.equal(updated?.progress, 50);
  assert.equal(updated?.status, 'achieved');
  assert.ok(updated?.completedAt);
});

test('goal progress is the share of success criteria met', () => {
  const goal = goalService.create({ name: 'Become a strong AI engineer', criteria: ['Strong Python', 'ML fundamentals', 'Deployable portfolio', 'NLP'] });

  assert.equal(goal.criteria.length, 4);
  assert.equal(goal.progress, 0);

  const [first, second] = goal.criteria;
  goalService.updateCriterion(goal.id, first!.id, { done: true });
  const updated = goalService.updateCriterion(goal.id, second!.id, { done: true });

  assert.equal(updated?.progress, 50);
  assert.equal(updated?.status, 'active');
  assert.equal(updated?.history.at(-1)?.progress, 50);
});

test('meeting every criterion does not achieve a goal automatically', () => {
  const goal = goalService.create({ name: 'Ship a portfolio', criteria: ['One project'] });
  const updated = goalService.updateCriterion(goal.id, goal.criteria[0]!.id, { done: true });

  assert.equal(updated?.progress, 100);
  assert.equal(updated?.status, 'active');
  assert.equal(updated?.completedAt, null);
});

test('adding a criterion lowers progress and records it in the history', () => {
  const goal = goalService.create({ name: 'Improve system design thinking', criteria: ['Read two architecture patterns'] });
  const met = goalService.updateCriterion(goal.id, goal.criteria[0]!.id, { done: true });

  assert.equal(met?.progress, 100);

  const withTwo = goalService.addCriterion(goal.id, { text: 'Design a rate limiter' });

  assert.equal(withTwo?.progress, 50);
  assert.equal(withTwo?.history.at(-1)?.progress, 50);
});

test('completing a linked task leaves goal progress unchanged', () => {
  const goal = goalService.create({ name: 'Paused goal', status: 'paused', criteria: ['One outcome'] });
  const task = taskService.create({ title: 'Only step', goalId: goal.id });

  taskService.update(task.id, { status: 'completed' });

  const updated = goalService.getById(goal.id);
  assert.equal(updated?.progress, 0);
  assert.equal(updated?.status, 'paused');
  assert.equal(updated?.completedAt, null);
});

test('a goal cannot be created without a success criterion', async () => {
  const { createGoalSchema } = await import('@hop/validation');

  assert.equal(createGoalSchema.safeParse({ name: 'Unmeasured goal' }).success, false);
  assert.equal(createGoalSchema.safeParse({ name: 'Unmeasured goal', criteria: [] }).success, false);
  assert.equal(createGoalSchema.safeParse({ name: 'Measured goal', criteria: ['Shipped'] }).success, true);
  assert.equal(createGoalSchema.safeParse({ name: 'Goal', criteria: ['Shipped'], progress: 50 }).success, false);
});
