import test from 'node:test';
import assert from 'node:assert/strict';

import { projectService } from './project.service.js';

test('projectService.create assigns defaults for an active project', () => {
  const project = projectService.create({
    name: 'Build an NLP classifier',
    blurb: 'A small project for practicing applied machine learning.',
  });

  assert.equal(project.name, 'Build an NLP classifier');
  assert.equal(project.status, 'planned');
  assert.deepEqual(project.stack, []);
  assert.deepEqual(project.goalIds, []);
  assert.ok(project.createdAt.length > 0);
});

test('projectService.update preserves and changes project relationships', () => {
  const project = projectService.create({ name: 'Ship a portfolio site' });
  const updated = projectService.update(project.id, {
    status: 'deployed',
    stack: ['React', 'TypeScript'],
    skillIds: ['skill-typescript'],
  });

  assert.ok(updated);
  assert.equal(updated?.status, 'deployed');
  assert.deepEqual(updated?.stack, ['React', 'TypeScript']);
  assert.deepEqual(updated?.skillIds, ['skill-typescript']);
});
