import { z } from 'zod';

import { HABIT_FREQUENCIES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const name = z.string().trim().min(1, 'Habit name is required').max(160, 'Habit name cannot exceed 160 characters');
const days = z
  .array(z.number().int().min(0).max(6))
  .min(1, 'Pick at least one day')
  .max(7)
  .refine((value) => new Set(value).size === value.length, 'Each day can be picked only once');
const minutes = z.number().int().min(5, 'Use 5 to 240 minutes').max(240, 'Use 5 to 240 minutes');

export const createHabitSchema = z.object({
  name,
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  goalId: id.optional(),
  days: days.optional(),
  minutes: minutes.optional(),
}).strict();

export const updateHabitSchema = z.object({
  name: name.optional(),
  goalId: id.nullable().optional(),
  days: days.optional(),
  minutes: minutes.optional(),
  active: z.boolean().optional(),
}).strict();

export const habitCompletionSchema = z.object({ date }).strict();

export const habitCompletionRangeSchema = z.object({ from: date, to: date }).strict().refine(
  (value) => value.from <= value.to,
  { message: 'The start date cannot be after the end date', path: ['to'] },
);
