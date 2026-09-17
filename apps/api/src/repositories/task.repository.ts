import { eq } from 'drizzle-orm';

import type { Task } from '@hop/domain';

import { db } from '../db/client.js';
import { tasks } from '../db/schema/index.js';

/**
 * Persistence-only operations for Tasks.
 *
 * This layer knows about:
 * - Drizzle
 * - SQLite
 * - tables
 *
 * It should NOT contain business rules.
 */
export const taskRepository = {
  findAll(): Task[] {
    return db
      .select()
      .from(tasks)
      .all();
  },

  findById(id: string): Task | undefined {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .get();
  },

  create(task: Task): Task {
    db
      .insert(tasks)
      .values(task)
      .run();

    return task;
  },

  update(id: string, changes: Partial<Task>): Task | undefined {
    db
      .update(tasks)
      .set(changes)
      .where(eq(tasks.id, id))
      .run();

    return this.findById(id);
  },
};