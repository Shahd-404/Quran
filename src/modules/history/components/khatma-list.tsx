import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { ProgressBar } from '@/modules/dashboard/components/progress-bar'
import { KhatmaHistorySummary } from '../types'

export function CurrentKhatmaCard({
  khatma,
}: {
  khatma: KhatmaHistorySummary
}) {
  return (
    <section className="rounded-card border border-primary/25 bg-primary-soft p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary-muted">
            الختمة الحالية
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
          </h2>
        </div>
        <span className="rounded-full bg-surface px-4 py-2 font-bold text-primary-muted">
          {formatArabicNumber(khatma.percentage)}٪
        </span>
      </div>
      <div className="mt-5">
        <ProgressBar
          value={khatma.percentage}
          label="نسبة تقدم الختمة الحالية"
        />
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-surface/80 p-3">
          <dt className="text-muted">صفحة البداية</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.startPage)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface/80 p-3">
          <dt className="text-muted">الصفحة التالية</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.currentUnreadPage ?? khatma.startPage)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface/80 p-3">
          <dt className="text-muted">الصفحات المكتملة</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.completedPages)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface/80 p-3">
          <dt className="text-muted">تاريخ البداية</dt>
          <dd className="mt-1 font-bold">{khatma.formattedStartDate}</dd>
        </div>
      </dl>
      <a
        href={`/app/history/khatmas/${khatma.id}`}
        className="btn-secondary mt-5 min-h-[2.75rem] rounded-xl px-4 py-2"
      >
        عرض تفاصيل الختمة
      </a>
    </section>
  )
}

export function KhatmaList({
  khatmas,
}: {
  khatmas: KhatmaHistorySummary[]
}) {
  return (
    <section aria-labelledby="previous-khatmas-title">
      <h2 id="previous-khatmas-title" className="text-2xl font-bold">
        الختمات السابقة
      </h2>
      {khatmas.length === 0 ? (
        <div className="empty-state mt-4">
          <h3 className="font-bold text-ink">لا توجد ختمات مكتملة بعد</h3>
          <p className="mt-2">ستظهر هنا عند إكمال أول ختمة بإذن الله.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {khatmas.map((khatma) => (
            <article
              key={khatma.id}
              className="surface-card p-5"
            >
              <p className="text-sm font-semibold text-primary-muted">
                الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">تاريخ البداية</dt>
                  <dd className="mt-1 font-bold">
                    {khatma.formattedStartDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">تاريخ الإكمال</dt>
                  <dd className="mt-1 font-bold">
                    {khatma.formattedCompletionDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">صفحة البداية</dt>
                  <dd className="mt-1 font-bold">
                    {formatArabicNumber(khatma.startPage)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">الصفحات المكتملة</dt>
                  <dd className="mt-1 font-bold">
                    {formatArabicNumber(khatma.completedPages)}
                  </dd>
                </div>
              </dl>
              <a
                href={`/app/history/khatmas/${khatma.id}`}
                className="btn-primary mt-5 min-h-[2.75rem] w-full rounded-xl px-4 py-2"
              >
                عرض تفاصيل الختمة
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
