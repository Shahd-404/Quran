import { NotificationErrorCode } from '../types'

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration> {
  console.info('[notifications]', { stage: 'service-worker-registration', status: 'starting' })
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    const registration = await navigator.serviceWorker.ready
    console.info('[notifications]', { stage: 'service-worker-registration', status: 'ready' })
    return registration
  } catch {
    console.info('[notifications]', { stage: 'service-worker-registration', status: 'failed' })
    throw new Error('SERVICE_WORKER_FAILED' satisfies NotificationErrorCode)
  }
}
