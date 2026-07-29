import React from 'react'
import { ChartNoAxesColumnIncreasing, TriangleAlert } from 'lucide-react'
import { formatArabicNumber } from '../formatting'
import { DashboardModel } from '../types'
import { ProgressBar } from './progress-bar'

export function DailyProgressCard({ assignment }: { assignment: DashboardModel['assignment'] }) {
  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="icon-tile" aria-hidden="true">
            <ChartNoAxesColumnIncreasing aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow">ورد اليوم</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {formatArabicNumber(assignment.completedPages)}
              <span className="mx-1.5 text-sm font-normal text-muted">من</span>
              {formatArabicNumber(assignment.targetPages)}
              <span className="mr-1.5 text-xs font-normal text-muted">صفحات مكتملة</span>
            </h2>
          </div>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-muted">
          {formatArabicNumber(assignment.percentage)}٪
        </span>
      </div>
      <div className="mt-4">
        <ProgressBar value={assignment.percentage} label="نسبة إنجاز ورد اليوم" />
      </div>
      {assignment.carriedOver ? (
        <div className="status-warning mt-4 flex items-start gap-2 text-sm leading-6">
          <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={18} strokeWidth={1.8} />
          هذا ورد غير مكتمل من يوم سابق
        </div>
      ) : null}
    </section>
  )
}
