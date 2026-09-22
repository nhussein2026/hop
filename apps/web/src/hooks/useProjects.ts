import { useEntityCollection } from './useEntityCollection.js'
import type { Project } from '../types/index.js'

export function useProjects() {
  const resource = useEntityCollection<Project>('/api/projects')
  return { ...resource, projects: resource.items, addProject: (body: unknown) => resource.add(body), updateProject: (id: string, body: Partial<Project>) => resource.update(id, body) }
}