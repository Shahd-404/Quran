'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock3 } from 'lucide-react'
import { formatArabicNumber } from '../formatting'
import { deriveSessionState } from '../session-state'
import { DashboardSession, SessionPresentationState } from '../types'

const CLOCK_INTERVAL_MS = 15_000
const MAX_TIMEOUT_MS = 2_147_483_647

const STATE_LABELS: Record<SessionPresentationState, string> = {
  upcoming: 'قادمة',
  available: 'متاحة',
  in_progress: 'قيد القراءة',
  completed: 'مكتملة',
  missed: 'فات موعدها ومتاحة للقراءة',
}

const STATE_STYLES: Record<SessionPresentationState, string> = {
  upcoming: 'bg-elevated text-muted',
  available: 'bg-primary-soft text-primary-muted',
  in_progress: 'bg-accent-soft text-warning',
  completed: 'bg-elevated text-muted',
  missed: 'bg-warning-soft text-warning',
}

const ACTION_LABELS: Record<SessionPresentationState, string> = {
  upcoming: 'ابدأ مبكرًا',
  available: 'ابدأ القراءة',
  in_progress: 'متابعة القراءة',
  completed: 'مراجعة الجلسة',
  missed: 'اقرأ الورد السابق',
}

export function SessionCard({
  session,
  assignmentLocalDate,
  timezone,
  compact = false,
  featured = false,
}: {
  session: DashboardSession
  assignmentLocalDate: string
  timezone: string
  compact?: boolean
  featured?: boolean
}) {
  const [presentationState, setPresentationState] = useState(
    session.presentationState,
  )

  useEffect(() => {
    const updatePresentationState = () => {
      setPresentationState(
        deriveSessionState({
          persistedStatus: session.persistedStatus,
          assignmentLocalDate,
          scheduledFor: session.scheduledFor,
          timezone,
          now: new Date(),
        }),
      )
    }

    updatePresentationState()
    const intervalId = window.setInterval(updatePresentationState, CLOCK_INTERVAL_MS)
    const scheduledAt = new Date(session.scheduledFor).getTime()
    const delayUntilScheduled = scheduledAt - Date.now()
    const boundaryTimeoutId =
      session.persistedStatus === 'pending' &&
      delayUntilScheduled > 0 &&
      delayUntilScheduled <= MAX_TIMEOUT_MS
        ? window.setTimeout(updatePresentationState, delayUntilScheduled)
        : null

    window.addEventListener('focus', updatePresentationState)
    document.addEventListener('visibilitychange', updatePresentationState)

    return () => {
      window.clearInterval(intervalId)
      if (boundaryTimeoutId !== null) window.clearTimeout(boundaryTimeoutId)
      window.removeEventListener('focus', updatePresentationState)
      document.removeEventListener('visibilitychange', updatePresentationState)
    }
  }, [
    assignmentLocalDate,
    session.persistedStatus,
    session.scheduledFor,
    timezone,
  ])

  const pageRange =
    session.startPage === session.endPage
      ? `صفحة ${formatArabicNumber(session.startPage)}`
      : `الصفحات ${formatArabicNumber(session.startPage)}–${formatArabicNumber(session.endPage)}`

  return (
    <article
      className={[
        'rounded-2xl border p-4',
        presentationState === 'completed'
          ? 'border-line bg-elevated'
          : 'border-line/80 bg-surface',
        featured ? 'shadow-card ring-1 ring-accent/15' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">
            الجلسة {formatArabicNumber(session.sessionOrder)}
          </p>
          <h3 className={`${compact ? 'mt-1 text-base' : 'mt-1.5 text-lg'} font-semibold text-ink`}>
            {pageRange}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {formatArabicNumber(session.pageCount)} {session.pageCount === 1 ? 'صفحة' : 'صفحات'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATE_STYLES[presentationState]}`}
        >
          {STATE_LABELS[presentationState]}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line/70 pt-3 text-xs text-muted">
        <Clock3 aria-hidden="true" focusable="false" size={17} strokeWidth={1.8} />
        <span>موعد الجلسة: {session.formattedTime}</span>
      </div>
      <Link
        href={`/app/read/${session.id}`}
        data-dominant-action={featured ? 'true' : undefined}
        className={[
          'mt-3 inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
          featured && presentationState !== 'completed'
            ? 'bg-primary text-white hover:bg-primary-strong'
            : presentationState === 'completed'
            ? 'bg-elevated text-muted ring-1 ring-line hover:text-ink'
            : 'border border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft',
        ].join(' ')}
      >
        <BookOpen aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
        {featured ? 'ابدأ القراءة' : ACTION_LABELS[presentationState]}
      </Link>
    </article>
  )
}
