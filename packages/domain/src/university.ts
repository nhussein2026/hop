import type { EntityId, ISODate, ISODateTime } from './common.js';

/* ---- Terms ------------------------------------------------------------------------- */

/** An academic term, such as "Fall 2026–27". Classes and deadlines only count while one is running. */
export interface Term {
  id: EntityId;
  name: string;
  start: ISODate;
  end: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateTermInput = Pick<Term, 'name' | 'start' | 'end'>;
export type UpdateTermInput = Partial<CreateTermInput>;

/* ---- Courses ----------------------------------------------------------------------- */

export const COURSE_STATUSES = ['taking', 'planned', 'interested', 'completed'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** İTÜ letter grades. VF means the in-term requirements were not met, so the final could not be taken. */
export const LETTER_GRADES = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FF', 'VF'] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/** A weekly class meeting. `day` is 0 (Sunday) to 6 (Saturday); times are HH:MM. */
export interface ClassSlot {
  day: number;
  start: string;
  end: string;
  room: string;
}

/** The syllabus rule for taking the final. Null limits mean the syllabus sets none. */
export interface FinalEligibility {
  rule: string;
  minInTerm: number | null;
  maxAbsences: number | null;
}

export interface Course {
  id: EntityId;
  /** SIS format, such as "BLG 527E". */
  code: string;
  name: string;
  termId: EntityId | null;
  status: CourseStatus;
  crn: string | null;
  instructorId: EntityId | null;
  credits: number | null;
  ects: number | null;
  ninovaUrl: string | null;
  schedule: ClassSlot[];
  vf: FinalEligibility | null;
  absences: number;
  /** The weighted average the student wants to finish with (1–100). */
  target: number | null;
  grade: LetterGrade | null;
  /** Why a planned or interesting course matters. */
  why: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const ASSESSMENT_TYPES = ['homework', 'quiz', 'midterm', 'final', 'project', 'presentation', 'lab'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

/** Assessments sat in class rather than handed in. They are never "submitted". */
export const EXAM_TYPES: readonly AssessmentType[] = ['quiz', 'midterm', 'final'];

/** A graded item from the syllabus: a deadline with a weight, and later a score. */
export interface Assessment {
  id: EntityId;
  courseId: EntityId;
  title: string;
  type: AssessmentType;
  /** Share of the course grade, in percent. */
  weight: number;
  due: ISODate | null;
  time: string | null;
  /** Out of 100. */
  score: number | null;
  submitted: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A course as the API returns it: with its graded items in syllabus order. */
export interface CourseWithDetails extends Course {
  grading: Assessment[];
}

export type CreateCourseInput = Pick<Course, 'code' | 'name'> &
  Partial<Omit<Course, 'id' | 'code' | 'name' | 'createdAt' | 'updatedAt'>> & {
    /** Graded items read from the syllabus. Dates can be added later. */
    grading?: Pick<Assessment, 'title' | 'type' | 'weight'>[];
  };

export type UpdateCourseInput = Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateAssessmentInput = Pick<Assessment, 'title' | 'type' | 'weight'> & Partial<Pick<Assessment, 'due' | 'time'>>;
export type UpdateAssessmentInput = Partial<Pick<Assessment, 'title' | 'type' | 'weight' | 'due' | 'time' | 'score' | 'submitted'>> & {
  /** Move the item to another course. */
  courseId?: EntityId;
};

/* ---- Handbook ------------------------------------------------------------------------ */

export const KEY_DATE_KINDS = ['deadline', 'exam', 'holiday', 'term'] as const;
export type KeyDateKind = (typeof KEY_DATE_KINDS)[number];

/** A date from the academic calendar. Deadlines reach Today, the agenda and notifications. */
export interface KeyDate {
  id: EntityId;
  title: string;
  date: ISODate;
  kind: KeyDateKind;
  note: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateKeyDateInput = Pick<KeyDate, 'title' | 'date' | 'kind'> & Partial<Pick<KeyDate, 'note'>>;
export type UpdateKeyDateInput = Partial<CreateKeyDateInput>;

export const PIN_KINDS = ['rule', 'office', 'tip'] as const;
export type PinKind = (typeof PIN_KINDS)[number];

/** Something looked up more than once: a VF rule, where to take a form, a registration tip. */
export interface Pin {
  id: EntityId;
  kind: PinKind;
  title: string;
  body: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreatePinInput = Pick<Pin, 'kind' | 'title'> & Partial<Pick<Pin, 'body'>>;
export type UpdatePinInput = Partial<CreatePinInput>;

export interface UniLink {
  id: EntityId;
  title: string;
  url: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateUniLinkInput = Pick<UniLink, 'title' | 'url'>;
export type UpdateUniLinkInput = Partial<CreateUniLinkInput>;

/* ---- Library ------------------------------------------------------------------------- */

export const RESOURCE_KINDS = ['note', 'slides', 'past-exam', 'paper', 'book', 'video', 'link', 'repo', 'file'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** File types the library accepts, by MIME type, with the extension each is stored under. */
export const RESOURCE_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/zip': '.zip',
  'application/x-ipynb+json': '.ipynb',
  'image/png': '.png',
  'image/jpeg': '.jpg',
} as const;
export type ResourceFileType = keyof typeof RESOURCE_FILE_TYPES;

/** Files live in the database so backups carry them. This keeps a backup restorable. */
export const RESOURCE_FILE_MAX_BYTES = 20 * 1024 * 1024;

export interface ResourceFile {
  name: string;
  type: ResourceFileType;
  size: number;
  uploadedAt: ISODateTime;
}

/** Anything worth finding again: a note, slides, a past exam, a paper, a link. */
export interface Resource {
  id: EntityId;
  kind: ResourceKind;
  title: string;
  url: string | null;
  courseId: EntityId | null;
  topics: string[];
  /** The text of a note. */
  body: string;
  /** Where it came from: "Ninova", "From a senior", "arXiv". */
  source: string | null;
  file: ResourceFile | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateResourceInput = Pick<Resource, 'kind' | 'title'> & Partial<Pick<Resource, 'url' | 'courseId' | 'topics' | 'body' | 'source'>>;
export type UpdateResourceInput = Partial<Pick<Resource, 'kind' | 'title' | 'url' | 'courseId' | 'topics' | 'body' | 'source'>>;

/* ---- Research ------------------------------------------------------------------------- */

export const IDEA_KINDS = ['thesis', 'paper', 'project'] as const;
export type IdeaKind = (typeof IDEA_KINDS)[number];

/** From a raw spark to active work. Parked ideas keep their links and can come back. */
export const IDEA_STAGES = ['spark', 'exploring', 'validated', 'proposed', 'active', 'parked'] as const;
export type IdeaStage = (typeof IDEA_STAGES)[number];

export interface Idea {
  id: EntityId;
  title: string;
  kind: IdeaKind;
  stage: IdeaStage;
  question: string;
  why: string;
  nextStep: string;
  resourceIds: EntityId[];
  /** People who could supervise or advise. */
  advisorIds: EntityId[];
  /** Courses the idea came from. */
  courseIds: EntityId[];
  /** Radar finds the idea came from. */
  findIds: EntityId[];
  projectId: EntityId | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateIdeaInput = Pick<Idea, 'title'> & Partial<Omit<Idea, 'id' | 'title' | 'createdAt' | 'updatedAt'>>;
export type UpdateIdeaInput = Partial<Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>>;

/** Thesis progress, from choosing a topic to the defense. */
export const THESIS_STEPS = ['topic', 'advisor', 'proposal', 'research', 'defense'] as const;
export type ThesisStep = (typeof THESIS_STEPS)[number];

/** The degree programme. Stored with the settings, since there is only one. */
export interface Program {
  degree: string;
  department: string;
  /** Teaching weeks in a term, used for "week 3 of 14". */
  weeks: number;
  thesisStep: ThesisStep;
  advisorId: EntityId | null;
}
