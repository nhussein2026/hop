import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

export interface Evidence {
  id: EntityId;
  title: string;
  description: string | null;
  skillId: EntityId | null;
  projectId: EntityId | null;
  opportunityId: EntityId | null;
  goalId: EntityId | null;
  url: string | null;
  date: ISODate | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateEvidenceInput = Pick<Evidence, 'title'> &
  Partial<Omit<Evidence, 'id' | 'title' | 'createdAt' | 'updatedAt'>>;

export type UpdateEvidenceInput = Partial<Omit<Evidence, 'id' | 'createdAt' | 'updatedAt'>>;
