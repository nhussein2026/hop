import test from 'node:test';
import assert from 'node:assert/strict';

import { goalService } from './goal.service.js';

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
