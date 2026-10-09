import { asc, eq, max } from 'drizzle-orm';

import type { Assessment, Course, CourseWithDetails, Term } from '@hop/domain';

import { db } from '../db/client.js';
import { assessments, courses, ideas, resources, tasks, terms } from '../db/schema/index.js';

function withGrading(course: Course, grading: Assessment[]): CourseWithDetails {
  return { ...course, grading: grading.filter((item) => item.courseId === course.id) };
}

export const termRepository = {
  findAll(): Term[] {
    return db.select().from(terms).orderBy(asc(terms.start)).all();
  },

  findById(id: string): Term | undefined {
    return db.select().from(terms).where(eq(terms.id, id)).get();
  },

  create(term: Term): Term {
    db.insert(terms).values(term).run();
    return term;
  },

  update(id: string, changes: Partial<Term>): Term | undefined {
    db.update(terms).set(changes).where(eq(terms.id, id)).run();
    return this.findById(id);
  },

  /** Courses in the term stay, without a term. */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.update(courses).set({ termId: null }).where(eq(courses.termId, id)).run();
      return tx.delete(terms).where(eq(terms.id, id)).run().changes > 0;
    });
  },
};

export const courseRepository = {
  findAll(): CourseWithDetails[] {
    const grading = db.select().from(assessments).orderBy(asc(assessments.position)).all();
    return db.select().from(courses).all().map((course) => withGrading(course, grading));
  },

  findById(id: string): CourseWithDetails | undefined {
    const course = db.select().from(courses).where(eq(courses.id, id)).get();
    return course && withGrading(course, this.findGrading(id));
  },

  findGrading(courseId: string): Assessment[] {
    return db.select().from(assessments).where(eq(assessments.courseId, courseId)).orderBy(asc(assessments.position)).all();
  },

  findAssessment(id: string): Assessment | undefined {
    return db.select().from(assessments).where(eq(assessments.id, id)).get();
  },

  nextPosition(courseId: string): number {
    return (db.select({ last: max(assessments.position) }).from(assessments).where(eq(assessments.courseId, courseId)).get()?.last ?? -1) + 1;
  },

  create(course: Course, grading: Assessment[]): CourseWithDetails {
    db.transaction((tx) => {
      tx.insert(courses).values(course).run();
      if (grading.length) tx.insert(assessments).values(grading).run();
    });
    return withGrading(course, grading);
  },

  update(id: string, changes: Partial<Course>): CourseWithDetails | undefined {
    db.update(courses).set(changes).where(eq(courses.id, id)).run();
    return this.findById(id);
  },

  /**
   * Delete a course and its graded items. Library items, tasks and ideas that pointed at it stay,
   * unlinked, so nothing else is lost with it.
   */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.delete(assessments).where(eq(assessments.courseId, id)).run();
      tx.update(resources).set({ courseId: null }).where(eq(resources.courseId, id)).run();
      tx.update(tasks).set({ courseId: null, assessmentId: null }).where(eq(tasks.courseId, id)).run();
      for (const idea of tx.select({ id: ideas.id, courseIds: ideas.courseIds }).from(ideas).all()) {
        if (idea.courseIds.includes(id)) tx.update(ideas).set({ courseIds: idea.courseIds.filter((courseId) => courseId !== id) }).where(eq(ideas.id, idea.id)).run();
      }
      return tx.delete(courses).where(eq(courses.id, id)).run().changes > 0;
    });
  },

  createAssessment(assessment: Assessment) {
    db.insert(assessments).values(assessment).run();
  },

  updateAssessment(id: string, changes: Partial<Assessment>) {
    db.update(assessments).set(changes).where(eq(assessments.id, id)).run();
  },

  /** Prep tasks stay, unlinked from the deleted item. */
  deleteAssessment(id: string) {
    db.transaction((tx) => {
      tx.update(tasks).set({ assessmentId: null }).where(eq(tasks.assessmentId, id)).run();
      tx.delete(assessments).where(eq(assessments.id, id)).run();
    });
  },
};
