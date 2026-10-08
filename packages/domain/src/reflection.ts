import type { EntityId, ISODate, ISODateTime } from './common.js';

/** A short end-of-day note. There is at most one per local date. */
export interface Reflection {
  id: EntityId;
  date: ISODate;
  accomplished: string;
  learned: string;
  badly: string;
  tomorrow: string;
  energy: number | null;
  focus: number | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Saving a reflection for a date creates it, or replaces the one already written that day. */
export type SaveReflectionInput = Pick<Reflection, 'date'> &
  Partial<Pick<Reflection, 'accomplished' | 'learned' | 'badly' | 'tomorrow' | 'energy' | 'focus'>>;
