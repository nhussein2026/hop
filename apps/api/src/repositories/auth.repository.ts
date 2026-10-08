import { eq, lt } from 'drizzle-orm';

import { db } from '../db/client.js';
import { credentials, sessions } from '../db/schema/index.js';

export type CredentialsRow = typeof credentials.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

const credentialsId = 1;

export const authRepository = {
  findCredentials(): CredentialsRow | undefined {
    return db.select().from(credentials).where(eq(credentials.id, credentialsId)).get();
  },

  createCredentials(passwordHash: string, now: string) {
    db.insert(credentials).values({ id: credentialsId, passwordHash, createdAt: now, updatedAt: now }).run();
  },

  updatePassword(passwordHash: string, now: string) {
    db.update(credentials).set({ passwordHash, updatedAt: now }).where(eq(credentials.id, credentialsId)).run();
  },

  deleteCredentials() {
    db.delete(credentials).run();
  },

  createSession(session: SessionRow) {
    db.insert(sessions).values(session).run();
  },

  findSessions(): SessionRow[] {
    return db.select().from(sessions).all();
  },

  findSession(id: string): SessionRow | undefined {
    return db.select().from(sessions).where(eq(sessions.id, id)).get();
  },

  touchSession(id: string, lastSeenAt: string) {
    db.update(sessions).set({ lastSeenAt }).where(eq(sessions.id, id)).run();
  },

  deleteSession(id: string) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
  },

  deleteAllSessions() {
    db.delete(sessions).run();
  },

  deleteExpiredSessions(now: string) {
    db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
  },
};
