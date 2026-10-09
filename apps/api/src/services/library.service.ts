import { randomUUID } from 'node:crypto';

import { RESOURCE_FILE_MAX_BYTES } from '@hop/domain';
import type { CreateResourceInput, Resource, ResourceFileType, UpdateResourceInput } from '@hop/domain';

import { InvalidInputError } from '../errors.js';
import { libraryRepository } from '../repositories/library.repository.js';

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

/** Decide the type from the contents and name, never from what the browser claims. */
export function detectResourceType(name: string, data: Buffer): ResourceFileType | undefined {
  const extension = name.toLowerCase().split('.').pop();
  const starts = (magic: Buffer) => data.subarray(0, magic.length).equals(magic);

  if (extension === 'pdf' && data.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (extension === 'pptx' && starts(ZIP)) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (extension === 'docx' && starts(ZIP)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === 'zip' && starts(ZIP)) return 'application/zip';
  if (extension === 'png' && starts(PNG)) return 'image/png';
  if ((extension === 'jpg' || extension === 'jpeg') && starts(JPEG)) return 'image/jpeg';
  // A notebook is JSON text.
  if (extension === 'ipynb' && data.subarray(0, 64).toString('utf8').trimStart().startsWith('{')) return 'application/x-ipynb+json';
  return undefined;
}

/** Keep the name readable but safe to show and to send back in a download header. */
function cleanFileName(name: string) {
  const cleaned = name.replace(/[\\/]/g, '-').replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(-200);
  return cleaned || 'file';
}

export const libraryService = {
  getAll(): Resource[] {
    return libraryRepository.findAll();
  },

  create(input: CreateResourceInput): Resource {
    const now = new Date().toISOString();
    const note = input.kind === 'note';

    return libraryRepository.create({
      id: randomUUID(),
      kind: input.kind,
      title: input.title,
      url: note ? null : input.url ?? null,
      courseId: input.courseId ?? null,
      topics: input.topics ?? [],
      body: note ? input.body ?? '' : '',
      source: input.source ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },

  update(id: string, input: UpdateResourceInput): Resource | undefined {
    if (!libraryRepository.findById(id)) {
      return undefined;
    }

    return libraryRepository.update(id, { ...input, updatedAt: new Date().toISOString() });
  },

  delete(id: string): boolean {
    return libraryRepository.delete(id);
  },

  /** Attach a file to an item, replacing any earlier one. Throws InvalidInputError for files Hop doesn't keep. */
  attachFile(id: string, fileName: string, data: Buffer): Resource | undefined {
    if (!libraryRepository.findById(id)) {
      return undefined;
    }

    if (data.length === 0) {
      throw new InvalidInputError('The file is empty.');
    }

    if (data.length > RESOURCE_FILE_MAX_BYTES) {
      throw new InvalidInputError('The file is larger than 20 MB.');
    }

    const name = cleanFileName(fileName);
    const type = detectResourceType(name, data);

    if (!type) {
      throw new InvalidInputError('Hop keeps PDF, PowerPoint, Word, zip, notebook, PNG and JPEG files.');
    }

    const now = new Date().toISOString();
    libraryRepository.saveFile(id, { name, type, size: data.length, uploadedAt: now, data });
    return libraryRepository.update(id, { updatedAt: now });
  },

  removeFile(id: string): Resource | undefined {
    if (!libraryRepository.findById(id)) {
      return undefined;
    }

    libraryRepository.deleteFile(id);
    return libraryRepository.update(id, { updatedAt: new Date().toISOString() });
  },

  getFile(id: string) {
    return libraryRepository.findFile(id);
  },
};
