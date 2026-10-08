import { randomUUID } from 'node:crypto';

import type { CreateHabitInput, Habit, HabitCompletion, UpdateHabitInput } from '@hop/domain';

import { habitRepository } from '../repositories/habit.repository.js';

export const habitService = {
  /** Every habit, including paused ones: pausing keeps a habit's history. */
  getAll(): Habit[] {
    return habitRepository.findAll();
  },

  getCompletions(from: string, to = from): HabitCompletion[] {
    return habitRepository.findCompletions(from, to);
  },

  create(input: CreateHabitInput): Habit {
    const now = new Date().toISOString();
    const days = input.days ? [...input.days].sort() : [0, 1, 2, 3, 4, 5, 6];
    const habit: Habit = {
      id: randomUUID(),
      name: input.name,
      frequency: input.frequency ?? 'daily',
      targetPerWeek: input.targetPerWeek ?? (input.days ? days.length : input.frequency === 'weekly' ? 1 : 7),
      goalId: input.goalId ?? null,
      days,
      minutes: input.minutes ?? 30,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    return habitRepository.create(habit);
  },

  update(id: string, input: UpdateHabitInput): Habit | undefined {
    if (!habitRepository.findById(id)) {
      return undefined;
    }

    const changes: Partial<Habit> = { ...input, updatedAt: new Date().toISOString() };

    if (input.days) {
      changes.days = [...input.days].sort();
      changes.targetPerWeek = input.days.length;
    }

    return habitRepository.update(id, changes);
  },

  /** Undo a completion. Returns false when the habit was not completed that day. */
  uncomplete(habitId: string, date: string): boolean {
    return habitRepository.deleteCompletion(habitId, date);
  },

  complete(habitId: string, date: string): HabitCompletion | undefined {
    if (!habitRepository.findById(habitId)) {
      return undefined;
    }

    return habitRepository.complete({
      id: randomUUID(),
      habitId,
      date,
      completedAt: new Date().toISOString(),
    });
  },
};
