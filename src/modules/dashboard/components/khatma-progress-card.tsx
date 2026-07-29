import React from 'react'
import { formatArabicNumber } from '../formatting'
import { QURAN_FINAL_PAGE } from '../progress'
import { DashboardModel } from '../types'
import { ProgressBar } from './progress-bar'

export function KhatmaProgressCard({
  khatma,
  currentUnreadPage,
}: {
  khatma: DashboardModel['khatma']
  currentUnreadPage: number
}) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">تقدّم الختمة</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            الصفحة التالية: {formatArabicNumber(currentUnreadPage)}
          </h2>
        </div>
        <span className="rounded-full bg-accent-soft px-4 py-2 text-base font-bold text-warning">
          {formatArabicNumber(khatma.percentage)}٪
        </span>
      </div>
      <div className="mt-6">
        <ProgressBar value={khatma.percentage} label="نسبة التقدم في الختمة" tone="gold" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{formatArabicNumber(khatma.completedPages)} صفحة مكتملة في هذه الختمة</span>
        <span>حتى الصفحة {formatArabicNumber(QURAN_FINAL_PAGE)}</span>
      </div>
      <p className="mt-5 border-t border-line/70 pt-4 text-sm leading-7 text-muted">
        يتقدّم هذا المؤشر فقط بعد تأكيد إكمال جلسات القراءة.
      </p>
      <a
        href={`/app/history/khatmas/${khatma.id}`}
        className="btn-secondary mt-4 min-h-[2.75rem] w-full py-2"
      >
        عرض تفاصيل الختمة
      </a>
    </section>
  )
}
