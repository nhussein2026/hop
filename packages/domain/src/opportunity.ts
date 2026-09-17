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

export const OPPORTUNITY_PRIORITIES = ['low', 'medium', 'high'] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];

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
  source: string | null;
  openDate: ISODate | null;
  deadline: ISODate | null;
  appliedDate: ISODate | null;
  decisionDate: ISODate | null;
  nextEventDate: ISODate | null;
  nextEventLabel: string | null;
  compensation: string | null;
  technologyTags: string[];
  resumeId: EntityId | null;
  coverLetterId: EntityId | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  closedAt: ISODateTime | null;
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
  source?: string;
  openDate?: ISODate;
  deadline?: ISODate;
  appliedDate?: ISODate;
  decisionDate?: ISODate;
  nextEventDate?: ISODate;
  nextEventLabel?: string;
  compensation?: string;
  technologyTags?: string[];
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
  source?: string | null;
  openDate?: ISODate | null;
  deadline?: ISODate | null;
  appliedDate?: ISODate | null;
  decisionDate?: ISODate | null;
  nextEventDate?: ISODate | null;
  nextEventLabel?: string | null;
  compensation?: string | null;
  technologyTags?: string[];
  resumeId?: EntityId | null;
  coverLetterId?: EntityId | null;
  notes?: string | null;
}
