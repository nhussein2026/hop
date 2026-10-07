import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

const keyLength = 64;
const defaultCost = { N: 2 ** 15, r: 8, p: 1 };

function deriveKey(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    // scrypt needs about 128 * N * r bytes; allow headroom above Node's 32 MB default.
    scrypt(password, salt, keyLength, { ...options, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Hash a password as `scrypt$N$r$p$salt$key`, so the cost can be raised later without breaking old hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, defaultCost);
  return ['scrypt', defaultCost.N, defaultCost.r, defaultCost.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, N, r, p, salt, key] = stored.split('$');

  if (algorithm !== 'scrypt' || !N || !r || !p || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, 'base64');
  const actual = await deriveKey(password, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
