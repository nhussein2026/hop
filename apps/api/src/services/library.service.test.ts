import test from 'node:test';
import assert from 'node:assert/strict';

import { InvalidInputError } from '../errors.js';
import { detectResourceType, libraryService } from './library.service.js';
import { findService, ideaService } from './research.service.js';

const pdf = Buffer.from('%PDF-1.7\n%test file\n');
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

test('file types come from the contents, not just the name', () => {
  assert.equal(detectResourceType('Midterm.pdf', pdf), 'application/pdf');
  assert.equal(detectResourceType('Week 1.pptx', zip), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.equal(detectResourceType('notebook.ipynb', Buffer.from('  {"cells": []}')), 'application/x-ipynb+json');
  assert.equal(detectResourceType('photo.JPG', Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectResourceType('fake.pdf', zip), undefined);
  assert.equal(detectResourceType('script.sh', Buffer.from('#!/bin/sh')), undefined);
});

test('a note keeps its text and never a link', () => {
  const note = libraryService.create({ kind: 'note', title: 'Bias and variance', body: 'Expected error = bias² + variance + noise', url: 'https://example.com' });

  assert.equal(note.body, 'Expected error = bias² + variance + noise');
  assert.equal(note.url, null);
  assert.equal(note.file, null);
});

test('a file can be attached, replaced and removed', () => {
  const item = libraryService.create({ kind: 'past-exam', title: 'Midterm 2024' });
  const attached = libraryService.attachFile(item.id, 'midterm.pdf', pdf);

  assert.equal(attached?.file?.name, 'midterm.pdf');
  assert.equal(attached?.file?.type, 'application/pdf');
  assert.equal(libraryService.getFile(item.id)?.data.toString('latin1'), pdf.toString('latin1'));
  assert.throws(() => libraryService.attachFile(item.id, 'virus.exe', Buffer.from('MZ')), InvalidInputError);
  assert.throws(() => libraryService.attachFile(item.id, 'empty.pdf', Buffer.alloc(0)), InvalidInputError);
  assert.equal(libraryService.removeFile(item.id)?.file, null);
  assert.equal(libraryService.attachFile('missing', 'a.pdf', pdf), undefined);
});

test('deleting a library item unlinks it from ideas and Radar finds', () => {
  const paper = libraryService.create({ kind: 'paper', title: 'LoRA', url: 'https://arxiv.org/abs/2106.09685' });
  libraryService.attachFile(paper.id, 'lora.pdf', pdf);
  const idea = ideaService.create({ title: 'LoRA for Turkish', resourceIds: [paper.id] });
  const find = findService.create({ kind: 'paper', title: 'LoRA', why: 'Baseline', url: 'https://arxiv.org/abs/2106.09685v2' });
  findService.update(find.id, { status: 'kept', resourceId: paper.id });

  assert.equal(libraryService.delete(paper.id), true);
  assert.equal(libraryService.getFile(paper.id), undefined);
  assert.deepEqual(ideaService.getAll().find((i) => i.id === idea.id)?.resourceIds, []);
  assert.equal(findService.getAll().find((f) => f.id === find.id)?.resourceId, null);
});
