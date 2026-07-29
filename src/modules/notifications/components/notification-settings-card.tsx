'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, CircleCheck, Send, TriangleAlert } from 'lucide-react'
import { activatePushNotifications } from '../client/subscribe'
import { isPushSupported } from '../client/push-support'
import {
  canShowTestNotification,
  showTestNotification,
  TestNotificationError,
} from '../client/show-test-notification'
import { notificationErrorMessages } from '../error-mapping'
import { NotificationErrorCode, PushState } from '../types'

export function NotificationSettingsCard({ embedded = false }: { embedded?: boolean }) {
  const [state, setState] = useState<PushState>('unsubscribed')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [testBusy, setTestBusy] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testSucceeded, setTestSucceeded] = useState(false)
  const [testAvailable, setTestAvailable] = useState(false)

  useEffect(() => {
    setTestAvailable(canShowTestNotification())
    if (!isPushSupported()) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    setState(Notification.permission === 'default' ? 'default' : 'unsubscribed')
    navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      if (registration && await registration.pushManager.getSubscription()) setState('subscribed')
    }).catch(() => undefined)
  }, [])

  async function enable() {
    setBusy(true)
    setMessage('')
    try {
      await activatePushNotifications(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      setState('subscribed')
    } catch (error) {
      const code = error instanceof Error ? error.message as NotificationErrorCode : 'INTERNAL_ERROR'
      if (code === 'PERMISSION_DENIED') setState('denied')
      setMessage(notificationErrorMessages[code] ?? notificationErrorMessages.INTERNAL_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) { setState('unsubscribed'); return }
      const response = await fetch('/api/notifications/subscription', {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      if (!response.ok) throw new Error('SUBSCRIPTION_REMOVE_FAILED')
      if (!await subscription.unsubscribe()) throw new Error('SUBSCRIPTION_REMOVE_FAILED')
      setState('unsubscribed')
    } catch (error) {
      const code = error instanceof Error ? error.message as NotificationErrorCode : 'INTERNAL_ERROR'
      setMessage(notificationErrorMessages[code] ?? notificationErrorMessages.INTERNAL_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function testNotification() {
    if (testBusy) return
    setTestBusy(true)
    setTestMessage('')
    setTestSucceeded(false)
    try {
      await showTestNotification()
      setTestMessage('تم إرسال إشعار تجريبي إلى هذا الجهاز.')
      setTestSucceeded(true)
    } catch (error) {
      const code = error instanceof Error
        ? error.message as TestNotificationError
        : 'TEST_NOTIFICATION_FAILED'
      const messages: Record<TestNotificationError, string> = {
        NOTIFICATION_SERVICE_UNAVAILABLE: 'تعذر العثور على خدمة الإشعارات.',
        NOTIFICATION_PERMISSION_NOT_GRANTED: 'صلاحية الإشعارات غير مفعّلة.',
        TEST_NOTIFICATION_FAILED: 'تعذر عرض الإشعار التجريبي.',
      }
      setTestMessage(messages[code] ?? messages.TEST_NOTIFICATION_FAILED)
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <section className={embedded ? '' : 'surface-card p-4 sm:p-5'} aria-labelledby="notifications-title">
      {embedded ? (
        <h2 id="notifications-title" className="sr-only">إشعارات جلسات الورد</h2>
      ) : (
        <div className="flex items-center gap-3">
          <span className="icon-tile" aria-hidden="true">
            <Bell aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow">التذكيرات</p>
            <h2 id="notifications-title" className="section-title">إشعارات جلسات الورد</h2>
          </div>
        </div>
      )}
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-muted`}>
        {state === 'unsupported' && 'هذا المتصفح لا يدعم إشعارات الورد.'}
        {(state === 'default' || state === 'unsubscribed') && 'فعّلي التذكيرات ليصلك تنبيه عند موعد كل جلسة.'}
        {state === 'subscribed' && 'تذكيرات الورد مفعّلة على هذا الجهاز.'}
        {state === 'denied' && 'تم منع الإشعارات من إعدادات المتصفح. يمكنك السماح بها من إعدادات الموقع في المتصفح.'}
      </p>
      {state !== 'unsupported' && state !== 'denied' && (
        <button type="button" disabled={busy} onClick={state === 'subscribed' ? disable : enable}
          className="btn-secondary mt-4 w-full">
          {state === 'subscribed' ? (
            <BellOff aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
          ) : (
            <Bell aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
          )}
          {busy ? 'جارٍ التنفيذ…' : state === 'subscribed' ? 'إيقاف التذكيرات على هذا الجهاز' : 'تفعيل تذكيرات الورد'}
        </button>
      )}
      {message && (
        <p role="alert" className="status-danger mt-3 flex items-start gap-2 text-sm">
          <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={17} strokeWidth={1.8} />
          <span>{message}</span>
        </p>
      )}
      {testAvailable && (
        <div className="mt-4 border-t border-line/70 pt-4">
          <button
            type="button"
            disabled={testBusy}
            onClick={testNotification}
            className="btn-secondary w-full"
          >
            <Send aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            {testBusy ? 'جارٍ إرسال الإشعار التجريبي...' : 'اختبار الإشعار الآن'}
          </button>
          <p className="mt-3 text-sm leading-6 text-muted">
            هذا اختبار لعرض الإشعار على الجهاز فقط، ولا يختبر الاشتراك أو التذكيرات المجدولة.
          </p>
        </div>
      )}
      {testMessage && (
        <p
          role={testSucceeded ? 'status' : 'alert'}
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${testSucceeded ? 'bg-primary-soft text-primary-muted' : 'bg-danger-soft text-danger'}`}
        >
          <span className="flex items-start gap-2">
            {testSucceeded ? (
              <CircleCheck aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={17} strokeWidth={1.8} />
            ) : (
              <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={17} strokeWidth={1.8} />
            )}
            <span>{testMessage}</span>
          </span>
        </p>
      )}
      <p className="mt-4 text-sm leading-6 text-muted">قد يختلف توقيت ظهور الإشعار قليلًا حسب المتصفح ونظام التشغيل.</p>
    </section>
  )
}
