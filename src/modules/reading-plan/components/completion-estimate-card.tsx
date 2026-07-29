import React from 'react'
import { CalendarCheck, Clock3, Files } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
          : 'rounded-card p-4 shadow-card sm:p-5',
      ].join(' ')}
    >
      {copy && estimate ? (
        <>
          <div className="flex items-center gap-3">
            <span className="icon-tile" aria-hidden="true">
              <CalendarCheck aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
            </span>
            <h2 className={compact ? 'text-base font-semibold text-ink' : 'text-lg font-semibold text-ink'}>
              {copy.title}
            </h2>
          </div>
          {variant === 'active-plan' ? (
            <dl className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-line/70 rounded-2xl border border-primary/15 bg-surface/70" aria-label="تفاصيل الوقت المتبقي">
              <Metric label="الصفحات" value={estimate.remainingPages} Icon={Files} />
              <Metric label="الأيام تقريبًا" value={estimate.expectedReadingDays} Icon={CalendarCheck} />
              <Metric
                label="الجلسات تقريبًا"
                value={estimate.estimatedRemainingSessions}
                Icon={Clock3}
              />
            </dl>
          ) : copy.remainingText ? (
            <p className="mt-3 font-medium text-ink">{copy.remainingText}</p>
          ) : null}
          <p className="mt-3 leading-7 text-muted">{copy.primaryText}</p>
          {copy.expectedDatePrefix && copy.formattedExpectedDate ? (
            <p className="mt-2 leading-7 text-muted">
              {copy.expectedDatePrefix}{' '}
              <time
                className="font-semibold text-ink"
                dateTime={estimate.expectedCompletionDate ?? undefined}
              >
                {copy.formattedExpectedDate}
              </time>
            </p>
          ) : null}
          {copy.encouragement ? (
            <p className="mt-3 text-xs font-medium text-primary-muted">
              {copy.encouragement}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="icon-tile" aria-hidden="true">
              <CalendarCheck aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
            </span>
            <h2 className={compact ? 'text-base font-semibold text-ink' : 'text-lg font-semibold text-ink'}>
              موعد الختم المتوقع
            </h2>
          </div>
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
  Icon,
}: {
  label: string
  value: number | null
  Icon: LucideIcon
}) {
  return (
    <div className="min-w-0 p-2.5 text-center sm:p-3">
      <dt className="flex items-center justify-center gap-1 text-[0.6875rem] leading-5 text-muted">
        <Icon aria-hidden="true" focusable="false" size={14} strokeWidth={1.8} />
        <span>{label}</span>
      </dt>
      <dd className="mt-0.5 text-xl font-semibold text-ink">
        {value === null ? '—' : new Intl.NumberFormat('ar-EG').format(value)}
      </dd>
    </div>
  )
}
