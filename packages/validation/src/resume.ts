import { z } from 'zod';

const name = z.string().trim().min(1, 'Name this version').max(160, 'Name cannot exceed 160 characters');
const focus = z.string().trim().max(500, 'Focus cannot exceed 500 characters');

export const createResumeSchema = z.object({ name, focus: focus.optional() }).strict();

export const updateResumeSchema = z.object({ name: name.optional(), focus: focus.nullable().optional(), archived: z.boolean().optional() }).strict();
