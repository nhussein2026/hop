// Proof levels. A skill's level is earned from its evidence and can always be explained: the proof
// that earns it, the proof about to stop counting, and the one step that would raise it. Nothing
// here is stored; it is worked out from the evidence every time.
import { EVIDENCE_VALID_MONTHS } from '@hop/domain'
import * as D from './dates.ts'
import { EVIDENCE_KIND, SKILL_LAYERS } from './labels.ts'
import type { Course, Evidence, EvidenceKind, LetterGrade, Skill, SkillType, Term } from './types.ts'

export const PROOF_LEVELS = ['claimed', 'practiced', 'verified', 'top'] as const
export type ProofLevel = (typeof PROOF_LEVELS)[number]
export const PROOF_LABEL: Record<ProofLevel, string> = { claimed: 'Claimed', practiced: 'Practised', verified: 'Verified', top: 'Top-tier' }

/** Verified takes valid proof of two different kinds among these. */
const VERIFYING: EvidenceKind[] = ['test', 'review', 'used']

/** The kinds that count as proof, in the order they're shown. Learned never counts. */
const PROOF_KINDS: EvidenceKind[] = ['built', 'test', 'review', 'used', 'top']

/** Proof that holds a level up is flagged this many days before it stops counting. */
export const EXPIRY_NOTICE_DAYS = 60

export type Proof = {
  level: ProofLevel
  /** What earns the level, for the "why" line: the newest entry of each kind that counts. */
  basis: Evidence[]
  /** Counts now, stops counting within EXPIRY_NOTICE_DAYS, and the level drops when it does. Soonest first. */
  expiring: Evidence[]
  /** The one missing step, in plain words. */
  next: string | null
  /** The kinds of proof that would raise the level. */
  needs: EvidenceKind[]
  /** The kinds of proof that count now. */
  kinds: EvidenceKind[]
}

/** Entries recorded before kinds existed count as Built. */
export const kindOf = (e: Pick<Evidence, 'kind'>): EvidenceKind => e.kind ?? 'built'

/** The day proof of a tool skill stops counting. */
export const expiresOn = (date: string) => D.addMonths(date, EVIDENCE_VALID_MONTHS)

/**
 * How an entry counts on a day: fully ('dated'), toward Practised only ('undated'), or not at all.
 * Learned never counts, and proof of a tool skill stops counting EVIDENCE_VALID_MONTHS after its date.
 */
function standing(e: Evidence, type: SkillType, day: string): 'dated' | 'undated' | null {
  if (kindOf(e) === 'learned') return null
  if (!e.date) return 'undated'
  return e.date <= day && (type === 'fundamental' || day < expiresOn(e.date)) ? 'dated' : null
}

const newestFirst = (a: Evidence, b: Evidence) => (b.date ?? '').localeCompare(a.date ?? '')

type Assessment = { level: ProofLevel; basis: Evidence[]; verifying: Evidence[]; kinds: EvidenceKind[] }

function assess(type: SkillType, entries: Evidence[], day: string): Assessment {
  const counting = entries.filter((e) => standing(e, type, day)).sort(newestFirst)
  const newest = (kind: EvidenceKind, dated = false) => counting.find((e) => kindOf(e) === kind && (!dated || e.date))
  // Undated proof counts toward Practised only.
  const verifying = VERIFYING.map((kind) => newest(kind, true)).filter((e) => e !== undefined)
  const top = newest('top', true)
  const kinds = PROOF_KINDS.filter((kind) => newest(kind))
  if (verifying.length >= 2) return top ? { level: 'top', basis: [...verifying, top], verifying, kinds } : { level: 'verified', basis: verifying, verifying, kinds }
  return { level: counting.length ? 'practiced' : 'claimed', basis: kinds.map((kind) => newest(kind)!), verifying, kinds }
}

const kindLabel = (kind: EvidenceKind) => EVIDENCE_KIND[kind].label
const orList = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : items[0] ?? '')

/** A skill's proof level from the evidence linked to it. */
export function proofLevel(skill: Pick<Skill, 'id' | 'type' | 'focus'>, evidence: Evidence[], today: string): Proof {
  // Proof dated in the future hasn't happened yet, so it's left out of the look ahead too.
  const entries = evidence.filter((e) => e.skillIds.includes(skill.id) && (!e.date || e.date <= today))
  const now = assess(skill.type, entries, today)
  const rankOn = (day: string) => PROOF_LEVELS.indexOf(assess(skill.type, entries, day).level)
  // An entry holds the level up when the level drops on the day it stops counting.
  const expiring = skill.type === 'fundamental' ? [] : entries
    .filter((e) => standing(e, skill.type, today) === 'dated' && D.diffDays(expiresOn(e.date!), today) <= EXPIRY_NOTICE_DAYS)
    .filter((e) => rankOn(expiresOn(e.date!)) < rankOn(D.addDays(expiresOn(e.date!), -1)))
    .sort((a, b) => a.date!.localeCompare(b.date!))
  const has = now.verifying.map(kindOf)
  const needs: EvidenceKind[] = now.level === 'claimed' ? ['built']
    : now.level === 'practiced' ? VERIFYING.filter((kind) => !has.includes(kind))
    : now.level === 'verified' && skill.focus === 'standout' ? ['top'] : []
  const next = now.level === 'claimed' ? 'Add something you built with it.'
    : now.level === 'practiced' ? `Needs two of Test, Review, Used.${has.length ? ` Has: ${has.map(kindLabel).join(', ')}.` : ''}`
    : needs.length ? 'Needs a Top proof.' : null
  return { level: now.level, basis: now.basis, expiring, next, needs, kinds: now.kinds }
}

/** "Verified: Test (Mar 2027, İTÜ BLG 527E) + Review (Jan 2027, Senior engineer at Getir)" */
export function whyLine(proof: Proof) {
  if (!proof.basis.length) return 'Claimed: nothing proves it yet.'
  const part = (e: Evidence) => `${kindLabel(kindOf(e))} (${[e.date ? D.monthYear(e.date) : 'undated', e.by].filter(Boolean).join(', ')})`
  return `${PROOF_LABEL[proof.level]}: ${proof.basis.map(part).join(' + ')}`
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

/** Why an entry does or doesn't count, when that isn't obvious from the entry itself. */
export function evidenceNote(skill: Pick<Skill, 'type'>, e: Evidence, proof: Proof, today: string): { text: string; warn?: boolean } | null {
  const kind = kindOf(e)
  if (kind === 'learned') return { text: 'Learning, not proof: it doesn’t count toward the level.' }
  if (e.date && e.date > today) return { text: `Counts from ${D.short(e.date)} ${e.date.slice(0, 4)}.` }
  if (e.date && skill.type === 'tool' && today >= expiresOn(e.date)) return { text: `No longer counts: proof of a tool counts for ${EVIDENCE_VALID_MONTHS} months.` }
  if (proof.expiring.includes(e)) return { text: `Stops counting in ${days(D.diffDays(expiresOn(e.date!), today))}, and the level drops then.`, warn: true }
  if (!e.date && kind !== 'built') return { text: 'Undated, so it counts toward Practised only.' }
  return null
}

/** A task title for the next step, such as "Get a Test or Used proof for React". */
export function planTitle(skill: Pick<Skill, 'name'>, proof: Proof) {
  if (!proof.needs.length) return null
  if (proof.level === 'claimed') return `Build something with ${skill.name}`
  return `Get a ${orList(proof.needs.map(kindLabel))} proof for ${skill.name}`
}

/** Core and standout skills, and listed ones unless parked: the skills whose proof is worth watching. */
const watched = (k: Skill) => k.focus === 'core' || k.focus === 'standout' || (k.listed && k.focus !== 'parked')

/** Watched skills whose level rests on proof that stops counting within `within` days, soonest first. */
export function expiringProof(skills: Skill[], evidence: Evidence[], today: string, within = EXPIRY_NOTICE_DAYS) {
  const out: { skill: Skill; days: number }[] = []
  for (const skill of skills.filter(watched)) {
    const first = proofLevel(skill, evidence, today).expiring[0]
    const left = first ? D.diffDays(expiresOn(first.date!), today) : Infinity
    if (left <= within) out.push({ skill, days: left })
  }
  return out.sort((a, b) => a.days - b.days)
}

/** Skills shown publicly, and those of them that nothing proves yet. Parked skills are left out of the warning. */
export function honesty(skills: Skill[], evidence: Evidence[], today: string) {
  const listed = skills.filter((k) => k.listed)
  return { listed, claimed: listed.filter((k) => k.focus !== 'parked' && proofLevel(k, evidence, today).level === 'claimed') }
}

/** Groups by layer (category): the user's layers first in their order, then others by name, then "Other". */
export function byLayer<T extends { skill: Pick<Skill, 'category'> }>(rows: T[]) {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const layer = row.skill.category?.trim() || 'Other'
    groups.set(layer, [...(groups.get(layer) ?? []), row])
  }
  const rank = (layer: string) => (SKILL_LAYERS.includes(layer) ? SKILL_LAYERS.indexOf(layer) : layer === 'Other' ? SKILL_LAYERS.length + 1 : SKILL_LAYERS.length)
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([layer, items]) => ({ layer, items }))
}

/** A failed course proves nothing. */
export const provesSomething = (grade: LetterGrade | null) => grade !== null && grade !== 'FF' && grade !== 'VF'

/** A graded İTÜ course as proof: a Test nobody can self-declare, dated when its term ended. */
export function courseProof(c: Pick<Course, 'id' | 'code' | 'name' | 'grade' | 'termId'>, terms: Pick<Term, 'id' | 'end'>[], today: string) {
  const end = terms.find((t) => t.id === c.termId)?.end
  return { kind: 'test' as const, title: `Completed ${c.code} ${c.name}`, by: `İTÜ ${c.code}`, result: c.grade, date: end && end < today ? end : today, courseId: c.id }
}
