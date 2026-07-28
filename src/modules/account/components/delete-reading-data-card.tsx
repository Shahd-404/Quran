'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const CONFIRMATION = 'حذف بياناتي'

async function unsubscribeCurrentBrowser(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return true
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription ? subscription.unsubscribe() : true
  } catch {
    return false
  }
}

export function DeleteReadingDataCard() {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (confirming) inputRef.current?.focus()
  }, [confirming])

  function cancel() {
    if (pending) return
    setConfirming(false)
    setConfirmation('')
    setError(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || confirmation !== CONFIRMATION) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/account/delete-reading-data', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })
      const payload: unknown = await response.json()
      if (!response.ok || typeof payload !== 'object' || payload === null) {
        const message =
          typeof payload === 'object' &&
          payload !== null &&
          typeof (payload as Record<string, unknown>).message === 'string'
            ? String((payload as Record<string, unknown>).message)
            : 'تعذر مسح بيانات القراءة. لم يتم حذف أي بيانات.'
        setError(message)
        return
      }

      const browserCleanupSucceeded = await unsubscribeCurrentBrowser()
      router.push(
        `/app/plan/new?readingDataDeleted=1${browserCleanupSucceeded ? '' : '&browserCleanup=failed'}`,
      )
      router.refresh()
    } catch {
      setError('تعذر مسح بيانات القراءة. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className="rounded-[2rem] border border-rose-200 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="delete-reading-data-title"
    >
      <h2 id="delete-reading-data-title" className="text-2xl font-bold text-rose-900">
        مسح بيانات القراءة
      </h2>
      <p className="mt-4 leading-8 text-stone-700">
        سيتم حذف جميع خططك، جلسات القراءة، التقدم، الختمات، وسجل القراءة نهائيًا.
        لن يتم حذف حسابك أو بريدك الإلكتروني.
      </p>

      {!confirming ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-6 min-h-[3rem] rounded-2xl bg-rose-700 px-6 py-3 font-bold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2"
        >
          مسح جميع بيانات القراءة
        </button>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirmation-title"
          aria-describedby="delete-confirmation-description"
          onKeyDown={handleDialogKeyDown}
          className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 p-5"
        >
          <h3 id="delete-confirmation-title" className="text-xl font-bold text-rose-950">
            تأكيد مسح بيانات القراءة
          </h3>
          <p id="delete-confirmation-description" className="mt-3 font-semibold text-rose-900">
            هذا الإجراء نهائي ولا يمكن التراجع عنه.
          </p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="delete-reading-confirmation" className="mt-5 block font-semibold">
              اكتب «{CONFIRMATION}» للتأكيد
            </label>
            <input
              ref={inputRef}
              id="delete-reading-confirmation"
              name="confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'delete-reading-error' : 'delete-confirmation-description'}
              className="mt-2 min-h-[3rem] w-full rounded-xl border border-stone-300 bg-white px-4 py-2 outline-none focus:border-rose-700 focus:ring-2 focus:ring-rose-700/20"
            />
            {error ? (
              <p id="delete-reading-error" role="alert" className="mt-4 text-rose-800">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={pending || confirmation !== CONFIRMATION}
                className="min-h-[3rem] rounded-2xl bg-rose-700 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'جارٍ المسح النهائي…' : 'تأكيد المسح النهائي'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={cancel}
                className="min-h-[3rem] rounded-2xl border border-stone-300 bg-white px-6 py-3 font-bold"
              >
                إلغاء والعودة
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
