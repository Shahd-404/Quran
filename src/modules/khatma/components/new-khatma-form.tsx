'use client'

import React, { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { PreviousPlanConfiguration } from '../server/types'

function formatScheduleTime(value: string): string {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value

  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)))
}

export function NewKhatmaForm({
  configuration,
  initialEffectiveFrom,
}: {
  configuration: PreviousPlanConfiguration
  initialEffectiveFrom: string
}) {
  const router = useRouter()
  const [effectiveFrom, setEffectiveFrom] = useState(initialEffectiveFrom)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/khatma/start-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effectiveFrom }),
      })
      const payload: unknown = await response.json()
      if (
        !response.ok ||
        typeof payload !== 'object' ||
        payload === null ||
        (payload as Record<string, unknown>).success !== true
      ) {
        const safeMessage =
          typeof payload === 'object' &&
          payload !== null &&
          typeof (payload as Record<string, unknown>).message === 'string'
            ? String((payload as Record<string, unknown>).message)
            : 'تعذّر بدء الختمة الجديدة الآن. حاول مرة أخرى بعد قليل.'
        setError(safeMessage)
        return
      }

      router.push('/app')
      router.refresh()
    } catch {
      setError('تعذّر بدء الختمة الجديدة الآن. تحقق من اتصالك وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-800">إعدادات خطتك السابقة</p>
        <h2 className="mt-2 text-2xl font-bold">الخطة التي أكملت بها ختمتك</h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-stone-50 p-4">
            <dt className="text-sm text-stone-500">الصفحات اليومية</dt>
            <dd className="mt-2 font-bold">
              {formatArabicNumber(configuration.dailyPages)} صفحات
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <dt className="text-sm text-stone-500">الجلسات اليومية</dt>
            <dd className="mt-2 font-bold">
              {formatArabicNumber(configuration.sessionsPerDay)} جلسات
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <dt className="text-sm text-stone-500">المنطقة الزمنية</dt>
            <dd className="mt-2 break-words font-bold" dir="ltr">
              {configuration.timezone}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <h3 className="font-bold">مواعيد الجلسات</h3>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {configuration.schedules.map((schedule) => (
              <li
                key={schedule.sessionOrder}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 px-4 py-3"
              >
                <span className="text-stone-600">
                  الجلسة {formatArabicNumber(schedule.sessionOrder)}
                </span>
                <span className="font-bold">
                  {formatScheduleTime(schedule.scheduledTime)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {!confirming ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setConfirming(true)
            }}
            className="min-h-[3.5rem] rounded-2xl bg-emerald-800 px-6 py-4 text-base font-bold text-white transition hover:bg-emerald-900"
          >
            ابدأ بنفس الخطة
          </button>
          <a
            href="/app/plan/new"
            className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-4 text-center font-bold text-stone-800 transition hover:bg-stone-50"
          >
            إنشاء خطة مختلفة
          </a>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8"
        >
          <h2 className="text-xl font-bold">
            هل تريد بدء ختمة جديدة من الصفحة الأولى بنفس إعدادات خطتك السابقة؟
          </h2>
          <p className="mt-3 leading-7 text-stone-600">
            ستبقى الختمة السابقة وسجل إنجازها كما هما، وستبدأ دورة جديدة مستقلة.
          </p>

          <label className="mt-6 block max-w-sm font-semibold" htmlFor="effective-from">
            تاريخ بدء الخطة
          </label>
          <input
            id="effective-from"
            name="effectiveFrom"
            type="date"
            required
            min={initialEffectiveFrom}
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="mt-2 min-h-[3rem] w-full max-w-sm rounded-xl border border-stone-300 bg-white px-4 py-2 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          />

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-3 text-rose-800"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[3rem] rounded-2xl bg-emerald-800 px-6 py-3 font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'جارٍ بدء الختمة…' : 'نعم، ابدأ الختمة'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null)
                setConfirming(false)
              }}
              className="min-h-[3rem] rounded-2xl border border-stone-300 bg-white px-6 py-3 font-bold text-stone-800 disabled:opacity-60"
            >
              العودة
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
