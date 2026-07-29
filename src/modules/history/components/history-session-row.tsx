import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { HistoryEvent } from '../types'

export function HistorySessionRow({ event }: { event: HistoryEvent }) {
  const pageRange =
    event.startPage === event.endPage
      ? `الصفحة ${formatArabicNumber(event.startPage)}`
      : `الصفحات ${formatArabicNumber(event.startPage)}–${formatArabicNumber(event.endPage)}`

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-primary-muted">
            {event.sessionOrder
              ? `الجلسة ${formatArabicNumber(event.sessionOrder)}`
              : 'جلسة قراءة مكتملة'}
          </p>
          <h4 className="mt-1 text-[1.0625rem] font-semibold text-ink">
            {pageRange}
          </h4>
          <p className="mt-1 text-sm text-muted">
            {formatArabicNumber(event.pageCount)}{' '}
            {event.pageCount === 1 ? 'صفحة' : 'صفحات'}
          </p>
        </div>
        <p className="rounded-xl bg-primary-soft px-3 py-2 text-xs font-medium text-primary-muted">
          اكتملت الساعة {event.formattedCompletionTime}
        </p>
      </div>
    </article>
  )
}
