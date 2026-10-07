type Attempts = { failures: number; windowStart: number };

/** Counts failed attempts per key in a fixed window. In memory, which is enough for one self-hosted server. */
export function createRateLimiter({ maxFailures, windowMs }: { maxFailures: number; windowMs: number }) {
  const attempts = new Map<string, Attempts>();

  function current(key: string, now: number) {
    const entry = attempts.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      attempts.delete(key);
      return undefined;
    }

    return entry;
  }

  return {
    /** Seconds until another attempt is allowed, or 0 when the key is not blocked. */
    retryAfterSeconds(key: string, now = Date.now()) {
      const entry = current(key, now);
      return entry && entry.failures >= maxFailures ? Math.ceil((entry.windowStart + windowMs - now) / 1000) : 0;
    },

    recordFailure(key: string, now = Date.now()) {
      const entry = current(key, now) ?? { failures: 0, windowStart: now };
      entry.failures += 1;
      attempts.set(key, entry);
    },

    reset(key: string) {
      attempts.delete(key);
    },
  };
}
