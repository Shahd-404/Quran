import React from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock3,
  Files,
  Settings,
} from 'lucide-react'
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
  const remainingSessions = data.highlightedSession
    ? data.sessions.filter((session) => session.id !== data.highlightedSession?.id)
    : data.sessions

  return (
    <main className="page-shell">
      <div className="page-container">
        <section
          className="relative overflow-hidden rounded-card bg-hero px-5 py-5 text-white shadow-card sm:px-7 sm:py-7 lg:px-8"
          aria-labelledby="daily-summary-title"
        >
          <div
            aria-hidden="true"
            className="absolute -left-14 -top-16 h-40 w-40 rounded-full border border-white/10 bg-white/5"
          />
          <div className="relative">
            <p className="text-xs font-medium text-hero-muted">
              {data.assignment.formattedDate}
            </p>
            <h1
              id="daily-summary-title"
              className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[2rem]"
            >
              السلام عليكم{displayName ? `، ${displayName}` : ''}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-white/80">
              خطوة هادئة اليوم تقرّبك من تمام الختمة.
            </p>

            <dl
              className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-white/15 border-t border-white/15 pt-3"
              aria-label="ملخص ورد اليوم"
            >
              <HeroMetric
                Icon={CircleCheck}
                label="المنجز"
                value={`${formatArabicNumber(data.assignment.percentage)}٪`}
              />
              <HeroMetric
                Icon={BookOpen}
                label="الصفحة التالية"
                value={formatArabicNumber(data.plan.currentUnreadPage)}
              />
              <HeroMetric
                Icon={Files}
                label="هدف اليوم"
                value={formatArabicNumber(data.plan.dailyPageTarget)}
              />
            </dl>
          </div>
        </section>

        {completionRecorded ? (
          <StatusToast message="تم تسجيل إكمال الجلسة بنجاح" />
        ) : null}

        {planUpdated ? (
          <StatusToast message="تم حفظ تعديلات الخطة" />
        ) : null}

        {data.plan.status === 'completed' ? (
          <section className="status-success mt-4 flex items-start gap-3" aria-labelledby="khatma-completed-title">
            <CircleCheck aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={20} strokeWidth={1.8} />
            <div>
              <h2 id="khatma-completed-title" className="text-lg font-semibold text-ink">
                اكتملت الختمة
              </h2>
              <p className="mt-1 text-sm leading-6">
                تقبّل الله قراءتك. لن تبدأ ختمة جديدة إلا باختيارك الصريح.
              </p>
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)] lg:items-start">
          <section
            className="lg:col-start-1 lg:row-start-1"
            aria-labelledby="highlighted-session-title"
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <BookOpen aria-hidden="true" focusable="false" size={20} strokeWidth={1.8} className="text-primary-muted" />
              <h2 id="highlighted-session-title" className="section-title !mt-0">
                {data.highlightedSession ? 'جلسة القراءة التالية' : 'ورد اليوم مكتمل'}
              </h2>
            </div>
            {data.highlightedSession ? (
              <SessionCard
                session={data.highlightedSession}
                assignmentLocalDate={data.assignment.localDate}
                timezone={data.plan.timezone}
                featured
              />
            ) : (
              <div className="status-success flex items-start gap-2 leading-6">
                <CircleCheck aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" size={18} strokeWidth={1.8} />
                اكتملت جميع جلسات ورد اليوم. تقبّل الله قراءتك.
              </div>
            )}
          </section>

          <div className="lg:col-start-1 lg:row-start-2">
            <DailyProgressCard assignment={data.assignment} />
          </div>

          <div className="lg:col-start-2 lg:row-start-1">
            <CompletionEstimateCard
              currentUnreadPage={data.plan.currentUnreadPage}
              pagesPerDay={data.plan.dailyPageTarget}
              sessionsPerDay={data.plan.sessionsPerDay}
              timezone={data.plan.timezone}
              effectiveFrom={data.plan.effectiveFrom}
              variant="active-plan"
            />
          </div>

          {remainingSessions.length > 0 ? (
            <details className="group surface-card p-4 lg:col-start-1 lg:row-start-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="icon-tile" aria-hidden="true">
                    <Clock3 aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block text-[1.0625rem] font-semibold text-ink">
                      عرض جميع جلسات اليوم
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatArabicNumber(remainingSessions.length)} جلسات إضافية
                    </span>
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  focusable="false"
                  size={19}
                  strokeWidth={1.8}
                  className="shrink-0 text-muted transition group-open:rotate-180"
                />
              </summary>
              <div className="mt-4 space-y-3 border-t border-line/70 pt-4">
                {remainingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    assignmentLocalDate={data.assignment.localDate}
                    timezone={data.plan.timezone}
                    compact
                  />
                ))}
              </div>
            </details>
          ) : null}

          <div className="lg:col-start-2 lg:row-start-2">
            <KhatmaProgressCard
              khatma={data.khatma}
              currentUnreadPage={data.plan.currentUnreadPage}
            />
          </div>

          <details className="group surface-card p-4 lg:col-start-2 lg:row-start-3">
            <DisclosureHeading Icon={Bell} title="الإشعارات" description="تذكيرات جلسات الورد" />
            <div className="mt-4 border-t border-line/70 pt-4">
              <NotificationSettingsCard embedded />
            </div>
          </details>

          <details className="group surface-card p-4 lg:col-start-2 lg:row-start-4">
            <DisclosureHeading Icon={CalendarDays} title="تفاصيل الخطة" description="الهدف والمواعيد" />
            <div className="mt-4 border-t border-line/70 pt-3">
              <dl className="divide-y divide-line/70">
                <PlanDetail label="الهدف اليومي" value={`${formatArabicNumber(data.plan.dailyPageTarget)} صفحات`} />
                <PlanDetail label="عدد الجلسات" value={`${formatArabicNumber(data.plan.sessionsPerDay)} جلسات`} />
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs text-muted">المنطقة الزمنية</dt>
                  <dd className="max-w-[11rem] break-words text-left text-xs font-medium text-ink" dir="ltr">
                    {data.plan.timezone}
                  </dd>
                </div>
              </dl>
              {data.plan.status === 'active' ? (
                <a href="/app/plan/settings" className="btn-secondary mt-3 w-full">
                  <Settings aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
                  إعدادات الخطة
                </a>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </main>
  )
}

function HeroMetric({
  Icon,
  label,
  value,
}: {
  Icon: typeof BookOpen
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 px-2 text-center">
      <dt className="flex items-center justify-center gap-1 text-[0.6875rem] leading-5 text-hero-muted">
        <Icon aria-hidden="true" focusable="false" size={14} strokeWidth={1.8} />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">{value}</dd>
    </div>
  )
}

function DisclosureHeading({
  Icon,
  title,
  description,
}: {
  Icon: typeof Bell
  title: string
  description: string
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl [&::-webkit-details-marker]:hidden">
      <span className="flex items-center gap-3">
        <span className="icon-tile" aria-hidden="true">
          <Icon aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-[1.0625rem] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        </span>
      </span>
      <ChevronDown
        aria-hidden="true"
        focusable="false"
        size={19}
        strokeWidth={1.8}
        className="shrink-0 text-muted transition group-open:rotate-180"
      />
    </summary>
  )
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}
