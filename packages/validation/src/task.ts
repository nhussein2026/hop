import { z } from 'zod';

import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@hop/domain';

import { dateSchema, entityIdSchema } from './common.js';
import { timeSlotsSchema } from './schedule.js';

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Task title is required')
  .max(200, 'Task title cannot exceed 200 characters');

const descriptionSchema = z
  .string()
  .trim()
  .max(
    5000,
    'Task description cannot exceed 5000 characters',
  );

const estimatedMinutesSchema = z
  .number()
  .int('Estimated minutes must be a whole number')
  .positive('Estimated minutes must be greater than zero')
  .max(
    24 * 60,
    'Estimated time cannot exceed 24 hours',
  );

const taskStatusSchema = z.enum(TASK_STATUSES);

const taskPrioritySchema = z.enum(TASK_PRIORITIES);

/**
 * Validate relationships between scheduling fields.
 */
function validateTaskDates(
  value: {
    scheduledDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    repeat?: unknown[] | null | undefined;
  },
  ctx: z.RefinementCtx,
) {
  // A repeating task happens at its times every week; a single date would contradict them.
  if (value.repeat && (value.scheduledDate || value.dueDate)) {
    ctx.addIssue({
      code: 'custom',
      path: ['repeat'],
      message: 'A repeating task has its times instead of a date',
    });
  }

  if (
    value.scheduledDate &&
    value.dueDate &&
    value.dueDate < value.scheduledDate
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message:
        'Due date cannot be earlier than the scheduled date',
    });
  }
}

export const createTaskSchema = z
  .object({
    title: titleSchema,

    description: descriptionSchema.optional(),

    priority: taskPrioritySchema.optional(),

    areaId: entityIdSchema.optional(),
    goalId: entityIdSchema.optional(),
    projectId: entityIdSchema.optional(),
    opportunityId: entityIdSchema.optional(),
    courseId: entityIdSchema.optional(),
    assessmentId: entityIdSchema.optional(),

    scheduledDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),

    estimatedMinutes: estimatedMinutesSchema.optional(),

    repeat: timeSlotsSchema.min(1, 'Add at least one time').nullable().optional(),
  })
  .strict()
  .superRefine(validateTaskDates);

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),

    description: descriptionSchema.nullable().optional(),

    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),

    areaId: entityIdSchema.nullable().optional(),
    goalId: entityIdSchema.nullable().optional(),
    projectId: entityIdSchema.nullable().optional(),
    opportunityId: entityIdSchema.nullable().optional(),
    courseId: entityIdSchema.nullable().optional(),
    assessmentId: entityIdSchema.nullable().optional(),

    scheduledDate: dateSchema.nullable().optional(),
    dueDate: dateSchema.nullable().optional(),

    estimatedMinutes:
      estimatedMinutesSchema.nullable().optional(),

    repeat: timeSlotsSchema.min(1, 'Add at least one time').nullable().optional(),
  })
  .strict()
  .superRefine(validateTaskDates);

/** Tick one occurrence of a repeating task done, or skip it. Ticking again replaces it. */
export const taskOccurrenceSchema = z
  .object({
    date: dateSchema,
    skipped: z.boolean().optional(),
  })
  .strict();
