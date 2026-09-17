import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

export const PROJECT_STATUSES = [
  'planned',
  'building',
  'deployed',
  'paused',
  'archived',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: EntityId;
  name: string;
  problem: string | null;
  blurb: string | null;
  status: ProjectStatus;
  startDate: ISODate | null;
  endDate: ISODate | null;
  stack: string[];
  repositoryUrl: string | null;
  demoUrl: string | null;
  learned: string | null;
  challenges: string | null;
  architectureNotes: string | null;
  goalIds: EntityId[];
  skillIds: EntityId[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Omit<Project, 'id' | 'name' | 'createdAt' | 'updatedAt'>>;

export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>;
