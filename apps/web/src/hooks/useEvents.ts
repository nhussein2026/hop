import { useEntityCollection } from './useEntityCollection.js'
import type { Event } from '../types/index.js'

export function useEvents() {
  const resource = useEntityCollection<Event>('/api/events')
  return { ...resource, events: resource.items, addEvent: (body: unknown) => resource.add(body), updateEvent: (id: string, body: Partial<Event>) => resource.update(id, body) }
}