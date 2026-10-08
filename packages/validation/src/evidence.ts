import { z } from 'zod';

import { dateSchema as date, entityIdSchema as entityId } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

const evidenceFields = {
  title: z.string().trim().min(1, 'Evidence title is required').max(200, 'Evidence title cannot exceed 200 characters'),
  description: text('Description', 5000).nullable().optional(),
  skillId: entityId.nullable().optional(),
  skillIds: z.array(entityId).max(50).optional(),
  projectId: entityId.nullable().optional(),
  opportunityId: entityId.nullable().optional(),
  goalId: entityId.nullable().optional(),
  url: z.string().trim().url('Evidence URL must be valid').nullable().optional(),
  date: date.nullable().optional(),
};

export const createEvidenceSchema = z.object(evidenceFields).strict();
export const updateEvidenceSchema = z.object(evidenceFields).partial().strict();
