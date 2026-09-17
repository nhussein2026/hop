import { eq } from 'drizzle-orm';

import type { Project } from '@hop/domain';

import { db } from '../db/client.js';
import { projects } from '../db/schema/index.js';

function decodeProject(row: typeof projects.$inferSelect): Project {
  return {
    ...row,
    stack: JSON.parse(row.stack) as string[],
    goalIds: JSON.parse(row.goalIds) as string[],
    skillIds: JSON.parse(row.skillIds) as string[],
  };
}

function encodeProject(project: Project) {
  return {
    ...project,
    stack: JSON.stringify(project.stack),
    goalIds: JSON.stringify(project.goalIds),
    skillIds: JSON.stringify(project.skillIds),
  };
}

export const projectRepository = {
  findAll(): Project[] {
    return db.select().from(projects).all().map(decodeProject);
  },

  findById(id: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.id, id)).get();
    return row ? decodeProject(row) : undefined;
  },

  create(project: Project): Project {
    db.insert(projects).values(encodeProject(project)).run();
    return project;
  },

  update(id: string, changes: Partial<Project>): Project | undefined {
    const encoded = {
      ...changes,
      stack: changes.stack ? JSON.stringify(changes.stack) : undefined,
      goalIds: changes.goalIds ? JSON.stringify(changes.goalIds) : undefined,
      skillIds: changes.skillIds ? JSON.stringify(changes.skillIds) : undefined,
    } as Partial<typeof projects.$inferInsert>;
    db.update(projects).set(encoded).where(eq(projects.id, id)).run();
    return this.findById(id);
  },
};
