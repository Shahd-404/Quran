'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { distributePages } from '@/modules/reading-plan/engine/distribute-pages'
import { buttonLabels, defaultDailyPageChoices, defaultSessionTimes, stepTitles } from './labels'
import { formatEstimateDays, getLocalEffectiveDate, validateDailyPages, validateSessionTimes, validateSessionsCount, validateStartPage } from './schema'

const initialValues = {
  startPage: 1,
  dailyPages: 1,
  sessionsCount: 1,
  sessionTimes: ['08:00'],
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Cairo',
  effectiveFrom: getLocalEffectiveDate(),
}

type Errors = Partial<Record<'startPage' | 'dailyPages' | 'sessionsCount' | 'sessionTimes' | 'general', string>>

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const distribution = useMemo(() => {
    try {
      const result = distributePages({ currentPage: values.startPage, dailyPages: values.dailyPages, sessionsCount: values.sessionsCount })
      return result?.sessions ?? []
    } catch {
      return []
    }
  }, [values.startPage, values.dailyPages, values.sessionsCount])

  const handleField = <T extends string | number>(field: keyof typeof values, value: T) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined, general: undefined }))
  }

  const handleSessionTime = (index: number, value: string) => {
    setValues(prev => {
      const next = [...prev.sessionTimes]
      next[index] = value
      return { ...prev, sessionTimes: next }
    })
    setErrors(prev => ({ ...prev, sessionTimes: undefined, general: undefined }))
  }

  const validateStep = async () => {
    if (step === 1) {
      const result = validateStartPage(values.startPage)
      if (result.error) return setErrors({ startPage: result.error })
      setErrors({})
      return true
    }
    if (step === 2) {
      const result = validateDailyPages(values.dailyPages)
      if (result.error) return setErrors({ dailyPages: result.error })
      setErrors({})
      return true
    }
    if (step === 3) {
      const result = validateSessionsCount(values.sessionsCount, values.dailyPages)
      if (result.error) return setErrors({ sessionsCount: result.error })
      setErrors({})
      return true
    }
    if (step === 4) {
      const result = validateSessionTimes(values.sessionTimes)
      if (result.error) return setErrors({ sessionTimes: result.error })
      setErrors({})
      return true
    }
    return true
  }

  const handleNext = async () => {
    const ok = await validateStep()
    if (!ok) return
    setStep(prev => Math.min(5, prev + 1))
  }

  const handleBack = () => {
    setErrors({})
    setServerMessage(null)
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setServerMessage(null)
    const result = validateSessionTimes(values.sessionTimes)
    if (result.error) {
      setErrors({ sessionTimes: result.error })
      setStep(4)
      return
    }
    setSubmitting(true)
    try {
      const requestBody = {
        startPage: values.startPage,
        dailyPages: values.dailyPages,
        sessions: values.sessionTimes.map((scheduledTime, index) => ({ sessionOrder: index + 1, scheduledTime })),
        timezone: values.timezone,
        effectiveFrom: values.effectiveFrom,
      }
      const response = await fetch('/api/reading-plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'ACTIVE_PLAN_EXISTS') {
          return router.push('/app')
        }
        setServerMessage(data.message || 'حدث خطأ. حاول مرة أخرى.')
        requestAnimationFrame(() => errorSummaryRef.current?.focus())
        return
      }

      router.push('/app')
    } catch (error) {
      console.error('[OnboardingForm] Fetch error:', error)
      setServerMessage('حدث خطأ أثناء إنشاء الخطة.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <fieldset>
            <legend className="text-lg font-semibold mb-4">اختر من أين تبدأ</legend>
            <label className="block mb-4">
              <span className="text-sm font-medium">الصفحة الابتدائية</span>
              <input
                type="number"
                min={1}
                max={604}
                value={values.startPage}
                onChange={e => handleField('startPage', Number(e.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                aria-invalid={!!errors.startPage}
                aria-describedby={errors.startPage ? 'start-page-error' : undefined}
              />
            </label>
            {errors.startPage && <p id="start-page-error" className="text-red-600 text-sm">{errors.startPage}</p>}
          </fieldset>
        )
      case 2:
        return (
          <fieldset>
            <legend className="text-lg font-semibold mb-4">الصفحات اليومية</legend>
            <label className="block mb-4">
              <span className="text-sm font-medium">عدد الصفحات اليومية</span>
              <input
                type="number"
                min={1}
                max={604}
                value={values.dailyPages}
                onChange={e => handleField('dailyPages', Number(e.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                aria-invalid={!!errors.dailyPages}
                aria-describedby={errors.dailyPages ? 'daily-pages-error' : undefined}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {defaultDailyPageChoices.map(choice => (
                <button
                  type="button"
                  key={choice}
                  onClick={() => handleField('dailyPages', choice)}
                  className={`rounded-2xl border px-3 py-2 text-sm ${values.dailyPages === choice ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white'}`}>
                  {choice} صفحة
                </button>
              ))}
            </div>
            {errors.dailyPages && <p id="daily-pages-error" className="text-red-600 text-sm mt-3">{errors.dailyPages}</p>}
            <p className="mt-4 text-slate-600">{formatEstimateDays(values.startPage, values.dailyPages)}</p>
          </fieldset>
        )
      case 3:
        return (
          <fieldset>
            <legend className="text-lg font-semibold mb-4">عدد الجلسات اليومية</legend>
            <label className="block mb-4">
              <span className="text-sm font-medium">عدد الجلسات</span>
              <input
                type="number"
                min={1}
                max={6}
                value={values.sessionsCount}
                onChange={e => {
                  const nextCount = Number(e.target.value)
                  const nextTimes = [...values.sessionTimes]
                  while (nextTimes.length < nextCount) nextTimes.push(defaultSessionTimes[nextTimes.length] || '08:00')
                  if (nextTimes.length > nextCount) nextTimes.splice(nextCount)
                  setValues(prev => ({ ...prev, sessionsCount: nextCount, sessionTimes: nextTimes }))
                  setErrors({})
                }}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                aria-invalid={!!errors.sessionsCount}
                aria-describedby={errors.sessionsCount ? 'sessions-count-error' : undefined}
              />
            </label>
            {errors.sessionsCount && <p id="sessions-count-error" className="text-red-600 text-sm">{errors.sessionsCount}</p>}
                    <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium">توزيع الصفحات لكل جلسة</p>
              <div className="space-y-2">
                {distribution.map((session, index) => (
                  <div key={index} className="rounded-2xl bg-white p-3 border border-slate-200">
                    <p className="text-sm font-semibold">الجلسة {index + 1}</p>
                    <p className="text-sm text-slate-600">{session.pageCount} صفحة</p>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
        )
      case 4:
        return (
          <fieldset>
            <legend className="text-lg font-semibold mb-4">أوقات الجلسات</legend>
            <div className="space-y-4">
              {Array.from({ length: values.sessionsCount }, (_, index) => (
                <label key={index} className="block">
                  <span className="text-sm font-medium">وقت الجلسة {index + 1}</span>
                  <input
                    type="time"
                    value={values.sessionTimes[index] ?? ''}
                    onChange={e => handleSessionTime(index, e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                    aria-invalid={!!errors.sessionTimes}
                    aria-describedby={errors.sessionTimes ? 'session-times-error' : undefined}
                  />
                </label>
              ))}
            </div>
            {errors.sessionTimes && <p id="session-times-error" className="text-red-600 text-sm mt-3">{errors.sessionTimes}</p>}
            <p className="mt-4 text-slate-600">يجب أن تكون الأوقات مختلفة ومتزايدة زمنياً.</p>
          </fieldset>
        )
      case 5:
        return (
          <div>
            <h2 className="text-lg font-semibold mb-4">مراجعة الخطة</h2>
            <dl className="space-y-4 text-slate-700">
              <div>
                <dt className="font-medium">الصفحة الابتدائية</dt>
                <dd>{values.startPage}</dd>
              </div>
              <div>
                <dt className="font-medium">الصفحات اليومية</dt>
                <dd>{values.dailyPages}</dd>
              </div>
              <div>
                <dt className="font-medium">عدد الجلسات</dt>
                <dd>{values.sessionsCount}</dd>
              </div>
              <div>
                <dt className="font-medium">أوقات الجلسات</dt>
                <dd className="space-y-1">
                  {values.sessionTimes.map((time, index) => (
                    <div key={index}>{`الجلسة ${index + 1}: ${time}`}</div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-medium">التوزيع</dt>
                <dd className="space-y-1">
                  {distribution.map((session, index) => (
                    <div key={index}>{`الجلسة ${index + 1}: ${session.pageCount} صفحة`}</div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-medium">المنطقة الزمنية</dt>
                <dd>{values.timezone}</dd>
              </div>
              <div>
                <dt className="font-medium">تاريخ النفاذ</dt>
                <dd>{values.effectiveFrom}</dd>
              </div>
            </dl>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6 text-center">
        <p className="text-sm text-slate-500">خطوة {step} من 5</p>
        <h1 className="text-2xl font-semibold mt-2">أنشئ خطة وردك</h1>
        <p className="text-slate-600 mt-1">إعداد خطة قراءة القرآن اليومية الخاصة بك.</p>
      </div>

      <div className="mb-6 rounded-2xl bg-slate-50 p-4">
        <p className="font-medium">{stepTitles[step - 1]}</p>
      </div>

      {renderStep()}

      {serverMessage && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700 focus:outline-none">
          {serverMessage}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={handleBack} disabled={step === 1 || submitting} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:opacity-50">
          {buttonLabels.back}
        </button>
        {step < 5 ? (
          <button type="button" onClick={handleNext} disabled={submitting} className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-50">
            {buttonLabels.next}
          </button>
        ) : (
          <button type="submit" disabled={submitting} className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-50">
            {submitting ? 'جارٍ الإنشاء...' : buttonLabels.create}
          </button>
        )}
      </div>
    </form>
  )
}
