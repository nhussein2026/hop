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

export interface Goal {
  id: EntityId;
  name: string;
  why: string | null;
  areaId: EntityId | null;
  status: GoalStatus;
  priority: GoalPriority;
  startDate: ISODate | null;
  targetDate: ISODate | null;
  successCriteria: string | null;
  progress: number;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface CreateGoalInput {
  name: string;
  why?: string;
  areaId?: EntityId;
  status?: GoalStatus;
  priority?: GoalPriority;
  startDate?: ISODate;
  targetDate?: ISODate;
  successCriteria?: string;
  progress?: number;
}

export interface UpdateGoalInput {
  name?: string;
  why?: string | null;
  areaId?: EntityId | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  startDate?: ISODate | null;
  targetDate?: ISODate | null;
  successCriteria?: string | null;
  progress?: number;
}
