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
    <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
      <div>
        <div className="mb-4 flex items-center gap-3 font-bold text-emerald-900">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-900 text-lg text-white shadow-sm">
            و
          </span>
          <span>ورد</span>
        </div>
        <p className="text-stone-600">
          السلام عليكم{displayName?.trim() ? `، ${displayName.trim()}` : ''}
        </p>
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
        <div className="[&_button]:min-h-[2.75rem] [&_button]:bg-white [&_button]:py-2 [&_button]:text-stone-700 [&_button]:ring-1 [&_button]:ring-stone-200 [&_button]:shadow-sm">
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

export function CompletedKhatmaState({
  data,
}: {
  data: CompletedKhatmaDashboardModel
}) {
  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <StateHeader displayName={data.profile.displayName} />
        <section className="overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-white shadow-[0_16px_50px_rgba(28,25,23,0.07)]">
          <div className="bg-emerald-950 px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="text-sm font-semibold text-emerald-200">بارك الله في سعيك</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              تمت الختمة بحمد الله
            </h1>
            <p className="mt-4 max-w-2xl leading-8 text-emerald-50/90">
              تقبّل الله قراءتك، وجعل القرآن نورًا لقلبك. لن تبدأ دورة جديدة إلا
              عندما تختار ذلك صراحة.
            </p>
            <p className="mt-3 font-semibold text-emerald-100">
              أتممتِ الختمة، تقبّل الله منكِ 🌿
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">تاريخ الإكمال</dt>
                <dd className="mt-2 font-bold">{data.khatma.formattedCompletionDate}</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">رقم الختمة</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.cycleNumber)}
                </dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">صفحة البداية</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.startPage)}
                </dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">الصفحات المكتملة</dt>
                <dd className="mt-2 font-bold">
                  {formatArabicNumber(data.khatma.completedPages)} صفحة
                </dd>
              </div>
            </dl>

            <div className="mt-8 border-t border-stone-100 pt-6">
              <a
                href={`/app/history/khatmas/${data.khatma.id}`}
                className="mb-3 inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl border border-emerald-800 px-6 py-3 font-bold text-emerald-900 sm:mb-0 sm:ml-3 sm:w-auto"
              >
                عرض تفاصيل الختمة
              </a>
              <a
                href="/app/khatma/new"
                className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl bg-emerald-800 px-6 py-3 font-bold text-white transition hover:bg-emerald-900 sm:w-auto"
              >
                ابدأ ختمة جديدة
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export function FuturePlanState({ data }: { data: FuturePlanDashboardModel }) {
  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <StateHeader displayName={data.profile.displayName} />
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-900/10 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-800">
            و
          </div>
          <p className="mt-5 text-sm font-semibold text-emerald-800">ختمتك الجديدة جاهزة</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            الخطة ستبدأ في {data.plan.formattedEffectiveDate}
          </h1>
          <p className="mx-auto mt-4 max-w-lg leading-8 text-stone-600">
            سنجهّز أول ورد عند حلول تاريخ البداية. لن يُنشأ أي تكليف يومي قبل
            ذلك الموعد.
          </p>
          <dl className="mx-auto mt-7 grid max-w-lg gap-3 text-right sm:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">الهدف اليومي</dt>
              <dd className="mt-1 font-bold">
                {formatArabicNumber(data.plan.dailyPageTarget)} صفحات
              </dd>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">الجلسات اليومية</dt>
              <dd className="mt-1 font-bold">
                {formatArabicNumber(data.plan.sessionsPerDay)} جلسات
              </dd>
            </div>
          </dl>
          <div className="mx-auto mt-6 max-w-lg">
            <CompletionEstimateCard
              currentUnreadPage={data.plan.currentUnreadPage}
              pagesPerDay={data.plan.dailyPageTarget}
              timezone={data.plan.timezone}
              effectiveFrom={data.plan.effectiveFrom}
              variant="active-plan"
              compact
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export function NoActivePlan({ displayName }: { displayName: string | null }) {
  return (
    <div className="min-h-screen bg-[#f5f3ed] px-4 py-10 text-stone-900">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">السلام عليكم{displayName ? `، ${displayName}` : ''}</p>
            <h1 className="mt-2 text-3xl font-bold">ورد</h1>
          </div>
          <div className="flex w-44 flex-col gap-3">
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
            <div className="[&_button]:bg-white [&_button]:text-stone-700 [&_button]:ring-1 [&_button]:ring-stone-200">
              <LogoutButton />
            </div>
          </div>
        </header>
        <section className="rounded-[2rem] border border-emerald-900/10 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">
            و
          </div>
          <h2 className="mt-5 text-2xl font-bold">أنشئ خطة وردك</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">
            حدّد صفحة البداية وعدد الصفحات والجلسات، وسيجهّز ورد لك جدول قراءة هادئًا ومنظّمًا.
          </p>
          <a
            href="/app/plan/new"
            className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-emerald-800 px-6 py-3 font-bold text-white hover:bg-emerald-900"
          >
            أنشئ خطة وردك
          </a>
        </section>
      </div>
    </div>
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
    <div className="min-h-screen bg-[#f5f3ed] px-4 py-10 text-stone-900">
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-stone-500">السلام عليكم{displayName ? `، ${displayName}` : ''}</p>
        <section
          className="mt-6 rounded-[2rem] border border-rose-200 bg-white p-7 text-center shadow-sm"
          role="alert"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 font-bold text-rose-700">
            !
          </div>
          <h1 className="mt-4 text-xl font-bold">تعذّر عرض لوحة الورد</h1>
          <p className="mt-3 leading-7 text-stone-600">{message}</p>
          <a
            href="/app"
            className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-stone-900 px-6 py-3 font-bold text-white"
          >
            إعادة المحاولة
          </a>
        </section>
      </div>
    </div>
  )
}
