import { z } from 'zod';
import { ASSESSMENT_TYPES, COURSE_STATUSES, IDEA_KINDS, IDEA_STAGES, KEY_DATE_KINDS, LETTER_GRADES, PIN_KINDS, RESOURCE_KINDS, THESIS_STEPS } from '@hop/domain';

import { dateSchema as date, entityIdSchema as id } from './common.js';

const text = (label: string, max: number) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const required = (label: string, max: number) => text(label, max).min(1, `${label} is required`);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 09:30');
const url = z.string().trim().max(2000, 'Links cannot exceed 2000 characters').regex(/^https?:\/\/\S+\.\S+/, 'Use a full link starting with https://');
const topics = z.array(text('Each topic', 60).min(1)).max(30, 'Use up to 30 topics');
const ids = z.array(id).max(200);

/* ---- Terms --------------------------------------------------------------------------- */
function endsAfterStart(value: { start?: string | undefined; end?: string | undefined }, ctx: z.RefinementCtx) {
  if (value.start && value.end && value.end < value.start) {
    ctx.addIssue({ code: 'custom', path: ['end'], message: 'A term cannot end before it starts' });
  }
}

const termFields = { name: required('Term name', 80), start: date, end: date };
export const createTermSchema = z.object(termFields).strict().superRefine(endsAfterStart);
export const updateTermSchema = z.object(termFields).partial().strict().superRefine(endsAfterStart);

/* ---- Courses --------------------------------------------------------------------------- */
/** SIS course codes: a 2–4 letter subject, an optional space, three digits and an optional letter. */
const courseCodeSchema = z.string().trim().toUpperCase().transform((value) => value.replace(/\s+/g, ' '))
  .refine((value) => /^[A-ZÇĞİÖŞÜ]{2,4} ?\d{3}[A-Z]?$/.test(value), 'Use the SIS format, like “BLG 527E”');

const classSlot = z.object({
  day: z.number().int().min(0).max(6),
  start: time,
  end: time,
  room: text('Room', 40),
}).strict().refine((slot) => slot.end > slot.start, { message: 'A class must end after it starts', path: ['end'] });

const vf = z.object({
  rule: text('VF rule', 300),
  minInTerm: z.number().min(0).max(100).nullable(),
  maxAbsences: z.number().int().min(0).max(60).nullable(),
}).strict();

const percent = z.number().min(0, 'Use 0 to 100').max(100, 'Use 0 to 100');
const weight = z.number().int('Use a whole number').min(1, 'Use the weight from the syllabus, 1 to 100').max(100, 'Use the weight from the syllabus, 1 to 100');

const courseFields = {
  code: courseCodeSchema,
  name: required('Course name', 160),
  termId: id.nullable(),
  status: z.enum(COURSE_STATUSES),
  crn: text('CRN', 20).nullable(),
  instructorId: id.nullable(),
  credits: z.number().min(0).max(30).nullable(),
  ects: z.number().min(0).max(60).nullable(),
  ninovaUrl: url.nullable(),
  schedule: z.array(classSlot).max(10),
  vf: vf.nullable(),
  absences: z.number().int().min(0).max(60),
  target: z.number().int().min(1, 'Use a target from 1 to 100').max(100, 'Use a target from 1 to 100').nullable(),
  grade: z.enum(LETTER_GRADES).nullable(),
  why: text('Why', 1000).nullable(),
};

const gradingItem = z.object({ title: required('Title', 120), type: z.enum(ASSESSMENT_TYPES), weight }).strict();

export const createCourseSchema = z.object({
  ...Object.fromEntries(Object.entries(courseFields).map(([key, schema]) => [key, key === 'code' || key === 'name' ? schema : schema.optional()])) as {
    [K in keyof typeof courseFields]: K extends 'code' | 'name' ? (typeof courseFields)[K] : z.ZodOptional<(typeof courseFields)[K]>
  },
  grading: z.array(gradingItem).max(40).optional(),
}).strict().refine((value) => !value.grading?.length || value.grading.reduce((sum, item) => sum + item.weight, 0) === 100, {
  message: 'Grading weights should add up to 100%',
  path: ['grading'],
});

export const updateCourseSchema = z.object(courseFields).partial().strict();

const assessmentFields = {
  title: required('Title', 120),
  type: z.enum(ASSESSMENT_TYPES),
  weight,
  due: date.nullable(),
  time: time.nullable(),
};

export const createAssessmentSchema = z.object({
  ...assessmentFields,
  due: assessmentFields.due.optional(),
  time: assessmentFields.time.optional(),
}).strict();

export const updateAssessmentSchema = z.object({
  ...assessmentFields,
  score: percent.nullable(),
  submitted: z.boolean(),
  courseId: id,
}).partial().strict();

export const completeCourseSchema = z.object({
  grade: z.enum(LETTER_GRADES),
}).strict();

/* ---- Handbook ------------------------------------------------------------------------------ */
const keyDateFields = { title: required('Title', 160), date, kind: z.enum(KEY_DATE_KINDS), note: text('Note', 300).nullable() };
export const createKeyDateSchema = z.object({ ...keyDateFields, note: keyDateFields.note.optional() }).strict();
export const updateKeyDateSchema = z.object(keyDateFields).partial().strict();

const pinFields = { kind: z.enum(PIN_KINDS), title: required('Title', 160), body: text('Details', 3000) };
export const createPinSchema = z.object({ ...pinFields, body: pinFields.body.optional() }).strict();
export const updatePinSchema = z.object(pinFields).partial().strict();

const linkFields = { title: required('Name', 160), url };
export const createUniLinkSchema = z.object(linkFields).strict();
export const updateUniLinkSchema = z.object(linkFields).partial().strict();

/* ---- Library ---------------------------------------------------------------------------------- */
const resourceFields = {
  kind: z.enum(RESOURCE_KINDS),
  title: required('Title', 200),
  url: url.nullable(),
  courseId: id.nullable(),
  topics,
  body: text('Note', 100_000),
  source: text('Source', 120).nullable(),
};

export const createResourceSchema = z.object({
  kind: resourceFields.kind,
  title: resourceFields.title,
  url: resourceFields.url.optional(),
  courseId: resourceFields.courseId.optional(),
  topics: topics.optional(),
  body: resourceFields.body.optional(),
  source: resourceFields.source.optional(),
}).strict();

export const updateResourceSchema = z.object(resourceFields).partial().strict();

/* ---- Research --------------------------------------------------------------------------------- */
const ideaFields = {
  title: required('Idea', 200),
  kind: z.enum(IDEA_KINDS),
  stage: z.enum(IDEA_STAGES),
  question: text('Research question', 1000),
  why: text('Why', 1000),
  nextStep: text('Next step', 200),
  resourceIds: ids,
  advisorIds: ids,
  courseIds: ids,
  findIds: ids,
  projectId: id.nullable(),
};

export const createIdeaSchema = z.object({
  ...Object.fromEntries(Object.entries(ideaFields).map(([key, schema]) => [key, key === 'title' ? schema : schema.optional()])) as {
    [K in keyof typeof ideaFields]: K extends 'title' ? (typeof ideaFields)[K] : z.ZodOptional<(typeof ideaFields)[K]>
  },
}).strict();

export const updateIdeaSchema = z.object(ideaFields).partial().strict();

export const programSchema = z.object({
  degree: text('Degree', 40),
  department: text('Department', 120),
  weeks: z.number().int().min(1, 'Use 1 to 30 weeks').max(30, 'Use 1 to 30 weeks'),
  thesisStep: z.enum(THESIS_STEPS),
  advisorId: id.nullable(),
}).partial().strict();
