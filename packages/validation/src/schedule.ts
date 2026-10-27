import { z } from 'zod';
import { MAX_TIME_SLOTS } from '@hop/domain';

import { dateSchema } from './common.js';

const startTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 09:30');
/** An end may be "24:00", for a block that runs to midnight (the ride home). */
const endTime = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Use a time like 12:45');

/** "Every <day> from <start> to <end>", optionally only between two dates. */
export const timeSlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  start: startTime,
  end: endTime,
  from: dateSchema.nullable().optional(),
  until: dateSchema.nullable().optional(),
}).strict().superRefine((slot, ctx) => {
  if (slot.end <= slot.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'A time must end after it starts' });
  if (slot.from && slot.until && slot.until < slot.from) ctx.addIssue({ code: 'custom', path: ['until'], message: 'The last date can’t be before the first' });
});

export const timeSlotsSchema = z.array(timeSlotSchema).max(MAX_TIME_SLOTS, `Use at most ${MAX_TIME_SLOTS} times`);
