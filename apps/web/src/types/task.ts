export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
	id: string
	title: string
	description: string | null
	status: TaskStatus
	priority: TaskPriority
	dueDate: string | null
	scheduledDate: string | null
	goalId: string | null
	estimatedMinutes: number | null
	completedAt: string | null
}
