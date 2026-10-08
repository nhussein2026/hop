import { z } from 'zod';

import {
  CONTACT_KINDS,
  EVENT_TYPES,
  GOAL_AREAS,
  GOAL_PRIORITIES,
  GOAL_STATUSES,
  HABIT_FREQUENCIES,
  INTERACTION_TYPES,
  MONTHLY_REVIEW_STATUSES,
  OPPORTUNITY_ACTIVITY_TYPES,
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  PROJECT_STATUSES,
  SKILL_LEVELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WEEKLY_REVIEW_STATUSES,
  WORK_MODES,
} from '@hop/domain';

// Row shapes exactly as the backup export writes them (one object per database row).
// They check structure, allowed values, and the uniqueness the database itself enforces, but not
// newer API rules, so backups made by earlier versions of Hop can still be restored.
// Version 2 added tables and columns; version 1 backups fill them with defaults (`.default`).

export const BACKUP_SNAPSHOT_VERSION = 2;

const id = z.string().min(1);
const text = z.string();
const optionalText = z.string().nullable();
const optionalInteger = z.number().int().nullable();
const flag = z.boolean();
const ids = z.array(z.string());
const timestamps = { createdAt: text, updatedAt: text };

const goalRow = z.object({
  id, name: text, why: optionalText, areaId: optionalText, area: z.enum(GOAL_AREAS).nullable().default(null), status: z.enum(GOAL_STATUSES), priority: z.enum(GOAL_PRIORITIES),
  startDate: optionalText, targetDate: optionalText, successCriteria: optionalText, progress: z.number().int(),
  completedAt: optionalText, archivedAt: optionalText, ...timestamps,
}).strict();

const taskRow = z.object({
  id, title: text, description: optionalText, status: z.enum(TASK_STATUSES), priority: z.enum(TASK_PRIORITIES),
  areaId: optionalText, goalId: optionalText, projectId: optionalText, opportunityId: optionalText,
  scheduledDate: optionalText, dueDate: optionalText, estimatedMinutes: optionalInteger, completedAt: optionalText, ...timestamps,
}).strict();

const habitRow = z.object({
  id, name: text, frequency: z.enum(HABIT_FREQUENCIES), targetPerWeek: z.number().int(), goalId: optionalText,
  days: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]), minutes: z.number().int().default(30), active: z.boolean(), ...timestamps,
}).strict();

const habitCompletionRow = z.object({ id, habitId: id, date: text, completedAt: text }).strict();

const eventRow = z.object({
  id, title: text, description: optionalText, type: z.enum(EVENT_TYPES), date: text, startTime: optionalText, endTime: optionalText,
  goalId: optionalText, projectId: optionalText, opportunityId: optionalText, ...timestamps,
}).strict();

const opportunityRow = z.object({
  id, title: text, organization: optionalText, url: optionalText, type: z.enum(OPPORTUNITY_TYPES), stage: z.enum(OPPORTUNITY_STAGES),
  priority: z.enum(OPPORTUNITY_PRIORITIES), location: optionalText, remote: z.boolean(), workMode: z.enum(WORK_MODES).nullable().default(null), source: optionalText,
  openDate: optionalText, deadline: optionalText, appliedDate: optionalText, decisionDate: optionalText,
  nextEventDate: optionalText, nextEventLabel: optionalText, nextEventTime: optionalText.default(null),
  reachedStage: z.enum(OPPORTUNITY_STAGES).nullable().default(null), compensation: optionalText, technologyTags: z.array(text), contactIds: ids.default([]),
  resumeId: optionalText, coverLetterId: optionalText, notes: optionalText, closedAt: optionalText, ...timestamps,
}).strict();

// Projects store their lists as JSON text in the database, and the export keeps that form.
const jsonList = text.refine((value) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string');
  } catch {
    return false;
  }
}, 'Must be a JSON list of strings');

const projectRow = z.object({
  id, name: text, problem: optionalText, blurb: optionalText, status: z.enum(PROJECT_STATUSES), startDate: optionalText, endDate: optionalText,
  stack: jsonList, repositoryUrl: optionalText, demoUrl: optionalText, learned: optionalText, challenges: optionalText,
  architectureNotes: optionalText, goalIds: jsonList, skillIds: jsonList, ...timestamps,
}).strict();

const skillRow = z.object({
  id, name: text, category: optionalText, level: z.enum(SKILL_LEVELS), confidence: optionalInteger, lastPracticedAt: optionalText,
  yearsExperience: z.number().nullable(), notes: optionalText, ...timestamps,
}).strict();

const evidenceRow = z.object({
  id, title: text, description: optionalText, skillId: optionalText, skillIds: ids.default([]), projectId: optionalText, opportunityId: optionalText,
  goalId: optionalText, url: optionalText, date: optionalText, ...timestamps,
}).strict();

const weeklyReviewRow = z.object({
  id, weekStart: text, wins: text, progress: text, career: text, learning: text, projects: text, problems: text, nextWeek: text,
  energy: optionalInteger, focus: optionalInteger, change: text.default(''), topThree: z.array(text).default([]),
  // Version 1 reviews were saved in one step, so they count as completed.
  status: z.enum(WEEKLY_REVIEW_STATUSES).default('completed'), facts: z.record(z.string(), z.unknown()).nullable().default(null),
  completedAt: optionalText.default(null), ...timestamps,
}).strict();
const goalCriterionRow = z.object({ id, goalId: id, text, note: optionalText, done: flag, position: z.number().int(), ...timestamps }).strict();
const goalProgressRow = z.object({ id, goalId: id, date: text, progress: z.number().int() }).strict();
const milestoneRow = z.object({ id, goalId: optionalText, title: text, date: text, done: flag, ...timestamps }).strict();
const opportunityPrepRow = z.object({ id, opportunityId: id, text, done: flag, position: z.number().int(), ...timestamps }).strict();
const opportunityActivityRow = z.object({ id, opportunityId: id, type: z.enum(OPPORTUNITY_ACTIVITY_TYPES), text, at: text, createdAt: text }).strict();
const contactRow = z.object({
  id, name: text, role: optionalText, organization: optionalText, kind: z.enum(CONTACT_KINDS), email: optionalText, linkedin: optionalText, notes: optionalText, ...timestamps,
}).strict();
const interactionRow = z.object({ id, contactId: id, opportunityId: optionalText, type: z.enum(INTERACTION_TYPES), date: text, summary: text, createdAt: text }).strict();
const resumeRow = z.object({ id, name: text, version: z.number().int(), focus: optionalText, archived: flag, ...timestamps }).strict();
/** The document itself is stored as base64, so the backup stays a single JSON file. */
const resumeFileRow = z.object({ resumeId: id, name: text, type: text, size: z.number().int(), data: z.string().base64(), createdAt: text }).strict();
const reflectionRow = z.object({
  id, date: text, accomplished: text, learned: text, badly: text, tomorrow: text, energy: optionalInteger, focus: optionalInteger, ...timestamps,
}).strict();
const monthlyReviewRow = z.object({
  id, monthStart: text, highlights: text, keep: text, stop: text, change: text, focus: z.array(text),
  status: z.enum(MONTHLY_REVIEW_STATUSES), facts: z.record(z.string(), z.unknown()).nullable(), completedAt: optionalText, ...timestamps,
}).strict();
const settingsRow = z.object({ id: z.number().int(), data: z.record(z.string(), z.unknown()), updatedAt: text }).strict();

function uniqueBy<T>(rows: T[], key: (row: T) => string) {
  return new Set(rows.map(key)).size === rows.length;
}

const rows = <T extends z.ZodType<{ id: string | number }>>(row: T) => z.array(row).refine((items) => uniqueBy(items, (item) => String(item.id)), 'Contains duplicate IDs');

export const backupSnapshotSchema = z.object({
  version: z.union([z.literal(1), z.literal(BACKUP_SNAPSHOT_VERSION)], { message: `Only version 1 and ${BACKUP_SNAPSHOT_VERSION} backups can be restored` }),
  exportedAt: z.string().datetime({ message: 'exportedAt must be an ISO timestamp' }),
  goals: rows(goalRow),
  tasks: rows(taskRow),
  habits: rows(habitRow),
  habitCompletions: rows(habitCompletionRow).refine(
    (items) => uniqueBy(items, (item) => `${item.habitId}|${item.date}`),
    'Contains more than one completion for the same habit and date',
  ),
  events: rows(eventRow),
  opportunities: rows(opportunityRow),
  projects: rows(projectRow),
  skills: rows(skillRow),
  evidence: rows(evidenceRow),
  // Earlier versions allowed several reviews per week, so duplicates are accepted here.
  weeklyReviews: rows(weeklyReviewRow),
  goalCriteria: rows(goalCriterionRow).default([]),
  goalProgress: rows(goalProgressRow).refine(
    (items) => uniqueBy(items, (item) => `${item.goalId}|${item.date}`),
    'Contains more than one progress entry for the same goal and date',
  ).default([]),
  milestones: rows(milestoneRow).default([]),
  opportunityPrep: rows(opportunityPrepRow).default([]),
  opportunityActivities: rows(opportunityActivityRow).default([]),
  contacts: rows(contactRow).default([]),
  interactions: rows(interactionRow).default([]),
  resumes: rows(resumeRow).default([]),
  resumeFiles: z.array(resumeFileRow).refine((items) => uniqueBy(items, (item) => item.resumeId), 'Contains more than one file for the same resume').default([]),
  reflections: rows(reflectionRow).refine((items) => uniqueBy(items, (item) => item.date), 'Contains more than one reflection for the same date').default([]),
  monthlyReviews: rows(monthlyReviewRow).refine((items) => uniqueBy(items, (item) => item.monthStart), 'Contains more than one review for the same month').default([]),
  settings: rows(settingsRow).default([]),
}).strict();

export type BackupSnapshot = z.infer<typeof backupSnapshotSchema>;
export const BACKUP_TABLES = [
  'goals', 'tasks', 'habits', 'habitCompletions', 'events', 'opportunities', 'projects', 'skills', 'evidence', 'weeklyReviews',
  'goalCriteria', 'goalProgress', 'milestones', 'opportunityPrep', 'opportunityActivities', 'contacts', 'interactions', 'resumes',
  'resumeFiles', 'reflections', 'monthlyReviews', 'settings',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export const restoreRequestSchema = z.object({
  snapshot: z.unknown(),
  confirmed: z.literal(true, { message: 'Restoring replaces all current data and must be confirmed' }),
}).strict();
