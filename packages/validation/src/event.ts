import { z } from 'zod';

import { EVENT_TYPES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:MM format');
const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

const eventFields = {
  title: z.string().trim().min(1, 'Event title is required').max(200, 'Event title cannot exceed 200 characters'),
  description: text('Description', 5000).nullable().optional(),
  type: z.enum(EVENT_TYPES),
  date,
  startTime: time.nullable().optional(),
  endTime: time.nullable().optional(),
  goalId: id.nullable().optional(),
  projectId: id.nullable().optional(),
  opportunityId: id.nullable().optional(),
};

function validateEventTimes(value: { startTime?: string | null | undefined; endTime?: string | null | undefined }, ctx: z.RefinementCtx) {
  if (value.startTime && value.endTime && value.endTime < value.startTime) {
    ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time cannot be earlier than the start time' });
  }
}

export const createEventSchema = z.object({ ...eventFields, type: eventFields.type.optional() }).strict().superRefine(validateEventTimes);
export const updateEventSchema = z.object(eventFields).partial().strict().superRefine(validateEventTimes);
