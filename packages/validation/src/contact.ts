import { z } from 'zod';
import { CONTACT_KINDS, INTERACTION_TYPES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

const contactFields = {
  name: z.string().trim().min(1, 'Name is required').max(160, 'Name cannot exceed 160 characters'),
  role: text('Role', 160).nullable().optional(),
  organization: text('Organization', 160).nullable().optional(),
  kind: z.enum(CONTACT_KINDS),
  email: z.string().trim().email('That email address looks incomplete').nullable().optional(),
  linkedin: text('LinkedIn', 300).nullable().optional(),
  notes: text('Notes', 5000).nullable().optional(),
};

export const createContactSchema = z.object({ ...contactFields, kind: contactFields.kind.optional() }).strict();

export const updateContactSchema = z.object(contactFields).partial().strict();

export const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES),
  date,
  summary: z.string().trim().min(1, 'Write one line about what happened').max(1000, 'Summary cannot exceed 1000 characters'),
  opportunityId: id.nullable().optional(),
}).strict();
