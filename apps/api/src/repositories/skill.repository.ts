import { eq } from 'drizzle-orm';

import type { Skill } from '@hop/domain';

import { db } from '../db/client.js';
import { skills } from '../db/schema/index.js';

export const skillRepository = {
  findAll(): Skill[] {
    return db.select().from(skills).all();
  },

  findById(id: string): Skill | undefined {
    return db.select().from(skills).where(eq(skills.id, id)).get();
  },

  create(skill: Skill): Skill {
    db.insert(skills).values(skill).run();
    return skill;
  },

  update(id: string, changes: Partial<Skill>): Skill | undefined {
    db.update(skills).set(changes).where(eq(skills.id, id)).run();
    return this.findById(id);
  },
};
