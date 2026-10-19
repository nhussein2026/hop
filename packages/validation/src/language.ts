import { z } from 'zod';
import { CEFR_LEVELS, LANGUAGE_SKILLS, LANGUAGES, PRACTICE_AREAS, PRACTICE_SLOTS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const level = z.enum(CEFR_LEVELS);
const points = z.number().int('Use whole points').min(0, 'Points cannot be negative').max(100, 'A section has at most 100 points');
const sectionMax = z.object({ listening: points.min(1), reading: points.min(1), writing: points.min(1), speaking: points.min(1) }).strict();

const examSchema = z.object({
  name: text('Exam name', 120).min(1, 'Name the exam'),
  sections: sectionMax.refine((s) => s.listening + s.reading + s.writing + s.speaking === 100, 'Section points must add up to 100'),
  passMark: z.number().int().min(1, 'Use a pass mark from 1 to 100').max(100, 'Use a pass mark from 1 to 100'),
}).strict();

const levelOrder = (value: string) => CEFR_LEVELS.indexOf(value as (typeof CEFR_LEVELS)[number]);

export const setupTrackSchema = z.object({
  language: z.enum(LANGUAGES).optional(),
  level,
  target: level,
  examDate: date,
  exam: examSchema.optional(),
}).strict().refine((input) => levelOrder(input.target) > levelOrder(input.level), { message: 'The target must be above your current level', path: ['target'] });

export const updateTrackSchema = z.object({
  level,
  target: level,
  examDate: date,
  exam: examSchema,
  goalId: id.nullable(),
}).partial().strict();

const days = z.array(z.number().int().min(0).max(6)).max(7).refine((list) => new Set(list).size === list.length, 'Each day once');

const activityFields = {
  area: z.enum(PRACTICE_AREAS),
  title: text('Title', 120).min(1, 'Name the activity'),
  detail: text('How to do it', 1000),
  minutes: z.number().int('Use whole minutes').min(1, 'At least 1 minute').max(240, 'At most 4 hours'),
  slot: z.enum(PRACTICE_SLOTS),
  days,
  position: z.number().int().min(0),
  active: z.boolean(),
};

export const createPracticeActivitySchema = z.object(activityFields).partial().required({ area: true, title: true, minutes: true }).strict();
export const updatePracticeActivitySchema = z.object(activityFields).partial().strict();

const minutes = z.number().int('Use whole minutes').min(1, 'At least 1 minute').max(600, 'At most 10 hours');

export const createPracticeSessionSchema = z.object({
  date,
  minutes,
  area: z.enum(PRACTICE_AREAS).optional(),
  activityId: id.optional(),
  note: text('Note', 500).optional(),
}).strict().refine((input) => input.area || input.activityId, { message: 'Say which skill it was', path: ['area'] });

export const updatePracticeSessionSchema = z.object({ date, area: z.enum(PRACTICE_AREAS), minutes, note: text('Note', 500) }).partial().strict();

export const practiceRangeSchema = z.object({ from: date, to: date }).refine((range) => range.from <= range.to, 'from must not be after to');

const scores = z.object(Object.fromEntries(LANGUAGE_SKILLS.map((skill) => [skill, points])) as Record<(typeof LANGUAGE_SKILLS)[number], typeof points>).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Add at least one section score');

const testFields = {
  date,
  title: text('Title', 120),
  scores,
  max: sectionMax,
  note: text('Note', 1000),
};

/** A section score can't be above that section's maximum. */
const withinMax = (input: { scores?: Partial<Record<string, number | undefined>> | undefined; max?: Record<string, number> | undefined }) =>
  !input.scores || !input.max || Object.entries(input.scores).every(([skill, score]) => score === undefined || score <= (input.max![skill] ?? 100));

export const createPracticeTestSchema = z.object(testFields).partial().required({ date: true, scores: true }).strict()
  .refine(withinMax, { message: 'A score is above that section’s maximum', path: ['scores'] });
export const updatePracticeTestSchema = z.object(testFields).partial().strict()
  .refine(withinMax, { message: 'A score is above that section’s maximum', path: ['scores'] });
