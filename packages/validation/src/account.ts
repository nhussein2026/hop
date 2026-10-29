import { z } from 'zod';
import { ACCOUNT_STATUSES, BILLING_CYCLES, CARD_NUMBER, CURRENCIES } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);

/** Hop keeps no card numbers, so text that looks like one is refused wherever it's typed. */
const noCardNumber = (label: string, max: number) => text(label, max).refine((value) => !CARD_NUMBER.test(value), 'That looks like a card number. Hop doesn’t store card numbers; write something like “Ziraat card” instead.');

const accountFields = {
  name: text('Name', 120).min(1, 'Name the service'),
  url: z.string().trim().max(2000, 'Links cannot exceed 2000 characters').regex(/^https?:\/\/\S+\.\S+/, 'Use a full link starting with https://').nullable(),
  login: noCardNumber('Login', 200).nullable(),
  purpose: noCardNumber('What it’s for', 300),
  status: z.enum(ACCOUNT_STATUSES),
  cost: z.number().min(0, 'The cost cannot be negative').max(1_000_000, 'That cost looks too high').nullable(),
  currency: z.enum(CURRENCIES),
  cycle: z.enum(BILLING_CYCLES),
  renewsOn: date.nullable(),
  payment: noCardNumber('Payment', 120).nullable(),
  secretIn: text('Password kept in', 80).nullable(),
  notes: noCardNumber('Notes', 2000),
  walletId: id.nullable(),
};

export const createAccountSchema = z.object(accountFields).partial().required({ name: true }).strict();
export const updateAccountSchema = z.object(accountFields).partial().strict();
