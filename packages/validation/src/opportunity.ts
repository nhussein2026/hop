import { z } from 'zod';

import {
  OPPORTUNITY_ACTIVITY_TYPES,
  OPPORTUNITY_CLOSED_STAGES,
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  WORK_MODES,
} from '@hop/domain';

import { dateSchema, entityIdSchema } from './common.js';

const titleSchema = z.string().trim().min(1, 'Opportunity title is required').max(200, 'Opportunity title cannot exceed 200 characters');
const textSchema = z.string().trim().max(5000, 'Text cannot exceed 5000 characters');
const tagsSchema = z.array(z.string().trim().min(1)).max(50, 'Too many technology tags');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:MM format');
const contactIdsSchema = z.array(entityIdSchema).max(50, 'Too many linked people');
const workModeSchema = z.enum(WORK_MODES);

const opportunityTypeSchema = z.enum(OPPORTUNITY_TYPES);
const opportunityStageSchema = z.enum(OPPORTUNITY_STAGES);
const opportunityPrioritySchema = z.enum(OPPORTUNITY_PRIORITIES);

export const createOpportunitySchema = z.object({
  title: titleSchema,
  organization: textSchema.optional(),
  url: z.string().trim().url('URL must be valid').optional(),
  type: opportunityTypeSchema.optional(),
  stage: opportunityStageSchema.optional(),
  priority: opportunityPrioritySchema.optional(),
  location: textSchema.optional(),
  remote: z.boolean().optional(),
  workMode: workModeSchema.optional(),
  source: textSchema.optional(),
  openDate: dateSchema.optional(),
  deadline: dateSchema.optional(),
  appliedDate: dateSchema.optional(),
  decisionDate: dateSchema.optional(),
  nextEventDate: dateSchema.optional(),
  nextEventLabel: textSchema.optional(),
  nextEventTime: timeSchema.optional(),
  compensation: textSchema.optional(),
  technologyTags: tagsSchema.optional(),
  contactIds: contactIdsSchema.optional(),
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
  workMode: workModeSchema.nullable().optional(),
  source: textSchema.nullable().optional(),
  openDate: dateSchema.nullable().optional(),
  deadline: dateSchema.nullable().optional(),
  appliedDate: dateSchema.nullable().optional(),
  decisionDate: dateSchema.nullable().optional(),
  nextEventDate: dateSchema.nullable().optional(),
  nextEventLabel: textSchema.nullable().optional(),
  nextEventTime: timeSchema.nullable().optional(),
  compensation: textSchema.nullable().optional(),
  technologyTags: tagsSchema.optional(),
  contactIds: contactIdsSchema.optional(),
  resumeId: z.string().trim().min(1).nullable().optional(),
  coverLetterId: z.string().trim().min(1).nullable().optional(),
  notes: textSchema.nullable().optional(),
}).strict();

const itemTextSchema = z.string().trim().min(1, 'Text is required').max(160, 'Text cannot exceed 160 characters');

export const createOpportunityPrepSchema = z.object({ text: itemTextSchema }).strict();

export const updateOpportunityPrepSchema = z.object({ text: itemTextSchema.optional(), done: z.boolean().optional() }).strict();

export const createOpportunityActivitySchema = z.object({
  type: z.enum(OPPORTUNITY_ACTIVITY_TYPES),
  text: z.string().trim().min(1, 'Describe what happened').max(1000, 'Details cannot exceed 1000 characters'),
  date: dateSchema.optional(),
}).strict();

/** Closing records an outcome and an optional note on the timeline. */
export const closeOpportunitySchema = z.object({
  outcome: z.enum(OPPORTUNITY_CLOSED_STAGES),
  note: z.string().trim().max(1000, 'Note cannot exceed 1000 characters').optional(),
}).strict();
