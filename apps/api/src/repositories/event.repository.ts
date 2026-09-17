import { eq } from 'drizzle-orm';

import type { Event } from '@hop/domain';

import { db } from '../db/client.js';
import { events } from '../db/schema/index.js';

export const eventRepository = {
  findAll(): Event[] {
    return db.select().from(events).all();
  },

  findById(id: string): Event | undefined {
    return db.select().from(events).where(eq(events.id, id)).get();
  },

  create(event: Event): Event {
    db.insert(events).values(event).run();
    return event;
  },

  update(id: string, changes: Partial<Event>): Event | undefined {
    db.update(events).set(changes).where(eq(events.id, id)).run();
    return this.findById(id);
  },
};
