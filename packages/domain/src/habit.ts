import type { EntityId, ISODate, ISODateTime } from './common.js';

export const HABIT_FREQUENCIES = ['daily', 'weekly'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export interface Habit {
  id: EntityId;
  name: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  goalId: EntityId | null;
  /** Weekdays the habit is scheduled on: 0 Sunday … 6 Saturday. */
  days: number[];
  /** Minutes each time, used for learning totals. */
  minutes: number;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface HabitCompletion {
  id: EntityId;
  habitId: EntityId;
  date: ISODate;
  completedAt: ISODateTime;
}

export type CreateHabitInput = Pick<Habit, 'name'> & Partial<Pick<Habit, 'frequency' | 'targetPerWeek' | 'goalId' | 'days' | 'minutes'>>;

export type UpdateHabitInput = Partial<Pick<Habit, 'name' | 'days' | 'minutes' | 'active'> & { goalId: EntityId | null }>;
