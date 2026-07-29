'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompletionEstimateCard } from '@/modules/reading-plan/components/completion-estimate-card'
import { distributePages } from '@/modules/reading-plan/engine/distribute-pages'
import { buttonLabels, defaultDailyPageChoices, defaultSessionTimes, stepTitles } from './labels'
import { getLocalEffectiveDate, validateDailyPages, validateSessionTimes, validateSessionsCount, validateStartPage } from './schema'

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
            <legend className="mb-4 text-lg font-semibold text-ink">اختر من أين تبدأ</legend>
            <label className="field-label mb-4">
              الصفحة الابتدائية
              <input
                type="number"
                min={1}
                max={604}
                value={values.startPage}
                onChange={e => handleField('startPage', Number(e.target.value))}
                className="field-control"
                aria-invalid={!!errors.startPage}
                aria-describedby={errors.startPage ? 'start-page-error' : undefined}
              />
            </label>
            {errors.startPage && <p id="start-page-error" className="status-danger text-sm">{errors.startPage}</p>}
          </fieldset>
        )
      case 2:
        return (
          <fieldset>
            <legend className="mb-4 text-lg font-semibold text-ink">الصفحات اليومية</legend>
            <label className="field-label mb-4">
              عدد الصفحات اليومية
              <input
                type="number"
                min={1}
                max={604}
                value={values.dailyPages}
                onChange={e => handleField('dailyPages', Number(e.target.value))}
                className="field-control"
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
                  className={`min-h-[2.75rem] rounded-2xl border px-3 py-2 text-sm font-semibold transition ${values.dailyPages === choice ? 'border-primary bg-primary-soft text-primary-muted' : 'border-line bg-surface text-muted hover:border-primary/40'}`}>
                  {choice} صفحة
                </button>
              ))}
            </div>
            {errors.dailyPages && <p id="daily-pages-error" className="status-danger mt-3 text-sm">{errors.dailyPages}</p>}
            <div className="mt-5">
              <CompletionEstimateCard
                currentUnreadPage={values.startPage}
                pagesPerDay={values.dailyPages}
                sessionsPerDay={values.sessionsCount}
                timezone={values.timezone}
                effectiveFrom={values.effectiveFrom}
                variant="new-plan"
                live
                compact
              />
            </div>
          </fieldset>
        )
      case 3:
        return (
          <fieldset>
            <legend className="mb-4 text-lg font-semibold text-ink">عدد الجلسات اليومية</legend>
            <label className="field-label mb-4">
              عدد الجلسات
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
                className="field-control"
                aria-invalid={!!errors.sessionsCount}
                aria-describedby={errors.sessionsCount ? 'sessions-count-error' : undefined}
              />
            </label>
            {errors.sessionsCount && <p id="sessions-count-error" className="status-danger text-sm">{errors.sessionsCount}</p>}
            <div className="surface-muted mt-4 space-y-3 p-4">
              <p className="text-xs font-medium text-ink">توزيع الصفحات لكل جلسة</p>
              <div className="space-y-2">
                {distribution.map((session, index) => (
                  <div key={index} className="rounded-2xl border border-line bg-surface p-3">
                    <p className="text-sm font-semibold text-ink">الجلسة {index + 1}</p>
                    <p className="text-sm text-muted">{session.pageCount} صفحة</p>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
        )
      case 4:
        return (
          <fieldset>
            <legend className="mb-4 text-lg font-semibold text-ink">أوقات الجلسات</legend>
            <div className="space-y-4">
              {Array.from({ length: values.sessionsCount }, (_, index) => (
                <label key={index} className="field-label">
                  وقت الجلسة {index + 1}
                  <input
                    type="time"
                    value={values.sessionTimes[index] ?? ''}
                    onChange={e => handleSessionTime(index, e.target.value)}
                    className="field-control"
                    aria-invalid={!!errors.sessionTimes}
                    aria-describedby={errors.sessionTimes ? 'session-times-error' : undefined}
                  />
                </label>
              ))}
            </div>
            {errors.sessionTimes && <p id="session-times-error" className="status-danger mt-3 text-sm">{errors.sessionTimes}</p>}
            <p className="mt-4 text-sm leading-7 text-muted">يجب أن تكون الأوقات مختلفة ومتزايدة زمنيًا.</p>
          </fieldset>
        )
      case 5:
        return (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-ink">مراجعة الخطة</h2>
            <dl className="grid gap-3 text-ink sm:grid-cols-2">
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">الصفحة الابتدائية</dt>
                <dd className="mt-1 font-semibold">{values.startPage}</dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">الصفحات اليومية</dt>
                <dd className="mt-1 font-semibold">{values.dailyPages}</dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">عدد الجلسات</dt>
                <dd className="mt-1 font-semibold">{values.sessionsCount}</dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">أوقات الجلسات</dt>
                <dd className="space-y-1">
                  {values.sessionTimes.map((time, index) => (
                    <div key={index}>{`الجلسة ${index + 1}: ${time}`}</div>
                  ))}
                </dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">التوزيع</dt>
                <dd className="space-y-1">
                  {distribution.map((session, index) => (
                    <div key={index}>{`الجلسة ${index + 1}: ${session.pageCount} صفحة`}</div>
                  ))}
                </dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">المنطقة الزمنية</dt>
                <dd className="mt-1 break-all font-semibold" dir="ltr">{values.timezone}</dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-sm text-muted">تاريخ النفاذ</dt>
                <dd className="mt-1 font-semibold">{values.effectiveFrom}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <CompletionEstimateCard
                currentUnreadPage={values.startPage}
                pagesPerDay={values.dailyPages}
                sessionsPerDay={values.sessionsCount}
                timezone={values.timezone}
                effectiveFrom={values.effectiveFrom}
                variant="new-plan"
                compact
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card mx-auto max-w-3xl p-5 sm:p-8">
      <div className="mb-6 text-center">
        <p className="eyebrow">خطوة {step} من 5</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">تفاصيل خطة وردك</h2>
        <p className="mt-1 text-muted">إعداد خطة قراءة القرآن اليومية الخاصة بك.</p>
      </div>

      <div className="mb-7">
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index + 1 <= step ? 'bg-primary' : 'bg-line'}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-muted">{stepTitles[step - 1]}</p>
      </div>

      {renderStep()}

      {serverMessage && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="status-danger mt-6 focus:outline-none">
          {serverMessage}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={handleBack} disabled={step === 1 || submitting} className="btn-secondary">
          {buttonLabels.back}
        </button>
        {step < 5 ? (
          <button type="button" onClick={handleNext} disabled={submitting} className="btn-primary">
            {buttonLabels.next}
          </button>
        ) : (
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'جارٍ الإنشاء...' : buttonLabels.create}
          </button>
        )}
      </div>
    </form>
  )
}
