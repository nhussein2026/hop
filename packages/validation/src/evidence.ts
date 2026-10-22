import { z } from 'zod';

import { EVIDENCE_KINDS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as entityId } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

// Who vouches for it and when is checked by the evidence service, since it depends on the kind.
const evidenceFields = {
  title: z.string().trim().min(1, 'Evidence title is required').max(200, 'Evidence title cannot exceed 200 characters'),
  kind: z.enum(EVIDENCE_KINDS),
  by: text('“By”', 200).nullable().optional(),
  result: text('Result', 120).nullable().optional(),
  description: text('Description', 5000).nullable().optional(),
  skillId: entityId.nullable().optional(),
  skillIds: z.array(entityId).max(50).optional(),
  projectId: entityId.nullable().optional(),
  opportunityId: entityId.nullable().optional(),
  goalId: entityId.nullable().optional(),
  courseId: entityId.nullable().optional(),
  url: z.string().trim().url('Evidence URL must be valid').nullable().optional(),
  date: date.nullable().optional(),
};

export const createEvidenceSchema = z.object(evidenceFields).strict();
export const updateEvidenceSchema = z.object(evidenceFields).partial().strict();
