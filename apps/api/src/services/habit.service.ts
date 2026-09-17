import { randomUUID } from 'node:crypto';

import type { CreateHabitInput, Habit, HabitCompletion } from '@hop/domain';

import { habitRepository } from '../repositories/habit.repository.js';

export const habitService = {
  getAll(): Habit[] {
    return habitRepository.findAll();
  },

  getCompletions(date: string): HabitCompletion[] {
    return habitRepository.findCompletions(date);
  },

  create(input: CreateHabitInput): Habit {
    const now = new Date().toISOString();
    const habit: Habit = {
      id: randomUUID(),
      name: input.name,
      frequency: input.frequency ?? 'daily',
      targetPerWeek: input.targetPerWeek ?? (input.frequency === 'weekly' ? 1 : 7),
      goalId: input.goalId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    return habitRepository.create(habit);
  },

  complete(habitId: string, date: string): HabitCompletion {
    return habitRepository.complete({
      id: randomUUID(),
      habitId,
      date,
      completedAt: new Date().toISOString(),
    });
  },
};
