import test from 'node:test';
import assert from 'node:assert/strict';

import { createMonthlyReviewSchema } from '@hop/validation';

import { ConflictError } from '../errors.js';
import { monthlyReviewService } from './monthly-review.service.js';

test('monthlyReviewService.create stores a draft with empty defaults', () => {
  const review = monthlyReviewService.create({ monthStart: '2026-09-01', keep: 'Morning study blocks.' });

  assert.equal(review.monthStart, '2026-09-01');
  assert.equal(review.keep, 'Morning study blocks.');
  assert.equal(review.stop, '');
  assert.deepEqual(review.focus, []);
  assert.equal(review.status, 'draft');
  assert.equal(review.completedAt, null);
});

test('monthlyReviewService records completion and clears it when reopened', () => {
  const review = monthlyReviewService.create({ monthStart: '2026-10-01' });
  const completed = monthlyReviewService.update(review.id, { status: 'completed', focus: ['System design', 'Ship Hop'] });

  assert.equal(completed?.status, 'completed');
  assert.ok(completed?.completedAt);
  assert.deepEqual(completed?.focus, ['System design', 'Ship Hop']);
  assert.equal(monthlyReviewService.update(review.id, { status: 'draft' })?.completedAt, null);
  assert.equal(monthlyReviewService.update('missing', { keep: 'x' }), undefined);
});

test('monthlyReviewService allows only one review per month', () => {
  monthlyReviewService.create({ monthStart: '2026-11-01' });

  assert.throws(() => monthlyReviewService.create({ monthStart: '2026-11-01' }), ConflictError);
});

test('a monthly review must start on the first day of a month', () => {
  assert.equal(createMonthlyReviewSchema.safeParse({ monthStart: '2026-11-01' }).success, true);
  assert.equal(createMonthlyReviewSchema.safeParse({ monthStart: '2026-11-15' }).success, false);
  assert.equal(createMonthlyReviewSchema.safeParse({ monthStart: '2026-11-01', focus: ['a', 'b', 'c', 'd'] }).success, false);
});
