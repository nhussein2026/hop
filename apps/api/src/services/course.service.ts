import { randomUUID } from 'node:crypto';

import type {
  Assessment,
  CourseWithDetails,
  CreateAssessmentInput,
  CreateCourseInput,
  CreateTermInput,
  LetterGrade,
  Term,
  UpdateAssessmentInput,
  UpdateCourseInput,
  UpdateTermInput,
} from '@hop/domain';

import { InvalidInputError } from '../errors.js';
import { courseRepository, termRepository } from '../repositories/course.repository.js';

/** Weights come from the syllabus and add up to 100%. Going over means a typo. */
function checkWeights(course: CourseWithDetails, weight: number, replacing?: string) {
  const others = course.grading.filter((item) => item.id !== replacing).reduce((sum, item) => sum + item.weight, 0);

  if (others + weight > 100) {
    throw new InvalidInputError(`${course.code} weights would add up to ${others + weight}%. Check the syllabus or edit another item.`);
  }
}

export const termService = {
  getAll(): Term[] {
    return termRepository.findAll();
  },

  create(input: CreateTermInput): Term {
    const now = new Date().toISOString();
    return termRepository.create({ id: randomUUID(), ...input, createdAt: now, updatedAt: now });
  },

  update(id: string, input: UpdateTermInput): Term | undefined {
    const existing = termRepository.findById(id);

    if (!existing) {
      return undefined;
    }

    if ((input.end ?? existing.end) < (input.start ?? existing.start)) {
      throw new InvalidInputError('A term cannot end before it starts');
    }

    return termRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return termRepository.delete(id);
  },
};

export const courseService = {
  getAll(): CourseWithDetails[] {
    return courseRepository.findAll();
  },

  create(input: CreateCourseInput): CourseWithDetails {
    const now = new Date().toISOString();
    const id = randomUUID();
    const grading: Assessment[] = (input.grading ?? []).map((item, position) => ({
      id: randomUUID(),
      courseId: id,
      title: item.title,
      type: item.type,
      weight: item.weight,
      due: null,
      time: null,
      score: null,
      submitted: false,
      position,
      createdAt: now,
      updatedAt: now,
    }));

    return courseRepository.create({
      id,
      code: input.code,
      name: input.name,
      termId: input.termId ?? null,
      status: input.status ?? 'taking',
      crn: input.crn ?? null,
      instructorId: input.instructorId ?? null,
      credits: input.credits ?? null,
      ects: input.ects ?? null,
      ninovaUrl: input.ninovaUrl ?? null,
      schedule: input.schedule ?? [],
      vf: input.vf ?? null,
      absences: input.absences ?? 0,
      target: input.target ?? null,
      grade: input.grade ?? null,
      why: input.why ?? null,
      createdAt: now,
      updatedAt: now,
    }, grading);
  },

  update(id: string, input: UpdateCourseInput): CourseWithDetails | undefined {
    if (!courseRepository.findById(id)) {
      return undefined;
    }

    return courseRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  /** Record the final letter grade. The graded items and their scores stay as history. */
  complete(id: string, grade: LetterGrade): CourseWithDetails | undefined {
    return this.update(id, { status: 'completed', grade });
  },

  delete(id: string): boolean {
    return courseRepository.delete(id);
  },

  addAssessment(courseId: string, input: CreateAssessmentInput): CourseWithDetails | undefined {
    const course = courseRepository.findById(courseId);

    if (!course) {
      return undefined;
    }

    checkWeights(course, input.weight);
    const now = new Date().toISOString();
    courseRepository.createAssessment({
      id: randomUUID(),
      courseId,
      title: input.title,
      type: input.type,
      weight: input.weight,
      due: input.due ?? null,
      time: input.time ?? null,
      score: null,
      submitted: false,
      position: courseRepository.nextPosition(courseId),
      createdAt: now,
      updatedAt: now,
    });
    return courseRepository.update(courseId, { updatedAt: now });
  },

  /**
   * Change a graded item. A score means it was handed in, so it also counts as submitted.
   * Moving it to another course puts it at the end of that course's list.
   */
  updateAssessment(courseId: string, id: string, input: UpdateAssessmentInput): CourseWithDetails | undefined {
    const course = courseRepository.findById(courseId);
    const item = course?.grading.find((entry) => entry.id === id);

    if (!course || !item) {
      return undefined;
    }

    const target = input.courseId && input.courseId !== courseId ? courseRepository.findById(input.courseId) : course;

    if (!target) {
      throw new InvalidInputError('That course no longer exists');
    }

    if (input.weight !== undefined || target !== course) {
      checkWeights(target, input.weight ?? item.weight, item.id);
    }

    const now = new Date().toISOString();
    const changes: Partial<Assessment> = { ...input, updatedAt: now };

    if (input.score !== undefined && input.score !== null) {
      changes.submitted = true;
    }

    if (target !== course) {
      changes.position = courseRepository.nextPosition(target.id);
    }

    courseRepository.updateAssessment(id, changes);
    courseRepository.update(target.id, { updatedAt: now });
    return courseRepository.update(courseId, { updatedAt: now });
  },

  deleteAssessment(courseId: string, id: string): CourseWithDetails | undefined {
    const course = courseRepository.findById(courseId);

    if (!course?.grading.some((item) => item.id === id)) {
      return undefined;
    }

    courseRepository.deleteAssessment(id);
    return courseRepository.update(courseId, { updatedAt: new Date().toISOString() });
  },
};
