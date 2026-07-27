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
    <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            الختمة الحالية
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
          </h2>
        </div>
        <span className="rounded-full bg-white px-4 py-2 font-bold text-emerald-900">
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
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-stone-500">صفحة البداية</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.startPage)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-stone-500">الصفحة التالية</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.currentUnreadPage ?? khatma.startPage)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-stone-500">الصفحات المكتملة</dt>
          <dd className="mt-1 font-bold">
            {formatArabicNumber(khatma.completedPages)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-stone-500">تاريخ البداية</dt>
          <dd className="mt-1 font-bold">{khatma.formattedStartDate}</dd>
        </div>
      </dl>
      <a
        href={`/app/history/khatmas/${khatma.id}`}
        className="mt-5 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-emerald-800 px-4 py-2 font-bold text-emerald-900"
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
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
          لا توجد ختمات مكتملة بعد. ستظهر هنا عند إكمال أول ختمة.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {khatmas.map((khatma) => (
            <article
              key={khatma.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-emerald-800">
                الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-stone-500">تاريخ البداية</dt>
                  <dd className="mt-1 font-bold">
                    {khatma.formattedStartDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">تاريخ الإكمال</dt>
                  <dd className="mt-1 font-bold">
                    {khatma.formattedCompletionDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">صفحة البداية</dt>
                  <dd className="mt-1 font-bold">
                    {formatArabicNumber(khatma.startPage)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">الصفحات المكتملة</dt>
                  <dd className="mt-1 font-bold">
                    {formatArabicNumber(khatma.completedPages)}
                  </dd>
                </div>
              </dl>
              <a
                href={`/app/history/khatmas/${khatma.id}`}
                className="mt-5 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-2 font-bold text-white"
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
