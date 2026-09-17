import { eq } from 'drizzle-orm';

import type { WeeklyReview } from '@hop/domain';

import { db } from '../db/client.js';
import { weeklyReviews } from '../db/schema/index.js';

export const weeklyReviewRepository = {
  findAll(): WeeklyReview[] {
    return db.select().from(weeklyReviews).all();
  },

  findById(id: string): WeeklyReview | undefined {
    return db.select().from(weeklyReviews).where(eq(weeklyReviews.id, id)).get();
  },

  create(review: WeeklyReview): WeeklyReview {
    db.insert(weeklyReviews).values(review).run();
    return review;
  },

  update(id: string, changes: Partial<WeeklyReview>): WeeklyReview | undefined {
    db.update(weeklyReviews).set(changes).where(eq(weeklyReviews.id, id)).run();
    return this.findById(id);
  },
};
