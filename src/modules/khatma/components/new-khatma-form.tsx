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
      <section className="surface-card p-6 sm:p-8">
        <p className="eyebrow">إعدادات خطتك السابقة</p>
        <h2 className="mt-2 text-2xl font-bold">الخطة التي أكملت بها ختمتك</h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="surface-muted p-4">
            <dt className="text-sm text-muted">الصفحات اليومية</dt>
            <dd className="mt-2 font-bold">
              {formatArabicNumber(configuration.dailyPages)} صفحات
            </dd>
          </div>
          <div className="surface-muted p-4">
            <dt className="text-sm text-muted">الجلسات اليومية</dt>
            <dd className="mt-2 font-bold">
              {formatArabicNumber(configuration.sessionsPerDay)} جلسات
            </dd>
          </div>
          <div className="surface-muted p-4">
            <dt className="text-sm text-muted">المنطقة الزمنية</dt>
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
                className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3"
              >
                <span className="text-muted">
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
            className="btn-primary min-h-[3.5rem] py-4"
          >
            ابدأ بنفس الخطة
          </button>
          <a
            href="/app/plan/new"
            className="btn-secondary min-h-[3.5rem] py-4"
          >
            إنشاء خطة مختلفة
          </a>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-primary/25 bg-primary-soft p-6 sm:p-8"
        >
          <h2 className="text-xl font-bold">
            هل تريد بدء ختمة جديدة من الصفحة الأولى بنفس إعدادات خطتك السابقة؟
          </h2>
          <p className="mt-3 leading-7 text-muted">
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
            className="field-control max-w-sm"
          />

          {error ? (
            <p
              role="alert"
              className="status-danger mt-4"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
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
              className="btn-secondary"
            >
              العودة
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
