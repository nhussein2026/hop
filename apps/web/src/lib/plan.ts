export type PlanTask = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  scheduledDate: string | null;
  dueDate: string | null;
  goalId: string | null;
};

export type PlanGroup = {
  date: string;
  items: PlanTask[];
};

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
