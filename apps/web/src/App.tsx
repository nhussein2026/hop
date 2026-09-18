import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { buildGoalHealth, buildGoalTaskSummary, buildPlanGroups, sortTasksForToday } from './lib/plan.js'
import './App.css'

type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
type TaskPriority = 'low' | 'medium' | 'high'
type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned' | 'archived'
type GoalPriority = 'low' | 'medium' | 'high'
type OpportunityStage = 'saved' | 'interested' | 'preparing' | 'applied' | 'screening' | 'interview' | 'assessment' | 'final' | 'offer' | 'rejected' | 'withdrawn' | 'expired' | 'accepted' | 'declined'
type OpportunityPriority = 'low' | 'medium' | 'high'
type SkillLevel = 'learning' | 'practicing' | 'confident'

type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  scheduledDate: string | null
  goalId: string | null
  estimatedMinutes: number | null
  completedAt: string | null
}

type Goal = {
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

type Opportunity = {
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

type Skill = {
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

type ProjectStatus = 'planned' | 'building' | 'deployed' | 'paused' | 'archived'

type Project = {
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

type Evidence = {
  id: string
  title: string
  description: string | null
  skillId: string | null
  projectId: string | null
  opportunityId: string | null
  goalId: string | null
  url: string | null
  date: string | null
  createdAt: string
  updatedAt: string
}

type WeeklyReview = {
  id: string
  weekStart: string
  wins: string
  progress: string
  career: string
  learning: string
  projects: string
  problems: string
  nextWeek: string
  energy: number | null
  focus: number | null
  createdAt: string
  updatedAt: string
}

type Habit = {
  id: string
  name: string
  frequency: 'daily' | 'weekly'
  targetPerWeek: number
  goalId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

type HabitCompletion = {
  id: string
  habitId: string
  date: string
  completedAt: string
}

type Event = {
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

type AgendaItem = {
  id: string
  title: string
  date: string
  time: string | null
  type: string
  source: 'event' | 'opportunity' | 'review'
}

const navigation = ['Today', 'Plan', 'Goals', 'Career', 'Growth', 'Review']

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
}

function getWeekStart(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  const difference = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + difference)
  return value.toISOString().slice(0, 10)
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [activeView, setActiveView] = useState('Today')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newGoalName, setNewGoalName] = useState('')
  const [newOpportunityTitle, setNewOpportunityTitle] = useState('')
  const [newOpportunityOrganization, setNewOpportunityOrganization] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectBlurb, setNewProjectBlurb] = useState('')
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('')
  const [newEvidenceDescription, setNewEvidenceDescription] = useState('')
  const [newEvidenceSkillId, setNewEvidenceSkillId] = useState('')
  const [newEvidenceProjectId, setNewEvidenceProjectId] = useState('')
  const [reviewDraft, setReviewDraft] = useState({ wins: '', progress: '', career: '', learning: '', projects: '', problems: '', nextWeek: '', energy: '', focus: '' })
  const [newHabitName, setNewHabitName] = useState('')
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [newEventStartTime, setNewEventStartTime] = useState('')
  const [newEventType, setNewEventType] = useState<Event['type']>('other')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false)
  const [isAddingSkill, setIsAddingSkill] = useState(false)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [isAddingEvidence, setIsAddingEvidence] = useState(false)
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [isAddingHabit, setIsAddingHabit] = useState(false)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  const [editingTaskDate, setEditingTaskDate] = useState('')
  const [editingTaskPriority, setEditingTaskPriority] = useState<TaskPriority>('medium')
  const [editingTaskGoalId, setEditingTaskGoalId] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then((response) => {
        if (!response.ok) throw new Error('Could not load tasks')
        return response.json() as Promise<Task[]>
      }),
      fetch('/api/goals').then((response) => {
        if (!response.ok) throw new Error('Could not load goals')
        return response.json() as Promise<Goal[]>
      }),
      fetch('/api/opportunities').then((response) => {
        if (!response.ok) throw new Error('Could not load opportunities')
        return response.json() as Promise<Opportunity[]>
      }),
      fetch('/api/skills').then((response) => {
        if (!response.ok) throw new Error('Could not load skills')
        return response.json() as Promise<Skill[]>
      }),
      fetch('/api/projects').then((response) => {
        if (!response.ok) throw new Error('Could not load projects')
        return response.json() as Promise<Project[]>
      }),
      fetch('/api/evidence').then((response) => {
        if (!response.ok) throw new Error('Could not load evidence')
        return response.json() as Promise<Evidence[]>
      }),
      fetch('/api/reviews/weekly').then((response) => {
        if (!response.ok) throw new Error('Could not load weekly reviews')
        return response.json() as Promise<WeeklyReview[]>
      }),
      fetch('/api/habits').then((response) => {
        if (!response.ok) throw new Error('Could not load habits')
        return response.json() as Promise<Habit[]>
      }),
      fetch(`/api/habits/completions?date=${new Date().toISOString().slice(0, 10)}`).then((response) => {
        if (!response.ok) throw new Error('Could not load habit completions')
        return response.json() as Promise<HabitCompletion[]>
      }),
      fetch('/api/events').then((response) => {
        if (!response.ok) throw new Error('Could not load events')
        return response.json() as Promise<Event[]>
      }),
    ])
      .then(([loadedTasks, loadedGoals, loadedOpportunities, loadedSkills, loadedProjects, loadedEvidence, loadedReviews, loadedHabits, loadedHabitCompletions, loadedEvents]) => {
        setTasks(loadedTasks)
        setGoals(loadedGoals)
        setOpportunities(loadedOpportunities)
        setSkills(loadedSkills)
        setProjects(loadedProjects)
        setEvidence(loadedEvidence)
        setWeeklyReviews(loadedReviews)
        setHabits(loadedHabits)
        setHabitCompletions(loadedHabitCompletions)
        setEvents(loadedEvents)
        const currentReview = loadedReviews.find((review) => review.weekStart === getWeekStart(new Date()))
        if (currentReview) {
          setReviewDraft({
            wins: currentReview.wins,
            progress: currentReview.progress,
            career: currentReview.career,
            learning: currentReview.learning,
            projects: currentReview.projects,
            problems: currentReview.problems,
            nextWeek: currentReview.nextWeek,
            energy: currentReview.energy?.toString() ?? '',
            focus: currentReview.focus?.toString() ?? '',
          })
        }
      })
      .catch(() => setError('The API is unavailable. Start Hop API to sync your tasks, goals, opportunities, skills, projects, evidence, and habits.'))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const openTasks = tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
  const todayTasks = sortTasksForToday(openTasks.filter((task) => task.scheduledDate === today || task.dueDate === today))
  const completedToday = tasks.filter((task) => task.completedAt?.slice(0, 10) === today).length
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const activeOpportunities = opportunities.filter((opportunity) => opportunity.stage !== 'accepted' && opportunity.stage !== 'declined' && opportunity.stage !== 'rejected' && opportunity.stage !== 'expired' && opportunity.stage !== 'withdrawn')
  const goalById = new Map(goals.map((goal) => [goal.id, goal]))
  const goalTaskSummary = buildGoalTaskSummary(openTasks)
  const goalSummaryById = new Map(goalTaskSummary.map((summary) => [summary.goalId, summary]))
  const planGroups = buildPlanGroups(sortTasksForToday(openTasks))
  const defaultGoalId = selectedGoalId || activeGoals[0]?.id || ''
  const opportunityAgendaItems: AgendaItem[] = opportunities.flatMap((opportunity) => {
    const items: AgendaItem[] = []
    if (opportunity.deadline) {
      items.push({ id: `${opportunity.id}-deadline`, title: `${opportunity.title} deadline`, date: opportunity.deadline, time: null, type: 'deadline', source: 'opportunity' })
    }
    if (opportunity.nextEventDate) {
      items.push({ id: `${opportunity.id}-next-event`, title: opportunity.nextEventLabel || `${opportunity.title} next step`, date: opportunity.nextEventDate, time: null, type: 'opportunity', source: 'opportunity' })
    }
    return items
  })
  const agendaItems: AgendaItem[] = [
    ...events.map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.startTime, type: event.type, source: 'event' as const })),
    ...opportunityAgendaItems,
    ...weeklyReviews.map((review) => ({ id: `${review.id}-review`, title: 'Weekly review', date: review.weekStart, time: null, type: 'review', source: 'review' as const })),
  ].sort((left, right) => `${left.date}${left.time ?? ''}`.localeCompare(`${right.date}${right.time ?? ''}`))

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTaskTitle.trim()
    if (!title) return
    setIsAddingTask(true)
    setError('')
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scheduledDate: today,
          goalId: defaultGoalId || undefined,
        }),
      })
      if (!response.ok) throw new Error('Could not create task')
      const task = await response.json() as Task
      setTasks((current) => [task, ...current])
      setNewTaskTitle('')
    } catch {
      setError('Could not save that task. Check that the API is running and try again.')
    } finally {
      setIsAddingTask(false)
    }
  }

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newGoalName.trim()
    if (!name) return
    setIsAddingGoal(true)
    setError('')
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status: 'active', progress: 0, priority: 'medium' }),
      })
      if (!response.ok) throw new Error('Could not create goal')
      const goal = await response.json() as Goal
      setGoals((current) => [goal, ...current])
      setNewGoalName('')
    } catch {
      setError('Could not save that goal. Check that the API is running and try again.')
    } finally {
      setIsAddingGoal(false)
    }
  }

  async function addOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newOpportunityTitle.trim()
    if (!title) return
    setIsAddingOpportunity(true)
    setError('')
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          organization: newOpportunityOrganization.trim() || undefined,
          type: 'job',
          stage: 'saved',
          priority: 'medium',
          source: 'manual',
        }),
      })
      if (!response.ok) throw new Error('Could not create opportunity')
      const opportunity = await response.json() as Opportunity
      setOpportunities((current) => [opportunity, ...current])
      setNewOpportunityTitle('')
      setNewOpportunityOrganization('')
    } catch {
      setError('Could not save that opportunity. Check that the API is running and try again.')
    } finally {
      setIsAddingOpportunity(false)
    }
  }

  async function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newSkillName.trim()
    if (!name) return
    setIsAddingSkill(true)
    setError('')
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: newSkillCategory.trim() || undefined }),
      })
      if (!response.ok) throw new Error('Could not create skill')
      const skill = await response.json() as Skill
      setSkills((current) => [skill, ...current])
      setNewSkillName('')
      setNewSkillCategory('')
    } catch {
      setError('Could not save that skill. Check that the API is running and try again.')
    } finally {
      setIsAddingSkill(false)
    }
  }

  async function updateSkill(skill: Skill, changes: Partial<Pick<Skill, 'level' | 'confidence'>>) {
    try {
      const response = await fetch(`/api/skills/${skill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (!response.ok) throw new Error('Could not update skill')
      const updated = await response.json() as Skill
      setSkills((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setError('Could not update that skill. Try again in a moment.')
    }
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    setIsAddingProject(true)
    setError('')
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, blurb: newProjectBlurb.trim() || undefined }),
      })
      if (!response.ok) throw new Error('Could not create project')
      const project = await response.json() as Project
      setProjects((current) => [project, ...current])
      setNewProjectName('')
      setNewProjectBlurb('')
    } catch {
      setError('Could not save that project. Check that the API is running and try again.')
    } finally {
      setIsAddingProject(false)
    }
  }

  async function updateProject(project: Project, status: ProjectStatus) {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Could not update project')
      const updated = await response.json() as Project
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setError('Could not update that project. Try again in a moment.')
    }
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newEvidenceTitle.trim()
    if (!title) return
    setIsAddingEvidence(true)
    setError('')
    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: newEvidenceDescription.trim() || undefined,
          skillId: newEvidenceSkillId || undefined,
          projectId: newEvidenceProjectId || undefined,
          date: today,
        }),
      })
      if (!response.ok) throw new Error('Could not create evidence')
      const item = await response.json() as Evidence
      setEvidence((current) => [item, ...current])
      setNewEvidenceTitle('')
      setNewEvidenceDescription('')
      setNewEvidenceSkillId('')
      setNewEvidenceProjectId('')
    } catch {
      setError('Could not save that evidence. Check that the API is running and try again.')
    } finally {
      setIsAddingEvidence(false)
    }
  }

  async function saveWeeklyReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingReview(true)
    setError('')
    const weekStart = getWeekStart(new Date())
    const existing = weeklyReviews.find((review) => review.weekStart === weekStart)
    const body = {
      ...reviewDraft,
      weekStart,
      energy: reviewDraft.energy ? Number(reviewDraft.energy) : null,
      focus: reviewDraft.focus ? Number(reviewDraft.focus) : null,
    }
    try {
      const response = await fetch(existing ? `/api/reviews/weekly/${existing.id}` : '/api/reviews/weekly', {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('Could not save weekly review')
      const saved = await response.json() as WeeklyReview
      setWeeklyReviews((current) => existing ? current.map((review) => review.id === saved.id ? saved : review) : [saved, ...current])
    } catch {
      setError('Could not save the weekly review. Check that the API is running and try again.')
    } finally {
      setIsSavingReview(false)
    }
  }

  async function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newHabitName.trim()
    if (!name) return
    setIsAddingHabit(true)
    setError('')
    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('Could not create habit')
      const habit = await response.json() as Habit
      setHabits((current) => [habit, ...current])
      setNewHabitName('')
    } catch {
      setError('Could not save that habit. Check that the API is running and try again.')
    } finally {
      setIsAddingHabit(false)
    }
  }

  async function completeHabit(habit: Habit) {
    const todayCompletion = habitCompletions.find((completion) => completion.habitId === habit.id)
    if (todayCompletion) return
    try {
      const response = await fetch(`/api/habits/${habit.id}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })
      if (!response.ok) throw new Error('Could not complete habit')
      const completion = await response.json() as HabitCompletion
      setHabitCompletions((current) => [...current, completion])
    } catch {
      setError('Could not record that habit. Try again in a moment.')
    }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newEventTitle.trim()
    if (!title || !newEventDate) return
    setIsAddingEvent(true)
    setError('')
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: newEventDate, startTime: newEventStartTime || undefined, type: newEventType }),
      })
      if (!response.ok) throw new Error('Could not create event')
      const created = await response.json() as Event
      setEvents((current) => [...current, created].sort((left, right) => `${left.date}${left.startTime ?? ''}`.localeCompare(`${right.date}${right.startTime ?? ''}`)))
      setNewEventTitle('')
      setNewEventStartTime('')
    } catch {
      setError('Could not save that event. Check that the API is running and try again.')
    } finally {
      setIsAddingEvent(false)
    }
  }

  async function completeTask(task: Pick<Task, 'id'>) {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!response.ok) throw new Error('Could not complete task')
      const updated = await response.json() as Task
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setError('Could not update that task. Try again in a moment.')
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Could not delete task')
      setTasks((current) => current.filter((task) => task.id !== taskId))
      if (editingTaskId === taskId) {
        setEditingTaskId(null)
        setEditingTaskTitle('')
        setEditingTaskDate('')
        setEditingTaskPriority('medium')
      }
    } catch {
      setError('Could not remove that task. Try again in a moment.')
    }
  }

  function beginTaskEdit(task: { id: string; title: string; scheduledDate: string | null; priority: TaskPriority; goalId: string | null }) {
    setEditingTaskId(task.id)
    setEditingTaskTitle(task.title)
    setEditingTaskDate(task.scheduledDate ?? '')
    setEditingTaskPriority(task.priority)
    setEditingTaskGoalId(task.goalId ?? '')
  }

  function cancelTaskEdit() {
    setEditingTaskId(null)
    setEditingTaskTitle('')
    setEditingTaskDate('')
    setEditingTaskPriority('medium')
    setEditingTaskGoalId('')
  }

  async function saveTaskEdit(taskId: string) {
    const title = editingTaskTitle.trim()
    if (!title) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scheduledDate: editingTaskDate || null,
          priority: editingTaskPriority,
          goalId: editingTaskGoalId || null,
        }),
      })
      if (!response.ok) throw new Error('Could not update task')
      const updated = await response.json() as Task
      setTasks((current) => current.map((task) => task.id === updated.id ? updated : task))
      cancelTaskEdit()
    } catch {
      setError('Could not update that task. Try again in a moment.')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>H</span> Hop</div>
        <p className="brand-tagline">Small actions. Real progress.</p>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <button className={activeView === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveView(item)} type="button">
              <span className="nav-dot" aria-hidden="true" />{item}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" aria-hidden="true" /> Private workspace</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">{activeView}</p><h1>{activeView === 'Today' ? 'Make today count.' : activeView === 'Growth' ? 'Make progress visible.' : `${activeView} is coming next.`}</h1></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifications" type="button">○</button><button className="avatar" aria-label="Open profile" type="button">N</button></div>
        </header>

        {activeView === 'Today' ? (
          <>
            <section className="date-strip"><div><p className="date-label">{formatDate(new Date())}</p><p className="muted">A focused day is built one useful action at a time.</p></div><div className="progress-note"><strong>{completedToday}</strong> meaningful actions today</div></section>
            {error && <p className="error-banner" role="alert">{error}</p>}
            <section className="today-grid">
              <div className="primary-column">
                <div className="section-heading"><div><p className="eyebrow">Your focus</p><h2>Today's priorities</h2></div><span className="count-badge">{todayTasks.length || openTasks.length}</span></div>
                <div className="task-list">
                  {(todayTasks.length ? todayTasks : openTasks.slice(0, 3)).map((task, index) => {
                    const linkedGoal = task.goalId ? goalById.get(task.goalId) : undefined
                    const isEditing = editingTaskId === task.id

                    return (
                      <article className={`task-row priority-${task.priority}`} key={task.id}>
                        <button className="check-button" aria-label={`Complete ${task.title}`} onClick={() => completeTask(task)} type="button">{index + 1}</button>
                        {isEditing ? (
                          <div className="task-copy edit-task-copy">
                            <input aria-label={`Edit ${task.title}`} onChange={(event) => setEditingTaskTitle(event.target.value)} value={editingTaskTitle} />
                            <div className="task-edit-meta">
                              <input aria-label={`Reschedule ${task.title}`} onChange={(event) => setEditingTaskDate(event.target.value)} type="date" value={editingTaskDate} />
                              <select aria-label={`Priority for ${task.title}`} onChange={(event) => setEditingTaskPriority(event.target.value as TaskPriority)} value={editingTaskPriority}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                              <select aria-label={`Goal for ${task.title}`} onChange={(event) => setEditingTaskGoalId(event.target.value)} value={editingTaskGoalId}>
                                <option value="">No goal</option>
                                {activeGoals.map((goal) => (
                                  <option key={goal.id} value={goal.id}>{goal.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="task-edit-actions">
                              <button className="text-button small" onClick={() => saveTaskEdit(task.id)} type="button">Save</button>
                              <button className="text-button small" onClick={cancelTaskEdit} type="button">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="task-copy">
                              <strong>{task.title}</strong>
                              <span>{task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'Open task'} · {task.priority} priority{linkedGoal ? ` · ${linkedGoal.name}` : ''}</span>
                            </div>
                            <div className="task-actions">
                              <button className="text-button small" aria-label={`Edit ${task.title}`} onClick={() => beginTaskEdit(task)} type="button">Edit</button>
                              <button className="text-button small" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)} type="button">Delete</button>
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })}
                  {!todayTasks.length && !openTasks.length && <div className="empty-state"><span className="empty-spark">+</span><strong>Nothing is competing for your attention.</strong><span>Add one useful action below to begin.</span></div>}
                </div>
                <form className="quick-add" onSubmit={addTask}>
                  <span className="plus" aria-hidden="true">+</span>
                  <input aria-label="Add a task" onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="Add a task for today..." value={newTaskTitle} />
                  <select aria-label="Select a goal for this task" className="goal-select" onChange={(event) => setSelectedGoalId(event.target.value)} value={defaultGoalId}>
                    <option value="">No goal</option>
                    {activeGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>{goal.name}</option>
                    ))}
                  </select>
                  <button disabled={isAddingTask || !newTaskTitle.trim()} type="submit">{isAddingTask ? 'Adding' : 'Add task'}</button>
                </form>
              </div>
              <aside className="attention-panel"><div className="section-heading"><div><p className="eyebrow">Keep in view</p><h2>Needs attention</h2></div></div><div className="attention-item"><span className="attention-icon amber">!</span><div><strong>{openTasks.length ? `${openTasks.length} open tasks` : 'No overdue work'}</strong><p>{openTasks.length ? 'Choose the next useful action.' : 'You have room to plan deliberately.'}</p></div></div><div className="attention-item"><span className="attention-icon teal">→</span><div><strong>{activeGoals.length ? `${activeGoals.length} active goals` : 'Set a direction'}</strong><p>{activeGoals.length ? 'Keep the long view alive with small actions.' : 'Define the next meaningful goal.'}</p></div></div><div className="pond-note"><span aria-hidden="true">~</span><p>Progress is a direction, not a score.</p></div></aside>
            </section>
            <section className="habit-panel lower-panel">
              <div className="section-heading"><div><p className="eyebrow">Consistency</p><h2>Habits today</h2></div><span className="count-badge">{habitCompletions.length}/{habits.length}</span></div>
              <div className="habit-list">{habits.map((habit) => { const completed = habitCompletions.some((completion) => completion.habitId === habit.id); return <article className="habit-row" key={habit.id}><button className="check-button" aria-label={`${completed ? 'Completed' : 'Complete'} habit: ${habit.name}`} disabled={completed} onClick={() => completeHabit(habit)} type="button">{completed ? '✓' : '○'}</button><div className="task-copy"><strong>{habit.name}</strong><span>{habit.frequency} · {habit.targetPerWeek}x per week</span></div></article> })}</div>
              <form className="quick-add" onSubmit={addHabit}><span className="plus" aria-hidden="true">+</span><input aria-label="Add a habit" onChange={(event) => setNewHabitName(event.target.value)} placeholder="Add a habit..." value={newHabitName} /><button disabled={isAddingHabit || !newHabitName.trim()} type="submit">{isAddingHabit ? 'Adding' : 'Add habit'}</button></form>
            </section>
            <section className="lower-grid"><div className="lower-panel"><p className="eyebrow">A little further out</p><h2>Coming up</h2><p className="muted">Your calendar and opportunities will appear here as you build them.</p></div><div className="lower-panel"><p className="eyebrow">End of day</p><h2>Leave a note</h2><p className="muted">Capture what you accomplished, learned, or want to carry into tomorrow.</p><button className="text-button" type="button">Add reflection <span aria-hidden="true">→</span></button></div></section>
          </>
        ) : activeView === 'Plan' ? (
          <section className="plan-page">
            <div className="section-heading goals-header"><div><p className="eyebrow">Execution</p><h2>Plan</h2></div><span className="count-badge">{agendaItems.length + planGroups.reduce((total, group) => total + group.items.length, 0)}</span></div>
            <div className="agenda-panel lower-panel">
              <div className="section-heading"><div><p className="eyebrow">Calendar</p><h2>Agenda</h2></div><span className="count-badge">{events.length}</span></div>
              <form className="quick-add" onSubmit={addEvent}><span className="plus" aria-hidden="true">+</span><input aria-label="Event title" onChange={(event) => setNewEventTitle(event.target.value)} placeholder="Add an event..." value={newEventTitle} /><input aria-label="Event date" onChange={(event) => setNewEventDate(event.target.value)} type="date" value={newEventDate} /><input aria-label="Event start time" onChange={(event) => setNewEventStartTime(event.target.value)} type="time" value={newEventStartTime} /><select aria-label="Event type" onChange={(event) => setNewEventType(event.target.value as Event['type'])} value={newEventType}><option value="other">Other</option><option value="meeting">Meeting</option><option value="interview">Interview</option><option value="deadline">Deadline</option><option value="review">Review</option><option value="personal">Personal</option></select><button disabled={isAddingEvent || !newEventTitle.trim()} type="submit">{isAddingEvent ? 'Adding' : 'Add event'}</button></form>
              <div className="agenda-list">{agendaItems.length ? agendaItems.map((item) => <article className="agenda-row" key={item.id}><span className="agenda-date">{item.date}</span><div className="task-copy"><strong>{item.title}</strong><span>{item.type}{item.time ? ` · ${item.time}` : ' · All day'} · {item.source}</span></div></article>) : <div className="empty-state"><span className="empty-spark">+</span><strong>No agenda items yet.</strong><span>Add interviews, deadlines, reviews, or personal commitments.</span></div>}</div>
            </div>
            <div className="plan-grid">
              {planGroups.length ? planGroups.map((group) => (
                <div className="plan-group" key={group.date}>
                  <div className="plan-group-header">
                    <h3>{group.date === 'unscheduled' ? 'Unscheduled' : new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</h3>
                    <span>{group.items.length}</span>
                  </div>
                  <div className="plan-list">
                    {group.items.map((task) => {
                      const linkedGoal = task.goalId ? goalById.get(task.goalId) : undefined
                      const isEditing = editingTaskId === task.id

                      return (
                        <article className={`task-row priority-${task.priority}`} key={task.id}>
                          <button className="check-button" aria-label={`Complete ${task.title}`} onClick={() => completeTask(task)} type="button">✓</button>
                          {isEditing ? (
                            <div className="task-copy edit-task-copy">
                              <input aria-label={`Edit ${task.title}`} onChange={(event) => setEditingTaskTitle(event.target.value)} value={editingTaskTitle} />
                              <div className="task-edit-meta">
                                <input aria-label={`Reschedule ${task.title}`} onChange={(event) => setEditingTaskDate(event.target.value)} type="date" value={editingTaskDate} />
                                <select aria-label={`Priority for ${task.title}`} onChange={(event) => setEditingTaskPriority(event.target.value as TaskPriority)} value={editingTaskPriority}>
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                                <select aria-label={`Goal for ${task.title}`} onChange={(event) => setEditingTaskGoalId(event.target.value)} value={editingTaskGoalId}>
                                  <option value="">No goal</option>
                                  {activeGoals.map((goal) => (
                                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="task-edit-actions">
                                <button className="text-button small" onClick={() => saveTaskEdit(task.id)} type="button">Save</button>
                                <button className="text-button small" onClick={cancelTaskEdit} type="button">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="task-copy">
                                <strong>{task.title}</strong>
                                <span>{task.priority} priority · {task.scheduledDate ?? task.dueDate ?? 'No date set'}{linkedGoal ? ` · ${linkedGoal.name}` : ''}</span>
                              </div>
                              <div className="task-actions">
                                <button className="text-button small" aria-label={`Edit ${task.title}`} onClick={() => beginTaskEdit(task)} type="button">Edit</button>
                                <button className="text-button small" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)} type="button">Delete</button>
                              </div>
                            </>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              )) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>Your plan is clear.</strong><span>Schedule or add a task to start shaping the next few days.</span></div>}
            </div>
          </section>
        ) : activeView === 'Goals' ? (
          <section className="goals-page">
            <div className="section-heading goals-header"><div><p className="eyebrow">Direction</p><h2>Goals</h2></div><span className="count-badge">{activeGoals.length}</span></div>
            <form className="goal-form" onSubmit={addGoal}>
              <input aria-label="Goal name" onChange={(event) => setNewGoalName(event.target.value)} placeholder="Add a new goal..." value={newGoalName} />
              <button disabled={isAddingGoal || !newGoalName.trim()} type="submit">{isAddingGoal ? 'Saving' : 'Add goal'}</button>
            </form>
            <div className="goal-grid">
              {goals.length ? goals.map((goal) => {
                const summary = goalSummaryById.get(goal.id)
                const health = buildGoalHealth(goal, openTasks)
                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-card-header">
                      <div>
                        <p className="eyebrow">{goal.priority} priority</p>
                        <h3>{goal.name}</h3>
                      </div>
                      <span className={`status-pill ${goal.status}`}>{goal.status}</span>
                    </div>
                    <p className="goal-why">{goal.why || 'No rationale added yet.'}</p>
                    <div className="goal-meta">
                      <span>{health.label}</span>
                      <span>{summary ? `${summary.nextTask}` : 'Add an action to begin'}</span>
                    </div>
                    <p className="muted">{health.detail}</p>
                    <div className="goal-meta">
                      <span>{summary ? `${summary.taskCount} linked actions` : 'No linked tasks yet'}</span>
                      <span>{goal.progress}% complete</span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }} />
                    </div>
                    <div className="goal-meta">
                      <span>{goal.targetDate || 'No target date'}</span>
                      <span>{goal.status === 'paused' ? 'Momentum paused' : goal.status === 'achieved' ? 'Goal achieved' : 'Active momentum'}</span>
                    </div>
                  </article>
                )
              }) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No goals yet.</strong><span>Start with the outcome you want to reach next.</span></div>}
            </div>
          </section>
        ) : activeView === 'Career' ? (
          <section className="career-page">
            <div className="section-heading goals-header"><div><p className="eyebrow">Career</p><h2>Opportunities</h2></div><span className="count-badge">{activeOpportunities.length}</span></div>
            <form className="goal-form" onSubmit={addOpportunity}>
              <input aria-label="Opportunity title" onChange={(event) => setNewOpportunityTitle(event.target.value)} placeholder="Add a role, internship, or opportunity..." value={newOpportunityTitle} />
              <input aria-label="Organization" onChange={(event) => setNewOpportunityOrganization(event.target.value)} placeholder="Organization" value={newOpportunityOrganization} />
              <button disabled={isAddingOpportunity || !newOpportunityTitle.trim()} type="submit">{isAddingOpportunity ? 'Saving' : 'Add opportunity'}</button>
            </form>
            <div className="goal-grid">
              {opportunities.length ? opportunities.map((opportunity) => (
                <article className="goal-card" key={opportunity.id}>
                  <div className="goal-card-header">
                    <div>
                      <p className="eyebrow">{opportunity.type} · {opportunity.priority}</p>
                      <h3>{opportunity.title}</h3>
                    </div>
                    <span className={`status-pill ${opportunity.stage}`}>{opportunity.stage}</span>
                  </div>
                  <p className="goal-why">{opportunity.organization || 'No organization recorded yet.'}</p>
                  <div className="goal-meta">
                    <span>{opportunity.remote ? 'Remote' : 'On-site'}</span>
                    <span>{opportunity.nextEventDate || 'No next event'}</span>
                  </div>
                </article>
              )) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No opportunities yet.</strong><span>Track the jobs and programs that matter next.</span></div>}
            </div>
          </section>
        ) : activeView === 'Growth' ? (
          <section className="growth-page">
            <div className="section-heading goals-header"><div><p className="eyebrow">Growth</p><h2>Skills & projects</h2></div><span className="count-badge">{skills.length + projects.length}</span></div>
            <p className="muted growth-intro">Keep your development concrete: what you are learning, practicing, and building confidence in.</p>
            <form className="goal-form" onSubmit={addSkill}>
              <input aria-label="Skill name" onChange={(event) => setNewSkillName(event.target.value)} placeholder="Add a skill..." value={newSkillName} />
              <input aria-label="Skill category" onChange={(event) => setNewSkillCategory(event.target.value)} placeholder="Category (optional)" value={newSkillCategory} />
              <button disabled={isAddingSkill || !newSkillName.trim()} type="submit">{isAddingSkill ? 'Saving' : 'Add skill'}</button>
            </form>
            <div className="goal-grid">
              {skills.length ? skills.map((skill) => (
                <article className="goal-card skill-card" key={skill.id}>
                  <div className="goal-card-header">
                    <div><p className="eyebrow">{skill.category || 'Uncategorized'}</p><h3>{skill.name}</h3></div>
                    <select aria-label={`Level for ${skill.name}`} className={`status-pill ${skill.level}`} onChange={(event) => updateSkill(skill, { level: event.target.value as SkillLevel })} value={skill.level}>
                      <option value="learning">learning</option><option value="practicing">practicing</option><option value="confident">confident</option>
                    </select>
                  </div>
                  <div className="skill-confidence"><span>Confidence</span><strong>{skill.confidence ? `${skill.confidence}/10` : 'Not rated'}</strong></div>
                  <input aria-label={`Confidence for ${skill.name}`} max="10" min="1" onChange={(event) => updateSkill(skill, { confidence: Number(event.target.value) })} type="range" value={skill.confidence ?? 5} />
                  <div className="goal-meta"><span>{skill.lastPracticedAt ? `Practiced ${skill.lastPracticedAt}` : 'No practice logged yet'}</span><span>{skill.yearsExperience ? `${skill.yearsExperience} years` : 'New record'}</span></div>
                </article>
              )) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No skills recorded yet.</strong><span>Add a skill you are actively learning or practicing.</span></div>}
            </div>
            <div className="section-heading goals-header growth-subheading"><div><p className="eyebrow">Output</p><h2>Projects</h2></div><span className="count-badge">{projects.length}</span></div>
            <p className="muted growth-intro">Capture finite work that turns learning into something you can show.</p>
            <form className="goal-form" onSubmit={addProject}>
              <input aria-label="Project name" onChange={(event) => setNewProjectName(event.target.value)} placeholder="Add a project..." value={newProjectName} />
              <input aria-label="Project summary" onChange={(event) => setNewProjectBlurb(event.target.value)} placeholder="What will it produce? (optional)" value={newProjectBlurb} />
              <button disabled={isAddingProject || !newProjectName.trim()} type="submit">{isAddingProject ? 'Saving' : 'Add project'}</button>
            </form>
            <div className="goal-grid">
              {projects.length ? projects.map((project) => (
                <article className="goal-card project-card" key={project.id}>
                  <div className="goal-card-header">
                    <div><p className="eyebrow">Finite outcome</p><h3>{project.name}</h3></div>
                    <select aria-label={`Status for ${project.name}`} className={`status-pill ${project.status}`} onChange={(event) => updateProject(project, event.target.value as ProjectStatus)} value={project.status}>
                      <option value="planned">planned</option><option value="building">building</option><option value="deployed">deployed</option><option value="paused">paused</option><option value="archived">archived</option>
                    </select>
                  </div>
                  <p className="goal-why">{project.blurb || 'Add an outcome summary to make this project concrete.'}</p>
                  <div className="goal-meta"><span>{project.stack.length ? project.stack.join(' · ') : 'Stack not recorded'}</span><span>{project.endDate || 'No end date'}</span></div>
                </article>
              )) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No projects recorded yet.</strong><span>Add something you are building or learning through.</span></div>}
            </div>
            <div className="section-heading goals-header growth-subheading"><div><p className="eyebrow">Proof of progress</p><h2>Evidence</h2></div><span className="count-badge">{evidence.length}</span></div>
            <p className="muted growth-intro">Record concrete outcomes so your skills and projects become useful career history.</p>
            <form className="goal-form evidence-form" onSubmit={addEvidence}>
              <input aria-label="Evidence title" onChange={(event) => setNewEvidenceTitle(event.target.value)} placeholder="What did you achieve?" value={newEvidenceTitle} />
              <input aria-label="Evidence description" onChange={(event) => setNewEvidenceDescription(event.target.value)} placeholder="Short description (optional)" value={newEvidenceDescription} />
              <select aria-label="Link evidence to a skill" onChange={(event) => setNewEvidenceSkillId(event.target.value)} value={newEvidenceSkillId}>
                <option value="">No skill link</option>
                {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
              </select>
              <select aria-label="Link evidence to a project" onChange={(event) => setNewEvidenceProjectId(event.target.value)} value={newEvidenceProjectId}>
                <option value="">No project link</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <button disabled={isAddingEvidence || !newEvidenceTitle.trim()} type="submit">{isAddingEvidence ? 'Saving' : 'Add evidence'}</button>
            </form>
            <div className="goal-grid">
              {evidence.length ? evidence.map((item) => {
                const linkedSkill = item.skillId ? skills.find((skill) => skill.id === item.skillId) : undefined
                const linkedProject = item.projectId ? projects.find((project) => project.id === item.projectId) : undefined
                return (
                  <article className="goal-card evidence-card" key={item.id}>
                    <div className="goal-card-header"><div><p className="eyebrow">{item.date || 'Undated proof'}</p><h3>{item.title}</h3></div><span className="status-pill deployed">recorded</span></div>
                    <p className="goal-why">{item.description || 'No description added yet.'}</p>
                    <div className="goal-meta"><span>{linkedSkill?.name || 'No skill link'}</span><span>{linkedProject?.name || 'No project link'}</span></div>
                  </article>
                )
              }) : <div className="empty-state goals-empty"><span className="empty-spark">+</span><strong>No evidence recorded yet.</strong><span>Capture a shipped feature, completed certification, or meaningful result.</span></div>}
            </div>
          </section>
        ) : activeView === 'Review' ? (
          <section className="review-page">
            <div className="section-heading goals-header"><div><p className="eyebrow">Review</p><h2>Weekly review</h2></div><span className="count-badge">{getWeekStart(new Date())}</span></div>
            <p className="muted growth-intro">Take ten minutes to notice what happened, what changed, and what deserves attention next.</p>
            <form className="review-form" onSubmit={saveWeeklyReview}>
              <label>Wins<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, wins: event.target.value }))} placeholder="What went well?" value={reviewDraft.wins} /></label>
              <label>Progress<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, progress: event.target.value }))} placeholder="Which goals moved?" value={reviewDraft.progress} /></label>
              <label>Career<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, career: event.target.value }))} placeholder="Applications, responses, interviews, or offers" value={reviewDraft.career} /></label>
              <label>Learning<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, learning: event.target.value }))} placeholder="What did you practice or learn?" value={reviewDraft.learning} /></label>
              <label>Projects<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, projects: event.target.value }))} placeholder="What shipped or moved forward?" value={reviewDraft.projects} /></label>
              <label>Problems<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, problems: event.target.value }))} placeholder="What blocked you?" value={reviewDraft.problems} /></label>
              <label>Next week<textarea onChange={(event) => setReviewDraft((current) => ({ ...current, nextWeek: event.target.value }))} placeholder="Choose your top three priorities" value={reviewDraft.nextWeek} /></label>
              <div className="review-ratings"><label>Energy<select aria-label="Energy rating" onChange={(event) => setReviewDraft((current) => ({ ...current, energy: event.target.value }))} value={reviewDraft.energy}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select></label><label>Focus<select aria-label="Focus rating" onChange={(event) => setReviewDraft((current) => ({ ...current, focus: event.target.value }))} value={reviewDraft.focus}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select></label></div>
              <button type="submit" disabled={isSavingReview}>{isSavingReview ? 'Saving' : 'Save weekly review'}</button>
            </form>
            {weeklyReviews.length > 1 && <div className="review-history"><p className="eyebrow">History</p><h2>Previous reviews</h2>{weeklyReviews.filter((review) => review.weekStart !== getWeekStart(new Date())).map((review) => <article className="goal-card" key={review.id}><div className="goal-card-header"><h3>{review.weekStart}</h3><span className="status-pill recorded">saved</span></div><p className="goal-why">{review.nextWeek || review.wins || 'No summary added.'}</p></article>)}</div>}
          </section>
        ) : (
          <section className="coming-soon"><span className="coming-number">0{navigation.indexOf(activeView) + 1}</span><h2>This part of Hop is ready to take shape.</h2><p className="muted">Today is the foundation: a calm place to see what matters and take the next step.</p><button className="text-button" onClick={() => setActiveView('Today')} type="button">Back to Today <span aria-hidden="true">→</span></button></section>
        )}
      </main>
    </div>
  )
}

export default App
