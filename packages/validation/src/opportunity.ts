import { z } from 'zod';

import {
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
} from '@hop/domain';

const titleSchema = z.string().trim().min(1, 'Opportunity title is required').max(200, 'Opportunity title cannot exceed 200 characters');
const textSchema = z.string().trim().max(5000, 'Text cannot exceed 5000 characters');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');
const tagsSchema = z.array(z.string().trim().min(1)).max(50, 'Too many technology tags');

export const opportunityTypeSchema = z.enum(OPPORTUNITY_TYPES);
export const opportunityStageSchema = z.enum(OPPORTUNITY_STAGES);
export const opportunityPrioritySchema = z.enum(OPPORTUNITY_PRIORITIES);

export const createOpportunitySchema = z.object({
  title: titleSchema,
  organization: textSchema.optional(),
  url: z.string().trim().url('URL must be valid').optional(),
  type: opportunityTypeSchema.optional(),
  stage: opportunityStageSchema.optional(),
  priority: opportunityPrioritySchema.optional(),
  location: textSchema.optional(),
  remote: z.boolean().optional(),
  source: textSchema.optional(),
  openDate: dateSchema.optional(),
  deadline: dateSchema.optional(),
  appliedDate: dateSchema.optional(),
  decisionDate: dateSchema.optional(),
  nextEventDate: dateSchema.optional(),
  nextEventLabel: textSchema.optional(),
  compensation: textSchema.optional(),
  technologyTags: tagsSchema.optional(),
  resumeId: z.string().trim().min(1).optional(),
  coverLetterId: z.string().trim().min(1).optional(),
  notes: textSchema.optional(),
}).strict();

export const updateOpportunitySchema = z.object({
  title: titleSchema.optional(),
  organization: textSchema.nullable().optional(),
  url: z.string().trim().url('URL must be valid').nullable().optional(),
  type: opportunityTypeSchema.optional(),
  stage: opportunityStageSchema.optional(),
  priority: opportunityPrioritySchema.optional(),
  location: textSchema.nullable().optional(),
  remote: z.boolean().optional(),
  source: textSchema.nullable().optional(),
  openDate: dateSchema.nullable().optional(),
  deadline: dateSchema.nullable().optional(),
  appliedDate: dateSchema.nullable().optional(),
  decisionDate: dateSchema.nullable().optional(),
  nextEventDate: dateSchema.nullable().optional(),
  nextEventLabel: textSchema.nullable().optional(),
  compensation: textSchema.nullable().optional(),
  technologyTags: tagsSchema.optional(),
  resumeId: z.string().trim().min(1).nullable().optional(),
  coverLetterId: z.string().trim().min(1).nullable().optional(),
  notes: textSchema.nullable().optional(),
}).strict();

export type CreateOpportunityRequest = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityRequest = z.infer<typeof updateOpportunitySchema>;
