// The store's shape, the hook to read it, and the API helpers every change goes through.
import { createContext, useContext } from 'react'
import { apiFetch, readErrorMessage } from '../lib/api.ts'
import type { HopData } from '../lib/types.ts'

export type Sync = 'saved' | 'saving' | 'error'

export type UiState = { skipped: string[]; taskFilter: string; agendaFilter: string; oppFilter: string }

export type CommitOptions = { quiet?: boolean; toast?: string; undo?: () => void }

type Store = {
  data: HopData
  sync: Sync
  online: boolean
  ui: UiState
  setUi: (patch: Partial<UiState>) => void
  update: (change: (data: HopData) => HopData) => void
  commit: <T>(label: string, request: () => Promise<T>, apply?: (result: T, data: HopData) => HopData, options?: CommitOptions) => Promise<T | undefined>
}

export const StoreContext = createContext<Store | null>(null)

export function useHop() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useHop must be used inside HopProvider')
  return store
}

/** A request that throws a readable message when the API refuses it. */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await readErrorMessage(response, ''))
  return await response.json() as T
}

/** Send a file as the raw request body, with its name in X-File-Name. */
async function upload<T>(path: string, file: File): Promise<T> {
  const response = await apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
    body: file,
  })
  if (!response.ok) throw new Error(response.status === 413 ? 'The file is larger than 10 MB.' : await readErrorMessage(response, ''))
  return await response.json() as T
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  upload,
  post: <T,>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T,>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T,>(path: string) => request<T>('DELETE', path),
}

export type Collection = Exclude<keyof HopData, 'settings'>

/** Replace an item by id, or add it to the start when it is new. */
export function upsert<K extends Collection>(data: HopData, key: K, item: HopData[K][number]): HopData {
  const list = data[key] as { id: string }[]
  const exists = list.some((entry) => entry.id === (item as { id: string }).id)
  return { ...data, [key]: exists ? list.map((entry) => entry.id === (item as { id: string }).id ? item : entry) : [item, ...list] }
}

export function without<K extends Collection>(data: HopData, key: K, id: string): HopData {
  return { ...data, [key]: (data[key] as { id: string }[]).filter((entry) => entry.id !== id) }
}

