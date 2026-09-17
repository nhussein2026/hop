import { randomUUID } from 'node:crypto';

import type { CreateEventInput, Event, UpdateEventInput } from '@hop/domain';

import { eventRepository } from '../repositories/event.repository.js';

export const eventService = {
  getAll(): Event[] {
    return eventRepository.findAll();
  },

  create(input: CreateEventInput): Event {
    const now = new Date().toISOString();
    const event: Event = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? 'other',
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return eventRepository.create(event);
  },

  update(id: string, input: UpdateEventInput): Event | undefined {
    if (!eventRepository.findById(id)) {
      return undefined;
    }

    return eventRepository.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
};
