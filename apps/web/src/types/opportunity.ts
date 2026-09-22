export type OpportunityStage = 'saved' | 'interested' | 'preparing' | 'applied' | 'screening' | 'interview' | 'assessment' | 'final' | 'offer' | 'rejected' | 'withdrawn' | 'expired' | 'accepted' | 'declined'
export type OpportunityPriority = 'low' | 'medium' | 'high'

export type Opportunity = {
  id: string
  title: string
  organization: string | null
  url: string | null
  type: string
  stage: OpportunityStage
  priority: OpportunityPriority
  location: string | null
  remote: boolean
  source: string | null
  openDate: string | null
  deadline: string | null
  appliedDate: string | null
  decisionDate: string | null
  nextEventDate: string | null
  nextEventLabel: string | null
  compensation: string | null
  technologyTags: string[]
  resumeId: string | null
  coverLetterId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
}