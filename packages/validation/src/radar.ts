import { z } from 'zod';
import { FIND_KINDS, FIND_STATUSES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

const findFields = {
  kind: z.enum(FIND_KINDS),
  title: text('Title', 200).min(1, 'Add a title'),
  url: z.string().trim().max(2000, 'Links cannot exceed 2000 characters').regex(/^https?:\/\/\S+\.\S+/, 'Use a full link starting with https://').nullable(),
  source: text('Source', 120),
  why: text('Why it matters', 500).min(1, 'Write one line on why it matters'),
  topics: z.array(text('Each topic', 60).min(1)).max(30, 'Use up to 30 topics'),
  status: z.enum(FIND_STATUSES),
  eventDate: date.nullable(),
  taskId: id.nullable(),
  resourceId: id.nullable(),
  ideaId: id.nullable(),
  opportunityId: id.nullable(),
  eventId: id.nullable(),
};

export const createFindSchema = z.object({
  kind: findFields.kind,
  title: findFields.title,
  why: findFields.why,
  url: findFields.url.optional(),
  source: findFields.source.optional(),
  topics: findFields.topics.optional(),
  eventDate: findFields.eventDate.optional(),
}).strict();

export const updateFindSchema = z.object(findFields).partial().strict();
