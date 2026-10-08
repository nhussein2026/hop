import test from 'node:test';
import assert from 'node:assert/strict';

import { backupRepository } from '../repositories/backup.repository.js';
import { backupService } from './backup.service.js';
import { resumeService } from './resume.service.js';

const pdf = Buffer.from('%PDF-1.7\n% a tiny resume\n');
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('word/document.xml')]);

test('a PDF attaches to a resume version and can be read back', () => {
  const resume = resumeService.create({ name: 'Backend' });
  const updated = resumeService.attachFile(resume.id, 'Nasser CV.pdf', pdf);

  assert.deepEqual(updated?.file && { name: updated.file.name, type: updated.file.type, size: updated.file.size }, { name: 'Nasser CV.pdf', type: 'application/pdf', size: pdf.length });
  assert.equal(resumeService.getAll().find((r) => r.id === resume.id)?.file?.name, 'Nasser CV.pdf');
  assert.ok(resumeService.getFile(resume.id)?.data.equals(pdf));
});

test('uploading again replaces the file, and it can be removed', () => {
  const resume = resumeService.create({ name: 'AI roles' });
  resumeService.attachFile(resume.id, 'first.pdf', pdf);
  const replaced = resumeService.attachFile(resume.id, 'second.docx', docx);

  assert.equal(replaced?.file?.name, 'second.docx');
  assert.equal(replaced?.file?.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(resumeService.removeFile(resume.id)?.file, null);
  assert.equal(resumeService.getFile(resume.id), undefined);
});

test('only real PDF and Word files are accepted', () => {
  const resume = resumeService.create({ name: 'Checks' });

  assert.throws(() => resumeService.attachFile(resume.id, 'resume.pdf', Buffer.from('<html>not a pdf</html>')), /Only PDF and Word/);
  assert.throws(() => resumeService.attachFile(resume.id, 'resume.exe', pdf), /Only PDF and Word/);
  assert.throws(() => resumeService.attachFile(resume.id, 'resume.pdf', Buffer.alloc(0)), /empty/);
  assert.equal(resumeService.attachFile('missing', 'resume.pdf', pdf), undefined);
});

test('file names are cleaned before they are stored', () => {
  const resume = resumeService.create({ name: 'Names' });
  assert.equal(resumeService.attachFile(resume.id, '../../etc/"cv"\n.pdf', pdf)?.file?.name, '..-..-etc-cv.pdf');
});

test('backups carry resume files and restore them byte for byte', () => {
  const resume = resumeService.create({ name: 'Backed up' });
  resumeService.attachFile(resume.id, 'backed-up.pdf', pdf);

  const snapshot = backupService.createSnapshot();
  const row = snapshot.resumeFiles.find((file) => file.resumeId === resume.id);
  assert.equal(row?.data, pdf.toString('base64'));
  assert.equal(JSON.parse(JSON.stringify(snapshot)).resumeFiles.length, snapshot.resumeFiles.length);

  resumeService.removeFile(resume.id);
  backupRepository.replaceAllTables(snapshot);

  assert.ok(resumeService.getFile(resume.id)?.data.equals(pdf));
  assert.equal(backupRepository.restoreIntoScratch(snapshot).resumeFiles, snapshot.resumeFiles.length);
});
