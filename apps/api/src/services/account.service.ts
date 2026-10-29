import { randomUUID } from 'node:crypto';

import type { Account, CreateAccountInput, Currency, UpdateAccountInput } from '@hop/domain';

import { InvalidInputError } from '../errors.js';
import { accountRepository } from '../repositories/account.repository.js';
import { walletRepository } from '../repositories/money.repository.js';

/** A subscription is charged to a wallet in its own currency, so the charge can be logged there. */
function checkWallet(walletId: string | null | undefined, currency: Currency) {
  if (!walletId) return;
  const wallet = walletRepository.findById(walletId);
  if (!wallet) throw new InvalidInputError('That wallet doesn’t exist.');
  if (wallet.currency !== currency) throw new InvalidInputError(`Pick a wallet in ${currency}, the subscription’s currency.`);
}

export const accountService = {
  getAll(): Account[] {
    return accountRepository.findAll();
  },

  create(input: CreateAccountInput): Account {
    checkWallet(input.walletId, input.currency ?? 'TRY');
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
      walletId: input.walletId ?? null,
      autoLoggedOn: null,
      createdAt: now,
      updatedAt: now,
    };
    return accountRepository.create(account);
  },

  update(id: string, input: UpdateAccountInput): Account | undefined {
    const existing = accountRepository.findById(id);
    if (!existing) {
      return undefined;
    }

    checkWallet(input.walletId === undefined ? existing.walletId : input.walletId, input.currency ?? existing.currency);

    return accountRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return accountRepository.delete(id);
  },
};
