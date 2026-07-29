import React from 'react'
import LogoutButton from '@/components/logout-button'
import {
  CompletedKhatmaDashboardModel,
  FuturePlanDashboardModel,
} from '../types'
import { formatArabicNumber } from '../formatting'
import { CompletionEstimateCard } from '@/modules/reading-plan/components/completion-estimate-card'

function StateHeader({ displayName }: { displayName: string | null }) {
  return (
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="eyebrow">لوحة الورد</p>
        <p className="mt-1 text-lg font-bold text-ink">
          السلام عليكم{displayName?.trim() ? `، ${displayName.trim()}` : ''}
        </p>
      </div>
      <nav className="flex w-full flex-wrap gap-2 sm:w-auto" aria-label="إجراءات الحساب">
        <a
          href="/app/history"
          className="btn-secondary min-h-[2.75rem] flex-1 px-4 py-2 sm:flex-none"
        >
          سجل القراءة
        </a>
        <a
          href="/app/settings/privacy"
          className="btn-secondary min-h-[2.75rem] flex-1 px-4 py-2 sm:flex-none"
        >
          الخصوصية والبيانات
        </a>
        <div className="min-w-[8.5rem] flex-1 sm:flex-none [&_button]:min-h-[2.75rem] [&_button]:py-2">
          <LogoutButton />
        </div>
      </nav>
    </header>
  )
}

export function CompletedKhatmaState({
  data,
}: {
  data: CompletedKhatmaDashboardModel
}) {
  return (
    <main className="page-shell">
      <div className="page-container">
        <StateHeader displayName={data.profile.displayName} />
        <section className="surface-card overflow-hidden">
          <div className="bg-hero px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="text-sm font-semibold text-hero-muted">بارك الله في سعيك</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              تمت الختمة بحمد الله
            </h1>
            <p className="mt-4 max-w-2xl leading-8 text-white/80">
              تقبّل الله قراءتك، وجعل القرآن نورًا لقلبك. لن تبدأ دورة جديدة إلا
              عندما تختار ذلك صراحة.
            </p>
            <p className="mt-3 font-semibold text-hero-muted">
              أتممتِ الختمة، تقبّل الله منكِ 🌿
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">تاريخ الإكمال</dt>
                <dd className="mt-2 font-bold">{data.khatma.formattedCompletionDate}</dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">رقم الختمة</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.cycleNumber)}
                </dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">صفحة البداية</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.startPage)}
                </dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">الصفحات المكتملة</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.completedPages)} صفحة
                </dd>
              </div>
            </dl>

            <div className="mt-8 border-t border-line/70 pt-6">
              <a
                href={`/app/history/khatmas/${data.khatma.id}`}
                className="btn-secondary mb-3 w-full sm:mb-0 sm:ml-3 sm:w-auto"
              >
                عرض تفاصيل الختمة
              </a>
              <a
                href="/app/khatma/new"
                className="btn-primary w-full sm:w-auto"
              >
                ابدأ ختمة جديدة
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export function FuturePlanState({ data }: { data: FuturePlanDashboardModel }) {
  return (
    <main className="page-shell">
      <div className="page-container">
        <StateHeader displayName={data.profile.displayName} />
        <section className="surface-card mx-auto max-w-2xl p-7 text-center sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-2xl text-warning">
            و
          </div>
          <p className="eyebrow mt-5">ختمتك الجديدة جاهزة</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            الخطة ستبدأ في {data.plan.formattedEffectiveDate}
          </h1>
          <p className="mx-auto mt-4 max-w-lg leading-8 text-muted">
            سنجهّز أول ورد عند حلول تاريخ البداية. لن يُنشأ أي تكليف يومي قبل
            ذلك الموعد.
          </p>
          <dl className="mx-auto mt-7 grid max-w-lg gap-3 text-right sm:grid-cols-2">
            <div className="surface-muted p-4">
              <dt className="text-sm text-muted">الهدف اليومي</dt>
              <dd className="mt-1 font-bold">
                {formatArabicNumber(data.plan.dailyPageTarget)} صفحات
              </dd>
            </div>
            <div className="surface-muted p-4">
              <dt className="text-sm text-muted">الجلسات اليومية</dt>
              <dd className="mt-1 font-bold">
                {formatArabicNumber(data.plan.sessionsPerDay)} جلسات
              </dd>
            </div>
          </dl>
          <div className="mx-auto mt-6 max-w-lg">
            <CompletionEstimateCard
              currentUnreadPage={data.plan.currentUnreadPage}
              pagesPerDay={data.plan.dailyPageTarget}
              sessionsPerDay={data.plan.sessionsPerDay}
              timezone={data.plan.timezone}
              effectiveFrom={data.plan.effectiveFrom}
              variant="active-plan"
              compact
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export function NoActivePlan({ displayName }: { displayName: string | null }) {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-xl">
        <header className="mb-8">
          <div>
            <p className="eyebrow">السلام عليكم{displayName ? `، ${displayName}` : ''}</p>
            <h1 className="page-title">ابدأ رحلتك مع ورد</h1>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="/app/history"
              className="btn-secondary min-h-[2.75rem] flex-1 py-2"
            >
              سجل القراءة
            </a>
            <a
              href="/app/settings/privacy"
              className="btn-secondary min-h-[2.75rem] flex-1 py-2"
            >
              الخصوصية والبيانات
            </a>
            <div className="w-full [&_button]:min-h-[2.75rem] [&_button]:py-2">
              <LogoutButton />
            </div>
          </div>
        </header>
        <section className="surface-card p-7 text-center sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-2xl text-primary-muted">
            و
          </div>
          <h2 className="mt-5 text-2xl font-bold">أنشئ خطة وردك</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
            حدّد صفحة البداية وعدد الصفحات والجلسات، وسيجهّز ورد لك جدول قراءة هادئًا ومنظّمًا.
          </p>
          <a
            href="/app/plan/new"
            className="btn-primary mt-6"
          >
            أنشئ خطة وردك
          </a>
        </section>
      </div>
    </main>
  )
}

export function DashboardError({
  displayName,
  message,
}: {
  displayName: string | null
  message: string
}) {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-muted">السلام عليكم{displayName ? `، ${displayName}` : ''}</p>
        <section
          className="surface-card mt-6 border-danger/30 p-7 text-center"
          role="alert"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft font-bold text-danger">
            !
          </div>
          <h1 className="mt-4 text-xl font-bold">تعذّر عرض لوحة الورد</h1>
          <p className="mt-3 leading-7 text-muted">{message}</p>
          <a
            href="/app"
            className="btn-primary mt-6"
          >
            إعادة المحاولة
          </a>
        </section>
      </div>
    </main>
  )
}
