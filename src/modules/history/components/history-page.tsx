import React from 'react'
import { ReadingHistoryModel } from '../types'
import { CurrentKhatmaCard, KhatmaList } from './khatma-list'
import { HistoryDayGroup } from './history-day-group'
import { HistoryPagination } from './history-pagination'
import { HistorySummary } from './history-summary'

export function HistoryPage({ data }: { data: ReadingHistoryModel }) {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-stone-900 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <a href="/app" className="text-sm font-semibold text-emerald-800">
            العودة إلى لوحة الورد
          </a>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            سجل القراءة
          </h1>
          <p className="mt-3 max-w-2xl leading-8 text-stone-600">
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
            className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
            aria-labelledby="reading-timeline-title"
          >
            <h2 id="reading-timeline-title" className="text-2xl font-bold">
              جلسات القراءة المكتملة
            </h2>
            {data.dayGroups.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-stone-50 p-6 leading-7 text-stone-600">
                سيظهر هنا سجل جلساتك بعد إكمال أول جلسة قراءة.
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
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm"
      >
        <h1 className="text-2xl font-bold">تعذّر عرض سجل القراءة</h1>
        <p className="mt-3 leading-7 text-stone-600">{message}</p>
        <a
          href="/app"
          className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-stone-900 px-5 py-3 font-bold text-white"
        >
          العودة إلى لوحة الورد
        </a>
      </section>
    </main>
  )
}
