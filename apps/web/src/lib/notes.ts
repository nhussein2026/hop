// Notes: the İTÜ library's notes, shown on their own with pinned ones first.
import type { Resource } from './types.ts'

/** A note's title when none is given: its first line, cut to a readable length. */
export function titleFrom(body: string) {
  const line = body.trim().split('\n')[0]!.trim()
  return line.length > 80 ? `${line.slice(0, 77)}…` : line
}

/** Notes, pinned first, then the most recently changed. */
export const sortNotes = (notes: Resource[]) => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
