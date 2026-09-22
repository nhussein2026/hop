import { useEntityCollection } from './useEntityCollection.js'
import type { Goal } from '../types/index.js'

export function useGoals() {
  const resource = useEntityCollection<Goal>('/api/goals')
  return { ...resource, goals: resource.items, addGoal: (body: unknown) => resource.add(body), updateGoal: (id: string, body: Partial<Goal>) => resource.update(id, body) }
}