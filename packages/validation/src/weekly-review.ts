import { z } from 'zod';
import { WEEKLY_REVIEW_STATUSES } from '@hop/domain';

import { dateSchema as date } from './common.js';

const notes = z.string().trim().max(5000, 'Review notes cannot exceed 5000 characters');
const rating = z.number().int().min(1).max(5).nullable().optional();
const count = z.number().int().min(0);
const titles = z.array(z.string().max(200)).max(200);

const weekFactsSchema = z.object({
  tasks: count,
  habitsPct: z.number().int().min(0).max(100),
  learningMin: count,
  applications: count,
  responses: count,
  interviews: count,
  shipped: titles,
  evidence: titles,
}).strict();

const reviewFields = {
  weekStart: date,
  wins: notes.optional(),
  progress: notes.optional(),
  career: notes.optional(),
  learning: notes.optional(),
  projects: notes.optional(),
  problems: notes.optional(),
  nextWeek: notes.optional(),
  energy: rating,
  focus: rating,
  change: notes.optional(),
  topThree: z.array(z.string().trim().max(200, 'Each priority cannot exceed 200 characters')).max(3, 'Choose up to 3 priorities').optional(),
  status: z.enum(WEEKLY_REVIEW_STATUSES).optional(),
  facts: weekFactsSchema.nullable().optional(),
};

export const createWeeklyReviewSchema = z.object(reviewFields).strict();
export const updateWeeklyReviewSchema = z.object(reviewFields).partial().strict();
