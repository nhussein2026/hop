import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDatabasePath, resolvePort } from './config.js';

test('resolveDatabasePath uses the repository storage directory by default', () => {
  const path = resolveDatabasePath('./storage/hop.db');

  assert.match(path, /storage[\\/]hop\.db$/);
});

test('resolvePort uses the configured PORT when present', () => {
  const original = process.env.PORT;
  process.env.PORT = '5050';

  try {
    assert.equal(resolvePort(), 5050);
  } finally {
    if (original === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = original;
    }
  }
});
