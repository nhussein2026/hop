import type { EntityId, ISODate, ISODateTime } from './common.js';
import type { GoalArea } from './goal.js';

export const MONTHLY_REVIEW_STATUSES = ['draft', 'completed'] as const;

export type MonthlyReviewStatus = (typeof MONTHLY_REVIEW_STATUSES)[number];

/** How far one goal moved during the month, from its progress history. */
export interface GoalMovement {
  name: string;
  from: number;
  to: number;
}

/** What Hop recorded during the month, saved with the review so it stays as it was. */
export interface MonthFacts {
  tasks: number;
  /** Days with at least one completed task, habit check-in, or piece of evidence. */
  meaningfulDays: number;
  habitsPct: number;
  learningMin: number;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  goals: GoalMovement[];
  projectsCompleted: string[];
  milestones: string[];
  evidence: string[];
  /** Areas with an active goal but no recorded activity this month. */
  neglectedAreas: GoalArea[];
}

export interface MonthlyReview {
  id: EntityId;
  /** The first day of the reviewed month. */
  monthStart: ISODate;
  highlights: string;
  /** What to continue doing. */
  keep: string;
  /** What to stop doing. */
  stop: string;
  /** What to change. */
  change: string;
  /** Next month's focus, in order. */
  focus: string[];
  status: MonthlyReviewStatus;
  facts: MonthFacts | null;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateMonthlyReviewInput = Pick<MonthlyReview, 'monthStart'> &
  Partial<Omit<MonthlyReview, 'id' | 'monthStart' | 'completedAt' | 'createdAt' | 'updatedAt'>>;

export type UpdateMonthlyReviewInput = Partial<Omit<MonthlyReview, 'id' | 'monthStart' | 'completedAt' | 'createdAt' | 'updatedAt'>>;
