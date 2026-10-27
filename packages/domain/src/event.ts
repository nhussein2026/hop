import type { EntityId, ISODate, ISODateTime } from './common.js';
import type { TimeSlot } from './schedule.js';

export const EVENT_TYPES = ['meeting', 'interview', 'deadline', 'review', 'personal', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Event {
  id: EntityId;
  title: string;
  description: string | null;
  type: EventType;
  date: ISODate;
  startTime: string | null;
  endTime: string | null;
  goalId: EntityId | null;
  projectId: EntityId | null;
  opportunityId: EntityId | null;
  /**
   * A weekly meeting: one event with its times per weekday (Kaleem: Wed 19:30, Sun 21:15). Null
   * for a one-off event, which uses `date`, `startTime` and `endTime`. For a repeating event,
   * `date` is the first day it can happen.
   */
  repeat: TimeSlot[] | null;
  /** Dates of a repeating event that were skipped ("Skip this one"). */
  skips: ISODate[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateEventInput = Pick<Event, 'title' | 'date'> & Partial<Omit<Event, 'id' | 'title' | 'date' | 'createdAt' | 'updatedAt'>>;
export type UpdateEventInput = Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>;
