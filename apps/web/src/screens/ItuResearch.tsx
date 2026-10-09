// Research: the thesis, from topic to defense, and ideas moving from a spark to active work.
import { useEffect } from 'react'
import * as D from '../lib/dates.ts'
import { plural } from '../lib/rules.ts'
import { navigate } from '../lib/router.ts'
import type { Idea } from '../lib/types.ts'
import { IDEA_KINDS, IDEA_STAGES, IDEA_STAGE_LABEL, THESIS_STEPS } from '../lib/labels.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Empty } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { useUniActions } from '../store/uni-actions.ts'

const LIVE_ORDER = ['active', 'proposed', 'validated', 'exploring', 'spark']

function IdeaRow({ idea }: { idea: Idea }) {
  const editors = useEditors()
  const current = IDEA_STAGES.indexOf(idea.stage)
  return (
    <div className="row row-link idea-row">
      <span aria-hidden="true" className="type-tile"><Icon name="bulb" /></span>
      <div className="row-main">
        <button className="row-open" onClick={() => editors.ideaDrawer(idea)} type="button">{idea.title}</button>
        <div className="row-meta">
          <span>{IDEA_KINDS.find(([kind]) => kind === idea.kind)?.[1]}</span>
          {idea.nextStep && <span><b>Next:</b>&nbsp;{idea.nextStep}</span>}
          <span><Icon name="book" />{idea.resourceIds.length}</span>
          {idea.advisorIds.length > 0 && <span><Icon name="user" />{idea.advisorIds.length}</span>}
        </div>
      </div>
      <div className="opp-stage">
        <span aria-label={IDEA_STAGE_LABEL[idea.stage]} className={`stage-track${idea.stage === 'parked' ? ' closed' : ''}`} role="img">
          {IDEA_STAGES.map((stage, index) => <i className={index < current ? 'on' : index === current ? 'now' : ''} key={stage} />)}
        </span>
        <span className="xs muted">{IDEA_STAGE_LABEL[idea.stage]}</span>
      </div>
    </div>
  )
}

export function Research({ query }: { query: Record<string, string> }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = useUniActions()
  const today = D.today()
  const program = data.settings.program

  // Links such as #/itu/research?idea=<id> open the idea once, then drop the query.
  useEffect(() => {
    if (!query.idea) return
    const idea = data.ideas.find((i) => i.id === query.idea)
    navigate('#/itu/research')
    if (idea) editors.ideaDrawer(idea)
    // Open once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.idea])

  const step = THESIS_STEPS.findIndex(([key]) => key === program.thesisStep)
  const nextStep = THESIS_STEPS[step + 1]
  const advisor = data.contacts.find((c) => c.id === program.advisorId)
  const deadline = data.keyDates.find((k) => /advisor|danışman/i.test(k.title) && k.date >= today)
  const daysToDeadline = deadline ? D.diffDays(deadline.date, today) : 0
  const candidates = [...new Set(data.ideas.filter((i) => i.kind === 'thesis' && i.stage !== 'parked').flatMap((i) => i.advisorIds))].map((id) => data.contacts.find((c) => c.id === id)).filter((c) => c !== undefined)
  const live = data.ideas.filter((i) => i.stage !== 'parked').sort((a, b) => LIVE_ORDER.indexOf(a.stage) - LIVE_ORDER.indexOf(b.stage) || b.updatedAt.localeCompare(a.updatedAt))
  const parked = data.ideas.filter((i) => i.stage === 'parked')
  const advisorQuestions = data.resources.find((r) => r.kind === 'note' && /advisor/i.test(r.title))

  return (
    <>
      <section aria-labelledby="th-h" className="panel panel-pad thesis-card">
        <div className="section-head">
          <h2 id="th-h">{program.degree ? `${program.degree} thesis` : 'Thesis'}</h2>
          {deadline && <Badge icon="flag" tone={daysToDeadline <= 14 ? 'warning' : 'info'}>Advisor deadline in {plural(daysToDeadline, 'day')}</Badge>}
        </div>
        <ol aria-label="Thesis progress" className="stepper thesis-steps">
          {THESIS_STEPS.map(([key, label], index) => <li aria-current={index === step ? 'step' : undefined} className={`step ${index < step ? 'done' : index === step ? 'current' : ''}`} key={key}><span className="step-dot" />{label}</li>)}
        </ol>
        <div className="thesis-now">
          {advisor
            ? <p className="small"><strong>Advisor:</strong> {advisor.name}</p>
            : <p className="small"><strong>No advisor yet.</strong> {candidates.length ? `From your ideas, possible advisors are ${candidates.map((c) => c.name).join(' and ')}.` : 'Link possible advisors to your thesis ideas.'}</p>}
          <div className="btn-row">
            {advisor
              ? nextStep && <button className="btn btn-sm" onClick={() => void actions.terms.setProgram({ thesisStep: nextStep[0] as typeof program.thesisStep }, `Thesis moved to ${nextStep[1].toLowerCase()}`)} type="button"><Icon className="icon-sm" name="arrowRight" />Move to {nextStep[1].toLowerCase()}</button>
              : <button className="btn btn-sm" onClick={() => editors.advisor(program)} type="button"><Icon className="icon-sm" name="user" />Set advisor</button>}
            {advisor && <button className="btn btn-sm btn-ghost" onClick={() => editors.advisor(program)} type="button">Change advisor</button>}
            {advisorQuestions && <a className="btn btn-sm btn-ghost" href={`#/itu/library?item=${advisorQuestions.id}`}>{advisorQuestions.title}</a>}
          </div>
        </div>
      </section>

      <section aria-labelledby="id-h" className="section">
        <div className="section-head"><h2 id="id-h">Ideas <span className="count">{live.length}</span></h2><span className="section-meta">Thesis, paper and project ideas, from spark to active</span></div>
        {live.length
          ? <div className="rows">{live.map((idea) => <IdeaRow idea={idea} key={idea.id} />)}</div>
          : <Empty action={() => editors.idea()} actionLabel="New idea" body="Write down research questions as they come: from a lecture, a paper, a Radar find. Most start as a spark." icon="bulb" pad={false} title="No ideas yet" />}
      </section>
      {parked.length > 0 && (
        <details className="section-details">
          <summary><h2>Parked <span className="count">{parked.length}</span></h2></summary>
          <div className="rows">{parked.map((idea) => <IdeaRow idea={idea} key={idea.id} />)}</div>
        </details>
      )}
    </>
  )
}
