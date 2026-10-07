import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { serveWebApp } from './static.js';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'hop-static-'));
  const distDir = join(root, 'dist');
  mkdirSync(join(distDir, 'assets'), { recursive: true });
  writeFileSync(join(distDir, 'index.html'), '<!doctype html><title>Hop</title>');
  writeFileSync(join(distDir, 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(join(distDir, 'sw.js'), 'self');
  writeFileSync(join(root, 'secret.db'), 'private');

  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (!serveWebApp(request, response, distDir, pathname)) {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test('serveWebApp serves files with content types and cache headers', async () => {
  await withServer(async (baseUrl) => {
    const asset = await fetch(`${baseUrl}/assets/index-abc123.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type') ?? '', /text\/javascript/);
    assert.match(asset.headers.get('cache-control') ?? '', /immutable/);

    const worker = await fetch(`${baseUrl}/sw.js`);
    assert.equal(worker.headers.get('cache-control'), 'no-cache');

    const shell = await fetch(`${baseUrl}/`);
    assert.equal(shell.status, 200);
    assert.ok(shell.headers.get('content-security-policy')?.includes("default-src 'self'"));
  });
});

test('serveWebApp falls back to index.html for app routes but not for missing files', async () => {
  await withServer(async (baseUrl) => {
    const route = await fetch(`${baseUrl}/goals`);
    assert.equal(route.status, 200);
    assert.match(await route.text(), /<title>Hop<\/title>/);

    assert.equal((await fetch(`${baseUrl}/missing.png`)).status, 404);
  });
});

test('serveWebApp never serves files outside the build directory', async () => {
  await withServer(async (baseUrl) => {
    for (const path of ['/../secret.db', '/%2e%2e/secret.db', '/assets/%2e%2e%2f%2e%2e%2fsecret.db', '/%00']) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.notEqual(await response.text(), 'private', path);
    }
  });
});
