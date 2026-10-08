import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { settings } from '../db/schema/index.js';

const settingsId = 1;

export const settingsRepository = {
  read(): Record<string, unknown> | undefined {
    return db.select().from(settings).where(eq(settings.id, settingsId)).get()?.data;
  },

  write(data: Record<string, unknown>, now: string) {
    db.insert(settings)
      .values({ id: settingsId, data, updatedAt: now })
      .onConflictDoUpdate({ target: settings.id, set: { data, updatedAt: now } })
      .run();
  },
};
