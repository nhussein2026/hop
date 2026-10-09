import { asc, eq } from 'drizzle-orm';

import type { KeyDate, Pin, UniLink } from '@hop/domain';

import { db } from '../db/client.js';
import { keyDates, pins, uniLinks } from '../db/schema/index.js';

export const keyDateRepository = {
  findAll(): KeyDate[] {
    return db.select().from(keyDates).orderBy(asc(keyDates.date)).all();
  },

  findById(id: string): KeyDate | undefined {
    return db.select().from(keyDates).where(eq(keyDates.id, id)).get();
  },

  create(keyDate: KeyDate): KeyDate {
    db.insert(keyDates).values(keyDate).run();
    return keyDate;
  },

  update(id: string, changes: Partial<KeyDate>): KeyDate | undefined {
    db.update(keyDates).set(changes).where(eq(keyDates.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(keyDates).where(eq(keyDates.id, id)).run().changes > 0;
  },
};

export const pinRepository = {
  findAll(): Pin[] {
    return db.select().from(pins).orderBy(asc(pins.createdAt)).all();
  },

  findById(id: string): Pin | undefined {
    return db.select().from(pins).where(eq(pins.id, id)).get();
  },

  create(pin: Pin): Pin {
    db.insert(pins).values(pin).run();
    return pin;
  },

  update(id: string, changes: Partial<Pin>): Pin | undefined {
    db.update(pins).set(changes).where(eq(pins.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(pins).where(eq(pins.id, id)).run().changes > 0;
  },
};

export const uniLinkRepository = {
  findAll(): UniLink[] {
    return db.select().from(uniLinks).orderBy(asc(uniLinks.createdAt)).all();
  },

  findById(id: string): UniLink | undefined {
    return db.select().from(uniLinks).where(eq(uniLinks.id, id)).get();
  },

  create(link: UniLink): UniLink {
    db.insert(uniLinks).values(link).run();
    return link;
  },

  update(id: string, changes: Partial<UniLink>): UniLink | undefined {
    db.update(uniLinks).set(changes).where(eq(uniLinks.id, id)).run();
    return this.findById(id);
  },

  delete(id: string): boolean {
    return db.delete(uniLinks).where(eq(uniLinks.id, id)).run().changes > 0;
  },
};
