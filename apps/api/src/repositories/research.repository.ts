import { eq } from 'drizzle-orm';

import type { Find, Idea } from '@hop/domain';

import { db } from '../db/client.js';
import { finds, ideas } from '../db/schema/index.js';

export const ideaRepository = {
  findAll(): Idea[] {
    return db.select().from(ideas).all();
  },

  findById(id: string): Idea | undefined {
    return db.select().from(ideas).where(eq(ideas.id, id)).get();
  },

  create(idea: Idea): Idea {
    db.insert(ideas).values(idea).run();
    return idea;
  },

  update(id: string, changes: Partial<Idea>): Idea | undefined {
    db.update(ideas).set(changes).where(eq(ideas.id, id)).run();
    return this.findById(id);
  },

  /** Finds the idea came from go back to being plain finds. */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.update(finds).set({ ideaId: null }).where(eq(finds.ideaId, id)).run();
      return tx.delete(ideas).where(eq(ideas.id, id)).run().changes > 0;
    });
  },
};

export const findRepository = {
  findAll(): Find[] {
    return db.select().from(finds).all();
  },

  findById(id: string): Find | undefined {
    return db.select().from(finds).where(eq(finds.id, id)).get();
  },

  create(find: Find): Find {
    db.insert(finds).values(find).run();
    return find;
  },

  update(id: string, changes: Partial<Find>): Find | undefined {
    db.update(finds).set(changes).where(eq(finds.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(finds).where(eq(finds.id, id)).run().changes > 0;
  },
};
