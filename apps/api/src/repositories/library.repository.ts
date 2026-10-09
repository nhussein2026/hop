import { eq } from 'drizzle-orm';

import type { Resource, ResourceFile, ResourceFileType } from '@hop/domain';

import { db } from '../db/client.js';
import { finds, ideas, resourceFiles, resources } from '../db/schema/index.js';

type ResourceRow = typeof resources.$inferSelect;
type StoredFile = ResourceFile & { data: Buffer };

/** File details without the contents, so listing the library never loads the files. */
const fileColumns = { resourceId: resourceFiles.resourceId, name: resourceFiles.name, type: resourceFiles.type, size: resourceFiles.size, uploadedAt: resourceFiles.createdAt };
type FileRow = { resourceId: string; name: string; type: string; size: number; uploadedAt: string };

function withFile(row: ResourceRow, file: FileRow | undefined): Resource {
  return { ...row, file: file ? { name: file.name, type: file.type as ResourceFileType, size: file.size, uploadedAt: file.uploadedAt } : null };
}

export const libraryRepository = {
  findAll(): Resource[] {
    const files = new Map(db.select(fileColumns).from(resourceFiles).all().map((file) => [file.resourceId, file]));
    return db.select().from(resources).all().map((row) => withFile(row, files.get(row.id)));
  },

  findById(id: string): Resource | undefined {
    const row = db.select().from(resources).where(eq(resources.id, id)).get();
    return row && withFile(row, db.select(fileColumns).from(resourceFiles).where(eq(resourceFiles.resourceId, id)).get());
  },

  create(resource: Omit<Resource, 'file'>): Resource {
    db.insert(resources).values(resource).run();
    return { ...resource, file: null };
  },

  update(id: string, changes: Partial<Omit<Resource, 'file'>>): Resource | undefined {
    db.update(resources).set(changes).where(eq(resources.id, id)).run();
    return this.findById(id);
  },

  /** Delete an item and its file. Ideas and Radar finds that linked to it keep everything else. */
  delete(id: string): boolean {
    return db.transaction((tx) => {
      tx.delete(resourceFiles).where(eq(resourceFiles.resourceId, id)).run();
      tx.update(finds).set({ resourceId: null }).where(eq(finds.resourceId, id)).run();
      for (const idea of tx.select({ id: ideas.id, resourceIds: ideas.resourceIds }).from(ideas).all()) {
        if (idea.resourceIds.includes(id)) tx.update(ideas).set({ resourceIds: idea.resourceIds.filter((resourceId) => resourceId !== id) }).where(eq(ideas.id, idea.id)).run();
      }
      return tx.delete(resources).where(eq(resources.id, id)).run().changes > 0;
    });
  },

  findFile(resourceId: string): StoredFile | undefined {
    const row = db.select().from(resourceFiles).where(eq(resourceFiles.resourceId, resourceId)).get();
    return row && { name: row.name, type: row.type as ResourceFileType, size: row.size, uploadedAt: row.createdAt, data: Buffer.from(row.data) };
  },

  saveFile(resourceId: string, file: StoredFile) {
    const values = { resourceId, name: file.name, type: file.type, size: file.size, data: file.data, createdAt: file.uploadedAt };
    db.insert(resourceFiles).values(values).onConflictDoUpdate({ target: resourceFiles.resourceId, set: values }).run();
  },

  deleteFile(resourceId: string) {
    db.delete(resourceFiles).where(eq(resourceFiles.resourceId, resourceId)).run();
  },
};
