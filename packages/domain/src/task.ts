import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * A Task represents a concrete action that can be completed.
 *
 * Tasks are Hop's execution layer.
 *
 * Examples:
 * - "Study TypeScript generics"
 * - "Apply to Acme"
 * - "Prepare interview questions"
 * - "Implement authentication"
 *
 * A task may exist independently or be related to another Hop entity
 * such as a Goal, Project, Opportunity, or Area.
 */
export interface Task {
  id: EntityId;

  title: string;
  description: string | null;

  status: TaskStatus;
  priority: TaskPriority;

  /**
   * Optional domain relationships.
   *
   * We use IDs instead of embedding the related entities.
   */
  areaId: EntityId | null;
  goalId: EntityId | null;
  projectId: EntityId | null;
  opportunityId: EntityId | null;

  /**
   * scheduledDate:
   * When you intend to work on the task.
   *
   * dueDate:
   * When the task must be finished.
   *
   * These are intentionally different concepts.
   */
  scheduledDate: ISODate | null;
  dueDate: ISODate | null;

  /**
   * Expected effort.
   *
   * Example:
   * 30 = approximately 30 minutes.
   */
  estimatedMinutes: number | null;

  completedAt: ISODateTime | null;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Data needed to create a new task.
 *
 * Server-generated fields such as id, createdAt and updatedAt
 * are intentionally excluded.
 */
export interface CreateTaskInput {
  title: string;

  description?: string;

  priority?: TaskPriority;

  areaId?: EntityId;
  goalId?: EntityId;
  projectId?: EntityId;
  opportunityId?: EntityId;

  scheduledDate?: ISODate;
  dueDate?: ISODate;

  estimatedMinutes?: number;
}

/**
 * Fields that may be changed after a task exists.
 *
 * completedAt is intentionally not accepted directly.
 * The application service will manage it based on the task status.
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;

  status?: TaskStatus;
  priority?: TaskPriority;

  areaId?: EntityId | null;
  goalId?: EntityId | null;
  projectId?: EntityId | null;
  opportunityId?: EntityId | null;

  scheduledDate?: ISODate | null;
  dueDate?: ISODate | null;

  estimatedMinutes?: number | null;
}