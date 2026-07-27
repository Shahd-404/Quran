import React from 'react'
import Link from 'next/link'
import { formatArabicNumber } from '../formatting'
import { DashboardSession, SessionPresentationState } from '../types'

const STATE_LABELS: Record<SessionPresentationState, string> = {
  upcoming: 'قادمة',
  available: 'متاحة',
  in_progress: 'قيد القراءة',
  completed: 'مكتملة',
  missed: 'فات موعدها ومتاحة للقراءة',
}

const STATE_STYLES: Record<SessionPresentationState, string> = {
  upcoming: 'bg-sky-50 text-sky-700',
  available: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-800',
  completed: 'bg-stone-100 text-stone-600',
  missed: 'bg-orange-50 text-orange-800',
}

const ACTION_LABELS: Record<SessionPresentationState, string> = {
  upcoming: 'ابدأ مبكرًا',
  available: 'ابدأ القراءة',
  in_progress: 'متابعة القراءة',
  completed: 'مراجعة الجلسة',
  missed: 'اقرأ الورد السابق',
}

export function SessionCard({
  session,
  compact = false,
}: {
  session: DashboardSession
  compact?: boolean
}) {
  const pageRange =
    session.startPage === session.endPage
      ? `صفحة ${formatArabicNumber(session.startPage)}`
      : `الصفحات ${formatArabicNumber(session.startPage)}–${formatArabicNumber(session.endPage)}`

  return (
    <article
      className={[
        'rounded-2xl border p-4 sm:p-5',
        session.presentationState === 'completed'
          ? 'border-stone-200 bg-stone-50'
          : 'border-stone-200 bg-white shadow-[0_4px_20px_rgba(28,25,23,0.035)]',
        compact ? '' : 'ring-1 ring-amber-100',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-stone-500">
            الجلسة {formatArabicNumber(session.sessionOrder)}
          </p>
          <h3 className={`${compact ? 'mt-1 text-lg' : 'mt-2 text-2xl'} font-bold text-stone-900`}>
            {pageRange}
          </h3>
          <p className="mt-1 text-base text-stone-500">
            {formatArabicNumber(session.pageCount)} {session.pageCount === 1 ? 'صفحة' : 'صفحات'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${STATE_STYLES[session.presentationState]}`}
        >
          {STATE_LABELS[session.presentationState]}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4 text-base text-stone-600">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
          <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
          <path d="M12 7v5l3 2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>موعد الجلسة: {session.formattedTime}</span>
      </div>
      <Link
        href={`/app/read/${session.id}`}
        className={[
          'mt-4 inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800',
          session.presentationState === 'completed'
            ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            : 'bg-emerald-900 text-white hover:bg-emerald-950',
        ].join(' ')}
      >
        {ACTION_LABELS[session.presentationState]}
      </Link>
    </article>
  )
}
