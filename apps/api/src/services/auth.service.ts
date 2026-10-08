import { createHash, randomBytes } from 'node:crypto';

import { hashPassword, verifyPassword } from '../auth/password.js';
import { ConflictError } from '../errors.js';
import { authRepository } from '../repositories/auth.repository.js';

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const touchIntervalMs = 5 * 60 * 1000;

export type NewSession = { token: string; expiresAt: string };

/** A signed-in device, as shown in Settings. The id is a hash of the token, so it cannot be used to sign in. */
export type DeviceSession = { id: string; userAgent: string | null; createdAt: string; lastSeenAt: string; current: boolean };

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function startSession(userAgent: string | null): NewSession {
  const now = new Date();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  authRepository.deleteExpiredSessions(now.toISOString());
  authRepository.createSession({
    id: hashToken(token),
    createdAt: now.toISOString(),
    expiresAt,
    lastSeenAt: now.toISOString(),
    userAgent,
  });

  return { token, expiresAt };
}

export const authService = {
  isSetupRequired(): boolean {
    return !authRepository.findCredentials();
  },

  /** Create the single user's password. Only allowed once; use `auth:reset` to start over. */
  async setup(password: string, userAgent: string | null): Promise<NewSession> {
    if (!this.isSetupRequired()) {
      throw new ConflictError('Hop already has a password');
    }

    const passwordHash = await hashPassword(password);

    // Re-check after the slow hash so two concurrent setups cannot both succeed.
    if (!this.isSetupRequired()) {
      throw new ConflictError('Hop already has a password');
    }

    authRepository.createCredentials(passwordHash, new Date().toISOString());
    return startSession(userAgent);
  },

  async login(password: string, userAgent: string | null): Promise<NewSession | undefined> {
    const stored = authRepository.findCredentials();

    if (!stored || !(await verifyPassword(password, stored.passwordHash))) {
      return undefined;
    }

    return startSession(userAgent);
  },

  /** Returns whether the token belongs to a live session. */
  validateSession(token: string): boolean {
    const id = hashToken(token);
    const session = authRepository.findSession(id);
    const now = new Date();

    if (!session) {
      return false;
    }

    if (session.expiresAt <= now.toISOString()) {
      authRepository.deleteSession(id);
      return false;
    }

    if (now.getTime() - new Date(session.lastSeenAt).getTime() > touchIntervalMs) {
      authRepository.touchSession(id, now.toISOString());
    }

    return true;
  },

  listSessions(currentToken: string): DeviceSession[] {
    const now = new Date().toISOString();
    const currentId = hashToken(currentToken);

    return authRepository
      .findSessions()
      .filter((session) => session.expiresAt > now)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .map(({ id, userAgent, createdAt, lastSeenAt }) => ({ id, userAgent, createdAt, lastSeenAt, current: id === currentId }));
  },

  /** Sign out another device. Returns false when no such session exists. */
  revokeSession(id: string): boolean {
    if (!authRepository.findSession(id)) {
      return false;
    }

    authRepository.deleteSession(id);
    return true;
  },

  logout(token: string) {
    authRepository.deleteSession(hashToken(token));
  },

  /** Changing the password signs out every device, then starts a fresh session for this one. */
  async changePassword(currentPassword: string, newPassword: string, userAgent: string | null): Promise<NewSession | undefined> {
    const stored = authRepository.findCredentials();

    if (!stored || !(await verifyPassword(currentPassword, stored.passwordHash))) {
      return undefined;
    }

    authRepository.updatePassword(await hashPassword(newPassword), new Date().toISOString());
    authRepository.deleteAllSessions();
    return startSession(userAgent);
  },

  /** Remove the password and every session, so the next visit shows first-run setup. */
  reset() {
    authRepository.deleteAllSessions();
    authRepository.deleteCredentials();
  },
};
