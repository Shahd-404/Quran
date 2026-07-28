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
  const showNotification = vi.fn<[], Promise<void>>(async () => undefined)
  const register = vi.fn()
  const registration = { pushManager: { getSubscription, subscribe }, showNotification }
  const getRegistration = vi.fn(async () => null as typeof registration | null)

  beforeEach(() => {
    vi.restoreAllMocks()
    getSubscription.mockResolvedValue(null)
    getRegistration.mockResolvedValue(null)
    subscribe.mockResolvedValue(subscription)
    showNotification.mockResolvedValue(undefined)
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
        getRegistration,
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

  it('hides the test button when unsupported or permission is not granted', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    const { unmount } = render(<NotificationSettingsCard />)
    await screen.findByText('هذا المتصفح لا يدعم إشعارات الورد.')
    expect(screen.queryByRole('button', { name: 'اختبار الإشعار الآن' })).not.toBeInTheDocument()
    unmount()

    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'denied', requestPermission: vi.fn() },
    })
    render(<NotificationSettingsCard />)
    await screen.findByText(/تم منع الإشعارات/)
    expect(screen.queryByRole('button', { name: 'اختبار الإشعار الآن' })).not.toBeInTheDocument()
  })

  it('shows the test button with granted permission even without a Push subscription', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    })
    getRegistration.mockResolvedValue(null)

    render(<NotificationSettingsCard />)

    expect(await screen.findByRole('button', { name: 'اختبار الإشعار الآن' })).toBeInTheDocument()
    expect(getSubscription).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows a test notification only after an explicit click and reports success accessibly', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    })
    getRegistration.mockResolvedValue(registration)
    getSubscription.mockResolvedValue(subscription)

    render(<NotificationSettingsCard />)
    const button = await screen.findByRole('button', { name: 'اختبار الإشعار الآن' })
    expect(showNotification).not.toHaveBeenCalled()
    expect(screen.getByText('هذا اختبار لعرض الإشعار على الجهاز فقط، ولا يختبر الاشتراك أو التذكيرات المجدولة.')).toBeInTheDocument()

    fireEvent.click(button)

    expect(await screen.findByRole('status')).toHaveTextContent('تم إرسال إشعار تجريبي إلى هذا الجهاز.')
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('prevents duplicate clicks while the test notification is pending', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    })
    getRegistration.mockResolvedValue(registration)
    getSubscription.mockResolvedValue(subscription)
    let resolveNotification: (() => void) | undefined
    showNotification.mockImplementation(() => new Promise<void>((resolve) => {
      resolveNotification = resolve
    }))

    render(<NotificationSettingsCard />)
    const button = await screen.findByRole('button', { name: 'اختبار الإشعار الآن' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(await screen.findByRole('button', { name: 'جارٍ إرسال الإشعار التجريبي...' })).toBeDisabled()
    expect(showNotification).toHaveBeenCalledTimes(1)
    resolveNotification?.()
    await screen.findByRole('status')
  })

  it('shows a safe failure when the browser cannot display the test notification', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    })
    getRegistration.mockResolvedValue(registration)
    getSubscription.mockResolvedValue(subscription)
    showNotification.mockRejectedValue(new Error('browser failure'))

    render(<NotificationSettingsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'اختبار الإشعار الآن' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر عرض الإشعار التجريبي.')
  })
})
