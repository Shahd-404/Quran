'use client'

import React, { FormEvent, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { distributePages } from '@/modules/reading-plan/engine/distribute-pages'
import { SessionRange } from '@/modules/reading-plan/engine/types'
import { defaultSessionTimes } from '@/modules/reading-plan/onboarding/labels'
import {
  validateDailyPages,
  validateSessionTimes,
  validateSessionsCount,
} from '@/modules/reading-plan/onboarding/schema'
import { PlanSettingsModel } from '../server/types'

type FormValues = {
  dailyPages: number
  sessionsCount: number
  sessionTimes: string[]
}

type FormErrors = Partial<
  Record<'dailyPages' | 'sessionsCount' | 'sessionTimes' | 'general', string>
>

function buildExtendedTimes(
  currentTimes: string[],
  nextCount: number,
): string[] {
  const nextTimes = currentTimes.slice(0, nextCount)
  while (nextTimes.length < nextCount) {
    const previous = nextTimes[nextTimes.length - 1] ?? null
    const candidate = defaultSessionTimes.find(
      (time) =>
        !nextTimes.includes(time) &&
        (previous === null || time > previous),
    )
    nextTimes.push(candidate ?? '')
  }
  return nextTimes
}

function SettingsSummary({
  title,
  dailyPages,
  sessionsCount,
  sessionTimes,
}: {
  title: string
  dailyPages: number
  sessionsCount: number
  sessionTimes: string[]
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-lg font-bold">{title}</h3>
      <dl className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-500">الصفحات اليومية</dt>
          <dd className="font-bold">{formatArabicNumber(dailyPages)} صفحات</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-500">عدد الجلسات</dt>
          <dd className="font-bold">{formatArabicNumber(sessionsCount)} جلسات</dd>
        </div>
        <div>
          <dt className="text-stone-500">مواعيد الجلسات</dt>
          <dd className="mt-2 space-y-2">
            {sessionTimes.map((time, index) => (
              <div
                key={`${index}-${time}`}
                className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
              >
                <span>الجلسة {formatArabicNumber(index + 1)}</span>
                <span className="font-bold" dir="ltr">
                  {time}
                </span>
              </div>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function DistributionSummary({ sessions }: { sessions: SessionRange[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sessions.map((session) => (
        <div
          key={session.sessionOrder}
          className="rounded-2xl border border-emerald-100 bg-white p-4"
        >
          <p className="font-bold">
            الجلسة {formatArabicNumber(session.sessionOrder)}
          </p>
          <p className="mt-1 text-stone-600">
            الصفحات {formatArabicNumber(session.startPage)}–
            {formatArabicNumber(session.endPage)}
            {' · '}
            {formatArabicNumber(session.pageCount)} صفحة
          </p>
        </div>
      ))}
    </div>
  )
}

export function PlanSettingsForm({ current }: { current: PlanSettingsModel }) {
  const router = useRouter()
  const errorRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<'edit' | 'review'>('edit')
  const [values, setValues] = useState<FormValues>({
    dailyPages: current.dailyPages,
    sessionsCount: current.sessionsPerDay,
    sessionTimes: current.schedules.map((schedule) => schedule.scheduledTime),
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const distribution = useMemo(() => {
    try {
      return distributePages({
        currentPage: current.currentUnreadPage,
        dailyPages: values.dailyPages,
        sessionsCount: values.sessionsCount,
      }).sessions
    } catch {
      return []
    }
  }, [
    current.currentUnreadPage,
    values.dailyPages,
    values.sessionsCount,
  ])

  function validate(): boolean {
    const dailyPagesResult = validateDailyPages(values.dailyPages)
    if (dailyPagesResult.error) {
      setErrors({ dailyPages: dailyPagesResult.error })
      return false
    }
    const sessionsResult = validateSessionsCount(
      values.sessionsCount,
      values.dailyPages,
    )
    if (sessionsResult.error) {
      setErrors({ sessionsCount: sessionsResult.error })
      return false
    }
    const scheduleResult = validateSessionTimes(values.sessionTimes)
    if (scheduleResult.error) {
      setErrors({ sessionTimes: scheduleResult.error })
      return false
    }
    setErrors({})
    return true
  }

  function showReview() {
    if (!validate()) return
    setStep('review')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !validate()) return

    setSubmitting(true)
    setErrors({})
    try {
      const response = await fetch('/api/reading-plan/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyPages: values.dailyPages,
          sessions: values.sessionTimes.map((scheduledTime, index) => ({
            sessionOrder: index + 1,
            scheduledTime,
          })),
        }),
      })
      const payload: unknown = await response.json()
      if (
        !response.ok ||
        typeof payload !== 'object' ||
        payload === null ||
        (payload as Record<string, unknown>).success !== true
      ) {
        const message =
          typeof payload === 'object' &&
          payload !== null &&
          typeof (payload as Record<string, unknown>).message === 'string'
            ? String((payload as Record<string, unknown>).message)
            : 'تعذّر حفظ تعديلات الخطة الآن. حاول مرة أخرى بعد قليل.'
        setErrors({ general: message })
        requestAnimationFrame(() => errorRef.current?.focus())
        return
      }

      router.push('/app?planUpdated=1')
      router.refresh()
    } catch {
      setErrors({
        general:
          'تعذّر حفظ تعديلات الخطة الآن. تحقق من اتصالك وحاول مرة أخرى.',
      })
      requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 'edit' ? (
        <>
          <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-emerald-800">
              الإعدادات الحالية ظاهرة ويمكن تعديلها
            </p>
            <h2 className="mt-2 text-2xl font-bold">إعدادات الورد القادم</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block font-semibold" htmlFor="daily-pages">
                عدد صفحات الورد اليومية
                <input
                  id="daily-pages"
                  type="number"
                  min={1}
                  max={604}
                  value={values.dailyPages}
                  onChange={(event) => {
                    setValues((previous) => ({
                      ...previous,
                      dailyPages: Number(event.target.value),
                    }))
                    setErrors({})
                  }}
                  className="mt-2 min-h-[3rem] w-full rounded-xl border border-stone-300 px-4 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  aria-invalid={Boolean(errors.dailyPages)}
                />
              </label>

              <label className="block font-semibold" htmlFor="sessions-count">
                عدد الجلسات اليومية
                <input
                  id="sessions-count"
                  type="number"
                  min={1}
                  max={6}
                  value={values.sessionsCount}
                  onChange={(event) => {
                    const sessionsCount = Number(event.target.value)
                    setValues((previous) => ({
                      ...previous,
                      sessionsCount,
                      sessionTimes: buildExtendedTimes(
                        previous.sessionTimes,
                        sessionsCount,
                      ),
                    }))
                    setErrors({})
                  }}
                  className="mt-2 min-h-[3rem] w-full rounded-xl border border-stone-300 px-4 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  aria-invalid={Boolean(errors.sessionsCount)}
                />
              </label>
            </div>

            {errors.dailyPages || errors.sessionsCount ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {errors.dailyPages ?? errors.sessionsCount}
              </p>
            ) : null}

            <fieldset className="mt-7">
              <legend className="font-bold">مواعيد الجلسات</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {values.sessionTimes.map((time, index) => (
                  <label
                    className="block text-sm font-semibold"
                    key={index}
                    htmlFor={`session-time-${index}`}
                  >
                    وقت الجلسة {formatArabicNumber(index + 1)}
                    <input
                      id={`session-time-${index}`}
                      type="time"
                      value={time}
                      onChange={(event) => {
                        const nextTimes = [...values.sessionTimes]
                        nextTimes[index] = event.target.value
                        setValues((previous) => ({
                          ...previous,
                          sessionTimes: nextTimes,
                        }))
                        setErrors({})
                      }}
                      className="mt-2 min-h-[3rem] w-full rounded-xl border border-stone-300 px-4 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                      aria-invalid={Boolean(errors.sessionTimes)}
                    />
                  </label>
                ))}
              </div>
              {errors.sessionTimes ? (
                <p className="mt-3 text-sm text-rose-700" role="alert">
                  {errors.sessionTimes}
                </p>
              ) : null}
            </fieldset>
          </section>

          <section
            className="rounded-[2rem] border border-emerald-900/10 bg-emerald-50/60 p-6 sm:p-8"
            aria-labelledby="distribution-preview-title"
          >
            <p className="text-sm font-semibold text-emerald-800">معاينة</p>
            <h2
              id="distribution-preview-title"
              className="mt-2 text-xl font-bold"
            >
              توزيع صفحات أول ورد جديد
            </h2>
            <p className="mt-2 text-stone-600">
              تبدأ المعاينة من الصفحة{' '}
              {formatArabicNumber(current.currentUnreadPage)}، ولا تغيّر تقدمك
              الحالي.
            </p>
            <div className="mt-5">
              <DistributionSummary sessions={distribution} />
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={showReview}
              className="min-h-[3rem] rounded-2xl bg-emerald-800 px-6 py-3 font-bold text-white hover:bg-emerald-900"
            >
              مراجعة التعديلات
            </button>
            <a
              href="/app"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 font-bold text-stone-800"
            >
              إلغاء والعودة
            </a>
          </div>
        </>
      ) : (
        <>
          <section className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 sm:p-8">
            <p className="text-sm font-semibold text-emerald-800">المراجعة النهائية</p>
            <h2 className="mt-2 text-2xl font-bold">الإعدادات القديمة والجديدة</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <SettingsSummary
                title="الإعدادات الحالية"
                dailyPages={current.dailyPages}
                sessionsCount={current.sessionsPerDay}
                sessionTimes={current.schedules.map(
                  (schedule) => schedule.scheduledTime,
                )}
              />
              <SettingsSummary
                title="الإعدادات الجديدة"
                dailyPages={values.dailyPages}
                sessionsCount={values.sessionsCount}
                sessionTimes={values.sessionTimes}
              />
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
              <h3 className="text-lg font-bold">التوزيع المتوقع للورد القادم</h3>
              <div className="mt-4">
                <DistributionSummary sessions={distribution} />
              </div>
            </div>
          </section>

          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold leading-7 text-amber-950">
            سيتم تطبيق التعديلات على الورد القادم، ولن يتغير الورد الحالي.
          </p>

          {errors.general ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800 focus:outline-none"
            >
              {errors.general}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[3rem] rounded-2xl bg-emerald-800 px-6 py-3 font-bold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? 'جارٍ حفظ التعديلات…'
                : 'حفظ تعديلات الخطة'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setErrors({})
                setStep('edit')
              }}
              className="min-h-[3rem] rounded-2xl border border-stone-300 bg-white px-6 py-3 font-bold text-stone-800 disabled:opacity-60"
            >
              العودة للتعديل
            </button>
            <a
              href="/app"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl px-6 py-3 font-bold text-stone-600"
            >
              إلغاء والعودة
            </a>
          </div>
        </>
      )}
    </form>
  )
}
