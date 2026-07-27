import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { HistoryDayGroup as HistoryDayGroupModel } from '../types'
import { HistorySessionRow } from './history-session-row'

export function HistoryDayGroup({
  group,
}: {
  group: HistoryDayGroupModel
}) {
  return (
    <section
      className="rounded-[1.75rem] border border-stone-200/80 bg-stone-50/70 p-5 sm:p-6"
      aria-labelledby={`history-day-${group.localDate}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3
          id={`history-day-${group.localDate}`}
          className="text-xl font-bold text-stone-950"
        >
          {group.formattedDate}
        </h3>
        <p className="text-sm font-semibold text-stone-600">
          {formatArabicNumber(group.totalPages)} صفحات —{' '}
          {formatArabicNumber(group.sessionCount)} جلسات
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {group.events.map((event) => (
          <HistorySessionRow key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
