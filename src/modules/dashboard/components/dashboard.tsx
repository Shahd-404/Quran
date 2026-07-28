import React from 'react'
import LogoutButton from '@/components/logout-button'
import { formatArabicNumber } from '../formatting'
import { DashboardModel } from '../types'
import { DailyProgressCard } from './daily-progress-card'
import { KhatmaProgressCard } from './khatma-progress-card'
import { SessionCard } from './session-card'
import { NotificationSettingsCard } from '@/modules/notifications/components/notification-settings-card'

export function Dashboard({
  data,
  completionRecorded = false,
  planUpdated = false,
}: {
  data: DashboardModel
  completionRecorded?: boolean
  planUpdated?: boolean
}) {
  const displayName = data.profile.displayName?.trim()

  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-4 flex items-center gap-3 text-base font-bold text-emerald-900">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-900 text-lg text-white shadow-sm">
                و
              </span>
              <span>ورد</span>
            </div>
            <p className="text-base text-stone-600">السلام عليكم{displayName ? `، ${displayName}` : ''}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">رفيق وردك اليومي</h1>
            <p className="mt-3 text-base text-stone-500">{data.assignment.formattedDate}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-44">
            <a
              href="/app/history"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-emerald-800 bg-white px-4 py-2 font-bold text-emerald-900"
            >
              سجل القراءة
            </a>
            <a
              href="/app/settings/privacy"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-center font-bold text-stone-700"
            >
              الخصوصية والبيانات
            </a>
            <a
              href="/app/settings/privacy"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-center font-bold text-stone-700"
            >
              الخصوصية والبيانات
            </a>
            <div className="[&_button]:min-h-[2.75rem] [&_button]:bg-white [&_button]:py-2 [&_button]:text-stone-700 [&_button]:ring-1 [&_button]:ring-stone-200 [&_button]:shadow-sm [&_button:hover]:bg-stone-50">
              <LogoutButton />
            </div>
          </div>
        </header>

        {completionRecorded ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-950"
          >
            تم تسجيل إكمال الجلسة بنجاح
          </div>
        ) : null}

        {planUpdated ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-950"
          >
            تم حفظ تعديلات الخطة
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
          <div className="space-y-6">
            {data.plan.status === 'completed' ? (
              <section
                className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm sm:p-6"
                aria-labelledby="khatma-completed-title"
              >
                <p className="text-sm font-semibold">تم تسجيل آخر صفحة</p>
                <h2
                  id="khatma-completed-title"
                  className="mt-1 text-2xl font-bold"
                >
                  اكتملت الختمة
                </h2>
                <p className="mt-2 leading-7">
                  تقبّل الله قراءتك. لن تبدأ ختمة جديدة إلا باختيارك الصريح.
                </p>
              </section>
            ) : null}

            <DailyProgressCard assignment={data.assignment} />

            <section
              className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 shadow-[0_8px_30px_rgba(28,25,23,0.04)] sm:p-7"
              aria-labelledby="highlighted-session-title"
            >
              <p className="text-base font-semibold text-amber-900">جلستك الحالية</p>
              <h2 id="highlighted-session-title" className="mb-5 mt-1 text-2xl font-bold text-stone-900">
                {data.highlightedSession ? 'الجلسة الأقرب للقراءة' : 'اكتمل ورد هذا اليوم'}
              </h2>
              {data.highlightedSession ? (
                <SessionCard session={data.highlightedSession} />
              ) : (
                <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-base leading-7 text-emerald-900">
                  اكتملت جميع جلسات هذا الورد. تقبّل الله قراءتك.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(28,25,23,0.05)] sm:p-7">
              <p className="text-base font-semibold text-emerald-800">جدول اليوم</p>
              <h2 className="mb-6 mt-1 text-2xl font-bold">جلسات الورد</h2>
              <div className="space-y-4">
                {data.sessions.map((session) => (
                  <SessionCard key={session.id} session={session} compact />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <NotificationSettingsCard />
            <KhatmaProgressCard
              khatma={data.khatma}
              currentUnreadPage={data.plan.currentUnreadPage}
            />

            <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(28,25,23,0.05)] sm:p-6">
              <p className="text-base font-semibold text-emerald-800">ملخص الخطة</p>
              <h2 className="mt-1 text-2xl font-bold">
                {data.plan.status === 'completed'
                  ? 'خطة الورد المكتملة'
                  : 'خطة الورد النشطة'}
              </h2>
              <dl className="mt-5 divide-y divide-stone-100">
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-base text-stone-500">الهدف اليومي</dt>
                  <dd className="text-base font-bold">{formatArabicNumber(data.plan.dailyPageTarget)} صفحات</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-base text-stone-500">عدد الجلسات</dt>
                  <dd className="text-base font-bold">{formatArabicNumber(data.plan.sessionsPerDay)} جلسات</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-base text-stone-500">المنطقة الزمنية</dt>
                  <dd className="max-w-[11rem] break-words text-left text-base font-bold" dir="ltr">
                    {data.plan.timezone}
                  </dd>
                </div>
              </dl>
              {data.plan.status === 'active' ? (
                <a
                  href="/app/plan/settings"
                  className="mt-5 inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl border border-emerald-800 px-5 py-3 font-bold text-emerald-900 transition hover:bg-emerald-50"
                >
                  إعدادات الخطة
                </a>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
