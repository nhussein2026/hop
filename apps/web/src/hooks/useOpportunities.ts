import { useEntityCollection } from './useEntityCollection.js'
import type { Opportunity } from '../types/index.js'

export function useOpportunities() {
  const resource = useEntityCollection<Opportunity>('/api/opportunities')
  return { ...resource, opportunities: resource.items, addOpportunity: (body: unknown) => resource.add(body), updateOpportunity: (id: string, body: Partial<Opportunity>) => resource.update(id, body) }
}