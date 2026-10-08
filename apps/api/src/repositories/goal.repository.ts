import { and, asc, eq } from 'drizzle-orm';

import type { Goal, GoalCriterion, GoalProgressPoint } from '@hop/domain';

import { db } from '../db/client.js';
import { goalCriteria, goalProgress, goals } from '../db/schema/index.js';

export const goalRepository = {
  findAll(): Goal[] {
    return db.select().from(goals).all();
  },

  findById(id: string): Goal | undefined {
    return db.select().from(goals).where(eq(goals.id, id)).get();
  },

  create(goal: Goal): Goal {
    db.insert(goals).values(goal).run();
    return goal;
  },

  update(id: string, changes: Partial<Goal>): Goal | undefined {
    db.update(goals).set(changes).where(eq(goals.id, id)).run();
    return this.findById(id);
  },

  findAllCriteria(): GoalCriterion[] {
    return db.select().from(goalCriteria).orderBy(asc(goalCriteria.position)).all();
  },

  findCriteria(goalId: string): GoalCriterion[] {
    return db.select().from(goalCriteria).where(eq(goalCriteria.goalId, goalId)).orderBy(asc(goalCriteria.position)).all();
  },

  findCriterion(goalId: string, id: string): GoalCriterion | undefined {
    return db.select().from(goalCriteria).where(and(eq(goalCriteria.goalId, goalId), eq(goalCriteria.id, id))).get();
  },

  createCriterion(criterion: GoalCriterion) {
    db.insert(goalCriteria).values(criterion).run();
  },

  updateCriterion(id: string, changes: Partial<GoalCriterion>) {
    db.update(goalCriteria).set(changes).where(eq(goalCriteria.id, id)).run();
  },

  findAllProgress(): GoalProgressPoint[] {
    return db.select({ goalId: goalProgress.goalId, date: goalProgress.date, progress: goalProgress.progress }).from(goalProgress).orderBy(asc(goalProgress.date)).all();
  },

  /** Record the goal's progress for a date, replacing an earlier value for the same date. */
  recordProgress(id: string, point: GoalProgressPoint) {
    db.insert(goalProgress)
      .values({ id, ...point })
      .onConflictDoUpdate({ target: [goalProgress.goalId, goalProgress.date], set: { progress: point.progress } })
      .run();
  },
};
