import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api.js'

type Entity = { id: string }

export function useEntityCollection<T extends Entity>(endpoint: string) {
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const requestId = useRef(0)
  const controllers = useRef(new Set<AbortController>())

  const request = useCallback(async <R,>(path: string, init?: RequestInit) => {
    const id = ++requestId.current
    const controller = new AbortController()
    controllers.current.add(controller)

    try {
      const response = await apiFetch(path, { ...init, signal: controller.signal })
      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      const result = await response.json() as R
      // A newer request supersedes this one's error state, but a saved change must still reach the UI.
      if (id === requestId.current) setError('')
      return result
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return undefined
      if (id === requestId.current) setError('The API request could not be completed. Try again in a moment.')
      return undefined
    } finally {
      controllers.current.delete(controller)
    }
  }, [])

  const reload = useCallback(async () => {
    setIsLoading(true)
    const result = await request<T[]>(endpoint)
    if (result) setItems(result)
    setIsLoading(false)
  }, [endpoint, request])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const activeControllers = controllers.current
    activeControllers.add(controller)
    apiFetch(endpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        return response.json() as Promise<T[]>
      })
      .then((result) => {
        if (!active) return
        setItems(result)
        setError('')
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return
        setError('The API request could not be completed. Try again in a moment.')
        setIsLoading(false)
      })
      .finally(() => activeControllers.delete(controller))
    return () => {
      active = false
      activeControllers.forEach((controller) => controller.abort())
      activeControllers.clear()
    }
  }, [endpoint, request])

  const add = useCallback(async (body: unknown) => {
    setIsSaving(true)
    const result = await request<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (result) setItems((current) => [result, ...current])
    setIsSaving(false)
    return result
  }, [endpoint, request])

  const update = useCallback(async (id: string, body: unknown) => {
    setIsSaving(true)
    const result = await request<T>(`${endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (result) setItems((current) => current.map((item) => item.id === result.id ? result : item))
    setIsSaving(false)
    return result
  }, [endpoint, request])

  const remove = useCallback(async (id: string) => {
    setIsSaving(true)
    const result = await request<{ ok: boolean }>(`${endpoint}/${id}`, { method: 'DELETE' })
    if (result) setItems((current) => current.filter((item) => item.id !== id))
    setIsSaving(false)
    return result
  }, [endpoint, request])

  return { items, setItems, error, isLoading, isSaving, add, update, remove, reload }
}