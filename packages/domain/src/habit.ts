import type { EntityId, ISODate, ISODateTime } from './common.js';
import type { TimeSlot } from './schedule.js';

export const HABIT_FREQUENCIES = ['daily', 'weekly'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

/** What a habit is counted in: "30 minutes", "10 pages", "2 times". */
export const HABIT_UNITS = ['minutes', 'pages', 'times'] as const;
export type HabitUnit = (typeof HABIT_UNITS)[number];

export interface Habit {
  id: EntityId;
  name: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  goalId: EntityId | null;
  /** Weekdays the habit is scheduled on: 0 Sunday … 6 Saturday. */
  days: number[];
  /** Minutes each time, used for learning totals. Equals the target for a habit counted in minutes. */
  minutes: number;
  unit: HabitUnit;
  /** How much counts as done: 10 pages, 30 minutes. */
  target: number;
  /** The least that still keeps the habit on a bad day. Null when none is set. */
  minimum: number | null;
  /**
   * When in the day it happens, per weekday. Empty for an untimed habit. When set, `days` is
   * derived from it, and a habit counted in minutes has each day's slot lengths as that day's target.
   */
  slots: TimeSlot[];
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface HabitCompletion {
  id: EntityId;
  habitId: EntityId;
  date: ISODate;
  /** How much was done. Null means the target was met: every tick from before amounts, and one-tap ticks. */
  amount: number | null;
  completedAt: ISODateTime;
}

export type CreateHabitInput = Pick<Habit, 'name'> & Partial<Pick<Habit, 'frequency' | 'targetPerWeek' | 'goalId' | 'days' | 'minutes' | 'unit' | 'target' | 'minimum' | 'slots'>>;

export type UpdateHabitInput = Partial<Pick<Habit, 'name' | 'days' | 'minutes' | 'active' | 'unit' | 'target' | 'minimum' | 'slots'> & { goalId: EntityId | null }>;
