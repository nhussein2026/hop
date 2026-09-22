import { useEntityCollection } from './useEntityCollection.js'
import type { Task } from '../types/index.js'

export function useTasks() {
  const resource = useEntityCollection<Task>('/api/tasks')

  return {
    ...resource,
    tasks: resource.items,
    addTask: (body: unknown) => resource.add(body),
    completeTask: (id: string) => resource.update(id, { status: 'completed' }),
    updateTask: (id: string, body: Partial<Task>) => resource.update(id, body),
    deleteTask: (id: string) => resource.remove(id),
  }
}