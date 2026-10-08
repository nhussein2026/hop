import { eq } from 'drizzle-orm';

import type { Milestone } from '@hop/domain';

import { db } from '../db/client.js';
import { milestones } from '../db/schema/index.js';

export const milestoneRepository = {
  findAll(): Milestone[] {
    return db.select().from(milestones).all();
  },

  findById(id: string): Milestone | undefined {
    return db.select().from(milestones).where(eq(milestones.id, id)).get();
  },

  create(milestone: Milestone): Milestone {
    db.insert(milestones).values(milestone).run();
    return milestone;
  },

  update(id: string, changes: Partial<Milestone>): Milestone | undefined {
    db.update(milestones).set(changes).where(eq(milestones.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(milestones).where(eq(milestones.id, id)).run().changes > 0;
  },
};
