import { useEntityCollection } from './useEntityCollection.js'
import type { WeeklyReview } from '../types/index.js'

export function useWeeklyReviews() {
  const resource = useEntityCollection<WeeklyReview>('/api/reviews/weekly')

  async function saveWeeklyReview(id: string | undefined, body: unknown) {
    if (id) return resource.update(id, body)
    return resource.add(body)
  }

  return { ...resource, weeklyReviews: resource.items, saveWeeklyReview }
}