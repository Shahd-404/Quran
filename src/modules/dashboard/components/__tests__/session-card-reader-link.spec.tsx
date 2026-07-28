import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DashboardSession, SessionPresentationState } from '../../types'
import { SessionCard } from '../session-card'

const labels: Record<SessionPresentationState, string> = {
  available: 'ابدأ القراءة',
  in_progress: 'متابعة القراءة',
  missed: 'اقرأ الورد السابق',
  upcoming: 'ابدأ مبكرًا',
  completed: 'مراجعة الجلسة',
}

afterEach(() => {
  vi.useRealTimers()
})

describe.each(Object.entries(labels) as [SessionPresentationState, string][])(
  'SessionCard reader link for %s',
  (presentationState, label) => {
    it(`links with the label "${label}"`, () => {
      vi.useFakeTimers()
      vi.setSystemTime(
        presentationState === 'upcoming'
          ? new Date('2026-07-26T07:59:59Z')
          : presentationState === 'missed'
            ? new Date('2026-07-27T08:00:00Z')
            : new Date('2026-07-26T08:00:01Z'),
      )
      const session: DashboardSession = {
        id: '11111111-1111-1111-1111-111111111111',
        sessionOrder: 1,
        startPage: 17,
        endPage: 18,
        pageCount: 2,
        scheduledFor: '2026-07-26T08:00:00Z',
        formattedTime: '٨:٠٠ ص',
        persistedStatus:
          presentationState === 'completed'
            ? 'completed'
            : presentationState === 'in_progress'
              ? 'in_progress'
              : 'pending',
        presentationState,
      }

      render(
        <SessionCard
          session={session}
          assignmentLocalDate="2026-07-26"
          timezone="Africa/Cairo"
          compact
        />,
      )

      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        '/app/read/11111111-1111-1111-1111-111111111111',
      )
    })
  },
)

describe('SessionCard live timing', () => {
  const liveSession: DashboardSession = {
    id: '22222222-2222-2222-2222-222222222222',
    sessionOrder: 1,
    startPage: 17,
    endPage: 18,
    pageCount: 2,
    scheduledFor: '2026-07-26T12:00:00.000Z',
    formattedTime: '٣:٠٠ م',
    persistedStatus: 'pending',
    presentationState: 'upcoming',
  }

  it('updates while mounted when the scheduled instant passes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-26T11:59:59.000Z'))

    render(
      <SessionCard
        session={liveSession}
        assignmentLocalDate="2026-07-26"
        timezone="Africa/Cairo"
      />,
    )

    expect(screen.getByRole('link', { name: 'ابدأ مبكرًا' })).toBeInTheDocument()
    expect(screen.getByText('قادمة')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(screen.getByRole('link', { name: 'ابدأ القراءة' })).toBeInTheDocument()
    expect(screen.getByText('متاحة')).toBeInTheDocument()
  })

  it('refreshes its clock on focus and visibility changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-26T11:59:59.000Z'))

    render(
      <SessionCard
        session={liveSession}
        assignmentLocalDate="2026-07-26"
        timezone="Africa/Cairo"
      />,
    )

    vi.setSystemTime(new Date('2026-07-26T12:00:01.000Z'))
    act(() => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(screen.getByRole('link', { name: 'ابدأ القراءة' })).toBeInTheDocument()
  })
})
