import { randomUUID } from 'node:crypto';

import type {
  CreateWeeklyReviewInput,
  UpdateWeeklyReviewInput,
  WeeklyReview,
} from '@hop/domain';

import { ConflictError } from '../errors.js';
import { weeklyReviewRepository } from '../repositories/weekly-review.repository.js';

export const weeklyReviewService = {
  getAll(): WeeklyReview[] {
    return weeklyReviewRepository.findAll();
  },

  getById(id: string): WeeklyReview | undefined {
    return weeklyReviewRepository.findById(id);
  },

  create(input: CreateWeeklyReviewInput): WeeklyReview {
    if (weeklyReviewRepository.findByWeekStart(input.weekStart)) {
      throw new ConflictError(`A weekly review already exists for the week of ${input.weekStart}`);
    }

    const now = new Date().toISOString();
    const review: WeeklyReview = {
      id: randomUUID(),
      weekStart: input.weekStart,
      wins: input.wins ?? '',
      progress: input.progress ?? '',
      career: input.career ?? '',
      learning: input.learning ?? '',
      projects: input.projects ?? '',
      problems: input.problems ?? '',
      nextWeek: input.nextWeek ?? '',
      energy: input.energy ?? null,
      focus: input.focus ?? null,
      change: input.change ?? '',
      topThree: input.topThree ?? [],
      status: input.status ?? 'draft',
      facts: input.facts ?? null,
      completedAt: input.status === 'completed' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    return weeklyReviewRepository.create(review);
  },

  update(id: string, input: UpdateWeeklyReviewInput): WeeklyReview | undefined {
    const existing = weeklyReviewRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    const sameWeek = input.weekStart ? weeklyReviewRepository.findByWeekStart(input.weekStart) : undefined;

    if (sameWeek && sameWeek.id !== id) {
      throw new ConflictError(`A weekly review already exists for the week of ${input.weekStart}`);
    }

    const now = new Date().toISOString();
    const changes: Partial<WeeklyReview> = { ...input, updatedAt: now };

    if (input.status === 'completed' && existing.status !== 'completed') {
      changes.completedAt = now;
    }

    if (input.status === 'draft') {
      changes.completedAt = null;
    }

    return weeklyReviewRepository.update(id, changes);
  },
};
