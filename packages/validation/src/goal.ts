import { z } from 'zod';

import {
  GOAL_PRIORITIES,
  GOAL_STATUSES,
} from '@hop/domain';

const goalNameSchema = z
  .string()
  .trim()
  .min(1, 'Goal name is required')
  .max(200, 'Goal name cannot exceed 200 characters');

const goalTextSchema = z
  .string()
  .trim()
  .max(5000, 'Goal text cannot exceed 5000 characters');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');

const progressSchema = z
  .number()
  .min(0, 'Progress must be between 0 and 100')
  .max(100, 'Progress must be between 0 and 100');

export const goalStatusSchema = z.enum(GOAL_STATUSES);
export const goalPrioritySchema = z.enum(GOAL_PRIORITIES);

export const createGoalSchema = z.object({
  name: goalNameSchema,
  why: goalTextSchema.optional(),
  areaId: z.string().trim().min(1).optional(),
  status: goalStatusSchema.optional(),
  priority: goalPrioritySchema.optional(),
  startDate: dateSchema.optional(),
  targetDate: dateSchema.optional(),
  successCriteria: goalTextSchema.optional(),
  progress: progressSchema.optional(),
}).strict();

export const updateGoalSchema = z.object({
  name: goalNameSchema.optional(),
  why: goalTextSchema.nullable().optional(),
  areaId: z.string().trim().min(1).nullable().optional(),
  status: goalStatusSchema.optional(),
  priority: goalPrioritySchema.optional(),
  startDate: dateSchema.nullable().optional(),
  targetDate: dateSchema.nullable().optional(),
  successCriteria: goalTextSchema.nullable().optional(),
  progress: progressSchema.optional(),
}).strict();

export type CreateGoalRequest = z.infer<typeof createGoalSchema>;
export type UpdateGoalRequest = z.infer<typeof updateGoalSchema>;
