import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationSettingsCard } from '../notification-settings-card'

function validVapidKey(): string {
  const bytes = Uint8Array.from([4, ...Array.from({ length: 64 }, (_, index) => index + 1)])
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('NotificationSettingsCard', () => {
  const unsubscribe = vi.fn(async () => true)
  const subscription = {
    endpoint: 'https://push.test/id',
    toJSON: () => ({ endpoint: 'https://push.test/id', keys: { p256dh: 'x'.repeat(40), auth: 'y'.repeat(8) } }),
    unsubscribe,
  }
  const getSubscription = vi.fn<[], Promise<typeof subscription | null>>(async () => null)
  const subscribe = vi.fn(async () => subscription)
  const register = vi.fn()
  const registration = { pushManager: { getSubscription, subscribe } }

  beforeEach(() => {
    vi.restoreAllMocks()
    getSubscription.mockResolvedValue(null)
    subscribe.mockResolvedValue(subscription)
    register.mockResolvedValue(registration)
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission: vi.fn(async () => 'granted') },
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn(async () => null),
        register,
        ready: Promise.resolve(registration),
      },
    })
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = validVapidKey()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
  })

  it('does not request permission until clicked and POSTs exactly once', async () => {
    render(<NotificationSettingsCard />)
    expect(Notification.requestPermission).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    await screen.findByText('تذكيرات الورد مفعّلة على هذا الجهاز.')
    expect(Notification.requestPermission).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/notifications/subscription', expect.objectContaining({
      method: 'POST', credentials: 'same-origin',
    }))
  })

  it('shows a missing public-key error before registration or permission', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('مفتاح الإشعارات العام غير مضبوط.')
    expect(register).not.toHaveBeenCalled()
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('shows a service-worker registration failure', async () => {
    register.mockRejectedValue(new Error('registration failed'))
    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تسجيل خدمة الإشعارات.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('stops safely when permission is denied', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('denied')
    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تم منع صلاحية الإشعارات.')
    expect(subscribe).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows a safe persistence failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر حفظ الاشتراك.')
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('reuses an existing subscription and persists it once', async () => {
    getSubscription.mockResolvedValue(subscription)
    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'تفعيل تذكيرات الورد' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(subscribe).not.toHaveBeenCalled()
  })
})
