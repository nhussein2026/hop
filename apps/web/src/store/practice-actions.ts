// Every change to the language track: setup, the daily plan, practice done, tests and levels.
// Like actions.ts: cheap changes happen at once with Undo; the screens confirm deletes first.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import { adjustTotals, checkpointLevel, nextLevel } from '../lib/practice.ts'
import type { Goal, HopData, LanguageTrack, Milestone, PracticeActivity, PracticeArea, PracticeSession, PracticeTest, Resource, Settings } from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

type Setup = { settings: Settings; goal: Goal; milestones: Milestone[]; activities: PracticeActivity[]; note: Resource | null }

export type ActivityFields = Pick<PracticeActivity, 'area' | 'title' | 'detail' | 'minutes' | 'slot' | 'days'>

/**
 * Replace one session with its new version (either may be missing: a new or a deleted session)
 * and keep the totals in step, by comparing that day's sessions before and after.
 */
function applySession(before: PracticeSession | undefined, after: PracticeSession | undefined) {
  return (data: HopData): HopData => {
    const date = (after ?? before)?.date
    let next = before ? without(data, 'practiceSessions', before.id) : data
    if (after) next = upsert(next, 'practiceSessions', after)
    const day = (list: PracticeSession[]) => list.filter((s) => s.date === date)
    return { ...next, practiceTotals: adjustTotals(data.practiceTotals, day(data.practiceSessions), day(next.practiceSessions)) }
  }
}

/** Apply a level change: the checkpoint, the goal it belongs to, and the settings holding the track. */
function applyLevel({ milestone, updatedGoal, settings }: { milestone: Milestone; updatedGoal?: Goal; settings?: Settings }, current: HopData): HopData {
  let next = upsert(current, 'milestones', milestone)
  if (updatedGoal) next = upsert(next, 'goals', updatedGoal)
  return settings ? { ...next, settings } : next
}

export function usePracticeActions() {
  const { commit, data } = useHop()

  return useMemo(() => {
    const track = {
      setup(fields: Pick<LanguageTrack, 'level' | 'target' | 'examDate'>) {
        return commit('Your track is ready. Today’s plan is below.', () => api.post<Setup>('/api/practice/setup', fields), (result, current) => ({
          ...upsert(result.note ? upsert(current, 'resources', result.note) : current, 'goals', result.goal),
          settings: result.settings,
          milestones: [...current.milestones, ...result.milestones],
          practiceActivities: result.activities,
        }))
      },
      update(changes: Partial<LanguageTrack>, label: string) {
        return commit(label, () => api.patch<Settings>('/api/settings', { languageTrack: changes }), (settings, current) => ({ ...current, settings }))
      },
      /**
       * Finishing a level: its checkpoint and the goal's matching criterion are done, and the track
       * moves on to the next level.
       */
      finishLevel(t: LanguageTrack, checkpoint: Milestone) {
        const level = checkpointLevel(checkpoint)
        const goal = data.goals.find((g) => g.id === t.goalId)
        const criterion = goal?.criteria.find((c) => c.text === checkpoint.title && !c.done)
        const moveTo = level && level !== t.target ? nextLevel(level) : null
        return commit(moveTo ? `${level} done. On to ${moveTo}.` : 'Checkpoint reached', async () => {
          const milestone = await api.patch<Milestone>(`/api/milestones/${checkpoint.id}`, { done: true })
          const updatedGoal = goal && criterion ? await api.patch<Goal>(`/api/goals/${goal.id}/criteria/${criterion.id}`, { done: true }) : undefined
          const settings = moveTo ? await api.patch<Settings>('/api/settings', { languageTrack: { level: moveTo } }) : undefined
          return { milestone, updatedGoal, settings }
        }, applyLevel, {
          // Undo puts the checkpoint, its criterion and the level back as they were, date included.
          undo: () => void commit('Undone', async () => {
            const milestone = await api.patch<Milestone>(`/api/milestones/${checkpoint.id}`, { done: false, date: checkpoint.date })
            const updatedGoal = goal && criterion ? await api.patch<Goal>(`/api/goals/${goal.id}/criteria/${criterion.id}`, { done: false }) : undefined
            const settings = moveTo ? await api.patch<Settings>('/api/settings', { languageTrack: { level: t.level } }) : undefined
            return { milestone, updatedGoal, settings }
          }, applyLevel),
        })
      },
    }

    const activities = {
      add(fields: ActivityFields) {
        return commit('Added to your plan', () => api.post<PracticeActivity>('/api/practice/activities', fields), (activity, current) => upsert(current, 'practiceActivities', activity))
      },
      update(a: PracticeActivity, changes: Partial<PracticeActivity>, label: string, undo = false) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, a[key as keyof PracticeActivity]])) as Partial<PracticeActivity>
        const apply = (saved: PracticeActivity, current: HopData) => upsert(current, 'practiceActivities', saved)
        return commit(label, () => api.patch<PracticeActivity>(`/api/practice/activities/${a.id}`, changes), apply, {
          undo: undo ? () => void commit('Undone', () => api.patch<PracticeActivity>(`/api/practice/activities/${a.id}`, before), apply) : undefined,
        })
      },
      remove(a: PracticeActivity) {
        return commit('Removed from your plan', () => api.delete(`/api/practice/activities/${a.id}`), (_, current) => ({
          ...without(current, 'practiceActivities', a.id),
          practiceSessions: current.practiceSessions.map((s) => (s.activityId === a.id ? { ...s, activityId: null } : s)),
        }))
      },
    }

    const sessions = {
      /** Tick an activity off for the day. Doing it again changes the minutes; Undo puts back what was there. */
      done(a: PracticeActivity, minutes = a.minutes, date = D.today()) {
        const before = data.practiceSessions.find((s) => s.activityId === a.id && s.date === date)
        let saved: PracticeSession | undefined
        return commit(before ? `${a.title}: ${minutes} min` : `${a.title}: done, ${minutes} min`, async () => (saved = await api.post<PracticeSession>('/api/practice/sessions', { date, minutes, activityId: a.id })), (result, current) => applySession(before, result)(current), {
          undo: () => void commit('Undone', async () => {
            if (before) return api.patch<PracticeSession>(`/api/practice/sessions/${before.id}`, { minutes: before.minutes })
            if (saved) await api.delete(`/api/practice/sessions/${saved.id}`)
            return undefined
          }, (restored, current) => applySession(current.practiceSessions.find((s) => s.id === saved?.id), restored)(current)),
        })
      },
      /** Practice outside the plan: class homework, a chat, a film. */
      log(fields: { area: PracticeArea; minutes: number; note: string; date: string }) {
        return commit(`${fields.minutes} min logged`, () => api.post<PracticeSession>('/api/practice/sessions', fields), (saved, current) => applySession(undefined, saved)(current))
      },
      update(s: PracticeSession, changes: Partial<Pick<PracticeSession, 'minutes' | 'note' | 'area'>>, label: string) {
        return commit(label, () => api.patch<PracticeSession>(`/api/practice/sessions/${s.id}`, changes), (saved, current) => applySession(s, saved)(current))
      },
      remove(s: PracticeSession) {
        return commit('Practice removed', () => api.delete(`/api/practice/sessions/${s.id}`), (_, current) => applySession(s, undefined)(current), {
          undo: () => void commit('Undone', () => api.post<PracticeSession>('/api/practice/sessions', { date: s.date, minutes: s.minutes, note: s.note, ...(s.activityId ? { activityId: s.activityId } : { area: s.area }) }), (saved, current) => applySession(undefined, saved)(current)),
        })
      },
    }

    const tests = {
      add(fields: Pick<PracticeTest, 'date' | 'title' | 'scores' | 'note'>) {
        return commit('Practice test saved', () => api.post<PracticeTest>('/api/practice/tests', fields), (saved, current) => upsert(current, 'practiceTests', saved))
      },
      update(t: PracticeTest, changes: Partial<PracticeTest>) {
        return commit('Practice test updated', () => api.patch<PracticeTest>(`/api/practice/tests/${t.id}`, changes), (saved, current) => upsert(current, 'practiceTests', saved))
      },
      remove(t: PracticeTest) {
        return commit('Practice test deleted', () => api.delete(`/api/practice/tests/${t.id}`), (_, current) => without(current, 'practiceTests', t.id))
      },
    }

    return { track, activities, sessions, tests }
  }, [commit, data])
}
