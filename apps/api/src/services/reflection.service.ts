import { randomUUID } from 'node:crypto';

import type { Reflection, SaveReflectionInput } from '@hop/domain';

import { reflectionRepository } from '../repositories/reflection.repository.js';

export const reflectionService = {
  getAll(): Reflection[] {
    return reflectionRepository.findAll();
  },

  /** One reflection per day: saving again for the same date replaces the answers. */
  save(input: SaveReflectionInput): Reflection {
    const now = new Date().toISOString();
    const { date, ...answers } = input;
    const existing = reflectionRepository.findByDate(date);

    if (existing) {
      reflectionRepository.update(existing.id, { ...answers, updatedAt: now });
      return reflectionRepository.findByDate(date)!;
    }

    return reflectionRepository.create({
      id: randomUUID(),
      date,
      accomplished: answers.accomplished ?? '',
      learned: answers.learned ?? '',
      badly: answers.badly ?? '',
      tomorrow: answers.tomorrow ?? '',
      energy: answers.energy ?? null,
      focus: answers.focus ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },
};
