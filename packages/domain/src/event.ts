import type { EntityId, ISODate, ISODateTime } from './common.js';

export const EVENT_TYPES = ['meeting', 'interview', 'deadline', 'review', 'personal', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Event {
  id: EntityId;
  title: string;
  description: string | null;
  type: EventType;
  date: ISODate;
  startTime: string | null;
  endTime: string | null;
  goalId: EntityId | null;
  projectId: EntityId | null;
  opportunityId: EntityId | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateEventInput = Pick<Event, 'title' | 'date'> & Partial<Omit<Event, 'id' | 'title' | 'date' | 'createdAt' | 'updatedAt'>>;
export type UpdateEventInput = Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>;
