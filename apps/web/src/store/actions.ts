// Every change Hop can make, in one place. Cheap actions happen immediately with Undo;
// consequential ones are confirmed by the screen before they get here.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import { STAGE_LABEL, isOverdue } from '../lib/rules.ts'
import type {
  Contact, Event, Evidence, Goal, GoalArea, GoalCriterion, GoalStatus, Habit, HabitCompletion, HopData, Interaction, Milestone,
  Opportunity, OpportunityActivity, OpportunityActivityType, OpportunityStage, Project, ProjectStatus, Reflection, Resume, Settings,
  MonthFacts, MonthlyReview, Skill, SkillLevel, Task, TaskPriority, WeekFacts, WeeklyReview,
} from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

export type TaskFields = {
  title: string
  scheduledDate?: string | null
  dueDate?: string | null
  priority?: TaskPriority
  goalId?: string | null
  opportunityId?: string | null
  projectId?: string | null
  courseId?: string | null
  assessmentId?: string | null
  estimatedMinutes?: number | null
  description?: string | null
}

/** The create endpoint takes optional fields, not nulls. */
function createBody(fields: object) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

const applyItem = <K extends Exclude<keyof HopData, 'settings'>>(key: K) => (item: HopData[K][number], data: HopData) => upsert(data, key, item)

export function useActions() {
  const { commit, update, data } = useHop()

  return useMemo(() => {
    const tasks = {
      add(fields: TaskFields, label = 'Task added') {
        return commit(label, () => api.post<Task>('/api/tasks', createBody(fields)), applyItem('tasks'))
      },
      update(task: Task, changes: Partial<Task>, label = 'Task saved', undo = false) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, task[key as keyof Task]])) as Partial<Task>
        return commit(label, () => api.patch<Task>(`/api/tasks/${task.id}`, changes), applyItem('tasks'), {
          undo: undo ? () => void commit('Undone', () => api.patch<Task>(`/api/tasks/${task.id}`, before), applyItem('tasks')) : undefined,
        })
      },
      toggle(task: Task) {
        const completing = task.status !== 'completed'
        return commit(completing ? 'Task completed' : 'Marked as not done', () => api.patch<Task>(`/api/tasks/${task.id}`, { status: completing ? 'completed' : 'todo' }), (saved, current) => {
          const next = upsert(current, 'tasks', saved)
          // Finishing a task counts as recent activity on its goal.
          return completing && saved.goalId ? { ...next, goals: next.goals.map((goal) => goal.id === saved.goalId ? { ...goal, updatedAt: saved.updatedAt } : goal) } : next
        }, {
          undo: completing ? () => void commit('Undone', () => api.patch<Task>(`/api/tasks/${task.id}`, { status: task.status }), applyItem('tasks')) : undefined,
        })
      },
      moveTo(task: Task, date: string, label: string) {
        return tasks.update(task, { scheduledDate: date }, label, true)
      },
      /** Delete with Undo instead of a confirmation: a task is cheap to recreate. */
      remove(task: Task) {
        return commit('Task deleted', () => api.delete(`/api/tasks/${task.id}`), (_, current) => without(current, 'tasks', task.id), {
          undo: () => void commit('Undone', async () => {
            const { title, description, priority, areaId, goalId, projectId, opportunityId, courseId, assessmentId, scheduledDate, dueDate, estimatedMinutes } = task
            const restored = await api.post<Task>('/api/tasks', createBody({ title, description, priority, areaId, goalId, projectId, opportunityId, courseId, assessmentId, scheduledDate, dueDate, estimatedMinutes }))
            return task.status !== 'todo' ? api.patch<Task>(`/api/tasks/${restored.id}`, { status: task.status }) : restored
          }, applyItem('tasks')),
        })
      },
    }

    const habits = {
      toggle(habit: Habit) {
        const today = D.today()
        const done = data.completions.some((c) => c.habitId === habit.id && c.date === today)
        if (done) {
          return commit('Habit unchecked for today', () => api.delete(`/api/habits/${habit.id}/completions/${today}`), (_, current) => ({
            ...current, completions: current.completions.filter((c) => !(c.habitId === habit.id && c.date === today)),
          }), { quiet: true })
        }
        return commit('Habit done for today', () => api.post<HabitCompletion>(`/api/habits/${habit.id}/completions`, { date: today }), (completion, current) => ({
          ...current, completions: [...current.completions.filter((c) => c.id !== completion.id), completion],
        }))
      },
      save(habit: Habit | null, fields: { name: string; days: number[]; minutes: number; goalId: string | null }) {
        if (habit) return commit('Habit saved', () => api.patch<Habit>(`/api/habits/${habit.id}`, fields), applyItem('habits'))
        return commit('Habit added', () => api.post<Habit>('/api/habits', createBody(fields)), applyItem('habits'))
      },
      setActive(habit: Habit, active: boolean, undo = true) {
        return commit(active ? 'Habit resumed' : 'Habit paused. Its history is kept.', () => api.patch<Habit>(`/api/habits/${habit.id}`, { active }), applyItem('habits'), {
          undo: undo ? () => void habits.setActive(habit, !active, false) : undefined,
        })
      },
    }

    const goals = {
      create(fields: { name: string; why: string; targetDate: string; area: GoalArea; criteria: string[]; priority?: Goal['priority']; startDate?: string }) {
        return commit('Goal created', () => api.post<Goal>('/api/goals', { ...createBody(fields), criteria: fields.criteria, startDate: fields.startDate ?? D.today() }), applyItem('goals'))
      },
      update(goal: Goal, changes: { name?: string; why?: string | null; targetDate?: string | null; area?: GoalArea | null }) {
        return commit('Goal saved', () => api.patch<Goal>(`/api/goals/${goal.id}`, changes), applyItem('goals'))
      },
      setStatus(goal: Goal, status: GoalStatus, label: string) {
        return commit(label, () => api.patch<Goal>(`/api/goals/${goal.id}`, { status }), applyItem('goals'), {
          undo: () => void commit('Undone', () => api.patch<Goal>(`/api/goals/${goal.id}`, { status: goal.status }), applyItem('goals')),
        })
      },
      toggleCriterion(goal: Goal, criterion: GoalCriterion) {
        const met = goal.criteria.filter((c) => (c.id === criterion.id ? !c.done : c.done)).length
        const pct = goal.criteria.length ? Math.round((met / goal.criteria.length) * 100) : 0
        const set = (done: boolean) => () => api.patch<Goal>(`/api/goals/${goal.id}/criteria/${criterion.id}`, { done })
        return commit(`${criterion.done ? 'Criterion reopened' : 'Criterion met'}. Goal at ${pct}%.`, set(!criterion.done), applyItem('goals'), {
          undo: () => void commit('Undone', set(criterion.done), applyItem('goals')),
        })
      },
      addCriterion(goal: Goal, text: string) {
        return commit('Criterion added', () => api.post<Goal>(`/api/goals/${goal.id}/criteria`, { text }), applyItem('goals'))
      },
    }

    const milestones = {
      add(fields: { title: string; date: string; goalId?: string | null }) {
        return commit('Milestone added', () => api.post<Milestone>('/api/milestones', createBody(fields)), applyItem('milestones'))
      },
      reach(milestone: Milestone) {
        return commit('Milestone reached', () => api.patch<Milestone>(`/api/milestones/${milestone.id}`, { done: true }), applyItem('milestones'), {
          undo: () => void commit('Undone', () => api.patch<Milestone>(`/api/milestones/${milestone.id}`, { done: false, date: milestone.date }), applyItem('milestones')),
        })
      },
    }

    const opportunity = (o: Opportunity) => `/api/opportunities/${o.id}`
    const opportunities = {
      save(o: Opportunity | null, fields: Partial<Opportunity>) {
        if (o) return commit('Opportunity saved', () => api.patch<Opportunity>(opportunity(o), fields), applyItem('opportunities'))
        return commit('Opportunity saved', () => api.post<Opportunity>('/api/opportunities', createBody(fields)), applyItem('opportunities'))
      },
      update(o: Opportunity, fields: Partial<Opportunity>, label: string, quiet = false) {
        return commit(label, () => api.patch<Opportunity>(opportunity(o), fields), applyItem('opportunities'), { quiet })
      },
      moveStage(o: Opportunity, stage: OpportunityStage) {
        const back = STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(o.stage)
        return commit(`${back ? 'Moved back' : 'Moved'} to ${STAGE_LABEL[stage]}`, () => api.patch<Opportunity>(opportunity(o), { stage }), applyItem('opportunities'), {
          undo: () => void commit('Undone', async () => {
            const moved = await api.patch<Opportunity>(opportunity(o), { stage: o.stage, appliedDate: o.appliedDate })
            // Undo leaves no trace: remove both timeline entries the move and its reversal created.
            const added = moved.activities.filter((activity) => !o.activities.some((existing) => existing.id === activity.id))
            let result = moved
            for (const activity of added) result = await api.delete<Opportunity>(`${opportunity(o)}/activities/${activity.id}`)
            return result
          }, applyItem('opportunities')),
        })
      },
      close(o: Opportunity, outcome: OpportunityStage, note: string) {
        return commit(`Closed as ${STAGE_LABEL[outcome].toLowerCase()}`, () => api.post<Opportunity>(`${opportunity(o)}/close`, { outcome, note: note || undefined }), applyItem('opportunities'), {
          undo: () => void commit('Undone', () => api.post<Opportunity>(`${opportunity(o)}/reopen`), applyItem('opportunities')),
        })
      },
      reopen(o: Opportunity) {
        return commit('Reopened', () => api.post<Opportunity>(`${opportunity(o)}/reopen`), applyItem('opportunities'), {
          undo: () => void commit('Undone', () => api.post<Opportunity>(`${opportunity(o)}/close`, { outcome: o.stage }), applyItem('opportunities')),
        })
      },
      logActivity(o: Opportunity, type: OpportunityActivityType, text: string, date: string) {
        return commit('Activity logged', () => api.post<Opportunity>(`${opportunity(o)}/activities`, { type, text, date }), applyItem('opportunities'))
      },
      /** Sending a follow-up clears the follow-up rule and completes overdue follow-up tasks. */
      logFollowUp(o: Opportunity, followUpDays: number) {
        const today = D.today()
        const followUpTasks = data.tasks.filter((t) => t.opportunityId === o.id && isOverdue(t, today) && /follow/i.test(t.title))
        let activity: OpportunityActivity | undefined
        return commit(`Follow-up logged. The next reminder is in ${followUpDays} days.`, async () => {
          const saved = await api.post<Opportunity>(`${opportunity(o)}/activities`, { type: 'follow_up_sent', text: 'Sent a follow-up' })
          activity = saved.activities.find((entry) => !o.activities.some((existing) => existing.id === entry.id))
          const completed = await Promise.all(followUpTasks.map((t) => api.patch<Task>(`/api/tasks/${t.id}`, { status: 'completed' })))
          return { saved, completed }
        }, ({ saved, completed }, current) => completed.reduce((next, t) => upsert(next, 'tasks', t), upsert(current, 'opportunities', saved)), {
          undo: () => void commit('Undone', async () => {
            const saved = activity ? await api.delete<Opportunity>(`${opportunity(o)}/activities/${activity.id}`) : o
            const reopened = await Promise.all(followUpTasks.map((t) => api.patch<Task>(`/api/tasks/${t.id}`, { status: t.status })))
            return { saved, reopened }
          }, ({ saved, reopened }, current) => reopened.reduce((next, t) => upsert(next, 'tasks', t), upsert(current, 'opportunities', saved))),
        })
      },
      addPrep(o: Opportunity, text: string) {
        return commit('Preparation item added', () => api.post<Opportunity>(`${opportunity(o)}/prep`, { text }), applyItem('opportunities'))
      },
      togglePrep(o: Opportunity, itemId: string, done: boolean) {
        return commit('Preparation updated', () => api.patch<Opportunity>(`${opportunity(o)}/prep/${itemId}`, { done }), applyItem('opportunities'), { quiet: true })
      },
    }

    const career = {
      addContact(fields: Partial<Contact> & { name: string }) {
        return commit('Person added', () => api.post<Contact>('/api/contacts', createBody(fields)), applyItem('contacts'))
      },
      logInteraction(contact: Contact, fields: { type: Interaction['type']; date: string; summary: string }) {
        return commit('Interaction logged', () => api.post<Interaction>(`/api/contacts/${contact.id}/interactions`, fields), applyItem('interactions'))
      },
      addResume(fields: { name: string; focus: string }, quiet = false) {
        return commit('Resume added', () => api.post<Resume>('/api/resumes', createBody(fields)), applyItem('resumes'), { quiet })
      },
      updateResume(resume: Resume, changes: { name?: string; focus?: string | null }, quiet = false) {
        return commit('Resume version saved', () => api.patch<Resume>(`/api/resumes/${resume.id}`, changes), applyItem('resumes'), { quiet })
      },
      attachResumeFile(resume: Resume, file: File) {
        return commit(resume.file ? `File replaced on v${resume.version}` : `File attached to v${resume.version}`, () => api.upload<Resume>(`/api/resumes/${resume.id}/file`, file), applyItem('resumes'))
      },
      removeResumeFile(resume: Resume) {
        return commit(`File removed from v${resume.version}`, () => api.delete<Resume>(`/api/resumes/${resume.id}/file`), applyItem('resumes'))
      },
      setResumeArchived(resume: Resume, archived: boolean) {
        return commit(archived ? `v${resume.version} archived` : `v${resume.version} restored`, () => api.patch<Resume>(`/api/resumes/${resume.id}`, { archived }), applyItem('resumes'))
      },
    }

    const growth = {
      addSkill(fields: { name: string; category: string; level: SkillLevel }) {
        return commit('Skill added', () => api.post<Skill>('/api/skills', { ...fields, confidence: 3, lastPracticedAt: D.today() }), applyItem('skills'))
      },
      updateSkill(skill: Skill, changes: Partial<Skill>, label: string, quiet = false) {
        return commit(label, () => api.patch<Skill>(`/api/skills/${skill.id}`, changes), applyItem('skills'), { quiet })
      },
      addProject(fields: { name: string; problem: string; stack: string[] }) {
        return commit('Project added', () => api.post<Project>('/api/projects', { ...createBody(fields), stack: fields.stack, blurb: fields.problem.slice(0, 120) || undefined, startDate: D.today() }), applyItem('projects'))
      },
      setProjectStatus(project: Project, status: ProjectStatus) {
        return commit('Project status updated', () => api.patch<Project>(`/api/projects/${project.id}`, { status }), applyItem('projects'))
      },
      addEvidence(fields: { title: string; date: string; skillIds: string[]; projectId: string | null; goalId: string | null; url: string }) {
        return commit('Evidence added', () => api.post<Evidence>('/api/evidence', { ...createBody(fields), skillIds: fields.skillIds }), applyItem('evidence'))
      },
    }

    const plan = {
      /** An interview linked to an opportunity also becomes its next step and a timeline entry. */
      addEvent(fields: { title: string; date: string; startTime: string; type: Event['type']; opportunityId: string | null }) {
        return commit('Event added', async () => {
          const event = await api.post<Event>('/api/events', createBody(fields))
          const o = fields.opportunityId ? data.opportunities.find((x) => x.id === fields.opportunityId) : undefined
          if (!o || fields.type !== 'interview') return { event, o: undefined }
          await api.patch(opportunity(o), { nextEventDate: fields.date, nextEventTime: fields.startTime || null, nextEventLabel: 'Interview' })
          const saved = await api.post<Opportunity>(`${opportunity(o)}/activities`, { type: 'interview_scheduled', text: `Interview scheduled for ${D.withDay(fields.date)}${fields.startTime ? ` at ${fields.startTime}` : ''}` })
          return { event, o: saved }
        }, ({ event, o }, current) => {
          const next = upsert(current, 'events', event)
          return o ? upsert(next, 'opportunities', o) : next
        })
      },
    }

    const review = {
      saveReflection(date: string, values: Omit<Reflection, 'id' | 'date' | 'createdAt' | 'updatedAt'>, asTask: boolean) {
        return commit('Reflection saved', async () => {
          const saved = await api.post<Reflection>('/api/reflections', { date, ...values })
          const task = asTask && values.tomorrow ? await api.post<Task>('/api/tasks', { title: values.tomorrow, scheduledDate: D.addDays(date, 1), description: 'From your reflection' }) : undefined
          return { saved, task }
        }, ({ saved, task }, current) => {
          const next = upsert(current, 'reflections', saved)
          return task ? upsert(next, 'tasks', task) : next
        })
      },
      saveWeekly(existing: WeeklyReview | undefined, weekStart: string, values: { wins: string; problems: string; change: string; topThree: string[] }, complete: boolean, facts: WeekFacts, asTasks: boolean) {
        const body = { ...values, status: complete ? 'completed' : 'draft', facts }
        return commit(complete ? 'Weekly review complete. Next week is planned.' : 'Draft saved', async () => {
          const saved = existing ? await api.patch<WeeklyReview>(`/api/reviews/weekly/${existing.id}`, body) : await api.post<WeeklyReview>('/api/reviews/weekly', { weekStart, ...body })
          const created = complete && asTasks
            ? await Promise.all(values.topThree.filter(Boolean).map((title) => api.post<Task>('/api/tasks', { title, priority: 'high', scheduledDate: D.addDays(weekStart, 7), description: 'From your weekly review' })))
            : []
          return { saved, created }
        }, ({ saved, created }, current) => created.reduce((next, task) => upsert(next, 'tasks', task), upsert(current, 'weeklyReviews', saved)))
      },
      reopenWeekly(existing: WeeklyReview) {
        return commit('Review reopened for editing', () => api.patch<WeeklyReview>(`/api/reviews/weekly/${existing.id}`, { status: 'draft' }), applyItem('weeklyReviews'), { quiet: true })
      },
      saveMonthly(existing: MonthlyReview | undefined, monthStart: string, values: { highlights: string; keep: string; stop: string; change: string; focus: string[] }, complete: boolean, facts: MonthFacts) {
        const body = { ...values, status: complete ? 'completed' : 'draft', facts }
        return commit(complete ? 'Monthly review complete. Next month has a focus.' : 'Draft saved', () => existing
          ? api.patch<MonthlyReview>(`/api/reviews/monthly/${existing.id}`, body)
          : api.post<MonthlyReview>('/api/reviews/monthly', { monthStart, ...body }), applyItem('monthlyReviews'))
      },
      reopenMonthly(existing: MonthlyReview) {
        return commit('Review reopened for editing', () => api.patch<MonthlyReview>(`/api/reviews/monthly/${existing.id}`, { status: 'draft' }), applyItem('monthlyReviews'), { quiet: true })
      },
    }

    const settings = {
      update(changes: Partial<Settings>, label: string, quiet = false) {
        return commit(label, () => api.patch<Settings>('/api/settings', changes), (saved, current) => ({ ...current, settings: saved }), { quiet })
      },
      /** Seen notifications are remembered quietly; failing to save them is not worth an error. */
      markRead(keys: string[]) {
        const read = [...new Set([...data.settings.readNotifications, ...keys])].slice(-200)
        update((current) => ({ ...current, settings: { ...current.settings, readNotifications: read } }))
        void api.patch<Settings>('/api/settings', { readNotifications: read }).catch(() => undefined)
      },
    }

    return { tasks, habits, goals, milestones, opportunities, career, growth, plan, review, settings }
  }, [commit, update, data])
}

const STAGE_ORDER: OpportunityStage[] = ['saved', 'interested', 'preparing', 'applied', 'screening', 'interview', 'assessment', 'final', 'offer', 'accepted', 'declined', 'rejected', 'withdrawn', 'expired']
