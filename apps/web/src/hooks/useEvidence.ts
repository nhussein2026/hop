import { useEntityCollection } from './useEntityCollection.js'
import type { Evidence } from '../types/index.js'

export function useEvidence() {
  const resource = useEntityCollection<Evidence>('/api/evidence')
  return { ...resource, evidence: resource.items, addEvidence: (body: unknown) => resource.add(body), updateEvidence: (id: string, body: Partial<Evidence>) => resource.update(id, body) }
}