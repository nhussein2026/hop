import type { EntityId, ISODate, ISODateTime } from './common.js';

export const WEEKLY_REVIEW_STATUSES = ['draft', 'completed'] as const;

export type WeeklyReviewStatus = (typeof WEEKLY_REVIEW_STATUSES)[number];

/** What Hop recorded during the week, saved with the review so it stays as it was. */
export interface WeekFacts {
  tasks: number;
  habitsPct: number;
  learningMin: number;
  applications: number;
  responses: number;
  interviews: number;
  shipped: string[];
  evidence: string[];
}

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
  /** The one adjustment for next week. (`problems` holds what got in the way.) */
  change: string;
  /** Next week's top priorities, in order. */
  topThree: string[];
  status: WeeklyReviewStatus;
  facts: WeekFacts | null;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateWeeklyReviewInput = Pick<WeeklyReview, 'weekStart'> &
  Partial<Omit<WeeklyReview, 'id' | 'weekStart' | 'completedAt' | 'createdAt' | 'updatedAt'>>;

export type UpdateWeeklyReviewInput = Partial<Omit<WeeklyReview, 'id' | 'completedAt' | 'createdAt' | 'updatedAt'>>;
