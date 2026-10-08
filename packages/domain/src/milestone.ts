import type { EntityId, ISODate, ISODateTime } from './common.js';

/**
 * A dated checkpoint. With a goal it is a planned step towards that goal until it is reached;
 * reached milestones also form the Growth timeline.
 */
export interface Milestone {
  id: EntityId;
  goalId: EntityId | null;
  title: string;
  /** Target date while open, the day it was reached once done. */
  date: ISODate;
  done: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateMilestoneInput = Pick<Milestone, 'title' | 'date'> & Partial<Pick<Milestone, 'goalId' | 'done'>>;

export type UpdateMilestoneInput = Partial<Pick<Milestone, 'title' | 'date' | 'done' | 'goalId'>>;
