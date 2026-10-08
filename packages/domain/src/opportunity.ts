import type { EntityId, ISODate, ISODateTime } from './common.js';

export const OPPORTUNITY_TYPES = [
  'job',
  'internship',
  'program',
  'scholarship',
  'fellowship',
  'hackathon',
  'conference',
  'open-source program',
  'other',
] as const;

export const OPPORTUNITY_STAGES = [
  'saved',
  'interested',
  'preparing',
  'applied',
  'screening',
  'interview',
  'assessment',
  'final',
  'offer',
  'rejected',
  'withdrawn',
  'expired',
  'accepted',
  'declined',
] as const;

/** Stages that end an opportunity. Closed opportunities keep their history but need no follow-up. */
export const OPPORTUNITY_CLOSED_STAGES = [
  'rejected',
  'withdrawn',
  'expired',
  'accepted',
  'declined',
] as const satisfies readonly (typeof OPPORTUNITY_STAGES)[number][];

export const OPPORTUNITY_PRIORITIES = ['low', 'medium', 'high'] as const;

export const WORK_MODES = ['remote', 'hybrid', 'on-site'] as const;

/** What can happen on an opportunity's timeline. Any entry counts as activity for the follow-up rule. */
export const OPPORTUNITY_ACTIVITY_TYPES = [
  'created',
  'note_added',
  'email_received',
  'follow_up_sent',
  'call',
  'interview',
  'interview_scheduled',
  'assessment_received',
  'application_submitted',
  'stage_changed',
  'rejection_received',
  'offer_received',
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type OpportunityActivityType = (typeof OPPORTUNITY_ACTIVITY_TYPES)[number];

export interface Opportunity {
  id: EntityId;
  title: string;
  organization: string | null;
  url: string | null;
  type: OpportunityType;
  stage: OpportunityStage;
  priority: OpportunityPriority;
  location: string | null;
  remote: boolean;
  workMode: WorkMode | null;
  source: string | null;
  openDate: ISODate | null;
  deadline: ISODate | null;
  appliedDate: ISODate | null;
  decisionDate: ISODate | null;
  nextEventDate: ISODate | null;
  nextEventLabel: string | null;
  nextEventTime: string | null;
  /** Furthest pipeline stage reached, kept when the opportunity closes so analytics stay honest. */
  reachedStage: OpportunityStage | null;
  compensation: string | null;
  technologyTags: string[];
  contactIds: EntityId[];
  resumeId: EntityId | null;
  coverLetterId: EntityId | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  closedAt: ISODateTime | null;
}

export interface OpportunityPrepItem {
  id: EntityId;
  opportunityId: EntityId;
  text: string;
  done: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OpportunityActivity {
  id: EntityId;
  opportunityId: EntityId;
  type: OpportunityActivityType;
  text: string;
  /** When it happened, which may be earlier than when it was logged. */
  at: ISODateTime;
  createdAt: ISODateTime;
}

/** An opportunity as the API returns it: with its preparation checklist and timeline. */
export interface OpportunityWithDetails extends Opportunity {
  prep: OpportunityPrepItem[];
  activities: OpportunityActivity[];
}

export interface CreateOpportunityActivityInput {
  type: OpportunityActivityType;
  text: string;
  date?: ISODate;
}

export interface CreateOpportunityInput {
  title: string;
  organization?: string;
  url?: string;
  type?: OpportunityType;
  stage?: OpportunityStage;
  priority?: OpportunityPriority;
  location?: string;
  remote?: boolean;
  workMode?: WorkMode;
  source?: string;
  openDate?: ISODate;
  deadline?: ISODate;
  appliedDate?: ISODate;
  decisionDate?: ISODate;
  nextEventDate?: ISODate;
  nextEventLabel?: string;
  nextEventTime?: string;
  compensation?: string;
  technologyTags?: string[];
  contactIds?: EntityId[];
  resumeId?: EntityId;
  coverLetterId?: EntityId;
  notes?: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  organization?: string | null;
  url?: string | null;
  type?: OpportunityType;
  stage?: OpportunityStage;
  priority?: OpportunityPriority;
  location?: string | null;
  remote?: boolean;
  workMode?: WorkMode | null;
  source?: string | null;
  openDate?: ISODate | null;
  deadline?: ISODate | null;
  appliedDate?: ISODate | null;
  decisionDate?: ISODate | null;
  nextEventDate?: ISODate | null;
  nextEventLabel?: string | null;
  nextEventTime?: string | null;
  compensation?: string | null;
  technologyTags?: string[];
  contactIds?: EntityId[];
  resumeId?: EntityId | null;
  coverLetterId?: EntityId | null;
  notes?: string | null;
}
