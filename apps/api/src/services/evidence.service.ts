import { randomUUID } from 'node:crypto';

import type {
  CreateEvidenceInput,
  Evidence,
  UpdateEvidenceInput,
} from '@hop/domain';

import { evidenceRepository } from '../repositories/evidence.repository.js';

export const evidenceService = {
  getAll(): Evidence[] {
    return evidenceRepository.findAll();
  },

  getById(id: string): Evidence | undefined {
    return evidenceRepository.findById(id);
  },

  create(input: CreateEvidenceInput): Evidence {
    const now = new Date().toISOString();
    const item: Evidence = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      skillId: input.skillIds?.[0] ?? input.skillId ?? null,
      skillIds: input.skillIds ?? (input.skillId ? [input.skillId] : []),
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      goalId: input.goalId ?? null,
      url: input.url ?? null,
      date: input.date ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return evidenceRepository.create(item);
  },

  update(id: string, input: UpdateEvidenceInput): Evidence | undefined {
    if (!evidenceRepository.findById(id)) {
      return undefined;
    }

    const changes: Partial<Evidence> = { ...input, updatedAt: new Date().toISOString() };

    // Keep the single skill link and the list in step, whichever the client sent.
    if (input.skillIds) {
      changes.skillId = input.skillIds[0] ?? null;
    } else if (input.skillId !== undefined) {
      changes.skillIds = input.skillId ? [input.skillId] : [];
    }

    return evidenceRepository.update(id, changes);
  },
};
