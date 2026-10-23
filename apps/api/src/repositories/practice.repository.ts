import { and, asc, between, eq, max } from 'drizzle-orm';

import type { LanguageCheck, PracticeActivity, PracticeArea, PracticeSession, PracticeTest } from '@hop/domain';

import { db } from '../db/client.js';
import { languageChecks, practiceActivities, practiceSessions, practiceTests } from '../db/schema/index.js';

export const practiceRepository = {
  findActivities(): PracticeActivity[] {
    return db.select().from(practiceActivities).orderBy(asc(practiceActivities.position), asc(practiceActivities.createdAt)).all();
  },

  findActivity(id: string): PracticeActivity | undefined {
    return db.select().from(practiceActivities).where(eq(practiceActivities.id, id)).get();
  },

  nextPosition(): number {
    return (db.select({ last: max(practiceActivities.position) }).from(practiceActivities).get()?.last ?? -1) + 1;
  },

  createActivities(activities: PracticeActivity[]) {
    if (activities.length) db.insert(practiceActivities).values(activities).run();
  },

  updateActivity(id: string, changes: Partial<PracticeActivity>): PracticeActivity | undefined {
    db.update(practiceActivities).set(changes).where(eq(practiceActivities.id, id)).run();
    return this.findActivity(id);
  },

  /** Sessions it recorded stay, as practice done outside the plan. */
  deleteActivity(id: string): boolean {
    return db.transaction((tx) => {
      tx.update(practiceSessions).set({ activityId: null }).where(eq(practiceSessions.activityId, id)).run();
      return tx.delete(practiceActivities).where(eq(practiceActivities.id, id)).run().changes > 0;
    });
  },

  findSessions(from: string, to: string): PracticeSession[] {
    return db.select().from(practiceSessions).where(between(practiceSessions.date, from, to)).orderBy(asc(practiceSessions.date), asc(practiceSessions.createdAt)).all();
  },

  findSession(id: string): PracticeSession | undefined {
    return db.select().from(practiceSessions).where(eq(practiceSessions.id, id)).get();
  },

  findActivitySession(activityId: string, date: string): PracticeSession | undefined {
    return db.select().from(practiceSessions).where(and(eq(practiceSessions.activityId, activityId), eq(practiceSessions.date, date))).get();
  },

  createSession(session: PracticeSession) {
    db.insert(practiceSessions).values(session).run();
  },

  updateSession(id: string, changes: Partial<PracticeSession>): PracticeSession | undefined {
    db.update(practiceSessions).set(changes).where(eq(practiceSessions.id, id)).run();
    return this.findSession(id);
  },

  deleteSession(id: string): boolean {
    return db.delete(practiceSessions).where(eq(practiceSessions.id, id)).run().changes > 0;
  },

  /** Every session's area, minutes and day, for totals over the whole track. */
  sessionTotals(): { area: PracticeArea; minutes: number; date: string }[] {
    return db.select({ area: practiceSessions.area, minutes: practiceSessions.minutes, date: practiceSessions.date }).from(practiceSessions).all();
  },

  findTests(): PracticeTest[] {
    return db.select().from(practiceTests).orderBy(asc(practiceTests.date), asc(practiceTests.createdAt)).all();
  },

  findTest(id: string): PracticeTest | undefined {
    return db.select().from(practiceTests).where(eq(practiceTests.id, id)).get();
  },

  createTest(test: PracticeTest): PracticeTest {
    db.insert(practiceTests).values(test).run();
    return test;
  },

  updateTest(id: string, changes: Partial<PracticeTest>): PracticeTest | undefined {
    db.update(practiceTests).set(changes).where(eq(practiceTests.id, id)).run();
    return this.findTest(id);
  },

  deleteTest(id: string): boolean {
    return db.delete(practiceTests).where(eq(practiceTests.id, id)).run().changes > 0;
  },

  findChecks(): LanguageCheck[] {
    return db.select().from(languageChecks).orderBy(asc(languageChecks.date), asc(languageChecks.createdAt)).all();
  },

  findCheck(id: string): LanguageCheck | undefined {
    return db.select().from(languageChecks).where(eq(languageChecks.id, id)).get();
  },

  createCheck(check: LanguageCheck): LanguageCheck {
    db.insert(languageChecks).values(check).run();
    return check;
  },

  updateCheck(id: string, changes: Partial<LanguageCheck>): LanguageCheck | undefined {
    db.update(languageChecks).set(changes).where(eq(languageChecks.id, id)).run();
    return this.findCheck(id);
  },

  deleteCheck(id: string): boolean {
    return db.delete(languageChecks).where(eq(languageChecks.id, id)).run().changes > 0;
  },
};
