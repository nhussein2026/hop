import { eq } from 'drizzle-orm';

import type { Account } from '@hop/domain';

import { db } from '../db/client.js';
import { accounts } from '../db/schema/index.js';

export const accountRepository = {
  findAll(): Account[] {
    return db.select().from(accounts).all();
  },

  findById(id: string): Account | undefined {
    return db.select().from(accounts).where(eq(accounts.id, id)).get();
  },

  create(account: Account): Account {
    db.insert(accounts).values(account).run();
    return account;
  },

  update(id: string, changes: Partial<Account>): Account | undefined {
    db.update(accounts).set(changes).where(eq(accounts.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(accounts).where(eq(accounts.id, id)).run().changes > 0;
  },
};
