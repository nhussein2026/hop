import type { EntityId, ISODate, ISODateTime } from './common.js';

export const FIND_KINDS = ['repo', 'model', 'paper', 'tool', 'dataset', 'article', 'opportunity', 'event'] as const;
export type FindKind = (typeof FIND_KINDS)[number];

/**
 * Where a find is in triage. Each one in the inbox gets one decision: try it, read it, keep it,
 * turn it into something (an idea, an opportunity, an event), or dismiss it.
 */
export const FIND_STATUSES = ['inbox', 'try', 'read', 'kept', 'converted', 'dismissed'] as const;
export type FindStatus = (typeof FIND_STATUSES)[number];

/** Finds untouched in the inbox for longer than this are flagged for archiving. */
export const FIND_STALE_DAYS = 30;

/** Something seen in the field: a repo, a model, a paper, a tool, a chance, a department event. */
export interface Find {
  id: EntityId;
  kind: FindKind;
  title: string;
  url: string | null;
  source: string;
  /** One line on why it matters. What makes a find useful when you come back to it. */
  why: string;
  topics: string[];
  status: FindStatus;
  /** For events: when it happens. */
  eventDate: ISODate | null;
  /** What triage turned it into. */
  taskId: EntityId | null;
  resourceId: EntityId | null;
  ideaId: EntityId | null;
  opportunityId: EntityId | null;
  eventId: EntityId | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateFindInput = Pick<Find, 'kind' | 'title' | 'why'> & Partial<Pick<Find, 'url' | 'source' | 'topics' | 'eventDate'>>;
export type UpdateFindInput = Partial<Omit<Find, 'id' | 'createdAt' | 'updatedAt'>>;
