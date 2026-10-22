import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { byLayer, courseProof, evidenceNote, expiringProof, honesty, planTitle, proofLevel, whyLine } from './skills.ts'
import type { Evidence, Skill } from './types.ts'

setTimezone('UTC')

const today = '2026-10-22'
const stamp = '2026-01-01T00:00:00.000Z'

const skill = (fields: Partial<Skill> = {}): Skill => ({
  id: 'react', name: 'React', category: 'Software engineering', type: 'tool', focus: 'core', listed: false, bar: null, level: null,
  confidence: null, lastPracticedAt: null, yearsExperience: null, notes: null, createdAt: stamp, updatedAt: stamp, ...fields,
})

let next = 0
const proof = (fields: Partial<Evidence>): Evidence => ({
  id: `e${++next}`, title: 'Proof', description: null, kind: 'built', by: null, result: null, skillId: 'react', skillIds: ['react'],
  projectId: null, opportunityId: null, goalId: null, courseId: null, url: null, date: '2026-09-01', createdAt: stamp, updatedAt: stamp, ...fields,
})

const levelOf = (evidence: Evidence[], fields: Partial<Skill> = {}) => proofLevel(skill(fields), evidence, today).level

test('a skill with no evidence is only claimed', () => {
  const result = proofLevel(skill(), [], today)
  assert.equal(result.level, 'claimed')
  assert.equal(result.next, 'Add something you built with it.')
  assert.equal(whyLine(result), 'Claimed: nothing proves it yet.')
  assert.equal(planTitle(skill(), result), 'Build something with React')
})

test('built work makes a skill practised, never verified on its own', () => {
  assert.equal(levelOf([proof({ kind: 'built' })]), 'practiced')
  assert.equal(levelOf([proof({ kind: 'built' }), proof({ kind: 'built', date: '2026-10-01' })]), 'practiced')
})

test('proof of two different kinds among Test, Review and Used verifies a skill, and the why line names both', () => {
  const evidence = [proof({ kind: 'test', by: 'İTÜ BLG 527E', date: '2026-03-10' }), proof({ kind: 'review', by: 'Senior engineer at Getir', date: '2026-01-15' })]
  const result = proofLevel(skill(), evidence, today)
  assert.equal(result.level, 'verified')
  assert.equal(whyLine(result), 'Verified: Test (Mar 2026, İTÜ BLG 527E) + Review (Jan 2026, Senior engineer at Getir)')
  assert.equal(result.next, null)
})

test('two proofs of the same kind are not enough for Verified', () => {
  const result = proofLevel(skill(), [proof({ kind: 'test', by: 'A' }), proof({ kind: 'test', by: 'B' })], today)
  assert.equal(result.level, 'practiced')
  assert.equal(result.next, 'Needs two of Test, Review, Used. Has: Test.')
  assert.equal(planTitle(skill(), result), 'Get a Review or Used proof for React')
  assert.equal(proofLevel(skill(), [proof({ kind: 'built' })], today).next, 'Needs two of Test, Review, Used.')
})

test('proof of a tool stops counting after 18 months; proof of a fundamental never does', () => {
  const old = [proof({ kind: 'test', by: 'A', date: '2025-03-20' }), proof({ kind: 'review', by: 'B', date: '2025-03-20' })]
  assert.equal(levelOf(old), 'claimed')
  assert.equal(levelOf(old, { type: 'fundamental' }), 'verified')
  assert.equal(levelOf([proof({ kind: 'test', by: 'A', date: '2021-06-01' }), proof({ kind: 'used', by: 'B', date: '2021-06-01' })], { type: 'fundamental' }), 'verified')
})

test('undated proof counts toward Practised only', () => {
  const evidence = [proof({ kind: 'test', by: 'A' }), proof({ kind: 'review', by: 'B', date: null })]
  assert.equal(levelOf(evidence), 'practiced')
  assert.equal(evidenceNote(skill(), evidence[1]!, proofLevel(skill(), evidence, today), today)?.text, 'Undated, so it counts toward Practised only.')
})

test('a Top proof only counts on top of Verified', () => {
  assert.equal(levelOf([proof({ kind: 'test', by: 'A' }), proof({ kind: 'top', by: 'B' })]), 'practiced')
  assert.equal(levelOf([proof({ kind: 'test', by: 'A' }), proof({ kind: 'used', by: 'B' }), proof({ kind: 'top', by: 'C' })]), 'top')
  const standout = proofLevel(skill({ focus: 'standout' }), [proof({ kind: 'test', by: 'A' }), proof({ kind: 'used', by: 'B' })], today)
  assert.equal(standout.next, 'Needs a Top proof.')
  assert.equal(planTitle(skill(), standout), 'Get a Top proof for React')
})

test('entries without a kind count as Built, and Learned never counts', () => {
  const legacy = proofLevel(skill(), [proof({ kind: null })], today)
  assert.equal(legacy.level, 'practiced')
  assert.deepEqual(legacy.kinds, ['built'])
  assert.equal(levelOf([proof({ kind: 'learned' })]), 'claimed')
})

test('proof dated in the future does not count yet', () => {
  assert.equal(levelOf([proof({ kind: 'built', date: '2026-11-01' })]), 'claimed')
})

test('expiring lists only proof whose loss lowers the level', () => {
  // Stops counting on 2026-11-22, a month from now.
  const ageing = proof({ kind: 'test', by: 'A', date: '2025-05-22' })
  const review = proof({ kind: 'review', by: 'B', date: '2026-09-01' })
  const result = proofLevel(skill(), [ageing, review], today)
  assert.equal(result.level, 'verified')
  assert.deepEqual(result.expiring, [ageing])
  assert.match(evidenceNote(skill(), ageing, result, today)?.text ?? '', /Stops counting in 31 days/)

  // A newer test keeps the level up when the old one goes.
  assert.deepEqual(proofLevel(skill(), [ageing, review, proof({ kind: 'test', by: 'C', date: '2026-08-01' })], today).expiring, [])
  // Built work that will still be there.
  assert.deepEqual(proofLevel(skill(), [proof({ kind: 'built', date: '2025-05-22' }), proof({ kind: 'built' })], today).expiring, [])
  // Two of the same kind going on the same day both hold the level up.
  const twin = proof({ kind: 'test', by: 'C', date: '2025-05-22' })
  assert.deepEqual(proofLevel(skill(), [ageing, twin, review], today).expiring, [ageing, twin])
  // Proof of a fundamental never expires.
  assert.deepEqual(proofLevel(skill({ type: 'fundamental' }), [ageing, review], today).expiring, [])
})

test('expiringProof watches core, standout and listed skills, soonest first', () => {
  const ageing = (id: string, date: string) => [proof({ kind: 'test', by: 'A', date, skillIds: [id] }), proof({ kind: 'review', by: 'B', skillIds: [id] })]
  const skills = [skill({ id: 'a', name: 'A', focus: 'keep' }), skill({ id: 'b', name: 'B', focus: 'core' }), skill({ id: 'c', name: 'C', focus: 'keep', listed: true }), skill({ id: 'd', name: 'D', focus: 'parked', listed: true })]
  const evidence = [...ageing('a', '2025-05-22'), ...ageing('b', '2025-06-10'), ...ageing('c', '2025-05-22'), ...ageing('d', '2025-05-22')]
  assert.deepEqual(expiringProof(skills, evidence, today).map(({ skill: k, days }) => [k.name, days]), [['C', 31], ['B', 49]])
  assert.deepEqual(expiringProof(skills, evidence, today, 30), [])
})

test('honesty names listed skills that nothing proves, except parked ones', () => {
  const skills = [skill({ id: 'a', name: 'A', listed: true }), skill({ id: 'b', name: 'B', listed: true }), skill({ id: 'c', name: 'C', listed: true, focus: 'parked' }), skill({ id: 'd', name: 'D' })]
  const result = honesty(skills, [proof({ kind: 'built', skillIds: ['b'] })], today)
  assert.equal(result.listed.length, 3)
  assert.deepEqual(result.claimed.map((k) => k.name), ['A'])
})

test('byLayer puts the user’s layers first, in order, and skills without one last', () => {
  const rows = ['Practices', null, 'Foundations', 'Databases', 'Other', 'AI engineering'].map((category) => ({ skill: { category } }))
  assert.deepEqual(byLayer(rows).map((group) => [group.layer, group.items.length]), [['Foundations', 1], ['AI engineering', 1], ['Practices', 1], ['Databases', 1], ['Other', 2]])
})

test('a graded course becomes a Test dated when its term ended', () => {
  const course = { id: 'c1', code: 'BLG 527E', name: 'Machine Learning', grade: 'BA' as const, termId: 't1' }
  assert.deepEqual(courseProof(course, [{ id: 't1', end: '2027-01-22' }], '2027-02-03'), { kind: 'test', title: 'Completed BLG 527E Machine Learning', by: 'İTÜ BLG 527E', result: 'BA', date: '2027-01-22', courseId: 'c1' })
  // Graded before the term is over.
  assert.equal(courseProof(course, [{ id: 't1', end: '2027-01-22' }], '2027-01-15').date, '2027-01-15')
  assert.equal(courseProof({ ...course, termId: null }, [], '2027-02-03').date, '2027-02-03')
})
