import { eq } from 'drizzle-orm';

import type { Evidence } from '@hop/domain';

import { db } from '../db/client.js';
import { evidence } from '../db/schema/index.js';

export const evidenceRepository = {
  findAll(): Evidence[] {
    return db.select().from(evidence).all();
  },

  findById(id: string): Evidence | undefined {
    return db.select().from(evidence).where(eq(evidence.id, id)).get();
  },

  create(item: Evidence): Evidence {
    db.insert(evidence).values(item).run();
    return item;
  },

  update(id: string, changes: Partial<Evidence>): Evidence | undefined {
    db.update(evidence).set(changes).where(eq(evidence.id, id)).run();
    return this.findById(id);
  },
};
