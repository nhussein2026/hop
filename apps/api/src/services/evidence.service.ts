import { randomUUID } from 'node:crypto';

import { ATTESTED_KINDS } from '@hop/domain';
import type {
  CreateEvidenceInput,
  Evidence,
  EvidenceKind,
  UpdateEvidenceInput,
} from '@hop/domain';

import { InvalidInputError } from '../errors.js';
import { evidenceRepository } from '../repositories/evidence.repository.js';

/** How to name each kind that needs `by`, and what `by` means for it. */
const ATTESTED: Partial<Record<EvidenceKind, [string, string]>> = {
  test: ['A test', 'who graded it'],
  review: ['A review', 'who reviewed it'],
  used: ['Used evidence', 'who used it'],
  top: ['A top proof', 'who or what it was compared with'],
};

/**
 * Proof that someone else vouches for must say who, or it is only your word, and when, because a
 * tool skill's proof expires.
 */
function checkProof({ kind, by, date }: Pick<Evidence, 'kind' | 'by' | 'date'>) {
  if (!kind || !ATTESTED_KINDS.includes(kind)) {
    return;
  }

  const [name, who] = ATTESTED[kind]!;

  if (!by?.trim()) {
    throw new InvalidInputError(`${name} needs “by”: ${who}.`);
  }

  if (!date) {
    throw new InvalidInputError(`${name} needs a date, so Hop knows how long it counts.`);
  }
}

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
      kind: input.kind,
      by: input.by ?? null,
      result: input.result ?? null,
      skillId: input.skillIds?.[0] ?? input.skillId ?? null,
      skillIds: input.skillIds ?? (input.skillId ? [input.skillId] : []),
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      goalId: input.goalId ?? null,
      courseId: input.courseId ?? null,
      url: input.url ?? null,
      date: input.date ?? null,
      createdAt: now,
      updatedAt: now,
    };

    checkProof(item);
    return evidenceRepository.create(item);
  },

  update(id: string, input: UpdateEvidenceInput): Evidence | undefined {
    const existing = evidenceRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    checkProof({
      kind: input.kind ?? existing.kind,
      by: input.by !== undefined ? input.by : existing.by,
      date: input.date !== undefined ? input.date : existing.date,
    });

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
