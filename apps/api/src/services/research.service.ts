import { randomUUID } from 'node:crypto';

import type { CreateFindInput, CreateIdeaInput, Find, Idea, UpdateFindInput, UpdateIdeaInput } from '@hop/domain';

import { db } from '../db/client.js';
import { ConflictError } from '../errors.js';
import { findRepository, ideaRepository } from '../repositories/research.repository.js';

/** Two links are the same find if they differ only by a trailing slash. */
const sameUrl = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

export const ideaService = {
  getAll(): Idea[] {
    return ideaRepository.findAll();
  },

  /** An idea made from Radar finds turns those finds into it, so they leave the inbox. */
  create(input: CreateIdeaInput): Idea {
    const now = new Date().toISOString();
    const idea: Idea = {
      id: randomUUID(),
      title: input.title,
      kind: input.kind ?? 'thesis',
      stage: input.stage ?? 'spark',
      question: input.question ?? '',
      why: input.why ?? '',
      nextStep: input.nextStep ?? '',
      resourceIds: input.resourceIds ?? [],
      advisorIds: input.advisorIds ?? [],
      courseIds: input.courseIds ?? [],
      findIds: input.findIds ?? [],
      projectId: input.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    db.transaction(() => {
      ideaRepository.create(idea);
      for (const findId of idea.findIds) findRepository.update(findId, { status: 'converted', ideaId: idea.id, updatedAt: now });
    });
    return idea;
  },

  update(id: string, input: UpdateIdeaInput): Idea | undefined {
    if (!ideaRepository.findById(id)) {
      return undefined;
    }

    return ideaRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return ideaRepository.delete(id);
  },
};

export const findService = {
  getAll(): Find[] {
    return findRepository.findAll();
  },

  /** A link already on the radar is refused, wherever it ended up, so the inbox has no duplicates. */
  create(input: CreateFindInput): Find {
    const url = input.url ?? null;
    const duplicate = url ? findRepository.findAll().find((find) => find.url && sameUrl(find.url, url)) : undefined;

    if (duplicate) {
      throw new ConflictError(`Already on your radar: “${duplicate.title}”`);
    }

    const now = new Date().toISOString();
    return findRepository.create({
      id: randomUUID(),
      kind: input.kind,
      title: input.title,
      url,
      source: input.source || 'Web',
      why: input.why,
      topics: input.topics ?? [],
      status: 'inbox',
      eventDate: input.eventDate ?? null,
      taskId: null,
      resourceId: null,
      ideaId: null,
      opportunityId: null,
      eventId: null,
      createdAt: now,
      updatedAt: now,
    });
  },

  update(id: string, input: UpdateFindInput): Find | undefined {
    if (!findRepository.findById(id)) {
      return undefined;
    }

    return findRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return findRepository.delete(id);
  },
};
