import React from 'react'
import { formatArabicNumber } from '../formatting'
import { DashboardModel } from '../types'
import { ProgressBar } from './progress-bar'

export function DailyProgressCard({ assignment }: { assignment: DashboardModel['assignment'] }) {
  return (
    <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(28,25,23,0.05)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-emerald-800">ورد اليوم</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {formatArabicNumber(assignment.completedPages)}
            <span className="mx-2 text-xl font-normal text-stone-300">من</span>
            {formatArabicNumber(assignment.targetPages)}
            <span className="mr-2 text-base font-medium text-stone-500">صفحات مكتملة</span>
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-4 py-2 text-base font-bold text-emerald-800">
          {formatArabicNumber(assignment.percentage)}٪
        </span>
      </div>
      <div className="mt-6">
        <ProgressBar value={assignment.percentage} label="نسبة إنجاز ورد اليوم" />
      </div>
      {assignment.carriedOver ? (
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-base leading-7 text-amber-950">
          هذا ورد غير مكتمل من يوم سابق
        </div>
      ) : null}
    </section>
  )
}
