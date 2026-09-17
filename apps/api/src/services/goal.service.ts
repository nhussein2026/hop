import { randomUUID } from 'node:crypto';

import type {
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
} from '@hop/domain';

import { goalRepository } from '../repositories/goal.repository.js';

export const goalService = {
  getAll(): Goal[] {
    return goalRepository.findAll();
  },

  getById(id: string): Goal | undefined {
    return goalRepository.findById(id);
  },

  create(input: CreateGoalInput): Goal {
    const now = new Date().toISOString();

    const goal: Goal = {
      id: randomUUID(),
      name: input.name,
      why: input.why ?? null,
      areaId: input.areaId ?? null,
      status: input.status ?? 'active',
      priority: input.priority ?? 'medium',
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      successCriteria: input.successCriteria ?? null,
      progress: input.progress ?? 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    return goalRepository.create(goal);
  },

  update(id: string, input: UpdateGoalInput): Goal | undefined {
    const existingGoal = goalRepository.findById(id);

    if (!existingGoal) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<Goal> = {
      ...input,
      updatedAt: now,
    };

    if (input.status === 'achieved' && existingGoal.status !== 'achieved') {
      changes.completedAt = now;
    }

    if (input.status && input.status !== 'achieved') {
      changes.completedAt = null;
    }

    if (input.status === 'archived') {
      changes.archivedAt = now;
    }

    if (input.status && input.status !== 'archived') {
      changes.archivedAt = null;
    }

    return goalRepository.update(id, changes);
  },
};
