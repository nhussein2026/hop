import { eq, max } from 'drizzle-orm';

import type { Resume, ResumeFile, ResumeFileType } from '@hop/domain';

import { db } from '../db/client.js';
import { resumeFiles, resumes } from '../db/schema/index.js';

type ResumeRow = typeof resumes.$inferSelect;
type StoredFile = ResumeFile & { data: Buffer };

/** File details without the contents, so listing resumes never loads the documents. */
const fileColumns = { resumeId: resumeFiles.resumeId, name: resumeFiles.name, type: resumeFiles.type, size: resumeFiles.size, uploadedAt: resumeFiles.createdAt };

function withFile(row: ResumeRow, file: (ResumeFile & { resumeId: string }) | undefined): Resume {
  return { ...row, file: file ? { name: file.name, type: file.type, size: file.size, uploadedAt: file.uploadedAt } : null };
}

export const resumeRepository = {
  findAll(): Resume[] {
    const files = new Map(db.select(fileColumns).from(resumeFiles).all().map((file) => [file.resumeId, file as ResumeFile & { resumeId: string }]));
    return db.select().from(resumes).all().map((row) => withFile(row, files.get(row.id)));
  },

  findById(id: string): Resume | undefined {
    const row = db.select().from(resumes).where(eq(resumes.id, id)).get();
    const file = db.select(fileColumns).from(resumeFiles).where(eq(resumeFiles.resumeId, id)).get();
    return row && withFile(row, file as (ResumeFile & { resumeId: string }) | undefined);
  },

  latestVersion(): number {
    return db.select({ version: max(resumes.version) }).from(resumes).get()?.version ?? 0;
  },

  create(resume: Omit<Resume, 'file'>): Resume {
    db.insert(resumes).values(resume).run();
    return { ...resume, file: null };
  },

  update(id: string, changes: Partial<Omit<Resume, 'file'>>): Resume | undefined {
    db.update(resumes).set(changes).where(eq(resumes.id, id)).run();
    return this.findById(id);
  },

  findFile(resumeId: string): StoredFile | undefined {
    const row = db.select().from(resumeFiles).where(eq(resumeFiles.resumeId, resumeId)).get();
    return row && { name: row.name, type: row.type as ResumeFileType, size: row.size, uploadedAt: row.createdAt, data: Buffer.from(row.data) };
  },

  saveFile(resumeId: string, file: StoredFile) {
    const values = { resumeId, name: file.name, type: file.type, size: file.size, data: file.data, createdAt: file.uploadedAt };
    db.insert(resumeFiles).values(values).onConflictDoUpdate({ target: resumeFiles.resumeId, set: values }).run();
  },

  deleteFile(resumeId: string) {
    db.delete(resumeFiles).where(eq(resumeFiles.resumeId, resumeId)).run();
  },
};
