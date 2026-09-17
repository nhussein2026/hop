import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

export const SKILL_LEVELS = [
  'learning',
  'practicing',
  'confident',
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export interface Skill {
  id: EntityId;
  name: string;
  category: string | null;
  level: SkillLevel;
  confidence: number | null;
  lastPracticedAt: ISODate | null;
  yearsExperience: number | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateSkillInput = Pick<Skill, 'name'> &
  Partial<
    Pick<
      Skill,
      | 'category'
      | 'level'
      | 'confidence'
      | 'lastPracticedAt'
      | 'yearsExperience'
      | 'notes'
    >
  >;

export type UpdateSkillInput = Partial<Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>>;
