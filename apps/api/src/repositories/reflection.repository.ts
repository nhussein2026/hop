import { eq } from 'drizzle-orm';

import type { Reflection } from '@hop/domain';

import { db } from '../db/client.js';
import { reflections } from '../db/schema/index.js';

export const reflectionRepository = {
  findAll(): Reflection[] {
    return db.select().from(reflections).all();
  },

  findByDate(date: string): Reflection | undefined {
    return db.select().from(reflections).where(eq(reflections.date, date)).get();
  },

  create(reflection: Reflection): Reflection {
    db.insert(reflections).values(reflection).run();
    return reflection;
  },

  update(id: string, changes: Partial<Reflection>) {
    db.update(reflections).set(changes).where(eq(reflections.id, id)).run();
  },
};
