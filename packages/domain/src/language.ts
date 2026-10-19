import type { Language } from './book.js';
import type { EntityId, ISODate, ISODateTime } from './common.js';

/** The four skills a proficiency exam tests, each in its own section. */
export const LANGUAGE_SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
export type LanguageSkill = (typeof LANGUAGE_SKILLS)[number];

/** What practice works on: one of the four skills, or words and grammar, which feed all four. */
export const PRACTICE_AREAS = [...LANGUAGE_SKILLS, 'words'] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Where an activity fits the day, in the order the day goes: on the bus or train, anywhere, then at home where you can speak and write. */
export const PRACTICE_SLOTS = ['commute', 'any', 'home'] as const;
export type PracticeSlot = (typeof PRACTICE_SLOTS)[number];

export interface LanguageExam {
  name: string;
  /** Points per section. They add up to 100. */
  sections: Record<LanguageSkill, number>;
  /** Total needed to pass, out of 100. */
  passMark: number;
}

/** İTÜ TÖMER's certificate exam, the one İTÜ accepts (with Yunus Emre Enstitüsü's). */
export const ITU_TOMER_EXAM: LanguageExam = {
  name: 'İTÜ TÖMER certificate exam',
  sections: { listening: 20, reading: 30, writing: 25, speaking: 25 },
  passMark: 70,
};

/** Weeks İTÜ TÖMER's daytime course takes per level. Level checkpoints are spaced in the same proportion. */
export const LEVEL_WEEKS: Record<CefrLevel, number> = { A1: 8, A2: 8, B1: 9, B2: 9, C1: 10, C2: 10 };

/** Days of history the app loads; reviews and the 12-week view need no more. */
export const PRACTICE_HISTORY_DAYS = 84;

/** The language being learned, toward an exam on a date. Stored with the settings, since there is one. */
export interface LanguageTrack {
  language: Language;
  /** The level you're working through now. */
  level: CefrLevel;
  target: CefrLevel;
  examDate: ISODate;
  exam: LanguageExam;
  /** The goal the track moves. Its milestones are the level checkpoints. */
  goalId: EntityId | null;
  startedOn: ISODate;
}

/** A step of the daily plan, done on the listed weekdays. Doing it records a session. */
export interface PracticeActivity {
  id: EntityId;
  area: PracticeArea;
  title: string;
  /** How to do it well, and what changes with your level. */
  detail: string;
  minutes: number;
  slot: PracticeSlot;
  /** Weekdays it's planned on: 0 Sunday … 6 Saturday. */
  days: number[];
  position: number;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Time practised on a day: a planned activity (once per day; doing it again changes the minutes),
 * or anything else, like class homework or a chat with a friend.
 */
export interface PracticeSession {
  id: EntityId;
  date: ISODate;
  area: PracticeArea;
  minutes: number;
  activityId: EntityId | null;
  note: string;
  createdAt: ISODateTime;
}

/** A practice exam's result. Sections not taken are left out; `max` keeps old results comparable. */
export interface PracticeTest {
  id: EntityId;
  date: ISODate;
  title: string;
  scores: Partial<Record<LanguageSkill, number>>;
  max: Record<LanguageSkill, number>;
  note: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Minutes practised per area since the track started, and on how many days. */
export interface PracticeTotals {
  minutes: Record<PracticeArea, number>;
  days: number;
}

export type SetupTrackInput = Pick<LanguageTrack, 'level' | 'target' | 'examDate'> & Partial<Pick<LanguageTrack, 'language' | 'exam'>>;
export type UpdateTrackInput = Partial<Omit<LanguageTrack, 'language' | 'startedOn'>>;

export type CreatePracticeActivityInput = Pick<PracticeActivity, 'area' | 'title' | 'minutes'> & Partial<Pick<PracticeActivity, 'detail' | 'slot' | 'days' | 'position' | 'active'>>;
export type UpdatePracticeActivityInput = Partial<Omit<PracticeActivity, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreatePracticeSessionInput = Pick<PracticeSession, 'date' | 'minutes'> & Partial<Pick<PracticeSession, 'area' | 'activityId' | 'note'>>;
export type UpdatePracticeSessionInput = Partial<Pick<PracticeSession, 'date' | 'area' | 'minutes' | 'note'>>;

export type CreatePracticeTestInput = Pick<PracticeTest, 'date' | 'scores'> & Partial<Pick<PracticeTest, 'title' | 'max' | 'note'>>;
export type UpdatePracticeTestInput = Partial<Omit<PracticeTest, 'id' | 'createdAt' | 'updatedAt'>>;
