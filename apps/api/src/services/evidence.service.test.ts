import test from 'node:test';
import assert from 'node:assert/strict';

import { evidenceService } from './evidence.service.js';

test('evidenceService.create stores proof and relationships', () => {
  const item = evidenceService.create({
    title: 'Deployed the Hop API',
    description: 'Built and shipped the first private API slice.',
    skillId: 'skill-typescript',
    projectId: 'project-hop',
    date: '2026-09-17',
  });

  assert.equal(item.title, 'Deployed the Hop API');
  assert.equal(item.skillId, 'skill-typescript');
  assert.equal(item.projectId, 'project-hop');
  assert.ok(item.id.length > 0);
});

test('evidenceService.update changes the proof description', () => {
  const item = evidenceService.create({ title: 'Completed a certification' });
  const updated = evidenceService.update(item.id, {
    description: 'Passed the final assessment.',
  });

  assert.ok(updated);
  assert.equal(updated?.description, 'Passed the final assessment.');
});
