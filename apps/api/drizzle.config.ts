import { fileURLToPath } from 'node:url';

import { defineConfig } from 'drizzle-kit';

const databasePath = fileURLToPath(
  new URL('../../storage/hop.db', import.meta.url),
);

export default defineConfig({
  dialect: 'sqlite',

  schema: './src/db/schema/index.ts',

  out: '../../db/migrations',

  dbCredentials: {
    url: databasePath,
  },
});