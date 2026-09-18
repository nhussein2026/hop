export type PlanTask = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  scheduledDate: string | null;
  dueDate: string | null;
  goalId: string | null;
  estimatedMinutes?: number | null;
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

export function buildGoalHealth(
  goal: { id: string; status: 'active' | 'paused' | 'achieved' | 'abandoned' | 'archived'; progress: number },
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

  return {
    label: 'On track',
    detail: `${completed} of ${linkedTasks.length} linked actions are complete.`,
  };
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
