import React from 'react'
import { BookOpenText } from 'lucide-react'
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
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="icon-tile" aria-hidden="true">
            <BookOpenText aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow">تقدّم الختمة</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              الصفحة التالية: {formatArabicNumber(currentUnreadPage)}
            </h2>
          </div>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-warning">
          {formatArabicNumber(khatma.percentage)}٪
        </span>
      </div>
      <div className="mt-4">
        <ProgressBar value={khatma.percentage} label="نسبة التقدم في الختمة" tone="gold" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{formatArabicNumber(khatma.completedPages)} صفحة مكتملة في هذه الختمة</span>
        <span>حتى الصفحة {formatArabicNumber(QURAN_FINAL_PAGE)}</span>
      </div>
      <p className="mt-4 border-t border-line/70 pt-3 text-xs leading-6 text-muted">
        يتقدّم هذا المؤشر فقط بعد تأكيد إكمال جلسات القراءة.
      </p>
      <a
        href={`/app/history/khatmas/${khatma.id}`}
        className="btn-secondary mt-3 w-full"
      >
        عرض تفاصيل الختمة
      </a>
    </section>
  )
}
