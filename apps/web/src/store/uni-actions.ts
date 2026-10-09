// Every change to İTÜ (terms, courses, the library, research, the handbook) and Radar.
// Like actions.ts: cheap changes happen immediately with Undo; the screens confirm deletes first.
import { useMemo } from 'react'
import * as D from '../lib/dates.ts'
import { isOpen } from '../lib/rules.ts'
import { currentTerm, isExam } from '../lib/uni.ts'
import type {
  Assessment, AssessmentType, ClassSlot, Contact, Course, Event, Evidence, Find, HopData, Idea, IdeaStage, KeyDate, LetterGrade, Opportunity,
  Pin, Playbook, Program, Project, Resource, ResourceKind, Settings, Task, Term, UniLink,
} from '../lib/types.ts'
import { api, upsert, useHop, without } from './store.ts'

/** The create endpoints take optional fields, not nulls. */
function createBody(fields: object) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

const applyItem = <K extends Exclude<keyof HopData, 'settings'>>(key: K) => (item: HopData[K][number], data: HopData) => upsert(data, key, item)
const ok = () => undefined

export type CourseFields = {
  code: string
  name: string
  crn: string | null
  status: Course['status']
  termId: string | null
  instructorId: string | null
  schedule: ClassSlot[]
  ninovaUrl: string | null
  why: string | null
  vf: Course['vf']
}

type ResourceFields = { kind: ResourceKind; title: string; url?: string | null; courseId?: string | null; topics?: string[]; body?: string; source?: string | null }

export function useUniActions() {
  const { commit, data } = useHop()

  return useMemo(() => {
    const course = (c: Pick<Course, 'id'>) => `/api/courses/${c.id}`
    const item = (c: Pick<Course, 'id'>, a: Pick<Assessment, 'id'>) => `${course(c)}/assessments/${a.id}`

    const terms = {
      save(term: Term | null, fields: { name: string; start: string; end: string }) {
        if (term) return commit('Term saved', () => api.patch<Term>(`/api/terms/${term.id}`, fields), applyItem('terms'))
        return commit('Term added', () => api.post<Term>('/api/terms', fields), applyItem('terms'))
      },
      remove(term: Term) {
        return commit('Term deleted', () => api.delete(`/api/terms/${term.id}`), (_, current) => ({
          ...without(current, 'terms', term.id),
          courses: current.courses.map((c) => (c.termId === term.id ? { ...c, termId: null } : c)),
        }))
      },
      setProgram(changes: Partial<Program>, label: string, quiet = false) {
        return commit(label, () => api.patch<Settings>('/api/settings', { program: changes }), (saved, current) => ({ ...current, settings: saved }), { quiet })
      },
    }

    const courses = {
      /** A new instructor's name creates them as a person first. */
      save(existing: Course | null, fields: CourseFields, grading: { title: string; type: AssessmentType; weight: number }[], newInstructor: string) {
        return commit(existing ? 'Course saved' : `${fields.code} added`, async () => {
          let instructor: Contact | undefined
          if (newInstructor) {
            instructor = await api.post<Contact>('/api/contacts', { name: newInstructor, kind: 'instructor', role: `Instructor, ${fields.name}`, organization: 'İTÜ' })
          }
          const body = { ...fields, instructorId: instructor?.id ?? fields.instructorId }
          const saved = existing
            ? await api.patch<Course>(course(existing), body)
            : await api.post<Course>('/api/courses', { ...createBody(body), schedule: body.schedule, grading, target: 75 })
          return { saved, instructor }
        }, ({ saved, instructor }, current) => {
          const next = upsert(current, 'courses', saved)
          return instructor ? upsert(next, 'contacts', instructor) : next
        })
      },
      update(c: Course, changes: Partial<Course>, label: string, { quiet = false, undo = false } = {}) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, c[key as keyof Course]])) as Partial<Course>
        return commit(label, () => api.patch<Course>(course(c), changes), applyItem('courses'), {
          quiet,
          undo: undo ? () => void commit('Undone', () => api.patch<Course>(course(c), before), applyItem('courses')) : undefined,
        })
      },
      /** Moving a planned course into the current term. */
      take(c: Course) {
        const term = currentTerm(data.terms, D.today())
        return courses.update(c, { status: 'taking', termId: term?.id ?? c.termId }, 'Moved to this term', { undo: true })
      },
      setAbsences(c: Course, absences: number) {
        const left = c.vf?.maxAbsences != null ? c.vf.maxAbsences - absences : null
        const label = absences < c.absences ? 'Absence removed' : left === null ? 'Absence recorded' : left <= 0 ? `Absence recorded. No absences left in ${c.code}.` : `Absence recorded. ${left} left in ${c.code}.`
        return courses.update(c, { absences }, label, { undo: true })
      },
      /** Completing can also record the course as evidence, unless it was failed. */
      complete(c: Course, grade: LetterGrade, asEvidence: boolean) {
        return commit(`${c.code} completed with ${grade}`, async () => {
          const saved = await api.post<Course>(`${course(c)}/complete`, { grade })
          const evidence = asEvidence && grade !== 'FF' && grade !== 'VF'
            ? await api.post<Evidence>('/api/evidence', { title: `Completed ${c.code} ${c.name} (${grade})`, date: D.today() })
            : undefined
          return { saved, evidence }
        }, ({ saved, evidence }, current) => {
          const next = upsert(current, 'courses', saved)
          return evidence ? upsert(next, 'evidence', evidence) : next
        })
      },
      /** The library keeps the course's materials, unlinked. Deadlines and grades go with it. */
      remove(c: Course) {
        return commit('Course removed', () => api.delete(course(c)), (_, current) => ({
          ...without(current, 'courses', c.id),
          resources: current.resources.map((r) => (r.courseId === c.id ? { ...r, courseId: null } : r)),
          tasks: current.tasks.map((t) => (t.courseId === c.id ? { ...t, courseId: null, assessmentId: null } : t)),
          ideas: current.ideas.map((i) => (i.courseIds.includes(c.id) ? { ...i, courseIds: i.courseIds.filter((id) => id !== c.id) } : i)),
        }))
      },
    }

    const grading = {
      add(c: Course, fields: { title: string; type: AssessmentType; weight: number; due: string | null; time: string | null }) {
        return commit(`Added to ${c.code}`, () => api.post<Course>(`${course(c)}/assessments`, createBody(fields)), applyItem('courses'))
      },
      /** Changes to an item, possibly moving it to another course. Both courses are refreshed. */
      update(c: Course, a: Assessment, fields: Partial<Assessment>, label = 'Deadline saved') {
        const moving = fields.courseId && fields.courseId !== c.id ? data.courses.find((x) => x.id === fields.courseId) : undefined
        return commit(label, async () => {
          const saved = await api.patch<Course>(item(c, a), fields)
          const target = moving ? await api.get<Course[]>('/api/courses').then((all) => all.find((x) => x.id === moving.id)) : undefined
          return { saved, target }
        }, ({ saved, target }, current) => {
          const next = upsert(current, 'courses', saved)
          return target ? upsert(next, 'courses', target) : next
        })
      },
      /** Typing a score. A score also marks the item submitted. */
      setScore(c: Course, a: Assessment, score: number | null) {
        const set = (value: Partial<Assessment>) => () => api.patch<Course>(item(c, a), value)
        return commit(score === null ? 'Score cleared' : `Score saved. ${c.code} average updated.`, set({ score }), applyItem('courses'), {
          undo: () => void commit('Undone', set({ score: a.score, submitted: a.submitted }), applyItem('courses')),
        })
      },
      /** Handing something in also completes its open prep tasks. */
      toggleSubmitted(c: Course, a: Assessment) {
        const submitting = !a.submitted
        const prep = submitting ? data.tasks.filter((t) => t.assessmentId === a.id && isOpen(t)) : []
        return commit(submitting ? `${c.code} ${a.title} submitted. Add the score when it’s back.` : 'Marked not submitted', async () => {
          const saved = await api.patch<Course>(item(c, a), { submitted: submitting })
          const done = await Promise.all(prep.map((t) => api.patch<Task>(`/api/tasks/${t.id}`, { status: 'completed' })))
          return { saved, done }
        }, ({ saved, done }, current) => done.reduce((next, t) => upsert(next, 'tasks', t), upsert(current, 'courses', saved)), {
          undo: () => void commit('Undone', async () => {
            const saved = await api.patch<Course>(item(c, a), { submitted: a.submitted })
            const reopened = await Promise.all(prep.map((t) => api.patch<Task>(`/api/tasks/${t.id}`, { status: t.status })))
            return { saved, reopened }
          }, ({ saved, reopened }, current) => reopened.reduce((next, t) => upsert(next, 'tasks', t), upsert(current, 'courses', saved))),
        })
      },
      remove(c: Course, a: Assessment) {
        return commit('Deadline deleted', () => api.delete<Course>(item(c, a)), (saved, current) => ({
          ...upsert(current, 'courses', saved),
          tasks: current.tasks.map((t) => (t.assessmentId === a.id ? { ...t, assessmentId: null } : t)),
        }), {
          undo: () => void commit('Undone', async () => {
            const restored = await api.post<Course>(`${course(c)}/assessments`, createBody({ title: a.title, type: a.type, weight: a.weight, due: a.due, time: a.time }))
            const recreated = restored.grading.at(-1)!
            return a.score !== null || a.submitted ? api.patch<Course>(item(c, recreated), { score: a.score, submitted: a.submitted }) : restored
          }, applyItem('courses')),
        })
      },
      /**
       * A prep task a few days before the item: four days for a midterm or final, one for a quiz,
       * two for a hand-in. Exams and close deadlines are high priority.
       */
      planPrep(c: Course, a: Assessment) {
        const today = D.today()
        const exam = isExam(a)
        const lead = exam ? (a.type === 'quiz' ? 1 : 4) : 2
        const day = a.due && D.addDays(a.due, -lead) > today ? D.addDays(a.due, -lead) : today
        const goal = data.goals.find((g) => g.area === 'Learning' && g.status === 'active')
        const fields = {
          title: `${exam ? 'Study for' : 'Work on'} ${c.code} ${a.title}`,
          priority: exam || (a.due && D.diffDays(a.due, today) <= 2) ? 'high' : 'medium',
          courseId: c.id,
          assessmentId: a.id,
          goalId: goal?.id,
          scheduledDate: day,
          dueDate: a.due && a.due >= day ? a.due : undefined,
          estimatedMinutes: exam ? 120 : 90,
          description: `${a.weight}% of the ${c.code} grade.`,
        }
        return commit(`Prep task planned ${day === today ? 'for today' : D.relative(day, today) === 'Tomorrow' ? 'for tomorrow' : `for ${D.withDay(day)}`}`, () => api.post<Task>('/api/tasks', createBody(fields)), applyItem('tasks'))
      },
    }

    const people = {
      savePlaybook(contact: Contact, playbook: Playbook, interests: string[]) {
        return commit('Notes saved', () => api.patch<Contact>(`/api/contacts/${contact.id}`, { playbook, interests }), applyItem('contacts'))
      },
    }

    const handbook = {
      addDate(fields: { title: string; date: string; kind: KeyDate['kind'] }) {
        return commit('Key date added', () => api.post<KeyDate>('/api/key-dates', fields), applyItem('keyDates'))
      },
      removeDate(k: KeyDate) {
        return commit('Date deleted', () => api.delete(`/api/key-dates/${k.id}`), (_, current) => without(current, 'keyDates', k.id), {
          undo: () => void commit('Undone', () => api.post<KeyDate>('/api/key-dates', createBody({ title: k.title, date: k.date, kind: k.kind, note: k.note })), applyItem('keyDates')),
        })
      },
      savePin(pin: Pin | null, fields: { title: string; kind: Pin['kind']; body: string }) {
        if (pin) return commit('Saved', () => api.patch<Pin>(`/api/pins/${pin.id}`, fields), applyItem('pins'))
        return commit('Pinned', () => api.post<Pin>('/api/pins', fields), applyItem('pins'))
      },
      removePin(pin: Pin) {
        return commit('Unpinned', () => api.delete(`/api/pins/${pin.id}`), (_, current) => without(current, 'pins', pin.id), {
          undo: () => void commit('Undone', () => api.post<Pin>('/api/pins', { title: pin.title, kind: pin.kind, body: pin.body }), applyItem('pins')),
        })
      },
      addLink(fields: { title: string; url: string }) {
        return commit('Link added', () => api.post<UniLink>('/api/uni-links', fields), applyItem('uniLinks'))
      },
      removeLink(link: UniLink) {
        return commit('Link removed', () => api.delete(`/api/uni-links/${link.id}`), (_, current) => without(current, 'uniLinks', link.id), {
          undo: () => void commit('Undone', () => api.post<UniLink>('/api/uni-links', { title: link.title, url: link.url }), applyItem('uniLinks')),
        })
      },
    }

    const library = {
      /** Create the item, then upload its file. If the upload fails, the half-made item is removed. */
      add(fields: ResourceFields, file: File | null, label = fields.kind === 'note' ? 'Note saved' : 'Added to your library') {
        return commit(label, async () => {
          const created = await api.post<Resource>('/api/resources', { ...createBody(fields), topics: fields.topics ?? [] })
          if (!file) return created
          try {
            return await api.upload<Resource>(`/api/resources/${created.id}/file`, file)
          } catch (error) {
            await api.delete(`/api/resources/${created.id}`).catch(ok)
            throw error
          }
        }, applyItem('resources'))
      },
      update(r: Resource, changes: Partial<Resource>, label: string, undo = false) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, r[key as keyof Resource]])) as Partial<Resource>
        return commit(label, () => api.patch<Resource>(`/api/resources/${r.id}`, changes), applyItem('resources'), {
          undo: undo ? () => void commit('Undone', () => api.patch<Resource>(`/api/resources/${r.id}`, before), applyItem('resources')) : undefined,
        })
      },
      attachFile(r: Resource, file: File) {
        return commit(r.file ? 'File replaced' : 'File attached', () => api.upload<Resource>(`/api/resources/${r.id}/file`, file), applyItem('resources'))
      },
      remove(r: Resource) {
        return commit('Deleted from your library', () => api.delete(`/api/resources/${r.id}`), (_, current) => ({
          ...without(current, 'resources', r.id),
          ideas: current.ideas.map((i) => (i.resourceIds.includes(r.id) ? { ...i, resourceIds: i.resourceIds.filter((id) => id !== r.id) } : i)),
          finds: current.finds.map((f) => (f.resourceId === r.id ? { ...f, resourceId: null } : f)),
        }))
      },
    }

    const ideas = {
      /** An idea from a Radar find takes the find out of the inbox. */
      add(fields: Partial<Idea> & { title: string }) {
        return commit('Idea saved as a spark', () => api.post<Idea>('/api/ideas', createBody(fields)), (saved, current) => ({
          ...upsert(current, 'ideas', saved),
          finds: current.finds.map((f) => (saved.findIds.includes(f.id) ? { ...f, status: 'converted' as const, ideaId: saved.id } : f)),
        }))
      },
      update(idea: Idea, changes: Partial<Idea>, label: string, undo = false) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, idea[key as keyof Idea]])) as Partial<Idea>
        return commit(label, () => api.patch<Idea>(`/api/ideas/${idea.id}`, changes), applyItem('ideas'), {
          undo: undo ? () => void commit('Undone', () => api.patch<Idea>(`/api/ideas/${idea.id}`, before), applyItem('ideas')) : undefined,
        })
      },
      setStage(idea: Idea, stage: IdeaStage, label: string) {
        return ideas.update(idea, { stage }, label, true)
      },
      /** Saving the next step can also put it on tomorrow's plan. */
      saveNextStep(idea: Idea, nextStep: string, asTask: boolean) {
        return commit(asTask ? 'Next step saved and added to tomorrow' : 'Next step saved', async () => {
          const saved = await api.patch<Idea>(`/api/ideas/${idea.id}`, { nextStep })
          const task = asTask ? await api.post<Task>('/api/tasks', { title: nextStep, scheduledDate: D.addDays(D.today(), 1), description: `From the idea “${idea.title}”` }) : undefined
          return { saved, task }
        }, ({ saved, task }, current) => {
          const next = upsert(current, 'ideas', saved)
          return task ? upsert(next, 'tasks', task) : next
        })
      },
      /** A validated idea becomes a Growth project, and the idea becomes active. */
      startProject(idea: Idea) {
        return commit('Project created in Growth', async () => {
          const project = await api.post<Project>('/api/projects', createBody({ name: idea.title, problem: idea.question, blurb: (idea.question || idea.why).slice(0, 200), status: 'planned', startDate: D.today() }))
          const saved = await api.patch<Idea>(`/api/ideas/${idea.id}`, { projectId: project.id, stage: 'active' })
          return { project, saved }
        }, ({ project, saved }, current) => upsert(upsert(current, 'projects', project), 'ideas', saved))
      },
      remove(idea: Idea) {
        return commit('Idea deleted', () => api.delete(`/api/ideas/${idea.id}`), (_, current) => ({
          ...without(current, 'ideas', idea.id),
          finds: current.finds.map((f) => (f.ideaId === idea.id ? { ...f, ideaId: null } : f)),
        }))
      },
    }

    const thesis = {
      /** Choosing an advisor moves the thesis on to the proposal. */
      setAdvisor(advisorId: string, program: Program) {
        const step = program.thesisStep === 'topic' || program.thesisStep === 'advisor' ? 'proposal' : program.thesisStep
        return terms.setProgram({ advisorId, thesisStep: step }, 'Advisor set. Next: the proposal.')
      },
    }

    const radar = {
      add(fields: { kind: Find['kind']; title: string; url: string; source: string; why: string; topics: string[]; eventDate: string | null }) {
        return commit('Saved to your Radar inbox', () => api.post<Find>('/api/finds', createBody(fields)), applyItem('finds'))
      },
      update(f: Find, changes: Partial<Find>, label: string, undo = true) {
        const before = Object.fromEntries(Object.keys(changes).map((key) => [key, f[key as keyof Find]])) as Partial<Find>
        return commit(label, () => api.patch<Find>(`/api/finds/${f.id}`, changes), applyItem('finds'), {
          undo: undo ? () => void commit('Undone', () => api.patch<Find>(`/api/finds/${f.id}`, before), applyItem('finds')) : undefined,
        })
      },
      /** Try it: a small task two days out, so the find gets a real slot. */
      tryIt(f: Find) {
        const day = D.addDays(D.today(), 2)
        return commit(`Moved to “To try”. Task added for ${D.withDay(day)}.`, async () => {
          const task = await api.post<Task>('/api/tasks', createBody({ title: `Try ${f.title}`, priority: 'low', scheduledDate: day, estimatedMinutes: 30, description: [f.url, f.why].filter(Boolean).join('\n') }))
          const saved = await api.patch<Find>(`/api/finds/${f.id}`, { status: 'try', taskId: task.id })
          return { task, saved }
        }, ({ task, saved }, current) => upsert(upsert(current, 'tasks', task), 'finds', saved))
      },
      /** Keep it: it becomes a library item, and any "try it" task is done. */
      keep(f: Find) {
        if (f.resourceId) return radar.update(f, { status: 'kept' }, 'Kept')
        const kind: ResourceKind = f.kind === 'paper' ? 'paper' : f.kind === 'repo' || f.kind === 'tool' ? 'repo' : 'link'
        const task = f.taskId ? data.tasks.find((t) => t.id === f.taskId && isOpen(t)) : undefined
        return commit('Kept in your library', async () => {
          const resource = await api.post<Resource>('/api/resources', createBody({ kind, title: f.title, url: f.url, topics: f.topics, source: f.source }))
          const saved = await api.patch<Find>(`/api/finds/${f.id}`, { status: 'kept', resourceId: resource.id })
          const done = task ? await api.patch<Task>(`/api/tasks/${task.id}`, { status: 'completed' }) : undefined
          return { resource, saved, done }
        }, ({ resource, saved, done }, current) => {
          const next = upsert(upsert(current, 'resources', resource), 'finds', saved)
          return done ? upsert(next, 'tasks', done) : next
        })
      },
      trackAsOpportunity(f: Find) {
        return commit('Tracked in Career as a saved opportunity', async () => {
          const opportunity = await api.post<Opportunity>('/api/opportunities', createBody({
            title: f.title, organization: f.source && f.source !== 'Web' ? f.source : undefined, url: f.url, type: 'program', source: 'Radar', technologyTags: f.topics, notes: f.why,
          }))
          const saved = await api.patch<Find>(`/api/finds/${f.id}`, { status: 'converted', opportunityId: opportunity.id })
          return { opportunity, saved }
        }, ({ opportunity, saved }, current) => upsert(upsert(current, 'opportunities', opportunity), 'finds', saved))
      },
      addToCalendar(f: Find) {
        const date = f.eventDate ?? D.addDays(D.today(), 7)
        return commit(`Added to your calendar for ${D.withDay(date)}`, async () => {
          const event = await api.post<Event>('/api/events', createBody({ title: f.title, date, type: 'other', description: f.why }))
          const saved = await api.patch<Find>(`/api/finds/${f.id}`, { status: 'converted', eventId: event.id })
          return { event, saved }
        }, ({ event, saved }, current) => upsert(upsert(current, 'events', event), 'finds', saved))
      },
      archive(list: Find[]) {
        return commit(`${list.length === 1 ? '1 find' : `${list.length} finds`} archived`, () => Promise.all(list.map((f) => api.patch<Find>(`/api/finds/${f.id}`, { status: 'dismissed' }))), (saved, current) => saved.reduce((next, f) => upsert(next, 'finds', f), current), {
          undo: () => void commit('Undone', () => Promise.all(list.map((f) => api.patch<Find>(`/api/finds/${f.id}`, { status: f.status }))), (saved, current) => saved.reduce((next, f) => upsert(next, 'finds', f), current)),
        })
      },
      remove(f: Find) {
        return commit('Find deleted', () => api.delete(`/api/finds/${f.id}`), (_, current) => without(current, 'finds', f.id))
      },
    }

    return { terms, courses, grading, people, handbook, library, ideas, thesis, radar }
  }, [commit, data])
}
