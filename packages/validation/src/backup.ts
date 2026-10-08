import { z } from 'zod';

import {
  EVENT_TYPES,
  GOAL_PRIORITIES,
  GOAL_STATUSES,
  HABIT_FREQUENCIES,
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  PROJECT_STATUSES,
  SKILL_LEVELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@hop/domain';

// Row shapes exactly as the backup export writes them (one object per database row).
// They check structure, allowed values, and the uniqueness the database itself enforces, but not
// newer API rules, so backups made by earlier versions of Hop can still be restored.

export const BACKUP_SNAPSHOT_VERSION = 1;

const id = z.string().min(1);
const text = z.string();
const optionalText = z.string().nullable();
const optionalInteger = z.number().int().nullable();
const timestamps = { createdAt: text, updatedAt: text };

const goalRow = z.object({
  id, name: text, why: optionalText, areaId: optionalText, status: z.enum(GOAL_STATUSES), priority: z.enum(GOAL_PRIORITIES),
  startDate: optionalText, targetDate: optionalText, successCriteria: optionalText, progress: z.number().int(),
  completedAt: optionalText, archivedAt: optionalText, ...timestamps,
}).strict();

const taskRow = z.object({
  id, title: text, description: optionalText, status: z.enum(TASK_STATUSES), priority: z.enum(TASK_PRIORITIES),
  areaId: optionalText, goalId: optionalText, projectId: optionalText, opportunityId: optionalText,
  scheduledDate: optionalText, dueDate: optionalText, estimatedMinutes: optionalInteger, completedAt: optionalText, ...timestamps,
}).strict();

const habitRow = z.object({
  id, name: text, frequency: z.enum(HABIT_FREQUENCIES), targetPerWeek: z.number().int(), goalId: optionalText, active: z.boolean(), ...timestamps,
}).strict();

const habitCompletionRow = z.object({ id, habitId: id, date: text, completedAt: text }).strict();

const eventRow = z.object({
  id, title: text, description: optionalText, type: z.enum(EVENT_TYPES), date: text, startTime: optionalText, endTime: optionalText,
  goalId: optionalText, projectId: optionalText, opportunityId: optionalText, ...timestamps,
}).strict();

const opportunityRow = z.object({
  id, title: text, organization: optionalText, url: optionalText, type: z.enum(OPPORTUNITY_TYPES), stage: z.enum(OPPORTUNITY_STAGES),
  priority: z.enum(OPPORTUNITY_PRIORITIES), location: optionalText, remote: z.boolean(), source: optionalText,
  openDate: optionalText, deadline: optionalText, appliedDate: optionalText, decisionDate: optionalText,
  nextEventDate: optionalText, nextEventLabel: optionalText, compensation: optionalText, technologyTags: z.array(text),
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
  id, title: text, description: optionalText, skillId: optionalText, projectId: optionalText, opportunityId: optionalText,
  goalId: optionalText, url: optionalText, date: optionalText, ...timestamps,
}).strict();

const weeklyReviewRow = z.object({
  id, weekStart: text, wins: text, progress: text, career: text, learning: text, projects: text, problems: text, nextWeek: text,
  energy: optionalInteger, focus: optionalInteger, ...timestamps,
}).strict();

function uniqueBy<T>(rows: T[], key: (row: T) => string) {
  return new Set(rows.map(key)).size === rows.length;
}

const rows = <T extends z.ZodType<{ id: string }>>(row: T) => z.array(row).refine((items) => uniqueBy(items, (item) => item.id), 'Contains duplicate IDs');

export const backupSnapshotSchema = z.object({
  version: z.literal(BACKUP_SNAPSHOT_VERSION, { message: `Only version ${BACKUP_SNAPSHOT_VERSION} backups can be restored` }),
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
}).strict();

export type BackupSnapshot = z.infer<typeof backupSnapshotSchema>;
export const BACKUP_TABLES = ['goals', 'tasks', 'habits', 'habitCompletions', 'events', 'opportunities', 'projects', 'skills', 'evidence', 'weeklyReviews'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export const restoreRequestSchema = z.object({
  snapshot: z.unknown(),
  confirmed: z.literal(true, { message: 'Restoring replaces all current data and must be confirmed' }),
}).strict();
