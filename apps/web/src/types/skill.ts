export type SkillLevel = 'learning' | 'practicing' | 'confident'

export type Skill = {
  id: string
  name: string
  category: string | null
  level: SkillLevel
  confidence: number | null
  lastPracticedAt: string | null
  yearsExperience: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}