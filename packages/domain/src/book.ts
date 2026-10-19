import type { EntityId, ISODate, ISODateTime } from './common.js';

/**
 * Languages Hop records for reading and finds. Knowing the language lets Hop show how much of the
 * time spent on the field was also language practice.
 */
export const LANGUAGES = ['tr', 'en', 'ar', 'other'] as const;
export type Language = (typeof LANGUAGES)[number];

export const BOOK_STATUSES = ['want', 'reading', 'finished', 'dropped'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const BOOK_FORMATS = ['paper', 'ebook', 'audio'] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

/** Loans start with this many days, and at this library, when no earlier loan suggests otherwise. */
export const DEFAULT_LOAN_DAYS = 14;
export const DEFAULT_LIBRARY = 'İTÜ Library';

export const MAX_TAKEAWAYS = 3;

/**
 * A book read for the field as a whole, not for one course (course books live in the İTÜ library).
 * Suggestions wait under "Want to read" with who suggested them and why.
 */
export interface Book {
  id: EntityId;
  title: string;
  author: string | null;
  /** Total pages, used for progress and the finish estimate. */
  pages: number | null;
  language: Language | null;
  format: BookFormat;
  status: BookStatus;
  /** One line on why it matters, like a Radar find. */
  why: string;
  /** Who suggested it, when it's someone in People. */
  suggestedById: EntityId | null;
  /** Who or what suggested it otherwise: "BLG 513 syllabus", "speaker at the ACM talk". */
  suggestedBy: string | null;
  topics: string[];
  skillIds: EntityId[];
  goalId: EntityId | null;
  /** Logging pages ticks this habit for the day. */
  habitId: EntityId | null;
  startedOn: ISODate | null;
  finishedOn: ISODate | null;
  /** 1 to 5, given when finished. */
  rating: number | null;
  takeaways: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A borrowing from a library. A book can be borrowed again later, so loans are kept as history. */
export interface BookLoan {
  id: EntityId;
  bookId: EntityId;
  library: string;
  borrowedOn: ISODate;
  dueOn: ISODate;
  /** The day of each renewal, oldest first. */
  renewedOn: ISODate[];
  /** How many renewals the library allows. Null when unknown. */
  maxRenewals: number | null;
  returnedOn: ISODate | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** The page reached on a day. One entry per book and day; logging again that day replaces it. */
export interface ReadingEntry {
  id: EntityId;
  bookId: EntityId;
  date: ISODate;
  page: number;
  createdAt: ISODateTime;
}

/** A book as the API returns it: with its loans (oldest first) and reading log (by date). */
export interface BookWithDetails extends Book {
  loans: BookLoan[];
  log: ReadingEntry[];
}

export type CreateBookInput = Pick<Book, 'title'> & Partial<Omit<Book, 'id' | 'title' | 'createdAt' | 'updatedAt'>>;
export type UpdateBookInput = Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>;

export type LogReadingInput = Pick<ReadingEntry, 'date' | 'page'>;

export type CreateLoanInput = Pick<BookLoan, 'borrowedOn' | 'dueOn'> & Partial<Pick<BookLoan, 'library' | 'maxRenewals'>>;
/** `renewedOn` is here so a renewal can be undone. */
export type UpdateLoanInput = Partial<Pick<BookLoan, 'library' | 'borrowedOn' | 'dueOn' | 'renewedOn' | 'maxRenewals' | 'returnedOn'>>;
export type RenewLoanInput = { date: ISODate; dueOn: ISODate };
