import { and, between, eq } from 'drizzle-orm';

import type { Habit, HabitCompletion } from '@hop/domain';

import { db } from '../db/client.js';
import { habitCompletions, habits } from '../db/schema/index.js';

export const habitRepository = {
  findAll(): Habit[] {
    return db.select().from(habits).where(eq(habits.active, true)).all();
  },

  findById(id: string): Habit | undefined {
    return db.select().from(habits).where(eq(habits.id, id)).get();
  },

  create(habit: Habit): Habit {
    db.insert(habits).values(habit).run();
    return habit;
  },

  findCompletion(habitId: string, date: string): HabitCompletion | undefined {
    return db.select().from(habitCompletions).where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date))).get();
  },

  findCompletions(from: string, to: string): HabitCompletion[] {
    return db.select().from(habitCompletions).where(between(habitCompletions.date, from, to)).all();
  },

  complete(completion: HabitCompletion): HabitCompletion {
    db.insert(habitCompletions).values(completion).onConflictDoNothing().run();
    return this.findCompletion(completion.habitId, completion.date) ?? completion;
  },
};
