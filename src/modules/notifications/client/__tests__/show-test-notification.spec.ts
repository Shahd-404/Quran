import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canShowTestNotification,
  showTestNotification,
} from '../show-test-notification'

describe('showTestNotification', () => {
  const showNotification = vi.fn(async () => undefined)

  beforeEach(() => {
    showNotification.mockClear()
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' },
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) },
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('shows the Arabic test notification with a safe local URL', async () => {
    expect(canShowTestNotification()).toBe(true)
    expect(showNotification).not.toHaveBeenCalled()

    await showTestNotification()

    expect(showNotification).toHaveBeenCalledWith('اختبار إشعارات ورد', {
      body: 'الإشعارات تعمل على هذا الجهاز بنجاح.',
      dir: 'rtl',
      lang: 'ar',
      tag: 'wird-test-notification',
      data: { kind: 'test', url: '/app' },
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects missing permission without showing a notification', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'denied' },
    })

    await expect(showTestNotification()).rejects.toThrow('NOTIFICATION_PERMISSION_NOT_GRANTED')
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('rejects an unavailable Service Worker', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    })

    await expect(showTestNotification()).rejects.toThrow('NOTIFICATION_SERVICE_UNAVAILABLE')
    expect(showNotification).not.toHaveBeenCalled()
  })
})
