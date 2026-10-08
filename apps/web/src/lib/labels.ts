// Display labels and small lookups shared by screens and dialogs.
import type { OpportunityActivityType, OpportunityType, SkillLevel } from './types.ts'

export const OPPORTUNITY_TYPES: [OpportunityType, string][] = [
  ['job', 'Job'], ['internship', 'Internship'], ['program', 'Program'], ['scholarship', 'Scholarship'], ['fellowship', 'Fellowship'],
  ['hackathon', 'Hackathon'], ['conference', 'Conference'], ['open-source program', 'Open-source program'], ['other', 'Other'],
]

export const ACTIVITY_TYPES: Record<OpportunityActivityType, [string, string]> = {
  note_added: ['edit', 'Note'],
  email_received: ['mail', 'They replied'],
  follow_up_sent: ['reply', 'Follow-up sent'],
  call: ['phone', 'Call'],
  interview: ['video', 'Interview'],
  interview_scheduled: ['calendar', 'Interview scheduled'],
  assessment_received: ['file', 'Assessment received'],
  application_submitted: ['arrowRight', 'Applied'],
  stage_changed: ['refresh', 'Stage changed'],
  rejection_received: ['x', 'Rejection'],
  offer_received: ['award', 'Offer'],
  created: ['plus', 'Saved'],
}

export const interactionIcon = (type: string) => (type === 'email' ? 'mail' : type === 'call' ? 'phone' : type === 'meeting' ? 'users' : 'message')
export const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

export const LEVELS: [SkillLevel, string][] = [['learning', 'Learning'], ['practicing', 'Practising'], ['confident', 'Confident']]
export const levelIndex = (level: SkillLevel) => LEVELS.findIndex(([value]) => value === level)


/** A file size for people: 340 KB, 2.4 MB. */
export const sizeLabel = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export { RESUME_FILE_MAX_BYTES as RESUME_MAX_BYTES } from '@hop/domain'
export const RESUME_FILE_LABEL: Record<string, string> = { 'application/pdf': 'PDF', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word' }

/** Icon, label and tone for each kind of agenda entry. */
export const AGENDA_META: Record<string, [string, string, string]> = {
  interview: ['video', 'Interview', 'info'],
  deadline: ['flag', 'Deadline', 'warning'],
  assessment: ['file', 'Assessment', 'info'],
  review: ['review', 'Review', 'primary'],
  milestone: ['award', 'Milestone', 'success'],
  event: ['calendar', 'Event', ''],
}
