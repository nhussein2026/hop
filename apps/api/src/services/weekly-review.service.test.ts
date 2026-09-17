import test from 'node:test';
import assert from 'node:assert/strict';

import { weeklyReviewService } from './weekly-review.service.js';

test('weeklyReviewService.create stores the weekly template', () => {
  const review = weeklyReviewService.create({
    weekStart: '2026-09-14',
    wins: 'Shipped the Growth slice.',
    nextWeek: 'Prepare the review flow.',
  });

  assert.equal(review.weekStart, '2026-09-14');
  assert.equal(review.wins, 'Shipped the Growth slice.');
  assert.equal(review.nextWeek, 'Prepare the review flow.');
  assert.equal(review.energy, null);
});

test('weeklyReviewService.update records ratings and problems', () => {
  const review = weeklyReviewService.create({ weekStart: '2026-09-21' });
  const updated = weeklyReviewService.update(review.id, {
    problems: 'Too much context switching.',
    energy: 4,
    focus: 3,
  });

  assert.ok(updated);
  assert.equal(updated?.problems, 'Too much context switching.');
  assert.equal(updated?.energy, 4);
  assert.equal(updated?.focus, 3);
});
