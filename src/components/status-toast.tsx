'use client'

import { useEffect, useState } from 'react'
import { CircleCheck, X } from 'lucide-react'

export function StatusToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 6000)
    return () => window.clearTimeout(timeout)
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/30 bg-surface px-4 py-3 text-sm font-medium text-ink shadow-lift sm:bottom-5 sm:left-6 sm:w-auto sm:translate-x-0"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-muted" aria-hidden="true">
        <CircleCheck aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
      </span>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="grid h-8 w-8 place-items-center rounded-xl text-muted transition hover:bg-elevated hover:text-ink"
        aria-label="إغلاق الرسالة"
      >
        <X aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
      </button>
    </div>
  )
}
