import { randomUUID } from 'node:crypto';

import type {
  CreateWeeklyReviewInput,
  UpdateWeeklyReviewInput,
  WeeklyReview,
} from '@hop/domain';

import { weeklyReviewRepository } from '../repositories/weekly-review.repository.js';

export const weeklyReviewService = {
  getAll(): WeeklyReview[] {
    return weeklyReviewRepository.findAll();
  },

  getById(id: string): WeeklyReview | undefined {
    return weeklyReviewRepository.findById(id);
  },

  create(input: CreateWeeklyReviewInput): WeeklyReview {
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
      createdAt: now,
      updatedAt: now,
    };

    return weeklyReviewRepository.create(review);
  },

  update(id: string, input: UpdateWeeklyReviewInput): WeeklyReview | undefined {
    if (!weeklyReviewRepository.findById(id)) {
      return undefined;
    }

    return weeklyReviewRepository.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
};
