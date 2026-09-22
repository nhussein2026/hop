export type ProjectStatus = 'planned' | 'building' | 'deployed' | 'paused' | 'archived'

export type Project = {
  id: string
  name: string
  problem: string | null
  blurb: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  stack: string[]
  repositoryUrl: string | null
  demoUrl: string | null
  learned: string | null
  challenges: string | null
  architectureNotes: string | null
  goalIds: string[]
  skillIds: string[]
  createdAt: string
  updatedAt: string
}