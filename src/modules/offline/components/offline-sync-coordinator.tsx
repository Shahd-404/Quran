'use client'

import { useEffect } from 'react'
import { fetchOfflineScope } from '../client/offline-api'
import {
  cleanupExpiredOfflineContent,
  ensureOfflineAccountScope,
  syncOfflineOutbox,
} from '../client/offline-db'

export function OfflineSyncCoordinator() {
  useEffect(() => {
    const sync = () => void syncOfflineOutbox()
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    const serviceWorkerMessage = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        (event.data as Record<string, unknown>).type === 'OFFLINE_OUTBOX_CHANGED'
      ) {
        window.dispatchEvent(new CustomEvent('wird:offline-outbox-change'))
      }
    }
    void fetchOfflineScope()
      .then((result) => result.success ? ensureOfflineAccountScope(result.scopeKey) : undefined)
      .then(() => cleanupExpiredOfflineContent())
      .catch(() => undefined)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', syncWhenVisible)
    navigator.serviceWorker?.addEventListener('message', serviceWorkerMessage)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      navigator.serviceWorker?.removeEventListener('message', serviceWorkerMessage)
    }
  }, [])
  return null
}
