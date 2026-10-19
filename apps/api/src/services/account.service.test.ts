import test from 'node:test';
import assert from 'node:assert/strict';

import { accountService } from './account.service.js';

test('an account starts as a free, active one and keeps no secrets', () => {
  const account = accountService.create({ name: 'GitHub', login: 'naser@example.com', secretIn: 'Bitwarden' });

  assert.deepEqual([account.status, account.cycle, account.currency, account.cost], ['active', 'none', 'TRY', null]);
  assert.equal('password' in account, false);
  assert.equal(accountService.update('missing', { status: 'cancelled' }), undefined);
  assert.equal(accountService.update(account.id, { status: 'cancelled' })?.status, 'cancelled');
  assert.equal(accountService.delete(account.id), true);
});
