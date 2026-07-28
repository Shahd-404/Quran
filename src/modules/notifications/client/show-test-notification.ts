export type TestNotificationError =
  | 'NOTIFICATION_SERVICE_UNAVAILABLE'
  | 'NOTIFICATION_PERMISSION_NOT_GRANTED'
  | 'TEST_NOTIFICATION_FAILED'

export function canShowTestNotification(): boolean {
  return window.isSecureContext
    && 'Notification' in window
    && Notification.permission === 'granted'
    && 'serviceWorker' in navigator
    && Boolean(navigator.serviceWorker)
}

export async function showTestNotification(): Promise<void> {
  if (
    !window.isSecureContext
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
    || !navigator.serviceWorker
  ) {
    throw new Error('NOTIFICATION_SERVICE_UNAVAILABLE' satisfies TestNotificationError)
  }

  if (Notification.permission !== 'granted') {
    throw new Error('NOTIFICATION_PERMISSION_NOT_GRANTED' satisfies TestNotificationError)
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('اختبار إشعارات ورد', {
      body: 'الإشعارات تعمل على هذا الجهاز بنجاح.',
      dir: 'rtl',
      lang: 'ar',
      tag: 'wird-test-notification',
      data: {
        kind: 'test',
        url: '/app',
      },
    })
  } catch {
    throw new Error('TEST_NOTIFICATION_FAILED' satisfies TestNotificationError)
  }
}
