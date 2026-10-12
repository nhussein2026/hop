// Runs public/sw.js in a sandbox with a fake network and Cache Storage, to check how Hop behaves
// when the server is off while the device is online.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const ORIGIN = 'https://hop.example.ts.net'
const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8')

type RequestLike = Request | { url: string; method: string; mode: string }
type Network = (request: RequestLike) => Promise<Response>

const keyOf = (request: RequestLike | string) => typeof request === 'string' ? new URL(request, ORIGIN).href : request.url
const withoutSearch = (url: string) => url.split('?')[0]

/** Just enough of the Cache API for sw.js. Stored responses are never read, only cloned. */
class FakeCache {
  entries = new Map<string, Response>()
  async match(request: RequestLike | string) { return this.entries.get(keyOf(request))?.clone() }
  async put(request: RequestLike | string, response: Response) { this.entries.set(keyOf(request), response) }
  async delete(request: RequestLike | string) { return this.entries.delete(keyOf(request)) }
  async keys(request: RequestLike | string, options: { ignoreSearch?: boolean } = {}) {
    const wanted = keyOf(request)
    return [...this.entries.keys()]
      .filter((url) => options.ignoreSearch ? withoutSearch(url) === withoutSearch(wanted) : url === wanted)
      .map((url) => new Request(url))
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>()
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache())
    return this.stores.get(name)!
  }
  async match(request: RequestLike | string, options: { cacheName?: string } = {}) {
    for (const name of options.cacheName ? [options.cacheName] : [...this.stores.keys()]) {
      const hit = await this.stores.get(name)?.match(request)
      if (hit) return hit
    }
    return undefined
  }
  async delete(name: string) { return this.stores.delete(name) }
  async keys() { return [...this.stores.keys()] }
}

class FakeFetchEvent {
  response?: Promise<Response>
  waits: Promise<unknown>[] = []
  readonly request: RequestLike
  constructor(request: RequestLike) { this.request = request }
  respondWith(response: Promise<Response>) { this.response = response }
  waitUntil(promise: Promise<unknown>) { this.waits.push(promise) }
}

function loadWorker() {
  const handlers = new Map<string, (event: FakeFetchEvent) => void>()
  const caches = new FakeCacheStorage()
  let network: Network = () => Promise.reject(new TypeError('No network set'))
  vm.runInContext(source, vm.createContext({
    self: { addEventListener: (type: string, handler: (event: FakeFetchEvent) => void) => handlers.set(type, handler), location: { origin: ORIGIN } },
    caches,
    fetch: (request: RequestLike) => network(request),
    Headers, Promise, Request, Response, URL, JSON,
    // The worker's network timeout runs 100 times faster here.
    setTimeout: (run: () => void, ms: number) => setTimeout(run, ms / 100),
    clearTimeout,
  }))

  function dispatch(request: RequestLike) {
    const event = new FakeFetchEvent(request)
    handlers.get('fetch')!(event)
    return event
  }

  return {
    caches,
    setNetwork(next: Network) { network = next },
    dispatch,
    async get(path: string) {
      const event = dispatch(new Request(new URL(path, ORIGIN)))
      assert.ok(event.response, `the worker answers ${path}`)
      return { response: await event.response, settled: () => Promise.allSettled(event.waits) }
    },
    async navigate() {
      const event = dispatch({ url: `${ORIGIN}/`, method: 'GET', mode: 'navigate' })
      assert.ok(event.response, 'the worker answers the navigation')
      return event.response
    },
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const unreachable: Network = () => Promise.reject(new TypeError('Failed to fetch'))
const neverAnswers: Network = () => new Promise(() => {})
const isOffline = (response: Response) => response.headers.get('X-Hop-Offline') === '1'

async function apiCache(worker: ReturnType<typeof loadWorker>) {
  return [...(await worker.caches.open('hop-api')).entries.keys()].map((url) => url.replace(ORIGIN, '')).sort()
}

test('a live answer is returned as is and saved for offline reading', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ id: 't1' }]))
  const { response, settled } = await worker.get('/api/tasks')
  await settled()
  assert.equal(isOffline(response), false)
  assert.deepEqual(await response.json(), [{ id: 't1' }])
  assert.deepEqual(await apiCache(worker), ['/api/tasks'])
})

test('with the server off, the saved copy is returned and marked as offline', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ id: 't1' }]))
  await (await worker.get('/api/tasks')).settled()

  worker.setNetwork(unreachable)
  const { response } = await worker.get('/api/tasks')
  assert.equal(isOffline(response), true)
  assert.deepEqual(await response.json(), [{ id: 't1' }])
})

test('a server that never answers is given up on, and the saved copy is returned', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ id: 't1' }]))
  await (await worker.get('/api/tasks')).settled()

  worker.setNetwork(neverAnswers)
  const started = Date.now()
  const { response } = await worker.get('/api/tasks')
  assert.equal(isOffline(response), true)
  assert.ok(Date.now() - started < 1000, 'answered after the timeout, not after the request gave up')
})

test('the first request on a new day falls back to the last range of habit completions', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ habitId: 'h1', date: '2026-10-11' }]))
  await (await worker.get('/api/habits/completions?from=2026-08-31&to=2026-10-11')).settled()

  worker.setNetwork(unreachable)
  const { response } = await worker.get('/api/habits/completions?from=2026-09-01&to=2026-10-12')
  assert.equal(response.status, 200)
  assert.equal(isOffline(response), true)
  assert.deepEqual(await response.json(), [{ habitId: 'h1', date: '2026-10-11' }])
})

test('only the latest range of a path is kept, next to the copy under its bare path', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([]))
  await (await worker.get('/api/habits/completions?from=2026-08-31&to=2026-10-11')).settled()
  await (await worker.get('/api/habits/completions?from=2026-09-01&to=2026-10-12')).settled()
  assert.deepEqual(await apiCache(worker), ['/api/habits/completions', '/api/habits/completions?from=2026-09-01&to=2026-10-12'])
})

test('a gateway error means Hop is down: the saved copy is returned instead', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ id: 't1' }]))
  await (await worker.get('/api/tasks')).settled()

  worker.setNetwork(async () => new Response('Bad Gateway', { status: 502 }))
  const { response } = await worker.get('/api/tasks')
  assert.equal(isOffline(response), true)
  assert.deepEqual(await response.json(), [{ id: 't1' }])
})

test('with no saved copy and no server, the answer is a 503 marked as offline', async () => {
  const worker = loadWorker()
  worker.setNetwork(unreachable)
  const { response } = await worker.get('/api/goals')
  assert.equal(response.status, 503)
  assert.equal(isOffline(response), true)
})

test('an ended session deletes every saved copy', async () => {
  const worker = loadWorker()
  worker.setNetwork(async () => json([{ id: 't1' }]))
  await (await worker.get('/api/tasks')).settled()

  worker.setNetwork(async () => json({ error: 'Sign in' }, 401))
  const { response, settled } = await worker.get('/api/goals')
  await settled()
  assert.equal(response.status, 401)
  assert.equal(worker.caches.stores.has('hop-api'), false)
})

test('the app opens from the saved shell when the server never answers', async () => {
  const worker = loadWorker()
  await (await worker.caches.open('hop-shell-v1')).put('/', new Response('<!doctype html><title>Hop</title>'))
  worker.setNetwork(neverAnswers)
  const response = await worker.navigate()
  assert.equal(await response.text(), '<!doctype html><title>Hop</title>')
})

test('server backup files are not saved for offline reading', () => {
  const worker = loadWorker()
  const event = worker.dispatch(new Request(`${ORIGIN}/api/backups/hop-backup-2026-10-12T00-00-00-000Z.json`))
  assert.equal(event.response, undefined)
})
