import { z } from 'zod';
import { THEMES } from '@hop/domain';

import { programSchema } from './university.js';

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Add the name Hop should use').max(80, 'Name cannot exceed 80 characters').optional(),
  timezone: z.string().refine(isTimezone, 'Unknown timezone').optional(),
  weekStart: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
  theme: z.enum(THEMES).optional(),
  followUpDays: z.number().int().min(3, 'Use a number from 3 to 60').max(60, 'Use a number from 3 to 60').optional(),
  notify: z.object({ critical: z.boolean(), important: z.boolean(), optional: z.boolean() }).partial().strict().optional(),
  workHours: z.string().trim().max(40, 'Work hours cannot exceed 40 characters').optional(),
  onboarded: z.boolean().optional(),
  readNotifications: z.array(z.string().max(300)).max(200).optional(),
  program: programSchema.optional(),
}).strict();
