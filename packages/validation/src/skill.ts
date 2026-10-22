import { z } from 'zod';

import { SKILL_FOCUSES, SKILL_TYPES } from '@hop/domain';

import { dateSchema } from './common.js';

const optionalText = (label: string, max: number) => z
  .string()
  .trim()
  .max(max, `${label} cannot exceed ${max} characters`)
  .nullable()
  .optional();

// The level from before proof levels is read-only, so it is in neither schema.
const skillFields = {
  name: z.string().trim().min(1, 'Skill name is required').max(120, 'Skill name cannot exceed 120 characters'),
  category: optionalText('Category', 80),
  type: z.enum(SKILL_TYPES).optional(),
  focus: z.enum(SKILL_FOCUSES).optional(),
  listed: z.boolean().optional(),
  bar: optionalText('Bar', 1000),
  confidence: z.number().int('Confidence must be a whole number').min(1).max(10).nullable().optional(),
  lastPracticedAt: dateSchema.nullable().optional(),
  yearsExperience: z.number().min(0).max(100).nullable().optional(),
  notes: optionalText('Notes', 5000),
};

export const createSkillSchema = z.object(skillFields).strict();

export const updateSkillSchema = z.object(skillFields).partial().strict();
