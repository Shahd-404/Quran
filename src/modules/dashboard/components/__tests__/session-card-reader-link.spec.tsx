import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardSession, SessionPresentationState } from '../../types'
import { SessionCard } from '../session-card'

const labels: Record<SessionPresentationState, string> = {
  available: 'ابدأ القراءة',
  in_progress: 'متابعة القراءة',
  missed: 'اقرأ الورد السابق',
  upcoming: 'ابدأ مبكرًا',
  completed: 'مراجعة الجلسة',
}

describe.each(Object.entries(labels) as [SessionPresentationState, string][])(
  'SessionCard reader link for %s',
  (presentationState, label) => {
    it(`links with the label "${label}"`, () => {
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

      render(<SessionCard session={session} compact />)

      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        '/app/read/11111111-1111-1111-1111-111111111111',
      )
    })
  },
)
