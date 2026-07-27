'use client'

import React, { useRef, useState } from 'react'
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
      <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">
          هل أنهيت صفحات الجلسة؟
        </h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          لن يتقدّم وردك إلا بعد تأكيدك الصريح أنك قرأت جميع الصفحات.
        </p>
        <button
          type="button"
          onClick={() => setState('confirming')}
          className="mt-4 min-h-[3rem] w-full rounded-2xl bg-emerald-900 px-5 py-3 font-bold text-white hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          أتممت قراءة الجلسة
        </button>
      </section>
    )
  }

  return (
    <section
      role="alertdialog"
      aria-labelledby="completion-confirmation-title"
      aria-describedby="completion-confirmation-description"
      className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
    >
      <h2
        id="completion-confirmation-title"
        className="text-lg font-bold text-stone-950"
      >
        تأكيد إكمال الجلسة
      </h2>
      <p
        id="completion-confirmation-description"
        className="mt-2 leading-7 text-stone-700"
      >
        هل أتممت قراءة جميع صفحات هذه الجلسة؟
      </p>

      {state === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm leading-6 text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          {SAFE_ERROR}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={state === 'submitting'}
          onClick={submitCompletion}
          className="min-h-[3rem] rounded-2xl bg-emerald-900 px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {state === 'submitting'
            ? 'جارٍ تسجيل الإكمال…'
            : 'نعم، أتممت القراءة'}
        </button>
        <button
          type="button"
          disabled={state === 'submitting'}
          onClick={() => setState('idle')}
          className="min-h-[3rem] rounded-2xl bg-white px-5 py-3 font-bold text-stone-700 ring-1 ring-stone-200 disabled:opacity-60"
        >
          العودة للقراءة
        </button>
      </div>
    </section>
  )
}
