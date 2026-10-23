// Skill checks: what each one shows (words per minute, errors per 100 words, % right), derived
// from the counts it stores, and each area's latest result and trend for Progress.
import { CHECK_AREAS } from '@hop/domain'
import type { CheckArea, CheckMetricsByArea, LanguageCheck } from './types.ts'

/** One derived figure. `better` says which way is progress, so a trend can be read either way. */
export interface CheckValue {
  key: string
  label: string
  value: number
  unit: string
  better: 'higher' | 'lower'
}

const one = (value: number) => Math.round(value * 10) / 10
const pct = (correct: number, total: number) => Math.round((correct / total) * 100)

/** The figures a check shows, the headline first. */
export function checkValues(check: Pick<LanguageCheck, 'area' | 'metrics'>): CheckValue[] {
  switch (check.area) {
    case 'speaking': {
      const m = check.metrics as CheckMetricsByArea['speaking']
      const perMinute = m.seconds / 60
      return [
        { key: 'wpm', label: 'Words per minute', value: Math.round(m.words / perMinute), unit: 'wpm', better: 'higher' },
        { key: 'errorsPerMin', label: 'Errors per minute', value: one(m.errors / perMinute), unit: 'errors/min', better: 'lower' },
      ]
    }
    case 'writing': {
      const m = check.metrics as CheckMetricsByArea['writing']
      const values: CheckValue[] = [{ key: 'errorsPer100', label: 'Errors per 100 words', value: one((m.errors / m.words) * 100), unit: 'errors/100 words', better: 'lower' }]
      if (m.rubric !== undefined) values.push({ key: 'rubric', label: 'Rubric', value: m.rubric, unit: '/25', better: 'higher' })
      return values
    }
    case 'words': {
      const m = check.metrics as CheckMetricsByArea['words']
      const values: CheckValue[] = []
      if (m.retention !== undefined) values.push({ key: 'retention', label: 'True retention', value: one(m.retention), unit: '%', better: 'higher' })
      if (m.known !== undefined && m.sampled) values.push({ key: 'known', label: 'Sample known', value: pct(m.known, m.sampled), unit: '%', better: 'higher' })
      if (m.mature !== undefined) values.push({ key: 'mature', label: 'Mature cards', value: m.mature, unit: 'cards', better: 'higher' })
      return values
    }
    default: {
      const m = check.metrics as CheckMetricsByArea['grammar']
      return [{ key: 'pct', label: 'Right', value: pct(m.correct, m.total), unit: '%', better: 'higher' }]
    }
  }
}

/** A figure as it reads in a sentence: "75 wpm", "82 %", "6.5 errors/100 words". */
export const formatValue = (v: Pick<CheckValue, 'value' | 'unit'>) => (v.unit === '%' ? `${v.value}%` : v.unit.startsWith('/') ? `${v.value}${v.unit}` : `${v.value} ${v.unit}`)

/** The counts behind a check, for its row: "150 words in 2:00, 9 errors". */
export function checkCounts(check: Pick<LanguageCheck, 'area' | 'metrics'>): string {
  switch (check.area) {
    case 'speaking': {
      const m = check.metrics as CheckMetricsByArea['speaking']
      return `${m.words} words in ${Math.floor(m.seconds / 60)}:${String(m.seconds % 60).padStart(2, '0')}, ${m.errors} ${m.errors === 1 ? 'error' : 'errors'}`
    }
    case 'writing': {
      const m = check.metrics as CheckMetricsByArea['writing']
      return `${m.words} words in ${m.minutes} min, ${m.errors} ${m.errors === 1 ? 'error' : 'errors'}`
    }
    case 'listening': {
      const m = check.metrics as CheckMetricsByArea['listening']
      return `${m.mode === 'dictation' ? 'Dictation' : 'Questions'}: ${m.correct} of ${m.total} ${m.mode === 'dictation' ? 'words' : 'right'}`
    }
    case 'reading': {
      const m = check.metrics as CheckMetricsByArea['reading']
      return `${m.correct} of ${m.total} right${m.minutes ? ` in ${m.minutes} min` : ''}`
    }
    case 'words': {
      const m = check.metrics as CheckMetricsByArea['words']
      return [m.known !== undefined && `${m.known} of ${m.sampled} sampled words known`, m.mature !== undefined && `${m.mature} mature cards`].filter(Boolean).join(', ') || 'Anki retention'
    }
    case 'grammar': {
      const m = check.metrics as CheckMetricsByArea['grammar']
      return `${m.correct} of ${m.total} right`
    }
  }
}

export interface AreaSummary {
  area: CheckArea
  latest: LanguageCheck | null
  /** The latest check's headline figure. */
  headline: CheckValue | null
  /** That same figure over the last checks that have it, oldest first. */
  trend: { date: string; value: number }[]
}

/** One summary per area: its latest check and how its headline figure moved over the last `count` checks. */
export function areaSummaries(checks: LanguageCheck[], count = 8): AreaSummary[] {
  const byDate = [...checks].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  return CHECK_AREAS.map((area) => {
    const own = byDate.filter((c) => c.area === area)
    const latest = own.at(-1) ?? null
    const headline = latest ? checkValues(latest)[0] ?? null : null
    const trend = headline
      ? own.flatMap((c) => {
        const value = checkValues(c).find((v) => v.key === headline.key)
        return value ? [{ date: c.date, value: value.value }] : []
      }).slice(-count)
      : []
    return { area, latest, headline, trend }
  })
}
