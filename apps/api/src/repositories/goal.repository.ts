import { eq } from 'drizzle-orm';

import type { Goal } from '@hop/domain';

import { db } from '../db/client.js';
import { goals } from '../db/schema/index.js';

export const goalRepository = {
  findAll(): Goal[] {
    return db.select().from(goals).all();
  },

  findById(id: string): Goal | undefined {
    return db.select().from(goals).where(eq(goals.id, id)).get();
  },

  create(goal: Goal): Goal {
    db.insert(goals).values(goal).run();
    return goal;
  },

  update(id: string, changes: Partial<Goal>): Goal | undefined {
    db.update(goals).set(changes).where(eq(goals.id, id)).run();
    return this.findById(id);
  },
};
