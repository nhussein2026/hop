import { z } from 'zod';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const title = z.string().trim().min(1, 'Milestone title is required').max(200, 'Milestone title cannot exceed 200 characters');

export const createMilestoneSchema = z.object({
  title,
  date,
  goalId: id.nullable().optional(),
  done: z.boolean().optional(),
}).strict();

export const updateMilestoneSchema = z.object({
  title: title.optional(),
  date: date.optional(),
  goalId: id.nullable().optional(),
  done: z.boolean().optional(),
}).strict();
