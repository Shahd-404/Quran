import { NotificationErrorCode } from '../types'

export function assertPushSupport(): void {
  if (!window.isSecureContext) throw new Error('INSECURE_CONTEXT' satisfies NotificationErrorCode)
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('PUSH_UNSUPPORTED' satisfies NotificationErrorCode)
  }
}

export function isPushSupported(): boolean {
  try { assertPushSupport(); return true } catch { return false }
}
