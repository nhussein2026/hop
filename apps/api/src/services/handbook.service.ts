import { randomUUID } from 'node:crypto';

import type {
  CreateKeyDateInput,
  CreatePinInput,
  CreateUniLinkInput,
  KeyDate,
  Pin,
  UniLink,
  UpdateKeyDateInput,
  UpdatePinInput,
  UpdateUniLinkInput,
} from '@hop/domain';

import { keyDateRepository, pinRepository, uniLinkRepository } from '../repositories/handbook.repository.js';

const stamps = () => {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
};

export const keyDateService = {
  getAll(): KeyDate[] {
    return keyDateRepository.findAll();
  },

  create(input: CreateKeyDateInput): KeyDate {
    return keyDateRepository.create({ id: randomUUID(), title: input.title, date: input.date, kind: input.kind, note: input.note ?? null, ...stamps() });
  },

  update(id: string, input: UpdateKeyDateInput): KeyDate | undefined {
    return keyDateRepository.findById(id) && keyDateRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return keyDateRepository.delete(id);
  },
};

export const pinService = {
  getAll(): Pin[] {
    return pinRepository.findAll();
  },

  create(input: CreatePinInput): Pin {
    return pinRepository.create({ id: randomUUID(), kind: input.kind, title: input.title, body: input.body ?? '', ...stamps() });
  },

  update(id: string, input: UpdatePinInput): Pin | undefined {
    return pinRepository.findById(id) && pinRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return pinRepository.delete(id);
  },
};

export const uniLinkService = {
  getAll(): UniLink[] {
    return uniLinkRepository.findAll();
  },

  create(input: CreateUniLinkInput): UniLink {
    return uniLinkRepository.create({ id: randomUUID(), title: input.title, url: input.url, ...stamps() });
  },

  update(id: string, input: UpdateUniLinkInput): UniLink | undefined {
    return uniLinkRepository.findById(id) && uniLinkRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return uniLinkRepository.delete(id);
  },
};
