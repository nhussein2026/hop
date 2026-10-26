import { randomUUID } from 'node:crypto';

import { CEFR_LEVELS, ITU_TOMER_EXAM, LEVEL_WEEKS, PRACTICE_AREAS } from '@hop/domain';
import type {
  CefrLevel,
  CreateLanguageCheckInput,
  CreatePracticeActivityInput,
  CreatePracticeSessionInput,
  CreatePracticeTestInput,
  GoalWithDetails,
  Language,
  LanguageCheck,
  LanguageTrack,
  Milestone,
  PracticeActivity,
  PracticeSession,
  PracticeTest,
  PracticeTotals,
  Resource,
  SetupTrackInput,
  Settings,
  UpdateLanguageCheckInput,
  UpdatePracticeActivityInput,
  UpdatePracticeSessionInput,
  UpdatePracticeTestInput,
} from '@hop/domain';

import { db } from '../db/client.js';
import { ConflictError, InvalidInputError } from '../errors.js';
import { practiceRepository } from '../repositories/practice.repository.js';
import { goalService } from './goal.service.js';
import { milestoneService } from './milestone.service.js';
import { libraryService } from './library.service.js';
import { MISTAKES_NOTE, STARTER_PLAN } from './practice-plan.js';
import { settingsService } from './settings.service.js';

const LANGUAGE_NAME: Record<Language, string> = { tr: 'Turkish', en: 'English', ar: 'Arabic', other: 'the language' };

function addDays(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 864e5);

/**
 * A checkpoint for finishing each level from the one you're in now through the target, spaced like
 * İTÜ TÖMER's course lengths: each level gets a share of the time in proportion to its weeks. The
 * target level ends with the exam.
 */
export function levelCheckpoints(level: CefrLevel, target: CefrLevel, today: string, examDate: string, examName: string) {
  const steps = CEFR_LEVELS.slice(CEFR_LEVELS.indexOf(level), CEFR_LEVELS.indexOf(target) + 1);
  const total = steps.reduce((sum, step) => sum + LEVEL_WEEKS[step], 0);
  const span = daysBetween(today, examDate);
  let elapsed = 0;
  return steps.map((step) => {
    elapsed += LEVEL_WEEKS[step];
    const last = step === target;
    return { level: step, title: last ? `${step}: ${examName}` : `Finish ${step}`, date: last ? examDate : addDays(today, Math.round((span * elapsed) / total)) };
  });
}

function checkScores(scores: PracticeTest['scores'], max: PracticeTest['max']) {
  for (const [skill, score] of Object.entries(scores)) {
    const limit = max[skill as keyof PracticeTest['max']];
    if (score !== undefined && score > limit) throw new InvalidInputError(`The ${skill} score is above that section’s ${limit} points`);
  }
}

export const practiceService = {
  /**
   * Start a language track: the goal with its level checkpoints as milestones, the starter daily
   * plan if there is none yet, and the pinned mistakes note it refers to. All or nothing.
   */
  setup(input: SetupTrackInput): { settings: Settings; goal: GoalWithDetails; milestones: Milestone[]; activities: PracticeActivity[]; note: Resource | null } {
    if (settingsService.get().languageTrack) {
      throw new ConflictError('Your language track is already set up. Change it in the plan instead.');
    }

    const today = settingsService.today();

    if (input.examDate <= today) {
      throw new InvalidInputError('The exam date must be in the future');
    }

    const exam = input.exam ?? ITU_TOMER_EXAM;
    const language = input.language ?? 'tr';
    const checkpoints = levelCheckpoints(input.level, input.target, today, input.examDate, exam.name);

    return db.transaction(() => {
      const goal = goalService.create({
        name: `Reach ${input.target} in ${LANGUAGE_NAME[language]}`,
        area: 'Learning',
        priority: 'high',
        startDate: today,
        targetDate: input.examDate,
        criteria: [...checkpoints.slice(0, -1).map((step) => step.title), `Score ${exam.passMark} or more on a full practice test`, `Pass the ${exam.name}`],
      });
      const milestones = checkpoints.map((step) => milestoneService.create({ goalId: goal.id, title: step.title, date: step.date, done: false }));

      if (!practiceRepository.findActivities().length) {
        const now = new Date().toISOString();
        practiceRepository.createActivities(STARTER_PLAN.map((activity, position) => ({ id: randomUUID(), ...activity, tier: 'standard', position, active: true, createdAt: now, updatedAt: now })));
      }

      const note = libraryService.getAll().some((r) => r.kind === 'note' && r.title === MISTAKES_NOTE.title)
        ? null
        : libraryService.create({ kind: 'note', ...MISTAKES_NOTE, pinned: true });

      const track: LanguageTrack = { language, level: input.level, target: input.target, examDate: input.examDate, exam, goalId: goal.id, startedOn: today };
      const settings = settingsService.startTrack(track);
      return { settings, goal: goalService.getById(goal.id)!, milestones, activities: practiceRepository.findActivities(), note };
    });
  },

  /* ---- The daily plan ------------------------------------------------------------------- */
  getActivities(): PracticeActivity[] {
    return practiceRepository.findActivities();
  },

  createActivity(input: CreatePracticeActivityInput): PracticeActivity {
    const now = new Date().toISOString();
    const activity: PracticeActivity = {
      id: randomUUID(),
      area: input.area,
      tier: input.tier ?? 'standard',
      title: input.title,
      detail: input.detail ?? '',
      minutes: input.minutes,
      slot: input.slot ?? 'any',
      days: [...(input.days ?? [0, 1, 2, 3, 4, 5, 6])].sort(),
      position: input.position ?? practiceRepository.nextPosition(),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    practiceRepository.createActivities([activity]);
    return activity;
  },

  updateActivity(id: string, input: UpdatePracticeActivityInput): PracticeActivity | undefined {
    if (!practiceRepository.findActivity(id)) {
      return undefined;
    }

    return practiceRepository.updateActivity(id, { ...input, ...(input.days ? { days: [...input.days].sort() } : {}), updatedAt: new Date().toISOString() });
  },

  deleteActivity(id: string): boolean {
    return practiceRepository.deleteActivity(id);
  },

  /* ---- Practice done --------------------------------------------------------------------- */
  getSessions(from: string, to: string): PracticeSession[] {
    return practiceRepository.findSessions(from, to);
  },

  /** A planned activity is logged once a day: logging it again replaces the minutes and note. */
  logSession(input: CreatePracticeSessionInput): PracticeSession {
    const activity = input.activityId ? practiceRepository.findActivity(input.activityId) : undefined;

    if (input.activityId && !activity) {
      throw new InvalidInputError('That activity is no longer in your plan');
    }

    if (activity) {
      const existing = practiceRepository.findActivitySession(activity.id, input.date);
      if (existing) return practiceRepository.updateSession(existing.id, { minutes: input.minutes, note: input.note ?? existing.note })!;
    }

    const session: PracticeSession = {
      id: randomUUID(),
      date: input.date,
      area: activity?.area ?? input.area!,
      minutes: input.minutes,
      activityId: activity?.id ?? null,
      note: input.note ?? '',
      createdAt: new Date().toISOString(),
    };
    practiceRepository.createSession(session);
    return session;
  },

  updateSession(id: string, input: UpdatePracticeSessionInput): PracticeSession | undefined {
    const existing = practiceRepository.findSession(id);

    if (!existing) {
      return undefined;
    }

    if (existing.activityId && input.area && input.area !== existing.area) {
      throw new InvalidInputError('A planned activity keeps its skill. Change the activity instead.');
    }

    return practiceRepository.updateSession(id, input);
  },

  deleteSession(id: string): boolean {
    return practiceRepository.deleteSession(id);
  },

  /** Minutes per area and days practised, over everything ever logged. */
  totals(): PracticeTotals {
    const minutes = Object.fromEntries(PRACTICE_AREAS.map((area) => [area, 0])) as PracticeTotals['minutes'];
    const days = new Set<string>();
    for (const session of practiceRepository.sessionTotals()) {
      minutes[session.area] += session.minutes;
      days.add(session.date);
    }
    return { minutes, days: days.size };
  },

  /* ---- Practice tests -------------------------------------------------------------------- */
  getTests(): PracticeTest[] {
    return practiceRepository.findTests();
  },

  /** Section maximums default to the track's exam, so a result keeps the scale it was taken on. */
  createTest(input: CreatePracticeTestInput): PracticeTest {
    const max = input.max ?? settingsService.get().languageTrack?.exam.sections ?? ITU_TOMER_EXAM.sections;
    checkScores(input.scores, max);
    const now = new Date().toISOString();
    return practiceRepository.createTest({ id: randomUUID(), date: input.date, title: input.title ?? '', scores: input.scores, max, note: input.note ?? '', createdAt: now, updatedAt: now });
  },

  updateTest(id: string, input: UpdatePracticeTestInput): PracticeTest | undefined {
    const existing = practiceRepository.findTest(id);

    if (!existing) {
      return undefined;
    }

    checkScores(input.scores ?? existing.scores, input.max ?? existing.max);
    return practiceRepository.updateTest(id, { ...input, updatedAt: new Date().toISOString() });
  },

  deleteTest(id: string): boolean {
    return practiceRepository.deleteTest(id);
  },

  /* ---- Skill checks ---------------------------------------------------------------------- */
  getChecks(): LanguageCheck[] {
    return practiceRepository.findChecks();
  },

  createCheck(input: CreateLanguageCheckInput): LanguageCheck {
    const now = new Date().toISOString();
    return practiceRepository.createCheck({
      id: randomUUID(),
      date: input.date,
      area: input.area,
      task: input.task ?? '',
      metrics: input.metrics,
      level: input.level ?? null,
      judgedBy: input.judgedBy ?? null,
      link: input.link ?? '',
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now,
    });
  },

  updateCheck(id: string, input: UpdateLanguageCheckInput): LanguageCheck | undefined {
    if (!practiceRepository.findCheck(id)) {
      return undefined;
    }

    return practiceRepository.updateCheck(id, { ...input, updatedAt: new Date().toISOString() });
  },

  deleteCheck(id: string): boolean {
    return practiceRepository.deleteCheck(id);
  },
};
