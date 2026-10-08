import type {
  Contact,
  Event,
  Evidence,
  GoalWithDetails,
  Habit,
  HabitCompletion,
  Interaction,
  Milestone,
  OpportunityWithDetails,
  Project,
  Reflection,
  Resume,
  Settings,
  Skill,
  Task,
  WeeklyReview,
} from '@hop/domain'

export type {
  Contact,
  ContactKind,
  Event,
  Evidence,
  GoalArea,
  GoalCriterion,
  GoalPriority,
  GoalStatus,
  GoalWithDetails as Goal,
  Habit,
  HabitCompletion,
  Interaction,
  InteractionType,
  Milestone,
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
  milestones: Milestone[]
  contacts: Contact[]
  interactions: Interaction[]
  resumes: Resume[]
  reflections: Reflection[]
}
