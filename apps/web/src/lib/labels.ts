// Display labels and small lookups shared by screens and dialogs.
import type { AssessmentType, CourseStatus, FindKind, FindStatus, IdeaKind, IdeaStage, KeyDateKind, OpportunityActivityType, OpportunityType, PinKind, ResourceKind, SkillLevel } from './types.ts'

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
  exam: ['file', 'Exam', 'warning'],
  coursework: ['school', 'Coursework', 'primary'],
  uni: ['school', 'İTÜ calendar', ''],
}

/* ---- İTÜ and Radar ---------------------------------------------------------------------- */
export const COURSE_STATUS: Record<CourseStatus, [string, string]> = { taking: ['This term', 'primary'], planned: ['Next term', 'info'], interested: ['Interested', ''], completed: ['Completed', 'success'] }

export const ASSESSMENT_TYPES: [AssessmentType, string][] = [['homework', 'Homework'], ['quiz', 'Quiz'], ['midterm', 'Midterm'], ['final', 'Final exam'], ['project', 'Project'], ['presentation', 'Presentation'], ['lab', 'Lab']]
export const ASSESSMENT_LABEL = Object.fromEntries(ASSESSMENT_TYPES) as Record<AssessmentType, string>

/** Icon and label for each kind of library item. */
export const RESOURCE_KINDS: Record<ResourceKind, [string, string]> = {
  note: ['edit', 'Note'], slides: ['file', 'Slides'], 'past-exam': ['flag', 'Past exam'], paper: ['book', 'Paper'], book: ['library', 'Book'],
  video: ['video', 'Video'], link: ['link', 'Link'], repo: ['code', 'Repository'], file: ['folder', 'File'],
}

/** Icon and label for each kind of Radar find. */
export const FIND_KINDS: Record<FindKind, [string, string]> = {
  repo: ['code', 'Repository'], model: ['sparkle', 'Model'], paper: ['book', 'Paper'], tool: ['sliders', 'Tool'],
  dataset: ['database', 'Dataset'], article: ['file', 'Article'], opportunity: ['career', 'Opportunity'], event: ['calendar', 'Event'],
}

export const FIND_STATUS_LABEL: Record<FindStatus, string> = { inbox: 'Inbox', try: 'To try', read: 'To read', kept: 'Kept', converted: 'Turned into something', dismissed: 'Dismissed' }

export const IDEA_KINDS: [IdeaKind, string][] = [['thesis', 'Thesis'], ['paper', 'Paper'], ['project', 'Project']]
export const IDEA_STAGES: IdeaStage[] = ['spark', 'exploring', 'validated', 'proposed', 'active']
export const IDEA_STAGE_LABEL: Record<IdeaStage, string> = { spark: 'Spark', exploring: 'Exploring', validated: 'Validated', proposed: 'Proposed', active: 'Active', parked: 'Parked' }
export const IDEA_STAGE_HINT: Record<IdeaStage, string> = {
  spark: 'A raw idea worth writing down.',
  exploring: 'Reading around it and talking to people.',
  validated: 'The question is clear and doable.',
  proposed: 'Shared with an advisor or written as a proposal.',
  active: 'Being worked on, usually as a project.',
  parked: 'Parked. It keeps its links; pick a stage to bring it back.',
}

export const THESIS_STEPS: [string, string][] = [['topic', 'Topic'], ['advisor', 'Advisor'], ['proposal', 'Proposal'], ['research', 'Research'], ['defense', 'Defense']]

export const KEY_DATE_KINDS: [KeyDateKind, string, string][] = [['deadline', 'Deadline', 'flag'], ['exam', 'Exams', 'file'], ['holiday', 'Holiday', 'sun'], ['term', 'Term', 'calendar']]
export const PIN_KINDS: [PinKind, string, string][] = [['rule', 'Rule', 'shield'], ['office', 'Office', 'users'], ['tip', 'Tip', 'bulb']]

export { RESOURCE_FILE_MAX_BYTES } from '@hop/domain'
export const RESOURCE_FILE_ACCEPT = ['.pdf', '.pptx', '.docx', '.zip', '.ipynb', '.png', '.jpg', '.jpeg']
