import assert from 'node:assert/strict'
import test from 'node:test'
import { sortNotes, titleFrom } from './notes.ts'
import type { Resource } from './types.ts'

test('a note without a title takes its first line', () => {
  assert.equal(titleFrom('  Bus 500T leaves 07:40\nfrom Kadıköy'), 'Bus 500T leaves 07:40')
  assert.equal(titleFrom('x'.repeat(100)).length, 78)
})

test('pinned notes come first, then the most recently changed', () => {
  const note = (id: string, pinned: boolean, updatedAt: string) => ({ id, pinned, updatedAt }) as Resource
  const sorted = sortNotes([note('old', false, '2026-10-01'), note('pinned', true, '2026-09-01'), note('new', false, '2026-10-18')])

  assert.deepEqual(sorted.map((n) => n.id), ['pinned', 'new', 'old'])
})
