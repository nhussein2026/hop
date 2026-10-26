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

/**
 * How essential a plan step is. The minimum is done every day, even a bad one; standard is the
 * normal plan; extended is for a day with time to spare and never counts against the week.
 */
export const PRACTICE_TIERS = ['minimum', 'standard', 'extended'] as const;
export type PracticeTier = (typeof PRACTICE_TIERS)[number];

/** A step of the daily plan, done on the listed weekdays. Doing it records a session. */
export interface PracticeActivity {
  id: EntityId;
  area: PracticeArea;
  tier: PracticeTier;
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

/**
 * What a skill check measures: the four exam skills, plus vocabulary (`words`) and grammar, which
 * are checked on their own even though practice counts grammar under words.
 */
export const CHECK_AREAS = ['speaking', 'writing', 'listening', 'reading', 'words', 'grammar'] as const;
export type CheckArea = (typeof CHECK_AREAS)[number];

/** Who judged the level or counted the errors. */
export const CHECK_JUDGES = ['self', 'claude', 'teacher', 'tutor', 'exam'] as const;
export type CheckJudge = (typeof CHECK_JUDGES)[number];

export const LISTENING_MODES = ['dictation', 'questions'] as const;
export type ListeningMode = (typeof LISTENING_MODES)[number];

/**
 * The counts a check records, by area. Rates and percentages (words per minute, errors per 100
 * words, % right) are derived from them, never stored.
 */
export interface CheckMetricsByArea {
  speaking: { seconds: number; words: number; errors: number };
  writing: { minutes: number; words: number; errors: number; rubric?: number };
  listening: { mode: ListeningMode; correct: number; total: number };
  reading: { correct: number; total: number; minutes?: number };
  /** Anki's true retention and mature cards, and a frequency-band sample: `known` of `sampled` words. */
  words: { retention?: number; mature?: number; known?: number; sampled?: number };
  grammar: { correct: number; total: number };
}
export type CheckMetrics = CheckMetricsByArea[CheckArea];

/**
 * A measured result: what you can do, not how long you practised. The plan's gates are judged on
 * these. Recordings and texts stay where they are; `link` says where.
 */
export interface LanguageCheck {
  id: EntityId;
  date: ISODate;
  area: CheckArea;
  /** What was done: "2-min monologue: my neighbourhood". */
  task: string;
  metrics: CheckMetrics;
  /** A level judgment, when someone gave one. */
  level: CefrLevel | null;
  judgedBy: CheckJudge | null;
  /** Where the recording or text is: a file name or URL. */
  link: string;
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

export type CreatePracticeActivityInput = Pick<PracticeActivity, 'area' | 'title' | 'minutes'> & Partial<Pick<PracticeActivity, 'detail' | 'slot' | 'days' | 'position' | 'active' | 'tier'>>;
export type UpdatePracticeActivityInput = Partial<Omit<PracticeActivity, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreatePracticeSessionInput = Pick<PracticeSession, 'date' | 'minutes'> & Partial<Pick<PracticeSession, 'area' | 'activityId' | 'note'>>;
export type UpdatePracticeSessionInput = Partial<Pick<PracticeSession, 'date' | 'area' | 'minutes' | 'note'>>;

export type CreatePracticeTestInput = Pick<PracticeTest, 'date' | 'scores'> & Partial<Pick<PracticeTest, 'title' | 'max' | 'note'>>;
export type UpdatePracticeTestInput = Partial<Omit<PracticeTest, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateLanguageCheckInput = Pick<LanguageCheck, 'date' | 'area' | 'metrics'> & Partial<Pick<LanguageCheck, 'task' | 'level' | 'judgedBy' | 'link' | 'note'>>;
export type UpdateLanguageCheckInput = Partial<Omit<LanguageCheck, 'id' | 'createdAt' | 'updatedAt'>>;
