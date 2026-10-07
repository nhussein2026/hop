import test from 'node:test';
import assert from 'node:assert/strict';

import { authService } from '../services/auth.service.js';
import { ConflictError } from '../errors.js';
import { isSameOriginRequest } from './http.js';
import { hashPassword, verifyPassword } from './password.js';
import { createRateLimiter } from './rate-limit.js';

test('hashPassword produces salted hashes that verifyPassword accepts', async () => {
  const first = await hashPassword('correct horse battery');
  const second = await hashPassword('correct horse battery');

  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery', first), true);
  assert.equal(await verifyPassword('wrong horse battery', first), false);
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
});

test('rate limiter blocks after the maximum failures until the window ends', () => {
  const limiter = createRateLimiter({ maxFailures: 2, windowMs: 1000 });

  limiter.recordFailure('client', 0);
  assert.equal(limiter.retryAfterSeconds('client', 10), 0);
  limiter.recordFailure('client', 20);
  assert.equal(limiter.retryAfterSeconds('client', 20), 1);
  assert.equal(limiter.retryAfterSeconds('other', 20), 0);
  assert.equal(limiter.retryAfterSeconds('client', 1000), 0);
});

test('isSameOriginRequest rejects requests from another site', () => {
  const request = (headers: Record<string, string>) => ({ headers }) as unknown as import('node:http').IncomingMessage;

  assert.equal(isSameOriginRequest(request({ host: 'localhost:5173', origin: 'http://localhost:5173' })), true);
  assert.equal(isSameOriginRequest(request({ host: 'localhost:5173' })), true);
  assert.equal(isSameOriginRequest(request({ host: 'localhost:5173', origin: 'https://evil.example' })), false);
  assert.equal(isSameOriginRequest(request({ host: 'localhost:5173', origin: 'null' })), false);
  assert.equal(isSameOriginRequest(request({ host: '127.0.0.1:4321', 'x-forwarded-host': 'hop.example.ts.net', origin: 'https://hop.example.ts.net' })), true);
});

test('authService supports setup, login, logout, password change, and reset', async () => {
  authService.reset();
  assert.equal(authService.isSetupRequired(), true);

  const setupSession = await authService.setup('first password 123', 'test');
  assert.equal(authService.isSetupRequired(), false);
  assert.equal(authService.validateSession(setupSession.token), true);
  await assert.rejects(authService.setup('another password 1', 'test'), ConflictError);

  assert.equal(await authService.login('wrong password', 'test'), undefined);
  const loginSession = await authService.login('first password 123', 'test');
  assert.ok(loginSession);

  authService.logout(loginSession.token);
  assert.equal(authService.validateSession(loginSession.token), false);
  assert.equal(authService.validateSession('not-a-real-token'), false);

  assert.equal(await authService.changePassword('wrong password', 'second password 456', 'test'), undefined);
  const changed = await authService.changePassword('first password 123', 'second password 456', 'test');
  assert.ok(changed);
  assert.equal(authService.validateSession(setupSession.token), false, 'other sessions end when the password changes');
  assert.equal(authService.validateSession(changed.token), true);
  assert.ok(await authService.login('second password 456', 'test'));

  authService.reset();
  assert.equal(authService.isSetupRequired(), true);
  assert.equal(authService.validateSession(changed.token), false);
});
