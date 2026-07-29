import React from 'react'
import { formatArabicNumber } from '../formatting'
import { DashboardModel } from '../types'
import { ProgressBar } from './progress-bar'

export function DailyProgressCard({ assignment }: { assignment: DashboardModel['assignment'] }) {
  return (
    <section className="surface-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">ورد اليوم</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            {formatArabicNumber(assignment.completedPages)}
            <span className="mx-2 text-xl font-normal text-line">من</span>
            {formatArabicNumber(assignment.targetPages)}
            <span className="mr-2 text-base font-medium text-muted">صفحات مكتملة</span>
          </h2>
        </div>
        <span className="rounded-full bg-primary-soft px-4 py-2 text-base font-bold text-primary-muted">
          {formatArabicNumber(assignment.percentage)}٪
        </span>
      </div>
      <div className="mt-6">
        <ProgressBar value={assignment.percentage} label="نسبة إنجاز ورد اليوم" />
      </div>
      {assignment.carriedOver ? (
        <div className="status-warning mt-5 text-base leading-7">
          هذا ورد غير مكتمل من يوم سابق
        </div>
      ) : null}
    </section>
  )
}
