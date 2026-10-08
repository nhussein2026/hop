import { z } from 'zod';
import { GOAL_AREAS, MONTHLY_REVIEW_STATUSES } from '@hop/domain';

import { dateSchema } from './common.js';

const notes = z.string().trim().max(5000, 'Review notes cannot exceed 5000 characters');
const count = z.number().int().min(0);
const percent = z.number().int().min(0).max(100);
const titles = z.array(z.string().max(200)).max(200);

const monthStart = dateSchema.refine((value) => value.endsWith('-01'), 'A monthly review starts on the first day of a month');

export const monthFactsSchema = z.object({
  tasks: count,
  meaningfulDays: z.number().int().min(0).max(31),
  habitsPct: percent,
  learningMin: count,
  applications: count,
  responses: count,
  interviews: count,
  offers: count,
  goals: z.array(z.object({ name: z.string().max(200), from: percent, to: percent }).strict()).max(100),
  projectsCompleted: titles,
  milestones: titles,
  evidence: titles,
  neglectedAreas: z.array(z.enum(GOAL_AREAS)).max(GOAL_AREAS.length),
}).strict();

const reviewFields = {
  highlights: notes.optional(),
  keep: notes.optional(),
  stop: notes.optional(),
  change: notes.optional(),
  focus: z.array(z.string().trim().max(200, 'Each focus cannot exceed 200 characters')).max(3, 'Choose up to 3 focus areas').optional(),
  status: z.enum(MONTHLY_REVIEW_STATUSES).optional(),
  facts: monthFactsSchema.nullable().optional(),
};

export const createMonthlyReviewSchema = z.object({ monthStart, ...reviewFields }).strict();
export const updateMonthlyReviewSchema = z.object(reviewFields).partial().strict();
