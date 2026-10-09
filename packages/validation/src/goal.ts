import { z } from 'zod';

import {
  GOAL_AREAS,
  GOAL_PRIORITIES,
  GOAL_STATUSES,
} from '@hop/domain';

import { dateSchema } from './common.js';

const goalNameSchema = z
  .string()
  .trim()
  .min(1, 'Goal name is required')
  .max(200, 'Goal name cannot exceed 200 characters');

const goalTextSchema = z
  .string()
  .trim()
  .max(5000, 'Goal text cannot exceed 5000 characters');

const goalStatusSchema = z.enum(GOAL_STATUSES);
const goalPrioritySchema = z.enum(GOAL_PRIORITIES);
const goalAreaSchema = z.enum(GOAL_AREAS);

const criterionTextSchema = z
  .string()
  .trim()
  .min(1, 'Criterion text is required')
  .max(160, 'Criterion text cannot exceed 160 characters');

const noCriteria = 'Add at least one success criterion. Progress is measured against them';

export const createGoalSchema = z.object({
  name: goalNameSchema,
  why: goalTextSchema.optional(),
  areaId: z.string().trim().min(1).optional(),
  area: goalAreaSchema.optional(),
  criteria: z.array(criterionTextSchema, { error: noCriteria })
    .min(1, noCriteria)
    .max(50, 'A goal can have at most 50 criteria'),
  status: goalStatusSchema.optional(),
  priority: goalPrioritySchema.optional(),
  startDate: dateSchema.optional(),
  targetDate: dateSchema.optional(),
}).strict();

export const updateGoalSchema = z.object({
  name: goalNameSchema.optional(),
  why: goalTextSchema.nullable().optional(),
  areaId: z.string().trim().min(1).nullable().optional(),
  area: goalAreaSchema.nullable().optional(),
  status: goalStatusSchema.optional(),
  priority: goalPrioritySchema.optional(),
  startDate: dateSchema.nullable().optional(),
  targetDate: dateSchema.nullable().optional(),
}).strict();

export const createGoalCriterionSchema = z.object({
  text: criterionTextSchema,
  note: goalTextSchema.optional(),
}).strict();

export const updateGoalCriterionSchema = z.object({
  text: criterionTextSchema.optional(),
  note: goalTextSchema.nullable().optional(),
  done: z.boolean().optional(),
}).strict();
