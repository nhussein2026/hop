import test from 'node:test';
import assert from 'node:assert/strict';

import { skillService } from './skill.service.js';

test('skillService.create assigns defaults and timestamps', () => {
  const skill = skillService.create({
    name: 'TypeScript',
    category: 'Engineering',
  });

  assert.equal(skill.name, 'TypeScript');
  assert.equal(skill.type, 'tool');
  assert.equal(skill.focus, 'keep');
  assert.equal(skill.listed, false);
  assert.equal(skill.bar, null);
  assert.equal(skill.confidence, null);
  assert.ok(skill.id.length > 0);
  assert.ok(skill.createdAt.length > 0);
});

test('skillService.create gives new skills no self-assessed level', () => {
  const skill = skillService.create({ name: 'Data structures', type: 'fundamental', focus: 'core' });

  assert.equal(skill.level, null);
  assert.equal(skillService.getById(skill.id)?.level, null);
  assert.equal(skillService.getById(skill.id)?.type, 'fundamental');
});

test('skillService.update records the bar, focus and listing', () => {
  const skill = skillService.create({
    name: 'System design',
  });

  const updated = skillService.update(skill.id, {
    focus: 'standout',
    listed: true,
    bar: 'A design review signed off by a senior engineer.',
    confidence: 6,
    lastPracticedAt: '2026-09-17',
  });

  assert.ok(updated);
  assert.equal(updated?.focus, 'standout');
  assert.equal(updated?.listed, true);
  assert.equal(updated?.bar, 'A design review signed off by a senior engineer.');
  assert.equal(updated?.confidence, 6);
  assert.equal(updated?.lastPracticedAt, '2026-09-17');
});
