import React from 'react'
import { ReadingHistoryModel } from '../types'
import { CurrentKhatmaCard, KhatmaList } from './khatma-list'
import { HistoryDayGroup } from './history-day-group'
import { HistoryPagination } from './history-pagination'
import { HistorySummary } from './history-summary'

export function HistoryPage({ data }: { data: ReadingHistoryModel }) {
  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="mb-8">
          <a href="/app" className="text-sm font-bold text-primary-muted hover:underline">
            العودة إلى لوحة الورد
          </a>
          <h1 className="page-title">
            سجل القراءة
          </h1>
          <p className="page-description">
            هنا تجد جلسات القراءة التي أكملتها وتقدم ختماتك كما سُجّل وقت
            الإكمال، دون تعديل بياناتك التاريخية.
          </p>
        </header>

        <HistorySummary
          totalCompletedPages={data.totalCompletedPages}
          totalCompletedSessions={data.totalCompletedSessions}
          totalCompletedKhatmas={data.totalCompletedKhatmas}
        />

        <div className="mt-8 space-y-8">
          {data.currentKhatma ? (
            <CurrentKhatmaCard khatma={data.currentKhatma} />
          ) : null}

          <KhatmaList khatmas={data.completedKhatmas} />

          <section
            className="surface-card p-5 sm:p-7"
            aria-labelledby="reading-timeline-title"
          >
            <h2 id="reading-timeline-title" className="text-2xl font-bold">
              جلسات القراءة المكتملة
            </h2>
            {data.dayGroups.length === 0 ? (
              <div className="empty-state mt-5">
                <span className="icon-tile mx-auto" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
                    <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                </span>
                <h3 className="mt-4 font-bold text-ink">سجلّك جاهز لأول جلسة</h3>
                <p className="mt-2 leading-7">سيظهر هنا سجل جلساتك بعد إكمال أول جلسة قراءة.</p>
              </div>
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
                basePath="/app/history"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export function HistoryError({ message }: { message: string }) {
  return (
    <main className="page-shell">
      <section
        role="alert"
        className="surface-card mx-auto max-w-xl border-danger/30 p-8 text-center"
      >
        <h1 className="text-2xl font-bold">تعذّر عرض سجل القراءة</h1>
        <p className="mt-3 leading-7 text-muted">{message}</p>
        <a
          href="/app"
          className="btn-primary mt-6"
        >
          العودة إلى لوحة الورد
        </a>
      </section>
    </main>
  )
}
