import type { IncomingMessage } from 'node:http';

export const SESSION_COOKIE = 'hop_session';

function parseCookies(header: string | undefined) {
  const cookies = new Map<string, string>();

  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');

    if (separator > 0) {
      cookies.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
    }
  }

  return cookies;
}

export function readSessionToken(request: IncomingMessage) {
  return parseCookies(request.headers.cookie).get(SESSION_COOKIE);
}

/** Set COOKIE_SECURE=true when Hop is served over HTTPS so the cookie is never sent in plain text. */
function secureAttribute() {
  return process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
}

/** persistent: false makes a browser-session cookie, so closing the browser signs this device out. */
export function sessionCookie(token: string, expiresAt: string, persistent = true) {
  const expires = persistent ? `; Expires=${new Date(expiresAt).toUTCString()}` : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${expires}${secureAttribute()}`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute()}`;
}

/**
 * Reject state-changing requests sent by another site. Browsers always send Origin on cross-site
 * POST/PATCH/DELETE, so a missing Origin means a non-browser client such as curl.
 * X-Forwarded-Host covers reverse proxies that rewrite Host; a cross-site page cannot set it
 * without a CORS preflight, which the API never approves.
 */
export function isSameOriginRequest(request: IncomingMessage) {
  const origin = request.headers.origin;

  if (!origin) {
    return true;
  }

  const forwardedHost = request.headers['x-forwarded-host'];
  const allowedHosts = [request.headers.host, ...(Array.isArray(forwardedHost) ? forwardedHost : [forwardedHost])];

  try {
    return allowedHosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}
