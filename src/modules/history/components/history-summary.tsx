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
          className="surface-card p-4"
        >
          <p className="text-sm leading-6 text-muted">{card.label}</p>
          <p className="mt-1 text-3xl font-semibold text-primary-muted">
            {formatArabicNumber(card.value)}
          </p>
        </div>
      ))}
    </section>
  )
}
