import { and, asc, eq } from 'drizzle-orm';

import type { Opportunity, OpportunityActivity, OpportunityPrepItem } from '@hop/domain';

import { db } from '../db/client.js';
import { opportunities, opportunityActivities, opportunityPrep } from '../db/schema/index.js';

export const opportunityRepository = {
  findAll(): Opportunity[] {
    return db.select().from(opportunities).all();
  },

  findById(id: string): Opportunity | undefined {
    return db.select().from(opportunities).where(eq(opportunities.id, id)).get();
  },

  create(opportunity: Opportunity): Opportunity {
    db.insert(opportunities).values(opportunity).run();
    return opportunity;
  },

  update(id: string, changes: Partial<Opportunity>): Opportunity | undefined {
    db.update(opportunities).set(changes).where(eq(opportunities.id, id)).run();
    return this.findById(id);
  },

  findAllPrep(): OpportunityPrepItem[] {
    return db.select().from(opportunityPrep).orderBy(asc(opportunityPrep.position)).all();
  },

  findPrep(opportunityId: string): OpportunityPrepItem[] {
    return db.select().from(opportunityPrep).where(eq(opportunityPrep.opportunityId, opportunityId)).orderBy(asc(opportunityPrep.position)).all();
  },

  findPrepItem(opportunityId: string, id: string): OpportunityPrepItem | undefined {
    return db.select().from(opportunityPrep).where(and(eq(opportunityPrep.opportunityId, opportunityId), eq(opportunityPrep.id, id))).get();
  },

  createPrepItem(item: OpportunityPrepItem) {
    db.insert(opportunityPrep).values(item).run();
  },

  updatePrepItem(id: string, changes: Partial<OpportunityPrepItem>) {
    db.update(opportunityPrep).set(changes).where(eq(opportunityPrep.id, id)).run();
  },

  findAllActivities(): OpportunityActivity[] {
    return db.select().from(opportunityActivities).orderBy(asc(opportunityActivities.at)).all();
  },

  createActivity(activity: OpportunityActivity) {
    db.insert(opportunityActivities).values(activity).run();
  },

  deleteActivity(opportunityId: string, id: string): boolean {
    return db.delete(opportunityActivities).where(and(eq(opportunityActivities.opportunityId, opportunityId), eq(opportunityActivities.id, id))).run().changes > 0;
  },
};
