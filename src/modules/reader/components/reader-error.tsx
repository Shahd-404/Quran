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
    <div className="-m-4 min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-700">
          !
        </div>
        <h1 className="mt-5 text-2xl font-bold">تعذّر عرض صفحة الورد</h1>
        {session ? (
          <p className="mt-2 text-sm text-stone-500">
            الجلسة {formatArabicNumber(session.sessionOrder)} · الصفحات{' '}
            {formatArabicNumber(session.startPage)}–
            {formatArabicNumber(session.endPage)}
          </p>
        ) : null}
        <OfflineAwareReaderMessage fallback={message} />
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={retryHref}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-950"
          >
            إعادة المحاولة
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-stone-100 px-6 py-3 font-bold text-stone-700 hover:bg-stone-200"
          >
            العودة للوحة الورد
          </Link>
        </div>
      </section>
    </div>
  )
}
