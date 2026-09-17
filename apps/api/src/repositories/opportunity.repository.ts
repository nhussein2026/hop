import { eq } from 'drizzle-orm';

import type { Opportunity } from '@hop/domain';

import { db } from '../db/client.js';
import { opportunities } from '../db/schema/index.js';

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
};
