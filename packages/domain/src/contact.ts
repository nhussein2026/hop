import type { EntityId, ISODate, ISODateTime } from './common.js';

export const CONTACT_KINDS = [
  'recruiter',
  'hiring manager',
  'referral',
  'mentor',
  'colleague',
  'interviewer',
  'community',
  'instructor',
  'other',
] as const;

export const INTERACTION_TYPES = ['email', 'message', 'call', 'meeting', 'interview', 'referral'] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];

/** What you've learned about working with an instructor: from experience and from seniors. */
export interface Playbook {
  exams: string;
  values: string;
  office: string;
  email: string;
  tips: string[];
}

/** Someone you talk to about your career or studies: a recruiter, a referral, a mentor, an instructor. */
export interface Contact {
  id: EntityId;
  name: string;
  role: string | null;
  organization: string | null;
  kind: ContactKind;
  email: string | null;
  linkedin: string | null;
  notes: string | null;
  /** Research interests. Used to suggest possible thesis advisors. */
  interests: string[];
  playbook: Playbook | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Interaction {
  id: EntityId;
  contactId: EntityId;
  opportunityId: EntityId | null;
  type: InteractionType;
  date: ISODate;
  summary: string;
  createdAt: ISODateTime;
}

export type CreateContactInput = Pick<Contact, 'name'> & Partial<Omit<Contact, 'id' | 'name' | 'createdAt' | 'updatedAt'>>;

export type UpdateContactInput = Partial<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateInteractionInput = Pick<Interaction, 'type' | 'date' | 'summary'> & Partial<Pick<Interaction, 'opportunityId'>>;
