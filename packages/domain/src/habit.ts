import type { EntityId, ISODate, ISODateTime } from './common.js';

export const HABIT_FREQUENCIES = ['daily', 'weekly'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export interface Habit {
  id: EntityId;
  name: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  goalId: EntityId | null;
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

export type CreateHabitInput = Pick<Habit, 'name'> & Partial<Pick<Habit, 'frequency' | 'targetPerWeek' | 'goalId'>>;
