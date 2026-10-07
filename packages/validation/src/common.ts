import { z } from 'zod';

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Date-only value (YYYY-MM-DD) that must exist on the calendar. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .refine(isCalendarDate, 'Date must be a real calendar date');

export const entityIdSchema = z.string().trim().min(1, 'ID cannot be empty');
