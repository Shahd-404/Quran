import React from 'react'
import Link from 'next/link'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { ReaderSession } from '../types'
import { OfflineAwareReaderMessage } from '@/modules/offline/components/offline-aware-reader-message'

export function ReaderError({
  message,
  session,
  pageNumber,
}: {
  message: string
  session?: ReaderSession
  pageNumber?: number
}) {
  const retryHref =
    session && pageNumber
      ? `/app/read/${session.id}?page=${pageNumber}`
      : '/app'

  return (
    <main className="page-shell">
      <section
        role="alert"
        className="surface-card mx-auto max-w-xl border-danger/30 p-7 text-center"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-xl font-bold text-danger">
          !
        </div>
        <h1 className="mt-5 text-2xl font-bold">تعذّر عرض صفحة الورد</h1>
        {session ? (
          <p className="mt-2 text-sm text-muted">
            الجلسة {formatArabicNumber(session.sessionOrder)} · الصفحات{' '}
            {formatArabicNumber(session.startPage)}–
            {formatArabicNumber(session.endPage)}
          </p>
        ) : null}
        <OfflineAwareReaderMessage fallback={message} />
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={retryHref}
            className="btn-primary"
          >
            إعادة المحاولة
          </Link>
          <Link
            href="/app"
            className="btn-secondary"
          >
            العودة للوحة الورد
          </Link>
        </div>
      </section>
    </main>
  )
}
