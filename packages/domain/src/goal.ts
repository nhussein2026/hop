import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

export const GOAL_STATUSES = [
  'active',
  'paused',
  'achieved',
  'abandoned',
  'archived',
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_PRIORITIES = [
  'low',
  'medium',
  'high',
] as const;

export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const GOAL_AREAS = [
  'Career',
  'Learning',
  'Projects',
  'Health',
  'Finances',
  'Personal',
] as const;

export type GoalArea = (typeof GOAL_AREAS)[number];

export interface Goal {
  id: EntityId;
  name: string;
  why: string | null;
  areaId: EntityId | null;
  area: GoalArea | null;
  status: GoalStatus;
  priority: GoalPriority;
  startDate: ISODate | null;
  targetDate: ISODate | null;
  /** Free text from before criteria existed. Migrated into criteria and no longer edited. */
  successCriteria: string | null;
  /** Share of criteria met (0–100), kept in step by the API. Never set directly. */
  progress: number;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

/**
 * A statement that is either true or not yet true, such as "3 serious AI projects".
 * A goal's progress is the share of its criteria that are met, so the number is always explainable.
 */
export interface GoalCriterion {
  id: EntityId;
  goalId: EntityId;
  text: string;
  note: string | null;
  done: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Progress on a given day, recorded whenever a criterion changes. */
export interface GoalProgressPoint {
  goalId: EntityId;
  date: ISODate;
  progress: number;
}

/** A goal as the API returns it: with its criteria and progress history. */
export interface GoalWithDetails extends Goal {
  criteria: GoalCriterion[];
  history: Pick<GoalProgressPoint, 'date' | 'progress'>[];
}

export interface CreateGoalInput {
  name: string;
  why?: string;
  areaId?: EntityId;
  area?: GoalArea;
  /** How you will know the goal is reached. At least one: progress is measured against them. */
  criteria: string[];
  status?: GoalStatus;
  priority?: GoalPriority;
  startDate?: ISODate;
  targetDate?: ISODate;
}

export interface UpdateGoalInput {
  name?: string;
  why?: string | null;
  areaId?: EntityId | null;
  area?: GoalArea | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  startDate?: ISODate | null;
  targetDate?: ISODate | null;
}

export interface CreateGoalCriterionInput {
  text: string;
  note?: string;
}

export interface UpdateGoalCriterionInput {
  text?: string;
  note?: string | null;
  done?: boolean;
}
