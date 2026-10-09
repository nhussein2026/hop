import { randomUUID } from 'node:crypto';

import type { Contact, CreateContactInput, CreateInteractionInput, Interaction, UpdateContactInput } from '@hop/domain';

import { contactRepository } from '../repositories/contact.repository.js';

export const contactService = {
  getAll(): Contact[] {
    return contactRepository.findAll();
  },

  create(input: CreateContactInput): Contact {
    const now = new Date().toISOString();

    return contactRepository.create({
      id: randomUUID(),
      name: input.name,
      role: input.role ?? null,
      organization: input.organization ?? null,
      kind: input.kind ?? 'other',
      email: input.email ?? null,
      linkedin: input.linkedin ?? null,
      notes: input.notes ?? null,
      interests: input.interests ?? [],
      playbook: input.playbook ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },

  update(id: string, input: UpdateContactInput): Contact | undefined {
    if (!contactRepository.findById(id)) {
      return undefined;
    }

    return contactRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  getInteractions(): Interaction[] {
    return contactRepository.findAllInteractions();
  },

  logInteraction(contactId: string, input: CreateInteractionInput): Interaction | undefined {
    if (!contactRepository.findById(contactId)) {
      return undefined;
    }

    return contactRepository.createInteraction({
      id: randomUUID(),
      contactId,
      opportunityId: input.opportunityId ?? null,
      type: input.type,
      date: input.date,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    });
  },
};
