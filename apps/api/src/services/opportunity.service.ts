import { randomUUID } from 'node:crypto';

import { OPPORTUNITY_CLOSED_STAGES, OPPORTUNITY_STAGES } from '@hop/domain';
import type {
  CreateOpportunityActivityInput,
  CreateOpportunityInput,
  Opportunity,
  OpportunityActivityType,
  OpportunityStage,
  OpportunityWithDetails,
  UpdateOpportunityInput,
} from '@hop/domain';

import { opportunityRepository } from '../repositories/opportunity.repository.js';
import { settingsService } from './settings.service.js';

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  saved: 'Saved',
  interested: 'Interested',
  preparing: 'Preparing',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  assessment: 'Assessment',
  final: 'Final round',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  accepted: 'Accepted',
  declined: 'Declined',
};

function isClosedStage(stage: OpportunityStage) {
  return (OPPORTUNITY_CLOSED_STAGES as readonly OpportunityStage[]).includes(stage);
}

/** Position in the open pipeline (saved = 0 … offer = 8), or -1 for a closed stage. */
function rank(stage: OpportunityStage | null) {
  return stage && !isClosedStage(stage) ? OPPORTUNITY_STAGES.indexOf(stage) : -1;
}

function furthest(a: OpportunityStage | null, b: OpportunityStage) {
  return rank(b) > rank(a) ? b : a;
}

function logActivity(opportunityId: string, type: OpportunityActivityType, text: string, at = new Date().toISOString()) {
  opportunityRepository.createActivity({ id: randomUUID(), opportunityId, type, text, at, createdAt: new Date().toISOString() });
}

/** The timeline entry for a stage change: applying, closing and reopening read differently. */
function stageChangeActivity(from: OpportunityStage, to: OpportunityStage, note?: string): [OpportunityActivityType, string] {
  if (isClosedStage(to)) {
    return [to === 'rejected' ? 'rejection_received' : 'stage_changed', `Closed: ${STAGE_LABELS[to]}${note ? `. ${note}` : ''}`];
  }

  if (isClosedStage(from)) {
    return ['stage_changed', 'Reopened'];
  }

  if (to === 'offer') {
    return ['offer_received', `${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}`];
  }

  return [to === 'applied' ? 'application_submitted' : 'stage_changed', `${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}`];
}

export const opportunityService = {
  getAll(): OpportunityWithDetails[] {
    const prep = opportunityRepository.findAllPrep();
    const activities = opportunityRepository.findAllActivities();

    return opportunityRepository.findAll().map((opportunity) => ({
      ...opportunity,
      prep: prep.filter((item) => item.opportunityId === opportunity.id),
      activities: activities.filter((activity) => activity.opportunityId === opportunity.id),
    }));
  },

  getById(id: string): OpportunityWithDetails | undefined {
    return this.getAll().find((opportunity) => opportunity.id === id);
  },

  create(input: CreateOpportunityInput): OpportunityWithDetails {
    const now = new Date().toISOString();
    const stage = input.stage ?? 'saved';

    const opportunity: Opportunity = {
      id: randomUUID(),
      title: input.title,
      organization: input.organization ?? null,
      url: input.url ?? null,
      type: input.type ?? 'other',
      stage,
      priority: input.priority ?? 'medium',
      location: input.location ?? null,
      remote: input.remote ?? input.workMode === 'remote',
      workMode: input.workMode ?? (input.remote ? 'remote' : null),
      source: input.source ?? null,
      openDate: input.openDate ?? null,
      deadline: input.deadline ?? null,
      appliedDate: input.appliedDate ?? (rank(stage) >= rank('applied') ? settingsService.today() : null),
      decisionDate: input.decisionDate ?? null,
      nextEventDate: input.nextEventDate ?? null,
      nextEventLabel: input.nextEventLabel ?? null,
      nextEventTime: input.nextEventTime ?? null,
      reachedStage: isClosedStage(stage) ? null : stage,
      compensation: input.compensation ?? null,
      technologyTags: input.technologyTags ?? [],
      contactIds: input.contactIds ?? [],
      resumeId: input.resumeId ?? null,
      coverLetterId: input.coverLetterId ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      closedAt: isClosedStage(stage) ? now : null,
    };

    opportunityRepository.create(opportunity);
    logActivity(opportunity.id, 'created', `Saved${opportunity.source ? ` from ${opportunity.source}` : ''}`, now);
    return this.getById(opportunity.id)!;
  },

  /** Stage changes are recorded on the timeline; moving backwards is allowed. */
  update(id: string, input: UpdateOpportunityInput, closeNote?: string): OpportunityWithDetails | undefined {
    const existing = opportunityRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<Opportunity> = {
      ...input,
      updatedAt: now,
    };

    if (input.workMode !== undefined && input.remote === undefined) {
      changes.remote = input.workMode === 'remote';
    }

    if (input.stage && input.stage !== existing.stage) {
      const [type, text] = stageChangeActivity(existing.stage, input.stage, closeNote);
      logActivity(id, type, text, now);

      // A closed opportunity remembers how far it got, and reopening returns it there.
      changes.reachedStage = furthest(furthest(existing.reachedStage, existing.stage), input.stage);

      if (input.stage === 'applied' && !existing.appliedDate && input.appliedDate === undefined) {
        changes.appliedDate = settingsService.today();
      }
    }

    if (input.stage && isClosedStage(input.stage) && !isClosedStage(existing.stage)) {
      changes.closedAt = now;
    }

    if (input.stage && !isClosedStage(input.stage)) {
      changes.closedAt = null;
    }

    opportunityRepository.update(id, changes);
    return this.getById(id);
  },

  close(id: string, outcome: OpportunityStage, note?: string): OpportunityWithDetails | undefined {
    return this.update(id, { stage: outcome }, note);
  },

  reopen(id: string): OpportunityWithDetails | undefined {
    const existing = opportunityRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    return isClosedStage(existing.stage) ? this.update(id, { stage: existing.reachedStage ?? 'applied' }) : this.getById(id);
  },

  addPrepItem(opportunityId: string, text: string): OpportunityWithDetails | undefined {
    if (!opportunityRepository.findById(opportunityId)) {
      return undefined;
    }

    const now = new Date().toISOString();
    const existing = opportunityRepository.findPrep(opportunityId);
    opportunityRepository.createPrepItem({
      id: randomUUID(),
      opportunityId,
      text,
      done: false,
      position: existing.length ? Math.max(...existing.map((item) => item.position)) + 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    return this.getById(opportunityId);
  },

  updatePrepItem(opportunityId: string, itemId: string, input: { text?: string; done?: boolean }): OpportunityWithDetails | undefined {
    if (!opportunityRepository.findPrepItem(opportunityId, itemId)) {
      return undefined;
    }

    opportunityRepository.updatePrepItem(itemId, { ...input, updatedAt: new Date().toISOString() });
    return this.getById(opportunityId);
  },

  /** Remove a timeline entry, such as one logged by mistake. */
  deleteActivity(opportunityId: string, activityId: string): OpportunityWithDetails | undefined {
    return opportunityRepository.deleteActivity(opportunityId, activityId) ? this.getById(opportunityId) : undefined;
  },

  /** Log something that happened. Any entry resets the follow-up clock. */
  logActivity(opportunityId: string, input: CreateOpportunityActivityInput): OpportunityWithDetails | undefined {
    if (!opportunityRepository.findById(opportunityId)) {
      return undefined;
    }

    // A past date is stored at midday so it stays on that calendar day in any nearby timezone.
    const at = input.date && input.date !== settingsService.today() ? `${input.date}T12:00:00.000Z` : new Date().toISOString();
    logActivity(opportunityId, input.type, input.text, at);
    opportunityRepository.update(opportunityId, { updatedAt: new Date().toISOString() });
    return this.getById(opportunityId);
  },
};
