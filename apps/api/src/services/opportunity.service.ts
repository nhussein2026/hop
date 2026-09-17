import { randomUUID } from 'node:crypto';

import type {
  CreateOpportunityInput,
  Opportunity,
  UpdateOpportunityInput,
} from '@hop/domain';

import { opportunityRepository } from '../repositories/opportunity.repository.js';

export const opportunityService = {
  getAll(): Opportunity[] {
    return opportunityRepository.findAll();
  },

  getById(id: string): Opportunity | undefined {
    return opportunityRepository.findById(id);
  },

  create(input: CreateOpportunityInput): Opportunity {
    const now = new Date().toISOString();

    const opportunity: Opportunity = {
      id: randomUUID(),
      title: input.title,
      organization: input.organization ?? null,
      url: input.url ?? null,
      type: input.type ?? 'other',
      stage: input.stage ?? 'saved',
      priority: input.priority ?? 'medium',
      location: input.location ?? null,
      remote: input.remote ?? false,
      source: input.source ?? null,
      openDate: input.openDate ?? null,
      deadline: input.deadline ?? null,
      appliedDate: input.appliedDate ?? null,
      decisionDate: input.decisionDate ?? null,
      nextEventDate: input.nextEventDate ?? null,
      nextEventLabel: input.nextEventLabel ?? null,
      compensation: input.compensation ?? null,
      technologyTags: input.technologyTags ?? [],
      resumeId: input.resumeId ?? null,
      coverLetterId: input.coverLetterId ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };

    return opportunityRepository.create(opportunity);
  },

  update(id: string, input: UpdateOpportunityInput): Opportunity | undefined {
    const existingOpportunity = opportunityRepository.findById(id);

    if (!existingOpportunity) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<Opportunity> = {
      ...input,
      updatedAt: now,
    };

    if (input.stage === 'accepted' && existingOpportunity.stage !== 'accepted') {
      changes.closedAt = now;
    }

    if (input.stage && input.stage !== 'accepted') {
      changes.closedAt = null;
    }

    return opportunityRepository.update(id, changes);
  },
};
