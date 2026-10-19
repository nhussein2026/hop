// Notes: anything to remember later, pinned ones first, including notes from the İTÜ library; and
// the accounts and subscriptions you use, with what they cost and when they renew. Never their
// passwords: those belong in a password manager.
import { useEffect, useState } from 'react'
import { RENEWAL_NOTICE_DAYS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { money, monthlyTotals, nextRenewal, renewingSoon } from '../lib/accounts.ts'
import { ACCOUNT_STATUS, BILLING_CYCLE_LABEL } from '../lib/labels.ts'
import { navigate } from '../lib/router.ts'
import type { Route } from '../lib/router.ts'
import { plural } from '../lib/rules.ts'
import type { Account, Resource } from '../lib/types.ts'
import { sortNotes, titleFrom } from '../lib/notes.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { InlineAdd } from '../components/rows.tsx'
import { Badge, Banner, Empty, Menu, RowFilter, Tabs } from '../components/ui.tsx'
import { useConfirm } from '../components/confirm.tsx'
import { useHop } from '../store/store.ts'
import { useAccountActions } from '../store/account-actions.ts'
import { useUniActions } from '../store/uni-actions.ts'

export function Notes({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const tab = route.params[0] === 'accounts' ? 'accounts' : 'notes'
  const notes = data.resources.filter((r) => r.kind === 'note')

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Notes</h1><p>{tab === 'accounts' ? 'Which login each service uses, what it costs, and when it renews.' : 'Anything you want to find again later.'}</p></div>
        <div className="page-head-actions">
          {tab === 'accounts'
            ? <button className="btn btn-primary" onClick={() => editors.account()} type="button"><Icon className="icon-sm" name="plus" />Add account</button>
            : <button className="btn btn-primary" onClick={() => editors.note()} type="button"><Icon className="icon-sm" name="plus" />New note</button>}
        </div>
      </header>
      <Tabs active={tab} items={[['notes', 'Notes', '#/notes', notes.length], ['accounts', 'Accounts', '#/notes/accounts', data.accounts.filter((a) => a.status !== 'cancelled').length]]} label="Notes sections" />
      {tab === 'accounts' ? <Accounts accountId={route.query.account} /> : <NoteList noteId={route.query.note} />}
    </div>
  )
}

/* ---- Notes ------------------------------------------------------------------------------- */
function NoteList({ noteId }: { noteId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const [topic, setTopic] = useState('')
  const notes = data.resources.filter((r) => r.kind === 'note')

  // Links such as #/notes?note=<id> open the note once, then drop the query.
  useEffect(() => {
    if (!noteId) return
    navigate('#/notes')
    const note = data.resources.find((r) => r.id === noteId)
    if (note) editors.editResource(note)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  const add = (text: string) => actions.library.add({ kind: 'note', title: titleFrom(text), body: text, topics: topic ? [topic] : [] }, null, 'Note saved')
  const topics = [...new Set(notes.flatMap((n) => n.topics))].sort()
  const list = sortNotes(notes.filter((n) => !topic || n.topics.includes(topic)))

  return (
    <>
      <InlineAdd emptyMessage="Type the note first, then press Add." id="note-quick" label="Quick note" onAdd={add} placeholder={topic ? `A quick ${topic} note, then Enter` : 'A quick note, then Enter. For more, use New note.'} />
      {notes.length > 0 && (
        <div className="toolbar">
          {topics.length > 0 && (
            <div aria-label="Topic" className="chips" role="group">
              <button aria-pressed={!topic} className="chip chip-sm" onClick={() => setTopic('')} type="button">All</button>
              {topics.map((t) => <button aria-pressed={topic === t} className="chip chip-sm" key={t} onClick={() => setTopic(topic === t ? '' : t)} type="button">{t}</button>)}
            </div>
          )}
          <RowFilter id="notes-search" label="Filter notes" placeholder="Filter notes" target="#notes-list" />
        </div>
      )}
      {list.length
        ? <><div className="rows" id="notes-list">{list.map((n) => <NoteRow key={n.id} note={n} />)}</div><p className="small muted filter-empty" hidden>No note matches that filter.</p></>
        : notes.length
          ? <p className="small muted">No notes on {topic}.</p>
          : <Empty body="Type it above and press Enter: a bus time, a phrase, an idea, a room number. Pin what you look up often." icon="notes" pad={false} title="No notes yet" />}
    </>
  )
}

export function NoteRow({ note: n }: { note: Resource }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const confirm = useConfirm()
  const course = data.courses.find((c) => c.id === n.courseId)
  // Under the title, the rest of the note; a quick note's first line is its title already.
  const lines = n.body.trim().split('\n')
  const rest = (lines[0]?.trim() === n.title ? lines.slice(1) : lines).join(' ').trim()

  async function remove() {
    if (await confirm({ title: 'Delete this note?', body: `“${n.title}” is deleted.`, confirmLabel: 'Delete', tone: 'danger' })) void actions.library.remove(n)
  }

  return (
    <div className={`row row-link note-row${n.pinned ? ' is-pinned' : ''}`}>
      <span aria-hidden="true" className="type-tile type-note"><Icon name={n.pinned ? 'pinned' : 'notes'} /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.editResource(n)} type="button">{n.title}</button>
        {rest && <p className="note-excerpt">{rest}</p>}
        <div className="row-meta">
          {n.pinned && <span><Icon name="pin" />Pinned</span>}
          {course && <span><Icon name="school" />{course.code}</span>}
          <span>Edited {D.relative(D.ymdOf(n.updatedAt)).toLowerCase()}</span>
          {n.topics.map((t) => <span className="tag tag-sm" key={t}>{t}</span>)}
        </div>
      </div>
      <div className="row-actions">
        <Menu items={[
          n.pinned
            ? { label: 'Unpin', icon: 'pin', onSelect: () => void actions.library.update(n, { pinned: false }, 'Unpinned') }
            : { label: 'Pin to the top', icon: 'pin', onSelect: () => void actions.library.update(n, { pinned: true }, 'Pinned') },
          { label: 'Make it a task', icon: 'check', onSelect: () => editors.task(null, { title: n.title, description: n.body }) },
          '-',
          { label: 'Delete', icon: 'trash', onSelect: () => void remove(), danger: true },
        ]} label={`Actions for ${n.title}`} />
      </div>
    </div>
  )
}

/* ---- Accounts ---------------------------------------------------------------------------- */
function Accounts({ accountId }: { accountId?: string }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()

  useEffect(() => {
    if (!accountId) return
    navigate('#/notes/accounts')
    const account = data.accounts.find((a) => a.id === accountId)
    if (account) editors.account(account)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const privacy = <p className="small muted privacy-line"><Icon className="icon-sm" name="shield" />Passwords and card numbers stay in your password manager (Bitwarden is free). Hop keeps the rest.</p>
  if (!data.accounts.length) return <>{privacy}<Empty action={() => editors.account()} actionLabel="Add account" body="Each service you use: the email it’s on, what it’s for, and, for subscriptions, the cost and renewal day. Hop warns you before trials start charging." icon="key" pad={false} title="No accounts yet" /></>

  const byName = (a: Account, b: Account) => a.name.localeCompare(b.name)
  const subscriptions = data.accounts.filter((a) => a.status !== 'cancelled' && (a.cycle !== 'none' || a.status === 'trial')).sort((a, b) => (nextRenewal(a, today) ?? '9999').localeCompare(nextRenewal(b, today) ?? '9999') || byName(a, b))
  const free = data.accounts.filter((a) => a.status !== 'cancelled' && a.cycle === 'none' && a.status !== 'trial').sort(byName)
  const cancelled = data.accounts.filter((a) => a.status === 'cancelled').sort(byName)
  const totals = monthlyTotals(data.accounts)
  const soon = renewingSoon(data.accounts, today)

  return (
    <>
      {privacy}
      {soon.map(({ account: a, date }) => (
        <Banner action={<button className="btn btn-sm" onClick={() => editors.account(a)} type="button">Open</button>} icon={a.status === 'trial' ? 'alert' : 'refresh'} key={a.id} title={a.status === 'trial' ? `${a.name}: free trial ends ${D.relative(date, today).toLowerCase()}.` : `${a.name} renews ${D.relative(date, today).toLowerCase()}${a.cost ? ` for ${money(a.cost, a.currency)}` : ''}.`} tone={a.status === 'trial' ? 'warning' : 'info'}>
          {a.status === 'trial' ? 'Cancel before then if you don’t want to pay for it.' : 'Still using it? If not, cancel it today.'}
        </Banner>
      ))}
      {subscriptions.length > 0 && (
        <section aria-labelledby="subs-h" className="section">
          <div className="section-head"><h2 id="subs-h">Subscriptions</h2>{totals.length > 0 && <span className="small muted num">{totals.map(([currency, total]) => money(Math.round(total * 100) / 100, currency)).join(' + ')} a month</span>}</div>
          <div className="rows">{subscriptions.map((a) => <AccountRow account={a} key={a.id} />)}</div>
        </section>
      )}
      {free.length > 0 && (
        <section aria-labelledby="free-h" className="section">
          <div className="section-head"><h2 id="free-h">Accounts</h2></div>
          <div className="rows">{free.map((a) => <AccountRow account={a} key={a.id} />)}</div>
        </section>
      )}
      {cancelled.length > 0 && (
        <details className="done-list">
          <summary>Cancelled <span className="count">{cancelled.length}</span></summary>
          <div className="rows">{cancelled.map((a) => <AccountRow account={a} key={a.id} />)}</div>
        </details>
      )}
      <p className="xs muted">Renewals and trial ends show in Today’s Needs attention {plural(RENEWAL_NOTICE_DAYS, 'day')} ahead.</p>
    </>
  )
}

function AccountRow({ account: a }: { account: Account }) {
  const editors = useEditors()
  const actions = useAccountActions()
  const today = D.today()
  const next = nextRenewal(a, today)
  const near = next && D.diffDays(next, today) <= RENEWAL_NOTICE_DAYS
  const [label, tone] = ACCOUNT_STATUS[a.status]
  return (
    <div className="row row-link">
      <span aria-hidden="true" className="type-tile type-repo"><Icon name="key" /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.account(a)} type="button">{a.name}</button>
        <div className="row-meta">
          {a.login && <span><Icon name="user" />{a.login}</span>}
          {a.purpose && <span>{a.purpose}</span>}
          {a.cost !== null && a.cycle !== 'none' && <span className="num">{money(a.cost, a.currency)} {BILLING_CYCLE_LABEL[a.cycle]}</span>}
          {next && <span className={near ? 'is-warning' : ''}><Icon name="calendar" />{a.status === 'trial' ? 'Trial ends' : 'Renews'} {D.relative(next, today).toLowerCase()}</span>}
          {a.payment && <span>{a.payment}</span>}
          {a.secretIn && <span><Icon name="shield" />Password in {a.secretIn}</span>}
          {a.status !== 'active' && <Badge tone={tone}>{label}</Badge>}
        </div>
      </div>
      <div className="row-actions">
        {a.url && <a aria-label={`Open ${a.name}`} className="icon-btn" href={a.url} rel="noopener noreferrer" target="_blank"><Icon name="external" /></a>}
        <Menu items={[
          { label: 'Edit', icon: 'edit', onSelect: () => editors.account(a) },
          a.status === 'cancelled'
            ? { label: 'Active again', icon: 'refresh', onSelect: () => void actions.update(a, { status: 'active' }, `${a.name} is active again`, true) }
            : { label: 'Mark cancelled', icon: 'x', onSelect: () => void actions.update(a, { status: 'cancelled' }, `${a.name} marked cancelled`, true) },
        ]} label={`Actions for ${a.name}`} />
      </div>
    </div>
  )
}
