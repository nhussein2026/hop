import type {
  EntityId,
  ISODate,
  ISODateTime,
} from './common.js';

/** The self-assessed levels used before levels came from evidence. Kept so old ratings stay readable. */
export const SKILL_LEVELS = [
  'learning',
  'practicing',
  'confident',
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Proof of a tool (React, FastAPI) expires; proof of a fundamental (data structures, OOP) never does. */
export const SKILL_TYPES = ['tool', 'fundamental'] as const;
export type SkillType = (typeof SKILL_TYPES)[number];

/**
 * Where a skill sits on the current path. Standout skills aim for Top-tier (one or two at most);
 * parked skills are kept but left out of warnings.
 */
export const SKILL_FOCUSES = ['core', 'standout', 'keep', 'parked'] as const;
export type SkillFocus = (typeof SKILL_FOCUSES)[number];

/** A skill's proof level is not stored: the web app derives it from the skill's evidence. */
export interface Skill {
  id: EntityId;
  name: string;
  /** The layer it belongs to, such as "Foundations" or "AI engineering". */
  category: string | null;
  type: SkillType;
  focus: SkillFocus;
  /** Shown publicly: portfolio, LinkedIn, CV. */
  listed: boolean;
  /** What Verified means for this skill, in the user's own words. */
  bar: string | null;
  /** The rating given before levels came from evidence. Read-only; null for skills added since. */
  level: SkillLevel | null;
  /** A private 1–10 rating of how ready it feels. Never part of the level. */
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
      | 'type'
      | 'focus'
      | 'listed'
      | 'bar'
      | 'confidence'
      | 'lastPracticedAt'
      | 'yearsExperience'
      | 'notes'
    >
  >;

export type UpdateSkillInput = Partial<Omit<Skill, 'id' | 'level' | 'createdAt' | 'updatedAt'>>;
