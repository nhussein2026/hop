// Türkçe: the road to the C1 exam. Today is the plan to tick off, across the four skills and
// words; Progress shows whether the skills stay in step, the level checkpoints and practice tests;
// Plan is the daily routine and the track itself.
import { LANGUAGE_SKILLS, PRACTICE_AREAS, PRACTICE_SLOTS } from '@hop/domain'
import * as D from '../lib/dates.ts'
import { CATCH_UP, LEVEL_FOCUS, PRACTICE_AREA, PRACTICE_SLOT_LABEL } from '../lib/labels.ts'
import { checkpoints, dayProgress, doneSession, minutesByWeekday, planFor, recentWeeks, sessionsOn, testDue, testResult, TEST_EVERY_DAYS, weekBalance, weeklyPlan } from '../lib/practice.ts'
import { daysLabel, plural } from '../lib/rules.ts'
import type { Route } from '../lib/router.ts'
import type { LanguageTrack, PracticeActivity } from '../lib/types.ts'
import { useEditors } from '../editors/editors.tsx'
import { Icon } from '../components/Icon.tsx'
import { Badge, Banner, DateChip, Empty, Menu, ProgressBar, Tabs } from '../components/ui.tsx'
import { useHop } from '../store/store.ts'
import { sortNotes } from '../lib/notes.ts'
import { NoteRow } from './Notes.tsx'
import { usePracticeActions } from '../store/practice-actions.ts'

export function Turkish({ route }: { route: Route }) {
  const { data } = useHop()
  const editors = useEditors()
  const track = data.settings.languageTrack
  const tab = route.params[0] || 'today'
  const today = D.today()

  if (!track) {
    return (
      <div className="page">
        <header className="page-head"><div className="page-head-text"><h1 tabIndex={-1}>Türkçe</h1><p>Your road to the certificate exam, one day at a time.</p></div></header>
        <Empty
          action={() => editors.setupTrack()}
          actionLabel="Set up my track"
          body="Tell Hop your level and exam date. It plans the levels up to the exam and a daily routine that trains listening, reading, writing and speaking together, then tracks each day."
          title="Set up your Turkish track"
        />
      </div>
    )
  }

  const weeksLeft = Math.max(0, Math.ceil(D.diffDays(track.examDate, today) / 7))
  const add = {
    today: [() => editors.logPractice(), 'Log practice'],
    progress: [() => editors.practiceTest(), 'Add test result'],
    plan: [() => editors.practiceActivity(), 'Add activity'],
  }[tab] ?? [() => editors.logPractice(), 'Log practice']

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-text"><h1 tabIndex={-1}>Türkçe</h1><p>{track.level} now, {track.target} by {D.withDay(track.examDate)}. {weeksLeft ? `${plural(weeksLeft, 'week')} to the exam.` : 'Exam time.'}</p></div>
        <div className="page-head-actions"><button className="btn btn-primary" onClick={add[0] as () => void} type="button"><Icon className="icon-sm" name="plus" />{add[1] as string}</button></div>
      </header>
      <Tabs active={tab} items={[['today', 'Today', '#/turkish'], ['progress', 'Progress', '#/turkish/progress'], ['plan', 'Plan', '#/turkish/plan']]} label="Türkçe sections" />
      {tab === 'progress' ? <ProgressTab track={track} /> : tab === 'plan' ? <PlanTab track={track} /> : <TodayTab track={track} />}
    </div>
  )
}

/* ---- Today ------------------------------------------------------------------------------ */

/** One activity of the plan, ticked off for the day with its planned minutes. */
export function PracticeRow({ activity: a, date, compact }: { activity: PracticeActivity; date: string; compact?: boolean }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = usePracticeActions()
  const session = doneSession(data.practiceSessions, a, date)
  const [icon, label] = PRACTICE_AREA[a.area]
  return (
    <div className={`row practice-row${session ? ' is-done' : ''}`}>
      <button
        aria-checked={Boolean(session)}
        aria-label={`${session ? 'Mark as not done' : 'Done'}: ${a.title}`}
        className="check"
        onClick={() => void (session ? actions.sessions.remove(session) : actions.sessions.done(a, a.minutes, date))}
        role="checkbox"
        type="button"
      ><Icon name="check" /></button>
      <div className="row-main">
        <span className="row-title">{a.title}</span>
        <div className="row-meta">
          <span className={`area area-${a.area}`}><Icon name={icon} />{label}</span>
          {session
            ? <button className="link-btn" onClick={() => editors.practiceSession(session, a.title)} type="button">{session.minutes} min done</button>
            : <span>{a.minutes} min</span>}
        </div>
        {!compact && a.detail && <details className="practice-how"><summary>How</summary><p>{a.detail}</p></details>}
      </div>
    </div>
  )
}

function TodayTab({ track }: { track: LanguageTrack }) {
  const { data } = useHop()
  const editors = useEditors()
  const today = D.today()
  const plan = planFor(data.practiceActivities, today)
  const progress = dayProgress(data.practiceActivities, data.practiceSessions, today)
  const weekStart = D.startOfWeek(today, data.settings.weekStart)
  const week = weekBalance(data.practiceActivities, data.practiceSessions, weekStart, today)
  const planned = new Set(plan.map((a) => a.id))
  const extra = sessionsOn(data.practiceSessions, today).filter((s) => !s.activityId || !planned.has(s.activityId))
  const focus = LEVEL_FOCUS[track.level]

  return (
    <div className="split today-split">
      <div className="stack">
        <section aria-labelledby="pd-h" className="panel panel-pad practice-day">
          <div className="practice-day-head">
            <h2 id="pd-h">Today</h2>
            <span className="num"><strong>{D.minutes(progress.done) || '0 min'}</strong> <span className="muted">of {D.minutes(progress.planned) || '0 min'}</span></span>
          </div>
          <ProgressBar label="Today’s practice" pct={progress.pct} />
          <div className="practice-areas">
            {PRACTICE_AREAS.filter((area) => progress.areas[area].planned || progress.areas[area].done).map((area) => (
              <span className={`area-chip${progress.areas[area].planned && progress.areas[area].done >= progress.areas[area].planned ? ' is-done' : ''}`} key={area}>
                <Icon className="icon-sm" name={PRACTICE_AREA[area][0]} />{PRACTICE_AREA[area][2]} <span className="num">{progress.areas[area].done}/{progress.areas[area].planned}</span>
              </span>
            ))}
          </div>
        </section>

        {week.behind && (
          <Banner action={<button className="btn btn-sm" onClick={() => editors.logPractice(week.behind!.area)} type="button">Log it</button>} icon={PRACTICE_AREA[week.behind.area][0]} title={`${PRACTICE_AREA[week.behind.area][1]} is behind this week: ${Math.round(week.behind.share! * 100)}% of the plan so far.`} tone="warning">
            {CATCH_UP[week.behind.area]}
          </Banner>
        )}

        {plan.length
          ? PRACTICE_SLOTS.map((slot) => {
              const list = plan.filter((a) => a.slot === slot)
              if (!list.length) return null
              return (
                <section aria-labelledby={`slot-${slot}`} className="section" key={slot}>
                  <div className="section-head"><h2 id={`slot-${slot}`}>{PRACTICE_SLOT_LABEL[slot]}</h2><span className="small muted num">{D.minutes(list.reduce((sum, a) => sum + a.minutes, 0))}</span></div>
                  <div className="rows">{list.map((a) => <PracticeRow activity={a} date={today} key={a.id} />)}</div>
                </section>
              )
            })
          : <Empty body="Nothing in your plan for today. Rest, or log anything you do in Turkish." icon="leaf" pad={false} title="A free day" />}

        <section aria-labelledby="extra-h" className="section">
          <div className="section-head"><h2 id="extra-h">Also today</h2><button className="btn btn-sm" onClick={() => editors.logPractice()} type="button"><Icon className="icon-sm" name="plus" />Log practice</button></div>
          {extra.length
            ? <div className="rows">{extra.map((s) => (
                <div className="row row-link" key={s.id}>
                  <span aria-hidden="true" className={`type-tile area-tile area-${s.area}`}><Icon name={PRACTICE_AREA[s.area][0]} /></span>
                  <div className="row-main">
                    <button className="row-open" onClick={() => editors.practiceSession(s, s.note || PRACTICE_AREA[s.area][1])} type="button">{s.note || PRACTICE_AREA[s.area][1]}</button>
                    <div className="row-meta"><span>{PRACTICE_AREA[s.area][1]}</span><span className="num">{s.minutes} min</span></div>
                  </div>
                </div>
              ))}</div>
            : <p className="small muted">Class, homework, a chat, a film: anything in Turkish outside the plan counts. Log it here.</p>}
        </section>
      </div>

      <aside aria-label="This week" className="stack">
        <WeekStrip weekStart={weekStart} />
        <TurkishNotes />
        <section aria-labelledby="focus-h" className="section">
          <div className="section-head"><h2 id="focus-h">At {track.level}: {focus.title}</h2></div>
          <ul className="focus-list small">{focus.points.map((point) => <li key={point}>{point}</li>)}</ul>
        </section>
      </aside>
    </div>
  )
}

/** Notes tagged Türkçe, pinned first: the mistakes note, phrases, grammar rules. */
function TurkishNotes() {
  const { data } = useHop()
  const editors = useEditors()
  const notes = sortNotes(data.resources.filter((r) => r.kind === 'note' && r.topics.some((t) => t.toLocaleLowerCase('tr') === 'türkçe')))
  return (
    <section aria-labelledby="tn-h" className="section">
      <div className="section-head"><h2 id="tn-h">Türkçe notes</h2><button className="link-btn small" onClick={() => editors.note(['Türkçe'])} type="button">New note</button></div>
      {notes.length
        ? <div className="rows">{notes.slice(0, 4).map((n) => <NoteRow key={n.id} note={n} />)}</div>
        : <p className="small muted">Phrases, grammar rules, mistakes you keep making: tag a note Türkçe and it shows here.</p>}
      {notes.length > 4 && <a className="small" href="#/notes">All {notes.length} notes</a>}
    </section>
  )
}

/** The seven days of this week: minutes done against the plan, today marked. */
function WeekStrip({ weekStart }: { weekStart: string }) {
  const { data } = useHop()
  const today = D.today()
  const days = Array.from({ length: 7 }, (_, index) => D.addDays(weekStart, index))
  return (
    <section aria-labelledby="ws-h" className="section">
      <div className="section-head"><h2 id="ws-h">This week</h2><a className="small" href="#/turkish/progress">Progress</a></div>
      <ol className="week-strip">
        {days.map((ymd) => {
          const day = dayProgress(data.practiceActivities, data.practiceSessions, ymd)
          const state = ymd === today ? 'is-today' : ymd > today ? 'is-future' : day.planned && day.done === 0 ? 'is-missed' : ''
          return (
            <li className={state} key={ymd}>
              <span className="xs muted">{D.DAYS[D.weekday(ymd)]}</span>
              <span aria-hidden="true" className="week-bar"><span style={{ height: `${ymd > today ? 0 : day.pct}%` }} /></span>
              <span className="xs num">{ymd > today ? D.minutes(day.planned) || '–' : day.done ? D.minutes(day.done) : '–'}</span>
              <span className="visually-hidden">{ymd > today ? `${day.planned} minutes planned` : `${day.done} of ${day.planned} minutes`}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* ---- Progress --------------------------------------------------------------------------- */
function ProgressTab({ track }: { track: LanguageTrack }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = usePracticeActions()
  const today = D.today()
  const weekStart = D.startOfWeek(today, data.settings.weekStart)
  const week = weekBalance(data.practiceActivities, data.practiceSessions, weekStart, today)
  const weeks = recentWeeks(data.practiceSessions, weekStart, 6)
  const road = checkpoints(track, data.milestones)
  const due = testDue(data.practiceTests, track.level, today)
  const tests = [...data.practiceTests].sort((a, b) => b.date.localeCompare(a.date))
  const totals = data.practiceTotals
  const hours = PRACTICE_AREAS.reduce((sum, area) => sum + totals.minutes[area], 0)

  return (
    <div className="stack">
      <dl className="today-stats practice-stats">
        <div><dt>Exam</dt><dd className="num">{D.short(track.examDate)}</dd></div>
        <div><dt>Weeks left</dt><dd className="num">{Math.max(0, Math.ceil(D.diffDays(track.examDate, today) / 7))}</dd></div>
        <div><dt>Practised</dt><dd className="num">{D.minutes(hours) || '0 min'}</dd></div>
        <div><dt>Days</dt><dd className="num">{totals.days}</dd></div>
      </dl>

      <section aria-labelledby="bal-h" className="section">
        <div className="section-head"><h2 id="bal-h">This week’s balance</h2><span className="small muted num">{D.minutes(week.done) || '0 min'} of {D.minutes(week.planned)}</span></div>
        <div className="balance">
          {week.rows.map((row) => {
            const behind = week.behind?.area === row.area
            return (
              <div className={`balance-row${behind ? ' is-behind' : ''}`} key={row.area}>
                <span className="balance-label"><Icon className="icon-sm" name={PRACTICE_AREA[row.area][0]} />{PRACTICE_AREA[row.area][1]}</span>
                <ProgressBar label={`${PRACTICE_AREA[row.area][1]} this week`} pct={row.planned ? Math.min(100, Math.round((row.done / row.planned) * 100)) : 0} />
                <span className="small num">{row.done} / {row.planned} min</span>
              </div>
            )
          })}
        </div>
        <p className="xs muted">{week.behind ? `${PRACTICE_AREA[week.behind.area][1]} has had the least of its plan so far. ${CATCH_UP[week.behind.area]}` : 'The four skills are in step with the plan so far this week.'}</p>
      </section>

      <section aria-labelledby="road-h" className="section">
        <div className="section-head"><h2 id="road-h">Road to {track.target}</h2>{track.goalId && <a className="small" href={`#/goals/${track.goalId}`}>Goal</a>}</div>
        {road.list.length
          ? (
            <ol className="mini-agenda road">
              {road.list.map((m) => {
                const next = road.next?.id === m.id
                const days = D.diffDays(m.date, today)
                return (
                  <li className={m.done ? 'is-past' : next ? 'is-now' : ''} key={m.id}>
                    <DateChip date={m.date} />
                    <span className="mini-main">
                      <span className="mini-title">{m.title}</span>
                      <span className="xs muted">{m.done ? 'Done' : days < 0 ? `${plural(-days, 'day')} past the plan` : `In ${plural(days, 'day')}`}</span>
                    </span>
                    {next && <button className="btn btn-sm" onClick={() => void actions.track.finishLevel(track, m)} type="button"><Icon className="icon-sm" name="check" />{m.title.startsWith('Finish') ? 'Finished it' : 'Passed'}</button>}
                    {m.done && <Icon className="icon-sm" name="check" />}
                  </li>
                )
              })}
            </ol>
          )
          : <p className="small muted">No checkpoints. Add milestones to the goal to see them here.</p>}
      </section>

      <section aria-labelledby="pt-h" className="section">
        <div className="section-head"><h2 id="pt-h">Practice tests</h2><button className="btn btn-sm" onClick={() => editors.practiceTest()} type="button"><Icon className="icon-sm" name="plus" />Add result</button></div>
        {due.due && <Banner icon="award" title={due.last ? `It’s been ${plural(D.diffDays(today, due.last.date), 'day')} since your last practice test.` : 'Time for a first practice test.'} tone="info">At {track.level}, take one every {plural(due.every!, 'day')}. Then move next week’s time toward the weakest section.</Banner>}
        {tests.length
          ? (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead><tr><th>Taken</th>{LANGUAGE_SKILLS.map((skill) => <th className="num" key={skill}>{PRACTICE_AREA[skill][2]}</th>)}<th className="num">Total</th><th>Weakest</th></tr></thead>
                <tbody>
                  {tests.map((t) => {
                    const result = testResult(t, track.exam.passMark)
                    return (
                      <tr className="tr-link" key={t.id}>
                        <td><button className="row-open" onClick={() => editors.practiceTest(t)} type="button">{D.short(t.date)}</button>{t.title && <span className="xs muted skill-cat">{t.title}</span>}</td>
                        {LANGUAGE_SKILLS.map((skill) => <td className="num" data-label={`${PRACTICE_AREA[skill][1]}:`} key={skill}>{t.scores[skill] ?? '–'}<span className="faint">/{t.max[skill]}</span></td>)}
                        <td className="num" data-label="Total:">{result.total === null ? <span className="faint">{result.score}/{result.max}</span> : <Badge tone={result.passed ? 'success' : 'warning'}>{result.total}/100</Badge>}</td>
                        <td data-label="Weakest:">{result.weakest ? PRACTICE_AREA[result.weakest][1] : '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
          : <p className="small muted">No results yet. {TEST_EVERY_DAYS[track.level] ? '' : `Practice tests start from B1; at the end of ${track.level}, try one sample paper to see the gap. `}{track.exam.passMark} of 100 passes the {track.exam.name}.</p>}
      </section>

      <section aria-labelledby="wk-h" className="section">
        <div className="section-head"><h2 id="wk-h">Last six weeks</h2></div>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Week of</th>{PRACTICE_AREAS.map((area) => <th className="num" key={area}>{PRACTICE_AREA[area][2]}</th>)}<th className="num">Total</th><th className="num">Days</th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td>{D.short(w.start)}</td>
                  {PRACTICE_AREAS.map((area) => <td className="num" data-label={`${PRACTICE_AREA[area][1]}:`} key={area}>{w.minutes[area] ? D.minutes(w.minutes[area]) : '–'}</td>)}
                  <td className="num" data-label="Total:"><strong>{w.total ? D.minutes(w.total) : '–'}</strong></td>
                  <td className="num" data-label="Days:">{w.days}/7</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ---- Plan ------------------------------------------------------------------------------- */
function PlanTab({ track }: { track: LanguageTrack }) {
  const { data } = useHop()
  const editors = useEditors()
  const actions = usePracticeActions()
  const week = weeklyPlan(data.practiceActivities)
  const byDay = minutesByWeekday(data.practiceActivities)
  const focus = LEVEL_FOCUS[track.level]

  return (
    <div className="split">
      <div className="stack">
        {PRACTICE_SLOTS.map((slot) => {
          const list = data.practiceActivities.filter((a) => a.slot === slot).sort((a, b) => a.position - b.position)
          if (!list.length) return null
          return (
            <section aria-labelledby={`plan-${slot}`} className="section" key={slot}>
              <div className="section-head"><h2 id={`plan-${slot}`}>{PRACTICE_SLOT_LABEL[slot]}</h2></div>
              <div className="rows">
                {list.map((a) => (
                  <div className={`row row-link${a.active ? '' : ' is-done'}`} key={a.id}>
                    <span aria-hidden="true" className={`type-tile area-tile area-${a.area}`}><Icon name={PRACTICE_AREA[a.area][0]} /></span>
                    <div className="row-main">
                      <button className="row-open" onClick={() => editors.practiceActivity(a)} type="button">{a.title}</button>
                      <div className="row-meta"><span>{PRACTICE_AREA[a.area][1]}</span><span className="num">{a.minutes} min</span><span>{daysLabel(a.days)}</span>{!a.active && <Badge>Paused</Badge>}</div>
                    </div>
                    <div className="row-actions">
                      <Menu items={[
                        { label: 'Edit', icon: 'edit', onSelect: () => editors.practiceActivity(a) },
                        a.active
                          ? { label: 'Pause', icon: 'pause', onSelect: () => void actions.activities.update(a, { active: false }, 'Paused. It’s off your daily plan until you resume it.', true) }
                          : { label: 'Resume', icon: 'play', onSelect: () => void actions.activities.update(a, { active: true }, 'Back in your daily plan', true) },
                      ]} label={`More for ${a.title}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        {!data.practiceActivities.length && <Empty action={() => editors.practiceActivity()} actionLabel="Add activity" body="Add what you do for each skill and on which days. Today then shows the day’s plan." pad={false} title="No plan yet" />}
        <p className="small muted">Changes apply from today. What you already logged stays as it was.</p>
      </div>

      <aside aria-label="The plan in numbers" className="stack">
        <section aria-labelledby="tr-h" className="section">
          <div className="section-head"><h2 id="tr-h">Your track</h2><button className="link-btn small" onClick={() => editors.editTrack()} type="button">Edit</button></div>
          <dl className="facts">
            <div><dt>Level</dt><dd>{track.level} now, aiming for {track.target}</dd></div>
            <div><dt>Exam</dt><dd>{track.exam.name}, {D.withDay(track.examDate)}</dd></div>
            <div><dt>Sections</dt><dd>{LANGUAGE_SKILLS.map((skill) => `${PRACTICE_AREA[skill][2]} ${track.exam.sections[skill]}`).join(' · ')}. Pass: {track.exam.passMark}/100.</dd></div>
          </dl>
        </section>
        <section aria-labelledby="wp-h" className="section">
          <div className="section-head"><h2 id="wp-h">Each week</h2><span className="small muted num">{D.minutes(week.total)}</span></div>
          <div className="balance">
            {PRACTICE_AREAS.map((area) => (
              <div className="balance-row" key={area}>
                <span className="balance-label"><Icon className="icon-sm" name={PRACTICE_AREA[area][0]} />{PRACTICE_AREA[area][2]}</span>
                <ProgressBar label={`${PRACTICE_AREA[area][1]} share of the week`} pct={week.total ? Math.round((week.minutes[area] / week.total) * 100) : 0} />
                <span className="small num">{D.minutes(week.minutes[area]) || '0 min'}</span>
              </div>
            ))}
          </div>
          <p className="xs muted">{[1, 2, 3, 4, 5, 6, 0].map((day) => `${D.DAYS[day]} ${D.minutes(byDay[day]) || '0'}`).join(' · ')}</p>
        </section>
        <section aria-labelledby="lf-h" className="section">
          <div className="section-head"><h2 id="lf-h">At {track.level}: {focus.title}</h2></div>
          <ul className="focus-list small">{focus.points.map((point) => <li key={point}>{point}</li>)}</ul>
        </section>
      </aside>
    </div>
  )
}
