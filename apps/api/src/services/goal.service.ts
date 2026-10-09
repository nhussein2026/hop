import { randomUUID } from 'node:crypto';

import type {
  CreateGoalCriterionInput,
  CreateGoalInput,
  Goal,
  GoalCriterion,
  GoalWithDetails,
  UpdateGoalCriterionInput,
  UpdateGoalInput,
} from '@hop/domain';

import { goalRepository } from '../repositories/goal.repository.js';
import { settingsService } from './settings.service.js';

/** Share of success criteria met, as a whole percentage. A goal without criteria is at 0%. */
function criteriaProgress(criteria: Pick<GoalCriterion, 'done'>[]): number {
  return criteria.length ? Math.round((criteria.filter((criterion) => criterion.done).length / criteria.length) * 100) : 0;
}

function withDetails(goal: Goal, criteria: GoalCriterion[], history: GoalWithDetails['history']): GoalWithDetails {
  return { ...goal, criteria, history };
}

/** Recompute progress from the criteria and record it for today, so changes over time can be explained. */
function syncProgress(goalId: string, now: string) {
  const progress = criteriaProgress(goalRepository.findCriteria(goalId));
  goalRepository.update(goalId, { progress, updatedAt: now });
  goalRepository.recordProgress(randomUUID(), { goalId, date: settingsService.today(new Date(now)), progress });
}

/**
 * Goals move only through their success criteria. A goal is never achieved automatically:
 * the user decides, and Hop suggests it once every criterion is met.
 */
export const goalService = {
  getAll(): GoalWithDetails[] {
    const criteria = goalRepository.findAllCriteria();
    const history = goalRepository.findAllProgress();

    return goalRepository.findAll().map((goal) => withDetails(
      goal,
      criteria.filter((criterion) => criterion.goalId === goal.id),
      history.filter((point) => point.goalId === goal.id).map(({ date, progress }) => ({ date, progress })),
    ));
  },

  getById(id: string): GoalWithDetails | undefined {
    return this.getAll().find((goal) => goal.id === id);
  },

  create(input: CreateGoalInput): GoalWithDetails {
    const now = new Date().toISOString();
    const { criteria, ...fields } = input;

    const goal: Goal = {
      id: randomUUID(),
      name: fields.name,
      why: fields.why ?? null,
      areaId: fields.areaId ?? null,
      area: fields.area ?? null,
      status: fields.status ?? 'active',
      priority: fields.priority ?? 'medium',
      startDate: fields.startDate ?? null,
      targetDate: fields.targetDate ?? null,
      successCriteria: null,
      progress: 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    goalRepository.create(goal);
    criteria.forEach((text, position) => goalRepository.createCriterion({
      id: randomUUID(), goalId: goal.id, text, note: null, done: false, position, createdAt: now, updatedAt: now,
    }));

    syncProgress(goal.id, now);

    return this.getById(goal.id)!;
  },

  update(id: string, input: UpdateGoalInput): GoalWithDetails | undefined {
    const existingGoal = goalRepository.findById(id);

    if (!existingGoal) {
      return undefined;
    }

    const now = new Date().toISOString();
    const changes: Partial<Goal> = {
      ...input,
      updatedAt: now,
    };

    if (input.status === 'achieved' && existingGoal.status !== 'achieved') {
      changes.completedAt = now;
    }

    if (input.status && input.status !== 'achieved') {
      changes.completedAt = null;
    }

    if (input.status === 'archived') {
      changes.archivedAt = now;
    }

    if (input.status && input.status !== 'archived') {
      changes.archivedAt = null;
    }

    goalRepository.update(id, changes);
    return this.getById(id);
  },

  /** Mark the goal as recently active, such as when one of its tasks is completed. */
  touch(id: string | null) {
    if (id && goalRepository.findById(id)) {
      goalRepository.update(id, { updatedAt: new Date().toISOString() });
    }
  },

  addCriterion(goalId: string, input: CreateGoalCriterionInput): GoalWithDetails | undefined {
    if (!goalRepository.findById(goalId)) {
      return undefined;
    }

    const now = new Date().toISOString();
    const existing = goalRepository.findCriteria(goalId);
    const baseline = goalRepository.findAllProgress().some((point) => point.goalId === goalId);

    if (!baseline) {
      // Start the history before this change, so the first change shows as movement.
      goalRepository.recordProgress(randomUUID(), { goalId, date: settingsService.today(new Date(Date.now() - 86_400_000)), progress: criteriaProgress(existing) });
    }

    goalRepository.createCriterion({
      id: randomUUID(),
      goalId,
      text: input.text,
      note: input.note ?? null,
      done: false,
      position: existing.length ? Math.max(...existing.map((criterion) => criterion.position)) + 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    syncProgress(goalId, now);
    return this.getById(goalId);
  },

  updateCriterion(goalId: string, criterionId: string, input: UpdateGoalCriterionInput): GoalWithDetails | undefined {
    if (!goalRepository.findCriterion(goalId, criterionId)) {
      return undefined;
    }

    const now = new Date().toISOString();
    goalRepository.updateCriterion(criterionId, { ...input, updatedAt: now });
    syncProgress(goalId, now);
    return this.getById(goalId);
  },
};
