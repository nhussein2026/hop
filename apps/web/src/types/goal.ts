export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned' | 'archived'
export type GoalPriority = 'low' | 'medium' | 'high'

export type Goal = {
  id: string
  name: string
  why: string | null
  areaId: string | null
  status: GoalStatus
  priority: GoalPriority
  startDate: string | null
  targetDate: string | null
  successCriteria: string | null
  progress: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}