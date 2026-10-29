import type { EntityId, ISODate, ISODateTime } from './common.js';

export const ACCOUNT_STATUSES = ['active', 'trial', 'cancelled'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** How often it charges. `none` is a free account, or one paid once. */
export const BILLING_CYCLES = ['monthly', 'yearly', 'weekly', 'none'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** 13 to 19 digits, allowing spaces or dashes between them: the shape of a payment card number. Hop refuses to store one. */
export const CARD_NUMBER = /(?:\d[ -]?){12,18}\d/;

/** Renewals and trial ends show up in Needs attention this many days ahead. */
export const RENEWAL_NOTICE_DAYS = 3;

/**
 * An account or subscription: which login it uses, what it's for, what it costs and when it
 * renews. Never its password or card number: those belong in a password manager, and `secretIn`
 * says which one.
 */
export interface Account {
  id: EntityId;
  name: string;
  /** Where to sign in or manage it. */
  url: string | null;
  /** The email or username it uses. */
  login: string | null;
  purpose: string;
  status: AccountStatus;
  cost: number | null;
  currency: Currency;
  cycle: BillingCycle;
  /** A known renewal day (or the day a trial ends). Later renewals follow the cycle. */
  renewsOn: ISODate | null;
  /** How it's paid, as a label such as "Ziraat card". */
  payment: string | null;
  /** Where the password is kept, such as "Bitwarden". */
  secretIn: string | null;
  notes: string;
  /** The Finances wallet a monthly or yearly subscription is charged to: Hop logs each charge there on its renewal day. */
  walletId: EntityId | null;
  /** The last renewal Hop logged by itself, or found already logged, so one you deleted isn't logged again. */
  autoLoggedOn: ISODate | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CreateAccountInput = Pick<Account, 'name'> & Partial<Omit<Account, 'id' | 'name' | 'autoLoggedOn' | 'createdAt' | 'updatedAt'>>;
export type UpdateAccountInput = Partial<Omit<Account, 'id' | 'autoLoggedOn' | 'createdAt' | 'updatedAt'>>;
