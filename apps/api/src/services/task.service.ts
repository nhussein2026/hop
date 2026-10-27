import { randomUUID } from 'node:crypto';

import type {
  CreateTaskInput,
  Task,
  TaskCompletion,
  UpdateTaskInput,
} from '@hop/domain';

import { InvalidInputError } from '../errors.js';

import { taskRepository } from '../repositories/task.repository.js';
import { goalService } from './goal.service.js';
import { slotApplies } from './schedule.js';

/**
 * Application/business logic for Tasks.
 *
 * This layer decides:
 * - IDs
 * - defaults
 * - timestamps
 * - normalization
 * - Task behavior
 *
 * Completing tasks never changes a goal's progress: progress comes from the goal's success criteria.
 */
export const taskService = {
  getAll(): Task[] {
    return taskRepository.findAll();
  },

  getById(id: string): Task | undefined {
    return taskRepository.findById(id);
  },

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();

    const task: Task = {
      id: randomUUID(),

      title: input.title,
      description: input.description ?? null,

      status: 'todo',
      priority: input.priority ?? 'medium',

      areaId: input.areaId ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      courseId: input.courseId ?? null,
      assessmentId: input.assessmentId ?? null,

      scheduledDate: input.scheduledDate ?? null,
      dueDate: input.dueDate ?? null,

      estimatedMinutes: input.estimatedMinutes ?? null,

      repeat: input.repeat?.length ? input.repeat : null,

      completedAt: null,

      createdAt: now,
      updatedAt: now,
    };

    return taskRepository.create(task);
  },

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const existingTask = taskRepository.findById(id);

    if (!existingTask) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<Task> = {
      ...input,
      updatedAt: now,
    };

    if (input.repeat !== undefined) {
      changes.repeat = input.repeat?.length ? input.repeat : null;
    }

    if (changes.repeat) {
      // Becoming a repeating task: its times replace any single date.
      changes.scheduledDate = null;
      changes.dueDate = null;
    } else if (existingTask.repeat && input.repeat === undefined && (input.scheduledDate || input.dueDate)) {
      throw new InvalidInputError('A repeating task has its times instead of a date. Stop it repeating first.');
    }

    if (input.status === 'completed' && existingTask.status !== 'completed') {
      changes.completedAt = now;
    }

    if (input.status && input.status !== 'completed') {
      changes.completedAt = null;
    }

    const updated = taskRepository.update(id, changes);

    if (updated && changes.completedAt) {
      // A finished task is recent activity on its goal, so the goal is not flagged as quiet.
      goalService.touch(updated.goalId);
    }

    return updated;
  },

  delete(id: string): boolean {
    return taskRepository.delete(id);
  },

  /** Occurrences of repeating tasks ticked or skipped between two dates (inclusive). */
  getOccurrences(from: string, to: string): TaskCompletion[] {
    return taskRepository.findCompletions(from, to);
  },

  /**
   * Tick one occurrence done, or skip it. Only a date the task's times fall on can be ticked;
   * ticking the same date again replaces it, so a skip can become done.
   */
  tickOccurrence(taskId: string, date: string, skipped = false): TaskCompletion | undefined {
    const task = taskRepository.findById(taskId);

    if (!task) {
      return undefined;
    }

    if (!task.repeat) {
      throw new InvalidInputError('Only a repeating task is ticked per day.');
    }

    if (!task.repeat.some((slot) => slotApplies(slot, date))) {
      throw new InvalidInputError(`“${task.title}” doesn’t happen on ${date}.`);
    }

    return taskRepository.saveCompletion({ id: randomUUID(), taskId, date, skipped, completedAt: new Date().toISOString() });
  },

  untickOccurrence(taskId: string, date: string): boolean {
    return taskRepository.deleteCompletion(taskId, date);
  },
};