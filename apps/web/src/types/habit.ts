export type Habit = {
  id: string
  name: string
  frequency: 'daily' | 'weekly'
  targetPerWeek: number
  goalId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type HabitCompletion = {
  id: string
  habitId: string
  date: string
  completedAt: string
}