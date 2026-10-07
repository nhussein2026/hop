import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

import { resolveDatabasePath } from './src/config.js';

export default defineConfig({
  dialect: 'sqlite',

  schema: './src/db/schema/index.ts',

  out: '../../db/migrations',

  dbCredentials: {
    url: resolveDatabasePath(),
  },
});
