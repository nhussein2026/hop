import { randomUUID } from 'node:crypto';

import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '@hop/domain';

import { projectRepository } from '../repositories/project.repository.js';

export const projectService = {
  getAll(): Project[] {
    return projectRepository.findAll();
  },

  getById(id: string): Project | undefined {
    return projectRepository.findById(id);
  },

  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      problem: input.problem ?? null,
      blurb: input.blurb ?? null,
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      stack: input.stack ?? [],
      repositoryUrl: input.repositoryUrl ?? null,
      demoUrl: input.demoUrl ?? null,
      learned: input.learned ?? null,
      challenges: input.challenges ?? null,
      architectureNotes: input.architectureNotes ?? null,
      goalIds: input.goalIds ?? [],
      skillIds: input.skillIds ?? [],
      createdAt: now,
      updatedAt: now,
    };

    return projectRepository.create(project);
  },

  update(id: string, input: UpdateProjectInput): Project | undefined {
    if (!projectRepository.findById(id)) {
      return undefined;
    }

    return projectRepository.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
};
