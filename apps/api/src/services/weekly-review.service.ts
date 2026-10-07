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
      createdAt: now,
      updatedAt: now,
    };

    return weeklyReviewRepository.create(review);
  },

  update(id: string, input: UpdateWeeklyReviewInput): WeeklyReview | undefined {
    if (!weeklyReviewRepository.findById(id)) {
      return undefined;
    }

    const sameWeek = input.weekStart ? weeklyReviewRepository.findByWeekStart(input.weekStart) : undefined;

    if (sameWeek && sameWeek.id !== id) {
      throw new ConflictError(`A weekly review already exists for the week of ${input.weekStart}`);
    }

    return weeklyReviewRepository.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
};
