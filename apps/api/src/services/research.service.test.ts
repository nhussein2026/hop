import test from 'node:test';
import assert from 'node:assert/strict';

import { createFindSchema } from '@hop/validation';

import { ConflictError } from '../errors.js';
import { findService, ideaService } from './research.service.js';

test('a new find lands in the inbox', () => {
  const find = findService.create({ kind: 'repo', title: 'microsoft/graphrag', why: 'A baseline for the thesis idea', url: 'https://github.com/microsoft/graphrag' });

  assert.equal(find.status, 'inbox');
  assert.equal(find.source, 'Web');
  assert.deepEqual(find.topics, []);
});

test('the same link cannot be saved twice, even with a trailing slash', () => {
  findService.create({ kind: 'tool', title: 'uv', why: 'Faster environments', url: 'https://github.com/astral-sh/uv' });

  assert.throws(() => findService.create({ kind: 'tool', title: 'uv again', why: 'Again', url: 'https://github.com/astral-sh/uv/' }), ConflictError);
  assert.doesNotThrow(() => findService.create({ kind: 'event', title: 'Seminar', why: 'Ask about open problems' }));
  assert.doesNotThrow(() => findService.create({ kind: 'event', title: 'Another seminar', why: 'Also without a link' }));
});

test('a find can go straight onto the To explore shelf, but nowhere else', () => {
  const find = findService.create({ kind: 'site', title: 'note.com', why: 'Heard about it; curious', url: 'https://note.com/', status: 'explore' });

  assert.equal(find.status, 'explore');
  assert.equal(createFindSchema.safeParse({ kind: 'site', title: 'x', why: 'y', status: 'kept' }).success, false);
});

test('a find can be edited, but not to a link already on the radar', () => {
  findService.create({ kind: 'opportunity', title: 'Trendyol careers', why: 'Jobs at Trendyol', url: 'https://careers.trendyol.com' });
  const find = findService.create({ kind: 'opportunity', title: 'Microsoft Careef Platform', why: 'Jobs at Microsoft', url: 'https://careers.microsoft.com' });

  const renamed = findService.update(find.id, { title: 'Microsoft Careers', url: 'https://careers.microsoft.com/' })!;
  assert.equal(renamed.title, 'Microsoft Careers');
  assert.throws(() => findService.update(find.id, { url: 'https://careers.trendyol.com/' }), ConflictError);
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.url, 'https://careers.microsoft.com/');
});

test('every find needs one line on why it matters', () => {
  assert.equal(createFindSchema.safeParse({ kind: 'repo', title: 'x', why: '   ' }).success, false);
  assert.equal(createFindSchema.safeParse({ kind: 'repo', title: 'x', why: 'Because', url: 'not a link' }).success, false);
});

test('an idea made from a find takes it out of the inbox', () => {
  const find = findService.create({ kind: 'paper', title: 'Lost in the Middle', why: 'Long contexts hurt answers', url: 'https://arxiv.org/abs/2307.03172' });
  const idea = ideaService.create({ title: 'Small LLMs for legal retrieval', kind: 'thesis', findIds: [find.id] });

  assert.equal(idea.stage, 'spark');
  const converted = findService.getAll().find((f) => f.id === find.id);
  assert.equal(converted?.status, 'converted');
  assert.equal(converted?.ideaId, idea.id);

  assert.equal(ideaService.delete(idea.id), true);
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.ideaId, null);
});
