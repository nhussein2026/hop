import { z } from 'zod';

import { EVENT_TYPES } from '@hop/domain';

const id = z.string().trim().min(1, 'ID cannot be empty');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');
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

export const createEventSchema = z.object({ ...eventFields, type: eventFields.type.optional() }).strict();
export const updateEventSchema = z.object(eventFields).partial().strict();
