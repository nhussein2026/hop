export type Event = {
  id: string
  title: string
  description: string | null
  type: 'meeting' | 'interview' | 'deadline' | 'review' | 'personal' | 'other'
  date: string
  startTime: string | null
  endTime: string | null
  goalId: string | null
  projectId: string | null
  opportunityId: string | null
  createdAt: string
  updatedAt: string
}