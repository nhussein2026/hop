import { z } from 'zod';

import { HABIT_FREQUENCIES, HABIT_UNITS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const name = z.string().trim().min(1, 'Habit name is required').max(160, 'Habit name cannot exceed 160 characters');
const days = z
  .array(z.number().int().min(0).max(6))
  .min(1, 'Pick at least one day')
  .max(7)
  .refine((value) => new Set(value).size === value.length, 'Each day can be picked only once');
const minutes = z.number().int().min(5, 'Use 5 to 240 minutes').max(240, 'Use 5 to 240 minutes');
const amount = z.number().int('Use a whole number').min(1, 'Use at least 1').max(1000, 'Use at most 1000');

/** A minimum above the target would make the minimum the real target. */
function minimumWithinTarget(value: { target?: number | undefined; minimum?: number | null | undefined }, ctx: z.RefinementCtx) {
  if (value.target !== undefined && value.minimum != null && value.minimum > value.target) {
    ctx.addIssue({ code: 'custom', path: ['minimum'], message: 'The minimum can’t be more than the target' });
  }
}

export const createHabitSchema = z.object({
  name,
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  goalId: id.optional(),
  days: days.optional(),
  minutes: minutes.optional(),
  unit: z.enum(HABIT_UNITS).optional(),
  target: amount.optional(),
  minimum: amount.nullable().optional(),
}).strict().superRefine(minimumWithinTarget);

export const updateHabitSchema = z.object({
  name: name.optional(),
  goalId: id.nullable().optional(),
  days: days.optional(),
  minutes: minutes.optional(),
  unit: z.enum(HABIT_UNITS).optional(),
  target: amount.optional(),
  minimum: amount.nullable().optional(),
  active: z.boolean().optional(),
}).strict().superRefine(minimumWithinTarget);

/** No amount means the whole target was done. Logging again on the same date replaces the amount. */
export const habitCompletionSchema = z.object({ date, amount: amount.optional() }).strict();

export const habitCompletionRangeSchema = z.object({ from: date, to: date }).strict().refine(
  (value) => value.from <= value.to,
  { message: 'The start date cannot be after the end date', path: ['to'] },
);
