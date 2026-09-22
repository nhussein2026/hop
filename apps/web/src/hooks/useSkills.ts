import { useEntityCollection } from './useEntityCollection.js'
import type { Skill } from '../types/index.js'

export function useSkills() {
  const resource = useEntityCollection<Skill>('/api/skills')
  return { ...resource, skills: resource.items, addSkill: (body: unknown) => resource.add(body), updateSkill: (id: string, body: Partial<Skill>) => resource.update(id, body) }
}