import { z } from 'zod';

import { HABIT_FREQUENCIES } from '@hop/domain';

const id = z.string().trim().min(1, 'ID cannot be empty');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required').max(160, 'Habit name cannot exceed 160 characters'),
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  goalId: id.optional(),
}).strict();

export const habitCompletionSchema = z.object({ date }).strict();
