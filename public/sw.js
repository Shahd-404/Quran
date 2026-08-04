const STATIC_CACHE = 'wird-static-v4'
const OFFLINE_URL = '/offline.html'
const WIRD_CACHE_PREFIX = 'wird-'
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/offline-reader.js',
  '/manifest.webmanifest',
  '/icons/wird-192.svg',
  '/icons/wird-512.svg',
  '/icons/wird-maskable.svg',
]
const DEFAULT_URL = '/app'
const SESSION_URL = /^\/app\/read\/[0-9a-f]{8}-[0-9a-f-]{27}$/i
const AUTHENTICATED_PATH = /^\/app(?:\/|$)/
const API_PATH = /^\/api(?:\/|$)/

function safeNotificationPath(value) {
  if (value === DEFAULT_URL) return DEFAULT_URL
  return typeof value === 'string' && SESSION_URL.test(value) ? value : DEFAULT_URL
}

function isSafeStaticRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false
  if (API_PATH.test(url.pathname)) return false
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === OFFLINE_URL
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter((name) => name.startsWith(WIRD_CACHE_PREFIX) && name !== STATIC_CACHE)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

const OFFLINE_DB_NAME = 'wird-offline-v1'
const OFFLINE_DB_VERSION = 1
const OFFLINE_OUTBOX_STORE = 'offline_progress_outbox'
const OFFLINE_SYNC_TAG = 'wird-offline-progress'
const MAX_SYNC_BATCH = 10

function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      if (!database.objectStoreNames.contains('downloaded_sessions')) {
        const sessions = database.createObjectStore('downloaded_sessions', { keyPath: 'key' })
        sessions.createIndex('by_scope', 'scopeKey', { unique: false })
        sessions.createIndex('by_expiry', 'expiresAt', { unique: false })
      }
      if (!database.objectStoreNames.contains('downloaded_quran_pages')) {
        const pages = database.createObjectStore('downloaded_quran_pages', { keyPath: 'key' })
        pages.createIndex('by_scope', 'scopeKey', { unique: false })
        pages.createIndex('by_expiry', 'expiresAt', { unique: false })
      }
      if (!database.objectStoreNames.contains(OFFLINE_OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OFFLINE_OUTBOX_STORE, { keyPath: 'actionId' })
        outbox.createIndex('by_scope', 'scopeKey', { unique: false })
        outbox.createIndex('by_next_attempt', 'nextAttemptAt', { unique: false })
      }
      if (!database.objectStoreNames.contains('offline_metadata')) {
        database.createObjectStore('offline_metadata', { keyPath: 'key' })
      }
    })
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener('error', () => reject(request.error), { once: true })
  })
}

function idbResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener('error', () => reject(request.error), { once: true })
  })
}

function idbDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', resolve, { once: true })
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true })
    transaction.addEventListener('error', () => reject(transaction.error), { once: true })
  })
}

async function eligibleOutboxActions() {
  const database = await openOfflineDatabase()
  try {
    const transaction = database.transaction(OFFLINE_OUTBOX_STORE, 'readonly')
    const records = await idbResult(transaction.objectStore(OFFLINE_OUTBOX_STORE).getAll())
    const now = new Date().toISOString()
    return records
      .filter((record) =>
        (record.status === 'pending' || record.status === 'retry') &&
        record.nextAttemptAt <= now,
      )
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .slice(0, MAX_SYNC_BATCH)
  } finally {
    database.close()
  }
}

async function putOutboxAction(record) {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_OUTBOX_STORE, 'readwrite')
  const completion = idbDone(transaction)
  transaction.objectStore(OFFLINE_OUTBOX_STORE).put(record)
  await completion.finally(() => database.close())
}

async function deleteOutboxAction(actionId) {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_OUTBOX_STORE, 'readwrite')
  const completion = idbDone(transaction)
  transaction.objectStore(OFFLINE_OUTBOX_STORE).delete(actionId)
  await completion.finally(() => database.close())
}

async function markDownloadedSessionSynced(action) {
  const database = await openOfflineDatabase()
  const transaction = database.transaction('downloaded_sessions', 'readwrite')
  const completion = idbDone(transaction)
  const store = transaction.objectStore('downloaded_sessions')
  const key = `${action.scopeKey}:${action.sessionId}`
  const session = await idbResult(store.get(key))
  if (session) store.put({ ...session, completionSyncedAt: new Date().toISOString() })
  await completion.finally(() => database.close())
}

function retryAt(attempts) {
  const delay = Math.min(60 * 60 * 1000, 15_000 * 2 ** Math.min(attempts, 8))
  return new Date(Date.now() + delay).toISOString()
}

async function notifyOutboxChanged() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  windows.forEach((client) => client.postMessage({ type: 'OFFLINE_OUTBOX_CHANGED' }))
}

let offlineSyncPromise = null

function syncOfflineProgress() {
  if (offlineSyncPromise) return offlineSyncPromise
  offlineSyncPromise = (async () => {
    let actions
    try {
      actions = await eligibleOutboxActions()
    } catch {
      return
    }
    for (const action of actions) {
      let response
      try {
        response = await fetch('/api/reading-session/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: action.sessionId,
            offlineAction: {
              idempotencyKey: action.actionId,
              occurredAt: action.occurredAt,
            },
          }),
        })
      } catch {
        const attempts = action.attempts + 1
        await putOutboxAction({
          ...action,
          status: 'retry',
          attempts,
          nextAttemptAt: retryAt(attempts),
          lastErrorCode: 'NETWORK_ERROR',
        })
        break
      }
      if (response.ok) {
        await markDownloadedSessionSynced(action)
        await deleteOutboxAction(action.actionId)
        continue
      }
      const attempts = action.attempts + 1
      if (response.status === 401) {
        await putOutboxAction({
          ...action,
          status: 'blocked',
          attempts,
          lastErrorCode: 'UNAUTHENTICATED',
        })
        break
      }
      if ([400, 404, 409].includes(response.status)) {
        await putOutboxAction({
          ...action,
          status: 'conflict',
          attempts,
          lastErrorCode: `HTTP_${response.status}`,
        })
        continue
      }
      await putOutboxAction({
        ...action,
        status: 'retry',
        attempts,
        nextAttemptAt: retryAt(attempts),
        lastErrorCode: response.status === 429 ? 'RATE_LIMITED' : `HTTP_${response.status}`,
      })
      break
    }
    await notifyOutboxChanged()
  })().finally(() => { offlineSyncPromise = null })
  return offlineSyncPromise
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (event.data?.type === 'SYNC_OFFLINE_PROGRESS') {
    event.waitUntil(syncOfflineProgress())
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === OFFLINE_SYNC_TAG) event.waitUntil(syncOfflineProgress())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (API_PATH.test(url.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return cached || Response.error()
    }))
    return
  }
  if (AUTHENTICATED_PATH.test(url.pathname)) return
  if (isSafeStaticRequest(request, url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })())
  }
})

function safePayload(data) {
  if (!data || data.kind !== 'session_due') return null
  if (data.title !== 'حان وقت وردك' || data.body !== 'جلسة الورد جاهزة للقراءة.') return null
  if (typeof data.url !== 'string' || !SESSION_URL.test(data.url)) return null
  if (typeof data.tag !== 'string' || !/^reading-session-[0-9a-f-]{36}$/i.test(data.tag)) return null
  return data
}

self.addEventListener('push', (event) => {
  let payload = null
  try { payload = safePayload(event.data?.json()) } catch { payload = null }
  if (!payload) return
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, tag: payload.tag, data: { url: payload.url }, dir: 'rtl', lang: 'ar',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = safeNotificationPath(event.notification.data?.url)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const target = new URL(path, self.location.origin)
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(target.href); return existing.focus() }
    return self.clients.openWindow(target.href)
  })())
})
