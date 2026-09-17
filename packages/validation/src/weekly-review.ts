import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');
const notes = z.string().trim().max(5000, 'Review notes cannot exceed 5000 characters');
const rating = z.number().int().min(1).max(5).nullable().optional();

const reviewFields = {
  weekStart: date,
  wins: notes.optional(),
  progress: notes.optional(),
  career: notes.optional(),
  learning: notes.optional(),
  projects: notes.optional(),
  problems: notes.optional(),
  nextWeek: notes.optional(),
  energy: rating,
  focus: rating,
};

export const createWeeklyReviewSchema = z.object(reviewFields).strict();
export const updateWeeklyReviewSchema = z.object(reviewFields).partial().strict();
