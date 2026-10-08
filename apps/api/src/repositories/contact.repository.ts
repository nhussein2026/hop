import { eq } from 'drizzle-orm';

import type { Contact, Interaction } from '@hop/domain';

import { db } from '../db/client.js';
import { contacts, interactions } from '../db/schema/index.js';

export const contactRepository = {
  findAll(): Contact[] {
    return db.select().from(contacts).all();
  },

  findById(id: string): Contact | undefined {
    return db.select().from(contacts).where(eq(contacts.id, id)).get();
  },

  create(contact: Contact): Contact {
    db.insert(contacts).values(contact).run();
    return contact;
  },

  update(id: string, changes: Partial<Contact>): Contact | undefined {
    db.update(contacts).set(changes).where(eq(contacts.id, id)).run();
    return this.findById(id);
  },

  findAllInteractions(): Interaction[] {
    return db.select().from(interactions).all();
  },

  createInteraction(interaction: Interaction): Interaction {
    db.insert(interactions).values(interaction).run();
    return interaction;
  },
};
