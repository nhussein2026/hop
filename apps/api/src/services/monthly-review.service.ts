import { randomUUID } from 'node:crypto';

import type {
  CreateMonthlyReviewInput,
  MonthlyReview,
  UpdateMonthlyReviewInput,
} from '@hop/domain';

import { ConflictError } from '../errors.js';
import { monthlyReviewRepository } from '../repositories/monthly-review.repository.js';

export const monthlyReviewService = {
  getAll(): MonthlyReview[] {
    return monthlyReviewRepository.findAll();
  },

  create(input: CreateMonthlyReviewInput): MonthlyReview {
    if (monthlyReviewRepository.findByMonthStart(input.monthStart)) {
      throw new ConflictError(`A monthly review already exists for the month of ${input.monthStart}`);
    }

    const now = new Date().toISOString();
    const review: MonthlyReview = {
      id: randomUUID(),
      monthStart: input.monthStart,
      highlights: input.highlights ?? '',
      keep: input.keep ?? '',
      stop: input.stop ?? '',
      change: input.change ?? '',
      focus: input.focus ?? [],
      status: input.status ?? 'draft',
      facts: input.facts ?? null,
      completedAt: input.status === 'completed' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    return monthlyReviewRepository.create(review);
  },

  update(id: string, input: UpdateMonthlyReviewInput): MonthlyReview | undefined {
    const existing = monthlyReviewRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<MonthlyReview> = { ...input, updatedAt: now };

    if (input.status === 'completed' && existing.status !== 'completed') {
      changes.completedAt = now;
    }

    if (input.status === 'draft') {
      changes.completedAt = null;
    }

    return monthlyReviewRepository.update(id, changes);
  },
};
