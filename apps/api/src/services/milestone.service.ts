import { randomUUID } from 'node:crypto';

import type { CreateMilestoneInput, Milestone, UpdateMilestoneInput } from '@hop/domain';

import { milestoneRepository } from '../repositories/milestone.repository.js';
import { settingsService } from './settings.service.js';

export const milestoneService = {
  getAll(): Milestone[] {
    return milestoneRepository.findAll();
  },

  /** Without a goal, a milestone records something that already happened, so it starts reached. */
  create(input: CreateMilestoneInput): Milestone {
    const now = new Date().toISOString();

    return milestoneRepository.create({
      id: randomUUID(),
      goalId: input.goalId ?? null,
      title: input.title,
      date: input.date,
      done: input.done ?? !input.goalId,
      createdAt: now,
      updatedAt: now,
    });
  },

  /** Marking a milestone reached moves its date to today unless a date is given. */
  update(id: string, input: UpdateMilestoneInput): Milestone | undefined {
    const existing = milestoneRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    const changes: Partial<Milestone> = { ...input, updatedAt: new Date().toISOString() };

    if (input.done && !existing.done && !input.date) {
      changes.date = settingsService.today();
    }

    return milestoneRepository.update(id, changes);
  },

  delete(id: string): boolean {
    return milestoneRepository.delete(id);
  },
};
