import { toLocalDate } from './date.js';

export type PlanTask = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  scheduledDate: string | null;
  dueDate: string | null;
  goalId: string | null;
  estimatedMinutes?: number | null;
  completedAt?: string | null;
};

export type PlanGroup = {
  date: string;
  items: PlanTask[];
};

export type GoalTaskSummary = {
  goalId: string;
  taskCount: number;
  nextTask: string;
};

export type GoalHealth = {
  label: 'On track' | 'Needs attention' | 'Paused' | 'Completed';
  detail: string;
};

export type MomentumSignal = {
  label: 'Strong momentum' | 'Steady momentum' | 'Starting to move' | 'Needs a reset';
  detail: string;
  score: number;
};

export type GoalFocusGuidance = {
  overloaded: boolean;
  detail: string;
};

export type OpportunityHealth = {
  label: 'Active' | 'Needs attention' | 'Waiting' | 'Upcoming' | 'Closed';
  detail: string;
};

const closedOpportunityStages = ['accepted', 'declined', 'rejected', 'withdrawn', 'expired'];

export function isClosedOpportunity(opportunity: { stage: string }): boolean {
  return closedOpportunityStages.includes(opportunity.stage);
}

export function buildOpportunityHealth(opportunity: {
  stage: string;
  deadline?: string | null;
  nextEventDate?: string | null;
  updatedAt?: string | null;
}): OpportunityHealth {
  if (isClosedOpportunity(opportunity)) {
    return { label: 'Closed', detail: 'This opportunity is closed.' };
  }

  const today = toLocalDate();
  if (opportunity.deadline && opportunity.deadline < today) {
    return { label: 'Needs attention', detail: `Deadline passed on ${opportunity.deadline}.` };
  }

  if (opportunity.nextEventDate && opportunity.nextEventDate < today) {
    return { label: 'Needs attention', detail: `Follow-up was due on ${opportunity.nextEventDate}.` };
  }

  if (opportunity.nextEventDate) {
    const daysUntilEvent = (new Date(`${opportunity.nextEventDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilEvent <= 7) {
      return { label: 'Upcoming', detail: `Next step is scheduled for ${opportunity.nextEventDate}.` };
    }
  }

  if (['applied', 'screening', 'interview', 'assessment', 'final', 'offer'].includes(opportunity.stage)) {
    return { label: 'Waiting', detail: 'This opportunity is in progress and waiting on the next decision or response.' };
  }

  if (opportunity.updatedAt) {
    const idleDays = Math.floor((Date.now() - new Date(opportunity.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (idleDays >= 14) {
      return { label: 'Needs attention', detail: `No activity recorded for ${idleDays} days.` };
    }
  }

  return { label: 'Active', detail: 'Keep the next action or follow-up visible.' };
}

export function buildGoalFocusGuidance(activeGoalCount: number): GoalFocusGuidance {
  if (activeGoalCount > 3) {
    return {
      overloaded: true,
      detail: `You currently have ${activeGoalCount} active goals. Consider reviewing your priorities.`,
    };
  }

  return {
    overloaded: false,
    detail: `${activeGoalCount} active goal${activeGoalCount === 1 ? '' : 's'} is within the recommended focus range.`,
  };
}

export function buildMomentumIndicator(
  tasks: Array<Pick<PlanTask, 'status' | 'completedAt'>>,
  habitCompletions: number,
  activeGoalCount: number,
): MomentumSignal {
  const now = new Date();
  const recentMeaningfulActions = tasks.filter((task) => {
    if (task.status !== 'completed' || !task.completedAt) return false;
    const completedOn = new Date(task.completedAt);
    const daysDifference = (now.getTime() - completedOn.getTime()) / (1000 * 60 * 60 * 24);
    return daysDifference <= 7;
  }).length;

  const score = recentMeaningfulActions + habitCompletions + Math.min(activeGoalCount, 2);

  if (score >= 6) {
    return {
      label: 'Strong momentum',
      detail: `${score} meaningful actions in the last 7 days. Your system is moving with intention.`,
      score,
    };
  }

  if (score >= 3) {
    return {
      label: 'Steady momentum',
      detail: `${score} meaningful actions in the last 7 days. Keep the next action small and useful.`,
      score,
    };
  }

  if (score >= 1) {
    return {
      label: 'Starting to move',
      detail: `${score} meaningful action in the last 7 days. Pick the next small win and keep going.`,
      score,
    };
  }

  return {
    label: 'Needs a reset',
    detail: 'No meaningful actions recorded in the last 7 days. Start with one small action and build from there.',
    score: 0,
  };
}

export function buildGoalHealth(
  goal: { id: string; status: 'active' | 'paused' | 'achieved' | 'abandoned' | 'archived'; progress: number; updatedAt?: string | null },
  tasks: PlanTask[],
): GoalHealth {
  if (goal.status === 'paused') {
    return {
      label: 'Paused',
      detail: 'This goal is paused. Resume it when the next action is ready.',
    };
  }

  if (goal.status === 'achieved' || goal.progress >= 100) {
    return {
      label: 'Completed',
      detail: 'This goal is complete and its evidence is ready to keep.',
    };
  }

  const linkedTasks = tasks.filter((task) => task.goalId === goal.id && task.status !== 'cancelled');

  if (linkedTasks.length === 0) {
    return {
      label: 'Needs attention',
      detail: 'No linked tasks yet. Add the next action that moves this goal forward.',
    };
  }

  const completed = linkedTasks.filter((task) => task.status === 'completed').length;
  if (completed === linkedTasks.length) {
    return {
      label: 'Completed',
      detail: 'Every linked action is complete.',
    };
  }

  if (goal.updatedAt) {
    const idleDays = Math.floor((Date.now() - new Date(goal.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (idleDays >= 14) {
      return {
        label: 'Needs attention',
        detail: `This goal has been quiet for ${idleDays} days. Add the next action that moves it forward.`,
      };
    }
  }

  return {
    label: 'On track',
    detail: `${completed} of ${linkedTasks.length} linked actions are complete.`,
  };
}

/** Overdue is derived from dates and status: a due date, or else a scheduled date, before today. */
export function isTaskOverdue(task: Pick<PlanTask, 'scheduledDate' | 'dueDate'>, today: string): boolean {
  const deadline = task.dueDate ?? task.scheduledDate;
  return deadline !== null && deadline < today;
}

/** Tasks that belong on Today: scheduled or due today, or carried over from an earlier day. */
export function isTaskDueBy(task: Pick<PlanTask, 'scheduledDate' | 'dueDate'>, today: string): boolean {
  return (task.scheduledDate !== null && task.scheduledDate <= today) || (task.dueDate !== null && task.dueDate <= today);
}

export function sortTasksForToday(tasks: PlanTask[]): PlanTask[] {
  return [...tasks].sort((left, right) => {
    const leftDate = left.scheduledDate ?? left.dueDate ?? '9999-12-31';
    const rightDate = right.scheduledDate ?? right.dueDate ?? '9999-12-31';
    const dateOrder = leftDate.localeCompare(rightDate);
    if (dateOrder !== 0) return dateOrder;

    const priorityRank = { high: 0, medium: 1, low: 2 };
    const priorityOrder = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityOrder !== 0) return priorityOrder;

    return left.title.localeCompare(right.title);
  });
}

export function buildPlanGroups(tasks: PlanTask[]): PlanGroup[] {
  const upcoming = tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled');

  const grouped = new Map<string, PlanTask[]>();

  for (const task of upcoming) {
    const date = task.scheduledDate ?? task.dueDate ?? 'unscheduled';
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)?.push(task);
  }

  const sortedGroups = [...grouped.entries()]
    .filter(([date]) => date !== 'unscheduled')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((left, right) => {
        const priorityRank = { high: 0, medium: 1, low: 2 };
        return priorityRank[left.priority] - priorityRank[right.priority];
      }),
    }));

  const unscheduled = grouped.get('unscheduled');

  if (unscheduled && unscheduled.length > 0) {
    sortedGroups.push({
      date: 'unscheduled',
      items: [...unscheduled].sort((left, right) => {
        const priorityRank = { high: 0, medium: 1, low: 2 };
        return priorityRank[left.priority] - priorityRank[right.priority];
      }),
    });
  }

  return sortedGroups;
}

export function buildGoalTaskSummary(tasks: PlanTask[]): GoalTaskSummary[] {
  const grouped = new Map<string, PlanTask[]>();

  for (const task of tasks) {
    if (!task.goalId || task.status === 'completed' || task.status === 'cancelled') {
      continue;
    }

    const current = grouped.get(task.goalId) ?? [];
    current.push(task);
    grouped.set(task.goalId, current);
  }

  return [...grouped.entries()]
    .map(([goalId, goalTasks]) => ({
      goalId,
      taskCount: goalTasks.length,
      nextTask: sortTasksForToday(goalTasks)[0]?.title ?? 'No next task',
    }))
    .sort((left, right) => right.taskCount - left.taskCount || left.goalId.localeCompare(right.goalId));
}
