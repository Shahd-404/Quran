import React from 'react'
import LogoutButton from '@/components/logout-button'
import { StatusToast } from '@/components/status-toast'
import { NotificationSettingsCard } from '@/modules/notifications/components/notification-settings-card'
import { CompletionEstimateCard } from '@/modules/reading-plan/components/completion-estimate-card'
import { formatArabicNumber } from '../formatting'
import { DashboardModel } from '../types'
import { DailyProgressCard } from './daily-progress-card'
import { KhatmaProgressCard } from './khatma-progress-card'
import { SessionCard } from './session-card'

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
    <main className="page-shell">
      <div className="page-container">
        <section className="relative overflow-hidden rounded-card bg-hero px-6 py-8 text-white shadow-lift sm:px-9 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 right-1/3 h-44 w-44 rounded-full border border-accent/20"
          />
          <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <div>
              <p className="text-sm font-bold text-hero-muted">مساحتك اليومية مع القرآن</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                السلام عليكم{displayName ? `، ${displayName}` : ''}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-8 text-white/80">
                خطوة هادئة اليوم، وصفحة بعد صفحة تكتمل الختمة بإذن الله.
              </p>
              <p className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                {data.assignment.formattedDate}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="ملخص التقدم">
              <HeroMetric
                label="أنجزت اليوم"
                value={`${formatArabicNumber(data.assignment.percentage)}٪`}
              />
              <HeroMetric
                label="الصفحة التالية"
                value={formatArabicNumber(data.plan.currentUnreadPage)}
              />
              <HeroMetric
                label="الهدف اليومي"
                value={formatArabicNumber(data.plan.dailyPageTarget)}
              />
            </dl>
          </div>
        </section>

        <nav
          className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card"
          aria-label="إجراءات لوحة الورد"
        >
          <a href="/app/history" className="btn-ghost min-h-[2.75rem] flex-1 px-4 py-2 sm:flex-none">
            سجل القراءة
          </a>
          <a href="/app/settings/privacy" className="btn-ghost min-h-[2.75rem] flex-1 px-4 py-2 sm:flex-none">
            الخصوصية والبيانات
          </a>
          <div className="mr-auto min-w-[8.5rem] [&_button]:min-h-[2.75rem] [&_button]:bg-transparent [&_button]:px-4 [&_button]:py-2 [&_button]:text-muted [&_button]:shadow-none hover:[&_button]:bg-danger-soft hover:[&_button]:text-danger">
            <LogoutButton />
          </div>
        </nav>

        {completionRecorded ? (
          <StatusToast message="تم تسجيل إكمال الجلسة بنجاح" />
        ) : null}

        {planUpdated ? (
          <StatusToast message="تم حفظ تعديلات الخطة" />
        ) : null}

        {data.plan.status === 'completed' ? (
          <section className="status-success mt-6" aria-labelledby="khatma-completed-title">
            <p className="text-sm font-semibold">تم تسجيل آخر صفحة</p>
            <h2 id="khatma-completed-title" className="mt-1 text-2xl font-bold text-ink">
              اكتملت الختمة
            </h2>
            <p className="mt-2 leading-7">
              تقبّل الله قراءتك. لن تبدأ ختمة جديدة إلا باختيارك الصريح.
            </p>
          </section>
        ) : null}

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
          <div className="space-y-6">
            <section className="surface-card overflow-hidden" aria-labelledby="highlighted-session-title">
              <div className="border-b border-accent/20 bg-accent-soft px-5 py-5 sm:px-7">
                <p className="eyebrow !text-warning">خطوتك التالية</p>
                <h2 id="highlighted-session-title" className="section-title">
                  {data.highlightedSession ? 'جلسة القراءة الأقرب' : 'اكتمل ورد هذا اليوم'}
                </h2>
              </div>
              <div className="p-5 sm:p-7">
                {data.highlightedSession ? (
                  <SessionCard
                    session={data.highlightedSession}
                    assignmentLocalDate={data.assignment.localDate}
                    timezone={data.plan.timezone}
                  />
                ) : (
                  <div className="status-success text-center leading-7">
                    اكتملت جميع جلسات هذا الورد. تقبّل الله قراءتك.
                  </div>
                )}
              </div>
            </section>

            <DailyProgressCard assignment={data.assignment} />

            <section className="surface-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="icon-tile" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
                    <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                </span>
                <div>
                  <p className="eyebrow">جلسات اليوم</p>
                  <h2 className="section-title">جدول الجلسات</h2>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {data.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    assignmentLocalDate={data.assignment.localDate}
                    timezone={data.plan.timezone}
                    compact
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <KhatmaProgressCard
              khatma={data.khatma}
              currentUnreadPage={data.plan.currentUnreadPage}
            />
            <CompletionEstimateCard
              currentUnreadPage={data.plan.currentUnreadPage}
              pagesPerDay={data.plan.dailyPageTarget}
              sessionsPerDay={data.plan.sessionsPerDay}
              timezone={data.plan.timezone}
              effectiveFrom={data.plan.effectiveFrom}
              variant="active-plan"
            />
            <NotificationSettingsCard />

            <section className="surface-card p-5 sm:p-6">
              <p className="eyebrow">ملخص الخطة</p>
              <h2 className="section-title">
                {data.plan.status === 'completed'
                  ? 'خطة الورد المكتملة'
                  : 'خطة الورد النشطة'}
              </h2>
              <dl className="mt-5 divide-y divide-line/70">
                <PlanDetail label="الهدف اليومي" value={`${formatArabicNumber(data.plan.dailyPageTarget)} صفحات`} />
                <PlanDetail label="عدد الجلسات" value={`${formatArabicNumber(data.plan.sessionsPerDay)} جلسات`} />
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-muted">المنطقة الزمنية</dt>
                  <dd className="max-w-[11rem] break-words text-left text-sm font-bold text-ink" dir="ltr">
                    {data.plan.timezone}
                  </dd>
                </div>
              </dl>
              {data.plan.status === 'active' ? (
                <a href="/app/plan/settings" className="btn-secondary mt-5 w-full">
                  إعدادات الخطة
                </a>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-4 text-center backdrop-blur-sm">
      <dt className="text-xs leading-5 text-hero-muted">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</dd>
    </div>
  )
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-bold text-ink">{value}</dd>
    </div>
  )
}
