import { randomUUID } from 'node:crypto';

import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from '@hop/domain';

import { goalRepository } from '../repositories/goal.repository.js';
import { taskRepository } from '../repositories/task.repository.js';

function syncGoalProgress(goalId: string | null) {
  if (!goalId) {
    return;
  }

  const goal = goalRepository.findById(goalId);
  if (!goal) {
    return;
  }

  const linkedTasks = taskRepository.findAll().filter((task) => task.goalId === goalId && task.status !== 'cancelled');

  if (linkedTasks.length === 0) {
    return;
  }

  const completedTasks = linkedTasks.filter((task) => task.status === 'completed').length;
  const progress = Math.round((completedTasks / linkedTasks.length) * 100);
  const now = new Date().toISOString();
  const nextStatus = progress >= 100 ? 'achieved' : goal.status === 'achieved' ? 'active' : goal.status;

  goalRepository.update(goalId, {
    progress,
    status: nextStatus,
    completedAt: progress >= 100 ? (goal.completedAt ?? now) : null,
    updatedAt: now,
  });
}

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

    const created = taskRepository.create(task);
    syncGoalProgress(created.goalId);
    return created;
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

    if (updated) {
      syncGoalProgress(updated.goalId);
    }

    return updated;
  },

  delete(id: string): boolean {
    const task = taskRepository.findById(id);
    const deleted = taskRepository.delete(id);

    if (deleted && task) {
      syncGoalProgress(task.goalId);
    }

    return deleted;
  },
};