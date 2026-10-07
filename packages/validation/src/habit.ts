import { z } from 'zod';

import { HABIT_FREQUENCIES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required').max(160, 'Habit name cannot exceed 160 characters'),
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  goalId: id.optional(),
}).strict();

export const habitCompletionSchema = z.object({ date }).strict();

export const habitCompletionRangeSchema = z.object({ from: date, to: date }).strict().refine(
  (value) => value.from <= value.to,
  { message: 'The start date cannot be after the end date', path: ['to'] },
);
