import type { ISODate } from './common.js';

/**
 * "Every <day> from <start> to <end>", optionally only between two dates. One shape for every
 * weekly time in Hop: a course's classes now, and timed habits, repeating work and repeating
 * events later. `day` is 0 (Sunday) to 6 (Saturday); times are "HH:MM".
 */
/** At most this many weekly times on one habit, task or event. */
export const MAX_TIME_SLOTS = 21;

export interface TimeSlot {
  day: number;
  start: string;
  /** After start; "24:00" is allowed for a block that runs to midnight. */
  end: string;
  /** First date the slot applies (inclusive). */
  from?: ISODate | null;
  /** Last date the slot applies (inclusive). */
  until?: ISODate | null;
}
