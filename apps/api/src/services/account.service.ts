import { randomUUID } from 'node:crypto';

import type { Account, CreateAccountInput, UpdateAccountInput } from '@hop/domain';

import { accountRepository } from '../repositories/account.repository.js';

export const accountService = {
  getAll(): Account[] {
    return accountRepository.findAll();
  },

  create(input: CreateAccountInput): Account {
    const now = new Date().toISOString();
    const account: Account = {
      id: randomUUID(),
      name: input.name,
      url: input.url ?? null,
      login: input.login ?? null,
      purpose: input.purpose ?? '',
      status: input.status ?? 'active',
      cost: input.cost ?? null,
      currency: input.currency ?? 'TRY',
      cycle: input.cycle ?? 'none',
      renewsOn: input.renewsOn ?? null,
      payment: input.payment ?? null,
      secretIn: input.secretIn ?? null,
      notes: input.notes ?? '',
      createdAt: now,
      updatedAt: now,
    };
    return accountRepository.create(account);
  },

  update(id: string, input: UpdateAccountInput): Account | undefined {
    if (!accountRepository.findById(id)) {
      return undefined;
    }

    return accountRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return accountRepository.delete(id);
  },
};
