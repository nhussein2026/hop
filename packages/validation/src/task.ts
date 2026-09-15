import { z } from 'zod';

import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@hop/domain';

const entityIdSchema = z
  .string()
  .trim()
  .min(1, 'ID cannot be empty');

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must use YYYY-MM-DD format',
  );

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

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

/**
 * Validate relationships between scheduling fields.
 */
function validateTaskDates(
  value: {
    scheduledDate?: string | null | undefined;
    dueDate?: string | null | undefined;
  },
  ctx: z.RefinementCtx,
) {
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

    scheduledDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),

    estimatedMinutes: estimatedMinutesSchema.optional(),
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

    scheduledDate: dateSchema.nullable().optional(),
    dueDate: dateSchema.nullable().optional(),

    estimatedMinutes:
      estimatedMinutesSchema.nullable().optional(),
  })
  .strict()
  .superRefine(validateTaskDates);

export type CreateTaskRequest = z.infer<
  typeof createTaskSchema
>;

export type UpdateTaskRequest = z.infer<
  typeof updateTaskSchema
>;