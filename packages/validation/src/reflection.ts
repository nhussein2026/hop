import { z } from 'zod';

import { dateSchema as date } from './common.js';

const answer = z.string().trim().max(2000, 'Answers cannot exceed 2000 characters');
const rating = z.number().int().min(1).max(5).nullable();

export const saveReflectionSchema = z.object({
  date,
  accomplished: answer.optional(),
  learned: answer.optional(),
  badly: answer.optional(),
  tomorrow: z.string().trim().max(200, 'Keep this under 200 characters').optional(),
  energy: rating.optional(),
  focus: rating.optional(),
}).strict().refine(
  (value) => Boolean(value.accomplished || value.learned || value.tomorrow),
  { message: 'Write at least one answer', path: ['accomplished'] },
);
