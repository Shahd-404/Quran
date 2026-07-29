'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type CompletionState =
  | 'idle'
  | 'confirming'
  | 'submitting'
  | 'error'

const SAFE_ERROR =
  'تعذّر تسجيل إكمال الجلسة الآن. بقيت الجلسة دون تغيير، ويمكنك المحاولة مرة أخرى.'

export function CompletionAction({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [state, setState] = useState<CompletionState>('idle')
  const errorRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (state !== 'confirming' && state !== 'error') return
    confirmButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [state])

  const submitCompletion = async () => {
    if (state === 'submitting') return
    setState('submitting')

    try {
      const response = await fetch('/api/reading-session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const result: unknown = await response.json()
      const succeeded =
        response.ok &&
        typeof result === 'object' &&
        result !== null &&
        (result as Record<string, unknown>).success === true

      if (!succeeded) {
        setState('error')
        requestAnimationFrame(() => errorRef.current?.focus())
        return
      }

      router.push('/app?sessionCompleted=1')
      router.refresh()
    } catch {
      setState('error')
      requestAnimationFrame(() => errorRef.current?.focus())
    }
  }

  if (state === 'idle') {
    return (
      <section className="surface-card mt-5 p-5">
        <h2 className="text-lg font-bold text-ink">
          هل أنهيت صفحات الجلسة؟
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          لن يتقدّم وردك إلا بعد تأكيدك الصريح أنك قرأت جميع الصفحات.
        </p>
        <button
          type="button"
          onClick={() => setState('confirming')}
          className="btn-primary mt-4 w-full"
        >
          أتممت قراءة الجلسة
        </button>
      </section>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && state !== 'submitting') {
          event.preventDefault()
          setState('idle')
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="completion-confirmation-title"
        aria-describedby="completion-confirmation-description"
        className="surface-card w-full max-w-lg border-accent/30 p-6 shadow-lift"
      >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-warning" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current">
          <path d="M7 12.5l3 3L17 8.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
      <h2
        id="completion-confirmation-title"
        className="mt-4 text-center text-xl font-bold text-ink"
      >
        تأكيد إكمال الجلسة
      </h2>
      <p
        id="completion-confirmation-description"
        className="mt-2 text-center leading-7 text-muted"
      >
        هل أتممت قراءة جميع صفحات هذه الجلسة؟
      </p>

      {state === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="status-danger mt-4 text-sm leading-6 focus:outline-none"
        >
          {SAFE_ERROR}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          ref={confirmButtonRef}
          type="button"
          disabled={state === 'submitting'}
          onClick={submitCompletion}
          className="btn-primary"
        >
          {state === 'submitting'
            ? 'جارٍ تسجيل الإكمال…'
            : 'نعم، أتممت القراءة'}
        </button>
        <button
          type="button"
          disabled={state === 'submitting'}
          onClick={() => setState('idle')}
          className="btn-secondary"
        >
          العودة للقراءة
        </button>
      </div>
      </section>
    </div>
  )
}
