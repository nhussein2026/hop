import { useEffect, useRef, useState } from 'react'
import { useEntityCollection } from './useEntityCollection.js'
import { apiFetch } from '../lib/api.js'
import { addDays } from '../lib/date.js'
import type { Habit, HabitCompletion } from '../types/index.js'

export function useHabits(today: string) {
  const resource = useEntityCollection<Habit>('/api/habits')
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([])
  const [completionError, setCompletionError] = useState('')
  const controllers = useRef(new Set<AbortController>())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    const activeControllers = controllers.current
    activeControllers.add(controller)
    apiFetch(`/api/habits/completions?from=${addDays(today, -6)}&to=${today}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load habit completions')
        return response.json() as Promise<HabitCompletion[]>
      })
      .then((result) => {
        if (mounted.current) setHabitCompletions(result)
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError') && mounted.current) setCompletionError('The API request could not be completed. Try again in a moment.')
      })
      .finally(() => activeControllers.delete(controller))
    return () => {
      mounted.current = false
      activeControllers.forEach((activeController) => activeController.abort())
      activeControllers.clear()
    }
  }, [today])

  async function completeHabit(habitId: string) {
    if (habitCompletions.some((completion) => completion.habitId === habitId && completion.date === today)) return
    const controller = new AbortController()
    controllers.current.add(controller)
    try {
      const response = await apiFetch(`/api/habits/${habitId}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Could not complete habit')
      const completion = await response.json() as HabitCompletion
      if (mounted.current) setHabitCompletions((current) => [...current, completion])
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError') && mounted.current) setCompletionError('The API request could not be completed. Try again in a moment.')
    } finally {
      controllers.current.delete(controller)
    }
  }

  return {
    ...resource,
    habits: resource.items,
    habitCompletions: habitCompletions.filter((completion) => completion.date === today),
    recentHabitCompletionCount: habitCompletions.length,
    error: resource.error || completionError,
    addHabit: (body: unknown) => resource.add(body),
    completeHabit,
  }
}