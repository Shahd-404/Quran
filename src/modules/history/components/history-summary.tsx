import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'

export function HistorySummary({
  totalCompletedPages,
  totalCompletedSessions,
  totalCompletedKhatmas,
}: {
  totalCompletedPages: number
  totalCompletedSessions: number
  totalCompletedKhatmas: number
}) {
  const cards = [
    {
      label: 'إجمالي الصفحات المقروءة',
      value: totalCompletedPages,
    },
    {
      label: 'الجلسات المكتملة',
      value: totalCompletedSessions,
    },
    {
      label: 'الختمات المكتملة',
      value: totalCompletedKhatmas,
    },
  ]

  return (
    <section
      className="grid gap-3 sm:grid-cols-3"
      aria-label="ملخص سجل القراءة"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm"
        >
          <p className="text-sm leading-6 text-stone-500">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {formatArabicNumber(card.value)}
          </p>
        </div>
      ))}
    </section>
  )
}
