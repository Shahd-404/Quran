'use client'

import { useEffect, useState } from 'react'
import { activatePushNotifications } from '../client/subscribe'
import { isPushSupported } from '../client/push-support'
import { notificationErrorMessages } from '../error-mapping'
import { NotificationErrorCode, PushState } from '../types'

export function NotificationSettingsCard() {
  const [state, setState] = useState<PushState>('unsubscribed')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
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

  return (
    <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="notifications-title">
      <p className="text-base font-semibold text-emerald-800">التذكيرات</p>
      <h2 id="notifications-title" className="mt-1 text-2xl font-bold">إشعارات جلسات الورد</h2>
      <p className="mt-3 leading-7 text-stone-600">
        {state === 'unsupported' && 'هذا المتصفح لا يدعم إشعارات الورد.'}
        {(state === 'default' || state === 'unsubscribed') && 'فعّلي التذكيرات ليصلك تنبيه عند موعد كل جلسة.'}
        {state === 'subscribed' && 'تذكيرات الورد مفعّلة على هذا الجهاز.'}
        {state === 'denied' && 'تم منع الإشعارات من إعدادات المتصفح. يمكنك السماح بها من إعدادات الموقع في المتصفح.'}
      </p>
      {state !== 'unsupported' && state !== 'denied' && (
        <button type="button" disabled={busy} onClick={state === 'subscribed' ? disable : enable}
          className="mt-4 min-h-[3rem] w-full rounded-2xl border border-emerald-800 px-4 py-3 font-bold text-emerald-900 disabled:opacity-60">
          {busy ? 'جارٍ التنفيذ…' : state === 'subscribed' ? 'إيقاف التذكيرات على هذا الجهاز' : 'تفعيل تذكيرات الورد'}
        </button>
      )}
      {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
      <p className="mt-4 text-sm leading-6 text-stone-500">قد يختلف توقيت ظهور الإشعار قليلًا حسب المتصفح ونظام التشغيل.</p>
    </section>
  )
}
