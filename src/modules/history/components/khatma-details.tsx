import React from 'react'
import { ArrowRight } from 'lucide-react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { ProgressBar } from '@/modules/dashboard/components/progress-bar'
import { KhatmaHistoryModel } from '../types'
import { HistoryDayGroup } from './history-day-group'
import { HistoryPagination } from './history-pagination'

export function KhatmaDetails({ data }: { data: KhatmaHistoryModel }) {
  const { khatma } = data
  return (
    <main className="page-shell">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <a
            href="/app/history"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-muted hover:underline"
          >
            <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            العودة إلى سجل القراءة
          </a>
          <p className="eyebrow mt-5">
            تفاصيل الختمة
          </p>
          <h1 className="page-title !mt-1">
            الختمة رقم {formatArabicNumber(khatma.cycleNumber)}
          </h1>
          {khatma.status === 'completed' ? (
            <p className="mt-3 text-lg font-semibold text-primary-muted">
              تمت الختمة بحمد الله
            </p>
          ) : (
            <p className="mt-3 leading-7 text-muted">
              هذه الختمة ما زالت جارية، ويعرض المؤشر تقدمها المسجل فقط.
            </p>
          )}
        </header>

        <section className="surface-card mt-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {khatma.status === 'completed' ? 'ختمة مكتملة' : 'ختمة نشطة'}
            </h2>
            <span className="rounded-full bg-primary-soft px-3 py-1.5 font-semibold text-primary-muted">
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
          className="surface-card mt-7 p-5 sm:p-7"
          aria-labelledby="khatma-timeline-title"
        >
          <h2 id="khatma-timeline-title" className="text-lg font-semibold">
            سجل قراءة هذه الختمة
          </h2>
          {data.dayGroups.length === 0 ? (
            <p className="empty-state mt-5">
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
    <div className="surface-muted p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  )
}
