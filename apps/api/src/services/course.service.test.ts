import test from 'node:test';
import assert from 'node:assert/strict';

import { createCourseSchema } from '@hop/validation';

import { InvalidInputError } from '../errors.js';
import { courseService, termService } from './course.service.js';
import { ideaService } from './research.service.js';
import { libraryService } from './library.service.js';
import { taskService } from './task.service.js';

const syllabus = [
  { title: 'Homework', type: 'homework' as const, weight: 20 },
  { title: 'Midterm', type: 'midterm' as const, weight: 30 },
  { title: 'Final', type: 'final' as const, weight: 50 },
];

test('courseService.create stores the syllabus grading in order', () => {
  const course = courseService.create({ code: 'BLG 527E', name: 'Machine Learning', grading: syllabus });

  assert.equal(course.status, 'taking');
  assert.deepEqual(course.grading.map((item) => [item.title, item.weight, item.position]), [['Homework', 20, 0], ['Midterm', 30, 1], ['Final', 50, 2]]);
  assert.ok(course.grading.every((item) => item.courseId === course.id && item.score === null && !item.submitted));
});

test('course codes follow the SIS format and syllabus weights add up to 100', () => {
  assert.equal(createCourseSchema.parse({ code: 'blg   527e', name: 'ML' }).code, 'BLG 527E');
  assert.equal(createCourseSchema.safeParse({ code: 'Machine learning', name: 'ML' }).success, false);
  assert.equal(createCourseSchema.safeParse({ code: 'BLG 527E', name: 'ML', grading: [{ title: 'Final', type: 'final', weight: 60 }] }).success, false);
});

test('a course’s weights can never pass 100%', () => {
  const course = courseService.create({ code: 'BLG 561E', name: 'Deep Learning', grading: [{ title: 'Project', type: 'project', weight: 90 }] });

  assert.throws(() => courseService.addAssessment(course.id, { title: 'Quiz', type: 'quiz', weight: 20 }), InvalidInputError);
  const withQuiz = courseService.addAssessment(course.id, { title: 'Quiz', type: 'quiz', weight: 10, due: '2026-10-20', time: '09:30' });
  assert.equal(withQuiz?.grading.length, 2);
  assert.equal(withQuiz?.grading[1]?.position, 1);
  assert.throws(() => courseService.updateAssessment(course.id, withQuiz!.grading[1]!.id, { weight: 11 }), InvalidInputError);
});

test('a score marks the item submitted; clearing it keeps the submission', () => {
  const course = courseService.create({ code: 'BLG 549E', name: 'Graph Theory', grading: syllabus });
  const homework = course.grading[0]!;

  const scored = courseService.updateAssessment(course.id, homework.id, { score: 85 });
  assert.equal(scored?.grading[0]?.score, 85);
  assert.equal(scored?.grading[0]?.submitted, true);

  const cleared = courseService.updateAssessment(course.id, homework.id, { score: null });
  assert.equal(cleared?.grading[0]?.score, null);
  assert.equal(cleared?.grading[0]?.submitted, true);
  assert.equal(courseService.updateAssessment(course.id, 'missing', { score: 10 }), undefined);
});

test('an item can move to another course when its weight still fits there', () => {
  const from = courseService.create({ code: 'BLG 501E', name: 'From', grading: [{ title: 'Essay', type: 'homework', weight: 40 }] });
  const to = courseService.create({ code: 'BLG 502E', name: 'To', grading: [{ title: 'Final', type: 'final', weight: 70 }] });
  const full = courseService.create({ code: 'BLG 503E', name: 'Full', grading: syllabus });
  const essay = from.grading[0]!;

  assert.throws(() => courseService.updateAssessment(from.id, essay.id, { courseId: full.id }), InvalidInputError);
  assert.throws(() => courseService.updateAssessment(from.id, essay.id, { courseId: to.id }), InvalidInputError);
  courseService.updateAssessment(from.id, essay.id, { courseId: to.id, weight: 30 });

  assert.equal(courseService.getAll().find((c) => c.id === from.id)?.grading.length, 0);
  assert.deepEqual(courseService.getAll().find((c) => c.id === to.id)?.grading.map((item) => [item.title, item.position]), [['Final', 0], ['Essay', 1]]);
});

test('removing a course keeps its library items, tasks and ideas, unlinked', () => {
  const course = courseService.create({ code: 'BLG 600E', name: 'Removed', grading: syllabus });
  const note = libraryService.create({ kind: 'note', title: 'Lecture 1', courseId: course.id, body: 'Notes' });
  const task = taskService.create({ title: 'Study', courseId: course.id, assessmentId: course.grading[1]!.id });
  const idea = ideaService.create({ title: 'Idea', courseIds: [course.id, 'other'] });

  assert.equal(courseService.delete(course.id), true);
  assert.equal(courseService.getAll().some((c) => c.id === course.id), false);
  assert.equal(libraryService.getAll().find((r) => r.id === note.id)?.courseId, null);
  const unlinked = taskService.getAll().find((t) => t.id === task.id);
  assert.equal(unlinked?.courseId, null);
  assert.equal(unlinked?.assessmentId, null);
  assert.deepEqual(ideaService.getAll().find((i) => i.id === idea.id)?.courseIds, ['other']);
});

test('completing a course records the grade and keeps the scores', () => {
  const course = courseService.create({ code: 'BLG 506E', name: 'Computer Vision', grading: syllabus });
  courseService.updateAssessment(course.id, course.grading[0]!.id, { score: 90 });
  const completed = courseService.complete(course.id, 'AA');

  assert.equal(completed?.status, 'completed');
  assert.equal(completed?.grade, 'AA');
  assert.equal(completed?.grading[0]?.score, 90);
});

test('deleting a term keeps its courses without a term', () => {
  const term = termService.create({ name: 'Fall 2026–27', start: '2026-09-21', end: '2027-01-15' });
  const course = courseService.create({ code: 'BLG 700E', name: 'Seminar', termId: term.id });

  assert.throws(() => termService.update(term.id, { end: '2026-09-01' }), InvalidInputError);
  assert.equal(termService.delete(term.id), true);
  assert.equal(courseService.getAll().find((c) => c.id === course.id)?.termId, null);
});
