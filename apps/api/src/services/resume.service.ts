import { randomUUID } from 'node:crypto';

import { RESUME_FILE_MAX_BYTES } from '@hop/domain';
import type { CreateResumeInput, Resume, ResumeFileType, UpdateResumeInput } from '@hop/domain';

import { InvalidInputError } from '../errors.js';
import { resumeRepository } from '../repositories/resume.repository.js';

const PDF: ResumeFileType = 'application/pdf';
const DOCX: ResumeFileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Decide the type from the contents and name, never from what the browser claims. */
function detectType(name: string, data: Buffer): ResumeFileType | undefined {
  const extension = name.toLowerCase().split('.').pop();

  if (extension === 'pdf' && data.subarray(0, 5).toString('latin1') === '%PDF-') {
    return PDF;
  }

  // A .docx file is a zip archive, which starts with "PK\x03\x04".
  if (extension === 'docx' && data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return DOCX;
  }

  return undefined;
}

/** Keep the name readable but safe to show and to send back in a download header. */
function cleanFileName(name: string) {
  const cleaned = name.replace(/[\\/]/g, '-').replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(-200);
  return cleaned || 'resume';
}

export const resumeService = {
  getAll(): Resume[] {
    return resumeRepository.findAll();
  },

  /** Each new version gets the next number, so v3 is always newer than v2. */
  create(input: CreateResumeInput): Resume {
    const now = new Date().toISOString();

    return resumeRepository.create({
      id: randomUUID(),
      name: input.name,
      version: resumeRepository.latestVersion() + 1,
      focus: input.focus ?? null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },

  update(id: string, input: UpdateResumeInput): Resume | undefined {
    if (!resumeRepository.findById(id)) {
      return undefined;
    }

    return resumeRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  /** Attach a PDF or Word document to a version, replacing any earlier one. Throws InvalidInputError for other files. */
  attachFile(id: string, fileName: string, data: Buffer): Resume | undefined {
    if (!resumeRepository.findById(id)) {
      return undefined;
    }

    if (data.length === 0) {
      throw new InvalidInputError('The file is empty.');
    }

    if (data.length > RESUME_FILE_MAX_BYTES) {
      throw new InvalidInputError('The file is larger than 10 MB.');
    }

    const name = cleanFileName(fileName);
    const type = detectType(name, data);

    if (!type) {
      throw new InvalidInputError('Only PDF and Word (.docx) files can be attached.');
    }

    const now = new Date().toISOString();
    resumeRepository.saveFile(id, { name, type, size: data.length, uploadedAt: now, data });
    return resumeRepository.update(id, { updatedAt: now });
  },

  removeFile(id: string): Resume | undefined {
    if (!resumeRepository.findById(id)) {
      return undefined;
    }

    resumeRepository.deleteFile(id);
    return resumeRepository.update(id, { updatedAt: new Date().toISOString() });
  },

  getFile(id: string) {
    return resumeRepository.findFile(id);
  },
};
