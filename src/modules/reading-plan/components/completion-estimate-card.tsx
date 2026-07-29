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
      className={
        compact
          ? 'rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-right'
          : 'rounded-3xl border border-emerald-200/80 bg-emerald-50/60 p-5 text-right shadow-[0_8px_30px_rgba(28,25,23,0.04)] sm:p-6'
      }
    >
      {copy && estimate ? (
        <>
          <h2
            className={
              compact
                ? 'text-base font-bold text-emerald-950'
                : 'text-xl font-bold text-emerald-950'
            }
          >
            {copy.title}
          </h2>
          {copy.remainingText ? (
            <p className="mt-3 font-semibold text-stone-800">
              {copy.remainingText}
            </p>
          ) : null}
          <p className="mt-2 leading-7 text-stone-700">{copy.primaryText}</p>
          {copy.expectedDatePrefix && copy.formattedExpectedDate ? (
            <p className="mt-2 leading-7 text-stone-700">
              {copy.expectedDatePrefix}{' '}
              <time
                className="font-bold text-emerald-950"
                dateTime={estimate.expectedCompletionDate ?? undefined}
              >
                {copy.formattedExpectedDate}
              </time>
            </p>
          ) : null}
          {copy.encouragement ? (
            <p className="mt-3 text-sm font-semibold text-emerald-900">
              {copy.encouragement}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <h2
            className={
              compact
                ? 'text-base font-bold text-emerald-950'
                : 'text-xl font-bold text-emerald-950'
            }
          >
            موعد الختم المتوقع
          </h2>
          <p className="mt-2 leading-7 text-stone-600">
            {COMPLETION_ESTIMATE_FALLBACK_ARABIC}
          </p>
        </>
      )}
    </section>
  )
}
