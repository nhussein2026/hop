import type { EntityId, ISODate, ISODateTime } from './common.js';

export interface WeeklyReview {
  id: EntityId;
  weekStart: ISODate;
  wins: string;
  progress: string;
  career: string;
  learning: string;
  projects: string;
  problems: string;
  nextWeek: string;
  energy: number | null;
  focus: number | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateWeeklyReviewInput = Pick<WeeklyReview, 'weekStart'> &
  Partial<Omit<WeeklyReview, 'id' | 'weekStart' | 'createdAt' | 'updatedAt'>>;

export type UpdateWeeklyReviewInput = Partial<Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>>;
