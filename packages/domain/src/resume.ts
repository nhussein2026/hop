import type { EntityId, ISODateTime } from './common.js';

export const RESUME_FILE_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
} as const;

export type ResumeFileType = keyof typeof RESUME_FILE_TYPES;

/** Large enough for any resume, small enough to keep backups quick. */
export const RESUME_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** The uploaded document for a resume version, without its contents. */
export interface ResumeFile {
  name: string;
  type: ResumeFileType;
  size: number;
  uploadedAt: ISODateTime;
}

/** A resume version you send out. Opportunities record which one they received. */
export interface Resume {
  id: EntityId;
  name: string;
  /** Numbered in the order versions are added: v1, v2, … */
  version: number;
  focus: string | null;
  archived: boolean;
  file: ResumeFile | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateResumeInput = Pick<Resume, 'name'> & Partial<Pick<Resume, 'focus'>>;

export type UpdateResumeInput = Partial<Pick<Resume, 'name' | 'focus' | 'archived'>>;
