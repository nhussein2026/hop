import type { Language } from './book.js';
import type { EntityId, ISODate, ISODateTime } from './common.js';

export const FIND_KINDS = ['repo', 'model', 'paper', 'tool', 'dataset', 'article', 'book', 'opportunity', 'event', 'site'] as const;
export type FindKind = (typeof FIND_KINDS)[number];

/**
 * Where a find is in triage. Each one in the inbox gets one decision: try it, read it, keep it,
 * turn it into something (an idea, an opportunity, an event, a book to read), or dismiss it.
 * `explore` holds things you're curious about but unsure deserve a try. They wait there without
 * going stale, until a review moment.
 */
export const FIND_STATUSES = ['inbox', 'explore', 'try', 'read', 'kept', 'converted', 'dismissed'] as const;
export type FindStatus = (typeof FIND_STATUSES)[number];

/** Where a new find can be put: the inbox, or straight onto the To explore shelf. */
export const NEW_FIND_STATUSES = ['inbox', 'explore'] as const satisfies readonly FindStatus[];

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
  /** Null for finds saved before Hop recorded languages. */
  language: Language | null;
  /** For events: when it happens. */
  eventDate: ISODate | null;
  /** What triage turned it into. */
  taskId: EntityId | null;
  resourceId: EntityId | null;
  ideaId: EntityId | null;
  opportunityId: EntityId | null;
  eventId: EntityId | null;
  bookId: EntityId | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateFindInput = Pick<Find, 'kind' | 'title' | 'why'> & Partial<Pick<Find, 'url' | 'source' | 'topics' | 'eventDate' | 'language'>> & {
  status?: (typeof NEW_FIND_STATUSES)[number];
};
export type UpdateFindInput = Partial<Omit<Find, 'id' | 'createdAt' | 'updatedAt'>>;
