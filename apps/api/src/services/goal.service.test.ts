import test from 'node:test';
import assert from 'node:assert/strict';

import { goalService } from './goal.service.js';
import { taskService } from './task.service.js';

test('goalService.create assigns default values and persisted timestamps', () => {
  const goal = goalService.create({
    name: 'Become a stronger engineer',
    why: 'I want to build more trustworthy systems.',
    status: 'active',
    progress: 32,
    areaId: 'career',
  });

  assert.equal(goal.name, 'Become a stronger engineer');
  assert.equal(goal.status, 'active');
  assert.equal(goal.progress, 32);
  assert.ok(goal.id.length > 0);
  assert.ok(goal.createdAt.length > 0);
  assert.ok(goal.updatedAt.length > 0);
});

test('goalService.update preserves progress and supports completion', () => {
  const goal = goalService.create({
    name: 'Ship a portfolio project',
    why: 'I want visible proof of execution.',
    progress: 10,
  });

  const updated = goalService.update(goal.id, {
    progress: 80,
    status: 'achieved',
  });

  assert.ok(updated);
  assert.equal(updated?.progress, 80);
  assert.equal(updated?.status, 'achieved');
  assert.ok(updated?.completedAt);
});

test('task completion updates linked goal progress and completion state', () => {
  const goal = goalService.create({
    name: 'Improve system design thinking',
    status: 'active',
    progress: 0,
  });

  const firstTask = taskService.create({
    title: 'Read two architecture patterns',
    goalId: goal.id,
  });

  const secondTask = taskService.create({
    title: 'Write a design memo',
    goalId: goal.id,
  });

  const afterFirst = taskService.update(firstTask.id, { status: 'completed' });
  const partialGoal = goalService.getById(goal.id);

  assert.ok(afterFirst);
  assert.ok(partialGoal);
  assert.equal(partialGoal?.progress, 50);
  assert.equal(partialGoal?.status, 'active');

  const afterSecond = taskService.update(secondTask.id, { status: 'completed' });
  const completedGoal = goalService.getById(goal.id);

  assert.ok(afterSecond);
  assert.ok(completedGoal);
  assert.equal(completedGoal?.progress, 100);
  assert.equal(completedGoal?.status, 'achieved');
});

test('moving a task to another goal recalculates progress for both goals', () => {
  const first = goalService.create({ name: 'First goal' });
  const second = goalService.create({ name: 'Second goal' });
  const done = taskService.create({ title: 'Finished step', goalId: first.id });
  const moving = taskService.create({ title: 'Step to move', goalId: first.id });
  taskService.update(done.id, { status: 'completed' });

  assert.equal(goalService.getById(first.id)?.progress, 50);

  taskService.update(moving.id, { goalId: second.id });

  assert.equal(goalService.getById(first.id)?.progress, 100);
  assert.equal(goalService.getById(second.id)?.progress, 0);
});

test('task completion does not change the status of a paused goal', () => {
  const goal = goalService.create({ name: 'Paused goal', status: 'paused' });
  const task = taskService.create({ title: 'Only step', goalId: goal.id });

  taskService.update(task.id, { status: 'completed' });

  const updated = goalService.getById(goal.id);
  assert.equal(updated?.progress, 100);
  assert.equal(updated?.status, 'paused');
  assert.equal(updated?.completedAt, null);
});
