import { randomUUID } from 'node:crypto';

import type {
  CreateTaskInput,
  Task,
} from '@hop/domain';

import { taskRepository } from '../repositories/task.repository.js';

/**
 * Application/business logic for Tasks.
 *
 * This layer decides:
 * - IDs
 * - defaults
 * - timestamps
 * - normalization
 * - Task behavior
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
};