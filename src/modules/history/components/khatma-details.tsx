import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { ProgressBar } from '@/modules/dashboard/components/progress-bar'
import { KhatmaHistoryModel } from '../types'
import { HistoryDayGroup } from './history-day-group'
import { HistoryPagination } from './history-pagination'

export function KhatmaDetails({ data }: { data: KhatmaHistoryModel }) {
  const { khatma } = data
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-stone-900 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <a
            href="/app/history"
            className="text-sm font-semibold text-emerald-800"
          >
            العودة إلى سجل القراءة
          </a>
          <p className="mt-5 text-sm font-semibold text-emerald-800">
            تفاصيل الختمة
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
          </h1>
          {khatma.status === 'completed' ? (
            <p className="mt-3 text-xl font-bold text-emerald-900">
              تمت الختمة بحمد الله
            </p>
          ) : (
            <p className="mt-3 leading-7 text-stone-600">
              هذه الختمة ما زالت جارية، ويعرض المؤشر تقدمها المسجل فقط.
            </p>
          )}
        </header>

        <section className="mt-7 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              {khatma.status === 'completed' ? 'ختمة مكتملة' : 'ختمة نشطة'}
            </h2>
            <span className="rounded-full bg-emerald-50 px-4 py-2 font-bold text-emerald-900">
              {formatArabicNumber(khatma.percentage)}٪
            </span>
          </div>
          <div className="mt-5">
            <ProgressBar
              value={khatma.percentage}
              label="نسبة تقدم الختمة"
            />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="صفحة البداية" value={formatArabicNumber(khatma.startPage)} />
            <Detail label="تاريخ البداية" value={khatma.formattedStartDate} />
            <Detail
              label="تاريخ الإكمال"
              value={khatma.formattedCompletionDate ?? 'لم تكتمل بعد'}
            />
            <Detail
              label="الصفحات المكتملة"
              value={formatArabicNumber(khatma.completedPages)}
            />
            <Detail
              label="الجلسات المكتملة"
              value={formatArabicNumber(khatma.completedSessions)}
            />
            {khatma.status === 'active' ? (
              <Detail
                label="الصفحة التالية"
                value={formatArabicNumber(
                  khatma.currentUnreadPage ?? khatma.startPage,
                )}
              />
            ) : null}
          </dl>
        </section>

        <section
          className="mt-7 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
          aria-labelledby="khatma-timeline-title"
        >
          <h2 id="khatma-timeline-title" className="text-2xl font-bold">
            سجل قراءة هذه الختمة
          </h2>
          {data.dayGroups.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-stone-50 p-6 text-stone-600">
              لا توجد جلسات مكتملة مسجلة لهذه الختمة بعد.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {data.dayGroups.map((group) => (
                <HistoryDayGroup key={group.localDate} group={group} />
              ))}
            </div>
          )}
          <div className="mt-6">
            <HistoryPagination
              pagination={data.pagination}
              basePath={`/app/history/khatmas/${khatma.id}`}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  )
}
