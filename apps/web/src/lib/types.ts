import type {
  Contact,
  CourseWithDetails,
  Event,
  Evidence,
  Find,
  GoalWithDetails,
  Habit,
  HabitCompletion,
  Idea,
  Interaction,
  KeyDate,
  Milestone,
  MonthlyReview,
  OpportunityWithDetails,
  Pin,
  Project,
  Reflection,
  Resource,
  Resume,
  Settings,
  Skill,
  Task,
  Term,
  UniLink,
  WeeklyReview,
} from '@hop/domain'

export type {
  Assessment,
  AssessmentType,
  ClassSlot,
  CourseStatus,
  CourseWithDetails as Course,
  Find,
  FindKind,
  FindStatus,
  Idea,
  IdeaKind,
  IdeaStage,
  KeyDate,
  KeyDateKind,
  LetterGrade,
  Pin,
  PinKind,
  Playbook,
  Program,
  Resource,
  ResourceKind,
  Term,
  UniLink,
  Contact,
  ContactKind,
  Event,
  Evidence,
  GoalArea,
  GoalCriterion,
  GoalStatus,
  GoalWithDetails as Goal,
  Habit,
  HabitCompletion,
  Interaction,
  Milestone,
  MonthFacts,
  MonthlyReview,
  OpportunityActivity,
  OpportunityActivityType,
  OpportunityStage,
  OpportunityType,
  OpportunityWithDetails as Opportunity,
  Project,
  ProjectStatus,
  Reflection,
  Resume,
  Settings,
  Skill,
  SkillLevel,
  Task,
  TaskPriority,
  WeekFacts,
  WeeklyReview,
  WorkMode,
} from '@hop/domain'

/** Everything Hop shows, loaded once and kept current as changes are saved. */
export type HopData = {
  settings: Settings
  goals: GoalWithDetails[]
  tasks: Task[]
  habits: Habit[]
  completions: HabitCompletion[]
  events: Event[]
  opportunities: OpportunityWithDetails[]
  projects: Project[]
  skills: Skill[]
  evidence: Evidence[]
  weeklyReviews: WeeklyReview[]
  monthlyReviews: MonthlyReview[]
  milestones: Milestone[]
  contacts: Contact[]
  interactions: Interaction[]
  resumes: Resume[]
  reflections: Reflection[]
  terms: Term[]
  courses: CourseWithDetails[]
  keyDates: KeyDate[]
  pins: Pin[]
  uniLinks: UniLink[]
  resources: Resource[]
  ideas: Idea[]
  finds: Find[]
}
