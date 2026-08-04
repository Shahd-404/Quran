'use client'

import type { QuranPage } from '@/modules/quran/types'
import type {
  OfflineDownloadBundle,
  OfflineDownloadSession,
} from '../types'
import { OFFLINE_RETENTION_MS } from '../types'

export const OFFLINE_DB_NAME = 'wird-offline-v1'
export const OFFLINE_DB_VERSION = 1
export const OFFLINE_STORES = {
  sessions: 'downloaded_sessions',
  pages: 'downloaded_quran_pages',
  outbox: 'offline_progress_outbox',
  metadata: 'offline_metadata',
} as const

const ACTIVE_SCOPE_KEY = 'active_scope'
const LAST_DOWNLOAD_KEY = 'last_download'
const MAX_SYNC_BATCH = 10

export type DownloadedSessionRecord = OfflineDownloadSession & {
  key: string
  scopeKey: string
  downloadedAt: string
  expiresAt: string
  estimatedBytes: number
  completionSyncedAt?: string | null
}

export type DownloadedPageRecord = {
  key: string
  scopeKey: string
  pageNumber: number
  page: QuranPage
  downloadedAt: string
  expiresAt: string
}

export type OfflineOutboxStatus = 'pending' | 'retry' | 'blocked' | 'conflict'

export type OfflineOutboxRecord = {
  actionId: string
  scopeKey: string
  sessionId: string
  occurredAt: string
  status: OfflineOutboxStatus
  attempts: number
  nextAttemptAt: string
  lastErrorCode: string | null
}

type MetadataRecord = {
  key: string
  scopeKey: string | null
  value: string
  updatedAt: string
}

export type OfflineStorageSummary = {
  sessions: DownloadedSessionRecord[]
  pageCount: number
  estimatedBytes: number
  lastDownloadAt: string | null
  pendingActions: number
  failedActions: number
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener('error', () => reject(request.error ?? new Error('IDB_REQUEST_FAILED')), {
      once: true,
    })
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IDB_TRANSACTION_ABORTED')),
      { once: true },
    )
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IDB_TRANSACTION_FAILED')),
      { once: true },
    )
  })
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('INDEXED_DB_UNAVAILABLE'))
      return
    }
    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      if (!database.objectStoreNames.contains(OFFLINE_STORES.sessions)) {
        const sessions = database.createObjectStore(OFFLINE_STORES.sessions, { keyPath: 'key' })
        sessions.createIndex('by_scope', 'scopeKey', { unique: false })
        sessions.createIndex('by_expiry', 'expiresAt', { unique: false })
      }
      if (!database.objectStoreNames.contains(OFFLINE_STORES.pages)) {
        const pages = database.createObjectStore(OFFLINE_STORES.pages, { keyPath: 'key' })
        pages.createIndex('by_scope', 'scopeKey', { unique: false })
        pages.createIndex('by_expiry', 'expiresAt', { unique: false })
      }
      if (!database.objectStoreNames.contains(OFFLINE_STORES.outbox)) {
        const outbox = database.createObjectStore(OFFLINE_STORES.outbox, { keyPath: 'actionId' })
        outbox.createIndex('by_scope', 'scopeKey', { unique: false })
        outbox.createIndex('by_next_attempt', 'nextAttemptAt', { unique: false })
      }
      if (!database.objectStoreNames.contains(OFFLINE_STORES.metadata)) {
        database.createObjectStore(OFFLINE_STORES.metadata, { keyPath: 'key' })
      }
    })
    request.addEventListener('success', () => {
      const database = request.result
      database.addEventListener('versionchange', () => database.close())
      resolve(database)
    }, { once: true })
    request.addEventListener('blocked', () => reject(new Error('INDEXED_DB_BLOCKED')), { once: true })
    request.addEventListener('error', () => reject(request.error ?? new Error('INDEXED_DB_OPEN_FAILED')), {
      once: true,
    })
  })
}

export function validateOfflineBundle(bundle: OfflineDownloadBundle): void {
  const generatedAt = Date.parse(bundle.generatedAt)
  const expiresAt = Date.parse(bundle.expiresAt)
  if (
    !Number.isFinite(generatedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt - generatedAt > OFFLINE_RETENTION_MS + 60_000
  ) {
    throw new Error('INVALID_OFFLINE_EXPIRY')
  }
  const pages = new Map(bundle.pages.map((page) => [page.pageNumber, page]))
  if (pages.size !== bundle.pages.length) throw new Error('DUPLICATE_OFFLINE_PAGE')
  bundle.sessions.forEach((session) => {
    for (let page = session.startPage; page <= session.endPage; page += 1) {
      if (!pages.has(page)) throw new Error('INCOMPLETE_OFFLINE_SESSION')
    }
  })
}

export async function saveOfflineBundle(
  bundle: OfflineDownloadBundle,
): Promise<OfflineStorageSummary> {
  validateOfflineBundle(bundle)
  const database = await openOfflineDatabase()
  const done = (() => {
    const transaction = database.transaction(
      [OFFLINE_STORES.sessions, OFFLINE_STORES.pages, OFFLINE_STORES.metadata],
      'readwrite',
    )
    const completion = transactionDone(transaction)
    const sessions = transaction.objectStore(OFFLINE_STORES.sessions)
    const pages = transaction.objectStore(OFFLINE_STORES.pages)
    const metadata = transaction.objectStore(OFFLINE_STORES.metadata)
    const totalBytes = new Blob([JSON.stringify(bundle)]).size
    const perSessionBytes = Math.ceil(totalBytes / bundle.sessions.length)

    bundle.pages.forEach((page) => {
      const record: DownloadedPageRecord = {
        key: `${bundle.scopeKey}:${page.pageNumber}`,
        scopeKey: bundle.scopeKey,
        pageNumber: page.pageNumber,
        page,
        downloadedAt: bundle.generatedAt,
        expiresAt: bundle.expiresAt,
      }
      pages.put(record)
    })
    bundle.sessions.forEach((session) => {
      const record: DownloadedSessionRecord = {
        ...session,
        key: `${bundle.scopeKey}:${session.id}`,
        scopeKey: bundle.scopeKey,
        downloadedAt: bundle.generatedAt,
        expiresAt: bundle.expiresAt,
        estimatedBytes: perSessionBytes,
      }
      sessions.put(record)
    })
    const activeScope: MetadataRecord = {
      key: ACTIVE_SCOPE_KEY,
      scopeKey: bundle.scopeKey,
      value: bundle.scopeKey,
      updatedAt: bundle.generatedAt,
    }
    const lastDownload: MetadataRecord = {
      key: LAST_DOWNLOAD_KEY,
      scopeKey: bundle.scopeKey,
      value: bundle.generatedAt,
      updatedAt: bundle.generatedAt,
    }
    metadata.put(activeScope)
    metadata.put(lastDownload)
    return completion.finally(() => database.close())
  })()
  await done
  return getOfflineStorageSummary(bundle.scopeKey)
}

async function recordsForScope<T>(store: IDBObjectStore, scopeKey: string): Promise<T[]> {
  return requestResult(store.index('by_scope').getAll(IDBKeyRange.only(scopeKey))) as Promise<T[]>
}

export async function getOfflineStorageSummary(scopeKey: string): Promise<OfflineStorageSummary> {
  const database = await openOfflineDatabase()
  try {
    const transaction = database.transaction(
      [OFFLINE_STORES.sessions, OFFLINE_STORES.pages, OFFLINE_STORES.outbox, OFFLINE_STORES.metadata],
      'readonly',
    )
    const sessionsPromise = recordsForScope<DownloadedSessionRecord>(
      transaction.objectStore(OFFLINE_STORES.sessions),
      scopeKey,
    )
    const pagesPromise = recordsForScope<DownloadedPageRecord>(
      transaction.objectStore(OFFLINE_STORES.pages),
      scopeKey,
    )
    const outboxPromise = recordsForScope<OfflineOutboxRecord>(
      transaction.objectStore(OFFLINE_STORES.outbox),
      scopeKey,
    )
    const metadataPromise = requestResult<MetadataRecord | undefined>(
      transaction.objectStore(OFFLINE_STORES.metadata).get(LAST_DOWNLOAD_KEY),
    )
    const [sessions, pages, outbox, metadata] = await Promise.all([
      sessionsPromise,
      pagesPromise,
      outboxPromise,
      metadataPromise,
    ])
    return {
      sessions: sessions.sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor)),
      pageCount: pages.length,
      estimatedBytes: sessions.reduce((total, session) => total + session.estimatedBytes, 0),
      lastDownloadAt: metadata?.scopeKey === scopeKey ? metadata.value : null,
      pendingActions: outbox.filter((action) => action.status === 'pending' || action.status === 'retry').length,
      failedActions: outbox.filter((action) => action.status === 'blocked' || action.status === 'conflict').length,
    }
  } finally {
    database.close()
  }
}

export async function cleanupExpiredOfflineContent(now = new Date()): Promise<number> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(
    [OFFLINE_STORES.sessions, OFFLINE_STORES.pages],
    'readwrite',
  )
  const completion = transactionDone(transaction)
  let removed = 0
  for (const storeName of [OFFLINE_STORES.sessions, OFFLINE_STORES.pages]) {
    const store = transaction.objectStore(storeName)
    const range = IDBKeyRange.upperBound(now.toISOString())
    const keys = await requestResult(store.index('by_expiry').getAllKeys(range))
    keys.forEach((key) => {
      store.delete(key)
      removed += 1
    })
  }
  await completion.finally(() => database.close())
  return removed
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(Object.values(OFFLINE_STORES), 'readwrite')
  const completion = transactionDone(transaction)
  Object.values(OFFLINE_STORES).forEach((storeName) => transaction.objectStore(storeName).clear())
  await completion.finally(() => database.close())
}

export async function clearDownloadedContent(scopeKey: string): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(
    [OFFLINE_STORES.sessions, OFFLINE_STORES.pages, OFFLINE_STORES.metadata],
    'readwrite',
  )
  const completion = transactionDone(transaction)
  for (const storeName of [OFFLINE_STORES.sessions, OFFLINE_STORES.pages]) {
    const store = transaction.objectStore(storeName)
    const keys = await requestResult(store.index('by_scope').getAllKeys(IDBKeyRange.only(scopeKey)))
    keys.forEach((key) => store.delete(key))
  }
  transaction.objectStore(OFFLINE_STORES.metadata).delete(LAST_DOWNLOAD_KEY)
  await completion.finally(() => database.close())
}

export async function hasUnsyncedOfflineActions(): Promise<boolean> {
  const database = await openOfflineDatabase()
  try {
    const transaction = database.transaction(OFFLINE_STORES.outbox, 'readonly')
    const count = await requestResult(transaction.objectStore(OFFLINE_STORES.outbox).count())
    return count > 0
  } finally {
    database.close()
  }
}

export async function getActiveOfflineScope(): Promise<string | null> {
  const database = await openOfflineDatabase()
  try {
    const transaction = database.transaction(OFFLINE_STORES.metadata, 'readonly')
    const metadata = await requestResult<MetadataRecord | undefined>(
      transaction.objectStore(OFFLINE_STORES.metadata).get(ACTIVE_SCOPE_KEY),
    )
    return metadata?.value ?? null
  } finally {
    database.close()
  }
}

let accountReconciliation: Promise<void> | null = null

export function ensureOfflineAccountScope(scopeKey: string): Promise<void> {
  if (accountReconciliation) return accountReconciliation
  accountReconciliation = (async () => {
    const activeScope = await getActiveOfflineScope()
    if (!activeScope || activeScope === scopeKey) return
    if (await hasUnsyncedOfflineActions()) {
      window.alert(
        'توجد إجراءات قراءة لم تُزامن للحساب السابق. سيجري حذفها الآن لحماية بيانات الحساب عند تبديل المستخدم.',
      )
    }
    await clearAllOfflineData()
  })().finally(() => {
    accountReconciliation = null
  })
  return accountReconciliation
}

export async function queueOfflineCompletion(
  scopeKey: string,
  sessionId: string,
  occurredAt = new Date(),
): Promise<OfflineOutboxRecord> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_STORES.outbox, 'readwrite')
  const completion = transactionDone(transaction)
  const store = transaction.objectStore(OFFLINE_STORES.outbox)
  const existing = await recordsForScope<OfflineOutboxRecord>(store, scopeKey)
  const sameSession = existing.find((action) => action.sessionId === sessionId)
  if (sameSession) {
    await completion.finally(() => database.close())
    return sameSession
  }
  const timestamp = occurredAt.toISOString()
  const record: OfflineOutboxRecord = {
    actionId: crypto.randomUUID(),
    scopeKey,
    sessionId,
    occurredAt: timestamp,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: timestamp,
    lastErrorCode: null,
  }
  store.add(record)
  await completion.finally(() => database.close())
  await requestBackgroundSync()
  window.dispatchEvent(new CustomEvent('wird:offline-outbox-change'))
  return record
}

async function requestBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const sync = (registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> }
    }).sync
    await sync?.register('wird-offline-progress')
  } catch {
    // Online, visibility, and focus listeners provide the supported fallback.
  }
}

function retryDelay(attempts: number): number {
  return Math.min(60 * 60 * 1000, 15_000 * 2 ** Math.min(attempts, 8))
}

async function updateOutboxRecord(record: OfflineOutboxRecord): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_STORES.outbox, 'readwrite')
  const completion = transactionDone(transaction)
  transaction.objectStore(OFFLINE_STORES.outbox).put(record)
  await completion.finally(() => database.close())
}

async function deleteOutboxRecord(actionId: string): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_STORES.outbox, 'readwrite')
  const completion = transactionDone(transaction)
  transaction.objectStore(OFFLINE_STORES.outbox).delete(actionId)
  await completion.finally(() => database.close())
}

async function markDownloadedSessionSynced(action: OfflineOutboxRecord): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(OFFLINE_STORES.sessions, 'readwrite')
  const completion = transactionDone(transaction)
  const store = transaction.objectStore(OFFLINE_STORES.sessions)
  const key = `${action.scopeKey}:${action.sessionId}`
  const session = await requestResult<DownloadedSessionRecord | undefined>(store.get(key))
  if (session) store.put({ ...session, completionSyncedAt: new Date().toISOString() })
  await completion.finally(() => database.close())
}

async function nextSyncActions(now: Date, force: boolean): Promise<OfflineOutboxRecord[]> {
  const database = await openOfflineDatabase()
  try {
    const transaction = database.transaction(OFFLINE_STORES.outbox, 'readonly')
    const records = await requestResult<OfflineOutboxRecord[]>(
      transaction.objectStore(OFFLINE_STORES.outbox).getAll(),
    )
    return records
      .filter((record) =>
        force
          ? true
          : (record.status === 'pending' || record.status === 'retry') &&
            record.nextAttemptAt <= now.toISOString(),
      )
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .slice(0, MAX_SYNC_BATCH)
  } finally {
    database.close()
  }
}

let syncPromise: Promise<void> | null = null

export function syncOfflineOutbox({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    if (!navigator.onLine) return
    const actions = await nextSyncActions(new Date(), force)
    for (const action of actions) {
      let response: Response
      try {
        response = await fetch('/api/reading-session/complete', {
          method: 'POST',
          credentials: 'same-origin',
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
        await updateOutboxRecord({
          ...action,
          status: 'retry',
          attempts: action.attempts + 1,
          nextAttemptAt: new Date(Date.now() + retryDelay(action.attempts + 1)).toISOString(),
          lastErrorCode: 'NETWORK_ERROR',
        })
        break
      }

      if (response.ok) {
        await markDownloadedSessionSynced(action)
        await deleteOutboxRecord(action.actionId)
        continue
      }
      const attempts = action.attempts + 1
      if (response.status === 401) {
        await updateOutboxRecord({ ...action, status: 'blocked', attempts, lastErrorCode: 'UNAUTHENTICATED' })
        break
      }
      if ([400, 404, 409].includes(response.status)) {
        await updateOutboxRecord({ ...action, status: 'conflict', attempts, lastErrorCode: `HTTP_${response.status}` })
        continue
      }
      await updateOutboxRecord({
        ...action,
        status: 'retry',
        attempts,
        nextAttemptAt: new Date(Date.now() + retryDelay(attempts)).toISOString(),
        lastErrorCode: response.status === 429 ? 'RATE_LIMITED' : `HTTP_${response.status}`,
      })
      break
    }
  })().finally(() => {
    syncPromise = null
    window.dispatchEvent(new CustomEvent('wird:offline-outbox-change'))
  })
  return syncPromise
}
