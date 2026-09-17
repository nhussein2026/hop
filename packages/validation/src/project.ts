import { z } from 'zod';

import { PROJECT_STATUSES } from '@hop/domain';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');
const textField = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const idList = z.array(z.string().trim().min(1, 'ID cannot be empty')).max(50);

const projectFields = {
  name: z.string().trim().min(1, 'Project name is required').max(160, 'Project name cannot exceed 160 characters'),
  problem: textField('Problem', 5000).nullable().optional(),
  blurb: textField('Project summary', 5000).nullable().optional(),
  status: z.enum(PROJECT_STATUSES),
  startDate: dateSchema.nullable().optional(),
  endDate: dateSchema.nullable().optional(),
  stack: z.array(z.string().trim().min(1)).max(50).optional(),
  repositoryUrl: z.string().url('Repository URL must be valid').nullable().optional(),
  demoUrl: z.string().url('Demo URL must be valid').nullable().optional(),
  learned: textField('Learned notes', 5000).nullable().optional(),
  challenges: textField('Challenges', 5000).nullable().optional(),
  architectureNotes: textField('Architecture notes', 5000).nullable().optional(),
  goalIds: idList.optional(),
  skillIds: idList.optional(),
};

export const createProjectSchema = z.object({
  ...projectFields,
  status: projectFields.status.optional(),
}).strict();

export const updateProjectSchema = z.object(projectFields).partial().strict();
