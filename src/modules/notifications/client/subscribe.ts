import { NotificationErrorCode, SerializedPushSubscription } from '../types'
import { serializeSubscription, urlBase64ToUint8Array } from './push'
import { assertPushSupport } from './push-support'
import { registerNotificationServiceWorker } from './register-service-worker'

export function validateVapidPublicKey(value: string | undefined): Uint8Array {
  if (!value?.trim()) throw new Error('VAPID_PUBLIC_KEY_MISSING' satisfies NotificationErrorCode)
  try {
    const key = urlBase64ToUint8Array(value.trim())
    if (key.byteLength !== 65 || key[0] !== 4) throw new Error()
    return key
  } catch {
    throw new Error('VAPID_PUBLIC_KEY_INVALID' satisfies NotificationErrorCode)
  }
}

async function persistSubscription(subscription: SerializedPushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscription', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  console.info('[notifications]', { stage: 'persistence', httpStatus: response.status })
  if (!response.ok) throw new Error('SUBSCRIPTION_SAVE_FAILED' satisfies NotificationErrorCode)
}

export async function activatePushNotifications(publicKey: string | undefined): Promise<void> {
  console.info('[notifications]', {
    stage: 'support',
    secureContext: window.isSecureContext,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
  })
  assertPushSupport()
  const applicationServerKey = validateVapidPublicKey(publicKey)
  const registration = await registerNotificationServiceWorker()
  const permission = await Notification.requestPermission()
  console.info('[notifications]', { stage: 'permission', permission })
  if (permission !== 'granted') throw new Error('PERMISSION_DENIED' satisfies NotificationErrorCode)

  let subscription = await registration.pushManager.getSubscription()
  console.info('[notifications]', { stage: 'subscription', status: subscription ? 'reusing-existing' : 'creating' })
  const created = !subscription
  try {
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  } catch {
    console.info('[notifications]', { stage: 'subscription', status: 'failed' })
    throw new Error('SUBSCRIPTION_FAILED' satisfies NotificationErrorCode)
  }
  const serialized = serializeSubscription(subscription)
  if (!serialized) throw new Error('INVALID_SUBSCRIPTION' satisfies NotificationErrorCode)
  try {
    await persistSubscription(serialized)
  } catch (error) {
    if (created) await subscription.unsubscribe().catch(() => false)
    throw error
  }
  console.info('[notifications]', { stage: 'subscription', status: 'persisted' })
}
