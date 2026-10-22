import test from 'node:test';
import assert from 'node:assert/strict';

import { InvalidInputError } from '../errors.js';
import { evidenceRepository } from '../repositories/evidence.repository.js';
import { evidenceService } from './evidence.service.js';

test('evidenceService.create stores proof and relationships', () => {
  const item = evidenceService.create({
    title: 'Deployed the Hop API',
    kind: 'built',
    description: 'Built and shipped the first private API slice.',
    skillId: 'skill-typescript',
    projectId: 'project-hop',
    date: '2026-09-17',
  });

  assert.equal(item.title, 'Deployed the Hop API');
  assert.equal(item.kind, 'built');
  assert.equal(item.skillId, 'skill-typescript');
  assert.equal(item.projectId, 'project-hop');
  assert.ok(item.id.length > 0);
});

test('evidenceService.update changes the proof description', () => {
  const item = evidenceService.create({ title: 'Completed a certification', kind: 'learned' });
  const updated = evidenceService.update(item.id, {
    description: 'Passed the final assessment.',
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'Passed the final assessment.');
});

test('evidenceService refuses a review without who reviewed it or when', () => {
  assert.throws(() => evidenceService.create({ title: 'Code review of the Hop API', kind: 'review', date: '2026-10-01' }), (error) => error instanceof InvalidInputError && /who reviewed it/.test(error.message));
  assert.throws(() => evidenceService.create({ title: 'Code review of the Hop API', kind: 'review', by: '   ', date: '2026-10-01' }), /who reviewed it/);
  assert.throws(() => evidenceService.create({ title: 'Code review of the Hop API', kind: 'review', by: 'Senior engineer at Getir' }), /needs a date/);

  const review = evidenceService.create({ title: 'Code review of the Hop API', kind: 'review', by: 'Senior engineer at Getir', result: 'Approved', date: '2026-10-01' });
  assert.equal(review.by, 'Senior engineer at Getir');
  assert.equal(review.result, 'Approved');
});

test('evidenceService checks a new kind against what the entry already has', () => {
  // An entry recorded before kinds existed: no kind, no date.
  const stamp = '2026-09-01T00:00:00.000Z';
  const item = evidenceRepository.create({
    id: 'legacy-evidence', title: 'Completed BLG 527E', description: null, kind: null, by: null, result: null, skillId: null, skillIds: [],
    projectId: null, opportunityId: null, goalId: null, courseId: null, url: null, date: null, createdAt: stamp, updatedAt: stamp,
  });

  assert.throws(() => evidenceService.update(item.id, { kind: 'test' }), /who graded it/);
  assert.throws(() => evidenceService.update(item.id, { kind: 'test', by: 'İTÜ, BLG 527E' }), /needs a date/);

  const test = evidenceService.update(item.id, { kind: 'test', by: 'İTÜ, BLG 527E', result: 'BA', date: '2027-01-20', courseId: 'course-1' });
  assert.equal(test?.kind, 'test');
  assert.equal(test?.courseId, 'course-1');

  assert.throws(() => evidenceService.update(item.id, { by: null }), /who graded it/);
  assert.throws(() => evidenceService.update(item.id, { date: null }), /needs a date/);
  assert.equal(evidenceService.update(item.id, { kind: 'built', by: null, date: null })?.kind, 'built');
});
