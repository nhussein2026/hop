import { and, between, eq } from 'drizzle-orm';

import type { Task, TaskCompletion } from '@hop/domain';

import { db } from '../db/client.js';
import { taskCompletions, tasks } from '../db/schema/index.js';

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

  /** A repeating task goes with the record of its occurrences. */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.delete(taskCompletions).where(eq(taskCompletions.taskId, id)).run();
      return tx.delete(tasks).where(eq(tasks.id, id)).run().changes > 0;
    });
  },

  findCompletions(from: string, to: string): TaskCompletion[] {
    return db.select().from(taskCompletions).where(between(taskCompletions.date, from, to)).all();
  },

  /** One record per occurrence: ticking or skipping again replaces it. */
  saveCompletion(completion: TaskCompletion): TaskCompletion {
    db.insert(taskCompletions).values(completion)
      .onConflictDoUpdate({ target: [taskCompletions.taskId, taskCompletions.date], set: { skipped: completion.skipped, completedAt: completion.completedAt } })
      .run();
    return db.select().from(taskCompletions).where(and(eq(taskCompletions.taskId, completion.taskId), eq(taskCompletions.date, completion.date))).get()!;
  },

  deleteCompletion(taskId: string, date: string): boolean {
    return db.delete(taskCompletions).where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, date))).run().changes > 0;
  },
};