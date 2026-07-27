import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { HistoryEvent } from '../types'

export function HistorySessionRow({ event }: { event: HistoryEvent }) {
  const pageRange =
    event.startPage === event.endPage
      ? `الصفحة ${formatArabicNumber(event.startPage)}`
      : `الصفحات ${formatArabicNumber(event.startPage)}–${formatArabicNumber(event.endPage)}`

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {event.sessionOrder
              ? `الجلسة ${formatArabicNumber(event.sessionOrder)}`
              : 'جلسة قراءة مكتملة'}
          </p>
          <h4 className="mt-1 text-lg font-bold text-stone-900">
            {pageRange}
          </h4>
          <p className="mt-1 text-sm text-stone-500">
            {formatArabicNumber(event.pageCount)}{' '}
            {event.pageCount === 1 ? 'صفحة' : 'صفحات'}
          </p>
        </div>
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          اكتملت الساعة {event.formattedCompletionTime}
        </p>
      </div>
    </article>
  )
}
