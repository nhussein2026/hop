import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimezone } from './dates.ts'
import { classesOn, currentTerm, detectLink, eligibility, nextClass, parseGrading, standing, staleFinds, termWeek, unsubmitted, upcoming, whenWord } from './uni.ts'
import type { Assessment, Course, Find } from './types.ts'

setTimezone('UTC')

const stamp = '2026-09-01T00:00:00.000Z'

const item = (fields: Partial<Assessment>): Assessment => ({
  id: 'a', courseId: 'c', title: 'Homework', type: 'homework', weight: 10, due: null, time: null, score: null, submitted: false, position: 0,
  createdAt: stamp, updatedAt: stamp, ...fields,
})

const course = (fields: Partial<Course>): Course => ({
  id: 'c', code: 'BLG 527E', name: 'Machine Learning', termId: null, status: 'taking', crn: null, instructorId: null, credits: 3, ects: 7.5,
  ninovaUrl: null, schedule: [], vf: null, absences: 0, target: null, grade: null, why: null, createdAt: stamp, updatedAt: stamp, grading: [], ...fields,
})

test('the current term and its teaching week', () => {
  const terms = [{ id: 't', name: 'Fall', start: '2026-09-21', end: '2027-01-15', createdAt: stamp, updatedAt: stamp }]
  assert.equal(currentTerm(terms, '2026-09-20'), null)
  assert.equal(currentTerm(terms, '2026-10-08')?.id, 't')
  assert.equal(termWeek(terms[0]!, '2026-09-21', 14), 1)
  assert.equal(termWeek(terms[0]!, '2026-10-08', 14), 3)
  assert.equal(termWeek(terms[0]!, '2027-01-10', 14), 14)
})

test('classes come from the weekly schedule of courses being taken, in time order', () => {
  const courses = [
    course({ id: 'late', schedule: [{ day: 4, start: '13:30', end: '16:30', room: '' }] }),
    course({ id: 'early', schedule: [{ day: 4, start: '09:30', end: '12:30', room: 'EEB 5302' }] }),
    course({ id: 'old', status: 'completed', schedule: [{ day: 4, start: '08:00', end: '09:00', room: '' }] }),
  ]
  // 2026-10-08 is a Thursday (day 4).
  assert.deepEqual(classesOn(courses, '2026-10-08').map((m) => m.course.id), ['early', 'late'])
  assert.equal(nextClass(courses, '2026-10-08')?.date, '2026-10-15')
})

test('upcoming deadlines skip graded and submitted items; unsubmitted only flags hand-ins', () => {
  const c = course({
    grading: [
      item({ id: 'hw', due: '2026-10-09' }),
      item({ id: 'done', due: '2026-10-10', submitted: true }),
      item({ id: 'mid', type: 'midterm', due: '2026-10-20' }),
      item({ id: 'late', due: '2026-10-05' }),
      item({ id: 'quiz', type: 'quiz', due: '2026-10-06' }),
      item({ id: 'old', due: '2026-09-20' }),
    ],
  })
  assert.deepEqual(upcoming([c], '2026-10-08', 21).map((d) => [d.item.id, d.days]), [['hw', 1], ['mid', 12]])
  assert.deepEqual(unsubmitted([c], '2026-10-08').map((d) => d.item.id), ['late'])
})

test('standing is the weighted average so far and what the rest needs', () => {
  const c = course({ target: 80, grading: [item({ weight: 20, score: 90 }), item({ weight: 30, score: 70 }), item({ weight: 50 })] })
  const s = standing(c)
  assert.equal(s.average, 78)
  assert.equal(s.points, 39)
  assert.equal(s.remainingWeight, 50)
  assert.equal(s.need, 82)
  assert.equal(standing({ ...c, target: null }).need, null)
  assert.ok(standing({ ...c, target: 30 }).need! <= 0)
})

test('final eligibility looks at in-term scores and absences', () => {
  const vf = { rule: 'In-term average of 35 and at most 3 absences', minInTerm: 35, maxAbsences: 3 }
  const ok = eligibility(course({ vf, absences: 1, grading: [item({ weight: 20, score: 60 }), item({ type: 'final', weight: 50, score: 10 })] }))
  assert.deepEqual(ok, { average: 60, left: 2, gradeOk: true, attendanceOk: true, atRisk: false })
  assert.equal(eligibility(course({ vf, absences: 2 }))?.atRisk, true)
  assert.equal(eligibility(course({ vf, absences: 4 }))?.attendanceOk, false)
  assert.equal(eligibility(course({ vf, grading: [item({ score: 20 })] }))?.gradeOk, false)
  assert.equal(eligibility(course({})), null)
})

test('grading pasted from a syllabus is read line by line', () => {
  assert.deepEqual(parseGrading('Homework 20\nAra sınav: 30%\nFinal - 50'), {
    items: [{ title: 'Homework', type: 'homework', weight: 20 }, { title: 'Ara sınav', type: 'midterm', weight: 30 }, { title: 'Final', type: 'final', weight: 50 }],
  })
  assert.match((parseGrading('Homework 20\nFinal 50') as { error: string }).error, /70%/)
  assert.match((parseGrading('Just words') as { error: string }).error, /Couldn’t read/)
  assert.deepEqual(parseGrading('  '), { items: [] })
})

test('links from GitHub, Hugging Face, arXiv and İTÜ are recognised', () => {
  assert.deepEqual(detectLink('https://github.com/microsoft/graphrag/tree/main'), { kind: 'repo', source: 'GitHub', title: 'microsoft/graphrag' })
  assert.deepEqual(detectLink('https://huggingface.co/Qwen/Qwen2.5-7B-Instruct'), { kind: 'model', source: 'Hugging Face', title: 'Qwen/Qwen2.5-7B-Instruct' })
  assert.deepEqual(detectLink('https://huggingface.co/datasets/a/b'), { kind: 'dataset', source: 'Hugging Face', title: 'a/b' })
  assert.deepEqual(detectLink('https://arxiv.org/pdf/2307.03172.pdf'), { kind: 'paper', source: 'arXiv', title: 'arXiv 2307.03172' })
  assert.equal(detectLink('https://bb.itu.edu.tr/event')?.source, 'İTÜ')
  assert.equal(detectLink('ftp://example.com'), null)
  assert.equal(detectLink('not a link'), null)
})

test('inbox finds older than 30 days are stale', () => {
  const find = (id: string, createdAt: string, status: Find['status'] = 'inbox') => ({ id, createdAt, status }) as Find
  assert.deepEqual(staleFinds([find('new', '2026-10-01T10:00:00Z'), find('old', '2026-09-01T10:00:00Z'), find('kept', '2026-08-01T10:00:00Z', 'kept')], '2026-10-08').map((f) => f.id), ['old'])
  assert.equal(whenWord('2026-10-09', '2026-10-08'), 'tomorrow')
  assert.equal(whenWord('2026-10-20', '2026-10-08'), 'Tue 20 Oct')
})
