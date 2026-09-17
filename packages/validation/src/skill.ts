import { z } from 'zod';

import { SKILL_LEVELS } from '@hop/domain';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');

const optionalText = (label: string, max: number) => z
  .string()
  .trim()
  .max(max, `${label} cannot exceed ${max} characters`)
  .optional();

const skillFields = {
  name: z.string().trim().min(1, 'Skill name is required').max(120, 'Skill name cannot exceed 120 characters'),
  category: optionalText('Category', 80),
  level: z.enum(SKILL_LEVELS),
  confidence: z.number().int('Confidence must be a whole number').min(1).max(10).nullable().optional(),
  lastPracticedAt: dateSchema.nullable().optional(),
  yearsExperience: z.number().min(0).max(100).nullable().optional(),
  notes: optionalText('Notes', 5000),
};

export const createSkillSchema = z.object({
  ...skillFields,
  level: skillFields.level.optional(),
});

export const updateSkillSchema = z.object({
  ...skillFields,
}).partial();
