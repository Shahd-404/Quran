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
    <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(28,25,23,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-emerald-800">تقدّم الختمة</p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">
            الصفحة التالية: {formatArabicNumber(currentUnreadPage)}
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-4 py-2 text-base font-bold text-amber-800">
          {formatArabicNumber(khatma.percentage)}٪
        </span>
      </div>
      <div className="mt-6">
        <ProgressBar value={khatma.percentage} label="نسبة التقدم في الختمة" tone="gold" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-base text-stone-600">
        <span>{formatArabicNumber(khatma.completedPages)} صفحة مكتملة في هذه الختمة</span>
        <span>حتى الصفحة {formatArabicNumber(QURAN_FINAL_PAGE)}</span>
      </div>
      <p className="mt-5 border-t border-stone-100 pt-4 text-sm leading-7 text-stone-500">
        يتقدّم هذا المؤشر فقط بعد تأكيد إكمال جلسات القراءة.
      </p>
      <a
        href={`/app/history/khatmas/${khatma.id}`}
        className="mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-stone-300 px-4 py-2 font-bold text-stone-800"
      >
        عرض تفاصيل الختمة
      </a>
    </section>
  )
}
