import { randomUUID } from 'node:crypto';

import type { CreateHabitInput, Habit, HabitCompletion, UpdateHabitInput } from '@hop/domain';

import { InvalidInputError } from '../errors.js';
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
    const unit = input.unit ?? 'minutes';
    // A habit counted in minutes has one number for both; other units keep minutes as a time estimate.
    const target = input.target ?? (unit === 'minutes' ? input.minutes ?? 30 : 1);
    const habit: Habit = {
      id: randomUUID(),
      name: input.name,
      frequency: input.frequency ?? 'daily',
      targetPerWeek: input.targetPerWeek ?? (input.days ? days.length : input.frequency === 'weekly' ? 1 : 7),
      goalId: input.goalId ?? null,
      days,
      minutes: unit === 'minutes' ? target : input.minutes ?? 30,
      unit,
      target,
      minimum: input.minimum ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    return habitRepository.create(habit);
  },

  update(id: string, input: UpdateHabitInput): Habit | undefined {
    const existing = habitRepository.findById(id);
    if (!existing) {
      return undefined;
    }

    const changes: Partial<Habit> = { ...input, updatedAt: new Date().toISOString() };
    const merged = { ...existing, ...input };

    if (merged.unit === 'minutes') {
      // Minutes and target are the same number for a habit counted in minutes; whichever was sent wins.
      if (input.target !== undefined) changes.minutes = input.target;
      else if (input.minutes !== undefined || input.unit !== undefined) changes.target = merged.minutes;
    }

    const target = changes.target ?? merged.target;
    if (merged.minimum != null && merged.minimum > target) {
      throw new InvalidInputError('The minimum can’t be more than the target.');
    }

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

  /** Log a habit for a date. No amount means the whole target; logging the same date again replaces the amount. */
  complete(habitId: string, date: string, amount: number | null = null): HabitCompletion | undefined {
    if (!habitRepository.findById(habitId)) {
      return undefined;
    }

    return habitRepository.complete({
      id: randomUUID(),
      habitId,
      date,
      amount,
      completedAt: new Date().toISOString(),
    });
  },
};
