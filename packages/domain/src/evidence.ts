import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

/**
 * What a piece of evidence shows. Built is your own work; Test, Review and Used come from someone
 * else; Top compares the work with the best. Learned (a book, a course, a tutorial) is kept in a
 * skill's history but never counts toward its level.
 */
export const EVIDENCE_KINDS = ['built', 'test', 'review', 'used', 'top', 'learned'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * Kinds someone else vouches for. They need `by`, so they can't be self-declared, and a `date`,
 * because a tool skill's proof expires.
 */
export const ATTESTED_KINDS: readonly EvidenceKind[] = ['test', 'review', 'used', 'top'];

/** Proof of a tool skill counts for this many months after its date. Fundamentals never expire. */
export const EVIDENCE_VALID_MONTHS = 18;

export interface Evidence {
  id: EntityId;
  title: string;
  description: string | null;
  /** Null for entries recorded before kinds existed. They count as Built until a kind is set. */
  kind: EvidenceKind | null;
  /** Who graded, reviewed or used it, or who it was compared with: "İTÜ, BLG 527E". */
  by: string | null;
  /** A grade, score, percentile or user count. */
  result: string | null;
  /** First linked skill, kept for older clients. skillIds holds every linked skill. */
  skillId: EntityId | null;
  skillIds: EntityId[];
  projectId: EntityId | null;
  opportunityId: EntityId | null;
  goalId: EntityId | null;
  /** The İTÜ course whose grade this is. */
  courseId: EntityId | null;
  url: string | null;
  date: ISODate | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** New evidence always has a kind; only entries from before kinds existed lack one. */
export type CreateEvidenceInput = Pick<Evidence, 'title'> & { kind: EvidenceKind } &
  Partial<Omit<Evidence, 'id' | 'title' | 'kind' | 'createdAt' | 'updatedAt'>>;

export type UpdateEvidenceInput = Partial<Omit<Evidence, 'id' | 'kind' | 'createdAt' | 'updatedAt'>> & { kind?: EvidenceKind };
