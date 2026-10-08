// App-wide dialogs: quick add, search, notifications, reflections and the phone "More" sheet.
import { useEffect, useMemo, useRef, useState } from 'react'
import * as D from '../lib/dates.ts'
import { search } from '../lib/rules.ts'
import type { AttentionItem, SearchResult } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Reflection } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { Icon, Pad } from '../components/Icon.tsx'
import { Dialog, Field, FieldError, Segmented, SubmitButton } from '../components/ui.tsx'
import { notificationsFor } from '../lib/notifications.ts'
import { useHop } from '../store/store.ts'
import { closeDialog, focusFirstInvalid, formText } from '../components/ui-context.ts'

/* ---- Quick add ---------------------------------------------------------------------------- */
export type AddKind = 'opportunity' | 'event' | 'evidence' | 'goal' | 'note' | 'project' | 'milestone'

function whenOptions(): [string, string][] {
  const today = D.today()
  const weekday = D.weekday(today)
  const saturday = D.addDays(today, (6 - weekday + 7) % 7 || 7)
  return [[today, 'Today'], [D.addDays(today, 1), 'Tomorrow'], [saturday, weekday === 6 || weekday === 0 ? 'Next weekend' : 'Weekend'], ['', 'No date']]
}

export function QuickAdd({ close, onSwitch }: { close: () => void; onSwitch: (kind: AddKind) => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [error, setError] = useState('')
  const options = whenOptions()
  const goals: [string, string][] = [['', 'No goal'], ...data.goals.filter((g) => g.status === 'active').map((g): [string, string] => [g.id, g.name])]

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const title = formText(form, 'title')
    setError(title ? '' : 'Type the task first.')
    if (!title) return focusFirstInvalid(form)
    const when = String(fd.get('when') || '')
    const label = when === D.today() ? 'Added to today' : when ? `Added for ${D.relative(when).toLowerCase()}` : 'Added to your list (no date)'
    const saved = await actions.tasks.add({ title, scheduledDate: when || null, priority: fd.get('must') ? 'high' : 'medium', goalId: String(fd.get('goalId') || '') || null }, label)
    if (saved) closeDialog(form)
  }

  const more: [AddKind, string, string][] = [['opportunity', 'career', 'Opportunity'], ['event', 'calendar', 'Event'], ['evidence', 'award', 'Evidence'], ['goal', 'goals', 'Goal'], ['note', 'edit', 'Reflection'], ['project', 'code', 'Project'], ['milestone', 'flag', 'Milestone']]

  return (
    <Dialog foot={<><span className="xs muted hide-phone qa-hint"><kbd>Enter</kbd> to add</span><span className="spacer" /><button className="btn" data-close type="button">Cancel</button><SubmitButton>Add task</SubmitButton></>} onClose={close} onSubmit={submit} title="Add">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="qa-title">Task</label>
          <input aria-errormessage={error ? 'qa-title-err' : undefined} aria-invalid={error ? true : undefined} autoComplete="off" className="input input-lg" id="qa-title" maxLength={200} name="title" placeholder="What needs to happen?" />
          <FieldError error={error} id="qa-title-err" />
        </div>
        <Segmented defaultValue={options[0]![0]} label="When" name="when" options={options} />
        <div className="form-row">
          <Field id="qa-goal" label="Moves goal" name="goalId" options={goals} type="select" />
          <div className="field"><span className="field-label">Priority</span><label className="check-line check-line-box"><input name="must" type="checkbox" /> Must do</label></div>
        </div>
        <div className="qa-more">
          <span className="xs muted">Or add</span>
          <div className="qa-more-list">
            {more.map(([kind, icon, label]) => <button className="btn btn-sm" key={kind} onClick={(event) => { closeDialog(event.currentTarget.form!); window.setTimeout(() => onSwitch(kind), 0) }} type="button"><Icon className="icon-sm" name={icon} />{label}</button>)}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Search ---------------------------------------------------------------------------------- */
const JUMP: [string, string, string][] = [['today', 'Today', '#/today'], ['plan', 'Plan', '#/plan'], ['goals', 'Goals', '#/goals'], ['career', 'Career', '#/career'], ['growth', 'Growth', '#/growth'], ['review', 'Review', '#/review'], ['settings', 'Settings', '#/settings']]

export function Search({ close }: { close: () => void }) {
  const { data } = useHop()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const results: SearchResult[] = useMemo(() => query.trim() ? search(data, query) : JUMP.map(([icon, title, href]) => ({ group: 'Go to', icon, title, meta: '', href })), [data, query])
  const current = Math.min(active, results.length - 1)

  useEffect(() => { box.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }) }, [current])

  function go(result: SearchResult | undefined, form: HTMLFormElement | null) {
    if (!result || !form) return
    closeDialog(form)
    navigate(result.href)
  }

  return (
    <Dialog className="search-dialog" foot={false} onClose={close} title="Search Hop">
      <div className="search-box">
        <Icon name="search" />
        <input
          aria-activedescendant={results.length ? `sr-${current}` : undefined}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded="true"
          aria-label="Search Hop"
          autoComplete="off"
          className="search-input"
          id="search-q"
          onChange={(event) => { setQuery(event.target.value); setActive(0) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(results.length, 1))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              go(results[current], event.currentTarget.form)
            }
          }}
          placeholder="Goals, tasks, companies, people, skills…"
          role="combobox"
          type="search"
          value={query}
        />
      </div>
      <div aria-label="Results" className="search-results" id="search-results" ref={box} role="listbox">
        {results.length === 0 && <p className="search-empty">No results for “{query}”. Try a company, skill or part of a task title.</p>}
        {results.map((result, index) => (
          <div key={`${result.href}-${index}`} style={{ display: 'contents' }}>
            {(index === 0 || results[index - 1]!.group !== result.group) && <div className="search-group" role="presentation">{result.group}</div>}
            <a aria-selected={index === current} className={`search-item${index === current ? ' is-active' : ''}`} data-close href={result.href} id={`sr-${index}`} role="option">
              <Icon className="icon-sm" name={result.icon} /><span className="search-title">{result.title}</span>{result.meta && <span className="xs muted">{result.meta}</span>}
            </a>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

/* ---- Notifications ----------------------------------------------------------------------------- */
export function Notifications({ close }: { close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const [list] = useState(() => notificationsFor(data))
  const read = data.settings.readNotifications
  const groups: [AttentionItem['level'], string][] = [['critical', 'Urgent'], ['important', 'Important'], ['info', 'For review']]

  return (
    <Dialog
      className="drawer"
      foot={<><a className="btn btn-ghost" data-close href="#/settings/notifications"><Icon className="icon-sm" name="settings" />Settings</a><span className="spacer" />{list.length > 0 && <button className="btn" data-close type="button">Mark all as read</button>}</>}
      // Opening the panel marks what it showed as seen.
      onClose={() => { actions.settings.markRead(list.map((item) => item.title)); close() }}
      title="Notifications"
    >
      {list.length ? groups.map(([level, label]) => {
        const items = list.filter((item) => item.level === level)
        if (!items.length) return null
        return (
          <section className="section notif-group" key={level}>
            <h3 className="group-label">{label}</h3>
            <div className="rows">
              {items.map((item) => (
                <a className={`attn attn-${item.level} attn-link${read.includes(item.title) ? ' is-read' : ''}`} data-close href={item.href} key={item.title}>
                  <span className="attn-icon"><Icon name={item.icon} /></span>
                  <span className="attn-body"><span className="attn-title">{!read.includes(item.title) && <span aria-label="Unread" className="unread-dot" />}{item.title}</span><span className="attn-detail">{item.detail}</span></span>
                </a>
              ))}
            </div>
          </section>
        )
      }) : <div className="empty"><Pad size={28} /><h3>You’re all caught up</h3><p>Hop notifies you about deadlines, interviews, follow-ups and reviews. Nothing needs you right now.</p></div>}
    </Dialog>
  )
}

/* ---- Reflection --------------------------------------------------------------------------------- */
function Scale({ name, label, value }: { name: string; label: string; value: number | null | undefined }) {
  return <Segmented defaultValue={value ? String(value) : undefined} label={<>{label} <span className="optional">(optional)</span></>} name={name} options={[1, 2, 3, 4, 5].map((n): [string, string] => [String(n), String(n)])} />
}

export function ReflectionEditor({ date, close }: { date: string; close: () => void }) {
  const { data } = useHop()
  const actions = useActions()
  const existing: Partial<Reflection> = data.reflections.find((r) => r.date === date) ?? {}

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form)
    const values = {
      accomplished: formText(form, 'accomplished'),
      learned: formText(form, 'learned'),
      badly: formText(form, 'badly'),
      tomorrow: formText(form, 'tomorrow'),
      energy: Number(fd.get('energy')) || null,
      focus: Number(fd.get('focus')) || null,
    }
    if (!values.accomplished && !values.learned && !values.tomorrow) {
      form.querySelector('textarea')?.focus()
      return 'Write at least one answer, or press Cancel.'
    }
    if (await actions.review.saveReflection(date, values, !existing.id && Boolean(fd.get('asTask')))) closeDialog(form)
  }

  return (
    <Dialog desc="Short answers are fine. Skip anything that doesn’t apply." foot={<><button className="btn" data-close type="button">Cancel</button><SubmitButton>Save reflection</SubmitButton></>} onClose={close} onSubmit={submit} title={date === D.today() ? 'Today’s reflection' : `Reflection for ${D.withDay(date)}`}>
      <div className="form-grid">
        <Field defaultValue={existing.accomplished} label="What did you get done?" name="accomplished" rows={2} type="textarea" />
        <Field defaultValue={existing.learned} label="What did you learn?" name="learned" rows={2} type="textarea" />
        <Field defaultValue={existing.badly} label="What didn’t go well?" name="badly" optional rows={2} type="textarea" />
        <Field defaultValue={existing.tomorrow} label="What comes first tomorrow?" maxLength={200} name="tomorrow" />
        {!existing.id && <label className="check-line"><input defaultChecked name="asTask" type="checkbox" /> Put that on tomorrow’s plan</label>}
        <div className="form-row"><Scale label="Energy" name="energy" value={existing.energy} /><Scale label="Focus" name="focus" value={existing.focus} /></div>
      </div>
    </Dialog>
  )
}

/* ---- Phone "More" sheet ------------------------------------------------------------------------- */
export function MoreSheet({ close }: { close: () => void }) {
  const items: [string, string, string][] = [['calendar', 'Calendar', 'Events, tasks and deadlines by day'], ['goals', 'Goals', 'Where you’re going'], ['growth', 'Growth', 'Skills, projects and evidence'], ['review', 'Review', 'Weekly and monthly reviews, reflections'], ['settings', 'Settings', 'Profile, backups, security']]
  return (
    <Dialog foot={false} onClose={close} title="More">
      <nav aria-label="More sections" className="rows">
        {items.map(([key, label, sub]) => <a className="row settings-link" data-close href={`#/${key}`} key={key}><Icon name={key} /><span className="row-main"><span className="row-title">{label}</span><span className="row-meta">{sub}</span></span><Icon className="icon-sm" name="chevron" /></a>)}
      </nav>
    </Dialog>
  )
}
