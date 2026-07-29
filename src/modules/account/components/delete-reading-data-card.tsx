'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, TriangleAlert } from 'lucide-react'

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
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!confirming) return
    inputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [confirming])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

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
      return
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])',
        ) ?? [],
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
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
      if (
        !response.ok
        || typeof payload !== 'object'
        || payload === null
        || (payload as Record<string, unknown>).success !== true
      ) {
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
      let cacheCleanupSucceeded = true
      if ('caches' in window) {
        try {
          const names = await window.caches.keys()
          await Promise.all(
            names
              .filter((name) => name.startsWith('wird-'))
              .map((name) => window.caches.delete(name)),
          )
        } catch {
          cacheCleanupSucceeded = false
        }
      }
      router.replace(
        `/app/plan/new?readingDataDeleted=1${browserCleanupSucceeded ? '' : '&browserCleanup=failed'}`,
      )
      router.refresh()
      if (!cacheCleanupSucceeded) {
        console.info('[reading-data-deletion]', { stage: 'cache-cleanup', status: 'failed' })
      }
    } catch {
      setError('تعذر مسح بيانات القراءة. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className="surface-card border-danger/30 p-4 sm:p-6"
      aria-labelledby="delete-reading-data-title"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger" aria-hidden="true">
          <Trash2 aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-xs font-medium text-danger">منطقة حساسة</p>
          <h2 id="delete-reading-data-title" className="mt-1 text-lg font-semibold text-ink">
            مسح بيانات القراءة
          </h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-muted">
        سيتم حذف جميع خططك، جلسات القراءة، التقدم، الختمات، وسجل القراءة نهائيًا.
        لن يتم حذف حسابك أو بريدك الإلكتروني.
      </p>

      {!confirming ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-danger mt-6"
        >
          <Trash2 aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
          مسح جميع بيانات القراءة
        </button>
      ) : (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
            onKeyDown={handleDialogKeyDown}
            className="surface-card w-full max-w-lg border-danger/35 p-5 shadow-lift sm:p-7"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger" aria-hidden="true">
              <TriangleAlert aria-hidden="true" focusable="false" size={23} strokeWidth={1.8} />
            </div>
            <h3 id="delete-confirmation-title" className="mt-4 text-center text-lg font-semibold text-ink">
              تأكيد مسح بيانات القراءة
            </h3>
            <p id="delete-confirmation-description" className="mt-3 text-center text-sm font-medium text-danger">
              هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </p>
            <form onSubmit={handleSubmit}>
            <label htmlFor="delete-reading-confirmation" className="field-label mt-5">
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
              className="field-control focus:border-danger focus:ring-danger/15"
            />
            {error ? (
              <p
                ref={errorRef}
                id="delete-reading-error"
                role="alert"
                tabIndex={-1}
                className="status-danger mt-4 outline-none"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={pending || confirmation !== CONFIRMATION}
                className="btn-danger"
              >
                <Trash2 aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
                {pending ? 'جارٍ المسح النهائي…' : 'تأكيد المسح النهائي'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={cancel}
                className="btn-secondary"
              >
                إلغاء والعودة
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
