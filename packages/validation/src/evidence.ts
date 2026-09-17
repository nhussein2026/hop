import { z } from 'zod';

const entityId = z.string().trim().min(1, 'ID cannot be empty');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');
const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

const evidenceFields = {
  title: z.string().trim().min(1, 'Evidence title is required').max(200, 'Evidence title cannot exceed 200 characters'),
  description: text('Description', 5000).nullable().optional(),
  skillId: entityId.nullable().optional(),
  projectId: entityId.nullable().optional(),
  opportunityId: entityId.nullable().optional(),
  goalId: entityId.nullable().optional(),
  url: z.string().url('Evidence URL must be valid').nullable().optional(),
  date: date.nullable().optional(),
};

export const createEvidenceSchema = z.object(evidenceFields).strict();
export const updateEvidenceSchema = z.object(evidenceFields).partial().strict();
