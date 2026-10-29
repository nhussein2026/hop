// Display labels and small lookups shared by screens and dialogs.
import { EVIDENCE_VALID_MONTHS } from '@hop/domain'
import type { AccountStatus, AssessmentType, BillingCycle, BookFormat, BookStatus, CefrLevel, CheckArea, CheckJudge, CourseStatus, EvidenceKind, FindKind, FindStatus, IdeaKind, IdeaStage, KeyDateKind, Language, OpportunityActivityType, OpportunityType, PinKind, PotPriority, PracticeArea, PracticeSlot, PracticeTier, ResourceKind, SkillFocus, SkillLevel, SkillType, WalletKind } from './types.ts'

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

/* ---- Skills and evidence ------------------------------------------------------------------- */
/** The self-assessed levels from before levels came from evidence. */
export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = { learning: 'Learning', practicing: 'Practising', confident: 'Confident' }

/** The user's skill layers, suggested for a skill's category. Groups follow this order. */
export const SKILL_LAYERS = ['Foundations', 'Software engineering', 'AI engineering', 'Practices']

export const SKILL_TYPE: Record<SkillType, [string, string]> = {
  tool: ['Tool', `Proof counts for ${EVIDENCE_VALID_MONTHS} months, then needs renewing.`],
  fundamental: ['Fundamental', 'Proof never expires.'],
}

export const SKILL_FOCUS: Record<SkillFocus, [string, string]> = {
  core: ['Core', 'On your current path.'],
  standout: ['Standout', 'Aiming for Top-tier. Keep it to one or two.'],
  keep: ['Keep', 'Kept up, not a priority.'],
  parked: ['Parked', 'Kept, but left out of warnings.'],
}

/** Label, meaning, and what `by` asks for each kind of evidence. Built needs no `by`. */
export const EVIDENCE_KIND: Record<EvidenceKind, { label: string; meaning: string; by: string }> = {
  built: { label: 'Built', meaning: 'Made something real with it, beyond a tutorial. Your own work, so never enough alone for Verified.', by: '' },
  test: { label: 'Test', meaning: 'A graded assessment you don’t control: a course grade, a proctored exam, a ranked contest. Click-through certificates don’t count.', by: 'Who graded it?' },
  review: { label: 'Review', meaning: 'Someone stronger reviewed the work and would sign off on it.', by: 'Who reviewed it?' },
  used: { label: 'Used', meaning: 'Real users or a client relied on it.', by: 'Who used it?' },
  top: { label: 'Top', meaning: 'Compared with the best: teaching it, a merged contribution to a well-known project, a top-10% result.', by: 'Compared with whom?' },
  learned: { label: 'Learned', meaning: 'Studied it: a book, a course, a tutorial. Kept in the skill’s history, never counted as proof.', by: 'From where?' },
}


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
  class: ['school', 'Class', 'info'],
  work: ['career', 'Work', 'primary'],
  uni: ['school', 'İTÜ calendar', ''],
  loan: ['library', 'Library return', 'warning'],
  renewal: ['refresh', 'Renewal', ''],
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
  repo: ['code', 'Repository'], model: ['sparkle', 'Model'], paper: ['book', 'Paper'], tool: ['sliders', 'Tool'], site: ['globe', 'Website'],
  dataset: ['database', 'Dataset'], article: ['file', 'Article'], book: ['library', 'Book'], opportunity: ['career', 'Opportunity'], event: ['calendar', 'Event'],
}

export const FIND_STATUS_LABEL: Record<FindStatus, string> = { inbox: 'Inbox', explore: 'To explore', try: 'To try', read: 'To read', kept: 'Kept', converted: 'Turned into something', dismissed: 'Dismissed' }

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

/* ---- Reading ------------------------------------------------------------------------------ */
export const LANGUAGE_LABEL: Record<Language, string> = { tr: 'Turkish', en: 'English', ar: 'Arabic', other: 'Other' }
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_LABEL) as [Language, string][]

export const BOOK_STATUS_LABEL: Record<BookStatus, string> = { want: 'Want to read', reading: 'Reading', finished: 'Finished', dropped: 'Dropped' }
export const BOOK_FORMAT_LABEL: Record<BookFormat, string> = { paper: 'Paper', ebook: 'E-book', audio: 'Audiobook' }

/* ---- Language track ----------------------------------------------------------------------- */
/** Icon, label and short label for each practice area. */
export const PRACTICE_AREA: Record<PracticeArea, [string, string, string]> = {
  listening: ['headphones', 'Listening', 'Listen'],
  reading: ['book', 'Reading', 'Read'],
  writing: ['edit', 'Writing', 'Write'],
  speaking: ['mic', 'Speaking', 'Speak'],
  words: ['cards', 'Words and grammar', 'Words'],
}

/** Icon and name of each area a skill check measures. */
export const CHECK_AREA: Record<CheckArea, [string, string]> = {
  speaking: ['mic', 'Speaking'],
  writing: ['edit', 'Writing'],
  listening: ['headphones', 'Listening'],
  reading: ['book', 'Reading'],
  words: ['cards', 'Vocabulary'],
  grammar: ['flask', 'Grammar'],
}

export const CHECK_JUDGE: Record<CheckJudge, string> = { self: 'Me', claude: 'Claude', teacher: 'Teacher', tutor: 'Tutor', exam: 'Exam' }

export const PRACTICE_SLOT_LABEL: Record<PracticeSlot, string> = { commute: 'On the way', any: 'Any time', home: 'At home' }
export const PRACTICE_TIER_LABEL: Record<PracticeTier, [string, string]> = {
  minimum: ['Minimum', 'Done every day, even a bad one'],
  standard: ['Standard', 'The normal plan'],
  extended: ['Extended', 'If you have time; never counts against the week'],
}

/** What to do today when a skill falls behind: one small, concrete catch-up. */
export const CATCH_UP: Record<PracticeArea, string> = {
  listening: 'Put a podcast on for the next bus or train ride.',
  reading: 'Read 10 pages of your Turkish book before bed.',
  writing: 'Write 100 words about your day and get them corrected.',
  speaking: 'Do 15 minutes of shadowing, or record a two-minute talk.',
  words: 'Clear today’s Anki reviews.',
}

/** What matters most while working through each level, per the plan. */
export const LEVEL_FOCUS: Record<CefrLevel, { title: string; points: string[] }> = {
  A1: { title: 'Build the base', points: ['The 1,000 most frequent words and the basic suffixes.', 'Content made for learners, slowly and often.', 'Short sentences about yourself, written and spoken every day.'] },
  A2: {
    title: 'Build the base',
    points: [
      'Words first: work through the 2,000 most frequent words in Anki.',
      'Listening and reading made for learners: graded readers, Easy Turkish.',
      'Write 80 to 100 words a day and say them aloud; shadow every day.',
      'No practice tests yet. At the end of A2, try one sample B1 paper to see the gap.',
    ],
  },
  B1: {
    title: 'Move to real Turkish',
    points: [
      'Native content with subtitles: news, podcasts, series.',
      'Read Turkish books from your Reading shelf, computer engineering ones included.',
      'Write 150 to 200 words with opinions and reasons; converse three times a week.',
      'A practice test every four weeks, and move time toward the weakest section.',
    ],
  },
  B2: {
    title: 'Reach exam level',
    points: [
      'Longer, harder texts: opinion pieces, academic articles.',
      'A 250-word essay in 60 minutes every Saturday, as in the exam.',
      'Speak on abstract topics: causes, solutions, pros and cons.',
      'A practice test every two weeks.',
    ],
  },
  C1: {
    title: 'Exam mode',
    points: [
      'A full timed practice test every week.',
      'Most extra time goes to your lowest section; keep the rest ticking over.',
      'Keep Anki and daily listening going until the exam day.',
    ],
  },
  C2: { title: 'Keep it up', points: ['Read and listen widely; write and speak on demanding topics.'] },
}

/* ---- Accounts and subscriptions ----------------------------------------------------------- */
export const ACCOUNT_STATUS: Record<AccountStatus, [string, string]> = { active: ['Active', 'success'], trial: ['Free trial', 'warning'], cancelled: ['Cancelled', ''] }
export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = { monthly: 'a month', yearly: 'a year', weekly: 'a week', none: 'free or paid once' }
export const BILLING_CYCLE_OPTIONS: [BillingCycle, string][] = [['none', 'Free, or paid once'], ['monthly', 'Monthly'], ['yearly', 'Yearly'], ['weekly', 'Weekly']]

/* ---- Finances ---------------------------------------------------------------------------- */
export const WALLET_KIND_LABEL: Record<WalletKind, [string, string]> = { cash: ['Cash', 'wallet'], bank: ['Bank', 'bank'], card: ['Card', 'cards'], app: ['App', 'phone'] }
export const POT_PRIORITY_LABEL: Record<PotPriority, string> = { high: 'Really want', medium: 'Want', low: 'Nice to have' }
