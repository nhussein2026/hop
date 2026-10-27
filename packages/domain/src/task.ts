import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';
import type { TimeSlot } from './schedule.js';

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

  /** A course the task is for, and the graded item it prepares for. */
  courseId: EntityId | null;
  assessmentId: EntityId | null;

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

  /**
   * Work that happens at set times every week (Veribir Mon–Fri 13:30–16:00) is one task with
   * these slots, ticked once per occurrence. Null for an ordinary task. A repeating task has no
   * scheduled or due date; it stays open while the series runs.
   */
  repeat: TimeSlot[] | null;

  completedAt: ISODateTime | null;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** One occurrence of a repeating task, ticked done or skipped ("Veribir had no tasks today"). */
export interface TaskCompletion {
  id: EntityId;
  taskId: EntityId;
  date: ISODate;
  /** Skipped counts as neither done nor missed. */
  skipped: boolean;
  completedAt: ISODateTime;
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
  courseId?: EntityId;
  assessmentId?: EntityId;

  scheduledDate?: ISODate;
  dueDate?: ISODate;

  estimatedMinutes?: number;
  repeat?: TimeSlot[] | null;
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
  courseId?: EntityId | null;
  assessmentId?: EntityId | null;

  scheduledDate?: ISODate | null;
  dueDate?: ISODate | null;

  estimatedMinutes?: number | null;

  repeat?: TimeSlot[] | null;
}