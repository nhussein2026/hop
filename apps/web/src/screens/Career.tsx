// Career: opportunities, people, resumes, analytics. The list answers "what needs me?" before
// "what exists?".
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as D from '../lib/dates.ts'
import { STAGES, STAGE_LABEL, capitalize, followUp, funnel, groupRates, isClosed, isOpen, lastActivity, nextEvent, oppHealth, orgOf, plural, rank, sortTasks } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Route } from '../lib/router.ts'
import type { Opportunity, Resume } from '../lib/types.ts'
import { useActions } from '../store/actions.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { InlineAdd, OppRow, OrgMark, TaskRow } from '../components/rows.tsx'
import { Badge, Banner, DateChip, Empty, Menu, RowFilter, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { ACTIVITY_TYPES, OPPORTUNITY_TYPES, RESUME_FILE_LABEL, initials, interactionIcon, sizeLabel } from '../lib/labels.ts'
import { placeOf } from '../lib/rules.ts'

function Shell({ tab, actions, children }: { tab: string; actions?: ReactNode; children: ReactNode }) {
  const { data } = useHop()
  const active = data.opportunities.filter((o) => !isClosed(o)).length
  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Career</h1><p>Roles and programs you’re pursuing, the people involved, and what’s working.</p></div>
        <div className="page-head-actions">{actions}</div>
      </header>
      <Tabs active={tab} items={[['opps', 'Opportunities', '#/career', active], ['people', 'People', '#/career/people'], ['resumes', 'Resumes', '#/career/resumes'], ['analytics', 'Analytics', '#/career/analytics']]} label="Career sections" />
      {children}
    </div>
  )
}

export function Career({ route }: { route: Route }) {
  const editors = useEditors()
  const section = route.params[0]
  if (section === 'people') return <Shell actions={<button className="btn btn-primary" onClick={() => editors.contact()} type="button"><Icon className="icon-sm" name="plus" />Add person</button>} tab="people"><People contactId={route.query.contact} /></Shell>
  if (section === 'resumes') return <Shell actions={<button className="btn btn-primary" onClick={() => editors.resume()} type="button"><Icon className="icon-sm" name="plus" />Add version</button>} tab="resumes"><Resumes /></Shell>
  if (section === 'analytics') return <Shell tab="analytics"><Analytics /></Shell>
  if (section) return <OpportunityDetail id={section} />
  return <Shell actions={<button className="btn btn-primary" onClick={() => editors.opportunity()} type="button"><Icon className="icon-sm" name="plus" />Add opportunity</button>} tab="opps"><Opportunities /></Shell>
}

/* ---- Opportunities -------------------------------------------------------------------------- */
function Opportunities() {
  const { data, ui, setUi } = useHop()
  const editors = useEditors()
  const today = D.today()
  if (!data.opportunities.length) return <Empty action={() => editors.opportunity()} actionLabel="Add opportunity" body="Save a role, internship or program as soon as you find it. You can apply later." title="No opportunities yet" />
  const withHealth = data.opportunities.map((o) => ({ o, h: oppHealth(o, today, data.settings.followUpDays) }))
  const filter = ui.oppFilter
  const counts: Record<string, number> = {
    active: withHealth.filter((x) => x.h.key !== 'closed').length,
    attention: withHealth.filter((x) => x.h.key === 'attention').length,
    closed: withHealth.filter((x) => x.h.key === 'closed').length,
  }
  const chip = (key: string, label: string) => <button aria-pressed={filter === key} className="chip" onClick={() => setUi({ oppFilter: key })} type="button">{label} <span className={`count${key === 'attention' && counts.attention ? ' count-attention' : ''}`}>{counts[key]}</span></button>

  let body: ReactNode
  if (filter === 'closed') {
    const closed = withHealth.filter((x) => x.h.key === 'closed').sort((a, b) => (b.o.closedAt ?? '').localeCompare(a.o.closedAt ?? ''))
    body = closed.length ? <div className="rows" id="opp-list">{closed.map((x) => <OppRow key={x.o.id} opportunity={x.o} />)}</div> : <p className="muted small">No closed opportunities.</p>
  } else {
    const list = withHealth.filter((x) => (filter === 'attention' ? x.h.key === 'attention' : x.h.key !== 'closed'))
    const groups: [string, typeof list][] = ([
      ['Needs your attention', list.filter((x) => x.h.key === 'attention')],
      ['In process', list.filter((x) => x.h.key !== 'attention' && rank(x.o.stage) >= rank('applied'))],
      ['Not applied yet', list.filter((x) => x.h.key !== 'attention' && rank(x.o.stage) < rank('applied'))],
    ] as [string, typeof list][]).filter(([, items]) => items.length)
    body = groups.length
      ? <div className="stack stack-sm" id="opp-list">{groups.map(([label, items]) => <section className="section" key={label}><h2 className="group-label">{label} <span className="count">{items.length}</span></h2><div className="rows">{items.map((x) => <OppRow key={x.o.id} opportunity={x.o} />)}</div></section>)}</div>
      : <Empty body="No deadlines this week, no overdue follow-ups." icon="check" pad={false} title="Nothing needs attention" />
  }

  return (
    <>
      <div className="toolbar">
        <div aria-label="Show" className="chips" role="group">{chip('active', 'Active')}{chip('attention', 'Needs attention')}{chip('closed', 'Closed')}</div>
        <RowFilter id="opp-search" label="Filter opportunities" placeholder="Company, role or technology" target="#opp-list" />
      </div>
      <div>
        {body}
        <p className="small muted filter-empty" hidden>No opportunities match that filter.</p>
      </div>
    </>
  )
}

/* ---- Opportunity detail ------------------------------------------------------------------------- */
function OpportunityDetail({ id }: { id: string }) {
  const { data } = useHop()
  const actions = useActions()
  const editors = useEditors()
  const o = data.opportunities.find((x) => x.id === id)

  useEffect(() => {
    // Keep the current stage visible on narrow screens.
    const current = document.querySelector<HTMLElement>('.stepper .current')
    if (current?.parentElement) current.parentElement.scrollLeft = current.offsetLeft - current.parentElement.clientWidth / 2
  }, [o?.stage])

  if (!o) return <div className="page"><Empty body={<a href="#/career">Back to opportunities</a>} icon="alert" pad={false} title="This opportunity doesn’t exist anymore" /></div>

  const today = D.today()
  const closed = isClosed(o)
  const days = data.settings.followUpDays
  const health = oppHealth(o, today, days)
  const fu = followUp(o, today, days)
  const tasks = sortTasks(data.tasks.filter((t) => t.opportunityId === o.id && isOpen(t)))
  const people = data.contacts.filter((c) => o.contactIds.includes(c.id))
  const unlinked = data.contacts.filter((c) => !o.contactIds.includes(c.id))
  const current = rank(closed ? o.reachedStage ?? 'applied' : o.stage)
  const prepLeft = o.prep.filter((p) => !p.done).length
  const next = nextEvent(o)
  const last = lastActivity(o)
  const org = orgOf(o)
  const careerGoal = data.goals.find((g) => g.area === 'Career' && g.status === 'active')
  const usedResume = data.resumes.find((r) => r.id === o.resumeId)
  return (
    <div className="page">
      <header className="page-head detail-head">
        <div className="opp-head">
          <OrgMark large name={org} />
          <div className="page-head-text">
            <h1 tabIndex={-1}>{o.title}</h1>
            <p className="opp-sub"><strong>{org}</strong><span>{placeOf(o)}</span><span>{OPPORTUNITY_TYPES.find(([value]) => value === o.type)?.[1] ?? o.type}</span>{o.source && <span>via {o.source}</span>}</p>
          </div>
        </div>
        <div className="page-head-actions">
          {o.url && <a className="btn" href={/^https?:\/\//.test(o.url) ? o.url : `https://${o.url}`} rel="noopener noreferrer" target="_blank"><Icon className="icon-sm" name="external" />Posting</a>}
          {closed
            ? <button className="btn" onClick={() => void actions.opportunities.reopen(o)} type="button">Reopen</button>
            : <button className="btn btn-primary" onClick={() => editors.logActivity(o)} type="button"><Icon className="icon-sm" name="plus" />Log activity</button>}
          <Menu items={[
            { label: 'Edit details', icon: 'edit', onSelect: () => editors.opportunity(o) },
            ...(closed ? [] : [{ label: 'Close with outcome…', icon: 'archive', onSelect: () => editors.closeOpportunity(o) }]),
          ]} label="Opportunity actions" />
        </div>
      </header>

      {closed && <Banner icon="archive" title={`Closed: ${STAGE_LABEL[o.stage]}.`} tone="info">{o.reachedStage ? `Reached ${STAGE_LABEL[o.reachedStage]} before closing. ` : ''}History stays for your analytics.</Banner>}

      <section aria-labelledby="stage-h" className="panel panel-pad stage-panel">
        <div className="section-head"><h2 id="stage-h">Stage</h2>{!closed && <span className="section-meta">Select a stage to move it. Going back is fine.</span>}</div>
        <div className="stepper" role="list">
          {STAGES.map((stage, index) => (
            <button
              aria-current={index === current ? 'step' : undefined}
              aria-label={`${STAGE_LABEL[stage]}${index === current ? ', current stage' : index < current ? ', passed' : ''}`}
              className={`step ${index < current ? 'done' : index === current ? 'current' : ''}`}
              disabled={closed}
              key={stage}
              onClick={() => { if (stage !== o.stage) void actions.opportunities.moveStage(o, stage) }}
              role="listitem"
              type="button"
            ><span className="step-dot" />{STAGE_LABEL[stage]}</button>
          ))}
        </div>
      </section>

      <div className="split">
        <div className="stack">
          {!closed && (
            <section aria-labelledby="next-h2" className="section">
              <div className="section-head"><h2 id="next-h2">Next</h2><Badge icon={health.tone === 'warning' || health.tone === 'danger' ? 'alert' : health.key === 'upcoming' ? 'calendar' : null} tone={health.tone}>{health.label}</Badge></div>
              {fu && <Banner action={<button className="btn btn-sm" onClick={() => void actions.opportunities.logFollowUp(o, days)} type="button">I sent a follow-up</button>} icon="reply" title={fu.overdueBy > 0 ? `Follow-up overdue by ${plural(fu.overdueBy, 'day')}` : 'Follow up today'} tone="warning">No activity for {fu.idle} days. Your rule: follow up after {days} quiet days.</Banner>}
              {next && next.date >= today && (
                <div className="next-event">
                  <DateChip date={next.date} large />
                  <div><strong>{next.label}</strong><p className="small muted">{D.relative(next.date, today)}{next.time ? ` at ${next.time}` : ''}{prepLeft ? `. ${plural(prepLeft, 'prep item')} left.` : ''}</p></div>
                </div>
              )}
              {o.deadline && rank(o.stage) < rank('applied') && <p className="small"><strong>Application deadline:</strong> {D.long(o.deadline)} <span className="muted">({D.relative(o.deadline, today)})</span></p>}
              {tasks.length > 0 && <div className="rows">{tasks.map((t) => <TaskRow hideGoal key={t.id} showDate task={t} />)}</div>}
              <InlineAdd id="otask-add" label="Add a next action" onAdd={(title) => actions.tasks.add({ title, opportunityId: o.id, goalId: careerGoal?.id ?? null }, 'Next action added')} placeholder={`Add a next action for ${org}`} />
            </section>
          )}

          {(o.prep.length > 0 || !closed) && (
            <section aria-labelledby="prep-h" className="section">
              <div className="section-head"><h2 id="prep-h">Preparation</h2>{o.prep.length > 0 && <span className="section-meta">{o.prep.length - prepLeft} of {o.prep.length} done</span>}</div>
              <div className="rows">
                {o.prep.map((p) => (
                  <div className="row" key={p.id}>
                    <button aria-checked={p.done} aria-label={p.text} className="check check-square" onClick={() => void actions.opportunities.togglePrep(o, p.id, !p.done)} role="checkbox" type="button"><Icon name="check" /></button>
                    <div className="row-main"><span className="row-title" style={p.done ? { color: 'var(--text-muted)' } : undefined}>{p.text}</span></div>
                  </div>
                ))}
                {!closed && <InlineAdd id="prep-add" label="Add a preparation item" maxLength={160} onAdd={(text) => actions.opportunities.addPrep(o, text)} placeholder="Add a preparation item" />}
              </div>
            </section>
          )}

          <section aria-labelledby="tl-h" className="section">
            <div className="section-head"><h2 id="tl-h">Timeline</h2>{!closed && <button className="link-btn small" onClick={() => editors.logActivity(o)} type="button">Log activity</button>}</div>
            <ol className="timeline">
              {[...o.activities].sort((a, b) => b.at.localeCompare(a.at)).map((activity) => {
                const [icon, label] = ACTIVITY_TYPES[activity.type] ?? ['info', 'Update']
                return (
                  <li className="tl-item" key={activity.id}>
                    <span aria-hidden="true" className="tl-dot tl-icon"><Icon className="icon-sm" name={icon} /></span>
                    <div className="tl-body"><span className="tl-title">{activity.text}</span><span className="xs muted"><time dateTime={activity.at}>{D.withDay(D.ymdOf(activity.at))}</time>, {label.toLowerCase()}</span></div>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        <aside className="stack">
          <section className="panel panel-pad">
            <dl className="facts">
              <div><dt>Priority</dt><dd>{capitalize(o.priority)}</dd></div>
              <div><dt>Applied</dt><dd>{o.appliedDate ? D.short(o.appliedDate) : <span className="muted">Not yet</span>}</dd></div>
              <div><dt>Last activity</dt><dd>{last ? D.relative(last, today) : '—'}</dd></div>
              <div><dt>Resume</dt><dd>
                <label className="visually-hidden" htmlFor="opp-resume">Resume used</label>
                <select className="select select-inline" id="opp-resume" onChange={(event) => void actions.opportunities.update(o, { resumeId: event.target.value || null }, 'Resume recorded for this opportunity')} value={o.resumeId ?? ''}>
                  <option value="">None</option>
                  {data.resumes.map((r) => <option key={r.id} value={r.id}>v{r.version}: {r.name}</option>)}
                </select>
                {usedResume?.file && <a className="small resume-file-link" href={resumeFileUrl(usedResume)} rel="noopener" target="_blank"><Icon className="icon-sm" name="file" />Open {usedResume.file.name}</a>}
              </dd></div>
            </dl>
          </section>
          <section aria-labelledby="pp-h" className="section">
            <div className="section-head"><h2 id="pp-h">People</h2></div>
            {people.length
              ? <ul className="people-mini">{people.map((c) => <li key={c.id}><span className="avatar avatar-sm">{initials(c.name)}</span><a href={`#/career/people?contact=${c.id}`}>{c.name}</a><span className="xs muted">{c.role}</span></li>)}</ul>
              : <p className="small muted">No one linked yet. Add the recruiter or referral when you have a name.</p>}
            {unlinked.length > 0 && (
              <div>
                <label className="visually-hidden" htmlFor="opp-link-person">Link a person</label>
                <select className="select select-inline" id="opp-link-person" onChange={(event) => { if (event.target.value) void actions.opportunities.update(o, { contactIds: [...o.contactIds, event.target.value] }, 'Person linked') }} value="">
                  <option value="">Link a person…</option>
                  {unlinked.map((c) => <option key={c.id} value={c.id}>{c.name}{c.organization ? `, ${c.organization}` : ''}</option>)}
                </select>
              </div>
            )}
          </section>
          {o.technologyTags.length > 0 && <section className="section"><div className="section-head"><h2>Skills asked for</h2></div><div className="tag-list">{o.technologyTags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></section>}
          <Notes key={o.id} opportunity={o} />
        </aside>
      </div>
    </div>
  )
}

function Notes({ opportunity: o }: { opportunity: Opportunity }) {
  const actions = useActions()
  const [notes, setNotes] = useState(o.notes ?? '')
  return (
    <section aria-labelledby="nt-h" className="section">
      <div className="section-head"><h2 id="nt-h">Notes</h2></div>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void actions.opportunities.update(o, { notes: notes || null }, 'Notes saved') }}>
        <label className="visually-hidden" htmlFor="opp-notes">Notes</label>
        <textarea className="textarea" id="opp-notes" onChange={(event) => setNotes(event.target.value)} placeholder="Anything worth remembering" rows={4} value={notes} />
        <div><button className="btn btn-sm" type="submit">Save notes</button></div>
      </form>
    </section>
  )
}

/* ---- People ---------------------------------------------------------------------------------- */
function People({ contactId }: { contactId?: string }) {
  const { data } = useHop()
  const editors = useEditors()

  useEffect(() => {
    if (!contactId) return
    const contact = data.contacts.find((c) => c.id === contactId)
    navigate('#/career/people')
    if (contact) editors.contactDrawer(contact)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  if (!data.contacts.length) return <Empty action={() => editors.contact()} actionLabel="Add person" body="Recruiters, referrals and mentors you talk to about your career." title="No people yet" />
  const lastOf = (id: string) => data.interactions.filter((i) => i.contactId === id).sort((a, b) => b.date.localeCompare(a.date))[0]
  const sorted = [...data.contacts].sort((a, b) => (lastOf(b.id)?.date ?? '').localeCompare(lastOf(a.id)?.date ?? ''))
  return (
    <div className="rows">
      {sorted.map((c) => {
        const last = lastOf(c.id)
        return (
          <div className="row row-link" key={c.id}>
            <span className="avatar">{initials(c.name)}</span>
            <div className="row-main">
              <button className="row-open" onClick={() => editors.contactDrawer(c)} type="button">{c.name}</button>
              <div className="row-meta"><span>{[c.role, c.organization].filter(Boolean).join(', ') || 'No role recorded'}</span>{last && <span><Icon name={interactionIcon(last.type)} />{capitalize(last.type)} {D.relative(last.date).toLowerCase()}</span>}</div>
            </div>
            <Badge>{c.kind}</Badge>
          </div>
        )
      })}
    </div>
  )
}

/* ---- Resumes ------------------------------------------------------------------------------------ */
/** PDFs open in a new tab; Word files download. */
const resumeFileUrl = (r: Resume, download = false) => `/api/resumes/${r.id}/file${download ? '?download=1' : ''}`

function Resumes() {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useActions()
  if (!data.resumes.length) return <Empty action={() => editors.resume()} actionLabel="Add version" body="Add each version you send out, with its file. Hop will show which ones get responses." title="No resume versions yet" />
  const stats = groupRates(data.opportunities, (o) => o.resumeId)
  const latest = Math.max(...data.resumes.map((r) => r.version))
  return (
    <>
      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th>Version</th><th>Focus</th><th>File</th><th className="num">Applications</th><th className="num">Responses</th><th className="num">Interviews</th><th className="num">Response rate</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {[...data.resumes].sort((a, b) => b.version - a.version).map((r) => {
              const s = stats.find((x) => x.key === r.id) ?? { applied: 0, responses: 0, interviews: 0 }
              return (
                <tr key={r.id}>
                  <td><strong>v{r.version}</strong> {r.name} {r.archived ? <Badge>Archived</Badge> : r.version === latest ? <Badge tone="primary">Latest</Badge> : null}<span className="xs muted resume-added">Added {D.short(D.ymdOf(r.createdAt))}</span></td>
                  <td className="muted" data-label={r.focus ? 'Focus:' : undefined}>{r.focus}</td>
                  <td data-label="File:">
                    {r.file
                      ? <a className="resume-file" href={resumeFileUrl(r)} rel="noopener" target="_blank" title={`${r.file.name}, ${sizeLabel(r.file.size)}`}><Icon className="icon-sm" name="file" /><span>{RESUME_FILE_LABEL[r.file.type] ?? 'File'}</span><span className="xs muted">{sizeLabel(r.file.size)}</span></a>
                      : <button className="link-btn" onClick={() => editors.resume(r)} type="button"><Icon className="icon-sm" name="upload" />Attach file</button>}
                  </td>
                  <td className="num" data-label="Applications:">{s.applied}</td>
                  <td className="num" data-label="Responses:">{s.responses}</td>
                  <td className="num" data-label="Interviews:">{s.interviews}</td>
                  <td className="num" data-label="Response rate:">{s.applied ? `${Math.round((s.responses / s.applied) * 100)}%` : '—'}</td>
                  <td className="table-actions">
                    <Menu items={[
                      { label: 'Edit version', icon: 'edit', onSelect: () => editors.resume(r) },
                      ...(r.file ? [
                        { label: 'Download file', icon: 'download', onSelect: () => { window.location.href = resumeFileUrl(r, true) } },
                        { label: 'Remove file', icon: 'trash', onSelect: () => void actions.career.removeResumeFile(r), danger: true },
                      ] : [{ label: 'Attach file', icon: 'upload', onSelect: () => editors.resume(r) }]),
                      '-',
                      { label: r.archived ? 'Restore version' : 'Archive version', icon: 'archive', onSelect: () => void actions.career.setResumeArchived(r, !r.archived) },
                    ]} label={`Actions for v${r.version}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">Small samples. A version that “works better” may have been sent to different kinds of roles, so treat these as signals rather than proof.</p>
    </>
  )
}

/* ---- Analytics ----------------------------------------------------------------------------------- */
function Analytics() {
  const { data } = useHop()
  const f = funnel(data.opportunities)
  if (!f.n) return <Empty body="Once you apply to a few roles, Hop shows your response and interview rates here." icon="chart" pad={false} title="No applications yet" />
  const firstApplied = data.opportunities.map((o) => o.appliedDate).filter(Boolean).sort()[0]!
  const rate = (key: string) => Math.round(((f.steps.find((step) => step.key === key)?.count ?? 0) / f.n) * 100)
  const bySource = groupRates(data.opportunities, (o) => o.source)
  const months: Record<string, number> = {}
  for (const o of data.opportunities) if (o.appliedDate) months[o.appliedDate.slice(0, 7)] = (months[o.appliedDate.slice(0, 7)] ?? 0) + 1
  const monthKeys = Object.keys(months).sort()
  const maxMonth = Math.max(...Object.values(months))
  const best = bySource.filter((x) => x.applied >= 2).sort((a, b) => b.responses / b.applied - a.responses / a.applied)[0]

  return (
    <>
      <p className="small muted">Based on {plural(f.n, 'application')} since {D.short(firstApplied)}. {f.n < 20 ? 'That’s a small sample; read these as directions, not verdicts.' : ''}</p>
      <div className="metric-row">
        {([['Response rate', rate('screening'), 'Applications that got any reply'], ['Interview rate', rate('interview'), 'Applications that reached an interview'], ['Offer rate', rate('offer'), 'Applications that reached an offer']] as const).map(([label, value, detail]) => (
          <div className="metric" key={label}><span className="metric-label">{label}</span><span className="metric-value num">{value}%</span><span className="xs muted">{detail}</span></div>
        ))}
      </div>
      <section aria-labelledby="fn-h" className="panel panel-pad section">
        <div className="section-head"><h2 id="fn-h">Funnel</h2><span className="section-meta">How far each application got</span></div>
        <div className="bars">{f.steps.map((step) => <div className="bar-row" key={step.key}><span>{step.label}</span><span aria-hidden="true" className="bar"><span style={{ width: `${(step.count / f.n) * 100}%` }} /></span><span className="num">{step.count}</span></div>)}</div>
      </section>
      <div className="split split-even">
        <section aria-labelledby="src-h" className="section">
          <div className="section-head"><h2 id="src-h">By source</h2></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Source</th><th className="num">Applied</th><th className="num">Replies</th><th className="num">Rate</th></tr></thead>
            <tbody>{bySource.map((x) => <tr key={x.key}><td>{x.key}</td><td className="num">{x.applied}</td><td className="num">{x.responses}</td><td className="num">{Math.round((x.responses / x.applied) * 100)}%</td></tr>)}</tbody>
          </table></div>
          {best && <p className="small"><Icon className="icon-sm" name="info" /> <strong>{best.key}</strong> has your best reply rate among sources with 2 or more applications ({best.responses} of {best.applied}).</p>}
        </section>
        <section aria-labelledby="mo-h" className="section">
          <div className="section-head"><h2 id="mo-h">Applications per month</h2></div>
          <div className="panel panel-pad bars">{monthKeys.map((month) => <div className="bar-row" key={month}><span>{D.monthYear(`${month}-15`)}</span><span aria-hidden="true" className="bar"><span style={{ width: `${(months[month]! / maxMonth) * 100}%` }} /></span><span className="num">{months[month]}</span></div>)}</div>
        </section>
      </div>
    </>
  )
}
