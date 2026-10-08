import { and, between, eq } from 'drizzle-orm';

import type { Habit, HabitCompletion } from '@hop/domain';

import { db } from '../db/client.js';
import { habitCompletions, habits } from '../db/schema/index.js';

export const habitRepository = {
  findAll(): Habit[] {
    return db.select().from(habits).all();
  },

  findById(id: string): Habit | undefined {
    return db.select().from(habits).where(eq(habits.id, id)).get();
  },

  create(habit: Habit): Habit {
    db.insert(habits).values(habit).run();
    return habit;
  },

  update(id: string, changes: Partial<Habit>): Habit | undefined {
    db.update(habits).set(changes).where(eq(habits.id, id)).run();
    return this.findById(id);
  },

  findCompletion(habitId: string, date: string): HabitCompletion | undefined {
    return db.select().from(habitCompletions).where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date))).get();
  },

  findCompletions(from: string, to: string): HabitCompletion[] {
    return db.select().from(habitCompletions).where(between(habitCompletions.date, from, to)).all();
  },

  deleteCompletion(habitId: string, date: string): boolean {
    return db.delete(habitCompletions).where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date))).run().changes > 0;
  },

  complete(completion: HabitCompletion): HabitCompletion {
    db.insert(habitCompletions).values(completion).onConflictDoNothing().run();
    return this.findCompletion(completion.habitId, completion.date) ?? completion;
  },
};
