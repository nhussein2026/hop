import { randomUUID } from 'node:crypto';

import type {
  CreateSkillInput,
  Skill,
  UpdateSkillInput,
} from '@hop/domain';

import { skillRepository } from '../repositories/skill.repository.js';

export const skillService = {
  getAll(): Skill[] {
    return skillRepository.findAll();
  },

  getById(id: string): Skill | undefined {
    return skillRepository.findById(id);
  },

  create(input: CreateSkillInput): Skill {
    const now = new Date().toISOString();
    const skill: Skill = {
      id: randomUUID(),
      name: input.name,
      category: input.category ?? null,
      type: input.type ?? 'tool',
      focus: input.focus ?? 'keep',
      listed: input.listed ?? false,
      bar: input.bar ?? null,
      // Levels come from evidence now; only skills from before have a self-assessed one.
      level: null,
      confidence: input.confidence ?? null,
      lastPracticedAt: input.lastPracticedAt ?? null,
      yearsExperience: input.yearsExperience ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return skillRepository.create(skill);
  },

  update(id: string, input: UpdateSkillInput): Skill | undefined {
    if (!skillRepository.findById(id)) {
      return undefined;
    }

    return skillRepository.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
};
