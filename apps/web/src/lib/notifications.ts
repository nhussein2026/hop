// Notifications: only things that lead to an action, filtered by the categories the user enabled.
import * as D from './dates.ts'
import { attention, monthEnd, reviewMonth } from './rules.ts'
import type { AttentionItem } from './rules.ts'
import type { HopData } from './types.ts'

const CATEGORY = { critical: 'critical', important: 'important', info: 'optional' } as const

/** Only things that lead to an action, filtered by the categories the user enabled. */
export function notificationsFor(data: HopData): AttentionItem[] {
  const today = D.today()
  const { notify, weekStart } = data.settings
  const items = attention(data, today).filter((item) => notify[CATEGORY[item.level]])
  const start = D.startOfWeek(today, weekStart)
  const end = D.addDays(start, 6)
  const reviewed = data.weeklyReviews.some((review) => review.weekStart === start && review.status === 'completed')
  if (!reviewed && D.diffDays(end, today) <= 1 && notify.important) {
    items.push({ level: 'important', icon: 'review', title: `Weekly review is due ${end === today ? 'today' : 'tomorrow'}`, detail: 'About 10 minutes. Facts are filled in for you.', href: '#/review' })
  }
  const month = reviewMonth(data.monthlyReviews, today)
  const monthReviewed = data.monthlyReviews.some((review) => review.monthStart === month && review.status === 'completed')
  const lastDay = monthEnd(month)
  if (!monthReviewed && D.diffDays(lastDay, today) <= 1 && notify.important) {
    const when = lastDay < today ? `${D.monthLong(month)} ended` : `the month ends ${lastDay === today ? 'today' : 'tomorrow'}`
    items.push({ level: 'important', icon: 'review', title: `Monthly review for ${D.monthLong(month)} is due`, detail: `About 20 minutes; ${when}.`, href: '#/review/month' })
  }
  return items
}

export function unreadCount(data: HopData) {
  return notificationsFor(data).filter((item) => item.level !== 'info' && !data.settings.readNotifications.includes(item.title)).length
}

/* ---- Celebration ----------------------------------------------------------------------------------- */
/** One small celebration for real milestones: an offer, an achieved goal, a completed review. */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const element = document.createElement('div')
  element.className = 'celebrate'
  element.setAttribute('aria-hidden', 'true')
  element.innerHTML = '<svg class="brand-mark" style="width:64px;height:64px" viewBox="0 0 32 32"><path fill="currentColor" d="M16 3a13 13 0 1 0 12.4 9.1L16 16V3Z"/><circle cx="23" cy="7.5" r="3" fill="currentColor" opacity=".55"/></svg><i></i><i></i><i></i>'
  document.body.appendChild(element)
  window.setTimeout(() => element.remove(), 1600)
}
