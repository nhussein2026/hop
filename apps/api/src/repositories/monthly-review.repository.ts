import { eq } from 'drizzle-orm';

import type { MonthlyReview } from '@hop/domain';

import { db } from '../db/client.js';
import { monthlyReviews } from '../db/schema/index.js';

export const monthlyReviewRepository = {
  findAll(): MonthlyReview[] {
    return db.select().from(monthlyReviews).all();
  },

  findById(id: string): MonthlyReview | undefined {
    return db.select().from(monthlyReviews).where(eq(monthlyReviews.id, id)).get();
  },

  findByMonthStart(monthStart: string): MonthlyReview | undefined {
    return db.select().from(monthlyReviews).where(eq(monthlyReviews.monthStart, monthStart)).get();
  },

  create(review: MonthlyReview): MonthlyReview {
    db.insert(monthlyReviews).values(review).run();
    return review;
  },

  update(id: string, changes: Partial<MonthlyReview>): MonthlyReview | undefined {
    db.update(monthlyReviews).set(changes).where(eq(monthlyReviews.id, id)).run();
    return this.findById(id);
  },
};
