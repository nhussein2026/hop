import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Everything Hop loads comes from its own origin; fonts are bundled, so no external hosts are needed.
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cacheControl(pathname: string) {
  if (pathname.startsWith('/assets/')) {
    // Vite puts a content hash in every asset name, so a given URL never changes.
    return 'public, max-age=31536000, immutable';
  }

  // The shell, service worker, and manifest must be revalidated so new releases are picked up.
  return pathname === '/' || pathname.endsWith('.html') || pathname === '/sw.js' || pathname.endsWith('.webmanifest')
    ? 'no-cache'
    : 'public, max-age=3600';
}

function resolveFile(distDir: string, pathname: string) {
  let decoded: string;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  if (decoded.includes('\0')) {
    return undefined;
  }

  const root = resolve(distDir);
  const filePath = resolve(root, `.${decoded}`);

  // Never serve anything outside the build directory, such as the database or backups.
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return undefined;
  }

  return existsSync(filePath) && statSync(filePath).isFile() ? filePath : undefined;
}

/**
 * Serve the built web app. Unknown paths without a file extension fall back to index.html so
 * client-side views load directly. Returns false when the request is not for the web app.
 */
export function serveWebApp(request: IncomingMessage, response: ServerResponse, distDir: string, pathname: string): boolean {
  if ((request.method !== 'GET' && request.method !== 'HEAD') || !existsSync(distDir)) {
    return false;
  }

  const requested = resolveFile(distDir, pathname);
  const filePath = requested ?? (extname(pathname) === '' ? resolveFile(distDir, '/index.html') : undefined);

  if (!filePath) {
    return false;
  }

  const contentType = contentTypes[extname(filePath)] ?? 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(statSync(filePath).size),
    'Cache-Control': cacheControl(requested ? pathname : '/'),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };

  if (contentType.startsWith('text/html')) {
    headers['Content-Security-Policy'] = contentSecurityPolicy;
  }

  response.writeHead(200, headers);

  if (request.method === 'HEAD') {
    response.end();
  } else {
    createReadStream(filePath).pipe(response);
  }

  return true;
}
