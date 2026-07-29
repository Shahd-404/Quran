import React from 'react'
import {
  COMPLETION_ESTIMATE_FALLBACK_ARABIC,
  CompletionEstimateVariant,
  formatCompletionEstimateArabic,
  getCompletionEstimate,
} from '../completion-estimate'

export type CompletionEstimateCardProps = {
  currentUnreadPage?: number | null
  pagesPerDay?: number | null
  sessionsPerDay?: number | null
  timezone?: string | null
  effectiveFrom?: string | null
  completed?: boolean
  variant: CompletionEstimateVariant
  live?: boolean
  compact?: boolean
  now?: Date
}

export function CompletionEstimateCard({
  currentUnreadPage,
  pagesPerDay,
  sessionsPerDay,
  timezone,
  effectiveFrom,
  completed = false,
  variant,
  live = false,
  compact = false,
  now,
}: CompletionEstimateCardProps) {
  const estimate = getCompletionEstimate({
    currentUnreadPage,
    pagesPerDay,
    sessionsPerDay,
    timezone,
    effectiveFrom,
    completed,
    now,
  })
  const copy = estimate
    ? formatCompletionEstimateArabic(estimate, pagesPerDay, variant)
    : null

  return (
    <section
      aria-label="موعد الختم المتوقع"
      aria-live={live ? 'polite' : undefined}
      aria-atomic={live ? 'true' : undefined}
      dir="rtl"
      className={[
        'border border-primary/20 bg-primary-soft text-right',
        compact
          ? 'rounded-2xl p-4'
          : 'rounded-card p-5 shadow-card sm:p-6',
      ].join(' ')}
    >
      {copy && estimate ? (
        <>
          <h2
            className={
              compact
                ? 'text-base font-bold text-ink'
                : 'text-xl font-bold text-ink'
            }
          >
            {copy.title}
          </h2>
          {variant === 'active-plan' ? (
            <dl className="mt-4 grid grid-cols-3 gap-2" aria-label="تفاصيل الوقت المتبقي">
              <Metric label="الصفحات" value={estimate.remainingPages} />
              <Metric label="الأيام تقريبًا" value={estimate.expectedReadingDays} />
              <Metric
                label="الجلسات تقريبًا"
                value={estimate.estimatedRemainingSessions}
              />
            </dl>
          ) : copy.remainingText ? (
            <p className="mt-3 font-semibold text-ink">{copy.remainingText}</p>
          ) : null}
          <p className="mt-3 leading-7 text-muted">{copy.primaryText}</p>
          {copy.expectedDatePrefix && copy.formattedExpectedDate ? (
            <p className="mt-2 leading-7 text-muted">
              {copy.expectedDatePrefix}{' '}
              <time
                className="font-bold text-ink"
                dateTime={estimate.expectedCompletionDate ?? undefined}
              >
                {copy.formattedExpectedDate}
              </time>
            </p>
          ) : null}
          {copy.encouragement ? (
            <p className="mt-3 text-sm font-semibold text-primary-muted">
              {copy.encouragement}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <h2
            className={
              compact
                ? 'text-base font-bold text-ink'
                : 'text-xl font-bold text-ink'
            }
          >
            موعد الختم المتوقع
          </h2>
          <p className="mt-2 leading-7 text-muted">
            {COMPLETION_ESTIMATE_FALLBACK_ARABIC}
          </p>
        </>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  return (
    <div className="rounded-xl bg-surface/75 p-3">
      <dt className="text-xs leading-5 text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-ink">
        {value === null ? '—' : new Intl.NumberFormat('ar-EG').format(value)}
      </dd>
    </div>
  )
}
