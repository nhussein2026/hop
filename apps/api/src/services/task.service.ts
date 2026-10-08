import { randomUUID } from 'node:crypto';

import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from '@hop/domain';

import { taskRepository } from '../repositories/task.repository.js';
import { goalService } from './goal.service.js';

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

      scheduledDate: input.scheduledDate ?? null,
      dueDate: input.dueDate ?? null,

      estimatedMinutes: input.estimatedMinutes ?? null,

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
};