import test from 'node:test';
import assert from 'node:assert/strict';

import { skillService } from './skill.service.js';

test('skillService.create assigns defaults and timestamps', () => {
  const skill = skillService.create({
    name: 'TypeScript',
    category: 'Engineering',
  });

  assert.equal(skill.name, 'TypeScript');
  assert.equal(skill.level, 'learning');
  assert.equal(skill.confidence, null);
  assert.ok(skill.id.length > 0);
  assert.ok(skill.createdAt.length > 0);
});

test('skillService.update records progress fields', () => {
  const skill = skillService.create({
    name: 'System design',
  });

  const updated = skillService.update(skill.id, {
    level: 'practicing',
    confidence: 6,
    lastPracticedAt: '2026-09-17',
  });

  assert.ok(updated);
  assert.equal(updated?.level, 'practicing');
  assert.equal(updated?.confidence, 6);
  assert.equal(updated?.lastPracticedAt, '2026-09-17');
});
