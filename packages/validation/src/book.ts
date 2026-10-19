import { z } from 'zod';
import { BOOK_FORMATS, BOOK_STATUSES, LANGUAGES, MAX_TAKEAWAYS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const page = z.number().int('Use a whole page number').min(0, 'Pages cannot be negative').max(20000, 'That is more pages than any book has');

const bookFields = {
  title: text('Title', 200).min(1, 'Add a title'),
  author: text('Author', 200).nullable(),
  pages: page.min(1, 'A book has at least one page').nullable(),
  language: z.enum(LANGUAGES).nullable(),
  format: z.enum(BOOK_FORMATS),
  status: z.enum(BOOK_STATUSES),
  why: text('Why it matters', 500),
  suggestedById: id.nullable(),
  suggestedBy: text('Suggested by', 200).nullable(),
  topics: z.array(text('Each topic', 60).min(1)).max(30, 'Use up to 30 topics'),
  skillIds: z.array(id).max(30, 'Link up to 30 skills'),
  goalId: id.nullable(),
  habitId: id.nullable(),
  startedOn: date.nullable(),
  finishedOn: date.nullable(),
  rating: z.number().int().min(1, 'Rate from 1 to 5').max(5, 'Rate from 1 to 5').nullable(),
  takeaways: z.array(text('Each takeaway', 500).min(1)).max(MAX_TAKEAWAYS, `Keep up to ${MAX_TAKEAWAYS} takeaways`),
};

export const createBookSchema = z.object(bookFields).partial().required({ title: true }).strict();
export const updateBookSchema = z.object(bookFields).partial().strict();

export const logReadingSchema = z.object({ date, page }).strict();

const library = text('Library', 120).min(1, 'Name the library');
const maxRenewals = z.number().int().min(0).max(20).nullable();

export const createLoanSchema = z.object({ library: library.optional(), borrowedOn: date, dueOn: date, maxRenewals: maxRenewals.optional() }).strict();
export const updateLoanSchema = z.object({ library, borrowedOn: date, dueOn: date, renewedOn: z.array(date).max(20), maxRenewals, returnedOn: date.nullable() }).partial().strict();
export const renewLoanSchema = z.object({ date, dueOn: date }).strict();
